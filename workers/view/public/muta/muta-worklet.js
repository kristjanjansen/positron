// demo/muta/muta-worklet.js: the instrument on the audio thread, in one real
// worklet processor.
//
// 🔴 AND THERE WERE TWO UNTIL 2026-09-28. `warp-mod` ran Warps in this same
// file, downstream of `plai-voice`, out of a second `.wasm` built from a second
// shim at the same pinned commit; neither knew the other existed and what
// joined them was a WebAudio connection made in the page. It went out on
// *"arhive/rmwarps and rm all routing code around it"*, and the class and its
// `registerProcessor` line went with it. The shim and the artefact are still in
// `build/` and `vendor/`.
//
// 🔴 THE PLAITS NODE PUTS ITS TWO JACKS ON TWO CHANNELS. Plaits renders `out`
// and `aux`, and on the hardware they are two sockets. Channel 0 carries `out`
// and channel 1 carries `aux`.
// ⚠️ THAT IS NOT A STEREO PAIR. Two jacks on a module are not left and right,
// and nothing here pans them, which is why the page takes channel 0 through a
// splitter rather than connecting this node to a destination.
// ⚠️ **AND THE TWO CHANNELS ARE KEPT RATHER THAN COLLAPSED.** They were the
// same signal copied to both with a switch to say which, until the effect
// needed a carrier and a modulator. `aux` is a real jack the module has, so
// dropping it would be this page deciding an instrument has one output.
//
// 🔴 NOT A ScriptProcessorNode, AND THAT IS THE POINT OF THE PAGE.
// `plans/plan-vcv-modules.md` §9.2 measured the only shipped browser build of
// this ecosystem: Cardinal's web target runs its whole engine inside
// `createScriptProcessor(2048, …)` on the MAIN THREAD, which is 42.7 ms of
// buffer at 48 kHz and DSP competing with layout, paint and garbage collection.
// DPF contains zero occurrences of `audioWorklet`. This file is 128 frames on
// the audio thread, which is 2.67 ms, and nothing here can be delayed by a
// reflow.
//
// 🔴 A WORKLET CANNOT `fetch`. There is no `fetch`, no `document`, no
// `XMLHttpRequest` and no module loader in an `AudioWorkletGlobalScope`, which
// is why the wasm arrives over the port as BYTES and is compiled here.
//
// 🔴 AND IT ARRIVES AS BYTES BECAUSE A `WebAssembly.Module` DOES NOT.
// MEASURED 2026-09-22 in headless Chrome 141: posting a compiled
// `WebAssembly.Module` to this port throws nothing on the sending side, is
// never delivered on this side, and produces no error anywhere. The page's own
// log read `the audio thread ran the processor, 2 channels of 128 frames, wasm
// not yet` and then a five second timeout, which is the shape of a dropped
// message wearing the face of a broken instrument. A `messageerror` handler is
// installed at both ends now so the next one says so out loud.
// ⚠️ `new WebAssembly.Module(bytes)` IS SYNCHRONOUS AND THAT IS ALLOWED HERE.
// The 4 KB ceiling on synchronous compilation applies to the main thread; an
// AudioWorkletGlobalScope is not the main thread. It happens once, during
// boot, before anything is listening.
//
// 🔴 AND IT NEEDS NO IMPORTS AT ALL. MEASURED on the artefact:
// `WebAssembly.Module.imports()` is an EMPTY ARRAY. The build is
// `-sSTANDALONE_WASM --no-entry` with no filesystem and no exceptions, so there
// is no emscripten JS glue to leave behind and no WASI shim to write. The
// instantiation below passes `{}` and that is not a simplification.
//
// ⚠️ MEMORY GROWTH IS OFF IN THE BUILD (`-sALLOW_MEMORY_GROWTH=0`), so
// `memory.buffer` never detaches and the two Float32Array views can be made
// once. With growth ON they would silently become zero-length after the first
// grow, which is a class of bug that sounds like the instrument going quiet.
//
// ── A NOTE IS NOT A PARAMETER, AND THAT IS WHAT CHANGED FOR POLYPHONY ───────
//
// 🔴 UNTIL THE VOICES ARRIVED, A PLUCK WAS `plai_set_param(7, 1)` FOLLOWED BY
// `plai_set_param(7, 0)` TWO QUANTA LATER, AND BOTH OF THOSE IDS ARE GONE.
// A gate belongs to ONE voice, so it cannot be a panel parameter: parameter 7
// (trigger) and parameter 9 (trigger_patched) were removed from the shim and
// replaced by `plai_note_on`, `plai_all_off` and `plai_set_drone`. The old ids
// now fall through the shim's `default: break`, which means a page still
// sending them makes no sound and reports no error. They are listed below as
// removed for exactly that reason.
//
// ⚠️ AND THE GATE IS COUNTED IN BLOCKS OF TWELVE, NOT IN RENDER QUANTA. The
// shim counts a hold in Plaits blocks because that is the clock its envelopes
// run on. This file converts once, from milliseconds, using the block size the
// wasm reports rather than a 12 typed here a second time.

