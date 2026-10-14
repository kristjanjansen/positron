# Page comments: synth

The full comments cut from the code under demo/ for synth, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="synth-1"></a>
## synth-1: demo/synth/dots/index.html, inline script, line 44

````js
  // /synth/recorder/ with the kit's own transport bar and timeline glued together in
  // place of the hand-made record buttons and notes table. A take is items on a
  // DECK; the deck plays them back through an adapter that sends each note out of
  // rec:midi-out. /synth/keyboard/ plus a RECORDER, a node of its own: `rec:midi-in` takes the
  // keyboard's notes along a link while armed, `rec:midi-out` plays them back
  // into the synth along another.
````

<a id="synth-2"></a>
## synth-2: demo/synth/dots/index.html, inline script, line 72

````js
  // ── the shader's picture: rings, one per pitch ───────────────────────
  // In the manner of dotpiano.com. Every pitch has its own ring, low notes inside.
  // A pen sits at the top and the whole picture turns clockwise under it, so a
  // held note draws a continuous arc on its ring for as long as it is held. On
  // release the arc stops growing, carries on turning and fades. The strokes live
  // here and reach the shader as numbers every frame: a shader cannot hear a note.
````

<a id="synth-3"></a>
## synth-3: demo/synth/dots/index.html, inline script, line 81

````js
  // ── the midi node: generic MIDI STATE, nothing about pictures ──────────
  // What is sounding and the last value of every controller, sent out of
  // midi:value-out ON CHANGE, as a copy, to whatever is linked. CC 7 is volume and
  // starts at 100. The shader keeps the last copy it was handed.
````

<a id="synth-4"></a>
## synth-4: demo/synth/dots/index.html, inline script, line 141

````js
  // TWO NODES. `midi` keeps generic MIDI state and sends it once a frame out of
  // midi:value-out when it changes. `shader` keeps whatever arrived last on shader:value-in, keeps its
  // own strokes from the notes in it, and turns CC 7 into brightness. It never
  // sees an event. Cut the value link and the picture freezes.
````

<a id="synth-5"></a>
## synth-5: demo/synth/dots/index.html, inline script, line 184

````js
  // ── the Pico: the same rings drawn by C firmware on an emulated RP2040 ──────
  // rig/pico/rings/main.c, built to /resources/pico/rings-pico.uf2 and run in
  // rp2040js in a worker. pico:midi-in turns each event back into MIDI bytes and
  // feeds them to UART0 RX, which is GP1, the DIN in. The firmware draws on its
  // SSD1306 and every new screen comes back as 128x64 ones and zeros.
  // ⚠️ NOTHING IS FETCHED ON A VISIT. The worker and the UF2 wait for the first
  // key, knob or press of the panel; bytes that arrive meanwhile are kept and
  // sent once it has booted.
  // The device is the kit's (pico.mjs `createPicoDevice`, which /connect/ runs too).
````

<a id="synth-6"></a>
## synth-6: demo/synth/keyboard/index.html, inline script, line 21

````js
  // The on-screen keyboard and a sine synth as patchbay nodes, all in this tab.
  // Named from the bay's side: what the keyboard PLAYS leaves it (an out), what
  // it SHOWS arrives (an in). Notes travel keys -> synth only along a link the
  // bay holds; the synth's sound goes to the speakers by WebAudio. No room.
````

<a id="synth-7"></a>
## synth-7: demo/synth/keyboard/index.html, inline script, line 68

````js
  // ── the links as a picture, with the links and ports behind its details ──
  // A MIDI wire pulses once per event its link delivered; the audio wire is lit
  // while the sine sounds.
  // The picture reads only nodes(), ports() and links(), and the bay has no way
  // to forget a node, so an unplugged device is hidden here and its links are
  // dropped. With nothing plugged in the picture is the three nodes it always was.
  // Keyboards plugged into this machine: each a `device` node whose midi-out is
  // linked to the synth (it sounds) and to the keys (they light).
````

<a id="synth-8"></a>
## synth-8: demo/synth/sound/index.html, inline script, line 16

````js
  // Sound design: one voice through every module the synth has. The keys play
  // the oscillator and open the amp's envelope, the oscillator goes through the
  // low-pass filter into the amp, the amp to the speakers and the scope, and
  // the LFO moves the filter's cutoff. Each knob is a node of its own with a
  // wire into the module it moves, in reading order: oscillator, filter,
  // envelope, LFO. Asked 2026-10-13, *"combine filter+envelope+lfo to single
  // sound design concept"*: this page was the filter alone, and 060 (envelope)
  // and 070 (LFO) were removed into it; their URLs 404 (no forwarding).
  // The voice is ../patch-synth.mjs and the page is ../module-page.mjs.
````

<a id="synth-9"></a>
## synth-9: demo/synth/timeline/index.html, inline script, line 26

