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

## Checkpoint 6 — v0.3: COMPOSITION ACROSS TIMELINES (2026-08-28)

The last structural gap after four clients (PROGRESS 6q): every client could put
*media* on a timeline; none could put a *timeline* on a timeline. `sync()`
slaves a vector to exactly one external master and a deck's position is a single
scalar, so "a stored instrument session dropped into an arrangement beside a
1965 broadcast" had no representation.

**New file `timeline/nested.mjs` (~300 lines).** The whole API a client touches:

```js
const nest = createNest(parentDeck, { toleranceMs: 40, hardSeekMs: 250 });
nest.add({ id, at, rate, deck: childDeck, master: false });   // a span that IS a deck
nest.servo();                                                  // from the rAF loop you already run
```

plus `nest.span/spans/childPos/parentPos/present/rateReport/masterId/driftStats/
dispose`, and free functions `rateLattice(deck)`, `composeRate(pr, sr, allowed)`,
`checkNestable(parent, child)`, `nestedDrift(deck)`, `MAX_NEST_DEPTH = 8`.
It is a normal adapter (`kind: 'deck-span'`, `caps.catchUp: 'reduce'`) — the
library needed **no changes to transport.mjs at all**. That is the seam-1
registry paying off: composition is just another kind.

### The six rules, and why each is that way

1. **Domains do not mix.** `childPos = clamp(child.range, child.range[0] +
   (parentPos − at) × rate)`; the span occupies `childDur/rate` of PARENT time.
   Outside it the child is **absent** — paused and asserted at the boundary it
   left through (`c0` before, `c1` after), so its reducer states the edge.
   Absence is content, one level down too.
2. **Rate composes multiplicatively and degrades OUT LOUD.** Effective =
   `parentRate × span.rate`. The child's rate lattice is the INTERSECTION of its
   adapters' `caps.rates`; off-lattice we pick the nearest **in log space** and
   report `{wanted, chose, degraded, allowed, reason}`. Rate 0 (pause) is always
   expressible and never degrades.
3. **Seek in the parent is a real `seek()` in the child** (never a `sync()`), so
   reduce-on-seek runs INSIDE the nested span and `assertState(reduce(prefix ≤ t))`
   still holds one level down. `sync()` is reserved for the servo — a correction
   must never re-fire.
4. **A nested child never masters the parent** unless the span declares
   `master: true`, and at most one span per parent may. Default is *follow*
   (parent leads, child slaved: `sync()` inside the dead band, a real `seek()`
   past `hardSeekMs`). With `master: true` the direction reverses and the
   important half applies: **if the child contains its own clock master (a media
   element), that master governs ONLY WITHIN THE CHILD and the parent slaves to
   the CHILD'S POSITION, never to the element.** One indirection, and the two
   masters cannot fight. **Corollary found while building: a DEGRADED child
   cannot master** — it is running at a rate the parent did not ask for, and
   letting it drive the clock would silently impose that rate on the whole
   arrangement. Mastering SUSPENDS for the duration and the suspension is
   counted (`masterSuspended`), not hidden.
5. **Drift nests, never flattens.** `nest.driftStats()` is a span table with each
   child's own drift channel (and ITS nest, recursively) hanging off it. A p95
   averaged across two position domains would be a number about nothing.
6. **Cycles rejected at `add()` time**, not discovered at play time: a deck may
   not contain itself nor any ancestor (a deck appearing twice in a DAG *is*
   legal). Depth capped at **8 decks in a chain** — seek and assert recurse the
   chain synchronously.

No timers live in nested.mjs (the vector law): `servo()` is called from the
client's existing rAF/interval loop, exactly like the media servo every media
client already runs.

### prop-test: suite 4, and still green everywhere

`node timeline/lab/prop-test.mjs` → **OK at 30 seeds (30 basic + 15 gymnastics +
10 freeze) AND at 100 (100 + 50 + 34), 0 violations.** Suite 4 needed one
harness trick: two decks want two tick metronomes on ONE virtual clock, and the
virtual host holds a single `tickCb` — so it is fanned out (`sharedVR`), with
`setTimer` passing straight through so commit ordering stays exact.

