# Saga

**In one line:** A big business transaction across many services, done as **small local steps**. If one step fails, run **compensating (undo) steps** for the ones already done.

---

## 1. Real-life example

Planning a **trip**: book flight ✅ → book hotel ✅ → book cab ❌ (none available).
You can't "rollback" the whole world, so you **cancel the hotel** and **cancel the flight** (maybe with a small fee). These cancellations are *compensations*.

## 2. What problem does it solve?

In a monolith, one database transaction covers everything (`@Transactional`). In microservices, **each service has its own database**:

- Order service → orders DB
- Payment service → payments DB
- Inventory service → inventory DB

There's no single transaction across all three. Two-phase commit is slow and fragile. Saga is the practical alternative.

## 3. Build task – order, payment, inventory

| Step | Action | Compensation (undo) |
|---|---|---|
| 1 | Order: create order (status `PENDING`) | Mark order `CANCELLED` |
| 2 | Payment: charge customer | Refund customer |
| 3 | Inventory: reserve stock | Release stock |
| 4 | Order: mark `CONFIRMED` | — |

If step 3 fails → refund (undo 2) → cancel order (undo 1).

## 4. Two styles

### A) Choreography – services react to each other's events (no boss)

```
Order ──OrderCreated──► Payment ──PaymentDone──► Inventory ──StockReserved──► Order(CONFIRMED)
                                                    │
                                              StockFailed
                                                    ▼
                         Payment (refund) ◄──── ──── ┘ ──► Order (CANCELLED)
```

### B) Orchestration – one orchestrator tells each service what to do

```
           ┌──────────── Order Saga Orchestrator ───────────┐
           │ 1. charge  2. reserve  3. confirm  (or undo)   │
           └──────┬──────────────┬───────────────┬──────────┘
               Payment       Inventory         Order
```

| | Choreography | Orchestration |
|---|---|---|
| Control | Spread across services | Central orchestrator |
| Good for | 2–4 simple steps | Many steps, complex rules |
| Pros | Loose coupling, no central point | Easy to see/debug the whole flow |
| Cons | Hard to follow the flow; cyclic dependencies | Orchestrator can become a "god service" |

## 5. Spring Boot code – Orchestration (simple version)

```java
public interface PaymentClient   { String charge(Long orderId, double amount); void refund(String paymentId); }
public interface InventoryClient { void reserve(Long orderId, List<Item> items); void release(Long orderId); }
```

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderSagaOrchestrator {

    private final OrderRepository orders;
    private final PaymentClient payment;
    private final InventoryClient inventory;

    public void placeOrder(Order order) {
        // Step 1: local transaction
        order.setStatus("PENDING");
        orders.save(order);

        String paymentId = null;
        try {
            // Step 2
            paymentId = payment.charge(order.getId(), order.getTotal());
            // Step 3
            inventory.reserve(order.getId(), order.getItems());
            // Step 4
            order.setStatus("CONFIRMED");
            orders.save(order);

        } catch (Exception e) {
            log.warn("Saga failed for order {}, compensating", order.getId(), e);
            // undo in REVERSE order
            if (paymentId != null) payment.refund(paymentId);
            order.setStatus("CANCELLED");
            orders.save(order);
        }
    }
}
```

In real life the orchestrator also **saves saga state** (which step it reached) in a table, so it can continue after a crash. Tools: **Temporal**, **Camunda**, **Axon**, or Spring State Machine.

## 6. Spring Boot code – Choreography with Kafka

```java
// Payment service
@Component
@RequiredArgsConstructor
public class PaymentListener {
    private final KafkaTemplate<String, Object> kafka;
    private final PaymentService service;

    @KafkaListener(topics = "order-created")
    public void on(OrderCreated e) {
        try {
            String pid = service.charge(e.orderId(), e.amount());
            kafka.send("payment-done", new PaymentDone(e.orderId(), pid));
        } catch (Exception ex) {
            kafka.send("payment-failed", new PaymentFailed(e.orderId()));
        }
    }

    @KafkaListener(topics = "stock-failed")
    public void onStockFailed(StockFailed e) {
        service.refundForOrder(e.orderId());          // compensation
        kafka.send("payment-refunded", new PaymentRefunded(e.orderId()));
    }
}

// Order service
@KafkaListener(topics = {"payment-failed", "payment-refunded"})
public void cancel(OrderEvent e) { orderService.markCancelled(e.orderId()); }

@KafkaListener(topics = "stock-reserved")
public void confirm(StockReserved e) { orderService.markConfirmed(e.orderId()); }
```

Use the **Transactional Outbox** to publish these events reliably, and make every handler **idempotent** (events can arrive twice).

## 7. Limits of compensation (important!)

- **Not a real rollback.** Some things can't be undone: an email already sent, an SMS, goods already shipped. You send a "sorry" email instead.
- **No isolation.** Other users can see in-between states (order `PENDING`, stock reserved then released). Handle with clear statuses and "semantic locks" (e.g. a `PENDING` order can't be edited).
- **Compensation can fail too** → it must be **retried** and be **idempotent**.
- Put risky steps that are hard to undo **last** (e.g. ship after payment + stock succeed).

## 8. Quick revision

- Saga = local steps + compensations.
- Orchestration (central boss) vs choreography (events).
- Compensations are not true rollbacks; no isolation; must be idempotent.
