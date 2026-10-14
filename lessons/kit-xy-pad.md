# Kit lessons: xy-pad.mjs

The long comments cut from `demo/shell/xy-pad.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-xy-pad.md#<anchor>`.

<a id="header"></a>

## xy-pad.mjs, file header

demo/shell/xy-pad.mjs — one surface you move a point across, and the record
of how you moved it.

A movement — a finger on a pad, a knob, a fader — produces hundreds of
samples a second. Something decides what to write down, something else
decides what to draw between the things written down, and a third thing puts
a playhead back in the middle of it and asks "where was the hand at 4.212 s?".
This file is the FIRST of those three and nothing else: it captures at full
rate, it hands every sample straight to the caller, and it draws what it
captured. What gets written down is the caller's decision; so is what gets
invented between two of them.

⚠️ THE REUSABILITY TEST, and it is the one that matters: a sync control is an
XY pad whose x is offset in milliseconds and whose y is rate. Nothing below
takes a per-caller flag to be that — the axes carry their own units and their
own direction, and a caller that wants rate to grow UPWARD names the larger
value first (`y: { min: 2, max: 0.5 }`). An axis is a mapping from an edge of
the pad to a number; `min` is the value at the near edge (left, and TOP —
screen order, which is the order a pointer event arrives in) and `max` the
value at the far one. Reversed is not a special case, it is the same two
numbers the other way round.

THREE RULES IT CARRIES, all of them already paid for elsewhere:

 1. THE LIVE PATH IS FULL RATE AND LOCAL. `onInput` is called for every
    coalesced sample, synchronously, before anything else — a knob must not
    travel to a relay and back before it moves anything. Throttling decides
    what enters a LOG, never what the actuator hears, so there is no throttle
    in this file at all.
 2. CAPTURE AND EVIDENCE ARE TWO APPEND-ONLY BUFFERS, NEVER ONE. This one
    owns the capture and never touches it again: `trace()` hands back the
    live array and `clear()` starts a FRESH one rather than emptying it, so a
    snapshot somebody is holding stays valid. demo10's sampler decimated by
    doing `realTimePoints.length = 0` and so consumed the ground truth of the
    comparison it existed to make.
 3. WHAT IT DRAWS IS WHAT WAS RECORDED, not what it was asked to show. The
    white line is the capture. A second reading of the same gesture — a
    reconstruction, a sparse record, anything derived — is the caller's, and
    goes through `overlay`, on top, in its own colour. `upTo` caps the white
    line at a TIME and does not break the rule: a prefix of what was
    recorded is still what was recorded, and it is what lets a caller
    replaying its own capture redraw the line under its playhead instead of
    retracing a finished drawing, where the replay and the original are the
    same pixels. `ink` is the same kind of thing for WEIGHT: a capture drawn
    at a third of full strength is still the capture, and a caller putting a
    second line over it needs the one underneath to stop competing.

STYLING. Five rules, prepended to <head> so shell.css and any page's own
<style> both override them on source order. They want hoisting into
shell.css, and are not there yet on purpose: that file was being edited by
two other hands when this landed and a component that only looks right next
to one page's stylesheet is the `choice.mjs` bug in a new costume.

<a id="scale"></a>

## xy-pad.mjs, SCALE

Fixed, not devicePixelRatio. The backing store is twice the grid on every
machine, so the ink a page counts off this canvas is the same number in a
headless run and on a retina laptop — a measurement that moves with the
display is not a measurement.

<a id="create-xy-pad"></a>

## xy-pad.mjs, createXyPad

@param host        where the canvas goes
@param o.label     what the pad is FOR, in words
@param o.x         {label, min, max, unit} — left edge to right edge
@param o.y         {label, min, max, unit} — TOP edge to bottom edge
@param o.onStart   (x, y, ev) a gesture began; the trace is empty again
@param o.onInput   (x, y, ev) EVERY sample, full rate, local — never throttled
@param o.onDone    (trace)    the gesture ended
@param o.value     () => ({x, y}) | null — where something ELSE says the point
                  is (a playhead, a remote peer). Drawn as the mark.
@param o.overlay   (ctx, view) — a second reading of the same gesture, drawn
                  over the capture. `view` = {W, H, px(x,y), colors, axes}.
@param o.upTo      () => number | null — draw the capture only as far as this
                  TIMESTAMP. See the note above `paint`; null draws all of
                  it, which is the default and what a pad with no playhead
                  over it always wants.
@param o.ink       () => number — how strongly to draw the capture, 0 to 1,
                  asked once a frame. Default 1, which is what a pad with
                  nothing drawn over it always wants. A caller putting a
                  SECOND reading of the same gesture on top knocks the
                  capture back with this so the two can be told apart:
                  a line drawn over white ink reads as one line in two
                  shades, whatever colour it is.

<a id="data-gesture"></a>

## xy-pad.mjs, data-gesture

