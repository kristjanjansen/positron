# Page comments: sync

The full comments cut from the code under demo/ for sync, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="sync-1"></a>
## sync-1: demo/sync/index.html, style, line 35

````css
  /* ⚠️ THE PICTURE BOX HAS ITS SHAPE BEFORE IT HAS A PICTURE, AND SAYS WHAT
     WILL BE IN IT. Reviewed 2026-10-05: before play it was a 2:1 black strip
     (a bare <video> with no source is 300 by 150) that read as a player that
     had failed. The box is the recording's 16:9 from the start, so nothing
     under it moves when the first frame lands, and a line in it says what will
     appear and when. Nothing is fetched for it: it is a sentence, not a poster. */
````

<a id="sync-2"></a>
## sync-2: demo/sync/index.html, inline script, line 65

````js
  /*
   * 🔴 FOUR OLD PAGES AS THE TABS OF ONE, DECIDED BY THE OWNER 2026-10-04:
   * *"names ok, looper retires, no redrect, capture is fine"*
   * (plans/plan-demo-structure.md §3.1). The four tabs are the four regimes
   * plans/plan-routing-time.md settled on for how two places agree on when:
   *
   *   ARRIVAL  as it happens: a cue fires on every copy the moment it lands   (was /cues/)
   *   AHEAD    scheduled ahead on a peer clock both ends agree on            (was /jam/)
   *   FOLLOW   following a picture that arrives late, by its measured lag    (was /sync/)
   *   AFTER    aligned after, on one recording whose picture is the clock    (was /replay/)
   *
   * Each tab is a module beside this file and `demo/shell/tab-page.mjs` does
   * the rest: a tab is built when it is first opened, has its own readout and
   * log, opens nothing until a press inside it, and is checked only from the
   * one SELFCHECK pass below. AFTER owns the page's one published transport
   * bar; AHEAD's is `publish: false` and gets the harness's drill as page
   * asserts.
   */
````

<a id="sync-3"></a>
## sync-3: demo/sync/index.html, inline script, line 85

````js
    // No `what` under the title: each tab says what it is in the box under the
    // tab row (`tab-page.mjs` rule 6), asked 2026-10-05 as *"rm top desriptions"*.
    // The manifest's `one` line still describes the page on the index.
````

<a id="sync-4"></a>
## sync-4: demo/sync/how.mjs, module, line 1

````js
// demo/sync/how.mjs: the "How it works" picture of one /sync/ tab, drawn
// into that tab and graded from that tab's own check.
//
// 🔴 ONE PICTURE PER TAB, BECAUSE THE FOUR TABS WORK FOUR DIFFERENT WAYS.
// INSTANT goes through the relay and back, CLOCKS agrees a time between two
// clocks and then sends nothing, LATE VIDEO holds a cue for a picture that
// arrives late, REPLAY lets a recording be the clock. One picture under the
// whole page would describe none of them, which is what `/stage/` was told
// about its own (*"move how it works to control room and archive"*).
// ⚠️ SO IT IS `atEnd: false`. `atEnd` appends to `document.body`, under every
// tab at once, and the picture would leave the tab it describes.
//
// 🔴 DRAWN ON THE TAB'S FIRST SHOWING, NEVER AT BUILD. A diagram laid out in a
// closed panel measures 0 and lays out for 320 px; `tab-page.mjs` only builds
// a tab into an open panel, but `ensure()` can build one closed, and the
// picture comes after the tab's readout and log, which `tab-page.mjs` adds
// after `build` returns. `show()` is after both.
//
// 🔴 THE CHECK GRADES FOUR THINGS, AND THE THIRD IS THE ONE THAT CATCHES THE
// CLOSED-PANEL BUG. Built; measured with real type (`measured`, or a clean
// `cuts` means nothing, see `/stage/`); drawn at the width its box has NOW,
// so a picture laid out for 320 px inside a 700 px panel reads red; nothing
// cut; and the boxes on screen are the boxes the tab declares, name and sub,
// read back off the drawing rather than off the spec.
````

<a id="sync-5"></a>
## sync-5: demo/sync/arrival.mjs, module, line 1

