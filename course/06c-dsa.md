# TRACK dsa

## MODULE trees | Trees, BST & Heap
> 💡 **Pattern cheat-sheet:** Most tree problems = "what do I need from my left child and right child?" then recursion. Level by level → BFS with a queue. BST → inorder gives sorted order. "Top K" or "running median" → heap (`PriorityQueue`).

### ITEM dsa-traversals | Inorder, preorder, postorder and level-order traversal | must
ask: Return the level-order traversal of a binary tree (values level by level).
card: DFS orders: preorder = root, left, right; inorder = left, root, right (sorted for a BST); postorder = left, right, root. Level order = BFS with a queue: for each level, read queue.size() nodes, add their children. O(n).
lc: Binary Tree Level Order Traversal; Binary Tree Inorder Traversal; Binary Tree Zigzag Level Order Traversal; Binary Tree Right Side View

> 🧒 **Like you're 5:** Level order is reading a family tree like a book: grandparents first, then parents, then kids, left to right on each line. A queue is a waiting line: kids join at the back as their parents are served.

```diagram
        3
       / \        preorder:  3 9 20 15 7
      9  20       inorder:   9 3 15 20 7
        /  \      postorder: 9 15 7 20 3
       15   7     levels:    [3] [9,20] [15,7]
```

```java
// inorder, recursive: 3 lines you must write without thinking
void inorder(TreeNode n, List<Integer> out) {
    if (n == null) return;
    inorder(n.left, out); out.add(n.val); inorder(n.right, out);
}
```

```java starter
import java.util.*;

// TreeNode is provided: class TreeNode { int val; TreeNode left, right; }
class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        // TODO: BFS with a queue, one inner list per level
        return new ArrayList<>();
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.levelOrder(T.tree(3, 9, 20, null, null, 15, 7)), java.util.List.of(java.util.List.of(3), java.util.List.of(9, 20), java.util.List.of(15, 7)));
        T.eq("single", () -> s.levelOrder(T.tree(1)), java.util.List.of(java.util.List.of(1)));
        T.eq("empty", () -> s.levelOrder(null), java.util.List.of());
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> res = new ArrayList<>();
        if (root == null) return res;
        Queue<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        while (!q.isEmpty()) {
            int size = q.size();                       // nodes on this level
            List<Integer> level = new ArrayList<>();
            for (int i = 0; i < size; i++) {
                TreeNode n = q.poll();
                level.add(n.val);
                if (n.left != null) q.add(n.left);
                if (n.right != null) q.add(n.right);
            }
            res.add(level);
        }
        return res;
    }
}
```

### ITEM dsa-diameter | Max depth, diameter, balanced tree, invert tree | must
ask: Find the diameter of a binary tree: the longest path (in edges) between any two nodes.
card: DFS returning height. At every node, the longest path through it = leftHeight + rightHeight; keep a global max. Return 1 + max(left, right). O(n). Max depth = that height. Balanced = return -1 if any subtree is unbalanced. Invert = swap left and right recursively.
lc: Diameter of Binary Tree; Maximum Depth of Binary Tree; Balanced Binary Tree; Invert Binary Tree

> 🧒 **Like you're 5:** Every node asks its two children "how tall are you?". The longest string you can stretch through me is left-height + right-height. The answer is the biggest string found anywhere.

```java
int maxDepth(TreeNode n) { return n == null ? 0 : 1 + Math.max(maxDepth(n.left), maxDepth(n.right)); }
TreeNode invert(TreeNode n) {
    if (n == null) return null;
    TreeNode t = n.left; n.left = invert(n.right); n.right = invert(t);
    return n;
}
```

```java starter
class Solution {
    public int diameterOfBinaryTree(TreeNode root) {
        // TODO: a helper that returns height and updates a best field
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        T.eq("example", () -> new Solution().diameterOfBinaryTree(T.tree(1, 2, 3, 4, 5)), 3);
        T.eq("two nodes", () -> new Solution().diameterOfBinaryTree(T.tree(1, 2)), 1);
        T.eq("not through root", () -> new Solution().diameterOfBinaryTree(T.tree(1, 2, null, 3, 4, 5, null, null, 6)), 4);
        T.eq("single", () -> new Solution().diameterOfBinaryTree(T.tree(1)), 0);
        T.done();
    }
}
```

