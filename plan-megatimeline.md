# plan-megatimeline — the ERR archive as one scrollable surface (2026-08-27)

One zoomable canvas: x = time, 1908 → today (~5000× zoom range, decades → days);
horizontal tracks of archive material — video items as THUMBNAIL frames (from
ERR's own preview images, never parsed from video), audio as waveform strips,
photos as tiles. The strip visualizer at heritage scale; the browsing/navigation
surface over the same data the remixer performs.

Inputs: research/err-archives-2026-08.md + err-remixer-2026-08.md (data layer,
measured), the renderer assessment of ~/personal libraries (2026-08-27 agent
report, distilled in §2), plan-timeline §−1 (precision smears, Span model).

## 1. Data layer (all measured, nothing speculative)

- **Density first**: one search per year×type returns its total count → a
  1908–2026 histogram (~350 requests at the polite ≤1 req/s, run ONCE, cached
  as static JSON in-repo). This backs the whole zoomed-out view before any
  item is fetched.
- **Items on demand**: per visible year, `POST /search` (via the one-route
  preflight proxy the remixer built — OPTIONS lacks ACAO) pages of 100;
  item detail GETs only when a tile actually renders. Cache JSONL locally;
  media/thumb URLs are re-resolved by {type, slug} at play time (hash-addressed).
- **Precision decode** (remixer-corrected): audio `month:null` ⇒ year-only;
  synthesized dates are NOT reliably mid-year — trust month:null + Eetrikuupäev/
  Esmaeeter, not the date string. Store decoded `precision` + raw evidence.
- **Track epochs are real**: video begins 1958-07-11; audio reaches 1908;
  photos sparse throughout. Deep decades are waveform-and-photo territory —
  the design must not look broken pre-1958.
- **Waveforms are free**: every audio search hit ships a waveform array — an
  entire audio-track visual with zero media loads.
- **Thumbnails**: arhiiv-images.err.ee / s.err.ee serve previews with NO ACAO —
  fine in <img>, taints canvas, and WebGL refuses tainted uploads. **The EKA
  basis (§2) renders thumbs as DOM <img> — no proxy needed in v0.** The image
  proxy (workshop server/api/image-proxy.get.ts is the production reference)
  is required only if/when thumbs move onto canvas (v2 escalation).
- Item = the timeline's Span: `{at: airdate (midnight — time-of-day is
  DERIVED), dur: Kestus, precision, mediaRef: {type, slug}, provenance}`.

## 2. Renderer decision — the EKA lineage is the basis (user call 2026-08-27)

Basis: **eka-web-structure → eka-sitemap → sitemap-vis** — the user's own
DOM-cards-under-one-transform hybrid, proven three times (~2300 cards). NOT
visualia's engine (assessed and rejected: mounts a live wrapper for every doc
node, one GL draw per texture with no atlas, flag-gated fast path, isotropic
zoom baked into shaders, 400× range vs our ~5000×). Visualia contributes only
its LOD discipline and, later, spare parts (below).

**The EKA architecture, applied:**
- **Viewport**: `sitemap-vis/src/viewport.ts` (141 lines, dependency-free —
  screenToWorld, anchor-preserving zoomAt, fitRect, animateZoomAt/
  animateFitRect with easing). Split scale into zx/zy (x zooms, track heights
  fixed), widen MIN/MAX for ~5000×; keep layout math in float64 on the CPU
  and position everything camera-relative (float32 jitter guard).
- **Gestures**: `sitemap-vis/src/input/gesture.ts` (202 lines, snapshot
  pointer + pinch); wheel tuning may borrow visualia's trackpad-vs-mouse
  coefficients (input/wheel.ts) — hard-won numbers, 38 lines.
- **The hybrid split** (eka-web-structure's pattern, kept): 2D-canvas layers
  under the cards for the FIELD graphics — density histograms, precision
  bands, ticks, waveform strips (drawn from the free waveform arrays, no
  images involved, no taint) — and **DOM <img> cards for thumbnails**,
  positioned per-node with translate/scale like vis.js:597. DOM chrome for
  ruler, labels, hover cards, scrubber.
- **The one thing the EKA generations never had, added: virtualization.**
  vis.js mounts all ~2300 cards; we mount ONLY the viewport's visible set
  (plus margin), keyed off the same tile loader that fetches data — cards
  mount on camera settle, unmount when far, LRU-capped (a few hundred live
  DOM nodes max, which is where aggregation (§3) keeps us anyway).
  sitemap-vis's own constraint note applies: don't per-frame-redraw card
  content; transform a stable layer.
- **Why DOM cards win here**: no CORS proxy (ERR previews load untainted in
  <img>), free async decode + native lazy loading, and at month/day zoom the
  visible card count is dozens–hundreds — comfortably inside the EKA
  lineage's proven envelope. The known weakness (re-rasterize jank under
  CONTINUOUS zoom) is mitigated by transforming the shared layer during the
  gesture and re-laying-out on settle (the will-change promote/demote trick).
- **Escalation path (v2, only on measured jank)**: move the thumbnail field
  onto canvas behind the image proxy; visualia's texture-cache LRU pattern
  and RectsPass instanced rects are the spare parts shelf.

## 3. Zoom semantics — aggregation IS the scaling strategy

The renderer never gets faster than the data gets smaller. Tiers:

| zoom | x-scale | what renders |
|---|---|---|
| decades | centuries in view | density histogram bars per track (from the cached census) — zero images |
| years | ~5–20 y | item ticks + precision bands; first sparse thumbs on dense clusters |
| months | 1–3 y | thumbnail rows (LRU-cached via proxy), waveform strips, photo tiles |
| days | weeks in view | full thumbs + titles + duration bars; precision smears at true width |

Precision rendering (the §−1 smear, already prototyped in the remixer badges):
day = tick at position; month-only = month-wide band; year-only = faint
full-year band. Never a fake instant.

Tile loader keyed `(track, timeBucket, tier)`; loads on camera settle
(150 ms debounce, the engine's own hysteresis discipline); evicts LRU but
protects the visible set; API gate stays ≤1 req/s with the local JSONL cache
absorbing revisits.

## 4. Tracks are queries (the plan-timeline doctrine, applied)

v0 tracks: video / audio / photo. But a track = a saved query over spans —
by series ("AK" newsreels), by keyword, by performer — the same window()
semantics the timeline library defines. The megatimeline is the first client
that makes "tracks are queries, not containers" visibly true at archive scale.

## 5. Interactions

- Wheel/pinch = x-zoom about cursor; drag = pan; double-click year label =
  fitTarget(year). Fly-to via camera-anim.
- Hover = DOM card (title, honest date badge, duration, provenance line).
- **Click = play**: hand the span to the remixer's layer rack (proto/remixer) —
  megatimeline navigates, remixer performs. Same {type, slug} handoff.
- Later: drag a region → "chord from this window" (year chords generalized to
  any time window); a Radio Tallinn programme is a curated path through this
  surface.

## 6. Phases

- **v0 (~1 week)**: sitemap-vis viewport+gestures lifted (zx/zy split) +
  time→x layout; census histogram (run once, commit the JSON); canvas field
  layers (histogram/bands/ticks/waveforms) + virtualized DOM <img> thumbnail
  cards — no proxy needed; DOM furniture; precision bands. Proof: smooth
  1908→2026 flight, decade→day dive into 1965, thumbs loading lazily, zero
  API hammering.
- **v1**: click-to-remixer handoff; series/query tracks; aggregation smears
  pre-rendered per tier; elektron's own shows as a track (the archive and the
  live platform on ONE surface — the §−1 continuum made visible).
- **v2 (only on measured jank)**: thumbnail field onto canvas behind the
  image proxy; visualia RectsPass/texture-cache as spare parts.

## 7. Boundaries

- Politeness is architectural: census cached forever, items cached locally,
  proxy caches images, ≤1 req/s everywhere. Nothing bulk-copied — streaming
  and linking is the blessed category; a public deployment triggers the
  license conversation (research doc §Terms) which also supplies per-span
  rights fields.
- No video parsing, no frame extraction — previews only (the user's rule; it
  also keeps us inside ERR's copies-vs-links line).
- The megatimeline reads spans; it never writes the archive. Authoring
  (curated paths, programmes) is score territory (C10), not this surface.
