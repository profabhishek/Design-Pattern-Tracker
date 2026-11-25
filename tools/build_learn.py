#!/usr/bin/env python3
"""Build learn.html (the notes website) from notes/*.md.

Usage:  pip install markdown pygments   then   python3 tools/build_learn.py

The markdown files in notes/ are the source. Edit them, then run this script
again. Topic order, names, priorities and days are read from patterns.html so the
notes always match the tracker.
"""
import html
import json
import re
from pathlib import Path

import markdown
from pygments import highlight
from pygments.formatters import HtmlFormatter
from pygments.lexers import get_lexer_by_name

ROOT = Path(__file__).resolve().parent.parent
NOTES = ROOT / "notes"
TEMPLATE = Path(__file__).resolve().parent / "learn.template.html"
GLOSSARY = Path(__file__).resolve().parent / "glossary.json"
OUT = ROOT / "learn.html"

LANG_LABEL = {
    "java": "Java", "yaml": "application.yml", "properties": "application.properties",
    "xml": "pom.xml", "sql": "SQL", "bash": "Terminal", "json": "JSON", "": "Text",
}
DIAGRAM_CHARS = set("─│┌┐└┘├┤┬┴►◄▼▲━")


def read_tracker():
    src = (ROOT / "patterns.html").read_text(encoding="utf-8")
    topics = {}
    for m in re.finditer(r'^\s+(\w+): \{ n: "([^"]+)", p: (\d), focus: "([^"]*)", build: "([^"]*)", trade: "([^"]*)" \}', src, re.M):
        topics[m.group(1)] = dict(id=m.group(1), n=m.group(2), p=int(m.group(3)), focus=m.group(4),
                                  build=m.group(5), trade=m.group(6))
    days = []
    for m in re.finditer(r'\{ theme: "([^"]+)", topics: \[([^\]]*)\]', src):
        days.append(dict(theme=m.group(1), topics=re.findall(r'"(\w+)"', m.group(2))))
    return topics, days


def slugify(text):
    s = re.sub(r"<[^>]+>", "", text)
    s = html.unescape(s).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "section"


def kind_of(title):
    t = title.lower()
    if "real-life" in t:
        return "example"
    if "build task" in t:
        return "build"
    if "quick revision" in t:
        return "revision"
    if "flavours" in t or "types" in t:
        return "idea"
    if "trade-off" in t:
        return "explain"
    if "problem" in t:
        return "problem"
    if "interview" in t or "points to explain" in t or "trade-off" in t or "explain" in t:
        return "explain"
    if "when to use" in t or "when is" in t or "when it is" in t or "when to cut" in t or "when not" in t:
        return "when"
    if " vs " in t or "difference" in t or "different" in t or "confusion" in t:
        return "compare"
    if "code" in t or "spring boot" in t or "java" in t or "version" in t:
        return "code"
    if "how" in t or "steps" in t or "terms" in t or "key" in t or "rules" in t or "types" in t or "flavours" in t or "picture" in t or "flow" in t or "states" in t or "phases" in t or "ways" in t or "algorithms" in t:
        return "idea"
    return "default"


NODE_RE = re.compile(r"\[([^\]]+)\](?:\{(\w+)\})?")
LABEL_RE = re.compile(r"\(([^)]*)\)")
EDGE_RE = re.compile(r"(<-|->)\s*(?:\(([^)]*)\))?")


def inline(text):
    """Escape text but allow `code` spans."""
    out = html.escape(text.strip())
    return re.sub(r"`([^`]+)`", r"<code>\1</code>", out)


def node_html(raw, style=None):
    lines = [x for x in raw.split("|")]
    body = f"<b>{inline(lines[0])}</b>" + "".join(f"<small>{inline(x)}</small>" for x in lines[1:])
    return f'<div class="node s-{style or "plain"}">{body}</div>'


def edge_html(direction, label, vertical=False):
    cls = "vedge" if vertical else "edge" + (" back" if direction == "<-" else "")
    lab = f'<span class="el">{inline(label)}</span>' if label else ""
    return f'<div class="{cls}">{lab}<i></i></div>'


