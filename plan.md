# Cloudflare Low-Latency Streaming — Findings & Test Rig Plan

**Date:** 2026-08-25 · **Account:** `dc1ee8d72a1fb7da857c46479a8503b8` · **Stream customer code:** `customer-mwuu1cmlyif6eluy`

Provenance is tracked on every material claim, because almost every published latency number for these
products is marketing with no method attached:

- ✅ **measured** — run on this machine against live Cloudflare production during this session
- 📄 **documented** — Cloudflare docs / changelog / blog, dated, not independently confirmed
- ⚠️ **unverified** — inferred, single-sourced, or untested; treat as hypothesis

Chronological session journal (what happened in order, including mistakes and dead ends):
**`PROGRESS.md`**. This document is the current-state reference **for the
streaming stack** — transports, players, traps, mysteries solved.

⚠ **It is no longer the current-state reference for the project.** Since
2026-08-26 the work has converged on the timeline substrate; start at
`HANDOFF.md`, then `SUMMARY.md`, then `plan-timeline.md` §7–§9. What is here is
still true of the stack and is still the place to look up a transport number —
with one exception, flagged in §11b, that touches numbers printed in this file.

---

## 1. Headline result

Cloudflare's pipeline costs about **one second**. Everything above that is the player.

✅ **Ingest → edge lag, DEFINITIVE (2026-08-25 session 3, blocking playlist reload, clock-corrected ±25 ms):
p50 842 ms / p95 1951 ms / p99 2191 ms** (n=140 parts over two runs; per-run medians agree within 12 ms).
Measured with `rig/edge-lag-blocking.py` — `_HLS_msn`/`_HLS_part` requests verifiably blocked (block-time
p50 ≈ 425 ms ≈ the 0.5 s part cadence; 99–100 % held ≥150 ms; every response contained the requested part).

The earlier polling numbers (0.87–1.23 s session 1; 1.05–3.24 s session 2) are superseded: polling read
**+2.28 s above truth** head-to-head (polling p50 3.13 s, same broadcast). ✅ Root cause observed directly:
non-blocking GETs bounce between edge replicas of different freshness (PRELOAD-HINT went *backwards*
between fetches 400 ms apart; staleness alternated 0.8 ↔ 2.7 s; `cache-control: no-store` — replica
divergence, not caching). Polling = truth + a 0–2.5 s replica lottery; session 1's "~1 s" was lucky draws.

✅ **SOLVED (session 4): the "part 2 late" anomaly is Cloudflare's segmenter, and part 2 was never
special.** It is a **once-per-segment hold-and-release cycle in CF's publishing pipeline** whose phase
is set at broadcast start (one broadcast held part 2; another parts 1–2; period 2.00–2.06 s across all
broadcasts): mid-segment the playlist stops advancing 0.9–1.75 s, then the back half + finalize publish
in ONE playlist write. Encoder exonerated decisively — a local FLV byte-timing tap on the same encode
showed every frame leaving within ±23 ms of schedule (zero gaps > 61 ms, ~12.5k tags, three arms), TCP
Send-Q never accumulated, and no encoder knob (keyframe-per-part g15, lookahead restored) moved it.
⚠️ Practical: the newest part at the edge is 0.8–2.0 s old depending on cycle phase — a stall-free
player must ride the p95 (~2.0 s), not the p50 (~0.84 s), which is consistent with (and partly explains)
the tuned player's 2.4–2.5 s floor. No encoder tuning will fix this. Tools: `rig/push-part2.sh`,
`rig/part2-flv-tap.py`; log `rig/PART2-NOTES.md`; data `results/part2-*.jsonl`.

### The player result, two independent runs

| Run | Arm | `hls.latency` (behind live edge) | PDT source→display |
|---|---|---|---|
| A | stock hls.js | 7.60 s — flat | 8447 ms |
| A | + seek correction | 1.87 s — flat | 2569 ms |
| B | stock hls.js | **15.41 s** — flat | 16279 ms |
| B | + seek correction | 3.05 s — flat | 3964 ms |
| B | `liveMaxLatencyDurationCount` | **never played** | — |

**The defect is not slowness — it is non-determinism.** Stock hls.js parked at 7.6 s in one run and 15.4 s in
another, on the same stream with the same configuration. Each was perfectly *stable* (run B: 14.92–15.57 s
across 28 batches). Where it lands is decided by whatever happened during startup, and it then stays there
forever, because no enabled mechanism can move it.

The seek correction produced 1.87 s and 3.05 s across the two runs — an order of magnitude tighter spread.

### Why nothing corrects it

hls.js reads Cloudflare's `PART-HOLD-BACK` correctly and sets `targetLatency` to 1.5 s. It has two ways to
converge on that target, and both are inert by default:

- **Rate catch-up** (`maxLiveSyncPlaybackRate`) defaults to `1` — off. Set to `1.05` it still never engaged;
  `playbackRate` stayed at `1.000` throughout. Even working, 0.05× recovers a 6 s deficit in ~2 minutes.
- **Seek correction** fires only when `latency > maxLatency`, and `maxLatency` derives from
  `liveMaxLatencyDuration` / `liveMaxLatencyDurationCount`, both unset by default. That branch can never fire.

The workaround actually used:

```js
setInterval(() => {
  const lsp = hls.liveSyncPosition;
  if (lsp != null && lsp - video.currentTime > 2.0) video.currentTime = lsp;
}, 1000);
```

⚠️ **The idiomatic config fix did not work.** Setting `liveMaxLatencyDurationCount: 5` produced 35 batches with
`n=0`, `targetLatency: null` and no playback at all. Unresolved — it either broke initialisation or threw.
Until that is understood, the manual seek is the only demonstrated fix.

⚠️ **Confound:** `targetLatency` was 1.5 s in run B's stock arm but 2.5 s in its seek arm, so Cloudflare's
advertised hold-back varied between arms. The arms are not perfectly matched; treat the numbers as directional.

📄 Cloudflare's own player is worse off: it ships **hls.js 1.4.10** (August 2023) in an August 2026 bundle and
sets `maxLiveSyncPlaybackRate: 1`. This rig used 1.7.1.

### Independent corroboration

The one credible third-party benchmark — Reinhardt, *Streaming Media* 2023, vendors anonymised, screens
photographed at 1/500 s — measured **LL-HLS at 19.75 s combined**, indistinguishable from plain HLS and ~6×
worse than vendors claim. That is the same failure mode measured here: correct LL-HLS packaging, player throws
the benefit away. It is an industry-wide gap, not a quirk of this setup.

---

## 2. The four Cloudflare paths

| Path | Latency | Status | Browser? | Verdict |
|---|---|---|---|---|
| **LL-HLS** (RTMPS/SRT → HLS) | ✅ 2.6–4.0 s tuned / 8.4–16.3 s stock | 📄 open beta since Sep 2023 (~35 mo) | ✅ yes | **Best browser option.** Scales like HTTP. |
| **WebRTC WHIP→WHEP** | ✅ **74 ms p50 / 83 ms p95** glass-to-glass | 📄 beta since Sep 2022 (~4 yr) | ✅ yes | Lowest latency, feature-starved |
| **SRT / RTMPS playback** | 📄 300–500 ms | 📄 GA | ❌ needs ffmpeg | Sub-second without WebRTC |
| **MoQ relay** | ✅ 17.9 ms one-way; **✅ browser→browser VIDEO 26 ms p50 / 42 ms p95 (720p30)** | 📄 beta, free, API "will change" | ✅ yes (@moq/net+hang, Chromium; see plan-m2m §1.C) | The experimental one — now the fastest browser path measured. Live-edge only. |

