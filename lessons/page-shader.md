# Page comments: shader

The full comments cut from the code under demo/ for shader, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="shader-1"></a>
## shader-1: demo/shader/landscape/index.html, inline script, line 34

````js
  // concepts shader/020, GRAIN LANDSCAPE, 2026-10-13. Asked (BACKLOG): *"copy
  // the visualization from videoradio and add it to shaders concept. add all
  // parameters that adjust its visualization as knobs + add patchbay"*.
  //
  // THE PICTURE IS /videoradio/'s, NOT A COPY OF IT. Both pages import
  // `/shell/scan-field.mjs`; that page builds it baked (its look's numbers
  // typed into the body), this one live, with every one of those numbers read
  // from a uniform array the knobs write. At the knobs' opening values the
  // two bodies draw the same `quartz` look.
  //
  // Not 010: shader/010 moved to remote/050 the same day and its old address
  // 404s on purpose (no forwarding), so a different page there would answer
  // an old link to the Pi shader with something else. 020 is the next free.
  //
  // THE GRAINS ARE REAL. Play brings up the grain ring of
  // /granulator/grains/ (`../../sampler/grain-ring.mjs`'s program, compiled
  // in this tab, on the tab's scsynth) on our own Raadio 2 recording from R2,
  // on its `Cloud` patch. Every grain the engine reports leaves
  // `web:grains:value-out` as one event and lands in the picture's 64
  // buckets: across is how long ago the audio under it came in (newest on the
  // right, over the ring's eight seconds), up is the grain's length on the
  // 2 ms to 4 s lane /videoradio/ uses. The six audio followers that light it
  // read the granulator's own output, on `web:grains:audio-out` into the
  // shader's audio inlet.
  //
  // ⚠️ THE ENGINE BOOT IS 060's, written again here in its smallest form (no
  // knobs on the grains, one patch). Lifting 060's `engine` object into
  // grain-ring.mjs would let both import it; that touches 060 and is left for
  // the session to decide.
  //
  // NOTHING OPENS ON A VISIT: no audio context, no fetch, no engine. The
  // picture draws its standby field (scanlines over the slow drift) from the
  // first frame, which is what /videoradio/ does before Play too.
````

<a id="shader-2"></a>
## shader-2: demo/shader/landscape/index.html, inline script, line 75

