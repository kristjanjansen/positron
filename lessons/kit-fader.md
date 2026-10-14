# Kit lessons: fader

The longer comments cut from `demo/shell/fader.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-fader.md#<anchor>`.

<a id="header"></a>

## `fader.mjs` module header

```text
demo/shell/fader.mjs — a slider that stands up, and says where its value came
from.

🔴 IT WAS PARKED FOR AN HOUR AND THE REASON IS WORTH KEEPING. It was written
to put the Circuit's eight macros on screen, and that was the wrong shape:
**the Circuit has eight rotary KNOBS and no fader on it anywhere.** Reported
in four words the moment it was proposed, *"circuit has no vert fader"*.
Every number behind the proposal was measured and correct, and the control it
was drawn as was still wrong, because a CC number says what TRAVELS and says
nothing about what a hand TOUCHES. **Measure the device, then look at it.**

✅ IT IS IN USE AGAIN, ASKED FOR 2026-09-20 as *"make exmaples with knobs,
haldpads, fullpad and vert slider under each other"*. And it is the right
component for the Model 12, which has eight channel faders and an FX fader,
measured sending pitch bend on channels 1 to 9.

🔴 WHY A SECOND SLIDER EXISTS AT ALL, BECAUSE THIS PROJECT'S RULE IS TO USE
THE ONE IN THE KIT. `slider.mjs` is a three column grid: a label, a lane and a
number, side by side, sharing columns across a group so several of them line
up. That shape is the whole component and it is horizontal by construction.
Eight of them stacked is 8 rows deep and unreadable as a bank.
What a hardware bank wants is the opposite: eight narrow columns side by side,
which is how every mixer and every macro row on every synth is laid out,
because a person compares them ACROSS rather than reading them down.
⚠️ ASKED FOR 2026-09-20 in the device layout work: *"perhaps we could use our
sliders vertically"*.

🔴 AND THE PART THAT IS NOT ABOUT ORIENTATION: A FADER HERE KNOWS WHETHER A
HAND OR A PIECE OF HARDWARE LAST MOVED IT. A control bound to a knob in the
room is a control with two masters, and a page that cannot tell them apart
cannot report the one failure that matters, which is a binding that has
quietly stopped arriving. A fader that has never heard from its hardware looks
exactly like one whose hardware is unplugged.
⚠️ THE SOURCE IS A COUNTER, NEVER A FLAG. CLAUDE.md: a counter beats a state
when a check runs next to an event. `hardwareMoves()` counts what has EVER
arrived, so a check asking "is this binding live" cannot be satisfied by an
instant that happens to be true.
```

<a id="createfader"></a>

## `fader.mjs` createFader

```text
One vertical fader.

@param {object} o
@param {string} o.label     under the lane, uppercased by CSS. Keep it short.
@param {string} [o.sub]     a second, dimmer line under the label: `CC 80`.
@param {number} [o.min]     default 0, because these are MIDI controllers
@param {number} [o.max]     default 127
@param {number} [o.value]   where it starts, default the midpoint
@param {string} [o.title]   hover text on the whole control
@param {boolean} [o.hand]   an invisible hand: one button that makes this
  fader move by itself, for watching a binding without touching the desk.
  🔴 **IT USES `hand.mjs`'s PLANNER, NOT A LOOP OF ITS OWN.** `slider.mjs`
  already drives a control from `plan()` and `positionAt()`, and a second
  implementation of the same idea is how two controls come to move
  differently while both claim to be doing the same thing.
  ⚠️ **THE GLYPH ROTATES.** `⇄` is a left and right pair, drawn for a
  horizontal lane. On a fader it is turned 90 degrees, because an arrow
  pointing across a control that moves up and down is a picture of the wrong
  gesture.
@param {(v:number, from:string)=>void} [o.onInput]   every move
@param {(v:number, from:string)=>void} [o.onChange]  on release and on a key
@returns {{el:HTMLElement, set:Function, value:()=>number, source:()=>string,
           hardwareMoves:()=>number, handMoves:()=>number, destroy:Function}}
```

<a id="byhand"></a>

## `fader.mjs` byHand

```text
⚠️ `byHand`, NOT `hand`. The option added later is called `hand`, and a
counter sharing its name is a SyntaxError at module load that takes every
page importing this file down with it. Second time in this kit: `knob.mjs`
had the same collision between an `arc` option and its `arc` element.
```

