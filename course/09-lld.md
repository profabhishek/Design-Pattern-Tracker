# TRACK lld
title: Low-Level Design & Machine Coding
icon: 📐
color: #f97316
tier: must
about: SOLID, class design, the patterns that matter, and classic machine-coding problems (parking lot, Splitwise, BookMyShow, rate limiter) with runnable code.

## MODULE lld-basics | Principles & approach

### ITEM lld-solid | SOLID principles with examples | must
ask: Explain the SOLID principles with examples from your code.
card: S = Single Responsibility: one reason to change (OrderService shouldn't send emails). O = Open/Closed: add behaviour by adding classes, not editing old ones (new PaymentStrategy). L = Liskov: a subclass must work wherever the parent works (Penguin extends Bird.fly breaks it). I = Interface Segregation: small focused interfaces. D = Dependency Inversion: depend on abstractions (PaymentGateway), inject implementations.
patterns: strategy, di

> 🧒 **Like you're 5:** S: a pencil writes, an eraser erases; don't glue them into one weird tool. O: add new Lego pieces, don't melt old ones. L: a toy car should drive like a car. I: don't force a fish to implement `climbTree()`. D: plug into the socket, not directly into the power plant.

```java
// O + D: adding UPI means adding a class, not editing a giant if/else
interface PaymentMethod { void pay(BigDecimal amount); }
class CardPayment implements PaymentMethod { public void pay(BigDecimal a) { ... } }
class UpiPayment  implements PaymentMethod { public void pay(BigDecimal a) { ... } }

@Service
class Checkout {
    private final Map<String, PaymentMethod> methods;      // Spring injects all implementations by bean name
    Checkout(Map<String, PaymentMethod> methods) { this.methods = methods; }
    void pay(String type, BigDecimal amt) { methods.get(type).pay(amt); }
}
```

> 🎯 **Say this in the interview:** pick ONE principle you actually applied and tell the before/after story. That beats reciting all five definitions.

### ITEM lld-approach | How to approach an LLD / machine-coding round | must
ask: You get 90 minutes to design and code a system (e.g. a parking lot). How do you approach it?
card: 1) Clarify requirements and scope (5–10 min): must-haves vs nice-to-haves, scale, concurrency. 2) Identify entities (nouns) and actions (verbs). 3) Draw classes + relationships, pick patterns only where they fit (Strategy for pricing, Factory for creation, Observer for notifications, State for machines). 4) Code bottom-up: models → services → a driver/main that demos it. 5) Make it work end to end first, then extend: thread safety, edge cases, tests. Keep classes small, names clear, no god class.

> 🧒 **Like you're 5:** Building a Lego city: first ask what the city needs (houses? roads?), pick the pieces, build one street that works, then add more streets. Don't spend the whole time drawing the perfect plan.

#### A 90-minute plan
| Minutes | Do |
|---|---|
| 0–10 | Requirements, write them as bullets, confirm with interviewer |
| 10–25 | Entities, enums, interfaces; a quick class diagram |
| 25–70 | Code the core flow, runnable `main` with a demo |
| 70–85 | Edge cases, concurrency (locks/ConcurrentHashMap), one or two tests |
| 85–90 | Walk through the design, what you'd improve |

> ⚠️ **Trap:** In machine coding rounds (Flipkart, Swiggy, Uber) **working, readable code** beats a beautiful diagram. Use in-memory storage behind a repository interface so it's easy to swap later.

### ITEM lld-relations | Class relationships: association, aggregation, composition, inheritance | good
ask: Explain association, aggregation and composition with examples.
card: Association = objects know each other (Teacher ↔ Student). Aggregation = has-a, parts can live alone (Team has Players; players exist without the team). Composition = strong has-a, parts die with the whole (Order has OrderItems; delete the order, items go). Inheritance = is-a. Dependency = uses temporarily (a method parameter).

> 🧒 **Like you're 5:** Composition: a house and its rooms (no house, no rooms). Aggregation: a class and its students (the class ends, kids still exist). Association: you and your friend.

```diagram
Order ◆──── OrderItem      composition (filled diamond)
Team  ◇──── Player         aggregation (empty diamond)
Car   ────▷ Vehicle        inheritance
Driver ───→ Car            association
```

