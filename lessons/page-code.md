# Page comments: code

The full comments cut from the code under demo/ for code, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="code-1"></a>
## code-1: demo/code/collide-voice.mjs, module, line 1

````js
// demo/code/collide-voice.mjs: the voice /code/collide/ and
// /remote/collide/ play, a program in /collide/'s small subset of
// SuperCollider, compiled in the tab and run on wasm scsynth.
//
// Asked 2026-10-12 (BACKLOG, "synth/090 Collide synth and synth/100"): *"do 090
// synth, similar to 080 but with collide, local. 2 parameters that make sense.
// 100 is same but with local and rasperry pi rendering"*. Both pages play ONE
// program, so it lives here once rather than twice.
//
// WHAT IS SHARED AND WHAT IS NOT. The compiler is `/shell/sclang-lite.mjs`
// and the engine is `/shell/scsynth.mjs`, both the kit's, both what /collide/
// runs. What is here is what /collide/ keeps inline in its page: one `/s_new`
// per key, `/n_set gate 0` on letting go, `/n_set` of a knob to every node
// still sounding, `/n_end` taking a node off the list. ⚠️ A COPY OF THAT
// LOGIC, reported as a kit candidate (`demo/shell/collide-voice.mjs`): this is
// the third place a page drives scsynth note by note (/collide/, sc-sampler.mjs,
// here), and a page agent may not write `demo/shell/`.
//
// THE TWO KNOBS, AND WHY THESE TWO. The program is a plucked bass and lead:
// two saws through a resonant low pass whose cutoff starts high and falls back
// to the note. What a player reaches for on a voice like that is how bright the
// pluck is and how long it rings, so:
//   bright   how far above the note the filter opens at the start, 0 (the
//            cutoff sits at twice the note, a dark thud) to 1 (24 times the
//            note, a bright snap). It changes the TONE and not the length.
//            ⚠️ The floor is twice the note and not the note: at rq 0.3 a
//            cutoff ON the fundamental is a resonant boost of it, and the dark
//            end measured 8.5 dB LOUDER than the bright one (-26.8 against
//            -35.3 dBFS), which reads as a level knob rather than a tone one.
//   decay    the seconds the volume and the filter take to fall from the
//            attack to the quiet sustain. It changes the LENGTH and not the
//            tone at the attack.
// Two knobs that do not overlap, so each one's effect can be heard on its own
// and measured on its own (the pages measure both).
//
// NOTHING OPENS ON A VISIT. Constructing this compiles the text in JavaScript
// (no fetch, no context, about a millisecond) so the page can show the knobs
// and the definition's size. `warm()` fetches the engine (our origin) on
// intent, and `wake(ctx)` boots it, which a page calls on the first key.
````

<a id="code-2"></a>
## code-2: demo/code/collide-voice.mjs, module, line 70

````js
/**
 * One engine playing PROGRAM, or whatever `load(text)` last compiled.
 * @param {object} [o]
 * @param {(line: string, kind?: string) => void} [o.log]
 * @param {string} [o.who]  what the log calls this engine
 *
 * 🔴 AN EDIT REPLACES THE VOICE FOR THE NEXT NOTE, AND A HELD NOTE FINISHES
 * ON THE ONE IT STARTED WITH. Asked 2026-10-12, *"make 090 editable"*. Every
 * compile is sent under the one name `DEF`, as /collide/ does, and scsynth
 * keeps the old graph for a node already running until that node ends; a
 * note's `/n_set gate 0` still reaches it, and how it is let go is read off
 * the program it started on (`held` keeps that), not the one loaded since.
 * A failed compile changes nothing: `compiled` stays the last good one.
 *
 * THE KNOBS FOLLOW THE NAMES, NOT THE PROGRAM. `values` is keyed by the knob
 * names PROGRAM declares (the page's knobs are fixed), and a key sends all of
 * them in its `/s_new`; a name the loaded program does not have is a control
 * scsynth ignores, so that knob drives nothing, which `drives(name)` says.
 */
````

<a id="code-3"></a>
## code-3: demo/code/collide-voice.mjs, module, line 121

````js
  /**
   * Boot scsynth in `ctx` and load the definition. Its sound comes out of
   * `out()`, which is connected to nothing: the caller routes it.
   */
````

<a id="code-4"></a>
## code-4: demo/code/collide-voice.mjs, module, line 130

````js
      // 🔴 `bootScsynth` connects its `out` to the speakers. The pages route
      // the sound by the bay's links, so it comes off the speakers here and
      // goes to `junction`, which the page connects where a link says. A
      // silent branch to the destination stays on whatever the links do,
      // because Web Audio pulls: an engine nobody pulls is never asked to
      // process, and its `/d_recv` times out (scsynth.mjs). MEASURED: with
      // the out simply disconnected here the load never answered.
````

<a id="code-5"></a>
## code-5: demo/code/collide-voice.mjs, module, line 163

````js
  /**
   * Compile `text` and, once the engine is up, hand it over. A failure keeps
   * the last good program everywhere and answers `{ ok: false, error }` with
   * the compiler's own words (a line and a column).
   */
````

<a id="code-6"></a>
## code-6: demo/code/collide/index.html, inline script, line 25

