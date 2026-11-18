# Observer

**In one line:** When something happens in one object, **automatically tell** all the objects that are interested.

---

## 1. Real-life example

**YouTube subscribe button.** When a channel uploads a video, all subscribers get a notification. The channel doesn't need to know who each subscriber is personally – it just notifies everyone in the list. You can unsubscribe any time.

## 2. What problem does it solve?

After an order is placed you may need to: send an email, send an SMS, update stock, give reward points.

Bad way:

```java
public void placeOrder(Order o) {
    save(o);
    emailService.send(o);
    smsService.send(o);
    inventoryService.reduce(o);
    rewardService.add(o);     // OrderService knows about EVERYTHING
}
```

Observer way: `OrderService` just says **"order placed!"** and the listeners react. OrderService doesn't know or care who is listening.

## 3. Terms

- **Subject / Publisher** – the one that has news.
- **Observer / Subscriber / Listener** – the ones who want the news.
- **subscribe, unsubscribe, notify** – the three main actions.

## 4. Plain Java – a tiny event emitter

```java
public class EventEmitter<T> {
    private final List<Consumer<T>> listeners = new CopyOnWriteArrayList<>();

    public Runnable subscribe(Consumer<T> listener) {
        listeners.add(listener);
        return () -> listeners.remove(listener);      // returns an "unsubscribe" handle
    }

    public void unsubscribe(Consumer<T> listener) { listeners.remove(listener); }

    public void notifyAll(T event) {
        for (Consumer<T> l : listeners) l.accept(event);
    }
}
```

```java
EventEmitter<String> channel = new EventEmitter<>();
Runnable unsub = channel.subscribe(v -> System.out.println("Ravi got: " + v));
channel.subscribe(v -> System.out.println("Priya got: " + v));

channel.notifyAll("New video: Java Streams");
unsub.run();                                     // Ravi unsubscribes
channel.notifyAll("New video: Spring Boot");     // only Priya gets it
```

`CopyOnWriteArrayList` is used so a listener can unsubscribe while we are looping without errors.

## 5. Spring Boot way – Application Events

Spring has Observer built in.

### The event

```java
public record OrderPlacedEvent(Long orderId, String email, double total) { }
```

### Publisher

```java
@Service
public class OrderService {
    private final ApplicationEventPublisher publisher;

    public OrderService(ApplicationEventPublisher publisher) { this.publisher = publisher; }

    @Transactional
    public void placeOrder(Long id, String email, double total) {
        // ... save order
        publisher.publishEvent(new OrderPlacedEvent(id, email, total));
    }
}
```

### Listeners (observers)

```java
@Component
public class EmailListener {
    @EventListener
    public void onOrder(OrderPlacedEvent e) {
        System.out.println("Email sent to " + e.email());
    }
}

@Component
public class RewardListener {
    @Order(1)                         // controls order between listeners
    @EventListener
    public void onOrder(OrderPlacedEvent e) {
        System.out.println("Reward points added for order " + e.orderId());
    }
}
```

### Async + only after the DB commit

```java
@SpringBootApplication
@EnableAsync
public class ShopApplication { }

@Component
public class SmsListener {
    @Async                                                     // runs in another thread
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT) // only if order really saved
    public void onOrder(OrderPlacedEvent e) {
        System.out.println("SMS sent for order " + e.orderId());
    }
}
```

## 6. When to use / when NOT to use

| Use it when | Avoid it when |
|---|---|
| One action should trigger many independent reactions | The steps must happen in a strict order with results passed along |
| You want to add new reactions without touching old code | Debugging must be very simple (events make flow harder to follow) |

## 7. Points to explain in an interview

- **Memory leaks:** if listeners subscribe but never unsubscribe, the subject keeps them alive forever. Always unsubscribe (or use weak references). Spring beans live as long as the app, so this mostly matters in plain Java/UI code.
- **Ordering:** by default listeners have no guaranteed order. Use `@Order` if needed, but better to design listeners so order doesn't matter.
- **Sync vs async:** default Spring events are **synchronous** – same thread, and if a listener throws, the publisher sees the error. `@Async` makes it non-blocking but errors are no longer seen by the publisher.
- Observer inside one app vs messaging (Kafka/RabbitMQ) across services – same idea, bigger scale.

## 8. Quick revision

- Subject notifies many observers.
- Spring: `ApplicationEventPublisher` + `@EventListener`.
- Watch out for leaks, order and sync/async.