````js
// demo/sync/arrival.mjs: the ARRIVAL tab of /sync/, from the old /cues/
// (plans/plan-demo-structure.md §3.1, step 5).
//
// The first of the four regimes in plans/plan-routing-time.md: AS IT HAPPENS.
// A cue carries no `at`, because it has no moment of its own to wait for: it
// fires on every open copy the instant it lands, and the only number worth
// having is how long the landing took.
//
// WHAT CAME OVER FROM /cues/: fire a cue, fire ten, the name on show, the
// list of what arrived, and the delivery time read off the sender's own stamp.
// WHAT CHANGED ON THE WAY IN, AND WHY:
//   1  🔴 IT IS `openWire` NOW, NOT A HAND-ROLLED `new WebSocket`. That page
//      could not tell a full room from a dead relay, never reconnected, and
//      stamped its own envelope. `demo/shell/wire.mjs` does all three, and the
//      send stamp is the envelope's `sent` since 2026-10-04, written by
//      `format()`, never by this tab.
//   2  🔴 IT JOINS ON THE FIRST PRESS IN THIS TAB, NOT ON LOAD. /cues/ opened
//      its socket the moment the page loaded, so every visit sat in a relay
//      room. Building this tab opens nothing (`tab-page.mjs` rule 1).
//   3  🔴 A SECOND COPY OF THE RECEIVER LIVES IN THE TAB. The old page's one
//      claim was *"every open copy of this page shows the same cue"*, and it
//      graded its own echo, which is one copy. The second copy is a second
//      socket in the same room with its own name on show, so the claim is
//      graded as two copies agreeing rather than inferred from one.
//   4  The message is the plan's flat shape, `{ type: 'cue.set', text }`
//      (plan-routing-time §4.1), rather than a cue whose id was its name.
````

<a id="sync-6"></a>
## sync-6: demo/sync/arrival.mjs, module, line 43

````js
/**
 * THE PICTURE, READ OFF THIS FILE. One Browser holding the two sockets this
 * tab opens, and the relay's Durable Object between them. `join: false`: the
 * two screens do not feed each other, and every line between them goes
 * through the relay, which is the whole point of the tab.
 * ⚠️ ONE BROWSER, NOT TWO. The second screen is a second socket in this same
 * tab standing in for another phone, and a drawing may split a thing by role
 * but may not invent a second machine.
 * ⚠️ ONE RETURN ARROW, NOT TWO. The echo back to `this screen` was drawn as
 * well and `createDiagram` reported it on `cuts`: a return path to the upper
 * box runs through the lower one. Its fact is in the forward arrow's note.
 */
````

<a id="sync-7"></a>
## sync-7: demo/sync/arrival.mjs, module, line 85

````js
  /**
   * One receiver: a socket, the name it has on show, and the order the cues
   * reached it in. The tab builds two of them, `here` and `other`, and only
   * `here` ever sends.
   */
````

<a id="sync-8"></a>
## sync-8: demo/sync/arrival.mjs, module, line 179

````js
  // ⚠️ THE BURST IS SPREAD OUT, so the queue is visible on both copies, and
  // the press is not finished until the last one has gone.
````

<a id="sync-9"></a>
## sync-9: demo/sync/arrival.mjs, module, line 221

````js
      // 🔴 THE CLAIM THE OLD PAGE COULD ONLY INFER. Two copies, each with its
      // own socket, agree on every cue, on the order, and on the name on show.
````

<a id="sync-10"></a>
## sync-10: demo/sync/follow.mjs, module, line 1

````js
// demo/sync/follow.mjs: the FOLLOW tab of /sync/, which was the whole of
// /sync/ until 2026-10-04 and moved here unchanged in behaviour
// (plans/plan-demo-structure.md §3.1, step 4).
//
// 🔴 ONE PAGE FOR plans/plan-routing-time.md, asked 2026-10-04 as *"Put to
// single demo"* after step 2 was offered as `/partitur/` plus `/wall/`. A
// score sends a cue every two seconds, and each cue belongs to a moment of a
// picture that reaches this screen late, by the lag positron MEASURED on the
// link chosen. Two walls take the same cues: the left fires each one the
// moment its message arrives, the right asks `demo/shell/timebase.mjs` when
// the picture will show that moment here and fires then.
//
// ⚠️ THE LINKS ARE MODELLED, NOT OPENED, AND THAT IS THE POINT OF THIS TAB.
// The picture is drawn in this tab and held back by a lag function shaped
// like the measurements (plan-routing-time §3): WebRTC 67 ms with a few ms of
// jitter, LL-HLS 4 s that steps to 6 s on a stall and back on a drift-seek,
// the Pi's audio 175 ms. The cue messages ride a light link of about 30 ms,
// the relay's measured pub to subscriber leg. So the tab opens nothing and
// asks no server for anything; what it grades is the timebase's policy
// against those shapes, which is what the plan's step 2 needed graded first.
//
// ⚠️ ONE MACHINE, SO THE PEER CLOCK IS THIS PAGE'S OWN: `setOffset(0)`.
// Between two machines it is `peer.offsetMs()`, which agrees to about 3 ms
// (MEASURED in the old /jam/, and graded on one machine in the AHEAD tab).
// The negative control below runs the same score with the offset left
// unagreed, and the following wall must then fire nothing.
````

