# Page comments: drums

The full comments cut from the code under demo/ for drums, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="drums-1"></a>
## drums-1: demo/drums/camera/index.html, inline script, line 32

````js
  // The drum machine played by a picture. Asked 2026-10-12: *"do 050 drums with
  // camera input and that pixelning shader you already have done on tv demos
  // but with the size that makes 16 squares per w and according squares per h
  // (4 ? 5? 6 ?). image sqares drive the drum grid. 1/2 camera image 1/2
  // pixelated one, below is drum grid. no knobs"*.
  //
  // THE SQUARES. The pictures are the panels' 16:9, the camera COVERED into it
  // (cropped, never squashed), so the frame is always 16 squares by 9 whatever
  // camera it is: a 4:3 webcam loses a strip top and bottom, and a phone held
  // upright still gives 16 by 9 rather than 16 by 28. A square is 80 px of the
  // 1280 px frame.
  //
  // NINE ROWS, NINE DRUMS: THE PICTURE IS THE GRID, SQUARE FOR SQUARE. Asked
  // 2026-10-12: *"why this dotted line? just split the video up to squares.
  // add more drum rows if needed"*. Until then the top row was dropped and
  // drawn black with a dotted line, which read as a mark nobody could explain.
  // So there are nine drums (kick, snare, open hat, closed hat, clap, low tom,
  // high tom, cowbell, rim shot) and the nine picture rows are those nine, top
  // to bottom: a lit square is a lit pad at the same row and column.
  //
  // ON OR OFF IS THE SHADER'S OWN DITHER. Each square is one brightness, then
  // one threshold from a 4x4 Bayer matrix, as on /video/shader/ and
  // /concepts/video/040/, each drum on a row of the matrix chosen for it
  // (`BAYER_ROW`). The grid reads the square back off the shader's own
  // pixels (lit or ground), so it cannot disagree with what is on screen. The
  // Bayer threshold changes square to square, which is what makes it a drum
  // pattern rather than a mask: a flat mid grey wall gives a regular pattern of
  // hits instead of all on or all off, and the brighter a region, the busier.
  //
  // THE GRID FOLLOWS THE PICTURE EVERY FRAME, asked 2026-10-12: *"grid shold
  // change immediately"* (it took the picture once a bar until then). Every
  // frame the shader draws, it also draws the same squares into a 16 by 9
  // framebuffer, one pixel a square, and reads those 576 bytes back: the same
  // shader, the same cells and thresholds, so the small copy IS the picture,
  // and reading it costs one call a frame rather than one per square. When a
  // read row changes, the whole pattern goes down the pixelate wire and the
  // grid shows it in that same frame. The sequencer reads the grid as each
  // step is handed over, so a change is heard from the next step not yet
  // handed to the engine, 150 ms ahead at most.
  //
  // NO CLEAR AND NO PAD PRESSES: the grid is read only here, because the next
  // frame of the picture would undo either. The tempo stays.
  //
  // THE WIRES: camera video-out to the original and to `web:pixelate`, the
  // pixelate node's video-out to the right panel and its value-out (one whole
  // pattern a bar) to `web:sequencer:value-in`, then the sequencer to the four
  // drums and the drums to the speakers, as on /drums/machine/.
  //
  // NOTHING OPENS ON A VISIT. The camera is asked for on its own press, the
  // engine on play's, and nothing leaves this machine.
````

<a id="drums-2"></a>
## drums-2: demo/drums/camera/index.html, inline script, line 91

````js
  // 1x is 16 by 9 squares of 80 px, nine drums, a 16 step loop. 2x, asked
  // 2026-10-12 (*"can we deliver 2x more res button and drum instruments as
  // toggle?"*), is 32 by 18 squares of 40 px, eighteen drums, and 32 steps,
  // which are TWO BARS OF SIXTEENTHS: the step stays a sixteenth at the tempo
  // shown and the loop doubles, so a picture twice as fine plays for twice as
  // long rather than twice as fast. The switch is a value on a wire
  // (`web:scale` into the pixelate node) and lands at the top of the next loop.
````

<a id="drums-3"></a>
## drums-3: demo/drums/camera/index.html, inline script, line 103

````js
  // Which row of the 4x4 Bayer matrix each drum's squares are thresholded by,
  // and how many columns it is shifted, in grid order. The thresholds every
  // four columns (a beat of sixteenths), lowest first lights first:
  //   kick     row 0          0 8 2 10    the 1st sixteenth: on the beat
  //   snare    row 3         15 7 13 5    the 4th, then the 2nd: late and sparse
  //   open hat row 2          3 11 1 9    the 3rd: the offbeat
  //   closed   row 1         12 4 14 6    the 2nd and 4th
  //   clap     row 3, +2     13 5 15 7    the 2nd, then the 4th
  //   low tom  row 0, +2      2 10 0 8    the 3rd, then the 1st
  //   high tom row 2, +2      1 9 3 11    the 1st, then the 3rd
  //   cowbell  row 1, +2     14 6 12 4    the 4th, then the 2nd
  //   rim shot row 0, +1      8 2 10 0    the 4th, then the 2nd, at the lowest
  //                                       thresholds of all: a ghosted
  //                                       sixteenth even on a dark picture
  // and at 2x, nine more, using the combinations left and then two again:
  //   ride     row 1, +1      4 14 6 12   on the beat, then the 3rd
  //   crash    row 3, +3      5 15 7 13   on the beat, sparse: a crash is rare
  //   shaker   row 2, +3      9 3 11 1    the 4th, then the 2nd
  //   tambour. row 2, +1     11 1 9 3     the 2nd, then the 4th
  //   claves   row 0, +3     10 0 8 2     the 2nd, then the 4th, early
  //   lo conga row 1, +3      6 12 4 14   the 3rd, then the 1st
  //   hi conga row 3, +1      7 13 5 15   the 3rd, then the 1st, later
  //   mid tom  row 0, +2      as the low tom
  //   agogo    row 1, +2      as the cowbell
  // So a dim picture still grooves: a kick on every beat, an offbeat hat, and
  // the four new drums each on a different sixteenth from their partner above,
  // rather than doubling it. MEASURED on 2026-10-12 before the first version of
  // this: four read rows that all fell on the matrix's two high rows left the
  // kick row unlit on Chrome's fake camera.
