# timeline-strip

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `timeline/strip.mjs`

### header

Above `// ---------------------------------------------------------------------------`, lines 1 to 51 before the cut.

~~~js
// timeline/strip.mjs — THE strip visualizer. Canvas, no framework, no build step.
//
// plan-timeline §0/§6 promised this from the beginning ("rebuilt four times;
// build it once as a component"). By the time it got written it had been
// hand-drawn FIVE times and none of the five agreed:
//
//   proto/jam/jam.html            a native <input type=range>. No marks at all,
//                                 but the ONLY one with a real drag guard.
//   proto/selfrec/replay-grid     cue ticks + span bars, percent-of-range, a
//                                 2000 ms hardcoded lead-in, no time axis.
//   proto/instrument/play.js      two lanes that are PITCH axes, one audible one
//                                 not, percent-of-range reimplemented verbatim,
//                                 a different hardcoded lead-in (250 ms).
//   proto/remixer/compose.html    span lanes + a nested-deck lane, as absolutely
//                                 positioned <div>s in percent of a fixed
//                                 ARR_END; the QUOTATION span was never drawn.
//   proto/paths/paths.js          the richest: four overlaid lanes, stepped
//                                 lineWidth/alpha, tier-driven hatching, a 14x
//                                 playhead inset, an evidence-only toggle.
//
// Everything below is mined from those five and from the two research files
// that settle the open questions:
//
//   research/timeline-own-prior-art-2026-08.md §4
//     · dual cursor: a wall-clock line beside the playhead, so the GAP is the
//       accumulated pause/rate offset;
//     · "the view-window model is the unsolved wall in ALL generations" —
//       5000 px / 10 s / 30 s ceilings in four repos, tick density hardcoded at
//       two scales, zoom nowhere. {originTime, pxPerSecond, scrollX} +
//       virtualized draw + tick LOD are day-one requirements here;
//     · follow-mode that DISENGAGES on user scroll (demo9 re-centred every
//       frame and fought the user — the recorded failure);
//     · two renderers over one array; per-author idToColor hash;
//     · control-is-the-display.
//
//   research/spatiotemporal-uncertainty-2026-08.md §8.4 + §9.1
//     · the render decision is SETTLED by a controlled study (Gschwandtner et
//       al. 2016): AMBIGUATION — a two-tone bar, saturated certain core and
//       lighter possible flanks — for "when / how long"; gradient/density ONLY
//       for "how likely at t". So: two-tone bands per row, never a per-row
//       curve, and NEVER a dash for uncertainty (dash is spoken for by §5b's
//       tratteggio, which encodes inferred PAYLOAD, a different axis);
//     · the per-lane aggregate is an aoristic sum: one bin per PIXEL COLUMN,
//       mass 1/(b-a) per item, drawn as HEIGHT (height does not clip the way
//       alpha does), optionally divided by the overlapping-period count.
//
// DOCTRINE: LANES ARE QUERIES, NOT CONTAINERS. A lane declares what it wants
// from the deck; the strip asks the deck for it, every frame, inside the
// visible window and under the current evidence policy. No client ever pushes a
// row into a lane, and the evidence-only toggle is therefore not a filter this
// component applies — it is a question the DECK answers.
~~~

### primitives

Above `/** §5b tratteggio: hatch is a function of the row's own declared TIER, never`, lines 53 to 57 before the cut.

~~~js
// ---------------------------------------------------------------------------
// Shared drawing primitives. Exported because a client with its own PROJECTION
// (proto/paths draws the same lanes in x/y space, not on a time axis; its 14x
// inset draws them again, zoomed) must reuse the styling, not re-derive it.
// ---------------------------------------------------------------------------
~~~

### mono

Above `const MONO_STACK = 'ui-monospace, Menlo, monospace';`, lines 59 to 70 before the cut.

~~~js
/** §5b tratteggio: hatch is a function of the row's own declared TIER, never
 *  hand-assigned per lane. A tier-2 lane arrives hatched differently without a
 *  line of styling written for it. */
// 🔴 THE STRIP'S TEXT IS SET IN THE SITE'S MONO, READ FROM `--mono`. A canvas
// cannot read `var()`, and until 2026-10-12 every label here typed
// `ui-monospace, Menlo, monospace`, so after the font switch the gutter and the
// ticks drew the system mono beside a page set in JetBrains Mono. The token's
// computed value is the `@font-face` family plus its fallbacks. Read once and
// kept, because a font string is built for every lane on every frame; with no
// document (a test in node) it is the old stack.
// ⚠️ AND A CANVAS KEEPS THE FACE IT WAS DRAWN IN, so `createStrip` asks for the
// face by name and draws again when it arrives (see `invalidate`).
~~~

### undefined-keys

Above `const base = {};`, lines 98 to 103 before the cut.

~~~js
/* 🔴 AN UNDEFINED KEY IS DROPPED BEFORE THE SPREAD, OR IT ERASES ITS OWN
 * DEFAULT. `laneContext` hands over `{ color: L.color, width: L.width, ... }`
 * for every lane, so a lane with no colour arrived as `color: undefined`,
 * the spread wrote that over `idToColor(kind)`, the ticks stroked in the
 * canvas default black and the gutter swatch fell back to `T.ink`. Measured
 * 2026-10-09 on /concepts/13/. Explicit values still win. */
~~~

### lane-ink

Above `export function laneInk(draw, w, h, { alphaGate = 8, mode = 'count' } = {}) {`, lines 134 to 137 before the cut.

~~~js
/** Render one thing ALONE into an offscreen canvas and count painted pixels.
 *  proto/paths' laneInk(), lifted: the only honest proof that a lane actually
 *  put marks on a canvas, and the measurement its evidence-only toggle is
 *  verified with (restored lanes must paint exactly 0 px). */
~~~

### sum

Above `return mode === 'sum' ? sum : mode === 'both' ? { count: n, sum } : n;`, lines 148 to 151 before the cut.

~~~js
// `sum` is total alpha MASS, and it is the measurement a feathered edge needs:
// a gradient ramp keeps almost every pixel above an 8/255 gate, so a pixel
// COUNT cannot see the difference between a hard edge and a soft one, while
// the mass can. (Found by measuring: the count moved 0.6 %, the mass 12.7 %.)
~~~

### tick-lod

Above `const SEC = 1000, MIN = 60 * SEC, HR = 60 * MIN, DAY = 24 * HR, YR = 365.2425 * `..., lines 155 to 164 before the cut.

~~~js
// ---------------------------------------------------------------------------
// TICK LOD — the thing every generation hardcoded at one or two densities, and
// the reason five strips all had a ceiling (5000 px / 10 s / 30 s). It is a
// pure function of pxPerSecond: pick the smallest interval off a nice ladder
// whose on-screen spacing clears a minimum, and the smallest MAJOR interval
// that clears a label's width and is a whole multiple of the minor.
//
// The ladder deliberately reaches from 1 ms (MIDI jitter, 5000 px/s) to a
// century (the ERR archive horizon, 1e-7 px/s) with no branch anywhere.
// ---------------------------------------------------------------------------
~~~

### deep-time

Above `200 * YR, 500 * YR,`, lines 175 to 183 before the cut.

~~~js
// DEEP TIME (§9.6, read from ChronoZoom's source, not believed from a blog):
// the log of the viewport span selects the TICK SOURCE; it never warps the
// axis. So deep time is not a different projection, it is more rungs — and
// the rungs are what was missing. MEASURED before this was written: with the
// ladder stopping at 100 y, fitting 13.8 Gyr into 1400 px chose major = 100 y
// at 1.0e-5 px, and the axis loop ran **138,000,000** times per frame with a
// moveTo/lineTo/fillText each. That is the deep-time bug: not precision, an
// unbounded draw loop. (The precision ceiling is real too and is stated at
// `ulpMs` below.)
~~~

### ulp

Above `export function ulpMs(t) {`, lines 190 to 199 before the cut.

~~~js
/** The IEEE-754 quantum of a position, in ms. `ulp(x) = 2^-52 · 2^floor(log2 x)`.
 *  This is the honest ceiling on "absolute ms" as a position domain (§4's
 *  non-negotiable) and it is not a matter of taste:
 *    · integer ms are EXACT to 2^53 = 9.007e15 ms = 285,426.8 years;
 *    · at 13.8 Gyr (4.355e20 ms) one ulp is 65,536 ms = 65.536 s, so a
 *      millisecond span at the Big Bang does not exist as a number;
 *    · `t += 1` STALLS (t + 1 === t) at t >= 9.313e15 ms ~ 295 kyr, which is
 *      how an accumulating tick loop hangs rather than drifts.
 *  Used to derive the zoom ceiling instead of hand-authoring one per era the
 *  way ChronoZoom's `deeperZoomConstraints` does. */
~~~

### zoom-ceiling

Above `export const zoomCeilingPps = (t) => 1000 / ulpMs(t);`, lines 205 to 208 before the cut.

~~~js
/** px/s at which ONE PIXEL equals one representable step of the position domain.
 *  Zooming past it draws a grid finer than the numbers behind it — ChronoZoom's
 *  "you cannot zoom to a day inside the Hadean", derived from the float rather
 *  than declared per era. */
~~~

### tick-lod-sig

Above `export function tickLOD(pxPerSecond, { minMinorPx = 7, minMajorPx = 68 } = {}) {`, lines 214 to 219 before the cut.

~~~js
/**
 * @param pxPerSecond  the ONLY input — LOD is a function of zoom, not of a mode
 * @returns {{minor, major, digits, fmt}} intervals in ms plus a matched label
 *          formatter, so the axis never prints "0:00:03.000" at hour zoom nor
 *          "0:03" at millisecond zoom.
 */
~~~

### major-first

Above `let major = TICK_LADDER[TICK_LADDER.length - 1];`, lines 222 to 225 before the cut.

~~~js
// MAJOR first: the labelled interval must clear a label's width, and that is
// the only hard constraint. (Picking minor first and then hunting a multiple
// of it strands the calendar ladder — a year is not a whole number of 91-day
// steps, so the search would never reach year ticks.)
~~~

### minor

Above `let minor = null, fallback = null;`, lines 228 to 230 before the cut.

~~~js
// MINOR: the smallest step that clears the minimum spacing AND divides the
// major, so the minors never crawl out from under the labels. If nothing
// divides it, take the smallest that clears — an approximate grid beats none.
~~~

### absolute

Above `if ((absolute === undefined ? Math.abs(ms) > 1e12 : absolute) && Math.abs(ms) <=`..., lines 248 to 254 before the cut.

~~~js
// `absolute` is a DECLARATION, not a guess: replay-grid's domain is absolute
// wall ms while a 60-year ERR relative domain is the same magnitude, so the
// strip passes deck.range[0] > 1e12 rather than letting a threshold decide.
// …and a DEEP-TIME position is never a Date: `new Date(1e16).toISOString()`
// throws RangeError, so an absolute deck reaching past ±8.64e15 ms would take
// the axis down. Past the wall the absolute domain degrades to the relative
// deep-time regime, which is the only reading that exists there anyway.
~~~

### deep-unit

Above `if (major >= KYR) {`, lines 264 to 267 before the cut.

~~~js
// DEEP TIME regime-swap: the unit follows the MAJOR interval, not the value,
// so one axis reads in one unit (ChronoZoom's `cosmos`/`calendar`/`date` tick
// sources, picked by log10(span)). `-13800000000y` is what the ladder printed
// before this existed.
~~~

### calendar

Above `const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', '`..., lines 283 to 293 before the cut.

~~~js
// ---------------------------------------------------------------------------
// CALENDAR AXIS, opt in with `calendar: true`. Asked 2026-10-05 as *"fix
// time"* about /time/#dates: two thousand years of dates were ruled in `-1.0
// ka` and `0.0 ka` (thousands of years from 1970) while the cell beside them
// said `1100`. The ms ladder above is right for a position domain and wrong
// for a calendar: its steps are multiples of 365.2425 days counted from 1970,
// so a year tick never lands on a 1 January and a millennium tick lands on
// 970. These rungs are CALENDAR UNITS, and each tick is a real 1 January, a
// real first of the month or a real midnight, in UTC. Every other strip keeps
// the ms ladder untouched; only a strip that declares `calendar` comes here.
// ---------------------------------------------------------------------------
~~~

### calendar-year

