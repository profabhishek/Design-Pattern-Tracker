# Timeout

**In one line:** Never wait **forever** for another service. Set a maximum time; if no answer comes, give up and handle it.

---

## 1. Real-life example

You order food and the app says "delivery in 30 minutes". If it hasn't come in 60 minutes, you cancel and cook Maggi. You don't wait at the door all night.

## 2. What problem does it solve?

If service B is slow and service A waits forever:
- A's threads get stuck waiting.
- New requests to A also get stuck.
- Soon A runs out of threads and **A also goes down**. Then the services calling A go down. This is a **cascading failure**.

A timeout frees the thread, so A stays alive even if B is sick.

## 3. Kinds of timeouts

| Timeout | Meaning |
|---|---|
| **Connect timeout** | Max time to open the connection (TCP handshake). Usually small: 1–2 sec. |
| **Read (socket) timeout** | Max time to wait for data after connecting. |
| **Total / deadline timeout** | Max time for the *whole* operation, including retries. |

## 4. Spring Boot code – RestClient with timeouts

```java
@Configuration
public class HttpClientConfig {

    @Bean
    public RestClient inventoryRestClient() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(1));   // connect timeout
        factory.setReadTimeout(Duration.ofSeconds(2));      // read timeout

        return RestClient.builder()
                .baseUrl("http://inventory-service")
                .requestFactory(factory)
                .build();
    }
}
```

Spring Boot 3.4+ can also do it with properties:

```properties
spring.http.client.connect-timeout=1s
spring.http.client.read-timeout=2s
```

### WebClient (reactive) – total deadline

```java
public Mono<Integer> getStock(String sku) {
    return webClient.get().uri("/stock/{sku}", sku)
            .retrieve()
            .bodyToMono(Integer.class)
            .timeout(Duration.ofSeconds(3))          // total deadline
            .onErrorReturn(TimeoutException.class, 0);
}
```

### Resilience4j TimeLimiter (total deadline for any code)

```yaml
resilience4j:
  timelimiter:
    instances:
      inventory:
        timeout-duration: 3s
        cancel-running-future: true
```

```java
@TimeLimiter(name = "inventory", fallbackMethod = "fallback")
public CompletableFuture<Integer> getStock(String sku) {
    return CompletableFuture.supplyAsync(() -> client.getStock(sku));
}

private CompletableFuture<Integer> fallback(String sku, Throwable t) {
    return CompletableFuture.completedFuture(0);
}
```

### Database query timeout

```properties
spring.datasource.hikari.connection-timeout=2000       # wait max 2s for a free DB connection
spring.jpa.properties.jakarta.persistence.query.timeout=3000
```

```java
@Transactional(timeout = 5)    // seconds
public void generateReport() { ... }
```

## 5. Timeout budgets across chained calls

User → **API (5s total)** → Order service → Payment service → Bank

If every service waits 5 s, the user may wait 15 s+ and the outer request already gave up. Rule:

- **Inner timeouts must be smaller than outer ones.**
- Example budget: API 5 s → Order gets 4 s → Payment gets 3 s → Bank gets 2 s.
- With retries: 3 attempts × 1 s each must fit inside the budget.
- Advanced: pass the remaining deadline in a header (e.g. `X-Deadline`) so each service knows how much time is left (gRPC does this built-in).

## 6. How to pick a value?

Look at the dependency's normal latency (p99). If p99 is 300 ms, a read timeout of ~1 s is reasonable. Too small → false failures; too large → stuck threads.

## 7. Points to explain in an interview

- Timeouts prevent **thread exhaustion** and cascading failures.
- Connect vs read vs total deadline.
- **Timeout budgets** across chained calls (inner < outer).
- After a timeout you **don't know** if the other side finished the work → the action must be idempotent if you retry.

## 8. Quick revision

- Always set connect + read timeouts on every HTTP/DB client.
- Use a total deadline including retries.
- Inner calls get smaller timeouts than outer calls.
