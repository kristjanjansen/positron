# Page comments: videoradio

The full comments cut from the code under demo/ for videoradio, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="videoradio-1"></a>
## videoradio-1: demo/videoradio/index.html, style, line 10

````css
  /* 🔴 THE PICTURE IS THE PAGE, AND THE BUTTONS LIVE INSIDE ITS BOX.
     Asked for: *"buttons under video inside box, fullscreen on right"*. So the
     pane is a COLUMN — screen, then the control row — and the shell's own
     `.pos-controls` is moved into it rather than copied, which keeps the
     buttons `verify.mjs` presses on every page. */
````

<a id="videoradio-2"></a>
## videoradio-2: demo/videoradio/index.html, style, line 24

````css
  /* 🔴 NO SECOND PICTURE. The sea that stood under the screen was removed on
     instruction 2026-09-16: *"i still see 3d viz below top one. remove bottom
     one"*. It was built so the headset's floor could be looked at without a
     headset, and the headset half went the same day. Both are in
     `archive/videoradio-xr/`. */
````

<a id="videoradio-3"></a>
## videoradio-3: demo/videoradio/index.html, style, line 30

````css
  /* 🔴 NO CONTROL ROW INSIDE THE PICTURE'S BOX. It carried a hand-rolled
     `.vr-bar` of two buttons, flush under the canvas with its own top border
     and a fade after three seconds of no pointer, which is a video player's
     chrome. Asked for four or five times before it was done: *"use standard
     transport bar here (LIVE badge as in radio). fullscreen button replaces
     loop"*, then *"you shuld use transport bar under the visualization.
     separate box"*. It is `createTransportBar` in its own box now, so the
     border, the fade and the flex row all belong to the component. */
````

<a id="videoradio-4"></a>
## videoradio-4: demo/videoradio/index.html, style, line 39

````css
  /* ⚠️ THE FULLSCREEN RULE TOUCHES SHAPE AND FRAME AND NOTHING ELSE, AND THAT
     IS DELIBERATE. `shell.css` already owns the cover: `.pos-faux-host
     .pos-faux` sets `position: fixed; inset: 0; height: 100dvh` at (0,2,0).
     This rule is (0,2,0) too and sits in a later stylesheet, so anything it
     declared twice would WIN and take the fallback down on exactly the
     browsers that need it (an iPhone has no element fullscreen at all).
     ⚠️ AND IT IS A CLASS, NEVER `:fullscreen`. A browser that does not know
     that pseudo-class throws away the whole selector list it appears in. */
````

<a id="videoradio-5"></a>
## videoradio-5: demo/videoradio/index.html, style, line 51

````css
  /* 🔴 THE PICTURE IS THE ONLY THING IN FULL SCREEN, AND NOW THAT COSTS NO RULE.
     This used to hide the control row, because the row lived inside the pane
     and the pane is what goes full screen. The transport is a box of its own
     outside the pane, so it is already not there.
     ⚠️ THE WAY BACK IS NOT LOST, which is what made removing the ⤡ safe on
     instruction: Escape leaves element fullscreen, and `fullscreen.mjs`'s
     fallback cover listens for Escape too, so there is an exit on both paths
     that needs no button. */
````

<a id="videoradio-6"></a>
## videoradio-6: demo/videoradio/index.html, inline script, line 72

````js
  // ⚠️ STATIC, NEVER A DYNAMIC IMPORT IN THE PRESS HANDLER. See the note on the
  // `vr` control: an await before `requestSession` spends the user activation
  // the session needs, so the module has to be here before the finger lands.
  // 🔴 NO `xr-panel.mjs`. The headset half of this page was archived on
  // instruction 2026-09-16 (*"arvhice videoradio vr, it did not worked out"*);
  // the code, the plan and what the three device runs cost are in
  // `archive/videoradio-xr/`, along with the sea it drew, which stood under
  // this page's screen until the same day and is gone with it.
````

<a id="videoradio-7"></a>
## videoradio-7: demo/videoradio/index.html, inline script, line 89

````js
  // 🔴 WHAT THIS PAGE IS, AND WHY IT IS NOT `/archive/radio/` WITH THE CONTROLS
  // HIDDEN. The instrument over there is a thing you play: a fader, four
  // settings, a sound picker, a station row and a LOOP row, with a waveform
  // above them. Take the hands off it and nothing moves, because every one of
  // those decisions was a person's. So this page is the same machine with the
  // decisions given to a clock: a tour that slides from one sound to the next,
  // a blend that breathes with it, a station that changes on its own, and a
  // loop that arrives, tunes the grain clock to itself and leaves again.
  //
  // 🔴 AND THE MACHINE IS IMPORTED, NOT COPIED. `demo/shell/radio-gran.mjs`
  // holds the station list, the twelve sounds, the modulator's lanes, the two
  // halves of a patch write, the loop's grain-clock arithmetic and the six
  // numbers the instrument listens to. ⚠️ `/archive/radio/` HAS NOT BEEN MOVED ONTO
  // IT YET, so those things exist twice today. Read that module's header before
  // editing either.
````

<a id="videoradio-8"></a>
## videoradio-8: demo/videoradio/index.html, inline script, line 106

````js
  /**
   * 🔴 OFF UNLESS ASKED, LIKE EVERY OTHER PAGE HERE. CLAUDE.md now carries this
   * as a rule with no exceptions; instructed 2026-09-16: *"rip those selfchecks
   * out of user experience and make rule about it"*.
   *
   * ⚠️ IT DEFAULTED **ON** HERE AND THE ARGUMENT WAS GOOD AND WRONG. It ran:
   * nobody holds this instrument, it moves its own blend, changes station and
   * runs a loop by itself, so a check doing those things cannot be told from
   * the page working. True of everything the check does EXCEPT one thing. It
   * presses full screen and comes back, and a visitor who pressed play and then
   * ⛶ had their own full screen taken away about twenty seconds later, when
   * `check()` reached that line. Reported twice as a mystery timer and open for
   * two sessions, because 22 s is also the tour's dwell and 71 s the station
   * clock, so the real cause was hidden behind two innocent ones.
   *
   * `demo/verify.mjs` appends `selfcheck=1`. ✅ **AND SO DOES
   * `demo/verify-gl.mjs` SINCE 2026-09-18**, which is the harness this comment
   * used to name as needing a fix. Until then it appended no query of its own,
   * so this page's checks ran NOWHERE for two sessions: the gate was honoured
   * and the only harness that can reach a `gl: true` page never set the flag.
   * 🔴 THE CONSEQUENCE IS NOT FREE. `node demo/verify-gl.mjs videoradio` now
   * really does run these checks, and this page rotates four ERR mounts, so
   * that command is not a development-loop command.
   */
````

<a id="videoradio-9"></a>
## videoradio-9: demo/videoradio/index.html, inline script, line 130

````js
  // ⚠️ EITHER TIER, SINCE 2026-10-04 (`demo/shell/selfcheck.mjs`). This read
  // `=== '1'` raw, which would have switched every check off on a deep run.
  // An ordinary run (`selfcheck=1`) grades the picture and the engine and stops
  // before the five second darkening watch and the morph, the walking lanes,
  // the loops, the station change and full screen, which together are most of
  // this page's run; `DEMO_DEEP=1 node demo/verify-gl.mjs videoradio` runs them.
````

<a id="videoradio-10"></a>
## videoradio-10: demo/videoradio/index.html, inline script, line 138

````js
  // ── the tour's clock ───────────────────────────────────────────────────────
  //
  // 🔴 EVERY PHASE HERE IS A FUNCTION OF THE CLOCK AND NOTHING IS AN
  // ACCUMULATOR. `pappus-mod.mjs` makes the argument and it applies to a page
  // that runs for hours: a late tick, a dropped tick or a backgrounded tab costs
  // RESOLUTION and never POSITION, because the next tick still reads the tour
  // exactly where it should be. A counter incremented per tick would come back
  // from a minimised window playing a sound it should have left.
````

<a id="videoradio-11"></a>
## videoradio-11: demo/videoradio/index.html, inline script, line 150

````js
  // ⚠️ NOT A MULTIPLE OF THE SLOT. At 31 s a slot and 71 s a station, the two
  // clocks land on a different pairing every time round, so a page left running
  // does not repeat itself every six minutes.
````

<a id="videoradio-12"></a>
## videoradio-12: demo/videoradio/index.html, inline script, line 155

````js
  // 🔴 THE BLEND'S TWO ENDS, AND NEITHER IS 0 OR 1. At 0 the granulator is
  // inaudible and the picture is drawing something nobody is hearing, which is
  // the failure `grain-scope`'s own `grainAlpha` exists to avoid. At 1 the
  // station is gone and what is left is an instrument with no material.
````

<a id="videoradio-13"></a>
## videoradio-13: demo/videoradio/index.html, inline script, line 164

````js
  // ⚠️ AND IT IS LONGER WHILE A STATION IS ARRIVING. Tearing a decoder down and
  // building another one is about a second of no audio, so a trail on its
  // ordinary time constant would empty and the page would look broken at
  // exactly the moment it is doing what it was asked to do.
````

<a id="videoradio-14"></a>
## videoradio-14: demo/videoradio/index.html, inline script, line 172

````js
    // ⚠️ TWO SENTENCES, DOWN FROM FOUR, ON INSTRUCTION: *"3x shorter"*. What
    // went was the list of everything the tour does to itself, which a visitor
    // watches happen rather than reads about, and the sentence naming the
    // picture as the instrument, which was the page describing its own design.
    // 🔴 THE HEADSET CLAUSE WENT WITH THE CONTROL, 2026-09-16, IN THE SAME
    // EDIT. A change in what a page DOES is a change in what it SAYS, and the
    // failure mode is silent: nothing type-checks a sentence, so a paragraph
    // describing a button that is not there is believed by the visitor reading
    // it. This page has already paid for exactly that once, when its own
    // description named a Synthesize button for two sessions after the button
    // was deleted.
    // ⚠️ AND THE SENTENCE WAS CUT RATHER THAN REPOINTED. The sea under the
    // screen was the obvious thing to point it at and it was removed the same
    // day, which is the argument for cutting: three sentences is the budget and
    // the last one already says what the two axes mean.
````

<a id="videoradio-15"></a>
## videoradio-15: demo/videoradio/index.html, inline script, line 193

````js
    // 🔴 TWO CELLS, AND `tour` WENT ON INSTRUCTION. Removing one left three,
    // which `mount()` refuses, and the rule behind that refusal is editorial:
    // an odd row always has a weakest cell and being made to find it is the
    // point. Here it was `moving`. On a page whose whole claim is that NOTHING
    // IS SET BY HAND, a count of the settings moving on their own is never
    // zero and never surprising, so it reports the premise rather than the
    // state. It is still in the log, where a line appears because something
    // happened.
    //
    // ⚠️ BOTH SURVIVORS ARE NUMBERS, WHICH IS NOT A STYLE CHOICE. `.pos-v` is
    // `white-space: nowrap; text-overflow: ellipsis` at 19 px mono in a 96 px
    // cell, so a station name or a sound name would be CUT, and CLAUDE.md is
    // explicit that anything truncating with an ellipsis is in the wrong place
    // rather than in need of a wider box.
    // 🔴 NO READOUT AT ALL, ON INSTRUCTION: *"rm readouts"*. It went one cell at
    // a time — `tour`, then `moving`, then `blend`, then the last two — and
    // that is the honest end of it rather than an accident: every cut was the
    // same complaint, that a number beside this picture is a thing to read
    // instead of a thing to watch.
    // `null` is the shell's DECLARED opt-out and is different from `{}`: it
    // says this page has deliberately no cells because its subject is visible
    // rather than numeric, a harness can check that it meant it, and the shell
    // then hides the box as well as the cells. An empty `.pos-readout` still
    // paints its own border, which is a horizontal rule nobody wrote.