<a id="lane"></a>

## `fader.mjs` lane

```text
🔴 A LANE AND A HANDLE, AND NO FILL. `.sld-knob` is the slider's whole
reading and this is the same control turned 90 degrees, so a fill would be
the value said twice by two elements that can disagree by a pixel.
```

<a id="lane-focus"></a>

## `fader.mjs` lane focus

```text
🔴 THE LANE IS THE FOCUSABLE THING, NOT THE WRAPPER. A wrapper that takes
focus puts the ring round the label and the number too, which reads as the
whole column being selected rather than as a control being steerable.
```

<a id="cap-position"></a>

## `fader.mjs` cap position

```text
⚠️ A SHARE OF THE TRAVEL, NEVER OF THE HEIGHT, so both ends land flush.
`slider.mjs` does the same arithmetic on `left` and its comment says why.
```

<a id="data-from"></a>

## `fader.mjs` data-from

```text
⚠️ AN ATTRIBUTE, NOT A CLASS, and DELETED rather than emptied when there
is no source. `[data-from]` matches on PRESENCE, so `= ''` would leave a
fader that had been touched once looking touched for the rest of the
page's life. That exact bug was measured in `video-panel.mjs` on
2026-09-19 and it survived because entering a state is what gets tested.
```

<a id="the-hand"></a>

## `fader.mjs` the hand

```text
── the hand ───────────────────────────────────────────────────────────

⚠️ POINTER EVENTS, NOT MOUSE EVENTS, and capture on the LANE so a drag that
leaves the column keeps steering it. A fader 34 px wide is one a finger
slides off constantly.
```

<a id="glyph-span"></a>

## `fader.mjs` hand glyph span

```text
⚠️ THE GLYPH IS IN A SPAN BECAUSE A TRANSFORM NEEDS AN ELEMENT. Rotating
the button would turn its border too; rotating a bare text node is not
possible at all.
```

<a id="hand-glyph"></a>

## `fader.mjs` hand glyph

```text
🔴 `hand.mjs`'s OWN GLYPH, ROTATED. It was swapped for two geometric
triangles because U+21C4 has an emoji presentation and rendered in
colour; asked back on 2026-09-21, *"keep ⇄ emoji just 90rot"*, and the
emoji rendering is accepted rather than worked around.
⚠️ **THE POINT IS THAT IT IS THE SLIDER'S GLYPH.** A fader and a slider
running the same planner should wear the same mark, and a substitution
here would be the two drifting apart over a rendering detail.
```

<a id="hand-button"></a>

## `fader.mjs` hand button placement

```text
🔴 BELOW THE LANE, SQUARE, JOINED TO IT. Corrected 2026-09-21: *"no.
soubl be on bottom and keep ⇄ emoji just 90rot, be square"*.
⚠️ **SO WHAT A PAD COLUMN LINES UP WITH IS THE FADER'S LAST CONTROL, NOT
ITS LANE.** With the button underneath, the lane ends 33 px above the
fader's controls do, and the honest fix is the check knowing that rather
than the page pushing the pads around to hide it. A hand is a mode: it
changes where the control ends, and everything beside it ends there too.
```

<a id="plan"></a>

## `fader.mjs` plan regenerated

```text
⚠️ THE PLAN IS REGENERATED WHEN IT RUNS OUT, so a hand left on does not
repeat itself. Same reasoning as the slider's own loop.
```

<a id="counters"></a>

## `fader.mjs` hardwareMoves

```text
🔴 COUNTERS, so "is this binding live" is answerable after the fact.
```

<a id="createfaderbank"></a>

## `fader.mjs` createFaderBank

```text
Several faders in a row, which is the only reason a vertical one exists.

⚠️ IT SCROLLS SIDEWAYS RATHER THAN SHRINKING. Eight faders at 34 px plus gaps
do not fit a 390 px phone, and a fader narrow enough to fit is one a finger
cannot hit. `overflow-x` cannot shrink a flex item below its content, so the
row carries `min-width: 0` on the scroller, which is the trap CLAUDE.md
records: without it the PAGE drags sideways instead of the row.

@param {ReturnType<createFader>[]} faders
@param {object} [o]
@param {string} [o.label]  a gutter word above the row
```
