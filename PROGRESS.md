# Progress log — 2026-08-25 → 27

## Session 6 (2026-08-27) — grid-archive A/B: self-recording vs central (user: "build 2 protos")

Two agents, one per architecture, both against the deployed elektron-rtc worker
(unmodified), fake canvas media w/ burned wall-clock (camera still wedged).

### PROTO A — participant self-recording (proto/selfrec + workers/selfrec) — ✅ ALL 5 SCENARIOS
- NEW worker `elektron-selfrec` (workers.dev): POST /chunk streaming into R2
  binding (bucket elektron-archive-test, prefix selfrec/), bearer SELFREC_TOKEN,
  X-Chunk-Sha256 server-side reject of truncated puts; POST /finalize manifest;
  POST /delete/<show> = one-prefix consent deletion (proven 5×, 404-verified).
- ✅ Upload lag p50 483 / p95 636 ms (chunk close → HEAD-verified) — ~11× faster
  than the wrangler-CLI engine path. Uplink cost: +1.17 Mbps over the ~1 Mbps
  live publish; drain bursts ~4.6 Mbps only post-outage.
- ✅ 25 s offline (CDP): ZERO loss — 13 chunks buffered in IndexedDB (hwm 4 MB),
  drained 6.8 s after restore. Bug found+fixed: stale backoff timer delayed the
  drain (online handler must cancel pending timers; CDP offline flips
  navigator.onLine so no fetch ever "fails").
- ✅ Tab SIGKILL: 790 ms media lost = exactly the accumulating timeslice; all
  closed chunks already in R2 (0.5 s lag beats the 2 s cadence).
- ✅ Anchor: first burned frame − T₀-at-recorder.start = +20 ms (never anchor on
  first ondataavailable — it's one full timeslice late). Concat plays 2591/2591;
  durations agree within 30–50 ms/90 s ⚠️ → possible clock drift ~1–2 s/2 h;
  per-chunk close wall-times in the manifest give a free piecewise re-anchor.
- Decode trap: MediaRecorder webm has a 1 kHz timebase — ffmpeg needs
  `-fps_mode passthrough/vfr` or it CFR-duplicates to ~1000 fps.

### PROTO B — central per-participant recording (proto/centralrec) — ✅ MEASURED, LOSES
- Pull-only SFU session works (lazy session at first pull); one recorder page,
  MediaRecorder per remote track. N=8 pristine: 4.1 Mbps studio downlink,
  rec CPU ~30% of a core, 100% burned-row decode.
- ✅ Downlink perfectly linear 0.507 Mbps/participant → extrapolated (flagged)
  N=54 ≈ 57–60 Mbps camera-class = **8.1–8.6× the tiered-grid live budget**
  (~7 Mbps); every wall-tier head becomes a 1+ Mbps continuous pull + a
  decoder slot. One-page ceiling bites between N=8 and N=12: at N=12 one
  archive file carries a real 3.1 s hole — sharded recorder pages needed.
- ✅ Sibling coupling: EVERY join/leave renegotiation cuts a 130–172 ms frame
  gap into EVERY other participant's archive file (the unpull-burst lesson,
  now in the archive). Self-recording is structurally immune.
- ✅ Disconnect: `left` at recorder +95 ms, clean file end, no corrupt tail;
  rejoin gap ~2.9 s structural. Double encode: PSNR p50 54.7 dB on synthetic
  (visually lossless) BUT SFU freezes are inherited verbatim into the archive;
  camera noise would pay real generation loss.
- Simulcast arm: rid=h halves studio cost (2.07 Mbps, 16.8% CPU) but pushes
  ~0.97 Mbps extra uplink onto every publisher — nearly A's 1.17 Mbps for
  320×180 instead of source quality. TRAP: preferredRid naming a missing layer
  (q from 360p) silently falls back to f — full cost, zero error surface.
- Chrome traps: ontrack re-fires for an already-associated mid on later
  renegotiations (dedupe per mid); inbound-rtp bytesReceived RESETS on every
  renegotiation (transport counters are renegotiation-proof).

### SYNC LEG (session 6b) — participant recordings ↔ central timeline: ✅ 14/14 REGRESSION GREEN
- `/time` skew endpoint (elektron-selfrec v9f7e7a01) + min-RTT-of-5 client
  estimator: real-world grade is **±50 ms** (bias = edge/worker asymmetry, not
  jitter) — C5's "±25 ms" revised.
- media-span markers ride CUE PASSTHROUGH on the deployed room DO (choreography
  precedent): start/beat/end per participant, 9/9 echo-acks, `start.at ==
  T₀-rec-start` exactly; un-echoed markers resend once, reducer dedupes.
- ✅ **MediaRecorder records H.264** (webm;codecs=h264, ffprobe-verified) →
  repackage is COPY-REMUX: **80 ms ffmpeg wall for 75 s media (0.0011×)** vs
  vp8→libx264 1226 ms (0.016×). TRAP: libx264 default B-frames shift the fMP4
  timeline (+66 ms first-pts) → constant −125 ms seek bias hls.js doesn't
  compensate — **`-bf 0` mandatory** for repackaged MediaRecorder streams.
- Pure-JS EBML cluster indexer (the no-ffmpeg CF path): 10–11 ms/MB, 0 false
  positives; whole-show parse fits PAID worker cron ~300× over (not free-tier
  10 ms); per-chunk incremental (~3 ms) fits even free tier at finalize.
- **Regression (2 staggered participants, burned clocks, composed replay):**
  R1 inter-tile skew p50 29 / max 34 ms (target ≤100). R2 seeks −29…−65 ms,
  absent-participant tiles render EMPTY (absence is content). R4 cues all in
  the 150 ms band (engine +3–5 ms; residual −30…−70 ms = skewEst-on-zero-skew
  minus anchor delta — constituents known). R3 drift CONFIRMED 33–56 ms at the
  73 s tail, but the per-chunk re-anchor's cluster-byte interpolation noise
  (±100–270 ms) EXCEEDS the drift it corrects at minute scale — **linear+skew
  is the default mapping; hour-scale shows want a SimpleBlock-level index**.
- Proof show kept: selfrec/sync-20260827T093613 (27.7 MB) + room cuelog
  selfrecsync-20260827T093613 in the DO. New: repackage.mjs, indexer.mjs,
  replay-grid.html, run-sync.mjs.

### OBS-IN-DOCKER + CF CONTAINERS (session 6d) — both measured ✅
- **CF Containers** (research/cf-containers-2026-08.md; account IS Workers Paid,
  the "free plan" note was stale): wake 3.7 s; copy-remux 282–386 ms for 75 s
  (4× local, fine) → 54-part 2 h show ≈ **$0.20 cloud repackage**; vp8
  transcode **50× local** (0.8× realtime) → h264-first now has local+mobile+
  cloud economics aligned. Outbound net WIDE OPEN measured (arbitrary TCP:
  RTMP to live.cloudflare.com:1935 in 16 ms; raw UDP works); inbound =
  Worker-fetch only. Traps: sleepAfter livelock (lib 0.0.28), node-PID-1
  ignores SIGTERM (15 min billed to SIGKILL — handler mandatory), wrangler
  tail shows no container stdout. Always-on lite ≈ $1.77/mo.
- **OBS in Docker** (rig/obs-docker): ubuntu24 + PPA OBS 32.2 (only apt
  source with CEF), 1.08 GB image, amd64-under-Rosetta on OrbStack. Full
  studio setup from zero over obs-websocket in **189 ms**; RTTs sub-ms except
  SetCurrentProgramScene 4.6 ms. Browser-source pipeline **p50 182.5 ms**
  page→glass — but TRAP OF THE SESSION: simple output mode silently ignores
  x264Settings → default lookahead/B-frames = **1226 ms (6.7× cliff)**; fix
  needs Advanced mode + streamEncoder.json profile FILE (unreachable via
  websocket). Scene switch cmd→glass p50 198 ms (Cut; Fade adds its 300 ms).
  BrowserHWAccel=false or browser sources render black; OBS rewrites ini on
  exit (stop→edit→start). ~2 host cores streaming (Rosetta+llvmpipe tax).
  Resilience: sink-death → RECONNECTING event 77 ms; docker-restart
  cold→pixels 7.7 s. **ThreatLocker verified**: Linux OBS + fresh unsigned
  plugin ran 90 min in the VM on the machine that kills macOS OBS.
