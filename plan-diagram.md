# plan-diagram — a picture of where the signal goes

Written 2026-09-13, from a session note: *"a flow diagram drawer… lightly
rounded rectangles, labels inside them, a title and description… good text
wrapping and cutting… arrows between them, horizontal mostly, maybe some
loopbacks… the whole thing is to explain how our demos work… boxes usually
represent devices on a network doing things, and maybe particular software
inside those devices… subtle colour coding, in general grey… start it in a kit
page… for now I need it for documentation, basically replacing the current big
description texts in the demo pages."*

⚠️ **Planned, not started.** No hurry was stated explicitly, so this document
is the deliverable until somebody says otherwise.

---

## 1. What it is for, which decides everything else

**Replacing the paragraph.** Every demo carries one `what` paragraph of three
or four sentences saying what happens and how. For pages whose subject is a
PATH — a key press that crosses a relay, reaches a Raspberry Pi, comes back as
audio — that paragraph is describing a shape, badly, in prose. A diagram is the
right instrument for a shape.

It is NOT a live instrument yet. The note says *"we could make it alive later,
maybe it ties into a graph-based approach"* — so the design must not preclude
that, and must not pay for it now.

That gives the first rule: **the diagram is a rendering of a DESCRIPTION, never
a drawing.** A page hands over a structure; nothing anywhere positions a box by
hand. When it goes live, the same structure grows a `state` per node and
nothing about the layout changes.

---

## 2. 🔴 The decision: SVG, with the text in SVG too

The note offers three: SVG, canvas, or a mix of DOM text with one of them.

**SVG, and the text goes in it.** The mixed approach — DOM text nodes
positioned over a canvas — is the one that sounds best and is worst here:

- It needs the layout computed twice, once to place the boxes and once to place
  the text over them, in two coordinate systems that drift apart the moment
  anything scales. Every zoom, every responsive reflow, is two things that have
  to agree.
- It cannot be exported, copied or screenshotted as one object.
- ⚠️ And this repo has a rule it would break immediately: *"joining a figure to
  its ink across two elements is what makes a legend necessary."* A label that
  is not inside its box is a label that can be beside the wrong box.

Canvas alone loses the thing the note asks for most — **good text wrapping and
cutting** — because canvas has no text layout at all, only `measureText`. Every
wrap would be hand-rolled, and the hand-rolled version is where the ellipsis
bugs live.

SVG gives: real text with real font metrics, `<title>` for the accessible name,
hover without hit-testing arithmetic, crisp at any scale, and one object to
copy. The cost is that SVG has no automatic wrapping either — see §5, which is
the one genuinely fiddly part and is worth doing once, properly, in a place
every diagram shares.

---

## 3. The middle layer: a small JSON, and NOT Mermaid

The note asks: *"Mermaid as a universal definition language or just JSON? What
is the middle layer?"*

**A small JSON dialect of our own.** Mermaid is the tempting answer and it is
wrong for this, for three reasons that are about this project rather than about
Mermaid:

1. **It has no vocabulary for the thing being drawn.** These boxes are DEVICES
   and the software inside them, on a network, with a boundary between what is
   ours and what is Cloudflare's. Mermaid has nodes and edges. Everything that
   makes the picture worth drawing would live in a class name smuggled through
   `classDef`.
2. **Its layout is not ours.** Mermaid runs dagre and puts things where dagre
   likes. The note asks for **left to right, mostly, with some loopbacks** —
   that is a lane assignment, not a general graph layout, and §4 does it in
   about thirty lines.
3. **It is a rendering dependency on a page that must stay self-contained.**

⚠️ But keep the door open: the JSON should be trivially derivable FROM a mermaid
string if somebody wants to author that way, and it should be a structure a
graph layer could later hand us. Nothing in it should be about pixels.

    {
      title: 'a key press, and what it costs',
      caption: 'one line under the diagram',
      nodes: [
        { id: 'you',   label: 'your browser',      sub: 'a key press',      kind: 'here'   },
        { id: 'relay', label: 'Cloudflare',        sub: 'passes it along',  kind: 'cloud'  },
        { id: 'box',   label: 'Raspberry Pi',      sub: 'plays the note',   kind: 'device' },
      ],
      links: [
        { from: 'you',   to: 'relay', label: 'note number' },
        { from: 'relay', to: 'box',   label: '' },
        { from: 'box',   to: 'relay', label: 'PCM', back: true },
        { from: 'relay', to: 'you',   label: '', back: true },
      ],
    }

⚠️ **AND THE FIRST VERSION OF THAT EXAMPLE BROKE §7'S OWN RULE.** It read
`sub: 'yoshimi → pappus'` and `'a Durable Object relay'` — two program names
and a piece of Cloudflare's vocabulary, in the very document that says a
diagram label is held to exactly the same standard as the paragraph it
replaces. A plan that demonstrates its own rule being broken is worse than one
that does not mention it.

**`sub` is the second level, and one level of nesting is enough.** The note
asks whether devices need to contain their software. They do not: a device with
its program named underneath reads as one thing that does one job, which is
what the picture is for. Real nesting buys a box-in-a-box and costs a layout
engine. If a demo ever needs two programs in one device, they are two nodes
with the same `kind` — and that will look right, because they ARE two things.

---

## 4. Layout: lanes, not a graph engine

Left to right, one column per step, computed from the links:

- **Column** = longest path from any node with no forward input. A cycle is
  broken by ignoring `back: true` links when computing it, which is exactly
  what makes a loopback a loopback.
- **Row** within a column = order of appearance, centred vertically.
- **Forward links** are straight, with a slight horizontal offset into the
  box's edge.
