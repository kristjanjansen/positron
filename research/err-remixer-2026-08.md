# ERR archive remixer — the year-chord instrument, measured (2026-08-27)

Addendum to research/err-archives-2026-08.md: the "historic year chords /
blend visuals from year X" instrument built and verified as proto/remixer/
(port 8891, plain node ESM + static HTML, hls.js 1.7.1 vendored from flipper).
Marks: ✅ measured here, 📄 from ERR docs, ⚠️ inferred/untested. Respect
discipline held: one shared ≥1 s gate over ALL archive API calls, pages of 20,
6 items played per autotest run, media streamed from vod.err.ee only.

## Verdict ✅

**The historic year chord is real.** 3 parallel 1965 audio streams + 1 video
layer, all HLS from vod.err.ee, armed sequentially (the 1/s API gate) and
started in a single `play()` tick: **start-together spread 0–43 ms** (50 ms
measurement resolution), all layers' `currentTime` advancing for the full 30 s
window, video at ~24.7 fps real presented frames (740 rVFC frames / 30 s),
**zero media errors, zero 403s, zero geo-fails** across three full runs. The
cross-decade split also works: 1958 film chronicle picture under 1965 audio,
both playing (headless verdict `{p1ok, p2ok, mediaErrorFree} = all true`).

## Measured numbers (final run, headless Chrome 151) ✅

| item (slug) | type | format | api ms | buf ms | ttff ms | played 30s/15s | badge |
|---|---|---|---|---|---|---|---|
| allmaasaalides | audio | HLS | 218 | 266 | 40 | ✅ 30.9 s | 1965-08-29 (day) |
| branislav-nusic-jumalik-komoodia | audio | HLS | 938 | 13 | 40 | ✅ 30.9 s | 1965-10-31 (day) |
| arkadi-avertsenko-professionaali-mured | audio | HLS | 1001 | 169 | 40 | ✅ 30.9 s | **1965 (year-only)** |
| ak-…-1-mai-demonstratsioon-kohtla-jarvel | video | HLS | 864 | 302 | 325 | ✅ 740 f | 1965-05-01 (day) |
| ak-…-2-uliopilaslaulupidu-riias (P2) | video | HLS | 62 | 123 | 149 | ✅ 395 f/16 s | 1958-07-11 (day) |
| 20-aastat-tagasi-paevakaja-erisaade (P2) | audio | HLS | 1027 | 136 | 171 | ✅ 14.9 s | 1965-04-20 (day) |

- api = content GET (gate wait included where queued; raw upstream 60–220 ms);
  buf = attach→canplay; ttff = play→currentTime advancing (chord items) or
  attach→advancing (solo). Format mix encountered: **100 % HLS** (audio =
  single-variant 64 kbps AAC .m4a masters, video = hash-addressed
  /hls/vod/{hash}/v/), no progressive fallback ever needed on arhiiv items ✅.
- Search latency through the local proxy: 941–2117 ms (arhiiv search is the
  slow endpoint; content GETs are ~10× faster). API avg over a run: 453–746 ms.
- 1965 counts re-confirmed: **543 audio / 298 video** — matches the archives
  doc exactly ✅.

## CORS: the one asymmetry the archives doc missed ✅

- `GET /api/v1/content/{type}/{slug}` → ACAO:* on a simple request → **direct
  from any origin works** (and media on vod.err.ee needs nothing, as measured
  before).
- `POST /api/v1/search` → the actual response carries ACAO:*, but the
  **OPTIONS preflight (forced by the JSON content type) returns 204 with no
  ACAO** → browsers block it. `text/plain` body (preflight-free) → upstream
  500. So a search-only local proxy is required; everything else is
  proxy-free. The "playable from another origin: direct" verdict survives —
  it's exactly one endpoint that needs help, and only because of a
  misconfigured preflight ⚠️ (could be fixed server-side by ERR any day).

## Precision decode — field-tested, twice corrected ✅

The archives doc's convention (year→07-15+month:null, month→day-15) survived
contact with 1965 only after two refinements:

1. **`month:null` ⇒ year-only is an AUDIO-only rule.** Video items carry
   `month:null` even when day-precise: ak-…-1965-aasta-esimesed-abiellujad has
   `month:null`, `date:1965-01-04`, `dateCombined:"Esmaeeter 4. jaanuar
   1965"` — a real first-air day. For video, day-evidence = technical
   Eetrikuupäev/Võttekuupäev values or the **"Esmaeeter" dateCombined prefix**;
   the 07-15 / day-15 patterns carry the smear signal.
2. **Year-only synthesized dates are NOT always 07-15.** Confirmed year-only
   audio items (month:null) found at `1965-02-15` (a-omre-kosimine) and
   `1965-06-11` (arkadi-avertsenko-professionaali-mured). The mid-year
   midpoint seen on 1908/1919 samples is one case, not the rule — **month:null
   is the load-bearing signal; the date value is decoration**. Consequence:
   date-only heuristics (all a search hit gives you) under-call year-only as
   month/day — the remixer renders those badges italic-heuristic and upgrades
   them to solid once the content record arrives (lazy trickle at ≤1/s).
   Real month-only specimens encountered: a-omre-angerjas-karris (1965-02-15),
   ak-…-aianduse-mesinduse-naitus (1965-09-15 video) ⚠️ heuristic tier — their
   content records would decide.
3. **The year boundary leaks neighbors** ✅: the 1965 UTC range returned
   "3 x 2 KÜSIMUST" dated `1966-01-01` (and it landed in a chord, day-precise
   badge honestly showing 1966-01-01). Stored epochs look local-midnight
   (EET), queried in UTC → ±2-3 h smear at year edges. Ingest should
   post-filter by decoded year, not trust the range alone.

## Cross-decade reality check ✅

- **1938 has 40 audio and 0 video.** The archive's video record starts
  **1958-07-11** (AK filmikroonika 1958-1991: Üliõpilaslaulupidu Riias);
  1908–1964 video count = 597, nothing between 1908 and mid-1958. "1965 audio
  under 1938 video" therefore resolves to 1958-or-nearest — the instrument
  hunts `sortOption:old` over 1908–1964 and takes the closest date. Radio
  under film chronicle is the real cross-decade pairing this archive affords;
  pre-1958 picture would have to come from the photo archive (11 items in 1965
  alone) ⚠️ untested here.
- Search-page ergonomics: `sortOption:'old'` page 1 of a year is all January;
  the remixer uses `'abc'` so a 20-item page scatters across the whole year —
  a one-call honest strip. (No random sort exists 📄.)

## What the instrument is (proto/remixer/) ✅

Year dial (1908–2026) → 20+20 audio/video with honest badges + duration
trickle; year strip (day ticks, month-wide smears, faint full-year bands —
plan-timeline §−1's fuzzy-date rendering in miniature); 4 audio layers
(WebAudio GainNode each) + 2 stacked video layers (opacity +
normal/screen/multiply blend); CHORD (resolve 3 → arm → one play() tick);
per-layer/all SHUFFLE; split A/V audio-year input; keys 1-9/⇧1-9/space/c/s.
Media URLs always re-resolved via content API at load time (hash-addressed
video URLs stay cold). Evidence: autotest-report.json,
autotest-screenshot.png (1965 chord + May Day chronicle),
autotest-screenshot-p2.png (1938 dial, split-from-1965, Riga 1958 picture).