// The parameter ids, spelled out. The same list is in
// demo/muta/build/plai_shim.cc and a disagreement between them moves the wrong
// control rather than throwing, which is why both sides carry the names.
const P = {
  engine: 0, note: 1, harmonics: 2, timbre: 3, morph: 4,
  decay: 5, lpgColour: 6, level: 8, levelPatched: 10,
  fmAmount: 11, timbreModAmount: 12, morphModAmount: 13,
  // 7 and 9 are deliberately absent. See the header.
};

// 🔴 THERE IS NO CLOCK IN HERE, MEASURED RATHER THAN ASSUMED. This file timed
// its own `plai_render` with `performance.now()` until 2026-09-22, and in
// headless Chrome 141 the page reported `the audio thread here has no clock`
// on every run: `performance` is not exposed to an AudioWorkletGlobalScope by
// the specification and Chrome does not add it. `currentTime` and
// `currentFrame` are wall clock and sample position, neither of which is CPU.
// So the render cost is measured on the MAIN thread, in demo/muta/index.html,
// against a second instance of this same wasm, and the page says where the
// number came from. Timing nothing and printing a zero would have read as
// free.

const SCOPE_RING = 2048;
const SCOPE_OUT = 256;
// How many cycles of the fundamental the picture shows.
const SCOPE_CYCLES = 4;

