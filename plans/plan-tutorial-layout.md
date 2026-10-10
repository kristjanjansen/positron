# Tutorial layout: words, build area and patchbay on one page

2026-10-10. Asked: a concept page *"where we try to put together slide layout
and patchbay layout"*, for *"future tutorials when there's a section (maybe
expandable, collapsible, later)"* with *"an area for component building"* and the
patchbay *"as a footer segment at the bottom or as a right sidebar"*. *"Come up
with different layouts, maybe build a small sandbox, just a couple of boxes
basically, keyboard"*. *"Concentrate desktop first."* A later note from the
owner, about phones: *"Main content is on top of slide content but slide is
scrollable or smth"*.

The sandbox is `/concepts/50/` (`demo/concepts/50/index.html`). It has a
`layout` choice that switches live between the four layouts below, plus `Hide
words` and `Hide patchbay`. Every layout is built from the same parts:

- **the words**: one tutorial step, a headline, three short paragraphs and three
  lines to try. They are one spec, drawn as page text in a column (A, B, D) or
  as a real `createSlide` split (C);
- **the build area**: an oscillator box and a filter box (`createGlueRows`, two
  `createKnob` each) and a kit keyboard (`createKeyboard`, `keyRange(21)`,
  C3 to A4);
- **the patchbay**: a real `createPatchbay` on a real bay,
  `keys -> osc -> filter -> speaker`. A key sends a note along the bay, which
  lights the MIDI cable, and while a key is held the audio cables show as
  flowing. There is no sound, and nothing opens on a visit.

The layout CSS is local to the page. `window.__demo.tl.measure()` returns every
region's box, whether the keyboard fits, whether the bay drew one row or
stacked, and where the page ends. Every number below comes from that function,
run by `node demo/shot.mjs concepts/50 1280 1440 --eval ...` in a 900 px tall
window.

## 0. What has to change before any of this works: the page is 720 px wide

`shell.css` sets `body { max-width: 720px }`, which leaves 688 px of content. A
words column, a build area and a patchbay do not fit in that at desk width. The
keyboard alone is 862 px at its own size. So the sandbox sets
`body { max-width: 1440px }` locally, which gives 1248 px of content at 1280 and
1408 at 1440. **Every layout below depends on this.** In the kit it would be one
option, something like `mount({ wide: true })`. It is the first cost on every
layout and is not repeated under each one.

Regions start at y 185 on every layout, below the header and the toolbar.

## 1. The four layouts

### A footer: words left, build right, the patchbay as a band under both

```
+----------------------------------------------------------------------+
| LAYOUT [A footer|B sidebar|C slide|D dock]  Hide words  Hide patchbay |
+---------------------+------------------------------------------------+
| A filter takes the  |  +------------+ +------------+                 |
| bright edge off a   |  | oscillator | | filter     |                 |
| saw                 |  | freq  wave | | cutoff  Q  |                 |
|                     |  +------------+ +------------+                 |
| The oscillator ...  |  +------------------------------------------+  |
| The low-pass ...    |  | C3 . D3 . E3 F3 . G3 . A3 . B3 C4 ... A4 |  |
| Q raises ...        |  +------------------------------------------+  |
| . hold a key        |                                                |
+---------------------+------------------------------------------------+
| patchbay  See details                                                 |
| [web:keys]---[web:osc]---[web:filter]---[web:speaker]                 |
+----------------------------------------------------------------------+
   1 fr                          2 fr
```

- **The bay picture** gets the full content width, so the chain is always one
  row: 1248 px at 1280 and 1408 at 1440, 94 px tall. It is the shape
  `bay-view.mjs` already draws on a desk. The no vertical rule is not tested
  here at all.
- **Collapse.** With the words hidden, the build takes the whole width and the
  page ends at 678. With the bay hidden, the two columns stay. Both are clean,
  because the grid areas change and no empty track is left behind.
- **Kit cost: the smallest.** A two area grid (`words build` over `bay bay`)
  plus the wide page. `createPatchbay` needs no change.
- **Measured.** 1280: words 408 px wide, build 816, page ends at **715**. 1440:
  words 461, build 923, ends at **678**. The keyboard fits both times; at 1280
  it gives up 46 px of its 862 and nothing scrolls. **This is the only layout
  where the words, the build and the whole bay are on one 900 px screen at
  both widths, with space to spare.**
