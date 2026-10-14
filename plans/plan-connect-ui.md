# plan-connect-ui: the working interface builds itself from the patch

Status (2026-10-14): open. A plan only; no code was changed.

> Asked 2026-10-14: *"we are missing actual ui that builds based on patchbay.
> plan it."* (BACKLOG.md, Open, line 5.)

https://positron.studio/connect/ (local http://127.0.0.1:8890/connect/,
`demo/connect/index.html`, 562 lines at commit `911bfbd0`) draws every node type
the site builds (80 from `demo/shell/nodes.mjs`, 2 from the Pi's `boardGraph()`,
4 Cloudflare hops), lets a person link them by an example pill (the wish worker
proposes, a person confirms) or by pressing an out port and then an in port, and
moves linked nodes into a patchbay picture. **Nothing runs.** Linking keys to a
synth to the speakers draws three boxes; no keyboard appears and nothing sounds.

Every fact below was read from the tree on 2026-10-14. Counts were taken with
the command beside them. Nothing was measured in a browser; where a claim is a
design rather than a reading it says so.

## 0. The answer

1. **Every node type gets a RUNTIME: a face, an engine and its `deliver`
   functions, built by a factory keyed by the catalogue name.** The factories
   live in a new `demo/shell/node-runtime.mjs` registry beside `nodes.mjs`,
   never inside it, and each one lazily imports the kit or group module that
   already does the work. `nodes.mjs` stays pure and import free.
2. **A link is what calls a runtime into being.** After every link change one
   reconcile step compares the nodes that have at least one link with the
   runtimes that exist, creates the missing ones, closes the orphaned ones, and
   then re-routes: light media are already real (`bay.send` and `deliver`),
   audio inside the tab becomes `connect()` between two engines in ONE shared
   AudioContext, video inside the tab becomes an element handed from a source
   to a canvas or a texture. Across sites the transports and openers that exist
   carry it.
3. **The real size of the job is engines, not faces.** Of 80 types, 33 faces
   are kit pieces today, 3 live in a group module, 44 need no face of their own,
   and **none** exists only inside one page. Engines: 10 are kit pieces, 29 live
   in a group module and need an adapter, **23 exist only inside a page** (often
   copied, the sine synth five times), and 18 need none (§5).
4. **The first slice is three runtimes and one router**: `keys`, `synth`,
   `speaker`, and the audio router `patch-synth.mjs` already wrote. That makes
   *"let the keys play the synth"* sound (§6).

This builds on, and in one place reverses, earlier plans (§1). The reversal is
the owner's to confirm, §7 decision D1.

## 1. What was planned before, and what this builds on

Read before writing: `plan-patchbay.md`, `plan-universal-routing.md`,
`plan-routing-migration.md`, `plan-node-catalogue.md`, `plan-nodes-revisited.md`,
`plan-node-kind.md`, `plan-wish-dawless.md`, `plan-synth-patch.md`,
`plan-patch.md`. `grep -rniE "builds? (it)?self|node-runtime|runtime registry"
plans/` finds no earlier plan for a UI that builds itself from links.

