# Kit lessons: diagram

The longer comments cut from `demo/shell/diagram.mjs` and `demo/shell/diagram-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-diagram.md#<anchor>`.

<a id="header"></a>

## `diagram.mjs` module header

```text
demo/shell/diagram.mjs — a picture of where the signal goes.

For a page whose subject is a PATH — a key press that leaves this browser,
crosses a rented computer, reaches a board in the studio and comes back as
sound — the `what` paragraph is describing a SHAPE, in prose, badly. This
draws the shape instead. plans/plan-diagram.md is the brief; the decisions in it
are taken and this file implements them rather than re-opening them.

  const dg = createDiagram(host, {
    title: 'a key press, and what it costs',
    caption: 'one line under the picture',
    nodes: [{ id:'you', label:'your browser', sub:'a key press', kind:'here',
              note: 'The browser you are reading this in. **It makes the sound too.**',
              children: [{ id:'synth', label:'a synthesiser', sub:'in the page' }] }, ...],
    links: [{ from:'you', to:'relay', label:'note number' },
            { from:'relay', to:'you', label:'', back:true }],
  });
  dg.cuts   // every label the drawer had to shorten, with the full text

⚠️ A BOX CAN HOLD BOXES, AND THAT IS HOW A MACHINE SAYS WHAT RUNS ON IT.
`children` puts one or more boxes INSIDE another, measured from what they
need plus padding rather than from a guessed height, in both layouts. The
plan said one level of nesting was enough and that a program could be named
in its machine's `sub` — which is true right up to the point where the
machine and the program are two different things a link can reach: an arrow
may target a container or any box inside one.

🔴 AND AN ARROW THAT NAMES A BOX ARRIVES AT THAT BOX, IN BOTH LAYOUTS. In
one column it used to attach to the MACHINE whichever box it named, on a
measurement that is still true: a vertical run into a box inside a container
crosses that container's own name and every box stacked above the one it
wants. PHOTOGRAPHED 2026-09-19 on four pages at once — `WebGL2 -> shader`
drawn from the Browser's own edge, `films -> video` drawn machine to machine
ON A WIDE SCREEN, `store -> play` arriving beside `uploader`, `ffmpeg -> up`
leaving the Raspberry Pi. The line turns out of the box's SIDE instead and
runs in a lane, which is the one strip of ground that is empty: inside a
container's own padding when the picture is stacked, and in the gap between
two columns when it is not. A step between two whole machines is untouched
and still runs straight down the middle.
⚠️ NOTHING GRADED THIS AND THAT IS WHY IT WAS WRONG EVERYWHERE. `cuts`
reports a link that was REFUSED, so a link routed to the wrong END read
clean through it: the picture is complete, every arrow is drawn, and each
one arrives somewhere plausible and false. `checkEnds` measures the first
and last point of every path AGAINST THE BOX THE AUTHOR NAMED and reports a
mismatch on `cuts`, so a page that already asserts `cuts.length === 0`
grades its own picture.
🔴 A CONTAINER IS NEVER EMPTY EITHER, AND THAT IS REPORTED THE SAME WAY. An
author cannot SEE a missing box: every box in a picture is drawn to ONE
height, so a machine with nothing in it beside a machine with three boxes is
a tall empty slab. See CLAUDE.md.

🔴 TWO BOXES IN ONE CONTAINER ARE LINKED IN THE GAP THEY ALREADY SHARE, AND
THAT LINK REPLACES THE TIE BETWEEN THEM. It used to be dropped with a
warning, on the argument that routing it would mean a third rule for a
picture nothing had asked for. `/station/` asked: grouping seven boxes into
three machines killed three real arrows at once and left plain ties standing
where they had been, which is a picture claiming a chain that does not
exist. Two boxes that are NEXT TO EACH OTHER inside their container get the
arrow in the gap between them, with its name beside it. One that reaches
PAST the box between them gets a lane inside the container's own padding,
which is the same idea as the lanes over and under the row, one level in.
A link from a container to a box inside ITSELF has no gap to run through and
is still refused — reported on `cuts`, never dropped in silence, because a
link that vanishes without a word is exactly how those three went missing.
⚠️ A TIE AND AN ARROW ARE ONE WEIGHT OF INK DOWN ONE MIDDLE, so a container
holding both says two things in one alphabet and the headless one reads as a
head that went missing. That is a fact about the DESCRIPTION rather than
about the drawer: order a machine's boxes so every pair a reader sees side by
side is a pair a direction was stated for, and the mix cannot arise.
`api.ties` is how many headless lines the picture holds, so a page can assert
its own description got that right instead of anybody having to look.

🔴 THERE IS NO `title` ATTRIBUTE ANYWHERE IN HERE, AND THAT IS THE POINT.
A box used to carry an SVG `<title>`, which the browser draws as a native
tooltip — so pointing at one said `Raspberry Pi` in the box, `Raspberry Pi —
another granulator` in a yellow tooltip ON TOP of it, and the same words
again in the line under the picture. Three channels saying one thing is the
defect a legend is. The accessible name the `<title>` was also carrying moves
to `aria-label`, which no browser draws, so a screen reader keeps everything
the sighted reader just stopped seeing twice.

`note` is what the line under the picture says while a box is hovered: a
SENTENCE about what that box does here, not its name a second time. It takes
`**bold**` and nothing else — two asterisks, written out in `boldParts`,
because a markdown library for one inline form is a dependency to read the
release notes of forever.

🔴 IT DRAWS A DESCRIPTION, IT IS NEVER A DRAWING. Nothing anywhere positions
a box. A page hands over the structure above and this file decides every
pixel — which is the only reason the same structure can later grow a live
number per box without the layout moving.

⚠️ SVG, AND THE TEXT IS IN THE SVG TOO. Not DOM text over a canvas: that
needs the layout computed twice in two coordinate systems that drift the
moment anything reflows, and it puts a label OUTSIDE the box it names, where
it can end up beside the wrong one. Not `<foreignObject>` either — patchy in
Safari and it re-introduces exactly that second coordinate system. The price
is that SVG has no line wrapping at all, which is why the plan calls the
wrapping "the actual work" and why it lives here, once, rather than in every
page that draws a diagram.

🔴 THE TRAP, AND IT IS THE FIRST THING TO SUSPECT: `getComputedTextLength()`
RETURNS 0 for a <text> that is not in the document, or that sits inside a
`display: none` ancestor. Every label then measures as zero, every string
"fits", and the whole diagram comes out one line per box with no wrapping
and no cuts — which looks like a wrapping bug and is an attachment bug. So
the probe is measured in the LIVE svg after it is attached, and if it still
reads 0 the drawer falls back to an estimate, says so on `dg.measured`, and
lays out again when the host finally has a size.
```

<a id="box-align"></a>

## `diagram.mjs` BOX_ALIGN

```text
🔴 WHERE A BOX'S WORDS SIT, AND IT IS ONE SWITCH BECAUSE IT HAS TO BE
REVERTABLE. Centred is what this drew for its whole life; top-left is what a
technical diagram wants, because a reader scanning a column of boxes wants
every name to start at the same x and the same y rather than to float
according to how much else is in its box. Two boxes of different heights,
centred, put their names at two different heights for a reason nobody can
see.

⚠️ IT IS A CONSTANT, NOT A PER-CALL OPTION, ON PURPOSE. Half the pictures
aligned one way and half the other is worse than either; and if this turns
out to be wrong, `'centre'` here puts every diagram in the project back the
way it was in one edit, which is the whole reason it is written like this.
```

<a id="hue-reference"></a>

## `diagram.mjs` hue references

```text
🔴 A BOX HAS A HUE, AND A NOTE THAT NAMES IT BORROWS THE SAME ONE.

Every note wants to point at another box, and prose cannot: `the clock above`
means counting boxes, and a file path or a capitalised SERVER-SIDE means
nothing to anybody. So the picture carries the reference instead. Each box is
tinted with one hue mixed a long way into the page's own grey, and a **bold**
run in a note whose text is a box's NAME is drawn in that same hue, stronger.
Pointing is then a colour rather than a sentence.

⚠️ NO NEW SYNTAX, WHICH IS WHY IT WILL STILL BE TRUE NEXT YEAR. There is no
`[[link]]` to remember and nothing to keep in step: writing **scsynth** in a
note colours it because a box is called scsynth, and renaming that box moves
the colour with it. A bold run that matches nothing stays plain bold, which
is what bold already meant.

⚠️ AND THE TINT IS FAINT ON PURPOSE. These are boxes on a dark page, not a
chart: at 14% the hue is a family resemblance you notice when you look for it
and never a colour the picture is about. The text takes 62% because a word in
a line of prose has a twentieth of the area to say it with.
```

<a id="tech-hue"></a>

## `diagram.mjs` TECH_HUE

```text
🔴 ONE COLOUR PER TECHNOLOGY, ACROSS EVERY DIAGRAM IN THE PROJECT. A page's
picture is not the only one anybody will see: Cloudflare is in four of them,
a browser in six, a sound pipeline in three. If each diagram picked its own
hues then Cloudflare would be orange here, teal there and violet on the third
page, and the colour would carry nothing across the set. Declared `tech` on a
node takes its colour from this table; anything else falls back to the
rotation below, which only has to keep neighbours apart within one picture.

⚠️ `cloudflare` IS ITS OWN BRAND ORANGE and that is the point of naming it.
The colour a reader has already learned from the thing itself is worth more
than any scheme, and the rotation had picked violet for it.
```

<a id="tech-hue-raspberry"></a>

## `diagram.mjs` TECH_HUE.raspberry

```text
🔴 THEIR OWN RASPBERRY, FOR THE REASON `cloudflare` IS THEIR ORANGE. Asked
2026-09-16 with their logo: *"pi should be brandcolorsih on diageam"*. The
colour a reader has already learned from the thing itself is worth more
than a slot in a rotation, and a Raspberry Pi is one of the few machines in
these pictures that a reader can recognise by colour at all.
⚠️ 343 IS READ OFF THE LOGO, not chosen: #C51A4A is the crimson in their
mark, which is hue 343 in HSL. It sits three degrees from `device`, and
that is fine: `device` is any machine in a room and this is one machine
anybody can name.
```

<a id="tech-hue-meta"></a>

## `diagram.mjs` TECH_HUE.meta

```text
🔴 THEIR OWN BLUE, FOR THE REASON `cloudflare` IS THEIR ORANGE AND A
RASPBERRY PI IS THEIR CRIMSON. Asked 2026-09-19: *"make both outer boxes
blue (meta color)"*, about a headset and its controllers.
⚠️ 213 IS READ OFF THE BRAND, not chosen: #0064E0 is hue 213 in HSL.
⚠️ AND IT IS NOT `device`. `device` is any machine in a room, a board, a
phone, a speaker, and it stays 330 for all of them. This is for the one
make of headset these pages are actually written against, which a reader
can name on sight, the same argument the two entries above it make.
```

<a id="hues"></a>

## `diagram.mjs` HUES

```text
For nodes with no `tech`. It only has to keep neighbours apart inside one
picture, so the order is by contrast rather than by meaning.
⚠️ MIXED INTO A NEAR-BLACK GREY, every hue loses saturation and the warm ones
lose the most: 35 degrees at a quarter strength came out as brown and was
reported as muddy. The repair was not to ban warm hues, which would have made
Cloudflare's own colour unusable, but to move the identity into the EDGE: the
fill stays almost grey and the stroke carries the hue.
```

<a id="edge-tint"></a>

## `diagram.mjs` EDGE_TINT

```text
The edge is where a hue survives the mix, so this is where identity lives.
⚠️ TURNED DOWN FROM 0.75. At three quarters the strokes were saturated enough
to read as the subject of the picture rather than as labels on it: four
bright outlines around near-grey boxes puts the loudest ink on the part that
carries the least information. Half is still enough to tell two technologies
apart side by side, which is the whole job.
```

<a id="child-pad"></a>

## `diagram.mjs` CHILD_PAD

```text
A CONTAINER IS MEASURED FROM WHAT IS IN IT. These three numbers are the only
thing the arithmetic adds: the room around the boxes inside, the room between
two of them, and the room under the container's own words. Equal padding on
all four sides is deliberate — a box inset further from one edge than another
reads as a box that has drifted rather than one that is held.
```

<a id="child-gap"></a>

## `diagram.mjs` CHILD_GAP

```text
⚠️ 10 RATHER THAN 6, so the line that ties two children together has room to
be seen. At 6 px the tie was four pixels of hairline between two box edges,
which is indistinguishable from the edges themselves.
```

<a id="sib-lane-room"></a>

## `diagram.mjs` SIB_LANE room

```text
A LINK BETWEEN TWO BOXES IN ONE CONTAINER LIVES IN THESE TWO NUMBERS.
⚠️ THE LANE'S ROOM IS TAKEN FROM BOTH SIDES, so the boxes inside stay
centred. Taking it from the right alone would buy the lane at the price of
the rule above it: a box inset further from one edge than another reads as a
box that has drifted rather than one that is held.
```

<a id="sib-lane"></a>

## `diagram.mjs` SIB_LANE

