# TRACK sql
title: SQL & Databases
icon: 🗄️
color: #3b82f6
tier: must
about: Joins, GROUP BY, window functions, indexes, query plans, ACID, replication and SQL vs NoSQL. Missing from most question banks, asked in most interviews.

## MODULE sql-queries | Writing queries
> 💡 All examples use two tables: `employee(id, name, dept_id, salary, manager_id)` and `department(id, name)`.

### ITEM sql-joins | INNER, LEFT, RIGHT, FULL and SELF joins | must
ask: Explain the different SQL joins with examples.
card: INNER = only rows matching in both tables. LEFT = all rows from the left + matches (NULLs if none). RIGHT = the opposite. FULL OUTER = all rows from both. SELF join = a table joined to itself (employee → manager). CROSS = every combination. To find rows with no match: LEFT JOIN ... WHERE right.id IS NULL.

> 🧒 **Like you're 5:** Two circles of friends. INNER = kids in both circles. LEFT = everyone in my circle, plus their match from yours if they have one. FULL = everybody from both circles.

```sql
-- employees with their department name (drops employees without a dept)
SELECT e.name, d.name AS dept
FROM employee e
JOIN department d ON d.id = e.dept_id;

-- departments with NO employees
SELECT d.name
FROM department d
LEFT JOIN employee e ON e.dept_id = d.id
WHERE e.id IS NULL;

-- employee and their manager (self join)
SELECT e.name AS employee, m.name AS manager
FROM employee e
LEFT JOIN employee m ON m.id = e.manager_id;
```

> ⚠️ **Trap:** A condition on the right table in `WHERE` turns a LEFT JOIN into an INNER JOIN. Put it in the `ON` clause if you want to keep unmatched left rows.

### ITEM sql-groupby | GROUP BY, HAVING vs WHERE, logical order of execution | must
ask: What's the difference between WHERE and HAVING? In what order does SQL run a query?
card: Logical order: FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT. WHERE filters rows before grouping (can't use aggregates). HAVING filters groups after aggregation (can use COUNT, SUM). That's why a SELECT alias can be used in ORDER BY but not in WHERE.

> 🧒 **Like you're 5:** WHERE is the bouncer at the door checking each person. GROUP BY puts people at tables by team. HAVING is the waiter who removes whole tables that are too small.

```sql
-- departments with more than 5 people earning over 50k, biggest first
SELECT dept_id, COUNT(*) AS cnt, AVG(salary) AS avg_sal
FROM employee
WHERE salary > 50000          -- row filter
GROUP BY dept_id
HAVING COUNT(*) > 5           -- group filter
ORDER BY cnt DESC;
```

> ⚠️ **Trap:** Every column in SELECT must be in GROUP BY or inside an aggregate (MySQL with ONLY_FULL_GROUP_BY off lets you cheat and returns random values).

### ITEM sql-nth-salary | Second-highest / Nth-highest salary in SQL | must
ask: Write a query to find the second-highest (or Nth-highest) salary.
card: Subquery: SELECT MAX(salary) FROM employee WHERE salary < (SELECT MAX(salary) FROM employee). Nth: SELECT DISTINCT salary ORDER BY salary DESC LIMIT 1 OFFSET n-1. Most robust: DENSE_RANK() OVER (ORDER BY salary DESC) and pick rank = n (handles ties). Per department: DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC).

> 🧒 **Like you're 5:** Remove the tallest kid from the line; now the tallest one left is the second tallest.

```sql
-- 1) classic
SELECT MAX(salary) FROM employee
WHERE salary < (SELECT MAX(salary) FROM employee);

-- 2) Nth with LIMIT/OFFSET (MySQL/Postgres)
SELECT DISTINCT salary FROM employee ORDER BY salary DESC LIMIT 1 OFFSET 2;   -- 3rd highest

-- 3) window function: Nth highest in EACH department
SELECT * FROM (
  SELECT e.*, DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rnk
  FROM employee e
) t
WHERE rnk = 2;
```

> 🔁 **Follow-up:** "What if there are ties or fewer than N rows?" DISTINCT / DENSE_RANK handles ties; wrap in a subquery so you return NULL instead of no row if needed.

### ITEM sql-window | Window functions: ROW_NUMBER, RANK, DENSE_RANK, LAG, running totals | must
ask: What are window functions? Difference between ROW_NUMBER, RANK and DENSE_RANK?
card: Window functions compute over a set of rows related to the current row WITHOUT collapsing them (unlike GROUP BY). OVER (PARTITION BY ... ORDER BY ...). Salaries 100,100,90: ROW_NUMBER 1,2,3 (always unique); RANK 1,1,3 (gaps); DENSE_RANK 1,1,2 (no gaps). LAG/LEAD read previous/next row. SUM(...) OVER (ORDER BY date) = running total.

> 🧒 **Like you're 5:** A race. ROW_NUMBER gives every runner a different number even in a tie. RANK says "two gold medals, so next is bronze". DENSE_RANK says "two golds, next is silver".

