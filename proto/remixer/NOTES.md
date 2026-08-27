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
