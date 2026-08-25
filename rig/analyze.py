#!/usr/bin/env python3
"""Align player telemetry with chaos markers and report recovery per interruption."""
import json, sys, statistics as st
from collections import defaultdict

PATH = sys.argv[1] if len(sys.argv) > 1 else "results/resilience.jsonl"
rows = [json.loads(l) for l in open(PATH)]
player = [r for r in rows if r["kind"] == "player"]
chaos = [r for r in rows if r["kind"] == "chaos"]

if not player:
    print("no player telemetry"); raise SystemExit(1)

# ---- interruption recovery -------------------------------------------------
downs = [c for c in chaos if c["event"] == "ingest_down"]
ups = [c for c in chaos if c["event"] == "ingest_up"]
vids = {c["ts"]: c for c in chaos if c["event"] in ("new_video", "same_video")}

print(f"{'gap':>5} {'broadcast':>10} {'recovery':>9} {'stalled':>8} {'lat after':>10} "
      f"{'resyncs':>8} {'fatal':>6}")
print("-" * 62)

results = []
for d in downs:
    gap = d.get("detail", "").replace("gap=", "")
    up = next((u for u in ups if u["ts"] > d["ts"]), None)
    if not up:
        continue
    kind = next((v for t, v in vids.items() if t > d["ts"]), None)
    kindtxt = "NEW video" if kind and kind["event"] == "new_video" else "same"

    nxt = next((x["ts"] for x in downs if x["ts"] > up["ts"]), float("inf"))
    after = [p for p in player if up["ts"] <= p["ts"] < nxt]
    if not after:
        print(f"{gap:>5} {'?':>10} {'NO DATA':>9}  (tab dead?)")
        continue
    # recovered = currentTime advancing again for 3 consecutive samples
    rec_t = None
    run = 0
    for p in after:
        run = run + 1 if p.get("advancing") else 0
        if run >= 3:
            rec_t = p["ts"] - up["ts"]
            break
    window = [p for p in after if p["ts"] <= up["ts"] + 45]
    max_stall = max((p.get("stalledMs", 0) for p in window), default=0) / 1000
    settled = [p for p in after if up["ts"] + 15 <= p["ts"] <= up["ts"] + 40
               and p.get("latency")]
    lat = st.median([p["latency"] for p in settled]) if settled else None
    r0 = window[0].get("resyncs", 0) if window else 0
    r1 = window[-1].get("resyncs", 0) if window else 0
    f0 = window[0].get("fatals", 0) if window else 0
    f1 = window[-1].get("fatals", 0) if window else 0

    rec = f"{rec_t:.1f}s" if rec_t is not None else "NEVER"
    latxt = f"{lat:.2f}s" if lat else "—"
    print(f"{gap:>5} {kindtxt:>10} {rec:>9} {max_stall:>7.1f}s {latxt:>10} "
          f"{r1-r0:>8} {f1-f0:>6}")
    results.append(dict(gap=gap, kind=kindtxt, recovery=rec_t, stall=max_stall,
                        lat=lat, fatal=f1 - f0))

never = [r for r in results if r["recovery"] is None]
print()
print(f"interruptions: {len(results)}   recovered: {len(results)-len(never)}   "
      f"failed: {len(never)}")
if results:
    ok = [r for r in results if r["recovery"] is not None]
    if ok:
        print(f"recovery time: median {st.median([r['recovery'] for r in ok]):.1f}s  "
              f"max {max(r['recovery'] for r in ok):.1f}s")

# ---- error tally -----------------------------------------------------------
errs = defaultdict(int)
for p in player:
    for e in p.get("newErrors", []):
        errs[("FATAL " if e.get("fatal") else "warn ") + e.get("details", "?")] += 1
if errs:
    print("\nerrors seen:")
    for k, v in sorted(errs.items(), key=lambda x: -x[1]):
        print(f"  {v:4d}  {k}")
