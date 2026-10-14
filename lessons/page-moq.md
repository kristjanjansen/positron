# Page comments: moq

The full comments cut from the code under demo/ for moq, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="moq-1"></a>
## moq-1: demo/moq/index.html, HTML comment, line 9

````html
<!-- 🔴 NO PAGE STYLESHEET SINCE 2026-09-30, the same as `/llhls/` and
     `/webrtc/`. The picture is a video panel, whose stage owns the canvas's
     width, height, shape and fit, and the `relay:` pill that sat beside the
     title was replaced by the stream toggle in the control row. -->
````

<a id="moq-2"></a>
## moq-2: demo/moq/index.html, inline script, line 28

````js
  // ?codec=vp8 pins the publisher. The MoQ numbers already recorded in HANDOFF
  // (p50 20 ms, 4K30 at zero drops) were taken on VP8, and the publisher now
  // probes for AV1 first, so without a way to ask for the old one those
  // numbers could never be reproduced.
````

<a id="moq-3"></a>
## moq-3: demo/moq/index.html, inline script, line 44

````js
    // 🔴 ONE SENTENCE, AND IT IS THE INDEX'S OWN LINE. Asked 2026-09-29 as
    // *"same ui treatment"* as `/llhls/` and `/webrtc/`, whose descriptions went
    // to one sentence the same day. How the frames travel is the picture at the
    // foot of this page, and what each number means is its readout key.
````

<a id="moq-4"></a>
## moq-4: demo/moq/index.html, inline script, line 49

````js
    /**
     * 🔴 SIX CELLS, AND EVERY ONE IS SOMETHING THIS PAGE ALREADY MEASURES.
     * Asked 2026-09-30: *"add some stats to webrtc and moq demo"*, against
     * `/llhls/`'s six. Its HLS words (holes, switches, advance) mean nothing
     * here, so these are what `demo/shell/moq.mjs` counts:
     *   p95, worst   the burned clock read back off each decoded frame, in
     *                loopback where both ends share one clock (`leg.pct`)
     *   setup        WebTransport plus the MoQT handshake, `st.sessionMs`
     *   first frame  press to the first decoded frame, `st.firstFrameMs`
     *   frames       frames decoded, `st.decoded`
     *   unreadable   decoded frames whose burned clock failed its checksum,
     *                `st.badRows`, which is what says the latency is honest
     * ⚠️ THE MEDIAN IS NOT HERE, IT IS UNDER THE PICTURE, labelled glass to
     * glass, because it was asked for there and one fact in two places is the
     * same fact twice. `fps` went to the footer for the same reason on the
     * other two pages.
     * ⚠️ `p95` WAS DECLARED AND NEVER SHOWN (BACKLOG 2026-09-30). The line
     * setting it was there; the checks ran before a frame had arrived, so no
     * run ever reached a second tick with samples in it.
     */
````

<a id="moq-5"></a>
## moq-5: demo/moq/index.html, inline script, line 74

````js
  /**
   * 🔴 THE SAME CONTROL AND THE SAME THREE WORDS AS `/llhls/` AND `/webrtc/`,
   * OUT OF THE SAME MAP IN `presence.mjs`. A third caller, not a new component.
   * ⚠️ WHAT `starting` WAITS FOR IS DIFFERENT HERE AND WAS READ, NOT COPIED.
   * There is no container and no socket reference count behind this page: the
   * publisher is this browser, so `starting` is a WebTransport session, a codec
   * probe and the first frame back, about two seconds rather than thirty.
   */
````

<a id="moq-6"></a>
## moq-6: demo/moq/index.html, inline script, line 92

````js
  /**
   * 🔴 THE LATENCY UNDER THE PICTURE SAYS WHICH KIND IT IS. Asked 2026-09-30
   * with the rule from `positron-streaming` beside it: a `candidate-pair` round
   * trip is not media latency, and quoting WHEP's 25 ms beside MoQ's
   * glass-to-glass once flattered WHEP about three times. This one is the clock
   * burned into a frame, read back after an encode, the relay, a decode and a
   * draw, so its label is the name of that measurement.
   */
````

<a id="moq-7"></a>
## moq-7: demo/moq/index.html, inline script, line 104