- **obs-moq WORKS, both drafts**: built from source (moq-dev/moq@5ddaed0,
  libmoq 0.5.11 speaks IETF 14–19; libsimde-dev + -DBUILD_PLUGIN=ON;
  48 MB .so loads into stock PPA OBS). d14→CF: connected 399 ms, deployed
  player LIVE 30 fps 0 errors, **g2g p50 185 ms** (= the local RTMP chain —
  the CF hop is free). d16: token-in-path, **moq-transport-16 in 164 ms,
  g2g p50 149 / p95 161 ms — fastest chain of the day**. NEW INTEROP TRAP:
  d16 does NOT replay the pre-join catalog group → late-joining players
  stall at catalog forever; obs-moq publishes its catalog ONCE (d14's
  open-group replay masked it) → until the plugin republishes catalog (§7's
  2 s hack) or the relay grows FETCH, **d16 viewers must subscribe before
  StartStream**. Dual RTMP+MoQ not reachable via websocket (no output
  instance without the Qt dock); service flips remotely in one call.
- ~~OPEN CONTRADICTION~~ → **RESOLVED (session 6e, direct measurement):
  QUIC/MoQ egress from CF Containers WORKS.** moq clock publisher inside
  fra20 connected to the d14 relay in 55 ms; 25/25 ticks received on this
  Mac. The obs-docker "no UDP" verdict was a stale doc assumption. Inbound
  QUIC (relay-in-container) stays dead — no public IP.

### MUSIC JAMMING (session 6f) — latency matrix + 2 demos ✅ (proto/jam, workers/jam)
- Truth clock: both Chromes min-RTT-calibrated over loopback (±0.15 ms; skew
  drift 7 µs/25 min). n=550/config, musical rates (bursts/sparse/chords).
- **Matrix (one-way p50/p95)**: DC-direct P2P **1.0/1.5 ms** (ordered ≈
  unordered on clean net); **CF SFU DataChannel 16.2/30 ms** — EXISTS, works,
  datachannel-only session accepted (tracks/new refuses; sessions/new takes a
  DC-only offer), accepts unreliable flags without echoing them; DO relay
  elektron-jam 34.5/47 (cues' parse+restamp costs p95 78 — the only visible
  software cost); legacy relay 51/73; MoQ d14 21.6/33 but **2.9% loss = 100%
  chord notes** (single-frame-group racing; datagram mode confirmed DEAD on
  d14); local ws relay 0.9 ms ≈ DC — **relay software never matters, network
  does**. **JSON tax at MIDI sizes: ZERO** (16 B vs 130 B: no measurable
  delta; binary earns nothing until ~100× rates).
- **Loss verdict (real netem 2%, CDP packetLoss is a NO-OP in Chrome 151 —
  documented)**: reliable modes stall 200 ms (TCP min-RTO) – 412 ms (SCTP
  T3-RTO) in consecutive-note runs, WORST on sparse traffic (phrase gaps);
  unordered+maxRtx:0 converts all of it to ~2% vanished notes with p95 2.5 ms.
  Dropped > late: unreliable wins for live ears; the log path stays reliable.
- **Demos verified** (60 s duets, replay 321/321 count-match, flat timeline
  logs {at µs, kind midi, source, raw}): jam.html — live duet, local monitor
  immediate, remote p50 1.6–1.9 ms over DC; jam-interval.html — NINJAM
  strategy with EPOCH-ANCHORED beat grid (zero-negotiation shared phase): a
  38 ms DO link playing musically on-grid — any link ≲ beat/2 is playable.
- **Recommendation**: same-city = DC-direct unordered (fallback SFU-DC 16 ms,
  no TURN needed); distant = same transport + interval strategy; DO relay =
  ordering point + recorder feed; MoQ not yet right for notes. Timeline needs:
  jam-room cuelog persistence, owMs into the drift channel, lift dedupe+µs
  conventions into the lib. NEW worker kept: elektron-jam (hibernation DO,
  echoes verbatim binary+text, stores nothing; workers/jam/DEPLOYED.md).

### NESTED SPANS — COMPOSITION ACROSS TIMELINES (session 6s) — ✅ 16/16
`timeline/nested.mjs` (~300 lines): `createNest(parentDeck).add({id, at, rate,
deck, master})` + `servo()`. **transport.mjs needed ZERO changes** — a nested
deck is an ordinary adapter (`kind:'deck-span'`), which is seam 1 (the adapter
registry) paying off: composition is just another kind.
- Rules chosen: child pos = `clamp(c0 + (parentPos−at)·rate)`; outside the span
  the child pauses AND is asserted at the boundary it left through (absence is
  content one level down). Rate composes multiplicatively against the
  intersection of the child's adapter lattices, off-lattice → nearest in LOG
  space with `{wanted, chose, degraded, reason}`. A parent seek is a real
  `child.seek()` (so reduce-on-seek runs INSIDE), `sync()` reserved for the
  servo. **A nested child never masters unless asked, and a DEGRADED child
  cannot master** (it runs a rate the parent didn't ask for → mastering
  suspends rather than silently imposing 2× on the arrangement). Cycles
  rejected at add(), depth capped 8, drift nests rather than flattens.
- prop-test green at 30 and 100 seeds with a new suite 4 (nest-span/seek/pause/
  rate/absent/servo/master/cycle/depth); needed a fan-out of the virtual host
  (two decks want two metronomes on one clock).
- **Composed demo `proto/remixer/compose.html` — the motivating case, 16/16,
  0 upstream calls**: the REAL kept instrument session (128 MIDI rows) nested at
  30 s inside an arrangement beside archive spans. Parent 34.91 s → child
  4.91 s, **map error 0.0 ms**; **parent seek into the middle: 14/14 probes
  exact, max child position error 0.000 ms, held set === reduce(≤childPos)**;
  pause holds every layer at 0.000; rate 2× → 5987 ms parent AND child in
  3007 ms wall (1.99×), child media exactly 2.00×; 1.5× parent → child chose 2×,
  degraded, **mastering suspended 300 ticks** while the arrangement still ran
  1.50×; at 60 s the session is absent/frozen while the archive layer keeps
  playing +2497 ms.
- **Fourth latent bug, pattern holds**: the child's media element was asked to
  play() at span entry and silently stayed paused for a whole pass — fixed via
  `caps.followsTransport`, a seam now filed by THREE clients.
- **Closing analysis — what plan-timeline still promises that the library
  cannot express** (nesting sharpened 1–2 rather than solving them):
  1. **Quotation of a FRAGMENT**: `{at, rate, deck}` has no `in`/`out`, so a
     nested span plays the child's WHOLE range — but §−1's mission is quoting
     *pieces*. Trim drags in the rest of v3 (move/mute/solo-by-query/re-time),
     none of which exist because `range` is fixed at construction.
  2. **Uncertainty as position**: "1971, probably spring" has no
     representation — `at` and `position()` are exact scalars and the scheduler
     cannot fire "approximately". Nesting made a SPAN a deck; it did not make
     an INSTANT an interval with a distribution. The founding heritage
     requirement, and the library is silent on it.
  3. **The evidence firewall**: reduce/window still take no
     `attested | restored(tier ≤ n) | all` policy — reconstructor lanes would
     WORK today; the discipline that makes them honest does not exist.
  4. **Provenance/rights**: payload is opaque by design, so nothing is
     enforced — and pointedly `nest.add()` takes no provenance, so the
     library's own quotation primitive cannot record what it quotes or under
     what rights.
  5. **A store**: v0 promised memory/DO/JSONL-R2 backends; the library is an
     in-memory array with a linear-scan prefix. Decades of ERR cannot be a JS
     array and no client has had to find out yet.
  (Smaller: negative rate/reverse scrub explicitly unsupported; the strip
  visualizer is still promised as a component and was hand-drawn again today.)

