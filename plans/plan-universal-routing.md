# plan-universal-routing: one model for audio, video, control, renderers, scenes and storage

> Asked 2026-10-03, verbatim in `BACKLOG.md`: *"Think about a more universal
> routing. When I can ask, okay, I want this, this video there, this WebGL
> renderer there, this scene there, in all those different routings, what we
> have done in Positron so far. Is there a way to abstract those audio, audio,
> video, and all different kind of messaging, routing, including storage? ...
> Maybe not the whole thing, but the ones are more easier to adopt to this
> universal routing model."*
>
> **NOTHING HERE IS BUILT OR MEASURED.** It rests on an inventory of every
> routing in this repository, read the same day by an agent (file and line for
> each, nothing run, no external connection) and spot-checked by hand. It
> extends `plans/plan-patchbay.md` (2026-09-21), whose model is built as
> `demo/shell/bay.mjs`, and sits above `plans/plan-route-core.md`.
>
> **TIME ACROSS THE TWO PLANES IS `plans/plan-routing-time.md`** (2026-10-04):
> how a cue, a light or a note lands on the right frame or beat of a heavy link,
> live and in a recording, on every transport here. A light event carries
> `due` on the peer clock, a session gains `timebase`, a light link gains
> `{ ahead }` and `{ follow }`. Its step 1 is built as `demo/shell/timebase.mjs`.

## 1. The verdict

**Yes, for most of it, and the way to do it is to route descriptions, not
bytes.** One graph (Node, Port, Link) names everything positron moves. Light
media, meaning MIDI, clock, control values and small state, travel through the
graph itself on `plan-route-core`. Heavy media, meaning audio, video and
rendered frames, never touch the router: a link resolves to a **session**,
`{ transport, address, shape }`, and the two ends open it themselves. Storage is
a node with an in port (record) and an out port (play).

The surprise from the inventory is how much of this already exists under other
names. Almost every live flow here is already *a named place, a source that
announces itself, a request that starts a flow, and a lease or a socket close
that stops it*. That is a link with a lifetime. What is missing is one
vocabulary and one registry, not a new transport.

**And positron's measurements turn out to be the most valuable part.** Every
latency, loss and cap measured here since August is a row in the table that
chooses a transport for a link (§5). Nobody else has that table for these
transports.

## 2. What positron routes today, grouped

Condensed from the inventory; every row has a file and line in it.

| medium | from, to | transport today | where |
| --- | --- | --- | --- |
| control (notes, CCs, params) | page or phone to the Pi | relay room, Durable Object per `idFromName(room)` | `workers/relay/src/index.js:284`, `rig/board/board.mjs:735` |
| control | page to the Pi, near | WebRTC data channel `ctl` | `rig/board/rtc.mjs`, `demo/shell/board.mjs:636` |
| control | hardware to page | WebMIDI | `demo/shell/midi.mjs` (circuit, evo, nola, wish, shape and more) |
| control | port to port on the Pi | ALSA `aconnect`, as `patch.plan` / `patch.apply` | `rig/board/alsa.mjs` |
| audio | Pi capture to page | relay binary PCM, 48 kHz, 20 ms, 12 byte header | `demo/shell/board.mjs`, `rig/board/inputs.mjs:229` |
| audio | Pi capture to page, near | data channel `pcm`, unordered | `rig/board/rtc.mjs` |
| audio | stations to page | Icecast through `shout.positron.studio` | `workers/shout/worker.mjs` |
| video | Pi GPU shader to page | H.264 on room `<room>-video` | `rig/board/board.mjs:260` |
| video | live input to many pages | WHEP, LL-HLS | `demo/shell/live.mjs`, `workers/pub/worker.mjs` |
| video | camera to live input | WHIP, MediaRecorder chunks | `workers/pub/worker.mjs` |
| video and audio | page to page | MoQ draft-14 through Cloudflare | `demo/shell/moq.mjs` |
| program (code) | page to the Pi's GPU | `video.shader` message | `demo/mirror/index.html:474` |
| state | page to its peers | relay room as a bus (cues, jam, room, stage control) | each page's `ROOM` |
| storage, sink | page to R2 | `ingest.positron.studio` | `workers/ingest/worker.mjs:331` |
| storage, sink | room to SQL | `workers/store` joins the room as a peer | `workers/store/src/index.js` |
| storage, source | R2 to page | HLS plus a cue log | `demo/shell/archive.mjs:10` |

## 3. The model

