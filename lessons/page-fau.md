# Page comments: fau

The full comments cut from the code under demo/ for fau, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="fau-1"></a>
## fau-1: demo/fau/engine-node-test.mjs, module, line 1

````js
// node demo/fau/engine-node-test.mjs: the engine node `/nola/` and `/fau/` announce.
//
// No browser, no socket, no MIDI device: an in-memory relay (`memoryRelay`) and a
// stand-in MIDIAccess (`standInAccess`), the same ones the two pages' check passes
// use. What is NOT graded here: the Join button, the badge's drawing, and whether a
// real browser delivers one keyboard's messages to two MIDIAccess objects. The
// pages assert the first two; nothing here can answer the third.
//
// NEGATIVE CONTROLS, written so the bug they name fails them: 8, marked `NEG`.
//
// SABOTAGE, MEASURED 2026-10-06 on scratch copies of `engine-node.mjs`, each one
// alone against 30 checks: `omni` always true 29/30; no `allOff` on the first link
// 28/30; any target accepted 27/30; the sound not refused 29/30; velocity 0 read
// as a note on 28/30; a closed link keeping its listener 29/30; an absent keyboard
// opened 27/30; `transports` dropped from the audio out 29/30. None stayed green.
````

<a id="fau-2"></a>
## fau-2: demo/fau/engine-node.mjs, module, line 1

````js
// demo/fau/engine-node.mjs: a page that IS a synth, as an engine node /patchbay/ can draw and link.
//
// 🔴 STEP 5 OF `plans/plan-routing-migration.md` FOR THE TWO ENGINE PAGES, 2026-10-06.
// Its §2.1 rows: `/nola/` is *"an engine node with a midi in port; local only"* and
// `/fau/` is *"engine with program and midi in, audio out (univ §3 names it)"*. Both
// pages already play from every MIDI keyboard on the machine through `createMidi`.
// This module adds the half that was missing: the page says what it is to the room,
// so `/patchbay/` can draw the engine and the keyboards beside it, and a person
// there can say WHICH keyboard plays it.
//
// ⚠️ IT LIVES IN `demo/fau/` AND `/nola/` IMPORTS IT FROM HERE, which is a stopgap
// and not a design. Two copies of one join rule is the defect `bay-node.mjs` was
// written to end, so there is one copy; its home is `demo/shell/engine-node.mjs`,
// which the agent that wrote this was not allowed to create. Moving it is a
// `git mv` and two import lines.
//
// WHAT IT DECIDES:
//   1  NOTHING ON LOAD. Building it opens no socket and asks for no MIDI.
//      `join()` does both, and a page calls it from the Join press or from its
//      own check pass. A visit opens nothing.
//   2  THE ROOM AND THE SITE ARE `bay-node.mjs`'s: `?room=`, the run's own room
//      under the harness, `studio-1` for a person, and a site of this tab's own.
//   3  ONE GRAPH, ONE SITE: the engine node and this browser's MIDI devices
//      (`midi-graph.mjs`) on the same site, so a link from a keyboard here to the
//      engine here is a link between two of this page's own ports, and this page
//      is the one `bay-node.mjs` hands the `link.request` to.
//   4  LOCAL ONLY. The audio out says `transports: ['webaudio']`, so the bay
//      refuses to carry it off the machine in words. Nothing here sends a sound,
//      a note or a program anywhere: a request for that is refused in words.
//   5  OMNI UNTIL PATCHED. With no link open the engine plays every MIDI input,
//      which is what both pages did before this file existed and is still what a
//      visitor who never presses Join gets. Once a link is open the engine plays
//      ONLY the linked keyboards, and when the last one closes it goes back to
//      all of them. Every switch lets go of every note first, because a
//      keyboard that stops being heard mid-note would leave that note held.
//
// 🔴 THE BADGE COUNTS ON THE FAR SIDE. What it counts is MIDI messages that
// reached this engine through an open link, counted in the handler that hands
// them to the page's own note functions: the engine is the far side of that
// link. A press of Open only makes it `starting`.
// ⚠️ ITS STALL WINDOW IS NOT THE PICTURE'S TWO SECONDS. A keyboard rests between
// phrases; two seconds of nobody playing is not a stalled link. `MIDI_STALL_MS`
// is thirty seconds, which still turns a link to an unplugged keyboard grey.
//
// ⚠️ WHAT IS NOT MEASURED: whether a second `MIDIAccess` in one tab (the one
// `midi-graph.mjs` asks for at Join, beside the one `createMidi` asked for)
// delivers every message to both. Chrome's WebMIDI hands each access its own
// port objects; no device was plugged in when this was written, so the linked
// path has run only against the stand-in access in the page's check pass.
````

<a id="fau-3"></a>
## fau-3: demo/fau/engine-node.mjs, module, line 62

````js
/**
 * The same five lines `createMidi` dispatches with (`demo/shell/midi.mjs`), for a
 * message that arrived on ONE linked port. ⚠️ A SECOND COPY OF A DISPATCH, which
 * that module warns against, kept because `createMidi` exports no decoder and says
 * nothing about which port a message came from. Velocity 0 is a note off.
 * @returns {string|null} what it was, or null for a kind the engine ignores
 */
````

<a id="fau-4"></a>
## fau-4: demo/fau/engine-node.mjs, module, line 242

````js
/**
 * The Join press and the badge, as one inline group a page puts on its own panel.
 * ⚠️ NOT IN `.pos-controls`: the harness presses that row by position, and this
 * press joins a room. The check pass joins its own in-memory room explicitly.
 * 🔴 THE BADGE IS IN A WRAPPER, AND THE WRAPPER IS WHAT IS HIDDEN. `.pos-pres` is
 * `display: inline-flex`, which beats the browser's own `[hidden]`, and
 * `shell.css` has no `.pos-pres[hidden]` rule, so `link-badge.mjs` setting
 * `hidden` on it changed an attribute and left the badge drawn. A plain span has
 * no author `display`, so its `hidden` is the browser's and it works.
 */
````

<a id="fau-5"></a>
## fau-5: demo/fau/engine-node.mjs, module, line 254

````js
  /* 🔴 ONE WORD, AND THE ROOM IN THE HOVER. `Join studio-1` wrapped to three
     lines on the keyboard's foot at 375 px, photographed, and a label never
     wraps. The log says the room the moment it is joined. */
````

<a id="fau-6"></a>
## fau-6: demo/fau/presets.mjs, module, line 1

````js
// demo/fau/presets.mjs: the programs `/fau/` opens with.
//
// 🔴 IN THEIR OWN FILE SINCE 2026-10-06, SO THE TEXT THE PAGE SHIPS AND THE
// TEXT COMPILED AHEAD OF TIME ARE ONE TEXT. `demo/resources/build-faust-aot.mjs`
// imports this list and compiles the Organ into `demo/resources/faust/`, and
// `workers/view/build.mjs` refuses a build whose artefact was compiled from a
// different Organ. `demo/shell/code-lang-test.mjs` imports it too, where it
// used to read the page with a regular expression. `/collide/` already keeps
// its presets this way, in `demo/collide/presets.mjs`.
// ⚠️ THE FAUST TEXT IS BYTE FOR BYTE WHAT THE PAGE HELD: only the JavaScript
// around it lost the page's two space indent.
````

<a id="fau-7"></a>
## fau-7: demo/fau/presets.mjs, module, line 13

````js
/**
 * The presets, and each one is a whole instrument in the box.
 *
 * 🔴 THE THREE MAGIC NAMES ARE `freq`, `gain` AND `gate`. A Faust DSP becomes
 * one VOICE of a polyphonic instrument by declaring those three, and the
 * runtime replicates it. Rename any of them and the keyboard stops reaching
 * it, which is a thing a visitor can do by accident and the log says so.
 *
 * ⚠️ AND THE COMPRESSION IS A DICTIONARY, NOT MAGIC, WHICH IS WHY `djembe` IS
 * HERE. 0.27 kB of source becoming 17.21 kB of machine code is real, and it is
 * real because `pm.djembe_ui_MIDI` is a NAME for something living in the
 * 2.41 MB of library that was already downloaded. The moment the sound is
 * something nobody wrote a library function for, the source is as long as the
 * sound is complicated: the STK waveguide piano is 21.92 kB of it. Both halves
 * of that belong on the page rather than only the flattering one.
 * ⚠️ THOSE TWO FIGURES READ `75 bytes` AND `12,820 bytes` UNTIL 2026-09-25 AND
 * BOTH WERE STALE. The djembe grew its comments on 2026-09-24 and nothing here
 * moved with it. RE-MEASURED that day against this file's own source, which is
 * the only reason the new pair is worth anything.
 *
 * ── A BLANK LINE AFTER EVERY COMMENT, AND IT IS ONLY THIS LISTING ──────────
 *
 * 🔴 ASKED 2026-09-25 AS *"add nl after comments"*, WITH A WORKED EXAMPLE
 * RATHER THAN A DESCRIPTION, AND THE SCOPE WAS PUT TO THE OWNER AND ANSWERED:
 * the Faust listing shown on this page, not a repository sweep and not a
 * convention for new JavaScript. So it applies to the `code` strings below and
 * to nothing else in this file.
 * ✅ **THE FORM IS: A COMMENT ON ITS OWN LINE IS FOLLOWED BY A BLANK LINE
 * BEFORE THE CODE IT INTRODUCES.** Two comment lines in a row are one comment
 * and take one blank line after the pair, because the blank separates the
 * comment from its code rather than the lines from each other.
 * ⚠️ **A TRAILING COMMENT GETS NOTHING, AND THAT IS NOT AN OVERSIGHT.**
 * `gate = button("gate");   // 1 while a key is held down` introduces no code:
 * the code is to its left and already read. A blank line under it would
 * separate two statements that belong together.
 * ⚠️ **AND IT COSTS FOUR TO SIX LINES A PRESET, WHICH IS WHY `rows` MOVED.**
 * See the code box below: the box is sized to the longest listing, MEASURED
 * rather than guessed, and this ask changed which number that is.
 */
````

<a id="fau-8"></a>
## fau-8: demo/fau/presets.mjs, module, line 84

````js
    /* 🔴 THE SAME INSTRUMENT AS `demo/shell/rhodes.mjs`, WRITTEN AGAIN IN
       FOUR LINES. That file is 60 lines of per-sample JavaScript arithmetic
       and its header explains the sound: a TINE operator at a high ratio
       decaying in tens of milliseconds, a BODY at 1:1 decaying over a second,
       and a carrier both of them phase-modulate. This is that description
       with the loops taken out, which is what a signal language is for. */
````

<a id="fau-9"></a>
## fau-9: demo/fau/presets.mjs, module, line 121

````js
    /* 🔴 THE THIRD, ADDED 2026-09-28 IN PLACE OF `Bell`, WHICH IS THE ROW THE
       ASK TOOK OUT: *"rm bell and hall from fau they do not diffentiate"*.
       `Bell` was the Rhodes with `3.51` typed where a whole number had been,
       and its own comment said so, so a visitor stepping onto it learned a
       number rather than a mechanism.
       🔴 WHAT THIS ONE SHOWS AND NOTHING ELSE ON THE PAGE DOES IS `~`, THE
       OPERATOR THAT LETS A SIGNAL READ ITS OWN OUTPUT. Everything else here
       runs forwards: the Organ adds oscillators up, the Rhodes bends one with
       another, and the two library names below hide whatever they do. This
       patch has no oscillator in it at all. Twelve milliseconds of noise go
       into a delay line that feeds itself, the LENGTH of that delay is the
       pitch, and the fraction that survives a lap is the decay. It is
       Karplus-Strong, the cheapest physical model there is, and it is the
       counterweight to `Djembe` and `Clarinet`: the same kind of thing those
       two name in one word, written out where a visitor can change it.
       ✅ MEASURED 2026-09-28, compiled the way THIS page compiles, which is
       polyphonic with a voice, an effect and a mixer: 68 ms cold and 27 to
       30 ms warm, 8.61 kB of machine code, 16.47 kB a voice. That per-voice
       figure is the only one on this page that is a BUFFER rather than a
       table or almost nothing, which is what a delay line is.
       ⚠️ NOTHING NEW CROSSES THE WIRE. `no`, `de` and `fi` are all inside the
       2.41 MB of library the page has already downloaded, the same condition
       the Clarinet below was chosen under.
       ⚠️ AND THE DAMPER IS ONE TERM RATHER THAN A SECOND ENVELOPE. A string
       with a constant feedback rings on after the key comes up, which is what
       a real one does and is wrong on a keyboard with eight voices and a
       sustain pedal, because then nothing the foot does can be told apart
       from the instrument ignoring it. `keep` drops to 0.9 when the gate
       goes. MEASURED offline at 440 Hz: an RMS of 0.0009 in the first tenth
       of a second after the key lifts, against 0.075 in the first tenth it
       was held. */
````

<a id="fau-10"></a>
## fau-10: demo/fau/presets.mjs, module, line 183

