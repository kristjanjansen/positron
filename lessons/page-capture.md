# Page comments: capture

The full comments cut from the code under demo/ for capture, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="capture-1"></a>
## capture-1: demo/capture/index.html, style, line 13

````css
  /* SIDE BY SIDE, and stacked when there is no room. The source and what came
     back are the two things compared, and a column puts one off the screen
     while you look at the other. `min(100%, 300px)`: a bare 300 px floor is a
     column wider than a 320 px phone's content box, which drags the page
     sideways rather than stacking. */
````

<a id="capture-2"></a>
## capture-2: demo/capture/index.html, style, line 31

````css
  /* The box draws the screen's edge itself, so before the first take it reads
     as an empty screen beside the source rather than as a 16:9 hole in the
     page (photographed at 375: a 230 px void between SOURCE and PLAYBACK). One
     edge per object, so the videos inside it give up theirs. */
````

<a id="capture-3"></a>
## capture-3: demo/capture/index.html, inline script, line 58

````js
  // /capture/, four old pages as the tabs of one (2026-10-04, decided by the
  // owner as *"names ok, looper retires, no redrect, capture is fine"*,
  // `plans/plan-demo-structure.md` §3.5): TAKES from `take`, SEGMENTS from the
  // old `capture` and `record`, ROUND TRIP from `keep`, FAR END from `show`.
  // Each tab is a module beside this file; `createTabPage` builds a tab the
  // first time it is opened, gives it its own readout and log, and runs every
  // tab's checks from the one SELFCHECK pass below.
  //
  // 🔴 NOTHING OPENS ON LOAD. Building the tab that is open opens nothing
  // either: no camera, no recording, no ingest request, no WebRTC connection,
  // no relay ask. Each tab asserts its own half of that before its first press.
  //
  // 🔴 ROUND TRIP IS THE ONE DEEP CHECK. It holds a WHIP and a WHEP leg on
  // Cloudflare Stream, which is minutes billed on every run, so an ordinary run
  // stops at the relay ask and logs `left for the deep run`;
  // `DEMO_DEEP=1 node demo/verify.mjs capture` runs the rest.
  //
  // THE PUBLISHED BAR IS TAKES's, the tab the page opens on, so the harness
  // drills it as it drilled `/take/`'s. The other three bars are `publish:
  // false` and drilled as page asserts by `bar-drill.mjs`.
````

<a id="capture-4"></a>
## capture-4: demo/capture/index.html, inline script, line 88

````js
    // No `what` under the title: each tab says what it is in the box under the
    // tab row (`tab-page.mjs` rule 6), asked 2026-10-05 as *"rm top desriptions"*.
    // The manifest's `one` line still describes the page on the index.
````

<a id="capture-5"></a>
## capture-5: demo/capture/common.mjs, module, line 1

````js
// demo/capture/common.mjs: what the four tabs of `/capture/` would otherwise
// each type out: a row of buttons that is not `.pos-controls`, a generated
// picture with an optional camera under it, and the MediaRecorder duration
// dance. Four pages carried four copies of the last two (`take`, `record`,
// `keep`, `show`, plus `capture` itself), so the merge is the moment to keep one.
//
// 🔴 THE BUTTON ROW IS HERE AND NOT IN `demo/shell/` ONLY BECAUSE THIS AGENT
// MAY NOT TOUCH `demo/shell/`. Every tabbed page needs it (`tab-page.mjs` rule
// 4: a tab's controls never go in `.pos-controls`, because the harness presses
// that row by position across the whole document), and `/sync/`, `/time/` and
// `/wire/` will each want the same thing. It belongs in the kit beside
// `createTabPage`; reported, not done.
````

<a id="capture-6"></a>
## capture-6: demo/capture/common.mjs, module, line 17