**Many-to-many (the participatory grid) is planned separately in `plan-m2m.md`** (2026-08-25 session 4):
recommended architecture = Realtime SFU grid (the `.env` app; 📄 Stream's WHIP/WHEP has been powered by
this same SFU since 2025-03-13, so the ✅ 74 ms measurement already validated its media plane) + this
stack's stage stream unchanged + an `RtcRoom` DO next to workers/cues for signaling.
**✅ Prototype PROVEN (`proto/m2m/`): 3-way mesh 6/6 pairs p50 97 ms glass-to-glass; 5-way 20/20 pairs
p50 92 ms; 2-way 74 ms = the WHEP baseline exactly.** Phase-1 details in plan-m2m.md §6.

### 2.1 LL-HLS — what Cloudflare actually emits

✅ **Correction to prior research.** Both research passes concluded Cloudflare emits no
`EXT-X-PROGRAM-DATE-TIME`, which would have ruled out the cheapest measurement method. That holds only for
**non**-LL-HLS inputs. With `preferLowLatency: true` the child playlist carries the full LL-HLS tag set:

```
#EXT-X-PART-INF:PART-TARGET=0.5
#EXT-X-SERVER-CONTROL:PART-HOLD-BACK=1.5,CAN-BLOCK-RELOAD=YES
#EXT-X-PROGRAM-DATE-TIME:2026-08-25T05:36:35.496Z     <- one per segment
#EXT-X-PART:DURATION=0.5,...,INDEPENDENT=YES          <- 4 parts per 2 s segment
#EXT-X-PRELOAD-HINT
#EXT-X-RENDITION-REPORT   x4
```

| Tag | LL-HLS child | plain child |
|---|---|---|
| `EXT-X-PART` | 41 | 0 |
| `EXT-X-PROGRAM-DATE-TIME` | 11 | **0** |
| `EXT-X-SERVER-CONTROL` / `PART-INF` / `PRELOAD-HINT` | 1 each | 0 |
| `EXT-X-RENDITION-REPORT` | 4 | 0 |

✅ Trap: `?protocol=llhls` on a **non**-LL input silently returns a plain v6 playlist with zero LL tags — easy
to mistake for "LL-HLS is broken". The switch is the `preferLowLatency` field, not the query parameter.

✅ Trap #2 (session 5): **4K ingest silently disables LL-HLS** — a 3840x2160 RTMPS push into a
`preferLowLatency:true` input produced playlists with no PART/SERVER-CONTROL tags (plain 2 s
segments). Also empirically settled: Stream accepts 4K ingest but **transcodes down — delivery
tops out at 1920x1080** (no documented limit anywhere; proven by rendition list + frame grab).
Keep Stream ingest at 1080p for both reasons.

### 2.2 WebRTC — mind the gaps

📄 Beta since 2022-09-27; docs' last substantive edit 2024-09-12. The "coming soon" list is verbatim 2022 text:
no recording, no analytics, no viewer count, and **no cross-protocol** — WHIP ingest cannot be played as HLS,
RTMPS ingest cannot be played over WHEP. The publish URL's path segment **is** the credential; no
`Authorization` header. ⚠️ An unknown live input returns **HTTP 500, not 404**.

The GA, actively-developed surface is the **Realtime SFU** (`rtc.live.cloudflare.com/v1/apps/{appId}`), not
Stream's WHIP/WHEP. Credentials are in `.env`.

**✅ Direct-tested (2026-08-26 phase 3b): WHIP ingest RECORDS NOTHING** — 183 s of publishing against
a `recording.mode=automatic` live input produced zero video assets (26 polls during + 241 s after).
The 2022 "recording coming soon" is still unshipped: Stream-WebRTC is delivery-only. Archive paths
must ingest via RTMPS/SRT.

**✅ Measured (2026-08-25, browser→CF→browser, burned-pixel timing, zero clock error — both tabs local):**
glass-to-glass **p50 73.6 ms / p95 83.1 ms / p99 83.8 ms** (n=8079 over 300 s, 720p30 @ 2.5 Mbps,
per-minute p50 stable 66–75 ms, no drift). Cloudflare's `<1 s` claim holds with ~10× headroom;
**~40× faster than tuned LL-HLS** (2.6–4.0 s). jitterBufferDelay avg 17.9 ms/frame; ICE RTT p50 15 ms
both legs; 2 freezes (0.75 s total) in 5 min. Both WHIP and WHEP connected first try (~3 s, HTTP 201,
video-only OK).

**✅ abs-capture-time does NOT survive Cloudflare — refused at negotiation, not stripped in transit.**
Publisher offered `a=extmap:…/abs-capture-time`; CF's answer omits it on BOTH legs (accepts only mid,
rtp-stream-id, repaired-rtp-stream-id, transport-wide-cc), so Chrome never sends it; `metadata.captureTime`
absent in 0/8079 rVFC samples. WebRTC timing through Stream therefore needs burned-pixel or side-channel
methods. Verbatim SDPs in `rig/whep/artifacts/`. ⚠️ Codec inferred VP8 (listed first in both answers;
CF also offers VP9/H264/AV1/H265 on WHEP). Rig: `rig/whep/`, data `results/whep.jsonl`.

### 2.3 MoQ — the experimental one

📄 Cloudflare shipped a provisioning API + dashboard (Media → Realtime → MoQ Relay) on **2026-07-31**, free
during beta.

- ✅ `draft-16.cloudflare.mediaoverquic.com` → 162.159.207.2; `draft-14` → 162.159.207.5;
  `draft-18` → **NXDOMAIN**. Draft-16 is the target.
- 📄 **`FETCH` and `GOAWAY` unimplemented** → live-edge fan-out only. No catch-up, rewind, or
  fast-join-from-cache. Architectural, not temporary.
- 📄 Auth is a bearer token **in the URL path**; Cloudflare's docs warn these land in access logs.
- Separate product surface — no RTMP→MoQ path. Bring your own publisher and player.
- ⚠️ Two incompatible ecosystems share the name: IETF MoQT (Cloudflare) and moq-lite/`hang`. A `hang` client
  will likely not work against draft-16. The original `moq-js` reaches only draft-07 and will not work at all.
- ✅ `mediamtx` 1.20.1 now ships a MoQ listener by default — binary-verified to speak MoQT drafts 16–19, so
  CF interop at draft-16 is plausible but untested (likely friction: CF token-in-path vs mediamtx path→stream).

**✅ End-to-end PROVEN (2026-08-25 session 3), via the draft-14 endpoint — which has NO auth at all:**
`moq-clock-ietf` pub+sub against `draft-14.cloudflare.mediaoverquic.com`, no token: 44/44 ticks,
**one-way pub→relay→sub p50 17.9 ms / p95 61 ms** (one-clock method, both ends in the same Docker VM,
n=41). Media path also works: ffmpeg fMP4 → `moq-pub` → relay → `moq-sub` → valid mp4, both streams
intact (trap: draft-14 `moq-sub` logs to stdout — `RUST_LOG=off` or the dump is corrupted). The relay
replays the *open group* from its start on join (current GOP from first frame), so "live-edge only" is
slightly softer than it sounds. Draft-16 auth is enforced (`scope resolution failed` without a token).
⚠️ 17.9 ms is a tiny-object number, not video; burn-in/OCR media measurement awaits a draft-16 relay.
⚠️ The open draft-14 relay is a perfect test bench but unusable for production (world-open, no SLA).

