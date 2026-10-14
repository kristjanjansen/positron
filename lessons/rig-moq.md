# rig-moq

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `rig/moq/mtx/build-shim.sh`

### build-shim

Above `set -e`, lines 2 to 6 before the cut.

~~~sh
# Bundle the §12 shim player + post-bundle patch:
# mediamtx 1.20.1 rejects ANY SUBSCRIBE parameter except AuthorizationToken
# ("unsupported parameter type: 16" = FORWARD 0x10) and closes the session —
# so strip @moq/net's v15+ SUBSCRIBE params (priority/order/forward/filter).
# draft-14 (CF bonus) uses fixed fields, not params -> unaffected.
~~~

## `rig/moq/mtx/playserver.py`

### playserver-fp

Above `return subprocess.run(`, lines 28 to 30 before the cut.

~~~python
# mediamtx's HTTP/3 (WebTransport) listener ALWAYS uses its own in-memory
# JIT ECDSA P-256 cert (14-day validity, rotated) — moqServerCert only
# covers the HTTP/2 side. So proxy the live fingerprint at request time.
~~~

## `rig/moq/spike/mgrid-deathdrive.sh`

### mgrid-deathdrive

Above `set -e`, lines 2 to 6 before the cut.

~~~sh
# Drive ONE publisher-death round (RUNBOOK §13 phase 3).
# Usage: mgrid-deathdrive.sh <round>    e.g. 1
# Precondition: victim publisher p10 runs ALONE in Chrome udd moq-mgrid-victim<round>-udd.
# SIGKILLs the victim's whole Chrome tree (no clean QUIC close), timestamps the kill,
# waits for probe close/silent events, then relaunches the victim fresh (rejoin timing).
~~~

### mgrid-deathdrive-relaunch

Above `NR=$((R+1))`, lines 28 to 28 before the cut.

~~~sh
# relaunch victim fresh (rejoin) — new udd for the NEXT round number
~~~

## `rig/moq/spike/mgrid-flipdrive.sh`

### mgrid-flipdrive

Above `set -e`, lines 2 to 6 before the cut.

~~~sh
# Drive ONE viewer->publisher flip (RUNBOOK §13 phase 2).
# Usage: mgrid-flipdrive.sh <flipId>   e.g. f1
# Launches a fresh flip viewer Chrome, waits for it to be steady-viewing,
# POSTs the publish command (timestamped), waits for probes to decode it,
# then tears the flip page down and removes its namespace from the roster.
~~~

## `rig/moq/spike/mgrid-rung.sh`

### mgrid-rung

Above `set -e`, lines 2 to 7 before the cut.

~~~sh
# Launch one multi-publisher ladder rung (RUNBOOK §13).
# Usage: mgrid-rung.sh <N> <rungname> <idprefix> [pubs_per_page]
# Kills ONLY moq-mgrid-* Chromes, clears the roster, launches probes first,
# then ceil(N/K) publisher pages of K co-tenant pipelines each.
# idprefix MUST be fresh per rung: CF draft-14 pins a namespace to the FIRST
# announce; after an unclean kill the name is dead for minutes (§13 finding).
~~~

## `rig/moq/spike/mgridserver.py`

### mgridserver

Above `import http.server, socketserver, sys, os, json, threading, time`, lines 2 to 11 before the cut.

~~~python
# MULTI-PUBLISHER grid rig server (RUNBOOK §13). Port 8887 (this agent's port).
# - static files from www/
# - POST /log            -> append logs/moq-mgrid.log (+ stdout)
# - POST /jsonl/<name>   -> append results/moq-mgrid-<name>.jsonl (repo results/)
# - GET  /roster         -> {"pubs":[ns,...],"v":N}  (the draft-14 discovery shim:
#                           no SUBSCRIBE_NAMESPACE on CF -> local registry; production
#                           discovery would ride the RtcRoom DO)
# - POST /roster         -> {"action":"add"|"remove"|"clear","ns":...}
# - GET  /cmd?id=X       -> latest command for X or {}
# - POST /cmd            -> {"id":X, ...} stored (server adds tSrv ms)
~~~

## `rig/moq/spike/src/d16-announce.js`

### d16-announce

Above `import { Connection, Path } from "@moq/net";`, lines 1 to 4 before the cut.

~~~js
// Draft-16 SUBSCRIBE_NAMESPACE headline test (§14.4): subscribe to a namespace PREFIX
// BEFORE any publisher exists; when a publisher appears, measure announce->track-available.
// Also logs announce-withdrawal (active=false) timing for the death re-check.
// Params: ?relay= (token URL, redacted in logs) &prefix= &dur=seconds
~~~

