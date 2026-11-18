# Strategy

**In one line:** Keep different ways of doing the same job in **separate classes** behind one interface, and pick one at runtime.

---

## 1. Real-life example

Going to college: you can go by **bus, bike or cab**. The goal is the same (reach college), only the *way* changes. You choose based on time, money or weather. Each way is a "strategy".

## 2. What problem does it solve?

Without Strategy you get a long `if/else`:

```java
double discount(String type, double amount) {
    if (type.equals("FESTIVAL")) return amount * 0.20;
    else if (type.equals("NEW_USER")) return amount * 0.10;
    else if (type.equals("PREMIUM")) return amount * 0.15;
    return 0;
}
```

Every new discount means editing this method → risky, hard to test. Strategy puts each rule in its own class.

## 3. How does it work?

1. Create an interface, e.g. `DiscountStrategy`.
2. Write one class per algorithm.
3. The main code (called the **context**) holds a strategy and just calls it.

## 4. Spring Boot code – discount chosen from config

### The interface and strategies

```java
public interface DiscountStrategy {
    double apply(double amount);
}

@Component("FESTIVAL")
public class FestivalDiscount implements DiscountStrategy {
    public double apply(double amount) { return amount * 0.80; }
}

@Component("NEW_USER")
public class NewUserDiscount implements DiscountStrategy {
    public double apply(double amount) { return amount * 0.90; }
}

@Component("NONE")
public class NoDiscount implements DiscountStrategy {
    public double apply(double amount) { return amount; }
}
```

### Pick the strategy

Spring can inject a `Map<String, Bean>` where the **key is the bean name**.

```java
@Service
public class CheckoutService {

    private final Map<String, DiscountStrategy> strategies;
    private final String defaultStrategy;

    public CheckoutService(Map<String, DiscountStrategy> strategies,
                           @Value("${shop.discount:NONE}") String defaultStrategy) {
        this.strategies = strategies;
        this.defaultStrategy = defaultStrategy;
    }

    public double finalPrice(double amount, String code) {
        String key = (code == null) ? defaultStrategy : code;
        DiscountStrategy s = strategies.getOrDefault(key, strategies.get("NONE"));
        return s.apply(amount);
    }
}
```

`application.properties`:

```properties
shop.discount=FESTIVAL
```

Change the property → behaviour changes, no code change.

### Sorting strategy (plain Java)

`Comparator` is a strategy you already use:

```java
products.sort(Comparator.comparing(Product::getPrice));      // cheapest first
products.sort(Comparator.comparing(Product::getRating).reversed()); // best rated first
```

## 5. Strategy vs State (common confusion)

| Strategy | State |
|---|---|
| **Caller/config chooses** the algorithm | The object **changes its own state** internally |
| Strategies don't know each other | States often move to the next state (e.g. `Created → Paid → Shipped`) |
| Example: discount type | Example: order status, traffic light |

## 6. When to use / when NOT to use

| Use it when | Avoid it when |
|---|---|
| Many versions of one algorithm | Only 2 simple branches that will never grow |
| You want to choose at runtime / from config | The logic is tiny and adding classes is overkill |
| You want to test each rule alone | |

## 7. Points to explain in an interview

- **Strategy vs if/else chains:** Strategy follows Open/Closed – add a class instead of editing old code. Each class is small and testable.
- **Strategy vs State:** see table above.
- In Spring, inject `Map<String, Strategy>` or `List<Strategy>` to auto-register all strategies.

## 8. Quick revision

- One interface, many implementations, chosen at runtime.
- Replaces growing `if/else` blocks.
- `Comparator` is the classic Java example.
