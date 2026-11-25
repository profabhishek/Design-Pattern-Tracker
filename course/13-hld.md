# TRACK hld
title: System Design (HLD) Basics
icon: 🏗️
color: #14b8a6
tier: good
about: A repeatable framework for design rounds, back-of-envelope maths, and the classic systems (URL shortener, chat, feed, payments) at the depth expected around 3 years of experience.

## MODULE hld-core | Framework & building blocks

### ITEM hld-framework | How to run a system design interview | must
ask: You're asked to design a system in 45 minutes. What steps do you follow?
card: 1) Requirements: functional (what it does) + non-functional (scale, latency, availability, consistency). 2) Estimates: users, QPS, storage, read/write ratio. 3) API design (main endpoints). 4) Data model + database choice. 5) High-level diagram: clients → LB/gateway → services → cache → DB → queues. 6) Deep-dive 1–2 hard parts (the interviewer's pick). 7) Bottlenecks, failures, trade-offs, monitoring. Talk out loud, keep checking with the interviewer.

> 🧒 **Like you're 5:** Building a treehouse: first ask who will use it and how many friends (requirements), measure the tree (estimates), decide doors and windows (API), pick the wood (database), draw it, then fix the wobbly parts.

| Minutes | Step |
|---|---|
| 0–5 | Clarify requirements, write them down |
| 5–10 | Estimates (QPS, storage) |
| 10–15 | APIs + data model |
| 15–30 | High-level diagram, walk through a request |
| 30–42 | Deep dives: scaling, caching, consistency, failures |
| 42–45 | Trade-offs and what you'd do next |

> ⚠️ **Trap:** Jumping straight to "Kafka + Kubernetes + microservices" before understanding the problem. Simple first, then scale the parts that need it.

### ITEM hld-estimation | Back-of-the-envelope estimation | must
ask: How do you estimate QPS and storage for a system? Walk through an example.
card: Daily active users × actions per user / 86,400 ≈ average QPS; peak ≈ 2–3× average. Storage = items per day × size × retention. Handy numbers: 1 day ≈ 10^5 seconds; 1 million requests/day ≈ 12 QPS; a single app server ~ 1k–10k simple QPS; Postgres ~ thousands of simple writes/sec; Redis ~ 100k ops/sec; memory read ~ 100 ns, SSD read ~ 100 µs, same-region network round trip ~ 0.5 ms, cross-continent ~ 150 ms.

> 🧒 **Like you're 5:** Before a party, guess how many kids come and how many slices each eats. You don't need exact numbers, just "do we need 2 pizzas or 200?".

#### Example: a URL shortener
- 100 M new URLs/month → ~40 writes/sec average, ~100 peak.
- Reads 100× writes → ~4,000 reads/sec, ~10k peak → **cache heavily**.
- Each record ~500 bytes × 100 M/month × 12 × 5 years ≈ **3 TB**.
- 7-char base62 code = 62^7 ≈ 3.5 trillion codes: plenty.

### ITEM hld-scaling | Scaling building blocks: load balancers, stateless services, caching, CDN, queues | must
ask: How do you scale a web application from 1,000 to 10 million users?
card: Vertical first (bigger box), then horizontal: stateless app servers behind a load balancer (sessions in Redis/JWT), autoscaling. Database: indexes, connection pooling, read replicas, caching (Redis), then partitioning/sharding. Static assets via CDN. Slow work moved to queues + workers. Add observability, rate limiting, multiple availability zones. Scale the bottleneck you measured, one step at a time.
patterns: sharding, cqrs, gateway

> 🧒 **Like you're 5:** One shopkeeper → hire more shopkeepers who all follow the same rules (stateless) and a greeter who sends customers to whoever is free (load balancer). Popular items on the front shelf (cache). Deliveries done later by a van (queue).

```diagram
Users → CDN (images, JS)
      → Load balancer → App servers ×N (stateless, autoscaled)
                           ├─► Redis cache
                           ├─► DB primary ──► read replicas
                           └─► Queue ──► workers (emails, reports)
```

## MODULE hld-systems | Classic designs

### ITEM hld-url-shortener | Design a URL shortener (like bit.ly) | must
ask: Design a URL shortener.
card: APIs: POST /urls {longUrl} → shortCode; GET /{code} → 301/302 redirect. Code generation: base62 of a unique ID (DB sequence or a distributed ID generator like Snowflake, or pre-generated key ranges per server) to avoid collisions; hashing needs collision checks. Storage: key-value style table (code PK, longUrl, createdAt, expiry, userId). Read-heavy → Redis cache in front, CDN/edge for hot links. 301 (cacheable, fewer hits) vs 302 (track every click). Analytics via async events (Kafka) → click store.
patterns: sharding

> 🧒 **Like you're 5:** A coat check: you hand over your big coat (long URL), get a small token number (short code). Show the token later and you get your coat back.

```diagram
POST /urls → ID generator (range per server) → base62(id) → DB (code PK) 
GET /aB3xY9z → Redis (hit 99%) → else DB → 302 Location: long URL
                └─► async click event → Kafka → analytics store
```

> 🔁 **Follow-ups:** custom aliases (unique check), expiry (TTL + cleanup job), abuse/spam (rate limit, URL scanning), very hot links (cache + CDN).

### ITEM hld-chat | Design a chat app (like WhatsApp) | good
ask: Design a 1:1 and group chat system.
card: Clients keep a persistent WebSocket to a chat gateway server; a session registry (Redis) maps userId → gateway server. Send: client → gateway → chat service → persist message (Cassandra/DynamoDB partitioned by conversationId, sorted by time/sequence) → route to the recipient's gateway (pub/sub) → push over WebSocket; if offline, store and send a push notification (FCM/APNs). Acks for sent/delivered/read. Ordering per conversation via a sequence number. Group fan-out: small groups on write; large groups via queues.

> 🧒 **Like you're 5:** Every phone keeps a tin-can telephone line open to the post office. The post office remembers which line each friend is on and passes your message along, or keeps it safe if your friend's phone is off.

```diagram
Phone A ═WebSocket═ Gateway 1 ─► Chat service ─► Message DB (by conversation)
                                     │
                       Redis: userB → Gateway 2
                                     ▼
Phone B ═WebSocket═ Gateway 2 ◄─ pub/sub      (offline? → push notification)
```

### ITEM hld-feed | Design a news feed (fan-out on write vs read) | good
ask: Design a social news feed (like Instagram/Twitter home timeline).
card: Fan-out on write (push): when a user posts, write the post id into each follower's feed cache (Redis list). Fast reads, heavy writes; bad for celebrities with millions of followers. Fan-out on read (pull): build the feed at read time by merging recent posts of people you follow: cheap writes, slow reads. Hybrid: push for normal users, pull for celebrities, merged at read. Store posts in a DB, media in object storage + CDN, rank feed items, paginate with cursors.

> 🧒 **Like you're 5:** Push: the postman puts a copy of every new letter into each friend's mailbox right away. Pull: you visit every friend's house and collect their letters when you want to read. For a celebrity with a million fans, the postman can't make a million copies, so fans pull theirs.

### ITEM hld-payment | Design a payment system | good
ask: Design a payment system for an e-commerce site. How do you avoid charging twice?
card: Flow: order service → payment service creates a payment intent (status CREATED) with an idempotency key → calls the payment provider (Razorpay/Stripe) → provider webhook confirms (verify signature) → status SUCCEEDED/FAILED → event to order service (outbox). Double-charge protection: idempotency keys end to end, unique constraints, a state machine that only moves forward, reconciliation jobs against provider reports. Use a double-entry ledger for balances (every movement = debit + credit, append-only). Never use float for money. Strong consistency over availability here.
patterns: idempotency, outbox, saga, retry

> 🧒 **Like you're 5:** Paying is like sending money in a sealed envelope with a unique number. If you're not sure it arrived and send again, the bank sees the same number and doesn't take your money twice. At night someone checks the bank statement against your notebook.

```diagram
Checkout → Payment svc (idempotency key, status CREATED) → Provider API
Provider ──webhook (signed)──► Payment svc → SUCCEEDED → outbox → Kafka → Order svc
Nightly: reconciliation job compares provider settlement report vs ledger
```

### ITEM hld-typeahead | Design search autocomplete (typeahead) | bonus
ask: Design search autocomplete (typeahead suggestions).
card: Precompute top suggestions per prefix from query logs (batch job counting popular queries), store prefix → top 10 list in a fast store (Redis or an in-memory trie per server), serve with very low latency (<100 ms), debounce on the client, cache in CDN/browser for common prefixes. Update periodically; filter offensive terms; personalise later. Elasticsearch completion suggester is an off-the-shelf option.

> 🧒 **Like you're 5:** A librarian who already wrote cards for "ja → java, jacket, jam" so when you say "ja" she instantly shows you the card instead of searching the whole library.
