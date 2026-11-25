# TRACK dsa

## MODULE pointers | Two Pointers & Binary Search
> 💡 **Pattern cheat-sheet:** Sorted input → two pointers or binary search. "Minimum X such that it works" → binary search on the answer. Always write the loop as `while (lo <= hi)` with `mid = lo + (hi - lo) / 2` (no overflow).

### ITEM dsa-trap | Container with most water, trapping rain water | must
ask: Given bar heights, how much rain water is trapped between them?
card: Two pointers from both ends with leftMax and rightMax. Move the side with the smaller max: water there = thatMax - height (the other side is guaranteed taller). O(n), O(1). Container with most water: two pointers, area = min(h[l],h[r]) × (r-l), move the shorter side.
lc: Trapping Rain Water; Container With Most Water

> 🧒 **Like you're 5:** Water above a bar fills up to the shorter of "the tallest wall on my left" and "the tallest wall on my right", minus my own height. If my left wall is shorter, I already know my water level: the right side has something at least as tall.

```diagram
height: 0 1 0 2 1 0 1 3 2 1 2 1
water:  . . 1 . 1 2 1 . . 1 . .   → total 6
```

**Container with most water:** start wide. The shorter wall limits the area, so moving the taller wall inward can never help. Move the shorter one.

> 🎯 **Say this in the interview:** "Brute force: for each bar find max-left and max-right, O(n²). Prefix arrays make it O(n) time and O(n) space. Two pointers make it O(1) space."

```java starter
class Solution {
    public int trap(int[] height) {
        // TODO: two pointers with leftMax and rightMax
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.trap(new int[]{0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1}), 6);
        T.eq("valley", () -> s.trap(new int[]{4, 2, 0, 3, 2, 5}), 9);
        T.eq("no walls", () -> s.trap(new int[]{1, 2, 3}), 0);
        T.eq("empty", () -> s.trap(new int[]{}), 0);
        T.done();
    }
}
```

```java solution
class Solution {
    public int trap(int[] h) {
        int l = 0, r = h.length - 1, leftMax = 0, rightMax = 0, water = 0;
        while (l < r) {
            if (h[l] < h[r]) {                       // left side is the limit
                leftMax = Math.max(leftMax, h[l]);
                water += leftMax - h[l++];
            } else {
                rightMax = Math.max(rightMax, h[r]);
                water += rightMax - h[r--];
            }
        }
        return water;
    }
}
```

```hint
Water at i = min(maxLeft, maxRight) - height[i]. Can you know one of those for sure without computing both?
```

### ITEM dsa-dedupe | Remove duplicates from sorted array, pair with target in sorted array | must
ask: Remove duplicates from a sorted array in place and return the new length.
card: Slow/fast pointers: write pointer w = 1; for each i, if nums[i] != nums[w-1], copy it to nums[w++]. Return w. O(n), O(1). Pair with target in sorted array: L at start, R at end, move based on sum.
lc: Remove Duplicates from Sorted Array; Remove Duplicates from Sorted Array II; Two Sum II - Input Array Is Sorted

> 🧒 **Like you're 5:** One finger reads every card (fast). Another finger points to where the next new card should be placed (slow). Only copy a card when it's different from the last one you placed.

> 💡 **Tip:** The "allow at most 2 copies" version is the same with `nums[i] != nums[w-2]`.

```java starter
class Solution {
    public int removeDuplicates(int[] nums) {
        // TODO: write pointer; return how many unique values you kept at the front
        return nums.length;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> { int[] a = {0, 0, 1, 1, 1, 2, 2, 3, 3, 4}; int k = s.removeDuplicates(a); return java.util.Arrays.copyOf(a, k); }, new int[]{0, 1, 2, 3, 4});
        T.eq("small", () -> { int[] a = {1, 1, 2}; int k = s.removeDuplicates(a); return java.util.Arrays.copyOf(a, k); }, new int[]{1, 2});
        T.eq("no dups", () -> { int[] a = {1, 2, 3}; int k = s.removeDuplicates(a); return java.util.Arrays.copyOf(a, k); }, new int[]{1, 2, 3});
        T.done();
    }
}
```

```java solution
class Solution {
    public int removeDuplicates(int[] nums) {
        if (nums.length == 0) return 0;
        int w = 1;
        for (int i = 1; i < nums.length; i++)
            if (nums[i] != nums[w - 1]) nums[w++] = nums[i];
        return w;
    }
}
```

