# Kit lessons: hand

The longer comments cut from `demo/shell/hand.mjs` and `demo/shell/hand-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-hand.md#<anchor>`.

<a id="header"></a>

## `hand.mjs` module header

```text
demo/shell/hand.mjs — what a hand does to a slider, written as numbers.

🔴 NO DOM IN HERE, AND THAT IS THE WHOLE REASON IT IS A FILE. `plan()` turns
a movement preset into a list of legs and `positionAt()` reads a position out
of that list. Both are pure, so `hand-test.mjs` can sample a movement at any
rate, in order, with no browser and no clock, which is the only way the claim
this module makes can be graded at all.

🔴 AND THE CLAIM CANNOT BE GRADED THROUGH A SLIDER. MEASURED: sample the same
movement through a `0..127 step 1` lane, which is exactly what `/knobs/` has,
and every case collapses to a crest factor of 1.000. The hand, a sine and a
triangle read alike. A quantised curve is a staircase, so a per sample derivative
sees a flat run and then a jump, and every run is one sample long. The
generator emits a real number in 0..1 and the slider rounds it; this file is
graded on the number, never on the handle.

The precedent is `looper.mjs`, which keeps `ringOrder`, `planVoice` and
`headOf` pure for the same stated reason: every bug that module ever had
lived in one of those three. Everything interesting about an invisible hand
is a curve, and a curve is the thing a browser is worst at grading.

⚠️ `xr-hands.mjs` IS A DIFFERENT SUBJECT. That one is about a headset's
tracked hands and is prefixed; this one is the user's own word for a slider
that moves by itself. The two do not read as variants of each other.
```

<a id="moves"></a>

## `hand.mjs` MOVES

```text
🔴 A MOVEMENT IS TEN NUMBERS AND A NAME, WHICH IS WHAT MAKES A CUSTOM ONE
FREE. The parameters ARE the format: a movement nobody named is the same
object with no name, handed straight to the slider. A second preset costs one
row here, one glyph, one sentence and one index in `MOVE_TURN`.
```

<a id="lapms"></a>

## `hand.mjs` MOVES lapMs

```text
🔴 SLOWED TWICE, BY TWO DIFFERENT ASKS, AND BOTH ARE KEPT HERE BECAUSE
THE DIRECTION IS THE FINDING. It was **2200 ms**, which is a hand
demonstrating a slider rather than a hand playing one: at that rate a
filter sweep is a gesture you watch, and what this is for is a sound that
changes under you while you listen to it. *"way slower"*, 2026-09-16,
took it to **7000**, about a breath and a half each way. *"reduce
invisible hand speed 2x"*, 2026-09-22, halves the speed again to
**14000**, which is a slow breath in and a slow breath out.
⚠️ NOBODY HAS EVER ASKED FOR IT TO GO FASTER. Two asks, both one
direction, an order of magnitude between the first value and this one.
⚠️ THE SHAPE IS UNAFFECTED AND SO IS ITS MEASUREMENT. Every number in
`hand-test.mjs` is a ratio or a fraction of a lap, and the test asserts
rate invariance across 24 to 120 Hz for the same reason: a slower lap is
the same curve read at a different speed. MEASURED after this change:
23 ok, 0 failed, not one number in it moved.
⚠️ AND A PAGE THAT WAITS OUT A LAP READS IT FROM HERE. `/knobs/` does
`MOVES.find(([name]) => name === 'sweep')[1].lapMs` and THROWS if it is
missing, so its self-check re-sizes its own wait rather than carrying a
number that would now be half a lap short.
```

<a id="move-turn"></a>

## `hand.mjs` MOVE_TURN

```text
🔴 THE PRESETS THE BUTTON CYCLES, IN THE ORDER IT CYCLES THEM, AND IT IS A
SEPARATE LIST ON PURPOSE. Copied from `LOOP_TURN`, whose comment says the
same thing: a preset can exist, be graded, and not yet be on the button.
Today this has one member, so a press goes off, sweep, off, which is the on
and off that was asked for. With two members it is off, sweep, drift, off,
and that is one array edit rather than a new control.
```

