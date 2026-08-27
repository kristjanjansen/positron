# obs-docker — containerized OBS as the stationary studio compositor (2026-08-27)

Goal: prove/deny OBS-in-Docker (Linux OBS, headless Xvfb, obs-websocket v5 remote
drive, network-fed sources, RTMP out to a LOCAL mediamtx sink) with burned-pixel
ground truth. This is plan-studio Option C's stationary half, in the ThreatLocker
blind spot (the Docker VM — moq-rs precedent).

Ports: 8890 pages/collector · 1935 RTMP sink (local mediamtx) · 4455 obs-websocket
· 5900 VNC. Containers named obsdock-*. No new CF resources.

## Checkpoint 1 — environment + architecture decision
- Docker backend is **OrbStack** (28.5.2, 12 CPU, 16 GB VM), not Docker Desktop.
  amd64 emulation (Rosetta) verified: `--platform linux/amd64 alpine uname -m` →
  x86_64.
- **amd64 image mandatory**: browser source = CEF, and no Debian/Ubuntu distro
  obs-studio package ships CEF (BUILD_BROWSER=OFF everywhere). The official
  obsproject PPA (amd64) bundles it. So Linux OBS runs under Rosetta on this Mac.
  On a real CF Container (amd64 native) this penalty disappears.
- Pre-staged local OBS profile at ~/Library is macOS-OBS-only — NOT reused here.
  Container config pre-seeds ONLY FirstRun suppression + websocket server_enabled;
  everything else (video settings, scenes, stream service, encoder opts) is driven
  remotely via obs-websocket, per the brief.
- Burned-row format reused from rig/whep/publish.html: 48-bit epoch-ms MSB-first +
  8-bit XOR checksum, 56 blocks × 20 px at (40,100) h=80 on 1280x720.
- Build started (backgrounded, timed). Non-root user `obs` in-container (CEF as
  root is the worse-documented path; sandbox flags documented when known).

## Checkpoint 2 — image built, OBS up, control plane live
- Build: **159 s cold, image 1.08 GB** (ubuntu 24.04 + obsproject PPA). OBS
  **32.2.0**, obs-browser 2.26.9 (CEF 127), obs-websocket **5.7.4** — all load
  first try under Rosetta ([rosetta] visible in the process list).
- websocket handshake (Hello/Identify/auth) from host node built-in WebSocket:
  ✅ GetVersion RTT 2.2 ms. `setup` = full remote config from zero (video
  settings, rtmp_custom stream service → host mediamtx, encoder params
  tune=zerolatency, 4 scenes + color/browser/ffmpeg inputs) in **189 ms**.
- mediamtx 1.20.1 surprise: default config auto-enables a MoQ listener
  (:8892/:8893) — explicitly `moq: no` in mtx-obsdock.yml.
- **Trap: editing OBS ini while OBS runs is futile** — OBS rewrites its config
  on shutdown, so edit-then-restart silently reverts. Order must be
  stop → edit → start.
