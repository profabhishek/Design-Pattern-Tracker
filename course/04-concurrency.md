# TRACK concurrency
title: Multithreading & Concurrency
icon: 🧵
color: #f43f5e
tier: must
about: Threads, locks, executors, CompletableFuture and virtual threads. The round that separates 3-YOE candidates.

## MODULE threads | Threads & locks

### ITEM cc-thread-basics | Process vs thread, thread lifecycle, Runnable vs Callable | must
ask: Process vs thread; thread lifecycle; Runnable vs Callable.
card: Process = a running program with its own memory. Thread = a worker inside a process sharing its heap, each with its own stack. Lifecycle: NEW → RUNNABLE → (BLOCKED / WAITING / TIMED_WAITING) → TERMINATED. Runnable.run() returns nothing and can't throw checked exceptions; Callable.call() returns a value and can throw, used with ExecutorService.submit → Future.

> 🧒 **Like you're 5:** A process is a restaurant. Threads are the cooks in its one kitchen: they share the fridge (heap) but each has their own chopping board (stack). Two restaurants don't share a fridge.

```diagram
NEW --start()--> RUNNABLE --(waits for a lock)--> BLOCKED
                    │  ↑ ──(wait()/join()/park)--> WAITING
                    │  └──(sleep(ms)/wait(ms))---> TIMED_WAITING
                    └── run() ends --> TERMINATED
```

```java
Runnable task = () -> System.out.println("no result");
Callable<Integer> job = () -> 6 * 7;                     // returns a value, may throw
try (ExecutorService ex = Executors.newFixedThreadPool(2)) {
    Future<Integer> f = ex.submit(job);
    System.out.println(f.get());                         // 42, waits if needed
}
```

> ⚠️ **Trap:** Calling `thread.run()` runs the code on the **current** thread. Only `start()` creates a new thread.

### ITEM cc-sync-volatile | synchronized vs volatile; intrinsic lock vs ReentrantLock | must
ask: synchronized vs volatile; intrinsic lock vs ReentrantLock.
card: volatile = visibility only: every read sees the latest write, no caching, no reordering around it; NOT atomic for count++. synchronized = mutual exclusion + visibility: only one thread in the block per monitor. ReentrantLock = an explicit lock with extras: tryLock (with timeout), lockInterruptibly, fairness, multiple Conditions; you must unlock in finally.

> 🧒 **Like you're 5:** `volatile` is a whiteboard everyone can see: when someone writes, everyone sees it instantly. But two kids can still erase-and-write at the same moment. `synchronized` is a bathroom key: only one person inside at a time.

```java
class Counter {
    private volatile boolean running = true;   // ✅ a stop flag: visibility is enough
    private int count = 0;
    synchronized void inc() { count++; }        // ✅ read-modify-write needs a lock
}

ReentrantLock lock = new ReentrantLock();
if (lock.tryLock(200, TimeUnit.MILLISECONDS)) {
    try { /* critical section */ } finally { lock.unlock(); }   // ALWAYS unlock in finally
}
```

| | synchronized | ReentrantLock |
|---|---|---|
| Unlock | Automatic | Manual (`finally`) |
| Try with timeout | ❌ | ✅ `tryLock(t)` |
| Interruptible wait | ❌ | ✅ |
| Fairness | ❌ | Optional |
| Conditions | one (wait/notify) | many `newCondition()` |

> 🎯 **Say this in the interview:** "`count++` is three steps: read, add, write. volatile doesn't make that atomic. I'd use AtomicInteger for a counter, synchronized for small critical sections, and ReentrantLock when I need tryLock or timeouts."

### ITEM cc-atomic | AtomicInteger and CAS; race condition; deadlock and livelock | must
ask: AtomicInteger and CAS; race condition; deadlock and livelock.
card: Race condition = the result depends on thread timing (lost updates on count++). CAS (compare-and-swap) = a CPU instruction: "set to new value only if it's still the old value", retry if not: lock-free. AtomicInteger/AtomicLong/LongAdder use it. Deadlock = threads wait for each other's locks forever (fix: always lock in the same order, use tryLock timeouts). Livelock = threads keep reacting to each other and make no progress.

> 🧒 **Like you're 5:** **Deadlock:** two kids, one holds the crayon and wants the paper, the other holds the paper and wants the crayon. Nobody lets go. **Livelock:** two people in a corridor both keep stepping aside the same way, forever.