<a id="sync-11"></a>
## sync-11: demo/sync/follow.mjs, module, line 35

````js
// the relay leg a cue message rides, MEASURED 27 to 38 ms
````

<a id="sync-12"></a>
## sync-12: demo/sync/follow.mjs, module, line 62

````js
/**
 * The whole model, one step at a time, with no clock and no element of its
 * own: the live tab steps it from requestAnimationFrame, the self check
 * steps it in a loop. Times are local ms; with offset 0 local IS shared.
 * Every surface is SEEN on a frame, so every time recorded is the frame on
 * which that surface changed: the picture when its score time crosses the
 * cue, the arrival wall when the message is in, the following wall when the
 * timebase's answer has come due. Timing one exactly and the others by frame
 * would grade a frame of rounding as an error of the policy.
 */
````

<a id="sync-13"></a>
## sync-13: demo/sync/follow.mjs, module, line 140

````js
/**
 * THE PICTURE, READ OFF THIS FILE. Six plain boxes and no machine around them,
 * because every one of them runs inside this tab: the two links are models,
 * and the caption says so.
 * ⚠️ NO `Browser` CONTAINER, AND IT WAS TRIED. With the score and the links
 * outside it and the four surfaces inside, every plain box was drawn to the
 * container's height, three tall empty slabs; and the links are not outside
 * the Browser anyway. With nothing nested every box is its own size.
 * ⚠️ `cue link` IS LISTED FIRST SO IT SITS ON TOP: its long arrow to
 * `following` then leaves over the row instead of through `picture link`,
 * which `createDiagram` reported as an overlap.
 */
````

<a id="sync-14"></a>
## sync-14: demo/sync/follow.mjs, module, line 295

````js
      // ⚠️ THE NEGATIVE CONTROL: no agreed peer clock, so nothing can be told
      // and the following wall must HOLD every cue rather than fire on a guess.
````

<a id="sync-15"></a>
## sync-15: demo/sync/ahead.mjs, module, line 1

````js
// demo/sync/ahead.mjs: the AHEAD tab of /sync/, from the old /jam/
// (plans/plan-demo-structure.md §3.1, step 6). The owner's "two clocks" demo:
// BACKLOG, *"Can we do demo on synving thing and two clocks"*.
//
// The second of the four regimes in plans/plan-routing-time.md: SCHEDULED
// AHEAD ON THE PEER CLOCK. Nothing is sent per beat. Every beat is a moment on
// a loop clock `{ bpm, epoch }` that both ends compute for themselves
// (`beatToShared` in demo/shell/timebase.mjs), so what has to cross the wire is
// only the answer to *what time is it over there*, and `proto/looper/peer.mjs`
// answers it NTP's way, keeping the fastest sample.
//
// WHAT CAME OVER FROM /jam/: the peer clock, the deck on it, the eight beat
// pulse, the score as a document, the count of what has sounded at every beat.
// WHAT CHANGED ON THE WAY IN, AND WHY:
//   1  🔴 TWO CLOCKS IN ONE TAB, ONE OF THEM WRONG ON PURPOSE. /jam/'s subject
//      was two machines and every run graded one: `alone means zero offset`,
//      `0 peer(s)`. Here a second peer runs beside this one over
//      `pairTransports` (peer.mjs's in-process pair, a real setTimeout hop with
//      a chosen delay), and its clock is SKEW_MS fast. So *the offset was
//      found* and *the beats agree* are graded on one machine, against a skew
//      the test chose and the peers were not told.
//   2  🔴 THE BEATS ARE ON THE GRID, NOT WHEREVER PLAY WAS PRESSED. /jam/'s
//      deck started from 0 at the press, so two machines pressing at
//      different moments counted the same eight beats at different times, and
//      its loop seeked to 0 from the eighth beat, which put beat 1 on top of
//      beat 8 and made the loop seven steps long. Here play joins the count
//      where the shared clock has got to, and a lap ends by stepping back
//      exactly one loop, so the grid is never left.
//   3  🔴 NO RELAY UNTIL A PRESS. /jam/ joined `jam-demo` on load. Here
//      `Join the room` is the only thing that opens a socket, and both clocks
//      join, so a phone or `node rig/peer.mjs --room jam-demo` on the Pi sees
//      them both. That round trip is a DEEP check (selfcheck=2).
````

