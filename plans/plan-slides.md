# plan: slides, a presentation track with live elements

Asked 2026-10-05: *"Bg track to presentations i need to do. Use videopanel for in
page placement and prev next. Investigate and make sample page for extra large
and large monotype. On page live examples. Look for slide design skills for
wording etc but keep our live elements edge"*.

Sample page: `demo/slides/index.html`, served at `/slides/` (in the manifest as
`unlisted`). Revised the same evening on the owner's verdict on the first
version: *"look for type alternatives. 5 of them. this one dos not work. center
content below titles (diagram). no backlit lcs example."* Section 9 is the
typefaces; sections 1, 3, 4 and 5 carry the other two changes. Every claim below is marked **READ** (with its
source), **MEASURED** (on this machine, 2026-10-05, headless Chrome through a
CDP script at 1280 and 375 px) or **DECIDED** (a choice made here, open to
argument).

## 1. Verdict

A slide here is a **headline sentence over evidence**, and the evidence is
allowed to be a running part of the site. It lives inside `createVideoPanel`:
the panel's stage is the slide, its left slot carries previous and next, its
centre slot the count, its right slot the ⛶ that turns the panel into the
presenting mode. Type comes in exactly two sizes, both fractions of the slide's
own height: **LARGE = 9 per cent** for headlines and short lists, **EXTRA LARGE
= 18 per cent** for one number or one word. The face is no longer the system
mono: it is one of eight self-hosted monospaced faces, **JetBrains Mono by
default** since 2026-10-05 (section 9), switchable under the panel and carried
in the address. Everything under a headline is centred in the space below it,
and a caption sits at SMALL in the bottom left corner. Since 2026-10-05 the
deck is a real talk about positron, sixteen slides, every number measured and
sourced (section 10). `node demo/verify.mjs slides` reads **45/45** (39 page
asserts), up from 36/36.

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

## 3. The type scale: one base, one ratio, six steps

Asked 2026-10-05, after looking at the deployed talk: *"big type headers /
sentences words. figure out type scale. use accent yellow on some"*, then *"bit
more line height on smaller font"*. The three ad hoc sizes (SMALL 4.5, LARGE 9,
EXTRA LARGE 18 per cent of the slide height) are replaced by a modular scale.