Above `export function calendarYear(y) { return String(y); }`, lines 312 to 316 before the cut.

~~~js
/** A year as a visitor reads it: `1500`, and a minus sign before year 1
 *  (`-500`), counted the astronomical way so year 0 exists and a ruler of
 *  centuries stays round across it. `BC` was priced and refused: there is no
 *  year 0 in it, so the century ticks either side of it would read `1101 BC`,
 *  `1001 BC`, which is a ruler nobody can read either. */
~~~

### month-days

Above `for (; out.length < max; m++) {`, lines 361 to 366 before the cut.

~~~js
// Days of the month 1, 1 + n, 1 + 2n, and none closer than half a step to
// the next month's first, so a 31st never crowds the 1st beside it.
// ⚠️ The next first is day `len + 1`, not day `len`, and closer means
// strictly closer: that is the old rule for every step but one day. `len`
// dropped the LAST DAY OF EVERY MONTH at a one day step (`30 Dec`, then
// `Jan 1100` two steps on), seen on a 1280 shot 2026-10-05.
~~~

### aoristic

Above `export function aoristic(spans, t0, t1, cols) {`, lines 436 to 454 before the cut.

~~~js
// ---------------------------------------------------------------------------
// AORISTIC AGGREGATE — §8.4.2 / §9.1 / M4 (Jugel 2014). One bin per PIXEL
// COLUMN, each item contributing total mass 1 spread as 1/(b−a) per ms, drawn
// as HEIGHT (height does not clip the way `globalAlpha = min(0.4, …)` did).
//
// ⚠️ MEASURED, and it collapses a term the brief carried as separate: §9.5 asks
// for mass 1/(b−a) "divided by the number of overlapping periods" (aoristAAR's
// period_correction). WITH ONE BIN PER PIXEL COLUMN THOSE ARE THE SAME
// OPERATION — the pixel column IS the period, an item overlaps (b−a)/colMs of
// them, and 1 ÷ that count is exactly the colMs/(b−a) that the 1/(b−a) weight
// already deposits per column. Verified numerically (strip-verify B2): the two
// formulations agree to 0 ulp on column-aligned items and the 1/(b−a) form is
// the CORRECT one on clipped items, because it divides by the item's TRUE
// duration rather than by its visible one. There is no third factor to apply.
//
// `norm = mass/n` is kept and is a DIFFERENT statistic (mean mass per
// contributing item). It must NOT drive the height: dividing by the count
// deletes the count, which is the quantity a histogram is for.
// ---------------------------------------------------------------------------
~~~

### unbounded

Above `if (s.to !== null && s.to !== undefined && !Number.isFinite(s.to)) { stat.open++`..., lines 469 to 472 before the cut.

~~~js
// AN UNBOUNDED ITEM CONTRIBUTES ZERO, AND THAT IS THE ARITHMETIC, NOT A
// POLICY: mass 1/(b−a) with b−a = ∞ is 0 everywhere. It is reported rather
// than filtered, because "dropped 3 open spans" and "3 spans added nothing"
// are the same fact and only one of them is visible.
~~~

### point

Above `const isPoint = s.point || s.to === null || s.to === undefined || s.to === s.fro`..., lines 474 to 477 before the cut.

~~~js
// A POINT is not a degenerate span to be skipped — it is the one item we
// know EXACTLY, mass 1 in its own column. Dropping points (which the first
// implementation did, via `Number.isFinite(s.to)`) makes a crisp archive
// read as empty next to a smeared one.
~~~

### fmt-dur

Above `function fmtDur(ms) {`, lines 508 to 509 before the cut.

~~~js
/** short human duration for a stated method line — the column width is half the
 *  method and a statistic whose bin size is invisible is not stated. */
~~~

### span-extraction

Above `// 'ref' is nested.mjs's span id, 'lane'/'tag' are the media-span convention in`, lines 522 to 537 before the cut.

~~~js
// ---------------------------------------------------------------------------
// Span extraction. Three shapes, in priority order, and every one of them
// degrades cleanly into the next:
//
//   1. row.payload.when  — the uncertainty sibling's bounds. Accepts
//      {outerFrom, innerFrom, innerTo, outerTo, kind} and {from,to,inner…}.
//      Absent inner bounds => the whole band is SKIRT, which §8.4.3 says is
//      honest and needs no special case.
//   2. lane.span(row)    — the client says so explicitly.
//   3. phase pairing     — {phase:'enter'|'exit'} keyed by lane.group(row).
//      This is the repo's actual media-span convention (compose, replay-grid,
//      instrument all emit it) and it is the reason a "span lane" can be a
//      pure query over the same flat item log everything else reads.
//
// A row that yields no end is a POINT and falls through to the tick renderer.
// ---------------------------------------------------------------------------
~~~

### group-key

Above `const groupKey = (lane, r) =>`, lines 539 to 541 before the cut.

~~~js
// `ref` is nested.mjs's span id, `lane`/`tag` are the media-span convention in
// selfrec/remixer — so the three shapes already in the repo pair with no
// per-client configuration at all.
~~~

### smeared

Above `return {`, lines 559 to 564 before the cut.

~~~js
// `smeared` is the discriminator the renderer was missing. Without it a span
// that came from a `when` bracket and a span that came from a note-on/note-off
// pair are the same object, and the renderer drew them with the SAME INK — a
// wholly-unknown position and a fully attested duration, indistinguishable.
// `rule`/`verbatim` are carried for the ignorance affordance ("narrow this"),
// which is a link to the evidence, not a decoration.
~~~

### when-state

Above `export function whenState(s, t0, t1) {`, lines 609 to 637 before the cut.

~~~js
// ---------------------------------------------------------------------------
// THE THREE STATES — §7.9's "`necessary` has THREE answers, not two", made
// visible. This is a transcription of transport.mjs's `certAccepts()` into the
// render path, deliberately not a paraphrase of it: strip-verify A1 asserts
// row-for-row agreement with `deck.window(kind, t0, t1, {certainty:'necessary'})`
// on the real corpus, so if the two ever diverge a test fails rather than a
// picture lies.
//
//   'crisp'         the span carries no `when` at all — a note-on/note-off pair,
//                   a recording's enter/exit. Attested at both ends. NOT an
//                   uncertainty state, and the bug this fixes is that the old
//                   renderer drew it with the same ink as the case below.
//   'core'          ordered inner pair → inner containment answers "certainly
//                   within" exactly. Two-tone ambiguation, and the only state in
//                   which a saturated core rectangle is a true statement.
//   'outer'         no inner pair, but the whole outer bracket lies inside the
//                   query window → outer containment is SOUND BUT INCOMPLETE.
//   'unanswerable'  no inner pair and the bracket is not contained → undecidable
//                   from what the row carries. transport EXCLUDES and REPORTS;
//                   the strip must therefore SHOW the exclusion, not let the row
//                   silently vanish, which is the failure mode §9.7 says every
//                   surveyed renderer shipped.
//
// The state is a function of the row AND THE WINDOW, which is the finding worth
// keeping: zoom in far enough and a sound row becomes undecidable, zoom out and
// it recovers. The epistemics are not a property of the archive, they are a
// property of the question — and on a zoomable axis the question changes with
// the wheel. Measured on the Kurenniemi corpus in strip-verify A3.
// ---------------------------------------------------------------------------
~~~

### renderers

Above `const RENDERERS = new Map();`, lines 650 to 654 before the cut.

~~~js
// ---------------------------------------------------------------------------
// The default renderers. `registerRenderer` makes the set open: "two renderers
// over one array" (§4) is a registry keyed by name, chosen per lane.
// Every one of them receives the same context object.
// ---------------------------------------------------------------------------
~~~

### bins

Above `export const BIN_GAP_PX = 2;`, lines 659 to 692 before the cut.

~~~js
/**
 * 🔴 MARKS KEEP A MINIMUM SEPARATION, AND WHERE THEY CANNOT THEY ARE BINNED,
 * NEVER MERGED. Asked 2026-10-12 on /concepts/clock/090/: a lane of 50 marks a
 * second over a 33 s run drew as ONE solid green bar, *"hard to understand.
 * keep minimum separation between event bars?"*. 1650 two pixel ticks on about
 * 1000 px overlap into a slab that says neither how many there were nor which
 * one was late.
 *
 * THE RULE: a mark is `markPx` wide (the lane's width, rounded, at least 1)
 * and owns a bin of `markPx + BIN_GAP_PX`. If every pair of neighbouring marks
 * in view is at least one bin apart, they draw one by one as before. If any
 * pair is closer, the whole lane draws one mark per bin: its COLOUR is the
 * worst row in the bin, its HEIGHT is how many rows the bin holds against the
 * fullest bin in view (all full when the bins differ by one row at most, which
 * is the pixel grid rather than the data). Zoom in until the marks have their
 * room and they draw one by one again.
 *
 * ⚠️ WHY 2 px OF SPACE. With 1 px marks and 1 px of space the lane is half ink
 * and half ground, which the eye reads as a flat tint at any normal distance,
 * and at a fractional device pixel ratio the two antialias into each other. Two
 * pixels of ground between 1 px marks is a third ink, which still reads as a
 * comb of separate marks that can be counted when looked at, and is the
 * smallest gap that stays a gap at 1x.
 *
 * ⚠️ WORST IS THE LANE'S OWN CALL. `rankOfRow(row)` returns a number, higher
 * is worse (a lateness, say). A lane that gives none is ranked by colour: the
 * colour that is RAREST among the marks in view wins its bin, so one late mark
 * among thirty on time is not outvoted. That default is a guess about what
 * matters, so a lane whose colours carry a severity should say `rankOfRow`.
 *
 * OPT IN: the strip's `bin: true` (on by itself under `live`), or a lane's own
 * `bin: true`. A lane's `bin: false` keeps it out. `marks: 'char'` lanes are
 * never binned, their dots already say what does not fit.
 */
~~~

### ticks

Above `registerRenderer('ticks', (ctx, L, C) => {`, lines 750 to 752 before the cut.

~~~js
/** discrete ticks — one mark per row. `latch` recolours marks BEHIND the
 *  playhead (replay-grid's fired-cue idea) and, because it is recomputed from
 *  the position every frame, un-fires them on rewind. */
~~~

### char-marks

Above `const charMarks = L.marks === 'char' && !!L.glyphOf;`, lines 758 to 770 before the cut.

~~~js
// 🔴 `marks: 'char'` INVERTS THE LINE AND THE LETTER. In the default lane a
// tick is the mark and a glyph is drawn ON it where the zoom has left room;
// here THE CHARACTER IS THE MARK and no line is drawn at all, with a middot
// standing in wherever a character cannot be shown. Asked for on `typist`,
// whose subject is the letters: a comb of ticks with letters stuck on it is
// two marks per edit saying one thing.
//
// ⚠️ IT IS OPT-IN, AND THAT IS NOT TIMIDITY — it is `demo/strip`. That page's
// `glyphOf` returns `·` for an exact date, `?` for an unknown one and `~` for
// a vague one, so a middot ALREADY MEANS SOMETHING THERE. Making the crowded
// fallback a middot for every lane would redraw its `?` marks as `·` — a page
// whose whole subject is uncertainty, quietly reporting certainty. A flag on
// the lane costs one word; that costs the reader a false claim.
~~~

### flat

Above `const flat = B.maxN - B.minN <= 1;`, lines 782 to 788 before the cut.

~~~js
// A bin of one is a third of the lane at the least, so a lone mark among
// crowded ones is still a mark rather than a speck.
// ⚠️ AND A DIFFERENCE OF ONE ROW IS THE PIXEL GRID, NOT THE DATA. Marks
// that come at a steady rate fall 1, 1, 1, 2 into equal bins, and on a
// page of beats that drew every fifth beat taller, an accent that was
// never played (MEASURED on clock/070 and 080 at 375 px). So heights only
// differ when the bins differ by more than one row.
~~~

### color-of-row

Above `const col = (L.colorOfRow && L.colorOfRow(r, fired))`, lines 805 to 808 before the cut.

~~~js
// `colorOfRow(row, fired)` is the per-row hook the spans renderer has had
// as `colorOf` since the start; ticks only ever offered one colour for the
// whole latched half, which cannot say WHICH mark went wrong. Falsy falls
// straight back to the two-colour behaviour, so no existing lane changes.
~~~

### width-of-row

