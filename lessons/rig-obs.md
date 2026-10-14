# rig-obs

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `rig/obs-cloud/obs-worker/worker.mjs`

### obs-worker-header

Above `import { Container, getContainer } from "@cloudflare/containers";`, lines 1 to 6 before the cut.

~~~js
// Worker shell for OBS-in-a-CF-Container. Routes:
//   /obsws       -> container :4455 (obs-websocket v5; WS upgrade passthrough,
//                   path rewritten to "/" so obs-websocket sees a clean upgrade)
//   /stop /kill  -> DO lifecycle controls (sleepAfter is not trusted)
//   /*           -> container :8890 (serve-cloud.mjs: /clock.html /now /cpu
//                   /top /health /beacons)
~~~

### obs-worker-sleep

Trailing comment on line 11 before the cut.

~~~js
sleepAfter = "10m"; // not trusted (livelock) — /kill explicitly when done
~~~

## `rig/obs-cloud/obs/serve-cloud.mjs`

### serve-cloud

Above `import http from "node:http";`, lines 1 to 7 before the cut.

~~~js
// In-container page server + probes on :8890 (cloud twin of obs-docker/serve.mjs).
//   /clock.html  burned-clock page for the OBS browser source (localhost fetch)
//   /now         container Date.now() — clock-skew probe (Worker-proxied from the Mac)
//   /collect     POST beacons -> /tmp/beacons.jsonl ; /beacons returns the tail
//   /cpu         /proc-sampled CPU: total + per-obs-process, 1.5 s window
//   /top         ps snapshot
//   /health      boot info
~~~

## `rig/obs-cloud/obs/start-cloud.sh`

### start-cloud

Above `mkdir -p /dev/shm`, lines 2 to 6 before the cut.

~~~sh
# CF Firecracker guests mount NO /dev/shm (only a 6G tmpfs on /dev) — CEF then
# dies FATAL "incorrect permissions on /dev/shm" (SIGTRAP) as soon as a browser
# source spawns, and OBS crash-loops. /dev is tmpfs, so a 1777 directory there
# gives POSIX shm a working home. Runs as root, then hands off to supervisord
# (PID 1 stays supervisord -> SIGTERM from stop()/rollouts is honored).
~~~

## `rig/obs-cloud/quic-test/server.mjs`

### quic-test-header

Above `import http from "http";`, lines 2 to 11 before the cut.

~~~js
// Part-1 probe: does a REAL MoQ/QUIC session work from inside a CF Container?
// Wraps moq-clock-ietf (amd64, draft-14) in an HTTP server the Worker proxies.
//   GET /health            boot info
//   GET /quic?dur=20       self-contained pub+sub through the d14 public relay:
//                          spawn publisher (fresh ns), wait 3 s, spawn internal
//                          subscriber; return handshake evidence + matched ticks
//   GET /pubstart?dur=60   background publisher (for a LOCAL Mac subscriber to
//                          verify objects escape CF); returns ns immediately
//   GET /pubstatus         stderr/stdout tails of the background publisher
//   GET /net               UDP control probe (DNS to 1.1.1.1/8.8.8.8)
~~~

### quic-test-ticks

Above `const isTick = (l) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(l);`, lines 62 to 64 before the cut.

~~~js
// match pub-printed ticks to sub-received ticks (same VM clock).
// Tick lines are exactly "YYYY-MM-DD HH:MM:SS"; tracing INFO lines (also
// stdout — the RUNBOOK stdout trap) are filtered out by shape.
~~~

## `rig/obs-cloud/quic-test/worker.mjs`

### quic-worker

Above `import { Container, getContainer } from "@cloudflare/containers";`, lines 1 to 1 before the cut.

~~~js
// Worker shell for the Part-1 QUIC probe — same pattern as rig/containers.
~~~

### quic-worker-sleep

Trailing comment on line 6 before the cut.

~~~js
sleepAfter = "5m"; // not trusted (livelock) — /kill explicitly when done
~~~