### d16-announce-race

Above `setTimeout(() => { log("DUR_END"); ann.close(); }, DUR * 1000);`, lines 98 to 98 before the cut.

~~~js
// NB: no Promise.race with ann.next() — an orphaned next() eats events.
~~~

## `rig/moq/spike/src/d16-budget.js`

### d16-budget

Above `import { Connection, Path } from "@moq/net";`, lines 1 to 4 before the cut.

~~~js
// Draft-16 subscribe-budget re-check (§14.5): churn N subscribes to NONEXISTENT
// namespaces on ONE session, then acquire a LIVE broadcast on the same session.
// Draft-14 behavior (§13.4): ~40-60 churned subscribes exhaust the session permanently.
// Params: ?relay= &churn=60 &live=d16budget/live
~~~

## `rig/moq/spike/src/mgrid-flip.js`

### mgrid-flip-header

Above `import { Connection, Path, Broadcast } from "@moq/net";`, lines 1 to 7 before the cut.

~~~js
// MULTI-PUBLISHER grid: viewer -> publisher FLIP page (RUNBOOK §13, "spotlight
// from the crowd" on MoQ). Starts as a pure viewer: subscribes to ALL roster
// publishers (decodes everything, posts nothing per-frame). Polls /cmd?id= every
// 100 ms; on {action:"publish"} it starts publishing its own canvas on its own
// namespace over the SAME MoQ connection, then registers in the roster.
// Timestamps (same host clock as driver+probes) as {k:"flip",id,ev,t} rows.
// Params: ?id=f1 &name=flips &relay=
~~~

## `rig/moq/spike/src/mgrid-probe.js`

### mgrid-probe-header

Above `import { Connection, Path } from "@moq/net";`, lines 1 to 8 before the cut.

~~~js
// MULTI-PUBLISHER grid: probe viewer (RUNBOOK §13). Subscribes to ALL publishers
// in the local roster (polled every 1 s — the draft-14 discovery shim), decodes
// every burned row, posts per-publisher JSONL samples to the :8887 collector.
// Rows: {k:"f",pub,t,d} frame g2g | {k:"seen"/"cat"/"first",pub,t} discovery chain
//       {k:"race",pub,phase,att} subscribe race | {k:"close",pub,t,err} track close
//       {k:"silent",pub,t,gap} silence watchdog | {k:"ps",...} per-pub stats
//       {k:"s",...} page stats
// Params: ?name=<rung> &probe=<probe1> &relay= &rowless=1 (skip row decode)
~~~

## `rig/moq/spike/src/mgrid-pub.js`

### mgrid-pub-header

Above `import { Connection, Path, Broadcast } from "@moq/net";`, lines 1 to 10 before the cut.

~~~js
// MULTI-PUBLISHER grid: lightweight publisher page (RUNBOOK §13).
// Co-tenancy: ONE page runs K publisher pipelines (?ids=p1,p2,p3,p4,p5) — each
// pipeline has its OWN Connection (own WebTransport/QUIC session, so relay
// fan-in semantics = one session per publisher), own namespace
// positron-mgrid-p{N}, own 320x180@15 canvas (id + burned-ms row), H.264
// baseline annexb ~300 kbps, catalog republish every 2 s (§7.1 trap 1).
// Self-registers each ns into the local roster (draft-14 has no
// SUBSCRIBE_NAMESPACE -> discovery shim). headless=new rejects multiple URLs
// ("Multiple targets are not supported") — hence in-page co-tenancy.
// Params: ?ids= &relay= &fps= &bitrate= &statsms= &noroster=1
~~~

## `rig/moq/spike/src/play-4k.js`

### play-4k-header

Above `import { Connection, Path } from "@moq/net";`, lines 1 to 5 before the cut.

~~~js
// Resolution/framerate MATRIX measurement player (RUNBOOK §9). Same pipeline as
// the deployed safari-play.js (catalog retry -> codec from catalog -> VideoDecoder
// -> drawImage onto a 1280x720 canvas -> burned-row decode) but instrumented:
// per-frame g2g deltas + per-second stats batched as JSONL to POST /jsonl/<name>.
// Query params: ?ns= &relay= &name= &codec=
~~~

### play-4k-row

Above `const NBLOCKS = 56, BLOCK_W = 20, ROW_X = 40, ROW_Y = 100, ROW_H = 80;`, lines 15 to 16 before the cut.