```java solution
class Solution {
    private int best = 0;
    public int diameterOfBinaryTree(TreeNode root) {
        height(root);
        return best;
    }
    private int height(TreeNode n) {
        if (n == null) return 0;
        int l = height(n.left), r = height(n.right);
        best = Math.max(best, l + r);          // path through this node
        return 1 + Math.max(l, r);
    }
}
```

### ITEM dsa-validate-bst | Lowest common ancestor, validate BST, kth smallest in BST | must
ask: Check whether a binary tree is a valid binary search tree.
card: Pass a (min, max) range down: left child must be in (min, node.val), right in (node.val, max). Use long or null bounds to handle Integer limits. Or: inorder traversal must be strictly increasing. Kth smallest = inorder, stop at k. LCA in BST: go left if both smaller, right if both bigger, else current node.
lc: Validate Binary Search Tree; Lowest Common Ancestor of a Binary Tree; Kth Smallest Element in a BST

> 🧒 **Like you're 5:** In a BST every family has a rule: everyone on the left is smaller, everyone on the right is bigger, all the way down, not just your own kids. So each kid carries a note "you must be between X and Y".

> ⚠️ **Trap:** Only comparing a node with its direct children is wrong. `5 → left 4, right 6 → 6.left = 3` passes the local check but 3 is on the right of 5.

**LCA of a normal binary tree:** `if (n == null || n == p || n == q) return n; left = lca(n.left); right = lca(n.right); return left != null && right != null ? n : (left != null ? left : right);`

```java starter
class Solution {
    public boolean isValidBST(TreeNode root) {
        // TODO: carry allowed min/max down the tree
        return false;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("valid", () -> s.isValidBST(T.tree(2, 1, 3)), true);
        T.eq("invalid deep", () -> s.isValidBST(T.tree(5, 4, 6, null, null, 3, 7)), false);
        T.eq("duplicates invalid", () -> s.isValidBST(T.tree(2, 2, 2)), false);
        T.eq("int max ok", () -> s.isValidBST(T.tree(Integer.MAX_VALUE)), true);
        T.done();
    }
}
```

```java solution
class Solution {
    public boolean isValidBST(TreeNode root) {
        return check(root, Long.MIN_VALUE, Long.MAX_VALUE);
    }
    private boolean check(TreeNode n, long min, long max) {
        if (n == null) return true;
        if (n.val <= min || n.val >= max) return false;
        return check(n.left, min, n.val) && check(n.right, n.val, max);
    }
}
```

### ITEM dsa-path-sum | Path sum, maximum path sum, serialize & deserialize a tree | good
ask: Find the maximum path sum in a binary tree (the path can start and end anywhere).
card: DFS returns the best "one-arm" gain going down from a node: node.val + max(0, leftGain, rightGain) (drop negative arms with max(0, ...)). At each node, a full path = node.val + max(0,left) + max(0,right); update the global best. O(n). Path sum (root to leaf = target): subtract as you go down. Serialize: preorder with "#" for nulls.
lc: Binary Tree Maximum Path Sum; Path Sum; Path Sum II; Serialize and Deserialize Binary Tree

> 🧒 **Like you're 5:** Each node tells its parent: "if you come down through me, the best you can collect is X". If an arm only loses coins (negative), cut it off. A node can bend a path (use both arms) only for its own answer, not when reporting to its parent.

```java starter
class Solution {
    public int maxPathSum(TreeNode root) {
        // TODO
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        T.eq("small", () -> new Solution().maxPathSum(T.tree(1, 2, 3)), 6);
        T.eq("skip negative root", () -> new Solution().maxPathSum(T.tree(-10, 9, 20, null, null, 15, 7)), 42);
        T.eq("all negative", () -> new Solution().maxPathSum(T.tree(-3, -2, -1)), -1);
        T.done();
    }
}
```

