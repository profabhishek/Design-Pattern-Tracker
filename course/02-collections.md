# TRACK collections
title: Collections & Generics
icon: 📦
color: #10b981
tier: must
about: HashMap internals, ConcurrentHashMap, equals/hashCode, iterators and generics. Asked in almost every Java round.

## MODULE coll-core | Collections

### ITEM coll-list-set | ArrayList vs LinkedList; HashSet vs TreeSet vs LinkedHashSet | must
ask: ArrayList vs LinkedList; HashSet vs TreeSet vs LinkedHashSet.
card: ArrayList = resizable array: O(1) get by index, O(1) amortized add at end, slow insert in middle; best default. LinkedList = doubly linked nodes: O(1) add/remove at ends, O(n) get, more memory, rarely better. HashSet = no order, O(1). LinkedHashSet = insertion order, O(1). TreeSet = sorted (red-black tree), O(log n).

> 🧒 **Like you're 5:** ArrayList is a row of numbered lockers: jump to locker 57 instantly. LinkedList is a treasure hunt: each clue tells you where the next one is, so finding #57 means walking 57 clues.

| | ArrayList | LinkedList |
|---|---|---|
| `get(i)` | **O(1)** | O(n) |
| add at end | O(1) amortized | O(1) |
| add/remove in middle | O(n) shifting | O(n) to find + O(1) to link |
| Memory | Compact, CPU-cache friendly | 2 extra pointers per element |

| Set | Order | Speed | Null? |
|---|---|---|---|
| `HashSet` | None | O(1) | One null |
| `LinkedHashSet` | Insertion order | O(1) | One null |
| `TreeSet` | Sorted (or Comparator) | O(log n) | No null |

> 🎯 **Say this in the interview:** "I default to ArrayList; LinkedList almost never wins in practice because of cache misses. For sets I pick by the order I need: none → HashSet, insertion → LinkedHashSet, sorted/range queries → TreeSet."

> 💡 **Tip:** ArrayList grows by 1.5× when full (copying the array). If you know the size, `new ArrayList<>(expectedSize)`.

### ITEM coll-maps | HashMap vs Hashtable vs ConcurrentHashMap | must
ask: HashMap vs Hashtable vs ConcurrentHashMap.
card: HashMap: not thread-safe, allows one null key and null values, fastest. Hashtable: legacy, every method synchronized (one lock for the whole map), no nulls: don't use. ConcurrentHashMap: thread-safe with fine-grained locking (CAS + lock per bucket), lock-free reads, no nulls, atomic compute/merge: use it for shared maps.

> 🧒 **Like you're 5:** HashMap is a notebook with no rules: two kids writing at once can tear pages. Hashtable is a notebook in a room where only one kid may enter at a time (slow queue). ConcurrentHashMap gives each page its own little lock, so many kids write on different pages together.

| | HashMap | Hashtable | ConcurrentHashMap |
|---|---|---|---|
| Thread-safe | ❌ | ✅ (one big lock) | ✅ (per-bucket locks, CAS) |
| Null key/value | 1 null key, null values | ❌ | ❌ |
| Iterator | Fail-fast | Fail-fast (Enumeration is not) | Weakly consistent, never throws CME |
| Speed | Fastest | Slow under contention | Fast under contention |

> ⚠️ **Trap:** `Collections.synchronizedMap(map)` is like Hashtable (one lock), and compound actions like "check then put" are still not atomic. Use `ConcurrentHashMap.computeIfAbsent` / `merge`.

```java
ConcurrentHashMap<String, Integer> hits = new ConcurrentHashMap<>();
hits.merge("/orders", 1, Integer::sum);      // atomic increment, no lost updates
```

> 🔁 **Follow-up:** "Why no nulls in ConcurrentHashMap?" Because `get(k) == null` would be ambiguous (missing or null?) and you can't check `containsKey` atomically in between.

### ITEM coll-hashmap-internals | How does HashMap work internally? | must
ask: How does HashMap work internally? Collision handling, resizing and treeification.
card: Array of buckets (default 16). index = (hash ^ hash>>>16) & (n-1). Same bucket = collision → linked list; when a bucket has > 8 entries and the table >= 64, it turns into a red-black tree (O(log n)). When size > capacity × 0.75 (load factor), the table doubles and entries are split. get: find bucket, then equals() to find the key. Average O(1).