### ITEM dsa-rotated-search | Binary search, first & last position, search in rotated sorted array | must
ask: Search for a target in a sorted array that was rotated at an unknown pivot, in O(log n).
card: At every mid, one half is sorted. If nums[lo] <= nums[mid], the left half is sorted: if target is inside [nums[lo], nums[mid]) go left else go right. Otherwise the right half is sorted: same check. First/last position: binary search twice, keep going left (or right) after a match.
lc: Binary Search; Search in Rotated Sorted Array; Find First and Last Position of Element in Sorted Array

> 🧒 **Like you're 5:** A sorted bookshelf got cut and the two pieces swapped. If you look in the middle, at least one side is still in perfect order. Check if your book belongs in that neat side. If yes go there, if not go to the other side.

```java
// binary search template: memorise it
int lo = 0, hi = n - 1;
while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;          // avoids int overflow
    if (a[mid] == target) return mid;
    if (a[mid] < target) lo = mid + 1; else hi = mid - 1;
}
return -1;
```

```java starter
class Solution {
    public int search(int[] nums, int target) {
        // TODO: O(log n). Which half is sorted?
        return -1;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("found right side", () -> s.search(new int[]{4, 5, 6, 7, 0, 1, 2}, 0), 4);
        T.eq("missing", () -> s.search(new int[]{4, 5, 6, 7, 0, 1, 2}, 3), -1);
        T.eq("found left side", () -> s.search(new int[]{4, 5, 6, 7, 0, 1, 2}, 5), 1);
        T.eq("not rotated", () -> s.search(new int[]{1, 3, 5}, 5), 2);
        T.eq("single", () -> s.search(new int[]{1}, 0), -1);
        T.done();
    }
}
```

```java solution
class Solution {
    public int search(int[] nums, int target) {
        int lo = 0, hi = nums.length - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) return mid;
            if (nums[lo] <= nums[mid]) {                       // left half sorted
                if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
                else lo = mid + 1;
            } else {                                           // right half sorted
                if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
                else hi = mid - 1;
            }
        }
        return -1;
    }
}
```

### ITEM dsa-find-min | Find minimum in rotated sorted array, find peak element | must
ask: Find the minimum element in a rotated sorted array in O(log n).
card: Compare mid with hi: if nums[mid] > nums[hi], the minimum is to the right (lo = mid + 1); else it's at mid or left (hi = mid). Stop when lo == hi. Peak element: if nums[mid] < nums[mid+1] go right (a peak must exist uphill), else go left.
lc: Find Minimum in Rotated Sorted Array; Find Peak Element

> 🧒 **Like you're 5:** The smallest book is where the "drop" happens. If the middle book is bigger than the last book, the drop is somewhere on the right.

> ⚠️ **Trap:** Here the loop is `while (lo < hi)` and `hi = mid` (not `mid - 1`), because mid itself might be the answer.

```java starter
class Solution {
    public int findMin(int[] nums) {
        // TODO
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("rotated", () -> s.findMin(new int[]{3, 4, 5, 1, 2}), 1);
        T.eq("rotated more", () -> s.findMin(new int[]{4, 5, 6, 7, 0, 1, 2}), 0);
        T.eq("not rotated", () -> s.findMin(new int[]{11, 13, 15, 17}), 11);
        T.eq("two", () -> s.findMin(new int[]{2, 1}), 1);
        T.done();
    }
}
```

```java solution
class Solution {
    public int findMin(int[] nums) {
        int lo = 0, hi = nums.length - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] > nums[hi]) lo = mid + 1;   // drop is on the right
            else hi = mid;                            // mid could be the minimum
        }
        return nums[lo];
    }
}
```

### ITEM dsa-matrix-search | Search a 2D matrix, median of two sorted arrays | good
ask: Search a target in a matrix where each row is sorted and each row starts after the previous row ends.
card: Treat the matrix as one sorted array of m×n: index i → row i / n, col i % n, then normal binary search. O(log(mn)). (Rows and columns sorted separately → start top-right, go left or down, O(m+n).) Median of two sorted arrays: binary search the partition of the smaller array, O(log min(m,n)), a hard bonus question.
lc: Search a 2D Matrix; Search a 2D Matrix II; Median of Two Sorted Arrays

