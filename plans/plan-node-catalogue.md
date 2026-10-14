# One node catalogue for the browser side

Status (2026-10-14): open. Asked: *"can we not centralize is somehow?"*, then *"do it"*.
Starts when review phase 5 (plans/plan-code-review-2026-10-14.md) has landed,
because it touches the same pages.

## Why

About 40 concept pages each declare their own nodes inline, often with ids built
from a variable (`` `${S}:synth` ``). Nothing can list what the site has without
opening every page in a browser. https://positron.studio/connect/ (local:
http://127.0.0.1:8890/connect/) needs that list, and today carries a hand list
that had already drifted: phone touch and tilt, a knob on a real Pico and a
microphone were in it and exist on no page.

The Pi already does this right: `boardGraph()` in `demo/shell/graph-registry.mjs`
is the one list of the board's nodes and ports, which the board announces.

## The shape

`demo/shell/nodes.mjs`, pure and import free so a test and the build can read it:

```js
export const NODES = {
  keys:   { kind: 'person', label: 'on-screen keys',
            ports: { 'midi-out': { emits: ['note'] }, 'midi-in': { accepts: ['note'] } } },
  synth:  { kind: 'engine', label: 'sine synth',
            ports: { 'midi-in': { accepts: ['note'] }, 'audio-out': {} } },
  ...
};
export function addNodes(bay, site, names, { deliver = {}, label = {} } = {}) { ... }
```

- A page takes what it uses: `addNodes(bay, 'web', ['keys', 'synth', 'speaker'],
  { deliver: { 'synth:midi-in': (e) => ... } })`. The page keeps its behaviour,
  the catalogue holds the shape.
- An unknown name throws, naming the catalogue, so a page cannot invent a node
  silently and the list cannot drift from the pages.
- A label override is allowed per page (`label: { synth: 'sine' }`) and recorded,
  so the catalogue knows where a node is called something else.
- Each entry can name the pages that build it (`pages: ['synth/keyboard', ...]`),
  filled by a test that imports every page's node list, not by hand.

## Steps

1. Build `nodes.mjs` from the pages' own source: one agent reads every
   `bay.addNode` / `bay.addPort` in the concept folders (and the kit's
   patchbay specimens) and writes the entries, with a test that each port
   is legal for `bay.mjs` (MEDIA, NODE_KINDS) and every name is unique.
2. Move the pages onto `addNodes`, one group at a time (synth, code, granulator,
   remote, drums, radio, video, shader, typist, history, room). Each group:
   `check-html`, the page's own self-check count through `shot.mjs`
   `?selfcheck=1` before and after, and `verify.mjs` for the manifest rows.
   The patchbay picture must be identical (node ids, ports, links).
3. `/connect/` reads `NODES` plus `boardGraph()` and draws them as it does now,
   a 4-column grid grouped by where each runs, each node linking to the pages
   that use it.
4. Then the /wish/ part: say what should play what, and the links appear.

## Not settled

- Nodes that only exist per instance (a plugged-in MIDI keyboard named by its
  port, the typists 1..n on /typist/score/): the catalogue holds the type
  (`midi`, `typewriter`) and the page names the instance.
- ~~Whether the relay and Stream belong in the catalogue~~. Decided by the
  session 2026-10-14: `cf-shout`, `cf-stream` and `cf-moq` are real nodes the
  pages declare, so they are entries (`shout`, `stream-live`, `stream-hls`,
  `moq-relay`). `cf-relay` stays drawn by `patchbay.mjs` from a link's transport.

## Step 1, done 2026-10-14

`demo/shell/nodes.mjs` holds **80 entries**, read off every `addNode` and
`addPort` in the 43 pages under `CONCEPT_DIRS` (the 42 `CONCEPTS` rows plus
`room/words`, which is off the index and still built) and the modules they call:
`synth/patch-synth.mjs`, `granulator/grain-rig.mjs`, `radio/rig.mjs`,
`drums/drum-machine.mjs`, `shell/midi-devices.mjs`, and the room pages' graph
literals that `createBayNode` fills into a bay. No page was edited.
`demo/shell/nodes-test.mjs` is 26 ok, 0 failed, 8 of them negative controls,
and runs under `node demo/shell/run-tests.mjs` (57 passed, 5 skipped, of 62).

### The shape, and where it grew past the plan