```java solution
class Solution {
    private int best = Integer.MIN_VALUE;
    public int maxPathSum(TreeNode root) {
        gain(root);
        return best;
    }
    private int gain(TreeNode n) {
        if (n == null) return 0;
        int l = Math.max(0, gain(n.left)), r = Math.max(0, gain(n.right));  // cut negative arms
        best = Math.max(best, n.val + l + r);                                // bend here
        return n.val + Math.max(l, r);                                       // report one arm up
    }
}
```

### ITEM dsa-topk | Top K frequent elements, Kth largest element, merge K sorted lists | must
ask: Return the k most frequent elements.
card: Count with a HashMap, then keep a min-heap of size k ordered by frequency (pop when size > k). O(n log k). Or bucket sort by frequency for O(n). Kth largest: min-heap of size k, the top is the answer. Merge K sorted lists: min-heap of list heads, O(N log k).
lc: Top K Frequent Elements; Kth Largest Element in an Array; Merge k Sorted Lists; K Closest Points to Origin

> 🧒 **Like you're 5:** A VIP room with only k chairs. Everyone tries to enter; if the room is too full, the least popular person in the room (top of a min-heap) is kicked out. At the end the room holds the k most popular.

```java
// Java PriorityQueue is a MIN-heap by default
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
```

> 🏭 **At work:** "top 10 products by sales today", trending hashtags, the 5 slowest API endpoints. Same pattern, streaming data.

```java starter
import java.util.*;

class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        // TODO: count + min-heap of size k
        return new int[0];
    }
}
```

```java tests
class Main {
    static int[] sorted(int[] a) { int[] c = a.clone(); java.util.Arrays.sort(c); return c; }
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> sorted(s.topKFrequent(new int[]{1, 1, 1, 2, 2, 3}, 2)), new int[]{1, 2});
        T.eq("single", () -> sorted(s.topKFrequent(new int[]{1}, 1)), new int[]{1});
        T.eq("negatives", () -> sorted(s.topKFrequent(new int[]{4, -1, -1, 4, 4, 2, -1, 7}, 2)), new int[]{-1, 4});
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> count = new HashMap<>();
        for (int x : nums) count.merge(x, 1, Integer::sum);
        PriorityQueue<Integer> heap = new PriorityQueue<>(Comparator.comparingInt(count::get)); // least frequent on top
        for (int x : count.keySet()) {
            heap.offer(x);
            if (heap.size() > k) heap.poll();
        }
        int[] res = new int[k];
        for (int i = 0; i < k; i++) res[i] = heap.poll();
        return res;
    }
}
```

### ITEM dsa-median-stream | Find median from data stream, connect nodes at same level | good
ask: Design a structure that adds numbers and returns the running median.
card: Two heaps: a max-heap for the smaller half, a min-heap for the bigger half. Add to max-heap, move its top to min-heap, and rebalance so max-heap has equal or one more element. Median = top of max-heap (odd) or average of both tops (even). add O(log n), median O(1).
lc: Find Median from Data Stream; Populating Next Right Pointers in Each Node

> 🧒 **Like you're 5:** Split kids into a "short team" and a "tall team" of equal size. The tallest of the short team and the shortest of the tall team stand right in the middle: that's the median.

```java starter
import java.util.*;

class MedianFinder {
    public MedianFinder() { }
    public void addNum(int num) {
        // TODO
    }
    public double findMedian() {
        // TODO
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        T.eq("LeetCode example", () -> {
            MedianFinder m = new MedianFinder();
            m.addNum(1); m.addNum(2);
            double a = m.findMedian();
            m.addNum(3);
            return a + "," + m.findMedian();
        }, "1.5,2.0");
        T.eq("unsorted input", () -> {
            MedianFinder m = new MedianFinder();
            for (int x : new int[]{5, 15, 1, 3}) m.addNum(x);
            return m.findMedian();
        }, 4.0);
        T.eq("negatives", () -> {
            MedianFinder m = new MedianFinder();
            for (int x : new int[]{-1, -2, -3}) m.addNum(x);
            return m.findMedian();
        }, -2.0);
        T.done();
    }
}
```

