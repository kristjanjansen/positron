# Plan: a webcam to the container and back as LL-HLS, for `/cam/`

Asked 2026-09-30, verbatim: *"figure out how to to llhls from webcam to
container and back"*. Context: `BACKLOG.md`, `### Open 2026-09-30: a new demo
`cam``. The page already exists as a draft in `demo/cam/index.html` and leaves
one seam for this leg (`HLS_LEG.start({ stream, video, log })`, returning
`{ stop, ok, why }`), with the panel saying `not wired` until this lands.

Research only. Nothing here was deployed, no live route on
`pub.positron.studio` was called, and no third party stream was opened. Every
claim below is marked **MEASURED** (run on this laptop today), **READ** (from
code in this repository or from Cloudflare's documentation, fetched today), or
**ON RECORD** (measured earlier in this repository, with the file it is in).

## 0. Verdict

**It works, it needs no new platform feature, and the container adds well
under a second.** The road is:

    camera canvas -> MediaRecorder (WebM, H.264, 2 s keyframes, 100 to 250 ms slices)
      -> WebSocket wss://pub.positron.studio/cam  (the Pub Durable Object ends it)
      -> one POST per chunk into the container  (same instance, new third leg)
      -> ffmpeg -f webm -i pipe:0 -c:v copy -f flv rtmps://.../<CAM key>
      -> a NEW Stream live input "cam" (preferLowLatency, recording automatic)
      -> LL-HLS back into the same page through src/low-latency-player.js

**No re-encode anywhere on the server.** Chrome's MediaRecorder already emits
what Cloudflare's LL-HLS asks for: H.264, no B-frames, a keyframe every 2 s
when asked for one. MEASURED below. So ffmpeg only rewraps WebM into FLV, which
costs about nothing on the one vCPU that already carries two x264 encodes.

Every other candidate is closed or is strictly heavier. The one that avoids the
container altogether (a Worker speaking RTMPS itself) is closed by a platform
rule, not by effort: Workers may not open TCP to Cloudflare's own addresses,
and Stream's ingest host is one.

## 1. The constraints in the brief, each checked

| claim in the brief | verdict | source |
| --- | --- | --- |
| Cloudflare will not serve a WHIP input as HLS | **TRUE** | READ, developers.cloudflare.com/stream/webrtc-beta/: *"WHIP and WHEP must be used together: we do not yet support inputs using RTMP/SRT to be played using WHEP, or inputs using WHIP to be recorded and played using HLS/DASH."* |
| A WHIP input cannot be restreamed to an RTMPS input either | **TRUE**, and it closes a road the brief did not list | READ, same page: WebRTC inputs do not support simulcasting (restreaming via RTMP/SRT) |
| A Container cannot accept inbound QUIC | **TRUE, and wider: no inbound UDP or raw TCP at all** | READ, developers.cloudflare.com/containers/platform-details/architecture/: *"Because all Container requests are passed through a Worker, end-users cannot make non-HTTP TCP or UDP requests to a Container instance."* ON RECORD, `research/cf-containers-2026-08.md:66`: `assign_ipv4: none`, inbound Worker fetch only |
| What inbound a Container DOES accept | **HTTP and WebSocket, forwarded by its Durable Object** | READ, developers.cloudflare.com/containers/examples/websocket/ (*"Forward an incoming WebSocket upgrade request through the Durable Object to the listening port on the Container"*); READ, `workers/pub/node_modules/@cloudflare/containers/dist/lib/container.js:585` (*"Forward all requests (HTTP and WebSocket) to the container"*), with the caveat at `:514` that a WebSocket only survives when the DO forwards it, not over JSRPC |
| The container already publishes RTMPS to a preferLowLatency input | **TRUE** | READ, `workers/pub/container/server.mjs` `args()`: `-f flv rtmps://live.cloudflare.com:443/live/${key}`; `src/provision.sh` creates inputs with `preferLowLatency:true` and `recording.mode: automatic` |
| The Stream key must never reach the browser | **TRUE and already the house pattern** | READ, `workers/pub/worker.mjs` `#startPublish()`: the key is a Worker secret, sent to the container in a POST body; `server.mjs` `redact()` scrubs it from every stderr tail |
| Stream bills minutes from 2026-10-15 | **TRUE for WebRTC; HLS already bills** | READ, developers.cloudflare.com/stream/pricing/ (updated 2026-09-08): *"Billing for WebRTC delivery will begin on October 15th, 2026"*; delivery $1 per 1,000 minutes; storage prepaid at $5 per 1,000 minutes; RTMP recordings consume storage |
| `max_instances` is 1 and that instance already runs two encodes | **TRUE** | READ, `workers/pub/wrangler.jsonc`: `max_instances: 1`, custom `{vcpu: 1, memory_mib: 3072}`; `worker.mjs` `#startPublish()` starts the RTMPS leg and the WHIP leg together |
| LL-HLS on this stack is 4 to 8 s | **ROUGHLY; the tuned player has done better** | ON RECORD, `PROGRESS.md:4435`: 3.82 s video only, 8.83 s both renditions on raw hls.js, and *"the tuned 2.4 to 4.0 s"* in the paragraph under it |
| `workers/ingest/` may already accept browser media | **IT ACCEPTS IT, BUT NOT LIVE** | READ, `workers/ingest/worker.mjs` header: `POST /open`, `PUT /seg/<session>/<n>`, `POST /close/<session>` writes `index.m3u8` WITH `ENDLIST`. It is a capped R2 store (24 MiB a session, 5 sessions an hour an address, 6 h TTL) that writes a VOD playlist on close. Nothing in it reaches Stream or makes LL-HLS |
| What `workers/pub/worker.mjs` already forwards | `/watch` (viewer refcount, WebSocket, held by the DO itself), `/status`, `/start`, `/stop`, `/log`, `/logs`, `/whip` (browser WHIP proxy to the whep-rig input, key hidden), `DELETE /whip/<id>` | READ. **Nothing forwards browser media INTO the container today.** Every container route is a control POST |

