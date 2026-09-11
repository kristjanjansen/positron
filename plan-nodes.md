# plan-nodes — boxes joined by wires, and whether we have a graph to put in one (2026-09-11)

Companion to `plan-hardware.md` §8 (the box, and *a patch is a value*),
`plan-score.md` (one document, three languages), `plan-visuals.md` (the rig
comes before the feature), and `plan-ws.md` / `demo/shell/wire.mjs` (the message
envelope). Written because the user asked for a **node-based canvas** — boxes
connected by wires, the shape ComfyUI, n8n, Blender, Max/MSP, Pure Data,
TouchDesigner and Node-RED all use — as a way to compose positron's experiments
into pipelines, with **vanilla JS first** as an explicit constraint.

Every claim is tagged **MEASURED** (a command was run here and its output is
quoted), **DOCUMENTED** (a project, vendor or spec says so, with a URL and a
date), **ESTIMATED** (arithmetic on measured values, and the arithmetic is
shown), or **UNCONFIRMED** (nobody here has checked).

---

## 0. The short answer

**Yes to the canvas, no to the general pipeline composer, and the difference is
the whole plan.**

Four things in this repo compose, and only two of them are graphs.

| | what it really is | can a node editor drive it? |
|---|---|---|
| the ALSA/JACK patchbay on the Pi | a **directed graph of ports**, already half-expressed as a checkable document (`rig/box/alsa.mjs`) | **yes, today** |
| a page's own audio and shader chain | a **real node graph** — `connect()` is the wire — and entirely local | **yes, and it is the cheapest** |
| the relay | a **broadcast bus** — every message goes to every socket in the room, by design | no; there is nothing to patch |
| the timeline | a **temporal nest** — quotations placed in time, not outputs feeding inputs | no; its picture is the strip, and it already has one |

So the honest target is the top half of that table: **a graph view of the box's
patchbay, and of the browser's own chain** — not a universal pipeline composer.
A node editor pointed at the bottom half would be a drawing program, and this
project has already recorded, three separate times, what it costs to have a
surface that looks like it is working while reaching nothing.

**Write it rather than import it.** MEASURED today: a dependency-free node
canvas — DOM boxes, one SVG wire layer, drag to move, drag port-to-port to
connect, ports as real `<button>`s with ARIA labels, and a serialiser that puts
layout somewhere else — is **116 lines (102 not blank and not a comment),
5,477 bytes of commented source**, and at **400 nodes and 399 wires it redraws in
0.12 ms**. Against the published bundles, that source is **8.4x smaller than
Drawflow's minified build, 90x smaller than LiteGraph's, 107x smaller than
X6's** — and every one of them brings the thing this project has spent three
weeks arguing against: a document format somebody else owns. §1.4 has the code
and the numbers, §1.5 the recommendation.

⚠️ **Two premises this brief started from are false, and finding that out was
the most useful thing the survey did.**

**One: "a moved box makes a huge git diff."** It does not. Measured against five
real tools' real save files, a one-node move is **2 to 8 changed lines**, and
this document's own independent merge harness got the same answer. What actually
destroys a diff is **minification** — ComfyUI's `save()` writes the whole graph
on one line, so a one-pixel nudge rewrites 100% of the file — and **unstable
ordering**, which is the single change that turned a clean `git merge` into a
conflict here.

**Two: "coordinates are noise, so strip them."** In n8n they are **semantics** —
the scheduler runs branches top-left first, documented and in the source — while
n8n's own diff excludes position as *"not a content change"*, so its diff reports
"no change" for an edit that reorders execution. Separating layout is right for
this project only because positron's patches have no such rule, and the page has
to **assert** that rather than assume it. §3.0 and §4.2 have the numbers; §4.1
has the eight rules that follow.

🔴 **And the largest risk is not the canvas. It is that `demo/verify.mjs` cannot
touch one.** MEASURED today, in the suite's own headless Chrome with its own
flags: the harness presses controls with `element.click()`, and `element.click()`
fires **`click` and nothing else** — no `pointerdown`, no `mousedown`, no
`pointermove`. Driving the same probe with `Input.dispatchMouseEvent` fires the
full sequence. On the hand-written canvas: **two port-to-port drags made two
wires; two `.click()`s on the same two ports made zero.** A node UI is unusually
good at looking finished while doing nothing, and today's harness would grade it
by asking a page to describe itself. §5.1 is about the rig, and it comes first
on purpose.

---

## 1. The survey, and what "vanilla" turns out to mean

### 1.1 The test this repo actually needs a library to pass

"Vanilla" is the wrong word for the question. Every library below runs without
React. The question that decides anything here is narrower, and it has three
parts, all of which come from how this repo is built rather than from taste:

1. **Does it load from a plain `<script type="module">` with no bundler?** Every
   page here is `demo/<slug>/index.html` importing `/shell/…` by URL. There is
   no build step anywhere except `workers/view/build.mjs`, which copies files.
   MEASURED, from the published packages: **Drawflow's npm package declares
   `main: dist/drawflow.min.js` and has no `module`, no `exports` and no `type`
   field**, and that file is a webpack UMD bundle that assigns `window.Drawflow`.
   **LiteGraph is the same shape** — `main: build/litegraph.js`, no `module`
   field, a Closure-compiled script that assigns globals. Neither is an ES
   module. That is not fatal — `hls.min.js` is vendored here exactly that way
   and read off `window.Hls` by six demos — but it means an explicit allowlist
   row in `build.mjs`, a global instead of an import, and a second loading
   convention in a repo that has one.
2. **Is the framework-free core the real product, or the part that gets the
   least attention?** The npm download split answers this better than any
   README. MEASURED 2026-09-11, weekly downloads: **`@xyflow/react` 6,232,866**
   against **`drawflow` 9,983**, **`rete` 34,519**, **`@logicflow/core` 9,687**,
   **`litegraph.js` 1,051**. React Flow is three orders of magnitude ahead of
   every framework-free option combined. Whatever the framework-free libraries
   are, they are not where the ecosystem's attention is.
3. **Does it bring a document format?** This is the one that decides it, and §4
   is the whole argument. A library whose save file is its own private shape has
   quietly taken ownership of the thing this project cares about most.

Two facts worth holding while reading the rest:

- **Size, MEASURED by fetching the published bundles today** (`wc -c`,
  `gzip -9`): Drawflow **~46 KB minified, 8.6 KB gzipped** plus 1.9 KB of CSS —
  by far the smallest real editor; `litegraph.min.js` **491,365 B** (122 KB
  gzipped); `@antv/x6` `dist/x6.min.js` **583,499 B** (166 KB gzipped);
  `@joint/core` 143 KB gzipped; `@maxgraph/core` 174 KB gzipped. For comparison
  the hand-written canvas of §1.4 is **5,477 bytes of un-minified, commented
  source** — 8.4x smaller than Drawflow's *minified* build, 90x smaller than
  LiteGraph's, 107x smaller than X6's.
- **A library that looks alive and was last released in 2019 is a finding**, and
  there are several below.

### 1.2 The framework-free candidates

All figures MEASURED 2026-09-11 from the GitHub and npm APIs and by fetching the
published bundles (`wc -c`, `gzip -9`), not read off a badge.

⚠️ **One methodology note that changed three of these rows.** GitHub's
`pushed_at` counts any branch, and Dependabot pushes to branches. Drawflow,
Rete's core, butterfly-dag and Cytoscape's editing extensions all show a recent
`pushed_at` over a **default branch that is one to three years cold**. Every
"last commit" below is the default branch's, fetched separately. This is the
same shape as the repo's own rule about `s.includes(<substring>)`: the cheap
signal answers a question next to the one you asked.

**And "does it load with no build step" was tested, not assumed**: fetch the ESM
entry, list every import specifier, and fail it on a *bare* specifier
(`from "vue"`) **or** an *extensionless relative* one (`from "./graph"`) —
browsers reject both. The second is the one published surveys miss.

