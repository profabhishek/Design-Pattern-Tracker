#!/usr/bin/env python3
"""Build app/course.js (all lessons, flashcards and coding challenges) from course/*.md.

Usage:  pip install markdown pygments   then   python3 tools/build_course.py

Source format (see course/README.md):

    # TRACK <id>
    title: ...
    icon: ...
    ...
    ## MODULE <id> | <title>
    ### ITEM <id> | <title> | must|good|bonus
    ask: the interview question
    card: one-line flashcard answer
    patterns: retry, timeout          (optional, links to learn.html notes)
    <blank line>
    markdown body ...
    ```java starter / ```java tests / ```java solution / ```hint blocks become the coding challenge

The 32 design-pattern topics are read from patterns.html so they stay in sync with the old tracker.
"""
import html
import json
import re
import sys
from pathlib import Path

import markdown
from pygments import highlight
from pygments.formatters import HtmlFormatter
from pygments.lexers import get_lexer_by_name

ROOT = Path(__file__).resolve().parent.parent
COURSE = ROOT / "course"
OUT = ROOT / "app" / "course.js"
HARNESS = Path(__file__).resolve().parent / "Harness.java"

TIERS = {"must", "good", "bonus"}
CALLOUTS = {
    "🧒": "eli5", "🎯": "answer", "⚠️": "trap", "⚠": "trap", "💡": "tip", "🔁": "follow",
    "🧠": "remember", "🏭": "prod", "🧪": "try", "📌": "note",
}
LABELS = {"java": "Java", "sql": "SQL", "yaml": "YAML", "bash": "Terminal", "json": "JSON",
          "text": "Text", "properties": "Properties", "xml": "XML", "http": "HTTP"}

FMT = HtmlFormatter(nowrap=True)


def hl(code, lang):
    try:
        lexer = get_lexer_by_name(lang or "text")
    except Exception:
        lexer = get_lexer_by_name("text")
    return highlight(code, lexer, FMT)


def render_md(body):
    """Markdown -> HTML with our own code blocks (label + copy button) and emoji callouts."""
    blocks = []

    def stash(m):
        parts = (m.group(1) or "").split()
        lang = parts[0] if parts else ""
        code = m.group(2)
        label = LABELS.get(lang, lang.upper() or "Code")
        if lang == "diagram":
            out = '<pre class="ascii">' + html.escape(code.rstrip("\n")) + "</pre>"
        else:
            out = ('<div class="code"><div class="code-h"><span>' + label + '</span>'
                   '<button class="copy" type="button">Copy</button></div>'
                   '<pre class="hl"><code>' + hl(code.rstrip("\n"), lang) + "</code></pre></div>")
        blocks.append(out)
        return "\n\nCODEBLOCK%dEND\n\n" % (len(blocks) - 1)

    body = re.sub(r"^```([^\n]*)\n(.*?)^```\s*$", stash, body, flags=re.S | re.M)
    out = markdown.markdown(body, extensions=["tables", "sane_lists"])
    out = re.sub(r"<p>CODEBLOCK(\d+)END</p>", lambda m: blocks[int(m.group(1))], out)

    def callout(m):
        inner = m.group(1)
        text = re.sub(r"<[^>]+>", "", inner).strip()
        for emo, cls in CALLOUTS.items():
            if text.startswith(emo):
                return '<blockquote class="co co-%s">%s</blockquote>' % (cls, inner)
        return "<blockquote>%s</blockquote>" % inner

    out = re.sub(r"<blockquote>(.*?)</blockquote>", callout, out, flags=re.S)
    out = out.replace("<table>", '<div class="tbl"><table>').replace("</table>", "</table></div>")
    return out


def parse_meta(lines):
    meta, i = {}, 0
    while i < len(lines) and re.match(r"^[a-z]+:\s", lines[i]):
        k, v = lines[i].split(":", 1)
        meta[k.strip()] = v.strip()
        i += 1
    return meta, "\n".join(lines[i:]).strip("\n")


def extract_challenge(body, item_id, errors):
    ch = {}

    def grab(m):
        info = m.group(1).strip().split()
        kind = info[1] if len(info) > 1 and info[0] == "java" else (info[0] if info and info[0] == "hint" else None)
        if kind in ("starter", "tests", "solution"):
            ch[kind] = m.group(2).rstrip("\n") + "\n"
            return ""
        if kind == "hint":
            ch.setdefault("hints", []).append(m.group(2).strip())
            return ""
        return m.group(0)

    body = re.sub(r"^```([^\n]*)\n(.*?)^```\s*$", grab, body, flags=re.S | re.M)
    if not ch:
        return body, None
    if re.search(r"^\s*import\s", ch.get("tests", ""), re.M):
        errors.append("%s: tests must not use import (they are appended after user code); use full names like java.util.List" % item_id)
    for need in ("starter", "tests", "solution"):
        if need not in ch:
            errors.append("%s: challenge is missing ```java %s" % (item_id, need))
    return body, ch


