# NOTES-strip — `timeline/strip.mjs`, the strip visualizer (2026-08-28)

Promised in plan-timeline §0/§6 from the beginning ("rebuilt four times; build
it once as a component"). By the time it was written it had been hand-drawn
**five** times and none of the five agreed. Built by mining those five plus the
two research files that settle the open questions; proved by **adoption** in
two clients, not by new tests.

## 1. What each of the five contributed

| client | its strip | what the component took |
| --- | --- | --- |
| `proto/jam/jam.html` (~37 lines) | a native `<input type=range>`, no marks at all | the **drag guard** — the only one of the five that had one |
| `proto/selfrec/replay-grid.html` (~62) | cue ticks + span bars, percent-of-range, a hardcoded 2000 ms lead-in | **cue ticks that latch behind the playhead and un-latch on rewind** (`lane.latch`), span-bars-as-presence |
| `proto/instrument/play.js` (~105) | two lanes that are *pitch* axes, one audible one not, percent-of-range reimplemented, a *different* hardcoded lead-in (250 ms) | the **per-lane label gutter stating the lane's own clock**, and **`caps.audible === false` → "silent"** in that gutter |
| `proto/remixer/compose.html` (~64) | absolutely-positioned `<div>`s in percent of a fixed `ARR_END`; a nested box with its own inner percent mapping; **the quotation span was never drawn** | span lanes, the nested-deck lane, `payload.ref`/`tag`/`lane` as default pairing keys |
| `proto/paths/paths.js` (~32 of shareable machinery) | the richest: four overlaid lanes, stepped lineWidth/alpha, tier-driven hatching, a 14× inset, an evidence-only toggle | **draw-order-is-fidelity-order**, `hatchFor(tier)`, `styleFor(deck,kind)`, `strokePoly`, the **offscreen per-lane ink probe** |

Cross-cutting failure in all five: **none drew a time tick or a tick label**;
two independently reimplemented the identical `frac = (pos-r0)/(r1-r0)` +
`calc(…% - 1px)` playhead with *different* hardcoded lead-ins.

## 2. The API

```js
import { createStrip } from '/timeline/strip.mjs';

const strip = createStrip(canvas, deck, {
  lanes: [...], view: {originTime, pxPerSecond, scrollX},
  evidence, follow, gutter, hud, absolute,
  onSeek, onHover, onFollowChange, deckPolicy,
});
```

Returns: `setLanes/lanes/show`, `view/setView/fit/zoomAt/zoomIn/zoomOut`,
`setFollow/follow`, `armWall/wallPos/gapMs`, `setEvidence/evidence`,
`setCertainty/certainty`, `spanStates(id)`, `narrowable(id)`,
`aggregateStat(id)`, `readout/invalidate/draw`, `timeToX/xToTime/tickLOD`,
`inkOf(id, {mode})`/`ink`, `dispose`.

Also exported as free functions, because a client with its own *projection*
(paths draws these lanes in x/y space, and again at 14×) must reuse the
styling rather than re-derive it: `strokePoly`, `styleFor`, `hatchFor`,
`HATCH`, `idToColor`, `laneInk`, `tickLOD`, `TICK_LADDER`, `formatTime`,
`aoristic`, `spansOf`, `whenState`, `ulpMs`, `zoomCeilingPps`, `DATE_WALL_MS`,
`registerRenderer`.

## 3. LANES ARE QUERIES, NOT CONTAINERS

```js
{ id, kind | kinds | filter(row),   // WHAT to ask the deck for
  label, height, show,
  as: 'ticks'|'spans'|'continuous'|'waveform'|<registered>,   // or inferred
  render(ctx, L, C),                // the declared escape hatch
  value(payload), min, max, dots,   // continuous
  phase(row), group(row), span(row), slots, slotOf(s), labels, labelOf(s),
    aggregate, aggregateColor, aggregateLegend, rug, bars, narrowable,
    stack, allSkirt,                // spans
  peaks(row), durOf(row),           // waveform
  latch, firedColor,                // ticks
  color, width, alpha, dash }
```

No client ever pushes a row into a lane. Every frame the strip calls
`deck.window(kind, t0, t1, {evidence})` inside the visible range. Three
consequences fall out for free:

1. **the evidence-only toggle is not a filter this component applies** — it is
   a question the deck answers. `strip.setEvidence('attested')` and the deck
   *refuses to serve* the derived lanes; they paint 0 px because there is
   nothing to paint, not because a layer was hidden;
2. rows carrying `provenance` are hatched at their own `tier` (§5b tratteggio);
3. **draw order is fidelity order** — a higher-tier lane goes down first, wider
   and fainter, so attested material reads *on top* of what was invented for it
   (proto/paths' legibility trick, generalised).

`as` is *inferred* when omitted: `deck.caps(kind).continuous` → polyline,
rows carrying `phase`/`when`/`durMs` → spans, `peaks` → waveform, else ticks.
The client is not made to repeat what the adapter already declared. Probed
once, cached — not once a frame.

**Span pairing**, three shapes in priority order, each degrading into the next:
`payload.when` (the uncertainty sibling's `{outerFrom, innerFrom, innerTo,
outerTo, kind}`) → `lane.span(row)` → `phase: enter/exit` keyed by
`payload.lane ?? tag ?? ref ?? id`, which is the convention already in
compose, replay-grid and nested.mjs, so those pair with **zero configuration**.
A lane may also *declare* its pairing (`lane.phase(row)`): a MIDI note-on/off
is a span but nothing in the log says `phase`.

## 4. THE VIEW WINDOW, done properly this once

> "the view-window model is the unsolved wall in ALL generations: 5000 px / 10 s
> / 30 s hardcoded ceilings in four repos, fit-to-content computed and never
> wired twice, no zoom anywhere, tick density hardcoded at two scales"
> — research/timeline-own-prior-art-2026-08.md §4

```js
x(t)  = (t - originTime)/1000 * pxPerSecond - scrollX     // content px
t(px) = originTime + (px + scrollX)/pxPerSecond * 1000
```

The gutter is a `translate`, not part of the mapping, so no renderer knows it
exists. **Virtualized draw** is not an optimisation bolted on: the lane query
*is* `deck.window(kind, xToTime(0), xToTime(width))`, which binary-searches the
lane, and the axis loop runs from `ceil(t0/minor)*minor` to `t1`. A 40-year
archive and a 200 ms MIDI phrase cost the same. Span lanes must pair before
they can virtualize, so they query the whole lane once, cache keyed on
`(rangeGen, evidence)`, and virtualize the *draw*.

Continuous lanes have two regimes chosen by density, so there is no ceiling at
either end: ≤2 rows per pixel column → the attested rows themselves plus
`deck.sampleAt` at both window edges so the line reaches them; denser → a
per-column **min/max envelope** over the real rows, the only non-aliasing
answer, one pass.

## 5. TICK LOD — the thing all five hardcoded

A pure function of `pxPerSecond`. **Major first** (the labelled interval must
clear a label's width — that is the only hard constraint), then the smallest
minor that clears 7 px *and divides* the major so the minors never crawl out
from under the labels; if nothing divides it, the smallest that clears.

Picking minor first and hunting a multiple of it — the obvious order — strands
the calendar ladder: a year is not a whole number of 91-day steps, so the
search never reaches year ticks. That bug was found and fixed by the table
below, which is the acceptance test:

| px/s | minor px | major px | major/minor | label |
| --- | --- | --- | --- | --- |
| 1e-7 | 15.8 | 78.9 | 5 | `75y` / a date |
| 1e-5 | 12.1 | 78.6 | 6.5 | `273d` |
| 1e-3 | 7.2 | 86.4 | 12 | `3d` |
| 0.01 | 9.0 | 72.0 | 8 | `6:00:00` |
| 1 | 10.0 | 120.0 | 12 | `6:00` |
| 20 | 10.0 | 100.0 | 10 | `15` |
| 500 | 10.0 | 100.0 | 10 | `0.6` |
| 5000 | 10.0 | 100.0 | 10 | `0.06` |

Ten orders of magnitude, minor spacing 7–25 px, major 72–120 px, no branch.
~~The ladder runs 1 ms → 100 years~~ — **1 ms → 10 Gyr since 2026-08-30 (§12.5).
The eight rows above are bit-identical after the extension**: extra rungs above
cannot perturb a first-that-clears search, and the table was re-run to prove it
rather than reasoned about.

`absolute` (is the position domain wall-clock epoch ms, as replay-grid's is, or
0-based, as jam's is?) is a **declaration**, defaulted from
`deck.range[0] > 1e12`, not a magnitude guess — because a 60-year *relative*
ERR domain is the same magnitude as an epoch stamp.

## 6. Dual cursor, follow-mode, evidence, drift

* **Dual cursor** (§4's best idea): the transport playhead *and* a wall-clock
  line, armed on the first `play()` via `deck.transport.onState`. The gap is
  shaded across the axis and **labelled in seconds** — a gap you cannot measure
  is decoration. Never re-anchored implicitly: that would erase exactly the
  quantity it exists to show. `armWall(pos)` is the explicit re-arm.
* **Follow-mode** is a **page flip**, not a re-centre: the window stays put
  until the playhead crosses `followEdge` (0.82), then jumps once. demo9
  re-centred every frame and fought the user — the recorded failure. Any
  scroll/pan/wheel sets `userScrolled` and disengages; only `setFollow(true)`
  re-engages, and `onFollowChange` lets the client light its button.
* **Evidence** is asked of the deck (`setEvidence` forwards to
  `deck.setEvidence` unless `deckPolicy:false`, for a client that owns the
  choice itself), and `evidenceAccounting()` supplies the invented-percentage
  in the readout. The strip never computes it.
* **Drift**: `readout()` reads `deck.driftStats?.() ?? deck.sched.driftStats()`
  and p50/p95/max over the last 500 `deck.drift()` rows — the quality line that
  made the DoD-A gate legible.

## 7. Uncertainty rendering is settled, and we obey the study

research/spatiotemporal-uncertainty-2026-08.md §9.1 (Gschwandtner et al., IEEE
TVCG 2016): **ambiguation for "when / how long", gradient/density only for "how
likely at t"**. So:

* per span row: a **two-tone bar** — outer band at α 0.30 (the possible
  flanks), inner core at α 0.88 (the certain part);
* **never a dash for uncertainty** (§8.4.5). Dash is spoken for by tratteggio,
  which encodes inferred *payload* — a different axis. If the edge is soft, the
  edge moves;
* an unterminated span (a recording still running) is drawn to the window edge
  with a **feathered** right edge, not a hard one;
* `lane.aggregate` draws the §8.4.2 **aoristic sum as HEIGHT** (height does not
  clip the way `globalAlpha = min(0.4, …)` did in proto/megatimeline).

⚠️ **Everything below §12 supersedes this section where they disagree.** §7 was
written before the `when` sibling landed, and two of its sentences turned out to
be wrong in the way that matters: "no `when` → the whole band is skirt … needs
no special case" is the design that renders the only real archive we have as a
lie by omission, and the aggregate as written dropped points and open spans in
silence.

## 8. Adoption — the only proof offered

**`proto/paths`** (the richest of the five): **32 lines deleted**
(`strokePoly` 12, `HATCH` 2, `specFor` body 5, `laneInk` body 10, the `#scrub`
wiring 3). Every number held exactly — seek `0.042 / 0.032 / 0.042` px,
deviation `24.19 / 0.679 / 0.0357`, evidence-only ink `linear=0 smooth=0` with
`evidence=4690 stored=5529` untouched, **14 pass / 0 fail, 0 console errors**.
It *gained* a time axis it never had (it had an `<input type=range>`), and the
firewall is now proved in two projections by one ink probe.

**`proto/remixer/compose.html`**: **64 lines deleted** — 11 of CSS
(`.lane .arch #nestbox #childlanes .cnote .cmedia #ph #cph`), 37 of
`drawArrangement()`, 10 of playhead painting in `paint()`, 4 of click-seek, and
the 6-line open-note pairing map, which is now one `spansOf()` call over a deck
query feeding *both* the drawing and `CH.notes`. Replaced by ~35 lines of lane
declaration (of the 61 added, the rest is prose). **20/20 on
`compose-run.mjs`**, 0 console errors — and the **QUOTATION span is drawn for
the first time**, because `sess` and `quote` are both `deck-span` items and one
query draws both. The div version had no query; it drew what it was told to
draw, and nobody told it about the quotation.

## 9. What the component does NOT yet carry

* **`proto/selfrec/replay-grid`'s narrative companion** — the `#cueinfo` line
  under the strip that names the last-crossed cue and degrades to "N cues
  ahead" then "cue lane: none". `lane.latch` carries the *visual* half of that
  idea; the sentence is still the client's. It is the best small idea in the
  five and it should become `strip.narrate(laneId)`.
* **`proto/instrument`'s two lanes that are two epistemically different
  sources** — the host lane lit from what the instrument is *actually*
  sounding, the intent lane from the library's reducer, so the gap between them
  *is* the measured one-way latency and must never be averaged. The gutter now
  says `silent` for `caps.audible === false`, but a lane whose source is "the
  world" rather than "the log" has no expression.
* **jam's lazy strip** (`deckIfAny()` — with no recording the readout says "no
  recording yet" rather than showing a dead strip). The component draws an
  empty axis instead.
* ~~**`when.kind` edge treatment**~~ — BUILT, §12.3.
* **`score.mjs` marks** are not a lane kind yet.
* Keyboard nudge, selection/range brush, and a minimap are absent by choice.

## 10. Degradations, stated

* ~~`when` had **not landed**~~ — it has (transport v0.6), and the "honest
  reading" claim in this bullet was **wrong**. See §12.1.
* `deck.driftStats()` is on the *scheduler*, not the deck; the readout reaches
  it via `deck.sched.driftStats()` and would prefer it promoted.
* `sampleAt` on a *derived* lane has no adapter, so the continuous renderer's
  edge samples return null there and the polyline starts at the first visible
  row rather than the window edge. Cosmetic at any useful zoom.

## 11. Touch (2026-08-28)

`touch-action: pan-y` on the canvas is the whole contract: **the strip owns the
horizontal axis and the pinch, the page keeps the vertical one.** A vertical
swipe scrolls the page and the browser hands us a `pointercancel`, which is the
right outcome and costs no code. Nothing here calls `preventDefault` on a touch
stream. It was `none`, which is correct only for a surface that fills the
viewport (`opts.touchAction: 'none'` for those — `proto/megatimeline` is one).

Touch **defers**: press is first contact, so press-to-seek would make every
touch a destructive seek before the user had said what they wanted. The gesture
stays `undecided` until it passes the 10 px tap slop or the finger lifts —
drag ⇒ pan, lift-without-drag ⇒ tap ⇒ seek. The playhead is the one exception
(a press within `touchSlop` = 22 px of it scrubs), because it is a 1.5 px line.

Pinch zooms about the **midpoint** — the same invariant `zoomAt()` keeps for a
cursor, for two moving anchors instead of one fixed one, so a pinch that also
slides pans for free. Measured drift of the time under the midpoint across a
×3.33 zoom: **0.00 px**.

Hover gets a **sticky** tap equivalent (a finger covers what it is describing),
and `pointerleave` is ignored for touch pointers — for touch it fires the
instant the finger lifts, which erased the tap tooltip one frame after it
appeared.

`hitTest(px, py, tolPx = 6)`: the hit geometry is identical on both inputs,
only the radius differs. **Desktop precision is unchanged by definition, not by
test** — `run-paths.mjs` is still 14/14 with seek 0.042/0.032/0.042 and
deviation 24.19/0.679/0.0357.

Also: the gutter clamps to 46 px below 520 px viewport width (the one piece of
chrome that can shrink without moving a measured number); `globalThis.__strips`
is a live registry spliced on `dispose()` (a harness cannot otherwise reach a
strip a client keeps in a module closure — `proto/paths` does); `gesture()` and
`hover()` are exposed so a headless harness can tell a pan from a pinch from a
tap without reading pixels; and `gesturestart`/`gesturechange` are prevented
because iOS Safari still ships its own pinch alongside the pointer stream.

Bench + harness: `timeline/lab/strip-touch.html`,
`node timeline/lab/mobile-verify.mjs strip` — **18/18**.
**Open, for `proto/paths`' owner:** that page's CSS lays the strip canvas out
at **2 px wide** at a 390 px viewport, so the component cannot be exercised
there at all; the harness diagnoses it explicitly rather than blaming the
component. Full account in `research/mobile-2026-08.md`.

---

# 12. AMBIGUATION, THE THREE STATES, THE AGGREGATE, DEEP TIME (2026-08-30)

plan-timeline §7.9's one line was the whole brief: *"the transport can now say
what it does not know; the strip still cannot show it."* It can now. Harness:
`timeline/lab/strip-uncertainty.html` + `node timeline/lab/strip-verify.mjs`
(**32/32**, one headless Chrome, two screenshots, `strip-verify-report.json`).
Everything below carries a number produced by that run.

## 12.1 The empty core is the hard case, and it is not a styling problem

**All 22 Kurenniemi rows have `innerFrom`/`innerTo` null.** So the "saturated
certain core" of two-tone ambiguation is **empty for the entire archive** —
`spanStates()` reports `core 0` in every window we tried, at every zoom
(A5, A3). A two-tone design that draws "no core" as an *absence* therefore
renders our only real corpus as one flat tone, and §7's own sentence ("the whole
band is skirt, which is honest") was the lie: **the reader cannot tell that band
from a crisp attested span, from `allSkirt`, or from a bug.**

That was not a theory. It was in the shipped code and it is measured:

> **crisp 3,360 px / mean α 215.0 vs outer 11,456 px / mean α 104.0** — a
> 51.6 % separation *now*. Before, both fell into the renderer's single
> `else` branch at α 0.70 and were **pixel-identical in ink density**.
> (A2, `strip.inkOf(id, {mode:'both'})`.)

**The fix is not to invent a core.** It is that ambiguation *degenerates* when
the core is empty — with one tone it is not an encoding — so we fall back to the
**same study's other recommendation for the same task**. Gschwandtner et al.
recommend "ambiguation **or error bars** for judging durations and temporal
bounds". An error bar spanning the outer bracket says exactly what the row says:
*bounds known, extent within them unrecorded*. It cannot be misread as a core,
because it is not a filled region at all. Staying inside the study rather than
inventing a third mark is the point.

## 12.2 `necessary` has THREE answers, so the renderer has four states

`whenState(span, t0, t1)` — exported, pure — is a **transcription** of
transport.mjs's `certAccepts()`, not a paraphrase:

| state | when | mark |
| --- | --- | --- |
| `crisp` | no `when` at all (note-on/note-off, enter/exit) | one tone, full strength, hard edges |
| `core` | ordered inner pair → inner containment answers exactly | ambiguation: α 0.30 skirt + α 0.88 core rect |
| `outer` | no inner pair, bracket ⊆ window → **sound but incomplete** | skirt + **error bar** with caps |
| `unanswerable` | no inner pair, bracket ⊄ window → **undecidable** | **ghost**: α 0.10 fill + outline, no bar |

**A1: the strip's classifier agrees with the transport's predicate on 50/50 rows
across three windows, 0 disagreements** — asserted against
`deck.window(kind, t0, t1, {certainty:'necessary'})`, so if the two ever drift a
test fails instead of a picture lying.

**The finding worth keeping is that the third state is a property of the row AND
THE WINDOW.** On the real corpus, `spanStates('tape')`:

| window | core | outer (sound) | UNDECIDABLE | n |
| --- | --- | --- | --- | --- |
| 1930–2000 | 0 | 19 | 0 | 19 |
| 1963–1974 (the corpus range) | 0 | 19 | 0 | 19 |
| 1965 only | 0 | **2** | **12** | 14 |
| June 1965 | 0 | **0** | **11** | 11 |

Zoom out and outer containment answers "certainly in view" for every row; zoom to
a month and the same rows become undecidable. **The epistemics are a property of
the question, and on a zoomable axis the wheel is what asks it.** research §9.7
says nobody has shipped an interactive, zoomable, uncertainty-native timeline;
this is the specific thing that only exists once you have one.

`setCertainty('necessary')` therefore does **not** hide what it cannot answer —
it ghosts it (ghost mean α 46.3, **38 % of a core's density**, still 31,265 px on
the canvas) and puts the count in the quality line: `in view: 0 core · 2
outer-sound · 12 UNDECIDABLE`. A query that silently answers "no" to a question
it cannot answer is the failure mode research §9.7 found in *every* surveyed
renderer; a ghost you have to notice is not a report, so the number ships too.

## 12.3 `when.kind` — the edge IS the claim

Identical brackets, identical positions, one flag apart:

* **ignorance** — there *is* a boundary and the catalogue lost it, so the bound
  is a **fact**: hard 1 px terminators at both outer bounds, capped error bar,
  and a 4 px **"narrow this" caret**. `strip.narrowable(laneId)` is the data half
  — 20 rows on the real corpus, by rule `corpus-range@1`,
  `wikidata-precision@1`, `ia-filename-year@1`, `wikidata-title-match@1`,
  `edm-literal-length@1`, widest bracket first. The smear is a **defect record**
  and the rule names who to argue with.
* **vagueness** — there is no boundary, so a hard edge would be the
  *falsification*. Feathered band (gradient ramp, ≤22 px or 34 % of the width),
  the error bar drawn as a **fading rule with NO caps** (a capped bar would put
  hard endpoints on a concept that has none), and **zero** narrowing affordance:
  `narrowable()` returns 3/3 for ignorance and **0/3** for vagueness.

**A4, and it forced a change to the measurement instrument:** ignorance 11,152 px
/ alpha mass 1,064,559 vs vagueness 10,946 px / 971,236. **Mass differs by 8.8 %
where the pixel COUNT differs by only 1.8 %** — a feathered edge keeps almost
every pixel above `laneInk`'s 8/255 gate, so *a pixel count cannot see the
difference between a hard edge and a soft one*. Hence `laneInk(…, {mode:'sum'|
'both'})` and `inkOf(id, opts)`. This is the first claim in the repo that the
original ink probe was too blunt to close.

## 12.4 The aggregate: a STATISTIC with a stated method

`aoristic()` was already one-bin-per-pixel-column with mass `1/(b−a)`. What was
wrong was everything around it.

* **The brief's third factor does not exist.** §7.4/§9.5 read as *three*
  operations — mass `1/(b−a)`, **and** "divided by the overlapping-period count"
  (aoristAAR's `period_correction`). **Measured (B2): with one bin per pixel
  column those are the SAME operation, agreeing to `maxAbsDiff = 0` (exactly, not
  approximately) on column-aligned items.** The pixel column *is* the period; an
  item overlaps `(b−a)/colMs` of them; `1 ÷ that count` is exactly the
  `colMs/(b−a)` the weight already deposits per column. There is no third factor
  to apply, and applying one would have halved every mass twice.
* **…and the two DO diverge in one case, where `1/(b−a)` is the correct one:** a
  span half off-screen deposits **0.500000**, because the divisor is the item's
  *true* duration. Dividing by *visible* columns would have deposited 1.0 and
  invented half an item.
* `norm = mass/n` is kept, is a **different** statistic (mean mass per
  contributing item), and must **not** drive the height — dividing by the count
  deletes the count, which is the quantity a histogram is for.
* **Points were being dropped** (`!s.point && Number.isFinite(s.to)`), which made
  a crisp archive read as empty next to a smeared one. They now carry mass 1 in
  their own column. **Open spans contribute 0** — that is the arithmetic
  (`1/∞`), not a policy — and are **counted and reported** (`open`), because
  "dropped 3 open spans" and "3 spans added nothing" are the same fact and only
  one of them is visible.
* **It is drawn as a STEP, never a ramp.** The old `lineTo(i, top)` between
  column tops is a linear interpolation *across the bin boundary* — the exact
  invention PeriodO refused ("natural language is already a compact and easily
  indexable way to represent imprecision … rather than imposing an arbitrary
  mapping to parameterized curves"). Paired with a **rug of individuals**
  (§9.5, rcarbon's `barCodes`) so the silhouette can never claim a population the
  rows do not have.
* **The method is printed on the canvas** and readable as
  `strip.aggregateStat(id)`:
  `aoristic Σ 1/(b−a) · 1 bin/px (1360 cols, 21.2 d/col) · peak 0.163 · n=20`,
  and at the 1965 zoom `6.70 h/col`, `n=14`, `clipped 12`, `total 2.910` — the
  bin width follows the display, never `n` (M4's discipline).
* `bars:false` gives the aggregate **its own lane**. Individuals and a statistic
  over them are two claims and lose if they share pixels.

**`proto/megatimeline` now imports the same `aoristic()`** (its server serves
`/timeline/*` from the repo root so the page uses the shipped library, not a
copy). What it replaced, and why it was worse than "a bit off":

> `ctx.globalAlpha = Math.min(0.4, 0.05 + 0.02 * n)`
>
> **+1 per item regardless of span** (a day-precise and a decade-precise row vote
> equally) **and clipped at 0.4, saturating at n = 18** — so a year holding 20
> items and one holding 6,808 (audio 2020, from our own census) painted the
> **identical grey**. Alpha is also the wrong channel twice: it is spoken for by
> density, and it composites, so two overlapping bands read as a third value
> nobody computed.

The flat full-year band **stays** (§8.4.1) but at a **fixed** α 0.30 — it is a
*presence* mark; the count went to the sum. New autotest assert
`aoristicIsAStatistic` (every lane that summed anything reports a *fractional*
peak — a mass, which a `+1` count can never be). Megatimeline: **6/6 asserts,
0 console errors, flight p95 9.5 ms** (was 9.7), and the HUD now reads
`aoristic Σ 1/(b−a) 1 bin/px, 0.240 d/col · VIDEO n=298 peak 1.441 · AUDIO n=500
peak 2.169 · PHOTO n=11 peak 0.961 (over LOADED items only — the census bars are
the whole archive)`.

## 12.5 Deep time — and the bug was NOT the one we were told to look for

The brief said to check the arithmetic, expecting the position domain to break.
**It does break, and that is not what would have taken the tab down.**

**The measured ceiling of "absolute ms" as a position domain:**

| quantity | measured |
| --- | --- |
| integer ms exact to | `2^53` = **9.007e15 ms = 285,426.8 years** |
| ulp at a 2026 epoch stamp (1.77e12 ms) | 0.000244 ms |
| 13.8 Gyr in ms | 4.3549e20 |
| **ulp at 13.8 Gyr** | **65,536 ms = 65.536 s** (rel. err 1.50e-16) |
| `t += 1` stalls (`t+1 === t`) at | **9.313e15 ms ≈ 295.1 kyr** |
| `t += 1000` stalls at | 9.223e18 ms ≈ 292 Myr |
| JS `Date.toISOString()` wall | ±8.64e15 ms = ±273,790 y — **throws past it** |

So: **a millisecond span at the Big Bang does not exist as a number.** §7.9's
"ms spans are useless at 13.8 Gyr" is confirmed with the exact figure.

**But the failure that bites first is a draw loop, not a float.** With the ladder
stopping at 100 y, fitting 13.8 Gyr into 1400 px chose `major = 100 y` at
**1.0e-5 px**, and `drawAxis()` asked for **138,000,000 major ticks per frame**,
each a `moveTo` + `lineTo` + `fillText`, all 0.00001 px apart. That is minutes to
hours of one frame. Fixed by:

1. **more rungs, not a different projection** — `TICK_LADDER` now runs 1 ms →
   10 Gyr (200 y, 500 y, ka×5, Ma×9, Ga×4). ChronoZoom's rule, read from its
   source: *the log of the span selects the tick source; it never warps the
   axis.* 13.8 Gyr now draws **14 major ticks** and reads `-6.9 Ga`; the Cambrian
   view reads `-520.0 Ma`. **The §5 acceptance table is bit-identical** at all
   eight of its zooms — extra rungs above cannot perturb a `first-that-clears`
   search;
2. **regime-swapped labels** — unit follows the MAJOR interval (`ka`/`Ma`/`Ga`),
   so one axis reads in one unit. The old ladder printed `-6900000000y`;
3. **the axis loop is index-based (`first + i·step`) and count-bounded**
   (`MAX_TICKS = 4096`, and the clamp is *reported*). Accumulation would not
   merely drift at deep time — it **stalls**, and a stalled `for` loop is a hang;
4. **`formatTime` no longer hands a deep-time position to `Date`.** It did, and
   `new Date(-4.35e20).toISOString()` throws `RangeError` — an absolute
   deep-time deck would have taken the axis down on the first frame. Past the
   wall it degrades to the deep-time regime.

**The zoom ceiling is derived from IEEE-754, not authored per era.**
`zoomCeilingPps(t) = 1000/ulpMs(t)` — stop where one pixel is finer than one
representable step. ChronoZoom hand-writes `deeperZoomConstraints` for this; the
float gives it for free, and it says two surprising things:

* at 13.8 Gyr the ceiling is **0.0153 px/s** — 400 doublings of zoom stop dead
  and report `clamped by 'float-resolution', 1 px = 32,768 ms`. The deepest
  honest view still spans **1400 px × 65.536 s = 25.5 hours**: *you cannot zoom
  to a minute inside the Hadean, but you can zoom to a day*;
* **at a 2026 wall-clock epoch stamp the ceiling is 4.096e6 px/s, so the
  component's pre-existing hard cap of 1e7 px/s was ALREADY 2.4× past the
  double's resolution for every `absolute` deck we ship.** Nobody had zoomed
  there, so nobody had seen it.

**The verdict asked for: a documented, measured ceiling is the right answer, and
ms stays the position domain.** An offset+scale representation buys nothing a
heritage deck needs — 65.5 s of quantisation at 13.8 Gyr is 1.5e-16 relative, and
the *only* consequence is a zoom limit that is now enforced and reported rather
than silently violated. What would force a change is a deck that needs
millisecond resolution *and* a Gyr span in one position domain, which is not a
timeline, it is two.

## 12.6 What the honesty costs

Full redraw of a lane of **2,000 smeared spans** with everything on — state
classification, ambiguation, per-kind edges, feather gradients, error bars, the
aoristic sum, the rug and the per-frame state tally:
**p50 0.3 ms / p95 0.5 ms / max 0.5 ms** (200 spans: p50 0.1 ms), n=40 redraws,
1360×160 canvas, headless Chrome.
⚠️ The crisp arm in the same bench (p50 1.4 / p95 2.4 ms) is **not** a fair
comparison and must not be read as one: a phase-paired lane carries two rows per
span, so it pairs 4,000 rows through a `Map` where the smeared arm reads 2,000
frozen brackets. It is reported because omitting it would have let the first
number read as a speed-up.

Every previously measured number held exactly: **prop-test green** ·
**mobile-verify strip 18/18** (pinch midpoint drift still 0.00 px) ·
**proto/paths 14/14** with ink `evidence=4690 stored=5529 linear=17973
smooth=7203` and evidence-only `linear=0 smooth=0`, deviation
`24.19 / 0.679 / 0.0357` · **compose 20/20** · **loops 14/14** with tratteggio
ink still `294 px under 'all', 0 px under 'attested'`.

## 12.7 Seams left open, honestly

* **`certainty` is inert on a span lane's QUERY**, and the strip says so in a
  comment: span lanes ask `(−∞, ∞)` so they can pair, and every bracket is
  contained in that, so `necessary` accepts everything at query time. The strip
  re-derives the predicate per *visible window* instead. A1 exists precisely
  because that is two implementations of one rule.
* **`visibleStates()` runs per frame over the whole lane, not the visible part**
  — bounded by the same full-lane scan `spansFor()` already pays for pairing, so
  it changes no complexity class, but a million-row span lane would feel both.
  The fix, if it ever matters, is to tally during the draw (which already visits
  every drawn span and sets `s.state`) and let the readout read the tally.
* **`when` on SPANS is still absent in the transport** — a `when` row is a span,
  but a span row cannot carry a `when` for its *start* and another for its *end*.
  PlanningLines' six quantities collapse to four here. Nothing the strip can fix.
* **Competing authorities** (one `when` per row) — the deferral §7.9 calls the
  one most likely to be regretted. Two institutions dating the same tape
  differently currently means two rows, and the strip would draw them as two
  things that happened.
* **Non-contiguous brackets** (`[1667,1668,1670..1672]`) render as their hull,
  which over-claims. The renderer has no mark for "one of these, definitely not
  the others".
* **The narrowing affordance is a caret and a list, not an action.** Clicking it
  does nothing; `narrowable()` hands a client the rule and the verbatim string
  and stops there.
* **Sub-pixel deep-time rows**: at 13.8 Gyr all of recorded human history is one
  1.5 px mark (PeriodO's 1-px clamp, already in). It is honest and it is also
  unreadable; a "there is more here than you can see" mark is unbuilt.
* `strip.narrate(laneId)` (§9), `score.mjs` marks as a lane kind, keyboard nudge,
  brush and minimap — still absent, still by choice.
