# plan-routing-migration: what it takes to move every demo onto universal routing and the patchbay, and what is still missing

> Asked 2026-10-06, verbatim: *"make analysis in bg what it takes to move all
> demos to universal routing / patchbay and what is still missing"*.
>
> ⚠️ `BACKLOG.md` line 3 says this analysis goes into
> `plans/plan-universal-routing.md`. It was written here instead, as a new file,
> by instruction, because that plan is the design and this is the migration
> against it. Nothing in `plan-universal-routing.md` was edited.
>
> **NOTHING HERE IS BUILT AND NOTHING WAS RUN AGAINST A SERVER.** Every claim is
> tagged **MEASURED** (a command run today, 2026-10-06, given beside it) or
> **READ** (file and line, read today, nothing run). Only three node tests were
> run, no harness, no relay socket, no external source.
>
> Read before writing, per *"read plans before planning"*:
> `plan-universal-routing.md`, `plan-route-core.md`, `plan-routing-time.md`,
> `plan-patchbay.md`, `plan-stage-patchbay.md` (refused), `plan-flipper-patchbay.md`
> (shelved), `plan-patch.md` (about synth definitions as files, not routing; it
> contributes nothing here), and the routing parts of `plan-xr-together.md`,
> `plan-pico.md`, `plan-nodes.md`, `plan-demo-structure.md`, `HANDOFF.md`,
> `BACKLOG.md`. Code read: `demo/shell/bay.mjs`, `route-core.mjs`,
> `graph-registry.mjs`, `demo/patchbay/index.html`, `demo/partitur/score.mjs`,
> `demo/partitur/wall.mjs`, `rig/board/beat.mjs`, `rig/board/inputs.mjs`,
> `workers/relay/src/index.js`, and the imports and network calls of every demo.

## 0. Facts checked today, because a stale one is what an agent inherits

| fact | value | how |
| --- | --- | --- |
| demo rows | **54**, of which **52 built**, **5 unlisted** | MEASURED: `node -e "import('./demo/manifest.mjs').then(m => console.log(m.DEMOS.length, m.DEMOS.filter(d=>d.built).length, m.DEMOS.filter(d=>d.unlisted).length))"` printed `54 52 5` |
| CLAUDE.md's top line | says **46 rows, 44 built**, stale | READ `CLAUDE.md` line 4; the HANDOFF of 2026-10-05 says the same 46 and 44, before the kit split added rows |
| plans | **92** | MEASURED: `ls plans/*.md \| wc -l` (CLAUDE.md says 88) |
| `bay.mjs` | 115/115 green, 1,162 lines | MEASURED: `node demo/shell/bay-test.mjs`; `wc -l` |
| `route-core.mjs` | 115/115 passed | MEASURED: `node demo/shell/route-core-test.mjs` |
| `graph-registry.mjs` | 49/49 green | MEASURED: `node demo/shell/graph-registry-test.mjs` |
| `/patchbay/` | 1,195 lines, 27 `d.assert(` calls in source | MEASURED: `wc -l`, `grep -c` |
| `/rout/`, `/graph/`, `/bay/`, `/room/`, `/now/`, `/able/` | archived, in `archive/demos/` | MEASURED: `ls archive/demos` |

## 1. What "universal routing / patchbay" is as built today

### 1.1 The model

**`bay.mjs` is the vocabulary and the validator.** READ `demo/shell/bay.mjs`.

- **A port** is `{ id: 'site:node:port', dir, medium, shape, accepts, never, emits, address }`.
  `shape` is what the data is, `accepts` is what an in port consents to, and
  `never` is what refuses a link outright (split from `accepts` because
  *unsupported* and *forbidden* are different, `positron-verify`).
- **Eight media** (`MEDIA`, `bay.mjs:39`): `midi, audio, clock, value, video,
  program, file, state`. **Four are heavy** (`HEAVY`, `:51`): `audio, video,
  file, state`, and a heavy link carries no bytes, it resolves to a **session**
  `{ transport, address, shape, where, says }` (`sessionFor`, `:1052`).
- **A node** is optional, one of seven kinds (`NODE_KINDS`, `:59`): `device,
  engine, endpoint, store, external, screen, person`. `external` is the one kind
  the validator reads: a link out of it needs `{ consent: true }` from a person
  (`:922`).
- **A link** is `{ id, from, to, transforms, enabled, sent, dropped, session }`.
  `validate` (`:886`) refuses with a reason in words: no such port, wrong
  direction, medium mismatch (`:900`), external without consent, a transform on
  a non-MIDI medium (`:935`), shape mismatch, a class the destination does not
  accept, transforms that drop everything, a loop in the same medium. It
  **warns** on a stale port and on classes the destination will drop.
- **The transport chooser** (`TRANSPORTS`, `:80`, `chooseTransport`, `:118`)
  is plan-universal-routing §5 as data, keyed by medium and by distance
  (`machine, network, internet-one, internet-many`).
