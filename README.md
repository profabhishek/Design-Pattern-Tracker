# JavaQuest: Java Backend Interview Course

A game-like study platform for cracking Java backend interviews at product companies, tuned for **3 years of experience** (SDE-1 / early SDE-2).

**Open [`index.html`](index.html)** (or the GitHub Pages site). No install, no server, no login. Progress is saved in your browser.

## What's inside

- **267 lessons in 15 tracks**: Core Java & JVM, Collections, Streams, DSA (51 problem families), Concurrency, SQL, Spring Boot/REST/JPA, Low-Level Design, your 32 Design Patterns, Java 8→21, Microservices, Kafka/Redis/production, System Design, AWS, and Projects & behavioural stories.
- **Easy-language notes**: every lesson has a "Like you're 5" analogy, real Java/Spring code, a 30-second interview answer and common traps.
- **72 auto-graded coding challenges** with a real Java 21 compiler in the browser (Wandbox, with Judge0 as backup). Hidden tests, hints, solutions, plain-English compiler error help.
- **Java playground** for running any code with input.
- **Flashcards** with spaced repetition, created automatically from the lessons you read.
- **Mock-interview bosses**: 5 timed questions per track, self-scored.
- **Game layer**: XP and 22 levels, daily streak with freezes, daily quests and a reward chest, a daily mission, combos, lucky drops, 35 badges, a focus timer, activity heatmap and an interview countdown.

The original 32-topic sprint still lives on: [`patterns.html`](patterns.html) (tracker) and [`learn.html`](learn.html) (notes with diagrams). Ticks sync between those pages and the Design Patterns track in JavaQuest.

## Editing the course

Lesson content is Markdown in [`course/`](course/). After editing, rebuild and test:

```bash
pip install markdown pygments
python3 tools/build_course.py        # writes app/course.js
python3 tools/check_challenges.py    # needs JDK 17+: every solution must pass, every starter must compile
python3 tools/build_learn.py         # only if you changed notes/ (pattern notes)
```

See [`course/README.md`](course/README.md) for the lesson format.

## Files

| Path | What |
|---|---|
| `index.html`, `app/` | The JavaQuest app (`app.js` game + pages, `runner.js` compiler, `course.js` generated content) |
| `course/*.md` | Lesson source |
| `tools/Harness.java` | Test helpers added to every challenge (`T.eq`, `ListNode`, `TreeNode`, `Employee`) |
| `patterns.html`, `learn.html`, `notes/` | The original design-pattern tracker and notes |
