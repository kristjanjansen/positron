# Page comments: collide

The full comments cut from the code under demo/ for collide, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="collide-1"></a>
## collide-1: demo/collide/presets.mjs, module, line 1

````js
// demo/collide/presets.mjs: the programs `/collide/` opens with.
//
// 🔴 IN THEIR OWN FILE SO THE NODE TEST COMPILES EXACTLY WHAT THE PAGE SHIPS.
// `demo/shell/sclang-lite-test.mjs` imports this list and compiles every entry;
// a copy of the text in the test would be a second set of presets that could
// drift from the page's and stay green while the page broke.
//
// ⚠️ THE COMMENTS ARE ON THEIR OWN LINE WITH A BLANK LINE AFTER, which is
// `/fau/`'s rule for the same kind of listing (*"add nl after comments"*): a
// comment says what the line under it does, and a blank line keeps the next
// statement from reading as part of it.
//
// ⚠️ EVERY ONE IS WRITTEN THE WAY SuperCollider's OWN HELP WRITES A SynthDef
// function, arguments first and `var` lines before anything else, because
// that is what somebody who knows the language will type and what they should
// be able to paste back into a real SuperCollider unchanged.
````

<a id="collide-2"></a>
## collide-2: demo/collide/index.html, inline script, line 13

````js
  /**
   * collide. A synth typed in SuperCollider, compiled in this tab, played by
   * SuperCollider's own server running in the tab.
   *
   * Asked 2026-09-30: *"can you do simple supercollider script browser compile
   * demo as in fau called collide? do we have moving pieces?"*. `/fau/` is the
   * model, and this page is laid out the way that one is so the two read as a
   * pair: type a program, it compiles when you stop typing, you play it from
   * the keys.
   *
   * ── WHAT IS ACTUALLY HAPPENING ───────────────────────────────────────────────
   *
   * 🔴 THE TEXT IS A SMALL SUBSET OF THE SuperCollider LANGUAGE, AND THE PAGE
   * SAYS SO IN ITS ONE SENTENCE. sclang, the real language, does not run in a
   * browser (`research/supercollider-browser-2026-09.md` §1.3), and running it
   * on the Raspberry Pi was refused because it would run a visitor's text on
   * the board, where sclang can shell out. So `demo/shell/sclang-lite.mjs`
   * reads the text and writes the bytes of a SynthDef in JavaScript, which is
   * what sclang would have handed the server. Anything it does not know is
   * refused with a line and a column, never guessed. Its header lists what it
   * takes and what it refuses.
   * ✅ THE SERVER IS THE REAL ONE. scsynth compiled to WebAssembly (SuperSonic,
   * vendored in `demo/shell/vendor/`, booted by `demo/shell/scsynth.mjs`, the
   * same engine `/grains/` and `/archive/radio/` run) takes the bytes with `/d_recv`
   * and plays a note per key with `/s_new`. So a wrong byte is heard or
   * refused by SuperCollider itself, and the checks below grade the engine's
   * answers rather than this page's opinion of its own output.
   *
   * ── WHEN THINGS HAPPEN ──────────────────────────────────────────────────────
   *
   * 🔴 THE COMPILE IS ON LOAD AND THE ENGINE IS ON THE FIRST TOUCH, WHICH IS
   * `/fau/`'s SHAPE (*"fau: compile on loading so i can play"*). The compile
   * here costs less than a millisecond and pulls nothing, so the box opens
   * with its program already compiled and its size in the readout. The engine
   * is a sound device (an AudioContext and an AudioWorklet) and 1.83 MB of
   * this site's own files, so it is built by the first gesture on the
   * instrument and not by a visit, as on every sound page here.
   * ⚠️ A KEY PRESSED WHILE THE ENGINE IS STILL BOOTING IS KEPT AND SOUNDED WHEN
   * IT IS UP, and a key let go inside that window is taken out again, which is
   * `/fau/`'s `waiting` map for the same reason.
   *
   * 🔴 A RECOMPILE DOES NOT CUT A HELD NOTE, SO THE IDLE COMPILE NEVER WAITS.
   * `/fau/` hands `compile-idle.mjs` a `notNow` because its recompile builds a
   * new worklet node and forgets every key. Here a compile is a new DEFINITION
   * sent under the one name `collide`: a synth already sounding keeps the graph
   * it was started with and still answers its own `gate`, and only the next key
   * uses the new one. So `notNow` is left at its default.
   * ✅ ONE NAME SINCE 2026-09-30, BECAUSE scsynth ALREADY DOES THE BOOKKEEPING.
   * This page used a new name per compile (`collide_1`, `collide_2`, ...) and
   * freed the old ones itself off `/n_end`, because replacing a definition
   * under a running synth had never been measured. READ in
   * `server/scsynth/SC_GraphDef.cpp` at commit 19954900: `GraphDef_Define`
   * takes the old definition out of the table and decrements its `mRefCount`,
   * every running synth holds one reference (`Graph_Ctor` increments it in
   * `SC_Graph.cpp`), and `Graph_Dtor` frees the definition when the last synth
   * on it ends. MEASURED on this engine the same day: a sine on `x` read
   * 0.0707 rms before and 0.0707 after a filtered saw was sent as `x`, still
   * answered `/n_set freq 880`, which the new program does not have, and a new
   * `/s_new x` ran the saw beside it (6 UGens, then 13 with both). So the
   * page's own copy of that reference counting went, and the checks below
   * grade the property on every run.
   *
   * ── A KEY, AND LETTING IT GO ────────────────────────────────────────────────
   *
   * A key sends `/s_new` with `freq` and, where the program declares one,
   * `gate 1`. What letting go does depends on what the compiler reported:
   *   a `gate` that an EnvGen reads and a `doneAction: 2`  ->  `/n_set gate 0`
   *   no gate, and a `doneAction: 2`                       ->  nothing, it ends
   *   no `doneAction: 2` anywhere                           ->  `/n_free`, a cut
   * The third is said in the log when it is compiled, because a cut is audible
   * and a visitor should know it is the program and not the page.
   *
   * ── THE KNOBS UNDER THE TEXT ────────────────────────────────────────────────
   *
   * 🔴 EVERY CONTROL THE PROGRAM DECLARES, EXCEPT THE ONES A KEY SETS, IS A
   * KNOB IN ONE ROW UNDER THE TEXT, AND THE SYNTAX IS SuperCollider's OWN.
   * Asked 2026-09-30 (*"variables in code ... that are under the code and
   * adjust parameters in real time"*), and settled as real syntax so the text
   * still runs in a real SuperCollider: an argument, or a NamedControl like
   * `\rel.kr(1.5, spec: [0.05, 6, \exp])`, whose spec is the knob's range and
   * warp. `sclang-lite.mjs` reports them as `knobs`, `param-knobs.mjs` draws
   * them, and a turn sends `/n_set <node> <name> <value>` to every node that is
   * still sounding on a program that has that control, released ones
   * included, while a new key sends the knob's value in its `/s_new`.
   * ⚠️ THE PAD'S `rel` IS A NAMED CONTROL AND NOT AN ARGUMENT ON PURPOSE. An
   * argument carries no range in the language, so its knob would be drawn
   * from a guess; a spec is written where the number is, and it is the form
   * sclang's own GUIs read.
   * ⚠️ AND A RELEASE IS READ WHEN THE GATE CLOSES. EnvGen takes a segment's
   * time as the segment starts, so a turn changes the tail of a held note and
   * of every note after it, and not a tail that has already begun.
   */
