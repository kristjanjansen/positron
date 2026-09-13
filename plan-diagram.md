# plan-diagram — a picture of where the signal goes

Written 2026-09-13, from a session note: *"a flow diagram drawer… lightly
rounded rectangles, labels inside them, a title and description… good text
wrapping and cutting… arrows between them, horizontal mostly, maybe some
loopbacks… the whole thing is to explain how our demos work… boxes usually
represent devices on a network doing things, and maybe particular software
inside those devices… subtle colour coding, in general grey… start it in a kit
page… for now I need it for documentation, basically replacing the current big
description texts in the demo pages."*

⚠️ **Built.** `demo/shell/diagram.mjs`, six blocks in `/kit/`, `grains` drawing
its own path. This document is the brief and the record of what was corrected
in it; where a section was wrong, the correction is written into that section
rather than at the end, so nobody reads the wrong half first.

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

SVG gives: real text with real font metrics, an accessible name (`aria-label` —
see §8 for why NOT `<title>`), hover without hit-testing arithmetic, crisp at
any scale, and one object to copy. The cost is that SVG has no automatic wrapping either — see §5, which is
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
        { id: 'box',   label: 'Raspberry Pi',                               kind: 'device',
          note: 'A small board in the studio with **a speaker on it**.',
          children: [
            { id: 'synth', label: 'a synthesiser', sub: 'plays the note' },
            { id: 'rec',   label: 'a recorder',    sub: 'keeps a minute' },
          ] },
      ],
      links: [
        { from: 'you',   to: 'relay', label: 'note number' },
        { from: 'relay', to: 'synth', label: 'the same number' },
        { from: 'rec',   to: 'relay', label: 'the sound', back: true },
        { from: 'relay', to: 'you',   label: 'the same',  back: true },
      ],
    }

🔴 **AND EVERY ARROW IS NAMED, WHICH THIS EXAMPLE ORIGINALLY WAS NOT.** Two of
its four links had `label: ''`, which draws a line saying only "these two are
connected" — a thing the reader could already see. Asked for directly: *"add
labels to all diagram connectors."* A name says what CROSSES, never what the
arrow does: `four settings`, `the sound it made`, `every grain it fired`.
`connects to`, `sends to` and `next` are the arrowhead in words and are worse
than leaving it bare. Where a relay hands on exactly what it was given, the
second hop says `the same four` — which is the fact, and inventing a different
word for it would be a small lie.

⚠️ **AND THE FIRST VERSION OF THAT EXAMPLE BROKE §7'S OWN RULE.** It read
`sub: 'yoshimi → pappus'` and `'a Durable Object relay'` — two program names
and a piece of Cloudflare's vocabulary, in the very document that says a
diagram label is held to exactly the same standard as the paragraph it
replaces. A plan that demonstrates its own rule being broken is worse than one
that does not mention it.

**`sub` is the second level** — and 🔴 **"REAL NESTING IS NOT WORTH A LAYOUT
ENGINE" WAS WRONG AND IS CORRECTED.** This section said a device with its
program named underneath "reads as one thing that does one job, which is what
the picture is for". It reads as one thing because it IS drawn as one thing,
and that is the bug: `grains` shipped `this page` / `a granulator in it`, and
the person it was written for said the picture *"does not show that this page
has a granulator inside it"*. A `sub` is a second line about the SAME box; a
program running on a machine is a second BOX. The fallback this section offered
— two nodes with the same `kind` — was tried in `grains` and withdrawn, because
side by side they are a FORK, and a fork is the one shape that was not drawable
at all until §4 was corrected. Two things that are not beside each other should
not be drawn beside each other.

**A box may hold boxes, one level deep.** `children` on a node. The container
is measured from what is in it plus its padding, in both layouts; every box in
the picture then takes the tallest height, which is the rule that was already
there for two lines of type. A link may name the container or any box inside
one. What it cost: about 90 lines, and every layout with nothing nested comes
out **byte-identical** — 272 of 272 across eight descriptions, two rulers and
seventeen widths, plus an in-suite check that a box with nothing in it carries
no trace of the nesting at all. (That second check is not decoration: the
obvious one — the same spec with and without an empty `children` — is an A/B
where both arms share the bug, and it stayed green with the container
arithmetic forced permanently on.)