````js
  // /code/faust/'s shape with the sound made by a program in
  // /collide/'s small subset of SuperCollider, compiled in this tab and run on
  // scsynth compiled to WebAssembly. Asked 2026-10-12 (BACKLOG, "synth/090
  // Collide synth and synth/100"): *"do 090 synth, similar to 080 but with
  // collide, local. 2 parameters that make sense"*.
  //
  // The program and why its two knobs are `bright` and `decay` are in
  // `../collide-voice.mjs`, shared with /remote/collide/. Each knob is a
  // bay node of its own, `web:knob-<name>:value-out`, cabled into
  // `web:collide:value-in`, as on 080.
  //
  // NOTHING OPENS ON A VISIT. The text is compiled in JavaScript as the page
  // opens (no fetch). A pointer over the keys or a focus on them fetches the
  // engine from our origin, and the first key makes the AudioContext, boots
  // scsynth and loads the program, then sounds the note it was pressed for.
````

<a id="code-7"></a>
## code-7: demo/code/collide/index.html, inline script, line 155

````js
  // The program in the kit's code box, its two knob names in the knobs' own
  // hues (the box finds `\name.kr` in whatever is typed, so an edited text
  // keeps them). EDITABLE since 2026-10-12, *"make 090 editable"*: the kit's
  // idle compile, as /fau/ and /shader/mirror/ use it, `IDLE_MS` (600)
  // after the last key, no button. A good compile is the voice for the NEXT
  // note; a note already held finishes on the program it started with
  // (`collide-voice.mjs`, the header of `createCollideVoice`). A failed one
  // leaves `Did not compile` in the box's corner with collide's own error (a
  // line and a column) in its title and in the log, and the keys go on
  // playing the last good program.
````

<a id="code-8"></a>
## code-8: demo/code/collide/index.html, inline script, line 167

````js
  // ⚠️ A PROGRAM WITHOUT `\bright` OR `\decay` COMPILES AND PLAYS, AND THAT
  // KNOB THEN DRIVES NOTHING. The kit's note has no state for "compiled, with
  // a caveat", so the page writes that line into it once the compile has
  // settled, as shader/000 does for `uSeg`; the next compile paints over it.
````

<a id="code-9"></a>
## code-9: demo/code/collide/index.html, inline script, line 199

````js
  // Knobs above the code, asked 2026-10-12: *"when there are code and knobs on
  // concepts, move knobs on top of code"*.
````

<a id="code-10"></a>
## code-10: demo/code/faust/index.html, inline script, line 25

````js
  // The patchbay synth of /synth/patch-synth.mjs (synth/040 until 2026-10-13) with the sound made by a Faust program,
  // and every parameter that program declares a knob node of its own, cabled
  // into the engine's `value-in`, as on /fau/.
  //
  // THE PROGRAM IS THIS PAGE'S OWN, asked 2026-10-10 as *"make fau synth more
  // interesting (parameters etc)"*. It was the synths deck's `lfo` until then,
  // a test tone with no keys. Now it is one mono voice that the keyboard plays:
  // two detuned saws and a square an octave down, through a Moog style
  // resonant low pass that an envelope and an LFO both move, an envelope on
  // the volume, and an echo. `freq`, `gain` and `gate` are set by the keys
  // through `fau:midi-in`, last note wins; every other slider is a knob.
  //
  // IT IS COMPILED IN THE TAB ON THE FIRST PRESS, as /fau/ does, because
  // `demo/resources/build-faust-aot.mjs` compiles a fixed list (the Organ and
  // the deck's steps) and a page-local program would mean editing that shared
  // script and the build's stale check. The first press therefore fetches
  // libfaust (`faust.mjs` lists the files and their sizes) and every press
  // after it reuses the compiler and the compiled program.
  //
  // NOTHING OPENS ON A VISIT. The knobs a visit shows are read off the
  // program's TEXT; the AudioContext, the compiler and the node come on the
  // first press of play or of a key, and the knobs are then rebuilt from the
  // compiled program's own JSON.
````

<a id="code-11"></a>
## code-11: demo/code/faust/index.html, inline script, line 214

````js
  // ── the bay, built again whenever the parameter list changes ─────────────
  // `bay.mjs` cannot take a port away, so, as on /fau/, the knob nodes, their
  // cables and the names on `web:fau:value-in` are rebuilt into a fresh bay
  // from the list: a name that survives keeps its value and its cable's
  // counts, a gone one takes its node with it, a new one gets a node and a
  // cable. `createPatchbay` keys a wire by its printed link, so the picture
  // keeps the wires that survive.
````

<a id="code-12"></a>
## code-12: demo/code/faust/index.html, inline script, line 282

````js
  // ── a key switches the synth on ──────────────────────────────────────────
  // No play button since 2026-10-11 (*"does fau (now 080) need start button?
  // if not rm"*): the first key press is the gesture, fetches the compiler
  // and compiles, and the held note sounds once the node is ready.
````

<a id="code-13"></a>
## code-13: demo/code/faust/index.html, inline script, line 329

````js
  // The program itself in the kit's code box, read only (asked 2026-10-10,
  // *"show faust code"*, *"use code panel"*): the knobs below are its sliders.
````

<a id="code-14"></a>
## code-14: demo/code/faust/index.html, inline script, line 332

````js
  // A third of the program's height; it scrolls (asked 2026-10-10, *"make faust
  // source code 1/3 of current h"*).
````

