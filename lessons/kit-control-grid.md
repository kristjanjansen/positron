# Kit lessons: control-grid

The longer comments cut from `demo/shell/control-grid.mjs` and `demo/shell/control-grid-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-control-grid.md#<anchor>`.

<a id="header"></a>

## `control-grid.mjs` module header

```text
demo/shell/control-grid.mjs — controls on a square lattice, any count by any.

🔴 THE ASK, 2026-09-22, WITH A CROP OF FOUR KNOBS: *"make component for know
etc grid where centers of 2x2 knobs make square etc"*, and then *"it can be
any x y count of elements, right?"*. Yes, and the arithmetic is the same
whatever the counts are.

🔴 WHY A ROW OF KNOBS AND A COLUMN OF KNOBS DO NOT AGREE BY THEMSELVES. A
control is a working surface and furniture: `--ctl-head` above it and
`--ctl-foot` below, which `shell.css` declares and `positron-ui` calls the
contract. So the distance between two dial centres ACROSS is the dial's width
plus one gap, and the distance DOWN is the dial's height plus the value line
plus the label plus the sub plus one gap. On `/plai/` that was 46 px across
and about 100 down, so four knobs made a tall rectangle and were reported as
one.

✅ **THE FIX IS TO WIDEN THE COLUMN PITCH TO MATCH THE ROW PITCH, NEVER TO
SHRINK THE ROW.** Cutting the furniture is cutting the value readout or the
label, and both are the only things naming what the control does. A knob
narrow enough to make the square by shrinking is the one `positron-ui`
already refuses: *"a pad narrow enough to fit a phone is one nobody can
hit"*, one component along.

⚠️ **AND THE DIAL'S OFFSET INSIDE ITS CELL DOES NOT MATTER**, which is what
makes this cheap. A dial sits high in its cell, under the value and above the
label. It sits at the SAME height in every cell, so equal pitches put the
centres on a square lattice whatever that offset is. Nothing here has to know
where the dial is.

🔴 **THE PITCH IS MEASURED, NOT TYPED.** A row's height is whatever the
labels come to, a sub that wraps changes it, and a caller who typed a number
would be typing a guess that goes stale the first time a label grows. This
reads the first cell back off the page and writes `--cg-pitch`, which is the
same arrangement `step-grid.mjs` uses for `--pg-cell` and for the same
reason: the token is written from script because no stylesheet can know it.
⚠️ A CUSTOM PROPERTY AND NEVER THE PROPERTY, so a page can still take it
back. `video-panel.mjs` wrote `style.aspectRatio` from an option and left one
page's picture square on a 16:9 screen.
```

<a id="pitchfor"></a>

## `control-grid.mjs` pitchFor

```text
The pitch two centres should sit at, given a cell's natural size and a gap.

🔴 PURE AND EXPORTED SO IT CAN BE GRADED WITH NO BROWSER, which is the half
of this component that has arithmetic in it. Everything else needs a layout.
⚠️ IT TAKES THE LARGER OF THE TWO AND NEVER THE AVERAGE. A square whose side
is the mean of a wide cell and a tall one fits neither: the tall content
overflows its cell and the wide content is clipped. The lattice is as big as
its biggest cell needs.
```

<a id="cols"></a>

## `control-grid.mjs` cols refused

```text
🔴 REFUSED RATHER THAN GUESSED, FOR THE REASON `knob.mjs` REFUSES A KNOB
WITH NO LABEL. A grid that picked its own column count would pick a
different one as the list grew, so the shape would be a property of how
many controls a page happened to have rather than a decision anybody made.
```

<a id="size"></a>

## `control-grid.mjs` size

```text
Measure one cell and write the pitch both tracks use.

⚠️ **THE WIDEST AND THE TALLEST, NOT THE FIRST.** A row of knobs whose
labels are `FM` and `HARMONICS` has two different widths, and sizing the
lattice off cell zero would clip whichever cell is bigger than it. This
walks them.
⚠️ AND IT RETURNS THE NUMBERS RATHER THAN LOGGING THEM, so a check can ask
what it decided instead of reading pixels back and hoping.
```

<a id="computed-size"></a>

## `control-grid.mjs` size: computed size

```text
🔴 THE LAID OUT SIZE, NOT THE RECT, SINCE 2026-10-06. A rect is the
   box AFTER every transform above it, and a grid scaled into a slide by
   `fitBox` (`slide.mjs`) measured its cells at the slide's scale, wrote
   that as its pitch and then drew at it scaled AGAIN: on the front
   page's synths deck the knobs were clipped to their values, the dials
   and names cut off. The computed width and height are the box before
   any transform, and for a grid nobody scales they are the rect's own
   numbers, so no other page moves.
```

<a id="centres"></a>

## `control-grid.mjs` centres

```text
Where each cell's DIAL sits, which is what the request was about.
⚠️ IT LOOKS FOR A DIAL AND FALLS BACK TO THE CELL, because this grid
takes any control and only a knob has one. A check on a grid of faders
gets the cell's own centre, which is the same claim one element out.
```

<a id="test-header"></a>

## `control-grid-test.mjs` control-grid-test module header

```text
demo/shell/control-grid-test.mjs — the lattice arithmetic, without a browser.

🔴 WHAT THIS FILE CANNOT SEE, SAID AT THE TOP. `createControlGrid` measures a
laid out cell, so the grid itself is graded on `/kit/`, where the check reads
the DIAL CENTRES and compares the distance across against the distance down.
That is the claim the component exists to make and it needs a layout.
What is graded here is `pitchFor`, which is where the arithmetic lives, and
the two refusals.
```

<a id="test-larger"></a>

## `control-grid-test.mjs` test: pitch is the larger side

```text
🔴 THE LARGER OF THE TWO, NEVER THE AVERAGE, AND THIS IS THE ONE DECISION
IN THE FILE. A knob is about 46 px of dial and about 100 px of dial plus
value plus label plus sub, so a mean of 73 would clip the label on every
cell while leaving the dial swimming. The lattice is as big as its biggest
cell needs and the square comes from the pitch being ONE number.
```

<a id="test-fixed"></a>

## `control-grid-test.mjs` test: fixed pitch tracks

```text
🔴 THE COLUMNS ARE A FIXED PITCH AND NEVER `1fr`, AND IT IS WORTH AN
ASSERT BECAUSE `1fr` LOOKS RIGHT. A fractional track stretches with its
container, so the lattice would be square at exactly one width and a
rectangle at every other, which is the defect this component exists to fix
arriving through the stylesheet instead.
```
