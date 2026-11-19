# Design Pattern Tracker

A 14-day study plan for 32 topics: design patterns, resilience, distributed systems and rollout strategies.

- **Tracker:** [`index.html`](index.html). Tick off each topic as you understand it, build it and explain it. Progress is saved in your browser.
- **Notes:** [`learn.html`](learn.html). A friendly notes website: a real-life example for every topic, visual diagrams, Spring Boot code with copy buttons, and plain-English pop-ups for every Java word. There is a "New to Java? Start here" guide too. Each topic card in the tracker has a **Notes** button that opens its page, and ticks stay in sync between the two pages.

Open either file in a browser. No server is needed.

## Editing the notes

The note text lives in [`notes/`](notes/) as Markdown. `learn.html` is generated from those files:

```bash
pip install markdown pygments
python3 tools/build_learn.py
```

- `notes/<topic>.md`: one file per topic (the file name matches the topic id in `index.html`).
- `notes/java-basics.md`: the beginner guide.
- `tools/glossary.json`: the plain-English meaning of every Java/Spring word that gets a pop-up.
- `tools/learn.template.html`: the page design.

Diagrams are written as small ```` ```diagram ```` blocks inside the notes, for example:

```text
caption: How the outbox works
flow: [Your service]{accent} -> (one transaction) [Database]{db} -> [Kafka]
branch: [Coordinator] => (prepare?) [DB-A]{good} ; (prepare?) [DB-B]{good}
fan: [Router] ; (tenants A-C) [Cell 1] ; (tenants D-F) [Cell 2]{fail} ; base: [Shared DB]
step: {fail} Coordinator crashes | before it sends COMMIT
note: Any extra explanation.
```

Box styles: `accent`, `good`, `warn`, `fail`, `muted`, `db`. Text after `|` in a box becomes a smaller second line.