### ITEM lld-patterns-map | Which design patterns to know, and when to use each | must
ask: Which design patterns have you used? When would you use Strategy, Factory, Builder, Observer, Decorator, State, Singleton?
card: Strategy = swap algorithms (pricing, payment, discount). Factory = create the right subtype from input (NotificationFactory.create("SMS")). Builder = objects with many optional fields (immutable request/DTO). Observer = notify many listeners of an event (Spring ApplicationEvent). Decorator = add behaviour by wrapping (logging/caching around a client, Java IO streams). State = object behaviour depends on its state (vending machine, order status). Singleton = one instance (Spring beans already are). Adapter = make an old/3rd-party API fit your interface. Template Method = fixed algorithm skeleton with overridable steps (JdbcTemplate).
patterns: strategy, factory, builder, observer, proxy, singleton

> 🧒 **Like you're 5:** Patterns are well-known Lego building tricks. You don't need all of them; you need to recognise which trick solves the problem in front of you.

| Problem in the round | Pattern |
|---|---|
| Different pricing per vehicle type / time | Strategy |
| Create Car/Bike/Truck from a string | Factory |
| Vending machine: idle → has money → dispensing | State |
| Notify users when a seat frees up | Observer |
| Add logging/caching to an existing class | Decorator / Proxy |
| Complex object with 10 optional fields | Builder |
| Undo in a text editor | Command (+ Memento) |

> 💡 **Tip:** Your Design Patterns track has deep-dive notes with diagrams and Spring Boot code for the main ones. Open them from the buttons below.

## MODULE lld-problems | Machine-coding problems

### ITEM lld-rate-limiter | Design a rate limiter (token bucket) | must
ask: Design and implement a rate limiter that allows N requests per second per user.
card: Token bucket: each user has a bucket with capacity C and refill rate R tokens/sec. On a request, refill based on elapsed time (tokens = min(C, tokens + elapsed × R)), then allow if tokens >= 1 (take one) else reject. Allows short bursts, smooth average. Alternatives: fixed window counter (simple, burst at edges), sliding window log (exact, memory-heavy), sliding window counter (good approximation), leaky bucket (smooth output). Distributed: store state in Redis with a Lua script for atomicity.
patterns: ratelimit

> 🧒 **Like you're 5:** Each user has a jar that holds 5 tokens. Every second, the jar gets 1 more token (never more than 5). Each request costs one token. Empty jar? "Please wait!"

#### Design
```diagram
RateLimiter ── allow(userId) ──► Map<userId, Bucket>
Bucket { capacity, refillPerSec, tokens, lastRefillNanos }
Clock injected → deterministic tests
```

> 🏭 **Production notes:** per-user buckets in a `ConcurrentHashMap` (compute for atomic update), evict idle users, return HTTP 429 + `Retry-After`, and for many instances use Redis or the API gateway.

```java starter
import java.util.*;
import java.util.function.LongSupplier;

/** clock.getAsLong() returns the current time in MILLISECONDS (tests control it). */
class RateLimiter {
    public RateLimiter(int capacity, double refillPerSecond, LongSupplier clock) {
        // TODO
    }
    /** true if this user may make a request now (and use up one token). */
    public boolean allow(String userId) {
        // TODO: token bucket per user
        return false;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        T.eq("burst of 3 then blocked", () -> {
            long[] now = {0};
            RateLimiter rl = new RateLimiter(3, 1.0, () -> now[0]);
            return "" + rl.allow("u") + rl.allow("u") + rl.allow("u") + rl.allow("u");
        }, "truetruetruefalse");
        T.eq("refills over time", () -> {
            long[] now = {0};
            RateLimiter rl = new RateLimiter(2, 1.0, () -> now[0]);
            rl.allow("u"); rl.allow("u");
            boolean blocked = rl.allow("u");
            now[0] = 1000;                         // 1 second later: one new token
            return blocked + "," + rl.allow("u") + "," + rl.allow("u");
        }, "false,true,false");
        T.eq("never above capacity", () -> {
            long[] now = {0};
            RateLimiter rl = new RateLimiter(2, 5.0, () -> now[0]);
            now[0] = 60_000;                       // a long idle time
            return "" + rl.allow("u") + rl.allow("u") + rl.allow("u");
        }, "truetruefalse");
        T.eq("users are independent", () -> {
            long[] now = {0};
            RateLimiter rl = new RateLimiter(1, 1.0, () -> now[0]);
            return "" + rl.allow("a") + rl.allow("a") + rl.allow("b");
        }, "truefalsetrue");
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

class RateLimiter {
    private static final class Bucket { double tokens; long last; Bucket(double t, long l) { tokens = t; last = l; } }

    private final int capacity;
    private final double refillPerMs;
    private final LongSupplier clock;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public RateLimiter(int capacity, double refillPerSecond, LongSupplier clock) {
        this.capacity = capacity;
        this.refillPerMs = refillPerSecond / 1000.0;
        this.clock = clock;
    }

    public boolean allow(String userId) {
        long now = clock.getAsLong();
        Bucket b = buckets.computeIfAbsent(userId, k -> new Bucket(capacity, now));
        synchronized (b) {                                         // one user's bucket at a time
            b.tokens = Math.min(capacity, b.tokens + (now - b.last) * refillPerMs);
            b.last = now;
            if (b.tokens >= 1) { b.tokens -= 1; return true; }
            return false;
        }
    }
}
```