````js
/**
 * Requests this page made whose URL matches `test`, started before `beforeMs`
 * when given, from resource timing: what the browser fetched, not what a tab
 * remembered to count. Read by every tab's "building this tab opened nothing"
 * check and by ROUND TRIP's relay ask.
 *
 * ⚠️ A REQUEST STILL IN FLIGHT HAS NO ENTRY YET. MEASURED 2026-10-04 by
 * sabotage: an ask made while ROUND TRIP was being built, one frame before the
 * check pressed Send and receive, read `0 before it` and stayed green, while
 * the same ask made when the module loaded went red on both checks (2 of 73).
 * So this sees an ask on LOAD, which is the defect it exists for, and can miss
 * one made a few milliseconds before the press.
 */
````

<a id="capture-7"></a>
## capture-7: demo/capture/common.mjs, module, line 39

````js
/**
 * A row of plain buttons for one tab, with the shell's busy treatment: a
 * handler that returns a promise disables its button and sets `data-busy`
 * (the sweep in shell.css, `button[data-busy="1"]`) until it settles.
 *
 * ⚠️ NOT `.pos-controls`, ON PURPOSE. See the header. The class is `cap-row`
 * and the page's stylesheet lays it out the way the shell lays out its own row.
 *
 * @param {Array<{id:string,label:string,primary?:boolean,end?:boolean}>} spec
 * @param {(msg:string, kind?:string)=>void} log  the tab's log
 */
````

<a id="capture-8"></a>
## capture-8: demo/capture/common.mjs, module, line 87

````js
/**
 * The generated test picture on a 1280x720 canvas, with the camera drawn UNDER
 * it on request so the burned clock survives either way.
 *
 * 🔴 IT DRAWS ONLY WHILE SOMEBODY COULD BE LOOKING OR SOMETHING IS READING IT.
 * Four tabs each running a 25 fps burn of a 1280 canvas behind closed panels is
 * four pictures nobody sees. `alive()` says when a hidden tab still needs its
 * frames (a recording, a WHIP leg): a captured stream off a canvas that is not
 * redrawn simply stops, which would freeze a far end for a reason that is not
 * the network's.
 *
 * @param {object} o
 * @param {() => object} o.opts   burn options per frame (hue, position, ...)
 * @param {() => boolean} [o.alive]  true when frames are needed while hidden
 * @param {object} [o.media]  getUserMedia video constraints
 */
````

<a id="capture-9"></a>
## capture-9: demo/capture/farend.mjs, module, line 1

````js
// FAR END, from the retired `/show/` (2026-10-04, `plans/plan-demo-structure.md`
// §3.5). A picture goes live over WebRTC to a second connection in this same
// page, and what that far end receives, decode losses and all, is what gets
// recorded, then played back on a deck.
//
// The peer is a second RTCPeerConnection in this page. That is a real WebRTC
// hop (offer and answer, ICE, encode, packetize, decode) and the only shape
// deterministic enough to assert on with one browser. It costs nobody anything:
// no relay, no Cloudflare, host candidates only. `?room=NAME` additionally
// offers the stream to the relay so a second copy of this page anywhere joins as
// a genuine remote peer; that leg is logged and never asserted, because an
// assert that needs a second human varies the suite total.
//
// WHAT CHANGED IN THE MOVE: the controls are this tab's own buttons, and the
// checks press them rather than waiting for a harness to. The six readout cells
// and the nine checks are `show`'s.
````

<a id="capture-10"></a>
## capture-10: demo/capture/farend.mjs, module, line 42

````js
  // ALIVE WHILE THE LEG IS UP: the canvas is the wire's source of truth, and a
  // captured stream off a canvas that stops being drawn stops.
````

<a id="capture-11"></a>
## capture-11: demo/capture/farend.mjs, module, line 140

````js
      // A BACKGROUND TAB IS NOT A BROKEN DEMO: Chrome throttles the source
      // canvas's timer to ~1 Hz when the page is hidden.
````

<a id="capture-12"></a>
## capture-12: demo/capture/farend.mjs, module, line 150