Above `ctx.lineWidth = (L.widthOfRow && L.widthOfRow(r, fired)) || style.width || 1.4;`, lines 813 to 816 before the cut.

~~~js
// The SECOND per-row channel. One lane, two facts: colour for the value,
// width for a property of the row itself. Cheaper and clearer than a second
// lane, which needs a label, occupies height forever, and reads as a
// separate subject rather than an annotation on this one.
~~~

### glyphs

Above `if (glyphs.length) {`, lines 825 to 840 before the cut.

~~~js
// WHAT THE MARK WAS, DRAWN ON THE MARK — but only where the zoom has made
// room for it. `glyphOf(row)` returns a character or two (the letter that was
// typed, the key that was pressed); at a zoom where the ticks are 2 px apart
// there is nowhere to put it, and drawing it anyway turns a legible comb of
// marks into a smear that is neither a picture nor a word.
//
// 🔴 SO THE ZOOM IS THE CONTROL. Zoom in and the marks become letters; zoom
// out and they go back to being marks.
//
// ⚠️ A glyph is skipped on its NEIGHBOUR's spacing, not on its own width
// alone, and the test is against BOTH sides — one-sided, a run of letters
// would draw the first of every crowded pair and drop the second, which reads
// as "these particular keys are special" rather than "there is no room here".
// ⚠️ And the count is published (`L.glyphState`) rather than left implicit:
// a page that says "12 of 48 letters fit" tells the reader the other 36 exist
// and that zooming will find them. Silence there reads as 12 letters typed.
~~~

### dot

Above `const dot = (px, col, faded) => {`, lines 847 to 858 before the cut.

~~~js
// 🔴 WHAT THE MIDDOT MEANS, WRITTEN DOWN. It inherits EXACTLY the colour the
// tick would have had — `colorOfRow`, else the latch colour, else the lane's
// — so the dot says nothing about the lane that the row it sits in was not
// already saying. What the DOT itself says is "no character is shown here",
// and its strength says which of the two reasons:
//   full    this row HAS no character — a space, a line break, a key that
//           moved the cursor and put nothing in. True at every zoom, a
//           property of the row, and zooming will not change it.
//   faded   there IS a character and the neighbouring marks have left no
//           room for it. A property of the VIEW: zoom in and it appears.
// Two readings of one fact, told apart by density rather than by hue,
// because hue is spoken for.
~~~

### glyph-ink

Above `const ink = L.glyphColor`, lines 868 to 871 before the cut.

~~~js
// ⚠️ The default lane asks `colorOfRow(r, FALSE)` for its glyph — the
// unfired ink, because the tick underneath is already carrying the latch.
// Under `marks: 'char'` there is no tick, so the character has to carry
// it and takes the same `col` the tick would have had.
~~~

### backing

Above `if (!charMarks) {`, lines 883 to 886 before the cut.

~~~js
// a backing so the tick does not strike through the letter; the tick
// stays visible above and below it, so the mark is still a mark.
// Under `marks: 'char'` there is no tick to hide, so there is nothing to
// back out — a plate there would only put a box round every letter.
~~~

### spans

Above `registerRenderer('spans', (ctx, L, C) => {`, lines 901 to 904 before the cut.

~~~js
/** spans, with §9.1's AMBIGUATION: a two-tone bar — saturated certain core,
 *  lighter possible flanks. No dash for uncertainty (§8.4.5); dash here means
 *  tratteggio, i.e. the PAYLOAD was inferred. Degrades to an all-skirt band
 *  when the row carries no `when`, which is the common case today. */
~~~

### slots

Above `const nSlots = Math.max(1, Math.min(L.slots || Infinity, rowsByKey.size));`, lines 911 to 912 before the cut.

~~~js
// `slots` caps the stack (compose stacked 128 MIDI notes into 8 rows by hand);
// `slotOf` lets a lane place a span on a real axis — pitch, participant, tier.
~~~

### current

Above `const anyCur = L.currentOf ? spans.some((s) => L.currentOf(s)) : false;`, lines 919 to 934 before the cut.

~~~js
/**
 * 🔴 WHICH SPAN IS THE ONE IN HAND, AND IT CANNOT BE SAID IN COLOUR.
 *
 * A lane whose bars are things you can pick one of — a corpus of tapes, a
 * list of takes — needs to say which one is picked, and every colour channel
 * is already spoken for: hue is HOW A ROW LANDED across this whole project,
 * and the two tones inside a bar are how sure its date is. So the channel is
 * strength: `currentOf(s)` true for one span leaves that one at full weight,
 * a hairline ring in the playhead's own ink around it, and drops the rest to
 * `dimTo`. Nothing moves, nothing changes hue, and the picture answers "which
 * of these am I on" without a second legend.
 *
 * ⚠️ IT DIMS ONLY WHEN SOMETHING IS ACTUALLY CURRENT. A lane that answers
 * false for everything — nothing loaded yet — gets its ordinary picture
 * rather than a lane greyed out for no reason a reader can see.
 */
~~~

### dim

Above `const DIM = L.dimTo ?? 0.5;`, lines 936 to 940 before the cut.

~~~js
// HALF STRENGTH, and no less. MEASURED at 1, 0.38 and 0.55 on `/tapes/` at
// 1440 px: below about a half the bars of an archive whose subject is HOW
// WIDE A VAGUE DATE IS stop reading as bars at all, and dimming that erases
// the encoding has thrown away more than it bought. The ring is what makes
// the current one unmistakable; this only has to rank the rest behind it.
~~~

### bars-false

Above `for (const s of L.bars === false ? [] : spans) {`, lines 946 to 951 before the cut.

~~~js
// `bars:false` gives the AGGREGATE ITS OWN LANE. A stacked span lane and a
// per-column silhouette want the same pixels, and the silhouette loses — the
// statistic ends up drawn behind twenty bands. Separating them is also the
// honest layout: the individuals and the statistic over them are two claims,
// and §9.5's "pair the curve with a rug of individuals" is the pairing that
// belongs INSIDE the aggregate lane, not the bands.
~~~

### hit-geometry

Above `s._y = y; s._h = barH;`, lines 960 to 965 before the cut.

~~~js
// WHERE THIS BAR ENDED UP, written back for `hitTest`. A packed lane puts
// its bars in sub-rows and the hit test used to ignore them: it returned the
// FIRST span covering the pointer's time, so on a lane of overlapping dates
// pointing at any bar named the topmost one. The draw is the only thing that
// knows the geometry (it depends on the slot count, the pad and the lane's
// height), so it records it rather than making the hit test guess again.
~~~

### bar-gap

Above `const gap = L.barGap ?? 0;`, lines 974 to 977 before the cut.

~~~js
// `barGap` insets the DRAWN bar without touching the span's real extent.
// Adjacent spans — the passes of a loop — share an edge exactly, and two
// rounded rectangles meeting at a shared edge still read as one long bar.
// A hairline of lane between them is what makes three things three.
~~~

### floor

Above `const bw = Math.max(2, xb - xa - gap);`, lines 979 to 983 before the cut.

~~~js
// A FLOOR YOU CAN SEE, and no wider. 1.5 px is a hairline that reads as a
// scratch; 2 px is a mark. Four was tried and is too much — the floor is
// there so a clip does not VANISH, not so it looks bigger than it is, and
// every pixel above the minimum is a pixel of lie about the duration.
// Above it the width stays strictly proportional.
~~~

### edges

Above `const feather = soft ? Math.min(22, Math.max(2, bw * 0.34)) : 0;`, lines 986 to 992 before the cut.

~~~js
// EDGE = when.kind, and the two are opposite claims about the world (§7):
//   ignorance — there IS a boundary, the catalogue lost it. The bound is a
//     FACT ("certainly not before earliest"), so it gets a hard terminator
//     and an invitation to narrow, because finding the day is a repair.
//   vagueness — there is no boundary. A hard edge would be the falsification,
//     so the band is feathered and there is NO narrowing affordance at all.
// Never a dash for either (§8.4.5): dash is tratteggio's, one axis down.
~~~

### radius

Above `const rad = Math.min(2, bw / 3, barH / 3);`, lines 994 to 997 before the cut.

~~~js
// A slice is a THING, and a thing has ends. Square corners let adjacent
// slices — the three passes of a loop — melt into one bar, which is exactly
// the reading the picture must not give. The radius is small and capped at
// a third of the width so a narrow span stays a bar rather than a pill.
~~~

### label-ink

Above `let drawnAlpha = 0;`, lines 999 to 1005 before the cut.

~~~js
// 🔴 THE LABEL'S COLOUR FOLLOWS THE BAR'S, and it did not. The text was a
// fixed near-black, which is right on a bar drawn at 0.85 and unreadable on
// one drawn at 0.30 — and 0.30 is the SKIRT, which is what every vague date
// gets. On `/tapes/`, where most records know only a year or a decade, that
// meant almost every label was dark ink on a dark bar. Recorded here rather
// than guessed further down, because this is the only place that knows how
// solid the bar ended up.
~~~

### drawn-alpha

Above `const alpha = a0 * dim;`, lines 1008 to 1011 before the cut.

~~~js
// ⚠️ `drawnAlpha` IS WHAT WAS PAINTED, dim included. The label below picks
// its ink from it, so a dimmed bar that recorded its undimmed strength
// would get dark ink on a faint bar — which is the exact bug the label
// rule was written to fix, one channel later.
~~~

### ghost

Above `band(TONE.ghost);`, lines 1033 to 1035 before the cut.

~~~js
// EXCLUDED AND REPORTED, drawn as such: a ghost outline with almost no
// fill. It is visible (you can see what the query threw away) and it can
// never be mistaken for an answer.
~~~

### empty-core

Above `const my = y + barH / 2;`, lines 1049 to 1061 before the cut.

~~~js
// THE EMPTY CORE, AND WHY IT IS NOT NOTHING. All 22 Kurenniemi rows have
// innerFrom/innerTo null, so a two-tone design that draws "no core" as
// an absence renders the only real archive we have as a lie by omission:
// the reader sees one flat tone and cannot tell it from `allSkirt`, from
// a crisp span, or from a rendering bug.
// The fix is not to invent a core. It is that AMBIGUATION DEGENERATES
// HERE — with an empty core it has one tone, and one tone is not an
// encoding. So fall back to the SAME STUDY'S OTHER RECOMMENDATION for
// the SAME task: Gschwandtner et al. recommend "ambiguation OR ERROR
// BARS for judging durations and temporal bounds". An error bar spanning
// the outer bracket says exactly what the row says — bounds known,
// extent within them unrecorded — and cannot be read as a core, because
// it is not a filled region at all.
~~~

### caps

Above `ctx.beginPath();`, lines 1066 to 1070 before the cut.

~~~js
// …and the CAPS are the outer bounds asserted as facts, so they belong
// to ignorance only. A capped error bar on a VAGUE row would put a hard
// endpoint on a concept that has none — the same falsification the
// feathered band exists to avoid. Vagueness gets the rule, fading out,
// and no caps: an extent with no ends, which is the claim.
~~~

### tratteggio

Above `if (prov) {`, lines 1106 to 1107 before the cut.

~~~js
// TRATTEGGIO — a derived row is hatched at its own tier, on top, in ink
// that is not spoken for by uncertainty.
~~~

### ring

Above `if (isCur) {`, lines 1119 to 1123 before the cut.

~~~js
// THE ONE IN HAND, RINGED. A hairline in the playhead's own ink, on the
// bar's edge rather than around it: the rows are two pixels apart, and a
// ring drawn outside the bar would touch the row above. It goes on before
// the label so the text stays on top of it, and it is the last thing the
// bar draws at full strength whatever tone the bar itself ended up.
~~~

### solid

Above `ctx.globalAlpha = 0.92; ctx.fillStyle = col;`, lines 1125 to 1131 before the cut.

~~~js
// 🔴 THE EDGE IS THE BAR'S OWN COLOUR, NOT A SECOND ONE. A white hairline
// round a green bar reads as two objects, and REPORTED as exactly that:
// "same border and bg color". It is the same ink filled behind the label
// as well, so the one in hand is a SOLID block rather than an outline
// with a dark hole in it, and the label on it has something to sit on.
// Solid is also what makes the text legible: at full strength the ink
// rule below picks dark on light, which is the readable pairing.
~~~

### label-width

