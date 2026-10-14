# Page comments: connect

The full comments cut from the code under demo/ for connect, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="connect-1"></a>
## connect-1: demo/connect/index.html, inline script, line 137

````js
  // ── what the site has, read rather than typed ───────────────────────────
  // Every node in the grid is one the site's own pages build, each shown ONCE
  // as a type (a knob, not knob-cutoff and knob-q), with the pages that build
  // it as links. Three sources:
  //   1. demo/shell/nodes.mjs NODES, the browser-side types read off the
  //      concept pages (plans/plan-node-catalogue.md, step 1). The key is the
  //      catalogue name and it is the box's id here, because four entries share
  //      the id segment `shader` on four different pages.
  //   2. boardGraph() in graph-registry.mjs, fed what the board announces
  //      (rig/board/board.mjs: synth, the granulator insert, the sampler, the
  //      Circuit on input 1, JACK, the GPU). Only the Pi nodes a concept page
  //      really plays are kept, and boardGraph has no `pages`, so PI_PAGES says
  //      which, read 2026-10-14 off the pages' own BOARD_SITE ids.
  //   3. The hops between sites, which are catalogue entries too (shout,
  //      stream-live, stream-hls, moq-relay), drawn after the Pi as before.
  //      cf-relay is not one: the patchbay draws it from a link.
````

<a id="connect-2"></a>
## connect-2: demo/connect/index.html, inline script, line 243

````js
  // Example requests, each with the links a right answer contains and the
  // concept page that already makes them (the third field), so no example
  // promises something no page does. The self-check proves every one can be
  // made in this bay, and its stand-in answers with them.
````

<a id="connect-3"></a>
## connect-3: demo/connect/index.html, inline script, line 286

````js
  // ── asking the wish worker ───────────────────────────────────────────────
  // The worker proposes and never connects (workers/wish/src/wish.mjs), so an
  // answer becomes rows a person confirms. Every call spends the paid Workers AI
  // account: only on a press, never on a visit, and never from the self-check.
````

<a id="connect-4"></a>
## connect-4: demo/connect/index.html, inline script, line 304

````js
  // The worker refuses more than 64 ports (workers/wish/src/index.js MAX_PORTS)
  // and the bay holds about three times that, so the model is told the most
  // useful 64: every port an example names, then the other ports of the nodes
  // those examples use, then nothing. The rest stay pressable in the grid.
````

<a id="connect-5"></a>
## connect-5: demo/connect/index.html, inline script, line 335

````js
  // No typed request for now (asked 2026-10-14, *"rm ask button and input atm"*):
  // an example press is the request.
  // What runs of an example, read off the runtimes rather than typed: a node
  // with no runtime marks its pill until one is written, and a node that opens
  // a paid service or somebody else's server makes it a person's press only.
````

<a id="connect-6"></a>
## connect-6: demo/connect/index.html, inline script, line 558

````js
  // ── the live layer: what is present in a room right now ─────────────────
  // A person presses Listen in a room they choose. The Pi puts its graph on
  // every beat and a page in the room announces its own (announce.mjs). Live
  // is a state on the boxes: a green dot when heard inside STALE_MS, an empty
  // ring once quiet, nothing when never heard. A node the Pi has and no page
  // here draws yet is a box of its own; another tab is a group of its own.
````

<a id="connect-7"></a>
## connect-7: demo/connect/index.html, inline script, line 1047

````js
  // ── the runtimes past slice 3, one example each ───────────────────────────
  // Each is pressed the way a person would, through its own face or its own
  // handler, and graded on the far side of its link: what the next runtime
  // heard, what reached the speakers, what the OLED drew.
````

<a id="connect-8"></a>
## connect-8: demo/connect/index.html, inline script, line 1389

````js
  // ── the live layer, against the stand-ins ─────────────────────────────────
  // Only with `?relay=` on this machine (demo/fake-relay.mjs) and a private
  // room, where demo/fake-board.mjs answers as the Pi. Without them these are
  // left out and the log says so, because a check never reaches the real relay.
````

<a id="connect-9"></a>
## connect-9: demo/connect/index.html, inline script, line 1477

````js
  // ── the Pi, joined from its own face, against the stand-in board ───────────
  // demo/fake-board.mjs answers in the private room and its `-circuit` input
  // room with the board's own code, and counts on its side what reached the
  // Circuit's port. Never studio-1: the room is the check's own.
````
