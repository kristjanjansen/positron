# plan-slider-automation: an invisible hand on the kit's slider (2026-09-16)

## 0. The ask, and what it commits to

Verbatim, 2026-09-16:

> *"plan a work on slider automation each slider can possibly have a mode button
> like loop does (also looking similar in right) that allow pick 'invsible hand'
> moving slider. I want to have himanline, real abalog knob / slider feel and
> curve. See also draw. We can starr with simple sweep back and forth but be
> ready to more movement presets and maybe custom too in future. When you fix
> knobs demo add it to silders. Single sidebutton, on and off atm"*

Seven commitments, each answered by a numbered section below:

| | the ask | where |
|---|---|---|
| 1 | the KIT's slider gets it, not one page | §1 |
| 2 | a mode button per slider, on the right, looking like the loop's | §2 |
| 3 | an INVISIBLE HAND, which is a claim about how it reads | §5 |
| 4 | human feel, a real analog curve | §4, §5 |
| 5 | see `/draw/` | §5.1 |
| 6 | one sweep now, more presets and custom ones later | §3 |
| 7 | one side button, on and off, today | §2, §3.3 |

🔴 **AND AN EIGHTH THING THE ASK DOES NOT SAY, WHICH OUTRANKS ALL SEVEN.**
`/knobs/` HAD a thing that moved its own sliders and it was removed today, on
this instruction: *"I'm not sure where sliders did anything... Is there some
param CC parameters which are already moving, which I don't see?"* (`a7c733c`,
2026-09-16). The commit's own words: *"a page that moves its own controls while
somebody is trying to learn what a control does is a page that cannot be
learned."* So this feature is the same mechanism coming back, and the only thing
that makes it a different feature is §6: it is asked for by a press, it is
unmistakable while it runs, and a hand takes it back in one frame. Every one of
those three is graded, in §6.4.

---

## 1. Where it lives, and why there

**Two files, and the split is the looper's.**

- **`demo/shell/hand.mjs`** holds the movement vocabulary and the planner. No
  DOM, no slider, no page: `plan(preset, {lo, hi, seed})` returns legs, and
  `positionAt(plan, tMs)` returns a number in 0..1. Pure.
- **`demo/shell/slider.mjs`** gains the button, the frame loop and the hand-over.
  Nothing else changes in it.

The precedent is exact. `looper.mjs` keeps `ringOrder`, `planVoice` and `headOf`
pure and `looper-test.mjs` grades them with 18 asserts and no browser, because
CLAUDE.md records that *every bug that looper ever had lived in one of those
three functions*. The same is true here before a line is written: everything
interesting about this feature is a curve, and a curve graded through a browser
is a curve graded through 60 Hz sampling, quantisation to the slider's `step`,
and a harness that cannot press the control at all (§6.5). §5.4 measures what
that costs and the answer is that the shape claim becomes ungradable.

⚠️ **Why not inside `slider.mjs`.** Not size: `slider.mjs` is 406 lines and has
only seven consumers (`/draw/`, `/grains/`, `/knobs/`, `/kit/`, `/memento/`,
`/radio/`, and `xr-tablet.mjs`, plus `/patch/` which is off the site), so "every
page downloads it" is not an argument here and should not be made. The reason is
grading and reuse. A generator that lives inside a slider can only be graded
through a slider, which §5.4 measures as fatal; and it is a generator only a
slider can use, when the second consumer is already visible in `xy-pad.mjs` and
in `/draw/`, the page that would want to replay a measured gesture.

⚠️ **The name collides and the collision is survivable.** `demo/shell/xr-hands.mjs`
already exists and is about a headset's tracked hands. `hand.mjs` is the user's
own word for this thing and the XR file is prefixed, so the two do not read as
variants of each other. If a session disagrees, `move.mjs` is the alternative and
nothing else in the plan changes.

---

## 2. The button, and how it borrows the loop pair's look

### 2.1 What the loop pair actually is

`transport-bar.mjs` builds `[LOOP|→]` as `el('div', 'tbar-loopgrp')` holding two
real buttons, and the comment says why: *"what the left one sets is a property OF
the right one"*. `shell.css` then does six things to join them:

```css
.tbar-loopgrp { flex: none; display: flex; align-items: center; }
.tbar-loopgrp > * { border-radius: 0; }
.tbar-loopgrp > :first-child { border-top-left-radius: 4px; border-bottom-left-radius: 4px; }
.tbar-loopgrp > :last-child  { border-top-right-radius: 4px; border-bottom-right-radius: 4px; }
.tbar-loopgrp > * + * { margin-left: -1px; }
.tbar-loopgrp > :hover, .tbar-loopgrp > :focus-visible { position: relative; z-index: 1; }
```

Everything else on that selector is about the TRANSPORT: the `--tbar-btn` square,
the shared `--dim2` edge, the `[disabled]` ink rule, the `data-loop` states.

