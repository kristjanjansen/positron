#!/usr/bin/env python3
# Analyzer for RUNBOOK §13 multi-publisher rungs: results/moq-mgrid-<name>.jsonl
# Usage: mgrid-analyze.py <file> [--warmup 5] [--window t0 t1]
import json, sys, statistics as st

path = sys.argv[1]
warmup = 5.0
if "--warmup" in sys.argv:
    warmup = float(sys.argv[sys.argv.index("--warmup") + 1])

rows = []
for line in open(path):
    line = line.strip()
    if line:
        try:
            rows.append(json.loads(line))
        except Exception:
            pass

def pct(v, p):
    if not v: return float("nan")
    s = sorted(v)
    i = min(len(s) - 1, int(round(p / 100 * (len(s) - 1))))
    return s[i]

# per (pub) pooled over both probes; deltas per pub per probe with per-pub-probe warmup
frames = {}   # (pub,pr) -> [(t,d)]
for r in rows:
    if r.get("k") == "f":
        frames.setdefault((r["pub"], r.get("pr", "?")), []).append((r["t"], r["d"]))

pubstats = {}  # pub -> list of deltas (warm)
for (pub, pr), fl in frames.items():
    fl.sort()
    t0 = fl[0][0] + warmup * 1000
    warm = [d for (t, d) in fl if t >= t0]
    pubstats.setdefault(pub, []).extend(warm)

rf = {}
derr = {}
for r in rows:
    if r.get("k") == "ps":
        key = (r["pub"], r.get("pr", "?"))
        rf.setdefault(key, 0)
        rf[key] = max(rf[key], r.get("rf", 0))
        derr.setdefault(key, 0)
        derr[key] = max(derr[key], r.get("derr", 0))

races = [r for r in rows if r.get("k") == "race"]
closes = [r for r in rows if r.get("k") == "close"]
silents = [r for r in rows if r.get("k") == "silent"]
sess = [r for r in rows if r.get("k") == "sess"]
firsts = [r for r in rows if r.get("k") == "first"]
recon = [r for r in rows if r.get("k") == "connclosed"]

print(f"file={path} warmup={warmup}s")
print(f"{'pub':>5} {'n':>7} {'p50':>7} {'p90':>7} {'p95':>7} {'p99':>7} {'max':>8} {'rowFail':>7} {'valid%':>7}")
allw = []
p50s, p95s = {}, {}
for pub in sorted(pubstats, key=lambda x: (x[0], int(x[1:]) if x[1:].isdigit() else 0)):
    w = pubstats[pub]
    allw.extend(w)
    rfp = sum(v for (p, pr), v in rf.items() if p == pub)
    n = len(w)
    valid = 100.0 * n / (n + rfp) if (n + rfp) else 0
    if w:
        p50s[pub] = pct(w, 50); p95s[pub] = pct(w, 95)
        print(f"{pub:>5} {n:>7} {pct(w,50):>7.1f} {pct(w,90):>7.1f} {pct(w,95):>7.1f} {pct(w,99):>7.1f} {max(w):>8.1f} {rfp:>7} {valid:>7.2f}")
    else:
        print(f"{pub:>5} {n:>7} {'--':>7} {'--':>7} {'--':>7} {'--':>7} {'--':>8} {rfp:>7} {valid:>7.2f}")
print("-" * 70)
if allw:
    print(f"POOLED n={len(allw)} p50={pct(allw,50):.1f} p90={pct(allw,90):.1f} p95={pct(allw,95):.1f} p99={pct(allw,99):.1f} max={max(allw):.1f}")
if p50s:
    print(f"SPREAD p50: min={min(p50s.values()):.1f} max={max(p50s.values()):.1f} (worst={max(p50s,key=p50s.get)}); p95 worst={max(p95s.values()):.1f} ({max(p95s,key=p95s.get)})")
tot_rf = sum(rf.values())
tot_derr = sum(derr.values())
tot_f = sum(len(v) for v in frames.values())
print(f"TOTAL frames(valid rows)={tot_f} rowFail={tot_rf} validity={100.0*tot_f/(tot_f+tot_rf) if tot_f+tot_rf else 0:.3f}% decodeErrors={tot_derr}")
print(f"EVENTS races={len(races)} (catalog={sum(1 for r in races if r.get('phase')=='catalog')}, video={sum(1 for r in races if r.get('phase')=='video')}) closes={len(closes)} silents={len(silents)} sessErrs={len(sess)} connClosed={len(recon)}")
if races:
    by = {}
    for r in races:
        by[(r["pub"], r.get("phase"))] = by.get((r["pub"], r.get("phase")), 0) + 1
    print("  races by pub/phase:", dict(sorted(by.items())))
# discovery chain (seen -> cat -> first) per pub/probe
seen = {(r["pub"], r.get("pr")): r["t"] for r in rows if r.get("k") == "seen"}
cat = {}
for r in rows:
    if r.get("k") == "cat":
        cat.setdefault((r["pub"], r.get("pr")), r["t"])
fst = {}
for r in rows:
    if r.get("k") == "first":
        fst.setdefault((r["pub"], r.get("pr")), r["t"])
joins = []
for key, t in seen.items():
    if key in fst:
        joins.append(fst[key] - t)
if joins:
    print(f"JOIN seen->first ms: p50={pct(joins,50):.0f} max={max(joins):.0f} n={len(joins)}")
