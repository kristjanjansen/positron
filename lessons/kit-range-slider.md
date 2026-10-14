# Kit lessons: range-slider.mjs, range-slider-test.mjs

The long comments cut from `demo/shell/range-slider.mjs` and `demo/shell/range-slider-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-range-slider.md#<anchor>`.

<a id="header"></a>

## range-slider.mjs, file header

demo/shell/range-slider.mjs
One lane, two handles, a start and an end.

🔴 IT IS A NEW MODULE AND NOT A MODE OF `slider.mjs`, AND THE REASON IS THE
RETURN VALUE. `createSlider` answers `get()` with a number, and every one of
its call sites reads that number. A `range: true` option would have to make
`get()` answer a pair, or grow a second accessor that only some sliders have,
and then `set()`, `setRange()`, the keyboard path, the pointer path, the
glide and the invisible hand each acquire a branch for a shape most callers
never use. Two values are not one value with a flag on them.

✅ AND WHAT IT DOES REUSE IS EVERYTHING A READER CAN SEE. The root carries
`.sld`, the head is `.sld-head`, the label is `.sld-l`, the lane is
`.sld-lane` and each handle is a `.sld-knob`, all of which are declared once
in `shell.css` for the single slider. So this control is the same height as a
button, its lane is the same lane, its corner is the same corner, and
`createSliderGroup` takes it with no change at all: a group is a grid and
`.sld-group .sld { display: contents }` puts a head and a lane into the
shared columns, which is exactly what this contributes.
⚠️ **TWO CHILDREN, NEVER THREE.** That `display: contents` is what aligns a
stack of sliders, and a third child here would take a column of its own and
push every lane in the group sideways. The head holds both numbers.

🔴 THE INVARIANT IS THAT `from` NEVER PASSES `to`, AND IT IS ENFORCED IN ONE
FUNCTION. `clampPair` is the only place either value is written, so the
pointer, the keyboard and a page calling `set()` cannot disagree about what
happens when a handle is pushed past its neighbour. A range control that lets
the two cross reports a negative span and draws a band backwards, and the
page reading it has no way to tell that from a real reading.

🔴 AND THE ARIA LIMITS FOLLOW THE OTHER HANDLE, WHICH IS THE THING A NAIVE
RANGE CONTROL GETS WRONG. Each handle is its own `role="slider"` with its own
`aria-valuemin` and `aria-valuemax`, and those are the limits it can ACTUALLY
reach: the start handle's maximum is wherever the end handle is standing, and
it is rewritten every time either one moves. Reporting the full scale on both
handles tells somebody using a screen reader that the start can go to 127
when the end is at 40, and the only way to find out otherwise is to press the
key and hear nothing change. `limitsFor` is that rule, and it is graded
without a browser.

⚠️ TWO TAB STOPS, ONE PER HANDLE, AND THE LANE IS NOT ONE. A table is one tab
stop with a roving index because its rows are a list you scan. This is two
VALUES, and a control that hides one of its two values behind a mode key is a
control where one of them cannot be reached from the keyboard at all. The
lane carries `role="group"` and no `tabindex`, so tabbing through this
control is start, end, out.

⚠️ ARROWS MOVE BY A STEP, PAGE KEYS BY A TENTH, AND `Home` AND `End` GO TO
THIS HANDLE'S OWN LIMIT rather than to the scale's. `End` on the start handle
puts it against the end handle, which is where it can actually get to, and is
the same answer the arrow keys converge on.

🔴 A PRESS WHERE THE TWO HANDLES ARE STACKED HAS TO PICK ONE, AND PICKING THE
NEARER IS NOT ENOUGH. With `from` and `to` on the same number both are
exactly as near, so the tie is broken by WHICH SIDE the press is on: a press
to the left grabs the start, because the start is the handle that can move
left. Breaking the tie the other way makes a collapsed range impossible to
open again, which looks like a control that has stopped working. See
`nearestHandle`.

⚠️ NO INVISIBLE HAND HERE. A hand is one value wandering, and there is no
settled answer for what two of them wandering against a shared invariant
should look like. `slider.mjs` keeps it; this does not pretend to.

STYLING lives in `shell.css` beside the single slider's, because everything
this draws except the band between the handles is already declared there and
a second copy is the drift this kit exists to catch.

<a id="min-gap"></a>

## range-slider.mjs, MIN_GAP

The least the two handles may be apart, as a share of the scale, when a
caller does not say. Zero: they may touch.

