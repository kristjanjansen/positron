# Part-2-late mystery — encoder vs Cloudflare segmenter

Agent notes, checkpointed after every step. Owner: NEW dedicated live input (provisioned this
session, deleted at end) + `rig/push-part2.sh` (derived from push-llhls.sh, arm knobs).
Do-not-touch: inputs `4c93bc4b…`, `5cfa5053…`, `224558e8…`, ports 8897/8899/8900. My port: 8898.

## The mystery (from EDGE-LAG-NOTES.md, replicated twice)
2 s segment / 0.5 s parts: **part 2 publishes ~600 ms later than parts 0/1/3**
(p50 ≈1400 vs ≈800 ms); segment back half often lands as one burst with segment finalize.
Encoder (x264/-re pacing) or CF segmenter?

## Design
- Reproduce per-part-index signature from existing results/edge-lag-blocking-{1,2}.jsonl.
- Decisive probe: tee the SAME encode to (a) rtmps CF and (b) a local FLV-parsing tap
  (port 8898) that logs wall-time vs tag DTS — shows whether bytes for part-2's media
  window [1.0,1.5)s leave the encoder late. Encoder-side cause ⇒ visible at the tap.
- Arms (each ~n=70 parts via edge-lag-blocking.py, sntp-bracketed):
  - ARM0 baseline = current push-llhls.sh settings (already `-tune zerolatency`, g60) + tap
  - ARM1 `-g 15` (keyframe = 1 part) — does the late part move with GOP structure?
  - ARM2 no zerolatency (default lookahead/mbtree, keep -bf 0) — does the pattern change?
  - ARM3 optional: -an (audio interleave as CF gating signal)
- Verdict rule: pattern identical across arms AND tap shows on-time bytes ⇒ CF segmenter.
  Pattern moves with a knob / tap shows late bytes ⇒ encoder, name the knob.

## Checkpoints

- [start] Context read (plan.md §1, EDGE-LAG-NOTES.md, edge-lag-blocking.py, push-llhls.sh).
  Note: baseline ALREADY has `-tune zerolatency` (⇒ rc-lookahead=0, sync-lookahead=0,
  sliced-threads, no mbtree, bf=0) — dispatch arm A is moot; replaced with its inverse (ARM2).
  Next: per-part-index analysis of existing runs; env checks.
- [env] AC power 92% charging. sntp +0.0295 ± 0.024 (clock +30 ms fast). /tmp/li_{uid,key}.txt
  present but belong to input 4c93bc4b — NOT reused.
- [signature ✅ reproduced from existing data] Wrote `rig/part2-analyze.py`. Both prior runs:
  | part | run1 n/p50 | run2 n/p50 |
  |---|---|---|
  | 0 | 23 / 893 ms | 22 / 872 ms |
  | 1 | 23 / 858 ms | 22 / 849 ms |
  | 2 | 13 / **1469 ms** | 14 / **1454 ms** |
  | 3 | 11 / 827 ms | 12 / 900 ms |
  Key extra fact: **block_ms for part 2 is p50 ≈ 1120 ms in both runs vs ≈ 410 ms for parts
  0/1/3** — the EDGE holds the part-2 request ~0.7 s longer than the part cadence. So the gap
  is between part 1's publish and part 2's publish, not measurement noise. Parts 2/3
  undersampled (hint skips = burst publishes), part 1 has a fat p95 tail (1.99–2.25 s) —
  consistent with "back half lands with segment finalize".
  Next: provision my own preferLowLatency input.
- [input] Provisioned `a2348b2bb17f1b7ff1ba19a693f2adb8` (part2-rig, preferLowLatency=true,
  timeoutSeconds=10); uid/key in scratchpad (`p2_uid.txt`/`p2_key.txt`, 600). To be DELETED
  at teardown. Built `rig/push-part2.sh` (arm knobs GOP/TUNE/TAP/AUDIO; tee = same encode →
  CF rtmps + local FLV tap), `rig/part2-flv-tap.py` (port 8898, logs wall-time per FLV tag),
  `rig/part2-tap-analyze.py`. Minimal edit to `edge-lag-blocking.py`: UID overridable via
  env `EDGE_LAG_UID` (fallback unchanged).