def parse_chain(line):
    """'[A] -> (x) [B]{good}' -> list of ('node', raw, style) / ('edge', dir, label)."""
    items, pos = [], 0
    while pos < len(line):
        if line[pos].isspace():
            pos += 1
            continue
        m = NODE_RE.match(line, pos)
        if m:
            items.append(("node", m.group(1), m.group(2)))
            pos = m.end()
            continue
        m = EDGE_RE.match(line, pos)
        if m:
            items.append(("edge", m.group(1), m.group(2)))
            pos = m.end()
            continue
        m = LABEL_RE.match(line, pos)
        if m:
            items.append(("edge", "->", m.group(1)))
            pos = m.end()
            continue
        raise ValueError(f"Cannot parse diagram line near: {line[pos:pos + 30]!r}")
    return items


def render_flow(line):
    items = parse_chain(line)
    parts = [node_html(it[1], it[2]) if it[0] == "node" else edge_html(it[1], it[2]) for it in items]
    n = sum(1 for it in items if it[0] == "node")
    return f'<div class="flow{" long" if n >= 5 else ""}">' + "".join(parts) + "</div>"


def render_branch(line):
    src, rest = line.split("=>", 1)
    src_items = parse_chain(src)
    src_html = "".join(node_html(i[1], i[2]) if i[0] == "node" else edge_html(i[1], i[2]) for i in src_items)
    if len(src_items) > 1:
        src_html = f'<div class="src">{src_html}</div>'
    rows = []
    for target in rest.split(";"):
        items = parse_chain(target.strip())
        label = items[0][2] if items and items[0][0] == "edge" else None
        node = [i for i in items if i[0] == "node"][0]
        rows.append('<div class="trow">' + edge_html("->", label) + node_html(node[1], node[2]) + "</div>")
    return ('<div class="branch">' + src_html + '<div class="stub"></div>'
            '<div class="targets">' + "".join(rows) + "</div></div>")


def render_fan(line):
    segs = [x.strip() for x in line.split(";")]
    base = None
    if segs[-1].startswith("base:"):
        base = parse_chain(segs.pop()[5:].strip())[0]
    top = parse_chain(segs[0])[0]
    cols = []
    for seg in segs[1:]:
        items = parse_chain(seg)
        label = items[0][2] if items[0][0] == "edge" else None
        node = [i for i in items if i[0] == "node"][0]
        cols.append('<div class="fcol">' + edge_html("->", label, vertical=True) + node_html(node[1], node[2])
                    + (edge_html("->", None, vertical=True) if base else "") + "</div>")
    h = (f'<div class="fan" style="--n:{len(cols)}">' + node_html(top[1], top[2]) + '<div class="vedge plain"><i></i></div>'
         f'<div class="fcols{" has-base" if base else ""}">' + "".join(cols) + "</div>")
    if base:
        h += node_html(base[1], base[2] or "db").replace('class="node', 'class="node base', 1)
    return h + "</div>"


def render_diagram(spec):
    out, steps, caption = [], [], "Diagram"

    def flush_steps():
        if steps:
            out.append('<ol class="tl">' + "".join(steps) + "</ol>")
            steps.clear()

    for raw in spec.splitlines():
        line = raw.strip()
        if not line:
            continue
        key, _, val = line.partition(":")
        key, val = key.strip(), val.strip()
        if key != "step":
            flush_steps()
        if key == "caption":
            caption = val
        elif key == "title":
            out.append(f'<div class="dg-title">{inline(val)}</div>')
        elif key.startswith("note"):
            tone = key.split("-")[1] if "-" in key else "plain"
            out.append(f'<p class="dg-note t-{tone}">{inline(val)}</p>')
        elif key == "flow":
            out.append(render_flow(val))
        elif key == "branch":
            out.append(render_branch(val))
        elif key == "fan":
            out.append(render_fan(val))
        elif key.startswith("step"):
            tone = ""
            m = re.match(r"^\{(\w+)\}\s*", val)
            if m:
                tone, val = m.group(1), val[m.end():]
            title, _, detail = val.partition("|")
            steps.append(f'<li class="{("t-" + tone) if tone else ""}"><b>{inline(title)}</b>'
                         + (f"<span>{inline(detail)}</span>" if detail else "") + "</li>")
        else:
            raise ValueError(f"Unknown diagram line: {line!r}")
    flush_steps()
    label = re.sub(r"<[^>]+>", " ", " ".join(out))
    label = html.escape(re.sub(r"\s+", " ", html.unescape(label)).strip(), quote=True)
    return (f'<figure class="dg" role="img" aria-label="{html.escape(caption)}: {label}">'
            f'<figcaption>{html.escape(caption)}</figcaption><div class="dg-body">' + "".join(out) + "</div></figure>")


