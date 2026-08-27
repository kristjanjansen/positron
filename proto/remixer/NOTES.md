# remixer — working notes (2026-08-27)

Checkpoint log; findings doc goes to research/err-remixer-2026-08.md.
The instrument: historic year chords / blend visuals from year X, on top of
arhiiv.err.ee (recipes from research/err-archives-2026-08.md).

## Step 1 — CORS probe of the arhiiv API (decides proxy question) ✅ measured

- `OPTIONS /api/v1/search` (preflight, Origin localhost:8891) → **204 with NO
  access-control-allow-origin** → browser blocks any JSON POST.
- `POST /api/v1/search` actual response: **has ACAO:*** — only the preflight is
  broken. `Content-Type: text/plain` (preflight-free) → upstream **500** (needs
  the JSON content type). So no client-side workaround.
- `GET /api/v1/content/{type}/{slug}` (simple request, no preflight) →
  **ACAO:* → direct from browser works.**
- Verdict: server.mjs proxies **POST /search only**; content GETs and all media
  (vod.err.ee, ACAO:* per research doc) go direct. Proxy enforces ≥1 s spacing
  upstream; the page adds its own shared 1 req/s gate over search+content.
- Search recipe re-verified: 1965 → audioCount 543, videoCount 298, photoCount
  11 (matches research doc exactly). Search hits carry `date`/`heading`/`url`
  (slug) but **no `month`, no duration** → list badges start as heuristic
  (day-15 convention decoded from `date` alone), upgraded to confirmed once the
  content record (month + Eetrikuupäev + Kestus) is fetched — lazily at ≤1/s
  ("trickle", interactive mode only), or on load-into-layer.

## Step 2 — build ✅

- server.mjs: port 8891, static + POST /api/search proxy (1 s serialized gate,
  UA elektron-remixer-proto/0.1, not an open proxy — fixed upstream path) +
  /report sink. No media proxying, nothing cached to disk.
- index.html: year dial 1908–2026 → 20 audio + 20 video items; honest date
  badges (heuristic italic → content-confirmed solid); year strip (day ticks /
  month-wide smears / faint full-year bands, audio zone + video zone); rack =
  4 audio layers (shared AudioContext, per-layer MediaElementSource→GainNode)
  + 2 video layers stacked in a blendbox (opacity + mix-blend-mode
  normal/screen/multiply); CHORD (3 random from pool, resolve → arm → single
  play() tick, spread measured); per-layer + all SHUFFLE; split A/V via
  audio-year input; keys 1-9 / ⇧1-9 / space / c / s.
- Respect: ONE shared client gate ≥1000 ms across search+content, pages of 20,
  autotest plays 6 items total. Media streamed from vod.err.ee only.

## Step 3 — autotest run 1 ✅ (title REMIXER OK)

- counts 1965: **543 audio / 298 video** — matches research doc exactly.
- search latency 2117/1108 ms (proxied, gated); content GETs 60–117 ms raw.
- CHORD ×3 @1965: all HLS (64k AAC .m4a masters), buf 143–344 ms,
  **start-together spread 43 ms**, all three currentTime advancing 30.9 s at
  the 30 s mark. Video layer: HLS, ttff 342 ms, **740 rVFC frames in 30 s**
  (~24.7 fps). Zero media errors.
- Findings that forced fixes:
  1. **1938 has no video at all** — wide 1930–1946 search: 0. Oldest archive
     video = **1958-07-11** (AK filmikroonika). → nearest-hunt widened to
     1908–1964 sorted old (597 hits, all ≥1958); cross-decade becomes
     1965-audio under 1958-video. p2 verdict tightened (was vacuously true
     when video pick was null).
  2. **Precision decode refined**: AK 1965 video has `month:null` +
     `dateCombined "Esmaeeter 4. jaanuar 1965"` + date 1965-01-04 — day-precise
     despite null month. So `month:null ⇒ year` is an AUDIO-only rule; video
     relies on synthesized 07-15 / day-15 patterns + Esmaeeter/Eetrikuupäev
     day evidence.
  3. Sorted-'old' page 1 = all January → strip bunches left. Year searches now
     `sortOption:'abc'` → dates scatter across the year (single call, honest
     smear demo). Bonus find: **1966-01-01 item returned inside the 1965 UTC
     range** — local-midnight (EET) vs UTC epoch boundary leak, ~2-3 h smear
     at year edges.

## Step 4 — autotest runs 2+3 ✅ (both REMIXER OK)

- Run 2: cross-decade now real — videoPick 1958-07-11 üliõpilaslaulupidu-riias
  under 1965 audio, both playedOk; chord spread 0 ms (≤50 ms resolution).
  Found: p2 video frames reported -347 — rVFC `presentedFrames` resets per
  media source; framesAt0 baseline went stale on re-attach. Fixed (rebase to 0
  on attach).
- Run 3 (final): verdict {p1ok, p2ok, mediaErrorFree} all true, plays 6/8,
  0 errors. Chord 3×HLS buf 13–266 ms, ttff 40 ms each, 30.9 s advance; video
  740 f/30 s (P1), 395 f/16 s (P2). API avg 569 ms (searches 941–1780 ms via
  proxy, content GETs 62–218 ms incl. gate wait). Format mix: 100 % HLS.
