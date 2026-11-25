# TRACK java-core
title: Core Java & JVM
icon: ☕
color: #f59e0b
tier: must
about: OOP, Strings, exceptions, memory, garbage collection and debugging. Every interview starts here.

## MODULE oop | OOP & language fundamentals

### ITEM oop-pillars | The 4 pillars of OOP | must
ask: Explain abstraction, encapsulation, inheritance and polymorphism with backend examples.
card: Encapsulation = keep data private, change it only through methods. Abstraction = show WHAT it does, hide HOW (interfaces). Inheritance = a child class reuses a parent. Polymorphism = one call, many behaviours (PaymentService.pay() works for UPI, Card, Wallet).

> 🧒 **Like you're 5:** A TV remote. You press "volume up" (abstraction: you don't know the circuits). You can't open it and touch the wires (encapsulation). A new smart remote still has all old buttons (inheritance). The same "power" button works on a Sony or a Samsung TV (polymorphism).

#### The four, with backend examples

| Pillar | Simple meaning | Backend example |
|---|---|---|
| **Encapsulation** | Hide the data, give safe methods | `Account.balance` is `private`; only `deposit()`/`withdraw()` can change it, and they check rules |
| **Abstraction** | Show what, hide how | `PaymentGateway` interface with `pay()`. The controller doesn't care if it's Razorpay or Stripe |
| **Inheritance** | Reuse a parent's code | `BaseEntity` with `id`, `createdAt` that every JPA entity extends |
| **Polymorphism** | Same call, different behaviour | `List<NotificationSender>` holds Email, SMS, Push senders; `send()` does the right thing for each |

```java
interface PaymentGateway { String pay(int amount); }          // abstraction

class RazorpayGateway implements PaymentGateway {
    public String pay(int amount) { return "Paid " + amount + " via Razorpay"; }
}
class StripeGateway implements PaymentGateway {
    public String pay(int amount) { return "Paid " + amount + " via Stripe"; }
}

class Account {                                                 // encapsulation
    private long balance;                                       // nobody can set this directly
    public void withdraw(long amt) {
        if (amt > balance) throw new IllegalArgumentException("Not enough money");
        balance -= amt;
    }
}

PaymentGateway g = new StripeGateway();   // polymorphism: decided at runtime
g.pay(500);
```

> 🎯 **Say this in the interview:** "Encapsulation protects state, abstraction hides implementation behind interfaces, inheritance reuses code, and polymorphism lets me program to an interface. In Spring I inject `PaymentGateway` and swap Razorpay for Stripe without touching the controller."

> ⚠️ **Trap:** Don't say "abstraction = abstract class". Abstraction is the idea; interfaces and abstract classes are two tools for it.

### ITEM overload-override | Overloading vs overriding | must
ask: Overloading vs overriding; compile-time vs runtime polymorphism.
card: Overloading = same method name, different parameters, same class, picked at COMPILE time. Overriding = child class replaces a parent method with the same signature, picked at RUNTIME based on the real object.

> 🧒 **Like you're 5:** Overloading is one chef who can cook `cook(rice)` or `cook(rice, dal)`. Overriding is a son who learned dad's recipe and makes his own version. Who cooks depends on who is actually in the kitchen.

```java
class Notifier {
    void send(String msg) { System.out.println("plain: " + msg); }
    void send(String msg, int retries) { System.out.println("with retries"); } // OVERLOAD
}
class SmsNotifier extends Notifier {
    @Override
    void send(String msg) { System.out.println("SMS: " + msg); }             // OVERRIDE
}

Notifier n = new SmsNotifier();
n.send("hi");      // prints "SMS: hi": the object type decides (runtime)
```

#### Rules to remember

| | Overloading | Overriding |
|---|---|---|
| Where | Same class (or child) | Parent → child |
| Signature | Different params | Exactly the same |
| Return type | Anything | Same or a subtype (covariant) |
| Decided | Compile time (static binding) | Runtime (dynamic dispatch) |
| `static`/`private`/`final` methods | Can be overloaded | **Cannot** be overridden |

> ⚠️ **Trap:** A `static` method with the same signature in the child *hides* the parent's, it does not override. `Parent p = new Child(); p.staticMethod()` calls the **Parent** version.