```java solution
import java.util.*;

class MedianFinder {
    private final PriorityQueue<Integer> small = new PriorityQueue<>(Comparator.reverseOrder()); // max-heap
    private final PriorityQueue<Integer> large = new PriorityQueue<>();                          // min-heap

    public void addNum(int num) {
        small.offer(num);
        large.offer(small.poll());                     // biggest of small goes to large
        if (large.size() > small.size()) small.offer(large.poll());   // keep small >= large
    }

    public double findMedian() {
        return small.size() > large.size() ? small.peek() : (small.peek() + large.peek()) / 2.0;
    }
}
```

## MODULE backtracking | Recursion, Backtracking & Greedy
> 💡 **Pattern cheat-sheet:** Backtracking = **choose → explore → un-choose**. Draw the decision tree first. Greedy = make the locally best choice and prove you never need to undo it (usually after sorting).

### ITEM dsa-subsets | Subsets, permutations, combination sum | must
ask: Return all possible subsets of a set of distinct numbers.
card: Backtracking: at each index choose to include or skip the number (or loop i from start, add nums[i], recurse with i+1, remove). 2^n subsets, O(n·2^n). Permutations: loop over all unused numbers (boolean[] used). Combination sum: recurse with the same i (reuse allowed), stop when the sum exceeds target.
lc: Subsets; Permutations; Combination Sum; Subsets II

> 🧒 **Like you're 5:** Packing a lunch box from [apple, banana, cookie]. For each fruit you say "yes in" or "no thanks". Every different set of answers is one subset. 3 fruits → 2×2×2 = 8 lunch boxes (including the empty box).

```java
// the backtracking skeleton you reuse everywhere
void backtrack(int start, List<Integer> path) {
    result.add(new ArrayList<>(path));        // record a COPY
    for (int i = start; i < nums.length; i++) {
        path.add(nums[i]);                    // choose
        backtrack(i + 1, path);               // explore
        path.remove(path.size() - 1);         // un-choose
    }
}
```

> ⚠️ **Trap:** `result.add(path)` adds the same list object every time and you end with empty lists. Always add `new ArrayList<>(path)`.

```java starter
import java.util.*;

class Solution {
    public List<List<Integer>> subsets(int[] nums) {
        // TODO: backtracking
        return new ArrayList<>();
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("three", () -> T.sorted(s.subsets(new int[]{1, 2, 3})), T.sorted(java.util.List.of(java.util.List.of(), java.util.List.of(1), java.util.List.of(2), java.util.List.of(3), java.util.List.of(1, 2), java.util.List.of(1, 3), java.util.List.of(2, 3), java.util.List.of(1, 2, 3))));
        T.eq("one", () -> T.sorted(s.subsets(new int[]{0})), java.util.List.of(java.util.List.of(), java.util.List.of(0)));
        T.eq("count for 5", () -> s.subsets(new int[]{1, 2, 3, 4, 5}).size(), 32);
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> res = new ArrayList<>();
        go(nums, 0, new ArrayList<>(), res);
        return res;
    }
    private void go(int[] nums, int start, List<Integer> path, List<List<Integer>> res) {
        res.add(new ArrayList<>(path));
        for (int i = start; i < nums.length; i++) {
            path.add(nums[i]);
            go(nums, i + 1, path, res);
            path.remove(path.size() - 1);
        }
    }
}
```

### ITEM dsa-gen-parens | Generate balanced parentheses, letter combinations of a phone number | must
ask: Generate all combinations of n pairs of well-formed parentheses.
card: Backtrack with counts: add "(" if open < n; add ")" if close < open. When length = 2n, record it. Pruning keeps every string valid. Phone letters: for each digit, loop its letters, recurse to the next digit.
lc: Generate Parentheses; Letter Combinations of a Phone Number

> 🧒 **Like you're 5:** You have n opening and n closing brackets. Rule 1: you can open while you still have some. Rule 2: you can only close a bracket that's already open. Follow both rules and every result is valid.