### PATHS: THE FIRST CONTINUOUS CLIENT (session 6r) — ✅ 9/9 (proto/paths)
demo10 + draw/drag ported forward as a `pointer` kind — and the first client to
exercise plan-timeline's `interpolate` seam.
- **Every documented ancestor defect fixed and marked FIX-n in the source**:
  destructive sampler → two append-only lanes (evidence never consumed — which
  is WHY deviation numbers are possible at all; demo10 could not measure its
  own comparison because its sampler ate the ground truth); frame-count →
  wall-clock decimation; dropped first/last segments → reflected phantom
  endpoints; fixed t+=0.2 → pixel-budget subdivision with integer stepping;
  per-frame recompute → per-segment cache (render 0.02 ms); PLUS beyond brief:
  uniform-knot Catmull-Rom → **time-knotted Hermite** over real timestamps
  (synthetic trace carries ±2 ms jitter to exercise it).
- **Numbers**: seek ×3 vs analytic truth **0.042 / 0.032 / 0.042 px** with the
  interpolating reducer vs **38.3 / 45.6 / 27.0 px** with zero-order hold —
  ~900×, and proof `reduce()` really interpolates. Deviation from evidence
  (721 samples): hold mean 24.19 / linear 0.679 / **Catmull-Rom 0.036 px**.
  **59 attested samples, 896 drawn → 93.4 % of the rendered path is invented,
  at 0.036 px mean cost** — the §5b invention figure, permanently on screen.
  Pause drift 0.000 ms; rate 1.990×; 0 console errors.
- **THE INTERPOLATE-SEAM REPORT — the library does NOT support continuous
  kinds** (transport half fine; adapter half missing four things):
  1. **`interpolate` is never called** — the word appears nowhere in
     transport/logdeck; registerAdapter validates only `actuate`; of caps the
     library reads only catchUp/audio/assertOnSeek. `caps:{continuous,
     interpolate}` is documentation, so C3's "degrade honestly" cannot happen.
  2. **No adapter hook between two fires**: measured **59 attested fires vs
     4,854 interpolate() calls — 98.8 % of rendered motion came from client
     code the library knows nothing about**. Fix: drive continuous adapters
     off the position observable the deck already runs.
  3. **No bracketing query; the only positional read is O(n)** (`reduceAt`
     re-scans from 0) — driving an interpolator from it at 60 Hz would
     **reproduce demo10's per-frame-recompute defect INSIDE the library**.
     Fix: `sched.bracket(kind, pos)`.
  4. **`reduce()` structurally cannot see the right bracket**: it gets
     `prefix ≤ pos`, so the successor is by construction absent ⇒ an
     interpolated reduce is NOT expressible in the contract. Seam 5's
     "pure function of the prefix" is right for discrete kinds and WRONG for
     continuous ones. Fix: `info.next` (two lines; the array is already there).
  5. `interpolate(a,b,u)` under-specified for any C¹ interpolator (a spline is
     not a function of two samples) → add neighbourhood + caps.neighbourhood.
  6. **LIBRARY BUG**: logdeck's `payload: {i, at, ...p.payload}` lets the raw
     row's epoch-µs `at` **silently clobber the position-domain `at` the
     library just injected** — §2's "payloads must not spread over control
     fields" law broken inside the library that records it. Fix: inject last.
