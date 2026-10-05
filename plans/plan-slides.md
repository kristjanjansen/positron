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
sourced (section 10). `node demo/verify.mjs slides` reads **60/60** (54 page
asserts), up from 51/51 (45). Since the same evening the engine is a module,
`demo/slides/deck.mjs` and `deck.css` (section 11), and `/talk/` is the real
presentation built on it, 34 slides (section 12).

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

| step | cqh | line | tracking | x next | 686 px panel (1280 page) | 343 px panel (375 page) | full screen 1280x720 | use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `--sl-1` | 4.00 | 1.45 | 0 | 1.5 | 15.44 px | 7.67 px | 28.8 px | caption, bottom left, diagram box words, notes |
| `--sl-2` | 6.00 | 1.30 | -0.005em | 1.5 | 23.15 px | 11.51 px | 43.2 px | evidence with four rows |
| `--sl-3` | 9.00 | 1.20 | -0.01em | 1.5 | 34.73 px | 17.26 px | 64.8 px | evidence: tables, stacks, a list |
| `--sl-4` | 13.50 | 1.10 | -0.02em | 1.5 | **52.09 px MEASURED** | 25.89 px | 97.2 px | the headline |
| `--sl-5` | 20.25 | 1.05 | -0.03em | 1.5 | 78.14 px | 38.84 px | **145.8 px MEASURED** | a statement slide |
| `--sl-6` | 30.38 | 1.00 | -0.04em | (top) | **117.21 px MEASURED** | 58.26 px | 218.7 px | one number |

**Tracking is part of the step (DECIDED 2026-10-05, asked for):** *"add biit
negative letter spaing as bigger we go with slides type"*. `--sl-<n>-ls`
beside each size and line height, in em so it scales, 0 at step 1 and closing
as the size grows. LOOKED AT in the shots at 375 and 1280: no two letters
touch at step 6 in JetBrains. Asserted at both widths: every text element's
computed letter spacing equals its step's declared em times its size, within
0.05 px. The character grid survives it, because every row of a step gets the
same tracking: MEASURED after, tables worst 0.03 px and decimal points worst
0.02 px, all seven faces, both widths. **Budgets re-measured with the
tracking in**, characters a line at steps 4/5/3: JetBrains, Geist, Plex,
Fira and Source 19/13/29 (were 19/12/28), Intel 19/13/28, Atkinson 18/12/27
unchanged, so Atkinson still sets the deck's budget at 18 and 12.

**More air above a diagram (DECIDED 2026-10-05, asked for):** *"bit more
space on top of diagram"*. The evidence region of a diagram slide opens with
one step 2 line, `--sl-2` times `--sl-2-lh`, 7.8 per cent of the slide,
against the ordinary 4. MEASURED headline bottom to picture top: 30.0 px at
686 and 15.0 px at 343, exactly the value, because the diagram is height
bound and centring has no slack to add.

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
| `notes` | speaker notes, shown under the panel only with `?notes=1` | step 1, the chosen face, follows the slide (built for `/talk/`, section 12) |
| `link` | the caption's demo, written out as `https://positron.studio/<slug>/` | `''` is the front page |
| `desc` (on a top level diagram node) | what that box is, set as slide text under its column | step 1, centred on the box, two lines at most |

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
- Escape leaves full screen too (the deck's own key, so the fallback cover
  leaves on it as well as the real API).
