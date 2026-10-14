# Page comments: webrtc

The full comments cut from the code under demo/ for webrtc, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="webrtc-1"></a>
## webrtc-1: demo/webrtc/index.html, HTML comment, line 9

````html
<!-- 🔴 NO PAGE STYLESHEET SINCE 2026-09-29, for the reasons `/llhls/` writes
     down in the same breath. The picture is a video panel now, whose stage owns
     the element's width, height, shape and object-fit, and the `.hold` pill that
     showed the publisher was replaced by the stream toggle in the control row. -->
````

<a id="webrtc-2"></a>
## webrtc-2: demo/webrtc/index.html, inline script, line 24

````js
    // 🔴 ONE SENTENCE, AND IT IS THE INDEX'S OWN LINE. Asked 2026-09-29:
    // *"shorten desc to 1 sentence"*. It was six, and each one of them has a
    // better home than the top of a page: what the handshake is and how the
    // stream stops are the picture at the foot of this page, what the control
    // does is the control's own label, and what the round trip means is its
    // footer label's business. This project has cut this rule from four
    // sentences to three to one and broken it every time within a few pages.
````

<a id="webrtc-3"></a>
## webrtc-3: demo/webrtc/index.html, inline script, line 32

````js
    // 🔴 `rtt` WAS A KEY THAT READ AS A LATENCY CLAIM. Quoting this number
    // beside a glass-to-glass one flattered WHEP by about three times once
    // already (CLAUDE.md, candidate-pair RTT). The words now say what it is,
    // and `state` says `playing`/`paused` rather than `playing rs4`: the
    // readyState behind it is in the assert's detail, where a number that needs
    // a spec to read belongs.
    // ⚠️ `fps` AND `picture` LEFT THIS ROW ON 2026-09-29 AND WERE NOT DROPPED.
    // They are facts about the PICTURE and they now sit in the picture's own
    // footer, which is where the kit puts a number that belongs to one element.
    // A row above the panel repeating them would be the same fact twice.
    //
    // 🔴 SIX CELLS OUT OF `getStats()` SINCE 2026-09-30, asked as *"add some
    // stats to webrtc and moq demo"* against `/llhls/`'s six. NOT THE SAME SIX:
    // holes, switches and advance are facts about segments and a playlist, and a
    // WHEP receiver has neither. What it has is what the receiver itself counts,
    // so every cell below is read off one `getStats()` a second, and they
    // answer the two questions a visitor has: is it smooth, and how long does
    // a frame wait here. Sources, all on the VIDEO `inbound-rtp` unless named:
    //   buffer   delta jitterBufferDelay / delta jitterBufferEmittedCount, so
    //            how long a frame sat in the receiver's buffer over the last
    //            second. Cumulative average until there is a previous sample.
    //   jitter   `jitter`, seconds on the wire, shown as ms
    //   lost     `packetsLost` since the connection opened
    //   dropped  `framesDropped`, decoded or received and never shown
    //   freezes  `freezeCount`, the browser's own count of visible freezes
    //   codec    the `codec` report the video `inbound-rtp`'s `codecId` points
    //            at, which is what was NEGOTIATED rather than the
    //            `H.264 + Opus` that used to be typed into the footer.
    // 🔴 `round trip` LEFT THIS ROW FOR THE PICTURE'S FOOTER, LABELLED AS A
    // NETWORK ROUND TRIP. It is `candidate-pair` RTT, which is not media latency
    // (positron-streaming: beside MoQ's glass to glass it flattered WHEP about
    // three times). No cell here claims glass to glass, because nothing on this
    // page can measure it: the machine-readable clock row was taken out of the
    // encoder on 2026-09-08, and the digits still burned into the picture are
    // for a person's eye, not for this page to read.
    // ⚠️ `codec` IS THE VIDEO CODEC ALONE. `H.264 + Opus` was cut to `H.264 …`
    // at 375 px, MEASURED, and the audio side is not a choice anybody makes on
    // this leg, so the log line carries both and the cell carries the one that
    // decides the picture.
    // ⚠️ `state` WENT TO MAKE ROOM, and nothing it said is lost: the toggle
    // says whether the stream is on, and `element is playing` grades the element.
````

<a id="webrtc-4"></a>
## webrtc-4: demo/webrtc/index.html, inline script, line 80

