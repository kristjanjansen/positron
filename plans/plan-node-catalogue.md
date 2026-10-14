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
- Whether the relay and Stream (`cf-relay`, `cf-stream`) belong in the catalogue
  or stay drawn by `patchbay.mjs` from a link's transport, as now.