⚠️ One thing found on the way that the implementer must know: **`viewers()` is
`this.ctx.getWebSockets().length`, every socket the DO holds.** A camera
socket accepted on the same object would be counted as a viewer and would start
the test pattern legs. The camera socket has to be TAGGED and `viewers()` has
to count only the `watch` tag. READ, `workers/pub/worker.mjs` `viewers()`.

## 2. What was measured here today

A local rig, in the scratchpad at
`agent-research/cam/{page.html,server.mjs}`. Headless Chrome **154.0.8037.58**
with a fake camera posts each encoded chunk to a local node server, which pipes
it into ffmpeg **9.0.1** (Homebrew, Apple M2 Pro). One ffmpeg rewraps with
`-c:v copy` to FLV, a second in parallel re-encodes with the container's own
x264 arguments, and ffmpeg's `-progress` clock against the recorder's start
time gives **capture to remuxed output lag**. No network hop is in these
numbers; the loopback POST took 0 to 2 ms p50.

⚠️ The fake camera delivered **20 fps** when 30 was asked, so run 1 is 720p20.
Run 2 draws the camera into a 1280x720 canvas at 30 fps with a burned clock,
which is exactly what `/cam/` sends.

| arm | chunk cadence | capture to remuxed out, p50 / p95 | keyframes landed at (s) | first output |
| --- | --- | --- | --- | --- |
| MediaRecorder `video/webm;codecs=h264`, camera, `start(250)`, copy | 299 ms | **260 / 400 ms** | 2.03, 4.08, 6.13, 8.13, 10.13 ... | 273 ms after first byte |
| same, **x264 re-encode** | same | 858 / 999 ms | every 3 s (60 frames at 20 fps) | 2,042 ms |
| MediaRecorder `video/webm;codecs=h264`, **canvas 30 fps, `start(100)`**, `videoBitrateMode: 'constant'`, copy | **131 ms** | **148 / 207 ms** | 2.01, 4.02, 6.03, 8.05, 10.06 ... | 220 ms |
| same, x264 re-encode | same | 547 / 610 ms | | 1,893 ms |
| MediaRecorder **`video/mp4;codecs=avc1.42E01F`**, `start(250)`, copy | **2,049 ms, though 250 was asked** | 1,027 / 1,937 ms | 2.05, 4.05, 6.10 ... | 2,113 ms |
| **WebCodecs** `VideoEncoder` avc1.42001f annexb, realtime, one POST per frame, `-f h264 -use_wallclock_as_timestamps 1`, copy | 50 ms (one frame) | about **115 ms** (1,285 ms measured against the page's start, less the 1,171 ms before the encoder's first frame) | every 3 s (the rig counted 60 frames, not 2 s) | 145 ms |

