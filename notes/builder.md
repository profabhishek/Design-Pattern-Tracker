# Builder

**In one line:** Build a big object **step by step** with readable method calls, instead of one huge constructor.

---

## 1. Real-life example

At Subway you build your sandwich step by step: bread → cheese → veggies → sauce → done. You skip what you don't want. That's a builder.

## 2. What problem does it solve?

Imagine a class with many fields, some optional:

```java
new User("Ravi", "ravi@mail.com", null, null, 25, true, false, "IN");
```

What is `null`? What is `true`? Nobody knows. This is called a **telescoping constructor** problem (many constructors with more and more parameters).

With a builder:

```java
User user = User.builder()
        .name("Ravi")
        .email("ravi@mail.com")
        .age(25)
        .country("IN")
        .build();
```

Easy to read, and you only set what you need.

## 3. How does it work?

1. Make a static inner `Builder` class with the same fields.
2. Each setter-like method returns `this` (so you can chain calls).
3. `build()` creates the real object, often checking that required fields exist.
4. The real object has only getters → it is **immutable** (cannot change after creation).

## 4. Plain Java code – HTTP request builder

```java
public final class HttpRequest {
    private final String url;
    private final String method;
    private final Map<String, String> headers;
    private final String body;
    private final int timeoutMs;

    private HttpRequest(Builder b) {
        this.url = b.url;
        this.method = b.method;
        this.headers = Map.copyOf(b.headers);
        this.body = b.body;
        this.timeoutMs = b.timeoutMs;
    }

    public static Builder builder(String url) { return new Builder(url); }

    public String getUrl() { return url; }
    // ... other getters, no setters

    public static class Builder {
        private final String url;                 // required
        private String method = "GET";            // defaults
        private final Map<String, String> headers = new HashMap<>();
        private String body;
        private int timeoutMs = 5000;

        private Builder(String url) { this.url = url; }

        public Builder method(String m)              { this.method = m; return this; }
        public Builder header(String k, String v)    { headers.put(k, v); return this; }
        public Builder body(String b)                { this.body = b; return this; }
        public Builder timeoutMs(int t)              { this.timeoutMs = t; return this; }

        public HttpRequest build() {
            if (url == null || url.isBlank()) throw new IllegalStateException("url is required");
            if (method.equals("GET") && body != null) throw new IllegalStateException("GET cannot have a body");
            return new HttpRequest(this);
        }
    }
}
```

Usage:

```java
HttpRequest req = HttpRequest.builder("https://api.shop.com/orders")
        .method("POST")
        .header("Content-Type", "application/json")
        .body("{\"item\":\"pen\"}")
        .timeoutMs(2000)
        .build();
```

## 5. Spring Boot way – Lombok `@Builder`

In real projects we use **Lombok** so we don't write all that code by hand.

```java
@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class OrderResponse {
    private final Long id;
    private final String status;
    private final double total;
    @Builder.Default
    private final String currency = "INR";
}
```

```java
@GetMapping("/orders/{id}")
public OrderResponse get(@PathVariable Long id) {
    return OrderResponse.builder()
            .id(id)
            .status("SHIPPED")
            .total(499.0)
            .build();
}
```

Builders you already use in Spring:

```java
ResponseEntity.status(HttpStatus.CREATED).header("X-Id", "10").body(order);

WebClient client = WebClient.builder()
        .baseUrl("https://api.example.com")
        .defaultHeader("Accept", "application/json")
        .build();

UriComponentsBuilder.fromPath("/orders").queryParam("page", 1).build();
```

## 6. When to use / when NOT to use

| Use it when | Avoid it when |
|---|---|
| Many fields, many are optional | Only 2–3 required fields (a constructor is fine) |
| You want immutable objects | The object is a simple JPA entity that frameworks fill via setters |
| You need validation before creation | |

## 7. Points to explain in an interview

- **Builder vs telescoping constructors:** builder is readable, no wrong order of arguments, no `null` placeholders.
- **Immutability:** fields are `final`, no setters → thread-safe and safe to share.
- `build()` is the right place to **validate**.
- Builder vs Factory: Factory picks *which* object; Builder controls *how* one object is assembled.

## 8. Quick revision

- Chain methods, call `build()` at the end.
- Great for many optional fields.
- In Spring Boot: Lombok `@Builder`, `ResponseEntity`, `WebClient.builder()`.