````

<a id="videoradio-16"></a>
## videoradio-16: demo/videoradio/index.html, inline script, line 218

````js
    // 🔴 NO LOG BOX, ON INSTRUCTION: *"rm logs"*. The lines are all still
    // written and still on `__demo.logs`, so every assert and the harness read
    // exactly what they read before; what goes is the block of scrolling prose
    // under a picture that was asked to be the only thing on the screen.
````

<a id="videoradio-17"></a>
## videoradio-17: demo/videoradio/index.html, inline script, line 223

````js
    // 🔴 TWO BUTTONS, AND THE FIRST ONE IS NOT NEGOTIABLE. A browser will not
    // start audio without a gesture, and neither `AudioContext.resume()` nor
    // `play()` REJECTS when the gesture is missing, so a page that waits for
    // either is a hang rather than an error. Play is the gesture. Fullscreen is
    // what was asked for, and in fullscreen the picture is the only thing on
    // the screen, which is the rest of what was asked for.
````

<a id="videoradio-18"></a>
## videoradio-18: demo/videoradio/index.html, inline script, line 230

````js
      // not primary: the picture is the subject, and a filled yellow button is
      // the loudest thing this palette has sitting next to it
      // A GLYPH, THE SAME ONE THE TRANSPORT BAR USES. The word sat in a row
      // with a glyph beside it, so the two controls were different shapes for
      // no reason a reader could see. `aria` carries the name for anything not
      // reading the picture.
      // 🔴 NOTHING. This page's controls are the TRANSPORT BAR under the
      // picture, in its own box, which is what was asked for four or five times
      // before it was done: *"use standard transport bar here (LIVE badge as in
      // radio). fullscreen button replaces loop"*, then *"you shuld use
      // transport bar under the visualization. separate box"*.
      // What stood here was a hand-rolled row of two buttons moved inside the
      // picture's own box, which is the fourth-copy-of-a-component failure
      // CLAUDE.md names: `createTransportBar` already draws a play toggle, a
      // LIVE chip and a slot, and three pages had three different answers.
````

<a id="videoradio-19"></a>
## videoradio-19: demo/videoradio/index.html, inline script, line 249

````js
  // 🔴 NO FADE-IN, ON INSTRUCTION: *"show video canvas immideately"*. This
  // carried `.awaits-sound`, which held the box at `opacity: 0` until the first
  // grain arrived, on the argument that an empty bordered rectangle makes a
  // claim about an instrument that has not started. The argument is sound and
  // the answer was not to hide the box: the screen now draws from the first
  // frame, before any audio exists, so there is something true in it to show.
````

<a id="videoradio-20"></a>
## videoradio-20: demo/videoradio/index.html, inline script, line 260

````js
  // 🔴 NO SECONDS COUNTER. Removed on instruction 2026-09-16: *"rm sec counter
  // from videoradio"*. It was seconds since the page opened, for lining a
  // reported event up against the picture, and it did that job during the
  // sessions where the picture was being debugged from photographs. It is a
  // number about the TAB rather than about the station or the instrument, it
  // grew for ever whatever anything else did, and it sat over a picture whose
  // whole ask is to be the only thing on the screen. Every log line still
  // carries its own timestamp, which is where that fact belongs.
  // 🔴 THE PANE HOLDS THE PICTURE AND NOTHING ELSE. The controls used to be
  // moved inside it and faded out after three seconds of no pointer, which is a
  // video player's chrome; the transport bar below is a separate box under the
  // picture, the way `/archive/radio/` and `/tapes/` have always had it.
````

<a id="videoradio-21"></a>
## videoradio-21: demo/videoradio/index.html, inline script, line 275

````js
  /**
   * 🔴 THE TRANSPORT, UNDER THE PICTURE, IN A BOX OF ITS OWN. Asked for four or
   * five times: *"use standard transport bar here (LIVE badge as in radio).
   * fullscreen button replaces loop"*, then *"you shuld use transport bar under
   * the visualization. separate box"*. What was here instead was two buttons
   * moved inside the picture's box, which is the hand-rolled fourth copy
   * CLAUDE.md says to stop making.
   *
   * ⚠️ THE DECK HOLDS NOTHING AND FOLLOWS THE WALL CLOCK, exactly as `/archive/radio/`'s
   * does, and for the same reason: the sound is not ON this timeline, it is the
   * live thing the timeline is watching. `actuate()` is required by
   * `registerAdapter` and is empty here because there is nothing to actuate.
   * A deck with no adapter throws at construction, before `d.ready()`, and the
   * page then reports `__demo.ready failed` with nothing else to go on.
   */
````

<a id="videoradio-22"></a>
## videoradio-22: demo/videoradio/index.html, inline script, line 305

````js
  /**
   * `live: true` replaces the clock with the LIVE chip, which is what a stream
   * with no end has to say instead of a time. `scrub: false` because there is
   * nowhere to drag to. `loop: false` with a `loopSlot` puts ⛶ exactly where
   * `/archive/radio/` keeps LOOP: *"just replace looper with fullscreen button (make
   * component slot-able)"*.
   */
````

<a id="videoradio-23"></a>
## videoradio-23: demo/videoradio/index.html, inline script, line 316

````js
      // ⚠️ THE KIT'S TOGGLE, NEVER `requestFullscreen` BY HAND. An iPhone has no
      // element fullscreen at all and `p.requestFullscreen?.()` optional-chains
      // straight past the missing method: no throw, no log line and no picture,
      // which is a control that looks live and is inert.
````

<a id="videoradio-24"></a>
## videoradio-24: demo/videoradio/index.html, inline script, line 330

````js
  /**
   * 🔴 THE BADGE WHERE THE CLOCK USED TO BE SAYS `on air`, AND WHAT MAKES IT
   * TRUE IS BLOCKS ARRIVING. Asked 2026-09-20: *"For videoradio use std online
   * insicator with 'on air'"*. It was a `LIVE` chip, a word drawn because this
   * page passed `live: true` at build time, so it stood whether or not the
   * mount behind it was sending anything. This page already knows better than
   * that: `openStream` gives a mount nine seconds to produce a block and drops
   * it if it does not, so the page has been measuring the thing the word was
   * claiming and had nowhere to show it.
   *
   * ⚠️ FED FROM `stream.stats().blocks`, IN THE READOUT TICK BELOW, so it
   * reports audio this page has in hand rather than a station it meant to open.
   * ⚠️ `since: null`, because silence is not evidence until a stream is open,
   * so before play the badge reads `unknown` rather than `off air`.
   * ⚠️ AND `tuning in` EXPIRES ONE SECOND BEFORE THE PAGE GIVES UP ON THE
   * MOUNT, which is the same fact told twice on purpose: the badge says `off
   * air`, and a moment later the log says which mount was dropped and why.
   */
````

<a id="videoradio-25"></a>
## videoradio-25: demo/videoradio/index.html, inline script, line 358

````js
  // 🔴 NO IDLE FADE. It hid the control row after three seconds of no pointer,
  // which was right while the row sat ON the picture and is meaningless now
  // that the transport is a box of its own underneath it.
````

<a id="videoradio-26"></a>
## videoradio-26: demo/videoradio/index.html, inline script, line 362

````js
  // ═══ the picture ═══════════════════════════════════════════════════════════
  //
  // 🔴 DRAW THE INSTRUMENT, NOT THE SOUND. `plans/plan-audio-shader.md §0` argues it
  // and the argument is stronger here than it was there, because over on
  // `/archive/radio/` this would be a SECOND surface beside a waveform and a
  // readout, while here it is the only one. A spectrum turned into moving
  // shapes says nothing specific about the sound: the same picture appears for
  // any input, and this project has already answered two of those with *"this
  // viz does nothing to me"* and *"mambo jumbo"*.
  //
  // So the field is the granulator's own two axes:
  //
  //   across  where in the eight seconds it is reading, which is `/pgrain`'s
  //           own `pos` rescaled off the sixty-second ring
  //   up      how long that grain was, on the engine's own exponential lane,
  //           2 ms at the bottom and 4 s at the top
  //
  // Both of those are REPORTED BY THE ENGINE, over OSC, from the code that
  // fires each grain, and `dur` and `voice` have never reached a picture on any
  // page here: `grain-scope.mjs` is handed all four fields and keeps three.
  //
  // 🔴 AND THE ANCHORS THE PLAN QUOTES ARE NOT USED, ON PURPOSE. Its rows 0 and
  // 3 map loudness to `-40.0 .. -14.5 LUFS` and centroid to `1374 .. 3821 Hz`,
  // every one of them read out of `research/vr-sound-visual-2026-09.md`, whose
  // provenance `plans/plan-plate.md §0` records as unknown and whose analysis scripts
  // are gone. A page that hard-codes a number nobody can re-take is grading
  // itself against its own supply. What lights this field instead is the
  // FOLLOWER values the modulator is already consuming: `clamp01(env * sens)`,
  // bounded 0..1 by construction, tuned in `pappus-mod-test.mjs`, and the exact
  // signal that is moving the instrument. The picture is lit by what the
  // instrument is listening to.
  //
  // 🔴 THERE IS NO `uT` AND NO CLOCK IN ANY SHADER HERE, AND THAT IS THE CLAIM.
  // `mirror`'s bodies drive their motion from a frame counter, so "it moved" and
  // "it is a picture of something" are different questions there. Every pass
  // below is a pure function of the previous frame and the data texture, so if
  // the data stops the picture stops, and the determinism check further down is
  // exact rather than approximate.
````

<a id="videoradio-27"></a>
## videoradio-27: demo/videoradio/index.html, inline script, line 404

````js
  // 🔴 THE PICTURE IS `/shell/scan-field.mjs` SINCE 2026-10-13: the data
  // texture's layout, the looks, every shader body and the WebGL chain moved
  // there verbatim, comments and all, so /shader/landscape/ draws the same
  // picture with its numbers on knobs. This page compiles it BAKED, which
  // generates the text this page used to carry inline, byte for byte. The
  // layout of the 64 x 4 texture this page fills every frame is in that
  // module's header to `DATA_W`.
````

<a id="videoradio-28"></a>
## videoradio-28: demo/videoradio/index.html, inline script, line 420

````js
  /**
   * 🔴 THE LOOK PICKER IS GONE AND `?look=` STAYS. Asked 2026-09-16: *"rm preset
   * selctor, default to quarts"*.
   *
   * The row came back once on the argument that the decision had not been made
   * and a chooser is the whole job before one. It has been made: `quartz` is
   * the look, and the ten in `LOOKS` are now a record of how it was arrived at
   * rather than ten offers to a visitor. A page whose first control asks a
   * stranger to pick between ten names they cannot tell apart is asking them to
   * do the author's work.
   *
   * ⚠️ NOTHING ELSE MOVED. `LOOKS` is untouched, `?look=<name>` still selects
   * one, and `demo/videoradio/looks/compare.html` still puts them side by side.
   * What went is the row, which is the only part a visitor saw.
   * ⚠️ AND IT RELOADED THE PAGE, which `verify.mjs` presses on every run: a
   * control in `.pos-controls` that calls `location.replace` is a harness that
   * navigates in the middle of its own checks. That is a second reason it is
   * better gone than kept.
   */
````

<a id="videoradio-29"></a>
## videoradio-29: demo/videoradio/index.html, inline script, line 440

````js
  /**
   * 🔴 WHY FULL SCREEN ENDED, SAID OUT LOUD. It has dropped out on its own and
   * guessing at that has already cost an evening elsewhere. A browser leaves
   * full screen for several reasons that look identical from inside the page:
   * Escape, the window losing focus, a NAVIGATION, or the fullscreen element
   * being taken out of the document. Only the page can tell them apart, and
   * only at the moment it happens.
   * ⚠️ `beforeunload` FIRES BEFORE `fullscreenchange` ON A NAVIGATION, so the
   * flag it sets is what separates "something reloaded this page" from "the
   * viewer pressed Escape". That is the distinction worth having: a reload
   * would be our bug, Escape is not.
   */