<a id="code-15"></a>
## code-15: demo/code/faust/index.html, inline script, line 337

````js
  // Knobs above the code, asked 2026-10-12: *"when there are code and knobs on
  // concepts, move knobs on top of code"*.
````

<a id="code-16"></a>
## code-16: demo/code/piano/index.html, inline script, line 12

````js
  // concepts sampler/000, THE SAMPLER, 2026-10-12. Four pages made one. Asked
  // (BACKLOG, "Merge sampler/000, 010 and 040"): *"merge 000 and 010 with sc
  // piano (and put it looper too)"*. What each page brought:
  //   - 000 (Piano): the on-screen keys playing the Salamander grand from R2,
  //     `cf-r2:piano:file-out -> web:sampler:file-in`.
  //   - 010 (Piano and Rhodes): the jRhodes3d set beside it and a separate
  //     `web:patch` node that sends a program change (0 piano, 1 Rhodes) into
  //     the sampler's midi-in, the way a hardware synth switches. When the
  //     Rhodes is picked, the notes the keys on screen reach come down at once
  //     (`warm: [48, 69]`), so its first note is not a cold fetch.
  //   - 040 (SuperCollider piano): the readout, key to sound, boot, first note
  //     and underruns, measured off scsynth's own meter after the sum.
  //   - 020 (Looper): everything below this line about the looper, unchanged,
  //     and the page was started from it, because the owner plays it on a real
  //     keyboard. 010, 020 and 040 forward here, keeping their query string.
  // All of it plays through /code/sc-sampler.mjs: the Pi's two
  // SynthDefs on wasm scsynth in this tab.
  //
  // THE LOOPER, 2026-10-11 (020). A MIDI looper between the keys and the
  // sampler. Asked: *"Looper. Triggered from Sustain pedal. Shows as zoomed in
  // timeline. First start second stop. Raw. No quant no bpm"*.
  //
  // THE RULES, all of them:
  //   - The only control is the sustain: CC 64 from a plugged in keyboard, or
  //     the Sustain button in the on-screen keyboard's footer.
  //   - A PRESS is the pedal value crossing from below 64 to 64 or above (a
  //     pedal sends 127 going down and 0 coming up: the 127 is the press, the 0
  //     does nothing). One click of the Sustain button is one press.
  //   - Press 1 starts recording. Every note still goes straight through to the
  //     sampler while it is recorded.
  //   - Press 2 stops recording. The loop is EXACTLY the time between the two
  //     presses, nothing rounded, no grid, no tempo, and plays from that moment
  //     on, round and round. A key still held at press 2 gets its note off at
  //     the loop's end. A note off whose note on came before press 1 is dropped.
  //   - Press 3 over a playing loop starts an overdub layer, press 4 keeps it
  //     (since 2026-10-11, `pressAction` below). A fresh loop starts only
  //     after a clear.
  //   - A press under SPRING_MS after a release is the pedal springing back and
  //     does nothing.
  //   - A press that would close a loop under MIN_LOOP_MS does nothing, and
  //     recording carries on.
  //   - A press held CLEAR_HOLD_MS, pedal still down, stops and empties the
  //     loop. The press acts the moment it lands; the clear comes only when the
  //     hold reaches the mark and throws away what that press started. Nothing
  //     ever waits for a second press.
  //   - `Panic` in the keyboard's footer stops the loop and empties it.
  //
  // `demo/shell/looper.mjs` is the kit's AUDIO looper (a ring of sound, a kept
  // AudioBuffer, directions). None of it applies to a list of note events, so
  // nothing is shared; what is shared is the kit timeline the loop is drawn on.
  // NOTHING IS FETCHED ON A VISIT. MIDI access is asked for on load, as /nola/
  // does, so a pedal on a plugged in keyboard works from the first press.
  //
  // SINCE 2026-10-12 THE SAMPLER IS SUPERCOLLIDER IN THE TAB
  // (/code/sc-sampler.mjs, *"all in"*), and a replay is a
  // TIMESTAMPED OSC BUNDLE: the looper hands each note over AHEAD_MS before
  // its time with the time it should be heard, and scsynth starts it on that
  // sample rather than whenever the 4 ms timer next ran. A download hint for
  // the wasm is all a visit costs; a pointer over the keys, a touch, a focus
  // or the first MIDI message boots the engine.
````

<a id="code-17"></a>
## code-17: demo/code/piano/index.html, inline script, line 88

````js
  // 040's four cells, under the title with the log alone at the foot. Asked
  // 2026-10-12: *"yeah when concept has readout move to top"*.
````

<a id="code-18"></a>
## code-18: demo/code/piano/index.html, inline script, line 97

````js
  // Piano and Rhodes, as /concepts/sampler/010/ (asked: *"add rhodes sound too
  // to looper"*): a `web:patch` node sends a program change straight into the
  // sampler, so the loop plays back in whichever sound is picked now.
````

<a id="code-19"></a>
## code-19: demo/code/piano/index.html, inline script, line 113

