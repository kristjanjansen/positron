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

# HEAVY MEDIA (heavy-media agent, 2026-08-26)

Goal: make the load real — audio+video per participant (grid has NEVER carried
audio), show-quality video (640x360@30 ~1.2 Mbps hint=motion), 720p featured
tiles, then a new max-N past 20 using multi-page-per-Chrome to beat the
~800 MB/Chrome RAM wall. New files: run-heavy.mjs, analyze-heavy.py; room.html
gains audio=1 (WebAudio oscillator, distinct tone per pid, verified by probe
AnalyserNode) + vw/vh/vfps/kbps/hint/cls params — all default-off, video-only
behavior byte-identical. Port 8897, results/m2m-heavy-*.jsonl. Deterministic
audio trackName "audio-<pid>" so server.py stays untouched (sibling-safe).
STOP gates: valid<99%, video p95>400 ms, audio concealment>5%, track fails to
flow, RAM free<3 GB, CPU>75% total (900% of 1200%).

## Checkpoint H0 — baseline ✅ (2026-08-26 00:20)

- Battery 100% AC. Ports 8896 (churn sibling) + 8897 both free; NO sibling
  chromes/ffmpeg running yet (churn agent not started) — will re-sample CPU
  before every rung and attribute any non-ours chrome as "other".
- RAM: 34.36 GB physical, ~14.3 GB available (free+inactive+spec+purgeable).
- Prior-ladder baseline for comparison (video-only N=8, m2m-scale-N8.jsonl):
  pooled p50 108.6 / p95 158.6, valid 100.00%, probes ~33%/core.

## Checkpoint H1 — audio plumbing smoke N=4 ✅ FIRST TRY (2026-08-26 02:54)

- room.html extended: audio=1 publishes a WebAudio oscillator (sine, unique
  40 Hz-spaced tone per pid via toneFor(), gain 0.05, MediaStreamAudioDestination
  — NO getUserMedia); full-mode pages pull audio+video in ONE tracks/new call
  (deterministic "audio-<pid>" trackName — server.py untouched) and verify
  per-sender arrival with an AnalyserNode FFT peak (±25 Hz). vw/vh/vfps/kbps/
  hint/cls params added for heavier video classes. Defaults unchanged.
- Chrome quirk pre-empted: remote WebRTC audio only feeds WebAudio if also
  attached to a media element — muted <audio> el per remote track.
- N=4 (2 probe + 2 light pub, all publishing A+V) 30 s: full A/V mesh 8.0 s,
  **6/6 tone pairs 100% FFT match** (seen Hz within 2 of expected, −40 dB),
  video 100.00% valid both probes, **audio concealment 0.00%** both probes
  (0 of 4.32 M samples), 0 packets lost, audio jbd/sample 62–84 ms (NetEq
  normal). Video latency same class as video-only ladder. API 21 calls all 2xx.
- Audio+video pull in one call works: 2 mids per pull response, both mapped
  before setRemoteDescription. One renegotiation covers both. Cost of audio at
  this scale: probe 34%/core vs ~30–33% video-only — noise-level.
- Data: m2m-heavy-smoke.jsonl. Next: Step 1 rung N=8 A/V (30 s smoke + 90 s).

## Checkpoint H2 — Step 1: N=8 AUDIO+VIDEO ✅ PASS (2026-08-26 02:59)

- 30 s smoke then 90 s main, 6 light pubs + 2 probes, ALL publishing A+V,
  probes pulling BOTH tracks from every remote (14 A + 14 V directed pairs).
- **A/V both flow on ALL pairs**: video 100.00% checksum-valid on both probes
  (n=18 154); audio 14/14 tone pairs at 100% FFT match (every seen Hz within
  3 Hz of expected).
- **Video latency vs video-only baseline** (m2m-scale-N8 p50 108.6/p95 158.6):
  pooled p50 122.7 / p95 163.1 — audio costs ~+14 ms p50 / +5 ms p95. Same
  class; jitter buffer absorbing the extra SSRC muxing, not a regression gate.