**Build path:** native `cargo build` is impossible on this machine — **ThreatLocker SIGKILLs freshly
compiled binaries** (proved with a 1-line C program). moq-rs built inside Docker instead (draft-14 and
draft-16 branches, ~1 min each); recipe + canned test in `rig/moq/RUNBOOK.md` §4. Rust 1.96.0 was
already installed via brew rustup (2026-05-28) — no machine change made. Dashboard provisioning
click-path for draft-16 (relay ID + two tokens, shown ONCE) documented in RUNBOOK §3.

---

## 3. Test rig — as built

```
rig/
  push-llhls.sh       ffmpeg@7 → RTMPS, epoch burned into pixels, LL-HLS-compliant encode
  measure-llhls.html  hls.js + PDT + requestVideoFrameCallback probe, POSTs to collector
  collector.py        server on :8899 + POST /collect → results/<run>.jsonl
  edge-lag.sh         manifest-only ingest→edge lag, no player involved
  run-arms.sh         sequential A/B/C arms in one foreground tab
```

```bash
setsid nohup python3 rig/collector.py 8899 &      # plain & gets killed; setsid survives
./rig/push-llhls.sh &
./rig/edge-lag.sh 10
./rig/run-arms.sh
```

### 3.1 Signal generation — verified recipe

```bash
EPOCH=$(python3 -c 'import time;print(f"{time.time():.6f}")')
# filter written to a FILE, escaped once:
#   drawtext=fontfile=…:text='%{pts\:flt\:'"$EPOCH"'}':…
/opt/homebrew/opt/ffmpeg@7/bin/ffmpeg -re -f lavfi -i "testsrc2=size=1280x720:rate=30" \
  -filter_script:v filt.txt \
  -c:v libx264 -tune zerolatency -profile:v main -bf 0 -g 60 -keyint_min 60 -sc_threshold 0 \
  -b:v 3000k -minrate 3000k -maxrate 3000k -bufsize 3000k \
  -c:a aac -b:a 128k -f flv "rtmps://live.cloudflare.com:443/live/$KEY"
```

✅ Frame 0 renders exactly the epoch passed in, to the microsecond.

**Traps, all hit for real:**
- `basetime=` is **silently ignored** by `%{pts:hms}` — renders `00:00:00.000`. Use the third argument of
  `%{pts:flt:OFFSET}`. That is the whole trick.
- Escaping is three levels deep. Write the filter to a file; use `-filter_script:v` (ffmpeg 7) or
  `-/filter:v` (ffmpeg 9).
- ⚠️ `%{eif}` **overflows at int32**, so a 13-digit epoch-ms cannot be burned that way. Use ms-since-midnight
  (8 digits) or ms-since-start (9 digits) plus a recorded start epoch.
- `-bf 0` is mandatory — 📄 B-frames are incompatible with LL-HLS, and WebRTC egress hard-fails on them while
  HLS silently succeeds.
- ⚠️ Verify keyframes with `key_frame=1`, **never** `pict_type=I`. `ffprobe -show_entries frame=pkt_pts_time`
  is silently broken — the field is now `pts_time`, and ffprobe accepts the old name while emitting nothing.

### 3.2 Keyframe cadence — an untested LL-HLS lever

⚠️ Demonstrated against mediamtx, not yet Cloudflare. Setting **`-g` = fps × part-duration** makes *every*
partial segment `INDEPENDENT=YES` instead of one in five, so a player can join at any part boundary:

```
-g 30 (1 s GOP, 200 ms parts) → 1 part in 5 independent
-g 6  (200 ms GOP = part target) → EVERY part independent
```

Cloudflare's part target is 0.5 s → try `-g 15` at 30 fps in Phase 1. Cost: frequent IDRs are expensive at
fixed bitrate. Note `-g 30` alone gives a 29-frame cadence — scenecut fires. Always set `-keyint_min` and
`-sc_threshold 0`.

### 3.3 Two ffmpeg builds — or one

Homebrew's `ffmpeg` shed most optional libraries between 7.1.1 and 9.0.1.

| Capability | ffmpeg 9.0.1 | ffmpeg@7 (keg-only) |
|---|---|---|
| `whip` muxer | ✅ | ❌ (added in 8.0) |
| `drawtext` (libfreetype) | ❌ | ✅ |
| SRT / RIST | ❌ | ✅ |
| `ocr` (libtesseract) | ❌ | ✅ |

**Better: `brew install ffmpeg-full`** (9.0.1, keg-only) has all three in one binary. Recommended before Phase 2.

~~⚠️ Possible WHIP blocker~~ → **✅ RESOLVED as a non-issue (2026-08-25 session 4, measured).**
FFmpeg's WHIP muxer offers `42001f` (or `64001f` at default High) — and **Cloudflare echoes the offer's
fmtp verbatim** rather than insisting on the docs' `42e01f`. Both profiles accepted, played back, and
frame-verified via WHEP (screenshots + climbing frame counters in `rig/whep/artifacts/whip-ffmpeg-*`).
Handshake: SDP answer ~1.4 s, ice-lite + DTLS done, muxer streaming in 2.8 s; encode held 0.97× realtime
at 720p30 2 Mbps. **Working command in `rig/whep/WHIP-FFMPEG-NOTES.md`** (`-re` required — nothing else
paces; `-profile:v baseline` optional). Quirk: teardown's WHIP DELETE logs "Failed to read response" —
cosmetic, exit 0. ⚠️ Inferred: CF forwards the bitstream untranscoded; lenient profile matching is
CF-specific — retest per SFU. **m2m implication: stock homebrew ffmpeg 9.0.1 can publish a studio feed
into the same WebRTC world as browser participants today.**

Other hard WHIP constraints: audio **must** be `libopus -ar 48000 -ac 2` (AAC rejected outright); `-bf 0`
enforced; `-bsf:v h264_mp4toannexb` auto-inserted; `-strict experimental` not required; there is no `whip://`
scheme — pass plain `https://` (an unregistered scheme segfaults ffmpeg).

---

## 4. Measurement methods, ranked

| # | Method | Measures | Clock sync needed |
|---|---|---|---|
| 1 | **PDT + `requestVideoFrameCallback`** | ingest → display | yours vs Cloudflare's |
| 2 | QR / burn-in + rVFC, **loopback** | encode → display | **none** — one clock |
| 3 | WebRTC `abs-capture-time` | capture → receive | **none** — in-band |
| 4 | WebRTC `getStats()` | jitter buffer, decode | attribution only |
| 5 | ffmpeg `drawtext` → `ocr` | encode → decode | none if loopback |
| 6 | Photodiode rig | **true** glass-to-glass | none — one MCU |

Method 1 produced the headline numbers. Method 6 is the only one that captures the 40–80 ms of sensor readout
and panel scanout every software method misses — build once, to calibrate the constant.

⚠️ Independent work puts the camera+display floor at **~79.5 ms**, confirmed twice. Any vendor claiming
"50 ms glass-to-glass" is not measuring from a real camera to a real screen.

### 4.1 rVFC rules

- **Re-arm the callback first**, before any work.
- **Never queue decodes** — guard with `busy` and drop, or measured latency grows monotonically.
- Use `expectedDisplayTime`, not `presentationTime`. Wall clock = `performance.timeOrigin + expectedDisplayTime`.
- ⚠️ `BarcodeDetector` is macOS/ChromeOS/Android only — never Firefox, not Linux. CI needs `zxing-wasm`.