````

<a id="drums-4"></a>
## drums-4: demo/drums/camera/index.html, inline script, line 150

````js
  // INVERT IS A VALUE ON A WIRE: the button is a node of its own, `web:invert`,
  // whose `value-out` reaches the shader through `web:pixelate:value-in`, as a
  // knob reaches a synth on the other concept pages.
  // Inverted by default, asked 2026-10-12: *"reverse ... default reverse setting"*.
````

<a id="drums-5"></a>
## drums-5: demo/drums/camera/index.html, inline script, line 156

````js
  // THE 1x / 2x TOGGLE IS ANOTHER VALUE ON A WIRE: `web:scale` into the same
  // `pixelate:value-in`. It asks the drum machine for the new shape, which
  // lands at the top of the next loop while playing; the picture follows it.
````

<a id="drums-6"></a>
## drums-6: demo/drums/camera/index.html, inline script, line 209

````js
  // The footer carries buttons only, asked 2026-10-12 (*"rm 16 by 9"*, *"rm
  // pixels"*, *"move conrast button to left"*): invert at the left, the 1x / 2x
  // toggle and full screen at the right.
````

<a id="drums-7"></a>
## drums-7: demo/drums/camera/index.html, inline script, line 230

````js
    // As /video/shader/'s dither, each row on its drum's own matrix row
    // and shift (`uBay`, `uShift`), counted from the top.
    // 🔴 BLACK AND WHITE ONLY, asked 2026-10-12: *"make shaders bw only"*. A lit
    // square is white and an unlit one black, no tint and no grey. `uInvert`
    // swaps the two, and
    // since the grid reads these pixels back, the pattern inverts with it.
````

<a id="drums-8"></a>
## drums-8: demo/drums/camera/index.html, inline script, line 303

````js
    // No camera, or no link: the page's own dark ground, the same as the camera
    // panel beside it, never the shader's white (inverted is the default).
    // Asked 2026-10-12: *"show same dark bg when camera is not on"*.
````

<a id="drums-9"></a>
## drums-9: demo/drums/drum-machine.mjs, module, line 1

````js
// demo/drums/drum-machine.mjs: the drum machine /drums/machine/
// and /drums/knobs/ are built from. A page mounts the shell and calls
// `createDrumMachine(d, { voices })`, and gets the glued transport and grid,
// the patchbay, and, when the voices carry a parameter (010), one row of knobs,
// each knob a bay node `web:knob-<name>` with a value wire into its drum.
//
// A drum machine as a patchbay: a 16 step by 4 row grid, a sequencer that
// sends each hit as a MIDI note, and four SuperCollider voices (kick, snare,
// open hat, closed hat), each a node of its own on the bay. Asked 2026-10-12
// (BACKLOG, "A rhythm concept group"): *"make new grpup concept rythm. make a
// 16 x 4 grid pad componetn (global one), 4 sc (or fau?) synths for kick
// snare hho hhc and patchbay. 000"*.
//
// THE GRID IS THE KIT'S `createStepGrid`, the one /tom/ and /kit/devices/
// use, with its rows named. Its label column used to be a fixed 22 px, which
// cut every name past two letters; `shell.css` now sizes it to the widest
// label with 22 px as the floor, so every numbered grid is unchanged.
//
// EVERY HIT CROSSES A WIRE. The sequencer has one `midi-out` and sends General
// MIDI drum notes on channel 10 (36 kick, 38 snare, 46 open hat, 42 closed
// hat). Each voice is linked to it through a `range` transform that lets its
// own note through and nothing else, so the patchbay shows four wires, each
// carrying one drum. Take a wire away and that drum stops.
//
// SCHEDULED AHEAD ON THE AUDIO CLOCK, as /concepts/clock/010/ argues: a timer
// wakes every 25 ms and hands over every hit due in the next 150 ms, each
// carrying the time it must sound at (`at`, on performance.now()'s clock).
// The voice sends it to scsynth as a timestamped OSC bundle (`sendAt`), which
// SuperSonic maps to the speakers' clock, so a late timer makes a hit late to
// HAND OVER, never late to SOUND.
//
// ONE ENGINE, ONE OUTPUT. The four voices are four definitions on one scsynth,
// and their sound leaves as one mix, so a voice's `audio-out -> speaker` link
// is honoured where it can be: a voice whose link is gone starts no hits.
//
// THE CHOKE is a drum machine's: a closed hat cuts an open hat that is still
// ringing. The closed hat voice sends `/n_set gate 0` to the open hat's node,
// in the same bundle time as its own hit; the open hat's program closes in
// 15 ms on that gate.
//
// NOTHING OPENS ON A VISIT. The four programs are compiled in JavaScript as
// the page opens (no fetch). A pointer over the transport fetches the engine
// from our origin; the first press of play makes the AudioContext, boots
// scsynth, loads the four definitions and starts.
````

