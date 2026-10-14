# Kit lessons: xr-tablet.mjs

The long comments cut from `demo/shell/xr-tablet.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-xr-tablet.md#<anchor>`.

<a id="header"></a>

## xr-tablet.mjs, file header

demo/shell/xr-tablet.mjs — the small screen that sits on the controller, and
the controls on it.

🔴 IT IS A CANVAS, WHICH IS THE ONLY REASON IT WORKS AT ALL. The 2-D page is
behind your face inside an immersive session — `d.log` and the readout are
invisible there — so anything you need to READ or PRESS while wearing the
headset has to be drawn in the scene. `panel.mjs` settled that idiom for a
wall-sized panel and this is the same idiom at 0.20 m: draw to a canvas,
`texImage2D` it, and point at it.

🔴 "A SECOND CONTROL IS ONE LINE OF `DEFAULT_CONTROLS`" WAS TRUE OF A SECOND
SLIDER AND FALSE OF A SECOND KIND, AND THE SECOND CONTROL WAS A SECOND KIND.
This block used to promise the one line flatly. Adding the button under it
cost a `kind` on the control and a branch in FOUR places that had each
quietly assumed every control was a slider:

  · the layout    — `HEAD_W` is the widest label/value column, and a button
                    has neither, so it must not be in that maximum
  · the hit test  — a slider owns its whole ROW, a button owns only its own
                    rectangle, or the row's margins fire it
  · the input     — a slider takes a value from `u`, a button takes TIME
  · the state     — `values()` and `applyAll()` iterate every control, and
                    `applyAll` firing a button at session start would have
                    ended the session on the first frame

A second SLIDER really is one line, and the test file proves that by adding
one. So the claim survives with its scope written down rather than deleted:
**one line per control of a kind that already exists; a new kind is a new
branch in each of the four places above.** Everything below still derives
from the one array — the canvas height, the metres, the row boundaries and
the fingerprint — so a control added here still arrives complete.

⚠️ THE SHAPE IS THE READOUT'S, ON PURPOSE — a label, a number, a unit. It is
the shape a visitor already knows from every other page here, and inventing a
second one for the headset would mean learning the readout twice. The one
thing it adds is the track underneath, because in a headset a number you
cannot change is a number you cannot investigate.

🔴 AND NOTHING IN THIS FILE KNOWS WHAT KIND OF SESSION IT IS IN. There is no
`immersive-vr`, no `immersive-ar`, no blend mode and no passthrough anywhere
below, and `xr-pick-test.mjs` asserts that the fingerprint carries none of
those words either. The requirement was that the controller interface be
identical in both modes, and the way to satisfy that is structural: the code
cannot tell them apart, so it cannot drift. ⚠️ That is why `QUIT_CONTROL`
does not END anything — it raises `leaves` and `xr-hands.mjs`, which is
the one module handed the session every frame, performs it. A control that
called `session.end()` from here would put a session into the file whose
whole claim is that it has none.

🔴 AND THAT CONTROL IS OFF THE SHIPPED LIST SINCE 2026-09-17: *"rm quit
button from tablet but keep that component around"*. It is still here, whole
and exported, one `DEFAULT_CONTROLS` line away from being back. The tablet
ships one control, the floor-dots slider, and the way out of a session is a
long hold on any controller button (`demo/shell/xr-quit.mjs`).

⚠️ INCLUDING THE CONTRAST, WHICH IS THE ONE PLACE IT WAS TEMPTING. Over
passthrough the tablet composites onto a lit room; in an opaque session onto
a dark one, and the instinct is to brighten it in the first. That instinct is
about CONTRAST rather than about mode, so the fix is to make the tablet its
own background in both — an opaque-enough fill that what is behind it stops
mattering — rather than to ask the session what it is. One number, both
modes, and it is `FILL_ALPHA` below.

