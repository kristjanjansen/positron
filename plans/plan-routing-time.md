# plan-routing-time: lightweight signals landing on time against video and sound

> Asked 2026-10-04, verbatim: *"expand and work with universal router plan about
> those syncing stuff having lightweight signals sync to the rich signals like
> cues and messages to a video and audio stuff"*.
>
> It extends `plans/plan-universal-routing.md` (§4 two planes, §5 the transport
> table, §12's *time alignment across media in a recording* row). In that model
> LIGHT links (cue, state, value, midi, clock: messages of a few bytes) and
> HEAVY links (audio, video, file: sessions over WHEP, LL-HLS, MoQ, relay PCM,
> relay H.264, R2) have no shared notion of time. This plan gives them one.
>
> **Every claim is tagged.** MEASURED means measured in this repository, with
> the file it came from. READ means read off a spec page or out of this
> repository's code today, nothing run. COMPUTED means arithmetic on measured
> figures. INFERRED means reasoning nobody has checked. Spec pages fetched today
> are listed in §10. No media server was contacted.
>
> **Step 1 is built** (§8): `demo/shell/timebase.mjs` and
> `demo/shell/timebase-test.mjs`, 39 asserts, 11 negative controls, seven
> sabotages measured. Nothing is wired into a page.

## 1. The verdict

**One rule covers every case: a light event names the moment it belongs to on
the peer clock, and each RECEIVER turns that moment into "fire at local time T"
using what it has observed of the heavy link it is matching.** The sender never
needs to know any receiver's latency, the router never touches a frame, and the
heavy link never needs a metadata channel, which is just as well because
Cloudflare strips all of them (MEASURED, positron-streaming: ID3, SCTE-35,
DATERANGE and SEI).

Three findings decide the shape:

1. **positron already has the two clocks this needs and has never joined
   them.** The peer clock (`proto/looper/peer.mjs`, ~3 ms between two machines,
   MEASURED in `/jam/`) is used by `/jam/` and `/looper/` and by nothing that
   plays a stream. The media clocks are used by `src/timed-messages.js`,
   `timeline/media-master.mjs` and `/replay/`, and none of them knows the peer
   clock exists. `src/timed-messages.js` already has the right three modes
   (`pdt`, `live`, `lag`) and **no demo page imports it** (READ, grep
   2026-09-25 in `plan-stage-hls-webrtc.md`, still true today).
2. **Two of positron's own heavy links carry no usable time today, and both are
   on the Pi.** The relay H.264 header is 8 bytes, a sequence number and a
   keyframe flag, and no time at all (READ, `rig/board/board.mjs` `sendFrame`).
   The relay PCM header carries the Pi's `performance.now()`, which in node is
   milliseconds since that PROCESS started, not an epoch and not on any shared
   clock, and **no page reads it** (READ, `rig/board/inputs.mjs:262`,
   `demo/shell/board.mjs:434-445`). Those two are the cheapest fixes in the plan
   and the only ones that need the Pi.
3. **Whether a link even needs this depends on its lag, and positron has
   measured every lag.** On WebRTC the glass is 67 ms behind (MEASURED p50,
   n=17,501), so a cue fired on arrival lands within about a frame and a half of
   its picture and nothing else is worth building
   (`plan-stage-hls-webrtc.md` reached the same answer). On LL-HLS the glass is
   2 to 8 s behind and moves (MEASURED), so a cue fired on arrival lands seconds
   early, and following the link is the whole job. On a recording there is no
   lag, only a playhead.

So: **as it happens** for anything on WebRTC or MoQ, **scheduled ahead on the
peer clock** for lights and notes that must agree across screens and machines,
**following a heavy link** for anything that must land on a frame or a beat of
LL-HLS or relay PCM, and **aligned after** on one recording timeline for
playback. The table in §3 says which clock each transport gives a page to
follow it with, and §4 is the model.

## 2. What already exists about time, before anything new

| thing | what it does | where | tag |
| --- | --- | --- | --- |
| peer clock | NTP exchange, minimum round trip kept, lowest id is reference; `sharedNow = now + offset` | `proto/looper/peer.mjs:80-125`, `rig/peer.mjs` for node | READ |
| its accuracy | ~3 ms across two machines, almost all oscillator: 0.69 ms with two peers on one Mac, 0.13 ms on one Pi, Mac and Pi agreed to 2.7 ms, `/jam/` corrected the Pi by -9.85 ms | `plans/plan-jam.md:112-131`, `demo/jam/index.html:52` | MEASURED |
| a Worker as the clock | ±50 ms, and it is BIAS, not jitter | `proto/looper/peer.mjs:33-37` | MEASURED |
| a Durable Object's `Date.now()` | frozen during execution, treat as ±70 ms | `workers/rtc/src/index.js`, positron-streaming | MEASURED |
| the deck | `createDeck({ clock })`, any `{domain, now()}`; `/jam/` runs it on `peer.clock` | `timeline/transport.mjs:2503`, `demo/jam/index.html:73` | READ |
| audio clock | `audioClock(ctx)` anchors `currentTime` to `performance.now()` by bracketing, min spread of 5; **ignores `outputLatency`** | `timeline/transport.mjs:223-243` | READ |
| its quality | wall to audio mapping p95 ~25 ms and drift 1900 to 5200 ppm, on headless Chrome's FAKE output device | `timeline/lab/artifacts/summary-2026-08-27.json:754-755` | MEASURED, headless only |
| media as master | `mediaMaster(deck, el)`: the deck follows `currentTime` and `requestVideoFrameCallback` `mediaTime`, 40 ms dead band, 250 ms is a jump | `timeline/media-master.mjs:148` | READ |
| timed messages | a cue is `{id, at, data}`, `at` the epoch ms of the STREAM moment; modes `pdt`, `live`, `lag`; holds on null | `src/timed-messages.js` | READ |
| `/replay/` | a cue log in media ms from `T0`, the deck following the video | `demo/replay/index.html`, `demo/shell/archive.mjs` | READ |
| the archive's `T0` | native anchor (`Date.now()` at the first frame into ffmpeg) measured -15 ms against the content anchor | `demo/shell/archive.mjs:5-7` | MEASURED |
| the burned clock | 48-bit epoch ms plus 8-bit checksum in the picture; the ffmpeg row is `spawn epoch + pts`, the canvas row the drawing machine's wall clock | `demo/shell/pattern.mjs:13-20, 514-519` | READ |
| the wire envelope | the send stamp is the SENDER's `Date.now()` at send, not on the peer clock. It was called `at` until 2026-10-04 and is `sent` since (§4.1); a payload field named `sent` throws | `demo/shell/wire.mjs` | READ |
| `/partitur/` lanes | three out ports (`value` light, `midi` sirens, `state` cues); sends `light.set` and `cue.set` when the playhead crosses a span, with no time in the message | `demo/partitur/index.html:253-330` | READ |
| `/wall/` | paints `light.set` and `cue.set` the moment they arrive | `demo/wall/index.html:72-86` | READ |
| `bay.mjs` sessions | `{ transport, address, shape, where, says }`, nothing about time; `state` is in `HEAVY` | `demo/shell/bay.mjs:50, 1052-1059` | READ |

⚠️ **AND A STALE NUMBER TRAVELS WITH THE TABLE.** `plan-universal-routing.md`
§5 and `bay.mjs`'s `TRANSPORTS` both say the relay's cap is **60 msg/s, stay
at 50**. The relay has been **1000 msg/s with a 2000 burst** for weeks (READ,
`workers/relay/src/index.js`, positron-streaming). Not corrected here because
this task's edits to that plan are limited to §12 and a pointer, so it is a §12
row there and wants a `BACKLOG.md` line. It matters below only in the direction of making everything here
cheaper.

## 3. The clocks each transport carries, and how a page reaches the peer clock from them

### 3.1 The table

| transport | what the heavy signal carries as time | what a browser exposes of it | how a page maps it to the peer clock | how good, and how it moves |
| --- | --- | --- | --- | --- |
| **WHEP / WebRTC from Cloudflare** | RTP timestamp per packet (90 kHz video, 48 kHz audio); RTCP Sender Reports map an RTP timestamp to the SENDER's NTP clock (READ, webrtc-stats) | rVFC metadata `rtpTimestamp`, `receiveTime`, `expectedDisplayTime` (READ, rVFC spec); `captureTime` only with abs-capture-time, which **Cloudflare refuses at negotiation: 0 of 585 and 0 of 8,079 frames** (MEASURED, `rig/whep/NOTES.md`); `inbound-rtp.estimatedPlayoutTimestamp` is "the NTP timestamp of the last playable frame... from an RTCP SR... extrapolated" (READ, webrtc-stats); `getSynchronizationSources()` gives `rtpTimestamp` and a local `timestamp` (READ); none of the last two has ever been called here (READ, grep) | estimatedPlayoutTimestamp minus 2,208,988,800,000 ms is the presented moment on the SR sender's NTP clock. **The SR sender is Cloudflare's SFU, not the publisher** (INFERRED), so it is Cloudflare's clock, offset from the peer clock by an unknown | lag p50 **67.0** / p95 **76.9** / p99 **84.1 ms**, n=17,501 (MEASURED, `plan-stage-live.md:53`); one 300 s run p50 73.6, with a **~8 ms upward step after minute 2** as the jitter buffer adapted (MEASURED, `rig/whep/NOTES.md`). `jitterBufferTarget` is a hint, 0 to 4000 ms, Baseline since September 2026 (READ, MDN); a target of 0 is clamped (MEASURED, `rig/m1/README.md:260`) |
| **LL-HLS from Cloudflare** | `EXT-X-PROGRAM-DATE-TIME` "associates the first sample of a Media Segment with an absolute date", millisecond precision (READ, rfc8216bis), **stamped at Cloudflare's ingest** (READ, `plans/plan.md:371`) | `hls.playingDate` on hls.js; `getStartDate()` plus `currentTime` on native WebKit (READ, `src/timed-messages.js`); rVFC `mediaTime` gives the PTS of the frame actually on the glass (READ, rVFC spec; used in `rig/measure-llhls.html:58-66`) | the receiver can map PDT to its own local time exactly enough without any shared clock (`{ stamp, on }` in §4). To put PDT on the peer clock needs one constant: Cloudflare's clock against the peer clock PLUS capture to ingest, which PDT excludes, so "3964 ms is a floor, not glass to glass" (READ, `plans/plan.md:372`) | lag **2 to 8 s per viewer** (MEASURED, `plan-stage-hls-webrtc.md:277`); it moves by a 1.05x catch-up, drift-seeks at least 10 s apart, **+1.0 s of target per stall**, rebuilds, and a new video UID on every encoder reconnect (MEASURED, positron-streaming). PDT runs **331 ms backwards** at startup and reads **ahead of the wall clock by ~1.6 s** after an `-re` burst (MEASURED). `hls.latency` freezes stale, **1.7 s reported against 8.4 s true** (MEASURED), so it is never the input |
| **ERR HLS** (not ours; never probed for this) | ONE PDT per playlist, on the first segment; positions by summing `EXTINF` (READ, `demo/fake-err.mjs`) | as LL-HLS | as LL-HLS; `SN x 1920 ms` sat a constant 951 ms off the head PDT (MEASURED, `plan-live-timeline.md:49-52`) | edge 0.70 to 3.42 s behind this machine's clock (MEASURED, once). ⚠️ Graded only against the stand-in, never against ERR |
| **recording off R2** (HLS of a show) | no PDT (READ for ERR's archive, `plan-archive-timeline.md:38`); our archive carries `T0` beside it | `currentTime`, rVFC `mediaTime` | `shared = T0 + currentTime * 1000`, where `T0` is a shared-clock epoch written by the recorder | no lag; error is `T0`'s, -15 ms native against content (MEASURED, `archive.mjs`). It moves only when somebody seeks or changes rate |
| **MoQ draft-14** (Cloudflare relay) | **the transport carries no timestamp**: group ids "SHOULD increase with time... the increase between two groups is not defined" (READ, draft-14); time is in the container: positron's video publisher stamps `performance.now() * 1000` µs, the PUBLISHER's document clock (READ, `demo/shell/moq.mjs:302`); audio carries `seq` and a float64 `sendUs` in a 12-byte payload header (READ, `demo/shell/moq-audio.mjs:174`) | `VideoFrame.timestamp` / the chunk's timestamp; **NOT `AudioData.timestamp`, which browsers regenerate**, so a join skip becomes a permanent phantom offset (MEASURED, `plan-m2m.md:158`) | today only in loopback ("in watch mode the clocks are unrelated and the delta is meaningless", READ, `moq.mjs`). A publisher that stamps `timeOrigin + now + peer offset` instead makes the stamp a shared time | glass to glass p50 **26.2** / p95 **42.4 ms** loopback (MEASURED); audio 32.6 ms with **A/V skew -4 ms and zero sync logic** (MEASURED, `plan-m2m.md:153`); 170/185 ms through a cloud OBS (MEASURED) |
| **relay PCM from the Pi** | 12-byte header: uint32 `seq`, float64 Pi `performance.now()` (process relative); 48 kHz, 20 ms frames, so `seq x 20 ms` is exact sample time (READ, `inputs.mjs:262`) | the page reads `seq` only (READ, `board.mjs:434-445`); playout cushion 100 ms floor, adaptive to 250 (READ, `board.mjs:114-115`) | none today. With the Pi on the peer clock (`rig/peer.mjs`, 2.7 ms against the Mac, MEASURED) and the double rewritten as `timeOrigin + now + offset`, a stamp IS a shared time; the double is still a double, so nothing that reads the header changes shape | key press to the note arriving back **78 to 99 ms, median ~93**; to the speakers **~175 ms**; relay legs **~18 ms** each way (MEASURED, `HANDOFF.md:468-476`). It moves when the cushion adapts |
| **data channel PCM from the Pi** | the same 12-byte frame on channel `pcm`, unordered (READ, plan §2) | as above | as above | board round trip **4 ms** (MEASURED, plan §5); input sound to the browser on the direct path **214 ms** (MEASURED, plan §11 step 4, the two numbers measure different things and are quoted as written) |
| **relay H.264 from the Pi GPU** | 8-byte header: uint32 `seq`, uint32 keyframe flag. **No time** (READ, `board.mjs` `sendFrame`) | WebCodecs decode | none. A frame index at a declared fps is a guess about a renderer that drops frames | 209 frames in 9 s (MEASURED, plan §11), lag never measured |
| **MediaRecorder chunks** | WebM cluster timecodes from the recorder's start; `duration: Infinity` (MEASURED, positron-streaming) | the blob | `T0firstDataPerf` and `T0firstDataDate` already recorded beside the chunks (READ, `plan-stage-live.md:676-680`); add `T0firstDataShared` | the recorder start to first data gap is unmeasured |
| **WebAudio output** | `currentTime`; `getOutputTimestamp()` returns `contextTime` with the `performanceTime` at which it was being rendered; `outputLatency` "interval between the time the UA requests the host system to play a buffer and the time the first sample is processed by the output device" (READ, Web Audio spec) | the same | `shared = performanceTime + timeOrigin + offset` for `contextTime`; heard = scheduled + `outputLatency` | Quest out latency **24 ms** (MEASURED, `/earshot/`); headless 32 ms (MEASURED, `rig/moq/RUNBOOK.md:716`); `outputLatency` moves when the device changes, so read it every tick (READ, `demo/looper/index.html:258`) |
| **the light plane itself** (relay JSON) | envelope `sent` (`at` before 2026-10-04): the sender's `Date.now()` at send | the message | not on the peer clock: two machines' system clocks differed by ~10.4 ms (MEASURED, `plan-jam.md:124`) and this Mac's once by +159 ms (MEASURED, `rig/whep/NOTES.md`) | one way ~18 ms; pub to DO to sub 27 to 38 ms; DO hop 1 to 2 ms p50; a full room +8 ms p50 (MEASURED, positron-streaming) |

### 3.2 What the table says, in three sentences

**A receiver can always learn where ITS OWN glass is on a heavy link's own
clock**, because every transport above gives it a stamp and a presentation time
in one callback (rVFC on video, `getOutputTimestamp` on sound, `playingDate`
on HLS). **What it cannot learn on its own is where that stamp sits on the peer
clock**, and that is the only number that needs a calibration, a sender change,
or nothing (when the sender already stamps peer time). Every case in §5 is one
of those three.

### 3.3 One consequence that is easy to miss, found by the sabotage run in §8

When both the light event and the heavy link are stamped on the peer clock,
following the link is `fire at S - d`, where `d` is the receiver's own observed
`stamp - local`. **The receiver's peer offset cancels.** So a projector that only
follows a shared-stamped video does not need to have agreed a clock with anyone;
only the two senders do. COMPUTED, and proved by a sabotage that flipped the
offset's sign and left exactly that assert green (§8).

## 4. The model

### 4.1 How a light event names its time

**`at`, flat on the message. DECIDED BY THE OWNER 2026-10-04**: one time
vocabulary across the project. `at` always means when the thing happens (a
timeline row's position in `timeline/transport.mjs`, and on the wire an event's
moment in shared ms). `when` stays the uncertainty bracket around an `at`. The
wire envelope's send stamp, which owned `at` until that day, became `sent`, and
`parse()` renames an old sender's envelope `at` to `sent` so no new reader takes
a send stamp for an event time. For one day this field was a nested `due`; it
folded into `at` and an event still carrying `due` HOLDS.

```js
{ type: 'cue.set', to, text }                                 // as it happens: no at
{ type: 'light.set', to, hex, at: S }                         // scheduled ahead on the peer clock
{ type: 'cue.set', to, text, at: S, follow: L }               // S as it reaches THIS glass on link L
{ type: 'cue.set', to, text, stamp: M, on: L }                // when link L presents its own stamp M
{ type: 'light.set', to, hex, beat: 16, clock: { bpm, epoch } }   // a loop clock beat
```

⚠️ `on` is a link id only when it is a string, because a light's payload may say
`on: true`.

`S` is always a peer-clock millisecond. `M` is always in the heavy link's own
clock (a PDT, a recording's media ms). The receiver holds a **timebase** per heavy
link and turns any of these into a local time; null means hold, never fire.

### 4.2 The three modes

| mode | sender does | receiver does | right for |
| --- | --- | --- | --- |
| **as it happens** | sends on the event, no `at` | fires on arrival | anything on WebRTC or MoQ; a person pressing a button; a light nobody compares to anything |
| **scheduled ahead** | sends `at` at least the light plane's p95 early (§4.4) | fires at `toLocal(S) - leadMs` | lights on several walls agreeing; a note and a light on the same beat; a scene recall on a bar line; anything a timeline already knows before it happens (`/partitur/` knows its whole score) |
| **aligned after** | the recorder writes `at` (or the arrival time on the shared clock) into the log beside a `T0` | playback maps everything to `shared - T0` against one media master | every recording, generalising `/replay/` (§5d) |

`follow` composes with the first two: a scheduled event can follow a heavy link,
and an as-it-happens event can be given `at = sharedNow()` at its source
and then follow.

### 4.3 Where it sits in Node, Port, Link, Session

- **A session gains `timebase`**, derived the same way `bay.mjs` derives the rest
  of the session from the two ends and the §5 table:

  ```js
  session: { transport: 'llhls', address, shape, where, says,
             timebase: { stamp: 'pdt', stampOffsetMs: null, observe: 'rvfc-pdt' } }
  ```

  `stamp` names the clock the media carries (`pdt`, `rtp-sr`, `shared`,
  `media-ms`, `none`). `stampOffsetMs` is how to put it on the peer clock: `0`
  when the sender stamps peer time, a calibrated number, or `null` when nobody
  knows, which is today's honest answer for Cloudflare's PDT and SR clocks.
  `observe` says which browser callback feeds the receiver's observations.
- **A light link gains two options**: `{ ahead: ms }` (the sender schedules
  that far ahead) and `{ follow: '<heavy link id>' }` (the receiver delays by
  that link's lag HERE). In the level 2 text form:

  ```
  partitur:light:cues -> wall-ab12:wall:cue  { follow: stage:cam:video }
  partitur:light:out  -> wall-ab12:wall:light { ahead: 250 }
  ```

- **The router still never copies a frame**, and it never computes a delay
  either: the delay is a property of a receiver, because every receiver of one
  LL-HLS link is behind by its own amount (MEASURED 2 to 8 s spread). The link
  row only says WHICH heavy link to follow.
- **`clock` stays an anchor, never ticks**: `{ bpm, epoch }` on the peer clock,
  sent once and on change, exactly as `plan-xr-together.md` §4.1 has it. MIDI
  clock at 48.75 messages a second per listener (MEASURED, plan-patchbay §3.4)
  is information that fits in one message.

### 4.4 How a §5 latency becomes a delay a light link applies

| heavy transport | follow delay at a receiver | its source | how it moves, and what the timebase does |
| --- | --- | --- | --- |
| WHEP | ~67 ms p50, 77 p95 | MEASURED | a few ms of jitter-buffer adaptation; below `stepMs` (120), absorbed by the median. **Not worth following**: as it happens lands 30 to 50 ms early (COMPUTED: 67 minus a 18 to 38 ms light leg), about one frame at 30 fps |
| MoQ | 26 to 42 ms | MEASURED | not worth following; the light leg is the same size |
| LL-HLS | 2 to 8 s, per viewer | MEASURED | catch-up at 1.05x moves it 50 ms per second (COMPUTED); a drift-seek or a +1 s stall bump is a STEP, confirmed after 3 observations (3 frames at 30 fps by rVFC, 100 ms; 300 ms at `timed-messages`' 100 ms poll). Pass `video.playbackRate` as the observation's rate and catch-up is a rate change, not a drift |
| relay PCM | ~93 ms to the buffer, ~175 ms to the speaker | MEASURED | the cushion adapts 100 to 250 ms; each adaptation is a step |
| relay H.264 | unknown | none | cannot follow until the header carries a time (§7 step 7) |
| recording | 0; a playhead | READ | a seek or a rate change re-anchors at once |

**The light plane's own budget for scheduling ahead** is its p95 one way plus
margin. Pub to DO to sub is 27 to 38 ms and a full room adds ~8 ms (MEASURED), so
**250 ms ahead** covers it with room for a slow phone (COMPUTED, generous on
purpose). `/partitur/` knows its whole score, so it can just as well send every
span the moment it is linked and revise by id, which is what `timed-messages`
already does with `add` and `cancel`. At a few messages a second against
1000 msg/s (MEASURED cap) the cost is nil.

### 4.5 When a heavy link's latency moves

The timebase keeps the median of the last 9 `stamp - rate * local` differences
and moves only on a step: three observations in a row more than 120 ms off,
on the same side. So:

- **One late timer read moves nothing** (a negative control in §8).
- **Alternating jitter moves nothing**, however large (a negative control).
- **A drift-seek moves the line after three observations.** An event that fires
  inside those three observations fires against the old line. With rVFC at
  30 fps that window is ~100 ms; with a 100 ms poll it is ~300 ms (COMPUTED).
  Narrowing it means telling the timebase directly: `low-latency-player.js`
  already emits `resync` and `rebuild`, and `mediaMaster` emits `jump`, and each
  of those should reset the link's window. Not built; §7 step 3.
- **Never seek the picture to meet a cue.** Move the cue. A drift-seek aborts
  every in-flight fragment and cost an iPhone a seek every 2 to 3 s for two
  minutes (MEASURED, positron-streaming).

## 5. The cases, with numbers

### 5a. `/partitur/` cue lane to `/wall/` captions, over the stage's video

Today: partitur sends `cue.set` as the playhead crosses a span and `/wall/`
paints it on arrival (READ). The wall is a projector page showing the stage.

- **Over WHEP.** The caption arrives 18 to 38 ms after the event (MEASURED light
  leg), the picture of that moment 67 ms after (MEASURED p50). The caption leads
  by **~30 to 50 ms** (COMPUTED). That is under two frames, and under the 45 ms
  lip-sync detectability figure of ITU-R BT.1359 (RECALLED, not fetched today:
  treat it as a commonly cited threshold, not a reading). **Do nothing: as it
  happens is correct.**
- **Over LL-HLS.** The caption leads by **2 to 8 s** (MEASURED lag), differently
  on every wall. Two ways to fix it, and the cheap one ships first:
  1. **`{ stamp: M, on: stage }`**, where M is the stage's PDT for the moment.
     Exact on every wall with no peer clock, because each wall maps M with its
     own observations. It needs whoever SENDS the cue to know the PDT of the
     moment, which is true of an operator watching the HLS (not of partitur,
     which plays itself).
  2. **`{ shared: S, follow: stage }`**, which partitur can send because S is
     its own peer-clock time. It needs the stage's `stampOffsetMs`: Cloudflare's
     clock against the peer clock, plus capture to ingest. **Unmeasured.**
     Uncalibrated, the timebase HOLDS rather than guessing (a negative control).
     If someone forced it to 0 the caption would lead by capture to ingest,
     which is encode plus uplink and is INFERRED to be hundreds of ms.
  3. The interim the stage plans already chose: `timed-messages`' `lag` mode,
     wall clock minus the player's own reported latency (READ,
     `plan-stage-hls-webrtc.md:283-295`). Its error is the latency report's error
     plus this machine's `Date.now()` against Cloudflare's, which is ±tens of ms
     on a disciplined clock and was +159 ms on this Mac once (MEASURED).

### 5b. The Moholy light lane to a projector while the Pi's GPU video goes to the same screen

- **Light alone, several walls.** As it happens, N walls on one relay room
  receive within a few ms of each other on similar networks (DO hop 1 to 2 ms
  p50, MEASURED) and tens of ms apart when one is on a phone network (INFERRED).
  Scheduled ahead at 250 ms, they agree to the peer clock's **~3 ms** plus a
  display frame, **16.7 ms at 60 Hz** (COMPUTED), plus each projector's own
  input lag, which nobody here has measured.
- **Light against the Pi's picture.** If a score change both swaps the shader
  (`video.shader`, a `program` message) and changes the light, the honest
  version is: both messages scheduled ahead at the same S; the Pi applies the
  shader at S on the peer clock (2.7 ms against the Mac, MEASURED); the wall
  lights at S plus the Pi video's lag at that wall. **That lag cannot be known
  today because the H.264 header has no time** (READ). Until step 7, the light
  leads the new picture by the whole render, encode, relay and decode path,
  which is unmeasured; the relay alone is ~18 ms and one frame at the measured
  ~23 fps (209 in 9 s) is ~43 ms (COMPUTED), so **at least ~60 ms** (COMPUTED
  floor, INFERRED to be well above it with encode).
- Budget: the Pi's picture rides its own socket because audio is already 50 of
  the old 60 msg/s cap (READ, `board.mjs:258-268`). At 1000 msg/s that reason has
  shrunk, but the separate room still keeps binary framing unambiguous.

### 5c. MIDI from the patchbay to the Circuit, its sound back as relay PCM, a light on `/wall/` on the beat as heard

- **Sent versus heard.** A note sent at S is in a browser's buffer at about
  S + 93 ms and out of its speakers at about **S + 175 ms** (MEASURED, laptop).
  A wall that flashes on arrival of the same beat message flashes **~150 ms
  before the beat is heard** (COMPUTED: 175 minus a ~25 ms light leg). That is
  plainly visible.
- **Following.** With the PCM header on the peer clock (step 6), the wall that
  PLAYS the sound observes `{ local: when the frame's first sample reaches the
  speaker, stamp: header }`, where the local side is `getOutputTimestamp()`
  mapped to `performance.now()` plus `outputLatency`. Then `{ shared: B, follow:
  circuit-pcm }` lights at the beat as that wall hears it. Error budget: peer
  clock ~3 ms, plus the gap between when `arecord` read the frame and when the
  Circuit made the sound, which is a period of 10 ms in a 40 ms buffer
  (READ, `inputs.mjs:227-229, 270-276`) and is a near constant to calibrate once
  by onset (INFERRED), plus the wall's own `outputLatency` estimate.
- **Where B comes from.** Either the page's own `note.on` (B = S, the moment it
  was sent, plus the Circuit's own MIDI to sound time, unmeasured), or the
  Circuit's beat: the Pi stamps every 24th MIDI clock tick (a quarter at
  24 ppqn; 48.75 ticks a second at 122 bpm, MEASURED) on the peer clock and
  publishes `{ bpm, epoch }`, after which every beat is arithmetic.
- **"As heard" is per room.** A wall that plays no sound has nothing to follow;
  it should follow the link that the people in front of it are hearing, and the
  patchbay link says which one.

### 5d. A recording: audio, video, cue log and MIDI into R2, played back aligned

Generalising `/replay/`, which has one video, one cue log and one `T0`:

- **One recording, one `T0` on the peer clock, and a sidecar** written last (the
  audio first, the sidecar last, as positron-streaming's two-write rule says):

  ```json
  { "T0shared": 1789000000000,
    "tracks": [
      { "id": "cam", "kind": "video", "origin": 12.0, "how": "native", "errMs": 15 },
      { "id": "circuit", "kind": "audio", "origin": -4.0, "rate": 48000, "anchors": [[0, 0], [480000, 10000.3]] },
      { "id": "cues", "kind": "state", "rows": "at, or arrival on the peer clock" },
      { "id": "keys", "kind": "midi", "rows": "at per message" } ] }
  ```

  `origin` is the track's first sample in ms from `T0`. `anchors` are `[sample
  index, ms from T0]` pairs written every 10 s, the "gap table" idea from
  `research/timecode-sync-2026-08.md`.
- **Why anchors, with numbers.** A sound card's sample clock drifts against the
  wall clock. Headless Chrome's fake device measured **1900 to 5200 ppm**
  (MEASURED, headless only). At 5200 ppm a two hour show drifts **37 s**; with
  an anchor every 10 s the worst error between anchors is **52 ms** (COMPUTED).
  Real hardware is INFERRED to be tens of ppm, under 1 ms per 10 s, but it is
  unmeasured here.
- **Playback**: one media master (`mediaMaster` on the video, or the audio
  element if there is no picture), the deck on the recording's ms, every other
  track scheduled at its `origin` and slaved with `sync()` at the existing 40 ms
  tolerance. Cue and MIDI rows are `at - T0`. The timebase's `{ stamp, on
  }` with the recording as a link handles rate changes and seeks (two asserts in
  §8).
- **What exists**: `/patchbay/` records any Pi audio link into R2 through ingest,
  12 s and 139,585 bytes MEASURED (`07a9731`); ingest keeps 6 h; `workers/store`
  keeps 1,000 rows for 24 h, which is a room's history and **not an archive** for
  a cue log (READ, `plan-stage-live.md:699`).
- **Error budget per track** (COMPUTED from MEASURED parts): peer clock 3 ms, plus
  that track's `T0` method (-15 ms native against content for the archive), plus
  the recorder's start to first data (unmeasured), plus drift between anchors.

### 5e. The XR loop clock from `plan-xr-together.md`

- **Clock** `{ bpm, epoch }` on the peer clock; a beat is `epoch + n * 60000 /
  bpm`. At 122 bpm a beat is 491.8 ms (COMPUTED, and asserted in §8).
- **One loop late**: a remote body stamped at S is drawn at S + loop. With an 8 s
  loop and a 36 ms relay round trip it arrives with **7.96 s to spare**
  (COMPUTED, as the XR plan says).
- **A light on the beat on every wall and in the headset**: `beat, clock` on the
  event fires within the peer clock's ~3 ms everywhere, plus a display frame
  (11.1 ms at 90 fps in the headset, COMPUTED).
- **The sound in the headset** is scheduled at `B - outputLatency`, 24 ms early
  on a Quest (MEASURED), so it is HEARD on B. Dance Tonite's own tolerance is
  50 ms, 100 on Android (READ, `plan-xr-together.md:100`), so the budget is met
  with room, provided the page leads by `outputLatency` rather than ignoring it,
  which `timeline/transport.mjs`'s `audioClock` does today (READ).

## 6. What not to do, and why

| do not | because |
| --- | --- |
| route frames, or compute delays, in the router | a patch bay that moves everything is a mixer (plan-patchbay §3.1), and the delay is per receiver: two viewers of one LL-HLS link are 2 to 8 s apart (MEASURED) |
| trust a device's wall clock without peer agreement | Mac against Pi system clocks ~10.4 ms apart (MEASURED); this Mac once +159 ms (MEASURED); a Worker `/time` ±50 ms of bias (MEASURED); a DO's `Date.now()` ±70 ms (MEASURED) |
| use the envelope's send stamp (`sent`, `at` before 2026-10-04) as the event's time | it is the sender's unagreed `Date.now()` at SEND, and `source.load` already lost an afternoon to an `at` that meant something else (READ, `wire.mjs:76-88`) |
| use candidate-pair RTT as media latency | WHEP's 25 ms RTT against MoQ's glass to glass flattered WHEP ~3x; measured the same way WHEP is p50 67.0 (MEASURED) |
| use `hls.latency` as a lag | it freezes stale, 1.7 s against 8.4 s true (MEASURED); PDT is the honest signal |
| use `AudioData.timestamp` | browsers regenerate it, so a join skip becomes a permanent offset (MEASURED, `plan-m2m.md:158`) |
| put cue data in-band on Cloudflare | ID3, SCTE-35, DATERANGE and SEI are stripped (MEASURED) |
| burn the clock into a show | a measurement instrument is not a show (`plan-stage-hls-webrtc.md:223`). Use it to GRADE the replacement, which is what steps 4 and 5 do |
| seek the picture to meet a cue | the drift-seek loop on an iPhone (MEASURED); move the cue |
| fire on "cannot tell" | a caption fired at the wrong moment cannot be taken back; hold, then surface it as missed past the window, as `timed-messages` does |
| average round trips or lags | the minimum round trip (peer.mjs) and the median observation (timebase) are the samples not dragged by a queue |
| send MIDI clock ticks over the relay | 48.75 a second per listener for two numbers (MEASURED rate) |
| follow a link nobody has calibrated by assuming 0 | the timebase holds instead, and a sabotage that read null as 0 is caught (§8, S4) |

## 7. Steps, easiest first, each one session

| # | step | needs | graded by |
| --- | --- | --- | --- |
| 1 | **`demo/shell/timebase.mjs`**: the peer clock, observations per heavy link, median plus step detection, `at` to local time, the scheduler verdict, loop clock arithmetic | **no device** | ✅ DONE 2026-10-04: `node demo/shell/timebase-test.mjs`, 43 ok, 14 negative controls, twelve sabotages (§8) |
| 2 | **`/partitur/` sends `at` 250 ms ahead, `/wall/` honours it**: both pages run `createPeer` in a clock room of their own (`studio-1-clock`, so no ping traffic lands in the Pi's room), `/wall/` schedules through a timebase and reports per event `fired - at` in a readout cell; without an agreed clock it HOLDS and says so | **no device** for one machine; a phone for two | `node demo/check-html.mjs` on both; `node demo/verify.mjs partitur wall`, diffing the assert counts; a wall assert that an `at` event fired within 20 ms of its local time on one machine (offset exactly 0 there, so this grades the scheduler, never the clock); a negative control that an event sent with no peer clock is held. Two machines' agreement is the phone's half and is reported, not asserted |
| 3 | **Follow an HLS link by its own stamps**: a screen page plays an HLS, observes `{ local: expectedDisplayTime, stamp: PDT of mediaTime }` per rVFC frame, places captions by `{ stamp, on }`, resets the link on the player's `resync`, `rebuild` and `mediaMaster`'s `jump` | **no device**; graded against `demo/fake-err.mjs`, never a broadcaster | verify with the stand-in; SABOTAGE the stand-in's PDT by +2 s and the captions must move by 2 s, which proves the page reads PDT rather than arrival |
| 4 | **Calibrate Cloudflare's PDT against the peer clock**: the publisher burns PEER time (`pattern.mjs` burn with `peer.now()`), the viewer reads the burned row and the PDT of the same frame through rVFC; the distribution of `burned - PDT` is `stampOffsetMs` | **no device**; the pub container and Stream minutes (RTMPS records, ~225 storage minutes a day cap, MEASURED) | n of at least 500 checksum-clean frames, p50 and p95 reported, a second run on another day to see whether the constant holds |
| 5 | **WebRTC's sender reports**: `estimatedPlayoutTimestamp` against the burned clock on WHEP, answering `plan-stage-hls-webrtc.md`'s three questions (does Cloudflare emit SRs, does the browser expose it, how noisy) | **no device**; desktop Safari through `verify-safari.mjs` for the WebKit half | the burned clock as ground truth, n of at least 500; Safari's answer reported as present or absent in words |
| 6 | **The Pi's PCM header on the peer clock**: the board runs `createPeer` (it already can, `rig/peer.mjs`) and writes `timeOrigin + now + offset` into the existing float64; `/patchbay/` and `/wall/` follow it | **the Pi** | the round trip by onset (send a note at S, find the onset in the returning frames) against the header's lag: two independent routes to one number, the `circuit-cc-test.mjs` rule |
| 7 | **The Pi's H.264 header carries a time**: a versioned header (8 to 16 bytes, a version marker first, since `video.mjs:23` says the deployed header has no type byte) | **the Pi** | the GPU burns peer time into its own picture with `pattern.mjs`'s row; the wall reads the row against the header |
| 8 | **Recording sidecar and a general `/replay/`**: `T0shared`, per-track origin and anchors, the deck on one master | **no device** for a synthetic show through ingest; **the Pi** for a real one | a synthetic recording with KNOWN offsets (a click at a known sample, a cue at a known ms) played back, each fire's error asserted; a sabotage shifting one track's origin by 100 ms goes red |
| 9 | **Lights on the XR loop clock** | **the Quest** | the device log: a beat's light fire time against the headset's own beat, two devices on one loop within the 3 ms clock plus a frame |
| 10 | **Two walls, filmed**: a phone filming two projectors in slow motion as the only instrument that sees both glasses at once | **a phone** | frame counting; INFERRED to be the only way to measure projector input lag here |

## 8. Step 1, built and graded

**Files**: `demo/shell/timebase.mjs` (the module) and
`demo/shell/timebase-test.mjs` (the test). No page, no shared module and no
manifest was touched.

**What it does**: `createTimebase({ offsetMs })` holds the peer offset (null until
agreed, and null is not zero); `link(id, { stampOffsetMs })` declares a heavy
link and how its stamps sit on the peer clock; `observe(id, { local, stamp, rate
})` feeds a presentation; `lag`, `stampAt`, `localForStamp` read the line;
`fireAt(ev, now, { leadMs })` turns any `at`, `beat` or `stamp` into a local time or a hold with a
reason; `decide` gives `fire`, `wait`, `hold` or `missed`; `beatToShared` and
`nextBeat` do the loop clock.

**The test**: `node demo/shell/timebase-test.mjs` reads **43 ok, 0 failed, 14 of
them negative controls** (39 and 11 before `due` folded into `at`; the four new
ones are the shape's: `on: true` is not a link, `due` holds, a new `at` survives
the wire, an old envelope `at` is never scheduled). Expected values are worked by hand in the comment above
each assert. The figures fed in are positron's own: WHEP's 67 ms, the 137.5 ms
skew `rig/peer.mjs` injects, the Pi's -9.85 ms correction from `/jam/`, Quest's
24 ms output latency, the Circuit's 122 bpm, a 2 s LL-HLS step.

**Sabotages, MEASURED 2026-10-04**, each on a copy of the module (and of
`wire.mjs`) in a scratch directory. S1 to S7 first against the 39 of the `due`
shape, then RE-RUN against the 43 of the flat one; this table is the re-run:

| sabotage | red |
| --- | --- |
| S1 the median replaced by the last observation | 2 |
| S2 the peer offset's sign flipped | 9 (8 before the wire round trip assert) |
| S3 a step never confirmed, so the line never moves | 2 |
| S4 an unknown stamp clock read as 0 when following | 1 |
| S5 the rate ignored when anchoring a recording | 1 |
| S6 `decide` firing now when it cannot tell | 1 |
| S7 deviants pushed into the median window as well | 1 (3 the first time, written a different way) |
| S8 `follow` ignored, scheduled on the peer clock | 4 |
| S9 any `on` read as a link id, `on: true` included | 1 |
| S10 `parse()` not normalising an old envelope | 1 |
| S11 an event still carrying `due` not refused | 1 |
| S12 normalising sets `sent` and keeps the old `at` | 1 |

`node demo/shell/wire-test.mjs` grades the envelope half on its own: 16 ok, 8
negative controls, six sabotages taking 1 to 5 red.

⚠️ **S2 left one assert green and it is right to.** Following a shared-stamped
link does not depend on the receiver's own offset (§3.3). Reported, not tuned
away. ⚠️ S4, S5 and S6 are each caught by exactly ONE assert; a second assert
for each would make the coverage less brittle and is cheap.

**What it does not grade**: whether any real transport's observations look like
the ones typed in. That is steps 2 to 5.

## 9. Not settled, and what would settle it

| question | what settles it |
| --- | --- |
| Cloudflare's PDT against the peer clock (`stampOffsetMs` for LL-HLS), and whether it is constant across a show and across days | step 4: burned peer time against PDT on the same frame, two runs on two days |
| whether Cloudflare's WHEP sends RTCP SRs and the browser exposes `estimatedPlayoutTimestamp` on them; Safari is the open half | step 5 |
| the Pi's capture to header bias (the `arecord` period and buffer) | step 6, onset against header, one calibration |
| the Pi GPU video's glass to glass | step 7, burned row against header |
| real sound card drift against the peer clock, which sets the anchor interval | one long recording on the Pi and one on a Mac, sample count against peer time every 10 s |
| how fast a step is noticed in practice (rVFC per frame against a 100 ms poll) and whether 120 ms and 3 are the right `stepMs` and `stepCount` | step 3 against the stand-in with a scripted drift-seek; then one real LL-HLS session with the player's `resync` events logged beside the timebase's `moved` |
| whether a person notices a caption 30 to 50 ms early on WHEP | people, in a room; nothing here can answer it |
| projector and television input lag | step 10, a phone filming |
| the Circuit's MIDI in to sound out time | the onset method of step 6 with a note the page sends, compared with the Circuit's own clock-out |
| whether a scene recall that opens heavy links can land on a bar | unchanged from plan §12: the light half of a recall can be scheduled on a bar now (`beat` and `clock` on the event), the heavy half takes seconds to open and still cannot |
| whether `src/timed-messages.js` should become a thin user of the timebase or stay separate | decided when step 3 is built: if the page needs both, one wins |

## 10. Sources

Spec pages fetched today (no media server was contacted):

- https://wicg.github.io/video-rvfc/ (VideoFrameCallbackMetadata: `captureTime`, `receiveTime`, `rtpTimestamp`, `mediaTime`, `expectedDisplayTime`)
- https://w3c.github.io/webrtc-stats/ (`estimatedPlayoutTimestamp`, `remoteTimestamp`, jitter buffer counters)
- https://w3c.github.io/webrtc-extensions/ (`captureTimestamp`, `senderCaptureTimeOffset`, both needing abs-capture-time)
- https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpReceiver/jitterBufferTarget (0 to 4000 ms, a hint, defined in webrtc-pc)
- https://webaudio.github.io/web-audio-api/ (`getOutputTimestamp`, `outputLatency`, `baseLatency`)
- https://datatracker.ietf.org/doc/html/draft-ietf-moq-transport-14 (no transport-layer timestamp)
- https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis (`EXT-X-PROGRAM-DATE-TIME`)

ITU-R BT.1359's 45 ms figure is RECALLED and was not fetched.