def render_code(lang, code):
    lang = (lang or "").strip().lower()
    if lang == "diagram":
        return render_diagram(code)
    if lang == "" and any(c in DIAGRAM_CHARS for c in code):
        return ('<figure class="diagram"><figcaption><span class="lang">Diagram</span></figcaption>'
                f'<pre>{html.escape(code)}</pre></figure>')
    label = LANG_LABEL.get(lang, lang.upper())
    try:
        lexer = get_lexer_by_name(lang) if lang else None
    except Exception:
        lexer = None
    body = highlight(code, lexer, HtmlFormatter(nowrap=True)).rstrip("\n") if lexer else html.escape(code)
    return (f'<figure class="code" data-lang="{html.escape(lang or "text")}">'
            f'<figcaption><span class="lang">{html.escape(label)}</span>'
            '<button type="button" class="copy" aria-label="Copy code">Copy</button></figcaption>'
            f'<pre><code>{body}</code></pre></figure>')


def convert(md_text):
    blocks = []

    def stash(m):
        blocks.append(render_code(m.group(1), m.group(2)))
        return f"\n\nCODEBLOCK{len(blocks) - 1}X\n\n"

    md_text = re.sub(r"^```([\w-]*)\n(.*?)\n```\s*$", stash, md_text, flags=re.S | re.M)

    title = re.search(r"^# (.+)$", md_text, re.M).group(1).strip()
    md_text = re.sub(r"^# .+\n", "", md_text, count=1, flags=re.M)
    lede = ""
    m = re.search(r"^\*\*In one line:\*\*\s*(.+)$", md_text, re.M)
    if m:
        lede = markdown.markdown(m.group(1)).removeprefix("<p>").removesuffix("</p>")
        md_text = md_text.replace(m.group(0), "", 1)
    md_text = re.sub(r"^---\s*$", "", md_text, count=1, flags=re.M)

    body = markdown.markdown(md_text, extensions=["tables", "sane_lists"])
    body = re.sub(r"<p>CODEBLOCK(\d+)X</p>", lambda mm: blocks[int(mm.group(1))], body)
    body = body.replace("<table>", '<div class="table-wrap"><table>').replace("</table>", "</table></div>")

    # wrap each h2 + following content into a <section>
    parts = re.split(r"<h2>(.*?)</h2>", body)
    intro, out, toc, used = parts[0].strip(), [], [], set()
    for i in range(1, len(parts), 2):
        raw = re.sub(r"^\d+\.\s*", "", parts[i]).strip()
        kind = kind_of(raw)
        sid = slugify(raw)
        while sid in used:
            sid += "-2"
        used.add(sid)
        nice = raw
        if kind == "example":
            nice = "Think of it like this"
        toc.append(dict(id=sid, t=re.sub(r"<[^>]+>", "", html.unescape(nice)), k=kind))
        out.append(f'<section class="sec k-{kind}" id="{sid}" data-kind="{kind}">'
                   f'<h2><span class="ico" aria-hidden="true"></span><span class="h2t">{nice}</span></h2>'
                   f'<div class="sec-body">{parts[i + 1].strip()}</div></section>')
    html_out = (intro + "\n" if intro else "") + "\n".join(out)
    text = re.sub(r"<[^>]+>", " ", html_out)
    text = html.unescape(re.sub(r"\s+", " ", text)).strip()
    words = len(text.split())
    return dict(title=title, lede=lede, html=html_out, toc=toc,
                mins=max(3, round(words / 170)), text=text.lower())


def main():
    topics, days = read_tracker()
    data_topics = []
    for di, d in enumerate(days, 1):
        for tid in d["topics"]:
            meta = topics[tid]
            note = convert((NOTES / f"{tid}.md").read_text(encoding="utf-8"))
            data_topics.append(dict(meta, day=di, theme=d["theme"], **note))
    primer = convert((NOTES / "java-basics.md").read_text(encoding="utf-8"))
    primer.update(id="java-basics", n="Java & Spring Boot basics")
    data = dict(
        topics=data_topics,
        days=[dict(n=i, theme=d["theme"], topics=d["topics"]) for i, d in enumerate(days, 1)],
        primer=primer,
        glossary=json.loads(GLOSSARY.read_text(encoding="utf-8")),
    )
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    page = TEMPLATE.read_text(encoding="utf-8").replace("/*__DATA__*/null", payload)
    OUT.write_text(page, encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}: {len(data_topics)} topics, {len(page) // 1024} KB")


if __name__ == "__main__":
    main()
