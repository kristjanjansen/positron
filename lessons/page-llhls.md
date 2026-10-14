# Page comments: llhls

The full comments cut from the code under demo/ for llhls, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="llhls-1"></a>
## llhls-1: demo/llhls/index.html, HTML comment, line 9

````html
<!-- 🔴 NO PAGE STYLESHEET SINCE 2026-09-29. It held two rules and both went with
     the things they dressed: a bare `video` rule, now that the picture lives in
     a video panel whose stage owns its width, height, shape and object-fit, and
     a `.hold` pill for the publisher badge that the stream toggle replaced. A
     `border-radius` and a `margin` on a video inside a `.pos-vp-stage` are a box
     drawn inside a box and a gap inside a picture. -->
````

<a id="llhls-2"></a>
## llhls-2: demo/llhls/index.html, HTML comment, line 15

````html
<!-- 🔴 ONE PAGE RULE SET AGAIN SINCE 2026-09-30, AND IT IS ABOUT THE TWO
     REFERENCE TABLES UNDER THE PICTURE AND NOTHING ELSE. Asked, verbatim: *"do
     not wrap optoins. have default and recommended cols with values. use sans
     serif for comment (change col title)"*, with maxLiveSyncPlaybackRate and
     initialLiveManifestSize broken mid word at desk width. `table.mjs` lets a
     cell break anywhere, which is right for a file name and wrong for an
     identifier somebody will paste into their own config, so the no-wrap is on
     this column only and the component is untouched.
     ⚠️ THE TRACKS ARE IN `ch`, NOT px. `.pos-tbl` is the mono face, where `ch`
     is exactly one character, so 31ch is `manifestLoadingMaxRetryTimeout` with
     one to spare and cannot drift when a name is added or the size changes.
     Every row is its own grid, so the tracks have to be declared rather than
     `max-content`, or the header and the rows would disagree.
     ⚠️ THE PHONE IS DECIDED BY THE TABLE'S OWN WIDTH, NOT THE WINDOW'S. Below
     640 px of table a no-wrap name, two values and a paragraph cannot share one
     line, so the row stacks: the name on its own line, the two values under it
     on two columns, and the comment under those at the full width. Nothing
     scrolls sideways. The header stacks the same way, so it reads as the key to
     every row under it.
     ⚠️ THE COMMENT IS THE PAGE'S PROSE FACE AT THE SIZE OF THE CAPTION JUST
     ABOVE IT (`.pos-dg-cap`), so the words under the picture and the words in
     the table read as one voice. -->
````

<a id="llhls-3"></a>
## llhls-3: demo/llhls/index.html, style, line 38

````css
/* ⚠️ REGISTERED, BECAUSE `ch` RESOLVES AGAINST EACH ELEMENT'S OWN FONT. The
   header row is 10 px and the rows are 11 px, so `31ch` typed on the rows made
   the header's columns ten per cent narrower than the body's and every heading
   sat left of its column. A registered `<length>` computes ONCE, on `.hls-opts`
   in the table's own 11 px mono, and every row inherits the same pixels. A
   browser without `@property` gets the old per-row reading, which is a heading
   a few pixels off, not a broken table. */
````

<a id="llhls-4"></a>
## llhls-4: demo/llhls/index.html, inline script, line 75

````js
    // 🔴 ONE SENTENCE, AND IT IS THE INDEX'S OWN LINE. This was two, and the
    // second one (*"Opening this page is what starts the stream"*) is the whole
    // subject of the picture at the foot of the page now, said there with the
    // machine that does it drawn beside it. A paragraph and a diagram of one
    // thing are two explanations and the paragraph is the weaker.
````

<a id="llhls-5"></a>
## llhls-5: demo/llhls/index.html, inline script, line 82

````js
    // 🔴 NO CONTROL DECLARED HERE, AND NO PRIMARY BUTTON. Asked 2026-09-29:
    // *"rm primary button with status togglebutton: stream off | starting | on.
    // make a global component for this if needed"*. The control is built below,
    // out of `createPresenceButton`, and appended to this same row, which is
    // where `demo/verify.mjs` presses.
````

<a id="llhls-6"></a>
## llhls-6: demo/llhls/index.html, inline script, line 91