```text
🔴 20, UP FROM 14, AND THE SIX PIXELS ARE AN ARROWHEAD. Reported 2026-09-16
with a photograph of `/crate/`: *"can not see rightmost connector
arrowhead"*. It was not missing, it had nowhere to stand.

The arithmetic, because it is the whole bug. A container insets its boxes by
`CHILD_PAD + maxLanes * SIB_LANE` and puts lane `i` at `CHILD_PAD +
SIB_LANE * (i + 0.5)` from its edge, so the straight run from the lane to the
box it arrives at was `14 - 7 - 3 = 4 px` — and `SIB_CORNER` is 4, so the
TURN ate the entire run and the marker had a zero-length segment to orient
itself on. At 20 the run is 10 px, the corner takes 4 and the head has 6 to
sit on, which is its own length.
⚠️ THE COST IS 6 px OF CONTAINER WIDTH PER LANE and nothing else: the boxes
inset by the same amount the lane moves out, so no label gets narrower.
```

<a id="sib-gap"></a>

## `diagram.mjs` SIB_GAP

```text
⚠️ AND THE GAP GROWS FOR THE HEAD, NOT FOR A NAME. An arrowhead is 7 px long
and is drawn back along the line from its tip, so in a 10 px gap it starts
inside the box it leaves: a smear between two edges rather than an arrow.
Sixteen leaves four pixels of line behind the head, which is what makes it
read as pointing somewhere.
```

<a id="lane-first"></a>

## `diagram.mjs` LANE_FIRST and LANE_STEP

```text
🔴 A LINK THAT CANNOT RUN STRAIGHT GETS A LANE OUTSIDE THE BOXES, and the
two kinds share these two numbers because they are one mechanism seen from
two sides: a return path runs UNDER the row (down the LEFT, in one column)
and a forward link that reaches past its neighbour runs OVER it (down the
RIGHT). One spacing, so the picture reads as one idea and the two kinds of
lane can never be assigned widths that disagree.
```

<a id="dive-lane"></a>

## `diagram.mjs` DIVE_LANE

```text
🔴 HOW A LINE REACHES A BOX THAT IS INSIDE A MACHINE, AND WHY IT COSTS
PADDING. An arrow that names a program has to arrive AT THAT PROGRAM, and in
one column every run is vertical: straight down the middle it would cross
the machine's own name and every box stacked above the one it wants. So it
turns out of the box's SIDE and runs in a lane inside the container's own
padding, which is the only ground in there that is empty top to bottom.
⚠️ THE NUMBER IS THE LANE'S SPACING, and the padding grows by one of these
for every lane the busiest picture needs — the same arithmetic `SIB_LANE`
already does one level in. Ten leaves the run from the innermost lane to the
box it arrives at at 14 px: four for the corner and six for the arrowhead,
which is its own length. That is the measurement `SIB_LANE` was raised for.
```

<a id="pure-parts"></a>

## `diagram.mjs` the pure parts

```text
── the pure parts ────────────────────────────────────────────────────────
Everything from here to the end of `layout()` is arithmetic with no document
in it, so `diagram-test.mjs` runs it under node. That is deliberate: the
wrapping and the column assignment are the two places a mistake is invisible
— a label that reads fine but quietly lost a word, two return paths drawn on
top of each other — and both are far cheaper to check than to look at.
```

<a id="assigncolumns"></a>

## `diagram.mjs` assignColumns

```text
Which column each box sits in: the LONGEST forward path to it.

🔴 `back: true` LINKS ARE IGNORED HERE, and that is exactly what makes a
loopback a loopback. Counting them would put every box of a round trip in a
column of its own and the picture would run off the right-hand edge saying
the signal visits five places when it visits three.

Longest path by relaxation rather than by a topological sort, because a spec
CAN hold a forward cycle — somebody forgets a `back: true` — and a sort
throws on one while this stops after a bounded number of passes and reports
it. A diagram drawn slightly wrong beats a page that threw.

@returns {{col: Map<string, number>, cycle: boolean}}
```

<a id="assigncolumns-cycle"></a>

## `diagram.mjs` assignColumns cycle repair

```text
⚠️ AND THE REPAIR IS NOT "GIVE UP". Left as it is, a forward circle keeps
relaxing until the cap and hands back columns like 14, 15, 16 — a picture
seventeen boxes wide of a path with three steps in it, which is a much
worse bug than the missing `back: true` that caused it. A link pointing at
an EARLIER box in the spec's own node list is almost always the one that
was meant to be a return path, so the second pass drops those, draws the
right shape, and still reports the cycle so the spec gets fixed.
```

<a id="backlevels"></a>

## `diagram.mjs` backLevels

```text
How deep under the row each return path runs.

The plan asks for "a depth that grows with how far it travels so two
loopbacks never overlap". Those are two rules and only the second one is the
point: two return paths of the SAME length that overlap — one spanning boxes
1 to 3, the other 2 to 4 — travel the same distance, so a depth read off the
distance alone would draw them on top of each other. This does the stronger
thing instead: shortest first, each takes the shallowest depth where nothing
already lies under it. Distance still decides in practice, because a longer
path overlaps more; and two paths that share no ground share a depth rather
than stacking up for nothing, which keeps the picture shallow.

@param {Array<[number, number]>} spans  each path's real run in PIXELS, not
       its box index — so two paths that meet at one box and turn away from
       each other are correctly seen as not overlapping.
@returns {number[]} one depth level per span, in the order given
```

<a id="skipsabox"></a>

## `diagram.mjs` skipsABox

```text
Does this forward link have to pass over a box on its way?

🔴 THE ANSWER IS WHAT MAKES A FORK DRAWABLE, AND IT IS THE SAME QUESTION IN
BOTH LAYOUTS. A straight arrow is the right drawing for a step to the next
place along and routes around NOTHING; a branch that reaches further is
drawn straight THROUGH whatever stands between, so the arrow vanishes behind
a box it never touches and comes out the far side with its head in the next
one. That is a picture of a path the page does not have, and the name that
would have told the two branches apart is drawn at the midpoint, i.e. under
the box. The second branch of a fork always skips whatever the first one
landed on, so every fork breaks that way until the link is routed outside
the boxes instead.

@param {object} l          one link
@param {Map<string,number>} pos  where each box sits ALONG the flow: the
       column in the row layout, the row in the one-column layout. One
       predicate, two coordinate systems, because it is one defect.
```

<a id="wraplines"></a>

## `diagram.mjs` wrapLines

```text
Break one string into lines that fit, and cut the last one if it cannot.

⚠️ A CUT LABEL IS A REPORT, NOT A FEATURE. CLAUDE.md: anything that
truncates with an ellipsis is in the wrong place. That rule is about gutters
and readouts, and here it applies to whoever wrote the label — so every cut
is collected on `dg.cuts` and /kit/ prints them. The full string always
survives in the box's `aria-label`, which a screen reader reads and no
browser draws: nothing is lost, only hidden, and the author is told exactly
which. ⚠️ IT USED TO SURVIVE IN A `<title>`, and that is a NATIVE TOOLTIP —
the whole string drawn on top of the box the moment a pointer rests on it,
beside a line under the picture already saying the same words. Hiding a cut
behind a hover also let a too-long label feel harmless; it is not, and the
report is the point.

@param {string} text
@param {number} maxWidth               in px
@param {number} maxLines
@param {(s:string)=>number} measure
@returns {{lines: string[], cut: boolean, full: string}}
```

<a id="unpack"></a>

## `diagram.mjs` unpack

```text
One flat list of boxes out of a description that nests one level.

⚠️ A CHILD TAKES ITS CONTAINER'S `kind`, and that is the colour rule rather
than a shortcut: the hue says WHICH MACHINE a box is, so a program drawn
inside a machine is that machine's colour. What tells the two apart is that
one is inside the other — position and size, which survive greyscale.

`_kids` and `_owner` are scratch, deleted before `layout` returns anything.

@returns {{tops: object[], kids: object[], owner: Map<string,string>}}
```

<a id="boldparts"></a>

## `diagram.mjs` boldParts

```text
`**bold**`, and nothing else, split into runs.

⚠️ AN UNPAIRED `**` STAYS ON THE PAGE AS TWO ASTERISKS. The tempting
implementation toggles on every marker it meets, which turns one typo into a
sentence that is bold from the mistake to the full stop — a rendering bug
that looks like a writing decision. A run has to be closed to exist.

@param {string} text
@returns {Array<{text: string, bold: boolean}>}
```

<a id="layout-inside"></a>

## `diagram.mjs` layout: links inside one machine

```text
🔴 A LINK WHOSE TWO ENDS SHARE A MACHINE NEVER REACHES THE OUTSIDE, so
none of the routing below is about it. Two boxes INSIDE the container
are routed between themselves by `placeSibs`; a container and a box
inside itself have no gap to run a line through and are refused, in
writing, on `cuts`.
```

<a id="layout-cuts-seed"></a>

## `diagram.mjs` layout: cuts seed

```text
⚠️ SEEDED FROM THE SPEC, so anything refused BEFORE the layout runs — a
title under the standing heading, today — arrives in the same list the
page's own `nothing cut, nothing refused` assert reads. A second channel
for refusals is a refusal nobody sees.
```

<a id="layout-empty-container"></a>

## `diagram.mjs` layout: empty container

```text
🔴 A CONTAINER WITH NOTHING IN IT IS A REPORT, THE WAY A CUT LABEL IS.
CLAUDE.md, 2026-09-20: a container is never empty, it holds at least one
box. An author cannot SEE a missing box any more than they can see a
missing arrow — the picture looks complete, the machine is drawn, and it
takes a machine's worth of space to say a caption's worth of thing.
⚠️ WHAT MAKES A BOX A CONTAINER IS ITS `kind`, not an empty `children`.
`here`, `cloud` and `device` are the three words that say "this is a
MACHINE", and the rule's own escape hatch is the other half of that: if
there is honestly nothing inside, it is not a container, so it is drawn as
an ordinary box with no `kind` at all.
⚠️ AND IT IS COUNTED OFF THE BUILT NODES, never off the source. A regex
sweep for this found ONE page where four are known, because a spec is a
JavaScript object and `children` can be built, spread or conditional.
🔴 ONLY WHERE SOMETHING ELSE IN THE PICTURE HOLDS BOXES, WHICH IS THE
WHOLE HARM. Every box in a diagram is drawn to ONE height, taken from the
tallest, so a machine with nothing in it standing beside a machine with
three boxes in it is a tall empty slab — /station/'s own comment records
exactly that, about a box called `curl`. A picture where nothing nests has
no slab in it: three machines the size of three boxes is what a diagram of
three machines looks like, and reporting those would make the rule noise.
```

<a id="layout-columns"></a>

## `diagram.mjs` layout: columns

```text
The columns are a statement about the MACHINES, so a link that names a box
inside one is asked about its machine — otherwise a program in the middle
of a chain would be given a column of its own and the picture would say the
signal visits a place it never leaves.
```

<a id="layout-sibs"></a>

## `diagram.mjs` layout: sibling links

```text
── what the boxes inside a container have to make room for ─────────────
🔴 A LINK ASKED FOR AND NOT DRAWN IS A REPORT, NOT A SILENCE. This is how
three arrows went missing from /station/ without anybody seeing it: the
picture looked complete, the ties between the children stood where the
arrows should have been, and the only trace was a console warning nobody
was reading. Every one of these is on `cuts`, which /kit/ prints.
```

<a id="layout-box-width"></a>

## `diagram.mjs` layout: box width

```text
── how wide a box gets, and whether the row layout is possible at all ──
The gaps give way before the boxes do: a narrow box cuts words, a narrow
gap only shortens an arrow.
⚠️ DECIDED BEFORE THE CONTAINERS ARE PADDED, which it was not until the
dive lanes below needed it. Nothing here reads `childInset`: the box width
comes from the column count and the gaps alone, so moving it up changes no
number. What it buys is that a picture in ONE COLUMN can reserve room
inside its containers that a picture in a row has no use for.
```

<a id="layout-dives"></a>

## `diagram.mjs` layout: dives

```text
🔴 AND THE LANES A LINK NEEDS TO REACH A BOX INSIDE A MACHINE. In one
column a step used to attach to the MACHINE whichever box it named, on the
measured ground that a vertical run into a box inside `Raspberry Pi` goes
straight through the words `Raspberry Pi`. That is true and it made the
picture lie: PHOTOGRAPHED on four pages at once, `WebGL2 -> shader` drawn
from the Browser's own edge, `store -> play` arriving beside `uploader`.
The run turns out of the box's SIDE instead and goes down the container's
padding, which is empty from top to bottom, and that padding has to be
bought here — before a box has a width, because the width depends on it.

⚠️ THE LEVELS COME FROM THE ORDER, NOT FROM PIXELS, and that is the only
reason this can be answered this early. Where two dives overlap is decided
by which rows and which boxes inside them they run between, and the y they
end up at follows that order exactly. `backLevels` wants real distances,
so the positions are scaled up: at row units its "1 px of shared ground is
a join" tolerance would swallow a whole box.
```

<a id="layout-insetl"></a>

## `diagram.mjs` layout: insetL

```text
⚠️ THE DIVE LANES ARE BOUGHT ON THE RIGHT ONLY, since they moved there on
2026-10-05 (see `placeColumn`). Bought on both sides, the left copy was an
empty strip that pushed every box off centre under its machine's name.
The lanes a container keeps for its own children are on the right too
(see `placeSibs`), so in one column the left inset is the padding alone.
In a row nothing here moves.
```

