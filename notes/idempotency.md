# Idempotency

**In one line:** Sending the **same request twice** gives the **same result** as sending it once – no double charge, no duplicate order.

---

## 1. Real-life example

The **lift button**. Pressing "5" once or ten times – the lift still goes to floor 5 only once.

Bad example: paying at a shop and the card machine hangs. You tap again… and get charged twice. That payment was **not** idempotent.

## 2. What problem does it solve?

In networks, these happen all the time:
- The client sends "pay ₹500", the server pays, but the **response is lost**. The client retries → pays again.
- User double-clicks the "Place Order" button.
- A message queue delivers the same message twice (at-least-once delivery).

Idempotency makes retries **safe**.

## 3. Which HTTP methods are idempotent?

| Method | Idempotent? | Why |
|---|---|---|
| GET | ✅ | Only reads |
| PUT | ✅ | "Set the value to X" – same result every time |
| DELETE | ✅ | Deleting again: it's still deleted |
| POST | ❌ | "Create a new one" – each call creates another |
| PATCH | Depends | `"set name=Ravi"` yes; `"add 10 to balance"` no |

To make POST safe, we use an **Idempotency-Key**.

## 4. How Idempotency-Key works

1. Client creates a unique key (UUID) **once per action** and sends it in a header: `Idempotency-Key: 7f9c...`.
2. Server checks: "Have I seen this key?"
   - **No** → process the request, **save the key + response**.
   - **Yes, finished** → return the **saved response**, don't process again.
   - **Yes, still processing** → return `409 Conflict` (or wait).
3. Keys expire after some time (TTL), e.g. 24 hours.

## 5. Spring Boot code – payment endpoint

### Table to store keys

```java
@Entity
@Table(name = "idempotency_keys")
@Getter @Setter @NoArgsConstructor
public class IdempotencyRecord {
    @Id
    private String idempotencyKey;          // PRIMARY KEY → DB blocks duplicates
    private String requestHash;             // to detect same key with a different body
    private String status;                  // IN_PROGRESS / COMPLETED
    private int responseCode;
    @Lob
    private String responseBody;
    private Instant createdAt;
}

public interface IdempotencyRepo extends JpaRepository<IdempotencyRecord, String> { }
```

### Service

```java
@Service
@RequiredArgsConstructor
public class IdempotentPaymentService {

    private final IdempotencyRepo repo;
    private final PaymentService paymentService;
    private final ObjectMapper mapper;

    public ResponseEntity<String> pay(String key, PaymentRequest req) throws Exception {
        String hash = DigestUtils.md5DigestAsHex(mapper.writeValueAsBytes(req));

        // 1. Try to "claim" the key. Primary key makes this safe for concurrent duplicates.
        try {
            IdempotencyRecord r = new IdempotencyRecord();
            r.setIdempotencyKey(key);
            r.setRequestHash(hash);
            r.setStatus("IN_PROGRESS");
            r.setCreatedAt(Instant.now());
            repo.saveAndFlush(r);
        } catch (DataIntegrityViolationException alreadyExists) {
            IdempotencyRecord old = repo.findById(key).orElseThrow();
            if (!old.getRequestHash().equals(hash))
                return ResponseEntity.unprocessableEntity().body("Key reused with different body");
            if (old.getStatus().equals("IN_PROGRESS"))
                return ResponseEntity.status(HttpStatus.CONFLICT).body("Request already in progress");
            return ResponseEntity.status(old.getResponseCode()).body(old.getResponseBody());  // replay
        }

        // 2. Do the real work only once
        String result = paymentService.charge(req);

        // 3. Save the response for future duplicates
        IdempotencyRecord done = repo.findById(key).orElseThrow();
        done.setStatus("COMPLETED");
        done.setResponseCode(201);
        done.setResponseBody(result);
        repo.save(done);

        return ResponseEntity.status(201).body(result);
    }
}
```

### Controller

```java
@RestController
@RequiredArgsConstructor
public class PaymentController {
    private final IdempotentPaymentService service;

    @PostMapping("/payments")
    public ResponseEntity<String> pay(@RequestHeader("Idempotency-Key") String key,
                                      @RequestBody PaymentRequest req) throws Exception {
        return service.pay(key, req);
    }
}
```

### Clean up old keys (TTL)

```java
@Scheduled(cron = "0 0 * * * *")     // every hour (needs @EnableScheduling)
@Transactional
public void cleanup() {
    em.createQuery("delete from IdempotencyRecord r where r.createdAt < :t")
      .setParameter("t", Instant.now().minus(Duration.ofHours(24)))
      .executeUpdate();
}
```

With **Redis** you can do the claim in one step: `SET key IN_PROGRESS NX EX 86400` (NX = only if not exists, EX = expiry).

## 6. Idempotent message consumers

For Kafka/RabbitMQ, keep a `processed_messages(message_id PRIMARY KEY)` table. In the same DB transaction: insert the message id + do the work. If the insert fails as duplicate → skip.

## 7. Points to explain in an interview

- **Key storage and TTL:** store in DB or Redis; keep long enough to cover client retries (often 24h); delete after.
- **Concurrent duplicates:** two identical requests at the *same moment*. A simple "check then insert" has a race. Use a **unique constraint** or Redis `SETNX` so only one wins.
- Same key + different body = client bug → reject with 422.
- Idempotency is what makes **retries** and **at-least-once** messaging safe.

## 8. Quick revision

- Same request many times = same effect as once.
- POST needs an Idempotency-Key; server stores key + response.
- Use a unique constraint to beat race conditions.