What those rows settle:

- ✅ **`videoKeyFrameIntervalDuration: 2000` WORKS in this Chrome.** Keyframes
  land 2.00 to 2.05 s apart on both the camera and the canvas source, with
  `has_b_frames=0` and `profile=Baseline` in ffprobe. That is Cloudflare's
  LL-HLS recipe (H.264, fixed 2 s GOP, B-frames off) arriving straight out of
  the browser, which is the whole reason no server encode is needed.
- ✅ **ffmpeg reads MediaRecorder WebM from a pipe with no probing delay** at
  `-fflags nobuffer -probesize 32 -analyzeduration 0 -f webm`. First output
  220 to 273 ms after the first byte, and no errors on either run.
- ✅ **The rewrap is free and the re-encode is not.** Replaying the 20 s
  recording at `-re`: copy took **0.03 s user CPU**, x264 veryfast zerolatency
  single thread took **1.24 s**, 40 times more, on a core many times faster than
  a shared EPYC vCPU. ON RECORD, `research/cf-containers-2026-08.md:85`: on
  Cloudflare's half vCPU a copy remux of 75 s of H.264 took **282 to 386 ms**,
  and a VP8 to x264 transcode ran at **0.81 to 0.83 of realtime**. The one vCPU
  already carries two 720p30 encodes, and half a vCPU with two stalled the
  stream with 59 s and 83 s lags (READ, `workers/pub/wrangler.jsonc`). A third
  encode is the thing that must not be added; a third rewrap costs nothing.
- ⚠️ **Fragmented MP4 out of Chrome's MediaRecorder waits for the whole GOP.**
  The 250 ms slice was ignored and every chunk was a 2 s fragment (only 250 ms was tried), which is
  about a second more latency than WebM for no gain. So WebM on Chrome. What
  Safari's MediaRecorder does with a slice is **not measured** (see section 8).
- ⚠️ **`videoBitrateMode: 'constant'` did NOT produce constant bitrate.** Asked
  for 2.5 Mbit/s, it averaged **842 kbit/s** and moved between 624 and 983 kbit
  per 30 frames. Cloudflare's LL-HLS notes ask for CBR; whether variable
  bitrate out of a browser hurts Stream's packaging is **not measured**.
- ➖ **WebCodecs saves about 35 to 150 ms** against MediaRecorder at 100 ms
  slices. Against a 3 to 8 s LL-HLS glass to glass that is under 5 per cent,
  and it costs a muxer or a timestamp scheme of our own (the raw Annex B pipe
  had to take wall clock timestamps at the server, which put network jitter into
  the media clock: `avg_frame_rate` came out 25 for a 20 fps source).

## 3. The candidates, priced

### (a) MediaRecorder WebM over a WebSocket into the container: RECOMMENDED

- **Works on this platform?** Yes on every link. Browser WebSocket to the pub
  Worker (existing pattern, `/watch`); DO to container over HTTP (every
  existing route does it); container outbound RTMPS (the existing RTMPS leg
  does it, and ON RECORD `research/cf-containers-2026-08.md:69`: port 1935 and
  443 to `live.cloudflare.com` connect from inside); ffmpeg reading MediaRecorder
  WebM from stdin (MEASURED above).
