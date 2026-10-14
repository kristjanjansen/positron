# Kit lessons: slider.mjs

The long comments cut from `demo/shell/slider.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-slider.md#<anchor>`.

<a id="header"></a>

## slider.mjs, file header

demo/shell/slider.mjs — a value you can drag, the same height as a button.

⚠️ IT MATCHES THE BUTTON, and that is the whole brief. Controls in this
project sit in one flex row — `.pos-controls` — so anything that is not 34 px
tall makes the row grow and pushes everything else off its baseline. The
lane and the thing that moves along it are the SAME height as each other and
as a button, with the same 4 px corner, so a row of buttons and sliders reads
as one row of controls rather than as two kinds of thing.

⚠️ AND THE HANDLE SITS FLUSH IN THE CORNERS. It travels
`laneWidth - handleWidth`, never the full width — so at the minimum its left
edge is the lane's left edge and at the maximum its right edge is the lane's
right edge. A handle centred on the value instead hangs half out of the lane
at both ends, which reads as a bug in the layout and makes the extremes
impossible to hit.

🔴 `verify.mjs` CANNOT DRAG THIS. It presses `.pos-controls button, .tbar-x`
with `element.click()`, which fires `click` and nothing else — MEASURED, and
the reason `demo/verify-quest.mjs` exists. So a page that ships a slider and
asserts nothing about it has an ungraded control. `set()` is exported for
exactly that: drive it from the page's own check and assert on the value that
came out, not on the pixel that moved.

<a id="hand-reexport"></a>

## slider.mjs, HAND_MAX_MS and HAND_YIELD_MS re-export

🔴 THE TWO CEILINGS MOVED TO `hand-drive.mjs` ON 2026-09-22 AND ARE
RE-EXPORTED HERE UNCHANGED. `/archive/radio/`, `/kit/` and `/knobs/` import
`HAND_YIELD_MS` from this module, and `/archive/radio/`'s comment says in as many
words that it is imported RATHER THAN TYPED, so a moved export would be three
broken pages in exchange for a tidier import list.

<a id="glide-ms"></a>

## slider.mjs, GLIDE_MS

How long a glide takes. ONE number, because a knob and the sound it stands
for must not move at different speeds — a page that ramps its engine over a
quarter second while the knob snaps is two controls wearing one label.
🔴 SLOW, AND SLOWER THAN FEELS RIGHT WHEN YOU WRITE IT. Asked for: "way
slower and humanlike easing". 250 ms is the reflex-fast default every UI
library ships and it reads as a SNAP with a blur on it — the knob is at the
new value before the eye has found it, so what you perceive is a jump, and
the animation has bought nothing. 900 ms is long enough to be FOLLOWED: the
eye tracks the knob across the lane, which is the only thing a moving control
can tell you that a jumping one cannot — WHERE IT CAME FROM.

⚠️ THIS IS A DRAWING, NOT THE VALUE. The number is committed immediately and
everything downstream — the sound, the readout, `aria-valuenow` — already
uses it; only the handle is still travelling. So a longer glide cannot make
anything late, which is the property that makes 900 ms affordable at all.
⚠️ And `prefers-reduced-motion` skips it entirely, which matters more the
longer it gets.

<a id="glide"></a>

## slider.mjs, glide()

Call `onFrame(k)` with k running 0 -> 1 over `ms`, eased, and exactly once
at 1. Returns `stop(finish)`: `stop()` leaves the glide where it is,
`stop(true)` jumps it to the end.

⚠️ IT ALWAYS LANDS, and rAF alone cannot promise that. A background tab
stops animation frames, so an rAF-only glide can halt half way — which for a
knob is a cosmetic stall and for a sound is a granulator stuck between two
patches with nothing on screen saying so. A timer just past the end finishes
it; timers are throttled in a background tab but they do still fire.

The shape is smoothstep: it leaves and arrives at rest, so the start and the
end of the move are the two places nothing jerks.

<a id="glide-ease"></a>

## slider.mjs, glide(), the easing

HUMANLIKE, WHICH IS NOT SYMMETRIC. Smoothstep (`t²(3−2t)`) leaves and
arrives at rest with the same shape at both ends, and over 900 ms that
reads as machinery: a hand does not accelerate as gently as it decelerates.
This is the standard ease-out-quint — off quickly, then a long settle —
which is what a thrown-then-caught object does and what every physical
control you have ever used does.

