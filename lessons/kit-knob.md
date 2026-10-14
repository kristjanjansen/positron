# Kit lessons: knob

The longer comments cut from `demo/shell/knob.mjs` and `demo/shell/knob-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-knob.md#<anchor>`.

<a id="header"></a>

## `knob.mjs` module header

```text
demo/shell/knob.mjs: a rotary control that is NOT turned in a circle.

🔴 THE INTERACTION IS THE WHOLE COMPONENT, AND IT WAS RESEARCHED RATHER THAN
GUESSED, ON INSTRUCTION: *"research the implementation (moving them via mouse
is historycally fiddly)"*. It is fiddly, and there is a settled answer.

**A KNOB IS DRAGGED VERTICALLY, NEVER ANGULARLY.** Every professional audio
application does this and the reason is geometric rather than habitual:
angular drag asks the cursor to follow a circular path, and near the centre a
movement of two pixels swings the angle through most of its range. The
control becomes unusable exactly where a hand naturally lands. A mouse is a
linear device and cannot execute a rotation comfortably; a finger on glass is
worse, because the finger covers the knob it is trying to aim at.

🔴 AND THE KNOWN COST OF THE RIGHT ANSWER IS DISCOVERABILITY. Vertical drag
has no signifier: a control that LOOKS like a dial invites somebody to turn
it, and if the first thing they try does nothing, the control reads as
broken. That is the one real criticism in the literature and it is answered
here with three signals rather than a tooltip nobody reads:
  1. `cursor: ns-resize` on hover, which is the standard vertical-drag arrow.
  2. An angular drag STILL WORKS, badly but harmlessly, because the vertical
     component of a circular gesture is read like any other vertical motion.
     Somebody who tries to turn it sees the value move, which is the only
     lesson that lands.
  3. The keyboard and the wheel both work, so nobody is trapped.

⚠️ `movementY` RATHER THAN `clientY`, WHICH IS THE OTHER HALF OF NOT BEING
FIDDLY. A knob driven by absolute pointer position jumps the moment the
pointer leaves the element, and cannot be dragged further than the screen is
tall. Accumulating relative motion means the gesture is about the HAND rather
than about where the cursor happens to be, and `setPointerCapture` keeps the
events arriving after the pointer has left the 40 px circle.
⚠️ **POINTER LOCK IS THE NEXT STEP AND IS DELIBERATELY NOT TAKEN.** It is the
only thing that survives hitting the edge of the screen, and it costs a
hidden cursor, an escape key that now means something, and a browser
notification. `SWEEP` below is 180 px for the whole range, so a full travel
fits on any screen in one gesture. **If somebody measures a real edge-hit,
this is where to add it**, and not before.
```

<a id="arc"></a>

## `knob.mjs` ARC

```text
Degrees of sweep, with the gap at the bottom where a real knob's gap is.

🔴 270, AND IT IS THE ONLY VALUE. Decided 2026-09-21: *"use full arcs only"*.
It went 270 to 150 on *"do not full round rotary knob path, just a bit"* and
back, and the short arc taught the component two things worth keeping: the
viewBox has to be cropped to what is actually drawn, and a long needle reads
as escaping a short track. Both fixes stay and both are right at 270 too.
⚠️ **THE PER KNOB OPTION IS GONE WITH IT.** `sweep` existed so five could be
put side by side and compared, which is what an undecidable number needs; a
decided one needs a constant. A page passing its own sweep is a page whose
knobs do not match the next page's, which is the drift `/kit/` exists to
catch.
```

<a id="receive"></a>

## `knob.mjs` RECEIVE_GLIDE_MS

```text
🔴 A VALUE FROM SOMEWHERE ELSE TURNS THE KNOB ON SCREEN, VISIBLY, AND SENDS
NOTHING. Asked 2026-10-13: *"make all concept knobs \"invisible-handed\"
start from remote 010"*. A knob already had two ways to move: `set` (a jump,
and with `quiet` nothing is called) and a drag (which calls `onInput`, so it
SENDS). Neither says "a hand somewhere else turned this": the real
instrument's own knob on the desk, a MIDI controller plugged in, a patch
change, another tab over the relay. `receive(v, { from })` is that third way:
the dial GLIDES to the value over `RECEIVE_GLIDE_MS`, eased, the knob is
marked as moved from outside for `RECEIVE_MARK_MS`, and `onInput` and
`onChange` are NEVER called, so a value that came from the instrument can
never be sent back to it as an echo.
⚠️ `value()` IS THE NEW VALUE AT ONCE; only the drawing glides. A check, a
drag and a send read the value, and the glide is for the eye.
⚠️ A PERSON WINS, AND SO DOES THE INVISIBLE HAND. While the visitor is
dragging, or within `RECEIVE_HOLD_MS` of their last move or of the
invisible hand's (`hand: true`, `hand-drive.mjs`), a received value is not
drawn and is counted as `ignored`: it is most likely the instrument echoing
what the page itself just sent, and drawing it would pull the dial back
under the hand. A knob can carry both: the invisible hand turns it from
HERE and sends, `receive` shows a turn made THERE and sends nothing.
```

