# TRACK microservices
title: Microservices & Distributed Systems
icon: 🔗
color: #6366f1
tier: must
about: Service boundaries, communication, resilience, sagas, idempotency, outbox, CAP and consistency. Linked to your 32 pattern notes.

## MODULE ms-arch | Architecture & communication

### ITEM ms-monolith | Monolith vs microservices; when NOT to split | must
ask: Monolith vs microservices; when should a monolith not be split?
card: Monolith = one deployable: simple to build, test, deploy and debug; scales as one unit. Microservices = independently deployable services owned by teams: independent scaling and releases, tech freedom, fault isolation; cost = network calls, distributed data/transactions, observability, DevOps overhead. Don't split when the team is small, the domain is still unclear, or there's no real scaling/release pain. Start with a modular monolith; extract services along stable boundaries.
patterns: strangler

> 🧒 **Like you're 5:** A monolith is one big Lego castle: easy to move as one piece, but to change one tower you rebuild carefully. Microservices are many small Lego houses: change one house anytime, but now you need roads, postmen and maps between them.

| | Monolith | Microservices |
|---|---|---|
| Deploy | One unit | Independent |
| Data | One DB, ACID joins | DB per service, eventual consistency |
| Debugging | Stack trace | Distributed tracing |
| Team fit | Small team | Many teams owning domains |
| Failure | One bug can take all down | Isolated, but more partial failures |

> 🎯 **Say this in the interview:** "Microservices solve organisational and scaling problems, not code quality problems. A badly designed monolith becomes a distributed monolith, which is worse."

### ITEM ms-boundaries | Identifying service boundaries; DDD basics | must
ask: How do you identify service boundaries? Domain-driven design basics.
card: Split by business capability / bounded context, not by technical layer. DDD terms: domain, bounded context (a boundary where a model and its words mean one thing: "Order" in Sales vs in Shipping), ubiquitous language, aggregates (consistency boundary, one transaction per aggregate), domain events. Good boundary = high cohesion inside, few synchronous calls across, owns its data, one team can own it. Event storming helps find them.
patterns: acl

> 🧒 **Like you're 5:** In a school, the canteen, library and sports room each have their own rules and staff. "Book" means something different in the library than in the canteen's booking register. Each room is a bounded context.

> ⚠️ **Trap:** Splitting into "UserService, OrderService" that call each other on every request (chatty services) creates a distributed monolith. If two services always change and deploy together, they're probably one service.

### ITEM ms-db-per-service | Database per service; why avoid shared databases | must
ask: Why should each microservice own its database? What's wrong with a shared database?
card: Shared DB = hidden coupling: one team's schema change breaks others, no independent deploys, one DB scaling bottleneck, no clear ownership. Database per service = each service owns its tables (can even pick a different DB type); others get data only through its API or events. Cost: no cross-service joins or ACID transactions → use API composition, CQRS read models, sagas and eventual consistency.
patterns: saga, cqrs, eventual

> 🧒 **Like you're 5:** If every family in a building shared one fridge, someone always eats your stuff or moves your shelf. Each family having its own fridge means you ask nicely when you need something.

### ITEM ms-communication | REST vs gRPC vs messaging; sync vs async | must
ask: REST vs gRPC vs messaging; synchronous vs asynchronous communication.
card: REST/JSON over HTTP: simple, universal, human-readable; good for public and CRUD APIs. gRPC: HTTP/2 + Protobuf, typed contracts, fast, streaming; good for internal service-to-service calls. Messaging (Kafka/RabbitMQ/SQS): async, decoupled in time, buffers spikes, enables events and fan-out; harder to debug, eventual consistency. Use sync when the caller needs an answer now; async for "fire and continue" work (emails, analytics, downstream updates).

> 🧒 **Like you're 5:** Sync is a phone call: you wait on the line for the answer. Async is a WhatsApp message: you send it and carry on; they reply when they can.

| | REST | gRPC | Messaging |
|---|---|---|---|
| Style | Request/response | Request/response + streams | Events / commands |
| Format | JSON | Protobuf (binary) | Any (JSON/Avro) |
| Coupling | Temporal coupling | Temporal coupling | Decoupled in time |
| Best for | Public APIs | Internal low-latency | Workflows, fan-out, spikes |

### ITEM ms-gateway-discovery | API gateway, service discovery, load balancing, centralized config | must
ask: Explain API Gateway, service discovery, load balancing and centralized configuration.
card: API gateway = single entry point: routing, auth, rate limiting, TLS, request aggregation (Spring Cloud Gateway, Kong, AWS API Gateway). Service discovery = services register their address and clients look them up (Eureka, Consul; in Kubernetes the Service DNS does it). Load balancing = spread calls across instances (client-side: Spring Cloud LoadBalancer; server-side: ALB, K8s Service). Centralized config = one place for config per environment (Spring Cloud Config, K8s ConfigMaps/Secrets, AWS Parameter Store).
patterns: gateway, discovery

