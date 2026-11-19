# Transactional Outbox

**In one line:** Save the **event** in the **same database transaction** as your data (in an "outbox" table). A separate process later reads the outbox and publishes the events to Kafka/RabbitMQ.

---

## 1. Real-life example

At a post office counter, the clerk writes your parcel in the **register** at the same time as accepting it. Later, the delivery team picks up every parcel listed in the register. Even if the delivery truck was late, nothing is forgotten because it's **written in the register**.

## 2. What problem does it solve? (the "dual write" problem)

```java
@Transactional
public void placeOrder(Order o) {
    orderRepo.save(o);                          // 1. DB write
    kafka.send("order-created", event);         // 2. Kafka write
}
```

What can go wrong:
- DB saves, then app crashes before Kafka send → **event lost**, other services never know.
- Kafka sends, then DB commit fails → **event for an order that doesn't exist**.

You can't have one transaction across DB and Kafka. The outbox fixes this: **both writes go into the same DB** in one transaction.

## 3. How it works

```diagram
caption: How the outbox works
flow: [Your service | placeOrder()]{accent} -> (ONE transaction) [Database | orders row + outbox row]{db} -> (poller / CDC reads outbox) [Kafka | topic order-events] -> [Other services | react to the event]{good}
```

## 4. Spring Boot code

### Outbox table

```java
@Entity
@Table(name = "outbox")
@Getter @Setter @NoArgsConstructor
public class OutboxEvent {
    @Id
    private UUID id = UUID.randomUUID();     // also used as message id for dedup
    private String aggregateType;            // "Order"
    private String aggregateId;              // "42"
    private String eventType;                // "OrderCreated"
    @Lob
    private String payload;                  // JSON
    private Instant createdAt = Instant.now();
    private boolean published = false;
}

public interface OutboxRepository extends JpaRepository<OutboxEvent, UUID> {
    List<OutboxEvent> findTop100ByPublishedFalseOrderByCreatedAtAsc();
}
```

### Write data + event together

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepo;
    private final OutboxRepository outboxRepo;
    private final ObjectMapper mapper;

    @Transactional                                  // ONE transaction for both
    public Order placeOrder(Order order) throws JsonProcessingException {
        Order saved = orderRepo.save(order);

        OutboxEvent e = new OutboxEvent();
        e.setAggregateType("Order");
        e.setAggregateId(saved.getId().toString());
        e.setEventType("OrderCreated");
        e.setPayload(mapper.writeValueAsString(
                Map.of("orderId", saved.getId(), "total", saved.getTotal())));
        outboxRepo.save(e);

        return saved;            // if anything fails, BOTH are rolled back
    }
}
```

### Poller that publishes

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxPublisher {
    private final OutboxRepository outboxRepo;
    private final KafkaTemplate<String, String> kafka;

    @Scheduled(fixedDelay = 1000)          // every 1 second (needs @EnableScheduling)
    @Transactional
    public void publish() {
        for (OutboxEvent e : outboxRepo.findTop100ByPublishedFalseOrderByCreatedAtAsc()) {
            try {
                kafka.send("order-events", e.getAggregateId(), e.getPayload())
                     .get(5, TimeUnit.SECONDS);       // wait for Kafka ack
                e.setPublished(true);
            } catch (Exception ex) {
                log.warn("Publish failed for {}, will retry", e.getId(), ex);
                break;                                // keep order; try next round
            }
        }
    }
}
```

With many app instances, avoid two pollers taking the same rows: use `SELECT ... FOR UPDATE SKIP LOCKED` or a lock tool like **ShedLock**.

## 5. At-least-once delivery

If Kafka send succeeds but the app crashes **before** `published = true` is saved, the poller sends the same event again next time. So:

- Delivery is **at-least-once** (maybe duplicates, never lost).
- Consumers **must be idempotent** – e.g. store the event `id` in a `processed_events` table and skip duplicates.
- Using `aggregateId` as Kafka key keeps events of the same order **in order**.

## 6. Polling vs CDC (Change Data Capture)

| Polling | CDC (e.g. Debezium) |
|---|---|
| Simple: a `@Scheduled` query | Reads the DB's transaction log (binlog / WAL) |
| Adds load to DB with frequent queries | Very low latency, no polling queries |
| Small delay (poll interval) | More infrastructure to run (Kafka Connect + Debezium) |
| Great to start | Great at scale |

## 7. Clean up

Delete published rows older than N days with another scheduled job, or the table keeps growing.

## 8. Points to explain in an interview

- The **dual-write problem** and why outbox fixes it.
- **At-least-once delivery** → consumers must be idempotent.
- **Polling vs CDC**.
- Works hand-in-hand with **Saga** and **Event Sourcing**.

## 9. Quick revision

- Save data + event in one DB transaction.
- A poller/CDC publishes the outbox to the broker.
- Duplicates possible → idempotent consumers.