**The reasoning (READ, then DECIDED).** A modular scale is one base times one
ratio to a power, and the harmony is in sticking to it (Every Layout; Tim
Brown's modular scale). Which ratio matters less than having one, but two
neighbouring steps must be at least about 25 per cent apart or nobody can say
when to use which (Refactoring UI; positron-compose section 1). Projection
pushes the other way from print: the Takahashi method sets a few words as
large as the slide allows and lets the words BE the slide, and Lessig style is
the same idea paced fast, one short phrase or number a slide. Read against
section 2's figures: the pptx title band is 8.9 to 10.9 per cent, a stat
callout 14.8 to 17.8, and the 8H floor is 2.

**DECIDED: base 4 per cent of the slide's height, ratio 1.5.** The base is
twice the 8H floor, so the smallest text on a slide is still comfortably above
what the back row can read. 1.5 is far above the 25 per cent floor, and it
lands the old LARGE, 9, exactly on step 3, so the evidence keeps the size the
deck was measured at and only the headline and the big words move. 1.333 made
seven steps between 4 and 30 with two nobody needed; 1.618 put the headline at
10.5 (not clearly bigger than 9) or at 16.9, where a line holds 13 characters.
Declared once on `.sl-panel` as `--sl-base: 4; --sl-ratio: 1.5` and
`--sl-1` .. `--sl-6`, each `calc` off the one below, so nothing types a size
twice; the self-check reads the two numbers back and derives the steps itself.

**Line height is part of the step (DECIDED, asked for).** It opens as the size
drops: a big line is read as a shape and its leading is mostly empty ascender
room, a small line is read across a wide measure and the eye needs the room to
find the next one. Declared beside each step as `--sl-<n>-lh`.

| step | cqh | line | x next | 686 px panel (1280 page) | 343 px panel (375 page) | full screen 1280x720 | use |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `--sl-1` | 4.00 | 1.45 | 1.5 | 15.44 px | 7.67 px | 28.8 px | caption, bottom left |
| `--sl-2` | 6.00 | 1.30 | 1.5 | 23.15 px | 11.51 px | 43.2 px | evidence with four rows |
| `--sl-3` | 9.00 | 1.20 | 1.5 | 34.73 px | 17.26 px | 64.8 px | evidence: tables, stacks, a list |
| `--sl-4` | 13.50 | 1.10 | 1.5 | **52.09 px MEASURED** | 25.89 px | 97.2 px | the headline |
| `--sl-5` | 20.25 | 1.05 | 1.5 | 78.14 px | 38.84 px | 145.8 px | a statement slide |
| `--sl-6` | 30.38 | 1.00 | (top) | **117.21 px MEASURED** | 58.26 px | 218.7 px | one number |

The slide is 385.9 px tall in the 1280 page and 191.8 px in the 375 page. The
two bold figures are what the harness printed; the rest are the step times the
measured slide height, and the page asserts every size it draws is one of
these within 0.5 px (step 1 x35, step 2 x16, step 3 x30, step 4 x18, step 5 x4,
step 6 x2, at both widths). The full screen column is arithmetic for a 720 px
slide; the harness's own full screen is 756 x 425 and measured step 5 at
86.1 px, which is 20.25 per cent of 425.

**Why four rows drop to step 2 (MEASURED by the spill assert).** The inset
leaves 86 per cent of the height. A two line headline takes 2 x 13.5 x 1.1 =
29.7, the caption 2 x 4 x 1.45 = 11.6, and the gaps 7, which leaves 37.7 for
evidence. Three rows at step 3 are 32.4 and fit; four are 43.2 and do not, so
a table or stack of four rows is set at step 2 (31.2). The rule is in code
(`evStep`), not chosen per slide.

**Statement slides, and why three lines (DECIDED).** Two slides are a sentence
and nothing else, at step 5: *"Positron is a lab for live media"* (three lines)
and *"Break the check first"* (two). A statement has no evidence under it, so
the room a headline leaves for evidence is the room a third line takes: 3 x
20.25 x 1.05 = 63.8, plus the caption, inside 86. Headlines stay at two.

**Line budget (MEASURED and asserted).** Martian Mono was removed on the
owner's word (*"rm martian mono"*, section 9), so the widest face is Atkinson
at 0.632 em and it sets the budget: **18** characters a line at step 4,
**12** at step 5, **27** at step 3. The six faces at 0.600 em hold 19, 12 and 28.
Every headline is written to wrap greedily into two lines of 18, and the page
asserts two lines or fewer (three for a statement) in all seven faces at both
widths: MEASURED `3222222222222222` in every face.

**Headlines rewritten for the bigger step** (meaning and every source comment
kept): *"Positron is a lab for live media in a browser"* became the statement
*"Positron is a lab for live media"*; *"Cloudflare carries the streams in
between"* became *"Cloudflare carries the streams"*; *"Latency is read off a
clock burned into pixels"* became *"Latency is read off a burned clock"*;
*"MoQ wins the middle and WebRTC wins the tail"* became *"MoQ is quicker,
WebRTC steadier"*; *"Stock hls.js parks where its start left it"* became
*"Stock hls.js parks where it starts"*; *"Playing the Pi directly skips the
relay"* became *"Direct to the Pi skips the relay"*; *"The Circuit holds 29
sessions of real work"* became *"The Circuit holds 29 real sessions"*; *"A step
on screen waits for the next frame"* became *"A step waits for the next
frame"*; *"Two clocks agree once the offset is measured"* became *"Two clocks
agree after measuring"*; *"Every demo is built from one kit of parts"* became
*"Every demo uses one kit of parts"*; *"A stand-in replaces somebody else's
server"* became *"Stand-ins replace other servers"*; *"The Pico router runs the
routing core in C"* became *"The Pico router runs its core in C"*; *"ERR
refuses live TV by programme, not age"* became *"ERR refuses by programme, not
age"*; *"A check counts only once it has failed"* became the statement *"Break
the check first"* with 38/38 moved into its caption; *"The model was faster
with a loose schema"* became *"A loose schema made it faster"*; *"Next is the
hardware nobody has run yet"* became *"Next is untested hardware"*.

**Yellow and the diagram hues (DECIDED, asked for).** `*x*` in any slide string
paints it `--hi`, on what carries the point: `live` (lab), `26.2` and `84.1`
(transports, the two winning figures), `1.87` and `3.05` (llhls, the tuned
runs), `48 ms` (pi), `29` (circuit), `Break` (sabotage), `1.6` (schema). The
first ask was one per slide; the owner then said *"do not have be on single
one"*, so the assert counts rather than caps, and fails only when colour
covers half a slide's words or every slide. `[x|box]` paints a word in the hue
the diagram of the machines gives the box called `box` (*"use also colorcoding
slide with some hilited text and numbers in same hue ang also diagram
colors"*): `Cloudflare` on the machines headline and in the transports and
llhls captions, `Pi` in the machines caption, the pi headline and the next
list. The hue comes from `diagram.mjs`'s `TECH_HUE` through the page's own
diagram spec, at the diagram's text strength, and is asserted equal to the
colour the diagram itself draws that box's name in. MEASURED: 9 of 16 slides
carry colour; contrast on the slide ground yellow **12.8:1**, Cloudflare
**10.1:1**, Raspberry Pi **8.0:1**.
⚠️ **ONLY THE TWO OUTER BOXES CAN LEND A HUE TODAY.** MEASURED: a bold `page`,
`relay` or `synths` in a diagram note comes back plain bold, so the diagram
does not colour the name of a box inside a container, and a slide word joined
to one would have nothing on screen to match. Not fixed here (`demo/shell/` was
out of scope); it is either a defect in `diagram.mjs`'s name map or a rule
nobody wrote down. MoQ and WHEP get no hue: `TECH_HUE` has nothing that tells
two transports apart, and inventing one is what that table exists to stop.

**Contrast (MEASURED).** Headline `--fg` on the stage's `--card`: **14.6:1**,
asserted at 7:1 or better. The yellow at 7:1 and each hue at 4.5:1, above. The list's `--dim` is lower and is not asserted.

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
  { name: 'readout', say: "The readout is the page's own, measuring this screen", live: liveReadout },
  ...
  { name: 'faces', say: 'Five faces, the same letters at both sizes', specimen: true },
];
```

| key | what | rule |
| --- | --- | --- |
| `name` | short id for the log and a future picker | lowercase, two words |
| `say` | the headline at LARGE | one sentence, no full stop, two lines (asserted) |
| `list` | up to three lines at LARGE, dimmed | Alley's two to four items |
| `big` | one number or word at EXTRA LARGE | about 14 characters |
| `under` | one LARGE line under `big` | the unit or what the number is of |
| `live(host)` | builds a running element, returns `{ start, stop, value, subject }` | built on first show, started on show, stopped on leave, opens nothing; `subject` is what the centring assert measures |
| `specimen` | the five-face specimen | `0O` at EXTRA LARGE over `Il1` at LARGE, one column per face in switcher order, the chosen one in `--hi` |
| `notes` | speaker notes (not in the sample) | see section 7 |

The address carries the slide (`/slides/#3`), so a reload or a dropped
projector cable lands back on it.

## 5. Live elements: what goes on a slide

The slide list since the revision: `one thing` (list), `back row` (`1/50` at
EXTRA LARGE), `readout`, `picture`, `panel` (diagram), `faces` (specimen). The
**seven-segment counter is gone** on *"no backlit lcs example"*: an LCD
imitation is a costume, not a running part. Three live slides remain, which is
the asserted minimum, so no replacement was needed.

**Centred (MEASURED and asserted).** `.sl-ev` is `align-items: center` and
`text-align: center`; the headline stays left aligned (asserted). A list
centres as a block with its lines left aligned inside it. The canvas and the
scaled readout and diagram stretch across the region and centre their own
picture. Asserted: the centre of what is under every headline sits within 2 px
of the inset's centre, in a 688 px panel and in a 343 px one (375 less the
gutters, set by the check on the panel itself). MEASURED: 0.0 to 0.2 px at
both. Proved by sabotage: `align-items: flex-start` takes both asserts red, the
list 115.7 px off and `1/50` 229.8 px off at 688.