- [smoke N=8 ✅] Manifest LL tags present on my input; blocking works (block p50 420 ms);
  mild part-2 excess in the 2 sampled segments (~+130 ms). Tap receiving tags.
- [ARM0 BASELINE ✅ N=70] sntp pre +0.0173 post +0.0130. 70/70 http=200, contains all.
  **Anomaly REPRODUCED on a fresh input, but the late region MOVED: this broadcast has
  parts 1 AND 2 late** (p50 1526 / 1563 ms) vs parts 0/3 normal (880 / 913 ms); block_ms
  p50: part0 394, part1 1080, part2 1174, part3 395. So it is a mid-segment publish stall
  (position varies per broadcast: prior broadcast part 2 only; this one parts 1–2), back
  half catching up by segment finalize. → results/part2-baseline.jsonl.
- [TAP VERDICT ✅ decisive, conn 1 = baseline] `results/part2-tap.jsonl`: 4388 video tags,
  lateness vs -re schedule p5/p50/p95 = −11/0/+12 ms, max 23 ms; inter-tag gaps p99 51 ms,
  max 61 ms, ZERO >100 ms in 4085; per-GOP-offset buckets FLAT (p50 lateness 0/0/0/0 for
  windows 0–3). **The encoder emits every part's bytes exactly on schedule** while the edge
  publishes mid-segment parts 600–700 ms late. Tee shares the write path with the rtmps leg,
  so CF socket backpressure would have shown here too — none did.
- [SEND-Q PROBE ✅] 80 samples/20 s of the CF rtmps socket Send-Q: 0–28 KB (≈1 video frame
  in transit), no accumulation. A 600 ms CF read-stall would pool ~230 KB at 3 Mbps —
  absent. ⚠️ inferred: CF's app-level read could still lag behind its TCP stack's rcv
  buffer; but encoder + local network + TCP path are all exonerated ✅.
  Next: ARM1 GOP=15 (keyframe per part), then ARM2 TUNE=none (lookahead/mbtree/frame
  threads back on) — if the per-part stall persists unchanged, CF segmenter is the verdict.