- **Latency added over what `/llhls/` already shows:** recorder slice plus
  rewrap **148 ms p50 at 100 ms slices, 260 ms at 250 ms** (MEASURED, local);
  plus the browser to Frankfurt hop and the DO to container POST, **not
  measured** (the warm Worker to DO to container round trip from Tallinn is
  0.21 to 0.36 s ON RECORD, `research/cf-containers-2026-08.md:89`, and a
  one-way WebSocket frame is less than that). **Expect 0.2 to 0.5 s on top of
  Stream's own 3 to 8 s.** The end to end number is unmeasured until deployed.
- **CPU on the 1 vCPU instance:** a rewrap. About 0.5 per cent of realtime on
  Cloudflare's half vCPU (ON RECORD, 282 to 386 ms for 75 s). No decode, no
  encode.
- **Key secrecy:** a new Worker secret `CAM_STREAM_KEY`, sent to the container
  in the `/cam/open` body exactly as `STREAM_KEY` is today, registered with
  `remember()` so `redact()` scrubs it from every stderr tail and `/status`. The
  page only ever knows the input's **uid**, which is public by design (READ,
  `demo/shell/live.mjs`: *"Safe to hardcode: it carries only the uid"*).
- **How it stops when the camera stops:** three independent stops, because a
  closed socket is the only reliable death detector here (skill,
  `positron-streaming`, *"A CLOSED SOCKET IS THE DEATH DETECTOR"*):
  1. the page stops the recorder and closes the socket; the DO's
     `webSocketClose` POSTs `/cam/stop`; the container ends ffmpeg's stdin, so
     ffmpeg flushes, closes RTMPS, and Stream sees the publisher go.
  2. a tab that dies or a laptop lid that shuts gives the DO a close (1006) and
     the same path runs. A socket that goes silent without closing is caught by
     the DO: **no chunk for 5 s closes it**.
  3. the container keeps its own watchdog: **no chunk for 5 s, or the session
     cap, kills ffmpeg**, so a DO that lost its state cannot leave an encoder
     publishing into Stream with nobody at the other end.
- **Cost:** see section 5. Pennies of container, and Stream minutes that are
  the real line.
- **Browser support:** Chrome and Edge, MEASURED on Chrome 154. Safari needs
  the fMP4 arm (supported by the same container route through `-f mp4`, cadence
  unmeasured). Firefox's MediaRecorder is believed to offer VP8 only in WebM,
  which would need a server encode; **not measured**, and the plan is to say
  `LL-HLS needs Chrome, Edge or Safari` rather than add a third x264.

### (b) WebCodecs H.264 over a WebSocket, remuxed without re-encoding

- **Works?** Yes. MEASURED above, Annex B into `ffmpeg -f h264 -c:v copy`.
- **Latency added:** about 115 ms capture to rewrap, **35 to 150 ms better than
  (a)**. Irrelevant against Stream's seconds.
- **CPU:** the same rewrap.
- **What it costs that (a) does not:** a timestamp story. Raw Annex B carries
  none, so either the server stamps arrival (MEASURED: network jitter becomes
  media timing) or the page muxes to WebM or fMP4 itself (a library from
  jsdelivr, or FLV tags written in JS). Keyframes are the page's job
  (`encode(frame, { keyFrame })`); the rig's count of 60 frames gave 3 s GOPs at
  20 fps, so it must be time based. And the capture side on Safari needs a
  route from a `MediaStreamTrack` to `VideoFrame`s that is not
  `MediaStreamTrackProcessor`, **not checked**.
- **Key secrecy, stop, cost:** as (a).
- **Verdict:** a later refinement if the 100 to 150 ms ever matters. It does not
  while Stream is the back half.

### (c1) Browser WHIP straight into something inside the container

- **Works?** **No, not as a listener.** READ, the Containers architecture page
  above: no inbound UDP or TCP from end users. ICE needs one side reachable.
  Both sides can DIAL OUT (ON RECORD, raw UDP works outbound from the
  container), so it could only meet the browser through a TURN relay
  (Cloudflare Realtime TURN), with a WebRTC stack in the image: MEASURED today,
  `ffmpeg -demuxers` on 9.0.1 lists **no WHIP or WHEP demuxer**; the WHIP it
  has is a muxer, an output. So werift, GStreamer `webrtcbin` or pion, a bigger
  image and a signalling path of our own.