````js
  // ── the knobs: six, the rest fixed at the look's own ───────────────────
  // Asked 2026-10-13: *"What about lanacape params simplofication?"*, then
  // *"Cut more"*, then *"3-4 too little. I want it to be ready for
  // granulator"*. So the row is the few numbers that change the picture most
  // and most differently, weighted to the ones the sound already moves,
  // because the granulator's values are going to drive them next. Each is a
  // node with a value-out (a turn, into the shader) and a value-in (where a
  // granulator wire can land: it turns the dial and the picture, sends
  // nothing back). Every other number holds `quartz`'s own value (FIXED), so
  // at the opening values this is /videoradio/'s picture, number for number.
  //
  // 🔴 CHOSEN BY MEASUREMENT, 2026-10-13, on the real GPU (ANGLE Metal, M2
  // Pro), 960x540. The data texture this page feeds the chain was RECORDED,
  // 300 frames standby and 300 playing our Raadio 2 recording through the
  // granulator, and REPLAYED byte for byte into a fresh chain per setting
  // (the same setting twice read 0.000), each knob alone at its min and its
  // max. Three numbers per setting, worst of min and max, against the
  // opening picture, read at frames 200, 250 and 300:
  //   pixel  mean |change| of 0..255, and the share moved by more than 8
  //   block  mean |luminance change| over 32 px blocks, which is what the
  //          eye sees at a glance. A thin line moved by one width moves
  //          every one of its pixels, so the pixel number saturates near 20
  //          for any knob that shifts geometry at all and cannot rank them;
  //          the block number can.
  //   alike  the correlation of two knobs' block changes (centred), to keep
  //          two that do the same thing from both getting a knob.
  // Block, standby / playing, highest first (the full table is in the
  // report to the session, 2026-10-13):
  //   halo 40.5/29.2  rows 26.3/18.7  valley 14.5/19.3  gamma 17.8/13.0
  //   gain 16.3/11.3  amp 14.6/8.8  height 12.5/13.7  floor 13.6/9.0
  //   depth 12.8/12.2  lines 11.9/7.1  loud 0/10.1  travel 9.0/10.4
  //   spacing 9.4/7.6  edges 8.7/5.4  horizon 6.5/7.5  white 6.6/4.8
  //   swell 5.5/3.4  idle 4.5/2.8  heave 3.4/1.3  tunnel 3.3/0.9
  //   counts 0/3.3  near 3.1/3.3  waves 2.9/1.4  wide 2.6/2.7  blue 2.1/1.6
  //   sway 0.7/1.3  stretch 0/1.1  breath 1.1/0.6  bass 0/0.9
  // What the six are, and why each and not its neighbour:
  //   rows    the strongest that changes the STRUCTURE. halo, gain, gamma
  //           and lines correlate 0.91 to 0.98 with it: all of them mostly
  //           make the same lines brighter, so one knob stands for the five.
  //   height  the master on every sound-driven height (`ampM` multiplies
  //           amp, loud and bass). valley, floor, depth and amp correlate
  //           0.80 to 0.89 with it: one knob for the terrain's relief.
  //   loud    the strongest of the ones the SOUND drives: 0 standby, 10.1
  //           playing. How far the level follower lifts the ridges. bass
  //           correlates 0.69 with it and moves a tenth as much.
  //   swell   the wave walking through the rows; alike nothing above 0.61,
  //           and in standby it doubles the picture's motion (1.3 to 3.2).
  //   counts  how much the grain events themselves make the height: 0
  //           standby, 3.3 playing, and alike nothing above 0.24. The one
  //           knob that is about the granulator's own events.
  //   heave   the terrain breathing on the grain clock (`pulse`, advanced by
  //           the grains reported): the largest gain in playing motion of the
  //           sound-driven ones (block motion 3.6 to 5.6), alike nothing
  //           above 0.46.
  // Left at the look's value although they measure: halo (open 0, which is
  // the look; at 1 it is the rows/gain family again), travel (0 is why
  // quartz holds still, see LOOKS), stretch, sway, breath, bass (each under
  // 1.3 by block, playing). The six removed on 2026-10-12 (echo, glow,
  // fade, occlude, facet, mirror) measured under 1.3 of 255 by pixel then.
  // ⚠️ mirror is now the look's own 0, not held at 1: with horizon fixed at
  // 1.0 the fold is off by construction, so both draw the same bytes.
````

<a id="shader-3"></a>
## shader-3: demo/shader/landscape/index.html, inline script, line 170

````js
    // `granulator` on screen and in its ids (asked 2026-10-13: *"no grains mentions"*).
````

<a id="shader-4"></a>
## shader-4: demo/shader/landscape/index.html, inline script, line 308

````js
    // The invisible hand on every knob (asked 2026-10-13, *"andd inivisible hand for knobs"*).
````

<a id="shader-5"></a>
## shader-5: demo/shader/landscape/index.html, inline script, line 404

````js
  // ── the patchbay ────────────────────────────────────────────────────────
  // The file wire is lit while the recording comes down, the audio wires
  // while it plays, the video wire while the shader draws; value wires pulse
  // once per event, a grain or a turn.
````

<a id="shader-6"></a>
## shader-6: demo/shader/mirror/index.html, style, line 12

````css
  /* The picture at half the content width (asked 2026-10-12, *"1/2
     videpanel"*), the whole width on a phone. The program sits under the
     knob, not beside the picture (*"shader code box is below parameters"*). */
````

<a id="shader-7"></a>
## shader-7: demo/shader/mirror/index.html, inline script, line 33

````js
  // /mirror/'s kaleidoscope, running in this tab, with one parameter left.
  // Asked 2026-10-12: *"use same shader you have in mirror demo, just less
  // parameters"*. The knob is a node of its own, `web:knob-segments`, cabled
  // into `web:shader:value-in`, and the shader reads `uSegments` only off that
  // link, so a turn is a value crossing a wire. The shader makes its own
  // picture, so nothing feeds its video side and there is no source node.
  //
  // THE TEXT IS /mirror/'s `FS_BODY`, TOKEN FOR TOKEN, with three changes:
  // - `uSeg` is `uSegments` (asked 2026-10-12, *"uSeg -> uSegments, Mirros
  //   param -> Segments"*); v3dpipe sets both names from its `seg`;
  // - /mirror/'s own lines, with one long line broken in two and the uniform
  //   line split (whitespace only);
  // - `uFb`, `uScale`, `uWarp` and `uHue` are `const` at /mirror/'s own
  //   values (0.78 and 0.08 are what its `paint()` hard-codes, 4 and 1 are
  //   the `mid` and `full` its GRAIN and HUE controls open on).
  // `uT` is a frame counter over 30, as /mirror/ and the C drive it, and the
  // feedback tap reads the previous frame through the same two-target
  // ping-pong. /mirror/'s look crossfade and headset copy are not here.
  //
  // ⚠️ `uSegments` IS THE NUMBER OF WEDGES THE ANGLE IS FOLDED INTO, which
  // /mirror/'s control calls `mirrors` and offers as 2, 8 and 24 (8 is its
  // default). The knob gives it 1 to 32 directly. At 1 the fold is a single
  // mirror down the horizontal; every N is N-fold symmetric.
  //
  // NOTHING OPENS ON A VISIT: no camera, no fetch, no room.
