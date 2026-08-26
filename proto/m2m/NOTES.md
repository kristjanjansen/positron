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

============================================================================
# GRID (tiered grid UI agent — grid.html / grid-server.py / run-grid.mjs / analyze-grid.py)
============================================================================

## Checkpoint G0 — rig built (2026-08-26 07:32 EEST)

- Machine: 100% AC, port 8897 free, no stale grid chromes. Node v25.9, playwright cached.
- Built: grid.html (three-tier UI: featured 2x640x360@30@1.2Mbps, live paged ls
  tiles @500kbps, wall <img> snapshots 1.5s POST / 2s poll; connect-retry copied
  from room-churn (8s/3 attempts/backoff); left-broadcast death + 3s stall
  watchdog + repull; promote/demote live without rejoin; gUM explicitly stubbed
  out — camera WEDGED, source abstraction marked), grid-server.py (stub: static
  + CF proxy + collector + tile store + hand-rolled RFC6455 WS signaling),
  run-grid.mjs (N=12: 2 featured probes view=full, 6 live + 4 wall view=lite;
  co-tenancy 4+4+3, kill target A isolated; stages ready/cast/steady/rotate x5/
  kill/rejoin/promote/demote), analyze-grid.py.
- workers/rtc/DEPLOYED.md appeared DURING build (07:17) — protocol aligned to
  the Worker EXACTLY (flat join, trackNames, promote/demote operator frames,
  everyone joins tier wall, /room/{name}/ws, tile POST auth + 64KB/FFD8).
  Stub speaks the same protocol at the same paths -> REMOTE=1 env flips the
  whole rig to the deployed Worker (ROOM_TOKEN read from .env).
- Cast design consequence: initial tiers are OPERATOR promotes after join
  (probe 1 = operator role), matching production choreography.
- Next: SMOKE=1 vs local stub, then full program vs stub, then vs Worker.

## Checkpoint G1 — SMOKE vs local stub ✅ FIRST TRY (2026-08-26 07:34 EEST)

- N=12 storm -> all running 4 s -> operator cast (8 promotes) -> GRID READY at
  7.9 s total (cast->ready 4.0 s). 30 s steady: featured p50 86.0 / p95 118 ms,
  live p50 74.5 / p95 108 ms, 100.00% valid decode both tiers; wall freshness
  p50 1015 / p95 1543 ms, 0 misses. Cast TTFF (12 pulls under promote storm)
  p50 703 ms. 0 publish retries, 0 pull failures. UI verified by screenshot:
  three tier sections + badges + paging + freshness ages + self-preview.
- liveOrder note: promotions unshift -> cast order A..F displays as F,E,D,C on
  page 0 (spotlight-first semantics; deliberate).
- Data: m2m-grid-smoke.jsonl (9039 rows). Next: REMOTE smoke vs deployed Worker.

## Checkpoint G2 — SMOKE vs DEPLOYED WORKER ✅ (2026-08-26 07:37 EEST)

- REMOTE=1: signaling wss://elektron-rtc…/room/grid-rsmoke/ws, SFU via Worker
  /cf proxy, tiles via Worker (colo cache + DO fallback), ROOM_TOKEN auth.
  Zero code changes vs stub run — the protocol-parity stub did its job.
- Storm -> all running 4.9 s -> cast -> GRID READY 7.66 s. 30 s steady:
  featured p50 182 / p95 266 ms, live p50 194 / p95 275 ms (a jitter-buffer
  adaptation swing mid-window — polls started and ended in the 76-145 ms band;
  120 s main run will characterize), 100.00% valid. Wall freshness p50 1286 /
  p95 3149 ms (colo cache age visible, inside the 2-4 s budget), 0 misses.
  Cast TTFF p50 440 ms, pull API p50 328 ms (through the Worker).
- OPS BUG (mine): second grid-server.py couldn't bind :8897, old instance
  served on; rsmoke rows landed in the smoke jsonl (split post-hoc, both files
  clean now). Server lifecycle now by explicit PID.
- In-flight wall-poll tick could resurrect a deleted __state.wall entry after
  a promote (hud showed wall=5) — guarded (bmp discard when poller stopped).

## Checkpoint G3 — MAIN PROGRAM vs DEPLOYED WORKER (2026-08-26 07:43 EEST)

- ATTEMPT 1 FAILED, valuably: a sustained ~40 s ICE-degradation window hit the
  12-way publish storm; retries with DETERMINISTIC backoff resynchronized (all
  failing legs retried in lockstep at +12.9 s and +26.5 s) and C+Z exhausted
  3 attempts. Control plane (Worker /cf) fine throughout — sessions and answers
  returned; only ICE/DTLS to the SFU stalled. Evidence: m2m-grid-rmain-fail1
  .jsonl. FIXES: (a) 0-1.5 s random jitter on the connect-retry backoff,
  (b) driver reloads a publish-exhausted page (max 2, the production
  "reload the tab" recovery) + operator re-promotes reloaded pages.
- ATTEMPT 2 (m2m-grid-rmain.jsonl, 49366 rows): ALL STAGES PASS, 0 retries,
  0 reloads needed. storm->GRID READY 7.67 s.
  - Steady 120 s: featured p50 94.9 / p95 124.9 / p99 133 ms, live p50 79.4 /
    p95 107.9 ms, 100.00% valid decode (n=31419); wall freshness p50 1093 /
    p95 2057 ms, 0 misses.
  - Rotation x5: tile-switch TTFF p50 324 / p95 395 ms (vs 523 ms 1d baseline —
    faster, page had warmed). Featured tier: undisturbed in 3/5 rotations
    (max gap <= 375 ms vs 50 ms baseline p99); rotations 3+5 (the 4-tile
    unpull burst to the small page) put ONE ~875 ms gap on the featured tier —
    renegotiation main-thread cost, operator-visible, note for phase 3.
  - KILL (SIGKILL isolated Chrome): kill -> left-received 104/103 ms at the two
    probes, dead-marked SAME FRAME. vs 31-47 s SFU-only. Target <2 s: beaten 20x.
  - REJOIN: relaunch -> publish-ok attempt 1 (connect 1.2 s) -> running +2.3 s;
    re-promote -> decoding on both probes +0.5 s. Total measured 7.8 s but ~5 s
    of that is driver pacing (poll + deliberate page-0 rotation); system time
    ~2.8 s — matches churn C7 (~3.9 s with 2 s poll -> ~2 s with DO push).
  - PROMOTE W (spotlight from the crowd): promote frame propagation 39-53 ms;
    cmd -> real video decoding on both probes 467-490 ms (TTFF 427-446 ms).
  - Watchdog: 1 organic stall >3 s -> badge + repull, recovered in 465 ms.
  - DEMOTE W: tier frame +51 ms; ANY snapshot on probes +104 ms — but it was
    the STALE pre-promotion tile from the DO fallback (freshMs 12.2 s); truly
    FRESH content at +2.08 s (1.5 s post interval + poll). Honest number 2.1 s.
    UX note: the stale-fallback actually softens the transition. FIXES: post
    one snapshot IMMEDIATELY on becoming wall-tier; driver + analyzer now
    require freshMs < 4 s. Rerunning as rmain2 to confirm.

