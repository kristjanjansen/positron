# plan-gesture — one surface for recording a movement, and playing it back

Written 2026-09-13, from a session note: *"rethink the whole thing as an XY pad
experience, and maybe later make some parts reusable — so we can use it with a
sync control later. Get out of the original demo and more toward a
universification of gesture recording and interpreting and playback."*

This is the plan for that. It is mostly ASSEMBLY, not invention: four of the
five pieces exist, are measured, and are already in `demo/shell/`. What is
missing is one component and one decision.

⚠️ `draw` shipped a slider on 2026-09-13 and **stops there on purpose**. The
timeline half is this document, and it is not started.

---

## 1. What the thing is

A movement — a finger on a pad, a knob, a fader, a camera pan — produces
hundreds of samples a second. Nothing keeps them all. Something decides what to
write down, something else decides what to draw between the things written
down, and a third thing puts the playhead back in the middle of it and asks
"where was the hand at 4.212 s?".

Those three are the same three every time, and this repo has now built them
three times:

| | what it records | where |
|---|---|---|
| `draw` | a pen on a canvas, x and y together | `demo/shell/pointer-adapter.mjs` |
| the XY pad | a finger on a pad, as two controller values | `proto/automation/xy.html`, unshipped |
| the automation lane | a knob over a video clip | `proto/automation/automation.html`, unshipped |

**They differ in the actuator and in nothing else.** Same throttle, same
evidence lane, same per-series interpolation, same "restore the console on
seek". The plan is to say so in code once.

---

## 2. What already exists, and what it measured

Nothing below needs writing. It needs USING.

- **`demo/shell/pointer-adapter.mjs`** — the `pointer` kind. Hold **24.19 px**
  mean error against straight lines **0.679** and Catmull-Rom **0.036**; seek
  accuracy **0.042 px** interpolated against **38.31 px** held, about 900x.
  Promoted from `proto/paths/`, unchanged.
- **`demo/shell/cc-adapter.mjs`** — the `cc` kind. **6408 raw samples → 409
  logged rows, 15.7:1**, reconstruction inside **1.25%** of each controller's
  range, a full-state keyframe every 500 ms carrying a 4-byte digest. Promoted
  from `proto/automation/cc-core.js`, unchanged, 2026-09-13.
- **`timeline/transport.mjs`** — `createDeck` has continuous-kind support:
  `caps.continuous/interpolate/interpolators/neighbourhood`, `sampleAt`,
  `bracket`, `assertAt`, `reduceAt`, and a `request()` honest-degradation API.
- **`timeline/media-master.mjs`** — a media element as clock master, with the
  jump/sync threshold, stall policy and rvfc sampling already in it. This is
  what `proto/automation` hand-rolled as `syncTick()` and does not need to.
- **`demo/shell/`** — `strip.mjs`, `transport-bar.mjs`, `slider.mjs`,
  `panel.mjs`, `picker.mjs`, `choice.mjs`. The UI is not the work.

Measured on the XY prototype, 8 s gesture, 5 series:
`6408 → 409 rows, 18 keyframes, range [0, 8650] ms, lead-in 250 ms`.

---

## 3. The decision that is actually open

**Does an XY pad record ONE two-dimensional series, or TWO one-dimensional
ones?** This is not a style question and both answers ship somewhere real:

|  | one `pointer` sample | two `cc` series |
|---|---|---|
| x and y can disagree | **never** — one sample, one instant | yes: the gate is per series, so x can be logged and y held back |
| what is drawn between knots | a 2-D spline through the path | two independent 1-D ramps |
| corner behaviour | the curve rounds it | the axes ramp separately, so a corner becomes a diagonal |
| what a hardware controller sends | nothing — this shape is ours | exactly this |
| what a synth can be driven by | needs converting | directly |

🔴 **The honest move is to hold both and SHOW the difference**, because nobody
here has measured it and the page is the instrument for measuring it. A fast
corner drawn once, reconstructed both ways, with the error of each against the
full-rate evidence lane, answers a question this project keeps asking sideways.
That measurement IS the page's subject, the way `draw`'s subject is 93.4% of a
line being invented.

Decide it with the measurement, not before.

---

## 4. The component: `demo/shell/xy-pad.mjs`

One reusable surface, because the session note asks for it by name — *"so we
can use it with a sync control later"*.

```js
createXyPad({
  label,                      // what the pad is FOR, in words
  x: { label, min, max, unit },
  y: { label, min, max, unit },
  onInput(x, y, ev),          // every sample, full rate, local — never throttled
  value: () => ({x, y}),      // what to draw when something else is driving it
})
```