On the sample, MEASURED moving and then stopping when left:

| slide | kit piece | moving value |
| --- | --- | --- |
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
  `with the faces in, stepping every slide fetched nothing, and nothing came
  from another host` (24 before, 24 after, 0 foreign), and `DEMO_HOSTS=1`
  counted one host only, the dev server, 28 requests. A slide that plays a real stream needs a press on the slide, and
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
7. **Fonts.** Settled in section 9: five self-hosted faces, so the budget no
   longer depends on which mono a machine has. Still open: a face's own
   OpenType features (Plex has a slashed zero behind `zero`) are not switched
   on, and the specimen does not name the faces, it relies on the switcher's
   order under it.

## 8. Cost

First version: one page, 0 shared files touched, no network on load or on any
slide change. Revision: the page, ten woff2 files and five licences in
`demo/slides/vendor/`, and one block in `workers/view/build.mjs` listing them
(a font is not an import, so the build copies it only by name, and
`checkVendorUrls()` would refuse the build without it).
Verification was `check-html.mjs`, one CDP script at two widths (the harness
refuses a slug not in the manifest: `nothing for this harness to verify`) and
`shot.mjs` at 375 and 1280.

## 9. Seven faces, all monospaced, and the one by default

**Martian Mono is gone, on the owner's word (2026-10-05): *"rm martian
mono"*.** Its `@font-face` pair, its picker entry, its two files and its
licence are deleted, and `workers/view/build.mjs` no longer lists it. It was
the widest face (0.700 em) and set the headline budget; Atkinson (0.632 em)
sets it now, at 18 characters a line at the new headline step (section 3). The
seven together are **217,044 bytes**. What follows below is the eight face
round as it was written, kept as the record; Martian's row and its budget
figures describe a face no longer on the page.

