# timeline/lab — measurement notes (2026-08-27)

Session goal: build timeline/transport.mjs (vector + lookahead scheduler +
audio lane) and measure it — firing precision per tick host, seek/pause/rate/
cancel asserts (incl. the fan-out graveyard arm), C2 property test, SIGSTOP
freeze/catch-up per policy, audio-lane sample accuracy.

Machine rules honored: port 8896, CDP 9321, Chrome pattern `tlab-udd`,
plain node ESM. Truth clock = jam harness method (min-RTT vs local
/time-local, hrtime-anchored; ±0.15 ms class).

## Checkpoint 1 — library + C2 property test green

- `timeline/transport.mjs` written: {p0,t0,rate} vector (no timers, pure
  position math), pluggable ClockSource, tick hosts (main/worker/rAF) +
  fan-out graveyard reproduction, lookahead scheduler with committed-vs-
  pending + per-kind policies (burst/drop/reduce) + first-class drift log,
  audio lane (Chris Wilson lookahead, cancellable committed nodes), virtual
  runtime for CI determinism.
- `node timeline/lab/prop-test.mjs`: **OK at 30 seeds (30 basic + 15
  gymnastics) and at 100 seeds (100+50). 0 violations.**
  - basic: reduce(events<=t) === state after play(0->t), non-commutative
    counter (add/mul/set), traces 200-600 events with same-ms ties and 1 ms
    clusters, t sometimes bisecting the trace.
  - gymnastics: random seek/pause/resume/rate(0.5-3x) mid-run, state
    reconstructed via reduce on seek; final state still === reduce(<=tEnd);
    exactly-once fire audit per pass; position hold asserted during pause.
- Design note recorded: the C2 property is stated for *pre-scheduled* traces
  (the replay contract). Overdub (schedule at/behind playhead during play)
  fires at arrival, which for non-commutative reducers can differ from
  at-order fold if `at` is back-dated beyond the current playhead — capture
  adapters stamp at ~now, so divergence is bounded by capture latency.

Next: browser lab (server :8896, lab.html, run-lab.mjs), arms A/B/D/E.

## Checkpoint 2 — lab up; arm B (correctness asserts) done

Truth clock calibrated at minRTT 300 µs (offset accuracy ±150 µs class — the
jam method reproduced). Headless Chrome 151, CDP 9321, pattern tlab-udd.

Arm B matrix (7 asserts × 4 mechanisms), first full run:
- **main / worker / raf lookahead: 7/7 PASS** — seek skips cleanly (0 fires
  from the skipped window, checked across the WHOLE run so orphans ringing
  late are caught), pause holds position to 0.000 ms with 0 fires, rate 2x
  median inter-fire 50.1-51.3 ms, backward seek replays each event exactly
  once, clear cancels all, 0 armed timers after clear.
- **fanout (graveyard arm): FAILS 5/7, exactly the documented corpse**:
  50 skipped-window fires after seek (orphan timers ring at original
  deadlines), 20 fires during the 2 s pause, rate 2x has NO effect (no fires
  land in the rate window at all — median null), backward seek replays
  nothing, clear leaves 50 armed timers which all ring. Only the two pure
  vector-math checks pass (pause-holds-position) — the vector was never the
  problem; per-event timer fan-out is.

Arm A first row (main host, 60 s mixed trace, 1270 events):
p50=1.0 p95=6.4 p99=7.3 max=9.1 ms at 0.9% renderer CPU — within the ±10 ms
expectation. Position observable ran at ~8.3 ms cadence (headless frames
~120 Hz). Full A/D/E/BG matrix in flight; midi arm (F) prepared —
`midi` npm built clean on node 25, virtual-port receiver ready.

## Checkpoint 3 — A complete; D (SIGSTOP) + E (audio) + BG landed