````js
    /* 🔴 THE FOURTH, ADDED 2026-09-28 IN PLACE OF `Hall`, AND IT KEEPS THE ONE
       THING `Hall` WAS FOR. That row was the Organ verbatim with
       `effect = dm.freeverb_demo;` under it, which is a real lesson about the
       last line of every listing sitting on a voice the page already had. The
       room moves here, onto a voice that is nobody else's.
       🔴 AND THE VOICE IS THE THIRD WAY OF MAKING A SOUND, WHICH THIS PAGE
       DID NOT HAVE. The Organ adds oscillators together and the Rhodes bends
       one with another, so both of them BUILD the sound up. This one starts
       with a sawtooth, which has every harmonic of the note in it already,
       and takes most of that away again with a filter whose corner is driven
       by an envelope of its own rather than by the volume.
       ✅ MEASURED 2026-09-28, compiled the way this page compiles: 106 to
       118 ms, 21.29 kB of machine code, and 108 BYTES a voice, which is the
       smallest per-voice figure this page has ever printed and is worth
       having beside the Organ's 262.26 kB. A sawtooth and a two pole filter
       keep almost nothing; `os.osc` carries a 65,536 entry sine table.
       ⚠️ AND THE ROOM IS NOT IN THOSE 108 BYTES, WHICH IS WHAT THE ASSERT
       BELOW GRADES. MEASURED the same day by compiling this listing twice,
       once as it stands and once with a bare wire on the last line:
       21.29 kB against 9.42 kB of machine code, and 108 bytes a voice either
       way, so the room really does run once on the mix.
       ⚠️ NOTHING NEW CROSSES THE WIRE. `dm` is `demos.lib` and `fi` is
       `filters.lib`, both already in the downloaded library. */
````

<a id="fau-11"></a>
## fau-11: demo/fau/presets.mjs, module, line 247

````js
    /* 🔴 ADDED 2026-09-25 ON *"add more patches if you have"*, AND `if you
         have` WAS READ AS THE CONDITION IT IS. This one is not invented:
       `plan-fau.md` §1.4 names `pm.clarinet_ui_MIDI` as the measured example
       behind its own headline sentence, *"61 bytes of source becomes a
       clarinet"*, and `physmodels.lib` is already inside the 2.41 MB of
       library this page downloads. Nothing new crosses the wire for it.
       🔴 AND THE PLAN'S COMPILE TIME DOES NOT TRANSFER TO THIS PAGE, MEASURED
       2026-09-25 BEFORE IT WAS ADDED. §2.2 records 94 to 106 ms; compiled the
       way THIS page compiles, which is polyphonic with a voice, an effect and
       a mixer, it is 273 to 344 ms on this desk. The plan's figure is a MONO
       compile and this page has never made one. That is the slowest preset
       here and it is still an order of magnitude under the STK piano's
       1,690 ms, which is the one refused.
       ⚠️ `nearly three times over the next one` STOOD HERE UNTIL 2026-09-28
       AND `Sweep` MOVED IT. RE-MEASURED that day with the vendored compiler
       under node, every preset the same way so that only the ratio is being
       quoted: clarinet 241 to 260 ms against Sweep's 106 to 118, which is
       about twice rather than three times. The 273 to 344 above is the
       in-browser figure and is unchanged.
       ⚠️ `pm.brass_ui_MIDI` COMPILES IN 155 ms AND WAS NOT CHOSEN. It is in
       the same library and it would have been the cheaper row; it has never
       been measured in this repository, and picking a sound on a number the
       page does not otherwise care about is how provenance gets lost. */
````

<a id="fau-12"></a>
## fau-12: demo/fau/index.html, HTML comment, line 9

````html
<!-- 🔴 NO PAGE RULES SINCE 2026-09-30. The corner of the text that held a
     Compile button holds the kit's compile note (`demo/shell/compile-idle.mjs`,
     `.pos-cnote` in `shell.css`), positioned and reserved by the kit on the
     same tokens the button's two rules used, `--rows-gap` and `--ctl-sm`. -->
````

<a id="fau-13"></a>
## fau-13: demo/fau/index.html, inline script, line 15

````js
  /**
   * fau. A synthesiser you type in, compiled to machine code in this tab.
   *
   * `plans/plan-fau.md` is 1,419 lines of measurement behind this page and the
   * conclusions it reached are taken here rather than re-argued. What follows
   * is only what somebody editing THIS FILE has to know.
   *
   * ── WHAT IS ACTUALLY HAPPENING ─────────────────────────────────────────────
   *
   * The text in the box is Faust, a language for describing a signal. A moment
   * after the typing stops it goes to `libfaust`, which is the Faust compiler
   * itself built as WebAssembly and vendored beside this page, and back comes a
   * second, much smaller WebAssembly module that IS this instrument. That module
   * goes into an `AudioWorkletNode` and the audio thread runs it. Nothing is
   * interpreted: a page of text becomes a few kB of machine code, in a few tens
   * of milliseconds, in the tab.
   * ⚠️ THIS SAID `PRESSING COMPILE` UNTIL 2026-09-25 AND THAT BUTTON WAS DELETED
   * ON 2026-09-24. A sentence naming a control that is gone is the drift rule in
   * its cheapest form, and nothing type-checks one.
   *
   * ── kB, AND IT IS 1000 BYTES ───────────────────────────────────────────────
   *
   * 🔴 ONE UNIT FOR EVERY SIZE THIS PAGE PRINTS, DECIDED ONCE HERE. Asked
   * 2026-09-25 as *"faust all sizes in kb"*, and the ask left two things to
   * settle that a reader cannot settle from the page: whether a kB is 1000 bytes
   * or 1024, and how many decimals.
   * ✅ **1000, BECAUSE THAT IS WHAT THE SYMBOL `kB` MEANS.** 1024 bytes is `KiB`
   * and writing `kB` for it is a symbol that means two things on one page. It
   * also puts kB and MB on ONE ladder: the four log lines here already divided
   * by 1e6 for MB while the `per voice` cell divided by 1024 for `KB`, so this
   * page carried both conventions at once, which is what the ask is about.
   * ✅ **TWO DECIMALS, AND THE RESOLUTION IS SET BY THE SMALLEST THING THAT
   * MOVES.** The source cell is a few hundred bytes and has to change when
   * somebody types a line, which is this page's whole subject. MEASURED: one
   * decimal leaves `0.8 kB` standing still through thirty characters, and a cell
   * that cannot move on an ordinary edit is a cell that teaches a reader to skip
   * the row. Two decimals is 10 byte resolution and every cell moves.
   * ⚠️ **MB ABOVE A MEGABYTE, ON THE SAME LADDER AND NOT A SECOND CONVENTION.**
   * The compiler is `6.16 MB`; written in kB it is `6162.47`, which is the same
   * number in a place where nobody can read it, and that number is the one
   * warning this page gives about somebody's bandwidth.
   * ⚠️ **AND TWO ASSERTS KEEP THEIR BYTES ON PURPOSE**, both named in their own
   * comments: the pinned compile and `to the byte`. Those compare an IDENTITY
   * rather than report a size, and a fingerprint rounded to 10 bytes is not a
   * fingerprint. Everything else a reader sees goes through `kb()` or `mb()`.
   * ⚠️ **A COMMENT MAY STILL STATE AN EXACT BYTE COUNT**, because that is a
   * `wc -c` measurement somebody will re-run rather than a size being read. What
   * a comment may not carry is a DIVIDED unit that disagrees with the page,
   * which is how `256.1 KB` sat beside a cell that now reads `262.26 kB`.
   * ⚠️ **ONE `MiB` SURVIVES AND IT IS NOT A MISS.** `plan-fau.md` §6.2 measured
   * a PROCESS growing from 91 to 603 MiB, which is memory rather than a file and
   * is quoted below in the symbol that document used. `MiB` cannot be mistaken
   * for `MB` the way `KB` could, which is the whole reason the symbols exist.
   *
   * 🔴 THE COMPILER ARRIVES ON A VISIT SINCE 2026-09-28, AND THIS BLOCK SAID
   * THE OPPOSITE UNTIL THAT DAY. Asked as *"fau: compile on loading so i can
   * play"*. Until then the 6.16 MB and the first compile both sat behind the
   * Compile press, on the `/reel/` reasoning: that page opened a newsreel and a
   * day's radio on every visit for a first frame nobody had asked to see.
   * ⚠️ AND THE RULE IT LOOKS LIKE IT BREAKS IS ABOUT SOMEBODY ELSE'S SERVER.
   * `/reel/` was reaching arhiiv.err.ee, where every connection this repository
   * opens lands in a public broadcaster's audience figures. Every byte this
   * page pulls on a visit comes off `/fau/vendor/`, four files this repository
   * ships, on this origin, and nothing at all is asked of anybody else. That is
   * asserted rather than argued: the check block reads every resource the
   * browser really loaded and requires all of them to be same origin.
   * 🔴 AND THE AUDIO HALF DID NOT MOVE WITH IT. No AudioContext, no worklet
   * node and no MIDI on a visit, which is the other half of the same ask: a
   * compile is arithmetic over a file this page ships, and a context is a sound
   * device. Every sound page in this repository opens one on a gesture and not
   * before, and one page departing from that quietly is how a rule stops being
   * a rule. So the shape is: the instrument is COMPILED when you get there and
   * it reaches the audio thread on the first key you press, which is the
   * gesture a browser wants for a sound anyway.
   *
   * ── THE THREE THINGS THAT ARE NOT OBVIOUS FROM THE CODE ────────────────────
   *
   * 🔴 1. THE PEDAL SITS ABOVE THE FAUST NODE AND MUST NOT GO INSIDE THE DSP.
   * The Faust manual's own recipe is a `sustain` slider inside the source and
   * `gate = t + s : min(1)`. MEASURED in `plan-fau.md` §4.2 by reading
   * `FaustWebAudioDsp.ts`: the polyphonic voice allocator special-cases exactly
   * two controllers, 123 and 120, and 64 is not one of them. A note-off marks
   * its voice `kReleaseVoice`, which is the FIRST thing `getFreeVoice()` steals
   * So with the manual's recipe a pedalled note is audible and stealable at the
   * same time, and the more the pedal is used the wronger it gets. Here
   * `demo/shell/pedal.mjs` holds the note-off and the engine is never told the
   * note ended, so there is nothing for the allocator to write off.
   * ⚠️ AND THE DAMPER TIME IS THE ONE PART OF `pedal.mjs` THIS PAGE CANNOT USE.
   * On `/nola/` the page owns the release and can ramp it over 0.12 s. Here the
   * release lives in the source the visitor typed, so the pedal decides WHETHER
   * and WHEN a note is let go and the DSP decides how fast. That is the module's
   * own division of labour, arriving at a page that keeps only half of it.
   *
   * 🔴 2. THE COMPILER'S ERROR PATH GOES THROUGH `console.error`, AND THAT
   * WOULD TAKE THE SUITE RED ON A PAGE DOING EXACTLY WHAT IT PROMISES.
   * MEASURED here 2026-09-23: libfaust is built with C++ exception catching
   * disabled, so an exception inside it reaches Emscripten's `abort()`, which
   * prints `Aborted(Assertion failed: Exception thrown, but exception catching
   * is not enabled...)` and throws a `WebAssembly.RuntimeError`. `faustwasm`
   * catches that and reads the real message out with `getErrorAfterException()`,
   * so the SYNTAX ERROR a visitor sees is correct and the instance stays
   * usable. One console error per failed compile is already on the console by
   * then, and `demo/verify.mjs` fails `no console errors` on it.
   * ✅ THE SHIM IS THREE LINES AND IT IS INSTALLED FOR ONE AWAIT. The glue does
   * `var err = console.error.bind(console)` at module scope, so whatever
   * `console.error` is AT THE MOMENT THE GLUE IS EVALUATED is what it keeps
   * forever. A forwarding function is installed across that one await and taken
   * off immediately afterwards: the compiler keeps the shim, the rest of the
   * page gets the real `console.error` back, and nothing else on the page can
   * be swallowed. MEASURED with a deliberate error: 1 line captured, 0 lines
   * reaching the console, and the error text still reported to the visitor.
   * ⚠️ NOTHING IS HIDDEN. Every captured line goes into this page's own log,
   * where a reader can see it, and the count is asserted.
   *
   * 🔴 3. AN `effect` LINE IS IN EVERY PRESET AND IT IS NOT DECORATION.
   * MEASURED: compiling a polyphonic DSP that defines no `effect` costs one of
   * those aborts every time, because the generator probes for one and libfaust
   * throws when it is not there. With a pass-through effect declared, a poly
   * compile is console-clean. So the line is worth 1 console error per compile
   * and it is the shape a Faust instrument takes anyway: a per-voice `process`
   * and one `effect` after the mixer.
   * ✅ AND SINCE 2026-09-25 ONE PRESET PUTS SOMETHING REAL THERE. This said
   * `effect = _, _;` IS IN EVERY PRESET, which was true of all four and is true
   * of five of the six: the sixth ends with `dm.freeverb_demo`, so the page now
   * shows what the line is for rather than only asserting that it is needed.
   * The argument above is unchanged and is why the other five still carry a
   * wire that changes nothing.
   * ⚠️ THAT PRESET WAS `Hall` AND IT IS `Sweep` SINCE 2026-09-28. The lesson
   * did not move, the voice under it did: `Hall` was the Organ typed out again
   * with a reverb on the end, which is the half of it the ask refused.
   *
   * 🔴 4. TYPING COMPILES AGAIN, ONCE THE TYPING STOPS, SINCE 2026-09-30. It
   * was *"no autocompile"* from 2026-09-26, after two days in which a compile
   * landed 800 ms after the typing stopped, and a Compile button was the one
   * road to a second compile. Reversed on *"unify compilation in ui logic on
   * this and fau ant othes. trigger on inactivity? Small breating "Compiling"
   * note (not button)"*: `demo/shell/compile-idle.mjs` owns the timer, the
   * queue and the note, and `/csound/` uses the same module.
   * 🔴 WHAT THE OLD TIMER GOT RIGHT SURVIVES AS `notNow`. A compile blocks the
   * thread it runs on, builds a WHOLE NEW `AudioWorkletNode` and calls
   * `pedal.forgetKeys()`, so a compile under a held key takes the note away.
   * The page hands the module `holding() > 0` and a due compile waits for the
   * last key and the foot to come up, then runs. It is asserted both ways.
   * ⚠️ AND AN IDLE COMPILE IS NOT A GESTURE, so it never opens the audio: it
   * swaps the node only where a touch already opened it, which is what
   * `build()` has always done with `ctx`.
   * ⚠️ THE ONE A VISIT MAKES IS UNCHANGED: one compile of the text the box
   * opens with, before anybody is holding anything, and the note breathes over
   * it because it is behind a six megabyte download.
   *
   * ── THE PANEL, THE SWITCH AND `custom` ─────────────────────────────────────
   *
   * 🔴 THE INSTRUMENT IS THE KIT'S GLUED PANEL AND NOT A ROW OF BUTTONS.
   * Asked 2026-09-23: *"create instument panel, fau on top right, below the
   * textarea (edge to edge), below it footer with on/off"*, and moved onto
   * `createInstrumentPanel` on 2026-09-26 (plans/plan-instrument-audit.md): the
   * text is its picture row, edge to edge by construction, the keys are its
   * keys row, and the foot is its plate with the name at the start and the
   * patch picker at the far end, unlabelled, which is the panel's own rule
   * since 2026-09-26 (*"patch selector have no label and is in right"*).
   * Nothing to press sits in the corner of the text since 2026-09-30: the
   * kit's compile note does, and this page has no rules of its own. The name sits in the foot, where the sketch of 2026-09-26 puts
   * it, and the seven page rules that used to repair the field and the case
   * went with the move.
   *
   * 🔴 `custom` IS THE ANSWER TO THE OBJECTION THAT MADE THE PRESETS BUTTONS,
   * RATHER THAN A REVERSAL OF IT. The argument written here until 2026-09-23
   * was that a picker shows which one is SELECTED, and that the first thing
   * anybody does is edit the text, at which point a lit `Organ` is a control
   * describing something that no longer exists. Every word of that still holds.
   * `custom` is the fourth state that answers it: a keystroke that moves the
   * text off a preset moves the selector into it, and typing back to a preset's
   * exact source moves the selector back.
   * ⚠️ NOBODY CAN PICK IT. It is not in the platform's list. While it is
   * showing, the invisible `<select>` has NOTHING selected, so choosing the
   * preset that was loaded a moment ago still fires a change rather than being
   * swallowed as "no change".
   *
   * 🔴 AND THE FIRST TOUCH IS WHAT OPENS A SOUND DEVICE, WHICH SINCE 2026-09-28
   * IS A KEY RATHER THAN A BUTTON. `createMidi` asks the browser for access the
   * moment it is built, so this page was asking every visitor about a MIDI
   * keyboard before they had touched it. That moved onto the Compile press on
   * 2026-09-23 and onto the first gesture with the load compile, so the one
   * press that used to do three things is now a key that does three things.
   * The button that still recompiled went on 2026-09-30. A visit builds no AudioContext, puts
   * nothing on the audio thread and asks about no MIDI keyboard, and all three
   * are asserted; what a visit DOES do is pull the four vendor files and
   * compile the Organ, counted off the browser's own record rather than off a
   * counter this page keeps.
   *
   * ── WHAT THIS PAGE DELIBERATELY DOES NOT DO ────────────────────────────────
   *
   * 🔴 NO PATCH ARRIVES FROM ANYWHERE. Not over the relay, not from a room, not
   * from a query string. `plan-fau.md` §6.2 measured why: `process = _ @
   * 100000000;` is 24 bytes, compiles in 25 ms, and renders, taking a process
   * from 91 to 603 MiB. At 2^28 the compiler's own size arithmetic overflows to
   * -2,147,483,640, reports that the compile SUCCEEDED, and throws out of
   * bounds during render, which in a page is the audio thread. There is no CPU
   * limit, no memory limit and no compile timeout, and nothing in the source
   * text can be read to predict any of it. The text area is the visitor's own
   * machine editing its own copy.
   *
   * ⚠️ AND THE STK PIANO IS NOT A PRESET HERE. `faust-stk/piano1.dsp` compiles
   * in 1,690 ms, which is 1.7 seconds of frozen page on this desk and several
   * times that on a phone, because libfaust is synchronous inside its own wasm.
   * `plan-fau.md` §9.4 puts it in a later session behind a Worker. Its source is
   * 21.92 kB, which is the other half of the same fact: nobody wrote that sound
   * into a library, so the text is as long as the sound is complicated.
   * ⚠️ AND THIS LINE SAID `EVERY PRESET ON THIS PAGE COMPILES IN UNDER 110 ms`
   * UNTIL 2026-09-25, WHEN THE CLARINET ARRIVED AND MADE IT FALSE. RE-MEASURED
   * that day, all six polyphonic, warm compiler, this desk: five of them are
   * between 28 and 102 ms and the clarinet is 273. The sentence is kept in this
   * shape rather than deleted because it is the page's own ceiling, and the
   * number it names is the thing to check before adding a seventh.
   *
   * 🔴 AND THERE IS NO RASPBERRY PI IN THE PICTURE, WHICH IS THE POINT OF THE
   * PLAN'S FIRST OPEN QUESTION. `faust2rpialsaconsole` is real and the board
   * could compile this same source to native ARM, but nobody has run
   * `faust --version` on that board and `ssh` to it answers `No route to host`
   * from here today. `positron-diagram`'s rule is that a picture may never draw
   * a mechanism the page does not have, so the board is not drawn at all rather
   * than drawn as an intention. `BACKLOG.md` carries the one command that
   * changes this.
   */
