# The links picture on a phone

Written 2026-10-10 from two screenshots of `/concepts/21/` at 375 px, asked as
*"how to improve mobile rendering. inlets outlets always to right? title always
on top left (extra fields bottom left if bigger version)"*. A spec, not built.

## What is wrong today

The renderer is `demo/concepts/20/links-view.mjs`. Below 480 px a chain that
does not fit becomes a vertical stack, and the stack moves things around:

1. **The title moves.** It sits under the in-port row, so it is the second line of
   one box and the first line of the next (`web:webgl` first, `studio-1:gpu`
   second). A reader looks for it in a different place in every box.
2. **Ports are centred on the top and bottom edges.** Two outs share the bottom
   edge at half and quarter width, so their wires leave from arbitrary points
   and cross on the way down (the `/concepts/2/` picture: `program-out` and
   `video-out` swap sides before they land).
3. **A wire that skips a box is drawn behind it.** `webgl:video-out -> left:video-in`
   goes straight down through `studio-1:gpu` and out of its bottom edge, where
   it reads as the gpu's own output.
4. **Return wires go over the top**, so the first box needs room above it and
   the loop sits close to the text above (fixed today by reserving that room;
   still the wrong shape).

## The proposal: ports on the right, wires in a gutter

On a phone every box is the same full-width card, and every wire lives in a
gutter to the right of the cards.

```
┌──────────────────────────────┐
│ web:synth          midi-in ─┼──┐
│                  audio-out ─┼─┐│
│ engine browser               │ ││   ← gutter: one lane per wire
└──────────────────────────────┘ ││
┌──────────────────────────────┐ ││
│ web:speaker       audio-in ─┼─┘│
└──────────────────────────────┘  │
```

- **Title top left, always.** Same place in every box, compact or detailed.
- **Detailed fields bottom left**, under the title, grey: label in sans, kind
  and place in mono, as the desk layout has them.
- **Ports on the right, one per row, right aligned**, ins first, then outs. The
  name already says `-in` or `-out`, so the side does not have to.
  In compact mode the first port row shares the title's line, so a box with one
  port is one line tall.
- **Every wire leaves a box at its port's row on the right edge**, runs right to
  its own lane in the gutter, vertically to the target port's row, and back left
  into the target box. Rounded corners, the `rounded()` helper that already
  draws return wires.
- **One rule for every link.** Forward, return and skipping links are the same
  shape, so the special cases go away: no wire passes behind a box (problem 3),
  no loop above the stack (problem 4), and twins (an octaver's three transposes)
  get three lanes, which is the split, run and rejoin shape for free.
- **Lanes are reused.** A lane is given to a wire for its vertical span only, so
  two wires whose spans do not overlap share a lane (interval colouring, the
  greedy kind is enough). Each lane is 8 px.

### What it costs in width

At 375 px the content is 343 px. The gutter takes `8 + 8 × lanes`:

| picture | links | lanes needed (estimate) | card width |
| --- | --- | --- | --- |
| 10 Keyboard | 2 | 1 | 327 |
| 3 Chat | 2 | 2 | 319 |
| 6 Broadcast | 8 | about 5 | 295 |
| 14 Shader | 11 | about 6 | 287 |

The lane counts are estimates from the link spans, not measured. Even 14 leaves
cards wide enough for `cf-store:history` plus a port label on one line. If a
picture ever needs more than about 10 lanes, that is the case for scrolling
sideways, as the desk layout already does.

## What it does not change

- The desk layout (left to right chain, ins on the left edge, outs on the right)
  stays. This is only the stacked mode, below `STACK_BELOW` (480 px).
- The data is unchanged: still `bay.nodes()`, `ports()`, `links()` and the
  optional `detail(node)`.
- The page's live shading keeps working: it projects along the wire's end to end
  vector, which in this layout is vertical, so a pulse still travels out to in.

## Open questions

- **Order of boxes.** Rank order (depth along the links) as today, or the order
  the nodes were declared? Rank order keeps forward wires going down, which
  reads better; declared order is what the page author chose.
- **Ins before outs in one column**, or ins and outs in two columns on the
  right? One column is narrower and is what this spec assumes.
- **Should the desk layout adopt the gutter too** for return and skipping wires?
  It would fix the wires on `/concepts/6/` and `/concepts/14/` that cross
  boxes, but it is a bigger change to the picture people already know.