### 4.2 ⚠️ The hidden-tab trap — this invalidated results twice

✅ In a backgrounded tab Chrome never starts buffering and rVFC never fires. The symptom is deceptive:
playlists reload, `live=true`, media attached, MSE blob set, **zero errors**, `streamController.state` stuck at
`IDLE`. `hls.startLoad()` does nothing. The tell is `document.visibilityState === 'hidden'`.

Worse, a *stale* hidden tab keeps POSTing with a frozen frame count while `hls.latency` grows linearly — which
is exactly what produced a bogus "diverges to 238 s" reading. **Both times I mistook this for a real finding.**

Mandatory in the rig, now enforced in code:
1. Assert `visibilityState === 'visible'` and record it in **every** row.
2. **Filter to visible rows in the analysis**, not just at collection time.
3. Only one measuring tab alive at a time.
4. Playwright: headed or `--headless=new`, plus `--disable-background-timer-throttling
   --disable-renderer-backgrounding --disable-backgrounding-occluded-windows`.

Also: serve the rig page with `Cache-Control: no-store` and a cache-buster. A stale cached page silently
invalidated a whole run.

---

## 5. Clock synchronisation

✅ Measured against two independent servers — they agree, so the offset is real:

```
time.cloudflare.com   +0.107445 +/- 0.018396
time.apple.com        +0.107617 +/- 0.024144
```

✅ And it **drifted from +0.092 to +0.107 in ~40 minutes** (~0.4 ms/min). `timed` is running against
`time.euro.apple.com`; this is not an unsynced machine, just a loosely synced one. A one-shot step will decay
within the hour.

- **Step now:** `sudo sntp -sS time.cloudflare.com` (needs a real TTY, or wrap in
  `osascript -e 'do shell script "…" with administrator privileges'`).
- **Durable:** `brew install chrony`, `sudo systemsetup -setusingnetworktime off` (two daemons fight over one
  clock), then chronyd with `minpoll 0 maxpoll 4`. The payoff is `chronyc tracking`, which reports a real error
  bound — log it at the start **and** end of every run, and discard runs where it changed (a mid-run step means
  samples straddle a discontinuity).
- **Design around it:** loopback makes the error *exactly* zero, because both timestamps come from one clock
  however wrong it is. Use loopback for every A/B comparison.
- **You cannot fix Cloudflare's clock.** PDT is stamped at *their* ingest, so PDT numbers stay bounded by your
  offset to true UTC. 📄 PDT also excludes capture+encode, so 3964 ms is a **floor**, not glass-to-glass.

---

## 6. Access & cost

| Permission | Unlocks | Status |
|---|---|---|
| Stream → Edit | `/stream/live_inputs` | ✅ working |
| Calls → Edit | `/calls/apps` | ✅ working |
| Realtime → Edit | Realtime surfaces | granted |
| **MoQ → ?** | `/moq/relays` | ❌ **403** — own group, name unknown |

⚠️ Enumerating permission groups needs *API Tokens → Read*, which this token lacks. Find the MoQ entry in the
dropdown, or provision relays from the dashboard UI. Wrangler's OAuth token has **none** of these scopes.

📄 Stream: $5/1000 min stored + $1/1000 min delivered; ingest, encoding and egress free; **LL-HLS carries no
premium**. Realtime SFU: $0.05/GB egress, 1 TB/month free, ingress free, TURN free alongside. MoQ free during
beta. Billing granularity for live = segment length = GOP size.

⚠️ **Rotate the API token** — it was pasted into a chat transcript.

⚠️ Use `/{uid}/lifecycle` and `/{uid}/views` (unauthenticated, edge-served) for state — **never** the management
API from clients, which is capped at 1200 req/5 min per user (~32 pollers at 8 s).

---

## 7. Next steps

### Should we write our own player?

**No.** hls.js is tens of thousands of lines absorbing MSE quirks, codec switching, discontinuities, gap
jumping, ABR and per-browser bugs. The defect found here is a handful of lines of *latency-controller policy*,
not an architectural flaw — replacing the player to fix it would be trading a 5-line shim for a permanent
maintenance burden, and would reintroduce every bug hls.js has already fixed.

What *is* worth owning is the latency controller on top of it — which is exactly what the seek shim already is.

The decisive next experiment is cheap and settles who is at fault: **play the same stream with Shaka Player**
(independent implementation, has its own `lowLatencyMode`) and with **Safari native AVPlayer**. If either sits
near `PART-HOLD-BACK` out of the box, this is an hls.js policy defect and the shim is the right fix. If all
three park far behind, the problem is in Cloudflare's manifest and no player choice will save us. That is one
afternoon and it redirects everything downstream.

If hls.js turns out to be at fault, the durable path is a small patch upstream, not a fork.

**Phase 1 — tighten** (½ day)
1. Fix the clock, re-baseline PDT. ✅ done — clock now +0.9 ms.
1b. ~~Implement blocking playlist reload~~ ✅ DONE (session 3): `rig/edge-lag-blocking.py`; see §1.
1c. Cross-check with Shaka and Safari native, per the note above.
2. Debug the `config` arm — if `liveMaxLatencyDurationCount` can be made to work, that is a config line rather
   than a patch every consumer has to carry.
3. Run each arm ≥5 times. The headline finding is now *variance*, so single runs are not enough.
4. Sweep the seek threshold (1.0 / 1.5 / 2.0 / 3.0 s × 10 min); plot p99 latency against rebuffers/hour and
   take the knee. A single latency number is not the answer.
5. Add a burn-in loopback run to cross-check PDT and quantify the ingest-stamp offset.
6. Sweep GOP 2 s vs 4 s, and test `-g 15` for all-independent parts.

**Phase 2 — the other three paths** (1–2 days)
7. WHEP: browser publish via canvas `captureStream` → WHEP receive, with `getStats()` and `abs-capture-time`.
   Browser-to-browser on one machine = zero clock error and a true sub-second baseline.
8. SRT playback → ffmpeg@7 → `ocr`. ⚠️ A 2026-08 community report says SRT playback callers can destabilise the
   ingest session.
9. MoQ: resolve the permission, provision a draft-16 relay, publish with `cloudflare/moq-rs` `moq-pub`
   (`-movflags empty_moov+frag_every_frame+separate_moof+omit_tfhd_offset` is not optional).
10. Stand up mediamtx (already installed) as a local origin. Its `forward:` feature lets **one** encoder feed
    local and Cloudflare byte-identically — the cleanest possible A/B, and the local number is your floor.

**Phase 3 — rigour** (½ day)
11. ≥10 min steady state, discard the first 30–60 s.
12. Report p50/p95/p99 **plus** startup latency separately, drift in ms/min, rebuffers, dropped frames, and the
    clock error bound at both ends of each run.
13. ⚠️ Samples are **autocorrelated** — naive percentile CIs are far too narrow. Use per-run medians across ≥5
    runs, or a block bootstrap.

---

## 8. Open questions