````js
  /**
   * 🔴 THE SAME CONTROL AND THE SAME THREE WORDS AS `/llhls/`, OUT OF THE SAME
   * MAP. Asked 2026-09-29 as *"same treatment"*. `STREAM` lives in
   * `presence.mjs` beside `WIRED` precisely so these two pages cannot drift into
   * two vocabularies for one idea, and `createPresenceButton` was already the
   * control: a row button whose face is a live badge with a reserved width.
   *
   * 🔴 A PRESS DURING `starting` STOPS HERE TOO, and the middle state is if
   * anything longer on this leg. The container has to wake, ffmpeg has to reach
   * DTLS, and Cloudflare then holds a WHIP input against a stale publisher for
   * about 45 s before it will accept a new session, which has no equivalent on
   * the RTMPS side.
   */
````

<a id="webrtc-5"></a>
## webrtc-5: demo/webrtc/index.html, inline script, line 107

````js
  /**
   * The picture, its resolution and its frame rate, in cells rather than in one
   * string with glue in it. `/llhls/` carries the argument in full; what differs
   * here is the encoder, and it must not be copied across: this leg is WHIP, so
   * the audio is libopus rather than AAC and the video is offered as baseline
   * 3.1, MEASURED in `rig/whep/WHIP-FFMPEG-NOTES.md`.
   */
````

<a id="webrtc-6"></a>
## webrtc-6: demo/webrtc/index.html, inline script, line 121

````js
      /**
       * 🔴 THE ONE LATENCY ON THIS PAGE, AND ITS LABEL SAYS WHICH KIND. Asked
       * 2026-09-30 with the readout: a latency in the footer that cannot be
       * mistaken for glass to glass. It is `candidate-pair`
       * `currentRoundTripTime`, a network round trip between this browser and
       * Cloudflare, and says nothing about encode, the SFU, the buffer or the
       * decoder.
       * ⚠️ IT TOOK `source`'S PLACE RATHER THAN BECOMING A FOURTH CELL. At 375 px
       * a fourth cell scrolled and cut the codec in half (see the viewer count
       * below), and the codec is now MEASURED into the readout's `codec` cell
       * instead of typed here.
       */
````

<a id="webrtc-7"></a>
## webrtc-7: demo/webrtc/index.html, inline script, line 133

````js
      // ⚠️ `network ping` AND NOT `network round trip`, MEASURED: at 375 px the
      // longer label ran the value row 25 px past its box (284 against 259) and
      // cut the unit off the number. `ping` is the everyday word for exactly
      // this quantity, and `network` is what stops it reading as the picture's
      // own delay.
      // 🔴 AND `ping` ALONE SINCE 2026-09-30, MEASURED AGAIN FOR THE SAME REASON.
      // The route cell beside it made the row 303 px against 259 at 375 px, so
      // `direct` scrolled out of sight, which is the one word the cell exists to
      // show. Dropping `network` gives back 46 px and the row fits. The route
      // word now does the job `network` did: `ping 20 ms direct` cannot be read
      // as the picture's own delay.
````

<a id="webrtc-8"></a>
## webrtc-8: demo/webrtc/index.html, inline script, line 145

````js
      /**
       * 🔴 WHICH ROUTE THE MEDIA TOOK, BESIDE THE PING, SINCE 2026-09-30.
       * `direct` or `relay`, read off the selected candidate pair by
       * `readIcePath`. A ping through Cloudflare's TURN relay is not comparable
       * to a direct one, so the number is never shown without its route.
       * No label: the word is the value and says what it is.
       */
````

<a id="webrtc-9"></a>
## webrtc-9: demo/webrtc/index.html, inline script, line 155

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

<a id="webrtc-10"></a>
## webrtc-10: demo/webrtc/index.html, inline script, line 168

````js
  // A custom property, never `video.style.aspectRatio`. See `/llhls/`: an
  // inline style on the element beats the two stylesheet rules that let a panel
  // fill a screen. An SFU can change a sender's resolution mid-call and `resize`
  // is the only event that reports it, which is why this is not read once.
````

<a id="webrtc-11"></a>
## webrtc-11: demo/webrtc/index.html, inline script, line 188

````js
  /**
   * 🔴 RELAY SERVERS ARE ASKED FOR ON THE PRESS, NEVER ON LOAD. A visit opens
   * nothing. `fetchIceServers` never throws; with no relay it hands back STUN
   * alone and says why, and ICE still chooses its route either way, so a
   * network with working UDP keeps the direct path and costs no relay bytes.
   * `iceLoadAsks()` reads resource timing, so it counts every request the
   * browser made to the relay route before the first press rather than the
   * ones this page remembered to count, and must read 0.
   */
