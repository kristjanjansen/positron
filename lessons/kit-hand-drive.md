# Kit lessons: hand-drive

The longer comments cut from `demo/shell/hand-drive.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-hand-drive.md#<anchor>`.

<a id="header"></a>

## `hand-drive.mjs` module header

```text
demo/shell/hand-drive.mjs: the button, the frame loop and the hand-over.

🔴 THE SPLIT THIS FINISHES WAS ALREADY WRITTEN DOWN AND ONLY HALF BUILT.
`slider.mjs` says it in its own hand block: *"What a movement IS lives in
`hand.mjs` and is graded with no browser at all by `node
demo/shell/hand-test.mjs`. What lives here is the button, the frame loop and
the hand-over, which is the same split `looper.mjs` uses."* That second half
then sat inside `createSlider`, about 150 lines of it, where a knob could not
reach it.

🔴 SO WHEN A HAND WAS ASKED FOR ON A KNOB, 2026-09-22, THE CHEAP ANSWER WAS
TO COPY IT. That is the hand-rolled control rule arriving from INSIDE the
kit: `positron-ui` records `choice.mjs` and the slider group both shipping
class names no stylesheet matched, *"a bug that only happens to a control
nobody else uses"*, and two copies of a ten minute ceiling, a visibility
handler and a `.pos-controls` refusal is a much larger version of that. One
implementation, two callers.

⚠️ IT WORKS IN LANE SHARE, 0 TO 1, AND NEVER IN A VALUE. `hand.mjs` plans in
that space already, and a driver that also knew about `min`, `max`, `step`
and exponential lanes would be a second opinion about what a control's
travel is. The host converts, clamps and paints; this decides where along the
travel the handle should be at this instant.
```

<a id="hand-max-ms"></a>

## `hand-drive.mjs` HAND_MAX_MS

```text
🔴 A CEILING, BECAUSE A HAND LEFT ON IS A PAGE SENDING FOR AS LONG AS THE TAB
IS OPEN. `/knobs/` puts fifty messages a second on a relay and into a
Raspberry Pi in another building, so ten minutes is about thirty thousand
messages: long enough to demonstrate anything, short enough that walking away
from it costs nothing. `transport-bar.mjs` already says the general form of
this, that a live loop with no ceiling is a recording with no end.

⚠️ THESE TWO LIVED IN `slider.mjs` UNTIL 2026-09-22 and are re-exported from
there, because `/archive/radio/`, `/kit/` and `/knobs/` all import `HAND_YIELD_MS`
from that module and a moved export is a 404 in three pages.
```

<a id="hand-yield-ms"></a>

## `hand-drive.mjs` HAND_YIELD_MS

```text
How long the hand keeps its own hands off after somebody else moved the
handle.

⚠️ YIELD, NOT OFF. A motorised fader you can grab is the physical thing the
phrase "invisible hand" names, and nothing pressed the button, so the hand
picks the movement up again from wherever it was left. A pointer lifting
resumes it at once; a `set()` from the page or from an arrow key has no lift,
so it waits this long instead. Shorter and the arrow keys look broken,
because the value is dragged away between one press and the next.
```

<a id="coarse"></a>

## `hand-drive.mjs` minSteps

```text
🔴 A CONTROL TOO COARSE TO SHOW A HAND SAYS SO RATHER THAN DRAWING A
STAIRCASE. The ends of a sweep wander by `endJit` of the travel, so on a
lane of N steps that wander is `endJit * N` steps, and under one step it
rounds away and every lap turns at the same number. MEASURED at 8 steps:
the metric cannot find a single reach to measure while the ends still read
as varied, which is a page looking right and moving like a machine.
```

<a id="frame"></a>

## `hand-drive.mjs` frame

```text
⚠️ THE VALUE IS A FUNCTION OF THE CLOCK, NEVER AN ACCUMULATION PER FRAME,
so a dropped frame costs a skipped sample and never a drifted phase.
⚠️ AND IT NEVER CALLS THE HOST'S `set()`. It calls `move()`, which the host
wires to the same path a pointer drag uses, so `set()` keeps meaning
"somebody else is moving this" with no exceptions.
```

<a id="rest"></a>

## `hand-drive.mjs` rest on stop

```text
⚠️ THE LAST VALUE OF A GESTURE IS THE ONE THAT HAS TO LAND. A send gate
holds back a move that is not due yet, so a hand that stopped without an
endpoint could leave a filter at the second to last position for ever.
This is what `onChange` on a pointer lift is for, and a hand stopping is
the same event.
```

<a id="handyield"></a>

## `hand-drive.mjs` handYield

```text
⚠️ YIELD, NOT OFF. A motorised fader you can grab is the physical thing the
phrase "invisible hand" names, and nothing pressed the button, so the hand
picks the movement up again from wherever it was left.
```

<a id="barred"></a>

## `hand-drive.mjs` barred

```text
🔴 IT REFUSES TO RUN FROM INSIDE A CONTROL ROW, AND THAT IS NOT
THEORETICAL. `verify.mjs` presses `.pos-controls button` on every demo on
every run, dozens of times a day, and TWO pages build their own
`.pos-controls` and put sliders in it: `/draw/` appends a two-slider group
to one, and `/grains/` puts its fade and its brightness in two of them.
Neither has a hand today and both are one `hand: true` away from a suite
run starting fifty messages a second to a shared Raspberry Pi.

⚠️ A COMMENT IN THIS FILE AND AN ASSERT ON THE PAGE THAT TURNED IT ON
PROTECT NEITHER OF THOSE PAGES, because the mistake would be made on a
page that has no such assert. So the component answers for itself: the
button is disabled, it says why on its own face, and the page gets a line
for its log. It fails in the log rather than on the board.
⚠️ AND IT IS READ ONE FRAME LATE, because a control is built before it is
appended to anything: asking at construction time asks about an element
with no parent, which always answers no.
```

<a id="visibility"></a>

## `hand-drive.mjs` visibilitychange

```text
🔴 OFF WHEN THE TAB IS HIDDEN. A forgotten tab on a second monitor sending
fifty messages a second to shared hardware is the `/tapes/` and
`/videoradio/` failure in a new costume.
```