Arm A (foreground firing error, ms, n=1270 each, all fired 1270/1270):
- main:   p50 1.0  p95 6.4  p99 7.3  max 9.1   (cpu ~0.9%)
- worker: p50 5.0  p95 15.3 p99 17.3 max 18.5  (postMessage hop + worker
  timer slack — the foreground COST of the worker host)
- raf:    p50 3.7  p95 8.6  p99 9.1  max 10.4  (frame-quantized; headless
  frames ~120 Hz so one-frame error ≈ 8.3 ms)
- fanout: p50 1.6  p95 2.7  p99 3.1  max 3.5 — the graveyard arm is the
  TIGHTEST on a clean run, exactly as research §2 predicted; arm B is where
  it dies (5/7 asserts failed).

Arm D (SIGSTOP 3.06 s at ~10 s into 30 s playback, worker host, 10/s per kind):
- burst kind: 300/300 fired; 32 fires within 100 ms of wake — 30 of them
  within 0.5 ms (the machine-gun, now visible and CHOSEN, not accidental).
- drop kind: 28 dropped (lost by policy), 3 in-grace/committed fires at wake,
  clean cadence resumes ~12 ms after wake.
- reduce kind: ONE reducer call 0.5 ms after wake with all 28 missed events;
  state 300/300 correct — time-to-consistent 0.5 ms.
- fanout baseline: 899/899 fired, 94 in the first 100 ms post-wake, no
  policy control possible. maxTickGap measured 3038.9 ms = the freeze.

Arm E (audio lane, 200 clicks @10/s, AudioWorklet threshold truth):
- Render accuracy (detected vs start() time, audio domain): p50 0.01 ms,
  p95 0.04 ms — i.e. 10-40 µs, 1-2 samples at 48 kHz. Sample-accurate.
- 500 ms main-thread busy-loop at 10 s: audio committed within horizon holds
  perfectly while the WALL lane stutters (wall p95 during busy 500.6 ms vs
  12.8 ms overall). horizon 100 → 5 clicks never committed (lost); horizon
  500 → 1 lost (the very first at t=500), busy window fully covered.
  Two-lane doctrine + horizon-must-exceed-worst-stall, both measured.
- CAVEAT: audio-vs-wall clock drift measured 1900-5200 ppm — headless fake
  output device, not a hardware DAC number; re-measure on real hardware
  before trusting cross-domain anchors long-term.

Arm BG (background tab, hidden 5-15 s of a 25 s 10/s run, real
visibilitychange observed in headless):
- main host: fg p95 3 ms → hidden p95 980.7 ms (the 1 Hz timer clamp).
- worker host: fg p95 15.9 ms → hidden p95 8.5 ms — HOLDS (worker timers
  unthrottled; postMessage delivery is not a throttled timer). The worker
  host earns its keep exactly here.
- raf host: fg p95 3.5 ms → hidden p95 9174.6 ms (frames stop entirely; all
  fires burst on re-visible). The anti-pattern, quantified.

## Checkpoint 4 — wrap: F skipped (environment), verdict + defaults

- Arm F (Web MIDI → node virtual port): SKIPPED cleanly. `midi` builds on
  node 25 but dlopen of the built .node fails mmap errno=1 (EPERM) on this
  Darwin 25.6 host — survives ad-hoc codesign and sandbox-off. Web MIDI
  permission grant in headless Chrome itself proven
  (Browser.grantPermissions origin + midi/midiSysex). Harness ready:
  midi-recv.mjs + midi.html + run-midi.mjs. artifacts/midi-2026-08-27.json.
- Final prop-test for the record: OK, 30+15 seeds, 0 violations (exit 0).
- Cleanup verified: no tlab processes, 8896/8897/9321 free; sibling's
  8893/8895 never touched.

