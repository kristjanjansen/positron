# plan-xr-together: the patchbay, a headset, and many people at once or over time

> Asked 2026-10-04, verbatim in `BACKLOG.md`: *"Still need plan to univesral
> router and xp and multiuse. See lcd soundsystem and google cardboard
> interactive experiment"*. Read as: join the universal patchbay
> (`plans/plan-universal-routing.md`) to XR (`plans/plan-xr*.md`) and to MANY
> people, either in one room now or one after another over time. The reference
> is LCD Soundsystem's *Dance Tonite* (2017).
>
> **NOTHING HERE IS BUILT AND NOTHING NEW WAS MEASURED ON A DEVICE.** Every claim
> carries a tag. **READ** means read in source code or a primary document today,
> with the path. **MEASURED** means a number this repository measured earlier,
> with where. **COMPUTED** means arithmetic done for this plan, including a
> compression run on SYNTHETIC motion, which is nobody's body and is not a
> measurement of dancing. **DOCUMENTED** means a vendor page says so.
> **INFERRED** means reasoned from what was read and not confirmed.
>
> Extends, and does not re-derive: `plan-universal-routing.md` (the model and its
> §7 exclusions), `plan-patchbay.md`, `plan-route-core.md`, `plan-xr.md` (the
> device), `plan-xr-room.md` (sound in the room), `plan-xr-hands.md` (poses and
> the tablet), `plan-looper.md` §1 and §4 (a loop does not need a fast
> transport; layers are tape machines), `plan-portable-board.md` §4.2 (what
> "multi user" can mean on one board).

## 1. The verdict

**Build Dance Tonite's asynchronous half first, because almost every part of it
already exists here and it costs the relay nothing.** A take is a small file:
a head and two hands, 21 numbers a frame, recorded inside the headset's own frame
loop, played back by every device against one shared loop clock. At 30 frames a
second an 8 second layer is **10,080 bytes** as 16-bit integers (COMPUTED). It
travels as a `file` through ingest, which only needs to learn one more format.

**The universal-routing exclusion stays, narrowed to what it was really about.**
`plan-universal-routing.md` §7 says *"XR sessions: the headset owns the frame
loop"*. That remains true and is not touched: no link opens, drives or paces a
session. What changes is that **the page holding the session is a node like
`/wall/` and `/partitur/` already are**, its body is a set of out ports sampled
from the frame loop at a declared rate, its recordings are `file`, and the many
people dancing live in one room are a `state` bus, which §7 already says stays a
room.

**Live, many people in one room now, works for tens and not for 128.** The
relay's 1000 msg/s is PER SOCKET (`workers/relay/src/index.js:81`, the bucket is
keyed by socket at `:210`), so it is not the limit that binds. Cloudflare's
documented soft limit of **1,000 requests a second per Durable Object** covers
the whole room's incoming messages, so at 30 Hz the room tops out near **33
dancers**, at 15 Hz near 66 (COMPUTED). Fan-out above 15 receivers has never
been measured here. And the way to make live dancing feel together is
plan-looper's old trick: **draw the others one loop late**, exactly on the beat,
so network latency stops mattering.

