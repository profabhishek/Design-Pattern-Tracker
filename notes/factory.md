# Factory

**In one line:** Instead of using `new` everywhere, ask a **factory** to give you the right object. The caller does not need to know which exact class is created.

---

## 1. Real-life example

At a pizza shop you just say "one Margherita". You don't go into the kitchen and make it. The kitchen (factory) decides how to make it and hands it to you.

## 2. What problem does it solve?

Without a factory, code looks like this everywhere:

```java
if (type.equals("UPI"))   gateway = new UpiGateway();
else if (type.equals("CARD")) gateway = new CardGateway();
else if (type.equals("WALLET")) gateway = new WalletGateway();
```

If you add a new payment type, you must change this code in many places. A factory keeps the "which class to create" logic in **one place**.

## 3. Three flavours (common interview question)

| Type | Simple meaning |
|---|---|
| **Simple Factory** | One class with a method like `create(type)` that returns the right object. (Not an official GoF pattern, but very common.) |
| **Factory Method** | A parent class says "I need a product", and **child classes decide** which product to create by overriding a method. |
| **Abstract Factory** | A factory that creates a **family** of related objects (e.g. `DarkThemeFactory` makes DarkButton + DarkCheckbox). |

## 4. Spring Boot code – Payment Gateway Factory

### Step 1: A common interface

```java
public interface PaymentGateway {
    String type();                       // "UPI", "CARD", ...
    String pay(double amount);
}
```

### Step 2: Implementations (each is a Spring bean)

```java
@Component
public class UpiGateway implements PaymentGateway {
    public String type() { return "UPI"; }
    public String pay(double amount) { return "Paid ₹" + amount + " by UPI"; }
}

@Component
public class CardGateway implements PaymentGateway {
    public String type() { return "CARD"; }
    public String pay(double amount) { return "Paid ₹" + amount + " by Card"; }
}
```

### Step 3: The factory

Spring gives us **all** `PaymentGateway` beans as a list. We put them in a map by type.

```java
@Component
public class PaymentGatewayFactory {

    private final Map<String, PaymentGateway> gateways;

    public PaymentGatewayFactory(List<PaymentGateway> list) {
        this.gateways = list.stream()
                .collect(Collectors.toMap(PaymentGateway::type, g -> g));
    }

    public PaymentGateway get(String type) {
        PaymentGateway g = gateways.get(type.toUpperCase());
        if (g == null) throw new IllegalArgumentException("Unknown payment type: " + type);
        return g;
    }
}
```

### Step 4: Use it

```java
@RestController
@RequestMapping("/pay")
public class PaymentController {

    private final PaymentGatewayFactory factory;

    public PaymentController(PaymentGatewayFactory factory) { this.factory = factory; }

    @PostMapping("/{type}")
    public String pay(@PathVariable String type, @RequestParam double amount) {
        return factory.get(type).pay(amount);
    }
}
```

**Adding a new type (e.g. Wallet)?** Just create a new `@Component` class. No `if/else` to change. This follows the **Open/Closed principle** – open for extension, closed for modification.

## 5. Factory Method – tiny example

```java
abstract class NotificationService {
    abstract Notifier createNotifier();       // the "factory method"

    public void notifyUser(String msg) {
        createNotifier().send(msg);
    }
}

class EmailNotificationService extends NotificationService {
    Notifier createNotifier() { return new EmailNotifier(); }
}
```

## 6. Where Spring itself uses Factory

- `BeanFactory` / `ApplicationContext` – the whole Spring container is a giant factory.
- `@Bean` methods are factory methods.
- `FactoryBean<T>` interface lets you write custom creation logic.

## 7. When to use / when NOT to use

| Use it when | Avoid it when |
|---|---|
| You pick a class at runtime (by type, config, user input) | There is only one implementation and it will never change |
| Object creation is complex | A plain `new` is clear enough |

## 8. Points to explain in an interview

- **Simple factory vs factory method vs abstract factory** (see the table above).
- Factory hides `new`, so the caller depends on an **interface**, not a concrete class.
- In Spring, "inject a `List` or `Map` of beans" is the cleanest factory.

## 9. Quick revision

- Factory = one place that decides which object to create.
- Caller only knows the interface.
- New type = new class, no if/else changes.