<a id="layout-gutters"></a>

## `diagram.mjs` layout: gutters

```text
The return paths run down the LEFT of the column and the forward links
that skip a box down the RIGHT, so each gutter holds two things SIDE BY
SIDE and not one: the lanes the paths run in, and the names written
beside them.

⚠️ MEASURED, with the two stacked instead: `the sound` was drawn with a
return path running straight through it, because the gutter was sized to
whichever of the two was wider rather than to both together. A name that
has a line through it reads as a name in the wrong place, which is what
it was.

🔴 AND IT RESERVES THE LANES THERE REALLY ARE, NOT ONE PER PATH. This
used the list's LENGTH — every path on a level of its own — with a
comment admitting it over-reserves whenever two of them share a lane,
because the real levels were read off positions that needed this width
first. They do not: where two paths overlap is decided by which BOXES
they run between, and the y they end up at follows that order exactly.
`laneSpan` below is the same question asked of the order rather than of
the pixels, so the count is exact, the gutter holds what it draws, and
every pixel it gives back goes into the boxes' own words.
⚠️ THE LEVELS ARE THEN HANDED TO `placeColumn` RATHER THAN RECOMPUTED.
Two answers to one question is two answers that can disagree, and a
gutter reserving fewer lanes than the drawer lays down is a line outside
the picture.

🔴 A GUTTER IS SIZED BY WHAT ITS NAMES NEED, NEVER BY A SHARE OF THE
PICTURE. It used to be a flat 30% of the width: the name was wrapped to
that, and the widest RESULT then sized the gutter — so a name that had
been cut made the gutter smaller, which is a cut reinforcing itself.
MEASURED at 258 px: `sound and grains` wanted 92 px, was cut to
`sound and…` at 58, and the gutter then reserved 58 — while the box
beside it held 166 px for text needing 128. The name is measured WHOLE
here, before anything wraps it, so the number cannot be fed by its own
shortening.
```

<a id="lanespan"></a>

## `diagram.mjs` laneSpan

```text
⚠️ THE ENDS ARE PULLED IN BY A HAIR, so two paths that MEET at one box
and turn away from each other are seen as not overlapping and share a
lane. That is `ATTACH_OFF / 2` in pixels, one level up; here it is the
same idea in the units the order is counted in.
```

<a id="layout-boxneed"></a>

## `diagram.mjs` layout: boxNeed

```text
🔴 AND WHEN THE PICTURE IS TOO NARROW FOR ALL OF IT, THE BOXES' OWN
WORDS WIN. A diagram that shortens the names of the things it is about
is broken in a way a reader can see; the order is the box's text, then
the arrows' names, then empty space. The binding measurement is the
`sub`, because it gets ONE line and is never wrapped — so the width it
needs is simply its own, with no second layout pass to find out. A
`label` has two lines and gives way gracefully. MEASURED before this
existed: at 258 px /kit/'s fork block cut ALL FOUR box subs while
reserving a gutter nothing had asked for.
```

<a id="layout-height"></a>

## `diagram.mjs` layout: type and height

```text
── the type, which decides how tall every box is ──────────────────────
One height for every box, taken from the tallest. Boxes of different
heights in one row is a picture where the tall one looks important. A
container is taller than a plain box by what it holds — and it hands that
height to every other box in the picture rather than keeping it, for the
same reason: a row of unequal panels ranks them.
```

<a id="layout-hue-order"></a>

## `diagram.mjs` layout: hue order

```text
⚠️ ASSIGNED IN READING ORDER, PARENTS AND CHILDREN ALIKE, so neighbouring
boxes never share a hue and the order is the one a reader meets them in.
A node may state its own; that is what a page reaches for when two pictures
have to agree about what colour a thing is.
```

<a id="layout-long-note"></a>

## `diagram.mjs` layout: long note

```text
🔴 A LONG NOTE IS REPORTED THE WAY A LONG LABEL IS. It cannot be cut at
the reader, because a note is prose and half a sentence is worse than
none; what it gets instead is a line in `cuts` so the author sees it.
Forty words is about two sentences at this register. See CLAUDE.md.
```

<a id="layout-headinset"></a>

## `diagram.mjs` layout: headInset

```text
🔴 A MACHINE'S OWN NAME STARTS CLEAR OF THE LANES THAT RUN DOWN ITS SIDE.
In one column a dive runs down a container's left padding, and the second
lane sits at `DIVE_EDGE + DIVE_LANE`, which is 14 px in: past the 10 px a
name starts at. PHOTOGRAPHED 2026-09-30 at 375 px on /cam/, the `SDP offer`
lane ran straight down through the C of `Cloudflare` and the w of `worker,
Stream, relay`, and /fau/, /replay/ and /station/ did the same to theirs.
So the head of every container moves right by the lanes past the first,
which puts it the same 6 px clear of the innermost lane that one lane
always left, and the words are wrapped to what is left.
⚠️ ONE COLUMN ONLY. In a row the lanes run in the gap between columns,
outside every box, and nothing here moves.
🔴 SINCE 2026-10-05 THE LANES RUN DOWN THE RIGHT PADDING, so the head no
longer MOVES: it starts where every box's words start and is only WRAPPED
short of the lanes, by the same amount it used to move. See `placeColumn`.
```

<a id="layout-colh"></a>

## `diagram.mjs` layout: colH

```text
🔴 IN ONE COLUMN EVERY MACHINE IS ITS OWN HEIGHT. The shared height above
is a rule about a ROW, where unequal panels side by side rank each other.
Stacked, nothing stands beside anything, and the shared height only handed
every short machine the tallest one's empty floor. PHOTOGRAPHED 2026-10-05
at 375 px: /stage/'s audience Browser, two boxes in it, drawn as tall as
Cloudflare's four, and /moq/'s one-box Cloudflare a third empty, with the
lines beside them running the length of that nothing.
```

<a id="layout-align"></a>

## `diagram.mjs` layout: align

```text
⚠️ AN UNKNOWN `align` IS REPORTED RATHER THAN IGNORED, which is this
component's own habit: a label that does not fit and a link it cannot route
both land on `cuts` so the AUTHOR sees them. An option silently falling
back to the default is an option that reads as broken from the page and as
correct from here.
```

<a id="checkends"></a>

## `diagram.mjs` checkEnds

```text
🔴 DID THE ARROW REACH THE BOX IT NAMES, OR THE MACHINE AROUND IT.

NOTHING GRADED THIS AND IT WAS WRONG ON FOUR PAGES AT ONCE. `cuts` reports a
link that was REFUSED, so a link routed to the wrong endpoint reads clean
through it: the picture is complete, every arrow is drawn, and each one ends
somewhere plausible and false. PHOTOGRAPHED 2026-09-19 on /mirror/, /floor/,
/crate/ and /knobs/ — `WebGL2 -> shader` leaving the Browser's own edge,
`films -> video` drawn machine to machine on a WIDE screen, `store -> play`
arriving beside `uploader`, `ffmpeg -> up` leaving the Raspberry Pi.

⚠️ IT IS MEASURED OFF THE PATH, NEVER OFF THE ROUTER'S INTENTION. The
drawing is the only thing a reader sees, so the question asked here is where
the ink starts and stops: the first and last coordinate pair in the `d`
string, against the rectangle of the box the author named. A check reading
the variable the router chose would agree with the router by construction,
which is the two-numbers-from-one-field defect in CLAUDE.md.

⚠️ AND IT GOES ON `cuts`, so every page that already asserts `cuts.length
=== 0` grades it with no page edit at all.
```

<a id="checkoverlaps"></a>

## `diagram.mjs` checkOverlaps

```text
🔴 IS ANY NAME IN THE PICTURE DRAWN OVER SOMETHING ELSE.

NOTHING GRADED THIS, and on a phone it was wrong on two streaming pages at
once. PHOTOGRAPHED 2026-09-30 at 375 px: on /moq/ the return path's name
`frames` sat across the Browser's own edge with the `MoQT` lane running down
through its middle; on /cam/ `WHEP` had the container edge and two lanes
through it, and `SDP offer` printed over the MoQ link's name in the gap the
two machines share, which is why that link lost its label as a workaround.
`cuts` reported a name that was SHORTENED, so a name drawn whole on top of
another read clean through it: nothing was cut.

⚠️ MEASURED OFF WHAT IS DRAWN, the same way `checkEnds` is. Every link's
name becomes a rectangle from its anchor, its lines and the ruler that
wrapped it, and that rectangle is asked about four things a reader sees:
  - another link's name, overlapping it
  - another link's line, running through it (its own line is left out,
    because a name sits beside its own run by design)
  - the edge of any box or machine, crossing it
  - a box's own name or sub, which it is printed on top of
and every line in the picture is asked whether it runs through a BOX's name,
which is the one crossing a reader cannot read past.
⚠️ A PATH IS READ AS ITS CORNER POINTS. A rounded turn is a quadratic whose
control point is the corner itself, so the polyline through them is the
path to within the corner's radius, which is well under a name's height.

⚠️ AND IT GOES ON `cuts`, so every page that already asserts `cuts.length
=== 0` grades it with no page edit at all.
```

<a id="placerow-align"></a>

## `diagram.mjs` placeRow: align

```text
🔴 CENTRED IS THE DEFAULT AND `align: 'left'` IS THE ONE EXCEPTION, ADDED
2026-09-22. A figure on its own under a page's controls is centred because
the picture IS the block, and that is every caller but one.
🔴 THE CALLER THAT BOUGHT IT IS `/wish/`, WHERE A PICTURE IS NO LONGER THE
BLOCK. That page now draws one diagram per proposed connection, in a row
that also reserves a column on its right for actions. Centring inside the
space left over put the figure about 70 px in from each side, so two rows
with different box counts had their first box at two different x, and
nothing in the column of pictures lined up with anything.
⚠️ IT IS AN OPTION RATHER THAN A CHANGE OF DEFAULT, BECAUSE THE DEFAULT IS
RIGHT FOR EVERY OTHER PAGE AND THIS PROJECT HAS ONE TREATMENT PER PICTURE.
A page asking for this is saying the figure sits beside something, which is
a fact about the host and not about the drawing.
⚠️ AND IT IS STILL `PAD` AT THE LEFT, never 0. The inset a figure keeps off
its own edge is the same on both sides and at both alignments.
```

<a id="placerow-over"></a>

## `diagram.mjs` placeRow: over lanes

```text
── a forward link that skips a column runs OVER the row ────────────────
🔴 THIS IS WHAT MAKES A FORK DRAWABLE HERE, and it is the return path's
rule turned upside down: a link that cannot run straight gets a lane
outside the boxes, over for onward and under for back, so the two never
meet and neither is ever drawn through a box.

The lanes can be worked out before a single box has a y, because every x
in the row layout is fixed by the column alone. So the depths are assigned
first and the whole row is then pushed down by exactly the room they need
— rather than laying the picture out twice.
```

<a id="placerow-outer"></a>

## `diagram.mjs` placeRow: outer

```text
🔴 A LINK ATTACHES TO THE BOX IT NAMES AND ITS NAME GOES OUTSIDE THE
MACHINE THAT BOX IS IN. Those are two different boxes the moment anything
is nested: an arrow into a program dives through its machine's edge, which
is the picture, while a name at the midpoint of that dive would be written
inside the machine, on top of whatever else is in there. So the path is
built from the box and the name from `outer`, and with nothing nested the
two are the same object — which is why a picture with no container in it
comes out unchanged to the last decimal.
```

<a id="placerow-backs"></a>

## `diagram.mjs` placeRow: return paths

```text
── the return paths, under the row ───────────────────────────────────
🔴 UNDER, NEVER BETWEEN THE BOXES. A return drawn back through the forward
path is the one thing that makes a signal diagram unreadable: with two
lines between the same pair of boxes the eye cannot tell the way out from
the way home.
```

<a id="placerow-named"></a>

## `diagram.mjs` placeRow: named returns

```text
⚠️ A NAME UNDER A RETURN PATH NEEDS THE DEPTH TO MAKE ROOM FOR IT.
MEASURED with two loopbacks and the step at a flat 14 px: `slow down` sat
on top of the line belonging to the path below it. Two paths that do not
overlap is a claim about the PATHS, and the names are a second layer that
has to clear as well — so when any of them is named, the step grows by one
line of that type rather than by a number picked to look right.
```

<a id="placerow-arrivals"></a>

## `diagram.mjs` placeRow: arrivals

```text
🔴 TWO ARROWS THAT LAND ON ONE BOX MUST NOT LAND AT ONE POINT. Both would
come in at the target's centre, so the second is drawn exactly on top of
the first and their two names are written at one x and one y — MEASURED on
/station/, `Range requests` and `the playlist` printed over each other into
an unreadable smear, and the picture said one thing arrives where two do.
A fork is spread by its branches' own targets; a JOIN has nothing to spread
it, so the arrivals share out the target's edge instead. One line of link
type apart at the least, because the names are what collide first.
```

<a id="placerow-labof"></a>

## `diagram.mjs` placeRow: labOf