> 🎯 **Say this in the interview:** "Overloading is compile-time polymorphism: same name, different parameter list. Overriding is runtime polymorphism: the JVM looks at the actual object and calls the child's method. Always use `@Override` so the compiler catches typos."

### ITEM interface-abstract | Interface vs abstract class, composition vs inheritance | must
ask: Interface vs abstract class; composition vs inheritance.
card: Interface = a contract (what to do), a class can implement many, can have default methods, no instance state. Abstract class = a half-built class with state and constructors, only one can be extended. Prefer composition ("has-a") over inheritance ("is-a") for flexibility.

> 🧒 **Like you're 5:** An interface is a job description ("must be able to drive"). An abstract class is a half-built car you finish. Composition is building a car by plugging in an engine, instead of being born from another car.

| | Interface | Abstract class |
|---|---|---|
| Multiple? | A class can implement **many** | Only **one** parent |
| State (fields) | Only `static final` constants | Normal fields allowed |
| Constructor | No | Yes |
| Methods | abstract, `default`, `static`, `private` (Java 9) | Any |
| Use when | Defining a capability: `Comparable`, `Runnable` | Sharing code + state among close relatives |

#### Composition over inheritance

```java
// Inheritance: rigid. Every Bird can fly? Penguin breaks it.
class Bird { void fly() {} }
class Penguin extends Bird { void fly() { throw new UnsupportedOperationException(); } } // smell!

// Composition: plug behaviour in
interface FlyBehaviour { void fly(); }
class Bird2 {
    private final FlyBehaviour flyer;          // HAS-A
    Bird2(FlyBehaviour flyer) { this.flyer = flyer; }
    void fly() { flyer.fly(); }
}
```

Spring is composition everywhere: your `OrderService` *has* a `PaymentClient` and an `OrderRepository` injected; it doesn't extend them.

> 🎯 **Say this in the interview:** "I use interfaces for contracts and abstract classes only when related classes share state and code. I prefer composition because it avoids fragile base classes and makes testing easy: I can inject a mock."

### ITEM immutable-string | Immutable classes, String immutability & String pool | must
ask: Immutable class design; String immutability and String pool.
card: Immutable = state can't change after creation: final class, private final fields, no setters, defensive copies of mutable fields. String is immutable so it's safe to share, cache its hash, and use in the String pool and as HashMap keys. Literals go to the pool; new String() makes a new heap object.

> 🧒 **Like you're 5:** An immutable object is a printed photo. You can't change it; if you want a different one, you print a new photo. Everyone can safely look at the same photo at once.

#### Recipe for an immutable class

```java
public final class Money {                          // 1. final: no sneaky subclass
    private final long amount;                      // 2. private final fields
    private final List<String> tags;

    public Money(long amount, List<String> tags) {
        this.amount = amount;
        this.tags = List.copyOf(tags);              // 3. defensive copy IN
    }
    public long amount() { return amount; }         // 4. no setters
    public List<String> tags() { return tags; }     // List.copyOf is already unmodifiable
    public Money plus(long x) { return new Money(amount + x, tags); }  // 5. "change" = new object
}
// Java 16+: a record does most of this for you: record Money(long amount, List<String> tags) {}
// (but you still need a compact constructor to copy the list)
```

#### Why String is immutable
1. **String pool**: `"hi"` literals are shared. If one person could change it, everyone's "hi" would change.
2. **Security**: file paths, DB URLs, class names can't be changed after checks.
3. **Thread safety**: no locks needed.
4. **Hash caching**: `hashCode()` is computed once, so String is a fast HashMap key.

```java
String a = "java";             // pool
String b = "java";             // same pool object
String c = new String("java"); // new heap object
a == b        // true  (same reference)
a == c        // false (different objects)
a.equals(c)   // true  (same content)
c.intern() == a  // true (intern returns the pool copy)
```

> ⚠️ **Trap:** `s.concat("x")` or `s.toUpperCase()` don't change `s`. They return a NEW String. Forgetting to assign the result is a classic bug.

### ITEM string-builder | String vs StringBuilder vs StringBuffer | must
ask: When do you use String, StringBuilder and StringBuffer?
card: String is immutable (every change makes a new object). StringBuilder is mutable and fast, not thread-safe: use it in loops. StringBuffer is the old synchronized version: thread-safe but slower, rarely needed.

