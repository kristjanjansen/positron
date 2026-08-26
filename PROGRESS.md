# Progress log — 2026-08-25 → 26

## Session 5 dispatch (2026-08-26) — heavier WebRTC tests (user request)

Two agents on proto/m2m, machine idle/32 GB/AC at dispatch:
- **Heavy media** (owns room.html, run-heavy.mjs, port 8897, results/m2m-heavy-*):
  audio+video per participant (grid has never carried audio), show-quality 360p30
  rung, 720p featured-tile mix, then max-N 24→30→36 via multi-context RAM strategy
  (co-tenancy validated against separate-instance baseline first). Notes section
  "HEAVY MEDIA".
- **Churn + endurance** (owns room-churn.html copy, run-churn.mjs, port 8896,
  results/m2m-churn-*): implements the publish-leg connect-retry (production
  deliverable from the N=20 storm flake), 30-min soak w/ leak+drift tracking,
  rotating-grid pull/unpull churn (plan-m2m risk 4), ungraceful leave + rejoin
  storms (measure the real dead-track GC), publisher kill + auto-reconnect. Notes
  section "CHURN".
Both: poll own run state (no notification waits), canvas/WebAudio only (camera
still wedged), own-udd kills only, no plan edits.

## Session 5 phase-2 dispatch (user: "do it") — production m2m layer

Two agents:
- **Worker/DO** (owns workers/rtc/): RtcRoom DO (hibernation patterns from cues;
  `left` broadcast = the death detector phase 1d proved necessary) + /cf/ SFU
  proxy holding the app secret + snapshot-tile store (Cache API, wall tier of the
  big-grid design) + ROOM_TOKEN auth. Deploys to workers.dev (authorized), writes
  workers/rtc/DEPLOYED.md for the sibling, measures signaling latencies incl.
  socket-close→left-broadcast (replaces the 31–47 s SFU GC).
- **Grid UI** (owns proto/m2m/grid.html, run-grid.mjs, port 8897): three-tier grid
  (2 featured + live page w/ pull-on-visible + snapshot wall), connect-retry from
  room-churn.html, death badges, promote/demote live transitions. Validates N=12:
  per-tier latency, rotation TTFF, kill→left→dead-tile time, wall→live promotion,
  rejoin. Polls for DEPLOYED.md; local stub until then.
USER DIRECTIVE: when phase 2 done → report → proceed to PHASE 3 (200-session
control-plane soak + cost telemetry; recording composite WITHOUT OBS via headless
grid → WHIP → recorded Stream input; cue-driven rotating-grid choreography;
30-min time-boxed MoQ browser spike).

### Safari MoQ rig (user request) — ✅ DEPLOYED; desktop Safari OBSERVED PLAYING
- URL: https://elektron-moq-safari.kristjan-jansen.workers.dev (Worker + beacon
  sink → wrangler tail shows any device's session). H.264 publisher LEFT RUNNING
  on this Mac (stop: pkill -f moq-safari-pub-udd; pkill -f pubserver.py; dies on
  sleep/reboot — restart block RUNBOOK §8.6).
- ✅ TRAP: @moq/net UA-blocks ALL Safari (safari:"<0", WebKit bug 319818) → fixed
  by passing a self-built WebTransport. Then Safari 26.6.2 connected in 131 ms
  and played 4 min / 0 errors (background-throttled). Chromium proof vs deployed
  URL: 33 ms p50 g2g. iPhone + foreground verdicts = user at the keyboard.

### Phase 3c choreography — ✅ A JSON SCORE CONDUCTS THE GRID; PHASE 3 COMPLETE
- ✅ 4 full 5-min shows + smoke via the deployed Worker: 88/88 correctness
  assertions, zero errors in ~370 SFU calls. Score-time drift p50 0 / max 8 ms —
  wall-clock scores need no PDT machinery.
- ✅ cmd→effect: spotlight 0.5–0.6 s; rotate 0.4 s; tier-frame prop 22–49 ms;
  demote confirm 91–129 ms when the snapshot POST wins the race (2.1 s "floor"
  was a race, not physics).
- ✅ Unpull-burst gap FIXED (3 measured iterations → batched tracks/close fired
  only into a quiet chain): featured-tier wave gap 894 → 136–200 ms typical (~5×).
  Two failed intermediate designs documented (defer-in-chain regressed promotes;
  timer-outside-chain regressed gaps — the idle beat is load-bearing).
- Semantics: tier changes = DO-validated promote/demote frames; view choreography
  = cue passthrough. Worker used exactly as deployed, zero changes.
- Operator-console backlog in NOTES §P3C. Artifacts: scores/demo-score.json,
  score.mjs, show.html, run-show.mjs; data results/m2m-p3c-*.jsonl.
- **PHASE 3: all four tracks complete.** plan-m2m §6 updated; remaining items
  re-labeled phase-4 backlog.

### Phase 3b composite — ✅ ARCHIVE-GRADE RECORDING WITHOUT OBS
- ✅ Route B (CDP screencast → ffmpeg → RTMPS): 0 dropped frames, recorded
  duration exact, VOD ready 1.8 s after end, ~0.6 cores total. Proof VOD kept:
  ee90ebba017e4a395a96961cea9f77f3 (/watch on the customer host). Burned rows
  decode at 100 % from the recording — the archive preserves latency evidence.
- ✅ PLATFORM FACT direct-tested: WHIP ingest records NOTHING (recording-enabled
  input, 183 s, zero assets) — Stream-WebRTC is delivery-only; plan.md §2.2
  updated. Route A (in-page WHIP) = live monitor at 128 ms g2g; both outputs can
  run from one tab.