**The first round was wrong and is replaced.** It mixed three proportional
faces (Atkinson Hyperlegible Next, IBM Plex Sans, Space Grotesk) in with two
monos because the brief read "mono or not". The owner had asked for large
MONOTYPE, and said so again on 2026-10-05: *"is atkinson monospace!?"* then
*"all monos. add more"*. All three proportional faces, their files and their
licences are gone.

Eight faces, every one monospaced (asserted: `i` measures as wide as `m` in
all eight), all **SIL Open Font License 1.1**, all self-hosted from the
`@fontsource` 5.3.0 packages (`cdn.jsdelivr.net/npm/@fontsource/<id>@5.3.0`,
downloaded once), Latin subset, weights **400 and 600** only, a `LICENSE-<id>`
beside each pair in `demo/slides/vendor/`. All eight together were **238,024
bytes** (232 KB), seven are 217,044. The page loads the chosen face's two files; the others arrive
when the specimen slide is shown or the picker is stepped.

**Budget.** In a mono face every character is one advance, so a LARGE line
holds `0.88 / (0.09 x 0.5625 x advance)` characters: the inset width over one
advance at 9 per cent of a 16:9 slide's height. MEASURED by the page with
`measureText` and printed in the log: **28** for the six faces at 0.600 em,
**27** for Atkinson (0.632 em), **24** for Martian (0.700 em). Martian sets the
deck's budget, so every headline is written to fit two lines of 24. Three
headlines were shortened to get there, and are listed under the table.

The test that decided the set is the specimen slide: `0O` over `Il1` at LARGE
in every face, the face's name under each column at SMALL (4.5 per cent, half
of LARGE) in that face, two rows of four. LOOKED AT in `shot.mjs` at 1280 and
375, and before that on a twelve face sheet at 44 px and 90 px, weight 600, on
the slide ground.