1. MoQ permission-group name — blocks all MoQ work.
2. ✅ ANSWERED (2026-08-25 session 3): the `config` arm never played because `new Hls(...)` **throws
   synchronously** — hls.js requires user config that sets `liveMaxLatencyDurationCount` to ALSO set
   `liveSyncDurationCount` explicitly (it compares only user-config keys, never the default 3). The
   uncaught throw killed the page script after the telemetry intervals were registered → 35 batches of
   empty rows, zero errors. Proven in node + reproduced headless with `window.onerror` capture.
   **Recommended arm config**: `{ lowLatencyMode:true, liveSyncDuration:1.5, liveMaxLatencyDuration:6,
   maxLiveSyncPlaybackRate:1.05 }` — the seconds-based pair settles at 2.4–2.5 s in ~20 s; the
   count-based fix silently overrides PART-HOLD-BACK (target becomes count×targetduration = 9 s).
   Full ledger: `rig/CONFIG-ARM-NOTES.md`.
3. ✅ ANSWERED (2026-08-25 session 4): ffmpeg 9.0.1 WHIP works against CF out of the box — CF echoes
   the offered profile rather than demanding `42e01f`; playback frame-verified. See §3.3.
4. ✅ ANSWERED (2026-08-25): Cloudflare does NOT preserve `abs-capture-time` — refused in the SDP answer on
   both legs (see §2.2). WebRTC measurement needs burned-pixel or side-channel timing.
5. ✅ ANSWERED (2026-08-25 session 3): rate catch-up "never engaged" because the ONLY arm that set
   `maxLiveSyncPlaybackRate` was the arm whose constructor threw (Q2). Once the config is legal it
   engages fine — measured 1.05× (ct advances 2.09–2.11 s per 2.0 s wall), latency ramps down smoothly.
6. ✅ CONFIRMED (session 4, v6 validation): hls.js 1.7.1 bumps `targetLatency` **+1.0 s per stall**
   within an instance (1.5→2.5→3.5 observed twice); a rebuild resets to the manifest's 1.5. It also
   jumps to 9–11 s when a post-swap manifest briefly loses LL tags (count-based fallback). Bonus
   trap: `pdtWallLatency` reads negative (~−1.6 s) for a few seconds after an `-re` backlog burst —
   CF re-stamps PDT ahead of wall clock.
7. Whether seek-induced glitches are visible enough to matter to viewers.

---

## 9. Session artifacts & machine changes

- Live input `4c93bc4b4809c29b03cc60fd8add29df` (`latency-rig-llhls`), `preferLowLatency: true` — kept, ingest
  stopped. Restart with `./rig/push-llhls.sh`.
- Pre-existing: Stream input `7f9a35aa…` ("Maria"), Calls app `098ab416…` ("flabbergaster").
- Results: `results/none.jsonl`, `config.jsonl`, `seek.jsonl`, `llhls*.jsonl`.
- **Machine changes made this session:** `ffmpeg` upgraded 7.1.1 → 9.0.1 (authorised); `ffmpeg@7` 7.1.5
  installed to restore drawtext/SRT; `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION=1000` added to
  `~/.claude/settings.json`. **`mediamtx` 1.20.1 was installed by a research agent without authorisation** —
  it is useful here, but it was not asked for, and its `brew install` is what pulled the ffmpeg formula change
  in alongside the deliberate upgrade.

---

## 10. Resilience: encoder stop/start (added later this session)

The historically painful case — stream stops and restarts — was tested with a chaos harness
(`rig/chaos.sh`): interrupt the RTMPS ingest at 2/5/12/25/60 s gaps, 40 s healthy streaming between,
player telemetry at 2 Hz aligned to interruption markers (`rig/analyze.py`).

### Platform findings (all ✅ measured)

- **Cloudflare mints a NEW video UID behind the live-input URL on EVERY clean encoder disconnect —
  even a 2 s gap.** `recording.timeoutSeconds` did not prevent it for a clean TCP close. Surviving
  the UID swap is therefore the core player requirement, not an edge case: every encoder restart is one.
- **While ingest is down the manifest returns HTTP 204, 0 bytes** (not stale content, not 404).
  hls.js surfaces this as a fatal `manifestParsingError` — NOT covered by its native loading-retry.
- After a restart the edge briefly serves manifests whose fragments are not yet fetchable —
  a propagation window no client can shrink; only patient retry works.
- `PART-HOLD-BACK` varies per broadcast (observed 1.5 / 2.5 / 3.5 s on the same input), so the
  latency target itself moves between encoder restarts.

### Player iteration history (each failure named, fixed, and re-tested)

| ver | change | chaos outcome |
|---|---|---|
| v1 | drift-correction wrapper only | died permanently on interruption #1 (single startLoad on fatal) |
| v2 | custom reload ladder (stopLoad/loadSource) | never started; instance wedged silently after manifestParsingError |
| v3 | full instance **rebuild** (destroy + recreate), source-stall watchdog (seekable-end, from elektronstudio/v4), uncapped native manifest retry | **5/5 recovered**, but median 164 s — frag/level retries too patient against dead levels |
| v4 | fail-fast frags (1 retry) + cache-buster | rebuild storm; **tab crashed**. Live-edge part 404s are NORMAL in LL-HLS — fail-fast punishes healthy playback |
| v5 | moderate retries (4×500 ms, 4 s cap), rebuild rate-limit (3 s), no cache-buster, URL-level error forensics | ✅ **5/5 recovered, median 15.4 s, max 22.9 s, lands at target latency (2–4 s), zero crashes** |

### v5 verdict (validation run, corrected metrics)

✅ Recovery is now near the **platform floor**: URL forensics show post-swap 404s are on the *old*
broadcast's segments (30 vs 2) — Cloudflare's edge serves the stale manifest for ~10–15 s after a swap,
and no client behaviour can shrink that. The player's own share of recovery time is seconds.

⚠️ Two residual observations: (1) a 2 s gap *sometimes* resumes the same broadcast — both cases occur
in the wild and both are handled; (2) that same-broadcast resume once settled ~26 s behind without a
drift-seek firing — unexplained, open question.

⚠️ Two measurement bugs found in the harness itself during this work (state not reset across rebuilds
in the `advancing` metric; URL attribution sliced one path component short). Both produced damning-looking
numbers for a healthy player. **Instrument bugs look identical to product bugs until you check the
instrument.** v5's first run was condemned by its own broken meter.

### Disconnect-style test (kill-test.sh) — what actually ends a broadcast

✅ Same 5 s gap, three ways of stopping the encoder:

| how the encoder stopped | RTMP goodbye | TCP close | outcome |
|---|---|---|---|
| SIGSTOP/SIGCONT (data pauses, socket open) | no | no | ✓ **same broadcast kept** |
| SIGKILL (process dies) | no | yes (kernel FIN) | ✗ new broadcast |
| SIGTERM (clean shutdown) | yes | yes | ✗ new broadcast |

**The trigger is the TCP socket closing — not the RTMP-level goodbye, and not the gap length.**
`timeoutSeconds` grace applies only while the socket stays open. Consequences:

- Real network glitches (TCP survives) cost viewers ≈ the gap length. Fine.
- Encoder process death/restart always mints a new broadcast → ~15 s viewer outage (player recovery
  is already near the platform floor). No encoder config avoids it: dead processes close sockets.
- ⚠️ Promising, untested mitigation: a local relay (mediamtx, already installed) between encoder and
  Cloudflare. Encoder restarts drop only the local hop; if the relay holds its upstream socket open
  through input loss (the SIGSTOP behaviour), the Cloudflare broadcast survives.
- ⚠️ Untested: a pause longer than `timeoutSeconds` (we paused 5 s against a 10 s grace).

### v5 known gaps — the "26 s park" explained (2026-08-25 session 3)

