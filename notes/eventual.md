# Eventual Consistency

**In one line:** After a change, different copies of data may **disagree for a short time**, but if no new changes come, they will **all become the same eventually**.

---

## 1. Real-life example

You change your **WhatsApp profile photo**. Your friend in another city may still see the old photo for a few seconds. Eventually everybody sees the new one.

## 2. Why do systems choose it?

When data is copied to many servers (replicas) or many services keep their own copy:
- Updating **all** copies instantly before replying is slow and fails if one copy is unreachable.
- So the system replies quickly and updates the other copies **in the background**.

Benefit: **fast and always available**. Cost: **sometimes stale data**.

## 3. CAP theorem (simple)

In a distributed system, when there is a **network Partition** (servers can't talk), you must choose:

- **C – Consistency**: everyone sees the latest data, or you get an error.
- **A – Availability**: everyone gets an answer, maybe old data.

You can't have both during a partition. **P is not optional** in real networks.

- Bank balance transfer → choose **C** (better to fail than show wrong money).
- Likes count, product reviews, feeds → choose **A** (slightly old is fine).

Eventual consistency = the **A** choice.

## 4. The read-your-writes bug (build task)

```diagram
caption: The read-your-writes bug
step: User saves name "Ravi" | the write goes to the PRIMARY database
step: Page reloads and reads the profile | the read goes to a REPLICA that isn't updated yet
step: {fail} User sees the old name "Ravee" | "My save didn't work!" — confusing, even though the data is fine
```

### Fix 1: Read from primary right after a write

```java
@Service
@RequiredArgsConstructor
public class ProfileService {
    private final ProfileRepository repo;

    @Transactional                          // read-write → primary
    public Profile updateName(Long id, String name) {
        Profile p = repo.findById(id).orElseThrow();
        p.setName(name);
        return p;                           // return fresh data to the UI directly
    }

    @Transactional(readOnly = true)         // can be routed to a replica
    public Profile get(Long id) { return repo.findById(id).orElseThrow(); }
}
```

Route by transaction type with `AbstractRoutingDataSource`:

```java
public class ReadWriteRoutingDataSource extends AbstractRoutingDataSource {
    @Override
    protected Object determineCurrentLookupKey() {
        return TransactionSynchronizationManager.isCurrentTransactionReadOnly() ? "replica" : "primary";
    }
}
```

Then, for a short time after a user writes (e.g. 5 seconds, tracked in session/cookie), send *that user's* reads to the primary too.

### Fix 2: Version / timestamp check

Return a version number after a write. The client sends it on the next read. If the replica's version is older, read from primary (or wait a bit).

```java
public Profile get(Long id, long minVersion) {
    Profile p = replicaRepo.findById(id).orElseThrow();
    if (p.getVersion() < minVersion) {
        return primaryRepo.findById(id).orElseThrow();   // replica is behind
    }
    return p;
}
```

Other simple UI trick: show the updated value from the write response (**optimistic UI**).

## 5. Conflict resolution

When two copies are changed at the same time, which wins?

| Method | Meaning |
|---|---|
| **Last Write Wins (LWW)** | Keep the one with the latest timestamp. Simple, but can lose data. |
| **Version numbers / optimistic locking** | Reject the update if the version changed. JPA `@Version` does this. |
| **Merge** | Combine both (e.g. shopping cart = union of items). CRDTs do this automatically. |
| **Ask the user** | Like Git merge conflicts. |

```java
@Entity
public class Product {
    @Id Long id;
    int stock;
    @Version Long version;    // second concurrent update gets OptimisticLockException
}
```

## 6. Points to explain in an interview

- Eventual consistency trades freshness for availability and speed.
- **CAP**: during a partition choose C or A.
- **Read-your-writes** bug and fixes (primary after write, version checks).
- **Conflict resolution**: LWW, versions, merge.
- Where it appears: DB replicas, caches, CQRS read models, microservice events.

## 7. Quick revision

- Copies become equal "eventually".
- CAP: consistency vs availability during partition.
- Fix read-your-writes: read primary after writes, or check versions.