Extending plan-patchbay §2.1, which `bay.mjs` implements for `midi`, `audio`
and `clock` (`MEDIA` at `bay.mjs:28`):

```js
Node  { id, site, kind, label, owner, seenAt }
Port  { id, node, dir, medium, shape, accepts }
Link  { id, from, to, transforms, session, lease }
Scene { id, label, links }            // plan-patchbay called it Patch
```

### The media

| medium | shape | carried by |
| --- | --- | --- |
| `midi` | protocol, channels | the router (plan-route-core) |
| `clock` | bpm source, ppqn | the router, one source per site |
| `value` | range, rate | the router: a gesture, an envelope, a tilt, a fader |
| `state` | a schema name | a room, as a bus (§7) |
| `audio` | rate, channels, frameMs, format | a session |
| `video` | w, h, fps, codec | a session |
| `program` | language: glsl, faust, sclang, csound score, a scene description | a message: code is small and arrives whole |
| `file` | container, chunking | a session to or from a store |

**`program` is the new idea and positron already uses it four times**: a shader
sent to the Pi's GPU (`/mirror/`), Faust compiled in `/fau/`, sclang in
`/collide/`, a Csound score in `/und/`. A renderer or an engine is then simply a
node with a `program` in port, `value` in ports for its knobs, and an `audio` or
`video` out port. *"This WebGL renderer there"* is a link from a program to a
renderer node and a link from its video out to a screen.

### The node kinds

| kind | examples here | ports |
| --- | --- | --- |
| device | the Circuit, the MK-425C | midi in and out, audio out |
| engine | Yoshimi, scsynth in `/collide/`, Faust in `/fau/`, a GPU shader | program in, value in, audio or video out |
| endpoint | a Cloudflare Stream live input, a MoQ track | video or audio out (or in), FIXED: made out of band |
| store | R2, the store Durable Object, IndexedDB | file or state in (record), file or state out (play) |
| external | ERR, an Icecast mount, archive.org | audio out, with consent on the SOURCE (§6) |
| screen | a page, a projector page, a headset | video and audio in |
| person | a phone with a microphone, a camera | value out, and authoring (plan-route-core §8) |

## 4. Two planes, and what a link means on each

**Light media: the link carries the bytes.** The router of plan-route-core runs
on whichever site holds the source, and a link is a table row.

**Heavy media: the link is a negotiation.** Making it produces a session record:

```js
session: { transport: 'datachannel', address: 'studio-1-circuit', shape: { rate: 48000, channels: 2, frameMs: 10 } }
```

and each end opens that session with code it already has. The router never
copies a frame, which is plan-patchbay §3.1's rule (*"a patch bay that moves
everything is a mixer"*) carried to video.

**A link is a lease.** The inventory found the same lifecycle everywhere:
`input.want` starts a Pi input, `video.start` starts the shader video,
`audio.start` picks a board source, and **a socket close ends a broadcast**.
Making a link sends the start; deleting it, or its holder going away, ends it.
Nothing new is invented; the existing verbs become what a link does.

## 5. The transport chooser is positron's measurements in one table

For a heavy link, the session's transport is chosen from where the two ends
are and how many receive. Every number below was measured in this repository
(sources in `plans/plan-hardware.md`, `plans/plan-away-webrtc.md`, CLAUDE.md
and the streaming skill); the table itself is the new part.

| medium | same machine | same network | internet, one receiver | internet, many receivers |
| --- | --- | --- | --- | --- |
| audio | WebAudio, Core Audio | data channel PCM, board round trip **4 ms** | relay PCM, round trip p50 **36 ms**, cap **60 msg/s** (stay at 50) | MoQ, or LL-HLS |
| video | the page itself | data channel, TO MEASURE | WHEP, or relay H.264 for the Pi GPU | LL-HLS |
| file | IndexedDB | R2 through ingest | R2 through ingest | R2 plus HLS |

The chooser also knows the traps the measurements found: the relay drops
silently above its token bucket (so `thin` and batching); a VPN passes the WHEP
handshake and drops the media (so a WebRTC session reports frames, not status);
a 960-sample frame is ambiguous (so shape is declared and checked).

## 6. Consent, ownership and cost, extended to every medium

- **`accepts` at the destination**, from plan-patchbay §6, unchanged.
  Corrected 2026-10-03 for the Circuit: SysEx is a `confirm`, not a refusal
  (plan-route-core §6).