````

<a id="shader-8"></a>
## shader-8: demo/shader/mirror/index.html, inline script, line 110

````js
  // The footer says what draws the picture and how fast, as /mirror/'s does.
  // Asked 2026-10-12: *"mirror shader - repalce with what renders it and fps"*.
  // The knob already shows the mirror count.
````

<a id="shader-9"></a>
## shader-9: demo/shader/mirror/index.html, inline script, line 130

````js
  // ── the code box: the program itself, compiled once the typing stops ────
  // Asked 2026-10-12: *"can we make shader be in compiling codebox and be
  // editable?"*. The kit's idle compile, as /fau/ and /code/faust/
  // use it: `IDLE_MS` after the last keystroke, never two at once, `Compiling`
  // breathing in the box's corner and `Did not compile` left standing with
  // the GL's log in its `title` (and in the log below) while the last good
  // program keeps drawing.
````

<a id="shader-10"></a>
## shader-10: demo/shader/mirror/index.html, inline script, line 140

````js
  // ⚠️ A PROGRAM WITH NO `uSegments` COMPILES AND RUNS, AND THE KNOB THEN DRIVES
  // NOTHING. The kit's note has no state for "compiled, with a caveat", so the
  // page writes that one line into it once the compile has settled, and the
  // next compile paints over it as usual (a kit candidate, see the report).
````

<a id="shader-11"></a>
## shader-11: demo/shader/remote/index.html, inline script, line 37

````js
  // /shader/mirror/ plus the Raspberry Pi drawing the same shader.
  // Asked 2026-10-12 (BACKLOG, "shader/010"): *"can you do mirror shader
  // concept with pi, next after 000? does it need pi udpates? I assume so
  // (compiling?). when needed simulate and add to backlog the pi part"*.
  //
  // 🔴 THE PI SIDE IS SIMULATED IN THIS TAB AND THE PAGE SAYS SO, on the Pi
  // node's label and in the right panel's footer. `createPiSide` below is the
  // one place the real board goes in (BACKLOG, "shader/010 on the real Pi").
  //
  // ⚠️ THE BOARD NEEDS NO NEW MESSAGE FOR THIS PAGE. Both things this page
  // sends already exist, read 2026-10-12 in `rig/board/board.mjs` and
  // `rig/board/video.mjs`, and /mirror/ already sends both:
  //   `{ type: 'video.params', mirrors }`   clamped 2 to 64 by the board's MAP
  //       and again by v3dpipe's `seg` verb; answered `video.params` with
  //       `{ ok, paramsSent, mirrors, grain, hue }`.
  //   `{ type: 'video.shader', body }`      the program WITHOUT its `#version`
  //       line (the board refuses one that has it, and anything over 12,000
  //       characters); v3dpipe puts `#version 310 es` on it, compiles it at its
  //       next frame, keeps the running picture if it will not build, and
  //       crossfades a good one in over 900 ms. Answered `video.shader.applied`
  //       with `{ ok, bytes, detail }` or `{ ok: false, reason }`, the reason
  //       being the renderer's own `SHADER-REFUSED` line cut to 160 characters.
  // What the real board needs is to be reachable, `video.start`, and the H.264
  // coming back decoded, as /mirror/ does it.
  //
  // THE READOUT, every cell measured here:
  //   local fps / Pi fps    frames that reached each panel in the last second.
  //   local lag / Pi lag    from a knob turn, or the start of an edit's compile,
  //                         to the first frame on that panel that carries it.
  //                         On the Pi side that is the MODEL below, measured.
  //
  // NOTHING OPENS ON A VISIT: no camera, no fetch, no room.