<a id="sync-16"></a>
## sync-16: demo/sync/ahead.mjs, module, line 56

````js
// what /jam/ MEASURED between two real machines
````

<a id="sync-17"></a>
## sync-17: demo/sync/ahead.mjs, module, line 63

````js
/**
 * `wsTransport` keeps ONE callback and a second `onMessage` replaces the
 * first, so a socket that both a peer and a counter listen to is fanned out
 * here first.
 */
````

<a id="sync-18"></a>
## sync-18: demo/sync/ahead.mjs, module, line 91

````js
/**
 * THE PICTURE, READ OFF THIS FILE. Both clocks, both decks and the click live
 * in this one Browser, and the relay is a side leg that only `Open to other
 * devices` adds. The chain inside the Browser is the path to the sound: the
 * second clock corrects itself against this one, this clock's deck plays the
 * grid, and its beats click. Every number in it is this file's constant.
 */
````

<a id="sync-19"></a>
## sync-19: demo/sync/ahead.mjs, module, line 155

````js
  // ── the two clocks ────────────────────────────────────────────────────────
  // 🔴 THE CLOCK IS THE WHOLE DIFFERENCE. `performance.now()` is private to a
  // document, and asking a Worker what time it is measured ±50 ms of BIAS.
  // ✅ MEASURED ON A REAL LINK, 2026-09-10: two machines agreeing to ~3 ms,
  // and 0.69 ms with two peers on one machine on a 66 to 74 ms path. Quote
  // 3 ms, never 0.15.
  // ⚠️ THE SECOND ID SORTS AFTER THE FIRST BY CONSTRUCTION. peer.mjs elects
  // the LOWEST id as the reference, so `this clock` is the one the other
  // follows, and the skew it must find is exactly SKEW_MS.
````

<a id="sync-20"></a>
## sync-20: demo/sync/ahead.mjs, module, line 185

````js
  /**
   * One deck on one peer's clock, with its beats recorded in TRUE time
   * (`epochNow()`, which neither peer's correction touches) and by the grid
   * beat they were for, so two decks can be compared beat for beat.
   */
````

<a id="sync-21"></a>
## sync-21: demo/sync/ahead.mjs, module, line 214

````js
        // 🔴 THE LAP, AND IT KEEPS THE GRID. A beat in the second lap steps the
        // deck back exactly one loop, so position and shared clock keep the
        // relation `play` set up. A microtask, because seeking from inside the
        // thing the seek will re-fire is re-entrant.
````

<a id="sync-22"></a>
## sync-22: demo/sync/ahead.mjs, module, line 224

````js
    /**
     * 🔴 PLAY JOINS THE COUNT WHERE THE SHARED CLOCK HAS GOT TO. The position
     * becomes the loop clock's phase, in whichever lap keeps it at or after
     * where it was, so `play advances position` stays true for the bar.
     */
````

<a id="sync-23"></a>
## sync-23: demo/sync/ahead.mjs, module, line 260

````js
  // ── the bar and the strip: one surface ────────────────────────────────────
  // The bar drives this clock's deck, and the second clock's deck follows the
  // same presses, the way a second machine would be running anyway.
  // ⚠️ THE SHELF IS IN THE PAGE BEFORE THE STRIP IS MADE. A strip built into a
  // detached element measures 300 px, fits its view to that, and never fits
  // again, so the two laps came out a seventh of the width with fourteen
  // seconds of empty lane after them.
````

<a id="sync-24"></a>
## sync-24: demo/sync/ahead.mjs, module, line 377

````js
      // 🔴 THE NEGATIVE CONTROL, built here and thrown away: the same skewed
      // clock, but every clock message is lost, so it never learns it is off.
      // The comparison below must then see the whole skew, or it could not see
      // a disagreement at all and the agreement above would prove nothing.
````

<a id="sync-25"></a>
## sync-25: demo/sync/ahead.mjs, module, line 409

````js
      // ⚠️ A RELAY ROUND TRIP IS A DEEP CHECK. An ordinary run says so in the
      // log rather than counting it as a pass.
````

<a id="sync-26"></a>
## sync-26: demo/sync/after.mjs, module, line 1