- **Trade-off.** The words column is only 408 px at 1280, so the headline
  wraps to two lines and three paragraphs make the column about 413 px tall,
  taller than the build beside it (376). A longer step would push the bay down.
  The fix for that is D, or collapsing the words.

### B sidebar: words over build in the main column, the patchbay a fixed right sidebar

```
+------------------------------------------------+---------------------+
| A filter takes the bright edge off a saw       | patchbay  See det.  |
| The oscillator ...  (62ch, then empty card)    | +-----------------+ |
| . hold a key                                   | | web:keys  midi-o|-+
+------------------------------------------------+ +-----------------+ |
| +------------+ +------------+                  | | web:osc  midi-in| |
| | oscillator | | filter     |                  | |        audio-out|-+
| +------------+ +------------+                  | +-----------------+ |
| +--------------------------------------+       | | web:filter  ... | |
| | keyboard                             |       | +-----------------+ |
| +--------------------------------------+       | | web:speaker     | |
|                                                | +-----------------+ |
+------------------------------------------------+---------------------+
                  1 fr                                  360 px, sticky
```

- **The bay picture stacks.** At 360 px the host is under `bay-view.mjs`'s
  `STACK_BELOW = 480`, so it draws the **phone** picture: full width cards,
  ports on the right edge, cables in a gutter. 266 px tall, versus 94 for the
  same chain in a row. One row of four boxes needs about 750 px at the full gap,
  so a 360 sidebar could show less than half of the chain if it scrolled
  sideways instead.
- 🔴 **THE TENSION.** The owner's rule is *"do not do vert layouts on desktop.
  overflow"*, written into `bay-view.mjs` after a stacked bay on a desk was
  refused. A stacked bay in a sidebar is a sidebar's shape, not a page's
  vertical layout. But it is still a vertical bay on a desktop, and the rule
  never drew that distinction. **This needs the owner's call (section 4,
  question 1).** The sandbox shows the stacked version, because the other one
  is a sidebar with a window onto less than half of a four box chain.
- **Collapse.** With the words hidden the page ends at 561, the shortest of all
  the layouts. With the bay hidden the main column takes the full width.
- **Kit cost.** The wide page, a grid with a fixed side track, and a decision
  about the bay: either allow the stacked picture in a narrow host on a desk,
  which is what happens today when the host is under 480, or give
  `createBayView` a third mode for a narrow host. A sticky sidebar is one line.
- **Measured.** 1280: main column 864, sidebar 360, page ends at **926**, so the
  bottom of the keyboard is below a 900 px screen. 1440: main 1024, same
  sidebar, ends at **926**. The words card is 864 to 1024 px wide around text
  capped at 62ch, so 240 to 400 px of it is empty card. The keyboard fits at its
  own 862 px.
- **Trade-off.** The bay stays in view (sticky) next to whatever you scroll to,
  which is the best property any of the four layouts has. You pay for it with a
  vertical bay and a page taller than the screen.

### C slide: a real 1:2 split slide with the build in its slot, the patchbay under it

```
+----------------------------------------------------------------------+
| (card)                  | (darker well)                              |
|  A filter               |     +------------+ +------------+          |
|  takes the              |     | oscillator | | filter     |          |
|  bright edge            |     +------------+ +------------+          |
|  off a saw              |     +--------------------------------+     |
|                         |     | keyboard                       |     |
|  The oscillator makes a |     +--------------------------------+     |
|  sawtooth wave ...      |                                            |
+----------------------------------------------------------------------+  16:9, 702 px tall at 1280
| patchbay  See details                                                 |  <- the fold at 900 is here
| [web:keys]---[web:osc]---[web:filter]---[web:speaker]                 |
+----------------------------------------------------------------------+
```