Above `if (L.labels !== false && xb - xa > 30 && barH >= 9) {`, lines 1138 to 1140 before the cut.

~~~js
// `labelOf` is handed the bar's WIDTH. Without it the narrowest span is
// the one that loses its label — and the narrowest span is often the one
// whose label matters most, since narrow is usually the thing being shown.
~~~

### label-size

Above `ctx.font = '11px ${mono()}';`, lines 1147 to 1149 before the cut.

~~~js
// ⚠️ 11 px, NOT 10. REPORTED as not legible, and a monospace face at 10 px
// over Finnish and Estonian titles is where it shows: the diacritics that
// tell `ääniä` from `Ääniä` are the first thing to go.
~~~

### label-place

Above `ctx.textBaseline = 'middle';`, lines 1151 to 1159 before the cut.

~~~js
// TOP-LEFT. A label on the baseline of a tall bar floats in the middle of
// nothing and drifts as the bar's height changes; anchored to the corner
// it stays where the eye goes first and is the same distance from the
// edge whatever height the lane is given.
// ⚠️ PADDING, AND VERTICALLY CENTRED RATHER THAN PINNED TO A BASELINE.
// `y + 11.5` was a baseline measured for one bar height; on a packed lane
// whose slots are shorter it put the text through the bar's bottom edge.
// Centring reads off the height the bar actually got, so a lane can be
// repacked without the labels needing a second number changed with it.
~~~

### draw-aoristic

Above `function drawAoristic(ctx, L, C, spans) {`, lines 1169 to 1185 before the cut.

~~~js
/** §8.4.2: the aggregate is where a curve belongs, and it belongs as HEIGHT.
 *
 *  A STATISTIC, NOT A CURVE. PeriodO rejected fuzzy per-record curves in words
 *  worth keeping — "natural language is already a compact and easily indexable
 *  way to represent imprecision … rather than imposing an arbitrary mapping to
 *  parameterized curves" — and a smooth silhouette over pixel bins implies a
 *  density between the bins that nobody computed. So this draws a STEP: one
 *  rectangle per pixel column, verticals included, no interpolation anywhere.
 *  The first implementation drew `lineTo(i, …)` between column tops, which is a
 *  linear interpolation across the bin boundary — the exact invention refused.
 *
 *  And it states its method on the canvas: bin width, item count, and the peak
 *  VALUE, because the height is normalised to the visible peak and a normalised
 *  height whose divisor is off-screen is not a number. Pair with a RUG of
 *  individuals (§9.5, rcarbon's barCodes) so the reader can always see how many
 *  rows made the shape.
 */
~~~

### legend

Above `const head = 'how likely each moment is';`, lines 1216 to 1222 before the cut.

~~~js
// Plain words on the canvas, asked 2026-10-05 (*"rething labelling"*): the
// legend read `aoristic Σ 1/(b−a) · 1 bin/px ...`. The formula is still
// `a.method`, published and asserted, for a reader who asks.
// ⚠️ MEASURED, AND A CLAUSE DROPS RATHER THAN THE LINE BEING CUT. At 375 px
// the whole sentence ran off the right edge mid-word (2026-10-05). So the
// clauses go from the end, least needed first, until the line fits; the
// first one alone is the floor, and below that nothing is written.
~~~

### continuous

Above `registerRenderer('continuous', (ctx, L, C) => {`, lines 1235 to 1242 before the cut.

~~~js
/** continuous — the polyline. Two regimes, chosen by density, so there is no
 *  ceiling at either end:
 *    rows-per-column <= 2  ->  the attested rows themselves, plus deck.sampleAt
 *                              at both window edges so the line reaches them;
 *    denser              ->  a per-column min/max envelope over the real rows,
 *                              which is the only non-aliasing answer and costs
 *                              one pass.
 *  Hatched when the lane's tier >= 1 (§5b), never when it is attested. */
~~~

### data-ends

Above `const first = rows.length ? rows[0].at : null;`, lines 1274 to 1289 before the cut.

~~~js
// 🔴 THE LINE STOPS WHERE THE DATA STOPS. It used to run to both edges of the
// visible window, because `deck.sampleAt` HOLDS the first and last knot
// outside them — so a two-second gesture on an eight-second line drew six
// seconds of perfectly flat blue at each end. Reported from a screenshot, and
// the objection is exact: that flat run is not a measurement of anything. It
// is the interpolator's boundary rule, drawn as if it were a signal, and on a
// page whose subject is "how much of this line was never recorded" it is the
// worst possible thing to draw.
//
// ⚠️ `edge` STAYS, for the case it was written for: a window scrolled INTO
// the middle of a long recording, where the first visible sample is genuinely
// preceded by data. So the edges are only asked for when the rows actually
// extend past them.
//
// `L.span` overrides it where a lane knows its own extent better than its
// rows do.
~~~

### waveform

Above `registerRenderer('waveform', (ctx, L, C) => {`, lines 1305 to 1307 before the cut.

~~~js
/** waveform — a peaks array on the payload (the shape the ERR audio lanes
 *  provide). Drawn as a mirrored envelope, one column per pixel, so a
 *  three-hour broadcast and a 200 ms sample use the same code. */
~~~

### create-strip

Above `export function createStrip(canvas, deck, opts = {}) {`, lines 1337 to 1354 before the cut.

~~~js
/**
 * @param canvas  an HTMLCanvasElement. The strip owns it (DPR, resize, events).
 * @param deck    a timeline deck (transport.mjs createDeck / logdeck makeLogDeck).
 * @param opts
 *   lanes    [{id, kind|kinds|filter, label, height, as, render?, …}]
 *            LANES ARE QUERIES: `kind` names a deck lane, `filter(row)` narrows
 *            the whole log, `as` picks a renderer ('ticks'|'spans'|'continuous'|
 *            'waveform' or any registered name), `render(ctx,L,C)` overrides.
 *   view     {originTime, pxPerSecond, scrollX} — partial; missing parts are
 *            fitted to deck.range.
 *   evidence 'attested' | {restored:{maxTier:n}} | 'all' — asked of the DECK.
 *   follow   boolean, default true
 *   playhead false for a strip that is a MAP rather than a transport: no line,
 *            no triangle, and no touch-scrub on an invisible one
 *   onSeek   (posMs) => void; defaults to deck.seek
 *   onHover  (detail|null) => void
 *   hud      an element the strip writes its quality readout into
 */
~~~

### certainty

Above `certainty: opts.certainty || 'possible',`, lines 1360 to 1361 before the cut.

~~~js
// U3: unlike the evidence policy this DEFAULTS rather than throws — silence
// about certainty widens the net, it does not fabricate.
~~~

### wall-anchor

Trailing comment on line 1368 before the cut.

~~~js
wallAnchor: null,                 // {pos, wall} — the dual cursor's origin
~~~

### loop-grey

Above `loop: '#6a7280',`, lines 1376 to 1379 before the cut.

~~~js
// The loop's furniture, and it is the SAME GREY THE WAVE USES for the
// same thing: `--dim2` where there is a stylesheet, this fallback where
// there is not. A loop drawn in one colour on the wave and another on the
// line is two pictures of one state.
~~~

### off

Above `off: 0.55,`, lines 1381 to 1384 before the cut.

~~~js
// How far a lane that is not active right now dims (`setActive`). An
// opacity, read from the kit's `--ctl-off` by `demo/shell/strip.mjs`
// where there is a stylesheet, so a quiet lane and a switched-off
// control are dimmed by the same number. This is its fallback.
~~~

### gutter

Above `gutterMaxFrac: opts.gutterMaxFrac ?? 0.42,`, lines 1390 to 1405 before the cut.

~~~js
// 🔴 THE GUTTER IS SIZED BY WHAT IT CARRIES, NOT BY A CONSTANT — AND IT
// GROWS ON A NARROW SCREEN RATHER THAN SHRINKING. It used to be 92 px,
// CLAMPED TO 46 below `narrowAt`, on the reasoning that a label column
// should not eat a quarter of a 360 px plot. That reasoning priced the
// plot and forgot to price the words: 46 px is narrower than the text, so
// a strip on a 390 px phone read `ty…`, `52…`, `64…` — a lane whose name
// and BOTH of its measured numbers were each a single ellipsis. That is
// the worst possible trade, because the gutter still took its slice of the
// plot and gave nothing back for it. CLAUDE.md's rule is that anything
// truncating with an ellipsis is in the WRONG PLACE; here it is the right
// place at a made-up width, so the width is MEASURED now.
// Bounded on both sides: never below `gutterBase`, so a short-labelled
// strip does not give every page a different, moving left edge — and never
// above `gutterMaxFrac` of the canvas, because a gutter free to grow is a
// plot free to vanish. ⚠️ `narrowAt`/`gutterNarrow` are gone; a caller
// still passing them is passing something that no longer does anything.
~~~

### live

Above `live: opts.live ? { from: 0, minSpan: 8000, ...(typeof opts.live === 'object' ? `..., lines 1414 to 1414 before the cut.

~~~js
// LIVE RUN MODE (see `startLive`). null on every strip that did not ask.
~~~

### height

Above `height: l.height ?? 24,`, lines 1427 to 1431 before the cut.

~~~js
// ⚠️ 24, not 28. The default is what a lane gets when a page has not
// thought about it, so it is the number that decides how tall most
// strips are, and it was set when the gutter needed more room per line
// than it does. A lane carrying a name and ONE number needs 21 + a
// baseline, so 24 is the smallest that still says everything.
~~~

### gutter-here

Above `const key = '${S.width}|${S.lanes.map((L) => (L.show ? '${L.label ?? L.id}\u0001`..., lines 1449 to 1460 before the cut.

~~~js
// 🔴 THE GUTTER IS SIZED HERE, NOT IN `resize()`, AND THAT IS THE WHOLE
// POINT OF THE FIX. Sizing it on resize alone read as working and did
// NOTHING: `setLanes` does not resize, and a page sets `L.subLabel` by
// reaching into the lane object long after both have run — `typist` does it
// every time its numbers change. So the width was decided while the strip
// had no lanes, or no numbers in them, and never revisited. MEASURED with
// the sizer wired to resize only: a lane given a 458 px number still got a
// 92 px gutter, i.e. the function existed, was correct, and could not
// affect anything. A measurement that runs at the wrong moment is
// indistinguishable from one that is never taken.
// ⚠️ Cached on the TEXT, not on a dirty flag, because nothing tells us when
// a client mutates a label — the only honest trigger is the text changing.
~~~

### lane-height

Above `for (const L of S.lanes) {`, lines 1463 to 1474 before the cut.

~~~js
// 🔴 A LANE IS AS TALL AS ITS DESCRIPTION PLUS AIR, ON A STRIP THAT FOLLOWS
// ITS LANES. Asked 2026-10-12 on /typist/: *"add more vertical spacing to
// lane descriptions"*. Three 36 px lanes each held a name and two numbers,
// last baseline at y+34, so one lane's last line ended 5.4 px above the next
// lane's name while the lines inside a lane sat 3.4 and 4.4 px apart: the
// gap between descriptions was the gap within one, and nothing grouped.
// `gutterNeed` is the block plus `GUT_AIR` above and below, so the gap
// between two descriptions is 2 x GUT_AIR against the 4 px inside one.
// ⚠️ A FLOOR, AND ONLY WHERE THE CANVAS FOLLOWS THE LANES (`autoHeight`).
// A fixed-height strip cannot grow a lane without pushing the last one off
// its bottom, so there the asked height stands and the old top-aligned
// placement in `drawGutter` is what fits.
~~~

### min-height

Above `S.lanesH = y;`, lines 1481 to 1503 before the cut.

~~~js
/**
 * A FLOOR, AND EMPTY SPACE UNDER THE LANES IS THE POINT RATHER THAN A
 * DEFECT. `autoHeight` takes exactly the height the lanes need, which is
 * right until the lanes are few: a strip holding one lane comes out about
 * fifty pixels tall, which is a sliver rather than a picture of a
 * recording. `minHeight` is what a page uses to say the timeline is its
 * subject and should look like one whatever it happens to hold.
 * ⚠️ IT IS A FLOOR, NEVER A HEIGHT. Lanes that need more than it still get
 * more, so a page cannot clip its own content by asking for this.
 * ⚠️ AND THE GROUND IS PAINTED ACROSS THE WHOLE CANVAS, not to `contentH`,
 * so the space below the last lane is the strip's own background rather
 * than a hole showing the page through.
 */
