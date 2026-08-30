# NOTES — `renderDeck` sees a nest (2026-08-30)

Closing plan-timeline §8.8's last open seam, quoted verbatim: **"`renderDeck`
cannot see a nest."**

Before today the offline renderer was excellent on a flat deck (60,000–86,000×
real time, byte-identical trace, identical audio hash across two Chrome
processes) and **blind to the composition layer** — fragment quotation, loops,
phasing, disintegration — which is where the last two sessions' work went.

Everything below is measured on this machine (macOS arm64, node v25.9, headless
Chromium via playwright, 2026-08-30) unless it says otherwise. Where a number is
not measured it says **not measured**.

---

## 1. What was built

**`timeline/render.mjs` v0.7** (mine)
- `offlineNest(parent, opts)` — `createNest` with a tick host from the render
  runtime. One line; it is the whole difference between a loop that renders the
  event set playback produces and one that does not (§4 below).
- `nestTree(nest)` — walks a nest and every nest under it, stable order, giving
  `{nests, spans, decks, depth}`. A deck may be quoted more than once but has
  ONE scheduler, so the trace tag is per deck, labelled by the path of the span
  that first reached it (`q`, `outer/inner`).
- `renderDeck(deck, {…, nest, servo})` — folds the composition. `nest`
  auto-detects `nestOf(deck)`; `nest:false` renders flat (pre-v0.7 behaviour, on
  purpose — "render only this deck's own lanes" is a real request).
- `renderNest(nest, opts)` — the same thing from the nest's side.
- `renderDeckAudio(deck, {…, childAudio})` — a child gets its own audio lane in
  the one `OfflineAudioContext` (§6).
- The result grew `r.nest` (spans, decks, rates, loops, wraps, servo) and
  `r.renderHash` (trace + wrap set; equal to `traceHash` when there is no nest).