<a id="self"></a>

## `knob.mjs` SELF

```text
🔴 THE WORD "HAND" MEANS TWO DIFFERENT THINGS ON THIS COMPONENT AND BOTH ARE
OLDER THAN THE OTHER FILE'S. `set(v, { from: 'hand' })` has meant A PERSON
since this knob was written, and `handMoves()` counts those. The INVISIBLE
hand, added 2026-09-22, is the opposite claim: nobody touched it. So its
moves arrive as `from: 'self'` with their own counter, and a page asking
*"did a person move this"* keeps the answer it always had.
⚠️ THE OPTION IS STILL CALLED `hand`, because that is what it is called on
`slider.mjs`, on the button and by the person who asked for it. Renaming it
here would make the kit disagree with itself to fix a word.
```

<a id="snapto"></a>

## `knob.mjs` snapTo

```text
A value held inside the ends and, when there is a step, rounded onto one.

🔴 PURE, EXPORTED AND SEPARATE, SO IT CAN BE GRADED WITH NO BROWSER. The rest
of this file needs a `document`, and `instrument.mjs` already records why
that matters: a rule only a browser can check is a rule that gets checked
once. `node demo/shell/knob-test.mjs` runs this in a few milliseconds, and
the drag arithmetic that snapping breaks is graded there rather than by
dragging a dial and looking.

⚠️ THE SIX PLACES ARE `slider.mjs`'S AND THE REASON IS FLOATING POINT.
`Math.round((3 - 1) / 0.1) * 0.1 + 1` is 3.0000000000000004, which prints
with a decimal the caller never asked for and compares unequal to the step
above it.

@param {number} n
@param {object} o
@param {number} o.min @param {number} o.max
@param {number} [o.step]  0 or omitted for a continuous travel
```

<a id="knobplaces"></a>

## `knob.mjs` knobPlaces

```text
How many decimal places a knob prints its value at, from its own resolution.

🔴 IT IS DECIDED ONCE AND NEVER PER FRAME, WHICH IS THE WHOLE POINT. See the
note on `dp` inside `createKnob`: a string that gains and loses a decimal
point sixty times a second is what *"make it stop wiggling"* was about.

@param {object} o
@param {number} o.min @param {number} o.max
@param {number} [o.step]
@param {number} [o.sweep]  the travel in pixels. Only a test passes this.
```

<a id="createknob"></a>

## `knob.mjs` createKnob