- An entry is `{ kind, label, ports, pages, labels?, node?, site?, place?, net?, match?, instance? }`.
  `labels` lists only the pages whose label differs from `label`.
- **The key is a catalogue name, not always the id.** Three unrelated nodes are
  `web:shader`, two are `web:fx`, three are `web:rec`, two are `web:player`,
  two are `web:patch`, two are `web:fader`, two are `web:keys`, and
  `web:midi` is a plugged-in keyboard on four pages and a MIDI state engine on
  `synth/dots`. So `node` carries the id segment when it is not the name
  (`'shader-dither': { node: 'shader' }`).
- **A port's key is its name**, and `dir` and `medium` come from it unless it
  says otherwise: `filter:cutoff-in` (audio) and `grains:tempo-in` (value) are
  the two ports not named `<medium>-<dir>`.
- **`optional` ports** are added only when a page passes a deliver or an
  override for them, because one type carries extra ports on some pages
  (`keys:midi-in` for its lights on 7 of 14 pages, `keys:value-in` and
  `value-in-2` on `radio/key` only, `speaker:value-in` and `clock-in` on
  `history/newsreels` only).
- **`addNodes(bay, site, names, { deliver, label, ports })` takes a third
  option the brief did not name, `ports`**: per port overrides merged onto the
  catalogue's (a shape with `names`, an `address`, a port label, `emits:
  ['note', 'cc']`), and the way to ask for an optional port or a repeat
  (`machines:value-out-3`). Step 2 needs it for the pictures to stay identical.
  A name may also be an object, `{ name: 'drum', as: 'kick', label, site }`,
  for an instance no pattern describes. Every map is keyed `<node>:<port>` or
  by full id, and a deliver, label or override naming nothing on the page
  throws, as an unknown name does, naming `demo/shell/nodes.mjs NODES`.
- **Port labels are not in the catalogue.** Pages use three conventions (none,
  `node:port`, and words such as `keyboard, the notes I play` on `room/words`),
  so a page passes its own through `ports`. Found on the way: an unlabelled
  port makes the bay's refusal read `undefined is an output`, which
  `synth/keyboard` does today. (Since the step 2 follow-up below, `portLabel:
  'node:port'` writes the second convention for a page.)

### Label disagreements

| type | default | the others |
| --- | --- | --- |
| `synth` | `saw` (recorder, timeline, dots) | `sine` (synth/keyboard), `saw synth` (room/words) |
| `collide` | `SuperCollider` (code/collide) | `SuperCollider here` (remote/collide), a tie |
| `shader` (mirror) | `mirror shader` (shader/mirror) | `mirror shader here` (shader/remote), a tie |
| `scope` | `waveform` (6 pages) | `scope` (drums/knobs, room/words), `waveform here` (remote/collide), `waveforms` (drums/remote) |
| `wave` | `wave` (tuner, key, live, tempo) | `source scope` (granulator/grains, beat), `ERR wave` and `Ida wave` (radio/blend) |
| `screen` | `original` (video/shader, webrtc, llhls, moq, drums/camera) | `picture` (synth/dots, video/camera, remote/circuit, history/newsreels), `screen` (shader/mirror, landscape), `picture here` (shader/remote), `camera` (video/recorder) |
| `knob` | the parameter's name (8 pages) | `knob` (synth/sound, video/shader, shader/mirror, shader/remote), `macro <n>` (remote/circuit), `<drum> <param>` (drums/knobs) |
| `knob-mix` | `mix knob`, kind **engine** (radio/live, tempo, key) | `wet/dry`, kind **person** (granulator/grains, beat). The one KIND disagreement on a shared id; catalogued as `knob-mix` (engine) plus the grain pages' instance of `knob` |
| `station` | the station (`Vikerraadio`, radio/blend and tuner) | with the broadcaster, `ERR Raadio 2` (radio/live, key) |
| `typing`, `paper`, `typewriter`, `fx-typewriter` | `keyboard`, `paper`, `typewriter`, `fx` | `typist <k>`, `paper <k>`, `typewriter <k>`, `fx <k>` (typist/score) |

Also, and not labels but the same question: **one thing under two names.**
`bpm` (radio/live, tempo) and `tempo` (granulator/beat) are both `tempo
detector` with `audio-in` and `value-out`; `grains` (`grain ring`) and
`granulator` (shader/landscape) are the same granulator; `radio` (grain pages,
landscape) and `player` (radio/tempo) are both `file-in` to `audio-out`.
`rec-video` is an **engine** where every other recorder is a **store**.
The kit's patchbay specimens draw a grey description per node (`INFO` in
`demo/kit/patchbay/index.html`) that disagrees with the pages too: `on-screen
keyboard`, `saw synth` and `sine synth`, `canvas`, `WebGL shader`, `notice
bar`, `chat box`. Those are descriptions rather than labels, built from link
lists with no kind, so the kit has no entries of its own.

Port field variations a page passes through `ports`: `keys:midi-out` emits
`note, cc` on code/piano and remote/piano; the `midi` device emits `note, cc`
on code/piano and remote/circuit; `camera:video-out` carries `transports:
['page']` on four pages and none on the three loopbacks; `chat`'s ports carry
`shape: { of: 'text' }` on room/chat and `transports: ['relay']` on
room/broadcast and room/history; `knob-segments` names `segments` in its shape.

### Per-instance types

`midi` (`midi`, `midi-2`, ... in plug order, labelled by the input), `knob`
(`knob-<name>`), `drum` (one per voice key, `kick` to `s63`), `scope`
(`scope-pi`, `scope-<drum>`), `wave` (`wave-<station>`), `screen` (`screen-pi`,
and a second picture is a screen instance under its own id: `dither`,
`playback`, `loopback`, `hls`, `moq`, `pixels`), `typing`, `paper`,
`typewriter` and `fx-typewriter` (`<type>-<k>` per typist on typist/score),
`machines` (one `value-out-<k>` per typist, a `repeat` port), `recording`
(`cf-r2:<id>`), `station` (`<broadcaster>:<station>`), `chat`, `admin` and
`notice` (on each tab's random `web-<4 letters>` site), and `camera` (its
label becomes the device's own name once on).

### What I could not read, or left out

- **The Pi side, as asked**, including six Pi nodes the pages declare by hand:
  `pi-1:circuit` (with a page-side `value-in` the board does not announce),
  `pi-1:collide` (with a page-side `value-in`), `pi-1:sampler`, `pi-1:drums`,
  and two that `boardGraph()` has no node for at all: `pi-1:camera`
  (remote/circuit) and `pi-1:shader` (`v3dpipe on the Pi, simulated`,
  shader/remote; the board's own node is `gpu`). Step 3 cannot get those two
  from `boardGraph()`.
- **The relay and Stream, as asked, but the brief's reason holds for
  `cf-relay` only.** `patchbay.mjs` draws `cf-relay:<room>` from a link's
  transport; `cf-shout:<mount>` (radio/blend, tuner, live, key),
  `cf-stream:live` (video/webrtc), `cf-stream:hls` (video/llhls) and
  `cf-moq:relay` (video/moq) are declared by the pages like any node. Left out
  of `NODES`; whether they belong is still the open question below.
- **Runtime-only names**: Faust's and Collide's knobs come from the compiled
  program, the drum voices from `voices.mjs` and the sample bank, the MIDI
  devices and the camera's label from the browser, and a recording's or a
  relay's `address` from the page. The catalogue holds the types; the instance
  lists in `instance` are what the source says today.
- **The room pages** do not call `addNode`: their nodes are graph literals that
  `createBayNode`'s registry fills into a bay, and other tabs' nodes arrive at
  run time. Read from the literals.
- **The kit's specimens** include archived and demo ids (`web:webgl`,
  `web:left`, `web:editor`, `fau:fau`, `nola:nola`, `here:*`, `away:keys:out`)
  that no concept page builds; not catalogued.
- `grain-rig.mjs` can build an output `scope`, and both pages pass
  `outputScope: false`, so no page builds it; not listed.
- `pages` was filled by reading, not by a test importing every page's node
  list as the plan proposed; that test needs the pages on `addNodes` first,
  which is step 2.

## Step 2 follow-up, done 2026-10-14: one pass over what the step-2 agents collected

All 43 pages build their browser nodes with `addNodes()` (commits 68616632,
59e6ec22, 56f71872, 7fffd7f2). The four step-2 agents each listed catalogue
changes they could not make from a page; they landed together in
`demo/shell/nodes.mjs`, and `nodes-test.mjs` grades each.

### The order rule (decided by the session)

**A node's ports come together with the node.** `addNodes` adds a node and then
its ports in the entry's port order, so `bay.ports()` lists node by node and the
details table's rows and the SVG's element order follow it. A port added later
to a node that already exists (`addPorts`) lands after every port added before
it. Where a page drew one node's ports in another order, the ENTRY's order was
changed to the page's, never the page's picture:

| entry | port order |
| --- | --- |
| `typewriter` | value-in-3, value-in, value-in-2, file-in, audio-out |
| `fx-typewriter` | value-in-2, audio-in, value-in, audio-out |
| `keys` | midi-out, value-in, value-in-2, midi-in |

Every other page using those types adds a subset whose relative order is
unchanged (typist/typewriter, playback and score; the 13 other keys pages add
at most midi-out and midi-in).

### What the catalogue gained

- `addNodes(..., { portLabel: 'node:port' })` labels each port it adds with its
  own `<node>:<port>`; a label in `ports` still wins. It replaced the repeated
  `own(...)` and `labelled(keys)` helpers and drum-machine.mjs's inline map
  (code/faust, collide, plaits, synth/patch-synth.mjs, remote/circuit,
  collide, piano, drums/remote, camera, drum-machine.mjs, shader/remote, and
  the same hand map on shader/mirror, video/shader and video/recorder).
  shader/landscape and the radio pages use word labels and keep passing them.
- `relabel(bay, id, label)`: the camera taking its device's name on the six
  video pages and drums/camera.
- `addPorts(bay, site, { '<node>:<port>': { label, deliver, ... } })` for a
  port on a node addNodes already built. It finds the node's type from what
  addNodes recorded for that bay, so `shader` resolves to whichever of the
  three types the page built. granulator/beat's `grains:tempo-in` and
  `wave:value-in-2` use it.
- Variants, named port fields an entry offers: `{ name: 'keys', variant: 'cc' }`
  (midi-out emits note and cc: code/piano, remote/piano), `{ name: 'camera',
  variant: 'page' }` (video-out rides `page`: video/camera, shader, recorder,
  drums/camera), `{ name: 'knob', variant: 'unshaped' }` (an empty shape:
  shader/landscape). Each entry lists the pages in `variantPages`.
- The hops: `shout` (`cf-shout:<mount>`, `{ name: 'shout', as: st.mount }`),
  `stream-live` (`cf-stream:live`), `stream-hls` (`cf-stream:hls`),
  `moq-relay` (`cf-moq:relay`). radio/blend, tuner, live, key and video/webrtc,
  llhls, moq take them from the catalogue; /connect/ reads them from `NODES`
  in place of its own `STREAMS` list.
- **No name may read as an instance.** `knob-mix` and `knob-volume` were
  entries AND knob instances (`knob-<name>`), and `typeOf` silently picked the
  entry. They are `mix-knob` and `volume-knob` now (ids unchanged, `node:
  'knob-mix'`), so `typeOf('knob-mix')` is a knob called mix; `typeOf` throws
  on a name that is both, and the test refuses one in the catalogue.
  `midi-<n>` matches a number only, so `midi-state` is not a MIDI keyboard.

### Uncaught errors mark a page failed

A throw from `addNodes` inside a page's module removed the patchbay while
`__demo.failed` stayed null and the self-check read green with fewer asserts
(found on grain-rig). `demo/shell/shell.mjs` now listens for `error` and
`unhandledrejection` from the moment it loads, for every page: an error after
`mount()` goes to `d.fail()`, one before is kept and handed to it, and one
that stops `mount()` ever running still publishes a `__demo` with `failed` set.
`guard(d)`, which ten archived pages call, is now a no-op on top of that.

### Left inline, and why

- The Pi side: `pi-1:*` nodes come from `boardGraph()` or are drawn by the page,
  as step 1 decided.
- The room pages' graph literals, which `createBayNode` fills from what other
  tabs announce.
- drums/drum-machine.mjs's grouped view (`GID`), a picture of the bay rather
  than a bay.

## Open questions for the owner

- **`pi-1:camera` (remote/circuit) and `pi-1:shader` (shader/remote) are not in
  `boardGraph()`.** The board announces `gpu`, not `shader`, and no camera
  node at all; both pages declare the node by hand, and /connect/ cannot show
  either. Should the board announce them (a change to `graph-registry.mjs` and
  `rig/board/`), or do the pages keep drawing them? Not changed here.