<a id="drums-10"></a>
## drums-10: demo/drums/drum-machine.mjs, module, line 64

````js
/**
 * @param {object} d  what `mount()` returned, for its log
 * @param {object} o
 * @param {object[]} o.voices  from `voices()` in voices.mjs, with or without knobs
 * @param {boolean} [o.patternIn]  give the sequencer a `value-in` that takes a
 *   whole pattern, `{ of: 'pattern', rows: [[0|1 x 16] x 4] }`, and makes the
 *   grid read only and empty, with no clear button: the pattern arrives on a
 *   wire (rhythm/050, where a picture is the pattern).
 * @param {(lap: number) => void} [o.onBar]  called just before the first step
 *   of every bar is handed over, which is where a page sends that bar's pattern
 * @param {(link: object, playing: boolean) => boolean} [o.flowing]  which wires the patchbay lights
 * @param {(engine: object, ctx: AudioContext) => Promise<void>} [o.onWake]  awaited
 *   once the engine is up and the definitions are in, before the first hit
 *   (rhythm/020 loads its samples here). A voice may also bring `def` (bytes),
 *   `params` (several knobs) and `args()` (extra `/s_new` arguments per hit,
 *   or null to skip the hit); see `paramsOf` and `hit`.
 * @param {(ctx: AudioContext) => Promise<void>} [o.onStart]  awaited on every
 *   press of Play, after the engine is up and before the first hit, while the
 *   bar shows it is busy (remote/040 joins the Pi here, so the lead is the
 *   Pi's path from the first hit)
 * @param {() => void} [o.onStop]  called on every stop (remote/040 leaves the Pi)
 * @param {boolean} [o.scopes]  one scope per drum, each a node `web:scope-<drum>`
 *   fed by that drum's own `audio-out` (rhythm/010)
 * @param {number | (() => number)} [o.ahead]  how far ahead each hit is handed
 *   over, ms, read on every tick; 150 by default. remote/040 hands over on the
 *   Pi's path, 250 on the relay and 150 direct (plans/plan-pi-supercollider-defs.md §2.4)
 * @param {() => AudioContext} [o.context]  the page's own context, made on the
 *   first press; left out, the machine makes one (remote/040 needs 48 kHz)
 * @param {{ node: string, label: string }} [o.mix]  the drums go into a node
 *   of this name (`web:<node>:audio-in`) with an `audio-out` of its own, and
 *   the mix is NOT connected to the speakers: the page routes `api.mixOut()`
 *   where its own wires say (remote/040's crossfader). Left out, the node is
 *   `web:speaker` and the mix goes to the speakers.
 * @param {{ rows: number, steps: number }} [o.shape]  how many of `voices` are
 *   rows (the first n) and how many steps a loop has, 16 by default. Changed
 *   with `api.setShape`, which lands at the next loop while playing
 *   (rhythm/050's 1x and 2x). The other rows' drums stay loaded on the engine
 *   and leave the grid and the patchbay.
 * @param {(shape: {rows: number, steps: number}) => void} [o.onShape]  called as
 *   a new shape lands, before its first step is read, so a page that writes the
 *   pattern can write it for the new shape first
 * @param {boolean} [o.start]  false: the grid starts empty rather than with the
 *   house four on the floor (rhythm/020, whose rows are whatever was loaded)
 * @param {(rows: number) => number} [o.gain]  the mix's level for this many
 *   rows, read at the first play and at every new shape; left out, it follows
 *   how many drums there are in all, as it always has
 * @param {(ev: object) => void} [o.sequence]  where the grid's notes go instead of
 *   along this machine's own sequencer wires (/connect/, whose own link carries
 *   them to `api.play`); left out, they go along the wires as always
 * @param {{ over: number, node: string, label: (rows: number) => string }} [o.group]
 *   above `over` rows the patchbay draws the rows as ONE box, `web:<node>`,
 *   with one MIDI wire in and one audio wire out (rhythm/020 with a 64 sample
 *   pack). It is the picture only: the bay still holds one filtered wire per
 *   row, and every hit still crosses its own.
 *
 * A voice's `label` and `title` are read every time they are drawn, so a voice
 * whose label is a getter renames its row and its box (rhythm/020's sample
 * names); `opens` and `closes`, when a voice has them, say which rows are an
 * open hat and the closed hat that chokes it (by default the `hho` and `hhc`
 * keys, as on 000).
 * @returns {{ surface: HTMLElement, knobs: ?HTMLElement, scopes: ?HTMLElement[], patchbay: HTMLElement, api: object }}
 */
````

<a id="drums-11"></a>
## drums-11: demo/drums/drum-machine.mjs, module, line 135

````js
  // ── the tempo and the bar ────────────────────────────────────────────────
  // 120 bpm, the house default, four steps to a beat: a step is 125 ms and the
  // sixteen of them are one 2 s bar, looped. The tempo is the bar's `- bpm +`
  // stepper, 60 to 180 in fives (asked 2026-10-12: *"rm step of and bpm. use
  // bpm selector on right and add clear button"*), the kit's `createStepper`
  // as /tom/ wears it.
````

<a id="drums-12"></a>
## drums-12: demo/drums/drum-machine.mjs, module, line 152

