# m2m SFU prototype notes

Goal: prove N-way (3-participant) video through the Cloudflare Realtime SFU and
measure per-directed-pair glass-to-glass latency with the house burned-pixel method
(rig/whep patterns reused: 56-block binary row, rVFC decode, Playwright driver).

## Checkpoint 1 — API verified ✅ (2026-08-25 23:14)

- Read plan.md §2.2 + entire rig/whep/ (NOTES, publish/play.html, server.py, run.mjs, analyze.py).
- Fetched the official OpenAPI spec: `developers.cloudflare.com/realtime/static/realtime-api-2024-05-21.yaml`
  (saved understanding; base `https://rtc.live.cloudflare.com/v1`, bearer auth = app secret).
  Exact flow confirmed:
  - `POST /apps/{appId}/sessions/new` (no body needed) → 201 `{sessionId}`
  - `POST …/sessions/{sid}/tracks/new` body `{sessionDescription:{type:'offer',sdp}, tracks:[{location:'local', mid, trackName}]}`
    → 200 `{sessionDescription:{type:'answer'}, tracks:[{mid,trackName}], requiresImmediateRenegotiation}`
  - pull: `POST …/tracks/new` body `{tracks:[{location:'remote', sessionId:<owner>, trackName}]}`
    → 200 `{requiresImmediateRenegotiation:true, sessionDescription:{type:'offer'}, tracks:[{mid,…}]}`
    → setRemoteDescription(offer), createAnswer, `PUT …/sessions/{sid}/renegotiate`
    body `{sessionDescription:{type:'answer',sdp}}` → `{}`
  - `tracks/close` (PUT) exists; `GET /sessions/{sid}` for state.
- **Credentials LIVE-VERIFIED**: `POST /sessions/new` with `.env` CF_REALTIME_APP_ID/SECRET
  → HTTP 201 + sessionId. No new Cloudflare resources created (used existing app "flabbergaster").
