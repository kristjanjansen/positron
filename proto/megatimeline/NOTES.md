# megatimeline — working notes (2026-08-27)

Checkpoint log for the MEGATIMELINE v0 build (plan-megatimeline.md). Port 8892.
Basis: EKA lineage viewport (sitemap-vis viewport.ts + input/gesture.ts, lifted
to plain .mjs, zx/zy split), remixer's search-proxy pattern, census-backed
decades view, virtualized DOM <img> thumbnail cards.

## Step 0 — API probe (4 requests total, spaced) ✅ measured

- Search hit thumbnail field found: **`photoUrl`** — RELATIVE path
  (`thumbnails/1965/ERR-Fototeek-00053174_THUMB.jpg`), host is
  **`https://arhiiv-images.err.ee/`** → 200 image/jpeg (34 kB for a photo
  THUMB). Video hits carry it too (`thumbnails/1965/19650000_AKALG_XHD_..._
  20240106072955.jpg`). Audio hits: `photoUrl: ""` (empty).
- Audio search hit `waveform` is a **JSON-stringified array as a string**
  (`"[5, 6, 4, ...]"`, ~100 samples, small ints) → JSON.parse it. Video/photo
  hits: `waveform: ""`.
- **Census shortcut discovered**: every search response's `activeList` carries
  `audioCount`, `videoCount` AND `photoCount` for the time-filtered query
  regardless of the `type` queried (1965 probe with type:video returned
  543/298/11 — all three match known numbers). → census needs **one request
  per year, not three**: ~119 requests ≈ 2.2 min at 1.1 s spacing.
- Photo hits have `archiveType: "foto"` (Estonian) while group `type` is
  `"photo"`; photo item page path on the site is `/foto/{slug}`.
- Photo slug pattern: `{series-ish}-{fileId}` (e.g. `ants-varavas-133720`).

## Step 1 — lift the viewport ✅

- `viewport.mjs`: sitemap-vis viewport.ts, de-typed; scale split into
  **zx (time axis) / zy (fixed 1 in v0)**; world x unit = DAYS since unix
  epoch (float64, negatives fine — 1908 ≈ day −22600). Clamps
  MIN_ZX=0.012 px/day (whole 1908–2026 fits ~800 px) … MAX_ZX=480 px/day
  (one day ≈ 480 px) → ~40000× range. fitRect/animateFitRect fit X and only
  clamp-pan Y (track heights are screen-fixed). All layout math float64
  CPU-side, canvas draws camera-relative.
- `gesture.mjs`: sitemap-vis gesture.ts de-typed; pan x free / y clamped to
  track area; pinch (2-pointer) → zx only; wheel: ctrlKey (trackpad pinch)
  → strong zoom, deltaX-dominant (trackpad two-finger horizontal) → pan,
  plain wheel → zoom-about-cursor (timeline, not a board). Inertia kept,
  x-only.

## Step 2 — census ✅ run for real (2026-08-27)

- `census.mjs`: one POST /search per year 1908–2026 (limit 1, type 'all'),
  direct upstream (node-side, no CORS), 1.1 s spacing, UA
  elektron-megatimeline-proto/0.1. Resumable: skips years already in
  census.json, rewrites the file (atomic tmp+rename) after every year.
- **Run: 119/119 years, 119 requests, ~2.3 min, zero errors** → census.json.
- Whole-archive totals (per-type count sums over all years):
  **audio 133,718 · video 79,422 · photo 234,478** (sum 447,618).
- Shape: audio starts 1908 (1 item/year at first), **video's first year is
  1958 (6 items; 0 anywhere 1908–1957** — the honest pre-1958 empty video
  track). 1965 = 543/298/11, matching the remixer research exactly.
  Peaks: audio 2020 (6,808), video 2023 (2,980), photo 1969 (10,000 — see
  cap below).
- **Payload surprise: count fields saturate at exactly 10,000.** photoCount
  reads 10000 for 1969, 2023 and 2024 — an Elasticsearch-style
  track-total-hits cap; treat any 10000 as "10,000+". Totals above are
  therefore lower bounds (photo especially).
- Boundary caveat carried over from remixer: year ranges queried in UTC leak
  ±2–3 h at edges (EET local-midnight epochs) — census counts inherit that
  smear; irrelevant at histogram scale.

## Step 3 — server + surface ✅ built

