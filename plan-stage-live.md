# plan-stage-live: a show that starts, is recorded by the room that runs it, and plays back afterwards

Status: **research and a plan. Nothing here is built.** Written 2026-09-18 out of
one dictated block, quoted in full in `BACKLOG.md`. The closing instruction is
the one that shaped this document: *"make a plan and do a good research how we
could use our always capture utilities that we have, make it reusable as much as
possible."* So §6 is the load-bearing section and everything else feeds it.

`/stage/` exists and is 21/21 (`node demo/verify.mjs stage`). It draws a
generated test picture into three panels, sends a question from the control room
to the audience, and lays the answers on a strip. **Nothing crosses a wire.**
This plan is about replacing the picture with a real one, making the answers
real, and keeping the show.

⚠️ **THE ASK NAMES FOUR POSSIBLE SOURCES AND REFUSES TO PICK.** §3 reports what
is true of each and recommends a first step. It does not close the question, and
a later session must not read the recommendation as the answer to a question
that is still open.

---

## 0. One line, and the honest version of it

An audience opens a page and sees a card saying when the show is. Somebody in
the control room presses one button, a picture starts arriving over WebRTC, and
the audience sees it. The control room asks the room questions while it runs.
When it presses stop, what happened is in R2 and can be watched back on a
timeline with the questions and the answers laid beside the video.

**The honest version, and it belongs on the page:** the recording lives for
**six hours** and is capped at **24 MiB**, which at 800 kbit/s is about
**four minutes of show**. That is not a limit of R2 or of this design; it is
`workers/ingest`'s open tier, and §4.3 is about what it would take to raise it.
A "virtual stage performance" that runs an hour does not fit through the write
path this project has today, and saying so is the first thing this plan owes
anybody.

---

## 1. What is already measured, and is therefore not open

Every line here is in this repo with a date and a method. **Do not re-derive any
of it, and do not re-test the ones marked 🔴. Re-testing them spends somebody
else's money or this account's capacity.**

### The platform

| claim | number | where |
|---|---|---|
| 🔴 WHIP ingest **records nothing** | 183 s against a recording-ENABLED input, 26 polls, **zero assets**; reconfirmed from a real encoder, storage **512.54 before an 876-frame publish and 512.54 after** | `CLAUDE.md`, `PROGRESS.md:6056` and `:2538`, `plan-m2m` §5 |
| Cloudflare **refuses a single-track WHIP/WHEP offer** | HTTP 400, both directions | `CLAUDE.md`, `demo/verify.mjs:286-305` |
| WHIP and WHEP **must be used together** | an RTMPS input asked for WHEP answers 409 | `demo/shell/live.mjs:29-33` |
| WHEP glass to glass | **p50 67.0 / p95 76.9 / p99 84.1 ms**, n=17,501, burned pixels | `plan-session` §1 |
| WHIP to WHEP round trip | **p50 73.6 ms** | `proto/m2m/README.md:16` |
| MoQ glass to glass | p50 26.2 / p95 42.4 ms | `CLAUDE.md` |
| LL-HLS | ~3.3 s, and it is the compatibility tier | `plan-session` §1 |
| Stream bills **minutes, not bytes** | $1 per 1,000 delivered, **WebRTC starts billing 2026-10-15** | `CLAUDE.md`, GA notice 2026-09-08 |
| storage cap | **1000 minutes; filling it blocks new live streams**, which is an outage rather than a bill | `CLAUDE.md` |
| an idle broadcast | free on WHIP, storage on RTMPS | `plan-session` §5c |
| `candidate-pair` RTT is **not** media latency | quoting it flattered WHEP by ~3x | `CLAUDE.md` |
| Cloudflare **ramps WHEP resolution** | 640×360 → 960×540 → **1280×720 over ~30 s**; the burned row is unreadable below full resolution (0 clean at 640, 66 of 163 once climbed) | `demo/keep/index.html:474-477` |
| ffmpeg's WHIP muxer interoperates with Stream | **9.0.1, first try**, baseline and High both accepted and playback-verified; CF echoes the offer's `profile-level-id` | `rig/whep/WHIP-FFMPEG-NOTES.md` |
| the WHIP muxer arrived in **ffmpeg 8.0** | 7.1.1 had none, verified against release branches | `PROGRESS.md:6430` |

### This repo's own write path

Read out of `workers/ingest/worker.mjs` today, not from an older plan:

| cap | open tier | trusted tier | line |
|---|---|---|---|
| `ttlHours` | **6** | `null` (kept) | 50, 58 |
| `maxSegmentBytes` | 24 MiB | 5 GiB | 51, 59 |
| `maxSegments` | **45** | Infinity | 52, 60 |
| `maxSessionBytes` | **24 MiB** | Infinity | 53, 61 |
| `maxSessionsPerHour` | **5 per address** | Infinity | 54, 62 |
| `maxBytesPerHour` | 64 MiB per address | Infinity | 55, 63 |

🔴 **AND THE TRUSTED TIER IS NOT ACTUALLY IN FORCE ON THE WRITE. THIS IS A REAL
DEFECT AND IT IS LOAD-BEARING FOR THIS PLAN.** `/open` reads the tier
(`const L = TIERS[tier] || TIERS.open` at `worker.mjs:180`) and uses `L` for the
session count and the TTL. `/seg` does not: lines **217, 220, 223, 234** all read
the flat `LIMITS` object, which carries the open tier's numbers. So a caller
holding `SELFREC_TOKEN` gets an untimed session that the sweep correctly skips,
and is still refused at **24 MiB**, **45 segments** and **64 MiB an hour**.

That is `CLAUDE.md`'s own rule about a shared measurement living in two files,
in the one place where it decides whether a show can be recorded at all. **It is
not fixed here, because this document builds nothing.** It is the cheapest item
in §7 and it is written down so nobody plans around a ceiling that was supposed
to have been lifted.

### The relay, read from `workers/relay/src/index.js`

`MAX_SOCKETS` **128** (line 78), `MSG_PER_SEC` **1000** with a **2000** burst
(81, 82), `MAX_BYTES` 1000 KiB (77), `IDLE_MS` 10 min and only when the room is
full (98). The Durable Object hop is **1-2 ms at p50** and a full room costs the
sender about **8 ms at p50** over an empty one.

⚠️ **128 sockets is the audience ceiling if the audience lives in a relay room.**
The 129th upgrade is answered `503 room full (128)`, which a browser reports as
`closed 1006`, so a full room reads as a network fault. `openWire` in
`demo/shell/wire.mjs` asks `/stats` and says which, and that is the behaviour to
keep.

⚠️ **Two comments in the tree still say the old numbers** and are wrong rather
than out of date: `rig/board/video.mjs:15` reasons from `MSG_PER_SEC` 60, and
`workers/store/src/index.js:13` says "sixteen slots". Both were true once.

### The board, read from `rig/audit.mjs`

ffmpeg **7.1.5** (`8:7.1.5-0+deb13u1+rpt2`, Debian Trixie), `/dev/video11` as a
**single exclusive** hardware H.264 encoder, `v4l-utils`, a C925e camera that
captures **1920×1080 MJPEG at 30 fps** and audio at a **fixed 16,000 Hz**
(`plan-camera` §0). It already renders a generative shader headless and encodes
it: **29.6 fps at 1280×720 for 18.6% user + 14.0% sys of 400%**, 30 s, alongside
the running instruments, zero audio dropouts (`rig/board/video.mjs:10-11`).

---

## 2. What the audience sees before anything starts

**The decision: a card that says when the show is, in the panel's own picture
area, and no `<video>` element at all until the show starts.** Not an empty
video, and not nothing.

Three reasons, in order of weight.

