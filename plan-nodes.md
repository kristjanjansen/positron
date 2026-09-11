# plan-nodes — boxes joined by wires, and whether this project has a graph to put in one (2026-09-11)

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

Three things in this repo compose, and only one of them is a graph.

| | what it really is | can a node editor drive it? |
|---|---|---|
| the ALSA/JACK patchbay on the Pi | a **directed graph of ports**, already half-expressed as a checkable document (`rig/box/alsa.mjs`) | **yes, today** |
| the relay | a **broadcast bus** — every message goes to every socket in the room, by design | no; there is nothing to patch |
| the timeline | a **temporal nest** — quotations placed in time, not outputs feeding inputs | no; its picture is the strip, and it already has one |

So the honest target is the first one: **a graph view of the box's patchbay,
plus the browser's own audio and shader chain**, not a universal pipeline
composer. A node editor pointed at the other two would be a drawing program —
and this project has already recorded, three separate times, what it costs to
have a surface that looks like it is working while reaching nothing.

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

- **Size, MEASURED by fetching the published bundles today.** `drawflow.min.js`
  **46,190 B** (8,617 gzip) plus 1,910 B of CSS; `rete` core ESM **28,824 B**
  (5,719 gzip) and that is the core *only*, before a renderer plugin;
  `litegraph.min.js` **491,365 B** (122,500 gzip); `@antv/x6` `dist/x6.min.js`
  **583,499 B**. For comparison the hand-written canvas of §1.4 is **5,477 bytes
  of un-minified, commented source** — 8.4x smaller than Drawflow's *minified*
  build, 90x smaller than LiteGraph's, 107x smaller than X6's.
- **A library that looks alive and was last released in 2019 is a finding**, and
  there are several below.

SECTION_1_2_1_3_PLACEHOLDER

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

For scale: the board's own patchbay fixture has **five** addressable ports (MEASURED). The
largest graph this project could plausibly draw is a few dozen boxes. **Every
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
| accessibility | ports as `<button>`s and a click-then-click path are cheap and in the 116 lines; a genuinely screen-reader-usable graph is not, and no library in §1.2 ships one either (React Flow documents Tab/Enter/arrow-key operation; that is the high-water mark) |
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

**Two things to import anyway, later and separately:**

- **A layout engine, if and only if a graph ever needs one.** It takes a
  document and returns coordinates; it never touches the editor, which is
  exactly the "large thing" the preference says to import. MEASURED 2026-09-11:
  **`@dagrejs/dagre` 3.1.1 (2026-08-08), MIT, 2.3 M weekly downloads** is the
  maintained fork — ⚠️ plain **`dagre` on npm is 0.8.5 from 2019-12-03** and
  still pulls 1.4 M downloads a week, which is the "looks alive, last touched
  years ago" trap in its purest form. **`elkjs` 0.12.0 (2026-07-17)** is better
  at ports and orthogonal edges and is what mermaid uses, but it is
  **1,609,707 bytes bundled (466,703 gzipped)** — 294x the whole canvas — and is
  licensed **EPL-2.0 OR GPL-3.0-or-later**, which for an R&D repo is a footnote
  rather than a gate but should be a *noted* footnote. Run either in a worker.
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

### 2.2 ⚠️ The sharpest question: which of those four is a graph a UI can drive?

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
dropped (Circuit, MicroFreak, Digitakt, and two virtual ports). A real dawless rig is a dozen.
This is a graph you can see all of, which is not true of anything in §3.

⚠️ **`carry` is refused, not approximated** — an ALSA subscription carries every
message class the source emits and there is no per-class flag, so a document
asking for `["note"]` is rejected by name. A node editor must draw that refusal
rather than quietly drawing a wire. DOCUMENTED in `rig/box/README.md`; the
behaviour is in `alsa.mjs:190`.

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
`rig/box/jacksynth.mjs` lines 244–246, 290–291, 293, 488, 499 and 510. There is no document, no plan twin, no report of what
is connected, and **`fx.pappus` already had one defect of exactly this shape** —
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