`data-gesture` is how `verify.mjs` knows to DRAG across an element rather
than click it — a surface whose only input is a drag was a subject the
suite could not reach at all. It belongs to the component, so every pad
ever mounted is drivable without a page remembering to say so.

<a id="trace-colour"></a>

## xy-pad.mjs, trace colour

🔴 THE RECORDED LINE IS THE LOUDEST THING ON THE PAD. Everything else —
the grid, the axis names, the live numbers — is `--dim`, which also
leaves the capture as the ONLY near-white ink on the canvas, so a page
can count "is there a line here" off the pixels without counting its own
furniture.

<a id="ctx-font"></a>

## xy-pad.mjs, canvas fonts

⚠️ `ctx.font` IS NOT CSS-VARIABLE-AWARE. A canvas font string is parsed with
no element behind it, so `var(--sans)` is invalid, the assignment is
silently IGNORED and the label comes out in the 10 px default — a styling
bug that throws nothing and logs nothing. Resolve the token here instead.

<a id="stamp-at-source"></a>

## xy-pad.mjs, push

⚠️ STAMP AT SOURCE. `event.timeStamp` is the browser's own clock for when
the input happened; `performance.now()` read in the handler is when we got
round to it, and the gap between them is not a constant anybody could
subtract back out later.

<a id="coalesced"></a>

## xy-pad.mjs, getCoalescedEvents

⚠️ COALESCED. A browser hands one `pointermove` per frame and hides the
samples between; `getCoalescedEvents` is the difference between a record
of the INPUT and a record of the repaint.

<a id="drawing"></a>

## xy-pad.mjs, drawing

── drawing ─────────────────────────────────────────────────────────────
One paint per animation frame however fast the samples arrive. The CAPTURE
is full rate (above); a repaint per coalesced sample would be three or four
pictures nobody sees per frame, and it is the picture that is expensive.

<a id="grid"></a>

## xy-pad.mjs, 2x2 grid

🔴 HALVES, NOT QUARTERS: A 2x2 GRID. Decided 2026-09-16, *"2x2 grid is ok
in draw canvas"*. Three faint lines each way read as ruled paper and
invited the eye to count cells on a surface where nothing is measured in
cells; one line each way says the same thing the grid is for, which is
that this is two axes rather than a box, and says it with a quarter of
the ink. The centre is also the one position on the pad a reader can name.

<a id="up-to"></a>

## xy-pad.mjs, upTo

THE CAPTURE, and it is the loudest thing here.

⚠️ `upTo` CAPS IT AT A TIME, NOT AT A COUNT, and it is still rule 3 —
what is drawn is what was recorded, just not all of it yet. A caller
replaying its own capture uses this so the line grows under its playhead
instead of being retraced over a finished drawing, where the replay and
the original are the same pixels. A COUNT would make the caller work out
how many samples the browser coalesced into each frame, which is exactly
the thing only this file knows; a timestamp is what a playhead already
has. Out of range on the low side draws nothing, which is correct: at
position zero no part of the gesture has happened yet.

<a id="ink"></a>

## xy-pad.mjs, ink

⚠️ `ink` IS READ INSIDE A save/restore OF ITS OWN. A `globalAlpha` left
standing would be inherited by the overlay below, so a caller that dims
the capture would silently dim its own second reading by the same
amount — and the two would stay exactly as hard to tell apart as they
were, which is the one thing the option exists to fix.

<a id="show-mark"></a>

## xy-pad.mjs, showMark

and where something ELSE says the point is now — when the caller still
wants a mark for it. ⚠️ `showMark: false` is for a pad that ALREADY ENDS
ITS LINE AT THE PLAYHEAD: there, the mark is a second thing pointing at
the place the line already stops, and two indicators for one position
read as two positions. The value is still asked for and still reaches
`upTo`; only the dot is gone.

<a id="furniture"></a>

## xy-pad.mjs, furniture

🔴 THE PAD DRAWS NO FURNITURE — asked for, and right. It carried its name,
the live pair, and both axes' ranges written down the edges, and on a page
whose whole subject is a LINE that is five pieces of text competing with
the one thing you came to look at. The numbers were already on the page:
`across`/`down` name the axes in the strip's own gutters and the readout
carries the measurements.

⚠️ THE LABELS ARE NOT DELETED, ONLY UNDRAWN. `label`, `x.label` and
`y.label` still reach `aria-label` and `data-gesture`, which is what a
screen reader and the harness read — a pad that is silent to a person who
cannot see it is a different and worse thing than an uncluttered one.

<a id="mark"></a>

## xy-pad.mjs, mark

One dot with a border in the pad's own ground, so it reads over the line
without a ring around it (asked 2026-10-10, *"rm extra outline. make
bg-colored border on yellow dot"*).
In pad pixels, which are drawn at about half size on a page: the dot is
the old ring's size, and the border is the old gap between dot and ring.