```text
One knob.

@param {object} o
@param {string} o.label     under the dial, uppercased by CSS. Keep it short.
@param {string} [o.sub]     a dimmer second line: `CC 80`.
@param {number} [o.min]     default 0, because these are MIDI controllers
@param {number} [o.max]     default 127
@param {number} [o.value]   where it starts, default the midpoint
@param {number} [o.home]    where a double press returns it to, default `value`
@param {string} [o.unit]    printed after the number
@param {string} [o.title]   hover text
@param {number} [o.step]    a knob that lands only on whole steps.

  🔴 **THE ROUNDING BELONGS HERE AND NOT IN THE PAGE, WHICH IS THE WHOLE
  REASON THIS IS AN OPTION.** Asked for 2026-09-22 as *"move voices to knobs,
  bottom right, stepped knob"*, for a voice count that can only be a whole
  number. A page that rounds the value on its way out leaves the NEEDLE
  somewhere the number is not, so the dial and the readout disagree about a
  control the reader is looking straight at.
  ⚠️ **THE NAME AND THE ARITHMETIC ARE `slider.mjs`'S**, deliberately, rather
  than a second vocabulary for one idea: the option is `step`, the snap is
  `Math.round((x - min) / step) * step + min` rounded to six places, and the
  invisible hand's step count is `span / step` exactly as it is there.
  🔴 **AND THE TRAP IS THE DRAG, WHICH SNAPPING KILLS IF IT IS WRITTEN THE
  OBVIOUS WAY.** The pointer moves the value by `span / SWEEP` a pixel, which
  on a one-to-eight knob is 0.039, so every single pixel of hand movement
  rounds straight back to where it started. Zeroing the accumulator after
  each move, which is what the continuous knob does, then throws that pixel
  away and **the knob never moves at all, at any speed**. So the accumulator
  is spent by what the value ACTUALLY moved and keeps whatever the snap ate.
  ⚠️ **AND THE WHEEL AND THE ARROW KEYS BOTH HAVE A FLOOR OF ONE STEP** for
  the same reason. `span / SWEEP * 6` is a sixth of a voice, and shift makes
  it a thirtieth, so both controls would have been inert on exactly the knob
  this was built for.
@param {number} [o.stroke]  how thick the ring and the needle are, in the
  dial's own 100 unit space. Default 4.
  🔴 BOTH ARE HERE TO BE COMPARED, NOT TO BE VARIED PER PAGE. Asked
  2026-09-20: *"i am not sure. make optopon for thinness, shom multiple"*,
  after the thickness went 7 to 10 to 4 in ten minutes and the sweep went 270
  to 150. Neither is decidable from a description and both are obvious side
  by side.
  ⚠️ **WHEN ONE IS CHOSEN, THE DEFAULT CHANGES AND THE CALLERS DO NOT.** A
  page passing its own thickness is a page whose knobs do not match the
  next page's, which is the drift `/kit/` exists to catch. These exist so a
  specimen can put five of them in a row.
@param {(v:number, from:string)=>void} [o.onInput]
@param {(v:number, from:string)=>void} [o.onChange]
@returns {{el:HTMLElement, set:Function, value:()=>number, source:()=>string,
           hardwareMoves:()=>number, handMoves:()=>number}}
```

<a id="step"></a>

## `knob.mjs` createKnob step

```text
The step, or 0 for the continuous travel every knob had before today.

⚠️ `0` RATHER THAN `undefined` INSIDE, so every arithmetic below reads
`Math.max(x, stp)` and `stp || fallback` with no branch of its own, and the
continuous case comes out byte for byte what it was. A step of 0 is the
only value that makes all three of those expressions the identity.
🔴 AND IT IS REFUSED RATHER THAN CLAMPED. A step wider than the travel is a
knob with two positions, which is a switch wearing a dial, and a step of
zero or less is a control that can never move. Both are the shape this
project calls a lie, and both are the caller's mistake, so they are said in
front of the author at build time.
```

<a id="dp"></a>

## `knob.mjs` createKnob dp

```text
🔴 HOW MANY DECIMALS THE NUMBER IS PRINTED AT, DECIDED ONCE AND NEVER PER
FRAME. REPORTED 2026-09-22 watching the invisible hand run: *"invisible m4
knob: show value without floating or make it stop wiggling"*.
`Math.round(v * 100) / 100` yields `40`, `40.4` and `40.37` on three
consecutive frames, so the STRING gains and loses a decimal point sixty
times a second. It only became visible now, because until the hand landed
nothing moved a knob on its own.
⚠️ **THE BASIS IS THE CONTROL'S OWN RESOLUTION**, which is the step when
there is one and `span / SWEEP` when there is not, because that is the
quantity the drag and the arrow keys already move by. A stepped knob prints
its step's own decimals, the way `slider.mjs` infers them. A continuous one
prints to the ORDER OF MAGNITUDE of its smallest move: 0 places on a 0 to
127 knob whose least move is 0.71, and 2 on a -1 to 1 attenuverter whose
least move is 0.011.
⚠️ **A BLANKET "NO DECIMALS" WOULD HAVE DESTROYED THE ATTENUVERTERS**, which
is why this is derived rather than chosen: three of them on `/muta/` run
-1 to 1 and would have shown `-1`, `0` and `1` and nothing else.
```

<a id="stroke-property"></a>

## `knob.mjs` createKnob stroke

```text
⚠️ A CUSTOM PROPERTY, NOT A STROKE WRITTEN ONTO THE PATHS. A component that
sets the property itself writes a rule nothing can override, including its
own stylesheet, which is the defect `video-panel.mjs` shipped with its
`aspect` option. Set the variable and let the stylesheet read it.
```

<a id="sweep-deg"></a>

## `knob.mjs` SWEEP_DEG

```text
⚠️ KEPT AS A LOCAL NAME even though it is now always `ARC`: the viewBox
crop and the needle angle both read it, and a constant inlined in three
places is three places to miss when it changes.
```

<a id="svg-dial"></a>

## `knob.mjs` createKnob dial

