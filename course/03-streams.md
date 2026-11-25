# TRACK streams
title: Java Streams
icon: 🌊
color: #06b6d4
tier: must
about: 16 hands-on Stream coding problems on an Employee list (auto-graded) plus the concepts interviewers dig into.

## MODULE stream-concepts | Stream API concepts

### ITEM st-map-flatmap | map vs flatMap, filter vs map, findFirst vs findAny | must
ask: map() vs flatMap(); filter() vs map(); findFirst() vs findAny().
card: map = one input → one output (transform). flatMap = one input → a stream of outputs, flattened into one stream (List<List<T>> → T). filter = keep or drop (same type, fewer items). findFirst = first in encounter order (deterministic). findAny = any element, faster in parallel streams.

> 🧒 **Like you're 5:** `map` puts every apple through a juicer: one apple, one glass. `flatMap` opens every lunch box and pours all the snacks onto one big table. `filter` is a bouncer who only lets some people in.

```java
List<String> names = employees.stream().map(Employee::name).toList();                 // map
List<String> skills = devs.stream().flatMap(d -> d.skills().stream()).distinct().toList(); // flatMap
List<Employee> rich = employees.stream().filter(e -> e.salary() > 100_000).toList();    // filter
Optional<Employee> any = employees.parallelStream().filter(e -> e.age() > 40).findAny();
```

> ⚠️ **Trap:** `map(d -> d.skills())` gives `Stream<List<String>>`, a stream of lists. That's the moment you need `flatMap`.

### ITEM st-lazy | Intermediate vs terminal operations, lazy evaluation, short-circuiting | must
ask: Intermediate vs terminal operations; lazy evaluation; short-circuiting.
card: Intermediate ops (filter, map, sorted, distinct, limit) return a new Stream and do nothing until a terminal op runs. Terminal ops (collect, forEach, count, reduce, findFirst, anyMatch) trigger the pipeline. Lazy = elements flow one by one through all steps, only as many as needed. Short-circuiting ops (limit, findFirst, anyMatch) can stop early, even on infinite streams.

> 🧒 **Like you're 5:** Intermediate operations are a recipe written on paper. Nothing gets cooked until someone orders the food (the terminal operation). And the kitchen only cooks as many plates as were ordered.

```java
Stream.of("a", "bb", "ccc", "dddd")
      .filter(s -> { System.out.println("filter " + s); return s.length() > 1; })
      .map(s -> { System.out.println("map " + s); return s.toUpperCase(); })
      .findFirst();
// prints: filter a, filter bb, map bb  ← stops! "ccc" and "dddd" never touched
```

> 🎯 **Say this in the interview:** "Streams are lazy and vertical: each element goes through the whole pipeline before the next, which is what lets `findFirst` or `limit` short-circuit. Stateful ops like `sorted` are the exception: they must see everything first."

### ITEM st-pipeline | How does a Stream pipeline execute? Can a stream be reused? | must
ask: How does a Stream pipeline execute? Can a stream be reused?
card: Source → zero or more intermediate ops → one terminal op. The ops are fused into one pass per element (except stateful ops like sorted/distinct, which buffer). A stream can be consumed only ONCE: a second terminal op throws IllegalStateException ("stream has already been operated upon or closed"). Use a Supplier<Stream<T>> or re-create it from the collection.

> 🧒 **Like you're 5:** A stream is like a water slide ride. Once you've gone down, the ride is over. Want another go? Climb the stairs again (make a new stream).

```java
Stream<String> s = names.stream();
s.count();
s.count();            // 💥 IllegalStateException

Supplier<Stream<String>> fresh = names::stream;
fresh.get().count();  // ✅
fresh.get().count();  // ✅
```

> 💡 **Tip:** Streams don't store data and don't modify the source. Don't change the source list inside a lambda (interference).

### ITEM st-tomap-dup | Collectors.toMap with duplicate keys | must
ask: What happens in Collectors.toMap() when duplicate keys exist?
card: It throws IllegalStateException: Duplicate key. Fix: pass a merge function as the 3rd argument, e.g. toMap(Employee::dept, Employee::salary, Double::sum) or (a, b) -> a to keep the first. 4th argument picks the map type (LinkedHashMap::new / TreeMap::new). Also toMap throws NPE on null values.

