# Kit lessons: xr-pick.mjs, xr-pick-test.mjs

The long comments cut from `demo/shell/xr-pick.mjs` and `demo/shell/xr-pick-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-xr-pick.md#<anchor>`.

<a id="header"></a>

## xr-pick.mjs, file header, cost and facing convention

demo/shell/xr-pick.mjs — where a controller's ray lands on a flat rectangle.

Thirty floating-point operations and one divide, per quad, per ray, per frame.
Two rays and four quads at 90 fps is about 22,000 of them a second on a part
that is shading 3360x1760 twice at 90 Hz, so it does not appear in any
measurement anybody could take — said here so that nobody proposes a
bounding-volume hierarchy for four rectangles. `plan-xr-hands` §5.3.

🔴 IT IS ALL ARITHMETIC ON TWO Float32Array(16)s, WHICH IS WHY IT IS IN ITS
OWN FILE. A press landing in the wrong place is the defect this whole design
is most likely to ship, and it is the one a laptop can grade EXACTLY — no
headset, no browser, no GPU. `node demo/shell/xr-pick-test.mjs` is the grader
and three of its six cases are negative controls, because a check that cannot
fail is decoration.

⚠️ THE FACING CONVENTION IS MEASURED HERE RATHER THAN ASSUMED, and it is the
one thing in this file worth reading twice. Both quads this repo points at —
`xr-panel.mjs`'s `placeFacing` and `xr-room.mjs`'s `holdM` — are built so
their local +Z comes BACK AT THE VIEWER. So for a hit on the FRONT of either,
the ray direction and the quad's normal point opposite ways and `d · N` is
NEGATIVE.

🔴 `plan-xr-hands` §5.4 warns against writing `if (den > 0) return null` and
says it "rejects every valid hit". THAT SENTENCE IS WRONG — its own worked
example two lines above derives `den ≈ -1` for a valid hit, which that line
would KEEP. The warning is right about the hazard and wrong about the sign,
which is exactly the shape of thing that gets copied. So this file does not
carry a bare sign test at all: it computes a NAMED `front` and the test file
asserts both directions, so the convention is a measurement rather than a
recollection.

<a id="squared-length"></a>

## xr-pick.mjs, `pickQuad()`, divided by the squared length

⚠️ DIVIDED BY THE SQUARED LENGTH, and that is not a normalisation typo.
`R` and `U` are NOT unit vectors — the width and the height are baked into
those columns. Dividing by `R·R` normalises AND rescales in one step, so
`x` and `y` come out directly in -0.5..+0.5 with no separate scale term and
nothing to keep in step when a quad's metres change.

<a id="uv-shader"></a>

## xr-pick.mjs, `pickQuad()`, the shader's uv

🔴 READ OFF THE SHADER, NEVER DERIVED TWICE. `xr-room.mjs`'s HOLD_VS and
`xr-panel.mjs`'s PANEL_VS both say `vUv = vec2(aPos.x + 0.5, 0.5 - aPos.y)`.
If that line ever changes, this one changes with it and the corner case in
the test file is what says so.

<a id="uv-to-pixels"></a>

## xr-pick.mjs, `uvToPixels()`

A point on a quad, in the pixels of the canvas drawn on it.

Separate from `pickQuad` because it is the step where a silent offset gets
introduced — `plan-xr-hands` §5.3 measured three conversions between a `u,v`
and a strip hit test, every one of them a plausible wrong answer with no
error anywhere. One function, one place to be wrong, one place the test file
can grade.

<a id="test-header"></a>

## xr-pick-test.mjs, file header

demo/shell/xr-pick-test.mjs — the tablet's arithmetic, with no headset.

  node demo/shell/xr-pick-test.mjs

`plan-xr-hands` §6.5 puts this FIRST, before any device work, and the reason
is worth restating: four coordinate spaces stand between a controller's ray
and a slider moving — the quad, the tablet's canvas, the control's row, the
control's value — and every one of them is pure arithmetic on two
`Float32Array(16)`s. A press that lands in the wrong place is the defect this
design is most likely to ship, and it is the one a laptop grades EXACTLY
while a headset can only grade it by eye.