- **Latency:** WebRTC's own 70 ms class plus a jitter buffer, but then:
- **CPU:** browser WebRTC H.264 is keyframed on demand, not on a 2 s clock, so
  making LL-HLS out of it needs a periodic PLI that nobody has shown Stream or a
  browser honouring, or **an x264 re-encode on the vCPU that cannot take one**.
- **Key secrecy:** fine (the key never leaves the container). **Stop:** ICE
  consent timeout, 30 s class, unless the page also holds a socket.
- **Cost:** TURN bytes at Cloudflare's TURN price, a larger image, and most of
  a week of WebRTC plumbing. **Rejected.**

### (c2) The container PULLS the camera back out of Stream by WHEP and republishes RTMPS

The one clever variant: `/cam/` already WHIPs the camera to Stream for its
WebRTC panel, so the browser would upload once and the container would
subscribe to that input by WHEP (dial out, UDP, which works) and push RTMPS.

- **Works?** Only with the WebRTC stack of (c1) in the image (no WHEP demuxer in
  ffmpeg, MEASURED), and with the same keyframe problem, so in practice **an
  x264 encode on the full box**.
- **And it shares the WHIP input with the container's own leg.** READ, the
  working tree's `workers/pub/worker.mjs` `/whip`: since 2026-09-30 a browser
  publish while anybody holds `/watch` is refused with **409**, so the camera's
  WebRTC leg and this LL-HLS leg would both depend on nobody watching
  `/webrtc/`. Its own input would fix that at the price of another input.
- **Cost:** the container becomes a WHEP viewer, which **bills delivery minutes
  from 2026-10-15** on top of the LL-HLS minutes. **Rejected**, and it couples
  the LL-HLS panel's health to the WebRTC panel's, which the page is meant to
  compare rather than chain.

### (d) Avoiding the container

- **(d1) Browser WHIP into Stream, played back as HLS:** closed, doc quote in
  section 1.
- **(d2) A WHIP input restreamed by Stream's live outputs to an RTMPS input:**
  closed. READ, the WebRTC beta page: no simulcasting or restreaming for WebRTC
  inputs.
- **(d3) The Pub Durable Object speaks RTMPS itself through `connect()`,**
  taking the same MediaRecorder chunks and writing FLV over TLS to
  `live.cloudflare.com:443`. It would remove the container from this leg
  entirely and cost only DO time. **Closed by a platform rule.** READ,
  developers.cloudflare.com/workers/runtime-apis/tcp-sockets/: *"Outbound TCP
  sockets to Cloudflare IP ranges are blocked."* MEASURED today: `dig
  live.cloudflare.com` answers **141.101.90.0**, and cloudflare.com/ips-v4
  lists **141.101.64.0/18**, which contains it. The connect itself was not
  tried (it needs a deploy), so the refusal is read, not seen.
- **(d4) `workers/ingest/`:** a capped R2 store that writes a VOD playlist on
  close. It is not a live path and does not reach Stream (section 1).
- **(d5) Skip Stream and package LL-HLS ourselves** in the container, served
  back through the DO. ffmpeg has no Apple LL-HLS part writer (its `lhls` flag
  on the DASH muxer is the older community prefetch scheme), so this is an
  origin of our own, and every playlist and part request would wake the DO and
  the container. It would no longer be *"Cloudflare Stream LL-HLS"*, which is
  what the panel is for. **Out of scope.**

## 4. The recommended path, concretely

### 4.1 A new live input, and why it cannot share

**Yes, a new input**, `cam`, RTMPS with `preferLowLatency: true` and
`recording.mode: automatic` (READ, `src/provision.sh`: without both, Stream
silently serves plain HLS). It cannot be the `/llhls/` input
(`0e390aa48b55d49a57284e6c2c535477`) because the container's test pattern
publishes there whenever anybody holds `/watch`, and two publishers on one input
is one publisher and a fight (READ, `worker.mjs`).

    ./src/provision.sh cam

⚠️ **`provision.sh` OVERWRITES `src/.last-input`**, which holds the current
input's uid and key (gitignored, `.gitignore:16`). Copy it aside first. Then:

    cd workers/pub && npx wrangler secret put CAM_STREAM_KEY

and add the uid to `demo/shell/live.mjs` beside `LIVE.uid` and `WHEP_UID`:

    export const CAM_UID = '<uid printed by provision.sh>';
    export const camLlhls = () =>
      `https://${LIVE.customer}.cloudflarestream.com/${CAM_UID}/manifest/video.m3u8?protocol=llhls`;