| arm | what it asserts |
|---|---|
| `nest-span` | span length in parent time = childDur/rate; lattice = the child's caps.rates; adapter declares `nested:true, clockMaster:false` |
| `nest-seek` | 5 nested seeks (incl. `u=0` and `u=3999`): child position exact to 1e-6, held-note set === `reduce(<= u)`, a `reason:'seek'` assert really ran IN THE CHILD, and `child.reduceAt()` agrees |
| `nest-pause` | parent pause stops the child; both positions frozen over 3 s of virtual time; the servo corrects nothing while paused |
| `nest-rate` | 2×1 composes exactly; `setRate` still ARMS while paused one level down; 6× on a [0.25,0.5,1,2,4] lattice → **4×, degraded**; 0.3× → 0.25× (log-nearest); pause never degrades; a child with no declared rates takes any rate; the degraded child is re-anchored by the servo and the degradation is COUNTED |
| `nest-absent` | before the span: paused, parked at `c0`, nothing held. After it: parked at `c1`, nothing held, does not advance while the parent plays past it and the parent's own kind keeps firing |
| `nest-servo` | a 60 ms shove is pulled back with **`sync()`, 0 re-fires** |
| `nest-master` | master span corrects the PARENT and does not drag the child back; parent lands exactly on `toParent(childPos)`; a paused parent is never synced by its child; **a degraded child stops mastering and flips back to follow** |
| `nest-cycle` / `nest-depth` | self-containment, `c → a` closing an `a → b → c` loop, and duplicate ids all rejected; `a → c` (a DAG diamond) allowed; a chain of 8 legal, 9 rejected |

Composed-demo results (the motivating case) live in `proto/remixer/NOTES.md`
Step 6 — 16/16 headless, 0 upstream calls.

## Checkpoint 7 — v0.4: CONTINUOUS KINDS ARE FIRST-CLASS (2026-08-28)

Four clients were **discrete** (a note fires, a tile appears, a cue lands).
proto/paths brought the first kind whose state is defined **between** samples and
filed six seams (proto/paths/NOTES.md §3). All six are closed in-library. The
transport half still needed nothing; every change is in the adapter half.

| # | seam | the API line that closes it |
|---|---|---|
| C1 | no positional read but the O(n) `reduceAt` | **`deck.sampleAt(kind, pos, opts)`** → the interpolated value at any position, O(1) amortised through a per-kind **cursor** |
| C2 | no bracketing-pair query | **`deck.bracket(kind, pos, opts)`** → `{prev, a, b, next, prevs, nexts, u, i, aAt, bAt, dtMs}` |
| C3 | `interpolate(a,b,u)` under-specified for any C¹ interpolator | **`interpolate(a, b, u, ctx)`**, `ctx = {prev, next, pos, dtMs, prevs, nexts, u, i, kind}` + **`caps.neighbourhood`** (0 = two-sample, 1 = one each side = Catmull-Rom, …) |
| C4 | `reduce()` structurally cannot see the right bracket | **`info.next` / `info.nexts`** in every reduce call (1 + `caps.neighbourhood` successors) |
| C5 | the caps were inert; three clients each hand-wrote the same `onState` filter | the library now READS `continuous`, `interpolate`, `interpolators`, `neighbourhood`, **`followsTransport`** → **`adapter.transport(state)`** on play/pause/rate |
| C6 | C3's "degrade honestly" could not happen | **`deck.request(kind, want)`** → `{wanted, chose, degraded, reason}` (nested.mjs's shape) + **`deck.degradations(kind)`** for implicit refusals |
| L1 | logdeck's `payload:{i, at, ...p.payload}` let a row's epoch-µs `at` clobber the injected position-domain `at` | control fields injected **after** the spread; the row's own stamp survives as `atUs` |

Plus `createCursor(rows)` exported (a client's own un-logged lanes get the same
cursor instead of a second implementation), `sched.eventsOf(kind)`,
`sched.cursorStats(kind)`, and `prefixEvents` now bisects a per-kind lane
instead of scanning every kind from index 0.

**THE GUARANTEE, SHARPENED.** SEAM 5 said "the reducer is a pure function of the
prefix". That is exactly right for a discrete kind and exactly wrong for a
continuous one: the state at *t* is defined by the samples **straddling** *t*,
and the right one has `at > pos`. So:

    discrete kind    : state(t) = f(prefix(<= t))
    continuous kind  : state(t) = f(prefix(<= t), successor(s) of t)