- More precision specimens: year-only (month:null audio) at dates 1965-02-15
  AND 1965-06-11 → synthesized date is NOT always 07-15; month:null is the
  signal. abc-sort strip verified scattered; 1966-01-01 boundary-leak item
  visibly (and honestly) badged inside the 1965 pool.
- Evidence: autotest-report.json, autotest-screenshot.png (P1 chord),
  autotest-screenshot-p2.png (1938 dial + split-from-1965 + 1958 picture).
- Findings doc written: research/err-remixer-2026-08.md.
- Cleanup: server killed, no stray Chrome (drive.mjs Browser.close each run),
  port 8891 free, server.pid removed.

## Step 5 — one playhead: the timeline library adopted (2026-08-28)

Until now the rack was **N independent players**. The "1965 chord" was three
`<audio>` elements and one `<video>`, hand-started in a single tick, and that
was the whole of the synchronisation: they started together (0–43 ms measured)
and then drifted for the rest of their lives. There was no playhead, so there
was nothing to pause, nothing to seek, and rate did not exist at all.

The rack is now ONE timeline — `timeline/transport.mjs`, the same file
`timeline/lab` measured and `proto/jam`, `proto/selfrec` and `proto/instrument`
import (server aliases `/timeline/*` to the repo; nothing is copied). The
remixer is the **fourth** client and the second archive-domain one.

- Each archive item is a **`media-span`**: `{at, dur, mediaRef:{type, slug}}` on
  a shared arrangement axis. One row, two items (enter/exit) — a span is an
  interval, not an instant.
- **One adapter**, `media-span`, caps:
  `{domain:'arrangement', unit:'ms', seekable, reducible, clockMaster:true,
    seekAccuracyMs:40, rates:[0.5,0.75,1,1.5,2], rateNudge:[0.94,1.06],
    servoBandMs:20, syncToleranceMs:40, catchUp:'reduce',
    anchor:'arrangement-offset'}`.
  `actuate` seeks/plays a layer's element; `reduce` is the set of layers present
  at `t`; `assertState` hard-asserts every element (what a seek means).
- The **first playable layer is the clock master**: it is never rate-nudged, and
  the library's vector is slaved to its `currentTime` via
  `transport.sync(pos, {toleranceMs: 40})`. Every other layer servos to the
  library's position inside a ±20 ms dead band (0.94/1.06 nudge), hard-resync
  past 150 ms. Master stall for >1 s → free-run on the wall clock.
- Transport UI under the year strip: play/pause, click-to-seek scrubber with one
  bar per layer, rate ±, and a readout carrying the live inter-layer skew.
  Keys `p` transport, `[`/`]` rate; `space`/`c`/`s` and the year dial, strip,
  badges, shuffle and cross-decade behaviour are untouched.
- The per-layer ▶ now means "is this layer in the arrangement" — with one shared
  playhead there is no longer such a thing as starting a single layer.

### HONESTY: the alignment is ours, not the archive's

ERR archive items **carry no internal timecode**. Nothing in the metadata says
how a 1965 radio broadcast lines up with a 1965 newsreel; `Eetrikuupäev` is a
date, at best a day, and the badge work in Step 1 exists precisely because even
the *date* is often synthesized. So the `at` offsets on this timeline are an
**arrangement — a composer's choice, defaulted to 0 so a chord starts together —
NOT attested synchronisation.** What the transport buys is that the chosen
alignment is now exact, seekable and repeatable. It does not make it true, and
no amount of servo precision will turn it into a fact about 1965.

### Verification (headless, 1965: 3 audio + 1 video) — 11/11

| check | number |
|---|---|
| 1965 counts | **543 audio / 298 video** (unchanged from Step 3) |
| one deck, 4 layers, one adapter | caps `['media-span']`, `clockMaster:true`, tick host **worker** |
| clock master | `A3`/`A1`, **1169 `sync()` calls**, **0** corrections over the 40 ms tolerance — the vector tracked the master inside the dead band the whole run |
| chord start-together spread | **0.1 ms** (recorded before: 0–43 ms) |
| inter-layer skew while playing | max **17 ms** (audio layers ≤5 ms) |
| **ONE seek moves EVERY layer** | seek to 120.000 s → A1 122.502 / A2 122.501 / A3 122.502 / V1 122.487 s; skew **−1, −2, −1, −16 ms** |
| absence is content | seek past V1's 181 s span → V1 paused and out-of-span, the three audio layers keep playing at skew ≤4 ms |
| rate 2× | armed while paused (`rate` 0 / `targetRate` 2); **7961 ms advanced in 4000 ms**; every element rate 2.00; skew ≤16 ms |
| pause | playhead held **0.000 ms**, every layer paused, per-layer drift **0 ms** |
| errors | **0** console errors, **0** media errors |

Respect: the run used `?trickle=0` (new flag — suppresses the lazy per-item
content resolver, which would otherwise be 40 upstream GETs a verification does
not need), so upstream traffic was **6 calls total** — 2 searches + 4 content
GETs — every one through the page's own ≥1 s gate. No media proxied, nothing
cached to disk.

Evidence: `timeline-transport.png` (chord playing under the AK filmikroonika
1 May newsreel, transport bar and span lanes visible).

### Note on the script tag

`index.html`'s script is now `type="module"` (it imports the library). Module
scope is not global, so the driver handles are exported deliberately as
`window.__remix` / `window.__timeline` rather than by accident.