```text
⚠️ SVG RATHER THAN A `conic-gradient`, and the reason is the gap. A real
knob's travel stops short of the bottom, which is how an eye reads where
zero is; a conic gradient can be made to do that only by layering a second
shape over it, and then the two have to agree about a radius.
`stroke-dasharray` on an arc path is one number.
```

<a id="viewbox"></a>

## `knob.mjs` createKnob viewBox

```text
🔴 THE VIEWBOX IS CROPPED TO WHAT IS ACTUALLY DRAWN, AND IT IS DERIVED FROM
THE SWEEP. Photographed 2026-09-20: *"knobs are half seen"*. It was a
square `0 0 100 100` left over from the 270 degree ring, which filled a
square. A 150 degree arc occupies the TOP of that square and nothing else,
so the element reserved a square and drew in a third of it, and the knob
read as cropped with empty space under it.
⚠️ **COMPUTED, NOT TYPED.** `sweep` is an option, so a hand-measured box
would be correct for one value and wrong for every other. The arc's extent
is `r sin(half)` across and `r` to `r cos(half)` down, plus room for the
stroke and its round cap.
⚠️ AND THE ELEMENT'S HEIGHT FOLLOWS FROM ITS WIDTH through the viewBox
ratio, which is why `shell.css` gives it `height: auto`. Setting both would
be two opinions about one shape.
```

<a id="ring-edge"></a>

## `knob.mjs` createKnob ring edge

```text
🔴 WHERE THE RING'S LOWER EDGE IS, AS A FRACTION OF THE DRAWING, BECAUSE
THE HAND BUTTON SITS ON IT. Asked for 2026-09-22: *"button in the h center,
vertically centered to the lower edge ot the \"ring\""*.
⚠️ **DERIVED, NEVER TYPED.** `sweep` is an option and the viewBox is
already computed from it, so a pixel measured off one knob would be wrong
on every other. At the 270 degree default the box spans y 3 to 97 and the
ring's lower edge is y 88, which is 0.904 of the height; a 150 degree arc
puts it somewhere else entirely and this arithmetic follows it.
⚠️ AND THE SHAPE GOES WITH IT. The element's height follows its width
through the viewBox ratio, so the stylesheet needs both numbers to place
anything against the drawing rather than against the column.
```

<a id="inkbot"></a>

## `knob.mjs` createKnob inkBot

```text
🔴 THE ARC'S REAL LOWEST POINT, NOT THE BOUNDING BOX'S. Corrected
2026-09-22 on a photograph of the button sitting across the word `TIMBRE`:
*"move invisible hand upwards"*.
⚠️ **`yBot` IS A VIEWBOX CONVENTION AND WAS THE WRONG NUMBER TO REUSE.**
For a sweep of 180 degrees or more it is `50 + R`, the bottom of the whole
CIRCLE, which leaves room for the stroke's round cap. The ring is not drawn
there: a 270 degree arc ENDS at 135 degrees either side of twelve o'clock,
so its lowest ink is at `50 + R cos(135)`, which is **76.9 against 88**.
The button was being centred 11 units below the last thing anybody can see,
and on a 50.6 px knob that put half of it over the label.
⚠️ AND IT IS THE SAME ARITHMETIC THE VIEWBOX ALREADY DOES ONE BRANCH ALONG:
`yBot` uses `50 - R cos(half)` for a short sweep, which IS the drawn
extent. Only the long branch swaps in the bounding value, and this reads
the drawn one at every sweep.
```

<a id="focus"></a>

## `knob.mjs` createKnob focus

```text
🔴 THE DIAL IS THE FOCUSABLE THING. A wrapper taking focus rings the label
and the number too, which reads as the column being selected rather than as
a control being steerable.
```

<a id="ends"></a>

## `knob.mjs` createKnob ends

```text
🔴 THE TWO ENDS OF THE TRAVEL, PRINTED EITHER SIDE OF THE DIAL. Asked for
2026-09-22 on `/plai/` as *"support starte end labels -1 1"*, and the case
that needs it is the bipolar attenuverter: a knob running -1 to 1 with a
centre home is indistinguishable from one running 0 to 127 until a finger
moves it, and the real module prints `-` and `+` on exactly those three.
⚠️ **IT IS `ends: true` FOR THE NUMBERS AND A PAIR FOR ANYTHING ELSE.**
`true` prints `min` and `max`, which is the honest default because those
are the numbers the control really carries. A caller passing `['-', '+']`
gets the panel's own marks instead, which is what Mutable print.
⚠️ **AND IT SITS IN THE DIAL'S OWN GAP RATHER THAN ON A NEW ROW.** A knob's
travel stops short of the bottom, which is the whole reason the arc is an
SVG and not a conic gradient, and that gap is where a panel prints these.
A new row would change `--ctl-foot` for every knob on the site, and
`positron-ui` records `/twelve/` being corrected twelve times in one
evening over exactly that kind of arithmetic.
```

