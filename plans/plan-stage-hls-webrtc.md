# Plan: `/stage/` as a receiver, fed by a real publisher, on ONE transport

Written 2026-09-25, rewritten the same day when the premise changed twice.
**Read off the running code and off measurements already in this repository.**
Every number says where it came from; anything inferred is marked as inference.

## What was asked, across four messages

> *"i want state demo to work with hls and webrtc with that messages sync. what
> should be done for it? it currently plays just r2 file directly?"*
> *"i want it to be real life case: somehting publishes whe(i)p stuff or hls to
> cf stream and stage picks it up. can we wire pi to do it (and not exhaust
> itself?!) can it take r2 mim file as input? and how the sync works, audience
> does not want to see timecode"*
> *"real life is likely obs"*
> *"you had experiments with obs in cf container?"*

---

## 1. The premise, corrected twice

🔴 **`/stage/` DOES NOT PLAY AN R2 FILE TO ITS AUDIENCE, AND IT IS NOT A
RECEIVER EITHER. TODAY IT IS THE PUBLISHER.** MEASURED by reading
`demo/stage/index.html` (3,542 lines) on 2026-09-25:

```
R2 mp4 -> <video> -> CANVAS (with a burned clock) -> captureStream()
  -> whipPublish() -> Cloudflare Stream -> whepPlay() -> the audience
  -> MediaRecorder on the RECEIVED stream -> putWhole() -> R2 as the archive
```

So the change asked for is **an inversion**: something else publishes, and stage
subscribes and runs the questions. That is a smaller change than it sounds,
because `whepPlay()` and the whole receive path already exist on that page. What
goes away is the canvas publish, and with it the reason the burned clock is in
the picture at all.

⚠️ **AND THE hls.js ALREADY IN THAT PAGE IS NOT A DELIVERY LEG.** It loads only
behind `?bg=`, to put an ERR archive clip BEHIND the stage. Its own comment
answers this, having been asked once before: *"but why hls when we play
webrtc??"*

---

## 2. Yes, OBS in a Cloudflare container was done, and it was measured

✅ **IT RAN AND IT PUBLISHED.** `rig/obs-cloud/NOTES.md`, 2026-08-27, app
`positron-obscloud`, a 1.25 GB image on **standard-4 (4 vCPU / 12 GiB)**, driven
from a Mac over a Worker-proxied obs-websocket.

| measured then | value |
| --- | --- |
| cold wake to pixels on local glass | **11.6 s** |
| OBS CPU, 720p30 x264 zerolatency | **~190% of one EPYC core, about 52% of standard-4** |
| glass to glass, cloud OBS to local viewer | **p50 170 ms / p95 185 ms** (MoQ leg) |
| control plane through the Worker tunnel | **p50 ~65 ms** per command, 0 failures in 120 |
| cost of a 2 h show on standard-4 | **~$0.50 raw**, about $0 inside the Workers Paid allotments |
| R2 pull for media at boot | **14 to 26 Mbps** |

🔴 **THE TRAP THAT COST TWO BOOTS, AND IT WILL COST THEM AGAIN: A CLOUDFLARE
FIRECRACKER GUEST HAS NO `/dev/shm`.** The moment a browser source spawns, CEF
dies with `incorrect permissions on /dev/shm`, OBS exits SIGTRAP, the supervisor
reloads the scene collection including the browser source, and it re-crashes
until it gives up. The local Docker rig never sees it because it has 7.9 G of
`/dev/shm`. The fix is baked into `start-cloud.sh`: `mkdir -p /dev/shm && chmod
1777 /dev/shm` as root before supervisord, plus `startretries=10`.

⚠️ **IT IS ALL DELETED.** Checkpoint 4 verified the container apps, all four
registry image tags and both Workers were removed. What is KEPT in
`rig/obs-cloud/` is the rebuildable part: the Dockerfile, `start-cloud.sh`, the
baked profile, the obs-moq plugin, the Worker and the run scripts. Rebuild from
zero is documented at **obsdock 159 s, obscloud ~1 min, deploy ~3 min**.