- **Level 2 text** (`printLink`, `parseLink`, `:718`, `:734`) is the one-line
  form a person, a scene file and the `/wish/` model all write.

**`route-core.mjs` is the engine under it for light media.** READ
`demo/shell/route-core.mjs`, `plan-route-core.md` §12. A fixed event, a table of
links, a closed op list (`pass, chan, cc, scale, range, curve, velcurve, notecc,
toggle, transpose, thin` and more), an `allow / confirm / deny` gate per kind with
byte prefix rules, unlink releasing held notes and CC 123. 26 vector files in
`demo/shell/route-vectors/` are the contract; a C port in `rig/route-core/`
passes the same vectors (98/98 in Docker per HANDOFF 2026-10-04, READ, not
re-run today).

**`graph-registry.mjs` is discovery.** READ `demo/shell/graph-registry.mjs`. A
graph is `{ v: 1, site, place, net, nodes, ports }`. The Pi puts its graph on
`board.hello` and every `board.alive` (`rig/board/beat.mjs:73`, `:87`), a page
sends `graph.announce`, anyone may send `graph.ask`. `createRegistry` keeps **one
graph per socket** (`by.set(msg.from, ...)`, `:117`) and merges **freshest per
site** (`merged`, `:126`). Stale after 15 s (`:22`).

**What a room is.** There is no room object in the model. A room is a relay
Durable Object by name (`workers/relay/src/index.js`), which knows nothing about
graphs or links (READ: `grep graph\|link\.\|lease` in that file finds only a
comment). Discovery, scene names and `link.request` all ride **one fixed room,
`studio-1`**, which is also the Raspberry Pi's address. A port's `address` names
the room its stream really lives in (`studio-1`, `studio-1-video`,
`studio-1-<input>`, READ `graph-registry.mjs:52-73`).

### 1.2 What `/patchbay/` does

READ `demo/patchbay/index.html`.

- Joins `studio-1` and announces itself as site **`web`** (`:160`, `:917`).
- Draws the live desk (what announced itself) or a typed example desk, as a
  table and a diagram; makes links from a typed level 2 line; refuses in words.
- MIDI links from `web:keys:out` really run through `route-core.mjs` on their
  way to the board (the INSIDE A LINK block, `:400`).
- **Eight openers**, all hand-written in this one page (`OPENERS`, `:564`):
  `remote` (ask the page that owns the port with `link.request`, believe its
  `link.state`), `listen` (`input.want` lease, renewed every 20 s, `:669`),
  `synth` (`audio.start`), `video` (`video.start`, relay H.264 decoded with
  WebCodecs, `:616`), `keys` and `notes` (`midi.send` / `note.on` through the
  board's gate), `record` (audio into R2 through ingest, `:749`), `play` (back
  from `archive.positron.studio`, `:801`). Every opener needs `web:screen` or
  `web:keys` as one end (`kindOf`, `:547`).
- Scenes: saved per browser in `localStorage`, recalled as a diff that makes
  links DESCRIBED and opens nothing; another page may ask a recall by name with
  `scene.recall`.
- **A visit and the harness open nothing.** Under `?selfcheck=1` Open answers
  *"the harness opens no real stream"* (`:892`). The opener path is graded only
  through counting stand-in openers (`:1101` to `:1107`).

### 1.3 What the workers do

| worker | role in routing | READ |
| --- | --- | --- |
| `relay` (`ws.positron.studio`) | every room: discovery, scenes, board control, PCM and H.264 frames. 1000 msg/s, 2000 burst, 128 sockets, 8 MiB/s | `workers/relay/src/index.js:77-82` |
| `pub` | WHIP/WHEP proxy, containers, holds, ICE credentials | `workers/pub/worker.mjs` |
| `ingest` | the `record` opener's write path, caps 24 MiB a session, 5 sessions an hour an address | `workers/ingest/worker.mjs`, via `plan-xr-together.md` §3 |
| `store` | joins a room as an ordinary peer and keeps its history | `workers/store/src/index.js` |
| the Pi (not a worker) | announces 5 kinds of node, answers `graph.ask` (64 ms per HANDOFF), runs the leases and the MIDI gate | `rig/board/beat.mjs`, `rig/board/inputs.mjs:377`, `:390` |

### 1.4 Promised against built

From `plan-universal-routing.md` §3 to §11, `plan-patchbay.md` §8 and
`plan-route-core.md` §11.