~~~js
// Burned row geometry — 1280x720 reference grid (frame is always drawn scaled
// onto a 1280x720 canvas, so this works for any source resolution).
~~~

## `rig/moq/spike/src/play-audio.js`

### play-audio-header

Above `import { Connection, Path } from "@moq/net";`, lines 1 to 10 before the cut.

~~~js
// AUDIO SPIKE measurement player (RUNBOOK §10): subscribes positron-audio-test,
// decodes BOTH tracks (VideoDecoder -> canvas + burned-row read; AudioDecoder ->
// WebAudio jitter-buffered playback), and measures:
//   aLat      = audio "glass-to-glass" analog: decode-output wall - tick wall time
//   aPlayLat  = tick wall -> the moment the tick emerges from the WebAudio graph
//               (scheduled ctx time mapped back to wall; excludes device output latency,
//               reported separately as ctx.outputLatency)
//   skew      = aLat - rolling-median video g2g (positive = audio behind video)
//   underruns = late/dropped audio chunks + total gap ms
// One JSONL row per detected tick -> POST /jsonl on the local server.
~~~

### play-audio-ts

Above `const inTsQ = [];`, lines 145 to 148 before the cut.

~~~js
// Chromium's AudioDecoder regenerates output timestamps by accumulating
// sample counts from the first chunk — a content skip at join becomes a
// permanent timestamp offset. Opus 20ms-in/20ms-out is 1:1, so map encoded
// chunk timestamps through a FIFO and use THOSE as media time.
~~~

### play-audio-mono

Above `const pcm = new Float32Array(ad.numberOfFrames);`, lines 167 to 167 before the cut.

~~~js
// pull samples (mono is enough — channels are identical)
~~~

## `rig/moq/spike/src/play-mtx.js`

### play-mtx-header

Above `import { Connection, Path } from "@moq/net";`, lines 1 to 12 before the cut.

~~~js
// §12 CATALOG SHIM player: one browser player that consumes BOTH non-hang MoQ
// catalog dialects through @moq/net, bridging the gap §7 identified:
//   - mediamtx 1.20.1 (drafts 16-19): track ".catalog" = draft-ietf-moq-msf-00
//     JSON, packaging "loc", video = raw AVCC access units (one frame per MoQ
//     group, avc3 in-band params), audio = raw Opus packets (one per group).
//   - IETF moq-pub / Cloudflare (draft-14): track ".catalog" = WARP moq-catalog
//     v1 JSON, packaging "cmaf", video = moof+mdat fMP4 fragments (group per
//     GOP), init segment in a separate track ("0.mp4").
// Measurement: burned-ms binary row (video g2g) + 2 kHz 500 ms-boundary audio
// ticks (aLat, A/V skew) — same rigs as §7-§10.
// Params: ?url=<moq server/relay> &ns=<namespace> &dur=90 &fp=1 (fetch
//   /fingerprint from page origin and pin it) &noaudio=1 &nomeasure=1
~~~

## `rig/moq/spike/src/play.js`

### moq-play

Above `import { Connection, Path } from "@moq/net";`, lines 1 to 5 before the cut.

~~~js
// Media-layer spike PLAYER: CF draft-14 relay -> @moq/net subscribe ->
// hang catalog + legacy container -> WebCodecs decode -> canvas -> burned-row read.
// Modes: default = hang player (catalog.json -> video rendition).
//        ?track=NAME&raw=1 = subscribe an arbitrary track and hexdump first frames
//        (for probing what an IETF moq-pub broadcast actually carries).
~~~

## `rig/moq/spike/src/positron-vendor.js`

### positron-vendor

Above `export { Connection, Path, Broadcast } from "@moq/net";`, lines 1 to 4 before the cut.

~~~js
// Vendor bundle for demo 08. Only the surface the demo actually uses, so the
// page itself stays readable like every other demo (hls.min.js plays the same
// role for 06). Bundled in Docker because native esbuild is SIGKILLed by
// ThreatLocker on this machine — rig/moq/RUNBOOK.md §3.5.
~~~

## `rig/moq/spike/src/pub-4k.js`

### pub-4k-header

Above `import { Connection, Path, Broadcast } from "@moq/net";`, lines 1 to 5 before the cut.