```sql
SELECT name, salary,
       ROW_NUMBER() OVER (ORDER BY salary DESC) AS rn,
       RANK()       OVER (ORDER BY salary DESC) AS rk,
       DENSE_RANK() OVER (ORDER BY salary DESC) AS drk
FROM employee;

-- daily revenue with running total and change from previous day
SELECT day, revenue,
       SUM(revenue) OVER (ORDER BY day)  AS running_total,
       revenue - LAG(revenue) OVER (ORDER BY day) AS change
FROM daily_sales;

-- top 3 earners per department
SELECT * FROM (
  SELECT e.*, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) rn FROM employee e
) t WHERE rn <= 3;
```

### ITEM sql-duplicates | Find and delete duplicate rows | must
ask: How do you find duplicate emails in a users table, and delete the duplicates keeping one?
card: Find: SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1. Delete keeping the lowest id: DELETE FROM users WHERE id NOT IN (SELECT MIN(id) FROM users GROUP BY email) (MySQL needs a derived table), or use ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) and delete rn > 1. Then add a UNIQUE constraint so it can't happen again.

> 🧒 **Like you're 5:** Count how many times each name is in the class register. Any name with more than one entry is a duplicate; keep the first entry, cross out the others, then make a rule "no repeating names".

```sql
-- Postgres
DELETE FROM users
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn FROM users
  ) t WHERE rn > 1
);
ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email);
```

### ITEM sql-facts | DELETE vs TRUNCATE vs DROP, UNION vs UNION ALL, IN vs EXISTS | good
ask: DELETE vs TRUNCATE vs DROP; UNION vs UNION ALL; IN vs EXISTS.
card: DELETE removes chosen rows (WHERE), logged, can roll back, fires triggers. TRUNCATE removes all rows fast, resets identity, minimal logging (DDL in MySQL: auto-commit). DROP removes the whole table. UNION removes duplicates (extra sort) while UNION ALL keeps all rows and is faster. EXISTS stops at the first match and is safe with NULLs; NOT IN with a NULL in the subquery returns nothing.

> 🧒 **Like you're 5:** DELETE = erase some lines from the notebook. TRUNCATE = tear out all pages but keep the notebook. DROP = throw the notebook away.

> ⚠️ **Trap:** `WHERE id NOT IN (SELECT manager_id FROM employee)` returns **zero rows** if any manager_id is NULL. Use `NOT EXISTS`.

## MODULE sql-perf | Indexes & performance

### ITEM sql-indexes | How indexes work: B-tree, composite index, covering index | must
ask: How does a database index work? What is a composite index and the leftmost-prefix rule?
card: Most indexes are B+ trees: sorted keys with pointers, so lookups/range scans are O(log n) instead of a full table scan. Composite index (a, b, c) helps queries filtering on a, a+b, a+b+c (leftmost prefix), not b alone. Covering index contains all columns a query needs (no table lookup). Costs: slower writes, more storage. Low-selectivity columns (gender, boolean) rarely benefit.

> 🧒 **Like you're 5:** An index is the index at the back of a textbook. Instead of reading every page for "HashMap", you look it up alphabetically and jump to page 212. A phone book sorted by (last name, first name) can't help you find everyone named "Priya" quickly.

```sql
CREATE INDEX idx_orders_user_status_created ON orders (user_id, status, created_at);

-- ✅ uses the index: leftmost prefix
SELECT * FROM orders WHERE user_id = 42 AND status = 'PAID' ORDER BY created_at DESC;
-- ❌ can't use it well: skips user_id
SELECT * FROM orders WHERE status = 'PAID';
-- ❌ function on the column kills the index
SELECT * FROM orders WHERE DATE(created_at) = '2026-11-25';
-- ✅ rewrite as a range
SELECT * FROM orders WHERE created_at >= '2026-11-25' AND created_at < '2026-11-26';
```

**Column order rule of thumb:** equality columns first, then range/sort columns.

> ⚠️ **Trap:** `LIKE '%abc'` (leading wildcard), implicit type casts (`varchar_col = 123`) and `OR` across different columns often prevent index use.

### ITEM sql-explain | Debugging a slow query with EXPLAIN | must
ask: A query became slow in production. How do you find out why and fix it?
card: Find it (slow query log, APM, pg_stat_statements). Run EXPLAIN / EXPLAIN ANALYZE: look for full table scans (type=ALL / Seq Scan), rows examined vs returned, filesort/temporary tables, bad join order. Fix: add or adjust an index, rewrite the query (avoid functions on columns, SELECT *), paginate with keyset instead of big OFFSET, update statistics, check N+1 from the ORM. Verify the plan and latency after.