```text
🔴 AND THE ROOM THEY TAKE IS WHAT THEIR NAMES REALLY NEED, MEASURED.

Two arrivals sitting ONE line apart printed through each other, because
`wrapLines` is allowed two lines, a name sits ABOVE its own arrow, and
both of /station/'s arrivals into `player` wrap. The repair reserved the
CAP — two lines, every time — plus 18 px of air, so that two two-line
names read as two arrivals rather than one clump, which is what *"can we
get connectors a bit separate?"* asked for.

⚠️ AND THEN IT WAS TOO MUCH, WHICH IS THE SAME MISTAKE FROM THE OTHER
END. Reserving the worst case put two arrivals 40 px apart on a box 48 px
tall — one at each corner — for names that might be one line, or might not
exist at all. Two arrows with NO names on them were held forty pixels
apart to clear writing nobody had done. So the names are wrapped FIRST,
here, and the spread is what the widest of them actually takes. Nothing
about the air changes: it is the reservation that stops being a guess.
⚠️ THE BUDGET IS THE GAP BETWEEN THE MACHINES, which is fixed by their x
alone, so it is known before a single link has been routed and this costs
no second pass.
```

<a id="placerow-turn-step"></a>

## `diagram.mjs` placeRow: TURN_STEP

```text
🔴 AND EACH ARRIVAL TURNS DOWN AT ITS OWN x, WHICH IS THE OTHER HALF.

Reported with a photograph after the vertical gap was widened: *"still no x
separation"*. Two arrows into one box were 46 px apart at their heads and
their VERTICAL RUNS were on top of each other, because the bend is taken at
`x1 + STEP_TURN` and `x1` is the source box's right edge — and on
`/station/` both sources are boxes in ONE container, so they share that
edge to the pixel. Two names, two heads, one line down the middle.

The index into the arrival list is already the number that spreads the
heads, so it spreads the bends too: arrival 0 turns first and each one
after it turns further along. They nest instead of overlapping.
```

<a id="turnat-clamp"></a>

## `diagram.mjs` turnAt clamp

```text
⚠️ CLAMPED INSIDE THE RUN. A bend past the target is an elbow that
doubles back, and one behind the source is a line that leaves backwards.
```

<a id="placerow-name-room"></a>

## `diagram.mjs` placeRow: name room

```text
the gap between the two MACHINES, which is the room the name has —
never the length of the line, which reaches further whenever one end
of it is a box inside one of them. Wrapped in the pass above,
because how many lines it came to is what decides how far apart two
arrivals at one box have to sit.
```

<a id="placerow-name-clearance"></a>

## `diagram.mjs` placeRow: name clearance

```text
🔴 SIX PIXELS ABOVE THE LINE, AND NOW THAT IS ALL IT TAKES. The old
code measured the arrow's SLOPE and lifted each name clear of it,
then put the two names of a fork on opposite sides so they did not
fall into the wedge the branches open. Both were repairs to the
diagonal; `stepElbow` has no slope and no wedge, so the line under
every name is horizontal at its own target's height and the
clearance is one number.
```

<a id="placerow-over-link"></a>

## `diagram.mjs` placeRow: over-row link

```text
Over the row, out of the source's TOP edge and down into the target's.

🔴 AND WHERE EITHER END NAMES A BOX INSIDE A MACHINE, IT GOES OUT THE
SIDE INSTEAD. This ran off the MACHINE at both ends, for a reason that
is still true: a lane coming down from above into a box inside a
container would cross that container's own name and every box stacked
over the one it wants. PHOTOGRAPHED 2026-09-19 on `/floor/` at full
width, where `films -> video` was drawn machine to machine — the one
arrow in that picture that reads as a fact and is not one, because
both `films` and `video` sit inside machines that hold two boxes each.
⚠️ THE GROUND IT USES COSTS NOTHING. Between two columns there is
already `gapX` of empty picture, so the line hugs the machine's side
six pixels out and climbs there. No padding is bought and no box
narrows, which is the opposite trade from the one column layout.
```

<a id="placerow-return-attach"></a>

## `diagram.mjs` placeRow: return attach

```text
🔴 A RETURN PATH LANDS ON THE BOX IT REACHES, NOT ON THE MACHINE AROUND
IT. This used the containers (`fm`, `tm`), so on `/keys/` the sound came
back from the bottom edge of `Raspberry Pi` and arrived at the bottom
edge of `Cloudflare`, with nothing joining it to `capture` or to `sound
back`. REPORTED in exactly those terms: *"capture should conntect to
sound back and that should connet to playout"*.

⚠️ A FORWARD LINK ALREADY DID THIS. `at.get(id)` resolves a child to the
child and a top-level node to itself, so the two halves of the picture
were disagreeing about what a link connects, and only the return half was
wrong. Where a link names a whole machine, `f` IS `fm` and nothing moves.
⚠️ IT CROSSES THE CONTAINER'S OWN EDGE, which is correct rather than
untidy: the line is going into that machine, and stopping at the wall
would say it arrives at the building rather than at the thing inside it.
```

<a id="placecolumn"></a>

## `diagram.mjs` placeColumn

```text
⚠️ ONE COLUMN IS NOT THE ROW LAYOUT ROTATED. A horizontal diagram on a
phone is a diagram nobody reads, so below the break the steps stack top to
bottom in the order the signal takes them, the return paths run down the
left-hand gutter, and a forward link that reaches past the box under it
runs down the right-hand one. Onward on the right, back on the left: two
gutters that cannot collide, and neither line is ever behind a box.
```

<a id="placecolumn-gap-names"></a>

## `diagram.mjs` placeColumn: gap names

```text
🔴 A GAP THAT CARRIES SEVERAL NAMES GIVES EACH ONE A ROW OF ITS OWN.
Every forward link that is not a skip crosses exactly one gap, the one
under the higher of its two machines, and every name was written at that
gap's middle. Two dives through one gap therefore printed their names at
one height, ten pixels apart across: PHOTOGRAPHED 2026-09-30 on /cam/ at
375 px, `SDP offer` over the MoQ link's name, which is why that link was
left unlabelled on purpose; /replay/ and /station/ did the same to theirs.
So where a gap holds two or more names and at least one of them belongs to
a dive, the gap grows by one line of type for each name past the first and
the names stack in it. A gap with one name, or with names only on straight
steps (which the pairs rule below already spreads), keeps its 30 px to the
digit.
```

<a id="placecolumn-jogs"></a>

## `diagram.mjs` placeColumn: jogs

```text
⚠️ AND A DIVE THAT LEAVES OR REACHES A WHOLE MACHINE TURNS SIDEWAYS IN
THE GAP, which used to be at its middle and is now a row of names:
MEASURED on /stage/ at 375 px, the `questions` jog ran straight through
`WebRTC`. So the jogs out of a machine get a row above the names and the
jogs into one a row below them.
```

<a id="placecolumn-side"></a>

## `diagram.mjs` placeColumn: side

```text
🔴 A LINK ATTACHES TO THE BOX IT NAMES, IN THIS LAYOUT TOO. `outer` above
resolves a box to the machine around it and every link in here used to go
through it, so an arrow naming a program was drawn to the machine's edge.
Where the run reaches a box SIDEWAYS — a return path out of the left
gutter, a skip out of the right one — nothing was ever in the way: the
only ground it crosses is the container's own padding, which is empty. The
vertical steps are the ones that needed a lane, and they get one below.
```

<a id="placecolumn-back-levels"></a>

## `diagram.mjs` placeColumn: back levels

```text
⚠️ THE LEVELS ARRIVE FROM `layout`, WHICH ALREADY HAD TO KNOW THEM. The
gutters are sized before a box has a width, so the number of lanes was
worked out there; computing it a second time here from the pixels is two
answers to one question, and the one that can be wrong is the one that
lays lines down outside the gutter reserved for them.
```

<a id="placecolumn-backlanes"></a>

## `diagram.mjs` placeColumn: backLanes

```text
⚠️ AND EVERY `bx` BELOW COUNTS LANES, NOT PATHS. These read the list's
LENGTH while the gutter was reserved for the same worst case, so the two
agreed by both being wrong. With the gutter sized to the lanes there
really are, a `bx` still counting paths puts the shallowest lane a whole
LANE_STEP inside the picture and draws it through its own name — which is
the defect the gutter's own check was written for, arriving from the other
side.
```

<a id="placecolumn-diveof"></a>

## `diagram.mjs` placeColumn: diveOf

```text
Which lane inside a container each dive runs in. Level 0 is the shortest
run and sits INNERMOST, a step from the boxes; a longer one moves out
toward the container's edge and passes outside it. That is the right
gutter's rule one level in, and it leaves the innermost lane `DIVE_LANE`
plus `DIVE_EDGE` clear of the box it arrives at — four for the corner and
six for the arrowhead.

🔴 DOWN THE RIGHT PADDING, NOT THE LEFT, SINCE 2026-10-05. The left was
already the return paths' side, so on /stage/ at 375 px six vertical lines
shared the left 70 px of the picture, two going up and four going down,
and a reader could not tell which was which without following each one to
its head. Reported from a UX review as *"a tangle of long return lines
running down the left side"*. The right padding was already bought, because
`childInset` insets the boxes on BOTH sides, and it sat empty. Now the
picture has one rule a reader can learn from one line: a line on the left
goes back up, a line on the right goes on down. That is the rule this
function's opening comment already states for the gutters, carried one
level in.
```

<a id="placecolumn-lanex"></a>

## `diagram.mjs` placeColumn: laneX

```text
⚠️ COUNTED OUT FROM THE BOXES' RIGHT EDGE, with any lane a container
keeps for its own children OUTSIDE these. The other way round, MEASURED
on /station/ at 375 px, the `chunks -> Worker` lane ran straight through
the base of every arrowhead arriving at `programmes`. With no such lane
this is the old left-hand spacing mirrored: the innermost lane 14 px off
the box, the outermost `DIVE_EDGE` in from the container's edge.
```

<a id="placecolumn-step-names"></a>

## `diagram.mjs` placeColumn: step names

```text
🔴 A STEP'S NAME TAKES THE ROW IT SITS IN, NOT HALF A BOX. Between two
stacked boxes is a gap that is EMPTY right across the picture, and the
only thing in it is one short vertical arrow. The budget used to be "the
half of the box it starts over" — MEASURED at 258 px in /kit/'s fork
block, that handed `settings` 41 px with 106 px of nothing beside it, and
cut it to `settin…`. A name is now measured against the space it is
actually drawn in.

It goes on the WIDER side of the arrow, and on the same side for every
step, because in one column every box shares an x — so the choice is made
once from real positions and the names line up in a column instead of
alternating. Which side is wider is not a guess: a left gutter pushes the
boxes right, so the room is usually on the left, and with no gutters at
all the two are equal and it stays where it has always been.
```

<a id="placecolumn-pairs"></a>

## `diagram.mjs` placeColumn: pairs

```text
🔴 AND TWO LINKS BETWEEN ONE PAIR OF MACHINES ARE ONE LINE WITH TWO NAMES,
WHICH MUST NOT BE WRITTEN AT ONE POINT. Stacked, every link attaches to the
machine, so `Worker -> player` and `programmes -> player` are the SAME
vertical run: their two names landed on one x and one y and printed over
each other. MEASURED on /station/ at 390 px, both at y 641.8. The row
layout spreads the same case across the target's edge, which it can because
the two arrows are distinct there; here the arrow is one thing and only the
names can move.
```

<a id="placecolumn-dive-step"></a>

## `diagram.mjs` placeColumn: dive step

```text
🔴 A STEP REACHES THE BOX IT NAMES, AND WHERE THAT BOX IS INSIDE A
MACHINE IT GETS THERE SIDEWAYS. This was a straight vertical at the
MACHINE's centre whichever box the author named, on a measured
ground that is still true: a vertical run into a box inside
`Raspberry Pi` goes through the words `Raspberry Pi` and through
every box stacked above the one it wants. What was wrong was the
conclusion. The line turns out of the box's SIDE, runs down a lane
in the container's own padding — the one strip in there that is
empty top to bottom — crosses the gap between the machines in it,
and turns in at the far box's side.
⚠️ A STEP BETWEEN TWO WHOLE MACHINES IS UNTOUCHED, to the digit: it
has no box to reach past, so it stays the straight vertical down the
middle that the one-column layout is built around, and a picture
with nothing nested in it comes out exactly as it did.
```

<a id="placecolumn-dive-name"></a>

## `diagram.mjs` placeColumn: dive name

```text
where the name goes, and it is always in the GAP between the two
machines, never beside the part of the run that is inside one: that
strip is a container's padding and a name in it sits on the boxes.
⚠️ A DIVE'S NAME STARTS PAST THE INNERMOST LANE IN ITS GAP, not
past its own. Every lane through a gap runs its full height, so a
name beside an OUTER lane had the inner ones through it: /moq/'s
`frames` and /cam/'s `WHEP` both carried a lane through the middle.
With one lane in the gap, or with this lane the innermost, the x is
the one it always was.
⚠️ AND WITH THE LANES ON THE RIGHT THE INNERMOST IS THE LEFTMOST, so
the name ENDS short of it and reads leftward into the empty gap.
```

<a id="placecolumn-both"></a>

## `diagram.mjs` placeColumn: both

```text
⚠️ A BOX A DIVE BOTH REACHES AND LEAVES TAKES THEM AT TWO HEIGHTS,
the arrival above and the departure below, the way the left gutter
spaces a return path's two ends by ATTACH_OFF. MEASURED on /stage/
at 375 px: `questions` arriving at Relay object and `questions`
leaving it for video met at one point and read as one line.
```