````js
  /**
   * A voice's knobs: `v.params` (a list, rhythm/020's pitch and length per row)
   * or `v.param` (one, rhythm/010). Each is `{ name, value, min, max, unit }`
   * plus, optionally, `control` (the definition's control the value is sent as,
   * default `name`), `label` and `sub` for the knob, `toArg(x)` (what is sent,
   * default the value itself) and `life: true` for the one that says how long
   * a hit rings (the open hat's choke window follows it). `name` is the bay
   * node's (`web:knob-<name>`), so it is unique on the page.
   */
````

<a id="drums-13"></a>
## drums-13: demo/drums/drum-machine.mjs, module, line 164

````js
  // ── the four programs, compiled now (pure JavaScript, no fetch) ──────────
  // EACH DRUM ON A STEREO PAIR OF ITS OWN: drum i's last line goes to output
  // busses 2i and 2i+1, and the engine is booted with eight outputs. So the
  // engine's output can be split per drum, which is what makes a drum's
  // `audio-out` wire real (the speaker hears exactly the drums wired to it)
  // and what lets a scope see one drum alone.
  //
  // 🔴 UNLESS THERE ARE MORE THAN SIXTEEN DRUMS. An AudioWorkletNode carries at
  // most 32 channels in Chrome, so 16 pairs is the ceiling; rhythm/050's 2x has
  // eighteen. Then every drum plays on busses 0 and 1, the engine has two
  // outputs, and a drum's `audio-out` wire is honoured at the hit instead (a
  // drum with no wire to the speakers starts no hits). Nothing with scopes has
  // that many drums.
````

<a id="drums-14"></a>
## drums-14: demo/drums/drum-machine.mjs, module, line 217

````js
      // The engine's sound goes where the bay says, so it comes off the
      // speakers here. A silent branch to the destination stays, because Web
      // Audio pulls and an engine nobody pulls never answers /d_recv
      // (collide-voice.mjs measured that).
````

<a id="drums-15"></a>
## drums-15: demo/drums/drum-machine.mjs, module, line 423

````js
  // ── the sequencer: wakes every 25 ms, hands over what is due in the next 150 ─
  // The deck only carries the bar's play state (the bar shows no time). Its
  // range is a day, because the deck runs in milliseconds and pauses itself at
  // its end, which would stop the loop through the bar's own command.
````

<a id="drums-16"></a>
## drums-16: demo/drums/drum-machine.mjs, module, line 432

````js
  /**
   * WHEN EACH STEP SOUNDS, AS AN ANCHOR AND A STEP LENGTH. A tempo change moves
   * the anchor to the first step not yet handed over, at the time it already
   * had, and only the steps after it get the new length. Hits already handed
   * to the engine keep their times, so a change lands from the next step with
   * no step played twice, skipped or squeezed.
   */
````

<a id="drums-17"></a>
## drums-17: demo/drums/drum-machine.mjs, module, line 635

````js
  /**
   * TRIGGERED, HELD SCOPES, asked 2026-10-12: *"scopes are very "nervous"."*.
   * Each scope takes its drum's window from the hit's onset (it knows the
   * time the hit sounds, off its `midi-in`) and holds it until the next hit,
   * the previous trace faint underneath. The kit's own option:
   * `createWaveShape({ mode: 'triggered', window, fade, source })`. The
   * window suits the drum: a kick's body and fall, a snare's crack and wires,
   * the open hat's ring, the closed hat's tick. The label and the span are
   * fixed strings, so nothing on a scope changes size as it redraws.
   */
````

<a id="drums-18"></a>
## drums-18: demo/drums/knobs/index.html, inline script, line 22

````js
  // /drums/machine/ plus one knob per drum. Asked 2026-10-12: *"next
  // drum, same but each synth a parameter to tweak"*.
  //
  // Each drum's program declares its one number as a named control
  // (`\pitch.kr`, `\snap.kr`, `\length.kr`, `\bright.kr`), and each knob is a
  // bay node of its own, `web:knob-<name>:value-out`, wired into that drum's
  // `value-in`. The value travels with every hit, in the hit's own timestamped
  // bundle, so a turn is heard from the next hit and a hit already ringing
  // keeps the value it started with. Which number and why is in
  // `../voices.mjs`, `PARAMS`.
  //
  // Knobs under the grid, asked 2026-10-12: *"move knobs below grid"*.
  //
  // FOUR SCOPES ON TOP, ONE PER DRUM, asked 2026-10-12: *"add 4 scopes 1/4 each
  // on top of 010"*. Each drum plays on an output pair of its own and each
  // scope is a node, `web:scope-<drum>`, fed by that drum's `audio-out` alone,
  // so a scope shows its drum and nothing else (`../drum-machine.mjs`).
````

<a id="drums-19"></a>
## drums-19: demo/drums/machine/index.html, inline script, line 16

````js
  // A drum machine as a patchbay: a 16 step by 4 row grid, a sequencer that
  // sends each hit as a MIDI note, and four SuperCollider voices, each a node of
  // its own on the bay. Asked 2026-10-12 (BACKLOG, "A rhythm concept group").
  // Everything but the frame is `../drum-machine.mjs`, shared with
  // /drums/knobs/, which is this page plus a knob per drum.
````

<a id="drums-20"></a>
## drums-20: demo/drums/remote/index.html, inline script, line 31