> 🧒 **Like you're 5:** EXPLAIN is asking the database "tell me your plan before you go shopping". If the plan says "walk through every aisle of the whole supermarket", you know why it's slow.

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;
-- Before: Seq Scan on orders (rows=5,000,000)  → 1200 ms
-- After CREATE INDEX (user_id, created_at): Index Scan → 2 ms
```

**Pagination trap:** `LIMIT 20 OFFSET 100000` still reads 100,020 rows. Keyset pagination: `WHERE created_at < :lastSeen ORDER BY created_at DESC LIMIT 20`.

> 🏭 **Story to tell:** symptom (p95 went from 80 ms to 2 s), cause (new filter on an unindexed column / OFFSET pagination), fix (composite index / keyset), proof (EXPLAIN before vs after, dashboard).

### ITEM sql-acid | ACID, transactions and locking (SELECT ... FOR UPDATE) | must
ask: Explain ACID. How do you prevent two users from buying the last item at the same time?
card: Atomicity = all or nothing. Consistency = constraints always hold. Isolation = concurrent transactions don't see each other's half-done work (levels: Read Uncommitted, Read Committed, Repeatable Read, Serializable). Durability = committed data survives crashes (write-ahead log). Last-item problem: atomic conditional update (UPDATE stock SET qty = qty - 1 WHERE id = ? AND qty > 0, check rows affected), pessimistic lock (SELECT ... FOR UPDATE), or optimistic locking with a version column.

> 🧒 **Like you're 5:** A transaction is a promise: "either the whole money transfer happens, or none of it". No half-sent money, even if the power goes off.

```sql
-- simplest safe way: let one UPDATE do check + change atomically
UPDATE product SET stock = stock - 1 WHERE id = 7 AND stock > 0;
-- rows affected = 0  → sold out

-- pessimistic
BEGIN;
SELECT stock FROM product WHERE id = 7 FOR UPDATE;   -- others wait on this row
UPDATE product SET stock = stock - 1 WHERE id = 7;
COMMIT;
```

> 🔁 **Follow-up:** isolation anomalies and JPA `@Version` are covered in the Spring track (transactions module).

### ITEM sql-normalization | Normalization (1NF, 2NF, 3NF) and when to denormalize | good
ask: What is normalization? When would you denormalize?
card: Normalization removes duplicate data to avoid update anomalies. 1NF = atomic values, no repeating groups. 2NF = no column depends on only part of a composite key. 3NF = no column depends on another non-key column (no transitive dependency). Denormalize (duplicate data on purpose) for read-heavy paths: reporting tables, cached counts, read models (CQRS), NoSQL documents; accept extra work to keep copies in sync.

> 🧒 **Like you're 5:** Normalized = write each friend's phone number in ONE place, so when it changes you fix it once. Denormalized = copy it onto every party invitation for speed, and remember to update every copy when it changes.

| Form | Rule | Bad example |
|---|---|---|
| 1NF | One value per cell | `phones = "98..., 99..."` |
| 2NF | Depends on the whole key | `order_items(order_id, product_id, product_name)` → product_name depends only on product_id |
| 3NF | No key → non-key → non-key | `employee(id, dept_id, dept_name)` |

## MODULE sql-scale | Scaling & NoSQL

### ITEM sql-replication | Replication, read replicas and sharding | good
ask: How do you scale a relational database? Replication vs sharding.
card: First: indexes, query fixes, caching, connection pooling. Vertical scaling (bigger machine). Read replicas: primary takes writes, replicas copy changes asynchronously and serve reads; watch replication lag (read-your-writes issues). Sharding: split rows across databases by a shard key (user_id hash); scales writes but makes cross-shard joins/transactions hard and resharding painful. Partitioning = splitting a table inside one DB (e.g. by month).
patterns: sharding, eventual

> 🧒 **Like you're 5:** Replication = photocopying the library's books into branch libraries so more people can read (but new books reach branches a bit late). Sharding = splitting the books: A–M in one building, N–Z in another.

```diagram
Writes → [Primary] ──async copy──► [Replica 1] ← reads
                    └──────────────► [Replica 2] ← reads
Sharding:  user_id % 4 → shard 0 | shard 1 | shard 2 | shard 3
```

> ⚠️ **Trap:** After a user updates their profile, reading from a lagging replica shows the old value. Fix: read your own writes from the primary for a few seconds, or route that user's reads to primary.

### ITEM sql-vs-nosql | SQL vs NoSQL: how do you choose? | must
ask: When would you choose a NoSQL database over a relational database?
card: SQL (Postgres, MySQL): structured data, relations/joins, strong consistency, ACID transactions, flexible queries: the default for orders, payments, users. NoSQL types: key-value (Redis, DynamoDB) for fast lookups/caching/sessions; document (MongoDB) for flexible nested data; wide-column (Cassandra) for huge write volume and time series; graph (Neo4j) for relationships. Choose by access patterns, consistency needs and scale, not hype.

> 🧒 **Like you're 5:** SQL is a neat filing cabinet with labelled folders that cross-reference each other. NoSQL is a set of special boxes: a key box (find by name super fast), a scrapbook (each page any shape), a giant log book (write very fast, all day).

| Need | Pick |
|---|---|
| Money, orders, complex queries, joins | PostgreSQL / MySQL |
| Cache, sessions, rate limits, leaderboards | Redis |
| Known access patterns at massive scale, serverless | DynamoDB |
| Very high write throughput, time series, multi-region | Cassandra |
| Flexible product catalog / CMS documents | MongoDB |

> 🎯 **Say this in the interview:** "I start with Postgres unless the access pattern or scale clearly needs something else. NoSQL makes you design the data model around the queries up front."