- **No way-out button over a slide on a desktop** (asked 2026-10-05: *"do not
  show back-from-fullscreen button in desktop"*). `deck.css` hides `.pos-fsx`
  inside `.sl-panel` under `@media (hover: hover) and (pointer: fine)`, at
  (0,2,0), the weight of the component's own `[data-on]` rule, which sets
  opacity and not display. Escape, `f` and F5 are the way out there. A phone
  or tablet keeps the button, because an iPhone has no Escape and no element
  full screen. Asserted under the harness (a fine pointer): the button
  computes `display: none` in full screen, and Escape and `f` each leave it.
- Full screen is `video-panel.mjs` `full()`, `fullMode: 'hover'`: the footer goes,
  the shared ⛶ exit appears on movement (touch only, above). MEASURED in headless Chrome: the real
  element API ran, slide 16:9 and inside the screen, and leaving gives the
  panel its shape back.

## 7. What is open

1. **Speaker notes.** BUILT 2026-10-05 in its smallest form: a `notes` key,
   shown under the panel at step 1 only with `?notes=1`. Still open: `s`
   opening a second window fed by `BroadcastChannel` (local, no network) with
   the next headline and a clock, the reveal.js shape, so the notes are on
   the laptop and not on the projector.
2. **Touch in full screen.** `hover` mode hides the footer, so a phone in full
   screen can only leave, not step. Options: `fullMode: 'footer'` (the slots stay,
   a bar on the projection), or tap halves of the slide (collides with a live
   element that takes pointer input). Undecided.
3. **Keys always steal arrows and Space.** The page is the deck, so they step
   slides even when the panel is scrolled out of view. Alternative: only while
   the panel is full or at least half visible.
4. **A light variant for lit rooms**, per the Tufte thread. Would need every
   live element to read its colours from tokens, which most do.
5. **Kit change, half made:** the deck is a module since 2026-10-05, but in
   `demo/slides/`, not in `demo/shell/` (section 11 says why and when it
   should move). And
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

## 11. The engine is a module: `deck.mjs` and `deck.css`

Asked 2026-10-05: *"in bg do some actual slides on positron"*, with `/slides/`
kept as the sample and the system. So the engine left the page.

| file | holds |
| --- | --- |
| `demo/slides/deck.css` | the seven `@font-face` pairs, the slide box and inset, the six step scale with line height and tracking, the marks (`.sl-hi`, `.sl-hue`), evidence types, the diagram gap and box words, the caption, blank, the desktop rule for the way-out button, the notes, the measuring classes |
| `demo/slides/deck.mjs` | `FACES`, `rich` and `plain` (the `*x*` and `[x\|box]` marks), `stackOf`, `fitBox`, the live builders `liveReadout`, `livePicture`, `liveDiagram(spec)`, `liveSteps`, `createDeck(d, { slides, hues })` (slides, panel, stepper, count, face picker, keys, hash, blank, full screen, notes) and `checkDeck(deck, opts)` (every generic assert) |
| `demo/slides/index.html` | the sample talk (16 slides), its diagram, one `createDeck` and one `checkDeck` call; 214 lines, was 1194 |
| `demo/talk/index.html` | the talk (34 slides), two diagrams, three live builders of its own (`liveSlots`, `liveRoute`, `liveTone`), its own asserts |

Both pages link `/slides/deck.css` and import `/slides/deck.mjs` by absolute
path. `build.mjs` copies both with `/slides/`, because `demoFiles()`
enumerates `.css` and `.mjs` in a built demo's folder; nothing in the build
had to change. `/talk/` ships only once its manifest row exists.

**`liveDiagram` (DECIDED, asked for):** *"do not use diagram native descs
below but use slides text and postion"*. The spec handed to `createDiagram`
has every `sub` and every link `label` taken out, `deck.css` hides the
diagram's own caption line, and a top level node's `desc` is set at step 1 in
the chosen face under that box, centred on it, as wide as half way to each
neighbour. Two lines of room are reserved before the picture is fitted, so
the picture and its words are centred together. Asserted at both widths in
all seven faces: no `.pos-dg-sub` or `.pos-dg-llab` on any slide and no
caption line shown, every word line within 2 px of its box's centre, at
step 1, in the face, two lines at most, below the box. MEASURED worst
0.0 px. The hued words still match the diagram's colours, read off the
caption's bold runs while the caption is hidden (a computed colour does not
need the element to be drawn).

**Sabotage (MEASURED):** hiding nothing for `.pos-fsx`, tracking step 4 at 0
and the diagram gap at 4cqh took `/talk/` from 58/58 to 53/58, and the five
reds were exactly the new asserts (tracking and gap at both widths, the
button), nothing else.

**Should it move to `demo/shell/`? Not yet (DECIDED).** Two callers is the
point at which a component is noticed, not the point at which it is settled:
the slide model changed four times in one day (sizes, faces, marks, notes),
and the fonts are vendored under `slides/vendor/` and listed by name in
`build.mjs`. Move it when a third page wants slides or the model holds still
for a week, and take the fonts with it into `shell/vendor/` in the same
change, because a module in `shell/` that loads fonts from a demo's folder is
the cross-page import the build check was written to refuse.