<a id="move-glyph"></a>

## `hand.mjs` MOVE_GLYPH

```text
The face of the button for each movement.

⚠️ A GLYPH IS THE STATE, NOT THE NEXT PRESS, which is what `WAY_GLYPH`
already does for the loop.
🔴 AND IT IS NOT `⇆`. That glyph already means "the loop plays there and
back" on `/archive/radio/` and `/replay/`, and one picture meaning two things is one
picture: whichever a reader learns first is the one they will read.
```

<a id="glyph-sweep"></a>

## `hand.mjs` MOVE_GLYPH sweep

```text
⇄, asked for 2026-09-16. `↝` was a squiggle nobody could name; two arrows
pointing opposite ways is what a sweep back and forth IS, and it is the same
family as the looper's own → ← ⇆ without being any of them.
```

<a id="bare"></a>

## `hand.mjs` BARE

```text
Everything except the shape switched off: no wander in the ends, no wander in
the tempo, no overshoot, no correction, no pause, no speed variation.

It exists so the test can ask what a profile does ON ITS OWN. A metric that
needs the noise to see the shape is a metric that is reading the noise, and
that is one of the three negative controls `hand-test.mjs` runs.
```

<a id="defaults"></a>

## `hand.mjs` DEFAULTS

```text
⚠️ THE SAME NUMBERS A SECOND TIME, AND `lapMs` HAS TO MOVE IN BOTH. A preset
given to `plan()` with fields left out falls back here, so a `DEFAULTS` that
disagreed with `MOVES[0]` would give a partial preset a different speed from
the button's.
```

<a id="minsteps"></a>

## `hand.mjs` minSteps

```text
🔴 THE COARSEST LANE THAT CAN SHOW A HAND, AND IT IS ARITHMETIC RATHER THAN
TASTE. The ends wander by `endJit` of the travel, so on a lane of N steps that
wander is `endJit * N` steps. Below one step it rounds away and every lap
turns at the same number, which is a staircase wearing a hand's clothes.
MEASURED at 8 steps: the ends still read as distinct and the crest factor
reads 1.000, so the page would look right and measure like a machine.
```

<a id="rng"></a>

## `hand.mjs` rng

```text
mulberry32. Small, seeded and repeatable, which is what lets four seeds be a
measurement rather than an anecdote.
```

<a id="betay"></a>

## `hand.mjs` betaY

```text
The position along one reach, as a share of it, for a speed profile of
`Beta(a, b)`: speed goes as `t^(a-1) (1-t)^(b-1)`, and this is its integral
normalised so `y(0) = 0` and `y(1) = 1`. For whole `a` and `b` that integral
is a polynomial, so there is nothing transcendental in the hot path:

  1, 1   t                                a triangle wave. Constant speed
  3, 3   10t³ - 15t⁴ + 6t⁵                minimum jerk, the standard aimed reach
  3, 4   20t³ - 45t⁴ + 36t⁵ - 10t⁶        the hand

🔴 THE ONE NUMBER THAT MAKES IT A HAND RATHER THAN A MACHINE IS `a < b`.
Minimum jerk is symmetric: it accelerates exactly as gently as it decelerates
and its peak speed sits at 0.500. A real aimed movement is asymmetric because
the second half of it is under visual feedback and the first half is not.
Beta(3,4) puts peak speed at `(a-1)/(a+b-2)`, which is 0.400. Setting `b = a`
is the sabotage `hand-test.mjs` runs, and it is caught by exactly one check.
```

<a id="warp"></a>

## `hand.mjs` warp

```text
Speed micro-variation, applied by WARPING TIME rather than by moving the
value.

⚠️ `sin(π m t)` IS EXACTLY ZERO AT BOTH ENDS for whole `m`, so this cannot
move an endpoint. Where a reach stops is `endJit`'s job and only `endJit`'s
job, which is what lets the test grade shape and variety separately instead
of having one number stand for both.
⚠️ AND IT STAYS MONOTONE while `amp * π * HARMONICS < 1`. At 0.05 and two
harmonics that is 0.314, with a wide margin. A warp that goes backwards is a
handle that reverses in the middle of a reach, which reads as a glitch rather
than as a hand.
```