- **Verdict: it IS the honest tratteggio UI** — seamless at 1×, hatched under
  inspection, a 14× playhead inset showing the linear chord cutting corners
  while the spline hugs the evidence, amber dots on attested positions only,
  and an evidence-only toggle (§5b's firewall in miniature). Still missing and
  it belongs to the library: reconstructions are computed on the fly rather
  than **appended as derived lanes** (`source: reconstructor-*`, method,
  confidence, tier, refs), and reduce()/window() still lack the
  `attested | restored(tier ≤ n) | all` evidence policy.

### TRANSPORT: 4 CLIENTS (session 6q) — instrument replay 61/61, remixer 11/11
- **THIRD LATENT BUG (the pattern holds: every adoption finds one).** Instrument
  `replayStored()` started the recorded audio **~1075 ms ahead of the first
  note**: the offset itself was correct and correctly applied, then the function
  slept 700 ms to prove `advanced > 0` and `replayEvents()` added its own 200 ms
  lead-in, with nothing reconciling the clocks again. **The harness was
  structurally blind** — its assert was `advanced > 0`, which a one-second-early
  track passes perfectly. Same bug's other half: `speed` scaled notes but left
  the media element at 1×, so at 6× note time and audio time diverged at 5×
  real time. Post-adoption align error **+41 ms** (was +1075), media re-anchor
  error **0 ms** on all 3 seeks.
- Old path also: "forward seek" (a restart) produced **116 orphan fires**, 192
  total where a transport does 64. Post: 0 armed timers after pause.
- Instrument adapters (3): `midi-actuated` (host clock, audible, burst) ·
  `midi` (player intent, **audible:false — a second VISIBLE lane that renders
  but never times audio**) · `media-span` (A/V element = clock master via
  sync()). 61/61 (was 54/54). Honest cost: firing p50 2.2→4.34, p95 4.8→8.64 ms
  — bought with cancellation, seek, pause, rate, drift and a media master.
- **Remixer: the chord became a timeline.** One `media-span` adapter, arrangement
  domain; first playable layer masters, others servo in a ±20 ms dead band.
  Start-together spread **0–43 ms → 0.1 ms**; ONE SEEK MOVES EVERY LAYER (skew
  −1…−16 ms); pause holds all (playhead 0.000 ms); rate 2× arms while paused and
  every element follows; 1169 sync() calls with **0** corrections over
  tolerance; absence is content (past a span's end that layer goes absent while
  others play). 11/11, 0 console/media errors, **6 upstream ERR calls** total.
  NOTES states plainly: archive items carry no internal timecode, so offsets are
  OUR arrangement, not attested sync.
- **New: `timeline/logdeck.mjs` (76 lines)** — `makeLogDeck({lanes:[...]})`
  because `makeDeck` is single-kind by construction and cannot express a log
  with two note lanes plus a media lane; `makeDeck` is now the one-lane case;
  `expand()` handles interval rows.
- v0.2 needed no changes. Two seams found ABOVE it (~4 client lines each):
  `caps.followsTransport` (every media client rewrites the same
  play/pause/rate follow block — 3 of 4 clients have it) and `deck.setRange()`
  (a client whose item set changes at runtime must dispose and rebuild).
- **THE LAST STRUCTURAL GAP, after 4 clients**: composition ACROSS timelines.
  `sync()` slaves the vector to exactly one external master and a deck's
  position is a single scalar, so **a span that is itself a deck** (a stored
  instrument session dropped into an arrangement beside a 1965 broadcast) has
  no representation. Missing primitive: a **nested/offset span `{at, rate,
  deck}`** — the same sync() contract pointed at a deck instead of a <video>.
  Everything else in plan-timeline (reconstruction spectrum, archival client,
  megatimeline) is content on top of that.

### TRANSPORT v0.2 — SIX SEAMS FIXED + 2 MORE ADOPTIONS (session 6p) — ✅ gate green
Fixes (before → after): (1) **`registerAdapter(kind, {caps, actuate, reduce,
assertState})`** with per-kind dispatch + policy derived from caps — plus
createDeck/adapterCaps/assertAt/reduceAt/reduce-on-seek all lifted upstream;
(2) `setRate()` now ARMS the rate and stays paused, `play(r?)` is the only mover,
`.targetRate` public (a paused UI shows 0.50×, not 0.00×); (3) default host is
now **worker** (matching the measured verdict), main/raf explicit opt-ins;
(4) **wall→audio bridge**: `actuate(payload, rec, when)` with `caps.audio={ctx,
leadMs}` → `when.audioTime` — an early fire's earliness IS the headroom;
(5) **the reducer now gets the COMPLETE ORDERED PREFIX** (not one scan's
misses) — guarantee stated: `assertState(reduce(prefix ≤ t))` == state after
`play(0→t)` for ANY reducer, commutative or not; (6) `onDrift/peekDrift/
driftStats` beside a capped `drainDrift`. Bonus seam the media client needed:
**`transport.sync(pos, {toleranceMs})`** — slave the vector to an external clock
master with no seek semantics (nothing re-fires).
- **Gate green, nothing moved**: prop-test at 30 and 100 seeds + a new third
  suite asserting all six seams, incl. a seam-5 witness check that the OLD
  one-scan input gives a different answer. Firing arms within noise
  (main 1.3/6.9, worker 4.3/15.1, raf 4.1/7.7, fanout 1.7/2.8; 1270/1270 each).
  **CORRECTION: the fan-out arm fails 6 of 7 asserts, not 5** — earlier prose
  miscounted; the recorded data says 6 (unchanged run to run).
- **jam-timeline.js 105 → 39 lines (−63%)** — only the jam-shaped µs→ms mapping
  survives. jam-interval.html adoption: **+45 lines, 0 deletions** (confirmed
  free). replay-grid.html: +216, two adapters (`media-span` w/ caps
  seekAccuracyMs 40, rates [1], rateNudge, clockMaster, catchUp reduce; `cue`
  w/ catchUp burst). Media element stays clock master; library slaved via
  sync(); rAF demoted to pure video servo; the cue lane runs on the worker host
  and survives a hidden tab.
- **verify-replay 5/5**: scrubber seeks **bit-identical** (−49/−51, −65/−41).
  Inter-tile skew moved p50 4→29, max 33→34 ms — mechanism understood and
  honest: the OLD wall-clock playhead let both tiles drift TOGETHER (correlated
  error −45…−78 on both), so mutual skew flattered itself; with a real media
  master p1 sits at zero and the rate-nudge dead band IS the skew budget
  (tightened ±40→±20 ms ⇒ max 34 ms = one 30 fps frame, the physical floor).
  Slave's ABSOLUTE error improved (−29…−68 vs −56…−78).
- **SECOND LATENT BUG, worse than the jam one**: replay-grid's rAF cue engine
  fired one frame late (+0.2/+15.5/+14.7 ms, unbounded on a dropped frame,
  infinite in a hidden tab) — but the real defect was `__seekWall` rebuilding
  `firedIds` from what had ALREADY fired instead of from cues ≤ T, so on a
  fresh page **a forward seek fired every skipped cue at once: 3 cues burst,
  45.0/25.0/5.0 s late**. That is precisely the `seek-no-skipped-fires` assert
  the fan-out graveyard arm fails — live in a shipped demo. Post-adoption:
  **0 fires**, library firing +1.9/+2.5/+1.2 ms.
- Third adoption now ≈ caps + actuate (+reduce/assertState if seek should mean
  anything) handed to createDeck: 20–40 lines per kind; the only per-client
  chore left is serving `/timeline/*` (one route).

### INSTRUMENT SESSION GAPS CLOSED (session 6o) — ✅ 54/54 (was 42/42)
- **A/V lane**: consent is now off / audio / audio+video (still default-off,
  never persisted). At the top rung a SECOND recorder runs on
  `new MediaStream([audioTrack, panelVideoTrack])` — one webm, both tracks —
  chunked to `instrument/<sid>/av/` with its own media-span carrying
  `payload.kind:'av'`, so lanes are distinguishable without opening a file.
  **Codec probe: h264+opus supported and PREFERRED** (a later repackage becomes
  a remux, not a transcode; vp8,opus fallback). Replay prefers the A/V span:
  plain <video> fed Blob-concatenated chunks, no MSE, verified 640×360 with
  currentTime advancing.
- **IndexedDB backstop on all four lanes** (player events, host events, audio
  chunks, A/V chunks) via a generalized `makeBackstop({name, send})`. **The rule
  selfrec never needed: ORDER IS CORRECTNESS** — the DO's monotonic per-source
  seq would turn an overtaking batch into a silent duplicate-rejection of the
  parked one, so once anything parks, everything later parks and the drain is
  the only sender. Still-parked at manifest time ⇒ named `missing`,
  `degraded:true`.
  15 s CDP offline mid-session (which also kills signaling, so the session ends
  and the recorder finalizes while offline): **zero lost on every lane** —
  80/80 player events, 80/80 actuations, 9/9 audio and 9/9 A/V chunks in R2,
  degraded:false. Drain from reconnect: events 657–840 ms, audio 2.5 s, A/V
  3.2 s; high water 396 KB.
- **Capability tokens (trimmed per user)**: two 128-bit hex tokens minted at
  accept, written to the session row before either party learns the id, each
  party gets only its own, sent as X-Session-Token, constant-time compared.
  Enforced on exactly three routes (media upload, player delete, owner delete);
  reads and event appends deliberately ungated. Matrix green (absent/wrong 403,
  right 200); **tombstone beats a valid token** (410); tokens never echoed by a
  read (`guarded:true` only).
- Worker redeployed `6473040f`. R2 kept: 978 KB in one proof session.
- **Operational trap worth keeping: a Durable Object keeps running its OLD
  class code after a deploy until the instance is evicted (~1 min)** — the
  worker routed new /av paths while the DO still answered "no such session op".
  A smoke test run straight after `wrangler deploy` will lie to you.
- Unbuilt: no av-only rung (A/V duplicates audio by design), no token expiry/
  rotation/revocation short of deletion, no real camera in the run (fake device
  ⇒ the panel canvas was encoded), no compaction job.

### TRANSPORT ADOPTED IN A DEMO (session 6n) — ✅ 14/14 (proto/jam + timeline/)
`timeline/transport.mjs` has its first real client: jam.html's replay is now
vector + lookahead + worker tick feeding the EXISTING actuate(). New seam
`proto/jam/jam-timeline.js` (105 lines); server aliases `/timeline/*` to the
repo library so the demo imports the SAME file the lab measured.
- **The hand-rolled path was firing ~100 ms EARLY and nobody knew**: measured
  for the first time at **p50 −100.8 ms** (range −118.5…−95.9) — it fired
  everything inside a 120 ms horizon AT THE TICK, so flash+HUD landed early
  while only audio was on time (it passed `acT` to WebAudio separately). The
  library ties both to one instant: **7.2/14.3 ms (worker host)**. The lesson
  generalizes: an unmeasured scheduler hides constant offsets, not just jitter.
- Firing error vs recorded `at`: A p50 7.2 / p95 14.3, B 9.2 / 15.6 — squarely
  the lab's worker band. `?tickhost=main` opts into 6.4 ms p95.
- The `midi` adapter is `{actuate, caps, reduce, assertState}`; catchUp:'burst'
  (musical — never silently drop a note). **Seek required a voice registry in
  the synth** (voices Map + silenceAll + soundingNotes): without held state
  there is nothing to reduce to and seek is meaningless — the only genuinely
  per-client piece of adoption.
- Asserts: 133/133 fired both peers, logGrewBy 0, exactly-once audit, 0 armed
  timers; seek ×3 sounding == reduce(events≤t), 0 orphans/double-fires; pause
  position delta 0.00000 ms; rate median 188.0 ms @1× → 100.1 @2× (0.53);
  live duet untouched (one-way 1.59/1.61 ms, 0 loss).
- **Six API seams the first client found** (fix upstream before the next
  adoption): (1) NO ADAPTER REGISTRY — every client will rewrite the same
  ~12-line registerAdapter; (2) setRate() doubles as play() so there is no
  set-rate-while-paused and a paused UI can only show 0.00×; (3)
  createScheduler defaults to mainTickHost while the lab VERDICT ships worker —
  code and doc disagree; (4) no wall→audio bridge (actuate gets an instant, not
  a lead, though the drift record already carries deltaMs); (5) the reduce
  policy sees only one scan's missed events, not the whole prefix — wrong for
  non-commutative reducers; (6) drainDrift() is destructive so a HUD and an
  assert harness cannot both read it.
- Next adoption ≈ half a day per demo (an hour once the registry and
  set-rate-while-paused land upstream); jam-interval.html is free.

### INSTRUMENT SESSION STORAGE (session 6m) — ✅ 42/42 (workers/instrument, proto/instrument)
Sessions are now durable: notes as ROWS in a DO SQLite (C4), audio in R2 by
reference (C6-deletable), both lanes on one log.
- **EU jurisdiction VERIFIED pinned** (not merely requested): the `Sessions` DO
  from `jurisdiction('eu').idFromName('log')` has a different id than unpinned.
  Signaling Hub deliberately untouched so the registry didn't move.
- Schema: `sessions(id, instrument, playerId, startedAt, endedAt, noteCount,
  audioPrefix, deletedBy, deletedAt)` + `events(sessionId, seq, at µs, kind,
  source, raw BLOB, display, ref, payload)` idx (sessionId, at). `ref` = the
  cross-lane pointer (host actuation → player note seq); `payload` = marker
  detail (media-span phase + mediaRef). One row per event, never a blob.
- **Session id minted in the Hub on accept** and handed to BOTH parties — one
  id, no side channel, no guessing.
- **TWO LANES (the sync fix)**: player logs intent in the player's clock; host
  logs `midi-actuated` (with `ref`) in the HOST's clock — the same clock its
  audio is stamped in. Replay uses the **host lane as master**; audio offset is
  `firstEvent.at − mediaSpanStart.at`, a subtraction, not a skew guess.
  **The two lanes joined on `ref` reproduce the live latency EXACTLY: p50
  0.48 ms from storage vs 0.48 ms live (n=128) — the lane pair IS the drift
  channel.** NOTES warns: never "fix" this by averaging the lanes.
- Verified: 390 rows / 0 append rejections; audio 12/12 chunks in R2, replay
  Blob-concatenates and decodes (no MSE needed), offset 1.94 s; consent OFF →
  20 rows, 0 R2 objects, null prefix; delete by player → rows dropped, R2
  object purged, read 410 tombstone, re-append 410 (resurrection blocked);
  owner delete needs INSTRUMENT_TOKEN.
- Two bugs worth knowing: `X-Chunk-Sha256` missing from
  Access-Control-Allow-Headers killed every chunk POST in preflight (selfrec
  had it right — carry CORS headers when copying a pipeline); and seq counters
  must be keyed BY SESSION (a span marker at seq 0 collided with the first
  actuation).
- Unbuilt: panel/camera video recording (seam is one MediaStream away), player
  auth (the session id IS the capability — fails toward deletion, not access
  control), IndexedDB backstop on either lane, compaction job, megatimeline join.

### MoQ RIG FIXED + RETEST (session 6l) — ✅ VIDEO USABLE; BOTH HYPOTHESES REFUTED
- **Video starvation was NOT group-per-frame.** The publisher already keyframed
  every 30th frame and @moq/hang opens a group on that flag ⇒ video was on 1 s
  groups, symmetric with audio. The C4 chord-loss finding does NOT transfer.
  **Actual cause: a STALL, not a drop rate** — A's read loop parked in
  `cons.next()` (CF d14 gives no death signal and never redelivers a closed
  group, so a quiet track stays quiet forever), and/or a FATAL VideoDecoder
  error (WebCodecs closes the decoder permanently; the rig had no way back).
  ~3 of 6 sessions. Fix by construction: rebuildable decoder + keyframe resync,
  `resubscribe()` + 1.5 s no-frame watchdog, budgeted 8 heals/run (subscribe
  credits are finite, §13.4 — unbounded retries dig the hole deeper).
- **Hybrid failure was NOT catalog/announce timing.** CF had subscribed
  (used=true in 3 s); B simply published nothing. **Root cause is WebAudio:**
  from the 2nd MoQ arm in a page onward, the pcm-capture worklet's `process()`
  got an EMPTY input array while `ac.currentTime` advanced — Chrome latches a
  bus it considers silent and hands `[]` instead of zero-filled buffers.
  **Fix: a started ConstantSourceNode(offset 0) permanently on the synth bus**
  — a *playing* source contributing exactly zero samples (no DC, no onset risk).
  Plus: the realtime pacer <audio> is page-lifetime (teardown used to pause it,
  leaving arm 2 with no puller) and the capture tap swaps only its consumer.
- **Retest (floor 20 ms, p50/p95):**

| run | n | key→ear | key→eye | A/V skew p50 | video pub/recv | audio loss | underruns |
|---|---|---|---|---|---|---|---|
| moq-av mixed | 332 | 45.29/51.46 | 56.1/86.8 | **+10.25** | 1608/1607 = 99.9% | 0.151% | 206 |
| moq-av sparse | 317 | 45.79/54.97 | 64.7/90.1 | +19.04 | 2431/2430 = 100% | 0.109% | 303 |
| **moq-hybrid mixed** | 338 | **40.65/50.26** | 57.8/80.5 | +14.86 | WebRTC video | **0.038%** | 46 |
| moq-hybrid sparse | 318 | 43.28/48.89 | 58.0/81.6 | +14.68 | WebRTC video | 0.034% | 31 |

  0 decode errors, 0 stalls, 0 heals needed, both subscribes live on attempt 1.
  vs the 43.08/50.69 reference: **the video fix cost the audio path nothing**.
- **No group-size curve exists** — group span isn't in the return path (the
  playout floor is). One-sided datum: `groupMs:0` (~400 groups/s) threw
  thousands of "Failed to create send stream" — **one MoQ group = one QUIC
  uni-stream**, so group-per-frame exhausts stream credits outright.