**Counts (MEASURED 2026-10-05).** `node demo/verify.mjs slides`: **60/60**,
54 page asserts, up from 51/51 and 45. The new nine: tracking at two widths,
the diagram gap at two widths, the box words at two widths, no native diagram
text, no way-out button on a desktop, Escape and `f` leave. The renamed: the
first-slide full screen assert now reads the first slide's own step (a
statement at 5), and "every diagram drew in a row" covers every diagram.
The check pass is about 2.3 s on `/slides/` and 4.3 s on `/talk/`, ready at
4.4 s after navigation, inside the harness's 7.4 s boot wait with no `bootMs`
needed.

## 12. `/talk/`: a talk about positron, slide by slide

`demo/talk/index.html`, not in the manifest (the harness refuses a slug that is
not), graded with a CDP script at 1280 and 375: **58/58 at both**, no
exceptions, one host (the dev server). Its row, to be added by hand:

```js
{ name: 'talk', group: 'kit', act: 0, created: '2026-10-05', built: true, unlisted: true,
  one: 'A talk about positron, what it measured and what it learned, with running parts of the site on its slides.',
  tags: [] },
```

Seven sections, each opened by a statement slide. Every number has its source
in a comment above the slide; this table is the same list. Statements are
marked S, live elements L.

| # | name | headline | evidence | number and source | link |
| --- | --- | --- | --- | --- | --- |
| 1 | lab | S Positron is a lab for *live* media | | 46 rows, 44 built: CLAUDE.md's count command, run 2026-10-05 | front page |
| 2 | archive | ERR's archive opens back to 1908 | table | audio 133,718, video 79,422, photo 234,478: research/err-archives-2026-08.md:12, :223-226 | reel |
| 3 | kurenniemi | Kurenniemi plays from archive.org | table | 12 tracks, Finna blocked, Active Archives gone: research/kurenniemi-archive-2026-08.md:10-13, :35-37 | tapes |
| 4 | slots | Radio 1965 runs in fixed slots | L strip on a local deck | 28, 56, 112 min: research/radio-tallinn-1965-2026-08.md:7 | radio |
| 5 | stack | S It runs on Cloudflare and a Pi | | | patchbay |
| 6 | machines | Cloudflare carries the streams | L diagram, words under columns | relay 1 to 2 ms in a note: PROGRESS.md:3468-3472 | patchbay |
| 7 | hop | The relay hop costs 1 to 2 ms | stack | +1.0, +1.6, +0.8 ms: PROGRESS.md:3468-3472 | wire |
| 8 | minutes | Stream bills minutes, not bytes | table | 1000 min cap, 225 a day, 4.4 days: positron-streaming SKILL.md:93-95, :104-107 | llhls |
| 9 | clock | Latency is read off a burned clock | L test picture | 600 of 600: positron-ui SKILL.md:333 | webrtc |
| 10 | measured | S Every number here was measured | | | front page |
| 11 | transports | MoQ is quicker, WebRTC steadier | table | 26.2/42.4/104.8 and 67.0/76.9/84.1 ms: PROGRESS.md:4711-4719, n PROGRESS.md:6624 | moq |
| 12 | path | The clock goes out and comes back | L diagram of the measurement path | p50 26.2 ms, 2740 frames, 0 errors: PROGRESS.md:6622-6624 | moq |
| 13 | llhls | Stock hls.js parks where it starts | stack | 7.60, 15.41, 1.87, 3.05 s: plans/plan.md:54-57 | llhls |
| 14 | config | Most of the player is not config | table | 1,070, 17, 13 lines: positron-streaming SKILL.md:598-600, :639 | llhls |
| 15 | pi | Direct to the Pi skips the relay | table | 72 and 4, 175 and 48 ms: plans/plan-away-webrtc.md:210-214; another network unmeasured :216-217 | away |
| 16 | clocks | Two clocks agree after measuring | `1.8 ms` | 1.8 ms, 137 ms fast: HANDOFF.md:133-135 | sync |
| 17 | frames | A step waits for the next frame | L step grid, live stack | measured on the screen it runs on | time |
| 18 | hardware | S Hardware is on the desk | | CLAUDE.md, the opening paragraph | away |
| 19 | circuit | The Circuit holds 29 real sessions | table | 32, 29: research/circuit-archive-2026-09-21.md:253-256; 64 of 350 bytes: plans/plan-circuit-editor.md:65 | circuit |
| 20 | pico | The Pico router runs its core in C | table | 115/115, 98/98: HANDOFF.md:190; 45 pass: :191; nothing run on the board: :180 | parts |
| 21 | route | A patch is one line of text | L `bay.mjs` parse, print, `apply` | none quoted | patchbay |
| 22 | kit | Every demo uses one kit of parts | L readout | 167 modules: `ls demo/shell/*.mjs \| wc -l`, 2026-10-05 | kit |
| 23 | checks | S The site checks itself | | | kit |
| 24 | stand-ins | Stand-ins replace other servers | table | 48/48, 39/39, 52/52: positron-verify SKILL.md:29, :70, :91 | tapes |
| 25 | tone | A stand-in plays a tone, not silence | L wave view | 220 and 330 Hz, 2 Hz swell: demo/fake-station.mjs:50-69 | radio |
| 26 | green | A green run can cover nothing | `261/261` | LESSONS.md:609-614 | llhls |
| 27 | count | Only the count said so | table | 34, 2, 13/13: positron-verify SKILL.md:826-830 | radio |
| 28 | sabotage | S Break the check first | | 38/38 in the caption: positron-verify SKILL.md:78-80 | tapes |
| 29 | ours | S Most faults were our own | | one fault was hls.js: LESSONS.md:819-823 | llhls |
| 30 | vpn | A VPN passes the handshake only | table | 201 and 0 frames, 201 and 489: CLAUDE.md:302-305 | webrtc |
| 31 | refusals | ERR refuses by programme, not age | table | 45 and 78 min, 13 points: positron-streaming SKILL.md:228-230; 2 h: plans/plan-live-timeline.md:42 | flipper |
| 32 | listeners | One connection per mount, not per tab | table | about 100, then 1: positron-streaming SKILL.md:941-948 | radio |
| 33 | schema | A loose schema made it faster | stack | 1.6 and 10.2 s: research/cf-models-speech-to-patch-2026-09-21.md:243-244 | patchbay |
| 34 | next | Next is untested hardware | list | HANDOFF.md:165, plans/plan-away-webrtc.md:216-217 | parts |

