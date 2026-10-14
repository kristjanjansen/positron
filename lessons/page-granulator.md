# Page comments: granulator

The full comments cut from the code under demo/ for granulator, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="granulator-1"></a>
## granulator-1: demo/granulator/beat/index.html, inline script, line 26

````js
  // concepts sampler/070, BEAT GRANULATOR, 2026-10-13. Asked (BACKLOG): *"make
  // followup demo with ida, dub and add tempo detection and feed it into
  // granulator"*. sampler/060's Granulator (the grain ring, `../grain-ring.mjs`,
  // and everything else `../grain-rig.mjs`) on the Ida recording and the Dub
  // patch, plus /radio/tempo/'s tempo detector (`/radio/tempo.mjs`)
  // hearing the same recording. Its readings travel on a wire of their own,
  // web:tempo:value-out into web:grains:tempo-in, apart from the knobs' wires
  // into web:grains:value-in, and the grains take the timing from them:
  //   time     the echo: Dub's is three quarters of a beat, every other
  //            patch's the nearest of BEAT_FRACTIONS to its own time
  //   density  a whole number of grains a beat, the nearest to the knob
  //   back     a whole number of quarter beats, the nearest to the knob
  //   lock     the program's beat grid on (`\lock`, `../grain-ring.mjs`), and
  //            `\beat` raised on every beat, so the even grains start on it
  // The knobs keep what a person or a patch set; only what reaches the engine
  // is put on the beat. The grains ALWAYS FOLLOW (asked 2026-10-13: *"Beat
  // granulator: always follow"*): every reading moves them, a sure one or an
  // unsure one, and there is no switch to take them off it. The echo time
  // glides to each new tempo by the program's own lag on `\time` (0.3 s);
  // density and back step.
````

<a id="granulator-2"></a>
## granulator-2: demo/granulator/beat/index.html, inline script, line 68

````js
  // ── the beat ─────────────────────────────────────────────────────────────
  // An echo on the beat: a quarter, a dotted eighth, an eighth, a dotted
  // quarter's half, a beat, one and a half, two. Dub's is a dotted eighth,
  // three quarters of a beat, the classic dub delay.
````

<a id="granulator-3"></a>
## granulator-3: demo/granulator/beat/index.html, inline script, line 177

````js
  // ── the beat on the engine: `\beat` raised on every beat of the grid ─────
  // A 10 ms timer on this tab's audio clock: when the next beat of the
  // grid is due, `\beat` goes to 1 and back to 0 15 ms later (the Phasor in
  // the program resets on the rise). So a beat lands within a timer tick and
  // an audio block of the grid, a few ms, which the self check measures.
````

<a id="granulator-4"></a>
## granulator-4: demo/granulator/beat/index.html, inline script, line 212

````js
    // The grains' own input for the tempo, so its wire is one of its own and
    // not one more on the knobs' run into web:grains:value-in. Asked
    // 2026-10-13 on a phone: *"Do not see how tempo feeds into grains"*.
````

<a id="granulator-5"></a>
## granulator-5: demo/granulator/grain-rig.mjs, module, line 1

