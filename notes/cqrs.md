# CQRS (Command Query Responsibility Segregation)

**In one line:** Use **one model for writing** data (commands) and a **different model for reading** data (queries).

---

## 1. Real-life example

A **restaurant**: the **kitchen** (write side) cooks and changes things; the **menu board** (read side) only shows what's available, in a format that's easy to read. You don't read the menu by walking into the kitchen.

## 2. Simple words

- **Command** = "do something / change something" → `PlaceOrder`, `CancelOrder`. Returns nothing or just an id.
- **Query** = "tell me something" → `GetOrderSummary`. Never changes data.

CQRS says: keep these two in **separate classes**, and optionally **separate data models or even separate databases**.

## 3. What problem does it solve?

One model trying to do both gets messy:
- Writes need strict rules, validation, normalized tables.
- Reads need fast, joined, pre-calculated data ("order with customer name, item count, total").
- Usually **reads are 10–100× more** than writes, so you want to scale them separately.

## 4. Level 1 – split handlers in the same database (start here)

### Commands (write side)

```java
public record PlaceOrderCommand(Long customerId, List<Item> items) { }
public record CancelOrderCommand(Long orderId) { }

@Service
@RequiredArgsConstructor
public class OrderCommandHandler {
    private final OrderRepository orderRepo;        // JPA entity with business rules
    private final ApplicationEventPublisher events;

    @Transactional
    public Long handle(PlaceOrderCommand cmd) {
        if (cmd.items().isEmpty()) throw new IllegalArgumentException("Order needs items");
        Order order = Order.create(cmd.customerId(), cmd.items());
        orderRepo.save(order);
        events.publishEvent(new OrderPlacedEvent(order.getId()));
        return order.getId();
    }

    @Transactional
    public void handle(CancelOrderCommand cmd) {
        Order order = orderRepo.findById(cmd.orderId()).orElseThrow();
        order.cancel();                              // rule: can't cancel if shipped
    }
}
```

### Queries (read side) – simple DTOs, direct SQL, no entities

```java
public record OrderSummaryView(Long id, String customerName, int itemCount, double total, String status) { }

@Service
@RequiredArgsConstructor
public class OrderQueryHandler {
    private final JdbcTemplate jdbc;

    public List<OrderSummaryView> ordersOfCustomer(Long customerId) {
        return jdbc.query("""
            select o.id, c.name, count(i.id) as item_count, sum(i.price * i.qty) as total, o.status
            from orders o
            join customers c on c.id = o.customer_id
            join order_items i on i.order_id = o.id
            where o.customer_id = ?
            group by o.id, c.name, o.status
            """,
            (rs, n) -> new OrderSummaryView(rs.getLong(1), rs.getString(2),
                    rs.getInt(3), rs.getDouble(4), rs.getString(5)),
            customerId);
    }
}
```

### Controllers

```java
@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {
    private final OrderCommandHandler commands;
    private final OrderQueryHandler queries;

    @PostMapping
    public ResponseEntity<Long> place(@RequestBody PlaceOrderCommand cmd) {
        return ResponseEntity.status(201).body(commands.handle(cmd));
    }

    @GetMapping("/customer/{id}")
    public List<OrderSummaryView> list(@PathVariable Long id) {
        return queries.ordersOfCustomer(id);
    }
}
```

## 5. Level 2 – separate read database (read model / projection)

The write side publishes events. A **projector** listens and updates a read-optimized table (or Elasticsearch / MongoDB / Redis).

```java
@Component
@RequiredArgsConstructor
public class OrderSummaryProjector {
    private final OrderSummaryRepository readRepo;   // flat table: order_summary

    @TransactionalEventListener   // or a Kafka listener in a separate service
    public void on(OrderPlacedEvent e) {
        // build a flat row with everything the UI needs
        readRepo.save(OrderSummaryRow.from(e));
    }
}
```

## 6. Eventual consistency on the read side

With a separate read store, the read model is updated **a little after** the write. For a few milliseconds/seconds, the user may not see their new order in the list.

Ways to handle it:
- Return the created data in the command response, show it directly in the UI.
- Read from the write side for "my latest order" screens.
- Show "processing…" in the UI.

## 7. When it is overkill

- Simple CRUD apps (create/read/update/delete forms). One model is perfectly fine.
- Small team, small traffic.
- When you can't accept *any* delay between write and read.

Good fit: high read traffic, complex reporting screens, different scaling needs, often together with **Event Sourcing**.

## 8. Points to explain in an interview

- Command vs Query, and why separate them.
- Level 1 (separate code) vs Level 2 (separate stores).
- **Eventual consistency** on the read side and how to handle it.
- **When it is overkill** – most CRUD apps.

## 9. Quick revision

- Commands change, queries read – keep them apart.
- Start with separate handlers; add a separate read DB only if needed.
- Separate read DB → eventual consistency.