> 🧒 **Like you're 5:** A wall of 16 mailboxes. To post a letter you turn the name into a number (hashCode) and pick a mailbox. If two letters land in the same box, they're stacked in a pile. If one pile gets too tall, it's reorganised into a sorted folder so finding things stays quick. When the wall is 75% full, the post office builds a wall twice as big.

```diagram
put("cat", 1):
  hashCode("cat") → spread bits → & (16-1) → bucket 5
bucket[5]: ("cat",1) → ("act",9)        ← collision: list, then tree if > 8
size > 16 × 0.75 = 12  → resize to 32, entries split between i and i+16
```

#### Step by step: `put(key, value)`
1. `hash = key.hashCode() ^ (h >>> 16)` (mix high bits into low bits).
2. `index = hash & (capacity - 1)` (capacity is always a power of 2, so this is a fast modulo).
3. Empty bucket → put a node. Otherwise walk the bucket: same hash **and** `equals` → replace value; else append.
4. Bucket length > 8 (and capacity ≥ 64) → **treeify**. Back below 6 → untreeify.
5. `++size > threshold` → **resize** ×2.

> 🎯 **Say this in the interview:** "Buckets array, hash spreading, index by bitmask, chaining with treeification since Java 8 to cap worst case at O(log n), resize at 0.75 load. And keys must have consistent equals/hashCode and be immutable."

> ⚠️ **Trap:** HashMap is not thread-safe. Concurrent puts can lose data (and in Java 7 a resize could even create an infinite loop).

### ITEM coll-equals-hashcode | equals() and hashCode() contract; mutable keys | must
ask: What is the equals() and hashCode() contract? What happens with mutable keys in a HashMap?
card: If a.equals(b) then a.hashCode() == b.hashCode() (the reverse need not be true). Override both together, using the same fields. If you mutate a key's fields after putting it in a HashMap, its hash changes, it sits in the wrong bucket, and get() can't find it anymore (a leak). Use immutable keys (String, records).

> 🧒 **Like you're 5:** hashCode is the mailbox number, equals is checking the name on the letter. If two letters are "the same" but go to different mailboxes, you'll never find the twin. And if you rename a letter after posting it, it's in the wrong mailbox forever.

```java
record UserKey(String email, String tenant) {}   // records generate correct equals + hashCode

class Point {                                    // manual version
    final int x, y;
    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Point p)) return false;
        return x == p.x && y == p.y;
    }
    @Override public int hashCode() { return Objects.hash(x, y); }
}
```

```java
// the mutable key bug
List<String> key = new ArrayList<>(List.of("a"));
Map<List<String>, Integer> m = new HashMap<>();
m.put(key, 1);
key.add("b");              // hashCode changed!
m.get(key);                // null 😱  (entry is stuck in the old bucket)
```

> ⚠️ **Trap:** Override `equals` without `hashCode` → two "equal" objects both get added to a HashSet. JPA entities: base equals/hashCode on a business key or the id carefully (id is null before save).

### ITEM coll-comparator-iterators | Comparable vs Comparator; fail-fast vs fail-safe iterators | must
ask: Comparable vs Comparator; fail-fast vs fail-safe iterators.
card: Comparable = the natural order inside the class (compareTo), one only. Comparator = an external, pluggable order (many possible): Comparator.comparing(Employee::salary).reversed().thenComparing(Employee::name). Fail-fast iterators (ArrayList, HashMap) throw ConcurrentModificationException if the collection changes during iteration (modCount check). Fail-safe/weakly consistent (ConcurrentHashMap, CopyOnWriteArrayList) work on a snapshot or tolerate changes.

> 🧒 **Like you're 5:** Comparable is a kid's own rule: "I line up by my roll number". Comparator is the teacher saying "today line up by height, tallest first".

```java
class Employee implements Comparable<Employee> {
    public int compareTo(Employee o) { return Integer.compare(id, o.id); }   // natural order
}
employees.sort(Comparator.comparing(Employee::getDept)
                         .thenComparing(Employee::getSalary, Comparator.reverseOrder()));
```

```java
for (String s : list) if (s.isEmpty()) list.remove(s);      // 💥 ConcurrentModificationException
list.removeIf(String::isEmpty);                              // ✅
Iterator<String> it = list.iterator();
while (it.hasNext()) if (it.next().isEmpty()) it.remove();   // ✅
```