````js
// demo/granulator/grain-rig.mjs: everything a granulator concept page has
// that is not its engine. Lifted out of sampler/050 (now /archive/pappus/) on 2026-10-13 when its
// lighter twin sampler/060 arrived (BACKLOG, *"the plain GrainBuf ring is the
// real lighter twin of Pappus - do"*), so the two pages share one copy:
// the sources, the patchbay, the two scopes with their grain ticks, the grain
// events, the two knobs, Play, `window.__demo.grains` and the self check.
// A page hands in an ENGINE and its PATCHES and nothing else.
//
// Named for what it is rather than `grain-sources.mjs`: the sources are one
// part of it, and a file called sources that also holds the scopes would be a
// name somebody has to see past.
//
// THE ENGINE CONTRACT. `engine` is
//   {
//     label,                          the web:grains box's label
//     boot({ ctx, input, grain, log }) -> { meter, out, timing, scsynth }
//         bring it up with `input` (an AudioNode) feeding its input bus;
//         `meter` is an analyser on its output and `out` a gain the rig
//         opens and closes for the speaker wire, `scsynth` the booted
//         engine for a check over CDP. Call `grain(g)` for every
//         grain the ENGINE reports, `g = { pos, ago, dur, voice, half }`:
//         `pos` 0..1 of the window it reads, `ago` how many seconds ago the
//         audio under it arrived. Nothing here invents a grain.
//     land(i, now)                     what patch i sets that is NOT a knob
//                                      (the knobs glide there on their own);
//                                      `now` is every knob's value right now
//     fixed(set)                       a patch's fixed values, written at once
//     knob(name, v)                    one control, by its name in `controls`,
//                                      and 'mix' (0 dry to 1 wet) when `mixes`
//     mixes                            true when the engine blends its own
//                                      input against its grains; otherwise
//                                      the rig mixes outside it, with the
//                                      dry source on a wire of its own
//     run(on)                          pause or resume, keeping the ring
//     read(name) -> Promise<number>    a knob's value ASKED OF THE SERVER
//     glitches() -> number|null
//     moving() -> string[]             optional: controls the engine moves by
//                                      itself, so their read back value is the
//                                      patch's plus that movement
//     value(ev) -> boolean             optional: an event on web:grains:value-in
//                                      that is not a knob's or a patch's (070's
//                                      tempo, its follow switch); true when the
//                                      engine took it
//   }
// `controls` is everything a patch sets, each a knob a person may turn:
// `{ name, label, kind: 'knob', min, max, warp: 'lin' | 'exp', fmt }` for an
// amount, `{ name, label, kind: 'steps', choices: [{ label, value }] }` for a
// choice (the kit's stepped knob, `step: 1`; a value may be an array, a chord
// or a figure, and is matched whole). Each knob is a cell of its own in
// one row (asked 2026-10-13, *"no grouped buttons"*), its label short enough
// to fit the cell,
// and `patches` is `[{ name, says, set, fixed }]`: `set` a value for every
// knob, `fixed` everything else the patch sets, and each name written as it
// is to be shown (sentence case).
//
// FEW KNOBS, THE REST FIXED. Asked 2026-10-13: *"reduce granulator knobs a
// lot. fix values. patch only changes those"*. What is not a knob is set by
// the patch alone: `web:patch:value-out-2` carries it, one `{ of: 'fixed',
// set }` event per patch change, straight into `web:grains:value-in`, and the
// engine writes it at once with no glide (`engine.fixed(set)`).
//
// THE PATCH IS A NODE AND THE KNOBS TAKE INPUT. Asked 2026-10-13: *"expose
// them. route patch to knobs (should take input)"* and *"patch selection
// should slowly go to new values"*. `web:patch:value-out` is wired into every
// knob's `value-in`; a patch change is ONE event carrying the whole set, and
// each knob takes its own value and glides there over `GLIDE_MS`, eased, its
// own needle moving. Every knob's `value-out` goes into `web:grains:value-in`,
// so the knobs are the only thing that drives the grains. A hand on a knob
// during a glide stops that knob's glide, and what it is turned to holds
// until the next patch. A stepped knob (a mode, a chord, freeze) steps at the
// START of the glide: halfway between two chords is a third chord nobody
// chose, and a freeze that lands at the start holds the moment you chose.
// The wet/dry is first in the row (asked 2026-10-13, *"move wet/dry to
// first"*) and no patch moves it.
//
// THE SOURCES. A source is an audio node into the granulator's input and that
// is the whole contract: each entry's `open(ctx)` resolves to `{ node, stop }`.
// A recording decodes a file from our R2 bucket and loops it. A microphone, a
// tab's audio, the Pi over the relay or our own stage stream are one more
// entry each with their own `open`, and nothing else changes, because both
// engines record whatever reaches their input bus and never see a file.
// `store` says where the bytes come from, for the patchbay; a live source has
// none. Never an outside station: these were captured once and are kept in
// our bucket.
//
// NOTHING OPENS ON A VISIT. No AudioContext, no fetch, no engine, no prefetch
// hint: Play brings the engine up, fetches the recording and starts both.
````

<a id="granulator-6"></a>
## granulator-6: demo/granulator/grain-rig.mjs, module, line 105