> 🧒 **Like you're 5:** Unroll the rows into one long line like a train. It's sorted! Now just do normal binary search, and convert seat numbers back to (row, column).

```java starter
class Solution {
    public boolean searchMatrix(int[][] m, int target) {
        // TODO: binary search over 0 .. rows*cols - 1
        return false;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        int[][] m = {{1, 3, 5, 7}, {10, 11, 16, 20}, {23, 30, 34, 60}};
        T.eq("found", () -> s.searchMatrix(m, 3), true);
        T.eq("missing", () -> s.searchMatrix(m, 13), false);
        T.eq("last", () -> s.searchMatrix(m, 60), true);
        T.eq("1x1", () -> s.searchMatrix(new int[][]{{5}}, 5), true);
        T.done();
    }
}
```

```java solution
class Solution {
    public boolean searchMatrix(int[][] m, int target) {
        int rows = m.length, cols = m[0].length, lo = 0, hi = rows * cols - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2, v = m[mid / cols][mid % cols];
            if (v == target) return true;
            if (v < target) lo = mid + 1; else hi = mid - 1;
        }
        return false;
    }
}
```

### ITEM dsa-bs-answer | Binary search on the answer: ship packages within D days, allocate books, sqrt | must
ask: Find the minimum ship capacity to deliver all packages (in order) within D days.
card: The answer lives in a range [max weight, total weight]. Write canShip(capacity) → true/false. It's monotonic (if 10 works, 11 works), so binary search for the smallest capacity that works. Same trick: allocate books, Koko eating bananas, integer sqrt.
lc: Capacity To Ship Packages Within D Days; Koko Eating Bananas; Sqrt(x); Split Array Largest Sum

> 🧒 **Like you're 5:** Guess a truck size. Too small? Takes too many days → try bigger. Works? Great, but maybe a smaller truck also works → try smaller. Each guess cuts the range in half.

#### The template (memorise, it solves dozens of problems)
```java
int lo = minPossible, hi = maxPossible;
while (lo < hi) {
    int mid = lo + (hi - lo) / 2;
    if (works(mid)) hi = mid;     // mid works, maybe smaller also works
    else lo = mid + 1;            // mid fails, need bigger
}
return lo;
```

```java starter
class Solution {
    public int shipWithinDays(int[] weights, int days) {
        // TODO: binary search the capacity between max(weights) and sum(weights)
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.shipWithinDays(new int[]{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, 5), 15);
        T.eq("example 2", () -> s.shipWithinDays(new int[]{3, 2, 2, 4, 1, 4}, 3), 6);
        T.eq("one day", () -> s.shipWithinDays(new int[]{1, 2, 3}, 1), 6);
        T.eq("one per day", () -> s.shipWithinDays(new int[]{5, 1, 9}, 3), 9);
        T.done();
    }
}
```

```java solution
class Solution {
    public int shipWithinDays(int[] weights, int days) {
        int lo = 0, hi = 0;
        for (int w : weights) { lo = Math.max(lo, w); hi += w; }
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (daysNeeded(weights, mid) <= days) hi = mid; else lo = mid + 1;
        }
        return lo;
    }
    private int daysNeeded(int[] weights, int cap) {
        int d = 1, load = 0;
        for (int w : weights) {
            if (load + w > cap) { d++; load = 0; }
            load += w;
        }
        return d;
    }
}
```

```hint
Write a helper: given a capacity, how many days does it take? (Fill the truck until the next package doesn't fit, then start a new day.)
```

## MODULE linked | Linked List
> 💡 **Pattern cheat-sheet:** Use a **dummy node** to avoid head special-cases. **Fast/slow pointers** find middles and cycles. Reversing = three pointers prev, cur, next. Draw boxes and arrows on paper: it really helps.

### ITEM dsa-reverse-list | Reverse a linked list (iterative, recursive, in groups of K) | must
ask: Reverse a singly linked list.
card: Iterative: prev = null, cur = head; loop: next = cur.next, cur.next = prev, prev = cur, cur = next. Return prev. O(n), O(1). Recursive: reverse the rest, then head.next.next = head, head.next = null. K-group: reverse k at a time, connect groups, leave the leftover tail as is.
lc: Reverse Linked List; Reverse Linked List II; Reverse Nodes in k-Group

> 🧒 **Like you're 5:** Kids holding hands in a line, all facing right. Walk down the line and turn each kid around to hold the hand of the kid behind them instead.

