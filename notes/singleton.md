# Singleton

**In one line:** Make sure a class has **only one object** in the whole app, and give everyone one place to get it.

---

## 1. Real-life example

Think of the **principal of a school**. There is only one principal. Every teacher who needs the principal goes to the same person. Nobody "creates" a new principal when they need one.

## 2. What problem does it solve?

Some things should exist only once:

- A configuration object (app settings)
- A connection pool to the database
- A cache shared by the whole app

If every class made its own copy, you would waste memory and the copies could go out of sync.

## 3. How does it work?

1. Make the constructor `private` so nobody can call `new`.
2. Keep one `static` object inside the class.
3. Give a `static` method (`getInstance()`) that returns that one object.

## 4. Plain Java code

### Simple (eager) version – created when the class loads

```java
public class AppConfig {
    private static final AppConfig INSTANCE = new AppConfig();

    private AppConfig() { }            // nobody outside can call new

    public static AppConfig getInstance() {
        return INSTANCE;
    }
}
```

### Thread-safe lazy version (double-checked locking)

"Lazy" means: create it only when somebody asks for it the first time.

```java
public class AppConfig {
    private static volatile AppConfig instance;   // volatile = all threads see the latest value

    private AppConfig() { }

    public static AppConfig getInstance() {
        if (instance == null) {                    // 1st check (fast, no lock)
            synchronized (AppConfig.class) {
                if (instance == null) {            // 2nd check (inside lock)
                    instance = new AppConfig();
                }
            }
        }
        return instance;
    }
}
```

Why two checks? Two threads can pass the first check at the same time. The lock lets only one in; the second check stops the other thread from creating a second object.

### Best simple trick – Holder class (lazy + thread-safe, no locks)

```java
public class AppConfig {
    private AppConfig() { }

    private static class Holder {
        private static final AppConfig INSTANCE = new AppConfig();
    }

    public static AppConfig getInstance() {
        return Holder.INSTANCE;   // Holder loads only when this line runs first time
    }
}
```

You can also use an `enum` with one value – Java guarantees only one exists.

## 5. Spring Boot way (what you actually use at work)

In Spring, **every bean is a singleton by default**. Spring creates one object and gives the same one to everyone. You don't write `getInstance()` at all.

```java
@Service                       // Spring creates ONE OrderService for the whole app
public class OrderService {

    private final AppSettings settings;

    public OrderService(AppSettings settings) {   // Spring passes the same AppSettings object
        this.settings = settings;
    }
}
```

```java
@Configuration
public class AppConfig {

    @Bean                      // scope is "singleton" by default
    public AppSettings appSettings() {
        return new AppSettings("INR", 18);
    }
}
```

If you ever need a new object each time, you can change the scope:

```java
@Component
@Scope("prototype")   // a new object every time it is injected
public class ReportBuilder { }
```

**Note:** A Spring singleton means "one per Spring container", not "one per JVM" like the classic pattern.

## 6. Build task from the tracker

> Write a thread-safe singleton, then replace it with dependency injection.

Before (classic singleton – hard to test):

```java
public class PriceService {
    public double finalPrice(double p) {
        return p + p * TaxConfig.getInstance().getRate() / 100;
    }
}
```

After (Spring DI – easy to test, still only one TaxConfig):

```java
@Service
public class PriceService {
    private final TaxConfig taxConfig;

    public PriceService(TaxConfig taxConfig) { this.taxConfig = taxConfig; }

    public double finalPrice(double p) {
        return p + p * taxConfig.getRate() / 100;
    }
}
```

In a test you can now pass a fake `TaxConfig` with `new PriceService(fakeConfig)`.

## 7. When to use / when NOT to use

| Use it when | Avoid it when |
|---|---|
| Exactly one shared thing is needed (config, pool, cache) | You just want "global variables" for convenience |
| The object is costly to create | The object holds user-specific data |
| | You need to swap it in tests (prefer DI) |

## 8. Points to explain in an interview

- **Hidden global state:** any class can call `getInstance()`, so it is hard to see who depends on it.
- **Testing pain:** you can't easily replace it with a fake object in unit tests.
- **Thread safety:** a lazy singleton without `synchronized`/`volatile` can create two objects. Also, a singleton with changing fields must be thread-safe, since all threads share it.
- In Spring, keep singleton beans **stateless** (no per-request data in fields).

## 9. Quick revision

- One object, private constructor, static access method.
- Use Holder class or enum for an easy thread-safe version.
- In Spring Boot, beans are singletons already – use DI instead of `getInstance()`.
