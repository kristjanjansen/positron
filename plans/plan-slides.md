# plan: slides, a presentation track with live elements

Asked 2026-10-05: *"Bg track to presentations i need to do. Use videopanel for in
page placement and prev next. Investigate and make sample page for extra large
and large monotype. On page live examples. Look for slide design skills for
wording etc but keep our live elements edge"*.

Sample page: `demo/slides/index.html`, served at `/slides/` (not in the manifest
yet, not built, not deployed). Every claim below is marked **READ** (with its
source), **MEASURED** (on this machine, 2026-10-05, headless Chrome through a
CDP script at 1280 and 375 px) or **DECIDED** (a choice made here, open to
argument).

## 1. Verdict

A slide here is a **headline sentence over evidence**, and the evidence is
allowed to be a running part of the site. It lives inside `createVideoPanel`:
the panel's stage is the slide, its left slot carries previous and next, its
centre slot the count, its right slot the ⛶ that turns the panel into the
presenting mode. Type comes in exactly two mono sizes, both fractions of the
slide's own height: **LARGE = 9 per cent** for headlines and short lists,
**EXTRA LARGE = 18 per cent** for one number or one word. The sample page grades
all of it: 21 page asserts plus the shell's 2, **23/23 at 1280 and at 375**.

## 2. What the research says

### Wording

- **One message per slide, stated as a sentence.** READ: Alley's
  assertion-evidence checklist (Penn State, `writing.engr.psu.edu/AE_checklist.pdf`):
  *"Begin each body slide with a sentence-assertion headline that is left
  justified and no more than two lines"*, *"Support the assertion headline with
  visual evidence ... avoid bullet lists"*, *"the audience reads no more than 20
  words per minute"*, *"Keep lists to two, three, or four items"*. READ: the
  pptx skill's own guidance says the same in other words: *"One message per
  slide"*.
- **It is measured, not a taste.** READ (ASEE 2011,
  `peer.asee.org/assertion-evidence-slides-appear-to-lead-to-better-comprehension-and-recall-of-more-complex-concepts.pdf`,
  and Alley et al. 2006 as summarised in the search results): students recalled
  principles placed in a sentence headline better than the same principles in a
  topic headline with bullets.
- **No full stop on a headline.** READ: pptx skill, *"Don't end a slide title
  with a period"*; Alley's own example headline (*"Trabeculae reduce a bone's
  weight while giving it maximum strength against multiple forces"*) has none
  either. So a headline is a sentence without its last character.
- **The three second test.** READ: Duarte, *Glance Test*
  (`duarte.com/blog/the-three-second-test/`, HBR 2012): a slide should be
  understood in about three seconds by somebody who is also listening.
- **Do not read the slide aloud and do not put the talk on it.** READ: Mayer's
  redundancy principle (`devlinpeck.com/content/mayers-principles-of-multimedia-learning`):
  graphics plus narration beats graphics plus narration plus the same words on
  screen. Duarte separates **slidedocs** (meant to be read) from speech slides;
  this track is speech slides.
- **Bullets dilute.** READ: Tufte, *The Cognitive Style of PowerPoint*, as
  reviewed (`eyrie.org/~eagle/reviews/books/0-9613921-5-0.html`, ERIC
  EJ1000695): low resolution and deep bullet hierarchies fragment narrative and
  hide relationships. Garr Reynolds (`garrreynolds.com/design-tips`): maximise
  signal to noise, *"amplification through simplification"*.

**How the project's own rules carry over (DECIDED).** They already are these
rules: one sentence (`descs are single sentences`), no colon, semicolon, em
dash or middot buying a second clause, no private vocabulary, a number in a
fixed box rather than in prose. One addition specific to slides: **no full stop
at the end of the headline**. A headline that needs a comma to fit is the limit;
the sample's longest are *"A slide sits in a panel, and full screen is the
talk"* and *"The readout is the page's own, measuring this screen"*.

### Type size and line length

- READ, Alley: headline **28 pt** on a 7.5 in (540 pt) tall slide = **5.2 per
  cent** of height; body 18 to 24 pt = 3.3 to 4.4 per cent.
- READ, pptx skill: title **36 to 44 pt**, body 14 to 16 pt, big stat callouts
  **60 to 72 pt**, on a 16:9 canvas 5.625 in (405 pt) tall: title **8.9 to 10.9
  per cent**, stat callout **14.8 to 17.8 per cent**.
- READ, 8H rule (Presentation Guild, `presentationguild.org/how-big-big-enough-the-8h-rule-reveals-all/`):
  if the back row is at most eight screen heights away, text at least **1/50 of
  the screen height** (2 per cent) is readable to everybody, and that is a
  minimum.