````js
  // ── key to sound, as /concepts/sampler/040/ measured it ──────────────────
  // COPIED from 040 (which copied /remote/piano/): per press, the first
  // 1 ms block over ONSET and three times the 30 ms before it, on the speaker's
  // clock (`getOutputTimestamp`, so the browser's own output latency is inside
  // it). The tap is scsynth's meter, after the sum. `first note` is the first
  // press to its sound, the engine boot and its recording included.
  // A press is a LIVE note on, counted where it enters the looper; a replay is
  // not a press. ⚠️ A replay's onset can still be taken for a live press whose
  // own sound never came (a dropped note) within WAIT_MS of it, because the
  // meter hears the sum and cannot tell the two apart.
````

<a id="code-20"></a>
## code-20: demo/code/piano/index.html, inline script, line 178

````js
  // ── the looper ──────────────────────────────────────────────────────────
  // The three numbers are plans/plan-sustain-pedal.md section 3, asked for with
  // *"fix all"* on 2026-10-11. The MK-425C scans its pedal every 65.95 ms
  // (research/sustain-pedal-pressing-2026-10-11.md section 5), so a press one
  // tick after a release is the pedal springing back, and the owner's export
  // showed loops of 0.132 s and 0.199 s made that way. 015 copies pressAction
  // and these numbers to report what 020 would do; change both together.
````

<a id="code-21"></a>
## code-21: demo/code/piano/index.html, inline script, line 187

````js
  // 3 s since section 10 of the plan (asked: *"i can not reach panic. make it 3s
  // then"*): the owner holds a closing press 1.45 to 1.65 s while the chord
  // rings, and at 1 s that cleared six loops in one session.
````

<a id="code-22"></a>
## code-22: demo/code/piano/index.html, inline script, line 191

````js
  // plans/plan-looper-accuracy.md section 9, the owner's first Copy log: 4 of 7
  // takes lost their opening chord, played 17 to 98 ms before the press the
  // keyboard reported (it scans its pedal every 66 ms; the keys are timed to
  // about 1 ms), and the closing press came 117 to 146 ms after the chord it
  // closed on. So a take starts at a note that began up to LOOKBACK_MS before
  // the press, the end moves back by the same amount (the length stays press
  // to press, the plan's section 2.1 trap), and a note in the last SEAM_MS of
  // the loop that repeats a pitch from its first SEAM_MS is the same downbeat
  // played twice, so it is dropped. The keys' last BUFFER_MS are always kept.
````

<a id="code-23"></a>
## code-23: demo/code/piano/index.html, inline script, line 203

````js
  /** What a press does: 'spring', 'short' (both ignored), 'close', 'start',
   *  'overdub' (while looping) or 'keep' (while overdubbing). Overdub since
   *  2026-10-11 (*"how i overdub?"*, then *"Okay, build."*): the third Copy
   *  log showed a press over a 15 s loop replacing it with a 1.85 s take. A
   *  fresh loop now starts only after a clear, the 3 s hold. */
````

<a id="code-24"></a>
## code-24: demo/code/piano/index.html, inline script, line 233

````js
  // ── the journal, for Copy log ───────────────────────────────────────────
  // Asked 2026-10-11: *"add a copy button to the looper ... in order to debug,
  // record all you have, and let's analyze it"*. Every key and pedal message as
  // it came in, with the time the device stamped on it (`sent`, the MIDI
  // message's own timeStamp; the press time for the on-screen keys) and the
  // time the looper saw it (`seen`), and every decision the looper made.
  // Memory only, the last 5000 of each.
````

<a id="code-25"></a>
## code-25: demo/code/piano/index.html, inline script, line 258

````js
    // Since section 9 of the plan: a pedal held while playing is a sustain
    // pedal held, not a clear. Four takes were lost to the old rule. So a hold
    // clears only when no note was played during it, and then only what the
    // press itself left: a take with no notes, and the loop before it.
````

<a id="code-26"></a>
## code-26: demo/code/piano/index.html, inline script, line 266

````js
      // Asked: *"cancelling just removes the last layer"*. A hold over a loop
      // with overdubs takes the newest layer away; only a loop of one layer, or
      // a take still recording, is cleared whole.
````

<a id="code-27"></a>
## code-27: demo/code/piano/index.html, inline script, line 350

````js
      // The loop's start and end on the timeline (asked 2026-10-11, *"show start
      // and end of loop, in timebar above lanes"*): the strip's own loop band
      // and edges, from the deck's loop view, with a little air either side.
````

<a id="code-28"></a>
## code-28: demo/code/piano/index.html, inline script, line 382

````js
  // Overdub: a note's place in the loop is the loop's own clock at its device
  // time, so the pedal's 66 ms scan does not touch it and nothing is moved.
  // A note added now must not also replay in this lap (it was just played
  // live), so it carries the lap it was played in and is skipped there.
````

<a id="code-29"></a>
## code-29: demo/code/piano/index.html, inline script, line 444

````js
  // Playback: every few ms, hand over the events between where the loop's
  // HEAD was and where it is now. Positions come from the first lap's start and
  // the loop length, never from the last tick, so the loop cannot drift.
  //
  // 🔴 THE HEAD RUNS AHEAD_MS IN FRONT OF THE CLOCK, AND EACH NOTE CARRIES THE
  // TIME IT SHOULD BE HEARD (`at`). The sampler sends it to scsynth as a
  // timestamped bundle, so the 4 ms timer's own lateness, measured 0.1 to 4.1
  // ms before this, no longer reaches the sound. A note is set to sound at its
  // place in the loop plus the live path's latency (`sampler.latencyMs()`), so
  // a replay lands where the same note played live did, not that much early.
  // ⚠️ 40 ms is ten timer ticks and well inside SuperSonic's 500 ms direct
  // window; a timer stalled longer than that hands a note over late, and the
  // engine plays a late bundle at once.