> 🧒 **Like you're 5:** String is a printed page: to add a word you reprint the whole page. StringBuilder is a whiteboard: just write more.

```java
// BAD: creates a new String every loop → O(n²) copying
String s = "";
for (int i = 0; i < 10000; i++) s += i;

// GOOD
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 10000; i++) sb.append(i);
String result = sb.toString();
```

| | String | StringBuilder | StringBuffer |
|---|---|---|---|
| Mutable | No | Yes | Yes |
| Thread-safe | Yes (immutable) | No | Yes (synchronized) |
| Speed | Slow for many edits | Fastest | Slower |

> 💡 **Tip:** The compiler already turns `"a" + b + "c"` on one line into efficient code. The problem is `+=` inside loops.

### ITEM equals-final-static | == vs equals, final/finally/finalize, static | must
ask: == vs equals(); final vs finally vs finalize(); static keyword.
card: == compares references (same object?), equals() compares content. final = can't change (variable), can't override (method), can't extend (class). finally = block that always runs after try. finalize() = deprecated GC hook, never use. static = belongs to the class, not to objects.

> 🧒 **Like you're 5:** Two kids with the same toy car model: `equals` says "same toy" (content). `==` asks "is it literally the same car in your hand?".

#### `==` vs `equals()`
```java
Integer a = 127, b = 127;   a == b  // true  (Integer cache −128..127)
Integer x = 128, y = 128;   x == y  // false (different objects!)
x.equals(y)                         // true
```
> ⚠️ **Trap:** Always compare wrapper objects and Strings with `.equals()`. The Integer cache makes `==` "work" for small numbers and then fail in production with bigger IDs.

#### final vs finally vs finalize
| Word | What it is |
|---|---|
| `final` | Keyword. Variable can't be reassigned, method can't be overridden, class can't be extended |
| `finally` | Block after try/catch that **always** runs (close resources, release locks) |
| `finalize()` | Old method the GC might call before freeing an object. Deprecated since Java 9: unpredictable. Use try-with-resources or `Cleaner` |

> ⚠️ **Trap:** `final List<String> list = new ArrayList<>(); list.add("x");` is allowed. `final` locks the **reference**, not the object's contents.

#### static
- `static` field: one copy shared by all objects (like a counter).
- `static` method: call without an object, `Math.max()`. Can't use `this`.
- `static` block: runs once when the class loads.
- `static` nested class: doesn't need an outer object.

### ITEM pass-by-value | Is Java pass-by-value or pass-by-reference? | must
ask: Is Java pass by value or pass by reference? Explain with an example.
card: Java is ALWAYS pass-by-value. For objects, the value copied is the reference (the address), so a method can change the object's fields but cannot make the caller's variable point to a new object.

> 🧒 **Like you're 5:** I give you a photocopy of my house address. You can go to my house and paint the walls (change the object). But if you scribble a new address on your copy, my copy still has the old one.

```java
static void change(StringBuilder sb, int n) {
    sb.append(" world");       // changes the SAME object → caller sees it
    sb = new StringBuilder();  // only changes the local copy of the address
    n = 99;                    // only the local copy
}
StringBuilder s = new StringBuilder("hello");
int num = 1;
change(s, num);
System.out.println(s + " " + num);   // "hello world 1"
```

> 🎯 **Say this in the interview:** "Java is strictly pass-by-value. For objects, the value is a copy of the reference, which is why mutating the object is visible but reassigning the parameter isn't."

### ITEM exceptions | Checked vs unchecked exceptions, custom exceptions, try-with-resources | must
ask: Checked vs unchecked exceptions; custom exception design; try-with-resources.
card: Checked (Exception, not Runtime) must be caught or declared: recoverable problems like IOException. Unchecked (RuntimeException) = programming bugs or business rule failures, no forced handling. Custom exceptions: extend RuntimeException, add context, map to HTTP codes in @ControllerAdvice. try-with-resources auto-closes AutoCloseable things.

> 🧒 **Like you're 5:** A checked exception is a "Beware of dog" sign: the law says you must plan for it. An unchecked exception is tripping over your own shoelace: nobody forces you to plan, you just shouldn't do it.