````js
  /**
   * 🔴 THE CONTROL IS THE STATUS, AND NO NEW COMPONENT WAS WRITTEN FOR IT.
   * `createPresenceButton` is already a control row button whose face is a live
   * badge: it reserves the width of the longest phrase it can say so it cannot
   * twitch, fades the word through rather than resizing, keeps its own live
   * region for a screen reader, and four instrument pages drive one. What was
   * missing was three words, and three words typed into two pages is the
   * argument `presence.mjs` already makes about `WIRED`. `STREAM` is that map
   * and `/webrtc/` takes the same one.
   *
   * 🔴 A PRESS DURING `starting` STOPS, AND THE CONTROL SAYS SO RATHER THAN
   * LOOKING DEAD. The middle state is about half a minute here: a cold
   * container, ffmpeg, and Cloudflare's ingest filling. That is long enough
   * that somebody who pressed by accident will press again, and it is the one
   * stretch where this page is spending a container and Stream minutes on
   * nobody. Ignoring the press would be a control that does nothing and says
   * nothing. The reason rides on the badge's own title, which is the two line
   * tooltip `presence.mjs` already builds.
   */
````

<a id="llhls-7"></a>
## llhls-7: demo/llhls/index.html, inline script, line 112

````js
    // 🔴 ONE NAME FOR BOTH HALVES. The label a screen reader hears has to name
    // the ACTION, and this button's action changes with its state, so a name
    // that said only `start` would be wrong half the time and would go stale
    // silently. `presence.mjs` records the same trap on the instrument header.
````

<a id="llhls-8"></a>
## llhls-8: demo/llhls/index.html, inline script, line 123

````js
  /**
   * 🔴 NO NATIVE `controls`, AND IT WENT WITH THE VIDEO PANEL RATHER THAN ON
   * ITS OWN. LOOKED AT 2026-09-29, at 1280 px: the element's own bar drew a
   * play button, a `0:00` clock and a SCRUB BAR across the bottom of a LIVE
   * stream, and its own ⛶ sat directly above the panel's ⛶. A position
   * surface on something with no position is the shape of control this project
   * calls a lie, and two ways to fill the screen an inch apart is the same
   * defect one layer up. Starting and stopping is the control at the top of
   * the page now, and filling the screen is the panel's own square.
   * ⚠️ WHAT GOES WITH THEM IS UNMUTING, WHICH IS WORTH SAYING. This
   * element is muted because autoplay requires it, and what it carries is a
   * test pattern rather than anything to listen to.
   */
````

<a id="llhls-9"></a>
## llhls-9: demo/llhls/index.html, inline script, line 139

````js
  /**
   * 🔴 THE PICTURE IS A VIDEO PANEL SINCE 2026-09-29, ASKED FOR AS *"use in
   * llsl use videopanel with resolution / fps (fix w so it did not ump
   * horztally) and short spec what streams it"*.
   *
   * 🔴 THE PARENTHESIS IS THE HARD PART AND IT IS CELLS, NOT A STRING. CLAUDE.md,
   * written about a footer reading `Apple GPU · locked 59.9 fps`: a row of facts
   * is cells, not one string with glue in it. So resolution, frame rate and
   * what the encoder sends are three cells, each with its
   * own reserved width in characters of the mono face it is set in, and
   * `.pos-vp-v` is `tabular-nums` so a `1` is as wide as a `0`. `1280x720`
   * becoming `1x1` for one frame then moves nothing, which the check at the
   * foot of this page measures rather than assumes.
   *
   * ⚠️ NO PRESENCE DOT. `left: null`, so the value row has the left slot to
   * itself: whether the thing feeding this picture is answering is what the
   * control at the top of the page now says, in words, and a dot repeating it
   * under the picture is the same fact twice.
   */
````

<a id="llhls-10"></a>
## llhls-10: demo/llhls/index.html, inline script, line 170

````js
  /**
   * The short spec, read off `workers/pub/container/server.mjs` rather than
   * remembered: this leg is libx264 at a fixed bitrate with AAC beside it. The
   * rest of it, the constant bitrate, the keyframe every segment and the
   * B-frames switched off, is a sentence and lives in the picture's own note,
   * where there is room for one.
   */
````

<a id="llhls-11"></a>
## llhls-11: demo/llhls/index.html, inline script, line 177

````js
  /**
   * 🔴 THE SPEC IS WRITTEN WHEN THERE IS A PICTURE TO BE A SPEC OF, NOT ON
   * LOAD. Asked 2026-09-29 against a phone screenshot of this page sitting at
   * `STREAM OFF`: *"Do not show video details until we have incomng data"*.
   * It used to be set here, at build time, which kept the footer's value row
   * non-empty for ever and so kept it on screen describing a stream nobody had
   * started.
   * ⚠️ **AND THE HIDING IS THE KIT'S, NOT THIS PAGE'S.** `createPanelValues`
   * hides its row while every cell is empty, so all this page has to do is not
   * write a cell early. There is no `hide()` call here to forget.
   */