````

<a id="collide-3"></a>
## collide-3: demo/collide/index.html, inline script, line 129

````js
    /**
     * Four cells and every one moves: a compile takes a different time, a
     * different program is a different size and a different number of blocks,
     * and every load is timed. `load` stays empty until the engine exists,
     * because nothing unmeasured prints as 0.
     */
````

<a id="collide-4"></a>
## collide-4: demo/collide/index.html, inline script, line 157

````js
  /**
   * Bring scsynth up. The AudioContext is made HERE, synchronously, so a key
   * press is the gesture that owns it; the boot after it is an await.
   */
````

<a id="collide-5"></a>
## collide-5: demo/collide/index.html, inline script, line 173

````js
  // ── what the server says about its nodes ────────────────────────────────────
  //
  // `bootScsynth` sends `/notify 1`, so every node start and end comes back.
  // `/n_end` is consumed here: it is what a check reads to know a note has
  // really finished rather than gone quiet. Freeing a replaced definition is
  // the server's own job, see the header.
````

<a id="collide-6"></a>
## collide-6: demo/collide/index.html, inline script, line 207

````js
  /**
   * 🔴 ONE HUE BOOK FOR THE TEXT AND THE KNOBS, ASSIGNED ON A COMPILE THAT
   * WORKED AND NEVER ON A KEYSTROKE (`code-lang.mjs`, `createHueBook`). The
   * code box reads it for each parameter's snippet and this page writes the
   * same number onto each knob as `--param-hue`, so a name in the text and its
   * knob are one colour by construction. Only a parameter with a knob gets
   * one: `freq`, `amp` and `gate` are set by a key and stay plain.
   */
````

<a id="collide-7"></a>
## collide-7: demo/collide/index.html, inline script, line 274