````js
  /**
   * The optional real remote leg, `?room=NAME`. Logged, never asserted. It
   * BOTH offers and answers, with glare broken by id order, so two copies of
   * this page connect instead of each sending an offer nobody answers.
   */
````

<a id="capture-13"></a>
## capture-13: demo/capture/farend.mjs, module, line 278

````js
      // THE PICTURE IS THE MASTER (media-master L1). Somebody still has to apply
      // a scrub to the picture, or the vector snaps back a tick later; every
      // seek path goes through `deck.seek()`, so wrapping it once is the whole of it.
````

<a id="capture-14"></a>
## capture-14: demo/capture/farend.mjs, module, line 347

````js
      // BACK TO THE START, so the bar drill that follows has to move the
      // playhead to land its seek: left at the middle, its `5` key would land
      // where the check above already put it and could not fail.
````

<a id="capture-15"></a>
## capture-15: demo/capture/roundtrip.mjs, module, line 1

````js
// ROUND TRIP, from the retired `/keep/` (2026-10-04, `plans/plan-demo-structure.md`
// §3.5).
//
// 🔴 RETIRED 2026-10-13. Its WHIP leg went out through pub's /whip onto the
// input whep-rig and came back over WHEP from it; that input is deleted and
// /whip answers 410. Send and receive now asks for the relay servers (the one
// check that needs no leg) and then says the leg is retired, at once, rather
// than failing a publish. A deep run (`DEMO_DEEP=1`) therefore reads the two
// leg asserts red with that reason, and `roundTripChecks()` with them: those
// reds are EXPECTED and say so in their detail. The leg's code is in git at
// be7737d. A round trip that still has an input behind it is
// /video/webrtc/ (WebRTC loopback). The picture you send goes out to Cloudflare over WHIP and comes back
// over WHEP, and what you record is the copy that came back. Every frame
// carries a clock written into the pixels before it left, so dragging the line
// and watching that clock move by the same amount proves the seek landed.
//
// 🔴 THE ROUND TRIP IS A DEEP CHECK. It holds a WHIP and a WHEP leg on
// Cloudflare Stream for 20 to 30 s and records two takes, which is Stream
// minutes on every run. An ordinary run (`selfcheck=1`) presses Send and
// receive, grades the one thing that needs no leg (the relay servers were asked
// for on the press and not on load), and stops with `left for the deep run`.
// `DEMO_DEEP=1 node demo/verify.mjs capture` runs `roundTripChecks()`, keep's
// fourteen, unchanged. A person's press is never affected.
//
// WHAT CHANGED IN THE MOVE:
//   - `keep` published four readout keys and hid the row. The round trip and
//     the route already sit on the received picture as panel values, so the
//     four are gone rather than drawn as a second copy.
//   - `keep` fetched its remembered R2 takes back on LOAD with `?r2=1`. A tab
//     opens nothing until a press (`tab-page.mjs` rule 1), so they come back on
//     the first press of Send and receive, and the log says so on open.
````

<a id="capture-16"></a>
## capture-16: demo/capture/roundtrip.mjs, module, line 83

````js
  // ── the source: our own picture, published out ──────────────────────────
  // ALIVE WHILE A LEG IS UP: a captured stream off a canvas that stops being
  // drawn stops, and the far end would freeze for a reason that is not the
  // network's.
````

<a id="capture-17"></a>
## capture-17: demo/capture/roundtrip.mjs, module, line 101

````js
  // THE ROUND TRIP AND THE ROUTE IT TOOK, AS TWO CELLS on the picture they
  // describe: `direct`, or `relay` when either leg went through Cloudflare's
  // TURN relay, because a relayed round trip is not comparable to a direct one.
````

<a id="capture-18"></a>
## capture-18: demo/capture/roundtrip.mjs, module, line 149

````js
  // ── the round trip ────────────────────────────────────────────────────────
  // 🔴 RELAY SERVERS ARE ASKED FOR ON THE PRESS, NEVER ON LOAD, and handed to
  // both legs. `fetchIceServers` never throws: with no relay it returns STUN
  // alone and says why. ICE still picks the route.