````

<a id="fau-14"></a>
## fau-14: demo/fau/index.html, inline script, line 262

````js
  /* The four vendored paths, and why each is written out whole and why the
     `.data` file ships as `.txt`, live in `demo/shell/faust.mjs` as
     `FAUST_VENDOR` since 2026-10-06, moved there verbatim with their comment,
     because that module is now what fetches them. */
````

<a id="fau-15"></a>
## fau-15: demo/fau/index.html, inline script, line 273

````js
  /**
   * 🔴 THE ONLY TWO PLACES A SIZE IS DIVIDED. See the header for why 1000 and
   * why two decimals. They are functions rather than a rule somebody has to
   * remember, because this page printed sizes from eleven separate expressions
   * and two of them disagreed about what a kilobyte is.
   * ⚠️ THEY RETURN STRINGS, so an assert comparing a cell to one of them is
   * comparing what the reader can see rather than a number behind it.
   */
````

<a id="fau-16"></a>
## fau-16: demo/fau/index.html, inline script, line 284

````js
  /**
   * 🔴 THE ORGAN PRESET, COMPILED UNDER THE NAME `fau_pin`, IS EXACTLY THIS
   * MANY BYTES OF MACHINE CODE, AND THE NAME IS PART OF THE PIN.
   * `plan-fau.md` §3.3 measured that generated code is deterministic for the
   * same source, name and flags, and that a DIFFERENT NAME PRODUCES DIFFERENT
   * BYTES because the name is embedded in the module. This page names every
   * ordinary compile after the button that started it plus a counter, so its
   * byte counts are not comparable with each other by default. This check found
   * that the hard way, as a red assert comparing `organ_1`
   * against `organ again_5` and reporting a 78 byte difference in a page where
   * nothing was wrong.
   * ⚠️ SO EVERY COMPILE A CHECK COMPARES CARRIES A SEVEN CHARACTER NAME, and
   * the number below pins the compiler version, the `-ftz 2` flag, the
   * polyphonic shape and the preset text together. It is the `checkCompiledDefs`
   * idea from `workers/view/build.mjs`, done at runtime rather than at build
   * time: change any one of them and this goes red with the new number in its
   * own detail line. 4,540 of voice, 2,224 of effect, 502 of mixer.
   * 🔴 IT STAYS IN BYTES WHILE EVERY OTHER SIZE ON THIS PAGE WENT TO kB ON
   * 2026-09-25, AND THAT IS THE ONE EXCEPTION THE UNIT RULE NAMES. This is a
   * FINGERPRINT rather than a size: at two decimals of a kB it would pass any
   * change under ten bytes, which is most of what it exists to catch.
   * ✅ AND THE BLANK LINES THE SAME DAY'S ASK PUT INTO THE LISTING DO NOT MOVE
   * IT, MEASURED RATHER THAN ASSUMED: the Organ source went 761 B to 765 B and
   * 14 lines to 18, and this compiled to 7,266 B before and after. Comments and
   * blank lines are gone by the time libfaust generates anything.
   * ⚠️ 8,440 SINCE 2026-09-30, WHEN THE ORGAN GAINED THREE SLIDERS (`oct`,
   * `quint`, `rel`, on *"add knobs to all patches what mak sense"*). That is a
   * change to the instrument, so the fingerprint moved with it; the old source
   * still compiles to 7,266 B under the vendored compiler in node, which is
   * how the new figure was taken.
   */
````

<a id="fau-17"></a>
## fau-17: demo/fau/index.html, inline script, line 317

````js
  /**
   * ⚠️ EIGHT VOICES, WHICH IS A CHOICE ABOUT MEMORY RATHER THAN ABOUT MUSIC.
   * The per-voice struct is the `per voice` cell, and it is 262.26 kB for
   * anything built on `os.osc`, because a Faust oscillator carries a 65,536
   * entry sine table. Eight of those is 2.10 MB before any audio buffer exists,
   * and `plan-fau.md` §11 item 11 records that nobody has measured what an
   * iPhone grants an AudioWorklet. Eight hands and a pedal is more than anybody
   * plays at once here.
   */
````

<a id="fau-18"></a>
## fau-18: demo/fau/index.html, inline script, line 328

````js
  /**
   * 🔴 `-ftz 2`, AND IT IS PASSED EXPLICITLY RATHER THAN LEFT TO A DEFAULT.
   * `faustwasm` appends it to every compile it drives itself, with the comment
   * *"Flush to zero to avoid costly denormalized numbers"*. It is written here
   * because the claim this page is FOR is that the same source compiles the
   * same way at both ends, and a flag one end appends silently is a flag the
   * other end will not know to pass. The board's `faust2rpialsaconsole` needs
   * this same argument or the two ends differ in their denormal handling.
   */
````

<a id="fau-19"></a>
## fau-19: demo/fau/index.html, inline script, line 339

````js
  /* The presets live in `demo/fau/presets.mjs` since 2026-10-06, with the
     comment that explains them, so the ahead of time Organ in
     `demo/resources/faust/` is compiled from the same text this page shows. */
````

<a id="fau-20"></a>
## fau-20: demo/fau/index.html, inline script, line 343

````js
  /**
   * 🔴 A PRESET IS REACHED BY `id`, NEVER BY INDEX, AND 2026-09-28 IS WHY THIS
   * IS DECLARED UP HERE RATHER THAN HALFWAY DOWN THE CHECK BLOCK. The warning
   * was already written beside the one check that used it, in those words, and
   * two checks a hundred lines above it still read `PRESETS[2]` for the drum.
   * On the day `Bell` and `Hall` came out and `Pluck` and `Sweep` went in after
   * the Rhodes, index 2 stopped being the drum and became the string, so both
   * of them would have compiled the wrong preset and reported the right one.
   * `PRESETS[0]` survives on purpose: that is the row the box OPENS with, which
   * is a claim about position rather than about which sound it is.
   */
````

<a id="fau-21"></a>
## fau-21: demo/fau/index.html, inline script, line 361

````js
    // 🔴 THE INDEX'S OWN LINE, VERBATIM, because this page has a diagram and a
    // paragraph beside a picture of the same machinery is the weaker of the two.
````

<a id="fau-22"></a>
## fau-22: demo/fau/index.html, inline script, line 364