````js
  // /drums/machine/ with the same four drums also played on the
  // Raspberry Pi, the way /remote/collide/ pairs a voice here with one on
  // the Pi. plans/plan-pi-supercollider-defs.md §3.4 and §4 step 6 (the plan
  // calls it rhythm/020; that number went to the sample drums).
  //
  // ONE PI NODE, NOT FOUR. `pi-1:drums` has one `midi-in` and one `audio-out`,
  // because the board's sound comes back as one summed stream and cannot
  // honestly offer four outs (plan §3.4). The sequencer's `midi-out` is wired
  // to it with no filter; its `deliver`, on this page, turns General MIDI's
  // drum notes into the four program names and gathers the hits that share a
  // time into one `sc.hit` message. A closed hat carries `choke: 'hho'`, so
  // the board closes every open hat still ringing in the same bundle, as the
  // local side does with `/n_set gate 0`.
  //
  // ONE TIME FOR BOTH SIDES. A hit due at S on this tab's clock sounds here at
  // S (a timestamped bundle to the scsynth in this tab) and on the Pi at S
  // (`at` on the board's clock, which `board-collide.mjs` keeps with
  // `clock.ping` and the fastest round trip). So both sides are handed over
  // on the Pi's path: 250 ms early on the relay, 150 direct (plan §2.4,
  // `AHEAD` in board-collide.mjs).
  //
  // PLAY JOINS THE PI, NOTHING ON A VISIT. Asked 2026-10-12: *"rm, play button
  // reaches for pi too"*, so the separate Pi button is gone. A press of Play
  // makes the page's 48 kHz context, boots this tab's scsynth, then (the
  // drum machine's `onStart`, while the bar shows busy) asks the board in
  // `studio-1` for `audio.status` and gives it ASK_MS. No answer, or a run
  // under a harness (`createBoard` will not drive the board under
  // `?selfcheck=` unless `?board=1`), means the Pi side is SIMULATED here, and
  // the Pi panel's footer, the Pi node's label and the `path` cell say so. A
  // board that answers is started (`audio.start {source: 'collide'}`), given
  // the four programs as text (`sc.load`, `same` says whether its compile is
  // this tab's), and its clock found before the first hit is sent, so the
  // first hit already has the Pi's lead. Stop leaves the Pi (`onStop`).
  //
  // SIMULATED: a second scsynth in this tab with the same four programs,
  // each hit started UP_MS after it is handed over (so a lead shorter than the
  // trip makes it late, counted the way the board counts), and its sound
  // folded to mono and delayed DOWN_MS on the way back.
  //   UP_MS    36, tab to Pi on the relay, two ~18 ms legs (plan §2.4, MEASURED).
  //   DOWN_MS  139, a sound on the Pi to this tab's speakers on the relay:
  //            ~175 ms key to speakers for Yoshimi minus that 36 (plan §3.1,
  //            COMPUTED from a measurement). A MODEL, NOT THE BOARD.
  //   ⚠️ MEASURED ON THE REAL PI 2026-10-12, Pi lag (first hit after a start):
  //   176 to 317 ms on the relay and 82 to 112 ms direct, so the model's 139
  //   is short on the relay by 40 to 180 ms.
  //
  // THE FOUR CELLS, on top (a concept page with a readout shows it on top):
  //   Pi late     the board's own `late + droppedLate` from `sc.stats` every
  //               2 s, counted from this join: hits that reached its scsynth
  //               after their time. The
  //               simulation's count of the same thing in simulation.
  //   Pi lag      from a hit's time S to the first sound of it back from the
  //               Pi, at the Pi side's meter plus this context's output
  //               latency. Timed only on a hit with no Pi hit in the 600 ms
  //               before it and silence on the Pi side at S, so a ring or the
  //               previous hit cannot pass for it: in practice the first hit
  //               after a start. ⚠️ The stand-in board's sound is a constant
  //               tone, so against it this cell stays empty.
  //   network     the board's own answer time on the path, `board.stats().rttMs`
  //               (`round trip` until 2026-10-13, renamed as remote/010's was).
  //   path        relay, direct, model (the Pi simulated in this tab; the word
  //               `simulated` did not fit the cell at 1280), or empty while stopped.
  //
  // THE SCOPE, asked 2026-10-13 (*"can not see viz improvements"*, on the two
  // half width panels this page still had): remote/020's one full width
  // scope, both sides' drums on it, here yellow and the Pi blue, from
  // /remote/overlay-scope.mjs. Each bar's first hit is the trigger;
  // each side's window starts at its own copy of that hit and is held until
  // the next bar. The Pi's copy is found by its shape ('match' there), since
  // a pattern is never quiet in the 90 to 300 ms before it arrives.
  //
  // THE ASSERT THE PLAN NAMES, read by a check through `__demo.drums.check()`:
  // hits handed over to the board equal the hits it started.
````

<a id="drums-21"></a>
## drums-21: demo/drums/remote/index.html, inline script, line 113

````js
  // RELAY OR DIRECT, asked 2026-10-13: *"add direct option to all remote
  // instruments."* The same choice, cell and fall back as remote/010 and 030
  // (`/remote/path.mjs`): the relay unless `?path=direct`, direct
  // offered once the board answers, the relay kept for presence and as the
  // fall back when no channel opens in 3 s or it drops. A change of choice
  // while playing leaves the board and joins it again on the new path.
````

<a id="drums-22"></a>
## drums-22: demo/drums/remote/index.html, inline script, line 122

