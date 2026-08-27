# ERR live feeds — discovery + measurements (2026-08-27)

Probed read-only at low rate from otse.err.ee page source + direct verification (curl/ffprobe/node),
~08:49–09:01Z. Proto: `proto/flipper/` (verified playing in headless Chrome, see below).
Provenance: ✅ measured · 📄 documented (seen in page source/headers, not exercised) · ⚠️ unverified.

## Verdict up front

- **PDT: YES on the modern stack.** `live.err.ee` playlists carry `EXT-X-PROGRAM-DATE-TIME`
  (µs precision) **plus** `#USP-X-TIMESTAMP-MAP:MPEGTS=…,LOCAL=…` — an explicit MPEGTS↔wall-clock
  map. The cue engine can anchor on PDT directly; hls.js exposes it (`playingDate` verified
  in-browser ✅). The legacy stack has no PDT but its segment *filenames are epoch-milliseconds*
  (verified against wall clock ✅) — a de-facto anchor.
- **CORS: fully open** (`access-control-allow-origin: *` on masters, media playlists, segments,
  both HLS stacks ✅). **No proxy needed for any HLS.** Only exception: icecast radio has no CORS
  headers — `<audio src>` plays fine, but reading ICY StreamTitle from a browser needs a tiny proxy.
- **DVR: 2 hours on everything** on live.err.ee — TV *and* radio (3750 × 1.92 s ✅). Sampler-grade.
- **No DRM on the open endpoints** (no `EXT-X-KEY` ✅). The official player uses a *separate*
  DRM-capable endpoint with schedule-gated Axinom DRM (📄, see below).

## Stack A — live.err.ee (modern; Broadpeak BkS350 origin) — use this one

`https://live.err.ee/live/{channel}.m3u8` where channel ∈
`etv, etv2, etvpluss, vikerraadio, raadio2, klassikaraadio, raadio4, raadiotallinn` — all 200 ✅.

| Property | Value | |
|---|---|---|
| Container | HLS v7; TV = CMAF fMP4 (`.m4s` + `EXT-X-MAP` init), radio = `.ts` AAC | ✅ |
| Segments | **1.92 s**, `TARGETDURATION:2`, `EXT-X-INDEPENDENT-SEGMENTS` | ✅ |
| TV ladder | 320×180 / 704×396 / 1280×720 / 1920×1080 (avg 675k/1288k/1799k/3332k), h264 25 fps + AAC-LC 212k | ✅ |
| Radio ladder | AAC 70 / 130 / 260 kbps | ✅ |
| Extras | **I-FRAME playlists** per rendition (trick-play/scrub); et+ru **subtitle tracks**; ETV & ETV2 carry a **`zxx` "no linguistic content" clean audio track** (international sound — remix gold); ETV+ does not | ✅ |
| DVR | 3750 segs × 1.92 s = **2 h exactly**, TV and radio | ✅ |
| PDT | **`EXT-X-PROGRAM-DATE-TIME` present** + `USP-X-TIMESTAMP-MAP` | ✅ |
| LL-HLS | No (`EXT-X-PART`/`PRELOAD-HINT`/`PART-HOLD-BACK` absent) — but 1.92 s segments are short | ✅ |
| DATERANGE / SCTE-35 | None in playlist snapshots; no ID3/data track in segments (ffprobe) | ✅ (snapshot) |
| Encryption | No `EXT-X-KEY` — clear | ✅ |
| CORS | `*` on master + media + segments (tested `Origin: http://localhost:8892`) | ✅ |
| Manifest cache | `cache-control: max-age=2` | ✅ |
| Latency | Manifest edge **4.67 s** behind wall clock; in-player `hls.latency` **5.9–6.1 s** ≈ glass-to-glass class ~6–10 s | ✅ |
| Session | Master mints `?id=<15-digit>`; variant URLs relative w/ id → transparent to hls.js. Bare variant → 400; stale/foreign id → `Failed to set session: not found` | ✅ |

Redundant/official variant: `live.err.ee/{ch}/{ch}.isml/master.m3u8` + `manifest.mpd` (DASH) —
the otse.err.ee player's source, **400 without a token** ✅; player config shows
`"drm":{"initBySchedule":true}` with Axinom PlayReady license server
(`drm-playready-licensing.axprod.net`) 📄 — i.e. DRM is applied per-programme by schedule on
*that* endpoint. The `/live/` endpoint above is clear; whether it blacks out during
rights-restricted programmes is ⚠️ unverified (single-session snapshot).