````js
    /**
     * Four cells, and every one of them moves.
     *
     * 🔴 IT WAS SIX UNTIL 2026-09-23 AND IT LOST `sounding` AND `pedal holds`,
     * ASKED FOR TWICE IN ONE STREAM: *"rm slounding / pedal holds"*, then
     * *"rm sounding / pedal holds from readings"*. Four is still EVEN, which
     * `mount()` throws on failing, and the cut cost no asserts: every check
     * about the foot reads `pedal.held()` directly rather than reading the cell
     * it used to print in, which was checked rather than assumed.
     * ⚠️ `compiler` IS DELIBERATELY NOT A CELL. `2.89.2` never changes, and a
     * cell showing a constant reads as a measurement and teaches the reader to
     * ignore the row. It is in the diagram's `libfaust` box, where a fact that
     * does not move belongs.
     * ⚠️ AND THE 6.16 MB DOWNLOAD IS A LOG LINE RATHER THAN A CELL, for the
     * same reason one step along: it happens exactly once per page, and a cell
     * that changes once is not a measurement either.
     * 🔴 THREE OF THE FOUR KEYS CHANGED ON 2026-09-25, AND THE ONE THAT ALREADY
     * SAID `KB` CHANGED TOO. `source` and `machine code` read `B`, `per voice`
     * read `KB` and divided by 1024, so the row carried raw bytes beside a
     * kilobyte that was not the same kilobyte as the log's. All three are `kB`
     * at 1000 bytes now. See the unit block in the header.
     */
````

<a id="fau-23"></a>
## fau-23: demo/fau/index.html, inline script, line 392

````js
    /**
     * 🔴 NO CONTROL ROW AT ALL SINCE 2026-09-24, ASKED AS *"rm compile button
     * next to fau on"*. `shell.mjs` hides an empty `.pos-controls`, which it
     * has to, because that row carries 14 px under it and a band of dead space
     * reads as something that failed to render.
     * ⚠️ AND NO COMPILE BUTTON ANYWHERE SINCE 2026-09-30. `Compile` came back
     * on 2026-09-26 (*"replace it with compile (shimmer). no autocompile"*),
     * moved the same day into the corner of the source, and went on
     * 2026-09-30 when compiling on a pause in the typing replaced it. What
     * sits in that corner now is a note that cannot be pressed.
     */
````

<a id="fau-24"></a>
## fau-24: demo/fau/index.html, inline script, line 406

````js
  /**
   * 🔴 WHAT EACH CELL HAS EVER SHOWN, BECAUSE "EVERY CELL CAN MOVE" IS A CLAIM
   * AND NOT A STYLE NOTE. A cell printing a constant reads as a measurement and
   * teaches a reader to ignore the row, which is why this page has no `compiler`
   * cell. The only way to say a cell moves is to remember what it has held, so
   * every write goes through here and the check reads the sets at the end.
   * ⚠️ THE KEYS COME OFF `d.api.readout` RATHER THAN BEING TYPED AGAIN. A list
   * of cells written twice is a list that will disagree with itself.
   */
````

<a id="fau-25"></a>
## fau-25: demo/fau/index.html, inline script, line 421

````js
  /* ── what a visit costs, counted off the browser's own record ──────────────
     🔴 NOT MY OWN COUNTER. `plan-fau.md` §10.4 asks for "a visit compiles
     nothing and fetches no compiler, asserted over a counter", and the counter
     that cannot be wrong is the browser's: `performance.getEntriesByType`
     records every resource this document actually loaded, which is the far side
     of the boundary. A count the page keeps itself would agree with the page by
     construction, and `positron-verify` records exactly that failure: two
     numbers derived from one field move together and the check passes while
     being wrong. */
````

<a id="fau-26"></a>
## fau-26: demo/fau/index.html, inline script, line 432

````js
  /**
   * ⚠️ TWO SIZES, AND THE PAIR IS THE ANSWER TO AN OPEN QUESTION.
   * `decodedBodySize` is what the file weighs and `encodedBodySize` is what
   * crossed the wire, so the ratio between them says whether whatever served
   * this page compressed it. `plan-fau.md` §11 item 3 could not settle whether
   * Cloudflare brotlis `libfaust-wasm.data`, which has no extension the edge
   * recognises, and the difference is 1.0 MB against 2.9 MB. Opening this page
   * on the deploy and reading its log now answers that.
   */
````

<a id="fau-27"></a>
## fau-27: demo/fau/index.html, inline script, line 444

````js
  // ── the audio graph ────────────────────────────────────────────────────────
  //
  // One context, made on the first touch of the instrument rather than at load:
  // an AudioContext created on a visit is a visit making a sound device busy for
  // a page nobody has put a finger on. The compile moved to the load path on
  // 2026-09-28 and this deliberately did not go with it.
  // 🔴 THE CONTEXT IS THE PAGE'S SHARED ONE SINCE 2026-10-06
  // (`demo/shell/audio.mjs`), so a deck on this page plays into the same
  // device rather than opening a second one. This page builds its own master
  // gain and meter on top of it, and `FAU` below is the owner it claims with.
  // ⚠️ IT IS 48 kHz NOW, WHERE IT WAS THE DEVICE'S OWN RATE. Faust takes the
  // context's rate, so the instrument is the same; `audio.mjs` says why 48000.
````

<a id="fau-28"></a>
## fau-28: demo/fau/index.html, inline script, line 464

````js
    /* 🔴 THE RESUME IS OUTSIDE THE ONCE-ONLY HALF, because a context is
       suspended by more than its own creation: a tab in the background
       suspends one, and so does a switch-off if this page ever grows one. It
       used to sit beside `new AudioContext`, where it ran exactly once in the
       life of the page and could never bring a stopped one back.
       `sharedAudio()` fires that resume on every call after the first, and
       `claim()` fires it on a suspended context. Neither is awaited: `resume()`
       waits on a gesture in a real browser and never rejects, so awaiting it is
       a hang rather than an error. */
````

<a id="fau-29"></a>
## fau-29: demo/fau/index.html, inline script, line 479

````js
    /* 🔴 512, NOT 2048, AND `/nola/` PAID FOR THAT NUMBER. An analyser at 2048
       samples is a 46 ms window, so a reading taken 40 ms after a key came up
       is still half made of samples from before it. That left a check green on a
       build where the release had been replaced with an instant stop. This
       page asks "is it still sounding" within a few tens of milliseconds of a
       pedal moving, which is exactly that question. */
````

<a id="fau-30"></a>
## fau-30: demo/fau/index.html, inline script, line 502

````js
  // ── the compiler, fetched once, on purpose ─────────────────────────────────
  //
  // 🔴 THE COMPILER IS `demo/shell/faust.mjs`'s SINCE 2026-10-06, and so is the
  // `console.error` shim this header's item 2 describes, moved there verbatim:
  // the glue still binds `console.error` once, inside the one await that
  // module wraps, and a captured line still comes back here through `onAbort`
  // below, into this page's log and into `captured`. What stays here is what
  // this page SAYS about the compiler: what it costs, how long it took, and
  // whether whatever served it compressed it.
````

<a id="fau-31"></a>
## fau-31: demo/fau/index.html, inline script, line 536

````js
  // ── the knobs under the text ──────────────────────────────────────────────
  //
  // 🔴 EVERY `hslider`, `vslider` AND `nentry` WRITTEN IN THE BOX, EXCEPT THE
  // THREE A KEY SETS, IS A KNOB IN ONE ROW UNDER THE TEXT, WITH THE PROGRAM'S
  // OWN RANGE, STEP AND STARTING VALUE. Asked 2026-09-30 with `/collide/`
  // (*"can we do it on fau too?"*). They are read out of the compile's own JSON,
  // `voiceFactory.json` and `effectFactory.json`, walked the way faustwasm's
  // `parseUI` walks them, because a visit compiles with no node to ask; the node
  // built from that compile answers the same list from `getParams()`, which the
  // checks below compare. A turn is `node.setParamValue(address, value)`, and
  // on a polyphonic node that reaches EVERY voice: the worklet's
  // `FaustPolyWebAudioDsp.setParamValue` hands a voice path to each of
  // `fVoiceTable` and an effect path to the effect (vendored `faustwasm.mjs`).
  // ⚠️ `freq`, `gain` AND `gate` ARE LEFT OUT BECAUSE `keyOn` WRITES THEM,
  // matched on the address's last part, which is how faustwasm finds them.
  // ⚠️ ONLY WHAT IS WRITTEN IN THE BOX. `pm.clarinet_ui_MIDI` declares eight
  // sliders inside the library and `dm.freeverb_demo` four, and none of them
  // is in the text. A knob for a name nobody can see in the program is a
  // control the text does not explain, and the editor work that colours a
  // name and its knob alike has nothing to colour. So a slider becomes a knob
  // only when its label is typed in a `hslider(`, `vslider(` or `nentry(` here.
  // ⚠️ `[scale:log]` IS THE EXPONENTIAL WARP, which is what Faust's own log
  // scale does to a slider's travel; anything else is linear.
  // ⚠️ THE NAME IS THE SHORTNAME AND THE ADDRESS IS PER COMPILE. The address
  // carries the compile's name (`/sweep_3/cutoff`), which changes every time,
  // so a knob is kept across a recompile by its shortname and the address is
  // looked up afresh on the compile the node was built from.
````

<a id="fau-32"></a>
## fau-32: demo/fau/index.html, inline script, line 585

````js
  /* 🔴 A TURN TRAVELS THROUGH THE PAGE'S BAY, SINCE 2026-10-10. Asked:
     *"implement faust external knobs"*, after *"can fau knobs be outside the
     fau in patchbay or are they internal ones?"*. Each knob is a node of its
     own, `<site>:knob-<name>`, with a `value-out` cabled into the engine's
     `value-in`, and a turn is `bay.send` of `{ of: 'param', name, v }` along
     that cable. The `setParamValue` is the port's `deliver`, below, so a knob
     whose cable is gone moves its dial and nothing else. See `rebuildBay`. */
````

<a id="fau-33"></a>
## fau-33: demo/fau/index.html, inline script, line 602

````js
  /**
   * 🔴 ONE HUE BOOK FOR THE TEXT AND THE KNOBS, ASSIGNED ON A COMPILE THAT
   * WORKED AND NEVER ON A KEYSTROKE (`code-lang.mjs`, `createHueBook`). The
   * code box reads it for each parameter's snippet and this page writes the
   * same number onto each knob as `--param-hue`. Only a slider with a knob
   * gets one: `freq`, `gain` and `gate` are set by a key and stay plain.
   */
````

<a id="fau-34"></a>
## fau-34: demo/fau/index.html, inline script, line 611

````js
  // ── the page's own bay: keys, the engine, the speakers and one node a knob ──
  //
  // 🔴 A FRESH BAY PER COMPILE, BECAUSE THE NAMES COME FROM THE CODE AND
  // `bay.mjs` HAS NO WAY TO TAKE A PORT AWAY. The knob nodes, their cables and
  // the engine's `value-in` names are what the last good compile declared, so
  // after every compile the bay is built again from `knobs.names()`:
  //   - a parameter that is gone takes its node and its cable with it;
  //   - a new one gets a node and a cable into the engine;
  //   - one whose name survives keeps its cable, and the cable keeps its
  //     `sent` and `dropped`, so a count read across a recompile does not
  //     restart. A cable somebody took away (`bay.unlink`) stays away.
  // `createPatchbay` keys a wire by its printed link, which is the same text
  // in the new bay, so the picture keeps its wires too.
  // ⚠️ THE KEYS AND SPEAKERS CABLES ARE DRAWN, NOT ROUTED. A key still calls
  // `press`, which calls `keyOn`, and the picture is told with `pulse`; only
  // the path a knob turn takes goes through this bay.
````

<a id="fau-35"></a>
## fau-35: demo/fau/index.html, inline script, line 700

````js
  // ── compiling ──────────────────────────────────────────────────────────────
  //
  // 🔴 ONE QUEUE, BECAUSE THERE IS ONE COMPILER AND ONE AUDIO GRAPH. The page's
  // own checks press these controls while `demo/verify.mjs` is pressing them
  // too, and two compiles overlapping would swap the node under an assert that
  // had already read the old one. Everything that compiles goes through here in
  // order, and the shell keeps a button busy until its turn has finished.
````

<a id="fau-36"></a>
## fau-36: demo/fau/index.html, inline script, line 715

````js
  /**
   * 🔴 A SECOND COUNTER, AND IT IS NOT `compiles`. That one is part of the
   * NAME a compile is given, so a pinned compile deliberately does not touch
   * it and two runs can share a number. `runs` counts times this function was
   * entered, whatever it was called and whether or not the source parsed, and
   * it is what the autocompile checks read: a claim about when a compile
   * happened has to be measured on a compile rather than on the timer that was
   * supposed to cause one.
   */
````

<a id="fau-37"></a>
## fau-37: demo/fau/index.html, inline script, line 726