Without `info.next` an interpolated reduce is not merely awkward — it is
**inexpressible**, which is why the first continuous client had to keep a second
handle on the log.

**NOT done, deliberately: the library does not own a render tick.** Rendering
cadence belongs to the client; `observePosition()` already serves a 60 Hz pull
and a library-owned rAF would be a second timer inside a library whose first law
is that the vector has none.

**`caps.followsTransport` is real, and nested.mjs proves it**: its hand-written
`parent.transport.onState()` play/pause/rate filter was deleted and replaced by
the `adapter.transport(st)` method the library now calls (nested had been
*declaring* `followsTransport: true` into a library that ignored it). Suite 4
stays green unchanged; proto/instrument and proto/remixer still carry the same
filter by hand and can now delete it.

### prop-test: suite 5, green at 30 AND 100 seeds

`node timeline/lab/prop-test.mjs --seeds 100` → **0 violations**, all five suites
(100 basic + 50 gymnastics + 34 freeze + nesting + continuous).

| arm | what it asserts | measured |
|---|---|---|
| `cont-sample` | `sampleAt` vs an **analytic** Lissajous at 7.3 ms probes; ordering; on-sample identity; end clamping | mean px error **hold 21.87 · linear 0.623 · catmull 0.0232** |
| `cont-sample` | **C3's necessity**: the same adapter asked with `{neighbourhood: 0}` returns *exactly* the linear answer and labels itself `linear-degraded` | equal to 1e-9 |
| `cont-cursor` | not O(n): forward sweep cost per frame must not grow with n | **3.67 cmp/call at n=2000 and 3.67 at n=8000** (a rescan would be 4×; ~1000/call) |
| `cont-cursor` | backward sweep and random access stay inside the binary-search bound, and BOTH cursor paths get used | backward **11.97**, random **14.25**, `log2(2000) ≈ 11` |
| `cont-next` | `info.next` is the first event with `at > pos`; `info.nexts.length === 1 + caps.neighbourhood`; the interpolated reduce **equals `sampleAt` to 1e-9**; past the last sample the successor is genuinely absent → hold, honestly | 4 probe positions |
| `cont-caps` | discrete kind sampled → hold **+ a report**; unsupported interpolator → nearest offered; `neighbourhood` over caps → clipped; rate off `caps.rates` → log-nearest; multi-key asks answer per key; **a `caps.continuous` claim with no `interpolate()` is caught at `registerAdapter`** | |
| `cont-follow` | play/pause/rate delivered in order; a **seek** is not delivered (it is reduce+assertState); a **sync** never cascades; an adapter without the cap gets nothing | `play,rate,pause` |
| `logdeck-at` | a row's epoch-µs `at` must not clobber the injected position `at`; `i` survives; `atUs` preserved; the rest of the row still spreads | 250 / 500 / 1150 ms |

### The client-side cost this removes

proto/paths deleted its `makeBracket()` (27 lines), its adapter's second handle
on the log, and its `expand()` no-`at` hack, and re-verified **9/9 with the
numbers unchanged to the last digit** (seek ×3 = 0.042/0.032/0.042 px, deviation
Catmull-Rom mean 0.036 px, per-lane ink identical). In that run the library
served **4 847 `sampleAt` calls at 2.05 comparisons each** (4 577 cursor hits,
199 linear advances, 5 binary searches) — the number the O(n) `reduceAt` would
have turned into a per-frame rescan.

---

## Checkpoint 8 — v0.5: THE EVIDENCE FIREWALL (2026-08-28)

v0.4 made a continuous kind interpolate. plan-timeline §5b names what that IS:
interpolation is **tier 1 of a restoration spectrum** — interpolation (bounded by
evidence on both sides) → inpainting (context + priors) → generative infill
(detail never captured) — *one mechanism at three declared tiers*. A library that
serves tier-1 material without saying so is lying by omission, and it was: every
`sampleAt` in v0.4 invented a value and returned it looking exactly like a row
from the log.

### The API