- READ, signage rule of thumb (digitalsignage.com typography guide): 1 in of
  letter height per 10 ft comfortable, per 20 ft minimum.

### Background and contrast

READ, Tufte's notebook thread on projected backgrounds
(`edwardtufte.com/notebook/recommended-background-for-projected-presentations/`):
light on dark for dark rooms, dark on light for lit rooms, and *"look at the
various design solutions under real conditions"*. READ, PolicyViz and the
Slidor summary: dark backgrounds want a bright projector (3500 lumens and up).
DECIDED: positron's dark ground is kept, because a live element is a picture
built for that ground. A light variant is open (section 7).

### Presenter needs

- READ, Logitech (`support.logi.com`, HID codes for R400/R700/R800): the clicker
  sends **PageUp** (previous), **PageDown** (next), **F5 and Escape alternately**
  from its play button, and **`.`** from its blank button.
- READ, reveal.js speaker view (`revealjs.com/speaker-view/`): `S` opens notes
  in a second window with the next slide and a timer; Escape for overview;
  `B`, `V` or `.` for a black screen; Space for next.

## 3. The two sizes, chosen and measured

| size | share of slide height | read against | 1280 px page | 375 px page | 1280x720 full screen |
| --- | --- | --- | --- | --- | --- |
| LARGE | **9 %** | pptx title 8.9 to 10.9 %, 4.5x the 8H floor | **34.73 px** | **17.26 px** | **64.8 px** |
| EXTRA LARGE | **18 %** | pptx stat callout 14.8 to 17.8 %, 2x LARGE | **69.46 px** | **34.53 px** | (2x LARGE) |

All MEASURED as computed `font-size` against the slide's measured height, tolerance
0.5 px. The slide in the 1280 page is 686 x 385.9 px; in the 375 page 341 x 191.8.

**Why those two (DECIDED, from the READ numbers).** LARGE sits inside the
pptx title band and above Alley's 5.2 per cent, because a mono face is wider
than Calibri and needs the extra height to read at the same distance. The 2:1
ratio is the signage rule's *"headline = 2 x body"* applied one step up, and a
step nobody can mistake for "almost the same" (the composition skill's own
rule). Weight 600 for the headline, 400 and `--dim` for a list, no tracking.

**Line budget (MEASURED and asserted).** At 9 per cent and a 6 per cent side
inset, the face gives about **28 characters a line**, so two lines hold about
**56 characters**. Every headline in the sample measures exactly 2 lines at both
widths, and the page asserts `every headline is two lines or fewer`, so the word
budget is a check rather than advice. EXTRA LARGE holds about 14 characters,
which is a number with its unit.

**Contrast (MEASURED).** Headline `--fg` on the stage's `--card`: **14.6:1**,
asserted at 7:1 or better. The list's `--dim` is lower and is not asserted.

**Scaling (DECIDED, MEASURED).** The stage is a size container (`container-type:
size`, page-local), the slide is a second size container, and type is in `cqh`.
So the slide scales with the panel's box, never the window.
MEASURED pitfall: with the inset on the slide itself, LARGE came out at **7.7
per cent** at both widths, because container query units measure the content
box. The inset now lives on an inner `.sl-in`, and the slide's own box is the
unit. In full screen the slide is letterboxed 16:9 (`min(100cqw, 100cqh*16/9)`)
and the type keeps its share: MEASURED 1280 x 720 in a 1280 x 900 screen,
LARGE 64.8 px.

## 4. The slide model

```js
const SLIDES = [
  { name: 'one thing', say: 'A slide says one thing, in one sentence',
    list: ['two lines at most', 'evidence under it', 'three seconds to read'] },
  { name: 'back row', say: 'Text must be big enough for the back row',
    big: '1/50', under: 'of the screen height' },
  { name: 'counter', say: 'This number is counting live on the slide', live: liveSegment },
  ...
];
```

| key | what | rule |
| --- | --- | --- |
| `name` | short id for the log and a future picker | lowercase, two words |
| `say` | the headline at LARGE | one sentence, no full stop, two lines (asserted) |
| `list` | up to three lines at LARGE, dimmed | Alley's two to four items |
| `big` | one number or word at EXTRA LARGE | about 14 characters |
| `under` | one LARGE line under `big` | the unit or what the number is of |
| `live(host)` | builds a running element, returns `{ start, stop, value }` | built on first show, started on show, stopped on leave, opens nothing |
| `notes` | speaker notes (not in the sample) | see section 7 |

The address carries the slide (`/slides/#3`), so a reload or a dropped
projector cable lands back on it.

## 5. Live elements: what goes on a slide

On the sample, MEASURED moving and then stopping when left:

| slide | kit piece | moving value |
| --- | --- | --- |
| counter | `segment.mjs` `createSegment` at `size: '36cqh'` | seconds since shown, 0.1 to 1.2 in 1.1 s |
| readout | `createReport` readout (`fps`, `frames`) | frames 8 to 71 |
| picture | `pattern.mjs` `burn()` into a 1280x720 canvas | frame 14 to 80 |
| panel | `diagram.mjs` `createDiagram`, row mode, 0 cuts, a lit box walking | box 0 to 1 |

**A finding worth keeping (MEASURED).** The readout first showed `fps` and
`frame ms`, and the "it moves" assert went **red**: a screen locked to 60 Hz
reads 60.0 and 16.67 ms for a whole second. Honest, and still a readout cell
that cannot change. `frames` replaced `frame ms`.

**px components on a slide (DECIDED, MEASURED).** A readout and a diagram are
sized in px. They are laid out at a fixed logical width (`fitBox`, 360 px and
600 px) and scaled into the evidence region with a `--fit-k` custom property,
the way a projector scales a picture. The diagram **flips to its one column
layout below its row break** (MEASURED: at a logical 520 px it drew `column`),
so 600 is the narrowest it stays a row. The cost: on a phone the scaled readout
labels are small. A slide on a phone is a preview, not a talk.

**Fit for a slide, next (not built):** a strip view and a transport bar on a
local deck (`timeline/transport.mjs`), a step grid, a wave view of a bundled
sample, a knob that the audience sees turn, the synth view's envelope. Two rules
come with them:

- **Nothing opens anybody's stream on a slide change.** The sample asserts
  `stepping every slide fetched nothing` (14 resources before, 14 after, 0
  foreign). A slide that plays a real stream needs a press on the slide, and
  the existing external-source rules apply unchanged.
- **The space bar is contested.** `transport-bar.mjs` listens on `window` and
  owns space as play. A slide with a bar on it must either use `toggle: false`
  or the deck must give up space as next. Unsettled.

## 6. Navigation and presenting (built and asserted)

- Footer: `createStepper` (‹ ›) in the left slot, switched off at either end;
  `3 / 6` in the centre; the default ⛶ in the right. MEASURED: next and
  previous move one, clamp at both ends, the count follows.
- Keys: Right, Down, PageDown, Space for next; Left, Up, PageUp for previous;
  Home and End; `.` or `b` to blank; `f` or **F5** to toggle full screen
  (so the R400's play button enters and its alternate Escape leaves). Keys are
  ignored in a text field or a select, with a modifier, and Space or Enter on a
  focused button stays the button's. MEASURED: the sequence of nine keys lands
  on `1,2,3,2,1,5,0,1,0`.
- Full screen is `video-panel.mjs` `full()`, `fullMode: 'hover'`: the footer goes,
  the shared ⛶ exit appears on movement. MEASURED in headless Chrome: the real
  element API ran, slide 16:9 and inside the screen, and leaving gives the
  panel its shape back.

## 7. What is open

1. **Speaker notes.** Cheapest real version: a `notes` key, and `s` opens a
   second window fed by `BroadcastChannel` (local, no network) showing the
   notes, the next headline and a clock, the reveal.js shape. Not built.
2. **Touch in full screen.** `hover` mode hides the footer, so a phone in full
   screen can only leave, not step. Options: `fullMode: 'footer'` (the slots stay,
   a bar on the projection), or tap halves of the slide (collides with a live
   element that takes pointer input). Undecided.
3. **Keys always steal arrows and Space.** The page is the deck, so they step
   slides even when the panel is scrolled out of view. Alternative: only while
   the panel is full or at least half visible.
4. **A light variant for lit rooms**, per the Tufte thread. Would need every
   live element to read its colours from tokens, which most do.
5. **Kit change, not made (shared files were off limits):** a `createSlideDeck`
   in `demo/shell/` taking `SLIDES` and a panel, so a talk is a data file. And
   `createVideoPanel` could take `stage: 'size'` to declare the container
   instead of a page rule reaching into `.pos-vp-stage`.
6. **Projected size is reasoned, not measured.** No projector was plugged in.
   On a 3 m wide 16:9 screen LARGE would be about 15 cm tall per em, far over
   the 8H floor; checking it means standing at the back of a real room.
7. **Fonts.** `--mono` is `ui-monospace`, so the line budget of about 28
   characters is SF Mono's. Menlo or another fallback will shift it; the
   two-line assert is what catches that, per machine.

## 8. Cost

One page, 0 shared files touched, no network on load or on any slide change.
Verification was `check-html.mjs`, one CDP script at two widths (the harness
refuses a slug not in the manifest: `nothing for this harness to verify`) and
`shot.mjs` at 375 and 1280.