**`timeline/nested.mjs`** (mine) — additive except two bug fixes (§7):
- `nestOf(deck)`, `nest.parent`, `nest.boundary()`,
  `nest.parentPos(id, cpos, iter)` (the iteration argument was internal only;
  the renderer needs it to expand a loop's audio).
- `NESTS.set(parent, nest)` moved from `add()` to `createNest()` — an empty nest
  is still a nest, and `renderDeck(parent)` on one used to fail with "needs
  finite {from, to}" instead of rendering the parent's own range.

**Suites**: `prop-render.mjs` grew arms N1–N14 (**999 checks / 100 seeds, 0
violations**, 4.6 s); `prop-nested.mjs` grew 14k, the two regression arms
(**393 checks, 0 violations**); `render.html` + `run-render.mjs` grew the
browser nest arm (**17/17**). `prop-test.mjs` (100+50 seeds) and
`prop-store.mjs` still green, untouched.

---

## 2. The decisions, and why

**A nested render RUNS the shipped nest; it does not re-derive it.** The nest's
`assertSpan`/`toChild`/`wrapSpan` are the position map. `renderDeck` supplies
only the two things a nest takes from its host — a TickHost for the boundary and
a loop to call `servo()` from — and reads the report. The one place the renderer
does arithmetic of its own is the audio expansion (§6), and it does that through
`nest.parentPos()`, the nest's own inverse map, so the two cannot disagree.

**The rendering discipline for the wrap: the SAME committed one-shot playback
uses.** The brief said "the offline path has no TickHost and no servo". It has
both. `createRenderRuntime` is already a multi-host TickHost factory, so the
offline path is not missing the mechanism — it has a **deterministic** one, and
`nest.loop(id).boundary` reads `'lookahead'` offline exactly as it does with a
worker host. The servo's client loop is the frame loop: one `nest.servo()` per
frame, outermost nest first, after `advanceTo` and before `onFrame`.

**A wrap is not in the trace.** Rule 10c says a wrap is a callback, never a row,
because a row would make an infinite loop an infinite log. A render is a fixed
number of frames so a wrap row could not actually be unbounded here — but the
rule is kept anyway: wraps get their own bounded list, their own `wrapsHash`,
and `renderHash = hash(traceText + wrapsText)`.

**Child rows have a different SHAPE, not an extra field on every row.** A parent
row is `{f,k,id,at,o,i,d}`; a child row is `{f,s,k,id,at,o,i,d}` with `s` the
deck label. Asserted: a flat render's trace text contains no `"s":` and its
`renderHash === traceHash`, so **no existing hash moved**.

**An unbounded loop is refused by `renderBound()`, not by a second refusal.**
Call `renderDeck(parent)` with no window and the window comes from
`nest.renderBound()`, which throws `LOOP_UNBOUNDED` naming the spans. Naming the
end yourself (`{from, to}`) is still allowed — that is `renderBound({until})` —
and the render then reports which spans were bounded by the window rather than
by the score. It does not hang either way: an `'infinite'` loop over an explicit
6 s window renders **6 wraps / 12 events in 1 ms**.

---

## 3. The proofs, with numbers

### Byte-identity
Two renders of one composition, fresh runtime each (a render is reproducible
from time zero, not from wherever the last one stopped):

| | value |
|---|---|
| trace text + `traceHash` | identical, fragment and loop |
| wrap set + `wrapsHash` | identical |
| `renderHash` | identical |
| child adapter's own event order | identical |
| per-frame child position (`children[0].pos`) | identical |
| two levels deep | identical |
| a score round-tripped **twice** then loaded from bytes in a fresh runtime | identical |

In the browser, on a real `OfflineAudioContext`, for a 3-pass loop with its own
audio lane:

```
trace 71547c1fba9fd7b9   wraps 48c4e22da5d885b9   render ddb08e8431a7e123
audio 8c50081880fdbd93 (144 000 samples, 7 nonzero)
DSP-in-a-loop 8e09b44ddc76262c (rms 0.015942944)
```

and the same four hashes came back **from a second, separate Chrome process** —
so the nested claim now matches the flat one (`b7490f1865048393` likewise
reproduced cross-process).

### The position map is the arithmetic §8.2 states
Checked at EVERY frame against an independently computed expectation, over both
forms, at 30 fps:

- fragment: `childPos = clamp(in + (parentPos − at)·rate)` — 0 mismatches
- loop: `childPos = in + ((parentPos − at)·rate) mod (out − in)` — 0 mismatches

Loop length 1690 ms deliberately **not** a multiple of the frame period
(33.333 ms), so no arm can pass by grid alignment.

### Equal to real wall-clock playback
Same arrangement (a 400 ms fragment looped 4×, `at` 200), one arm rendered, one
arm on a genuine wall clock with `mainTickHost()` everywhere and `servo()` on a
16 ms interval:

- same **child** event ids, same order, same count
- same **parent** (span) event ids
- same final adapter state, including a `caps.loopState:'carry'` lane's value
- same number of wraps

Same again against an irregularly-advanced virtual clock (1–41 ms steps).

### Lateness — the §8.8 comparison
Same nest (1690 ms fragment, `repeat: 12`, 36 child events), rendered and played:

| | wrap-adjacent \|lateness\| p50 / p95 | all other events p50 / p95 |
|---|---|---|
| **render (offline)** | **0.000 / 0.000 ms** | **0.000 / 0.000 ms** |
| playback (wall clock, this machine) | 0.044 / 0.325 ms | 0.736 / 1.742 ms |
| playback (§8.8, session 6) | 0.10 / 0.70 ms | 4.50 / 14.60 ms |

Every fire in a nested render has `deltaMs === 0` — asserted, not sampled. The
render has no wall clock to be late against, so this is not an improvement, it
is the absence of the axis.

**§8.8's inversion reproduced independently**: in playback the wrap is again the
**most** precisely timed instant in the loop, by −0.69 ms here (0.044 vs 0.736
p50) against §8.8's −13.9 ms. The magnitude differs by machine and load; the
sign did not.

**Accumulation, offline**: 12 downbeats over 11 wraps, inter-onset interval
min 1690 / max 1690, **spread 0.000 ms, slope 0.0e+0 ms/wrap**. Same result as
§8.8's 600-wrap playback measurement, for the same reason: nothing counts wraps
to know where it is.

### Exactly-once
- 4 passes × 3 events = 12 fires, in pass order, no id twice.
- The downbeat sitting **exactly on `in`** fires on all 4 passes including the
  first — the hair-before-`in` lead, offline.
- `in === deck.range[0]` loses the lead; that is `leadClamped: true` and a
  reported degradation naming "a lost downbeat", not a silent 3/4.
- Two levels deep: 2 outer × 2 inner × 2 events = 8, each exactly once.

---

## 4. THE WRAP DISCIPLINE, as a 2×2 truth table

The claim "a committed boundary is the mechanism, the servo is only a backstop"
is testable offline because both can be removed independently. Same rig, 4
passes of a 1690 ms fragment with an event 5 ms past `out`, 30 fps:

| tick host | servo | wraps | child events | what happened |
|---|---|---|---|---|
| yes | yes | 3 `boundary` | **8** | correct |
| yes | **no** | 3 `boundary` | **8** | **byte-identical to the row above** |
| **no** | yes | 3 `polled` | **11** | leaks 3 events from past `out` |
| **no** | **no** | **0** | 3 | the loop never loops |

Three findings from that table.

**(a) The committed boundary alone carries the loop.** `servo:false` on a
committed nest renders a byte-identical trace AND wrap set. The servo is
genuinely a backstop.

**(b) The offline servo corrects ZERO times.** 91–241 calls per render, 0
corrections, because parent and child ride one clock and the position error is
exactly 0 by arithmetic. (With a **degraded** child rate it is not zero — see
§5 — which is the only reason the number is interesting.)

**(c) Polling offline is a LEAK, not the loss §8.8 measured — the artefact
inverted.** §8.8 measured polling in playback as **one lost downbeat per wrap
(2100/2400 onsets)**. Offline, polling loses nothing: `wrapSpan` seeks to the
top of the pass, so the downbeat still fires. What it does instead is let the
child **free-run past `out`** until the next frame, so material outside the
quotation sounds:

```
fps  24 committed: 24 child events, TAIL leaks 0/8
fps  24 polled   : 28 child events, TAIL leaks 4/8
fps  30 committed: 24 child events, TAIL leaks 0/8
fps  30 polled   : 29 child events, TAIL leaks 5/8
fps  60 committed: 24 child events, TAIL leaks 0/8
fps  60 polled   : 27 child events, TAIL leaks 3/8
fps 120 committed: 24 child events, TAIL leaks 0/8
fps 120 polled   : 24 child events, TAIL leaks 0/8
```

The leak count is **not monotonic in fps** — it is an aliasing product of the
frame period, the loop length and the child's own 25 ms scheduler tick. At
120 fps this rig happens to leak nothing; that is luck, not a fix.

And the trap the report exists for: **the polled render is byte-identical to
itself.** Determinism is not correctness. So `boundary:'polled'` on any looping
span produces a note and a `r.nest.polled` list, because a reproducible wrong
render is worse than a flaky one.

---

## 5. A degraded child is reported, never overridden

A child adapter declaring `caps.rates:[1]` under a span at `rate: 1.5`:

```json
{"span":"q","wanted":1.5,"chose":1,"degraded":true,"allowed":[1],
 "reason":"child caps.rates lattice","corrections":6,"hardSeeks":0}
```

plus a note in `r.notes` saying the render is of what CAN be played, not of what
the score asked for. Control: the same span with no lattice composes 1.5 exactly
and corrects **0** times. The 6 corrections are the servo's price for the honest
degradation — and they are the only nonzero correction count in any nested
render measured here.

---

## 6. THE SEAM AT THE AUDIO BOUNDARY (findable only by building it)

The brief predicted "expect analogous seams at the nest boundary". There is one,
and it is the flat renderer's closing-`pause()` seam one level down — except
this time **the composition causes it, not the renderer's epilogue.**

The obvious design is a `createAudioLane` on the CHILD's transport, sharing the
one `OfflineAudioContext` and the one virtual clock. It composes correctly on
paper: the lane maps `transport.timeAt(ev.at)` (child position → wall) then wall
→ audio through the shared anchor. **In a real browser it rendered 1 nonzero
sample out of an expected 7.**

Cause: `createAudioLane` subscribes to `transport.onState` and calls
`cancelCommitted()` on every state change — right live (a seek must not leave
notes ringing), wrong offline, where nothing has played until
`startRendering()`. And **a loop's wrap IS a `child.seek()`** — the mechanism
§8.8 chose on purpose — so a looping child cancels its own audio once per
repetition, by design, and only the nodes committed after the last state change
survive. The last state change is the span's own EXIT.

The fix is not a flag; it is a change of what an offline render is:

> **Offline, a loop is EXPANDED, not replayed.**

`renderDeckAudio` maps each child-domain audio item to its parent-domain time
once per repetition — through `nest.parentPos(id, cpos, iter)`, the nest's own
inverse map, recursively, so a loop inside a loop expands multiplicatively — and
schedules them on a lane bound to the ROOT transport, which never seeks during a
render. Measured, real `OfflineAudioContext` @ 48 kHz, a 1000 ms fragment × 3
with clicks at child 100 and 600 plus a parent click at 250:

```
want [4800, 12000, 28800, 52800, 76800, 100800, 124800]
got  [4800, 12000, 28800, 52800, 76800, 100800, 124800]      7/7 exact
```

`mode:'lane'` keeps the broken path reachable as a **runnable negative
control**: same composition, 1/7 nonzero samples, reproducibly, and the suite
asserts it.

**Two consequences worth writing down.**

1. **A stub context is blind to this entire class of bug.** `cancelCommitted`
   calls `node.stop()`, and a stub has already recorded the start time by then —
   so `mode:'lane'` scores **7/7 against the stub and 1/7 against a real
   `OfflineAudioContext`**. `prop-render` now asserts that blind spot the same
   way it asserts the source-scan's closure blind spot, so nobody reads the node
   suite as proof of PCM.
2. **Expansion is exact and therefore drops the hair-lead.** The wrap seeks to
   `in − 1e-6` ms; an expanded loop uses the score's own numbers, so the first
   click lands at exactly 0.100000 s rather than 0.100000001 s. The event lanes
   still carry the lead (it is in the trace); the samples do not. At 48 kHz the
   lead is 0.000048 samples, i.e. below the resolution of the thing it would
   have affected — but the render is now honest about which of the two it used.

`[Exposed=Window]` is unchanged: a render farm parallelises across DOCUMENTS,
never across workers. Nesting does not change that; it multiplies the number of
lanes inside one document.

---

## 7. TWO BUGS IN ALREADY-GREEN CODE, found by building this

Both were invisible to 389 green nested checks, and both for the SAME reason: a
virtual clock fires a committed one-shot at exactly its due instant, so
`deltaMs === 0` and every "am I at the top of the pass?" test that compares
floats for equality passes. Rendering a nest put a second, differently-timed
observer on the same code.

### (1) The ENTRY downbeat was lost in wall-clock playback, and only there
`assertSpan` took the hair-before-`in` lead only when
`phaseOf(pos).off === 0`. That is true whenever the enter event actuates at
exactly `at` — always, on a virtual clock. In playback the enter fire carries the
scheduler's ordinary lateness, `off` was ~1 ms, and **pass 1, and only pass 1,
folded its downbeat**. Measured on the same score: **8 onsets rendered, 7
played** (`MID,DOWN,MID,DOWN,MID,DOWN,MID`).

The wrap was never the problem. §8.8's "every repetition sounds identical,
including the first" was true of every repetition except the first.

Fix: `actuate(payload, rec)` with `phase:'enter'` **is** an arrival, and an
`assertState` after a seek **jumped** (rule 10a: "you jumped, you did not
arrive"). The lead is taken when the arrival is no later than `wrapGraceMs` —
the identical bound `wrapSpan` uses for the identical reason.

**A failed first attempt worth recording**: bounding `off` by the fire's own
`rec.deltaMs`. It does not work — `deltaMs` is sampled at the top of `fire()`
and `off` is read from `parent.position()` a few instructions later, so
`off > deltaMs` ALWAYS, by the cost of the intervening clock reads. Measured:
the entry seek went to child `0.98876953125` instead of `−1e-6`. **A bound that
is beaten by its own measurement overhead is not a bound.**

### (2) A span the playhead had not entered was being STARTED
Found by rendering a nest inside a nest. An outer wrap seeks the middle deck to
`in − 1e-6`, which is inside an inner span's window by the 0.5 ms eps tolerance
but **before its enter event**. The inner child was therefore still parked at
`c0` (rule 7c's absent park), `adapter.transport` started it anyway because the
position overlapped, an event sitting exactly on `c0` fired `'tick-late'`, and
then fired AGAIN when the enter actuated and re-seeked a hair earlier.
**Two fires of one event — exactly-once, broken, two levels down.**
Observed: `G0,G0,G1,G0,G1,G1,G0,G1` for an expected `G0,G1,G0,G1,G0,G1,G0,G1`.

Fix: `adapter.transport` plays a span only when `sp.present !== false`.
`present === null` (never asserted) still plays — that is a deck nobody seeked,
and refusing it would be the regression.

**Both fixes are guarded by arms that FAIL without them** — verified by
reverting each and re-running: `loop-entry` 2/3 downbeats, `loop-deep` 7 events
instead of 8. The `loop-entry` arm has to MANUFACTURE the lateness (stop the
parent's scheduler across `at` and restart it, so the enter arrives through
`scan()` as `'tick-late'`), because a plain virtual runtime structurally cannot
produce the condition. **That is the reusable lesson: a virtual-clock property
suite cannot see a bug whose trigger is "the fire was 1 ms late".**

---

## 8. Cost

10 minutes of position time, 12 000 events, 18 001 frames at 30 fps, same event
count in both arms:

| | wall | × real time | ev/ms |
|---|---|---|---|
| flat deck | 11 ms | 54 545× | 1 091 |
| nest, 300 passes, 299 committed wraps, servo per frame | 21 ms | 28 571× | 571 |
| same, `servo:false` | 14 ms | 42 857× | 857 |

So folding a composition costs about **1.9× a flat render**, of which the
per-frame servo is about a third — and on a committed-boundary nest that third
is provably free (`servo:false` is byte-identical). Other shapes measured:
1000 passes × 10 events = 54 054×; 60 passes × 500 events = 580× (that arm is
event-bound, not nest-bound: 145 ev/ms with 30 000 events in 120 s of position
time).

Nothing here reintroduces real time. The slowest composition measured still
renders 580× faster than it plays.

---

## 9. What is still open

- **Cross-deck simultaneity is a RENDER property, not a transport contract.**
  Two decks firing at the same instant are ordered by (time, timer-id) inside
  one `advanceTo`, so the render fixes a total order that no wall clock provides
  (two schedulers, two hosts, no shared tick). The suite therefore compares
  per-deck sequences against playback, never the interleaving. Stated in the
  header of `render.mjs` so nobody proves a regression against it.
- **A late ENTRY of a non-looping FRAGMENT still skips material.** The loop case
  is fixed (§7.1); for a plain fragment, entry seeks to `c0 + late·rate`, so the
  first few ms of the quotation are never played. Making entry seek to `c0`
  instead would only move the loss into the servo's next `sync()` (which moves
  position without firing). A real fix wants the transport to distinguish "catch
  up by firing" from "catch up by moving", which is a `transport.mjs` change —
  **not made, not measured.**
- **`renderDeckAudio` expands; it does not model a child's own media element.**
  Expansion is exact for scheduled audio items. A child whose audio comes from a
  `<video>` element cannot be rendered offline at all (no offline media
  element), and that is unchanged and unmeasured here.
- **Disintegration and phasing are now renderable but were not rendered.** The
  pieces are in place — two decks at rates 1.0/1.002 for phasing (rule 7g still
  forbids two overlapping quotations of one deck, so it still takes two decks),
  and a per-iteration reconstructor for disintegration. Neither was rendered to
  a file in this session. **Not measured.**
- **`caps.evidenceGated`** — the evidence firewall is still read-side only, so
  a rendered "attested-only" performance is still the adapter's job. Unchanged.
- **Determinism remains OBSERVED, NOT GUARANTEED.** The Web Audio spec gives
  `OfflineAudioContext` no bit-exactness guarantee. What is measured is: two
  in-process renders and two separate Chrome processes agreeing on the PCM hash
  of a real DSP graph inside a loop, on this machine, on this build, today.
  `hashAudioBuffer()` exists so a fleet can re-check that per browser instead of
  trusting this file.

---

## 10. Requests for files I do not own

`timeline/transport.mjs` — nothing is required for this work to be correct. Two
things would make it better, in cost order:

1. **`createAudioLane(transport, ctx, {onStateChange: 'cancel' | 'keep'})`** (or
   `offline: true`). Today the lane's `cancelCommitted()` on every transport
   state change is what forces §6's expansion. With `'keep'`, a child lane bound
   to the child's transport would render a loop directly — closer to "the render
   runs the shipped mechanism" and it would model a child that re-seeks for
   reasons other than a wrap. The default must stay `'cancel'`.
2. **`deck.assertState(kind, state, info)`** (already on the §8.8 open list) —
   the renderer would use it to snapshot and restore a child's lane state around
   a window boundary instead of relying on the fold.

`timeline/score.mjs` — no change needed. `repeatGeometry`/`loopPhase` were
sufficient for every geometry the renderer needed, including `{untilMs}` cutting
the last pass.
