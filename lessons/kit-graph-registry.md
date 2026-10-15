# Kit lessons: graph-registry

The longer comments cut from `demo/shell/graph-registry.mjs` and `demo/shell/graph-registry-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-graph-registry.md#<anchor>`.

<a id="header"></a>

## `graph-registry.mjs` module header

```text
demo/shell/graph-registry.mjs — who is in the graph right now, from what they
say about themselves.

🔴 STEP 3 OF `plans/plan-universal-routing.md`, ASKED 2026-10-04 (*"U iversal
router demo?"*, then *"Yes"*). Until now `/graph/` drew a desk somebody typed.
This is how it draws the desk that exists: every machine says what nodes and
ports it has, in `bay.mjs`'s own shapes, and a page collects what it hears.

⚠️ PURE AND IMPORT FREE ON PURPOSE. The board imports it directly, and
`rig/board/push.sh` ships only the `../../demo/shell/` files a board module
names itself, never their imports.

ON THE WIRE, and nothing new is invented for it:
  - the board puts `graph` on `board.hello` and on every `board.alive`, so a
    page that joins late hears it within one five second beat;
  - a page sends `{ type: 'graph.announce', graph }` for its own nodes;
  - `{ type: 'graph.ask' }` asks every page to announce again now.
A graph is `{ v: 1, site, place, net, kind, label, nodes: [...], ports: [...] }`
with ids `site:node:port`, exactly what `bay.addNode` and `bay.addPort` take.

`kind` and `label` say what a SITE is, since 2026-10-09 (plans/plan-site-names.md,
finishing plan-patchbay.md §2.1). Both are optional and `v` stays 1: a board
still running an older copy of this file sends neither, and a reader then
falls back to guessing from `place`. Neither ever changes an id.
⚠️ "you" IS NEVER SENT. A row is "you" when its site equals the reader's own,
so a label saying it would be wrong on every other screen.
```

<a id="board-site"></a>

## `graph-registry.mjs` BOARD_SITE

```text
🔴 THE PI'S SITE IS `pi-1`, NOT ITS ROOM, SINCE 2026-10-10
(plans/plan-site-names.md §0, §4b). Until then the site WAS the room, so every
id read `studio-1:...` and nothing in it said Raspberry Pi. The ROOM is still
`studio-1`: it is where the board's socket lives and every `address` below
still names it, so no stream moved. A second board is `pi-2`, set on the
board with `--site` or `BOARD_SITE` (`rig/board/board.mjs`).
⚠️ A page names a Pi port through this constant, never by gluing the room
onto a port name: `${ROOM}:yoshimi:in` was how five pages did it, and that is
exactly the coupling the rename broke.
```

<a id="stale-ms"></a>

## `graph-registry.mjs` STALE_MS

```text
Three missed board beats. `bay.mjs` imports this one number since
 2026-10-06, so a port goes stale to the bay and to the registry together.
```

<a id="board-transports"></a>

## `graph-registry.mjs` BOARD_TRANSPORTS

```text
🔴 HOW THE BOARD'S STREAMS REALLY TRAVEL, AS `bay.mjs` PORT `transports`,
SINCE 2026-10-06 (plans/plan-routing-migration.md §3.2, stage plan F1 and
F2). The board's sound is relay PCM, or a data channel once a page goes
direct (`board.mjs` `goDirect`); its picture is relay H.264 decoded with
WebCodecs, never WHEP. Without this the bay chose WHEP for the board's video
from the table, and a page that dispatches on the session's transport would
have nothing to open it with.
⚠️ THE PI ANNOUNCES WHAT ITS OWN COPY OF THIS FILE SAYS, and a change here
reaches it only by `rig/board/push.sh`. Until then a board graph arrives
without `transports`, so `withBoardTransports` fills them in on ingest, from
this one table, and a graph that already says something keeps what it says.
```

<a id="jack-ends"></a>

## `graph-registry.mjs` JACK_ENDS

```text
🔴 THE JACK PORTS BEHIND A BOARD'S AUDIO PORTS, SINCE 2026-10-11
(plans/plan-nodes-revisited.md §3 item 3, the bay half). A bay port is a
SOUND and the transport is how it travels: `pi-1:yoshimi:audio-out` is
Yoshimi, and it reaches a page over the relay and reaches the granulator over
JACK. So the port keeps its id and its relay address, and gains a `jack` list
naming the JACK ports it is on the board's graph. Nothing was renamed, which
is the answer to §5 item 5 that breaks no page.
⚠️ NAMED HERE ONCE, because the page that resolves a link and the board that
applies it have to agree on them, and this is the one file both import. The
board's own chain (`jacksynth.mjs`) names the same strings for the same ports.
⚠️ AN INPUT ON JACK IS ITS ONE TAKEN CHANNEL. The Circuit is plugged into
input 1 of a stereo interface and input 2 carries only that input's noise
(`inputs.mjs` `takeChannel`), so `circuit` is `circuit:capture_1` and nothing
else.
```