### 2.2 The join is already written three times

MEASURED by reading `shell.css`, not guessed:

| | where | what it writes |
|---|---|---|
| 1 | `.tbar-loopgrp`, line 1940 | the six rules above |
| 2 | `.step`, line 1496 | `border-radius: 0`, `:first-child` / `:last-child` corners, `margin-left: -1px`, hover z-index |
| 3 | `.pos-pick-cell`, line 1460 | `border-radius: 0; margin-left: -1px` on the cells themselves |

So a fourth copy for the slider is exactly what CLAUDE.md's *"a control that
exists in one page and nowhere else is a component that has not been noticed
yet"* rule is about, one level down: a LOOK that exists in three places and
nowhere else is a utility that has not been noticed yet.

### 2.3 The answer: `.pos-seg`

One class carrying the six generic rules. `.tbar-loopgrp` keeps its name and all
of its transport-specific rules and gains `pos-seg` in its class list;
`stepper.mjs` does the same; the six duplicated rules are deleted from both. The
slider's row is then `el('span', 'sld-hand-row pos-seg')` and gets the look with
**no new CSS about joining at all**.

Three traps, all found by reading:

- ⚠️ **`.step button:first-child { border-radius: 4px 0 0 4px; margin-left: 0 }`
  writes all four corners in one shorthand** where `.tbar-loopgrp` writes two
  longhand. Those are equivalent only because `> *` zeroed the radius first, so
  the deletion is safe only if the `> *` rule lands. Do not delete one without
  the other.
- ⚠️ **`.step button:hover` is (0,1,1) and `.pos-seg > :hover` is (0,1,0).**
  Equal-weight rules resolve on source order, so `.pos-seg` goes AFTER the base
  `button` block and before the three specific blocks. `.tbar-loopgrp > .tbar-x`
  at (0,2,0) still wins everything it wins today.
- 🔴 **THE LANE HAS NO BORDER. IT HAS AN INSET SHADOW, ON PURPOSE.** `.sld-lane`
  uses `box-shadow: inset 0 0 0 1px var(--line2)` because *"a border insets the
  PADDING BOX the handle is positioned in, so its travel is short by one pixel at
  each end"*, MEASURED. The join still works: `margin-left: -1px` on the button
  puts the button's left border in the same pixel column as the lane's shadow, so
  the seam is one line. The lane's own box is unchanged, so `fromX()`'s travel
  arithmetic is untouched.

### 2.4 The edge colour, before it is reported

🔴 `.tbar-loopgrp` was photographed and reported THREE separate times for
mismatched borders, and the settled answer is *"state it once for BOTH segments
rather than nudge one toward the other"*. The slider inherits that bug for free
unless the lane's shadow moves with the button's state:

```css
.sld-hand-row[data-hand="on"] > .sld-lane { box-shadow: inset 0 0 0 1px var(--dim2); }
```

Do this in the first commit. It is the one place in this plan where a lesson can
be applied before it costs anything.

### 2.5 What the face says

A table, mirroring `WAY_GLYPH` / `WAY_SAYS`, and for the same stated reason: a
glyph is the STATE, not the next press.

```js
export const MOVE_GLYPH = { sweep: '↝' };
export const MOVE_SAYS  = { sweep: 'moving by itself, back and forth. press to stop' };
export const MOVE_OFF   = 'not moving by itself. press to let go of it';
```

🔴 **NOT `⇆`.** That glyph already means *the loop plays there and back* on
`/radio/` and `/replay/`, and the two would be one picture meaning two things,
which is this project's own named failure (*"two marks in one colour in one place
is one mark"*).

⚠️ **NO ARTICLE, NO EM DASH, AND IT IS A `title` RATHER THAN A LABEL.** The
button's visible content is the glyph; `aria-label` and `title` carry the
sentence, the way `looper.mjs` already does.

---

## 3. The data shape that holds a movement

### 3.1 A preset is numbers and a name

```js
export const MOVES = [
  ['sweep', {
    a: 3, b: 4,          // the Beta speed profile. See §4
    lapMs: 2200,         // one end to the other
    span: [0, 1],        // as a share of the lane's travel
    turnMs: 130,         // the pause at each end
    endJit: 0.030,       // how far an end wanders, as a share of travel
    timeJit: 0.120,      // how much a lap's duration wanders
    over: 0.022,         // overshoot, as a share of travel
    wobble: 0.050,       // speed micro-variation inside one reach
  }],
];
export const MOVE_TURN = [0];    // the presets the button cycles TODAY
```

Ten numbers and a name. **A custom movement is the same ten numbers with no
name**, handed straight to `hand.use({...})`, so "custom" costs zero code: the
parameters ARE the format. A second preset costs one row in `MOVES`, one glyph,
one sentence, and one index in `MOVE_TURN`.

