# Tutorial layout: one slide frame with the words, the build area and the patchbay

Status (2026-10-14): done. It was built as /concepts/50/ and now sits archived at demo/archive/tutorial-slide/ (https://positron.studio/archive/tutorial-slide/).

2026-10-10. The page is `/concepts/50/` (`demo/concepts/50/index.html`, with its
own `modules.mjs`).

The first version of this plan compared four layouts (section 4 keeps the
measurements). The owner turned the comparison down: *"I'm asking you to design
a slide. So a page should contain a slide frame, and the content inside of it
can go to full screen and have some kind of mobile support."* The knobs on that
page were *"pretty messed up"*. This plan records the one design that replaced
the four.

## 0. The owner's answers

- **No sidebar.** The patchbay is a footer band, so the question of a stacked
  bay in a sidebar on a desk is closed.
- **No wide page.** The frame sits in the site's 720 px column. The 1440 px
  body override is gone.
- **The words scroll inside their column, with a fade** at the cut edge.
- **One frame with a step picker**, not several blocks down a page.
- **No collapse yet.** No hide words, no hide patchbay.
- **Mobile.** In the page on a phone the frame is a small 16:9 box with a ⛶.
  Full screen in landscape is the same frame. Full screen held upright turns
  into rows: the build on top, the words scrolling under it, the patchbay last.

## 1. The design as built

```
 STEP [1 oscillator|2 filter|3 scope]                              [⛶]
+----------------------+------------------------------------------------+
| A scope draws what   |  oscillator      lowpass filter    waveform    |
| reaches the speakers |  +----+ +----+   +----+ +----+   +-----------+ |
|                      |  |wave| |det.|   |cut.| | Q  |   |           | |
| The scope sits ...   |  +----+ +----+   +----+ +----+   +-----------+ |
| It draws one cycle   |  +------------------------------------------+  |
| ...  (scrolls, the   |  | C3 .. F4, 11 white keys                  |  |
| foot fades)          |  +------------------------------------------+  |
+----------------------+------------------------------------------------+
| patchbay                                                              |
| [web:keys]--[web:osc]--[web:filter]--[web:scope]--[web:speaker]       |
+-----------------------------------------------------------------------+
   1 fr, card ground         2 fr, darker ground          band, darker
```

- **The frame.** A 16:9 box in the page's column with the slide's edge and
  corner. Inside it is ONE surface of three regions with 1 px seams between
  them (the `.pos-glue` idea: a `--line` ground under a 1 px grid gap, every
  region painting its own ground). The words are on the card, the build area
  and the band on the darker ground, as a split slide draws its two halves.
- **Laid out once at a logical 1024 by 576 and scaled.** The inside is a fixed
  size grid, `transform: translate(--fit-x, --fit-y) scale(--fit-k)` from the
  top left, which is `fitBox`'s transform and its custom properties. Nothing
  reflows at any width; only the scale changes. 1024 rather than 1280, because
  at 1280 the page column's 688 px gave a scale of 0.54 and every kit control
  at half size; at 1024 it is 0.67.
- **The words**, a third of the width: the headline in the slide face at 26
  logical px, three short paragraphs and three things to try at 17. They scroll
  inside the column. While there is more below, a `mask-image` fades the last
  64 logical px; at the end of the column the mask comes off, so the last line
  is never dimmed for nothing.
- **The build area**, two thirds: three module boxes on one line (oscillator
  with `wave` and `detune`, lowpass filter with `cutoff` and `Q`, a waveform
  picture) and the kit keyboard under them, C3 to F4.
- **The knobs** are the kit's knob grid, `createKnobGrid(..., { cols: 2 })`,
  one per module. Inside the frame the dial is set to 60 logical px and the box
  follows from the kit's own tokens (`--kgrid-cell` re-declared from
  `--knob-w` and `--kgrid-inset`, because shell.css computes it at `:root`).
- **The patchbay** is a full width band along the bottom, `createPatchbay`'s
  picture only (no `See details` link and no tables, which would grow inside
  a fixed frame). It draws only the boxes the step's links use, in compact
  boxes, so it is one row at every step.
- **Steps.** `createChoice` above the frame, three steps. Each one changes the
  words, which module boxes show, and the patch:
  1. **oscillator**: keys to osc to speakers. The oscillator box.
  2. **filter**: keys to osc to filter to speakers. The filter box too.
  3. **scope**: keys to osc to filter to scope to speakers. The waveform too.

  A box a step does not use keeps its place (`visibility: hidden`) and its
  knobs are switched off through the grid's `show()`, so nothing moves between
  steps.
- **Sound.** `modules.mjs` is a copy of `/concepts/41/modules.mjs`, cut down:
  the amp folded into the oscillator so the chain stays one row, the knobs not
  bay nodes (four knob boxes in the first column would make the band four
  boxes tall), and the scope a thru box so adding it lengthens the chain. The
  AudioContext is made on the first key press. A visit opens nothing.
- **The ⛶.** In the page it ends the step row, outside the frame. Inside a
  frame at a third of its size on a phone, every corner of the build area it
  could sit on was a corner a box needed. Full, it moves into the frame's top
  right at real size and is the way out on a screen with no Escape key.
