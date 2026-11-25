// ===== JavaQuest helpers (added automatically, don't copy) =====
// Reserved class names: Main, T, ListNode, TreeNode, Employee
class ListNode {
    int val; ListNode next;
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class TreeNode {
    int val; TreeNode left, right;
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}

record Employee(String name, String dept, double salary, int age) {}

class T {
    static int pass = 0, fail = 0, n = 0;

    static String show(Object o) {
        if (o == null) return "null";
        if (o instanceof int[] a) return java.util.Arrays.toString(a);
        if (o instanceof long[] a) return java.util.Arrays.toString(a);
        if (o instanceof double[] a) return java.util.Arrays.toString(a);
        if (o instanceof char[] a) return java.util.Arrays.toString(a);
        if (o instanceof boolean[] a) return java.util.Arrays.toString(a);
        if (o instanceof Object[] a) return java.util.Arrays.deepToString(a);
        if (o instanceof ListNode l) return listStr(l);
        if (o instanceof String s) return "\"" + s + "\"";
        if (o instanceof Character c) return "'" + c + "'";
        if (o instanceof java.util.Optional<?> op) return op.isPresent() ? "Optional[" + show(op.get()) + "]" : "Optional.empty";
        if (o instanceof java.util.Map<?, ?> m && !(m instanceof java.util.SortedMap) && !(m instanceof java.util.LinkedHashMap)) {
            java.util.TreeMap<String, String> t = new java.util.TreeMap<>();
            m.forEach((k, v) -> t.put(String.valueOf(k), show(v)));
            return t.toString();
        }
        return String.valueOf(o);
    }

    static void eq(String name, java.util.function.Supplier<Object> got, Object expected) {
        n++;
        String label = name == null ? "Test " + n : name;
        try {
            Object g = got.get();
            String gs = show(g), es = show(expected);
            if (gs.equals(es)) { pass++; System.out.println("✅ " + label + "  →  " + gs); }
            else { fail++; System.out.println("❌ " + label + "\n     expected: " + es + "\n     got:      " + gs); }
        } catch (Throwable e) {
            fail++;
            System.out.println("💥 " + label + " crashed: " + e);
        }
    }

    static void eq(java.util.function.Supplier<Object> got, Object expected) { eq(null, got, expected); }

    static void done() {
        System.out.println();
        if (fail == 0 && pass > 0) System.out.println("🏆 ALL " + pass + " TESTS PASSED  #__NONCE__");
        else System.out.println("📊 " + pass + " passed, " + fail + " failed. Keep going, you're close!");
    }

    // ---- helpers for tests ----
    static ListNode list(int... v) {
        ListNode dummy = new ListNode(0), cur = dummy;
        for (int x : v) { cur.next = new ListNode(x); cur = cur.next; }
        return dummy.next;
    }

    static String listStr(ListNode h) {
        StringBuilder sb = new StringBuilder("[");
        int guard = 0;
        while (h != null && guard++ < 1000) { sb.append(h.val); if (h.next != null) sb.append(" -> "); h = h.next; }
        return sb.append("]").toString();
    }

    /** Build a tree from level order, null = no node. tree(3,9,20,null,null,15,7) */
    static TreeNode tree(Integer... v) {
        if (v.length == 0 || v[0] == null) return null;
        TreeNode root = new TreeNode(v[0]);
        java.util.ArrayDeque<TreeNode> q = new java.util.ArrayDeque<>();
        q.add(root);
        int i = 1;
        while (!q.isEmpty() && i < v.length) {
            TreeNode node = q.poll();
            if (i < v.length && v[i] != null) { node.left = new TreeNode(v[i]); q.add(node.left); }
            i++;
            if (i < v.length && v[i] != null) { node.right = new TreeNode(v[i]); q.add(node.right); }
            i++;
        }
        return root;
    }

    /** Sort inner lists and the outer list, so answer order doesn't matter. */
    static java.util.List<java.util.List<Integer>> sorted(java.util.List<java.util.List<Integer>> in) {
        java.util.List<java.util.List<Integer>> out = new java.util.ArrayList<>();
        for (java.util.List<Integer> l : in) { java.util.List<Integer> c = new java.util.ArrayList<>(l); java.util.Collections.sort(c); out.add(c); }
        out.sort((a, b) -> {
            for (int i = 0; i < Math.min(a.size(), b.size()); i++) { int c = Integer.compare(a.get(i), b.get(i)); if (c != 0) return c; }
            return Integer.compare(a.size(), b.size());
        });
        return out;
    }

    static <X extends Comparable<X>> java.util.List<X> sortedFlat(java.util.Collection<X> in) {
        java.util.List<X> c = new java.util.ArrayList<>(in);
        java.util.Collections.sort(c);
        return c;
    }

    static java.util.List<Employee> employees() {
        return java.util.List.of(
            new Employee("Asha", "Engineering", 120000, 29),
            new Employee("Ravi", "Engineering", 95000, 34),
            new Employee("Meera", "Engineering", 150000, 41),
            new Employee("John", "Sales", 60000, 25),
            new Employee("Priya", "Sales", 75000, 31),
            new Employee("Karan", "HR", 50000, 45),
            new Employee("Zoya", "HR", 65000, 27)
        );
    }
}