<a id="placecolumn-skip-lane"></a>

## `diagram.mjs` placeColumn: skip lane

```text
🔴 OUT OF THE RIGHT EDGE, DOWN THE RIGHT GUTTER, BACK IN AT THE RIGHT
EDGE. The straight vertical this replaces left the source's CENTRE and
ran behind every box between the two, which is the fork bug: the
branch emerges under a box it never visits with its head in the next
one, and its name is drawn at the midpoint, i.e. under that box.
The lanes fill the RIGHT of the gutter and the names the left of it,
so a deeper path moves further right and never under a name — the
left gutter's rule, mirrored.
```

<a id="placecolumn-return-name"></a>

## `diagram.mjs` placeColumn: return name

```text
🔴 BELOW ITS OWN RUN, NOT BETWEEN THE TWO. A box's two attachment
points are ATTACH_OFF apart — 12 px — and a line of this type is 11 px
tall, so a name placed between them cannot clear both: MEASURED in
/kit/, the run LEAVING a box cut 2 px through the ascenders of the name
belonging to the run ARRIVING at it. Below is also where the row layout
puts a return's name, so the two layouts now agree.
```

<a id="placecolumn-return-name-x"></a>

## `diagram.mjs` placeColumn: return name x

```text
⚠️ OFF THE MACHINE'S EDGE, NOT THE BOX'S. For a box inside a
container `t.x` is inset, so a name anchored 6 px short of it
sat across the container's own edge and over the dive lanes
in its padding: /moq/'s `frames`, /cam/'s `WHEP`, and five
more pages the same way at 375 px. For a whole box the two
are one x and nothing moves.
```

<a id="lane-shapes"></a>

## `diagram.mjs` lane shapes

```text
── the two lane shapes ───────────────────────────────────────────────────
One rounded L out of a box's edge, along a lane that clears every box in the
way, and back in at the other end. Both kinds of routed link — a return
under the row and a forward link over it — are the SAME shape with one sign
flipped, so they are one function each rather than four copies of a path
string. A copy is where the two would drift apart.
```

<a id="stepelbow"></a>

## `diagram.mjs` stepElbow

```text
A STEP from one column to the next: out of the box, across, and in.

🔴 IT USED TO BE ONE STRAIGHT LINE FROM EDGE TO EDGE, and for a step between
two boxes at the same height that is exactly what this still draws. The
problem was the other case: a fork puts two boxes in one column, so its
arrows ran DIAGONALLY, and a diagonal is the only line in the whole picture
that is not horizontal or vertical — the lanes over and under the row have
turned corners since they were written, the boxes have rounded corners, and
two slanted arrows in the middle of that read as a different drawing.
Reported twice, on two different pictures, as wanting `-|` with rounded
turns. Same `CORNER` as the lanes above, so there is one radius in the file.

⚠️ THE TURN IS EARLY, NEAR THE SOURCE, AND THAT IS WHAT THE NAMES NEED. Turn
late and every branch shares one long trunk at the source's height, so their
names stack on top of each other; turn early and each branch gets the whole
gap at its OWN target's height to be named in. The short stub they share is
the fork, which is how a fork ought to look anyway.

⚠️ AND A FORK'S NAMES NO LONGER NEED LIFTING OFF THEIR OWN ARROWS. The old
code measured the slope and pushed each name clear of the wedge two diverging
branches open — MEASURED in `/kit/` at 655 px, `settings` climbed 5.4 px
through the middle of its own word. There is no wedge now and no slope: the
line under a name is horizontal, so the name sits a fixed distance above it.
```

<a id="placesibs"></a>

## `diagram.mjs` placeSibs

```text
Every link whose two ends are boxes inside ONE container.

🔴 IT REPLACES THE TIE, IT IS NEVER DRAWN ON TOP OF ONE. A tie is a bracket
saying "these are parts of one machine" and carries no head, because a head
would claim an order the drawing does not know. Where the author has DECLARED
a link the order is known and said out loud, so the bracket has nothing left
to add and the arrow takes its place. Two lines between one pair of boxes is
the defect a return path under the row exists to avoid, one level in.

🔴 AND IT CARRIES NO NAME. The gap two stacked boxes share is sixteen pixels
tall and about half a box wide, so a name in it either runs under both boxes
or shrinks past the point of being read. The DIRECTION is the whole message
here; what travels goes in the link's `note`, which is read on hover in the
line under the picture where there is room for a sentence. A label written on
one anyway is reported on `cuts` rather than quietly ignored, because an
author who cannot see their own label has no way to know where it went.

Two shapes, and which one is used is not a preference:
  next to each other: the arrow runs down the gap they already share, where
    the tie ran.
  reaching past a box: a lane inside the container's own padding, out of one
    side and back in at the same side, because down the middle it would pass
    straight through a box it never visits.

@returns {object[]} drawable links, in the same shape the placers produce
```

<a id="placesibs-into"></a>

## `diagram.mjs` placeSibs: inTo

```text
🔴 AN INLET AND AN OUTLET MAY NOT BE THE SAME POINT, AND ON ONE EDGE THEY
WERE. Reported 2026-09-16 with a photograph of `/station/`: two lanes
arriving at the Worker's right edge landed on one arrowhead at `t.cy`,
because a lane's arrival y was the target's CENTRE whatever else was
already there. The forward links across the picture have shared out a
target's edge since the day two names printed over each other; the lanes
inside a container never learned it.
⚠️ HALF THE SPREAD THE OUTER ONES USE. Those are keeping two NAMES apart
and a name is two lines tall; a lane inside a container carries no label
at all, so what has to be apart is two arrowheads.
```

<a id="placesibs-bx"></a>

## `diagram.mjs` placeSibs: bx

```text
⚠️ OUTSIDE THE DIVE LANES, which share this right padding in one column
since 2026-10-05 and sit next to the boxes; see `laneX` in placeColumn
```

<a id="placesibs-head"></a>

## `diagram.mjs` placeSibs: head

```text
⚠️ THE HEAD LANDS ON THE BOX'S EDGE, not three pixels short of it. Those
three were the last of the four the corner needed; see `SIB_LANE`.
```

<a id="roundedpath"></a>

## `diagram.mjs` roundedPath

```text
A line through a list of corners, every turn rounded the way every other
line in the picture is.

🔴 IT EXISTS BECAUSE A DIVE HAS THREE TURNS AND THE THREE SHAPES ABOVE HAVE
TWO. `acrossLane`, `sideLane` and `stepElbow` are each one fixed shape
written out by hand, which is right while a shape is fixed: a link that
leaves a box inside a machine, runs down that machine's padding, crosses the
gap and turns into a box inside the next one has a different number of
corners depending on which of its two ends names a program. Writing that as
a fourth and fifth hand-rolled string is where two of them would drift apart.

⚠️ THE RADIUS IS CLAMPED PER CORNER, never once for the path. A dive turns
inside a container's padding, where a run can be fourteen pixels long, and a
6 px corner on a 10 px run doubles back on itself. Each turn takes the
smaller of the radius and half of each run it joins.
⚠️ AND A POINT THAT REPEATS ITS NEIGHBOUR IS DROPPED. A dive whose two ends
happen to line up would otherwise ask for a turn through zero degrees, which
renders as a dot of ink on the line.
```

<a id="sidelane"></a>

## `diagram.mjs` sideLane

```text
a lane that runs DOWN the side: `hs` +1 left of the column, -1 right of it.
⚠️ THE RADIUS IS A PARAMETER FOR ONE REASON: a lane inside a container has
about five pixels to turn in, and a 6 px corner on a 5 px run doubles back
on itself. Every lane outside the boxes keeps `CORNER`, so there is still
one radius in the picture a reader can see.
```

<a id="captiontexts"></a>

## `diagram.mjs` captionTexts

```text
Every string the line under the picture will ever hold.

🔴 THE CAPTION IS ONE OF THEM, AND LEAVING IT OUT IS WHY THE PAGE JUMPED.
That line is the caption until a box is hovered and that box's own sentence
while it is, so its height has to be reserved for the TALLEST of those — or
everything below the picture moves the moment the pointer touches a box. The
reservation used to start from whatever the element happened to be showing,
which is the caption only if nothing is hovered: a re-layout while the
pointer is on a box destroys the `<g>` that would have fired `pointerleave`,
so the element is left holding a five-word sentence and the whole block is
reserved at 19 px under a caption that needs 97. It reads as fixed, because
the next hover in and out repairs it.

Pure, so the test can check the list rather than the pixels: what went wrong
is WHICH STRINGS were measured, not how.
```

<a id="captiontexts-says"></a>

## `diagram.mjs` captionTexts: says

```text
🔴 WHAT THE LINE WILL SAY IS A `note` OR NOTHING, AND THE OLD FALLBACK WAS
AN ECHO. It read `n.note || n.title || n.label.full`, so a box with no
sentence wrote its own NAME into the line — under a box with that name
printed an inch above it. Every container has no note BY RULE, so pointing
at one printed `Raspberry Pi` under a box reading `Raspberry Pi`.
PHOTOGRAPHED on /mirror/. It is worst on a phone, where there is no
pointer to leave: whatever was last touched stays named indefinitely.
⚠️ SAYING NOTHING IS THE CAPTION, NEVER A COLLAPSED LINE. The caption is
the first string in this list and stays reserved, so a box with no
sentence simply leaves the line where it was.
```

<a id="captiontexts-links"></a>

## `diagram.mjs` captionTexts: links

```text
⚠️ AND A LINK'S SENTENCE IS ONE OF THEM TOO, WHICH IT NEVER WAS. The line
has held these since arrows became hoverable and the reservation never
learned about them, so a note longer than the caption grew the block on
hover — the exact jump this list exists to prevent.
```

<a id="box"></a>

## `diagram.mjs` box

```text
one box's geometry, and the baseline of every line of type inside it — plus,
for a container, the boxes it holds.

🔴 A CONTAINER IS MEASURED FROM ITS CONTENTS, NOT GUESSED AT. `h` already
holds the room its children need (`layout` took the tallest of every box in
the picture, containers included), so the only thing left here is to put the
words and the boxes in it: the whole block — the container's own name, the
gap under it, every child and every gap between them — is centred in the
height, exactly as a plain box's two lines of type are. A container that
top-aligned its contents would sit differently from every other box in the
row for a reason a reader cannot see.
```

<a id="box-top"></a>

## `diagram.mjs` box: top

```text
⚠️ THE CHILDREN STILL HANG OFF `top`, whichever way the text is aligned, so
a container's contents move with its head rather than needing a second rule.
```

<a id="box-tx"></a>

## `diagram.mjs` box: tx

```text
Where a line of text STARTS, and what it is anchored by. One pair, read
by the renderer, so the switch above is the only place that decides.
⚠️ A CONTAINER's words used to move right by `headInset`, clear of the
dive lanes down its left side. The lanes run down the right since
2026-10-05, so the words start where every box's do and are only wrapped
short of them; see `layout`
```

<a id="box-set"></a>

## `diagram.mjs` box: set

```text
⚠️ CARRIED THROUGH TO THE RENDER NODE EXPLICITLY. `box()` builds a fresh
object rather than spreading the spec, so a flag the author sets is invisible
to the painter unless it is copied here. `set` went missing exactly that way
and read as "the option does nothing".
```

<a id="how"></a>

## `diagram.mjs` HOW

```text
🔴 ONE HEADING, ONE WORDING, ONE PLACE. Every page that explains itself ends
with the same picture under the same three words, and the moment that is
typed per page it becomes "How this works" on one, "How it works" on the
next and "how this works" on a third. That is not a hypothetical: it was
MEASURED across the tree on 2026-09-16 and there were THREE treatments in
six pages. `items`, `radio`, `replay` and `station` passed `how: true` and
got this constant; `crate` typed `title: 'how it works'` and got its own
lowercase heading; `grains` had no heading at all. It is a constant because
it is a promise the site makes, not a label a page chooses.

🔴 AND THE WORDING IS `it`, NOT `this`, DECIDED 2026-09-16 ON A DIRECT ASK.
Three reasons, in the order they matter:
  · "How it works" is the settled English phrase. A reader recognises it
    without parsing, which is the whole job of a heading read once.
  · `it` ALREADY HAS THE RIGHT REFERENT ON THESE PAGES. Every `what`
    paragraph uses it for the demo: *"It keeps taking a few seconds of
    whatever is on air"*. `this` introduces a second pointer at the same
    thing, in a heading, three inches below the first one.
  · `this` is doing a job POSITION already does. The diagram is last on the
    page it belongs to, so nothing else could be meant, and a word that
    disambiguates something never ambiguous is a word to cut.
```

<a id="title-under-how"></a>

## `diagram.mjs` createDiagram: title under how

```text
🔴 A PAGE MAY NOT TYPE ITS OWN TITLE UNDER THE STANDING HEADING, AND IT
COULD, AND THE RESULT WAS TWO HEADINGS. PHOTOGRAPHED on `/station/`:

    HOW THIS WORKS
    HOW IT WORKS
    [the picture]

The page had carried `title: 'how it works'` since before `how` existed,
and adding `how: true` put the standing one above it rather than instead of
it. Neither half is wrong on its own, which is why nothing caught it.

Refused rather than silently dropped, and reported on `cuts` like every
other thing this component will not draw: an author who cannot see their
own title has no way to know where it went, and the page's own
`nothing cut, nothing refused` assert is what tells them.
```