| line | what it is |
|---|---|
| `createDeck({evidence})` / `deck.setEvidence(p)` | **the** explicit choice: `'attested'` \| `{restored:{maxTier:n}}` \| `'all'` |
| `deck.sampleAt(kind, pos, {evidence})` | under `attested`: the last **attested** sample + a report, never an interpolated one |
| `deck.reduceAt(kind, pos, {evidence})` | §5b's `reduce()`; under a restricting policy `info.next` is **withheld**, so an interpolating reducer degrades to its own hold |
| `deck.window(kind \| [kinds] \| undefined, from, to, {evidence})` | §5b's `window()`; merges lanes in `(at, seq)` order, **excludes** over-tier lanes |
| `deck.bracket(kind, pos, {evidence})` | the raw pair; a derived lane over the cap answers `null` |
| `deck.registerReconstructor(name, {from, into, tier, method, plan, derive, confidence, hz})` | → `{run(), drop(), rows(), stats()}` |
| `deck.provenanceOf(kind?)` | per-lane rollup `{attested, restored, tier, source, method, confidence:{mean,min,max}}` |
| `deck.evidenceAccounting(kind \| [kinds])` | `{attested, restored, total, inventedFraction, byTier, lanes}` — the invented-% a tratteggio UI displays, computed by the library |
| `deck.request(kind, {evidence})` | ask the firewall itself; answers in the C6 shape |
| `deck.degradations(kind)` | now also the **honesty ledger**: `attested-hold`, `attested-fold`, `excluded` |
| `deck.stats()` | gains `attested` / `derived` beside `total` |
| `normalizeEvidence(p)` | exported; the one parser, so a policy is never a bare boolean |

### THE FORCED-CHOICE RULE (and why this one)

    1. the per-call {evidence} wins;
    2. else the deck policy the client set EXPLICITLY at createDeck({evidence});
    3. else THROW  (Error.code === 'EVIDENCE_POLICY_REQUIRED')
       — unless the answer is provably identical under all three policies.

The brief allowed either "throw" or "resolve to an explicit deck policy". **Both,
composed**: the deck policy is the forced choice and the throw is its
enforcement. A client makes the declaration once, where it belongs (this is a
property of the *session*, not of the 4 615 reads a render loop makes), and a
client that never made it is told so at the call site that would have invented
something, in a message naming the three legal forms.

The exemption in step 3 is `policyMatters(kinds, op)` and it is **a proof, not a
default**: a discrete kind's `sampleAt`, a `bracket` or a `window` over an
attested lane return the same rows under `attested`, `restored(n)` and `all`, so
an omission there cannot mix anything. What is *not* exempt: any derived lane,
and any `sampleAt`/`reduce` on a kind whose adapter **declares `caps.tier ≥ 1`**.

