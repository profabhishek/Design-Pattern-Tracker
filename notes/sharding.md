# Sharding

**In one line:** When one database gets too big, **split the data into pieces (shards)** and keep each piece on a different server.

---

## 1. Real-life example

A **school with 3000 students** keeps attendance registers by section: A–F names in register 1, G–M in register 2, and so on. Each teacher handles one register. Faster than one giant register.

## 2. What problem does it solve?

One database server has limits: disk, CPU, memory, writes per second. Read replicas help with **reads**, but all **writes** still go to one primary. Sharding spreads **both data and writes** across many servers.

Words:
- **Shard** = one piece of the data (one DB server/cluster).
- **Shard key** = the column used to decide which shard a row goes to.

## 3. Ways to split

| Method | How | Good | Bad |
|---|---|---|---|
| **Hash sharding** | `shard = hash(customerId) % N` | Even spread | Range queries hit all shards; changing N moves most data |
| **Range sharding** | ids 1–1M → shard 1, 1M–2M → shard 2 (or by date) | Range queries easy | **Hot shard** – newest range gets all the writes |
| **Directory / lookup** | A table says "customer 42 → shard 3" | Very flexible | Lookup table is extra work and must be highly available |
| **Geo sharding** | India users → shard IN, EU → shard EU | Low latency, data laws | Uneven sizes |

## 4. Build task – pick a shard key for an `orders` table

Common queries:
1. "Show my orders" → `where customer_id = ?` (very common)
2. "Get order by id" → `where order_id = ?`
3. "Daily sales report" → across all orders (rare, analytics)

| Shard key | Result |
|---|---|
| `order_id` (hash) | Even spread, but "my orders" must ask **all** shards ❌ |
| `created_at` (range) | Today's shard gets all the writes → **hot shard** ❌ |
| **`customer_id` (hash)** ✅ | All orders of a customer on one shard → "my orders" hits one shard. Even spread because many customers. |

To make "get order by id" fast too: put the shard number inside the order id (e.g. `orderId = shardId + sequence`), or keep a small lookup.
For reports: copy data to a data warehouse instead of querying all shards.

## 5. Spring Boot – simple application-level sharding

```java
public class ShardContext {
    private static final ThreadLocal<Integer> CURRENT = new ThreadLocal<>();
    public static void set(int shard) { CURRENT.set(shard); }
    public static Integer get() { return CURRENT.get(); }
    public static void clear() { CURRENT.remove(); }
}

public class ShardRoutingDataSource extends AbstractRoutingDataSource {
    @Override
    protected Object determineCurrentLookupKey() {
        return ShardContext.get();             // which DataSource to use
    }
}
```

```java
@Configuration
public class ShardConfig {

    @Bean
    public DataSource dataSource() {
        Map<Object, Object> shards = new HashMap<>();
        shards.put(0, build("jdbc:postgresql://db0/orders"));
        shards.put(1, build("jdbc:postgresql://db1/orders"));
        shards.put(2, build("jdbc:postgresql://db2/orders"));

        ShardRoutingDataSource ds = new ShardRoutingDataSource();
        ds.setTargetDataSources(shards);
        ds.setDefaultTargetDataSource(shards.get(0));
        ds.afterPropertiesSet();
        return ds;
    }

    private DataSource build(String url) {
        HikariDataSource h = new HikariDataSource();
        h.setJdbcUrl(url);
        h.setUsername("app");
        h.setPassword(System.getenv("DB_PASSWORD"));
        return h;
    }
}
```

```java
@Service
@RequiredArgsConstructor
public class OrderShardService {
    private static final int SHARDS = 3;
    private final OrderRepository repo;
    private final TransactionTemplate tx;

    private int shardFor(long customerId) {
        return (int) Math.floorMod(Long.hashCode(customerId), SHARDS);
    }

    public List<Order> ordersOf(long customerId) {
        ShardContext.set(shardFor(customerId));      // must be set BEFORE the transaction starts
        try {
            return tx.execute(s -> repo.findByCustomerId(customerId));
        } finally {
            ShardContext.clear();
        }
    }
}
```

In real projects, use tools like **Apache ShardingSphere**, **Vitess** (MySQL), **Citus** (Postgres), or databases that shard by themselves (**MongoDB**, **Cassandra**, **DynamoDB**, CockroachDB).

## 6. Problems to know (trade-offs)

- **Hot shards:** one shard gets much more traffic (a celebrity user, today's date range). Fix: better key, add randomness ("salting"), split the hot shard.
- **Resharding:** adding shard #4 with `hash % N` means almost **all** keys move. Use **consistent hashing** or many **virtual shards** (e.g. 256 logical shards mapped to 4 servers; later just move some logical shards).
- **Cross-shard queries:** joins, `count(*)`, sorting across shards are slow (scatter-gather). Design so most queries hit one shard.
- **Cross-shard transactions:** no simple `@Transactional` across shards → use Saga/2PC.
- Unique ids across shards: use UUID/ Snowflake ids, not auto-increment.

## 7. When to use / when NOT

Do sharding **late**. First try: indexes, caching, read replicas, bigger machine, archiving old data. Shard only when one primary truly can't handle the writes/data.

## 8. Quick revision

- Split data across servers by a shard key.
- Pick a key that matches your main query and spreads evenly.
- Watch out: hot shards, resharding, cross-shard queries.
