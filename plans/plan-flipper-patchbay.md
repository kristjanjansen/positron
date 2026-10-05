# plan-flipper-patchbay: `/flipper/` as eight video channels, each on its own transport, described as bay links

> Asked 2026-10-05, verbatim, in `BACKLOG.md` under `## Open`: *"can you
> architect flipper to use onlu videos and use new pachbay architeture.
> different transports to each videopnel"*. Added the same day: *"play buttons
> start channel, add >> to catch up"*, then *"acually merge now and flipper"*.
> `/room/` was archived the same day (*"arvhice it"*) and is not an option here.
>
> **NOTHING HERE IS BUILT.** Written from reading `demo/flipper/index.html`,
> `demo/now/index.html`, `demo/shell/bay.mjs`, `demo/shell/graph-registry.mjs`,
> `demo/patchbay/index.html`, `demo/shell/live.mjs`, `demo/shell/moq.mjs`,
> `demo/shell/pattern.mjs`, `demo/shell/video-panel.mjs`,
> `demo/capture/farend.mjs`, `workers/station/worker.mjs`,
> `workers/pub/worker.mjs`, `workers/pub/container/server.mjs`,
> `workers/pub/wrangler.jsonc`, `demo/resources/mimproject*.json`, the plans
> named below, and the streaming, ui and verify skills. **No harness was run and
> no request was made to any server**, ours or anybody's. Every claim says
> **MEASURED** (a number somebody measured in this repo, with where it is
> written down), **COUNTED** (counted today, 2026-10-05, from files), or
> **READ** (read in source, a plan, or Cloudflare's docs as quoted here, not
> run).
>
> Read before designing: `plan-universal-routing.md`, `plan-route-core.md`,
> `plan-patchbay.md`, `plan-stage-patchbay.md` (shelved today; its F1 to F7 are
> about exactly the gaps this page would hit), `plan-routing-time.md` (lag per
> transport), `plan-cam-llhls.md`, `plan.md`. **None of them proposes this.**
> The nearest ancestor is the retired `09 ladder` (*"all three, one source, side
> by side"*, `plans/plan-demos.md:115-126`, removed 2026-09-08), whose only live
> reading turned out to be a candidate-pair RTT rather than a latency
> (PROGRESS.md:4834, 4727). `/cam/` is today's four-panel comparison, but of a
> camera, not of our own videos.

## 1. The verdict

**Do it, as eight equal cells, each one a CHANNEL of MIMproject films on a
shared wall-clock schedule, each one delivered by a different transport, each
one a bay link whose `session.transport` names that transport.** The page stops
touching ERR entirely, which is the strongest single reason to do it: CLAUDE.md
records that every connection this repo opens to an ERR mount lands in a public
broadcaster's audience figures, and today's `/flipper/` opens one per press,
and its probe sweep asks ERR's segment server up to eight times per channel
(READ, `demo/flipper/index.html` `PROBE_STEPS`).

**The comparison is honest only if the pictures are alike, so the eight
channels play one re-encoded set of films**, uploaded once to our own R2 next to
the corpus. Today the 26 corpus files run from 480x272 at 508 kbit/s to
1920x1080 at 4,452 kbit/s (COUNTED from `mimproject-measured.json` and
`mimproject-vimeo-measured.json`), so eight panels playing eight different
originals would compare bitrates, not transports.

**Six of the eight cost nobody anything but our own R2 and our own relay, and
run on a press with no publisher.** Two (Cloudflare Stream: WHEP and LL-HLS)
need a container publisher, bill Stream minutes, and are the owner's call
(§12). The plan is built so the page is complete at six and the two Stream cells
are drawn, described, and say what pressing them would cost, until the owner
says yes.

**`/now/` merges in as the page's deck**: an absolute wall-clock line whose
right end is the present, a schedule lane (now our films, not ERR's EPG), a
`seen` lane, scrub into the past, and `live`, which becomes each panel's `>>`.
`/now/` then retires with no redirect, and with it `demo/shell/err-live.mjs`
and `demo/fake-err.mjs` have no user left (COUNTED: `err-live.mjs` is imported
by `now` and `flipper` only; `fake-err.mjs` is started by `demo/verify.mjs:181`
for `ERR_PAGES = ['now', 'flipper']` only).

**Four bay changes come first** (§5): F1 and F2 from `plan-stage-patchbay.md`,
a transport PIN on a link (new, F8 here, because this page's whole point is to
choose a transport the chooser would not), and a reading row for a store (F9,
the gap stage-patchbay's §3.1 already named). F3 is needed only if the page
announces into the studio's room, which this plan does not do in the first cut.

## 2. Inventory: every video transport this repo can deliver and receive today

Columns: **who sends / who receives**, **source it needs**, **runs with no
publisher and nothing of anybody else's**, **cost per visit**, **latency
measured here**.

| # | transport | sends / receives (READ) | source | free and publisher-less? | cost per visit | latency, MEASURED unless marked |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **progressive MP4, `<video src>` with Range** | `workers/station/worker.mjs:25-45` serves `/media/<key>` from bucket `positron-station` with 206, `content-range`, CORS, `immutable`; `demo/making/index.html:488` plays it | a file in R2 | **yes**: our worker, our R2 | R2 Class B reads ($0.36 per million, READ), egress free; the visitor's bandwidth is the real cost | none measured for a first frame. A range GET on an 86 MB R2 object answered in **0.21 to 0.34 s** to first byte (research/station-one-source-2026-09.md:412) |
| 2 | **HLS VOD from R2, hls.js or native** | `demo/shell/archive.mjs:9-16` (`archive.positron.studio/shows/archive-test/index.m3u8`, 4 s segments), played by `demo/sync/after.mjs:96-110` | segments made OFFLINE by ffmpeg (`proto/archive/record-local.mjs:79-87`) and uploaded | **yes** | as row 1 | none for first frame; cues land within 250 ms of the picture (READ, `after.mjs:16-20`) |
| 3 | **LL-HLS from Cloudflare Stream** | `src/low-latency-player.js:225`; `/llhls/` holds `wss://pub.positron.studio/watch` | an RTMPS publisher: the `p1` container, which sends **testsrc2, not a film** today (`workers/pub/wrangler.jsonc:60` `PUB_SOURCE: "testsrc2"`) | **no** | container wake, Stream minutes delivered ($1 per 1,000, READ), and on RTMPS **recording cannot be turned off**, so storage minutes against the 1,000-minute account cap, which testing fills in about **4.4 days** at ~225 min/day (MEASURED, PROGRESS.md:4733-4736) | tuned 2.6 to 4.0 s, stock 8.4 to 16.3 s (plans/plan.md:110); `/cam/` glass to glass **5.3 to 7.9 s** with a **14.3 to 18.0 s** first frame (HANDOFF.md:809-811) |
| 4 | **WHEP from Cloudflare Stream** | `whepPlay` in `demo/shell/live.mjs:433`; `/stage/` subscribes to `STAGE_UID`, fed by the `stage` container stream-copying the MIM church film (`workers/pub/worker.mjs:593-604`) | a WHIP publisher: a container, or a browser through `/whip` | **no** | container wake: **3.7 s** warm-ish and **about 16 s** first after a deploy (MEASURED, plans/plan-stage-live.md:275) against "about 22 s" in `/stage/`'s comments (READ, never measured); Stream minutes billed **from 2026-10-15** (READ); one ICE credential per press of **120 an hour overall, 20 per address** (`worker.mjs:31-32`); a browser publish spends one of **`WHIP_PER_HOUR = 20`** and is refused with 409 while anybody holds `p1`'s `/watch` (`worker.mjs:426-431`) | glass to glass p50 **67.0** / p95 76.9 / p99 84.1 ms, n=17,501, burned pixels (PROGRESS.md:4712-4725) |
| 5 | **in-page RTCPeerConnection loopback** | `demo/capture/farend.mjs:86-93`: `pcOut` to `pcIn` in one page, host candidates only | a canvas `captureStream`, or anything drawn into it | **yes**, nothing leaves the machine | none | no latency figure exists (the old `/stage/` loopback was removed with none, BACKLOG.md:7997-8028). ⚠️ Under a VPN two in-tab peer connections never connected (same source); the owner says this machine has no VPN |
| 6 | **WebCodecs H.264 over our relay** | sender `rig/board/video.mjs` (the Pi), receivers `demo/mirror/index.html:1619-1642` and `demo/patchbay/index.html:613-650` (8-byte header: seq and key flag) | today **the Pi only**. A browser sender does not exist yet | our relay only, but needs the Pi online today | relay bytes: 8 MiB/s steady, 16 MiB burst, 1,000 msg/s, 128 sockets, 1000 KiB a message (READ, `workers/relay/src/index.js:77-82`) | Pi 29.6 fps at 1280x720; 2 and 4 Mbit/s arrive byte-identical, 8 Mbit/s silently lost 28% (plans/plan-visuals.md:942-947, taken under the OLD 60 msg/s cap). **No glass-to-glass number**: the header carries no time (plans/plan-routing-time.md:45) |
| 7 | **MoQ** | `demo/shell/moq.mjs:200` `startMoq({ role: 'loopback' })`, WebTransport and WebCodecs, to `https://draft-14.cloudflare.mediaoverquic.com` | the page's own canvas; no ffmpeg | no publisher, but **Cloudflare's public relay, not ours** | none billed to this account that anybody has found (READ) | glass to glass p50 **26.2** / p95 42.4 / p99 104.8 ms, n=2,740 (PROGRESS.md:4715-4723); `/moq/` p50 20.3 ms (PROGRESS.md:4693). **Safari unusable**: 6 to 8 frames in 150 s, WebKit 319818 (streaming skill) |
| 8 | **MediaRecorder to R2 through ingest, then `<video src>`** | `demo/shell/ingest.mjs` `putWhole` / `createShipper`; `workers/ingest/worker.mjs` | a recording of anything | **yes**, our worker | **5 sessions and 64 MiB per address per hour, 24 MiB per session**, 6 h TTL (`workers/ingest/worker.mjs:94-111`) | upload lag p50 483 / p95 636 ms (PROGRESS.md:5277-5285); a recording is minutes behind by design, so it is not a channel transport |
| 9 | **canvas `captureStream`** | `room` (archived), `cam:361`, `farend.mjs:85`, `roundtrip.mjs:191` | a canvas | in-page | none | a SOURCE for 4, 5 and 7, never a transport alone |
| 10 | **MSE / ManagedMediaSource used directly** | **no demo does it** (READ). Only `proto/selfrec/replay-masters.html:101-110` | fMP4 fragments by Range | would be **yes** | as row 1 | none |
| 11 | **HLS of somebody else's server (ERR)** | `demo/shell/err-live.mjs`, `now`, `flipper` | ERR | **no**, and the page this plan replaces | a listener in ERR's statistics per press | manifest edge 4.67 s, `hls.latency` 5.9 to 6.1 s (research/err-live-feeds-2026-08.md:40) |

What does NOT exist, READ: nothing in the cloud turns an R2 MP4 into HLS (the
station worker is audio-only and left for eccm on 2026-10-02); `r2-hls` in
`bay.mjs:98` is a label with no implementation; Stream will not serve a WHIP
input as HLS (plans/plan-cam-llhls.md:41); and the `p1` container cannot encode
the film live, because a film re-encode ran at **about 0.6x realtime** on it
(READ, `server.mjs:370-376`), which is why the stage leg stream-copies a
pre-transcoded `-whip.mp4`.

## 3. The channels and the films

**A channel is a playlist of films on a wall-clock schedule**, the same for
every visitor: `position = (Date.now() - EPOCH) mod total`, walked through the
playlist. That is what makes a file behave like television, what gives every
panel a "present" to fall behind, and what lets `/now/`'s deck carry over
unchanged in shape. The schedule is data in the page, not a fetch.

**One re-encode, done once, uploaded to our bucket** under
`media/mimproject/flip/`:

- 1280x720, 25 fps, H.264 main, **2 s GOP, closed, no B-frames** (the same
  rules LL-HLS and WHIP already impose, streaming skill), about **1.5 Mbit/s
  CBR**, AAC for the HLS and MP4 rows. One encode serves every row so the
  bitrate column compares transports, not files.
- two packagings of the SAME encode: a `+faststart` MP4 (rows 1 and the
  in-page encoders' decode source), and fMP4 with `-hls_flags single_file`, so
  one object plus a byterange playlist serves HLS and MSE alike.
- The `immutable` cache header on `/media/` means a replaced file needs a new
  name (READ, `build-mimproject.mjs:47-50`), so the names carry the encode
  profile.

Which films: **the owner's choice** (§12). A suggestion that keeps the upload
small: the 19 corpus rows under 6 minutes, 38.1 minutes in total
(COUNTED), split across eight channels so each loops a different film or two.
At 1.5 Mbit/s that is roughly **430 MB per packaging**, about **0.86 GB** both,
**about 1.3 cents a month** of R2 storage (READ price $0.015/GB-month).

⚠️ It is an ffmpeg run on the owner's laptop and a `wrangler r2 object put`.
This machine is managed and SIGKILLs locally compiled binaries (memory note), so
whether to run it here or on the M1 is the owner's to say. `src/publish.sh`
already pins Homebrew `ffmpeg@7`.

## 4. The panel set (the table the brief asked for)

Eight equal cells, one channel each, as today's grid. The three on the right of
the table are the owner's new asks: the play button, `>>`, and how lag is read
so `>>` is lit only when there is something to catch up.

**Nothing opens on load.** A visit draws eight black cells with their labels,
the schedule lane, and the links table. Each cell's **play button is the only
thing that starts it**, and is a person's gesture, which is also what unmutes it.

| cell | transport, `session.transport` | source node, link | runs when | what `>>` does | how lag is read (enables `>>`) | free? |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **MP4** progressive, `mp4` | `r2:flip:ch1 -> flip-x:cell1:video` | its play | seek to the schedule's now | `behind = scheduleNow - mediaTime` of the last presented frame (rVFC); lit above **1 s** | yes |
| 2 | **HLS** from R2, `hls` (hls.js, native on WebKit gated on ManagedMediaSource as today) | `r2:flip:ch2 -> flip-x:cell2:video` | its play | seek to the live edge of an in-page live window (below) | `behind` as cell 1; lit above **2 GOPs, 4 s** | yes |
| 3 | **MSE** direct, `mse` (the page appends fMP4 ranges itself, ManagedMediaSource on WebKit) | `r2:flip:ch3 -> flip-x:cell3:video` | its play | drop the buffer ahead, append from the fragment at the schedule's now | `behind` as cell 1; lit above **1 s** | yes |
| 4 | **WebRTC loopback**, `webrtc-loop` (farend's two peer connections) | `flip-x:src4:video -> flip-x:cell4:video` | its play | nothing to skip; lit only when the jitter buffer has grown, and then it sets the receiver's `jitterBufferTarget` to 0 (READ: a Chrome API, not used here before, to measure) | glass to glass from the hidden clock strip (§6); lit above **250 ms** | yes |
| 5 | **WebCodecs H.264 over our relay**, `relay-h264` (the Pi's wire format, a browser sender) | `flip-x:src5:video -> flip-x:cell5:video` | its play | drop queued chunks to the next keyframe and reset the decoder | `now - chunk.timestamp` at presentation, exact, no pixels; lit above **250 ms** | our relay only |
| 6 | **MoQ**, `moq` (loopback role) | `flip-x:src6:video -> flip-x:cell6:video` | its play; refused in words on Safari | skip to the newest group | glass to glass from the strip; lit above **250 ms** | Cloudflare's public relay, nothing billed |
| 7 | **WHEP** from Stream, `whep` | `stage-input:live:video -> flip-x:cell7:video` (option A) or `flip-x:src7:video -> cf:whip:video -> flip-x:cell7:video` (option B), §12 | its play, **only if the owner says yes** | as cell 4 | A: no clock in the film, so only `first` and RTT; B: the strip | **no**: Stream minutes, container or WHIP budget |
| 8 | **LL-HLS** from Stream, `llhls` | `cf:llhls:video -> flip-x:cell8:video` | its play, **only if the owner says yes** | `liveSyncPosition` seek, as `/now/`'s `live` does today | `behind = now - playingDate` (PDT); lit above **PART-HOLD-BACK plus 1 s** | **no**: container, Stream minutes, storage minutes on RTMPS |

Notes the table cannot hold:

- **Cells 1 to 3 are the file transports and cells 4 to 6 are the live ones.**
  For a file, "lag" is only *behind schedule*; there is no capture moment, so no
  glass to glass, and the readout says `file` rather than a number. For cells 4
  to 6 the page decodes the channel's MP4 from R2 into a canvas (the source
  node), and the transport carries that canvas. So every cell shows a MIM film,
  which is the ask, and cells 4 to 6 have a real capture moment to measure from.
- **Cell 2's live window is computed in the page.** hls.js is handed a sliding
  live playlist generated by a custom playlist loader from the schedule, whose
  segment URIs are byte ranges of the R2 object. No worker changes, nothing to
  deploy but the page, and hls.js's own live machinery (`liveSyncDuration`,
  `liveSyncPosition`) is exercised, which is what makes `>>` mean the same as it
  does on a real live stream. The cheaper alternative, a VOD playlist plus a
  seek, makes cell 2 the same experiment as cell 1 with more code. ⚠️ Native HLS
  on WebKit cannot take a custom loader, so on Safari cell 2 needs a real
  playlist URL: either a blob URL (READ: whether WebKit's native player accepts
  `blob:` playlists is NOT KNOWN here), or the VOD fallback with a seek. To
  measure on the first Safari run.
- **Cell 5 is the bay's `relay-h264` session with a browser at the far end**:
  the room is the session's address, the 8-byte header gains an 8-byte
  capture time (a compatible extension: the Pi's receivers read the first eight
  bytes and the Pi would send zeros), and the page holds two sockets in its own
  rendezvous room. At 1.5 Mbit/s it is about **2%** of one room's 8 MiB/s byte
  budget (arithmetic), and the relay echoes to every socket in the room, so a
  second watcher doubles egress, not the sender's cost.
- **Several cells may play at once, one is audible.** The old page's assert
  `exactly one channel audible` survives. Whether a phone should be allowed all
  six at once is §12: six cells at 1.5 Mbit/s is about **9 Mbit/s down**, plus
  1.5 up and 1.5 down for cell 5, and three encoders for cells 4 to 6.
- **Phone width**: the grid already reflows (`minmax(150px, 1fr)`); at 375 px
  that is two columns of four rows. A play button and `>>` fit a 150 px footer
  only as icons, which is `positron-ui`'s call to make at build time.

## 5. Each cell as a bay link, and the bay changes it needs

### 5.1 The graph, as bay's level 2 text

```
r2:flip:ch1            -> flip-ab12:cell1:video   # mp4, https range, our R2
r2:flip:ch2            -> flip-ab12:cell2:video   # hls, in-page live window over R2
r2:flip:ch3            -> flip-ab12:cell3:video   # mse, the page appends ranges
flip-ab12:src4:video   -> flip-ab12:cell4:video   # webrtc-loop, machine
flip-ab12:src5:video   -> flip-ab12:cell5:video   # relay-h264, address flip-ab12-cell5
flip-ab12:src6:video   -> flip-ab12:cell6:video   # moq, Cloudflare's relay
stage-input:live:video -> flip-ab12:cell7:video   # whep, owner's call
cf-llhls:live:video    -> flip-ab12:cell8:video   # llhls, owner's call
r2:flip:ch4            -> flip-ab12:src4:film     # the source's own read of its film
```

`flip-ab12` is the page's rendezvous (a fresh `flip-<rand4>` per tab, the rule
`plan-universal-routing.md` §8 keeps: *an address is fixed, a rendezvous never
is*). `r2:flip` is a `store` node with one `video` out port per channel, using
patchbay's working convention of carried-medium ports on stores (stage-patchbay
F4). `stage-input` and `cf-llhls` are `endpoint` nodes at fixed addresses.

### 5.2 What `bay.mjs` would do with that graph today, READ

- **Cells 4 to 6 get `page`.** Both ends share a place, so `whereOf` answers
  `machine` and `TRANSPORTS.video.machine` is `page`: *nothing crosses a wire*,
  which is exactly what this page exists to contradict.
- **Cells 1 to 3 get `ingest`.** `sessionFor` sends any link with a store end
  to the `file` row, and `file/machine` is `indexeddb`, `file/internet-one` is
  `ingest`, both WRITE paths. There is no row for READING one object.
- **Cell 7 would get `llhls` the moment a second screen links it** (F1, below).

### 5.3 The changes, in order

| id | change | where | why | size (estimate) |
| --- | --- | --- | --- | --- |
| **F1** (stage-patchbay) | a port may declare `transports: [...]`; `sessionFor` takes the first the port allows, or refuses in words | `bay.mjs`, `bay-test.mjs` | cell 7's input is WHIP-only and must never be offered LL-HLS; every cell port here declares exactly one | +30, +25 test |
| **F8** (new) | a link may PIN a transport: `link(from, to, [], { transport: 'moq' })`, validated against a `VIDEO_TRANSPORTS` catalogue (`mp4, hls, mse, page, webrtc-loop, datachannel, relay-h264, moq, whep, llhls`), each entry with the distances it can cross and what it costs; refused in words when it cannot cross that distance (`page` between two places) or the port does not allow it | `bay.mjs`, `bay-test.mjs` | the chooser picks the best transport for a distance; this page deliberately picks EVERY transport for one distance. Without a pin, the bay would describe six of eight cells wrongly | +50, +40 test |
| **F9** (new, stage-patchbay §3.1 named the gap) | a store's OUT port reads over `https` by default, not `ingest`; the `file` row splits into write and read | `bay.mjs` `sessionFor`, `bay-test.mjs` | cells 1 to 3, and `/stage/`'s archive playback if it is ever reworked | +15, +15 test |
| **cost** | the session carries `cost: { who, unit, per }` from the catalogue (`ours/r2`, `ours/relay`, `cloudflare/moq`, `stream/minutes`), as `plan-universal-routing.md` §6 asks (*"Cost on the link"*) | `bay.mjs` | the cost column of the readout is then data, not page prose | +15 |
| relay cap | `TRANSPORTS` still says 60 msg/s; the relay is 1,000 (already flagged, `plan-universal-routing.md` §12) | `bay.mjs` | the links table would print the stale number | 4 lines |
| **F2** (stage-patchbay) | `/patchbay/` dispatches heavy links on `session.transport`, not on medium | `demo/patchbay/index.html` `kindOf` | otherwise a video link from this page's graph, announced, would ask the Raspberry Pi for `video.start` | +20 there |
| **F3** (stage-patchbay) | registry keyed by `from + site` | `graph-registry.mjs` | ONLY if the page announces (§12): one tab would announce its rendezvous and the fixed `stage-input` | +10, +20 test |

**The openers belong in ONE new shared module, `demo/shell/video-open.mjs`**,
not in the page: `openVideo(session, { panel, source, log })` dispatching on
`session.transport`, each opener answering `{ close(), stats(), lag(),
catchUp(), firstFrameMs }`. Two users from day one: `/flipper/` for all eight,
and `/patchbay/`'s existing Pi opener moved into it as the `relay-h264` case
with a `lease` (the Pi's `video.start` and `video.watching`), which is F2 done
properly rather than with a second `if`. The file openers are small (MP4 is
twenty lines); the MSE appender, the in-page HLS window and the browser
`relay-h264` sender are the new code (§9).

**Not changed**: `graph-registry.mjs` (unless announcing), `route-core.mjs`,
the light plane, consent (`external` nodes keep their consent gate; nothing here
is `external` any more, which is the point).

## 6. Readouts, and how to measure each honestly

Per cell, in the panel footer (`createPanelValues`, left slot), at most four
values so a 150 px cell can hold them, and the rest in a page-level comparison
table that is the readout's real home:

| value | how, gated on outcome | cells |
| --- | --- | --- |
| **first** ms | press to the first PRESENTED frame, from `requestVideoFrameCallback` (cells 1 to 4, 7, 8) or the first `VideoFrame` drawn (5, 6). Never `play()` resolving, never `readyState`: the old page learned that a fragment event and a decoded-frame count are the only things that cannot be true of a server that is not there (`flipper/index.html`, *"EVIDENCE THAT A BROADCASTER ANSWERED"*) | all |
| **behind** s | `scheduleNow - mediaTime` of the presented frame. For cells 4 to 6 the source's own schedule position is stamped with the capture time, so behind = source's behind plus transport lag | all |
| **lag** ms (glass to glass) | cells 4, 6 and 7B: a burned clock in a **strip under the picture that the visitor never sees** (below). Cell 5: the capture time carried in the chunk header, exact on one clock. Cells 1 to 3: the word `file`, because there is no capture moment. Cell 7A: `RTT` with the word `rtt` beside it, never next to a glass-to-glass number without the label (the streaming skill's *candidate-pair RTT is not media latency*) | 4, 5, 6, 7 |
| **kbit/s** | bytes that ARRIVED over the last 5 s: hls.js `FRAG_LOADED` stats (2), the page's own `fetch` byte count (3), `getStats` inbound-rtp `bytesReceived` (4, 7), socket bytes (5), MoQ group bytes (6). Cell 1 has no honest byte counter for a `<video src>`: Resource Timing reports a media range only when it completes. It says `n/a` rather than a guess, or cell 1 fetches its own ranges into a blob, which would make it MSE | 2 to 8 |
| **dropped** | `getVideoPlaybackQuality()` dropped of total for elements; for canvas cells, frames that arrived and were not drawn before the next | all |
| **cost** | from `session.cost` (§5.3): `our R2`, `our relay, 2% of a room`, `Cloudflare's relay`, `Stream, about $0.001 a minute from 2026-10-15` | all, in the table |

**The clock strip, which is the one design question in this section.** The
owner removed the burned clock from the film on 2026-09-25 (*"rm burn overlay.
not needed for messages sync, right"*, READ in `server.mjs:66`), so it must not
come back ON the picture. The proposal: the source canvas for cells 4, 6 and 7B
is **1280x816**, the film in the top 720 and `pattern.mjs`'s 56-block row in a
96 px strip under it, and each receiving cell crops the strip off with CSS. The
reader needs one new argument (`readBurned(ctx, { y })`), because today's row
sits at a fixed `ROW.Y` inside a 1280x720 frame (READ, `pattern.mjs:57-64`), and
`readBurnedFrom` normalises only same-shape frames. Cost: 13% more pixels to
encode. Because all three are on ONE machine and one clock, the number is exact
to a frame, which is the property that made MoQ's 26.2 against WHEP's 67.0 the
only fair pair this repo has (PROGRESS.md:4715-4723). ⚠️ Cloudflare ramps WHEP
resolution, 640x360 to 1280x720 over the first half minute (READ,
`pattern.mjs:470-474`), so the strip must be read width-normalised. **Whether a
strip the visitor never sees is acceptable is the owner's** (§12). Without it,
cells 4 and 6 fall back to rVFC `captureTime` (READ: Chrome reports it for
WebRTC frames, `/cam/` uses it for its local preview; never measured on a
loopback here) and cell 6 to whatever timestamp `moq.mjs` carries.

## 7. `>>` and the play buttons, as checks

- **The play button is the only start.** Under `?selfcheck=1` the harness
  presses it on the cells its tier allows (§8), exactly as `/stage/`'s
  `Start WebRTC` is pressed, so the visitor's gesture and the graded path are
  one path.
- **`>>` is lit by the lag rule in §4's table and by nothing else**, so a cell
  that is at its edge shows it disabled. The check, per cell the tier presses:
  1. play, wait for the first presented frame;
  2. **make it fall behind on purpose**: seek the deck back 60 s (cells 1 to 3,
     8) or pause the receiver 3 s and resume (4 to 6), and assert `>>` became
     lit, with the lag that lit it;
  3. press `>>`, and assert **lag after < lag before by at least 80%** and below
     the cell's threshold, with BOTH numbers in the detail;
  4. **negative control**: on a cell at its edge, `>>` is disabled, and a
     forced press changes lag by less than its threshold. Without this, a `>>`
     that seeks to a fixed point passes step 3 by luck.

  That is `positron-verify`'s *gate feedback on outcome*: the assert reads the
  lag the picture shows after the press, never that the handler ran.

## 8. Harness plan

**Stand-in: `demo/fake-flip.mjs`, NEW, replaces `fake-err.mjs`.** The ordinary
tier must not pull 430 MB of films from R2 on every run, and "it is our own server"
is not the test: the rule is economical runs. The stand-in builds, once, into a
temporary directory renamed into place (`positron-verify`'s stand-in rules), a
short encode with the SAME profile as §3 (a 20 s clip of `testsrc2` with two
tones, so a level can be read) in both packagings, and serves it locally with
Range and CORS. The page takes `?media=<base>` the way `err-live.mjs` took
`?base=`. Its 404 says what it does not have, it refuses a short pool, and it
answers HEAD. ⚠️ It must not be more generous than R2: same `content-range`,
same exposed headers, same cache headers.

| tier | what it does | cost |
| --- | --- | --- |
| a visit | nothing opens; a fetch spy asserts **no media request and no socket on load** (the `filmAsks()` shape from `/stage/`) | 0 |
| **ordinary**, `selfcheck=1` | grid shape; every link validates and carries its pinned transport; negative controls in the bay (§5); then PRESSES cells 1 to 5 against `fake-flip.mjs` and our relay, asserts first frame, bytes that arrived, one audible, and the `>>` drill on two of them (one file, one live: cells 2 and 5) | our relay only, a few seconds of messages |
| **deep**, `selfcheck=2` | the `>>` drill on all of cells 1 to 5; cell 6 (MoQ, Cloudflare's relay); cells 7 and 8 **only if the owner has said yes**, and then once per run, never in a loop | Cloudflare's relay; a container wake and a minute of Stream per Stream cell |

**Asserts that survive from today's page** (COUNTED: 9 `d.assert(` call sites, three of them
deep-only; the last recorded suite read 18/18, READ from PROGRESS.md):
`eight equal cells`, `every cell the same width`, `exactly one channel audible`,
`no channel but the selected one is loaded` becomes **`no cell loads before its
own play`**, and `the selected channel received picture, not just an object`
becomes per cell. **What goes**: all three refusal-survey asserts (ERR's rights
walls do not exist on our files), `a channel is selected` (no selection any
more).

**Asserts that survive from `/now/`** (READ, `demo/now/index.html:753-869`):
the deck asserts carry over almost word for word, because the deck is the same
object: `the line is positioned in the present, not at zero`, `the position
domain is absolute wall milliseconds`, `the axis reads as a clock`, `the window
keeps its identity while both ends move`, `a back-seek moves the line at once`,
`a frame from the asked-for instant was actually shown`, `returning to live
restores the gap` (now per cell, as the `>>` drill), `the programme spans are
contiguous and named` (now from our schedule). **What goes**: the PDT-from-ERR,
probe-cap, refusal-run and two-hour-window asserts.

**New asserts** (ordinary unless marked): the eight links each validate with
their own `session.transport`, and **eight distinct transports** among them; a
`page` transport pinned between two places is refused with its reason (F8's
negative control); cell 7's port refuses `llhls` (F1's); the schedule puts every
visitor at the same film and second for the same `Date.now()` (a pure function,
graded with two fixed times); per pressed cell, first frame, arrived bytes, and
`>>` before and after; deep: glass to glass read off the strip on cells 4 and 6,
clean checksum on at least 90% of reads.

**`fake-err.mjs` and `err-live.mjs`**: no user left once `/now/` retires and
`/flipper/` stops touching ERR. Both move to `archive/` with a line in their
headers saying why, and the `ERR_PAGES` block in `demo/verify.mjs:181-210`
goes with them. ⚠️ The ERR measurements in their comments (the rights walls by
programme, the 403 with no CORS) are the streaming skill's already, so nothing
is lost by archiving the code.

**Verify economically**: `node demo/check-html.mjs demo/flipper/index.html`
first, then `node demo/verify.mjs flipper` once per step, then `patchbay` once
after F2. Pure modules: `node demo/shell/bay-test.mjs` and a new
`video-open-test.mjs` for the schedule and lag arithmetic. ONE deep run at the
end.

## 9. What `/now/` gives the merged page, and what goes

**Survives, as the deck under the grid**: `createDeck` with an ABSOLUTE range
that moves once a second, `createTransportBar(..., { absolute: true })` with the
clock-and-behind readout, `createStripView` following the present, the `seen`
lane (stretches actually watched, per selected cell), and a schedule lane drawn
from §3's playlists instead of ERR's EPG. The deck follows **the selected cell**,
as today's `/flipper/` deck does; selecting is tapping a cell's picture, playing
is its button. `live` on the bar is the selected cell's `>>`. Scrub moves the
selected cell's channel into the past: for files a seek, for cells 4 to 6 a seek
of the source canvas, which the transport then carries.

**Goes**: everything about ERR (the playlist reader, the two-byte probe sweep,
the rights-wall handler, the programme fetch), the 7-second paragraph in its
`what`, and the single-channel framing.

**`/now/` retires with no redirect**, the owner's usual way: the directory
moves to `archive/demos/now-index.html`, the manifest row goes, and the
`positron-history` skill gets the line saying where it went and into what. The
merged page's `what` and `one` are rewritten whole, one sentence each, for
example `one`: *"eight channels of MIMproject films, each reaching its cell by a
different transport"*, and the tags become `MP4, HLS, MSE, WebRTC, WebCodecs,
MoQ` (plus `WHEP, LL-HLS` if §12 says yes). ⚠️ `timeline/` and `demo/time/` are
being edited by other agents today; the deck work waits for those to land.

## 10. Order of work, shared first

Steps 1 to 3 are shared and done by ONE agent before the page, as CLAUDE.md
requires. Agents do not commit.

| step | files | what | agent time (estimate) |
| --- | --- | --- | --- |
| 0 | the owner's machine | the §3 re-encode and upload, once | 30 min of ffmpeg and upload, the owner's call where |
| 1 | `demo/shell/bay.mjs`, `bay-test.mjs` | F1, F8, F9, cost, the relay cap; negative controls for each | 2 h |
| 2 | `demo/shell/pattern.mjs` | `readBurned(ctx, { y })` and a strip-aware `readBurnedFrom`, graded against today's 600/600 burn-and-read loop so nothing existing moves | 45 min |
| 3 | NEW `demo/shell/video-open.mjs`, `video-open-test.mjs` | the eight openers, the schedule, lag and catch-up per transport; the Pi opener moved in from `/patchbay/` | 4 to 5 h |
| 4 | `demo/patchbay/index.html` | F2: dispatch on `session.transport` through `video-open.mjs`; its own asserts read once before and after | 1 h |
| 5 | NEW `demo/fake-flip.mjs`; `demo/verify.mjs` | the stand-in and its hook; the `ERR_PAGES` block out | 1.5 h |
| 6 | `demo/flipper/index.html` | the page: eight cells, play and `>>` per cell, the deck from `/now/`, the links table, readouts, checks | 4 to 5 h |
| 7 | `demo/manifest.mjs`, `archive/` | `/now/`, `err-live.mjs`, `fake-err.mjs` archived; the row's `one` and tags; `positron-history` line | 30 min |
| 8 | | ONE deep run, deploy, build stamp, URL | 30 min |

**About 14 to 17 agent hours**, one session with a parallel split after step 3
(patchbay and flipper are independent once the module exists). Money: **zero**
for six cells beyond R2's free egress and pennies of storage; a person's press
on cell 7 or 8, if enabled, is a container wake and Stream minutes at about
$0.001 a minute from 2026-10-15 (READ), and on cell 8 also storage minutes
against the 1,000 cap.

Finished means deployed with the build stamp quoted, and the thing to check is
`https://positron.studio/flipper/`: eight black cells on load, nothing in the
network panel, and each play button starting a MIM film with its own transport
named under it.

## 11. Risks, in the order they would bite

- **Three in-page encoders at once on a phone** (cells 4 to 6 each encode the
  film). Unmeasured. If a phone stalls, the page limits concurrent live cells
  rather than dropping a transport.
- **The in-page HLS window on WebKit** (cell 2): native HLS cannot use a custom
  loader, and whether WebKit accepts a `blob:` playlist is not known here.
- **Cell 5's header extension** touches the Pi's wire format. It is additive
  (receivers read the first eight bytes), but `/mirror/` and `/patchbay/` decode
  it today and must be re-read after.
- **MoQ's relay is Cloudflare's preview service**, not ours and not under any
  agreement; it could change or go away. The cell then says so, as `/moq/` does.
- **`timeline/` is moving under other agents today**, and the deck is built on
  it.
- **A green ordinary tier with three cells it never pressed** (6 to 8). The
  log must say `left for the deep run: ...` for each, and the assert count is
  the evidence, per `positron-verify`.
- **The relay figures in `video.mjs`, `board.mjs` and `mirror` are stale** (60
  msg/s, 512 KiB/s) and a reader of cell 5's budget will meet them.

## 12. What only the owner can decide

| question | why it is the owner's | what this plan assumes until told |
| --- | --- | --- |
| 1. Which films, and are they re-encoded into one profile? | content choice, and an upload of about 0.86 GB to the bucket | yes, the 19 short corpus rows, one profile (§3) |
| 2. Do cells 7 (WHEP) and 8 (LL-HLS) exist as playable cells? | they cost Stream minutes per press from 2026-10-15; cell 8 also storage minutes on RTMPS against the 1,000 cap that fills in about 4.4 days of testing; both need a container | drawn and described, play disabled with the cost in words. Page complete at six |
| 3. If cell 7 plays, option A (subscribe to `/stage/`'s film container, real film, no clock, shares the publisher with `/stage/`) or B (this page WHIPs its own film canvas and WHEPs it back, one of 20 an hour, 409 while anybody holds `p1`, exact glass to glass)? | cost and coupling to another page | A, because it adds no new publisher, and says `rtt` not `lag` |
| 4. If cell 8 plays, what feeds it? `p1` sends testsrc2 today (`wrangler.jsonc:60`), and the container cannot encode the film live (0.6x realtime) | a pre-transcoded RTMPS copy plus a stream-copy leg, or a Stream VOD upload, both new provisioning | unanswered; the cell stays described |
| 5. A clock strip the visitor never sees, under the picture, cropped off? | the burned clock was removed from the film at your request on 2026-09-25 | yes, because it is the only exact glass to glass on one clock |
| 6. All cells at once, or one at a time on a phone? | about 9 Mbit/s down and three encoders for six cells | all at once on a desktop, at most two live cells on a phone |
| 7. Does the page announce into `studio-1` so `/patchbay/` draws it? | a stranger's tab becomes a node on your desk, stage-patchbay's question 1 | no in the first cut; the links table on the page shows the graph |
| 8. A peer-to-peer leg between two machines? | `/room/` was archived today, so it would have to be rebuilt | not proposed |