## Checkpoint G4 — CONFIRMATORY + STUB-vs-WORKER SPLIT + WRAP-UP ✅ (2026-08-26 07:53 EEST)

- rmain2 (Worker, all fixes in): reproduces rmain within noise. featured p50
  97.8 / p95 129.9, live p50 77.8 / p95 107.1, 100.00% valid (n=31429); wall
  p50 1082 / p95 1879 ms; rotate TTFF p50 332 / p95 419; spotlight 493-517 ms;
  kill->left 125/126 ms; demote: ANY snapshot +105 ms (stale DO fallback =
  free "last seen" placeholder), FRESH content +2.10 s (floor = 2 s poll +
  2 s colo cache; inside the 2-4 s budget).
- lmain (local stub, same program): media latencies IDENTICAL (featured 88.8 /
  live 82.7 p50 — same SFU either way). Control plane split: kill->left 58 ms
  stub vs 104-126 ms Worker; tier-frame propagation 5-8 ms stub vs 39-66 ms
  Worker (the real DO hop, matches the 27-38 ms cues numbers + broadcast);
  pull API p50 413 ms via local python proxy vs 257-281 ms via the Worker
  (CF-edge-to-SFU beats laptop urllib).
- Consistent finding across all 3 full runs: rotations that UNPULL 4 tiles at
  once (page 0 -> page 1) put ONE 0.6-0.9 s frame gap on the featured tier
  (baseline p99 gap 50 ms); pull-heavy rotations do not. Phase-3 note: batch
  the tracks/close into one call and/or defer unpulls a beat after pulls.
- UI evidence (logs/grid-rmain2-*.png): LEFT overlay + red border + struck
  name on kill, tier badges, live paging indicator, wall freshness ages,
  self-preview. Watchdog STALLED overlay fired once organically in rmain and
  repulled in 465 ms.
- HOW TO RUN:
    cd proto/m2m
    M2M_RESULTS=…/results/m2m-grid-<label>.jsonl python3 grid-server.py &
    SMOKE=1 node run-grid.mjs                      # 30 s smoke vs local stub
    REMOTE=1 LABEL=x DURATION=120 node run-grid.mjs  # full program vs Worker
    python3 analyze-grid.py ../../results/m2m-grid-x.jsonl
  Manual browsing: open http://127.0.0.1:8897/grid.html?id=Q&name=You&role=operator
  (+ &remote=https://elektron-rtc.kristjan-jansen.workers.dev&token=<ROOM_TOKEN>
  for production). gUM deliberately NOT wired (camera wedged) — source
  abstraction marked in grid.html (makeSyntheticSource -> makeCameraSource).
- CLEANUP: server :8897 stopped, 0 m2m-grid-udd chromes (verified by path),
  ZERO new CF resources (sessions expire server-side), room/tile state on the
  Worker is per-room ephemeral, battery 100% AC end-to-end. Data files:
  m2m-grid-{smoke,rsmoke,rmain-fail1,rmain,rmain2,lmain}.jsonl.

# P3B COMPOSITE — recording the grid WITHOUT OBS (phase 3b)

Design (plan-m2m §5 risk 1a, OBS replaced by headless Chrome): a composite
participant (composite.html, headless Chrome) joins the room as a silent
subscriber, pulls featured+live SFU tracks + wall snapshots, draws them all
onto ONE 1280x720 canvas at 30 fps with a burned wall-clock row, and the
CAPTURE of that canvas goes to a RECORDED Stream live input. Route A: the page
itself publishes canvas.captureStream() via WHIP (pure browser). Route B
(fallback): CDP screencast -> ffmpeg -> RTMPS to the same input. Known repo
facts stacked against A's *recording* (📄 plan.md §2.2: Stream-WebRTC has "no
recording" + no cross-protocol since 2022) — A is tested honestly, B is the
expected archive path. Port 8895, udd prefix m2m-p3b, results
results/m2m-p3b-*.jsonl, room p3b-<label> on the DEPLOYED Worker.

## Checkpoint P0 — live input provisioned ✅ (2026-08-26 08:0x EEST)

- POST accounts/{acct}/stream/live_inputs `{"meta":{"name":"p3b-composite"},
  "recording":{"mode":"automatic"},"preferLowLatency":true}` -> success.
- **uid 12f3a2dd9686887cf6495c8b10aec352**, customer-mwuu1cmlyif6eluy;
  full JSON (publish URLs = credentials) in artifacts/p3b-live-input.json.
- Budget: keep total recorded minutes < ~15 (route-A probe ~3 min + main ~10).
- Plan: composite.html (2 featured 640x360 UNSCALED top + up to 6 live 208x117
  + wall strip 160x90 + 64-block burned clock row pid 'K' at blockW=12) +
  composite-viewer.html (WHEP for route A / LL-HLS for route B; decodes
  featured tile "1"/"2" rows AND the composite 'K' row from one 1280x720 work
  canvas -> grid-to-viewer and composite-to-viewer glass-to-glass) +
  run-composite.mjs (N=8 grid: 2 featured + 4 live + 2 wall, all view=lite
  via deployed Worker; composite in its own Chrome for clean CPU numbers).

## P3B Checkpoint P1 — rig built + smoke + ROUTE A verdict (2026-08-26 08:2x EEST)

- NOPUB smoke (m2m-p3b-smoke.jsonl): first try. Grid 8 running in 4.9 s, cast
  <1 s, composite full (6 video tiles + 2 wall snaps) in 4.2 s. Composite draws
  30 fps; grid->composite decode 40-100 ms right out of the gate.