> 🧒 **Like you're 5:** The gateway is the school reception desk. Discovery is the noticeboard listing which classroom each teacher is in today. Load balancing is the reception sending visitors to whichever teacher is free.

```diagram
Client → [API Gateway: auth, rate limit, routing]
            ├─► order-service  (3 pods) ─┐
            └─► user-service   (2 pods)  ├─ found via K8s DNS / Eureka
                                         └─ config from ConfigMap / Config Server
```

### ITEM ms-s2s-auth | Service-to-service authentication and authorization | good
ask: How do you handle service-to-service authentication and authorization?
card: Options: mTLS (each service has a certificate; a service mesh like Istio/Linkerd automates it), OAuth2 client-credentials flow (a service gets its own token from the auth server and sends it as a Bearer token; scopes control what it may call), or cloud IAM (AWS IAM roles/SigV4). Propagate the end-user identity separately (forward the user JWT or a signed internal token) when downstream needs it. Zero trust: verify every call, even inside the network.

> 🧒 **Like you're 5:** Even inside the school, the cook can't just walk into the principal's office. Staff wear ID badges (certificates/tokens) and each door checks the badge.

```yaml
# a Spring service calling another with client-credentials
spring.security.oauth2.client.registration.inventory:
  client-id: order-service
  client-secret: ${INVENTORY_CLIENT_SECRET}
  authorization-grant-type: client_credentials
  scope: inventory.read
```

### ITEM ms-compat | Backward compatibility during API changes | must
ask: How do you maintain backward compatibility during API changes?
card: Make additive changes only: add optional fields/endpoints, never remove or rename or change types in place. Clients must ignore unknown fields (Jackson FAIL_ON_UNKNOWN_PROPERTIES=false). For breaking changes: new version (/v2) running side by side, deprecation headers, migrate consumers, then remove. Expand–contract for DB changes. Consumer-driven contract tests (Pact, Spring Cloud Contract) catch breaks in CI. Schema registry with compatibility rules for events (Avro/Protobuf).

> 🧒 **Like you're 5:** You can add new buttons to the TV remote, but if you remove the volume button, grandma's remote stops working. Keep old buttons until everyone has a new remote.

#### Expand → migrate → contract (renaming `name` to `fullName`)
1. **Expand:** add `fullName`, write both fields, read new with fallback to old.
2. **Migrate:** backfill data, update all consumers to read `fullName`.
3. **Contract:** stop writing `name`, then remove it in a later release.

## MODULE ms-resilience | Reliability, consistency & patterns

### ITEM ms-resilience-combo | Timeout vs retry vs circuit breaker vs bulkhead: how they work together | must
ask: Timeout vs retry vs circuit breaker vs bulkhead; how do they work together?
card: Timeout = never wait forever (fail fast, free threads). Retry = try again for transient errors (only idempotent calls, with backoff + jitter, small max). Circuit breaker = after many failures, stop calling (open) for a while, then probe (half-open), so a sick dependency can recover and you fail fast. Bulkhead = separate thread pools/semaphores per dependency so one slow dependency can't eat all threads. Order (Resilience4j): Retry ( CircuitBreaker ( RateLimiter ( TimeLimiter ( Bulkhead ( call ))))) + a fallback.
patterns: timeout, retry, circuit, bulkhead

> 🧒 **Like you're 5:** Timeout: "I'll wait 2 minutes for the bus, not all day". Retry: "the bus was full, I'll try the next one". Circuit breaker: "the bridge is broken, stop sending buses for an hour". Bulkhead: "ship compartments, so one leak doesn't sink the whole ship".

```java
@CircuitBreaker(name = "payment", fallbackMethod = "queueForLater")
@Retry(name = "payment")
@Bulkhead(name = "payment")
public PaymentResult charge(PaymentRequest r) { return paymentClient.charge(r); }

PaymentResult queueForLater(PaymentRequest r, Throwable t) { outbox.save(r); return PaymentResult.pending(); }
```

```yaml
resilience4j:
  retry.instances.payment: { max-attempts: 3, wait-duration: 200ms, enable-exponential-backoff: true }
  circuitbreaker.instances.payment: { failure-rate-threshold: 50, sliding-window-size: 20, wait-duration-in-open-state: 30s }
```