> 🧒 **Like you're 5:** Two kids want the same locker. Java panics unless you tell it the rule: "share it", "first kid wins" or "add their toys together".

```java
Map<String, Double> totalByDept = employees.stream()
    .collect(Collectors.toMap(Employee::dept, Employee::salary, Double::sum, TreeMap::new));
```

> ⚠️ **Trap:** `toMap` with a null value → `NullPointerException` (it uses `HashMap.merge`). Filter nulls first or use `groupingBy`.

### ITEM st-grouping | groupingBy vs partitioningBy; reducing vs summingInt | must
ask: groupingBy() vs partitioningBy(); reducing() vs summingInt().
card: groupingBy(classifier) → Map<K, List<T>> with any number of keys; add a downstream collector (counting, summingDouble, mapping, maxBy). partitioningBy(predicate) → Map<Boolean, List<T>> with ALWAYS both true and false keys. summingInt is a simple specialised sum; reducing is the general fold (identity, mapper, combiner); prefer the specialised ones for readability.

> 🧒 **Like you're 5:** `groupingBy` sorts toys into as many boxes as there are colours. `partitioningBy` only has two boxes: "yes" and "no".

```java
Map<String, Long> countByDept = emps.stream().collect(groupingBy(Employee::dept, counting()));
Map<String, List<String>> namesByDept = emps.stream().collect(groupingBy(Employee::dept, mapping(Employee::name, toList())));
Map<Boolean, List<Employee>> seniors = emps.stream().collect(partitioningBy(e -> e.age() >= 35));
int total = emps.stream().collect(summingInt(Employee::age));
int same  = emps.stream().collect(reducing(0, Employee::age, Integer::sum));
```

### ITEM st-order | Preserving encounter order; ordered vs unordered streams | good
ask: How do you preserve encounter order? Ordered vs unordered streams.
card: Streams from a List, array or LinkedHashMap are ORDERED; from HashSet/HashMap are UNORDERED. Most ops keep order (map, filter, sorted, limit). forEach on a parallel stream does NOT keep order: use forEachOrdered. groupingBy returns a HashMap: pass LinkedHashMap::new or TreeMap::new to keep key order. unordered() can speed up parallel distinct/limit.

> 🧒 **Like you're 5:** A list is a line of kids: order is known. A set is kids in a playground: no order. If many teachers (parallel) handle the line, ask them to report back in line order (forEachOrdered).

```java
list.parallelStream().forEach(System.out::println);          // random order
list.parallelStream().forEachOrdered(System.out::println);   // original order
emps.stream().collect(groupingBy(Employee::dept, LinkedHashMap::new, toList()));
```

### ITEM st-parallel | Stream vs parallelStream; common ForkJoinPool and thread-safety risks | must
ask: Stream vs parallelStream; common ForkJoinPool and thread-safety risks.
card: parallelStream splits work across the common ForkJoinPool (cores - 1 threads), shared by the whole JVM. Good for CPU-heavy work on big, easily-split data (ArrayList, arrays). Bad for small data, IO/blocking calls (they starve the shared pool), LinkedList, and code with shared mutable state (race conditions). Measure before using it.

> 🧒 **Like you're 5:** Parallel is asking all your friends to help fold 10,000 paper planes: great. Asking them to help fold 3 planes wastes more time explaining than folding. And if they all write on the same notepad at once, the notes get scrambled.

```java
List<Integer> out = new ArrayList<>();
nums.parallelStream().map(x -> x * 2).forEach(out::add);    // 💥 race: lost items, exceptions
List<Integer> ok = nums.parallelStream().map(x -> x * 2).toList();   // ✅ collect instead
```

> ⚠️ **Trap:** Calling REST APIs inside `parallelStream()` in a web app blocks the common pool that CompletableFuture and other code also use. Use your own executor (or virtual threads) for IO.