- **ROUTE A (in-page WHIP, m2m-p3b-a.jsonl, 183 s published): the CAPTURE path
  is flawless — canvas.captureStream(30) -> WHIP connected in 2.7 s, encoder
  30 fps steady (qlr none 70/77 samples), WHEP viewer decoded 100.00 % of
  8782 featured-row frames.** Steady numbers:
  - grid glass -> composite page: pooled p50 58 / p95 103 ms (n=4653)
  - grid glass -> WHEP viewer THROUGH the composite (grid SFU leg + canvas
    draw + WHIP + WHEP): **p50 128 / p95 183 / p99 205 ms** — the full
    double-WebRTC-hop chain costs ~2x one SFU hop, exactly as predicted
  - composite canvas -> viewer: p50 67 / p95 86 ms (= the familiar ~74 ms
    WHIP->WHEP number, re-measured through a THIRD live input)
  - WHEP viewer res ramp: 640x360 -> 1280x720 in ~10 s (BWE ramp), then locked
  - composite Chrome CPU p50 38 % / max 54 % of one core, RSS ~0.95 GB
- **ROUTE A RECORDING: DOES NOT EXIST.** recording.mode=automatic on the live
  input; 26 polls of /live_inputs/{uid}/videos over 183 s of live WHIP + 241 s
  after DELETE+close: **zero video assets ever created** (not even
  live-inprogress, which RTMPS mints within seconds). 📄 plan.md §2.2 "recording
  coming soon (2022)" for Stream-WebRTC confirmed ✅ by direct test in 2026.
  WHIP ingest is DELIVERY-only. -> Route B (RTMPS) is the archive path.

## P3B Checkpoint P2 — route B bring-up: 2 viewer bugs, 1 free recording proof (08:2x)

- CDP screencast -> ffmpeg -> RTMPS pipeline worked FIRST TRY (Page.
  startScreencast jpeg q80 -> image2pipe + wallclock PTS -> setpts,fps=30 ->
  libx264 veryfast zerolatency 2.5 Mbps + anullsrc AAC -> flv rtmps). ~30 fps
  in, speed 1.02-1.05x, 0 dropped frames at an 8 MB stdin watermark.
- Viewer bug 1: current hls.js@1 THROWS at construction if
  liveMaxLatencyDurationCount <= liveSyncDurationCount (measure-llhls.html's
  bare `liveMaxLatencyDurationCount: 5` is now illegal) — fixed (3/6).
- Viewer bug 2: joining before the live manifest exists = FATAL
  manifestParsingError, NO self-recovery in hls.js — exactly
  low-latency-player.v5.js wrap reason #3. Fixed with the v5 pattern:
  destroy + rebuild every 2.5 s (took 1 rebuild, ~10 s, in the real run).
- The two aborted attempts each produced a RECORDED asset anyway — first
  proof: **RTMPS from the composite records automatically**: bc557619 ready,
  120.02 s (matches 122 s streamed), 1280x720; readyToStream ~2 s after
  stream end. Viewer pointed at the RECORDING's VOD manifest decodes all 3
  burned rows 100 % at 720p (logs/p3b-vodcheck.png) — frame-content
  verification of the archive by checksum, not by eyeball.
- Main 600 s route-B run in flight; viewer joined the ~30 s-old stream 12 s
  behind live edge and stock-config hls.js can only nudge (maxLatency 12 s >
  actual ~10 s, so no seek fires): steady live latency ~10.1 s. HONEST
  reading: LL-HLS *join/latency governance* is the v5 player's job (2.6-4 s
  measured, plan.md §1); a show watches the composite through v5, not stock
  hls.js. Composite/encode side unaffected: drawFps 30, 0 sc drops.

## P3B Checkpoint P3 — ROUTE B MAIN ✅ + recording verified + cleanup (08:4x EEST)

- **632 s screencast->ffmpeg->RTMPS run, all green**: 19202 frames piped
  (30.36 fps), 0 dropped, ffmpeg 1.02-1.05x realtime; composite drawFps 30
  min=30 the whole way; LL-HLS viewer decoded 100.00 % of 18102 frames
  (36204 featured-row + 18102 K-row decodes, 0 invalid).
- Steady (m2m-p3b-b.jsonl): grid->composite pooled p50 60 / p95 105 / p99
  134 ms; wall freshness at composite p50 825 ms, 0 misses. Viewer latency
  p50 10.12 s (the parked join above — viewer-side, not pipeline).
- **CPU of the whole OBS replacement: composite Chrome p50 39 % (max 43 %) of
  one core + ffmpeg p50 18 % ≈ 0.6 cores total**, RSS 914 MB + 77 MB.
  (Route A pure-browser variant: 38 % and NO ffmpeg ≈ 0.4 cores.)
- **RECORDING (the deliverable): uid ee90ebba017e4a395a96961cea9f77f3,
  state ready, duration 632.02 s (streamed 633 s — matches), 1280x720,
  readyToStreamAt +1.8 s after stream end.** Playback:
  https://customer-mwuu1cmlyif6eluy.cloudflarestream.com/ee90ebba017e4a395a96961cea9f77f3/manifest/video.m3u8
  (watch: .../ee90ebba017e4a395a96961cea9f77f3/watch). Frame grabs at t=300 /
  t=620 (logs/p3b-recording-t*.png) show all 8 tiles + advancing clocks;
  in-frame burned clocks prove tiles were 45-75 ms behind the composite clock
  at record time — the archive carries its own latency evidence.
- Driver poll-filter bug (noted, not refixed): "first ready video" matched an
  old fragment; the real asset was polled manually. run-composite.mjs polls
  should filter videos by created > run start.
