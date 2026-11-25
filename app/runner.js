/* JavaQuest code runner.
   Sends Java code to a free online compiler and returns the result.
   Engine 1: Wandbox (OpenJDK 21, no key, CORS enabled). Engine 2: Judge0 CE (JDK 17) as fallback. */
(function () {
  "use strict";

  var WANDBOX = "https://wandbox.org/api/compile.json";
  var JUDGE0 = "https://ce.judge0.com/submissions?base64_encoded=true&wait=true";

  function b64(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function unb64(s) {
    if (!s) return "";
    var bin = atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // Wandbox saves the file as prog.java, so a top-level "public class X" would not compile. Drop "public" on top-level types.
  function dePublic(code) {
    return code.replace(/^(\s{0,0})public\s+((?:final\s+|abstract\s+|sealed\s+|non-sealed\s+)*(?:class|interface|enum|record)\s)/gm, "$1$2");
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error("timeout")); }, ms);
      promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }

  function wandbox(code, stdin) {
    return withTimeout(fetch(WANDBOX, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ compiler: "openjdk-jdk-21+35", code: dePublic(code), stdin: stdin || "", "runtime-option-raw": "-Dstdout.encoding=UTF-8\n-Dstderr.encoding=UTF-8" })
    }), 45000).then(function (r) {
      if (!r.ok) throw new Error("Wandbox HTTP " + r.status);
      return r.json();
    }).then(function (d) {
      var compileErr = d.compiler_error || "";
      var hasCompileError = /error:/.test(compileErr) && !d.program_output && !d.program_error;
      return {
        engine: "Wandbox · OpenJDK 21",
        compileError: hasCompileError ? compileErr : "",
        stdout: d.program_output || "",
        stderr: (d.program_error || "") + (hasCompileError ? "" : compileErr.replace(/^Note:.*$/gm, "").trim()),
        killed: !!d.signal,
        signal: d.signal || "",
        exit: d.status
      };
    });
  }

  function judge0(code, stdin) {
    return withTimeout(fetch(JUDGE0, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_code: b64(code.replace(/^public\s+class\s+Main\b/m, "class Main")), language_id: 91, stdin: b64(stdin || "") })
    }), 45000).then(function (r) {
      if (!r.ok) throw new Error("Judge0 HTTP " + r.status);
      return r.json();
    }).then(function (d) {
      var sid = d.status && d.status.id;
      return {
        engine: "Judge0 · JDK 17",
        compileError: sid === 6 ? unb64(d.compile_output) : "",
        stdout: unb64(d.stdout),
        stderr: unb64(d.stderr) + (sid === 5 ? "\nTime limit exceeded" : ""),
        killed: sid === 5,
        signal: sid === 5 ? "Time limit" : "",
        exit: sid === 3 ? "0" : "1"
      };
    });
  }

  function run(code, stdin, prefer) {
    var first = prefer === "judge0" ? judge0 : wandbox;
    var second = prefer === "judge0" ? wandbox : judge0;
    var t0 = performance.now();
    function stamp(res) { res.ms = Math.round(performance.now() - t0); return res; }
    if (prefer === "wandbox-only") return wandbox(code, stdin).then(stamp);
    if (prefer === "judge0-only") return judge0(code, stdin).then(stamp);
    return first(code, stdin).then(stamp, function () {
      return second(code, stdin).then(function (res) { res.fallback = true; return stamp(res); });
    });
  }

  // Plain-English help for common javac / runtime errors.
  var EXPLAIN = [
    [/cannot find symbol/, "Java doesn't know this name. Check the spelling (Java cares about Capital letters), or create/import it first."],
    [/';' expected/, "You forgot a semicolon ; at the end of a line. Every statement in Java ends with ;"],
    [/incompatible types/, "Wrong type in the box. Like putting a String into an int box. Check what the method returns and what the variable holds."],
    [/missing return statement/, "Your method promised to return something, but one path ends without a return. Add a return at the end."],
    [/class, interface, enum, or record expected/, "There is code outside a class, or an extra/missing curly brace { }. Count your braces."],
    [/reached end of file while parsing/, "A curly brace } is missing. Every { needs a matching }."],
    [/might not have been initialized/, "You used a variable before giving it a value. Give it a starting value, like int count = 0;"],
    [/is already defined/, "You created two things with the same name in the same place. Rename one of them."],
    [/unreachable statement/, "This line can never run because a return/break comes before it. Move or delete it."],
    [/non-static (method|variable) .* cannot be referenced from a static context/, "You called a normal (instance) method from static main. Create an object first: new Solution().myMethod()"],
    [/possible lossy conversion/, "You're squeezing a big number type into a smaller one (like long into int). Cast it: (int) value, or use the bigger type."],
    [/unreported exception/, "This method can throw a checked exception. Wrap it in try/catch or add 'throws Exception' to the method."],
    [/has private access/, "That field or method is private. Only its own class can touch it. Use a getter or change the access."],
    [/cannot be applied to given types/, "Wrong arguments: the method expects different inputs (count or types). Check the method signature."],
    [/duplicate class/, "Two classes have the same name. Don't name your classes Main, T, ListNode, TreeNode or Employee in challenges: the tests already use them."],
    [/ArrayIndexOutOfBoundsException/, "You asked for a box number that doesn't exist. Arrays start at index 0 and end at length - 1."],
    [/StringIndexOutOfBoundsException/, "You reached past the end of the String. Valid positions are 0 to length() - 1."],
    [/NullPointerException/, "You used something that is null (empty, points to nothing). Check it isn't null before calling methods on it."],
    [/StackOverflowError/, "Your recursion never stops. Add a base case that returns without calling itself again."],
    [/OutOfMemoryError/, "Too much memory used. Maybe an infinite loop keeps adding to a list?"],
    [/ArithmeticException: \/ by zero/, "You divided by zero. Check the divisor first."],
    [/ConcurrentModificationException/, "You changed a collection while looping over it with for-each. Use an Iterator's remove() or collect changes first."],
    [/NumberFormatException/, "Tried to turn text into a number but the text isn't a number."],
    [/ClassCastException/, "You tried to treat an object as a type it isn't."],
    [/UnsupportedOperationException: TODO/, "This is the starter TODO. Replace the 'throw' line with your own code."],
    [/UnsupportedOperationException/, "You tried to change an unmodifiable collection (like List.of). Copy it into new ArrayList<>(...) first."]
  ];
  function explain(text) {
    var tips = [];
    EXPLAIN.forEach(function (e) { if (e[0].test(text) && tips.indexOf(e[1]) < 0) tips.push(e[1]); });
    return tips.slice(0, 3);
  }

  window.Runner = { run: run, explain: explain, dePublic: dePublic };
})();