````

<a id="llhls-12"></a>
## llhls-12: demo/llhls/index.html, inline script, line 191

````js
  /**
   * 🔴 A CUSTOM PROPERTY, NOT `video.style.aspectRatio`. This was `matchAspect`,
   * which writes the shape onto the ELEMENT, and an inline style beats every
   * selector in `shell.css` including the two that let a panel fill a screen.
   * `--vp-aspect` is the channel `video-panel.mjs` publishes for exactly this,
   * and the stage falls back to 16 / 9 when nothing has set it.
   */
````

<a id="llhls-13"></a>
## llhls-13: demo/llhls/index.html, inline script, line 208

````js
  // ── report what this device sees ────────────────────────────────────────
  // A phone cannot be attached to a debugger from here, so it posts instead.
  // Batched and fire-and-forget: diagnostics must never be able to make the
  // page worse than the problem being diagnosed.
````

<a id="llhls-14"></a>
## llhls-14: demo/llhls/index.html, inline script, line 240

````js
  // `held` is the socket, which is what the publisher counts. It survives the
  // badge that used to show it, because the check below reads it and because a
  // toggle reading `on` while nothing is held would be a page lying about the
  // one fact it is responsible for.
  // ⚠️ DECLARED HERE RATHER THAN BESIDE `settle()`, WHICH IS WHERE IT READS
  // BEST AND WOULD BE IN THE TEMPORAL DEAD ZONE FOR `stop()` ABOVE IT. This
  // project has already lost seven asserts to a `let` declared after the code
  // that reads it.
````

<a id="llhls-15"></a>
## llhls-15: demo/llhls/index.html, inline script, line 249

````js
  /**
   * 🔴 A GENERATION, BECAUSE THE START PATH AWAITS FOR HALF A MINUTE AND CAN BE
   * STOPPED IN THE MIDDLE OF IT. Every `await` in `start()` is a place a press
   * can land, and without a number to compare against, a start that was
   * cancelled would come back afterwards and attach a player to a socket that
   * had already been let go. Same shape as the per-join generation tag
   * `workers/rtc` uses against a ghost rejoin.
   */
````

<a id="llhls-16"></a>
## llhls-16: demo/llhls/index.html, inline script, line 259

````js
  // ?cap=360 pins the ladder at or below 360p. This is the CONTROL for the
  // decode-bound reading: if the same phone advances at ~1.0x on 360p and
  // ~0.2x on 720p, the bottleneck is the device presenting frames, and the
  // FPS capping above is the fix rather than a guess.
````

<a id="llhls-17"></a>
## llhls-17: demo/llhls/index.html, inline script, line 277

````js
  /**
   * The one control, and it decides from the state it is showing rather than
   * from a flag beside it: there is only one reading of `stream off` and one of
   * the other two, so the control cannot disagree with itself.
   */
````

<a id="llhls-18"></a>
## llhls-18: demo/llhls/index.html, inline script, line 282

````js
  /**
   * 🔴 `stream.state()`, NOT `stream.state`. It is a FUNCTION on the presence api
   * (`state: () => now`) and `createPresenceButton` hands it through a getter,
   * so the bare property is the function itself and `fn === 'offline'` is false
   * forever. MEASURED on the first run of this control: the harness pressed the
   * toggle, this line called `stop()` on a page that had never started, and the
   * suite read 16/16 GREEN with the page's own assert count down from 6 to 2.
   * `/twelve/` had already written this trap down, in these words: a comparison
   * against a function is a comparison that cannot fail.
   */
````

<a id="llhls-19"></a>
## llhls-19: demo/llhls/index.html, inline script, line 294

````js
  /**
   * Let it go. Closing the socket is the whole of it from this end: the
   * publisher counts sockets, so this page stops being one of them and the
   * sweep on the far side does the rest about a minute later.
   */
````

<a id="llhls-20"></a>
## llhls-20: demo/llhls/index.html, inline script, line 303

````js
    // ⚠️ THE SOCKET GOES FIRST AND `ws` IS NULLED WITH IT. `settle()` below is
    // wired to the element's own events and tearing a player down fires some of
    // them, so a `ws` still standing here would let the toggle flick back to
    // `starting` on the way out.
````

<a id="llhls-21"></a>
## llhls-21: demo/llhls/index.html, inline script, line 321