/**
 * ⚠️ TWO NUMBERS, BECAUSE A CHECK THAT SAMPLES THE PICTURE NEEDS TO KNOW
 * WHERE THE LANES STOP. `contentH` is how tall the canvas is; `lanesH` is
 * how far down it anything was drawn. They were one number until a floor
 * existed, and the first thing the floor broke was `/stage/`'s "no black
 * rule between the lanes" assert: it sampled to the bottom of the canvas,
 * found the empty ground below the last lane, and reported it as a rule.
 * The check was right to be suspicious of a dark row and wrong about where
 * its subject ends.
 */
~~~

### evidence

Above `const ev = () => S.evidence;`, lines 1508 to 1510 before the cut.

~~~js
/** The evidence policy every query resolves to. `undefined` means "let the
 *  deck's own policy decide" — which is the forced choice of §5b, not a
 *  default this component invents. */
~~~

### certainty-knob

Above `const q = {};`, lines 1517 to 1521 before the cut.

~~~js
// U3's knob, forwarded. It is a no-op on a SPAN lane (those query the whole
// lane so they can pair, and (−∞,∞) contains every bracket, so `necessary`
// accepts everything) — which is exactly why the strip re-derives the
// predicate per VISIBLE window in whenState(). Stated because a knob that
// is silently inert is worse than an absent one.
~~~

### spans-for

Above `function spansFor(L) {`, lines 1532 to 1535 before the cut.

~~~js
/** Span lanes must PAIR before they can virtualize, so they query the whole
 *  lane once and cache; the draw is still virtualized (spans outside the
 *  window are skipped). The cache is invalidated by the deck's rangeGen, by
 *  an evidence change and by strip.invalidate(). */
~~~

### zoom-bounds

Above `function floorPps() {`, lines 1572 to 1599 before the cut.

~~~js
/** DEEP-TIME ZOOM CEILING, derived from IEEE-754 rather than authored per era.
 *  ChronoZoom caps zoom depth with a hand-written `deeperZoomConstraints`
 *  table ("you cannot zoom to a day inside the Hadean"). The same rule falls
 *  out of the float for free: stop where one pixel is finer than one
 *  representable step of the position domain, because past that the grid is
 *  finer than the numbers under it. MEASURED consequences, both surprising:
 *    · at 13.8 Gyr the ceiling is 0.0153 px/s — one ulp is 65.536 s there, so
 *      the deepest honest view still spans 1400 px x 65.536 s = 25.5 HOURS.
 *      "You cannot zoom to a minute inside the Hadean, but you can zoom to a
 *      day" — ChronoZoom's per-era cap, arrived at by arithmetic;
 *    · at a 2026 wall-clock epoch stamp it is 4.10e6 px/s, which means the
 *      component's existing hard cap of 1e7 px/s was ALREADY 2.4x past the
 *      double's resolution for every `absolute` deck we ship. Nobody had
 *      zoomed there, so nobody had seen it.
 *  Reported, never silent. */
/**
 * 🔴 AND A FLOOR, WHICH DID NOT EXIST AT ALL UNTIL 2026-09-18. Everything
 * above is about zooming IN, where a double runs out of resolution and the
 * component has to say so. Zooming OUT was bounded at 1e-30 px/s, which is
 * not a bound: a reader could wheel until a three second recording was a
 * thousandth of a pixel with nothing on screen and no way back but a control
 * they had to know about. `maxSpan` (ms) is the widest view a page will hand
 * out, and it is reported on `S.zoom.by` the same way the ceiling is, because
 * a limit that stops the picture without saying why reads as a broken wheel.
 * ⚠️ IT DEFAULTS TO OFF. Thirteen pages use a strip and none of them asked
 * for this, so an unasked-for bound would be exactly the `armWall` mistake:
 * a default nobody wanted, arriving in seven pages at once.
 */
~~~

### frame

Above `function frame(t, span, at = 0.38) {`, lines 1631 to 1644 before the cut.

~~~js
/**
 * Frame a moment: put `t` at a fraction across the view, with `span` ms
 * showing.
 *
 * 🔴 THE PLAYHEAD BELONGS LEFT OF CENTRE, NOT AT IT. `fit()` centres a RANGE,
 * which is right when the range is the subject; when a playhead is the
 * subject, centring puts half the view behind you — and what a reader wants
 * from a timeline is mostly what is ahead. 0.38 leaves enough behind to see
 * where you came from and gives the rest to where you are going. Asked for
 * from a phone, where the difference is the whole screen.
 *
 * ⚠️ IT IS HERE RATHER THAN IN A PAGE so every strip can have it. A page that
 * wants the old behaviour simply goes on calling `fit`.
 */
~~~

### follow

Above `function followPos() {`, lines 1660 to 1683 before the cut.

~~~js
// -- follow mode -----------------------------------------------------------
// demo9 re-centred EVERY FRAME and fought the user. This does not: the window
// is a PAGE. It stays where it is until the playhead crosses followEdge, then
// flips once. Any user scroll/drag/zoom disengages follow entirely, and only
// a control (setFollow(true)) re-engages it.
/**
 * WHAT follow tracks, which is not always the playhead.
 *
 * The rule is: follow tracks THE NEWEST FACT ON THE STRIP. During playback
 * that is the playhead, and for every page before `/stage/` there was nothing
 * else it could be, so `S.pos` was hard-coded here and read as the whole rule.
 * A strip watching a show being RECORDED has a newest fact and no playhead at
 * all: nothing is playing, `deck.position()` is 0 or stale, and follow sat
 * still while questions and answers arrived off the right edge.
 *
 * A page names its own target and may change it mid-run, which is what a show
 * ending is. `wallPos()` anchored at the recorder's start IS the write head,
 * so the usual target is `() => wallPos() ?? S.pos`: it hands back to the
 * playhead by itself the moment the wall cursor is disarmed.
 *
 * A target that returns null or a non-finite number falls back to the
 * playhead rather than parking the view at NaN, because a page whose clock
 * has not started yet must not be a page whose strip has stopped working.
 */
~~~

### follow-target

Above `function setFollowTarget(fn) {`, lines 1695 to 1699 before the cut.

~~~js
/**
 * Pass null to go back to the playhead. It re-engages nothing on its own: a
 * reader who has dragged the strip stays dragged, because the handover at the
 * end of a show must not yank the view out of somebody's hand.
 */
~~~

### arm-wall

Above `function armWall(posMs = deck.position ? deck.position() : 0) {`, lines 1720 to 1724 before the cut.

~~~js
// -- the dual cursor -------------------------------------------------------
// The lineage's best idea (§4): a wall-clock "now" line beside the playhead.
// The GAP between them IS the accumulated pause + rate offset since the strip
// was armed. It is never re-anchored implicitly — that would erase exactly
// the quantity it exists to show.
~~~

### disarm-wall

Above `function disarmWall() {`, lines 1730 to 1735 before the cut.

~~~js
/**
 * The honest counterpart of `armWall`. A wall cursor left armed after the
 * thing it was measuring has stopped counts how long ago you finished, which
 * the comment below already calls noise on a fixture. There was no way to put
 * it away, so a page that armed one was stuck with it.
 */
~~~

### start-live

Above `function startLive(at = 0, o = {}) {`, lines 1747 to 1770 before the cut.

~~~js
// -- live run mode ---------------------------------------------------------
/**
 * 🔴 A LIVE RUN IS A STANDARD, NOT A PAGE'S TIMER. Asked 2026-10-12 on
 * /concepts/clock/090/: the strip of a run being written showed its cursor
 * parked at 0 while marks arrived, *"why cursor aint moving? ... we need std
 * behaviour here"*. Every clock page refitted the view by hand on a 250 ms
 * timer and none of them had a cursor, because the only cursor was the deck's
 * playhead and nothing was playing.
 *
 * `live: true` (or `{ minSpan, from }`) on the strip, then:
 *   startLive(at = 0)  the run starts, and the write head is at `at` now. It is
 *                      the WALL CURSOR (`armWall(at)`), so it moves with real
 *                      time whether or not a deck plays.
 *   stopLive()         the write head freezes where it is, and stays drawn.
 * While a run is live the view holds the whole run from `from`, in round
 * steps (LIVE_STEPS, see `liveFit`), never narrower than `minSpan` ms: the
 * head walks across a step and the view zooms out to the next one only when
 * the head reaches its right edge. The deck's playhead is not drawn: on a live strip the
 * write head is the cursor, drawn in the playhead's own shape.
 * ⚠️ A READER'S ZOOM OR PAN HOLDS THE VIEW where they put it, the way follow
 * disengages; a double click on the strip hands it back to the live fit.
 * ⚠️ AND IT TURNS BINNING ON (BIN_GAP_PX), because a live run is the case
 * that grows past the marks' room by itself.
 */
~~~

### live-steps

Above `const LIVE_EDGE = 0.92;`, lines 1792 to 1802 before the cut.

~~~js
/**
 * 🔴 THE LIVE VIEW IS STEPPED, NOT REFITTED EVERY FRAME. Asked 2026-10-12 on
 * /concepts/clock/010/: *"lines move very nervously here"*. A view refitted
 * to the head on every frame rescales every frame, so every mark on the
 * strip slid a fraction of a pixel sixty times a second. Now the view holds
 * one span from LIVE_STEPS, the cursor walks across it, and only when the
 * head passes LIVE_EDGE of the span does the view zoom out to the next step.
 * Between steps nothing but the cursor moves, so the marks stand still.
 * The first span is the smallest step at least `minSpan` long, and a run's
 * span only grows, so a stopped run keeps the last view it had.
 */
~~~

### arm-wall-opt

Above `if (opts.armWall === true && deck.transport && deck.transport.onState) {`, lines 1820 to 1837 before the cut.

~~~js
// 🔴 OFF UNLESS A PAGE ASKS, AND THE EVIDENCE IS THE PAGES THEMSELVES. This
// armed on the first play by default, and of the thirteen pages that use a
// strip, TEN pass `armWall: false` and the other three call `armWall(anchor)`
// with an anchor of their own (`keep` and `take` a part's start, `now` the
// real clock). **Not one page wanted the default** — and the seven that never
// mentioned it were getting a cursor they had not asked for.
//
// What it measures is how far the piece has fallen behind real time since it
// first played. That is the number to watch on a LIVE feed, and it is noise
// on a fixture: once the playhead stops, the gap just counts how long ago you
// finished. PHOTOGRAPHED on `draw` — an amber band across half the strip and
// `209.31 s` beside it, which is the age of the browser tab and not a fact
// about the drawing. The reader's words were "I do not understand what that
// 209.31 s and dark yellow area is", which is the correct response to it.
//
// ⚠️ A default that turns a second cursor ON is a default that has to be
// right about every page that never thought about it. `opts.armWall === true`
// keeps the auto-arm for anything that genuinely wants it on first play.
~~~

### quality

Above `function visibleStates() {`, lines 1845 to 1852 before the cut.

~~~js
// -- readout ---------------------------------------------------------------
/** The quality line: what the DECK says about how much of this picture was
 *  invented, and how well the transport is keeping time. Both are the deck's
 *  numbers; the strip never computes either. */
/** the three-answer tally across every visible span lane. It belongs in the
 *  QUALITY LINE, not only in the ghosts: "12 rows undecidable at this zoom" is
 *  the sentence a curator needs, and a ghost you have to notice is not a
 *  report. */
~~~

### count-marks

Above `if (!L.show || L.bars === false) continue;`, lines 1856 to 1858 before the cut.

~~~js
// `bars:false` lanes draw no bands, so counting them would double-count
// any kind that also has a band lane — which is exactly the shape an
// aggregate-in-its-own-lane creates. The quality line counts MARKS.
~~~

### max-ticks

Above `const MAX_TICKS = 4096;`, lines 1915 to 1922 before the cut.

~~~js
// The tick loop is INDEX-BASED (`first + i*step`), never accumulating, for two
// measured reasons: `t += minor` STALLS outright once minor <= ulp(t)/2 —
// t + 1 === t at t >= 9.313e15 ms (~295 kyr), so an accumulating loop at deep
// time hangs the tab rather than drifting — and even below that the
// accumulation drifts by one ulp per tick. It is also COUNT-BOUNDED: the LOD
// guarantees ~plotW/7 visible ticks, but a guarantee is not a bound, and the
// ladder's old ceiling of 100 y turned a 13.8 Gyr view into 138,000,000
// fillText calls. The clamp is reported, never silent.
~~~