- `server.mjs` (:8892): static + POST /api/search proxy (remixer's preflight
  fix, 1 s serialized upstream gate) **with JSONL response cache**
  (search-cache.jsonl, keyed by canonical queryParams) + GET
  /api/item/{type}/{slug} (content GET, cached in items-cache.jsonl, same
  shared gate) + GET /api/stats (upstream request counter — the politeness
  proof) + POST /report sink. Nothing media-shaped passes through; thumbs
  go straight from arhiiv-images.err.ee via plain <img>.
- `index.html`: three tracks (video/audio/photo, fixed heights); canvas field
  layer (histogram/ticks/bands/waveform strips, redrawn per frame,
  camera-relative float64); virtualized DOM <img> card layer (mount on
  150 ms settle, container-transform during gestures, re-layout on settle,
  LRU cap 300); DOM ruler (decades→years→months→days adaptive ticks),
  hover card (title/honest badge/duration/type; 600 ms dwell = gated
  content fetch), double-click year label → animateFitRect(year).
  Precision decode: heuristic from search-hit date (07-15 ⇒ year band,
  day-15 ⇒ month band) upgraded from cached content records (audio
  month:null ⇒ year-only; video needs Eetrikuupäev/Esmaeeter day evidence).
  Click: audio/video → remixer `?play={type}:{slug}` (port 8891), photo →
  arhiiv.err.ee/foto/{slug}. Tier thresholds (zx px/day): <0.11 decades,
  0.11–2 years (page 1 per type per visible year, center-out, settle-gated),
  ≥2 months/days (thumbnail cards + waveform strips; more pages up to 5).
- `?play=` support added to proto/remixer/index.html (~20 lines, boot-time:
  parse type:slug → content fetch → first free layer, autoplay attempted —
  browser policy may hold it until first click in the tab).

## Step 4 — headless verify ✅ (autotest.mjs, ONE headless Chrome via CDP)

Two runs, all 5 asserts green both times ({censusLoaded, thumbLoaded,
cardsWithinCap, apiBudget, consoleClean}):

- **Flight (5 s scripted zoom, decades → one month of 1965)**: 602–603
  frames, **rAF delta p50 8.3 ms · p95 9.7–9.8 ms · max 10.4 ms** (headless
  runs unthrottled ≈120 fps; zero long frames across a ~140× zoom sweep).
- **Dive into 1965** (year-fit, zx 4.16 → days tier): 36 thumbnail cards
  mounted, **36/36 imgs naturalWidth>0**, 809 items client-side (500 audio
  page-capped + 298 video + 11 photo). Deep dive (Q1 1965, zx 16.9): 44
  cards, zero additional API calls (all client-cached).
- **Tile-mount latency after settle**: mount pass 0.8–2.7 ms for 33–36 new
  cards; **settle → first thumbnail pixel 12 ms** (warm HTTP cache; cold
  thumbs stream in async behind it — run 1 logged 66 img-load events).
- **Politeness proof**: run 1 = **9 upstream search requests total** (exactly
  1965's pages: 5 audio + 3 video + 1 photo; census pre-cached, content GETs
  0). Run 2 = **0 upstream** — all 9 pages from search-cache.jsonl. ≤ 15 ✅.
- Zero console errors/exceptions both runs. Screenshots:
  autotest-decades.png (3 histograms, video honestly empty pre-1958, 1969
  photo spike visible), autotest-1965.png (2-lane video film strip of real
  chronicle thumbs, waveform-strip field on audio, month-band smears).
- /api/item cache verified separately: miss → upstream (X-Cache: miss),
  second GET → X-Cache: hit, stats {upstreamContent:1, cacheHitItem:1}.
- **?play= handoff verified** (one headless Chrome against remixer :8891):
  `?play=video:ak-filmikroonika-…-kohtla-jarvel` → item into layer V1, real
  title resolved from content record, currentTime 8.15 s / 203 frames at the
  9 s mark, 0 errors, year dial followed to 1965.
- Cleanup after every run: Chrome closed, servers killed, 8891/8892 freed.

## Files

viewport.mjs, gesture.mjs (the lift), census.mjs + census.json (committed
cache), server.mjs (:8892), index.html (the surface), autotest.mjs +
autotest-report.json + autotest-decades.png + autotest-1965.png (evidence),
search-cache.jsonl + items-cache.jsonl (local politeness caches).
proto/remixer/index.html gained the ?play= boot path (~25 lines).