- Battery: 92 % on AC. Port 8897 target (whep rig's server is stopped per its NOTES step 6).

## Plan of record

- `server.py` :8897 — static files (no-store), POST /join → in-memory roster,
  GET /roster, POST /reset, POST /collect → results/m2m-sfu.jsonl, POST /save/<name>
  → artifacts/, and **/cf/* proxy** to the SFU API (keeps the app secret out of the
  pages + sidesteps CORS). In production: roster+signaling = a workers/cues-style
  Durable Object room (see comments in server.py / room.html).
- `room.html?id=X&n=3` — publisher AND subscriber in one page, ONE RTCPeerConnection
  (1 sendonly + N-1 recvonly transceivers). 640x360@30 canvas; binary row = rig/whep
  geometry halved (BLOCK_W 10, ROW_X 20, ROW_Y 50, ROW_H 40 — same relative size as
  the proven 720p rig). Roster poll 2 s; pulls serialized through a promise chain
  (one renegotiation in flight). Per-tile rVFC decode (§4.1: re-arm first, busy
  guard, presentedFrames dedupe), samples tagged {from,to}; getStats every 2 s.
- `run.mjs` — 3 separate persistent contexts (foreground pages, §4.2), unique
  user-data-dirs under the session scratchpad (kill-by-path safe), --headless=new
  channel:chromium + anti-throttling/autoplay flags; playwright 1.60.0 via
  NODE_PATH from the npx cache (chromium-1223 already installed).
- `analyze.py` — per-directed-pair p50/p95/p99, visible-only, checksum-valid-only,
  10 s warmup skip; stats summary incl. qualityLimitationReason.
- Smoke: 2 participants 30 s first. Then 3×120 s main. Stretch: 5 participants.

## Checkpoint 2 — rig built, server up ✅ (2026-08-25 23:25)

- Built server.py / room.html / run.mjs / analyze.py per plan of record.
- 🐛 first proxy call → Cloudflare **error 1010** (bot block on Python-urllib's
  default User-Agent; plain curl passes). Fixed: proxy sends a custom UA.
- Server live on :8897 (background task), `/cf/sessions/new` through the proxy
  → 201 + sessionId. Roster + reset verified.
- No setsid on macOS — server runs as a harness background task instead.
- Next: 2-participant 30 s smoke (IDS=A,B DURATION=30).

## Checkpoint 3 — smoke run ✅ FIRST TRY (2026-08-25 23:27)

- 2 participants, 30 s: full mesh in **4.0 s**, both directions flowing.
- **A→B p50 74.3 / p95 76.0 ms; B→A p50 74.0 / p95 83.2 ms** (n=1355 valid,
  **100 % checksum-valid**, 0 pid mismatches, all visible). Pooled p50 74.2 —
  statistically the same as the WHIP→WHEP baseline 73.6 ms. SFU adds ~nothing.
- qualityLimitation none both encoders; 640x360@30 sustained; jbd/frame 11–16 ms;
  ICE RTT p50 22 ms; 0 packets lost.
- 🐛 CPU sampler returned null: this machine's locale prints ps %CPU as "0,2"
  (comma). Fixed (LC_ALL=C + tolerant regex).
- Results archived → results/m2m-smoke1.jsonl.
- Next: 3-way 120 s main run.

## Checkpoint 4 — 3-way MAIN RUN ✅ (2026-08-25 23:35)

- IDS=A,B,C, 120 s. Full 3×2 mesh in **4.1 s**. All **6/6 directed pairs**
  flowing, **100 % checksum-valid** (n=14 551 valid after warmup), 0 pid
  mismatches, all samples visible-tab.
- Per-pair p50: A→B 88.4 / A→C 81.9 / B→A 104.4 / B→C 105.2 / C→A 108.0 /
  C→B 114.7 ms. Pooled **p50 96.9 / p95 125.0 / p99 164.1 ms** vs 73.6 ms
  WHIP→WHEP baseline → SFU 3-way costs ~+23 ms at p50, same ballpark, no
  TURN/codec investigation warranted. Extra cost sits in the receive jitter
  buffer (jbd/frame 12–35 ms, vs 12–16 in the 2-way smoke) — 3 browsers now
  share the machine, C encoded at 27 fps (rAF contention).
- qualityLimitationReason: **none** on all 3 encoders for the whole run;
  640x360@30 sustained; targetBitrate 1.2–1.7 Mbps.
- CPU per chrome tree (1 encoder + 2 decoders each): **20–26 %** of one core,
  ~850 MB RSS, 6 procs. Machine barely notices.
- One anomaly: A's outgoing stream froze once for 3.1 s (~92 dropped frames,
  seen identically by BOTH receivers → A-side or SFU-side, not per-viewer).
- Results: results/m2m-sfu.jsonl (canonical 3-way). Next: 5-way stretch.

## Checkpoint 5 — 5-way STRETCH ✅ + wrap-up (2026-08-25 23:42)

- IDS=A..E, 120 s. Full 5×4 mesh in **8.0 s**. **20/20 directed pairs**,
  **100 % checksum-valid** (n=51 075), 0 pid mismatches.
- Pooled **p50 91.6 / p95 123.9 / p99 139.7 ms** — no worse than 3-way (96.9).
  Per-pair p50 range 80.0–112.8 ms.
- Where the single-machine bottleneck lands: NOT CPU (per-chrome tree steady
  22–28 % of one core, ~860 MB RSS; qualityLimitation 'cpu' duration = 0 on
  all five encoders) — the first thing to sag is the **canvas rAF loop**
  (encoder fps 23–26 on four of five pages; E held 30). Receivers still
  decoded 100 % valid. Headroom suggests ~8–10 participants before the loop
  degrades badly on this laptop.
- Visual proof: logs/*-final.png (A shows B/C/E/D tiles, burned clocks within
  ~90 ms of A's own canvas). Verbatim SDPs: artifacts/pub-{offer,answer}-*.sdp.
- Files: results/m2m-sfu.jsonl (3-way canonical), m2m-sfu-5way.jsonl,
  m2m-smoke1.jsonl. README.md written (how-to-run + workers/cues mapping).
- Cleanup: server :8897 stopped, stale m2m-udd chromes killed by path, CF
  sessions abandoned (they expire server-side; **no Cloudflare resources
  created** — existing app "flabbergaster" used as-is).
- Machine changes: none (playwright/chromium from caches, no installs).

# SCALE LADDER (scale agent, 2026-08-25)

Goal: find the participant ceiling with two classes — lightweight publishers
(mode=pub: 320x180@15 cheap canvas via ctx.scale(0.5), publish-only, pull
nothing) + 2 full probes ("1","2") that pull ALL N-1 tracks on one PC. Ladder
8→12→16→20, 90 s rungs, STOP-gates: valid<99%, p95>400ms, subscribe failure,
total CPU>900%, pub fps<12. New files: run-scale.mjs (hold+release join storm,
total/sibling CPU), analyze-scale.py (gates + server-log API parse). room.html
gained mode=pub + hold=1 — default behavior unchanged.

## Checkpoint S1 — smoke N=4 ✅ (2026-08-25 20:49)

- Battery 99% AC; sibling v6 agent alive (ffmpeg ~42% + chrome-profile-v6 ~20%
  of one core, collector :8899) — untouched, noted as "sibling" in CPU rows.
- N=4 (2 pub + 2 probe) 30 s: mesh 6.0 s, 100.00% valid on BOTH probes at
  320x180@15 — half-scale row geometry decodes perfectly. Pooled p50 102.6 /
  p95 158.1. Publisher-class pairs run ~+30 ms vs probe-class pairs (15 fps
  frame-interval quantization, by design — compare within-class across rungs).
- Cost: pub ~7% of a core / probe ~30%; API all 2xx (sessions/new p50 237 ms,
  tracks/new p50 313, renegotiate p50 157).
- Data: results/m2m-scale-smoke.jsonl. Next: rung N=8.

## Checkpoint S2 — rung N=8 ✅ PASS (2026-08-25 20:52)

- 6 pub + 2 probe, 90 s. Join storm -> full mesh 8.0 s. 100.00% valid on both
  probes (n=18 348). Pooled p50 108.6 / p95 158.6 / p99 167.4. Per-class: probe
  pairs p50 86-99, pub pairs 111-126 (15 fps quantization as expected).
- API: 8 sessions/new (p50 393 ms), 22 tracks/new (p50 309), 14 renegotiate
  (p50 156) — zero non-2xx in an 8-way simultaneous storm.
- Freezes: E 1x0.27 s, F 2x0.53 s total — both seen IDENTICALLY by both probes
  -> sender/SFU-side, same class as the 3-way run's single 3.1 s freeze.
- CPU total 168-219% of 1200% (ours 86-107%, sibling 4-34%); pubs ~5%/core
  each, probes ~33%; oursRSS 6.4 GB. All gates ok. Data: m2m-scale-N8.jsonl.

## Checkpoint S3 — rung N=12 ✅ PASS (2026-08-25 20:54)

- 10 pub + 2 probe, 90 s. Mesh 8.0 s (same as N=8 — probe pull chain is the
  serializer, ~0.7 s/pull x 11 pulls in parallel across 2 probes). 99.98%
  valid both probes (3 bad decodes each of ~14k). Pooled p50 116.0 / p95 158.3.
- All 12 encoders qlr=none, cpu_limited 0 s; pub fps median 15 throughout.
- API storm: 12 sessions/new p50 306, 34 tracks/new p50 346, 22 renegotiate
  p50 169 — zero non-2xx. Freezes: J 1x0.26 s (both probes -> sender/SFU-side).
- CPU ours 111-137% (probes ~40% each, pubs ~4%), total 178-360% incl.
  sibling spike; oursRSS 9.5 GB. All gates ok -> N=16.

## Checkpoint S4 — rung N=16 ✅ PASS (2026-08-25 20:57)

- 14 pub + 2 probe, 90 s. Mesh 10.1 s. 100.00% valid BOTH probes (n=37 222).
  Pooled p50 116.4 / p95 159.5 / p99 169.9 — flat vs N=8/N=12.
- Probes each pull 15 tracks on ONE PeerConnection: 50% of a core each, all
  15 tiles decode continuously. No renegotiation failures (30 renegotiate,
  46 tracks/new, 16 sessions/new — all 2xx; p50s 170/314/311 ms — API latency
  flat vs N=8, no rate-limit backpressure visible).
- Freezes: H 2x totalling 0.46 s, identical on both probes -> sender/SFU-side.
- CPU ours 150-165% (probes ~50%, pubs ~4%), total <262 of 1200%; oursRSS
  12.7 GB (RAM is the growing cost, not CPU). All gates ok -> N=20.

## Checkpoint S5 — rung N=20 attempt 1: INSTRUMENTATION BUG, not a ceiling (2026-08-25 20:59)

- Media was FINE: both probes held 19/19 tiles decoding (driver live polls,
  window.__state), pub fps med 15 on all 18, CPU total <309 of 1200%, all 96
  API calls 2xx (20 sessions/new p50 502 ms, 58 tracks/new p50 297, 38 renego).
- But the collector saw almost no samples: probe 2 = 0 valid, probe 1 = 197
  -> gate (a) "fired" FALSELY. Cause: navigator.sendBeacon's ~64 KB quota —
  19 tiles x 15 fps x ~250 B ≈ 70 KB/s batch, silently dropped. N=16 batches
  (~56 KB) were just under; every smaller rung was unaffected.
- 🐛 Fixed in room.html: batch flush now uses fetch() (no quota) + a
  __batchStats counter. Rerunning N=20 with valid instrumentation — this rerun
  is attempt 2, not the gate-confirmation rerun (no real gate fired).

## Checkpoint S6 — rung N=20 attempts 2+3 + LADDER COMPLETE ✅ (2026-08-26 00:05)

- Attempt 2: REAL gate-c fire — publisher R's PC never reached connected
  (15 s timeout) during the 20-way join storm. Control plane fine (201 +
  tracks/new answered) — the ICE/DTLS handshake to the edge just never came up.
- Attempt 3 (confirmation rerun): CLEAN PASS. 99.58/99.59% valid (n=47 532),
  pooled p50 112.0 / p95 158.7 / p99 166.9. So the connect failure is an
  INTERMITTENT join-storm flake (1 of 3 twenty-way storms), not a ceiling.
  Production needs a publish-leg retry (recreate session on connect-timeout).
- Two more artifacts in attempt 3: (1) D had ONE 7.3 s burst of checksum
  failures on BOTH probes at contrast 255 — sender-side encoder adaptation
  putting blocks off-grid, self-recovered; (2) ALL 20 sessions/new took a
  uniform 3.34-3.57 s (vs 240-430 ms in the storm 66 s earlier), all still
  201, zero 429s — a fixed ~3 s stall (DNS or edge queueing), not
  per-call rate limiting. Mesh 18.1 s (12.1 s in attempt 1).
- LADDER RESULT: NO durable gate fired through N=20. Per-session pull ceiling
  not found at 19 remote tracks on one PC (plan-m2m §1.A "no upper limit"
  holds this far; ≤64/call batching cap never approached — pulls are 1/call).
  Real growth cost is RAM (~800 MB/Chrome → 15.9 GB at N=20), not CPU
  (ours peaked 190% of 1200%) and not the SFU.
- Freeze ledger across ladder: N8 E 1x0.27s + F 2x0.53s; N12 J 1x0.26s; N16
  H 2x0.46s; N20 G 1x0.26s + Q 1x0.27s — ALL identical on both probes ->
  sender/SFU-side, all <0.6 s total, none at N=4/smoke.
- Cleanup: server :8897 stopped, 0 m2m-udd chromes left, sibling v6 (ffmpeg +
  :8899 + chrome-profile-v6) untouched. CF sessions left to expire server-side
  (30 s track GC / session timeout) — zero new CF resources created.
- Data: m2m-scale-{smoke,N8,N12,N16,N20}.jsonl + N20-attempt{1,2} forensics;
  logs/server-N*.log hold every CF call. New files: run-scale.mjs,
  analyze-scale.py; room.html gained mode=pub/hold=1 + fetch batching (was
  sendBeacon — 64 KB quota bug, checkpoint S5).