<a id="sampler"></a>

## `graph-registry.mjs` JACK_ENDS sampler

```text
`yoshimi: ['yoshimi:left', 'yoshimi:right']` until 2026-10-13, when Yoshimi
left the board (archive/yoshimi/README.md says how to bring it back).
The board's SuperCollider sampler (`rig/board/scsampler.mjs`), a scsynth of
its own whose JACK client is named so it is never taken for the
granulator's `SuperCollider`.
```

<a id="jackrows"></a>

## `graph-registry.mjs` jackRows

```text
One bay link between two JACK lists, as JACK rows. Pure.

🔴 STEREO, DECIDED 2026-10-11 (the owner: *"Dunno stereo"*): ONE BAY LINK IS
ONE WIRE ON THE PICTURE AND RESOLVES TO AS MANY JACK ROWS AS THE TWO ENDS
NEED, by the one rule this board already measured honest:
  - the same count each side: channel to channel (Yoshimi into the granulator);
  - one input: every channel SUMS into it, which is how the capture has been
    mono-sum since 2026-09-13 (mono-left read 1661 Hz where the sum read 2029);
  - one output: it feeds every input (the Circuit, mono, into both of the
    granulator's inputs, so its right side is not starved);
  - anything else, two into three, has no honest pairing and is refused.
The rows ride on the session (`bay.mjs`), so a reader is told what one wire
means before it is made.
```

<a id="boardgraph"></a>

## `graph-registry.mjs` boardGraph

```text
What a Raspberry Pi board is, as a graph. Everything here is something the
board already has a verb for; nothing is described that it cannot do.
@param {object} o
@param {string} o.room        the board's room, which is its place and the
  address of its streams. Not its site since 2026-10-10.
@param {string} [o.site]      the board's site, `BOARD_SITE` unless a second
  board says otherwise.
@param {string} [o.net]       the network it is on, if known
@param {object} [o.instruments]  `board.hello`'s own map: name -> available
@param {Array}  [o.inputs]    `[{ name, channels, midi: { port, channels } | null }]`
@param {Array}  [o.alsa]      `alsa.mjs` `addressable()` rows
@param {number} [o.frameMs]
@param {boolean} [o.gpu]      whether the GPU video path exists here (`video.mjs`
  `videoAvailable()`). The flag keeps its name; the NODE it announces is
  `shader` since 2026-10-14, see below.
@param {boolean} [o.camera]   whether the board has a camera it will send
  (`camera.mjs`: a key set AND `findCamera()` found one). Off by default.
@param {string} [o.label]     the human name a reader shows for this site.
  A fixed 'Raspberry Pi' rather than the board's hostname, because the
  hostname is `raspberrypi` on every fresh Pi OS (`board.mjs`, `NAME`).
@param {boolean} [o.jack]     the board has a JACK graph and announces its
  JACK ends: a `jack` list on Yoshimi's audio out and on every input that is
  on JACK (`i.jack`), and, where the granulator is installed, the granulator
  and the capture as nodes of their own. Off by default, so a page building a
  board graph to test against gets exactly the graph it always got.
```

<a id="granulator"></a>

## `graph-registry.mjs` boardGraph granulator and capture

```text
🔴 THE GRANULATOR AND THE CAPTURE, AS JACK ENDS, SINCE 2026-10-11. Both
travel by JACK and nothing else, so a link from either to a page is refused
in words by the bay rather than opened. The capture is what the board's
main room HEARS: `posboard:input_1`, whose stream reaches pages as
whichever engine is running (`${site}:<engine>:audio-out`); it was Yoshimi's
until 2026-10-13 (plans/plan-nodes-revisited.md §3 item 3).
⚠️ THE SHAPE SAYS THE RATE ONLY. The channel count of a JACK end is the
length of its `jack` list, and a relay stream's `channels: 1` beside a
granulator's two would refuse the link that is the whole point.
```

<a id="collide"></a>

## `graph-registry.mjs` boardGraph collide and drums

```text
🔴 A NODE KEEPS ITS CATALOGUE NAME ON EVERY SITE, AND ONLY THE SITE PREFIX
CHANGES, SINCE 2026-10-14 (the owner: *"Perhaps shader is better than gpu?
Should also match web:shader?"*). So the board's nodes below are named and
ported as `demo/shell/nodes.mjs` NODES has them on `web`: `collide`,
`drums` (the catalogue's `drum` type, one node for the kit), `shader`,
`camera`. A port the Pi lacks is left out rather than faked.

SUPERCOLLIDER, `scollide.mjs` (the page programs' scsynth, `poscollide`),
announced while `collideAvailable()` says scsynth, sclang, jackd and the
limiter are all there. It is ONE engine with two nodes over it, because two
pages play it two ways: /remote/collide/ sends notes (`note.on {node:
'collide'}`) and parameters (`sc.set`), /drums/remote/ sends timed hits
(`sc.hit`). Both sounds come back on the board's main stream and leave the
engine on the same two JACK ports, so a JACK link from either node carries
whatever the engine is playing.
```