````

<a id="videoradio-30"></a>
## videoradio-30: demo/videoradio/index.html, inline script, line 453

````js
  // ⚠️ IT SHIPS AS WELL AS LOGS. The log box is `display: none` in full screen,
  // so the one line that explains what just happened is written where nobody
  // can be looking at the moment it is written. A beacon survives the unload
  // that a batched sender would not.
````

<a id="videoradio-31"></a>
## videoradio-31: demo/videoradio/index.html, inline script, line 459

````js
// 🔴 `/log`, SINGULAR. `/logs` is the READ path and a POST to it is
````

<a id="videoradio-32"></a>
## videoradio-32: demo/videoradio/index.html, inline script, line 460

````js
      // accepted and thrown away, so the page reported faithfully into a
      // hole and the reader saw `(nothing reported)` — which reads as "the
      // page never sent anything", the exact failure CLAUDE.md records
      // against this endpoint.
````

<a id="videoradio-33"></a>
## videoradio-33: demo/videoradio/index.html, inline script, line 471

````js
  /**
   * 🔴 THE STATION CHANGES SHIP TOO, SO THE TWO CAN BE LINED UP. Full screen
   * is reported as ending every time a new station arrives, and neither
   * `nextStation` nor `switchTo` touches the DOM, so reading the code further
   * would be guessing. Two streams of timestamps into one log settles whether
   * the two events are the same event: if the exit lands in the same
   * millisecond as a switch it is ours, and if it does not, it never was.
   */
````

<a id="videoradio-34"></a>
## videoradio-34: demo/videoradio/index.html, inline script, line 482

````js
    /**
     * 🔴 THE TWO REMAINING CAUSES LOOK IDENTICAL AND DO NOT HAVE TO. Both
     * drops so far read "Escape, or the window lost focus", which is one line
     * covering two unrelated things: a key the viewer pressed, and the window
     * going to the background. `document.hasFocus()` tells them apart at the
     * moment it happens, and `visibilityState` says whether the tab itself went
     * away. Both drops were at about 23 seconds, which is a timer's signature
     * rather than a person's, so the answer matters.
     */
````

<a id="videoradio-35"></a>
## videoradio-35: demo/videoradio/index.html, inline script, line 496

````js
  // 🔴 AND THE FALLBACK HAS NO EVENT AT ALL. `fullscreen.mjs` falls back to a
  // fixed cover where the element API is missing, and a cover going away fires
  // nothing: if the page leaves full screen with SILENCE in the log, that is
  // the answer rather than a missing listener. This watches the class instead.
````

<a id="videoradio-36"></a>
## videoradio-36: demo/videoradio/index.html, inline script, line 501

````js
    // ⚠️ `pos-faux` ONLY. This also watched `pos-full`, which BOTH paths set,
    // so a real element-API entry reported itself twice in the same
    // millisecond: once truthfully and once as the fallback. A detector that
    // fires on the thing it is meant to distinguish is worse than none, and it
    // nearly sent the next hour after a fallback that was never used.
````

<a id="videoradio-37"></a>
## videoradio-37: demo/videoradio/index.html, inline script, line 511

````js
  /**
   * 🔴 `?bare=1` LEAVES THE PICTURE AND NOTHING ELSE, FOR COMPARING LOOKS.
   * Three of these in frames on one page put a paragraph, a title and a button
   * row around each picture, so the pictures themselves came out a third of the
   * pane and read as identical. What is being compared is the picture, so the
   * picture gets the pane.
   * ⚠️ IT HIDES RATHER THAN SKIPS. Everything is still built and still
   * published on `__demo`, so a check run against a bare page grades the same
   * page; only the ink is gone. A mode that BUILT less would be a second page
   * wearing this one's name.
   */
````

<a id="videoradio-38"></a>
## videoradio-38: demo/videoradio/index.html, inline script, line 522

````js
  // ⚠️ THE RHYTHM IS `.pos-stack` AND IT OWNS BOTH SIDES OF EVERY GAP, so a
  // page taking the air out has to say both. This read `.pos-body > * + *`,
  // which stopped existing when the rhythm became a property of a container
  // rather than a rule about one element's children, and an override that
  // matches nothing is silence rather than an error.
````

<a id="videoradio-39"></a>
## videoradio-39: demo/videoradio/index.html, inline script, line 562

````js
  // ⚠️ THERE IS NO FAVOURITE, AND THE ONE THAT WAS HERE COST TWO RUNS. It
  // opened on klassikaraadio because /archive/radio/ does, and that page has a
  // reason: it upgrades to the station it is named after. This one changes
  // station on its own every minute, so it has nothing to prefer, and a
  // hard-coded first choice is a mount that can be down all afternoon while the
  // page sits on it. MEASURED: Klassikaraadio is delivering 0 blocks on three
  // consecutive runs, on a relay that had been calling it down all session.
  // The real first choice is made from the health answer, below.
````

<a id="videoradio-40"></a>
## videoradio-40: demo/videoradio/index.html, inline script, line 573

````js
  // 🔴 DECLARED HERE AND NOT BESIDE THE CHECKS THAT READ IT. A const further
  // down the file is in its temporal dead zone until the module reaches it, and
  // this repo has paid for that three times in one page: a closure handed to a
  // component ran before the declaration, threw a ReferenceError inside a
  // constructor, and the whole page reported __demo.ready — failed with
  // nothing else to go on.
  // ⚠️ EVERY FIELD IS WRITTEN OUT EVEN THOUGH JAVASCRIPT DOES NOT NEED IT: a
  // burst of asserts reading properties that appear from nowhere cannot be
  // reviewed, and a typo reads as undefined, which most of these checks would
  // treat as a failure of the ENGINE rather than of the page.
````

<a id="videoradio-41"></a>
## videoradio-41: demo/videoradio/index.html, inline script, line 587

````js
  /**
   * 🔴 NOTHING LEAVES THIS PAGE UNTIL A PERSON ASKS, AND THE GATE IS A GAIN NODE
   * RATHER THAN A FLAG. verify.mjs and verify-gl.mjs drive a page with
   * element.click(), which produces an UNTRUSTED event: so the harness presses
   * the real button, the real machine starts, every check runs, and not one
   * sample reaches a speaker. A finger is trusted and opens it.
   *
   * ⚠️ NOT A DISCONNECTED OUTPUT AND NOT muted. Declining to connect changes
   * the graph between the checked state and the real one, and Web Audio PULLS:
   * a node with no path to the destination is never asked to process at all,
   * which is what made a buffer allocation time out once. One gain, in the same
   * place always, at 0 or at 1.
   *
   * ⚠️ AND THE EVIDENCE IS A PAIR OF ANALYSERS, ONE EITHER SIDE. Reading the
   * gain back would grade the setting rather than the sound.
   */
````

<a id="videoradio-42"></a>
## videoradio-42: demo/videoradio/index.html, inline script, line 608

````js
  // Registered on the button in the CAPTURE phase and on pointerdown, which
  // fires before click, so the gate is already open when the shell's own
  // handler runs. A click listener would be registered after the shell's and
  // would arrive too late to matter.
````

<a id="videoradio-43"></a>
## videoradio-43: demo/videoradio/index.html, inline script, line 622

````js
    // iOS sends WebAudio through the silent switch and a media element past it,
    // so a page whose only output is WebAudio gets the ambient session, which
    // the ring switch mutes. It is absent everywhere else, so this is a
    // capability test and never a platform check.
````

<a id="videoradio-44"></a>
## videoradio-44: demo/videoradio/index.html, inline script, line 630

````js
    // ⚠️ A STABLE GAIN IS THE ENGINE'S INPUT, NOT WHATEVER IS FEEDING IT.
    // scsynth is wired to this node ONCE at boot; a station change replaces the
    // decoded stream behind it, and handing out the stream's own node would
    // leave the granulator reading a stopped one, which is silence that looks
    // like a broken engine.
````

<a id="videoradio-45"></a>
## videoradio-45: demo/videoradio/index.html, inline script, line 637

````js
    // 🔴 THE DUCK IS A SECOND NODE, AND IT IS WHAT MAKES SEVERAL LOOPS AT ONCE
    // POSSIBLE. The ring taps `liveIn`, so taking `liveIn` itself down to make
    // room for a loop recorded SILENCE into the next one, and the page could
    // only ever keep one loop at a time. The tap now sits upstream of the
    // level, so the page can go on keeping fresh seconds of the station while
    // three loops of it are playing.
````

<a id="videoradio-46"></a>
## videoradio-46: demo/videoradio/index.html, inline script, line 649

````js
    // 🔴 NO SMOOTHING, BECAUSE ONE OF THE SIX IS A RATE OF CHANGE.
    // getFloatFrequencyData applies smoothingTimeConstant PER CALL, so a
    // flux follower would measure the blend rather than the programme and the
    // same page would read differently at 60, 72, 90 and 120 Hz.
````

<a id="videoradio-47"></a>
## videoradio-47: demo/videoradio/index.html, inline script, line 658

````js
    // 🔴 ONE WAY OUT AND EVERYTHING THAT MAKES A SOUND GOES THROUGH IT. The
    // station's path and the engine's output both land on speakers, so the
    // meter below hears the instrument as well as the material. Fed by dry
    // alone it would read 0.0000 with the blend hard over to the granulator,
    // and every check built on it would pass by measuring nothing.
````

<a id="videoradio-48"></a>
## videoradio-48: demo/videoradio/index.html, inline script, line 668

````js
    // 🔴 ONE ANALYSER EITHER SIDE OF THE GATE, AND THAT IS WHAT MAKES THE PAIR A
    // PAIR. analyser above sits on the granulator's INPUT, before the blend
    // and before the engine's output joins, so comparing it against the far side
    // of the gate compares two different signals and reads as evidence. These
    // two see the same samples with one gain between them, so the only thing
    // that can separate their readings is the gain.
````

<a id="videoradio-49"></a>
## videoradio-49: demo/videoradio/index.html, inline script, line 686

````js
    // ── the loop's own audio ──────────────────────────────────────────────
    //
    // ⚠️ A RING FILLED ON THE AUDIO THREAD, not samples scraped off the
    // analyser. A frame callback reads 2048 samples a frame, which at 60 Hz
    // both overlaps and gaps: stitching those gives a recording with a seam
    // every sixteen milliseconds.
    //
    // ⚠️ AND IT TAPS liveIn, NOT dry. dry carries the blend, so a loop
    // recorded through it would be a recording of wherever the fader happened
    // to be standing, played back under a second fade. The material is the
    // station.
````

<a id="videoradio-50"></a>
## videoradio-50: demo/videoradio/index.html, inline script, line 699

````js
    // ⚠️ A SCRIPT PROCESSOR, DELIBERATELY. It is deprecated and it runs on the
    // main thread, and what it does here is memcpy two blocks into a typed array
    // and return. It is wired to a SILENT sink so it is pulled without being
    // heard: a node with no path to the destination is not scheduled at all,
    // which is the trap that makes a tap look like it works and record nothing.
````

<a id="videoradio-51"></a>
## videoradio-51: demo/videoradio/index.html, inline script, line 724

````js
    // 🔴 INTO srcNode, NOT INTO THE DESTINATION. Everything downstream then
    // gets the loop for free: the granulator chews it, the analyser measures it,
    // the blend still works and the meter reads what actually left. Wired to the
    // destination it would be a parallel path only the speakers knew about, and
    // the instrument would go on eating the live station while you heard a loop.