````js
  // /synth/recorder/ with the kit's own transport bar and timeline glued together in
  // place of the hand-made record buttons and notes table. A take is items on a
  // DECK; the deck plays them back through an adapter that sends each note out of
  // rec:midi-out. /synth/keyboard/ plus a RECORDER, a node of its own: `rec:midi-in` takes the
  // keyboard's notes along a link while armed, `rec:midi-out` plays them back
  // into the synth along another.
````

<a id="synth-10"></a>
## synth-10: demo/synth/module-page.mjs, module, line 1

````js
// demo/synth/module-page.mjs: a patch of synth modules on a page,
// played from the kit's keys, a knob per parameter. It was written for three
// pages, one module each (050 filter, 060 envelope, 070 LFO, the split of
// synth/040), and since 2026-10-13 builds the one that replaced them,
// /synth/sound/ Sound design (*"combine filter+envelope+lfo to single
// sound design concept"*). It stays a module because the page is a patch and a
// knob list handed to it.
//
// The page, top to bottom, as positron-concepts lays out a synth: the
// waveform at full width, the knob row, the keys, the patchbay. The sound is
// patch-synth.mjs; the patchbay draws only the nodes the patch links, so it
// shows exactly the modules this page uses.
//
// NOTHING OPENS ON A VISIT. The AudioContext is made on the first key press,
// and until then a knob only moves the module's stored parameter.
````

<a id="synth-11"></a>
## synth-11: demo/synth/patch-synth.mjs, module, line 1

````js
// demo/synth/patch-synth.mjs: a mono WebAudio synth whose modules are bay
// nodes, and the router that wires the WebAudio graph from the links the bay
// holds. plans/plan-synth-patch.md §1 to §4. It was
// demo/concepts/synth/040/modules.mjs until 2026-10-13, when 040 was split into
// one page per module (*"can split https://positron.studio/concepts/synth/040/
// apart to different conecepts, do not dupe with existing ones (so only some
// last steps?). rm 040 later."*). It sits beside the pages that use it, as
// radio/tempo.mjs does. /synth/sound/ Sound design is its one page since
// 2026-10-13 (*"combine filter+envelope+lfo to single sound design concept"*),
// when the filter, envelope and LFO pages (050, 060, 070) became that one;
// module-page.mjs builds it.
//
// A module is a node with ports. An audio link is a `connect()` made by
// `route()`, a MIDI link carries notes through `bay.send`, and a value link
// carries a knob turn as `{ of: 'param', name, v }`, which the module's own
// `value-in` sets with `setTargetAtTime`. Nothing here draws anything.
//
// NOTHING OPENS ON IMPORT. The modules keep their parameters as plain state
// until `start(ctx)` is handed an AudioContext, which the page makes on the
// first key press.
````

<a id="synth-12"></a>
## synth-12: demo/synth/patch-synth.mjs, module, line 42

````js
/**
 * Every knob a module has. `owner` is the module whose `value-in` takes the
 * name; `raw` is what the dial shows (0 to 127 for an exponential one) and
 * `value(raw)` is what travels along the link. A page offers some of them.
 */
````

<a id="synth-13"></a>
## synth-13: demo/synth/patch-synth.mjs, module, line 57

````js
  // Depth is in octaves and travels as cents, because the LFO moves the
  // filter's detune rather than its frequency. A swing in Hz below a low
  // cutoff drove the frequency to 0 and the wave went flat for half of
  // every cycle (asked 2026-10-10, *"lfo just flattens osc"*).
````

<a id="synth-14"></a>
## synth-14: demo/synth/patch-synth.mjs, module, line 84

````js
// One node per knob, eurorack style (*"Per knob. Lets go eurorack :)"*): each
// knob a page offers is a box of its own, `web:knob-<name>`, with a cable into
// the module it moves.
````

<a id="synth-15"></a>
## synth-15: demo/synth/patch-synth.mjs, module, line 180

````js
  // ── the bay ─────────────────────────────────────────────────────────────
  // The shapes are /shell/nodes.mjs's, among them `filter:cutoff-in`, the
  // named exception to `<medium>-<dir>` (plans/plan-synth-patch.md §3 option A).
  // A port's label is its own `node:port`, which is what a refusal names.
````

<a id="synth-16"></a>
## synth-16: demo/synth/patch-synth.mjs, module, line 193

````js
  /**
   * Replace the whole patch with `text`. Returns the lines the bay refused,
   * each with its reason, or throws the parser's own sentence for a line it
   * cannot read at all.
   */
````

<a id="synth-17"></a>
## synth-17: demo/synth/patch-synth.mjs, module, line 256

````js
  /**
   * THE ROUTER. Reads `bay.links()` and connects exactly what is held: a
   * module's audio out to the far module's input, which is a node or, for
   * `cutoff-in`, the filter's detune AudioParam. Every out is disconnected
   * first, so an unlinked edge goes silent. Called after every link change.
   * The wiring is the kit's routeAudio (audio-router.mjs), lifted from here.
   */
````
