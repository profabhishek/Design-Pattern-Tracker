# TRACK dsa
title: DSA: Coding Patterns
icon: 🧠
color: #8b5cf6
tier: must
about: 51 interview problem families, grouped by pattern. Each one has a kid-simple idea, a real Java compiler and hidden tests.

## MODULE arrays | Arrays & Matrices
> 💡 **Pattern cheat-sheet:** Need pairs? Sort + two pointers or a HashMap. Need "best subarray"? Kadane or sliding window. Need in-place? Swap with a write pointer. Always say the brute force first, then improve.

### ITEM dsa-3sum | Two Sum, 3Sum, 4Sum, pair with target | must
ask: Find all unique triplets in an array that add up to zero (3Sum). How do 2Sum and 4Sum relate?
card: 3Sum: sort, fix one number i, then two pointers L/R on the rest; skip duplicates. O(n²). 2Sum on unsorted = HashMap O(n); on sorted = two pointers. 4Sum = two loops + two pointers O(n³).
lc: Two Sum; 3Sum; 4Sum; Two Sum II - Input Array Is Sorted

> 🧒 **Like you're 5:** You have number cards in a row, smallest to biggest. Hold one card. Put one finger on the left end and one on the right end. Too big a total? Move the right finger left (smaller). Too small? Move the left finger right (bigger).

#### How to think
1. **Brute force:** three loops, O(n³). Say it, then improve.
2. **Sort** the array: now big and small are at known ends.
3. For each `i`, look for two numbers after it that sum to `-nums[i]` with two pointers.
4. **Skip duplicates** for `i`, `L` and `R` so each triplet appears once.

Walkthrough `[-1, 0, 1, 2, -1, -4]` → sorted `[-4, -1, -1, 0, 1, 2]`. Fix `-1`: L=`-1`, R=`2` → sum 0 ✅ `[-1,-1,2]`. Move both: L=`0`, R=`1` → 0 ✅ `[-1,0,1]`.

**Time** O(n²), **space** O(1) extra (ignoring output).

> 🎯 **Say this in the interview:** "Sorting costs n log n but unlocks the two-pointer trick, which turns the inner search from O(n²) into O(n)."

```java starter
import java.util.*;

class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        // TODO: sort, fix one number, two pointers for the other two, skip duplicates
        return new ArrayList<>();
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> T.sorted(s.threeSum(new int[]{-1, 0, 1, 2, -1, -4})), java.util.List.of(java.util.List.of(-1, -1, 2), java.util.List.of(-1, 0, 1)));
        T.eq("no answer", () -> T.sorted(s.threeSum(new int[]{0, 1, 1})), java.util.List.of());
        T.eq("all zeros (no duplicates!)", () -> T.sorted(s.threeSum(new int[]{0, 0, 0, 0})), java.util.List.of(java.util.List.of(0, 0, 0)));
        T.eq("many dups", () -> T.sorted(s.threeSum(new int[]{-2, 0, 0, 2, 2})), java.util.List.of(java.util.List.of(-2, 0, 2)));
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> res = new ArrayList<>();
        for (int i = 0; i < nums.length - 2; i++) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;      // skip duplicate first number
            int l = i + 1, r = nums.length - 1;
            while (l < r) {
                int sum = nums[i] + nums[l] + nums[r];
                if (sum == 0) {
                    res.add(List.of(nums[i], nums[l], nums[r]));
                    while (l < r && nums[l] == nums[l + 1]) l++; // skip duplicates
                    while (l < r && nums[r] == nums[r - 1]) r--;
                    l++; r--;
                } else if (sum < 0) l++;
                else r--;
            }
        }
        return res;
    }
}
```

```hint
Sort first. Then for each index i, the problem becomes "find two numbers after i that add up to -nums[i]".
```

```hint
Use l = i + 1 and r = n - 1. If the sum is too small move l right, too big move r left. When you find one, skip equal neighbours.
```