```diagram
null ← 1    2 → 3 → null
       prev cur next
step: save next, point cur back to prev, move prev and cur forward
```

```java
// recursive version
ListNode reverse(ListNode head) {
    if (head == null || head.next == null) return head;
    ListNode newHead = reverse(head.next);
    head.next.next = head;   // the node after me now points back to me
    head.next = null;
    return newHead;
}
```

```java starter
// ListNode is provided: class ListNode { int val; ListNode next; }
class Solution {
    public ListNode reverseList(ListNode head) {
        // TODO
        return head;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("five", () -> s.reverseList(T.list(1, 2, 3, 4, 5)), T.list(5, 4, 3, 2, 1));
        T.eq("two", () -> s.reverseList(T.list(1, 2)), T.list(2, 1));
        T.eq("empty", () -> s.reverseList(null), null);
        T.done();
    }
}
```

```java solution
class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null, cur = head;
        while (cur != null) {
            ListNode next = cur.next;   // save
            cur.next = prev;            // turn around
            prev = cur;                 // move forward
            cur = next;
        }
        return prev;
    }
}
```

### ITEM dsa-cycle | Detect cycle, find cycle start, find middle node | must
ask: Detect whether a linked list has a cycle, using O(1) memory.
card: Floyd's tortoise and hare: slow moves 1, fast moves 2. If they meet, there's a cycle; if fast hits null, no cycle. Cycle start: after meeting, reset one pointer to head, move both by 1; where they meet is the start. Middle node: when fast reaches the end, slow is in the middle.
lc: Linked List Cycle; Linked List Cycle II; Middle of the Linked List

> 🧒 **Like you're 5:** A tortoise and a rabbit run on a track. If the track is a circle, the fast rabbit will lap the tortoise and they'll meet. If it's a straight road, the rabbit just reaches the end.

> 💡 **Tip:** The same trick finds the duplicate number in an array (treat values as next pointers).

```java starter
class Solution {
    public boolean hasCycle(ListNode head) {
        // TODO: slow and fast pointers
        return false;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("cycle to node 2", () -> { ListNode h = T.list(3, 2, 0, -4); h.next.next.next.next = h.next; return s.hasCycle(h); }, true);
        T.eq("self loop", () -> { ListNode h = T.list(1); h.next = h; return s.hasCycle(h); }, true);
        T.eq("no cycle", () -> s.hasCycle(T.list(1, 2, 3)), false);
        T.eq("empty", () -> s.hasCycle(null), false);
        T.done();
    }
}
```

```java solution
class Solution {
    public boolean hasCycle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
    }
}
```

### ITEM dsa-merge-lists | Merge two sorted lists, remove Nth node from end | must
ask: Merge two sorted linked lists into one sorted list.
card: Dummy node + tail pointer; attach the smaller head each time; attach whatever is left at the end. O(n+m). Remove Nth from end: move fast n steps ahead, then move both until fast.next is null; slow.next is the node to delete (use a dummy for the head case).
lc: Merge Two Sorted Lists; Remove Nth Node From End of List

> 🧒 **Like you're 5:** Two lines of kids sorted by height. Keep picking the shorter kid from the front of either line to build one new sorted line.

```java
// remove nth from end, one pass
ListNode dummy = new ListNode(0, head), fast = dummy, slow = dummy;
for (int i = 0; i <= n; i++) fast = fast.next;   // gap of n
while (fast != null) { fast = fast.next; slow = slow.next; }
slow.next = slow.next.next;
return dummy.next;
```

```java starter
class Solution {
    public ListNode mergeTwoLists(ListNode a, ListNode b) {
        // TODO: dummy node + tail
        return null;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.mergeTwoLists(T.list(1, 2, 4), T.list(1, 3, 4)), T.list(1, 1, 2, 3, 4, 4));
        T.eq("one empty", () -> s.mergeTwoLists(null, T.list(0)), T.list(0));
        T.eq("both empty", () -> s.mergeTwoLists(null, null), null);
        T.done();
    }
}
```

```java solution
class Solution {
    public ListNode mergeTwoLists(ListNode a, ListNode b) {
        ListNode dummy = new ListNode(0), tail = dummy;
        while (a != null && b != null) {
            if (a.val <= b.val) { tail.next = a; a = a.next; }
            else { tail.next = b; b = b.next; }
            tail = tail.next;
        }
        tail.next = (a != null) ? a : b;   // leftovers are already sorted
        return dummy.next;
    }
}
```