~~~js
// Resolution/framerate MATRIX publisher (RUNBOOK §9). Parameterized clone of
// pub-safari.js: canvas (reference 1280x720 geometry scaled up to WxH) -> WebCodecs
// H.264 annexb -> hang legacy container -> @moq/net -> CF draft-14 relay.
// Query params: ?ns= &relay= &codec= &w= &h= &fps= &bitrate= &statsms=
// Reports hw/sw encoder mode, achieved capture fps, bytes/s, queue depth, drops.
~~~

### pub-4k-cbr

Trailing comment on line 18 before the cut.

~~~js
const CBR = params.get("cbr") === "1"; // bitrateMode constant — force real bytes for bandwidth-gate runs
~~~

### pub-4k-row

Above `const NBLOCKS = 56, BLOCK_W = 20, ROW_X = 40, ROW_Y = 100, ROW_H = 80;`, lines 22 to 24 before the cut.

~~~js
// Binary row geometry — 1280x720 REFERENCE grid (matches safari-play.js decode);
// everything is drawn through a scale transform so the row lands at the same
// place after the player downscales the frame onto its 1280x720 canvas.
~~~

## `rig/moq/spike/src/pub-audio.js`

### pub-audio-header

Above `import { Connection, Path, Broadcast } from "@moq/net";`, lines 1 to 15 before the cut.

~~~js
// AUDIO SPIKE publisher (RUNBOOK §10): video (720p30 H.264, burned-ms row — same
// geometry as pub-safari.js) PLUS WebAudio-synthesized audio -> AudioEncoder
// (Opus 48k stereo, AAC fallback) -> hang legacy container -> @moq/net -> CF
// draft-14 relay. Namespace positron-audio-test (own namespace — never the
// sibling-owned positron-safari-test). NO getUserMedia anywhere: audio samples
// are synthesized directly into AudioData objects.
//
// Audio signal (so the player can measure latency + A/V sync from content alone):
//   - background: 4-note tone sequence (330/392/440/494 Hz), 250 ms/note, amp 0.08
//   - TICK: 6 ms 2 kHz burst at amp 0.9 whenever wall-clock ms crosses a multiple
//     of 500. Audio timestamps are wall-anchored µs (timeOrigin+performance.now()),
//     advanced by exact sample count, so a tick's media timestamp IS its true wall
//     time — the player rounds the detected tick to the nearest 500 ms boundary
//     and gets the publisher wall time exactly (same one-clock trick as the
//     burned-ms video row).
~~~

## `rig/moq/spike/src/pub-safari.js`

### pub-safari-codec

Above `const CODEC = params.get("codec") ?? "avc1.42001f";`, lines 10 to 10 before the cut.

~~~js
// Baseline profile level 3.1 (720p30-capable) — the safe cross-browser H.264 flavor.
~~~

### pub-safari-row

Above `const NBLOCKS = 56, BLOCK_W = 20, ROW_X = 40, ROW_Y = 100, ROW_H = 80;`, lines 15 to 15 before the cut.

~~~js
// Binary row geometry — matches rig/whep/publish.html exactly (1280x720 reference grid).
~~~

### pub-safari-heal

Above `conn.closed?.then?.((e) => {`, lines 71 to 72 before the cut.

~~~js
// Self-healing: if the relay drops the session, reload the page — headless
// Chrome restarts the whole publisher (fresh connect + catalog republish).
~~~

### pub-safari-catalog

Above `const catalog = {`, lines 82 to 84 before the cut.

~~~js
// hang catalog on track "catalog.json" (hang Catalog.RootSchema shape).
// annexb H.264 = self-contained bitstream (SPS/PPS ride with every keyframe),
// so the decoder needs NO description — catalog carries just the codec string.
~~~

### pub-safari-stats

Above `setInterval(() => log("STATS", 'submitted=${i}', 'encoded=${encoded}', 'dropped=`..., lines 145 to 145 before the cut.

~~~js
// STATS every 60 s — this publisher runs for hours; keep the log small.
~~~

## `rig/moq/spike/src/pub.js`

### pub-row

Above `const NBLOCKS = 56, BLOCK_W = 20, ROW_X = 40, ROW_Y = 100, ROW_H = 80;`, lines 13 to 13 before the cut.

~~~js
// Binary row geometry — matches rig/whep/publish.html exactly (1280x720 reference grid).
~~~

## `rig/moq/spike/src/safari-play.js`

### safari-play-header

Above `import { Connection, Path } from "@moq/net";`, lines 1 to 4 before the cut.