<a id="atend"></a>

## `diagram.mjs` createDiagram: atEnd

```text
🔴 `atEnd` PUTS IT AFTER THE LOG, WHICH IS THE ACTUAL BOTTOM OF THE PAGE.
`mount()` appends the log to `document.body`, not to `.pos-body`, so a
diagram appended to the page's own element lands ABOVE it however late it
is built — which is the whole page except the last box. A page that wants
its explanation last has to say so, because "last" is not where the host
element ends.
⚠️ Outside `.pos-body` the shell's `* + *` rhythm does not reach it, so the
gap above comes from a class rather than from the page's own spacing.
```

<a id="marker-units"></a>

## `diagram.mjs` markers: units

```text
⚠️ `markerUnits="userSpaceOnUse"`, NOT the default. The default scales an
arrowhead by its line's stroke width, so a heavier line would grow a
heavier head — and stroke weight is one of the two channels carrying
`kind` in greyscale, which must stay a statement about BOXES only.
```

<a id="marker-refused"></a>

## `diagram.mjs` markers: refused heads

```text
🔴 FOUR HEADS, NOT TWO, SINCE 2026-09-22. Asked on `/wish/` as *"when
refused, paint recused conector/label red"*.
⚠️ **A MARKER DOES NOT INHERIT THE LINE'S STROKE**, which is the whole
reason this is four entries rather than one CSS rule. An SVG marker is
painted from its own fill, so a red line would have arrived at a grey
arrowhead and the picture would have contradicted itself at the one end a
reader looks at. `fill: context-stroke` would say it in one place and is
not safe to rely on here, so the refused pair is declared instead.
```

<a id="svg-aria-label"></a>

## `diagram.mjs` svg aria-label

```text
⚠️ `aria-label`, NEVER `<title>`. A `<title>` on the svg root is a NATIVE
TOOLTIP over the whole picture, so the drawer that says it has no tooltips
had one covering everything. `role="img"` plus a label is the same
accessible name with nothing drawn.
```

<a id="say"></a>

## `diagram.mjs` say and hueOfName

```text
⚠️ ONE FUNCTION WRITES THIS LINE, and the height reservation calls the
SAME one. Bold is wider than the face beside it, so a sentence measured as
plain text and drawn with a bold run in it can take one more line than was
reserved — which is the jump this whole mechanism exists to prevent,
reintroduced by the measurement instead of by the drawing.
Every box's name, lower-cased, to the hue it was drawn in. Rebuilt on each
layout because a re-layout can change what is in the picture.
```

<a id="say-hue"></a>

## `diagram.mjs` say: hue

```text
🔴 THE REFERENCE IS A COLOUR. A bold run whose text is a box's name is
drawn in that box's own hue, so a note can point at a box without
saying "the one above" or naming a file. Anything else stays plain
bold, which is what bold already meant.
```

<a id="measure-estimate"></a>

## `diagram.mjs` measure: estimate

```text
🔴 0 means "not measurable yet", never "an empty string" — that case
returned above. Estimating from the character count keeps the picture
roughly right until the host has a size, and `measured` says which of
the two happened, so /kit/ cannot report an estimate as a measurement.
```

<a id="sizes"></a>

## `diagram.mjs` sizes

```text
⚠️ ONE PLACE DECIDES LINE HEIGHT, and it derives it from the size the
stylesheet actually computed rather than from a number typed twice. Change
a font-size in shell.css and the boxes follow it, instead of leaving two
lines of type overlapping inside a box sized for the old one.
```

<a id="nodegroup"></a>

## `diagram.mjs` nodeGroup

```text
one box, drawn — a plain one, a container, or a box inside a container.

🔴 A CONTAINER AND THE BOXES IN IT ARE SIBLINGS IN THE MARKUP, never
nested `<g>`s, and that is a CSS decision rather than a drawing one:
`.pos-dg-n[data-kind="here"] .pos-dg-box` is a DESCENDANT selector, so a
box drawn inside a `here` group would take the container's styling as well
as its own, and hovering the machine would restyle everything in it. Two
flat groups cannot do that. The nesting a reader sees is geometry, which
is where this file keeps everything else.
```

<a id="nodegroup-aria-label"></a>

## `diagram.mjs` nodeGroup: aria-label

```text
🔴 `aria-label`, NOT `<title>`. A `<title>` here is the browser's own
tooltip, which drew this box's name ON TOP of the box while the line
under the picture was already saying it — the same words in three
places. The label is the only thing a screen reader now has, so it
carries the whole of the box: its name and its sub UNCUT, which keeps
the promise that shortening hides text and never loses it, and the
sentence, which is what a sighted reader gets from the caption.

⚠️ WITH THE ASTERISKS TAKEN OUT. A reader of the page sees a heavier
face; a reader of this attribute would have heard "star star" twice a
sentence, which is the mark leaking out of the one place that renders
it. MEASURED on /grains/ before this line existed.
```

<a id="nodegroup-hue"></a>

## `diagram.mjs` nodeGroup: hue

```text
⚠️ SET AS CUSTOM PROPERTIES, NOT AS `fill`. The stylesheet still owns
which state wins — a hovered box, a container, a dashed cloud — and it
reads these two. An inline `fill` would beat every one of those rules and
the kinds would quietly stop meaning anything.
```

<a id="nodegroup-show"></a>

## `diagram.mjs` nodeGroup: show

```text
Hovering writes what this box DOES into the line under the picture.
Not a tooltip: a tooltip is drawn on top of the thing it describes and
is read again every time you point at one, so it has to stay two short
lines. A line under the picture is read in place, has room for a whole
sentence, and costs no positioning code at all.

⚠️ AND IT SAYS SOMETHING THE BOX DOES NOT, OR IT SAYS NOTHING.
It used to fall back to the box's own name and sub — `Raspberry Pi,
another granulator`, under a box reading `Raspberry Pi` / `another
granulator`. A container has no note BY RULE, so every container did
that, and it was PHOTOGRAPHED on /mirror/. A line that repeats the box an
inch above it is the third channel a legend is; with no sentence to add,
the line keeps the caption, which is a fact the reader has not got yet.
```

<a id="render-phone"></a>

## `diagram.mjs` render: phone overlaps

```text
🔴 AND THE PHONE IS ASKED EVEN WHEN THE PICTURE IS NOT ON ONE. The
harness lays every page out at desk width, where the picture is a row,
so a collision that only exists in the one column layout was a defect no
run could see: /cam/ and /moq/ both read `cuts` empty with names printed
over each other at 375 px. The same description is laid out a second
time at the width it gets on the narrowest current iPhone, off screen
and drawing nothing, and only its OVERLAPS are added, marked with the
width, because a name shortened at one width is that width's own report.
```

<a id="render-hueofname"></a>

## `diagram.mjs` render: hueOfName

```text
⚠️ REBUILT ON EVERY LAYOUT, not once at construction. A re-layout can put
different boxes in the picture, and a stale name-to-hue map would colour
a word after the box it named had gone.
```

<a id="render-hueless"></a>

## `diagram.mjs` render: hueless kinds

```text
🔴 ONLY A BOX THAT PAINTS ITS HUE MAY LEND IT TO A WORD. `here` is the
browser you are reading this in, and the stylesheet gives it a lighter
fill and a plain grey edge on purpose: being filled is its whole
signal and it carries no colour. Its `tech` hue was still going into
this map, so the word `browser` came out BLUE under a picture where
the browser box is grey — a reader matching ink to ink finds nothing,
which is worse than no colour at all, because a colour that matches
nothing reads as a box they have missed.
```

<a id="render-resetcaption"></a>

## `diagram.mjs` render: resetCaption

```text
🔴 THE CAPTION GOES BACK FIRST, BECAUSE THE NEXT LINE DESTROYS THE BOX
THAT WOULD HAVE PUT IT BACK. `pointerleave` fires on an element, and an
element removed from under the pointer never fires it — so a re-layout
while a box is hovered (a resize, an orientation change, the first
ResizeObserver callback) leaves the line holding a sentence about a box
that no longer exists, and the reservation below then measures THAT.
Restoring here is the whole repair: nothing else can know a hover was
interrupted rather than ended.
```

<a id="render-passes"></a>

## `diagram.mjs` render: passes

```text
🔴 THREE PASSES, AND THE ORDER IS THE WHOLE OF IT. Containers first,
because an arrow that reaches a box INSIDE one has to cross that
container's edge and would otherwise be painted over by the machine it
is entering — the fork bug in a new costume, where a line ends somewhere
the reader cannot see it end. Then the links, so no box is drawn under
its own arrow. Then every box that holds nothing, which is the layer the
reader is meant to read. With no container in the picture the first pass
emits nothing and the order is what it always was.
```

<a id="render-hit-area"></a>

## `diagram.mjs` render: link hit area

```text
🔴 AN ARROW IS A THING YOU CAN POINT AT NOW, AND IT NEEDED A HIT AREA TO
BE ONE. A `<path>` with no fill is only hittable ON ITS STROKE, and the
stroke is one pixel — so the arrow that carries the most interesting
sentence in the picture ("what actually travels here") was the one thing
a pointer could not reach. The fat transparent copy underneath is the
standard repair: same geometry, twelve pixels wide, invisible.
```

<a id="render-bad"></a>

## `diagram.mjs` render: bad link

```text
🔴 `bad: true` PAINTS THE WHOLE LINK, LINE, LABEL AND HEAD, IN `--bad`.
   A page declares it; nothing here infers it, the same way `back: true`
   is an author flag. It is for a link the picture is REPORTING rather
   than describing: `/wish/` draws what a model asked for, and a refusal
   is the most important thing on that picture.
   ⚠️ IT IS A SECOND CHANNEL, NEVER THE ONLY ONE. The label still says
   `refused` in words, because colour alone fails a reader who cannot
   separate these two hues and fails a screenshot in greyscale.
```

<a id="render-link-label"></a>

## `diagram.mjs` render: link aria-label

```text
⚠️ AND IT SAYS WHAT TRAVELS, not what the arrow is called. The label is
already on the picture; a hover that repeated it would be the third
channel carrying one fact, which is the mistake the boxes' own note
exists to avoid. So with no `note` written the line KEEPS THE CAPTION,
the same as a box with nothing to add. The old fallback ended at
`wrk to player`, which is two ids out of the source.
⚠️ THE ACCESSIBLE NAME STILL FALLS BACK, because a thing with no name
at all is worse to a screen reader than a clumsy one, and nobody sees it.
```

<a id="render-ties"></a>

## `diagram.mjs` render: ties

```text
🔴 HOW MANY BRACKETS THIS PICTURE DREW, AND IT IS COUNTED BECAUSE A PAGE
HAS NO OTHER WAY TO ASK. A tie is the one mark in here that carries no
head, so "is there a headless line in my diagram" is the exact question
behind the report that bought the rule below, and until this existed the
only answer was to look at it. `cuts` cannot see it: nothing was cut.
```

<a id="render-tie"></a>

## `diagram.mjs` render: ties inside a container

```text
🔴 THE THINGS INSIDE ONE MACHINE ARE JOINED, AND THE JOIN HAS NO
ARROWHEAD. Three boxes stacked inside a container read as three
unrelated things that happen to be in the same room; a line between
them says they are one chain. ⚠️ AND NO HEAD, WHICH IS THE WHOLE
POINT: every arrow in this picture means "the signal goes this way",
and a head here would claim an ORDER between the parts of one machine
that the drawing does not know. It is a bracket, not a step.
Drawn BEFORE the children so a box's own fill covers its ends.
⚠️ DOWN THE MIDDLE, NOT DOWN THE LEFT. It used to hang at a fixed
12 px inset, which put it under the first letter of each label and
read as a margin rule rather than as a join between two boxes. A tie
leaves the bottom edge of one and meets the top edge of the next, and
it steps across with a rounded turn where their centres differ, which
is the same shape every other link in the picture makes.
🔴 AND A TIE IS NOT DRAWN WHERE A DECLARED LINK ALREADY RUNS. The
author has said there is a direction between those two boxes, so the
bracket has nothing left to say and two lines down one gap is the
thing every routing rule in this file exists to prevent.
🔴 BUT A GAP NOBODY DECLARED ACROSS STILL GETS ONE, AND THAT IS A
DECISION RATHER THAN AN OVERSIGHT. /station/ was reported as "where
is the arrowhead between programmes and schedule": its Cloudflare box
had an arrow, then a tie, then an arrow, and a headless line between
two headed ones reads as a head that fell off. Taking every tie out
of a container the moment one arrow is declared in it was tried and
is wrong. It puts the fix in the drawer for a fact only the author
knows, and it silently deletes the bracket from any machine whose
parts really are unordered. The repair belongs in the description:
order the boxes so that every pair the reader sees side by side is a
pair a direction has been stated for. `api.ties` is how a page checks
that it did, and /kit/ shows both halves of this gap on purpose.
```

<a id="render-join-false"></a>

## `diagram.mjs` render: join false