| earlier plan | what it settled that this keeps | what this changes |
| --- | --- | --- |
| `plan-patchbay.md` §0 | *"Build a control plane, not a signal path."* The bay carries MIDI and other small messages and NEGOTIATES heavy media. | nothing; audio still never rides the bay (§3) |
| `plan-patchbay.md` §5 | a model proposes, a person confirms | nothing; a face appears only after a confirmed link |
| `plan-synth-patch.md` §2, §5 | the router: *"One router reads `bay.links()` after every change and connects exactly what is held"*; modules as factories that `add themselves to a bay` | it was built as one monolith (`createSynth` in `demo/synth/patch-synth.mjs`, 306 lines), not as per-module factories; slice 2 splits it |
| `plan-node-catalogue.md` | one catalogue, `addNodes`, *"the page keeps its behaviour, the catalogue holds the shape"* | the behaviour gets a second, shared home for /connect/ only; the pages keep theirs (§2c) |
| `plan-routing-migration.md` §3.2 | openers dispatch on `session.transport`, in `demo/shell/openers.mjs` | reused for every cross-site link (§3c); its link-scoped faces are not (§2d) |
| `plan-routing-migration.md` §3.7 | the owner on `/stage/`: *"i do not about patchbay, perhaps just visual indication of picture happening"*; *"embeds no patch view"* | not touched: that was about pages getting a patch view. This is a patch view getting pages |
| `plan-nodes-revisited.md` §4 | *"No general pipeline composer (§5.6). Concepts show one idea per page; the patchbay is a view of real links, not a programming environment."* | **reversed for /connect/**: a patch that builds a working interface is a pipeline composer. Owner decision D1 |

The closest prior art in code is `demo/shell/openers.mjs` (511 lines). On the
archived https://positron.studio/patchbay/ an opener already builds a face when
a link is opened: the `keys` opener makes a `createKeyboard` and appends it to
`host` (`openers.mjs` around line 446), the `video` opener a `createVideoPanel`
(around line 268). That is the idea of this plan at the wrong grain: a face per
LINK, so two links out of the keys would draw two keyboards. Here a face belongs
to a NODE and outlives any one of its links.

## 2. The model

### 2a. What a node type needs beyond its ports

| part | what it is | today |
| --- | --- | --- |
| **face** | the kit component a person sees or touches: `createKeyboard` (keyboard.mjs), `createKnob` in a `createKnobGrid` row, `createWaveShape` (synth-view.mjs) for a scope, `createVideoPanel` for a picture, `createCodeBox`, `createStepGrid`, `createChatCompose` | 33 types have one in `demo/shell/`; §5 |
| **engine** | what makes sound, picture or values: a WebAudio graph, a worklet, wasm (Plaits, scsynth via `vendor/supersonic.js`, Faust), a WebGL program, a `getUserMedia` stream, a fetch of a file | scattered: kit, group modules, and 23 page-only; §5 |
| **deliver** | per in-port, what an arriving light event does: `synth:midi-in` plays a note, `keys:midi-in` lights a key, `filter:value-in` sets `cutoff` | real today on every concept page; on /connect/ no port has one, because the page adds ports with `addNodes(b, site, [...], { ports })` and no `deliver` |
| **heavy ends** | per heavy port, the WebAudio node or AudioParam it is (`audio-out`, `audio-in`, `cutoff-in`), or the element it is (`video-out`, `video-in`) | each page answers this privately inside its own `route()`; 21 files carry one (`grep -lE "function route\(|function audio\("`) |

### 2b. The contract of one runtime factory (a design, not built)

```js
// demo/shell/node-runtime.mjs
export const RUNTIMES = {
  keys:    { slot: 'keys',    load: () => import('./rt-keys.mjs') },
  synth:   {                  load: () => import('./rt-synth.mjs') },
  speaker: {                  load: () => import('./rt-speaker.mjs') },
  // ...
};
// A type with no runtime yet says why, so /connect/ can say it in words.
export const NOT_YET = { key: 'the key detector lives only in radio/key, lift it first', ... };

// What a factory returns, built with NO AudioContext and NO fetch:
// {
//   face?:   HTMLElement,          // into its slot (§4), null for a pure engine
//   deliver: { 'midi-in': fn },    // bound onto the bay's ports by the runtime
//   start?(ctx):  Promise,         // first press: make WebAudio nodes, boot wasm, fetch samples
//   audio?:  { out(port) -> AudioNode, in(port) -> AudioNode | AudioParam },
//   video?:  { out(port) -> HTMLVideoElement | HTMLCanvasElement, in(port, el | null) },
//   heard(): number,               // what arrived at the far side, for asserts and lit wires
//   close(): void,                 // stop voices, disconnect, remove the face, drop a lease
// }
```

Plus two pure functions, graded in node with no browser:

- `plan(links, have)` answers `{ create: [nodeId], close: [nodeId] }`: a node
  needs its runtime while it holds at least one link.
- `routes(links, bay)` answers the heavy edges to wire inside this tab, from
  each link's `session.transport` (`webaudio` and `page` are the two
  `MACHINE_ONLY` transports that stay in a tab, `bay.mjs:155`).

### 2c. Where it lives, weighed

| option | for | against |
| --- | --- | --- |
| A. factories inside `nodes.mjs` | one file per fact | breaks the rule written at its top, *"Pure and import free, so a test and the build can read it"*; `nodes-test.mjs` runs in node, where a factory that imports `keyboard.mjs` or `scsynth.mjs` cannot load |
| **B. `node-runtime.mjs`, a parallel registry keyed by catalogue name (recommended)** | keeps the catalogue pure; one test can require that every `NODES` key is in `RUNTIMES` or `NOT_YET` (the same drift guard `nodes-test.mjs` is for shapes); lazy `import()` per type, so a visit loads none of the engines | a second registry that can drift from the first, which the test above is for |
| C. each page's own module | the behaviour is already there | concept pages are inline `<script type="module">` and cannot be imported; only the group modules (`patch-synth.mjs`, `grain-rig.mjs`, `drum-machine.mjs`, `plaits-voice.mjs`, `collide-voice.mjs`, `sc-sampler.mjs`, `radio/rig.mjs`, `typist/sampler.mjs`) can, and they cover 29 of 80 |

**B, with one rule: a runtime adapter wraps the existing module, it never
copies an engine.** A page-only engine (23 of them) is LIFTED into
`demo/shell/` first, and its page moves onto the lifted copy in the same change,
so there is one source and not a sixth sine synth. `LAYOUT.md` §"Where does a new
thing go?" item 3 puts *"something two pages both need"* in `demo/shell/`, and
/connect/ plus the source page is two. Whether the adapters are one file each
(`rt-<type>.mjs`) or a few by medium is a file count, not a design; check how
`workers/view/build.mjs` enumerates `demo/shell/` before adding a subfolder.

**The concept pages keep their hand wiring.** Moving 40 pages onto the runtime
would delete the 21 private routers, and it would also touch every page the
owner reads; *"do not willy-nilly rm stuff from UI"* (positron-concepts). It is a
later question, decision D3.

### 2d. Why a face belongs to a node, not to a link

- Two links out of `web:keys:midi-out` (to a synth and to a recorder) are one
  keyboard. `openers.mjs` would draw two.
- A face that appears "when something feeds it" (a scope, a screen) is the node
  coming alive on its FIRST link, in or out, and going away on its LAST.
- The deliver binding is per port, and a port is a node's.

### 2e. Binding `deliver` without changing `bay.mjs`

`bay.addPort` stores the port object it is handed (`bay.mjs:1032`, `ports.set(p.id,
{ ..., ...p })`) and `send` calls `dst.deliver?.(e, l, meta)` on that object
(`bay.mjs:1580`). So the runtime can set `bay.port(id).deliver = fn` on create
and delete it on close, today, with no edit to a shared file. It is an
undocumented contract; a two-line `bay.setDeliver(portId, fn)` is the clean
form, and `bay.mjs` is a shared file one agent changes at a time
(positron-concepts). Recommended: the helper in `node-runtime.mjs` first, the
bay method when somebody is in `bay.mjs` for another reason.

## 3. Moving media

### 3a. Light media: already real

`midi`, `value`, `clock`, `program` ride `bay.send(portId, ev)` and arrive at
the far port's `deliver` along a link the bay holds (`bay.mjs:1568`). A transform
on a MIDI link (`transpose`, `channel`) works with no new code. The only new
thing is that /connect/'s ports get their `deliver` from a runtime (§2e).

⚠️ The value class guard does not exist: *"THE CLASS GUARD IS MIDI ONLY"*
(`bay.mjs` above `send`), so a `value-in` cannot refuse a parameter it lacks. A
runtime's `deliver` ignores an unknown name and logs it once, as
`patch-synth.mjs` `setParam` does (`told`).

### 3b. Heavy media inside one tab

**Audio: one AudioContext, one router.**

- The context is `sharedAudio({ sampleRate: 48000 })` from `demo/shell/audio.mjs`,
  made on the first press that needs sound (§4b). 48000 because
  *"PLAITS REQUIRES IT AND NOTHING ELSE HERE MINDS"* (its header), and because
  `board.mjs` refuses to play the Pi's PCM into a context at another rate
  (`board.mjs:304`).
- ⚠️ `audio.mjs` has ONE OWNER at a time: `claim(owner)` stops the previous
  owner. On /connect/ the owner is the runtime as a whole, never each engine,
  or the second engine to start would stop the first.
- 🔴 **NODES FROM TWO CONTEXTS CANNOT BE CONNECTED**, and six engine modules
  make their own today (`grep -cE 'new AudioContext'`): `code/plaits-voice.mjs`
  (line 91), `granulator/grain-rig.mjs` (line 568), `code/sampler.mjs`,
  `code/sc-sampler.mjs`, `radio/rig.mjs`, `drums/drum-machine.mjs` (which also
  takes a `context` option). `scsynth.mjs` (`bootScsynth({ audioContext })`),
  `board.mjs` (`audioContext`), `collide-voice.mjs`, `typist/sampler.mjs`,
  `mp3-stream.mjs` and `tuner-mix.mjs` already take one. Each of the six needs
  the same option before its adapter can join a chain. Small per module, but it
  is the step that turns "connect" from a drawing into a sound.
- The router is `route()` from `patch-synth.mjs:267`, lifted: disconnect every
  runtime's audio outs, then for every link whose session is `webaudio`, connect
  `from.audio.out(port)` to `to.audio.in(port)`, where `in` may be an AudioParam
  (`filter:cutoff-in` is the filter's `detune`, plan-synth-patch §3 option A). An
  unlinked edge goes silent because everything was disconnected first.
- `speaker:audio-in` is a master gain into `ctx.destination`. A scope's
  `audio-in` is an AnalyserNode pulled by a silent sink, *"an analyser nothing
  pulls reads silence"* (`patch-synth.mjs:228`, learned on /radio/blend/).
- The lit audio wire in the picture reads a level measured at the far end, not
  the fact that a link exists (positron-ui, gate feedback on outcome).

**Video: an element handed along the link.**

- A video source's `video.out(port)` answers an element: an `HTMLVideoElement`
  for a camera, an `HTMLCanvasElement` for a shader, the Pico or a player. Both
  are what `drawImage` and `texImage2D` take, so a screen and a shader can read
  either with no conversion.
- A sink's `video.in(port, el)` is handed that element on link and `null` on
  unlink. A screen draws it into its own canvas each frame, contained, with
  `drawCamera(ctx, el, w, h, { scrim: 0 })` from `pattern.mjs` exactly as
  /video/camera/ does; a shader binds it as its texture.
- ONE `requestAnimationFrame` loop for the whole runtime, running only while a
  video link exists and its source has delivered a frame
  (`requestVideoFrameCallback`, as /video/camera/ counts them). Frames are
  counted at the screen, which is the far side.

**File inside one tab:** `store:file-out -> player-video:file-in` is a handle
passed on link (IndexedDB, `indexeddb` transport). Late; only /video/recorder/
needs it.

### 3c. Across sites, with what already exists

| link | transport (from `TRANSPORTS`) | what opens it today | on /connect/ |
| --- | --- | --- | --- |
| `web:keys:midi-out -> pi-1:circuit:midi-in` | light, `relay` (or `datachannel`, `demo/remote/path.mjs`) | `createBoard` and `midi.send`, as `/remote/circuit/`'s `toCircuit` and openers' `keys` do | the Pi node's runtime binds a `deliver` that sends over the board, after Join |
| `pi-1:circuit:audio-out -> web:speaker:audio-in` | `relay` PCM (`internet-one`) | `board.mjs` playout worklet with an `input.want` lease (`createLease` in openers.mjs) | the board's playout into the SHARED context, connected by the router like any engine out |
| `pi-1:*:video-out -> web:screen:video-in` | `relay-h264` | openers' `video` and `board-video.mjs` (WebCodecs) | the decoded canvas is the element handed to the screen |
| `web:camera:video-out -> cf-stream:live:video-in`, `cf-stream:live:video-out -> web:screen:video-in` | `whip` then `whep` | `demo/video/loopback.mjs` and `live.mjs` on /video/webrtc/ | late; billed per minute delivered from 2026-10-15 (positron-streaming) |
| `cf-r2:recording:file-out -> web:radio:file-in` | `https` (`READS`) | `grain-rig.mjs` `createSources` | a fetch of our own bucket, on a press |
| `err:station:audio-out -> cf-shout:relay:audio-in` | `https` through cf-shout | `mp3-stream.mjs` | an `external` node: the bay already refuses it without `{ consent: true }` from a person's own press, and /connect/ already passes `e.isTrusted` |

## 4. Layout and lifecycle

### 4a. Where faces go

positron-compose §P: *"THE COLUMN IS THE PATCH, IN ONE ORDER"*: picture, knob
row, code box, keys, patchbay. /connect/ today stacks `say` (the pills and the
proposal rows), `pic` (the patchbay picture) and `groups` (the grid of unlinked
nodes) through `d.stack.add(say, pic, groups)`. Proposed:

1. **the pills and the proposal rows**, as now, because a person starts there;
2. **the faces**, one block, its parts in the concept order, each part full width
   at the shell's `--pos-gap`:
   - pictures: screens (`createVideoPanel`), scopes (`createWaveShape`), the
     wave and grain views, the OLED, the paper, the notice; one per node, each
     full width (*"no half col scope, scope is always full w"*);
   - ONE knob row: every knob, fader and dial face in one `createKnobGrid({ row:
     true })` that scrolls sideways and never wraps; a knob that goes keeps its
     box until the row is rebuilt between links, never while a person turns one;
   - code boxes (`createCodeBox`, `CODE_ROWS` lines);
   - pickers and steppers (`patch`, `pick`, `machines`);
   - keys (`createKeyboard`, C3 to A4 as on /synth/keyboard/);
   - step grids and transport bars (`sequencer`, `timeline`, `rec`).
3. **the patchbay picture**, as now;
4. **the grid of unlinked nodes**, as now.

Each face carries a small `.cc-h` heading naming its node the way the patchbay
box names it (`web:synth`, or the label), so a reader can match a face to its box
without a second picture. The faces block is `hidden` while empty, through the
component's `display: none` (positron-compose §7, *"empty paints nothing"*).

A face that appears or leaves moves everything below it. That is a press away
from the person who caused it, which is a reflow on an event rather than on a
clock (positron-ui, *"NOTHING THAT REDRAWS EVERY FRAME MAY CHANGE HOW MUCH ROOM
IT TAKES"*, is about clocks), so it is allowed. Look at it at 375 and 1280 with
`node demo/shot.mjs connect 375 1280` before calling a slice done.

### 4b. Lifecycle

- **Create on the first link that needs it, close on the last unlink.** The
  reconcile step (`plan()`, §2b) runs after `connect()` and `removeLink()`,
  which is where /connect/ already calls `redraw()`. Creating a runtime builds
  its face and binds its `deliver`s, with no AudioContext and no fetch;
  `patch-synth.mjs` already works this way (*"NOTHING OPENS ON IMPORT ... until
  `start(ctx)` is handed an AudioContext"*).
- **The visit rule.** A visit opens nothing: no runtime exists until a link does,
  and a link is made by a press. The engine's `start(ctx)` (the AudioContext,
  the Plaits or scsynth wasm, samples from R2, the camera) runs on a press:
  recommended, the first press ON A FACE that needs it (a key, a play, a Start
  camera), because a context made for a link that is then removed is a sound
  device opened for nothing. Decision D4.
- **The MIDI prompt is not on a visit either.** /synth/keyboard/ calls `askMidi()`
  on load. On /connect/ the `midi` runtime asks on its creation, which is a
  press.
- **A remote node (the Pi).** Its runtime's face is a presence badge from
  `createBoard` plus a Join button, nothing more. A link to a `pi-1:` port opens
  nothing; Join opens the room, the lease and the playout. `roomFor({ slug:
  'connect' })` in `bay-node.mjs:78` gives a private `connect-test-<6>` room under
  `?selfcheck=1`, and the check asserts the room is not `studio-1`, as
  /patchbay/ does (`demo/patchbay/index.html:1000`). Never `studio-1` from a
  check.
- **Close is real.** A synth's close releases its voices; a board's close drops
  its lease (*"The board drops a capture nobody renews"*, `RENEW_MS` 20 s); a
  camera's close stops every track. The last runtime to close releases the
  shared context, which suspends it and never closes it (`audio.mjs`, *"SUSPEND,
  NEVER CLOSE"*).

## 5. Inventory: every type in `nodes.mjs`

K = a kit piece in `demo/shell/` (or root `timeline/`, which the build serves).
G = a module shared by pages of one concept folder, importable but shaped for
those pages. P = only inside one page, or copied between pages. `none` = this
type needs none (its picture is another node's, or it has no behaviour of its
own).

| type | kind | face | engine |
| --- | --- | --- | --- |
| keys | person | K keyboard.mjs | none |
| typing | person | G typist/paper.mjs (the paper is where typing lands) | none |
| midi | device | none | K midi-devices.mjs |
| knob | person | K knob.mjs, knob-grid.mjs | none |
| knob-volume | person | K knob.mjs | none |
| knob-mix | engine | K knob.mjs | G radio/rig.mjs |
| fader | person | K slider.mjs | none |
| dial | person | K slider.mjs | none |
| patch | person | K picker.mjs | P (the program list is each instrument page's) |
| pick | person | K stepper.mjs | none |
| machines | person | K stepper.mjs | none |
| code | person | K code-box.mjs | none |
| invert | person | K button-group.mjs | none |
| scale | person | K button-group.mjs | none |
| chat | person | K chat-ui.mjs | K bay-node.mjs (the room) |
| admin | person | K chat-ui.mjs | K bay-node.mjs |
| synth | engine | none | P, five copies (synth/keyboard sine; recorder, timeline, dots saw; room/words) |
| osc | engine | K synth-view.mjs wave shape | G synth/patch-synth.mjs, one monolith |
| filter | engine | K synth-view.mjs filter view | G patch-synth.mjs |
| amp | engine | K synth-view.mjs envelope view | G patch-synth.mjs |
| lfo | engine | K synth-view.mjs wave shape | G patch-synth.mjs |
| fau | engine | K code-box.mjs, param-knobs.mjs | P, on K faust.mjs (code/faust, 352 lines) |
| collide | engine | K code-box.mjs | G code/collide-voice.mjs |
| plaits | engine | none | G code/plaits-voice.mjs (own AudioContext) |
| sampler | engine | none | G code/sc-sampler.mjs (own AudioContext) |
| midi-state | engine | none | P synth/dots |
| pico | device | K oled-view.mjs | K pico.mjs, pico-worker.mjs |
| shader | engine | K code-box.mjs | P shader/mirror, copied in shader/remote |
| shader-dots | engine | none | P synth/dots |
| shader-dither | engine | none | P video/shader |
| shader-landscape | engine | none | K scan-field.mjs |
| pixelate | engine | none | P drums/camera |
| radio | engine | none | G granulator/grain-rig.mjs `createSources` |
| player | engine | none | G radio/rig.mjs |
| player-video | engine | none | G timeline/media-master.mjs |
| level | engine | none | G radio/rig.mjs |
| grains | engine | K grain-scope.mjs | G grain-rig.mjs, grain-ring.mjs, on K scsynth.mjs |
| granulator | engine | none | K radio-gran.mjs |
| patch-values | engine | none | G grain-rig.mjs |
| bpm | engine | none | G radio/tempo.mjs |
| tempo | engine | none | G radio/tempo.mjs (the same detector as bpm) |
| key | engine | none | P radio/key |
| fx | engine | none | P room/words |
| fx-click | engine | none | G radio/rig.mjs |
| fx-typewriter | engine | none | G typist/machines/fx.mjs |
| typewriter | engine | none | G typist/sampler.mjs |
| autoplay | engine | none | P radio/key/autoplay.mjs (one page's own module) |
| bass | engine | none | P radio/key |
| pad | engine | none | P radio/key |
| mixer | engine | none | P radio/key |
| xfade | engine | none | P, two copies (remote/collide, drums/remote) |
| blend-fader | engine | none | P radio/blend |
| noise | engine | none | K tuner-mix.mjs `pinkNoise` |
| tuner | engine | none | K tuner-mix.mjs `createMix` |
| sequencer | engine | K step-grid.mjs | G drums/drum-machine.mjs |
| drum | engine | none | G drums/voices.mjs, drum-machine.mjs |
| mix | engine | none | P drums/remote |
| timeline | engine | K transport-bar.mjs, timeline strip | G timeline/media-master.mjs |
| rec-video | engine | none | P video/recorder (MediaRecorder) |
| rec | store | K table.mjs | P, four copies (synth/recorder, timeline, dots; room/words) |
| rec-text | store | K table.mjs | G timeline/logdeck.mjs, K text-adapter.mjs |
| looper | store | K transport-bar.mjs | P code/piano |
| store | store | none | P video/recorder (IndexedDB) |
| recording | store | none | G grain-rig.mjs (an https read of R2) |
| piano-samples | store | none | G code/sampler.mjs, sc-sampler.mjs |
| rhodes-samples | store | none | G code/sampler.mjs |
| typewriter-samples | store | none | G typist/sampler.mjs |
| history-store | store | none | K bay-node.mjs and the store worker |
| speaker | screen | none | none (a gain into `ctx.destination`) |
| scope | screen | K synth-view.mjs `createWaveShape` | P, an AnalyserNode each page wires itself |
| wave | screen | K grain-scope.mjs | none |
| display | screen | G radio/rig.mjs | none |
| screen | screen | K video-panel.mjs | none |
| oled | screen | K oled-view.mjs | none |
| paper | screen | G typist/paper.mjs | none |
| notice | screen | K chat-ui.mjs | none |
| camera | device | none (its picture is a screen's) | P, `getUserMedia` copied on five pages; G video/loopback.mjs for two |
| station | external | none | K mp3-stream.mjs through cf-shout |
| newsreel | external | none | G timeline/media-master.mjs |
| err-radio | external | none | G timeline/media-master.mjs |

**The numbers** (80 rows, counted by hand off the table above):

| | K | G | P | none |
| --- | --- | --- | --- | --- |
| face | 33 | 3 | **0** | 44 |
| engine | 10 | 29 | **23** | 18 |

What that means for the size of the job:

- **Faces are nearly free.** Every face a type needs already exists as a kit
  component. The work is binding: about ten to thirty lines per face to turn
  its callbacks into `bay.send` and its in-ports into `deliver` (estimate, from
  /synth/keyboard/'s binding, which is about twelve).
- **18 engines need nothing and 10 are kit pieces**: 28 types can run with only
  an adapter.
- **29 engines are in group modules** shaped for their pages: each needs an
  adapter to the §2b contract and, for six modules, the AudioContext option
  (§3b). `patch-synth.mjs` must be split into four module factories.
- **23 engines are page-only and must be lifted before /connect/ can run them**,
  each one a change to its source page. The biggest single source is
  `radio/key` (key, autoplay, bass, pad, mixer: five, in a 951 line page).
- The two Pi nodes /connect/ shows (`pi-1:circuit`, `pi-1:sampler`) and the
  four Cloudflare hops are not in `NODES`; their runtimes are the board and
  openers adapters of §3c.

## 6. Increments, smallest first

Every check below runs under `?selfcheck=1`, opens no real device, reaches no
external server and never joins `studio-1`. /connect/ has no manifest row
(`grep connect demo/manifest.mjs` finds only prose), so `demo/verify.mjs` does
not grade it; the checks are its own `check()` asserts, run through
`node demo/shot.mjs connect` with `?selfcheck=1`, plus node tests for the pure
parts. ⚠️ **`demo/verify.mjs` launches Chrome with
`--autoplay-policy=no-user-gesture-required` (`verify.mjs:243`) and
`demo/shot.mjs` does not** (`grep autoplay demo/shot.mjs` finds nothing), so a
level assert needs a running context: either the flag in shot.mjs, a manifest
row, or the assert reads an `OfflineAudioContext` render. Unsettled, §7 U2.
Each slice also reports the assert count before and after (positron-verify).

### Slice 0. Groundwork, one agent, before any page work

- `demo/shell/node-runtime.mjs`: `RUNTIMES`, `NOT_YET`, `plan()`, `routes()`,
  `createRuntime({ bay, host, log })` with `sync()` and `close()`, the deliver
  helper (§2e), the audio router lifted from `patch-synth.mjs:267`.
- `patch-synth.mjs` moves onto the lifted router in the same change, so there is
  one router, and /synth/sound/ keeps its count.
- `node-runtime-test.mjs` under `run-tests.mjs`: every `NODES` key in `RUNTIMES`
  or `NOT_YET`; `plan()` creates on a first link and closes on a last unlink;
  `routes()` keeps a `webaudio` edge and skips a `relay` one. Negative controls:
  a sabotaged `plan()` that never closes goes red.
- /connect/ gains the faces block (hidden, empty) and calls `sync()` from
  `redraw()`.

### Slice 1. *"let the keys play the synth"* actually sounds

- Lift the synth voice into `demo/shell/` (one file, the sine and the saw as an
  option) and move the five pages that copy it onto it, one of them at a time
  with its own count before and after. Or, smaller: lift only /synth/keyboard/'s
  sine and leave the four saw copies for later (decision D5).
- Runtimes: `keys` (face `createKeyboard`, `keys:midi-in` lights a key, ignores
  `how === 'midi'`), `synth` (engine, `synth:midi-in` plays, `audio.out`),
  `speaker` (master gain).
- Asserts:
  - a visit: no face, `contexts() === 0` from `audio.mjs`;
  - the example pill *"let the keys play the synth"*, both rows confirmed: one
    keyboard face exists, one synth runtime, no second keyboard;
  - a key pressed through the keyboard's own handler: `synth:midi-in` heard 1;
    the speaker's analyser reads a level above the floor while held and back
    under it after release (needs U2);
  - **negative**: unlink `synth:audio-out -> speaker:audio-in`: the key is still
    heard by the synth and the speaker reads silence;
  - unlink `keys -> synth`: the keyboard face is gone and its box is back in the
    grid;
  - a key pressed with no link to the synth: heard 0.

### Slice 2. Knobs into value-ins

- Split `patch-synth.mjs` into `osc`, `filter`, `amp`, `lfo` factories (each
  with its synth-view picture as its face), keeping /synth/sound/ unchanged.
- The knob question first (decision D2): one knob INSTANCE per parameter
  (`web:knob-cutoff`, the eurorack shape the owner asked for on
  `plan-synth-patch`: *"Per knob. Lets go eurorack :)"*), made when a person
  links the `knob` type box to a `value-in` and picks a name from the port's
  `shape.names`. Plaits and Collide declare no names in the catalogue (`PARAM`
  without `names`), so their knobs wait for the engine to boot and say its list.
- Asserts: a knob turned through its own `onInput` moves the engine's parameter
  (`filter.frequency.value` read back after the glide); a knob with no link
  moves nothing; an unknown name is logged once and ignored.

### Slice 3. A scope appears when something feeds it

- `scope` runtime: `createWaveShape` face, AnalyserNode `audio.in`, pulled by
  the silent sink.
- Asserts: linked from the synth with a key held, the scope's buffer is not all
  zero; unlinked, the scope's face is gone; linked but fed by nothing sounding,
  the buffer is all zero (the negative control).

### Slice 4. The camera and a shader

- Lift `getUserMedia` start, stop and the camera picker out of /video/camera/
  into `demo/shell/` (five pages copy it); `screen` runtime on
  `createVideoPanel`; `shader-dither` lifted from /video/shader/ as an engine
  with `video.in` and `video.out`; then the mirror shader from /shader/mirror/
  with its code box and its `segments` knob.
- Asserts, with Chrome's fake camera (`--use-fake-device-for-media-stream`,
  which verify.mjs passes only for some pages, `verify.mjs:248`): a Start press
  on the camera's face, frames counted at the screen grow; camera ->
  dither -> screen, the screen's pixels differ from the source's; unlink, the
  frame count stops and every track is stopped. No WHIP, no Stream.

### Slice 5. The Pi

- `pi-1:circuit` and `pi-1:sampler` runtimes: presence badge plus Join; after
  Join, `midi-in` sends over the board (`midi.send`, with the route-core channel
  step openers' `keys` uses), `audio-out` is the board's playout in the shared
  context, held by a lease.
- The Circuit's consent rules from positron-hardware hold: it accepts on its
  own terms and is never sent SysEx from here.
- Asserts against `demo/fake-board.mjs` in a private room: the room is not
  `studio-1`; nothing is sent before Join; a key after Join reaches the fake
  board as one `midi.send`; unlink closes the lease (renewals stop).

### Slice 6 on, by group

The granulator and recordings (R2 reads on a press, scsynth in the shared
context), the drums (drum-machine with its `context` option), typist, the radio
(external, `fake-station.mjs` only, never a real mount from a check), Stream (on
a person's press only, billed). Each group starts by lifting its page-only
engines, which is where most of the 23 are.

## 7. Risks, decisions, and what is not settled

### Owner decisions

- **D1. A pipeline composer on /connect/.** `plan-nodes-revisited.md` §4 kept
  *"No general pipeline composer"* as a rule. This plan builds one, on /connect/
  only, with concept pages unchanged. Confirm, or say where it should live.
- **D2. Knobs: an instance per parameter, or one knob per wire.** Recommended:
  instances (`web:knob-<param>`), each its own box, matching *"Per knob. Lets go
  eurorack :)"*. The other choice keeps one `knob` box with a parameter on each
  link's options, which draws one box with many wires.
- **D3. Do concept pages move onto the runtime later?** It would delete 21
  private routers and the 23 page-only engines' duplicates, and it touches 40
  pages. Recommended: not now; each lift in §6 moves only the page it lifts
  from.
- **D4. When the AudioContext starts.** Recommended: the first press on a face
  that needs sound. The alternative, the link press that completes a chain to a
  speaker, sounds sooner and opens a device for links that may be undone.
- **D5. Slice 1's scope of lifting.** The five synth copies differ (sine at 0.2,
  saw at 0.08). Lift one and leave four, or lift one and move all five.
- **D6. Two of a kind.** The grid has one box per type: one synth, one scope,
  one screen. Two scopes (before and after a filter) or two synths need
  instances. Not in this plan's slices; say if it should be.
- **D7. The Pi is shared.** /connect/ could take the Circuit's sound from
  somebody listening elsewhere; `heldBy` (plan-universal-routing §6) is still not
  built, and plan-routing-migration §5.2 named the same risk.

### Risks

- **Contexts.** Six engine modules make their own AudioContext (§3b), and a
  `connect()` across two contexts throws. Until each takes one, its engine can
  sound alone but cannot join a chain.
- **One owner in `audio.mjs`.** Claimed per engine, the second would stop the
  first. Claimed once by the runtime.
- **A faces column that grows unbounded.** Ten linked nodes is ten blocks above
  the patchbay. Nothing limits it; the patch is the limit.
- **Lifting changes pages the owner looks at.** Every lift is a change to a
  working concept page, graded by that page's own count before and after, and
  deployed with its BUILD stamp.
- **Stream minutes and somebody else's servers.** A Stream or station runtime
  costs money or lands in a broadcaster's statistics on every open; both stay
  behind a person's own press and out of every check.
- **The wish worker's 64 ports** (`MAX_PORTS` in /connect/) will not grow with
  instances; a knob instance made at link time is not in the model's list.

### Not settled

- **U1.** Whether `bay.port(id).deliver = fn` is an acceptable contract or
  `bay.setDeliver` comes first (§2e).
- **U2.** How a level assert runs for /connect/: the autoplay flag in shot.mjs,
  a manifest row so verify.mjs grades it, or an `OfflineAudioContext`. None was
  tried.
- **U3.** Whether `routes()` should trust `session.transport` alone. A link made
  by /connect/ between two `web:` ports reads `machine` and `webaudio` for audio
  and `page` for video by the table; not checked against every example.
- **U4.** The tab-to-Pi video and audio paths (§3c) are read from openers.mjs
  and remote/circuit, not run from /connect/.
- **U5.** The inventory's K, G and P marks were read from imports and greps, not
  from running each engine in isolation; a G module may turn out to need more
  than an adapter (grain-rig.mjs takes the page's `d` and its controls).

### Cost, for the record

No browser was started and nothing was measured. The plan rests on reading
`demo/connect/index.html`, `demo/shell/nodes.mjs`, `bay.mjs`, `openers.mjs`,
`audio.mjs`, `board.mjs`, `patch-synth.mjs`, seven concept pages, and the
imports of all 43 concept pages.

## Decisions, 2026-10-14

Asked *"Do working ui"*; taken as recommended: D1 yes, a composer on /connect/ only;
D2 one knob instance per parameter; D3 concept pages keep their hand wiring for now;
D4 the AudioContext starts on the first press on a face; D5 lift one synth copy now.

## How the demos converge (asked *"Do we need rewrite all demos to match this approach?"*, then *"Go"*, 2026-10-14)

No rewrite. Each time /connect/ needs an engine that lives only inside a page,
that engine moves into a shared kit module and that page moves onto it in the
same change; a page changes only when one of its engines is needed elsewhere.
Archived demos are never touched. Whether a concept page becomes a saved patch
opened in the composer is decided after slices 1 to 3 hold up.

## Built, 2026-10-14: slices 0 to 3

Local at http://127.0.0.1:8890/connect/. Not committed, not deployed.

- **Slice 0.** `demo/shell/node-runtime.mjs`: `RUNTIMES` (five, each a lazy
  `import()` of `rt-<type>.mjs`), `NOT_YET` (every other catalogue type with a
  sentence), `whyNot()`, `EXTRA_PORTS`, the pure `plan()` and `routes()`,
  `knobLinks()`, and `createRuntimes({ bay, typeOf, log, onChange, audio })` with
  `sync()`, `wake()`, `level()`, `idle()`, `get()`, `list()`. Deliver is bound
  by setting `bay.port(id).deliver` (U1 answered the cheap way, restored on
  close). The router is `demo/shell/audio-router.mjs` (`routeAudio`), lifted from
  `patch-synth.mjs` `route()`. `node-runtime-test.mjs` runs under `run-tests.mjs`.
- **Slice 1.** `demo/shell/synth-voice.mjs`, the sine lifted from
  /synth/keyboard/ with a lowpass at 8 kHz added for slice 2's knobs;
  `rt-keys.mjs`, `rt-synth.mjs`, `rt-speaker.mjs`. One context from
  `sharedAudio({ sampleRate: 48000 })`, made on the first press on a face (D4),
  claimed once by the runtime set. Every runtime reaches the speakers through
  one bus with an analyser on it, so the level a check reads is what reaches
  the speakers.
- **Slice 2.** `demo/shell/synth-params.mjs`, split out of `patch-synth.mjs`:
  the pitch, the exponential travel and the readings for the synth's five
  parameters (`wave`, `cutoff`, `q`, `attack`, `release`). `rt-knob.mjs`.
  Linking the `knob` box to a value-in whose shape lists names makes one
  `web:knob-<name>` node per name and links each (D2, all names at once; there
  is no picker yet). **Superseded 2026-10-14:** the knob box into a value-in
  that names several parameters asks which one (a button per name, and
  cancel) and makes ONE `web:knob-<name>` instance; with one name it makes it
  without asking (`knobChoices`, `knobFor` in `node-runtime.mjs`).
- **D6, built 2026-10-14.** A synth or a scope may be used twice: once every
  instance of the type is linked, the grid offers the next free one
  (`web:synth-2`, `web:scope-2`), with its own runtime and face, and its knobs
  are `web:knob-<name>-2` in a row of their own (`knobs on web:synth-2`).
- **Slice 3.** `rt-scope.mjs`: the kit wave shape over an AnalyserNode pulled
  by a silent sink.

**The synth's value-in is in the catalogue since dc0c1a5c**, an optional port
named `wave, cutoff, q, attack, release`; `EXTRA_PORTS` stays exported as `{}`
because /connect/ still imports it. The catalogue's default synth label is now
`sine`; recorder, timeline and dots pass `saw`.

**Measured** in headless Chrome with `--autoplay-policy=no-user-gesture-required
--mute-audio` (U2, answered for the check only by a scratch launcher on
`demo/chrome.mjs`): the self-check went from 20/20 to 31/31; the level at the
speakers read 0.11 RMS with the speaker linked and 0.00000 with it unlinked
while the scope on the same synth read a 0.17 peak.

## Pages to move onto the lifted modules (moved in dc0c1a5c unless marked open)

The plan's rule (*"its page moves onto the lifted copy in the same change"*) was
deferred on 2026-10-14 because another agent was editing these pages. Each move
is one page at a time, with its own check before and after.

| lifted module | pages that still carry their own copy |
| --- | --- |
| `demo/shell/audio-router.mjs` (`routeAudio`) | MOVED: `demo/synth/patch-synth.mjs`. OPEN, the other private routers: `demo/radio/blend/`, `demo/radio/tuner/`, `demo/radio/key/`, `demo/radio/rig.mjs`, `demo/granulator/grain-rig.mjs`, `demo/granulator/beat/`, `demo/drums/drum-machine.mjs`, `demo/drums/remote/`, `demo/code/collide/`, `demo/code/faust/`, `demo/code/plaits/`, `demo/remote/collide/`, `demo/shader/landscape/`, `demo/typist/machines/`, `demo/typist/score/`, `demo/video/camera/`, `demo/synth/recorder/`, `demo/synth/timeline/`, `demo/synth/dots/`, `demo/room/words/` (`grep -rlE "function route\(\|function audio\("`, not every one is an audio router) |
| `demo/shell/synth-voice.mjs` | MOVED, all of them, the saw copies with `cutoff: null` so they stay filterless: `demo/synth/keyboard/`, `demo/synth/recorder/`, `demo/synth/timeline/`, `demo/synth/dots/`, `demo/room/words/` |
| `demo/shell/synth-params.mjs` | MOVED: `demo/synth/patch-synth.mjs` (`WAVES`, `hz`, `expo`, `hzText`, `sText`, and the `wave`, `cutoff`, `q`, `attack`, `release` rows of `KNOBS`; its own defaults stay its own) |
| `demo/shell/rt-scope.mjs` (`scopeWindow`, from the first rising zero crossing) | MOVED: `demo/synth/module-page.mjs` `frame()` |