<a id="slider-group"></a>

## slider.mjs, createSliderGroup()

Several sliders stacked, sharing one set of columns.

🔴 A STACK IS NOT FOUR SLIDERS IN A DIV, and `grains` proved it: it appended
them to `el('div', 'knobs')`, a class with **no CSS anywhere** — so they fell
into block layout, touching, and every lane started at a different x because
a wider label pushes its own lane right. `SPRAY` is two characters longer
than `RATE`, so two lanes were indented and two were not, on a control whose
entire job is comparing four values at a glance. That is the second class in
one day that a component emitted and no stylesheet matched.

The columns are shared, which is the only thing that can align them: one
`max-content` column for the labels, one `1fr` for the lanes so they take the
width that is actually there, one `max-content` for the values. Each slider
becomes `display: contents` so its three parts land in those columns rather
than in a box of its own.
@param sliders
@param [opt.pair]  two sliders ACROSS on a wide screen rather than stacked.
 Side by side there is nothing to line up; stacked there is everything, so
 it falls back to the stacked three columns below the breakpoint and the
 shared-column argument still holds where it applies.

<a id="create-slider"></a>

## slider.mjs, createSlider() parameters

@param {object} o
@param {string} o.label     shown before the lane, uppercased by CSS
@param {string} [o.sub]      a second, dimmer label under the first. Asked for
 2026-09-20: *"let us have primary and secondary label on knobs and sliders
 (h and w)"*, so all three controls carry the same pair.
 🔴 **WHAT EACH ONE IS FOR, BECAUSE TWO LABELS THAT SAY THE SAME THING ARE
 WORSE THAN ONE.** The primary names what the control MOVES, in the reader's
 words: `cutoff`, `rate`, `CH1`. The secondary names what it IS on the
 wire: `CC 74`, `PB 1`. A controller number is the fact somebody needs when
 a knob does not do what its name says, and this project has already paid
 for that once on Yoshimi, where CC 76 and 77 are FM amplitude and resonance
 centre rather than the vibrato the standard map promises.
 ⚠️ OMIT IT AND NOTHING IS DRAWN. No empty element, no reserved line.
@param {number} o.min
@param {number} o.max
@param {number} [o.step]    rounding applied to every value, default (max-min)/100
@param {number} [o.value]   where it starts, default min
@param {string} [o.unit]    printed after the number: 'ms', 'Hz', '%'
@param {number} [o.digits]  decimal places, default inferred from step
@param {(v:number)=>void} [o.onInput]   every move — cheap things only
@param {(v:number)=>void} [o.onChange]  on release, and on a keyboard step
@returns {{el:HTMLElement, get:()=>number,
 set:(v:number, opt?:boolean|{quiet?:boolean, glideMs?:number})=>number,
 label:(text:string)=>void,
 disabled:(v:boolean)=>void}}
@param [o.warp] `'exp'` for a logarithmic lane. Default linear, unchanged.

🔴 WHY A LINEAR LANE HIDES THE INTERESTING HALF OF A RANGE, MEASURED.
`/archive/radio/` granulates a radio station and every setting sounded like the
same wash. The upstream norns script this engine came from declares grain
rate `0.1-100 Hz EXPONENTIAL` and grain length `0.002-8 beats EXPONENTIAL`;
this page exposed `0.5-40` and `0.01-1` LINEAR. So the top of the engine was
unreachable, and worse, half the travel sat between 0.5 s and 1 s where
nothing audibly changes — while 2 ms to 50 ms, which is where a granulator
stops being a delay and starts being a texture, was squeezed into the first
two percent of the lane.

A perceptual quantity wants a perceptual lane: each step of the hand is a
constant RATIO rather than a constant amount, which is how pitch, level and
time are actually heard.

⚠️ `min` MUST BE ABOVE ZERO — a ratio lane cannot reach zero, by construction.
It throws rather than quietly producing NaN for every position, because a
lane whose knob is at `NaN%` renders at the far left and looks like a slider
sitting at its minimum.
@param [o.hand]  `true` for an invisible hand on this slider: one button on
 the right of the lane that cycles the movement presets, off first. Pass an
 object to hand it a movement of its own: `{ preset }` is the same ten
 numbers `MOVES` holds, with no name.

