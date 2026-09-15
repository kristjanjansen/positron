# Queue — open work, 2026-09-15 (end of session 27)

Live at **`df826fb-100522-6725`**. ⚠️ **NO SUITE NUMBER IN THIS FILE, ON
PURPOSE.** The last full run of `node demo/verify.mjs` was before the diagram,
card, transport-bar and `blocks` work landed, so any total written here would be
a count nobody re-measured — which CLAUDE.md already says reads as a fact. Run
it. Per-demo numbers that WERE measured this session: `tapes` 22/22,
`blocks` 45/45, `held` 22/22, `diagram-test.mjs` 64 ok.

⚠️ Three renames landed and the old slugs are gone: `scene` -> **`blocks`**,
`kurenniemi` -> **`resources`**, `aikajana` -> **`deck`**. `shout` and
`proto/megatimeline` moved to `archive/`. Grep the OLD form before assuming a URL
still resolves.

## 🔴 THE ONE THAT MATTERS MOST — `/tapes/` reads as a multitrack arrangement

REPORTED: *"tapes timeline makes no sense. am i listening all tapes on same day
together?"* No. One tape plays at a time. The page holds TWO time axes and the
drawing does not admit it: the strip maps **when a record is from** (1890–2027)
while the transport plays **the loaded tape** (0 to its own length).

**The packing I added this session is what made it read that way.** It fixed a
real defect — five titles overprinting inside forty pixels, because 13 of the 24
dated records have year-wide or decade-wide dates that overlap almost entirely —
and it fixed it by producing eleven parallel bars under a sweeping playhead,
which in every tool anybody has ever used means *these play together*. A more
confident wrong answer than the one it replaced.

Not yet done, and it needs deciding before more work goes into that page:
1. **Mark the loaded tape, dim the rest.** The one fact the picture is missing is
   which bar you are hearing.
2. **Take the sweeping playhead off the map.** On the map it means "where in
   history you are looking", which is not what a playhead means anywhere else.
   The transport below already owns playback.
3. Keep the sub-rows. Overprinted labels were genuinely unreadable.

## Open, in the order it was asked for

- **The live loop, and a buffer to loop over.** *"rm 'a live station has no
  past'. make it happen, have a sensible buffer. if it fills, loop is finished
  and starts playing. make a bg scrollbar to indicate how much is left in buffer
  but veery subtle."* `transport-bar.mjs` currently REFUSES a loop on a live
  deck (`if (live) { note('a live station has no past…'); return; }`) — that
  refusal is what has to go, replaced by a recorded window. Same feature as
  *"can you do looper on live input?"*
  - ⚠️ **No countdown on the live loop button.** It starts BLINKING when the
    buffer end is near. A number ticking down is a readout; this is a warning.
- **The waveform while a loop runs.** *"keep x scale the same, just stop the viz
  and move loop playhead."* So: freeze the picture, do not rescale it, and run a
  **1 px solid** playhead across it. `grain-scope.mjs` has `buffer(peaks)` +
  `range()` for the frozen picture and `showing()` returns `'material'`; the
  playhead is the missing piece.
- **`/tapes/` rate control seems not to work.** Reported, not yet reproduced.
- **A blip of sound on load on `/tapes/`.** Should be silent.
- **Lane label**: vertical spacing, a shorter left-border swatch when there is no
  sub-label, and colour-code it.
- **The waveform and granulator boxes must not draw with no live feed**, and fade
  in together when sound starts.
- **`held` redesign, as re-specified:** size comes from word LENGTH (shorter word
  = bigger), the sentence *If these walls could talk* broken into separate words
  placed apart, plus a paragraph about pointing and clicking a text to open the
  headset's own text-entry field. **Sentence case, not uppercase** — uppercase is
  the user's choice to make, not the default.
- **XR quit badge on `mirror`.** Every other XR page has it.
- **The no-em-dash rule across the rest of the repo's reader-facing text.** The
  rule is in CLAUDE.md; the sweep has not been done.
- **`/kit/` is still not machine-graded.** Unchanged, still open.

## What landed this session

