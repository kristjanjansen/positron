# Kit lessons: param-knobs.mjs, param-knobs-test.mjs

The long comments cut from `demo/shell/param-knobs.mjs` and `demo/shell/param-knobs-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-param-knobs.md#<anchor>`.

<a id="header"></a>

## param-knobs.mjs, file header

demo/shell/param-knobs.mjs: one row of knobs under a program's text, one
knob per parameter the program declares, rebuilt after every compile.

Asked 2026-09-30: *"what about variables in code ... that are under the code
and adjust parameters in real time"*, then *"do test with single knob laer.
can we do it on fau too?"*. `/collide/` and `/fau/` both hand this the list
their compiler read out of the program, and both are the same row.

🔴 THE PAGE SAYS WHAT A PARAMETER IS, AND THIS SAYS NOTHING ABOUT A LANGUAGE.
A parameter is `{ name, value, min, max, warp, step }`: SuperCollider's
`ControlSpec` fields, because they are the richer of the two (a Faust
`hslider` is `min, max, step` and a linear warp, or `[scale:log]`, which is
the exponential one). What a turn DOES is the page's `onChange(name, value)`:
`/n_set` on every sounding node there, `setParamValue` on the worklet here.

🔴 A KNOB KEEPS ITS VALUE ACROSS A RECOMPILE WHEN ITS NAME SURVIVES. `set()`
is called with every compile's list; a name that was there before keeps the
value a hand left it at, held inside the new range, and a new name starts at
the value the program wrote. `set()` answers with every value it settled on,
so the page can hand them to whatever the new program is running in.

🔴 THE KNOB TURNS 0 TO 1 AND THE WARP IS HERE. `knob.mjs` is linear, and an
exponential range on a linear dial puts 0.05 to 3 seconds of a 0.05 to 6
release in the first half of the travel and nothing a hand can find below
0.2. So the dial runs 0 to 1, exactly as a `ControlSpec` is mapped in
sclang, and `mapSpec` and `unmapSpec` are `ControlSpec.map` and `.unmap`
with their warps (`Spec.sc`, read at supercollider 19954900). The number
under the dial is the mapped value through the knob's own `format`, at a
number of places decided once per knob (`placesFor`), because a string that
gains and loses a decimal while it is turned is what `knob.mjs` was told to
stop doing.

🔴 THE ROW KEEPS ONE KNOB'S HEIGHT WHEN THERE IS NOTHING TO TURN, SINCE
2026-09-30. Asked: *"make the area h for thise buttons fixed so no junmp"*.
It was `hidden` with no knobs in it, so picking a preset with no parameter
(the Growl on `/collide/`, the Organ on `/fau/`) pulled the keyboard under
it up by a knob's height, and picking one with a parameter pushed it down
again, under the hand that was about to play it.
⚠️ THE RESERVE IS A KNOB, NOT A NUMBER. An empty row holds a lattice of one
knob that is `visibility: hidden`, `inert` and `aria-hidden`, alone in
the row, so the height is whatever a knob is today and
cannot disagree with it when the knob grows a label. A typed `min-height`
would be a second copy of the knob's height in a second file.
⚠️ AND IT SAYS NOTHING. It carried the words `no knobs in this program`
for its first afternoon, and they went on *"rm no knobs in this program"*
(2026-09-30): the band stays a knob tall and empty.

🔴 EVERY KNOB HAS AN INVISIBLE HAND, SINCE THE SAME DAY. Asked: *"add
invisible hands to these cutoff buttons"*. It is `knob.mjs`'s own `hand`,
whose moves come out of the knob's `onInput` exactly as a drag does, so
they reach the page's `onChange` through the same warp and the same spec.
⚠️ A RECOMPILE THAT KEEPS THE NAME KEEPS THE HAND RUNNING, and one that
drops the name stops it. Every knob is rebuilt on every `set()`, so the old
hand is STOPPED before its knob is thrown away (a hand on a detached knob
would go on calling `onChange` from a frame loop nobody can see), and the
new knob's hand is started with the same movement.

⚠️ `onHold(name, on)` IS A POINTER ON THE DIAL, so a page can light the
parameter's text in the code while a person holds its knob. It is here
rather than on the page because the knobs are rebuilt here, and a listener
a page attached would be on a knob that no longer exists after the next
compile.

⚠️ THE HOOK FOR COLOUR, AND NOTHING ELSE ABOUT COLOUR. Every knob carries
`data-param="<name>"`, and `shell.css` draws its arc, its name and its
number in `hsl(var(--param-hue) ...)` when a `--param-hue` is set on it or
above it, and in the ordinary inks when not. The page sets it, from the one
hue book the code box reads (`code-lang.mjs`, `createHueBook`), so a
parameter's text and its knob cannot disagree. Nothing here sets a hue.

<a id="lattice"></a>

## param-knobs.mjs, createParamKnobs(), the lattice

🔴 ON THE KIT'S LATTICE, SINCE 2026-09-30: *"use knob grid on those
    dynamic knobs"*. `createControlGrid` is what `/knobs/` lays its knobs on:
    every cell one measured pitch wide and tall, so two knobs' centres sit a
    square apart whatever their labels say. A plain bank spaced them by their
    label widths. One row of up to `COLS`, `/knobs/`' own gap; the old
    lattice is destroyed on every rebuild, because it holds a ResizeObserver.
⚠️ `cols` IS AN OPTION SINCE 2026-10-06, default 4 so `/fau/` and
`/collide/` are unchanged: the synths deck's LFO slide declares five
sliders and a fifth knob on a second row took the code's room

<a id="measure-attached"></a>

## param-knobs.mjs, set(), measured once attached

⚠️ MEASURED AGAIN ONCE ATTACHED. The lattice sizes its pitch when it is
      built, which is before it is in the page, and a detached cell measures
      0 px: the ResizeObserver repairs that a frame later, but a caller that
      reads the row's height straight after `set()` got 0. MEASURED on `/kit/`.

<a id="test-header"></a>

## param-knobs-test.mjs, file header

demo/shell/param-knobs-test.mjs: the knob row's arithmetic, with no browser.

  node demo/shell/param-knobs-test.mjs

🔴 WHAT THIS CAN AND CANNOT GRADE. `createParamKnobs` needs a `document`, so
the row, the rebuild and the value kept across a recompile are graded on
`/kit/`, `/collide/` and `/fau/`. What is graded here is `mapSpec`,
`unmapSpec` and `placesFor`, against numbers worked out by hand from
`ControlSpec` and its warps in SuperCollider's `Spec.sc` (read at 19954900),
which is a different source from this file's own arithmetic.

🔴 NEGATIVE CONTROLS, per this directory's convention: a linear map passes
every check at the ends of an exponential range, because both warps agree
there, so the middle is what separates them. MEASURED 2026-09-30, 14 ok,
then three sabotaged copies of the module (`PK_MODULE=<path>`):

  `exp` mapped as `lin`                      2 red, the middle and the round trip
  the step never applied                     1 red, the step check
  places from the linear rule on `exp`       1 red, the release's 0.05