Why `caps.tier` and not `caps.continuous` is the trigger: `tier` is the adapter's
own statement that what it returns *between* samples is restoration on §5b's
spectrum. `continuous` says only that state exists between samples. Gating on
`continuous` would have retro-classified four shipped clients' semantics from
here — proto/automation's `cc` lane holds a level between two CC messages because
**MIDI says so**, not because the library dreamed it. An adapter that
interpolates but declares no tier now gets a line in the ledger at
`registerAdapter` (*"its between-sample values are unqualified restoration and
the evidence firewall cannot gate them"*) — recorded, not fatal, and not guessed
at on its behalf.

One deliberate asymmetry: the **query** API throws; the library's own internal
folds (the seek and catch-up paths, which run inside a transport listener) use
`softEvidence()` and *record* an unqualified fold instead. Throwing there would
blow up a click handler instead of the query that deserves it.

### The provenance schema, and lane purity

A derived row carries, frozen, injected by the library **after** the payload
(§2's law):

```js
provenance: { source: 'reconstructor-<name>', method, confidence /* [0,1] */,
              tier: 1|2|3, refs: [attested ids…], from: '<evidence kind>' }
```

An attested row carries **no `provenance` key at all**. Absence is the
definition — not a flag, not `provenance: null`, nothing to forget to set and
nothing a payload can spoof.

**LANE PURITY** is the invariant that makes the rest cheap and provable: a lane
is attested or derived, **never both**. `scheduleEvent` throws in both
directions (a reconstructor writing into its evidence lane; an attested row
appended to a restoration). Consequences:
* a lane's tier is the *lane's*, so the firewall is O(1) per query, not a
  per-row scan;
* **the master trace is append-only and is never rewritten** — a restoration
  cannot be interleaved into it, so "deleting a restoration = dropping its lane"
  is not a policy, it is the only thing dropping *can* mean;
* reversibility is therefore checkable rather than asserted, and suite 6 checks
  it: after `drop()` the master's rows are the same objects in the same order,
  and `JSON.stringify(deck.eventsOf('p'))` is byte-identical to the snapshot
  taken before the reconstructor existed.

### Reconstructors: tier 1 real, tiers 2/3 unimplemented BY DESIGN

`registerReconstructor` is §5b's "a reconstructor is an adapter that reads
evidence lanes and appends derived events". The client supplies only what is
genuinely its own: **`plan`** (*where* to invent, between an attested pair) and
optionally **`derive`** (*what*). The default `derive` is **the interpolator
`sampleAt` already is**, asked with `{evidence:'all'}` — the one caller whose
whole job is to invent. What makes that honest is not refusing to do it; it is
that every row it emits says so.

Tier ≥ 2 **must bring its own `derive()`** or registration throws: *"the library
implements tier 1 only, BY DESIGN. Tiers 2 and 3 are the same SEAM, not the same
code."* That refusal is itself asserted in suite 6 — a RIFE/FILM frame
interpolator or an audio-inpainting model plugs in here, and the library hosts
and disciplines it without ever baking one in.

Default confidence for tier 1 is an honesty curve, not a constant: `1 −
2·min(u, 1−u)·min(1, dtMs/250)` — 1.0 at an attested endpoint, falling toward
the middle of the gap and falling faster the wider the gap.

### prop-test: suite 6, green at 30 AND 100 seeds

`node timeline/lab/prop-test.mjs --seeds 100` → **0 violations**, all six suites.

| arm | what it asserts | measured |
|---|---|---|
| `ev-attested` | every value `attested` returns is a row **in the log** (matched against the attested timestamps), and its px error against an analytic Lissajous is the zero-order one | **21.871 px attested vs 0.0232 px restored** — bit-identical to suite 5a's `hold`, which is the proof that `attested` *is* the hold |
| `ev-attested` | the hold is a **reported** degradation in the C6 shape (`wanted:'attested'`, `chose:'attested-hold'`) | reason names the tier and the row it fell back to |
| `ev-attested` | `reduce()` obeys the same firewall — `hold` under `attested`, `catmull-rom` under `restored(≤1)` | |
| `ev-forced` | omitting the policy **throws** `EVIDENCE_POLICY_REQUIRED` on `sampleAt`/`reduce` of a tier-declaring kind; a per-call policy or an explicit deck policy satisfies it; a bogus policy is refused in words | |
| `ev-forced` | and does **not** throw where the answer cannot differ: a discrete `sampleAt`, `bracket`/`window` over an attested lane | |
| `ev-recon` | a reconstructor appends its own lane; **the master trace does not change by one byte**; every derived row carries the full schema and its `refs` name real attested ids | |
| `ev-recon` | `evidenceAccounting` splits attested/restored and its `inventedFraction` matches | |
| `ev-tier` | a **tier-2** lane is EXCLUDED at `maxTier:1` (with a reason naming tier and cap) and served in full at `maxTier:2`; a 3-lane window keeps tier 1 and drops tier 2 in one query | |
| `ev-tier` | a tier-3 registration with no `derive()` is refused; `into === from` is refused; **both** lane-purity violations are refused | |
| `ev-drop` | **REVERSIBILITY**: after dropping both derived lanes the master trace and its scheduler audit are **bit-identical** to the pre-reconstructor snapshot, `stats().derived === 0`, and a re-run reproduces the identical lane | 1 674 rows dropped |

Suites 1–5 unchanged and green. The only edits they needed: `caps.tier: 1` on the
test pointer adapter (the §5b declaration that arms the firewall) and
`evidence: {restored:{maxTier:1}}` on the two continuous decks — which is exactly
the forced choice being forced.

### The client proof, and the cost

proto/paths (`proto/paths/NOTES.md` §7) re-verified **14/14** with the numbers
that matter unmoved: seek ×3 **0.042 / 0.032 / 0.042 px**, deviation **24.19 /
0.679 / 0.0357 px**, and its "93.4 % of this path is invented" figure now
computed by `deck.evidenceAccounting()` (**837 restored / 896 total**) instead of
by client arithmetic over a private flattener array. Its evidence-only toggle is
`deck.setEvidence('attested')`: both reconstruction lanes go to **0 px of ink**
because the library refuses to serve them, not because the page stopped drawing
them.

No-regression: `proto/remixer/compose-run.mjs` **20/20**, 0 console errors.

## Checkpoint 9 — v0.5: QUOTATION (fragment spans), setRange, mediaMaster (2026-08-28)

Checkpoint 6 gave a span that is a deck. It could only play the child's **whole
range** — which is the one thing a quotation never is. plan-timeline §−1 / C10
says *a new work is a score that QUOTES archive timelines*, and nobody quotes a
whole broadcast. This checkpoint closes that gap, plus the two library chores
three clients had been paying for.

### 1. `nest.add({id, at, rate, deck, in, out, master})` — rule 7

`in`/`out` select a sub-range of the CHILD's domain and default to `deck.range`,
so **the whole-range case is the default case** and rules 1–6 are unchanged.

| rule | decided | why |
|---|---|---|
| 7a | the span occupies `(out − in)/rate` of PARENT time | the same law as rule 1, with the fragment length substituted |
| 7b | entry seeks the child to `in` and asserts there | the quotation opens with whatever `in` cuts — a ringing chord opens ringing. `reduce(<= in)` runs IN the child, exactly as `c0` does |
| 7c | `out` IS the child's end: absent past it, parked and asserted at `out` | not the deck's end. A quotation that ends mid-phrase ends mid-phrase |
| 7d | a parent seek maps to `in + (parentPos − at)·rate`, exactly | one multiply, one origin — the same affine map, so exactness is inherited, not re-derived |
| 7e | `in`/`out` outside the child's range CLAMP, and `span.trim` reports `{fragment, wanted, chose, deckRange, clamped, degraded, quotedFraction, reason}` | the library's standing rule: degrade, never lie. A fragment **wholly** outside is a rejection, not a clamp to nothing |
| 7f | `in >= out` rejected at `add()` | not discovered at play time |
| 7g | **trim does not mutate the child** | the fragment lives on the SPAN record. `deck.range` is never touched — that is what makes one stored timeline carry many quotations |

New reads: `nest.fragment(id)`, `nest.trim(id)`, `nest.quotationsOf(deck)`;
`driftStats()` rows gain `fragment`, `deckRange`, `trim`.

### 2. Two rules 7g FORCED, and they are the interesting half

**(a) An absent span must not park a sibling quoting the same deck.** Two
quotations of one deck are disjoint in parent time, so at any instant at most
one is present — but `assertState` iterates *every* span, and the absent one
would `seek()+pause()` the shared child out from under the present one.
`otherPresentOn(sp, pos)` guards it. Without this guard the second quotation
plays for exactly zero milliseconds.

**(b) Absence is a POSITION, not an edge event.** The park used to sit inside
`if (sp.present !== false)`, i.e. it fired only on the present→absent
*transition*. Fragments made the latent bug visible: play past a span (parked at
`out`, `present=false`), then seek to before it — the child stayed at `out`,
because the transition had already been spent. Now the park is driven by where
the child actually **is**. And when *every* quotation of a deck is absent they
would all want it at a different edge, so the nearest one in parent time wins
(`parksIt`) — deterministic, and it is the edge you actually left.

Also rejected at `add()`: two quotations of ONE deck **overlapping** in parent
time. That is not a trim problem, it is arithmetic — a deck has one position.
The error says so and says what to do instead (two decks, to overlay).

**The consequence to know:** parking at the fragment edge means a quotation
whose `in`/`out` cuts a held event is parked HOLDING it. That is right for
"paused on the last frame" and for "opens on a ringing chord"; for a MIDI-ish
actuator it means the absent quotation's edge notes are asserted. A quotation
trimmed to a silent boundary has no such state. See "still needed" below.

### 3. `deck.setRange([min,max] | 'auto')` — the range stops being frozen

> **LOUD, for whoever else is in `transport.mjs` this cycle:** this chore is the
> only edit made to `timeline/transport.mjs` from the nesting side, and it is
> strictly ADDITIVE — three new members (`setRange`, `rangeGen`, `lastAt`), a
> `schedule()` wrapper that only records `lastAt`, and `durationMs` changing
> from a frozen number to a getter of the same value (every consumer in the repo
> only reads it; `logdeck.mjs`'s `Object.assign(deck, …)` does not touch it).
> `prop-test.mjs` was re-run after it, at 30 and 100 seeds, green.

A client whose item set changes at runtime (the remixer, every time a layer
loads) had to `dispose()` and rebuild the whole deck — throwing away the drift
log, the adapters and the playhead — just to widen the seekable window. Additive
and invariant-preserving:

- `deck.range` is **mutated in place**, so its identity survives (nested spans
  and HUDs hold that array); `durationMs` became a getter and follows;
  `rangeGen()` lets a positional reader notice cheaply.
- a playhead left outside the new window is moved with a **real `seek()`** —
  reduce + assertState — never a silent clamp.
- `deck.schedule()` now tracks `lastAt()`, which is what `setRange('auto')`
  derives from. `nest.add()` schedules the span's two items, so a parent can be
  built with a placeholder range and `setRange('auto')`'d after the last add.
- the CURSOR is untouched by design: range is a *window on positions*, not a
  filter on events, and the cursor keeps riding the same lane array.

### 4. `timeline/media-master.mjs` — and a LIVE BUG it fixes

Three clients hand-rolled the same media-element master block with the same laws
in different code, and one of the copies had **lost a law**:
`proto/selfrec/replay-grid.html` called `deck.sync()` **unconditionally**, with
no jump-vs-drift discrimination. Its cue kind is `catchUp: 'burst'` (a cue is a
note, never silently dropped), so any discontinuity in the master's
`currentTime` — an external scrub, an hls.js recovery jump, a gap skip — left
every skipped cue `pending` and the lookahead fired ALL of them at once. That is
the same burst-every-skipped-cue bug the page's own adoption of the library had
fixed on the SEEK path. It was still open on the MASTER path.

    const mm = mediaMaster(deck, elementOrSourceFn, opts);
    function loop() { requestAnimationFrame(loop); mm.tick(); }

| law | |
|---|---|
| L1 | **the master is never nudged** — rate and currentTime are read, never written |
| L2 | **drift is a `sync()`, a discontinuity is a `seek()`** — past `jumpMs` the element MOVED; a sync would leave the skipped cues pending. *This is why the helper exists.* |
| L3 | a stalled master (currentTime frozen > `stallMs`) gives up the role: `stallPolicy:'hold'` pauses the deck (one element — proto/replay), `'release'` frees it so the client re-picks or free-runs (N tiles — replay-grid) |
| L4 | `timeupdate` is the **hidden-tab backstop** (rAF dies, the worker tick host does not) |
| L5 | a paused / ended / not-ready / **seeking** element is not a clock |

`source` may be the element (with `anchorMs`, number or function) or a function
returning `{el, pos, key}` — the grid form, which picks the master AND supplies
that tile's anchor.

### 5. prop arms — a NEW file, `timeline/lab/prop-nested.mjs`

`prop-test.mjs` is a sibling's this cycle, so v0.5's arms live beside it:

    node timeline/lab/prop-nested.mjs            # 128 checks, 0 violations
    node timeline/lab/prop-test.mjs              # unchanged, green
    node timeline/lab/prop-test.mjs --seeds 100  # unchanged, green

| arm | what it asserts |
|---|---|
| `frag-span` | `(out−in)/rate` span length; `fragment`/`trim`/`quotedFraction`; **the child's range is not mutated** |
| `frag-entry` | absent-before parks at `in`; entry seeks to `in` and the child's `reduce(<= in)` really ran there (`reason:'seek'` inside the child) |
| `frag-exit` | past `out`: absent, paused, parked AT `out` (not at the deck's end), does not run on while the parent plays |
| `frag-seek` | 7 probes incl. fractional ms: child pos exact to **1e-9**, held set === `reduce(<= in+u)`, `childPos`/`parentPos` mutually inverse |
| `frag-play` | playing the quotation fires **nothing** from outside `[in, out]` |
| `frag-clamp` | two-sided and one-sided clamps reported with `wanted`, `chose` and a reason; the clamped length is the span length; the report reaches `driftStats()` |
| `frag-reject` | `in === out`, `in > out`, non-finite, wholly-outside — all rejected at `add()`, leaving no span behind |
| `frag-twice` | **THE SAME DECK QUOTED TWICE** at two fragments: exclusive presence, each maps into its OWN fragment, **both play correctly**, nothing fires from outside either fragment, the gap parks at the nearer edge, an overlapping third quotation is rejected, a non-overlapping 2× one composes |
| `setrange` | `durationMs` follows; `range` keeps its identity; narrowing re-folds with a real seek; runtime items + `'auto'`; malformed ranges rejected without moving the window |
| `setrange-cursor` | `sampleAt` stays exact across a range change **and** insertions ahead of and behind the cached index, still ~O(1); `createCursor` re-locates after its rows array is mutated under it |
| `media-master` | **NEGATIVE CONTROL: `sync()` across a 9 s gap bursts 9 of 10 cues on a `catchUp:'burst'` lane** — the replay-grid bug, reproduced. The helper on the identical gap: **0 burst**, all 9 FOLDED, vector lands exactly on the master. A 120 ms error still syncs with 0 re-fires; `playbackRate` written 0 times; backstop attached once and detached on dispose; a seeking element drives nothing; stall holds (1 element) and releases (N tiles) |

### 6. Client results

- **`proto/remixer/compose-run.mjs`: 20/20** (was 16/16 — all 16 unchanged, +4
  fragment). The arrangement now carries the SAME session deck twice: `sess`
  (whole, 18 644 ms, `master:true`) at 30 s and `quote` (a 10 s middle slice,
  `in 4322 → out 14322`) at 5 s. Parent seek inside the quotation: **6/6 exact,
  max child position error 0.000 ms**, held-note reduce exact. Past `out`:
  parked at 14 322, not at 18 644. A 20 s ask on an 18.6 s session clamps to
  `[4322, 18644]` and says so; `in>=out` and an overlapping quotation are
  rejected in words. 0 console errors, 0 media errors.
- **`proto/selfrec/verify-replay.mjs`: 6/6** (was 5/5 — +V5). V5 scrubs the
  master tile's `currentTime` **61 189 ms** forward over all three cues:
  **0 burst fires**, all three folded into the fired set, one reported `jump`,
  playhead within 2.6 s of the target. That check fails on the pre-adoption code.
- **`proto/archive/run-measure-archive.mjs` (the proto/replay gate): 7/7, run
  twice.** Run 2 reproduces the pre-adoption per-cue table to the last digit
  (`−7 −21 −7 −10 0 −4 11 1`, **p50 −4 / p95 11**, abs p95 21 ms against a
  150 ms gate). Run 1 had three cues one video frame (33 ms) out and came back
  on the next fetch — decoded-frame quantisation, not the fire path.

### 7. Still needed for "timelines referencing timelines"

1. **A quotation cannot yet be silenced at its edges.** Parking at `in`/`out`
   asserts whatever those boundaries cut. There is no parent-level "the child is
   absent, quiet it" hook; a `caps.absentState` (or an adapter `silence()`) would
   close it without the nest having to know what a note is.
2. **Nothing addresses a fragment by CONTENT.** `in`/`out` are numbers in the
   child's domain. Quoting "from the third chorus" needs the child's own marks
   as an addressable lane.
3. **A quotation is not yet a value.** `nest.add()` mutates a nest; there is no
   serialisable `{deck: <id>, in, out, rate}` that a stored score could carry, so
   a quotation cannot round-trip through a file — which is the actual C10 ask.
4. **Two overlapping quotations of one deck are rejected, not solved.** Overlaying
   a timeline on itself (a canon, a delay) needs an instancing seam that gives
   each quotation its own position, not one shared deck.
5. **`driftStats()` reports a twice-quoted child's channel twice.** Correct but
   redundant; per-deck de-duplication is a reporting fix, not a semantic one.