🔴 **AND THE ONE THING THAT MATTERS MOST HERE WAS NEVER TESTED: RTMPS OUT OF
THAT IMAGE TO A CLOUDFLARE LIVE INPUT.** Deliberately, under the session's money
rule, which forbade creating Stream inputs. The notes list it under STILL
NEEDED and say the transport is reachable (1935 and 443 outbound are open). **So
the cloud OBS is proven to publish MoQ and is UNPROVEN to publish to Stream.**
That is the first thing to measure and it is cheap now, because the inputs
already exist.

---

## 3. ONE transport at a time, decided 2026-09-25

🔴 **DECIDED WHILE THIS PLAN WAS BEING WRITTEN: *"no 2 transports in same
time"*.** That removes most of what follows and it is the right call. Running
both at once costs two live inputs, a dual-output trick, two meters on a bill
that charges per minute delivered on each protocol, and an audience split across
a latency gap of several seconds that every cue then has to straddle. **It buys
nothing anybody asked for.** Pick per show:

- **WebRTC** when the answers matter and the room is small. Measured p50 67 ms
  glass to glass, so a question is asked and answered as if everyone were in one
  place, and **the cue timing problem disappears entirely**.
- **LL-HLS** when the audience is large or on phones. A few seconds behind,
  scales, survives bad networks, floor about 2 s on this provider.

⚠️ **THE CHOICE IS BAKED INTO WHICH INPUT EXISTS**, because WHIP and WHEP must
be used together and an RTMPS input is never served over WHEP. Changing
transport later means a different input, not a setting.

### Kept for the record: both at once WAS measured, and is not the path

The rest of this section is what was found before the decision. It stays because
it is measured and because somebody will ask again.

#### Both transports out of one OBS

🔴 **OBS HAS EXACTLY ONE STREAM-SERVICE SLOT**, and `rtmp_custom`,
`whip_custom` and `moq_service` all want it. `rig/obs-pro/stream.mjs` says so at
the top and drives the three one at a time. A second stream output **cannot be
created over obs-websocket**.

✅ **BUT DUAL OUTPUT WORKS, AND IT WAS MEASURED.** The trick, from Checkpoint 2:
**use the RECORDING slot as a Custom Output (FFmpeg)** pointed at a URL rather
than a file, baked into the profile because it cannot be created remotely.

- Both legs live at once from one OBS: `StartStream` event **78 ms**,
  `StartRecord` event **147 ms**, and the recording leg is fully remote-drivable
  with `StartRecord` / `StopRecord` (6 ms to re-start), which is the whole point.
- **The second encode costs about +30% of one core**, 248% to ~274-284%. RAM
  920 to 984 MiB.
- **It does not degrade the first leg**: the primary measured p50 172 / p95
  188 ms with the second output running, statistically the same as 185 / 202
  alone, and 0 skipped frames throughout.
- ⚠️ **The recording leg buffers more**: p50 **437 ms** against **182 ms** for
  the same transport in the stream slot, about +255 ms, because of the
  ffmpeg-output and flv-muxer path. The notes call it *"fine for an
  archive/simulcast leg"*.

**So the shape is:**

```
OBS  ── stream slot ────> WHIP  -> input A -> WHEP  -> stage + interactive audience
     └─ recording slot ─> RTMPS -> input B -> LL-HLS -> the scale audience
```

⚠️ **PUT THE LOW-LATENCY TRANSPORT IN THE STREAM SLOT.** The +255 ms penalty
lands on whichever leg is in the recording slot, and it is noise against LL-HLS's
2 to 6 s floor while it would be a third of the WHEP budget.

🔴 **AND THE TWO INPUTS ARE NOT OPTIONAL.** WHIP and WHEP must be used together
and an RTMPS input is never served over WHEP. Both inputs already exist:
`0e390aa4…` (`positron-demo`, RTMPS/LL-HLS) and `224558e8…` (`whep-rig`).
⚠️ **`whep-rig` IS ALREADY CONTESTED.** Both `/stage/`'s browser publish and
`workers/pub`'s container WHIP leg target it, and this repository records that
*"two publishers on one input is one publisher and a fight"*. Adding OBS as a
third makes that a scheduling problem that needs an owner, not an accident.