````js
// ── the recordings ─────────────────────────────────────────────────────────
// One gain per second of the file, raised (never lowered) toward -16 dB RMS by
// at most 36 dB and eased across seconds, then a soft knee over 0.8. It is
// /radio/tempo/'s levelling made shorter: MEASURED there, the Ida
// capture is -44 dB RMS under one loud stretch, so one gain for the whole file
// would leave it inaudible.
````

<a id="granulator-7"></a>
## granulator-7: demo/granulator/grain-rig.mjs, module, line 168

````js
    // A recording is named as one, so it is never taken for the live station
    // (asked 2026-10-13, *"when you have radio recordings, suffix patch names
    // with '... recording'"*).
````

<a id="granulator-8"></a>
## granulator-8: demo/granulator/grain-rig.mjs, module, line 192

````js
// The kit's grain scope as a panel's picture, as /radio/tempo/ draws
// it: the panel's stage is the edge and the ground, so the scope gives up its
// own margin, border and corner, and its always-empty caption takes no room.
// The grains' start times over the output scope are a canvas laid exactly on
// the scope's, so it moves nothing. Play sits on its own row, at its own size.
// A patch picker standing alone (`outputScope: false`) spans its row, with
// the kit's own phone arrangement of `.pos-pick` (shell.css) at every width
// (asked 2026-10-13, *"patch selector full w"*).
````

<a id="granulator-9"></a>
## granulator-9: demo/granulator/grain-rig.mjs, module, line 201

````js
/**
 * @param {object} o
 * @param o.d        the page's `mount()` result
 * @param o.engine   see the contract at the top of this file
 * @param o.patches  `[{ name, says, set }]`
 * @param o.controls the knobs, plain and stepped, see the contract above
 * @param o.roles    which control is a grain's length and which is how many a
 *                   second, for the self check: `{ size, density }`
 * @param o.hue      `(knob) => number|null`, a knob's hue, so a page that shows
 *                   its program can colour a knob and its control alike
 * @param o.under    elements that go under the knobs (a code box: knobs above
 *                   the code, as every concept page with both has them)
 * @param o.check    `async (tools) => {}`, the page's own checks, run inside the
 *                   self check while the sound is still playing
 * @param o.outputScope false for no output scope: the patch picker then stands
 *                   alone where the scope's panel was (050, asked 2026-10-13,
 *                   *"replace with just a patch selector (no scope/viz/footer)"*)
 * @param o.source   the id of the source the picker opens on (060 opens on
 *                   `ida`, asked 2026-10-13, *"put ida rec default"*); the
 *                   first one when it is not given or names none
 * @param o.wire     `({ bay, hold, holds, ports }) => {}`, called once the rig's own
 *                   nodes and links are in the bay and before the patchbay is
 *                   drawn, so a page can add nodes and links of its own (070's
 *                   tempo detector). `ports` names the rig's ports.
 * @param o.audio    `({ ctx, bus }) => {}`, called once when Play first builds
 *                   the audio graph: `bus` is the chosen source, the same node
 *                   the granulator and the source scope hear
 * @param o.top      elements after Play on its row (070's follow switch)
 * @param o.context  `() => AudioContext` to play in (48 kHz); left out, Play makes one
 *
 * Added 2026-10-13 for /granulator/beat/; a page that passes none of
 * wire, audio, top or `engine.value` gets what it got before.
 */
````

<a id="granulator-10"></a>
## granulator-10: demo/granulator/grain-rig.mjs, module, line 342

````js
  // ── the pictures ────────────────────────────────────────────────────────
  // The SOURCE scope: the last eight seconds of what went into the granulator,
  // which is exactly what its ring holds, with every grain a tick at the place
  // in that sound it read. The kit's `grainSeconds` puts a mark of position p
  // at `(1 - p) * 8` seconds ago, so each grain is handed `1 - ago / 8`.
````

<a id="granulator-11"></a>
## granulator-11: demo/granulator/grain-rig.mjs, module, line 511