SECTION_3_PLACEHOLDER

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

Five rules, each of which this repo already applies somewhere else:

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

### 4.2 What the alternatives actually cost — MEASURED

Two people edit one patch. One **moves a box**; the other **changes that node's
params and rewires a link into it**. A real three-way `git merge`, twelve nodes,
eleven links, run today:

| the save file is… | a move alone touches | `git merge` |
|---|---|---|
| one pretty-printed JSON document, x/y inline | 2 lines of the patch | **merged clean** |
| JSONL, one line per node, x/y on that line | 2 lines of the patch | **CONFLICT** |
| two files: logic + layout | 2 lines of `layout.json`, **0 of the patch** | **merged clean** |
| one pretty JSON, and one side's editor **reordered the nodes array on save** | **10 lines** | **CONFLICT** |
| canonical (sorted arrays, sorted keys) + separate layout, same reorder | 2 lines of `layout.json` | **merged clean** |

Three findings, and the first one is not what the genre's folklore says:

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
  contains only patching.

### 4.3 The formats that already exist, and why none of them is it

- **JSON Canvas 1.0** (MIT, Obsidian, [jsoncanvas.org](https://jsoncanvas.org/spec/1.0/), DOCUMENTED) — `nodes` and
  `edges` arrays; every node **requires** `id`, `type`, `x`, `y`, `width`,
  `height`. Coordinates are mandatory and inline, and its node types are `text`,
  `file`, `link`, `group`. It is a format for a *thinking canvas*, not a signal
  graph; adopting it would make position part of the logic, which is the one
  thing §4.2 measured as costly. Worth knowing about as an **export** target.
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
6. ⚠️ **The coordinates are viewport pixels, so the target must be on screen.**
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

**controls:** `cut every wire` · `one that cannot work` · `save` (prints the two
documents into the log, so a reader can see that the layout file is the only one
that changed after a drag)

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
| **Does anyone want this more than they want a table?** | Five ports fit in a table (§2.4). Build phase 1, put both views on it, and watch which one gets used |

---

## 6. What would have to be true

Each of these is checkable, and each says who checks it. If one of them is
false, the row under it says what the plan becomes instead.

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
7. **Links reference ids, never indices.** Pure Data's thirty years are the
   evidence; the cost of getting it right is zero.
8. **The JACK arm exists as a document before the canvas draws it.** Otherwise
   phase 3 is a picture of nine hard-coded shell strings.
9. **A refusal reaches the reader in words.** Not a missing wire, not a wire that
   appears and vanishes. `alsa.mjs` already reports `aconnect -l`'s
   empty-stdout-exit-1 as a fact for exactly this reason.
10. **Nothing is applied that was not planned.** `apply()` refuses a plan with
    problems outright — there is no "apply the parts that worked", because a
    half-applied patch is a rig whose state nobody wrote down.
11. **The relay stays a dumb pipe.** If a node UI ever needs the relay to route,
    the UI is wrong, not the relay. 1–2 ms at p50 is what not parsing buys.
12. **The seed is in the document and the output is not.** `mulberry32` is the
    precedent. A node that cannot reproduce itself from its own `params` is
    carrying a reference, and the document says so.
13. **Every port has a name a machine can read**, and nobody claims that means
    the canvas is accessible. Two different facts; do not let the cheap one
    stand in for the expensive one.
14. **The canvas has been opened on a phone.** UNCONFIRMED today. Three risks
    (`touch-action`, pointer capture, an 11 px target) and none is measured.
15. **The page says which of the five surfaces it is drawing.** A canvas that
    draws the board's patchbay and a canvas that draws a page's own audio chain
    are different claims, and a reader who cannot tell them apart will believe
    the stronger one.
16. **Somebody uses it instead of the table.** Phase 1 ships both. If the table
    wins, that is a result, and the honest response is to keep the document and
    delete the canvas — the document was always the part that outlives the UI.