⚠️ NOTHING HERE IS DESTRUCTIVE ON A SINGLE PRESS, and that is forced rather
than chosen: Quest reserves the palm-pinch gesture on both hands and has an
open bug (webxr-hand-input#117, since 2022) where reaching for it fires a
spurious `select`. A slider that moves is reversible by moving it back — and
the button kind is behind a HOLD for exactly the same reason, see `HOLD_MS`.
`plan-xr-hands` §3.3.

<a id="default-controls"></a>

## xr-tablet.mjs, DEFAULT_CONTROLS and HOLD_MS

🔴 ONE LINE ADDS A CONTROL OF A KIND THAT ALREADY EXISTS, AND THERE IS
EXACTLY ONE LIST. `key` is what the page reads the value back by, `apply` is
what it DOES, and everything else is what the cell says. The canvas's height,
the tablet's metres, the hit test's row boundaries and the fingerprint all
derive from this array.

⚠️ `apply` TAKES THE VALUE AND THE PAGE'S CONTEXT, so a control never reaches
into anything itself — which is what keeps this module free of the room, the
session and the page.

⚠️ AND `createXRTablet` TAKES NO CONTROL LIST. It used to, and that quietly
broke the promise above: the canvas was sized from this array at load, so a
caller passing two controls got a second row drawn past the bottom edge and
unreachable by the hit test. Two pages showing two different tablets is also
exactly what "the same interface in both kinds of session" forbids, one level
up. One list, both pages, both modes.
🔴 HOW LONG THE WAY OUT HAS TO BE HELD, IN MILLISECONDS — and the reason it
is held at all rather than pressed.

The tablet is a surface a ray sweeps across to reach the slider, and the
trigger that drives the slider is the same trigger that would press this. A
control that ended the session on one press would end sessions nobody meant
to end, and the cost of that mistake is the whole run somebody was in the
middle of.

⚠️ WHAT WAS REJECTED, AND WHY, SO IT IS NOT RE-PROPOSED. A CONFIRM DIALOG:
a panel in a headset that needs a second press to dismiss is a new way to be
stuck, which is the failure this button exists to reduce rather than to add
to. PRESS-ON-HOVER: it ends a session by looking at it. A DOUBLE PRESS: it is
invisible — nothing on the face can show you that the first press landed.

A hold shows its own progress, is abandoned by doing nothing, and can be
aborted THREE ways that all come naturally: let go, slide the ray off it, or
point somewhere else. None of them needs a second control.

<a id="hold-ms-order"></a>

## xr-tablet.mjs, HOLD_MS declared above DEFAULT_CONTROLS

⚠️ DECLARED ABOVE `DEFAULT_CONTROLS` BECAUSE THE TABLE USES IT. It sat a
hundred and fifty lines below, which made naming it from the table a temporal
dead zone reference, so the exit control was written without a `hold` and left
to the `c.hold ?? HOLD_MS` fallback every reader applies. The runtime was
correct and `xr-pick-test.mjs` went to `NaN% of undefined ms` on four checks,
because a test reads the field rather than the fallback. Moving the constant
is the fix; typing 800 twice is what CLAUDE.md forbids.

<a id="quit-control"></a>

## xr-tablet.mjs, QUIT_CONTROL

🔴 THE TABLET'S WAY OUT, TAKEN OFF THE TABLET ON 2026-09-17 AND KEPT WHOLE.
Instructed in one line: *"rm quit button from tablet but keep that component
around"*, alongside *"make one general way to get out ... no other exit
methods/ui's for now"*. The one way out of every immersive page here is now a
long hold on ANY controller button — `demo/shell/xr-quit.mjs` — and this was
the second visible exit beside it.

⚠️ IT IS NOT DELETED, BECAUSE IT IS THE ONLY BUTTON THIS SURFACE HAS. The
tablet supports two KINDS of control and the button kind cost a branch in the
layout, the hit test, the input and the state; removing the one instance of it
would leave four branches with nothing exercising them. `xr-pick-test.mjs`
loads a copy of this module with this control appended and grades the kind
against that, which is the same trick the "one line" test already used.

⚠️ TO PUT IT BACK IN A SCENE: append it to `DEFAULT_CONTROLS`. Every layout
number below is derived from that array — the canvas grows by exactly one row
and the lane does not move — and `leaves` is what `xr-hands.mjs` acts on.
Nothing else has to change.

`apply` is a NOTIFICATION. The session is ended by `xr-hands.mjs`, which is
handed the session every frame; a page learns it was this one and can say so
rather than printing the same line for all its exits.

<a id="leaves"></a>

## xr-tablet.mjs, QUIT_CONTROL.leaves

⚠️ `leaves` IS WHAT ENDS THE SESSION. `xr-hands.mjs` drains this tablet's
fired controls every frame and acts only on the ones carrying it, so a
button without it is a button that draws, fills its ring, reports itself
and does nothing. That is the inert-control failure this repo keeps
paying for, and it is one missing field away at all times.

<a id="floor-dots-value"></a>

## xr-tablet.mjs, floor dots slider, value and from

🔴 A FALLBACK, AND THE ROOM'S OWN NUMBER OVERRIDES IT AT CONSTRUCTION.
This carried `75` beside `xr-room.mjs`'s own `0.75`, which is the shared
measurement in two files this repo keeps paying for: dimming the dots in
one place left the slider reading 75 over dots drawn at 52.5, so the
control lied the moment the page opened.
⚠️ IT CANNOT BE AN IMPORT. `xr-room.mjs` imports THIS file, so reading
`GRID` from there is a cycle and the module evaluates to nothing: it
cost a page its whole run, reported as `0 asserts`. `createXRTablet`
reads `ctx.room.gridAlpha` instead, which is a value at call time rather
than a name at load time.

<a id="kit-table"></a>

## xr-tablet.mjs, KIT table, the site's slider and button

── the site's slider AND the site's button, in one table ─────────────────

🔴 THE SAME CONTROLS IN ANOTHER SURFACE, SO THEY LOOK THE SAME. Reported from
the headset: *"use our slider style"*. The tablet had a pill-shaped track
with a round knob and a filled portion — a second visual language for a
control this project already has one for, which is the thing `/kit/` exists
to prevent. This is `demo/shell/slider.mjs` and a plain `<button>` as drawn
by `shell.css`.

⚠️ A CANVAS CANNOT USE THE STYLESHEET, SO THE NUMBERS ARE COPIED — AND THAT
IS THE DANGEROUS PART. Two copies of a design drift and nobody notices until
they are side by side. So they are copied ONCE, into this table, each with
the rule it came from; nothing below this block carries a literal. The
COLOURS are not copied at all — they are read live off `:root` with these as
fallbacks, so a token change reaches the tablet without anyone editing here.

  shell.css `.sld`        height 34px · --sld-knob 20px · gap 8px
  shell.css `.sld-lane`   background --card2 · inset 0 0 0 1px --line2
                          · border-radius 4px
  shell.css `.sld-knob`   width var(--sld-knob) · height 34px
                          · background --hi · border-radius 4px
  shell.css `.sld-l`      500 9.5px/1 mono · letter-spacing .1em
                          · uppercase · --dim2
  shell.css `.sld-v`      500 12px/1 mono · --fg · tabular-nums · LEFT
  shell.css `.sld-head`   column · gap 4px  ← the value UNDER the label,
                          which changed today; the old side-by-side is gone
  shell.css `.sld-lane:focus-visible`
                          outline 1px solid --hi · outline-offset 1px
  shell.css `.sld-group`  row gap 10px

  shell.css `button, .pos-btn`
                          500 13px/1 mono · height 34px · padding 0 14px
                          · border-radius 4px · background --card2
                          · border 1px solid --line2 · color --fg
  shell.css `button:active`
                          background --card
  shell.css `button.pos-pri`
                          color #0b0e14 · background --hi · border --hi
                          ⚠️ `#0b0e14` is written as a literal in the
                          stylesheet and it IS `--bg`, so the token is what
                          gets read below — one value, still live.
  shell.css `:focus-visible`
                          outline 1px solid --hi · outline-offset 2px
                          ⚠️ TWO px OF OFFSET, NOT ONE. `.sld-lane` overrides
                          the root rule for the lane only; a button gets the
                          root one, so the two rings genuinely differ and the
                          row has to be tall enough for the larger.
                          🔴 AND BOTH WIDTHS WENT 2 px TO 1 px ON 2026-09-23,
                          when every ring on the site did. The OFFSETS did
                          not move, so the button is still the taller of the
                          two and the row is still sized on it. What changed
                          is the row: 208 design pixels to 200.

⚠️ `button:hover { border-color: --dim2 }` WAS READ AND DELIBERATELY NOT
USED. In a headset the ray is hover and focus at the same instant, so
drawing both would be two channels saying one thing — and this project's
rule is one meaning per channel. The ring says it.

⚠️ `K` IS THE ONLY THING ADDED. A 34 px lane on a 768 px canvas read at
arm's length would be a hairline, so every CSS pixel above becomes `K` design
pixels — ONE factor, so the proportions are the stylesheet's and only the
size is this surface's. At K=4 the lane comes out 374x136, which is 2.75:1
against the shipped control's 96x34, i.e. 2.8:1. That match is the check.

<a id="hold-steps"></a>

## xr-tablet.mjs, HOLD_STEPS

🔴 HOW MANY STEPS THE FILL MOVES IN, AND IT IS NOT A STYLE CHOICE. The room
re-uploads this whole canvas to the graphics card whenever `version` moves,
so a fill animated per frame would be ~72 uploads of a 1280-wide texture
across one 0.8 s hold, on a part that is already shading two eyes at 90 Hz.
Quantised, it is at most this many — one every 80 ms, which still reads as
filling rather than as a bar that jumps.

<a id="mono-adv"></a>

## xr-tablet.mjs, MONO_ADV

🔴 THE ONE PLACE A MONOSPACE FACE IS ASSUMED. Every width below is a
character count times an advance, because that is the only way a layout can
be arithmetic — and arithmetic is the only way `node` can grade it. 0.6em is
the advance of every face in `--mono`. ⚠️ It is an ASSUMPTION, so the page
MEASURES the drawn label against the column it was given and asserts it fits;
if the face ever changes, that assert is what says so rather than a label
quietly running under the lane.

<a id="pad"></a>

## xr-tablet.mjs, PAD

── the slab, and what a headset can read at arm's length ─────────────────

🔴 MORE AIR. Reported from the headset as cramped; the inset was 22 design
pixels, under 3% of the width. It is `PAD` below and nothing else, because
every other measurement is taken from it or from the kit table above.

⚠️ PADDING COMES OUT OF THE CONTENT, so the thing to check is that the TYPE
did not shrink to pay for it. It did not: the value is `KIT.valuePx` = 48
design pixels, against 62 before — but the canvas is the same 1280 real
pixels across the same 31.9 degrees, so the figure that matters is unchanged
at **40.1 px per degree**, and 48 design pixels is 2.0 degrees of cap height
at a reading distance of 0.35 m. Nothing was bought by making the words
smaller and nothing had to be.

<a id="ring-out"></a>

## xr-tablet.mjs, RING_OUT

⚠️ AND THE FOCUS RING SITS OUTSIDE THE LANE, so the row has to be tall enough
to hold it — a ring clipped by the canvas edge reads as a drawing fault
rather than as a control with the pointer on it.

<a id="btn-ring-out"></a>

## xr-tablet.mjs, BTN_RING_OUT

⚠️ AND THE BUTTON'S RING IS THE BIGGER ONE. `.sld-lane` overrides the root
`:focus-visible` offset down to 1px; a button keeps the root's 2px. The two
widths are equal since 2026-09-23, so the whole difference is now the offset:
four design pixels, and they are the difference between a ring with air round
it and a ring touching the row above.

<a id="row-content"></a>

## xr-tablet.mjs, ROW_CONTENT

The row's content is whichever is taller: the two columns of a slider row, or
the button plus its larger ring.

🔴 ONE ROW HEIGHT FOR EVERY KIND, TAKEN OVER THE KINDS AND NOT OVER THE LIST.
The hit test finds a row with one division — `floor((py - top) / rowH)` — and
that only holds while every row is the same height. Sizing rows from the
controls PRESENT would make the grid change shape when a control is added,
which is the kind of arithmetic that is right on the day and wrong later.

<a id="ink-pad"></a>

## xr-tablet.mjs, INK_TOP and INK_BOT, equal air to the ink

🔴 EQUAL AIR ON ALL FOUR SIDES, MEASURED TO THE INK AND NOT TO THE BOX.
Reported from the headset as unequal, and `PAD` was already the same number
both ways — 48 design px left, right, top and bottom, and the canvas aspect
matches the object's, so it was equal in MILLIMETRES too. The eye was still
right, and this is why:

a row's box is `ROW_CONTENT` tall, which is the tallest of the three kinds —
and the tallest is the BUTTON PLUS ITS FOCUS RING, not the slider's lane. So
the slider's lane sits centred in a box taller than itself, and the visible
gap from the canvas edge to the first thing you can SEE is `PAD` plus half
that difference. Horizontally there is no such allowance: the lane runs to
exactly `PAD` from the edge.

So the padding was equal to the LAYOUT and unequal to the READER. Measured
both ways, the vertical gap to the ink was 48 + (ROW_CONTENT − laneH)/2
against 48 across — and the ring is invisible until something has the
pointer on it, which is most of the time.

⚠️ THE FIX IS TO PAD TO THE INK, NOT TO SHRINK THE RING. The ring still needs
its room or it is clipped by the canvas edge, which reads as a drawing fault;
it is now taken OUT of the outer pad instead of added to it. ⚠️ And the two
ends differ because the two kinds differ: the first row is a slider and the
last is a button, whose ring is the larger one.

<a id="head-w"></a>

## xr-tablet.mjs, HEAD_W

🔴 THE HEAD COLUMN IS AS WIDE AS ITS WIDEST LINE, WHICH IS WHAT `max-content`
DOES IN `.sld-group`. Computed from the control list rather than typed, so a
control with a longer name widens the column instead of running under the
lane — and computed with arithmetic rather than `measureText`, so the hit
test and the drawing share it and `node` can grade both.

⚠️ SLIDERS ONLY, AND THAT IS THE FIRST OF THE FOUR PLACES A SECOND KIND
TOUCHED. A button has no label column and no value column — its label is
inside it — so putting `Hold to leave` into this maximum widened the head by
80 design pixels, shortened the lane to 294, and took the lane's aspect from
2.75:1 to 2.16:1. The test that asserts the lane looks like the shipped
control is what said so.

<a id="btn"></a>

## xr-tablet.mjs, BTN

The button, in design pixels.

🔴 FULL WIDTH, AND NOT IN THE LANE'S COLUMN. Three reasons, in the order they
decided it.

 · **It has to be readable.** `Hold to leave` at the stylesheet's own 13 px
   plus its own 14 px of padding is 518 design pixels. The lane's column is
   374. A button that has to shrink its type to fit its column is a button
   in the wrong column.
 · **It must not disturb the slider.** Sitting in its own row across the
   full content width, it touches neither `HEAD_W` nor `LANE`, so the
   slider's 2.75:1 proportions are exactly what they were before it existed.
 · **It is not on the way to anything.** It is the LAST row, so a ray coming
   onto the tablet for the slider — which is the first row — never has to
   cross it. A new control appended to the list lands here by default, which
   is the safe place by construction rather than by somebody remembering.

⚠️ ITS RECTANGLE IS NOT ITS ROW. The row carries the button's ring and the
gap below it; a press in either of those must do nothing. See `controlAt`.

<a id="scale"></a>

## xr-tablet.mjs, SCALE

🔴 EVERY LAYOUT NUMBER ABOVE IS A **DESIGN** PIXEL, AND THE CANVAS IS BIGGER
THAN THAT BY ONE FACTOR. The tablet was reported too small from the headset
and the fix is to grow the OBJECT — but growing an object without growing its
texture spends the legibility budget rather than the object, so both move
together and `SCALE` is the single number that moves them. `draw()` sets one
transform and then works in design pixels; `controlAt` and `valueFromU` do
the same, so the drawing and the hit test stay the same arithmetic and the
scale cannot get into one of them and not the other.

<a id="w-m"></a>

## xr-tablet.mjs, W_M, the texture as an angular budget

🔴 THE TEXTURE SIZE IS AN ANGULAR BUDGET, NOT A SIZE. The instinct for a
small object is a small texture and it is BACKWARDS: what a face resolves is
pixels per DEGREE, and a tablet is an order of magnitude closer than a wall
panel. `mirror`'s shipped panel is 1.28 m at 1.6 m — 43.6 degrees across a
1280 px texture, so **29.4 px per degree**. This is 0.20 m across 1280 px at
a reading distance of 0.35 m — 31.9 degrees, so **40.1**. Above the shipped
panel rather than merely matching it, because a tablet is read at a glance
while holding something else. ⚠️ And 40 px/deg is still only an anchor:
`mirror`'s own legibility has never been graded by a face, so matching it is
a floor rather than a measurement. `plan-xr-hands` §5.2.

⚠️ THE WIDTH DID NOT MOVE WHEN THE SECOND CONTROL LANDED, AND THAT IS THE
POINT. A second row makes the slab TALLER — 0.0667 m to 0.123 — and the
pixels per degree across it are unchanged, because both the height in metres
and the height in pixels come out of the same row arithmetic.

<a id="h-m"></a>

## xr-tablet.mjs, H_M

⚠️ THE HEIGHT FOLLOWS THE PIXELS. A width and a height typed separately are
two numbers that can disagree about the aspect, and a stretched texture is
the one defect nobody photographs because it looks almost right.

<a id="rpath"></a>

## xr-tablet.mjs, rpath

A rounded rectangle PATH, so the same corner can be filled, stroked or
clipped against without three ways of describing it.

⚠️ `g.roundRect?.(…)` FOLLOWED BY `g.fill()` DRAWS NOTHING ON A BROWSER THAT
LACKS IT — no throw, no warning, an empty path filled successfully. That is
the optional-chaining failure this project already paid for on an iPhone's
fullscreen button: a control that looks live and is inert.

<a id="rows"></a>

## xr-tablet.mjs, rowsTop and rowsBottom

Where the rows live, in canvas pixels.

🔴 READ BY THE DRAWING AND BY THE HIT TEST, WHICH IS THE WHOLE POINT. Two
arithmetics for "where is row `i`" is two answers, and the one that would be
wrong is the invisible one — a press landing on a row that is not the row
under the knob, with nothing on screen to say so.

<a id="control-at"></a>

## xr-tablet.mjs, controlAt

Which control a point on the tablet is ON, or null.

🔴 ON, NOT IN THE ROW OF — and that distinction is the second of the four
places a second kind touched. A slider owns its whole row: pressing in its
head column drives it to its minimum, which is what a slider does when you
click to the left of its knob. A BUTTON owns only its own rectangle, because
the rest of its row is the ring's air and the gap below it, and a way out
that fires from the margin around itself is a way out that fires by accident.

@param {number} u 0..1 across
@param {number} v 0..1 down, origin TOP LEFT — the way `pickQuad` hands it over

<a id="value-from-u"></a>

## xr-tablet.mjs, valueFromU

What a drag across the tablet means, in the control's own units.

🔴 A SHARE OF THE TRAVEL, NEVER OF THE WIDTH — which is `slider.mjs`'s own
rule and the reason its two ends land flush. The knob is `LANE.knobW` wide
and moves `LANE.w - LANE.knobW`; a value read as a share of the LANE puts the
knob half outside it at both extremes, and a value read as a share of the
whole TABLET can never reach either end at all. Both look like a broken
control and neither throws.

⚠️ HALF A KNOB IS SUBTRACTED because the ray grabs the knob's CENTRE, exactly
as a pointer does in `slider.mjs`'s `fromX` — without it the extremes are
only reachable by aiming off the tablet entirely.

Clamped rather than extrapolated: a ray that slides off the side with the
trigger down must not drive the number past what the control says it can be.

<a id="clock"></a>

## xr-tablet.mjs, clock

The clock a hold is measured against.

⚠️ EVERY CALL THAT USES IT TAKES AN OVERRIDE, so the whole hold — press,
part-way, cancel, fire — is graded with no waiting at all: by `node` in
`xr-pick-test.mjs`, and by the page in `demo/scene`, where a real 800 ms
pause mid-handler would push the run past `verify.mjs`'s settle and silently
lose every assert after it.

<a id="tablet-fingerprint"></a>

## xr-tablet.mjs, TABLET fingerprint

🔴 WHAT ONE HEADSET RUN IN VR AND ONE IN AR ARE COMPARED ON.

The owner will do at most one pass of each mode, so "are the two the same?"
has to be answerable by putting two log lines side by side rather than by a
third run. This string is built entirely out of declarations — sizes, counts,
ranges, which hand gets what — and there is no session, no blend mode and no
frame anywhere in it. Two runs that print different fingerprints have a
branch in them that should not be there; two that print the same one cannot.

⚠️ It is a getter rather than a field so that it describes the list as it
actually is, including a control added later by somebody who never read this.

<a id="stand-in-registered"></a>

## xr-tablet.mjs, fingerprint, standInParts

⚠️ REGISTERED BY xr-room.mjs RATHER THAN IMPORTED FROM IT, and the reason
is the direction of the dependency: the room draws the tablet, so the
tablet must not reach back into the room or the two cannot be loaded
apart — which is what lets `node demo/shell/xr-pick-test.mjs` grade this
file with no WebGL anywhere. `registerStandIn` is the one line that
crosses, and it crosses the way that keeps the arithmetic testable.

<a id="fingerprint-kinds"></a>

## xr-tablet.mjs, fingerprint, each kind in its own terms

⚠️ EACH KIND DESCRIBES ITSELF IN ITS OWN TERMS. A button has no range, and
printing one for it read `leave undefined..undefined` — a line whose job
is to be compared against another line cannot afford a word like that in
it, because the reader cannot tell a real difference from a broken one.

<a id="stand-in-caption"></a>

## xr-tablet.mjs, the stand-in caption that left the face

🔴 THE LINE THAT SAID WHAT THE SHAPE ON YOUR HAND WAS HAS GONE FROM THE FACE
— BUT THE FACT HAS NOT, AND THAT IS THE WHOLE OF THIS NOTE.

The footer used to read "a stand-in shape, not your real controller", and it
was asked to go: it is a caption on a control surface, and captions crowd out
the numbers. Deleting a display without rehoming what it SAID is how a page
quietly stops reporting something, so the fact moved rather than went. It now
lives in two better places:

 · **the shape itself.** A stand-in draws in a colour no real controller is
   — see `STAND_IN_COL` in xr-room.mjs. The fact is in the thing rather than
   in a caption about the thing, which is where this project puts every
   other claim it makes about a picture.
 · **one line per session on the beacon**, said when the answer settles
   rather than only when it fails.

⚠️ Do not put it back on the face. If a third place is ever wanted, the
readout on the flat page is the one with room for it.

<a id="create-xr-tablet"></a>

## xr-tablet.mjs, createXRTablet

The tablet, drawn.

⚠️ `document` IS TOUCHED HERE AND NOWHERE ABOVE. Everything a laptop needs to
grade — the layout, the hit test, the value arithmetic, the fingerprint — is
a pure function above this line, so `node demo/shell/xr-pick-test.mjs` runs
with no browser at all.

<a id="values-from"></a>

## xr-tablet.mjs, createXRTablet, values and from(ctx)

⚠️ SLIDERS ONLY. A button has no value to hold, and one in here would print
as `"leave": null` in every line that reports what the tablet is showing.
⚠️ `from(ctx)` LETS A CONTROL ASK THE THING IT DRIVES WHERE IT ALREADY IS,
at call time, so its opening position cannot be a second copy of a number
declared somewhere else. The `floor dots` slider uses it to read the room's
own `gridAlpha`. `null` means the control has no opinion and its typed
`value` stands, which is what every other control does.

<a id="pending-notes"></a>

## xr-tablet.mjs, createXRTablet, pending notes

🔴 WHAT THE TABLET SAYS ABOUT ITSELF, DRAINED BY WHOEVER HAS A BEACON. The
owner gets ONE headset run, and "I held it and nothing happened" has three
different causes — let go early, ray off the button, or the press never
landed. Each of them writes a different line here. The tablet keeps no
logger of its own, because a module that logs is a module that has to be
told where to log.

<a id="live-colours"></a>

## xr-tablet.mjs, createXRTablet, colours read off :root

🔴 THE COLOURS ARE READ LIVE OFF `:root`, NOT COPIED. The KIT table above
holds the stylesheet's SIZES because a canvas cannot compute them — but a
colour it can just ask for, so a token change reaches the tablet with
nobody editing this file. The literals are fallbacks for a context with no
document behind it, and they are the current values of those tokens.

<a id="apply-all"></a>

## xr-tablet.mjs, applyAll

Push every control's value through its `apply` once — at session start.

🔴 SLIDERS ONLY, AND THIS IS THE FOURTH PLACE A SECOND KIND TOUCHED — the
one that would have been worst. `applyAll` runs as the session opens; a
button in this loop would have fired the way out on the first frame of
every session, which presents as a headset that refuses to enter rather
than as a loop that iterates one thing too many.

<a id="aim"></a>

## xr-tablet.mjs, aim

Where the pointer is on the tablet this frame, or null.

⚠️ AIM AND PRESS ARE SEPARATE CALLS because they answer different
questions, and because a press must be able to CONTINUE off the control it
started on: once the trigger has hold of a slider, running the ray off the
side of the tablet clamps rather than drops it, which is how every slider a
hand has ever used behaves.

<a id="aim-version"></a>

## xr-tablet.mjs, aim, version bump

⚠️ THE VERSION MOVES WHEN THE PICTURE WOULD, AND NOT OTHERWISE. Bumping
it on every frame the ray is anywhere on the tablet would re-draw and
re-upload the whole face ninety times a second to show the same image —
the canvas only cares WHICH ROW is lit, so that is what is compared.

<a id="drag"></a>

## xr-tablet.mjs, drag

The trigger is still down. `hit` may be null — the drag keeps its grip.

🔴 AND FOR A BUTTON THE QUANTITY IS TIME, NOT POSITION. This is the third of
the four places a second kind touched: a slider reads the ray's `u` and a
button reads the clock, and the two share nothing but the grip.

<a id="drag-button"></a>

## xr-tablet.mjs, dragButton

⚠️ RUNNING THE RAY OFF THE BUTTON CANCELS THE HOLD AND KEEPS THE GRIP. It
is the abort that costs nothing to discover — you are already moving — and
running back on starts it again from zero rather than from where it was,
because a hold that resumes is a hold you can complete without meaning to.

<a id="set-transform"></a>

## xr-tablet.mjs, draw, setTransform

⚠️ ONE TRANSFORM, SET EVERY TIME. `setTransform` rather than `scale`
because `scale` compounds: called once a frame it would shrink the
picture to nothing over a few seconds, which reads as the tablet fading
out rather than as a transform bug.

<a id="face-corner"></a>

## xr-tablet.mjs, draw, the face

The face. The rounded corner is the SHADER's job — see HOLD_FS in
xr-room.mjs — so this canvas is the ink on the face and nothing else.
Drawing a second rounded rectangle here would put one rounding over
another and show a seam at every corner.

<a id="head-under"></a>

## xr-tablet.mjs, draw, the head

── the head: the LABEL, and the VALUE UNDER IT ────────────────────
🔴 UNDER, NOT BESIDE. `shell.css`'s `.sld-head` changed today and the
reason it changed applies here too: a number on the far side of the
lane drifts away from the word it belongs to as it narrows, and this
project's rule everywhere else is that a figure sits beside its own
ink. The two are one column, as wide as the wider of its two lines.

<a id="value-string"></a>

## xr-tablet.mjs, draw, the value string

⚠️ THE UNIT IS PART OF THE VALUE STRING, exactly as `.sld-v` prints it
— `12.40 ms`, one run of text, left-aligned under the label's first
letter. It used to be a separate smaller word positioned by a measured
offset, which is two things to keep in step for no gain.
⚠️ THE VALUE DOES NOT CHANGE COLOUR WHEN THE RAY IS ON IT. Colour in
this project says HOW SOMETHING LANDED, and "you are pointing at it" is
a second meaning on that channel — the rule `TOUCH` in xr-panel.mjs
exists to hold. The pointer's feedback is the ring below, which is the
site's own answer to the same question.

<a id="inset-edge"></a>

## xr-tablet.mjs, draw, the lane edge

⚠️ AN INSET EDGE, NOT A BORDER — `.sld-lane` uses an inset shadow for
one measured reason: a border insets the box the handle moves in, so
its travel is a pixel short at each end on a control whose whole brief
is that it sits flush. Stroked half a width inside here, which paints
the same line and takes nothing off the travel.

<a id="focus-ring"></a>

## xr-tablet.mjs, draw, the focus ring

🔴 THE RAY'S FEEDBACK IS THE SITE'S OWN FOCUS RING, NOT A BIGGER KNOB.
`shell.css`: `.sld-lane:focus-visible { outline: 1px solid var(--hi);
outline-offset: 1px }`. A knob that swelled past its lane was tried and
it read as a drawing fault — the handle is the same height as the lane
by design, so anything taller looks like it has come loose. The ring is
the answer this project already gives to "this control has the
pointer", it is outside the lane where nothing is competing with it,
and it costs the knob nothing.

<a id="no-fill"></a>

## xr-tablet.mjs, draw, no filled portion

🔴 NO FILLED PORTION. The shipped control has none: it is a lane and a
solid handle, and a bar that fills as the value rises was this tablet
inventing a second way to read the same number.

<a id="draw-button"></a>

## xr-tablet.mjs, drawButton

The way out, drawn as the site's own button.

🔴 THE HOLD IS THE BUTTON BECOMING THE PRIMARY, AND THAT IS NOT DECORATION.
`shell.css` already has a language for "this is the one to press": a `--hi`
ground with `#0b0e14` ink, which is `button.pos-pri`. So the fill that
crosses the face as you hold is the button turning INTO the primary, left
to right, and the label inverts with it. Nothing new was invented for it,
and the state it ends in is a state the site already draws.

⚠️ THE RING AND THE FILL ARE BOTH `--hi`, WHICH `shell.css` WARNS ABOUT —
`.pos-choice button` deliberately takes a GREY focus ring so that a filled
armed button and a focused unarmed one are not two yellow shapes meaning
different things. That warning is about a fill that persists AT REST, where
"on" and "focused" are genuinely confusable. This fill only exists while a
trigger is down on the button, so it is never present without the ring and
can never be read as a resting state. Keeping the ring the same as the
slider's matters more: one answer to "the ray is on this" across the whole
tablet.

<a id="text-state"></a>

## xr-tablet.mjs, drawButton, text state restored

⚠️ PUT THE TEXT STATE BACK. A canvas context is one mutable global, and a
centred baseline left behind here would move every slider label in the
rows after it — a defect that only appears once a third control lands.