🔴 THE WRAPPER EXISTS ONLY WHEN A HAND IS ASKED FOR, AND THAT IS NOT TIDINESS.
`/grains/` selects `.fade > .sld > .sld-lane` and `.fade > .sld > .sld-head`
with a CHILD combinator, so an unconditional wrapper would stop both matching
and take that slider's lane silently back to its standalone 96 px. A
component swap moves every selector that named the old one.

🔴 AND A SLIDER WITH A HAND MUST NOT LIVE IN `.pos-controls`. `verify.mjs`
presses `.pos-controls button` on every demo on every run, dozens of times a
day, and `/draw/` and `/grains/` both build their own `.pos-controls` and put
sliders in it. A hand button in one of those rows would start fifty messages
a second to shared hardware on every suite run. A page that turns a hand on
asserts `!d.el.querySelector('.pos-controls .sld-hand')`.

@param [o.onHand]  called when the hand starts or stops, with
 `{ on, move, why, says, coarse }`, so the page can put a line in its log.
 A state change belongs in the log and nowhere else: it is the only channel
 that survives a screenshot taken a minute later.

@param {Array<string|Node>} [o.ends]  two names drawn INSIDE the lane, one at
 each end: the left source's at the left, the right source's at the right.
 For a crossfader. Asked 2026-10-12: *"have mode on slider to have labels on
 inside the rails (crossfader case)"*, then *"use when threre is xfader, add
 to kit too"*. A string is printed; a Node is moved in as it is, so a
 component whose name has another home on a phone (`local-remote.mjs`) can
 keep ONE element and move it.
 ⚠️ THE HANDLE IS PAINTED OVER A NAME AND HIDES IT, ON PURPOSE. Decided by
 the owner the same day: *"its ok to obsucre lael with handle"*. The handle
 sits at an end only when the fader is all that end, and then the handle is
 the reading; the other name is in full view, which is the one worth
 reading. No fade, no swap of ink, no second channel.
 ⚠️ THE NAMES TAKE NO ROOM AND NO POINTER: absolutely placed in the lane,
 `nowrap`, `pointer-events: none`, so the lane is the same box with or
 without them and a press on a name is a press on the lane.
 ⚠️ A SLIDER WITH ENDS FILLS ITS ROW (`.sld[data-ends]`), because a name
 inside a 96 px lane leaves nothing to drag through, and a crossfader is as
 wide as the thing it blends. With no `label` its head is not drawn either,
 which is the rule `/grains/` settled: two named ends need no third word.

<a id="exp-snap"></a>

## slider.mjs, clamp(), exponential lane

⚠️ AN EXPONENTIAL LANE IS NOT SNAPPED TO A FIXED STEP. A step of 0.01
across 0.002-4 would make the bottom two thirds of the lane unreachable —
every value below 0.01 snapping to the same place. It rounds to the
slider's decimals instead, so resolution follows the value.

<a id="label-pair"></a>

## slider.mjs, the label pair

🔴 THE PAIR IS ONE COLUMN, NOT TWO SIBLINGS IN THE ROW. A slider is a
three column grid and its group shares those columns across every row, so a
second label added beside the first would take a column of its own and
every slider in the group would move. Nested, the label column is exactly
as wide as it was.
⚠️ AND IT IS ONLY WRAPPED WHEN THERE IS A SECOND LINE, because `/grains/`
selects `.fade > .sld > .sld-lane` with a CHILD combinator and this
project has already lost a selector to an unconditional wrapper once.

<a id="aria"></a>

## slider.mjs, aria label

⚠️ `aria` FOR A SLIDER WITH NO VISIBLE LABEL. `grains`' blend sits
between two labelled ends — `this page` / `the board` — so a third word
between them is noise on screen and the only thing a screen reader has.
The two are different audiences with different needs, and collapsing them
means one of the two always loses.

<a id="widest-value"></a>

## slider.mjs, reserved value width

⚠️ RESERVE THE WIDEST VALUE, DO NOT LET IT JUMP. `0.5` and `12.40` are
different widths, so the number moved — and worse, so did everything to the
right of it — on every drag, which makes a value you are trying to read
while listening impossible to read. The width is computed from the widest
string this slider can ever show rather than guessed at: both ends, at this
slider's own decimal places, plus the unit. `ch` is exact here because the
face is monospaced and the cell is `tabular-nums`.

