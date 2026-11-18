# Bulkhead

**In one line:** Split your resources (threads, connections) into **separate compartments**, so if one part is flooded, the others keep working.

---

## 1. Real-life example

A **ship** is divided into watertight compartments called bulkheads. If one part gets a hole, only that compartment fills with water – the ship doesn't sink.

## 2. What problem does it solve?

Your app calls two services: **Payment** (important) and **Recommendations** (nice-to-have). Both share one pool of 200 threads.

Recommendations becomes very slow → all 200 threads get stuck waiting for it → payment requests have no thread left → **checkout is down because of recommendations!**

Bulkhead: give Recommendations its own small pool (e.g. 20 threads). If it gets stuck, only those 20 are stuck. Payment still has its own threads.

## 3. Two types

| Type | How |
|---|---|
| **Semaphore bulkhead** | Limit the number of **concurrent calls** (e.g. max 10 at a time) on the caller's thread. |
| **Thread-pool bulkhead** | Each dependency gets its **own thread pool + queue**. |

Bigger scale bulkheads: separate connection pools, separate service instances for important customers, separate Kubernetes node pools.

## 4. Plain Java – separate thread pools (build task)

```java
public class Clients {
    private final ExecutorService paymentPool = Executors.newFixedThreadPool(30);
    private final ExecutorService recoPool    = Executors.newFixedThreadPool(10);

    public CompletableFuture<String> pay(String id) {
        return CompletableFuture.supplyAsync(() -> callPayment(id), paymentPool);
    }

    public CompletableFuture<List<String>> recommendations(String user) {
        return CompletableFuture.supplyAsync(() -> callReco(user), recoPool)
                .completeOnTimeout(List.of(), 500, TimeUnit.MILLISECONDS);   // fallback
    }
}
```

A semaphore version:

```java
private final Semaphore recoSlots = new Semaphore(10);

public List<String> recommendations(String user) {
    if (!recoSlots.tryAcquire()) return List.of();     // compartment full → fallback
    try { return callReco(user); }
    finally { recoSlots.release(); }
}
```

## 5. Spring Boot – Resilience4j Bulkhead

```yaml
resilience4j:
  bulkhead:                         # semaphore type
    instances:
      recommendations:
        max-concurrent-calls: 10
        max-wait-duration: 0        # don't wait, reject immediately
  thread-pool-bulkhead:             # thread-pool type
    instances:
      payment:
        core-thread-pool-size: 20
        max-thread-pool-size: 30
        queue-capacity: 50
```

```java
@Service
public class ShopClients {

    @Bulkhead(name = "recommendations", fallbackMethod = "noRecos")
    public List<String> recommendations(String userId) { return recoClient.get(userId); }

    private List<String> noRecos(String userId, Throwable t) { return List.of(); }

    @Bulkhead(name = "payment", type = Bulkhead.Type.THREADPOOL, fallbackMethod = "payLater")
    public CompletableFuture<String> pay(String orderId) {
        return CompletableFuture.completedFuture(paymentClient.pay(orderId));
    }

    private CompletableFuture<String> payLater(String orderId, Throwable t) {
        return CompletableFuture.completedFuture("PENDING");
    }
}
```

## 6. Pool sizing

- Rough formula (Little's Law): **threads needed ≈ requests per second × average time per call (in seconds)**.
  Example: 50 req/s × 0.2 s = 10 threads. Add some headroom.
- Too small → rejects normal traffic.
- Too big → doesn't protect anything and wastes memory.
- Measure with metrics (Actuator + Micrometer: `resilience4j.bulkhead.available.concurrent.calls`).

## 7. Bulkhead vs Circuit Breaker

| Bulkhead | Circuit Breaker |
|---|---|
| Limits **how many** calls run **at the same time** | Stops calls **completely** when failure rate is high |
| Protects *your* resources from one slow dependency | Protects the *failing* dependency and gives fast failure |
| Works even when calls are slow but not failing | Reacts to errors/slow calls over a window |

Use both together, plus timeouts.

## 8. Quick revision

- Separate compartments → one failure doesn't sink everything.
- Semaphore vs thread-pool bulkhead.
- Size pools with Little's Law and metrics.
