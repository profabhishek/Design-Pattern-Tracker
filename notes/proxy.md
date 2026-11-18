# Proxy

**In one line:** A **stand-in object** that sits in front of the real object and controls access to it (add caching, logging, security, lazy loading...).

---

## 1. Real-life example

A **receptionist** in an office. You don't walk directly to the manager. The receptionist checks who you are, notes your visit, maybe answers simple questions herself, and only sends you in when needed.

## 2. What problem does it solve?

You want extra behaviour around a service **without changing the service code**:

- **Caching proxy** – return saved answer instead of calling a slow API again.
- **Logging proxy** – log every call and its time.
- **Security proxy** – check permission first.
- **Lazy (virtual) proxy** – create the heavy object only when used.
- **Remote proxy** – a local object that actually talks over the network.

## 3. How does it work?

The proxy **implements the same interface** as the real object, holds a reference to the real object, and decides when/how to call it. The caller can't tell the difference.

## 4. Plain Java – caching proxy

```java
public interface WeatherService {
    String getWeather(String city);
}

public class RealWeatherService implements WeatherService {
    public String getWeather(String city) {
        sleep(2000);                     // pretend this is a slow API
        return city + ": 30°C";
    }
}

public class CachingWeatherProxy implements WeatherService {
    private final WeatherService real;
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public CachingWeatherProxy(WeatherService real) { this.real = real; }

    public String getWeather(String city) {
        return cache.computeIfAbsent(city, real::getWeather);   // call real only first time
    }
}
```

```java
WeatherService service = new CachingWeatherProxy(new RealWeatherService());
service.getWeather("Delhi");   // slow (2 sec)
service.getWeather("Delhi");   // instant (from cache)
```

## 5. Spring Boot – Spring is FULL of proxies

When you put annotations like `@Transactional`, `@Cacheable`, `@Async`, Spring **wraps your bean in a proxy** at startup. The proxy does the extra work, then calls your real method.

### Caching proxy with one annotation

```java
@SpringBootApplication
@EnableCaching
public class App { }

@Service
public class ProductService {

    @Cacheable("products")                 // proxy checks cache first
    public Product findById(Long id) {
        System.out.println("Hitting DB for " + id);
        return repo.findById(id).orElseThrow();
    }

    @CacheEvict(value = "products", key = "#p.id")
    public Product update(Product p) { return repo.save(p); }
}
```

### Logging proxy with AOP

```java
@Aspect
@Component
public class TimingAspect {

    @Around("execution(* com.shop.service..*(..))")
    public Object time(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            return pjp.proceed();                         // call the real method
        } finally {
            System.out.println(pjp.getSignature() + " took "
                    + (System.currentTimeMillis() - start) + " ms");
        }
    }
}
```

(Add `spring-boot-starter-aop` dependency.)

### ⚠️ Famous trap: self-invocation

```java
@Service
public class OrderService {
    public void a() { b(); }          // calls b() directly, NOT through the proxy

    @Transactional
    public void b() { ... }           // transaction will NOT start when called from a()
}
```

Because `a()` calls `this.b()`, the call never goes through the proxy. Fix: move `b()` to another bean, or call it from outside.

Also: Spring proxies only work on **public** methods called from **another bean**.

## 6. Proxy vs Decorator vs Adapter

| Pattern | Same interface? | Main goal |
|---|---|---|
| **Proxy** | Yes | **Control access** (cache, security, lazy, remote). Often creates/manages the real object. |
| **Decorator** | Yes | **Add new behaviour/features**, can stack many (e.g. `BufferedInputStream(new FileInputStream())`). |
| **Adapter** | **No** – converts one interface to another | Make two incompatible things work together (e.g. old XML API → new JSON interface). |

Honest note: Proxy and Decorator look almost the same in code. The difference is **intent**.

## 7. When to use / when NOT to use

| Use it when | Avoid it when |
|---|---|
| You need cross-cutting things: cache, logs, security, transactions | The extra logic is core business logic (put it in the service) |
| You can't/shouldn't change the real class | Too many layers make debugging hard |

## 8. Quick revision

- Proxy = same interface, sits in front, controls access.
- Spring uses proxies for `@Transactional`, `@Cacheable`, `@Async`, AOP.
- Self-invocation skips the proxy!