```diagram
Throwable
├── Error                 (JVM trouble: OutOfMemoryError, StackOverflowError) → don't catch
└── Exception             (checked: IOException, SQLException)
    └── RuntimeException  (unchecked: NullPointerException, IllegalArgumentException)
```

#### Custom exception, the Spring way
```java
public class OrderNotFoundException extends RuntimeException {
    private final long orderId;
    public OrderNotFoundException(long orderId) {
        super("Order " + orderId + " not found");
        this.orderId = orderId;
    }
    public long getOrderId() { return orderId; }
}
// thrown in the service, turned into a 404 by @RestControllerAdvice
```

#### try-with-resources
```java
try (Connection con = dataSource.getConnection();
     PreparedStatement ps = con.prepareStatement(sql)) {
    // use them
} // both closed automatically, in reverse order, even if an exception is thrown
```

> ⚠️ **Trap:** Never `catch (Exception e) {}` and swallow it. Log it with the stack trace or rethrow. Also: Spring's `@Transactional` only rolls back on **unchecked** exceptions by default.

> 🎯 **Say this in the interview:** "I use unchecked custom exceptions for business errors, keep them meaningful (OrderNotFound, InsufficientBalance), and translate them once in a global handler. Checked exceptions I wrap at the boundary."

### ITEM copy-clone | Shallow vs deep copy, cloning, serialization | good
ask: Shallow copy vs deep copy; cloning; serialization basics.
card: Shallow copy copies the object but shares the inner objects. Deep copy copies everything inside too. clone() is awkward (Cloneable, shallow by default); prefer copy constructors. Serialization turns an object into bytes (Serializable, serialVersionUID, transient skips fields); in real backends we use JSON (Jackson) instead.

> 🧒 **Like you're 5:** Shallow copy is photocopying a page that says "the toy is in box 5": both copies point to the same box. Deep copy also builds a second box with a second toy.

```java
class Team {
    List<String> members;
    Team(Team other) {                         // copy constructor
        this.members = new ArrayList<>(other.members);   // deep-ish copy of the list
    }
}
```

- `clone()` needs `implements Cloneable`, is shallow by default, and skips constructors. Joshua Bloch (Effective Java) says avoid it.
- **Serialization**: `implements Serializable`. Mark secrets/caches `transient` so they're skipped. Declare `private static final long serialVersionUID = 1L;` so old bytes still read after you change the class.

> ⚠️ **Trap:** Java native deserialization of untrusted data is a famous security hole (remote code execution). Use JSON for APIs and messages.

## MODULE jvm | JVM, memory & garbage collection

### ITEM jvm-memory | JVM memory areas, heap vs stack, metaspace, class loading | must
ask: JVM memory areas; heap vs stack; metaspace; class loading process.
card: Stack = per-thread, holds method frames and local variables, fast, auto-cleaned. Heap = shared, holds all objects, cleaned by GC (young + old gen). Metaspace = class metadata in native memory (replaced PermGen in Java 8). Class loading: Bootstrap → Platform → Application loaders, parent-first delegation, then link (verify, prepare, resolve) and initialize.

> 🧒 **Like you're 5:** The stack is your school desk: you put books on it while doing homework and clear it when done. The heap is the big classroom cupboard everyone shares; a cleaner (GC) throws away things nobody uses.

```diagram
JVM
├── Heap (shared)            → objects: new Order(), arrays
│   ├── Young gen: Eden + Survivor S0/S1  (new objects, cleaned often)
│   └── Old gen                           (objects that survived many GCs)
├── Metaspace (native mem)   → class info, method code
├── Per thread:
│   ├── Stack                → frames: local vars, references, return address
│   ├── PC register          → which instruction is running
│   └── Native method stack
└── Code cache               → JIT-compiled machine code
```

```java
void handle() {
    int count = 5;                  // count lives on the STACK
    Order o = new Order();          // reference 'o' on the stack, the Order object on the HEAP
}
```

| | Stack | Heap |
|---|---|---|
| Who | One per thread | Shared by all threads |
| Holds | Primitives, references, frames | Objects |
| Error | `StackOverflowError` (deep recursion) | `OutOfMemoryError: Java heap space` |
| Cleanup | Automatic when method returns | Garbage collector |

**Class loading** in 3 steps: **Load** (find the .class, parent-first: Bootstrap → Platform → App), **Link** (verify bytecode, give static fields default values, resolve references), **Initialize** (run static blocks, set static values). Parent-first means your own `java.lang.String` can never replace the real one.