🔴 **AND A LINK INTO A BOX INSIDE A CONTAINER ATTACHES DIFFERENTLY IN THE TWO
LAYOUTS, FOR ONE REASON.** A container's own name is at the TOP of it with its
boxes under, so the ground between its edge and a box inside it is EMPTY
sideways and FULL downwards. Left to right the arrow reaches the box it names;
stacked, the same arrow would cross the words `Raspberry Pi` on its way in —
MEASURED on screen, it did — so there it stops at the machine. Two boxes in the
SAME container have no route between them at all: that link is dropped and
reported, because drawing it would need a third routing rule for a picture
nothing has asked for yet. The obvious next want is `grains`' board, which runs
an instrument INTO its granulator.

---

## 4. Layout: lanes, not a graph engine

Left to right, one column per step, computed from the links:

- **Column** = longest path from any node with no forward input. A cycle is
  broken by ignoring `back: true` links when computing it, which is exactly
  what makes a loopback a loopback.
- **Row** within a column = order of appearance, centred vertically.
- **Forward links** are straight, with a slight horizontal offset into the
  box's edge.
  🔴 **"STRAIGHT" IS RIGHT FOR A CHAIN AND MAKES A FORK UNDRAWABLE. CORRECTED.**
  A straight line from one box's edge to another's routes around NOTHING, and
  the second branch of a fork always reaches past whatever the first branch
  landed on — so it was drawn THROUGH the box in between, in one side and out
  the other with an arrowhead into the next box along, and the name that tells
  the two branches apart was placed at the midpoint, which is under that box.
  MEASURED on the branch `grains` withdrew (commit d4fc695): in one column at
  358 px, **50 of its 104 px ran inside a box it never touches**, and a phone
  read `this page → a granulator here → Cloudflare`, a path the page does not
  have. It is not only the stacked case, which is what that commit reported:
  left to right, a branch spanning two columns ran **191 px of 301 straight
  through the box between its ends**. No spec can word around it; every fork
  breaks, which is why this is a gap in this section rather than a page's
  mistake.
  **The rule now: a forward link whose two ends are more than one position
  apart gets a LANE outside the boxes, exactly as `back: true` already does** —
  OVER the row where the picture runs left to right, and down the RIGHT-hand
  gutter where it is stacked, because the return paths already own the left.
  Same interval colouring as the returns, same spacing, so two branches never
  share a lane either; and the gutter is sized for the lanes AND the names side
  by side, which is the trap the left one already fell into once. Measured
  after: **0 px behind a box at both widths.** The cost is the gutter — at
  358 px the boxes narrow from 272 px to 215 px, and left to right the picture
  grows from 53 px to 87 px tall to hold the lane. A step to the next box along
  is untouched and still a straight line; every pre-existing layout comes out
  byte-identical. Proved by sabotage: putting the straight line back fails five
  asserts, one of them *"a branch that reaches past a box is drawn OVER the row,
  never through it"*, and routing EVERY forward link fails the two negative
  controls that say a short step must stay straight.
  ⚠️ **AND A BRANCH'S ARROW IS THE FIRST DIAGONAL THIS DRAWER EVER DREW**, which
  broke a rule nobody had noticed was about horizontal lines: a forward name was
  put six pixels above the MIDDLE of its arrow, and a straight line is at its
  own midpoint's height whatever its slope — so the six pixels were correct at
  the middle and nowhere else. MEASURED at 655 px: the line climbed 5.4 px
  through the middle of `settings`. Lifting by the height the line gains across
  the name's own width fixes that one and produces the next, because two
  branches leaving one box open a WEDGE and both names lifted upward put the
  lower one 4.2 px inside the upper branch. A name that rises now sits above its
  line and a name that falls sits below it, so the wedge stays empty.
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
- **Below ~560 px the whole thing becomes one column, top to bottom**, the
  loopbacks route to the left and a branch that reaches past a box routes to
  the right, so the two kinds of routed line are on opposite sides of the boxes
  and cannot meet. A horizontal diagram on a phone is a diagram nobody reads.

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
- 🔴 **THIS SECTION NEVER SAID WHAT WIDTH TO BREAK AGAINST, AND THAT IS WHERE
  IT ACTUALLY WENT WRONG.** "Measure and break" is the easy half; the number you
  break AT is the hard half, and all three of them were picked rather than
  measured. Photographed on an iPhone at 258 px: every arrow name in /kit/'s
  two-loopback block cut to almost nothing — `how far…`, `slow down`, `small…` —
  beside boxes 171 px wide with room to spare.
    - A **step's** name was budgeted at *half the box it starts over*, while it
      is drawn in the gap BETWEEN two stacked boxes, which is empty right across
      the picture. MEASURED: 41 px of budget beside 106 px of nothing.
    - A **lane's** name got a flat 30% of the width — and was wrapped to that,
      with the widest RESULT then sizing the gutter, so a cut made the gutter
      narrower, which made the cut. `sound and grains` wanted 92 px, was cut to
      58, and 58 px was then reserved for it.
    - Nothing asked what the BOXES needed, so a box took whatever was left over:
      at 258 px /kit/'s own fork block reserved a gutter nothing had asked for
      and cut all four box `sub`s — the drawer shortening the names of the
      things the picture is about.
  **The rule now: a name is measured against the space it is actually drawn in,
  and when the picture cannot hold everything the order is the box's own words,
  then the arrows' names, then empty space.**
  ⚠️ **AND "THE SPACE IT IS DRAWN IN" IS NOT "THE LENGTH OF THE LINE" once a
  box can hold boxes.** An arrow that names a program reaches PAST its
  machine's edge to the box inside it, so its run is longer than the gap
  between the two machines — and the extra length is not empty, it is the
  container. A name budgeted on the run would be written over the machine it is
  entering. The budget is the gap between the machines and the name sits in the
  middle of it; the arrow may be longer, and usually is. What a box needs is exactly its
  `sub`'s own width, because a `sub` gets one line and is never wrapped — so the
  priority costs no second layout pass. Measured after at 258 / 320 / 390 px:
  every real block cuts nothing at any of them, boxes included.
  ⚠️ **AND THE CUT REPORT MUST KEEP FIRING.** A budget that grows until nothing
  is ever cut is indistinguishable from a drawer that has silently stopped
  reporting, so one of the checks is a name nobody could fit, and /kit/'s
  deliberately-impossible block still says so at every width.