````

<a id="videoradio-52"></a>
## videoradio-52: demo/videoradio/index.html, inline script, line 747

````js
  // ── the stream, and which station it points at ─────────────────────────────
  //
  // 🔴 stream === null MEANS THE PAGE IS NOT LISTENING TO ANYTHING, AND IT IS
  // A STATE THE PAGE CAN BE IN FOR MINUTES. All six of these mounts refused at
  // once while this was being written. The picture, the tour, the blend and the
  // engine all go on running with nothing to eat, which is what the trail, the
  // parameter row and the log are for; the poll below brings a station back
  // without a reload.
````

<a id="videoradio-53"></a>
## videoradio-53: demo/videoradio/index.html, inline script, line 777

````js
    // 🔴 AN OUTCOME-GATED FALLBACK, NOT A SECOND PROBE. A mount that answered
    // /health a minute ago and is refusing now is the ordinary case for a
    // volunteer server, and the stream failing IS the evidence. MEASURED on the
    // day this was written: three of the six mounts answered 502 inside an hour.
    // ⚠️ AND IT SAYS SO RATHER THAN LOOKING BROKEN. A picture that empties with
    // no line in the log is a page somebody debugs.
````

<a id="videoradio-54"></a>
## videoradio-54: demo/videoradio/index.html, inline script, line 790

````js
  /**
   * A mount has stopped delivering: leave it out, move to the next one that is
   * answering, and if there is no next one stop listening entirely.
   *
   * 🔴 THE LAST LINE IS THE ONE THAT MATTERS AND IT WAS MISSING. With every
   * mount refusing the page went on holding a dead connection, which is a
   * fetch that answers 502 and a console error the page cannot suppress, about
   * a station it already knows is down. Closing it is what makes
   * stream === null mean "there is nothing to listen to", which is what the
   * poll below waits for.
   */
````

<a id="videoradio-55"></a>
## videoradio-55: demo/videoradio/index.html, inline script, line 811

````js
  /**
   * The next station that is not known to be down, starting after this one.
   *
   * ⚠️ !== false, NOT TRUTHY. A station nobody has an answer about is
   * undefined and must stay in the rotation: "we did not look" and "it is
   * down" are different facts with opposite consequences, and caps.mjs
   * already states the rule that an unknown never blocks.
   *
   * ⚠️ AND IT RETURNS NULL RATHER THAN THE STATION IT STARTED FROM. Wrapping
   * all the way round to the current one would read as a successful choice, so
   * "everything else is refusing" would never be said out loud.
   */
````

<a id="videoradio-56"></a>
## videoradio-56: demo/videoradio/index.html, inline script, line 841

````js
  /**
   * The station clock's move, once a minute or so.
   *
   * ⚠️ IT IS ALSO THE WAY BACK IN. With nothing playing there is no station to
   * move ON from, so the first mount that is answering is simply started: a
   * page that stopped listening during an outage and never started again would
   * need a reload, which is the one thing a page that plays itself must not
   * ask for.
   */
````

<a id="videoradio-57"></a>
## videoradio-57: demo/videoradio/index.html, inline script, line 863

````js
  // ═══ the tour ══════════════════════════════════════════════════════════════
  //
  // 🔴 WHAT CAN BE SLID AND WHAT MUST BE STEPPED IS AN ARGUMENT ABOUT THE
  // ENGINE, NOT A TASTE, and it lives in radio-gran.mjs beside the write that
  // depends on it. Select.kr indices, a chord in semitones and a sixteen-step
  // gate figure have no halfway; a grain length behind a 20 ms Lag.kr has
  // nothing but. So a morph slides every continuous control in its own lane and
  // steps the rest, once, at the middle.
  //
  // ⚠️ AND THE ROUTES STEP WITH THEM. A patch is a place AND a motion, and two
  // motions cannot be crossfaded: {shape:'step', hz:1} and {src:'env.tone'}
  // are different machines, not two settings of one.
````

<a id="videoradio-58"></a>
## videoradio-58: demo/videoradio/index.html, inline script, line 880

````js
  // ⚠️ COMPUTED AT 25 Hz AND READ AT FRAME RATE, NOT COMPUTED TWICE. morphOf
  // builds a whole set of continuous values and two arrays; doing it again in
  // the frame callback would be a second answer to one question and sixty
  // objects a second of garbage for numbers that are already in hand.
````

<a id="videoradio-59"></a>
## videoradio-59: demo/videoradio/index.html, inline script, line 899

````js
  /**
   * 🔴 THE BLEND IS A FUNCTION OF WHERE THE TOUR IS, NOT A FREE-RUNNING LFO, and
   * the difference is legible rather than cosmetic. It opens from the station
   * to the granulator over the first half of a sound and comes back over the
   * second, so the handover between two sounds always happens while you can
   * still hear what the station is doing. A sine on its own clock would
   * eventually put the deepest part of the granulator exactly on a crossover,
   * which is the one moment the instrument has least to say.
   */
````

<a id="videoradio-60"></a>
## videoradio-60: demo/videoradio/index.html, inline script, line 916

````js
  /**
   * Land on a sound: everything that cannot be interpolated, the bases, and the
   * routes, in that order.
   *
   * ⚠️ THE ORDER MATTERS. setRoutes sends the base of every destination that
   * has STOPPED being modulated, so it has to run after the bases are the new
   * sound's or a control goes home to the previous sound's number.
   */
````

<a id="videoradio-61"></a>
## videoradio-61: demo/videoradio/index.html, inline script, line 933

````js
    // ⚠️ A SOUND CHANGE IS A STATE CHANGE, so it goes in the log, once, when it
    // happens, and not into a cell that would re-say it sixty times a second.
    // 🔴 THE COUNT RODE IN HERE WHEN THE moving CELL WENT. It is the same
    // fact and this is the honest place for it: it changes when the sound
    // changes, which is exactly when this line is written, so a cell repainting
    // it sixty times a second was always saying a thing that had not moved.
````

<a id="videoradio-62"></a>
## videoradio-62: demo/videoradio/index.html, inline script, line 945

````js
  /**
   * One pass of the tour, at the modulator's own rate.
   *
   * 🔴 THE MORPH MOVES THE BASE OF A ROUTED CONTROL AND WRITES EVERY OTHER ONE
   * ITSELF. Two writers at 25 Hz on one control is a 25 Hz square wave, not a
   * glide: createModulator writes base + modulation and a morph writing the
   * raw value would alternate with it. writeContinuous's skip is what keeps
   * them out of each other's way, and it is why the routed set is tracked here.
   */
````

<a id="videoradio-63"></a>
## videoradio-63: demo/videoradio/index.html, inline script, line 962

````js
    // 🔴 A LOCKED GRAIN CLOCK OUTRANKS THE MORPH, and that is what tempo-synced
    // means: while a loop is playing, the grain rate belongs to the lap rather
    // than to the sound the tour is travelling through. It is written here
    // rather than fought with afterwards, because two writers on one control at
    // 25 Hz is a 25 Hz square wave and not a compromise.
````

<a id="videoradio-64"></a>
## videoradio-64: demo/videoradio/index.html, inline script, line 970

````js
    // The base is where a modulated control returns to, so it has to be the
    // MORPHED value and not the arriving sound's: otherwise every routed
    // control jumps to its destination at the crossover while the unrouted ones
    // glide, and half the instrument arrives early.
````

<a id="videoradio-65"></a>
## videoradio-65: demo/videoradio/index.html, inline script, line 984

````js
  // ═══ the loop ══════════════════════════════════════════════════════════════
  //
  // 🔴 FOUR WAYS, AND EACH IS A DIFFERENT MECHANISM RATHER THAN A DIFFERENT
  // NUMBER OF ONE, AND EACH LAYER OF A STACK GETS THE NEXT ONE IN TURN.
  // Round is the kept seconds as they arrived, back is the same
  // samples mirrored, half is the same lap at half speed, chop is a sixteenth of
  // it repeating. Three of the four are things a live mount cannot do at all:
  // there is nothing behind a live edge to play backwards, no lap to divide, and
  // slowing a stream down only means falling behind it.
````

<a id="videoradio-66"></a>
## videoradio-66: demo/videoradio/index.html, inline script, line 995

````js
  //
  // 🔴 SEVERAL LOOPS AT ONCE, EACH A DIFFERENT LENGTH OF A DIFFERENT MINUTE.
  // A layer is kept seconds of the station with its own way of playing, its own
  // speed and its own gain, and up to three of them run against each other into
  // the same granulator. The lengths below are deliberately not multiples of
  // each other: three loops that divide evenly are one loop with more voices,
  // and what makes a stack of them worth hearing is that they come back into
  // phase rarely.
  //
  // ⚠️ AND A NEW ONE IS NEVER A RECORDING OF THE OLD ONES. The ring taps the
  // station upstream of everything the loops reach, so a layer can be taken
  // while three are playing and it still holds only what is on air.
````

<a id="videoradio-67"></a>
## videoradio-67: demo/videoradio/index.html, inline script, line 1019

````js
  /**
   * ⚠️ THE SAMPLES, NOT A NEGATIVE RATE. AudioBufferSourceNode.playbackRate
   * does not go below zero in any shipping engine, so the only way to read a
   * buffer backwards is to hold a mirrored copy. Built on the first loop that
   * needs one rather than beside every loop.
   */
````

<a id="videoradio-68"></a>
## videoradio-68: demo/videoradio/index.html, inline script, line 1045

````js
  /**
   * How loud each layer is, recomputed whenever the stack changes.
   *
   * 🔴 THREE COPIES OF A STATION AT FULL LEVEL IS THREE TIMES THE AMPLITUDE,
   * and the granulator is downstream of this, so a stack that clips arrives at
   * the instrument already broken. The newest is loudest and each older one is
   * a third of the way down, which is also what makes the stack legible: a
   * listener can hear which one just arrived.
   */
````

<a id="videoradio-69"></a>
## videoradio-69: demo/videoradio/index.html, inline script, line 1064

````js
  /**
   * Let a layer go: down over ~80 ms, then stopped and unwired.
   *
   * ⚠️ THE STOP IS TIMED AND THE FADE IS NOT, which is the opposite of the
   * handover this used to do. There is no new voice to align with here, so
   * nothing can be scheduled against one, and stopping at the instant the fade
   * starts is the click the fade exists to avoid.
   */
````

<a id="videoradio-70"></a>
## videoradio-70: demo/videoradio/index.html, inline script, line 1094

````js
    // 🔴 VARISPEED, AND EVERY SPEED IS A POWER OF TWO BECAUSE THE GRAIN CLOCK
    // DEPENDS ON IT. `relock` right below says why: a loop k bars long at 1x is
    // k x 2^m bars long at any power of two, so it is still a whole number of
    // bars and the lock survives the change with nothing to recompute. A 0.8x
    // would sound like varispeed and would silently unpick the tempo lock,
    // which is the one thing on this page that is exactly true.
    // The step walks rather than jumps: a loop is at most one notch off the
    // last one, so the speed drifts across a sitting instead of flipping
    // between extremes.
````

<a id="videoradio-71"></a>
## videoradio-71: demo/videoradio/index.html, inline script, line 1108

````js
    // ⚠️ ITS OWN GAIN, NOT loopOut's. loopOut carries the whole stack, so
    // fading one layer through it would take the other two down with it.
````

<a id="videoradio-72"></a>
## videoradio-72: demo/videoradio/index.html, inline script, line 1118

````js
    // ⚠️ THE OLDEST GOES WHEN THE STACK IS FULL, AND IT GOES BY BEING FADED
    // RATHER THAN BY BEING DROPPED. An AudioBufferSourceNode with no reference
    // to it goes on playing until it is stopped: forgetting a layer is a voice
    // nobody can ever silence.
````