````

<a id="shader-12"></a>
## shader-12: demo/shader/remote/index.html, inline script, line 72

````js
    // `network` and `path` came 2026-10-13 with the direct option, the two
    // cells remote/010 shows for its link (an even count, as the shell asks).
````

<a id="shader-13"></a>
## shader-13: demo/shader/remote/index.html, inline script, line 80

````js
  // RELAY OR DIRECT, asked 2026-10-13: *"add direct option to all remote
  // instruments."* The same choice, cell and fall back as remote/010 and 030
  // (`/remote/path.mjs`): the relay unless `?path=direct`. Direct is a
  // WebRTC link to the board's main socket, offered once the board answers;
  // the knob and the program then leave on its `ctl` channel, and the PICTURE
  // comes on a third channel `vid`, ordered and reliable, as remote/010's
  // camera does on `cam` (a decoder fed a frame with a hole is broken to the
  // next keyframe, so not `pcm`, which never retransmits, and not `ctl`, which
  // is unordered). The board cuts each frame into 16 KB pieces
  // (rig/board/board.mjs `video.direct`, camera.mjs `framePieces`). The relay
  // room stays open for the board's own messages and is where the picture
  // falls back to when the link drops or no channel opens in 3 s.
````

<a id="shader-14"></a>
## shader-14: demo/shader/remote/index.html, inline script, line 147

````js
  // ── the Pi side: THE ONE PLACE THE REAL BOARD GOES IN ────────────────────
  //
  // The page talks to the Pi through `send(msg, at)` with the board's own
  // message shapes (see the header), `onReply(msg)` for what the board
  // answers, and `view` (the canvas the Pi's picture is drawn on). `at` is
  // when the change was made here, which only the simulation can carry to the
  // frame that shows it; on the real board the `Pi lag` cell needs a frame
  // number or a burned clock in the picture to stay a measurement.
  //
  // Today it is v3dpipe's loop run in a second WebGL2 context in this tab:
  //   picture   1280x720 at 30 frames a second, which is what /mirror/ asks
  //             `video.start` for; `uT` is the frame count over 30; the two
  //             feedback targets wrap MIRRORED_REPEAT as v3dpipe's `mktarget`
  //             does (the browser side clamps, as /mirror/ does); every uniform
  //             is set by name only where the program has it (`uSegments`
  //             and the old `uSeg` both from `seg`), as `draw_pass`
  //             does, at v3dpipe's defaults (seg 8, fb 0.78, scale 4, warp
  //             0.08, hue 1); it boots on v3dpipe's own `FS_KAL`.
  //   a shader  compiled at the Pi's next frame as `#version 300 es` (the
  //             board says 310 es, which a browser cannot compile), kept out
  //             if it fails, crossfaded in over 900 ms with constant alpha
  //             blending if it builds, exactly v3dpipe's arithmetic.
  //   the trip  UP_MS to the board, for a knob turn and for a program: half
  //             the Mac to Pi relay round trip, 64 to 69 ms measured 2026-09-14
  //             (PROGRESS.md, as /remote/collide/ uses it).
  //   back      DOWN_MS on the picture: one frame to render and read back,
  //             one frame in the hardware encoder, the relay back (UP_MS) and
  //             one frame to decode. ⚠️ ONLY THE RELAY IS MEASURED; the three
  //             frames are an assumption, about 134 ms in all. No compression
  //             is modelled.
  //   upside down  v3dpipe hands `glReadPixels` rows (bottom row first) to
  //             ffmpeg as raw video, and nothing between there and /mirror/'s
  //             `drawImage` flips them, so the Pi's picture arrives upside down.
  //             READ FROM THE CODE, NOT SEEN: this kaleidoscope is symmetric
  //             top to bottom, so nobody could have. The simulation flips it.
````

<a id="shader-15"></a>
## shader-15: demo/shader/remote/index.html, inline script, line 264

````js
// v3dpipe sets both since 2026-10-12
````

<a id="shader-16"></a>
## shader-16: demo/shader/remote/index.html, inline script, line 352

