#!/usr/bin/env python3
"""Analyze results/whep.jsonl. Filters: visible-tab samples only (plan §4.2),
checksum-valid decodes only. Optionally skip the first WARMUP seconds."""
import json
import sys
import statistics as st

PATH = "/Users/s32863/personal/positron/results/whep.jsonl"
WARMUP_S = float(sys.argv[1]) if len(sys.argv) > 1 else 10.0

samples, play_stats, pub_stats, events = [], [], [], []
with open(PATH) as f:
    for line in f:
        try:
            o = json.loads(line)
        except ValueError:
            continue
        k = o.get("kind")
        if k == "sample":
            samples.append(o)
        elif k == "play-stats":
            play_stats.append(o)
        elif k == "pub-stats":
            pub_stats.append(o)
        elif k == "event":
            events.append(o)


def pct(vals, p):
    if not vals:
        return float("nan")
    s = sorted(vals)
    i = min(len(s) - 1, int(round(p / 100 * (len(s) - 1))))
    return s[i]


def summarize(name, vals, unit="ms"):
    if not vals:
        print(f"  {name}: NO DATA")
        return
    print(f"  {name}: n={len(vals)} p50={pct(vals,50):.1f} p95={pct(vals,95):.1f} "
          f"p99={pct(vals,99):.1f} min={min(vals):.1f} max={max(vals):.1f} "
          f"mean={st.mean(vals):.1f} {unit}")


print(f"== events ({len(events)}) ==")
for e in events:
    keys = {k: v for k, v in e.items() if k not in ("kind", "t", "srv_ts")}
    print(f"  {keys}")

if not samples:
    print("NO SAMPLES")
    sys.exit(0)

t_first = min(s["t"] for s in samples)
vis = [s for s in samples if s.get("vis") == "visible"]
hidden = len(samples) - len(vis)
warm = [s for s in vis if s["t"] - t_first > WARMUP_S * 1000]
valid = [s for s in warm if s.get("decOk")]

print(f"\n== samples ==")
print(f"  total={len(samples)} visible={len(vis)} hidden-dropped={hidden} "
      f"after-{WARMUP_S:.0f}s-warmup={len(warm)} checksum-valid={len(valid)}")
why = {}
for s in warm:
    if not s.get("decOk"):
        why[s.get("decWhy")] = why.get(s.get("decWhy"), 0) + 1
if why:
    print(f"  decode failures: {why}")

lat = [s["latencyMs"] for s in valid if "latencyMs" in s]
print("\n== glass-to-glass (burned ts -> expectedDisplayTime), visible+valid ==")
summarize("latency", lat)

ct = [s for s in warm if s.get("captureTime") is not None]
print(f"\n== abs-capture-time ==")
print(f"  samples with metadata.captureTime: {len(ct)} / {len(warm)}")
if ct:
    summarize("captureTime->display", [s["captureToDisplayMs"] for s in ct if "captureToDisplayMs" in s])
rt = [s["receiveToDisplayMs"] for s in warm if s.get("receiveToDisplayMs") is not None]
summarize("receiveTime->display", rt)

if play_stats:
    print("\n== play getStats ==")
    last = play_stats[-1]
    d_jbd = None
    if len(play_stats) >= 2:
        a, b = play_stats[0], play_stats[-1]
        if b.get("jitterBufferEmittedCount") and a.get("jitterBufferEmittedCount") is not None:
            de = b["jitterBufferEmittedCount"] - a["jitterBufferEmittedCount"]
            dd = (b.get("jitterBufferDelay", 0) - a.get("jitterBufferDelay", 0))
            if de > 0:
                d_jbd = dd / de * 1000
    for k in ("framesDecoded", "framesDropped", "framesReceived", "packetsLost", "nackCount",
              "pliCount", "freezeCount", "totalFreezesDuration", "frameWidth", "frameHeight",
              "decoderImplementation", "fps"):
        if k in last:
            print(f"  {k}: {last[k]}")
    if d_jbd is not None:
        print(f"  jitterBufferDelay per emitted frame (run avg): {d_jbd:.1f} ms")
    rtts = [p["rtt"] * 1000 for p in play_stats if p.get("rtt") is not None]
    summarize("play ICE rtt", rtts)

if pub_stats:
    print("\n== pub getStats ==")
    last = pub_stats[-1]
    for k in ("framesEncoded", "framesSent", "fps", "qualityLimitationReason",
              "encoderImplementation", "targetBitrate"):
        if k in last:
            print(f"  {k}: {last[k]}")
    rtts = [p["rtt"] * 1000 for p in pub_stats if p.get("rtt") is not None]
    summarize("pub ICE rtt", rtts)