<a id="videoradio-73"></a>
## videoradio-73: demo/videoradio/index.html, inline script, line 1136

````js
    // 🔴 THE LAP AT SPEED 1, WHICH IS THE BUFFER SPAN, NOT THE WALL TIME IT
    // TAKES TO PLAY. Every speed this page uses is a power of two, so a loop
    // that is k bars long at 1x is k x 2^m bars long at any of them: still a
    // whole number, still locked, and nothing to recompute when the way changes.
    // Dividing by the rate here would hand the arithmetic a different number
    // for half than for round over the same seconds of material.
````

<a id="videoradio-74"></a>
## videoradio-74: demo/videoradio/index.html, inline script, line 1143

````js
    // 🔴 subdivide, BECAUSE THE LAPS HERE ARE SHORT ON PURPOSE. A sound whose
    // figure is longer than half the lap cannot fit into it twice, and without
    // this the lock simply refused: MEASURED before it existed, most of the
    // twelve sounds refused every loop and the log filled with the same
    // sentence. It fits a whole number of LAPS into the figure instead, which
    // divides exactly the same way and takes several laps to come round.
````

<a id="videoradio-75"></a>
## videoradio-75: demo/videoradio/index.html, inline script, line 1156

````js
  /**
   * What state the loop is in, derived rather than assigned.
   *
   * 🔴 RECORDING AND PLAYING ARE NO LONGER THE SAME STATE MACHINE. With one
   * loop at a time they were: the page was either keeping seconds or playing
   * them. A stack keeps the next layer WHILE three are playing, so `on` means
   * something is looping and the ring's own flag means something is being kept.
   */
````

<a id="videoradio-76"></a>
## videoradio-76: demo/videoradio/index.html, inline script, line 1184

````js
    // ⚠️ UNWRAPPED BACK INTO ORDER. Once the ring has wrapped its oldest sample
    // is at w, so copying from index 0 plays the seconds in two pieces with
    // the join in the middle, which sounds like an edit nobody made.
````

<a id="videoradio-77"></a>
## videoradio-77: demo/videoradio/index.html, inline script, line 1200

````js
    // ⚠️ THE STATION'S LEVEL, NOT THE BLEND. Writing to dry would move a number
    // the blend owns, and the next setWet would put the station back on top of
    // the loops.
    // 🔴 AND IT DUCKS RATHER THAN CLOSING. With one loop at a time the station
    // had to go, or a live edge and a recording of it a few seconds apart
    // fought each other. Under a stack it is the thing the layers are stacked
    // ON: a fifth of it left underneath is what keeps the loops sounding like
    // now rather than like a tape.
````

<a id="videoradio-78"></a>
## videoradio-78: demo/videoradio/index.html, inline script, line 1247

````js
  /**
   * When a layer is kept, when one is let go, and nothing else.
   *
   * A layer arrives every few seconds, lives about half a minute and leaves
   * oldest first, so the page is nearly always playing two or three lengths of
   * the station against each other over what is on air now.
   */
````

<a id="videoradio-79"></a>
## videoradio-79: demo/videoradio/index.html, inline script, line 1255

````js
    // ⚠️ THE SCHEDULER STANDS DOWN WHILE THE PAGE IS CHECKING ITSELF. The loop
    // check drives armLoop and setLoop by hand at a tour position this
    // would not have chosen, and without this it would take the loop away
    // between the two asserts that grade it, which reads as the lock failing.
````

<a id="videoradio-80"></a>
## videoradio-80: demo/videoradio/index.html, inline script, line 1260

````js
    // 🔴 THE LOOP NO LONGER BELONGS TO THE TOUR'S CLOCK, AND THAT IS THE WHOLE
    // CHANGE. It used to be one loop every other sound, arriving and leaving on
    // the same 31 s slots as everything else, which meant about half the time
    // with nothing looping and never two loops together. A layer is kept on its
    // OWN cadence now: as soon as the last one has been playing for a few
    // seconds, the next few seconds of the station are taken. Two clocks that
    // do not divide each other is also what stops the page repeating itself.
````

<a id="videoradio-81"></a>
## videoradio-81: demo/videoradio/index.html, inline script, line 1272

````js
    // ⚠️ THE OLDEST GOES BEFORE THE NEWEST ARRIVES, so a stack at its limit is
    // never four deep for the length of one tick.
````

<a id="videoradio-82"></a>
## videoradio-82: demo/videoradio/index.html, inline script, line 1278

````js
  // ═══ the frame ═════════════════════════════════════════════════════════════
  //
  // 🔴 ONE CLOCK, AND IT IS THE FRAME CALLBACK, BECAUSE THE WORK IS ALREADY
  // BEING DONE THERE. The six features, the modulator's sense, the data
  // texture and the draw all happen once per frame off ONE analyser read. A
  // second timer would be a second clock for numbers that are already in hand.
  //
  // ⚠️ AND THE 25 Hz ARGUMENT DOES NOT TRANSFER TO A SHADER. pappus-mod.mjs
  // fixes 25 because Engine_Pappus.sc puts a 20 ms Lag.kr on every control,
  // so a faster write is thrown away. There is no one-pole between a uniform and
  // a pixel: the consumer is an eye and a compositor.
````

<a id="videoradio-83"></a>
## videoradio-83: demo/videoradio/index.html, inline script, line 1302

````js
  /**
   * ⚠️ A STAGE THAT CAN DISCARD DATA NEEDS A COUNTER A PAGE ACTUALLY DISPLAYS.
   * A bucket holds a count in one 8-bit channel, so past 255 grains in one
   * frame something is lost. At 60 fps and the fastest sound here that cannot
   * happen, and the counter exists so the saturation can be SEEN rather than
   * deduced. The check below floods one bucket on purpose to prove it fires.
   */
````

<a id="videoradio-84"></a>
## videoradio-84: demo/videoradio/index.html, inline script, line 1318

````js
  /**
   * Where the read head may be, as a density over the eight seconds.
   *
   * 🔴 IT IS ZERO WHERE IT CANNOT BE KNOWN, AND ONE OF THE THREE MODES IS
   * KNOWABLE. In POSITION the read point is winstart + scan*winspan, exactly,
   * and the page holds both numbers. In STRETCH it is a phasor inside the engine
   * that nothing on this side has. In DELAY it is wpos - mdelay/mbuflen
   * wrapped into the lap, and wpos is the ENGINE'S WRITE PHASE: the read point
   * is a fixed distance behind a head that is itself sweeping the lap, so on an
   * axis that IS the lap the read point sweeps too, and where it is right now is
   * a number this page does not hold.
   *
   * ⚠️ THE FIRST VERSION DREW IT ANYWAY, AT 1 - scan, AND THE PICTURE SAID SO.
   * PHOTOGRAPHED with four seconds ago running: one bright stationary column
   * of window density with the engine's own grain marks sweeping straight past
   * it, left to right, across the whole width. The marks were right and the
   * column was a guess, and the two disagreed in front of anybody looking.
   * A lane with nothing to say says so; it does not borrow an answer from the
   * thing it is supposed to be a second opinion about.
   */
````

<a id="videoradio-85"></a>
## videoradio-85: demo/videoradio/index.html, inline script, line 1366

````js
  /**
   * 🔴 THE FRAME LOOP, SPLIT INTO A BODY AND A DRIVER, AND THE SPLIT OUTLIVED
   * WHAT IT WAS FOR.
   *
   * `window.requestAnimationFrame` does not fire while an immersive session is
   * running, so when this page had a headset half the session had to call
   * `tick` itself. That half is archived and `frame` is the only driver left.
   * The shape stays because it is the right one anyway: a body that advances
   * the picture by a timestamp is testable, and a driver that schedules it is
   * not.
   *
   * So the body is `tick` and the loop is `frame`, and the session calls `tick`
   * from ITS rAF (see `onFrame` where the headset is entered). One clock, two
   * drivers, and neither of them is a timer.
   */
````

<a id="videoradio-86"></a>
## videoradio-86: demo/videoradio/index.html, inline script, line 1387

````js
    // 🔴 THE STANDBY PICTURE, WHICH IS WHY THE BOX CAN BE SHOWN FROM THE FIRST
    // FRAME. Before play there is no audio graph and no grains, so the data is
    // all zeroes except the slow drift: what draws is the scanlines, the roll
    // and the vignette over an empty field. It is a true picture of an
    // instrument that has not started rather than a hidden box or a fake one.
````

<a id="videoradio-87"></a>
## videoradio-87: demo/videoradio/index.html, inline script, line 1467

````js
    // 🔴 HOW MANY LOOPS, NOT WHETHER THERE IS ONE. The shader warms the field
    // by this, so a stack that grows from one layer to three is something a
    // viewer sees rather than a fact only the log holds.
````

<a id="videoradio-88"></a>
## videoradio-88: demo/videoradio/index.html, inline script, line 1476

````js
    // 🔴 A TIME CONSTANT, NOT A PER-FRAME FRACTION, so the trail is the same
    // length at 30, 60 and 120 Hz. It is stretched for a few seconds after a
    // station change, because building a new decoder is about a second with no
    // audio in it and a trail on its ordinary setting would empty: the picture
    // would report a broken page at the exact moment it is doing what it was
    // asked to do.
````

<a id="videoradio-89"></a>
## videoradio-89: demo/videoradio/index.html, inline script, line 1485

````js
    // 🔴 THE THREE THINGS THAT MAKE THE PICTURE MOVE, AND ALL THREE ARE DATA.
    // Nothing in any shader body reads a clock: every one of them is a pure
    // function of this texture and the previous frame, which is what lets
    // "the same data twice draws the same bytes" stay an exact check. A time
    // uniform would have made that check impossible to write.
    //
    // `pulse` breathes with the grain clock. It is advanced by the grains the
    // engine ACTUALLY REPORTED this frame rather than by the rate that was
    // asked for, so it slows when the instrument slows and stops when the
    // instrument stops. That is the difference between the picture keeping
    // time with the sound and the picture keeping time with itself.
````

<a id="videoradio-90"></a>
## videoradio-90: demo/videoradio/index.html, inline script, line 1498

````js
    // `jolt` is the glitch, and its ordinary value is ZERO. It is set to 1 when
    // the sound or the station changes and decays over about a second, so the
    // picture tears at the moments something really did change and is perfectly
    // steady the rest of the time. A glitch that runs continuously is a
    // texture; one that fires on an event is information.
````

<a id="videoradio-91"></a>
## videoradio-91: demo/videoradio/index.html, inline script, line 1514

````js
    // 🔴 THE SAME BYTES GO TO THE HEADSET'S CHAIN, AND THEY ARE NOT RE-DERIVED.
    // The session runs a SECOND `makeField` in a second context, and the whole
    // reason the picture is a pure function of this texture is so the two ends
    // can be made identical by handing them one array rather than by running
    // the arithmetic twice. Running it twice is how two ends of one description
    // drift, which is the defect `/grains/` exists to show.
````

<a id="videoradio-92"></a>
## videoradio-92: demo/videoradio/index.html, inline script, line 1532

````js
    // 🔴 THE `on air` BADGE, AND IT IS FED ABOVE THE `started` GUARD ON
    // PURPOSE. A stream that has gone away has to be noticed whether or not the
    // page is still meant to be playing, and this is the one place that reads
    // the block count at all.
````

<a id="videoradio-93"></a>
## videoradio-93: demo/videoradio/index.html, inline script, line 1541

````js
    // ⚠️ NOTHING IS WRITTEN BEFORE PLAY. A readout full of numbers over a page
    // that has not started is a row of confident measurements of nothing, and
    // mount() already draws a pending cell as empty rather than as a zero.
````

<a id="videoradio-94"></a>
## videoradio-94: demo/videoradio/index.html, inline script, line 1557