<a id="number-under-label"></a>

## slider.mjs, the head

🔴 THE NUMBER GOES UNDER ITS OWN LABEL, NOT ON THE FAR SIDE OF THE LANE.
Asked for, and it fixes a spacing complaint that was never about spacing.
A slider used to be THREE grid columns — label, lane, number — so a row of
two sliders was six evenly-spaced things and the eye could not tell where
one slider ended. Worse, the third column is as wide as the widest value
that slider can ever show, so the gap before the NEXT slider's label was a
different width on every row. PHOTOGRAPHED on /draw/: `SAMPLE EVERY` sat
tight against its lane while `100 ms` and `SMOOTHING` had a visibly larger
gap between them — the same `column-gap`, three different-looking spaces,
because one of the columns was sized by its content.

Stacked, a slider is TWO columns and the label column is as wide as the
wider of its two lines. The number is beside the word it belongs to, which
is this project's rule for every other figure it prints (a lane's numbers
go in that lane's gutter, never in a table somewhere else).

<a id="hand-row"></a>

## slider.mjs, the hand's button row

The hand's button, and the row that joins it to the lane.

⚠️ IT BORROWS THE LOOP PAIR'S LOOK AND WRITES NO CSS ABOUT JOINING.
`.pos-seg` is the six declarations that make two controls read as one
object, lifted out of `.tbar-loopgrp`, `.step` and `.pos-pick-cell`, which
had each written them separately.

<a id="paint"></a>

## slider.mjs, paint()

@param [at] the position to draw, default the real value.
⚠️ `aria-*` ALWAYS CARRIES `v`, NEVER `at`. A glide is a drawing; a screen
reader that was read eight intermediate numbers on a patch change would be
told about an animation nobody asked it to narrate, and the last one it
heard would be whatever frame it caught.

<a id="hand-yield"></a>

## slider.mjs, handYield and handPickUp

🔴 `set()` IS A PERSON OR A PAGE, AND THE HAND IS NEITHER. There are three
ways a person can move a slider and all three have to interrupt an
invisible hand: a pointer on the lane, an arrow key, and the page calling
`set()` itself (a patch landing, or `/knobs/`'s stop bringing both handles
home). The keyboard goes through `set()` and so does the page, so ONE rule
covers all three and cannot be forgotten for one of them: the hand writes
through a private paint-and-emit path that shares `clamp()`, and every call
to the public `set()` yields it.

⚠️ Assigned below rather than declared there, because `set` is defined
above the hand and the hand needs `clamp`, `paint` and `endGlide`.

<a id="set"></a>

## slider.mjs, set()

@param next
@param [opt]  `true` for the old quiet flag, or `{ quiet, glideMs }`.

🔴 THE VALUE LANDS AT ONCE, ONLY THE DRAWING GLIDES. `get()` answers with
the new number on the line after the call and the callbacks fire once, on
the same tick they always did — so a glide can never make a harness read a
stale value, and `verify.mjs`, which stops collecting 400 ms after the last
assert, never has to wait for one. What moves over `glideMs` is the handle
and the number under it: a patch that changes four settings shows four
handles travelling instead of redrawing the panel as if nothing happened.

⚠️ `quiet` still means exactly what it meant — no `onInput`, no `onChange`.
The glide is a separate opt-in, so every existing caller is unchanged.

<a id="paint-before-glide"></a>

## slider.mjs, set(), paint before the glide

⚠️ PAINT ONCE BEFORE THE GLIDE, AND THIS IS NOT COSMETIC. `glide()`
makes its first call inside an animation frame, so without this the
`aria-*` attributes carry the OLD value for one frame — MEASURED: a
probe reading `aria-valuenow` on the line after `set()` got the
previous patch's number, which is exactly the stale read this file's
header promises a harness will never see. `shown` is where the handle
already is, so this moves nothing.

<a id="pointer-capture"></a>

## slider.mjs, pointerdown, capture

⚠️ A POINTER THE BROWSER NEVER SAW CANNOT BE CAPTURED, AND THE THROW TOOK
THE WHOLE DRAG WITH IT. `setPointerCapture` raises `NotFoundError` for an
id that is not an active pointer, which is every synthetic `PointerEvent`
a page dispatches at itself, and the exception escapes before the value
is read or `onInput` fires. So a check that drives a real pointer path
measured a control that had done nothing, which is the shape of failure
this project keeps paying for. Capture is an improvement on a drag that
leaves the lane, not a requirement of one.