````js
  /**
   * Hand the bytes to scsynth and wait for its own `/done`. Over its ceilings
   * the engine answers nothing (`synthdef.mjs`, `sclang-lite.mjs`), so the
   * timeout IS the answer, and it is reported rather than swallowed.
   */
````

<a id="collide-8"></a>
## collide-8: demo/collide/index.html, inline script, line 299

````js
  /* 🔴 THE KIT'S CODE BOX SINCE 2026-09-30 (`demo/shell/code-box.mjs`,
     `plans/plan-code-editor.md`): the same field textarea, transparent, over
     the program drawn in SuperCollider's colours, with each knob's parameter
     in the knob's own hue. */
````

<a id="collide-9"></a>
## collide-9: demo/collide/index.html, inline script, line 318

````js
    /* 🔴 `Loop` WHILE THE EVOLUTION IS PLUGGED IN (`9c683e2`, asked for every
       keyboard page). A looped note comes back through `onDown` marked `loop`,
       with the velocity a MIDI key played it at when the take heard one. */
````

<a id="collide-10"></a>
## collide-10: demo/collide/index.html, inline script, line 463

````js
  // ── compiling what was typed, once the typing stops ─────────────────────────
  //
  // The kit's idle compile, wired the way `/fau/` wires it: the timer, the
  // queue and the breathing note in the corner of the text are the module's,
  // and this page supplies what a compile is. No `notNow`, see the header.
````

<a id="collide-11"></a>
## collide-11: demo/collide/index.html, inline script, line 476

````js
  /* The text is the picture row, edge to edge, as on `/fau/`. The live scope
     that sat above it went on 2026-09-30, asked as *"rm waveform from
     collide"*. */
````

<a id="collide-12"></a>
## collide-12: demo/collide/index.html, inline script, line 479

````js
  /* 🔴 ON THE PATCHBAY AFTER A PRESS OF JOIN, AND NEVER ON A VISIT
     (`plans/plan-routing-migration.md` step 5, `engine-node.mjs`). The engine
     is a node with notes in, sound out and the program in; this browser's MIDI
     devices come with it. Beside the name sit the control and the badge that
     says whether a keyboard linked in from `/patchbay/` is arriving, which is
     the owner's *"visual indication"* rather than a patch view. */
````

<a id="collide-13"></a>
## collide-13: demo/collide/index.html, inline script, line 520

````js
      /* ⚠️ NO MIDI KEYBOARD MACHINE. It was drawn the way `/fau/` draws one and
         came out as a slab the height of the Browser holding one box, and on a
         phone a screen of nothing (shot 2026-09-30). The picture is about the
         compile path; what a key sends is in the scsynth note. */
````

<a id="collide-14"></a>
## collide-14: demo/collide/index.html, inline script, line 605

````js
    /* ── the knob row, before any sound ──────────────────────────────────────
       🔴 READ OFF THE SCREEN, NOT OFF THE COMPILE: the compiler's own list is
       graded by `sclang-lite-test.mjs`, and what this page can get wrong is
       drawing it. `display` rather than `hidden`, which is a fact about an
       attribute and not about what is drawn. */
````

<a id="collide-15"></a>
## collide-15: demo/collide/index.html, inline script, line 613

````js
    /* Every preset has knobs since 2026-09-30 (*"add knobs to all patches what
       mak sense"*): the Pad's are rel, cutoff and detune, in the code's order. */
````

<a id="collide-16"></a>
## collide-16: demo/collide/index.html, inline script, line 623

````js
    /* 🔴 ONE HUE, READ OFF THE SCREEN ON BOTH SIDES. The snippet's
       `--param-hue` is the code box's, the knob's is this page's, and the
       two have to be the same number from the same book; the knob's name is
       drawn in the ink its arc is. `freq` and `gate` are parameters in the
       text and have no knob, so they carry no hue. */
````

<a id="collide-17"></a>
## collide-17: demo/collide/index.html, inline script, line 651

````js
    /* 🔴 THE ROW DOES NOT MOVE THE KEYS. Asked 2026-09-30: *"make the area h
       for thise buttons fixed so no junmp"*. The keys' top is read with the
       Pad's knobs and with a program that has none.
       ⚠️ THE EMPTY ROW WAS THE GROWL UNTIL EVERY PRESET GOT KNOBS, the same
       day, so the empty case is a program typed with no control a knob could
       turn, compiled straight through the queue as the checks further down do. */
````

<a id="collide-18"></a>
## collide-18: demo/collide/index.html, inline script, line 689

````js
    /* 🔴 THE CODE BOX'S ONE INVARIANT, READ OFF THE RENDERED ELEMENTS, after a
       typed edit: the coloured layer holds exactly the textarea's text, at
       the textarea's metrics, and a refused compile gave no hue away. */