```text
🔴 `join: false` DRAWS NOTHING BETWEEN THEM AT ALL, which is a third
answer and was asked for on sight: *"no connections between
keyboard/playout and and notesout/soundback"*.

The three are now: an ARROW (the default, they feed each other), a
BRACKET (`set: true`, they are parts of one machine and the drawing
says so), and NOTHING (`join: false`). The last is right where the
container's own box already carries the whole relationship: `Browser`
holds a keyboard and a playout, and a line between them adds no fact,
it just gives the eye something to follow that leads nowhere.
```

<a id="render-inner-heads"></a>

## `diagram.mjs` render: inner arrowheads

```text
🔴 AN ARROWHEAD, AND THIS REVERSES WHAT THE BLOCK ABOVE ARGUES.
Instructed 2026-09-16 with a screenshot of `video`, `cue log` and
`timeline` joined by bare lines: *"need arrowheads between inner
boxes (make it a rule)"*.

The old reasoning was that a head claims an ORDER between the parts
of one machine that the drawing does not know. True, and it is the
wrong thing to optimise: a reader meeting a headed line, then a
headless one, then a headed one down a single column does not read
"this pair is unordered", they read a head that fell off. That was
REPORTED on `/station/` and now again here.

⚠️ SO THE DEFAULT FLIPS AND THE ESCAPE HATCH IS EXPLICIT. A
container whose children really are a SET rather than a chain says
`set: true` and gets brackets, which is the one case the old rule
was right about and the only one it should ever have covered.
```

<a id="render-caption-height"></a>

## `diagram.mjs` render: caption height

```text
🔴 THE LINE UNDER THE PICTURE KEEPS ITS HEIGHT, OR HOVERING MOVES THE
PAGE. A three-line caption replaced by a five-word sentence is two lines
shorter, so everything below the diagram jumps up the moment the pointer
touches a box and back down when it leaves — on a page of several
diagrams that is the whole article twitching under the cursor. The tallest
thing the line will ever hold is reserved once per layout, which costs a
few reflows here and nothing at all afterwards.

⚠️ AND IT RESERVES FOR THE CAPTION EXPLICITLY, never for "whatever the
element is showing". Those are the same string only while nothing is
hovered, and the one moment they differ is the one moment a re-layout
is running — which is when this code is reached. MEASURED at the point
the two came apart: `min-height: 19px` under a 97 px caption, so the
next un-hover grew the block by 78 px. `captionTexts` names the set,
which now includes every box's own SENTENCE and every box inside a
container — the two things this line can hold that the boxes did not
used to have.

⚠️ AND IT IS MEASURED THROUGH `say`, THE SAME WRITER THE HOVER USES.
Setting `textContent` here would measure `**bold**` as six characters of
literal asterisks in the ordinary face, while the hover draws a heavier
one that is wider — so the string that reserved three lines could be
drawn in four. A reservation taken with a different renderer is not a
reservation.
```

<a id="render-refused-self"></a>

## `diagram.mjs` render: refused self link

```text
a container and a box inside ITSELF: there is no gap between the two
to run a line through. Two boxes that are both inside one container do
have one and are drawn there; this is the case that is left. It is on
`cuts` as well, which is the report anybody actually reads.
```

<a id="test-header"></a>

## `diagram-test.mjs` test: module header

```text
demo/shell/diagram-test.mjs — the diagram's arithmetic, with no browser.

  node demo/shell/diagram-test.mjs

Three things in `diagram.mjs` are invisible when they are wrong, which is
why they are pure functions and why this file exists:

  - a column assignment that counted the return paths draws a round trip as
    a straight line of five boxes. It looks fine. It is a lie about the
    shape, which is the only thing the picture is for.
  - a wrap that drops a word looks like a shorter label.
  - two return paths at the same depth are ONE line on screen, and the
    second one is simply not there.

⚠️ THE RULER HERE IS MADE UP AND THAT IS THE POINT. `getComputedTextLength`
needs a live document; a fixed width per character needs nothing and makes
every expected number below exact rather than approximate. What it cannot
check is the real font — that is /kit/'s job, with real type in a real svg.

  - a branch drawn straight through the box in its way looks like a path
    that does not exist, and it is the SECOND branch that breaks, so the
    first one still looks right.
  - a container whose height is a GUESS rather than a measurement looks
    right with one box in it and wrong with three, which nobody tries.
  - a bold run that toggles on every marker turns one typo into a sentence
    that is bold from the mistake to the full stop, and reads as a decision.

  - a link drawn to the MACHINE a box sits inside looks exactly like a link
    drawn to the box: every arrow is present, the picture is complete, and
    each one arrives somewhere plausible and false. Four pages at once.

Thirteen of these are NEGATIVE CONTROLS: a check that cannot fail is a check
that is decoration, so each of the claims above is also run against an input
that must break it.
```

<a id="test-reach"></a>

## `diagram-test.mjs` test: REACH

```text
A BRANCH THAT REACHES PAST THE BOX IN ITS WAY, which is the shape every fork
takes: the second branch always skips whatever the first one landed on. Here
the settings go to Cloudflare AND straight on to the board, so `you -> pi`
has `cf` standing between its two ends — in the row layout by a column, in
the one-column layout by a row. One spec, both modes, one defect.
```

<a id="test-fork"></a>

## `diagram-test.mjs` test: FORK

```text
The fork that `grains` measured out: two copies of one thing, one here and
one on a board, fed the same settings. In a row the two copies share a
column and nothing is skipped; stacked in one column, `you -> cf` has the
copy in this page between its ends.
```

<a id="test-nest"></a>

## `diagram-test.mjs` test: NEST

```text
A MACHINE WITH TWO PROGRAMS ON IT, which is the case a `sub` under a name
draws as one thing. The note reaches ONE of the two programs and the OTHER
one answers, so a link that names a box inside a container has to be a real
link rather than a link to the container with a caption.
```

<a id="test-circle-control"></a>

## `diagram-test.mjs` test: forward circle control

```text
🔴 NEGATIVE CONTROL. The same four links with `back` dropped is a forward
circle. If the check above were passing because the graph is simply short,
this would also read 0/1/2; it must not.
```

<a id="test-equal-returns"></a>

## `diagram-test.mjs` test: equal returns control

```text
🔴 NEGATIVE CONTROL, and the reason this is not a distance table. Two
returns of EXACTLY the same length that overlap would both be "depth 1"
under a rule that reads the distance — one line on screen, the second
silently absent. They must come out different.
```

<a id="test-gutter-side"></a>

## `diagram-test.mjs` test: gutter side by side

```text
🔴 THE GUTTER HOLDS TWO THINGS SIDE BY SIDE, NOT ONE ON TOP OF THE OTHER.
This failed on screen first: `the sound` was drawn with a return path
running straight through it, because the gutter had been sized to
whichever of the lane and the name was wider. A name with a line through
it reads as a name in the wrong place, which is exactly what it was.
```

<a id="test-switch"></a>

## `diagram-test.mjs` test: 560 px switch

```text
⚠️ THE SWITCH IS A CLIFF AND IT IS SUPPOSED TO BE. 560 px is the line;
one pixel either side must give two different layouts, or the rule is
being decided by something else.
```

<a id="test-row-skip"></a>

## `diagram-test.mjs` test: row skip

```text
🔴 THE ROW LAYOUT. A forward link was a straight line from one box's edge
to the other's and routed around NOTHING, so a branch spanning two columns
was drawn through the box in the middle of it — in and out again, with its
name at the midpoint, i.e. under that box.
```

<a id="test-straight-step"></a>

## `diagram-test.mjs` test: straight step control

```text
🔴 NEGATIVE CONTROL. If everything were routed, the picture would be all
detours and the check above would pass on a drawer that had learnt
nothing. A step to the NEXT box along has nothing in the way and must
still be the straight line it always was.
```

<a id="test-column-skip"></a>

## `diagram-test.mjs` test: column skip

```text
🔴 THE ONE-COLUMN LAYOUT, WHICH IS WHERE THIS WAS FOUND. Every box is
stacked, a forward link was a straight vertical at its source's CENTRE,
and a branch reaching past one row therefore ran behind that box and came
out underneath it with an arrowhead into the next one — a phone read a
path the page does not have.
```

<a id="test-gutters-apart"></a>

## `diagram-test.mjs` test: gutters apart

```text
⚠️ THE RETURN PATHS ALREADY OWN THE LEFT-HAND GUTTER. Two kinds of routed
line in one gutter is the overlap bug this file already has three checks
for, in a new costume — so onward goes right, back goes left, and the
boxes are between them.
```

<a id="test-straight-drop"></a>

## `diagram-test.mjs` test: straight drop control

```text
🔴 NEGATIVE CONTROL: the OTHER branch of the same fork goes to the box
directly under it, has nothing in the way, and must still be the straight
vertical at the source's centre. Routing both would be a picture where
nothing goes anywhere directly.
```

<a id="test-caption-reservation"></a>

## `diagram-test.mjs` test: caption reservation

```text
🔴 THE RESERVATION USED TO START FROM WHATEVER THE ELEMENT WAS SHOWING.
That is the caption only while nothing is hovered — and a re-layout with
the pointer on a box destroys the box that would have put the caption
back, so the element is left holding a five-word sentence and the block is
reserved for THAT. MEASURED: `min-height: 19px` under a 97 px caption, so
the next un-hover grew the page by 78 px, which is the exact jump the
reservation exists to prevent.
```

<a id="test-link-sentence"></a>

## `diagram-test.mjs` test: link sentence

```text
🔴 A LINK'S SENTENCE IS ONE OF THE STRINGS THIS LINE HOLDS, and the
reservation never knew about them: a note longer than the caption grew the
block on hover, which is the jump the whole mechanism exists to prevent.
```

<a id="test-step-budget"></a>

## `diagram-test.mjs` test: step name budget

```text
🔴 A STEP'S NAME USED TO BE MEASURED AGAINST HALF A BOX. Between two
stacked boxes is a gap that is empty right across the picture with one
short arrow in it — MEASURED at 258 px in /kit/, that budget handed
`settings` 41 px with 106 px of nothing beside it, and cut it.
```

<a id="test-unfittable"></a>

## `diagram-test.mjs` test: unfittable name control

```text
🔴 NEGATIVE CONTROL, and the one that matters most here: a budget that
grew until nothing was ever cut would be indistinguishable from a drawer
that had silently stopped reporting. A name nobody could fit must still be
cut, and must still be COUNTED.
```

<a id="test-gutter-names"></a>

## `diagram-test.mjs` test: gutter by names

```text
🔴 A GUTTER IS SIZED BY WHAT ITS NAMES NEED, NOT BY A SHARE OF THE
PICTURE. Under the old flat 30% the same two names would move the boxes to
a different place on a wider page, for no reason anybody could point at —
and, worse, the name was WRAPPED to that share and the widest result then
sized the gutter, so a cut made the gutter smaller, which made the cut.

⚠️ AND THE TWO WIDTHS ARE CHOSEN SO THE OLD RULE WOULD FAIL IT. A name of
100 px is under 30% of 420 and over 30% of 300, so a share-of-the-picture
budget cuts it at one width and not the other and the gutter comes out
60 px apart. Picked at 460 and 540 first, where 30% never bit either way
and the check passed on the broken code — a test that cannot fail.
```

<a id="test-box-words"></a>

## `diagram-test.mjs` test: box words win

```text
🔴 WHEN IT WILL NOT ALL FIT, THE BOXES' OWN WORDS WIN. A picture that
shortens the names of the things it is about is broken where a reader can
see it; an arrow name that had to give way is reported instead.
```

<a id="test-name-side"></a>

## `diagram-test.mjs` test: name side control

```text
🔴 NEGATIVE CONTROL: the side is CHOSEN, not swapped. With nothing routed
in either gutter the boxes sit in the middle, the two sides are equal, and
the name stays where it has always been.
```

<a id="test-name-clearance"></a>

## `diagram-test.mjs` test: name clearance

```text
🔴 "SIX PIXELS ABOVE THE MIDDLE" ONLY CLEARS A HORIZONTAL ARROW. A fork's
arrows are DIAGONAL, and MEASURED in /kit/ the line climbed 5.4 px through
the middle of `settings`. The line here is rebuilt from the path string
rather than from the drawer's own numbers, so this cannot pass by agreeing
with the formula it is checking.

⚠️ AND IT IS MEASURED ACROSS THE NAME'S WHOLE WIDTH, NOT AT ITS MIDDLE.
Written against the midpoint first, where a straight line is at the
midpoint's own height whatever its slope — so a flat six pixels up scored
exactly six and the check passed on the broken code. The clearance a
reader sees is at the ENDS of the word, which is where the line reaches
it; positive means the name is above its line and negative below.
```

<a id="test-fork-wedge"></a>

## `diagram-test.mjs` test: fork wedge

```text
🔴 AND THE SECOND-ORDER ONE, which lifting alone produced: two branches
leaving one box open a WEDGE, and both names lifted above their own line
put the lower one inside the upper one's path. MEASURED at 4.2 px in.
```

<a id="test-return-name"></a>

## `diagram-test.mjs` test: return name below

```text
🔴 A BOX'S TWO ATTACHMENT POINTS ARE 12 PX APART AND A LINE OF THIS TYPE
IS 11 PX TALL, so a name placed BETWEEN them cannot clear both — MEASURED
in /kit/, the run leaving a box cut 2 px through the ascenders of the name
belonging to the run arriving at it. It goes below both instead, which is
where the row layout has always put a return's name.
```