### ruler-label

Above `let labelEnd = -Infinity;`, lines 1924 to 1931 before the cut.

~~~js
/**
 * A RULER LABEL SITS RIGHT OF ITS TICK, UNLESS THAT RUNS PAST THE PLOT'S
 * RIGHT EDGE. Then it sits LEFT of the tick, ending 3 px before it, and if
 * that would land on the previous label it is not drawn at all. Until
 * 2026-10-05 the last label of every strip was simply cut by the canvas edge
 * on both rulers, `/time/` DATES among them. The tick line is
 * drawn either way; only the words move or go.
 */
~~~

### gutter-insets

Above `const GUT_TEXT_X = 18, GUT_SWATCH_X = 8, GUT_PAD = 10;`, lines 2008 to 2035 before the cut.

~~~js
// 🔴 ONE RIGHT-HAND INSET, READ BY BOTH THE SIZER AND THE CLIPPER. They had
// two, and the gap was silent: `gutterWidthFor` reserved
// `11 + text + 10` while `drawGutter` clipped every line against
// `gutterPx - 18 - 8` — the NAME's inset, applied to the numbers
// as well. So a sub-line was measured against 19 px of chrome and then cut
// against 26, and **any sub-line long enough to SET the gutter width was
// always one character too long for it**. MEASURED: `usual 12 ms` sizes the
// gutter and renders `usual 12 …`. A component that widens itself to fit its
// own text and then truncates that text is the worst version of this — it
// paid for the room and did not use it.
// `gutRoom(x)` is the one right-hand inset both of them read, and it stays a
// function of x so that a future line starting somewhere else cannot
// reintroduce the gap by being measured against somebody else's margin.
//
// 🔴 ONE LEFT EDGE. THE NAME AND THE NUMBERS ARE ONE COLUMN. They were two —
// the name at 18 and its own numbers at 11 — with nothing justifying the
// 7 px, so every lane read as a ragged step. Worse, 11 is exactly where the
// SWATCH ends (`fillRect(8, …, 3, …)` paints 8..11), so the first number
// started on the pixel the swatch finished on AND overlapped it vertically:
// the swatch spans y+6..y+20 and that number's glyphs sit y+15..y+24. They
// touched on both axes. One `GUT_TEXT_X` fixes both at once and leaves the
// swatch 7 px of clear gutter.
// ⚠️ IT COSTS PLOT AND THAT IS THE TRADE. `gutterWidthFor` sizes from
// `TEXT_X + widest line`, so a page whose widest line is a NUMBER now pays up
// to 7 px more gutter. MEASURED across the sixteen strip pages at 1200 px:
// four moved — strip 118->125, now 101->107, score 150->155, sound 172->179
// — and the other twelve did not, because they declare a base gutter wider
// than anything they carry.
~~~

### gutter-rhythm

Above `/**`, lines 2038 to 2058 before the cut.

~~~js
// 🔴 THE GUTTER'S LINE SPACING SETS THE MINIMUM LANE HEIGHT, so it is the
// thing to tighten when the lanes are too tall — not the marks, which are
// already derived from the lane height and would shrink on their own. A name
// and two numbers used to need 15 + 24 + 35 = a 42 px lane; at 12 + 21 + 31
// the same three lines fitted in 36, which was 6 px back per lane on every
// page with a strip. At 11 + 22 + 32 they need 34 and the pages still ask for
// 36, so the saving stands.
//
// ⚠️ A NAME IS NOT ONE OF THE NUMBERS, SO IT DOES NOT SIT ON THEIR STEP.
// 12 -> 21 was a 9 px step under a 10 px face: the name's descenders and the
// first number's ascenders met, and the block read as three equally-weighted
// lines rather than as a heading over a pair of figures. 11 -> 22 is 11 px
// there and 10 px between the numbers, which groups them.
// 🔴 AND THE 11 px IS ALL THERE IS — the numbers' own step CANNOT grow.
// MEASURED on the sixteen strip pages, the binding lanes are `reel`'s
// `newsreels` (THREE lines in 44 px, last baseline at +42 against a
// `height - 2` = 42 ceiling) and `now`'s `ETV schedule` (two lines in 34 px,
// +32 against 32). Both are EXACTLY at the limit now, so a bigger step, or a
// page adding a third line to a 44 px lane, drops a line in silence. That is
// what `gutterFit()` is for: it reports `dropped` per lane, and 0 across all
// sixteen is the measurement this rhythm was chosen against.
~~~

### gut-step

Above `const GUT_NAME_Y = 11, GUT_SUB_Y = 22, GUT_SUB_STEP = 12;`, lines 2059 to 2079 before the cut.

~~~js
/**
 * 🔴 `GUT_SUB_STEP` IS 13, NOT 10. Photographed 2026-09-20 on a lane carrying a
 * name and two detail lines: *"not enougj line height for desc"*. The gutter
 * text is 10 px, so a 10 px step is a line height of exactly 1.0 and the
 * descenders of one line touch the ascenders of the next. One line looked fine
 * and three read as a solid block.
 * 🔴 **12 AND NOT 13, AND THE PAGE DECIDED THAT RATHER THAN A PREFERENCE.** The
 * first attempt was 13 with the first line at 23, which is 1.3 and matches the
 * rest of the project's small mono text. `/held/` went red immediately:
 * **`maze dropped 1, transition dropped 1`**. Those lanes are 36 px, the second
 * line would have landed at y+36 against a limit of y+34, and the drop is
 * SILENT: a lane one pixel short loses its last line, which is where a page
 * puts its count.
 * ⚠️ **THE ALTERNATIVE WAS TO MAKE EVERY LANE TALLER AND THAT IS A WORSE
 * TRADE.** Eight lanes on that page carry hand-set heights that decide what the
 * whole piece looks like at a glance, and reshaping them to win three pixels of
 * leading is a big change bought by a small one.
 * ⚠️ AND THE ASSERT IS WHY THIS IS KNOWN RATHER THAN SHIPPED. `gutterFit()`
 * publishes what was dropped and `/held/` reads it, so a leading change that
 * quietly costs a page its numbers goes red in one run.
 */
~~~

### gut-air

Above `const GUT_AIR = 8;`, lines 2081 to 2084 before the cut.

~~~js
/** Air above and below a lane's description, so two descriptions are
 *  2 x 8 = 16 px apart (last baseline to next cap top) against 4 to 5 px
 *  between the lines inside one: the space around a group visibly larger
 *  than the space within it. */
~~~

### gutter-lines

Above `function gutterLinesOf(L) {`, lines 2099 to 2102 before the cut.

~~~js
/** The lines a lane's gutter will draw under its name: its sub-labels,
 *  joined onto one line when they fit side by side. ONE function for the
 *  drawer and for `gutterNeed`, or the floor would be computed for lines
 *  nobody draws. Assumes the gutter font is set. */
~~~

### sub-labels

Above `function subLabelsOf(L) {`, lines 2123 to 2127 before the cut.

~~~js
/** A lane's own lines under its name: the client's numbers when it has them,
 *  else the derived clock domain. ⚠️ Factored out because the gutter is now
 *  MEASURED, and a sizer that computes its width from different text than the
 *  drawer renders is a gutter that is confidently the wrong size. One source,
 *  both callers. */
~~~

### sub-label

Above `const client = L.subLabel === undefined || L.subLabel === null ? []`, lines 2136 to 2142 before the cut.

~~~js
// A lane's OWN NUMBERS belong beside its own ink, not in a table somewhere
// else that the reader has to join up by colour. `subLabel` is the client's
// line (or lines) under the label — typical and worst, or "no feedback" for
// a lane that cannot say. A lane that says something about itself REPLACES
// the derived line rather than queueing behind it: the derived line names
// the clock domain, which is worth having when nothing better is on offer
// and is noise the moment the client has real numbers.
~~~

### comma

Above `return client.length ? client : (sub.length ? [sub.join(', ')] : []);`, lines 2145 to 2148 before the cut.

~~~js
// ⚠️ `, ` AND NOT A MIDDOT, since 2026-09-19. A gutter is read by a visitor,
// and no middots is now a rule of this project: a separator lets a line
// bolt a third and a fourth fact on instead of ending, which is the habit
// the em dash rule is about wearing a different character.
~~~

### reserve

Above `for (const s of [].concat(L.gutterReserve ?? [])) need = Math.max(need, GUT_TEXT`..., lines 2163 to 2166 before the cut.

~~~js
// `gutterReserve`: lines the lane CAN show and is not showing now, measured
// and never drawn, so a count falling from `22 of 22` to `0 of 0` does not
// narrow the gutter and slide the plot's left edge (`/time/` DATES,
// 2026-10-05). Opt in per lane; a lane without it sizes as before.
~~~

### cap

Above `const cap = Math.max(base, Math.round(cssW * S.gutterMaxFrac));`, lines 2170 to 2172 before the cut.

~~~js
// ⚠️ The cap is `max(base, frac)`, never the fraction alone: on a very
// narrow canvas a bare fraction would clamp BELOW the base and quietly
// reintroduce the ellipsis this function exists to remove.
~~~

### ceil

Above `return Math.ceil(Math.min(cap, Math.max(base, need + GUT_PAD)));`, lines 2174 to 2179 before the cut.

~~~js
// ⚠️ `ceil`, NOT `round`, AND IT IS A WHOLE CHARACTER. `need` is a
// measured text width with a fraction on it, so rounding 111.4 down to 111
// leaves the very line that SET the width a sub-pixel short of fitting in
// it — and the clipper does not do sub-pixels, it drops a character and adds
// an ellipsis. MEASURED: `12.3 ms typical` sized the gutter to 111 px and
// then rendered cut, in a gutter it had just paid for.
~~~

### truncate

Above `const TEXT_X = GUT_TEXT_X, SWATCH_X = GUT_SWATCH_X;`, lines 2190 to 2196 before the cut.

~~~js
// truncate by MEASUREMENT, not by a hardcoded character count: a lane label
// must fit whatever gutter the client asked for.
// ⚠️ ROOM AROUND THE LABEL. The swatch sat 4 px from the edge and the text
// 11 px, which put a lane's name hard against its own left border and
// against the plot on the right. `avail` moves with the inset or the
// measured truncation would be computed against a width the text no longer
// has.
~~~

### per-row

Above `const perRow = !L.color && !!(L.colorOf || L.colorOfRow || L.byKey || L.render`, lines 2207 to 2212 before the cut.

~~~js
/* ⚠️ A LANE THAT COLOURS ITS MARKS ITSELF (`colorOf`, `colorOfRow`,
 * `byKey`, its own `render`, or an aggregate with no bars) AND NAMES NO
 * COLOUR OF ITS OWN HAS NO ONE COLOUR TO SHOW, so its swatch and name
 * stay ink rather than taking a hashed colour no mark on the lane is
 * drawn in. Every other lane's swatch is the colour its marks are
 * stroked in, read from the same `_style`. */
~~~

### swatch

Above `let nameY, swatchY, swatchH;`, lines 2223 to 2237 before the cut.

~~~js
/**
 * 🔴 THE SWATCH SPANS THE WHOLE DESCRIPTION, NOT THE NAME LINE. Asked
 * 2026-10-12: *"left border placement seemds off"*. It was `y+6` to
 * `y+20` whatever the lane held, so beside a name and two numbers
 * (cap top y+3.4, last baseline y+34) it covered 14 of 30.6 px, began
 * 2.6 px under the name's top and stopped 14 px above the last line: a
 * mark beside the name, with the numbers hanging loose under it.
 * It now runs from the name's cap top to the last line's baseline, and
 * the block is centred in its lane, so the bar reads as the edge of one
 * description and the description as the label of one row.
 * ⚠️ WHERE THE LANE IS TOO SHORT FOR THE BLOCK PLUS ITS AIR (a fixed
 * height strip; an `autoHeight` one is raised in `layout()`), the name
 * keeps its old place at `GUT_NAME_Y` and lines that do not fit are
 * dropped as before, so nothing that fitted stops fitting.
 */
~~~

### one-line

Above `swatchH = 9;`, lines 2240 to 2242 before the cut.