- Two carry-forward findings: **A/V skew FLIPPED SIGN** vs 6g — with a 45 ms
  audio return the sound now arrives BEFORE the panel (+10…+19 ms) where
  WebRTC's 78 ms return put video ~27 ms early; and **MoQ video transport is
  faster than WebRTC's** (burn→visible 32.0 vs 41.1 ms, caveat: MoQ measured at
  decode-out, ~1 vsync of that gap is method). **Best overall arm: hybrid
  (MoQ audio + WebRTC video)** — lowest key→ear AND ~4× lower MoQ audio loss,
  because moq-av's video shares the same QUIC connection.
- Residue: 206–303 underruns/run at floor 20 (2.5–3.6 s inserted silence per
  ~65 s) — bought off by the floor curve, not by the transport.

### REMOTE-INSTRUMENT PLATFORM (session 6j) — ✅ END-TO-END, 24/24 (proto/instrument, workers/instrument)
The "play my synth" pattern as working software on our stack. Owner registers
hardware → public catalog → player requests → owner accepts → DC MIDI up +
WebRTC audio/panel-video back → session recorded as a timeline log → replay
through the SAME send path. Deployed: `elektron-instrument` (hibernating DO;
online/busy DERIVED from live sockets, never stored flags — the rtc `left`
pattern, so a closed lid fires all-notes-off).
- **one-way MIDI player→instrument p50 0.65 / p95 0.95 ms** (n=128; across
  runs p50 wandered 0.25–0.65 — at this scale the two tabs' independent clock
  calibration error ≈ the measurement: honest resolution floor, stated).