````js
  // ── the real board, when one answers ─────────────────────────────────────
  //
  // Since 2026-10-12. A press of the board button asks the Pi in `studio-1`
  // for `video.status` and gives it ASK_MS to answer, as /remote/collide/
  // does; no answer, a harness run (`createBoard` will not drive the board
  // under a check) or a browser with no WebCodecs keeps the simulation, and the
  // right panel's footer says which. A board that answers but is not drawing
  // is asked for `video.start`, and only a picture this page started is
  // stopped when it leaves. The picture comes back through
  // `demo/shell/board-video.mjs`, the receiver /mirror/ uses.
  //
  // 🔴 PI LAG ON REAL FRAMES IS A CHANGE SEEN IN THE PICTURE, NOT A STAMP. The
  // board's frame counter rides on every frame, but nothing says at which frame
  // a knob turn or a shader landed, and there is no burned clock. So each
  // decoded frame is shrunk to 64 x 36 and compared with the one before; the
  // lag is from the change here to the first frame whose difference stands
  // clear of the picture's own motion (three times the median of the last
  // calm frames, and half again over their largest). A segment count change
  // is a jump and lands on its first frame; a shader fades in over 900 ms on
  // the Pi, so its lag is to the first frame where the fade shows.
  //
  // 🔴 THE PROGRAM WAITS FOR THE PI'S FIRST FRAME (2026-10-12, found on the real
  // Pi). `video.started` answers as soon as v3dpipe is spawned, while it is
  // still bringing up EGL and compiling its own program, and it reads its stdin
  // only inside the render loop. A `video.shader` sent then sat in the pipe past
  // the 1500 ms the board waits for the renderer's verdict
  // (`rig/board/video.mjs`), so the board answered "the renderer did not
  // answer". A decoded frame is proof the loop is running, because v3dpipe
  // writes pixels only from inside it, so the page holds the program (and any
  // edit made meanwhile, the newest kept) until the first frame is decoded here.
  // Not a retry on that refusal: the refused line is still queued in the pipe
  // and is compiled once the loop starts, so a retry would compile it twice and
  // the board would hand the first one's verdict to the second waiter. The knob
  // is not held: `video.params` has no timer and lands on the first frame.
````

<a id="shader-17"></a>
## shader-17: demo/shader/remote/index.html, inline script, line 441

````js
    // ── the picture on the direct link ──────────────────────────────────
    // `picPath` is where the frames come from: `relay` (the video room) or
    // `direct` (the `vid` channel). Pieces of one frame are joined back into
    // the board's frame format and fed to the same decoder.
````

<a id="shader-18"></a>
## shader-18: demo/shader/remote/index.html, inline script, line 670

````js
  // ⚠️ `performance.now()`, NOT THE ANIMATION FRAME'S TIMESTAMP, which is the
  // frame's start and so earlier than a knob turn handled during it: the first
  // run read -43 ms.
````

<a id="shader-19"></a>
## shader-19: demo/shader/remote/index.html, inline script, line 738

````js
  // The Pi's node is the one the board announces (graph-registry.mjs `boardGraph`):
  // `pi-1:shader`, v3dpipe rendering the mirror shader on the Pi's GPU, its
  // picture on the relay's H.264 room or the `vid` data channel on the direct
  // link. Simulated in this tab until a real board answers (`showMode`).
  // ⚠️ THE NODE IS ADDED BEFORE `screen-pi` AND ITS PORTS AFTER, as they always
  // were, so the picture's order does not move.
````

<a id="shader-20"></a>
## shader-20: demo/shader/remote/index.html, inline script, line 751

````js
      // ⚠️ `mirrors` IS THE BOARD'S WIRE NAME AND STAYS: the page calls it
      // segments, `video.params` has always said `mirrors` (it takes `segments`
      // too since 2026-10-14), and /mirror/ sends it.
````

<a id="shader-21"></a>
## shader-21: demo/shader/remote/index.html, inline script, line 823

````js
  // ── the code box: one node, every compile goes to both shaders ───────────
  // The kit's idle compile, as on 000. The text leaves on `web:code:program-out`
  // and both shader nodes compile it for themselves: a program this tab
  // refuses is refused on the Pi too, and each side keeps its last good one.
````

<a id="shader-22"></a>
## shader-22: demo/shader/remote/index.html, inline script, line 869

````js
  // ── the path: the wire each Pi link rides, the two cells, the fall back ──
  // The knob and the program ride `datachannel` while the link is direct; the
  // picture rides `datachannel` only while its own frames come on `vid`, else
  // the relay's H.264 room. The `path` cell names the picture's path when it
  // differs from the link's (`direct, picture relay`), as remote/010 does for
  // its camera.
````