````

<a id="webrtc-12"></a>
## webrtc-12: demo/webrtc/index.html, inline script, line 205

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

<a id="webrtc-13"></a>
## webrtc-13: demo/webrtc/index.html, inline script, line 217

````js
  /**
   * Let it go. The socket is the reference count, so closing it is the whole of
   * it from this end and the publisher's own sweep stops the encoder about a
   * minute later. The peer connection is closed here as well, because unlike
   * the socket it costs Cloudflare delivered minutes for as long as it is up.
   */
````

<a id="webrtc-14"></a>
## webrtc-14: demo/webrtc/index.html, inline script, line 245

````js
  /* 🔴 RETIRED 2026-10-13, AND SO EVERY TIER IS THE LIGHT ONE. The test
     pattern's WHIP leg is gone: Stream deleted its input (whep-rig) and pub
     answers /watch, /status and /whip with 410. Before the retirement a press
     held the publisher, asked for relay servers, waited up to 90 s for the
     WHIP leg and then negotiated WHEP; now there is nothing to wait for, so a
     press says so at once and an ordinary or a deep harness run grades the
     page at rest. The body that ran it is in git at be7737d. A WebRTC check
     that still has a publisher behind it is /video/webrtc/ (WebRTC
     loopback, a camera through WHIP and back over WHEP). */
````

<a id="webrtc-15"></a>
## webrtc-15: demo/webrtc/index.html, inline script, line 263

````js
  /**
   * 🔴 `on` IS A MEASUREMENT AND IT IS LATCHED, THE SAME RULE AS `/llhls/`.
   * The control says whether the STREAM is on. A visitor who pauses with the
   * element's own controls is still holding the socket and still costing
   * delivered minutes, so a toggle that read `starting` again there would be
   * describing the player while claiming to describe the source.
   * ⚠️ AND ON THIS PAGE THE LATCH IS `framePresented`, WHICH ALREADY EXISTS AND
   * ALREADY CARRIES THE ARGUMENT: this is the page where `26 fps inbound` sat
   * beside a black rectangle, so `a track arrived` is not `the stream is on`.
   */
````

<a id="webrtc-16"></a>
## webrtc-16: demo/webrtc/index.html, inline script, line 284

````js
  /**
   * What the readout and the footer's round trip were last written with, as
   * numbers, so the check grades the reading rather than the cell's text.
   * `jb` is the previous jitter buffer pair, for the one-second delta.
   */
````

<a id="webrtc-17"></a>
## webrtc-17: demo/webrtc/index.html, inline script, line 315

````js
        // ⚠️ `framesPerSecond` IS NOT WHAT THE FOOTER SHOWS, AND THAT IS
        // DELIBERATE SINCE 2026-09-29. This is the DECODER's rate, and this page
        // is the one that measured 26 fps of it over a black rectangle. The
        // footer counts frames the compositor actually presented, through
        // `requestVideoFrameCallback`. The decoder's own numbers stay here,
        // where the assert reads them as its detail.
        // Keep these: "videoWidth is 0" alone cannot tell apart "no video RTP
        // arrived at all" from "packets arrived and the decoder produced
        // nothing" from "frames decoded but never presented". They are three
        // different bugs and the assert used to report all three the same way.
````

<a id="webrtc-18"></a>
## webrtc-18: demo/webrtc/index.html, inline script, line 383

````js
  /**
   * Did the element EVER present a frame? Latched, not sampled.
   *
   * Two wrong versions preceded this one. Sampling videoWidth at check time
   * is a race — the assert failed three runs, then passed when two unrelated
   * lines were inserted ahead of it. Awaiting the frame INSIDE the check is
   * worse: the harness stops when asserts stop growing, so a 4 s await made it
   * tear down mid-check and four asserts silently vanished from the suite
   * (07 went 13 -> 9 while still reporting all green).
   *
   * A latch is both deterministic and synchronous: `resize` is the canonical
   * signal that videoWidth became known, and the 1 s stats interval already
   * running below is a second chance if it is missed.
   */
````

<a id="webrtc-19"></a>
## webrtc-19: demo/webrtc/index.html, inline script, line 410