- Composite chain: grid→composite 58–60 ms; grid→live-viewer full chain 128 ms
  p50 (one extra WebRTC hop ≈ one 74 ms unit, as modeled). Stock hls.js parked
  at 10 s on the RTMPS leg — v5/v6 player mandatory for live composite viewing.
- Hardening list NOTES §P3B; plan-m2m §5 risk 1 SOLVED. Live input deleted;
  ~10.5 min stored (under budget).

### Phase 3a soak — ✅ NO CEILING THROUGH 1003 SESSIONS @ 40/s; cost model +7–12 %
- ✅ 1003 creates + 2622 GETs direct to the SFU: zero CF errors, latency flat
  (p50 ~530–570 ms every bucket), 0/200 spontaneous deaths in 10 min.
- ✅ Media under bulk: N=24 inside the hold and N=8 during the 40/s storm =
  baselines exactly (100 % valid, n=193k). Control-plane blast radius: none.
- ✅ Egress: audio 32 kbps on the nose; wire overhead ×1.05–1.12; big show
  ≈ $35–37 vs modeled $32.90. ⚠️ 1 Mbps/cam needs real-camera content to pin.
- Lifecycle traps: never-connected sessions answer 425 with an ~11 s edge-slot
  block per GET; old dead sessions eventually GET 500 ("long-dead", not outage).
- plan-m2m §5 risk 2 CLOSED. Data results/m2m-p3a-*.jsonl; NOTES §P3A.

### MoQ MEDIA spike (user: "analyze moq stuff") — ✅ BROWSER VIDEO AT 26 ms
- ✅ hang-on-both-ends through CF draft-14: canvas→WebCodecs VP8 720p30 → relay →
  VideoDecoder. **Glass-to-glass p50 26.2 / p95 42.4 ms, n=2740, 30.3 fps flat,
  0 errors.** ~3× faster than WebRTC 74 ms (+8–16 ms vsync for fairness). Fastest
  browser path in the project. Robust under load-avg-74 contention.
- ❌×2 cross-ecosystem (hang↔moq-pub/moq-sub): fails at ONE layer — catalog
  conventions (catalog.json/legacy vs .catalog/WARP/CMAF). Raw @moq/net pulled
  WARP catalog + live CMAF into the browser fine → ~100-line shim feasible.
- Platform data: CF never redelivers closed groups (republish catalog every 2 s;
  join ≈1.0 s); no pending-subscribes (retry needed); optimistic SUBSCRIBE_OK
  then ~10 s close. draft-16 NOT auth-only (SUBSCRIBE_NAMESPACE fixes discovery).
- RUNBOOK §7; results/moq-media-e1.jsonl; 16 min active. plan-m2m §1.C + plan.md
  §2 table updated: MoQ = real candidate for the grid's live tiers.

### Phase 3d MoQ browser spike — ✅ POSITIVE, in 8 minutes
- ✅ `@moq/net` (kixelated, npm) speaks IETF MoQT to CF's draft-14 relay from
  headless Chrome: compat CLIENT_SETUP negotiated `moq-transport-14`, subscribe +
  live objects received, 125 ms to session, 15/15 frames. The "moq-lite ≠ IETF"
  research conclusion was stale — the lib ships an IETF adapter (drafts 14–19).
- Next spike when wanted: media layer (hang catalog vs moq-catalog) + draft-16
  once the dashboard relay exists. RUNBOOK §6 has the repeatable recipe.
  plan-m2m §1.C rewritten: "transport proven, media layer = next experiment".