Every number reused from `/slides/` was re-read at its source on 2026-10-05
and still says what the slide says; the 167 and the 46 and 44 were counted
again the same day.

**Live elements (8, MEASURED moving and stopping):** slots (a strip over a
local `timeline/transport.mjs` deck on the main thread tick, so no worker),
machines and path (`liveDiagram`), clock (`pattern.mjs`), frames
(`step-grid.mjs`), route (`bay.mjs`), kit (`createReport`), tone
(`wave-view.mjs`). `/talk/`'s own asserts on top of the deck's: every caption
links the full address of a built manifest row (34 captions, 16 pages); each
section opens on a statement (7); every slide has notes, hidden unless
`?notes=1`; asked for, they sit under the panel at the slide's step 1 in its
face and follow the slide (MEASURED 15.44 against 15.44 px). Nothing is
fetched across a full step through, and nothing from another host.

**Weighed and not on a slide.** WHEP's 41 freezes in 300 s against none for
MoQ went into the transports notes rather than a slide of its own, because a
two row table of one column said less than the line under it. The Circuit's
three stock template sessions (one byte apart) are in the notes, not a slide.
A Stream bill in dollars is not quoted: the figure that matters is the cap.

**Looked at** with `node demo/shot.mjs talk 375 1280 --hash N` on slides 1,
4, 6, 11, 12, 21 and 25: headlines two lines, the statement three, diagrams
with their words under each column, the table's columns and decimals in line,
the yellow on the figures that carry the point, no sideways drag at either
width.

## 13. The slide is a kit component, and `/kit/` has a SLIDES tab

Asked 2026-10-05: *"keep slides as it was for an archive with font picker and
sample content etc let it be then let's focus on the kit make a new tab there
slides and methodically slide by slide"*, then *"Also work on the actual
components, interactive elements on a page"*. `/slides/` and everything under
`demo/slides/` are an archive and were not touched; nothing in the kit imports
`deck.mjs`.