- [burst shape] Request-sequence view of baseline: per segment, front part(s) arrive on
  0.4–0.5 s cadence, then ONE mid-segment hold of 0.9–1.75 s, then the segment's remainder
  (+finalize, often + next segment's part 0) in a single playlist write. Hold position
  varies segment-to-segment within one broadcast (after part 0, 1 or 2) and its typical
  position varies per broadcast (prior broadcast: consistently after part 1 → "part 2
  late"). Looks like a periodic publish/flush cycle in CF's pipeline beating against the
  part cadence, not a per-part-index rule.
- [ARM1 GOP=15 ✅ N=70] Keyframe on EVERY part boundary (all parts independent). sntp pre
  +0.0133 post +0.0127. Per-part p50: part0 915, part1 925, **part2 1431**, part3 948 ms;
  block_ms p50 395/466/991/381. **Anomaly unchanged** — GOP/keyframe structure is NOT the
  knob. Tap (conn 2): lateness max 16 ms, zero gaps >53 ms — encoder still perfectly paced.
  → results/part2-g15.jsonl.
  Next: ARM2 TUNE=none (lookahead/mbtree/frame-threads restored, -bf 0 kept).
- [periodicity ✅] Burst publishes (block_ms>800) recur with inter-burst gap p50 2.00–2.06 s
  in prior run 1, my baseline, and ARM1 — exactly one hold+release per 2 s segment, phase
  differs per broadcast. A per-segment hold-and-release cycle in CF's publishing pipeline.
- [ARM2 TUNE=none ✅ N=70] Lookahead (rc/sync), mbtree, frame-threads all restored
  (-bf 0 kept, LL-HLS requires it). sntp pre +0.0128 post +0.0108. Per-part p50:
  part0 904, **part1 1476, part2 1457**, part3 937 ms; block_ms p50 389/1158/1130/402.
  **Anomaly unchanged.** Tap (conn 3): lateness max 6 ms, zero gaps >45 ms — even with
  frame-threading the mux output is frame-paced. → results/part2-notune.jsonl.

## VERDICT — Cloudflare's segmenter/publishing pipeline, not the encoder ✅

Per-part-index p50 raw_lag (ms; per-part deltas are clock-offset-immune):

| arm | encoder knobs | broadcast | p0 | p1 | p2 | p3 |
|---|---|---|---|---|---|---|
| prior run 1 | zerolatency g60 | 4c93… bcast 4 | 893 | 858 | **1469** | 827 |
| prior run 2 | zerolatency g60 | 4c93… bcast 4 | 872 | 849 | **1454** | 900 |
| ARM0 baseline | zerolatency g60 | a234… bcast 1 | 880 | **1526** | **1563** | 913 |
| ARM1 | zerolatency **g15** (IDR/part) | a234… bcast 2 | 915 | 925 | **1431** | 948 |
| ARM2 | **no tune** (lookahead+mbtree+frame-threads) | a234… bcast 3 | 904 | **1476** | **1457** | 937 |

Evidence chain:
1. ✅ Encoder exonerated DIRECTLY: FLV tap on the same tee'd encode shows every frame's
   bytes leave the muxer within ±23 ms (ARM0) / ±16 ms (ARM1) / ±9 ms (ARM2) of the -re
   schedule; ZERO inter-tag gaps >61 ms across ~11.7k gaps; per-part-window buckets flat.
2. ✅ Local network/TCP exonerated: CF rtmps socket Send-Q sampled 80× during streaming:
   0–28 KB (≈1 frame in flight), no accumulation (a 600 ms CF read-stall would pool
   ~230 KB at 3 Mbps). ⚠️ CF app-read vs TCP-stack read not distinguishable from here.
3. ✅ Anomaly present and same-shaped in ALL arms incl. keyframe-per-part and full-lookahead
   — no x264 structural knob moves it.
4. ✅ Shape: once per 2 s segment (inter-burst gap p50 2.00–2.06 s) the playlist stops
   advancing for ~0.9–1.75 s mid-segment, then the segment's back half + finalize (often +
   next part 0) publish in ONE playlist write. The hold's position within the segment
   varies per broadcast (prior bcast: after part 1 ⇒ "part 2 late"; my bcasts: after
   part 0/1 varying) — so "part 2" was never special; it is a per-segment publish/flush
   cycle in CF's pipeline whose phase is set at broadcast start.

Practical implication (⚠️ inferred, not player-measured): the mid-segment hold means the
newest part at the edge is 0.8–2.0 s old depending on cycle phase; a stall-free LL-HLS
player must ride the ~p95 (~2.0 s) not the p50 (~0.84 s). That is consistent with the
tuned player settling at 2.4–2.5 s and explains why it cannot do materially better on
this stream; part-level p50 metrics alone overstate the achievable latency.

- [teardown ✅] Encoder killed via `pkill -f "live/.*93f2adb8"` (my key only), tap via
  `pkill -f part2-flv-tap.py`; port 8898 verified free; no sibling encoders were running.
  Live input `a2348b2bb17f1b7ff1ba19a693f2adb8` DELETE http 200, verify-GET error 10003
  (not found) ✅. Scratchpad key file removed. sntp final +0.0124 ± 0.024. Battery 96% AC
  throughout. `/tmp/li_{uid,key}.txt` (input 4c93bc4b) untouched.

## Files
- `rig/push-part2.sh` — arm-knob encoder (GOP/TUNE/TAP/AUDIO), tee → CF + local FLV tap.
- `rig/part2-flv-tap.py` — FLV-over-TCP tap (wall-time per tag), port 8898.
- `rig/part2-analyze.py`, `rig/part2-tap-analyze.py` — per-part / tap analyses.
- `rig/edge-lag-blocking.py` — one minimal edit: UID overridable via env EDGE_LAG_UID.
- `results/part2-baseline.jsonl`, `part2-g15.jsonl`, `part2-notune.jsonl` — 70 rows each.
- `results/part2-tap.jsonl` — FLV tap rows; conn 1=ARM0, 2=ARM1, 3=ARM2.
- Scratchpad: p2_run_*.log, p2_sntp_*.txt, p2_push*.log.