function scopeWindow(ring, write, held, prev) {
  const lin = new Float32Array(SCOPE_RING);
  for (let i = 0; i < SCOPE_RING; i++) lin[i] = ring[(write + i) % SCOPE_RING];

  let peak = 0;
  for (let i = 0; i < SCOPE_RING; i++) { const m = Math.abs(lin[i]); if (m > peak) peak = m; }
  if (peak < 0.0005) return null;

  /**
   * 🔴 A HYSTERESIS TRIGGER, AND IT HAS TO BE HIGH. A bare zero crossing fires
   * on any wobble through zero, and these engines put out stepped signals that
   * wobble: at `timbre 0.86` the virtual analog wave crossed the old quarter
   * peak level TWICE a cycle, so the period came out halved, the span read
   * **7.4 ms where four cycles at MIDI 60 is 15.3**, and the time base flipped
   * between one reading and the other. Reported as *"its very nervous in this
   * setting"*.
   * ✅ Half the peak, and it has to STAY above for three samples. A step that
   * touches the level and falls back is not a cycle starting.
   */
  const level = peak * 0.5;
  const rises = [];
  let armed = false;
  for (let i = 0; i < SCOPE_RING - 3; i++) {
    if (lin[i] < -level) { armed = true; continue; }
    if (!armed || lin[i] <= level) continue;
    if (lin[i + 1] > level && lin[i + 2] > level) { rises.push(i); armed = false; }
  }
  if (rises.length < 2) return null;

  const gaps = [];
  for (let i = 1; i < rises.length; i++) gaps.push(rises[i] - rises[i - 1]);
  gaps.sort((x, y) => x - y);
  let period = gaps[gaps.length >> 1];
  if (!(period > 1)) return null;

  /**
   * 🔴 AND THE TIME BASE IS HELD BETWEEN CAPTURES, WHICH IS WHAT A SCOPE'S
   * HOLD DOES. A period re-measured 47 times a second wanders by a frame or
   * two even on a steady note, and every wander restretches the whole window,
   * so the picture breathes and the phosphor's ghosts never sit under the live
   * trace. A new reading is taken only when it differs by more than a tenth,
   * which is a real change of pitch rather than measurement noise.
   */
  /* The caller's own figure wins outright when it has one: it is arithmetic on
     a note somebody set rather than a reading of a signal, so it is exact and
     cannot wander. Measuring is the fallback for a voice whose pitch nothing
     here knows. */
  if (held > 1) period = held;

  /**
   * 🔴 THE START IS CHOSEN BY MATCHING THE LAST WINDOW, NOT BY THE FIRST
   * TRIGGER. A threshold says WHERE a cycle begins only on a simple wave. At
   * `timbre 0.99` a waveshaper crosses the level more than once a cycle, so
   * *the first rise in the ring* is a different feature of the wave each time,
   * and the picture jumps by a fraction of a cycle even with the period exact.
   * MEASURED before this: consecutive windows differed by **0.03 to 0.17 worst
   * sample on a signal whose peak is 0.125**, which is the same size as the
   * signal. Reported as *"i still see some nervousness"*.
   * ✅ **SO IT LOCKS TO ITSELF.** Every candidate start within one period is
   * scored against the window that was drawn last, and the best match wins.
   * That is what a scope's phase lock does, and it is the only thing that works
   * when the wave has no single unambiguous edge.
   * ⚠️ THE FIRST CAPTURE HAS NOTHING TO MATCH, so the trigger picks it and
   * every later one follows from it.
   * ⚠️ AND THE SEARCH IS COARSE THEN FINE, so it costs about 3,000 comparisons
   * rather than 47,000: 32 steps across the period, then 8 either side of the
   * winner.
   */
  let span = Math.round(period * SCOPE_CYCLES);
  let start = rises[0];
  if (prev && prev.length === SCOPE_OUT) {
    const step0 = span / SCOPE_OUT;
    const score = (off) => {
      if (off < 0 || off + span >= SCOPE_RING) return Infinity;
      let sum = 0;
      for (let i = 0; i < SCOPE_OUT; i += 2) {
        const at = off + i * step0;
        const k = Math.floor(at);
        const fr = at - k;
        const v = lin[k] * (1 - fr) + lin[Math.min(k + 1, SCOPE_RING - 1)] * fr;
        const d = v - prev[i];
        sum += d * d;
      }
      return sum;
    };
    let best = start, bestScore = Infinity;
    const coarse = Math.max(1, Math.round(period / 32));
    for (let o = rises[0]; o < rises[0] + period; o += coarse) {
      const sc = score(o);
      if (sc < bestScore) { bestScore = sc; best = o; }
    }
    for (let o = best - coarse; o <= best + coarse; o++) {
      const sc = score(o);
      if (sc < bestScore) { bestScore = sc; best = o; }
    }
    start = best;
  }
  if (start + span > SCOPE_RING) span = SCOPE_RING - start;
  if (span < 8) return null;

  /**
   * ⚠️ INTERPOLATED, NOT NEAREST. `span / SCOPE_OUT` is about 2.87 frames, so
   * taking `lin[floor(i * step)]` picks a different sub-position in each source
   * cycle every time the start moves by a fraction of a frame. On a stepped
   * waveform that reads as the trace shivering even when the window is
   * perfectly placed. MEASURED between consecutive windows: nearest-sample left
   * 0.02 to 0.06 of difference on a signal peaking at 0.125.
   */
  const out = new Array(SCOPE_OUT);
  const step = span / SCOPE_OUT;
  for (let i = 0; i < SCOPE_OUT; i++) {
    const at = start + i * step;
    const k = Math.floor(at);
    const f = at - k;
    out[i] = lin[k] * (1 - f) + lin[Math.min(k + 1, SCOPE_RING - 1)] * f;
  }
  out.spanFrames = span;
  out.period = period;
  return out;
}