> ⚠️ **Trap:** Never write `return a.salary - b.salary` in a comparator: int overflow gives wrong order. Use `Integer.compare`.

### ITEM coll-basics | Collection vs Collections; List vs Set vs Map | good
ask: Collection vs Collections; List vs Set vs Map.
card: Collection = the root interface (List, Set, Queue extend it). Collections = a utility class with static helpers (sort, unmodifiableList, synchronizedMap, emptyList). List = ordered, duplicates allowed, index access. Set = no duplicates. Map = key → value pairs, not a Collection.

> 🧒 **Like you're 5:** A List is a shopping list: order matters and you can write "eggs" twice. A Set is a guest list: each name only once. A Map is a phone book: name → number.

```diagram
Iterable
└── Collection
    ├── List   → ArrayList, LinkedList, CopyOnWriteArrayList
    ├── Set    → HashSet, LinkedHashSet, TreeSet
    └── Queue  → ArrayDeque, PriorityQueue, LinkedList, BlockingQueue
Map (separate) → HashMap, LinkedHashMap, TreeMap, ConcurrentHashMap
```

> 💡 **Tip:** `List.of(...)` (Java 9) is immutable and rejects nulls. `Arrays.asList(...)` is fixed-size but you can `set` elements. `Collections.unmodifiableList(x)` is a read-only *view*: changes to x still show through.

### ITEM coll-chm-safety | How does ConcurrentHashMap provide thread safety? | must
ask: How does ConcurrentHashMap provide thread safety?
card: Java 8+: no segments. Reads are lock-free (volatile reads of nodes). Writing to an empty bucket uses CAS (compare-and-swap). Writing to a non-empty bucket locks only that bucket's first node (synchronized). Resizing is done cooperatively by several threads. size() uses striped counters (LongAdder style). compute/merge/putIfAbsent are atomic per key.

> 🧒 **Like you're 5:** A library where everyone can read any book at any time. To write in a book you only lock that one book, not the whole library. And to put a book on an empty shelf, you just grab the spot if it's still empty (CAS) without locking anything.

| Java version | How it locked |
|---|---|
| Java 7 | 16 **segments**, each a mini Hashtable with its own lock |
| Java 8+ | **Per-bucket**: CAS for empty bins, `synchronized` on the bin head otherwise; treeified bins too |

```java
// counting words from many threads safely
ConcurrentHashMap<String, LongAdder> freq = new ConcurrentHashMap<>();
freq.computeIfAbsent(word, k -> new LongAdder()).increment();
```

> ⚠️ **Trap:** Each single call is atomic, but `if (!map.containsKey(k)) map.put(k, v)` across two calls is a race. Use `putIfAbsent` / `computeIfAbsent`.

### ITEM coll-generics | Generics, wildcards, extends vs super, type erasure | must
ask: Generics, wildcards, extends vs super, type erasure.
card: Generics give compile-time type safety (List<String>). ? extends T = you can READ T from it (producer). ? super T = you can WRITE T into it (consumer). PECS: Producer Extends, Consumer Super. Type erasure: generic types are removed at compile time (List<String> becomes List at runtime), so no new T(), no instanceof List<String>, no primitive type params.

> 🧒 **Like you're 5:** `List<? extends Fruit>` is a basket "of some kind of fruit". You can take out a fruit, but you can't put an apple in, because maybe it's a basket of only bananas. `List<? super Apple>` is a box that can hold apples (maybe it's a fruit box or even an anything box). You can put apples in, but when you take something out you only know it's an Object.

```java
// PECS in the JDK itself:
public static <T> void copy(List<? super T> dest, List<? extends T> src)

double sum(List<? extends Number> nums) {        // works for List<Integer>, List<Double>
    double s = 0; for (Number n : nums) s += n.doubleValue(); return s;
}
void addInts(List<? super Integer> out) { out.add(42); }   // works for List<Number>, List<Object>
```

> 🎯 **Say this in the interview:** "Generics are a compile-time feature. Because of erasure, at runtime `List<String>` and `List<Integer>` are the same class, which is why frameworks like Jackson need `TypeReference<List<User>>` to keep the type."