⚠️ THE CORNER CASE IS THE ONE THAT EARNS ITS PLACE, and it has to be a corner
rather than the centre. The centre hits at 0.5, 0.5 under EVERY mirror,
transpose and axis swap you could make — a statistic that is constant by
construction over the defects it is meant to catch, which is this project's
definition of a blind measurement. The top-left is what distinguishes `0,0`
from `1,1`, `1,0` and `0,1` — the four ways `vUv = (aPos.x + 0.5,
0.5 - aPos.y)` can be re-derived wrong.

FOUR of the cases below are NEGATIVE CONTROLS: a check that cannot fail is
decoration, the convention `diagram-test.mjs` already set here.

<a id="test-module-with"></a>

## xr-pick-test.mjs, moduleWith

🔴 A COPY OF `xr-tablet.mjs` WITH EXTRA CONTROLS IN ITS ARRAY, LOADED FOR
REAL. Every layout number in that module is derived at load from
`DEFAULT_CONTROLS`, so pushing onto the array afterwards changes the list and
not the canvas — the rows would be laid out for a shorter tablet and the hit
test would answer about a row that is off the bottom. Rewriting the source
and importing it is the only way to ask the real arithmetic a question about
a different list. The "one line" test at the bottom of this file already did
exactly this; it is a function now because the button needs it too.

@param {string} lines  control literals, inserted at the TOP of the array
@param {string} tail   control literals, inserted at the BOTTOM of it

<a id="test-closing-bracket"></a>

## xr-pick-test.mjs, moduleWith, closing bracket

⚠️ THE ARRAY'S OWN CLOSING BRACKET, FOUND FROM ITS OPENING ONE. A plain
`replace('\n];\n')` matches the first such line in the FILE, which is
whatever happens to be declared above — and the insert would land in
somebody else's literal while still producing a module that loads.

<a id="test-with-quit"></a>

## xr-pick-test.mjs, WITH_QUIT

🔴 THE TABLET WITH ITS BUTTON BACK, WHICH IS THE ONLY PLACE THE BUTTON KIND
STILL EXISTS. `QUIT_CONTROL` came off `DEFAULT_CONTROLS` on 2026-09-17 — one
way out of a session, and it is a hold on any controller button, not a slab
in your other hand. The KIND it is the only instance of costs a branch in the
layout, the hit test, the input and the state, so it is graded against a copy
of the module that still ships it rather than left as four untested branches.
⚠️ This is what the module looks like if somebody appends the control again,
which is the documented way to put it back in a scene.

<a id="test-yaw"></a>

## xr-pick-test.mjs, yawed quad

🔴 CATCHES AN R/U SWAP, which the centre case cannot see. Same quad turned
90 degrees in yaw and stood off to the side; its centre must still read
0.5, 0.5 and its own top-left must still read 0, 0.

<a id="test-pose"></a>

## xr-pick-test.mjs, hold pose

🔴 THE POSE, AFTER THE HEADSET SAID IT WAS WRONG. Reported from a Quest 3:
*"tablet works but looks to sky not to me (x rot 90 missing)"*. Identity
grip — the hand at the origin, its -Z (the thumb, and the top plate) along
world -Z, so the plate faces the way a plate faces and nothing is rotated
into a pose that flatters the answer.

<a id="test-face-regression"></a>

## xr-pick-test.mjs, face regression

🔴 THE REGRESSION, NAMED BY ITS OWN NUMBER. The bug read EXACTLY 1.0000
here — the face pointing straight along the controller, i.e. at the
ceiling. It must now be sin(FACE_TILT), which is the lean and nothing more.

<a id="test-right-handed"></a>

## xr-pick-test.mjs, determinant

🔴 RIGHT-HANDED, OR BACKFACE CULLING EATS IT. Three columns with a negative
determinant flip the winding, and the room draws with CULL_FACE on — so a
mirrored basis is an invisible tablet, which reads as "the tablet was never
built" rather than as a sign error. A ROTATION cannot break this; a column
negated by hand to make the picture look right can, which is the whole
reason the fix above was a rotation.