````

<a id="code-30"></a>
## code-30: demo/code/piano/index.html, inline script, line 583

````js
  // ── keyboards plugged into this machine ────────────────────────────────
  // As /synth/keyboard/ (asked: *"where is midi in parchbay in sampler
  // 020"*): one `device` node per MIDI input, named after the device, its
  // midi-out linked to the looper (notes and the sustain pedal, CC 64) and to
  // the keys (they light). Each message carries the device's own timeStamp as
  // `t`, which the looper times by. A device keeps its node id across a replug.
````

<a id="code-31"></a>
## code-31: demo/code/piano/index.html, inline script, line 642

````js
  // No Copy log button since 2026-10-13 (*"rm copy log"*); the journal is still
  // kept and `await __demo.copyLog()` copies it from the console.
````

<a id="code-32"></a>
## code-32: demo/code/piano/index.html, inline script, line 116

````js
  // The MK-425C scans its pedal every 65.95 ms, so a press one tick after a release is the
  // pedal springing back. The pedal-check page copies pressAction and these; change both.
  // See lessons/page-code.md#code-20
````

<a id="code-33"></a>
## code-33: demo/code/piano/index.html, inline script, line 116

````js
  // The looper. The MK-425C scans its pedal every 65.95 ms, so a press one tick after a
  // release is the pedal springing back. Earlier short form: lessons/page-code.md#code-20.
  // See lessons/page-code.md#code-32
````

<a id="code-34"></a>
## code-34: demo/code/plaits-voice.mjs, module, line 1

````js
// demo/code/plaits-voice.mjs: the Plaits voice that /concepts/synth/110/
// and /code/plaits/ both play, with its patches and its scope.
//
// THE VOICE IS /muta/'s, NOT A COPY: the same `muta-worklet.js` processor
// (`plai-voice`) and the same `plai.wasm`, Emilie Gillet's Plaits compiled
// unmodified. The bytes are fetched on the main thread and posted to the
// worklet, because a worklet cannot fetch (the worklet's header has why).
//
// NOTHING OPENS UNTIL ASKED. `warm()` fetches the bytes and is for intent (a
// pointer over a control); `boot()` makes the AudioContext and must be called
// inside a press. Settings sent before the voice is up wait for it; a note
// sent before it is up is dropped, so nothing sounds late on the first press.
//
// The page owns its bay. What it gets here is the sound as three nodes it
// connects by its own links: `out()` (Plaits' main jack), `speakers()` and
// `scopeIn()`.
````

<a id="code-35"></a>
## code-35: demo/code/plaits-voice.mjs, module, line 37

````js
// The patches, in the order worth hearing them, and both pages open on the
// first (*"make wavetabl drift default"*), all sustained (asked
// 2026-10-12: *"no bell sounds please or drums. longer stuff"*, *"rm saw
// swarm"*, then *"replace additive organ and chord pad. bring in bette
// stuff"*). `engine` is an index into MODELS, `decay` sets how long the gate
// takes to close after a note off.
// `gain` EVENS THE LEVELS, MEASURED rather than guessed: a held A3 on each
// patch read 0.022 (Long string) to 0.146 (Soft FM) RMS at the scope, about
// 16 dB apart, so each patch carries the trim that brings its held note to
// about 0.1. Applied on Plaits' own output, so the scope and the speakers
// both see the evened level.
````

<a id="code-36"></a>
## code-36: demo/code/plaits-voice.mjs, module, line 50

````js
  // The two operator FM set low and soft (a low ratio, a modest index, a
  // little feedback): it sings rather than rings. It is the steadiest tone of
  // the set on one held note (centroid within 5 Hz over 3 s on A3), so what
  // moves is the overlapping line, and the timbre knob takes it from a near
  // sine to a reedy tone.
````

<a id="code-37"></a>
## code-37: demo/code/plaits-voice.mjs, module, line 65

````js
// ── the panel /code/plaits/ and /connect/ both show ──────────────────────
// Lifted 2026-10-14 from /code/plaits/ (plans/plan-connect-ui.md, the
// convergence rule), with that page's reasons beside it there.
````

<a id="code-38"></a>
## code-38: demo/code/plaits-voice.mjs, module, line 71

````js
/**
 * Every parameter /muta/ exposes, as one row of knobs in its order. `param` is
 * the key in P it sets (rounded when `round`), or 'transpose' for pitch, which
 * offsets the keys rather than reaching Plaits. `id` is a knob node's name.
 */
````

<a id="code-39"></a>
## code-39: demo/code/plaits-voice.mjs, module, line 91

````js
/**
 * Keys into a voice: the notes held, a transpose (the pitch knob), and a first
 * note that boots the voice and plays once it is up if its key is still down.
 * @param {object} voice   createPlaitsVoice's
 * @param {object} [o]
 * @param {() => Promise<boolean>} [o.boot]  how a note before the voice is up starts it
 */
````

<a id="code-40"></a>
## code-40: demo/code/plaits-voice.mjs, module, line 119

