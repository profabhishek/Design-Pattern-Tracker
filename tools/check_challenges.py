#!/usr/bin/env python3
"""Compile and run every coding challenge locally (needs JDK 17+ on PATH).

For each challenge:  solution + tests + helpers  must print "ALL ... TESTS PASSED".
                     starter  + tests + helpers  must compile (and should NOT pass).
Usage:  python3 tools/check_challenges.py [item-id ...]
"""
import json
import re
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
data = json.loads(re.sub(r"^.*?window\.COURSE = ", "", (ROOT / "app" / "course.js").read_text(encoding="utf-8"), flags=re.S).rstrip().rstrip(";"))
HARNESS = data["harness"].replace("__NONCE__", "OKNONCE")
items = [it for t in data["tracks"] for m in t["modules"] for it in m["items"] if it.get("ch")]
if len(sys.argv) > 1:
    items = [it for it in items if it["id"] in sys.argv[1:]]


def run(code):
    with tempfile.TemporaryDirectory() as d:
        src = Path(d) / "Prog.java"
        src.write_text(code, encoding="utf-8")
        c = subprocess.run(["javac", "-encoding", "UTF-8", "-nowarn", "-d", d, str(src)], capture_output=True, text=True)
        if c.returncode:
            return False, "COMPILE:\n" + "\n".join(l for l in c.stderr.splitlines() if "Picked up" not in l)
        r = subprocess.run(["java", "-Dstdout.encoding=UTF-8", "-cp", d, "Main"], capture_output=True, text=True, timeout=20)
        return "OKNONCE" in r.stdout, r.stdout + "\n".join(l for l in r.stderr.splitlines() if "Picked up" not in l)


def check(it):
    ch = it["ch"]
    ok, out = run(ch["solution"] + "\n\n" + ch["tests"] + "\n\n" + HARNESS)
    problems = []
    if not ok:
        problems.append("solution does not pass:\n" + out[-1500:])
    sok, sout = run(ch["starter"] + "\n\n" + ch["tests"] + "\n\n" + HARNESS)
    if sout.startswith("COMPILE"):
        problems.append("starter does not compile:\n" + sout[-1500:])
    elif sok:
        problems.append("starter already passes (tests too weak?)")
    return it["id"], problems


with ThreadPoolExecutor(max_workers=6) as ex:
    results = list(ex.map(check, items))
bad = [(i, p) for i, p in results if p]
for i, p in bad:
    print("✗", i)
    for x in p:
        print("   " + x.replace("\n", "\n   "))
print("%d/%d challenges OK" % (len(results) - len(bad), len(results)))
sys.exit(1 if bad else 0)
