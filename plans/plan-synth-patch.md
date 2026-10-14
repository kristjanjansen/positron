# plan-synth-patch: a WebAudio synth built in the patchbay (2026-10-10)

Status (2026-10-14): done. demo/synth/patch-synth.mjs builds the bay-node synth and is used by /synth/sound/ (https://positron.studio/synth/sound/) and three other concept pages.

Asked: *"Would it be possible to somehow model a synth building, what we have in
a front page slide of based on FAU, ... but maybe not FAU based, but just web
audio based, where we can have oscillator, filter, I don't know, maybe a third
box, and we combine it with waveform. So how would you model that using our
patch bay?"*

Read before writing: `demo/shell/synth-steps.mjs` and `slide-synth.mjs` (the
`synths` deck, seven mono Faust programs, each adding one thing), `plans/plan-nodes.md`
(§0: a page's own audio chain is the cheapest real graph a node view can drive),
`demo/shell/bay.mjs`, `demo/shell/patchbay.mjs`, and concepts 11 and 30, which
already route WebAudio from `bay.links()`. Nothing below was built or run.
What is MEASURED is marked; the rest is reading.

## 0. The answer

Yes, and most of it exists. A synth module is a bay **node**, an audio
connection is an `audio` **link** whose transport is `webaudio`, a knob is a
`value` link carrying a named parameter, and a key is a `midi` link. The page
wires its WebAudio graph from the links the bay holds, exactly as `/concepts/11/`
does for its filter and `/concepts/30/` does for its relay and waves, so the
picture is the patch rather than a drawing of it. The wave goes on as a node of
its own (a scope), fed by a link, so where you look is also something you patch.

What is new is small: one shell module of four WebAudio modules that know their
own ports, one router that turns links into `connect()` calls (it exists twice
already, page-local, as `audio()` on 11 and `route()` on 30), and a decision
about how a module names a second input (§3).

## 1. The modules

Mono, one voice, as the Faust deck is. Each is a node with ports; each draws its
own picture with a kit component that already exists.

| node | ports | WebAudio | its picture (kit) |
| --- | --- | --- | --- |
| `web:keys` | `midi-out` | none | the keyboard |
| `web:osc` | `midi-in` (pitch), `value-in` (wave, detune), `audio-out` | `OscillatorNode` | `synth-view.mjs` wave shape (`WAVE_SHAPES`) |
| `web:filter` | `audio-in`, `value-in` (cutoff, q, type), `cutoff-in` (modulation, §3), `audio-out` | `BiquadFilterNode` | filter response (kit/devices `FILTER RESPONSE`) |
| `web:amp` | `audio-in`, `midi-in` (gate), `value-in` (attack, decay, sustain, release), `audio-out` | `GainNode` driven by an envelope | envelope (kit/devices `ENVELOPE`) |
| `web:lfo` (step 6) | `value-in` (rate, depth), `audio-out` | `OscillatorNode` into a `GainNode` | wave shape |
| `web:scope` | `audio-in` | `AnalyserNode` | grain-scope `feed()` in a video panel, as on 30 |
| `web:speaker` | `audio-in` | `destination` | none |

The "third box" is the amp with its envelope: oscillator, filter, amp is the
classic subtractive voice, and it is the first place a key's gate matters.

The default patch, as text (`printPatch` already prints it, `parsePatch` reads it):

    web:keys:midi-out -> web:osc:midi-in
    web:keys:midi-out -> web:amp:midi-in
    web:osc:audio-out -> web:filter:audio-in
    web:filter:audio-out -> web:amp:audio-in
    web:amp:audio-out -> web:speaker:audio-in
    web:amp:audio-out -> web:scope:audio-in

## 2. What is real and what moves along each link

- **Audio links** are `connect()` calls. One router reads `bay.links()` after every
  change and connects exactly what is held: a module's `audio-out` node to the
  far module's input node. Unlink and that edge is silent. This is what 11 and
  30 do today, so it is a lift to the shell, not a design.
- **MIDI links** carry notes through `bay.send`, as concepts 10 to 14 do. The osc
  takes pitch from them and the amp takes the gate. A transform on the link
  (`transpose`, already in `bay.mjs`) works with no new code.
- **Value links** carry knob turns as `{ of: 'param', name: 'cutoff', v: 1200 }`.
  The module's `deliver` calls `param.setTargetAtTime`. A knob is a node
  (`web:knobs:value-out`) so the link is visible and pulses per turn, using the
  link's own `sent` in `createPatchbay`.
  ⚠️ `bay.mjs`'s class guard is MIDI only (its comment says `value` events have
  no class), so a value port cannot refuse a parameter it does not have. The
  module ignores and logs an unknown name, and the port lists its names in
  `shape: { of: 'param', names: [...] }` so the details table can show them.
- **The scope** is a node with an `audio-in`, so "show me the wave after the
  filter" is one link, `web:filter:audio-out -> web:scope:audio-in`. Two scopes
  (before and after the filter) is two nodes and two panels, which is the
  clearest picture of what a filter does.

## 3. The one real decision: a second input on one module

The port naming rule is `<medium>-<dir>`, decided in `plans/plan-site-names.md`
§0. A filter has two audio inputs with different roles: the signal, and the
modulation into `frequency` (the LFO). A `-2` suffix says nothing about which is
which, and the positron-concepts skill says ports that differ in ROLE are two
NODES.

| option | the LFO patch reads | cost |
| --- | --- | --- |
| A. role-named port, `cutoff-in`, medium `audio` | `web:lfo:audio-out -> web:filter:cutoff-in` | breaks `<medium>-<dir>` for modulation inputs only; the medium is still on the port |
| B. a node per AudioParam, `web:cutoff` | `web:lfo:audio-out -> web:cutoff:audio-in` | keeps the rule; the picture grows a box per modulation target and the box is not a module |
| C. no audio-rate modulation; the LFO sends `value` events at 60 a second | `web:lfo:value-out -> web:filter:value-in` | keeps the rule and one port; costs a main-thread timer, steps instead of a smooth sweep, and is not what a synth does |

**Recommendation: A**, as a stated exception: a modulation input is named for the
parameter it moves, because that is the fact a reader needs, and its medium stays
on the port. B is honest but makes the picture about AudioParams instead of
about modules. C is the one to refuse: it makes the patch lie about how the
sound is made. This is the owner's call, because it amends a rule the owner set.

## 4. Building it as steps, like the deck

The Faust deck adds one thing per slide. The same arc works as patches, each
step one or two more links, so the patchbay is the lesson:

1. `osc -> speaker`: a sine. The scope shows a sine.
2. a knob: `knobs:value-out -> osc:value-in` (frequency).
3. a saw: the same knob row gains `wave`.
4. `osc -> filter -> speaker`: the saw gets duller as the cutoff comes down; two
   scopes show before and after.
5. keys and an amp: `keys -> osc`, `keys -> amp`, `filter -> amp -> speaker`.
6. `lfo -> filter:cutoff-in`: the sweep.

Each step is a `printPatch` text, so a step is data: a concept page, or a
`createSlide` slot in a deck beside the Faust one. A visitor can also edit the
text (a code box with `parsePatch`, which refuses a bad link in words), which is
patching with no drag and drop, and the cheapest editable form.

## 5. What to build, in order

1. **`demo/shell/webaudio-modules.mjs`**: `createOsc`, `createFilter`,
   `createAmp`, `createLfo`, `createScope`. Each returns `{ node, ports, input(port), output }`
   and adds itself to a bay. Pure WebAudio, no UI. Graded without a browser where
   it can be (port lists, parameter names, an unknown parameter refused in words),
   with negative controls, as the other `*-test.mjs` files are.
2. **`routeAudio(bay, modules)`** in the same file: the router 11 and 30 each
   wrote. It disconnects and reconnects from `bay.links()`, and keeps every
   analyser pulled with a silent sink, which 30 had to learn the hard way.
3. **`/concepts/32/`**: the six steps as a step picker (`createChoice`), with the
   keyboard, a knob row, one panel per module picture plus the scope panels, and
   `createPatchbay`. Opens nothing on a visit; the AudioContext starts on the
   first key.
4. **Then**, if it reads well: click-to-connect on the bay view (press an out
   port, press an in port, `bay.link`), and the same steps as slides.

A Faust program fits later as one more module with the same ports (`/fau/`
already compiles to a node), so the two decks can share a patch.

## 6. What this does not settle

- **Polyphony.** One voice is one graph. Several voices are several copies of
  osc, filter and amp behind one set of links, which is a subpatch, and
  `plans/plan-nodes.md` §3.4 records where node editors strain on exactly that.
  Mono first.
- **Whether `bay.mjs` should know AudioParams.** Today a port is a port; option
  A needs nothing from it. A refusal like "an LFO into a filter's signal input is
  probably a mistake" would need it, and is not proposed.
- **CPU and timing**: unmeasured. A WebAudio graph this size is small. The router
  reconnects on every link change, so a click may be audible during a reconnect,
  not measured.
- **Safari**: not run. `BiquadFilterNode` and `OscillatorNode` are old and
  universal; the scope path is the one 30 already uses.