````js
  // THE PI'S SOUND IS LIFTED BY PI_LIFT BEFORE THIS PAGE METERS, DRAWS OR
  // PLAYS IT. Asked 2026-10-14 (*"fix"*, on HANDOFF session 76's "every voice
  // still about 5 dB under the tab"). MEASURED, not a meter artefact: both
  // chains rendered on wasm scsynth in one context (the tab's as
  // drum-machine.mjs builds it, the board's as scollide.mjs does, fold 0.5 and
  // Limiter 0.49) read the board 0.6 to 1.0 dB OVER the tab on every voice,
  // by peak, by whole-hit energy and by this page's own 512-sample meter
  // polled every 5 ms, which reads within 0.2 dB of the true window maximum.
  // The real Pi read 4.9 to 5.5 dB UNDER after the fix and 6.7 to 13.4 under
  // before it, and the model minus 6.02 dB gives 5.0 to 5.4 and 6.9 to 13.4:
  // a clean factor of two lost on the Pi's side of the wire, in both limiter
  // regimes. The suspect it fits is the board's capture (rig/board/jacksynth.mjs
  // `ensureCapture`): `ffmpeg -f jack` registers TWO ports by default
  // (`-channels` 2), the board sums everything into `input_1` only, and
  // `-ac 1` AVERAGES that with the silent `input_2`. ffmpeg 9 here halves a
  // stereo input with one silent channel exactly (0.500 in, 0.250 out); the
  // Pi's own ffmpeg was not asked. `inputs.mjs` passes `-channels 1` for the
  // same demuxer; `ensureCapture` does not.
  //   2    the capture's halving, undone.
  //   0.9  bootScsynth's `out` gain, which this tab's drums pass through and
  //        the board's never do (the simulated Pi passes it too, so it is not
  //        lifted).
  // ⚠️ IF THE BOARD'S CAPTURE IS EVER GIVEN `-channels 1`, THIS GOES BACK TO
  // 0.9, or the Pi reads 6 dB over the tab.
````

<a id="drums-23"></a>
## drums-23: demo/drums/remote/index.html, inline script, line 226

````js
  // ── the Pi side: THE ONE PLACE THE BOARD GOES IN ─────────────────────────
````

<a id="drums-24"></a>
## drums-24: demo/drums/remote/index.html, inline script, line 227

````js
  /**
   * `mode()`: `idle` (not joined), `checking`, then `relay`, `direct`, `turn`
   * or `simulated`. `join(ctx)`, `leave()`, `hits(list)`, `out()`.
   */
````

<a id="drums-25"></a>
## drums-25: demo/drums/remote/index.html, inline script, line 342

````js
  // ── the bay: the Pi node, the scope, the crossfader, the speakers ───────
  // The Pi's node is the one the board announces (graph-registry.mjs `boardGraph`,
  // `pi-1:drums`, a program on its SuperCollider engine), drawn with its ports
  // below; the browser's are the catalogue's.
````

<a id="drums-26"></a>
## drums-26: demo/drums/remote/index.html, inline script, line 382

````js
  // ⚠️ VIA RELAY, BECAUSE THAT IS THE WIRE IT RIDES, as on /remote/collide/.
  // Both Pi legs read one `pi.out()` fed by the board's socket. Without it the
  // bay took the crossfader for a second internet receiver and asked for MoQ,
  // which the board's announced `audio-out` (relay or a data channel) refuses.
````

<a id="drums-27"></a>
## drums-27: demo/drums/remote/index.html, inline script, line 456

````js
  // ── the scope: both sides on one, each from its own copy of the bar's first hit
  // A window of 4096 samples, 85 ms at 48 kHz: a kick's attack and its first
  // few cycles. This tab's onset may lie up to 50 ms before the hit's time,
  // because the time is when it is HEARD and the analyser sees it earlier.
````

<a id="drums-28"></a>
## drums-28: demo/drums/sample-voices.mjs, module, line 1

````js
// demo/drums/sample-voices.mjs: the rows of /drums/samples/, one per sample,
// which play SAMPLES on the same one SuperCollider engine the synth drums run
// on. Asked 2026-10-12 (BACKLOG, "drums/020"): /drums/knobs/ with the
// voices playing samples, a default kit on R2, any pack or zip of WAVs dropped
// on the page replacing it.
//
// ONE DEFINITION, `drumsample`, WRITTEN AS BYTES BY `/shell/synthdef.mjs`
// (sclang-lite has no PlayBuf). The graph, as SuperCollider would say it:
//
//   { |out = 0, buf = 0, rate = 1, amp = 0.8, len = 1, gate = 1|
//       var play = PlayBuf.ar(1, buf, rate * BufRateScale.kr(buf), doneAction: 2);
//       var env  = EnvGen.ar(Env.new([0, 1, 1, 0], [0.002, len, 0.02]), doneAction: 2);
//       var cut  = EnvGen.ar(Env.asr(0.001, 1, 0.015), gate, doneAction: 2);
//       Out.ar(out, (play * env * cut * amp) ! 2)
//   }
//
// So a hit ends at the sample's end OR at `len` seconds, whichever comes
// first, and the closed hat closes the open hat's `gate` as on 000.
// Samples are mixed to mono (`toMono`, the mean of the channels) and handed to
// scsynth as 16 bit WAVs by `sonic.loadSample`, as sc-sampler.mjs does.
//
// EVERY SAMPLE IS A ROW since 2026-10-13 (*"show all samples with their
// names. no preatterns"*): `sampleRows` makes 64 rows, a Circuit pack's slot
// count, and the page shows as many as are loaded. No knobs: every hit plays
// at its own pitch, to its own end (the default kit keeps the lengths its four
// rows had).
````

<a id="drums-29"></a>
## drums-29: demo/drums/sample-voices.mjs, module, line 31

````js
/** The default kit: the four /drums/machine/ drums, one hit each,
 *  rendered in this tab off each drum's own output pair (2026-10-12) and put
 *  on R2 under `rhythm/default-kit/`. */
````