````js
    /**
     * ⚠️ AND IT READS THE STATE THROUGH THE CALL, AND REQUIRES A STRING, WHICH
     * IS WHAT MAKES IT ABLE TO FAIL. `stream.state` without the parentheses is
     * a function, and a function is never `'offline'`, so a check written that
     * way would pass whatever the badge said. This one goes red on exactly the
     * bug that shipped for one run of this page.
     */
````

<a id="webrtc-20"></a>
## webrtc-20: demo/webrtc/index.html, inline script, line 422

````js
    /**
     * The ask itself, graded: one button in the row, it is the toggle, and
     * nothing in it is a primary. Same check as `/llhls/`, because it is the
     * same ask.
     */
````

<a id="webrtc-21"></a>
## webrtc-21: demo/webrtc/index.html, inline script, line 431

````js
    /**
     * 🔴 *"fix w so it did not ump horztally"*, MEASURED. Every cell is written
     * at its widest and at its narrowest and the ROW is measured both times,
     * because the defect is a cell shoving the one after it rather than a cell
     * resizing. Without the `reserve` on each field this goes red. Synchronous,
     * with the real readings back before this function yields, so nothing is
     * painted in between and a person watching the page sees none of it.
     */
````

<a id="webrtc-22"></a>
## webrtc-22: demo/webrtc/index.html, inline script, line 443

````js
      /**
       * 🔴 THE ROW IS HIDDEN BEFORE A PRESS SINCE 2026-09-29, AND THIS CHECK
       * HAD TO STOP RELYING ON IT BEING THERE. It used to empty `size` and
       * `fps` and leave `source`, which held the row open. `source` was written
       * when a picture arrives now, so on a run with no press every cell is
       * empty, the kit hides the row, and both measurements would have read
       * **0 px** and the comparison would have passed having measured nothing.
       * That is this project's worst shape and it would have been green.
       * ✅ So the check writes one cell ITSELF in both states (`rtt` since
       * 2026-09-30, when it took `source`'s place), and `narrow > 0`
       * is a term of the assert rather than an assumption underneath it.
       */
````

<a id="webrtc-23"></a>
## webrtc-23: demo/webrtc/index.html, inline script, line 463

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

<a id="webrtc-24"></a>
## webrtc-24: demo/webrtc/index.html, inline script, line 511

````js
      /**
       * 🔴 EVERY STATS CELL IS GRADED AS WRITTEN, WITH A VALUE IT COULD REALLY
       * HOLD. A cell that is declared and never written is an empty box that
       * reads as a stat, which is exactly what `/moq/`'s `p95` was found to be
       * on the day these were asked for. Each check reads BOTH the number this
       * page computed and the cell's rendered text, so a reading that never
       * reached the screen goes red as well as one that was never taken.
       * ⚠️ THE RANGES ARE PLAUSIBILITY, NOT TARGETS: a jitter buffer over 2 s
       * or a round trip over 2 s on a connected call means the arithmetic is
       * wrong (seconds read as ms, a cumulative sum read as a mean), not that
       * the network is slow.
       */
````

<a id="webrtc-25"></a>
## webrtc-25: demo/webrtc/index.html, inline script, line 547

````js
      /**
       * 🔴 THE RELAY WAS ASKED FOR ON THE PRESS AND HANDED TO THE CONNECTION.
       * Three facts, because each has a different failure: asked on load (a
       * visit opened something), never asked (the press forgot), and asked but
       * not passed on (the connection was built without it). The last is read
       * off `getConfiguration()`, which is what the connection really holds.
       */
````

<a id="webrtc-26"></a>
## webrtc-26: demo/webrtc/index.html, inline script, line 577

````js
  /**
   * 🔴 HOW IT WORKS, INCLUDING HOW IT STOPS, WHICH IS THE OTHER HALF OF *"same
   * treatment"*. The mechanism that stops it is the one `/llhls/` draws, because
   * both legs live on one container behind one Durable Object. What differs is
   * the leg, and the differences are the reason this page exists: WHIP up,
   * WHEP down, Opus rather than AAC, no recording on the far side, and a stale
   * publisher held against a new session for about 45 s.
   */
````

<a id="webrtc-27"></a>
## webrtc-27: demo/webrtc/index.html, inline script, line 620

````js
      // Same socket, same label as `/llhls/`, both read off
      // `workers/pub/worker.mjs`. What differs here is the leg: the first
      // socket in makes the Pub object POST the container's `/start-whip` as
      // well as `/start`, because one count holds both.
````
