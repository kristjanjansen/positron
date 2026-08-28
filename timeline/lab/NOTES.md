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

---

# Checkpoint — v0.6: two steals from the browser-NLE survey (2026-08-28)

Source: `research/browser-av-editors-2026-08.md` §11 "Three things others do
better that we should steal". Taken: **#1 rVFC as the media servo's sensor** and
**#2 a deterministic offline render mode**. **#3 (the proxy / decoded-frame
scrub tier) is DEFERRED — §5 says why in full.** Two corrections from the
sibling's widened survey (`browser-av-editors-wide-2026-08.md`) are folded in
and measured, not assumed: §2f (OfflineAudioContext has no determinism
*guarantee*) and §3d (the Web Lock freeze exemption).

New/changed files, all under `timeline/`. **`timeline/transport.mjs` and
`timeline/nested.mjs` were not modified at all this cycle.**

| file | what |
|---|---|
| `timeline/media-master.mjs` | **L4b** — `requestVideoFrameCallback.mediaTime` as the sensor (additive; L1–L5 unchanged) |
| `timeline/render.mjs` | **NEW** — `createRenderRuntime` / `offlineDeck` / `renderDeck` / `renderDeckAudio` / `offlineAudioTarget` / `auditAdapters` |
| `timeline/keepalive.mjs` | **NEW** — the two published Chrome freeze exemptions, ~90 lines |
| `timeline/lab/prop-render.mjs` | **NEW** — the determinism property arms |
| `timeline/lab/prop-nested.mjs` | **+suite 9** — the L4b sensor law (128 → 143 checks) |
| `timeline/lab/run-sensor.mjs` + `sensor.html` | rVFC-vs-currentTime, real playback |
| `timeline/lab/run-render.mjs` + `render.html` | real-`OfflineAudioContext` determinism, 8/8 |
| `timeline/lab/run-freeze.mjs` + `freeze.html` | Chrome-133 freeze, SIGSTOP and natural arms |

```
node timeline/lab/prop-render.mjs                    # 301 checks, 0 violations
node timeline/lab/prop-render.mjs --seeds 100        # 931 checks, 0 violations (2.5 s)
node timeline/lab/prop-nested.mjs                    # 143 checks, 0 violations
node timeline/lab/run-sensor.mjs --secs 20           # headless Chrome, :8894
node timeline/lab/run-render.mjs                     # headless Chrome, :8885, 8/8
node timeline/lab/run-freeze.mjs --freeze 300        # SIGSTOP arm, ~5.5 min
node timeline/lab/run-freeze.mjs --natural --freeze 380 [--keepalive]
```

---

## 1. STEAL #1 — `rVFC.mediaTime` in the media servo, and the trap in it

### 1a. The naive form of this steal makes the servo WORSE. Measured first.

The steal list says: *"read `requestVideoFrameCallback.mediaTime` instead of
`video.currentTime`… it should tighten the numbers without changing any
policy."* Implemented exactly that way — prefer `mediaTime` when its sample is
the more recent one, per Remotion — and measured on a real 30 fps headless
playback with **four servos over one `<video>`** ({rvfc, currentTime} × {20, 40}
ms dead band, same element, same rAF loop, so the ONLY difference is which clock
the band is enforced against):

| 30 fps, tol 20 ms | corrections | \|err\| p95 |
|---|---|---|
| `currentTime` | **9** | 8.9 ms |
| `mediaTime`, naive swap | **380** | 25.6 ms |

**42× worse.** Two reasons, both visible in the data:

1. `mediaTime − currentTime` is **not noise, it is a BIAS of about one frame**
   (signed mean **+8.8 ms** at 30 fps, **+12.5 ms** at 60 fps). `mediaTime` is
   the PTS of the frame the compositor will show **at `expectedDisplayTime`**,
   which is in the FUTURE when the callback runs; `currentTime` is Chrome's
   continuously-interpolated estimate of the media clock **now**. They are not
   two measurements of the same quantity.
2. "prefer the more recent sample" does not even select stably. Chrome's
   `currentTime` is re-interpolated on *every read*, so "when did currentTime
   last change" updates nearly every tick and the rule picked `currentTime`
   78 % of the time. The servo was therefore **alternating between two clocks a
   frame apart**, and every alternation is a step the dead band must correct.

### 1b. The fix: the sample is a PAIR, so carry it

```
mediaAtNow = mediaTime + (now − expectedDisplayTime) / 1000 × playbackRate
delta      = (mediaAtNow − currentTime) × 1000        // ms added to pos
```

The delta is applied to a position that both call forms already compute as
`anchor + el.currentTime * 1000`, so `proto/selfrec/replay-grid.html`'s
`{el, pos, key}` source function gets the correction **without changing a line**.

Guards, all measured into existence rather than guessed:

- **stale ⇒ fall back.** A frame sample older than `rvfcStaleMs` (250 ms) is not
  a sample. This is the hidden-tab path for free: rVFC dies with rAF,
  `timeupdate` (L4) does not — so the servo returns to `currentTime` with no
  `visibilitychange` listener anywhere.
- **past `jumpMs` ⇒ reject.** A frame sample from before a discontinuity must
  never be carried across it, or the sensor could change which branch **L2**
  takes. `prop-nested` 9/N4: after a 9 s external scrub the servo still
  `seek()`s and still folds `C1…C9`.
- **`useRvfc:false` / `variableFps:true`** register no callback at all (Remotion
  excludes VFR sources; a VFR `mediaTime` is not on a frame grid).
- **no rVFC ⇒ nothing changes.** Firefox < 132, Safari < ~15.4 and every
  `<audio>` element take the identical `currentTime` path. `proto/kurenniemi`
  masters an `<audio>` element and is bit-for-bit unaffected by construction.

### 1c. The numbers

`timeline/lab/run-sensor.mjs`, 20 s of real headless playback per fps, one
`<video>`, **eight** servos ({rvfc, currentTime} × tol {5, 10, 20, 40}).
Rows in `timeline/lab/results/sensor-rvfc.json`.

**Sensor disagreement** (n ≈ 2 460 ticks per fps):

| | p50 | p95 | max | frames (p50/p95/max) | signed mean |
|---|---|---|---|---|---|
| 30 fps, RAW | 7.22 ms | 20.79 ms | 29.84 ms | 0.22 / 0.62 / 0.90 f | **+4.8 ms** |
| 30 fps, CARRIED | 8.34 ms | **11.85 ms** | 33.80 ms | 0.25 / 0.36 / 1.01 f | −8.5 ms |
| 60 fps, RAW | 15.00 ms | 25.51 ms | 26.90 ms | 0.90 / 1.53 / 1.61 f | **+15.1 ms** |
| 60 fps, CARRIED | 7.54 ms | **10.28 ms** | 18.33 ms | 0.45 / 0.62 / 1.10 f | +7.8 ms |