def parse_file(path, errors):
    tracks = []
    text = path.read_text(encoding="utf-8")
    parts = re.split(r"^(# TRACK .*|## MODULE .*|### ITEM .*)$", text, flags=re.M)
    track = module = None
    i = 1
    while i < len(parts):
        head, chunk = parts[i].strip(), parts[i + 1]
        lines = chunk.strip("\n").split("\n")
        if head.startswith("# TRACK"):
            meta, _ = parse_meta(lines)
            track = dict(id=head.split()[2], modules=[], **meta)
            tracks.append(track)
        elif head.startswith("## MODULE"):
            mid, title = [s.strip() for s in head[len("## MODULE"):].split("|", 1)]
            module = dict(id=mid, title=title, items=[])
            meta, intro = parse_meta(lines)
            if intro.strip():
                module["intro"] = render_md(intro)
            track["modules"].append(module)
        else:
            bits = [s.strip() for s in head[len("### ITEM"):].split("|")]
            iid, title = bits[0], bits[1]
            tier = bits[2] if len(bits) > 2 else "must"
            if tier not in TIERS:
                errors.append("%s: bad tier %r" % (iid, tier))
            meta, body = parse_meta(lines)
            body, ch = extract_challenge(body, iid, errors)
            item = dict(id=iid, t=title, tier=tier, track=track["id"], mod=module["id"],
                        ask=meta.get("ask", ""), card=meta.get("card", ""), html=render_md(body))
            if meta.get("patterns"):
                item["patterns"] = [p.strip() for p in meta["patterns"].split(",") if p.strip()]
            if meta.get("lc"):
                item["lc"] = [p.strip() for p in meta["lc"].split(";") if p.strip()]
            if ch:
                item["ch"] = ch
            if not item["card"]:
                errors.append("%s: missing card:" % iid)
            module["items"].append(item)
        i += 2
    return tracks


def pattern_track():
    src = (ROOT / "patterns.html").read_text(encoding="utf-8")
    pri_mod = {1: ("p1", "Must-know patterns"), 2: ("p2", "Distributed systems patterns"), 3: ("p3", "Architecture & rollout patterns")}
    mods = {k: dict(id=v[0], title=v[1], items=[]) for k, v in pri_mod.items()}
    for m in re.finditer(r'^\s+(\w+): \{ n: "([^"]+)", p: (\d), focus: "([^"]*)", build: "([^"]*)", trade: "([^"]*)" \}', src, re.M):
        pid, name, p, focus, build, trade = m.groups()
        p = int(p)
        body = ("> 🧒 **In one line:** %s\n\n#### 🛠️ Build it\n%s\n\n#### 🗣️ Be ready to explain\n%s.\n\n"
                "Your full notes for this pattern (real-life example, diagram and Spring Boot code) open in the notes website. "
                "Tick **Understand**, **Build** and **Explain** below as you go. The ticks sync with your old tracker.") % (focus, build, trade[0].upper() + trade[1:])
        mods[p]["items"].append(dict(id="pat-" + pid, pid=pid, t=name, tier={1: "must", 2: "good", 3: "bonus"}[p],
                                     track="patterns", mod=mods[p]["id"], ask="Explain the %s pattern. When would you use it, and what are the trade-offs?" % name,
                                     card=focus + " Watch out for: " + trade + ".", html=render_md(body), kind="pattern"))
    return dict(id="patterns", title="Design Patterns (your 32)", icon="🧩", color="#ec4899", tier="must",
                about="Your original 32-topic sprint: classic patterns, resilience, distributed systems and rollouts.",
                modules=[mods[1], mods[2], mods[3]])


def main():
    errors = []
    tracks = []
    for f in sorted(COURSE.glob("[0-9]*.md")):
        for t in parse_file(f, errors):
            same = [x for x in tracks if x["id"] == t["id"]]
            if same:  # a track can continue in another file: "# TRACK dsa" again, no metadata needed
                same[0]["modules"].extend(t["modules"])
            else:
                tracks.append(t)
    tracks.append(pattern_track())
    order = json.loads((COURSE / "order.json").read_text()) if (COURSE / "order.json").exists() else None
    if order:
        by_id = {t["id"]: t for t in tracks}
        missing = [t for t in by_id if t not in order]
        tracks = [by_id[t] for t in order if t in by_id] + [by_id[t] for t in missing]

    seen, n_items, n_ch = set(), 0, 0
    for t in tracks:
        for m in t["modules"]:
            for it in m["items"]:
                if it["id"] in seen:
                    errors.append("duplicate id " + it["id"])
                seen.add(it["id"])
                n_items += 1
                n_ch += 1 if it.get("ch") else 0
    for t in tracks:
        for m in t["modules"]:
            for it in m["items"]:
                for p in it.get("patterns", []):
                    if "pat-" + p not in seen:
                        errors.append("%s: unknown pattern %s" % (it["id"], p))
    if errors:
        print("\n".join("ERROR " + e for e in errors))
        sys.exit(1)

    data = dict(tracks=tracks, harness=HARNESS.read_text(encoding="utf-8"))
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text("/* Generated by tools/build_course.py from course/*.md. Do not edit by hand. */\nwindow.COURSE = "
                   + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print("Built %s: %d tracks, %d items, %d coding challenges, %d KB" % (OUT.relative_to(ROOT), len(tracks), n_items, n_ch, OUT.stat().st_size // 1024))


if __name__ == "__main__":
    main()