- CLEANUP: my :8895 server stopped, 0 m2m-p3b-udd chromes, no stray ffmpeg
  (sibling's :8893 server left untouched). Stream: 2-min fragments bc557619 +
  bef618a6 DELETED (were aborted-run accidents), live input 12f3a2dd DELETED
  (404 confirmed) — **recording ee90ebba KEPT and re-verified playable AFTER
  input deletion** (logs/p3b-recording-postdelete-t60.png). Total recorded
  ~14.5 min (kept 10.5). Data: m2m-p3b-{smoke,a,b}.jsonl; tools
  composite.html, composite-viewer.html, run-composite.mjs, analyze-p3b.py;
  live-input JSON + recording metadata in artifacts/ (publish URLs are dead
  credentials now — input deleted).

## P3B verdict (for plan-m2m §5 risk 1)

Composite participant WITHOUT OBS: **works, two-command cheap, archive-grade.**
- Route A (in-page WHIP, pure browser): perfect LIVE path (viewer p50 128 ms
  glass-to-glass from grid pixels) but **records NOTHING** — Stream WHIP
  ingest creates no video assets, ever (26 polls, recording.mode=automatic).
  Use it only for a low-latency confidence/monitor feed.
- Route B (CDP screencast -> ffmpeg -> RTMPS): **the archive path.** Recording
  automatic, duration exact, ready in ~2 s, survives live-input deletion.
  Live playback rides LL-HLS (use the v5 player, not stock hls.js).
- A real show can run BOTH from the same composite tab: WHIP for the 128 ms
  monitor, RTMPS for the archive (~0.6 cores total on an M-series laptop).
- Harden for a show: pull-only SFU session for the recorder (rig publishes a
  tiny presence track), audio mix (WebAudio -> both outputs; untested — this
  rig is video-only), batch tracks/close (G4 carry-over), v5-player the
  confidence view, and fix the videos poll filter.

============================================================================
# P3C SCORE (cue-driven choreography agent — show.html / score.mjs /
# scores/*.json / run-show.mjs / analyze-show.py; port 8893, udd m2m-p3c,
# room `score-show`, results/m2m-p3c-*.jsonl)
============================================================================

## Checkpoint P0 — plan of record (2026-08-26 08:00 EEST)

- Goal: prove an operator "score" (timed cue list, editable JSON artifact) can
  conduct the N=12 tiered grid like a show, via the DEPLOYED Worker only.
- Machine: 100% AC, ports 8893+8897 free, zero sibling rig processes, node
  v25.9, playwright cached. Deployed Worker verified in DEPLOYED.md.
- SEMANTICS DECISION (task item 2): two channels, split by what kind of state
  the command mutates — both already in the deployed Worker, zero changes:
  1. TIER CHANGES (spotlight / duet / demote) = direct operator
     `promote`/`demote` frames. The DO validates the role, persists tier in
     the roster (late joiners see it in their snapshot), broadcasts to all —
     so correctness is assertable against roster state.
  2. VIEW CHOREOGRAPHY (rotate / wave) = `cue` frames `{cmd:'rotate'}`
     (passthrough broadcast + serverAt). Live-page position is per-client
     VIEW state, not roster state — a cue is the honest channel, and it
     reaches every full-view client at once (synchronized crowd sweep,
     which the phase-2 driver faked by poking each probe individually).
- Files (all NEW, mine — grid agent's files untouched, per the room-churn
  precedent of copy-not-edit): show.html = grid.html + (a) `cue` handler
  (rotate/setLivePage/note + one-way propagation telemetry — operator and
  browsers share this machine's wall clock), (b) STAGGERED-UNPULL mitigation
  behind &stag=1 (defer unpulls ~700 ms after the pulls land, then close ALL
  hidden mids in ONE tracks/close renegotiation instead of N serial ones —
  targets the measured 0.6–0.9 s featured-tier gap on 4-tile unpull bursts),
  (c) window.__roster() export for programmatic per-event assertions.
  score.mjs = node WS operator client: joins role=operator, fires the JSON
  score (setup cast + timed events), measures fire drift vs scored offset,
  re-casts any participant that rejoins mid-show (roster fold). run-show.mjs
  = N=12 driver (2 probes view=full + 6 live + 4 wall lites), spawns
  score.mjs with T0, asserts expected-vs-observed state after EVERY event,
  screenshots key moments. Score: scores/demo-score.json — 5 min, 19 events:
  spotlight t+10, rotate t+30, swap-spotlight t+45, wave1 x6 t+60..110,
  duet t+120, solo t+150, reset t+180, wave2 x4 t+190..220, spotlight-X
  t+240, farewell t+270, curtain cue t+285.
- Run plan: smoke (70 s score) vs Worker, then the 5-min show 2x — run A
  stag=0 (baseline waves) + run B stag=1 (mitigated waves): satisfies the
  2x requirement AND is the with/without A/B for wave smoothness (the
  0.6–0.9 s gap reproduced in all 3 phase-2 runs, so cross-run A/B is fair).

# P3A SOAK (phase-3a agent, 2026-08-26)

Mission: 200+-session control-plane soak DIRECT against rtc.live.cloudflare.com
(Worker kept out of the blast radius), find the undocumented ceiling; N=24 media
fleet under control-plane bulk vs the H6 baseline (p50 122.6 / p95 160.9,
100.00% valid, mesh 16.1 s); egress telemetry from getStats vs plan §4 model.
Port 8894, udd prefix m2m-p3a, results/m2m-p3a-*.jsonl.

## Checkpoint P0 — setup ✅ (2026-08-26 07:59 EEST)

- AC power, battery 100%; vm_stat free+inactive+spec ≈ 15+ GB. Port 8894 free.
- Plan: (1) SMOKE: what does sessions/new accept (empty vs datachannel-only
  offer body); lifecycle of a never-connected session (probe +5/+15/+35/+65/+95 s
  — the "PC must connect in 5 s" doc rule may GC these; if so HOLD becomes a
  rolling-replacement hold and time-to-410 is itself the measurement).
  (2) RAMP: 200 sessions in 60 s (doors-open rate ~3.3/s).
  (3) HOLD 600 s: sparse GET poll (each session ~60 s cadence, 10-session fast
  set at 10 s); media fleet N=24 (H6 config exactly) runs INSIDE this window,
  DURATION=300 + driver-side transport-bytes egress sampling.
  (4) PUSH: +200 @5/s → +200 @10/s → +200 @20/s → +200 @40/s (cap ~1200 total),
  stop at first hard error class, characterize (429/Retry-After/1015/5xx).
  (5) GC probe: stop polling, probe samples at +30/+60/+120/+300 s.
- Drivers: run-p3a-control.mjs (direct CF, custom UA — 1010 trap), run-p3a-media.mjs
  (run-heavy.mjs clone: BASE :8894, udd m2m-p3a-udd, + kind:"egress" transport rows).

## Checkpoint P1 — smoke + ramp ✅ (2026-08-26 08:06 EEST)

- sessions/new accepts ALL THREE variants (201): empty body -> {sessionId} only;
  dc-only offer AND audio-recvonly offer -> {sessionId, sessionDescription(answer)}.
- Never-connected session lifecycle (NEW facts): empty-variant flips to
  **410 "Session appears to be disconnected" between +5 and +15 s**; offer-variant
  sits at **425 "Session is not ready yet"** at +5..+95 s, and each GET on a
  not-ready session **BLOCKS ~11 s server-side** before answering (edge holds the
  request — a slow-poll behavior nobody documents). Session records persist
  (410/425 are states, not 404s).
- Fleet variant: dc-offer (fresh SDP per call — exercises SDP processing at
  doors-open rate, the realistic creation cost).
- RAMP ✅: 200 sessions / 60.9 s (3.3/s), **200/200 created, ZERO non-2xx**,
  p50 554 / p90 636 / p99 943 / max 1076 ms. cf-ray shows TLL edge.
- HOLD begun 08:05:20; media fleet N=24 (H6 config, DURATION=300) launched
  INSIDE the hold window at 08:05:26.

## Checkpoint P2 — media under bulk ✅ + egress instrument ✅ (2026-08-26 08:14 EEST)

- **N=24 (exact H6 config) WHILE 200 dc-offer sessions held + ~3.5 blocked GETs/s:
  ALL GATES PASS, statistically identical to the no-bulk baseline.**
  Mesh 16.129 s (H6: 16.1 s); pooled p50 121.7 / p95 161.1 / p99 167.7
  (H6: 122.6/160.9); 100.00% valid both probes (n=193,565, 300 s window vs 90 s);
  46/46 tone pairs 100%; concealment 0.03% both probes (H6: 0.04/0.05);
  qlr none everywhere, pubs fps med 15. API: 24 sessions/new + 70 tracks/new +
  46 renegotiate — ZERO non-2xx, sessions/new p50 277 ms (H6-era class).
  Control-plane bulk has NO measurable media blast radius at this scale.
- HOLD polls: all 1600+ GETs on never-connected dc-offer sessions return 425
  after the ~11 s server-side block; ZERO transitions to 404/410 over 10 min —
  session records do NOT spontaneously vanish (deaths=0), they just aren't
  "ready". alive=200/200 at every heartbeat.
- Egress (driver-side transport getStats deltas, 303 s window, honest local
  instrument — dashboard billing won't show same-day egress):
  fleet wire RX 225.0 MB = 5.93 Mbps = 2.67 GB/h; per pulled participant (V+A)
  0.127 Mbps (= 0.081 Mbps video payload at light 320x180 synthetic + 32.4 kbps
  audio — audio matches §4's 32 kbps EXACTLY); **wire/payload overhead factor
  1.116** (RTP hdrs+RTCP+DTLS+retrans). §4 numbers scaled by 1.116: big show
  658 -> ~734 GB / $32.90 -> ~$36.72 if free tier spent. Caveat: light-class
  video payload (81 kbps) is content-limited far below its 600 kbps target —
  running show-quality N=8 calibration rung during PUSH for the 1.2 Mbps class.

## Checkpoint P1 — rig built + SMOKE vs deployed Worker ✅ FIRST TRY (2026-08-26 08:12 EEST)

- Built: show.html (grid.html copy + 4 deltas: cue handler, batched/deferred
  unpull behind stag=1, __roster() assert export, operators excluded from wall
  tiles), score.mjs, scores/{demo,smoke}-score.json, run-show.mjs (spawns the
  operator as a real node process with a T0; asserts after EVERY event),
  analyze-show.py. Server = grid-server.py on :8893 (static+collector only;
  signaling/SFU/tiles all on the deployed Worker), room `score-show`.
- Operator pre-flight: Worker ACCEPTS promote frames for ids not yet in the
  room (echo comes back) — harmless here (cast fires only after all 12 join;
  a rejoin resets to wall and the operator re-casts), but a production
  console should treat "promote unknown id" as an error, not a silent no-op.
- SMOKE (70 s score, N=12): everything on first try. All 12 running 20 s
  after launch, GRID READY 3.7 s after storm (18 s of t0 lead left).
  **6/6 asserts PASS** (full expected-vs-observed: tier map on both probes +
  livePage fold + pulled set + wall pollers + cross-probe order sync).
  **Fire drift p50 1 / max 3 ms** (wall-clock score; the PDT-synced stage
  cue engine is 65–98 ms — grid choreography doesn't need PDT).
  Cmd→effect: spotlight (wall→featured) **511/512 ms**, swap-promote 681/711,
  rotate page-switch first-new-frame **463–510 ms**, demote→fresh snapshot
  2081/2122 ms (the structural 2.1 s floor again), tier-frame prop p50 46 ms,
  cue prop p50 50 ms. Featured p50 91 / live p50 81 ms, wall fresh p50 1.07 s.
- Context: P3A sibling's fleet live throughout (other-chrome 378–509% CPU);
  one organic watchdog stall + repull recovery in a featured stream.
- Data: m2m-p3c-smoke.jsonl (25k rows; contains ~15 s of operator pre-flight
  residue pre-t0 — analyzer filters it). Next: the 5-min show 2x
  (stag=0 then stag=1).

## Checkpoint P3 — PUSH: no ceiling through 1003 sessions / 40 creates/s ✅ (2026-08-26 08:20 EEST)

- Four push steps ALL CLEAN — 800 more dc-offer sessions on top of the held 200:
  +200@5/s p50 557/p99 1035; +200@10/s p50 538/p99 709; +200@20/s p50 534/p99 706;
  +200@40/s p50 537/p99 849. **ZERO non-2xx across the entire run so far
  (1003 sessions/new + ~1900 GETs). Creation latency FLAT vs count (554->537 ms
  p50 from #1 to #1000) and FLAT vs rate (3.3/s -> 40/s).** No 429 ever, no
  Retry-After, no 1015. The undocumented ceiling is NOT below 1000 sessions /
  40 creates/s on this app.
- Show-quality N=8 calibration rung ran DURING the 5-40/s create storms:
  p50 66.2 / p95 94.5 / 100.00% valid / concealment 0.14-0.15% — IDENTICAL to
  the H3 no-storm baseline (66/96). Zero non-2xx on its 44 media API calls.
  Blast radius of a 40/s create storm on live media: none.
- Show-class egress: video payload 0.311 Mbps (content-limited below the
  1.2 Mbps target — synthetic canvas), audio 32.5 kbps, overhead 1.070.
  Combined with N24 rung: **wire/payload overhead 1.05-1.12; audio = model
  exactly; per-full-quality-pull ~0.48 GB/h vs model 0.45 (+7%)**.

## Checkpoint P2 — THE 5-MIN SHOW 2x: stag0 + stag1, 38/38 asserts ✅; stag=1 v1 flaw found (2026-08-26 08:25 EEST)

- Run A (stag=0, m2m-p3c-stag0.jsonl, 88.5k rows) and run B (stag=1,
  m2m-p3c-stag1.jsonl, 89.1k rows): **19/19 correctness asserts PASS in
  BOTH** (tier map both probes + livePage fold + pulled set == featured ∪
  visible-live + wall pollers + cross-probe liveOrder/page sync, after every
  event). Zero publish retries, zero pull failures, zero reloads, zero
  re-casts needed in either run. Exit 0 both.
- **Score adherence: drift p50 0 / p95 2 / max 3 ms** (both runs; n=38
  fires). Operator echo through the DO p50 40-44 ms. Cue propagation
  operator→all-12 p50 9 ms (run A) / 43 ms (run B) — run-to-run DO variance,
  both ≪ the 100 ms cue-engine polling grain.
- **Cmd→effect (run A baseline)**: spotlight wall→featured cmd→decoding video
  506-534 ms; promote from live tier 521-640; rotate cmd→first new-page frame
  p50 373 ms; demote→FRESH wall snapshot 2052-2068 ms (structural floor
  reconfirmed); tier-frame prop p50 22 ms.
- **The phase-2 unpull-burst gap REPRODUCED at will in run A**: every
  4-unpull/probe rotation (page0→1) put 759-965 ms worst featured-tier gap
  (5 of 6, one 167 ms outlier); 2-unpull rotations 172-608 ms; steady
  baseline p99 101 ms.
- **Run B (batched+deferred unpull): the burst gap is GONE** — 4-unpull
  rotations worst gap 136-198 ms (p50 166), i.e. ~5x better, within 2x of
  steady p99. unpull-batch: 30 calls, durMs p50 170 (vs 4x ~264 ms serial).
- **BUT stag v1 regressed promote latency**: the 700 ms defer lived INSIDE
  the serialized pull chain, so a promote right after a demote queued its
  pull behind the sleep — and repeated reconciles stacked DUPLICATE sleeps:
  e03 promote-video 633→1264 ms, e10 duet 521→2091 ms (chain forensics:
  [unpull, sleep, sleep, pull, sleep]). FIXED as v2: defer via setTimeout
  OUTSIDE the chain + pendingClose dedupe set; batch still serializes when
  it fires. Confirmation run stag1b in flight.
- Second-order finding (e08 forensics, stag1): on pull-heavy rotations the
  remaining featured gap (one 1274 ms instance) comes from the SERIAL PULL
  renegotiations themselves (4x offer/answer back-to-back; last TTFFs 1.4 s).
  Next optimization for a real console: batch the PULLS into one tracks/new
  too (heavy-media already proved multi-track pulls in one call).
- Context: P3A sibling live during run A (other-chrome up to 373%), mostly
  idle during run B (84%) — media numbers unaffected (featured p50 86/83,
  live p50 74/75 both runs).

## Checkpoint P4 — GC + lifecycle + WRAP-UP ✅ (2026-08-26 08:35 EEST)

- **FINAL: 1003 sessions/new (3 smoke + 200 ramp + 800 push) + 2622 GETs,
  ZERO CF-side errors on creation, zero 429/1015/Retry-After EVER.** One
  client-side "fetch failed" (n=1, local socket). NO ceiling found through
  1000 sessions at up to 40 creates/s — risk-2's "200-scale unprobed" is
  now "no ceiling through 1000 @ 40/s".
- GC/lifecycle of never-connected sessions (all raw statuses in the jsonl;
  the driver's printed "gone" was a status==200 misclassification):
  offer-variant records answer **425 (~11 s server-side block) at EVERY age
  probed — +30 s to +26 min, polled or never-polled — zero 404/410/vanish**.
  Empty-variant: 200 (+5 s) -> 410 ~5 s answer (+15 s..+95 s) -> deterministic
  **500 "Backend error" in ~2.1 s by +26 min** (3/3 retries). Production note:
  a 500 from GET sessions/{id} can mean "session long dead", not "SFU down";
  and GET on a not-yet-connected session is expensive (11 s edge hold) —
  don't poll pre-connect sessions.
- Spontaneous deaths over the 10-min hold: **0 / 200**.
- CLEANUP ✅: :8894 server down, 0 p3a chromes (by udd path), 0 drivers,
  udd dirs removed, battery 100% AC throughout, RAM never below 11.85 GB free.
  ZERO new CF resource types (sessions only; ephemeral server-side).
- Data: results/m2m-p3a-{control,media-N24,egress-show8}.jsonl; tools
  run-p3a-control.mjs, run-p3a-media.mjs (run-heavy clone + kind:"egress"
  transport rows), analyze-p3a.py, analyze-p3a-egress.py; logs/p3a-*.log/out.

## Checkpoint P3 — mitigation iterations v2/v3/v4, each measured (2026-08-26 08:38 EEST)

- stag1b (v2: plain setTimeout defer, m2m-p3c-stag1b.jsonl): 19/19 asserts,
  promote regression FIXED (swap 699/717 ms, duet-C 591 ms) — but heavy-wave
  gaps partially RETURNED (672-765 ms on 4/6): the batch now fired ~250 ms
  after the last pull renegotiation; the idle beat, not just the batching,
  is load-bearing. Bonus find: e18 demote→fresh snapshot hit **91 ms** —
  the demoted client's immediate tile-POST won the race against the probe's
  first poll. The "2.1 s floor" is a poll/post race, not physics: a console
  that re-polls ~300 ms after a demote gets sub-second demote confirmation.
- stag1c (v3: defer outside chain + fire only into a quiet chain, idle
  >= 500 ms, re-arm x8): 19/19 asserts, promotes stay fixed (p50 585 max
  810), heavy waves 5/6 in 160-358 ms — but ONE 1362 ms outlier (e09):
  batch fired while probe 2's fresh tile was still PRE-FIRST-FRAME (chain
  idle but decoder not); the renegotiation pushed that TTFF to 1446 ms.
  demote-fresh-snap p50 129 ms this run (immediate-post race won 3 of 6).
- v4 (in flight as stag1d): quiet predicate also requires no pulled tile
  awaiting its first valid frame (bounded by the same x8 re-arm cap).

## Checkpoint P4 — v4 CONFIRMED + WRAP-UP ✅ (2026-08-26 08:50 EEST)

- stag1d (v4, m2m-p3c-stag1d.jsonl): **19/19 asserts PASS**, promotes stay at
  baseline (p50 596 / max 807), heavy waves 9/11 rotations <= 379 ms; the two
  ~1.1 s outliers are NOT the mitigation: e08's gap started 834 ms BEFORE the
  cue fired (the phase-1-documented organic sender-side freeze class) and
  e07's hit one probe only while the other probe's identical batch closed
  gaplessly.
- FINAL WAVE A/B (worst featured-tier gap per rotation, HEAVY = 4-unpull
  burst/probe; 44 scored rotations across 4 shows):
    stag0 (no mitigation):  HEAVY p50 894 / max 965 ms — SYSTEMATIC (5/6
      rotations 759-965); light 172-608. The phase-2 finding, on demand.
    stag1 v1 (batch+defer in-chain): HEAVY p50 166 / max 198 — but promotes
      regressed to 2.1 s (defer blocked the pull chain).
    stag1c v3 (quiet-chain): HEAVY p50 265; one 1362 (pre-first-frame collision).
    stag1d v4 (quiet + first-frame-aware): HEAVY p50 182; outliers organic.
  Verdict: batching tracks/close (4 renegotiations -> 1, durMs p50 170-198)
  + an idle-beat defer ELIMINATES the deterministic 0.6-1.0 s burst gap
  (~5x median improvement, typical gap now within 2x of steady p99 84-97 ms).
  Residual ~1/run outlier = known freeze class + occasional renegotiation-
  during-decode-warmup; next win = batch the PULLS too.
- TOTALS across 5 runs (smoke + 4 shows) vs the deployed Worker: **88/88
  correctness assertions PASS**; fire drift p50 0 / max 3 ms (n=63 events);
  0 publish retries, 0 pull failures, 0 page reloads, 0 re-casts needed,
  0 non-2xx from the Worker /cf proxy (368 pulls+closes); media flat all
  five runs (featured p50 83-91, live 74-81 ms) with the P3A sibling
  swinging 0-509% CPU alongside — the show layer is insensitive to it.
- Screenshots: logs/show-{stag0,stag1,stag1b,stag1c,stag1d}-{1,2}-
  {ready,spotlight,wave-mid,wave-settled,duet,spotlight-X,final}.png —
  spotlight (Y featured beside Perf-Bela), duet (A+C+2 featured, live tier
  clamped to one page), wave mid-sweep (new page half-landed, featured
  undisturbed).
- What a real operator console needs next (measured, not guessed):
  1. Batch PULLS into one tracks/new (serial pull renegotiations are the
     remaining rotation cost: last TTFF up to 1.4 s on 4-pull rotations).
  2. Demote confirmation: re-poll the tile ~300 ms after a demote (the 2.1 s
     "floor" is a poll/post race — measured 91-129 ms when the immediate
     post wins).
  3. Roster echo as command ACK (echo p50 44 ms) + treat promote-of-unknown-id
     as an error (Worker currently broadcasts it silently).
  4. The re-cast-on-rejoin rule (implemented in score.mjs) is load-bearing
     for reloaded tabs; a console should own it.
  5. Expected-state fold + assertions (run-show.mjs pattern) doubles as a
     live "show health" panel: every mismatch we injected was caught.
- CLEANUP: server :8893 stopped (PID file), port free, 0 m2m-p3c chromes,
  0 score.mjs/run-show processes, CF sessions left to expire server-side,
  ZERO new CF resources, room `score-show` state ephemeral on the Worker,
  battery 100% AC end-to-end. Files (all new, mine): show.html, score.mjs,
  run-show.mjs, analyze-show.py, scores/{demo,smoke}-score.json. Data:
  results/m2m-p3c-{smoke,stag0,stag1,stag1b,stag1c,stag1d}.jsonl.
  grid.html / run-grid.mjs / grid-server.py / plan files untouched.

## §4K-SFU-HLS — can the other two delivery paths do 4K? (agent start 2026-08-26 ~10:15 EEST)
Context: MoQ 4K30 proven (47 ms g2g, RUNBOOK §9). Now (A) Realtime SFU with a 3840x2160@30
canvas track (pub4k-room.html + run-4k-sfu.mjs, port 8889, udd m2m-4k-udd-*), (B) Stream
LL-HLS with a 4K30 RTMPS push (own live input only). Machine at start: AC 100%, load1 16.4 —
sibling agents live (moq-audio-* trio + the 4K MoQ publisher moq-4k-pub-udd; NOT touched).
Arms planned: A1 4K30 plain canvas (mirrors the MoQ matrix content), A2 4K30 noise=1 (forces
real ~15 Mbps through BWE — separates encoder-limited from bandwidth-limited), A3 4K15 only
if resolution degrades. Sender knobs per brief: contentHint=detail, degradationPreference=
maintain-resolution, scaleResolutionDownBy=1, maxBitrate 15 Mbps, H.264 codec-pref (same
VideoToolbox class as MoQ). Telemetry all plain fetch (lessons #4/#5).

### Checkpoint 4K-A1/A2 — resolution LOCKS, framerate pays; encoder is OpenH264 SW (10:20-10:24 EEST)
A1 (Playwright chromium): 2160p held for 100% of 1227 decoded frames (probe inbound 3840x2160,
qualityLimitationResolutionChanges=0), fps sagged 30->11, qlr=cpu (73.8s cpu vs 20.5s none),
g2g p50 185 / p95 231 ms, encode 57.2 ms/frame, avg send only 1.2 Mbps (synthetic content,
targetBitrate ~3.4 Mbps still ramping), 0 checksum fails, 0 freezes.
A2 (REAL Chrome, same config): identical signature — 2160p locked, fps ~11-16, qlr=cpu,
encode ~54 ms/frame. NOT a VideoToolbox number. Cause found (web + fmtp evidence): the SFU
negotiation lands on profile-level-id=42e01f (Constrained Baseline) and Chrome/mac maps CB
-> OpenH264 SOFTWARE; VideoToolbox hw is only behind High/Main profiles. WebCodecs (MoQ rig)
could ask prefer-hardware directly; WebRTC can't — but setCodecPreferences with High-profile
(64xxxx) first should route hw. -> A3 codec=h264hi arm. encoderImplementation string hidden
(Chrome stats gate: page must be capturing) — gum=keep (fake device, camera untouched) next arm.
degradationPreference=maintain-resolution WORKS as specified: resolution never gave an inch.

### Checkpoint 4K-A3 — SDP smoking gun: the SFU strips hw-encodable H.264 (10:28-10:31 EEST)
codec=h264hi arm: Chrome's offer lists High-profile H.264 FIRST (PT 118, 64001f — the
VideoToolbox-only entry; caps even show 640034 = High 5.2). CF's ANSWER keeps ONLY
profile-level-id=42e01f CB H.264 + VP8 + AV1 + VP9 + H265 (artifacts/pub4k-{offer,answer}-p.sdp).
Chrome maps CB H.264 -> OpenH264 SOFTWARE (encoderImplementation now visible via gum=keep:
"OpenH264"; probe's own 360p track shows libvpx). => Over this SFU, hw H.264 is UNREACHABLE
from Chrome/mac. The answer DOES carry H265 (PT 49) and Chrome offered it -> possible
VideoToolbox path via H.265 -> arm A4 codec=h265.

### Checkpoint 4K-A4 — H.265 = VideoToolbox HW over the SFU, negotiated first try (10:33 EEST)
codec=h265 -> answer takes H265 (profile-id=1, level-id=186), encoderImplementation
"VideoToolbox", 2160p locked. fps oscillates 12-26 with qlr flapping none<->cpu (hw encoder,
so the cpu-adaptation is reacting to the whole send pipeline: 4K canvas capture + ARGB->I420
conversion, not OpenH264). totalEncodeTime misleading for async hw (228 ms/frame includes
queue wait). g2g mid-run noisy 150-800 ms. Full numbers after run end.

### Checkpoint 4K-A4 final numbers (run 10:33-10:35 EEST, 90 s)
H265/VideoToolbox: 2160p locked 1618/1618 frames; steady fps median only 14.5 (min 1 during
ramp, max 33); qlr cpu 70.7s/none 31.7s, resChanges 0; g2g STEADY p50 210 / p95 681 / p99 871 ms
— hw encode but WORSE tail than OpenH264 (Chrome's H265 send path queues: totalEncodeTime
193 ms/frame incl. async queue wait). Decoder side: VideoToolboxVideoDecoder hw, 1 freeze 0.24s,
pli 10. avg send 1.17 Mbps (synthetic), targetBitrate 2.4 Mbps, BANDWIDTH LIMITATION 0.0 s.
=> Chrome/mac WebRTC cannot do clean 4K30 with ANY codec the SFU accepts; the wall is the
browser send pipeline (sw encoder for CB H.264; queued hw path for H265), never the SFU
(which forwarded 2160p flawlessly in all arms) and never bandwidth (qlDur.bandwidth=0 in
every arm). A5 = 4K15 test running.

### Checkpoint 4K-A5 + SFU matrix COMPLETE (10:35-10:37 EEST)
A5 4K15 CB-H264: even 15 fps does not hold — steady fps 10 (Chrome cpu-adaptation backs
OpenH264 off further than its 18 fps ceiling), 2160p locked 1040/1040, g2g STEADY p50 205 /
p95 241. Zero loss, zero freezes, decode hw (VideoToolboxVideoDecoder).
SFU 4K MATRIX (all arms: 2160p locked, resChanges 0, qlDur.bandwidth 0.0 s):
| arm | codec/enc | steady fps (target) | g2g p50/p95 ms |
| A1 4K30 chromium | CB-H264/OpenH264 sw | 11 (30) | 185/231 |
| A2 4K30 chrome | CB-H264/OpenH264 sw | 12 (30) | 217/261 |
| A3 4K30 hi-pref | SFU forces CB -> OpenH264 | 13-14 (30) | 164/249 |
| A4 4K30 h265 | H265/VideoToolbox HW | 14.5 (30) | 210/681 |
| A5 4K15 | CB-H264/OpenH264 sw | 10 (15) | 205/241 |
vs 720p SFU baseline p50 74-95 ms and MoQ 4K30 47 ms / 30 fps (same machine, RUNBOOK §9).

### Checkpoint 4K-B1 — Stream HLS: 4K ingest ACCEPTED, output CAPPED at 1080p (10:37-10:38 EEST)
Own input 8c1e9933855ea875e64cdfe6c82f9141 (elektron-4k-hls-test, preferLowLatency true,
recording automatic — REQUIRED for live playback manifests; brief said "recording off" but an
off-mode input has no playback URLs to measure). Push: ffmpeg@7 (ffmpeg 9 dropped
-filter_script), testsrc2 3840x2160@30, x264 superfast High 5.1 CBR 13 Mbps, GOP 60, epoch
burn-in. RTMPS ACCEPTED 4K30: connected in 4 s, manifest 200 in 16 s (push 07:37:53Z,
connected 07:37:57Z, master 200 at 07:38:09Z). ffmpeg ~138% cpu, sustained realtime.
HLS master renditions: 426x240, 640x360, 854x480, 1280x720, TOP 1920x1080 (avc1.640028,
BANDWIDTH 15.08 Mbps) — NO 2160p. DASH heights identical (1080 max, ~14 Mbps top).
Top-rendition frame grab measures 1920x1080 (ffprobe of stream: h264 High L4.0 30 fps).
=> Cloudflare TRANSCODES 4K down; delivery ceiling 1080p. AND: child playlist carries NO
LL-HLS PART/SERVER-CONTROL tags (2.0 s full segments, TARGETDURATION 3) despite
preferLowLatency=true — 4K input appears to also drop the LL tag set (720p rig had it,
plan.md §2.1). Recording video id de0bf8a2110916bd302e006f1d9590f8 (delete at cleanup).

### Checkpoint 4K-WRAP — verdicts + cleanup ✅ (10:41 EEST)
BONUS: the VOD recording of the 4K broadcast ALSO tops out at 1920x1080 (same 5-rung ladder),
and CF's video object records input {width:3840,height:2160} — proof the full 4K reached them.
VERDICTS:
(A) SFU: transport carries 2160p intact (every arm: received 3840x2160, 0 res switches,
qlDur.bandwidth=0) but Chrome/mac CANNOT FEED it at 30 fps: the SFU only answers CB H.264
(42e01f -> OpenH264 sw, 54-57 ms/frame -> 10-14 fps) and strips the hw High-profile offer;
H265 negotiates VideoToolbox hw but Chrome's H265 send path queues (steady 14.5 fps, p95
681 ms). Locked-2160p-at-<=15fps, g2g ~165-217 ms p50 vs 74-95 ms 720p baseline. 4K stage
feed over the SFU: NO (not at 30 fps from a Mac browser).
(B) Stream HLS: RTMPS accepts 4K30 fine (live in 16 s, zero errors) but delivery is
TRANSCODED-CAPPED at 1920x1080 (HLS+DASH+VOD; no docs page states this — stream-live/limits
404s, FAQ recommendations stop at 1080p). 4K stage feed over Stream: NO (1080p ceiling).
The only path that delivers real 4K end-to-end remains MoQ (47 ms, RUNBOOK §9).
Cleanup: input 8c1e9933… + recording de0bf8a2… deleted (404 verified), 4 pre-existing inputs
untouched; port 8889 freed; m2m-4k udd chromes killed; own ffmpeg killed; siblings verified
alive (moq-4k publisher encFps 30.0, moq-audio-* running). Files: pub4k-room.html,
run-4k-sfu.mjs, analyze-4k.py; results/m2m-4k-sfu-a{1..5}-*.jsonl, results/hls-4k-2026-08-26.jsonl;
SDP evidence artifacts/pub4k-{offer,answer}-p.sdp; screenshots logs/4k-*-{mesh,final}.png.
