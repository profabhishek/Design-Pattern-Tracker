# Leader Election

**In one line:** Out of many servers running the same app, **pick exactly one as the leader** to do a special job. If the leader dies, the others **elect a new one**.

---

## 1. Real-life example

A **class monitor**. Only one student is monitor at a time. If the monitor is absent for many days, the class chooses a new one. If two students both think they are monitor, there's chaos – that's "split brain".

## 2. What problem does it solve?

You run 5 copies of your Spring Boot app. Some jobs must run **only once**:
- A nightly report / scheduled job (`@Scheduled` would run on **all 5**!)
- The outbox poller
- Writing to the primary database in a replicated system (Raft, Kafka controller, etc.)

## 3. Key ideas

- **Quorum (majority):** with 5 nodes, a leader needs at least 3 votes. Two groups can't both have a majority → only one leader.
- **Heartbeats:** the leader keeps sending "I'm alive". If followers don't hear it for a while, they start an election.
- **Term / epoch:** a number that increases with every election. Old leaders with an old term are ignored.
- **Lease:** leadership is valid only for a time (e.g. 10 s) and must be renewed.

## 4. Build task – walk through a Raft election

Raft is a famous, easy-to-understand consensus algorithm (used in etcd, Consul, Kafka KRaft).

Each node is **Follower**, **Candidate**, or **Leader**.

```diagram
caption: A Raft election, step by step
step: Everyone is a FOLLOWER (term 1) | leader A sends regular heartbeats
step: {fail} A crashes | followers stop hearing heartbeats
step: C's random timer fires first | C becomes CANDIDATE, raises the term to 2, votes for itself and asks everyone: RequestVote(term 2)
step: Nodes vote | each node gives at most ONE vote per term, and only to a candidate whose log is at least as up to date
step: {good} C gets 3 of 5 votes | a majority, so C is LEADER for term 2
step: C sends heartbeats | the others stay followers
step: Old leader A comes back | it sees term 2 > its term 1, so it quietly becomes a follower
```

Why random timeouts? So that usually only one node starts an election at a time; otherwise votes split and they retry.

## 5. Spring Boot – leader election you can actually use

You don't write Raft yourself. Use a shared store to elect a leader.

### Option A: Spring Integration + database lock

Dependencies: `spring-boot-starter-integration`, `spring-integration-jdbc`.
(Create the `INT_LOCK` table from Spring Integration's `schema-*.sql` script.)

```java
@Configuration
public class LeaderConfig {

    @Bean
    public DefaultLockRepository lockRepository(DataSource ds) {
        DefaultLockRepository repo = new DefaultLockRepository(ds);
        repo.setTimeToLive(10_000);            // lease 10 seconds
        return repo;
    }

    @Bean
    public JdbcLockRegistry lockRegistry(LockRepository repo) {
        return new JdbcLockRegistry(repo);
    }

    @Bean
    public LockRegistryLeaderInitiator leaderInitiator(LockRegistry registry) {
        return new LockRegistryLeaderInitiator(registry);   // keeps trying to become leader
    }
}
```

```java
@Component
@Slf4j
public class LeaderOnlyJobs {
    private volatile boolean leader = false;

    @EventListener
    public void onGranted(OnGrantedEvent e) { leader = true;  log.info("I am the LEADER now"); }

    @EventListener
    public void onRevoked(OnRevokedEvent e) { leader = false; log.info("Leadership lost"); }

    @Scheduled(fixedDelay = 5000)
    public void runOutboxPoller() {
        if (!leader) return;              // only the leader does the work
        log.info("Publishing outbox events...");
    }
}
```

Other options: `spring-integration-zookeeper` (Zookeeper), **Spring Cloud Kubernetes** leader election (uses K8s ConfigMaps/Leases), Redis locks (Redisson).

### Option B: just "run scheduled job once" – ShedLock

```java
@Scheduled(cron = "0 0 2 * * *")
@SchedulerLock(name = "nightlyReport", lockAtMostFor = "30m", lockAtLeastFor = "1m")
public void nightlyReport() { ... }      // only one instance runs it
```

## 6. Points to explain in an interview

- **Split brain:** two nodes both think they're leader (e.g. after a network split). Prevented by **quorum** – only the side with the majority can elect.
- **Quorum:** with N nodes, need N/2 + 1 votes. Use **odd** numbers (3, 5) – 4 nodes tolerate the same 1 failure as 3.
- **Leases:** leadership expires unless renewed. But a paused old leader (long GC pause) may still *think* it's leader → use **fencing tokens** (the term number): storage rejects writes with an old token.
- Raft terms, votes and heartbeats (walkthrough above).

## 7. Quick revision

- Exactly one leader does special work.
- Raft: followers → candidate (term+1) → majority votes → leader → heartbeats.
- Avoid split brain: quorum, leases, fencing tokens.