### 3.2 Why `MOVE_TURN` is separate from `MOVES`

Copied deliberately from `LOOP_TURN`, whose comment says it holds *"the three the
button cycles, in the order it cycles them"* while `LOOP_WAYS` holds five, and
that the other two stay *"reachable and driven by the checks, which is a loose
end written down rather than left to be found"*. Same here: a preset can exist,
be graded, and not yet be on the button.

### 3.3 How one button becomes a picker without being redesigned

Today `MOVE_TURN` has one member, so the press cycle is `off -> sweep -> off`,
which is the on/off the ask names. With two members it is
`off -> sweep -> drift -> off`. **That is one array edit and no new control**,
which is the whole of what "be ready for more presets" has to mean. The ask says
do not design a menu, and this is the answer to why one is not needed yet.

### 3.4 The plan, and why it is a list of legs

`plan(preset, {lo, hi, seed, laps})` returns `{legs, totalMs}` where a leg is
`{kind, t0, ms, from, to, a, b, phases}` and `kind` is one of `reach`, `settle`,
`turn`. Two reasons this is a list rather than a closure over a clock:

- it is a VALUE, so `hand-test.mjs` can sample it at any rate, in order, with no
  clock at all, which is the whole of §5.4;
- `kind` is what makes the measurement possible to state honestly, because §5.3
  measures reaches and turns in separate windows and a metric that has to find
  its own windows is the metric that failed in §5.2.

⚠️ The plan is regenerated when it runs out and the seed advances, so a hand left
on for an hour does not repeat itself. `seed` is fixed only for the test.

---

## 4. The sweep's arithmetic

### 4.1 One family, integer coefficients, no transcendentals

The reach's speed profile is `Beta(a, b)`: `s(τ) ∝ τ^(a-1) (1-τ)^(b-1)`. Integrated
and normalised to `y(0)=0, y(1)=1`, integer `a` and `b` give polynomials:

| a, b | y(τ) | what it is |
|---|---|---|
| 1, 1 | `τ` | a triangle wave. Constant speed |
| 3, 3 | `10τ³ − 15τ⁴ + 6τ⁵` | **minimum jerk**, the standard model of an aimed reach |
| **3, 4** | **`20τ³ − 45τ⁴ + 36τ⁵ − 10τ⁶`** | **the hand.** Minimum jerk with the peak moved early |

Both cubics check out at the ends: `y(0)=0`, `y(1)=1`, `y'(0)=y'(1)=0`, and for
Beta(3,4) also `y''(0)=0`, so the reach leaves rest with zero acceleration as
well as zero speed.

🔴 **The one number that makes it a hand rather than a machine is `a < b`.**
Minimum jerk is symmetric: it accelerates exactly as gently as it decelerates,
and peak speed sits at τ = 0.500. A real aimed movement is asymmetric, because
the second half is under visual feedback and the first half is not. Beta(3,4)
puts peak speed at `(a-1)/(a+b-2) = 2/5 = 0.400`. That single fact is what §5.3's
sabotage check is built on.

### 4.2 The lap

```
reach   0.85 × lapMs   from the last turning point to (target ± overshoot)
settle  0.15 × lapMs   Beta(3,3) back to target. The corrective submovement
turn    turnMs         held still
```

At the defaults: reach 1.87 s, settle 0.33 s, pause 130 ms, so a full there-and-
back cycle is about 4.7 s. The settle is symmetric on purpose: a corrective
submovement is small, slow and entirely visually guided, which is the one case
minimum jerk actually describes.

### 4.3 The wobble, and why it warps time rather than value

Speed micro-variation is `τ' = τ + A·Σ_m sin(πmτ)·cos(φ_m)/m` over two harmonics.

- `sin(πmτ)` is **exactly zero at τ = 0 and τ = 1** for integer m, so the wobble
  **cannot move an endpoint**. Endpoint variation is `endJit`'s job and only
  `endJit`'s job, which is what lets §5.3 grade the two separately.
- Monotone while `A·π·H < 1`. At A = 0.05 and H = 2 that is 0.314, with a wide
  margin. A non-monotone warp is a handle that goes backwards in the middle of a
  reach, which reads as a glitch and not as a hand.

### 4.4 Frame rate

`requestAnimationFrame`, and the value is a function of `performance.now()`
rather than accumulated per frame. A dropped frame then costs a skipped sample
and never a drifted phase. §5.4 measures the metric at 24, 30, 60, 90 and 120 Hz
and it does not move.

---

## 5. What makes it read as a hand, and how that is graded with nobody in the room

### 5.1 What `/draw/` already established, and what `BACKLOG.md` says about it

`/draw/` is the page that records a real hand and replays it. Three of its
measured results bear directly here:

- **smoothing beats straight lines and straight lines beat holding.** 24.19 px
  for a hold against 0.036 px for a spline on the same gesture. A movement built
  out of straight segments is measurably not what a hand does.