---

## 6. Colour: grey, with a tint that is almost not there

The note: *"subtle colour coding, very subtle, in general grey, mix in some
colours to grey, but don't go muddy by mixing in yellows."*

- The field, the boxes and the arrows are `--line2` / `--card2` / `--dim`.
  ⚠️ **NOT `--line` for an edge**: #1f2937 on `--card` (#11151d), which is the
  background of every `/kit/` block, is not a border anybody can see.
- A `kind` says **WHICH MACHINE A BOX IS**, and nothing else — this page, a
  computer somebody rents, a machine in a room. That is the meaning, written
  down here and in /kit/, and it is a fact about the box rather than a place in
  a sequence, which is what CLAUDE.md's one-meaning-for-colour rule requires. A
  box drawn INSIDE another takes its container's hue, because it runs there.
- 🔴 **"8–12% INTO THE STROKE AND 4% INTO THE FILL" WAS BELOW THE THRESHOLD OF
  BEING SEEN, AND IS CORRECTED TO 26% AND 8%.** Those numbers were picked, not
  measured, and the person they were drawn for asked for *"slight colour
  coding"* while looking at a picture that already had it. MEASURED in oklab at
  11%: `--line2` is ALREADY a blue-grey (b ≈ -0.033), so 11% of #5b9bd5 moves b
  by 0.0074 and lightness by 0.038 — i.e. the tinted box reads as slightly
  LIGHTER rather than as blue, which is not a hue at all. At 26% the shift is
  0.0176, about 2.4x, and both hues are legible at a glance while still
  obviously grey-family. Still nowhere near a legend.
- ⚠️ **No yellow, and the reason is structural rather than taste.** `--hi` is
  #ffd400 and this project uses it for exactly one thing — the playhead, the
  primary control, the thing you are meant to look at. A yellow-tinted box
  would be competing with that everywhere it appears, and mixed into grey it
  goes muddy, which the note says independently.
- 🔴 **Colour must not be the only channel.** One meaning for colour across
  every demo is already a rule here; a `kind` also decides the box's SHAPE
  detail — a device gets a heavier stroke, a rented computer a broken one,
  `here` a solid fill — so the picture survives greyscale and colour blindness.