```java starter
import java.util.*;

class Solution {
    public List<String> generateParenthesis(int n) {
        // TODO
        return new ArrayList<>();
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("n = 3", () -> T.sortedFlat(s.generateParenthesis(3)), java.util.List.of("((()))", "(()())", "(())()", "()(())", "()()()"));
        T.eq("n = 1", () -> s.generateParenthesis(1), java.util.List.of("()"));
        T.eq("n = 4 count", () -> s.generateParenthesis(4).size(), 14);
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public List<String> generateParenthesis(int n) {
        List<String> res = new ArrayList<>();
        go(n, 0, 0, new StringBuilder(), res);
        return res;
    }
    private void go(int n, int open, int close, StringBuilder sb, List<String> res) {
        if (sb.length() == 2 * n) { res.add(sb.toString()); return; }
        if (open < n) { sb.append('('); go(n, open + 1, close, sb, res); sb.deleteCharAt(sb.length() - 1); }
        if (close < open) { sb.append(')'); go(n, open, close + 1, sb, res); sb.deleteCharAt(sb.length() - 1); }
    }
}
```

### ITEM dsa-word-search | Word search, N-Queens, palindrome partitioning | good
ask: Given a grid of letters, does the word exist as a path of neighbouring cells (no cell used twice)?
card: DFS from every cell that matches word[0]. In DFS: out of bounds or letter mismatch → false; mark the cell visited (e.g. set '#'), try 4 directions for the next index, then restore the letter (backtrack). O(m·n·4^L). N-Queens: place row by row, track used columns and both diagonals.
lc: Word Search; N-Queens; Palindrome Partitioning

> 🧒 **Like you're 5:** Finding a word in a letter maze. Put a pebble on each square you step on so you don't reuse it. If you hit a dead end, pick the pebble up and try another path.

```java starter
class Solution {
    public boolean exist(char[][] board, String word) {
        // TODO: DFS + backtracking
        return false;
    }
}
```

```java tests
class Main {
    static char[][] b() { return new char[][]{{'A', 'B', 'C', 'E'}, {'S', 'F', 'C', 'S'}, {'A', 'D', 'E', 'E'}}; }
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("ABCCED", () -> s.exist(b(), "ABCCED"), true);
        T.eq("SEE", () -> s.exist(b(), "SEE"), true);
        T.eq("ABCB (reuse not allowed)", () -> s.exist(b(), "ABCB"), false);
        T.eq("single cell", () -> s.exist(new char[][]{{'a'}}, "a"), true);
        T.done();
    }
}
```

```java solution
class Solution {
    public boolean exist(char[][] board, String word) {
        for (int r = 0; r < board.length; r++)
            for (int c = 0; c < board[0].length; c++)
                if (dfs(board, word, r, c, 0)) return true;
        return false;
    }
    private boolean dfs(char[][] b, String w, int r, int c, int i) {
        if (i == w.length()) return true;
        if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || b[r][c] != w.charAt(i)) return false;
        char saved = b[r][c];
        b[r][c] = '#';                                   // mark visited
        boolean found = dfs(b, w, r + 1, c, i + 1) || dfs(b, w, r - 1, c, i + 1)
                     || dfs(b, w, r, c + 1, i + 1) || dfs(b, w, r, c - 1, i + 1);
        b[r][c] = saved;                                 // backtrack
        return found;
    }
}
```

### ITEM dsa-jump-game | Activity selection, jump game, gas station, minimum platforms | must
ask: Each number tells how far you can jump from there. Can you reach the last index?
card: Greedy: track the farthest index reachable. Walk i from 0; if i > farthest you're stuck → false; else farthest = max(farthest, i + nums[i]). O(n). Gas station: if total gas >= total cost an answer exists; start after the point where the running tank went negative. Platforms: sort arrivals and departures, sweep with two pointers.
lc: Jump Game; Jump Game II; Gas Station; Minimum Number of Arrows to Burst Balloons

> 🧒 **Like you're 5:** Stepping stones in a river. Each stone says "from here you can jump up to N stones". Walk forward remembering the farthest stone you could reach so far. If you ever stand past that point, you fell in the water.