````js
  /**
   * 🔴 THE LAST GOOD COMPILE, WAITING FOR A GESTURE, AND THE SPLIT IS WHAT
   * LETS A VISIT COMPILE WITHOUT OPENING A SOUND DEVICE. Until 2026-09-28
   * compiling and reaching the audio thread were one function, so a compile was
   * necessarily an AudioContext and `"compile on loading"` would have been an
   * AudioContext on a visit. `build()` leaves its module here; `attach()` is
   * the only thing in this file that touches a context, and everything that
   * calls it is a gesture.
   * ⚠️ `onThread` IS THE OBJECT AND NOT A FLAG, so `attach()` can tell "the
   * audio is already running THIS compile" from "the audio is running the
   * previous one", which is the difference between a no-op and a swap.
   */
````

<a id="fau-38"></a>
## fau-38: demo/fau/index.html, inline script, line 741

````js
  /**
   * Put the last good compile on the audio thread, opening the audio if this is
   * the first time. Returns whether there is anything on the thread.
   *
   * 🔴 EVERY CALLER IS A GESTURE: a key, a MIDI note, a touch on the panel, or
   * a compile made while the audio was already open. Nothing on the load path
   * reaches this.
   */
````

<a id="fau-39"></a>
## fau-39: demo/fau/index.html, inline script, line 774

````js
      /* The foot survives a recompile and the fingers do not: the new node has
         never been told about any key, so anything the old one was holding is
         gone whatever the page thinks.
         🔴 AND ONLY WHERE THERE WAS AN OLD NODE, WHICH IS NEW ON 2026-09-28
         AND IS NOT TIDINESS. On the FIRST attach the fingers are real: the key
         that opened the audio is under somebody's hand and `press()` recorded
         it a moment ago, so forgetting it here would leave a note that nothing
         can ever let go of. */
````

<a id="fau-40"></a>
## fau-40: demo/fau/index.html, inline script, line 801

````js
    /* 🔴 A FRESH NAME PER COMPILE, BECAUSE libfaust CACHES A FACTORY BY NAME
       AND CODE. MEASURED: recompiling the same pair answers in 0.1 ms off that
       cache against 63 ms for the real thing, so a page that reused one name
       would put a dictionary lookup in a cell labelled `compile`. The name is
       also embedded in the generated module, which is why a check that compares
       byte counts passes its own seven character name in `pin`. */
````

<a id="fau-41"></a>
## fau-41: demo/fau/index.html, inline script, line 818

````js
      /* 🔴 THE OLD INSTRUMENT KEEPS PLAYING. A failed compile must not take the
         sound away: the visitor typed something that does not parse, and a page
         that went silent would have punished them for a typo. */
````

<a id="fau-42"></a>
## fau-42: demo/fau/index.html, inline script, line 837

````js
    /* 🔴 A COMPILE DOES NOT OPEN A SOUND DEVICE. With the audio already open
       the new module goes straight onto the thread, which is what a recompile
       has always done; with it shut, this compile is what the first key press
       will find waiting. `ctx` is the whole test, because it is null exactly
       until somebody has touched the instrument. */
````

<a id="fau-43"></a>
## fau-43: demo/fau/index.html, inline script, line 857

````js
  // ── the text ───────────────────────────────────────────────────────────────
  //
  // 🔴 TYPING AND SETTING ARE TWO DIFFERENT EVENTS. `onType` is a person at
  // the keyboard: it re-counts the bytes and moves the patch selector to
  // `custom` if the text has left its preset. `showSource()` is the page
  // writing into its own box, which happens every time a patch is loaded.
  // Only typing compiles, through the idle module below, and only once it
  // stops; `showSource()` fires no `input` event, so a preset loads without
  // arming it, and `applyPatch()` cancels anything already due.
````

<a id="fau-44"></a>
## fau-44: demo/fau/index.html, inline script, line 866

````js
  /* 🔴 THE KIT'S CODE BOX SINCE 2026-09-30 (`demo/shell/code-box.mjs`,
     `plans/plan-code-editor.md`): the same field textarea, transparent, over
     the program drawn in Faust's colours, with each knob's slider in the
     knob's own hue. Everything below about the caption and the rows is the
     field's and still holds. */
````

<a id="fau-45"></a>
## fau-45: demo/fau/index.html, inline script, line 874

````js
    /* 🔴 THE ACCESSIBLE NAME THE MISSING CAPTION WOULD HAVE CARRIED. */
````

<a id="fau-46"></a>
## fau-46: demo/fau/index.html, inline script, line 876

````js
    /* 🔴 NO CAPTION. `label: ''` builds no span (`field.mjs`, `if (label)`),
       where this page used to build a FAUST label and hide it by rule: a caption
       over a box holding Faust names what a reader is already reading, and the
       title and the patch picker say it again. The accessible name is set below. */
````

<a id="fau-47"></a>
## fau-47: demo/fau/index.html, inline script, line 881

````js
    /* 🔴 TWENTY SINCE 2026-09-25, AND IT HAS NOW MOVED TWICE FOR THE SAME
       REASON. It was 12 until the patches grew comments (*"can you have comments
       in fau file what lines do?"*), where the longest preset was cut through
       the middle of `process`, which is the one line a reader most needs to see.
       It was 16 until the blank lines went in (*"add nl after comments"*) and
       two more presets arrived, which between them added four to six lines to
       every listing that has a comment in it.
       🔴 A BOX SIZED TO THE CONTENT IT USED TO HOLD HIDES THE CONTENT IT HOLDS
       NOW, and that is the whole rule: this number is READ OFF the presets and
       never guessed. RE-MEASURED 2026-09-28, after `Bell` and `Hall` left and
       `Pluck` and `Sweep` arrived, by counting the `code` strings in this file:
       18, 20, 20, 19, 7 and 7 lines, so 20 is still the longest of them and
       this number did not have to move. It read 18, 20, 7, 14, 7 and 17 on
       2026-09-25, which is the same answer off a different list.
       ⚠️ AND IT IS THE LONGEST RATHER THAN A COMFORTABLE AVERAGE, because a
       listing that does not fit is one a visitor has to scroll inside a box
       whose own scrollbar is the least visible thing on the page. */
````

<a id="fau-48"></a>
## fau-48: demo/fau/index.html, inline script, line 915

````js
  /**
   * 🔴 THE LETTERS ARE ON THE BOTTOM OCTAVE, WHICH IS C3 HERE. Asked
   * 2026-09-23: *"default asd keyboard to c3"*. They sat on the middle octave,
   * so `a` played C4 while the keyboard started at C3 and the two octaves below
   * your fingers were reachable only with a mouse.
   * ⚠️ AND THERE ARE STILL ONLY THIRTEEN OF THEM, which is the component's own
   * rule rather than a choice: `QWERTY_CHROMATIC` is one octave plus its top C,
   * `z` and `x` are already the octave pair, and a key labelled with a letter
   * that does nothing is worse than a key with no letter on it. What moved is
   * WHICH octave has them, not how many.
   */
````

<a id="fau-49"></a>
## fau-49: demo/fau/index.html, inline script, line 930

````js
    /* 🔴 READ OFF THE CONSTANT'S VALUES, NOT ITS ORDER, AND THAT MATTERS
       SINCE `l` LANDED. This took `Object.keys()` and handed the nth letter to
       the nth semitone, which was right only while the map had no gaps in it.
       `l` is a D and sits at 14, with the C sharp at 13 belonging to a letter
       nobody has asked for, so a positional read would have put `l` on the
       black key and moved every shape a hand knows one key out. */
````

<a id="fau-50"></a>
## fau-50: demo/fau/index.html, inline script, line 524

````js
    /* 🔴 `Loop` WHILE THE EVOLUTION IS PLUGGED IN (`9c683e2`, asked for every
       keyboard page). A looped note comes back through `onDown` marked `loop`,
       with the velocity a MIDI key played it at when the take heard one. */
````

<a id="fau-51"></a>
## fau-51: demo/fau/index.html, inline script, line 536

````js
    /* 🔴 THE DAMPER IS THE KEYBOARD'S OWN CONTROL NOW, in its footer, where
       every control about the keys belongs. This page drew its own switch in a
       row underneath until 2026-09-23, and so did `/nola/`, which is one
       problem solved twice. What the page still owns is what a foot MEANS:
       `demo/shell/pedal.mjs` holds the note off and the component knows none of
       that. */
````

<a id="fau-52"></a>
## fau-52: demo/fau/index.html, inline script, line 545

````js
  /* 44 px a key rather than the component's 49, for the same reason `/nola/`
     lowers it: two octaves is what an instrument wants and fifteen white keys
     at 49 px do not fit the page. The component reads the property off its
     own box, which is the element that goes into the panel. */
````

<a id="fau-53"></a>
## fau-53: demo/fau/index.html, inline script, line 573

````js
  /**
   * 🔴 THE NOTES A HAND PUT DOWN WHILE THE FIRST NODE WAS STILL BEING BUILT.
   * The first key press is the gesture that opens the audio, and building a
   * worklet out of a compile that is already done is an await: short, measured
   * in the log, and not zero. A note pressed inside that window is remembered
   * here and sent the moment the node exists, and a note LET GO inside it is
   * taken out again, so a press and release faster than the window cannot leave
   * a note sounding that nothing is holding.
   */
````

<a id="fau-54"></a>
## fau-54: demo/fau/index.html, inline script, line 627

````js
  // ── a MIDI keyboard, if there is one ───────────────────────────────────────
  //
  // 🔴 BUILT BY THE SWITCH, NOT BY THE PAGE. `createMidi` asks the browser for
  // access the moment it is constructed, and it was constructed at load until
  // 2026-09-23, so a visit to this page asked a question about a MIDI keyboard
  // that nobody here had pressed anything to deserve. It is the same rule as
  // the 6 MB download beside it, in a thing that costs no bytes: a visit opens
  // nothing.
````

<a id="fau-55"></a>
## fau-55: demo/fau/index.html, inline script, line 647

````js
  /* 🔴 EVERY INPUT PLAYS THIS PAGE UNTIL A LINK ON /patchbay/ SAYS WHICH ONE.
     `createMidi` hears every keyboard on the machine and says nothing about
     which one a message came from, so while a link is open its path is shut
     here and the linked keyboard arrives through `engine` instead
     (`demo/fau/engine-node.mjs`). With no link, which is every visit that
     never presses Join, this is exactly the page it was. */
````

<a id="fau-56"></a>
## fau-56: demo/fau/index.html, inline script, line 664

````js
  // ── on the patchbay, after a press ─────────────────────────────────────────
  //
  // 🔴 AN ENGINE NODE WITH A PROGRAM IN, A MIDI IN AND AN AUDIO OUT, AND NOTHING
  // LEAVES THIS MACHINE (plans/plan-routing-migration.md §2.1, univ §3). Building
  // it opens nothing; the Join on the instrument's foot does, in `?room=` when the
  // page has one, and the run's own room under the harness. A keyboard linked to
  // it there plays it alone, and the badge beside Join says whether its notes are
  // arriving: *"perhaps just visual indication"*, not a patch view.
  // ⚠️ THE PROGRAM IN IS THE TEXT BOX. It is announced so the patchbay draws what
  // the engine is made of; nothing on another page writes it, and a request to
  // carry this page's sound anywhere is refused in words.
````

<a id="fau-57"></a>
## fau-57: demo/fau/index.html, inline script, line 680

````js
  /* 🔴 THE ROOM HEARS THE KNOBS TOO. Whatever graph the engine announces for
     this site (its own `publish`, a Join, a MIDI device arriving) goes out with
     the engine's `value-in`, its names, and one node and `value-out` a knob,
     as the last good compile declared them. `rebuildBay` says it again after
     every compile.
     ⚠️ A STOPGAP AND NOT A DESIGN: it wraps `engine.node.setGraphs` from this
     page because `engine-node.mjs` takes no extra ports and was not this
     change's to edit. Its home is an option on `createEngineNode`.
     ⚠️ ANNOUNCED, NOT LINKABLE FROM ANOTHER PAGE: the engine still refuses a
     `link.request` into anything but its MIDI in, so the cables are this
     page's own. */
````

<a id="fau-58"></a>
## fau-58: demo/fau/index.html, inline script, line 707

````js
  /* 🔴 NO `label`. The picker is the plate row's far end and the panel strips a
     caption off anything handed in there anyway, so this page does not build
     one to be thrown away. `what` stays: it is the arrows' titles and the
     select's own `aria-label`, which is the name a screen reader hears. */
````

<a id="fau-59"></a>
## fau-59: demo/fau/index.html, inline script, line 728

````js
    /* 🔴 NOTHING SELECTED IN THE PLATFORM'S LIST WHILE THE TEXT IS THE
       VISITOR'S, AND IT IS NOT DECORATION. A `<select>` fires `change` only
       when the selection MOVES, so leaving `Organ` selected under the word
       `custom` would make choosing Organ again do nothing at all. That is the
       one gesture somebody in custom is most likely to make. */
````

<a id="fau-60"></a>
## fau-60: demo/fau/index.html, inline script, line 749

````js
  /**
   * Put a preset in the box, and compile it if the instrument is already live.
   *
   * 🔴 TWO FUNCTIONS FOR ONE ACTION, AND THE SPLIT IS THE QUEUE. `loadPatch` is
   * what a control calls and it takes a turn on the compile queue; `applyPatch`
   * is the work, and it is what the check block calls, because a task that
   * waits on another task in the same queue is a deadlock and the symptom is a
   * page that never becomes ready. `build()` is split the same way and for the
   * same reason.
   */