````js
  /* 🔴 RETIRED 2026-10-13, AND SO EVERY TIER IS THE LIGHT ONE. The test
     pattern this page played is gone: Stream deleted its input (positron-demo)
     and pub answers /watch, /status, /start and /stop with 410. Before the
     retirement a press held the publisher, woke a cold container and waited
     up to 90 s for a manifest; now there is nothing to wait for, so a press
     says so at once and an ordinary or a deep harness run grades the page at
     rest. The body that ran the stream is in git at be7737d, and the player
     itself is unchanged in `src/low-latency-player.js`, where
     /video/llhls/ still uses it. */
````

<a id="llhls-22"></a>
## llhls-22: demo/llhls/index.html, inline script, line 339

````js
  /**
   * 🔴 `on` IS A MEASUREMENT, NEVER A PROMISE. `/stage/` dropped a middle state
   * for exactly this reason: the fact behind `soon` was only that a socket
   * existed, so it could stand there saying soon for an hour. Here `starting`
   * becomes `on` when this element has actually been handed a decodable
   * picture, which is a thing that happened rather than a thing that was
   * arranged.
   *
   * 🔴 AND IT IS LATCHED, NOT SAMPLED, BECAUSE `paused` IS THE WRONG QUESTION.
   * The control says whether the STREAM is on. A visitor who pauses with the
   * element's own controls has not stopped the publisher, is still being
   * counted as a viewer and is still costing delivered minutes, so a toggle
   * that fell back to `starting` there would be describing the player while
   * claiming to describe the source. Same argument `transport-bar.mjs` writes
   * down for `on air`: the five words are about the source, not the player.
   */
````

<a id="llhls-23"></a>
## llhls-23: demo/llhls/index.html, inline script, line 380

````js
    // ⚠️ THE SAME CLAIM THE PUBLISHER BADGE USED TO CARRY, READ OFF THE SOCKET
    // RATHER THAN OFF A PILL. The badge is gone and the fact is not: what
    // changed is that the detail now names the control a visitor is looking at.
````

<a id="llhls-24"></a>
## llhls-24: demo/llhls/index.html, inline script, line 383

````js
    /**
     * ⚠️ AND IT READS THE STATE THROUGH THE CALL, AND REQUIRES A STRING, WHICH
     * IS WHAT MAKES IT ABLE TO FAIL. `stream.state` without the parentheses is
     * a function, and a function is never `'offline'`, so a check written that
     * way would pass whatever the badge said. This one goes red on exactly the
     * bug that shipped for one run of this page.
     */
````

<a id="llhls-25"></a>
## llhls-25: demo/llhls/index.html, inline script, line 395

````js
    /**
     * 🔴 THE ASK ITSELF, GRADED. *"rm primary button with status togglebutton"*
     * is a claim about this row, and a row is a thing a check can read: one
     * button, it is the toggle, and nothing in it is a primary. A page that
     * grew a second control back would say so here rather than in a
     * screenshot somebody happened to take.
     */
````

<a id="llhls-26"></a>
## llhls-26: demo/llhls/index.html, inline script, line 406

````js
    /**
     * 🔴 THE PARENTHESIS IN THE ASK, MEASURED RATHER THAN BELIEVED: *"fix w so
     * it did not ump horztally"*. Every cell is written at its widest and at
     * its narrowest and the ROW is measured both times, because the defect is
     * not a cell resizing, it is a cell shoving the one after it. Without the
     * `reserve` on each field this goes red.
     * ⚠️ IT IS SYNCHRONOUS AND NOTHING IS PAINTED IN BETWEEN. Reading a
     * rectangle forces layout and never a paint, and the real readings are back
     * before this function yields, so a person watching the page sees none of
     * it. A check that a visitor could see happen is a check this project has
     * already been reported for.
     */
````

<a id="llhls-27"></a>
## llhls-27: demo/llhls/index.html, inline script, line 422

````js
      /**
       * 🔴 THE ROW IS HIDDEN BEFORE A PRESS SINCE 2026-09-29, AND THIS CHECK
       * HAD TO STOP RELYING ON IT BEING THERE. It used to empty `size` and
       * `fps` and leave `source`, which held the row open. `source` is written
       * when a picture arrives now, so on a run with no press every cell is
       * empty, the kit hides the row, and both measurements would have read
       * **0 px** and the comparison would have passed having measured nothing.
       * That is this project's worst shape and it would have been green.
       * ✅ So the check writes `source` ITSELF in both states, and `narrow > 0`
       * is a term of the assert rather than an assumption underneath it.
       */
````

<a id="llhls-28"></a>
## llhls-28: demo/llhls/index.html, inline script, line 441

