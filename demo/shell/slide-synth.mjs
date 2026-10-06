// demo/shell/slide-synth.mjs: a Faust program on a split slide, editable, with a Test tone.
//
//   import { synthSlot } from '/shell/slide-synth.mjs';
//   { layout: 'split', side: 'right', say: 'A sine in two lines', text: '...', slot: synthSlot(step) }
//
// 🔴 ONE INSTRUMENT PANEL IN THE SLOT SINCE 2026-10-06, asked as *"in right:
// (instrument panel with waveform from muta, then editable code, hardcoded
// params for minimal sine and then fau nameplate and test tone button on
// right"*. `step` is the one entry of `SYNTH_STEPS` in
// `demo/shell/synth-steps.mjs`, a MONO program with its numbers typed in. Top to
// bottom, all in `createInstrumentPanel`:
//
//   viz       the output, live, drawn the way `/muta/` draws its scope
//             (`createWaveShape` fed from an analyser while the tone sounds)
//   controls  the code box, EDITABLE, edge to edge like `/fau/`'s
//   plate     FAU, and `Start` / `Stop` at the right end; `Compiling` breathes in the code box's corner
//
// No keyboard and no knobs: the program has no `freq`, `gain` or `gate`.
// Until 2026-10-06 this module put a read only listing on the words side and
// one octave of keys and the step's knobs in the slot, one slide per step of a
// growing polyphonic voice; those steps left the deck the same day.
//
// ── THE CONTRACT, `plans/plan-live-slides.md` section 3.3 ─────────────────
//
//   build   (this function, called by `createSlide` on a VISIT) DRAWS ONLY: the
//           empty scope, the code box with the Faust hues, the plate. No
//           `import()`, no `fetch`, no AudioContext.
//   press   `Test tone`. `sharedAudio()` and `claim()` from `audio.mjs` inside
//           the gesture, then `import('./faust.mjs')` and:
//             the code as shipped   `faustFactory()` of the ahead of time files,
//                                   3.8 kB, no compiler
//             the code edited       `faustCompile(..., { mono: true })`, which
//                                   loads the live compiler (`faustCompiler()`,
//                                   about 1 MB over the wire, once per tab) and
//                                   compiles the text in the box
//           A second press switches the tone off.
//   start   on show, including slide 0 of a visit and every step: nothing.
//   stop    on leaving the slide, and by `claim()` when another slot takes the
//           sound: the tone off, and `release()`, which suspends the context
//           when nobody holds it.
//
// 🔴 A COMPILE ERROR IS SHOWN, NEVER THROWN. The scope draws the compiler's
// first line in words where the trace would be (`reason`, which
// `createWaveShape` already lays out at the foot of an empty figure), the note
// says `does not compile`, and nothing sounds. The figure keeps its height
// either way, so an error arriving moves nothing.
//
// 🔴 `audio.mjs` IS A STATIC IMPORT AND `faust.mjs` IS NOT, ON PURPOSE.
// `audio.mjs` does nothing on import and `sharedAudio()` has to run INSIDE the
// gesture. `faust.mjs` is reached only through `import()`, so the front page
// never pays for it on a visit.
//
// ⚠️ TYPING IN THE BOX NEVER STEPS THE DECK. The player's key handler already
// leaves a key aimed at a TEXTAREA to it (`slide.mjs`, `onKey`), and a tap on
// one is the slide's own (`OWN_TAPS`), so nothing here has to stop anything.

import { el } from './shell.mjs';
import { fitBox } from './slide.mjs';
import { createCodeBox } from './code-box.mjs';
import { createWaveShape } from './synth-view.mjs';
import { createInstrumentPanel } from './instrument-panel.mjs';
import { sharedAudio, claim, release } from './audio.mjs';
import { synthUrl } from './synth-steps.mjs';
import { createCompileIdle } from './compile-idle.mjs';

/** The panel's logical width, which the fitted box scales into the slot. */
const PANEL_PX = 340;
/** The scope's height in logical px, `/muta/`'s 140 less a little for half a slide. */
const WAVE_PX = 120;
/** Samples shown per frame: about 10.7 ms at 48 kHz, four and a bit cycles of 440 Hz. */
export const WINDOW = 512;
/** The scope's full scales, the smallest that clears the peak by a quarter is used. */
export const FULL_SCALE = [0.05, 0.1, 0.2, 0.5, 1, 2];
/** The scope at rest: its name, `no signal`, and the scale the shipped sine
 * is drawn against (a 0.1 sine reads on the 0.2 scale over 512 samples at
 * 48 kHz), so an idle scope says what it will measure. 2026-10-06, *"show
 * labels when no signal on waveform?"*. */
const IDLE = Object.freeze({ points: null, name: 'output', reason: 'no signal',
  axes: { y: '\u00b10.2', x: `${((WINDOW / 48000) * 1000).toFixed(1)} ms` } });