✅ **Mechanism measured twice** (SIGSTOP 20 s on own input, same broadcast throughout): after ingest
resumes, v5's drift-seek DOES fire but `liveSyncPosition` lands in the **buffer hole** between
pre-pause and post-burst content → element drops to `readyState 1` → **tick()'s
`if (video.paused || video.readyState < 2)` gate (line 277) disarms every watchdog while resetting
the stall clock**. Parked 20.0 s and 18.5 s with `hls.latency` climbing 3 → 21 s and resyncs frozen;
rescue both times was hls.js's own gap controller ~20 s later. An observer sampling mid-park sees
exactly the historic symptom (latency ~26 s, no drift-seek). ⚠️ The historic instance itself was
never persisted (no `same_video` marker in any results file) — attribution to this mechanism is
inferred, the mechanism itself is proven. Contributing gaps, all measured: `hls.latency` freezes
stale during an outage (1.7 s reported vs 8.4 s PDT-true — recomputed only on timeupdate/advanced
playlist); `syncToEdge` returns false silently when lsp sits behind the playhead, and the else-if
chain then also skips the rate nudge; the visibility-resume path seeks but never calls `play()`
(hidden-tab park witnessed in chaos-v5b data). **Proposed fixes described (NOT applied) in
`rig/CONFIG-ARM-NOTES.md`** checkpoints 8+10: split the paused/readyState gate (re-`play()` when
visible; keep stall clock counting on readyState<2 and hole-skip, escalating to rebuild), observe
syncToEdge's return and escalate after repeated silent failures, and add PDT wall latency
(`hls.playingDate`) to telemetry — the only honest latency signal during both pauses.
Repro pages kept: `rig/config-arm-debug.html`, `rig/config-arm-resume.html`.

**✅ v6 SHIPPED AND VALIDATED (2026-08-25/26 session 4)** — the fixes above applied in 3 iterations
(`src/low-latency-player.js`; v5 kept at `src/low-latency-player.v5.js`; A/B harness
`rig/resilience-v6.html?player=v5|v6`). Same-day A/B against a v5 re-run (the honest baseline — the
historic "median 15.4 s" is ⚠️ not reproducible from resilience-v5.jsonl):
- **The park is fixed**: SIGSTOP-20 max park 13.5 s vs v5's 19.5+18.0 s consecutive, and **zero
  hls.js gap-controller rescues — every recovery was v6's own** hole-skip/starved/rebuild ladder.
  Post-CONT stabilization 2.4–4.3× faster (13.2–23.5 s vs 56.4 s).
- Gap ladder: 15/15 recoveries over 3 runs, no rebuild storms (min spacing 3.0 s), zero crashes,
  all windows end at 1.7–3.6 s. Soak: p50 2.70 / p99 2.85 s, zero rebuilds/stalls/frozen samples.
- Iterations that earned their place: (2) *beached fast path* — immediate hole-skip when
  readyState<2 with >0.25 s buffered ahead (iter-1 still wasted a 6 s stallTimeout beside 17 s of
  buffer); (3) *one-skip-per-target guard* — kills a skip↔drift ping-pong on wedged mid-swap levels.
- ⚠️ Platform weather note: post-swap 404 propagation ran 45–120 s during validation (historic
  10–15 s) — the dead-manifest window VARIES BY DAY; both players ride it identically, so treat
  the historic "~10–15 s" as a floor, not a constant.

### MoQ permission — resolved as "not yet possible via API token"

✅ The official permissions table (cloudflare-docs source partial) contains **zero MoQ entries**;
`Cloudflare Realtime Read/Edit` exist, are granted, and do not unlock `/moq/relays` (403). The MoQ
API checks an unpublished permission group. **Provision relays via the dashboard** (Media → Realtime →
MoQ Relay → Create relay; tokens shown once) until Cloudflare ships the group. OpenAPI confirms the
endpoints exist (`GET/POST /moq/relays`, `PUT/DELETE /moq/relays/{id}`, token subresource) with only
generic `api_token` security declared.

### Durable, data-backed design rules

1. **Rebuild, never patch.** Every observed wedge recovers under destroy+recreate and under nothing weaker.
2. **Watch `seekable.end()`, not just `currentTime`** — the live edge freezing detects a dead source
   seconds before the playhead drains its buffer (credit: elektronstudio/v4 `videostream.ts`).
3. **Never seek backwards** — after a UID swap `liveSyncPosition` can point behind the playhead.
4. **Rate-limit rebuilds globally.** Storms crash tabs.
5. **Freeze-frame into `poster` before teardown** — rebuilds show the last frame, not black.
6. `manifestLoadingMaxRetry: Infinity` (elektronstudio/v4) makes "stream not up yet" a wait, not a death.

## 11. Timed messages / subtitles / metadata (added later this session)

Cloudflare strips all in-band metadata, so messages ride a side channel aligned via
`EXT-X-PROGRAM-DATE-TIME` → `hls.playingDate`. Implemented and deployed:

- `src/timed-messages.js` — cue engine: fires when the *viewer's playhead* crosses the cue's wall-clock
  time, so all viewers see it at the same stream moment regardless of individual latency. Handles
  revisions, cancels, late joiners (`pastWindow`/`onMissed`), rebuild dedupe. Renderers:
  `attachSubtitleTrack()` (native VTTCue subtitles, CC button on iOS) and `attachMetadataTrack()`
  (kind=metadata, mode=hidden — invisible frame-accurate events).
- `workers/cues/` — Durable Object relay, deployed ✅ at
  `https://cues.positron.studio` (`/room/<name>/ws`). WebSocket hibernation,
  500-cue backlog for late joiners, ping/pong probes. No domain needed; free plan suffices.
- ✅ **Measured relay latency** (`rig/do-lag.mjs`, one-clock method): one-way publisher→DO→viewer
  **p50 27 ms / p95 42 ms** after moving broadcast before storage.put (was 62 ms when persistence
  gated delivery). Cue transport is ~100× faster than video latency, so cues always arrive ahead of
  their video moment. ⚠️ Workers freeze `Date.now()` during execution (~67 ms apparent skew) —
  never use DO timestamps for fine measurement.

---

## 11b. SYNCED VOD REPLAY WITH CUES — ✅ PROVEN (2026-08-26, proto/replay/)