| face | source | bytes (400 + 600) | LARGE line | at 9 % | at 18 % | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| **Atkinson Hyperlegible Mono** | Braille Institute, `googlefonts/atkinson-hyperlegible-mono` | 20,096 | **27** | humanist, drawn for low vision; tailed l, flagged 1, slab I | slashed zero against a round O, the clearest pair of the eight | **default** |
| JetBrains Mono | JetBrains, `JetBrains/JetBrainsMono` | 43,028 | 28 | tall x-height, rectangular; I l 1 distinct | dotted zero, O a tall rounded box | the code voice |
| Geist Mono | Vercel, `vercel/geist-font` | 20,008 | 28 | clean geometric, slab I and 1 | slashed zero | neutral and light on bytes |
| IBM Plex Mono | IBM, `IBM/plex` | 30,328 | 28 | serifed slab I, l with a foot, the most typographic | dotted zero | the bookish one |
| Intel One Mono | Intel, `intel/intel-one-mono` | 33,672 | 28 | made for low vision like Atkinson but chunkier and quirkier; tailed l | dotted zero, heavy at 600 | strongest on a washed out projector |
| Fira Code | Mozilla lineage, `tonsky/FiraCode` | 46,628 | 28 | humanist, open counters; I l 1 distinct | slashed zero | heaviest file; ligatures unused here |
| Source Code Pro | Adobe, `adobe-fonts/source-code-pro` | 23,284 | 28 | the classic, lighter colour than the rest at 600 | dotted zero | the quiet one |
| ~~Martian Mono~~ | Evil Martians, `evilmartians/mono` | 20,980 | **24** | wide and heavy, the most character; I l 1 unmistakable | slashed zero, largest glyphs on the slide | REMOVED 2026-10-05, *"rm martian mono"* |

**Default: JetBrains Mono, the owner's choice (DECIDED 2026-10-05).** Asked in
those words: *"jetbrains default"*. It is the site's own code voice, and at 28
characters a line it costs nothing against Atkinson's 27. The paragraph below
is the earlier recommendation, kept as the reasoning it was, and Atkinson stays
one press away on the picker.

**Earlier recommendation: Atkinson Hyperlegible Mono.** It is drawn for low
vision, which is the back row's problem (READ: Braille Institute,
`brailleinstitute.org/freefont`), its `0O` pair is the one nobody can confuse
(slashed zero beside a round O, where JetBrains and Plex tell a dotted zero
from a squarer O), and its I, l and 1 are three different shapes. It costs one
character a line against the 0.6 em faces (27 against 28), which Martian's 24
already outweighs. JetBrains Mono is the switch for the site's code voice.

**Weighed and not picked.** Iosevka: about 1 MB a weight from fontsource,
forty times the others. Commit Mono: 48 KB a weight and near JetBrains and
Geist to look at. Red Hat Mono: a second geometric slashed zero beside Geist.
Victor Mono: too light at 600 on a dark ground. Fira Mono, Space Mono, DM Mono
and Ubuntu Mono: no 600 weight in fontsource. Ubuntu Sans Mono: the narrowest
(0.56 em, 31 a line) but Ubuntu Font Licence rather than OFL. Recursive was not
downloaded or looked at.

**Headlines shortened for Martian's 24** (the other seven would have held the
old wording): *"The readout is the page's own, measuring this screen"* became
*"The readout is live, measuring this screen"*; *"The test picture draws itself
here, frame by frame"* became *"The test picture draws itself, frame by frame"*;
*"A slide sits in a panel, and full screen is the talk"* became *"A slide sits
in a panel that fills the screen"*; and the specimen's *"Five faces, the same
letters at both sizes"* became *"Eight faces, all mono"*. MEASURED: every
headline 2 lines or fewer in all eight faces (`222221` per face).

**On the page.** A `createPicker` labelled FACE under the panel, outside
`.pos-controls`, stepping the eight in the order above with the platform list
behind the name. It replaced `createChoice` because eight names side by side
do not fit a phone, the same reason `/kit/`'s font row is a picker. The choice
is `?face=<id>` in the address (absent for the default), the slide number stays
the hash, so `/slides/?face=jetbrains#4` is a slide in a face. The face is a
custom property, `--sl-face`, on the panel, so every slide and the full screen
follow it by inheritance. Asserted: all eight load at 400 and 600; all eight
are monospaced; the specimen shows all eight with their names; picking one
puts it in the address and every slide and the specimen follow; every headline
is two lines or fewer in all eight; nothing spills past the inset in any face.

## 10. The talk, and where every number comes from

Asked 2026-10-05: *"add actual slides content on out stuff we are building.
jetbrains default"*. The sample slides and the specimen slide are gone; the
deck is a talk in the order what this is, what it measured, how it is built,
what it learned, what is next. Every number on a slide has its source in a
comment beside the slide in `demo/slides/index.html`. A caption is SMALL, in
the chosen face, the last child of the slide's column so its left and bottom
edges are the inset (asserted within 2 px at both widths in all eight faces),
and links the demo by full URL. A link is not a fetch.