/* 🔴 NO NOTE ON THE PLATE, AND AN EDIT COMPILES ITSELF, since 2026-10-06:
   *"rm labels from footer about compiling. autocompile, show compiling... as
   fau synth does?"*. The kit's `compile-idle.mjs` compiles the text once the
   typing stops and breathes `Compiling` in the corner of the code box, exactly
   as on `/fau/`. While the tone sounds, a good compile replaces the node at
   once; a failed one keeps the last good sound and says why on the scope. The
   first edit's compile loads the compiler (about 1 MB, once): an edit is the
   visitor's own act, and a visit and a step still load nothing. */

/**
 * The compiler's message cut to its first useful line, for the scope's foot.
 * libfaust names the factory first (`sine_edit_2:3 : ERROR : syntax error`),
 * and that name is this module's, so it is put as `line 3` instead.
 */
export function firstLine(msg) {
  const lines = String(msg || '').split('\n').map((l) => l.trim()).filter(Boolean)
    .filter((l) => !/^Aborted\(/.test(l));
  const one = lines.find((l) => /error/i.test(l)) || lines[0] || 'the compiler refused it';
  return one.replace(/^\S+?:(\d+)\s*:\s*ERROR\s*:\s*/i, 'line $1, ').slice(0, 160);
}

/**
 * The slot builder for one mono program. Returns `(host) => ctl`.
 *
 * @param {{id: string, code: string, mono: boolean}} step one of `SYNTH_STEPS`
 * @param {{url?: string}} [o] where the ahead of time program is; the step's own by default
 */
export function synthSlot(step, { url = synthUrl(step.id) } = {}) {
  if (!step.mono) throw new Error(`synth step ${step.id}: this slot plays a mono program and has no keys for a polyphonic one`);
  const shipped = step.code.replace(/\n$/, '');

  return (host) => {
    const scope = createWaveShape({ reason: null, colour: '--hi', height: WAVE_PX, name: 'output' });
    scope.set(IDLE);
    const lines = shipped.split('\n').length;
    // NINE ROWS, three times the first program's three, asked 2026-10-06 as
    // *"maeke code panel 3 x higher"*: room to write more than the shipped
    // lines, and never shorter than them plus three.
    const code = createCodeBox({
      language: 'faust', rows: Math.max(9, lines + 3), label: '', value: shipped,
      ariaLabel: `the Faust program Start plays, ${lines} lines, editable`,
    });
    // START AND STOP, ONE WIDTH, asked 2026-10-06 as *"Test tone -> Start Stop
    // button. same w on both labels"*. Both words sit in one grid cell and the
    // one not meant is hidden, so the button is as wide as the wider word in
    // either state and nothing beside it moves.
    const tone = el('button', 'sl-tone', null, { type: 'button', 'aria-pressed': 'false', 'aria-label': 'Start' });
    const toneW = el('span', 'sl-tone-w');
    toneW.append(el('span', 'sl-tone-start', 'Start'), el('span', 'sl-tone-stop', 'Stop'));
    tone.append(toneW);
    const label = () => {
      const stop = want || on;
      tone.dataset.state = stop ? 'stop' : 'start';
      tone.setAttribute('aria-label', stop ? 'Stop' : 'Start');
    };
    tone.dataset.state = 'start';

    const panel = createInstrumentPanel({ viz: scope.el, plate: { name: 'FAU', patch: tone }, full: true });
    const codeRow = panel.addRow(code.el, { pad: false });
    const mid = el('div', 'sl-mid');
    mid.append(panel.el);
    const fb = fitBox(host, PANEL_PX);
    fb.inner.append(mid);

    let ctx = null, out = null, meter = null, node = null, nodeText = null;
    let on = false, want = false, busy = null, err = null, raf = 0;
    let presses = 0, stops = 0, compiles = 0, draws = 0, lastCompileMs = null, lastArmMs = null;
    let compilerHere = false;

    const text = () => code.value().replace(/\n$/, '');
    const edited = () => text() !== shipped;
    const say = () => {};
    let parts = null, partsText = null;

    const buf = new Float32Array(2048);
    function frame() {
      raf = 0;
      if (!on || !meter) return;
      meter.getFloatTimeDomainData(buf);
      // from the first rising zero crossing, so a steady tone stands still
      let i0 = 0;
      for (let i = 1; i < buf.length - WINDOW; i++) if (buf[i - 1] < 0 && buf[i] >= 0) { i0 = i; break; }
      const win = buf.subarray(i0, i0 + WINDOW);
      let peak = 0;
      for (const v of win) if (Math.abs(v) > peak) peak = Math.abs(v);
      // drawn against the smallest round full scale above the peak, so a 0.1
      // sine fills half the box and its label is a number somebody would type
      const fs = FULL_SCALE.find((f) => f >= peak * 1.25) || FULL_SCALE[FULL_SCALE.length - 1];
      scope.set({
        points: Array.from(win, (v) => v / fs), reason: '', name: 'output',
        axes: { y: `\u00b1${fs}`, x: `${((WINDOW / ctx.sampleRate) * 1000).toFixed(1)} ms` },
      });
      draws++;
      raf = requestAnimationFrame(frame);
    }

    function graph(c) {
      if (out) return;
      out = c.createGain();
      meter = c.createAnalyser();
      meter.fftSize = 2048;
      out.connect(c.destination);
      out.connect(meter);
    }

    /** The compiled program for `t`: the shipped file, or a compile, kept while it is the text. */
    async function partsFor(t) {
      if (parts && partsText === t) return parts;
      const f = await import('./faust.mjs');
      let p;
      if (t === shipped) {
        p = await f.faustFactory(url);
      } else {
        const t0 = performance.now();
        const aborts = [];
        busy = true;
        try {
          p = await f.faustCompile(`${step.id}_edit_${++compiles}`, t, { mono: true, onAbort: (l) => aborts.push(l) });
        } catch (e) {
          throw new Error(firstLine([e?.message, ...aborts].filter(Boolean).join('\n')));
        } finally {
          busy = null;
          compilerHere = f.hasCompiler();
        }
        lastCompileMs = performance.now() - t0;
      }
      parts = p;
      partsText = t;
      return p;
    }

    async function nodeFor(t) {
      if (node && nodeText === t) return node;
      const p = await partsFor(t);
      const f = await import('./faust.mjs');
      const n = await f.faustNode(ctx, p);
      if (node) { try { node.disconnect(); node.destroy?.(); } catch { /* already gone */ } }
      node = n;
      nodeText = t;
      return n;
    }

    // An edit compiles once the typing stops; a good compile swaps the
    // sounding node at once, a failed one keeps the last good sound.
    const idle = createCompileIdle({
      input: code.input,
      host: code.el,
      compile: async () => {
        const t = text();
        try {
          await partsFor(t);
          err = null;
          if (on && ctx) { const n = await nodeFor(t); n.connect(out); }
          else scope.set(IDLE);
        } catch (e) {
          err = e?.message || String(e);
          scope.set({ points: null, name: 'does not compile', reason: err });
          throw e;
        }
      },
    });

    function off() {
      want = false;
      if (on) { try { node?.disconnect(); } catch { /* not connected */ } }
      on = false;
      tone.setAttribute('aria-pressed', 'false');
      label();
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (!err) scope.set(IDLE);
      release(ctl);
    }

    async function startTone() {
      const t = text();
      const t0 = performance.now();
      want = true;
      err = null;
      label();
      say();
      try {
        const n = await nodeFor(t);
        if (!want) return;
        n.connect(out);
        on = true;
        lastArmMs = performance.now() - t0;
        tone.setAttribute('aria-pressed', 'true');
        label();
        if (!raf) raf = requestAnimationFrame(frame);
      } catch (e) {
        err = e?.message || String(e);
        on = false;
        want = false;
        tone.setAttribute('aria-pressed', 'false');
        label();
        scope.set({ points: null, name: 'does not compile', reason: err });
        release(ctl);
      }
      say();
    }

    function press() {
      presses++;
      if (on || want) { off(); say(); return null; }
      // inside the gesture, synchronously: the context, then this slot as its owner
      ctx = sharedAudio();
      claim(ctl);
      graph(ctx);
      return startTone();
    }
    tone.addEventListener('click', () => { press(); });

    const ctl = {
      start() {},
      stop() { stops++; off(); say(); },
      /** `Test tone`, the way a click on it does it. Returns the start in flight, or null for an off. */
      press,
      sounding: () => on,
      /** What the scope last said in words, or null. */
      error: () => err,
      edited,
      presses: () => presses,
      stops: () => stops,
      compiles: () => compiles,
      draws: () => draws,
      /** ms from a press to the tone sounding, and the compile inside it, for the last of each. */
      lastArmMs: () => lastArmMs,
      lastCompileMs: () => lastCompileMs,
      /** RMS of one 2048 sample window of what this slot puts out, 0 before the first press. */
      level() {
        if (!meter) return 0;
        meter.getFloatTimeDomainData(buf);
        let s = 0;
        for (const v of buf) s += v * v;
        return Math.sqrt(s / buf.length);
      },
      /** The frequency of what is sounding, from rising zero crossings across one window, or 0. */
      hz() {
        if (!meter || !ctx) return 0;
        meter.getFloatTimeDomainData(buf);
        let first = -1, last = -1, n = 0;
        for (let i = 1; i < buf.length; i++) {
          if (buf[i - 1] < 0 && buf[i] >= 0) { if (first < 0) first = i; last = i; n++; }
        }
        return n > 1 ? ((n - 1) * ctx.sampleRate) / (last - first) : 0;
      },
      context: () => ctx,
      step, code, scope, tone, idle, panel, codeRow, fb, url, shipped,
    };
    return ctl;
  };
}