- **Full screen** goes through `fullscreen.mjs` on the frame (the real API,
  else the `position: fixed` cover), the frame takes the screen with no edge,
  and the same layout scales up and letterboxes.
- **Rows.** Full screen on a screen taller than it is wide lays the inside out
  at a logical 660 wide and as tall as the screen at that scale, one column:
  build, words, band. The words take what is left and scroll. The build starts
  under the ⛶, a real size read back through `--fit-k`.

## 2. Measured, 2026-10-10

`window.__demo.tf.measure()` returns the scale, the mode, every region's box,
the knob boxes, the fade and the bay's rows and overflow. Shots by
`node demo/shot.mjs concepts/50 1280 375`, full screen by `__demo.tf.full(true)`
through `--eval` (headless takes the cover path), 1280 by 720 with a copy of
`shot.mjs` given a height, and 390 upright.

| view | frame | scale | words, more below | bay | knob boxes |
| --- | --- | --- | --- | --- | --- |
| page, 1280 | 688 by 387 | 0.668 | 73 to 145 px, fading | one row, all five boxes in | 4, all 56.1 by 79.8 |
| page, 375 | 343 by 193 | 0.332 | same, fading | one row | 4, all 27.9 by 39.6 |
| full, 1280 by 720 | 1280 by 720 | 1.25 | 145 px, fading | one row | 4, all 105.0 by 149.2 |
| full, 390 upright, rows | 390 by 812 | 0.591 | none, all fits | **scrolls sideways 201 px at step 3** | 4, all 49.6 by 70.5 |

At every size: no knob box overlaps another, none is cut, all four are one
size, the keyboard does not overflow, and the page does not scroll sideways.

## 3. Why page local, and what the kit would need

`createSlide` was not used. Its layouts cannot hold this:

1. **`split` has two columns and no third region.** There is no footer band
   across both columns.
2. **Its words are fixed steps that clip.** They are shares of the slide's
   height in a box with `overflow: hidden`, and an upright full screen split
   puts them in an `auto` row where a long text is cut off.
3. **`fitBox` has one shape.** It closes over its logical width when it is
   made, and the rows mode needs a second width and a height that follows the
   screen.

What a reusable **tutorial slide** in the kit would need:

- a layout of three regions, words and build over a band (`layout: 'tutorial'`
  or a `band` option on `split`), with the 1 px seams and grounds as here;
- **words that scroll** in their column with the bottom fade, at a body size
  rather than a projector step;
- a **fit with two shapes**: a fixed logical frame that letterboxes, and an
  upright full screen that is a fixed logical width and as tall as the screen;
- the **⛶ that moves** between the page's control row and the frame's corner;
- the **steps** as data, each `{ say, text, list, boxes, patch }`, with a
  picker, so a tutorial is a spec like a deck;
- the knob grid at slide size, which today means re-declaring
  `--kgrid-cell` beside `--knob-w`; a `size` option on `createKnobGrid` would
  remove that.

Not added to the kit now, as asked.

## 4. History: the four layouts, measured before the decision

Measured in a 900 px tall window on the 1440 px wide body this page no longer
has.

| layout | 1280 page ends | 1440 page ends | fits 900 | bay | keyboard |
| --- | --- | --- | --- | --- | --- |
| A footer: words left, build right, bay band under both | 715 | 678 | yes | one row, 1248 / 1408 | fits, 816 at 1280 |
| B sidebar: bay a 360 px right column | 926 | 926 | no | **stacked**, 266 tall | fits at 862 |
| C slide: a real 1:2 split, bay under it | 1005 | 1095 | no, bay starts at 911 / 1001 | one row | fits |
| D dock: build on top, words and bay in a 280 px dock | 865 | 865 | yes, barely | one row, 816 / 923 | fits at 862 |

A was recommended. C showed that a slide's type holds a headline and one
paragraph and no more. D's words window sliced its last line with no cue,
which is where the fade came from. The owner's answer took A's arrangement
(words left, build right, band under both) and put it inside C's frame, with
D's scrolling words.

## 5. Open

- **The band scrolls sideways in rows at step 3.** At 660 logical the five box
  chain is 201 screen px too wide, so `web:speaker` is off the edge and the cut
  `web:scope` box is the only cue. The bay's stacked phone picture would fit
  (the words have room to spare there), but `bay-view.mjs` stacks only under
  480 px of host and the band is 628. Either the rows width drops under 512
  (then the keyboard scrolls) or the band is given a host under 480, which
  repeats a number `bay-view.mjs` does not export.
- **The step picker on a phone** fits only with one word names (`oscillator`,
  `filter`, `scope`); `an oscillator` pushed the third step off the row.
- **Not graded.** Concept pages are not in `manifest.mjs`, so no harness runs
  this page. The measurements above come from `measure()` in shots.
- **The waveform** is empty until a key is pressed, because the scope reads an
  analyser that does not exist before the first press.
- **Real devices** were not used. The upright full screen was seen only
  through the cover path in headless Chrome at 390 by 812; an iPhone takes the
  same cover path, Android Chrome takes the real API.