### 4.2 `workers/pub/worker.mjs` (the Pub Durable Object)

- **Tag the viewer socket.** `this.ctx.acceptWebSocket(pair[1], ['watch'])` in
  `/watch`, and `viewers()` becomes `this.ctx.getWebSockets('watch').length`.
  Without this the camera socket starts the test pattern (section 1).
- **`GET /cam`, a WebSocket upgrade**, accepted by the DO itself with the tag
  `cam` (not proxied to the container, so the DO sees every chunk, can count
  and cap, and gets the close):
  - `503` if `CAM_STREAM_KEY` is unset.
  - `409` if a `cam` socket is already open. One input, one publisher.
  - `429` past `CAM_PER_HOUR` (say 10), counted in the DO like `WHIP_PER_HOUR`.
  - first message from the page is text, `{ "t": "open", "fmt": "webm" | "mp4" }`;
    the DO POSTs `http://c/cam/open` with `{ key, fmt }` (the container wakes
    here if it was asleep: 3.7 s from a hard stop, about 16 s first ever after a
    deploy, ON RECORD `research/cf-containers-2026-08.md:87-88`), and only then
    sends `{ "t": "ready" }`. **The page starts MediaRecorder on `ready`**, so
    the first chunk, the one carrying the WebM header, cannot arrive before
    ffmpeg exists.
  - every binary message is one POST to `http://c/cam/chunk`, **serialised
    through one promise chain**. The DO's input gate does not cover a
    non-storage await, so two chunks a few ms apart would otherwise race into
    ffmpeg's stdin out of order (skill, `positron-streaming`, *"A DO's input
    gate does NOT cover a non-storage await"*). A side effect worth having:
    every POST renews the container's activity timeout (READ,
    `container.js` `renewActivityTimeout()` inside `containerFetch`), so the
    sleepAfter problem that needed the viewer sweep does not arise for this
    leg.
  - `webSocketClose` and `webSocketError` on a `cam` socket POST
    `http://c/cam/stop`.
  - the alarm, while a `cam` socket is open: no chunk for 5 s, or the session
    older than `CAM_MAX_S` (say 300), closes the socket with a reason and POSTs
    `/cam/stop`. The alarm must **not** `deleteAlarm()` while a camera session
    is open even when `viewers()` is 0. Store the session start with
    `serializeAttachment({ at })` so an eviction does not reset the cap.
- Message size: a 250 ms chunk at 2.5 Mbit/s is about 80 KB and a 100 ms one
  about 30 KB (MEASURED sizes scale: 2.0 MB over 156 chunks on run 2), well
  under the 1 MiB WebSocket message limit.

### 4.3 `workers/pub/container/server.mjs`

A third leg, independent of `ff` and `legs.whip`, so the viewer sweep's
`/stop` never touches it:

- `POST /cam/open { key, fmt }`: `remember(key)`, kill any previous cam
  ffmpeg, then spawn, stdin a pipe:

      ffmpeg -hide_banner -loglevel warning
        -fflags nobuffer -probesize 32 -analyzeduration 0 -f webm|mp4 -i pipe:0
        -map 0:v:0 -c:v copy -an
        -f flv rtmps://live.cloudflare.com:443/live/<key>

  No `-re`: the input is paced by the camera already.
- `POST /cam/chunk`: append the body to stdin. If `write()` returns false and
  more than a few MB are buffered, stop the session rather than let memory grow
  (the RTMPS side has stalled).
- `POST /cam/stop`: `stdin.end()` so ffmpeg flushes and closes RTMPS cleanly,
  `SIGTERM` after 3 s if it has not exited. Exit 255 is a clean stop (skill).
