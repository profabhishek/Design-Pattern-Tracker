# TRACK kafka-redis
title: Kafka, Redis & Production
icon: ⚡
color: #eab308
tier: must
about: Kafka partitions, consumer groups, delivery semantics, DLQs, Redis caching patterns and the production firefighting questions.

## MODULE kafka | Kafka

### ITEM kf-basics | Topics, partitions, offsets, brokers, replication and ISR | must
ask: Explain Kafka topics, partitions, offsets, brokers, replication and ISR.
card: Topic = a named log of events. Partition = an ordered, append-only slice of a topic; the unit of parallelism and ordering. Offset = position of a message in a partition. Broker = a Kafka server; partitions are spread across brokers. Replication factor (e.g. 3) = copies of each partition: one leader takes reads/writes, followers copy. ISR (in-sync replicas) = followers caught up with the leader; with acks=all and min.insync.replicas=2 a write is acknowledged only when enough ISR have it.

> 🧒 **Like you're 5:** A topic is a notebook. Partitions are separate pages, and each page is written top to bottom (offsets are line numbers). Brokers are the shelves holding pages, and each page has photocopies on other shelves in case one shelf falls.

```diagram
topic "orders" (3 partitions, RF=3)
P0: [0][1][2][3][4]→   leader broker 1, followers 2,3
P1: [0][1][2]→         leader broker 2
P2: [0][1][2][3]→      leader broker 3
key "user-42" → hash → always P1  (so that user's events stay in order)
```

> 🎯 **Say this in the interview:** "Kafka only guarantees order within a partition, so I pick the key (orderId/userId) that needs ordering. Partition count sets max consumer parallelism."

### ITEM kf-consumer-groups | Consumer groups, partition assignment, rebalancing, ordering | must
ask: Consumer groups; partition assignment; rebalancing; ordering guarantees.
card: Consumers with the same group.id share a topic: each partition is read by exactly ONE consumer in the group (extra consumers sit idle). Different groups each get all messages (pub/sub). Rebalancing reassigns partitions when consumers join/leave/crash or exceed max.poll.interval.ms; during it consumption pauses. Cooperative sticky assignor and static membership reduce rebalance pain. Ordering is per partition, so same key → same partition → in order.

> 🧒 **Like you're 5:** A group of friends shares the pages of a comic: each page goes to only one friend. If a friend leaves, their pages get handed to someone else (rebalance). Another group of friends reads their own full copy.

> ⚠️ **Trap:** Slow processing (longer than `max.poll.interval.ms`, default 5 min) makes Kafka think the consumer died → rebalance → the same messages get processed again → duplicates. Process faster, lower `max.poll.records`, or move heavy work off the poll thread.

### ITEM kf-semantics | Delivery semantics, idempotent producer, transactions and exactly-once caveats | must
ask: Kafka delivery semantics; idempotent producer; transactions and exactly-once caveats.
card: Producer: acks=0 (fire and forget), 1 (leader only), all (all ISR: safest). enable.idempotence=true (default in 3.x) gives each producer a PID + sequence numbers so broker retries don't create duplicates. Transactions let a producer write to several partitions + commit consumer offsets atomically (read-process-write exactly-once within Kafka). Caveat: once you call an external system (DB, REST, email), exactly-once is gone; you need idempotent consumers or the outbox pattern.
patterns: idempotency, outbox

> 🧒 **Like you're 5:** The idempotent producer numbers every letter it sends. If the postman isn't sure a letter arrived and sends it again, the post office sees "letter #57 again" and ignores the copy.

```properties
acks=all
enable.idempotence=true
min.insync.replicas=2          # topic/broker setting
retries=2147483647
delivery.timeout.ms=120000
```

### ITEM kf-dlq | Retry topic vs DLQ, poison messages, offset commit strategies | must
ask: Retry topic vs DLQ; poison messages; offset commit strategies.
card: Poison message = a message that always fails (bad schema, bug) and blocks its partition if you keep retrying. Strategy: a few quick in-memory retries, then send to retry topics with increasing delays (non-blocking retries), and finally to a DLQ topic with the error details; alert and replay after a fix. Offset commits: auto-commit (simple, may lose or duplicate), manual commit after processing (at-least-once: commitSync per batch or record). Spring Kafka: DefaultErrorHandler + DeadLetterPublishingRecoverer, or @RetryableTopic.
patterns: dlq, retry