## `rig/obs-cloud/run-cloud-cold.mjs`

### cloud-cold-header

Above `import { spawn } from "node:child_process";`, lines 1 to 6 before the cut.

~~~js
// RETIRED 2026-10-13: `moq.positron.studio` (workers/moq-safari) was deleted from Cloudflare on 2026-10-13 (workers/*/RETIRED.md), so what this calls there no longer answers.
// Cloud cold-start → pixels, staged timestamps. Assumes the instance is DEAD
// (/kill'ed). Wakes it with /health, polls obs-websocket readiness through the
// Worker proxy, runs setup, starts a fresh-ns MoQ stream, then launches the
// deployed player in headless Chrome and reports time-to-first-decoded-frame.
//   node run-cloud-cold.mjs <workerBase> [playerSecs]
~~~

### cloud-cold-reconnect

Trailing comment on line 54 before the cut.

~~~js
if (c.closed) { // proxy dropped us (OBS mid-boot) — reconnect fresh
~~~

### cloud-cold-setup

Above `const tS = now();`, lines 62 to 62 before the cut.

~~~js
// 3. setup from zero (fresh disk every boot — scenes never persist)
~~~

## `rig/obs-cloud/run-dual.mjs`

### run-dual

Above `import { spawn, execFile } from "node:child_process";`, lines 1 to 12 before the cut.

~~~js
// Dual-output driver: one OBS instance, MoQ (stream slot, obs-moq -> d14 relay)
// + RTMP (recording slot pre-baked as Custom Output (FFmpeg) -> local mediamtx)
// simultaneously. Works against the obscloud image locally (ws://127.0.0.1:4455)
// or through the CF Worker proxy (OBS_WS_URL=wss://.../obsws).
//
//   node run-dual.mjs verify              profile/plugin sanity (Advanced? RecType? moq_service?)
//   node run-dual.mjs setup [pageUrl]     scenes+video from zero (default page http://127.0.0.1:8890/clock.html)
//   node run-dual.mjs start [relay]       fresh-ns MoQ StartStream + StartRecord; prints ns
//   node run-dual.mjs startrec            StartRecord only
//   node run-dual.mjs measure [n] [nowUrl] grabber on rtmp obsdockrec: burned-row lat n frames
//                                          + docker stats + clock-offset probe via nowUrl
//   node run-dual.mjs stop                StopRecord + StopStream
~~~

## `rig/obs-docker/control.mjs`

### obs-control

Above `import crypto from "node:crypto";`, lines 1 to 8 before the cut.

~~~js
// obs-websocket v5 client + generic CLI. Zero deps: node's built-in WebSocket
// (undici) + node:crypto for the Hello/Identify auth handshake.
//
//   node control.mjs call GetVersion
//   node control.mjs call SetCurrentProgramScene '{"sceneName":"A"}'
//   node control.mjs rtt            # per-command RTT table, ~50 calls each
//
// Env: OBS_WS_URL (default ws://127.0.0.1:4455), OBS_WS_PASSWORD (default obsdock)
~~~

## `rig/obs-docker/run-measure.mjs`

### run-measure-header

Above `import { spawn, execFile } from "node:child_process";`, lines 1 to 9 before the cut.

~~~js
// obsdock measurement orchestrator. Zero deps; local ffmpeg for frame grabs.
//
//   node run-measure.mjs setup            remote-configure OBS from zero (proof of full remote drive)
//   node run-measure.mjs screenshot <src> GetSourceScreenshot -> decode burned row (no VNC needed)
//   node run-measure.mjs pipeline [nFrames]   browser-source end-to-end latency (burned row vs wall)
//   node run-measure.mjs scenes [n]       SetCurrentProgramScene -> first new-scene frame, n switches
//   node run-measure.mjs resil-sink       kill+restart mediamtx mid-stream; OBS auto-reconnect?
//   node run-measure.mjs resil-cycle      StopStream/StartStream cycle timing
//   node run-measure.mjs resil-restart    docker restart -> time back to pixels at the sink
~~~

### run-measure-respawn

Above `const deadline = now() + timeoutMs;`, lines 91 to 92 before the cut.

~~~js
// The stream may not exist yet (sink restarting, OBS reconnecting): ffmpeg
// then exits with "Input/output error" — respawn until a frame or deadline.
~~~

### run-measure-ready

Above `let scenesList = null, tReady = null;`, lines 292 to 293 before the cut.

~~~js
// ws answers before OBS is fully loaded: requests return code 207 (NotReady)
// for a beat — poll until real answers come back.
~~~

## `rig/obs-docker/run-moq.mjs`

### run-moq-header

Above `import { spawn, execFile } from "node:child_process";`, lines 1 to 11 before the cut.

~~~js
// RETIRED 2026-10-13: `moq.positron.studio` (workers/moq-safari) was deleted from Cloudflare on 2026-10-13 (workers/*/RETIRED.md), so what this calls there no longer answers.
// obs-moq plugin drive: switch the OBS stream service between rtmp_custom and
// moq_service, and verify playback via the deployed self-reporting player
// (elektron-moq-safari) in headless Chrome, whose ?log= hook posts into our
// :8890 collector. Namespace discipline: fresh obsdock-<ts> every start
// (draft-14 same-name rejoin pre-GC bricks the namespace — RUNBOOK §13.4).
//
//   node run-moq.mjs moq <relayUrlOrEnvRef> [versionPin]   switch service to MoQ + StartStream
//   node run-moq.mjs rtmp                                  restore RTMP service + StartStream
//   node run-moq.mjs player <ns> [relay] [secs]            headless-chrome player, report g2g
//   node run-moq.mjs outputs                               GetOutputList (dual-output question)
~~~

### run-moq-token

Above `function envToken(name) {`, lines 27 to 27 before the cut.

~~~js
// tokens live in .env (chmod 600, gitignored) — read, never print
~~~

## `rig/obs-docker/serve.mjs`

### obs-docker-serve

Above `import http from "node:http";`, lines 1 to 4 before the cut.

~~~js
// Page server + collector on :8890. Zero deps.
//   /clock.html   the burned-clock page (fed to the OBS browser source)
//   /now          host Date.now() (page clock sync — kills VM clock skew)
//   /collect      POST beacons -> results/obs-docker-beacons.jsonl
~~~

## `rig/obs-pro/clear-recordings.mjs`

### clear-recordings

Above `import { readFileSync } from 'node:fs';`, lines 1 to 13 before the cut.

~~~js
// Delete every Cloudflare Stream recording. Storage is the lever HANDOFF item 5
// names: recording cannot be turned off on the RTMPS path (mode:off also kills
// HLS playback of a live input, and preferLowLatency requires "automatic"),
// deleteRecordingAfterDays bottoms out at 30, and the 1000-minute cap BLOCKS
// NEW LIVE STREAMS when it fills — so this is an outage risk, not a bill.
//
// Checked before this was written: none of the 59 recordings is referenced
// anywhere in the repo, and replay/seek play from R2
// (archive.positron.studio/shows/archive-test/), not from Stream. So clearing
// Stream costs no demo.
//
//   node clear-recordings.mjs           list only, deletes nothing
//   node clear-recordings.mjs --delete  actually delete
~~~

## `rig/obs-pro/read-hls.mjs`

### obs-read-hls

Above `import { execFileSync } from 'node:child_process';`, lines 1 to 8 before the cut.

~~~js
// Pull frames from the live LL-HLS edge and read the burned clock back out.
//
// "947 frames encoded, 0 skipped" says the encoder ran. It does NOT say the
// picture is readable at the other end — that is the green-suite trap this
// project has paid for twice. A decoded checksum is the only thing that proves
// the row survived encode -> CDN -> decode.
//
//   node read-hls.mjs <m3u8> [frames]
~~~

## `rig/obs-pro/serve.mjs`

### obs-serve

Above `import { createServer } from 'node:http';`, lines 1 to 18 before the cut.

~~~js
// Serves the OBS source page and the test pattern to OBS's CEF.
//
// RUNS ON THE PRO, out of the M1's own checkout of this repo, bound to
// 127.0.0.1. Two reasons it is local rather than fetched from the dev Mac:
//
//   · macOS Local Network Privacy is granted PER APP. A terminal process
//     inherits the grant; OBS.app and Chrome.app do not, so a browser source
//     pointed at a LAN address renders ERR_ADDRESS_UNREACHABLE — a pure black
//     frame with nothing in any OBS log. 127.0.0.1 needs no grant.
//   · a standing test box must not stop working when a laptop sleeps.
//
// It serves demo/shell/pattern.mjs straight out of the working tree. That is a
// CHECKOUT, not a copy: `git` is the mechanism that makes drift visible, which
// is precisely what workers/pub's hand-maintained container copy lacks (it drew
// the pre-session-12 picture for a whole session and nothing said so). To keep
// that true this server refuses to start silently on an unknown revision — it
// prints the sha, and /rev serves it so a measurement can be attributed to a
// build the way BUILD attributes a device log.
~~~

## `rig/obs-pro/shot.mjs`

### obs-shot

Above `import { execFileSync } from 'node:child_process';`, lines 1 to 8 before the cut.

~~~js
// Read the burned clock back out of OBS's own composited frame.
//
// This is the check that the encoder is drawing a READABLE picture before any
// network is involved: OBS screenshot -> ffmpeg crops the one sample line ->
// the same decode readBurned() does. A green "streaming" light says nothing
// about whether the row survived; this does.
//
//   node shot.mjs [source]        default: the whole program output
~~~

### obs-shot-call

Above `const req = src ? { sourceName: src }`, lines 38 to 38 before the cut.

~~~js
// call() resolves { data, tResp, rttMs } — tResp is epoch ms at the response.
~~~

## `rig/obs-pro/stream.mjs`

### obs-stream-header

Above `import { readFileSync } from 'node:fs';`, lines 1 to 18 before the cut.

~~~js
// One driver for the M1's OBS across all three transports.
//
//   node stream.mjs hls  [secs]    RTMPS -> Cloudflare live input -> LL-HLS
//   node stream.mjs whip [secs]    WHIP  -> Cloudflare live input -> WHEP
//   node stream.mjs moq  [secs]    obs-moq -> Cloudflare draft-14 relay
//   node stream.mjs off
//
// ONE STREAM-SERVICE SLOT. OBS has exactly one, and rtmp_custom, whip_custom
// and moq_service all want it — so no two of these run at the same instant
// through this path. (obs-moq also registers a standalone moq_output, which is
// the door to a genuine simultaneous run; not wired here.)
//
// WHIP AND WHEP MUST BE USED TOGETHER. Cloudflare does not support playing an
// RTMP/SRT input over WHEP — it answers 409 — so the WHIP leg targets a
// DIFFERENT live input from the HLS leg. See demo/shell/live.mjs.
//
// Secrets (RTMPS key, WHIP bearer) are read from the Cloudflare API at run time
// and NEVER printed. Do not add a call that dumps the service settings.
~~~

### obs-stream-retired

Above `const HLS_UID  = '0e390aa48b55d49a57284e6c2c535477';   // "positron-demo", delet`..., lines 22 to 26 before the cut.

~~~js
// RETIRED 2026-10-13 for `hls` and `whip`: both inputs below were DELETED from
// Stream that day, so those modes have no input to publish to. They refuse
// (exit 2) rather than ask the API for a key that is not there. `moq` publishes
// to Cloudflare's public draft-14 relay, not to an input of ours, and `off`
// only stops OBS, so those two still run.
~~~