<a id="shader"></a>

## `graph-registry.mjs` boardGraph shader

```text
THE SHADER, `video.mjs`: `rig/vis/v3dpipe` renders the mirror shader on the
VideoCore GPU and the hardware encoder sends it as H.264. `gpu` until
2026-10-14. `value-in` is `video.params` (the page's `segments` is the
board's `mirrors`), `program-in` is `video.shader`, compiled here as 310 es.
The picture leaves on `<room>-video` or on the main socket's direct `vid`
channel (`board.mjs` `videoDirect`, since 2026-10-13).
```

<a id="camera"></a>

## `graph-registry.mjs` boardGraph camera

```text
THE CAMERA, `camera.mjs`: a CSI or USB camera on the board, sent only to a
holder of the key, in `<room>-cam` (keyed by the relay) or on an input's
direct `cam` channel. The board says `camera` only when it holds a key AND
found a camera, so a board without one announces none.
```

<a id="inputs"></a>

## `graph-registry.mjs` boardGraph inputs

```text
The address is the room the board's input really streams into, which
`rig/board/inputs.mjs` names `<room>-<input>`.
An input on JACK (`BOARD_INPUTS` `via: "jack"`) is also its taken channel
on the board's graph, so it can be linked inside the Pi.
```

<a id="addboardnode"></a>

## `graph-registry.mjs` addBoardNode

```text
🔴 ONE ANNOUNCED BOARD NODE, DRAWN ON A PAGE'S OWN BAY, SINCE 2026-10-14.
A page that plays the Pi draws the Pi's node from `boardGraph()` rather than
typing it, so the node, its ports and their order are the ones the board
announces, and /connect/ and the live layer see the same thing the page draws.
Pure, and it imports nothing: it only calls the bay it is given.
@param {object} bay      the page's bay (`createBay`)
@param {object} g        a board graph, `boardGraph({...})` or one heard on the wire
@param {string} name     the node's name on the board, `collide`
@param {object} [o]
@param {string} [o.label]    the page's own label for the node, the board's when absent
@param {object} [o.deliver]  `{ '<port>': fn }`, what this page does with an event on that port
@param {object} [o.ports]    `{ '<port>': { ...fields } }` merged over the announced port, for
  what only the page knows (the parameter names of the program it loaded)
@param {string|null} [o.portLabel]  `'node:port'` (the default) labels each port `<node>:<port>`,
  as `nodes.mjs` `addNodes` does; null keeps the board's label
@param {boolean} [o.withPorts]  false adds the node alone, for a page whose
  picture order puts another node between it and its ports (`addBoardPorts`)
@returns the bay's node, or null when the graph has no such node
```

<a id="port-names"></a>

## `graph-registry.mjs` port name check

```text
A board's port name starts with its own medium and direction, so a name and
its fields cannot disagree (plans/plan-site-names.md §4c). ⚠️ BOARDS ONLY
for now: browser pages and the store still announce `keys:out` and
`history:in`, and holding them to it would refuse every one of them.
```

<a id="createregistry"></a>

## `graph-registry.mjs` createRegistry

```text
What the pages hear. One announcement per socket AND SITE, newest wins, and
an announcement that has gone quiet for `staleMs` is still listed but marked,
because a board that stopped answering is a fact worth drawing.
🔴 KEYED BY SOCKET AND SITE SINCE 2026-10-06 (plan-routing-migration §3.3,
stage plan F3). It was one graph per socket, so a page that is two sites (a
patchbay and the store it writes to, the stage and its fixed input) could
only ever be one of them: its second announce replaced its first in every
registry in the room.
⚠️ `merged` STILL KEEPS THE FRESHEST PER SITE ACROSS SOCKETS, which is why
every page now takes a random site of its own (`bay-node.mjs`): two visitors
announcing one site still overwrite each other, by design, because one site
is one thing.
```

<a id="test-header"></a>

## `graph-registry-test.mjs` graph-registry-test module header