```java starter
class Solution {
    public boolean canJump(int[] nums) {
        // TODO: greedy farthest reach
        return false;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("reachable", () -> s.canJump(new int[]{2, 3, 1, 1, 4}), true);
        T.eq("stuck at zero", () -> s.canJump(new int[]{3, 2, 1, 0, 4}), false);
        T.eq("single", () -> s.canJump(new int[]{0}), true);
        T.eq("big first jump", () -> s.canJump(new int[]{5, 0, 0, 0, 0}), true);
        T.done();
    }
}
```

```java solution
class Solution {
    public boolean canJump(int[] nums) {
        int far = 0;
        for (int i = 0; i < nums.length; i++) {
            if (i > far) return false;                 // can't even stand here
            far = Math.max(far, i + nums[i]);
        }
        return true;
    }
}
```

### ITEM dsa-meeting-rooms | Meeting rooms, job sequencing, fractional knapsack | must
ask: Given meeting time intervals, what is the minimum number of rooms needed?
card: Sort meetings by start. Min-heap of end times of rooms in use. For each meeting, if the earliest-ending room is free (end <= start) reuse it (poll); push this meeting's end. Heap size at the end = rooms. O(n log n). Or: sort starts and ends separately and sweep. Fractional knapsack: sort by value/weight, take greedily.
lc: Meeting Rooms II; Car Pooling; Task Scheduler

> 🧒 **Like you're 5:** Meetings arrive in order of start time. Look at the room that frees up earliest. Is it free when the new meeting starts? Reuse it. Otherwise open a new room.

> 🏭 **At work:** the same "max overlap" logic answers "how many DB connections/threads do we need at peak?" from request start/end logs.

```java starter
import java.util.*;

class Solution {
    public int minMeetingRooms(int[][] intervals) {
        // TODO: sort by start + min-heap of end times
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.minMeetingRooms(new int[][]{{0, 30}, {5, 10}, {15, 20}}), 2);
        T.eq("back to back", () -> s.minMeetingRooms(new int[][]{{7, 10}, {2, 4}}), 1);
        T.eq("end equals start", () -> s.minMeetingRooms(new int[][]{{1, 5}, {5, 10}, {10, 15}}), 1);
        T.eq("all overlap", () -> s.minMeetingRooms(new int[][]{{1, 10}, {2, 9}, {3, 8}}), 3);
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public int minMeetingRooms(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        PriorityQueue<Integer> ends = new PriorityQueue<>();      // end time of each busy room
        for (int[] m : intervals) {
            if (!ends.isEmpty() && ends.peek() <= m[0]) ends.poll(); // that room is free again
            ends.offer(m[1]);
        }
        return ends.size();
    }
}
```

## MODULE graphs-dp | Graphs & Dynamic Programming
> 💡 **Pattern cheat-sheet:** Grid or "connected things" → BFS/DFS with a visited set. "Order with dependencies" → topological sort. "Shortest path, weights" → Dijkstra. "Count ways / min cost / max value with choices" → DP: define `dp[i]`, find the recurrence, set base cases.

### ITEM dsa-islands | BFS and DFS, number of islands, clone graph | must
ask: Count the islands in a grid of '1' (land) and '0' (water).
card: Scan every cell; when you find unvisited land, count++ and flood-fill (DFS or BFS) the whole island marking it visited (e.g. set to '0'). O(m·n). Clone graph: BFS/DFS with a HashMap old→new node to avoid cloning twice.
lc: Number of Islands; Max Area of Island; Clone Graph; Rotting Oranges

> 🧒 **Like you're 5:** Looking at a map from a helicopter. Each time you spot land you haven't painted yet, shout "new island!" and paint the whole island so you don't count it again.

```java
// BFS version of the flood fill (avoids deep recursion on huge grids)
Deque<int[]> q = new ArrayDeque<>();
q.add(new int[]{r, c}); grid[r][c] = '0';
int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
while (!q.isEmpty()) {
    int[] p = q.poll();
    for (int[] d : dirs) {
        int nr = p[0] + d[0], nc = p[1] + d[1];
        if (nr >= 0 && nc >= 0 && nr < m && nc < n && grid[nr][nc] == '1') { grid[nr][nc] = '0'; q.add(new int[]{nr, nc}); }
    }
}
```