- **Audio health**: pooled concealment 0.24% both probes (gate 5%); audio
  jbd/sample 59–75 ms (NetEq normal); loss confined to ONE shared burst
  (~23 packets on pairs from 2,C,D seen by both probes — same-uplink event).
- Anomaly ledger: sender/SFU-side video freezes GREW vs video-only ladder —
  A/C/D/E each 1–2 freezes totalling 3.1–3.8 s (ladder N8: ≤0.53 s), all seen
  identically by both probes, all outside the valid% window (100.00% kept).
  Cumulative counters include mesh phase; flagged to watch at heavier rungs.
- Cost: probes 37–39%/core (vs ~33 video-only), pubs ~6%/core (vs ~5), ours
  RSS 7.2 GB, total CPU ≤204/1200%. API: 44 calls, zero non-2xx; A+V pull in
  one tracks/new keeps renegotiations at 14 (same as video-only).
- Data: m2m-heavy-av8{,-smoke}.jsonl. Next: Step 2 show-quality rung
  (pubs 640x360@30, kbps=1200, hint=motion, audio on).

## Checkpoint H3 — Step 2: SHOW-QUALITY rung N=8 ✅ PASS (2026-08-26 03:05)

- 🐛 ops bug first: my server-restart pkill matched the M2M_RESULTS env var,
  which ps does NOT show — old server stayed bound (SO_REUSEADDR does not beat
  an active listener on macOS), new one died at bind, and show8 smoke+main rows
  appended into m2m-heavy-av8.jsonl. av8 was analyzed BEFORE contamination
  (clean); split the file by storm-row srv_ts into per-rung files + windowed
  the server log by local-time (log is UTC+3, driver prints UTC). Fixed
  procedure: kill by recorded PID only. No rerun needed — data intact.
- Config: 6 pubs at 640x360@30, maxBitrate 1.2 Mbps, contentHint='motion',
  audio on; 2 probes. Churn sibling now LIVE on :8896 (~80%/core of chrome,
  visible in otherChrome column) — contention noted, gates unaffected.
- **Show-quality video is FASTER than lightweight**: pooled p50 66.1 / p95
  96.0 / p99 104.7 ms (vs 122.7/163.1 at 320x180@15) — 30 fps halves the
  frame-interval quantization (~33 vs ~66 ms) and 1.2 Mbps keeps the encoder
  ahead of the row. Show-class pairs p50 60–71 ms — conversational headroom
  vs the <500 ms requirement is now ~7x.
- qualityLimitationReason 'none' on all 8 encoders, fps med 29–30 sustained,
  target held at 1200 kbps exactly (setParameters works through the SFU leg).
- Audio unchanged-perfect: 14/14 tone pairs 100%, concealment 0.02%, jbd
  74–86 ms. Valid 99.76/99.77% — sole artifact: F had one ~2 s checksum-fail
  burst on BOTH probes (sender-side encoder adaptation, same class as ladder's
  D artifact, self-recovered). Freezes: NONE (vs 4 pubs frozen at light-N8 —
  the 15 fps/600 kbps class is MORE freeze-prone than show quality).
- Cost: probes 43%/core (vs 37–39 light), show pubs ~10%/core (vs ~6 light),
  ours 153% of 1200 total; RSS 7.4 GB. API 44 calls zero non-2xx.
- Data: m2m-heavy-show8{,-smoke}.jsonl. Next: Step 3 720p featured rung
  (N=10: 2 feat 1280x720@30@2.5Mbps + 6 light + 2 probes, audio on).

## Checkpoint H4 — Step 3: 720p FEATURED rung N=10 ✅ PASS (2026-08-26 03:08)

- 2 feat (A,B: 1280x720@30, 2.5 Mbps, hint=motion) + 6 light + 2 probes, all
  A+V. Smoke 30 s + main 90 s. Mesh 10.0 s. 100.00% valid both probes
  (n=25 532); 18/18 tone pairs 100%; pooled concealment 0.01%.
- **Big tracks do NOT degrade the small ones**: light-class p50 110.3 / p95
  157.8 with the two 720p senders alongside — vs 122.7/163.1 at all-light
  N=8. Feat-class latency itself excellent: p50 75.0 / p95 100.6 (30 fps
  quantization again). 720p30 decode on probes held (fps med 30, p5 25).