```hint
Store per user: current tokens (double) and the time of the last refill. On each call, first add (elapsedMs × ratePerMs) tokens, capped at capacity.
```

### ITEM lld-parking-lot | Design a parking lot | must
ask: Design a parking lot with multiple floors, spot sizes (bike, car, truck), tickets and pricing.
card: Entities: ParkingLot → Floors → Spots (type, occupied), Vehicle (type, number), Ticket (id, vehicle, spot, entryTime), Gates. Services: SpotAllocationStrategy (nearest first), PricingStrategy (hourly by vehicle type), PaymentService. Flow: park → find free compatible spot → mark occupied → issue ticket; unpark → compute fee → free spot. Concurrency: lock/atomically claim spots (ConcurrentHashMap, synchronized per floor, or a queue of free spots per type).
patterns: strategy, factory, singleton

> 🧒 **Like you're 5:** A big garage with floors. Bikes fit in small spots, cars in medium, trucks in large. When you drive in you get a ticket telling you your spot. When you leave you pay for the hours and the spot becomes free.

```diagram
ParkingLot ◆── Floor ◆── Spot(id, size, vehicle?)
Vehicle(plate, type) ;  Ticket(id, plate, spotId, entry)
ParkingService: park(vehicle) → Ticket | leave(ticketId, exitTime) → fee
SpotAllocationStrategy ;  PricingStrategy (Strategy pattern)
```

> 🔁 **Follow-ups:** "two cars at the gate grab the same spot?" → atomic claim. "Add EV charging spots?" → new spot type + strategy, no edits to old code (Open/Closed). "Show free spots per floor on a display board?" → Observer.

```java starter
import java.util.*;

enum VehicleType { BIKE, CAR, TRUCK }

/** Spots are given as a list of types. A vehicle may only park in a spot of the SAME type.
 *  Always take the free spot with the lowest index. Fee = hours (rounded up, min 1) × rate:
 *  BIKE 10, CAR 20, TRUCK 50. */
class ParkingLot {
    public ParkingLot(List<VehicleType> spots) {
        // TODO
    }
    /** returns the spot index, or -1 if full */
    public int park(String plate, VehicleType type, long entryMinute) {
        // TODO
        return -1;
    }
    /** frees the spot and returns the fee; throws IllegalArgumentException if plate not parked */
    public int leave(String plate, long exitMinute) {
        // TODO
        return 0;
    }
    public int freeSpots(VehicleType type) {
        // TODO
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        java.util.List<VehicleType> spots = java.util.List.of(VehicleType.CAR, VehicleType.BIKE, VehicleType.CAR, VehicleType.TRUCK);
        T.eq("park in lowest free spot", () -> {
            ParkingLot p = new ParkingLot(spots);
            return p.park("KA01", VehicleType.CAR, 0) + "," + p.park("KA02", VehicleType.CAR, 0) + "," + p.park("KA03", VehicleType.CAR, 0);
        }, "0,2,-1");
        T.eq("fee rounds up hours", () -> {
            ParkingLot p = new ParkingLot(spots);
            p.park("DL9", VehicleType.CAR, 0);
            return p.leave("DL9", 61);            // 61 minutes = 2 hours
        }, 40);
        T.eq("minimum one hour", () -> {
            ParkingLot p = new ParkingLot(spots);
            p.park("B1", VehicleType.BIKE, 100);
            return p.leave("B1", 105);
        }, 10);
        T.eq("spot is reused", () -> {
            ParkingLot p = new ParkingLot(spots);
            p.park("T1", VehicleType.TRUCK, 0);
            int full = p.park("T2", VehicleType.TRUCK, 0);
            p.leave("T1", 120);
            return full + "," + p.freeSpots(VehicleType.TRUCK) + "," + p.park("T2", VehicleType.TRUCK, 130);
        }, "-1,1,3");
        T.eq("unknown plate", () -> {
            try { new ParkingLot(spots).leave("NOPE", 10); return "no error"; }
            catch (IllegalArgumentException e) { return "IllegalArgumentException"; }
        }, "IllegalArgumentException");
        T.done();
    }
}
```