- **a line replayed on a clock wants samples spaced on that clock, not samples
  where it bends.** Evenly 0.347 px against 3.009 px, 8.7x, and the guess had
  been the other way round. This is why §3.4's plan is legs on a clock.
- 🔴 **AND `BACKLOG.md` RECORDS THAT TWO OF ITS CLAIMS WERE REFUTED BY A REAL
  HAND AT 100 ms.** `one record of a moving point beats two records` read 0.5x to
  0.9x on a scribble where the suite's synthetic drag reads 2.0x to 7.6x. The
  entry's own conclusion is that *"the question for the page is whether the claim
  is about any gesture or about a smooth one"*.

**That entry is the warning this whole section is written against.** A synthetic
sweep and a human gesture are different objects, and a threshold tuned on one
says nothing about the other. So nothing below claims that this generator
reproduces a human being. What it claims is narrower and checkable: **this
movement is measurably not a sine and measurably not a triangle, on statistics
that are blind to drift.** That is the claim the user's word "invisible hand"
actually cashes out to, and it is the largest claim the evidence supports.

### 5.2 THE FIRST METRIC FAILED ITS OWN NEGATIVE CONTROL, AND THAT IS THE RESULT

Written first, run second, in that order, because `/draw/` records what happens
when it is done the other way round.

The obvious metric: per lap, normalise time by the lap's duration and value by
the lap's travel, then take the **crest factor** (peak speed over mean speed) and
**where the peak sits**. A triangle is 1.000 by construction. A sine is π/2 =
1.571. Minimum jerk is 1.875. Beta(3,4) is 2.074, with its peak at 0.400.
MEASURED to three decimals, by integrating each profile at 2000 points:

```
triangle  crest 1.000  peak 0.501   (0.501 is sampling; a triangle has no peak)
sine      crest 1.571  peak 0.500
minjerk   crest 1.875  peak 0.500
hand      crest 2.074  peak 0.400
```

**Then the negative control was run and the metric failed it.** Feed it a
TRIANGLE carrying the hand's endpoint jitter, tempo jitter, overshoot and pause,
that is, everything human except the shape:

```
NC1  triangle + the hand's jitter    crest 1.708   time below 10% of peak 19.0%
```

1.708 against a true 1.000. **The metric was reading dwell and overshoot, not
shape.** The pause at the turn contributes zero-speed samples and the corrective
settle contributes a reversal, and a whole-lap window swallows both. On that
metric a triangle with a pause on the end would have been shipped as a hand.

### 5.3 The metric that survives it

Segment first, measure second.

1. Cut the sample stream into RUNS at every change of sign of the step, counting
   a zero step as its own sign.
2. A **reach** is a non-zero run whose travel is at least a quarter of the median
   non-zero run's. Everything else is a **turn**: the corrective settle and the
   pause both land there.
3. **Shape** is measured on the reaches only, each normalised by its OWN duration
   and its OWN travel. Crest factor, and where the peak sits.
4. **The turn** is measured in its own window, as milliseconds. A longer pause can
   no longer make the shape look more human, which is the entire repair.
5. **Variety** is counted on the turning values and the lap durations, which are
   a third window again.

Three windows, three claims, and no statistic can borrow evidence from another's.
MEASURED, 10 laps, sampled at 60 Hz, seed 7:

| case | crest | peak at | turn | lap spread | distinct ends |
|---|---|---|---|---|---|
| triangle, bare | **1.000** | none | 0 ms | 0.8% | 3 |
| sine, bare | 1.571 | 0.504 | 0 ms | 0.8% | 3 |
| min-jerk Beta(3,3), bare | 1.875 | 0.504 | 0 ms | 0.8% | 4 |
| Beta(3,4), bare | 2.073 | **0.398** | 0 ms | 0.8% | 3 |
| **THE HAND, everything on** | **2.209** | **0.445** | **467 ms** | **22.1%** | **10 of 10** |
| NC1 triangle + the hand's jitter | **1.156** | 0.571 | 450 ms | 22.8% | 10 |
| NC2 Beta(3,4), jitter off | 2.073 | 0.398 | 0 ms | 0.8% | 3 |
| NC3 sine + the hand's jitter | 1.740 | 0.535 | 450 ms | 22.8% | 10 |
| SABOTAGE Beta(3,3) + the jitter | 2.057 | **0.535** | 467 ms | 22.1% | 10 |

⚠️ The `0.8%` lap spread and the `3` distinct ends on the bare rows are the 60 Hz
sampling grid landing in different places, not design. Say so in the test's own
detail line rather than letting a reader think a fixed sweep wanders.

⚠️ `turn` is 467 ms and `turnMs` is 130, because the window is *everything that is
not a reach*, which is the 330 ms settle plus the 130 ms pause. That is the
honest definition and the threshold is set on it with that meaning stated.