```java
// deadlock recipe
Thread 1: synchronized(a) { synchronized(b) { ... } }
Thread 2: synchronized(b) { synchronized(a) { ... } }   // opposite order 💥
// fix: everyone locks a then b (e.g. order by account id)
```

| Need | Use |
|---|---|
| Simple shared counter | `AtomicInteger` / `AtomicLong` |
| Very hot counter, many writers | `LongAdder` (spreads contention) |
| Update an object reference atomically | `AtomicReference` + `updateAndGet` |

> 🏭 **At work:** In a money transfer, lock both accounts ordered by account id to avoid deadlock. Even better: let the database do it with row locks or optimistic locking.

```java starter
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

class SafeCounter {
    // TODO: make increment() thread-safe (no lost updates)
    private int count = 0;
    public void increment() { throw new UnsupportedOperationException("TODO"); }
    public int get() { return count; }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        T.eq("8 threads x 20,000 increments", () -> {
            SafeCounter c = new SafeCounter();
            java.util.List<Thread> ts = new java.util.ArrayList<>();
            for (int t = 0; t < 8; t++) {
                Thread th = new Thread(() -> { for (int i = 0; i < 20_000; i++) c.increment(); });
                ts.add(th); th.start();
            }
            for (Thread th : ts) { try { th.join(); } catch (InterruptedException e) { throw new RuntimeException(e); } }
            return c.get();
        }, 160000);
        T.eq("starts at zero", () -> new SafeCounter().get(), 0);
        T.done();
    }
}
```

```java solution
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

class SafeCounter {
    private final AtomicInteger count = new AtomicInteger();   // CAS, lock-free
    public void increment() { count.incrementAndGet(); }
    public int get() { return count.get(); }
}
```

```hint
count++ is read + add + write. Two threads can read the same old value. Look at java.util.concurrent.atomic.
```

### ITEM cc-wait-notify | wait(), notify(), notifyAll(); sleep() vs wait() | good
ask: wait(), notify(), notifyAll(); sleep() vs wait().
card: wait() releases the monitor and sleeps until notify/notifyAll; must be called inside synchronized on the same object, always in a while loop (spurious wakeups). notify wakes one waiter, notifyAll wakes all (safer). sleep() pauses the thread but KEEPS any locks it holds; it's a Thread static method, not tied to a monitor. Modern code prefers BlockingQueue, CountDownLatch, Condition.

> 🧒 **Like you're 5:** `wait()` is a kid who gives back the toy and naps until someone says "your turn!". `sleep()` is a kid who naps while still hugging the toy, so nobody else can play with it.

```java
synchronized (queue) {
    while (queue.isEmpty()) queue.wait();     // while, not if!
    item = queue.poll();
    queue.notifyAll();
}
```

| | `sleep()` | `wait()` |
|---|---|---|
| Class | `Thread` (static) | `Object` |
| Releases lock? | ❌ No | ✅ Yes |
| Needs synchronized? | No | Yes, else `IllegalMonitorStateException` |
| Wakes up | After time | notify/notifyAll/timeout/interrupt |

## MODULE executors | Executors, futures & coordination

### ITEM cc-executor | ExecutorService, thread pool sizing, rejection policies, graceful shutdown | must
ask: ExecutorService; thread pool sizing; rejection policies; graceful shutdown.
card: ThreadPoolExecutor(core, max, keepAlive, queue, factory, rejectionHandler). Tasks fill core threads, then the queue, then extra threads up to max, then get rejected. Sizing: CPU-bound ≈ number of cores; IO-bound ≈ cores × (1 + wait/compute). Rejection policies: Abort (exception, default), CallerRuns (back-pressure), Discard, DiscardOldest. Shutdown: shutdown() then awaitTermination(), then shutdownNow() if it times out.

> 🧒 **Like you're 5:** A bakery with 4 bakers (core). Extra orders wait on a counter (queue). If the counter is full, they call in temporary bakers (max). If even that's full, the shop says "sorry" (rejection), or makes the customer bake it themselves (CallerRuns).

```java
ThreadPoolExecutor pool = new ThreadPoolExecutor(
    8, 16, 60, TimeUnit.SECONDS,
    new ArrayBlockingQueue<>(500),                       // BOUNDED queue
    Thread.ofPlatform().name("orders-", 0).factory(),    // named threads help thread dumps
    new ThreadPoolExecutor.CallerRunsPolicy());          // back-pressure instead of failing

// graceful shutdown
pool.shutdown();
if (!pool.awaitTermination(30, TimeUnit.SECONDS)) pool.shutdownNow();
```