````

<a id="capture-19"></a>
## capture-19: demo/capture/roundtrip.mjs, module, line 183

````js
    // 🔴 GRADED HERE, RIGHT AFTER THE PRESS: it is the one fact that needs no
    // leg, so it runs on an ordinary run as well.
````

<a id="capture-20"></a>
## capture-20: demo/capture/roundtrip.mjs, module, line 189

````js
    // 🔴 THE ROUND TRIP IS A DEEP CHECK (see the header).
````

<a id="capture-21"></a>
## capture-21: demo/capture/roundtrip.mjs, module, line 201

````js
    // RETIRED 2026-10-13 (see the header): no leg to open, so say so and stop.
````

<a id="capture-22"></a>
## capture-22: demo/capture/roundtrip.mjs, module, line 206

````js
  /**
   * HOW FAR THE PICTURE TRAVELLED, on one clock. The number in the received
   * frame was written by THIS machine before the picture left, so `now -
   * burned` is the whole round trip with no cross-machine offset to guess at.
   */
````

<a id="capture-23"></a>
## capture-23: demo/capture/roundtrip.mjs, module, line 289

````js
    // WHERE THE PICTURE COMES BACK FROM decides what this tab is claiming. In R2
    // mode the local copies are DROPPED and playback is fetched back. ONE FILE
    // PER TAKE: an eight-second take is about 900 KB, and slicing it buys
    // nothing while costing a dense sequence the worker would refuse whole.
````

<a id="capture-24"></a>
## capture-24: demo/capture/roundtrip.mjs, module, line 370

````js
  // EVERY SEEK IS A COMMAND TO THE ELEMENT. Without this mirror the clock check
  // read the SAME frame twice: "playhead +2161 ms, picture +0 ms".
````

<a id="capture-25"></a>
## capture-25: demo/capture/roundtrip.mjs, module, line 444

````js
  /**
   * 🔴 EVERY CHECK `keep` HAS, DRIVEN TO THE END, FROM ONE PLACE. Called after
   * the round trip is up (or has failed), under SELFCHECK only: it records two
   * short takes of what came back and lets each land. Every assert is made
   * exactly once whatever happens, red with the reason when the network gave
   * nothing to record, so the count is the same on a run where WHEP media never
   * arrived. ⚠️ It waits for a READABLE frame first: Cloudflare ramps WHEP up
   * from 640x360, where the burned row cannot be read. 20 s at most.
   */
````

<a id="capture-26"></a>
## capture-26: demo/capture/roundtrip.mjs, module, line 485

````js
      // THE ROW NEEDS FULL RESOLUTION: WHEP ramps 640x360, 960x540, 1280x720
      // over the first half-minute, and the row is drawn on a 1280 grid.
````

<a id="capture-27"></a>
## capture-27: demo/capture/roundtrip.mjs, module, line 507

````js
  /**
   * THE CHECK THIS TAB EXISTS FOR. The number was written BEFORE the picture
   * crossed a real network and two encoders, and the receiving side cannot fake
   * it. Seek to two positions inside ONE take, read the clock out of the pixels
   * at each, and assert it advanced by as much as the playhead did. Across two
   * takes it would measure the pause between them, which the line throws away
   * and the pixels keep.
   */
````

<a id="capture-28"></a>
## capture-28: demo/capture/roundtrip.mjs, module, line 530

````js
    // 🔴 EVERYTHING BELOW DRIVES THE PLAYHEAD, so it waits for a harness.
````

<a id="capture-29"></a>
## capture-29: demo/capture/roundtrip.mjs, module, line 551

````js
      // AND THE GAP THE LINE THREW AWAY IS STILL IN THE PIXELS. Reported, not
      // asserted: it depends on how long a person waited.
````

<a id="capture-30"></a>
## capture-30: demo/capture/roundtrip.mjs, module, line 597