~~~js
// 🔴 A ONE LINE LANE IS CENTRED ON ITS OWN SWATCH (2026-09-16, *"vertically
// center single row lane labels wiuth left border"*), and the text is
// centred against the swatch by its own ASCENT rather than a typed number.
~~~

### name-colour

Above `ctx.fillStyle = st.color`, lines 2253 to 2261 before the cut.

~~~js
/**
 * 🔴 THE NAME CARRIES THE LANE'S OWN COLOUR, mixed toward the ink rather
 * than set to it. The swatch has always been coloured and the name was
 * always `T.ink`, so the one thing a reader looks at to tell two lanes
 * apart was the one thing that said nothing.
 * ⚠️ MIXED, NOT REPLACED. A lane colour at full strength competes with
 * the marks it is labelling; identity lives at a fraction, legibility
 * comes first (the argument `diagram.mjs` settled).
 */
~~~

### dropped

Above `let shown = 0, lastY = nameY;`, lines 2271 to 2274 before the cut.

~~~js
// 🔴 WHAT DID NOT FIT IS RECORDED, because the break below is SILENT and
// the line it drops is the last one, which is where a page puts its
// count. `gutterFit()` publishes it, so a harness can ask every strip
// page at once whether any lane is a pixel short. Cut, never ellipsized.
~~~

### zoom-readout

Above `const zt = zoomText();`, lines 2297 to 2299 before the cut.

~~~js
// HOW WIDE THE VIEW IS, in the gutter's ruler row, which holds no lane
// name, set against the plot edge on the tick labels' own baseline so it
// reads as a fact about the ruler beside it. See `zoomText()`.
~~~

### zoom-text

Above `function zoomText() {`, lines 2313 to 2333 before the cut.

~~~js
/**
 * HOW WIDE THE VIEW IS. Not decoration: every question about this component
 * so far (why is a clip one pixel, why do the ticks land on the 27th, is this
 * a week or a year) is a question about the span on screen, and answering it
 * meant reading numbers out of the console. `zoomReadout: false` turns it off.
 *
 * 🔴 IT IS DRAWN IN THE GUTTER, AND FOR A WHILE IT WAS NOT, WHILE ITS OWN
 * COMMENT SAID IT WAS. It was written in `drawCursors()`, which runs inside
 * `draw()`'s `translate(S.gutterPx, 0)`, so its `(8, 11)` was PLOT space: the
 * readout sat on the first major tick's label, and every strip on the site
 * showed `0:00` printed over `3.1 min` (or `0` over `35 s`) at the left end
 * of the ruler. Reported 2026-10-05 from `/partitur/` and seen the same day
 * on `/sync/` and `/time/`. Drawn after the gutter's own fill, with the
 * transform reset, it lands where the comment always said. A gutter too
 * narrow for it gets no readout rather than one over the plot.
 * ⚠️ AND IT SAYS `in view`, RIGHT ALIGNED, SINCE THE SAME DAY. A bare
 * `1.2 min` at the gutter's left edge sat directly above the first lane's
 * name and was read on `/stage/` as a stray lane label. Against the plot
 * edge, on the ruler's baseline, with the two words that say what the
 * number measures, it belongs to the ruler.
 */
~~~

### loop-now

Above `function loopNow() {`, lines 2344 to 2365 before the cut.

~~~js
/**
 * 🔴 THE LOOP ON THE LINE. Asked for 2026-09-16: *"draw loop boundaries
 * (depends on loop cycle state) and add light transclucent shade on loop area
 * on timeline. same colors in waveforms loop handling btw"*.
 *
 * The cycle state is the bar's own, read off `deck.loopView`, and it decides
 * what is drawn rather than what colour it is:
 *
 *   armed   one mark down. ONE edge, and the wash runs from it to the
 *           playhead, so it grows as the material it will hold arrives.
 *           `grain-scope` draws exactly this on the wave, for the same
 *           reason: between the two presses the button has nothing else to
 *           show for itself.
 *   on      both marks. TWO edges and a wash that stands still.
 *   off     `loopView` is null and nothing is drawn.
 *
 * ⚠️ THE WASH GOES UNDER EVERYTHING AND THE EDGES OVER IT. A band painted on
 * top of the lanes would dim the material it is there to point at, and edges
 * painted under them would disappear behind a full bar.
 * ⚠️ `loop: false` in the options turns it off for a strip that is a MAP
 * rather than a transport, the same escape `playhead: false` already is.
 */
~~~

### record-head

Above `const wx = Math.round(x(wp)) + 0.5;`, lines 2421 to 2425 before the cut.

~~~js
// A SECOND PLAYHEAD, in the wall colour. `take` arms this line as a
// RECORDING head, and a recording head is a position like any other — so
// it gets the playhead's shape (solid, 1.5 px, a triangle on top) rather
// than the dashes and the gap band below, which belong to the drift
// reading and would be measuring nothing here.
~~~

### wall-dash

Above `ctx.setLineDash(opts.wallDash || [4, 3]);`, lines 2438 to 2441 before the cut.

~~~js
// `wallDash` lets a client say what kind of line the second cursor is.
// Default unchanged; `now` passes a dotted one because its two cursors
// sit a few pixels apart and dashes at that distance read as one line
// with gaps in it rather than as two different kinds of line.
~~~

### wall-label

Above `if (gap > 34 && opts.wallLabel !== false) {`, lines 2453 to 2458 before the cut.

~~~js
// the label sits BELOW the axis, on its own backing, so it never fights
// the tick labels it is measuring against
// `wallLabel: false` for a client that already prints the gap somewhere
// a reader is looking — `now` carries it in the live row's margin, and
// the same number twice, one of them floating over the axis, is one
// more thing to reconcile rather than one more thing known.
~~~

### no-playhead

Above `if (opts.playhead !== false) {`, lines 2474 to 2485 before the cut.

~~~js
/**
 * 🔴 `playhead: false` — A STRIP THAT IS A MAP HAS NO POSITION IN IT.
 *
 * A sweeping line across bars means one thing everywhere it has ever been
 * drawn: this is where playback is, and everything it crosses is sounding.
 * On a strip whose axis is WHEN THINGS ARE FROM that sentence is false, and
 * it was read exactly as written. The report on `/tapes/` was *"am I
 * listening to all the tapes on the same day together?"*, about an axis
 * running 1890 to 2027 where one tape plays at a time. A map draws no
 * playhead; `currentOf` on a lane is how such a page says which of its bars
 * is the one in hand.
 */
~~~

### auto-kind

Above `function autoKind(L) {`, lines 2528 to 2531 before the cut.

~~~js
/** A lane that does not say what it is gets asked the DECK: an adapter that
 *  declares caps.continuous is a polyline, one that emits phase pairs is a
 *  span lane, anything else is ticks. The client is not made to repeat what
 *  the adapter already stated. */
~~~

### quiet-layer

Above `let quietCv = null;`, lines 2550 to 2553 before the cut.

~~~js
/** One reusable layer the size of the canvas, cleared, in PLOT space and
 *  clipped to the plot, for drawing a lane that `setActive` has quietened.
 *  Null where there is no document to make one in, and the lane then draws
 *  at full strength rather than not at all. */
~~~

### save-clip

Above `q.save();`, lines 2566 to 2568 before the cut.

~~~js
// ⚠️ SAVED BEFORE THE CLIP, because a clip is not undone by
// `setTransform` and would otherwise narrow on every frame. The caller
// restores once the lane is drawn.
~~~

### autofit

Above `if (opts.autoHeight && Math.abs(parseFloat(canvas.style.height || '0') - S.conte`..., lines 2579 to 2584 before the cut.

~~~js
// AUTOFIT. layout() already knows the exact height the lanes need — axis
// plus every visible lane — so a fixed canvas height is either dead space
// below the last lane or a lane clipped off the bottom. Both happened: 01
// ran a 72 px lane in a 120 px box, and 02 grew a third lane when a MIDI
// device appeared and pushed it out of view. Re-resize once after setting
// the height, so this frame draws at the new size rather than the next one.
~~~

### bands

Above `for (const L of S.lanes) {`, lines 2610 to 2625 before the cut.

~~~js
// lane backgrounds first, so bands read against their own row
//
// 🔴 THE BAND IS ITS LANE'S FULL HEIGHT, AND THE 1 px IT USED TO GIVE BACK
// WAS A BLACK RULE BETWEEN EVERY PAIR OF LANES. Reported 2026-09-18 with a
// photograph: *"black horiz lines on timeline are pointless"*. Lanes tile
// exactly — `layout()` does `y += L.height` with nothing between them — so
// painting `height - 1` left one unpainted row per lane, and what showed
// through it was `T.bg`, which is DARKER than the band. Nobody drew those
// lines and nothing in the file mentioned them: they were the shape of a
// gap, not a decision.
// ⚠️ AND IT IS THE STANDING RULE, not a taste. `shell.css` already says
// separation is spacing and a line is a second channel repeating it, and
// here there was not even spacing to repeat: a lane is already told apart
// by its name in the gutter, its swatch and its own marks, which is three
// channels before any rule is drawn. The bands still alternate against
// `T.bg` at 0.55 alpha, so the rows remain legible as rows.
~~~

### draw-order

Above `const order = S.lanes.filter((L) => L.show).map((L, i) => ({ L, i }))`, lines 2634 to 2636 before the cut.

~~~js
// DRAW ORDER IS FIDELITY ORDER (proto/paths' legibility trick): a lane
// declaring a higher tier goes down FIRST, wider and fainter, so attested
// material reads ON TOP of what was invented for it.
~~~

### quiet

Above `const quiet = L.active === false ? quietLayer() : null;`, lines 2641 to 2644 before the cut.

~~~js
// A lane that is not active is drawn on a layer and laid down at the
// theme's `off`, because a renderer sets its own `globalAlpha` per mark
// (the char marks do it per glyph) and an alpha set around it would be
// overwritten by the first mark. Same number as its gutter text.
~~~

### tooltip-lines

Above `const raw = (h.lines || h.text.split('\n')).map((l) => (typeof l === 'string' ? `..., lines 2678 to 2681 before the cut.

~~~js
// A line may be a plain string or {text, colour}. A coloured line gets the
// same swatch its lane's marks carry, which is the join between a number in
// here and the ink out there — the lane-stats table earns its readability
// the same way, and a tooltip listing four lanes needs it more.
~~~

### wrap

Above `const CH = 40;`, lines 2683 to 2698 before the cut.

~~~js
/**
 * 🔴 A LINE THAT DOES NOT FIT IS WRAPPED, NOT MEASURED AND OBEYED.
 *
 * The box used to take the width of its LONGEST line, so one long line made
 * the whole tooltip that wide — and a tooltip is drawn ON TOP of the thing
 * it describes, so a wide one covers the picture a reader is pointing at.
 * Photographed on /tapes/, where a record's title, its minutes, its date
 * bracket and its source ran to one line: the box reached most of the strip
 * and its last line was cut off by the bottom edge.
 *
 * CLAUDE.md budgets a tooltip at about forty characters a line for exactly
 * this reason. That is a rule about the LINE, and the honest way to hold a
 * line to it is to break it rather than to ask every caller to count.
 * ⚠️ A wrapped continuation keeps its colour but loses its swatch: the bar
 * marks a lane, and the second half of a lane's line is not a second lane.
 */
~~~

### swatch-bar

Above `const PAD = 9, LH = 13, SW = 3, SH = 9, GAP = 7;`, lines 2714 to 2716 before the cut.

~~~js
// A thin BAR, the same 3 px mark the gutter puts beside a lane name, not a
// square — the tooltip and the gutter are labelling the same lanes and a
// reader should not have to learn two shapes for one idea.
~~~

### lift

Above `const floor = S.height - 2;`, lines 2724 to 2727 before the cut.

~~~js
// ⚠️ AND IT MUST NOT BE DRAWN OFF THE BOTTOM. `by` was clamped at the top
// and nowhere else, so a box tall enough ran past the lower edge and its
// last lines simply were not there — which reads as a tooltip that forgot
// to say the thing it was opened for. Lift it instead of letting it spill.
~~~

### sub-row

Above `let loose = null;`, lines 2796 to 2803 before the cut.