- **Consent on the source, new.** A link from an `external` node opens somebody
  else's server, so it may be made only by a person who will listen, never on a
  page load, never under the harness, never by `?selfcheck=1` (CLAUDE.md: ERR's
  listener statistics). This is a property of the node, so no page can forget it.
- **Owner on a node in another building.** `fxAsked { by, at }` on the Pi
  already records who asked for an insert. Every board port gets `owner` and
  `heldBy`, so a link that would take sound away from somebody says so first
  (plan-patchbay §6's open question).
- **Cost on the link.** Messages a second against the relay budget, bytes
  against R2, minutes against Stream. The validator prints it before the link
  exists.

## 7. What not to abstract, and why

| thing | why it stays as it is |
| --- | --- |
| peer state rooms (cues, jam, room, stage control) | many to many with the relay's echo as the order. That is a bus, not a link. Model it, at most, as one `state` port with `dir: 'both'` |
| creating Cloudflare live inputs and containers | provisioned out of band, with their own reference counts in `pub`. A link can point at one, never make one |
| XR sessions | the headset owns the frame loop |
| the relay itself | it is the medium many sessions ride on, not a node |

## 8. Addressing

The inventory found the schemes already in use and one rule worth keeping:

- **An address is fixed, a rendezvous never is** (`demo/stage/index.html:93`).
  `studio-1` and `m1-1` are addresses; `stage-<rand6>` is a rendezvous.
- **Node ids are `site:node:port`** (`bay.mjs`, `demo/wish/index.html:565`), with
  `BOARD_ID` minted once at install as the Pi's site id (`rig/board/board.mjs`).
- **A session's address is derived from the link**, the way the Pi already derives
  `<room>-video` and `<room>-<input>`: one port, one room.
- **Storage keys are sessions, not ports**: `demo/ingest/<session>/segNNNNN`,
  and a recording becomes a new `store` out port whose id is its prefix.

## 9. What *"this video there"* would look like

```
cam:phone/video        -> stage:screen/video                 # session: WHIP then WHEP
mirror:program         -> studio-1:gpu/program               # a shader, one message
studio-1:gpu/video     -> projector:screen/video             # session: relay H.264
studio-1:circuit/audio -> r2:recordings/file  { record }      # session: ingest
r2:recordings/file     -> replay:screen/video { from 21:00 }  # session: HLS
evo:out                -> studio-1:circuit/in { chan 1 }      # the router, a table row
```

Every line is plan-patchbay's level 2 text form, which `bay.mjs:603` already
parses for MIDI. Voice, a matrix, learn by demonstration and typed text all
produce these lines (plan-route-core §8).

## 10. The easiest first, ranked

Ranked by how much already exists and how little has to change.

1. **Local WebMIDI to WebMIDI through `bay.mjs`.** Built, graded, used by
   `/wish/`. The gap is a page that runs it live.
2. **The Pi's ALSA patch as bay links.** Same medium, a plan and apply split
   already (`alsa.mjs`). Only the class names differ (`CARRY` against `CLASSES`,
   plan-route-core §1).
3. **Page MIDI to the Pi** over the relay or `ctl`. `midiVerdict` in
   `inputs.mjs` already is the destination's `accepts`.
4. **The Pi's audio and video inputs as brokered out ports.** `input.want` and
   `video.start` become "a link was made", the lease is the link's life, and the
   shapes (`audioChannels`, `frameMs`, `videoShape()`) are already declared on
   the wire.
5. **Storage as a sink**: record is a link to R2 or the store object.
   `workers/store` already joins a room as an ordinary peer, which is exactly how
   a sink should look.

Then: `program` as a medium (`video.shader` is already a one-message link),
then WHEP, MoQ and LL-HLS endpoints as fixed source nodes, and peer state buses
last or never.

## 11. Steps

1. **One class vocabulary** (plan-route-core step 0).
2. **`bay.mjs` learns the new media** (`value`, `video`, `program`, `file`,
   `state`) and the `session` field on a link, with tests, no transport code.
3. **The registry**: the Pi's `board.hello` and `board.alive` become node and
   port announcements with `seenAt`; pages announce theirs.
   ✅ DONE 2026-10-04: `demo/shell/graph-registry.mjs` (`boardGraph`,
   `createRegistry`), `rig/board/beat.mjs` puts the graph on every beat (about
   2 KB), the board answers `graph.ask` at once (64 ms measured), and
   `https://positron.studio/graph/` draws the live desk. Steps 1 and 2 are
   done too: `midi-kinds.mjs` and the eight media in `bay.mjs`.
4. **A routes page** that draws the live graph of the site and can make and break
   the first five kinds of link above.
   🟡 PARTLY DONE 2026-10-04 on `/graph/`: a link carries the room its stream
   really lives in (a port may declare `address`), and Open makes two kinds real
   with the board's own verbs, an input's sound to the browser (`input.want` and
   its lease, MEASURED 708 frames in 8 s, direct path 214 ms) and the browser's
   keys to that input (`midi.send` through the gate). Open is a person's press
   only. Later the same day: a synth's sound (`audio.start`, 424 frames in
   9 s), the GPU's video (`video.start`, relay H.264 decoded by WebCodecs, 209
   frames in 9 s) and keys to a synth (`note.on`). While a link is open its row
   names the transport really in use, which for video is the board's relay path
   and not the WHEP the transport table chose. Storage as a sink landed in
   `07a9731` (`/patchbay/` record and play): any Pi audio link recorded into R2
   through ingest, MEASURED 12 s and 139,585 bytes, then played back.
   `/rout/` and `/graph/` are now one page, `/patchbay/`.