````js
      /**
       * 🔴 AND NOTHING IS SAID ABOUT A STREAM WITH NOTHING COMING IN. The ask,
       * verbatim: *"Do not show video details until we have incomng data"*.
       * 🔴 **WHAT IS GRADED IS THE MECHANISM, NOT THE STATE THIS RUN HAPPENS TO
       * BE IN, AND THE FIRST DRAFT GOT THAT WRONG AND WENT RED.** It required
       * the row to be absent at check time, which is true for a visitor who has
       * not pressed and FALSE here, because `demo/verify.mjs` presses every
       * control on the page: the stream reads `online`, a picture is arriving,
       * and the footer is showing what it should. A check that fails when the
       * page is working is a check about the harness.
       * ✅ So it empties every cell and requires the row to go, then writes one
       * back and requires it to return. Both directions, because hiding a row
       * for ever is the same defect wearing the opposite sign.
       * ⚠️ **AND IT IS SYNCHRONOUS WITH THE READINGS PUT BACK**, like the
       * measurement above it: reading `hidden` forces no layout at all, and
       * nothing is painted between the two writes.
       */
````

<a id="llhls-29"></a>
## llhls-29: demo/llhls/index.html, inline script, line 470

````js
    // The stream checks went with the stream on 2026-10-13 (see `LIGHT`), the
    // manifest fetch among them, so nothing here asks Cloudflare anything.
````

<a id="llhls-30"></a>
## llhls-30: demo/llhls/index.html, inline script, line 476

````js
  /**
   * 🔴 HOW IT WORKS, INCLUDING HOW IT STOPS. Asked 2026-09-29: *"add how it
   * works to llhsl incl how it stops"*. It is a picture and not a paragraph,
   * because a desc here is one sentence and may not be stretched, and because
   * the thing being described is five machines passing one picture along, which
   * is what a diagram is for.
   *
   * Everything in it is read off `workers/pub/worker.mjs` and
   * `workers/pub/container/server.mjs` rather than remembered.
   */
````

<a id="llhls-31"></a>
## llhls-31: demo/llhls/index.html, inline script, line 522

````js
      // 🔴 WHAT THE SOCKET REALLY IS, asked 2026-09-30 as *"you can be more
      // techincal on this connector label and desc"*. Read off
      // `workers/pub/worker.mjs`: `/watch` is accepted with `acceptWebSocket`
      // (hibernatable), `viewers()` is `getWebSockets().length`, the only thing
      // ever sent is one `hello` down on connect, and `webSocketMessage` is
      // empty, so nothing the page could send up is read. `/webrtc/` carries
      // the same label on the same socket and must change with this one.
````

<a id="llhls-32"></a>
## llhls-32: demo/llhls/index.html, inline script, line 536

````js
      // ⚠️ NO LABEL, AND THE COMPONENT WOULD REFUSE ONE. An arrow between two
      // boxes inside one container shows direction only, because the gap they
      // share is sixteen pixels tall and a name in it runs under both of them.
      // What travels goes in the note, which is read on hover under the picture.
````

<a id="llhls-33"></a>
## llhls-33: demo/llhls/index.html, inline script, line 550

````js
  /**
   * 🔴 WHAT IT TAKES TO GET LOW LATENCY OUT OF hls.js, IN FULL. Asked
   * 2026-09-30: *"add longer desc how to patch hls.js to work right"* and then
   * *"and get ll what we need"*.
   * ⚠️ IT IS TWO TABLES UNDER THE PICTURE AND NOT A LONGER NOTE, AND THE LIMIT
   * IS NOT TASTE. A note over forty words is reported on `dg.cuts`, which this
   * page ASSERTS empty, and every note is measured into the height the caption
   * line reserves, so one long note would grow the empty line under the picture
   * for every other box as well. The full list is about thirty facts, and a row
   * of facts is cells, not a paragraph with glue in it.
   * ⚠️ EVERY VALUE IS WHAT `src/low-latency-player.js` (v14) PASSES: the
   * `new Hls({...})` literal at lines 401 to 461 and the `DEFAULTS` above it,
   * because this page passes only `preferNative`. Every hls.js default was read
   * off the bundled 1.7.1 and is quoted from `positron-streaming`, section
   * "hls.js and the native path: what each default costs". Three lines of that
   * literal change nothing (`lowLatencyMode`, `levelLoadingMaxRetry`,
   * `levelLoadingRetryDelay` are already the defaults) and are left out, so the
   * table is the thirteen that move something.
   */
````