<a id="test-container"></a>

## `diagram-test.mjs` test: container measured

```text
🔴 A CONTAINER IS MEASURED FROM WHAT IS IN IT. Nothing here re-derives the
drawer's own formula — that is the mistake `timeline/csound.mjs` made for
months, where the check and the code shared a misreading. These are the
things a READER sees: each box is inside its container on all four sides,
the two do not overlap each other, and the container's own name is above
the first of them.
```

<a id="test-container-grows"></a>

## `diagram-test.mjs` test: container grows control

```text
🔴 NEGATIVE CONTROL, and it is the one that matters: a container whose
height was a GUESS — a constant, or the plain box height plus a number —
would come out the same whatever was put in it. A third box in it must
make it taller, and the picture with it must be taller still.
```

<a id="test-no-nesting"></a>

## `diagram-test.mjs` test: no nesting no change

```text
🔴 EVERY LAYOUT THAT EXISTED BEFORE NESTING COMES OUT BYTE-IDENTICAL, and
this is the cheap in-suite half of that claim: the same description with
an EMPTY `children` on every box must be the same picture to the last
decimal. If any of the new arithmetic ran unconditionally it would show
up here as a diff. (The other half is every spec in this file and in
/kit/ diffed against the version before the change, at 17 widths.)

⚠️ AND IT TAKES TWO ASSERTS, because the obvious one is an A/B where both
arms share the bug: layout(spec) against layout(spec + `children: []`)
comes out equal even when the nesting arithmetic runs unconditionally,
since it then runs on BOTH. MEASURED by sabotage — forcing the container
branch always on left this at 63/63 until the second line existed. So the
result is also checked for any TRACE of nesting: no empty list, no key.
```

<a id="test-row-reaches"></a>

## `diagram-test.mjs` test: row reaches box

```text
🔴 LEFT TO RIGHT, AN ARROW REACHES THE BOX IT NAMES. The ground between a
container's edge and a box inside it is empty sideways, so the arrowhead
lands on the synthesiser rather than on the board — which is the whole
reason a link may name a box inside a container at all.
```

<a id="test-name-in-gap"></a>

## `diagram-test.mjs` test: name in gap

```text
🔴 AND ITS NAME IS MEASURED AGAINST THE GAP BETWEEN THE MACHINES, NOT
AGAINST THE LINE. The line is longer, because it carries on past the
container's edge to the box inside it — and the room beside that last
stretch is not empty, it is the container. A name budgeted on the run
would be written over the machine it is entering, which is the same defect
as a name under a box, one layer in. So the budget is the shorter number
and the name sits at the middle of the gap.
```

<a id="test-column-reaches"></a>

## `diagram-test.mjs` test: column reaches box

```text
🔴 STACKED, THE SAME ARROW REACHES THE SAME BOX, AND IT GETS THERE DOWN
THE CONTAINER'S PADDING.

This used to assert the OPPOSITE — that in one column the line stops at
the machine's edge — on a reason that is still true: a container's name is
at the TOP of it, so a vertical run coming down the middle crosses the
words `Raspberry Pi` on its way in, and every box stacked above the one it
wants. What was wrong was the conclusion. PHOTOGRAPHED 2026-09-19 on four
pages at once: `WebGL2 -> shader` drawn from the Browser's own edge,
`store -> play` arriving beside `uploader`, `ffmpeg -> up` leaving the
Raspberry Pi. An arrow that ends at the wrong box is a picture claiming a
path the page does not have, which is the defect a refused link was
already reported for.

So the line turns out of the box's side and runs in a lane inside the
container's own padding, which is the one strip in there that is empty
from top to bottom. Both halves are asserted: it ARRIVES at the box, and
nothing it draws inside the machine is anywhere near that machine's words.
```

<a id="test-sibling-link"></a>

## `diagram-test.mjs` test: sibling link

```text
🔴 TWO BOXES IN ONE CONTAINER ARE LINKED IN THE GAP THEY SHARE. This used
to assert the opposite — that the link was dropped and reported — and
/station/ is what changed it: grouping seven boxes into three machines
killed three real arrows and left the plain ties standing where they had
been, so the picture claimed a chain that does not exist.
```

<a id="test-sibling-no-name"></a>

## `diagram-test.mjs` test: sibling no name

```text
🔴 AND IT CARRIES NO NAME. Sixteen pixels of gap, half a box wide: a name
there runs under both boxes or shrinks past reading. The direction is the
message; what travels goes in the link's `note`. A label written anyway is
REPORTED, because a label that is nowhere on the picture and nowhere in a
report is a label its author will keep believing is drawn.
```

<a id="test-self-link"></a>

## `diagram-test.mjs` test: self link control

```text
🔴 NEGATIVE CONTROL, AND IT IS THE HALF THE OLD RULE GOT RIGHT: a box and
the box it is INSIDE have no gap between them at all. Still refused, and
now on `cuts` as well, because a console warning nobody reads is how the
three missing arrows stayed missing.
```

<a id="test-sibling-lane"></a>

## `diagram-test.mjs` test: sibling lane

```text
🔴 AND ONE THAT REACHES PAST THE BOX BETWEEN THEM GETS A LANE. Down the
middle it would pass straight through the box it never visits, which is
the fork bug the lanes over and under the row already exist to stop.
```

<a id="test-columns-machine"></a>

## `diagram-test.mjs` test: columns by machine

```text
🔴 A COLUMN IS A STATEMENT ABOUT THE MACHINES. A link naming a box inside
one must be counted against the machine, or the program gets a column of
its own and the picture says the signal visits a place it never leaves.
```

<a id="test-box-sentence"></a>

## `diagram-test.mjs` test: box sentence reserved

```text
🔴 A BOX'S SENTENCE IS WHAT THE LINE WILL HOLD, SO IT IS WHAT THE HEIGHT
IS RESERVED FOR. Reserving against the box's NAME while the pointer shows
its sentence is the same defect as reserving against the box while the
pointer shows the caption — one step further in, and it moves the page by
the difference.
```

<a id="test-no-echo"></a>

## `diagram-test.mjs` test: no echo

```text
🔴 A BOX WITH NO SENTENCE SAYS NOTHING, AND IT USED TO SAY ITS OWN NAME.
The line under the picture read `n.note || n.title || n.label.full`, so
pointing at a box with no note printed the words already drawn an inch
above it. PHOTOGRAPHED on /mirror/: `Raspberry Pi` under a box labelled
`Raspberry Pi`. Every CONTAINER has no note by rule, so every container
did it, and on a phone there is no pointer to leave: whatever was last
touched stays named.
⚠️ THE LIST STILL HOLDS AN ENTRY FOR IT. Saying nothing means the line
keeps the CAPTION, which is already the first string here, so the height
stays reserved and the block cannot collapse.
```

<a id="test-unpaired-bold"></a>

## `diagram-test.mjs` test: unpaired bold control

```text
🔴 NEGATIVE CONTROL: the tempting implementation toggles on every marker
it meets, which turns one typo into a sentence that is bold from the
mistake to the full stop — a rendering bug that reads as a decision. An
unpaired marker has to stay on the page as two asterisks.
```

<a id="test-dives"></a>

## `diagram-test.mjs` test: DIVES

```text
🔴 NOTHING GRADED THIS AND FOUR PAGES WERE WRONG AT ONCE.

`cuts` reports a link that was REFUSED, so a link routed to the WRONG END
reads clean through it: every arrow is drawn, the picture is complete, and
each one arrives somewhere plausible and false. PHOTOGRAPHED 2026-09-19 —
`/mirror/`'s `WebGL2 -> shader` leaving the Browser's own edge, `/floor/`'s
`films -> video` drawn machine to machine ON A WIDE SCREEN, `/crate/`'s
`store -> play` arriving beside `uploader`, `/knobs/`'s `ffmpeg -> up`
leaving the Raspberry Pi.

The three machines below hold two boxes each and every link names a BOX, so
every one of them is a case the old code got wrong. Both modes, because the
two layouts were wrong for different reasons and `/floor/` proves a phone is
not the only place it shows.
```

<a id="test-ends-path"></a>

## `diagram-test.mjs` test: ends off the path

```text
⚠️ MEASURED OFF THE PATH, NEVER OFF THE ROUTER'S INTENTION. The `d` string
is the only thing a reader sees. A check reading the variable the router
chose would agree with the router by construction, which is the
two-numbers-from-one-field defect in CLAUDE.md.
```

<a id="test-not-through"></a>

## `diagram-test.mjs` test: not through a box

```text
🔴 AND REACHING THE RIGHT BOX IS WORTH NOTHING IF IT IS DRAWN THROUGH
ANOTHER ONE. That is the whole reason the old code attached to the machine:
a vertical run into a box inside a container crosses the container's name
and every box above the one it wants. The lane in the padding is what buys
both halves, so both halves are asserted together.
```

<a id="test-ends-reported"></a>

## `diagram-test.mjs` test: ends reported

```text
🔴 AND THE REPORT IS THE HALF THAT REACHES A PAGE. The two checks above
run here and nowhere else; `layout` makes the same measurement itself and
puts a mismatch on `cuts`, so every page that already asserts `cuts.length
=== 0` grades its own picture with no page edit at all.

NEGATIVE CONTROL, and it is the whole point of this block: a report that
fires whatever it is shown is not a report. The spec is sabotaged by
naming a link end that is drawn nowhere near the box named — a container
standing in for the box inside it, which is EXACTLY the defect that was
photographed — and the count has to move.
```

<a id="test-wrong-ends"></a>

## `diagram-test.mjs` test: wrongEnds

```text
The picture that was photographed, built by hand: one machine holding a
box, another machine holding a box, and a line drawn from edge to edge
between the two MACHINES while naming the two boxes. Every pixel of it is
plausible and it is the exact shape of all four reports.
```

<a id="test-arrival-spread"></a>

## `diagram-test.mjs` test: arrival spread

```text
🔴 RESERVING THE WORST CASE IS THE SAME MISTAKE AS RESERVING TOO LITTLE.

Two arrivals at one box share out that box's edge so their names do not
print over each other, and the room was reserved at the CAP: two lines of
link type, every time, plus 18 px of air. Reported on `/station/` with a
photograph — *"two connectors arriving at one box sit too far apart"* — and
the arithmetic says why. Forty pixels on a box forty-eight tall puts one
head at each corner, and it was forty whether the names were two lines,
one line, or not written at all.

⚠️ THE AIR IS UNCHANGED AND THAT IS DELIBERATE. 18 px rather than 6 was
asked for in writing: two two-line names 28 px apart do not overlap and
read as one clump. What is fixed is the guess in front of it.
```

<a id="test-wrapped-names"></a>

## `diagram-test.mjs` test: wrapped names control

```text
🔴 NEGATIVE CONTROL, AND IT IS THE HALF THAT KEEPS THE OLD FIX ALIVE. A
spread that simply got smaller would put two two-line names back through
each other, which is the smear this mechanism was built for. Names long
enough to wrap must still get two lines of room.
```

<a id="test-empty-container"></a>

## `diagram-test.mjs` test: empty container

```text
🔴 AN AUTHOR CANNOT SEE THEIR OWN MISSING BOX. CLAUDE.md, 2026-09-20: a
container holds at least one box. An empty one takes a machine's worth of
space and says a caption's worth of thing — every box in a picture is
drawn to ONE height, taken from the tallest, so a machine with nothing in
it beside a machine with three boxes is a tall empty slab. `/station/`'s
own comment records exactly that, about a box it used to call `curl`.
```

<a id="test-filled"></a>

## `diagram-test.mjs` test: filled control

```text
🔴 NEGATIVE CONTROL ONE: give it a box and the report goes.
```

<a id="test-flat"></a>

## `diagram-test.mjs` test: flat control

```text
🔴 NEGATIVE CONTROL TWO, AND IT IS THE ONE THAT KEEPS THE RULE HONEST. A
picture where NOTHING nests has no slab in it: three machines the size of
three boxes is what a diagram of three machines looks like. Reporting
those would make the rule noise, and noise is how a report stops being
read. `TRIP` is the plan's own three-box example.
```

<a id="test-align-left"></a>

## `diagram-test.mjs` test: align left

```text
🔴 `align: 'left'`, ADDED 2026-09-22 FOR `/wish/`, WHERE A FIGURE IS NO
LONGER THE WHOLE BLOCK. Graded here rather than on the page because it is
pure arithmetic: `placeRow` picks one number and every x in the row follows
from it.
```

<a id="test-align-control"></a>

## `diagram-test.mjs` test: align control

```text
🔴 THE NEGATIVE CONTROL, AND IT IS THE ONE THAT MATTERS: in a box exactly
   as wide as the figure there is nothing to centre, so both must agree. A
   test that only compared a wide box would pass on an `align` that did
   something arbitrary rather than nothing.
```

<a id="test-align-inset"></a>

## `diagram-test.mjs` test: align inset

```text
The inset a left aligned figure keeps off its own edge IS the number a
   centred one falls back to when there is no room, so it is read from the
   drawing rather than typed. Typing 24 here made the box 20 px too loose and
   the check went red against a component doing exactly what it promises.
```