> ⚠️ **Trap:** `Executors.newFixedThreadPool(n)` uses an **unbounded** queue: under load, tasks pile up until OutOfMemoryError. `newCachedThreadPool()` can create unlimited threads. In production, build `ThreadPoolExecutor` with a bounded queue.

> 🏭 **In Spring:** configure `ThreadPoolTaskExecutor` for `@Async`, and give each downstream dependency its own pool (bulkhead).

### ITEM cc-completable | Future vs CompletableFuture; thenApply vs thenCompose; allOf vs anyOf | must
ask: Future vs CompletableFuture; thenApply vs thenCompose; allOf vs anyOf.
card: Future: you can only block with get(). CompletableFuture: chain callbacks without blocking, combine, handle errors. thenApply = map the result (T → U). thenCompose = flatMap when the function itself returns a CompletableFuture (avoids CF<CF<U>>). thenCombine = merge two independent futures. allOf = wait for all; anyOf = first to finish. exceptionally/handle = error handling. Pass your own executor for IO.

> 🧒 **Like you're 5:** A `Future` is a receipt: you stand at the counter waiting. A `CompletableFuture` is a buzzer that also says "when the pizza is ready, put it in a box, then deliver it", and you go sit down.

```java
ExecutorService io = Executors.newFixedThreadPool(20);
CompletableFuture<User> user = CompletableFuture.supplyAsync(() -> userClient.get(id), io);
CompletableFuture<List<Order>> orders = CompletableFuture.supplyAsync(() -> orderClient.forUser(id), io);

CompletableFuture<Dashboard> dash = user.thenCombine(orders, Dashboard::new)       // both in parallel
    .orTimeout(2, TimeUnit.SECONDS)
    .exceptionally(ex -> Dashboard.empty());                                        // fallback

CompletableFuture<Address> addr = user.thenCompose(u -> addressClient.async(u.addressId())); // flatMap
CompletableFuture.allOf(user, orders).join();
```

> 🎯 **Say this in the interview:** "I used CompletableFuture to call 3 services in parallel for a dashboard API, cutting latency from the sum of the calls to the slowest one, with orTimeout and a fallback for each."

```java starter
import java.util.*;
import java.util.concurrent.*;

class Solution {
    // Sum each chunk in parallel with CompletableFuture.supplyAsync, then add the partial sums.
    public long parallelSum(List<List<Integer>> chunks) {
        // TODO
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("three chunks", () -> s.parallelSum(java.util.List.of(java.util.List.of(1, 2, 3), java.util.List.of(4, 5), java.util.List.of(6))), 21L);
        T.eq("big", () -> {
            java.util.List<java.util.List<Integer>> ch = new java.util.ArrayList<>();
            for (int c = 0; c < 10; c++) { java.util.List<Integer> l = new java.util.ArrayList<>(); for (int i = 1; i <= 1000; i++) l.add(i); ch.add(l); }
            return s.parallelSum(ch);
        }, 5005000L);
        T.eq("empty", () -> s.parallelSum(java.util.List.of()), 0L);
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.concurrent.*;

class Solution {
    public long parallelSum(List<List<Integer>> chunks) {
        List<CompletableFuture<Long>> parts = chunks.stream()
                .map(chunk -> CompletableFuture.supplyAsync(
                        () -> chunk.stream().mapToLong(Integer::longValue).sum()))
                .toList();
        CompletableFuture.allOf(parts.toArray(new CompletableFuture[0])).join();   // wait for all
        return parts.stream().mapToLong(CompletableFuture::join).sum();
    }
}
```

### ITEM cc-chm-blocking | ConcurrentHashMap internals, BlockingQueue, producer-consumer | must
ask: ConcurrentHashMap internals; BlockingQueue; producer-consumer problem.
card: BlockingQueue (ArrayBlockingQueue bounded, LinkedBlockingQueue optionally bounded) handles the locking for you: put() blocks when full, take() blocks when empty. Producer-consumer = producers put work in a bounded queue, consumers take it; the bound gives back-pressure. ConcurrentHashMap: lock-free reads, CAS on empty bins, synchronized per bin on writes.

> 🧒 **Like you're 5:** A conveyor belt with room for 10 boxes. Packers (producers) wait if the belt is full; shippers (consumers) wait if it's empty. Nobody needs to shout at each other, the belt handles it.