### ITEM dsa-add-two | Add two numbers as linked lists, palindrome linked list | must
ask: Two numbers are stored as linked lists with digits in reverse order. Return their sum as a linked list.
card: Walk both lists together with a carry: sum = x + y + carry, new node sum % 10, carry = sum / 10. Continue while either list or carry remains. Palindrome list: find middle (fast/slow), reverse the second half, compare, (optionally restore).
lc: Add Two Numbers; Palindrome Linked List

> 🧒 **Like you're 5:** Exactly how you added numbers in school: ones first, write the digit, carry the 1 to the next column.

`342 + 465`: lists `2→4→3` and `5→6→4` → `7→0→8` (807). The digits are reversed so we can start from the ones place.

```java starter
class Solution {
    public ListNode addTwoNumbers(ListNode a, ListNode b) {
        // TODO: digit by digit with carry
        return null;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("342 + 465", () -> s.addTwoNumbers(T.list(2, 4, 3), T.list(5, 6, 4)), T.list(7, 0, 8));
        T.eq("0 + 0", () -> s.addTwoNumbers(T.list(0), T.list(0)), T.list(0));
        T.eq("carry grows", () -> s.addTwoNumbers(T.list(9, 9, 9), T.list(1)), T.list(0, 0, 0, 1));
        T.done();
    }
}
```

```java solution
class Solution {
    public ListNode addTwoNumbers(ListNode a, ListNode b) {
        ListNode dummy = new ListNode(0), tail = dummy;
        int carry = 0;
        while (a != null || b != null || carry != 0) {
            int sum = carry + (a != null ? a.val : 0) + (b != null ? b.val : 0);
            tail.next = new ListNode(sum % 10);
            tail = tail.next;
            carry = sum / 10;
            if (a != null) a = a.next;
            if (b != null) b = b.next;
        }
        return dummy.next;
    }
}
```

### ITEM dsa-sort-list | Intersection of two lists, sort a linked list, flatten a multilevel list | good
ask: Sort a linked list in O(n log n) time.
card: Merge sort: split at the middle (slow/fast), sort each half recursively, merge the two sorted halves. Linked lists are great for merge sort (no extra array). Intersection: two pointers; when one hits the end jump to the other list's head; they meet at the intersection (or both null).
lc: Sort List; Intersection of Two Linked Lists; Flatten a Multilevel Doubly Linked List

> 🧒 **Like you're 5:** Cut the line of kids in half, sort each half the same way, then zip the two sorted halves together.

**Intersection trick:** pointer A walks list A then list B; pointer B walks list B then list A. Both walk the same total distance, so they line up at the shared node.

```java starter
class Solution {
    public ListNode sortList(ListNode head) {
        // TODO: merge sort
        return head;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.sortList(T.list(4, 2, 1, 3)), T.list(1, 2, 3, 4));
        T.eq("negatives", () -> s.sortList(T.list(-1, 5, 3, 4, 0)), T.list(-1, 0, 3, 4, 5));
        T.eq("empty", () -> s.sortList(null), null);
        T.done();
    }
}
```

```java solution
class Solution {
    public ListNode sortList(ListNode head) {
        if (head == null || head.next == null) return head;
        ListNode slow = head, fast = head.next;
        while (fast != null && fast.next != null) { slow = slow.next; fast = fast.next.next; }
        ListNode second = slow.next;
        slow.next = null;                                  // cut in half
        return merge(sortList(head), sortList(second));
    }
    private ListNode merge(ListNode a, ListNode b) {
        ListNode d = new ListNode(0), t = d;
        while (a != null && b != null) {
            if (a.val <= b.val) { t.next = a; a = a.next; } else { t.next = b; b = b.next; }
            t = t.next;
        }
        t.next = a != null ? a : b;
        return d.next;
    }
}
```

## MODULE stacks | Stack, Queue & Monotonic Stack
> 💡 **Pattern cheat-sheet:** Matching pairs / undo / nested things → stack. "Next greater/smaller element" → monotonic stack (keep it increasing or decreasing). Sliding window max → monotonic deque. In Java use `ArrayDeque`, not the old `Stack` class.