- **This is `/kit/slides/`'s "interactive on the right".** `createSlide({
  layout: 'split', cols: '1:2', side: 'right', slot })`, with the build area
  moved into the slot at page size rather than through `fitBox`.
- **The bay picture** is a full width band under the slide, one row, as in A.
- 🔴 **THE SLIDE'S TYPE IS PROJECTOR TYPE.** The steps are shares of the slide's
  height. Even at `sayStep: 3` and `textStep: 2` the headline is about 9 per
  cent of 702, so about 63 px, and the paragraph is about 6 per cent, so about
  42 px. The third that holds the words fits the headline and **one** paragraph.
  The other two paragraphs and the list were left out of C on purpose, because
  they would have been clipped by `.sl { overflow: hidden }`. **A slide cannot
  hold a tutorial step's words unless the words are cut to the size of a slide.**
- **Collapse.** With the words hidden, the page drops the slide and shows the
  build alone, so it becomes A without words. With the bay hidden, the slide
  stands alone.
- **Kit cost.** Nothing new for the slide itself. A page has to move the build
  in and out of the slot, which the sandbox does by hand.
- **Measured.** 1280: the slide is 1248 by 702, the build sits at 719 wide in
  the middle of the well, and the bay starts at **911**, so it is **below a
  900 px screen**. The page ends at 1005. 1440: the slide is 1408 by 792, the
  bay starts at 1001, and the page ends at 1095.
- **Trade-off.** It looks like a talk and reads like one. It is the right shape
  for presenting a step full screen. It is the wrong shape for working through
  one at a desk: the words shrink to a slogan and the patchbay goes below the
  fold.

### D dock: the build on top at full width, a fixed dock under it with the words scrolling on the left and the patchbay on the right

This is the owner's phone note, laid out for a desk: the main content on top
and the slide's words under it, in a box that scrolls by itself instead of
pushing the page down.

```
+----------------------------------------------------------------------+
| +------------+ +------------+                                         |
| | oscillator | | filter     |                                         |
| +------------+ +------------+                                         |
| +--------------------------------------+                              |
| | keyboard                             |                              |
| +--------------------------------------+                              |
+---------------------+------------------------------------------------+
| A filter takes the  | patchbay  See details                          |
| bright edge ...     | [web:keys]--[web:osc]--[web:filter]--[web:spk] |
| The oscillator ...  |                                                |
| The low-pass ... v  |                                                |  dock 280 px
+---------------------+------------------------------------------------+
  1 fr, scrolls          2 fr
