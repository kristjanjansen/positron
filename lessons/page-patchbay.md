# Page comments: patchbay

The full comments cut from the code under demo/ for patchbay, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="patchbay-1"></a>
## patchbay-1: demo/patchbay/index.html, inline script, line 74

````js
  /* 🔴 `/rout/` AND `/graph/` AS ONE PAGE, asked 2026-10-04: *"i am cofused
     over rout and graph demo. unify? better name?"*, named *"Patchbay"*. The
     graph decides what exists and how a link travels; the routing core decides
     what happens to each MIDI message inside a link, and here a MIDI link from
     the keys really runs through it. Both old pages stay at their URLs.
     🔴 WHY THIS PAGE EXISTS: `plans/plan-universal-routing.md`, asked
     2026-10-04 as *"What about route-anything work?"* then *"Do it ... Nee
     demo"*. It is step 2 of that plan made visible: `bay.mjs` knows eight
     media, and a link of a heavy one carries a session instead of bytes. */
````

<a id="patchbay-2"></a>
## patchbay-2: demo/patchbay/index.html, inline script, line 93

````js
  // ── the desk ─────────────────────────────────────────────────────────────
  //
  // ⚠️ A DESCRIPTION OF THINGS THAT EXIST, NOT A SIMULATION OF THEM. Every node
  // is something positron already talks to, named the way the plan names it,
  // and every shape is the one the wire already declares (the board's
  // `audioChannels` and `frameMs`, the GPU's video). `place` is the machine,
  // `net` the network it is on, and the transport is chosen from those two.
````

<a id="patchbay-3"></a>
## patchbay-3: demo/patchbay/index.html, inline script, line 127

````js
  /* The lines a visitor can step through, in the order they teach: a light
     link, a heavy one on one network, code to an engine, video across the
     internet, a recording, the same sound to a second listener, then the two
     a validator exists for. */
````

<a id="patchbay-4"></a>
## patchbay-4: demo/patchbay/index.html, inline script, line 150

````js
  // ── the live desk: what announces itself in the studio's room ──────────
  //
  // 🔴 STEP 3 OF THE PLAN: `/graph/` draws what exists. The board puts its graph
  // on every `board.alive` (`demo/shell/graph-registry.mjs`), this page sends
  // its own as `graph.announce`, and anything else in the room that announces
  // is drawn too. A board that stops answering is still drawn, marked stale.
  // ⚠️ JOINING THE ROOM OPENS NOTHING BUT OUR OWN RELAY: no audio is asked for,
  // no lease is taken, and the page only listens and says what it is.
  // 🔴 AND IT JOINS ON A PRESS OF Join, NEVER ON LOAD, IN `?room=` WHEN THE PAGE
  // HAS ONE, SINCE 2026-10-06 (`demo/shell/bay-node.mjs`, plan-routing-migration
  // §3.4). Until then `ROOM` was `studio-1` with no `?room=` read and the join
  // ran at the top of this script, so every visit and every suite run put a
  // `web` site on the owner's desk and asked the Pi `graph.ask`.
  // 🔴 AND THIS TAB IS A SITE OF ITS OWN, `web-<four>`, not `web`: two visitors'
  // patchbays used to overwrite each other's `web` in every registry in the room.
````

<a id="patchbay-5"></a>
## patchbay-5: demo/patchbay/index.html, inline script, line 187

````js
  /* 🔴 THE STORE IS ANNOUNCED BY THIS PAGE, BECAUSE THIS PAGE IS WHAT WRITES
     TO IT (plan-universal-routing §10 item 5). A recording is made by the
     browser that hears the sound and uploaded through ingest, so the store's
     ports exist exactly as long as a page that can use them does.
     ⚠️ IT IS NOT SENT TO THE ROOM. A registry keeps one graph per socket and
     site since 2026-10-06, so it could be, and is still not: every patchbay
     describes the same store, and its ports are used only by the page that
     announces them. It lives in this page's own registry (`local`). */
````

<a id="patchbay-6"></a>
## patchbay-6: demo/patchbay/index.html, inline script, line 203