### ITEM st-checked | Handling checked exceptions inside lambdas | good
ask: How do you handle checked exceptions inside lambda expressions?
card: Standard functional interfaces (Function, Consumer) can't throw checked exceptions. Options: wrap in try/catch inside the lambda and rethrow as an unchecked exception (UncheckedIOException), extract a helper method that does that, or write your own functional interface that declares throws. Don't swallow the exception.

> 🧒 **Like you're 5:** Lambdas made with the standard shapes promise "I never throw scary checked errors". If your code might, you wrap the scary error in a normal box (unchecked) before passing it on.

```java
List<String> contents = paths.stream()
    .map(p -> {
        try { return Files.readString(p); }
        catch (IOException e) { throw new UncheckedIOException(e); }
    })
    .toList();

// reusable wrapper
@FunctionalInterface interface ThrowingFn<T, R> { R apply(T t) throws Exception; }
static <T, R> Function<T, R> unchecked(ThrowingFn<T, R> f) {
    return t -> { try { return f.apply(t); } catch (Exception e) { throw new RuntimeException(e); } };
}
paths.stream().map(unchecked(Files::readString)).toList();
```

### ITEM st-primitive | Primitive streams: IntStream, LongStream, DoubleStream and boxing | good
ask: Primitive streams: IntStream, LongStream, DoubleStream and boxing overhead.
card: Stream<Integer> boxes every number into an Integer object (memory + GC cost). IntStream/LongStream/DoubleStream work on raw primitives and add sum(), average(), max(), summaryStatistics(), range(). Convert with mapToInt / boxed() / mapToObj.

> 🧒 **Like you're 5:** Boxing is putting every single coin in its own gift box before counting. Primitive streams count the coins directly.

```java
int total = emps.stream().mapToInt(Employee::age).sum();
IntSummaryStatistics st = IntStream.of(4, 8, 15, 16, 23, 42).summaryStatistics();
st.getMin(); st.getMax(); st.getAverage();
IntStream.rangeClosed(1, 5).boxed().toList();     // [1, 2, 3, 4, 5]
```

### ITEM st-vs-loop | When should you prefer a loop over Streams? | good
ask: When should you prefer a plain loop over Streams?
card: Use loops when you need early break/continue with complex conditions, checked exceptions, modifying local variables, index-based logic, very hot performance-critical code, or when the stream chain becomes unreadable. Streams shine for declarative transforms: filter/map/group/collect.

> 🧒 **Like you're 5:** A stream is a factory conveyor belt: perfect for doing the same steps to many items. A loop is doing it by hand: better when every item needs special decisions.

> 🎯 **Say this in the interview:** "I choose readability first. Simple transform/aggregate → stream. Stateful, index-heavy, early-exit or exception-heavy logic → loop. For hot paths I benchmark with JMH instead of guessing."

## MODULE stream-coding | Stream coding problems (with compiler)
> 💡 Every challenge here uses the same data: `T.employees()` gives 7 employees as `record Employee(String name, String dept, double salary, int age)`: Asha/Engineering/120000/29, Ravi/Engineering/95000/34, Meera/Engineering/150000/41, John/Sales/60000/25, Priya/Sales/75000/31, Karan/HR/50000/45, Zoya/HR/65000/27. Use `e.name()`, `e.dept()`, `e.salary()`, `e.age()`.

### ITEM sc-nth-salary | Highest, second-highest and Nth-highest salary | must
ask: Using Streams, find the Nth highest distinct salary.
card: emps.stream().map(Employee::salary).distinct().sorted(Comparator.reverseOrder()).skip(n - 1).findFirst() → Optional<Double>. distinct handles ties; Optional handles "not enough salaries".

> 🧒 **Like you're 5:** Line up the different salary amounts from biggest to smallest, step over the first n−1, and grab the next one. If the line is too short, you get an empty box (Optional.empty).