### ITEM dsa-kadane | Maximum subarray, max product subarray, best time to buy/sell stock | must
ask: Find the contiguous subarray with the largest sum (Kadane's algorithm).
card: Kadane: keep "best sum ending here" = max(num, current + num) and a global best. O(n), O(1). Max product: track both max and min (a negative flips them). Stock: track min price so far, profit = price - min.
lc: Maximum Subarray; Maximum Product Subarray; Best Time to Buy and Sell Stock

> 🧒 **Like you're 5:** You walk along a road collecting coins (some are negative = you pay). If your bag ever goes below zero, throw the bag away and start fresh from here. Remember the biggest bag you ever had.

#### How to think
At each number decide: **join the previous streak** or **start a new streak here**.
`cur = max(x, cur + x)`, `best = max(best, cur)`.

`[-2, 1, -3, 4, -1, 2, 1, -5, 4]` → cur goes -2, 1, -2, **4, 3, 5, 6**, 1, 5 → best = **6** (`[4,-1,2,1]`).

> ⚠️ **Trap:** Start `best` at `nums[0]`, not 0. If all numbers are negative, the answer is the biggest negative number.

**Stock buy/sell (one trade):** `minPrice = min(minPrice, p); profit = max(profit, p - minPrice)`. Same idea: a running best.

```java starter
class Solution {
    public int maxSubArray(int[] nums) {
        // TODO: Kadane's algorithm
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.maxSubArray(new int[]{-2, 1, -3, 4, -1, 2, 1, -5, 4}), 6);
        T.eq("single", () -> s.maxSubArray(new int[]{1}), 1);
        T.eq("all positive", () -> s.maxSubArray(new int[]{5, 4, -1, 7, 8}), 23);
        T.eq("all negative", () -> s.maxSubArray(new int[]{-3, -2, -5}), -2);
        T.done();
    }
}
```

```java solution
class Solution {
    public int maxSubArray(int[] nums) {
        int cur = nums[0], best = nums[0];
        for (int i = 1; i < nums.length; i++) {
            cur = Math.max(nums[i], cur + nums[i]);   // extend or restart
            best = Math.max(best, cur);
        }
        return best;
    }
}
```

```hint
For each element: is it better to add it to the running sum, or start a new subarray from it?
```

### ITEM dsa-product-except | Move zeroes, rotate array, product of array except self | must
ask: Return an array where each element is the product of all other elements, without using division, in O(n).
card: Product except self: pass 1 left-to-right stores product of everything to the left; pass 2 right-to-left multiplies by product of everything to the right. O(n), O(1) extra. Move zeroes: write pointer for non-zeros. Rotate by k: reverse all, reverse first k, reverse rest.
lc: Product of Array Except Self; Move Zeroes; Rotate Array

> 🧒 **Like you're 5:** For each kid in a line, you want "everybody's candies multiplied, except mine". Walk left to right writing down "candies of everyone before me". Walk back right to left multiplying "candies of everyone after me". Done, and nobody had to divide.

```diagram
nums     =  1   2   3   4
left     =  1   1   2   6     (product of everything before)
right    = 24  12   4   1     (product of everything after)
answer   = 24  12   8   6     (left × right)
```

**Move zeroes** (keep order): `w = 0; for x in nums: if x != 0: nums[w++] = x;` then fill the rest with 0.
**Rotate right by k**: `k %= n; reverse(0,n-1); reverse(0,k-1); reverse(k,n-1);`, O(1) space.

```java starter
class Solution {
    public int[] productExceptSelf(int[] nums) {
        // TODO: no division! prefix products, then suffix products
        return new int[nums.length];
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.productExceptSelf(new int[]{1, 2, 3, 4}), new int[]{24, 12, 8, 6});
        T.eq("with a zero", () -> s.productExceptSelf(new int[]{-1, 1, 0, -3, 3}), new int[]{0, 0, 9, 0, 0});
        T.eq("two numbers", () -> s.productExceptSelf(new int[]{3, 5}), new int[]{5, 3});
        T.done();
    }
}
```

```java solution
class Solution {
    public int[] productExceptSelf(int[] nums) {
        int n = nums.length;
        int[] ans = new int[n];
        ans[0] = 1;
        for (int i = 1; i < n; i++) ans[i] = ans[i - 1] * nums[i - 1];   // product of everything on the left
        int right = 1;
        for (int i = n - 1; i >= 0; i--) {
            ans[i] *= right;                                              // times everything on the right
            right *= nums[i];
        }
        return ans;
    }
}
```

```hint
answer[i] = (product of all numbers left of i) × (product of all numbers right of i).
```

### ITEM dsa-sort-colors | Merge sorted arrays, remove duplicates in-place, sort 0s 1s 2s | must
ask: Sort an array of 0s, 1s and 2s in one pass without a sort function (Dutch National Flag).
card: Dutch flag: three pointers low, mid, high. 0 → swap with low, low++, mid++. 1 → mid++. 2 → swap with high, high-- (don't move mid). One pass, O(1). Merge two sorted arrays in place: fill from the back.
lc: Sort Colors; Merge Sorted Array; Remove Duplicates from Sorted Array

> 🧒 **Like you're 5:** Sorting red, white and blue balls. Red balls go to the front shelf, blue balls go to the back shelf, white ones stay in the middle. One walk through the line, done.

```diagram
[ 0 0 | 1 1 | ? ? ? | 2 2 ]
        low   mid  high
 0s are before low, 1s between low and mid, unknown between mid and high, 2s after high
```

> ⚠️ **Trap:** After swapping a 2 to the end, do **not** move `mid`: the number you swapped in hasn't been checked yet.

**Merge sorted array** (`nums1` has space at the end): start from the **back** with `i = m-1, j = n-1, k = m+n-1`, put the bigger one at `k`. Starting from the front would overwrite numbers.

```java starter
class Solution {
    public void sortColors(int[] nums) {
        // TODO: low / mid / high pointers, one pass
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> { int[] a = {2, 0, 2, 1, 1, 0}; s.sortColors(a); return a; }, new int[]{0, 0, 1, 1, 2, 2});
        T.eq("three", () -> { int[] a = {2, 0, 1}; s.sortColors(a); return a; }, new int[]{0, 1, 2});
        T.eq("already sorted", () -> { int[] a = {0, 1, 2, 2}; s.sortColors(a); return a; }, new int[]{0, 1, 2, 2});
        T.eq("all twos", () -> { int[] a = {2, 2, 2}; s.sortColors(a); return a; }, new int[]{2, 2, 2});
        T.done();
    }
}
```

```java solution
class Solution {
    public void sortColors(int[] nums) {
        int low = 0, mid = 0, high = nums.length - 1;
        while (mid <= high) {
            if (nums[mid] == 0) swap(nums, low++, mid++);
            else if (nums[mid] == 1) mid++;
            else swap(nums, mid, high--);   // don't move mid: new value not checked yet
        }
    }
    private void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }
}
```

### ITEM dsa-missing | Find missing number, find duplicate, find disappeared numbers | must
ask: Given n distinct numbers from 0..n, find the one that is missing. How would you find a duplicate in 1..n without extra space?
card: Missing number: expected sum n(n+1)/2 minus actual sum (or XOR all indexes and values). Duplicate in 1..n without modifying: Floyd's cycle detection (treat values as next pointers). Disappeared numbers: mark nums[abs(x)-1] negative, positives left are missing.
lc: Missing Number; Find the Duplicate Number; Find All Numbers Disappeared in an Array

> 🧒 **Like you're 5:** 0 to 5 should add up to 15. Your numbers add up to 12. So the missing number is 15 − 12 = 3. Magic!

- **Sum trick:** `n*(n+1)/2 - sum`. Use `long` if n is huge (overflow).
- **XOR trick:** `x ^ x = 0`, so XOR all indexes 0..n and all values; pairs cancel, the missing one remains. No overflow at all.
- **Find duplicate (1..n, n+1 numbers):** values are "next pointers" → a cycle exists → Floyd's tortoise and hare finds the cycle entry = duplicate. O(n), O(1).
- **Disappeared numbers:** for each `x`, make `nums[|x|-1]` negative. Indexes still positive = missing numbers.

```java starter
class Solution {
    public int missingNumber(int[] nums) {
        // TODO: numbers are 0..n with one missing
        return -1;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.missingNumber(new int[]{3, 0, 1}), 2);
        T.eq("missing last", () -> s.missingNumber(new int[]{0, 1}), 2);
        T.eq("bigger", () -> s.missingNumber(new int[]{9, 6, 4, 2, 3, 5, 7, 0, 1}), 8);
        T.eq("missing zero", () -> s.missingNumber(new int[]{1}), 0);
        T.done();
    }
}
```

```java solution
class Solution {
    public int missingNumber(int[] nums) {
        int x = nums.length;                 // start with n
        for (int i = 0; i < nums.length; i++) x ^= i ^ nums[i];
        return x;                            // everything else cancelled out
    }
}
```

### ITEM dsa-fixed-window | Longest subarray with given sum, maximum sum of fixed-size window | must
ask: Find the maximum sum of any subarray of size k. Then: longest subarray with sum K (positives only).
card: Fixed window: sum the first k, then slide: add the new right element, subtract the one that left. O(n). Variable window (positives): grow right, shrink left while sum > K. With negatives, use prefix sum + HashMap of first index.
lc: Maximum Average Subarray I; Minimum Size Subarray Sum; Subarray Sum Equals K

> 🧒 **Like you're 5:** A window on a train shows exactly 3 houses. As the train moves, one house enters on the right and one leaves on the left. You don't recount all houses, you just add the new one and subtract the old one.

```diagram
[2 1 5] 1 3 2   sum = 8
 2 [1 5 1] 3 2  sum = 8 - 2 + 1 = 7
 2 1 [5 1 3] 2  sum = 7 - 1 + 3 = 9   ← best
```

**Variable window** (all positive): expand `right`, add to sum; while `sum > K` subtract `nums[left++]`; if `sum == K` update best length.

> ⚠️ **Trap:** The shrinking trick only works when all numbers are positive. With negatives use prefix sums (see "Subarray sum equals K").

```java starter
class Solution {
    public int maxSumWindow(int[] nums, int k) {
        // TODO: sliding window of size k
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.maxSumWindow(new int[]{2, 1, 5, 1, 3, 2}, 3), 9);
        T.eq("k = 1", () -> s.maxSumWindow(new int[]{4, -1, 7, 2}, 1), 7);
        T.eq("whole array", () -> s.maxSumWindow(new int[]{1, 2, 3}, 3), 6);
        T.eq("negatives", () -> s.maxSumWindow(new int[]{-5, -2, -3, -1}, 2), -4);
        T.done();
    }
}
```

```java solution
class Solution {
    public int maxSumWindow(int[] nums, int k) {
        int sum = 0;
        for (int i = 0; i < k; i++) sum += nums[i];
        int best = sum;
        for (int i = k; i < nums.length; i++) {
            sum += nums[i] - nums[i - k];   // new one in, old one out
            best = Math.max(best, sum);
        }
        return best;
    }
}
```

### ITEM dsa-matrix | Set matrix zeroes, rotate matrix 90°, spiral traversal | must
ask: Rotate an n×n matrix by 90 degrees clockwise in place.
card: Rotate 90° clockwise = transpose (swap m[i][j] with m[j][i]) then reverse each row. Spiral: four boundaries top/bottom/left/right, walk and shrink. Set zeroes in O(1) space: use first row/col as markers.
lc: Rotate Image; Spiral Matrix; Set Matrix Zeroes

> 🧒 **Like you're 5:** Flip the picture along its diagonal (like folding a paper corner to corner), then mirror each row left-right. That's a clockwise turn!

```diagram
1 2 3      transpose     1 4 7     reverse rows    7 4 1
4 5 6     ----------->   2 5 8    ------------->   8 5 2
7 8 9                    3 6 9                     9 6 3
```

**Spiral order:** keep `top, bottom, left, right`. Go right along top (top++), down the right side (right--), left along bottom (bottom--), up the left side (left++). Check `top <= bottom && left <= right` before each side.

```java starter
class Solution {
    public int[][] rotate(int[][] m) {
        // TODO: rotate in place, then return m
        return m;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("3x3", () -> s.rotate(new int[][]{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}), new int[][]{{7, 4, 1}, {8, 5, 2}, {9, 6, 3}});
        T.eq("2x2", () -> s.rotate(new int[][]{{1, 2}, {3, 4}}), new int[][]{{3, 1}, {4, 2}});
        T.eq("1x1", () -> s.rotate(new int[][]{{5}}), new int[][]{{5}});
        T.done();
    }
}
```

```java solution
class Solution {
    public int[][] rotate(int[][] m) {
        int n = m.length;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++) { int t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t; }  // transpose
        for (int[] row : m)
            for (int l = 0, r = n - 1; l < r; l++, r--) { int t = row[l]; row[l] = row[r]; row[r] = t; } // mirror
        return m;
    }
}
```

### ITEM dsa-intervals | Merge intervals, insert interval, non-overlapping intervals | must
ask: Given a list of intervals, merge all overlapping ones.
card: Sort by start. Walk: if the current start <= last merged end, extend end = max(end, curEnd); else start a new interval. O(n log n). Non-overlapping (min removals) = sort by END, greedily keep intervals that start after the last kept end.
lc: Merge Intervals; Insert Interval; Non-overlapping Intervals; Meeting Rooms

> 🧒 **Like you're 5:** Meetings on a calendar. Line them up by start time. If the next meeting starts before the current one ends, glue them into one long meeting.

`[[1,3],[2,6],[8,10],[15,18]]` → sorted → `[1,3]`+`[2,6]` overlap → `[1,6]`; `[8,10]` new; `[15,18]` new.

> 🏭 **Where you see it at work:** merging booking slots, combining maintenance windows, deduplicating time ranges in reports.

```java starter
import java.util.*;

class Solution {
    public int[][] merge(int[][] intervals) {
        // TODO: sort by start, then merge
        return intervals;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.merge(new int[][]{{1, 3}, {2, 6}, {8, 10}, {15, 18}}), new int[][]{{1, 6}, {8, 10}, {15, 18}});
        T.eq("touching", () -> s.merge(new int[][]{{1, 4}, {4, 5}}), new int[][]{{1, 5}});
        T.eq("unsorted + inside", () -> s.merge(new int[][]{{2, 3}, {1, 10}, {11, 12}}), new int[][]{{1, 10}, {11, 12}});
        T.eq("single", () -> s.merge(new int[][]{{5, 7}}), new int[][]{{5, 7}});
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public int[][] merge(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> out = new ArrayList<>();
        for (int[] cur : intervals) {
            if (!out.isEmpty() && cur[0] <= out.get(out.size() - 1)[1]) {
                int[] last = out.get(out.size() - 1);
                last[1] = Math.max(last[1], cur[1]);     // overlap: stretch the end
            } else {
                out.add(new int[]{cur[0], cur[1]});
            }
        }
        return out.toArray(new int[0][]);
    }
}
```

## MODULE strings | Strings & Sliding Window
> 💡 **Pattern cheat-sheet:** "Longest/shortest substring with a rule" = sliding window with a HashMap or int[26] of counts. Palindromes = two pointers or expand around the center. Anagrams = same character counts.

### ITEM dsa-reverse-words | Reverse words, reverse vowels, valid palindrome | must
ask: Reverse the order of words in a string, removing extra spaces.
card: Trim, split on one-or-more spaces ("\\s+"), reverse the array, join with one space. Valid palindrome: two pointers from both ends, skip non-alphanumerics, compare lowercase. Reverse vowels: two pointers that stop only on vowels and swap.
lc: Reverse Words in a String; Valid Palindrome; Reverse Vowels of a String

> 🧒 **Like you're 5:** Words are train carriages. Unhook them, line them up from last to first, and hook them back with exactly one connector between each.

```java
// Valid palindrome: "A man, a plan, a canal: Panama" → true
int l = 0, r = s.length() - 1;
while (l < r) {
    while (l < r && !Character.isLetterOrDigit(s.charAt(l))) l++;
    while (l < r && !Character.isLetterOrDigit(s.charAt(r))) r--;
    if (Character.toLowerCase(s.charAt(l++)) != Character.toLowerCase(s.charAt(r--))) return false;
}
return true;
```

> ⚠️ **Trap:** `split(" ")` on `"a  b"` gives an empty string in the middle. Use `trim().split("\\s+")`.

```java starter
class Solution {
    public String reverseWords(String s) {
        // TODO: "  the sky  is blue " -> "blue is sky the"
        return s;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.reverseWords("the sky is blue"), "blue is sky the");
        T.eq("extra spaces", () -> s.reverseWords("  hello   world  "), "world hello");
        T.eq("one word", () -> s.reverseWords("java"), "java");
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public String reverseWords(String s) {
        String[] words = s.trim().split("\\s+");
        Collections.reverse(Arrays.asList(words));   // asList is a view, so this reverses the array
        return String.join(" ", words);
    }
}
```

### ITEM dsa-longest-unique | Longest substring without repeating characters | must
ask: Find the length of the longest substring without repeating characters.
card: Sliding window + map of last seen index. For each right char: if it was seen inside the window, jump left to lastSeen+1. Update best = right-left+1. O(n).
lc: Longest Substring Without Repeating Characters

> 🧒 **Like you're 5:** You're collecting stickers in a row and can't have two of the same. When you find a duplicate, drop stickers from the start of your row until the old copy is gone.

```diagram
s = a b c a b c b b
    [a b c]          len 3
      [b c a]        'a' repeated → left jumps past old 'a'
         ...         best = 3
```

> 🎯 **Say this in the interview:** "Brute force checks every substring, O(n³). With a sliding window and a map of last positions, each char enters and leaves once: O(n) time, O(alphabet) space."

```java starter
class Solution {
    public int lengthOfLongestSubstring(String s) {
        // TODO: sliding window
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("abcabcbb", () -> s.lengthOfLongestSubstring("abcabcbb"), 3);
        T.eq("bbbbb", () -> s.lengthOfLongestSubstring("bbbbb"), 1);
        T.eq("pwwkew", () -> s.lengthOfLongestSubstring("pwwkew"), 3);
        T.eq("empty", () -> s.lengthOfLongestSubstring(""), 0);
        T.eq("abba (left must not go back)", () -> s.lengthOfLongestSubstring("abba"), 2);
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> last = new HashMap<>();
        int left = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (last.containsKey(c) && last.get(c) >= left) left = last.get(c) + 1;  // jump past the duplicate
            last.put(c, right);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
```

```hint
Keep a window [left, right]. Remember the last index of each character in a HashMap.
```

```hint
When s[right] was seen at index >= left, move left to lastIndex + 1. Watch "abba": left must never move backwards.
```

### ITEM dsa-char-replace | Longest repeating character replacement, minimum window substring | must
ask: You may replace at most k characters. What is the longest substring of one repeated letter you can get?
card: Window is valid if (window length - count of most frequent char) <= k. Grow right; if invalid, move left by one. maxFreq never needs to decrease. Minimum window substring: expand until all needed chars are covered, then shrink from left while still valid.
lc: Longest Repeating Character Replacement; Minimum Window Substring; Permutation in String

> 🧒 **Like you're 5:** In your window, the most common letter is the "team colour". Everyone else needs repainting. If you need more than k paint cans, slide the window's left edge forward.

`"AABABBA", k=1` → window `"AABA"`: most common A=3, length 4, need 1 repaint ✅ → answer 4.

**Minimum window substring (hard but famous):** keep `need` counts for t and a `missing` counter. Expand right until `missing == 0`, then shrink left as long as the window still covers t, recording the smallest window.

```java starter
class Solution {
    public int characterReplacement(String s, int k) {
        // TODO: window valid while (length - maxFreq) <= k
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("ABAB k=2", () -> s.characterReplacement("ABAB", 2), 4);
        T.eq("AABABBA k=1", () -> s.characterReplacement("AABABBA", 1), 4);
        T.eq("k=0", () -> s.characterReplacement("AABBB", 0), 3);
        T.eq("single", () -> s.characterReplacement("Z", 3), 1);
        T.done();
    }
}
```

```java solution
class Solution {
    public int characterReplacement(String s, int k) {
        int[] count = new int[26];
        int left = 0, maxFreq = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            maxFreq = Math.max(maxFreq, ++count[s.charAt(right) - 'A']);
            while (right - left + 1 - maxFreq > k) count[s.charAt(left++) - 'A']--;  // too many repaints
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
```

### ITEM dsa-anagrams | Group anagrams, valid anagram, find all anagram indices | must
ask: Group a list of words so that anagrams are together.
card: Anagrams share the same sorted letters (or the same 26-letter count). Use that as a HashMap key: Map<String, List<String>>. O(n · k log k). Valid anagram = compare int[26] counts. Find all anagrams = fixed sliding window of length p with counts.
lc: Group Anagrams; Valid Anagram; Find All Anagrams in a String

> 🧒 **Like you're 5:** "eat", "tea" and "ate" use the same Scrabble tiles. Sort the tiles of each word ("aet") and put words with the same tiles in the same box.

```java
// valid anagram in O(n)
int[] c = new int[26];
for (char ch : s.toCharArray()) c[ch - 'a']++;
for (char ch : t.toCharArray()) if (--c[ch - 'a'] < 0) return false;
return s.length() == t.length();
```

```java starter
import java.util.*;

class Solution {
    public List<List<String>> groupAnagrams(String[] words) {
        // TODO: key = sorted letters
        return new ArrayList<>();
    }
}
```

```java tests
class Main {
    static java.util.List<String> norm(java.util.List<java.util.List<String>> g) { // order-free comparison
        return g.stream().map(l -> l.stream().sorted().collect(java.util.stream.Collectors.joining(","))).sorted().toList();
    }
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> norm(s.groupAnagrams(new String[]{"eat", "tea", "tan", "ate", "nat", "bat"})), java.util.List.of("ate,eat,tea", "bat", "nat,tan"));
        T.eq("empty word", () -> norm(s.groupAnagrams(new String[]{""})), java.util.List.of(""));
        T.eq("no anagrams", () -> norm(s.groupAnagrams(new String[]{"ab", "cd"})), java.util.List.of("ab", "cd"));
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public List<List<String>> groupAnagrams(String[] words) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String w : words) {
            char[] c = w.toCharArray();
            Arrays.sort(c);
            groups.computeIfAbsent(new String(c), k -> new ArrayList<>()).add(w);
        }
        return new ArrayList<>(groups.values());
    }
}
```

### ITEM dsa-palindrome-sub | Longest palindromic substring, count palindromic substrings | must
ask: Find the longest palindromic substring.
card: Expand around center: every palindrome has a center (a char, or the gap between two chars). For each of the 2n-1 centers, expand while both ends match. O(n²) time, O(1) space. Counting palindromes = same loop, count each successful expansion.
lc: Longest Palindromic Substring; Palindromic Substrings

> 🧒 **Like you're 5:** Stand in the middle and stretch both arms out. As long as your left hand and right hand touch the same letter, keep stretching. Try standing on every letter and between every two letters.

`"cbbd"`: center between the two b's → `"bb"` (even length). That's why we try gaps too.

```java starter
class Solution {
    public String longestPalindrome(String s) {
        // TODO: expand around each center (odd and even)
        return "";
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("even center", () -> s.longestPalindrome("cbbd"), "bb");
        T.eq("long", () -> s.longestPalindrome("forgeeksskeegfor"), "geeksskeeg");
        T.eq("single", () -> s.longestPalindrome("a"), "a");
        T.eq("at start", () -> s.longestPalindrome("abccbaxyz"), "abccba");
        T.done();
    }
}
```

```java solution
class Solution {
    public String longestPalindrome(String s) {
        int start = 0, len = 0;
        for (int c = 0; c < s.length(); c++) {
            int a = expand(s, c, c), b = expand(s, c, c + 1);   // odd and even centers
            int best = Math.max(a, b);
            if (best > len) { len = best; start = c - (best - 1) / 2; }
        }
        return s.substring(start, start + len);
    }
    private int expand(String s, int l, int r) {
        while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) { l--; r++; }
        return r - l - 1;
    }
}
```

### ITEM dsa-compress | String compression, implement atoi, longest common prefix | good
ask: Compress a string like "aabcccccaaa" into "a2bc5a3" (count only when a letter repeats).
card: Walk with a pointer; count the run of the same char; append char + (count if > 1). Use StringBuilder. atoi: skip spaces, read sign, read digits, clamp to Integer range before overflow. Longest common prefix: compare character by character across all strings (vertical scan).
lc: String Compression; String to Integer (atoi); Longest Common Prefix

> 🧒 **Like you're 5:** Instead of saying "cow cow cow cow cow", say "cow ×5".

**atoi checklist** (interviewers love edge cases): leading spaces → optional `+`/`-` → digits only → stop at first non-digit → if result > `Integer.MAX_VALUE` clamp. Check overflow **before** multiplying: `if (res > (Integer.MAX_VALUE - d) / 10)`.

```java starter
class Solution {
    public String compress(String s) {
        // TODO: "aabcccccaaa" -> "a2bc5a3"
        return s;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.compress("aabcccccaaa"), "a2bc5a3");
        T.eq("no repeats", () -> s.compress("abc"), "abc");
        T.eq("long run", () -> s.compress("zzzzzzzzzzzz"), "z12");
        T.eq("empty", () -> s.compress(""), "");
        T.done();
    }
}
```

```java solution
class Solution {
    public String compress(String s) {
        StringBuilder sb = new StringBuilder();
        int i = 0;
        while (i < s.length()) {
            char c = s.charAt(i);
            int j = i;
            while (j < s.length() && s.charAt(j) == c) j++;   // run of the same char
            sb.append(c);
            if (j - i > 1) sb.append(j - i);
            i = j;
        }
        return sb.toString();
    }
}
```

### ITEM dsa-rotation | Check string rotation, min characters to make a palindrome | good
ask: Check whether one string is a rotation of another (e.g. "waterbottle" and "erbottlewat").
card: s2 is a rotation of s1 if lengths are equal and (s1 + s1) contains s2. Min chars to add at the front to make a palindrome: KMP failure function on s + "#" + reverse(s); answer = n - lps[last].
lc: Rotate String; Shortest Palindrome

> 🧒 **Like you're 5:** Write "waterbottle" twice in a row: "waterbottlewaterbottle". Every possible rotation is hiding inside it!

> 💡 **Tip:** `contains` is O(n·m) worst case in Java; mention KMP for guaranteed O(n) if they push.

```java starter
class Solution {
    public boolean isRotation(String a, String b) {
        // TODO
        return false;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("yes", () -> s.isRotation("waterbottle", "erbottlewat"), true);
        T.eq("different length", () -> s.isRotation("abc", "abcd"), false);
        T.eq("same letters, not rotation", () -> s.isRotation("abcd", "acbd"), false);
        T.eq("empty", () -> s.isRotation("", ""), true);
        T.done();
    }
}
```

```java solution
class Solution {
    public boolean isRotation(String a, String b) {
        return a.length() == b.length() && (a + a).contains(b);
    }
}
```

## MODULE hashing | HashMap, HashSet & Prefix Sum
> 💡 **Pattern cheat-sheet:** "Have I seen X before?" → HashSet. "How many times / where?" → HashMap. "Subarray sum = K" → prefix sum + HashMap of counts. Trade O(n) memory for O(1) lookups.

### ITEM dsa-two-sum | Two Sum with HashMap, first unique character, frequency count | must
ask: Return the indices of the two numbers that add up to target.
card: One pass: for each x, check if (target - x) is already in a map of value → index. If yes, done; else store x. O(n) time, O(n) space. First unique char: count frequencies, then scan again for count == 1.
lc: Two Sum; First Unique Character in a String

> 🧒 **Like you're 5:** You need 9 rupees with two coins. You pick up a 2. You ask your notebook: "Have I already seen a 7?" No? Write "2" in the notebook and keep going. Later you find the 7 and the notebook says "yes, at position 0!"

```java
// first unique character
int[] c = new int[26];
for (char ch : s.toCharArray()) c[ch - 'a']++;
for (int i = 0; i < s.length(); i++) if (c[s.charAt(i) - 'a'] == 1) return i;
return -1;
```

```java starter
class Solution {
    public int[] twoSum(int[] nums, int target) {
        // TODO: one pass with a HashMap<value, index>
        return new int[0];
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.twoSum(new int[]{2, 7, 11, 15}, 9), new int[]{0, 1});
        T.eq("not first", () -> s.twoSum(new int[]{3, 2, 4}, 6), new int[]{1, 2});
        T.eq("same value twice", () -> s.twoSum(new int[]{3, 3}, 6), new int[]{0, 1});
        T.eq("negatives", () -> s.twoSum(new int[]{-3, 4, 3, 90}, 0), new int[]{0, 2});
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();   // value -> index
        for (int i = 0; i < nums.length; i++) {
            Integer j = seen.get(target - nums[i]);
            if (j != null) return new int[]{j, i};
            seen.put(nums[i], i);
        }
        return new int[0];
    }
}
```

### ITEM dsa-consecutive | Find duplicates, intersection of arrays, longest consecutive sequence | must
ask: Find the length of the longest run of consecutive numbers in an unsorted array, in O(n).
card: Put all numbers in a HashSet. Only start counting from x if (x - 1) is NOT in the set (x is the start of a run). Then count x+1, x+2... Each number is visited at most twice: O(n). Intersection = HashSet of one array, filter the other.
lc: Longest Consecutive Sequence; Intersection of Two Arrays; Contains Duplicate

> 🧒 **Like you're 5:** Throw all number cards on the floor. Only start counting at a card whose "one smaller" friend is missing; that card is the first of a staircase.

`[100, 4, 200, 1, 3, 2]` → set. 1 has no 0 → count 1,2,3,4 → **4**. 2 has a 1 → skip (not a start).

> ⚠️ **Trap:** Without the "is x-1 missing?" check you count from every number and it becomes O(n²).

```java starter
class Solution {
    public int longestConsecutive(int[] nums) {
        // TODO: HashSet + only start at sequence beginnings
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.longestConsecutive(new int[]{100, 4, 200, 1, 3, 2}), 4);
        T.eq("with duplicates", () -> s.longestConsecutive(new int[]{0, 3, 7, 2, 5, 8, 4, 6, 0, 1}), 9);
        T.eq("empty", () -> s.longestConsecutive(new int[]{}), 0);
        T.eq("negatives", () -> s.longestConsecutive(new int[]{-1, -2, 5, -3}), 3);
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public int longestConsecutive(int[] nums) {
        Set<Integer> set = new HashSet<>();
        for (int x : nums) set.add(x);
        int best = 0;
        for (int x : set) {
            if (set.contains(x - 1)) continue;       // not the start of a run
            int len = 1;
            while (set.contains(x + len)) len++;
            best = Math.max(best, len);
        }
        return best;
    }
}
```

### ITEM dsa-subarray-k | Subarray sum equals K, count zero-sum subarrays, prefix sum range queries | must
ask: Count the subarrays whose sum equals k (numbers can be negative).
card: Prefix sum: sum(i..j) = prefix[j] - prefix[i-1]. Walk once keeping running sum; the number of earlier prefixes equal to (sum - k) is the number of subarrays ending here. Map starts with {0: 1}. O(n). Zero-sum subarrays = same with k = 0. Range queries: build prefix[] once, answer each in O(1).
lc: Subarray Sum Equals K; Range Sum Query - Immutable; Contiguous Array

> 🧒 **Like you're 5:** You write your total coins after every step in a notebook. If now you have 10 and k is 3, any earlier moment when you had 7 means "from then to now I collected exactly 3".

```diagram
nums     = 1  2  3      k = 3
prefix   = 1  3  6
at 3: need 3-3=0 → seen once (the empty start) → count 1  ([1,2])
at 6: need 6-3=3 → seen once                     → count 2  ([3])
```

> ⚠️ **Trap:** Don't forget `map.put(0, 1)`. It counts subarrays that start at index 0. Sliding window does NOT work here because of negatives.

```java starter
class Solution {
    public int subarraySum(int[] nums, int k) {
        // TODO: running sum + HashMap<prefixSum, howManyTimes>
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example 1", () -> s.subarraySum(new int[]{1, 1, 1}, 2), 2);
        T.eq("example 2", () -> s.subarraySum(new int[]{1, 2, 3}, 3), 2);
        T.eq("negatives", () -> s.subarraySum(new int[]{1, -1, 0}, 0), 3);
        T.eq("none", () -> s.subarraySum(new int[]{5, 6}, 3), 0);
        T.done();
    }
}
```

```java solution
import java.util.*;

class Solution {
    public int subarraySum(int[] nums, int k) {
        Map<Integer, Integer> seen = new HashMap<>();
        seen.put(0, 1);                               // empty prefix
        int sum = 0, count = 0;
        for (int x : nums) {
            sum += x;
            count += seen.getOrDefault(sum - k, 0);   // earlier prefixes that leave exactly k
            seen.merge(sum, 1, Integer::sum);
        }
        return count;
    }
}
```

### ITEM dsa-majority | Majority element, elements appearing more than n/3 times | must
ask: Find the element that appears more than n/2 times, in O(1) space.
card: Boyer-Moore voting: keep a candidate and a count. Same as candidate → count++, different → count--, count 0 → new candidate. The majority survives. For > n/3: keep two candidates and two counts, then verify with a second pass.
lc: Majority Element; Majority Element II

> 🧒 **Like you're 5:** A playground fight: each kid from a different team knocks out one kid from another team. If one team has more than half the kids, someone from that team is still standing at the end.

> ⚠️ **Trap:** Boyer-Moore assumes a majority exists. If it might not, do a second pass to count the candidate. For n/3 the second pass is required.

```java starter
class Solution {
    public int majorityElement(int[] nums) {
        // TODO: Boyer-Moore voting
        return 0;
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        T.eq("example", () -> s.majorityElement(new int[]{3, 2, 3}), 3);
        T.eq("longer", () -> s.majorityElement(new int[]{2, 2, 1, 1, 1, 2, 2}), 2);
        T.eq("single", () -> s.majorityElement(new int[]{7}), 7);
        T.done();
    }
}
```

```java solution
class Solution {
    public int majorityElement(int[] nums) {
        int candidate = 0, count = 0;
        for (int x : nums) {
            if (count == 0) candidate = x;
            count += (x == candidate) ? 1 : -1;
        }
        return candidate;
    }
}
```

### ITEM dsa-lru | Design an LRU cache (and LFU) | must
ask: Design an LRU cache with O(1) get and put.
card: HashMap for O(1) lookup + doubly linked list for order (most recent at head). get: move node to head. put: update/move to head; if over capacity remove tail. In Java you can also extend LinkedHashMap(cap, 0.75f, true) and override removeEldestEntry. LFU: map key→node, map freq→linked list, track minFreq.
lc: LRU Cache; LFU Cache

> 🧒 **Like you're 5:** A small toy shelf that holds 3 toys. Every time you play with a toy you put it at the front. When a new toy arrives and the shelf is full, the toy at the very back (played with longest ago) goes to the store room.

```diagram
HashMap: key → node            (find in O(1))
List:   head ⇄ [3] ⇄ [1] ⇄ [2] ⇄ tail
        most recent         least recent → evict this one
```

**The quick Java answer** (mention it, then build the real one if asked):
```java
class LRU<K, V> extends LinkedHashMap<K, V> {
    private final int cap;
    LRU(int cap) { super(cap, 0.75f, true); this.cap = cap; }   // true = access order
    @Override protected boolean removeEldestEntry(Map.Entry<K, V> e) { return size() > cap; }
}
```

> 🏭 **At work:** Caffeine and Guava caches, Redis `allkeys-lru` eviction, browser caches. Real LRU caches also need thread safety (a lock, or use Caffeine).

```java starter
import java.util.*;

class LRUCache {
    public LRUCache(int capacity) {
        // TODO
    }
    public int get(int key) {
        // TODO: return -1 if missing
        return -1;
    }
    public void put(int key, int value) {
        // TODO
    }
}
```

```java tests
class Main {
    public static void main(String[] args) {
        T.eq("LeetCode example", () -> {
            LRUCache c = new LRUCache(2);
            StringBuilder log = new StringBuilder();
            c.put(1, 1); c.put(2, 2);
            log.append(c.get(1)).append(",");   // 1
            c.put(3, 3);                        // evicts 2
            log.append(c.get(2)).append(",");   // -1
            c.put(4, 4);                        // evicts 1
            log.append(c.get(1)).append(",").append(c.get(3)).append(",").append(c.get(4));
            return log.toString();
        }, "1,-1,-1,3,4");
        T.eq("update moves to front", () -> {
            LRUCache c = new LRUCache(2);
            c.put(1, 1); c.put(2, 2); c.put(1, 10); c.put(3, 3);   // 2 is the oldest now
            return c.get(1) + "," + c.get(2) + "," + c.get(3);
        }, "10,-1,3");
        T.eq("capacity 1", () -> {
            LRUCache c = new LRUCache(1);
            c.put(5, 5); c.put(6, 6);
            return c.get(5) + "," + c.get(6);
        }, "-1,6");
        T.done();
    }
}
```

```java solution
import java.util.*;

class LRUCache {
    private static class Node { int key, val; Node prev, next; Node(int k, int v) { key = k; val = v; } }
    private final int cap;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0), tail = new Node(0, 0);   // dummy ends

    public LRUCache(int capacity) { cap = capacity; head.next = tail; tail.prev = head; }

    public int get(int key) {
        Node n = map.get(key);
        if (n == null) return -1;
        remove(n); addFront(n);
        return n.val;
    }

    public void put(int key, int value) {
        Node n = map.get(key);
        if (n != null) { n.val = value; remove(n); addFront(n); return; }
        if (map.size() == cap) { Node lru = tail.prev; remove(lru); map.remove(lru.key); }
        n = new Node(key, value);
        map.put(key, n); addFront(n);
    }

    private void remove(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    private void addFront(Node n) { n.next = head.next; n.prev = head; head.next.prev = n; head.next = n; }
}
```

```hint
You need two structures: a HashMap<Integer, Node> to find nodes fast, and a doubly linked list to keep the usage order.
```

```hint
Use dummy head and tail nodes so you never deal with null neighbours. Most recent goes right after head; evict tail.prev.
```