```java
BlockingQueue<Order> q = new ArrayBlockingQueue<>(100);
Runnable producer = () -> { while (true) q.put(nextOrder()); };     // blocks when full
Runnable consumer = () -> { while (true) process(q.take()); };     // blocks when empty
```

> 🏭 **This is exactly** what Kafka does between services, what a ThreadPoolExecutor's queue does inside your app, and how log appenders work asynchronously.

### ITEM cc-latch | CountDownLatch vs CyclicBarrier vs Semaphore | must
ask: CountDownLatch vs CyclicBarrier vs Semaphore.
card: CountDownLatch(n): threads await() until countDown() is called n times; one-shot, can't reset. CyclicBarrier(n): n threads wait for EACH OTHER at a point, then all continue; reusable. Semaphore(n): n permits; acquire() takes one (blocks if none), release() gives it back; limits concurrent access (e.g. max 10 calls to a slow API).

> 🧒 **Like you're 5:** **Latch:** a rocket launch waits until 3 checks say "ready" (count down to zero). **Barrier:** friends on a hike wait at every checkpoint until the whole group arrives, then walk on together. **Semaphore:** a parking lot with 10 spots; you wait for a free spot.

```java
CountDownLatch ready = new CountDownLatch(3);
// each of 3 services: ready.countDown();
ready.await(5, TimeUnit.SECONDS);      // main thread waits for all 3

Semaphore limit = new Semaphore(10);   // at most 10 parallel calls to the bank API
limit.acquire();
try { bankApi.call(); } finally { limit.release(); }
```

### ITEM cc-threadlocal | ThreadLocal use cases and memory-leak risks | must
ask: ThreadLocal use cases and memory-leak risks.
card: ThreadLocal gives each thread its own copy of a variable: request context (user id, trace id, MDC logging), SimpleDateFormat (not thread-safe), Spring's transaction and security context. Risk: in thread pools threads live forever, so a value left behind leaks memory and LEAKS DATA into the next request. Always remove() in finally (e.g. in a filter). With virtual threads prefer ScopedValue (preview/Java 21+).

> 🧒 **Like you're 5:** Each worker has their own personal locker. Handy! But workers in a pool never go home. If you leave yesterday's customer's papers in the locker, the next customer might see them.

```java
public class RequestContext {
    private static final ThreadLocal<String> USER = new ThreadLocal<>();
    public static void set(String u) { USER.set(u); }
    public static String get() { return USER.get(); }
    public static void clear() { USER.remove(); }
}
// in a servlet Filter:
try { RequestContext.set(userFromToken); chain.doFilter(req, res); }
finally { RequestContext.clear(); }        // never skip this
```

> ⚠️ **Trap:** `@Async` methods and CompletableFuture run on other threads: ThreadLocal values (and MDC trace ids, SecurityContext) don't follow automatically. Use a TaskDecorator to copy them.

### ITEM cc-virtual | Virtual threads vs platform threads; when not to use them | must
ask: Virtual threads vs platform threads; when not to use virtual threads.
card: Platform thread = 1:1 with an OS thread (~1 MB stack, a few thousand max). Virtual thread (Java 21) = lightweight, managed by the JVM, mounted on a few carrier threads; when it blocks on IO it unmounts, so millions are possible. Great for blocking IO (thread-per-request). Not for CPU-heavy work (no speed-up), don't pool them, watch for pinning (synchronized + blocking IO pins the carrier before Java 24) and ThreadLocal-heavy code. Spring Boot 3.2+: spring.threads.virtual.enabled=true.

> 🧒 **Like you're 5:** Platform threads are full-size buses with a driver each: expensive, you can only have a few. Virtual threads are passengers. When a passenger waits at a stop (IO), they step off and the bus keeps driving with other passengers.

```java
try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 100_000; i++) exec.submit(() -> callSlowApi());   // fine!
}
Thread.ofVirtual().start(() -> System.out.println("hi from a virtual thread"));
```

| Use virtual threads | Avoid / be careful |
|---|---|
| REST calls, DB calls, file IO | CPU-bound number crunching |
| Thread-per-request web servers | Pooling them (just create new ones) |
| Replacing complex async code with simple blocking code | `synchronized` around blocking IO (pinning, pre-Java 24) → use ReentrantLock |
| | Huge ThreadLocal caches per thread |

> 🎯 **Say this in the interview:** "Virtual threads make blocking code scale like reactive code without the callback complexity. The DB connection pool is still the real limit, so I'd also cap concurrency with a Semaphore or pool size."