- Traps: ThreatLocker SIGKILLs npm's esbuild → bundle in Docker; `docker run |
  head` detaches containers. Scratch kept at rig/moq/spike/ (disclosed).

### Phase 2 — ✅ COMPLETE (both agents, validated against deployed Worker)
- Worker `elektron-rtc` live: RtcRoom DO + SFU proxy + tile store + token auth.
  join→roster 33 ms, publish→broadcast 38 ms, kill→`left` 38–126 ms (vs 31–47 s
  SFU GC). Worker proxy FASTER than local python proxy (257 vs 413 ms).
- Grid N=12 vs Worker: featured 98 / live 78 ms, wall 1.1 s, 100 % valid;
  rotation TTFF 330 ms; kill→dead-tile same-frame; spotlight promote →video 0.5 s;
  rejoin ~3 s. Screenshots verify the UI.
- Discovered + fixed: deterministic retry backoff causes lockstep retry storms
  under real ICE degradation → jitter added. Discovered, deferred: unpull bursts
  put 0.6–0.9 s frame gap on featured → batch tracks/close (phase 3).
- plan-m2m §6 phase 2 updated. Dispatching PHASE 3 (4 agents) per directive.

### Churn + endurance — ✅ COMPLETE: stable 30 min, failure lifecycle measured
- ✅ Soak N=8: zero latency drift (−0.04 ms/min), no RSS leak, 8/8 tracks alive,
  zero spontaneous renegotiations; tail-of-soak wobble attributed to sibling CPU
  contention (⚠️ correlation, not isolation).
- ✅ Rotating grid: 348 API calls / 0 errors; tile-switch TTFF p50 523 ms;
  untouched tiles unaffected → plan-m2m risk 4 retired.
- ✅ Dead publishers emit NO track-level events — tiles freeze silently; session
  410s at +31–47 s. Death detection = RtcRoom `left` + stats-stall watchdog.
- ✅ Publisher kill → restored ~3.9 s (would be ~2 s with DO push vs 2 s poll);
  rejoin storm of 4 → 4–16 s. Connect-retry organic fires: 7/7 recovered on
  attempt 2, inert on happy path — load-bearing, shipped in room-churn.html.
- Instrument lesson #5: fetch keepalive has its own ~64 KB quota (sendBeacon's
  lesson, second verse). plan-m2m §5 risk 4 + §6 phase 1d updated.

### Heavy media — ✅ COMPLETE: N=54 with audio, still no SFU ceiling
- ✅ Audio first try: FFT-verified tones 106/106 pairs at N=54, concealment ≤0.39 %.
- ✅ Show-quality 360p30 is FASTER than lightweight (p50 66 vs 123 ms — frame-
  interval quantization); 720p featured tiles degrade nothing.
- ✅ Co-tenancy clean (+5 ms, RAM −58 %) → N=54 = 106 tracks on one PeerConnection,
  SFU p50 flat 122–137 ms, ~1500 API calls / one transient 500.
- ✅ Publish/connect retry IMPLEMENTED in room.html; absorbed all ICE storm flakes
  (9/46 legs at N=48 — a 30-way storm without retry ≈ 1-in-2 fatal).
- Production asks recorded: end-to-end video-sanity heartbeat (sender emitted
  corrupt frames 110 s while its own getStats read healthy); viewer fan-in
  saturates page rAF (4–7 fps ~100 tracks) before decode fails.
- plan-m2m §5 risk 2 + §6 phase 1c updated. Data results/m2m-heavy-*.jsonl (23).
- Churn agent: parked once on a monitor wake that never fires (5th occurrence
  today); resumed by main session mid-soak.

---

## Session 4 dispatch — v6 + last mysteries + MANY-TO-MANY track (user: "update plans,
## solve mysteries, new plan and prototypes for many-to-many video")

Five agents running. Machine at dispatch: AC, battery 91%, zero rig processes,
camera still WEDGED (all agents banned from avfoundation — lavfi/canvas only),
clock ~+55 ms slewing. `.env` was found to already hold CF_REALTIME_APP_ID/SECRET —
a Realtime SFU app exists, so the m2m prototype goes straight to building.

Ownership map (ports, notes, inputs):
- **v6 player**: apply CONFIG-ARM-NOTES fix diffs → src/low-latency-player.js
  (v5 backed up to src/low-latency-player.v5.js), chaos ladder + SIGSTOP validation
  vs v5 traces, Q6 confirmation in passing. Own input, port 8899, notes rig/V6-NOTES.md.
- **Part-2-late anomaly**: encoder-arm discrimination (zerolatency/GOP/pacing) with
  edge-lag-blocking.py per-part stats. Own input, port 8898, notes rig/PART2-NOTES.md.
- **WHIP-ffmpeg interop (plan §8 Q3)**: ffmpeg 9 -f whip → whep-rig input
  (224558e8…), playback-verified via WHEP. Port 8896, notes rig/whep/WHIP-FFMPEG-NOTES.md.
- **M2M plan**: research Realtime SFU + alternatives, owns NEW plan-m2m.md.
  No processes.
- **M2M SFU prototype**: 3-way burned-pixel latency through the existing Realtime
  app, owns NEW proto/m2m/, port 8897, notes proto/m2m/NOTES.md.

All agents: checkpoint after every step; kill only own processes by own stream-key/
profile patterns (broad pkill banned after session-3 cross-kills); no plan.md/
PROGRESS.md edits (main session merges).

### WHIP-ffmpeg interop (Q3) — ✅ COMPLETE (first back, ~6 min): works out of the box
- ✅ ffmpeg 9.0.1 `-f whip` → CF Stream: handshake clean (answer 1.4 s, streaming in
  2.8 s), BOTH baseline `42001f` and default-High `64001f` accepted — CF echoes the
  offered fmtp verbatim; the docs' `42e01f` is not a negotiation gate. Playback
  frame-verified twice via WHEP (live frame counters matched elapsed time).
- Working command + SDPs + logs: `rig/whep/WHIP-FFMPEG-NOTES.md` + artifacts/.
  Quirk: teardown DELETE logs a cosmetic read error, exit 0.
- **m2m unlock: a stationary studio ffmpeg feed can publish into the same WebRTC
  world as browser participants, today, with stock homebrew ffmpeg.** ⚠️ Lenient
  profile matching is CF-specific — retest per SFU. plan.md §3.3 + §8 Q3 updated.

### M2M plan — ✅ COMPLETE: plan-m2m.md written (§0–§6, provenance-tagged)
- Recommended: **hybrid** — Realtime SFU grid (selective pull, simulcast rid per
  tile size) + stage stream unchanged + `RtcRoom` DO beside workers/cues for
  roster/publish frames (SDP never touches signaling; thin secret-holding Worker
  proxy to build). 📄 Key validation: Stream WHIP/WHEP has run ON this SFU since
  2025-03-13 — our ✅ 74 ms number already measured its media plane.
- Rejected with numbers: N× Stream inputs (no simulcast/recording, $58–270/show),
  P2P mesh (uplink math dies ~N≈10), MoQ grid (no draft-16 browser client).
- Cost (2 h show, post-free-tier): ~$4 workshop-10 / ~$9 intimate-40 / ~$33
  big-show-225 with simulcast ($91 without). Free tier absorbs ~12 workshops/mo.
- Top risks: no SFU recording (grid archive = composite participant via the
  ✅-built OBS Option C path); undocumented session/rate ceilings; **the two-clock
  problem** — grid at 0.1 s vs HLS stage at 2.4–4 s means stage viewers hear the
  room react seconds early; needs a human rehearsal test.
- Phase 2: RtcRoom DO + proxy Worker + grid UI, chaos + browser matrix + join-storm;
  Phase 3: 200-soak, recording composite, cue-driven grid choreography, 30-min MoQ
  browser spike (moq-lite forward-compat claim vs repo research conflict).

### v6 player — ✅ SHIPPED + VALIDATED: the park is fixed, 2.4–4.3× faster recovery
- ✅ Same-day A/B vs a v5 re-run (historic "15.4 s median" ⚠️ not reproducible from
  the old jsonl — honest baseline re-measured): SIGSTOP-20 park max 13.5 s vs
  19.5+18.0 s, ZERO hls.js gap-controller rescues (all recoveries v6's own),
  post-CONT stable in 13.2–23.5 s vs 56.4 s. Ladder 15/15, no storms, no crashes.
  Soak p50 2.70 s, zero incidents. 3 iterations (beached fast path;
  one-skip-per-target guard vs skip↔drift ping-pong).
- ✅ Q6 CONFIRMED: targetLatency +1.0 s per stall, rebuild resets; 9–11 s jump when
  a post-swap manifest briefly drops LL tags. PDT reads negative ~−1.6 s after -re
  backlog bursts (CF re-stamps ahead of wall).
- ⚠️ Platform weather: post-swap 404 propagation was 45–120 s today vs historic
  10–15 s — the dead-manifest window varies by day; historic value is a floor.
- Files: src/low-latency-player.js (v6), .v5.js backup, rig/resilience-v6.html A/B
  harness, rig/V6-NOTES.md (12 checkpoints), results/resilience-v6.jsonl. Cleanup
  verified (input deleted, port 8899 free, own kills only).

### M2M scale ladder (user: "test more participants") — ✅ NO CEILING THROUGH N=20
- ✅ 8→12→16→20 (N−2 lightweight publishers + 2 probes pulling all tracks on one
  PC each): valid ≥99.58 % every rung, **p95 pinned ~158 ms at every N** — latency
  flat with participant count. Zero API errors in ~370 calls, no 429s. A probe
  decoded 19 simultaneous pulls at ~55 % of one core. Local bottleneck: RAM
  (~800 MB/Chrome → 15.9 GB at N=20), never CPU.
- Two production notes: 1-of-3 twenty-way join storms had a publisher whose
  ICE/DTLS never connected (→ publish leg needs connect-timeout retry) and one
  storm saw a uniform ~3.4 s stall on all sessions/new (⚠️ DNS/edge queueing).
- Instrument save #3 this project: sendBeacon's 64 KB quota silently dropped
  probe batches at N=20 (N=16 was just under) — switched to fetch(). Forensic
  attempt data kept. New: proto/m2m/{run-scale.mjs,analyze-scale.py}, data
  results/m2m-scale-*.jsonl. plan-m2m §5 risk 2 + §6 phase 1b updated.

### M2M SFU prototype — ✅ COMPLETE: many-to-many PROVEN at WHEP-class latency
- ✅ 3-way full mesh through the existing Realtime app ("flabbergaster"): 6/6
  directed pairs, 100 % checksum-valid (n=14,551), pooled p50 96.9 / p95 125 ms
  glass-to-glass. 5-way stretch: 20/20 pairs, p50 91.6 ms — no degradation.
  2-way = 74.2 ms, statistically identical to the WHIP→WHEP baseline (same SFU,
  as plan-m2m predicted). Participant id burned into pixels → attribution verified.
- CPU modest (20–28 % core/browser), qualityLimitation none; single-machine limit
  is the canvas rAF loop (~8–10 synthetic participants/laptop).
- Phase-2 traps recorded: CF 1010-blocks urllib's default UA; register
  mid→participant BEFORE setRemoteDescription. One 3.1 s sender-side freeze seen
  once, identical at all receivers.
- proto/m2m/ complete with README + how-to-run; zero new CF resources; cleanup
  verified. plan-m2m.md §6 phase 1 marked done with numbers.

### Part-2-late anomaly — ✅ SOLVED: CF segmenter hold-and-release, encoder exonerated
- ✅ Verdict from 3 arms × n=70 + a decisive local FLV byte-timing tap (~12.5k tags):
  encoder emits every part within ±23 ms of schedule, Send-Q never pools, yet the
  edge holds the playlist 0.9–1.75 s ONCE per 2 s segment and publishes the back
  half in one write. Hold phase set per broadcast (that's why it looked like
  "part 2"); period 2.00–2.06 s in every broadcast. GOP=15 and lookahead-restored
  arms changed nothing.
- ⚠️ Implication: newest-part age at the edge oscillates 0.8–2.0 s → stall-free
  players must ride ~p95 ≈ 2 s — partly explains the tuned 2.4–2.5 s floor; no
  encoder tuning helps. Agent notes it stalled once mid-run waiting on a
  notification (recurring session-4 agent failure mode; resumed by main session).
- Cleanup verified: input deleted, port 8898 free, own kills only. New tools
  rig/push-part2.sh, part2-flv-tap.py, part2-{analyze,tap-analyze}.py; EDGE_LAG_UID
  env override added to edge-lag-blocking.py. Data results/part2-*.jsonl.

---

## Session 3 — resumed on AC power (~13:4x)

All five agents re-dispatched per the ownership map below, each continuing from its
notes file. Machine at resume: AC power (battery 1% charging), no leftover rig
processes (the idle collector2.py is gone too), camera state unknown until re-probe.
**Clock: +159 ms** (drifted from +21 µs; sudo unavailable to re-step) — edge-lag agent
corrects via sntp sampling; loop-lag and WHEP are same-machine so offset cancels.

### Item 6 (WHEP) — ✅ COMPLETE (first agent back, ~15 min)
- ✅ **Glass-to-glass 73.6 ms p50 / 83.1 ms p95** (n=8079, 300 s, 720p30@2.5 Mbps,
  burned-pixel binary row, zero clock error, all samples visible). ~40× faster than
  tuned LL-HLS. WHIP and WHEP both connected first try.
- ✅ **abs-capture-time REFUSED at negotiation** by CF on both legs (answer SDP omits
  the extmap; 0/8079 samples had captureTime) — answers plan §8 Q4: burned-pixel or
  side-channel timing is mandatory for WebRTC measurement.
- One rig bug found+fixed (double-stringified beacons dropped all rows) — instrument
  checked before conclusions, again. Details: `rig/whep/NOTES.md`, data
  `results/whep.jsonl`, SDPs `rig/whep/artifacts/`. Input `whep-rig` left in place.

### MoQ — ✅ COMPLETE, end-to-end PROVEN without dashboard access
- ✅ **Draft-14 endpoint has no auth at all** → full pub→CF relay→sub test ran today:
  clock ticks 44/44, **one-way p50 17.9 ms / p95 61 ms**; media path (ffmpeg fMP4 →
  moq-pub → relay → moq-sub) delivers a valid mp4. Draft-16 auth enforced (403-style
  `scope resolution failed` without token).
- ✅ **ThreatLocker strikes again**: SIGKILLs every freshly *compiled* binary (proved
  with a 1-line C program) — native cargo build impossible; moq-rs built in Docker
  (both branches, ~1 min each). Correction: rust was already installed via brew
  rustup (May 2026) — NO machine change made.
- ✅ Relay replays the open group from its start on join — live-edge-only is softer
  than it sounds (current GOP from first frame). But no FETCH/GOAWAY means reconnects
  lose history and relay maintenance = hard drop → the gapless-relay pattern matters
  MORE on MoQ, not less.
- Runbook complete: `rig/moq/RUNBOOK.md` (dashboard click-path §3, commands §4,
  risks §5). Trap logged: Docker VM clock was 8.5 h behind after the sleep — resync
  documented. Remaining: USER provisions draft-16 relay (tokens shown once).

### Item 7 (edge-lag) — ✅ COMPLETE: true edge lag is ~842 ms, polling lied by +2.3 s
- ✅ Blocking reload (`_HLS_msn`/`_HLS_part`) via new `rig/edge-lag-blocking.py`:
  **p50 842 ms / p95 1951 ms / p99 2191 ms** (n=140, two runs agreeing within 12 ms,
  clock-corrected ±25 ms). Blocking verified real (block-time p50 ≈ part cadence).
- ✅ Polling head-to-head read p50 3.13 s = +2.28 s over truth. Cause observed:
  edge REPLICA DIVERGENCE — consecutive GETs 400 ms apart hit replicas of different
  freshness (PRELOAD-HINT went backwards; staleness alternated 0.8↔2.7 s). §1
  headline rewritten; the old "~1 s lower bound" story retired.
- ✅ Replicated oddity: part 2 of every segment publishes ~600 ms late (back half of
  each 2 s segment lands as one burst). Cause undetermined.
- Clock: offset moved +158 → +55 ms mid-session (timed slewed after AC returned) —
  the pre/post sntp bracketing was necessary, corrections ~−55 ms applied.
- ⚠️ Cross-agent friction again: encoder killed 3× (broad pkill from the relay
  agent's harness suspected); survived via stream-key-scoped babysitter. ThreatLocker
  reconfirmed: renamed binaries are silently killed. `push-llhls.sh` got two minimal
  env-override fixes. Teardown clean; notes `rig/EDGE-LAG-NOTES.md`.

### Item 9 (config-arm + 26 s park) — ✅ COMPLETE, both mysteries closed
- ✅ **M1: constructor throw.** The arm set `liveMaxLatencyDurationCount` without
  `liveSyncDurationCount`; hls.js validates user config only → synchronous throw
  AFTER telemetry intervals registered → the silent empty-batch signature. Proven in
  node + headless Chrome with onerror capture. Rate-catch-up "mystery" (plan §8 Q5)
  was the same bug. Recommended arm: seconds-based `liveSyncDuration:1.5,
  liveMaxLatencyDuration:6` → 2.4–2.5 s as a pure config line (count-based pair
  silently overrides PART-HOLD-BACK → 9 s target).
- ✅ **M2: the readyState gate park, measured twice.** Post-resume drift-seek fires
  into the buffer hole → readyState 1 → tick()'s paused/readyState<2 gate disarms
  ALL watchdogs while resetting the stall clock; parked 20.0 s and 18.5 s until
  hls.js's gap controller rescued. Plus measured: stale hls.latency during outages
  (1.7 s reported vs 8.4 s true), syncToEdge silent-false with nudge skipped,
  visibility path never calls play(). ⚠️ Historic instance attribution inferred
  (never persisted). **Fix diffs described, NOT applied** — notes checkpoints 8+10.
- Cleanup verified: input f46a8c21… deleted, port 8898 free, own processes killed by
  own patterns only. New rig assets: `rig/config-arm-debug.html`, `config-arm-resume.html`.
- Cross-agent scar (their checkpoint 6 ops note): a sibling's
  `pkill -f 'rtmps://live.cloudflare.com'` killed this agent's encoder too — broad
  CF-push patterns are NOT safe kill targets when agents run in parallel.

### Item 2+8 (relay handover + loop-lag) — ✅ COMPLETE (slate tier; webcam walk owed)
- ✅ **Four-phase handover PASS**: one videoUID `f507c108…` across phases 0–3, real
  content switching in grabbed frames, 4 clean splices, zero discontinuity storms.
- Two NEW splicer defects (ledger → 10, both fixed in splicer.py): **#9** the burned
  CLOCK never rendered (over-escaped colons broke the whole drawtext; the "cosmetic
  SyntaxWarning" was hiding a blank clock, and the ms field was stream-time not wall
  clock — would have poisoned loop-lag); **#11** live tier could never engage (RTSP
  pull TTFB 11.6 s vs 6 s warm-up grace → starve loop → CF ended broadcast attempt 1;
  fixed by pulling RTMP, TTFB 2.4 s).
- ✅ **Perception-lag loop** (`rig/loop-lag.sh`, N=20, 20/20 OCR): **pipeline p50
  7.44 s / p95 8.40 s**; player-perceived ≈ 9.9–11.4 s. Grabs phase-lock to 2 s
  segment starts (metric quantized by segmenting). Data: results/loop-lag.jsonl.
- ⚠️ Camera WEDGED at OS level mid-session (avfoundation opens block forever;
  leaked session in cameracaptured/appleh13camerad; likely trigger: orphaned webcam
  leg ffmpeg — teardown must kill legs explicitly). Needs sudo killall or reboot,
  then the webcam-tier walk re-runs. Stack torn down clean at 22:28.

---

## Session 3 — CLOSED OUT. Open items after this session (ranked)

1. Rotate the Cloudflare API token (pasted in chat) — USER.
2. `sudo killall cameracaptured appleh13camerad` (or reboot) → webcam-tier
   handover walk (agent notes have the exact re-run recipe).
3. ThreatLocker approval → OBS launch chain (unchanged). ThreatLocker now also
   proven to kill ALL freshly compiled/renamed binaries (cargo → Docker workaround).
4. Eyeball `src/demo.html`; OBS Browser Source overlay page (unchanged).
5. MoQ draft-16: USER provisions relay in dashboard (RUNBOOK §3; tokens shown once)
   → §4.2 commands → media burn-in/OCR latency measurement.
6. ~~v6 build + validation~~ ✅ DONE session 4 — park fixed, 2.4–4.3× faster
   recovery, shipped in src/low-latency-player.js (see session-4 entry).
7. Re-run the config-arm comparison with the legal seconds-based arm
   (liveSyncDuration:1.5/liveMaxLatencyDuration:6) to get its resilience numbers
   vs the v6 player.
8. ~~Part-2-late mystery~~ ✅ SOLVED session 4: CF segmenter hold-and-release cycle,
   encoder exonerated by byte-timing tap — see plan.md §1 and the session-4 entry.

---

## Session 2 dispatch — ⏸ PAUSED at battery 2% (user request "pause all save status")

Five parallel agents dispatched on open items 2,6,7,8,9 + MoQ research, then ALL
STOPPED ~2 min in when battery hit 2%. All rig processes killed (mediamtx, splicer,
gapless uplink, slate leg — the relay broadcast on `5cfa5053…` was LIVE, videoUID
`611c8199…`, when killed; next relay start mints a new broadcast, as expected).
Pre-existing idle `collector2.py :8900` left running.

**Last-known position per agent when stopped:**
- Item 2+8 (handover/loop-lag): relay stack UP and live, was about to grab a frame
  to check the burned clock. Partial notes in `rig/relay/SESSION2-NOTES.md` (880 B).
- Item 6 (WHEP): created live input `whep-rig` (uid in `rig/whep/NOTES.md`, 2 kB),
  was checking Playwright. Input exists on Cloudflare — reuse or delete on resume.
- Item 7 (edge-lag blocking reload): had only read scripts; no encoder started,
  no notes file yet.
- Item 9 (config-arm): static analysis just begun; no notes file, no input created.
- MoQ: `rig/moq/RUNBOOK.md` (5.8 kB) started; was fetching CF docs feature matrix +
  checking mediamtx's MoQ draft version.

**TO RESUME:** plug in, then re-dispatch the five agents per the ownership map below —
prompts are reconstructable from it; agents should first read their own notes files
and continue rather than restart.

Ownership map (so a resume knows who was doing what, where notes land):

- **Item 2+8** (one agent, sequential): relay stack + camera + input `5cfa5053…`.
  First `rig/relay/handover-test.sh` clean pass, then build+run `rig/loop-lag.sh`
  (design parked in "Parked mid-build" below). Notes → `rig/relay/SESSION2-NOTES.md`.
- **Item 6** (WHEP): browser↔browser via Stream WHIP/WHEP, ports 8897, own Playwright.
  Notes → `rig/whep/NOTES.md`.
- **Item 7** (edge-lag blocking reload): owns input `4c93bc4b…` + `push-llhls.sh`
  encoder. `_HLS_msn`/`_HLS_part` in `edge-lag.sh`. Notes → `rig/EDGE-LAG-NOTES.md`.
- **Item 9** (config-arm mystery + 26s resume): provisions ITS OWN live input for
  chaos; port 8898. Notes → `rig/CONFIG-ARM-NOTES.md`.
- **MoQ**: CF blog post + all resources → runbook at `rig/moq/RUNBOOK.md`.

Clock at dispatch: −5.2 ms ± 22 ms (sntp). Camera present (lid open). Agents told:
checkpoint to disk after every step, short runs before long runs, no edits to
plan.md/PROGRESS.md (merged by main session afterwards).

---

Chronological journal of the build session. `plan.md` is the current-state reference;
this file is what happened, in order, including the mistakes and dead ends.
Provenance: ✅ measured here · 📄 documented by vendor · ⚠️ unverified.

---

## Morning — research and first measurements

- **Five parallel research agents** dispatched: Stream/LL-HLS, Realtime/WebRTC, MoQ,
  latency-measurement methods, ingest tooling + competitive baselines. All reports
  distilled into `plan.md`. Session WebSearch budget (200) exhausted by them;
  raised to 1000 in `~/.claude/settings.json` for future sessions.
- **"The experimental thing" identified: Media over QUIC.** Cloudflare relay
  provisioning API shipped 2026-07-31, free beta, draft-16 target, live-edge only
  (no FETCH/GOAWAY). ✅ `draft-16.cloudflare.mediaoverquic.com` resolves; draft-18 NXDOMAIN.
- **ffmpeg saga**: 7.1.1 had no WHIP muxer (added in 8.0 — verified against release
  branches); upgrade to 9.0.1 brought WHIP but **lost drawtext/SRT/ocr** (Homebrew
  slimmed the formula). `ffmpeg@7` installed alongside; `ffmpeg-full` identified as
  the single-binary answer. A research agent installed `mediamtx` unrequested (disclosed).
- **Credentials**: wrangler OAuth token has no Stream/Calls/MoQ scopes (all 403).
  User created a custom API token (Stream ✓ Calls ✓ Realtime ✓) — **MoQ still 403**:
  later proven to be an unpublished permission group (dashboard-only provisioning).
  ⚠️ Token was pasted in chat — rotation still pending.
- ✅ **Clock**: stock macOS was +92→107 ms off (drifting ~0.4 ms/min); user stepped it
  via `sudo sntp -sS` to **+21 µs**. chrony recommended for a durable fix + error bounds.

## Midday — LL-HLS ground truth

- ✅ Created `preferLowLatency: true` input; **corrected the research**: Cloudflare
  DOES emit `EXT-X-PROGRAM-DATE-TIME` + full LL-HLS tag set — on LL inputs only.
  `?protocol=llhls` on a non-LL input silently returns plain HLS.
- ✅ Ingest→edge lag ~1 s (later shown to be only a lower bound — the polling metric
  conflates edge lag with playlist staleness; blocking reload needed).
- ✅ **The headline player finding**: stock hls.js parked at 7.6 s in one run and
  15.4 s in another (same stream/config), flat forever — no enabled recovery
  mechanism (`maxLatency: Infinity`, rate catch-up off). With a seek-to-edge
  controller: 1.87–3.05 s, at target. **Non-determinism, not slowness, is the defect.**
- Twice mis-read hidden-tab artifacts as findings ("diverges to 25 s" — wrong;
  background tabs stop buffering AND stop rVFC, with zero errors shown). Visibility
  is now recorded per-sample and filtered in analysis.
- 📄 Corroboration: Reinhardt 2023 measured anonymized LL-HLS at 19.75 s — the
  industry-wide player-throws-it-away gap.

## Afternoon — resilience campaign (the user's historical pain)

- ✅ **Platform truth #1**: Cloudflare mints a NEW video UID on every encoder
  socket close — even a 2 s gap. `timeoutSeconds` grace applies only while the
  socket stays open (SIGSTOP survives; SIGKILL/SIGTERM both end the broadcast).
  **The TCP close is the trigger, not the RTMP goodbye, not the gap length.**
- ✅ **Platform truth #2**: while ingest is down the manifest returns HTTP 204;
  after restart the edge serves the dead manifest ~10–15 s (client-irreducible).
- **Player versions v1→v5** against the chaos harness (2/5/12/25/60 s gaps):
  v1 died permanently on gap #1; v2 wedged before ever playing (instance surgery
  doesn't work — only full rebuild does); v3 recovered 5/5 but median 164 s;
  v4's fail-fast caused rebuild storms and crashed the tab (live-edge part 404s
  are NORMAL in LL-HLS); **v5: 5/5, median 15.4 s, lands at target, zero crashes** —
  near the platform floor (post-swap 404s are on the OLD broadcast's URLs).
- Two harness bugs found by their own damning-looking numbers (advancing-metric
  not reset across rebuilds; URL attribution off by one path component).
  *Instrument bugs look identical to product bugs until you check the instrument.*
- elektronstudio/v4's old reconnect hacks proved directly relevant:
  `manifestLoadingMaxRetry: Infinity` and the seekable-end stall check both adopted.

## Afternoon — timed messages, DO relay, cue sync

- Cloudflare strips ALL in-band metadata (ID3/SCTE-35/DATERANGE/SEI) → side channel
  + PDT alignment. `src/timed-messages.js`: cues fire when each viewer's playhead
  crosses the cue's wall-clock moment; revisions, cancels, late-joiner policy,
  subtitle track (native VTTCue) and hidden metadata track renderers.
- `workers/cues` Durable Object relay deployed (free plan, workers.dev, no domain).
  ✅ One-way pub→DO→sub p50 **27 ms** after moving broadcast before storage.put
  (persistence-gated delivery cost ~50 ms). ⚠️ Workers freeze `Date.now()` (~67 ms
  apparent skew) — never use DO timestamps for fine timing.
- ✅ **End-to-end cue→video sync verified**: fire error p50 **65–98 ms** (floor =
  100 ms poll), send→fire 2099 ms vs 2000 target. The 5.9 s outlier = cues sent
  before PDT existed, delivered late by design (late-joiner policy).
- ✅ **DO hibernation wake fixed**: `setWebSocketAutoResponse('ping'→'pong')` —
  RTT 32–38 ms even after 15 s idle (was ~119 ms); pings free, never wake the DO.

## Evening — gapless relay + webcam tier

- Goal: encoder restarts must not cost viewers the ~15 s outage. mediamtx's
  `fallback:` (connect-time only) and `overridePublisher` (kills readers) both
  insufficient → **FIFO + TS-concat architecture**: one never-closing uplink,
  sources spliced beneath it.
- ✅ Proven: one Cloudflare broadcast across encoder in/kill/return (multiple runs);
  content switching (distinct frame hashes); slate carries DO-driven burn-in
  messages (`rig/overlay-bridge.mjs`, drawtext textfile reload).
- **Splicer hardening: 8 defects, each found by a test run** (full ledger in
  `rig/relay/README.md`): torn packets, mid-GOP joins, backward-PTS discontinuity
  storms (fix: per-leg `-output_ts_offset`), socket starvation blocking switches
  for 17 min (fix: select + starve trigger), wall-clock offset drift (fix: track
  last delivered **PCR**), audio-PES splice corruption killing the uplink (fix:
  `discardcorrupt` + pinned `-r 30`), warm-up misdetected as starvation, dead
  camera escaping the bench.
- **Webcam tier added**: encoder > webcam > slate, 60 s bench, env knobs, silent
  audio by design. ✅ webcam→live splice clean (0 discontinuities); ✅ dead-camera
  self-heal to slate. ⚠️ One clean four-phase walk on the final build still owed —
  the laptop lid closed mid-campaign and killed the camera.

## Evening — OBS

- ✅ OBS was already on this machine (logs from Feb 2025) — cask was a re-install.
  ⚠️ `plugin_config/obs-websocket/config.json` overwritten (now localhost/no-auth).
- Pre-staged: `elektron-lowlatency` profile (Tune=zerolatency — the one-dropdown
  LL setting; keyframe 2 s manual; CBR; Cloudflare RTMPS + key in service.json).
- Launch blocked: quarantine flag (stripped ✓), locked screen (environmental),
  and finally **ThreatLocker** (user-identified) — corporate allowlisting kills
  unapproved binaries silently. No bypass attempted; approval requested.
  Silent instant process death with zero forensics ⇒ suspect endpoint control first.
- Remote control: obs-websocket v5 (port 4455) — no MCP needed; config pre-enabled.
- Deployment recommendation: **Option C** (roaming OBS → mediamtx → stationary
  studio OBS with slate scene → Cloudflare) — OBS's compositor makes the splice
  problem structurally impossible; Browser Source overlay replaces drawtext burn-in.

## Repo notes

- `auto.crt`/`auto.key` at repo root: generated by mediamtx (TLS for its
  listeners) — local artifacts, gitignored.
- Demo: `src/demo.html` (player + send box + overlay + subtitles + channel RTT),
  pending visual check on an unlocked screen.

## Parked mid-build: perception-lag loop (webcam → CF → back)

User intent: webcam is a **composition source**, not just failover; measure the real
perceived lag of the local-camera → Cloudflare → local-player loop.

State when parked:
- DONE: millisecond wall clock (`%{localtime}.mmm`) burned into the splicer's webcam
  and slate legs — ground truth now travels in the pixels of every relay source.
  ⚠️ cosmetic: the CLOCK drawtext string emits a Python SyntaxWarning (escape wart) — works, tidy later.
- NOT BUILT (the plan): `rig/loop-lag.sh` — N× { t0=now; grab live-edge frame
  (`-live_start_index -1`); ffmpeg@7 `ocr` filter (libtesseract, whitelist digits:.)
  reads the burned clock; lag = tod(t0) − tod(burned) }; report p50/p95.
  Numeric half runs fully headless off the slate leg; identical pipeline becomes the
  eyeball mirror test (wave hand, watch playback) once the lid is open.
  Player-side perception = this pipeline lag + `player.latency` (measured 2.5–4 s).
  Clock validity: machine stepped to +21 µs this morning; re-check `sntp` before a run.

## Open items (ranked)

1. Rotate the Cloudflare API token (pasted in chat).
2. Lid open → one clean `rig/relay/handover-test.sh` pass (closes splicer v-final).
3. ThreatLocker approval → OBS launch → remote-control proof → auto-reconnect
   chaos test (decides whether OBS-direct is viable or relay/Option C is mandatory).
4. Eyeball `src/demo.html`; then OBS Browser Source overlay page.
5. MoQ via dashboard + draft-16 client test.
6. WHEP measurement (`abs-capture-time` preservation unknown).
7. Blocking playlist reload in `edge-lag.sh`.
8. Perception-lag loop: finish `rig/loop-lag.sh` per the parked design above.
9. Unexplained: hls.js `liveMaxLatencyDurationCount` arm never played; one
   same-broadcast resume settled ~26 s behind without drift-seek firing.
