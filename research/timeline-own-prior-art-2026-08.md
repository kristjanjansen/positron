# Universal timeline — mining the OWN prior art (2026-08-27)

Companion to timeline-prior-art-2026-08.md (external) and timeline-art-prior-art.md
(artistic). Five agents read ~/personal/{time,demo,maria,maria_old,tracker,track}
in full — every file, every branch, git history — briefed to report only what
plan-timeline had NOT already absorbed. Verdict: the plan's settled-preferences
list was the surface; underneath are ~a dozen adoptable mechanisms, a body of
documented failures that harden the v0 laws, and corrections to the lineage
itself.

## 0. Corrections to the record

- **The lineage is longer than "four generations".** elektron 2020's `store:
  true` → Redis history → `CHAT_SYNC` replay was the FIRST record/replay
  implementation; and `~/personal/visualia/plans/lineage.md` (559 lines,
  2026-06) already traces a 16-thread, nine-year idea history including a
  dedicated "Record & replay" thread ending: "board `History` is already
  command-shaped; a recorded session = timestamped command log." Read it before
  any archaeology — it is the pre-built map.
- **`~/personal/track` is empty** — a bare mkdir from 2026-08-22. False positive.
- **maria_old is NOT an earlier timeline generation** — it is a Jan 2025
  WebRTC/HLS streaming lab. Its working tree has been half-reverted to a bare
  Nuxt starter; the real code is at `git show c21c870:<path>`, not on disk.
- **The two halves were never integrated.** In maria, the cleanest adapter
  (keyboard) is local-only and the websocket pages never use the adapter
  contract. The plan joins two halves that never ran together — v0's DoD is
  genuinely first contact.

## 1. New mechanisms to adopt (the internal steal list)

1. **Pre-roll ring buffer** (tracker/demo/head.html:204-282). Capture is ALWAYS
   on; "record" is a window selection over a rolling buffer; `startRecording()`
   back-dates the epoch to the first buffered event inside a lookback window
   (`rec.firstBeat = nowBeatFloat() - (now - pre[0].t)/spb`). The strict
   generalization of "clock origin = first real event" — it also covers triggers
   that arrive 100-300 ms AFTER the user started playing (every
   voice/gesture/operator trigger). Ableton's Capture-MIDI as a log primitive:
   the log runs unconditionally; clip boundaries are a VIEW, not a gate. Known
   trap carried with it: head.html buffers on note-OFF, so a note held across
   the arm boundary wraps to the wrong end of the loop — buffer onsets
   immediately with open-ended duration.
2. **Command-sourcing + undoable command log** (workshop app.vue,
   visualia/packages/engine/src/core/history.ts). Multi-user replication =
   every client executes the same commands off the message stream; no state
   sync, no CRDT — the command IS the protocol, so recording is free and replay
   is re-feeding the log. visualia's `Command {redo, undo, tryMerge?}` with a
   500 ms merge window adds: gesture compaction at capture (dozens of drags →
   one entry), an `alreadyApplied` flag for "gesture already mutated the store
   live, just log it", and — because every entry carries `undo()` — CHEAP
   BACKWARD SEEK (scrub left without replaying from zero). This is a second
   seek strategy beside reduce-from-zero; heavy kinds may prefer it.
3. **Per-kind quantization policy** (tracker md:21-27,205-207). `hit` fires
   immediately; `end` at next bar; `part B` at next 4/8 bars; ARMING resolves
   on the next real input, not on a boundary. Two distinct resolution modes —
   schedule-at-future-boundary and latch-until-next-input — and the quantum is
   a property of the EVENT TYPE, not the transport. Corollary (the
   latency-hiding theorem): adapter latency is free while latency < quantum
   (measured: 150-300 ms lag vs 625 ms beat).
4. **The ACT/DISPLAY split** (tracker index.html:295-299). One source, two
   channels: a low-latency low-information onset that MAY drive the transport,
   and a high-latency semantic result that arrives later, is advisory, and must
   never gate timing. Adapter contract material for every recognizer-backed
   capture source (voice, pose, ASR-over-archive-tapes).
5. **Loopback-through-server as the ordering point** (maria pages/mouse.vue:39,
   transport.vue:8). Originators never schedule locally — they send, and
   schedule only the echoed message, so the relay round-trip is the single
   ordering point for everyone including the sender. Load-bearing and
   undocumented: it only works because the relay echoes to the sender. Name it,
   keep it, and note it composes with sender-stamping (order from the relay,
   time from the source).
6. **The drift channel** — built twice, deleted twice. maria's day-one
   `actualPlaybackTime` (scheduled vs actual fire time, delivered to the
   adapter; removed as "noise") and demo gen-1's `onProgress(progress,
   currentTime)` 60 Hz playhead channel. slider-video.vue — the repo's final
   commit — died precisely at the missing transportPosition ↔ mediaCurrentTime
   ↔ pixel mapping that onProgress supplied. v0 transport MUST expose: per-event
   fire-time delta (adapters compensate for late dispatch) and a position
   observable separate from the event callbacks (visualizers draw cursors).
7. **`gate()` — the continuous→discrete recognizer** (tracker head.html:152-171,
   index.html:266-280). Threshold + dwell (N consecutive frames) + refractory
   gap + hysteretic re-arm; the head-gesture and VAD versions converged
   independently on a 350 ms refractory, and `REARM = TRIG * 0.45` ties
   hysteresis to sensitivity (one knob). Ship as a shared utility for any
   analog capture adapter. Companion: per-user CALIBRATION (18-frame neutral
   pose average) persisted per-device, separate from the log.
8. **Epoch-microseconds capture stamp** (time/audioEventEmitter.js:43):
   `(performance.timeOrigin + performance.now()) * 1e3` — monotonic clock
   anchored to epoch; no NTP steps mid-recording, sub-ms resolution. Adopt as
   the capture clock behind `at` (stored ms is fine; the SOURCE should be
   monotonic-anchored, not Date.now()). Anti-lesson from the same repos: three
   incompatible "microsecond" bases + a unit-sniffing visualizer (demo gen-1's
   `Date.now()*1000` fake microseconds was a documented dead end). One base,
   unit in the field name, header carries t0 — never sniff.
9. **Drift/latency instrumentation as first-class** — three rigs to keep:
   maria_old's ffmpeg test pattern with the WALL CLOCK BURNED INTO EVERY FRAME
   (on-screen number vs local clock = end-to-end latency, zero tooling); demo
   gen-1's color-graded per-event drift column (green <5 ms / yellow / red
   ≥20 ms); tracker's `elog()` prepending +Δms-since-last-event to every log
   line. And the method note: head.html instrumented the adapter's FPS/latency
   BEFORE building the feature on it.
10. **Scheduling-as-authoring is already in the transport** (demo f699c1b
    pages/transport.vue). Future timestamps first-class ("Schedule in 2s"
    beside "Record now"), with a Scheduled/Recorded/Played lifecycle label.
    maria slides.vue pre-seeds synthetic events the same way. The C10 boundary
    holds — but the LOG must accept programmatic future events; cue fireAt is
    the degenerate case.
11. **Overdub semantics, concretely** (demo useTransport.ts:33-41): schedule()
    during playback fires the callback immediately AND marks the event played
    so it doesn't re-fire in the same pass, joining the log in sorted position
    for the next pass. This is the mechanism behind "record and replay share
    one path" — port it, don't reinvent it.
12. **Sessions/rooms shape** (maria_old streams API): `GET /sessions →
    [{id, joinUrls, live status}]` + a Copyable join-credential component.
    maria itself had NO rooms — one global bus, `type` string as the only
    namespace. elektron's room DO supersedes, but the discovery-list shape and
    credential UX are the missing operator surface.

## 2. Laws sharpened by documented failure

- **Lookahead-window scheduling is mandatory, proven three ways.** time's
  three-commit chain (guard blocks everything → clamp collapses the past into
  one burst → normalize to origin); demo's three schedulers (drift-corrected
  await loop — cheapest correct design, discarded; oscillator-per-event — node
  churn, ~600 nodes/10 s; setTimeout fan-out — pause/seek/rate structurally
  impossible); maria's fan-out with thousands of armed timeouts. Also
  unhandled everywhere: tab-blur throttling (on wake, bulk-schedule fires every
  missed beat at past times — machine-gun burst; no visibilitychange handler
  in any repo), late AudioContext suspend, and NO cancellation path for
  committed audio (Clear empties the model; scheduled oscillators keep
  ringing). The library needs committed-vs-pending with per-adapter
  cancel/flush, and an explicit catch-up policy (drop/burst/re-phase).
- **Never re-stamp at handler time — caught in the act.** tracker's pre-roll
  measures its window from handler invocation, not gesture time: back-dating is
  systematically ~130 ms late (DWELL + inference). maria re-stamps every remote
  event with local Date.now() at receive — the one multi-user demo resolves the
  two-clock conflict by DELETING one clock; the honest merge attempt (remote
  datetime + content dedup + ordered insert) sits commented out in
  messages-demo.vue:66-107. Law (C5 sharpened): every adapter event carries its
  origin timestamp in its own clock plus a mapping; the transport converts.
- **Cross-client event identity must be minted at capture.** maria mints
  `id: randomId()` at RECEIVE — two clients mint different ids for the same
  event; no dedupe, no idempotent redelivery possible. demo has no ids at all —
  `:key="timestamp"` silently drops same-ms events (a MIDI chord). The
  key+window dedupe primitive was built twice (50 ms MIDI, 1000 ms ws) —
  generalize as `dedupe(keyFn, windowMs)` with bounded-map GC.
- **The transport owns record state, multi-listener dispatch, and unsubscribe.**
  Both maria and demo collapsed to a single mutable callback slot (silently
  overwritten), and as a direct result every page re-implements a local record
  flag — seven hand-rolled copies in demo alone. Root cause on record: gen-1's
  `off(cb)` was passed a fresh closure that matched nothing (double-fire on
  every replay), and the overreaction was deleting multi-listener support.
  `on()` returns an unsubscribe; per-kind subscription (demo9's named-channel
  Map) over one global array.
- **Origin/duration are session properties, not derived from events.**
  Deriving t0 from the first event trims leading silence (demo gen-2); maria
  auto-stops on the last event, truncating trailing silence; time's demo9
  playhead and dots use different zeros and never re-align after reset.
  Recording header `{t0, duration}`; events may carry relative offsets under it.
  (tracker's "origin = first real note" is the LOOP-PHASE rule — musical, per
  §1.1 pre-roll — not the archival-fidelity rule. Two different origins, both
  legitimate, both explicit.)
- **The log is immutable; cursor state lives in the transport.** time stored
  `played` on the event records (play() works once; demo12 hand-resets flags);
  maria's `relativeTimestamp` is denormalized state rewritten O(n) on every
  insert and its "latest event" read-after-sort marks the WRONG event played.
  Derived views, never stored state. Re-sort-on-append appears in three repos —
  binary insert + monotonicity assert.
- **Untrusted payloads must not spread over control fields.** maria hit it:
  `...event` spread let a stale wire `status` clobber local state (fixed by
  field order — fragile); the `_`-prefix namespacing convention was tried and
  dropped one commit before the bug. plan-timeline's envelope keeps payload
  nested — keep it that way, and treat this as the recorded reason.
- **Replay needs the editing model, not the input stream.** Three repos, five
  text adapters, every one refuses arrow-keys/selection/IME with an apologetic
  comment; the newest code REGRESSED to append-only. When the surface has state
  the log doesn't capture, one-code-path replay breaks. For text kinds capture
  the semantic op/diff (or result), not keystrokes — same conclusion as
  rrweb's whole existence. Adjacent: shift/modifiers must not be stored
  pre-resolved AND re-applied (double-uppercase bug in four files).
- **Two-list state reconstruction was invented twice and never named** (demo
  chat.vue, messages-demo.vue): the playback view is a projection built by
  folding the log, never the live store — `fold(events ≤ t)` arrived at
  independently; it IS the reducer/seek operation. C2's property test has
  empirical ancestry.

## 3. Adapter-contract addenda (from wounds, not theory)

Beyond `{capture?, actuate, reducer?, interpolate?, caps}`:
- **`setupPlayback()` = reset-then-subscribe as a distinct lifecycle step**
  (demo test branch — the only clean adapter ever written, unmerged). Every
  maria/demo page hand-rolls actuator reset before replay.
- **Capture declares a swallow-the-original flag.** maria's Tab regression:
  extraction to composable lost `preventDefault` — recording Tab now also moves
  focus. Capture and live UI fight without it.
- **Media adapters need `prepare()` (await canplay) and element seek.** demo's
  video — the ONE surface with its own internal clock — never actually synced:
  hard-coded 100 ms load race, nothing writes currentTime, transport stop
  doesn't pause it. The plan's media-span actuator must budget for this, it is
  not free.
- **Output targets vanish** (demo midi.client.vue:360): onstatechange →
  re-enumerate → rebind-or-fallback. Actuator half needs a rebind path.
- **Input filter stage before the log** (MIDI clock = 24 ev/beat dropped
  pre-schedule; maxEvents ring on display). Capture-side allowlist is part of
  the contract, like throttle.
- **Payload = actuatable form + display form** (midi: rawData for hardware,
  description for humans). Maps directly onto C7's unknown-kind round-trip.
- **Renderer may deviate from the log; the log stays faithful** (tracker's
  ring ≥1.6 s overriding recorded duration) — deviation policy belongs in the
  actuator, stated in caps, never written back.
- **Distinct verbs: commit / discard / layer; mute ≠ delete** (head.html: DOWN
  commits, UP-while-recording discards, RIGHT deliberately layers, repeat
  triggers refuse to pile up; its `delete loops[id]` with no mute is recorded
  as the anti-pattern). Abort-if-empty on toggle transports.
- **Clock-source adapter** (tracker md:100-103): sync to Ableton Link / MIDI
  clock as slave, fall back to master — the transport must not assume it owns
  the clock. Sharpen the v2 Link "experiment" into this contract.
- **Recognizer adapters are environmental** (MediaPipe broken by a page global
  `window.dbg`; GPU→WASM fallback; sherpa-onnx blocked for lack of a WASM
  build; Moonshine chosen BECAUSE it returns empty on non-speech where Whisper
  hallucinates). Capability detection + defensive loading belong in the
  adapter loader; engine choice criteria are behavioral, not benchmark.

## 4. Strip/UI harvest (for the one canonical component)

- **Dual cursor** (time demo9): wall-clock "now" line drawn beside the
  playhead — the visible gap IS the accumulated pause offset. Ship it.
- **View-window model is the unsolved wall in ALL generations**: 5000 px /
  10 s / 30 s hardcoded ceilings in four repos; fit-to-content computed and
  never wired, twice; no zoom anywhere; tick density hardcoded at two scales.
  strip.mjs needs `{originTime, pxPerSecond, scrollX}` + virtualized draw +
  tick LOD as day-one requirements, not polish.
- **Follow-mode** that disengages on user scroll (demo9 re-centers every frame
  and fights the user — the recorded failure).
- **Two renderers over one array** (demo): dot-strip vs value-bars sharing one
  props contract = the renderer-registry-keyed-by-payload-shape seam. One
  shared `active` cursor threads through strip AND log views; flash-then-clear.
- **Per-author color** = `idToColor()` hash (hue 0-360, s 65-85, l 55-65) —
  deterministic, palette-free; survives reload via stored user id.
- **Control-is-the-display**: tracker's threshold marker ON the level meter
  (drag the meter to set VAD_ON); zone overlay sized from the actual TRIG
  geometry so the picture cannot drift from the code.
- **Two visual registers, both wanted**: ambient translucent bottom-dock over
  the live app vs opaque bordered inspector widget (time demo9 vs demo12);
  maria's slot-based panel shell (panel owns log render, page injects
  controls); log row → full-JSON inspector accordion.
- **Transport controls must be out-of-band** or capture element-scoped — the
  recorder records the act of recording otherwise (time demo12 excludes its own
  control keystrokes by hand).

## 5. Storage notes

- **Media markers in the log, blobs out-of-band** — independently arrived at in
  maria (media.vue start/stop markers) and demo (clipId reference) — confirms
  the R2-by-reference law from the inside. demo's abandoned branch carried the
  fatter `videoInfo {startTime, endTime, duration}` = the Span type's ancestor,
  and the visualizers' inability to draw it is why C1 exists.
- **Content-addressed recordings + sidecar index** (time demos 5-8): infohash
  as recording id, magnet as share handle, localStorage metadata beside opaque
  payload store, filesystem as source of truth. The R2 layout wants exactly
  this shape (content hash, manifest sidecar).
- **Chunked capture = durability** (MediaRecorder start(1000) in three repos):
  the media analogue of the 100 ms flush rule — tab death loses ≤1 chunk.
- **Config ≠ log**: tracker's planned "songbook" YAML (commands→actions,
  arrangements, per-section tempo/patch maps) and head.html's persisted
  calibration are the two config stores that must NOT live in the event log.

## 6. Negative results (paid for; do not re-run)

- Reverse playback on a WebAudio scheduler is unreachable (signed-rate code
  written, structurally dead — schedule-into-past impossible). rate<0 needs
  the transport-vector model (Timing Object), not the audio lane.
- D3 loaded, described in the index, never used — hand-rolled canvas won for a
  dense per-frame strip.
- Frame-count decimation (`frameCount % 10`) breaks on 120 Hz displays and
  throttled tabs — wall-clock throttling only.
- demo10's destructive sampler (decimation CONSUMED the ground-truth buffer)
  invalidated its own comparison — capture and decimation buffers separate.
- Directory-handle persistence: three mechanisms hunted, zero worked, all
  silently caught (missing dep swallowed; requestPermission without user
  activation). Hard-fail on missing deps; re-grant needs a gesture.
- Voice command vocabulary: command+argument sequencing ("start two") loses
  the argument to eager recognizers; collapsing to single-token commands
  (spoken digits = loop slots) both raised accuracy and DELETED the sequencing
  problem. Choose token alphabets distinct in the recognizer's own space.
  PTT-gated → optimize against misses; always-on → against false triggers.
- tracker's dead code maps the abandoned scope: auto-comping, section/scene
  jumping, TTS confirmation all stubbed then dropped. What survived contact
  with performance: capture + phase + loop. Scoping evidence for v0.
- ScriptProcessorNode at 512 frames bought 32 ms onset latency (8× cut from
  the 256 ms first build) — the tradeoff is real; AudioWorklet is the
  production answer.

## 7. Housekeeping (act on these)

- **Rotate two Cloudflare API tokens + an RTMPS key**: one committed in public
  kristjanjansen/studio (flagged in lineage.md too); one in maria_old git
  history at server/api/streams/index.get.ts:3 AND in a deleted client-side
  page (pages/api/index.vue:4) that would have shipped it to the browser.
- maria was never actually deployed (netlify publish dir mismatch, empty
  .output) — the "multi-user free" memory claim is about the ws relay, not a
  deployed app.
- The wss://data.elektron.art relay contract (6 lines, echoes-to-sender, no
  rooms, no stamps) is load-bearing for maria-era demos; elektron's room DO
  replaces it, but §1.5's ordering trick should survive the migration.