**Diagrams** (`demo/shell/diagram.mjs`, and a writing rule in CLAUDE.md).
Orthogonal `-|` links with rounded turns, hoverable links carrying their own
notes, animated hover, ties with no arrowheads between boxes inside one machine,
top-left box labels behind one switch (`BOX_ALIGN`, so the project reverts
together), more air under a title and above HOW THIS WORKS, which moved to the
bottom of the page.
- 🔴 **Technology -> colour is GLOBAL now.** `TECH_HUE` maps `cloudflare`,
  `browser`, `sound`, `graphics`, `relay`, `device`, `archive`, `station` to
  fixed hues, Cloudflare on its brand orange. A rotation gave the same thing a
  different colour on each page, which is a legend that has to be re-learned per
  picture.
- 🔴 **Identity moved to the EDGE.** Fill sits at 0.1 and stays near-grey; the
  stroke carries the hue at 0.75. Reported as *"not nice hue. (muddy)"* and the
  mud was the mechanism: pushing a warm hue into a near-black fill at low
  saturation is mud at any alpha, which is the same fact `pattern.mjs` already
  knew about the test picture's field and nobody connected.
- **Hover lifts the box's own hue instead of replacing it.** It mixed into
  `--card2`, so pointing at a box turned it grey: the one moment a reader looks
  hardest was the one moment the colour coding stopped.
- **Notes over forty words are reported on `cuts`**, beside labels that did not
  fit. The rule they enforce is two sentences.

**Cards** (`demo/shell/card.mjs`) and a front page rebuilt out of them, grouped
VR/XR, väin, kurenniemi, ERR, the rest. `GROUPS` + `byGroup()` in
`manifest.mjs`, which THROWS on an ungrouped demo.

**The transport bar.** A global LOOP button left of the rate, three presses
(start, end and play, off). All bar buttons one height (`--tbar-btn: 34px`), a
two-line smaller clock, `x` gone from every rate label.
- 🔴 **The loop button's WIDTH never changes**, landed just now: it said LOOP,
  END, LOOP, and three characters against four shoved the rate picker and the
  clock sideways on every press. State is carried by `data-loop` and by the aria
  label, neither of which has a width. Same rule as a live sentence reflowing
  under a picture.

**`demo/shell/symbol.mjs`** — a button centred on its glyph's INK rather than on
its advance box, measured through `measureText` instead of a typed nudge. ⛶ went
from visibly high and left to 0.01 px horizontal, 0.57 px vertical at 34 px.

**`demo/held/`** — SDF typography in WebXR, 22/22, coverage-aware EDT seeding,
Kalevipoeg content. **`demo/blocks/`** — the old `scene`, now a snapping cube
builder on a black dotted floor, 45/45. **`demo/shell/xr-quit.mjs`** — a
hold-to-quit badge on a controller button with a circular progress ring; release
cancels. The default tablet and its quit button are gone.

**Tooltip cut to the fact.** `/tapes/` was drawing `NO INNER BRACKET and the
bracket is not contained — "certainly in view" is UNDECIDABLE here (zoom out to
recover it)` on top of the bar somebody had just pointed at. It says `the exact
date is lost, not absent` now. The distinction is real and belongs in prose
somebody chose to read.

**Span labels take their ink colour from their own bar's alpha**
(`timeline/strip.mjs`). A fixed near-black is right at 0.85 and invisible at
0.30, and 0.30 is the skirt every vague date gets — so on `/tapes/`, where most
dates are vague, most labels were dark on dark.

## Two things about this session's failures worth carrying forward

🔴 **I BLAMED SOMETHING OUTSIDE THE MACHINE TWICE, AND WAS WRONG BOTH TIMES.**
A regex with `[^}]*` swallowed three CSS rules above the one it was meant to
delete, `.fl` lost its height, the canvas went to zero and a click found nothing
— and I called it an ERR outage. 294 of 298 tiles were loading at 60 fps at the
time. Then `mark()` in `grain-scope.mjs`: I added a second `mark` to the same
object literal, silently overwriting the existing one, killing radio1965's grain
ticks, and called it the station being down. **An outage is a claim that needs
the same evidence as any other claim.** Both times the evidence was one command
away and I reached for the story instead.

⚠️ **AN ASSERT WRITTEN FROM THE SAME DERIVATION AS THE CODE PROVES NOTHING.**
`roomToEye` had its rotation sign inverted and its assert passed, because the
assert recomputed the matrix the same wrong way. What caught it was `probe()`
rendering and finding zero pixels at 70°. Rewritten to test the CLAIM — facing a
word puts it straight ahead. This is `timeline/csound.mjs` in a new costume,
which CLAUDE.md already warns about for formats and now also applies to geometry.
