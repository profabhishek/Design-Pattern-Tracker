# Circuit Breaker

**In one line:** If a service keeps failing, **stop calling it for a while** and return a fallback quickly. Try again later.

---

## 1. Real-life example

The **electric MCB/fuse** in your house. When there's a short circuit, it "trips" and cuts power to protect the house. After fixing, you switch it on again.

## 2. What problem does it solve?

If the payment service is down and every request still waits 3 seconds and fails:
- users wait for nothing,
- your threads are blocked,
- the sick service gets even more load and can't recover.

A circuit breaker **fails fast** while the dependency is sick, and gives it time to recover.

## 3. The three states (state machine)

```
          failures > threshold
 CLOSED  ───────────────────────►  OPEN
   ▲                                 │
   │ test calls succeed              │ wait time is over
   │                                 ▼
   └────────────────────────── HALF_OPEN
            test calls fail → back to OPEN
```

| State | What happens |
|---|---|
| **CLOSED** (normal) | Calls go through. Failures are counted. |
| **OPEN** (tripped) | Calls are **not** sent. Fallback is returned immediately. |
| **HALF_OPEN** (testing) | After a wait, allow a few **trial** calls. If they succeed → CLOSED. If they fail → OPEN again. |

## 4. Plain Java – build the state machine yourself

```java
public class SimpleCircuitBreaker {
    enum State { CLOSED, OPEN, HALF_OPEN }

    private State state = State.CLOSED;
    private int failures = 0;
    private long openedAt = 0;

    private final int failureThreshold;
    private final long openTimeoutMs;

    public SimpleCircuitBreaker(int failureThreshold, long openTimeoutMs) {
        this.failureThreshold = failureThreshold;
        this.openTimeoutMs = openTimeoutMs;
    }

    public synchronized <T> T call(Supplier<T> action, Supplier<T> fallback) {
        if (state == State.OPEN) {
            if (System.currentTimeMillis() - openedAt >= openTimeoutMs) {
                state = State.HALF_OPEN;                  // time to test
            } else {
                return fallback.get();                    // fail fast
            }
        }
        try {
            T result = action.get();
            failures = 0;
            state = State.CLOSED;                         // success → close
            return result;
        } catch (RuntimeException e) {
            failures++;
            if (state == State.HALF_OPEN || failures >= failureThreshold) {
                state = State.OPEN;
                openedAt = System.currentTimeMillis();
            }
            return fallback.get();
        }
    }
}
```

(Real libraries use a sliding window and failure *rate*, and allow several trial calls in half-open. `synchronized` here keeps it simple but means only one call at a time.)

## 5. Spring Boot – Resilience4j

Dependency: `resilience4j-spring-boot3` + `spring-boot-starter-aop` (+ actuator to see the state).

```yaml
resilience4j:
  circuitbreaker:
    instances:
      payment:
        sliding-window-type: COUNT_BASED
        sliding-window-size: 10                 # look at the last 10 calls
        minimum-number-of-calls: 5              # don't judge with fewer calls
        failure-rate-threshold: 50              # open if 50% failed
        slow-call-duration-threshold: 2s
        slow-call-rate-threshold: 50            # slow calls also count as bad
        wait-duration-in-open-state: 10s        # stay OPEN for 10s
        permitted-number-of-calls-in-half-open-state: 3
        automatic-transition-from-open-to-half-open-enabled: true

management:
  endpoints.web.exposure.include: health,circuitbreakers
  health.circuitbreakers.enabled: true
```

```java
@Service
@RequiredArgsConstructor
public class PaymentClient {
    private final RestClient restClient;

    @CircuitBreaker(name = "payment", fallbackMethod = "paymentFallback")
    public String pay(String orderId, double amount) {
        return restClient.post().uri("/pay")
                .body(Map.of("orderId", orderId, "amount", amount))
                .retrieve().body(String.class);
    }

    // same parameters + Throwable at the end
    private String paymentFallback(String orderId, double amount, Throwable t) {
        return "PAYMENT_PENDING";      // e.g. save and process later
    }
}
```

Check state: `GET /actuator/circuitbreakers`.

### Combining with Retry and Timeout

```java
@CircuitBreaker(name = "payment", fallbackMethod = "paymentFallback")
@Retry(name = "payment")
public String pay(...) { ... }
```

Resilience4j default order (outer → inner): **Retry → CircuitBreaker → RateLimiter → TimeLimiter → Bulkhead → your method**. So each retry attempt is counted by the circuit breaker, and when the circuit is OPEN, retries fail fast too.

## 6. Good fallbacks

- Return cached / default data ("show last known price").
- Queue the work for later ("payment pending").
- Return a friendly error quickly.
- **Bad fallback:** calling another service that is also likely down.

## 7. Points to explain in an interview

- **Thresholds:** failure rate %, slow-call rate, minimum calls, window size. Too sensitive → opens on random blips; too relaxed → protects too late.
- **Half-open probing:** only a few trial calls go through, so a recovering service isn't flooded.
- **Fallbacks:** must be fast and safe.
- Circuit breaker vs Retry: retry helps for short blips; circuit breaker stops hammering a service that is truly down.

## 8. Quick revision

- CLOSED → OPEN → HALF_OPEN → CLOSED.
- Fail fast + fallback while open.
- Resilience4j `@CircuitBreaker` in Spring Boot.