````js
  // A knob's travel is 0 to 1 and its warp says what that means: `exp` puts
  // the middle of the knob at the middle of the octaves (20 ms to 4 s, 0.5 to
  // 64 a second), `lin` is straight. A glide moves the travel, so an `exp`
  // knob glides evenly in octaves.
````

<a id="granulator-12"></a>
## granulator-12: demo/granulator/grain-rig.mjs, module, line 711

````js
    // Wet and dry. What is heard is compared with the source: at 0 it IS the
    // source (a correlation near 1, at whatever lag the engine adds), at 1
    // it is grains, which are other moments of it at other pitches and much
    // less alike. The tick ink is read off both canvases.
````

<a id="granulator-13"></a>
## granulator-13: demo/granulator/grain-ring.mjs, module, line 1

````js
// demo/granulator/grain-ring.mjs: the grain ring's program, and the
// patches that are sets of its control values. /granulator/grains/ shows
// the text in its code box, compiles it with `/shell/sclang-lite.mjs` in the
// tab, and runs it on the tab's scsynth. Kept apart from the page so
// `sclang-lite-test.mjs` can compile the same text with no browser.
//
// THE PROGRAM. What comes in is written round an eight second mono buffer by
// BufWr; GrainBuf reads grains out of it; SendReply tells the page about every
// grain: where it read, how long it is, where the write head was, and its
// playback rate (negative when it plays backwards). `\mix` blends the input against the grains on the last line,
// with equal power so the middle does not dip; it is the page's wet/dry knob
// and no patch sets it. Every number a patch moves is a named control, so a patch is
// a set of `/n_set` values and never a different graph. An edit to the text is
// a different graph, and the page starts it in place of the old one with the
// same values, on the same buffer.
//
// SINCE 2026-10-13 IT HAS AN ECHO, A TONE, A TAPE THAT SLOWS AND A WAY BACKWARDS,
// for the Dub patch and the ones after it. `\tone` is a low pass on the
// grains. `\echo`, `\time` and `\dark` are a delay whose output comes back
// into its own input (LocalIn, DelayC, LocalOut), through a low pass at `dark`
// each time round, which is what makes a dub echo darker on every repeat.
// `\drop` and `\ramp` slow both heads by up to `drop` over every `1 / ramp`
// seconds, then spring back: a tape stop on a loop. `\dir` -1 plays every grain
// backwards (GrainBuf takes a negative rate and wraps the ring both ways).
// Every one of them is neutral at its default (DEFAULTS), so a patch that does
// not name them sounds as before.
//
// AND SINCE 2026-10-13 A BEAT GRID, for /granulator/beat/ (*"make followup
// demo with ida, dub and add tempo detection and feed it into granulator"*).
// `\lock` 1 takes the even grains off `Impulse` and onto a Phasor that goes
// round `density` times a second (`secs / frames` is one over the sample
// rate, as the buffer was allocated) and that `\beat` sets back to 0 when the
// page raises it on a beat. GrainBuf, TRand and SendReply all fire when their
// trigger goes from 0 or below to above 0, so the ramp shifted down by half
// fires once a turn, at the top. With `density` a whole number of grains a
// beat the grains land on the beat. Scattered grains (Dust) still come at
// random and count only on the low half of a turn. `\lock` 0 is the old
// graph's sound exactly: the Impulse at its old rate and the ramp times 0.
//
// The comments in it are for a visitor reading the box: short and plain.
````

<a id="granulator-14"></a>
## granulator-14: demo/granulator/grain-ring.mjs, module, line 92

````js
/**
 * What a control sits at when a patch does not name it. Every control added
 * after the first five patches is NEUTRAL here, so a patch that names none of
 * them sounds as it did: `tone` 20 kHz is the low pass open, `echo` 0 sends
 * nothing round the echo, `drop` 0 never slows the tape, `dir` 1 plays forwards.
 */
````

<a id="granulator-15"></a>
## granulator-15: demo/granulator/grain-ring.mjs, module, line 101

````js
/**
 * Ten sounds, each a set of control values on the one program, each one
 * musical idea. `size` and `density` are the two knobs every check leans on,
 * so every patch names both. The first is the one the page opens on.
 *
 * Asked 2026-10-13 (BACKLOG): *"make more interstin ganulator parches. do dub,
 * put ida rec default and dub degault"*. Cloud and Shimmer are the old ones
 * with an echo; Freeze, Stutter and Stretch became Frozen choir, Gate and Slow
 * motion. `amp` levels them against each other, measured on the Ida recording.
 */