| promised | where promised | built | missing |
| --- | --- | --- | --- |
| Node, Port, Link, Scene | univ §3 | yes, `bay.mjs`; scenes in `/patchbay/` only | scenes are per browser and not a kit module |
| eight media, sessions for heavy | univ §3, §4 | yes, `bay.mjs:39`, `:51`, `:1052` | |
| one MIDI kind vocabulary | route-core step 0 | yes, `midi-kinds.mjs` (HANDOFF `bbb7073`) | |
| test vectors and JS core | route-core steps 1, 2 | yes, 26 vectors, 115/115 | |
| C core | route-core step 6 | yes in Docker, `rig/route-core/` | not on a board yet (Pico firmware exists in the emulator, READ HANDOFF) |
| the Pi runs route-core | route-core step 3 | **no**; the page runs it before `midi.send` | the board's own keyboard-to-Circuit path |
| registry | univ step 3 | yes, the Pi and three pages announce | one site per socket (§3.3 below) |
| a routes page | univ step 4 | yes, `/patchbay/` | openers are page code, not kit |
| a link is a lease | univ §4 | yes for `input.want` inside `/patchbay/` only | no shared lease helper |
| transport chooser from measurements | univ §5 | yes as a table | stale cap figure, no per-port restriction, no row for reading one stored object |
| consent on an external source | univ §6 | yes, `bay.mjs:922` | |
| owner and `heldBy` on board ports | univ §6 | **no** (`grep owner\|heldBy demo/shell/bay.mjs` finds only comments) | all of it |
| cost on the link, printed before it exists | univ §6, patchbay §5 | **no** (`validate` has no cost branch, READ `:886-1050`) | all of it |
| one clock source per site | patchbay §3.4 | **no** (no such rule in `validate`) | all of it |
| hop counter for a loop through hardware | route-core §5 | **no** | open in route-core §10 |
| storage as a sink | univ §10 item 5 | yes, audio only | video, file, IndexedDB |
| `program` as a medium | univ §3 | in the model; `/mirror/` sends a shader by its own code | no page links `program` through bay |
| WHEP, MoQ, LL-HLS endpoints as fixed nodes | univ §10 | **no**; `endpoint` is a kind nobody announces | all of it |
| `/wish/` builds its prompt from the registry | univ step 5 | **no**; it uses its own desk | |
| time across planes | routing-time | step 1 only, `timebase.mjs`, used by `/sync/` tabs | steps 2 to 10 |

## 2. Every demo, one row each

Legend: **already** speaks bay or the registry; **small** a page change under
about 150 lines once the shared pieces in §4 exist; **medium**; **large**;
**no** makes no sense or should not move. "Mechanism" is READ from each page's
imports and network calls (a grep of `demo/<slug>/` for `openWire`,
`createBoard`, `whepPlay`, `createLowLatencyPlayer`, `moq.mjs`,
`requestMIDIAccess`, `getUserMedia`, `RTCPeerConnection`, `ingest.mjs` and
literal hosts).

### 2.1 Built and listed (47)