````js
    /**
     * Presses Send and receive. An ordinary run grades the relay ask and stops;
     * a deep run holds both legs and runs keep's fourteen inside the press.
     */
````

<a id="capture-31"></a>
## capture-31: demo/capture/segments.mjs, module, line 1

````js
// SEGMENTS, from the old `/capture/` and the retired `/record/` (2026-10-04,
// `plans/plan-demo-structure.md` §3.5). Both were MediaRecorder in 2 s
// segments: `record` proved that what is held never grows past two segments
// however long the show runs, with the hand-off stood in for, and `capture`
// really uploaded each segment to R2 with `?r2=1` and played the result back on
// a deck. One recorder now gives both readings.
//
// THE MODEL, WHICH IS `record`'s: a closed segment is HELD until it is handed
// off and then dropped from what is held. The hand-off is a real PUT to the
// ingest worker with `?r2=1`, and a 300 ms stand-in without it, where the
// segment goes to a local pile that plays the part of the far side. Playback
// assembles from that far side: R2 fetched back with `?r2=1`, the pile without.
//
// WHAT CHANGED IN THE MOVE:
//   - `capture`'s three R2 asserts sat inside `if (useR2)`, so its count moved
//     with the mode. Here they are two slots that always run and say which mode
//     they graded, the way `keep` already did it.
//   - `record` ran until Stop; this records a fixed 6 s show (three segments),
//     which is still more than the two the claim says is the most ever held.
//   - The readout is six cells: `record`'s four (segments, holding, worst, sent)
//     and `capture`'s where and length. `capture`'s `source` (canvas or camera,
//     which the log already says), `biggest` and `total` (which is `sent` once
//     the show is over) are gone.
````

<a id="capture-32"></a>
## capture-32: demo/capture/segments.mjs, module, line 95

````js
  /**
   * THE HAND-OFF, and then the drop: the disk high-water is two segments, the
   * one being written and the one being shipped, however long the show runs.
   */
````

<a id="capture-33"></a>
## capture-33: demo/capture/segments.mjs, module, line 179

````js
  /**
   * Timeslice chunks concatenate into one playable WebM: the first carries the
   * header, the rest are continuation clusters. Assembled from the FAR SIDE,
   * never from what was held, which is gone by now.
   */
````

<a id="capture-34"></a>
## capture-34: demo/capture/segments.mjs, module, line 212

````js
      // THE PICTURE IS THE MASTER (media-master L1), so somebody has to apply a
      // seek to the picture or the vector snaps back a tick later. Every seek
      // path, the bar's keyboard table and the check below, goes through
      // `deck.seek()`, so wrapping it once is the whole of it. `show`'s fix,
      // which the old `/capture/` never had: its seek check read the vector.
````

<a id="capture-35"></a>
## capture-35: demo/capture/segments.mjs, module, line 237

````js
    /**
     * Presses Record, then Play it back, as a person would, and grades what
     * they produced. With `?r2=1` that is a real upload and five ingest
     * requests per run, which is why the suite never sets it.
     */
````

<a id="capture-36"></a>
## capture-36: demo/capture/segments.mjs, module, line 281

````js
      // BACK TO THE START, so the bar drill that follows has to move the
      // playhead to land its seek: left at the middle, its `5` key would land
      // where the check above already put it and could not fail.
````

<a id="capture-37"></a>
## capture-37: demo/capture/takes.mjs, module, line 1

````js
// TAKES, from the retired `/take/` (2026-10-04, `plans/plan-demo-structure.md`
// §3.5). Record, then record again: each take lands on the line after the one
// before, and the whole line plays and scrubs as one. The body is `take`'s, moved
// rather than rewritten; the comments that carried a measurement came with it.
//
// WHAT CHANGED IN THE MOVE, AND WHY:
//   - `take` published four readout keys and hid the row (`showReadout: false`)
//     because every one of them was already drawn on the page. A tab's report
//     has no hidden mode, and nothing graded those four, so they are gone
//     rather than drawn twice.
//   - Its checks used to run when a take landed after a HARNESS press of record,
//     one take only, so its eight sequence checks never ran under the suite.
//     The tab's `check` records two short takes itself, so all fourteen run.
//   - The camera is this tab's own button, not a `.pos-controls` one
//     (`tab-page.mjs` rule 4).
````

