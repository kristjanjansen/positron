// demo/muta/muta-worklet.js: both instruments on the audio thread, in two
// real worklet processors.
//
// 🔴 TWO PROCESSORS, TWO WASM MODULES, ONE GRAPH. `plai-voice` runs Plaits and
// `warp-mod` runs Warps, and the page connects the first into the second. They
// are two separate `.wasm` artefacts built from two separate shims at one
// pinned commit, and neither knows the other exists: what joins them is a
// WebAudio connection, which is the thing this page is for. Registering both
// here rather than in two files is one `addModule` and one global scope.
//
// 🔴 AND THE PLAITS NODE PUTS ITS TWO JACKS ON TWO CHANNELS, WHICH IS WHAT
// CHANGED WHEN THE CHAIN ARRIVED. Plaits renders `out` and `aux`, and until
// this page had something downstream to feed they were the same signal copied
// to both channels with a switch to say which. Warps takes a CARRIER and a
// MODULATOR, so channel 0 carries `out` and channel 1 carries `aux` and the
// effect below gets two genuinely different signals out of one oscillator.
// ⚠️ THAT IS STILL NOT A STEREO PAIR. Two jacks on a module are not left and
// right, and nothing here pans them.
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
    if (m.t === 'param') { this.ex.plai_set_param(m.id, m.value); return; }
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

    const voice = ex.plai_note_on(m.note, hold);
    this.port.postMessage({
      t: 'note',
      note: m.note,
      voice,
      holdBlocks: hold,
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
    // the hardware they are two sockets. Channel 0 carries `out` and channel 1
    // carries `aux` so that `warp-mod` below has a carrier and a modulator to
    // work on; a page listening to this node directly would hear two different
    // sounds in two ears, which is why nothing connects it to a destination.
    ch[0].set(this.out.subarray(0, frames));
    if (ch.length > 1) ch[1].set(this.aux.subarray(0, frames));

    if (peak > this.peak) this.peak = peak;

    this.quanta++;

    // Report four times a second, not per quanta. A readout cell is a fixed
    // box and a message per 2.67 ms is 375 posts a second for a number nobody
    // can read that fast.
    if (this.quanta % 94 === 0) {
      this.port.postMessage({
        t: 'meter',
        peak: this.peak,
        /**
         * 🔴 A WINDOW OF THE SIGNAL ITSELF, FOR THE PICTURE. Asked 2026-09-22:
         * *"can you have wave / osilocope visualizer to top of muta. plai and
         * warp with different colors"*, and *"what about waveform under
         * warps?"*.
         * ⚠️ **IT RIDES THE REPORT THAT ALREADY EXISTS RATHER THAN OPENING A
         * SECOND CHANNEL.** The meter goes four times a second, which is about
         * the rate a person reads at, so a scope costs one copy per report and
         * no extra message. A window per quantum would be 375 posts a second.
         * ⚠️ AND IT IS ONE QUANTUM, NOT A HISTORY. What a scope is for here is
         * the SHAPE each firmware makes, and 128 frames at 48 kHz holds several
         * cycles of anything at a musical pitch.
         */
        wave: Array.from(this.out.subarray(0, Math.min(frames, 128))),
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

/**
 * ── WARPS, THE SECOND FIRMWARE ─────────────────────────────────────────────
 *
 * The parameter ids, the second of three copies. The others are
 * demo/muta/build/warp_shim.cc and demo/muta/index.html, and all three spell
 * the names out because a mismatch moves the wrong control rather than
 * throwing.
 */
const W = {
  algorithm: 0, amount: 1, drive1: 2, drive2: 3, note: 4, carrier: 5,
};

/**
 * 🔴 AN UNCONNECTED INPUT IS AN EMPTY ARRAY, NOT AN ARRAY OF ZEROS, AND THAT
 * IS THE ONE TRAP IN A PROCESSOR THAT TAKES INPUT. Chrome hands `inputs[0]` as
 * `[]` when nothing upstream is producing, so `inputs[0][0].length` throws and
 * `inputs[0][0]` is `undefined` before that. This module still has work to do
 * in that case: with a carrier shape set it renders its own oscillator and
 * needs no external signal at all, so the answer is a silent input rather than
 * an early return.
 *
 * ⚠️ AND IT NEVER RETURNS FALSE. A processor that returns false is torn down
 * for the life of the page, and this one is downstream of an instrument that
 * is silent most of the time.
 */
class WarpMod extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ex = null;
    this.inL = null;
    this.inR = null;
    this.out = null;
    this.aux = null;
    this.inLPtr = 0;
    this.inRPtr = 0;
    this.outPtr = 0;
    this.auxPtr = 0;
    this.blockSize = 60;
    this.quanta = 0;
    this.peak = 0;
    this.inPeak = 0;
    this.blocksLast = 0;
    this.spoke = false;
    this.port.onmessage = (e) => this.onMessage(e.data);
    this.port.onmessageerror = () =>
      this.port.postMessage({ t: 'fail', why: 'a message could not be read on the audio thread' });
  }

  onMessage(m) {
    if (!m) return;
    if (m.t === 'wasm') { this.boot(m.bytes, m.rate); return; }
    if (!this.ex) return;
    if (m.t === 'param') { this.ex.warp_set_param(m.id, m.value); return; }
  }

  boot(bytes, rate) {
    try {
      const module = new WebAssembly.Module(bytes);
      const imports = WebAssembly.Module.imports(module).length;
      const ex = new WebAssembly.Instance(module, {}).exports;
      // A STANDALONE_WASM reactor runs its static constructors in
      // `_initialize`. `warps/dsp/vocoder.h:39` is
      // `const float kFollowerGain = sqrtf(kNumBands);` at namespace scope,
      // which clang is expected to fold at -O3 and may instead emit into
      // `__wasm_call_ctors`, and `--no-entry` does not call that. Skipping this
      // would leave the envelope followers at a gain of zero, which is SILENCE
      // rather than an error.
      if (typeof ex._initialize === 'function') ex._initialize();

      // ⚠️ THE RETURN IS NOT A REFUSAL, UNLIKE `plai_init`. It answers whether
      // the host rate is the rate the filter bank's coefficients were computed
      // at, and at 48 kHz it is 0 and the module runs anyway with its twenty
      // vocoder bands an octave low. The page prints the shift.
      const tableRateOk = ex.warp_init(rate) === 1;

      this.inLPtr = ex.warp_in_l_ptr();
      this.inRPtr = ex.warp_in_r_ptr();
      this.outPtr = ex.warp_out_ptr();
      this.auxPtr = ex.warp_aux_ptr();
      const cap = ex.warp_scratch_frames();
      this.inL = new Float32Array(ex.memory.buffer, this.inLPtr, cap);
      this.inR = new Float32Array(ex.memory.buffer, this.inRPtr, cap);
      this.out = new Float32Array(ex.memory.buffer, this.outPtr, cap);
      this.aux = new Float32Array(ex.memory.buffer, this.auxPtr, cap);
      this.blockSize = ex.warp_block_size();
      this.ex = ex;

      this.port.postMessage({
        t: 'ready',
        imports,
        bytes: bytes.byteLength,
        tableRateOk,
        hostRate: rate,
        dspRate: ex.warp_sample_rate(),
        tableRate: ex.warp_table_rate(),
        blockSize: this.blockSize,
        maxBlock: ex.warp_max_block(),
        scratch: cap,
        bands: ex.warp_band_count(),
        bandShift: ex.warp_band_shift(),
        bandLo: ex.warp_band_lo(),
        bandHi: ex.warp_band_hi(),
        build: readString(ex, ex.warp_build()),
        sourceSha: readString(ex, ex.warp_source_sha()),
      });
    } catch (err) {
      this.port.postMessage({ t: 'fail', why: String(err && err.message || err) });
    }
  }

  process(inputs, outputs) {
    const ch = outputs[0];
    const inp = inputs[0];
    if (!this.spoke) {
      this.spoke = true;
      this.port.postMessage({
        t: 'entered', ready: !!this.ex,
        chans: ch ? ch.length : -1,
        inChans: inp ? inp.length : -1,
        frames: ch && ch[0] ? ch[0].length : -1,
      });
    }
    if (!this.ex || !ch || !ch.length) return true;
    const frames = ch[0].length;
    if (frames > this.out.length) return true;

    // CHANNEL 0 IS THE CARRIER AND CHANNEL 1 IS THE MODULATOR, which is the
    // order `warps/dsp/modulator.cc:214` reads them in: `input->l` is index 0
    // and `input->r` is index 1. A one channel input feeds both, because a
    // module patched with one cable does the same thing.
    const a = inp && inp.length ? inp[0] : null;
    const b = inp && inp.length > 1 ? inp[1] : a;
    let inPeak = 0;
    for (let i = 0; i < frames; i++) {
      const l = a ? a[i] : 0;
      const r = b ? b[i] : 0;
      this.inL[i] = l;
      this.inR[i] = r;
      const m = l < 0 ? -l : l;
      if (m > inPeak) inPeak = m;
    }

    this.blocksLast = this.ex.warp_render(this.inLPtr, this.inRPtr, this.outPtr, this.auxPtr, frames);

    let peak = 0;
    for (let i = 0; i < frames; i++) {
      const v = this.out[i];
      const m = v < 0 ? -v : v;
      if (m > peak) peak = m;
    }
    // THE MAIN OUTPUT ON BOTH CHANNELS. `aux` is the module's second jack and
    // is metered below rather than heard, for the same reason Plaits' is: two
    // sockets are not two ears.
    for (let c = 0; c < ch.length; c++) ch[c].set(this.out.subarray(0, frames));

    if (peak > this.peak) this.peak = peak;
    if (inPeak > this.inPeak) this.inPeak = inPeak;
    this.quanta++;

    if (this.quanta % 94 === 0) {
      this.port.postMessage({
        t: 'meter',
        peak: this.peak,
        inPeak: this.inPeak,
        /* The effect's own output, the same window and for the same reason as
           the oscillator's. Two traces, one picture, so what the effect DID is
           the difference between them rather than something to take on trust. */
        wave: Array.from(this.out.subarray(0, Math.min(frames, 128))),
        blocks: this.ex.warp_blocks_rendered(),
        frames: this.ex.warp_frames_rendered(),
        blocksPerQuantum: this.blocksLast,
        // 🔴 THE FRAMES SITTING IN A BLOCK THAT IS NOT FULL YET. 128 is not a
        // multiple of 60, so this is never the same two quanta running and a
        // reading that never moved would mean the carry is not being kept.
        carry: this.ex.warp_carry(),
        algorithm: this.ex.warp_algorithm(),
        blend: this.ex.warp_algorithm_blend(),
        vocoding: this.ex.warp_vocoding() === 1,
        vocoderAmount: this.ex.warp_vocoder_amount(),
        carrier: this.ex.warp_carrier_shape(),
        quantum: frames,
      });
      this.peak = 0;
      this.inPeak = 0;
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
registerProcessor('warp-mod', WarpMod);