~~~js
// SAFARI MoQ TEST player module. Loaded by index.html AFTER the boot script has
// verified WebTransport exists and the user tapped start. Everything is reported
// on-screen (no devtools on iPhone), into window.__report (for CDP probes), and
// via POST /beacon to the Worker (visible in `wrangler tail`).
~~~

### safari-play-row

Above `const NBLOCKS = 56, BLOCK_W = 20, ROW_X = 40, ROW_Y = 100, ROW_H = 80;`, lines 14 to 14 before the cut.

~~~js
// Burned binary row geometry — must match pub-safari.js exactly.
~~~

### safari-play-verdict

Above `if (report.audioState === "suspended")`, lines 167 to 167 before the cut.

~~~js
// The big audibility verdict — "decoded fine" is NOT "audible".
~~~

### safari-play-connect

Above `async function connectAny() {`, lines 186 to 191 before the cut.

~~~js
// @moq/net v0.3.3 hard-blocks WebTransport on ALL Safari via a UA sniff
// (connection/browser.js: `safari: "<0"`, citing WebKit bug 319818 — "flow-control
// window never refills, which permanently stalls sessions"). Safari's actual
// WebTransport is never even tried. connect() accepts a pre-built transport
// though, so on that specific failure we construct the WebTransport ourselves
// and hand it over — this page's whole point is to measure what Safari really does.
~~~

### safari-play-catalog

Above `report.stage = "catalog";`, lines 230 to 230 before the cut.

~~~js
// --- catalog (CF rejects subscribe-before-announce with "Track not found" — retry) ---
~~~

### safari-play-audio

Above `let audioStop = () => {};`, lines 288 to 294 before the cut.

~~~js
// --- AUDIO (RUNBOOK §10): if the catalog carries an audio track, decode and
// play it through WebAudio. Measurement: publisher audio timestamps are
// wall-anchored µs and a loud 6 ms tick fires at every 500 ms wall boundary,
// so rounding a detected tick's media time to the nearest 500 ms recovers
// the publisher wall time exactly (same one-clock trick as the burned video
// row). aLat carries the device-clock offset on phones, but the A/V skew
// (aLat − video g2g) cancels it — skew is exact on any device.
~~~

### safari-play-silence

Above `const masterGain = audioCtx.createGain();`, lines 330 to 335 before the cut.

~~~js
// --- SILENCE DETECTION (RUNBOOK §10.7): measure the ACTUAL output
// level, not just decode success. All buffer sources feed a master
// gain -> destination, with an AnalyserNode tapping the master bus;
// a 250 ms sampler collects output power into a rolling 3 s window.
// Decoded-PCM power is windowed separately (pcmDb) so a SILENT
// verdict can say WHERE the sound died (decoder vs output path).
~~~

### safari-play-suspended

Above `report.audioState = "suspended";`, lines 368 to 368 before the cut.

~~~js
// suspended ctx renders nothing — do NOT call that silence
~~~

### safari-play-resume

Above `const resumeTap = () => { audioCtx.resume().catch(() => {}); };`, lines 388 to 390 before the cut.

~~~js
// iOS autoplay policy: a suspended ctx resumes only from a user
// gesture — any tap on the page counts (the pre-start gate tap
// already created+resumed it; this covers later suspensions).
~~~

### safari-play-ts

Above `const inTsQ = [];`, lines 400 to 404 before the cut.

~~~js
// AudioDecoder output timestamps are regenerated by the browser
// (sample-count accumulation + Opus pre-skip shift) — carry the
// ENCODED chunk timestamps through a FIFO instead (Opus 20 ms is
// 1-in-1-out, verified: without this, a content skip at join
// showed up as a permanent +500 ms phantom on aLat).
~~~

## `rig/moq/test-d16-auth.sh`

### test-d16-auth

Above `BIN=/target/release`, lines 2 to 3 before the cut.

~~~sh
# Draft-16 auth semantics test — runs INSIDE moq-dev container.
# Env: MOQ_TOKEN_PUBSUB, MOQ_TOKEN_SUB (never printed; output redacted).
~~~

## `rig/moq/test-d16-inner.sh`

### test-d16-inner

Above `set -u`, lines 2 to 5 before the cut.

~~~sh
# Runs INSIDE the moq-dev container. Tests the AUTHENTICATED draft-16 CF MoQ endpoint.
# Usage: test-d16-inner.sh <clock|media> [duration_s]
# Env: MOQ_TOKEN_PUBSUB (publisher), MOQ_TOKEN_SUB (subscriber). NEVER printed.
# Binaries expected at /target/release (volume moq-target16).
~~~