````

<a id="collide-19"></a>
## collide-19: demo/collide/index.html, inline script, line 704

````js
    // ── the engine ───────────────────────────────────────────────────────────
    // 🔴 WHAT GRADES THE COMPILER. Under `?selfcheck=1` only: this starts a
    // sound device and plays notes, which a visit never does.
````

<a id="collide-20"></a>
## collide-20: demo/collide/index.html, inline script, line 716

````js
    /* ⚠️ ASKED WITH THE ENGINE UP, because before it exists nothing can be
       sent at all and "a refusal sent nothing" would be true of any page. */
````

<a id="collide-21"></a>
## collide-21: demo/collide/index.html, inline script, line 724

````js
    /* 🔴 THE METER READS ZERO WITH NOTHING PLAYING, OR NOTHING BELOW MEANS
       ANYTHING. A meter stuck at a level would pass every "it made a sound". */
````

<a id="collide-22"></a>
## collide-22: demo/collide/index.html, inline script, line 730

````js
    /* ⚠️ ONE ASSERT PER STEP, AND EVERY RELEASE IS SPLIT IN TWO. The harness
       stops collecting after 2.0 s with no new assert, and the longest release
       here is 1.5 s on top of its hold, so a single assert at the end of each
       preset lost everything after the first one on the first run here (13
       asserts, green, and the presets never graded). Every preset is held
       350 ms, let go, heard 200 ms later still sounding and quieter, and then
       heard to end by itself: the owner's rule for these patches is that the
       key opens and closes them. */
````

<a id="collide-23"></a>
## collide-23: demo/collide/index.html, inline script, line 765

````js
    /* ── the knob, on the real engine ─────────────────────────────────────────
       🔴 DRIVEN THROUGH THE KNOB'S OWN KEYS, NOT `knobs.set` AND NOT `turn()`:
       a keydown on the dial is what a person's arrow key does, and it goes
       through the component, the warp, `onChange` and the page's `/n_set`.
       Home is the bottom of the range, and eight Page Ups are 80 of 127 steps
       of the travel, which on 0.05 to 6 exponential is 1.02 s.
       🔴 AND WHAT IS MEASURED IS THE SERVER'S OWN ANSWER: the time from the
       gate closing to `/n_end`, which is how long the release really took. */
````

<a id="collide-24"></a>
## collide-24: demo/collide/index.html, inline script, line 818

````js
    /* 🔴 THE INVISIBLE HAND TURNS IT ON THE SERVER. Asked 2026-09-30: *"add
       invisible hands to these cutoff buttons"*. From the bottom of the
       travel, a held note, the hand's button pressed and pressed again, and
       then the server is ASKED what `rel` is on that node with `/s_get`: its
       answer is the knob's value, and the page counted `/n_set`s from the
       hand. A hand that moved the dial and not `onChange` sends none, and the
       server would still say 0.05. */
````

<a id="collide-25"></a>
## collide-25: demo/collide/index.html, inline script, line 845

````js
    /* 🔴 A LAG THAT REALLY LAGS. `\lvl.kr(0.1, 0.5)` is a LagControl on the
       server, so the level falls away over half a second (60 dB in the lag
       time) after the knob drops to 0 rather than at once. */
````

<a id="collide-26"></a>
## collide-26: demo/collide/index.html, inline script, line 848

````js
    /* ⚠️ FROM HERE ON A PROGRAM IS COMPILED STRAIGHT THROUGH THE QUEUE AND NOT
       TYPED, since 2026-09-30. The idle compile is graded above; typed, each
       of these three paid its 600 ms wait and the note's 800 ms showing, and
       with the hand and the Loop checks added the tail of this block ran past
       the harness's 24 s ceiling and was dropped with the run still green
       (34 asserts where 46 were written). */
````

<a id="collide-27"></a>
## collide-27: demo/collide/index.html, inline script, line 871

````js
    /* 🔴 THE ARITHMETIC, GRADED BY THE ENGINE. A multiply written as an add
       is a well formed file that loads and plays (research §9.3b), and the
       node test cannot hear it. A sine at amplitude a has an RMS of a / sqrt 2. */
````

<a id="collide-28"></a>
## collide-28: demo/collide/index.html, inline script, line 881

````js
    /* 🔴 REPLACING THE DEFINITION UNDER A SOUNDING NOTE, graded on every run.
       The next program is sent under the same name while the tone plays. The
       tone must keep its level, and must still answer `amp`, which the new
       program does not have: if the node had moved to the new graph, amp 0
       would change nothing and it would go on reading 0.1414. */
````