<a id="drums-30"></a>
## drums-30: demo/drums/sample-voices.mjs, module, line 77

````js
/**
 * What each row is called: the file's own name, without the folder and the
 * `.wav`, and without a run of leading words every name shares. A pack whose
 * files are all `NOVHTG Hit - Drumstation - 808 ...` reads `808 Crash D1T1`,
 * because the shared part names the pack and not the row. The whole name stays
 * in the row's hover.
 * @param {string[]} files
 * @returns {string[]}
 */
````

<a id="drums-31"></a>
## drums-31: demo/drums/sample-voices.mjs, module, line 106

````js
/**
 * One row per sample slot, `MAX_ROWS` of them: `voices()`'s shape for
 * `createDrumMachine`, all on the one `drumsample` definition. A row's label
 * is read live (`nameOf(r)`), so a new kit renames the rows without a new
 * machine. A row is an open hat or a closed hat by its name, and the closed
 * one chokes the open one as on 000. `args()` names the row's buffer, or
 * answers null while it has none, so a hit is skipped rather than playing
 * buffer 0.
 * @param {{ nameOf: (r: number) => string|null, fileOf: (r: number) => string|null,
 *   bufOf: (r: number) => number|null }} o
 */
````

<a id="drums-32"></a>
## drums-32: demo/drums/sample-voices.mjs, module, line 122

````js
    // Just the row number on the grid, asked 2026-10-13: *"find a way to
    // shorten drum grid labels: just numbers and hover?"*.
````

<a id="drums-33"></a>
## drums-33: demo/drums/sample-voices.mjs, module, line 137

````js
/**
 * The samples on the engine: the default kit (fetched from R2 on the first
 * play), or whatever was dropped. `use(samples)` takes `sample-loader.mjs`'s
 * `{ name, wave }[]`, mixes each to mono and loads it into a fresh buffer.
 */
````

<a id="drums-34"></a>
## drums-34: demo/drums/samples/index.html, style, line 11

````css
  /* A sample's name can be forty letters (`NOVHTG Hit - Drumstation - 808
     Crash D1T1`), and the label column is as wide as its widest name, so it
     is held to a fifth of the screen and no more than 22 letters, and a name
     past that ends in an ellipsis with the whole of it in the row's hover.
     At 375 that is 75 px beside 16 pads; at 1280 it is 132 px. */
````

<a id="drums-35"></a>
## drums-35: demo/drums/samples/index.html, inline script, line 27

````js
  // The drum machine of /drums/machine/ with its rows playing SAMPLES,
  // on the same one SuperCollider engine. The definition, the default kit and
  // the rows are in `../sample-voices.mjs`.
  //
  // EVERY SAMPLE IS A ROW, NAMED, AND THE GRID STARTS EMPTY. Asked 2026-10-13:
  // *"show all samples with their names. no preatterns. "drawable" drum grid
  // as in tom"*. The default kit's four rows show on load, named from
  // DEFAULT_KIT before anything is fetched; a dropped `.circuitpack`, zip of
  // WAVs or set of WAVs becomes one row per sample, up to 64 (a Circuit pack's
  // slot count and /tom/'s row count), and the grid is built again, empty.
  // Like /tom/, every row is on the page and the page grows tall; nothing
  // scrolls inside it.
  //
  // DRAWN AS ON /tom/: the grid is the kit's `createStepGrid`, so a press and
  // a drag paints every pad it crosses, along a row or across rows, and the
  // first pad decides on or off for the whole stroke (a stroke that starts on
  // a lit pad erases).
  //
  // THE PATCHBAY draws one box per row up to eight, and above eight one
  // `web:samples` box with one wire in and one out, because 64 boxes is a
  // column five thousand pixels tall. The bay itself keeps one wire per row.
  //
  // NOTHING OPENS ON A VISIT: the engine and the default kit wait for play, and
  // a dropped file is read in the tab and sent nowhere.
````

<a id="drums-36"></a>
## drums-36: demo/drums/samples/index.html, inline script, line 74

````js
  // The default kit's names are known before anything is fetched.
  // No default kit since 2026-10-13 (asked: *"no default grid / player /
  // patchbay, do all on load"*): the page opens on the SAMPLES box alone, and
  // the grid, its transport and the patchbay appear when a kit is loaded.
````

<a id="drums-37"></a>
## drums-37: demo/drums/voices.mjs, module, line 1

````js
// demo/drums/voices.mjs: the four drum voices /drums/machine/ and
// /drums/knobs/ play, each a small program in /collide/'s subset of
// SuperCollider, compiled in the tab and run on scsynth compiled to WebAssembly.
//
// Asked 2026-10-12 (BACKLOG, "A rhythm concept group"): *"make new grpup
// concept rythm. make a 16 x 4 grid pad componetn (global one), 4 sc (or fau?)
// synths for kick snare hho hhc and patchbay. 000"*, then *"next drum, same but
// each synth a parameter to tweak"* for 010.
//
// WHY SUPERCOLLIDER AND NOT FAUST. Two reasons, both about machinery that
// already exists. First, `scsynth.mjs` has `sendAt`, an OSC bundle with a
// timetag that SuperSonic maps to the speakers' clock, so a hit can be handed
// over ahead of time and sound at its time: the scheduling half is already
// built. A Faust voice in this kit is one AudioWorkletNode whose parameters
// are set by message, so a gate at an exact future sample would be new code.
// Second, a drum hit is a node that starts, decays and frees itself
// (`doneAction: 2`), which is what scsynth does with no bookkeeping, four
// definitions on one engine, any number of hits overlapping. Faust would need
// a polyphonic wrapper per voice or four always-running worklets.
//
// ONE TEXT PER DRUM, TWO PAGES. Each program has one number that 010 turns
// into a knob. On 000 it is that number written in; on 010 it is a named
// control, `\name.kr(default, spec: [min, max])`, so the knob's range is the
// program's own. Same sound at the default either way.
//
// THE SUBSET HAS NO BPF, NO XLine AND NO Decay, so every sweep is an EnvGen
// scaled and offset, and every band is an HPF. That is enough for an 808-ish
// kit and keeps each program a dozen lines a reader can follow.
//
// 🔴 THE OPERATORS ARE LEFT TO RIGHT, AS IN SuperCollider: `a * b + c * d` is
// `((a * b) + c) * d`. Every last line below is written for that.
````