<a id="clamp"></a>

## `knob.mjs` clamp

```text
Inside the ends AND on a whole step, which is what every caller of this
gets. `hold` is the half without the snap and exists for the drag alone.
```

<a id="show"></a>

## `knob.mjs` show

```text
What the number reads, at a fixed number of places.

⚠️ `-0.00` IS WRITTEN AS `0.00`. `(-0.0004).toFixed(2)` is `"-0.00"`, so an
attenuverter sitting on nothing flickers a minus sign in and out while a
hand runs it, which is the same complaint the decimal count came from one
character along.
```

<a id="format"></a>

## `knob.mjs` show format

```text
🔴 A KNOB WHOSE VALUE HAS A NAME PRINTS THE NAME, ADDED 2026-09-22 FOR
`/muta/`'s WARPS ALGORITHM, ASKED FOR AS *"should show names instead"*
and *"fraction num is not that helpful"*. That dial sweeps a continuous
crossfade through six shapers, so `0.31` is a true number that says
nothing about which two a reader is between, and the panel itself prints
a ring of eight icons rather than a scale.
⚠️ IT IS THE CALLER'S FUNCTION AND NOT A TABLE HERE, because what a value
is CALLED is a fact about an instrument and this component knows nothing
about instruments.
⚠️ AND `unit` IS NOT APPENDED TO IT. A name is not a quantity.
```

<a id="widest"></a>

## `knob.mjs` widestValue

```text
🔴 THE NUMBER'S BOX RESERVES THE WIDEST THING THIS KNOB CAN EVER PRINT, and
without it fixing the decimals is only half the repair. `.pos-knob` is
`align-items: center` and `.pos-knob-v` had a fixed HEIGHT and no width, so
`9` becoming `10` still slid the whole string sideways under the hand
moving it. `slider.mjs` reserves its readout the same way and for the same
reason, and `positron-ui` states the rule: nothing that redraws every frame
may change how much room it takes.
⚠️ **A CUSTOM PROPERTY, NEVER THE PROPERTY.** Writing `num.style.minWidth`
from here would be a rule nothing can override, including this component's
own stylesheet, which is the defect `video-panel.mjs` shipped with `aspect`.
⚠️ **AND `ch` IS EXACT HERE** because the face is monospaced and the cell is
`tabular-nums`, so a digit, a minus and a point are all one advance. The
two ends are the widest strings a value between them can make.
```

<a id="widest-names"></a>

## `knob.mjs` widestValue names

```text
🔴 **AND THE TWO ENDS STOP BEING ENOUGH THE MOMENT A KNOB PRINTS NAMES.**
For a number, the widest string a value between two ends can make is at one
of them, which is why this read `min` and `max` alone. A NAME has no such
order: on Plaits' own list `chord` sits between `harmonic` and `speech` and
is shorter than both, so the longest name on a dial is usually in the
middle. A reservation taken from the ends would be too narrow and the cell
would slide again, which is the entire defect this line exists to stop.
⚠️ SO A FORMATTED KNOB IS SAMPLED ACROSS ITS TRAVEL: every step where it
has steps, and one sweep of points where it is continuous. Measured rather
than declared, because a caller asked to hand over its longest string will
eventually hand over its second longest.
```

<a id="needle"></a>

## `knob.mjs` paint needle

```text
🔴 A SHORT TICK JUST INSIDE THE RING, NOT A LONG HAND ACROSS IT.
Photographed 2026-09-20 with one word: *"what"*. It ran r=16 to r=31
against a ring at r=38, which was geometrically inside and did not read
that way: a line that long, ending a few units short of a 150 degree arc,
looks like a hand escaping past the end of the track rather than pointing
along it. The 270 degree ring hid this, because the track was always
behind the hand wherever it pointed.
⚠️ THE GAP IS WHAT MAKES IT READ. r=24 to r=32 against a ring whose
stroke starts at about 36 leaves clear air between tick and track.
```

<a id="paint-number"></a>

## `knob.mjs` paint number

