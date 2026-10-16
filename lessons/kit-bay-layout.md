# Kit lessons: bay-layout

The longer comments cut from `demo/shell/bay-layout.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-bay-layout.md#<anchor>`.

<a id="fold"></a>

## `bay-layout.mjs` layoutBay: folding

```text
🔴 A ROW THAT DOES NOT FIT FOLDS ITS LABELS FIRST, 2026-10-11. Asked:
   *"adjust rendering so the connectors fit into w"*, when the relay box
   (`cf-relay:<room>`, patchbay.mjs) made a three box chat 15 px wider than
   the page and its return wire ran off the right edge. The grey field
   beside a title moves under it, which narrows every box to its title or
   its ports, before the row is allowed to scroll.
```

<a id="nodew"></a>

## `bay-layout.mjs` nodeW

```text
One width per COLUMN, from the boxes in it, since 2026-10-11 (*"adjust
rendering so the connectors fit into w"*): one width for every box made
a four column chain as wide as four of its widest box, and Yoshimi's
row ran off the page for one long knob name in the first column.
```

```text
One width for every box by default since 2026-10-16 (*"can boxes be same w in general?"*),
falling back to one width per column only when the equal row does not fit at MIN_GAP:
measured that day, /remote/circuit/'s four columns ran web:speaker off the right edge at
1280 px with one width for all.
```

<a id="stack"></a>

## `bay-layout.mjs` layoutBay: stacking

```text
Too wide even then: a wide host keeps the chain and scrolls sideways;
only a phone stacks. Stacking on a desk was tried 2026-10-10 and
refused: *"do not do vert layouts on desktop. overflow"*.
```

## `bay-layout.mjs` layoutPair: two facing columns

Asked 2026-10-14: *"In bg work on alternative version of patchbay view on mobile with 2 cols and more showy while 1 col remains as functional one (more space for cables there). Shot kit comparison page. Will use it on ig, front etc"*; found not done on 2026-10-15 (*"you never did 2 col patchbay layout??"*).

- Every port sits on the box's INNER edge, ins then outs, so every wire lives in the field between the columns: across the field an S curve, between two boxes of one column a loop into the field whose depth grows with the span. The one column view keeps a lane per wire and stays the working view on pages.
- The split puts sources left and the rest right, at the place where the two columns come out closest in height; a split inside a rank costs four rows, so a near tie keeps the sources together (the radio tuner: five sources left, player, tuner and speaker right).
- Each column has its own floor width, and the field shrinks first, to 24 px, before the picture outgrows its box. MEASURED 2026-10-15 in /kit/patchbay/'s 282 px phone frame: one shared floor and a 40 px field drew the pair 4 to 20 px too wide and cut the right column's edge; per column floors fit all three examples at 282.
- A pair's height does not depend on its width, so a writer filling a band (the radio reel, the 4:5 posts) draws it as wide as the band's shape asks and scales once.