````js
/**
 * @param {object} o
 * @param {Function} o.log       `(line, kind)`
 * @param {number} [o.voices]    how many voices the shim plays (1 to 8)
 * @param {Function} [o.onUp]    called once the voice is up, to connect it
 * @param {() => AudioContext} [o.context]  a context to play in (a page's shared
 *   one, at 48 kHz); left out, `boot()` makes its own, as it always has
 */
````

<a id="code-41"></a>
## code-41: demo/code/plaits/index.html, inline script, line 24

````js
  // A second Plaits concept. Asked 2026-10-12: *"make second plaits demo with
  // keyboard and all parameters. 2 row patamters perhaps to mimic muta
  // grouping"*. The voice is /concepts/synth/110/'s (`../plaits-voice.mjs`,
  // /muta/'s worklet and wasm), played from the kit keyboard and from any MIDI
  // keyboard plugged into this machine, with every parameter /muta/ exposes as
  // a knob of its own.
  //
  // EVERY KNOB IS A NODE, `web:knob-<name>`, with a value link into
  // `web:plaits:value-in`, so turning one is a value crossing a wire. ONE ROW
  // in /muta/'s order, scrolling sideways when it does not fit (*"synth 120,
  // all params in one line, scrollabel"*): model, pitch, harmonics, timbre,
  // morph, timbre CV, FM CV, morph CV, decay, colour. No voices knob (*"rm
  // voices param"*); the voice count stays the shared voice's 6.
  // THE MODEL IS A STEPPED KNOB, not a second picker: it is a Plaits parameter
  // like the others, so it gets the same node and link, and a second picker
  // beside the patch picker would be two controls that look alike and do
  // different things. Its number reads as a short model name.
  // PITCH IS THE FREQUENCY KNOB AS A TRANSPOSE. On the module, V/OCT adds to
  // FREQUENCY; here each key's note is offset by the knob's semitones, which
  // a key pressed after the turn plays (a held note keeps its pitch).
  // THE CV AMOUNTS: with nothing patched into those inputs, Plaits routes its
  // own decay envelope through them (and FM sweeps the pitch), so each is
  // heard on a note's attack.
  //
  // THE PATCH PICKER SETS EVERY KNOB, and the knobs send the values over their
  // own links. It is not a node of its own here: on 110 a program change
  // carried what no knob held, here every value has a knob, so a program
  // change would be a second road around them.
  //
  // NOTHING PLAYS ON A VISIT. A pointer over the keys fetches the wasm from
  // this origin; the first key makes the AudioContext, boots, and plays that
  // key once the voice is up if it is still held. Asking for MIDI shows the
  // browser's prompt once, as /synth/keyboard/ does.
````

<a id="code-42"></a>
## code-42: demo/code/plaits/index.html, inline script, line 63

````js
  // The knobs, in /muta/'s order, are plaits-voice.mjs's KNOBS (/connect/
  // shows the same panel). `to` is what the value does at Plaits. `short` is
  // the word under a dial whose name would be cut with an ellipsis (the knob
  // cell holds about six letters); the full name is its hover, its node's
  // label and the value's name on the wire.
````

<a id="code-43"></a>
## code-43: demo/code/sampler.mjs, module, line 1

````js
// demo/code/sampler.mjs: the sampling core of /nola/, lifted for
// the sampler concept pages (sampler/000, 010, 020) and pointed at our R2
// bucket instead of the site's own static files.
//
// What is the same as /nola/ (demo/nola/index.html), and why it matters:
//   - the RHODES is fifteen notes at uneven steps and five velocity layers,
//     layer 1 the hardest, picked by the author's own SFZ crossfade table, with
//     his fallback where two layers have holes;
//   - a tie between two recordings goes to the lower one (his SFZ says so);
//   - the damper is a ramp, never a stop(), and the pedal is /shell/pedal.mjs;
//   - a key struck again damps the voice it is about to replace;
//   - 64 voices, oldest taken first past that;
//   - a note let go while its recording was still loading SOUNDS and is damped
//     at once, rather than being dropped or ringing on;
//   - every URL is fetched and decoded once.
//
// THE PIANO IS THE SALAMANDER GRAND (plans/plan-piano-samples.md), since
// 2026-10-11, replacing /nola/'s FluidR3 render, which MEASURED brighter than
// a Yamaha C5 struck as hard as it can be, phase cancelling above middle C and
// cut dead at 3.13 s. Thirty notes three apart, A0 to C8 (the same grid, so
// `nearestIn` is unchanged), four velocity bands hard switched (v1, v6, v11,
// v16 of Salamander's sixteen), capped at 8 s with a 1.5 s fade, and the 88
// key-off release samples played when the damper falls. Made by
// demo/resources/fetch-salamander.mjs, served from R2 at sampler/salamander/web/.
// A press fetches ONE file, the one it plays; the rest of its octave, the
// octave's releases and the other bands follow behind it, one file at a time.
// The FluidR3 piano is still here as PIANO_FLUID (program 2) and still in R2
// at sampler/piano/, so nothing that pointed at it breaks.
//
// What is different from /nola/: the files come from R2 (`positron-station`,
// served by the station worker at /media/, CORS `*`), nothing at all is opened
// before the first note, and an instrument is chosen by a MIDI program change
// (0 piano, 1 Rhodes), which is how every instrument on this desk is switched.
````

<a id="code-44"></a>
## code-44: demo/code/sampler.mjs, module, line 50