class PlaiVoice extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ex = null;              // the wasm exports
    this.out = null;             // Float32Array view onto the main scratch
    this.aux = null;
    this.outPtr = 0;
    this.auxPtr = 0;
    this.channel = 0;            // 0 main, 1 aux
    this.blockSize = 12;
    this.maxVoices = 1;
    this.quanta = 0;
    this.scopeRing = new Float32Array(SCOPE_RING);
    this.scopeAt = 0;
    this.scopePeriod = 0;
    this.scopeHz = 0;
    this.scopePrev = null;
    this.peak = 0;
    this.blocksLast = 0;
    this.announced = false;      // the first rendered quantum, said once
    this.spoke = false;          // the first process() call, said once
    this.port.onmessage = (e) => this.onMessage(e.data);
    // A message that cannot be deserialized here fires THIS rather than
    // `message`, and with no handler it is silence. That is exactly how the
    // compiled-Module route failed.
    this.port.onmessageerror = () =>
      this.port.postMessage({ t: 'fail', why: 'a message could not be read on the audio thread' });
  }

  onMessage(m) {
    if (!m) return;
    if (m.t === 'wasm') { this.boot(m.bytes, m.rate); return; }
    if (!this.ex) return;
    if (m.t === 'param') {
      this.ex.plai_set_param(m.id, m.value);
      /**
       * 🔴 THE SCOPE'S TIME BASE COMES FROM THE NOTE, NOT FROM THE SIGNAL.
       * Reported as *"supernervous"* after two rounds of trying to make a
       * measured period hold still. **Measuring was the wrong approach and no
       * amount of smoothing fixes it**: a waveshaper at `timbre 0.99` and eight
       * voices put out something with no single period to find, so every
       * capture disagreed with the last and the whole window restretched.
       * ✅ The page already KNOWS the pitch, because it set it. Parameter 1 is
       * the note, so the period is exact arithmetic rather than a reading, and
       * it cannot jitter at all.
       * ⚠️ IT IS STILL TRIGGERED. A known period says how much to show, and a
       * trigger says where to start; without the second the window would slide
       * one quantum at a time even with a perfect time base.
       */
      if (m.id === 1) this.scopeHz = 440 * Math.pow(2, (m.value - 69) / 12);
      return;
    }
    if (m.t === 'channel') { this.channel = m.value ? 1 : 0; return; }
    if (m.t === 'voices') {
      const got = this.ex.plai_set_polyphony(m.n | 0);
      this.port.postMessage({ t: 'voices', asked: m.n | 0, got, trim: this.ex.plai_trim() });
      return;
    }
    if (m.t === 'allOff') {
      this.ex.plai_all_off();
      this.port.postMessage({ t: 'allOff', held: this.ex.plai_held() });
      return;
    }
    if (m.t === 'drone') {
      this.ex.plai_set_drone(m.on ? 1 : 0);
      this.port.postMessage({ t: 'drone', on: this.ex.plai_droning() === 1, held: this.ex.plai_held() });
      return;
    }
    if (m.t === 'noteOn') { this.noteOn(m); return; }
    /* A KEY COMING BACK UP, WHICH THE SHIM COULD NOT BE TOLD ABOUT UNTIL
       2026-09-22. `plai_note_off` drops that note's gate and leaves the voice
       rendering, so the lowpass gate closes over `decay` rather than the sound
       being cut. `released` is 0 for a note nobody is holding, which is an
       ordinary thing for a keyboard to send and not an error. */
    if (m.t === 'noteOff') {
      const released = this.ex.plai_note_off(m.note);
      this.port.postMessage({ t: 'noteOff', note: m.note, released, held: this.ex.plai_held() });
      return;
    }
  }

  /**
   * ONE NOTE, AND A REPORT OF WHERE IT LANDED.
   *
   * 🔴 THE LEVELS ARE READ **BEFORE** THE NOTE, WHICH IS THE ONLY MOMENT THEY
   * MEAN ANYTHING. The shim steals the quietest voice, and a page checking that
   * rule against levels sampled by the meter up to 250 ms later would be
   * grading the decision against a different set of numbers from the one the
   * decision was made on. This is the same instant, one line apart.
   */
  noteOn(m) {
    const ex = this.ex;
    const poly = ex.plai_polyphony();
    const before = [];
    for (let v = 0; v < poly; v++) before.push(ex.plai_voice_level(v));

    // Milliseconds in, blocks out, converted with the block size the wasm
    // reports. 0 holds the gate up until something else takes it down, which is
    // what a sustained note and the drone both want.
    const ms = Number(m.holdMs) || 0;
    const hold = ms > 0
      ? Math.max(1, Math.round((ms / 1000) * sampleRate / this.blockSize))
      : 0;

    /* 0..1, and only read for a held note. `voice.cc:143` turns it into the
       engine's accent as well as the lowpass gate's level, so this is velocity
       arriving at the DSP rather than being counted and thrown away. */
    const level = Number.isFinite(m.level) ? Math.min(1, Math.max(0, m.level)) : 1;
    const voice = ex.plai_note_on(m.note, hold, level);
    this.port.postMessage({
      t: 'note',
      note: m.note,
      voice,
      holdBlocks: hold,
      level,
      stolen: ex.plai_last_stolen(),
      stolenNote: ex.plai_last_stolen_note(),
      stolenLevel: ex.plai_last_stolen_level(),
      steals: ex.plai_steals(),
      held: ex.plai_held(),
      before,
    });
  }

  boot(bytes, rate) {
    try {
      const module = new WebAssembly.Module(bytes);
      // MEASURED HERE RATHER THAN ASSUMED. A standalone build with no
      // emscripten glue should need nothing at all from its host, and this is
      // the one line that can say so about the module actually running.
      const imports = WebAssembly.Module.imports(module).length;
      const inst = new WebAssembly.Instance(module, {});
      const ex = inst.exports;
      // A STANDALONE_WASM reactor runs its static constructors in
      // `_initialize`. Skipping it leaves every global half-built and the
      // failure is silence rather than an error.
      if (typeof ex._initialize === 'function') ex._initialize();

      const rateOk = ex.plai_init(rate) === 1;
      this.outPtr = ex.plai_out_ptr();
      this.auxPtr = ex.plai_aux_ptr();
      const cap = ex.plai_scratch_frames();
      this.out = new Float32Array(ex.memory.buffer, this.outPtr, cap);
      this.aux = new Float32Array(ex.memory.buffer, this.auxPtr, cap);
      this.blockSize = ex.plai_block_size();
      this.maxVoices = ex.plai_max_voices();
      this.ex = ex;

      this.port.postMessage({
        t: 'ready',
        imports,
        bytes: bytes.byteLength,
        rateOk,
        hostRate: rate,
        dspRate: ex.plai_sample_rate(),
        blockSize: this.blockSize,
        engines: ex.plai_engine_count(),
        scratch: cap,
        maxVoices: this.maxVoices,
        polyphony: ex.plai_polyphony(),
        trim: ex.plai_trim(),
        voiceBytes: ex.plai_voice_bytes(),
        allocBytes: ex.plai_alloc_bytes(),
        build: readString(ex, ex.plai_build()),
        sourceSha: readString(ex, ex.plai_source_sha()),
      });
    } catch (err) {
      this.port.postMessage({ t: 'fail', why: String(err && err.message || err) });
    }
  }

  process(inputs, outputs) {
    const ch = outputs[0];
    // 🔴 A PROCESSOR THAT RETURNS EARLY AND ONE THAT IS NEVER CALLED ARE THE
    // SAME SILENCE FROM OUTSIDE, AND THEY ARE DIFFERENT BUGS. One says the
    // audio thread is not running this node at all; the other says it is and
    // the guard above is refusing. The first call says which, once.
    if (!this.spoke) {
      this.spoke = true;
      this.port.postMessage({
        t: 'entered', ready: !!this.ex,
        chans: ch ? ch.length : -1, frames: ch && ch[0] ? ch[0].length : -1,
      });
    }
    if (!this.ex || !ch || !ch.length) return true;
    const frames = ch[0].length;
    if (frames > this.out.length) return true;     // never render past the scratch

    const blocks = this.ex.plai_render(this.outPtr, this.auxPtr, frames);
    // THE FIRST SAMPLE, ANNOUNCED FROM WHERE IT HAPPENS. "Ready" is the wasm
    // instantiating; this is the audio thread having actually produced
    // something, and the two are what the page's `boot` cell measures between.
    if (!this.announced) { this.announced = true; this.port.postMessage({ t: 'first' }); }
    this.blocksLast = blocks;

    const src = this.channel ? this.aux : this.out;
    let peak = 0;
    for (let i = 0; i < frames; i++) {
      const v = src[i];
      const a = v < 0 ? -v : v;
      if (a > peak) peak = a;
    }
    // 🔴 ONE JACK PER CHANNEL, WHICH IS NOT A STEREO PAIR AND IS NOT A
    // PANNING DECISION. Plaits renders TWO outputs, `out` and `aux`, and on
    // the hardware they are two sockets. A page listening to this node directly
    // would hear two different sounds in two ears, which is why nothing
    // connects it to a destination: the page takes channel 0 through a splitter
    // instead, and that is the jack a rack would patch.
    ch[0].set(this.out.subarray(0, frames));
    if (ch.length > 1) ch[1].set(this.aux.subarray(0, frames));

    if (peak > this.peak) this.peak = peak;

    for (let i = 0; i < frames; i++) {
      this.scopeRing[this.scopeAt] = this.out[i];
      this.scopeAt = (this.scopeAt + 1) % SCOPE_RING;
    }

    this.quanta++;

    // Report four times a second, not per quanta. A readout cell is a fixed
    // box and a message per 2.67 ms is 375 posts a second for a number nobody
    // can read that fast.
    /**
     * The picture posts on its own cadence, 8 quanta against the readout's 94.
     * A readout cell is a number somebody reads and four a second is plenty; a
     * scope is a moving thing and at four a second it lurches, which was
     * reported as *"wave updae feels slow"*. 8 quanta is about 47 a second.
     */
    if (this.quanta % 8 === 0) {
      const win = scopeWindow(this.scopeRing, this.scopeAt,
        this.scopeHz ? sampleRate / this.scopeHz : 0, this.scopePrev);
      if (win) {
        this.scopePeriod = win.period;
        this.scopePrev = win;
        this.port.postMessage({ t: 'wave', wave: win, waveFrames: win.spanFrames });
      }
    }

    if (this.quanta % 94 === 0) {
      this.port.postMessage({
        t: 'meter',
        peak: this.peak,
        blocks: this.ex.plai_blocks_rendered(),
        // 🔴 THE HALF THAT MAKES THE BLOCK INVARIANT CHECKABLE. `Voice::Render`
        // calls summed over every voice. With N voices sounding for a whole
        // window this advances by exactly N times `blocks`, and a voice that
        // rendered on its own schedule or at its own length would not divide.
        renders: this.ex.plai_voice_renders(),
        held: this.ex.plai_held(),
        poly: this.ex.plai_polyphony(),
        blocksPerQuantum: this.blocksLast,
        engine: this.ex.plai_active_engine(),
        frames,
      });
      this.peak = 0;
    }
    return true;
  }
}

/** Read a NUL-terminated ASCII string out of wasm memory. The shim returns
 *  pointers to static `const char[]`, so there is nothing to free. */
function readString(ex, ptr) {
  const m = new Uint8Array(ex.memory.buffer);
  let end = ptr;
  while (m[end]) end++;
  let s = '';
  for (let i = ptr; i < end; i++) s += String.fromCharCode(m[i]);
  return s;
}

registerProcessor('plai-voice', PlaiVoice);