**The thresholds, and what each one is for:**

```
crest  >= 1.90   the movement has a bell-shaped speed profile
peak   <= 0.470  and it is asymmetric, which minimum jerk is not
turn   >= 250 ms it stops at the end rather than passing through
ends   all distinct, spread between 1% and 6% of travel
laps   spread between 10% and 40%
```

**The three negative controls, each written so that a specific wrong metric
fails:**

- **NC1, the drift decoy.** A triangle carrying every jitter the hand has. Must
  read crest 1.156 and FAIL. If it passes, the metric is reading drift. This is
  the one that killed §5.2's metric.
- **NC2, the shape decoy.** Beta(3,4) with every jitter switched OFF. Must read
  crest 2.073 and peak 0.398 and PASS the two shape thresholds. If it fails, the
  metric needs the noise to see the shape, which means it is reading noise.
- **NC3, the sine decoy.** The thing the ask explicitly does not want. crest
  1.740 and peak 0.535, so it fails on both shape thresholds while passing every
  turn and variety threshold. That separation is the proof the four claims are
  independent.

**And the sabotage, per CLAUDE.md's "prove a guard fires":** set `b = a` in the
preset, making the profile symmetric minimum jerk. crest goes to 2.057, which
still PASSES, and peak goes to 0.535, which FAILS. So the sabotage is caught by
exactly one check, the one about asymmetry, and it is caught by nothing else.
A test where a sabotage takes everything red is a test that has one assert
wearing four names.

### 5.4 Grade it on the generator's number, not on the slider's

🔴 **QUANTISATION DESTROYS THE MEASUREMENT AND I MEASURED HOW MUCH.** Sample the
same hand through a `0..127 step 1` slider, which is exactly `/knobs/`, and read
the emitted values:

```
THE HAND, quantised to 128 steps:   crest 1.000   peak 0.500
NC1 triangle, quantised:            crest 1.000   peak 0.500
```

Everything collapses to 1.000, because a quantised curve is a staircase: between
steps the value is constant, so a per-sample derivative sees a flat run followed
by a jump and every run is one sample long. A windowed derivative partly recovers
it (hand 1.862 against sine-plus-jitter 1.755 and the sabotage 1.895) and **the
sabotage passes**, so the separation is gone.

Two consequences, and both are the repo's own rules:

- **Measure the quantity in question.** The generator emits a real number in
  0..1; the slider quantises it. `hand-test.mjs` grades `positionAt()` and never
  a slider value.
- **A slider with too few steps cannot show a hand and must say so.** At 8 steps
  the 3% endpoint jitter is 0.24 of a step and is invisible: distinct ends read 9
  but the crest reads 1.000. The rule is that `endJit × steps >= 1`, so a hand
  needs about **34 steps or more**. `createSlider` warns in the log once when
  `hand: true` meets a coarser slider, rather than silently drawing a staircase.

### 5.5 Robustness, measured

The metric does not move with the sample rate, which is what makes it a statement
about the movement rather than about the machine:

```
 24 Hz  crest 2.21   30 Hz  crest 2.21   60 Hz  crest 2.21
 90 Hz  crest 2.21  120 Hz  crest 2.21     (floating point, seed 7)
```

Four seeds, everything on: crest 2.19 to 2.23, peak 0.44 to 0.45, turn 460 to
470 ms, 10 of 10 distinct ends every time. So the thresholds in §5.3 are not
sitting on one lucky seed, and `hand-test.mjs` runs four of them.

---

## 6. `/knobs/`, the send gate, and the readout

### 6.1 What an invisible hand does to a 20 ms gate

`makeCcSend` passes at most one value per controller per `SEND_GATE_MS` = 20 ms.
An invisible hand at 60 Hz offers three values per two slots. MEASURED by running
the real `makeCcSend` against `/knobs/`'s real pump pattern (a `tick` on every
`onInput` plus a 10 ms interval), one second per row:

| frame rate | offered | sent | messages | thinned |
|---|---|---|---|---|
| 30 Hz | 30 | 30 | 30 | **0** |
| 60 Hz | 61 | 50 | 50 | **88** |
| 90 Hz | 91 | 50 | 50 | **132** |
| 120 Hz | 120 | 50 | 50 | **168** |

### 6.2 🔴 `skipped` IS ALREADY WRONG, AND AN INVISIBLE HAND IS WHAT MAKES IT VISIBLE

At 60 Hz the page would report skipping **88** values out of **61** offered. The
readout's own sentence says *"skipped is what your hand made that the page did
not send"*, and the true answer is 11.

The cause is one line in `cc-adapter.mjs`:

```js
if (!due && !p.end && !p.isSwitch) { stats.thinned++; continue; }
```