````js
  /* The room, the announce, `graph.ask`, the re-announce and `link.request`
     are `bay-node.mjs`'s. Building it opens nothing; Join does. It is made
     further down, beside the rest of the room's handlers, and only its
     registry is needed before then. */
````

<a id="patchbay-7"></a>
## patchbay-7: demo/patchbay/index.html, inline script, line 222

````js
  // ── the picture, built from whatever the bay holds ───────────────────────
  //
  // ⚠️ `atEnd: false`, the one exception `positron-diagram` allows: this
  // picture changes when the reader presses something, so it sits beside it.
  // 🔴 A PLACE WITH SOURCES AND RECEIVERS IS DRAWN TWICE, BY ROLE. The first
  // layout put the browser's screen beside its keys, so sound from the Pi came
  // back right to left under the row, through other boxes. Split by role (the
  // `/keys/` shape `positron-diagram` records), links read left to right.
````

<a id="patchbay-8"></a>
## patchbay-8: demo/patchbay/index.html, inline script, line 302

````js
  // ── scenes: a set of links kept under a name ─────────────────────────────
  //
  // 🔴 A RECALL IS A DIFF, NOT A TEARDOWN (`plans/plan-route-core.md` §5,
  // *"Changes are diffs"*). A link in both the current set and the scene is not
  // touched, so a stream that is open stays open; a link only in the current set
  // is closed and unlinked; a link only in the scene is made and DESCRIBED.
  // ⚠️ AND A RECALL OPENS NOTHING, WHEREVER IT CAME FROM. Opening stays a
  // person's press on Open, so a `scene.recall` from another page in the room,
  // such as `/partitur/`'s scenes lane, can change what is described and close
  // what a scene leaves out, and cannot start a stream on anybody's hardware.
  // ⚠️ SCENES LIVE IN THIS BROWSER, in `localStorage`, which may throw or come
  // back empty, so every read and write is wrapped and the page works without
  // it. The harness keeps them in memory only, so a run leaves nothing behind.
````

<a id="patchbay-9"></a>
## patchbay-9: demo/patchbay/index.html, inline script, line 398

````js
  /* ⚠️ NOT IN `.pos-controls`. The harness presses that row by position, and
     this press joins a room: a run that pressed it would join, and a control
     added there moves every other control's press. The check pass joins the
     run's own room itself, explicitly. */
````

<a id="patchbay-10"></a>
## patchbay-10: demo/patchbay/index.html, inline script, line 459

````js
      // ⚠️ WHILE A LINK IS OPEN ITS ROW SAYS WHAT IS REALLY CARRYING IT. The
      // plan's table chose WHEP for the Pi's video; the opener uses the board's
      // relay H.264 path, and a row naming the plan's choice would be a claim.
````

<a id="patchbay-11"></a>
## patchbay-11: demo/patchbay/index.html, inline script, line 544

````js
  /* 🔴 THE FIRST BOARD HEARD GETS THREE LINKS, WHERE ITS PORTS EXIST. With no
     links the picture has no left and right, so every machine stacked in one
     column at one height and the browser's two boxes stood empty and tall. A
     link here is a description in memory and opens nothing. */
````

<a id="patchbay-12"></a>
## patchbay-12: demo/patchbay/index.html, inline script, line 557

````js
  // ── step 4: opening a link for real ──────────────────────────────────────
  //
  // 🔴 A DESCRIBED LINK OPENS NOTHING, AND ONLY A PERSON'S PRESS OPENS ONE.
  // The starter links, a visit and the harness all leave the board alone: a
  // lease starts a capture on hardware in another building, and the rule here
  // is that a visit opens nothing. Under `?selfcheck=1` Open says so and stops.
  // 🔴 THE OPENERS ARE `demo/shell/openers.mjs` SINCE 2026-10-06, chosen by the
  // TRANSPORT the link's session names, not by its medium (plan-routing-migration
  // step 2). They were eight functions in this page; the board verbs they send
  // are unchanged. Each open link wears a `link-badge.mjs` word, STARTING,
  // RECEIVING or STALLED, from what its far side counted, the stage's tag.