````js
  /**
   * 🔴 IT DOES NOT RETURN THE PROMISE, AND A DEAD BUTTON IS GREYED RATHER THAN
   * LEFT LOOKING LIVE. The shell sweeps a control that returns a promise and
   * re-enables it afterwards, which here would be half a minute of a button
   * that looks busy followed by a button that looks pressable and does nothing.
   * This page plays itself: play is a gesture, it happens once, and what says
   * so is the control going grey with its reason on it. A control that looks
   * live and is inert is this repo's named hazard.
   */
````

<a id="videoradio-95"></a>
## videoradio-95: demo/videoradio/index.html, inline script, line 1566

````js
  /**
   * 🔴 IT STOPS AS WELL AS STARTS. The button disabled itself on the first
   * press, on the argument that this page plays itself and there is nothing
   * else to press. That is true of the INSTRUMENT and false of the listener:
   * somebody who wants the sound to stop had no way to ask, and the only
   * remaining option was closing the tab.
   * ⚠️ IT MUTES THE MASTER RATHER THAN TEARING THE GRAPH DOWN. Stopping the
   * engine would cost the loops it is holding, the station's decoder and about
   * five seconds to come back; the picture would freeze with it, and the tour
   * would lose its place. A gain at zero is instant, reversible, and leaves the
   * instrument playing itself exactly as the page claims it does.
   * The glide is 12 ms because a gain stepped mid-sample is a click.
   */
````

<a id="videoradio-96"></a>
## videoradio-96: demo/videoradio/index.html, inline script, line 1581

````js
  /**
   * 🔴 THE BAR'S OWN TOGGLE IS PLAY, AND THE GLYPH IS NOT THIS PAGE'S BUSINESS.
   * `.tbar-toggle` shows its play / pause icon from `data-state` in CSS, so the
   * square never changes size and nothing here writes a label. That is the
   * whole of *"play button is always square"*: the old row wrote `textContent`,
   * which threw away the span `centreSymbol` had measured and left the ink
   * jumping on every press.
   *
   * ⚠️ CAPTURE PHASE, AND IT READS THE STATE BEFORE THE PRESS. The bar's own
   * handler flips the deck, so by the time a bubbling listener runs
   * `deck.playing()` already means the NEXT state. `/archive/radio/` does exactly this
   * and for the same reason.
   * ⚠️ AND IT LISTENS FOR `click`, NOT `pointerdown`. `verify.mjs` drives a page
   * with `.tbar-toggle.click()` and sends no pointer events at all, so a
   * pointerdown hook would work under a finger and never once under the
   * harness, which is a control only ever tested by hand.
   */
````

<a id="videoradio-97"></a>
## videoradio-97: demo/videoradio/index.html, inline script, line 1613

````js
  /**
   * 🔴 AUTOSTART, WHICH IS REFUSED BY DEFAULT AND ALLOWED IN TWO REAL CASES.
   *
   * A browser will not start audio without a gesture, and CLAUDE.md records the
   * trap that goes with it: neither `AudioContext.resume()` nor `play()`
   * REJECTS when the gesture is missing, so a page that awaits one is a hang
   * rather than an error. Nothing here awaits either.
   *
   * It is tried anyway, because the refusal is not universal.
   *   · Chrome's Media Engagement Index lets a site autoplay with sound once
   *     somebody has played sound on it enough times, and an installed web app
   *     is granted it outright. A screen in a room running this all day is
   *     exactly that case.
   *   · A kiosk launched with `--autoplay-policy=no-user-gesture-required`
   *     allows it flatly. That is the same flag this repo's own harnesses use.
   * iOS allows neither, ever.
   *
   * ⚠️ IT IS OPT IN, `?auto=1`, AND NOT THE DEFAULT. A page that starts making
   * noise at somebody who followed a link is a page they close. The one place
   * this is wanted is a screen nobody is sitting at, and that screen can carry
   * a query parameter.
   * ⚠️ AND IT MUST FAIL INVISIBLY. If the browser refuses, `ctx.state` stays
   * suspended, the button stays exactly where it was, and pressing it works the
   * way it always did. No message, because a visitor who did not ask for this
   * has nothing to be told.
   */
````

<a id="videoradio-98"></a>
## videoradio-98: demo/videoradio/index.html, inline script, line 1647

````js
    // NEVER LET SOUND GATE THE WORK: neither of these REJECTS when the gesture
    // is missing, so awaiting one is a hang rather than an error. Fire and move
    // on; sound is allowed to be late, the picture is not.
````

<a id="videoradio-99"></a>
## videoradio-99: demo/videoradio/index.html, inline script, line 1655

````js
    // 🔴 THE OPENING CHOICE WANTS === true, AND EVERY OTHER TEST HERE WANTS
    // !== false. They are different questions. "Which mount should I start on"
    // has an answer in hand and should use it; "may I still offer this one"
    // must not be blocked by a station nobody asked about, which is caps.mjs's
    // rule that an unknown never blocks. Treating the two the same is what left
    // the page sitting on a mount the relay had just called down.
````

<a id="videoradio-100"></a>
## videoradio-100: demo/videoradio/index.html, inline script, line 1662

````js
    // 🔴 A MOUNT THE RELAY HAS JUST SAID IS DOWN IS NOT FETCHED. It answers 502,
    // **and the browser logs that to the console with no way to suppress it**,
    // so a page that opens one anyway prints a red line about somebody else's
    // server and holds a connection that will never deliver. MEASURED with all
    // six refusing: stream answered HTTP 502 in the log, a dead decoder left
    // connected, and the page waiting nine seconds to discover what it had
    // already been told.
````

<a id="videoradio-101"></a>
## videoradio-101: demo/videoradio/index.html, inline script, line 1670

````js
      // ⚠️ NO ANSWER AT ALL IS NOT THE SAME AS AN ANSWER OF NO. A relay without
      // the health route, or one that timed out, leaves every mount unknown, and
      // an unknown must be tried rather than refused.
````

<a id="videoradio-102"></a>
## videoradio-102: demo/videoradio/index.html, inline script, line 1686

````js
    // ⚠️ THE STATION CLOCK AND THE HEALTH POLL ARE SEPARATE, and the second one
    // does NOT move you off a station that is working. A mount coming back gets
    // its name into the rotation; one that stops drops out of it.
````

<a id="videoradio-103"></a>
## videoradio-103: demo/videoradio/index.html, inline script, line 1690

````js
    /**
     * 🔴 THE POLL IS SLOW WHILE SOMETHING IS PLAYING AND QUICK WHILE NOTHING IS,
     * AND BOTH HALVES ARE ABOUT COST. Each poll opens one upstream connection
     * PER STATION it asks about, so a page that is working must not keep asking:
     * that is how three ERR mounts came to answer this relay 502 in 9 ms while
     * serving a laptop normally. A page with nothing to play costs the
     * broadcasters the same either way and is useless until one answers, so it
     * asks three times as often until it has something.
     *
     * ⚠️ A CHAIN OF TIMEOUTS RATHER THAN AN INTERVAL, because the rate depends
     * on a state that changes: an interval would have to be cleared and remade,
     * which is two places for the rate to live.
     */
````

<a id="videoradio-104"></a>
## videoradio-104: demo/videoradio/index.html, inline script, line 1724

````js
    // 🔴 ready() IS IN A finally, AND THAT IS THE DIFFERENCE BETWEEN A PAGE
    // THAT REPORTS FOUR RED CHECKS AND ONE THAT REPORTS NOTHING AT ALL. A throw
    // anywhere below would otherwise leave __demo.ready false, and the harness
    // would wait its whole budget and then say "asserted nothing", which reads
    // as a broken page rather than as a broken relay.
````

<a id="videoradio-105"></a>
## videoradio-105: demo/videoradio/index.html, inline script, line 1740

````js
    // 🔴 REAL SUPERCOLLIDER, EATING A REAL RADIO STATION. Pappus does not
    // generate, it granulates whatever is ON A BUS: bootScsynth's input
    // connects the page's audio to scsynth's hardware input busses 2 and 3,
    // which is exactly the inbusl 2 inbusr 3 the Raspberry Pi uses.
````

<a id="videoradio-106"></a>
## videoradio-106: demo/videoradio/index.html, inline script, line 1750

````js
          // 🔴 m IS [address, nodeID, replyID, pos, dur, voice, half].
          // SendReply prepends two of its own arguments, so pos is at index
          // 3, and reading it at 2 takes the replyID, which is -1 on every grain
          // there has ever been. This page has that bug's whole history in
          // /archive/radio/'s comments; it is not going to be repeated here.
````

<a id="videoradio-107"></a>
## videoradio-107: demo/videoradio/index.html, inline script, line 1766

````js
    // 🔴 SILENCE THE ENGINE BEFORE IT CAN BE HEARD. bootScsynth wires its
    // output to the destination at gain 0.9, because Web Audio PULLS and a graph
    // with no path to the speakers is never asked to process. This page starts
    // mostly dry, so without this line there are a few hundred milliseconds of
    // granulator at nearly full volume on load.
````

<a id="videoradio-108"></a>
## videoradio-108: demo/videoradio/index.html, inline script, line 1772

````js
    // ⚠️ CONNECTED BEFORE IT IS DISCONNECTED, in that order. The other order
    // leaves the engine with no path to any destination for the length of one
    // statement, and what goes wrong then is not a click, it is an allocation
    // that never answers.
````

<a id="videoradio-109"></a>
## videoradio-109: demo/videoradio/index.html, inline script, line 1787

````js
    /**
     * ⚠️ THE TAP IS ON THE MODULATOR'S send, WHICH IS THE ONLY PLACE THE
     * VALUE EXISTS. createModulator keeps what it last sent to itself, so a
     * page drawing a modulated control has to see it go past rather than ask
     * for it back. One assignment beside the call that was happening anyway: no
     * polling, no missed change, and what the picture draws is exactly what went
     * out.
     *
     * 🔴 AND IT IS ON THE NEAR SIDE OF THE WIRE, WHICH THE PICTURE HAS TO BE
     * ABLE TO SHOW. This row proves the page asked; the grain row proves the
     * engine answered. Stop the engine with the modulator still ticking and the
     * parameters must go on moving while the marks stop arriving, or one of the
     * two rows is being fed from the wrong place.
     */
````

<a id="videoradio-110"></a>
## videoradio-110: demo/videoradio/index.html, inline script, line 1817

````js
    // 🔴 WAIT FOR THE RING TO HOLD SOMETHING, ON PLAYED SECONDS RATHER THAN ON A
    // LEVEL. A granulator cannot be louder than what it has recorded, and
    // polling a meter until it passes a threshold picked out of the air is a
    // measurement of nothing: a run once left that loop at 0.0021 over a ring
    // that was still nearly empty. The ring holds BUF_SECONDS, so it has been
    // filled once when that many seconds of audio have gone into it.
````

<a id="videoradio-111"></a>
## videoradio-111: demo/videoradio/index.html, inline script, line 1833

````js
  /**
   * One control, asked of the SERVER.
   *
   * 🔴 EVERY /n_set THIS PAGE SENDS IS FIRE AND FORGET, so what the page
   * believes about the engine is not evidence about the engine. /s_get is the
   * only thing on the far side of the wire, and every claim below about the
   * morph and the lock goes through it.
   */
````

<a id="videoradio-112"></a>
## videoradio-112: demo/videoradio/index.html, inline script, line 1866

````js
  /**
   * Put the tour at a named place without introducing a second way of being
   * somewhere.
   *
   * ⚠️ IT MOVES THE CLOCK'S ORIGIN RATHER THAN SETTING A FLAG. The tour is a
   * FUNCTION of performance.now(), and a "pretend we are here" flag would be
   * a second answer to the same question that the two halves could disagree
   * about the moment one of them was forgotten. Moving the origin means the
   * page carries on running normally from wherever it was put.
   *
   * k is where in the MORPH to sit: 0 is the end of the dwell, 1 is the
   * arriving sound.
   */
