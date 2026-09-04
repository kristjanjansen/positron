#!/usr/bin/env python3
"""Analyze results/m2m-sfu.jsonl (or argv[1]) — per-DIRECTED-PAIR latency.

Filters (rig/whep/analyze.py discipline): visible-tab samples only (plan §4.2),
checksum-valid decodes only, per-pair warmup skip (argv[2], default 10 s from
that pair's first sample — pairs come up at different times as the mesh builds).
"""
import json
import sys
import statistics as st
from collections import defaultdict

PATH = sys.argv[1] if len(sys.argv) > 1 else "/Users/s32863/personal/positron/results/m2m-sfu.jsonl"
WARMUP_S = float(sys.argv[2]) if len(sys.argv) > 2 else 10.0

samples, stats_rows, events, cpu_rows, mesh_rows = [], [], [], [], []
with open(PATH) as f:
    for line in f:
        try:
            o = json.loads(line)
        except ValueError:
            continue
        k = o.get("kind")
        if k == "sample":
            samples.append(o)
        elif k == "stats":
            stats_rows.append(o)
        elif k == "event":
            events.append(o)
        elif k == "cpu":
            cpu_rows.append(o)
        elif k == "mesh":
            mesh_rows.append(o)


def pct(vals, p):
    if not vals:
        return float("nan")
    s = sorted(vals)
    return s[min(len(s) - 1, int(round(p / 100 * (len(s) - 1))))]


print(f"== file: {PATH}  (warmup {WARMUP_S:.0f}s per pair) ==")
for m in mesh_rows:
    print(f"  mesh complete: ids={m.get('ids')} in {m.get('meshMs')} ms")

print(f"\n== events ({len(events)}) ==")
counts = defaultdict(int)
for e in events:
    counts[(e.get("who"), e.get("name"), e.get("state") or e.get("from") or "")] += 1
for (who, name, extra), n in sorted(counts.items(), key=lambda x: str(x[0])):
    print(f"  {who} {name} {extra}: x{n}")
for e in events:
    if e.get("name") in ("fatal", "pull-failed", "ontrack-unmapped"):
        print(f"  !! {e}")

if not samples:
    print("\nNO SAMPLES")
    sys.exit(0)

pairs = defaultdict(list)
for s in samples:
    pairs[(s.get("from"), s.get("to"))].append(s)

print(f"\n== per-directed-pair glass-to-glass (burned px -> expectedDisplayTime) ==")
print(f"  {'pair':>7} {'n_raw':>6} {'vis':>6} {'valid':>6} {'ok%':>6} {'pidBad':>6} "
      f"{'p50':>7} {'p95':>7} {'p99':>7} {'min':>6} {'max':>7}")
all_lat = []
for (frm, to), rows in sorted(pairs.items()):
    t_first = min(r["t"] for r in rows)
    vis = [r for r in rows if r.get("vis") == "visible"]
    warm = [r for r in vis if r["t"] - t_first > WARMUP_S * 1000]
    valid = [r for r in warm if r.get("decOk")]
    pid_bad = sum(1 for r in valid if r.get("pidOk") is False)
    lat = [r["latencyMs"] for r in valid if "latencyMs" in r and r.get("pidOk") is not False]
    all_lat.extend(lat)
    okpct = 100.0 * len(valid) / len(warm) if warm else float("nan")
    if lat:
        print(f"  {frm}->{to:>4} {len(rows):>6} {len(vis):>6} {len(valid):>6} {okpct:>5.1f}% {pid_bad:>6} "
              f"{pct(lat,50):>7.1f} {pct(lat,95):>7.1f} {pct(lat,99):>7.1f} {min(lat):>6.1f} {max(lat):>7.1f}")
    else:
        print(f"  {frm}->{to:>4} {len(rows):>6} {len(vis):>6} {len(valid):>6} {okpct:>5.1f}% {pid_bad:>6}  NO VALID LATENCY")
    why = defaultdict(int)
    for r in warm:
        if not r.get("decOk"):
            why[r.get("decWhy")] += 1
    if why:
        print(f"          decode failures: {dict(why)}")

if all_lat:
    print(f"\n  ALL pairs pooled: n={len(all_lat)} p50={pct(all_lat,50):.1f} "
          f"p95={pct(all_lat,95):.1f} p99={pct(all_lat,99):.1f} ms")
    print(f"  (WHIP->WHEP baseline, plan §2.2: p50 73.6 / p95 83.1 ms)")

# ---- getStats ---------------------------------------------------------------
by_who = defaultdict(list)
for r in stats_rows:
    by_who[r.get("who")].append(r)

print(f"\n== outbound (encoder) per participant ==")
for who, rows in sorted(by_who.items()):
    last = rows[-1]
    qlr = set(r.get("qualityLimitationReason") for r in rows if r.get("qualityLimitationReason"))
    qld = last.get("qualityLimitationDurations")
    rtts = [r["rtt"] * 1000 for r in rows if r.get("rtt") is not None]
    rtt_s = f" iceRTT p50={pct(rtts,50):.0f}ms" if rtts else ""
    print(f"  {who}: framesEncoded={last.get('framesEncoded')} fps={last.get('fps')} "
          f"out={last.get('outWidth')}x{last.get('outHeight')} target={last.get('targetBitrate')} "
          f"qlReasons={sorted(qlr)} qlDurations={qld}{rtt_s}")

print(f"\n== inbound per directed pair (from stats.inbound) ==")
for who, rows in sorted(by_who.items()):
    per_from = defaultdict(list)
    for r in rows:
        for ib in r.get("inbound", []):
            per_from[ib.get("from")].append(ib)
    for frm, ibs in sorted(per_from.items()):
        a, b = ibs[0], ibs[-1]
        jbd = None
        if b.get("jitterBufferEmittedCount") and a.get("jitterBufferEmittedCount") is not None:
            de = b["jitterBufferEmittedCount"] - a["jitterBufferEmittedCount"]
            if de > 0:
                jbd = (b.get("jitterBufferDelay", 0) - a.get("jitterBufferDelay", 0)) / de * 1000
        print(f"  {frm}->{who}: framesDecoded={b.get('framesDecoded')} dropped={b.get('framesDropped')} "
              f"recv={b.get('frameWidth')}x{b.get('frameHeight')} fps={b.get('fps')} "
              f"freezes={b.get('freezeCount')}({b.get('totalFreezesDuration')}s) "
              f"lost={b.get('packetsLost')} nack={b.get('nackCount')} pli={b.get('pliCount')}"
              + (f" jbd/frame={jbd:.1f}ms" if jbd is not None else ""))

if cpu_rows:
    print(f"\n== per-participant chrome CPU (ps, whole process tree) ==")
    for c in cpu_rows:
        print(f"  {c.get('cpu')}")