---

## 4. The Pi: it can, it should not, and the reason is not CPU

You asked whether the Pi could do this without exhausting itself. Three answers,
in the order that matters.

🔴 **FIRST, THE ONE THAT DECIDES IT: A PI 5 HAS NO H.264 HARDWARE AT ALL.**
Recorded in `rig/vis/README.md`: Broadcom removed the H.264 block from BCM2712,
**encode and decode**, and Raspberry Pi's own documentation says the Pi 5 falls
back to software encoders whose latency *"can sometimes be an issue for
real-time streaming applications"*. A Pi 4's BCM2711 does have the block. ⚠️
**WHICH BOARD IS ACTUALLY ON THE DESK IS NOT RECORDED AS A MEASUREMENT.**
`rig/board/README.md`'s Pi 4 column says in its own words that it is *"derived
from the class of chip, not measured"*. **`ssh positron@<ip> cat
/proc/cpuinfo` settles it in one command and nobody has run it for this
purpose.** Do that before costing anything on the board.

⚠️ **SECOND, THE BOARD IS AN INSTRUMENT AND ITS DESIGN SAYS NO BROWSER.**
`rig/board/README.md` opens with it: *"No browser on the board. Every permission
failure of 2026-09 came from running one unattended."* OBS is a browser plus a
compositor. Putting it there contradicts the one rule that made that box
reliable, and the box is currently holding up `/keys/`, `/knobs/` and `/grains/`.

🔴 **THIRD, AND IT IS THE REAL ANSWER: FOR A FILE SOURCE THE PI IS A ROUND TRIP
FOR NOTHING.** The film is in R2. A Cloudflare container is next to R2 and
measured pulling from it at 14 to 26 Mbps. The Pi is in another building behind
a domestic uplink. Sending R2 bytes to the Pi so the Pi can send them back to
Cloudflare adds a building, an uplink and an encoder to a path that does not
need any of them.

✅ **WHAT THE PI IS ACTUALLY FOR IS A SOURCE NOBODY ELSE HAS.** A camera in that
room, the instruments, a live performance on the desk. If the show is *"the
board is playing and the audience watches it"*, the Pi is exactly right and the
film is irrelevant. If the show is *the film*, the Pi has nothing to contribute.
**That is a question about the show, not about the hardware.**

---

## 5. Can it take the R2 MIM file as input

✅ **YES, AND IT IS MEASURED FOR THE CONTAINER ROUTE.** `rig/obs-cloud/NOTES.md`
lists show-content ingestion as solved in principle: browser sources fetch over
the open egress, and *"media files need R2 pull at boot, ~14-26 Mbps
measured"*. The film is about **253 MB**, so that is roughly **80 to 145
seconds** to have it on local disk.

⚠️ **THE DISK IS EPHEMERAL AND THAT IS THE DESIGN CONSTRAINT, NOT THE
BANDWIDTH.** A real sleep/wake loses everything: the notes measured that WS
sessions do not survive it, the next request boots a fresh container with scenes
gone. So the pull is **per boot**, and a 2 minute pull in front of an 11.6 s
wake means the film is the slowest thing in the startup by an order of
magnitude.

**Two ways round it, neither built:**
1. **Stream it rather than pull it.** OBS's media source and ffmpeg both read an
   HTTP URL. R2 serves ranges. This trades the 2 minute wait for a dependency on
   the read holding up for the length of the show.
2. **Pre-warm.** Pull at boot into the ephemeral disk while the scene is on a
   holding card, and only start the stream when it has landed. This is what the
   11.6 s cold-wake figure would become: call it ~2 minutes to first frame.

⚠️ **AND THE HONEST NOTE: IF THE SOURCE IS A FILE THAT NEVER CHANGES, OBS IS A
LOT OF MACHINERY FOR IT.** `workers/pub`'s container already publishes two legs
with ffmpeg and would take the film as `-i` in place of `testsrc2`. OBS earns its
1.25 GB when somebody needs scenes, overlays, a camera, or to change what is on
screen during the show. **Pick OBS for the control surface, not for the file.**

---

## 6. The sync, with no timecode on screen

🔴 **THE BURNED CLOCK IS OUT, AND IT WAS THE RIGHT CALL TO RULE IT OUT.** It
exists because a measurement rig needs glass-to-glass truth, and it is drawn
into the picture by `demo/shell/pattern.mjs` and read back by `readBurnedFrom`.
For an audience it is a row of blocks over somebody's film. **A measurement
instrument is not a show.**

### The HLS half is solved and costs nothing

✅ **`EXT-X-PROGRAM-DATE-TIME` IS ALREADY THERE AND IS INVISIBLE.** It is emitted
because the input is provisioned `preferLowLatency: true`, and it was seen on
this account this morning:

```
#EXT-X-PROGRAM-DATE-TIME:2026-09-25T03:53:25.003Z
```

`src/timed-messages.js` already consumes exactly this, through `hls.playingDate`
on the hls.js path and `getStartDate()` on the WebKit native path. A cue is
`{id, at, data}` where `at` is **epoch ms of the stream moment**, and it fires
when THAT viewer's playhead reaches it. ⚠️ **AND NO DEMO USES THAT FILE.**
MEASURED by grep 2026-09-25: only `rig/cue-sync.html` and `src/demo.html` import
it. It is 228 lines, standalone, and already listed in `PARTS.md`.

### The WebRTC half has no playlist, so it needs a different clock

🔴 **THERE IS NO PDT ON WHEP AND THERE IS NO IN-BAND CHANNEL EITHER.**
Cloudflare's transcode **strips ID3, SCTE-35, DATERANGE and SEI, verified**. So
the only candidates are out of band or in the media itself.

⚠️ **THE CANDIDATE I WOULD TRY FIRST IS THE RTCP SENDER REPORT CLOCK, AND IT IS
INFERENCE. NOTHING IN THIS REPOSITORY HAS MEASURED IT.** Grepped 2026-09-25:
`estimatedPlayoutTimestamp`, `remoteTimestamp` and `getSynchronizationSources`
appear nowhere in `demo/`, `rig/`, `src/`, `proto/` or `workers/`. The idea is
that RTCP Sender Reports map an RTP timestamp to an NTP wall clock, and a
browser surfaces that through `getStats()` on the `inbound-rtp` report, which
would give the wall-clock moment of the frame currently being shown without
touching a pixel. **What has to be measured before anything is designed on it:**
1. Does Cloudflare's WHEP sender actually emit RTCP SR often enough.
2. Does the browser expose `estimatedPlayoutTimestamp` on this stream. Chrome is
   the likely yes and **Safari is the open question**, which matters because
   WebKit is where half this project's viewers are.
3. How noisy it is, against the burned clock as ground truth. **The burn is the
   right instrument for grading the replacement even though it is the wrong
   thing to ship**, which is a pleasing way for it to retire.

### With one transport, most of the problem is gone

🔴 **ON WEBRTC THERE IS NO CUE TIMING PROBLEM AT ALL.** At p50 67 ms the viewer
is live. The question is pushed over the relay and shown the moment it arrives,
and 67 ms is inside the noise of a person noticing a question. **No clock, no
PDT, no RTCP, nothing to measure.** That is a strong argument for choosing
WebRTC for any show whose point is the answers.

🔴 **ON LL-HLS THE PROBLEM IS REAL BUT IT IS ONE AUDIENCE, NOT TWO.** Everybody
is behind live by their own amount, between about 2 and 8 seconds, so a question
pushed to everybody at once lands at a different moment in the show for each of
them. Two answers, and the cheap one is genuinely good enough to ship:

✅ **THE CHEAP ONE: ACCEPT EACH VIEWER'S OWN REPORTED LATENCY.** The two transports have very different
latencies but each is roughly stable: WHEP measured **p50 67 ms** glass to
glass, LL-HLS sits at 4 to 6 s and reports its own lag continuously through
`hls.latency` and PDT. So:

- Push the cue over the relay exactly as `/stage/` already does today.
- **On WHEP, fire it immediately.** 67 ms is inside the noise of a person
  reacting to a question.
- **On HLS, hold it by that viewer's own reported latency**, which the player
  already computes and already exposes on its `latency` event.

🔴 **THIS IS NOT A COMPROMISE, IT IS THE SAME IDEA WITH A CHEAPER CLOCK.** The
question *"where is this viewer in the show"* is answered by their own reported
lag rather than by a timestamp on the frame. It reuses machinery that exists and
is green, it needs no RTCP research, and it would be wrong only if a viewer's
latency changes faster than a cue's tolerance. **The archive timeline is
untouched**: `sinceT0()` stays exactly as it is, because a recording has one
timeline and no latency at all.

⚠️ **AND IT HAS A KNOWN FAILURE MODE, SAID OUT LOUD: A DRIFT-SEEK OR A REBUILD
MOVES THE HLS VIEWER'S LATENCY IN A STEP.** The player reports it, so the cue
engine can re-derive rather than be surprised, but a cue in flight across a
rebuild is the case to write a test for first.

---

## 7. The order I would do it in

0. 🔴 **THE SKILL USER COMES FIRST AND IS ALREADY DONE.** Asked 2026-09-25:
   *"i want to make sure the user of positron-start skill gets its setup: he can
   stream his own webrtc or hls and want messages/q's to work, does not care how
   we set up our positron demo page"*, followed by *"but we sill need working
   demo too"*. So this is two deliverables, and the portable one does not wait
   for the demo. `positron-start` Step 4d now carries the whole recipe, and
   `PARTS.md` gained the relay pair, VERIFIED standalone: `workers/relay` is 287
   lines with **no imports** and one Durable Object, `demo/shell/wire.mjs` is 317
   lines with **no imports**. A stranger can now do stream-plus-questions on
   their own account without reading anything about `/stage/`.
1. 🔴 **MEASURE RTMPS OUT OF THE CLOUD OBS IMAGE.** It is the one leg the
   2026-08-27 session deliberately did not test, both Stream inputs already
   exist, and it is the foundation of the demo half. Rebuild is ~5 minutes of
   builds and a 3 minute deploy, and a 2 h show costs about $0.50.
   ⚠️ **ONLY NEEDED IF THE SHOW PICKS LL-HLS.** On the WebRTC route OBS speaks
   WHIP natively out of the stream slot and there is nothing to prove.
2. **Settle what the show IS**, because it chooses the source and nothing else
   can: the film, or the room with the board in it. The film says container; the
   room says the Pi is a camera and the encoder lives elsewhere.
3. **Invert `/stage/`**: drop the canvas publish, keep `whepPlay`, add the tuned
   LL-HLS player beside it, and let the page take `?transport=whep|hls`. The
   receive path and the question instrument already exist.
4. **Ship cues on the measured-offset rule** in section 6. No new clock.
5. **Then, separately and only if it is worth it**, measure the RTCP playout
   clock against the burn and decide whether to replace the offset rule with it.

⚠️ **DO NOT START WITH THE SECOND TRANSPORT.** A stage whose HLS audience is
asked about a scene they have not been shown is worse than one transport, and
that is what building delivery before cue timing produces.

## What this plan still cannot settle

- **Whether the cloud OBS image can reach a Cloudflare Stream RTMPS input.**
  Untested by design. Item 1 exists to answer it.
- **Which Raspberry Pi is on the desk.** One `cat /proc/cpuinfo` away, and it
  decides whether the board has an H.264 encoder at all.
- **Whether Safari exposes a usable WebRTC playout clock.** Unmeasured, and it
  is the half of the audience that matters most on this project.
- **Who owns `whep-rig`.** Three would-be publishers now, and the repository's
  own rule says that is one publisher and a fight.
- **The bill with two legs running.** Stream meters per minute delivered on both
  protocols and buffering is billable. Two transports is two meters, and the
  arithmetic needs a real audience size before anybody promises it.