<a id="capture-38"></a>
## capture-38: demo/capture/takes.mjs, module, line 47

````js
  // WHAT IS BURNED IS THE POSITION ON THE LINE while recording, so a reader
  // drags to 6.5 s, reads 6.5 off the picture, and the claim checks itself.
  // Not recording, the frame shows the wall clock: this picture is not on the
  // line yet, and a rehearsal counter would contradict the transport bar.
````

<a id="capture-39"></a>
## capture-39: demo/capture/takes.mjs, module, line 116

````js
  // EVERY SEEK IS A COMMAND TO THE ELEMENT. With a media master attached a
  // `deck.seek()` alone does nothing visible: L1 reads the picture, sees the
  // vector has wandered and pulls it straight back. One mirror, here, for every
  // seek that did not come from the servo itself. ONE SEEK IN FLIGHT, LATEST
  // WINS: a drag fires a seek per pointermove, and queueing them walks the
  // picture through every position the finger passed.
````

<a id="capture-40"></a>
## capture-40: demo/capture/takes.mjs, module, line 154

````js
    // A PART RUNNING OUT IS A HANDOVER, resolved BEFORE the servo reads an ended
    // element as the clock, or the playhead pins itself to the boundary.
````

<a id="capture-41"></a>
## capture-41: demo/capture/takes.mjs, module, line 205

````js
        // SHRINK THE AXIS ONCE, here: collapsing a 10 s runway seconds later
        // moved every mark on the strip, which read as the cursor jumping.
````

<a id="capture-42"></a>
## capture-42: demo/capture/takes.mjs, module, line 222

````js
    // A HEAD THAT MOVES WITH THE RECORDING, which is the strip's wall cursor
    // and NOT the playhead: seeking the deck every frame would drive the
    // previous take's element and corrupt the one seek measurement here.
````

<a id="capture-43"></a>
## capture-43: demo/capture/takes.mjs, module, line 261

````js
    // ARM BEFORE THE SOURCE: with no `src` its `play()` rejects and the
    // activation is consumed without starting anything. Arming after `src`
    // started a hidden element, media-master bent the PAUSED deck to it, and
    // the playhead crept and snapped back ("moving a bit and then resetting").
````

<a id="capture-44"></a>
## capture-44: demo/capture/takes.mjs, module, line 302

````js
  // THE TAKE IN FLIGHT IS ALREADY ON THE LINE. `parts` holds landed takes only,
  // because every assert reads it; this is a VIEW for the strip.
````

<a id="capture-45"></a>
## capture-45: demo/capture/takes.mjs, module, line 361

````js
    // A GUTTER CARRIES WHAT ITS LANE MEASURED, and with nothing measured it
    // carries nothing. It counts what the lane DRAWS, in-flight take included.
````

<a id="capture-46"></a>
## capture-46: demo/capture/takes.mjs, module, line 420

````js
    // THE SEQUENCE ASSERTS NEED TWO PARTS to mean anything; a vacuous pass on
    // one is how a subject goes missing, so they wait and the log says so.
````

<a id="capture-47"></a>
## capture-47: demo/capture/takes.mjs, module, line 436

````js
    // 🔴 THE SIX BELOW SEEK THIS TAB'S OWN TRANSPORT, TWICE, so they wait for a
    // harness: they would jump the playhead across the join in front of
    // somebody who has just stopped recording.
````

<a id="capture-48"></a>
## capture-48: demo/capture/takes.mjs, module, line 475

````js
    /**
     * Two short takes, pressed through the bar's own record button as a person would, so
     * every check above runs. The first assert is the tab's own half of
     * `tab-page.mjs` rule 1: building it asked for nothing.
     */
````