- Feat encoder detail: BOTH A and B report qlr='bandwidth' with an IDENTICAL
  18.1 s bandwidth-limited duration — a shared uplink BWE ramp clamp (2×2.5
  Mbps + 6×0.6 + 2×1.7 ≈ 12 Mbps up from one machine, PLUS the churn
  sibling's publishers). Steady state still delivered target 2500 kbps at
  720p30. On separate real homes this clamp disappears — single-uplink
  artifact ⚠️, but worth a phase-2 check on real venue uplinks.
- Smoke-only artifact ledger: smoke had F/G audio concealment 7.4% bursts +
  F 5.8 s freeze + 2.2–2.4 s latency spikes right at the BWE ramp — steady
  state (main run) shows none of it (concealment 0.01–0.04% all pairs).
  Light-class remains the freeze-prone class: D/F/G sender-side freezes
  3.1/6.2/3.1 s cumulative (show-class rung had ZERO) — low-bitrate 15 fps
  streams are the first to stall when the shared uplink burps.
- Cost: probes ~57–61%/core (9 video + 9 audio decodes incl. 2×720p), feat
  pubs 17%/core, light ~6%, ours peak 194 of 1200%; RSS 9.3 GB. API 56 calls
  zero non-2xx. otherChrome (churn sibling) steady 82–87%/core.
- Data: m2m-heavy-feat10{,-smoke}.jsonl. Next: Step 4a co-tenancy check
  (N=8 A/V, PER_INSTANCE=5 vs the av8 separate-instance baseline).

## Checkpoint H5 — Step 4a: CO-TENANCY VERDICT — CLEAN ✅ (2026-08-26 03:10)

- Same config as Checkpoint H2 (N=8 all-A/V light) but PER_INSTANCE=5:
  2 Chrome instances (g0=[1,2,A,B,C] 11 procs, g1=[D,E,F] 9 procs) instead
  of 8. Anti-throttle/autoplay flags unchanged.
- **Co-tenancy does NOT poison the numbers**: light-class p50 129.4 / p95
  167.2 vs separate-instance 124.5 / 166.2 (+4.9 ms p50 / +1.0 ms p95 —
  within run-to-run noise); 100.00% valid both probes; pub fps med 15 all
  six; probe decode fps p5 13; tones 14/14 at 100%; concealment 0.35%
  (vs 0.24%). No rVFC/rAF throttling signature anywhere.
- **The RAM win is decisive**: oursRSS 3.06 GB vs 7.22 GB (−58%), ours CPU
  ~95% vs ~120%. Marginal cost per co-tenant page ≈ 250–350 MB vs ~880 MB
  per instance. Extrapolation: N=36 ≈ 8 instances ≈ 11–13 GB — inside the
  32 GB machine with the churn sibling running. PER_INSTANCE=5 is the climb
  configuration.
- Minor: pages co-tenant WITH the probes (A,B in g0) run ~10 ms hotter at
  p50 with one 425 ms max outlier — noted, within class spread.
- Data: m2m-heavy-cotenant8.jsonl. Next: Step 4b climb N=24 → 30 → 36
  (A/V, 90 s rungs, smoke first, probes pulling ALL tracks).

## Checkpoint H6 — Step 4b: N=24 ✅ PASS, N=30 flakes then ✅ PASS (03:18)

- **N=24** (22 light pubs + 2 probes, all A+V, PER_INSTANCE=5, 5 instances):
  smoke + 90 s main both CLEAN. Mesh 16.1 s. 100.00% valid (n=59 888);
  46/46 tone pairs 100%; concealment 0.04/0.05%. Pooled p50 122.6 / p95
  160.9 — STILL flat vs N=8. 46 A+V tracks per probe PC decoding fine.
  Ours 296% CPU / RSS 8.4 GB. API 141 calls zero non-2xx.
- **N=30 exposed the join-storm flake class, twice**:
  - attempt 1 (smoke): ONE publish tracks/new → **HTTP 500 internal_error
    "Backend error"** (1 of 31 calls; first non-2xx EVER seen from this SFU
    across ~500 calls in two ladders). Page treated it as fatal → run down.
  - attempt 2 (smoke rerun): CLEAN, zero non-2xx — 500 is intermittent.
  - attempt 3 (main): TWO pubs' ICE/DTLS never connected (same class as
    phase-1b N=20 flake, now 2/30 legs). → implemented the plan-m2m §5.2
    production mitigation in room.html: publish-leg API retry (2x backoff,
    'publish-retry' event) + connect-timeout retry (session recreate via
    one-shot reload, 'connect-retry' event). Failure-only paths — healthy
    runs untouched.
  - attempt 4 (main rerun): **PASS with W using ONE connect-retry** (31
    sessions/new for 30 participants, all 201). Full A/V mesh 24.3 s.
    100.00% valid (n=78 947), 58/58 tone pairs 100%, concealment 0.39%,
    pooled p50 130.7 / p95 165.9. Storm-flake rate clearly grows with N
    (0 seen ≤24, ~1-2 per 30-way storm) but retry absorbs it — NOT a ceiling.