5. **`/wish/` over all of it**, building its prompt from the registry, so the
   model can only name things that exist.

## 12. What is not settled

| question | how to settle |
| --- | --- |
| Video over the data channel on one network | measure, as audio was (plan-away-webrtc §9) |
| Two writers on one graph (two phones, one in another building) | plan-patchbay left it open; needs an owner per node and a rule for who wins. 🟡 PARTLY SETTLED 2026-10-04: a link from a page's port is opened only by asking that page (`link.request` / `link.state`), so the owner of a source port decides; two patchbays recalling one scene name each recall their own. No rule yet for two writers on the Pi's own ports |
| ~~Whether `state` buses belong in the graph at all~~ | ✅ TRIED 2026-10-04: `/partitur/`'s cues are a `state` out port and `/wall/`'s captions a `state` in port with `shape.schema: 'cue'`; as a link between two named ports it says who feeds whom, which a room does not. A many-to-many bus (cues, jam) stays a room |
| How a scene recall that includes heavy links behaves (a session takes seconds to open; a MIDI link takes nothing) | measure the slowest session against a bar at 122 bpm. 🟡 SIDESTEPPED 2026-10-04: a recall in `/patchbay/` is a diff that makes links DESCRIBED and never opens one, so no session opens on a bar line; the timing question returns when recall is allowed to open. 🟡 HALF ANSWERED 2026-10-04 in `plan-routing-time.md` §9: the LIGHT half of a recall can be scheduled on a bar now, as `due: { beat, clock }` on the peer clock (~3 ms MEASURED); the heavy half still takes seconds to open and still cannot |
| Time alignment across media in a recording (audio, video, the cue log) | `/replay/` already aligns a cue log to HLS; generalise or not. 🟡 DECIDED 2026-10-04, `plan-routing-time.md` §5d: GENERALISE. One `T0` on the peer clock per recording, a sidecar written last with each track's origin and a `[sample, ms]` anchor every 10 s (headless drift 1900 to 5200 ppm MEASURED is 52 ms between anchors at worst), cue and MIDI rows stored as peer-clock ms, playback on one media master. Built: the arithmetic only (step 1). Not built: the sidecar and the page (step 8) |
| A light event landing on the right frame or beat of a LIVE heavy link | ✅ MODELLED 2026-10-04, `plan-routing-time.md`: as it happens on WebRTC and MoQ (WHEP lag p50 67 ms MEASURED, so a cue leads by ~30 to 50 ms), scheduled ahead on the peer clock for lights that must agree, following the link at each receiver for LL-HLS (2 to 8 s per viewer MEASURED) and relay PCM (~175 ms to the speaker MEASURED). Step 1 built and graded: `demo/shell/timebase.mjs`, 39 asserts, 11 negative controls, 7 sabotages. Open: Cloudflare's PDT against the peer clock, WebRTC sender reports, and the Pi's two headers (PCM carries a process-relative time nobody reads; H.264 carries none) |
| The relay's cap in §5 and in `bay.mjs`'s `TRANSPORTS` | still says 60 msg/s, stay at 50; the relay has been 1000 msg/s with a 2000 burst (READ, `workers/relay/src/index.js`). Correct both, found 2026-10-04 while writing `plan-routing-time.md` |