````js
// demo/sync/after.mjs: the AFTER tab of /sync/, from the old /replay/
// (plans/plan-demo-structure.md §3.1, step 7).
//
// The fourth of the four regimes in plans/plan-routing-time.md: ALIGNED
// AFTER, ON ONE RECORDING. Nothing travels at all by the time this plays: the
// show and the cues an operator called during it are both files, and they
// agree because the picture is the clock and every cue is a moment of the
// picture's own time.
//
// WHAT CAME OVER FROM /replay/: the 190 s show off R2, its eight cues, the
// media element as transport master, the loop, the watchdog, the diagram.
// WHAT CHANGED ON THE WAY IN:
//   1  🔴 THIS TAB OWNS THE PAGE'S ONE PUBLISHED TRANSPORT BAR, so the harness
//      drills it as `__demo.transport` exactly as it drilled /replay/'s. Every
//      other bar on /sync/ is `publish: false` and drilled as page asserts.
//   2  🔴 THE LOOP IS LAID AROUND THE FIRST CUE, so the check that the picture
//      stays inside a loop also makes a cue fire on every lap, and *cues land
//      within 250 ms of the picture* is graded on every run. On /replay/ it
//      ran only when the harness happened to play past 15 s, which it never
//      did, so the page's headline number was never asserted.
//   3  The diagram is drawn the first time the tab is shown, into the tab,
//      after its readout and log. `atEnd` would put it under the whole page,
//      under every tab.
````

<a id="sync-27"></a>
## sync-27: demo/sync/after.mjs, module, line 36

````js
// One lap, and long enough that a picture which ignores the loop is obvious
// rather than arguable: with the loop working the element never passes `b`,
// and without it the element is a full second past by the time the sampling
// stops.
````

<a id="sync-28"></a>
## sync-28: demo/sync/after.mjs, module, line 44

````js
// What the wrap can honestly cost. The bar wraps from its own paint at 60 Hz
// once the playhead reaches `b`, and the playhead is re-anchored on the
// picture four times a second, so a third of a second is slack rather than
// tolerance. A picture that is not being looped at all is a second past this.
````

<a id="sync-29"></a>
## sync-29: demo/sync/after.mjs, module, line 50

````js
// NATIVE HLS ONLY ON WEBKIT, gated on ManagedMediaSource. `canPlayType(
// 'application/vnd.apple.mpegurl')` answers "maybe" in Chrome as well as
// Safari, so it cannot tell them apart. Same rule as src/low-latency-player.js.
````

<a id="sync-30"></a>
## sync-30: demo/sync/after.mjs, module, line 114

````js
    // MEDIA IS THE MASTER: the deck follows currentTime, it does not drive it
````

<a id="sync-31"></a>
## sync-31: demo/sync/after.mjs, module, line 124

````js
  /**
   * 🔴 THE PAGE OWNS WHAT IS BEING PLAYED, SO THE BAR ASKS IT RATHER THAN THE
   * DECK. The bar's loop wraps by SEEKING, and the deck is a FOLLOWER of the
   * picture, so a seek written to the follower was undone by the master's next
   * tick. Every verb drives the element; the deck follows.
   */
````

<a id="sync-32"></a>
## sync-32: demo/sync/after.mjs, module, line 151

````js
  // ONE POSITION SURFACE: the strip seeks on press and on drag, so the bar
  // has no slider. NO WAY BUTTON: a picture only runs forwards.
  // ⚠️ IN THE PAGE BEFORE THE STRIP IS MADE, or it fits itself to the 300 px
  // a detached canvas measures and never fits again.
````

<a id="sync-33"></a>
## sync-33: demo/sync/after.mjs, module, line 172

````js
  // WATCHDOG. media-master's own rule: inside jumpMs an error is frame
  // quantisation; past it the element has MOVED and the timeline must follow.
  // Nothing is set before there is a picture, and it only pulls while the
  // show is rolling, so a paused scrub is never taken out of a hand.
````

<a id="sync-34"></a>
## sync-34: demo/sync/after.mjs, module, line 187

````js
  /**
   * THE DIAGRAM, LAST IN THE TAB. Drawn on the first showing, because a
   * diagram laid out inside a closed panel is laid out for a width nobody has,
   * and because by then the tab's readout and log are already in place above.
   */
````

<a id="sync-35"></a>
## sync-35: demo/sync/after.mjs, module, line 325

````js
      // BOTH HALVES ARE THE CLAIM, read off this tab's bar and not the page:
      // a bar that drew nothing would otherwise pass as one that correctly
      // leaves out a control.
````