```java solution
import java.util.*;

enum VehicleType { BIKE, CAR, TRUCK }

class ParkingLot {
    private record Ticket(int spot, VehicleType type, long entry) {}
    private static final Map<VehicleType, Integer> RATE = Map.of(VehicleType.BIKE, 10, VehicleType.CAR, 20, VehicleType.TRUCK, 50);

    private final Map<VehicleType, TreeSet<Integer>> free = new EnumMap<>(VehicleType.class);
    private final Map<String, Ticket> active = new HashMap<>();

    public ParkingLot(List<VehicleType> spots) {
        for (VehicleType t : VehicleType.values()) free.put(t, new TreeSet<>());
        for (int i = 0; i < spots.size(); i++) free.get(spots.get(i)).add(i);
    }

    public synchronized int park(String plate, VehicleType type, long entryMinute) {
        Integer spot = free.get(type).pollFirst();             // lowest free index
        if (spot == null) return -1;
        active.put(plate, new Ticket(spot, type, entryMinute));
        return spot;
    }

    public synchronized int leave(String plate, long exitMinute) {
        Ticket t = active.remove(plate);
        if (t == null) throw new IllegalArgumentException("Not parked: " + plate);
        free.get(t.type()).add(t.spot());
        long hours = Math.max(1, (exitMinute - t.entry() + 59) / 60);
        return (int) hours * RATE.get(t.type());
    }

    public synchronized int freeSpots(VehicleType type) { return free.get(type).size(); }
}
```

```hint
Keep a TreeSet<Integer> of free spot indexes per vehicle type (pollFirst gives the lowest), and a Map<plate, ticket>.
```

### ITEM lld-splitwise | Design Splitwise (expense sharing) | must
ask: Design Splitwise: users add expenses split equally/exactly/by percent; show who owes whom.
card: Entities: User, Group, Expense (paidBy, amount, splits), Split (EqualSplit, ExactSplit, PercentSplit: Strategy/Factory). Keep a balance per user (net = paid - owed) or a pairwise balance sheet Map<A, Map<B, amount>>. Simplify debts: repeatedly match the biggest debtor with the biggest creditor (greedy with two heaps) to minimise transactions. Use BigDecimal/paise (long) for money, never double.
patterns: strategy, factory

> 🧒 **Like you're 5:** Friends share pizza. Whoever paid gets "plus", everyone who ate gets "minus" their share. At the end, people with minus pay people with plus.

> ⚠️ **Trap:** 100 split 3 ways = 33.33 + 33.33 + 33.34. Store money as whole paise (long) and give the leftover paisa to someone, so the total always matches.