- **Browser source black-frame fix (the one that matters):** CEF loads and runs
  JS fine (clock-offset beacons arrived: container↔host offset −0.5 ms, rtt
  1.4 ms — OrbStack VM clock is sane today), but OSR frames render BLACK with
  "Browser Hardware Acceleration: true" (default) on llvmpipe. Fix:
  `BrowserHWAccel=false` in user.ini+global.ini [General]. **No CEF
  --no-sandbox needed** — running OBS as a plain user avoids the root-sandbox
  issue entirely. /dev/shm is 7.9 G under OrbStack (the 64 MB docker trap
  doesn't apply here).
- Screenshot proof (GetSourceScreenshot → ffmpeg decode): burned row decodes,
  compositor lag-vs-now 110.3 ms (includes ~2 screenshot RTTs; the RTMP-chain
  number is the real one). Page clock offset −0.4 ms.
- Idle (no stream, default scene): docker CPU ~138 % of one core, RSS 339 MiB —
  the Rosetta+llvmpipe continuous-render tax. Baseline for the streaming delta.
- MESA "Failed to attach to x11 shm" log spam (uid mismatch root-Xvfb vs user
  obs MIT-SHM) — cosmetic; rendering works via the fallback path.

## Checkpoint 3 — the measured chain (all results/obs-docker-*.jsonl)
- **StartStream → outputActive event 74 ms**; mediamtx sees H264+AAC.
- **THE ENCODER TRAP (the session's biggest number):** websocket-set
  `SimpleOutput/x264Settings=tune=zerolatency` SAVES but is IGNORED by simple
  output mode (encoder log: keyint 250, no tune; B-frames confirmed by decoder
  "co located POCs" chatter). Result: browser→glass p50 **1226 ms** with a
  24 ms total spread — pure constant encoder pipeline (lookahead+sync-lookahead
  +B-frames ≈ 1 s at 30 fps). Fix: `[Output] Mode=Advanced` (websocket-settable)
  + profile file `streamEncoder.json` {tune:zerolatency, keyint_sec:2} — that
  file is NOT reachable via any websocket request; it must be baked/copied
  (stop OBS first, it rewrites config on exit). After fix: same chain p50
  **182.5 ms**. A 6.7× latency cliff hidden in an output-mode dropdown.
- **Browser-source pipeline (page rAF → CEF → compositor → x264 → RTMP →
  mediamtx → ffmpeg decode): p50 182.5 / p95 217 / p99 221 ms** (n=301,
  0 undecodable, 0 skipped frames, activeFps 30.0). Burned host-clock row;
  container clock error removed by page-side /now sync (offset −0.5 ms).
- **Scene switch cmd→glass: p50 197.7 / p95 215.2 ms** with Cut transition
  (n=10). Default Fade transition adds its 300 ms: p50 393.8 / p95 417.3.
  SetCurrentProgramScene RTT itself 4.5 ms.
- **websocket RTT (n=50 each):** GetVersion 0.33/2.14, GetStats 0.17/0.21,
  GetSceneList 0.19/0.58, GetStreamStatus 0.15/0.17, SetCurrentProgramScene
  4.55/5.64, SetInputSettings 0.21/0.37 (p50/p95 ms). Control plane is free.
- **CPU/RAM (docker stats, % of one host core):** idle-no-scenes 138 % /
  339 MiB; streaming 720p30 x264 veryfast+zerolatency ~202 % p50 (max 212) /
  ~900 MiB. Rosetta+llvmpipe tax included — native amd64 will be far lower.
- **Network-fed media source**: ffmpeg_source pulling RTSP from host mediamtx
  renders (screenshot-verified). Trap: a media source that 404s goes
  OBS_MEDIA_STATE_ENDED and stays dead — revive remotely with
  TriggerMediaInputAction RESTART once the feed exists.
- **Resilience:** sink killed mid-stream → OBS RECONNECTING event in **77 ms**,
  retries (2.3 s, 5.5 s), RECONNECTED **4.1 s after sink returns**, pixels
  +8.3 s (keyint 2 s + grabber respawn quantization) — self-heals, stream
  socket-close does NOT kill the show locally (unlike CF's UID-mint). Stop/Start
  cycle: stop event 112 ms, start event 27 ms, start→pixels 4.2 s. Full cold
  path `docker restart` → ws up 3.7 s (answers 207 NotReady briefly — poll),
  scenes persisted, cold→pixels **7.7 s**.
- obs-websocket code 207 (NotReady) exists between ws-up and OBS-loaded; any
  cold-boot driver must retry on it.

## Checkpoint 4 — MoQ plugin phase (scope addendum): recon + build
- Plugin = moq-dev/moq `cpp/obs` (obs-moq; GPL-2 module linking in-tree Rust
  `rs/libmoq`). Releases ship macOS-arm64/Windows only → Linux build from
  source, done in a SIBLING container off the same obsdock image (exact OBS
  32.2.0 ABI — the PPA package ships /usr/include/obs + libobsConfig.cmake,
  no separate -dev needed).
- **Version answer (source-verified, rs/moq-net/src/version.rs): libmoq speaks
  moq-lite 01–06 AND IETF drafts 14–19.** Draft14 negotiates via SETUP on ALPN
  `moq-00`; Draft16 via dedicated ALPN `moqt-16`. OBS-side service settings:
  `server` (URL — may carry token in path), `key` (broadcast path), advanced
  `version` pin taking names like `moq-transport-14`/`moq-transport-16`.
  So: NOT hard-pinned; both CF relays are protocol-plausible.
- Service registers as `moq_service` ("MoQ (Debug)") with codecs h264/hevc/av1
  + aac/opus — SetStreamServiceSettings can select it remotely; StartStream
  drives it (service's preferred output = moq output). Qt dock/advanced dialog
  excluded (ENABLE_QT=OFF) — settings still reachable via service properties.
- Build iterations: (1) FindSIMDe fail → apt libsimde-dev; (2) cmake
  `set_target_properties_obs` unknown → standalone builds need
  **-DBUILD_PLUGIN=ON** (CMakePresets sets it; raw cmake doesn't).
  Toolchain: rustup 1.95.0 (pinned) + cmake/ninja, all amd64-under-Rosetta.
- Player instrument: deployed elektron-moq-safari page decodes THE SAME 56-block
  burned row (geometry identical to clock.html) and self-reports g2g p50/p95;
  `?log=` posts into my :8890 collector; `?relay=` overrides for d16.
  Namespace discipline: fresh `obsdock-<Date.now()>` per StartStream (d14
  same-name rejoin bricks pre-GC).

## Checkpoint 5 — MoQ RESULTS: OBS speaks MoQ to Cloudflare, BOTH drafts
Plugin: obs-moq (moq-dev/moq @ 5ddaed0, libmoq 0.5.11) built amd64 in a sibling
container (moqbuild.sh kept here; ~7 min emulated incl. rustup). 48 MB .so →
docker cp into /usr/lib/x86_64-linux-gnu/obs-plugins/ + data → restart OBS:
loads clean into stock PPA OBS 32.2.0 (only a cosmetic en-US locale warning).
Registers `moq_service` ("MoQ (Debug)"), `moq_source`, output. NO standing
output instance in GetOutputList → **RTMP+MoQ dual-output is NOT reachable via
websocket** (needs the Qt dock we compiled out, or frontend) — legs must swap
via SetStreamServiceSettings (service type flips remotely, cleanly).
- **draft-14 (public relay): connected version=moq-transport-14 in 399 ms** on
  StartStream (event 69 ms). Relay subscribed back catalog.json/0.avc3/0.aac.
  Deployed elektron-moq-safari player (headless Chrome, CDP-polled __report):
  **LIVE 30 fps, 2261 frames, 0 decode errors, g2g p50 185 / p95 202 ms** —
  statistically identical to the local RTMP chain (182.5/217). A Cloudflare
  MoQ round-trip costs nothing vs a localhost RTMP hop.
- **draft-16 (authenticated): connected version=moq-transport-16 in 164 ms**,
  PUBSUB token in URL path (read from .env, never logged; log lines redacted
  before printing), NO version pin needed — ALPN offer-all converges.
- **NEW INTEROP TRAP (measured, subscriber-order A/B): d16 does NOT deliver
  the pre-join catalog group.** Late-joining player (40 s after publish):
  stuck at catalog 60 s, 0 frames — while the publisher-side session is
  healthy. Same ns, player subscribed 10 s BEFORE publish: live in seconds,
  **30 fps, 1760 frames, 0 errors, g2g p50 149 / p95 161 ms** (fastest chain
  of the day). d14 replays the open group from its start (§3.6 behavior) which
  masks obs-moq's publish-catalog-ONCE design; d16's subscribe path starts at
  the live edge → hang's one-shot catalog never reaches late joiners. Fix
  candidates: plugin republishes catalog periodically (the §7/§8 2 s hack) or
  relay-side FETCH. Until then: d16 viewers must exist before StartStream.
- CPU during MoQ streaming ~206 % / 690 MiB — same class as RTMP (~202 %).
  0 outputSkippedFrames on every leg. StartStream event on service flips can
  outrun a late waitEvent arm — register the event handler BEFORE calling.
- First d16 StartStream appeared to time out with no events and no connect
  attempt logged (immediately after a d14→d16 service flip); retry with
  pre-armed listener worked. One-off, unreproduced — noted, not explained.

## Verdicts

**(a) Containerized OBS as the Option-C stationary compositor.** Viable, and
now measured: full remote drive from zero config (189 ms setup), sub-ms control
RTTs, scene cut cmd→glass ~198 ms, browser-source page→RTMP-sink ~183 ms p50,
0 dropped frames on every leg, self-healing on sink death (RECONNECTING in
77 ms, auto-recovery), cold container→pixels 7.7 s. Against the proven Route-B
CDP→ffmpeg composite (also 0 dropped frames) OBS buys: real scene/transition
semantics driven by one websocket (the obs-websocket ecosystem the operator
console can ride), per-source lifecycle (media sources with RESTART, browser
sources, color/text), encoder profiles switchable per show — and now a MoQ
egress no ffmpeg has. The costs: ~2 host cores at 720p30 (Rosetta+llvmpipe
double tax — a native amd64 host will be a fraction), a 1.08 GB image, and the
sharp-edged config surface (simple-mode ignores encoder tuning at a hidden
6.7× latency cliff; ini edits while OBS runs are reverted; code 207 boot
window). Route B stays the minimal-archive path; OBS-in-Docker is the right
shape when the show needs an operator-driven compositor with scenes.

**(b) CF Containers feasibility (cross-ref research/cf-containers-2026-08.md).**
Image 1.08 GB amd64 fits registry (50 GB/account) and standard disk (8 GB at
standard-1) with room; amd64-only requirement matches CF exactly (our Rosetta
handicap disappears there). RAM ~900 MiB streaming fits standard-1's 4 GiB.
CPU is the wall: we hold 30.0 fps using ~2 host cores; standard-1 exposes 0.5
vCPU of a 2.0 GHz EPYC → 720p30 x264+llvmpipe will not hold realtime; budget
standard-3/-4 (2–4 vCPU) for a real show, and measure llvmpipe compositing
there before trusting it. The disqualifier is transport: CF containers have NO
UDP either direction → the MoQ egress is dead from inside CF, and RTMP-out
must ride TCP 443 (RTMPS to CF Stream works; arbitrary :1935 egress does not).
So a CF-hosted OBS could serve the RTMPS→LL-HLS stage leg only — the
interesting half of this session (OBS-as-MoQ-publisher) requires a host with
UDP, i.e. this Mac's Docker VM or any plain VPS.

**(c) ThreatLocker statement verified.** Linux OBS 32.2.0 ran for ~90 min in
the Docker/OrbStack VM — launched, restarted repeatedly, loaded a
freshly-compiled unsigned 48 MB plugin dylib-equivalent (.so), streamed to
three different egresses — with zero interference, on the same machine where
TL SIGKILLs macOS OBS and every freshly compiled native binary. The VM
boundary is the blind spot, exactly as the moq-rs precedent predicted: the
"stationary studio compositor" can live in Docker on a TL-managed Mac today,
driven entirely from homebrew node via obs-websocket (both TL-exempt).

## Cleanup (verified)
Containers obsdock-obs + obsdock-moqbuild rm'd; image obsdock-obs:latest and
volumes obsdock-cargo/obsdock-rustup removed; alpine:latest (pulled by this
session) removed; mediamtx, serve.mjs, feeder ffmpeg, headless-chrome player
killed; ports 8890/1935/4455/5900/8554 verified free. Kept: this dir
(Dockerfile, supervisord.conf, start-obs.sh, control.mjs, run-measure.mjs,
run-moq.mjs, clock.html, serve.mjs, mtx-obsdock.yml, moqbuild.sh, NOTES.md)
+ results/obs-docker-{rtt,pipeline,scenes,resilience,moq,beacons}.jsonl.
Rebuild-from-zero: docker build (159 s) + moqbuild.sh (~7 min) + `node
run-measure.mjs setup`.