<a id="drums-38"></a>
## drums-38: demo/drums/voices.mjs, module, line 38

````js
/**
 * The one knob per drum on 010, and why each is the one most fun to turn.
 *   kick  pitch   the note the thump falls to, from a sub you feel (30 Hz) to
 *                 a tom (110 Hz). It retunes the whole kit's low end.
 *   snare snap    how long the wires ring, from a dry crack (50 ms) to a
 *                 splash (0.6 s). It changes the snare's character outright.
 *   hho   length  how long the open hat rings, from a short chick (0.1 s) to
 *                 a wash across four steps (1.5 s), so it changes the groove.
 *   hhc   bright  where the hat's filter starts, from a dull chick (2 kHz) to
 *                 a glassy tick (12 kHz).
 */
````

<a id="drums-39"></a>
## drums-39: demo/drums/voices.mjs, module, line 144

````js
// ── FOUR MORE, FOR /drums/camera/ ONLY ───────────────────────────────
// Asked 2026-10-12: *"add 4 more drum isntrumets to 050"*. Chosen to read as
// different from the four above and from each other, by ear and on a scope:
//   clap     three quick noise bursts and a tail, the 808's clap. The one
//            sound in a kit that is a rhythm of its own, and nothing above is
//            made of bursts.
//   low tom  a sine falling 130 to 90 Hz over 0.4 s: pitched like the kick but
//            an octave up and longer, so it reads as a drum with a note.
//   high tom the same a fifth above, 210 to 150 Hz, shorter. With the low tom
//            it makes a fill: two notes that answer each other.
//   cowbell  two square waves at 540 and 800 Hz (the 808's own), filtered:
//            the only clearly PITCHED metal, where the hats are noise-like.
// Rim shot was the other candidate and was left out: on a laptop speaker a
// short click reads as the closed hat's tick.
````

<a id="drums-40"></a>
## drums-40: demo/drums/voices.mjs, module, line 196

````js
// A NINTH, 2026-10-12, when 050 stopped dropping a picture row (*"just split
// the video up to squares. add more drum rows if needed"*):
//   rim shot  the 808's own: two sines at 455 and 1667 Hz for 40 ms over a
//             3 ms noise tick. Earlier left out because on a laptop speaker a
//             short click reads as the closed hat's tick; with the hats above
//             7 kHz and the cowbell's squares at 540 and 800, it is the one
//             PITCHED, WOODY tick in the mid range, and a ninth row has room
//             for it. A shaker or a ride would be a third noise above 7 kHz.
````

<a id="drums-41"></a>
## drums-41: demo/drums/voices.mjs, module, line 226

````js
// ── NINE MORE, FOR /drums/camera/'s 2x ONLY ──────────────────────────
// Asked 2026-10-12: *"can we deliver 2x more res button and drum instruments as
// toggle?"*. At 2x the picture is 32 by 18 squares, so eighteen rows. Each of
// these is a sound the first nine do not make:
//   ride        six squares at inharmonic ratios, filtered high, ringing 1.2 s:
//               a pitched wash, where the open hat is a short noisy one
//   crash       bright noise and metal, 1.5 s: the longest thing in the kit
//   shaker      noise with a soft 20 ms attack, 80 ms: the only sound that
//               swells rather than strikes
//   tambourine  jingles: four squares at 2.5 to 5.3 kHz with noise, 0.25 s
//   claves      one sine at 2.5 kHz for 50 ms: the highest pitched wood
//   low conga   a sine 230 to 200 Hz, 0.25 s
//   high conga  330 to 300 Hz, 0.18 s
//   mid tom     170 to 120 Hz, 0.35 s, between the two toms
//   agogo       two sines at 900 and 1350 Hz, 0.3 s: a bell with a note,
//               above the cowbell's squares
````

<a id="drums-42"></a>
## drums-42: demo/drums/voices.mjs, module, line 292

````js
/**
 * The four drums in grid order, top to bottom: the row's name, the bay node,
 * the definition's name on the server, its program, its note, and (with knobs)
 * the one parameter its knob turns.
 * `extras: true` adds the four above after them (050's eight).
 * `more: true` adds the nine after those (050's 2x eighteen).
 * @param {{ knobs?: boolean, extras?: boolean, more?: boolean }} [o]
 */
````

<a id="drums-43"></a>
## drums-43: demo/drums/voices.mjs, module, line 231

````js
/**
 * The drums in grid order: row name, bay node, definition name, program, note, and (with knobs)
 * the parameter. `extras` adds the four above (eight), `more` the nine after (eighteen).
 * @param {{ knobs?: boolean, extras?: boolean, more?: boolean }} [o]
 * See lessons/page-drums.md#drums-42
 */
````