````

<a id="patchbay-13"></a>
## patchbay-13: demo/patchbay/index.html, inline script, line 794

````js
    // ⚠️ NEGATIVE CONTROL: a graph that is not on its own site is not heard.
````

<a id="patchbay-14"></a>
## patchbay-14: demo/patchbay/index.html, inline script, line 817

````js
    // ⚠️ NEGATIVE CONTROL: the store takes sound, so a picture is refused.
````

<a id="patchbay-15"></a>
## patchbay-15: demo/patchbay/index.html, inline script, line 828

````js
    // ⚠️ NEGATIVE CONTROL: the same call without the guard reaches the opener,
    // so the check above is the guard and not a link that never matched.
````

<a id="patchbay-16"></a>
## patchbay-16: demo/patchbay/index.html, inline script, line 848

````js
    /* ⚠️ THIS SAID `a third listener ... is many receivers` UNTIL 2026-10-06,
       and the third was the recording. A link into a store is an upload, not a
       listener (`bay.mjs` `whereOf`), so the phone after it is the first
       receiver across the internet. Many receivers is graded in `bay-test.mjs`. */
````

<a id="patchbay-17"></a>
## patchbay-17: demo/patchbay/index.html, inline script, line 854

````js
    // ⚠️ NEGATIVE CONTROLS: the two links this graph exists to refuse.
````

<a id="patchbay-18"></a>
## patchbay-18: demo/patchbay/index.html, inline script, line 888

````js
    // ⚠️ NEGATIVE CONTROL: a scene identical to now changes nothing at all.
````

<a id="patchbay-19"></a>
## patchbay-19: demo/patchbay/index.html, inline script, line 902

````js
    // ⚠️ NEGATIVE CONTROL: the test-case comparison has to be able to fail.
````

<a id="patchbay-20"></a>
## patchbay-20: demo/patchbay/index.html, inline script, line 922

````js
    // 🔴 THE OPENER IS CHOSEN BY THE SESSION'S TRANSPORT (openers.mjs), on a
    // scratch live desk from fixtures: data only, nothing opens.
````

<a id="patchbay-21"></a>
## patchbay-21: demo/patchbay/index.html, inline script, line 949

````js
    // ⚠️ NEGATIVE CONTROL: a picture from a page that says nothing of how it
    // travels is WHEP by the table, and nothing here opens WHEP. Dispatch on the
    // medium would have sent it to the board's video.start.
````

<a id="patchbay-22"></a>
## patchbay-22: demo/patchbay/index.html, inline script, line 957

````js
    // 2026-10-11: a link between two of the Pi's own audio ports rides its JACK
    // graph, and the board applies it (`jack.link`, openers.mjs `jack`). Graded
    // on a scratch bay; the far side, the graph read back and the sound in the
    // room, is `rig/board/jack-bay-live.mjs` against the real board.
````

<a id="patchbay-23"></a>
## patchbay-23: demo/patchbay/index.html, inline script, line 979

````js
    // ⚠️ NEGATIVE CONTROL: a count that never grows stays starting and never
    // reads receiving, and a growing one does, through the real badge.
````

<a id="patchbay-24"></a>
## patchbay-24: demo/patchbay/index.html, inline script, line 996

````js
  // 🔴 THE ROOM (bay-node.mjs). These two read state and open nothing.
````

<a id="patchbay-25"></a>
## patchbay-25: demo/patchbay/index.html, inline script, line 1002

````js
    // 🔴 THE ROUND TRIP, in the run's own room only: a second node in this tab
    // stands in for another page, announces a lane, and answers link.request.
    // The patchbay hears it, links it, opens it with the remote opener, and the
    // lane's own page says yes or no. Nothing reaches the studio.
````

<a id="patchbay-26"></a>
## patchbay-26: demo/patchbay/index.html, inline script, line 1029

````js
    // ⚠️ NEGATIVE CONTROL: this page's own keys, asked for by another page, are refused in words, not left unanswered.
````
