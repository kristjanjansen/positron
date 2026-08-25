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
