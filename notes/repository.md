# Repository

**In one line:** Hide all database code behind a simple interface that feels like a **collection of objects** – `save`, `findById`, `findAll`, `delete`.

---

## 1. Real-life example

A **library desk**. You ask "give me the book with ID 42". You don't care whether the book is on shelf 3, in the store room, or in another branch. The librarian (repository) finds it.

## 2. What problem does it solve?

If SQL is written inside your service classes:
- Business logic and database logic get mixed.
- Changing the database (MySQL → MongoDB) means changing services.
- Testing services needs a real database.

The repository keeps the service clean: the service says *what* it wants; the repository knows *how* to get it.

## 3. Build task – in-memory version AND database version

### The interface (the contract)

```java
public interface UserRepository {
    User save(User user);
    Optional<User> findById(Long id);
    Optional<User> findByEmail(String email);
    List<User> findAll();
    void deleteById(Long id);
}
```

### Version 1: In-memory (great for tests and demos)

```java
public class InMemoryUserRepository implements UserRepository {
    private final Map<Long, User> store = new ConcurrentHashMap<>();
    private final AtomicLong ids = new AtomicLong();

    public User save(User u) {
        if (u.getId() == null) u.setId(ids.incrementAndGet());
        store.put(u.getId(), u);
        return u;
    }
    public Optional<User> findById(Long id) { return Optional.ofNullable(store.get(id)); }
    public Optional<User> findByEmail(String email) {
        return store.values().stream().filter(u -> u.getEmail().equals(email)).findFirst();
    }
    public List<User> findAll() { return new ArrayList<>(store.values()); }
    public void deleteById(Long id) { store.remove(id); }
}
```

### Version 2: Database with Spring Data JPA

```java
@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    @Column(unique = true)
    private String email;
}
```

```java
public interface JpaUserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);          // Spring writes the SQL from the method name!
    List<User> findByNameContainingIgnoreCase(String part);

    @Query("select u from User u where u.email like %:domain")
    List<User> findByEmailDomain(@Param("domain") String domain);
}
```

You don't write any implementation – Spring Data creates it at startup.

### The service only sees the repository

```java
@Service
@RequiredArgsConstructor
public class UserService {
    private final JpaUserRepository repo;

    public User register(String name, String email) {
        repo.findByEmail(email).ifPresent(u -> {
            throw new IllegalStateException("Email already used");
        });
        User u = new User();
        u.setName(name);
        u.setEmail(email);
        return repo.save(u);
    }
}
```

`application.properties` (H2 in-memory DB for practice):

```properties
spring.datasource.url=jdbc:h2:mem:shop
spring.jpa.hibernate.ddl-auto=update
spring.h2.console.enabled=true
```

## 4. Repository vs DAO

| Repository | DAO (Data Access Object) |
|---|---|
| Thinks in **domain objects** ("collection of Users") | Thinks in **tables/rows** ("user table operations") |
| Part of the domain layer (DDD idea) | Part of the persistence layer |
| Methods like `findActiveCustomers()` | Methods like `insertUser()`, `updateUserRow()` |

In practice the two words are often used for the same thing. Spring's `@Repository` also turns database exceptions into Spring's `DataAccessException`.

## 5. Leaky abstractions (trade-off)

A repository *pretends* to be a simple collection, but the database leaks through:
- **N+1 query problem:** loading 100 orders, then each order's items one by one = 101 queries. Fix with `@EntityGraph` or `join fetch`.
- **Lazy loading errors:** `LazyInitializationException` when you touch a relation after the transaction ends.
- **Performance:** `findAll()` on a table with 10 million rows will kill memory – use paging: `findAll(PageRequest.of(0, 20))`.

So you still need to know what SQL runs. Turn on `spring.jpa.show-sql=true` while learning.

## 6. When to use / when NOT to use

| Use it when | Avoid it when |
|---|---|
| Almost every app with a database | Very complex reporting queries – use plain SQL / `JdbcTemplate` / a separate read model |

## 7. Quick revision

- Repository = collection-like interface for data.
- Spring Data JPA generates it from method names.
- Know the leaks: N+1, lazy loading, big `findAll`.