**The component (DECIDED).** `demo/shell/slide.mjs` renders ONE slide from a
plain spec, and `demo/shell/slide.css` styles it. A file of its own rather than
a block in `shell.css`, because every page parses `shell.css` and one page
draws slides; `slide.mjs` adds the link itself if a page forgot it. The scale
is declared once, as `SCALE` in the module (base 4, ratio 1.5, six steps with
their line height and tracking, the section 3 numbers unchanged), and written
onto `.sl` as custom properties by `scaleCss()`, so the stylesheet, the
captions (`stepCaption`) and the node test all read one source. The face is
JetBrains Mono, its two woff2 files and licence COPIED into `demo/shell/vendor/`
and listed by name in `workers/view/build.mjs`.

| export | what |
| --- | --- |
| `createSlide(spec, { host, slots })` | one 16:9 slide, sized off its container (`.sl-frame` is an inline size container, `.sl` a size container, type in `cqh`); returns `{ el, frame, spec, parts, ctl, start, stop }` |
| `createSlidePlayer(specs, { slots, onStep })` | the slides in a `createVideoPanel`, stepper left, count centre, ⛶ right; returns `{ el, panel, slides, go, at, next, prev, keys, start, stop }` |
| `fitBox(host, w)` | a px component laid out at `w` logical px and scaled into its slot with `--fit-k` |
| `slideDiagram(spec, { w })` | a slot builder: names only in the boxes, each outer box's `desc` under it at step 1 |
| `SCALE`, `STEPS`, `stepSize`, `stepOf`, `stepCaption`, `scaleCss` | the scale |
| `parseMarks`, `rich`, `plain`, `lintWords`, `padRows`, `evStep`, `wordsStep`, `normalise`, `LAYOUTS` | the pure parts, graded by `node demo/shell/slide-test.mjs` (40 ok, 13 of them negative controls) |

Spec keys: `say`, `statement`, `big` + `under`, `text` (+ `textStep`), `list`,
`stack`, `rows`, `lines` (`[[step, text]]`), `cap`, `slot`, `layout` (`stack`,
`top`, `left`, `right`, `split`), `side` (split only), `name`, `notes`.
`normalise` throws on an unknown key, layout or step, a split with no slot or
side, a side on anything else, and a statement carrying evidence.

**Keys belong to the player's panel (DECIDED, asserted).** The listener is on
the panel root, which takes focus on a press; a key it uses is
`stopPropagation`ed there, so `transport-bar.mjs`'s `window` listener and a
keyboard's letter row never hear it. A key from the page body does not step it.
This answers open item 3 of section 7 for the kit; the archive deck still
listens on `document`.

**In a split the words go one step down (DECIDED, MEASURED).** Half a slide
holds 9 characters a line at step 4. The first run of the spill assert went red
on four splits whose headlines took four lines; `wordsStep()` now sets a
split's headline at 3 and its evidence one step lower, while `big` and declared
`lines` keep their step.

**The tab.** `['slides', 'SLIDES']` is the last part, so the opening tab is
unchanged. 31 blocks, one static slide each, in reading order:
THE PLAYER (three slides); STEP 6 to STEP 1 (each step alone, its numbers in
its caption); THE SCALE (all six: steps 6 and 5 in the slot, 4 to 1 in the
words, because six lines in one column need 90.9 per cent of the height against
the 86 the inset leaves); seven combinations (headline over text, over a
number, statement, over a stack, over a table, with a caption, yellow and hue
marks); seven layouts (title on top with text at the bottom, left, right,
illustration left and right, interactive left with a stepper walking a word up
the scale, interactive right with a knob setting the figure); eight components
(OLED, slider, knob, waveform, video, diagram, step grid, readout). Every
number on a slide is reused from section 10 with its source in a comment.
Nothing runs until the tab is opened: the tab row calls `slidesOpen()` and
`slidesClose()`, the way HARDWARE boots its board.

**How each component is scaled onto a slide (MEASURED at 1280, slide 686 x 385).**