| library | licence | last commit (default branch) | npm latest | weekly | gzip | loads with no build step? |
|---|---|---|---|---:|---:|---|
| [**Drawflow**](https://github.com/jerosoler/Drawflow) | MIT | **2024-09-03** | 0.0.60, 2024-09-03 | 9,983 | **8.6 KB** (+1.9 KB CSS) | **No ESM at all** — one UMD file, `window.Drawflow`. Classic `<script>` only |
| [**LiteGraph.js**](https://github.com/jagenjo/litegraph.js) | MIT | **2024-01-08** | 0.7.18, 2024-01-08 | 1,051 | 122 KB (48 KB core-only) | No ESM (Closure global) |
| [`@comfyorg/litegraph`](https://github.com/Comfy-Org/litegraph.js) | MIT | repo **ARCHIVED** | 0.17.2, 2025-08-06 | 613 | **138 KB** | **Real ESM, zero imports** — the best-built litegraph that exists, and frozen on npm |
| [**Rete.js v2**](https://github.com/retejs/rete) | MIT (⚠️ see below) | core **2025-06-30**, plugins 2026-07-10 | 2.0.6 | 34,519 | ~21 KB + a framework | **No** — 8 bare `@babel/runtime` specifiers, and every renderer is React/Vue/Angular/Svelte/Lit |
| [**BaklavaJS**](https://github.com/newcat/baklavajs) | MIT | 2026-04-11 | 2.8.1, 2025-11-02 | 3,320 | 59 KB (Vue inlined) | **No** — extensionless relative imports + bare `uuid`; the documented standalone path is a `<script>` with Vue 3 inside |
| [**LogicFlow**](https://github.com/didi/LogicFlow) | Apache-2.0 | **2026-07-30** | 2.2.5 | 9,687 | 120 KB + 159 KB ext | **No ESM** (10 bare + 136 extensionless) — UMD globals `Core` / `Extension` |
| [**AntV X6**](https://github.com/antvis/X6) | MIT | 2026-08-11 | 3.1.8 | 65,990 | **166 KB, one file** | **No ESM** (4 bare + **434** extensionless) — but the single UMD file injects its own CSS, so one `<script>` tag is the whole payload |
| [**`@joint/core`**](https://github.com/clientIO/joint) | **MPL-2.0** | **2026-09-04** | 4.3.3, 2026-09-04 | 25,779 | **143 KB** | **Yes, genuinely** — 133 `.mjs` files, 444 imports, **0 bare and 0 unresolvable**, or one self-hostable file |
| [**maxGraph**](https://github.com/maxGraph/maxGraph) | Apache-2.0 | **2026-09-08** | 0.24.0, 2026-07-08 | 10,727 | **174 KB** single file | **Yes** — self-hostable, zero external imports. ⚠️ the project documents direct browser use as *unsupported* |
| [**mxGraph**](https://github.com/jgraph/mxgraph) | Apache-2.0 | **2020-11-13** | 4.2.2, 2020-10-28 | 5,638 | — | 🔴 **ARCHIVED.** Its README says development *"has now stopped"* and recommends yFiles or GoJS — **not** maxGraph |
| [**jsPlumb Community**](https://github.com/jsplumb/community-edition) | `(MIT OR GPL-2.0)` | — | `@jsplumb/browser-ui` 6.2.10, **2023-07-14** | 29,011 | 104 KB | **Yes** — real ESM, zero imports. 🔴 And **end of life** |
| [**Cytoscape.js**](https://github.com/cytoscape/cytoscape.js) | MIT | **2026-09-07** | 3.34.3 | **9,181,133** | 136 KB | **Yes** — zero imports. And it is **not a node editor** |
| [**nodl**](https://github.com/emilwidlund/nodl) | MIT | **2023-09-18** | 1.0.9 | 1,424 | — | **No** — `@nodl/core` is CJS only, and its docs domain no longer resolves |
| [**beautiful-react-diagrams**](https://github.com/antonioru/beautiful-react-diagrams) | MIT | **2021-10-04** | 0.5.1, **2020-11-27** | 583 | — | React-only, and **touch is broken** — it binds `mousedown`/`mousemove`/`mouseup` and no pointer or touch handlers |
| [**diagram-js**](https://github.com/bpmn-io/diagram-js) (bpmn.io) | MIT | **2026-09-09** | — | 159,527 | **~22 KB** | **No** — ships no dist bundle at all; source ESM with a bare `didi` |
| **GoJS** | **commercial** | alive | 4.0.3, 2026-07-17 | 89,008 | 283 KB | Yes, real ESM. **$3,995 individual · $6,990 team · $11,950 group** |
| [**the-graph**](https://github.com/flowhub/the-graph) (NoFlo) | MIT | **2023-01-26** | — | — | — | SVG custom elements for flow-based programming. The right idea, three years cold, 77 open issues |
| [`@gravity-ui/graph`](https://github.com/gravity-ui/graph) (Yandex) | MIT | 2026-08-25 | 1.11.3 | 3,200 | 54 KB | Canvas; core genuinely React-free. **142 stars** — early-adopter risk |
| **sequential-workflow-designer** | MIT (+ $1,199 Pro) | **2026-09-04** | 0.40.2 | — | 27 KB | Genuinely vanilla, **1 open issue** — and it is a *step sequence* designer: no arbitrary N:M edges, no ports |

**Also checked and dead or wrong-shape**: `butterfly-dag` (alibaba — master 2023-08,
docs site 404s), `@antv/g6` (canvas, no ports, **2 commits in 90 days** — which
refutes the common claim that AntV moved focus from X6 to G6; X6 is the more
active of the two), `Draw2D` (npm frozen at 1.0.38 from 2020 while the repo is
at 6.7.1), `flowy` (12k stars, last commit 2022-07, no npm package), `flume`
(React), `nodi` (archived, and an application not a library), Blockly (a *block*
editor, and its canonical repo moved to `RaspberryPiFoundation/blockly`).

**Web-component node editors barely exist.** An exhaustive npm and GitHub search
found only micro-projects: `Qix-/node-editor` (47 stars, dead 2022),
`@fluid-ds/node-graph` (10 downloads a week), `co-aqua-graph` (1). The one live
exception, `@grafloria/element`, ships a real `<grafloria-flow>` custom element
under MIT — repo **created 2026-07-22**, 8 stars, one author.

#### Five findings a README would not give you

- 🔴 **jsPlumb is over — all of it.** `jsplumb/jsplumb` is now a stub; the
  community edition's GitHub description reads *"This repository no longer
  receives updates"*, its README (edited **2026-09-10**) points readers at
  **VisuallyJs**, and jsplumbtoolkit.com says JsPlumb is *"in maintenance mode
  and only for sale as a renewal to current licensees"* (DOCUMENTED). The
  successor is **closed source** — VisuallyJs publishes `"license":
  "Commercial"`. ⚠️ And the widely-repeated story of a restrictive licence flip
  on the community edition is **false**: every published version of `jsplumb`
  and `@jsplumb/browser-ui` declares `(MIT OR GPL-2.0)`. The vendor moved the
  revenue product, not the licence.
- 🔴 **Rete has no vanilla renderer, and its subgraph plugin is not open
  source.** All 47 repos in the org were enumerated: five renderers — React,
  Vue, Angular, Svelte, Lit — and the two v1-era non-framework renderers are
  both archived. Feature plugins ship their UI *inside* the renderers, so **the
  minimap cannot draw without a framework**. And `rete-scopes-plugin`, which is
  grouping and subgraphs, is **CC-BY-NC-SA-4.0** with commercial use not
  permitted. A library whose headline is "framework-agnostic" fails the letter
  of its own claim at the only layer that draws anything.
- ⚠️ **BaklavaJS's core really is Vue-free** — every file in
  `@baklavajs/core@2.8.1` was read and the entire bare-specifier set is
  `@baklavajs/events` and `uuid`, in all forty published versions. It still
  fails the test, because **92% of installs are the Vue renderer**, there is no
  other renderer, and the repo's own tagline says "using VueJS". Core-is-agnostic
  and product-is-a-framework are compatible, and only the second one matters to
  a page.
- ⚠️ **X6's "abandoned plugins" are a misreading, and it nearly went in here
  wrong.** The `@antv/x6-plugin-*` packages last published in 2023–24 look dead;
  they were **absorbed into core in v3** and now live at
  `es/plugin/{clipboard,dnd,export,history,keyboard,minimap,scroller,selection,snapline,stencil,transform}`,
  all on the `X6` global. That is undo, minimap, ports, stencil, grouping and
  serialisation in **one MIT file with self-injecting CSS**. It is the strongest
  feature-per-effort option in the survey and it needs a classic `<script>` tag.
- 🔴 **Not one library here has meaningful accessibility.** Zero `aria-*`
  measured in the shipped bundles of Drawflow, LiteGraph, jsPlumb, Cytoscape,
  X6, LogicFlow, JointJS, Rete and BaklavaJS; exactly one `aria-hidden` in G6.
  Drawflow ships a single `tabIndex`; BaklavaJS two. **Whatever is chosen,
  keyboard and screen-reader support is work this project does itself** — which
  removes accessibility from the import-versus-write argument entirely.

#### Pure layout, which is separable from interaction

| | licence | gzip | plain `<script type=module>` | worker | activity |
|---|---|---:|---|---|---|
| **`@dagrejs/dagre` 3.1.1** | MIT | **17 KB** | **yes**, zero imports | yes | commit 2026-08-08, 2.3M/wk |
| **`d3-dag` 1.2.2** | MIT | 45 KB | **yes**, deps inlined | yes | commit 2026-09-02, 3 open issues |
| **`elkjs` 0.12.0** | EPL-2.0 / GPL-3.0-or-later | **3 KB main + 462 KB in a worker** | no (UMD global `ELK`) | **yes, first-class** | commit 2026-09-09, 3.9M/wk |
| `dagre` (unscoped) 0.8.5 | MIT | 65 KB | no | — | 🔴 **npm frozen 2019-12-03 — and still 1.45M downloads a week** |
| `dagre-d3` 0.6.4 | MIT | — | no | **no, it renders DOM** | 🔴 dead, pins d3@5 |

⚠️ **`dagre` unscoped and `dagre-d3` are both dead and both pull millions of
weekly downloads.** Download count is not an aliveness signal; it is a measure of
how much old code exists.

### 1.3 The framework ones, for comparison only

| | licence | npm latest | weekly | what it buys | what it costs here |
|---|---|---|---:|---|---|
| [**React Flow / XY Flow**](https://github.com/xyflow/xyflow) | MIT | `@xyflow/react` 12.11.6, **2026-09-01** | **6,232,866** | The genre's reference implementation: ports, handles, minimap, selection, documented Tab/Enter/arrow-key operation — the high-water mark for node-editor accessibility, and it is not high | React, JSX, a bundler, and the repo's first build step |
| **Svelte Flow** | MIT | — | — | The same model, in Svelte | Svelte + a build step |
| **Vue Flow** | MIT | — | — | The same model, in Vue | Vue + a build step |

⚠️ **`@xyflow/react` does 94x X6's downloads and 242x `@joint/core`'s.** The
entire framework-free field is a rounding error against it, and that is the real
reason the vanilla options feel thin: fewer answered questions, slower issues,
thinner Stack Overflow. Also note that the old `reactflow` package still pulls
**1,172,685 a week against a release from 2024-06-20** — the same
downloads-are-not-maintenance trap as `dagre`.

⚠️ **`@xyflow/system` looks like the escape hatch and is disowned.** Its ESM
imports only `d3-drag`/`-selection`/`-zoom`/`-interpolate` and no React, and it
carries `XYPanZoom` / `XYDrag` / `XYHandle` / `XYMinimap` plus the edge maths.
But its README says verbatim that it is *"not intended for use with unrelated
libraries"* and that there is *"no dedicated API documentation"*, it has sat at
**0.0.82 for three years**, and it renders nothing. Its 6.46M weekly downloads
are transitive from the two wrappers, not adoption.

**What a framework costs this repo, concretely.** Every page here is a plain HTML
file importing ES modules by URL; `workers/view/build.mjs` **enumerates**
`demo/shell/` and copies files, and it refuses the build when an import has no
deployed file. React means the first bundler, the first `node_modules` in the
serving path, and a second way to write a page — a large change to the repo's
shape in exchange for a canvas §1.4 measures at 116 lines.

### 1.4 The null option: write it — and here is what it actually costs

This repo has a documented preference for owning small things and importing
large ones. `timeline/` is 600 KB of owned code because nothing else does what
it does; `hls.js` is vendored because writing an HLS client is not the project.
`pappus.mjs` is the third case — 2,030 lines of somebody else's SuperCollider
engine, run rather than reimplemented, because the *sound* is the thing and it
could not be reproduced.

A node canvas is boxes, wires, drag and hit-testing. So it was written, and
measured, rather than estimated.

**MEASURED, today.** `nodes.mjs`, written from scratch with no dependencies:
DOM boxes positioned absolutely, one SVG layer of cubic wires, pointer-capture
drag to move a box, pointer drag from an output port to an input port to make a
wire, one-wire-per-input replacement, delete a box and its wires with it, ports
as real `<button>`s carrying `aria-label`, and two serialisers — the graph, and
the layout, separately.

    116 lines total
    102 lines that are neither blank nor a comment
      5,477 bytes of source, comments and all (2,061 gzipped)

Driven over CDP in headless Chrome, with real pointer events:

    two port-to-port drags        -> 2 wires, correctly addressed
    dragging a box                -> box moved, both wires followed
    graph document after the move -> byte-identical to before
    .click() on two ports         -> 0 wires

**And it does not fall over.** Same browser, build and redraw timed in the page:

| nodes / wires | build | one full redraw | graph document |
|---:|---:|---:|---:|
| 8 / 7 | 0.7 ms | 0.006 ms | 619 B |
| 24 / 23 | 0.6 ms | 0.012 ms | 1,899 B |
| 60 / 59 | 1.7 ms | 0.020 ms | 4,779 B |
| 150 / 149 | 5.3 ms | 0.044 ms | 11,979 B |
| 400 / 399 | 30.8 ms | 0.120 ms | 31,979 B |

⚠️ **The first version of that table was 80x worse, and the cause is worth
recording.** Asking the layout engine for each box's size inside the anchor
calculation (`getBoundingClientRect()`) forces a synchronous layout per anchor
per redraw: **9.62 ms per redraw and 1,497.8 ms to build at 400 nodes**, against
0.12 and 30.8 with the size held as a number. Same code otherwise. A node canvas
that feels slow is almost always this, not the wire count.

For scale: the board's own patchbay fixture has **five** addressable ports
(MEASURED). The largest graph this project could plausibly draw is a few dozen
boxes. **Every
row of that table is comfortably inside one frame**, and the last row is a graph
positron will never have.

**What writing it does NOT get you**, listed honestly:

| missing | how much it matters here |
|---|---|
| undo / redo | real, and cheap: the patch document is small and immutable-by-convention, so undo is a stack of documents, not a command log |
| automatic layout | not needed for five ports; if it ever is, `elkjs` or `dagre` is a layout call on a document, importable without importing an editor |
| minimap, zoom, pan | zoom and pan are a CSS transform on the host and about fifteen lines; a minimap is a want, not a need, at this scale |
| grouping / subgraphs | §3's evidence is that these are where node editors get *worse*, not better. Not having them is close to a feature at this size |
| a serialisation format | **we do not want somebody else's** — §4 is the entire argument |
| accessibility | **not actually missing relative to the alternatives.** MEASURED: zero `aria-*` in the shipped bundles of Drawflow, LiteGraph, jsPlumb, Cytoscape, X6, LogicFlow, JointJS, Rete and BaklavaJS. Ports as `<button>`s with `aria-label` and a click-then-click path are cheap and already in the 116 lines; a genuinely screen-reader-usable graph is not, and importing does not buy it |
| touch | UNCONFIRMED. `touch-action: none` and pointer capture are the right primitives and nobody has opened it on a phone |
| edge routing around boxes | cubic béziers cross things. Every tool in §3 has this complaint and none has solved it |
| selection rectangles, copy/paste, alignment | genuine polish, genuinely absent, and each is small on its own |

### 1.5 The recommendation

**Write it. Own the 116 lines and own the document.**

The argument is not that the libraries are bad. It is that every one of them
arrives carrying a graph *format* and a graph *model*, and this project's whole
position — `plan-score` §1, `plan-hardware` §8.4, `wire.mjs`'s envelope — is that
the document is the product and the UI is the disposable part. Importing an
editor inverts that: the format becomes whatever the editor serialises, which is
how every tool in §3 ended up with an unversionable save file it now cannot
change.

Three secondary reasons, each measured or documented above:

- **`demo/shell/` is enumerated, not listed** (`workers/view/build.mjs:133`), so
  a new module in it deploys with no build step and no allowlist edit. A
  bundler-shaped dependency does not fit that and would be the first build step
  in the repo.
- **Size.** MEASURED: the whole canvas is 5,477 bytes, against 6,506 bytes of
  *comments alone* in `demo/shell/wire.mjs`. It is a small thing, and small
  things are the ones this repo owns.
- **The work that matters is not the canvas.** It is `jack.mjs`, the plan arm,
  and the gesture harness — none of which any library supplies.

#### The two candidates that deserve a straight answer

The survey turned up two libraries that genuinely pass the no-build test, and
dismissing them by hand-wave would be the wrong kind of terse.

**`@joint/core` 4.3.3** is the best-engineered thing in §1.2: MPL-2.0, **zero
runtime dependencies** (v3's jQuery/Lodash/Backbone are gone), **the only
genuinely browser-native ESM tree in the survey** — 133 modules, 444 imports, 0
bare, 0 unresolvable — and **61 commits in 90 days**, the most active project
here. It would drop into this repo with no build step and no wart. Against it:
143 KB gzipped for a five-port graph; a graph model and a `toJSON` shape that
are not ours (§4); and ⚠️ **the editor chrome is the paid tier** — no undo, no
minimap, no palette, no inspector in the free core; JointJS+ is **$2,990 per
developer**. So the free part is a rendering engine, and the rendering is the
part §1.4 measures at 116 lines.

**`@antv/x6` 3.1.8** is the most capability per unit of effort: one MIT file, CSS
self-injecting, and undo, minimap, ports, stencil, grouping and serialisation
all inside it. Against it: **no ESM** (4 bare and 434 extensionless imports), so
it is a classic `<script>` and a global — which the repo can do (`hls.min.js`)
but would be its second such case; 166 KB gzipped; and the same format problem,
larger.

**Both lose on the same point, and it is not size.** Each arrives with its own
answer to §4, and §4 is the part of this work that outlives the UI. Neither
buys accessibility, because none of them has any. Neither buys the harness
(§5.1), which is where the actual risk is. And neither is needed at five to a
few dozen ports.

⚠️ **Reconsider if any of these becomes true**: a graph regularly exceeds ~50
boxes; somebody needs undo, grouping and a minimap in the same week; or a second
person starts maintaining the canvas. Then `@joint/core` is the one to take,
because it is the only one that does not also cost a build step.

**Two things to import anyway, later and separately:**

- **A layout engine, if and only if a graph ever needs one.** It takes a
  document and returns coordinates; it never touches the editor, which is
  exactly the "large thing" the preference says to import. MEASURED 2026-09-11:
  **`@dagrejs/dagre` 3.1.1 (2026-08-08), MIT, 2.3 M weekly downloads** is the
  maintained fork — ⚠️ plain **`dagre` on npm is 0.8.5 from 2019-12-03** and
  still pulls 1.4 M downloads a week, which is the "looks alive, last touched
  years ago" trap in its purest form. **`elkjs` 0.12.0 (2026-09-09 commit)** is better at
  ports and orthogonal edges and is what mermaid uses, but it is
  **1,609,707 bytes bundled (466,703 gzipped)** — 294x the whole canvas. ⚠️ Its
  worker split is the reason it is still on the list: **~3 KB gzipped on the main
  thread and ~462 KB inside the worker**, with `workerUrl` / `workerFactory` /
  `terminateWorker()` documented, and zero `document.`/`window.` in either
  bundle. It is GWT-compiled Java, so it is unpatchable, and it is licensed
  **EPL-2.0 OR GPL-3.0-or-later** — for an R&D repo a footnote rather than a
  gate, but a *noted* footnote. Both it and dagre run in a worker.
- **JSON Canvas as an export target** (§4.3), so a patch can be opened in
  somebody else's canvas. One-way, and never the storage format.

⚠️ **The honest counter-argument, stated so it is on the record:** 116 lines is
the *first* 116 lines. Undo, marquee select, alignment, copy/paste, touch and
zoom are each small and there are eight of them, and this is precisely the curve
that makes people say "we should have used a library" in year two. The defence
is the scale fact — five to a few dozen ports, not five hundred — and the
willingness to stop. If a positron graph ever needs a minimap, the graph is
wrong before the tooling is.

---

## 2. What would actually be in the nodes

This is the half that decides whether the idea is worth anything, so it comes
before the plan and gets more room than the survey.

### 2.1 The inventory — what this repo already has that could be a box

Everything below exists today and is reachable by name. Nothing here is
speculative.

**Sources.**

| box | where it runs | how it is addressed today |
|---|---|---|
| FluidSynth (FluidR3_GM, 16 channels) | the Pi | `audio.start {source:"fluidsynth"}` |
| hexter (the DX7, four factory cartridges) | the Pi, DSSI under a host | `audio.start {source:"hexter"}` |
| Yoshimi (911 instruments, 24 banks, 878 reachable) | the Pi, JACK client | `audio.start {source:"yoshimi"}` + `voice.select` |
| our own FM/Moog voices (`demo/shell/rhodes.mjs`, `moog.mjs`) | **both** — an AudioWorklet in the page and node on the Pi, same arithmetic | `audio.start {source:"moog"}`, or imported |
| ERR's 1965 audio archive | the Pi pulls it, ffmpeg | `source.search` / `source.load` |
| a live stream (LL-HLS 3.9 s · WHEP 67 ms · MoQ 26 ms) | the browser | `demo/shell/live.mjs`, `moq.mjs` |
| a camera | wherever the camera is | `getUserMedia` |
| the generated test picture | anywhere | `demo/shell/pattern.mjs` |
| a MIDI keyboard, a phone, `ask.mjs` | anywhere | `note.on` over the relay |

**Processes.**

| box | what it takes and gives |
|---|---|
| **pappus** — a 2,030-line SuperCollider granular engine, 106 commands | audio in, audio out; a JACK **insert**. Rolled from a seed (`mulberry32`), steered by `params.set` |
| the mirror shader (`demo/mirror`, `rig/box/video.mjs`) | a picture in, a picture out; three named knobs — `mirrors`, `grain`, `hue` — mapped to uniforms |
| the Csound compiler (`timeline/csound.mjs`) | a score in, timeline rows out |
| the score container (`timeline/score.mjs`) | parts and uses in, a deck out |
| a recorder (`MediaRecorder`, `workers/backlog`) | a stream in, a file or rows out |

**Sinks.** The relay room; a `<canvas>`; an `AudioWorklet`; R2; a file on disk;
`aconnect`'s far end.

**And the wires are already real, in four unrelated technologies**: ALSA
sequencer subscriptions on the board, JACK port connections on the same board,
`wire.mjs` messages over the relay, and WebAudio node connections inside a page.

### 2.2 ⚠️ The sharpest question: which of these is a graph a UI can drive?

A node editor that cannot re-patch the thing it draws is a drawing program.
Taken one at a time:

**1. The ALSA MIDI patchbay — YES, and most of the work is done.**

`rig/box/alsa.mjs` already carries the exact document a node editor would save:

```jsonc
{ "v": 1, "links": [ { "from": "circuit", "to": "microfreak", "carry": ["all"] } ] }
```

…with `resolve()` mapping a spoken name onto an ALSA address, `plan()` turning
the document into steps **without touching the rig**, `apply()` refusing a
half-application, and `patch.plan` / `patch.apply` / `patch.clear` on the wire.
Ambiguity is reported rather than broken by picking the first match. A node
canvas over this is a **face for a model that already exists** — which is the
only kind of node canvas worth building.

Scale, which matters: MEASURED by running `addressable()` against the repo's own
fixture — **five addressable ports** once `System` and `Midi Through` are
dropped (Circuit, MicroFreak, Digitakt and two virtual ports). A real dawless
rig is a dozen. This is a graph you can see all of, which is not true of
anything in §3.

⚠️ **`carry` is refused, not approximated** — an ALSA subscription carries every
message class the source emits and there is no per-class flag, so a document
asking for `["note"]` is rejected by name. A node editor must draw that refusal
rather than quietly drawing a wire. DOCUMENTED in `rig/box/README.md`; the
behaviour is at `rig/box/alsa.mjs:194-196`.

And this is exactly the shape Linux audio already builds: `qpwgraph` draws the
PipeWire graph and saves **connection profiles** you can re-apply, while `helvum`
draws the same graph and deliberately saves nothing ([qpwgraph user
manual](https://github.com/rncbc/qpwgraph/blob/main/docs/qpwgraph-user_manual.md),
DOCUMENTED). The half users ask for is the persistent document, not the drawing
— which is the same conclusion §4 reaches from a different direction.

**2. The JACK audio graph — YES, and it is the gap.**

Every JACK connection on the board today is a hard-coded shell string:
`jack_connect "${instrumentPort}" posbox:input_1`, `jack_disconnect ${SCOUT}
${CAP}`, and seven more like them — **nine calls in all**, at
`rig/box/jacksynth.mjs` lines 244–246, 290–291, 293, 488, 499 and 510. There is
no document, no plan twin and no report of what is connected — and
**`fx.pappus` already had one defect of exactly this shape**:
it answered `ok` when the JACK *port* appeared, about seven seconds before the
engine was ready, and everything sent in the gap vanished (session 18).

So the audio half of the board's patchbay is the **one place where a node UI
would pay for itself immediately**, because the thing it would force into
existence — `jack.list` and a JACK arm of `patch.plan` — is worth having with no
UI at all. That is the test of a good feature request here: it leaves something
behind when the picture is deleted.

**3. The relay — NO. It is a bus, not a graph.**

`workers/relay/src/index.js` fans every message out to **every socket in the
room including the sender**. There is no routing table, no subscription, nothing
addressable between two clients. A wire drawn between two boxes "on the relay"
would be a *filter in the receiver* — a fiction the sender knows nothing about,
on a bus where everybody hears everything anyway.

This is not a defect to fix. The relay's whole value is that it does not parse,
which is why the Durable Object hop costs 1–2 ms at p50 (MEASURED,
`demo/perf-wire.mjs`), and `plan-hardware` §8.8 is explicit that transcoding or
routing in the Worker is the tempting wrong move. **A node editor must not be
the reason routing gets added to the relay.**

What a canvas *can* honestly show about the relay is a **picture of who is in
the room and what is flowing** — which is a monitor, not an editor, and should
be drawn as one. Boxes with no ports and no draggable wires.

**4. The timeline — NO, and it already has its picture.**

A deck nest is quotations placed *in time*: `{part, at, in, out, repeat}`. The
relation between two decks is "these play together", not "this one's output is
that one's input". Drawing it as a DAG would answer a question nobody asked and
lose the one that matters, which is *when*. `timeline/strip.mjs` is the strip,
it was hand-rolled five times before it existed, and CLAUDE.md's rule is
explicit: **one position surface per page.**

**5. The browser's own audio and shader chain — YES, and it is the cheapest.**

A WebAudio graph genuinely is a node graph, `connect()` genuinely is a wire, and
it is entirely local — no board, no relay, no network. `mirror` already has a
pass chain (`passes: 1..4`) and three named knobs. This is where a first demo
can be honest with nothing else running.

### 2.3 What would have to be added, in cost order

1. **`jack.list`** — `jack_lsp -c` parsed the way `parseAconnect` parses
   `aconnect -l`, returning ports and their current connections. Small, pure,
   testable against a fixture on a laptop exactly as `alsa.mjs` already is.
2. **A JACK arm in `plan()`/`apply()`** — same document, a `kind` on the link or
   a resolver that can answer for both port namespaces. The refusal rule
   transfers: JACK *can* express a mono/stereo distinction ALSA's `carry`
   cannot, so the two arms will not have identical vocabularies and the document
   must not pretend they do.
3. **A `layout` document, separate from the patch** — §4.
4. **`Input.dispatchMouseEvent` in the harness** — §5.1. This is the one that
   has to exist before anything else is called green.

### 2.4 ⚠️ Where the idea is weakest, stated plainly

- **Most of positron is not a dataflow graph, and forcing it into one loses
  information.** Three of the five surfaces above say no.
- **A patchbay you can see all of does not need a canvas to be usable.** Five to
  twelve ports fit in a table, and a table is keyboard-operable, screen-readable
  and diffable for free. The canvas earns its place by making *what is connected
  to what* legible at a glance — a real gain, but a smaller one than the
  node-editor genre implies.
- **The moment a node editor becomes a general composer it inherits §3's whole
  complaint list** — sprawl, hidden defaults, unloadable graphs, no loops — and
  this project has no user base to absorb that cost.
- **A wrong patch is silent.** That is the premise `alsa.mjs` was built on, and a
  picture makes it *feel* verified without verifying anything. The canvas must
  show the PLAN's verdict, not the drawing's.

---

## 3. What the AI tools actually got out of a canvas, and what their users say

The question worth asking about ComfyUI, n8n, Flowise, Langflow and Dify is not
whether people like them. It is **which of their complaints would be ours** — and
the sweep refuted two things this plan assumed on the way in, which is the most
useful thing it did.

### 3.0 ⚠️ Two premises that turned out to be wrong

🔴 **"A moved box makes a huge git diff" is FALSE as stated.** MEASURED, by
re-serialising real save files from all five tools and moving one node ten
pixels:

| tool | file | lines | changed by one node move | layout share of bytes |
|---|---|---:|---:|---:|
| ComfyUI | default graph, 7 nodes | 367 | **4** | 18.8% |
| Flowise | Conversation Chain, 3 nodes | 373 | **4** | 7.2% |
| n8n | invoice pipeline, 15 nodes | 519 | **2** | 3.2% |
| Langflow | Basic Prompting, 6 nodes | 1,338 | **8** | 3.1% |
| Dify | Deep Researcher, 124 nodes | 3,404 | ~2–3 | **27.6%** |

Those numbers agree with this document's own independent measurement in §4.2 —
2 to 4 lines for a move under any pretty-printed shape. **The folklore is
wrong**, and a plan built on it would have solved a problem nobody has.

🔴 **The real diff killer is MINIFICATION, and it is a one-argument fix.**
ComfyUI has two serialisers: `save()` / `saveAs()` calls
`JSON.stringify(this.activeState)` — **one line, no indentation**, so a one-pixel
nudge rewrites 100% of the file — while *Export* and *Export (API)* call
`JSON.stringify(p[promptProperty], null, 2)`. **The file you keep is the minified
one; the file you can read is the one you have to remember to make.** n8n's git
exporter pretty-prints; Node-RED shipped `flowFilePretty` and turned it on by
default ([node-red#2515](https://github.com/node-red/node-red/issues/2515)).
DOCUMENTED.

🔴 **And in n8n, coordinates are SEMANTICS — stripping them would be a bug.**
This is the sharpest finding in the sweep and it cuts against §4.1's rule 4, so
it is stated in full. n8n's runtime scheduler sorts branches by canvas position
(`packages/core/src/execution-engine/workflow-execute.ts`, with the comment
*"Always execute the node that is more to the top-left first"*, sorting on
`position[1]` then `position[0]`), and the documentation says the same thing
verbatim: *"n8n orders the branches based on their position on the canvas, from
topmost to bottommost."* Meanwhile **n8n's own diff excludes position**, with the
comment *"moving a node on the canvas is not a content change"*.

⇒ **n8n's workflow diff will report "no change" for an edit that reorders
execution.** (ESTIMATED — derived from the two sources above, not observed in a
test.) It is a correctness gap, not an aesthetic one, and it is what happens
when a tool tries to fix the diff without fixing the model.

**The lesson this plan takes from it is not "keep coordinates in the logic".** It
is a rule §4 did not have: **position must never mean anything.** If the layout
file can be deleted and the patch still behaves identically, separating it is
free; the moment position carries order, both choices are wrong.

⚠️ **And the bloat is not layout either — it is embedded component definitions.**
MEASURED: Langflow's six-node Basic Prompting flow is 54,636 bytes, of which the
`template` block is **77%** and **verbatim embedded Python source is 47%**
(25,415 bytes). The vendor confirms the design: *"When you add a component to a
flow, you create a detached copy… they don't synchronize with any updates"*, and
their own shipped starter flow records `last_tested_version: 1.8.0` over nodes
stamped `lf_version: 1.7.0`. Flowise embeds its whole UI form schema (41%).
ComfyUI's seven-node graph is **2,669 bytes — twenty times smaller than
Langflow's six** — because it *references* node types by name.

⇒ **The real axis is reference versus embed.** A reference breaks loudly
(ComfyUI's red missing-node boxes); an embedded copy never breaks loudly and
silently runs stale code. §4.1's `ref` field is the reference side, on purpose.

### 3.1 What the node model genuinely bought them

Stated fairly, because three of these were successful products:

- **A palette is a discoverable API.** You cannot grep for a function whose name
  you do not know; you can scroll a node list.
- **Caching is legible, and load-bearing.** ComfyUI re-runs only what changed
  downstream of an edit. Proof it matters: when it regressed,
  [#4631](https://github.com/comfyanonymous/ComfyUI/issues/4631) — *"Almost
  unusably-slow"* — arrived within a day.
- **A graph is shareable as an artefact, and ComfyUI does it exactly right.**
  MEASURED in `nodes.py`'s `SaveImage.save_images`: every PNG gets a text chunk
  `"prompt"` holding the **API-format** graph — no coordinates, named inputs,
  links by node id — *plus* everything in `extra_pnginfo`, which is where the
  editor-format `workflow` goes. **The image carries both documents at once**:
  the one that reproduces the run and the one that opens in the canvas. That is
  §4.1's two-file split, shipped, inside a PNG.
- **Wiring is type-checked at the port.** A socket that refuses to connect
  teaches the type system by refusing — `plan()`'s refusal in another medium.

None of those four needs a canvas. Three need a **document with typed ports**,
which is what §4 proposes; the fourth needs a list.

### 3.2 The serialisation story, tool by tool

🔴 **ComfyUI ships two formats and the good one is already layout-free.**
MEASURED from its own repository. The API format
([`script_examples/basic_api_example.py`](https://github.com/comfyanonymous/ComfyUI/blob/master/script_examples/basic_api_example.py))
is a map from node id to `{class_type, inputs}`, where a wired input is
`["<node id>", <slot>]`:

```jsonc
"3": { "class_type": "KSampler",
       "inputs": { "seed": 8566257, "steps": 20,
                   "model": ["4", 0], "positive": ["6", 0] } }
```

**No coordinates. Named parameters. Links by node id.** That is §4.1's proposal,
shipped, by the largest node-graph tool in the world — and it is not what anyone
shares, because it cannot be opened in the editor.

**The format people do share carries everything else.** MEASURED from
[`workflowSchema.ts`](https://github.com/Comfy-Org/ComfyUI_frontend/blob/main/src/platform/workflow/validation/schemas/workflowSchema.ts)
and the default graph:

| in the shared workflow file | what it is |
|---|---|
| `pos: [413, 389]` | where the box sits |
| `size: [425.27801513671875, 180.6060791015625]` | ⚠️ fourteen decimal places of float noise, committed |
| `order: 3` | a cached topological order — derived data, stored |
| `last_node_id`, `last_link_id` | ⚠️ **mutable global counters in the document** — two people adding any node bump the same line, so a conflict is guaranteed |
| `extra.ds` | pan and zoom, rewritten on every export |
| `widgets_values: ['text, watermark']` | ⚠️ **a positional array with no parameter names** (the schema allows a named record too; the array is the legacy form and what the default graph uses) |
| `properties: {cnr_id, aux_id, ver, models}` | provenance — `ver` is a semver **or** a git hash **or** the literal `'unknown'` |
| `.passthrough()` on nodes and on the workflow | unknown keys preserved — good for forward compatibility, more surface for a diff |

🔴 **`widgets_values` as a positional array is the single best cautionary
artifact found**, and the numbers are worse than the complaint genre suggests.
[ComfyUI #15102](https://github.com/Comfy-Org/ComfyUI/issues/15102) (opened
2026-07-27, **still open**): flattening a subgraph queues widget values
off-by-one, *"113 shipping templates carry the defect, some corrupt silently"* —
**113 of 471 in the shipped package, including the first-run onboarding
template**. The reporter's own words: *"The UI renders all widget values (seed,
steps, cfg, sampler_name, …) correctly. Only the generated prompt is wrong"*, and
one case *"flattens `noise_seed=true`, which validates as INT and runs with seed
1 instead of 22. Wrong output, no error."* The named-values fix
([PR #10392](https://github.com/Comfy-Org/ComfyUI_frontend/pull/10392)) merged
2026-07-30 **behind a default-off flag**, its author writing *"I have ~90%
confidence that enabling this is safe."*

**That is §4.1's rules 1 and 2 violated in one field** — payload carried
unnamed, and referenced by position — producing wrong output with no error, at
scale, for years. It is the strongest argument in this document for both rules.

**Dify is the sharpest vendor-knows-better case.** Verified in
`api/services/app_dsl_service.py` (L650–652), comment and all:

```python
# The source canvas position should not determine the imported app's initial view.
graph = graph.copy()
graph.pop("viewport", None)
```

**The importer deletes the viewport; the exporter still writes one.** MEASURED on
real history: `Deep Researcher On Dify.yml` — 124 nodes, 3,404 lines — is **938
lines (27.6%) pure layout**, 272 coordinates at six or more decimals, plus
`selected: true` on whichever node was clicked last, committed. Two real edit
commits: [7286ec0](https://github.com/svcvit/Awesome-Dify-Workflow/commit/7286ec0)
608 lines changed of which **136 (22.4%) were layout**;
[ecdfeeb](https://github.com/svcvit/Awesome-Dify-Workflow/commit/ecdfeeb) 306
lines, **75 (24.5%)**. Dify stores `position` *and* a byte-identical
`positionAbsolute`, `selected` twice per node, and node ids that are
epoch-millisecond timestamps.

⚠️ **And a popular claim about Dify is wrong, which points at the right fix.**
The third-party linter `difyctl` says Dify diffs suffer "key-order churn". They
do not — Dify exports through PyYAML's `yaml.dump` with `sort_keys=True` and both
real files are strictly alphabetical at every level. What churns is float
coordinates, `selected`, `viewport` and array order. **Dify already passes
§4.2's stable-ordering test and fails its separate-layout one**, which is the
cleanest available confirmation that those are two different problems.

**Langflow is the worst of the five and worth one paragraph as a warning.**
MEASURED: every node carries React Flow's full transient state on disk —
`dragging`, `selected`, `measured`, `position` *and* `positionAbsolute`, at
sixteen significant figures (`689.5720422421635`). Edge ids are **JSON encoded
inside a JSON string using `œ` (U+0153) as a quote substitute**, and the same
handle descriptor is stored **three times** per edge. There is a hard ceiling:
[#8541](https://github.com/langflow-ai/langflow/issues/8541), a real flow that
cannot be saved at 1,073,050 bytes. And ⚠️ **"export as code" does not exist** —
[#5530](https://github.com/langflow-ai/langflow/issues/5530) and
[#9216](https://github.com/langflow-ai/langflow/issues/9216) were both **closed
as not planned**; what the docs call Python export is an HTTP call to a running
Langflow server.

**n8n keys its connections by node DISPLAY NAME**, so renaming a box churns every
entry that references it (MEASURED: a rename is 6 lines against a move's 2). Its
git export is pretty-printed and sane — and is **Business/Enterprise only**, from
a pull request originally titled *"feat(editor): Version control paywall
(WIP)"*. The docs state the ceiling plainly: *"n8n can't detect conflicts on
workflows."*

### 3.3 Reproducibility that is declared and not enforced

**No tool among the five enforces its own reproducibility metadata at runtime.**

- **ComfyUI** records node-pack ids, versions or git hashes, and model hashes —
  and the resolver **discards the recorded version**, reducing `{id, version}` to
  ids. Shipped templates record models by bare filename with no hash.
  `comfy-lock.yaml` does carry model hashes and git commits and its own README
  says *"Beta Feature: format … (WIP)"*.
- **Dify**'s pins are the only content-addressed ones —
  `langgenius/general_chunker:0.0.1@e3da408b…`, `org/name:semver@sha256` — and
  then: `generate_dependencies()` reads the **exporter's currently installed**
  plugins rather than what the workflow was authored against; on import the pins
  only feed `get_leaked_dependencies()` to **report** what is missing and
  **nothing installs them**
  ([#30483](https://github.com/langgenius/dify/issues/30483), closed *not
  planned*); legacy DSL with no dependencies block resolves to marketplace
  **latest**, silently; **models are not pinned at all**; and
  [#17868](https://github.com/langgenius/dify/issues/17868) asked whether a run
  uses the pin or the installed version and was **closed with no answer**.
  UNCONFIRMED.
- **Langflow** has none, and the vendor says so: *"A flow JSON describes nodes
  and wiring, and does not list the PyPI packages components import at
  runtime."*
- **n8n's `typeVersion` is the only pin in the survey that actually binds** — a
  workflow keeps running node version 1 after version 2 ships. ⚠️ Which has its
  own cost: two workflows built a year apart run different code and **nothing on
  the canvas says so**.

⚠️ **This is the finding to carry into §5.** CLAUDE.md already says printing
"ok" is not evidence and a guard that has never rejected anything is a claim. **A
version field nothing validates is the same defect one layer up**, and it is
present in every well-funded tool in this space. So if positron's patch document
carries a `v`, `plan()` must refuse an unknown one — which `alsa.mjs` already
does, and which is the reason it already does.

**Silent failure, twice, for one line each**, because both are `alsa.mjs`'s
premise in another technology. Dify's `dataset_id`s are AES-encrypted with a key
derived from `tenant_id` and the importer filters out anything that fails to
decrypt, so on a different tenant **every id is dropped and Knowledge Retrieval
points at nothing — no error, no warning.** And n8n skips an empty branch
silently by architecture; its founder in 2020: *"What I think you propose would
not really be possible (or would mean a huge overall breaking-change)."*

### 3.4 Sprawl, subgraphs and loops — where the model itself strains

**ComfyUI shipped subgraphs, recursively, and they are the largest open wound.**
Frontend v1.24.0, 2025-07-10, after Group Nodes were abandoned (the blog:
*"trying to re-engineer them… proved impractical"*). MEASURED across the
frontend's issue tracker: **1,676 open issues, of which 279 mention "subgraph"
(16.6%) and 127 say it in the title (7.6%)**; 154 of the last 600 releases
mention subgraphs. Shipped fix titles read like a list of §4's rules being
learned: *"preserve subgraph widget bindings on rebuild"*, *"remap flattened
subgraph ids on API JSON import"*, *"normalize nested subgraph definition ids"*.
A maintainer on [#4853](https://github.com/Comfy-Org/ComfyUI_frontend/issues/4853):
*"the underlying linking mechanism remains broken."* A user on
[#14420](https://github.com/Comfy-Org/ComfyUI/issues/14420): *"subgraphs are
unusable since 1.39.x all the way up to current 1.45.15."*

🔴 **Dify has no grouping primitive at all.** The full `BlockEnum` has no `group`,
no `subgraph`, no `frame`; the only containers are Iteration and Loop, plus a
sticky note. Subflow requests
[#12007](https://github.com/langgenius/dify/issues/12007) and
[#16204](https://github.com/langgenius/dify/issues/16204) are both closed, and
the sanctioned answer is *"publish it as a separate app and call it as a tool"*,
capped at `WORKFLOW_CALL_MAX_DEPTH=5`. **n8n's groups are a flat named set**
(`{id, name, nodeIds[], description?}`) with collapse state in the browser, not
the file — and its "convert to sub-workflow" refuses the hard case: only one node
with incoming and one with outgoing connections, *"can't be a Merge node"*,
*"can't be an If node"*, so **you cannot extract a branching region**.

⚠️ **What Dify shipped instead of grouping is navigation** — a Node Locator and a
⌘K "Go to Anything". That is the most useful single observation in this section:
**search affordances are what you build for a canvas too big to scan.** A picture
whose whole argument was "see it all at once" that then needs a search box has
lost that argument.

**Loops are where dataflow graphs strain hardest, and all five show it.**

- **ComfyUI's engine has supported loops since 2024-08** — PR #2666, *"Execution
  Model Inversion"*, +2812/−279, enabling lazy evaluation, dynamic node
  expansion and *"flow control (i.e. while loops) via tail recursion"* — and the
  body says those features *"are **not** a part of this PR"*. They live in a
  105-star demo repo. **Two years on, the product still ships none**, and loop
  requests from 2023 and 2025 are both open.
- **Dify blocks nested loops deliberately.** A collaborator on
  [#30457](https://github.com/langgenius/dify/discussions/30457): *"The UI
  intentionally prevents this — when you're inside a Loop (or Iteration) node,
  the option to add another Loop or Iteration node is filtered out."* Same
  thread: *"How is this in production without nested loops 😭"*. A Dify loop
  needs **three node types plus per-edge flags** (`loop`, `loop-start`,
  `loop-end`, `isInLoop`) — because a flat edge list cannot express containment.
- **Langflow cannot put a conditional inside a loop**, vendor-stated: *"The
  If-Else component isn't compatible with the Loop component"*, workaround
  *"redesign your flow to process conditions before the loop."*
- **n8n's Loop Over Items needs a manual wire back** and *"will get stuck in an
  infinite loop"* without a termination condition; nested-loop issues are closed
  *not planned*.

### 3.5 The oldest lineage says the same thing, and one of them fixed it

| tool | save file | references | diffable? | what shipped |
|---|---|---|---|---|
| **Max/MSP** | `.maxpat` JSON, `patching_rect` inline | string ids (merge-stable) | No — the writer reorders. *"Text diffs are pretty much impossible… it looks like everything has changed"* | `sortpatcherdictonsave` (2009); third-party `diff-for-max`, whose author calls it *"ridiculously brute force… not even parsing the json!"* |
| **Pure Data** | `.pd`, line-oriented text | ⚠️ **positional indices** — `#X connect 1 0 2 0` | Readable history, unsafe merges. **Deleting a comment renumbers every later connect line** | nothing; the format is officially undocumented |
| **TouchDesigner** | `.toe`, binary | — | `toeexpand`/`toecollapse` exist, version control is not their documented purpose | practice: externalise to per-module `.tox` |
| **Blender** | inside the binary `.blend` | — | *"no partial merge. You choose one complete version per file"* | third-party only |
| **Node-RED** | `flows.json`, `x`/`y` per node | node ids | was one unformatted string ([#2515](https://github.com/node-red/node-red/issues/2515)) | 🟢 **the one that solved it**: git in-product, an in-editor merge-conflict UI with radio buttons, and `flowFilePretty` on by default |
| **Unreal Blueprints** | binary `.uasset` | — | Epic: *"cannot be opened as text or merged in a text-based merge tool"* | ⚠️ **pessimistic locking, not merging**; the diff tool is *"a viewer: you cannot select individual changes"* |

Epic states the scaling limit in one line: **"Large C++ files are easier to
modify than large Blueprint graphs."** Thirty years, six ecosystems, and the same
two defects: **unstable ordering, and references by position.** Node-RED is the
only one that treated it as a version-control engineering problem and fixed it
end to end — stable ids, pretty output by default, and a merge UI in the editor.

### 3.6 When a node editor is the wrong UI — and one citation everybody gets wrong

**Fred Brooks, *No Silver Bullet* (1987)** is the strongest principled argument,
and it is not "diagrams are bad". It is that a diagram is a **projection**, and
software has more independent dimensions than one projection can carry:

> *"Whether one diagrams control flow, variable-scope nesting, variable cross
> references, dataflow, hierarchical data structures, or whatever, one feels only
> one dimension of the intricately interlocked software elephant."*

That predicts everything in §3.2–3.4 exactly: a node canvas renders the
**dataflow** projection; control flow, hidden state and version history are the
other dimensions, and they are precisely where all five tools fail.

🟢 **Whitley, Novick & Fisher (2006),
[*Evidence in favor of visual representation for the dataflow paradigm*](https://www.sciencedirect.com/science/article/abs/pii/S1071581905001163)**
draws the boundary empirically, and it splits cleanly by task: **text wins
tracing** ("what happens next"), **visual wins parallelism and debugging** ("what
depends on what, what can run at once") — significantly faster *and* more
accurate. Caveat: small code segments.

**Apply that to this repo and it lands exactly where §2.2 landed from the code.**
The patchbay question *is* "what depends on what" → visual wins. The timeline
question *is* sequence → the strip wins. The two halves of this plan are the two
halves of that finding, arrived at independently.

⚠️ **And one correction that matters more than the citations.** Green & Petre
(1996) is routinely quoted as proof that visual languages are 8x slower. The
paper was read: the 8:1 ratio is **editing time, not comprehension**, from an
**n=1 straw test**, and the cause is layout labour — *"all the boxes had to be
jiggled about and many of the wires had to be rebuilt."* **The paper's overall
verdict favours visual languages**, and it explicitly contradicts the
real-estate objection: *"Diffuseness – the famous real-estate problem – was less
of a liability than we had supposed."* What it *does* support is §6.3(iii): *"The
representation of control flow remains a problem in the VPLs we examined… our
impression is that this remains a problem in general with the dataflow model."*
**And the "Deutsch limit" should not be cited at all** — it traces to a single
1998 Usenet FAQ with no primary source and no transcript. UNCONFIRMED.

This is the same defect this repo records in `timeline/csound.mjs`: a confident
number that was the distance between two wrong answers. Cite Brooks and Whitley;
cite Green & Petre only for control flow and viscosity.

Honourable mentions:
[Mike Hadlow, *Visual Programming – Why it's a Bad Idea*](https://mikehadlow.blogspot.com/2018/10/visual-programming-why-its-bad-idea.html)
— *"Even if they persist their layout to a textual format, the diffs make little
or no sense"* — and
[Lucy Keer's synthesis of the HN folk wisdom](https://drossbucket.com/2021/06/30/hacker-news-folk-wisdom-on-visual-programming/),
which carries the best counter-argument: professionals only meet these systems
*"when boundaries have been reached"*, so the successes are invisible. That is a
real selection bias in the whole critical literature, this section included.

### 3.7 The market's own verdict, twice

🔴 **Flowise is archived, and the vendor's stated reason is this plan's thesis.**
55,458 stars, acquired by Workday 2025-08-14, code freeze 2026-07-29, archived
2026-08-10, EOL 2026-08-31. From
[flowiseai.com/sunset](https://flowiseai.com/sunset), verbatim:

> *"As AI models become more capable at reasoning, we've noticed that developers
> are increasingly relying on new coding agents such as Claude Code/OpenClaw to
> handle complex tasks."*
> *"The typical rigid workflow low code approach quickly hits the limit when it
> comes to complexity."*

And the honest practitioner version — Kuldeep Pisda,
[*Prototype on Dify, Ship on Celery*](https://kdpisda.in/prototype-on-dify-ship-on-celery/)
(2026-04-18), after rewriting in Django + Celery at two months. His first reason
is this document's thesis — *"Prompts lived inside the tool's database, not in
git. No diffs, no code review."* — and his rule is the best sentence in the
sweep:

> *"Stay on the visual tool while the answer to 'what should this do?' is still
> changing faster than 'how should this run?' Graduate the moment those flip."*

**For positron those two questions are already flipped across most of the repo.**
`timeline/`, the relay and the player all know exactly what they should do and
are entirely about how they run. They are not candidates for a canvas. The
patchbay is the one place where *what should this do* is still the live
question — which is, again, where §2.2 landed.

### 3.8 ⚠️ What is NOT transferable, so this section is not over-read

These are tools with tens of thousands of users, plugin marketplaces, and graphs
of a hundred-plus nodes. positron has five ports, one author and no marketplace.
**Most of §3's pain is a function of scale and of third-party nodes, and this
plan buys neither.** Five things carry across, and they are the ones §4 and §5
are built on:

1. **Pretty-print, always.** ComfyUI's *saved* file is one line; that single
   `JSON.stringify` argument is the highest-leverage unfixed thing in the sweep,
   and Node-RED already shipped the fix.
2. **Stable ids, never positional references** — not for nodes, not for
   parameters. Pd pays for it with renumbering; ComfyUI pays for it with 113
   corrupt shipped templates and silent wrong seeds.
3. **Do not let position mean anything** (§3.0). Then separating layout is free.
4. **A version field nothing enforces is decoration** (§3.3).
5. **Reference, never embed** (§3.0). A missing reference fails loudly; a stale
   embedded copy runs.

---

## 4. Serialisation, which is the part that outlives the UI

A node graph is a document. This project already knows what it wants from a
document: a seed reproduces a roll, a score compiles to rows, a patch is checked
before it is applied. So the question is not "what does the editor save" but
"what is the thing, of which the editor is one view".

### 4.1 The proposal

**Two files, and the patch is the one that matters.**

`patch.json` — the logic. No coordinates anywhere in it.

```jsonc
{
  "v": 1,
  "id": "studio-1 evening",
  "nodes": [
    { "id": "yosh",   "kind": "instrument", "ref": "yoshimi",
      "params": { "bank": 5, "program": 0 } },
    { "id": "grains", "kind": "insert",     "ref": "pappus",
      "params": { "seed": 3070441510 } },
    { "id": "out",    "kind": "sink",       "ref": "relay:studio-1" }
  ],
  "links": [
    { "id": "w1", "from": ["yosh", "audio"],   "to": ["grains", "audio"], "carry": ["all"] },
    { "id": "w2", "from": ["grains", "audio"], "to": ["out", "audio"],    "carry": ["all"] }
  ]
}
```

`patch.layout.json` — where the boxes sit. Nothing else reads it.

```jsonc
{ "v": 1, "of": "studio-1 evening",
  "xy": { "yosh": [40, 60], "grains": [300, 60], "out": [560, 60] } }
```

Eight rules. Five come from somewhere this repo already applies them; three
come from §3 and would not have been guessed.

1. **Normalize the envelope, never the payload.** `plan-score.md` §1. A node's
   envelope is `id`, `kind`, `ref`; everything an instrument, an insert or a
   shader needs goes in `params`, carried verbatim and tagged by `ref`. A field
   that a Yoshimi program, a Pappus seed and a shader uniform could all fill
   without one of them lying does not exist, so do not invent one.
2. **Links reference nodes by `id`, never by array index.** Pure Data's
   `#X connect 0 0 1 0` numbers objects by position in the file, so inserting an
   object renumbers the patch ([Pure Data file format](http://fileformats.archiveteam.org/wiki/Pure_Data), DOCUMENTED). That is
   a merge conflict generator and it is avoidable for free.
3. **Canonical form is authoritative.** Arrays sorted by `id`, object keys
   sorted, the same way `timeline/score.mjs` already sorts keys to get a
   byte-identical round trip. §4.2 measures what this buys and it is more than
   tidiness.
4. **Coordinates live in a second file.** A move then is not a change to the
   patch at all — which makes *"what did I have patched last Tuesday"*, the
   question `plan-hardware` §8.4 says a document exists to answer, answerable
   without reading past layout noise.
5. **`carry` stays, and a refusal is part of the document's meaning.** A link
   asking for a subset ALSA cannot filter is refused by `plan()`. The editor
   draws the refusal.
6. 🔴 **Position must never mean anything.** This rule exists because of n8n
   (§3.0): its runtime sorts branches by canvas position, top-left first, while
   its own diff excludes position as *"not a content change"* — so its diff
   reports "no change" for an edit that reorders execution. **Rule 4 is only
   safe while rule 6 holds.** The test is blunt: delete `patch.layout.json`
   entirely and the rig must behave identically. Assert it (§5.2, assert 9).
7. **Reference, never embed.** A node says `ref: "yoshimi"`, not a copy of
   Yoshimi's parameter schema. §3.0 measured the alternative: Langflow's
   six-node flow is 54,636 bytes of which **47% is verbatim embedded Python
   source**, and the vendor's own starter flow has drifted from the components
   it embeds. **A missing reference fails loudly; a stale embedded copy runs.**
   The exception is §4.4's: anything that cannot be reproduced from `params` is
   a reference *to data*, and the document says so.
8. **`plan()` refuses an unknown `v`.** `alsa.mjs` already does this
   (`if (doc.v !== 1) problems.push(...)`), and §3.3 is the reason it matters:
   **not one of the five tools enforces its own reproducibility metadata at
   runtime.** A version field nothing validates is decoration, which is the same
   defect as a guard that has never rejected anything.

Pretty-printed, two-space, and **never minified** — §4.2's last row is what that
rule is worth.

### 4.2 What the alternatives actually cost — MEASURED

Two people edit one patch. One **moves a box**; the other **changes that node's
params and rewires a link into it**. A real three-way `git merge`, twelve nodes,
eleven links, run today. ⚠️ **Read it beside §3.0's table**, which measured the
same quantity against five real tools' real save files and got 2 to 8 lines for
a move — two independent measurements agreeing that the genre's loudest
complaint is not about what people think it is about.

| the save file is… | a move alone touches | `git merge` |
|---|---|---|
| one pretty-printed JSON document, x/y inline | 2 lines of the patch | **merged clean** |
| JSONL, one line per node, x/y on that line | 2 lines of the patch | **CONFLICT** |
| two files: logic + layout | 2 lines of `layout.json`, **0 of the patch** | **merged clean** |
| one pretty JSON, and one side's editor **reordered the nodes array on save** | **10 lines** | **CONFLICT** |
| canonical (sorted arrays, sorted keys) + separate layout, same reorder | 2 lines of `layout.json` | **merged clean** |
| **minified — `JSON.stringify(doc)` with no indent**, which is what ComfyUI's `save()` actually writes | **1 line, and that line is the entire file** | **CONFLICT** — every edit touches the only line there is |

Four findings, and the first one is not what the genre's folklore says:

- 🔴 **Stable ordering matters more than line format.** The single change that
  turned a clean merge into a conflict, and a 2-line diff into a 10-line one,
  was an editor rewriting its array order on save. Cycling '74 shipped
  `sortpatcherdictonsave 1` for exactly this in Max ([Cycling '74 forum](https://cycling74.com/forums/gitgithub-for-revision-control-of-max-patchesprojects), DOCUMENTED) — a real
  product's answer to a real complaint, and the same answer `score.mjs` already
  implements for a different reason.
- ⚠️ **JSONL is the WRONG default here**, which contradicts the first instinct
  and `plan-score.md`'s reflex. One line per node means one line per *box*, so
  two people touching the same box for unrelated reasons collide — and in a node
  graph, "moved it" and "re-patched it" are the two most common edits there are.
  Pretty-printed JSON puts one *field* per line, and the unit of the line should
  be the unit of the edit. JSONL keeps its place as a streaming **view** of the
  timeline's rows, where a row really is the unit.
- **Separating layout is worth it for meaning, not for bytes.** It saves two
  lines in the merge test; what it actually buys is that a patch's history
  contains only patching. ⚠️ And per §3.0 rule 6, it is only safe while position
  means nothing — which for a MIDI or JACK patch it does, and the page asserts.
- 🔴 **Minification beats every other choice put together, in the wrong
  direction.** MEASURED in the same harness: one line, 100% of the file rewritten
  by a one-pixel nudge, and a guaranteed conflict between any two edits. This is
  not hypothetical — it is what ComfyUI's `save()`/`saveAs()` writes, while its
  *Export* path pretty-prints with `null, 2`. **The file you keep is the
  unreadable one.** Node-RED shipped `flowFilePretty` and defaulted it on; n8n's
  git exporter pretty-prints. It costs one argument, and this repo gets it for
  free because `score.mjs` already writes canonical JSON.

### 4.3 The formats that already exist, and why none of them is it

- **JSON Canvas 1.0** (MIT, Obsidian, [jsoncanvas.org](https://jsoncanvas.org/spec/1.0/), DOCUMENTED) — `nodes` and
  `edges` arrays; every node **requires** `id`, `type`, `x`, `y`, `width`,
  `height`. Coordinates are mandatory and inline, and its node types are `text`,
  `file`, `link`, `group`. It is a format for a *thinking canvas*, not a signal
  graph; adopting it would make position part of the logic, which is the one
  thing §4.2 measured as costly. Worth knowing about as an **export** target.
- 🟢 **ComfyUI's API format** (§3.2) is the closest existing thing to §4.1 and
  the best argument that §4.1 is right: a map from node id to
  `{class_type, inputs}`, wired inputs as `["<node id>", <slot>]`, **no
  coordinates and named parameters**. It is not adoptable — `class_type` is
  ComfyUI's registry, not ours — but it is the shape, shipped, by the largest
  tool in the field, and it should be cited whenever this design is questioned.
- **Graphviz DOT / GraphML / Mermaid** — fine for drawing a graph, no place for
  typed per-node parameters, and nothing to validate against. Useful as a
  one-way `export` so a patch can be pasted into a document.
- **`.pd` and `.maxpat`** — the two closest ancestors, and both carry
  coordinates inline; Pd additionally references objects by ordinal index
  (DOCUMENTED, above). Their thirty years of git complaints are the argument for
  rules 2 and 4, not a format to copy.
- **qpwgraph's "Patchbay"** — the Linux audio world's own version of *a patch is
  a value*: saved connection profiles that can be re-applied later, where
  `helvum` deliberately has none ([qpwgraph manual](https://github.com/rncbc/qpwgraph/blob/main/docs/qpwgraph-user_manual.md), DOCUMENTED). Closest prior art to
  what §2.2 recommends building, and evidence that the persistent-profile half
  is the part users ask for.

### 4.4 How it relates to the two documents this repo already has

**To `wire.mjs`'s envelope**: a patch is *carried* by the envelope, never fused
with it. `{type: "patch.apply", patch: {…}}` — the four envelope keys stay the
envelope's, and `format()` already **throws** if a payload tries to use `from`,
`at` or `seq`, which is the scar from `source.load`'s `at` collision. A node's
`params` is payload in exactly the sense `plan-score` means.

**To the score**: they are different documents and must not be merged. A score
says **when**; a patch says **what feeds what**. The join between them is that
*a re-patch is an event with a timestamp* (`plan-hardware` §8.4), so a session's
patching history is a lane on the timeline — which is a much better use of the
strip than drawing a DAG on it.

⚠️ **One shared rule, and it is the reproducibility one.** `pappus.mjs`'s
`mulberry32` is the precedent: **the seed is in the document, not the output.** A
patch stores `{seed: 3070441510}` and never a rolled parameter dump, for the same
reason a picture stores its seed rather than its pixels. Anything a node cannot
reproduce from its own `params` — a recorded buffer, a camera, an archive
excerpt — is a **reference**, not a value, and the document says which it is.

---

## 5. The plan

### 5.1 ⚠️ The rig comes first, and here is the proof it must

This project's most expensive recurring failure is a green suite over a path the
suite cannot reach: 261/261 while a demo was fatally broken on iPhone; 291
asserts across three pages that had never played a frame; `moq` and `ladder`
asserting nothing behind a plausible wrong explanation. **A node canvas is the
best-shaped thing yet for reproducing it**, because a graph that draws perfectly
and patches nothing looks *exactly* like one that works.

🔴 **MEASURED TODAY, in the suite's own headless Chrome with its own flags.**
`demo/verify.mjs` exercises a page by selecting `.d-controls button, .tbar-x` and
calling `.click()` on each. What that dispatches:

| the harness does | the page receives |
|---|---|
| `element.click()` | `click` — **and nothing else** |
| `Input.dispatchMouseEvent` ×3 + `setPointerCapture` | `pointerdown` `mousedown` `pointermove` `mousemove` `pointerup` `mouseup` `click` |

⚠️ **Note the last entry in that second row.** A completed drag also delivers a
`click`, so a canvas that selects on `click` and moves on drag fires **both** on
one gesture — every box you move is also selected, and every wire you pull also
counts as a press on the port. This is not a harness artefact, it is what a real
pointer does; a canvas has to decide on `pointerup` whether the gesture was a
drag or a tap and swallow the other one.

And on the hand-written canvas of §1.4, driven over CDP in the same browser:

    two port-to-port drags       -> 2 wires
    .click() on the same 2 ports -> 0 wires

So **today's harness would grade a node editor by asking the page to describe
itself.** Every assert would be about state the page set with its own hands.

#### What the rig must therefore be, before the feature

1. **A gesture contract on `__demo`.** The page publishes
   `__demo.gestures = [{ from: <selector>, to: <selector>, expect: 'wire' | 'refused' | 'move' }]`
   — the drags that ARE its product. `verify.mjs` performs each with
   `Input.dispatchMouseEvent` (press, N moves, release) and then reads
   `__demo.asserts` as it always has. The machine contract stays "assert on
   `__demo`, never on DOM ids"; the selectors are the one exception and they are
   the page's own declaration, not the harness's guess.
2. **The harness fails a page that declares gestures and is unmoved by them.**
   A declared gesture that changes neither the document nor the readout is a
   drawing, and the run must say so. Without this, item 1 is decoration.
3. **At least one gesture per run must be REFUSED**, and the refusal asserted.
   Prove the guard fires — break it on purpose, every run.
4. **The assert is on the far side of the wire.** Not "a `<path>` appeared" —
   the level at an `AnalyserNode` downstream of the patch, or `aconnect -l` read
   back off the board. `createMidiLane`'s `scheduled()` counted what the page
   queued and read identically to delivery while every note was scheduled
   fifty-six years out; a count of drawn wires is the same counter.
5. **`element.click()` stays in the suite as the NEGATIVE control**, not as the
   driver. A page that can be fully exercised by `.click()` has no canvas in it.
6. ⚠️ **Assert that a tap and a drag are told apart**, because the browser will
   deliver both signals for one gesture (above). One harness gesture that is a
   *press without movement* and one that is a *press with movement*, with
   different expected outcomes, is the cheapest way to hold that line.
7. ⚠️ **The coordinates are viewport pixels, so the target must be on screen.**
   `Input.dispatchMouseEvent` takes CSS viewport coordinates and
   `getBoundingClientRect()` returns them, which is why the probe worked — but a
   canvas below the fold, or one the page has panned, hands the harness a
   negative `y` and the gesture lands on nothing, silently. Scroll into view and
   assert the rect is inside the viewport before dispatching, or the failure mode
   is "the drag did nothing" for a reason that is not the page's.

#### What this rig could NOT detect

Stated because the brief asks, and because this is where the project gets burned.

- **Whether a human can hit an 11-pixel port.** A synthesised drag lands on the
  exact centre of a rect the harness computed. Nothing here measures aim.
- **A synthesised drag is not a human drag.** Six interpolated steps in a
  straight line, ~12 ms apart, one pointer, no jitter, never leaving and
  re-entering the element, never interrupted by a scroll. A gesture that works
  under CDP and fails under a thumb is entirely possible.
- **Touch at all.** `Input.dispatchTouchEvent` is a different code path
  (`pointerType: 'touch'`, `touch-action`, no hover, two-finger pan). If the
  page is meant to work on a phone, that needs its own run and nothing here
  covers it. UNCONFIRMED whether the canvas works on a phone; nobody has tried.
- **Whether the picture is legible.** Nothing in the suite looks at ink
  (LESSONS §33–38). A correct graph drawn as spaghetti asserts identically to a
  clear one.
- **Whether the patch is the one you meant.** The rig can prove a wire routes;
  it cannot prove it should exist.
- **Screen-reader behaviour.** Asserting that every port carries an `aria-label`
  is not the same as asserting a screen reader announces something useful. The
  first is cheap and worth doing; do not let it stand in for the second.

### 5.2 Phase 1 — the smallest honest first step

**slug:** `patch` · **act:** 0, the substrate · no network, no board, no relay.

Chosen because it is the word this repo already uses for the thing (`patch.plan`,
`patch.apply`, *a patch is a value*), and because a visitor who has touched a
guitar pedal knows it.

**Why this one first:** the wires are **real WebAudio connections in the page**,
so the picture cannot be a drawing — if a wire is drawn and not made, the page
goes quiet and the number says so. It needs nothing to be up, and it builds the
two things everything after it rests on: the canvas, and a harness that can
drag.

**what** — one paragraph, the shell's only prose block:

> Five boxes and the wires between them: drag from the right edge of one box to
> the left edge of another and the sound really is routed that way — these are
> not pictures of connections, they are the connections. The page listens to its
> own output and prints how loud it is, so a wire that is drawn but not made
> shows up as a number that did not move, which is the difference between a
> patch and a drawing of one. One connection per run is deliberately impossible,
> and the page refuses it and says why. Moving a box around changes where it
> sits and leaves the saved patch identical, byte for byte.

**readout** — every cell moves:

`boxes` · `wires` · `refused` · `output` (how loud the page's own output is right
now, 0 to 1) · `patch size` (bytes) · `slowest redraw` (ms)

`output` is the load-bearing cell and the whole argument of §5.1 item 4 in one
number. ⚠️ **It is a level, not a change in level.** MEASURED today in the
suite's own headless Chrome: the analyser reads exactly **0.000000** with the
wire absent and **0.2124** with it present, so a "decibels gained" cell would
print infinity on every run and then a constant — which is a cell that cannot
change, the defect CLAUDE.md names. The level moves; the assert compares it
against a floor on both sides. `refused` is never 0 — the page tries one
impossible patch per run. `patch size` is the document, which is the argument of
§4 in one number.

**controls:** `try an impossible wire` · `save` (prints both documents into the
log, so a reader can see that the layout file is the only one that changed after
a drag) · `cut every wire`, last in the row with `end: true` — the destructive
one does not sit shoulder to shoulder with the others, per the shell's own rule

**`window.__demo.gestures`** — the page declares its own drags, and the harness
performs them: output→input (expect a wire), input→input (expect refused),
box body→elsewhere (expect a move).

**`window.__demo` asserts** — twelve, and diff this count after any change:

1. every box in the document is on screen, and no others
2. a **dragged** wire exists — created by the harness's pointer events
3. **`.click()` on the same two ports creates nothing** — so assert 2 is about
   the gesture and not about a click handler *(the negative control that would
   have caught this entire class)*
4. **the wire routes**: the level at the analyser is above a stated floor with
   the wire and below it without — the floor printed from the same constant the
   page uses. *(MEASURED that this is readable in the suite's headless Chrome
   with its own flags: 0.000000 unwired, 0.2124 wired, 0.000000 after a cut.
   `AudioContext.state` is `running` immediately, because the suite already
   passes `--autoplay-policy=no-user-gesture-required`.)*
5. **cutting it returns the level below the floor** — the negative control in
   the other direction, so assert 4 cannot pass on a page that is simply loud
6. an input→input drag is **refused** and no wire appears (the guard, in this run)
7. a link whose `carry` cannot be honoured is refused **with a reason**, and
   nothing downstream of it is applied
8. the patch **round-trips**: serialise → parse → rebuild → byte-identical
   canonical form
9. **moving a box leaves the patch byte-identical** and changes only the layout
   document *(MEASURED to hold in the probe: `graph unchanged by move: true`)*
   — and the stronger form: **the page renders once with the layout document
   deleted and behaves identically**, because §4.1 rule 6 is only true if
   position is inert, and n8n is the case where it silently was not
10. the same patch makes the same sound — the document is rendered through an
    `OfflineAudioContext` and hashed, twice, and the hashes match while a
    different patch's does not. ⚠️ **Offline, not live**: MEASURED that an
    offline render of the same graph hashes identically across two runs
    (`999dadd1` both times) while the unwired graph hashes differently
    (`c3fb6f17`), and offline needs neither a clock nor a gesture. ⚠️ *This
    machine only* — `plan-visuals` §5.1 measured a 41% difference in a GPU hash
    across two backends from identical input, and float arithmetic gives no
    reason to expect audio to be more portable. UNCONFIRMED across machines;
    nobody has checked.
11. `slowest redraw` is under a ceiling printed from the same constant the page
    hands the canvas
12. every port is a focusable control carrying a name — the keyboard path exists
    *(exists, not "works"; see §5.1)*

**How a harness sees it:** `__demo.asserts` and `__demo.readout` over CDP, as
every other page. The new thing is `__demo.gestures` and the pointer dispatch.

**Where the code goes**, and it is three places and no more:
`demo/shell/nodes.mjs` (the canvas — `demo/shell/` is **enumerated** by
`build.mjs`, so it deploys with no allowlist edit), `demo/patch/index.html`, and
one row in `demo/manifest.mjs`. A `<positron-patch>` custom element is available
if the teardown matters, following `demo/shell/strip.mjs`'s precedent — and
note that ⚠️ **nothing in this repo has ever drawn SVG** — MEASURED, a search
for `createElementNS` across the whole tree returns nothing, and the only `<svg>`
anywhere is the favicon, built as a data-URL string. Every picture here is canvas
2D or WebGL. That is not a risk, but it is a new technique, and the first page to
use it should not also be the first page doing three other new things.

### 5.3 Phase 2 — the same canvas, over the real patchbay

`patch` gains a `?room=` and draws **the board's actual ALSA ports** from
`ports.get`. A drag composes a document; **nothing is applied until `patch.plan`
answers**, and the plan's verdict is what the canvas draws — a wire the plan
refuses is drawn refused, with its reason, not drawn and then undone.

Adds, on top of the twelve:

- the ports on screen are the ports `ports.get` reported, by address
- a dragged wire produced a `patch.plan` whose `steps` name the same two
  addresses — **the document, not the picture**
- `patch.apply` landed and `ports.get` **read back** the new subscription —
  the far side of the wire, on the board
- a `carry` subset is refused by the board and the canvas says so
- the round trip is timed and reported: drag → planned → applied → read back

⚠️ **A refusal must never look like a slow success.** `alsa.mjs` reports
`aconnect -l`'s empty-stdout-exit-1 as a fact rather than a throw for this
reason; the canvas inherits the obligation.

⚠️ **`patch.apply` is tokenless, like every other verb on the relay.** The blast
radius is one board's MIDI routing, which has been open since session 17 — but a
canvas makes it one drag away rather than one hand-written message away, and
that is a real change in exposure even though the permission is unchanged. Name
it; do not widen it silently.

### 5.4 Phase 3 — the JACK arm, which is worth building with no UI at all

`rig/box/jack.mjs`: `jack_lsp -c` parsed the way `parseAconnect` parses
`aconnect -l`, pure and testable against a fixture on a laptop. Then a JACK arm
in `plan()`/`apply()`, and the nine hard-coded `jack_connect`/`jack_disconnect`
calls in `jacksynth.mjs` become one document.

**This is the phase that leaves something behind if the canvas is deleted**, and
that is the argument for doing it. It also fixes a known shape of bug: `fx.pappus`
answered `ok` on a JACK *port* appearing, ~7 s before the engine was ready.

⚠️ The two arms will not have the same vocabulary. JACK can express a per-channel
connection ALSA's `carry` cannot, and ALSA has message classes JACK has no idea
about. One document, two resolvers, and the differences stated rather than
flattened — `plan-score` §1, one level up again.

### 5.5 Phase 4 — a re-patch is an event with a timestamp

Only once the first three hold. Each applied patch is appended as a row, so the
session's patching history is a lane on the strip and *"what did I have patched
last Tuesday"* is a seek rather than a search. This is the join between the patch
document and the score, and it is the ONLY one — no DAG is ever drawn on the
strip, and no time axis is ever drawn on the canvas.

### 5.6 Non-goals, written down so they do not drift in

- **No general pipeline composer.** §2.2 says three of five surfaces are not
  graphs. A canvas over them is a drawing program.
- **No routing in the relay.** Its value is that it does not parse (1–2 ms at
  p50). A node UI must not be the reason that changes.
- **No generated graphs that run.** `plan-visuals` §5.6 left "are generated
  shaders allowed to run" undecided and the answer is still no. A model may
  produce a **document**, which `plan()` then checks — `plan-hardware` §8.4's
  rule, unchanged.
- **No second position surface.** One strip, one canvas, and they draw different
  things.

### 5.7 Open decisions, and the experiment that settles each

| open | what settles it |
|---|---|
| **Does the harness get `__demo.gestures`, or a second harness file?** | Same Chrome flags as `verify.mjs`, so one file. Build it as a block inside `verify.mjs` and check the total assert count does not move for any existing demo. If it does, the block is not inert and belongs elsewhere |
| **Does the canvas work on a phone?** | UNCONFIRMED — nobody has tried. `touch-action: none`, `setPointerCapture`, and an 11 px port are three separate risks. Open `patch` on a phone for three minutes and try to make one wire |
| **How big does a port have to be to hit?** | Not answerable from a harness (§5.1). Two sizes, two people, count misses |
| **SVG wires or a `<canvas>` layer?** | SVG for phase 1 — MEASURED 0.12 ms redraw at 400 nodes, and each wire is a real element that can carry a title and a class. Revisit only if something in this repo ever has 1,000 wires, which nothing does |
| **Does a JACK connection need its own `carry` vocabulary?** | Write `jack.mjs` against a `jack_lsp -c` fixture from the board and see what the port names actually carry. Read from the tool, not assumed |
| **Is the patch document versioned per-kind, like the timeline's rows?** | `v: 1` at the top is enough while there is one producer. The moment a second one exists, `plan-timeline` C7 applies |
| **Does anyone want this more than they want a table?** | Five ports fit in a table (§2.4). Build phase 1, put both views on it, and watch which one gets used. §3.6's empirical answer predicts the split: visual wins *"what depends on what"*, text wins *"what happens next"* — so the canvas should win the patchbay and lose everything else, and if it does not, that is the finding |
| **Does the patch document ever need grouping?** | Not at five ports. ⚠️ §3.4 measured that **16.6% of ComfyUI's 1,676 open frontend issues mention subgraphs**, and a maintainer calls the linking mechanism broken — so the honest position is that grouping is where this genre goes wrong, and the experiment is to keep not needing it |
| **Is there a click-only path as well as a drag?** | Yes, and it must be a separate assert. It is the accessibility answer and the cheap harness path at once — ⚠️ but a suite that only exercises it proves nothing about the drag, which is why §5.1 keeps `.click()` as a negative control rather than a driver |

---

## 6. What would have to be true

Each of these is checkable, and each names the thing that checks it. Where one
is already false today, it says so.

1. **A harness can perform a drag.** Today it cannot — MEASURED: `.click()`
   fires `click` alone, and two `.click()`s on two ports made zero wires where
   two drags made two. *Nothing about a node canvas is green before this.* If it
   turns out to be hard, the feature waits; it does not ship ungraded.
2. **A declared gesture that changes nothing fails the run.** Otherwise §5.1
   item 1 is a list of selectors nobody checks, and a drawing passes.
3. **The assert is downstream of the wire.** An analyser level in phase 1,
   `ports.get` read back off the board in phase 2. A count of `<path>` elements
   is the same counter `createMidiLane.scheduled()` was, and it read identically
   to delivery while nothing was delivered.
4. **A guard has said no, in this run.** One impossible patch per run, refused
   with a reason. A validator that has never rejected anything is a claim.
5. **Moving a box leaves the patch byte-identical.** MEASURED in the probe
   (`graph unchanged by move: true`) and asserted on the page. If this is ever
   false, the format has fused layout with logic and §4.2's merge results apply.
6. **The editor does not reorder on save.** MEASURED: one side reordering turned
   a clean merge into a conflict and a 2-line diff into a 10-line one. Canonical
   form — arrays sorted by id, keys sorted — makes it impossible rather than
   unlikely, and `timeline/score.mjs` already does it.
7. **The saved file is pretty-printed and never minified.** MEASURED: minified,
   a move rewrites 100% of the file and any two edits conflict. It is what
   ComfyUI's `save()` writes today, and it is one argument to `JSON.stringify`.
8. 🔴 **Position means nothing.** Delete `patch.layout.json` and the rig behaves
   identically — asserted, not assumed. n8n is the cautionary case: its runtime
   orders branches by canvas position while its diff calls position "not a
   content change", so its diff reports "no change" for an edit that reorders
   execution.
9. **Nodes reference their kind; they never embed it.** MEASURED elsewhere:
   47% of a Langflow flow is embedded Python source, and the vendor's own
   starter flow has drifted from what it embeds. A missing reference fails
   loudly; a stale copy runs.
10. **`plan()` refuses an unknown `v`**, because §3.3 found that none of the
    five tools enforces its own version metadata at runtime. `alsa.mjs` already
    refuses; keep it that way when the document grows.
11. **Links reference ids, never indices.** Pure Data's thirty years are the
    evidence; the cost of getting it right is zero.
12. **The JACK arm exists as a document before the canvas draws it.** Otherwise
    phase 3 is a picture of nine hard-coded shell strings.
13. **A refusal reaches the reader in words.** Not a missing wire, not a wire
    that appears and vanishes. `alsa.mjs` already reports `aconnect -l`'s
    empty-stdout-exit-1 as a fact for exactly this reason.
14. **Nothing is applied that was not planned.** `apply()` refuses a plan with
    problems outright — there is no "apply the parts that worked", because a
    half-applied patch is a rig whose state nobody wrote down.
15. **The relay stays a dumb pipe.** If a node UI ever needs the relay to route,
    the UI is wrong, not the relay. 1–2 ms at p50 is what not parsing buys.
16. **The seed is in the document and the output is not.** `mulberry32` is the
    precedent. A node that cannot reproduce itself from its own `params` is
    carrying a reference, and the document says so.
17. **Every port has a name a machine can read**, and nobody claims that means
    the canvas is accessible. Two different facts; do not let the cheap one
    stand in for the expensive one.
18. **The canvas has been opened on a phone.** UNCONFIRMED today. Three risks
    (`touch-action`, pointer capture, an 11 px target) and none is measured.
19. **The page says which surface it is drawing.** A canvas over the board's
    patchbay and a canvas over a page's own audio chain are different claims,
    and a reader who cannot tell them apart will believe the stronger one.
20. **Somebody uses it instead of the table.** Phase 1 ships both. If the table
    wins, that is a result, and the honest response is to keep the document and
    delete the canvas — the document was always the part that outlives the UI.