~~~js
// 🔴 THE SUB-ROW THE POINTER IS ACTUALLY IN, not the first bar that
// happens to cover this instant. `/tapes/` packs 13 overlapping dates
// into 11 sub-rows, and one of them spans a decade: pointing anywhere
// named that one, so the tooltip described a bar nobody was pointing at
// and a press could only ever pick it. `_y`/`_h` are written by the
// renderer, which is the only thing that knows where a bar went.
// ⚠️ THE TIME MATCH REMAINS THE FALLBACK. A lane with no stacking, and a
// finger between two rows, must still hit something.
~~~

### span-line

Above `if (L.spanLine !== false) {`, lines 2841 to 2843 before the cut.

~~~js
// `spanLine: false` — for a lane whose bars are already labelled with
// their own extent. Repeating it in the tooltip spends the reader's
// attention on something the picture has already said.
~~~

### state-words

Above `const st = whenState(s, tAt(0), tAt(plotW()));`, lines 2847 to 2848 before the cut.

~~~js
// the hover says WHICH OF THE THREE ANSWERS this row gives to "certainly
// in view", in words, because the mark alone cannot carry the reason.
~~~

### short

Above `if (s.kind === 'ignorance') out.push('the exact date is lost, not absent');`, lines 2850 to 2858 before the cut.

~~~js
// 🔴 A TOOLTIP IS TWO OR THREE SHORT LINES AND THESE WERE PARAGRAPHS OF
// THIS PROJECT'S PRIVATE VOCABULARY. One read `NO INNER BRACKET and the
// bracket is not contained — "certainly in view" is UNDECIDABLE here
// (zoom out to recover it)`, drawn on top of the thing it describes, in
// front of somebody who pointed at a bar to find out what it was.
// Reported as unusable, and it was. The distinction the three states
// carry is real and belongs in prose somebody chose to read, not in a box
// that appears under a pointer. What is left is the fact: how sure the
// date is, in the words a catalogue would use.
~~~

### terse

Above `if (!L.terse) {`, lines 2869 to 2873 before the cut.

~~~js
// `terse` drops the identity and provenance lines. They exist for the
// heritage case, where "attested" against "RESTORED tier 2" is the whole
// point — and on a lane with no restorations in it they are noise that
// reads as a claim: a reader seeing a green bar labelled `attested` will
// reasonably conclude the COLOUR means attested. It does not.
~~~

### describe-row

Above `if (L.describeRow) { const x = L.describeRow(r); if (x) out.push(...[].concat(x)`..., lines 2884 to 2886 before the cut.

~~~js
// What the row MEASURED is not in the row: drift, arrival, decode time all
// live beside the log. `describeRow` lets the lane say it without any of
// that leaking into the strip.
~~~

### describe-hit

Above `if (opts.describeHit) {`, lines 2889 to 2893 before the cut.

~~~js
// A UNIFIED TOOLTIP. Some pages are ABOUT the relationship between lanes,
// and there the per-lane tooltip answers the wrong question: it tells you
// about the row you happened to touch, when what you want is every lane at
// that instant, side by side. `describeHit` replaces the whole block; the
// default lines are handed over so a client can extend rather than replace.
~~~

### touch

Above `const TOUCH = {`, lines 2906 to 2931 before the cut.

~~~js
// -- TOUCH -----------------------------------------------------------------
// The five ancestors were all built with a mouse. A finger is a different
// instrument and the difference is not "the same events, fatter":
//
//   · A mouse has a RESTING position, so hover is free and a press is
//     unambiguous. A finger has neither: press IS the first contact, so
//     press-to-seek (the desktop default) makes every touch a destructive
//     seek before the user has said what they wanted. Touch therefore defers:
//     the gesture is UNDECIDED until it moves past the slop or the finger
//     lifts. Drag => pan. Lift-without-drag => tap => seek.
//   · There is no wheel, so zoom must be PINCH, and pinch must be about the
//     MIDPOINT, not the centre — the same invariant zoomAt() already keeps
//     for the cursor (the time under the fingers does not move).
//   · There is no hover, so the tooltip must have a tap equivalent, and it
//     must be STICKY (a finger that is still down covers the thing it is
//     describing).
//
// touch-action DISCIPLINE — the whole contract in one declaration:
//   `pan-y`  the page keeps the VERTICAL axis; the strip owns the horizontal
//            one and pinch. A vertical swipe scrolls the page and the browser
//            hands us a pointercancel, which is exactly the right outcome and
//            costs no code. A client that fills the viewport and has no page
//            scroll to protect passes touchAction:'none'.
// Nothing here calls preventDefault on a touch stream: the declaration does
// the work, so the listeners stay passive-friendly and never fight the
// compositor.
~~~

### pinch

Above `function pinchMove() {`, lines 2950 to 2953 before the cut.

~~~js
/** ZOOM ABOUT THE MIDPOINT: the time that was under the midpoint at pinch
 *  start is still under the midpoint now. That is the same law zoomAt() keeps
 *  for a wheel, written for two moving anchors instead of one fixed one — so
 *  a pinch that also slides pans for free, which is what a hand expects. */
~~~

### scrub

Above `touchGesture = opts.playhead !== false && !S.live && Math.abs(px - x(S.pos)) <= `..., lines 2980 to 2987 before the cut.

~~~js
// the PLAYHEAD is a 1.5 px line — unhittable with a finger. Give it the
// full finger radius and a press inside it SCRUBS (the one place where a
// touch drag is a seek and not a pan). Desktop keeps its 1 px precision:
// this branch is only reachable from a touch pointer.
// ⚠️ AND NOT ON A STRIP WITH NO PLAYHEAD DRAWN. `playhead: false` leaves
// `S.pos` sitting wherever the deck was last told; a finger landing within
// the slop of an INVISIBLE line would start scrubbing a line nobody can
// see, and the pan and the tap it stole are both gone.
~~~

### scrub-pause

Above `let resumeAfterScrub = false;`, lines 3033 to 3039 before the cut.

~~~js
// SCRUBBING PAUSES THE TRANSPORT, and puts it back on release.
//
// Dragging the head while the deck is running is two authorities writing one
// position: the drag sets it, the transport advances it, and the head fights
// the finger. Every editor pauses for the duration of a scrub for this
// reason. `resumeAfterScrub` remembers only that WE paused, so a drag that
// starts on a paused deck leaves it paused.
~~~

### fresh

Above `const playing = typeof deck.playing === 'function' ? deck.playing() : false;`, lines 3042 to 3046 before the cut.

~~~js
// DECIDED FRESH ON EVERY DRAG, never accumulated. If a previous drag ended
// in a way that skipped `onUp` — a cancelled pointer, a lost capture — a
// sticky `true` would make the NEXT release start playback on a deck the
// reader had deliberately paused. Reported as "it starts playing sometimes
// when I move the cursor". Assigning rather than OR-ing is the whole fix.
~~~

### drag-mode

Above `dragMode = e.shiftKey || e.button === 1 ? 'pan' : 'seek';`, lines 3063 to 3065 before the cut.

~~~js
// shift-drag PANS (and disengages follow); plain drag SEEKS — control is
// the display, and the drag guard is jam.html's, the only one of the five
// that had one.
~~~

### gesture-event

Above `const onGesture = (e) => e.preventDefault();`, lines 3107 to 3109 before the cut.

~~~js
// iOS Safari still ships its own pinch (`gesturestart`) alongside the
// standard pointer stream; without this the page zooms and our pinch never
// gets its second pointer. Harmless everywhere else — nothing else fires it.
~~~

### repaint

Above `function loop() {`, lines 3128 to 3145 before the cut.

~~~js
// -- the loop --------------------------------------------------------------
// The strip owns no transport tick. It repaints when the deck moves or when
// something it drew changed, never on a timer of its own.
//
// 🔴 AN ARMED WALL IS SOMETHING IT DREW THAT CHANGED, AND THIS ASKED
// `deck.playing()` AS WELL UNTIL 2026-09-18. A wall cursor is a REAL TIME
// cursor: once armed it moves whether or not a deck is playing, so gating its
// repaint on the deck froze a clock on screen at a time that was no longer
// the time. Nobody had met it, because the three pages that arm a wall all
// arm it on play.
// ⚠️ `/stage/` IS WHERE IT BITES. It arms the wall at the RECORDER's start to
// follow the write head, with nothing playing at all: the deck sits at 0, so
// the old condition was false on every frame, the strip never redrew, and
// `followTick` never ran. A live show's strip would have stood still while
// its own rows arrived, and every part of it would have looked correct.
// ⚠️ THE COST IS A REPAINT A FRAME FOR AS LONG AS A WALL IS ARMED, and the
// way out is `disarmWall()`, which exists for this. A page whose wall has
// stopped meaning anything should put it away rather than keep a stale one.
~~~

### lanes

Above `lanes: () => S.lanes,`, lines 3172 to 3173 before the cut.

~~~js
/** the lane declarations — QUERIES; replace them and the picture changes
 *  without a row moving anywhere */
~~~

### set-active

Above `setActive(ids) {`, lines 3177 to 3189 before the cut.

~~~js
/**
 * WHICH LANES ARE ACTIVE RIGHT NOW. Asked 2026-10-12 on
 * /typist/score/: *"dim lanes in timeline that are not active
 * (depends num of typist)"*. `setActive(['a', 'b'])` leaves those two at
 * full strength and dims every other lane, its marks AND its gutter, by
 * the theme's `off` (the kit's `--ctl-off`, the same number a switched off
 * control's furniture dims by). `setActive(null)` makes every lane active
 * again. A lane may also be declared `active: false` in `setLanes`.
 * ⚠️ DIMMED, NEVER HIDDEN. The lane keeps its row, its marks and its
 * hover, because "not in play right now" is a different claim from "not
 * there"; `show(id, false)` is the one that removes a lane.
 * Returns the ids that are active.
 */
~~~

### set-certainty

Above `setCertainty(c) {`, lines 3214 to 3216 before the cut.

~~~js
/** U3's knob on the picture. 'necessary' does NOT hide the rows it cannot
 *  answer for — it GHOSTS them, because a query that silently drops what it
 *  cannot decide is the failure mode the whole survey found. */
~~~

### span-states

Above `spanStates(id) {`, lines 3222 to 3225 before the cut.

~~~js
/** THE COUNT BEHIND THE PICTURE. The three answers of `necessary` plus the
 *  crisp case, tallied over what is on screen RIGHT NOW — so the claim
 *  "22/22 rows have an empty core" is a number a test can read, and so is
 *  the fact that the tally CHANGES WITH ZOOM. */
~~~

### narrowable

Above `narrowable(id) {`, lines 3230 to 3233 before the cut.

~~~js
/** the DATA half of the ignorance affordance: which rows can be repaired,
 *  by which rule, and against which verbatim string. Vagueness is excluded
 *  by construction — offering to "resolve" a vague date is a lie about the
 *  world, not a missing feature. */
~~~

### gutter-fit

Above `gutterFit: () => S.lanes.filter((L) => L.show).map((L) => ({`, lines 3252 to 3257 before the cut.

~~~js
/** DID EVERY GUTTER LINE FIT IN ITS LANE? The drop is silent by design
 *  (a sub-line must never spill into the next lane) and the dropped line
 *  is always the LAST one, which is where a page puts its count — so
 *  "this lane is one pixel short" and "this page never had that number"
 *  look identical on the canvas. One call says which. Populated by the
 *  last draw; a lane that has not been drawn reports `lines: null`. */
~~~

### gesture-state

Above `gesture: () => ({ mode: touchGesture, pointers: touches.size, pinching: !!pinch,`..., lines 3263 to 3264 before the cut.

~~~js
/** what the fingers are currently doing — the only way a headless harness
 *  can tell a pan from a pinch from a tap without reading pixels. */
~~~

### ink-of

Above `inkOf(id, o = {}) {`, lines 3271 to 3273 before the cut.

~~~js
/** per-lane painted-pixel probe: render ONE lane alone offscreen and count.
 *  The evidence-only toggle is verified with this — a restored lane must
 *  paint exactly 0 px, not a faint one. */
~~~

### registry

Above `if (typeof globalThis !== 'undefined') (globalThis.__strips || (globalThis.__str`..., lines 3307 to 3311 before the cut.

~~~js
// A live registry of every strip on the page. A touch harness cannot reach a
// strip a client keeps in a module-scoped closure (proto/paths does), and
// "add a global to every client" is five edits to files this component does
// not own. One array, spliced on dispose, costs nothing and makes the shared
// component testable wherever it is mounted.
~~~
