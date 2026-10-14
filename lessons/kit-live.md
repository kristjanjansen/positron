# Kit lessons: live.mjs, live-test.mjs

The long comments cut from `demo/shell/live.mjs` and `demo/shell/live-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-live.md#<anchor>`.

<a id="header"></a>

## live.mjs, file header

demo/shell/live.mjs: Cloudflare Stream inputs, WHIP and WHEP, shared by the
pages that publish to Stream or play from it.

RETIRED 2026-10-13, AND GONE FROM THIS FILE THE SAME DAY: the test pattern
that `/llhls/` and `/webrtc/` played (the inputs positron-demo and whep-rig,
pub's /watch, /status, /start, /stop and /whip), and `/cam/`'s RTMPS camera
(the input positron-cam, pub's /cam). Stream deleted the three inputs and pub
answers those routes 410. What went with them: `LIVE.uid`, `LIVE.pub`,
`LIVE.pubStatus`, `llhls()`, `lifecycle()`, `waitForManifest`, `WHEP_UID`,
`whep()`, `WHIP_PROXY`, `whipPublish`, `CAM_PROXY`, `CAM_UID`, `camLlhls()`,
`camLifecycle()`, and `watchPresentedFps`, which only those two pages called.
They are in git at be7737d. The archived pages that
used them are still served and answer a press with `RETIRED_LEG` rather than
a 90 s wait for a publisher that no longer exists.

What is left: /stage/'s own input, the camera's WebRTC input (video/030), the
LL-HLS loopback publish (`camPublish`, video/060), the TURN relay, and the
WHIP and WHEP helpers they share.

<a id="hold-publisher"></a>

## live.mjs, holdPublisher()

Hold the publisher up for as long as the page is open. The socket IS the
reference count: dropping it is how the container learns nobody is watching.
`url` has no default since 2026-10-13: the default was the test pattern's
/watch, which is retired, and /stage/ passes its own `STAGE_PUB`.

<a id="wait-for-whip"></a>

## live.mjs, waitForWhip()

Wait for the WHIP LEG, which is a different input from the HLS one.
07 previously waited on the HLS manifest — a signal about input A while it
was about to play input B, so it asked for WHEP before the WHIP handshake had
finished and got a 409. The publisher's own status is the right signal.
`statusUrl` has no default since 2026-10-13 (the default was the retired
/status); /stage/ passes `STAGE_PUB_STATUS`.

<a id="wait-abort"></a>

## live.mjs, waitForWhip(), abort

🔴 A PAGE THAT CAN BE STOPPED HAS TO BE ABLE TO STOP THIS. Added 2026-09-29
when both streaming pages gained a three state toggle whose middle state is
half a minute long: a press during `starting` closes the socket, and
without this the poll went on asking Cloudflare for a publisher nobody was
waiting for until the timeout. `pagehide` was the only way out and a
visitor who has pressed stop has not left the page.

<a id="publish-subscribe"></a>

## live.mjs, publish and subscribe, shared

── publish and subscribe, shared ──────────────────────────────────────────

Both halves of a WebRTC round trip through Cloudflare, in one place because
two pages need them and each carries lessons that were paid for once.

<a id="ice-proxy"></a>

## live.mjs, ICE_PROXY

🔴 STREAM ANSWERS OVER UDP ONLY, AND A NETWORK THAT DROPS UDP GETS A 201 AND
NO MEDIA. MEASURED 2026-09-30 on a phone hotspot: both the WHIP and the WHEP
answer are `a=ice-lite` with one candidate, `udp 141.101.90.0 1473 typ host`,
and nothing over TCP. A `tcptype passive` candidate munged into a real answer,
at that port and at 443, was applied by Chrome and ICE still failed. So the
way round is a relay the browser reaches over TCP: Cloudflare Realtime TURN,
`turns:turn.cloudflare.com:443?transport=tcp`, minted by our worker so the
TURN key never reaches a page.

`iceServers` is an OPTION on both helpers rather than a fork of them. Absent,
a peer connection is built exactly as it always was. Present, ICE is handed
the relay as one more route and still chooses; nothing forces relay, so a
network with working UDP keeps its direct path and costs no relay bytes.

<a id="gathered"></a>

## live.mjs, gathered()

Wait for ICE gathering, capped, because WHIP and WHEP to Cloudflare take no
trickle and the offer has to carry every candidate it is going to have.
⚠️ WITH A RELAY, STOP SHORTLY AFTER THE FIRST RELAY CANDIDATE. On a network
that drops UDP the relay's UDP routes never answer, so gathering would sit
out the whole cap for nothing; the TCP relay candidate is the one that works
there, and waiting a moment past it lets any sibling arrive.

<a id="probe-udp"></a>

## live.mjs, probeUdp()

Does UDP leave this network? One STUN binding request to Cloudflare, read as
a server-reflexive candidate. An answer is proof that UDP gets out and back;
silence within the cap is reported as `udp: false`.
⚠️ `known: false` when the browser cannot ask at all, which never counts as
blocked: "we did not look" must not read as "it is missing".
⚠️ WHAT IT CANNOT SEE: a network that lets UDP to 3478 through and drops it
elsewhere. That shape was not met here and is not claimed.

<a id="read-ice-path"></a>

## live.mjs, readIcePath()

Which path did ICE choose: `direct` or `relay`. Read off the SELECTED
candidate pair, because a relay candidate being gathered says nothing about
whether the media uses it.

🔴 A RELAYED LATENCY IS NOT COMPARABLE TO A DIRECT ONE, which is why a page
shows this cell beside its latency. Through TURN the media takes an extra hop
to Cloudflare's relay and, on the TCP route, pays head of line blocking too.

The selected pair is the transport's `selectedCandidatePairId` where the
browser reports it (Chrome, Safari), and otherwise the nominated succeeded
pair (Firefox has no transport stats). The local candidate's `candidateType`
of `relay` is the whole test.

Never throws. `path: null` means the pair could not be read yet, which is not
`direct`: "we did not look" must not read as an answer.
 { path: 'direct'|'relay'|null, local, remote, protocol, relayProtocol, rttMs }

<a id="whep-play"></a>

## live.mjs, whepPlay()

Subscribe over WHEP into `video`, and hand back the stream we own.

Promoted out of `webrtc` so a second page cannot copy it — it carries three
things that were each learned the hard way:

· Cloudflare REFUSES a single-track offer, both ways, so both transceivers
  are offered `recvonly` even when only one is wanted.
· A WebRTC track ARRIVES MUTED and unmutes only when media flows. Assigning
  `srcObject` before that gives iOS a stream with no frames, and it paints
  black and stays there while decoding succeeds behind it.
· Adopting `e.streams[0]` per track LOSES a track: Cloudflare sends audio and
  video with different msids, so the second `ontrack` replaces the first.
  One stream that we own, every arriving track added to it.

<a id="whep-retry"></a>

## live.mjs, WHEP_RETRY

POST an offer, and treat a 409 as NOT YET rather than NO.

🔴 THIS IS `keep`'s UNEXPLAINED 409, AND IT WAS A RACE. Cloudflare answers a
WHEP subscribe with 409 while the input is not publishing — and a page that
publishes and then immediately subscribes is asking in the gap between the
WHIP POST returning and ICE/DTLS finishing, which is a window of a second or
so that usually closes first and sometimes does not. `waitForWhip` above was
written for the same fault on a different page, where the container's own
status was available to wait on; a page publishing from itself has no such
signal, so the honest move is to ask again.

⚠️ A RECOVERY ACTION IS NOT FREE (CLAUDE.md). It is bounded at five retries
over ~7 s, it YIELDS rather than spinning, it re-posts the SAME offer (a 409
means nothing was created, so there is no second session to leak), and every
other status fails immediately — a 404 or a 500 is not going to become a 201
by being asked twice.

Exported so `demo/shell/live-test.mjs` can drive it with a stubbed fetch:
a guard nobody has seen fire is a guard nobody knows they have.

<a id="cam-publish"></a>

## live.mjs, camPublish()

A CAMERA ONTO AN LL-HLS INPUT, through the Pub Durable Object and a
container instance, with the key never leaving the worker.
plans/plan-cam-llhls.md.

 page MediaRecorder (H.264 in WebM, 2 s keyframes, 100 ms slices)
   -> a pub WebSocket (`url`) -> one POST per chunk into the container
   -> ffmpeg -c:v copy to RTMPS -> that instance's own LL-HLS input

🔴 `url` HAS NO DEFAULT SINCE 2026-10-13. The default was /cam/'s RTMPS camera,
`wss://pub.positron.studio/cam`, whose input (positron-cam) was deleted that
day and whose route answers 410. The one caller left is /video/llhls/,
which passes `wss://pub.positron.studio/loop` (its own input,
positron-hls-loopback).
🔴 ITS OWN INPUT, NOT THE TEST PATTERN'S. It borrowed that one by handover
until 2026-09-30 and /llhls/ stalled while a camera was tested on it. One
camera at a time; a second is refused, and that arrives here as `busy` with
the worker's own words, so a page shows them rather than a black box.
⚠️ RECORDING STARTS ON `ready`, NEVER BEFORE. The first chunk carries the
WebM header, and a header that reaches the container before ffmpeg exists
is a stream ffmpeg can never start.
⚠️ WEBM ON CHROME, NOT MP4, EVEN THOUGH FLV LOOKS MORE LIKE MP4. MEASURED in
the plan: Chrome's fragmented MP4 ignores the slice and waits for a whole
2 s GOP. The MP4 arm is for Safari and its cadence is NOT measured.

onState({ t, why }): t is one of
 ready     the container is publishing what this records
 busy      refused, with the worker's reason (another camera is on it)
 stopped  the worker ended it (idle, length cap, Stream stopped taking bytes)
 closed    the socket closed with nothing said
 unsupported  this browser cannot record H.264

<a id="cam-whip"></a>

## live.mjs, CAM_WHIP_UID

The camera's WebRTC input ("positron-cam-whip", src/provision-cam-whip.sh,
recording off), published through `pub.positron.studio/cam/whip` so the key
stays in the worker. /video/webrtc/'s WebRTC loopback since 2026-10-13,
and the archived /cam/'s WebRTC leg. It borrowed the test pattern's WHIP
input until 2026-09-30 and was refused with 409 whenever somebody held the
(now retired) /watch. One camera at a time; a second gets 409 in words.

<a id="cam-whip-publish"></a>

## live.mjs, camWhipPublish()

WHIP through our worker, for the camera's own input. It began as a copy of
`whipPublish`, the test pattern's publish, which was retired 2026-10-13 and
is gone from this file.
⚠️ THE DELETE IS `keepalive`, because the worker holds the input for this
session until it hears it, and `stop()` also runs from `pagehide`, where an
ordinary fetch is cancelled with the page.

<a id="test-header"></a>

## live-test.mjs, file header

demo/shell/live-test.mjs — the WHEP retry, with a stubbed fetch and no browser.

  node demo/shell/live-test.mjs

It exists for one reason: `offerSdp` retries a 409, and a retry nobody has
watched fire is a retry nobody knows they have. Three of the six checks below
are NEGATIVE CONTROLS — they require the guard to NOT fire — because a retry
that fires on everything would turn a permanent 404 into a seven-second hang
and a page that reads as slow rather than as wrong.

The second section fakes RTCPeerConnection and grades the failure path of
`whepPlay` and `camWhipPublish`: four NEGATIVE CONTROLS, so seven of 12.

`sleep` is injected, so this runs in milliseconds rather than in the ~7 s the
real backoff takes. The delays are asserted as VALUES instead.

<a id="test-409"></a>

## live-test.mjs, check 2, a 409 that clears

2. 🔴 THE ONE THIS EXISTS FOR. A 409 that clears is not an error.