```java starter
import java.util.*;
import java.util.stream.*;

class Solution {
    public Optional<Double> nthHighest(List<Employee> emps, int n) {
        // TODO
        return Optional.empty();
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("highest", () -> s.nthHighest(T.employees(), 1), java.util.Optional.of(150000.0));
        T.eq("second", () -> s.nthHighest(T.employees(), 2), java.util.Optional.of(120000.0));
        T.eq("ties count once", () -> s.nthHighest(java.util.List.of(new Employee("a", "x", 10, 1), new Employee("b", "x", 10, 1), new Employee("c", "x", 5, 1)), 2), java.util.Optional.of(5.0));
        T.eq("too few", () -> s.nthHighest(T.employees(), 10), java.util.Optional.empty());
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.stream.*;

class Solution {
    public Optional<Double> nthHighest(List<Employee> emps, int n) {
        return emps.stream()
                .map(Employee::salary)
                .distinct()
                .sorted(Comparator.reverseOrder())
                .skip(n - 1)
                .findFirst();
    }
}
```

### ITEM sc-top-per-dept | Highest-paid employee in each department | must
ask: Find the name of the highest-paid employee in each department.
card: groupingBy(Employee::dept, collectingAndThen(maxBy(comparingDouble(Employee::salary)), o -> o.get().name())). Or toMap(dept, e -> e, BinaryOperator.maxBy(comparator)) then map values.

> 🧒 **Like you're 5:** Put employees in department boxes, then in each box find the one with the biggest pay cheque and write down their name.

```java starter
import java.util.*;
import java.util.stream.*;

class Solution {
    public Map<String, String> topEarnerByDept(List<Employee> emps) {
        // TODO: dept -> name of highest paid
        return new HashMap<>();
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        T.eq("by dept", () -> new Solution().topEarnerByDept(T.employees()), java.util.Map.of("Engineering", "Meera", "Sales", "Priya", "HR", "Zoya"));
        T.eq("empty", () -> new Solution().topEarnerByDept(java.util.List.of()), java.util.Map.of());
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.stream.*;

class Solution {
    public Map<String, String> topEarnerByDept(List<Employee> emps) {
        return emps.stream().collect(Collectors.groupingBy(
                Employee::dept,
                Collectors.collectingAndThen(
                        Collectors.maxBy(Comparator.comparingDouble(Employee::salary)),
                        top -> top.get().name())));
    }
}
```

### ITEM sc-count-dept | Group employees by department; count per department | must
ask: Count how many employees are in each department.
card: emps.stream().collect(groupingBy(Employee::dept, counting())) → Map<String, Long>. Without the downstream collector you get Map<String, List<Employee>>.

> 🧒 **Like you're 5:** Sort the kids into class rooms, then count heads in each room.

```java starter
import java.util.*;
import java.util.stream.*;

class Solution {
    public Map<String, Long> countByDept(List<Employee> emps) {
        // TODO
        return new HashMap<>();
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        T.eq("counts", () -> new Solution().countByDept(T.employees()), java.util.Map.of("Engineering", 3L, "Sales", 2L, "HR", 2L));
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.stream.*;

class Solution {
    public Map<String, Long> countByDept(List<Employee> emps) {
        return emps.stream().collect(Collectors.groupingBy(Employee::dept, Collectors.counting()));
    }
}
```

### ITEM sc-avg-dept | Average and total salary per department | must
ask: Calculate the average salary in each department.
card: groupingBy(Employee::dept, averagingDouble(Employee::salary)). Sum: summingDouble. All stats at once: summarizingDouble → DoubleSummaryStatistics (count, sum, min, max, average).

> 🧒 **Like you're 5:** In each department box, add up everyone's pay and divide by the number of people.

```java starter
import java.util.*;
import java.util.stream.*;

class Solution {
    public Map<String, Double> avgSalaryByDept(List<Employee> emps) {
        // TODO
        return new HashMap<>();
    }
}
```

```java tests
class Main {
    static java.util.Map<String, Long> rounded(java.util.Map<String, Double> m) {
        java.util.Map<String, Long> r = new java.util.TreeMap<>();
        m.forEach((k, v) -> r.put(k, Math.round(v)));
        return r;
    }
    public static void main(String[] args) {
        T.eq("averages (rounded)", () -> rounded(new Solution().avgSalaryByDept(T.employees())), new java.util.TreeMap<>(java.util.Map.of("Engineering", 121667L, "Sales", 67500L, "HR", 57500L)));
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.stream.*;

class Solution {
    public Map<String, Double> avgSalaryByDept(List<Employee> emps) {
        return emps.stream().collect(Collectors.groupingBy(Employee::dept, Collectors.averagingDouble(Employee::salary)));
    }
}
```