`thinned` counts **ticks that found a value not yet due**, not **values
overwritten before they went out**. `/knobs/` calls `pump()` on every input AND
on a 10 ms interval, so one held-back value is counted two or three times.

⚠️ **This is a fault TODAY, for a real finger.** A phone at 120 Hz already makes
this cell read 2.4x too high. Automation does not create the bug; it makes it a
fixed, checkable number instead of noise, which is the only reason it was found.

**The repair is one line and it belongs in `put`, not `tick`:**

```js
put(controller, value, { end = false } = {}) {
  stats.offered++;
  const c = controller | 0;
  if (pending.has(c)) stats.thinned++;     // a value overtaken before it was sent
  pending.set(c, { v: clamp7(value), end, isSwitch: SWITCHES.has(c) });
}
```

Then `sent + thinned = offered` up to whatever is still pending, which is what
the sentence on the page has always claimed. **`cc-send-test.mjs` gains a
conservation check and a negative control**: run the gate with `tick` called ten
times per `put` and assert `thinned` is unchanged. Today that check reads 88 and
after the repair it reads 11, so it is a check that can fail.

### 6.3 Should an automated slider count as `skipped`? Yes, and the page says so in words

Three candidate answers were considered:

- **Offer at the gate's rate instead of the frame rate.** Rejected. It means the
  slider knows what a page does with `onInput`, which it must not, and a hand
  gated at the source can never demonstrate the gate, which is `/knobs/`'s
  entire subject.
- **A separate counter, so `skipped` stays about fingers.** Rejected. It needs a
  seventh readout cell and `mount()` throws on an odd count, and there is no weak
  cell to drop: all six move.
- **The hand drives `onInput` and `onChange` exactly as a pointer does, and the
  page tells the truth about who is moving.** Taken. After §6.2's repair an
  invisible hand at 60 Hz contributes about 11 a second to `skipped`, which is a
  true statement about a hand that really is making 61 moves of which 50 go out.

So **the readout does not change and the `what` paragraph does**, in the same
commit, per CLAUDE.md. One clause: `skipped is what a hand made, yours or the
page's, that the gate did not send`. Plus a log line when the state changes,
which is the channel CLAUDE.md names for a state change, and which is the only
channel that survives a screenshot taken a minute later.

### 6.4 🔴 The three promises, and how each is graded

The removal at `a7c733c` is the bar. Each promise gets a mechanism and a check.

**A. UNMISTAKABLE WHEN IT IS ON.** Three channels, each answering a different
question, because one channel is what failed last time:

| channel | answers | visible when |
|---|---|---|
| the side button is lit, `data-hand="on"` | *is this slider automated?* | always, including at rest |
| the handle is drawn hollow, not solid `--hi` | *is this handle being moved by the page?* | on the thing that is moving |
| one log line when it changes | *when did this start?* | afterwards, in a screenshot |

⚠️ The hollow handle is a state, not a colour meaning: this project spends colour
on HOW SOMETHING LANDED and reserves `--hi` for the thing that moves. Dropping
the fill and keeping the edge says "nobody is holding this" without inventing a
seventh meaning for yellow.
Graded: the page's own check reads `data-hand`, reads the computed background of
`.sld-knob` and asserts it differs from the un-automated slider beside it, and
asserts the log line exists. Two sliders on `/knobs/` is what makes that a real
comparison rather than a claim about one element.

**B. PER SLIDER.** Every `createSlider` owns its own hand and its own button.
Graded: turn one on, assert the other's value is unchanged after two seconds and
that its `data-hand` reads `off`. **That check is a negative control**: it fails
if the hand is a module-level singleton, which is the obvious way to write this.

**C. A HAND TAKES IT BACK IN ONE FRAME.** There are **three** paths a person can
move a slider by and all three must interrupt:

1. `pointerdown` on the lane. Already calls `endGlide(false)`; it gains
   `hand.yield()`.
2. The keyboard. The lane is `tabindex="0"` and arrows call `set()`. Without a
   yield the value snaps back within 16 ms and the arrow keys look broken.
3. `set()` called by the PAGE, for instance `/knobs/`'s panic bringing both
   sliders home to 64.

🔴 **So the rule is: `set()` is a person or a page, and the hand is neither.** The
hand writes through a private `paint`-and-emit path that shares `clamp()`, and
every call to the public `set()` yields the hand. That single rule covers all
three paths and cannot be forgotten for one of them.

⚠️ **Yield, not off.** The hand resumes from wherever the pointer left it when
the pointer lifts, because a motorised fader you can grab is the physical thing
the phrase "invisible hand" names, and because the button said ON and nothing
pressed it. Graded: drive a real pointer down, move, up, then assert the value
equals where the pointer put it and that it has moved again 200 ms later.

### 6.5 The harness cannot press this button, and that is fine