<a id="test-eye"></a>

## xr-pick-test.mjs, eye along the normal

An eye out along the tablet's own normal, looking back at it — which is
where a face is once the wrist is turned. The centre must read 0.5, 0.5 and
the distance must be the one that was asked for.

<a id="test-clears-controller"></a>

## xr-pick-test.mjs, clears the controller

⚠️ AND IT CLEARS THE CONTROLLER IT IS ON. The tablet grew by two thirds; a
slab whose bottom edge is inside the head of the stand-in reads as a
modelling fault, and the lift is the number that would be wrong.

<a id="test-double-controller"></a>

## xr-pick-test.mjs, dedupe, double controller

🔴 THE DOUBLE CONTROLLER, EXACTLY AS THE DEVICE REPORTED IT. Taken from the
log of 2026-09-13: one input source and two tracked ones, with the SAME
hand appearing twice under the same profile. This is the shape that drew
two stand-ins for one hand, and it is pure arithmetic, so it is graded here
rather than on a head.

<a id="test-hand-over-controller"></a>

## xr-pick-test.mjs, dedupe, hand over controller

⚠️ AND A HAND OVER A CONTROLLER ON THE SAME WRIST: the controller wins,
because it is the object that is physically there and it is the one with
buttons on it.

<a id="test-two-controllers"></a>

## xr-pick-test.mjs, dedupe, negative control

🔴 NEGATIVE CONTROL, AND IT IS THE ONE THAT MATTERS. A rule that collapses
everything would also pass both cases above. Two REAL controllers, one per
hand, must both survive — that is the case a distance-only test breaks if
the threshold grows, and the case a handedness-only test breaks when a
runtime reports `none`.

<a id="test-margins"></a>

## xr-pick-test.mjs, controlAt margins

NEGATIVE CONTROLS: the footer is not a control, and neither is the margin
above the first row. A hit test that answered "row 0" for the whole face
would pass every case above and turn the line that says the shape is a
stand-in into a slider.

<a id="test-slider-ends"></a>

## xr-pick-test.mjs, slider ends

🔴 THE SLIDER'S ENDS, AND THEY ARE NOT AT u 0 AND u 1. The track is inset
by the tablet's own margin, so a value read straight off `u` would be short
at both ends by exactly that inset — a slider that cannot reach its own
maximum, with every number in the readout still green.

<a id="test-share-of-travel"></a>

## xr-pick-test.mjs, share of travel

🔴 A SHARE OF THE TRAVEL, NOT OF THE LANE AND NOT OF THE TABLET — which is
`slider.mjs`'s rule and the one that makes both ends land flush. The three
readings differ, so the test has to name which it wants: the midpoint of
the RANGE sits where the knob's own centre reaches the middle of its
travel, which is NOT the middle of the lane and is nowhere near the middle
of the tablet.

<a id="test-ends-flush"></a>

## xr-pick-test.mjs, ends flush

NEGATIVE CONTROL, and it is the one that catches the mistake this rule
exists for: if the value were a share of the LANE rather than of the
travel, the knob's left edge at the maximum would hang `knobW` past the
lane's right edge. The two ends must land flush INSIDE it.

<a id="test-lane-proportions"></a>

## xr-pick-test.mjs, lane proportions

🔴 THE LANE HAS TO LOOK LIKE THE SHIPPED ONE, AND THAT IS A NUMBER.
`shell.css` gives `.sld-lane` 96x34 and `--sld-knob` 20 — so the shipped
control is 2.82:1 with a knob 0.588 of its height. A table of constants
copied out of a stylesheet is exactly the kind of thing that drifts, so the
proportions are asserted rather than trusted.

<a id="test-head-column"></a>

## xr-pick-test.mjs, head column