### ITEM sc-partition | Partition employees by salary or age threshold | must
ask: Split employee names into two groups: salary above 70,000 and not.
card: partitioningBy(e -> e.salary() > 70000, mapping(Employee::name, toList())) → Map<Boolean, List<String>>. Both keys (true and false) are always present, even if a list is empty.

> 🧒 **Like you're 5:** Two buckets labelled YES and NO. Each employee hops into one based on the question.

```java starter
import java.util.*;
import java.util.stream.*;

class Solution {
    public Map<Boolean, List<String>> splitBySalary(List<Employee> emps, double limit) {
        // TODO: names, in original order
        return new HashMap<>();
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("70k", () -> s.splitBySalary(T.employees(), 70000), java.util.Map.of(true, java.util.List.of("Asha", "Ravi", "Meera", "Priya"), false, java.util.List.of("John", "Karan", "Zoya")));
        T.eq("nobody above", () -> s.splitBySalary(T.employees(), 1_000_000), java.util.Map.of(true, java.util.List.of(), false, java.util.List.of("Asha", "Ravi", "Meera", "John", "Priya", "Karan", "Zoya")));
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.stream.*;

class Solution {
    public Map<Boolean, List<String>> splitBySalary(List<Employee> emps, double limit) {
        return emps.stream().collect(Collectors.partitioningBy(
                e -> e.salary() > limit,
                Collectors.mapping(Employee::name, Collectors.toList())));
    }
}
```

### ITEM sc-sort-multi | Sort by salary descending, then name ascending | must
ask: Sort employees by salary (highest first); if salaries tie, by name A to Z. Return the names.
card: sorted(Comparator.comparingDouble(Employee::salary).reversed().thenComparing(Employee::name)).map(Employee::name).toList(). Careful: .reversed() reverses everything before it in the chain.

> 🧒 **Like you're 5:** Line up by pocket money, richest first. Two kids with the same money? Then alphabetical order decides.

> ⚠️ **Trap:** `comparing(Employee::name).thenComparing(Employee::salary).reversed()` reverses BOTH. Put `.reversed()` right after the part you want reversed, or use `Comparator.reverseOrder()` inside `thenComparing`.

```java starter
import java.util.*;
import java.util.stream.*;

class Solution {
    public List<String> sortedNames(List<Employee> emps) {
        // TODO
        return List.of();
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("ties sorted by name", () -> s.sortedNames(java.util.List.of(new Employee("Zed", "A", 100, 1), new Employee("Amy", "A", 100, 1), new Employee("Bob", "A", 200, 1), new Employee("Cat", "A", 50, 1))), java.util.List.of("Bob", "Amy", "Zed", "Cat"));
        T.eq("company", () -> s.sortedNames(T.employees()), java.util.List.of("Meera", "Asha", "Ravi", "Priya", "Zoya", "John", "Karan"));
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.stream.*;

class Solution {
    public List<String> sortedNames(List<Employee> emps) {
        return emps.stream()
                .sorted(Comparator.comparingDouble(Employee::salary).reversed()
                        .thenComparing(Employee::name))
                .map(Employee::name)
                .toList();
    }
}
```

### ITEM sc-dup-freq | Find duplicates and their frequency | must
ask: Given a list of strings, return each value that appears more than once, with its count.
card: groupingBy(Function.identity(), counting()) then stream the entrySet and filter(e -> e.getValue() > 1), collect back to a map. Just the duplicates (no counts): use a HashSet and filter(x -> !seen.add(x)).

> 🧒 **Like you're 5:** Count how many times each sticker appears, then keep only the stickers you have more than one of.

