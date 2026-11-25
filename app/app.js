/* JavaQuest app. One page, hash routes:
   #/ home · #/tracks · #/t/<track> · #/i/<item> · #/revise · #/boss · #/boss/<track> · #/playground · #/badges · #/stats
   Everything is saved in localStorage on this device. */
(function () {
  "use strict";

  var C = window.COURSE || { tracks: [], harness: "" };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  /* ================= course index ================= */
  var TRACKS = {}, ITEMS = {}, ALL = [];
  C.tracks.forEach(function (t) {
    TRACKS[t.id] = t;
    t.items = [];
    t.modules.forEach(function (m) {
      m.items.forEach(function (it) { it.modTitle = m.title; ITEMS[it.id] = it; t.items.push(it); ALL.push(it); });
    });
  });
  var PHASES = [
    { name: "Foundations", weeks: "Weeks 1–3", tracks: ["java-core", "collections", "streams"], dsa: "Arrays, strings, hashing, prefix sums" },
    { name: "Concurrency, SQL & Spring", weeks: "Weeks 4–6", tracks: ["concurrency", "sql", "spring"], dsa: "Two pointers, binary search, linked lists, stacks" },
    { name: "Design & data", weeks: "Weeks 7–9", tracks: ["lld", "patterns", "java-versions"], dsa: "Trees, heaps, backtracking, greedy" },
    { name: "Distributed & interview-ready", weeks: "Weeks 10–12", tracks: ["microservices", "kafka-redis", "hld", "aws", "career"], dsa: "Graphs, DP, then mixed mocks" }
  ];

  /* ================= state ================= */
  var LS = "jq-state-v1", LS_CODE = "jq-code-v1", LS_PAT = "pattern-sprint-tracker-v1";
  var S, CODE;
  function today(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function addDays(ds, n) { var d = new Date(ds + "T12:00:00"); d.setDate(d.getDate() + n); return today(d); }
  function daysBetween(a, b) { return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5); }
  function fresh() {
    return { v: 1, name: "", created: today(), goal: 60, target: "", sound: true, engine: "auto", onboarded: false,
      xp: 0, days: {}, items: {}, cards: {}, streak: { n: 0, best: 0, last: "" }, freezes: 0,
      quests: null, mission: null, badges: {}, boss: {}, combo: { n: 0, at: 0 },
      stats: { solvedClean: 0, runs: 0, focus: 0, lucky: 0, questDays: 0, missions: 0, reviews: 0, bossWins: 0, bossPerfect: 0 },
      focusStart: 0 };
  }
  function load() {
    try { S = JSON.parse(localStorage.getItem(LS) || "null"); } catch (e) { S = null; }
    var f = fresh();
    if (!S || typeof S !== "object") S = f;
    Object.keys(f).forEach(function (k) { if (S[k] === undefined) S[k] = f[k]; });
    Object.keys(f.stats).forEach(function (k) { if (S.stats[k] === undefined) S.stats[k] = 0; });
    try { CODE = JSON.parse(localStorage.getItem(LS_CODE) || "{}") || {}; } catch (e) { CODE = {}; }
  }
  var saveT;
  function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 120); }
  function saveNow() { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} }
  function saveCode() { try { localStorage.setItem(LS_CODE, JSON.stringify(CODE)); } catch (e) {} }
  function day(ds) { ds = ds || today(); if (!S.days[ds]) S.days[ds] = { xp: 0 }; return S.days[ds]; }
  function bump(k, n) { var d = day(); d[k] = (d[k] || 0) + (n || 1); }
  function rec(id) { if (!S.items[id]) S.items[id] = {}; return S.items[id]; }

  // old tracker ticks (shared with learn.html and patterns.html)
  function patLoad() { try { var o = JSON.parse(localStorage.getItem(LS_PAT) || "null"); if (o && o.done) return o; } catch (e) {} return { done: {}, start: today() }; }
  function patSave(o) { try { localStorage.setItem(LS_PAT, JSON.stringify(o)); } catch (e) {} }

  /* ================= progress helpers ================= */
  function status(it) { // 0 new, 1 started, 2 done
    if (it.kind === "pattern") {
      var d = patLoad().done, n = ["u", "b", "e"].filter(function (k) { return d[it.pid + ":" + k]; }).length;
      return n === 3 ? 2 : n ? 1 : 0;
    }
    var r = S.items[it.id];
    if (!r) return 0;
    if (it.ch) return r.s ? 2 : (r.r || r.e) ? 1 : 0;
    return r.e ? 2 : r.r ? 1 : 0;
  }
  function stars(it) {
    var r = S.items[it.id] || {}, c = S.cards[it.id];
    if (it.kind === "pattern") { var d = patLoad().done; return ["u", "b", "e"].map(function (k) { return !!d[it.pid + ":" + k]; }); }
    return [!!r.r, it.ch ? !!r.s : !!r.e, it.ch ? !!(r.s && !r.peek) : !!(c && c.box >= 4)];
  }
  function trackProgress(t) {
    var done = 0, started = 0;
    t.items.forEach(function (it) { var s = status(it); if (s === 2) done++; if (s >= 1) started++; });
    return { done: done, started: started, total: t.items.length, pct: t.items.length ? Math.round(done * 100 / t.items.length) : 0 };
  }
  function nextIn(t) { for (var i = 0; i < t.items.length; i++) if (status(t.items[i]) < 2) return t.items[i]; return null; }
  function focusTrack(exclude) {
    var order = C.tracks.map(function (t) { return t.id; });
    for (var i = 0; i < order.length; i++) {
      var t = TRACKS[order[i]];
      if (exclude && exclude.indexOf(t.id) >= 0) continue;
      if (t.items.some(function (it) { return it.tier === "must" && status(it) < 2; })) return t;
    }
    for (var j = 0; j < order.length; j++) { if (!(exclude && exclude.indexOf(order[j]) >= 0) && nextIn(TRACKS[order[j]])) return TRACKS[order[j]]; }
    return null;
  }

  /* ================= levels ================= */
  var TITLES = ["Hello World Kid 👶", "Semicolon Survivor", "Bug Squasher 🐛", "Loop Ninja 🥷", "Array Ace", "HashMap Hero 🦸", "Stream Surfer 🌊",
    "Thread Tamer 🧵", "Lambda Wizard 🧙", "Spring Sprout 🌱", "Bean Boss", "REST Ranger 🤠", "SQL Samurai ⚔️", "JPA Jedi", "Pattern Pro 🧩",
    "Kafka Knight 🛡️", "Cache Commander", "Microservice Mage 🔮", "System Design Sensei 🥋", "SDE-2 Ready 🚀", "Offer Magnet 💰", "Big-Pay Legend 👑"];
  function need(L) { return 25 * L * (L + 1); } // xp needed to reach level L+1
  function levelOf(xp) { var L = 1; while (xp >= need(L)) L++; return L; }
  function titleOf(L) { return TITLES[Math.min(L - 1, TITLES.length - 1)]; }

  /* ================= sound ================= */
  var AC;
  function tone(freq, dur, type, vol, when) {
    if (!S.sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      var t = AC.currentTime + (when || 0), o = AC.createOscillator(), g = AC.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  var SFX = {
    xp: function (c) { var f = [660, 784, 880, 988, 1175, 1319][clamp(c || 0, 0, 5)]; tone(f, .12, "triangle", .07); tone(f * 1.5, .1, "sine", .04, .05); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, .22, "triangle", .08, i * .09); }); },
    level: function () { [523, 659, 784, 1047, 1319, 1568].forEach(function (f, i) { tone(f, .3, "square", .04, i * .08); tone(f / 2, .3, "triangle", .05, i * .08); }); },
    bad: function () { tone(180, .25, "sawtooth", .04); tone(140, .3, "sine", .05, .08); },
    flip: function () { tone(420, .06, "sine", .04); tone(620, .06, "sine", .03, .04); },
    hit: function () { tone(110, .18, "square", .05); tone(70, .25, "sawtooth", .04, .05); }
  };

  /* ================= fx: confetti, toasts, floats ================= */
  var fxc = $("#fx"), fx = fxc.getContext("2d"), parts = [], fxOn = false;
  function confetti(n, x, y) {
    fxc.width = innerWidth; fxc.height = innerHeight;
    var colors = ["#8b6cff", "#22d3ee", "#fbbf24", "#fb7185", "#34d399", "#fb923c"];
    x = x == null ? innerWidth / 2 : x; y = y == null ? innerHeight / 3 : y;
    for (var i = 0; i < (n || 140); i++) {
      var a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 9;
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6, s: 4 + Math.random() * 6, c: rnd(colors), r: Math.random() * 6, vr: (Math.random() - .5) * .4, life: 120 + Math.random() * 60 });
    }
    if (!fxOn) { fxOn = true; requestAnimationFrame(tick); }
  }
  function tick() {
    fx.clearRect(0, 0, fxc.width, fxc.height);
    parts = parts.filter(function (p) { return p.life > 0 && p.y < fxc.height + 40; });
    parts.forEach(function (p) {
      p.vy += .25; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
      fx.save(); fx.translate(p.x, p.y); fx.rotate(p.r); fx.globalAlpha = Math.min(1, p.life / 40);
      fx.fillStyle = p.c; fx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); fx.restore();
    });
    if (parts.length) requestAnimationFrame(tick); else { fxOn = false; fx.clearRect(0, 0, fxc.width, fxc.height); }
  }
  function toast(icon, text, sub, cls) {
    var el = document.createElement("div");
    el.className = "toast " + (cls || "");
    el.innerHTML = '<span class="t-ic">' + icon + '</span><span>' + esc(text) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>';
    $("#toasts").appendChild(el);
    setTimeout(function () { el.classList.add("out"); setTimeout(function () { el.remove(); }, 320); }, 3600);
  }
  var lastPoint = null;
  document.addEventListener("pointerdown", function (e) { lastPoint = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true);
  function floatXp(n) {
    var el = document.createElement("div");
    el.className = "xp-float";
    el.textContent = "+" + n + " XP";
    var p = lastPoint && Date.now() - lastPoint.t < 4000 ? lastPoint : { x: innerWidth / 2, y: innerHeight / 2 };
    el.style.left = p.x + "px"; el.style.top = (p.y - 20) + "px";
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 1300);
  }
  function modal(html, onOpen) {
    $("#modalBox").innerHTML = html;
    $("#modal").hidden = false;
    if (onOpen) onOpen($("#modalBox"));
  }
  function closeModal() { $("#modal").hidden = true; $("#modalBox").innerHTML = ""; }
  $("#modal").addEventListener("click", function (e) { if (e.target.id === "modal" && S.onboarded) closeModal(); if (e.target.closest("[data-close]")) closeModal(); });

  /* ================= XP engine ================= */
  function award(n, reason, opts) {
    opts = opts || {};
    var before = levelOf(S.xp), bonus = 0, now = Date.now();
    if (opts.combo) {
      S.combo.n = now - S.combo.at < 4 * 60 * 1000 ? S.combo.n + 1 : 1;
      S.combo.at = now;
      if (S.combo.n >= 2) {
        bonus += Math.min(S.combo.n, 5) * 2;
        var c = document.createElement("div"); c.className = "combo"; c.textContent = "COMBO x" + S.combo.n + " 🔥";
        document.body.appendChild(c); setTimeout(function () { c.remove(); }, 1200);
      }
      if (S.combo.n >= 10) unlock("combo10");
      if (Math.random() < 0.1) {
        bonus += n; S.stats.lucky++;
        toast("🎁", "Lucky drop! Double XP", "+" + n + " bonus XP for " + reason, "gold");
        if (S.stats.lucky >= 5) unlock("lucky5");
      }
    }
    var total = n + bonus;
    S.xp += total;
    day().xp += total;
    floatXp(total);
    SFX.xp(S.combo.n);
    var hr = new Date().getHours();
    if (hr >= 23 || hr < 4) unlock("owl");
    if (hr >= 4 && hr < 7) unlock("early");
    checkStreak();
    var after = levelOf(S.xp);
    if (after > before) setTimeout(function () { levelUp(after); }, 450);
    checkBadges();
    save();
    hud();
    return total;
  }
  function levelUp(L) {
    SFX.level();
    confetti(220);
    modal('<span class="m-ic">🎉</span><small class="muted">LEVEL UP</small><span class="lvl-up-num">' + L + '</span><h2>' + esc(titleOf(L)) + '</h2>' +
      '<p>You leveled up! ' + (L >= 20 ? "You're interview-ready territory now. Keep the streak and book those interviews." : "Next title at level " + (L + 1) + ": <b>" + esc(titleOf(L + 1)) + "</b>") + '</p>' +
      '<div class="row"><button class="btn primary big" data-close>Keep going 🚀</button></div>');
  }
  function checkStreak() {
    var t = today(), d = day(t);
    if (d.xp >= S.goal && S.streak.last !== t) {
      S.streak.n = S.streak.last === addDays(t, -1) ? S.streak.n + 1 : 1;
      S.streak.last = t;
      S.streak.best = Math.max(S.streak.best, S.streak.n);
      d.goalHit = true;
      SFX.win(); confetti(90);
      toast("🔥", "Daily goal done! Streak: " + S.streak.n + " day" + (S.streak.n > 1 ? "s" : ""), "Come back tomorrow to keep it alive.", "gold");
      if (S.streak.n % 7 === 0 && S.freezes < 2) { S.freezes++; toast("🧊", "You earned a streak freeze", "It saves your streak if you miss one day."); }
      [3, 7, 14, 30, 60].forEach(function (k) { if (S.streak.n >= k) unlock("streak" + k); });
    }
  }
  function applyMissedDays() {
    var t = today();
    if (!S.streak.last || S.streak.last === t || S.streak.last === addDays(t, -1)) return;
    var missed = daysBetween(S.streak.last, t) - 1;
    if (S.streak.n > 0 && missed <= S.freezes) {
      S.freezes -= missed;
      for (var i = 1; i <= missed; i++) { day(addDays(S.streak.last, i)).frozen = true; }
      S.streak.last = addDays(t, -1);
      setTimeout(function () { toast("🧊", "A streak freeze saved your " + S.streak.n + "-day streak!", missed + " freeze" + (missed > 1 ? "s" : "") + " used."); }, 800);
    } else if (S.streak.n > 0) {
      var lost = S.streak.n;
      S.streak.n = 0;
      setTimeout(function () { toast("💔", "Your " + lost + "-day streak ended", "Start a new one today. Hit your daily goal!"); }, 800);
    }
    save();
  }

  /* ================= quests & mission ================= */
  var QUEST_POOL = [
    { k: "xp", icon: "⚡", txt: function (n) { return "Earn " + n + " XP"; }, n: [80, 120, 160] },
    { k: "read", icon: "📖", txt: function (n) { return "Read " + n + " new lessons"; }, n: [2, 3, 4] },
    { k: "solve", icon: "⌨️", txt: function (n) { return "Solve " + n + " coding challenge" + (n > 1 ? "s" : ""); }, n: [1, 2] },
    { k: "cards", icon: "🃏", txt: function (n) { return "Review " + n + " flashcards"; }, n: [8, 12, 15] },
    { k: "explain", icon: "🗣️", txt: function (n) { return "Explain " + n + " topics out loud"; }, n: [2, 3] },
    { k: "focus", icon: "⏱️", txt: function () { return "Finish one 25-min focus session"; }, n: [1] },
    { k: "boss", icon: "🐉", txt: function () { return "Beat a mock interview boss"; }, n: [1] }
  ];
  function seeded(seed) { var x = 0; for (var i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0; return function () { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
  function ensureQuests() {
    var t = today();
    if (S.quests && S.quests.date === t) return;
    var r = seeded(t + S.created), pool = QUEST_POOL.slice(), picks = [];
    picks.push(pool.splice(0, 1)[0]); // always an XP quest
    while (picks.length < 3) { var q = pool.splice(Math.floor(r() * pool.length), 1)[0]; if (q.k === "boss" && countRead() < 4) continue; picks.push(q); }
    S.quests = { date: t, claimed: false, list: picks.map(function (q) { var n = q.n[Math.floor(r() * q.n.length)]; if (q.k === "xp") n = Math.max(n, S.goal + 40); return { k: q.k, n: n }; }) };
    save();
  }
  function questDef(k) { return QUEST_POOL.filter(function (q) { return q.k === k; })[0]; }
  function questProg(q) { return Math.min(q.n, day()[q.k] || 0); }
  function questsDone() { return S.quests.list.every(function (q) { return questProg(q) >= q.n; }); }
  function countRead() { return Object.keys(S.items).filter(function (k) { return S.items[k].r; }).length; }

  function ensureMission() {
    var t = today();
    if (S.mission && S.mission.date === t) return;
    var ids = [], used = [];
    var dsa = TRACKS.dsa && nextIn(TRACKS.dsa);
    if (dsa) { ids.push(dsa.id); used.push("dsa"); }
    var a = focusTrack(used);
    if (a) { var ia = nextIn(a); if (ia) { ids.push(ia.id); used.push(a.id); } var ia2 = a.items.filter(function (x) { return status(x) < 2 && x.id !== (ia && ia.id); })[0]; if (ia2) ids.push(ia2.id); }
    var b = focusTrack(used);
    if (b) { var ib = nextIn(b); if (ib) ids.push(ib.id); }
    S.mission = { date: t, ids: ids, bonus: false };
    save();
  }
  function checkMission() {
    if (!S.mission || S.mission.bonus || !S.mission.ids.length) return;
    if (S.mission.ids.every(function (id) { return ITEMS[id] && status(ITEMS[id]) === 2; })) {
      S.mission.bonus = true; S.stats.missions++;
      setTimeout(function () {
        award(40, "daily mission");
        confetti(200); SFX.win();
        toast("🎯", "Daily mission complete! +40 XP", "Today's plan is done. Anything extra is pure bonus.", "gold");
        if (S.stats.missions >= 5) unlock("mission5");
      }, 700);
    }
  }

  /* ================= badges ================= */
  var BADGES = [
    ["start", "🌱", "Quest begins", "Set up your JavaQuest profile"],
    ["read1", "📖", "First page", "Read your first lesson"],
    ["read25", "📚", "Bookworm", "Read 25 lessons"],
    ["read100", "🦉", "Library card", "Read 100 lessons"],
    ["solve1", "⌨️", "Hello, compiler", "Solve your first coding challenge"],
    ["solve10", "🧠", "Problem solver", "Solve 10 coding challenges"],
    ["solve30", "🏋️", "DSA gym rat", "Solve 30 coding challenges"],
    ["clean10", "🙈", "No peeking", "Solve 10 challenges without opening the solution"],
    ["explain20", "🗣️", "Teacher mode", "Mark 20 topics as 'I can explain it'"],
    ["streak3", "🔥", "Warming up", "Reach a 3-day streak"],
    ["streak7", "🌋", "On fire", "Reach a 7-day streak"],
    ["streak14", "☄️", "Unstoppable", "Reach a 14-day streak"],
    ["streak30", "🏔️", "Habit unlocked", "Reach a 30-day streak"],
    ["streak60", "🪐", "Legend streak", "Reach a 60-day streak"],
    ["xp1000", "⚡", "1K club", "Earn 1,000 XP"],
    ["xp5000", "💎", "5K club", "Earn 5,000 XP"],
    ["xp10000", "👑", "10K royalty", "Earn 10,000 XP"],
    ["cards50", "🃏", "Card shark", "Review 50 flashcards"],
    ["cards300", "🎴", "Memory palace", "Review 300 flashcards"],
    ["boss1", "🐉", "Dragon slayer", "Beat your first mock interview boss"],
    ["bossPerfect", "🗡️", "Flawless victory", "Nail every question in a mock interview"],
    ["boss5", "🏰", "Interview veteran", "Beat 5 mock interview bosses"],
    ["track1", "🏆", "Track champion", "Finish every lesson in one track"],
    ["streams", "🌊", "Stream master", "Finish the Streams track"],
    ["dsaHalf", "🧗", "Halfway up DSA", "Finish half of the DSA track"],
    ["patterns", "🧩", "Pattern collector", "Tick all 3 boxes for all 32 design patterns"],
    ["quests7", "📜", "Quest hunter", "Open 7 daily quest chests"],
    ["mission5", "🎯", "Mission focused", "Complete 5 daily missions"],
    ["focus5", "⏱️", "Deep work", "Finish 5 focus sessions"],
    ["combo10", "💥", "Combo king", "Hit a 10x combo"],
    ["lucky5", "🍀", "Lucky charm", "Get 5 lucky drops"],
    ["owl", "🌙", "Night owl", "Study after 11 pm"],
    ["early", "🌅", "Early bird", "Study before 7 am"],
    ["play", "🧪", "Mad scientist", "Run code in the playground"],
    ["ready", "🚀", "SDE-2 ready", "Finish every must-know lesson"]
  ];
  function unlock(id) {
    if (S.badges[id]) return;
    var b = BADGES.filter(function (x) { return x[0] === id; })[0];
    if (!b) return;
    S.badges[id] = Date.now();
    save();
    setTimeout(function () { toast(b[1], "Badge unlocked: " + b[2], b[3], "gold"); SFX.win(); confetti(70, innerWidth - 120, innerHeight - 80); }, 300);
  }
  function checkBadges() {
    var vals = Object.keys(S.items).map(function (k) { return S.items[k]; });
    var reads = vals.filter(function (r) { return r.r; }).length, solves = vals.filter(function (r) { return r.s; }).length, ex = vals.filter(function (r) { return r.e; }).length;
    if (reads >= 1) unlock("read1"); if (reads >= 25) unlock("read25"); if (reads >= 100) unlock("read100");
    if (solves >= 1) unlock("solve1"); if (solves >= 10) unlock("solve10"); if (solves >= 30) unlock("solve30");
    if (S.stats.solvedClean >= 10) unlock("clean10");
    if (ex >= 20) unlock("explain20");
    if (S.xp >= 1000) unlock("xp1000"); if (S.xp >= 5000) unlock("xp5000"); if (S.xp >= 10000) unlock("xp10000");
    if (S.stats.reviews >= 50) unlock("cards50"); if (S.stats.reviews >= 300) unlock("cards300");
    if (S.stats.bossWins >= 1) unlock("boss1"); if (S.stats.bossWins >= 5) unlock("boss5"); if (S.stats.bossPerfect >= 1) unlock("bossPerfect");
    if (S.stats.questDays >= 7) unlock("quests7");
    if (S.stats.focus >= 5) unlock("focus5");
    C.tracks.forEach(function (t) { var p = trackProgress(t); if (p.total && p.done === p.total) { unlock("track1"); if (t.id === "streams") unlock("streams"); if (t.id === "patterns") unlock("patterns"); } if (t.id === "dsa" && p.done * 2 >= p.total && p.total) unlock("dsaHalf"); });
    if (ALL.length && ALL.filter(function (i) { return i.tier === "must"; }).every(function (i) { return status(i) === 2; })) unlock("ready");
  }

  /* ================= flashcards (spaced repetition) ================= */
  var INTERVAL = [0, 1, 2, 4, 8, 16, 32];
  function addCard(id) { if (!S.cards[id] && ITEMS[id] && ITEMS[id].card) S.cards[id] = { box: 1, due: today(), reps: 0 }; }
  function dueCards() { var t = today(); return Object.keys(S.cards).filter(function (id) { return ITEMS[id] && S.cards[id].due <= t; }); }

  /* ================= HUD ================= */
  function hud() {
    var L = levelOf(S.xp), lo = L === 1 ? 0 : need(L - 1), hi = need(L);
    $("#lvlBadge").textContent = L;
    $("#lvlTitle").textContent = titleOf(L);
    $("#xpFill").style.width = Math.round((S.xp - lo) * 100 / (hi - lo)) + "%";
    $(".hud-level").title = "Level " + L + " · " + S.xp + " XP · " + (hi - S.xp) + " XP to level " + (L + 1);
    $("#streakN").textContent = S.streak.n;
    $("#hudStreak").classList.toggle("lit", S.streak.last === today());
    $("#hudStreak").title = S.streak.last === today() ? "Streak safe for today 🔥" : "Earn " + Math.max(0, S.goal - day().xp) + " more XP today to keep your streak";
    $("#freezeN").textContent = S.freezes;
    var g = day().xp;
    $("#goalTxt").textContent = Math.min(g, 9999) + "/" + S.goal;
    $("#goalRing").style.strokeDashoffset = 94.25 * (1 - clamp(g / S.goal, 0, 1));
    var due = dueCards().length;
    $("#dueCount").hidden = !due; $("#dueCount").textContent = due;
    $("#soundBtn").textContent = S.sound ? "🔊" : "🔇";
    sideTracks();
  }
  function sideTracks() {
    var cur = (location.hash.match(/^#\/(?:t|i)\/([\w-]+)/) || [])[1];
    var curTrack = cur && (TRACKS[cur] ? cur : ITEMS[cur] && ITEMS[cur].track);
    $("#sideTracks").innerHTML = "<h4>Tracks</h4>" + C.tracks.map(function (t) {
      var p = trackProgress(t);
      return '<a href="#/t/' + t.id + '" class="' + (curTrack === t.id ? "on" : "") + '"><span>' + t.icon + '</span>' + esc(t.title) + '<span class="mini">' + p.done + '/' + p.total + '</span></a>';
    }).join("");
  }

  /* ================= views ================= */
  var view = $("#view"), cleanup = null;
  function route() {
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    var h = location.hash.replace(/^#\/?/, "").split("/");
    var page = h[0] || "home", arg = h[1];
    $$("[data-nav]").forEach(function (a) { a.classList.toggle("on", a.dataset.nav === (page === "t" || page === "i" ? "tracks" : page)); });
    $("#side").classList.remove("open");
    ensureQuests(); ensureMission();
    if (page === "home") home();
    else if (page === "tracks") tracksPage();
    else if (page === "t" && TRACKS[arg]) trackPage(TRACKS[arg]);
    else if (page === "i" && ITEMS[arg]) lessonPage(ITEMS[arg]);
    else if (page === "revise") revisePage(arg);
    else if (page === "boss") bossPage(arg);
    else if (page === "playground") playgroundPage();
    else if (page === "badges") badgesPage();
    else if (page === "stats") statsPage();
    else home();
    hud();
    window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
  }

  function greet() {
    var h = new Date().getHours();
    return (h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening") + (S.name ? ", " + S.name : "");
  }
  function itemIcon(it) { return it.ch ? "⌨️" : it.kind === "pattern" ? "🧩" : TRACKS[it.track].icon; }
  function xpFor(it) { return it.ch ? 50 : it.kind === "pattern" ? 30 : 25; }

  function home() {
    var L = levelOf(S.xp), done = ALL.filter(function (i) { return status(i) === 2; }).length;
    var pct = ALL.length ? done / ALL.length : 0, circ = 2 * Math.PI * 64;
    var mission = S.mission.ids.map(function (id) { return ITEMS[id]; }).filter(Boolean);
    var due = dueCards().length;
    var cont = mission.filter(function (i) { return status(i) < 2; })[0] || (focusTrack() && nextIn(focusTrack()));
    var h = '';
    h += '<section class="hero"><div><h1>' + esc(greet()) + ' 👋</h1>';
    h += '<p>' + (S.streak.last === today() ? "Streak is safe for today. Every extra lesson now is bonus XP." : S.streak.n ? "You're on a <b>" + S.streak.n + "-day streak</b>. Earn " + Math.max(0, S.goal - day().xp) + " more XP today to keep it 🔥" : "Earn " + S.goal + " XP today to start a streak. Small daily steps beat weekend cramming.") + '</p>';
    h += '<div class="row">' + (cont ? '<a class="btn primary big" href="#/i/' + cont.id + '">▶ Continue: ' + esc(cont.t.length > 34 ? cont.t.slice(0, 32) + "…" : cont.t) + '</a>' : '<a class="btn primary big" href="#/boss">🐉 Fight a mock interview</a>');
    if (due) h += '<a class="btn big" href="#/revise">🃏 ' + due + ' card' + (due > 1 ? "s" : "") + ' due</a>';
    h += '</div></div>';
    h += '<div class="big-ring"><svg viewBox="0 0 150 150"><defs><linearGradient id="gradRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b6cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><circle class="bg" cx="75" cy="75" r="64"/><circle class="fg" cx="75" cy="75" r="64" stroke-dasharray="' + circ + '" stroke-dashoffset="' + circ + '" id="courseRing"/></svg><div class="lbl"><div><b>' + Math.round(pct * 100) + '%</b><small>course done<br>' + done + ' / ' + ALL.length + '</small></div></div></div>';
    h += '</section>';

    h += '<div class="grid g2" style="margin-top:16px">';
    // mission
    h += '<section class="card"><div class="row" style="justify-content:space-between;margin-bottom:12px"><h2 style="font-size:18px">🎯 Today\'s mission</h2><span class="chip">' + (S.mission.bonus ? "✅ +40 XP earned" : "Finish all: +40 XP") + '</span></div><div class="mission">';
    mission.forEach(function (it) {
      var st = status(it);
      h += '<a class="mission-item ' + (st === 2 ? "is-done" : "") + '" href="#/i/' + it.id + '"><span class="mi-ic">' + (st === 2 ? "✅" : itemIcon(it)) + '</span><span class="mi-t"><b>' + esc(it.t) + '</b><small>' + esc(TRACKS[it.track].title) + ' · ' + (it.ch ? "coding challenge" : it.kind === "pattern" ? "understand · build · explain" : "read + explain") + '</small></span><span class="mi-xp">' + (st === 2 ? "done" : "+" + xpFor(it) + " XP") + '</span></a>';
    });
    if (due) h += '<a class="mission-item" href="#/revise"><span class="mi-ic">🃏</span><span class="mi-t"><b>Review ' + due + ' flashcard' + (due > 1 ? "s" : "") + '</b><small>Spaced repetition: remember it forever</small></span><span class="mi-xp">+' + due * 3 + ' XP</span></a>';
    if (!mission.length) h += '<p class="muted">You finished every lesson. Time for mock interviews! 🐉</p>';
    h += '</div></section>';
    // quests
    h += '<section class="card"><div class="row" style="justify-content:space-between;margin-bottom:6px"><h2 style="font-size:18px">📜 Daily quests</h2><span class="chip">resets at midnight</span></div>';
    S.quests.list.forEach(function (q) {
      var d = questDef(q.k), p = questProg(q);
      h += '<div class="quest ' + (p >= q.n ? "done" : "") + '"><span class="q-ic">' + (p >= q.n ? "✅" : d.icon) + '</span><div class="q-body"><b>' + esc(d.txt(q.n)) + '</b><div class="progress"><i style="width:' + Math.round(p * 100 / q.n) + '%"></i></div></div><span class="q-n">' + p + '/' + q.n + '</span></div>';
    });
    var ready = questsDone();
    h += '<div class="chest ' + (S.quests.claimed ? "opened" : ready ? "ready" : "") + '"><span class="ch-ic">' + (S.quests.claimed ? "🪙" : "🎁") + '</span><div style="flex:1"><b>' + (S.quests.claimed ? "Chest opened. See you tomorrow!" : ready ? "Your chest is ready!" : "Finish all 3 quests to open the chest") + '</b><div class="small muted">Reward: 60 XP + a surprise</div></div>' + (ready && !S.quests.claimed ? '<button class="btn gold" id="openChest">Open</button>' : '') + '</div>';
    h += '</section></div>';

    // stats row
    h += '<div class="grid g3" style="margin-top:16px">';
    h += '<section class="card"><h3 style="font-size:15px;margin-bottom:10px">⚡ This week</h3>' + weekBars(7) + '</section>';
    h += '<section class="card"><h3 style="font-size:15px;margin-bottom:10px">🗓️ Activity</h3>' + heatmap(18) + '<p class="small muted" style="margin:8px 0 0">Best streak: <b>' + S.streak.best + '</b> days · Freezes: <b>' + S.freezes + '</b> 🧊</p></section>';
    h += '<section class="card">';
    if (S.target) {
      var left = daysBetween(today(), S.target);
      h += '<h3 style="font-size:15px;margin-bottom:10px">⏳ Interview countdown</h3><div class="countdown"><b>' + (left >= 0 ? left : 0) + '</b><span class="muted">days until ' + esc(S.target) + '</span></div>';
      var mustLeft = ALL.filter(function (i) { return i.tier === "must" && status(i) < 2; }).length;
      h += '<p class="small muted" style="margin:10px 0 0">' + mustLeft + ' must-know lessons left' + (left > 0 ? ' → about <b>' + Math.ceil(mustLeft / left) + '/day</b> to finish in time.' : '.') + '</p>';
    } else {
      h += '<h3 style="font-size:15px;margin-bottom:10px">⏳ Set a target date</h3><p class="small muted">A deadline makes it real. Add your interview date in settings and you get a daily pace.</p><a class="btn sm" href="#/stats">Set date</a>';
    }
    h += '<div class="row" style="margin-top:12px"><span class="chip">Lv ' + L + ' · ' + esc(titleOf(L)) + '</span><span class="chip">' + S.xp + ' XP</span></div></section>';
    h += '</div>';

    h += '<div class="section-h"><h2>🗺️ Your tracks</h2><a href="#/tracks">See roadmap →</a></div>' + trackGrid();
    view.innerHTML = h;
    requestAnimationFrame(function () { var r = $("#courseRing"); if (r) r.style.strokeDashoffset = circ * (1 - pct); });
    var oc = $("#openChest");
    if (oc) oc.onclick = function () {
      S.quests.claimed = true; S.stats.questDays++;
      var extra = rnd([0, 0, 10, 20, 40]);
      award(60 + extra, "quest chest");
      if (Math.random() < 0.25 && S.freezes < 2) { S.freezes++; toast("🧊", "Surprise! A streak freeze", "Saved for a busy day."); }
      else if (extra) toast("🪙", "Surprise bonus +" + extra + " XP", "Lucky chest!");
      confetti(180); checkBadges(); save(); home(); hud();
    };
  }
  function weekBars(n) {
    var arr = [], max = 1;
    for (var i = n - 1; i >= 0; i--) { var ds = addDays(today(), -i), x = (S.days[ds] && S.days[ds].xp) || 0; arr.push([ds, x]); max = Math.max(max, x, S.goal); }
    return '<div class="bars">' + arr.map(function (a) {
      var dn = new Date(a[0] + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2);
      return '<div><span>' + (a[1] || "") + '</span><i style="height:' + Math.round(a[1] * 100 / max) + '%;' + (a[1] >= S.goal ? "" : "opacity:.55") + '"></i><small>' + dn + '</small></div>';
    }).join("") + '</div>';
  }
  function heatmap(weeks) {
    var t = today(), start = addDays(t, -(weeks * 7 - 1) - new Date(t + "T12:00:00").getDay() + 6 - 6), out = "";
    var first = addDays(t, -((weeks - 1) * 7 + new Date(t + "T12:00:00").getDay()));
    for (var i = 0; i < weeks * 7; i++) {
      var ds = addDays(first, i); if (ds > t) { out += '<i style="opacity:0"></i>'; continue; }
      var x = (S.days[ds] && S.days[ds].xp) || 0, l = x === 0 ? 0 : x < S.goal / 2 ? 1 : x < S.goal ? 2 : x < S.goal * 2 ? 3 : 4;
      out += '<i data-l="' + l + '" class="' + (ds === t ? "today" : "") + '" title="' + ds + ': ' + x + ' XP' + (S.days[ds] && S.days[ds].frozen ? " (freeze)" : "") + '"></i>';
    }
    void start;
    return '<div class="heat">' + out + '</div>';
  }
  function trackGrid() {
    return '<div class="track-grid">' + C.tracks.map(function (t) {
      var p = trackProgress(t), ch = t.items.filter(function (i) { return i.ch; }).length;
      return '<a class="track-card ' + (p.done === p.total && p.total ? "complete" : "") + '" href="#/t/' + t.id + '" style="--tc:' + t.color + '"><div class="tc-top"><span class="tc-ic">' + t.icon + '</span><div><h3>' + esc(t.title) + '</h3><span class="tier ' + t.tier + '">' + tierLabel(t.tier) + '</span></div></div><p>' + esc(t.about) + '</p><div class="progress"><i style="width:' + p.pct + '%"></i></div><div class="tc-foot"><span>' + p.done + ' / ' + p.total + ' done</span><span>' + (ch ? "⌨️ " + ch + " challenges" : t.modules.length + " modules") + '</span></div></a>';
    }).join("") + '</div>';
  }
  function tierLabel(t) { return t === "must" ? "🔥 Must know" : t === "good" ? "⭐ Good to know" : "🎁 Bonus"; }

  function tracksPage() {
    var wk = Math.floor(daysBetween(S.created, today()) / 7), ph = clamp(Math.floor(wk / 3), 0, 3);
    var h = '<h1 style="font-size:28px">🗺️ Roadmap for 3 years of experience</h1><p class="muted" style="max-width:70ch">This order is tuned for a 3-YOE Java backend engineer aiming at product companies (SDE-1 / early SDE-2). Do DSA <b>every day</b> in parallel with the phase tracks. Lessons tagged <span class="tier must">🔥 Must know</span> come first; <span class="tier bonus">🎁 Bonus</span> is for when you have time.</p>';
    h += '<div class="phases" style="margin-top:16px">' + PHASES.map(function (p, i) {
      return '<div class="phase ' + (i === ph ? "now" : "") + '"><small>' + p.weeks + (i === ph ? " · you are here" : "") + '</small><h3>' + esc(p.name) + '</h3><ul>' + p.tracks.filter(function (t) { return TRACKS[t]; }).map(function (t) { var pr = trackProgress(TRACKS[t]); return '<li><a href="#/t/' + t + '">' + esc(TRACKS[t].title) + '</a> · ' + pr.pct + '%</li>'; }).join("") + '<li>DSA: ' + esc(p.dsa) + '</li></ul></div>';
    }).join("") + '</div>';
    h += '<div class="section-h"><h2>All tracks</h2><span class="muted small">' + ALL.length + ' lessons · ' + ALL.filter(function (i) { return i.ch; }).length + ' coding challenges</span></div>' + trackGrid();
    view.innerHTML = h;
  }

  var trackFilter = "all";
  function trackPage(t) {
    var p = trackProgress(t), nx = nextIn(t);
    var h = '<div class="crumbs"><a href="#/tracks">Tracks</a> › ' + esc(t.title) + '</div>';
    h += '<section class="track-head" style="--tc:' + t.color + '"><span class="th-ic">' + t.icon + '</span><div><span class="tier ' + t.tier + '">' + tierLabel(t.tier) + '</span><h1>' + esc(t.title) + '</h1><p>' + esc(t.about) + '</p><div class="row">' + (nx ? '<a class="btn primary" href="#/i/' + nx.id + '">▶ ' + (p.started ? "Continue" : "Start") + ': ' + esc(nx.t.length > 30 ? nx.t.slice(0, 28) + "…" : nx.t) + '</a>' : '<span class="chip">🏆 Track complete</span>') + '<a class="btn" href="#/boss/' + t.id + '">🐉 Mock interview</a><a class="btn ghost" href="#/revise/' + t.id + '">🃏 Cram cards</a></div></div>';
    h += '<div class="th-r"><div class="big-ring" style="width:110px;height:110px"><svg viewBox="0 0 150 150"><circle class="bg" cx="75" cy="75" r="64"/><circle class="fg" cx="75" cy="75" r="64" stroke="' + t.color + '" style="stroke:' + t.color + '" stroke-dasharray="402" stroke-dashoffset="' + (402 * (1 - p.pct / 100)) + '"/></svg><div class="lbl"><div><b style="font-size:24px">' + p.pct + '%</b><small>' + p.done + '/' + p.total + '</small></div></div></div></div></section>';
    h += '<div class="filters" id="filters">' + [["all", "All"], ["must", "🔥 Must know"], ["good", "⭐ Good to know"], ["bonus", "🎁 Bonus"], ["todo", "Not done"], ["code", "⌨️ Challenges"]].map(function (f) { return '<button data-f="' + f[0] + '" class="' + (trackFilter === f[0] ? "on" : "") + '">' + f[1] + '</button>'; }).join("") + '</div>';
    t.modules.forEach(function (m) {
      var items = m.items.filter(function (it) {
        return trackFilter === "all" || it.tier === trackFilter || (trackFilter === "todo" && status(it) < 2) || (trackFilter === "code" && it.ch);
      });
      if (!items.length) return;
      var md = m.items.filter(function (i) { return status(i) === 2; }).length;
      h += '<section class="mod"><div class="mod-h"><h2>' + esc(m.title) + '</h2><div class="progress"><i style="width:' + Math.round(md * 100 / m.items.length) + '%;background:' + t.color + '"></i></div><span class="mono">' + md + '/' + m.items.length + '</span></div>';
      if (m.intro) h += '<div class="mod-intro">' + m.intro + '</div>';
      h += '<div class="items">' + items.map(function (it) { return itemRow(it, nx && nx.id === it.id); }).join("") + '</div></section>';
    });
    view.innerHTML = h;
    $$("#filters button").forEach(function (b) { b.onclick = function () { trackFilter = b.dataset.f; trackPage(t); }; });
  }
  function itemRow(it, isNext) {
    var st = status(it), s = stars(it);
    return '<a class="it ' + (isNext ? "next" : "") + '" href="#/i/' + it.id + '"><span class="st s' + st + '">' + (st === 2 ? "✓" : st === 1 ? "◐" : isNext ? "▶" : "") + '</span><span class="t"><b>' + esc(it.t) + '</b>' + (it.ask && it.ask !== it.t ? '<small>' + esc(it.ask) + '</small>' : '') + '</span>' + (it.ch ? '<span class="chip">⌨️ code</span>' : '') + '<span class="tier ' + it.tier + '">' + (it.tier === "must" ? "🔥" : it.tier === "good" ? "⭐" : "🎁") + '</span><span class="stars">' + s.map(function (x) { return '<span class="' + (x ? "" : "off") + '">⭐</span>'; }).join("") + '</span></a>';
  }

  /* ---------- lesson ---------- */
  function lessonPage(it) {
    var t = TRACKS[it.track], idx = t.items.indexOf(it), prev = t.items[idx - 1], next = t.items[idx + 1], r = rec(it.id);
    var h = '<div class="crumbs"><a href="#/tracks">Tracks</a> › <a href="#/t/' + t.id + '">' + t.icon + ' ' + esc(t.title) + '</a> › ' + esc(it.modTitle) + '</div>';
    h += '<article class="lesson"><header class="lesson-h"><div class="row"><span class="tier ' + it.tier + '">' + tierLabel(it.tier) + '</span>' + (it.ch ? '<span class="chip">⌨️ Coding challenge</span>' : '') + (it.kind === "pattern" ? '<span class="chip">🧩 Design pattern</span>' : '') + '<span class="chip">' + (idx + 1) + ' / ' + t.items.length + '</span><span class="stars" style="color:var(--gold)">' + stars(it).map(function (x) { return x ? "⭐" : '<span style="opacity:.25;filter:grayscale(1)">⭐</span>'; }).join("") + '</span></div><h1>' + esc(it.t) + '</h1></header>';
    if (it.ask) h += '<div class="ask"><span class="ask-ic">🎤</span><div><small>Interviewer asks</small><b>' + esc(it.ask) + '</b></div></div>';
    h += '<div class="notes">' + it.html + '</div>';
    if (it.patterns) h += '<div><h4 style="font-size:15px;margin-bottom:8px">🧩 Deep-dive notes from your pattern collection</h4><div class="pattern-links">' + it.patterns.map(function (p) { var pi = ITEMS["pat-" + p]; return '<a class="btn sm" href="#/i/pat-' + p + '">' + esc(pi ? pi.t : p) + '</a><a class="btn sm ghost" href="learn.html#/' + p + '" target="_blank" rel="noopener">📘 full notes ↗</a>'; }).join("") + '</div></div>';
    if (it.lc) h += '<div><h4 style="font-size:15px;margin-bottom:8px">🏋️ Practise the family on LeetCode</h4><div class="lc-links">' + it.lc.map(function (n) { return '<a class="chip" href="https://leetcode.com/problemset/?search=' + encodeURIComponent(n) + '" target="_blank" rel="noopener">' + esc(n) + ' ↗</a>'; }).join("") + '</div></div>';
    if (it.ch) h += '<div id="workspace"></div>';
    if (it.kind === "pattern") {
      var pd = patLoad().done;
      h += '<div class="card"><h4 style="font-size:15px;margin-bottom:10px">Your three ticks (+10 XP each)</h4><div class="ticks">' + [["u", "🧠 Understand it"], ["b", "🛠️ Build it"], ["e", "🗣️ Explain it"]].map(function (k) { return '<button class="tick ' + (pd[it.pid + ":" + k[0]] ? "on" : "") + '" data-k="' + k[0] + '"><span class="bx">' + (pd[it.pid + ":" + k[0]] ? "✓" : "") + '</span>' + k[1] + '</button>'; }).join("") + '</div><div class="row" style="margin-top:12px"><a class="btn primary" href="learn.html#/' + it.pid + '" target="_blank" rel="noopener">📘 Open full notes (diagrams + Spring Boot code) ↗</a></div></div>';
    } else {
      h += '<div class="lesson-actions"><button class="btn ' + (r.r ? "done" : "primary") + '" id="btnRead">' + (r.r ? "✓ Read" : "📖 I read this · +10 XP") + '</button>';
      h += '<button class="btn ' + (r.e ? "done" : "") + '" id="btnExplain" ' + (r.r ? "" : "disabled title='Read it first'") + '>' + (r.e ? "✓ I can explain it" : "🗣️ I can explain it out loud · +15 XP") + '</button>';
      h += '<span class="grow"></span><span class="small muted">' + (S.cards[it.id] ? "🃏 In your flashcards (box " + S.cards[it.id].box + ")" : "🃏 Reading adds a flashcard") + '</span></div>';
      if (!r.e) h += '<p class="small muted" style="margin:-6px 4px 0">Tip: before pressing “explain”, close the notes and say the answer out loud in 60 seconds, like in a real interview.</p>';
    }
    h += '<nav class="pager">' + (prev ? '<a href="#/i/' + prev.id + '"><small>← Previous</small>' + esc(prev.t) + '</a>' : '<span></span>') + (next ? '<a class="nx" href="#/i/' + next.id + '"><small>Next →</small>' + esc(next.t) + '</a>' : '<a class="nx" href="#/boss/' + t.id + '"><small>Track finished?</small>🐉 Fight the ' + esc(t.title) + ' boss</a>') + '</nav>';
    h += '</article>';
    view.innerHTML = h;

    var br = $("#btnRead"), be = $("#btnExplain");
    if (br) br.onclick = function () {
      if (r.r) return;
      r.r = Date.now(); bump("read"); addCard(it.id);
      award(10, "reading", { combo: true });
      br.className = "btn done"; br.textContent = "✓ Read";
      be.disabled = false; be.removeAttribute("title");
      be.classList.add("primary");
      checkMission();
    };
    if (be) be.onclick = function () {
      if (r.e || !r.r) return;
      r.e = Date.now(); bump("explain");
      award(15, "explaining", { combo: true });
      be.className = "btn done"; be.textContent = "✓ I can explain it";
      if (!it.ch) { confetti(60); SFX.win(); }
      checkMission();
    };
    $$(".tick").forEach(function (b) {
      b.onclick = function () {
        var o = patLoad(), key = it.pid + ":" + b.dataset.k, on = !o.done[key];
        if (on) o.done[key] = true; else delete o.done[key];
        patSave(o);
        b.classList.toggle("on", on); $(".bx", b).textContent = on ? "✓" : "";
        var pr = rec(it.id); pr.pt = pr.pt || {};
        if (on && !pr.pt[b.dataset.k]) { pr.pt[b.dataset.k] = 1; if (!pr.r) { pr.r = Date.now(); addCard(it.id); bump("read"); } if (b.dataset.k === "e") bump("explain"); award(10, "pattern tick", { combo: true }); }
        if (status(it) === 2) { confetti(80); SFX.win(); checkMission(); }
        save(); hud();
      };
    });
    if (it.ch) mountWorkspace($("#workspace"), it);
  }

  /* ---------- code workspace ---------- */
  function makeEditor(host, value, onChange, onRun) {
    var ta = document.createElement("textarea");
    ta.value = value; ta.spellcheck = false; ta.className = "fallback";
    host.appendChild(ta);
    if (window.CodeMirror) {
      var cm = CodeMirror.fromTextArea(ta, { mode: "text/x-java", lineNumbers: true, indentUnit: 4, tabSize: 4, matchBrackets: true, autoCloseBrackets: true, lineWrapping: false,
        extraKeys: { "Ctrl-Enter": onRun, "Cmd-Enter": onRun, Tab: function (c) { if (c.somethingSelected()) c.indentSelection("add"); else c.replaceSelection("    "); } } });
      cm.on("change", function () { onChange(cm.getValue()); });
      return { get: function () { return cm.getValue(); }, set: function (v) { cm.setValue(v); }, mark: function (ln) { cm.addLineClass(ln - 1, "background", "err-line"); cm.scrollIntoView({ line: ln - 1, ch: 0 }, 80); cm.setCursor({ line: ln - 1, ch: 0 }); cm.focus(); setTimeout(function () { cm.removeLineClass(ln - 1, "background", "err-line"); }, 4000); }, refresh: function () { cm.refresh(); } };
    }
    ta.addEventListener("input", function () { onChange(ta.value); });
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Tab") { e.preventDefault(); var s = ta.selectionStart; ta.value = ta.value.slice(0, s) + "    " + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 4; onChange(ta.value); }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onRun(); }
    });
    return { get: function () { return ta.value; }, set: function (v) { ta.value = v; }, mark: function (ln) { var lines = ta.value.split("\n"), pos = 0; for (var i = 0; i < ln - 1 && i < lines.length; i++) pos += lines[i].length + 1; ta.focus(); ta.setSelectionRange(pos, pos + (lines[ln - 1] || "").length); }, refresh: function () {} };
  }
  var LOADING = ["Brewing your coffee ☕", "Waking up the JVM 🥱", "Compiling with javac 🛠️", "Asking the garbage collector nicely 🗑️", "Counting curly braces { } 🔢", "Warming up the JIT 🔥", "Running your tests 🧪"];
  function renderOutput(res, userLines, nonce, isChallenge) {
    var out = "";
    function line(s) {
      var cls = /^✅/.test(s) ? "ok" : /^(❌|💥)/.test(s) ? "bad" : /^🏆/.test(s) ? "ok" : /^📊/.test(s) ? "warn" : "";
      return '<span class="' + cls + '">' + esc(s) + '</span>';
    }
    if (res.compileError) {
      out += '<span class="bad">⛔ Compile error. Java could not understand the code yet.</span>\n\n';
      var err = res.compileError.replace(/(?:prog|Main)\.java:(\d+):/g, function (m, n) { return "@@L" + n + "@@"; });
      out += esc(err).replace(/@@L(\d+)@@/g, function (m, n) {
        n = +n;
        return n <= userLines ? '<a class="ln" data-ln="' + n + '">line ' + n + '</a>:' : '<span class="warn">[test code, line ' + (n - userLines) + ']</span>:';
      });
      if (/@@L(\d+)@@/.test(err) && isChallenge && err.match(/@@L(\d+)@@/g).every(function (m) { return +m.replace(/\D/g, "") > userLines; })) out += '\n<span class="explain">🧐 The error is inside the hidden test code. That usually means a method name, its parameters or its return type changed from the starter. Keep the starter signature exactly.</span>';
    } else {
      var so = (res.stdout || "").replace(new RegExp("\\s*#" + nonce, "g"), "");
      out += so.split("\n").map(line).join("\n");
      if (res.stderr) out += '\n<span class="bad">' + esc(res.stderr) + '</span>';
      if (res.killed) out += '\n<span class="bad">⏰ Stopped: your program ran too long (' + esc(res.signal) + '). Infinite loop?</span>';
      if (!so.trim() && !res.stderr) out += '<span class="dim">(no output)</span>';
    }
    var tips = Runner.explain((res.compileError || "") + (res.stderr || ""));
    if (tips.length) out += '\n' + tips.map(function (t) { return '<span class="explain">💡 ' + esc(t) + '</span>'; }).join("");
    out += '\n<span class="dim">— ' + esc(res.engine) + (res.fallback ? " (backup compiler)" : "") + ' · ' + (res.ms / 1000).toFixed(1) + 's</span>';
    return out;
  }
  function mountWorkspace(host, it) {
    var ch = it.ch, r = rec(it.id), saved = CODE[it.id];
    var h = '<div class="work">';
    if (r.s) h += '<div class="solved-banner">🏆 Solved' + (r.peek ? " (after peeking)" : "") + '! Try it again from memory tomorrow for extra confidence.</div>';
    h += '<div class="work-h"><h3>⌨️ Your turn: code it</h3><span class="sp"></span><span class="small muted hide-sm">Ctrl + Enter to run</span>' +
      '<button class="btn sm" id="wHint">💡 Hint</button><button class="btn sm" id="wSol">👀 Solution</button><button class="btn sm ghost" id="wReset" title="Reset to starter code">↺ Reset</button></div>';
    h += '<div class="hint-box" id="wHints" hidden></div>';
    h += '<div class="work-body"><div class="editor" id="wEd"></div><div class="console"><div class="console-h">🖥️ Output<span class="sp"></span><span id="wStatus"></span></div><pre id="wOut"><span class="dim">Press ▶ Run tests. Your code runs on a real Java compiler and gets checked by hidden tests.\nGreen ✅ = right. Red ❌ = the test shows what was expected.</span></pre></div></div>';
    h += '<div class="work-f"><button class="btn primary" id="wRun">▶ Run tests</button><span class="small muted" id="wXp">' + (r.s ? "Already solved ✓" : "Solve it for +40 XP · +10 more if no hints") + '</span><span class="sp"></span><button class="btn sm ghost" id="wTests">🧪 See the tests</button></div>';
    h += '<div class="solution-box" id="wSolBox" hidden></div><div class="solution-box" id="wTestBox" hidden></div></div>';
    host.innerHTML = h;
    var ed = makeEditor($("#wEd"), saved != null ? saved : ch.starter, function (v) { CODE[it.id] = v; clearTimeout(ed && ed._t); if (ed) ed._t = setTimeout(saveCode, 400); }, doRun);
    var hintN = 0;
    $("#wHint").onclick = function () {
      var hs = ch.hints || ["Read the 'How to think' part of the notes above. Start with a brute force idea, then make it faster."];
      hintN = Math.min(hintN + 1, hs.length);
      r.hint = Math.max(r.hint || 0, hintN); save();
      $("#wHints").hidden = false;
      $("#wHints").innerHTML = hs.slice(0, hintN).map(function (x, i) { return "<div><b>💡 Hint " + (i + 1) + ":</b> " + esc(x) + "</div>"; }).join("") + (hintN < hs.length ? '<div class="small muted">Click Hint again for the next one.</div>' : '');
      if (hintN >= hs.length) $("#wHint").disabled = true;
    };
    function showCode(box, title, code, btns) {
      box.hidden = !box.hidden;
      if (box.hidden) return;
      box.innerHTML = '<div class="code"><div class="code-h"><span>' + title + '</span><span class="row">' + (btns || "") + '<button class="copy" type="button">Copy</button></span></div><pre class="hl"><code>' + esc(code) + '</code></pre></div>';
      if (window.CodeMirror && CodeMirror.runMode) { /* optional */ }
    }
    $("#wSol").onclick = function () {
      function reveal() { if (!r.s) { r.peek = true; save(); $("#wXp").textContent = "Peeked: solving now gives +20 XP. Type it yourself, don't paste!"; } showCode($("#wSolBox"), "Solution", ch.solution, '<button class="copy" type="button" id="wUse">Load into editor</button>'); var u = $("#wUse"); if (u) u.onclick = function () { ed.set(ch.solution); CODE[it.id] = ch.solution; saveCode(); }; }
      if (r.peek || r.s || !$("#wSolBox").hidden) { reveal(); return; }
      modal('<span class="m-ic">👀</span><h2>Peek at the solution?</h2><p>Struggling is how your brain learns. If you peek now, solving gives <b>20 XP instead of 40</b>. Try one more hint first?</p><div class="row"><button class="btn" data-close>Keep trying 💪</button><button class="btn primary" id="mPeek">Show me</button></div>', function (m) { $("#mPeek", m).onclick = function () { closeModal(); reveal(); }; });
    };
    $("#wTests").onclick = function () { showCode($("#wTestBox"), "Hidden tests (they run after your code)", ch.tests); };
    $("#wReset").onclick = function () { if (confirm("Reset your code to the starter? Your current code will be lost.")) { ed.set(ch.starter); CODE[it.id] = ch.starter; saveCode(); } };
    $("#wOut").addEventListener("click", function (e) { var a = e.target.closest("a.ln"); if (a) ed.mark(+a.dataset.ln); });
    var running = false;
    function doRun() {
      if (running) return;
      running = true;
      var code = ed.get(), userLines = code.split("\n").length, nonce = Math.random().toString(36).slice(2, 10);
      var full = code + "\n\n" + ch.tests + "\n\n" + C.harness.replace("__NONCE__", nonce);
      var btn = $("#wRun");
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Running…';
      var li = 0; $("#wStatus").textContent = LOADING[0];
      var lt = setInterval(function () { li = (li + 1) % LOADING.length; $("#wStatus").textContent = LOADING[li]; }, 1300);
      r.runs = (r.runs || 0) + 1; S.stats.runs++;
      Runner.run(full, "", S.engine).then(function (res) {
        var passed = (res.stdout || "").indexOf("#" + nonce) >= 0;
        $("#wOut").innerHTML = renderOutput(res, userLines, nonce, true);
        $("#wStatus").textContent = passed ? "✅ All tests passed" : res.compileError ? "⛔ Compile error" : "❌ Not yet";
        if (passed) onSolved(); else SFX.bad();
      }, function (err) {
        $("#wOut").innerHTML = '<span class="bad">📡 Could not reach the online compiler.</span>\n' + esc(String(err && err.message || err)) + '\n\n<span class="explain">Check your internet. Office/government networks sometimes block compiler sites (wandbox.org, ce.judge0.com). Try mobile data, or switch the engine in Stats & settings.</span>';
        $("#wStatus").textContent = "offline?";
      }).then(function () { clearInterval(lt); running = false; btn.disabled = false; btn.innerHTML = "▶ Run tests"; save(); });
    }
    $("#wRun").onclick = doRun;
    function onSolved() {
      confetti(200); SFX.win();
      if (r.s) { toast("✅", "Still solved!", "Great: repetition makes it stick."); return; }
      r.s = Date.now();
      if (!r.r) { r.r = Date.now(); addCard(it.id); bump("read"); }
      bump("solve");
      var xp = r.peek ? 20 : 40 + (r.hint ? 0 : 10);
      if (!r.peek) S.stats.solvedClean++;
      award(xp, "solving " + it.t, { combo: true });
      toast("🏆", "Challenge solved! +" + xp + " XP", r.hint ? "Next time try with no hints for +10 more." : "No hints, no peeking. Respect. 💪", "gold");
      $("#wXp").textContent = "Solved ✓";
      checkMission();
    }
    setTimeout(function () { ed.refresh(); }, 50);
  }

  /* ---------- flashcards ---------- */
  function revisePage(trackId) {
    var cram = trackId && TRACKS[trackId];
    var queue = cram ? TRACKS[trackId].items.filter(function (i) { return i.card; }).map(function (i) { return i.id; }) : dueCards();
    queue.sort(function () { return Math.random() - .5; });
    queue = queue.slice(0, 40);
    var total = queue.length, doneN = 0, again = {};
    function render() {
      var h = '<div class="deck-top"><div><h1 style="font-size:26px">🃏 ' + (cram ? "Cram: " + esc(TRACKS[trackId].title) : "Flashcards") + '</h1><p class="muted small" style="margin:4px 0 0">' + (cram ? "Every card in this track, shuffled. Ratings still schedule your reviews." : "Spaced repetition: cards you know come back later, cards you miss come back soon.") + '</p></div>';
      h += '<div class="row"><select id="cramSel"><option value="">Due cards (' + dueCards().length + ')</option>' + C.tracks.map(function (t) { return '<option value="' + t.id + '"' + (t.id === trackId ? " selected" : "") + '>Cram: ' + esc(t.title) + '</option>'; }).join("") + '</select></div></div>';
      if (!queue.length) {
        var nCards = Object.keys(S.cards).length;
        h += '<div class="card empty"><span class="big-emoji">' + (nCards ? "🎉" : "📭") + '</span><h2>' + (doneN ? "Session complete!" : nCards ? "No cards due right now" : "No flashcards yet") + '</h2><p>' + (doneN ? "You reviewed " + doneN + " cards. Your brain thanks you." : nCards ? "Come back tomorrow, or cram a whole track from the menu above." : "Every lesson you read turns into a flashcard here.") + '</p><a class="btn primary" href="#/">Back home</a></div>';
        view.innerHTML = h; bindSel(); return;
      }
      var id = queue[0], it = ITEMS[id], c = S.cards[id];
      h += '<div class="progress" style="max-width:720px;margin:0 auto 14px"><i style="width:' + Math.round(doneN * 100 / Math.max(total, 1)) + '%"></i></div>';
      h += '<div class="flash" id="flash"><div class="flash-inner"><div class="face"><small>' + TRACKS[it.track].icon + ' ' + esc(TRACKS[it.track].title) + (c ? ' · box ' + c.box : '') + '</small><h2>' + esc(it.ask || it.t) + '</h2><p class="muted">Answer it in your head (or out loud!) before flipping.</p><span class="tap">Tap or press Space to flip ↻</span></div>';
      h += '<div class="face back"><small>Answer · ' + esc(it.t) + '</small><div class="ans">' + esc(it.card) + '</div><a class="small" href="#/i/' + it.id + '">Open full lesson →</a></div></div></div>';
      h += '<div class="rate" id="rate" style="visibility:hidden"><button class="again" data-r="0">😵 Again<small>forgot</small></button><button class="hard" data-r="1">😬 Hard<small>tomorrow</small></button><button class="good" data-r="2">🙂 Good<small>later</small></button><button class="easy" data-r="3">😎 Easy<small>much later</small></button></div>';
      h += '<p class="center small muted" style="text-align:center;margin-top:12px">' + (total - doneN) + ' left · keys: Space flip, 1–4 rate</p>';
      view.innerHTML = h; bindSel();
      var fl = $("#flash");
      fl.onclick = function (e) { if (e.target.closest("a")) return; flip(); };
      $$("#rate button").forEach(function (b) { b.onclick = function () { rate(+b.dataset.r); }; });
    }
    function flip() { var fl = $("#flash"); if (!fl) return; fl.classList.toggle("flipped"); SFX.flip(); $("#rate").style.visibility = "visible"; }
    function rate(g) {
      if (!queue.length || $("#rate").style.visibility !== "visible") return;
      var id = queue.shift(), c = S.cards[id] || (S.cards[id] = { box: 1, due: today(), reps: 0 });
      c.reps++;
      if (g === 0) { c.box = 1; c.due = today(); if (!again[id]) { again[id] = 1; queue.splice(Math.min(3, queue.length), 0, id); total++; } }
      else if (g === 1) { c.due = addDays(today(), 1); }
      else { c.box = clamp(c.box + (g === 3 ? 2 : 1), 1, 7); c.due = addDays(today(), INTERVAL[c.box - 1] || 32); }
      doneN++; S.stats.reviews++; bump("cards");
      award([1, 2, 3, 4][g], "flashcard");
      render();
    }
    function bindSel() { var s = $("#cramSel"); if (s) s.onchange = function () { location.hash = s.value ? "#/revise/" + s.value : "#/revise"; }; }
    function key(e) {
      if (e.target.closest("input,textarea,select")) return;
      if (e.code === "Space") { e.preventDefault(); flip(); }
      if (/^[1-4]$/.test(e.key)) rate(+e.key - 1);
    }
    document.addEventListener("keydown", key);
    cleanup = function () { document.removeEventListener("keydown", key); };
    render();
  }

  /* ---------- boss (mock interview) ---------- */
  function bossPage(trackId) {
    if (!trackId || !TRACKS[trackId]) {
      var h = '<h1 style="font-size:28px">🐉 Mock interview bosses</h1><p class="muted" style="max-width:66ch">Each boss asks 5 real interview questions from one track. You get 2 minutes per question. Say the answer out loud (or type key points), reveal the model answer, and score yourself honestly. Beat the boss by scoring 60% or more.</p>';
      h += '<div class="boss-pick" style="margin-top:18px"><button data-t="mix"><span class="bp-ic">🌀</span><span><b>Mixed boss</b><small>5 questions from everything you\'ve read</small></span></button>' + C.tracks.map(function (t) {
        var best = S.boss[t.id];
        return '<button data-t="' + t.id + '"><span class="bp-ic">' + t.icon + '</span><span><b>' + esc(t.title) + '</b><small>' + (best != null ? "Best: " + best + "%" + (best >= 60 ? " · defeated ✓" : "") : "Not fought yet") + '</small></span></button>';
      }).join("") + '</div>';
      view.innerHTML = h;
      $$(".boss-pick button").forEach(function (b) { b.onclick = function () { location.hash = "#/boss/" + b.dataset.t; }; });
      if (!countRead()) $(".boss-pick button[data-t=mix]").disabled = true;
      return;
    }
    fight(trackId);
  }
  // "mix" is handled as a pseudo-track id
  TRACKS.mix = { id: "mix", title: "Mixed", icon: "🌀", items: [] };
  function fight(trackId) {
    var pool = trackId === "mix" ? ALL.filter(function (i) { return S.items[i.id] && S.items[i.id].r; }) : TRACKS[trackId].items.slice();
    pool = pool.filter(function (i) { return i.card; });
    var read = pool.filter(function (i) { return S.items[i.id] && S.items[i.id].r; }).sort(function () { return Math.random() - .5; });
    var rest = pool.filter(function (i) { return read.indexOf(i) < 0; }).sort(function () { return Math.random() - .5; });
    var qs = read.concat(rest).slice(0, 5), qi = 0, score = 0, results = [], timer = null, left = 120;
    if (!qs.length) { view.innerHTML = '<div class="card empty"><span class="big-emoji">📭</span><h2>No questions yet</h2><p>Read a few lessons first.</p></div>'; return; }
    var t = TRACKS[trackId];
    function stopT() { clearInterval(timer); timer = null; }
    cleanup = stopT;
    function hp() { return Math.max(0, 100 - score); }
    function render(revealed) {
      var it = qs[qi];
      var h = '<div class="boss-arena"><div class="crumbs"><a href="#/boss">Bosses</a> › ' + t.icon + ' ' + esc(t.title) + '</div>';
      h += '<div class="boss-hp" id="bossHp"><span class="dragon">🐉</span><div style="flex:1"><div class="row" style="justify-content:space-between"><b>' + esc(t.title) + ' boss</b><span class="mono small">HP ' + hp() + '/100</span></div><div class="progress"><i style="width:' + hp() + '%"></i></div></div></div>';
      h += '<div class="card boss-q"><div class="row" style="justify-content:space-between"><span class="chip">Question ' + (qi + 1) + ' of ' + qs.length + '</span><span class="mono small" id="tLeft">' + left + 's</span></div><div class="timer-bar"><i id="tBar" style="width:' + (left * 100 / 120) + '%"></i></div>';
      h += '<h2 style="font-size:21px;margin:6px 0 14px">' + esc(it.ask || it.t) + '</h2>';
      if (!revealed) {
        h += '<textarea id="bossAns" placeholder="Speak your answer out loud like in a real interview, or type the key points here…"></textarea><div class="row" style="margin-top:12px"><button class="btn primary" id="reveal">Reveal model answer</button><span class="small muted">Tip: structure = what it is → how it works → when to use → trade-off</span></div>';
      } else {
        h += '<div class="ask" style="margin-bottom:12px"><span class="ask-ic">✅</span><div><small>Model answer</small><b>' + esc(it.card) + '</b></div></div><a class="small" href="#/i/' + it.id + '" target="_blank">Open the full lesson ↗</a>';
        h += '<p style="margin:14px 0 8px;font-weight:600">How did you do? Be honest, it\'s just you and the dragon.</p><div class="rate" style="grid-template-columns:repeat(3,1fr);margin:0"><button class="good" data-s="20">🎯 Nailed it<small>-20 HP</small></button><button class="hard" data-s="10">🤏 Partly<small>-10 HP</small></button><button class="again" data-s="0">🙈 Missed<small>review later</small></button></div>';
      }
      h += '</div></div>';
      view.innerHTML = h;
      if (!revealed) {
        $("#reveal").onclick = function () { stopT(); render(true); };
        startT();
      } else {
        $$(".rate button").forEach(function (b) { b.onclick = function () { grade(+b.dataset.s); }; });
      }
    }
    function startT() {
      stopT();
      timer = setInterval(function () {
        left--;
        var tl = $("#tLeft"), tb = $("#tBar");
        if (tl) tl.textContent = left + "s";
        if (tb) tb.style.width = Math.max(0, left * 100 / 120) + "%";
        if (left === 10) tone(880, .08, "square", .04);
        if (left <= 0) { stopT(); render(true); }
      }, 1000);
    }
    function grade(s) {
      var it = qs[qi];
      results.push({ it: it, s: s });
      if (s) {
        score += s;
        SFX.hit();
        var c = S.cards[it.id];
        if (c && s === 20) { c.box = clamp(c.box + 1, 1, 7); c.due = addDays(today(), INTERVAL[c.box - 1]); }
        award(s === 20 ? 15 : 6, "mock answer");
      } else {
        SFX.bad();
        addCard(it.id); if (S.cards[it.id]) { S.cards[it.id].box = 1; S.cards[it.id].due = today(); }
      }
      qi++; left = 120;
      if (qi < qs.length) { render(false); var bh = $("#bossHp"); if (bh && s) { bh.classList.add("hit"); } }
      else finish();
    }
    function finish() {
      var pct = Math.round(score * 100 / (qs.length * 20)), win = pct >= 60, perfect = score === qs.length * 20;
      S.boss[trackId] = Math.max(S.boss[trackId] || 0, pct);
      if (win) { S.stats.bossWins++; bump("boss"); award(50, "boss victory"); confetti(260); SFX.level(); }
      if (perfect) S.stats.bossPerfect++;
      checkBadges(); save();
      var h = '<div class="boss-arena"><div class="card" style="text-align:center;padding:30px"><span style="font-size:70px;display:block">' + (win ? "🏆" : "🐲") + '</span><h1 style="font-size:30px;margin:8px 0">' + (perfect ? "Flawless victory!" : win ? "Boss defeated!" : "The dragon survived… this time") + '</h1><p class="muted">You scored <b>' + pct + '%</b>' + (win ? " · +50 XP victory bonus" : ". You need 60% to win. Missed questions went to your flashcards.") + '</p>';
      h += '<div style="text-align:left;margin:20px 0">' + results.map(function (r) { return '<a class="it" href="#/i/' + r.it.id + '"><span class="st ' + (r.s === 20 ? "s2" : r.s ? "s1" : "") + '">' + (r.s === 20 ? "✓" : r.s ? "◐" : "✗") + '</span><span class="t"><b>' + esc(r.it.t) + '</b></span></a>'; }).join("") + '</div>';
      h += '<div class="row" style="justify-content:center"><a class="btn primary" href="#/boss/' + trackId + '" id="again">⚔️ Fight again</a><a class="btn" href="#/boss">All bosses</a></div></div></div>';
      view.innerHTML = h;
      $("#again").onclick = function (e) { e.preventDefault(); fight(trackId); };
    }
    render(false);
  }

  /* ---------- playground ---------- */
  var SNIPPETS = {
    "Hello Java 21": 'import java.util.*;\n\npublic class Main {\n    record Point(int x, int y) {}\n\n    public static void main(String[] args) {\n        System.out.println("Hello, JavaQuest! ☕");\n        var p = new Point(3, 4);\n        System.out.println(p + " distance = " + Math.hypot(p.x(), p.y()));\n\n        Object o = 42;\n        String kind = switch (o) {\n            case Integer i when i > 10 -> "big int " + i;\n            case Integer i -> "small int " + i;\n            case String s -> "text " + s;\n            default -> "something else";\n        };\n        System.out.println(kind);\n    }\n}\n',
    "Streams demo": 'import java.util.*;\nimport java.util.stream.*;\n\npublic class Main {\n    record Employee(String name, String dept, double salary) {}\n\n    public static void main(String[] args) {\n        List<Employee> list = List.of(\n            new Employee("Asha", "Eng", 120000), new Employee("Ravi", "Eng", 95000),\n            new Employee("John", "Sales", 60000), new Employee("Zoya", "HR", 65000));\n\n        Map<String, Double> avg = list.stream()\n            .collect(Collectors.groupingBy(Employee::dept, TreeMap::new, Collectors.averagingDouble(Employee::salary)));\n        System.out.println("Average by dept: " + avg);\n\n        Optional<Employee> top = list.stream().max(Comparator.comparingDouble(Employee::salary));\n        System.out.println("Top earner: " + top.map(Employee::name).orElse("nobody"));\n    }\n}\n',
    "Threads & CompletableFuture": 'import java.util.concurrent.*;\nimport java.util.concurrent.atomic.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        AtomicInteger counter = new AtomicInteger();\n        try (ExecutorService pool = Executors.newFixedThreadPool(4)) {\n            for (int i = 0; i < 1000; i++) pool.submit(counter::incrementAndGet);\n        } // try-with-resources waits for all tasks (Java 19+)\n        System.out.println("Counter = " + counter.get());\n\n        CompletableFuture<String> user = CompletableFuture.supplyAsync(() -> "Abhi");\n        CompletableFuture<Integer> orders = CompletableFuture.supplyAsync(() -> 7);\n        String msg = user.thenCombine(orders, (u, o) -> u + " has " + o + " orders").get();\n        System.out.println(msg);\n    }\n}\n',
    "Virtual threads": 'import java.util.concurrent.*;\nimport java.util.stream.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        long start = System.currentTimeMillis();\n        try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {\n            var futures = IntStream.range(0, 10_000)\n                .mapToObj(i -> exec.submit(() -> { Thread.sleep(100); return i; }))\n                .toList();\n            long sum = 0;\n            for (var f : futures) sum += f.get();\n            System.out.println("10,000 sleeping tasks, sum = " + sum);\n        }\n        System.out.println("Took " + (System.currentTimeMillis() - start) + " ms (platform threads would need way longer)");\n    }\n}\n',
    "Read input (Scanner)": 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner in = new Scanner(System.in);\n        int n = in.nextInt();\n        long sum = 0;\n        for (int i = 0; i < n; i++) sum += in.nextLong();\n        System.out.println("Sum = " + sum);\n    }\n}\n'
  };
  function playgroundPage() {
    var saved = CODE.__play || SNIPPETS["Hello Java 21"];
    var h = '<h1 style="font-size:28px">⌨️ Java playground</h1><p class="muted">Write any Java 21 code and run it for real. Great for trying ideas from the notes. Put your code in <code>public class Main</code> with a <code>main</code> method.</p>';
    h += '<div class="work" style="margin-top:14px"><div class="work-h"><h3>Main.java</h3><span class="sp"></span><select id="snip"><option value="">Load an example…</option>' + Object.keys(SNIPPETS).map(function (k) { return '<option>' + esc(k) + '</option>'; }).join("") + '</select></div>';
    h += '<div class="work-body"><div class="editor" id="pEd"></div><div class="console"><div class="console-h">🖥️ Output<span class="sp"></span><span id="pStatus"></span></div><pre id="pOut"><span class="dim">Ctrl + Enter or ▶ Run</span></pre><div class="stdin"><div class="console-h">⌨️ Input (stdin)</div><textarea id="pIn" placeholder="Text your program reads with Scanner, e.g.  3  10 20 30">' + esc(CODE.__playIn || "3\n10 20 30") + '</textarea></div></div></div>';
    h += '<div class="work-f"><button class="btn primary" id="pRun">▶ Run</button><span class="small muted">Runs on ' + (S.engine === "judge0-only" || S.engine === "judge0" ? "Judge0 (JDK 17)" : "Wandbox (OpenJDK 21), backup Judge0") + '</span></div></div>';
    view.innerHTML = h;
    var ed = makeEditor($("#pEd"), saved, function (v) { CODE.__play = v; clearTimeout(ed && ed._t); if (ed) ed._t = setTimeout(saveCode, 400); }, run);
    $("#snip").onchange = function () { if (this.value) { ed.set(SNIPPETS[this.value]); CODE.__play = SNIPPETS[this.value]; saveCode(); this.value = ""; } };
    $("#pIn").oninput = function () { CODE.__playIn = this.value; saveCode(); };
    $("#pOut").addEventListener("click", function (e) { var a = e.target.closest("a.ln"); if (a) ed.mark(+a.dataset.ln); });
    var busy = false;
    function run() {
      if (busy) return; busy = true;
      var code = ed.get(), btn = $("#pRun");
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Running…';
      $("#pStatus").textContent = rnd(LOADING);
      Runner.run(code, $("#pIn").value, S.engine).then(function (res) {
        $("#pOut").innerHTML = renderOutput(res, code.split("\n").length + 9999, "none", false);
        $("#pStatus").textContent = res.compileError ? "⛔ Compile error" : "✓ Done";
        unlock("play");
        if (!day().play) { day().play = 1; award(5, "playground"); }
      }, function (err) {
        $("#pOut").innerHTML = '<span class="bad">📡 Could not reach the online compiler: ' + esc(err && err.message) + '</span>';
      }).then(function () { busy = false; btn.disabled = false; btn.textContent = "▶ Run"; save(); });
    }
    $("#pRun").onclick = run;
    setTimeout(function () { ed.refresh(); }, 50);
  }

  /* ---------- badges ---------- */
  function badgesPage() {
    var got = BADGES.filter(function (b) { return S.badges[b[0]]; }).length;
    var h = '<h1 style="font-size:28px">🏅 Badges</h1><p class="muted">' + got + ' of ' + BADGES.length + ' unlocked. Some are secret-ish. Keep exploring.</p><div class="progress" style="max-width:420px;margin:10px 0 20px"><i style="width:' + Math.round(got * 100 / BADGES.length) + '%"></i></div>';
    h += '<div class="badges">' + BADGES.map(function (b) { var on = S.badges[b[0]]; return '<div class="badge ' + (on ? "got" : "locked") + '"><span class="b-ic">' + b[1] + '</span><b>' + esc(b[2]) + '</b><small>' + esc(b[3]) + (on ? '<br>✓ ' + new Date(on).toLocaleDateString() : '') + '</small></div>'; }).join("") + '</div>';
    view.innerHTML = h;
  }

  /* ---------- stats & settings ---------- */
  function statsPage() {
    var L = levelOf(S.xp), solved = Object.keys(S.items).filter(function (k) { return S.items[k].s; }).length;
    var h = '<h1 style="font-size:28px">📈 Stats & settings</h1>';
    h += '<div class="grid g3" style="margin-top:16px"><div class="stat"><b>' + L + '</b><small>Level · ' + esc(titleOf(L)) + '</small></div><div class="stat"><b>' + S.xp + '</b><small>Total XP · ' + (need(L) - S.xp) + ' to next level</small></div><div class="stat"><b>' + S.streak.n + ' 🔥</b><small>Streak · best ' + S.streak.best + '</small></div><div class="stat"><b>' + solved + '</b><small>Challenges solved</small></div><div class="stat"><b>' + S.stats.reviews + '</b><small>Flashcards reviewed</small></div><div class="stat"><b>' + S.stats.bossWins + '</b><small>Bosses defeated</small></div></div>';
    h += '<div class="grid g2" style="margin-top:16px"><section class="card"><h3 style="font-size:16px;margin-bottom:8px">Last 14 days</h3>' + weekBars(14) + '</section>';
    h += '<section class="card"><h3 style="font-size:16px;margin-bottom:10px">Progress by track</h3>' + C.tracks.map(function (t) { var p = trackProgress(t); return '<div style="margin-bottom:9px"><div class="row" style="justify-content:space-between;font-size:13.5px"><span>' + t.icon + ' ' + esc(t.title) + '</span><span class="mono muted">' + p.done + '/' + p.total + '</span></div><div class="progress" style="height:6px"><i style="width:' + p.pct + '%;background:' + t.color + '"></i></div></div>'; }).join("") + '</section></div>';
    h += '<section class="card" style="margin-top:16px"><h3 style="font-size:16px">⚙️ Settings</h3>';
    h += '<div class="form-row"><label><b>Your name</b><small>Used in greetings</small></label><input type="text" id="setName" value="' + esc(S.name) + '" placeholder="Abhishek"></div>';
    h += '<div class="form-row"><label><b>Daily XP goal</b><small>Hit it every day to grow your streak</small></label><div class="seg" id="setGoal">' + [[30, "🐢 30"], [60, "🚶 60"], [100, "🏃 100"], [150, "🚀 150"]].map(function (g) { return '<button data-g="' + g[0] + '" class="' + (S.goal === g[0] ? "on" : "") + '">' + g[1] + '</button>'; }).join("") + '</div></div>';
    h += '<div class="form-row"><label><b>Interview target date</b><small>Shows a countdown and daily pace</small></label><input type="date" id="setTarget" value="' + esc(S.target) + '"></div>';
    h += '<div class="form-row"><label><b>Compiler</b><small>Auto tries Wandbox (Java 21) first, then Judge0 (Java 17)</small></label><div class="row"><select id="setEngine">' + [["auto", "Auto (recommended)"], ["wandbox-only", "Wandbox only"], ["judge0", "Judge0 first"], ["judge0-only", "Judge0 only"]].map(function (e) { return '<option value="' + e[0] + '"' + (S.engine === e[0] ? " selected" : "") + '>' + e[1] + '</option>'; }).join("") + '</select><button class="btn sm" id="testEngine">Test</button></div></div>';
    h += '<div class="form-row"><label><b>Sound effects</b><small>Little dings for XP, level-ups and wins</small></label><div class="seg" id="setSound"><button data-s="1" class="' + (S.sound ? "on" : "") + '">On</button><button data-s="0" class="' + (S.sound ? "" : "on") + '">Off</button></div></div>';
    h += '<div class="form-row"><label><b>Backup</b><small>Progress lives in this browser. Export it to move devices.</small></label><div class="row"><button class="btn sm" id="exp">⬇ Export</button><label class="btn sm">⬆ Import<input type="file" id="imp" accept=".json" hidden></label><button class="btn sm ghost" id="reset" style="color:var(--red)">Reset all</button></div></div>';
    h += '</section>';
    view.innerHTML = h;
    $("#setName").onchange = function () { S.name = this.value.trim(); save(); };
    $$("#setGoal button").forEach(function (b) { b.onclick = function () { S.goal = +b.dataset.g; save(); statsPage(); hud(); }; });
    $("#setTarget").onchange = function () { S.target = this.value; save(); };
    $("#setEngine").onchange = function () { S.engine = this.value; save(); };
    $$("#setSound button").forEach(function (b) { b.onclick = function () { S.sound = b.dataset.s === "1"; save(); statsPage(); hud(); }; });
    $("#testEngine").onclick = function () {
      var b = this; b.disabled = true; b.textContent = "Testing…";
      Runner.run('class Main { public static void main(String[] a) { System.out.println("OK " + Runtime.version()); } }', "", S.engine).then(function (r) { toast("✅", "Compiler works", (r.stdout || "").trim() + " · " + r.engine + " · " + (r.ms / 1000).toFixed(1) + "s"); }, function (e) { toast("📡", "Compiler not reachable", String(e.message || e)); }).then(function () { b.disabled = false; b.textContent = "Test"; });
    };
    $("#exp").onclick = function () {
      var blob = new Blob([JSON.stringify({ state: S, code: CODE, patterns: patLoad() }, null, 1)], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "javaquest-progress-" + today() + ".json"; a.click();
    };
    $("#imp").onchange = function () {
      var f = this.files[0]; if (!f) return;
      f.text().then(function (txt) { var o = JSON.parse(txt); if (!o.state) throw new Error("not a JavaQuest file"); S = o.state; CODE = o.code || {}; if (o.patterns) patSave(o.patterns); saveNow(); saveCode(); load(); toast("✅", "Progress imported"); route(); }).catch(function (e) { toast("⚠️", "Import failed", e.message); });
    };
    $("#reset").onclick = function () { if (confirm("Delete ALL JavaQuest progress on this device? This cannot be undone.") && confirm("Really sure? XP, streak, badges and saved code will be gone.")) { localStorage.removeItem(LS); localStorage.removeItem(LS_CODE); load(); route(); onboard(); } };
  }

  /* ================= search ================= */
  function openSearch() {
    $("#search").hidden = false;
    var inp = $("#searchInput"); inp.value = ""; inp.focus(); doSearch("");
  }
  function doSearch(q) {
    q = q.toLowerCase().trim();
    var words = q.split(/\s+/).filter(Boolean);
    var res = (words.length ? ALL.filter(function (it) { var hay = (it.t + " " + it.ask + " " + it.card + " " + TRACKS[it.track].title).toLowerCase(); return words.every(function (w) { return hay.indexOf(w) >= 0; }); }) : ALL.filter(function (it) { return status(it) < 2; })).slice(0, 30);
    $("#searchRes").innerHTML = res.map(function (it, i) { return '<a href="#/i/' + it.id + '" class="' + (i === 0 ? "sel" : "") + '"><span>' + itemIcon(it) + '</span><span><b>' + esc(it.t) + '</b><small>' + esc(TRACKS[it.track].title) + ' · ' + esc(it.modTitle) + '</small></span></a>'; }).join("") || '<p class="muted" style="padding:14px 18px">Nothing found. Try another word.</p>';
  }
  $("#searchBtn").onclick = openSearch;
  $("#searchInput").oninput = function () { doSearch(this.value); };
  $("#searchInput").onkeydown = function (e) {
    var links = $$("#searchRes a"), i = links.indexOf($("#searchRes a.sel"));
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (links[i]) links[i].classList.remove("sel"); i = clamp(i + (e.key === "ArrowDown" ? 1 : -1), 0, links.length - 1); if (links[i]) { links[i].classList.add("sel"); links[i].scrollIntoView({ block: "nearest" }); } }
    if (e.key === "Enter" && links[i]) { location.hash = links[i].getAttribute("href"); $("#search").hidden = true; }
    if (e.key === "Escape") $("#search").hidden = true;
  };
  $("#search").addEventListener("click", function (e) { if (e.target.id === "search" || e.target.closest("#searchRes a")) $("#search").hidden = true; });
  document.addEventListener("keydown", function (e) {
    if (e.target.closest("input,textarea,select,.CodeMirror")) return;
    if (e.key === "/" || (e.key === "k" && (e.ctrlKey || e.metaKey))) { e.preventDefault(); openSearch(); }
    if (e.key === "Escape") { $("#search").hidden = true; if (S.onboarded) closeModal(); }
  });

  /* ================= focus timer ================= */
  var focusInt = null;
  function focusTick() {
    var left = S.focusStart + 25 * 60 * 1000 - Date.now();
    if (left <= 0) {
      clearInterval(focusInt); focusInt = null; S.focusStart = 0; $("#focusTimer").hidden = true;
      S.stats.focus++; bump("focus"); award(20, "focus session"); SFX.level(); confetti(150);
      toast("⏱️", "Focus session complete! +20 XP", "Take a 5-minute break. Drink water. 💧", "gold");
      return;
    }
    var m = Math.floor(left / 60000), s = Math.floor(left % 60000 / 1000);
    $("#focusTime").textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    document.title = "⏱️ " + $("#focusTime").textContent + " · JavaQuest";
  }
  function startFocus() { if (!S.focusStart) { S.focusStart = Date.now(); save(); toast("⏱️", "Focus mode: 25 minutes", "Phone away. One topic. You've got this."); } $("#focusTimer").hidden = false; clearInterval(focusInt); focusInt = setInterval(focusTick, 1000); focusTick(); }
  $("#timerBtn").onclick = function () { if (S.focusStart) return; startFocus(); };
  $("#focusStop").onclick = function () { S.focusStart = 0; save(); clearInterval(focusInt); focusInt = null; $("#focusTimer").hidden = true; document.title = "JavaQuest · Java Backend Interview Course"; };

  /* ================= misc wiring ================= */
  $("#menuBtn").onclick = function () { $("#side").classList.toggle("open"); };
  $("#soundBtn").onclick = function () { S.sound = !S.sound; save(); hud(); if (S.sound) SFX.xp(2); };
  $("#themeBtn").onclick = function () { var t = document.documentElement.dataset.theme === "light" ? "dark" : "light"; document.documentElement.dataset.theme = t; try { localStorage.setItem("jq-theme", t); } catch (e) {} };
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".copy:not(#wUse)");
    if (!b) return;
    var pre = b.closest(".code").querySelector("pre");
    navigator.clipboard && navigator.clipboard.writeText(pre.innerText).then(function () { b.textContent = "Copied ✓"; b.classList.add("ok"); setTimeout(function () { b.textContent = "Copy"; b.classList.remove("ok"); }, 1500); });
  });
  window.addEventListener("hashchange", route);
  window.addEventListener("resize", function () { fxc.width = innerWidth; fxc.height = innerHeight; });
  window.addEventListener("beforeunload", saveNow);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") { applyMissedDays(); ensureQuests(); ensureMission(); hud(); } });

  function onboard() {
    var nPat = Object.keys(patLoad().done).length;
    modal('<span class="m-ic">☕</span><h2>Welcome to JavaQuest</h2><p>Your game-like path to cracking Java backend interviews at product companies. ' + ALL.length + ' lessons, ' + ALL.filter(function (i) { return i.ch; }).length + ' auto-graded coding challenges, flashcards and mock-interview bosses. Built for 3 years of experience.</p>' +
      '<form id="onb"><label>What should we call you?<input type="text" name="name" placeholder="Your name" value="' + esc(S.name) + '"></label>' +
      '<label>Daily XP goal<span class="seg" id="onbGoal">' + [[30, "🐢 30 chill"], [60, "🚶 60 steady"], [100, "🏃 100 serious"], [150, "🚀 150 beast"]].map(function (g) { return '<button type="button" data-g="' + g[0] + '" class="' + (S.goal === g[0] ? "on" : "") + '">' + g[1] + '</button>'; }).join("") + '</span><small class="muted" style="font-weight:400">60 XP ≈ one coding challenge + one concept, about 45 minutes.</small></label>' +
      '<label>Interview target date (optional)<input type="date" name="target" value="' + esc(S.target) + '"></label>' +
      (nPat ? '<p class="small" style="margin:0;color:var(--green)">✓ Found ' + nPat + ' ticks from your design-pattern tracker. They carry over.</p>' : '') +
      '<button class="btn primary big" type="submit">Start my quest 🚀</button></form>', function (m) {
      $$("#onbGoal button", m).forEach(function (b) { b.onclick = function () { $$("#onbGoal button", m).forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on"); S.goal = +b.dataset.g; }; });
      $("#onb", m).onsubmit = function (e) {
        e.preventDefault();
        var fd = new FormData(e.target);
        S.name = String(fd.get("name") || "").trim(); S.target = String(fd.get("target") || "");
        S.onboarded = true; S.mission = null; ensureMission();
        closeModal();
        unlock("start");
        award(10, "welcome bonus");
        confetti(220);
        route();
      };
    });
  }

  load();
  applyMissedDays();
  if (S.focusStart) startFocus();
  route();
  if (!S.onboarded) onboard();
  checkBadges();
  window.JQ = { S: function () { return S; }, award: award, ITEMS: ITEMS, TRACKS: TRACKS };
})();