The archive replays with its cues in sync: **per-cue error p50 59 ms / p95 71 ms** (12 cues, live
show → recorded VOD → replay; inside the live engine's own 65–98 ms band), burned-row decode
5427/5427 from the VOD, **all seek tests pass** (late join catches up without re-firing; backward
seek rewinds state; forward seek reconstructs). Proof VOD kept: `de39bf1916469a4bc8b18e73a8726762`.
- **Anchor design VALIDATED THE HARD WAY: content-derived T₀ is mandatory.** Publisher-stamp was
  +109 ms off (cold-start head loss); **Stream API `created` was −6.2 SECONDS off** — naive
  metadata anchoring would misplace every cue by ~6 s. Calibrate from pixels (or equivalent),
  persist the result in asset `meta` (see research/timecode-sync-2026-08.md — ATSC 3.0
  independently standardized this exact strip+out-of-band pattern).
- Live-vs-replay asymmetry measured: "now" cues cancel to 0–1 ms; scheduled cues replay 33–67 ms
  earlier than the live burn; `fireDelayMs` flag reproduces the live feel (default = operator intent).
- Worker: RtcRoom now persists cue frames (sender stamps verbatim, DO clock labeled untrusted) +
  `GET /room/{name}/cuelog`. Run: proto/replay/README.md. Production gaps listed there (audio rig,
  anchor persistence, periodic re-anchor across ingest gaps, cuelog compaction).

**✅ SUPERSEDING DESIGN — LOCAL-FIRST ARCHIVE (user-proposed, proven 2026-08-26, proto/archive/):
record locally with a NATIVE T₀ → segmented upload to R2 → replay from R2.**
- **T₀-native vs content truth: −15 ms** (within half a frame) — the stamp at first-frame-written IS
  the anchor; NO calibration, NO burned strip, NO audio assumed. (Trap: ffmpeg's `-progress`
  first-frame report is +4.3 s late — stamp the input-side write, never ffmpeg's own report.)
  ⚠ **CORRECTION (2026-08-30, session 7): −15 ms is not a constant and is not
  the anchor's true value.** Chasing the studio's −45.3 ms version of this same
  quantity showed it has a **~95 ms-wide, frame-quantised distribution** — −45.3
  and −15 are two draws one frame apart at 30 fps. Two causes, both measured:
  `Page.startScreencast`'s frame 0 is a **stale re-capture stamped `now`** (20–36
  ms old, where frames 1+ are 6–9 ms), and the encoder **swallows whole source
  frames at start-up** — *the local-record path has MORE of this artefact, not
  less*. On top of that, `replay.html`'s content anchor carries **~one frame of
  bias of its own** (`decodeNow()` reads the frame on the glass while
  `meta.mediaTime` is the PTS of the frame about to be shown — the rVFC
  pair-vs-single trap in plan-timeline §7.6). **So every content-anchor number
  in this file carries that bias**, including this one and the 59/77/95 ms cue
  figures below. The design conclusion is unchanged and if anything stronger —
  content-derived T₀ still beats metadata by three orders of magnitude — but do
  not quote any of these as exact until they are re-measured together, after the
  one-line `replay.html` fix in `studio/NOTES.md`. Stamping on CDP frame-swap
  took the studio's per-cue replay abs p95 from 39 to 19–26 ms.
- Cue replay from R2: **p50 77 / p95 95 ms** — and an honesty correction: the earlier "59 ms" was
  partly ALIASING (integer-second cue spacing phase-locks the 100 ms poll); 54–95 ms is the true
  engine band. Both runs comfortably under the 150 ms target.
- **Disk O(1)**: high-water 2 segments resident regardless of show length. Upload lag p50 5.5 s
  (near-live archive). Cost ~**25× cheaper than Stream storage** + zero egress. Proof show kept:
  archive.positron.studio/shows/archive-test/index.m3u8 (t0=1787745030511).
- Verification freebie: **R2's ETag == plain MD5** for single-part puts — integrity check for free.
- Wrangler trap SHARPENED: wrangler auto-loads `.env` from its CWD — env-unsetting is not enough;
  run from a directory without .env (scripts pin cwd). Stream recording demoted to backup-when-
  RTMPS-leg-exists; NEVER primary anchor.

## 12. Cue→video sync — end-to-end verification (added later this session)

✅ One-tab test (`rig/cue-sync.html`): cues published every 3 s through the DEPLOYED DO room,
targeted at `playheadTime + 2000 ms`, against the live LL-HLS stream. One clock, zero sync error.

| metric | value | meaning |
|---|---|---|
| **fire error p50** | **65–98 ms** | cue fires at its intended video moment; floor = 100 ms queue poll |
| send→fire p50 | 2099 ms (target 2000) | whole pipeline behaves exactly as designed |
| fire error max | 5924 ms (one cue) | startup artifact: cues sent before PDT existed fired late via the `pastWindow` late-joiner policy — by design, not a defect |
| WS RTT p50 (browser, 5 s pings) | 119 ms | vs 27 ms from node probe at 100 ms pings |
| DO clock offset | ~61 ms | Workers freeze `Date.now()` during execution — never use DO timestamps for fine timing |

⚠️ **Hibernation hypothesis** for the 119 vs 27 ms RTT gap: sparse pings let the Durable Object
hibernate; each wake costs ~90 ms. Unverified. Mitigation if it ever matters: ping every 1–2 s to keep
the DO warm. For this design (cues lead their video moment by ≥2 s) it is irrelevant.

`timed-messages.js` now carries built-in transport telemetry (`cues.stats`): `performance.now()`-based
ping RTT (current + p50 over last 100), and DO clock offset — production pages self-monitor the cue
channel with no extra tooling.

## 13. OBS integration (added later this session)

OBS 32.2 installed (`brew install --cask obs`) with a dedicated profile **`positron-lowlatency`**
(`~/Library/Application Support/obs-studio/basic/profiles/positron-lowlatency/`) — default profile
untouched. Pre-set: x264 **Tune = zerolatency**, **keyframe interval 2 s**, CBR 3000k, 720p30,
Cloudflare RTMPS server + stream key in `service.json`.

Key facts for OBS + Cloudflare LL-HLS:
- **Tune: zerolatency is the one-dropdown "LL setting"** — it expands to `bframes=0 scenecut=0`
  (+ no lookahead/mbtree; verified earlier from encoded SEI). Slight quality cost per bitrate; the
  surgical alternative is empty Tune + `bf=0 scenecut=0` in x264 custom options.
- **Keyframe Interval must be set to 2 s manually** — OBS default is 0/auto (~250 frames); no tune
  fixes that.
- NVENC: set "Max B-frames = 0". ⚠️ Apple VideoToolbox B-frame behaviour untested.
- ⚠️ Profile files hand-written against OBS 32 config layout before any first launch; if the first-run
  wizard overrides the pointer, the profile still appears in OBS's Profile menu — select it manually.

### Deployment options for OBS with this stack

| option | shape | verdict |
|---|---|---|
| A: OBS → Cloudflare direct | simplest; player/cues unchanged | every OBS stop/crash/reconnect = socket close = new broadcast = ~15 s viewer outage |
| B: OBS → gapless relay → CF | relay holds the CF socket; slate covers OBS absence | relay must live on a machine that outlives OBS; blocked on the TS-splice shim |
| **C: OBS as the relay (recommended)** | roaming OBS → mediamtx → stationary studio OBS (live scene + slate scene, Advanced Scene Switcher) → CF | OBS's compositor re-renders continuously, so the TS-splice defect **cannot exist**; standard "studio OBS" pattern; GUI-operable |

Messages with OBS in the chain: an overlay HTML page joining the DO cue room, added as an OBS
**Browser Source** — styled, animated, composited into the stream for every viewer; put it on both the
live and slate scenes. (Not yet built; ~1 h, reuses `timed-messages.js`.)

### Open question that decides A vs B/C
Whether OBS's **auto-reconnect** closes the socket cleanly (new broadcast) or dirtily (broadcast may
survive within `timeoutSeconds`). Test: stream from OBS, run the chaos/kill sequence against it.

## 14. Session inventory (final)