```java starter
import java.util.*;
import java.util.function.*;
import java.util.stream.*;

class Solution {
    public Map<String, Long> duplicates(List<String> items) {
        // TODO: only items with count > 1
        return new HashMap<>();
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("fruits", () -> s.duplicates(java.util.List.of("apple", "kiwi", "apple", "mango", "kiwi", "apple")), java.util.Map.of("apple", 3L, "kiwi", 2L));
        T.eq("no dups", () -> s.duplicates(java.util.List.of("a", "b")), java.util.Map.of());
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.function.*;
import java.util.stream.*;

class Solution {
    public Map<String, Long> duplicates(List<String> items) {
        return items.stream()
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()))
                .entrySet().stream()
                .filter(e -> e.getValue() > 1)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }
}
```

### ITEM sc-first-unique | First non-repeating and first repeated character | must
ask: Find the first character that does not repeat in a string, using Streams.
card: Count with groupingBy(identity(), LinkedHashMap::new, counting()) so order is kept, then find the first entry with count 1. s.chars().mapToObj(c -> (char) c) turns a String into Stream<Character>. First repeated: a Set and the first char where !set.add(c).

> 🧒 **Like you're 5:** Count every letter but keep them in the order they appeared. Then walk from the start and pick the first letter that showed up only once.

> ⚠️ **Trap:** A plain `groupingBy` uses HashMap and loses the order. You need `LinkedHashMap::new`.

```java starter
import java.util.*;
import java.util.function.*;
import java.util.stream.*;

class Solution {
    public Character firstNonRepeating(String s) {
        // TODO: return null if every character repeats
        return null;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("swiss", () -> s.firstNonRepeating("swiss"), 'w');
        T.eq("javaquest", () -> s.firstNonRepeating("javaquest"), 'j');
        T.eq("aabbcc", () -> s.firstNonRepeating("aabbcc"), null);
        T.eq("stress", () -> s.firstNonRepeating("stress"), 't');
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.function.*;
import java.util.stream.*;

class Solution {
    public Character firstNonRepeating(String s) {
        return s.chars()
                .mapToObj(c -> (char) c)
                .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()))
                .entrySet().stream()
                .filter(e -> e.getValue() == 1)
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(null);
    }
}
```

### ITEM sc-word-freq | Frequency of each word in a sentence | must
ask: Count how often each word appears in a sentence (ignore case).
card: Arrays.stream(text.toLowerCase().split("\\s+")).collect(groupingBy(identity(), counting())). Use TreeMap::new for sorted output. Character frequency: text.chars().mapToObj(c -> (char) c).

> 🧒 **Like you're 5:** Cut the sentence into words with scissors, make them all lowercase, then make a tally chart.

```java starter
import java.util.*;
import java.util.function.*;
import java.util.stream.*;

class Solution {
    public Map<String, Long> wordFrequency(String text) {
        // TODO: lower-case, split on spaces
        return new HashMap<>();
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("sentence", () -> s.wordFrequency("the cat and The hat and the bat"), java.util.Map.of("the", 3L, "cat", 1L, "and", 2L, "hat", 1L, "bat", 1L));
        T.eq("extra spaces", () -> s.wordFrequency("  Java   java JAVA "), java.util.Map.of("java", 3L));
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.function.*;
import java.util.stream.*;

class Solution {
    public Map<String, Long> wordFrequency(String text) {
        return Arrays.stream(text.trim().toLowerCase().split("\\s+"))
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
    }
}
```

### ITEM sc-flatmap | Flatten List<List<Integer>> and nested objects with flatMap | must
ask: Flatten a list of lists of numbers into one list.
card: lists.stream().flatMap(List::stream).toList(). For nested objects: orders.stream().flatMap(o -> o.items().stream()).map(Item::name). For arrays: flatMap(Arrays::stream) or flatMapToInt.

> 🧒 **Like you're 5:** You have boxes inside a big box. `flatMap` tips every small box out so all the toys lie in one single pile.

```java starter
import java.util.*;
import java.util.stream.*;

class Solution {
    public List<Integer> flatten(List<List<Integer>> lists) {
        // TODO
        return List.of();
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("nested", () -> s.flatten(java.util.List.of(java.util.List.of(1, 2), java.util.List.of(3), java.util.List.of(), java.util.List.of(4, 5))), java.util.List.of(1, 2, 3, 4, 5));
        T.eq("empty", () -> s.flatten(java.util.List.of()), java.util.List.of());
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.stream.*;

class Solution {
    public List<Integer> flatten(List<List<Integer>> lists) {
        return lists.stream().flatMap(List::stream).toList();
    }
}
```

