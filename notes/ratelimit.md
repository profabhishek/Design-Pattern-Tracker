# Rate Limiter

**In one line:** Limit **how many requests** a client can make in a given time (e.g. 100 requests per minute). Extra requests get `429 Too Many Requests`.

---

## 1. Real-life example

An **ATM** lets you withdraw only a fixed amount per day. Or a **water tap with a small hole** – no matter how much you open it, water only flows at a fixed speed.

## 2. What problem does it solve?

- Stops one user/bot from overloading your server.
- Protects against brute-force login attacks and scraping.
- Gives fair usage to all customers (free plan: 100/min, paid plan: 1000/min).
- Protects costly downstream services.

## 3. Common algorithms

| Algorithm | How it works (simple) | Good / Bad |
|---|---|---|
| **Fixed window** | Count requests in each minute (12:00–12:01). Reset at the start of each minute. | Simple. But a burst at the edge: 100 at 12:00:59 + 100 at 12:01:00 = 200 in 2 sec. |
| **Sliding window** | Look at the *last 60 seconds* from now (log or weighted count). | Smooth, accurate. Needs more memory/math. |
| **Token bucket** | A bucket holds up to N tokens; tokens are added at a fixed rate. Each request takes one token. No token → rejected. | Allows **short bursts** up to bucket size, then a steady rate. Most popular. |
| **Leaky bucket** | Requests go into a queue that "leaks" (is processed) at a fixed rate. Full queue → rejected. | Output is perfectly **smooth**; bursts wait in queue. |

## 4. Token bucket in plain Java (build task)

```java
public class TokenBucket {
    private final long capacity;         // max tokens (burst size)
    private final double refillPerMs;    // tokens added per millisecond
    private double tokens;
    private long lastRefill;

    public TokenBucket(long capacity, long refillPerSecond) {
        this.capacity = capacity;
        this.refillPerMs = refillPerSecond / 1000.0;
        this.tokens = capacity;
        this.lastRefill = System.currentTimeMillis();
    }

    public synchronized boolean tryConsume() {
        long now = System.currentTimeMillis();
        tokens = Math.min(capacity, tokens + (now - lastRefill) * refillPerMs);  // refill
        lastRefill = now;
        if (tokens >= 1) {
            tokens -= 1;
            return true;     // allowed
        }
        return false;        // rejected
    }
}
```

## 5. Fixed window in plain Java (to compare)

```java
public class FixedWindowLimiter {
    private final int limit;
    private final long windowMs;
    private final Map<String, long[]> counters = new ConcurrentHashMap<>(); // key → [windowStart, count]

    public FixedWindowLimiter(int limit, long windowMs) { this.limit = limit; this.windowMs = windowMs; }

    public synchronized boolean allow(String clientId) {
        long now = System.currentTimeMillis();
        long[] c = counters.computeIfAbsent(clientId, k -> new long[]{now, 0});
        if (now - c[0] >= windowMs) { c[0] = now; c[1] = 0; }   // new window
        if (c[1] < limit) { c[1]++; return true; }
        return false;
    }
}
```

## 6. Spring Boot – per-client limiter as an interceptor

```java
@Component
public class RateLimitInterceptor implements HandlerInterceptor {
    private final Map<String, TokenBucket> buckets = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        String key = Optional.ofNullable(req.getHeader("X-API-KEY")).orElse(req.getRemoteAddr());
        TokenBucket bucket = buckets.computeIfAbsent(key, k -> new TokenBucket(20, 10)); // burst 20, 10/s
        if (bucket.tryConsume()) return true;

        res.setStatus(429);
        res.setHeader("Retry-After", "1");
        return false;
    }
}

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {
    private final RateLimitInterceptor interceptor;
    @Override
    public void addInterceptors(InterceptorRegistry r) { r.addInterceptor(interceptor).addPathPatterns("/api/**"); }
}
```

⚠️ This only works for **one instance**. With 5 instances, each has its own buckets. For a shared limit use **Redis** (e.g. Bucket4j + Redis, or Spring Cloud Gateway's `RequestRateLimiter`, which is a Redis token bucket).

### Resilience4j RateLimiter (limit calls *you make* to another service)

```yaml
resilience4j:
  ratelimiter:
    instances:
      smsProvider:
        limit-for-period: 50          # 50 calls
        limit-refresh-period: 1s      # per second
        timeout-duration: 0           # don't wait, fail immediately
```

```java
@RateLimiter(name = "smsProvider", fallbackMethod = "queueSms")
public void sendSms(String to, String msg) { ... }
```

## 7. Points to explain in an interview

- **Token bucket vs leaky bucket vs sliding window** (table above). Token bucket allows bursts; leaky bucket smooths output; sliding window avoids the fixed-window edge burst.
- What key to limit on: user id, API key, IP.
- Distributed limiting needs a shared store (Redis) with atomic operations (Lua script).
- Return `429` + `Retry-After` header.

## 8. Quick revision

- Limit requests per time per client.
- Token bucket is the common choice.
- Many instances → keep counters in Redis.