An earlier 18 s run gave CARRIED p50 5.70 / p95 7.62 (30 fps) and p50 4.67 /
p95 6.98 (60 fps), so across runs **carried p50 is 4.7–8.3 ms, p95 7.0–11.9 ms**.
The run-to-run wander is in the *bias*, not the spread — carried p95−p50 is
3.5 ms where raw p95−p50 is 13.6 ms, and the spread is what a servo pays for.

**Correction count, same playback, four dead bands:**

| dead band | 30 fps: `currentTime` → `rvfc` | 60 fps: `currentTime` → `rvfc` |
|---|---|---|
| **5 ms** | **365 → 18  (−95.1 %)** | **27 → 3  (−88.9 %)** |
| 10 ms | 12 → 11 (−8.3 %) | 4 → 2 (−50 %) |
| 20 ms | 8 → 8 (0 %) | 2 → 1 (−50 %) |
| 40 ms | 4 → 4 (0 %) | 1 → 1 (0 %) |

Residual tracking error left in the vector:

| | \|err\| p95, `currentTime` | \|err\| p95, `rvfc` |
|---|---|---|
| 30 fps, tol 5 / 10 / 20 | 7.52 / 5.58 / 5.48 ms | **0.87 / 0.87 / 0.87 ms** |
| 60 fps, tol 5 | 4.38 ms | **0.50 ms** |

**Read this honestly.** At the dead bands our clients actually ship (40 ms in
`replay.html`, `replay-grid.html` and `kurenniemi`) the correction count is
already ~0 and **the sensor is invisible there** — 8→8, 4→4. The steal does not
improve the shipped configuration. What it does is **make a tighter one
possible**: at a 5 ms band — lip-sync class, 5× tighter than timingsrc's 25 ms
"~lipsync" default — `currentTime` thrashes at 365 corrections in 20 s (≈18/s,
the servo fighting its own sensor) and `mediaTime` does not (18), and the
residual error drops **6–9×**. **The dead band is no longer set by the sensor.**
Whether to spend that is a separate decision and is NOT taken here: the shipped
defaults are unchanged.

Also: `stale = 0`, `rejected = 0` across both runs — in a foreground playback the
frame sample was usable on **every one of ~4 900 ticks** (595 presented frames at
30 fps, 1 198 at 60 fps; the carry covers the ticks between them).

### 1d. What did NOT change