- 🔴 **`back: true` links route UNDER the row**, not between the boxes — a
  return path drawn through the forward path is the thing that makes signal
  diagrams unreadable. Under, with the arrow pointing back.
  ⚠️ **"AT A DEPTH THAT GROWS WITH HOW FAR IT TRAVELS" WAS WRONG AND IS
  CORRECTED.** Two return paths of IDENTICAL length that overlap — one spanning
  boxes 1–3, the other 2–4 — get the same depth from a distance rule and are
  drawn as one line, with the second silently absent. The implementation uses
  INTERVAL COLOURING instead (shortest first, shallowest free depth), which is
  strictly stronger and also keeps the picture shallower, because two paths
  that share no ground can share a depth. Proved by sabotage: a literal
  distance table fails two asserts, one of them *"two returns that share no
  ground share a depth"*.
- ⚠️ **A FORWARD CYCLE, which this section did not consider.** It happens the
  first time an author forgets `back: true`. Left alone the column relaxation
  runs to its cap and returns 14/15/16 — a seventeen-box-wide picture of a
  three-step path. Links pointing at an earlier box in the spec's own node list
  are dropped, with a warning.
- **Below ~560 px the whole thing becomes one column, top to bottom**, and the
  loopbacks route to the left. A horizontal diagram on a phone is a diagram
  nobody reads.

---

## 5. ⚠️ Text wrapping is the actual work

SVG has no wrapping. `<foreignObject>` is the standard answer and is the wrong
one — Safari's support is patchy and it re-introduces the two-coordinate-system
problem §2 rejects.

So: measure and break, once, in a shared helper.

- Measure with a hidden `<text>` in the same SVG and `getComputedTextLength()`
  — the real font metrics, not an estimate.
- Break on words; a word longer than the box is broken mid-word rather than
  allowed to overflow.
- **Cutting is a LAST LINE with an ellipsis, and the full text stays in
  `<title>`** so the browser shows it natively on hover and a screen reader
  reads all of it. ⚠️ And per CLAUDE.md: *"anything that truncates with an
  ellipsis is in the wrong place"* — that rule is about gutters and readouts,
  and it applies here as a WARNING to the author, not as a feature to hide
  behind. A label that needs cutting is a label that is too long; the drawer
  should be able to report, in the kit page, which labels it had to cut.
- Two lines for a `label`, one for a `sub`. Past that the box grows rather than
  the text shrinking — a smaller font in one box is a diagram with two type
  sizes and no reason.

---

## 6. Colour: grey, with a tint that is almost not there

The note: *"subtle colour coding, very subtle, in general grey, mix in some
colours to grey, but don't go muddy by mixing in yellows."*

- The field, the boxes and the arrows are `--line2` / `--card2` / `--dim`.
  ⚠️ **NOT `--line` for an edge**: #1f2937 on `--card` (#11151d), which is the
  background of every `/kit/` block, is not a border anybody can see.
- A `kind` mixes **8–12% of a hue into the stroke and 4% into the fill**, no
  more. At that strength it reads as "these two are the same sort of thing"
  without reading as a legend.
- ⚠️ **No yellow, and the reason is structural rather than taste.** `--hi` is
  #ffd400 and this project uses it for exactly one thing — the playhead, the
  primary control, the thing you are meant to look at. A yellow-tinted box
  would be competing with that everywhere it appears, and mixed into grey it
  goes muddy, which the note says independently.
- 🔴 **Colour must not be the only channel.** One meaning for colour across
  every demo is already a rule here; a `kind` also decides the box's SHAPE
  detail — a device gets a heavier stroke, a cloud a dashed one, `here` a
  solid fill — so the picture survives greyscale and colour blindness.

---

## 7. Where it starts, and what it replaces

**`/kit/`, first and for real.** The kit page is where a component is looked at
without a board, a relay or a stream, and this one needs it more than most: the
only way to know the wrapping is right is to see six diagrams with awkward
labels side by side. The kit section should draw:

- the two-hop signal path in §3 (the note's own example: browser → boundary →
  Pi → Cloudflare → browser),
- one with a deliberately over-long label, to show the cut,
- one with two loopbacks that must not overlap,
- one at phone width.

**Then one demo page adopts it**, and `grains` is the obvious first: it is two
granulators in two buildings with a relay between them, and its `what`
paragraph is currently three sentences doing a diagram's job. The paragraph
does not vanish — it becomes a **caption**, which is what the note asks for.

⚠️ **A diagram is not exempt from the writing rules.** No jargon in a label, no
internal vocabulary, and every word a visitor sees is held to the same standard
as the paragraph it replaces. A picture is a better place to put a shape and a
worse place to hide a word nobody understands.

---

## 8. Hover, which is named and deliberately not built

The note: *"it would be nice to have hover effects which explain maybe under a
diagram what the things do. Do not implement the tooltips really."*

So: **hovering a node highlights it and writes its `sub` into a line UNDER the
diagram**, in the space the caption already occupies. Not a tooltip — a tooltip
is drawn on top of the thing it describes, is read every time you point at one,
and this project has a rule limiting it to two or three short lines for exactly
that reason. A line under the picture is read in place, has room, and costs no
positioning code at all.

`<title>` on each node gives the native browser tooltip for free, which is the
accessible path and needs no work.

---

## 9. What this is not

Not a graph editor. Nothing drags, nothing is authored in the browser.

Not live. No node has a state, a count or a rate. When that comes — and §1 says
it should not be precluded — it arrives as a `state` on a node in the same
JSON, and the layout will not change, which is the whole reason the description
and the drawing are separate things.

Not a replacement for a measurement. A diagram says where the signal goes; the
readout says what happened to it. A page that draws a path it has not measured
is a page illustrating its own settings, which this repo has shipped once and
should not ship again.