⚠️ TOUCHING IS A REAL SETTING RATHER THAN A DEGENERATE ONE. A macro leg on
the Circuit is `Destination, Start, End, Depth`, and a leg whose start and
end are the same number is a leg with no travel, which somebody may well
want. Refusing it by default would be this component deciding something about
an instrument it has never been connected to.

<a id="tie"></a>

## range-slider.mjs, nearestHandle, the tie

🔴 THE TIE IS THE CASE THAT MATTERS AND IT IS THE ONLY ONE WORTH A COMMENT.
Two handles on the same number are equally near to every press, so a plain
`da <= db` would always answer `from` and a plain `da < db` would always
answer `to`. Either way one of the two is unreachable and a collapsed range
can only ever be opened in one direction. Deciding on the SIDE gives both
directions back: press left of the pair and the start comes with you, press
right and the end does.
🔴 AND THE TIE IS NEAR ENOUGH RATHER THAN EXACT, WHICH WAS MEASURED RATHER
THAN GUESSED AT. `Math.abs(0.5 - 0.2)` is 0.3 and `Math.abs(0.5 - 0.8)` is
0.30000000000000004, so an exact comparison makes a press halfway between
two handles take the START, while the same press halfway between 0.4 and
0.6 ties exactly and takes the END. Two identical gestures answering
differently because of where the handles happen to sit is the shape a
reader calls random, and no amount of looking at the source shows it.

<a id="clamp-pair"></a>

## range-slider.mjs, clampPair

Move one handle and get back a pair that still obeys the invariant.

🔴 IT PUSHES NOTHING. A start dragged past the end stops AT the end rather
than carrying it along, and that is a decision rather than the easy path. A
range that shoves its other handle loses the value you were not touching,
silently, and the page reading `to` gets a number nobody set. Stopping is
visible: the handle refuses to go further and the number under it stops
changing, which is the control saying what it just did.

@param {{from:number, to:number, which:'from'|'to', next:number,
        min:number, max:number, gap?:number}} o
@returns {{from:number, to:number}}

<a id="span-pixels"></a>

## range-slider.mjs, spanPixels

Where the band between the handles is drawn, in pixels.

🔴 THIS IS A STATEMENT OF WHAT THE `calc()` MEANS, NOT THE CODE THAT RUNS.
The component positions the band with percentages so it follows the lane
without a resize observation, the same way `slider.mjs` positions its handle,
and a percentage cannot be graded in node. So the arithmetic is written here
once, in pixels, and asserted without a browser; and `/kit/` measures the
real band against the two real handles, which is the half that grades the
`calc`. Neither alone would be worth much: the first cannot see a typo in a
CSS string and the second cannot be run cheaply.

The band runs from the CENTRE of the start handle to the centre of the end
handle, because a handle is 20 px wide and a band drawn to its edges would be
a fifth of a lane longer than the range it stands for.

@param {number} fromT  0 to 1
@param {number} toT    0 to 1
@param {number} laneW  the lane's width in pixels
@param {number} knobW  a handle's width in pixels
@returns {{left:number, width:number}}

<a id="two-cells"></a>

## range-slider.mjs, createRangeSlider, the two number cells

🔴 TWO CELLS, NOT ONE STRING WITH A DASH IN IT. The house rule is that a
row of facts is cells: `0 to 127` glues two readings into a sentence that
has to be parsed, and the glue is the first thing to go wrong when one of
the numbers gets wider. Two fixed boxes side by side say the same thing and
line up under the two handles they belong to.
⚠️ AND EACH RESERVES ITS WIDEST VALUE, the same way a single slider does, so
neither number can move the other one while somebody is dragging.

<a id="pointer-capture"></a>

## range-slider.mjs, createRangeSlider, pointer capture

⚠️ A SYNTHETIC POINTER CANNOT BE CAPTURED AND THE THROW TAKES THE DRAG
WITH IT. `setPointerCapture` raises `NotFoundError` for an id that is not
an active pointer, which is every `PointerEvent` a check dispatches at
itself, and the exception escapes before the value is read. Capture is an
improvement on a drag that leaves the lane, not a requirement of one.

<a id="home-end"></a>

## range-slider.mjs, createRangeSlider, Home and End

🔴 `Home` AND `End` GO TO THIS HANDLE'S LIMIT, NOT TO THE SCALE'S. On the
start handle `End` is wherever the end handle is standing, which is the
furthest it can get; sending it to `max` and letting the clamp pull it
back would be the same landing place reached by a lie about the scale.

<a id="set"></a>