- Emerging strain signals at N=30 (watch at 36): probes' own encode fps
  sagged to 16–18 (rAF contention while decoding 58 tracks each — probe→
  probe pairs p50 109/p95 159); 16 light pubs showed 0.3–3.6 s sender-side
  freezes; concealment up an order (0.05→0.39%, still 13x under gate).
- Data: m2m-heavy-N24{,-smoke}.jsonl, m2m-heavy-N30{,-smoke,-smoke2}.jsonl,
  m2m-heavy-N30-attempt1-Dconnfail.jsonl. Next: N=36 (34 pubs A-Z+a-h).

## Checkpoint H7 — N=36 ✅ PASS — new max-N, no gate fired (2026-08-26 03:23)

- Smoke: PASS but **6 of 34 pubs needed a connect-retry** (E,g,M,a,Z,I) —
  storm ICE-flake rate 0/24 → 2/30 → 6/36. Main run: ZERO retries (36
  sessions/new exactly) — the flake is bursty, per-storm, not monotonic.
- Main 90 s: **99.99% valid both probes** (n=88 007; 3 bad decodes each),
  70/70 tone pairs 100%, concealment 0.07%, zero non-2xx (212 API calls).
  Light-class latency STILL FLAT: p50 131.0 / p95 160.9 vs 122.6/160.9 at
  N=24. The SFU shows no distress whatsoever at 36 sessions / 72 tracks
  pushed / 140 track-subscriptions across 2 probes.
- **Where strain actually lives — the probe pages (local)**: each probe now
  decodes 70 tracks (35 V + 35 A) while running its own 30 fps rAF canvas:
  probe self-encode fps sank to 12 (min target), probe→probe latency p50
  224.9 / p95 246 (vs 92/110 at N=24) — pure rAF/decode contention inside
  ONE renderer, NOT the SFU path (light pairs through the same SFU stay at
  131 ms). g0 (probes+3 pubs) = 251% of 1200; machine total 660 max.
- RAM free never dipped below 12.0 GB (co-tenancy killed the ~800 MB/Chrome
  wall — 8 instances / 13.0 GB oursRSS at N=36 vs 15.9 GB at N=20 in the
  one-Chrome-per-participant ladder).
- Freeze ledger: 6 lights with one ~3.1 s (one 6.2 s) sender/SFU-side freeze
  each — same class as every rung since H2; never disturbs valid%.
- NO stop gate fired through the briefed ladder end (N=36). Since the brief
  is "find what breaks", extending pool to 40 pubs and probing N=42.

## Checkpoint H8 — beyond the brief: N=42 ✅, N=48 ✅, N=54 gate-fire →
## NOT reproduced (2026-08-26 03:42)

- **N=42** (smoke+main): PASS. Light p50 132.5 / p95 163.0 (STILL flat),
  99.95% valid, concealment 0.03%, zero non-2xx, zero retries in main.
  82 tracks per probe PC. Probe self-encode down to 7 fps (local rAF strain).