```text
⚠️ `tabular-nums` IS ON THE CLASS, and the unit is hidden when there is no
number, because a `%` with nothing in front of it reads as a value that
went missing. Same rule as a readout cell.
🔴 AND THE PLACES ARE FIXED, so the string cannot gain and lose a decimal
point sixty times a second under a hand. See `dp` and `show` above.
```

<a id="glide-end"></a>

## `knob.mjs` receive glide end

```text
⚠️ A HIDDEN TAB RUNS NO FRAMES, so the end is also a timer: the dial
always lands on the value even when nobody watched it get there.
```

<a id="hand-api"></a>

## `knob.mjs` the hand

```text
── the hand ───────────────────────────────────────────────────────────

⚠️ `handApi` IS DECLARED HERE AND FILLED IN FURTHER DOWN, rather than
declared where it is built. A `let` shadows its whole block from the top,
and `positron-ui` records seven asserts going silent on exactly that: the
handlers below name it, and they must not be reading a variable in its dead
zone if one of them ever runs during construction.
```

<a id="yield"></a>

## `knob.mjs` pointerdown yield

```text
⚠️ YIELD, NOT OFF. A motorised fader you can grab is the thing the phrase
names, and nothing pressed the button. `hand-drive.mjs` picks the
movement up again from wherever the dial was left.
```

<a id="up-is-more"></a>

## `knob.mjs` pointermove direction

```text
🔴 UP IS MORE. `movementY` is positive DOWNWARDS, so it is negated here,
and getting this backwards is the single most irritating possible bug in
a knob because it feels wrong without looking wrong.
```

<a id="accumulator"></a>

## `knob.mjs` pointermove accumulator

```text
🔴 THE ACCUMULATOR IS SPENT BY WHAT THE VALUE ACTUALLY MOVED, AND KEEPS
WHAT THE SNAP ATE. This line read `set(...); acc = 0` until a `step`
existed, and on a stepped knob that is a control that can never move: one
pixel of hand is a fraction of a step, `set` rounds it straight back, and
zeroing throws the pixel away, so the value does not change at any speed.
⚠️ **AND IT IS BYTE FOR BYTE THE OLD BEHAVIOUR WITH NO STEP.** `hold`
applies the ends and `set` applies the ends and the snap, so on a
continuous knob `want` and `got` are the same number and `acc` lands on
exactly 0, including at both ends of the travel.
```

<a id="dblclick"></a>

## `knob.mjs` dblclick home

```text
⚠️ A DOUBLE PRESS GOES HOME, which is what every plugin does and what a
hand reaches for after overshooting. It is `dblclick` rather than a
hand-rolled double-tap timer, because the platform already knows what a
double press is on each input device.
```

<a id="wheel"></a>

## `knob.mjs` wheel

```text
⚠️ `passive: false` OR `preventDefault` DOES NOTHING AND THE PAGE SCROLLS
UNDER THE KNOB. Chrome makes wheel listeners passive by default.
```

<a id="wheel-floor"></a>

## `knob.mjs` wheel amount

```text
⚠️ A FLOOR OF ONE STEP. Six notches of `span / SWEEP` is a sixth of a
voice on a one-to-eight knob and a thirtieth of one with shift held, so
without this the wheel would be inert on the control `step` was built
for. `Math.max(x, 0)` is the identity, so a continuous knob is unchanged.
```

<a id="key-step"></a>

## `knob.mjs` keydown step

```text
⚠️ ONE STEP IS THE WHOLE UNIT ON A STEPPED KNOB, and shift does not make
it finer, because there is nothing finer than one voice to go to.
```

<a id="key-yield"></a>

## `knob.mjs` keydown yield

```text
⚠️ NO LIFT ON A KEY PRESS, so this one waits out `HAND_YIELD_MS` rather
than resuming at once. Shorter and the arrow keys look broken, because
the value is dragged away between one press and the next.
```

<a id="invisible-hand"></a>

## `knob.mjs` the invisible hand

```text
── the invisible hand ────────────────────────────────────────────────────

🔴 EVERYTHING BUT THE THREE THINGS ONLY A KNOB KNOWS COMES FROM
`hand-drive.mjs`. Those three are: how many steps this travel has, how a
share of the travel becomes a value, and the sentence it says when it is
barred from a control row.
```

<a id="hand-steps"></a>

## `knob.mjs` hand steps