````

<a id="videoradio-113"></a>
## videoradio-113: demo/videoradio/index.html, inline script, line 1889

````js
    /**
     * 🔴 THE PICTURE MUST NOT DARKEN ON ITS OWN, AND NOTHING ELSE HERE CAN SEE
     * THAT. Every other check reads ONE frame: the flat-field check, the grain
     * positions, the loudness ramp. A feedback loop that loses a little every
     * lap passes all of them and is black a minute later, which is exactly what
     * happened and was reported three times before it was measured.
     * Three reads five seconds apart is the smallest thing that can catch it.
     */
````

<a id="videoradio-114"></a>
## videoradio-114: demo/videoradio/index.html, inline script, line 1922

````js
    // 🔴 NOT A FLAT FIELD, PER CHANNEL, OVER THE WHOLE FRAME. Four points on a
    // structured picture measure the structure rather than the picture, and a
    // SUM over channels is the one statistic that can be constant by
    // construction. mirror failed this assert twice, once each way: once on a
    // four-point sample of an eight-fold symmetric image, and once because
    // three cosines 120 degrees apart sum to a constant. Each channel is
    // reported separately so a failure is attributable on sight.
````

<a id="videoradio-115"></a>
## videoradio-115: demo/videoradio/index.html, inline script, line 1931

````js
    // ⚠️ THE LOUDNESS IS IN THE LINE BECAUSE IT IS WHAT LIGHTS THE FIELD. A
    // station that answers and then sends nothing leaves the granulator firing
    // into silence: the marks are still drawn and the field is still moving, at
    // a quarter brightness, which is honest and reads here as a dim picture.
    // Without the number in the line, that is indistinguishable from a shader
    // that stopped working.
    // 🔴 THE THRESHOLD COMES OUT OF THE BODY'S OWN FLOORS, NOT OUT OF THE AIR.
    // The dimmest a saturated mark can be drawn is LIT_FLOOR (a silent
    // station) times the blend's floor share at WET_MIN (the quietest moment
    // of a sound), on the red channel of --hi. Three quarters of that is the
    // line, so this check fails when the marks are MISSING and not when the
    // programme happens to be quiet.
````

<a id="videoradio-116"></a>
## videoradio-116: demo/videoradio/index.html, inline script, line 1950

````js
    // 🔴 AND THE CHECK ABOVE ON ITS OWN IS BLIND TO THE HALF THAT MATTERS, WHICH
    // IS WHY THIS ONE IS HERE. The window behind the grains is drawn from the
    // page's own parameters and has structure whether a single grain has ever
    // arrived or not, so a spread over the frame can be entirely the bed and a
    // page whose engine fires nothing would pass it.
    //
    // ⚠️ THE FIRST ATTEMPT AT THIS WAS A COLOUR TEST AND IT WAS THE WRONG
    // INSTRUMENT. The bed is drawn on --dim2 and the grains on --hi, so a
    // pixel where red leads blue can only be a grain: true, and MEASURED at
    // 45 pixels on a picture with fourteen live marks in it, because the
    // margin between the two colours after lighting and the blend is about
    // thirty of 255 and the check was asking for exactly thirty. A threshold
    // sitting on top of four multiplications is a threshold nobody can
    // calibrate. The accumulate target holds the deposits and NOTHING else, so
    // it needs no threshold argument at all.
````

<a id="videoradio-117"></a>
## videoradio-117: demo/videoradio/index.html, inline script, line 1979

````js
    // 🔴 THE SEPARATING PAIR, AND IT IS THE ONE CHECK A BODY THAT NEVER READS
    // THE DATA CANNOT PASS. The flat-field check above passes happily on a
    // shader drawing its own noise. Hold everything and render twice: the two
    // must be byte identical, which says nothing else is driving it. Then
    // change ONE texel and render again: it must differ, which says the data is
    // reaching the pixels. Neither half means anything without the other.
    //
    // ⚠️ IT COMPARES TWO PASSES, NOT TWO CONSECUTIVE LIVE FRAMES. This picture
    // feeds back, so frame n+1 is a function of frame n and two live frames are
    // never identical on a page that is working. testRender clears its own
    // previous frame to black first, which is what makes the comparison exact.
````

<a id="videoradio-118"></a>
## videoradio-118: demo/videoradio/index.html, inline script, line 2012

````js
    // 🔴 THE POSITIONAL PAIR, WITH TWO GRAINS AND NOT ONE. One grain proves a
    // deposit; two prove the AXIS, in the right order and the right distance
    // apart. /archive/radio/ shipped a wrong answer to exactly this question
    // twice in one line, and the count was right the whole time while the place
    // was not, with nothing able to see it.
    //
    // ⚠️ WHAT IT CANNOT DETECT is whether a LIVE grain is decoded out of the
    // right OSC field, because these two are synthetic. That is what the grain
    // rate below is for.
````

<a id="videoradio-119"></a>
## videoradio-119: demo/videoradio/index.html, inline script, line 2026

````js
    // ⚠️ TWO DIFFERENT LENGTHS AS WELL AS TWO DIFFERENT PLACES, so the same
    // render grades both axes. 40 and 200 of 255 are 6 ms and 1.1 s on the
    // engine's own 2 ms to 4 s exponential lane.
````

<a id="videoradio-120"></a>
## videoradio-120: demo/videoradio/index.html, inline script, line 2054

````js
    // 🔴 AND THE SAME QUESTION ABOUT THE OTHER AXIS, WHICH NOTHING ELSE ASKS.
    // Up the picture is grain length on the engine's own exponential lane, and
    // the check above would pass just as well with every mark at one height.
    // The two synthetic grains carry two different lengths, so the brightest ROW
    // in each half says whether the lane reached the pixels. ⚠️ readPixels
    // returns rows from the BOTTOM, which is the same direction gl_FragCoord.y
    // counts in, so no flip is needed and one would be invisible.
````

<a id="videoradio-121"></a>
## videoradio-121: demo/videoradio/index.html, inline script, line 2086

````js
    // 🔴 THE LIGHT COMES FROM THE AUDIO AND NOT FROM A CLOCK. Sweep loudness
    // from its floor to its ceiling with everything else held: there is no uT
    // in any body here, so a failure means the follower value is not reaching
    // the pixels at all. ⚠️ Measured on ONE channel, for the same reason the
    // flat-field check is.
    //
    // ⚠️ AND OVER A FRAME THE MARKS FILL, WHICH IS NOT THE SAME TEST DATA THE
    // POSITIONAL CHECK USES. MEASURED with the two-grain frame: the mean red
    // went 0.1 to 0.5 of 255, a real 5x that no sensible threshold can tell
    // from rounding, because two narrow columns of a 256-wide picture are 1% of
    // it. Every bucket is lit here so the mean is a measurement rather than a
    // rounding error, and the shader's own formula predicts the answer:
    // 0.25 + 0.75 * loud is a factor of four between the ends.
````

<a id="videoradio-122"></a>
## videoradio-122: demo/videoradio/index.html, inline script, line 2106

````js
    // 🔴 THREE LEVELS AND A MONOTONE CLAIM, NOT ONE RATIO.
    //
    // This used to divide loud by quiet and compare against
    // `(LIT_FLOOR + LIT_RANGE) / LIT_FLOOR`, which was exactly right while the
    // present pass was one colour times a number: colour was LINEAR in density,
    // so a 2.5x in density was a 2.5x on the screen. The pass is a RAMP now,
    // deliberately non-linear, and it compresses at the top where the warm end
    // flattens. MEASURED the moment the ramp landed: 2.16 against the 2.25 this
    // demanded, on a body doing exactly what it was written to do.
    //
    // Dividing by 0.9 harder would have made it pass and would have made it
    // mean less every time the ramp is tuned. What loudness actually promises
    // is that MORE OF IT IS BRIGHTER, at every step, and that is a claim no
    // ramp shape can satisfy by accident: a body ignoring loudness reads flat,
    // and one reading it backwards reads inverted. Both go red here and neither
    // could be told from the other by a single ratio.
````

<a id="videoradio-123"></a>
## videoradio-123: demo/videoradio/index.html, inline script, line 2136

````js
    // ⚠️ THE DROP COUNTER HAS TO HAVE FIRED IN THIS RUN, or it is a claim rather
    // than a counter. One bucket is flooded past the 255 an 8-bit channel holds,
    // on purpose, and the second half of the assert is that nothing has
    // overflowed during ordinary play.
````

<a id="videoradio-124"></a>
## videoradio-124: demo/videoradio/index.html, inline script, line 2152

````js
    // ⚠️ THE LAYOUT IS CHECKED AGAINST THE SHADER TEXT, NOT AGAINST ITSELF.
    // Asserting that the byte this page just wrote is the constant this page
    // just read is circular. What can actually drift is the module growing a
    // destination past the width the body was written for, so the bucket count
    // is read back OUT of the compiled source.
````

<a id="videoradio-125"></a>
## videoradio-125: demo/videoradio/index.html, inline script, line 2168

````js
      // ⚠️ IT STOPS HERE AND SAYS SO RATHER THAN THROWING. Everything below asks
      // the server questions, and an engine that refused has to leave a page
      // that still reports what it does know. The count is smaller on such a
      // run, which is the honest shape: this is a different run, not the same
      // one with a failure in it.
````

<a id="videoradio-126"></a>
## videoradio-126: demo/videoradio/index.html, inline script, line 2181

````js
    // ── silence ────────────────────────────────────────────────────────────
    //
    // 🔴 THE PAIR IS THE MEASUREMENT AND EITHER NUMBER ALONE IS BLIND. One
    // analyser sits on speakers and the other past gate, one gain apart, so
    // the only thing that can make their readings differ is the gain. Reading
    // the gain back would grade the SETTING rather than the sound, which is the
    // thing being claimed.
    //
    // 🔴 AND THE SIGNAL IS ONE THIS PAGE MAKES, NOT THE RADIO. The first two
    // versions used the station as the control and both failed on a working
    // page: 0.0000 inside the page, 0.0000 past the gate on five runs across
    // an afternoon when these mounts were answering a health probe with a 200
    // and then sending no bytes. A claim about a gain node has nothing to do
    // with whether a volunteer server in Tallinn is having a good day, and a
    // control that borrows its signal from one is a check that goes red for a
    // reason that is not its own. Four hundred milliseconds of 440 Hz into
    // speakers answers the same question with nothing outside this tab in it.
    //
    // ⚠️ IT GOES IN AT speakers, WHICH IS DOWNSTREAM OF EVERYTHING THAT MAKES
    // THE SOUND. The granulator reads srcNode and the loop records liveIn,
    // both upstream, so the tone cannot reach the instrument, the ring or the
    // picture. A diagnostic that changes the thing it measures is worse than
    // none, and this page's neighbour has the scar: a test oscillator armed
    // sixty times a second once filled a waveform with its own tone while the
    // page reported it as the radio.
    //
    // ⚠️ AND IT ONLY RUNS WITH THE GATE SHUT. With a trusted press the gate is
    // open and a 440 Hz tone would be a beep at somebody, so that case asserts
    // the other half instead: sound really is leaving.
````

<a id="videoradio-127"></a>
## videoradio-127: demo/videoradio/index.html, inline script, line 2242