### ITEM ms-backoff | Retry with exponential backoff and jitter; when retries make outages worse | must
ask: Explain retry with exponential backoff and jitter. When can retries make an outage worse?
card: Exponential backoff: wait base × 2^attempt (100ms, 200ms, 400ms...) capped at a max. Jitter: randomise the wait (e.g. random between 0 and the backoff) so thousands of clients don't retry at the same instant (thundering herd). Retries make things worse when the dependency is overloaded (they multiply traffic: 3 layers × 3 retries = 27× load), for non-idempotent operations (double charges), and for non-transient errors (400s). Use retry budgets, retry only at one layer, and pair with circuit breakers.
patterns: retry

> 🧒 **Like you're 5:** If a shop is too crowded, everyone knocking again at exactly 10:00:01 makes it worse. Wait a bit longer each time, and everyone picks a slightly different random time.

```java
long backoff(int attempt) {
    long exp = Math.min(MAX_MS, BASE_MS * (1L << attempt));
    return ThreadLocalRandom.current().nextLong(exp + 1);   // "full jitter"
}
```

### ITEM ms-fallback | Fallback strategies, rate limiting, load shedding | good
ask: What fallback strategies do you use? Explain rate limiting and load shedding.
card: Fallbacks: cached/stale data, default values, a degraded response (show the page without recommendations), queue the work for later, or fail fast with a clear error. Rate limiting = cap how many requests a client may send (protects you from one noisy client, returns 429). Load shedding = when the server itself is overloaded, reject low-priority requests early (503) to keep serving critical ones; better to serve 80% well than 100% badly.
patterns: ratelimit, circuit

> 🧒 **Like you're 5:** The ice-cream machine broke? Offer cookies instead (fallback). Only 2 scoops per kid (rate limit). Too many kids in the shop? Let in the ones with pre-orders first and ask others to come later (load shedding).

### ITEM ms-saga | Saga pattern: choreography vs orchestration, compensating transactions | must
ask: Saga pattern: choreography vs orchestration; compensating transactions.
card: A saga is a business transaction across services done as a sequence of local transactions; if a step fails, earlier steps are undone with compensating actions (refund, release stock, cancel order). Choreography: services react to each other's events (simple for 2–4 steps, hard to follow). Orchestration: a central orchestrator tells each service what to do and tracks state (clear flow, easier timeouts/monitoring; Temporal, Camunda, or a state machine). Compensations must be idempotent; sagas give no isolation (others may see intermediate states).
patterns: saga, tcc, outbox

> 🧒 **Like you're 5:** Planning a trip: book flight ✅, book hotel ✅, book cab ❌. You can't "undo" time, so you cancel the hotel and cancel the flight. Those cancellations are compensations.

> 🎯 **Say this in the interview:** "For an order → payment → inventory flow I'd use orchestration so the state of each order is visible in one place, with idempotent steps, an outbox to publish commands reliably, and timeouts that trigger compensation."

### ITEM ms-2pc | 2-phase commit vs Saga; why distributed transactions are hard | must
ask: 2-phase commit vs Saga; why are distributed transactions difficult?
card: 2PC: a coordinator asks all participants to PREPARE (lock + vote), then tells all to COMMIT (or ABORT). Gives atomicity but is blocking (if the coordinator dies after prepare, participants hold locks), slow, needs all resources to support XA, and couples availability (all must be up). Saga trades atomic isolation for availability with compensations. Distributed transactions are hard because networks fail, messages are delayed/duplicated, clocks drift, and you can't tell "slow" from "dead".
patterns: twopc, saga

> 🧒 **Like you're 5:** 2PC is a wedding: the priest asks both "do you?" and only if both say yes is it done. If the priest faints right after both said yes, everyone stands frozen waiting.

### ITEM ms-idempotency | Achieving idempotency: idempotency keys and deduplication | must
ask: How do you achieve idempotency? Idempotency keys and deduplication.
card: The client sends a unique Idempotency-Key per logical operation. The server stores key → result (with a unique constraint) in the same transaction as the side effect; a repeated key returns the stored result instead of acting again. Handle the concurrent duplicate (insert key first with status IN_PROGRESS, unique constraint wins). Expire keys after a TTL. For messages: dedupe by event id in a processed_events table, or make the operation naturally idempotent (SET status = 'PAID' rather than balance += 100; upserts).
patterns: idempotency

> 🧒 **Like you're 5:** Each order has a sticker number. If the shopkeeper sees the same sticker number again, they say "already done, here's your receipt" instead of giving a second pizza.