<a id="plan"></a>

## `hand.mjs` plan

```text
Turn a movement into a list of legs.

🔴 A LIST, NOT A CLOSURE OVER A CLOCK, FOR TWO REASONS. It is a VALUE, so the
test can sample it at 24 Hz and at 120 Hz and compare; and every leg says what
KIND it is, which is what makes the measurement possible to state honestly.
The first metric tried on this failed because it measured a whole lap at once
and so let a pause at the end make a triangle look like a hand.

One lap is three legs:

  reach   (1 - settle) of the lap   to the target, plus the overshoot
  settle  settle of the lap         Beta(3,3) back to the target
  turn    turnMs                    held still

@param preset one row of `MOVES`, or the same ten numbers with no name
@param [o.lo] [o.hi]  the window in 0..1 the movement may use
@param [o.seed]  fixed for the test; advanced by the page when a plan runs out
@param [o.laps]  how many reaches
@param [o.from]  where to pick up, for a plan that follows another
```

<a id="endat"></a>

## `hand.mjs` plan endAt

```text
⚠️ AN END IS INSET BY THE OVERSHOOT BEFORE IT WANDERS, so the furthest the
handle ever goes is the end of the lane and never past it. Clamping the
overshoot instead would flatten the very thing being measured, and flatten
it only on the laps that wandered least.
```

<a id="settle"></a>

## `hand.mjs` plan settle leg

```text
⚠️ SYMMETRIC ON PURPOSE. A corrective submovement is small, slow and
entirely under visual feedback, which is the one case minimum jerk
really does describe.
```

<a id="positionat"></a>

## `hand.mjs` positionAt

```text
Where the handle is at `tMs` into a plan, as a share of the lane, 0 to 1.

⚠️ A FUNCTION OF THE CLOCK, NEVER AN ACCUMULATION PER FRAME. A dropped frame
then costs a skipped sample and never a drifted phase, which is what lets the
same movement measure the same at 24 Hz and at 120 Hz.
```

<a id="test-header"></a>

## `hand-test.mjs` hand-test module header

```text
demo/shell/hand-test.mjs — is the invisible hand a hand, with nobody in the room.

  node demo/shell/hand-test.mjs

🔴 THE FIRST METRIC TRIED ON THIS FAILED ITS OWN NEGATIVE CONTROL, AND THAT
FAILURE IS WHY THIS FILE IS SHAPED THE WAY IT IS. The obvious measurement is
a whole lap: normalise time by the lap and value by the travel, take the peak
speed over the mean speed, and compare against a triangle's 1.000 and a
sine's 1.571. Fed a TRIANGLE carrying the hand's endpoint wander, tempo
wander, overshoot and pause, that metric read 1.708 against a true 1.000. It
was measuring dwell and overshoot rather than shape, because a whole lap
window swallows both, and on it a triangle with a pause on the end would have
shipped as a hand.

The repair is to SEGMENT FIRST AND MEASURE SECOND, in three windows that
cannot borrow evidence from each other:

  shape    on the reaches only, each normalised by its OWN time and travel
  turn     the milliseconds between one reach and the next
  variety  the values it turns at, and how long each lap took

🔴 AND IT GRADES THE GENERATOR, NEVER A SLIDER. Sampled through a 0..127 lane
every case reads crest 1.000, because a quantised curve is a staircase. See
the header of `hand.mjs`; the collapse is reproduced as a check below.

FOUR OF THESE ARE NEGATIVE CONTROLS AND ONE IS A SABOTAGE. NC1 must FAIL, NC2
must PASS, NC3 must FAIL, the quantised stream must collapse, and setting
`b = a` must be caught by exactly ONE of the five thresholds.
```

<a id="distinct"></a>

## `hand-test.mjs` distinct ends