### ITEM jit-gc | JIT compiler, garbage collection, G1 vs ZGC | good
ask: JIT compiler; garbage collection; G1 vs ZGC basics.
card: JIT compiles hot bytecode into fast machine code at runtime (C1 quick, C2 optimized). GC frees unreachable objects: mark reachable from GC roots, sweep/compact the rest; most objects die young, so the heap is split by age. G1 (default) splits heap into regions and targets a pause goal (~200ms). ZGC does almost everything concurrently: sub-millisecond pauses even on huge heaps.

> 🧒 **Like you're 5:** JIT is a translator who notices you say the same sentence 1000 times and memorises the translation so it's instant next time. GC is the cleaner who checks which toys are still tied by a string to a kid (GC roots); untied toys go in the bin.

#### How GC decides what's garbage
Start from **GC roots** (local variables on stacks, static fields, active threads). Everything reachable is alive. Everything else is garbage. That's why a forgotten entry in a `static Map` is a memory leak: it's reachable forever.

| Collector | Idea | Pick it when |
|---|---|---|
| Serial | One thread, stop the world | Tiny apps, containers with 1 CPU |
| Parallel | Many threads, stop the world | Batch jobs: throughput over latency |
| **G1** (default since 9) | Heap in regions, collect the garbage-heaviest first, pause target | Most web services |
| **ZGC** (Java 15+, generational in 21) | Concurrent marking and moving, pauses < 1 ms | Low-latency APIs, big heaps |

```bash
java -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -Xms2g -Xmx2g -jar app.jar
java -XX:+UseZGC -XX:+ZGenerational -jar app.jar     # Java 21
```

> 🎯 **Say this in the interview:** "Most objects die young, so generational GC cleans the young gen often and cheaply. G1 is the sensible default; for p99 latency-sensitive services on big heaps I'd test ZGC. And I set -Xms equal to -Xmx in containers."

### ITEM jvm-debug | Investigating memory leaks, high CPU, high GC, OutOfMemoryError | must
ask: How do you investigate memory leak, high CPU, high GC or OutOfMemoryError?
card: Measure first: metrics (heap, GC pause, CPU) in Grafana/CloudWatch. High CPU → thread dumps (jstack / jcmd Thread.print) a few seconds apart, find hot RUNNABLE threads. Memory leak/OOM → heap dump (-XX:+HeapDumpOnOutOfMemoryError or jcmd GC.heap_dump), open in Eclipse MAT, check dominator tree for who holds memory. High GC → GC logs (-Xlog:gc*), check allocation rate and heap size.

> 🧒 **Like you're 5:** Like a doctor: check temperature first (metrics), then take an X-ray (thread dump) or a full body scan (heap dump), then find the exact problem before giving medicine.

#### Playbook

| Symptom | First tool | What you look for |
|---|---|---|
| CPU at 100% | `top -H -p <pid>` + `jstack <pid>` (3 dumps, 5 s apart) | The same thread RUNNABLE in the same method: infinite loop, regex, huge JSON |
| Heap keeps growing, OOM | `jcmd <pid> GC.heap_dump /tmp/h.hprof` → Eclipse MAT | Dominator tree: a giant `HashMap`, a cache with no eviction, `ThreadLocal` never cleared |
| Long GC pauses | GC logs `-Xlog:gc*:file=gc.log` (GCEasy) | High allocation rate, old gen filling up, heap too small |
| App hangs, low CPU | Thread dump | Threads BLOCKED on a lock (deadlock), or WAITING for DB pool connections |
| `Metaspace` OOM | Class histogram | Class loader leak (redeploys, dynamic proxies) |

```bash
jcmd <pid> Thread.print > threads.txt
jcmd <pid> GC.class_histogram | head -20
java -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/dumps -jar app.jar
```

> 🏭 **Real example to tell:** "Heap grew every hour. Heap dump showed a `static ConcurrentHashMap` used as a cache with no TTL, holding user sessions. We replaced it with Caffeine with `expireAfterWrite` and max size. Memory became flat."

> 🎯 **Say this in the interview:** Always tell it as a story: symptom → metric → tool → root cause → fix → how you prevented it (alert, test, limit).
