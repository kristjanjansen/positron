# flipper — working notes (2026-08-27)

Checkpoint log; findings doc goes to research/err-live-feeds-2026-08.md.

## Part 1 discovery — DONE (all ✅ measured 2026-08-27 ~08:50Z)

Three ERR stacks found:

### A. live.err.ee — modern (Broadpeak BkS350 origin, "USP" heritage) — THE ONE
- `https://live.err.ee/live/{etv,etv2,etvpluss,vikerraadio,raadio2,klassikaraadio,raadio4,raadiotallinn}.m3u8`
- HLS v7, 1.92 s segments (TARGETDURATION 2), TV = CMAF fMP4 (`.m4s` + EXT-X-MAP init), radio = 1.92 s `.ts` AAC
- **EXT-X-PROGRAM-DATE-TIME present** + `#USP-X-TIMESTAMP-MAP:MPEGTS=...,LOCAL=<iso>` — cue-engine anchor exists
- DVR: 3750 segs × 1.92 s = **exactly 2 h** in the live playlist (TV and radio both)
- TV ladder: 180p/396p/720p/1080p (avg 675k/1288k/1799k/3332k), AAC 212k; ETV has **zxx "clean" audio track**; et/ru subs; I-FRAME playlists per rendition
- Radio ladder: AAC 70/130/260 kbps
- No LL-HLS (no PART/PRELOAD-HINT), no DATERANGE/SCTE-35, **no EXT-X-KEY** (clear streams)
- CORS: `access-control-allow-origin: *` on master, media playlists, segments — **no proxy needed**
- Session: master mints `?id=<num>`; variant URLs are relative w/ id → transparent to hls.js. Bare variant URL without id → 400. Stale id → "Failed to set session: not found"
- Edge distance measured: **4.67 s** (manifest edge vs wall clock); latency class ≈ 8–12 s glass-to-glass
- Sibling DRM endpoint (official otse.err.ee player): `live.err.ee/{ch}/{ch}.isml/manifest.mpd|master.m3u8` → 400 bare; Axinom (`drm-playready-licensing.axprod.net`), `"drm":{"initBySchedule":true}` — DRM is schedule-gated, applied per-programme

### B. sb.err.ee — legacy (nginx) — redundant variant
- `https://sb.err.ee/live/{etv,etv2,etvpluss}.m3u8` (TV only)
- HLS v3, MPEG-TS, 10 s segments, 400k/800k/1500k, 720p max (h264+aac 44.1k measured via ffprobe)
- **No PDT** — BUT segment filenames are epoch-milliseconds (`1787820565225.ts` = 2026-08-27T08:49:25.225Z, verified against wall clock) — a de-facto wall-clock anchor
- DVR: 720 × 10 s = 2 h. No ID3/data track in segments (ffprobe). CORS `*` everywhere.
- Media hosts rotate: lonestarr/skroob/yogurt.err.ee (Spaceballs). Same `?id=` session semantics.
- Edge distance measured: 8.3 s + 10 s segs → latency class ≈ 30–40 s

### C. icecast.err.ee — radio (Icecast 2.4.4)
- `{vikerraadio,raadio2,klassikaraadio,raadio4,raadiotallinn}.mp3` (128k) + `korge`(hi)/`madal`(lo) + `.opus` each; bonus themed mounts (klara*, r2rock/pop/eesti/chill/alternatiiv/music, r4retro, *-dab)
- ICY metadata: `icy-metaint:16000`, StreamTitle rich (measured: Viker="Järjejutt - Emapiim, 4", R2="ELLIE GOULDING - Ravers", Klassika=composer - work - performer)
- **No CORS headers** → `<audio src>` plays fine cross-origin, but reading StreamTitle from browser needs a proxy → server.mjs /icy endpoint
- No DVR. (For DVR'd radio use the live.err.ee HLS mounts instead — with PDT.)

## Part 2 build log — DONE, verified ✅ 2026-08-27 09:00Z
- hls.js vendored: **1.7.1** (`hls.min.js`, jsdelivr single-file dist)
- server.mjs: static + `/icy/:mount` ICY-metadata proxy (parses metaint, one short-lived
  icecast conn per request, 12 s cache) + `/report` sink, port 8892. HLS itself needs NO proxy.
- index.html: 3 TV tiles all-attached; featured capped 720p, background tiles pinned level 0
  (180p) → measured total downlink **3.5 Mbps** for 3 parallel streams; no lazy-attach needed
- Keys: 1–3 flip · Q/A/S/D TV audio · V/R/K/F/T radio audio · ←/→ DVR scrub · L live · X stutter
- Headless-Chrome verification (Chrome 151, CDP via node built-in WebSocket, drive.mjs in scratchpad):
  - autotest title: **FLIPPER OK**, zero hls.js errors
  - **flip times (keypress → first presented frame, rVFC): 43.7 ms cold-first, then 10 / 11.2 / 11.5 ms**
    (hot flip = DOM swap of already-playing tile; med 12 ms over n=4)
  - all 3 tiles ~25 fps real frames (510/510/509 presented in ~20 s), featured 720p
  - `hls.playingDate` = 2026-08-27T09:00:40Z → **PDT flows through hls.js in-browser** (cue anchor usable)
  - `hls.latency` 5.9–6.1 s live latency; liveSyncPosition 7210 s (2 h window confirmed in-player)
  - ICY proxy from page: R2 title "Uudised" ✅
  - evidence: `autotest-report.json`, `autotest-screenshot.png` (ETV2 720p featured w/ et subs
    rendering, ETV/ETV+ tiles live, HUD: flip 12 ms · PDT clock · 3.5 Mbps)
- Cleanup: server killed, Chrome exited via Browser.close, port 8892 free, no orphans.
- Caveat: headless run had `--mute-audio` — SPLIT A/V audio path (radio `<audio>` + unmute logic)
  exercised only logically, not acoustically. Subtitle tracks (et/ru) render by default via hls.js.