````js
/** The loudest FluidR3 piano file, measured on /nola/ 2026-09-22 by decoding all thirty. */
````

<a id="code-45"></a>
## code-45: demo/code/sampler.mjs, module, line 52

````js
/**
 * The loudest Salamander v16 file as encoded, decoded back, from
 * PROVENANCE-salamander.json (`peak.web`). ONE number for the whole set, so the
 * 18 dB the recordings carry between v1 and v16 is kept (plan section 4.2).
 */
````

<a id="code-46"></a>
## code-46: demo/code/sampler.mjs, module, line 69

````js
/**
 * The Salamander's four bands, hard switched, no crossfade (plan section 4.1).
 * Salamander's own SFZ ranges for these files are 1-26, 47-50, 81-88, 121-127.
 */
````

<a id="code-47"></a>
## code-47: demo/code/sampler.mjs, module, line 82

````js
/**
 * Within a band the level rises 6 dB from its bottom to its top; between bands
 * the recordings carry the step themselves. INFERRED in the plan (section 4.2)
 * from Salamander's own `amp_veltrack=75`; tune by ear.
 */
````

<a id="code-48"></a>
## code-48: demo/code/sampler.mjs, module, line 93

````js
/**
 * A key-off sample's level, from Salamander's Data/hammer.txt: `volume=-37`,
 * `amp_veltrack=82` on SFZ's default square curve, `rt_decay=2` dB for every
 * second the note was held. On the set's one normalising constant.
 */
````

<a id="code-49"></a>
## code-49: demo/code/sampler.mjs, module, line 171

````js
/** /nola/'s FluidR3 piano, as it was before 2026-10-11, at program 2. Still in R2 at sampler/piano/. */
````

<a id="code-50"></a>
## code-50: demo/code/sampler.mjs, module, line 192

````js
/**
 * What one press needs in hand before it sounds: one Salamander file, an
 * octave of the FluidR3 piano, or every layer of one Rhodes note.
 */
````

<a id="code-51"></a>
## code-51: demo/code/sampler.mjs, module, line 203

````js
/**
 * A sampler engine. Takes MIDI-shaped events ({ cls, d1, d2 }) on `midi(ev)`:
 * notes, CC 64 as the damper pedal, and a program change that picks one of
 * `instruments` by its `program` number.
 *
 * @param {object} o
 * @param {object[]} [o.instruments]  PIANO, and RHODES if the page has it
 * @param {(line:string, kind?:string)=>void} [o.log]
 * @param {(on:boolean)=>void} [o.onFetch]  a fetch began (true) or settled (false)
 * @param {(ins:object)=>void} [o.onProgram]  the instrument changed
 * @param {number[]} [o.warm]  [lo, hi] notes to fetch when an instrument is switched to
 * @param {() => AudioContext} [o.context]  a context to play in; left out, the first note makes one
 */
````

<a id="code-52"></a>
## code-52: demo/code/sampler.mjs, module, line 304

````js
  /**
   * The key-off sound, when the damper actually lands on a sounding string.
   * Not on a key up under the pedal (pedal.mjs never calls release then), not
   * on a key struck again, not on a steal. Skipped in silence if its file has
   * not arrived yet: it is a detail, and a press never waits for it.
   */
````

<a id="code-53"></a>
## code-53: demo/code/sampler.mjs, module, line 370

````js
    // A note whose key came up while its file was loading (the press that
    // wakes the sampler, almost always, as a click is shorter than a fetch)
    // sounds for LATE_S and is then damped. /nola/ damps it at once, which on
    // a first click is a blip too short to hear as the key you pressed.
````

<a id="code-54"></a>
## code-54: demo/code/sc-sampler.mjs, module, line 1