````

<a id="fau-61"></a>
## fau-61: demo/fau/index.html, inline script, line 768

````js
    /* 🔴 A PICK ALWAYS COMPILES SINCE 2026-09-28, AND THAT IS THE PICKER
       STAYING HONEST RATHER THAN EXTRA WORK. It used to refuse unless the
       instrument was already live, which was right while a compile meant
       pulling six megabytes. Now a patch is compiled and waiting before anybody
       touches the page, so refusing here would leave the Organ waiting under a
       selector reading `Djembe`, and the first key would sound the wrong
       instrument. The compiler is in the tab by then, so this costs the tens of
       milliseconds in the `compile` cell and nothing else. */
````

<a id="fau-62"></a>
## fau-62: demo/fau/index.html, inline script, line 787

````js
  // ── compiling what was typed, once the typing stops ─────────────────────
  //
  // 🔴 THE KIT'S IDLE COMPILE SINCE 2026-09-30, AND THE COMPILE BUTTON IS GONE.
  // Asked as *"unify compilation in ui logic on this and fau ant othes.
  // trigger on inactivity? Small breating "Compiling" note (not button) on
  // right bottom i the plae complile button is in fau. a kit comopnent?"*.
  // `demo/shell/compile-idle.mjs` waits `IDLE_MS` after the last keystroke,
  // never runs two compiles at once, compiles the text as it is when the
  // compile STARTS, and breathes `Compiling` in the corner where the button
  // was. This page supplies what a compile is and when it must not happen.
  // ⚠️ `notNow` IS THE HELD NOTE, AND IT IS THE HALF OF THE OLD 800 ms TIMER
  // THAT WAS RIGHT. A compile swaps the node and forgets every key, so under a
  // held finger or a held foot it would take the note away. It waits instead.
  // ⚠️ IT GOES THROUGH `serial` LIKE EVERY OTHER COMPILE ON THIS PAGE, so it
  // queues behind the load compile and a preset pick rather than beside them.
  // ⚠️ AND IT DOES NOT CALL `attach()`. The old button did, because a press is
  // a gesture; an idle compile is not one, so it reaches the audio thread only
  // where a touch has already opened it, which `build()` does by itself.
````

<a id="fau-63"></a>
## fau-63: demo/fau/index.html, inline script, line 809

````js
    /* ⚠️ THE TEXT IS READ INSIDE THE QUEUE'S TURN, NOT WHEN THE TIMER FIRED.
       A preset pick queued ahead of this would otherwise be followed by a
       compile of the text it replaced, and the selector would name one
       instrument over a compile of another. */
````

<a id="fau-64"></a>
## fau-64: demo/fau/index.html, inline script, line 817

````js
  // ── the page ───────────────────────────────────────────────────────────────
  //
  // 🔴 THE INSTRUMENT IS THE KIT'S GLUED PANEL, SINCE 2026-09-26. The text is
  // its picture row, edge to edge by construction, the keys are its keys row,
  // and the foot is its plate: the name at the start and the patch picker at
  // the far end, which is where the component puts a `patch` control and the
  // rule it carries since the same day. The compile note is in the corner of
  // the text, not on the foot, where the Compile button was before it
  // (*"rm compile from footer"*). The name is in the foot because the sketch
  // of 2026-09-26 puts it there (plans/plan-instrument-audit.md). This page
  // has one stylesheet rule of its own, the cluster Join and its badge make
  // beside the name, which moves to `shell.css` when `engine-node.mjs` does.
````

<a id="fau-65"></a>
## fau-65: demo/fau/index.html, inline script, line 840

````js
  /* 🔴 THE PATCHBAY, ITS OWN BLOCK UNDER THE INSTRUMENT. The keys into the
     engine, the engine to the speakers, and one node a knob cabled into the
     engine's `value-in`, which is the cable a turn really travels. A knob
     cable pulses once per turn it carried (the link's own `sent`), the keys
     cable once per key, and the sound cable is lit while anything is heard. */
````

<a id="fau-66"></a>
## fau-66: demo/fau/index.html, inline script, line 851

````js
  /* 🔴 THE FIRST TOUCH ANYWHERE ON THE INSTRUMENT OPENS THE AUDIO, NOT THE
     FIRST KEY, AND THE NUMBER IS WHY. MEASURED 2026-09-28 in headless Chrome on
     this desk: a key pressed as the very first gesture on the page takes
     134 ms to reach the audio thread, which is an AudioContext and an
     `audioWorklet.addModule` and cannot be made faster from inside a page. It
     is paid once, and it is paid on the one note a visitor is listening hardest
     to.
     ✅ SO ANY GESTURE ON THE PANEL PAYS IT INSTEAD: clicking into the code,
     stepping the patch selector, moving the octave. A browser
     grants user activation to the whole document on the first pointer press, so
     by the time a finger reaches a key the node is already there and the note is
     immediate.
     ⚠️ IT IS THE PANEL AND NOT THE DOCUMENT, so a scroll or a tap somewhere
     else on the page opens no sound device. Touching the instrument is the
     gesture; reading the page is not.
     ⚠️ AND IT IS THE CAPTURE PHASE, so it runs before the keyboard's own
     handler rather than after it. That does not make the note that arms it
     instant, because the node still has to be built and that is an await; what
     it makes instant is every gesture after a visitor has touched anything at
     all.
     ⚠️ THE LISTENERS STAY UNTIL THEY ACTUALLY ARM. `arm()` answers null while
     nothing is compiled yet, which is the first fraction of a second of a
     visit, and a listener that removed itself on that touch would leave the
     page back where it started. */
````

<a id="fau-67"></a>
## fau-67: demo/fau/index.html, inline script, line 889

````js
  /* ── the compile a visit gets ─────────────────────────────────────────────
     🔴 ASKED 2026-09-28: *"fau: compile on loading so i can play"*. This is
     that, and it is the whole of it: one compile of the preset the box opens
     with, started here and never again.
     ⚠️ IT IS NOT AWAITED AND NOTHING WAITS FOR IT. The download is network and
     the page paints through it; what blocks is the wasm instantiation and
     libfaust itself, and both of those land after the page is on screen and
     readable. A visitor who starts typing before it finishes loses nothing,
     because the idle compile queues behind this one and compiles what they typed.
     ⚠️ AND IT GOES THROUGH `serial` LIKE EVERYTHING ELSE, so a preset picked
     while it is still in flight queues behind it rather than booting a second
     compiler.
     ⚠️ THE CATCH IS THE HALF THAT MATTERS ON A BAD NETWORK. Six megabytes can
     fail, and a page whose only report of that is an unhandled rejection is a
     page that looks like it is still coming. */
````

<a id="fau-68"></a>
## fau-68: demo/fau/index.html, inline script, line 916

````js
      /* 🔴 THE PERSON TYPING IS NOT A BOX, AND THE FIRST DRAWING GAVE THEM ONE.
         `plan-fau.md` §10.3 asks for a `you` outside the browser holding the ten
         lines of Faust, which is right about the story and wrong about the
         picture: `diagram.mjs` gives every top level box the height of the
         tallest, so a childless box beside a machine with five parts is drawn
         as a 300 px empty slab, and on a phone it was a whole screen of
         nothing. PHOTOGRAPHED at 1100 px and at 390 px before it was changed.
         ⚠️ AND THE HONEST BOX WAS ALREADY THERE: the text is a textarea IN THE
         BROWSER, so it belongs inside that machine like everything else the tab
         runs. What a visitor does is type into it, which is what the arrow out
         of it says. */
````

<a id="fau-69"></a>
## fau-69: demo/fau/index.html, inline script, line 927

````js
      /* ⚠️ `set: true`, BECAUSE KEYS AND A FOOTSWITCH DO NOT FEED EACH OTHER.
         Between two neighbours with no declared link the component draws an
         arrow, which would be a mechanism that does not exist. */
````

<a id="fau-70"></a>
## fau-70: demo/fau/index.html, inline script, line 951

````js
          /* ⚠️ THE RANGE IS ROUNDED TO WHOLE kB AND IT IS A LABEL RATHER THAN A
             READING, which is why it does not carry the readout's two decimals.
             It read `4 to 13KB` until 2026-09-25 and was wrong at both ends:
             MEASURED across the six presets that day, 6.95 to 19.27 kB. The
             live figure is the `machine code` cell, and this says roughly how
             big the thing in the box gets.
             ⚠️ RE-MEASURED 2026-09-28, when `Bell` and `Hall` left and `Pluck`
             and `Sweep` arrived: 7.27 to 21.33 kB, so the top of the range
             moved and the bottom did not. `Sweep` is the widest because it
             carries a real reverb on its effect line. */
````

<a id="fau-71"></a>
## fau-71: demo/fau/index.html, inline script, line 1004

````js
    /* 🔴 THE CHEAP ONES FIRST, AND THAT IS A HARNESS FACT RATHER THAN A STYLE.
       `demo/verify.mjs` gives up about two seconds after the last new assert,
       and this page's first compile is behind a 6 MB fetch. A check block whose
       first assert lands three seconds in reads as a page that asserted
       nothing, which is what `/nola/` measured on 2026-09-23. */
````

<a id="fau-72"></a>
## fau-72: demo/fau/index.html, inline script, line 1009

````js
    /* 🔴 THE RULE THE LOAD COMPILE RUNS STRAIGHT INTO, GRADED RATHER THAN
       ARGUED. A visit here may compile because every byte it pulls is this
       repository's own, off this origin; what CLAUDE.md refuses is a visit that
       opens somebody else's thing, and `/reel/` was reaching a broadcaster.
       That is a claim about WHERE the requests went, so it is read off
       `performance.getEntriesByType('resource')`, which is every resource this
       document really loaded rather than a list this page keeps.
       ⚠️ AND THE COUNT IS THE NEGATIVE HALF. A page that had loaded nothing at
       all would pass "no foreign host" vacuously, and this assert runs in the
       first milliseconds of a visit, which is exactly when that is nearly true.
       ⚠️ IT WAS `a visit fetches no compiler at all` UNTIL 2026-09-28. The
       claim moved rather than the rule: what a visit may not do is spend
       somebody else's server, and it never did. */
````

<a id="fau-73"></a>
## fau-73: demo/fau/index.html, inline script, line 1029

````js
    /* 🔴 THE HALF OF THE OLD RULE THAT DID NOT MOVE, AND IT IS THE ONE ABOUT
       HARDWARE. A compile is arithmetic; a context is a sound device and a MIDI
       request is a question put to somebody. None of the three may happen
       before a gesture, and the load compile deliberately reaches none of them:
       `build()` stops at `ready` and `attach()` is the only thing in the file
       that touches a context.
       ⚠️ IT WAS FOUR CLAIMS UNTIL 2026-09-24 and the fourth read a compile
       button's `disabled`; it was four again until 2026-09-28 and the fourth
       was `runs === 0`, which has stopped being true on purpose. */
````

<a id="fau-74"></a>
## fau-74: demo/fau/index.html, inline script, line 1043

````js
    /* 🔴 THE CELL IS ROUND-TRIPPED THROUGH 1000 RATHER THAN COMPARED AGAINST
       `kb()`, AND THAT IS THE WHOLE POINT OF THIS ASSERT. The first version
       read `d.api.readout.source === kb(bytes)`, which is two numbers out of
       one field: change `kb()` to divide by 1024 and the cell and the expected
       value move together and this stays green, which is the failure
       `positron-verify` records about a check whose halves share a bug.
       Multiplying the printed value back by 1000 tests the LADDER instead.
       ⚠️ AND THE TOLERANCE IS DERIVED, NOT PICKED. Two decimals of a kB is
       five bytes of rounding at any magnitude, so the round trip through 1000
       can never miss by more than 5 and a round trip through 1024 misses this
       source by 15. MEASURED on the Organ: 765 B prints 0.77 and comes back
       770, against 0.75 and 750. */
````

<a id="fau-75"></a>
## fau-75: demo/fau/index.html, inline script, line 1064

````js
    /* ── the panel, read off rects ─────────────────────────────────────────
       🔴 FOUR CLAIMS THIS PAGE NEVER GRADED, added with the move onto the kit's
       panel. Each is a rect pair, because this is the page whose text box was
       reported five times and fixed wrong three times by reading rules. */
````

<a id="fau-76"></a>
## fau-76: demo/fau/index.html, inline script, line 1084

````js
      /* 🔴 THE FOOT SINCE 2026-09-26: the name on the left inset, the patch
         selector on the right inset with no caption, and the compile note NOT
         in it.
         Its `display` is read COMPUTED rather than off `hidden`, because a foot
         with nothing left in it must paint nothing, and only the computed value
         says whether a box is being drawn. This one still holds two ends. */
````

<a id="fau-77"></a>
## fau-77: demo/fau/index.html, inline script, line 1104