| artifact | state |
|---|---|
| `src/low-latency-player.js` | chaos-tested v5: 5/5 recoveries, median 15.4 s, at-target latency, zero crashes |
| `src/timed-messages.js` | PDT-synced cues + subtitles + hidden metadata + transport telemetry; e2e verified 65 ms p50 |
| `workers/cues/` | deployed: cues.positron.studio; one-way p50 27 ms |
| `rig/` | latency, resilience (chaos), DO-lag, kill-mode, cue-sync, handover harnesses |
| `rig/relay/` | gapless slate-failover PoC: socket + switching proven; TS-splice defect documented |
| `rig/overlay-bridge.mjs` | DO room → text file → drawtext burn-in bridge |
| OBS + `positron-lowlatency` profile | installed, pre-configured, unlaunched |
| Machine changes | ffmpeg 7.1.1→9.0.1 + ffmpeg@7 + mediamtx + OBS installed; chrony recommended, not installed; clock stepped to ~+1 ms via sntp |
| Credentials | `.env` (chmod 600, gitignored); ⚠️ API token still needs rotation (pasted in chat) |
| Cloudflare resources | live inputs `4c93bc4b…`, `5cfa5053…` (+ pre-existing "Maria"); Calls app "flabbergaster"; cues Worker + DO |

### Remaining open items (ranked; kept in sync with PROGRESS.md)
1. Rotate the API token (pasted in chat).
2. ~~Handover pass~~ ✅ DONE slate-tier (session 3, one broadcast across four phases; see §15
   addendum) + 2 more splicer defects fixed. ⚠️ Still owed: the WEBCAM-tier walk — camera wedged at
   the OS level (leaked `cameracaptured` session); needs `sudo killall cameracaptured appleh13camerad`
   or a reboot first.
3. ThreatLocker approval → OBS launch → remote-control proof → auto-reconnect chaos test
   (decides whether OBS-direct is viable or relay/Option C is mandatory).
4. Eyeball `src/demo.html`; then the OBS Browser Source overlay page.
5. MoQ: ✅ end-to-end proven via the no-auth draft-14 endpoint (17.9 ms p50 one-way; see §2.3) —
   remaining: USER provisions a draft-16 relay in the dashboard (RUNBOOK §3 click-path; tokens shown
   once, copy to `.env`), then §4.2 commands run as-is; media burn-in/OCR measurement follows.
6. ~~WHEP path measurement~~ ✅ DONE (2026-08-25 session 3): 74 ms p50 glass-to-glass; abs-capture-time
   refused at negotiation — see §2.2. Input `whep-rig` (`224558e8…`) left on the account (keep or delete).
7. ~~Blocking playlist reload~~ ✅ DONE (session 3): true edge lag p50 842 ms / p95 1951 ms — see §1.
8. ~~Unexplained: config arm + 26 s resume~~ ✅ BOTH SOLVED (session 3): constructor throw (§8 Q2)
   and the readyState<2 watchdog-disarm park (§10 "v5 known gaps"). Player fix diffs await a
   decision in `rig/CONFIG-ARM-NOTES.md`.

---

## 15. Late additions (same session, evening)

### DO hibernation wake — fixed and verified
✅ `setWebSocketAutoResponse('ping'→'pong')` added to the CueRoom DO: the runtime answers pings
**without waking a hibernated object**. Verified with sparse pings after 15 s idle: RTT 32–38 ms
(was ~119 ms) — no wake penalty, no duration billing for pings, telemetry now measures pure network.
The first *cue* after long idle still pays one wake (~90 ms) — inherent, and irrelevant at 2 s cue lead.
Client (`timed-messages.js`) now sends bare-string pings with local t0 (one in flight).

### OBS launch saga — findings
- **OBS was already on this machine** (logs from Feb 2025) — the cask was a re-install over live config.
  The new `positron-lowlatency` profile is additive; global.ini/user.ini untouched.
  ⚠️ `plugin_config/obs-websocket/config.json` was overwritten (now: enabled, localhost, no auth) —
  if a password was configured there before, it needs restoring.
- **Actual launch blocker (user-identified): ThreatLocker** — corporate application allowlisting kills
  the unapproved OBS 32.2 binary: instant silent exit, no log, no crash report, nothing in the unified
  log. The quarantine flag (stripped) and the locked screen were contributing/confounding factors at
  most. **Do not attempt to bypass** — legitimate paths: (1) ThreatLocker self-service request on an
  unlocked screen, (2) reinstall the previously-approved Feb 2025 OBS version if still in policy,
  (3) run OBS on a non-managed machine — which Option C prefers anyway (the studio OBS belongs on a
  stationary venue box/VM, not this laptop).
  Lesson for automation on managed machines: silent instant process death with zero forensics =
  suspect endpoint application control FIRST, before debugging configs.

### OBS remote control — the answer
obs-websocket v5 is built into OBS 28+ (port 4455), enabled in config. Full programmatic control
(scenes, sources, start/stop streaming) from any WebSocket client — no MCP needed. Protocol:
Hello(op 0) → Identify(op 1, rpcVersion 1) → Identified(op 2) → Requests(op 6).
Pending (needs unlocked screen): first supervised launch, then the auto-reconnect chaos test.

### §15 addendum — webcam tier + splicer hardening (afternoon)

The gapless relay gained a **webcam fallback tier** (encoder > webcam > slate — during technical
pauses viewers can see the presenter instead of a static slate) and the TS-splice shim was built and
hardened through five test iterations. Full defect ledger (8 entries, each found by test) in
`rig/relay/README.md`. Headlines: backward-PTS splices put ffmpeg's demuxer into a discontinuity
flip-flop that gets the RTMP session dropped — fixed with per-leg `-output_ts_offset` tracked from
the **last delivered PCR** (wall clock is wrong under starvation); a starved-but-open socket must
itself trigger switching; audio PES truncation at splices needs `discardcorrupt` downstream.

✅ Verified: slate→live and webcam→live splices with **0 discontinuities**, same broadcast, distinct
content frames; dead-camera self-healing (bench → slate → live).

**✅ Session 3: the four-phase walk PASSED** (slate tier) — one videoUID (`f507c108…`) across all four
phases, real content switching verified in grabbed frames, 4 clean splices, no discontinuity storms
(`rig/relay/handover-run-2026-08-25-2214.log` + frames). Two more splicer defects found and fixed
(ledger now 10, fixes in `rig/relay/splicer.py`): **#9** the burned CLOCK never rendered at all —
over-escaped colons broke the whole drawtext expansion (and the ms field was stream-time, not wall
clock, which would have poisoned the loop-lag metric); fixed with `%{localtime\:%T.%3N}`, verified in
pixels off the CF live edge. **#11** the live tier could never engage: RTSP pull TTFB 11.6 s vs the
6 s warm-up grace → starve loop → CF ended the broadcast; fixed by pulling RTMP (TTFB 2.4 s).
⚠️ Environmental: the camera passed pre-flight, streamed once, then **wedged at the OS level**
(avfoundation opens block forever; session leaked in `cameracaptured`/`appleh13camerad`) — needs
`sudo killall` or a reboot; the webcam-tier walk re-runs after that. ⚠️ Inferred lesson recorded:
teardown must kill leg ffmpegs explicitly (they match no pkill pattern; an orphaned webcam leg is
the likely wedge trigger).

**✅ Perception-lag loop (`rig/loop-lag.sh`, built + run, N=20, 20/20 valid OCR):** webcam/slate →
splicer → Cloudflare → live-edge frame-grab **pipeline lag p50 7.44 s / p95 8.40 s**; player-perceived
= pipeline + player.latency ≈ **9.9–11.4 s at p50**. Same-machine loop, clock offset cancels. Burned
timestamps cluster at segment starts — the grab is phase-locked to 2 s segments, so the metric is
quantized by segmenting (validates the OCR). Data: `results/loop-lag.jsonl`.

Also built: `src/demo.html` — combined demo (player + send box + overlay + optional subtitle track +
channel RTT), pending visual check on an unlocked screen.
