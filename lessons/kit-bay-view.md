# Kit lessons: bay-view

The longer comments cut from `demo/shell/bay-view.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-bay-view.md#<anchor>`.

<a id="header"></a>

## `bay-view.mjs` module header

```text
demo/shell/bay-view.mjs: the bay drawn from its own data and nothing
else. A box is a node (`bay.nodes()`), its inlets and outlets are its ports
(`bay.ports()`, in on the left, out on the right), and a wire is a link
(`bay.links()`) from the outlet it names to the inlet it names, coloured by
the out port's medium, with no arrowhead: out is always the right or
bottom edge and in the left or top, as on a patch cable. No typed labels,
no notes: rename a port and the picture follows. Wide hosts chain left to right; a phone stacks top to
bottom with inlets on the top edge and outlets on the bottom.
```

<a id="options"></a>

## `bay-view.mjs` createBayView options

```text
stretch: boxes share the width and wires keep GAP; false keeps each box
at its own width and gives the rest to the wires. sizeAs: n draws a box
as wide as one in a row of n stretched boxes. maxWire caps the gap a
wire crosses when stretch is false; the row then sits at the left.
detail: (node) => [beside the title, under it left, under it right], each a
string or { text, sans }, drawn grey. Without it a box is compact.
```

<a id="phone"></a>

## `bay-view.mjs` phone layout

```text
A phone: full width cards, title top left with the first field under
it, every port on the right edge one per row (ins, then outs), and every
wire in a gutter to the right, one lane each, reused where their
vertical spans do not overlap (plans/plan-links-view-phone.md).
```

<a id="title-rows"></a>

## `bay-view.mjs` phone layout: title rows

```text
🔴 A TITLE THAT DOES NOT FIT BESIDE ITS PORTS GETS A LINE OF ITS OWN,
   2026-10-11. The first port row shared the title's line on every card,
   so on /typist/score/?n=6 at 375 px the gutter took 22 lanes, the
   cards shrank to 159 px and `web:typewriter-k` was drawn over its own
   `value-in` (40 overlapping labels, MEASURED). Each card now measures
   its title (and the grey field under it) against the port names on the
   same rows, and only a card that collides pushes its ports down a row
   or two. That moves every span, so the lanes are worked out again, and
   a narrower card can make another one collide: it settles in a few
   passes because a card only ever gains rows. A card narrower than its
   own longest name is not squeezed further: the picture widens and
   scrolls inside its own box.
```

<a id="fan-lane"></a>

## `bay-view.mjs` phone layout: lanes

```text
⚠️ A FAN SHARES ONE LANE, 2026-10-11: every wire out of one outlet
(a sample store to six typewriters) or into one inlet (six fx boxes
to one speaker) runs in one lane as a trunk with branches, which is
how a patch bus is drawn. One lane per wire gave typist/040 at six
papers 26 lanes, a gutter wider than its cards. Twins (same two
ends) keep a lane each, so they still split, run and rejoin.
```

<a id="timed-label"></a>

## `bay-view.mjs` timed wire label

```text
🔴 A TIMED LINK SAYS SO ON ITS WIRE, SINCE 2026-10-12. `ahead` and
   `follow` (link-options.mjs) change WHEN a message lands, which no
   port name shows, so a wire carrying one is dashed and carries its
   option in the link's own text form, `ahead 150`, at its middle, in the
   medium's colour. The one typed label this view draws, and only the
   timing ones: `w 640` on a video link changes what is asked for, not
   when, and stays off the picture as before.
```

<a id="timed-label-fit"></a>

## `bay-view.mjs` timed wire label: fit

```text
⚠️ NOT ON A PHONE. There the wire's middle is its lane in the right
gutter, a few px from the screen edge, and the words ran off it
(MEASURED at 375 on /concepts/clock/030/). The dash and the hover stay.
It has to fit between the two boxes, or it lies on their port names
(MEASURED on /concepts/clock/040/, `follow web-1:cam:video-out` over
a 70 px gap). The full option, then the node it follows, then the
option's name alone, then nothing but the dash and the hover.
```