> 🧒 **Like you're 5:** A letter that can't be delivered goes to a "try again later" box, then a "try again tomorrow" box, and finally to the "problem letters" desk where a human looks at it, instead of jamming the whole sorting machine.

```java
@RetryableTopic(attempts = "4", backoff = @Backoff(delay = 1000, multiplier = 2), dltTopicSuffix = ".DLT")
@KafkaListener(topics = "orders")
void onOrder(OrderEvent e) { process(e); }

@DltHandler
void onDeadLetter(OrderEvent e, @Header(KafkaHeaders.EXCEPTION_MESSAGE) String err) { alertAndStore(e, err); }
```

> ⚠️ **Trap:** Retry topics break ordering for that key. If strict per-key order matters, block-and-retry or park all later messages for that key too.

### ITEM kf-duplicates | Handling duplicate and out-of-order events | must
ask: How do you handle duplicate events and out-of-order events?
card: Duplicates: make consumers idempotent: dedupe on a unique event id (processed_events table with a unique constraint, in the same DB transaction as the business change), or use naturally idempotent writes (upsert, SET status). Out-of-order: keep related events in one partition (same key); carry a version/sequence number or timestamp and ignore older versions (UPDATE ... WHERE version < :new); design state machines that reject invalid transitions; buffer/reorder if truly needed.
patterns: idempotency, eventual

> 🧒 **Like you're 5:** Each message has a serial number. If you see a number you've already handled, bin it. If an older number arrives after a newer one, ignore it because you already know newer news.

```sql
UPDATE order_view SET status = :status, version = :v
WHERE order_id = :id AND version < :v;      -- stale or duplicate events change nothing
```

### ITEM kf-lag | Monitoring consumer lag and fixing a growing backlog | must
ask: How do you monitor consumer lag and troubleshoot a growing backlog?
card: Lag = latest offset - committed offset per partition. Monitor with Burrow, kafka-consumer-groups.sh, Prometheus kafka exporter, Confluent/MSK metrics; alert on lag growth and time-lag. Growing lag: check if consumers are alive/rebalancing (logs), processing time per message (slow DB/API call?), errors and retries (poison message stuck?), partition skew (one hot key). Fixes: scale consumers up to the partition count, add partitions (careful: changes key → partition mapping), batch work, make downstream calls faster/async, fix the hot key.

> 🧒 **Like you're 5:** Lag is the pile of unread letters. If the pile keeps growing, either readers are too slow, too few, sick, or one reader gets all the letters.

```bash
kafka-consumer-groups.sh --bootstrap-server b:9092 --describe --group order-service
# TOPIC   PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# orders  0          10500           10520           20
# orders  1          8000            98000           90000   ← one partition stuck: hot key or poison msg
```

## MODULE redis | Redis & caching

### ITEM rd-patterns | Cache-aside vs write-through; TTL and invalidation | must
ask: Redis cache-aside vs write-through; TTL and invalidation.
card: Cache-aside (lazy): read cache → on miss read DB and put in cache with TTL; on update write DB then DELETE the cache key. Most common, cache holds only what's used. Write-through: write to cache and DB together on every update (fresh cache, slower writes). Write-behind: write to cache, flush to DB later (fast, risk of loss). Always set a TTL as a safety net. Invalidation is hard: delete-on-write, short TTLs, versioned keys, or events (CDC) to evict.
patterns: proxy

> 🧒 **Like you're 5:** The cache is a sticky note on the fridge with mom's phone number. Cache-aside: if there's no sticky note, look in the phone book and write a new note. If mom's number changes, rip the old note off.

```java
public Product get(long id) {
    String key = "product:" + id;
    Product p = redis.get(key);
    if (p != null) return p;                       // hit
    p = repo.findById(id).orElseThrow();           // miss
    redis.set(key, p, Duration.ofMinutes(10));     // TTL
    return p;
}
@Transactional
public void update(Product p) { repo.save(p); redis.delete("product:" + p.getId()); }   // evict, don't update
```