- **key→ear 69.9 / 72.1 ms** (WebRTC Opus return — reproduces 6i's 77.7 band);
  0 frames lost/dup/late; replay 128/128 with log growth 0 (overdub rule held).
- Setup: request click → playable **611 ms**; offer → MIDI channel open 203 ms;
  answer → PC connected 53 ms.
- Second player REJECTED honestly (told who holds it, since when); `waiting` is
  a real count so a queue needs no protocol change.
- Host self-test (session 6k below) linked as "Check my rig ↗"; server falls
  back across proto dirs so it runs unmodified on both ports.
- v0 gaps stated: no MoQ return (seam = play.js onTrack, worth ~35 ms per 6i),
  no multi-player, no player auth/payments/rate limit (Accept is the whole
  access control), TURN/NAT untested (ice=none, one machine), no hardware run,
  no sysex/NRPN, no reconnect.

### HOST SELF-TEST (session 6k) — ✅ 18/18 (proto/jam/host-check.*)
Owner answers "what will the player experience?" alone. A hardware floor
(21.6/23.4 ms) · B partnerless relay echo (RTT 40.3 → one-way 20.2) · C full
loop with THREE onset taps giving legs directly, not by subtraction (73.7 =
wire 0.5 + instrument 21.7 + return 51.3; buffer share 37.5 = 73% read from
getStats) · D playable DelayNode distance slider (verified 29.1 ms @30,
60.2 @60). Stuck-note soak + CC123 panic + silence check. **Defaults to
RETURN-PATH monitoring** (flipping it relabels the toggle "DIRECT monitoring —
you are lying to yourself"); getSettings() readback of EC/AGC/NS/sampleRate as
pass/fail caught Chrome's fake device handing back 44.1 kHz vs a 48 kHz context
on run one. **Finding: 51 ms of return leg with ZERO network** — the browser
audio stack is the fight before the internet is involved. Trap:
--use-fake-ui-for-media-devices is NOT enough under headless=new (getUserMedia
denied; needs CDP Browser.grantPermissions). Extracted `measure-core.js` (the
C7 kernel) as a shared module.

### MoQ AUDIO RETURN (session 6i) — ⚠️ PARTIAL (agent killed by usage-credit exhaustion mid-run)
**The headline landed before it died: the ~35 ms projection HELD.** Key→ear via
WebCodecs-Opus → MoQ d14 → FIFO-mapped decode → minimal ring playout, vs the
WebRTC row's 77.7 ms:

| cfg | key→ear p50/p95 | leg1 MIDI | leg2 synth | leg3 return | underruns | chunk loss |
|---|---|---|---|---|---|---|
| floor 10 ms, sparse | **35.8 / 41.0** | 0.67 | ~−1.3 | 36.6 | 31 | **0 / 3778** |
| floor 10 ms, mixed | **37.6 / 40.6** | 0.67 | ~−2.1 | 38.9 | 21 | 0 / 2221 |
| adaptive from 10 ms | 40.3 / 57.6 | 0.77 | −0.5 | 39.6 | 5 | 0 / 3104 |
| floor 40 ms, sparse | 66.3 / 72.5 | 0.77 | −1.3 | 66.1 | 3 | 0 / 3879 |

- **2.2× better than WebRTC's 77.7 ms** — confirms the diagnosis that NetEQ's
  un-hintable buffer (not the wire) owned that number.
- **Buffer/underrun curve is the finding**: playout floor maps ~1:1 into
  latency (10 → 36 ms, 40 → 66 ms); adaptive-from-10 is the sane default
  (40 ms p50, 5 underruns) — pick the floor per tolerance, unlike WebRTC
  where the buffer cannot be hinted at all.
- **Zero chunk loss across all runs** (0 of 2221–3879) — the jam matrix's
  note-granular group-racing (2.9%) does NOT bite continuous audio streams.
- **A/V ARMS (rerun 2026-08-27 21:5x, main session)**: `moq-av` (MoQ audio +
  MoQ video) **key→ear 43.08/50.69 ms mixed, 43.37/51.4 sparse at floor 20 ms**
  (legs 0.68 MIDI / 0.4–0.53 synth / 41–42 return). Compare the audio-only
  floor curve (10→36, 40→66 ⇒ 20≈46): **adding video costs the audio path
  NOTHING — MoQ tracks are independent, no lip-sync coupling** (the opposite
  of WebRTC, where video *stabilized* audio). Audio loss 0.017–0.036%
  (3/17860, 11/30885), transit 19.4/32.4, ring 18.2 ms, underruns high at
  floor 20 (104–159).
  ⚠️ **MoQ VIDEO RETURN IS STARVED**: 198 frames published → **30 received**
  (~85% missing; the earlier partial run got 93/93 — so it's unstable, not a
  fixed rate) ⇒ **key→eye and A/V skew remain UNMEASURABLE**. Suspect the
  §13.4/§7 group-racing pathology at video-frame granularity (same family as
  the 2.9% chord-note loss). Needs group batching or an ordered subscription
  before MoQ video is usable for the instrument-panel case.
  ⚠️ `moq-hybrid` (MoQ audio + WebRTC video) **FAILED to establish**: "moq
  subscribe 'audio' dead after 15 attempts" — the arm never ran.
- ⚠️ STILL NOT MEASURED: the hybrid combination — MoQ+MoQ-video,
  MoQ-audio+WebRTC-video hybrid, MoQ A/V skew, and the coupling verdict
  (does video move audio numbers on MoQ as it did on WebRTC?). eyeMatched=0
  in every salvaged run. Rig is built and ready in proto/jam/remote-synth.*;
  rerun cost is small.

### TIMELINE TRANSPORT CORE (session 6h) — built + measured ✅ (timeline/)
- **timeline/transport.mjs is library-grade**: {p0,t0,rate} vector over
  pluggable ClockSource (zero timers in the vector), lookahead wall lane
  (committed-vs-pending + cancel, generation-guarded, per-kind catch-up,
  first-class drift log + 60 Hz position observable), 3 tick hosts + the
  fan-out graveyard as a fixture, Chris-Wilson audio lane with cancellable
  committed nodes, deterministic virtual runtime for CI.
- **Firing error (foreground, n=1270)**: main 1.0/6.4 ms p50/p95; worker
  5.0/15.3; raf 3.7/8.6; fan-out 1.6/2.7 — the graveyard arm is the TIGHTEST
  on clean runs (why it survived 3 generations) and **fails 6/7 correctness
  asserts** (seek orphans ring, fires during pause, rate no-op, clear leaves
  50 armed timers). Reproducible, not folklore.
- **C2 property test GREEN**: reduce(≤t) ≡ play(0→t), 45 seeds (also 150),
  seek/pause/rate gymnastics, exactly-once audit — deterministic, exits
  nonzero. `node timeline/lab/prop-test.mjs` = the CI gate, exists today.
- **Freeze (SIGSTOP 3 s)**: burst = 32 fires in 100 ms (machine-gun, now
  chosen not suffered); drop = 28 dropped cleanly; **reduce = ONE reducer
  call 0.5 ms after wake, state 300/300 correct**. Background tab (real
  visibilitychange): main p95 981 ms (1 Hz clamp), **worker HOLDS 8.5 ms**,
  raf 9175 ms (starved). → **worker tick is the default host**.
- **Audio lane: sample-accurate** (render error p50 10 µs / max 40 µs =
  1–2 samples @48 kHz); already-committed audio holds through a 500 ms
  main-thread busy-loop while the wall lane stutters (two-lane doctrine
  measured). Audio horizon must exceed worst stall (200–500 ms; safe because
  committed nodes are cancellable — the exact capability the oscillator
  corpse lacked). ⚠️ wall↔audio anchor ±25 ms in headless fake-audio —
  re-measure on hardware w/ getOutputTimestamp + periodic reanchor.
- Ship defaults: wall 25/100/150 ms (tick/horizon/lateGrace), worker host
  default, main-thread opt-in (6.4 p95), rAF/fan-out never; catch-up
  per-kind: reduce (stateful) / drop (ephemeral) / burst (idempotent only).
- MIDI arm env-blocked: `midi` native module dlopen mmap errno=1 (EPERM —
  ThreatLocker suspect); harness ships ready for a capable host.

### REMOTE-SYNTH / PLAY-A-SYNTH CASE (session 6g) — first measured key→ear ✅ (proto/jam)
- MIDI up + synthesized AUDIO+VIDEO back, per-leg, sample-accurate onsets
  (AudioWorklet), burned panel video. **P2P key→ear 77.7/80.3 ms** (decoded
  track; physical ears +32 ms outputLatency) = upper piano-action band,
  playable. Legs: MIDI 0.56 ms, synthesis 0.67 ms, **audio return 76.6 ms —
  the WebRTC jitter buffer is 98.6% of the round trip** (NetEQ ~20 ms floor
  + 20 ms Opus framing + adaptation).
- **jitterBufferTarget=0 / playoutDelayHint=0 NEVER helps, often hurts**
  (verified applied; NetEQ clamps at 20 ms; forcing destabilizes — SFU
  116→235 ms). The buffer cannot be hinted away.
- **INVERTED lip-sync finding: the video track STABILIZES the audio jitter
  buffer** — A/V held 77 ms across all runs; audio-only wandered 72→310 ms.
  Panel video lands ~27 ms BEFORE its own sound (avSkew −27). key→eye
  50/73 ms P2P.
- SFU both ways: 116/210 ms sparse (crosses the >100 ms sluggish line);
  at 25 notes/s ~7% of percussive attacks concealment-merged (0 packet
  loss) — audible degradation latency numbers don't show.
- Projections: real deployment P2P ≈ 95–110 ms (browser Opus/NetEQ stack
  dominates, not the wire); **MoQ audio return ≈ 35 ms key→ear (paper, from
  measured 32.6 ms g2g) — the beat-Play-a-Synth candidate**, arm skipped
  in-box (needs new bundle). Play-a-Synth itself publishes no numbers; ours
  is the first measured figure for the pattern.

### OBS-IN-CLOUD + DUAL OUTPUT (session 6e) — ✅ ALL PROVEN (rig/obs-cloud)
- **OBS ran in a CF Container (standard-4) publishing MoQ**: g2g cloud→d14→
  local viewer ≈195/210 ms corrected — statistically identical to the local
  chain; the move to CF costs ~nothing. CPU 52% of standard-4 streaming
  (native amd64 sheds the Rosetta tax); cold wake→audience pixels **11.6 s**;
  version-swap cold boot 126 s. control.mjs drove cloud OBS UNCHANGED via a
  Worker WS proxy (p50 ~65 ms/cmd, full setup 1.5 s).
- **TRAP: CF Firecracker guests have no /dev/shm** → CEF browser sources
  crash-loop FATAL; fix = `mkdir -p /dev/shm && chmod 1777` before
  supervisord (baked in start-cloud.sh). WS-through-Worker does NOT survive
  sleep/wake — fresh instance + fresh disk; driver must reconnect + re-setup.
- **DUAL OUTPUT PROVEN (locally)**: stream slot = obs-moq (d14), recording
  slot = Custom Output (FFmpeg) → rtmp, baked in basic.ini, both started
  via websocket. Simultaneous: MoQ g2g 172/188 ms UNHARMED; RTMP leg
  437/446 ms (ffmpeg/flv path buffers ~255 ms more — fine for the stage/
  archive leg); second encode +30% of a core; StopRecord→StartRecord 6 ms.
  Cloud-side RTMPS untested by design (no Stream inputs created).
- **Radio Tallinn cron-broadcast**: every stage after cron→start() measured
  (wake→OBS-ready 7.4 s, setup 1.5 s, StartStream→MoQ 0.4 s, ~$0.5 raw per
  2 h standard-4 show). Still needed: scheduled() Worker driver w/ reconnect
  + 207-retry, egress decision (d14 caveats vs RTMPS), R2 content pull at
  boot, restart watchdog. NOTE (design review, same day): the automated
  station likely needs NO OBS at all — programme-as-web-page + Route B +
  in-page WebCodecs MoQ is the page-native engine; OBS remains the
  human-mixed-show option. Session cost $0.04 raw / $0.00 net; all cloud
  resources deleted + verified.

### PLAYBACK LAYER (session 6c) — postshow runner, reconcile, masters replay: ✅ COMPLETE
- **postshow.mjs** (the engine.mjs seed; worker v381acbe8 adds POST /show, GET
  /list, delete-tombstone): cuelog∪listing discovery → repackage → index →
  show.json {pid, T0, skewEst, dur, hls, masters, index}. Idempotent: skip-all
  1.5 s; full pipeline 37.7 s on the proof show (ffmpeg itself 0.2–1.2 s; the
  rest is R2 transfer — repackage+indexer double-download ~9 s, engine.mjs
  should share one download).
- **--reconcile** ("studio doesn't always run"): masters-only settle clock
  (10 min quiescence), synthesize-manifest for abandoned participants
  (EBML-sniffed mime, finalized:false), late-chunk extend+re-derive
  (lateSeqs), tombstone = resurrection-blocked re-delete NEVER derive.
  Proven: sweep 1.04 s / one 331 ms listing when quiet (0 actions twice);
  every rule exercised live on a demo copy, then purged.
- **replay-grid ?show=**: boots from show.json + cuelog alone; scrubber with
  cue ticks + span bars; R1 through the new path **p50 4 / max 33 ms**;
  scrubber seeks −41…−65 ms (pixel quantization ~140 ms/px measured apart).
- **Masters/MSE verdict — SPLIT, decision-grade:** vp8 masters play via
  cluster-index+Range+MSE **frame-exact (+5…+11 ms — beats hls.js) at
  1.1–2 MB per seek (10–19 % of file)**; but **h264-in-webm is REFUSED by
  MSE** (isTypeSupported false, all variants) though <video> plays it. THE
  CODEC TRADEOFF: h264 capture = 80 ms copy-remux + universal HLS but NO
  engine-free masters replay; vp8 capture = engine-free desktop replay but
  15× transcode cost for the iPhone HLS. Both paths real; choose per show.
- **SimpleBlock index closes R3**: 2591 blocks == ffprobe's 2591 frames;
  +1 ms parse, ~1.8 MB/media-hour; mapping divergence ±33–72 → 15–22 ms.
  Verdict: linear+skew wins ≤~2–3 min; block anchoring overtakes once drift
  clears ~50 ms — the hour-scale mechanism, validated.

### VERDICT — plan-studio's baked decision is now measured, not argued
Self-recording wins on every axis that matters: bandwidth lands distributed +
elastic instead of 8×-concentrated + real-time; source quality vs inherited SFU
freezes; churn isolation vs everyone's-archive-glitches; consent deletion
proven. Central's only real wins (clean `left`-signaled file ends, zero
participant storage) don't outweigh. HYBRID kept: the studio already pulls
featured/live tiles for the show — recording THOSE is downlink-free and stays
as the derived backup lane (composite path). Grid-archive = A for masters,
B-machinery only for what the grid already pulls.

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

### MoQ multi-publisher + role flip — ✅ FIRST REAL MoQ CEILINGS FOUND
- ✅ Clean to N=20 (62/88 ms); N=30 gates on ⚠️ per-session subscribe budget
  (~20 ns/40 subs — optimistic OK then permanent starvation; churn exhausts the
  session → reconnect rule) + local encode ceiling. Relay itself accepted all.
- ✅ Flip 1.64 s p50: publish 0–1 ms (no renegotiation!), floor = encoder
  spin-up 1.5 s — pre-warmed + draft-16 would beat the SFU's 0.5 s.
- ✅ Death: relay signals NOTHING (watchdog 0.5–0.6 s vs DO 38–126 ms); announce
  GC +10–15 s; **same-name rejoin pre-GC bricks the namespace for minutes** —
  fresh names mandatory. Rejoin 2.5–3.5 s.
- Verdict: grid stays on SFU; MoQ grid needs draft-16 + DO signaling + name
  discipline + connection sharding. RUNBOOK §13; 15 data files.

### Code review (high) + fixes — ✅ 10 severe findings fixed, workers redeployed
- Review: 16 verified correctness findings (clean measured code; issues clustered
  in deployed-worker state/auth + archive failure paths). Fixes commit 0f71cfd:
  ghost-'left' gen-tagging, perm ENFORCED + operator role gated by new
  OPERATOR_TOKEN secret (perm default flipped to open — closing is now an
  explicit operator act), roster cap 500 + putSafe, cue backlog + cancel parity,
  cues worker now token-authed (CUES_TOKEN; rotated once after a log echo),
  uploader retry/exclude/degraded, per-run rooms+prefixes (kills rerun poison +
  orphan clobber), replay-server hardened (/.env 403), classification fix,
  4 one-liners. 14/14 WS behavior checks incl. dual-socket rejoin → 0 ghost
  left; grid regression green; R2 demo replay green.
- Client-visible protocol changes in workers/rtc/DEPLOYED.md (opToken, backlog
  frames, cancel, publish rejection; cues token mandatory).

### Draft-16 relay (user provisioned) — ✅ 3 OF 4 GRID BLOCKERS FIXED
- ✅ Auth free (136 ms establish, message-level rejects); latency = draft-14
  (17.8 native / 30 ms browser); @moq/net speaks 16 unmodified.
- ✅ SUBSCRIBE_NAMESPACE push ~430 ms — roster + 2 s republish hack obsolete.
  Races documented (announce→subscribe retry; announce-flap edge-trigger rule).
- ✅ Mysteries closed: budget = exactly 50 requests/session fixed at SETUP
  (→ shard ≲20 pubs/conn); same-name rejoin brick GONE (explicit reject, GC
  16–18 s); death now clean track-end +14 s (still slow — DO stays detector).
- Engine targets draft-16. Token hygiene: rotate both relay tokens post-
  experiments (they transited chat + local logs). RUNBOOK §14.

### 📱 iPhone AUDIO verdict (screenshots 15:16) — ✅ SOUNDING −21 dB, skew −6 ms
- Opus + AAC-LC decode YES; 2583 chunks / 0 errors; aLat ~66 ms; underruns ~1 %
  (= Chromium band; adaptive cushion still backlog). Video 31 fps, g2g 71 ms.
- Witnessed: transient decoder failure → reconnect attempt 1 → self-healed live.
  MoQ tier scorecard COMPLETE (video/4K/Safari/iOS/audio/iOS-audio all ✅).

### Local-first archive → R2 — ✅ USER'S DESIGN WINS: native T₀ −15 ms from truth
- ✅ R2 enabled + bucket created (no dashboard click needed). Record locally
  (segmented HLS, T₀ stamped at first input write) → upload-verify-delete per
  segment → replay from R2 with `anchor=stamp`: cue p50 77 / p95 95 ms, 7/7
  checks. NO calibration, no strip, no audio dependency.
- ✅ Disk O(1) (2 segments resident of a 48-segment show); upload lag 5.5 s
  (near-live archive); cost ~25× under Stream storage, egress $0. ETag==MD5
  free verification. Honesty note: prior 59 ms partly poll-phase aliasing;
  true engine band 54–95 ms.
- ✅ Wrangler trap sharpened: auto-loads .env from CWD — run outside the repo.
  Proof show kept on r2.dev (playable with cues). proto/archive/README.md.

### VOD cue replay — ✅ PROVEN: p50 59 ms, seeks pass, API anchor −6.2 s trap
- ✅ Full pipeline: live show + 12 cues via deployed Worker → recorded VOD →
  replay page fires each cue within 59/71 ms (p50/p95) of its burned ground
  truth. Seeks: late-join catch-up (0 re-fires), backward rewind, forward
  reconstruct — all assertions green. VOD kept: de39bf19….
- ✅ USER'S cold-start concern vindicated: content anchor vs publisher stamp
  +109 ms, vs **Stream API `created` −6.2 s** — naive anchoring = every cue ~6 s
  wrong. Content-derived T₀ is now the documented rule.
- ✅ Asymmetry: "now" cues 0–1 ms; scheduled replay 33–67 ms early vs live;
  fireDelayMs reproduces live feel. Worker cuelog added (additive, verified).
- proto/replay/{replay.html,run-record.mjs,run-measure.mjs,README.md};
  plan.md §11b; research/timecode-sync-2026-08.md holds the industry synthesis.

### mediamtx + catalog shim — ✅ ECOSYSTEM GAP CLOSED, local venue chain proven
- ✅ ffmpeg WHIP → mediamtx MoQ → browser: 20.6 ms p50, audio A/V skew +12 ms,
  0 errors. mediamtx speaks msf-00/"loc"/AVCC (NOT WARP) on draft-19 — shim grew
  a second branch. OBS-realistic ingest (WHIP) had zero friction.
- ✅ Same shim through CF: moq-pub WARP/CMAF → browser at 60.6 ms — native
  publishers→CF→browsers now WORKS (§7 gap closed). 457-line player, ~150 bridge.
- Interop bug: mediamtx rejects non-auth SUBSCRIBE params (client strips them).
  TLS via JIT cert + fingerprint pinning, no browser flags. RUNBOOK §12.

### 4K on SFU + HLS — ✅ SETTLED: MoQ is the only 4K path
- ✅ SFU: 2160p locks (zero silent downscale, BWE never limits) but the SFU
  accepts H.264 only at Constrained Baseline → Mac Chrome lands on SOFTWARE
  OpenH264 → 12–14 fps + ~100 ms extra; H.265 gets hw but queues (p95 681 ms).
  SFU stays ≤1080p.
- ✅ HLS: 4K RTMPS ingest ACCEPTED, input recorded 3840x2160 — but transcoded,
  top rendition 1920x1080 (manifest + frame grab). No limits doc exists.
- ✅ New trap: 4K ingest silently drops LL-HLS mode (no PART tags despite
  preferLowLatency) — plan.md §2.1 trap #2. Cleanup verified, input deleted.

### MoQ audio spike — ✅ AUDIO WORKS: 32.6 ms, A/V skew −4 ms, zero sync logic
- ✅ Chromium: audio g2g 32.6/41.6 ms ≈ video; 0 decode errors; skew p50 −3.8 ms
  free (both tracks at latency ~0). Opus = the cross-browser codec (AAC missing
  in Chromium; Safari decodes both since 26.0 per WebKit research 2025-09).
- ✅ Implementer trap: browsers regenerate AudioDecoder timestamps → FIFO-map
  encoded-chunk timestamps or a join-skip becomes a permanent +534 ms phantom.
- Deployed page: audio probe on every load + plays ?namespace=elektron-audio-test
  (iPhone audio verdict = one visit). Audio publisher LEFT RUNNING
  (moq-audio-pub-udd + audioserver.py :8896; §10.5 restart). RUNBOOK §10.

### 4K/framerate matrix — ✅ 4K30 CLEAN AT 47 ms; RELAY NEVER THE LIMIT
- ✅ 720p30 33 ms · 1080p60 33 ms (60 fps ≠ faster: burn-at-capture cancels
  quantization) · **4K30 47/78 ms clean, now LIVE on elektron-safari-test** ·
  4K60 ❌ local VideoToolbox ~50 fps ceiling (200 ms plateau, zero relay errors).
- ✅ Stress: 22.9 Mbps sustained through CF flawlessly. Levels per spec. Datum:
  draft-14 accepts duplicate publish (first session wins). Deployed page needed
  zero changes (codec auto from catalog). RUNBOOK §9; results/moq-4k-*.jsonl.
- USER: reload the phone test page — it's 4K now.
- 📱 iPhone 4K verdict (screenshot 10:11, wifi): **decodes 4K30 clean (30 fps,
  0 errors) but at ~843 ms standing latency** (vs 31 ms at 720p) + 1.3 s first
  frame — ⚠️ phone render-path queuing (bitrate only ~1.4 Mbps). Lesson: serve
  phones ≤1080p for latency; 4K for render-capable endpoints. plan-m2m updated.

### 📱 iPHONE VERDICT (user screenshots, 09:31) — ✅ MOBILE SAFARI PLAYS MoQ ON 4G
- Mobile Safari 26.5.2, 4G cellular: connected 282 ms, moq-transport-14, H.264
  720p30, first frame 0.5 s, 31 fps, 0 decode errors, g2g ~31 ms p50 / 51 p95
  (± phone clock). QUIC over cellular worked. The full browser matrix for MoQ:
  Chromium ✅ 33 ms, desktop Safari ✅, mobile Safari-on-4G ✅ ~31 ms.

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