`toleranceMs`, `jumpMs`, `stallMs`, `stallPolicy`, `autoPlayPause`,
`attachTimeupdate`, L1–L5: byte-identical in behaviour. rVFC is an
**observation** primitive; the seek command still goes through `currentTime` in
the client (hls.js's maintainer says the same). The gate suites in §4 are the
proof that the servo edit moved nothing measured — in particular
`run-measure-archive` reproduced its per-cue table **to the last digit**.

---

## 2. STEAL #2 — `timeline/render.mjs`: the offline render mode

### 2a. Doctrine and seams

Remotion's `/docs/flickering` in one line: *no shared wall clock ⇒ results differ
across machines ⇒ therefore no wall clock at all.* We had the seams and had never
used them. This is not a second engine; it is a **frame-stepping driver over the
one engine**, plus the two things the seams did not already provide (§2c, §2e).

```js
import { offlineDeck, renderDeck, renderDeckAudio } from './timeline/render.mjs';

const deck = offlineDeck({ items, adapters, range: [0, 600000] });
const r = renderDeck(deck, {
  from: 0, to: 600000, fps: 30,
  onFrame: ({ frameIndex, pos, state }) => draw(pos, state.cue),
  stateKinds: ['cue'],
});
r.traceText   // canonical event trace — byte-identical across runs
r.traceHash   // FNV-1a 64 short form
r.audit       // what could not be made deterministic, and why
```

| export | |
|---|---|
| `createRenderRuntime(startMs)` | deterministic clock + **many** tick hosts + `advanceTo` |
| `offlineDeck(spec)` | `createDeck` wired to one, carrying `.renderRuntime` |
| `renderDeck(deck, {from,to,fps,rate,onFrame,stateKinds,seedRandom,onNondeterministic,pauseAtEnd})` | the driver |
| `renderDeckAudio(deck, {…, audioItems, makeNode, sampleRate, channels})` | + a real `OfflineAudioContext`; returns the `AudioBuffer` and its hash |
| `offlineAudioTarget(ctx, runtime)` | the shim that makes an `OfflineAudioContext` usable by the shipped audio lane |
| `auditAdapters(deck)` | the nondeterminism report, standalone |
| `hashText` / `hashAudioBuffer` | short forms |

### 2b. The determinism proof

`node timeline/lab/prop-render.mjs --seeds 100` → **931 checks, 0 violations**
(2.5 s). At 30 seeds: **301 checks, 0 violations**.

- **D1 byte-identical.** Two renders ⇒ `traceText` equal as a string,
  `traceHash` equal, the per-frame `(frameIndex, pos, state)` sequence equal,
  final state equal. 100 seeds × {24, 30, 60} fps × 120–320-item traces with
  same-ms ties.
- **D2 equals playback.** The render trace equals (a) the same deck advanced in
  **irregular** chunks on a virtual clock (jitter, dropped ticks) and (b) the
  same deck played on a **genuine wall clock with `mainTickHost()`** — same
  events, same order, same count, same final non-commutative state.
- **D3 exactly once, in order.** No id twice; every cue in the window fires;
  `at` nondecreasing across the trace.
- **D4 exact frame grid.** `frames === round((to−from)·fps/1000)+1`, and every
  frame position `=== i*1000/fps` **exactly** — computed from the integer index
  each time, never accumulated.
- **D5 it does not wait.** 10 minutes of position time, 18 001 frames, 6 000
  events, in **7–10 ms wall = 60 000–86 000× real time.** That is the number
  that replaces "export the archival remix = 90 minutes and a promise that
  nothing stuttered".
- **The window's left edge is a check, not a surprise**: a render opens with a
  real `seek(from)`, so it is **half-open on the left, `(from, to]`** — an event
  at exactly `from` is folded into `reduce(<= from)`, one at exactly `to` fires.

### 2c. `createVirtualRuntime` could not host a render

It exports **one** host whose `start()` overwrites the previous callback, so a
deck and an audio lane cannot both run on it. Asserted as a CONTROL in
`prop-render` (`render-runtime`). `createRenderRuntime()` hosts N tick hosts at
independent cadences on one clock and one timer queue, ordered by `(due, id)`.

### 2d. What the mode CANNOT make deterministic — and how it says so

`renderDeck()` audits every adapter before frame 0 and returns the audit;
`onNondeterministic: 'throw'` makes it a CI gate. Two halves of deliberately
different strength:

- **DECLARED** — `caps.deterministic === true | false`, the adapter's own word.
- **SUSPECTED** — a source-text scan of `actuate`/`reduce`/`assertState`/
  `interpolate`/`transport` for `Math.random`, `crypto.getRandomValues`,
  `Date.now`, `new Date()`, `performance.now`, `requestAnimationFrame`,
  `requestVideoFrameCallback`, `setTimeout`/`setInterval`, `.currentTime`,
  `getOutputTimestamp`, `fetch`, `XMLHttpRequest`, `WebSocket`, storage,
  `navigator.*`, Web MIDI, `getUserMedia`, `[native code]`.

**The scan is a heuristic and the suite asserts its blind spot** rather than
letting a clean report read as a proof: `render-audit-blindspot` builds an
adapter reaching `Math.random` **through a closure** and asserts the audit comes
back CLEAN. A dirty scan is a reason to look; a clean scan is not a certificate.

The one nondeterminism the mode can **fix** is unseeded randomness, on request:
`seedRandom: <int>` swaps `Math.random` for a seeded mulberry32, **counts the
draws**, and restores it in a `finally`. Asserted both ways — with the seed two
renders match, without it they genuinely differ, so the report is not theatre.

Categorically out of reach: real devices (a media element's `currentTime`, a
MIDI port, a camera, audio hardware), I/O, and any direct wall-clock read. For
those the honest architecture is Remotion's `<OffthreadVideo>` move — replace the
device with a deterministic source for the render only — which is the same shape
as the deferred proxy tier (§5).

### 2e. A REAL finding: the `OfflineAudioContext` seam does not just "drop in"

The survey said *"the audio lane takes a context by argument so
`OfflineAudioContext` drops in"*. **It does not.** Two things had to be true and
neither was:

1. **`OfflineAudioContext.currentTime` is pinned at 0 until `startRendering()`.**
   `createAudioLane` anchors wall↔audio by sampling `clock.now()` and
   `ctx.currentTime` together; against a bare offline context every re-anchor
   maps "now" onto 0 and every node starts ~one lookahead horizon into the
   buffer regardless of its real position. `offlineAudioTarget()` is a Proxy
   whose `currentTime` **rides the virtual clock** (methods bound to the real
   context — a native `AudioContext` method throws on a foreign receiver, which
   is why this is a Proxy and not `Object.create`). With it,
   `audioTimeFor(wall) === (wall − t0)/1000` exactly.
   **NEGATIVE CONTROL, `prop-render/render-audio-control`: with the bare context
   every node collapses into the first 200 ms.**
2. **A closing `pause()` destroys the render.** An offline context has rendered
   nothing when the last frame is stepped, so the lane's nodes are still
   `committed`; `createAudioLane` cancels committed nodes on any transport state
   change (correct — a pause must not leave notes ringing), so `pause()`
   `stop()`s and `disconnect()`s the whole scheduled graph microseconds before
   `startRendering()` reads it. **The first run of `run-render.mjs` produced a
   completely silent 192 000-sample buffer with 7 nodes still `pending`.** Hence
   `renderDeck({pauseAtEnd:false})`, which `renderDeckAudio` sets, pausing only
   after the buffer exists.

Neither is a defect in the audio lane; both are the shape of the seam, and
neither is discoverable without building the thing.

### 2f. `OfflineAudioContext` determinism is OBSERVED, not GUARANTEED

Correction from `research/browser-av-editors-wide-2026-08.md`, and it is right:
the Web Audio spec says an `OfflineAudioContext` *"renders as quickly as
possible… fulfilling the returned promise with the rendered result as an
AudioBuffer"* and says **nothing about bit-exactness**. There is no determinism
guarantee to lean on. So it was measured.

`node timeline/lab/run-render.mjs` → **8/8**, and the impulse arm alone would
not have been enough (a one-sample impulse render is a memcpy), so a second
composition runs a **real DSP graph**: per event a sawtooth oscillator through
an exponentially swept biquad lowpass (Q 8, 300 → 5200 → 220 Hz) and an
exponential gain envelope, 2 channels, 48 kHz — float DSP, ramp interpolation,
denormals.

```
frames 121  events 32  reduces 1  byKind {"cue":12,"pointer":20}  endPos 4000
trace    2385 bytes  hash aec58cd41cec0e99  ==  2385 bytes  hash aec58cd41cec0e99
impulse  192000 x 1ch @48k  hash b7490f1865048393  ==  b7490f1865048393
DSP      192000 x 2ch @48k  hash 4a36fb31e25e8f3c  ==  4a36fb31e25e8f3c
         200416 nonzero, peak 0.697998, rms 0.012062198 (identical to 9 dp)
impulses want [12000,24000,48000,84000,120000,144000,191952]
         got  [12000,24000,48000,84000,120000,144000,191952]
```

**All seven impulses land on the exact expected sample index** — not "the buffers
hash the same" but "the clicks are where the positions say they are, to the
sample". And **cross-process**: two separate `run-render.mjs` invocations, two
separate Chrome launches, all five hashes matched (trace, impulse PCM, DSP PCM,
DSP rms to 9 dp, per-frame digest).

**State it this way and no stronger: bit-reproducible AS OBSERVED on this
browser/build/CPU (headless Chromium, macOS arm64, 2026-08-28), twice in-process
and twice cross-process, for both a trivial and a nontrivial graph. That is an
observation, not a platform guarantee.** A distributed render across
heterogeneous machines must therefore treat the *event trace* as the contract
(that one IS guaranteed — it is our arithmetic, on our virtual clock) and treat
audio PCM equality as something to verify per fleet, not assume. `hashAudioBuffer`
exists so that verification is one call.

**And the placement constraint, verified here** (probe: a dedicated Worker on
this build reports `typeof OfflineAudioContext === 'undefined'`, likewise
`AudioContext` and `BaseAudioContext`; the main thread reports `'function'`):
**Web Audio is `[Exposed=Window]` — there is no `OfflineAudioContext` in a
Worker.** So an offline audio render cannot be moved off the main thread of a
document. The wall-lane half of `renderDeck()` has no such limit (it is pure JS
over a virtual clock and would run in a Worker unchanged); only the audio half
is pinned to a Window. A render farm therefore parallelises across *documents*
(Remotion Lambda's shape: N tabs), not across workers in one document.

---

## 3. The Chrome-133 Energy-Saver freeze — what actually happens

### 3a. The risk, restated

`research/browser-av-editors-2026-08.md` §3: Chrome ≥133 freezes a **hidden +
silent + CPU-intensive** tab after >5 min on Energy Saver; exempt are
mic/camera/screen-capture, a live `RTCPeerConnection`, WebUSB/Bluetooth/HID, or a
**held Web Lock**. **A worker tick is not on that list.** Our hidden-tab win
(worker 8.5 ms p95 vs main 981 ms, rAF 9175 ms) defends against **throttling**;
freezing is a *different mechanism* and we had never measured it.

### 3b. The worst case, measured: SIGSTOP on the renderer for 5 minutes

`node timeline/lab/run-freeze.mjs --freeze 300`. A dedicated worker lives in its
page's renderer process, so `kill -STOP` on that process stops the main thread
**and** the worker tick together — which is exactly what a freeze does.
(`Page.setWebLifecycleState 'frozen'` was also sent; in headless it is accepted
and is a **no-op** — 0 gaps. Recorded so nobody trusts it as a test tool.)

A probe worker logs its own `setInterval(250)` ticks into worker memory and dumps
them after resume, so "was the worker frozen too?" is a measurement, not an
inference:

| | 20 s freeze | **300 s freeze** |
|---|---|---|
| main-thread gap | 20 060 ms | **300 060 ms** |
| **probe WORKER gap** | 20 092 ms | **300 091 ms** |
| scheduler `maxTickGapMs` | 20 018 ms | **300 023 ms** |
| `catchUp:'reduce'` state correct? | **yes** | **yes** (892 525 == 892 525) |
| time to correct state after resume | **0.1 ms** | **1.1 ms** |
| `catchUp:'burst'` | 29 fired (20 at once) | **309 fired — 300 cues burst at once, up to 300 s late** |
| `catchUp:'drop'` | 20 lost | **300 lost** |

**Finding 1: the worker tick host is NOT a defence against freezing.** The probe
worker's own clock shows the same 300 s gap the main thread does. The
hidden-tab win is real and is about throttling only.

**Finding 2: `catchUp:'reduce'` survives it, at 5-minute scale.** The vector is
`p0 + (now−t0)·rate` with no timers in it, so position never stopped — it read
309 603 ms on resume, correctly. The whole missed prefix folded and asserted on
the **first task** after resume: **1.1 ms** to correct non-commutative state
after a 5-minute freeze (0.5 ms after 3 s in the earlier lab run, 0.1 ms after
20 s here — the recovery cost is essentially independent of freeze length,
because `reduce` is a fold over a prefix and not a replay of it).

**This is the operational answer**: a broadcast timeline in a frozen tab wakes up
*correct*. A cue lane on `'burst'` does not — it fires 300 cues in one tick, up
to 5 minutes late — and a lane on `'drop'` loses all 300. **Choose `'reduce'`
for anything a hidden tab might carry.** That is now a measured recommendation
rather than a design preference.

### 3c. The natural freeze could NOT be reproduced here — say so plainly

`--natural` asks Chrome to do it: launched with
`--enable-features=FreezingOnEnergySaver,FreezingOnEnergySaverTesting`, page
hidden the way arm BG hid it (**browser-level `Target.createTarget` +
`Target.activateTarget`** — Playwright's `newPage()` cannot: each new page is its
own window and stays `visibilityState: 'visible'`, verified), CPU burned at
~12 ms every 25 ms, muted, held hidden for **380 s**.

**Result, both arms: no freeze.** 0 main-thread gaps, 0 worker gaps, 1 560 probe
ticks, all 390 cues fired normally on every lane. Headless Chrome did not apply
the Energy-Saver intervention (no battery/power-state signal is the likely
reason; `chrome://discards`, which would have shown the freeze accounting, is
blocked by Playwright's URL filter — `ERR_INVALID_URL`).

So: **we could not get the CONTROL to freeze, which makes the exemption arm
untestable here.** The Web Lock exemption is **documented, not verified by us.**
Anyone with a real battery-powered Chrome should re-run
`run-freeze.mjs --natural` on it; the rig is ready and the two arms differ only
in `--keepalive`.

**A bonus datum from the same runs, and it is a good one:** 380 s hidden with the
worker tick host gave scheduler `maxTickGapMs` of **33.3 ms** (plain) and
**34.1 ms** (keepalive). Arm BG's hidden-tab win was measured over a 10-second
window; this extends it to **six and a half minutes** — the worker tick does not
degrade with time hidden.

### 3d. The mitigation, implemented — `timeline/keepalive.mjs`

The sibling survey source-confirms `CannotFreezeReason::kHoldingWebLock` as a
standalone Chrome freeze exemption, so the mitigation is one line of platform:

```js
import { keepAwake } from './timeline/keepalive.mjs';
const ka = await keepAwake({ lock: true, audio: false });   // …ka.release()
```

- **A held Web Lock** — `navigator.locks.request(name, {mode:'exclusive'}, () =>
  new Promise(() => {}))`, held for the life of the deck. On the published
  exemption list, no device, no permission prompt, works muted.
- **An audible page** (opt-in, default off) — exempt from freezing **and** from
  the 1 Hz timer clamp; Firefox additionally does not throttle a tab containing
  an AudioContext. ⚠️ "audible" is Chrome's determination and gain 0 is not
  audible, so this emits a real tiny tone (default 8e-4 at 40 Hz) and reports the
  gain it used. If any output is unacceptable, use the lock alone.

Verified to initialise cleanly in the rig (`--keepalive`):
`{lock: true, lockName: 'timeline-keepalive', audio: true, audioState: 'running',
gain: 0.0008, errors: []}`. What is **not** verified is that it prevents a
freeze — see §3c.

**The third option remains the strongest, and it is the one we actually have:
accept the freeze.** 1.1 ms to correct state after 5 minutes is a cheaper
guarantee than a tab that never freezes, and it needs no permission, no lock, no
audio device and no vendor's continued goodwill. `keepalive.mjs` is a belt
alongside that brace, not a replacement for it.

### 3e. Two more from the widened survey, recorded not built

- **`Atomics.wait` as a third tick host.** V8's `Atomics.wait` blocks on an OS
  condvar, not on a task queue, so it is structurally out of the throttler's
  reach — a candidate host beside `worker` and `main`. **Prerequisite: COOP/COEP**
  (cross-origin isolation) for `SharedArrayBuffer`. Verified in the rig: inside a
  dedicated worker `typeof Atomics === 'object'` but `typeof SharedArrayBuffer
  === 'undefined'` and `self.crossOriginIsolated === false`, so there is nothing
  to wait *on* until the serving origin sends the headers. The same headers fix
  Safari's 1 ms `performance.now()` clamp, which makes them worth having twice
  over. **Not implemented**: an untested tick host in the library is worse than
  none, and the measurement belongs in arm BG's rig with COOP/COEP served.
  (Also noted from the same probe: `navigator.locks` was `undefined` inside the
  worker — but that probe ran on a `data:` URL, which is not a secure context, so
  it proves nothing about Worker exposure. On `http://127.0.0.1` the lock was
  granted on the main thread without complaint.)
- **Windows on battery has an 8 ms timer floor.** Our tick is 25 ms with a 100 ms
  horizon, so the margin is 3× — comfortable, and no code change is warranted.
  Worth knowing before anyone proposes dropping `tickMs` below ~10 ms: on that
  platform the floor, not the design, would decide.

---

## 4. Gate suites — all green, and the servo edit is proved inert

| suite | result |
|---|---|
| `node timeline/lab/prop-test.mjs` | **OK, 30 basic + 15 gymnastics, 0 violations** |
| `node timeline/lab/prop-test.mjs --seeds 100` | **OK, 100 + 50, 0 violations** |
| `node timeline/lab/prop-nested.mjs` (also `--seeds 100`) | **OK, 143 checks, 0 violations** (was 128; +15 rVFC) |
| `node timeline/lab/prop-render.mjs` / `--seeds 100` | **OK, 301 / 931 checks, 0 violations** |
| `node timeline/lab/run-render.mjs` | **8/8** |
| `proto/selfrec/verify-replay.mjs` | **6/6** — V1 boot, V1 block anchors, V2 inter-tile skew p50 0 / max 0, V3 scrubber seeks, V4 block-anchor, V5 master jump 61 191 ms over 3 cues → **0 burst fires**, all folded |
| `proto/archive/run-measure-archive.mjs` | **7/7** |

`run-measure-archive` is the important one for the servo edit, because it is a
*measurement* gate rather than an assertion gate. Its per-cue table came back
**identical to the recorded pre-change run 2, digit for digit**:

```
CUE-01:-7 CUE-02:-21 CUE-03:-7 CUE-04:-10 CUE-05:0 CUE-06:-4 CUE-07:11 CUE-08:1
p50 -4 / p95 11, abs p95 21 ms against a 150 ms gate
content−native anchor delta -15 ms, burn-decode 5117/5118
```

That page masters one `<video>` at a 40 ms dead band, i.e. exactly the regime
where §1c says the sensor is invisible — and it is. The steal changed nothing
that was already being measured, which is the result we wanted from it.

---

## 5. DEFERRED — steal #3, the proxy / decoded-frame scrub tier

Not built, deliberately. The reasoning, so the next session does not re-derive it:

- **It is the most universal pattern in the commercial survey and we have
  nothing** — Descript's optimized assets, Kapwing's low-res transcodes + >90 %
  IndexedDB hit rate, Frame.io's C2C proxies, Shotstack's `captureFps` frame
  pre-capture, Mux's 50–100 WebVTT storyboard tiles, and the JPEG-per-frame
  extreme. All 13 commercial NLEs surveyed have one.
- **The right shape is known, and it is already ours.** Grass Valley's James
  Pearce (W3C Media Production Workshop 2021) gives the best published
  description: a **playhead-centred decoded-frame window**, "a few frames either
  side of that cursor, and in some cases a second or two", **predictively resized
  by the observed scrub direction**, one buffer serving both directions. That is
  `createCursor` — `locate()` already holds an index at the playhead, advances
  ~1 per frame forward, binary-searches on a seek, and exposes `prevs`/`nexts`
  sized by `caps.neighbourhood`. A decoded-frame lane is `sampleAt` plus an
  eviction policy, not a new index.
- **Nothing in the current clients scrubs heavy video hard enough to need it.**
  `proto/replay` masters one `<video>`; `proto/selfrec/replay-grid` slaves N tiles
  and its measured inter-tile skew is 34 ms = one 30 fps frame, the physical
  floor; `proto/kurenniemi` masters an `<audio>` tape. The scrub cost we actually
  have is `currentTime` seek imprecision, which a proxy does not fix.
- **So the ordering is: keyframe index first, proxy tier second.** Kapwing's
  `stss` read would let `seek()` report the *achievable* target position instead
  of discovering it after the fact — the same "degrade honestly" contract
  `deck.request()` already implements for rates. The decoded-frame window only
  earns its complexity when a client scrubs a large remote asset, i.e. the
  archival client, which does not exist yet.
- One thing §2 makes newly relevant: a proxy tier and `<OffthreadVideo>`-style
  deterministic frame extraction are **the same mechanism from two sides**
  (decouple what you scrub from what you export). Whoever builds either should
  look at both.

## 6. Still needed

1. **Re-run `run-freeze.mjs --natural` on a real battery-powered Chrome.** It is
   the only way to close §3c, and the rig is ready (two arms, `--keepalive`).
2. **Serve COOP/COEP somewhere** and measure the `Atomics.wait` tick host against
   arm BG's hidden matrix (§3e). Two wins in one header pair.
3. **Decide whether to spend the tightened dead band** (§1c). The library does
   not decide it; the number that would justify it is a client's, not ours.
4. **A canvas/frame sink for `renderDeck`.** `onFrame` gives the caller the hook;
   nothing yet turns 18 001 canvases into a file. That is the encode half, and
   it is WebCodecs `VideoEncoder` + a muxer, not more transport work.

---

## 7. A QUOTATION IS A VALUE — score.mjs, marks, provenance export, absentState
### (2026-08-28; closes plan-timeline §7.7's "the actual C10 ask")

**The seam that was open.** §5 C10 says the timeline is a TRACE format and a
score is a PROGRAM that quotes traces. §7.7 named why that was unbuildable: a
quotation was not a value. `nest.add()` mutated a nest, took a live object for
its `deck`, and left nothing behind. You could BUILD an arrangement; you could
not SAVE, mail, diff, or reload one.

### 7a. `timeline/score.mjs` (new) — the value, and the round trip

    refDeck(deck, 'kurenniemi-1972')            // identity: a string, not an object
    quotation({ref, at, rate, in, out, master, provenance, meta})   // frozen value
    score({id, quotations, meta})                                   // frozen value
    nest.toScore({id, meta})  ->  score           // arrangement -> value
    loadScore(score, resolve, {parent|nest})      // value -> arrangement

`resolve(ref, q) -> deck` is the ONLY place a ref becomes an object, which is
exactly what "a process that has never seen the decks" means. `nest.add()` takes
either shape: the old `{deck, in, out}` opts (unchanged) or a quotation value.

**The C10 proof is a trace comparison, not a vibe** (prop-nested suite 10).
Build a 3-quotation arrangement over 2 decks by hand; `toScore` →
`JSON.stringify`; in a FRESH virtual runtime with new decks, `loadScore` from the
parsed JSON and a resolver; run both through a fixed 14-step script (seeks in and
out of every span, plays across boundaries, scrubs backwards); record at each
step the parent position, both children's positions, both held-note sets, both
fire counts, the full ordered `firedAt` list, and every span's
present/enters/exits. **The two traces compare equal as strings.** And
`toScore(loadScore(x)) === x` byte-for-byte — the round trip is a fixed point.

Deliberate refusals: a quotation with no `ref` is rejected (identity is not
optional); `toScore()` on an unnamed deck throws rather than inventing an id;
`loadScore` without a resolver throws ("without one a score is just bytes"); an
unresolvable ref names every ref the score needed; an unknown score version is
rejected, never guessed.

### 7b. Marks — the seam that makes a score survive a RE-CUT of its source

`in`/`out` gained an address type: a number (unchanged) or `{mark:'chorus-3',
offset?}`, resolved at `add()` time against the child's own marks. A deck exposes
marks three ways — a real lane of kind `mark` (native: a mark is an event, so it
moves with a re-cut and shows up in `window()`), `deck.marks`, or
`registerMarks()` for a deck you do not own.

**The test that matters** (suite 11): write a score against a tape where
`chorus-3` is at 900 ms, then re-cut the source (600 ms of restored leader
spliced in front, so notes AND marks move). Reload the same JSON:

- the mark-addressed quotation lands at 1500 and **opens on the same music**;
- the number-addressed quotation lands at 900 and **opens on different music**
  (asserted positively — if that ever passes trivially the test is dead);
- `loadScore().report.movedMarks` says `chorus-3 900->1500, deltaMs 600`. A mark
  that moved is REPORTED, never silently followed. The quotation carries `wasAt`
  (what the mark resolved to when written) purely so this sentence can exist.

### 7c. Provenance that survives the door — three carriers, validated

`exportProvenance(deck|nest|score, {carrier})`. Every subject normalises to the
same row — *a claim about a time range* — which is precisely what all three
carriers can hold and what no shipping tool reads.

- **C2PA-shaped**: `c2pa.actions.v2` with `Action.changes[]` region-maps,
  `{type:'temporal', time:{type:'npt', start, end}}` (tstr, half-open, ends
  exclusive by spec default — same as us and Media Fragments), `reviewRatings`
  (int-range 1..5) on assertion metadata, IPTC `digitalSourceType` selected by
  §5b tier (`digitalCapture` / `algorithmicallyEnhanced` /
  `compositeWithTrainedAlgorithmicMedia`), and — §18.16.13, normative — a
  `c2pa.ingredient.v3` per quotation whose `metadata.regionOfInterest` is the
  portion of the SOURCE used. That sentence is the archival-quotation case
  written down by a standards body.
- **`EXT-X-DATERANGE`**: one tag per claim, `X-ORG-ELEKTRON-*` reverse-DNS client
  attributes (RFC 8216 §4.3.2.7), off a required wall-clock `anchor` — an HLS
  export with no anchor is REJECTED, because START-DATE is not a media offset.
  hls.js surfaces these as metadata cues today (`enableDateRangeMetadataCues`),
  which makes this the only carrier of the three with a shipping reader and the
  weakest one (no signature, anyone can edit a playlist).
- **OTIO-shaped**: `Clip.2` + `source_range` in the source's domain at
  `RationalTime` rate **1000 (ms)** — OTIO issue #468's 23.976→29.97 rounding
  class is one we never enter — `LinearTimeWarp.1` for rate≠1, `Marker.2` per
  resolved mark, `Gap.1` between quotations, and the whole quotation under a
  namespaced `metadata` dict. The only carrier that loses NOTHING and the only
  one that acts on nothing.

`validateProvenance(doc, carrier)` checks against PUBLISHED field names (action
fields, region-map/range-map/npt-time-map fields, the Role and review-code
vocabularies, rating value 1..5; HLS attribute grammar and the ID/START-DATE
requirements; OTIO schema names, clip fields, namespaced metadata). Each carrier
has a **negative control** in the suite: a misspelled `type:'time'`, a rating of
7, a tag with no ID, a non-namespaced OTIO metadata key — all must FAIL.

**TEI's `@locus` is in the model and only one carrier survives it.** A quotation
carries `provenance.certainty: [{locus, cert, resp, note, widthMs}]` with `locus
∈ name|start|end|location|value` — the only vocabulary anywhere that separates
uncertainty about the BOUNDARY from uncertainty about the IDENTITY ("0.95 that
this is the Kurenniemi segment, 0.5 on where it starts"). C2PA has exactly one
confidence field and no way to say which part of a claim it qualifies, so a
boundary certainty is exported as its OWN `c2pa.areaOfInterest` region widened by
`widthMs` — the lossy mapping made visible instead of dropped — and the
unquantised original rides along under `parameters["org.elektron.timeline"]`.

**What a real implementation needs, stated in the export itself** (every doc
carries a `caveats` array): signing (a c2pa Builder — `@contentauth/c2pa-web`
WASM or `@trustnxt/c2pa-ts` for pure-TS MP4 — a `c2pa.hash.bmff.v3` hard binding
over the fMP4 we already ship, a COSE signature, a cert on a recognised trust
list); and the fact that **no ecosystem tool can currently READ a temporal ROI**
— verify-site has zero `temporal` code paths, conformance-public never tests
`regionOfInterest`, the only c2pa-rs fixture emits an EMPTY time map, and
Premiere's exported credential collapses to per-clip. Emitting these puts us
first and alone.

### 7d. `caps.absentState` / `silence()` — the cheap seam, closed

Rule 7b/c parks an absent child at its fragment edge and ASSERTS there, so a
quotation whose `out` cuts a held note sat on that note for the whole absence. An
adapter may now declare `caps.absentState: 'silence'` and implement
`silence({kind, deck, pos, reason, span, in, out})`. The nest calls it after the
park and **learns nothing about what a note is**. Default `'hold'` — unchanged,
and the right answer for a video frame.

Once per park position (staying absent does not re-fire; leaving through the
other edge does). Re-entry needs no help: the ordinary seek→reduce→assertState
restores the state. Declaring `'silence'` with no `silence()` is a reported
DEGRADATION (`nest.absent(id).degraded`, `driftStats().spans[].absentDegradations`)
falling back to hold, never to a guess; an unknown mode likewise.

**⚠ SEAM LEFT OPEN (transport.mjs is a sibling's this cycle).** The nest reaches
adapters through `deck.adapters`, the constructor-registered map. An adapter
registered LATER via `deck.sched.registerAdapter()` lives in the scheduler's
private map and cannot be reached — it is reported as `unreachable` rather than
skipped. **The hook transport.mjs should grow: `sched.adapter(kind)`, or better a
`deck.silence(info)` that fans out internally.** Then nested.mjs deletes its
`adaptersOf()` and the caveat with it.

### 7e. What "timelines referencing timelines" STILL lacks

1. **A score cannot quote a SCORE.** `ref` resolves to a deck. Quoting another
   score means materialising it into a deck first, by hand, outside the format.
   The recursion the phrase promises is one level deep.
2. **Overlapping quotations of one deck are still rejected**, not solved. A deck
   has one position; a canon over one tape needs an INSTANCING seam (clone the
   deck's lanes into a lightweight view) and there is none.
3. **No content hash.** `ref` is a name. Nothing detects that `tape-A` on the
   other side is a different transfer of the same work — the marks moved and we
   reported it, but we cannot say the BYTES changed. C2PA's hard binding is the
   obvious borrow and it needs the asset, which a score does not have.
4. **Marks are addresses, not a lane the strip draws.** Resolution is at load;
   nothing re-resolves if a mark moves while loaded.
5. **A score has no ORDER semantics beyond `at`.** No conditionals, no repeats,
   no tempo map — it is a flat list of placements. §5 C10 says a score is a
   program; this one has no control flow.
6. **The export is one-way.** We emit C2PA/HLS/OTIO and read none of them back.
   An OTIO import would be the cheapest (the namespaced metadata round-trips
   verbatim) and would make the format an interchange rather than a door.

### 7f. Run

    node timeline/lab/prop-nested.mjs        # 228 checks, 0 violations
    node timeline/lab/prop-test.mjs --seeds 30    # green
    node timeline/lab/prop-test.mjs --seeds 100   # green
    node proto/remixer/compose-run.mjs            # 20/20, 0 console errors

## Checkpoint 10 — v0.6: UNCERTAINTY AS POSITION (2026-08-28)

The last of plan-timeline's five gaps and §−1's founding requirement ("a smear,
not a fake instant"). Design was settled by `research/spatiotemporal-uncertainty-2026-08.md`
before a line was written; this checkpoint is implementation, and the one thing
worth recording is **how cheap it turned out to be** — because `at` never became
a distribution.

### 10.1 The API, in full

```js
// U1 — the row shape. OPTIONAL, FROZEN PER ROW, never interned.
schedule({ kind, id, payload, when: {
  verbatim,          // what the source SAID, byte for byte. Never dropped.
  edtf,              // the honest re-expression: '1965', '196X', '1963/1973'
  earliest, latest,  // CLOSED-OPEN transport ms. latest:null = OPEN end.
  innerFrom, innerTo,// CRM P81. null = no known inner bound. from > to is LEGAL.
  rule,              // VERSIONED: 'err-july15-padding@1'. 'hand'/'unknown' only.
  kind,              // 'ignorance' | 'vagueness'
  note,              // the assumption made (DarwinCore georeferenceRemarks)
}})
normalizeWhen(w, where?)  normalizeCertainty(c, where?)  WHEN_KINDS   // exported

// U2 — at = when.earliest, ALWAYS, resolved once at ingest. Reported as a
//      fourth degradation literal: 'anchored'. `when` rides publicEv AND the
//      drift row (rec.when, rec.anchored).
// U3 — the query knob. DEFAULTS; does not throw.
deck.window(kind, from, to, { evidence, certainty: 'possible' | 'necessary' })
// U4 — the position-axis twin of evidenceAccounting(), reported BY RULE.
deck.positionAccounting(kind?)
//   -> {crisp, smeared, total, smearedFraction, openEnded, withInner,
//       byRule: {rule: {n, fraction, meanSpanMs, medianSpanMs, maxSpanMs,
//                       minSpanMs, open, withInner, kinds:{…}, lanes:[…]}},
//       byWhenKind: {ignorance, vagueness}, medianSpanMs, maxSpanMs, lanes:[…]}
deck.stats()  // gains {crisp, smeared} beside {attested, derived}

// U5 — caps.series(payload, ev) -> key. Per-series sub-lanes + per-series cursors.
deck.sampleAt(kind, pos, { series })   deck.bracket(kind, pos, { series })
deck.seriesOf(kind)                    // null where no caps.series is declared

// U6 — two-phase seek. caps.slowSync + adapter.prepareSeek(req, ready).
deck.seek(pos, { disposition, timeoutMs })   // still returns the clamped pos
deck.requestSeek(pos, opts)  deck.seekBarrier()   // {gen, phase, ready, timedOut,
//   rolled, failedOpen, superseded, waitedMs, why, promise}
// disposition: 'MustRoll' | 'MustStop' | 'RollIfAppropriate' (default)

// requested by the quotation sibling, additive:
deck.adapter(kind)     // the registry, readable — incl. LATE registrations
deck.silence(info)     // caps.absentState fan-out -> {silenced, held, missing}
```

### 10.2 The default for `certainty` is `'possible'`, and the asymmetry is the point

`EVIDENCE_POLICY_REQUIRED` throws because a silent default there mixes *dreamed
data* into an archival answer — the omission can FABRICATE. The certainty knob
cannot: `'possible'` is sound in the inclusive direction, so a caller who says
nothing gets every row that might be in the window and never loses one that is.
Silence over-includes; it does not invent. **Forced choice where silence
fabricates, safe default where silence merely widens the net.** A throw here
would be ceremony, and `normalizeCertainty(undefined).implicit === true` lets a
caller still tell a default apart from an explicit choice.

### 10.3 `necessary` has THREE answers, not two — and that is the finding

The brief said "the query range contains the inner bracket". Implementing it
literally deletes a true answer: an ERR year-only row (outer `[1965, 1966)`, no
inner) IS certainly in 1965, and `Y @> inner` cannot say so because there is no
inner. So the predicate is:

1. ordered inner pair present → `from <= innerFrom && innerTo <= to`;
2. else outer containment → **sound but incomplete**, and it recovers the ERR case;
3. else **UNDECIDABLE** → the row is EXCLUDED *and the undecidability is
   reported* (`chose: 'unanswerable'`, naming the rule).

That third state is the whole reason the inner bracket is not decoration. The
proof carries both directions in one lane: a decade-wide row with a known 1965
inner is `necessary`-in-1965 (outer containment would have missed it), and a
decade-wide row *without* one is neither in nor out — it is unanswerable, and
says so. Answering `false` to a question you cannot answer is the failure every
renderer in the survey shipped.

### 10.4 What did NOT move, and why that was the whole design

`insertInto`, `afterIdx`, `createCursor`'s `bsearch`, `scan`'s
`ev.at > horizonPos` early exit and `reconcile` are **unchanged**. All six
pre-existing suites are green at 30 and 100 seeds without a single edit, and so
are `prop-nested` (143 checks), `prop-store` (39) and `prop-render` (301). The
crisp fast path is preserved *structurally*, not by discipline: a lane's
`maxSpan` is 0 until a `when` row lands in it, and `window()` branches on that,
so a v0.5 lane takes the identical `fromIdx(lane, from)` scan with the predicate
compiled out. **Absence of `when` costs nothing, exactly as absence of
`provenance` costs nothing.**

One cost that is real: `window()` with brackets must scan back by the lane's
widest bracket (the interval-index trick), and an OPEN-ended row makes that the
whole lane. Documented, not fixed — a lane of open-ended rows is a lane with no
upper bounds and there is nothing to index.

### 10.5 The two axes: proved independent, all four cells

| | `evidence:'attested'` | `evidence:'all'` |
|---|---|---|
| **possible** | att-crisp, att-**smear** | + res-crisp, res-smear |
| **necessary** | att-crisp | + res-**crisp** |

The two load-bearing cells: **an uncertain ATTESTED row survives an
attested-only query** (fold the axes and the entire pre-1960 archive disappears
under exactly the query the firewall exists to protect), and **a precise
RESTORED row survives a `necessary` query** (being invented is not being badly
positioned). Four cells, four distinct row sets, none a synonym for another.
And naming a `certainty` does NOT satisfy the evidence forced choice — that
still throws, which is asserted.

### 10.6 `caps.series` — the silent lie, measured

The synthetic lane in the proof is one kind holding controller 1 and controller
74 interleaved. `sampleAt('cc', 750)` over the merged lane brackets
`(cc74=200 @500, cc1=100 @1000)` and returns **150 — a value belonging to
neither controller**, produced by interpolating across two different signals.
That was v0.5's answer and it arrived in silence. Now: the same call still
answers 150 (the merged lane is what you asked for) but records
`chose: 'series-ambiguous'` naming `deck.seriesOf()` as the remedy, and
`{series: 1}` → 75, `{series: 74}` → 200, each from its own sub-lane and its own
cursor. Sub-lanes are built lazily from the already-sorted lane and maintained
incrementally on `schedule()`, so nothing is rebuilt and a lane with no
`caps.series` never allocates one.

### 10.7 Two-phase seek — the safety property is FAIL-OPEN, not "wait"

Ported with JACK's guarantees intact: the **locate is immediate and
unconditional** (position moves, reduce + assertState run, `seek()` still
returns the clamped position synchronously), only the **roll** waits, and on
timeout the barrier opens anyway with every laggard named in `degradations()`.
A late `ready()` after a fail-open is inert — the laggard catches up, it never
rewinds the transport. A locate mid-barrier supersedes the one in flight and
**inherits its true rolling state**, so a scrub firing ten locates does not lose
the roll on the tenth (the bug you get for free if you read `transport.rate`
after your own barrier paused it). Ardour's disposition rides in the request and
is honoured at the barrier. A deck with no `caps.slowSync` adapter never builds
one: `seekBarrier() === null`, and the roll is untouched.

### 10.8 The Kurenniemi client — the delta, and no number moved

`proto/kurenniemi` was chosen as the day-one client because it had independently
arrived at the same rule from data ("a midpoint is indistinguishable from an
attested 15 July; a start is at least a LOWER BOUND that is true"). What changed:

- `ingest.mjs` gains `whenFor(dateEvidence)` — pure — and `at`/`bandMs`/
  `precision` are now **derived from `when`**, one source of truth. A
  `--rewhen` flag re-expresses the existing corpus offline; because `when` is a
  pure function of a field every row already carried, this is a migration, not
  a re-ingest, and no API was hit.
- `index.html` **passes no `at` at all**. Items go to the deck as `{kind, id,
  payload, when}` and the library anchors them. The client can no longer pad a
  position because it never writes one.
- Result: `22 items re-expressed; 0 numbers moved — at / bandMs / precision are
  BIT-IDENTICAL.` The corpus diff is purely additive (`when` per item, one
  `positionRule` block). `verify.mjs` **8/8**, and every prior number is
  unchanged: 22 items / 3 sources / 12 playable / 12 rate refusals / 297-300
  probes differ / 4 distinct attested values. (V5 now counts only the *rate*
  refusals, because the same ledger holds the `'anchored'` rows, which are a
  statement about position and not a refusal.)
- **The new numbers, which are the point.** `positionAccounting` says:
  **22/22 rows are a smear — this archive contains no crisply positioned row at
  all** — and by rule: **41 % `corpus-range@1`** · 36 % `wikidata-precision@1` ·
  14 % `ia-filename-year@1` · 5 % `edm-literal-length@1` · 5 %
  `wikidata-title-match@1`. Forty-one percent of the Kurenniemi spine is
  positioned by one guess about a compilation title. That sentence was
  unsayable yesterday.
- **Every smear in this corpus is `ignorance`; none is `vagueness`.** A tape was
  recorded on a real day and the catalogue lost it. The vagueness cases are the
  ones a *performance* will author, not the ones an archive hands us.
- **`innerFrom`/`innerTo` are null on all 22 rows**, and correctly so (CRM Issue
  288). The consequence is exact: "certainly in 1966" is answerable for this
  corpus only through §10.3's sound-but-incomplete outer containment. If MIMO
  ever says "spring 1970", that is an inner bracket and the query sharpens for
  free.

### 10.9 What §−1 still promises that this does NOT deliver

1. **The renderer.** §8.4/§9.1 are settled by a controlled study
   (Gschwandtner 2016: *ambiguation* for "when/how long", gradient only for
   "how likely at t") and NONE of it is built. The per-lane aggregate in
   `proto/megatimeline` is still the miscomputed aoristic sum — `+1` per item
   regardless of span, clipped at alpha 0.4 — and the fix (one bin per PIXEL
   COLUMN per M4, mass `1/(b−a)`, divided by overlapping-period count, drawn as
   HEIGHT because height does not clip) is unwritten. `when.kind` is stored and
   nothing draws a different edge for it; the inner/outer core-and-skirt split
   has data and no ink. **The transport can now say what it does not know; the
   strip still cannot show it.**
2. **Deep time.** §−1 asks for decades-to-Gyr and we have `Number` epoch ms.
   §9.6's answer — regime-swapping tick sources selected by
   `log10(viewport span)`, per-era zoom caps, a signed offset, never a JS
   `Date` as the internal coordinate — is read and not built. Nothing in v0.6
   is deep-time aware; `positionAccounting`'s spans are ms and will be useless
   at 13.8 Gyr.
3. **`when` on SPANS.** `Span {at, dur}` still does not exist in code, so a
   smeared *duration* — a tape of unknown length, a period whose end is a
   second bracket — is not expressible. Deferred on purpose: it is a harder
   object than a smeared instant and should not be designed before the span
   type is real.
4. **Non-contiguous brackets.** EDTF's `[1821,1822,1830..1832]` and `1984-X1`
   ("January OR November") smear across the ten months between. The `when`
   docstring says contiguity is not a guarantee about the world; the *code*
   assumes it everywhere.
5. **Competing authorities.** One `when` per row. When a second cataloguer
   disagrees with ERR the shape is `when: [ …, … ]` with an authority id
   (PeriodO's model: disagreement by co-existence, no merge). This is the
   deferral most likely to be regretted, and the migration is additive.
6. **Transaction time.** "The catalogue said 1965 until the 2019 re-dating" is a
   THIRD axis (SQL:2011's system time), real, and not touched. The monotonic
   `seq` tiebreak is a degenerate version of it and must not be mistaken for one.
7. **The aoristic sum as a statistic.** We can now compute one honestly; nothing
   does, and Crema's warning stands — it is descriptive, not inferential, and
   summation hides the uncertainty it encodes.
8. **Space.** Deliberately, entirely absent. §5 of the survey was read *for the
   temporal problem*; not one spatial field is emitted, and if a place is ever
   needed the settled answer (Linked Places' `"geometry": null` + IIIF
   `navPlace`'s disclaimer) is a different document.