Three rules it has to carry, all of them already paid for:

1. **The live path is full rate and local.** Throttling decides what enters the
   LOG, never what the actuator hears — `proto/automation/xy.js` gets this
   right and the rule comes from `proto/jam`: a knob must not travel to a relay
   and back before it moves anything.
2. **Capture and evidence are two append-only buffers, never one.** demo10's
   sampler emptied the buffer it was decimating and so consumed its own ground
   truth; `draw`'s header still carries the scar.
3. **It draws, and what it draws is what was RECORDED, not what the pad was
   asked to show.** A pad illustrating its own settings is the `grains` grain
   visualiser mistake — a confident picture of nothing measured.

Reusability test, and it is the real one: **a sync control is an XY pad whose x
is offset in milliseconds and whose y is rate**. If `createXyPad` cannot be that
without an option flag per caller, it is not a component yet.

---

## 5. Steps

Each step ends with something measurable. None of them needs the one after it.

**P1 — the pad replaces the canvas in `draw`.** Same two records (evidence and
throttled), same smoothing knob, but the surface is an XY pad with named axes
rather than a bare canvas. `data-gesture` stays, so `verify.mjs` keeps dragging
it. *Proves: nothing is lost by componentising — the same five asserts, the
same numbers.*

**P2 — a transport under it.** `createDeck` over the recorded samples, the
transport bar, and the playhead driving a ghost cursor across the pad. Record,
then play, and watch the hand move again. *Proves: `sampleAt` at the playhead
equals what the record says, at 20 positions, to within the interpolator's own
error — which is `pointer-adapter`'s measured 0.042 px, not a threshold anybody
picked.*

**P3 — both readings of the same gesture, side by side.** The 2-D path against
two 1-D series, drawn together, error of each against the full-rate evidence.
*Proves §3, with a number.* ⚠️ Assert the ORDER and the RATIO, never a pixel
threshold — a threshold gets tuned until it passes, which is how `draw`'s
"inside a pixel" check had to be replaced the day a real gesture met it.

**P4 — a second actuator, so it is not one page's private machinery.** The
obvious one is `rack`/`box`: the same recorded gesture, sent as control change
to a real instrument over the relay. *Proves the kind travels.*

**P5 — `memento`.** The automation lane over a media clip, which is
`proto/automation/automation.html` finished: `createDeck` + `mediaMaster` +
`cc-adapter`, with the clip generated in-page so the burned clock in the
picture can be read back and compared to the playhead. That is the check the
prototype could not make — it proved its four mappings against its own
arithmetic, and a picture that carries its own position can grade them from
outside. **`demo/shell/cc-adapter.mjs` is already promoted for this.**

---

## 6. Traps, each of which has already cost a day here

- 🔴 **The overdub law fires an event scheduled BEHIND the playhead
  immediately.** Right for a note — you hear what you just played — and wrong
  for a level: a curve authored in the past must not move the current value.
  `proto/automation` re-asserts at the playhead to undo it (seam S4). Anything
  drawing a curve behind the playhead needs the same line.
- **Switches are STEP series, not ramps.** Sustain down at 1.5 s and up at
  3.0 s does not mean half-pressed at 2.2 s. Caught by a smoke test, not by
  theory, and the first thing any new continuous kind hits.
- **Seek must RESTORE the console, not replay the gesture.** `assertState`
  sends a reset and then re-states every value, so a seek lands on a known
  state rather than on "the fold, plus whatever the last playhead position left
  behind".
- **A wall-clock throttle never produces evenly spaced samples**, so uniform
  spline knots bend the curve toward whichever sample arrived late. Knot on
  TIME. `pointer-adapter` does; a naive port would not.
- **The last sample of a gesture is always logged**, at its own timestamp. Drop
  it and every replay undershoots the endpoint the hand actually reached.
- **A centre that follows the last thing SET must not reset the phase.** From
  2026-09-13 on the board: a slider drag sends a value every few milliseconds,
  and re-anchoring a drift clock on each one pins it at t=0 — the counter
  climbing while nothing moves. Same shape as any "playhead follows input"
  loop.

---

## 7. What this is not

Not a new library. `timeline/` already has the continuous-kind seams and they
are exercised by two adapters; this adds a third caller and one UI component,
and it deletes the third hand-rolled copy of a capture gate.

Not a rewrite of `draw`. P1 keeps its subject, its numbers and its five checks.
If P1 costs the page anything measurable, P1 is wrong.
