# obs-cloud — OBS in a CF Container + the UDP/QUIC contradiction (2026-08-27)

Two-part decisive test. Part 1: resolve the PROGRESS contradiction — research/
cf-containers-2026-08.md measured raw UDP OUT of a CF container working (DNS to
8.8.8.8, NTP), while rig/obs-docker/NOTES.md verdict (b) asserted "CF containers
have NO UDP either direction → MoQ egress dead". Direct measurement: a real
MoQ/QUIC session from INSIDE a CF container to the draft-14 public relay
(RUNBOOK §4.1, no auth). Part 2 (if QUIC works): the 1.08 GB obsdock OBS image
in a CF container on standard-4, driven from this Mac via a Worker-proxied
obs-websocket, publishing MoQ to the d14 relay, measured end-to-end (g2g burned
clock, CPU, RTTs, boot→pixels, cost). Addendum: dual-output (MoQ + RTMPS
simultaneously) via the recording-slot-as-ffmpeg-output trick, proven locally.

Money rules: Workers Paid already; runtime minutes kept small; app + registry
images deleted at the end; NO new CF resources beyond the container app (no
Stream live inputs). Namespaces: fresh obscloud-<ts> per StartStream (§13.4).

## Checkpoint 0 — assets recovered, builds started
- moq-target14 docker volume binaries are **aarch64** (ELF e_machine 0xb7) —
  useless on CF (amd64 only). amd64 rebuild of moq-clock-ietf started
  (scratchpad/quicbuild, rust:1-bookworm under Rosetta, backgrounded).
- obsdock-obs:latest rebuilt from layer cache instantly (1.08 GB, f0b796cff5c6).
- obs-moq-amd64.so SURVIVES in scratchpad/moq/ (x86-64, moq-dev/moq @ 5ddaed0,
  incl. cpp/obs/data/locale) — the ~7 min plugin rebuild saved.
- wrangler auth pattern confirmed (proto/archive/uploader.mjs): clean env minus
  CF_API_TOKEN/CLOUDFLARE_API_TOKEN/CF_ACCOUNT_ID/CLOUDFLARE_ACCOUNT_ID, cwd
  without .env → OAuth login is used.

## Checkpoint 1 — PART 1 VERDICT: OUTCOME A. QUIC/MoQ egress from CF Containers WORKS.
The contradiction is resolved by direct measurement (13:55–13:56 UTC):
- App `positron-obscloud-quic` (quic-test/, instance "basic", image = node:22-slim
  + amd64 moq-clock-ietf 8.5 MB stripped, built from rig/moq/moq-rs-draft14 src).
  Deploy → /health 200 in ~3 s wall (fra20, 1 visible EPYC core, 1219 MB).
- **/quic self-test (pub + sub both INSIDE the container, d14 public relay):
  publisher WebTransport/QUIC session "connected with CID" 55 ms after
  connecting-log (236 ms after spawn incl. process start); subscriber connect
  27 ms; 21/21 ticks matched; relay tick latency p50 2 ms** (p95 2.47 s is the
  d14 open-group replay burst at join — steady state is min 0/p50 2 ms).
- **Cross-boundary: /pubstart in the container (ns obscloud-1787838954999) →
  local Mac subscriber (arm64 moq-target14 binaries) received 25/25 consecutive
  ticks** through the relay. Objects demonstrably escape CF.
- So: rig/obs-docker NOTES verdict (b) "CF containers have NO UDP either
  direction → MoQ egress dead" is WRONG — it predates the containers agent's
  raw-UDP measurement and was an assumption, not a measurement. The
  cf-containers finding (UDP out open) generalizes to full QUIC+WebTransport+
  MoQT sessions incl. TLS handshake and sustained object flow. Inbound QUIC
  (relay-in-container) stays dead — no public IP, unchanged.
- Probe instance /kill'ed at 13:57 UTC (~2 min basic runtime).
→ Part 2 GO.

## Checkpoint 2 — ADDENDUM: DUAL OUTPUT (MoQ + RTMP simultaneously) WORKS, measured locally
Mechanism: the RECORDING slot as "Custom Output (FFmpeg)" with an rtmp:// URL
(format flv), baked in the profile — because a second stream output is not
creatable via obs-websocket (local rig finding). Stream slot stays obs-moq.
- **Baked profile fully loads from image** (obs/Dockerfile → profile obscloud):
  verify over ws shows Mode=Advanced, RecType=FFmpeg, FFOutputToFile=false,
  FFURL=rtmp://host.docker.internal:1935/obsdockrec. Keys confirmed against the
  OBS 32.2.0 binary: FFURL/FFFormat=flv/FFFormatMimeType=video/x-flv/
  FFVEncoder=libx264(Id 27)/FFVCustom="preset=veryfast tune=zerolatency"/
  FFVGOPSize=60/FFABitrate/FFAEncoder=aac(Id 86018)/FFAudioMixes=1. This also
  proves the whole no-exec cloud bake path (profile+streamEncoder.json+wsconfig).