- A watchdog: no chunk for 5 s, or `CAM_MAX_S`, runs the same stop.
- `/status` gains `cam: { publishing, uptimeS, bytesIn, lastChunkAgoMs, error,
  stderrTail }`, redacted like the others.

No new dependency: the container never sees a WebSocket, only POSTs, so the
image stays `COPY server.mjs .` with no `ws` package.

### 4.4 `demo/cam/index.html`, the seam

`HLS_LEG.start({ stream, video, log })` becomes, in words:

1. open `wss://pub.positron.studio/cam`, send `{t:'open', fmt}` with `fmt`
   `webm` when `MediaRecorder.isTypeSupported('video/webm;codecs=h264')`, else
   `mp4` when `video/mp4;codecs=avc1.42E01F` is, else return
   `{ ok: false, why: 'this browser cannot record H.264' }`.
2. on `{t:'ready'}`: `new MediaRecorder(stream, { mimeType,
   videoBitsPerSecond: 2_500_000, videoKeyFrameIntervalDuration: 2000 })`,
   `start(100)`, and `ondataavailable` sends each Blob on the socket.
   `stream` is the page's burned canvas (`sendStream`), so the panel's latency
   reads off the same burned clock the WebRTC panel reads, with **one clock at
   both ends**.
3. start `createLowLatencyPlayer(video, camLlhls())`. It will meet a
   `manifestParsingError` until Stream has the broadcast, and the wrapper
   already rebuilds through that (skill: *"A page opened before the broadcast
   exists gets a fatal manifestParsingError"*).
4. `stop()`: `recorder.stop()`, close the socket, destroy the player. The
   socket close is what stops the server side; the page does not need to be
   trusted to do anything else.

⚠️ `/cam/`'s canvas is drawn by `setInterval`, which a background tab throttles
to about 1 Hz, so a backgrounded page sends a near frozen picture on every leg.
MediaRecorder itself is not frame loop driven. Not this leg's problem to fix,
worth one line in the page's own notes.

### 4.5 The words on the page

The panel's caption goes from `A camera cannot reach LL-HLS yet` to naming the
road, and the diagram gains the box `container` between the camera and
`Stream`, labelled as a rewrap. Load `positron-ui`, `positron-diagram` and
`positron-verify` for that change: it adds a leg the harness can see.

## 5. Cost

| line | per 5 minute camera session | source |
| --- | --- | --- |
| Stream delivery, the one browser watching its own LL-HLS | 5 min plus the prefetch, rounded to the 2 s segment: about **$0.005** | READ, pricing page: $1 per 1,000 min, rounded to the segment, buffering billable |
| Stream **storage**: the RTMPS input records, and recording cannot be turned off there | **5 minutes of the account's 1,000 minute cap** per session, until deleted | READ, pricing page (*"Recordings of live broadcasts using RTMP or SRT"* consume storage); skill: recording cannot be turned off on RTMPS, and a full cap **blocks new live streams** |
| Container CPU | a rewrap, about 0.5 per cent of a vCPU: under $0.0001 | ON RECORD copy remux ratio; $0.000020 per vCPU-s |
| Container memory while awake for the session | 3 GiB x 300 s x $0.0000025 = **$0.0023**, inside the included 25 GiB-h a month | READ, `wrangler.jsonc`; ON RECORD pricing, `research/cf-containers-2026-08.md:119` |
| Container egress to Stream | about 60 to 95 MB at 1.6 to 2.5 Mbit/s: $0 inside the included 1 TB | ON RECORD pricing |
| DO duration and requests | one socket and about 3,000 POSTs at 100 ms slices: inside the included tier | pricing, not computed to the cent |

**The real cost is not money, it is the storage cap.** At the testing rate on
record (about 225 storage minutes a day on RTMPS, skill) the cap fills in
about 4.4 days, and every camera session adds its own length on top. Two
mitigations, neither built here: keep `CAM_MAX_S` short, and give the pub Worker
a route that deletes the `cam` input's recordings after a session (it needs a
Stream edit token as a second secret). `deleteRecordingAfterDays` has a minimum
of 30 and does not help (skill).