<a id="lift-resumes"></a>

## slider.mjs, pointerup

⚠️ THE LIFT RESUMES THE HAND, it does not turn it on. `handPickUp` does
nothing at all unless the button says the hand is running, which is what
makes "yield, not off" a promise rather than a surprise.

<a id="keyboard"></a>

## slider.mjs, keydown

⚠️ A KEYBOARD PATH, and not only for accessibility: it is the one route a
harness can drive without synthesising pointer events.

<a id="exp-keys"></a>

## slider.mjs, keydown, exponential lane

⚠️ ON AN EXPONENTIAL LANE THE KEYS MOVE BY POSITION, NOT BY VALUE. A fixed
`+0.01` is a huge jump at the bottom of 0.002-4 and invisible at the top;
one percent of the LANE is the same gesture everywhere, which is the whole
reason the lane is warped.

<a id="invisible-hand"></a>

## slider.mjs, the invisible hand

── the invisible hand ────────────────────────────────────────────────────

🔴 THREE FILES, AND THE SPLIT IS THE SAME ONE `looper.mjs` USES. What a
movement IS lives in `hand.mjs`, graded with no browser at all by `node
demo/shell/hand-test.mjs`. The button, the frame loop, the ten minute
ceiling, the hand-over and the `.pos-controls` refusal live in
`hand-drive.mjs`, one implementation shared with `knob.mjs` since
2026-09-22. What is left here is the three things only a SLIDER knows: how
many steps its lane has, how a share of that lane becomes a value, and the
sentence it says when it is barred.

<a id="hand-steps"></a>

## slider.mjs, the hand, step count

🔴 A SLIDER TOO COARSE TO SHOW A HAND SAYS SO RATHER THAN DRAWING A
STAIRCASE, and counting its steps is the slider's own business.
⚠️ AN EXPONENTIAL LANE IS COUNTED BY ITS KEYBOARD STEP, which is one per
cent of the lane, because a ratio lane has no fixed step to count.

<a id="hand-move"></a>

## slider.mjs, the hand, move()

⚠️ THE SAME PATH A POINTER DRAG TAKES, WHICH IS WHY IT IS NOT `set()`.
It shares `clamp()` and `paint()` and emits `onInput` exactly as a
pointer move does, so `set()` keeps meaning "somebody else is moving
this" with no exceptions.

<a id="set-range"></a>

## slider.mjs, setRange()

Re-scale this slider in place.

🔴 A CONTROL WHOSE MEANING CHANGES NEEDS ITS UNITS TO CHANGE WITH IT, and
without this the page could only relabel the word. `/archive/radio/`'s read
head is a PLACE in one mode, a SPEED in another and a LAG in a third —
`Engine_Pappus.sc:719` selects between them — so one 0..1 lane showed
`0.30` for what was actually **-0.10x**, a number that is not wrong so
much as meaningless. Relabelling alone would have left the units lying.

⚠️ The VALUE is re-derived by the caller, not converted here: only the
caller knows what the old number meant.

<a id="label"></a>

## slider.mjs, label()

Rename the control.

🔴 FOR A CONTROL WHOSE MEANING A PRESET DECIDES, NOT FOR DECORATION.
`/archive/radio/`'s read-head slider drives `mscan` in one engine mode and
`mdelay` in another, and in a third `mscan` is a SPEED rather than a
place — so one fixed word is wrong for two of the three, which is this
project's named hazard: a control that looks like it does one thing and
does another. The page had a comment saying exactly that and no way to
act on it.

⚠️ IT CHANGES AT HUMAN PACE OR NOT AT ALL. A label that rewrites itself
on a clock is the caption that reflowed under `grain-scope` (CLAUDE.md);
this one moves when somebody chooses a preset, which is a thing that
happened rather than a thing that ticks.

⚠️ AND IT CAN CHANGE THE LABEL COLUMN'S WIDTH. `.sld-group` sizes that
column from its widest label, and a page sharing one column across two
groups measures it itself — so a caller that renames must re-measure, or
every lane on the page shifts sideways on a preset press. The `aria`
label is left alone: it was given for a reason when it differs.
