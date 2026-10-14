# Kit lessons: glue

The longer comments cut from `demo/shell/glue.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-glue.md#<anchor>`.

<a id="header"></a>

## `glue.mjs` module header

```text
demo/shell/glue.mjs — two or more blocks as ONE surface.

🔴 ASKED FOR 2026-09-18: *"do same treatment as for readout/logs for
transport + timeline: can be separate or glued togehter"*. The readout and
the log already had it (`mount({ joined: true })`), and the look they invented
turned out not to be about readouts or logs at all: one border round the lot,
a 1 px seam of `--line` between the parts, and the children giving up their
own border and radius to the box. That is now `.pos-glue` in shell.css and
this file is the way a page reaches it.

⚠️ SEPARATE IS STILL THE DEFAULT FOR A PAIR A PAGE GLUES ITSELF, and that is
the point of the word "can" in the ask. Two blocks a page gap apart are two
surfaces and the stack already spaces them; gluing is a CLAIM that they are
one object, which is true of a strip sitting on the transport bar that drives
it and false of most other neighbours. A page that does not ask keeps what it
has.
🔴 THE READOUT AND THE LOG ARE NO LONGER ONE OF THOSE PAIRS, SINCE
2026-09-28. Instructed: *"global: move all reading sections atop of the logs
and glue them (you have patterns). use you new glueing code for this, see the
kit"*. That claim is now made once, for every page, by `createReport` in
shell.mjs, which builds its surface with `createGlue` below. So the sentence
above is about a pair somebody assembles on a page, not about the report.

⚠️ WHY THIS IS NOT `createStack(host, 'pos-glue')`. A stack owns the AIR
between blocks and a glue owns the absence of it: `.pos-stack`'s children
carry `margin-top: var(--pos-gap)`, so an element that is both would space
its parts by the page rhythm and then draw a seam in the middle of that gap.
They are opposites wearing the same shape, and one function that did both
would take a flag saying which.

⚠️ AND A GLUE OF ONE BLOCK IS THAT BLOCK, UNWRAPPED. A box drawn round a
single child is a second border over the one the child already has, which is
the doubled-edge defect `.pos-report` exists to avoid at the other end (a
report holding only a log draws one border and no seam). A page building its
blocks conditionally therefore cannot accidentally gain an edge.
```

<a id="no-imports"></a>

## `glue.mjs` div, no imports

```text
🔴 AND THIS FILE IMPORTS NOTHING, BECAUSE `shell.mjs` IMPORTS IT. It read
`import { el } from './shell.mjs'` until 2026-09-28, which is why
`createReport` had to hand-roll its own `<div class="pos-glue">` rather than
call the function below: shell.mjs importing this would have been a cycle in
the frame every page mounts, and `createReport`'s own header says so at
length. `stack.mjs` already answered this exact question the same way and
writes out why — the three calls here are `el('div', cls)` with no text and
no attributes, so `div()` below is the whole of what was borrowed.
```

<a id="rows"></a>

## `glue.mjs` ROWS

```text
── ROWS: the same surface, built up one row at a time ───────────────────────
   In this file because createGlue and this are one surface with two interfaces.
   A row paints its own ground (the seam is the glue's line-coloured background
   through a 1 px gap, and a child with none paints seam colour over its whole
   area), is a flex box (which blockifies a canvas or textarea, the /fau/ 1.5 px
   baseline strip), and can be hidden without leaving a seam (display: none
   takes no gap). Every `.pos-glue > X` patch in shell.css is also `> * > X`,
   because pages wrap their parts inconsistently.
```

<a id="full-grid"></a>

## `glue.mjs` full and grid

```text
`full`: the surface takes the width it is given rather than its content's.
A surface is its own size by default; a strip across a page is not.
`grid`: every row is a subgrid on the surface's two columns, label and
control, so three such rows share one pair of lines rather than each
putting its control where its own label's width left it.
```

<a id="empty"></a>

## `glue.mjs` empty surface

```text
🔴 A SURFACE WITH NO ROWS DOES NOT PAINT ITS EDGES, AND IT IS `hidden`
RATHER THAN NOT APPENDED. `createGlue` above returns `null` for nothing,
which it can because it is handed everything at once; this one is appended
to a page before its first row exists, so the empty state has to be a state.
It is the same answer `table.mjs` gives with `blank()`: the container is
built, it is hidden, and the first row clears it with nothing for a caller
to remember. The defect it avoids is `/typist/`'s: an empty bordered box
renders as a horizontal rule nobody wrote.
```

<a id="row"></a>

## `glue.mjs` row

```text
Add a row, and put things in it.

@param {Element|object|Array} [content] an element, anything with an `el`,
  or an array of either. `null` entries are SKIPPED, the same way
  `createStack().add` and `createGlue` skip them and for the same reason: a
  caller asks for a row's contents in one call and one of them is usually
  conditional, and an `if` around an append is how a control ends up
  somewhere else.
@param {object} [opt]
@param {boolean} [opt.pad]   `false` for a row whose content goes edge to
  edge, which is what a picture wants. The surface's own default otherwise.
@param {string} [opt.align]  one of ROW_ALIGN.
@param {string} [opt.cls]    extra classes for this row.
@param {Element} [opt.before] put this row in front of that one.
@returns {Element} the row.
```

<a id="between"></a>

## `glue.mjs` align between

```text
🔴 A JUSTIFIED ROW HAS TWO ENDS. With one item per wrapped line
`space-between` parks it at the start, so two ends go linear on a phone
by themselves, at their own sizes; three or more justify each wrapped
line separately, which is the defect /nola/'s footer shows at 375. A
caller with more than two things has two rows or a cluster.
```

<a id="data-align"></a>

## `glue.mjs` data-align

```text
⚠️ THE VALUE IS ALWAYS WRITTEN, never left empty to mean off. An attribute
   selector matches on PRESENCE, which is the defect `video-panel.mjs`
   shipped: `dataset.full = full ? mode : ''` kept every full-screen rule
   applying to a panel that had been full once.
```

<a id="remove"></a>

## `glue.mjs` remove

```text
Take a row out.

⚠️ IT IS A NO-OP ON ANYTHING THAT IS NOT A ROW OF THIS SURFACE, rather than
a throw, for the reason `panel-layout.mjs`'s `unband` gives: a caller
swapping parts calls this on whatever it is holding and half of those have
already gone.
⚠️ AND THE SURFACE GOES BACK TO HIDDEN WHEN THE LAST ONE LEAVES, because
the empty state is the same empty state whether it was never filled or has
been emptied.
```