### ITEM sc-common | Common elements of two lists; remove duplicates keeping order | must
ask: Return the elements present in both lists, without duplicates, in the order of the first list.
card: Put list b in a HashSet (O(1) contains), then a.stream().filter(set::contains).distinct().toList(). distinct() keeps the first occurrence, so it removes duplicates while preserving order (a LinkedHashSet does the same).

> 🧒 **Like you're 5:** Write your friend's list on a sticky note. Walk your own list in order and keep each item that's also on the sticky note, but only once.

> ⚠️ **Trap:** `a.stream().filter(b::contains)` with `b` a List is O(n×m). Convert to a Set first.

```java starter
import java.util.*;
import java.util.stream.*;

class Solution {
    public List<Integer> common(List<Integer> a, List<Integer> b) {
        // TODO
        return List.of();
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("basic", () -> s.common(java.util.List.of(5, 1, 3, 1, 7), java.util.List.of(1, 7, 9, 5)), java.util.List.of(5, 1, 7));
        T.eq("none", () -> s.common(java.util.List.of(1, 2), java.util.List.of(3)), java.util.List.of());
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.stream.*;

class Solution {
    public List<Integer> common(List<Integer> a, List<Integer> b) {
        Set<Integer> inB = new HashSet<>(b);
        return a.stream().filter(inB::contains).distinct().toList();
    }
}
```

### ITEM sc-tomap | Convert a List to a Map, handling duplicate keys | must
ask: Build a map of department → total salary using Collectors.toMap.
card: toMap(Employee::dept, Employee::salary, Double::sum). The third argument (merge function) decides what happens when two employees share a key; without it you get IllegalStateException: Duplicate key.

> 🧒 **Like you're 5:** Every department gets one piggy bank. When two people from the same department arrive, their money goes into the same piggy bank (merge = add).

```java starter
import java.util.*;
import java.util.stream.*;

class Solution {
    public Map<String, Double> totalByDept(List<Employee> emps) {
        // TODO: use Collectors.toMap with a merge function
        return new HashMap<>();
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        T.eq("totals", () -> new Solution().totalByDept(T.employees()), java.util.Map.of("Engineering", 365000.0, "Sales", 135000.0, "HR", 115000.0));
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.stream.*;

class Solution {
    public Map<String, Double> totalByDept(List<Employee> emps) {
        return emps.stream().collect(Collectors.toMap(Employee::dept, Employee::salary, Double::sum));
    }
}
```

### ITEM sc-top-n | Top 3 highest-paid employees (sorted + limit) | must
ask: Return the names of the top N highest-paid employees.
card: sorted(comparingDouble(Employee::salary).reversed()).limit(n).map(Employee::name).toList(). For huge data, a size-N min-heap is O(n log N) instead of a full sort.

> 🧒 **Like you're 5:** Line everyone up from richest to poorest and take the first three.

```java starter
import java.util.*;
import java.util.stream.*;

class Solution {
    public List<String> topN(List<Employee> emps, int n) {
        // TODO
        return List.of();
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("top 3", () -> s.topN(T.employees(), 3), java.util.List.of("Meera", "Asha", "Ravi"));
        T.eq("top 1", () -> s.topN(T.employees(), 1), java.util.List.of("Meera"));
        T.eq("n bigger than list", () -> s.topN(T.employees(), 99).size(), 7);
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.stream.*;

class Solution {
    public List<String> topN(List<Employee> emps, int n) {
        return emps.stream()
                .sorted(Comparator.comparingDouble(Employee::salary).reversed())
                .limit(n)
                .map(Employee::name)
                .toList();
    }
}
```

### ITEM sc-join | Join names with a delimiter; convert to uppercase | must
ask: Return all employee names in uppercase as one string like "[ASHA, RAVI, ...]".
card: map(Employee::name).map(String::toUpperCase).collect(Collectors.joining(", ", "[", "]")). joining(delimiter, prefix, suffix).