### ITEM dsa-parens | Valid parentheses, min stack, queue using stacks | must
ask: Check whether a string of brackets ()[]{} is balanced.
card: Push opening brackets; on a closing bracket, the stack top must be its matching opener, else false. At the end the stack must be empty. O(n). Min stack: second stack storing the min at each level. Queue with two stacks: push to in-stack; pop from out-stack, refilling it from in-stack only when empty (amortized O(1)).
lc: Valid Parentheses; Min Stack; Implement Queue using Stacks

> 🧒 **Like you're 5:** Stacking plates: every time you open a bracket you put a plate. Every closing bracket must match the plate on top. Plates left over at the end? Not balanced.

> ⚠️ **Trap:** `"("` alone, `")"` alone, and `"([)]"` are all invalid. Check for an empty stack before popping.

```java starter
class Solution {
    public boolean isValid(String s) {
        // TODO: use java.util.ArrayDeque as a stack
        return false;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("simple", () -> s.isValid("()[]{}"), true);
        T.eq("nested", () -> s.isValid("{[()]}"), true);
        T.eq("crossed", () -> s.isValid("([)]"), false);
        T.eq("only open", () -> s.isValid("(("), false);
        T.eq("only close", () -> s.isValid("]"), false);
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public boolean isValid(String s) {
        Deque<Character> st = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(') st.push(')');            // push the closer we expect
            else if (c == '[') st.push(']');
            else if (c == '{') st.push('}');
            else if (st.isEmpty() || st.pop() != c) return false;
        }
        return st.isEmpty();
    }
}
```

### ITEM dsa-next-greater | Next greater element, next smaller element, daily temperatures | must
ask: For each day, how many days until a warmer temperature? (Daily Temperatures)
card: Monotonic stack of indexes with decreasing temperatures. For each new day, pop every colder day from the stack: its answer is (today - thatDay). Then push today. Each index is pushed and popped once: O(n).
lc: Daily Temperatures; Next Greater Element I; Next Greater Element II

> 🧒 **Like you're 5:** Kids waiting in a line for someone taller to show up. When a tall kid arrives, every shorter kid at the back of the line says "found mine!" and leaves.

```diagram
temps:  73 74 75 71 69 72 76 73
answer:  1  1  4  2  1  1  0  0
at 72: pops 69 (1 day) and 71 (2 days); 75 stays (it's warmer)
```

```java starter
class Solution {
    public int[] dailyTemperatures(int[] t) {
        // TODO: stack of indexes
        return new int[t.length];
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.dailyTemperatures(new int[]{73, 74, 75, 71, 69, 72, 76, 73}), new int[]{1, 1, 4, 2, 1, 1, 0, 0});
        T.eq("increasing", () -> s.dailyTemperatures(new int[]{30, 40, 50, 60}), new int[]{1, 1, 1, 0});
        T.eq("decreasing", () -> s.dailyTemperatures(new int[]{60, 50, 40}), new int[]{0, 0, 0});
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public int[] dailyTemperatures(int[] t) {
        int[] ans = new int[t.length];
        Deque<Integer> st = new ArrayDeque<>();            // indexes, temps decreasing
        for (int i = 0; i < t.length; i++) {
            while (!st.isEmpty() && t[st.peek()] < t[i]) {
                int j = st.pop();
                ans[j] = i - j;                            // today is warmer than day j
            }
            st.push(i);
        }
        return ans;
    }
}
```

### ITEM dsa-histogram | Largest rectangle in histogram, maximal rectangle | good
ask: Find the largest rectangle area in a histogram.
card: Monotonic increasing stack of indexes. When a shorter bar arrives, pop taller bars: each popped bar's rectangle has height = its height and width = (current index - new stack top - 1). Add a 0-height bar at the end to flush. O(n). Maximal rectangle in a binary matrix = run histogram on each row's running heights.
lc: Largest Rectangle in Histogram; Maximal Rectangle

> 🧒 **Like you're 5:** Each bar asks: "How far can I stretch left and right before hitting someone shorter than me?" Its rectangle is my height × that width. The stack finds those shorter neighbours fast.

> 💡 **Tip:** This is the hardest stack pattern. If time is short, learn Daily Temperatures well first; it's the same skeleton.