- **DOTTED, NOT DASHED, and it was looked at rather than argued about.** The
  rented computer's edge was `stroke-dasharray: 5 3`. Photographed at 258 px
  side by side with `1 3`: the dashes are an 8 px period on a box 40 px tall,
  so the border reads as a marching-ants selection and each rounded corner
  loses a whole dash to the curve. The dots are a 4 px period, even round the
  corners, and still unmistakably not a solid line. Round caps were tried too
  and are nearly solid at this stroke weight; the default butt caps won.

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
- one at phone width,
- a FORK — the same description drawn twice, at a laptop width and a phone
  width, because that is the one case where the two disagreed and looking at
  either alone could not have caught it,
- and A BOX INSIDE A BOX, also drawn twice at both widths, for the same reason:
  an arrow that names a program reaches it left to right and stops at the
  machine when the picture is stacked, and one width cannot show that.

**Then one demo page adopts it**, and `grains` was the first: two granulators
in two buildings with a relay between them, and a `what` paragraph doing a
diagram's job. The paragraph does not vanish — it becomes a **caption**, and
the part of it that belongs to one box becomes that box's `note`.

⚠️ **A diagram is not exempt from the writing rules.** No jargon in a label, no
internal vocabulary, and every word a visitor sees is held to the same standard
as the paragraph it replaces. A picture is a better place to put a shape and a
worse place to hide a word nobody understands. ⚠️ But a THING'S NAME is not
jargon — `Cloudflare`, `Raspberry Pi`, `Pappus` are what those things are
called, and a friendly label invented here would be a name nobody can search
for.

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

🔴 **`<title>` ON EACH NODE WAS EXACTLY WRONG AND IS GONE.** This section
called the native tooltip "free". It is not free: it is drawn ON TOP of the box
it names, so pointing at `Raspberry Pi` said its name in the box, its name and
`sub` again in a yellow tooltip over the box, and the same words a third time
in the line under the picture. Reported as *"3x same info. why? rm browser
tooltip."* — and the root `<svg>` had one as well, covering the whole picture.
The accessible name moves to `aria-label`, which no browser draws and every
screen reader reads, and it carries the box's name, its `sub` UNCUT and its
sentence, so nothing is lost by removing the thing that was showing it twice.

**And the line says what the box DOES, in a sentence the box does not repeat.**
Hovering used to write `Raspberry Pi — another granulator` under a box already
reading `Raspberry Pi` / `another granulator`. A node now carries a `note`: one
or two sentences saying what it is for here, which is the half of the paragraph
a drawing cannot say. ⚠️ It takes `**bold**` and NOTHING else — written out in
`boldParts`, twelve lines, because a markdown library for one inline form is a
dependency to read the release notes of forever. An unpaired `**` stays on the
page as two asterisks rather than turning the rest of the sentence bold, which
is the failure mode of the version that toggles on every marker.

⚠️ **AND THE RESERVATION IS TAKEN THROUGH THE SAME WRITER THAT DRAWS IT.**
Measuring these strings with `textContent` would measure `**bold**` as six
literal asterisks in the ordinary face, while the hover draws a heavier one
that is wider — so a sentence reserved at three lines could be drawn in four,
which is the jump the whole mechanism exists to prevent, reintroduced by the
measurement instead of by the drawing. `captionTexts` also walks the boxes
INSIDE containers, or hovering one of those is a height nobody reserved.

⚠️ **THE LINE HAS TO BE PUT BACK BY THE DRAWER, AND `pointerleave` CANNOT DO
IT.** A re-layout destroys every box, so a pointer resting on one never gets
its leave event: the line is left holding a sentence about a box that no longer
exists. The second half is the one that shows. That line's height is reserved
so hovering cannot move the page — and the reservation was read off whatever
the element happened to be showing, which is the caption only while nothing is
hovered. MEASURED at the moment the two came apart: **`min-height: 19px` under
a 97 px caption**, so the next un-hover grew the block by 78 px, which is the
exact jump the reservation exists to prevent. It repairs itself on the next
hover in and out, which is why it survived being looked at. The caption is
restored before the boxes are destroyed, and the reservation measures the
caption and every box's sentence BY NAME (`captionTexts`, pure and tested)
rather than "what is in the element".

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