| component | how | why |
| --- | --- | --- |
| OLED | `.kit-oled` frame, `--oled-k` a whole number from the slot (2x here), a fraction only when 1x does not fit | pixel exact, the HARDWARE part's own rule. A STAND-IN frame (canvas font thresholded) until HARDWARE is opened, because ui.c's WebAssembly is fetched with it; the slide canvas is pushed into `hw.parts`, so after that it is ui.c's LINK screen |
| slider | `fitBox` at 150 logical px, 1.87x | px sized; its pointer maths reads the lane's transformed rect, so a press at 80 per cent read 0.8 |
| knob | `fitBox` at 140 and 130 | px sized; dragged vertically by `movementY`, so scale does not change the gesture |
| stepper | `fitBox` at 220 | px sized |
| waveform | its own `--wave-h` set to `30cqh` on the instance, width from its column | the component already reads its size from CSS; MEASURED 116 px against 115.5 |
| video | `createVideoPanel` stretched across the slot, playing `pattern.mjs` at 1280 x 720 through `captureStream(25)` | already container relative; 18 frames presented in 0.7 s |
| diagram | `slideDiagram`, 640 logical px | the diagram breaks to one column below its row width |
| step grid | `fitBox` at 480 | as the archive did |
| readout | `fitBox` at 360 | as the archive did |

**Size options worth adding (REPORTED, not built):** `createWaveView` could take
`height` as a CSS length so a caller need not overwrite its custom property;
`createSlider`, `createKnob` and `createStepper` could take a `scale` (or read a
`--ctl-k`) so a slide need not transform them; `createVideoPanel` could take
`stage: 'size'` (section 7 item 5). `burn()` positions are in 1280 x 720
pixels, so a smaller canvas shows a blank field (found on the first shot).

**Asserts (MEASURED).** `/kit/` was 294/294 and is **320/320**, 26 new, all
behind `?selfcheck=1`, run after `ready` and chained before the router checks
because both open a tab: the face loaded; each of six steps computes its size,
line height and tracking to within 0.5, 0.5 and 0.05 px of its token (step 6
116.94 px in a 385 px slide); THE SCALE in order at 1.5x; every slide 16:9;
20 captions on the bottom left within 1 px; nothing spills on 30 slides; 9
splits on their sides; left, right and top on their edges; 25 headlines pass
`lintWords` and the marks paint; the player's keys and clamping and that a
used key never reaches `window`; the player's slide fills its stage; slider,
knobs, stepper, wave, OLED, video, step grid, readout and diagram respond; no
request while the tab was open (the shell's own `/_log` POST excluded, which
was the one red on the first run); leaving stops everything.

**Slide sets as data, and what a set page would need (NOT BUILT).** Every key
but `slot` is plain JSON, and `slot` may be `{ kind, ...options }` resolved
through a `slots` map, so a talk can be a JSON array plus one map of builders.
What is missing: (1) the slot builders used here live in the kit page and
would move to a shared `slide-slots.mjs` keyed by kind; (2) the player has no
address (`#n`), notes, blank or face picker, which the archive deck has; (3) a
set page (one page reading `?set=<name>`, or one page per set) and where sets live
(`demo/talks/*.json`, read at build, so no fetch on a step); (4) a
`checkSlides(player)` carrying the generic asserts out of the kit so every set
is graded the same way.

`demo/shot.mjs` was fixed in passing: its 6000 px ceiling capped the whole
page, so `--hash` on a block more than 6000 px down captured a NEGATIVE height;
it is now counted from the block.

**Tables with row lines, live logs, full screen, thicker diagram lines
(2026-10-05, later the same day).** Asked as *"horiz lines but try with rounded
corner outer border and not"*, *"show 2col layout with live logs / live
tabular logs"*, *"add go to fullscreen button (active when mouseover) on all kit
slide samples"*, *"make diagrams thinker borders in slides"*, *"fill full bg but
keep border"*, *"biit more negat tracking on large sizes"* and *"rm ILLUSTRATION
ON THE RIGHT slide"*.
- `rows.frame`: absent is the plain padded lines; `'none'` rules a 1 px
  `--line` between rows and under the header with nothing outside; `'box'` adds
  `--edge` and `--r` around them. Rows carry 0.3 em above and below and 0.6 em
  (one character) either side, so the columns stay character positions. A
  framed table drops to step 2 at three lines (`tableStep`), because the
  padding costs about a row. `padRow` and `colStarts` came out of `padRows` so a
  live log pads one row against declared widths.