**An empty `<video>` is a control that lies.** A black 16:9 box with a transport
under it is the shape of a thing that could be played, and it cannot. This
project has a name for that and a rule about it: `/stage/`'s own archive panel
lost its `live` badge on 2026-09-18 rather than have it re-worded, because a
status that can never be false is not a status.

**A `<video>` that exists is a `<video>` that costs something.** `armVideo` and
`playOrPrompt` exist because a media element and a user gesture interact badly,
and an element sitting there through a twenty-minute wait invites an autoplay
prompt, a poster fetch, and on iOS a `webkitEnterFullscreen` control over
nothing. Creating it at start costs one frame and removes all of that.

**And there is a real thing to say.** An audience arriving early wants one fact:
when. That is a `createCard` job (`demo/shell/card.mjs`), in the panel's stage
area, with the show's title and its time. When the control room starts, the card
is replaced by the video element and the badge changes with it.

⚠️ **AND THE BADGE USES THE STATES `createPresence` ALREADY HAS, NOT A NEW ONE.**
`PRESENCE_STATES` is `online · checking · coming · offline · unknown`
(`demo/shell/presence.mjs:41`), and a page shortens the words rather than
inventing a state: `says: { coming: 'soon' }`, which also shortens the badge
because the reserved width is measured off whatever it can say.

Before the show, the thing feeding the picture is the control room, and whether
the control room is there IS knowable: it is a socket in the relay room. So the
audience's left slot is honest at every moment. `offline` when nobody is in the
control room, `coming` when somebody is but has not pressed start, `online` when
frames are arriving. Three real states, none of them a decoration.

⚠️ **`coming` RATHER THAN `checking`, AND THAT FILE ALREADY SETTLED THE
DIFFERENCE.** `checking` means a question is out about a thing that was probably
there all along; `coming` means the thing is on its way up. A control room that
has joined the room and not pressed Start is the second, and it is the one case
in this project where `coming` is the true word rather than the flattering
one.

🔴 **A LATE JOINER HAS TO LEARN THE STATE, AND THE RELAY HAS NO BACKLOG.**
`workers/relay` relays and does not parse; nothing is stored, so an audience page
that opens after the announcement hears nothing at all. There are exactly three
ways out and the plan takes the first:

1. **The control room repeats itself.** A `show.state` message every 2 s while
   the room is open: about 0.5 msg/s against a 1000/s budget, which is 0.05% of
   it. Costs nothing, needs no new worker, and a page that joins mid-show is
   correct within two seconds.
2. `workers/cues` already stores a 500-cue backlog and hands it to a joiner
   (`workers/cues/src/index.js:55-57`). But it is **token-gated** on
   `CUES_TOKEN` and an audience page cannot hold a token. Rejected for the
   audience; see §4.4 for where it is still the right tool.
3. The audience probes WHEP and treats a 409 as "not yet". Rejected: it is a
   request to Cloudflare per polling page per interval, which is the shape of
   cost this project keeps refusing.

---

## 3. Where the feed comes from: four candidates, and a switch

### 3.0 What is common to all four

Whatever publishes, it publishes **WHIP to one live input**, and the audience
subscribes **WHEP to that same input**. That is forced, not chosen: Cloudflare
does not serve WHEP from an RTMPS input (409) and does not serve HLS from a WHIP
one. `demo/shell/live.mjs:38` hardcodes `WHEP_UID` as
`224558e8993d5a5efd234d9d3a320f87` ("whep-rig") and
`workers/pub/worker.mjs:190` reads the publish URL out of `env.WHIP_URL`. They
are the two ends of **one input**, and `rig/whep/WHIP-FFMPEG-NOTES.md` confirms
the ffmpeg runs used that same uid.

**So "a switch" is not a video switcher. It is the question of who holds the
WHIP session,** and today exactly one thing can. `workers/pub/worker.mjs:204`
already says so in its own comment: *"Two publishers is one publisher and a
fight"*. It stops the container's leg before letting a browser take the input
over. A real switch is either a second live input plus a second `WHEP_UID` (so
the audience re-subscribes, with a visible gap), or a compositor upstream of the
one WHIP session (which is what OBS is for). Both are §8 questions.

⚠️ **`WHIP_PER_HOUR` is 20** (`workers/pub/worker.mjs:21`), counted in a Durable
Object. Every full `verify.mjs` run already spends one on `/keep/`, whose `go`
control the harness presses. A second publishing page spends a second. Twenty an
hour is generous for a performance and tight for a development loop.

⚠️ **And the rate-limit stamps and the id→resource map are IN-MEMORY on the DO**
(`worker.mjs:34-35`, `#whipHits` / `#whipRes`). An eviction loses both: the
counter resets, which is harmless, and the DELETE mapping vanishes, which means
`stop()` silently cannot tear the session down. This is the same failure shape as
the device-log ring buffer that evaporated in 46 seconds, and it is measured
there rather than here.

### 3.1 The control room browser

**Already built, already deployed, already measured.** `demo/keep/index.html:160`
is one line: `whipPublish(canvas.captureStream(FPS))`. Measured 2026-09-08 from a
canvas: **HTTP 201, connected/connected, 140 frames and 511 KB sent in the first
six seconds**. `rig/whep/publish.html` has been doing the same from a canvas for
months.

| | |
|---|---|
| what it can source | a canvas, a camera through `getUserMedia`. **A screen through `getDisplayMedia` is used nowhere in this repo** and is an assumption |
| picture quality | whatever the browser's encoder gives. No number here for a browser WHIP publish specifically |
| cost to try | **zero.** Nothing to build, nothing to deploy, nothing to provision |
| time from press to picture | the WHIP handshake, then Cloudflare's **~30 s resolution ramp** |

**Three things that are true of this option and of no other.**

🔴 **ONE CLOCK AT BOTH ENDS.** The publisher burns `Date.now()` into the picture
and the same machine reads it back out, so `now - burned` is the **whole round
trip with no cross-machine offset to guess at**. `demo/keep/index.html:173-180`
says so in its own words: *"That is the one thing a browser publisher buys that
an ffmpeg one cannot."* Every other option puts the burner on a different machine,
and then the number carries an unknown offset that must be printed and never
used, which is the whole of `plan-session` §3, three sections of argument to
recover a weaker claim.

🔴 **THE RECORDER AND THE PUBLISHER ARE THE SAME PROGRAM.** "When the control
room stops, all the chunks have landed" is a promise one process can make about
itself. Split across two machines it becomes a distributed problem.

⚠️ **AND THE ONE REAL HAZARD IS THE TAB.** `requestAnimationFrame` throttles to
about 1 Hz in a background tab, so a canvas source stops drawing the moment the
operator looks at something else. `timeline/keepalive.mjs:11` lists a live
`RTCPeerConnection` among the things exempt from browser throttling, which is
about the connection, not about the drawing loop that feeds it. **Whether the
picture survives the operator switching tabs is untested and is the first thing
to find out**, and it costs one publish and one look.

### 3.2 The container this project already has

🔴 **IT ALREADY PUBLISHES WHIP, TODAY, IN PRODUCTION. THIS IS NOT A "COULD".**
`workers/pub/container/server.mjs:196-213` (`whipArgs()`) runs
`ffmpeg … -f whip <env.WHIP_URL>` as a permanently wired second leg, with
`libx264 -profile:v baseline -level 3.1 -bf 0 -g 60 -b:v 2000k` and
**`-c:a libopus`** (the WHIP muxer defaults to h264+opus, not aac). Routes
`POST /start-whip` and `POST /stop-whip` at lines 374 and 384. The args were
lifted from `rig/whep/WHIP-FFMPEG-NOTES.md` rather than invented.

**But what it publishes is `testsrc2`.** The image is
`node:22-alpine` + `ffmpeg` + `ttf-dejavu` + one copied file. **No browser, no
compositor, no GPU, nothing that can make a picture of a show.** Turning it into
a stage source means giving it something to send, and there are only two shapes
for that: pull a file out of R2 at boot, or put a browser in the image, which
is the OBS variant below.