```java
@Transactional
public PaymentResponse pay(String idemKey, PaymentRequest req) {
    Optional<IdemRecord> existing = idemRepo.findById(idemKey);
    if (existing.isPresent()) return existing.get().response();           // replay
    idemRepo.saveAndFlush(new IdemRecord(idemKey, "IN_PROGRESS"));        // unique PK blocks a concurrent twin
    PaymentResponse res = gateway.charge(req);
    idemRepo.save(new IdemRecord(idemKey, "DONE", res));
    return res;
}
```

### ITEM ms-delivery | At-most-once vs at-least-once vs effectively-once processing | must
ask: At-most-once vs at-least-once vs effectively-once processing.
card: At-most-once: commit/ack before processing; a crash loses the message, never duplicates (OK for metrics). At-least-once: process, then ack; a crash causes redelivery → duplicates (most common; pair with idempotent consumers). Exactly-once delivery is impossible in general; "effectively-once" = at-least-once delivery + idempotent/deduplicated processing (or Kafka transactions within Kafka).
patterns: idempotency, dlq

> 🧒 **Like you're 5:** At-most-once: a postman who throws the letter once and never checks. At-least-once: a postman who keeps delivering until you sign, so sometimes you get two copies. Effectively-once: you throw away copies you've already read.

### ITEM ms-outbox | Outbox pattern, CDC, and the dual-write problem | must
ask: What is the dual-write problem? How do the outbox pattern and CDC solve it?
card: Dual write = saving to the DB AND publishing to Kafka in two steps; if one fails you get inconsistency (order saved, event lost; or event sent, DB rolled back). Outbox: in the SAME DB transaction, insert the business row and an outbox row (the event). A relay publishes outbox rows to Kafka (polling publisher or CDC) and marks them sent. CDC (Debezium) reads the DB's transaction log and streams changes/outbox rows to Kafka without polling. Gives at-least-once publishing: consumers must be idempotent.
patterns: outbox, eventual

> 🧒 **Like you're 5:** Instead of writing the diary AND phoning your friend (and maybe forgetting the call), you write the diary and add a sticky note "tell friend" on the same page. A helper reads the sticky notes and makes the calls.

```java
@Transactional
public void placeOrder(Order o) {
    orderRepo.save(o);
    outboxRepo.save(new OutboxEvent("OrderPlaced", o.getId(), toJson(o)));   // same transaction
}
// separate relay (or Debezium) publishes unsent outbox rows to Kafka, then marks them sent
```

### ITEM ms-cap | CAP theorem, eventual vs strong consistency, quorums | must
ask: Explain the CAP theorem, eventual consistency, strong consistency and quorum basics.
card: CAP: when a network Partition happens, a distributed system must choose Consistency (every read sees the latest write, or errors) or Availability (always answer, maybe stale). Without partitions you choose between latency and consistency (PACELC). Strong consistency = reads see the latest write (single leader, consensus). Eventual = replicas converge over time. Quorum: N replicas, write to W, read from R; if R + W > N, reads overlap the latest write (e.g. N=3, W=2, R=2).
patterns: eventual, leader

> 🧒 **Like you're 5:** Two shops share stock info by phone. The phone line breaks (partition). Do you stop selling until the line is back (consistent) or keep selling and maybe oversell (available)?

| System | Leans to |
|---|---|
| Bank balance, inventory reservation | CP (correctness first) |
| Social feed, likes count, product reviews | AP (availability, eventual) |
| Cassandra / DynamoDB | Tunable per request (quorum levels) |
| ZooKeeper / etcd | CP (consensus) |

### ITEM ms-distributed-locks | Distributed locks, leader election, clock skew and split brain | good
ask: Distributed locks, leader election, clock skew and split-brain scenarios.
card: Distributed lock = mutual exclusion across machines (Redis SET key value NX PX ttl, ZooKeeper/etcd, DB row locks). Locks need a TTL (holder may die) and fencing tokens (an increasing number checked by the storage) because a paused holder may wake up after its lock expired. Leader election = pick exactly one active node (Raft/ZooKeeper/K8s Lease). Clock skew = machines disagree on time, so never order events by wall clock across nodes (use logical clocks/versions). Split brain = two nodes both think they're leader; prevented with quorums (majority votes) and fencing.
patterns: leader

> 🧒 **Like you're 5:** One microphone in class. Whoever holds it can talk, but only for 1 minute (TTL). If a kid falls asleep holding it and wakes up later, the teacher checks the "turn number" written on it, so an old turn can't talk over the new one (fencing).

> ⚠️ **Trap:** "Redis lock with no TTL" deadlocks forever when a pod crashes. "Redis lock with TTL but no fencing" can let two workers run at once after a long GC pause. For correctness-critical work, prefer DB constraints or a consensus system.