````js
      /* 🔴 THE COMPILE NOTE SITS WHERE THE BUTTON SAT, AND IT IS NOT A BUTTON.
         Read here, in the first milliseconds, because the load compile is
         behind a six megabyte download and the note is breathing over it, so
         this is the one moment a visit can see it without anybody typing. The
         rect pair is the note against the text box, on the insets the rows
         keep, the same numbers the Compile button was graded on.
         ⚠️ `animationName` IS READ COMPUTED, because a note that says
         Compiling and does not breathe is the ask half done, and the only
         thing that knows which rule won is the browser. Reduced motion names
         `none`, and the harness does not ask for it. */
````

<a id="fau-78"></a>
## fau-78: demo/fau/index.html, inline script, line 1132

````js
    /* 🔴 THE UNIT ITSELF, ASSERTED, BECAUSE THE ASK WAS ABOUT THE UNIT AND
       NOTHING ELSE ON THIS PAGE WOULD NOTICE ONE GOING BACK. Three of the four
       cells are sizes and all three have to say `kB`; `compile` is a time and
       has to stay `ms`, which is the negative half and is why this names all
       four rather than counting how many say kB. A cell relabelled to `B` or to
       `KB` takes this red on its own, and so would a sweep that renamed the lot.
       ⚠️ READ OFF THE RENDERED CELL AND NOT OFF THE `readout` OBJECT THIS PAGE
       HANDED `mount()`, WHICH WAS THE FIRST TRY AND IS TWO NUMBERS FROM ONE
       FIELD. `api.readout` is values rather than units, and the map in this
       file would agree with itself whatever reached the screen. `shell.mjs`
       puts the unit in a `.pos-u` inside the cell, so that is the far side of
       the boundary and it is what a reader is looking at. */
````

<a id="fau-79"></a>
## fau-79: demo/fau/index.html, inline script, line 1158

````js
    /* 🔴 THE LISTING'S OWN FORMAT, GRADED, BECAUSE A FORMAT NOTHING CHECKS IS A
       FORMAT THAT COMES BACK. Asked 2026-09-25 as *"add nl after comments"* and
       scoped by the owner to these six sources: a comment on its own line is
       followed by a blank line before the code it introduces. A run of comment
       lines is ONE comment and takes one blank after the run, so a comment
       followed by another comment is not a violation.
       ⚠️ AND THE NEGATIVE HALF IS COUNTING THE COMMENTS, because `nothing out
       of place` is vacuously true of a listing with no comments in it at all,
       and deleting them is the cheapest way to make this assert stop meaning
       anything. Both counts have to survive: own-line comments, which this
       grades, and TRAILING ones, which must stay on their code line and are
       exactly what the format does NOT apply to. MEASURED 2026-09-25: 16 and
       21. RE-MEASURED 2026-09-28 over the six listings as they stand now, two
       of them new: 18 and 22, and nothing out of place. */
````

<a id="fau-80"></a>
## fau-80: demo/fau/index.html, inline script, line 1195

````js
    /* ⚠️ THIRTY CHARACTERS IS 0.03 kB, WHICH THE CELL CAN SHOW AND ONLY JUST.
       That is what set the two decimals in the header's unit block: at one
       decimal this assert would be comparing `0.76` against `0.76` and would go
       red on a page where the typing worked perfectly. */
````

<a id="fau-81"></a>
## fau-81: demo/fau/index.html, inline script, line 1205

````js
    /* ── the ask itself, which is everything above this line being true while
         a whole instrument was quietly compiled ────────────────────────────
       🔴 *"fau: compile on loading so i can play"*, 2026-09-28. Every assert
       before this one is deliberately cheap and lands in the first
       milliseconds, because `demo/verify.mjs` gives up after five quiet polls
       and this wait is a six megabyte download. The wait itself is here rather
       than at the top for the same reason.
       ⚠️ AND WHAT IS ASSERTED IS THE PAIR: the compiler is in the tab AND
       nothing was pressed to get it there. Either half on its own is satisfied
       by the page this replaced. */
````

<a id="fau-82"></a>
## fau-82: demo/fau/index.html, inline script, line 1227

````js
    /* 🔴 AND THE NOTE GOES WHEN THE COMPILE IS DONE, READ AS `display`.
       `hidden` is an attribute and `.pos-cnote` sets `display: flex`, so only
       the computed value says the corner is empty rather than drawing a note
       that has stopped meaning anything. `settled()` includes the note's half
       breath minimum, so this is read after it has had its chance to go. */
````

<a id="fau-83"></a>
## fau-83: demo/fau/index.html, inline script, line 1237

````js
    /* ── the patch selector's fourth state ─────────────────────────────────
       🔴 DRIVEN BY A REAL `input` EVENT, NOT BY CALLING THE HANDLER. What is
       being claimed is that TYPING moves the selector, and a check that calls
       `onType()` itself grades the function rather than the wiring between the
       textarea and it. `positron-verify` records the same thing about a meter
       gated on intent: drive the gesture.
       ⚠️ AND IT ALL HAPPENS WHILE THE INSTRUMENT IS OFF, so it costs nothing:
       nothing here compiles, which is also the second reading of the assert
       above. */
````

<a id="fau-84"></a>
## fau-84: demo/fau/index.html, inline script, line 1057

````js
    /* ⚠️ WHAT THE CONTROL DRAWS, NOT WHAT THIS PAGE BELIEVES. `picked` is the
       page's own idea and would agree with itself whatever the control showed,
       which is two numbers from one field. `createPicker` publishes `show()`
       and not what it is showing, so the drawn name is read off the
       component's own class. `createNameplate` grew a `shown()` for exactly
       this reason and the picker has not; it is worth one line in the kit and
       is not this page's to add today. */
````

<a id="fau-85"></a>
## fau-85: demo/fau/index.html, inline script, line 1075

````js
    /* 🔴 AND WHAT IS WAITING FOR THE FIRST KEY IS THE PRESET THE SELECTOR
       SHOWS, WHICH IS A NEW CLAIM ON 2026-09-28. This read `runs === 0` while a
       pick could not compile at all; now a pick recompiles, and the thing worth
       grading is that the two agree. A selector naming one instrument over a
       compile of another is the lying control this project has a rule about,
       and it is the defect the old refusal would have shipped. */
````

<a id="fau-86"></a>
## fau-86: demo/fau/index.html, inline script, line 1087

````js
    /* ── typing compiles once, after the typing stops ──────────────────────
       🔴 INVERTED 2026-09-30. This graded the absence of an autocompile (*"no
       autocompile"*, 2026-09-26); the ask of 2026-09-30 put one back, so what
       is graded now is its SHAPE: two keystrokes 300 ms apart, nothing
       compiled inside the idle wait after the last of them, and exactly ONE
       compile after it, of the text as it stood at the end. Driven by a real
       `input` event and counted on `runs`, which is incremented by the
       compile itself rather than by the timer that was supposed to cause one.
       ⚠️ THE TWO KEYSTROKES ARE CLOSER THAN `IDLE_MS` ON PURPOSE. A timer that
       did not re-arm on every keystroke would compile the first one and then
       the second, and the count would read two. */
````

<a id="fau-87"></a>
## fau-87: demo/fau/index.html, inline script, line 1111

````js
    /* ── "so i can play", as one assert ────────────────────────────────────
       🔴 THE FIRST KEY IS THE WHOLE OF SWITCHING THIS ON. No button in
       between, no six megabytes in between, and no compile in between: the
       press buys a worklet node out of a module that is already built, and the
       `runs` delta of zero is what says so. Before 2026-09-28 the same press
       logged *"nothing is on the audio thread, so switch FAU on"*, naming a
       switch that had been deleted four days earlier.
       ⚠️ `press()` IS WHAT THE KEYBOARD'S OWN `onDown` CALLS, which is the
       same road a finger takes and is how the existing sound check drives this
       page. What it returns is the arming, so this reads the instrument after
       the node exists rather than 20 ms early. */
````

<a id="fau-88"></a>
## fau-88: demo/fau/index.html, inline script, line 1124

````js
    /* 🔴 A POINTER ON THE PANEL AND NOT ON A KEY, WHICH IS THE ROAD THE 134 ms
       LIVES ON. `arming` is read BEFORE anything in this block calls `arm()`,
       because what is being claimed is that the LISTENER did it: a check that
       armed the audio itself and then asserted the audio was armed would be
       green with both listeners deleted. */
````

<a id="fau-89"></a>
## fau-89: demo/fau/index.html, inline script, line 1138

````js
    /* 🔴 AND THEN THE KEY IS FREE, WHICH IS THE WHOLE OF *"so i can play"*. The
       press does no work at all: no fetch, no compile, no node, so the time it
       takes is the time a function call takes and the sound is already on its
       way. MEASURED by the clock around the call rather than claimed. */
````

<a id="fau-90"></a>
## fau-90: demo/fau/index.html, inline script, line 1155

````js
    /* ── typing under a held note waits for the key to come up ────────────
       🔴 THE HALF OF THE OLD 800 ms TIMER THAT WAS RIGHT, GRADED BOTH WAYS.
       With the audio open and a key down, a compile swaps the node and
       forgets the key, so the note under a finger would stop. So: type, wait
       well past `IDLE_MS`, and the compile must still not have happened, the
       node must be the same object, and the note must be breathing, because
       a due compile nobody can see is a page that looks like it ignored the
       typing. Then the key comes up and the compile runs, once, onto a new
       node.
       ⚠️ THE NEGATIVE HALF IS WHAT MAKES THIS A CHECK. A module that ignored
       `notNow` compiles inside the first wait and takes the first assert red;
       one that dropped the compile instead of waiting takes the second red.
       ⚠️ `press()` AND `lift()` ARE THE KEYBOARD'S OWN ROAD, so `holding()`
       counts this finger exactly as it counts a real one. */
````

<a id="fau-91"></a>
## fau-91: demo/fau/index.html, inline script, line 1188

````js
    /* ── from here on it costs the compiler, and it is ONE task on the queue ──
       🔴 EVERYTHING BELOW RUNS INSIDE `serial`, AND NOT ONE `serial` PER
       COMPILE, WHICH IS HOW IT WAS FIRST WRITTEN. Per-compile queueing left
       every `await sleep` in here as a hole another compile could fall through:
       MEASURED as `0 on the foot` where the check had just put one note there,
       on a page where the pedal was working. The first run passed, which is
       worse than failing.
       ⚠️ WHAT FELL THROUGH IT THEN WAS `demo/verify.mjs` PRESSING EVERY CONTROL
       IN THE ROW 650 ms APART, each preset press a compile that builds a new
       node and calls `pedal.forgetKeys()`. **That row is empty since 2026-09-24
       and the harness presses nothing here now.** The arrangement stays, because
       what makes a hole dangerous is that anything at all can compile while this
       block sleeps, and the autocompile still can.
       ⚠️ SO `build()` IS CALLED DIRECTLY IN HERE, NEVER THROUGH `serial`. A
       task that waits on another task in the same queue is a deadlock, and the
       symptom would be a page that never becomes ready.

       🔴 THE SEVEN CHARACTER NAMES ARE LOAD-BEARING. See `PINNED`: the module
       name is embedded in the generated wasm, so two compiles are only
       comparable by byte count when their names are the same length. */
````

<a id="fau-92"></a>
## fau-92: demo/fau/index.html, inline script, line 1218

````js
    /* ⚠️ THE ONE ABOVE KEEPS ITS BYTES, AND IT IS THE SECOND OF THE TWO THE
       UNIT RULE NAMES. `to the byte` is the claim; at 0.01 MB of resolution a
       file arriving 4,000 bytes short would read as having arrived. */
````

<a id="fau-93"></a>
## fau-93: demo/fau/index.html, inline script, line 1221

````js
    /* ⚠️ `ten lines` UNTIL 2026-09-25. The blank-line ask took the Organ to 18
       lines and the longest preset to 20, so the number in this sentence had
       stopped being true of anything in the list. */
````

<a id="fau-94"></a>
## fau-94: demo/fau/index.html, inline script, line 1227

````js
    /* 🔴 THE `checkCompiledDefs` IDEA AT RUNTIME. One known source under one
       known name is exactly this many bytes, or something about the compiler,
       its flags or this page's arguments has moved.
       ⚠️ AND IT IS THE FIRST OF THE TWO ASSERTS THE UNIT RULE EXEMPTS. A
       fingerprint rounded to 10 bytes is not a fingerprint, and this one has
       already earned its resolution once: see `PINNED`, where it caught a 78
       byte difference that was a NAME rather than a change to the instrument. */
````

<a id="fau-95"></a>
## fau-95: demo/fau/index.html, inline script, line 1240

````js
    /* 🔴 THE PAGE'S WHOLE CLAIM, AS ONE ASSERT. Editing the text has to change
       the bytes the audio thread is running. A page that compiled the same
       module whatever it was handed would pass every other check here. */
````

<a id="fau-96"></a>
## fau-96: demo/fau/index.html, inline script, line 1256

````js
    /* 🔴 AND THE HALF THAT SAYS THE SHIM WORKED IS THE PAIR OF THEM. A count on
       its own could be satisfied by a page that captures nothing and lets
       everything through, which is why the good compile above asserts ZERO
       captured lines. Nothing reaching the console is measured independently,
       by `demo/verify.mjs`'s own `no console errors`, which is on the far side
       of the boundary and would go red if one leaked. */