| | |
|---|---|
| instance | **custom `{vcpu: 1, memory_mib: 3072, disk_mb: 2048}`**, `max_instances: 1` |
| why custom | `standard-1` is **half a vCPU**; two x264 encodes on it ran at **~40% of realtime** and Cloudflare starved, logging lags of 59 s and 83 s. The platform refuses <3 GiB per vCPU, so 3072 MiB is a floor |
| cold start | **~3.7 s** from a hard stop (3.3 s Firecracker + image start, 0.42 s inside); ~16 s first-ever after a deploy |
| lifecycle | ⚠️ **`sleepAfter` does not fire**: a 90 s setting survived ~18 minutes of idle, a livelock in `@cloudflare/containers` 0.0.28. ⚠️ **`stop()` sends SIGTERM and node as PID 1 ignores it**: 15 minutes to SIGKILL. `workers/pub` reference-counts viewers instead |
| networking | inbound **Worker-fetch only, no public IP**. Outbound wide open: TCP 443/8080/**1935**, **raw UDP works**, and `rig/obs-cloud/NOTES.md` later measured a full **QUIC/WebTransport/MoQ session out of a container** (connect 55 ms, 21/21 ticks, p50 2 ms) |
| uptime | **no guarantee.** A host restart kills the instance and every wake gets a **fresh ephemeral disk** |
| cost | the whole `research/cf-containers` experiment came to **$0.00 beyond the $5 Workers Paid base** |

**The OBS-in-a-container variant is measured and it works.** `rig/obs-cloud/`
put the 1.25 GB `obsdock` image on **standard-4** and drove it from this laptop
over a Worker-proxied obs-websocket: **cold wake to pixels 11.6 s**, OBS at
**~190% of one EPYC core ≈ 52% of the standard-4**, control plane **p50 ~65 ms**
through the tunnel, glass to glass **p50 170 / p95 185 ms** over MoQ. Two traps
worth the price of admission: **CF Firecracker guests have no `/dev/shm`**, so
CEF dies `FATAL … incorrect permissions on /dev/shm` and OBS exits SIGTRAP in a
crash loop; and **a WS session does not survive a real sleep and wake**, so the
driver must reconnect AND re-run setup from zero on a fresh disk.

⚠️ **Those apps were deleted at the end of that session and verified gone.**
Rebuilding is `docker build` 159 s + obscloud build ~1 min + `wrangler deploy`
~3 min, and it needs a machine that can run `docker build --platform
linux/amd64`. **Nothing of the OBS container is deployed today.**

⚠️ **AND OBS-IN-A-CONTAINER PUBLISHING WHIP IS NOT MEASURED.** MoQ out of a
container is. RTMPS out is reachable. WHIP needs ICE over UDP, which
`research/cf-containers-2026-08.md:172` says works and marks the media quality
on 2-4 shared vCPU as untested. **This is an open question, in §8.**

### 3.3 The M1 under OBS, driven remotely

🔴 **THIS IS ALSO ALREADY BUILT AND ALREADY MEASURED PUBLISHING WHIP TO THIS
EXACT INPUT.** `rig/obs-pro/stream.mjs` is *"one driver for the M1's OBS across
all three transports"*: `hls` (rtmp_custom to Cloudflare RTMPS), **`whip`
(whip_custom to the whep-rig input)**, `moq` (moq_service), and `off`. Driven
over obs-websocket v5 through `ObsClient` in `rig/obs-docker/control.mjs`.

Measured on the M1 Pro, all four legs, one source:

| transport | connect | frames | skipped |
|---|---|---|---|
| HLS (RTMPS) | 1.8 s | 1038 | **0** |
| **WebRTC (WHIP)** | **3.6 s** | **876** | **0** |
| MoQ 720p | 113 ms | not recorded | 0 |
| **MoQ 4K30** | 137 ms | 2451 | **0 (0.00%)** |

**4K30 held on software x264 at 6.2 Mbit/s with zero dropped frames; the hardware
encoder was never needed.** That is the best picture any of these four options
has been measured producing, by a distance.

**What it costs, and the list is specific:**

- 🔴 **ONE STREAM-SERVICE SLOT.** OBS has exactly one, and `rtmp_custom`,
  `whip_custom` and `moq_service` all want it. **No two of these run at the same
  instant through this path.** The dual-output trick that was proven (the
  recording slot as "Custom Output (FFmpeg)" with an rtmp URL) is baked into the
  **obs-cloud** image, not this one.
- ⚠️ **macOS Local Network Privacy is granted per app.** `curl` on the M1 fetched
  a LAN URL fine; Chrome and OBS on the same machine got
  `ERR_ADDRESS_UNREACHABLE`, which is **a pure black frame with nothing in any OBS log.**
  Terminal processes inherit the grant, `.app` bundles do not. `serve.mjs` binds
  `127.0.0.1` for exactly this.
- ⚠️ **`BrowserHWAccel=true` renders every browser source black** on a Mac with
  no attached display.
- ⚠️ **OBS refuses `osascript quit` (`-128`)** and System Events has no assistive
  access there, so it cannot be restarted to pick up a written config, and the
  running instance **clobbers `basic.ini` on its eventual exit**.
- 🔴 **AND THERE IS NO WAY TO REACH IT FROM OUTSIDE TODAY.** obs-websocket
  listens on port 4455 on the M1's own network. `rig/obs-pro/*` runs *from the
  M1's own checkout*. The only thing that machine dials out with is
  `live-agent.mjs`, which carries MIDI notes and PCM audio and knows nothing
  about OBS. `rig/obs-cloud/` built the Worker tunnel for the CONTAINER, not for
  this Mac. **"Remotely control the M1 with OBS" is a bridge that does not
  exist**, and it is the difference between this option and the first one.
- ⚠️ **And the machine has to be awake, with a login session, with a person
  having started things.** `rig/m1/README.md` parks the Ableton rig for exactly
  this class of reason and says the honest version: *"it is a performance
  instrument, not an always-on one. Wake it deliberately for a session; do not
  expect `/rack/` to be green on a random Tuesday."*

### 3.4 The Raspberry Pi, and the OBS question answered

**The ask wonders in writing: *"I'm not sure OBS works on Raspberry Pi, or maybe
it does."* The answer is NO for this purpose, and the reason is not the
hardware.**

How this was determined: by reading Debian's own packaging source rather than by
trying it, because the blocker is in the build flags and is visible there.

🔴 **`debian/rules` passes `-DENABLE_WEBRTC=FALSE`.** It is there in trixie's
`30.2.3+dfsg-3` and in sid's `32.2.2+ds-1`, and the changelog entry that
introduced it is `obs-studio (30.0.2+dfsg-1)`, **2023-12-29, "Disable WebRTC
support for now"**. The cause is that **`libdatachannel` is not packaged in
Debian at all**. Raspberry Pi OS is rebased on Debian 13 Trixie, so
`apt install obs-studio` on a current board gives **OBS 30.2.3 with no WHIP
output whatsoever**. The same rules also set `ENABLE_BROWSER=FALSE` and
`ENABLE_AJA=FALSE`.

For completeness, the version question is not the problem: **WHIP shipped in OBS
Studio 30.0.0 on 2023-11-12** ("Added WHIP/WebRTC output"), needs no plugin in an
upstream build, and 30.2.3 is past it. It is compiled out, not missing.

And there are three more walls behind that one:

- **OBS requires an OpenGL 3.3 GPU. The Pi gives 3.1.** Mesa's V3D is a
  conformant GLES 3.1 driver (Pi 4 is V3D 4.2, Pi 5 is V3D 7.1) and `glxinfo` on
  a Pi 5 reports `3.1 Mesa 25.0 … V3D 7.1.10.2`. The workaround is
  `MESA_GL_VERSION_OVERRIDE=3.3`, which people report launching successfully.
  ⚠️ **Whether that override keeps the v3d path or silently drops to llvmpipe is
  disputed between sources and is unknown.**
- **There is no headless mode.** OBS is a Qt GUI app; the community pattern is
  Xvfb plus obs-websocket, which puts rendering on software GL.
- **OBS has no V4L2 M2M encoder**, so even on a Pi 4 stock OBS would encode with
  x264 and never touch `/dev/video11`.
- **The browser source does not exist on ARM at all** (no CEF build), which
  removes the one thing OBS would have been for.

**What the board CAN do, and it is a lot.** `rig/board/video.mjs` already renders a
generative shader headless on the VideoCore and encodes it with the hardware
encoder: **29.6 fps at 1280×720 for 18.6% user + 14.0% sys of 400%**, 30 s,
alongside the running instruments, zero audio dropouts. The camera does
1920×1080 MJPEG at 30 fps.

**So the Pi's WHIP path is ffmpeg, not OBS, and the board cannot run it today.**
The WHIP muxer arrived in **FFmpeg 8.0** (merged 2025-06-04, released
2025-08-22); it is absent from 7.1's doxygen. `rig/audit.mjs:52` pins the board
at **`8:7.1.5-0+deb13u1+rpt2`**, and Debian trixie ships 7.1.5 for everybody, so
`ffmpeg -muxers | grep whip` on that board comes back **empty**. A backport or a
self-build is the price.

Two lighter Pi options exist and both are worth naming:

- **MediaMTX**: a single static arm64 Go binary with a **native Raspberry Pi
  camera source** and WHIP publish. **Nothing to build**, which makes it the
  cheapest Pi answer on this list.
- **GStreamer `whipclientsink`** (plugin `rswebrtc`, renamed from `whipsink` in
  gst-plugins-rs 0.12.0, 2024-02-08). ⚠️ **gst-plugins-rs is not in Debian**, so
  it is a cargo + cargo-c build. `webrtcbin` itself **is** packaged for arm64 in
  `gstreamer1.0-plugins-bad`, so a hand-rolled WHIP signaller over it is a
  no-Rust option.

🔴 **AND THE REASON NOT TO GO NEAR THE BOARD IS NOT TECHNICAL.** It is in another
building, it is a shared instrument, `/dev/video11` is **single and exclusive**,
and when it wedges **nothing kills it and recovery is a reboot**. SIGTERM,
SIGKILL and `timeout` all do nothing, and `modprobe -r` answers "Module is in
use". `/knobs/` was already found refusing to start because somebody had pressed
a control that took the sound away from a person in another building. A stage
source on that board is a second such control.

### 3.5 The recommendation, and it is a first step rather than an answer

**Start with the control room browser.** Four reasons, in order:

1. **Every line of it is deployed and measured.** `whipPublish` is in the kit,
   the proxy is in `workers/pub`, the input exists, `/keep/` presses it on every
   suite run. **The cost to try is zero**, and no other option is within an hour
   of that: the container needs a 1.25 GB image built and deployed, the M1 needs
   a remote-control bridge that does not exist, the Pi needs a backported ffmpeg
   on a machine that must not be broken.
2. **It is the only one with one clock at both ends**, which is what makes the
   round-trip number and the archive's self-checking seek honest rather than
   offset by an unknown.
3. **It is the only one that starts on a press.** The container is 11.6 s from
   cold to pixels at best and its instance has no uptime guarantee; the M1 needs
   a person in the room.
4. **It is the ask's own leaning**, *"just to get it going"*, and the ask is
   right about why.

**And name the second one now, because it is not far away.** The M1 under OBS is
**already measured publishing WHIP to this exact live input with 0 skipped frames
and 4K30 on software x264**. What stands between it and a show is one bridge: a
way to reach obs-websocket from outside that building. The pattern for it is
written down in `rig/obs-cloud/obs-worker/worker.mjs`, which proxies
obs-websocket through a Worker at p50 ~65 ms, and `control.mjs` drove cloud OBS
**unchanged** through it. That is a small, well-understood piece of work with a
measured precedent, and it turns "the M1 with a real camera and real scenes" into
a source this page can pick.

⚠️ **And a switch, when there is one, is limited by a measured hold.**
`workers/pub/container/server.mjs:241` sets `LEG_RETRY_MS = 45_000` because a
WHIP leg that dies uncleanly cannot be restarted immediately: **Cloudflare holds
the input against the stale publisher for roughly 45 seconds.** So a source
change is not a cut, it is a gap, and the gap is up to three quarters of a minute
unless the outgoing publisher tears down cleanly.

---

## 4. Recording, given that WHIP records nothing

### 4.1 What records, and off which track

**A `MediaRecorder` in the control room, over the track that came BACK from
Cloudflare.** Not over the canvas, not over the camera, not over the outgoing
stream.

This is `/keep/`'s decision and it already has the assert that makes it true:
`demo/keep/index.html:464` proves the recorder's track is the **receiver's**, by
**object identity** against `sub.pc.getReceivers()`. An id comparison passes
vacuously here, because a remote `MediaStream` carries the SENDER's msid and
`remote.id === local.id` after a hop.

**Why the returned track and not the local one.** What the audience saw is the
returned track. A recording of the canvas is a recording of what we meant to
send, and the two differ by an encode, a network and a resolution ramp that
Cloudflare drives. Recording the source would make the archive a better picture
than the show, which is a lie in the flattering direction.

⚠️ **The cost, said plainly and not upgraded later:** what lands in R2 is a
SECOND encode of the decoded pictures, not the bytes off the wire. The claim is
about where the pictures came from, never about byte identity.

⚠️ **And the first ~30 seconds are 640×360.** Cloudflare ramps WHEP resolution
and the archive will carry the ramp. Either the control room starts recording
after the ramp (and the archive is shorter than the show), or the archive opens
soft (and the video lane's start is the truth). **Take the second**: the lane is
called "when the video started and ended" and a recording that begins later than
the show would make that lane a lie. Say it in the page's own words.

### 4.2 How chunks reach R2, and what "everything landed" means

There are exactly two tokenless-or-token write paths in this repo and they make
opposite trades. Both are already built.

| | `workers/ingest` | `workers/selfrec` |
|---|---|---|
| auth | **tokenless**; a token only upgrades the tier | **Bearer on every route** but `/time` |
| session id | **server-minted**, 16 hex | **client-chosen** `<show>/<participant>` |
| caps | 24 MiB session, 45 segments, 5 sessions/h/address | one flat 64 MiB per chunk, **no quota at all** |
| TTL | 6 h + a cron that really deletes | **none**; deletion is an explicit `POST /delete/<show>` |
| ordering | **dense `seq` enforced**, 409 otherwise | none |
| integrity | none | **`X-Chunk-Sha256` handed to R2**, which verifies server-side |
| body | `await request.arrayBuffer()` | **streamed** |
| manifest | the worker writes it at `/close` | the **client** POSTs it to `/finalize` |

🔴 **THE ASK'S OWN WORDS PICK SELFREC AND THE ASK DOES NOT KNOW IT.** *"single
feed and single file, what you can overwrite maybe"* is precisely what a
client-chosen key buys: `selfrec/stage/live/` is a FIXED address, so the archive
tab fetches
`https://archive.positron.studio/selfrec/stage/live/manifest.json` and never has
to be told which show it is looking at. Ingest mints a fresh id every time, so
something has to carry that id from the control room to the archive, on every
device that wants to watch. **That is the difference between a link that works
tomorrow and a link that has to be handed over.**

And the thing that makes selfrec the answer is not the key. It is
`/Users/s32863/personal/positron/proto/selfrec/participant.html`, which already
implements **every one of the guarantees this ask asks for**:

- **An IndexedDB elastic buffer.** A closed chunk is written to an object store
  keyed on `seq` before it is posted and deleted only when the post verifies, so
  a chunk survives a tab that dies mid-show.
- **`sha256Hex(blob)` into `X-Chunk-Sha256`**, passed to `R2.put({ sha256 })`, so
  R2 refuses a corrupt body server-side rather than storing it.
- **An availability proof**: a `HEAD` on the public URL after the POST, comparing
  content-length and `etag == md5`. "Uploaded" and "readable" are two claims and
  it makes both.
- **A manifest with real anchors**: `T0recStartPerf/Date`, `T0firstDataPerf/Date`,
  `durationMs`, `chunkCount`, `bytesTotal`, **`missing`**, and per chunk
  `{seq, key, bytes, sha256, closeT, uploadOkT, attempts}`.
- **Clock skew against `/time`**, five samples, min-RTT wins.

🔴 **SO "WHEN THE CONTROL ROOM STOPS, ALL THE CHUNKS HAVE LANDED" IS A
MEASUREMENT, NOT A HOPE, AND IT IS ALREADY WRITTEN.** The answer is the
manifest's `missing` array being empty and every chunk having a `uploadOkT`. The
control room says so in words and the archive refuses to open a recording whose
manifest lists a gap.

⚠️ **`missing` MUST BE DISPLAYED, NOT JUST RECORDED.** A field nobody reads is
the `expiresAt` problem again: `/open` has returned an expiry since it was
written and no demo has ever shown it.

### 4.3 The three ways to actually get the bytes in, and what each costs

**(a) `ingest`, open tier, today, nothing new.** Tokenless, works from the
deployed page, **24 MiB a session** and **6 hours**. At 800 kbit/s that is about
**four minutes**. At 300 kbit/s, about eleven. The archive URL is a server-minted
id that has to be carried to whoever watches.
**Cost to try: zero.** This is what §7 builds.

**(b) `ingest`, trusted tier, after the §1 defect is fixed.** Two edits inside
`workers/ingest/worker.mjs`, with `#charge` reading `L` rather than `LIMITS`, plus
somewhere for the operator to put a token that is not the URL. Then: no TTL, no
byte cap, still a dense sequence and still a server-minted id.

**(c) `selfrec` at a fixed path.** No caps, no TTL, integrity checked, a stable
URL, and the participant page's whole discipline to copy from. It needs
`SELFREC_TOKEN` in the control room, and `workers/selfrec/src/index.js:78-80`
compares it with a plain `!==` and accepts it **in a query string**, which is the
exact case `workers/ingest/lab/tier-test.mjs:32` asserts must not grant trust in
the other worker. **Two workers, one secret, two different ideas of how to check
it** is worth one line of repair before a third caller arrives.

⚠️ **AND THREE WORKERS SHARE `elektron-archive-test`, ONE OF WHICH RUNS A CRON
THAT DELETES EVERY OBJECT UNDER A PREFIX.** `workers/station/wrangler.jsonc:11-14`
refuses that bucket in writing for this reason. A stage recording under
`selfrec/` is not in the swept prefix (`demo/ingest/`) and is safe, and that
safety is a fact about two string constants rather than about a design. Say so
where the key is built.

### 4.4 The failure modes, named

| what fails | what it looks like | what answers it |
|---|---|---|
| a chunk POST fails mid-show | the archive is short, and nothing says so | the IndexedDB buffer holds it and the drain retries; `missing` records what never landed |
| the control room tab dies | the show goes on, the recording stops | the buffer survives the tab; a reopened control room drains it. The **live** leg does not survive and cannot |
| two PUTs race and arrive swapped | `409 out-of-order` from ingest, which reads as a server fault | **serialise the shipper.** `demo/capture/index.html:181` fires `shipSeg` without awaiting and has never raced at a 2 s timeslice; `demo/shell/ingest.mjs:47-50` documents it |
| the session byte cap is hit mid-show | `507` on a PUT, and every later segment is refused | end the take rather than skip, because the sequence must stay dense. Show the remaining budget as a readout cell that moves |
| the address session cap is hit | `429` with `retryInS` on `/open`, after five shows in an hour | print the number and the retry, the way `/capture/` already logs it |
| a WHIP session is never torn down | the input stays held and the next start fights it | `whipPublish().stop()` DELETEs through the proxy, **unless the Pub DO was evicted**, since the id→URL map is in memory |
| the recording is WebM with `duration: Infinity` | a transport bar with no range to scrub | the seek-to-`1e6` dance, which exists **five times** in this repo under three names (§6) |
| the DO records frames out of order | rows in the wrong order, silently | `workers/store/src/index.js:83-89`: the input gate holds events across a **storage** await and NOT across `blob.arrayBuffer()`, so handling is serialised through one promise chain |
| a binary frame is stored as an empty BLOB | a row that reads back at 0 bytes while looking recorded | `workers/store/src/index.js:125-131`: a DO's outbound socket hands binary over as a **Blob**; `await data.arrayBuffer()` and bind the ArrayBuffer |

### 4.5 Playing it back, and the part that is genuinely hard

`demo/shell/ingest.mjs:73-90` (`fetchBack`) already reassembles a session into
one Blob. For a four-minute show that is fine: fetch it, `URL.createObjectURL`,
resolve the duration, play.

For anything longer it is wrong, and this repo has already built the right
answer twice:

- **`proto/selfrec/indexer.mjs`**: a zero-dependency EBML parser that walks the
  chunk sequence and writes a **cluster index** (`[{tMs, chunkSeq, offsetInChunk,
  byteOffset}]`). Replay is then **Range requests plus MSE**: send bytes
  `[0, firstClusterOffset)` of chunk 0 as the init segment, then any
  cluster-aligned range near the target time. **No ffmpeg, so it can run in a
  Worker.** Its honesty is worth copying too: MediaRecorder writes clusters with
  an unknown EBML size, so it scans for the cluster ID and validates each hit,
  and false positives are **counted rather than indexed**.
- **`proto/selfrec/repackage.mjs`**: the ffmpeg path, on a machine with ffmpeg:
  concat the chunks, remux h264-in-WebM with `-c copy`, transcode VP8 with
  libx264, out as fMP4 HLS in 4 s segments. Carries a trap worth reading before
  any encode of a MediaRecorder file: **its WebM has a 1 kHz timebase and no
  fps**, so ffmpeg's default CFR sync duplicates frames to ~1000 fps;
  `-fps_mode vfr` keeps the real timestamps.

**For the first step, use the Blob.** Name the indexer as what replaces it, and
do not build it before something is too long to fetch.

---

## 5. The archive timeline, lane by lane

The ask specifies this exactly and it is **not** to be redesigned. Here it is
against what `timeline/strip.mjs` already renders, and against what `/stage/`
already draws.

### Lane 1: when the video started and ended

**Already built.** `demo/stage/index.html:VIDEO_LANE` is a `spans` lane, height
30, one row with `payload.durMs`, colour `#6f7d94`, labelled `the show`.
`spansOf` (`timeline/strip.mjs:409-413`) reads `payload.durMs ?? dur ??
durationMs` and makes a bar of it.

What changes: `durMs` stops being the constant `SHOW_MS` and becomes the
recording's real duration, read once off the manifest. And its `describeRow`
gains the wall-clock time the show started, which `pattern.mjs` already burns
into every frame.

### Lane 2: when each question was sent, and how long it stood

**The one lane that does not exist yet, and it needs no new renderer.** It is a
second `spans` lane. Each row is a question, `at` is when it was sent, and
`payload.durMs` is the distance to the next question.

🔴 **THE LAST QUESTION GETS NO `durMs` AND THAT IS THE POINT.** `spansOf`
(`timeline/strip.mjs:424`) leaves an unterminated span open, runs it to
`Infinity`, and **the renderer feathers its right edge**. A question that was
still standing when the recording stopped was not overridden by anything, and a
feathered edge says exactly that, where a bar closed at the show's end would
claim an event that never happened. This is the library already knowing something
the page would otherwise have had to invent.

Its colour must be neither lane 1's slate nor the answer lanes' colour. One
lane, one row per question, `terse: false` so the question's own text is the
label.

### Lanes 3..n: the answers, one per option, all the same colour

**Already built.** `demo/stage/index.html:laneFor(opt)` makes a `ticks` lane per
option, height 26, `width: 2`, **`color: '#ffd400'` for every one of them**,
`terse: true`, with one mark per answer. The lanes appear as questions are asked,
in the order the options were offered. `relane()` rebuilds the list and calls
`strip.strip.setLanes()`.

So the ask's "one, two or three lanes in the same colour" is **satisfied today**,
including the same-colour part, and the page already has a check that the lanes
are really there (`laneCount >= 3`).

What changes: `ANSWERS` stops being filled by the local `onPick` and starts being
filled from the relay, and every `at` becomes an offset into the RECORDING rather
than time since page load. §5.1.

⚠️ **THREE OR MORE OPTIONS IS THREE OR MORE LANES AND THE STRIP MUST NOT CLIP.**
`STRIP_MIN_H` is a floor of 150 px, not a height; lanes needing more get more.
Measured on 2026-09-18 at 50 px before and 150 after.

### 5.1 The one arithmetic that has to be right: what `at` means

Every mark on this strip is a position **in the recording**, and the recording
starts when `MediaRecorder` starts, not when the page loaded and not when the
WHIP handshake finished.

So there is exactly one origin, `T0`, and it is the recorder's first data. That
is the number `proto/selfrec/participant.html` already records as
`T0firstDataPerf` / `T0firstDataDate`, and the reason it records both is that one
of them is comparable with `performance.now()` locally and the other is
comparable with a message that arrived from another machine.

**An answer arrives from an audience device with that device's clock on it.**
Never trust it. The relay stamps nothing useful either. Use **the control room's
own receive time**, which is one clock for every mark on the strip, and say in
the page's words that a mark is when the answer ARRIVED, not when it was pressed.
The difference is the network, it is tens of milliseconds, and a strip that
claims otherwise is claiming a precision it did not measure.

⚠️ **The same applies to the question bars.** `at` is when the control room SENT
it, which is the one thing the control room can know exactly.

### 5.2 Where the marks come from after the show

During the show the control room has every question and every answer in memory.
Afterwards it does not, and neither does a different device.

`workers/store` records a relay room into SQLite by **joining it as an ordinary
socket** and handing back NDJSON at `GET /room/<name>/history`. That is the right
shape and it is **not** the archive: `CAP_DEFAULT`/`CAP_MAX` is **1000 rows**,
`KEEP_MS` is **24 hours**, and it idle-stops after 30 minutes
(`workers/store/src/index.js:41-44`). A show with a large audience can spend 1000
rows on answers alone, and a day later the whole thing is gone.

**So the events belong in R2, beside the video, written by the control room when
it stops.** One JSON sidecar next to the recording:

    { T0, durationMs, questions: [{at, title, options}], answers: [{at, pick}] }

It is small, it is written once, it lives exactly as long as the video does, and
the archive fetches one file rather than two services. `workers/store` stays
useful as a live tap while the show runs and as the thing that can reconstruct a
sidecar somebody forgot to write, which is a different job.

---

## 6. The reuse inventory

The instruction was *"make it reusable as much as possible"*. This section is the
answer: almost none of this is new code.

### (a) Import exactly as it is, with no change to anything

| what | where |
|---|---|
| `whipPublish(stream, {log})` → `{pc, id, stop()}` | `demo/shell/live.mjs:165-197` |
| `whepPlay(url, video, {log, onTrack})` → `{pc, inbound, location}` | `demo/shell/live.mjs:214-247` |
| `whep()` / `WHEP_UID` / `WHIP_PROXY` | `demo/shell/live.mjs:38-40, 148` |
| `offerSdp()`, the 409 retry, with `live-test.mjs`'s six checks behind it | `demo/shell/live.mjs:272-292` |
| `openSession` `putWhole` `fetchBack` | `demo/shell/ingest.mjs` |
| `createVideoPanel`, which takes a `<video>` or a canvas, same call | `demo/shell/video-panel.mjs` |
| `createTabs` `createPresence` `createField` `createChoice` `createCard` `createGlue` | `demo/shell/` |
| `createTransportBar(…, {scrub:false, time:false, loop:false})` | `demo/shell/transport-bar.mjs` |
| `createStripView` / `STRIP_MIN_H` / the `spans` and `ticks` renderers | `demo/shell/strip.mjs`, `timeline/strip.mjs` |
| `createDeck` / `mediaMaster` | `timeline/transport.mjs`, `timeline/media-master.mjs` |
| `openWire`, and the thing that tells a FULL ROOM from a DEAD RELAY | `demo/shell/wire.mjs:153` |
| `burn` `readBurned` `readBurnedFrom` `videoHue` | `demo/shell/pattern.mjs` |
| `armVideo` `playOrPrompt` `recorderMime` `mount` `guard` `el` | `demo/shell/shell.mjs` |
| `SELFCHECK` / `ifSelfcheck` | `demo/shell/selfcheck.mjs` |
| the whole WHIP proxy, rate limit and opaque-id teardown | `workers/pub/worker.mjs:189-254` |
| the whole R2 write path, quota DO, manifest and sweep | `workers/ingest/worker.mjs` |

### (b) The capture utilities that are NOT in the browser

The ask's words were *"our always capture utilities that we have"*, and the
largest ones are outside `demo/`. None of them is a dependency of §7, and all of
them are what §3's other three options are made of.

| what | where | state |
|---|---|---|
| **the ffmpeg WHIP publisher, in a container** | `workers/pub/container/server.mjs:196-213` (`whipArgs`), routes at 374 and 384 | **deployed and running** |
| **the ffmpeg RTMPS publisher, on a Mac** | `src/publish.sh` | works; **pins `ffmpeg@7` because Homebrew's 9.x dropped libfreetype**, so no `drawtext` and no clock overlay |
| **the burned filter, generated rather than copied** | `src/publish.sh:55` shells `node demo/shell/pattern.mjs --epoch= --hue= --font=` | the one place a publisher provably cannot drift from the canvas |
| **secret redaction at the point of capture** | `workers/pub/container/server.mjs:215-231` | exists because ffmpeg printed the stream key verbatim into output a public route served |
| **the obs-websocket v5 client** | `rig/obs-docker/control.mjs` (`ObsClient`) | drives obs-pro, obs-docker and obs-cloud unchanged |
| **the M1's OBS driver, three transports** | `rig/obs-pro/stream.mjs` | measured on all four legs; **WHIP connect 3.6 s, 876 frames, 0 skipped** |
| **OBS in a Cloudflare Container** | `rig/obs-cloud/` (Dockerfile, worker, baked profile, plugin) | proven end to end; **the app was deleted**, rebuild is ~5 min plus a docker host |
| **headless Linux OBS in Docker** | `rig/obs-docker/` | 1.08 GB image, 159 s build, full remote config from zero in 189 ms |
| **the board's hardware H.264 encoder** | `rig/board/video.mjs` | 29.6 fps at 720p for 18.6% + 14.0% of 400%; **no WHIP muxer on that ffmpeg** |
| **the selfrec participant** | `proto/selfrec/participant.html` | IndexedDB buffer, sha256 per chunk, HEAD availability proof, a manifest with `missing` |
| **the WebM cluster indexer** | `proto/selfrec/indexer.mjs` | pure JS, no ffmpeg, so it can run in a Worker |
| **the WebM to fMP4 HLS repackager** | `proto/selfrec/repackage.mjs` | needs ffmpeg; carries the `-fps_mode vfr` trap |
| **the composite recorder with no OBS in it** | `proto/m2m/composite.html`, `run-composite.mjs` | headless Chrome composites a grid; **p50 39% of a core for the whole thing** |

⚠️ **`CLAUDE.md` mentions OBS zero times**, while this project owns three OBS
rigs and has measured all of them. That is a gap between the index and the work,
and it is why the ask had to wonder about the Pi at all.

### (c) Exists in the wrong shape: lift it, do not copy it

| what | today | what it should be |
|---|---|---|
| **the "wait for an actual frame" loop** | `demo/keep/index.html:168`, inline. A WHEP track exists before it carries anything, which is real knowledge | `waitForFirstFrame(video)` in `live.mjs`, or `whepPlay(…, {waitForFrame:true})` |
| **the burned-clock round trip** | `demo/keep/index.html:182-197` (`legSampler`) plus its own `median` and its own scratch canvas | `roundTrip(video, {onSample})` in `live.mjs`. Three private `median`s exist already (`xr-panel.mjs:681`, `source.mjs:188`, keep) |
| **`resolveDuration`**, the `duration: Infinity` seek-to-`1e6` dance | **five independent copies**: `capture:247`, `memento:564`, `keep:266`, `take:419`, `show:385`, under three different names and with three different timeouts | `demo/shell/media.mjs`. `plan-session` §6(b) called for this and it did not happen; this would be the sixth copy |
| **the ingest client** | `demo/shell/ingest.mjs` exists and **only `/keep/` imports it**. `demo/capture/index.html:33` still has its own inline copy, including the un-awaited `shipSeg` at 181 | `capture` imports the module. It gets the serialisation fix for free |
| **`whepPlay`** | `demo/webrtc/index.html:54-107` has a **private copy that has drifted**: no `offerSdp` 409 retry, compensated by an outer 6-attempt loop at 127-141 | delete 54 lines, import the kit one |
| **the per-slice shipper** | deleted from `ingest.mjs` and living in git history; `putWhole` replaced it because a short take is better as one object | it comes back for a show, and it comes back **serialised**, which is what the history version already learned |
| **the poll form** | `demo/stage/index.html:12-19` says it in its own CSS comment: *"Nothing here is a component because nothing else on the site asks a question yet; when a second page does, this is what gets lifted"* | still one page. Leave it, and leave the comment |

### (d) Genuinely new, and why

- **The `show.state` heartbeat and the three-state audience badge.** Nothing in
  this project announces "a thing is about to start" to a room with no backlog.
  Small, and it is the difference between a page that works for whoever was
  already looking and a page that works for whoever arrives.
- **The question span lane.** No new renderer, but no existing lane derives a
  duration from the NEXT row, and the open-span-at-the-end decision is a choice
  somebody has to make on purpose.
- **The events sidecar in R2.** One JSON file, written at stop, read by the
  archive. Nothing writes one today: `demo/shell/archive.mjs` is a module that
  ships WITH the page, which is why `/replay/` was reported as not saying where
  its cues come from.
- **The "everything landed" verdict, displayed.** The manifest already carries
  `missing`; nothing has ever shown it.

### (e) What must NOT become another copy

A sixth `resolveDuration` · a third `whepPlay` · a second ingest client · a
second burned-row family (three exist and `pattern.mjs`'s header forbids a
fourth) · a second position surface (the strip is the position; the bar passes
`scrub:false`) · a second WebRTC round-trip sampler · a second place that decides
what colour an answer mark is.

---

## 7. The first step, small enough to be finished

**One step. It uses the deployed workers unchanged, adds no Cloudflare resource,
spends no storage minute, and ends with a URL somebody can open.**

> **The control room presses one button. A picture it drew goes out over WHIP,
> comes back over WHEP into the audience panel, is recorded off the RETURNED
> track, and lands in R2. The archive tab plays that file back with the video
> lane, the question lane and the answer lanes on one strip.**

Concretely:

1. The audience panel opens with a card, not a `<video>`, and a badge that can
   say `coming`, in the component's own vocabulary. (§2)
2. The control room's Start calls `whipPublish(canvas.captureStream(25))` and
   `whepPlay(whep(), video)`, the two lines `/keep/` already runs.
3. Questions and answers travel the relay room, with a `show.state` heartbeat
   every 2 s so a late audience is correct within two seconds.
4. `MediaRecorder` over `sub.inbound.getVideoTracks()[0]`, asserted by object
   identity against `pc.getReceivers()`.
5. Stop: close the recorder, `putWhole` the blob, write the events sidecar, and
   print both URLs.
6. The archive tab `fetchBack`s the file, resolves the duration once, and lays
   the three lane groups out.

**What it proves, and it is the list of things that could each be false:**

- that the picture the audience sees is the picture that was recorded, by object
  identity rather than by a name;
- that a question sent from one tab arrives in another and lands on the strip at
  the time it was sent;
- that when Stop returns, the bytes are in R2 and readable, which a `HEAD`
  answers and a 200 on the PUT does not;
- that the archive's playhead moves the picture, which `pattern.mjs`'s burned
  clock makes visible rather than something to take on trust;
- that the whole loop fits inside 24 MiB, or that it does not, which is the
  number §4.3 exists to force into the open.

**What it deliberately does not do:** no second source, no switch, no long show,
no cross-device archive link, no seekable-without-download playback.

### 7.1 How it is graded without spending anything

🔴 **THE SUITE MUST NOT PUBLISH WHIP ON EVERY RUN.** `/keep/` already does: its
`go` is a control and the harness presses every control, so a second publishing
page doubles it against `WHIP_PER_HOUR` **20**, and from **2026-10-15** WebRTC
delivery bills.

`demo/show/index.html` has the answer and it is already in the tree: an
**in-page loopback**, `pcOut` and `pcIn` in the same page, so a real
`RTCPeerConnection` hop happens with no Cloudflare in it. `plan-session` §7 calls
it *"a deliberate determinism choice for the suite"*.

So: **loopback is the default and the suite's path; `?live=1` is the real
Cloudflare leg**, opt-in, for a person. That matches `demo/fake-station.mjs` and
`demo/fake-tapes.mjs`, which took two pages from ungradable to green at zero cost
to anybody, and it matches `verify.mjs`'s existing `standIn` map.

⚠️ **And the R2 leg is opt-in too, for the reason `plan-session` §8 already
measured:** the harness presses every control every run, so two runs an hour of
an unguarded page would eat the five-sessions-per-address cap and a working page
would read red. `?r2=1`, and **two assert slots so the count is the same in both
modes**, because mode-dependent assert counts are the exact shape `CLAUDE.md` bans, and
`capture`'s R2 asserts are inside an `if (useR2)` today.

⚠️ **Re-run `/stage/` and diff the per-demo assert count after adding the Start
button.** A page that gains its FIRST control moves every other control's
harness press, and `settleMs` only ever lands on control 0. Measured on `/radio/`:
one new button moved a press from t+1 s to t+31 s and took an unrelated check red
intermittently.

### 7.2 What it needs on the page that is not code

A diagram. `/stage/` has none today, importing no `diagram.mjs`, and a page
with a real pipeline in it earns one. It takes `{ how: true, atEnd: true }` and
no `title`, the boxes are `Browser`, `Cloudflare`, `Relay object`, `R2`, and the
`what` paragraph shrinks to the one line from `manifest.mjs`, because a paragraph
and a picture of the same machinery are two explanations and the paragraph is the
weaker one.

---

## 8. Open questions

These are handed back, not decided. The ones the ask itself refused to settle are
marked 🔴.

1. 🔴 **Which source.** §3 recommends the control room browser first and says why.
   It does not close the question, and the three others are not ranked against
   each other beyond what §3 measured.
2. 🔴 **What a switch is.** One live input has one publisher. A switch is either a
   second input plus a second `WHEP_UID` (audience re-subscribes, visible gap) or
   a compositor upstream of one WHIP session. **Unknown: whether Cloudflare
   accepts a second WHIP publish to the same input, and what it does to the
   first.** Cost to answer: one publish and one probe against our own input,
   about a minute of WebRTC delivery, no storage. It has not been run.
3. **Whether Cloudflare transcodes a WHIP ingest before serving WHEP.**
   `plan-session` §12.1 named this as its largest unknown and it is still not
   recorded anywhere. Relevant here because the burned clock is how the archive's
   seek checks itself. Partly answered sideways by
   `rig/whep/WHIP-FFMPEG-NOTES.md`: Chrome's WHEP leg negotiated `42e01f` while
   the arriving bitstream was ffmpeg's baseline `42001f`, so **CF forwarded
   without transcoding** on that run. Whether that holds for a browser publisher
   is untested.
4. **Whether a token can live in the control room at all.** §4.3(c) depends on
   it. A field the operator types into keeps it out of the URL and out of
   history; it also means the control room is not a page anybody can just open,
   which changes what `/stage/` is.
5. **How long a show can actually be.** 24 MiB is about four minutes at
   800 kbit/s. The answer is either (b) fixing the trusted tier, (c) selfrec, or
   lowering the bitrate, and the third is the only one that needs no decision
   from anybody.
6. **Whether a WebM recorded off a WHEP track resolves a finite duration
   reliably.** `/show/` proves it for a loopback track on desktop Chrome.
   Inherited, not measured on this path, and it is what a scrubbable archive
   rests on.
7. **What happens to the audience above 128.** The relay refuses the 129th
   socket. A large audience needs either a second room, or a design where the
   audience does not hold a socket at all and only the answering does.
8. **Whether `workers/pub`'s in-memory WHIP maps survive a real show.** An
   eviction loses the DELETE mapping and `stop()` becomes a no-op that reports
   success. This is the shape of bug that measured at **46 seconds** for the
   device-log ring buffer.
9. **What the archive does with a second show.** "Overwrite" is the ask's own
   word and a fixed selfrec path gives it for free. With ingest it is a new id
   every time and something must carry it.
10. **Does a canvas source survive the operator switching tabs?** `rAF` throttles
    to ~1 Hz in a background tab; `timeline/keepalive.mjs:11` exempts a live
    `RTCPeerConnection`, which is about the connection and not about the drawing
    loop. **Cost to answer: one publish and one look.** It decides whether the
    control room browser can be left alone for a whole show, which is the
    difference between a demo and an instrument.
11. **Can OBS in a Cloudflare Container publish WHIP?** Outbound UDP from a
    container is measured, a full QUIC/MoQ session out of one is measured, and
    `research/cf-containers-2026-08.md:172` says ICE over UDP works while marking
    the media quality on 2-4 shared vCPU untested. **WHIP specifically has never
    been run from there.** Cost to answer: rebuild the 1.25 GB image (~5 min plus
    a docker host), deploy a standard-4 app, one publish. Raw cost of that
    session's four boots was measured at $0.00 beyond the base.
12. **Is there a bridge to the M1's obs-websocket, and should there be?**
    §3.3. The pattern exists in `rig/obs-cloud/obs-worker/worker.mjs` at p50
    ~65 ms. Nothing points it at the Mac. **This is the single piece of work that
    promotes the best-measured source into a usable one.**
13. **`getDisplayMedia` is used nowhere in this repo.** A control room that wants
    to show a slide, a patch editor or another page has to screen-share, and
    whether that path works here is an assumption. Cost to answer: minutes.
14. **Whether an override keeps the Pi on its GPU.**
    `MESA_GL_VERSION_OVERRIDE=3.3` launches OBS on a Pi 5, and sources disagree
    about whether rendering stays on v3d or silently drops to llvmpipe. Only
    relevant if the Pi is ever reconsidered, and it would have to be measured on
    the board, which §3.4 argues against on other grounds.

---

## 9. Traps specific to this build

- **`readBurned` samples FIXED coordinates.** Size the read canvas to the source,
  never scale. A wrong size returns `null` on every frame, which is
  indistinguishable from "the row is not there". And **Cloudflare's WHEP
  resolution ramp makes the row unreadable for the first ~30 s**, with 0 clean at
  640×360. Print the received `width × height`.
- **A remote `MediaStream` carries the SENDER's msid.** Object identity against
  `pc.getReceivers()` is the only honest test that the recorder has the received
  track.
- **`ingest` requires a dense sequence.** Serialise the shipper. An out-of-order
  PUT answers 409, which reads like a server fault and is not.
- **A refused segment ENDS the take**, it does not skip one.
- **`verify.mjs` stops collecting 400 ms after the last assert**, and its
  first-assert wait is capped at 30 s regardless of `settleMs`. Land the
  negotiation and capability asserts EARLY, before the recording.
- **A page that gains its first control moves every other control's harness
  press**, and `settleMs` only ever lands on control 0. Diff the per-demo assert
  count after adding Start.
- **Assert both modes.** Loopback and live, R2 and not, with the SAME assert
  count in each. `capture`'s R2 asserts are inside an `if (useR2)` today, which
  is the shape this project bans.
- **Never let sound gate the work.** `audio.play()` and `AudioContext.resume()`
  wait on a gesture and neither REJECTS, so awaiting one is a hang rather than an
  error.
- **A second browser of your own is a harness that reads broken.** Nine failures
  across three network demos in one run turned out to be two probe Chromes of
  mine holding relay sockets. Run a failing page ALONE before calling it a
  regression.
- **`build.mjs` refuses an import with no deployed file** and scans modules as
  well as HTML. Prove it once by breaking it on purpose.
- **A diagram takes `{ how: true, atEnd: true }` and no `title`**, boxes are
  `Browser` / `Cloudflare` / `Relay object` / `R2`, no articles in labels,
  quantities short (`24MiB`, `6h`, `128k`), notes at most two sentences, and
  nothing about how the picture was made.
- **`grep -rn '?? 0' demo/`** before calling any of this done.

---

## 10. Definition of done, for the first step only

1. The audience tab opens with a card and a badge reading `coming`, and there
   is no `<video>` element in the document until the show starts.
2. One press in the control room puts a picture in the audience panel, over a
   real WebRTC leg, and the badge changes to `live` because frames arrived rather
   than because a promise settled.
3. What is recorded is the RECEIVED track, asserted by object identity, not by an
   id and not by a variable name.
4. A question sent from the control room appears in the audience panel, an answer
   pressed there appears on the control room's strip, and a tab opened mid-show
   is correct within two seconds.
5. Stop returns only when every chunk is in R2 AND readable, proved with a HEAD
   rather than with a 200 on the PUT, and the page says how many pieces and how
   many are missing.
6. The archive tab plays the recording back, and dragging the strip moves the
   burned clock in the picture by the same amount.
7. The strip carries the three lane groups exactly as specified: the recording as
   one span, the questions as spans whose width is how long each stood with the
   last one open-ended, and one same-coloured lane per option.
8. The page says, in plain words, that the recording is deleted after six hours
   and how much of the 24 MiB the show used, and both are numbers that move.
9. `node demo/verify.mjs stage` is green with the loopback default, having opened
   no connection to Cloudflare, and the per-demo assert count moved by exactly
   the asserts that were added.
10. It is handed over as a URL somebody can click, not as a path.

