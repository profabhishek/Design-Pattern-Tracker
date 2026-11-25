# TRACK career
title: Projects, Stories & Behavioural
icon: 🎤
color: #ec4899
tier: must
about: The project deep-dive and behavioural rounds. Prepare your stories once with the STAR method and reuse them everywhere.

## MODULE stories | Project discussion
> 💡 These lessons don't have one right answer. Each one gives you a template. Write YOUR version (in a notes app), then say it out loud in under 2 minutes before you tick "I can explain it".

### ITEM car-star | The STAR method and how to structure any answer | must
ask: How should you structure answers to "tell me about a time when..." questions?
card: STAR: Situation (1–2 lines of context), Task (your responsibility), Action (what YOU did, technical detail, decisions and trade-offs: ~60% of the answer), Result (numbers: latency, cost, incidents, time saved; plus what you learned). Keep it 1.5–2 minutes, say "I" not "we" for your part, and prepare 6–8 stories that cover ownership, conflict, failure, impact, learning, and leadership.

> 🧒 **Like you're 5:** Telling a story to grandma: where were we, what was the problem, what did I do, and how did it end. Short, clear, and the hero (you) actually does something.

| Story bank (prepare one each) | Typical questions it answers |
|---|---|
| A service you owned end to end | "Walk me through your project" |
| A production incident | "Tell me about a failure / pressure" |
| A performance win with numbers | "Biggest impact?" |
| A design disagreement | "Conflict with a teammate/senior?" |
| Learning something new fast | "Tell me about a challenge" |
| Mentoring / code review | "Leadership without authority?" |

### ITEM car-own-service | Walk through one backend service you owned | must
ask: Walk me through one backend service you owned: APIs, data model, traffic and dependencies.
card: Draw it as you talk: purpose in one line → users/callers → main APIs (2–3) → data model and DB choice → dependencies (sync/async) → scale (RPS, data size, latency target) → how it's deployed and monitored → one hard problem you solved and a trade-off you made → what you'd improve. Know numbers and be ready to go deep on any box.

> 🧒 **Like you're 5:** Give the interviewer a tour of your house: what the house is for, the main rooms (APIs), where things are stored (DB), the neighbours you talk to (other services), and the one room you rebuilt yourself.

#### Template
> 🎯 "I owned the **[name]** service that **[does X for Y users]**. It exposes **[POST /…, GET /…]**, handles about **[N] RPS** at **[p95 latency]**. Data lives in **[Postgres/Redis/…]** because **[reason]**. It calls **[service A] synchronously** and publishes **[event] to Kafka**. The hardest part was **[problem]**; I **[solution]**, which **[result with a number]**. If I rebuilt it I'd **[improvement]**."

> 💡 **Tip (enterprise and internal projects count!):** a multi-module portal with applicant forms, admin panels, exports and a server migration is a great story: talk about data modelling, validation, security, deployment, performance and the users you served.

### ITEM car-incident | Describe a production incident you resolved | must
ask: Describe a production incident you resolved. What was the root cause and the permanent fix?
card: Structure: detection (alert/user report, time) → impact (who, how bad) → mitigation (rollback, restart, scale, feature flag; stop the bleeding first) → investigation (metrics, logs, traces, what you ruled out) → root cause (technical + why it wasn't caught) → permanent fix → prevention (tests, alerts, runbook, process change) → blameless postmortem.

> 🧒 **Like you're 5:** Firefighter story: the alarm rang, you put the fire out first, then found the faulty wire, replaced it, and installed a smoke detector so it never surprises anyone again.

#### Example shape
> 🎯 "At 11 pm checkout errors jumped to 8%. I checked the dashboard: only the payment endpoint, starting right after a deploy. We rolled back in 12 minutes. Traces showed the new code opened a DB transaction and called the payment gateway inside it, exhausting the Hikari pool under load. Fix: moved the external call outside the transaction and added a timeout. Prevention: a Hikari pool-usage alert and a load test in CI for the checkout flow."

### ITEM car-performance | A performance improvement you delivered (before/after) | must
ask: What performance improvement did you deliver? How did you measure before and after?
card: Pick something measurable (p95 latency, throughput, DB CPU, memory, page load, cost). Story: baseline numbers + how measured (APM, logs, JMeter/Gatling, EXPLAIN) → finding the bottleneck (profiling, traces, slow query log) → change (index, caching, N+1 fix, batching, async, pagination, connection pool, JVM/GC tuning) → after numbers under the same load → side effects and trade-offs (stale cache, memory).

> 🧒 **Like you're 5:** "My bicycle took 30 minutes to school. I found the flat tyre, fixed it, and now it takes 15. I timed it before and after with the same stopwatch."

> ⚠️ **Trap:** "It became much faster" without numbers sounds made up. Even rough numbers ("from ~4 s to under 400 ms") are far better.

### ITEM car-schema | Database schema changes without downtime | must
ask: How did you handle database schema changes without downtime?
card: Use versioned migrations (Flyway/Liquibase) in CI/CD and the expand–contract pattern: 1) expand: add new nullable column/table, backward compatible; 2) deploy code that writes both and reads new with fallback; 3) backfill in batches; 4) switch reads; 5) contract: drop old column in a later release. Avoid long locks on big tables (online DDL, create indexes CONCURRENTLY in Postgres, batch updates). Always keep the previous app version working so rollback is safe.
patterns: bluegreen, strangler

> 🧒 **Like you're 5:** Moving house without ever being homeless: rent the new house first, move things over little by little, live in both for a while, and only give up the old house when everything works in the new one.

### ITEM car-design-change | A design decision you changed after a scaling or reliability issue | must
ask: Explain a design decision you changed after discovering a scaling or reliability issue.
card: Shows maturity: the original decision and why it made sense then → what changed (traffic, data size, new requirement) → the signal (metrics, incident) → options you considered with trade-offs → what you chose and why → result → lesson. Examples: sync call → async queue, cron job → event-driven, single DB table → partitioned, polling → webhooks, in-memory cache → Redis.

> 🧒 **Like you're 5:** "We built a small wooden bridge because only bikes used it. Then trucks started coming, so we rebuilt it in steel. The first bridge wasn't wrong, the traffic changed."

### ITEM car-quality | Code review, mentoring and quality across services | good
ask: How do you review code, mentor engineers and ensure quality across multiple services?
card: Code review: correctness, readability, tests, edge cases, security, performance; kind and specific comments; small PRs. Quality: automated tests in CI, static analysis (Sonar, SpotBugs), coverage on critical paths, contract tests between services, shared libraries/templates, ADRs for big decisions, observability standards. Mentoring: pairing, explaining the why, giving juniors ownership with support.

> 🧒 **Like you're 5:** Being a good team captain: check each other's homework kindly, make rules everyone follows, and help new kids learn instead of doing it for them.

### ITEM car-why | Why are you leaving? Why this company? Salary talk | must
ask: Why do you want to switch? Why this company? What are your salary expectations?
card: Why switch: talk about growth you want (scale, product ownership, engineering depth), never complain about your current employer. Why us: specific: their product, tech challenges, engineering blog, scale; connect to your experience. Salary: research ranges (levels.fyi, AmbitionBox, Glassdoor, friends), give a range based on market and your skills, prefer to let them share their band first, negotiate on total compensation, and get it in writing.

> 🧒 **Like you're 5:** You're not running away from a bad school, you're moving up to a school with a bigger science lab because you love experiments.

> 🎯 **Example:** "I've built and run end-to-end backend systems: public forms, admin panels, exports and a cloud migration. I want to work on a product at much larger scale, with strong engineering practices around distributed systems, which is exactly what your team does with [their product]."