````

<a id="granulator-16"></a>
## granulator-16: demo/granulator/grain-ring.mjs, module, line 112

````js
  // Tape stop first, the default (asked 2026-10-13, *"raadio 2 and tape stop default"*).
````

<a id="granulator-17"></a>
## granulator-17: demo/granulator/grain-ring.mjs, module, line 150

````js
// ── the engine, behind grain-rig.mjs's contract ───────────────────────────
// Lifted 2026-10-14 from /granulator/grains/ for /connect/ (plans/
// plan-connect-ui.md, the convergence rule); /granulator/beat/ still carries
// its own copy with the tempo. Its program is compiled when it is made (pure
// JavaScript, no fetch); `boot` brings scsynth up in the context it is handed.
````

<a id="granulator-18"></a>
## granulator-18: demo/granulator/grain-ring.mjs, module, line 177

````js
        // `SendReply.ar(trig, '/grain', [pos, size, write / frames, rate])`
        // arrives as ['/grain', nodeID, replyID, pos, size, write head, rate]:
        // SendReply puts two of its own in front. Both positions are fractions
        // of the same eight seconds, so how long ago the grain's audio came in
        // is their difference round the ring.
````

<a id="granulator-19"></a>
## granulator-19: demo/granulator/grains/index.html, inline script, line 16

````js
  // concepts sampler/060, GRANULATOR, 2026-10-13. Asked (BACKLOG): *"the plain
  // GrainBuf ring is the real lighter twin of Pappus - do"*; archived for an
  // afternoon and brought back the same day as THE granulator (*"but we got
  // rid of pappus?!? 060 ???"*). The Pappus page it was the light twin of is
  // /archive/pappus/.
  //
  // One small SynthDef: BufWr writes the source round an eight second mono
  // buffer, GrainBuf reads grains out of it, and SendReply reports every
  // grain. Its text is `../grain-ring.mjs`'s PROGRAM, compiled in this tab by
  // `/shell/sclang-lite.mjs` as the page opens (pure JavaScript, no fetch) and
  // run on the tab's scsynth. The text is not shown (asked 2026-10-13, *"rm
  // code box from our granulator"*); every control in it is a named control.
  //
  // The ten patches are sets of control values on the one program (`/n_set`),
  // so a patch never swaps the graph. It opens on Tape stop and on the Raadio 2 recording
  // (asked 2026-10-13, *"do dub, put ida rec default and dub default"*). After the rig's wet/dry, seven knobs
  // (asked 2026-10-13, *"our grain can have ~7 params + wet/dry as first"*),
  // most audible first:
  //   size     how long each grain is
  //   density  how many grains a second
  //   pitch    how fast each grain plays, an octave up at 2
  //   back     how far behind the input the grains read
  //   speed    how fast the read head moves: 1 follows, below 1 stretches
  //   scatter  even grains at 0, grains at random at 1
  //   freeze   the ring stops recording and holds what it has (off or on)
  // What is left (FIXED below: the texture, the tone, the echo, the tape and
  // its direction, the level) is what makes a patch that patch; the patch
  // alone sets it, on its own wire from web:patch into web:grains, with
  // `/n_set` at once and no glide.
  //
  // Everything that is not the engine is `../grain-rig.mjs`, shared with the
  // archived Pappus page.
````

<a id="granulator-20"></a>
## granulator-20: demo/granulator/grains/index.html, inline script, line 60

````js
    // On or off, so a stepped knob with two positions (asked 2026-10-13,
    // *"convert freeze to 0 1 knob"*). It steps at the start of a glide.
````

<a id="granulator-21"></a>
## granulator-21: demo/granulator/grains/index.html, inline script, line 80

````js
    // The patch picker on its own row, full width, and no output scope (asked
    // 2026-10-13, *"replace with just a patch selector (no scope/viz/footer)"*
    // and *"patch selector full w"*).
````