```text
⚠️ A KNOB'S STEP IS ITS DRAG RESOLUTION, NOT ITS RANGE. Both the pointer
and the arrow keys move by `span / SWEEP`, so the travel has `SWEEP`
distinguishable positions whatever `min` and `max` are, and a 0..1 knob
is exactly as fine as a 0..127 one. Counting `span` instead would have
called a 0..1 knob a one-step control and refused it a hand.
🔴 **UNLESS IT REALLY HAS STEPS, IN WHICH CASE THEY ARE THE ANSWER.** A
knob with `step: 1` over one to eight has EIGHT places to be and no
others, and `hand-drive.mjs` refuses a hand under about thirty steps
because the wander at each end would be less than one step. Reporting
`SWEEP` here would have talked it out of a refusal that is correct. Same
arithmetic as `slider.mjs`'s own step count.
```

<a id="hand-button"></a>

## `knob.mjs` hand button events

```text
⚠️ THE BUTTON IS NOT THE DIAL AND MUST NOT BEHAVE LIKE IT. A press on it
would otherwise start a drag on the dial underneath and the knob would
jump by whatever the pointer did next.
```

<a id="hand-move"></a>

## `knob.mjs` hand move

```text
⚠️ IT DOES NOT CALL `set()`, WHICH IS WHAT KEEPS `set()` MEANING
"SOMEBODY ELSE MOVED THIS". It shares `clamp()` and `paint()` and emits
`onInput` exactly as a drag does, with `from: 'self'` rather than
`'hand'`, because the whole point of this control is that no hand was
anywhere near it.
```

<a id="counters"></a>

## `knob.mjs` hardwareMoves

```text
🔴 COUNTERS, so "is this binding live" is answerable after the fact.
```

<a id="knob-bank"></a>

## `knob.mjs` createKnobBank

```text
Several knobs in a row, which is how every macro bank and every channel strip
is laid out, because a person compares them ACROSS rather than down.

⚠️ IT SCROLLS SIDEWAYS RATHER THAN SHRINKING, and the scroller carries
`min-width: 0`. Without that, `overflow-x` cannot shrink a flex item below its
content and the PAGE drags sideways instead of the row. MEASURED once at
390 px as 141 px of page overflow.

@param {number[]} [o.split]  indices to draw a hairline BEFORE, so one row can
  say it is one row with a grouping in it. Asked for 2026-09-23 on `/evo/`:
  *"use std knob grid and separartors on c1-c9. in general, make evo roghly
  made of stadard pieces"*, and that page had hand rolled both the row and the
  divider.
  🔴 **IT IS A DIVIDER AND NOT TWO BANKS, WHICH IS THE WHOLE REASON IT IS AN
  OPTION.** `/evo/`'s eight rotaries are ONE row of eight with a 4 and 4
  split, and its own research names that split as the feature most likely to
  be misread as two rows. Drawing it as two banks would make the misreading
  true; a hairline inside one row says grouped without saying separate.
```

<a id="divider"></a>

## `knob.mjs` createKnobBank divider

```text
⚠️ IT IS FURNITURE AND SAYS SO. A hairline between two knobs is a
   grouping a sighted reader gets for free and a screen reader would
   otherwise be told about as an empty group.
```

<a id="test-header"></a>

## `knob-test.mjs` module header

```text
demo/shell/knob-test.mjs — the knob's arithmetic, without a browser.

🔴 WHAT THIS FILE CAN AND CANNOT SEE, SAID AT THE TOP SO NOBODY READS IT AS
COVERAGE IT DOES NOT HAVE. `createKnob` needs a `document`, so the dial, the
drag and the reserved width are graded on `/kit/`. What is graded here is the
two pure functions the stepped knob is built out of, plus the DRAG LOOP
rewritten as arithmetic, which is where the only real bug in this change
lives and which no screenshot would ever show.

🔴 THE BUG THIS EXISTS TO CATCH, AND IT IS THE OBVIOUS IMPLEMENTATION. The
pointer moves a knob by `span / SWEEP` a pixel. On a one to eight knob that
is 0.039, so every single pixel rounds straight back to where it started, and
the continuous knob's `acc = 0` after each move then throws that pixel away.
**The knob never moves, at any speed, and nothing about it looks wrong.**
`driveDrag` below is the same three lines the component runs, so a regression
there goes red here in milliseconds instead of being found by somebody
dragging a dial and giving up.
```

<a id="test-code"></a>

## `knob-test.mjs` code without comments

```text
The same file with every comment taken out.

🔴 AN ABSENCE ASSERTED OVER THE WHOLE FILE GRADES THE PROSE. This one went red
on its first run for the best possible reason: the comment above the line it
grades says *"Writing `num.style.minWidth` from here would be a rule nothing
can override"*, and a check reading the raw source found that sentence and
concluded the defect was present. The same trap is live in
`instrument-test.mjs`, where two asserts match comment text and pass.
```