⚠️ AND THE HEAD COLUMN HAS TO FIT ITS OWN LABEL. `HEAD_W` is arithmetic on
a character count — the one place a monospace advance is assumed — so the
assumption is checked against the widest label the list can hold. The PAGE
measures the drawn text too; this is the half a laptop can do with no font.
⚠️ SLIDERS ONLY, and that is not a convenience. A button's label lives
INSIDE the button, so folding it into this maximum widens a column it will
never be drawn in — which took the lane from 2.75:1 to 2.16:1 and was
caught by the proportion assert above rather than by this one.

<a id="test-way-out"></a>

## xr-pick-test.mjs, the way out

── the way out, which is a button and not a slider ───────────────────────

🔴 THE CONTROL THIS FILE EXISTS FOR MOST. A slider that lands in the wrong
place moves a number you can move back. A way out that fires when nobody
asked ends the session somebody was in the middle of, and a way out that
cannot be made to fire is a way out that is not there — both of them are
arithmetic on a clock and a rectangle, and both are graded here rather than
on a head.
⚠️ THE CONTROL AND THE MODULE IT LIVES IN ARE BOTH THE COPY'S. Reading
`QUIT_CONTROL` from the shipped module and hit-testing it against the
shipped `controlAt` would ask a tablet laid out for one row about a second
row, and the honest answer to that is `null` — which is what it said before
this line existed.

<a id="test-button-row"></a>

## xr-pick-test.mjs, button row, negative control

🔴 NEGATIVE CONTROL, AND IT IS THE ONE THE WHOLE DESIGN RESTS ON. A slider
owns its whole row on purpose — pressing left of its knob drives it to its
minimum — and a way out that inherited that rule would fire from the band
of air its focus ring sits in, from the gap below it, and from the margins
either side. Four places you never meant to press, on the one control whose
press cannot be taken back.

<a id="test-hold-stub"></a>

## xr-pick-test.mjs, the hold, stub document

── the hold, with no clock to wait for ───────────────────────────────────

⚠️ A STUB DOCUMENT, AND WHAT IT DOES NOT PROVE. `createXRTablet` asks for a
canvas at construction, so two stubs stand in for one. Nothing below calls
`draw()` — the PICTURE is graded by `demo/scene`'s own asserts, against a
real 2-D context, on a real font. What is graded here is the half a browser
adds nothing to: which control a press took, what a clock does to it, and
what fires. Every call takes its timestamp, so none of this waits.

<a id="test-copy-tablets"></a>

## xr-pick-test.mjs, copy tablets

⚠️ EVERY TABLET BELOW IS THE COPY'S, NOT THE SHIPPED MODULE'S. The hold, the
abort and the `applyAll` guard are all properties of the BUTTON KIND, and the
shipped list has no button on it since 2026-09-17 — driving the shipped
`createXRTablet` at the button's coordinates would press empty canvas and
every one of these checks would pass vacuously.

<a id="test-press-not-hold"></a>

## xr-pick-test.mjs, press is not a hold

🔴 A PRESS IS NOT A PRESS-AND-HOLD. The first thing to prove is that the
obvious way to do it by accident does nothing at all.

<a id="test-hold-resets"></a>

## xr-pick-test.mjs, hold resets

🔴 NEGATIVE CONTROL, AND THE ONE A NAIVE IMPLEMENTATION FAILS. Running the
ray off the button must RESET the hold, not pause it: a hold that resumes
where it stopped can be completed by two passes that neither of them meant
to, and nothing on the face would say so. The grip is kept, so coming back
on starts it again from zero.

<a id="test-apply-all"></a>

## xr-pick-test.mjs, applyAll guard

🔴 NEGATIVE CONTROL, AND IT IS THE WORST DEFECT THIS CHANGE COULD HAVE
SHIPPED. `applyAll` runs once as a session opens, pushing every slider's
value through its `apply`. A loop that did not know a button when it saw
one would have fired the way out on the first frame of every session —
which presents as a headset that refuses to enter, not as a loop with one
too many things in it.

<a id="test-three-causes"></a>

## xr-pick-test.mjs, three causes