```java starter
import java.util.*;

/** Money is in whole rupees (int). Splits are equal; the payer also shares the cost.
 *  If the amount doesn't divide evenly, the FIRST participants in the list pay 1 extra each. */
class Splitwise {
    public void addExpense(String paidBy, int amount, List<String> participants) {
        // TODO
    }
    /** net balance: positive = others owe this user, negative = this user owes. 0 if unknown. */
    public int balance(String user) {
        // TODO
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        T.eq("dinner split 3 ways", () -> {
            Splitwise s = new Splitwise();
            s.addExpense("A", 300, java.util.List.of("A", "B", "C"));
            return s.balance("A") + "," + s.balance("B") + "," + s.balance("C");
        }, "200,-100,-100");
        T.eq("two expenses", () -> {
            Splitwise s = new Splitwise();
            s.addExpense("A", 300, java.util.List.of("A", "B", "C"));
            s.addExpense("B", 90, java.util.List.of("A", "B", "C"));
            return s.balance("A") + "," + s.balance("B") + "," + s.balance("C");
        }, "170,-40,-130");
        T.eq("uneven split, totals stay zero", () -> {
            Splitwise s = new Splitwise();
            s.addExpense("C", 100, java.util.List.of("A", "B", "C"));   // 34, 33, 33
            return s.balance("A") + "," + s.balance("B") + "," + s.balance("C");
        }, "-34,-33,67");
        T.eq("unknown user", () -> new Splitwise().balance("Z"), 0);
        T.done();
    }
}
```

```java solution
import java.util.*;

class Splitwise {
    private final Map<String, Integer> net = new HashMap<>();

    public void addExpense(String paidBy, int amount, List<String> participants) {
        int n = participants.size(), share = amount / n, extra = amount % n;
        net.merge(paidBy, amount, Integer::sum);                     // payer is owed the full amount
        for (int i = 0; i < n; i++) {
            int owes = share + (i < extra ? 1 : 0);                  // first 'extra' people pay 1 more
            net.merge(participants.get(i), -owes, Integer::sum);
        }
    }

    public int balance(String user) { return net.getOrDefault(user, 0); }
}
```

### ITEM lld-bookmyshow | Design BookMyShow (seat booking with concurrency) | must
ask: Design a movie ticket booking system like BookMyShow. How do you stop two users booking the same seat?
card: Entities: City → Theatre → Screen → Seat; Movie; Show (movie, screen, time); ShowSeat (show, seat, status AVAILABLE/LOCKED/BOOKED, lockedBy, lockExpiry); Booking; Payment. Flow: select seats → temporarily LOCK them for ~5–10 min → pay → BOOKED, or the lock expires → AVAILABLE. Concurrency: atomic DB update (UPDATE show_seat SET status='LOCKED' WHERE id IN (...) AND status='AVAILABLE', check row count), optimistic @Version, or a Redis lock with TTL. Never hold a DB transaction open during payment.
patterns: idempotency, tcc

> 🧒 **Like you're 5:** When you pick seats, they get a "reserved for you for 10 minutes" sticker. If you pay in time, the sticker becomes "sold". If not, the sticker falls off and someone else can pick the seat.

```diagram
AVAILABLE ──lock (atomic, TTL)──► LOCKED ──payment ok──► BOOKED
    ▲                               │
    └────────lock expired / payment failed─┘
```

```sql
UPDATE show_seat
SET status = 'LOCKED', locked_by = :user, lock_expiry = now() + interval '10 minutes'
WHERE show_id = :show AND seat_id IN (:seats) AND status = 'AVAILABLE';
-- rows updated must equal number of seats, otherwise roll back: someone got there first
```

> 🔁 **Follow-ups:** idempotent payment callback (Idempotency-Key), a scheduler/Redis key expiry to release stale locks, read-heavy "seat map" served from cache, notifications via events.

### ITEM lld-elevator | Design an elevator system | good
ask: Design an elevator system for a building with several lifts.
card: Entities: Building, Elevator (id, currentFloor, direction, state, stop queue), Request (floor, direction; external hall call vs internal car call), Dispatcher with a SchedulingStrategy (nearest idle / same-direction first / SCAN). Elevator state machine: IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN, MAINTENANCE (State pattern). SCAN/LOOK algorithm: keep going in one direction serving stops (TreeSet up/down), then reverse.
patterns: strategy, observer

> 🧒 **Like you're 5:** The lift is like a school bus: it keeps going in one direction picking everyone up on the way, and only turns around at the end of the route.

```java
class Elevator {
    int floor; Direction dir = Direction.IDLE;
    final TreeSet<Integer> up = new TreeSet<>(), down = new TreeSet<>(Comparator.reverseOrder());
    void addStop(int f) { if (f > floor) up.add(f); else down.add(f); }
    Integer nextStop() {
        if (dir != Direction.DOWN && !up.isEmpty()) return up.ceiling(floor);
        if (!down.isEmpty()) return down.first();
        return up.isEmpty() ? null : up.first();
    }
}
```

