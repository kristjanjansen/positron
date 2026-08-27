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
  fine in <img>, taints canvas, and WebGL refuses tainted uploads. Canvas
  rendering therefore REQUIRES the image proxy (workshop
  server/api/image-proxy.get.ts is the production-grade reference with
  loopback blocking; visualia's proxyResolver + vite/media-proxy.ts is the
  seam pattern). Proxy caches aggressively (2-day upstream cache headers) —
  politeness preserved.
- Item = the timeline's Span: `{at: airdate (midnight — time-of-day is
  DERIVED), dur: Kestus, precision, mediaRef: {type, slug}, provenance}`.

## 2. Renderer decision — hand-rolled 2D-canvas field + DOM furniture

Assessed: visualia engine (WebGL2 HTML-in-canvas), sitemap-vis,
eka-web-structure, time/demo strips. **Verdict: steal from visualia, don't
build on it.** The engine's five disqualifiers, in order:

1. ContentLayer mounts a live DOM wrapper for EVERY node in the doc
   (content-layer.ts:56-78) — 43k thumbnails = 43k live divs; fixing it
   rewrites the engine's central contract.
2. One draw call per textured node, no atlas (passes/content.ts:57-72) —
   thousands of visible thumbs at decade zoom is exactly the case it can't do.
3. The GL path needs Chrome flags (#canvas-draw-element); everyone else falls
   back to DOM. A flag-gated fast path is a non-starter.
4. Zoom is a single isotropic scalar baked into the shaders — a timeline needs
   x-zoom with fixed track heights.
5. MIN_Z/MAX_Z give 400× range; we need ~5000× (plus a CPU-side
   camera-relative rebase: float32 world coords jitter ~0.5 px at day zoom).

**Lift list (wholesale, with file refs):**
- `visualia/packages/engine/src/camera/camera.ts` (64 lines) — split z into
  zx/zy, widen clamps; `camera-anim.ts` (fly-to); `input/wheel.ts` (the
  trackpad-vs-mouse zoom coefficients are hard-won tuning).
- `sitemap-vis/src/input/gesture.ts` (202 lines) — snapshot pointer + pinch.
- `texture-cache.ts` budget+LRU-protect-visible pattern → the thumbnail cache.
- `renderer.ts contentAlpha` + eka-sitemap's z-threshold class switching —
  cross-fade-don't-pop LOD discipline.
- **Back pocket**: RectsPass instanced SDF rects (+ its shaders) as the WebGL
  escape hatch IF 2D canvas tops out — it maps perfectly onto smears/bands/
  ticks. Escalate only on measured jank.
- DOM stays for furniture: axis ruler, track labels, hover cards, scrubber
  (the eka-web-structure/sitemap-vis convergence: canvas field, DOM chrome).

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

- **v0 (~1 week)**: lifted camera/gestures/wheel + time→x layout; census
  histogram (run once, commit the JSON); year/month tiers with thumbnails via
  a cache-backed image proxy (extend the remixer's server.mjs); waveform
  strips; DOM furniture; precision bands. Proof: smooth 1908→2026 flight,
  decade→day dive into 1965, thumbs loading lazily, zero API hammering.
- **v1**: click-to-remixer handoff; series/query tracks; aggregation smears
  pre-rendered per tier; elektron's own shows as a track (the archive and the
  live platform on ONE surface — the §−1 continuum made visible).
- **v2 (only on measured jank)**: RectsPass WebGL port for bands/ticks;
  thumbnail atlas.

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