> 💡 **Tip:** In Spring: `@Cacheable("products")`, `@CacheEvict`, with `spring.cache.type=redis` and a TTL in `RedisCacheConfiguration`.

### ITEM rd-problems | Cache stampede, penetration, hot keys, distributed caching | must
ask: Cache stampede, cache penetration, hot keys and distributed caching.
card: Stampede (thundering herd): a popular key expires and thousands of requests hit the DB at once → fix with a lock/single-flight (only one rebuilds), early refresh, TTL jitter. Penetration: requests for keys that don't exist always miss → cache "null" for a short TTL or use a Bloom filter. Avalanche: many keys expire together → random TTLs. Hot key: one key gets huge traffic on one Redis node → local in-memory cache (Caffeine) in front, or replicate the key. Distributed cache: Redis Cluster shards keys across nodes by hash slot.

> 🧒 **Like you're 5:** Stampede: the sweets jar empties and 100 kids run to the shop at once; better that one kid goes and the rest wait. Penetration: kids keep asking for a flavour the shop never sells; write "we don't have it" on the door.

| Problem | Fix |
|---|---|
| Stampede | Mutex / single-flight rebuild, refresh-ahead, TTL jitter |
| Penetration | Cache empty results briefly, Bloom filter, validate input |
| Avalanche | Randomised TTLs, multi-level cache |
| Hot key | Local cache, key replication (`key#1..n`), read replicas |

## MODULE prod | Production scenarios

### ITEM prod-cascade | A downstream service is slow: prevent cascading failure | must
ask: One downstream service is slow. How do you prevent a cascading failure?
card: Slow is worse than down: callers' threads pile up waiting, pools exhaust, and the caller fails too. Defences: tight timeouts (connect + read), bulkheads (separate pool/semaphore per dependency), circuit breaker (fail fast while it's sick), fallbacks/cached responses, limited retries with backoff+jitter (or none), load shedding, async/queue for non-critical work. Also: alert on latency, autoscale, and talk to the owning team.
patterns: timeout, circuit, bulkhead, retry

> 🧒 **Like you're 5:** One slow cashier makes the whole queue stop, and soon the shop entrance is blocked. Give that cashier their own small queue, stop sending people to them if they're stuck, and send customers to self-checkout instead.

```diagram
API (200 Tomcat threads)
 ├── calls Recommendations (slow, 30 s!) → all 200 threads stuck → whole API down ❌
 └── with: timeout 300 ms + bulkhead 20 threads + circuit breaker + fallback "no recommendations" ✅
```

> 🎯 **Say this in the interview:** walk through: detect (latency alert) → contain (timeouts, breaker, bulkhead, fallback) → recover (breaker half-open) → fix root cause with the downstream team → prevent (load tests, SLOs).

### ITEM prod-investigate | Latency, error rate or Kafka lag suddenly increases: how do you investigate? | must
ask: API latency, error rate or Kafka lag suddenly increases. How do you investigate?
card: 1) Scope: which endpoints/services/regions/customers, since when? 2) Correlate with changes: deploys, config/feature flags, traffic spikes, infra events. 3) Use the golden signals (latency, traffic, errors, saturation) on dashboards, then traces (find the slow span: DB? downstream?), then logs filtered by trace/request id. 4) Check resources: CPU, memory/GC, thread pools, DB connections, slow queries, Kafka lag per partition. 5) Mitigate first (roll back, scale, disable feature, shed load), then root cause, then a blameless postmortem with action items.

> 🧒 **Like you're 5:** A doctor in an emergency first stops the bleeding (roll back, scale up), then runs tests to find out why (metrics, traces, logs), then makes sure it doesn't happen again.

| Step | Tool |
|---|---|
| What changed? | Deploy history, feature flags, CloudTrail/audit |
| Where is time spent? | Distributed tracing (OpenTelemetry/X-Ray/Jaeger) |
| Errors? | Logs by trace id, error dashboards |
| Saturation? | CPU, GC, thread pools, HikariCP active connections, DB slow log |
| Queue health? | Consumer lag per partition, DLQ size |

> 🏭 **Story template:** "p99 jumped from 200 ms to 3 s after a deploy. Traces showed a new DB query without an index. We rolled back in 10 minutes, added the index, redeployed, and added a migration review checklist + a latency alert."
