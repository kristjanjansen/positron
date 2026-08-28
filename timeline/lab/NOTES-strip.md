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
`readout/invalidate/draw`, `timeToX/xToTime/tickLOD`, `inkOf/ink`, `dispose`.

Also exported as free functions, because a client with its own *projection*
(paths draws these lanes in x/y space, and again at 14×) must reuse the
styling rather than re-derive it: `strokePoly`, `styleFor`, `hatchFor`,
`HATCH`, `idToColor`, `laneInk`, `tickLOD`, `TICK_LADDER`, `formatTime`,
`aoristic`, `spansOf`, `registerRenderer`.

## 3. LANES ARE QUERIES, NOT CONTAINERS

```js
{ id, kind | kinds | filter(row),   // WHAT to ask the deck for
  label, height, show,
  as: 'ticks'|'spans'|'continuous'|'waveform'|<registered>,   // or inferred
  render(ctx, L, C),                // the declared escape hatch
  value(payload), min, max, dots,   // continuous
  phase(row), group(row), span(row), slots, slotOf(s), labels, labelOf(s),
    aggregate, stack, allSkirt,     // spans
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
The ladder runs 1 ms → 100 years (MIDI jitter → the ERR archive horizon).

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
  flanks), inner core at α 0.88 (the certain part). No `when` → the whole band
  is skirt, which §8.4.3 says is honest and needs no special case;
* **never a dash for uncertainty** (§8.4.5). Dash is spoken for by tratteggio,
  which encodes inferred *payload* — a different axis. If the edge is soft, the
  edge moves;
* an unterminated span (a recording still running) is drawn to the window edge
  with a **feathered** right edge, not a hard one;
* `lane.aggregate` draws the §8.4.2 **aoristic sum as HEIGHT** (height does not
  clip the way `globalAlpha = min(0.4, …)` did in proto/megatimeline): one bin
  per **pixel column**, each item contributing total mass 1 spread as
  `1/(b−a)`. `aoristic()` returns `{mass, n, norm, max, colMs}` — `n` is the
  overlapping-period count per column, `norm = mass/n`, so a caller who wants
  the mean divides instead of clipping. Verified: one fully-visible span sums
  to exactly 1.000000.

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
* **`when.kind` edge treatment** (§8.4.4): `'ignorance'` → hard edges + a
  "narrow this" affordance; `'vagueness'` → feathered edges and *no* affordance.
  `spansOf` carries `when.kind` through to the hover detail; the renderer does
  not yet vary the edge by it. Waiting on the `when` sibling to land.
* **`score.mjs` marks** are not a lane kind yet.
* Keyboard nudge, selection/range brush, and a minimap are absent by choice.

## 10. Degradations, stated

* `when` had **not landed** in `timeline/transport.mjs` when this was written.
  The two-tone ambiguation is implemented and reachable (`payload.when`,
  `lane.span(row).when`) and unit-checked against a synthetic row, but no
  shipped client feeds it yet, so every span in both adoptions renders as
  **all-skirt** — which §8.4.3 says is the honest reading, not a placeholder.
* `deck.driftStats()` is on the *scheduler*, not the deck; the readout reaches
  it via `deck.sched.driftStats()` and would prefer it promoted.
* `sampleAt` on a *derived* lane has no adapter, so the continuous renderer's
  edge samples return null there and the polyline starts at the first visible
  row rather than the window edge. Cosmetic at any useful zoom.
