# TRACK java-versions
title: Java 8 → 21 Features
icon: 🚀
color: #a855f7
tier: good
about: What each LTS release added and which features you actually use in production. Records, switch, sealed, virtual threads.

## MODULE versions | Java versions

### ITEM jv-8 | Java 8: lambdas, functional interfaces, default methods, Optional, Streams, Date-Time | must
ask: What did Java 8 introduce? Explain lambdas, functional interfaces, default/static methods, Optional, Streams and the Date-Time API.
card: Lambdas = short anonymous functions. Functional interface = exactly one abstract method (Function, Predicate, Supplier, Consumer, Runnable); @FunctionalInterface checks it. Default methods let interfaces evolve without breaking implementations. Optional = a box that may be empty (for return types). Streams = declarative collection processing. java.time (LocalDate, Instant, ZonedDateTime, Duration) = immutable, thread-safe dates replacing Date/Calendar.

> 🧒 **Like you're 5:** Java 8 was the "magic wand" release: instead of writing a whole class to say "sort by name", you just wave `(a, b) -> a.name().compareTo(b.name())`.

| Interface | Shape | Example |
|---|---|---|
| `Function<T,R>` | T → R | `String::length` |
| `Predicate<T>` | T → boolean | `s -> s.isEmpty()` |
| `Supplier<T>` | () → T | `ArrayList::new` |
| `Consumer<T>` | T → void | `System.out::println` |
| `BiFunction<T,U,R>` | (T,U) → R | `Math::max` |

```java
Optional<User> u = repo.findByEmail(email);
String city = u.map(User::address).map(Address::city).orElse("Unknown");
u.orElseThrow(() -> new UserNotFoundException(email));

LocalDate due = LocalDate.now().plusDays(30);
Instant now = Instant.now();                               // store timestamps in UTC
Duration d = Duration.between(start, Instant.now());
```

> ⚠️ **Trap:** Don't use `Optional` for fields, method parameters or collections, and never call `.get()` without checking. It's meant as a return type.

### ITEM jv-9-11 | Java 9–11: modules, JShell, factory methods, var, HttpClient, String methods | good
ask: What came in Java 9, 10 and 11? Modules, JShell, List.of, var and its limits, HttpClient, new String methods.
card: Java 9: module system (module-info.java), JShell REPL, List.of/Set.of/Map.of immutable factories, private interface methods. Java 10: var for local variables (type inferred, still static typing; not for fields, params, or without an initializer). Java 11 (LTS): standard HttpClient (sync + async, HTTP/2), String isBlank/strip/lines/repeat, Files.readString, run a single file with java Hello.java.

> 🧒 **Like you're 5:** `var` is like saying "pass me *that*" while pointing at a cup. Java still knows it's a cup; you just didn't have to say "cup".

```java
var orders = new HashMap<String, List<Order>>();   // type is still HashMap<String, List<Order>>
// var x;            ❌ needs an initializer
// var y = null;     ❌ can't infer
// private var z;    ❌ not for fields

HttpClient client = HttpClient.newHttpClient();
HttpResponse<String> res = client.send(
    HttpRequest.newBuilder(URI.create("https://api.example.com/users/1")).build(),
    HttpResponse.BodyHandlers.ofString());

"  hi  ".strip();  "".isBlank();  "ab".repeat(3);  "a\nb".lines().count();
```

> 💡 **Tip:** `List.of` is immutable and throws on nulls. `.toList()` on a stream (Java 16) also returns an unmodifiable list.