<a id="test-fraction"></a>

## `knob-test.mjs` test: fractional step

```text
⚠️ THE SIX PLACES ARE NOT TIDINESS. Without them this is
   3.0000000000000004, which prints a decimal nobody asked for and compares
   unequal to the step above it.
```

<a id="test-no-step"></a>

## `knob-test.mjs` test: no step

```text
🔴 THE NEGATIVE CONTROL: with no step the same call is the ends and nothing
   else, which is what every knob on the site had before today. Without this,
   a snap accidentally applied to every knob would satisfy the two asserts
   above and silently quantise thirty pages.
```

<a id="test-attenuverter"></a>

## `knob-test.mjs` test: attenuverter places

```text
🔴 THE CASE A BLANKET "NO DECIMALS" WOULD HAVE DESTROYED. `/muta/` has
   three attenuverters running -1 to 1, and at 0 places they would show -1, 0
   and 1 and nothing else, which is a three position switch.
```

<a id="test-widest"></a>

## `knob-test.mjs` test: widest

```text
⚠️ THE PLACES ARE WHAT RESERVES THE WIDTH, so the widest string a knob can
   print is the wider of its two ends AT THIS PRECISION. A minus sign and a
   point are each one advance in a monospaced face.
```

<a id="test-drivedrag"></a>

## `knob-test.mjs` driveDrag

```text
The three lines `pointermove` runs, as arithmetic.

⚠️ IT IS A COPY AND IT IS SUPPOSED TO BE ONE. Grading the component's own
handler would need a `document`, a pointer capture and a stream of synthetic
events, and what is worth grading is the ACCOUNTING, which is two lines. The
assert below pins the component's source against it so the copy cannot drift
quietly.
```

<a id="test-slow"></a>

## `knob-test.mjs` test: slow drag

```text
🔴 THE WHOLE REASON THIS FILE EXISTS. Thirty pixels of hand on a one to
   eight knob is more than a step, and the obvious implementation returns the
   value it started at.
```

<a id="test-half-step"></a>

## `knob-test.mjs` test: half step

```text
⚠️ HALF A STEP IS WHERE IT TURNS OVER, which is `snapTo`'s rule arriving
   through the accumulator rather than through a single `set`.
```

<a id="test-continuous"></a>

## `knob-test.mjs` test: continuous drag

```text
🔴 THE NEGATIVE CONTROL, AND IT IS THE ONE THAT PROTECTS THIRTY PAGES. On a
   continuous knob the same loop must be byte for byte the old behaviour: the
   accumulator lands on exactly 0 every time, so 90 pixels of travel is
   exactly half the range and no residue is carried anywhere.
```

<a id="test-pushed"></a>

## `knob-test.mjs` test: pushed past the end

```text
⚠️ AND AT THE END OF THE TRAVEL THE RESIDUE IS DROPPED RATHER THAN BANKED.
   `hold` caps `want` at the end, so `want` and `got` are both the end and the
   accumulator lands on 0. A banked overshoot would mean a knob pushed hard
   into its top needs the same push back before it moves at all.
```

<a id="test-export"></a>

## `knob-test.mjs` test: snaps through the export

```text
🔴 A PURE FUNCTION GRADED HERE AND NOT CALLED THERE IS A DECORATION. Same
   shape as `instrument-test.mjs`'s absence assert, and the same reason.
```

<a id="test-hand-steps"></a>

## `knob-test.mjs` test: hand step count

```text
⚠️ THE INVISIBLE HAND COUNTS REAL STEPS WHEN THERE ARE ANY. `hand-drive.mjs`
   refuses a hand under about thirty steps, and reporting SWEEP would have
   talked it out of a refusal that is correct on an eight voice knob.
```

<a id="test-width"></a>

## `knob-test.mjs` test: width property

```text
🔴 THE WIDTH IS A CUSTOM PROPERTY, NEVER THE PROPERTY. A component writing
   `num.style.minWidth` writes a rule nothing can override, which is the
   defect `video-panel.mjs` shipped with its `aspect` option.
```

<a id="test-receive-section"></a>

## `knob-test.mjs` test: receive

```text
── a value from somewhere else (2026-10-13) ─────────────────────────────
```

<a id="test-receive"></a>

## `knob-test.mjs` test: receive sends nothing

```text
🔴 THE WHOLE POINT OF `receive` IS THAT IT SENDS NOTHING: a value that came
   from the instrument must never go back to it. Graded on the function's own
   body with comments stripped, so the sentence saying so cannot pass it.
```