`verify.mjs` presses `.pos-controls button, .tbar-x`. A slider's hand button is
in neither, exactly like the slider itself, whose header already says *"a page
that ships a slider and asserts nothing about it has an ungraded control"*. So:

- the shape claim is graded by `node demo/shell/hand-test.mjs` (§5);
- the plumbing claims are graded by the page's own `?selfcheck=1`, which calls
  `slider.hand.on()` directly;
- `/kit/` shows it and, as CLAUDE.md records, `/kit/` is not machine-graded at
  all.

🔴 **AND THE BUTTON MUST NEVER LAND INSIDE `.pos-controls`. THIS IS LIVE, NOT
THEORETICAL, AND I ALMOST WROTE THE OPPOSITE.** The first draft of this section
said no page puts a slider in the control row, on the strength of checking every
page's `controls:` array. That array is not the only way in, and **two pages build
their own `.pos-controls` and put sliders in it**:

- `demo/draw/index.html:990`, `el('div', 'pos-controls foot')` then
  `row.append(knobs.el)`, a two-slider group;
- `demo/grains/index.html:1140`, `el('div', 'pos-controls fade')` then
  `fadeBar.append(..., fade.el, ...)`, plus `srcBar` holding `brightness.el`.

`verify.mjs` presses `.pos-controls button` on every demo on every run, dozens of
times a day. A hand button in `/knobs/`'s control row would start an invisible
hand sending 50 messages a second to a shared Raspberry Pi on every one of them.
`/knobs/` is safe today because its `controls: []` is empty and its sliders are
appended to the body, but `/draw/` and `/grains/` are one `hand: true` away.

So the rule is stated in the component and checked on the page: **a slider with a
hand does not live in `.pos-controls`**, and any page that turns one on asserts
`!d.el.querySelector('.pos-controls .sld-hand')`. It fails in the log rather than
on the board.

⚠️ AND IT DOES NOT MOVE ANY OTHER CONTROL'S PRESS, for the same reason: it is not
in the selector. The `settleMs` hazard CLAUDE.md records, where adding one button
moved a check from t+1 s to t+31 s, is only a hazard for buttons the harness
presses. Re-run `node demo/verify.mjs knobs` and diff the assert count anyway.

### 6.6 🔴 What it must never do

An invisible hand on `/knobs/` is **50 messages a second to shared hardware in
another building, for as long as it is on, whether or not anybody is listening**.
That is a bigger commitment than any control this page has had. Five guards:

1. **Never on load.** The button is a press, and the default is off, on every page
   and forever.
2. **Off when the transport stops.** `panic()` releases every note and glides both
   sliders home. A hand still running would fight that glide, which is a page
   arguing with itself in front of somebody. `pause` turns both hands off and the
   log says so.
3. **Off when the tab is hidden.** `visibilitychange` stops it. A forgotten tab on
   a second monitor is precisely the `/tapes/` and `/videoradio/` failure in a new
   costume.
4. **A ceiling.** It stops itself after **10 minutes** and says so in the log, the
   way `transport-bar.mjs` says *"a live loop needs a ceiling or it is a recording
   with no end"*. 10 minutes is about 30,000 messages, which is long enough to
   demonstrate anything on this page and short enough that a walk-away costs
   nothing. The number is open to argument; its absence is not.
5. **Never under a self-check for a visitor.** It is behind `?selfcheck=1` like
   everything else, and `/knobs/`'s `MAY_PLAY` gate already keeps the harness off
   the board.

---

## 7. Build order

Each step is shippable and gradable on its own, and the first one touches nothing
a visitor can see.

**1. `demo/shell/hand.mjs` + `demo/shell/hand-test.mjs`. No DOM, no page.**
The `MOVES` table, `plan()`, `positionAt()`, and the §5.3 metric as a test
helper. Roughly 18 asserts: four shape claims on the bare profiles with their
exact constants, four on the hand, the three negative controls, the sabotage, and
four seeds. `node demo/shell/hand-test.mjs` is the whole grade.
🔴 **This is the step that decides whether "human feel" is real, before one pixel
moves.** If the numbers do not come out as §5.3 predicts, the plan is wrong and
nothing has shipped.

**2. `makeCcSend.thinned` counts overwrites, not ticks.** One line in
`cc-adapter.mjs`, plus a conservation check and its negative control in
`cc-send-test.mjs`. Independent of everything else, graded by node, and it fixes
a number that is wrong today for a real finger.

**3. `.pos-seg`.** Six rules out of `.tbar-loopgrp` and `.step` into one class,
both keeping every specific rule. ⚠️ **This is the one step with no automated
grade**: the suite cannot see that a border looks the same. Photograph `/radio/`,
`/replay/` and `/kit/` before and after, and say in the report that this is what
was done instead of a check.

