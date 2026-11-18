# Two-Phase Commit (2PC)

**In one line:** A **coordinator** asks all participants "can you commit?" (phase 1). If **everyone says yes**, it tells all of them "commit" (phase 2); otherwise "rollback".

---

## 1. Real-life example

A **wedding ceremony**. The priest (coordinator) asks the bride: "Do you agree?" – "Yes". The groom: "Do you agree?" – "Yes". Only when **both** say yes does the priest declare them married. If anyone says no, the wedding is off for both.

## 2. What problem does it solve?

You want **one atomic transaction** across **two or more databases/resources** – either all commit or none. Example: move money from a bank account in DB-1 to DB-2.

## 3. The two phases (build task – draw both)

```
Phase 1: PREPARE (voting)
 Coordinator ──"prepare?"──► DB-A : writes changes to log, locks rows → "YES"
             ──"prepare?"──► DB-B : writes changes to log, locks rows → "YES"

Phase 2: COMMIT (decision)
 all YES → Coordinator ──"commit"──► DB-A, DB-B   (release locks)
 any NO  → Coordinator ──"rollback"─► DB-A, DB-B
```

Important: after saying **YES**, a participant **promises** it can commit, and must **wait** for the coordinator's decision while holding locks.

## 4. The coordinator-crash failure case

```
1. Coordinator sends PREPARE → A says YES, B says YES
2. 💥 Coordinator crashes before sending COMMIT / ROLLBACK
3. A and B are stuck in "prepared" state:
   - they can't commit (maybe the other said NO?)
   - they can't rollback (maybe the coordinator decided COMMIT?)
   - their rows stay LOCKED → other transactions wait
```

This is why 2PC is called a **blocking protocol**. They stay blocked until the coordinator recovers and reads its decision log. (3PC and consensus-based commit try to fix this but are complex.)

## 5. Java / Spring Boot code – JTA (XA transactions)

Java supports 2PC with **JTA** and **XA** drivers. Spring Boot can use **Atomikos** or **Narayana** as the transaction manager.

```xml
<!-- Spring Boot 3: Narayana starter -->
<dependency>
  <groupId>dev.snowdrop</groupId>
  <artifactId>narayana-spring-boot-starter</artifactId>
  <version>3.2.0</version>
</dependency>
```

Configure two XA DataSources (simplified):

```java
@Configuration
public class XaConfig {
    @Bean @Primary
    public DataSource accountsDb() { return xa("jdbc:postgresql://db-a/accounts"); }

    @Bean
    public DataSource ledgerDb() { return xa("jdbc:postgresql://db-b/ledger"); }

    private DataSource xa(String url) {
        PGXADataSource ds = new PGXADataSource();   // XA-capable driver
        ds.setUrl(url);
        ds.setUser("app");
        ds.setPassword(System.getenv("DB_PASSWORD"));
        return ds;                                  // the starter wraps it in a pooled, JTA-aware DataSource
    }
}
```

```java
@Service
@RequiredArgsConstructor
public class TransferService {
    private final JdbcTemplate accountsJdbc;     // on accountsDb
    private final JdbcTemplate ledgerJdbc;       // on ledgerDb

    @Transactional     // JtaTransactionManager → 2PC across both DBs
    public void transfer(long from, double amount) {
        accountsJdbc.update("update accounts set balance = balance - ? where id = ?", amount, from);
        ledgerJdbc.update("insert into ledger(account_id, amount) values (?, ?)", from, -amount);
        // if anything throws, BOTH are rolled back
    }
}
```

(Postgres needs `max_prepared_transactions > 0` for XA.)

## 6. Why microservices avoid 2PC

- **Blocking:** locks held while waiting; coordinator crash = stuck rows.
- **Slow:** extra network round trips; all participants must be up at once → lower availability.
- **Tight coupling:** every service must support XA and share one coordinator.
- **Not supported** by many modern tools: Kafka (outside its own transactions), most REST APIs, many NoSQL DBs.
- It does not scale well across many services.

Microservices instead use **Saga**, **Transactional Outbox**, **TCC**, and **idempotent** operations → accept eventual consistency.

## 7. When is 2PC OK?

- Inside one company's database cluster (some databases use it internally, e.g. distributed SQL like CockroachDB/Spanner with consensus).
- Legacy enterprise systems: one app writing to DB + JMS queue with XA.
- Small number of reliable resources, low traffic.

## 8. Quick revision

- Phase 1 prepare/vote, phase 2 commit/rollback.
- Coordinator crash after YES → participants blocked with locks.
- Microservices prefer Saga/Outbox over 2PC.