- **StartStream (MoQ d14, ns obscloud-1787839109921) event 78 ms; StartRecord
  event 147 ms; both live at once from one OBS**: obs-moq "session connected
  366 ms" AND mediamtx "[path obsdockrec] 2 tracks (H264, MPEG-4 Audio)".
  StopRecord→StartRecord re-cycle: 6 ms to STARTED — recording leg is fully
  remote-drivable (StartRecord/StopRecord), which is the whole point of the trick.
- **Simultaneous burned-clock measurements (same run):**
  - MoQ leg via deployed player: 30.0 fps, 2267 decoded, 0 errors,
    **g2g p50 172 / p95 188 ms** — statistically same as MoQ-only (185/202
    prior session): the second output does NOT degrade the MoQ leg.
  - RTMP leg (recording slot → mediamtx, grabber decode): **n=301, 0
    undecodable, p50 437 / p95 446 / p99 448 ms** (min 421, max 449 — constant
    pipeline). ~255 ms above the stream-slot RTMP chain (182 ms): the ffmpeg-
    output/flv-muxer path buffers more; fine for an archive/simulcast leg.
    Clock offset removed via container /now (−0.7 ms, rtt 0.8 ms).
  - CPU (docker, Rosetta+llvmpipe tax included): MoQ-only ~248 % of one host
    core p50; MoQ+record ~274–284 % → **the second encode costs ~+30 % of a
    core**; RAM 920→984 MiB. 0 skipped frames on the stream output throughout.