```java starter
class Solution {
    public int numIslands(char[][] grid) {
        // TODO
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("one big island", () -> s.numIslands(new char[][]{"11110".toCharArray(), "11010".toCharArray(), "11000".toCharArray(), "00000".toCharArray()}), 1);
        T.eq("three islands", () -> s.numIslands(new char[][]{"11000".toCharArray(), "11000".toCharArray(), "00100".toCharArray(), "00011".toCharArray()}), 3);
        T.eq("diagonal is not connected", () -> s.numIslands(new char[][]{"10".toCharArray(), "01".toCharArray()}), 2);
        T.eq("all water", () -> s.numIslands(new char[][]{"000".toCharArray()}), 0);
        T.done();
    }
}
```

```java solution
class Solution {
    public int numIslands(char[][] grid) {
        int count = 0;
        for (int r = 0; r < grid.length; r++)
            for (int c = 0; c < grid[0].length; c++)
                if (grid[r][c] == '1') { count++; sink(grid, r, c); }
        return count;
    }
    private void sink(char[][] g, int r, int c) {
        if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != '1') return;
        g[r][c] = '0';                       // visited
        sink(g, r + 1, c); sink(g, r - 1, c); sink(g, r, c + 1); sink(g, r, c - 1);
    }
}
```

### ITEM dsa-course-schedule | Course schedule (cycle detection), topological sort, shortest path, Dijkstra | must
ask: There are n courses with prerequisites [course, prereq]. Can you finish all courses?
card: Build a graph + in-degree counts. Kahn's BFS: put all in-degree-0 courses in a queue; pop, count it, decrement neighbours, push new zeros. If count == n there's no cycle (and the pop order is a topological order). Unweighted shortest path = BFS. Weighted (no negatives) = Dijkstra with a min-heap of (dist, node).
lc: Course Schedule; Course Schedule II; Network Delay Time; Shortest Path in Binary Matrix

> 🧒 **Like you're 5:** Getting dressed: socks before shoes, shirt before jacket. Start with clothes that need nothing before them. Each time you put one on, cross it off the "waiting for" list of the others. If you get stuck with clothes left, the rules go in a circle (impossible).

> 🏭 **At work:** build tools (Maven/Gradle module order), Spring bean creation order, workflow engines (Airflow DAGs), DB migration ordering. All topological sort.

**Dijkstra in 5 lines of thought:** `dist[src]=0`; heap of `(d, node)`; pop the smallest; skip if stale (`d > dist[node]`); relax each edge `if dist[node]+w < dist[next]` update and push.

```java starter
import java.util.*;

class Solution {
    public boolean canFinish(int n, int[][] prerequisites) {
        // TODO: Kahn's algorithm (in-degree + queue)
        return false;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("simple", () -> s.canFinish(2, new int[][]{{1, 0}}), true);
        T.eq("cycle", () -> s.canFinish(2, new int[][]{{1, 0}, {0, 1}}), false);
        T.eq("chain", () -> s.canFinish(4, new int[][]{{1, 0}, {2, 1}, {3, 2}}), true);
        T.eq("bigger cycle", () -> s.canFinish(3, new int[][]{{0, 1}, {1, 2}, {2, 0}}), false);
        T.eq("no rules", () -> s.canFinish(3, new int[][]{}), true);
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public boolean canFinish(int n, int[][] prerequisites) {
        List<List<Integer>> next = new ArrayList<>();
        for (int i = 0; i < n; i++) next.add(new ArrayList<>());
        int[] indeg = new int[n];
        for (int[] p : prerequisites) { next.get(p[1]).add(p[0]); indeg[p[0]]++; }
        Deque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (indeg[i] == 0) q.add(i);
        int done = 0;
        while (!q.isEmpty()) {
            int c = q.poll();
            done++;
            for (int nx : next.get(c)) if (--indeg[nx] == 0) q.add(nx);
        }
        return done == n;                                  // leftovers = a cycle
    }
}
```