- **N=48** (smoke+main): PASS. 100.00% valid (n=108 595), light p50 132.0,
  concealment 0.03%. Main storm needed **9 connect-retries of 46 pubs** —
  all recovered, mesh 43 s. 94 tracks/probe. (Churn sibling ended mid-rung;
  otherChrome 0 for remainder.)
- **N=54** (pool max; 52 pubs + 2 probes; 106 tracks/probe):
  - smoke: PASS (100.00/100.00).
  - main: **GATE a FIRED — 98.04% valid on BOTH probes.** Forensics: 100% of
    the miss is ONE publisher (A: 17.6/19.3% valid, ~835 checksum-fails per
    probe, identical on both → sender-side). A's own encoder stats stayed
    PERFECT throughout (15 fps, qlr none, 600 kbps, 320x180) and contrast at
    the probes was 255 — the canvas CAPTURE pipeline delivered crisp but
    geometrically-shifted frames from t+25 s to run end. Same class as the
    ladder's transient "blocks off-grid at contrast 255" artifact, first
    time sustained. A sat in g0, the hottest co-tenant instance (probes+3).
  - confirmation rerun: **PASS 99.99/100.00% — the gate does NOT reproduce.**
    One 0.24 s freeze, 5 checksum fails total, zero retries, zero non-2xx.
- Machine at N=54: ours ~600% CPU, total brushed 899% of 1200 when the churn
  sibling returned (its chromes 85–135%); RSS 17.9 GB, free RAM ≥11.4 GB
  throughout. This is the practical edge of THIS laptop, not of the SFU.
- Storm connect-flake ledger (ICE/DTLS never up in 15 s, page-level retry
  recovers in ~16 s): 0/24, 0+2/30 (pre-retry: fatal), 6+0/36, 1+9/48,
  0+1/54+0 — bursty per-storm, roughly grows with N, absorbed by retry.
  Control-plane stayed 2xx during every one of them.

## Checkpoint H9 — HEAVY MEDIA wrap-up + cleanup ✅ (2026-08-26 03:45)

- **Ceiling verdict: NO SFU-side ceiling found through N=54** (54 sessions,
  108 published tracks, 106 concurrent subscriptions on one PeerConnection —
  vs plan-m2m §1.A "no upper limit" 📄, now ✅ probed 5x deeper than phase 1b).
  SFU-attributed latency FLAT: light-class p50 122–137 / p95 158–175 ms at
  every N from 8 to 54. Audio concealment never above 0.39% pooled (gate 5%).
  Across ~1 500 CF API calls in 13 storms: ONE 500 (N=30 storm, publish
  tracks/new "internal_error", never recurred).
- What an operator would actually see at scale (failure modes, local-first):
  (1) join-storm ICE flakes — k legs of an N-way simultaneous storm stall
  pre-connect (k growing with N; 9/46 at N=48); invisible with publish
  retry+recreate, fatal without. (2) sporadic per-sender capture corruption
  under extreme co-tenant load — sender looks healthy in its OWN stats,
  receivers see garbage; only end-to-end content checks catch it (argues for
  a lightweight client-side "is my video sane" self-view heartbeat in
  production). (3) probe/viewer fan-in saturation: a single page decoding
  ~100 tracks drops its own rAF/encode to 4–7 fps long before decode fails.
- Files: room.html +audio/+vw/vh/vfps/kbps/hint/cls +publish/connect retries
  (defaults byte-identical to the ladder rig); run-heavy.mjs (PER_INSTANCE
  co-tenancy, per-class configs, vm_stat gate); analyze-heavy.py (tone +
  concealment + per-class + RAM gates). Data: results/m2m-heavy-*.jsonl (23
  files); logs/server-heavy-*.log (every CF call); logs/heavy-*-{mesh,final}
  .png (N=54 probe grid = 53 crisp tiles, clocks 20–90 ms behind local).
- Cleanup: server :8897 stopped (pidfile), 0 m2m-heavy chromes left (checked
  by udd prefix), port 8897 free, churn sibling + its :8896 server untouched,
  battery 100% AC, free RAM 16 GB. CF sessions left to expire server-side —
  **zero new Cloudflare resources created** (app "flabbergaster" as-is).

