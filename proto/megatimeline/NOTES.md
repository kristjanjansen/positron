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

## Step 5 — QUERY TRACKS: series lanes (plan §4 pulled into v0) ✅ (2026-08-27)

The "tracks are queries" doctrine made visible: at years/days tiers a
**series view** replaces the three type tracks with lanes derived from the
loaded items' series nav links (search hits carry
`navigationLinks[{type:'series'}]` — measured; audio-only `seriesTitle` lives
in content records, the nav link is on every hit type). Zero new data layer:
lanes group what the tile loader already fetched.

- **Design calls**: REPLACE not nest (vertical space at year zoom is scarce;
  item TYPE stays legible as color — amber video ticks/cards, teal waveforms,
  violet photos — so a series lane shows its media mix for free). Adaptive
  lane heights: 104 px lanes with thumbnails, 72 px audio-only (SL_* consts);
  type view keeps the v0 constants byte-identical. Decades tier UNCHANGED in
  either view — census has no series dimension (honest absence; furniture
  says so when series view is zoomed out).
- **Derivation**: on SETTLE only (no pan-frame churn) — group visible years'
  loaded items by series name, top 7 by count become lanes, everything else
  (incl. series-less items) pools into "muu / other", cached by
  `(years, dataVersion)` key. `layoutLanes()` is the one signature-cached
  lane-geometry source draw/mountCards/furniture/panel all read; per-lane
  geom object parameterizes tick rows/bands/waveform strips/card rows so both
  views share one render path.
- **Track panel** (DOM, top-right, collapsible): master switch liigid/seeriad
  + per-lane checkboxes with counts. Hidden state keyed by lane name in a
  Set — survives zoom/re-derive; hidden named series vanish (not into muu).
- **Verified headless** (autotest-series.mjs, ONE Chrome via CDP, 2 runs all
  11 asserts green): 1965 series view = **8 lanes, 809 items routed** — AK
  filmikroonika 282 · Päevakaja 95 · Kuuldemäng 43 · Head und, mudilased! 37 ·
  Soomekeelne saade 24 · Kristall 19 · Näitlejad esitavad oma lemmikteoseid
  10 · muu/other 299. **Upstream ERR calls: 0** (all 9 pages from
  search-cache.jsonl — the politeness architecture paying out). Series-view
  zoom flight **p50 8.3 ms · p95 9.2 · max 10.3** — identical to the type-view
  baseline (lane routing is one Map get per item per frame). Cards 27 ≤ 300
  cap; console clean; toggle hide→zoom→persists→restore + view round-trip
  asserted. Screenshot: autotest-1965-series.png.
- Original autotest.mjs re-run after the refactor: all 5 asserts still green,
  p50 8.3 (type view unregressed), 0 upstream.
- Hover card now shows the series name; muu lane draws its waveform strips
  faint under the DOM cards (mixed-lane compromise, fine for a catch-all).

## Files

viewport.mjs, gesture.mjs (the lift), census.mjs + census.json (committed
cache), server.mjs (:8892), index.html (the surface; step 5 added series
lanes/panel/unified lane layout), autotest.mjs + autotest-report.json +
autotest-decades.png + autotest-1965.png (evidence), autotest-series.mjs +
autotest-series-report.json + autotest-1965-series.png (query-tracks
evidence), search-cache.jsonl + items-cache.jsonl (local politeness caches).
proto/remixer/index.html gained the ?play= boot path (~25 lines).

## Mobile (2026-08-28)

No viewport meta ⇒ 980 px layout; `height: 100%` ⇒ the bottom of an `inset:0`
app sat under Safari's URL bar; year labels were 29x17 tap targets; the panel
was a 280 px column over a 360 px screen; and the hover card — with its 600 ms
dwell-gated content fetch — was **unreachable with a finger**, while a tap went
straight to opening a new tab.

Fixed: `width=device-width` + `viewport-fit=cover`; `100dvh` plus
`visualViewport` `resize`/`scroll` listeners (iOS changes the visible viewport
*without* firing `resize` when the URL bar slides away); a 46 px ruler under
`@media (pointer: coarse)` so a year is a 44 px target; the track panel becomes
a bottom sheet that starts **closed**; and on a coarse pointer the first tap
shows the card — with a real 44 px OPEN button in it — instead of navigating.
Canvas `hitRects` are grown by 12 px of finger slop; double-tap-to-dive on the
ruler is owned explicitly rather than left to Chrome's synthesized `dblclick`,
which it declines to emit exactly when `touch-action: none` is in play.
`#stage` **keeps** `touch-action: none` — correct here and only here, because
this surface fills the viewport and has no page scroll to protect (the shared
`timeline/strip.mjs`, which lives inside scrolling pages, declares `pan-y`).

Every touch affordance is inside one `@media (pointer: coarse)` block, so a
desktop mouse never sees a byte of it: `autotest.mjs` passes with all asserts
green and **upstreamTotal = 0** (zero ERR calls). Two traps worth remembering:
`const COARSE = matchMedia(...).matches` read once at boot is **wrong** (a
listener re-applies it now — see `applyCoarse()`), and `applyCoarse()` must be
called **last** in the module, because it reaches into `hideHover()` and a
`let` further down is in its temporal dead zone — calling it early aborted the
whole module and every symbol after the throw silently never existed.

`node timeline/lab/mobile-verify.mjs megatimeline` — 11/11.
Screenshot: `results/mobile/megatimeline-390x844.png`.