```text
demo/shell/graph-registry-test.mjs: what a board says it is, and what a page
makes of hearing it, with no board, no socket and no browser.

  node demo/shell/graph-registry-test.mjs

Step 3 of `plans/plan-universal-routing.md`. `boardGraph` is the board's half
and `createRegistry` is the page's half, and both are pure, so the whole round
trip from the board's own state to a bay that refuses a bad link runs here.

MOST OF THESE ARE NEGATIVE CONTROLS, for the reason `bay-test.mjs` gives: a
validator that returns '' unconditionally passes every positive check, and a
registry that keeps everything it hears passes every one too. 20 of the 46
asserts below are named NEGATIVE CONTROL and each one has to see something
refused, skipped or left out.

🔴 PROVED BY BREAKING `graph-registry.mjs` ON A SCRATCH COPY, ONE FAULT AT A
TIME, against 46 green (2026-10-04):

  sabotage                                        red
  graphProblem skips the site check on nodes      1 of 46
  ingest answers true for a repeat of one graph   1 of 46
  an input's MIDI in has `never: []`              1 of 46
  an input's ALSA client described again          1 of 46
  the OLDEST announcement per site wins           2 of 46

⚠️ EVERY ROW IS RED BY ITS OWN NAMED ASSERT, and one is enough for the second
row because it is the one a page's redraw hangs off: a registry that says
*changed* every five seconds redraws `/graph/` on every beat and nobody sees
why.
```

<a id="session-room"></a>

## `graph-registry-test.mjs` audio link session room

```text
A board synth's sound lives in the board's MAIN room (2026-10-04), so the
session names that room, not a derivation of the port's id.
```

<a id="stream-rooms"></a>

## `graph-registry-test.mjs` stream rooms

```text
2026-10-04, step 4: a session has to name the room the stream REALLY lives
in, or a page opening it joins an empty room. The board's inputs stream to
`<room>-<input>` and its video to `<room>-video`.
```

<a id="migration"></a>

## `graph-registry-test.mjs` routing migration steps 0 and 1

```text
── plans/plan-routing-migration.md steps 0 and 1, 2026-10-06 ─────────────
```

<a id="vid-direct"></a>

## `graph-registry-test.mjs` shader transports

```text
and the main socket's direct `vid` channel since 2026-10-13 (board.mjs `videoDirect`)
```

<a id="site-kind"></a>

## `graph-registry-test.mjs` site kind and label

```text
A site says what it is (plans/plan-site-names.md, 2026-10-09). `kind` and
   `label` are optional, the ids do not move, and an older board that sends
   neither is still read.
```

<a id="pi-1"></a>

## `graph-registry-test.mjs` pi-1 site names

```text
The Pi's site is `pi-1` and its port names are `<medium>-<dir>`, since
   2026-10-10 (plans/plan-site-names.md §0, §4c). The room stays `studio-1`, so
   every stream address is unchanged. Six of the eleven below are NEGATIVE
   CONTROLS, written so the bug each names would take it red.
```

<a id="jack"></a>

## `graph-registry-test.mjs` JACK arm

```text
🔴 THE BAY HALF OF THE JACK ARM (plans/plan-nodes-revisited.md §3 item 3).
Twelve asserts, six of them NEGATIVE CONTROLS. Sabotaged 2026-10-11, one
fault at a time, against 95 green: `jackRows` pairing by index whatever the
counts takes 3 red; `boardGraph` defaulting `jack` on takes 4 (one of them
here, three older ones that count nodes and transports); `bay.mjs` dropping
its same-site test takes 1, the two-board control below.
```

<a id="catalogue-nodes"></a>

## `graph-registry-test.mjs` pi-1 catalogue nodes

```text
🔴 ASKED 2026-10-14 (*"Make pi announce"*, then *"Perhaps shader is better
than gpu? Should also match web:shader?"*). A node keeps its catalogue name
(`demo/shell/nodes.mjs` NODES) on every site: `pi-1:collide`, `pi-1:drums`,
`pi-1:shader`, `pi-1:camera`, each with the ports, in the order, that the
page drawing it uses. One block per node, each with its NEGATIVE CONTROL:
a board that cannot run that thing announces none of it.
```

<a id="sequencer"></a>

## `graph-registry.mjs` `pi-1:sequencer` and `drums` on a midi in

2026-10-15, `plans/plan-pi-sequencer.md` §1.4. `boardGraph({ sequencer: true })` announces `pi-1:sequencer` (kind engine): `midi-out` emitting `note` and `cc` on `shape: { channels: [10] }` (CC only for CC 123 on stop; never SysEx or a program change), `value-in` shaped `{ of: 'pattern' }`, and `value-out` shaped `{ of: 'steps' }` for the screen. `boardGraph({ drums: { circuit, drums } })` puts a copy of each map on that node's `midi-in` as `drums`, passed in like `patches` so this file stays import free. Both default off, so an older caller's graph is unchanged. MEASURED on the real board after the 2026-10-15 push: the announced graph carries `pi-1:sequencer:{midi-out,value-in,value-out}`, `pi-1:circuit:midi-in` with the circuit map `{36:60, 38:62, 42:64, 46:65}`, and `pi-1:drums:midi-in` with `gm`. `graph-registry-test.mjs` 124 before, 134 after.
