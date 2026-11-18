# Event Sourcing

**In one line:** Don't store only the **current state**. Store **every change as an event**, and get the current state by **replaying** the events.

---

## 1. Real-life example

Your **bank passbook**. It doesn't just say "balance ₹5,000". It lists every entry: +10,000 salary, −3,000 rent, −2,000 shopping. The balance is the sum of all entries. You can see the full history, and you can check the balance on any past date.

## 2. Normal way vs Event Sourcing

**Normal (state-based):**

| account_id | balance |
|---|---|
| 1 | 5000 |

You lose *how* you got there.

**Event sourcing:**

| seq | account_id | event | amount |
|---|---|---|---|
| 1 | 1 | AccountOpened | 0 |
| 2 | 1 | MoneyDeposited | 10000 |
| 3 | 1 | MoneyWithdrawn | 3000 |
| 4 | 1 | MoneyWithdrawn | 2000 |

Balance = replay → 0 + 10000 − 3000 − 2000 = **5000**.

Events are **facts in the past tense** and are **never updated or deleted** (append-only).

## 3. Benefits

- Full **audit trail** (banks, payments, legal).
- **Time travel**: "what was the balance on 1st March?"
- Fix bugs by replaying events with corrected code.
- Easy to publish events to other services; pairs well with **CQRS** (build many read models).

## 4. Build task – bank account rebuilt from events

### Events

```java
public sealed interface AccountEvent permits AccountOpened, MoneyDeposited, MoneyWithdrawn {
    String accountId();
}
public record AccountOpened(String accountId, String owner) implements AccountEvent { }
public record MoneyDeposited(String accountId, long amount) implements AccountEvent { }
public record MoneyWithdrawn(String accountId, long amount) implements AccountEvent { }
```

### Aggregate – state comes only from events

```java
public class BankAccount {
    private String id;
    private long balance;
    private int version = 0;                      // how many events applied
    private final List<AccountEvent> newEvents = new ArrayList<>();

    // rebuild from history
    public static BankAccount replay(List<AccountEvent> history) {
        BankAccount acc = new BankAccount();
        history.forEach(acc::apply);
        return acc;
    }

    // COMMANDS: check rules, then record an event
    public void deposit(long amount) {
        if (amount <= 0) throw new IllegalArgumentException("Amount must be positive");
        record(new MoneyDeposited(id, amount));
    }

    public void withdraw(long amount) {
        if (amount > balance) throw new IllegalStateException("Insufficient balance");
        record(new MoneyWithdrawn(id, amount));
    }

    private void record(AccountEvent e) { apply(e); newEvents.add(e); }

    // APPLY: only changes state, no rules (so replay never fails)
    private void apply(AccountEvent e) {
        switch (e) {
            case AccountOpened o   -> { this.id = o.accountId(); this.balance = 0; }
            case MoneyDeposited d  -> this.balance += d.amount();
            case MoneyWithdrawn w  -> this.balance -= w.amount();
        }
        version++;
    }

    public long getBalance() { return balance; }
    public int getVersion() { return version; }
    public List<AccountEvent> getNewEvents() { return newEvents; }
}
```

### Event store (JPA table, append-only)

```java
@Entity
@Table(name = "account_events",
       uniqueConstraints = @UniqueConstraint(columnNames = {"accountId", "version"}))
@Getter @Setter @NoArgsConstructor
public class StoredEvent {
    @Id @GeneratedValue private Long seq;
    private String accountId;
    private int version;             // unique per account → stops two writers at the same time
    private String type;
    @Lob private String payload;     // JSON
    private Instant occurredAt = Instant.now();
}

public interface StoredEventRepo extends JpaRepository<StoredEvent, Long> {
    List<StoredEvent> findByAccountIdOrderByVersionAsc(String accountId);
    List<StoredEvent> findByAccountIdAndVersionGreaterThanOrderByVersionAsc(String id, int v);
}
```

### Service

```java
@Service
@RequiredArgsConstructor
public class AccountService {
    private final StoredEventRepo repo;
    private final EventSerializer serializer;   // JSON <-> AccountEvent (small helper with ObjectMapper)

    public BankAccount load(String id) {
        List<AccountEvent> history = repo.findByAccountIdOrderByVersionAsc(id)
                .stream().map(serializer::fromStored).toList();
        return BankAccount.replay(history);
    }

    @Transactional
    public long withdraw(String id, long amount) {
        BankAccount acc = load(id);
        int expected = acc.getVersion();
        acc.withdraw(amount);
        save(id, expected, acc.getNewEvents());   // unique (accountId, version) = optimistic lock
        return acc.getBalance();
    }

    private void save(String id, int fromVersion, List<AccountEvent> events) {
        int v = fromVersion;
        for (AccountEvent e : events) repo.save(serializer.toStored(id, ++v, e));
    }
}
```

## 5. Snapshots (add this when events grow)

An account with 100,000 events is slow to replay. Every N events (say 100), save a **snapshot** of the state:

```java
@Entity
@Getter @Setter
public class AccountSnapshot {
    @Id private String accountId;
    private long balance;
    private int version;              // snapshot taken at this version
}
```

```java
public BankAccount load(String id) {
    return snapshots.findById(id)
        .map(snap -> {
            BankAccount acc = BankAccount.fromSnapshot(snap.getAccountId(), snap.getBalance(), snap.getVersion());
            repo.findByAccountIdAndVersionGreaterThanOrderByVersionAsc(id, snap.getVersion())
                .forEach(se -> acc.applyHistory(serializer.fromStored(se)));   // only newer events
            return acc;
        })
        .orElseGet(() -> loadFromAllEvents(id));
}
```

(`fromSnapshot` and `applyHistory` are small helper methods you add to `BankAccount`.)

## 6. Points to explain in an interview

- **Replay cost:** long event streams are slow → use **snapshots**.
- **Snapshots** are just a cache; you can always rebuild from events.
- **Schema evolution:** events are stored forever, but your classes change. Strategies: add only optional fields, version events (`MoneyDepositedV2`), and **upcasters** that convert old events to the new shape when reading.
- Querying ("all accounts with balance > 1L") is hard on the event store → build **read models with CQRS**.
- Deleting personal data (GDPR) is hard in append-only stores → encrypt personal data per user and throw away the key ("crypto shredding").
- Tools: **Axon Framework**, **EventStoreDB**, or plain tables + Kafka.

## 7. Quick revision

- Store events, not just state; state = replay.
- Append-only, past-tense facts.
- Snapshots for speed, upcasters for schema changes, CQRS for queries.