### ITEM dsa-coin-change | Climbing stairs, house robber, coin change, longest increasing subsequence | must
ask: Find the fewest coins needed to make an amount (coins can be reused). Return -1 if impossible.
card: dp[a] = fewest coins for amount a. dp[0] = 0, others = infinity. For each a and each coin c <= a: dp[a] = min(dp[a], dp[a-c] + 1). O(amount × coins). Climbing stairs: dp[i] = dp[i-1] + dp[i-2]. House robber: dp[i] = max(dp[i-1], dp[i-2] + nums[i]). LIS: dp O(n²) or patience sorting O(n log n).
lc: Coin Change; Climbing Stairs; House Robber; Longest Increasing Subsequence

> 🧒 **Like you're 5:** To make 11 rupees, ask: "if my last coin is 5, I need the best way to make 6, plus this one coin". Try every last coin, keep the best. Write answers for small amounts first so you never solve the same thing twice.

#### The DP recipe (say it out loud in interviews)
1. **State:** what does `dp[i]` mean? (fewest coins for amount i)
2. **Recurrence:** how does `dp[i]` use smaller answers?
3. **Base case:** `dp[0] = 0`
4. **Order:** small to big
5. **Answer:** `dp[amount]`

> ⚠️ **Trap:** Greedy (always take the biggest coin) fails: coins [1,3,4], amount 6 → greedy 4+1+1 = 3 coins, best is 3+3 = 2 coins.

```java starter
class Solution {
    public int coinChange(int[] coins, int amount) {
        // TODO: bottom-up DP
        return -1;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.coinChange(new int[]{1, 2, 5}, 11), 3);
        T.eq("impossible", () -> s.coinChange(new int[]{2}, 3), -1);
        T.eq("zero amount", () -> s.coinChange(new int[]{1}, 0), 0);
        T.eq("greedy fails", () -> s.coinChange(new int[]{1, 3, 4}, 6), 2);
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);                 // "infinity"
        dp[0] = 0;
        for (int a = 1; a <= amount; a++)
            for (int c : coins)
                if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
        return dp[amount] > amount ? -1 : dp[amount];
    }
}
```

### ITEM dsa-lcs | Longest common subsequence, edit distance, 0/1 knapsack | good
ask: Find the length of the longest common subsequence of two strings.
card: 2D DP: dp[i][j] = LCS of first i chars of a and first j chars of b. If a[i-1] == b[j-1]: dp[i][j] = dp[i-1][j-1] + 1, else max(dp[i-1][j], dp[i][j-1]). O(m·n). Edit distance: same grid, min of insert/delete/replace + 1. 0/1 knapsack: dp[i][w] = max(skip item, take item).
lc: Longest Common Subsequence; Edit Distance; Partition Equal Subset Sum

> 🧒 **Like you're 5:** Two friends listing the toys they own in order. You want the longest list of toys that appears in both lists in the same order (gaps allowed). Build a table: each box answers the question for shorter lists.

```diagram
      ""  a  c  e
  ""   0  0  0  0
  a    0  1  1  1
  b    0  1  1  1
  c    0  1  2  2
  d    0  1  2  2
  e    0  1  2  3   ← "abcde" vs "ace" = 3
```

```java starter
class Solution {
    public int longestCommonSubsequence(String a, String b) {
        // TODO: (m+1) x (n+1) table
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.longestCommonSubsequence("abcde", "ace"), 3);
        T.eq("same", () -> s.longestCommonSubsequence("abc", "abc"), 3);
        T.eq("nothing common", () -> s.longestCommonSubsequence("abc", "def"), 0);
        T.eq("empty", () -> s.longestCommonSubsequence("", "abc"), 0);
        T.done();
    }
}
```

```java solution
class Solution {
    public int longestCommonSubsequence(String a, String b) {
        int m = a.length(), n = b.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++)
            for (int j = 1; j <= n; j++)
                dp[i][j] = a.charAt(i - 1) == b.charAt(j - 1)
                        ? dp[i - 1][j - 1] + 1
                        : Math.max(dp[i - 1][j], dp[i][j - 1]);
        return dp[m][n];
    }
}
```
