#!/usr/bin/env python3
"""Analyze the P3A control-plane soak jsonl (results/m2m-p3a-control.jsonl).

Creation-latency-vs-count curve (buckets of 100 by order), error onset per
status class, GET-poll status/latency distribution per phase (425-aware:
425 = session record exists but PC never connected; death = 404/410/other
transition on an offer-variant session), hold heartbeats, GC marks.
"""
import json
import sys
import statistics as st
from collections import defaultdict

PATH = sys.argv[1] if len(sys.argv) > 1 else \
    "/Users/s32863/personal/positron/results/m2m-p3a-control.jsonl"

rows = []
with open(PATH) as f:
    for line in f:
        try:
            rows.append(json.loads(line))
        except ValueError:
            pass

def pct(xs, p):
    if not xs:
        return None
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(p / 100 * len(xs)))]

def fmt(xs):
    if not xs:
        return "n=0"
    return ("n=%d p50=%d p90=%d p99=%d max=%d" %
            (len(xs), pct(xs, 50), pct(xs, 90), pct(xs, 99), max(xs)))

api = [r for r in rows if r.get("kind") == "api"]
creates = [r for r in api if r.get("sub") == "sessions/new" and r.get("method") == "POST"]
gets = [r for r in api if r.get("method") == "GET"]

print("== sessions/new creation curve (buckets of 100, chronological) ==")
ok_lat_all = []
for i in range(0, len(creates), 100):
    b = creates[i:i + 100]
    ok = [r["ms"] for r in b if 200 <= (r.get("status") or 0) < 300]
    bad = [r for r in b if not 200 <= (r.get("status") or 0) < 300]
    ok_lat_all += ok
    phases = ",".join(sorted({r.get("phase", "?") for r in b}))
    print("  [%4d-%4d] %-10s %s bad=%d %s" % (
        i + 1, i + len(b), phases, fmt(ok), len(bad),
        ("first-bad: %s %s" % (bad[0].get("status"), (bad[0].get("body") or bad[0].get("err") or "")[:80])) if bad else ""))
print("  ALL ok: %s" % fmt(ok_lat_all))

bad_creates = [r for r in creates if not 200 <= (r.get("status") or 0) < 300]
print("\n== create errors: %d / %d ==" % (len(bad_creates), len(creates)))
by_status = defaultdict(list)
for r in bad_creates:
    by_status[r.get("status") or ("ERR:" + str(r.get("err")))].append(r)
for k, v in sorted(by_status.items(), key=lambda x: str(x[0])):
    first = v[0]
    idx = creates.index(first) + 1
    print("  status=%s n=%d first at create #%d phase=%s body=%s hdr=%s" % (
        k, len(v), idx, first.get("phase"), (first.get("body") or "")[:160], first.get("hdr")))

print("\n== GET polls per phase (status -> n, latency) ==")
per = defaultdict(lambda: defaultdict(list))
for r in gets:
    per[r.get("phase", "?")][r.get("status") or ("ERR:" + str(r.get("err"))[:40])].append(r["ms"])
for ph in per:
    for stt, lat in sorted(per[ph].items(), key=lambda x: str(x[0])):
        print("  %-6s %-8s %s" % (ph, stt, fmt(lat)))

deaths = [r for r in rows if r.get("kind") == "death"]
print("\n== deaths (hold-phase 404/410 transitions): %d ==" % len(deaths))
for r in deaths[:20]:
    print("  sid=%s… age=%.0fs status=%s" % (r["sid"][:12], r["ageS"], r["status"]))

print("\n== hold heartbeats ==")
for r in rows:
    if r.get("kind") == "hold-hb":
        print("  alive=%s/%s deaths=%s polls=%s pollErr=%s" % (
            r.get("alive"), r.get("total"), r.get("deaths"), r.get("polls"), r.get("pollErr")))

print("\n== push steps ==")
for r in rows:
    if r.get("kind") == "push-step":
        print("  %s: ok=%s bad=%s p50=%s p90=%s p99=%s max=%s cum=%s hardStop=%s" % (
            r.get("step"), r.get("ok"), r.get("bad"), r.get("p50"), r.get("p90"),
            r.get("p99"), r.get("max"), r.get("cum"), json.dumps(r.get("hardStop"))[:200]))

print("\n== GC marks (raw status counts per mark, 425-aware) ==")
gc = [r for r in gets if str(r.get("probe", "")).startswith("gc-")]
marks = defaultdict(lambda: defaultdict(int))
for r in gc:
    marks[(r.get("mark"), r.get("probe"))][r.get("status")] += 1
for (mark, probe), counts in sorted(marks.items(), key=lambda x: (x[0][0] or 0, str(x[0][1]))):
    print("  +%ss %-8s %s" % (mark, probe, dict(counts)))

for r in rows:
    if r.get("kind") in ("p3a-done", "fatal", "ramp-summary", "hold-summary", "push-summary"):
        print("\n== %s == %s" % (r["kind"], json.dumps({k: v for k, v in r.items() if k not in ("kind", "srv_ts")})[:400]))
