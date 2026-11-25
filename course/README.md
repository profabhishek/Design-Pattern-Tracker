# Lesson format

```text
# TRACK <id>                 (repeat the line in another file to continue a track)
title: …
icon: …
color: #hex
tier: must|good|bonus
about: one line

## MODULE <id> | Title
optional intro markdown

### ITEM <id> | Title | must|good|bonus
ask: the interview question
card: the flashcard answer (also the model answer in mock interviews)
patterns: retry, timeout      (optional: links to the 32 pattern notes)
lc: Two Sum; 3Sum             (optional: LeetCode practice links)

Markdown body. Blockquotes starting with 🧒 🎯 ⚠️ 💡 🔁 🏭 🧪 get coloured callouts.
```

Coding challenge = four fenced blocks inside an item: ` ```java starter `, ` ```java tests `, ` ```java solution `, and any number of ` ```hint `.
Tests are a `class Main` that calls `T.eq("name", () -> result, expected)` and ends with `T.done()`. Tests can't use `import` (use full names like `java.util.List`).