```text
⚠️ SIX DECIMALS, AND THE RESOLUTION IS LOAD-BEARING IN BOTH DIRECTIONS. At
four it reports collisions that are not there: five wandering ends share a
3% range, so two of them landing within 1/10000 of each other is ordinary
and reads as a sweep that turned twice at one place. At full float
precision it reports differences that are not there either, because the
last bits of an accumulated sample time differ from lap to lap. Six sits
between: a bare sweep's ends agree to better than 1e-7, and a wandering
one's disagree by about 6e-3.
```

<a id="t3"></a>

## `hand-test.mjs` test 3: constants

```text
3. The four constants the whole plan rests on, integrated at 2000 points the
   way the plan says they were. A triangle is 1.000, a sine is π/2, minimum
   jerk is 1.875 and it peaks in the MIDDLE, and the hand is 2.074 and peaks
   at 0.400. That last pair is the entire claim about human feel.
```

<a id="t4"></a>

## `hand-test.mjs` test 4: wobble

```text
4. NEGATIVE CONTROL ON THE WOBBLE. It warps time, so it must not be able to
   move an end. If it could, `endJit` and `wobble` would both be moving the
   turning values and the variety window could not be graded on its own.
```

<a id="t7"></a>

## `hand-test.mjs` test 7: NC1

```text
7. NC1, THE DRIFT DECOY, AND IT IS THE ONE THAT KILLED THE FIRST METRIC. A
   triangle carrying every wander the hand has. If it passes, the metric is
   reading drift rather than shape.
```

<a id="t8"></a>

## `hand-test.mjs` test 8: NC2

```text
8. NC2, THE SHAPE DECOY. The hand with every wander switched OFF has to pass
   the two shape claims. If it fails, the metric needs the noise to see the
   shape, which means it is reading noise.
```

<a id="t9"></a>

## `hand-test.mjs` test 9: NC3

```text
9. NC3, THE SINE DECOY: the thing the ask explicitly does not want. It fails
   both shape claims while passing every turn and variety claim, and that
   separation is the proof the claims are independent of each other.
```

<a id="t10"></a>

## `hand-test.mjs` test 10: sabotage

```text
10. THE SABOTAGE. `b = a` makes the profile symmetric minimum jerk, which is a
    machine rather than a hand. It must be caught, and it must be caught by
    EXACTLY ONE check: a sabotage that takes everything red is a test with one
    assert wearing five names.
```

<a id="asymmetry"></a>

## `hand-test.mjs` asymmetry threshold

```text
⚠️ THE ASYMMETRY THRESHOLD IS THE NARROWEST ONE ON THIS PAGE AND THE TEST
SAYS SO RATHER THAN PASSING QUIETLY. The hand sits below 0.470 and the
sabotage above it on every seed, which is what makes 0.470 a threshold, and
the gap on the sabotage's side is a few hundredths rather than a tenth.
```

<a id="t13"></a>

## `hand-test.mjs` test 13: quantisation

```text
13. 🔴 THE QUANTISATION COLLAPSE, WHICH IS WHY THIS FILE GRADES A NUMBER AND
    NOT A HANDLE. Through `/knobs/`'s own 0..127 lane the hand and a triangle
    read the same, so a check written against the slider would have shipped
    anything at all.
```

<a id="verdict"></a>

## `hand-test.mjs` quantisation verdict

```text
⚠️ THE CLAIM IS THAT THE LANE CANNOT TELL THEM APART, AND SAYING THAT AS A
DISTANCE WAS WRONG. This read `the separation collapses` and compared the
two crest numbers, which went red the moment the lap got slower: at 7 s a
lane-read triangle yields NO measurable reach at all, so its crest is 0 and
the distance to the hand is as wide as it was in the air while meaning the
opposite. The quantity in question is the VERDICT, not the gap between two
numbers, so that is what is asserted: in the air the metric says hand and
says not-a-hand, and through the lane it says not-a-hand about both.
```

<a id="coarse"></a>

## `hand-test.mjs` coarse lane variety

```text
⚠️ AND THE VARIETY WINDOW GOES ON READING AS IF ALL WERE WELL, which is the
trap: nine distinct ends on a staircase with no reach left in it. A page
that graded only variety would call this a hand.
```