- Caveat: cloud-side RTMPS egress untested here by design (no CF Stream inputs
  created — money rule); the mechanism is transport-agnostic (same slot takes
  rtmps:// URLs; ffmpeg output uses librtmp/TLS).

## Checkpoint 3 — PART 2: OBS RAN IN A CF CONTAINER AND PUBLISHED MoQ. Measured.
App `positron-obscloud` (obs-worker/ + obs/Dockerfile = obsdock 1.08 GB image +
plugin/profile/pages layers ≈ 1.25 GB), **standard-4** (4 vCPU/12 GiB, accepted
by wrangler 4.75). Worker routes /obsws → container:4455 (WS passthrough via
containerFetch — control.mjs drives cloud OBS UNCHANGED via
OBS_WS_URL=wss://…/obsws), everything else → :8890 (serve-cloud.mjs).
Deploy incl. 1.25 GB image push: **2 m 42 s wall**; worker-only redeploys ~45 s.

**THE CLOUD TRAP THAT COST TWO BOOTS — CF Firecracker guests have NO /dev/shm.**
df shows only tmpfs on /dev (6 G) + /run; the moment a browser source spawns,
CEF dies `FATAL platform_shared_memory_region_posix.cc "incorrect permissions
on /dev/shm"` → OBS exits SIGTRAP → supervisor reloads the scene collection
(browser source included) → instant re-crash → "gave up: FATAL" after 3 tries.
The local OrbStack rig never sees this (7.9 G /dev/shm). Fix (start-cloud.sh,
baked): `mkdir -p /dev/shm && chmod 1777 /dev/shm` as root before supervisord,
plus startretries=10 for the obs program. After the fix: zero crashes across
two boots incl. a full streaming session. (Boot 1's OBS also died pre-scenes —
no log endpoint existed yet to pin it; same fix cured everything observed.)

**Measured (fra→mxp06 instance, Tallinn Mac driving, 14:13–14:17 UTC):**
- **Cold wake → pixels-on-local-glass: 11.6 s total**, staged: destroyed→
  /health 200 4.5 s (container-internal uptime 0.6 s at first 200) → obs-ws
  identified through Worker 7.3 s → OBS ready 7.4 s → remote setup 1.5 s →
  StartStream event +0.4 s (obs-moq → d14 connected from INSIDE CF) → player
  first decoded frame +1.5 s. First-ever provision after the initial deploy was
  ~59 s; a version-swap cold boot (new image layers to the edge host) 126 s.
- **g2g cloud-OBS→CF-relay→local-viewer: raw p50 170 / p95 185 ms** (30.0 fps,
  2158 frames, 0 decode errors, 75 s). Container clock is +25 ms ahead of the
  Mac (min-RTT /now probe through the Worker, best rtt 90 ms, offsets 21–31 ms
  consistent) → **skew-corrected g2g ≈ p50 195 / p95 210 ms** (±~45 ms probe
  asymmetry bound). Same class as the local-Docker MoQ chain (185/202): the
  move to CF costs ≈nothing in latency.
- **CPU (native amd64, /proc-sampled): streaming 720p30 x264 zerolatency =
  obs ~190 % of one EPYC core ≈ 52 % of the standard-4**; obs-browser-page
  ~7 %, Xvfb ~6 %; idle (no stream) obs ~49 %. RAM in use ~0.5 GB of 12 GiB.
  So: not "a fraction" of the Rosetta ~250 % — llvmpipe+x264 genuinely needs
  ~2 cores — but standard-4 holds 30.0 fps with ~half the box spare;
  standard-3 (2 vCPU) would be borderline, standard-4 is right.
- **Control plane through the Worker tunnel: p50 ~65 ms** (GetVersion 66,
  GetStats 65, GetSceneList 65, GetStreamStatus 66, SetInputSettings 70,
  SetCurrentProgramScene 110; n=20 each, 0 failures across 120 calls) vs
  0.2–4.5 ms local — pure WAN+edge RTT, control still feels instant. Full
  remote setup 1.1–1.5 s vs 189 ms local (≈11 sequential round-trips).
- **stop()/wake semantics for the WS path:** /stop → SIGTERM → supervisord
  drains gracefully; the tunneled WS keeps answering during the drain window
  (a GetVersion SUCCEEDED 8 s after stop, and a "rewake" 358 ms later was
  still the draining old container, scenes intact) — then the instance dies
  for real and the next request boots a FRESH one (uptime reset, scenes gone —
  ephemeral disk). So: WS sessions do NOT survive a real sleep/wake; the
  driver must reconnect AND re-run setup from zero. sleepAfter remains
  untrusted (livelock note in research/cf-containers) — lifecycle owned
  explicitly via /stop + /kill.
- Dual output in cloud: NOT exercised (recording slot's baked URL points at a
  local sink; creating a CF Stream input was out of scope by the money rule).
  Mechanism is proven locally (Checkpoint 2) and is transport-agnostic.

## Checkpoint 4 — session cost + cleanup (verified)
- Runtime: quic probe "basic" ~2.5 min; obscloud standard-4 four boots ≈13 min
  total (one streaming). Raw ≈ $0.04 (9.4 k GiB-s mem + ~0.7 k vCPU-s + disk);
  deep inside included allotments → **$0.00 beyond the $5 Workers Paid base**.
  No egress of note (image push is ingress; d14 relay egress isn't ours).
- Deleted + verified: container apps `positron-obscloud-obscloud`
  (a03521cb) and `positron-obscloud-quic-quictest` (a03e146e) →
  `wrangler containers list` = []; all 4 registry image tags → `images list`
  empty; Workers `positron-obscloud` + `positron-obscloud-quic` →
  workers.dev URLs 404. No other CF resources were created (no Stream inputs,
  no R2/KV/DO beyond the apps' own wrappers, now gone).
- Local: mediamtx + collector killed; ports 1935/4455/8554/8890/8891 free;
  docker images obscloud/obsdock-obs/quicbuild + registry tags + alpine
  removed (rebuild paths documented below); pre-existing images (moq-dev,
  rust, positron-cnt-test-repacktest) untouched; volumes moq-target14/16 kept.
- Kept (this dir): NOTES.md, quic-test/ (Dockerfile, server.mjs, worker.mjs,
  wrangler.jsonc, moq-clock-ietf amd64 binary 8.5 MB — the redeployable
  probe), obs/ (Dockerfile, start-cloud.sh, serve-cloud.mjs, pages.conf,
  clock.html, profile/{basic.ini,streamEncoder.json}, plugin/{obs-moq.so
  48 MB, data/}), obs-worker/ (worker.mjs, wrangler.jsonc), mtx-dual.yml,
  run-dual.mjs, run-cloud-cold.mjs; results/obs-cloud-{dual,run}.jsonl +
  obs-docker-moq.jsonl rows. Rebuild-from-zero: obsdock build (159 s) →
  obscloud build (~1 min) → wrangler deploy (~3 min).

## Radio Tallinn cron-broadcast feasibility
PROVEN today: cron→`getContainer().start()` is the documented invocation path
and every stage after it was measured — wake→OBS-ready 7.4 s, remote setup
1.5 s, StartStream→MoQ-connected 0.4 s, viewer pixels ~11.6 s from cold; a
scene-collection show can be assembled per-broadcast over the Worker-proxied
obs-websocket (65 ms/command) since the disk is ephemeral anyway; timed stop =
StopStream + /kill (graceful SIGTERM drain proven); cost of a 2 h standard-4
show ≈ 12 GiB×7200 s = 86.4 k GiB-s + ~2 vCPU×7200 s — ≈ $0.22 mem + $0.29
CPU raw ≈ **$0.5/show, ~$0 within included tiers for a weekly show**. STILL
NEEDED: (1) a real cron Worker (`scheduled()` → start + drive + stop — the
driving logic must move from this Mac into the Worker/DO or a tiny queue
consumer, incl. the reconnect-and-resetup-on-fresh-disk rule and the 207-
NotReady retry); (2) an egress the audience can hear — d14 MoQ reaches the
deployed player but §13.4's no-death-signal + namespace discipline apply, and
the RTMPS→CF-Live leg (the proven socket-close-law world) is untested FROM
this image (transport reachable per cf-containers: 1935/443 out OK — the
recording-slot trick or the stream slot flipped to rtmp_custom would carry
it); (3) show content ingestion (browser sources fetch over the open egress —
fine; media files need R2 pull at boot, ~14–26 Mbps measured); (4) host-
restart resilience — no uptime guarantee, so the cron driver must watch and
re-run the boot sequence (11.6 s to pixels makes a mid-show self-heal
tolerable for radio).