## range-slider.mjs, createRangeSlider, set

Both values at once.

🔴 THREE WRITES, NOT TWO, AND THAT IS THE BUG THIS SHAPE EXISTS TO AVOID.
Each value is clamped against where the OTHER one is standing right now,
so a pair moving wholesale from the top of the scale to the bottom has
its first write refused by a neighbour that has not moved yet. Writing
the end, then the start, then the end again lets the pair travel in
either direction with no special case for which way it is going.
⚠️ AND A CROSSED PAIR IS SWAPPED RATHER THAN COLLAPSED. `set(30, 15)` is
somebody handing over two numbers in the order they had them, and
collapsing both onto 15 would throw one of them away without saying so.

<a id="test-header"></a>

## range-slider-test.mjs, file header

demo/shell/range-slider-test.mjs
The two handle arithmetic, no browser.

  node demo/shell/range-slider-test.mjs

🔴 FOUR PURE FUNCTIONS, AND EVERY BUG A RANGE CONTROL HAS EVER HAD LIVES IN
ONE OF THEM: a start that walks past its end, a handle that pushes its
neighbour along and loses the value nobody touched, a screen reader told a
handle can reach a number it cannot, and a pair collapsed onto one number
that can never be opened again because every press grabs the same handle.

⚠️ WHAT IS NOT GRADED HERE, SAID PLAINLY BECAUSE A GREEN SUITE CAN MEAN ZERO
COVERAGE. Nothing below opens a document. `createRangeSlider` is never
called. Every claim about PIXELS needs a browser and is asserted on `/kit/`
instead:
  - that the band really runs between the two handles' centres, which is the
    `calc()` that `spanPixels` only states in arithmetic
  - that the control contributes exactly two grid items, so a group's shared
    columns still line up
  - that there are two tab stops and the lane is not one of them
  - that the lane and the handles are the single slider's own lane and handle

<a id="test-tie"></a>

## range-slider-test.mjs, the halfway press test

🔴 THIS ONE WENT RED FIRST AND THE COMPONENT WAS WRONG, NOT THE CHECK.
  `Math.abs(0.5 - 0.2)` is 0.3 and `Math.abs(0.5 - 0.8)` is 0.30000000000000004,
  so an exact tie test made a press halfway between 0.2 and 0.8 take the START
  while the same press halfway between 0.4 and 0.6 tied exactly and took the
  END. Two identical gestures answering differently because of where the
  handles happen to sit, and no reading of the source shows it. `TIE` is why
  this passes now.

<a id="test-collapsed"></a>

## range-slider-test.mjs, the collapsed pair test

🔴 THE CASE THE WHOLE TIE RULE EXISTS FOR. With both handles on one number
  every press is equally near to both, so a rule that answers the same handle
  every time makes a collapsed range openable in one direction only, which
  reads as a control that has stopped working. Pressing to the left has to come
  away with the start and pressing to the right with the end.

<a id="test-aria-limits"></a>

## range-slider-test.mjs, the aria limits test

🔴 THIS IS THE CLAIM THAT MATTERS FOR ANYBODY USING A SCREEN READER, and it
    is the one a naive range control gets wrong. Reporting the full scale on
    both handles says the start can reach 127 while the end sits at 90, and the
    only way to find out otherwise is to press the key and hear nothing
    change.

<a id="test-reuse"></a>

## range-slider-test.mjs, the reused classes test

🔴 REUSE IS THE WHOLE ARGUMENT FOR THIS BEING A NEW MODULE RATHER THAN A
    COPY, so it is checked rather than asserted in a comment. The classes below
    are declared once in `shell.css` for the single slider, and a range that
    invented its own would be the second slider stack this project has already
    paid for.

<a id="test-two-children"></a>

## range-slider-test.mjs, the two children test

Two children of the root, a head and a lane, because `.sld-group .sld
    { display: contents }` is what aligns a stack of sliders and a third child
    would take a column of its own. The page measures the real thing; this
    catches the append that would break it.

<a id="test-one-writer"></a>

## range-slider-test.mjs, the one writer test

🔴 ONE WRITER, WHICH IS WHAT KEEPS THE POINTER, THE KEYBOARD AND A PAGE
    CALLING `set()` FROM DISAGREEING ABOUT THE INVARIANT. Everything that moves
    a value goes through `write`, and `write` is the only caller of
    `clampPair` inside the component. A second assignment path would be the
    hole this file cannot otherwise see, because each of the three looks
    perfectly correct on its own.