⚠️ AND IT HAS TO SAY WHICH OF THE THREE HAPPENED. "I held it and nothing
happened" has three causes — let go early, ray off it, press never landed —
and the owner gets one headset run to tell them apart. The tablet writes a
different line for each; `xr-hands.mjs` carries them to the beacon.

<a id="test-one-line"></a>

## xr-pick-test.mjs, a second control is one line

🔴 "A SECOND CONTROL IS ONE LINE" — TESTED BY WRITING THE LINE. The claim
in `xr-tablet.mjs`'s header was made about a second control and turned out
to hold only for a second control OF A KIND THAT ALREADY EXISTS: the button
above cost a branch in the layout, the hit test, the input and the state.
So the surviving half is proved rather than asserted in prose — a copy of
the module with ONE line added to its array, imported and measured. The
canvas grows by exactly one row, the new row hit-tests, and the fingerprint
counts three.

<a id="test-row-moves"></a>

## xr-pick-test.mjs, second row

The SECOND row of the copy, which is the control that was already there.
⚠️ The line is inserted at the TOP, so the new control is row 0 and the
shipped one moves down — which is the half of "one line" worth checking,
because a layout that only ever appends never has to move anything.

<a id="test-surfaces"></a>

## xr-pick-test.mjs, which surfaces get dots

── which of your room's surfaces get dots ────────────────────────────────

🔴 THE DOUBLED FLOOR, GRADED WITHOUT A HEADSET. Reported 2026-09-17 as
*"window seems to have doubled dots somehow when having moving panels"*. The
grid writes no depth and nothing opaque stands between its quads, so every
surface handed to it is superimposed on every other one in the same look — a
bed at 0.5 m over a floor at 0 is two parallel dot fields in one place. The
list below is the eleven surfaces a Quest 3 reported in this repo on
2026-09-13, by name, so this is the real shape of the problem rather than an
invented one.

<a id="test-one-ground"></a>

## xr-pick-test.mjs, one ground

🔴 NEGATIVE CONTROL, AND IT IS THE ONE THIS RULE COULD EASILY GET WRONG.
Exactly ONE horizontal surface may be the ground. A rule that kept every
horizontal plane below head height would keep the bed and draw the bug it
was written to remove.

<a id="test-blind-runtime"></a>

## xr-pick-test.mjs, blind runtime

🔴 NEGATIVE CONTROL: a runtime that classifies nothing must not end up with
an empty room. An empty shell reads as "your room has no surfaces", which
is a claim about somebody's room made out of our own failure to sort one.

<a id="test-wall-yaw"></a>

## xr-pick-test.mjs, wallYaw

── which way round your room is ──────────────────────────────────────────

🔴 THE ANGLE A BRICK HAS TO BE TURNED BY TO MEET A REAL WALL SQUARELY.
Reported 2026-09-17 about `/blocks/`: *"in xr blocks are angled against wall,
rotated a bit, not fully against wall"*. Nothing rotated the bricks; the
bricks are square to the REFERENCE SPACE and the room is not.

<a id="test-fold-by-four"></a>

## xr-pick-test.mjs, wallYaw, fold by four

🔴 NEGATIVE CONTROL, AND IT IS THE ONE A PLAIN MEAN FAILS. Four directions
ninety degrees apart average to NOTHING — north and east average to
north-east, and all four cancel — so an implementation that did not fold by
four would read 45° here, or 0, or whatever the rounding gave it.

<a id="test-no-walls"></a>

## xr-pick-test.mjs, wallYaw, no walls

🔴 NEGATIVE CONTROL: no walls is 0, and 0 is what every page did before
this function existed. A room nobody measured must not turn anything.

<a id="test-area-weight"></a>

## xr-pick-test.mjs, wallYaw, area weight

🔴 AREA IS THE WEIGHT, AND THIS IS WHAT SAYS SO. One 8 m² wall at 20°
against a 0.2 m² sliver at 40°: the answer has to sit next to the wall, not
half way between them. An unweighted mean would read 30°.