**A hand can drive sound today for light, and needs one small step for the
Circuit.** A hand's height to `/wall/`'s light is `value` to `value` and `bay.mjs`
accepts it. A hand to the Circuit is refused by `bay.mjs:899` (*"Nothing here
turns value into midi"*), so the headset page emits a `midi` port carrying CCs,
the way `/partitur/` emits siren notes. It will be demonstrable, not playable:
the path is well past the ~100 ms line `plan-xr-room.md` §1 quotes.

**Cardboard is the weak part.** Positron has no phone orientation code at all,
and Dance Tonite's Cardboard support on an iPhone was the WebVR polyfill, not a
real immersive session (READ). Whether a phone offers `immersive-vr` today is
UNCONFIRMED and is one press on the owner's phones to settle.

**A take is identifying data about a body, and the default must be that it
expires.** A 2023 study identified 73.2 per cent of 55,541 VR users from **10
seconds** of head and hand motion (DOCUMENTED, §6). A Dance Tonite room is up to
160 seconds of one person. Ingest already deletes everything after six hours;
that is the right default and nothing should be kept without a curator.

## 2. Dance Tonite, what it actually was

### 2.1 Sources

- The code, cloned and read today: `github.com/puckey/dance-tonite`, last commit
  2018-08-30, repository archived 2026-01-29 (READ off the GitHub page).
  **Licence Apache-2.0** (READ, `LICENSE`).
- The technical case study on web.dev, and Google's announcement of 2017-08-22.
- `experiments.withgoogle.com/dance-tonite` and `puckey.studio/projects/dance-tonite`.
- The live site `tonite.dance` was **deliberately not fetched**; whether it
  still runs is UNCHECKED and nothing in this plan depends on it.

Paths below are inside that repository.

### 2.2 What it was

| fact | tag | where |
| --- | --- | --- |
| A WebVR music video for "Tonite", by Jonathan Puckey and Moniker with Google's Data Arts Team, published 2017-08-22 | READ | Google blog; `src/components/About/content.md` |
| **WebVR 1.1, not WebXR.** Phones without native WebVR got `webvr-polyfill`, which emulates a headset from device orientation | READ | `src/utils/feature.js:133`, About text |
| Three roles from one URL, by device: room-scale headset (Vive, Rift) **performs**; Daydream, Gear VR or Cardboard **stands on stage** with 3 degrees of freedom; no headset gets a **bird's eye isometric view** and can click a head to see from it | READ | About text, case study, Google blog |
| A performer is **three points**: head and two controllers, drawn as a cone and two cylinders | READ | case study; `src/utils/serializer.js` |
| Each point is decomposed from its matrix into position (3) and quaternion (4), so **7 numbers a point, 21 a performer a frame**, each multiplied by 10,000 and rounded to an integer | READ | `serializer.js`, `PERFORMANCE_ELEMENT_COUNT = 21`, `compressNumber` |
| Recorded at **90 frames a second against the AUDIO clock**: a frame is added when the audio time says one is due, and missing frames are filled with the last pose | READ | `src/recording.js`, `secondsToFrames`, `fillMissingFrames` |
| **Layers**: every time the record loop wraps, what was just danced is appended as another performer in the same frame rows, so you dance beside your own past selves. Up to **20 rounds** | READ | `recording.js` `tick()`; `src/settings.js` `maxLayerCount: 20` |
| A round is two loops, `Math.floor(audio.totalProgress / 2)`; one to dance and one, INFERRED from the name `performWaitRoom`, to wait and watch | READ, part INFERRED | `src/containers/Record/index.js:124` |
| A loop is **8 seconds**; the song is 29 loops (232 s); the corridor has **19 rooms** of 5 by 6 by 6 m | READ | `settings.js` |
| On submit the browser makes **three files, 15, 45 and 90 fps**, interpolating with slerp, as newline-delimited JSON, uploaded under anonymous Firebase auth to `_incoming/`, then a Cloud Function `processSubmission` | READ | `src/utils/firebase/uploader.js`, `src/utils/convertFPS.js` |
| Playback fetches **45 fps on a 6DoF device and 15 fps otherwise**, streams the NDJSON line by line, and interpolates between frames | READ | `src/room/frames.js` `getURL`; `serializer.js` `avgPosition`, `avgQuaternion` |
| The animation clock is snapped to the audio element whenever they differ by more than **50 ms (100 ms on Android)**. The case study says "within 10 ms"; the code's tolerance is 50 | READ | `src/audio.js:54` |
| **One recording per room in the corridor**, from a curated playlist. So a room fills with ONE person's past selves, and other people are in the other rooms. Many people share one space only in the final "megagrid", a shuffled grid of recordings marked worthy of it | READ | `src/storage.js` `loadPlaylist` (`playlist.shift()` per room); `src/room/layout.js` |
| 30 to 60 performances drawn at once with instanced geometry and three object types; fog distance drops when fps falls to 52 and grows above 56; about 60 fps on 3DoF and 90 on 6DoF | READ | case study |
| **Moderation**: nothing reaches the public playlist without a curator. A CMS behind a secret lists unmoderated recordings, rates them -1, 0 or 1, titles them, marks them megagrid-worthy, bans them, and publishes a draft playlist. Delete is the room number negated | READ | `src/utils/firebase/cms.js`; `src/containers/Submissions/index.js:130` |
| **No way for a dancer to delete their own take was found** in the client, and the About text says nothing about privacy | READ, absence | grep across `src/` |
| How many takes were submitted | not found | no primary source gives a number |

⚠️ **The brief read Dance Tonite as rooms that fill with your past selves AND
other people. The code says otherwise for the corridor.** A room is one person
layered with themselves; strangers meet only in the megagrid. That matters for
§4, because it means the original never had to solve many strangers in one
small room, and positron would be doing something it did not.

### 2.3 What is worth taking from it, and what is not

Worth taking: the three roles by device; three points per body; position and
quaternion as integers; recording against the audio clock rather than the frame
clock; several rates of one take so a weak device fetches less; streaming the
take and interpolating; instancing; a curator between a submission and the
public.

Not worth taking: its code. It is three.js of 2017, WebVR 1.1, Preact and
Firebase, and positron is hand-rolled WebGL2 on WebXR with Cloudflare behind it.
The licence would allow a port (Apache-2.0 asks for the notice to be kept); the
stack makes one pointless. The ideas and the shape of the data move; the code
does not.

### 2.4 Two other precedents, briefly

- **Chrome Music Lab's Shared Piano** (Google Creative Lab, 2020): a link is a
  room, up to **10 players**, six voices of polyphony (DOCUMENTED by the press
  and its experiments page). `research/music-jamming-2026-08.md` already files
  it: *"no sync contract at all, and it still works socially"*. The lesson for
  here is the floor: people will play together over a relay with no clock
  agreement and enjoy it.
- **Mozilla Hubs** (2018): WebXR rooms shared by headsets, phones and desktops
  from one URL, the same three-device idea as Dance Tonite but live. Mozilla
  ended it on 2024-05-31 and it continues as an open source community edition
  (DOCUMENTED). The lesson is the cost of running live presence as a hosted
  service, which is exactly the half this plan builds second.

## 3. What positron already has, and what is missing

| need | positron has it | where | gap |
| --- | --- | --- | --- |
| head pose every frame | yes | `demo/floor/index.html:1537`, `demo/weight/index.html:1594`, `demo/shell/xr-panel.mjs:1556` (`getViewerPose`) | thrown away after drawing |
| both grips every frame, assigned by handedness | yes | `demo/shell/xr-hands.mjs:323-330` | thrown away after drawing |
| a way out of every session | yes | `demo/shell/xr-quit.mjs`, `xr-quit-test.mjs` | none |
| audio inside a Quest session | MEASURED fine: context survives, out latency 24 ms, 90.0 fps held | `positron-xr` skill, `/earshot/` | none |
| drawing many copies cheaply | yes, instancing | `demo/floor/index.html:501`, `:1322` (`drawArraysInstanced`) | not in `xr-room.mjs` |
| one clock across machines | yes, MEASURED **~3 ms** agreement on a real link | `proto/looper/peer.mjs`; `demo/jam/index.html:47-72` | none |
| a scheduler on that clock | yes | `timeline/transport.mjs` `createDeck({ clock })` | none |
| layers as tape machines, a remote layer the same object as a local one | yes, in the plan and in the looper | `plan-looper.md` §4; `peer.mjs` (~1.7 kB a layer, MEASURED there) | none |
| a page as a patchbay node | yes, twice | `demo/wall/index.html:69-93`, `demo/partitur/index.html:242-331`, `graph.announce` in room `studio-1` | no XR page announces itself |
| eight media, sessions for heavy ones | yes | `demo/shell/bay.mjs:39` (`MEDIA`), `:51` (`HEAVY`) | `value` to `midi` refused, `bay.mjs:899` |
| a timeline that recalls scenes | yes | `demo/partitur/index.html:127-166` (`scene.recall` on a mark) | no XR page listens |
| a room from four bytes | yes, MEASURED byte identical on the Quest | `plan-xr.md` §0, `xr-room.mjs:182` `roomOf(seed)` | none |
| storage, tokenless with caps | yes | `workers/ingest/worker.mjs:88-111`: 24 MiB a session, **5 sessions an hour an address**, 6 h TTL | formats are only `ts`, `webm`, `mp4` (`:121-125`) |
| a room's message history | yes | `workers/store/src/index.js`: 1,000 rows, 24 h | none for an index of takes |
| consent delete with a tombstone | yes | `workers/selfrec/src/index.js:174`; `workers/instrument/src/index.js:335` | not wired to anything pose shaped |
| EU-pinned storage | yes | `workers/instrument/src/index.js:66` | none |
| phone orientation, Cardboard | **no** | grep for `deviceorientation` finds only vendored Faust | all of it |
| a harness that drives the Quest | exists, never run on one | `demo/verify-quest.mjs`; `adb` is still not installed | `adb`, on a managed machine, so ask first |

⚠️ **One stale number found on the way, reported and not edited.** `bay.mjs`'s
`TRANSPORTS` table (`:81-106`) says *"cap 60 msg/s"* on every `state` row and
*"cap 60 msg/s, stay at 50"* on audio over the internet. The relay's cap is 1000
and the streaming skill records exactly this mistake. It copies
`plan-universal-routing.md` §5, which says the same. It does not change any
decision in `bay.mjs`, but any page that shows `says` to a person shows the wrong
number. One line each, for whoever next touches the file.

⚠️ **And the measured fan-out is smaller than it sounds.** "A full room costs
the sender about 8 ms at p50" comes from `demo/perf-wire.mjs:58`, which ran
**one sender at 20 msg/s into N = 1, 2, 4, 8, 15 receivers**, under the old
16-socket cap. Many senders into 128 sockets has never been run.

## 4. The model

### 4.1 Every device is a node, and the headset page is one more page

In `plan-universal-routing.md` §3's vocabulary. Site ids are minted per page the
way `/partitur/` mints `partitur-<4>`.

```
quest-ab12                                   kind person, place browser (a body)
  quest-ab12:body:pose     out  value  { channels: 21, rate: 30, layout: 'p3q4', space: 'local-floor' }
  quest-ab12:body:hand-r   out  value  { channels: 3, range: [0, 1], rate: 30 }   (height, reach, twist)
  quest-ab12:body:cc       out  midi   emits ['cc']
  quest-ab12:body:take     out  file   { format: 'pose', rate: 30 }
  quest-ab12:room:scene    in   state  { schema: 'scene' }
  quest-ab12:room:loop     in   clock  { anchor: 'peer' }

phone-cd34                                   kind screen (a viewer)
  phone-cd34:screen:scene  in   state  { schema: 'scene' }

r2:takes                                     kind store
  r2:takes:in              in   file   address ingest.positron.studio
  r2:takes:out             out  file   address archive.positron.studio

studio-1:circuit:in        in   midi   accepts note, cc   (exists, with its gate)
wall-x1:light              in   value  { channels: 3 }    (exists, demo/wall/index.html:69)
```

- **Pose is `value`, not `state`, on a link from one body to one thing.** It is a
  number vector at a declared rate, which is what `value` means in plan §3. 21
  channels is a shape, and `bay.mjs` compares shapes by value already
  (`:947-956`).
- **The live crowd is `state`, and it is a room.** Many bodies to many viewers,
  with the relay's echo as the order, is the bus plan §7 refuses to make a link
  out of. So the crowd room is one `state` port with `dir: 'both'` on each page,
  and the patchbay draws it as a room, not as N squared links.
- **A take is `file`.** Recording is a link into `r2:takes:in`, playing is a link
  out of `r2:takes:out`, and `bay.mjs:1042-1058` already routes any link with a
  store at either end through the `file` row. Nothing new in the model.
- **The loop clock is `clock`, carried as an anchor and never as ticks.** The
  Circuit sends MIDI clock at 48.75 messages a second whether anyone asked
  (MEASURED, `plan-patchbay.md` §3.4). Every page already agrees on time to ~3 ms
  through `peer.mjs`, so the clock a room needs is two numbers, `{ bpm, epoch }`,
  sent once and on change. Ticks over the relay would be 48.75 messages a second
  per listener for information that fits in one.
- **The scene is `state` with `schema: 'scene'`**: `{ seed, takes: [ids], loop,
  bpm }`. The seed is the room (`plan-xr.md` §0, four bytes), and the take list
  is who is in it.

**What stays outside the graph, unchanged from plan §7:** the XR session itself,
its frame loop, its reference space, its quit. The page samples the pose inside
the frame loop and the port publishes at the declared rate. A link may never ask
for a frame. That is the line between *the headset owns the frame loop* and
*the headset is a node*.

### 4.2 Four kinds of device, four roles

| device | role | what it runs | why |
| --- | --- | --- | --- |
| Quest 3 | **performer**: records takes, sees the room in VR or passthrough | `immersive-vr` or `immersive-ar`, 6DoF head and two grips | it is Dance Tonite's room-scale role exactly, MEASURED 89.8 to 90.0 fps |
| phone | **viewer on stage**: a window into the room that turns with the phone | 2D canvas, orientation after a press (iOS asks permission) | Cardboard in practice; `immersive-vr` on phones UNCONFIRMED, §8 |
| desktop | **audience and curator**: the bird's eye view, click a head to see from it; keeps and deletes takes | 2D canvas | Dance Tonite's no-headset role, plus the CMS |
| the Pi | **the sound and the clock**: the Circuit at its own ~122 bpm, Yoshimi | `rig/board/` as it is | already a node on `/patchbay/` |

### 4.3 Over time (asynchronous), the Dance Tonite half

```
Quest frame loop ── pose 72-90 Hz ──> take buffer ── on loop wrap ──> layer N
                                         │
                       decimate to 30 Hz, int16, one object
                                         │
                    quest:body:take ──> r2:takes:in   (ingest, format 'pose', 6 h)
                                         │
             take.add {room, id, url} on the room ──> workers/store keeps the list
                                         │
 any device: Play ──> fetch the list ──> fetch takes ──> draw all layers on the loop clock
```

- **Recorded against the loop clock, not the frame clock**, as Dance Tonite
  records against the audio. The frame index is `floor((now - epoch) % loop *
  rate)`, so a take recorded on a Quest at 72 Hz and one at 90 Hz land on the
  same beat.
- **The index is the room's history.** `workers/store` already joins a room as a
  peer and keeps 1,000 rows for 24 hours (`workers/store/src/index.js:40-42`),
  longer than ingest's 6 hour TTL, so the list never outlives the files it
  points at. `GET /room/<name>/history?type=take.add` is the room's cast. No new
  worker.
- **Nothing needs the relay during playback.** A viewer fetches files and plays
  them locally. That is why this half scales without any of §5.3's arithmetic.

### 4.4 At once (synchronous), many people in one room now

```
each Quest ── 15 to 30 Hz, binary, 21 int16 + header ──> room <name>-crowd ──> every page
each page draws others either NOW (interpolated, ~latency behind)
                          or ONE LOOP LATE (exactly on the beat, latency irrelevant)
```

- **One loop late is the recommendation for dancing**, and it is
  `plan-looper.md` §1's claim, *"a loop does not need a fast transport"*,
  applied to bodies. With an 8 second loop and a relay round trip of p50 36 ms
  (MEASURED), every remote body arrives with 7.9 seconds to spare and is drawn
  exactly where it was in the bar. You dance with the room as it was one loop
  ago, which is what a Dance Tonite layer already is.
- **Now, interpolated, is for presence**: waving at somebody, pointing. It is
  late by the relay path plus one frame interval, and it is honest about it.
- **A live body can be recorded by anyone in the room**, which makes the two
  halves one: a live room where any body may become a take. That is exactly the
  consent question of §6, so it is not allowed by default.

### 4.5 A hand drives sound and light

In the patchbay's level 2 text form (`bay.mjs:603`):

```
quest-ab12:body:hand-r -> wall-x1:light                     # value to value, 3 channels each: accepted today
quest-ab12:body:cc     -> studio-1:circuit:in { cc 1->74 }  # the page emits CC 1 from hand height, bay's cc op moves it
studio-1:circuit:audio -> quest-ab12:room:audio             # the sound back into the headset, a session
```

- **Light works with nothing new.** `/wall/` declares `value` with `channels: 3`
  (`demo/wall/index.html:69`) and takes `light.set` with a hex colour (`:79`).
  The headset page maps height, reach and twist to three channels and sends the
  same message `/partitur/` sends (`demo/partitur/index.html:310`).
- **The Circuit needs the page to be the converter.** `bay.mjs` refuses `value`
  to `midi` and refuses every transform on a non-MIDI link (`:899`, `:932`). So
  the headset page declares a `midi` out port that emits `cc`, exactly as
  `/partitur/`'s Ton lane declares `midi` emitting `note` (`:254`). A general
  "value to CC" converter is a node, which is what `plan-route-core.md` §4 says
  anything with state should be. Not needed for the first version.
- **Rate is the thing to watch.** A hand at 30 Hz is 30 CCs a second. That is 3
  per cent of a socket's budget and fine for the relay. `thin hz` exists in
  `demo/shell/route-core.mjs` and not in `bay.mjs`, so for now the page thins
  itself and only sends when the 7-bit value changes.
- **It is demonstrable, not playable.** The board's direct path for an input's
  sound was MEASURED at 214 ms in `/patchbay/` (`plan-universal-routing.md`
  §11 step 4), the Quest's own output adds 24 ms (MEASURED), and
  `plan-xr-room.md` §1 puts the line where playing reads as sluggish at ~100 ms.
  A dancer conducting a filter sweep over a bar is fine at 250 ms. A dancer
  playing notes with their hands is not, and the page should not pretend.

### 4.6 A timeline drives the room

`/partitur/` already sends `scene.recall` with a name when its playhead crosses
a mark (`demo/partitur/index.html:127-166`). A headset page in `studio-1` that
listens for it, and for `cue.set` on a captions port like `/wall/`'s, gets a
score that changes the room under the dancers: a new seed, a different set of
takes, a light. The headset applies a scene at the next loop boundary, never
mid-loop, so a recall cannot tear a layer in half. That is the scene recall
timing question `plan-universal-routing.md` §12 sidestepped, answered for this
case by the loop: a scene is a diff applied on the bar.

## 5. Numbers

### 5.1 A take

**COMPUTED, and on synthetic motion**: a smooth random walk per point inside a
4.8 m square, positions in millimetres and quaternions scaled to 32,767, both as
signed 16-bit integers. Real dancing compresses differently and nobody has
measured it. The script is not in the repository; it lived in the session
scratchpad.

21 numbers a frame at 2 bytes is **42 bytes a frame a layer.**

| rate | layers | frames | int16 raw | int16 gzip | frame-delta gzip | Dance Tonite NDJSON | its gzip |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 15 | 1 | 120 | 5,040 | 4,731 | 3,924 | 13,687 | 6,305 |
| 15 | 20 | 120 | 100,800 | 89,807 | 70,756 | 270,510 | 110,354 |
| **30** | **1** | **240** | **10,080** | 9,364 | 7,197 | 26,935 | 12,322 |
| 30 | 20 | 240 | 201,600 | 179,140 | 122,053 | 537,342 | 220,945 |
| 45 | 20 | 360 | 302,400 | 268,284 | 165,138 | 803,115 | 331,678 |
| 90 | 20 | 720 | 604,800 | 527,212 | 276,846 | 1,598,019 | 666,825 |

- **30 Hz is the proposal**: between Dance Tonite's two playback rates, and the
  rate at which `plan-xr-hands.md` §3.4 says hand data may well arrive anyway.
- ⚠️ **Dance Tonite's ×10,000 does not fit 16 bits for position**: 3.28 m is
  32,767 at that scale. Millimetres do, to ±32 m. So the positron format is not
  theirs byte for byte; it is their layout (`p3q4`, three points) in a binary
  container with a 4-byte magic so ingest can check it the way it checks WebM.
- **Delta coding is worth ~30 per cent** on this synthetic data and costs a loop
  of subtraction. It is the second version, not the first.

### 5.2 Takes per room, and what the headset has to draw

Dance Tonite drew **30 to 60 performances at once** (READ, case study). A room
here capped at **20 layers per person and 8 people** is 160 bodies, 480
instances of three primitives, and 160 x 21 int16 to interpolate a frame, which
is 6,720 numbers. That is trivial as arithmetic and **UNMEASURED as frame time on
an Adreno 740**; `/floor/` draws 298 instanced tiles at 60 fps in a desktop
browser (MEASURED, its own comment at `:40`), which says nothing about the Quest.
The first headset run of step 4 answers it.

### 5.3 Live poses through the relay

Limits READ from `workers/relay/src/index.js:77-82`: per SOCKET 1,000 msg/s,
2,000 burst, 8 MiB/s, 16 MiB burst; 128 sockets a room; nothing caps the room
as a whole. Cloudflare documents a **soft limit of 1,000 requests a second per
Durable Object**, and an incoming WebSocket message is a request (DOCUMENTED,
Durable Objects limits page). One message is one pose: 42 bytes plus a header,
call it 58 bytes binary.

| dancers | rate | into the room | out of the room, 40 sockets | per viewer |
| --- | --- | --- | --- | --- |
| 4 | 15 Hz | 60 msg/s | 2,400 sends/s | 3.5 KB/s, 28 kbit/s |
| 8 | 30 Hz | 240 msg/s | 9,600 sends/s | 13.9 KB/s, 111 kbit/s |
| 16 | 30 Hz | 480 msg/s | 19,200 sends/s | 27.8 KB/s, 223 kbit/s |
| 33 | 30 Hz | **990 msg/s, the soft limit** | 39,600 sends/s | 57 KB/s, 459 kbit/s |
| 66 | 15 Hz | 990 msg/s | 39,600 sends/s | 57 KB/s, 459 kbit/s |

All COMPUTED. Per socket, a dancer at 30 Hz uses 3 per cent of its message
budget, so that bucket never bites. What bites is the room: the soft limit on
the way in, and on the way out a send loop the relay runs for every accepted
message to every socket including the sender (`index.js:250-252`), which has
only ever been measured with one sender and 15 receivers.

**Billing, COMPUTED from the Durable Objects pricing page**: incoming messages
are billed at 20 to 1, outgoing are free. Eight dancers at 30 Hz for an hour is
864,000 messages, **43,200 billed requests**. Workers Free allows 100,000 a day;
Paid gives a million a month and then $0.15 a million. Which plan this account
is on was not checked for this document. Either way an evening of dancing is
pennies or nothing, and duration is near zero because the relay hibernates.

### 5.4 Storage in R2

R2 standard storage is **$0.015 a GB-month**, with 10 GB-month, a million Class A
and ten million Class B operations free each month, and no egress charge
(DOCUMENTED, R2 pricing page). A thousand single-layer takes at 30 Hz is about
10 MB. **Storage cost is zero to three decimal places.** The limits that bind
are ingest's own: **5 sessions an hour per address**, so a dancer who records
six takes in an hour is refused on the sixth, and a 6 hour TTL, so a room
empties itself overnight. The first is a real constraint for an evening and the
second is a feature (§6).

### 5.5 Latency, where it matters

| path | figure | tag |
| --- | --- | --- |
| clock agreement between two machines | ~3 ms | MEASURED, `demo/jam/index.html:52` |
| relay round trip | p50 36 ms | MEASURED, `plan-universal-routing.md` §5 |
| Quest audio out | 24 ms | MEASURED, `/earshot/` |
| board input sound to a browser, direct path | 214 ms | MEASURED, `/patchbay/` |
| Dance Tonite's animation to audio tolerance | 50 ms, 100 ms on Android | READ, `src/audio.js:54` |
| hand to Circuit to ear in the headset | ~250 ms and up | COMPUTED from the rows above, plus the Circuit, which is unmeasured |

## 6. Consent, privacy and moderation

**A take is a person's body.** Nair and others, USENIX Security 2023, identified
users among **55,541** from head and hand motion with **94.33 per cent accuracy
from 100 seconds and 73.20 per cent from 10 seconds** (DOCUMENTED, the paper's
own abstract). Three points, head and two hands, is exactly what a take holds.
A height is in it too. So a take is not anonymous because it has no name, and
a room of takes is a room of people who could be recognised by somebody holding
other recordings of them. On a public site this is not a licence footnote; it is
strangers' bodies, and CLAUDE.md's rules about what leaves this machine apply
to them before any rule about R&D does.

**The rules, as data on the port, so no page can forget them:**

1. **A take is recorded only by its dancer's own press**, in the session, with
   the arc that says it is recording. Never on load, never by the harness, never
   by `?selfcheck=1`, never by somebody else in a live room. The harness uses a
   committed **synthetic take**, which is nobody's body, the stand-in rule.
2. **A take expires in 6 hours by default.** Ingest already does it
   (`workers/ingest/worker.mjs:109`). Nothing new to build, and it means the
   failure mode of every mistake below is "gone by morning".
3. **The dancer can delete their own take at once.** Upload returns a delete
   secret kept in that browser; delete writes a tombstone, the pattern of
   `workers/selfrec/src/index.js:174`, so a late upload cannot resurrect it.
   Dance Tonite had no such thing (READ, §2.2).
4. **Only the owner can keep a take past 6 hours**, through ingest's token tier,
   which is the `keep` path that already exists. Keeping is curation, and it is
   Dance Tonite's rule: nothing reaches the public room without a person having
   watched it.
5. **What a public room shows is kept takes only.** An unkept take is visible
   only in the room its dancer chose, by link, for its 6 hours. The front page
   room never shows a stranger's unreviewed body.
6. **What is shown is three primitives.** No name, no country, no time of day.
   Ingest keeps a hash of the address for its caps; nothing else about the person
   is stored.
7. **Refused: normalising height** to make takes less identifying. It changes the
   dance, and it would be a privacy claim that the study above makes false.
8. **The EU jurisdiction pin is available** (`workers/instrument/src/index.js:66`)
   and should be used for the take index if takes are ever kept.

⚠️ **The legal status of motion data in the EU was not researched** and is not
settled here. The rules above do not depend on it.

## 7. Steps, easiest first

Each is one session. **Neither** means a laptop is enough.

| # | step | device | verified by |
| --- | --- | --- | --- |
| 1 | **The pose codec.** `demo/shell/pose.mjs`: `p3q4` frames to int16 and back, a 4-byte magic, decimation from any frame rate to 30 Hz with slerp, played at any time by interpolation. Pure, like `bay.mjs` | neither | `node demo/shell/pose-test.mjs`: round trip error under 1 mm and 0.01 rad, a 90 Hz and a 72 Hz recording of the same motion landing on the same frames, and one broken input refused, as a negative control |
| 2 | **A synthetic take and a viewer.** A committed take generated by script (nobody's body). A new page plays N copies against a `peer.mjs` clock with instancing; desktop sees the room from above and clicks a head to see from it; a phone gets a window that turns by drag. Opens nothing until Play | neither, a phone for feel | `node demo/check-html.mjs`, then `node demo/verify.mjs <slug>` asserting frames advance with the clock and the layer count; `node demo/shot.mjs <slug> 375 1280` |
| 3 | **Fix the stale `cap 60 msg/s`** in `bay.mjs` `TRANSPORTS` and `plan-universal-routing.md` §5 | neither | `node demo/shell/bay-test.mjs` |
| 4 | **Record in the headset.** The page enters a session, records head and both grips against the loop clock, wraps every 8 s into a new layer, shows your past layers around you, keeps it in memory | **Quest** | the device log: `BUILD` stamp, frames per layer against expected, fps held while drawing N layers (this answers §5.2), `node demo/shell/xr-quit-test.mjs` |
| 5 | **Takes to R2 and back.** Ingest learns `pose` (magic, `application/octet-stream`, no playlist), `take.add` on the room, `workers/store` records it, the viewer of step 2 lists and plays real takes, delete with a secret and a tombstone | neither for the harness with the synthetic take, **Quest** for a real one | a harness run against a stand-in room: upload, list, play, delete, then a 410 on the deleted id |
| 6 | **The headset on the patchbay.** The page announces its graph in `studio-1`; a hand's height, reach and twist to `/wall/`'s light | **Quest** and a laptop with `/wall/` open | `/patchbay/` shows the node; the wall's colour follows the hand; the link refused by bay is refused in words |
| 7 | **A hand to the Circuit.** A `midi` out port emitting CC through the board gate, thinned on change, mapped with bay's `cc` op | **Quest** and the Pi | the device log stamps the CC send, the board stamps its arrival, so the hop is a number rather than an impression |
| 8 | **Measure fan-out before inviting anyone.** Extend `demo/perf-wire.mjs` to N senders at 15 and 30 Hz into up to 128 sockets, against a throwaway room | neither | its own table: delivered against sent, p50 and p99, per N, and where it bends |
| 9 | **Live crowd.** Poses over `<room>-crowd`, others drawn one loop late or now, by a switch | **Quest**, ideally two headsets; a phone and a desktop as viewers | two devices, one loop: a remote body's beat 1 lands on the local beat 1 within the 3 ms clock |
| 10 | **`/partitur/` drives the room.** The headset page applies `scene.recall` and `cue.set` at the next loop boundary | **Quest** and a laptop | a recall mid-loop is logged as deferred, then applied on the boundary |
| 11 | **Curation.** A desktop list of a room's takes for the owner, keep or delete; the public room reads kept takes only | neither | harness: an unkept take is absent from the public list and present in its own room |
| 12 | **Cardboard, measured.** `navigator.xr.isSessionSupported('immersive-vr')` and orientation permission on the owner's Android phone and iPhone; only then a stereo view, if the answer is yes | **phone** | the readout of the two answers on each phone, read off the device log |

Shared work is done once, before any page agent starts: `pose.mjs` (step 1) and
the ingest format (step 5) are shared, the pages are not.

## 8. Refused, not settled, and what would settle it

### 8.1 Refused

- **The song, the band's name or the look on a page.** Positron uses its own
  sound (the Circuit, a looper, a recording of its own) and its own slug. Dance
  Tonite is credited in comments and here. A page that looks like theirs would
  be an imitation of somebody else's work.
- **Porting their code.** §2.3: the licence allows it and the stack makes it
  pointless.
- **Routing the session or its frame loop.** §4.1, and plan §7's reason stands.
- **MIDI clock over the relay.** 48.75 messages a second per listener to say what
  one anchor says.
- **Recording full hand joints by default.** 25 joints a hand is 350 numbers a
  frame instead of 21, about 17 times a take, and more identifying. A later,
  explicit option at most.
- **Controller or body meshes.** `plan-xr-hands.md` §9.2 rejected the glTF
  controller with numbers; three primitives are also what Dance Tonite proved
  carry a person.
- **Video of dancers.** A pose is 42 bytes a frame; a picture of the same body
  is a Stream minute billed per viewer.
- **A public room of strangers' unreviewed takes.** §6 rule 5.
- **128 live dancers.** §5.3: the room's soft limit is near 33 at 30 Hz, before
  fan-out is even measured.
- **A stereo Cardboard view built before step 12 measures what a phone offers.**

### 8.2 Not settled

| question | how to settle |
| --- | --- |
| Fan-out cost with many senders and up to 128 sockets | step 8, on a laptop, before any people |
| Frame time on the Quest with 160 bodies instanced | step 4's device log, fps against layer count |
| Whether one loop late feels like dancing together or like dancing with a recording | two people, two headsets, step 9. Nothing but people can answer it |
| How real dancing compresses, against §5.1's synthetic numbers | the first real takes of step 4 and 5, sizes logged |
| Whether 30 Hz looks smooth at 90 Hz display with interpolation | step 4, by eye, then 45 Hz if not; Dance Tonite played 45 on 6DoF |
| Whether WebXR hand tracking delivers 30 or 60 Hz on this Quest | `plan-xr-hands.md` §3.4's `joints N/N` fraction, already designed and not yet run |
| Whether phones offer `immersive-vr` today | step 12; the search results found are SEO pages and are not trusted |
| Ingest's 5 sessions an hour against an evening of takes | count takes in a real evening; raise per tier or bundle layers into one session |
| Which Workers plan the account is on | `npx wrangler whoami` and the dashboard; it changes §5.3's billing line only |
| EU law on motion data | not researched; §6's rules do not wait for it |
| Whether `tonite.dance` still runs | not fetched on purpose; it changes nothing here |
| Whether `adb` may be installed, so `verify-quest.mjs` can drive the headset | the owner's answer; this is a managed machine |

## 9. What this research cost

One shallow `git clone` of `puckey/dance-tonite` into the session scratchpad,
read and not run. Nine web fetches or searches. One compression script on
synthetic data, in the scratchpad. No external media server, no ERR, no Icecast,
no archive.org, no relay room, no deploy. External pages read:

- https://github.com/puckey/dance-tonite (and the clone of it)
- https://web.dev/case-studies/dance-tonite
- https://blog.google/products/google-ar-vr/dance-tonite-ever-changing-vr-collaboration-lcd-soundsystem-and-fans/
- https://puckey.studio/projects/dance-tonite
- https://experiments.withgoogle.com/shared-piano (via search results only)
- https://developers.cloudflare.com/durable-objects/platform/pricing/
- https://developers.cloudflare.com/durable-objects/platform/limits/
- https://developers.cloudflare.com/r2/pricing/
- https://www.usenix.org/conference/usenixsecurity23/presentation/nair-identification (via search results)
- Mozilla Hubs end of support, via search results (roadtovr.com, uploadvr.com, support.mozilla.org)
