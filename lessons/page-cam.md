# Page comments: cam

The full comments cut from the code under demo/ for cam, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="cam-1"></a>
## cam-1: demo/cam/index.html, inline script, line 48

````js
    // 🔴 NO DECLARED CONTROL: the one control is a status button built below,
    // asked for 2026-09-30 as *"stat / stop camera: convert to oline status
    // button: CAMERA ON | CAMERA OFF"*. It is the /llhls/ control with the
    // camera's words, and it lives in the same row verify.mjs presses.
````

<a id="cam-2"></a>
## cam-2: demo/cam/index.html, inline script, line 60

````js
  /**
   * ⚠️ `data-busy` BY HAND, BECAUSE THIS IS NOT A DECLARED CONTROL. The shell
   * marks a declared one busy while its handler runs, and verify.mjs waits on
   * that mark before it reads the page; without it the harness would walk off
   * mid check. NOT disabled, unlike the shell's: a press while starting stops.
   */
````

<a id="cam-3"></a>
## cam-3: demo/cam/index.html, inline script, line 77

````js
  /**
   * 🔴 THE LL-HLS LEG IS RETIRED, 2026-10-13. The burned canvas was recorded
   * with MediaRecorder, sent over `wss://pub.positron.studio/cam` into a
   * container of the camera's own, rewrapped by ffmpeg to RTMPS on the input
   * positron-cam and played back through the tuned player /llhls/ used
   * (plans/plan-cam-llhls.md). That input is deleted and pub answers /cam with
   * 410, so the panel stays and its footer says the leg is retired, in every
   * tier and for a visitor alike. The code that ran it is in git at be7737d;
   * the same publish lives on in /video/llhls/ (LL-HLS loopback), on
   * that page's own input.
   */
````

<a id="cam-4"></a>
## cam-4: demo/cam/index.html, inline script, line 110

````js
  // What kind of latency each footer carries is the LABEL, so the four can be
  // compared without a legend: the local preview can only say capture to
  // screen, the three that went out and came back say glass to glass.
  // 🔴 A PANEL'S STATE IS A FOOTER CELL, NOT A CAPTION ON THE PICTURE. Asked
  // 2026-09-30: *"do not draw on screen but on videopanel footer (llhls
  // closed)"*. `state` is the LAST cell, with no reserve, so a line arriving
  // moves nothing to its left, and it changes only when something happened.
````

<a id="cam-5"></a>
## cam-5: demo/cam/index.html, inline script, line 156

````js
  /**
   * Glass to glass off the burned clock, per presented frame. Sender and
   * receiver are this one page, so one clock stamps the row and one clock reads
   * it, and the difference is exact rather than an estimate.
   * ⚠️ PRESENTED FRAMES, via `requestVideoFrameCallback`: a decoded frame nobody
   * was shown is not a frame the eye sees.
   */
````

<a id="cam-6"></a>
## cam-6: demo/cam/index.html, inline script, line 184

````js
  /**
   * Capture to screen on the local preview. `requestVideoFrameCallback` hands a
   * camera frame's `captureTime` and its `expectedDisplayTime`, both on the
   * `performance.now()` clock. A browser that does not report `captureTime`
   * leaves the cell empty, which is the honest answer.
   */
````

<a id="cam-7"></a>
## cam-7: demo/cam/index.html, inline script, line 229

````js
  /* 🔴 TWO TIERS, asked 2026-10-04: *"make checks way ligher (2 tiers?)"*,
     *"i mean these long-running ones"*. The camera, its preview and the frame
     that would leave the page are this machine's own and stay in an ORDINARY
     harness run (`selfcheck=1`). What leaves it does not: the relay servers,
     the UDP probe, the WHIP publish and WHEP play back through Stream, and the
     MoQ loopback through the relay, each waited on for thirty timed frames.
     `DEMO_DEEP=1 node demo/verify.mjs cam` runs those. A visitor is never
     `LIGHT`, so their press is unchanged. */
````

<a id="cam-8"></a>
## cam-8: demo/cam/index.html, inline script, line 335

````js
  /**
   * One frame of what leaves this page: the camera, contained and scrimmed,
   * with the clock row and the two clocks burned over it. The container's
   * `black@0.55` box sits behind every label and number (`scrim: true`), so
   * the words read over a bright room. WebRTC and MoQ both draw with this, so
   * the two legs carry the same picture and the same row.
   */
````

<a id="cam-9"></a>
## cam-9: demo/cam/index.html, inline script, line 375

````js
  /**
   * 🔴 THE HANDSHAKE IS HTTPS AND ANSWERS 201 ON A NETWORK THAT DROPS UDP, and
   * then not one packet of media arrives. MEASURED 2026-09-30 on a phone
   * hotspot: Stream answers with one UDP candidate and nothing else, so ICE
   * fails fifteen seconds later and the WHEP play meets a 409, because the
   * publish never went live. Said as `could not start` that reads as a broken
   * page; the cause is the network, and the page can prove it with one STUN
   * request, so it says so. With a relay from `/ice` this path should not be
   * reached at all, and if it is, it says the relay did not get through either.
   */
````

<a id="cam-10"></a>
## cam-10: demo/cam/index.html, inline script, line 573

````js
    // And the stop, because a camera page that leaves a leg open bills Stream
    // minutes for as long as it is open. ⚠️ `stop()` and not a click: this runs
    // inside the press that started it, and a click here would start a second
    // press inside the first.
````

<a id="cam-11"></a>
## cam-11: demo/cam/index.html, inline script, line 591

````js
  // ── how it works, one picture per panel ─────────────────────────────────
  // 🔴 FOUR PICTURES, IN THE PANELS' ORDER, EACH SHOWING ONLY ITS OWN PATH.
  // Asked 2026-09-30: *"make separate diagrams on each feed (4 total) in cam"*.
  // One standing `How it works` heading over the first, and each picture named
  // by its panel in the diagram's own small title. The first cannot be handed a
  // `title` beside `how` (refused, so two headings never stack), so its name is
  // written into the same element after it is built.
````
