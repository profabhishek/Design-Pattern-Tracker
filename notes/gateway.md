# API Gateway

**In one line:** **One front door** for all clients. Every request comes to the gateway, and it forwards the request to the right microservice.

---

## 1. Real-life example

A **mall's main entrance with security**. Visitors enter from one gate, security checks bags, and the help desk tells you which floor has which shop. You don't enter each shop from a different street.

## 2. What problem does it solve?

With 10 microservices, without a gateway:
- The mobile app must know 10 different URLs.
- Each service must do auth, rate limiting, CORS, logging by itself (duplicated work).
- Internal services are exposed to the internet.

The gateway handles these **common concerns in one place**:
- **Routing** (`/orders/**` → order-service)
- **Authentication** (check JWT)
- **Rate limiting**
- SSL termination, CORS, logging, request IDs
- Sometimes response aggregation

## 3. Picture

```
Mobile / Web
     │
     ▼
┌─────────────┐   /orders/**    ┌───────────────┐
│ API Gateway │ ──────────────► │ order-service │
│ auth, rate  │   /users/**     ├───────────────┤
│ limit, logs │ ──────────────► │ user-service  │
└─────────────┘                 └───────────────┘
```

## 4. Spring Boot – Spring Cloud Gateway

Dependency: `spring-cloud-starter-gateway` (reactive). Add `spring-boot-starter-data-redis-reactive` for rate limiting.

### Routing with YAML

```yaml
server:
  port: 8080

spring:
  cloud:
    gateway:
      routes:
        - id: orders
          uri: http://localhost:8081          # or lb://order-service with service discovery
          predicates:
            - Path=/api/orders/**
          filters:
            - StripPrefix=1                    # /api/orders/1 → /orders/1
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 10   # 10 requests/sec
                redis-rate-limiter.burstCapacity: 20
                key-resolver: "#{@userKeyResolver}"

        - id: users
          uri: http://localhost:8082
          predicates:
            - Path=/api/users/**
          filters:
            - StripPrefix=1
```

### Rate limit key (per user / per IP)

```java
@Configuration
public class GatewayConfig {

    @Bean
    public KeyResolver userKeyResolver() {
        return exchange -> Mono.just(
            Optional.ofNullable(exchange.getRequest().getHeaders().getFirst("X-User-Id"))
                    .orElse(exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()));
    }
}
```

### Simple auth filter (global)

```java
@Component
public class AuthFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().value();
        if (path.startsWith("/api/users/login")) return chain.filter(exchange);   // public

        String auth = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (auth == null || !auth.startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
        // verify JWT here (or use spring-boot-starter-oauth2-resource-server)
        return chain.filter(exchange);
    }

    @Override public int getOrder() { return -1; }   // run early
}
```

## 5. Gateway vs BFF vs Service Mesh

| | What it is | Traffic |
|---|---|---|
| **API Gateway** | One entry point for all clients; generic concerns | North-south (outside → inside) |
| **BFF (Backend For Frontend)** | A separate gateway **per client type** (one for mobile, one for web), shaped for that UI | North-south |
| **Service Mesh** (Istio, Linkerd) | Sidecar proxies next to every service handling retries, mTLS, metrics between services | East-west (service ↔ service) |

They can be used together: Gateway at the edge + mesh inside.

## 6. Single point of failure (trade-off)

If the gateway goes down, **everything** is down. So:
- Run **multiple gateway instances** behind a load balancer.
- Keep the gateway **thin** – no business logic, so it's fast and rarely changes.
- Add timeouts and circuit breakers to its routes.
- It adds one extra network hop (small latency).

## 7. When to use / when NOT to use

| Use it when | Avoid / postpone when |
|---|---|
| Many microservices, many clients | A single monolith – just use a load balancer |
| You need central auth, rate limits, routing | Very small team, two services |

## 8. Quick revision

- One front door: routing, auth, rate limit, logging.
- Spring Cloud Gateway with routes + filters.
- Avoid SPOF: many instances, keep it thin.