````js
    // ── the morph ──────────────────────────────────────────────────────────
    //
    // 🔴 DRIVEN AND READ BACK OFF THE SERVER, NEVER WAITED FOR. A sound lasts
    // thirty-one seconds and the harness stops collecting 400 ms after the
    // assert count last grew, so a check that waited for a morph to come round
    // would report nothing and read as a broken page. What is graded is the
    // arithmetic and the delivery: put the tour at a known point, let one tick
    // write it, and ask scsynth what it is holding.
    // 🔴 A CHECK THAT READS A CONTROL BACK CANNOT READ A MOVING ONE, AND THIS
    // ONE FAILED BY EXACTLY THAT THE FIRST TIME IT RAN. four seconds ago
    // routes an envelope follower onto grain length, and on an exponential lane
    // taper(0.50) = 0.125 is a factor of 2.6: the read-back came back 0.7057
    // against 0.2733 asked for, which is the modulator working perfectly and
    // the assert asking the wrong question. hold(true) puts every destination
    // back on its base and stops writing, so the read-back grades DELIVERY; the
    // movement checks further down grade the movement, with the hold off.
````

<a id="videoradio-128"></a>
## videoradio-128: demo/videoradio/index.html, inline script, line 2273

````js
    // 🔴 AND IT TRAVELS AS A RATIO, WHICH IS NOT THE SAME PLACE AS HALFWAY. A
    // grain length halfway between these two geometrically and halfway
    // arithmetically are different numbers, and only one of them spends any
    // time in the part of the lane where a granulator stops being a delay and
    // becomes a texture. If the two are too close to tell apart on this pair,
    // the check says so rather than passing on a distinction it cannot make.
````

<a id="videoradio-129"></a>
## videoradio-129: demo/videoradio/index.html, inline script, line 2286

````js
    // 🔴 WHAT CANNOT BE SLID IS STEPPED, ONCE, AT THE MIDDLE, AND THE CLOCK IS
    // WHAT DOES IT. mscanmode is a Select.kr index and 2.5 is not a mode.
    // The tour is put just before the crossover and then LEFT ALONE, so the
    // second reading is a fact about the page running rather than about this
    // check driving it.
````

<a id="videoradio-130"></a>
## videoradio-130: demo/videoradio/index.html, inline script, line 2304

````js
    // ⚠️ AND THE MOTIONS WENT WITH IT. Two motions cannot be crossfaded:
    // a sixteen-slot step source and an envelope follower are different
    // machines, not two settings of one. So the set of walking destinations has
    // to be the arriving sound's and never a union of both.
````

<a id="videoradio-131"></a>
## videoradio-131: demo/videoradio/index.html, inline script, line 2314

````js
    // ── it moves on its own, with a stationary control in the same reading ──
    //
    // 🔴 EVERY MOVEMENT CHECK NEEDS A STATIONARY CONTROL IN THE SAME READING OR
    // IT IS UNFALSIFIABLE. hold(true) puts every destination back on its base
    // and stops writing, and the tour has to go on advancing underneath it.
    //
    // 🔴 AND THE DESTINATION IS CHOSEN SO THE ANSWER IS ARITHMETIC RATHER THAN
    // LUCK. two seconds of it walks winstart from a TRIANGLE at 0.013 Hz,
    // and three things follow: a triangle's slope is constant everywhere except
    // at its two vertices, so the distance moved in a window is the same
    // wherever the window lands; the route declares phase: 0 itself so
    // setRoutes does not reassign it; and the excursion is taper(0.60) = 0.216
    // of a lane the base sits at 0.417 of, so it can never reach a clamp and
    // report a working modulator as a stuck one.
    //
    // ⚠️ AN AUDIO-DRIVEN ROUTE WOULD HAVE BEEN THE WRONG CHOICE HERE. It would
    // make this check depend on somebody else's programme being loud, which is
    // a check about the station rather than about the page.
````

<a id="videoradio-132"></a>
## videoradio-132: demo/videoradio/index.html, inline script, line 2378

````js
    // ── the loop, and the grain clock it tunes ─────────────────────────────
    //
    // 🔴 THE LOCK IS ARITHMETIC AND IT IS READ BACK OFF THE ENGINE. A figure of
    // elen steps at rate grains a second has a bar of elen / rate
    // seconds, and lockRate is the nearest rate that fits a whole number of
    // those bars into the lap. Both periods are exact: a looped AudioBuffer
    // repeats at its own sample count, bit identical, and the grain clock is a
    // Phasor in the same context, measured at 24000.0 +/- 0.2 samples against
    // 24000 asked for.
````

<a id="videoradio-133"></a>
## videoradio-133: demo/videoradio/index.html, inline script, line 2391

````js
    // ⚠️ A SHORT LAP ON PURPOSE. The tour keeps the full eight seconds; the
    // check keeps two and a half, because eight seconds of waiting inside an
    // assert burst is eight seconds the harness spends collecting nothing.
````

<a id="videoradio-134"></a>
## videoradio-134: demo/videoradio/index.html, inline script, line 2397

````js
      // ⚠️ THE TOUR IS PINNED WHILE THE RING FILLS. It travels through real
      // seconds like everything else here, so without this the lock would be
      // made against one sound's figure and graded against another's.
````

<a id="videoradio-135"></a>
## videoradio-135: demo/videoradio/index.html, inline script, line 2407

````js
    // ⚠️ THE SAME subdivide THE PAGE USES. A prediction made under different
    // rules from the write it is grading is a check on a quantity next to the
    // one in question, which is how this page's neighbour lost a lock for a day.
````

<a id="videoradio-136"></a>
## videoradio-136: demo/videoradio/index.html, inline script, line 2424

````js
    // ── several loops at once ──────────────────────────────────────────────
    //
    // 🔴 THE ONE THING THE CHECKS ABOVE CANNOT SEE. They grade a loop, and a
    // loop was already graded when the page could only hold one. What is new is
    // that a second is KEPT WHILE THE FIRST IS PLAYING, and that depends on the
    // ring tapping the station upstream of the level the loops duck: tapped
    // downstream it would record the ducked signal, so the assert compares the
    // two kept peaks rather than only counting voices.
````

<a id="videoradio-137"></a>
## videoradio-137: demo/videoradio/index.html, inline script, line 2449

````js
    // 🔴 A SILENT MOUNT GRADES A DIFFERENT CLAIM UNDER A DIFFERENT NAME rather
    // than the same one more weakly, which is the rule the station check below
    // already follows: with nothing on air both peaks are zero and a comparison
    // between them would pass by measuring nothing.
````

<a id="videoradio-138"></a>
## videoradio-138: demo/videoradio/index.html, inline script, line 2462

````js
    // ⚠️ THE TOUR IS PUT BACK WHERE THE LOCK WAS MADE BEFORE THE RATE IS READ,
    // and the first run of this check is why. Filling a loop takes seconds, and
    // the tour goes on travelling through them: by the time the loop came off,
    // the page was 34% of the way from a sound at 16 grains a second to one at
    // 2, so the engine honestly held 8.636 and the assert compared it against
    // 16. That is the check measuring a quantity next to the one in question.
````

<a id="videoradio-139"></a>
## videoradio-139: demo/videoradio/index.html, inline script, line 2477

````js
    // ── the stations ───────────────────────────────────────────────────────
    //
    // ⚠️ THROUGH THE REAL PATH, NOT BY SETTING A VARIABLE. What this is about is
    // the wiring between choosing a station and bytes arriving from it, and
    // assigning station steps straight over that.
    // 🔴 AND WHEN THERE IS NOWHERE TO GO IT GRADES A DIFFERENT CLAIM UNDER A
    // DIFFERENT NAME, RATHER THAN THE SAME ONE MORE WEAKLY. MEASURED twice in
    // one afternoon: the relay had five of six mounts refusing, then four, then
    // three, and this check had no second station to press. A downgrade that
    // keeps the label reads exactly like a check that passed, so the label says
    // which of the two runs this was. What it costs is that a red suite cannot
    // be blamed on the relay without reading the line.
    //
    // 🔴 AND IT WALKS PAST A MOUNT THAT ANSWERS AND THEN SENDS NOTHING, WHICH IS
    // WHAT THESE MOUNTS DO. MEASURED: Radio 1965 to IDA Helsinki · 0 blocks
    // decoded off the new one, on a station /health had called up thirty
    // seconds earlier. A check that presses ONE button and grades the result is
    // grading the broadcaster's afternoon; pressing until something delivers or
    // the list runs out grades the wiring, which is the thing in question.
````

<a id="videoradio-140"></a>
## videoradio-140: demo/videoradio/index.html, inline script, line 2505

````js
      // ⚠️ MARKED DOWN HERE RATHER THAN THROUGH dropStation, which switches on
      // its own: this loop owns the walk, and two things choosing the next
      // station would skip one of them every time.
````

<a id="videoradio-141"></a>
## videoradio-141: demo/videoradio/index.html, inline script, line 2522

````js
      // 🔴 THE THIRD SITUATION, AND IT IS THE ONE THAT WAS HAPPENING WHILE THIS
      // WAS BEING WRITTEN: every mount refusing, including the ones /health
      // calls up. Three of these six answer a probe with a 200 and then send no
      // bytes at all, which is what a volunteer Icecast does when it is unwell,
      // and it is not something this page can fix or should read as its own
      // failure. What it CAN be graded on is whether it said so and carried on
      // drawing rather than going blank and leaving somebody to debug a browser.
````

<a id="videoradio-142"></a>
## videoradio-142: demo/videoradio/index.html, inline script, line 2538

````js
    // 🔴 AND THE ONE THAT MATTERS WHEN THE RELAY IS UNWELL: a station known to
    // be down is never chosen. Three of these six mounts were refusing within
    // an hour of this page being written, so this is the ordinary case and not
    // an edge one. ⚠️ It is proved by BREAKING it: one station is marked down
    // and every starting point is asked, which is the only way to know the
    // refusal fires rather than that it happens to be unnecessary.
````

<a id="videoradio-143"></a>
## videoradio-143: demo/videoradio/index.html, inline script, line 2553

````js
    // ── the screen ─────────────────────────────────────────────────────────
    //
    // ⚠️ IT REPORTS WHICH MECHANISM RAN, because an iPhone has no element
    // fullscreen at all and requestFullscreen?.() optional-chains straight
    // past the missing method: no throw, no catch, no log line and no picture.
    // A page that cannot say which path it took cannot be debugged from a phone.
    //
    // 🔴 AND IT REFUSES TO RUN OVER SOMEBODY WHO IS ALREADY IN FULL SCREEN.
    // THIS IS THE `drops out of full screen` FAULT, REPORTED SINCE SESSION 28
    // AND WRONGLY FILED AS A TIMER: *"chrome drops out of fullscreen when radio
    // source changes"*, and *"drops out of full screen after 22 to 25
    // seconds"*. Neither clock was the cause. `check()` runs from the FIRST
    // PRESS OF PLAY, it is a long sequence of awaits, and this is near the end
    // of it, so it lands roughly twenty seconds later. `FS.toggle` on a pane
    // that is already full screen EXITS it, and `FS.exit` below makes sure.
    // Somebody who pressed play and then ⛶ was having their own full screen
    // taken away by the page checking itself, on a schedule that looked exactly
    // like a station change because it is the same order of seconds.
    //
    // ⚠️ IT SAYS SO RATHER THAN PASSING QUIETLY. CLAUDE.md: an assert that
    // excuses itself is worse than no assert. This one cannot GRADE the
    // mechanism without working the control, so when it must not work the
    // control it reports that it could not, in words, and the suite still
    // grades it on every run because no harness is ever already full screen.
````

<a id="videoradio-144"></a>
## videoradio-144: demo/videoradio/index.html, inline script, line 2597

````js
  // ⚠️ THE PAGE SAYS WHAT IT IS BEFORE ANYTHING IS PRESSED, so somebody who
  // never touches it still knows what would happen. ⚠️ AND NO CELL IS PRE-SET
  // TO A NUMBER: a zero in a readout reads as a very confident measurement of
  // nothing, and every cell here is pending until it has been measured.
````