````

<a id="fau-97"></a>
## fau-97: demo/fau/index.html, inline script, line 1265

````js
    /* ⚠️ COMPARED BY `size` RATHER THAN BY BYTES, because this one is named
       after the button and the byte count carries its name's length. */
````

<a id="fau-98"></a>
## fau-98: demo/fau/index.html, inline script, line 1289

````js
    /* 🔴 600 ms, AND THE NUMBER IS THE PRESET'S OWN RELEASE PLUS A MARGIN. The
       organ's `en.adsr` releases over 0.35 s, so a reading taken 200 ms after a
       key came up is still mostly a note that IS ending, and an assert on it
       passes whether the pedal worked or not. MEASURED by sabotage: with the
       release sent straight to the engine, this read 0.03028 against a 0.03940
       threshold, which is the right answer arriving by 9 thousandths. Past the
       release there is no ambiguity left to be lucky with. */
````

<a id="fau-99"></a>
## fau-99: demo/fau/index.html, inline script, line 1313

````js
    /* 🔴 THE ONE THAT WOULD CATCH `plan-fau.md` §4.2's BUG. With the pedal down
       and every voice spoken for, the notes the foot is holding must all still
       be sounding: the allocator only steals a voice it thinks has been
       released, and it is never told. A page that put the pedal inside the DSP
       instead would lose them one by one under a chord. */
````

<a id="fau-100"></a>
## fau-100: demo/fau/index.html, inline script, line 1345

````js
    /* 🔴 THE TWO ONE-LINE MODELS SIDE BY SIDE, WHICH IS THE `a dictionary
       rather than magic` ARGUMENT AT ITS SHARPEST AND WAS GRADED BY NOTHING
       UNTIL THE CLARINET ARRIVED ON 2026-09-25. Both are a single `pm.` name
       out of the same library and both are about a quarter of a kB of source,
       and what they keep PER VOICE differs by nearly five hundred times: a
       struck skin holds almost no state and a blown tube is a delay line. The
       page's own sentence about compression is true of the drum and would be
       read as true of every library model without this beside it.
       ⚠️ FOUND BY `id` RATHER THAN BY INDEX, and `byId` is declared beside
       `PRESETS` since 2026-09-28, where the header on it records what an index
       cost the two checks above this one. */
````

<a id="fau-101"></a>
## fau-101: demo/fau/index.html, inline script, line 1364

````js
    /* 🔴 THE THIRD POINT ON THE SAME AXIS, AND IT IS THE ONE `Pluck` IS FOR.
       The two checks above read the `per voice` cell off a drum and a reed to
       show that a library name says nothing about what a voice KEEPS. The
       string is the third answer and it is a different KIND of answer: the
       drum's 0.57 kB is a handful of numbers, the organ's 262.26 kB is a sine
       table `os.osc` carries, and this is a BUFFER, one lap of sound long,
       because a delay line that feeds itself has to hold the lap. So the cell
       separates three mechanisms rather than two sizes.
       ⚠️ AND IT IS BRACKETED ON BOTH SIDES, because `bigger than the drum`
       alone is satisfied by anything with an oscillator in it, which is most of
       this page. MEASURED 2026-09-28: 16.47 kB, against the drum's 0.57 and the
       organ's 262.26. */
````

<a id="fau-102"></a>
## fau-102: demo/fau/index.html, inline script, line 1383

````js
    /* 🔴 THE ONE CLAIM ONLY THE PRESET WITH A REAL `effect` LINE CAN MAKE.
       Five of the six end with `effect = _, _;`, which this file's header calls
       NOT DECORATION and which nothing on this page demonstrated until
       2026-09-25. An effect runs ONCE on the mix rather than once per voice, so
       a real room on that line is thousands of bytes of extra machine code and
       not one byte of extra voice. A page that quietly compiled the effect per
       voice would pass every other check in this block.
       🔴 THE CONTROL IS THE SAME PATCH WITH THE ROOM TAKEN OFF, WHICH IS NEW ON
       2026-09-28 AND IS THE STRONGER SHAPE. Until then this compared `Hall`
       against the ORGAN, two different sources, so `more machine code` was a
       claim about two patches rather than about the effect line, and it only
       held at all because `Hall` was the Organ typed out again. Here one string
       differs from the other by its last line, so the difference in the answer
       cannot be anything else.
       ⚠️ SEVEN CHARACTERS EACH, because these two byte counts are compared with
       each other and a module's name is embedded in it. See `PINNED`. */
````

<a id="fau-103"></a>
## fau-103: demo/fau/index.html, inline script, line 1408

````js
    /* 🔴 EVERY PRESET IN THE LIST, WHICH IS THE ONLY THING THAT CATCHES ONE
       THAT DOES NOT COMPILE. The checks above name five of the six now and the
       Rhodes is nobody's subject, and every preset this page has ever gained
       arrived with an ask that said *"(add more)"*, *"add more patches if you
       have"* or *"btin somehintg instresting"*: nothing else in this block
       would have compiled them, so a preset that does not parse would have
       shipped and the first person to find out would be a visitor picking it.
       A list is exactly where a broken member hides. */
````

<a id="fau-104"></a>
## fau-104: demo/fau/index.html, inline script, line 1431

````js
    /* ── the knob under the text ─────────────────────────────────────────────
       ⚠️ OUTSIDE THE `serial` TURN ABOVE, BECAUSE IT RECOMPILES BY TYPING, and
       the idle compile takes a turn on the same queue: inside that turn it
       would wait for the turn it is in. MEASURED on the first run of this
       block, the compile never started and every check after it was lost.
       🔴 READ OFF THE SCREEN AND OFF THE LIVE NODE, AND TURNED THROUGH THE
       KNOB'S OWN KEYS. A keydown on the dial is what a person's arrow key does,
       and it goes through the component, the warp, `onChange` and
       `setParamValue`. Home is the bottom of the travel, which is 100 Hz. */
````

<a id="fau-105"></a>
## fau-105: demo/fau/index.html, inline script, line 1443

````js
    /* 🔴 THE ROW DOES NOT MOVE THE KEYS. Asked 2026-09-30: *"make the area h
       for thise buttons fixed so no junmp"*. The keys' top is read with a
       patch with no knob, and again with the Sweep, which has three.
       ⚠️ THE EMPTY ONE WAS THE ORGAN UNTIL EVERY TYPED PATCH GOT KNOBS the same
       day. The Djembe keeps none: its controls are the library's and none is
       typed in the box, which is the rule `readKnobs` applies. */
````

<a id="fau-106"></a>
## fau-106: demo/fau/index.html, inline script, line 1461

````js
    /* 🔴 ONE HUE, READ OFF THE SCREEN ON BOTH SIDES. The snippet's
       `--param-hue` is the code box's, the knob's is this page's, and the two
       have to be the same number from the same book; the knob's name is drawn
       in the ink its arc is. `freq`, `gain` and `gate` are sliders in the text
       with no knob, so they carry no hue. */
````

<a id="fau-107"></a>
## fau-107: demo/fau/index.html, inline script, line 1490

````js
      /* 🔴 THE CODE BOX'S ONE INVARIANT, READ OFF THE RENDERED ELEMENTS: the
         coloured layer holds exactly the textarea's text at its metrics. */
````

<a id="fau-108"></a>
## fau-108: demo/fau/index.html, inline script, line 1528

````js
    /* 🔴 AND THE TURN WENT THROUGH THE BAY. Every `setParamValue` it caused is
       one the cable from `knob-cutoff` into the engine's `value-in` carried,
       counted on the link's own `sent`, so a knob that still reached the node
       directly would read 0 here. */
````

<a id="fau-109"></a>
## fau-109: demo/fau/index.html, inline script, line 1540

````js
    /* ⚠️ AN ASSERT HERE, BECAUSE THE RECOMPILE BELOW IS THE IDLE WAIT PLUS THE
       NOTE'S OWN MINIMUM, and a check block quiet for two seconds is cut off
       with everything after it lost and the run still green. MEASURED on the
       first run of this block: the seven asserts after this point went. */
````

<a id="fau-110"></a>
## fau-110: demo/fau/index.html, inline script, line 1569

````js
    /* 🔴 THE INVISIBLE HAND TURNS IT ON THE NODE. Asked 2026-09-30: *"add
       invisible hands to these cutoff buttons"*. From the bottom of the
       travel, the hand's button pressed and pressed again, and then the live
       node is ASKED what cutoff is: its answer is the knob's value, and the
       page counted `setParamValue`s from the hand. A hand that moved the dial
       and not `onChange` sends none, and the node would still say 100. */
````

<a id="fau-111"></a>
## fau-111: demo/fau/index.html, inline script, line 1584

````js
      /* ⚠️ ONE BEAT BEFORE THE NODE IS ASKED. `getParamValue` reads the
         AudioParam's `value`, which the audio thread updates when it renders
         the next 128 frames after `setValueAtTime`, so a hand step sent in the
         same task as this read is reported one step stale. MEASURED 2026-10-06:
         `cutoff 109 after 74 setParamValue, the node says 108`, red once in
         two runs with nothing about the knob or the node wrong. 50 ms is
         eighteen render quanta at 48 kHz and the hand is already stopped. */
````

<a id="fau-112"></a>
## fau-112: demo/fau/index.html, inline script, line 1602

````js
    /* ── the knobs are bay nodes, and they follow the code ─────────────────
       🔴 A RECOMPILE THAT RENAMES A PARAMETER TAKES ITS KNOB NODE AND CABLE
       AWAY AND LAYS NEW ONES, and the knob whose name survives keeps its
       cable and the cable's count. `res` becomes `reso` by its label, so the
       program is the same sound with one name changed. */
````

<a id="fau-113"></a>
## fau-113: demo/fau/index.html, inline script, line 1626

````js
      /* 🔴 NEGATIVE CONTROL: THE CABLE IS THE PATH. With the cutoff cable
         unlinked the dial still turns and the node is not told: no
         `setParamValue`, and the live node still says 8000. Then the cable is
         laid again and the same turn reaches the node, so the control can see
         a send when there is one. */
````

<a id="fau-114"></a>
## fau-114: demo/fau/index.html, inline script, line 1651

````js
    /* ── and typing into a LIVE instrument swaps the node after the pause ───
       🔴 INVERTED 2026-09-30, AND IT WAS THE STRONGER HALF OF *"no
       autocompile"*: it typed into the compiled Organ and read the thread as
       well as the counter, asserting the same node object at 500 ms and at
       1.4 s. Its shape is kept and its answer turned over: nothing inside the
       idle wait, then exactly one compile, and a DIFFERENT node on the
       thread, because a compile that never reached the audio would be a note
       that says Compiling about a sound nobody hears.
       ⚠️ SPLIT AT HALF THE WAIT FOR THE HARNESS. A check block that waits
       longer than a few quiet polls without asserting is cut off and
       everything after it is lost while the run stays green (LESSONS #113). */
````

<a id="fau-115"></a>
## fau-115: demo/fau/index.html, inline script, line 1684

````js
    /* 🔴 EVERY CELL HAS MOVED BY NOW OR ONE OF THEM IS A CONSTANT. This is the
       only assert on the page that can say a readout row is worth looking at,
       and it is read off what was written rather than off what is on screen now:
       a cell's CURRENT value says nothing about whether it has ever changed. */
````

<a id="fau-116"></a>
## fau-116: demo/fau/index.html, inline script, line 1700

````js
  /**
   * 🔴 THE PATCHBAY HALF, LAST, BECAUSE IT PLAYS NOTES AND EVERY CHECK ABOVE
   * COUNTS THEM. The round trip runs in an IN-MEMORY room with a stand-in
   * MIDIAccess (`memoryRelay`, `standInAccess`), so a run opens no socket, asks
   * the browser for no MIDI and puts nothing on anybody's desk. What it proves is
   * this page's half: the graph it announces, the answer it gives a
   * `link.request`, the gate on every other input, and the badge. The relay is
   * graded by `/patchbay/` and `/partitur/`.
   */
````

<a id="fau-117"></a>
## fau-117: demo/fau/index.html, inline script, line 1760

````js
    /* 🔴 THE ROOM HEARS THE KNOBS, AND A RECOMPILE IS ANNOUNCED. Read off what
       the other page's registry holds, not off this page's own graph: the
       engine's `value-in` with the program's names, and one knob node with a
       `value-out` each. The Djembe types no slider, so after it the names are
       empty and no knob node is announced; the Organ is put back after. */
````

<a id="fau-118"></a>
## fau-118: demo/fau/index.html, inline script, line 1797

````js
  /* 🔴 `ready()` AFTER THE CHECKS ARE STARTED AND NOT AT THE END OF THEM.
     `demo/verify.mjs` waits up to six seconds for `__demo.ready` before it
     touches the page, so a ready at the end of a check block that fetches a
     compiler is a page waiting for a harness that is waiting for the page. */
````