**4. `createSlider({ hand: true })`.** The button, the wrapper row, the frame
loop, the yield on all three paths, the hollow handle, the coarse-slider warning.
⚠️ **The wrapper exists ONLY when `hand: true`**, so every existing page keeps a
byte-identical DOM. That matters concretely: `demo/grains/index.html:72` and `:75` select
`.fade > .sld > .sld-lane` and `.fade > .sld > .sld-head` with a CHILD combinator,
and an unconditional wrapper would stop both matching, silently, taking that
slider's lane back to its standalone 96 px. Found by reading, not by shipping;
it is exactly the *"a component swap moves every selector that named the old
one"* lesson. Add it to `/kit/` in the same commit.

**5. `/knobs/` turns it on.** One button per slider, the `what` paragraph
rewritten in the same commit, the log line, and the five guards of §6.6. Re-run
`node demo/verify.mjs knobs` with no board and diff the assert count.

**6. A second preset.** A slower, less regular drift. It exists to prove §3.3:
one row in `MOVES`, one glyph, one sentence, one index in `MOVE_TURN`, and the
button becomes a three-way cycle with no new control. If step 6 costs more than
that, step 1 got the data shape wrong.

---

## 8. What was verified by reading, and what is judgement

**Read in the code, and quoted from it:**

- `createSlider`'s structure, `set(v, {quiet, glideMs})`, `onInput` on every move
  and `onChange` on release, `GLIDE_MS = 900`, the ease-out-quint in `glide()`,
  `paint()` never letting `aria-*` carry the drawn value, `pointerdown` already
  calling `endGlide(false)`, and `clamp()`'s two branches.
- `.tbar-loopgrp`'s six join rules and the three photographed border reports;
  `.step` and `.pos-pick-cell` carrying the same join a second and third time;
  `.sld-lane` using an inset shadow because a border shortens the handle's travel
  by a pixel at each end.
- `.sld-group`'s two columns, `display: contents`, and the pair mode's
  `:nth-child(even)` seam padding with its note that nothing may span a column.
- `demo/grains/index.html:72` and `:75` selecting slider internals with a CHILD
  combinator. This is the concrete casualty of an unconditional wrapper.
- `verify.mjs`'s press selector `.pos-controls button, .tbar-x`, its `settleMs`
  landing on control 0 only, and its `[data-gesture]` Lissajous driver.
- `/knobs/` in full: the empty `controls: []`, `live: true`, `scrub: false`,
  `loop: false`, `endStop: false`, `MAY_PLAY`, the six readout cells, `panic()`,
  and `pump()` on a 10 ms interval.
- `a7c733c`'s commit message, which is where the removed gesture recorder and the
  user's exact complaint are recorded.
- `looper.mjs`'s `LOOP_WAYS` / `LOOP_TURN` / `WAY_GLYPH` / `WAY_SAYS` shape and
  `looper-test.mjs`'s 18 asserts with four negative controls.
- `/draw/`'s three measured claims and `BACKLOG.md`'s entry refuting two of them.

**Measured by running code during this planning, not reasoned about:**

- Every crest, peak, turn and spread figure in §5.2, §5.3, §5.4 and §5.5. The
  four bare profiles were integrated at 2000 points; the nine cases were planned
  and sampled at 24 to 120 Hz over 10 laps and four seeds.
- **The first metric's failure**, NC1 reading 1.708 where the truth is 1.000.
- **The quantisation collapse**, every case reading crest 1.000 through a 128-step
  slider, and the windowed derivative failing to separate the sabotage.
- §6.1's gate table, produced by importing the real `makeCcSend` and driving it
  with `/knobs/`'s real pump pattern.

**Judgement, not measurement:**

- That Beta(3,4) with peak speed at 0.400 is what a hand looks like. The
  asymmetric bell is the standard account of an aimed movement and the exact
  exponents are a choice. What IS measured is that it is not a sine and not a
  triangle. Nobody has watched this yet.
- Every default in §3.1: `lapMs` 2200, `turnMs` 130, `endJit` 0.030, `timeJit`
  0.120, `over` 0.022, `wobble` 0.050. They produce the table in §5.3 and they
  are otherwise a guess that wants an eye on it.
- The `↝` glyph. The only defended part is that it must not be `⇆`.
- Yield-and-resume rather than yield-and-off (§6.4 C).
- The 10 minute ceiling (§6.6.4) and the roughly 34 step floor (§5.4). The floor's
  arithmetic is sound; whether the component should warn or refuse is a choice.
- That `.pos-seg` should absorb `.step` as well as `.tbar-loopgrp`. Leaving
  `.step` alone is defensible and halves step 3's risk.

**Not done, on instruction:** nothing was implemented, no component changed, no
manifest row added, nothing staged, nothing committed, nothing deployed. ⚠️ The
ask is NOT yet in `BACKLOG.md`; CLAUDE.md says a request goes in there before it
is worked on, and adding it is the first thing the session that picks this up
should do.