````js
// demo/code/sc-sampler.mjs: the sampler pages' ONE SuperCollider
// sampler, since 2026-10-12. Asked: *"should we go all on supercollider
// sampler?"*, then *"all in"* (BACKLOG, "All in on the SuperCollider sampler").
// /code/piano/ plays through this (010, 020 and 040 were merged into
// it 2026-10-12 and forward there); the WebAudio `createSampler` in sampler.mjs
// stays as it was for anything else.
//
// WHAT IT IS: wasm scsynth in the tab (`/shell/scsynth.mjs`, SuperSonic)
// running the board's two SynthDefs, driven by the board's voice rules. It was
// /concepts/sampler/040/'s inline engine and is lifted out whole, so 040 and
// the three older pages are one engine rather than four copies.
//   - The SynthDefs `posSampler1` and `posSampler2` are
//     rig/board/norns/possampler-defs.scd, written HERE as bytes by
//     `/shell/synthdef.mjs` because no sclang runs in a browser. Env.asr(0.001,
//     1, rel, -6) on an EnvGen with doneAction 2, PlayBuf at rate *
//     BufRateScale with doneAction 2, times env times amp, Out at `out`.
//     ⚠️ NOT BYTE COMPARED with what the Pi's sclang wrote: the graph is the
//     same, the block order may not be.
//   - The note, band, gain and release rules are imported from sampler.mjs,
//     which rig/board/test.mjs grades equal to rig/board/scsampler.mjs.
//   - The voice core (32 voices, a key struck again damps the voice it
//     replaces, the oldest taken past the cap, `/n_set rel gate 0` as the
//     damper, a key-off sample when the damper lands, a stereo voice at 0.5)
//     is COPIED from rig/board/scsampler.mjs `createSamplerCore`, because that
//     file opens node:child_process at the top and cannot load in a browser.
//   - The board's capture SUMS out_1 and out_2 to one channel, and the core's
//     halving of a stereo voice is written for that sum. So this sums too and
//     both speakers play it: what the Pi sends down the relay, with no relay.
//     MEASURED in research/scsynth-sampler-in-browser-2026-10-11.md section 2:
//     the piano is about 1.5 dB quieter and narrower than the WebAudio
//     sampler's stereo, the Rhodes is identical in level, and the damper is a
//     ramp that reaches zero (no tick).
//
// THE SAME CALL SHAPE AS `createSampler`: `midi(ev)`, `noteOn`, `noteOff`,
// `program`, `panic`, `inst`, `sounding`, `loading`, `ctx`, `stat`, plus
//   - `warm(why)`: boot on intent. Pages call it on a pointer over or a touch
//     of the keys, a focus, or the first Web MIDI message. It makes the
//     AudioContext and fetches the engine, and boots it as soon as the context
//     runs: at once if the page has had a gesture, else on the first key.
//   - an event's `at` (ms, `performance.now()`'s clock): the note sounds at the
//     SPEAKERS at that time, through a timestamped OSC bundle. No `at` is now.
//   - `latencyMs()`: how long after a press a live note reaches the speakers,
//     from the context's own latencies, for a caller that schedules a replay to
//     land where the live note did.
//   - `engine()`: the booted engine (its `meter` is after the sum).
//
// NOTHING OPENS ON A VISIT. Constructing this adds a download hint for the
// wasm (our origin) and nothing else: no context, no fetch, no boot.
````

<a id="code-55"></a>
## code-55: demo/code/sc-sampler.mjs, module, line 55

````js
// ── the two SynthDefs, possampler-defs.scd as bytes ──────────────────────
// Env.asr(0.001, 1, rel, -6) as EnvGen reads it: start 0, two segments,
// release node 1, no loop, then (level, time, shape 5 = a curve, curve) per
// segment. EnvGen's own inputs come first: gate, levelScale 1, levelBias 0,
// timeScale 1, doneAction 2.
````

<a id="code-56"></a>
## code-56: demo/code/sc-sampler.mjs, module, line 93

````js
// ── the voice core, COPIED from rig/board/scsampler.mjs createSamplerCore ─
// Changed only where a browser differs: `send` takes (address, ...args) as
// SuperSonic does, buffers are keyed by URL, and the FluidR3 set (program 2)
// is not here.
````

<a id="code-57"></a>
## code-57: demo/code/sc-sampler.mjs, module, line 160

````js
/**
 * The SuperCollider sampler.
 *
 * @param {object} o
 * @param {object[]} [o.instruments]  PIANO, and RHODES if the page has it (sampler.mjs's objects)
 * @param {(line:string, kind?:string)=>void} [o.log]
 * @param {(on:boolean)=>void} [o.onFetch]  a fetch began (true) or settled (false)
 * @param {(ins:object)=>void} [o.onProgram]  the instrument changed (sampler.mjs's object)
 * @param {(eng:object)=>void} [o.onReady]  the engine is up
 * @param {number[]} [o.warm]  [lo, hi] notes to fetch when the Rhodes is switched to
 * @param {() => AudioContext} [o.context]  a context to play in; left out, the first intent makes one
 */
````

<a id="code-58"></a>
## code-58: demo/code/sc-sampler.mjs, module, line 206

````js
  /**
   * Boot on intent. The first call makes the context, fetches the engine and
   * boots it; every later call returns the same promise.
   * 🔴 A CONTEXT MADE WITHOUT A GESTURE IS SUSPENDED, AND BOOTING INTO IT GAINS
   * NOTHING AND CAN HANG. MEASURED 2026-10-12, headless Chrome with the real
   * autoplay policy: SuperSonic's worklet does no work while the context is
   * suspended, so a boot started on a hover 2 s before the key still finished
   * 700 ms after the key (first note 802 ms, against 740 to 777 with no hover),
   * and a hover 7 s before the key left the boot hung for good (no note at
   * all), because SuperSonic's own 5 s wait for the context ran out inside it.
   * So a suspended context gets the DOWNLOAD on intent and the boot the moment
   * the context runs, which is the first key. A context that already runs (the
   * page has had a gesture, a pick of the patch, an earlier key) boots at once.
   */
````

<a id="code-59"></a>
## code-59: demo/code/sc-sampler.mjs, module, line 386

````js
  /**
   * Press to speakers on the live path, as the context reports it: its base
   * and output latency. A replay scheduled this far after its recorded time
   * lands where the live note did. MEASURED 2026-10-12 headless on
   * /concepts/sampler/020/: a bundle tagged T is heard about 2.5 ms after T
   * (scsynth starts a synth on its 128 frame block), and adding a block here
   * as well put replays 3 ms later than the same notes played live.
   */
````

<a id="code-60"></a>
## code-60: demo/code/sc-sampler.mjs, module, line 416

````js
/**
 * The intent that boots the engine, on an element: a pointer over it, a touch,
 * a pointer down (which is also the key) or a focus inside it. Each listener
 * goes after its first call.
 */
````