| # | headline | evidence | number and source | live |
| --- | --- | --- | --- | --- |
| 1 | Positron is a lab for live media in a browser | `44` | 46 rows, 44 built: the manifest count command, run 2026-10-05 | |
| 2 | Cloudflare carries the streams in between | diagram | relay hop 1 to 2 ms in a note: PROGRESS.md:3472 | `diagram.mjs`, a lit box walking |
| 3 | Latency is read off a clock burned into pixels | test picture | 600 of 600: positron-ui skill, "The test picture" | `pattern.mjs` `burn()` |
| 4 | MoQ wins the middle and WebRTC wins the tail | character table, p50 p95 p99 | MoQ 26.2 / 42.4 / 104.8, WHEP 67.0 / 76.9 / 84.1 ms: PROGRESS.md:4712-4719, n PROGRESS.md:6624 | |
| 5 | Stock hls.js parks where its start left it | decimal stack | 7.60, 15.41, 1.87, 3.05 s: plans/plan.md:54-57 | |
| 6 | Playing the Pi directly skips the relay | `48 ms` | 48 against 175 ms, one network: plans/plan-away-webrtc.md:212-217 | |
| 7 | The Circuit holds 29 sessions of real work | character columns | 32, 29: research/circuit-archive-2026-09-21.md:253-256; 64 of 350 bytes: plans/plan-circuit-editor.md:65 | |
| 8 | A step on screen waits for the next frame | step grid and a live decimal stack | measured on the screen it runs on | `step-grid.mjs`, its frame clock |
| 9 | Two clocks agree once the offset is measured | `1.8 ms` | 1.8 ms, 137 ms fast: HANDOFF.md:133-135 | |
| 10 | Every demo is built from one kit of parts | readout | 167 modules: `ls demo/shell/*.mjs \| wc -l`, 2026-10-05 | `createReport` readout |
| 11 | A stand-in replaces somebody else's server | character columns | 48/48, 39/39, 52/52: positron-verify skill lines 29, 70, 90-92 | |
| 12 | The Pico router runs the routing core in C | character columns | 115/115, 98/98: HANDOFF.md:190; 45 pass: HANDOFF.md:191; nothing run on the board: HANDOFF.md:180-181 | |
| 13 | ERR refuses live TV by programme, not age | character columns | 45 and 78 min, 13 points: positron-streaming skill 228-230; 2 h: plans/plan-live-timeline.md:42 | |
| 14 | A check counts only once it has failed | `38/38` | positron-verify skill lines 78-80 | |
| 15 | The model was faster with a loose schema | decimal stack | 1.6 and 10.2 s: research/cf-models-speech-to-patch-2026-09-21.md:243-244 | |
| 16 | Next is the hardware nobody has run yet | list | HANDOFF.md:165-167, plans/plan-away-webrtc.md:216-217 | |

**What mono does, asserted rather than shown off.** Five tables are lines of
text padded with spaces, so a column is a character position; three stacks are
a grid with the figure right aligned in `tabular-nums` and the same count of
decimals. The page measures every column edge and every decimal point from the
glyphs themselves (a `Range` per character) and requires them within 0.5 px, in
all eight faces, with the panel at 686 px (a 1280 page) and at 343 px (a 375
page). The stack on slide 8 is live. MEASURED by sabotage: a left aligned
figure, 1 px of letter spacing on one table row and a 5 px caption margin take
exactly the six new alignment and caption asserts red (39/45), and nothing else.

**The check pass got cheaper, not slower.** Every slide is laid out at once and
unseen (`.sl-measure`), so each face at each width is one synchronous layout;
the pass is about **72 ms** for 16 slides, 8 faces and 2 widths, and the whole
check about **2.2 s**, inside the harness's boot wait with no `DEEP` tier and
no manifest change. The live check looks at each live slide once and requires
its own value to move and every other live value to stand still.

**Weighed and not built.** The OLED from `/kit/` needs the router's UF2 fetched
to draw, which is a request on a slide change, so it is not on a slide. A
transport bar would take the space bar from the deck (section 5), so the step
grid runs on its own clock with no bar.