````js
    /**
     * ⚠️ NO `size` CELL, UNLIKE `/llhls/` AND `/webrtc/`, AND THE REASON IS
     * MEASURED. In loopback the size is this page's own publisher, 1280x720 by
     * construction, so it is a cell that cannot change. And at 375 px the row
     * with it did not fit beside the fullscreen square: `glass to glass 49`
     * showed and its `ms` had scrolled out of the row, which cut the one number
     * this footer exists to carry. A remote publisher of another size is logged by `moq.mjs`.
     */
````

<a id="moq-8"></a>
## moq-8: demo/moq/index.html, inline script, line 126

````js
  /**
   * 🔴 THE PICTURE IS ffmpeg's `testsrc2` UNDER THE BURNED CLOCK, THE SAME AS
   * THE CONTAINER LEGS. Asked 2026-09-30: *"try to generate 1:1 same graphics
   * + timecode bar as in container ffmpeg examples"*. `testsrc2.mjs` is a port
   * of the C function and was measured pixel for pixel against ffmpeg's own
   * render. `burn()` then draws the row, the two clocks and the square over it
   * with `field: false`, and its bed is opaque black, so nothing underneath
   * can reach what `readBurned` decodes. `scrim: true` puts the container's
   * `black@0.55` box behind every label and number, so the words read over the
   * bars the way they do on the stream.
   * ⚠️ `painted` COUNTS CALLS SO A PUBLISHER THAT IGNORED THIS CANNOT PASS AS
   * ONE THAT USED IT. `startMoq` only draws with it where it takes a `paint`
   * option, and the assert below reads this count and the pixels that came back.
   */
````

<a id="moq-9"></a>
## moq-9: demo/moq/index.html, inline script, line 154

````js
  /**
   * 🔴 HOW IT STOPS IS THE PAGE LETTING GO, AND NOTHING ELSE IS HOLDING IT.
   * No container, no alarm sweep: the publisher is this tab, so closing the
   * session stops the frames at once, and the relay forgets a broadcast
   * nobody is publishing.
   */
````

<a id="moq-10"></a>
## moq-10: demo/moq/index.html, inline script, line 171

````js
  /* 🔴 TWO TIERS, asked 2026-10-04: *"make checks way ligher (2 tiers?)"*,
     *"i mean these long-running ones"*. The press opens a WebTransport session
     to Cloudflare's relay and waits for frames to come back through it, up to
     fifteen seconds. An ORDINARY harness run (`selfcheck=1`) opens nothing and
     grades the page at rest, plus the WebTransport capability, which is local;
     `DEMO_DEEP=1 node demo/verify.mjs moq` runs the round trip. A visitor is
     never `LIGHT`, so their press is unchanged. */
````

<a id="moq-11"></a>
## moq-11: demo/moq/index.html, inline script, line 237

````js
    /**
     * 🔴 THE CHECKS WAIT FOR FRAMES, BECAUSE `startMoq` RETURNS BEFORE ANY.
     * It hands back the leg once the decoder is configured, and the first
     * frame is a relay round trip later. MEASURED 2026-09-30 before this
     * change: the checks ran at that instant and read `0 frame(s)`, `0
     * decoded` and `0 clean row(s)`, 15/18, on a page whose picture was
     * arriving. Two seconds of clean rows is 60 samples at 30 fps, which is
     * enough for a p95 to mean something.
     */
````

<a id="moq-12"></a>
## moq-12: demo/moq/index.html, inline script, line 256

````js
  /**
   * Is the picture that came back testsrc2? Six bar centres at y 100, above
   * the clock hands and the checker and below the sweeping square, against
   * the bar colours. Five of six, because the gradient line and the bouncing
   * square can each cover one, and a wide tolerance because it has been
   * through an encoder.
   */
````

<a id="moq-13"></a>
## moq-13: demo/moq/index.html, inline script, line 332

````js
      /**
       * 🔴 THE CLOCK STILL DECODES UNDER A BUSY PICTURE, AND A RATE IS THE
       * CLAIM, NOT A SINGLE ROW. testsrc2 is saturated bars, a gradient line
       * that sweeps the whole height and noise, and an encoder spends its bits
       * where the picture is busy. One clean row would pass while most were
       * lost, so nine in ten decoded frames have to carry a clean clock.
       */
````

<a id="moq-14"></a>
## moq-14: demo/moq/index.html, inline script, line 359

````js
  /**
   * 🔴 HOW IT WORKS. Asked 2026-09-30 as *"and add diagram too"*. Everything
   * in it is read off `demo/shell/moq.mjs` and `positron-streaming`, not
   * remembered. It is one browser on both ends because the default role is
   * loopback, which is what makes the clock exact.
   */
````