## Stack B — sb.err.ee (legacy; nginx) — redundant fallback, TV only

`https://sb.err.ee/live/{etv,etv2,etvpluss}.m3u8` ✅. HLS v3, MPEG-TS, **10 s** segments,
3 renditions 400/800/1500k (720p max; ffprobe: h264 25 fps + AAC 44.1 kHz ✅). DVR 720 × 10 s =
2 h ✅. Masters rotate media hosts `lonestarr|skroob|yogurt.err.ee` (Spaceballs) ✅; same `?id=`
session semantics. CORS `*` everywhere ✅. **No PDT, no ID3, no DATERANGE** ✅ — but segment
filenames are epoch-ms (`1787820565225.ts` → 2026-08-27T08:49:25.225Z, wall-clock-verified ✅).
Manifest edge 8.3 s + 10 s segments → latency class ~30–40 s.

## Stack C — icecast.err.ee (radio; Icecast 2.4.4)

Full mount list from `status-json.xsl` ✅. Per station: `{name}.mp3` (128k) + `{name}korge.mp3`
(hi) + `{name}madal.mp3` (lo) + `.opus` twins. All five targets present:
`vikerraadio, raadio2, klassikaraadio, raadio4, raadiotallinn`. Bonus mounts: `klara*` (jazz/
klassika/meditatsioon/nostalgia), `r2rock/pop/eesti/chill/alternatiiv/music/p`, `r4retro`, `*-dab`.

- **ICY now-playing: rich** ✅ — `icy-metaint:16000`; measured StreamTitles:
  Viker `Järjejutt - Emapiim, 4` (programme), R2 `ELLIE GOULDING - Ravers` / `Uudised`,
  Klassika `Frederick Loewe / Alan Jay Lerner - Almost Like Being In Love - Lester Young`.
- **No CORS headers** ✅ → browser `fetch` of the stream (for StreamTitle) needs a proxy;
  plain `<audio src>` playback is unaffected. HEAD requests get 400 (Icecast quirk) — use GET.
- No DVR. For seekable radio use the live.err.ee HLS mounts (2 h DVR **with PDT**) — the two
  transports complement: icecast for titles, HLS for time-travel.

## proto/flipper — what it proves ✅

One static page + node server (port 8892; serves static + `/icy/:mount` StreamTitle proxy —
the only proxying required). hls.js **1.7.1** vendored. Verified end-to-end in one headless
Chrome 151 via CDP (evidence: `proto/flipper/autotest-report.json`, `autotest-screenshot.png`).

- **Channel flip (hot, all tiles attached): 10–12 ms keypress → first presented frame**
  (rVFC-measured; first-ever flip 43.7 ms; med 12 ms) — flipping is a DOM swap, effectively free.
- **Parallel buffering is cheap with level pinning**: background tiles pinned to 180p, featured
  capped 720p → **3.5 Mbps total** for 3 live TV streams, all at full 25 fps (510 frames/20 s/tile).
- **PDT survives the whole pipeline**: `hls.playingDate` ticked live in-browser — the cue engine
  can anchor browser playback to wall clock with zero server help.
- **2 h DVR is real in-player**: `liveSyncPosition` 7210 s; hold-to-scrub + live-return + 2 s
  stutter loop implemented against it.
- **Split A/V works structurally**: any tile's audio or any icecast radio under any video
  (headless ran `--mute-audio`, so acoustics ⚠️ unverified by ear; ICY proxy returned live titles
  from within the page ✅).
- et/ru subtitle tracks render by default via hls.js (visible in screenshot).
- Not blocked on anything: no CORS wall, no geo-block observed from here, no DRM on `/live/`.

## Cue-engine takeaways

1. Anchor on `live.err.ee` PDT (+ `USP-X-TIMESTAMP-MAP` for MPEGTS-precision mapping).
2. Radio and TV share the same origin, segment duration (1.92 s), and 2 h window → cross-channel
   time-aligned remixing (TV picture + radio DVR audio at the same wall-clock instant) is feasible.
3. `zxx` clean-audio on ETV/ETV2 = programme sound without announcer language — sampler material.
4. I-FRAME playlists exist if we ever want fast visual scrubbing thumbnails.
5. Respect notes: `?id=` sessions are minted per master fetch — always re-enter via the master;
   manifests are `max-age=2`; keep polling ≥ segment duration; icecast conns short-lived.
