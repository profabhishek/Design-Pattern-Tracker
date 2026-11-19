# Java & Spring Boot in plain English

**In one line:** Everything you need to *read* the code in these notes, even if you have never written Java before.

---

## 1. Real-life example

Think of **Java** as a language, like English. **Spring Boot** is a fully equipped kitchen built for that language: the stove, fridge and gas connection are already there, so you can start cooking (writing your app) straight away instead of building the kitchen first.

You don't need to know every word of Java to follow these notes. You only need to recognise about ten ideas. They are all on this page.

## 2. Class and object: a blueprint and a house

A **class** is a blueprint. An **object** is a real thing built from that blueprint. One blueprint, many houses.

```java
public class User {                 // the blueprint
    private String name;            // a field: data each User has
    private int age;

    public User(String name, int age) {   // constructor: how to build a User
        this.name = name;
        this.age = age;
    }

    public String greet() {         // a method: something a User can do
        return "Hi, I am " + name;
    }
}

User ravi = new User("Ravi", 25);   // build one object from the blueprint
ravi.greet();                       // "Hi, I am Ravi"
```

- `private` = hidden inside the class. `public` = anyone can use it.
- `String` is text, `int` is a whole number, `double` is a decimal number, `boolean` is true/false.
- `return` hands a value back to whoever called the method. `void` means the method gives nothing back.

## 3. Interface: a contract (a plug socket)

An **interface** lists what something must be able to do, without saying how. Any class that `implements` it must fill in the details. Like a plug socket: any charger with the right plug shape fits.

```java
public interface PaymentGateway {          // the contract
    String pay(double amount);
}

public class UpiGateway implements PaymentGateway {    // one way to keep the contract
    public String pay(double amount) { return "Paid by UPI"; }
}

public class CardGateway implements PaymentGateway {   // another way
    public String pay(double amount) { return "Paid by card"; }
}
```

Code that only knows `PaymentGateway` works with **both**. Almost every pattern in these notes uses this idea.

## 4. Annotations: sticky notes for Spring

Words that start with `@` are **annotations**. They don't run any logic themselves. They are **sticky notes** that tell Spring (or another tool) what to do with the class or method.

```java
@Service                                 // "Spring, please create and manage this class"
public class OrderService {

    @Transactional                       // "Spring, run this inside a database transaction"
    public void placeOrder(Order o) { ... }
}
```

Every annotation in the notes has a dotted underline the first time it appears in a code block. **Tap or hover it** to see what it means.

## 5. Beans and the Spring container

When Spring starts, it looks for classes with `@Component`, `@Service`, `@Repository`, `@RestController` or `@Bean` methods. It creates **one object of each** and keeps them in a big box called the **container** (`ApplicationContext`). These managed objects are called **beans**.

When a bean needs another bean, Spring passes it in through the constructor. This is called **Dependency Injection**.

```java
@Service
public class OrderService {
    private final OrderRepository repo;          // what this class needs

    public OrderService(OrderRepository repo) {  // Spring hands it over automatically
        this.repo = repo;
    }
}
```

`final` means the field is set once and never changes. You will see this pattern in almost every Spring example.

## 6. How a request travels through a Spring Boot app

```diagram
caption: The journey of one request
flow: [Browser / App | sends GET /orders/5]{muted} -> [Controller | reads the request]{accent} -> [Service | business rules] -> [Repository | talks to the DB] -> [Database | stores the rows]{db}
note: The answer travels back the same way, and Spring turns the Java object into JSON for the browser.
```

```java
@RestController                                  // 1. receives the web request
@RequestMapping("/orders")
public class OrderController {
    private final OrderService service;
    public OrderController(OrderService service) { this.service = service; }

    @GetMapping("/{id}")                         // GET /orders/5
    public Order get(@PathVariable Long id) {    // id = 5, taken from the URL
        return service.find(id);                 // Spring turns the Order into JSON
    }
}

@Service                                         // 2. business rules
public class OrderService {
    private final OrderRepository repo;
    public OrderService(OrderRepository repo) { this.repo = repo; }

    public Order find(Long id) {
        return repo.findById(id).orElseThrow();  // "give me the order, or fail if missing"
    }
}

public interface OrderRepository extends JpaRepository<Order, Long> { }   // 3. Spring writes the SQL
```

## 7. Generics: a box with a label

`List<User>` means "a list that holds `User` objects". The part in `< >` is the **label on the box**: it says what is allowed inside.

```java
List<String> names = List.of("Ravi", "Priya");      // a list of texts
Map<String, Integer> stock = new HashMap<>();       // a lookup table: text → number
stock.put("pen", 10);
stock.get("pen");                                    // 10
Optional<User> maybeUser = repo.findById(7L);        // a box that may be empty
```

- `List` = ordered items. `Map` = key → value lookup. `Optional` = "maybe a value, maybe nothing".
- `7L` just means "the number 7, as a long".

## 8. Lambdas and method references: tiny inline functions

An arrow `->` makes a small function on the spot. Read `x -> x * 2` as "take x, give back x times 2".

```java
names.forEach(n -> System.out.println(n));          // for each name n, print it
names.forEach(System.out::println);                 // the same thing, shorter (method reference)

products.sort(Comparator.comparing(Product::getPrice));   // sort by price

List<String> vip = users.stream()                   // start a pipeline
        .filter(u -> u.getAge() > 18)               // keep only adults
        .map(User::getName)                         // turn each User into its name
        .toList();                                  // collect into a new list
```

`Product::getPrice` means "call getPrice on each product". `() -> doSomething()` is a function that takes nothing.

## 9. A few more words you will meet

```java
public record Point(int x, int y) { }               // a small data class, values can't change

public enum Status { CREATED, PAID, SHIPPED }       // a fixed list of allowed values

private static final int MAX = 3;                   // one shared constant for the whole class

try {
    risky();                                        // try this...
} catch (Exception e) {
    handle(e);                                      // ...and if it fails, do this
} finally {
    cleanUp();                                      // always runs at the end
}

throw new IllegalStateException("Not allowed");    // raise an error on purpose
```

## 10. Config files: application.properties and YAML

Settings live outside the code, so you can change behaviour without changing Java. Both files below mean the same thing.

```properties
server.port=8080
shop.discount=FESTIVAL
```

```yaml
server:
  port: 8080
shop:
  discount: FESTIVAL
```

The code reads them with `@Value("${shop.discount}")`, or a library reads them by name (like the Resilience4j settings in the resilience topics).

## 11. How to read any code block in these notes

- **Read the comments first.** Every important line has a plain-English comment after `//`.
- **Find the interface.** It tells you *what* the thing does. The classes tell you *how*.
- **Look at the annotations.** They tell you what Spring adds on top. Tap any you don't know.
- **Skip `import` lines and getters.** They are just plumbing.
- **Then type it out yourself** in a small project from start.spring.io. Typing teaches more than reading.

## 12. Quick revision

- Class = blueprint, object = thing built from it, interface = contract.
- `@Annotations` are sticky notes telling Spring what to do.
- Spring creates beans and injects them through constructors.
- Request flow: Controller → Service → Repository → Database.
- `List<User>` is a labelled box, `x -> ...` is a tiny function, `Optional` may be empty.