VERDICT: the {p0,t0,rate} vector + lookahead + committed-vs-pending design
holds everything the plan claims, measured. Ship defaults: wall lane
tick 25 ms / horizon 100 ms / grace 150 ms; tick host = WORKER by default
(the only host that survives hidden tabs: 8.5 ms p95 hidden vs main's ~1 s
and rAF's 9.2 s), main-thread host as an opt-in for foreground-critical
precision (6.4 ms p95), rAF and fan-out never. Audio lane: horizon must
exceed the worst expected main-thread stall (500 ms horizon rode through a
500 ms busy-loop; 100 ms lost 5 clicks); scheduling accuracy in the audio
domain is 10-40 µs (1-2 samples @48 kHz). Catch-up: reduce reaches
consistent state 0.5 ms after wake from a 3 s freeze; burst is the
machine-gun made policy (30 fires < 0.5 ms); drop loses exactly the frozen
window. Full numbers: artifacts/summary-2026-08-27.json; raw rows in
results/*.jsonl (gitignored by design).

## Checkpoint 5 — v0.2: the six client API seams closed (2026-08-28)

proto/jam was the library's first real client and filed six API gaps
(proto/jam/NOTES.md C11). All six are now fixed IN THE LIBRARY, and the fixes
are proven by two further adoptions (proto/jam/jam-interval.html,
proto/selfrec/replay-grid.html).

1. **Adapter registry.** `sched.registerAdapter(kind, {caps, actuate, reduce,
   assertState})` + per-kind dispatch inside `fire()`; `caps.catchUp` derives
   the policy, so a client touches neither `onFire` filtering nor `setPolicy`.
   `onFire` stays for HUDs/harnesses that want every kind. Also
   `adapterCaps()`, `assertAt(pos)`, `reduceAt(kind, pos)`, and `createDeck()`
   — the whole transport+scheduler+observable+drift facade the first client had
   to hand-write. **jam-timeline.js went 105 → 39 lines.**
2. **`setRate()` no longer plays.** `setRate(r)` while paused arms the rate and
   stays paused; `play(r?)` is the only thing that starts motion; `.targetRate`
   exposes the resume rate so a paused UI shows `0.50×` instead of `0.00×`.
   `setRate(0)` is still an explicit pause.
3. **The coded default is now the measured VERDICT: WORKER.**
   `createScheduler` used to default to `mainTickHost()` while this file's
   verdict shipped worker — the code and the doc disagreed. Now
   `host = tickHostByKind(hostKind)` → `defaultTickHost()` → `workerTickHost()`
   wherever `Worker` exists, falling back to `mainTickHost()` outside a browser
   (node has no global Worker). Main is an explicit opt-in
   (`hostKind: 'main'` or an explicit `host`) for foreground-critical
   precision: **6.4 ms p95 main vs 15.3 ms worker**, against worker's
   **8.5 ms p95 hidden vs main's ~1 s**. That is the whole trade, and it is now
   the *documented* default rather than an accident. No measured number moved:
   every lab arm and prop-test passes its host explicitly.
4. **Wall → audio bridge.** An adapter declaring `caps.audio = {ctx, leadMs}`
   gets a third `when` argument on `actuate(payload, rec, when)` carrying the
   fire's instant in AudioContext seconds — `ctx.currentTime` sampled at the
   fire, corrected by the drift record's own `deltaMs`
   (`audioTime = ctxTime + (-deltaMs + leadMs)/1000`), so an EARLY fire leaves
   exactly its earliness as scheduling headroom (`when.earlyMs`). Opt-in per
   adapter; `when === null` otherwise. The converted instant is also written
   into the drift row (`audioTime`, `earlyMs`).
5. **`reduce` sees the WHOLE PREFIX.** It used to see only the events one scan
   happened to miss — fine for a commutative held-note fold, wrong for a
   non-commutative reducer, which cannot know what came before the window.
   **The guarantee now: a reducer is always handed the complete ordered prefix
   of its kind (every event with `at <= pos`, in `(at, seq)` order), so
   `reduce` is a pure function of the prefix and `assertState` is an absolute,
   idempotent assertion — i.e. `assertState(reduce(prefix ≤ t))` equals the
   state after `play(0 → t)` for ANY reducer, commutative or not.** The
   explicit alternative ships in the same call for reducers that prefer to fold
   forward: `info.from = {pos, state}` (the last reduce boundary and the state
   it returned) plus `info.since` (events in `(from.pos, pos]`);
   `fold(from.state, since)` is equally correct. `info.missed` keeps the old
   one-scan batch for diagnostics. The raw `setPolicy(kind, {reduce})` escape
   hatch keeps its historical `reduce(missed, info)` signature with the
   enriched `info`, so arm D is untouched. Seek now re-folds and re-asserts
   through the same reducer with no client code.
6. **Drift is a channel, not a mailbox.** `onDrift(cb)` subscribes,
   `peekDrift()` reads non-destructively, `driftStats()` reports
   `{total, retained, dropped, limit}`; a HUD and an assert harness can now
   both observe the same fires. `drainDrift()` stays for bounded memory, and
   the retained buffer is capped (`driftLimit`, default 20 000) so a peek-only
   client cannot grow it silently.
- Bonus seam the media client needed: **`transport.sync(pos, {toleranceMs})`**
  — slave the vector to an EXTERNAL clock master (a media element, a peer)
  by re-anchoring `{p0,t0}` with no seek semantics: no reconcile, no
  re-assert, nothing re-fires, only committed timers re-armed.

**prop-test: still green, and now proves the seams.** `node
timeline/lab/prop-test.mjs` → OK at 30 seeds (30 basic + 15 gymnastics) AND at
100 (100 + 50), 0 violations, plus a third suite asserting all six seams
deterministically on the virtual runtime. The seam-5 arm deserves a note: it
reproduces a SIGSTOP-shaped freeze with a wrapper TickHost that swallows ticks
for 3 s and defers timers to wake, over an add/mul-only (deliberately
`set`-free, so a batch-only fold can never resynchronize by luck)
non-commutative trace, and checks three things — the asserted state equals the
whole-prefix fold, `fold(from.state, since)` agrees with it, and **the old
one-scan input gives a DIFFERENT answer**, i.e. the test is a real witness that
would have failed against the pre-v0.2 library.

**Regression re-run (arms A, B, E; D/BG/F carried forward in the artifact).**
Nothing moved beyond run-to-run noise:

| arm | metric | before | after |
|---|---|---|---|
| A main   | p50 / p95 ms | 1.0 / 6.4 | **1.3 / 6.9** |
| A worker | p50 / p95 ms | 5.0 / 15.3 | **4.3 / 15.1** |
| A raf    | p50 / p95 ms | 3.7 / 8.6 | **4.1 / 7.7** |
| A fanout | p50 / p95 ms | 1.6 / 2.7 | **1.7 / 2.8** |
| B main / worker / raf | asserts | 7/7 | **7/7** |
| B fanout | asserts | 1/7 | **1/7** |
| E audio  | render delta p50 / p95 | 0.01 / 0.04 ms | **0.01 / 0.04 ms** |

All four A arms fired 1270/1270. Arm E is identical to the digit, including the
lane counts (h100 191 rendered / 5 passed, h500 195 / 1) — the 10–40 µs
sample-accuracy result stands.
- **Correction to Checkpoint 2's prose:** it recorded the fan-out arm as
  "FAILS 5/7 … only the two pure vector-math checks pass". The recorded data
  (results/asserts.jsonl, both runs) says **6 of 7 fail and exactly ONE passes**
  (`pause-holds-position` — there is only one pure vector check, not two). The
  numbers are unchanged run to run; the earlier sentence was a miscount.
  Failure detail is byte-identical: 50 skipped-window fires after seek, 20
  fires during the 2 s pause, rate 2× has no effect (median null), backward
  seek replays nothing, 50 timers still armed after `clear()`.

Next client's cost: a new kind is now `caps` + `actuate` (+ `reduce` /
`assertState` if it wants seek to mean anything) handed to `createDeck` —
no transport, no scheduler wiring, no drift plumbing, no reduce-on-seek.