- `createSlideLog({ head, widths, align, step })`: a slide-native tabular log
  for a slot, a fixed box whose body scrolls to its foot, newest row at the
  bottom, oldest leaving the top, the header's rule its own. The plain live log
  is the SHELL'S log (`createReport().logEl`, `addLine`) scaled to step 1 by a
  `.sl-slot > .pos-log` rule; it fits, so no copy was made. It does post each
  line to the dev server's `/_log` on 127.0.0.1, as every shell log does.
- `createSlide(spec, { full: true })`: the video panel's ⛶ on the slide, shown
  on hover or focus and always where there is no hover; the frame fills the
  screen through `fullscreen.mjs`, letterboxed 16:9 on the slide's own ground
  (a split's darker half runs to the screen edge), edge and corner kept;
  Escape leaves. The player's full stage got the same ground and edge.
- Diagrams on a slide: edges and arrows 2 logical px, names 11 px, laid out at
  580 rather than 640, so padding and gaps come out about 10 per cent larger
  around a name printed at the size it had. `diagram.mjs` untouched.
- Tracking: 0, -0.005, -0.01, -0.02, -0.03, -0.04 em became 0, -0.005, -0.012,
  -0.03, -0.045, -0.06.
- MEASURED: `/kit/` 320/320 to **329/329**, 9 new: framed table rules and
  padding, the box's radius equal to `--r`, columns and decimals of 4 tables
  within 0.5 px (worst 0.03), both logs growing at a constant height over two
  0.65 s waits, the newest row at each foot with the tabular decimals at 0.00 px
  spread, the ⛶ on 32 slides hidden at rest and shown on focus, full screen
  16:9 centred on the card with the edge kept and the headline at step 4, Escape
  restoring the block, and the diagram's widths and the air inside every box
  (tightest 8.4 logical px against 8). `slide-test.mjs` 40 to 46.

**A strip, a transport bar and FAU on a slide; the player at two slides
(2026-10-05, evening).** Asked as *"do 6 and 7"* (a timeline on a slide, a
transport bar on a slide), *"build fau into slide. overflow keyboard. col
layout"* and *"rm slide 3 from THE PLAYER and replace slide 2 from something
below"*.
- TIMELINE ON A SLIDE: `createStripView` on a deck of the tab's own, one beat
  every 500 ms handed on three ways (the deck's own scheduler, a timer re-armed
  from the last one, the next frame after the deck fired), each mark grey until
  it lands and then green under 5 ms, amber under 20, red past it, as on
  `/time/` BEAT. Headline from HANDOFF.md:133-135 (AHEAD, median 1.8 ms).
  SIZED OFF THE SLOT, NOT `fitBox`: the strip draws in pixels of its transformed
  rect and its `autoHeight` then writes that number as a CSS height on a scaled
  element, so the lanes would fill a 1/k share of the canvas. The canvas is the
  slot's width and the three lanes split its height, re-split on every resize,
  full screen included. Its gutter and ruler type stay at the strip's px size.
- TRANSPORT BAR ON A SLIDE: `createTransportBar` on a local deck, `publish:
  false`, in `fitBox` at 560 logical px, no strip glued (the reason above). KEYS:
  `data-own-keys` silences a bar only while its panel is hidden, so it cannot
  keep a key from the body off an open tab's bar. The bar is handed `command`,
  which refuses play, pause and seek while a keydown is being dispatched whose
  target is outside the slide's frame (a window capture listener records the
  event; its `eventPhase` says whether the dispatch is still going). Clicks,
  drags and keys inside the slide go through; `transport-bar.mjs` unchanged.
- FAU ON A SLIDE: a split with the instrument (code box, two param knobs, 25
  keys at 44 px, FAU plate) in `fitBox` at 420 on the darker side; the keys row
  is wider than the column and scrolls inside the panel. A picture: no libfaust,
  no compile, no audio, `letters: false`; a press lights a key and logs once that
  it plays at https://positron.studio/fau/, which the caption links.
- THE PLAYER: the statement and the diagram slide (`slideDiagram(SLIDE_MACHINES)`
  a second time; each diagram has its own marker uid, so two on a page share no
  id). Nothing in it runs, so `go()`'s start and stop reach no loop.
- MEASURED: `/kit/` 327/327 to 340/340.