| demo | sends or receives | mechanism | speaks bay | move | why |
| --- | --- | --- | --- | --- | --- |
| [csound](https://positron.studio/csound/) | nothing off the machine; audio local | local only | no | no | a score compiler and a timeline; nothing to route |
| [llhls](https://positron.studio/llhls/) | video in | LL-HLS from Stream, holds `pub` watch | no | no | the page's subject IS one transport; a link would wrap one session and hide the thing measured |
| [webrtc](https://positron.studio/webrtc/) | video in | WHEP via `live.mjs` | no | no | same: a transport page |
| [moq](https://positron.studio/moq/) | video out and back | MoQ to Cloudflare's draft-14 relay | no | no | same |
| [cam](https://positron.studio/cam/) | camera out, video back three ways | getUserMedia, WHIP, MoQ, LL-HLS | no | large | one source, three sessions side by side needs a per-link transport override bay does not have, and the LL-HLS leg is an RTMPS container with recording that cannot be switched off |
| [mirror](https://positron.studio/mirror/) | shader out, H.264 back | relay `studio-1` (`video.shader`, `video.start`, `-video` room), WebCodecs | no | small | the Pi already announces `gpu:program` and `gpu:video` (READ `graph-registry.mjs:62-64`); two links and the shared video opener replace its own code |
| [weight](https://positron.studio/weight/) | nothing | WebXR, local | no | no | XR owns the frame loop (univ §7) |
| [wire](https://positron.studio/wire/) | bytes tab: messages; notes tab: MIDI and peer sound | relay rooms, `store`, WebMIDI, RTCPeerConnection | no | medium | NOTES is a page to page MIDI link plus a peer audio session, which bay can describe; BYTES is the relay itself, which univ §7 keeps out of the graph |
| [reel](https://positron.studio/reel/) | archive video in | HLS from `arhiiv.err.ee` | no | no | external; a visit must open nothing and every connection counts at ERR |
| [floor](https://positron.studio/floor/) | archive video in | HLS from `arhiiv.err.ee`, WebXR | no | no | external and XR |
| [flipper](https://positron.studio/flipper/) | two live TV channels in | ERR LL-HLS via `err-live.mjs` | no | no | REFUSED: *"no films page"*, plan shelved |
| [resources](https://positron.studio/resources/) | catalogue rows, links | R2 JSON, external links | no | no | a table of sources, not a flow |
| [tapes](https://positron.studio/tapes/) | recordings in | archive.org through `tapes.positron.studio` | no | no | external through a proxy; a store to one player with no choice to make |
| [making](https://positron.studio/making/) | films and pictures in | R2 corpus JSON, Range probes | no | no | our own store into the page's own player; a link adds nothing |
| [held](https://positron.studio/held/) | a score and a film in | `/resources/held-in-human.json` | no | no | same |
| [capture](https://positron.studio/capture/) | camera and sound out, recordings in | MediaRecorder, ingest, WHIP and WHEP, in-page peers, relay | no | large | four record links (`takes`, `segments`, `roundtrip`, `farend`); needs video record, WHIP and WHEP openers and the `file` rows wired |
| [radio](https://positron.studio/radio/) | stations in | Icecast through `shout.positron.studio` | no | no | external; *"can we please stop assessing the radio, its killing me and my budget"* |
| [videoradio](https://positron.studio/videoradio/) | stations in | `shout` | no | no | same, plus four ERR mounts |
| [circuit](https://positron.studio/circuit/) | MIDI in | WebMIDI, `sysex: false` (READ `:899`) | no | small | announce the local Circuit as a device; resolve it by port id, not by name |
| [wish](https://positron.studio/wish/) | words in, links out | WebMIDI, Workers AI, getUserMedia | **yes** (`bay.mjs` import, `:453`; its own desk, `:1240`) | already | the model proposes level 2 lines that `bay` validates; univ step 5 (prompt from the registry) is the open part |
| [patchbay](https://positron.studio/patchbay/) | everything above | relay `studio-1`, board rooms, ingest, archive | **yes** | already | the routes page; see §3.4 for its own partitioning defect |
| [partitur](https://positron.studio/partitur/) | light, sirens and cues out, wall in | relay, `graph.announce`, `link.request` | **yes** (`score.mjs:22-23`, `wall.mjs:90-95`) | already | joins on a press and honours `?room=` (READ `wall.mjs:14-28`) |
| [time](https://positron.studio/time/) | nothing off the machine | local | no | no | the clock pages are local by design |
| [sync](https://positron.studio/sync/) | messages, peer clock, recordings | relay rooms, `peer.mjs`, `timebase.mjs`, `archive.mjs` | no (uses `timebase`) | no | its tabs explain the TIME half of routing; routing-time step 2 lands on `partitur` instead |
| [shape](https://positron.studio/shape/) | CC to a Circuit, here or on the Pi | WebMIDI or relay `studio-1-circuit` via `board.mjs` | no | medium | two paths to one instrument are two ports; its patch dumps meet the `confirm` gate |
| [pack](https://positron.studio/pack/) | files in | local zip; asks MIDI **zero** times (READ, its own assert at `:2116`) | no | no | a file reader |
| [tom](https://positron.studio/tom/) | samples played locally | local; asks MIDI zero times (`:1234`) | no | no | nothing crosses a wire |
| [evo](https://positron.studio/evo/) | MIDI in | WebMIDI, never sends (READ `:856`) | no | small | as circuit; `evo:out -> studio-1:circuit:in` is plan-patchbay's own first demo |
| [twelve](https://positron.studio/twelve/) | MIDI in | WebMIDI | no | small | as circuit |
| [nola](https://positron.studio/nola/) | keys in, sound local | WebMIDI, WebAudio | no | small | an engine node with a `midi` in port; local only |
| [fau](https://positron.studio/fau/) | keys in, sound local; Faust as `program` | WebMIDI, AudioWorklet | no | small | engine with `program` and `midi` in, `audio` out (univ §3 names it) |
| [collide](https://positron.studio/collide/) | keys in, sound local; sclang as `program` | WebMIDI, scsynth wasm | no | small | as fau |
| [draw](https://positron.studio/draw/) | nothing | pointer, local | no | no | a gesture could be a `value` source, but nothing asked |
| [typist](https://positron.studio/typist/) | nothing | local | no | no | |
| [stage](https://positron.studio/stage/) | live film in, recording out | WHEP, `pub` hold, ingest, relay | no | no | REFUSED: *"i do not about patchbay, perhaps just visual indication of picture happening"*; the indication shipped |
| [knobs](https://positron.studio/knobs/) | keys and CCs out, synth sound back | `board.mjs` in `studio-1`, WebMIDI, camera hand | no | small | the Pi announces the synth's `in` and `audio`; the hand is a `value` source that needs a `value` to `midi` adapter (§3.1) |
| [away](https://positron.studio/away/) | keys out, an input's sound back | `board.mjs`, `input.want` lease, `midi.send` | no | small | `/patchbay/`'s `listen` and `keys` openers were lifted from this page (READ `patchbay/index.html:536`) |
| [muta](https://positron.studio/muta/) | keys in, sound local | WebMIDI, AudioWorklet | no | small | engine node, local |
| [dump](https://positron.studio/dump/) | MIDI in | WebMIDI | no | small | a sink on any MIDI out port: a tap a person can put on a link |
| [kit/input](https://positron.studio/kit/input/) | nothing | local | no | no | kit specimen pages |
| [kit/status](https://positron.studio/kit/status/) | nothing | local | no | no | |
| [kit/timeline](https://positron.studio/kit/timeline/) | nothing | local | no | no | |
| [kit/layout](https://positron.studio/kit/layout/) | nothing | local | no | no | |
| [kit/devices](https://positron.studio/kit/devices/) | nothing | local | no | no | |
| [kit/hardware](https://positron.studio/kit/hardware/) | nothing | the Pico firmware in an emulator | no | no | the router's screen, not a router |
| [kit/diagram](https://positron.studio/kit/diagram/) | nothing | local | no | no | |
| [kit/slides](https://positron.studio/kit/slides/) | nothing | local | no | no | |

### 2.2 Built and unlisted (5)

| demo | sends or receives | mechanism | speaks bay | move | why |
| --- | --- | --- | --- | --- | --- |
| [grains](https://positron.studio/grains/) | Pi granulator sound back, blend | relay `studio-1`, scsynth wasm | no | medium | unlisted; a page engine and a board engine on one blend is two audio links into one mixer the model has no node for |
| [kit](https://positron.studio/kit/) | nothing | local | no | no | a forwarder |
| [slides](https://positron.studio/slides/) | nothing | local | no | no | an archive |
| [parts](https://positron.studio/parts/) | nothing | local | no | no | a parts list |
| [feedback](https://positron.studio/feedback/) | notes from visitors | a relay room as a bus | no | no | a many to many `state` bus, which univ §7 keeps a room |

### 2.3 Not built (2)

| demo | why |
| --- | --- |
| deck | not shelled, nothing to move |
| station | lives at eccm now (READ its `one` line) |

### 2.4 Totals by group

| group | count | demos |
| --- | --- | --- |
| already on it | **3** | patchbay, partitur, wish |
| easy (small) | **11** | mirror, knobs, away, circuit, evo, twelve, dump, nola, fau, collide, muta |
| hard (medium or large) | **5** | shape, wire (NOTES), grains, capture, cam |
| should not move | **35** | 2 refused (stage, flipper); 3 transport pages (llhls, webrtc, moq); 8 external or own-archive players (reel, floor, radio, videoradio, tapes, resources, making, held); 8 with nothing that should cross a wire (csound, time, sync, draw, typist, weight, pack, tom); 12 kit and meta rows (kit, its 8 part pages, slides, parts, feedback); 2 not built (deck, station) |
| total | **54** | |

2 + 3 + 8 + 8 + 12 + 2 = 35, and 3 + 11 + 5 + 35 = 54.

**So "move all demos" is the wrong unit.** At most **19 of 54** have a reason to
be on the patchbay, and 3 already are. The other 35 either have nothing that
crosses a wire, have a transport as their subject, touch somebody else's server,
or were refused by the owner.

## 3. What is still missing in the core, for the 16 that should move

### 3.1 Endpoint kinds and adapters

- **This browser's WebMIDI devices are not in the graph.** `/patchbay/`
  announces exactly three ports, `web:keys:out`, `web:screen:audio`,
  `web:screen:video` (READ `:161-172`). Eight of the eleven easy pages (circuit,
  evo, twelve, dump, nola, fau, collide, muta) are WebMIDI pages, so **a shared
  local MIDI graph adapter is the piece most pages wait on.** Identity follows
  route-core §3 (serial, then port path, then a soft match) and must not key by
  name (plan-patchbay §2.3, *"`Circuit` becomes `Circuit 2`"*).
- **Browser engines are not nodes.** No page announces an `engine` with
  `program` in and `audio` out, though univ §3 names Faust, sclang and a shader.
- **`endpoint` is a kind nobody announces** (READ, `plan-stage-patchbay.md`
  §3.1, re-checked by grep today: no `kind: 'endpoint'` in `demo/`).
- **No medium adapter.** `value` to `midi` is refused (`bay.mjs:900`), which
  blocks the `/knobs/` hand and plan-xr-together's hand to the Circuit. A node
  with a `value` in and a `midi` out (route-core §4's rule that anything with
  state is a node, not an op) is the shape.
- **No browser-side PCM sender.** `board.mjs` receives PCM; no module sends it
  (READ, `grep export demo/shell/board.mjs`). So an engine on a page cannot send
  its sound anywhere but its own speakers.

### 3.2 Transports and openers

- **Openers are page code.** Eight live in `/patchbay/` and nowhere else
  (`:564`), each tied to a `web:` end. A page that wants to open a link has to
  copy them. `plan-stage-patchbay.md` F5 found the join handshake copied three
  times for the same reason.
- **Dispatch is by medium, not by session** (F2 in the stage plan, still true:
  `kindOf`, `:547`, sends ANY video link into `web:screen:video` to the Pi's
  `video.start`).
- **Openers that do not exist**: WHEP, WHIP, LL-HLS, MoQ, a page to page MIDI
  link over the relay, a peer data channel between two browsers, video and file
  recording, IndexedDB, and reading one stored object over https (there is no
  `TRANSPORTS` row for it; a store's out port on `internet-one` answers
  `ingest`, which is the WRITE path).
- **No per-port transport restriction** (stage F1, still true: `grep
  transports: demo/shell/bay.mjs` finds only the table). A WHIP-only input asked
  for by a second receiver would be told LL-HLS. `/cam/` needs one more step: a
  per-link override, `{ via: 'moq' }`.
- 🔴 **The table's relay figure is stale.** `bay.mjs:84` and `:101-104` say *"cap
  60 msg/s, stay at 50"*; the relay is **1000 msg/s, 2000 burst**
  (`workers/relay/src/index.js:81-82`). `/patchbay/` prints `says` to a visitor.
  Reported twice before (HANDOFF 2026-10-04 item 6, `plan-xr-together.md` §3),
  still unfixed.

### 3.3 Discovery

- **One graph per socket, one site per graph** (`graph-registry.mjs:117`,
  `graphProblem`). A page that is two sites (the stage was: its rendezvous plus
  the fixed Cloudflare input) cannot announce both. Stage F3, still true.
- 🔴 **Every `/patchbay/` visitor is site `web`.** `merged()` keeps the freshest
  graph per site, so two visitors' patchbays overwrite each other's `web` in
  every registry in the room. Harmless today only because every `web` graph is
  byte identical. The moment a patchbay announces its own MIDI devices (§3.1),
  one visitor's keyboard replaces another's. `partitur` and `wall` already use a
  random site per tab (READ `wall.mjs:90`); the patchbay does not.
- **Two stale windows.** `bay.mjs:763` `STALE_MS = 30_000`,
  `graph-registry.mjs:22` `STALE_MS = 15_000`. A port can be stale to the
  registry and fresh to the bay for 15 s.
- **Discovery is one room.** Everything is heard in `studio-1` only. A second
  studio, a second Pi or a Pico on another network (plan-pico §3) is a second
  room nobody lists, and a Durable Object namespace cannot be enumerated
  (`positron-streaming`).

### 3.4 Rooms and partitioning, which is CLAUDE.md's FCM story again

`studio-1` is **the Pi's address, the discovery bus, the scene bus and the
link-request bus at once**: one shared resource, and nobody owns the sharing.

- 🔴 **`/patchbay/` announces into the owner's `studio-1` on every visit AND on
  every suite run.** `const ROOM = 'studio-1'` (`:160`) with no `?room=` read,
  and `openWire(ROOM, ...)` at module top level (`:917`), so it joins on load.
  `demo/verify.mjs:695` hands every non-fixed demo a `?room=patchbay-test-...`,
  which the page ignores, and `patchbay` is not `room: 'fixed'` in the manifest.
  So every harness run puts a `web` site on the owner's desk and asks the Pi
  `graph.ask`. **This is exactly stage plan F6**, which was fixed for `partitur`
  and `wall` on 2026-10-05 (HANDOFF `c296c5b`, *"suite runs no longer put fake
  walls on the owner's patchbay"*) and not for the patchbay itself. READ, not
  run; the fix is the shared join helper in §4 step 1.
- It also breaks the rule `tab-page.mjs` writes for `partitur`: *"it joins the
  room on a press, not on load"*. Joining opens only our own relay, which the
  page says in its own comment (`:158`), so it is not an external-source breach;
  it is a partitioning one.
- **A relay room holds 128 sockets** (`relay/src/index.js:78`). `studio-1` sat
  full at 16 once, for hours, on orphaned Chromes (`positron-streaming`). Every
  page that moves onto the patchbay is one more socket in that room per tab.
- **Scenes recall by name across the room.** Two patchbays holding a scene
  called `scene 1` both recall their own (univ §12, recorded as partly settled).

### 3.5 Latency and clock

- `timebase.mjs` exists and is graded (routing-time §8), and **no link uses
  it**: `grep timebase` finds `/sync/` tabs only.
- A link carries no latency field and no time mode (`at`, `ahead`, `follow`
  are routing-time §4 designs, not built).
- The Pi's PCM header carries a process-relative time nobody reads and its
  H.264 header carries none (routing-time §1 finding 2, steps 6 and 7).
- No one-clock-per-site rule in `validate`, though the Circuit sends clock at
  122 bpm unasked (plan-patchbay §3.4).

### 3.6 Permissions

- Consent exists for `external` sources only, and only as an argument a page
  passes (`bay.mjs:922`).
- **No owner and no `heldBy` on any port.** A second person's Open on the Pi's
  synth takes the sound from whoever had it; `fxAsked` exists for the insert
  only (`rig/board/board.mjs:130`).
- **The relay is tokenless**, so anything in `studio-1` may send `midi.send`;
  the board's gate (`midiVerdict`, `inputs.mjs:77`) is the only guard, and it is
  at the destination, which is right (plan-patchbay §3.3).
- **No cost on a link** (univ §6): relay messages, Stream minutes (billed for
  WHEP too from 2026-10-15, `positron-streaming`), R2 and ingest caps are not
  printed before a link exists.

### 3.7 The UI: a patch view, or the owner's indication

The owner's answer to the stage plan decides this: *"i do not about patchbay,
perhaps just visual indication of picture happening"*. What shipped instead is a
tag on the picture driven by frames arriving, STARTING, RECEIVING, STALLED
(BACKLOG line 103). **That is the UI the moved pages should get, not a patch
view.** A page that moves:

- registers its nodes so `/patchbay/` can draw and link them;
- shows on its own picture or panel whether each of its links is arriving,
  from frames or messages actually counted at the far side (CLAUDE.md: *"a count
  is only evidence on the far side of the boundary"*);
- embeds no patch view. `/patchbay/` stays the one place links are drawn and
  made, one click away.

So a **link status badge** is a missing kit piece: one component, fed by an
opener's `state()`, the same three words on every page. Not a matrix, not a
diagram.

### 3.8 Harness and stand-ins

- **No stand-in board.** Every opener that matters talks to the real Pi in
  another building, which has one JACK graph and may have a listener. Under
  `?selfcheck=1` the patchbay opens nothing (`:892`), so **no opener is graded
  by the suite at all**, only a counting fake (`:1101-1107`).
- **No way to point a page at a local relay.** `RELAY_BASE` is a constant
  (`demo/shell/wire.mjs:38`); the stand-ins for ERR, Icecast and archive.org all
  work through a `?base=`, and the relay has none.
- What a `fake-board.mjs` would need, from the board's own verbs: answer
  `board.hello` and `board.alive` with a `boardGraph`, `graph.ask`,
  `input.want` with a lease, `audio.start` with PCM frames of a **known tone that
  pulses** (`positron-verify`: never silence, so a level and a direction can be
  asserted), `midi.send` counted on its side so the count is from the far side
  of the boundary, and **refusals** (a `never` class, a full room) so a sabotage
  can take asserts red. H.264 can wait; `/mirror/` and the `video` opener are
  graded on a real GPU today and can stay so.

## 4. The order of work: most demos for the least

CLAUDE.md: *"anything shared is done once, by one agent, before the page agents
start"*, and agents do not commit. Steps 0 to 4 are that one agent. Line counts
are estimates from the code read, not measured.

| step | what | files | cost | unlocks |
| --- | --- | --- | --- | --- |
| 0 | **bay corrections**: relay figure to 1000 msg/s; per-port `transports` and per-link `via`, refused in words with a negative control; a `https` row for reading one stored object; one `STALE_MS` shared with the registry | `bay.mjs`, `bay-test.mjs`, `graph-registry.mjs` | about +70 module, +50 test, one session | every later step that opens a session |
| 1 | **the join helper**: `?room=` or `studio-1` for a person, the run's own room under `SELFCHECK`, join on a press or an explicit call and never on load, a random site per tab, announce, answer `graph.ask`, re-announce, `link.request` and `link.state`; registry keyed by socket and site | new `demo/shell/bay-node.mjs` and test; `graph-registry.mjs`; then `patchbay`, `partitur/score.mjs`, `partitur/wall.mjs` move onto it | about +120 module, +80 test, minus three hand copies; one session | **fixes the patchbay's own harness leak (§3.4)** and every page after it |
| 2 | **openers in the kit**: lift the eight openers and `holdSource` out of `/patchbay/`, dispatch on `session.transport`, one lease helper, a link status badge | new `demo/shell/openers.mjs`, `demo/shell/link-badge.mjs`; `/patchbay/` shrinks | about +450 module, about -400 page; one to two sessions | mirror, knobs, away |
| 3 | **the local MIDI graph adapter**: this browser's WebMIDI ports as device nodes with stable ids, links between them run through `route-core.mjs` | new `demo/shell/midi-graph.mjs` and test | about +150, +100 test; one session | circuit, evo, twelve, dump, nola, fau, collide, muta |
| 4 | **stand-ins**: a `?relay=` override in `wire.mjs` (and `board.mjs` through it), a local room server, and `demo/fake-board.mjs` as in §3.8, started by `verify.mjs` the way the other three are | `wire.mjs`, `verify.mjs`, new `fake-board.mjs` | about +300; one to two sessions; sabotage it once before believing it | grading every page in step 5 without the Pi |
| 5 | **page fan-out, one agent per page**, the 11 easy pages, in parallel | each `demo/<slug>/index.html` | 50 to 150 lines each; `node demo/check-html.mjs` then `node demo/verify.mjs <slug>` for that page only, diffing its assert count | 14 of 54 on the patchbay |
| 6 | **the 5 hard pages, a plan each first** | shape, wire, grains, capture, cam | medium to large each; capture and cam need WHIP, WHEP, MoQ and LL-HLS openers and spend Stream minutes | 19 of 54 |

**The cheapest big win is steps 1 and 3**: step 1 repairs a live partitioning
defect, and step 3 alone is what eight of the eleven easy pages wait on. Step 2
is for the three board pages. Step 4 is the one that is easy to skip and must
not be: without it step 5 is eleven pages whose links nothing grades.

**Verification budget**, per CLAUDE.md's *"verify economically"*: steps 0 to 4
are node tests plus `verify.mjs patchbay partitur`; step 5 is one page at a
time; no full suite at any point.

## 5. Risks, what was refused, and what could not be settled

### 5.1 What the owner refused, in the owner's words

| what | words | where recorded |
| --- | --- | --- |
| `/stage/` onto the patchbay | *"i do not about patchbay, perhaps just visual indication of picture happening"* | BACKLOG line 102, HANDOFF `5291380` |
| `/flipper/` as eight transports of our own films | *"no films page"* | `plan-flipper-patchbay.md` header, BACKLOG line 78 |
| merging `/now/` into `/flipper/` by that plan | *"Current now-plan is no go"* | `plan-flipper-patchbay.md` header |
| any re-verification of the radio | *"can we please stop assessing the radio, its killing me and my budget"* | CLAUDE.md |
| any external source in a harness | *"stil: super careful with external sources, better avoid"* | CLAUDE.md |
| the HLS leg of the stage | *"can you have just webrtc transport?"* | `plan-stage-patchbay.md` F1 |

And standing rules that bind any migration: a visit and the harness open
nothing; a model proposes and a person presses; every connection to ERR is a
listener in a public broadcaster's statistics.

### 5.2 Risks

- **The Pi is one instrument with one JACK graph.** Eleven more pages able to
  open links to `studio-1` is eleven more ways to take the sound from somebody
  listening in another building. §3.6's `heldBy` should land before step 5, or
  step 5 should keep board links to the three pages that already talk to the
  board (mirror, knobs, away).
- **One room carries everything.** More pages in `studio-1` is more sockets
  against 128 and more traffic on the Pi's own socket. A discovery room separate
  from the board's address (`studio-1-graph`, say) is worth deciding in step 1;
  it would change the Pi's `beat.mjs`, which needs a push to the board.
- **A migration that adds a patch view to every page** would go against the
  owner's answer on the stage. §3.7 is the shape to hold to.
- **Stream minutes.** Any WHEP or LL-HLS opener is billed per minute delivered
  from 2026-10-15 (`positron-streaming`), and RTMPS fills the 1000 storage
  minute cap in about 4.4 days of testing.
- **Moving a transport page onto bay hides its subject.** llhls, webrtc and moq
  measure one transport each; a link would add a layer between the reader and
  the number.

### 5.3 What was refused in this analysis

- **No harness run, no relay socket, no request to the Pi or to any external
  server.** The patchbay leak in §3.4 is READ from source and `verify.mjs:695`,
  not observed on the wire. Confirming it costs one look at
  `https://ws.positron.studio/room/studio-1/stats` during a `verify patchbay`
  run, which is the owner's call.
- **No edits**, including the two-line stale relay figure that three documents
  now report.

### 5.4 What could not be settled

| question | why not | what would settle it |
| --- | --- | --- |
| Does the owner want the instrument panels (circuit, evo, twelve) linkable, or only watched? | an intent, not a fact | asking; plan-patchbay §1 argued for it in 2026-09 |
| Should a visitor's page appear on the owner's `/patchbay/` at all? | stage plan question 1, never answered | asking |
| Video over a data channel on one network | `TRANSPORTS.video.network` says `to measure` | a measurement like plan-away-webrtc §9's for audio |
| Two writers on the Pi's own ports | univ §12, no rule yet | a decision on `heldBy`, then a two-tab test against the stand-in |
| Whether the board should run route-core itself | route-core step 3 not built; the page runs it today | building it, which needs a push to the Pi |
| Whether `/sync/` should become links | its tabs are explanations; my verdict is no, but it is the one should-not row that is a judgement call rather than a fact | asking |
| The real cost of `fake-board.mjs`'s H.264 | not estimated; proposed to leave it out | building the PCM half first |
| Whether the C core's 98/98 still holds | not re-run today (it runs in Docker) | `bash rig/route-core/test.sh` |