```

- **The bay picture** gets two thirds of the width: 816 px at 1280 and 923 at
  1440. That is enough for the four box chain in one row. A longer chain would
  have to scroll sideways inside the dock, which is the desk behaviour
  `bay-view.mjs` already has.
- **The words** are a 280 px box that scrolls inside itself. At 1280 there are
  133 px more to scroll and at 1440, 84 px. 🔴 **THE CUT HAS NO CUE.** The last
  visible line is sliced through its middle and nothing says there is more
  below. That is the closure problem `positron-compose` section 4 records for
  sideways scrollers. A fade at the bottom edge (`mask-image`) is the known fix
  and is not built yet.
- **Collapse.** With the words hidden the bay takes the whole dock width. With
  the bay hidden the words do. The dock keeps its height either way.
- **Kit cost.** The wide page, a two row grid with a fixed dock height, and a
  words panel that scrolls (a page text block with `overflow-y: auto` and a
  fade). Nothing changes in `createPatchbay`. It already scrolls sideways when
  it is narrower than the chain.
- **Measured.** At both widths the build is the full content width
  (1248 or 1408) and the page ends at **865**, which fits a 900 px screen with
  35 px to spare. The log under it does not fit. The keyboard sits at its own
  862 px with the rest of the row empty.
- **Trade-off.** It gives the build the most room and keeps it on top, where
  the hands are. Reading three paragraphs through a 280 px window is worse than
  reading them in a column (A). The dock's height is a fixed number that one
  tutorial step will always be too long for.

## 2. Summary of the measurements

| layout | 1280 page ends | 1440 page ends | fits 900 | bay | keyboard |
| --- | --- | --- | --- | --- | --- |
| A footer | 715 | 678 | yes | one row, 1248 / 1408 | fits, 816 at 1280 |
| B sidebar | 926 | 926 | no | **stacked**, 360, 266 tall | fits at 862 |
| C slide | 1005 | 1095 | no, bay starts at 911 / 1001 | one row | fits, centred in the well |
| D dock | 865 | 865 | yes, barely | one row, 816 / 923 | fits at 862 |

With the words hidden: A ends at 678 and B at 561.

## 3. Recommendation

**A footer on the desk. On a phone, every layout falls back to D's order.**

Reasons, in order:

1. **It is the only one that fits.** The words, the build and the whole bay are
   on one 900 px screen at both widths, at 715 and 678. D fits by 35 px and
   leaves its words in a window. B and C do not fit.
2. **It obeys the no vertical rule without asking.** The bay is a full width
   band, the one shape `bay-view.mjs` draws on a desk and the one the owner
   already approved on every concept page.
3. **The words are readable.** They sit beside the thing they describe, as a
   column of page text, not as projector type and not through a window.
4. **It costs the least.** A wide page and a two area grid. `createPatchbay`,
   `createSlide` and the keyboard stay as they are.
5. **Collapse is clean.** Without the words the build gets the whole width.
   Without the bay the page is two columns.

**D is the alternative to keep.** Pick it when a step's build area is wide, such
as a sequencer or a multi-track timeline, and needs the full width more than
the words need a column. It is also the phone layout, so it costs little to
keep.

**C is not a tutorial page layout.** It is how one step looks when it is
presented full screen. A tutorial could offer a *present* button that renders
the same step's spec as a slide, so that one spec gives both the page and the
slide.

## 4. Questions for the owner

1. 🔴 **Does the no vertical rule cover a sidebar?** In B the bay is 360 px wide
   and draws the stacked phone picture, because the host is under 480. The
   options: (a) a sidebar may stack, because the stacking belongs to the
   sidebar and not to the page; (b) the rule holds, so a sidebar scrolls the
   chain sideways and shows less than half of four boxes at a time; (c) no
   sidebars, footer only. The recommendation does not depend on the answer,
   because A has no sidebar. Any later page that wants the bay always in view
   does.
2. **A wide page.** Is `mount({ wide: true })` (up to 1440 px) acceptable for
   tutorial pages, given the site's 720 px column everywhere else?
3. **The scrolling words box (D and phone).** Should the cut edge fade, as a
   sign that there is more below? Today it slices a line in half.
4. **Sections.** *"a section (maybe expandable, collapsible, later)"*: is a
   tutorial several A blocks one under another, each one step, the page
   scrolling between them, with each block's words and bay collapsible? Or one
   A block whose contents a step picker swaps, as `/concepts/40/` does now?
5. **What collapse means.** In the sandbox, hiding a region removes it and
   gives its space to the build. Would you rather collapse words to a narrow
   rail with a vertical label, so it is always visible that there is something
   to open again?
6. **Should C become a *present* view of a step**, not a layout?

## 5. Mobile

Measured at 375 for A. On a phone every layout is one column: **the build
first, then the words in a box capped at 40svh that scrolls inside itself, then
the bay.** That is the order of the owner's note. The sandbox does this with one
media block that turns the grid into a flex column, so a hidden region leaves no
gap behind.

What a slide does on a phone today, checked in `slide.css`: in the page a slide
stays a 16:9 box with its columns. In full screen on an upright phone, a split
slide turns into rows, the slot on top and the words under it. Those words do
**not** scroll: they sit in an `auto` row inside `.sl { overflow: hidden }`, so
a long text is clipped. *"slide is scrollable"* describes what the owner wants,
not what exists.

How each layout gets to the phone:

- **A**: the two columns become build, words, bay. Measured at 375: the build is
  351 px tall; the keyboard is 343 px wide with the next key showing at the
  edge, so it is visible that it scrolls; the words box is 325 px with 155 more
  to scroll; the bay stacks, which is its existing phone picture, at 266 px.
  The page ends at 1213.
- **B**: the same. The sidebar has nothing to stack next to, so the bay goes
  last.
- **C**: the slide is dropped on a phone and the build stands alone, followed
  by the words. A 16:9 slide 343 px wide would shrink the keyboard to about a
  fifth of its size. `slide.css` records the same finding for the synths deck.
- **D**: it is already in phone order. The dock stops being a fixed height and
  becomes the 40svh words box.

No layout drags the page sideways at 375 (`shot.mjs` reports no overflow).

## 6. What was not done

- No sound. A real tutorial page would wire `/concepts/40/modules.mjs`, which
  makes its AudioContext on the first press. The sandbox does not import it,
  because another agent is editing 40.
- No collapse animation and no remembered collapse state.
- The shots are taken in a 900 px tall window. A 1440 by 900 laptop and a 1280
  by 800 one would change "fits" for D. In a 1280 by 800 window only A would
  still fit (715).