### ITEM lld-kv-store | Design an in-memory key-value store with TTL | good
ask: Design an in-memory key-value store with get, put, delete and per-key expiry (TTL).
card: ConcurrentHashMap<K, Entry(value, expiresAt)>. get: return null and remove if expired (lazy expiry). Background cleanup: a ScheduledExecutorService or a DelayQueue / min-heap ordered by expiry removes expired keys (active expiry). Add max size with LRU eviction (LinkedHashMap access order, or Caffeine). Inject a Clock for testability. Extensions: persistence (append-only log + snapshots), transactions, pub/sub.
patterns: proxy

> 🧒 **Like you're 5:** A fridge where every item has a "best before" sticker. When you open it, you throw out anything expired. A cleaner also checks the fridge every few minutes.

```java
class TtlCache<K, V> {
    private record Entry<V>(V value, long expiresAt) {}
    private final ConcurrentHashMap<K, Entry<V>> map = new ConcurrentHashMap<>();
    private final Clock clock;
    TtlCache(Clock clock, ScheduledExecutorService cleaner) {
        this.clock = clock;
        cleaner.scheduleAtFixedRate(() -> map.entrySet().removeIf(e -> expired(e.getValue())), 1, 1, TimeUnit.SECONDS);
    }
    void put(K k, V v, Duration ttl) { map.put(k, new Entry<>(v, clock.millis() + ttl.toMillis())); }
    V get(K k) {
        Entry<V> e = map.get(k);
        if (e == null) return null;
        if (expired(e)) { map.remove(k, e); return null; }
        return e.value();
    }
    private boolean expired(Entry<V> e) { return clock.millis() >= e.expiresAt(); }
}
```

### ITEM lld-vending | Design a vending machine (State pattern) | good
ask: Design a vending machine.
card: States: Idle → HasMoney → Dispensing → (back to Idle), plus OutOfStock/Maintenance. Each state is a class implementing the same interface (insertCoin, selectProduct, dispense, refund); the machine delegates to its current state, and states switch the machine to the next state. Inventory: Map<slot, (product, count)>. Return change with a greedy coin algorithm (careful: greedy works for standard denominations).

> 🧒 **Like you're 5:** The machine is in a mood. In "waiting" mood, pressing a snack button does nothing. In "has money" mood it gives you a snack. Each mood knows its own rules, so there's no giant if/else.

```java
interface State { void insert(Machine m, int coin); void select(Machine m, String slot); }
class Idle implements State {
    public void insert(Machine m, int coin) { m.balance += coin; m.state = new HasMoney(); }
    public void select(Machine m, String slot) { System.out.println("Insert money first"); }
}
class HasMoney implements State {
    public void insert(Machine m, int coin) { m.balance += coin; }
    public void select(Machine m, String slot) {
        Product p = m.inventory.get(slot);
        if (p.price() > m.balance) { System.out.println("Add more money"); return; }
        m.dispense(p); m.returnChange(m.balance - p.price()); m.balance = 0; m.state = new Idle();
    }
}
```

### ITEM lld-notification | Design a notification service (email, SMS, push) | good
ask: Design a notification service that sends email, SMS and push notifications with retries and user preferences.
card: API accepts NotificationRequest(userId, templateId, params, channels, idempotencyKey). Look up user preferences and templates, render, then publish one message per channel to a queue (Kafka/SQS). Channel workers use a ChannelSender interface (Strategy/Factory: EmailSender, SmsSender, PushSender) with provider adapters (SES, Twilio, FCM). Retries with backoff, DLQ for permanent failures, rate limits per provider, idempotency to avoid duplicate sends, status tracking table, quiet hours.
patterns: observer, retry, dlq, idempotency

> 🧒 **Like you're 5:** A post office: you hand in one letter, they check how the person likes to be contacted (letter, phone call, pigeon) and put a copy in each right mailbag. If delivery fails, they try again later; if it keeps failing, it goes in the "problem letters" box.

```diagram
API → validate + prefs + template → Kafka topics (email | sms | push)
     → channel workers → provider adapters (SES / Twilio / FCM)
     → retry with backoff → DLQ ; status table for "sent / failed / delivered"
```