```java starter
class Solution {
    public int largestRectangleArea(int[] h) {
        // TODO
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.largestRectangleArea(new int[]{2, 1, 5, 6, 2, 3}), 10);
        T.eq("two", () -> s.largestRectangleArea(new int[]{2, 4}), 4);
        T.eq("flat", () -> s.largestRectangleArea(new int[]{3, 3, 3}), 9);
        T.eq("single", () -> s.largestRectangleArea(new int[]{7}), 7);
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public int largestRectangleArea(int[] h) {
        Deque<Integer> st = new ArrayDeque<>();
        int best = 0;
        for (int i = 0; i <= h.length; i++) {
            int cur = (i == h.length) ? 0 : h[i];             // sentinel 0 flushes the stack
            while (!st.isEmpty() && h[st.peek()] > cur) {
                int height = h[st.pop()];
                int left = st.isEmpty() ? -1 : st.peek();
                best = Math.max(best, height * (i - left - 1));
            }
            st.push(i);
        }
        return best;
    }
}
```

### ITEM dsa-window-max | Sliding window maximum, stock span | must
ask: Return the maximum of every window of size k as it slides across the array.
card: Monotonic deque of indexes with decreasing values. For each i: drop the front if it's out of the window (index <= i - k); drop from the back while the back value <= nums[i]; add i. The front is the window max. O(n). Stock span: monotonic stack of (price, span).
lc: Sliding Window Maximum; Online Stock Span

> 🧒 **Like you're 5:** A line of kids where only "possible champions" stay. When a taller kid joins, all shorter kids in front of the back of the line give up (they can never be the tallest again). The tallest is always at the front, until they walk out of the window.

```java starter
class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        // TODO: ArrayDeque of indexes
        return new int[0];
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.maxSlidingWindow(new int[]{1, 3, -1, -3, 5, 3, 6, 7}, 3), new int[]{3, 3, 5, 5, 6, 7});
        T.eq("k = 1", () -> s.maxSlidingWindow(new int[]{4, 2}, 1), new int[]{4, 2});
        T.eq("decreasing", () -> s.maxSlidingWindow(new int[]{9, 8, 7, 6}, 2), new int[]{9, 8, 7});
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        int[] out = new int[nums.length - k + 1];
        Deque<Integer> dq = new ArrayDeque<>();                   // indexes, values decreasing
        for (int i = 0; i < nums.length; i++) {
            if (!dq.isEmpty() && dq.peekFirst() <= i - k) dq.pollFirst();          // left the window
            while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i]) dq.pollLast(); // can't win anymore
            dq.offerLast(i);
            if (i >= k - 1) out[i - k + 1] = nums[dq.peekFirst()];
        }
        return out;
    }
}
```

### ITEM dsa-rpn | Evaluate Reverse Polish Notation, simplify Unix path | must
ask: Evaluate an expression in Reverse Polish Notation, like ["2","1","+","3","*"].
card: Stack of numbers. Number → push. Operator → pop b, pop a, push (a op b). Order matters for - and /. Answer is the last value. Simplify path: split by "/", skip "" and ".", ".." pops, else push; join with "/".
lc: Evaluate Reverse Polish Notation; Simplify Path; Basic Calculator II

> 🧒 **Like you're 5:** Numbers wait on a pile. When an operator arrives it grabs the top two numbers, does the math, and puts the answer back on the pile.

`2 1 + 3 *` → push 2, push 1, `+` → 3, push 3, `*` → **9**.

> ⚠️ **Trap:** Pop **b first**, then a, then compute `a - b` and `a / b`. Getting the order wrong is the #1 bug.

```java starter
class Solution {
    public int evalRPN(String[] tokens) {
        // TODO
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("(2+1)*3", () -> s.evalRPN(new String[]{"2", "1", "+", "3", "*"}), 9);
        T.eq("4+13/5", () -> s.evalRPN(new String[]{"4", "13", "5", "/", "+"}), 6);
        T.eq("order of minus", () -> s.evalRPN(new String[]{"10", "3", "-"}), 7);
        T.eq("negative numbers", () -> s.evalRPN(new String[]{"-4", "2", "/"}), -2);
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public int evalRPN(String[] tokens) {
        Deque<Integer> st = new ArrayDeque<>();
        for (String t : tokens) {
            switch (t) {
                case "+" -> st.push(st.pop() + st.pop());
                case "*" -> st.push(st.pop() * st.pop());
                case "-" -> { int b = st.pop(), a = st.pop(); st.push(a - b); }
                case "/" -> { int b = st.pop(), a = st.pop(); st.push(a / b); }
                default -> st.push(Integer.parseInt(t));
            }
        }
        return st.pop();
    }
}
```
