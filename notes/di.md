# Dependency Injection (DI)

**In one line:** Don't create the things your class needs **inside** it. **Pass them in from outside** (usually through the constructor).

---

## 1. Real-life example

A **mobile phone and its charger**. The phone doesn't have a charger built in. You plug in any charger that fits the port (the interface). Tomorrow you can use a fast charger or a power bank – the phone doesn't change.

## 2. What problem does it solve?

Without DI:

```java
public class OrderService {
    private final EmailSender sender = new GmailSender();   // tightly glued
}
```

Problems:
- You can't switch to `SmsSender` without changing `OrderService`.
- In tests, it will really send emails! You can't put a fake.

With DI:

```java
public class OrderService {
    private final MessageSender sender;

    public OrderService(MessageSender sender) {   // given from outside
        this.sender = sender;
    }
}
```

Now anyone can give any `MessageSender` – real, fake, or mock.

## 3. Key words

- **Dependency** – something your class needs (a repo, a client, a sender).
- **Injection** – giving it from outside.
- **IoC (Inversion of Control)** – the framework (Spring) creates objects and wires them, not you.
- **IoC Container** – Spring's `ApplicationContext`.

## 4. Spring Boot code

```java
public interface MessageSender {
    void send(String to, String msg);
}

@Component
public class EmailSender implements MessageSender {
    public void send(String to, String msg) {
        System.out.println("Email to " + to + ": " + msg);
    }
}

@Service
public class OrderService {
    private final OrderRepository repo;
    private final MessageSender sender;

    // Only one constructor → Spring uses it automatically, @Autowired not needed
    public OrderService(OrderRepository repo, MessageSender sender) {
        this.repo = repo;
        this.sender = sender;
    }

    public Order place(Order o) {
        Order saved = repo.save(o);
        sender.send(o.getEmail(), "Order " + saved.getId() + " placed!");
        return saved;
    }
}
```

With Lombok you can shorten it:

```java
@Service
@RequiredArgsConstructor          // creates the constructor for all final fields
public class OrderService {
    private final OrderRepository repo;
    private final MessageSender sender;
}
```

### More than one implementation?

```java
@Component @Primary          // used by default
public class EmailSender implements MessageSender { ... }

@Component("sms")
public class SmsSender implements MessageSender { ... }

public AlertService(@Qualifier("sms") MessageSender sender) { ... }   // pick a specific one
```

## 5. Build task – refactor and test with a mock

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock OrderRepository repo;
    @Mock MessageSender sender;

    @Test
    void sendsMessageAfterSaving() {
        Order o = new Order("ravi@mail.com");
        when(repo.save(o)).thenReturn(o.withId(1L));

        OrderService service = new OrderService(repo, sender);   // inject fakes
        service.place(o);

        verify(sender).send("ravi@mail.com", "Order 1 placed!");
    }
}
```

No Spring, no database, no real email – the test is fast. This is the biggest benefit of DI.

## 6. Types of injection

| Type | Code | Opinion |
|---|---|---|
| **Constructor** ✅ | `public A(B b)` | **Best.** Fields can be `final`, object is never half-ready, easy to test. |
| **Setter** | `@Autowired void setB(B b)` | OK for **optional** dependencies. |
| **Field** ❌ | `@Autowired private B b;` | Short but hides dependencies; can't make `final`; hard to test without Spring. |

## 7. DI vs Service Locator

**Service Locator** = your class asks a central registry: `Registry.get(MessageSender.class)`.

| DI | Service Locator |
|---|---|
| Dependencies are visible in the constructor | Dependencies are hidden inside methods |
| Easy to test | Need to set up the registry in tests |
| Class doesn't know about the container | Class depends on the locator |

`applicationContext.getBean(...)` inside your code is a service locator – avoid it in normal code.

## 8. Points to explain in an interview

- Constructor vs setter injection (table above).
- Circular dependency: A needs B and B needs A. Constructor injection will fail at startup (good – it shows a design problem). Fix by redesigning, not by switching to field injection.
- DI makes code **loosely coupled** and **testable**.

## 9. Quick revision

- Pass dependencies in, don't `new` them inside.
- Prefer constructor injection with `final` fields.
- Spring's IoC container does the wiring for you.
