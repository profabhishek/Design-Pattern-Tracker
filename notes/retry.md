# Retry

**In one line:** If a call fails because of a **temporary** problem, wait a little and **try again** – but carefully, so you don't make things worse.

---

## 1. Real-life example

You call a friend and the line is busy. You don't call 100 times in one second. You wait 1 minute, then 2 minutes, then 5 minutes. And after a few tries you give up and send a message instead.

## 2. What problem does it solve?

In distributed systems, many failures are **transient** (short-lived):
- network blip
- service restarting
- database deadlock
- HTTP 503 / 429 (too many requests)

Simply retrying often works. But **bad retries cause a "retry storm"** – thousands of clients retrying together and crushing the server that is trying to recover.

## 3. The three rules of good retry

1. **Exponential backoff** – wait longer each time: 100 ms → 200 ms → 400 ms → 800 ms.
2. **Jitter** – add randomness, so all clients don't retry at the same moment.
3. **Max attempts cap** – stop after N tries (e.g. 3–5) and fail properly.

Also: **only retry what is safe to retry** (see idempotency below), and only retry *transient* errors (not 400 Bad Request or 404).

## 4. Plain Java – backoff with jitter

```java
public class RetryHelper {

    public static <T> T retry(Supplier<T> call, int maxAttempts, long baseDelayMs) {
        RuntimeException last = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return call.get();
            } catch (RuntimeException e) {
                last = e;
                if (attempt == maxAttempts) break;
                long expo = baseDelayMs * (1L << (attempt - 1));          // 100, 200, 400...
                long sleep = ThreadLocalRandom.current().nextLong(expo + 1); // "full jitter": 0..expo
                System.out.println("Attempt " + attempt + " failed, waiting " + sleep + " ms");
                try { Thread.sleep(sleep); } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw e;
                }
            }
        }
        throw last;
    }
}
```

```java
String result = RetryHelper.retry(() -> paymentClient.getStatus("TX1"), 4, 100);
```

## 5. Spring Boot way 1 – Spring Retry

Dependencies: `spring-retry` + `spring-boot-starter-aop`.

```java
@SpringBootApplication
@EnableRetry
public class App { }

@Service
public class InventoryClient {

    @Retryable(
        retryFor = { ResourceAccessException.class, HttpServerErrorException.ServiceUnavailable.class },
        maxAttempts = 4,
        backoff = @Backoff(delay = 200, multiplier = 2, random = true)   // random = jitter
    )
    public int getStock(String sku) {
        return restClient.get().uri("/stock/{sku}", sku).retrieve().body(Integer.class);
    }

    @Recover                                     // runs when all attempts fail
    public int fallback(Exception e, String sku) {
        return 0;                                // show "out of stock" instead of crashing
    }
}
```

## 6. Spring Boot way 2 – Resilience4j (most used in microservices)

Dependency: `resilience4j-spring-boot3`.

```yaml
resilience4j:
  retry:
    instances:
      inventory:
        max-attempts: 4
        wait-duration: 200ms
        enable-exponential-backoff: true
        exponential-backoff-multiplier: 2
        enable-randomized-wait: true          # jitter
        randomized-wait-factor: 0.5
        retry-exceptions:
          - java.io.IOException
          - org.springframework.web.client.ResourceAccessException
        ignore-exceptions:
          - org.springframework.web.client.HttpClientErrorException   # don't retry 4xx
```

```java
@Service
public class InventoryClient {

    @Retry(name = "inventory", fallbackMethod = "stockFallback")
    public int getStock(String sku) { ... }

    private int stockFallback(String sku, Throwable t) { return 0; }
}
```

## 7. When to use / when NOT to use

| Retry these | Don't retry these |
|---|---|
| Timeouts, connection reset, 502/503/504, 429 (respect `Retry-After`) | 400, 401, 403, 404, validation errors |
| **Idempotent** calls (GET, PUT, DELETE, or POST with an Idempotency-Key) | Non-idempotent POST like "charge ₹500" without a key – you might charge twice! |

## 8. Points to explain in an interview

- **Retry only idempotent calls:** if the first request actually succeeded but the response got lost, a retry repeats the action. Safe only if doing it twice = doing it once.
- **Retry storms:** many clients × many retries × many layers. If service A retries 3 times calling B, and B retries 3 times calling C, then C gets 9× load. Retry at **one layer** only, use backoff + jitter, and combine with a **circuit breaker**.
- Keep total retry time inside the caller's **timeout budget**.

## 9. Quick revision

- Backoff + jitter + max attempts.
- Retry only transient errors and idempotent calls.
- Combine with timeout and circuit breaker.