# CHURN + ENDURANCE (churn agent, 2026-08-26)

Goal: stress what a real performance does that a clean 90 s run doesn't — the
publish-leg connect-retry (S6's 1-in-3 join-storm flake), 30 min endurance,
rotating-grid renegotiation churn (§5 risk 4), ungraceful leave/rejoin storms,
publisher kill + auto-reconnect. Own files: room-churn.html (copy of room.html
— sibling owns the original), run-churn.mjs, analyze-churn.py, port 8896,
results/m2m-churn-*.jsonl. server.py gained M2M_PORT env (default 8897
unchanged) + GET passthrough on /cf/ (for GET sessions/{sid} track-status GC
probing; spec: status ∈ active|inactive|waiting).

## Checkpoint C0 — rig built (2026-08-26, machine idle: 100% AC, ports free, no sibling procs yet)

- room-churn.html deltas vs room.html: (1) publish leg wrapped in
  publishWithRetry — 8 s connect timeout (ct= param), teardown PC, fresh
  sessions/new + tracks/new, max 3 attempts, backoff 1 s/2 s, events
  publish-attempt/-retry/-ok/-exhausted; failpub=N hook discards the SFU
  answer on first N attempts to exercise the REAL timeout path. (2) unpull =
  transceiver.stop() -> offer -> PUT tracks/close (force:false) -> apply
  answer, serialized on the same pullChain. (3) roster loop detects sessionId
  change -> repull (unpublish+publish per plan-m2m §3). (4) track
  mute/unmute/ended events + per-tile first-frame TTFF. (5) post() = fetch
  keepalive (never sendBeacon).
- run-churn.mjs modes: retry / happy / soak / rotate / storm / pubkill.
  Kill discipline: SIGKILL by udd path prefix m2m-churn-udd-<id> ONLY.

## Checkpoint C1 — connect-retry VERIFIED deterministically ✅ (2026-08-26 02:58)

- MODE=retry, failpub hook (discard SFU answer -> real 8 s connect-timeout path):
  - Z (failpub=2): attempts 1+2 timed out exactly at 8 s (pc=new ice=new),
    backoff 1 s then 2 s, fresh sessions/new + tracks/new each time, attempt 3
    connected in **1980 ms** -> phase running. Recovery works.
  - Y (failpub=3): 3 timeouts -> publish-exhausted, phase=failed, error
    surfaced. Bounded give-up works.
- All attempts logged with reasons (publish-attempt/-retry/-ok/-exhausted).
- Data: results/m2m-churn-retry.jsonl. Next: happy-path inertness at N=6.

## Checkpoint C2 — retry INERT on happy path ✅ (2026-08-26 03:00 EEST)

- MODE=happy N=6 (4 pub + 2 probes), join storm -> full mesh 6.0 s. Exactly ONE
  publish-attempt per participant, ZERO publish-retry events -> the retry wrap
  costs nothing when ICE comes up normally.
- 100.00% valid (n=7855 post-warmup), p50 108.3 / p95 157.9 / p99 165.8 —
  same envelope as scale-ladder N=8 (108.6/158.6). CPU ours 70% of 1200%,
  sibling 0% (idle). Data: m2m-churn-happy.jsonl.
- Next: 30-min endurance soak N=8.

## Checkpoint C3 — 30-min soak STARTED (2026-08-26 03:00 EEST)

- Pre-run: battery 100% AC, ~1.8 GB pages free, sibling procs idle (0 chrome/
  ffmpeg). MODE=soak N=8 (6 pub A-F + probes 1,2), mesh 7/7+7/7 formed by
  t+19 s. RSS+CPU sampled 60 s, SFU session state (probe 1 + pub A) polled
  5 min. Results -> m2m-churn-soak.jsonl. No other tests run concurrently
  (would pollute the endurance measurement).

## Checkpoint C4 — 30-min soak COMPLETE ✅ STABLE (2026-08-26 03:35 EEST)

- N=8, 1800 s, both probes 7/7 tiles the ENTIRE run. Zero publish retries.
- **Endurance verdict: STABLE.** Per-minute p50 slope **-0.041 ms/min over
  minutes 0-25** (i.e. zero drift); pooled p50 116.9 / p95 162.9 / p99 180.9
  (n=338 630). The naive full-run slope (+0.45 ms/min) is entirely the
  minutes-26-30 tail where the SIBLING heavy-media agent's chromes
  (m2m-heavy-udd-*) pushed total CPU to 490-723% — p50 rose to ~134 ms, probe
  decode rate halved (12.4k->5k samples/min), p95 still <184 ms. External
  contention, not endurance decay.
- **RSS: NO leak.** 30-min delta: probe1 +56 MB, probe2 +43 MB (~1.7 MB/min),
  all six pubs SHRANK 58-74 MB. Total ours 6.3 GB -> 6.0 GB.
- **SFU session survival: perfect.** GET sessions/{sid} every 5 min x 30 min:
  probe 1 = 8/8 tracks 'active', pub A 1/1 'active' at every poll, HTTP 200,
  zero spontaneous renegotiations, zero track-mute/ended events.
- Freezes (recovered from sample gaps — see bug below): 20 display stalls >1 s
  across 42 pair-streams/30 min, all <=3.2 s, clustered at 6 moments, most
  seen identically by both probes (sender/SFU-side, same class as S-ladder);
  none in the final 5 min. Valid% 100.0 nearly every minute; dipped to 87-94%
  only in minutes 21-23 (sibling chrome-launch storm, total 717%),
  self-recovered.
- 🐛 NEW INSTRUMENT BUG FOUND+FIXED: fetch **keepalive** has its own ~64 KB
  pending-body quota — probe stats rows (2 KB / 2 s) starved it after ~54 s
  (pub rows 300 B / 3 s survived 30 min). Stats now go through the proven
  plain-fetch batch. Sendbeacon(S5)/keepalive(C4): SAME lesson twice — bulk
  telemetry must use plain fetch.
- run-churn.mjs sibling filter now includes m2m-heavy-udd (sibling was
  invisible as "sibling=0%" in this run's CPU rows; total column was correct).
- Data: m2m-churn-soak.jsonl (16k rows). Next: rotating-grid churn N=10.

## Checkpoint C5 — rotating-grid churn ✅ (2026-08-26 03:40 EEST)

- N=10 (8 pub + 2 probes auto=0), initial 6-tile grids, then 27 rotations x
  (unpull 2 + pull 2) per probe every 10 s for 5 min = 108 pulls + 108 unpulls,
  348 API calls, **ZERO errors** (~1.2 calls/s total, 0.6/s/session vs the 50/s
  documented budget — §5 risk 4 has huge headroom at this scale).
- **Renegotiated pull: p50 386 / p95 474 / max 617 ms. Unpull (tracks/close +
  renego): p50 264 / p95 335 ms. Tile-switch TTFF (pull-start -> first
  checksum-valid frame): p50 523 / p95 646 / max 1756 ms** — the grid-rotate
  UX number: ~half a second to a live tile.
- **No degradation over the run**: pull p50 386->388, TTFF 516->530 (1st vs
  2nd half). jbd/frame steady 6.6-8.5 ms (stats-via-batch fix works).
- **Untouched tiles unaffected**: samples during renegotiation windows p50
  124.5 vs 132.1 outside (i.e. no shift); exactly 1 stall >1 s on flowing
  tiles in the whole 5 min. Sub-second hiccups (79x 0.5-1 s) track the
  sibling's 598% CPU phase, not rotation moments.
- BONUS retry data: this join storm ran UNDER SIBLING LOAD (287% at launch) —
  **5 of 10 participants hit the 8 s connect-timeout (ice=checking) and ALL
  recovered on attempt 2** (connect 1.3-6.0 s). The S6 flake is reproducible
  under co-located CPU pressure and the retry makes it invisible. Production
  note: 8 s is aggressive under load; retry absorbs it either way.
- Data: m2m-churn-rotate.jsonl. Next: leave/rejoin storms N=10.

## Checkpoint C6 — leave/rejoin storms ✅ (2026-08-26 03:47 EEST)

- N=10, sibling at 572-610% CPU throughout (real contention). Mesh 10.1 s,
  then 3 cycles: SIGKILL 4 pubs' chrome trees (ungraceful) -> watch 45 s ->
  relaunch same ids -> time full restore on both probes.
- **What probes see on dead tracks: NOTHING at the track level.** Zero
  track-mute / track-ended events in all 12 kill observations. Last decoded
  frame arrives 0.02-0.23 s after SIGKILL (pipeline drain), then the tile
  freezes silently. UI death detection MUST come from signaling ('left'
  broadcast) or stats stalls — the WebRTC track object won't tell you.
- **Actual SFU GC measured** (GET sessions/{sid} every ~5 s per dead pub):
  tracks stay status 'active' after the socket dies, then the whole session
  starts returning **HTTP 410 session_error between +31 s and +47 s**
  post-kill (B +31-36 s, C +36-41 s, D +42-47 s; A twice outlived the 45 s
  window). Tracks never transitioned to 'inactive' individually — the session
  dies wholesale. Matches the documented ~30 s GC + up to ~15 s slop.
- **Rejoin storm restore** (4 simultaneous rejoins, roster-poll detection):
  restored-on-both-probes 16.1 s / 4.0 s / 4.0 s after relaunch. The 16 s
  cycle contained the run's ONE publish retry (D: connect-timeout under load,
  recovered on attempt 2 in 2.1 s) plus a slow C detect (+13 s). Per-tile:
  repull-detected 1.5-4.5 s after relaunch (2 s roster poll + join),
  **repull TTFF 454-658 ms typical** (2 outliers 1.5-1.6 s) — same ~0.5 s
  tile-switch number as the rotation test.
- Untouched participants: p50 104.3 / p95 157.8, valid 99.96% across the
  whole run — kills are invisible to the rest of the room.
- Registry sessionId-change repull (unpublish+publish per §3) worked 12/12.
- Data: m2m-churn-storm.jsonl. Next: publisher kill + immediate relaunch.

## Checkpoint C7 — publisher kill + auto-reconnect ✅ + WRAP-UP (2026-08-26 03:52 EEST)

- N=8, kill ONE pub (C) mid-publish + relaunch immediately with same
  participant id, 3 cycles: **outage-to-restored 3.92 / 3.88 / 3.97 s**
  (SIGKILL -> both probes decoding the re-published tile). Decomposition:
  ~0.9 s chrome relaunch + ~1 s publish (session/tracks/connect, attempt 1
  every time) + <=2 s roster-poll detection + ~0.4 s repull + ~0.5 s TTFF
  (453-658 ms). With the production DO's WS push (27 ms) replacing the 2 s
  poll, expect ~2 s. This is the WebRTC encoder-restart story: registry
  upsert + sessionId-change repull + publish retry = clean recovery, no state
  repair (rebuild-never-patch holds).
- Kills invisible to the room: p50 101.9 / p95 156.4, valid 99.98% throughout.
- RETRY LEDGER across all churn runs: fired 7x total (5x rotate join storm
  under 287% sibling load, 1x storm cycle-1 D, 1x deterministic Z check),
  recovered on attempt 2 EVERY time (connect 1.3-6.0 s); never exhausted
  organically (only the failpub=3 sabotage check exhausted, by design);
  0 retries on happy path / soak / pubkill (inert when not needed).
- CLEANUP: server :8896 stopped, 0 m2m-churn-udd chromes left (verified by
  path), CF sessions left to expire (GC measured live at +31-47 s), ZERO new
  CF resources, sibling procs never touched, battery 100% AC end-to-end.
- Files: room-churn.html / run-churn.mjs / analyze-churn.py (new, churn
  agent's); server.py gained M2M_PORT + GET /cf/ passthrough (defaults
  unchanged). Data: results/m2m-churn-{retry,happy,soak,rotate,storm,pubkill}
  .jsonl. Screenshots: logs/churn-*-{mesh,c1..c3,final}.png.