> 🧒 **Like you're 5:** Write every name in CAPITALS, put commas between them, and wrap the whole thing in square brackets like a bracelet.

```java starter
import java.util.*;
import java.util.stream.*;

class Solution {
    public String upperNames(List<Employee> emps) {
        // TODO
        return "";
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("all", () -> s.upperNames(T.employees()), "[ASHA, RAVI, MEERA, JOHN, PRIYA, KARAN, ZOYA]");
        T.eq("empty", () -> s.upperNames(java.util.List.of()), "[]");
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.stream.*;

class Solution {
    public String upperNames(List<Employee> emps) {
        return emps.stream()
                .map(Employee::name)
                .map(String::toUpperCase)
                .collect(Collectors.joining(", ", "[", "]"));
    }
}
```

### ITEM sc-even-odd | Separate even and odd numbers; sum, average, min, max | must
ask: Split numbers into even and odd, and know how to get sum/average/min/max in one pass.
card: partitioningBy(n -> n % 2 == 0) → Map<Boolean, List<Integer>>. Stats in one pass: mapToInt(Integer::intValue).summaryStatistics() → getSum(), getAverage(), getMin(), getMax(), getCount().

> 🧒 **Like you're 5:** Two baskets: numbers you can split equally between two friends (even) and numbers you can't (odd).

```java
IntSummaryStatistics st = nums.stream().mapToInt(Integer::intValue).summaryStatistics();
System.out.println(st.getSum() + " " + st.getAverage() + " " + st.getMin() + " " + st.getMax());
```

> ⚠️ **Trap:** `n % 2 == 1` is wrong for negative numbers (`-3 % 2 == -1`). Test with `n % 2 == 0` or `n % 2 != 0`.

```java starter
import java.util.*;
import java.util.stream.*;

class Solution {
    public Map<Boolean, List<Integer>> evenOdd(List<Integer> nums) {
        // TODO: true = even
        return new HashMap<>();
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("mixed", () -> s.evenOdd(java.util.List.of(1, 2, 3, 4, 5, 6)), java.util.Map.of(true, java.util.List.of(2, 4, 6), false, java.util.List.of(1, 3, 5)));
        T.eq("negatives", () -> s.evenOdd(java.util.List.of(-3, -2, 0)), java.util.Map.of(true, java.util.List.of(-2, 0), false, java.util.List.of(-3)));
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.stream.*;

class Solution {
    public Map<Boolean, List<Integer>> evenOdd(List<Integer> nums) {
        return nums.stream().collect(Collectors.partitioningBy(n -> n % 2 == 0));
    }
}
```

### ITEM sc-longest | Longest string; strings starting with a prefix | must
ask: Find the longest string in a list (first one wins ties), and the strings starting with a given prefix.
card: max(Comparator.comparingInt(String::length)) returns Optional<String>; note max keeps the LAST of equal elements, so for "first wins" use reduce((a, b) -> b.length() > a.length() ? b : a). Prefix: filter(s -> s.startsWith(prefix)).

> 🧒 **Like you're 5:** Compare words two at a time and keep the longer one. Only swap if the new one is strictly longer, so the earlier word wins ties.

```java starter
import java.util.*;
import java.util.stream.*;

class Solution {
    public Optional<String> longest(List<String> words) {
        // TODO: first longest wins ties
        return Optional.empty();
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("basic", () -> s.longest(java.util.List.of("java", "spring", "kafka")), java.util.Optional.of("spring"));
        T.eq("tie keeps first", () -> s.longest(java.util.List.of("aa", "bbb", "ccc")), java.util.Optional.of("bbb"));
        T.eq("empty", () -> s.longest(java.util.List.of()), java.util.Optional.empty());
        T.done();
    }
}
```

```java solution
import java.util.*;
import java.util.stream.*;

class Solution {
    public Optional<String> longest(List<String> words) {
        return words.stream().reduce((a, b) -> b.length() > a.length() ? b : a);
    }
}
```