## 6. How to grade it without spending anything

- **The container half runs on this laptop with no Stream at all.** Run
  `node workers/pub/container/server.mjs` with an override that points the cam
  leg's output at a local listener
  (`ffmpeg -listen 1 -f flv -i rtmp://127.0.0.1:1935/live/x -c copy out.flv`),
  and POST the chunks from the rig in this plan's scratch directory. That grades
  open, chunk order, the 5 s watchdog, stop on socket close and the key never
  appearing in `/status`, all with zero bytes to anybody's server.
- **The DO half** with `wrangler dev` against the same local container, one
  camera session, checking that `viewers()` stays 0 while a `cam` socket is
  open. That is the regression this plan is most worried about.
- **Then one real session**, deployed, from a real browser, reading the panel's
  burned clock latency. That is the only step that spends Stream minutes, and it
  is the first time the end to end number exists.
- ⚠️ A harness that presses `Start camera` will from then on open a real Stream
  session per run. It should run the LL-HLS leg only behind `?selfcheck=1` plus
  an explicit flag, and the assert count on `/cam/` should be read before and
  after, as `positron-verify` asks.

## 7. Traps specific to this build

- **Tag the sockets.** Section 1. The untagged `viewers()` would make a camera
  start two encodes.
- **Wait for `ready` before recording.** The first WebM chunk carries the EBML
  header and the track description; lose it and ffmpeg can never start.
- **A reconnect is a new session**: new recorder (a new header), new ffmpeg,
  and Stream mints a **new video UID** on every encoder reconnect (skill), so
  the player has to rebuild from the manifest, not resume.
- **Do not ask for MP4 on Chrome** because it looks more like FLV: MEASURED, it
  costs a whole GOP of latency.
- **Do not add audio casually.** The page asks `audio: false`. Video only
  avoids the demuxed intersection problem the player fights. Whether Stream
  accepts a video only RTMPS publish is **not measured** here (the `tracks=v`
  switch exists in `worker.mjs`, and the 3.82 s row in `PROGRESS.md:4435` is a
  video rendition of an audio plus video publish, not a video only publish). If
  Stream refuses it, add `-f lavfi -i anullsrc` and `-c:a aac` in the container,
  a few per cent of a core.
- **The key reaches ffmpeg's argv**, so it is in the process table inside the
  container. Same as the existing RTMPS leg, never served, and `redact()` covers
  the stderr. Nothing new, noted so nobody adds a `ps` to `/status`.

## 8. What this plan could not settle

1. **The end to end glass to glass number.** Needs a deploy and one real
   session. Everything above it is a bound, not a measurement.
2. **Safari's MediaRecorder cadence.** Chrome's fMP4 waited for whole GOPs;
   whether Safari's does with `start(100)` decides whether Safari gets 150 ms or
   2 s of extra latency. One run on a Mac Safari with this rig answers it.
3. **Whether Stream minds variable bitrate from a browser.** `constant` mode
   did not deliver constant bitrate (MEASURED). Cloudflare recommends CBR; only a
   real session shows whether its LL-HLS packaging cares.
4. **Whether Stream takes a video only RTMPS publish** (section 7).
5. **The `connect()` refusal to `live.cloudflare.com`** is read from the docs
   and an address range, not seen. It only matters if somebody wants (d3) back.
6. **Firefox.** Believed VP8 only in MediaRecorder WebM; not measured. The plan
   refuses rather than encodes.
7. **The in-colo DO to container POST cost per chunk.** Unmeasured; the warm
   round trip from Tallinn on record (0.21 to 0.36 s) is an upper bound that
   includes the public internet. If it turns out large, one streaming POST per
   session with a `ReadableStream` body is the fallback, and whether
   `containerFetch` streams a request body is itself unverified.

## 9. Effort

About a day: 80 lines in `worker.mjs`, 60 in `server.mjs`, 40 in the page, a
provision run and a secret, then one deploy of the pub Worker **with an image
rebuild** (the container file changes, and a running instance keeps the old
image until it is destroyed, ON RECORD `research/cf-containers-2026-08.md:62`).