### ITEM jv-14-17 | Java 14–17: switch expressions, text blocks, records, pattern matching, sealed classes | must
ask: Explain switch expressions, text blocks, records, pattern matching for instanceof and sealed classes (Java 14–17).
card: Switch expressions (14): arrow cases, no fall-through, return a value, yield for blocks. Text blocks (15): """ multi-line strings for JSON/SQL. Records (16): immutable data carriers with auto constructor, accessors, equals/hashCode/toString. Pattern matching instanceof (16): if (o instanceof String s). Sealed classes (17, LTS): restrict which classes can extend a type (permits), enabling exhaustive switches.

> 🧒 **Like you're 5:** A record is a sealed envelope: you write the details once and nobody can change them. A sealed class is a club with a fixed guest list: only these named kids may join.

```java
record OrderDto(long id, String status, BigDecimal total) {}       // done. That's the whole class.

String label = switch (status) {
    case "NEW", "PENDING" -> "Waiting";
    case "PAID" -> "Paid";
    default -> { log.warn("odd status"); yield "Unknown"; }
};

String sql = """
    SELECT id, total
    FROM orders
    WHERE status = 'PAID'
    """;

if (event instanceof PaymentFailed pf && pf.retryable()) retry(pf);

sealed interface Payment permits Card, Upi, Wallet {}
record Card(String last4) implements Payment {}
record Upi(String vpa) implements Payment {}
record Wallet(String id) implements Payment {}
```

> 🏭 **In Spring Boot 3:** records are perfect for request/response DTOs and `@ConfigurationProperties`. Not for JPA entities (entities need a no-arg constructor and mutability).

### ITEM jv-21 | Java 21: virtual threads, record patterns, pattern matching for switch, sequenced collections | must
ask: What's new in Java 21 (LTS)? Virtual threads, record patterns, pattern matching for switch, sequenced collections.
card: Virtual threads (final): cheap JVM-managed threads for blocking IO. Pattern matching for switch: switch on types with case Type t, guards with when, null case, exhaustive over sealed types. Record patterns: deconstruct records in instanceof/switch: case Point(int x, int y). Sequenced collections: getFirst(), getLast(), addFirst(), reversed() on List, Deque, LinkedHashSet, LinkedHashMap. Also generational ZGC.

> 🧒 **Like you're 5:** Pattern matching switch is a sorting machine for a toy box: "if it's a car with red paint do this, if it's a doll do that", and Java checks you didn't forget any kind of toy.

```java
double fee(Payment p) {
    return switch (p) {                              // exhaustive: sealed interface, no default needed
        case Card c when c.last4().startsWith("4") -> 1.5;
        case Card c   -> 2.0;
        case Upi u    -> 0.0;
        case Wallet w -> 1.0;
    };
}

if (obj instanceof Point(int x, int y) && x == y) System.out.println("on the diagonal");

List<String> steps = new ArrayList<>(List.of("a", "b", "c"));
steps.getFirst();  steps.getLast();  steps.reversed();     // no more list.get(list.size() - 1)
```

> 🧪 **Try it:** open the Java playground, load "Hello Java 21", and change the switch.

### ITEM jv-prod | Which Java 17/21 features have you used in production? | must
ask: Which Java 17/21 features have you used in production? What problem did they solve?
card: Have 2–3 concrete stories: records for DTOs/events (removed Lombok boilerplate, immutable), switch expressions/pattern matching for status or event handling (no missed cases), text blocks for SQL/JSON in tests, virtual threads for an IO-heavy service (higher throughput without reactive code), Java 17 upgrade from 8/11 for Spring Boot 3 (needs Java 17+).

> 🧒 **Like you're 5:** The interviewer doesn't want a list of features. They want "I had a problem, this feature fixed it, here's the result".

#### Story templates (fill in your own project)
1. **Records:** "Our API had ~40 DTO classes with getters/setters/equals. We moved them to records: less code, immutable, and fewer bugs from accidentally mutated objects."
2. **Sealed + pattern switch:** "Payment events had 5 types. A sealed interface + switch made the compiler fail the build when someone added a 6th type and forgot to handle it."
3. **Virtual threads:** "An aggregator service calling 4 downstream APIs per request was limited by Tomcat's 200 threads. Turning on virtual threads (Spring Boot 3.2) let it handle far more concurrent requests; the DB pool became the next limit, so we added a Semaphore."
4. **Upgrade story:** "Moved from Java 11 to 17 for Spring Boot 3: javax → jakarta packages, updated libraries, fixed reflective access warnings, ran tests and a canary."

> ⚠️ **Trap:** Never claim something you can't explain deeply. If you only used records, say so and explain them really well.
