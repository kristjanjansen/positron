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
// No keyboard: the program has no `freq`, `gain` or `gate`.
//
// 🔴 A SLIDER IN THE PROGRAM IS A KNOB IN A ROW BETWEEN THE CODE AND THE PLATE,
// since 2026-10-06, asked as *"slode 3: make 0.5 into knob 0..1"*. The row is
// `createParamKnobs`, the one `/fau/` puts under its text, and only appears
// for a program that declares an `hslider`, `vslider` or `nentry`: the sine
// has none and shows no row. On a VISIT nothing is compiled, so the first row
// is read off the shipped TEXT (`readSliders`), which is the text the ahead of
// time file was compiled from (`checkFaustAot` refuses a build where they
// differ). From the first press on, and after every compile, it is rebuilt
// from the compiled program's own JSON (`slidersOf`), and a knob whose name
// survives keeps where a hand left it. A turn is `setParamValue` on the
// sounding node; a turn before Start is kept by the knob and handed to the
// node when it is made, before it is heard.
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
import { fitBox, hueVars } from './slide.mjs';
import { createCodeBox } from './code-box.mjs';
import { createWaveShape } from './synth-view.mjs';
import { createInstrumentPanel } from './instrument-panel.mjs';
import { sharedAudio, claim, release } from './audio.mjs';
import { synthUrl } from './synth-steps.mjs';
import { createCompileIdle } from './compile-idle.mjs';
import { createHueBook } from './code-lang.mjs';
import { createParamKnobs } from './param-knobs.mjs';

/** The panel's logical width, which the fitted box scales into the slot.
 * 400 since 2026-10-06, when the deck's splits went 1:2 and the slot two
 * thirds of the slide: the fit is bound by the slot's height, so a wider
 * logical panel is a wider panel on screen at the same type size, and it holds
 * slide 3's `hslider` line on one line (it wrapped at 340). */
const PANEL_PX = 400;
/** The logical height every synth panel is scaled by, the tallest of them, so
 * every instrument slide draws it at one scale and one type size (*"2 and 3
 * use same size of fau"*). Slide 4's since 2026-10-06, MEASURED 562 px: its
 * two knobs share slide 3's one row (544 px), and its seven lines of code take
 * the box from nine rows to ten. A panel shorter than this is centred in its
 * slot; one taller still fits, at a smaller scale, and the kit's check says so. */
export const PANEL_H = 562;
/** The scope's height in logical px, `/muta/`'s 140 less a little for half a slide. */
const WAVE_PX = 120;
/** Samples shown per frame: about 10.7 ms at 48 kHz, four and a bit cycles of 440 Hz. */
export const WINDOW = 512;
/** The scope's full scales, the smallest that clears the peak by a quarter is used. */
export const FULL_SCALE = [0.05, 0.1, 0.2, 0.5, 1, 2];
/** The scope at rest: no name (*"rm 'output'"*), only the scale the shipped sine
 * is drawn against (a 0.5 sine reads on the 1 scale over 512 samples at
 * 48 kHz), so an idle scope says what it will measure. 2026-10-06, *"show
 * labels when no signal on waveform?"*. */
const IDLE = Object.freeze({ points: null, name: '', reason: null,
  axes: { y: '\u00b11', x: `${((WINDOW / 48000) * 1000).toFixed(1)} ms` } });

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

const SLIDERS = ['hslider', 'vslider', 'nentry'];
const num = String.raw`\s*(-?[\d.]+(?:e-?\d+)?)\s*`;
const SLIDER_RE = new RegExp(String.raw`\b(?:hslider|vslider|nentry)\s*\(\s*"([^"]*)"\s*,${num},${num},${num},${num}\)`, 'g');

/**
 * The sliders written in a program's text, as `createParamKnobs` takes them,
 * for a visit, which has compiled nothing. Only literal numbers are read; the
 * compiled program's own list (`slidersOf`) replaces this on the first press.
 * A label's `[...]` metadata is not part of its name.
 */
export function readSliders(code) {
  const list = [];
  for (const m of String(code).matchAll(SLIDER_RE)) {
    const name = m[1].replace(/\[[^\]]*\]/g, '').trim();
    if (!name || list.some((p) => p.name === name)) continue;
    const [value, min, max, step] = m.slice(2, 6).map(Number);
    list.push({ name, value, min, max, step, warp: /\[scale:log\]/.test(m[1]) && min > 0 ? 'exp' : 'lin' });
  }
  return list;
}

/**
 * The sliders a compiled mono program declares, read off its JSON the way
 * `/fau/` reads them (`readKnobs`), with the address each is set at. The
 * address carries the compile's name, so it is kept per compiled program.
 * @returns {{list: object[], addr: Map<string, string>}}
 */
export function slidersOf(parts) {
  const list = [], addr = new Map();
  let ui = [];
  try { ui = JSON.parse(parts?.factory?.json || '{}').ui || []; } catch { /* no UI */ }
  const walk = (items) => {
    for (const it of items || []) {
      if (it.items) { walk(it.items); continue; }
      if (!SLIDERS.includes(it.type) || addr.has(it.shortname)) continue;
      const log = (it.meta || []).some((m) => m.scale === 'log') && it.min > 0;
      addr.set(it.shortname, it.address);
      list.push({ name: it.shortname, value: it.init, min: it.min, max: it.max, step: it.step, warp: log ? 'exp' : 'lin' });
    }
  };
  walk(ui);
  return { list, addr };
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
    const scope = createWaveShape({ reason: null, colour: '--hi', height: WAVE_PX, name: '' });
    scope.set(IDLE);
    const lines = shipped.split('\n').length;
    // NINE ROWS, three times the first program's three, asked 2026-10-06 as
    // *"maeke code panel 3 x higher"*: room to write more than the shipped
    // lines, and never shorter than them plus three.
    // EACH KNOB'S SLIDER IN THE KNOB'S OWN HUE, the rest of the code toned
    // down, as on /fau/ (2026-10-06, *"why volume is not bright colored? we
    // tone down syntaxt exept knobs"*): one hue book, read by the code box for
    // the slider's name and written onto the knob as `--param-hue`
    const book = createHueBook();
    const code = createCodeBox({
      language: 'faust', hues: book, rows: Math.max(9, lines + 3), label: '', value: shipped,
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
    const fb = fitBox(host, PANEL_PX, { h: PANEL_H });
    fb.inner.append(mid);

    let ctx = null, out = null, meter = null, node = null, nodeText = null;
    let on = false, want = false, busy = null, err = null, raf = 0;
    let presses = 0, stops = 0, compiles = 0, draws = 0, lastCompileMs = null, lastArmMs = null;
    let compilerHere = false;

    // ── the knobs: one per slider, in a row between the code and the plate ──
    const uiOf = new WeakMap();
    const ui = (p) => { if (!uiOf.has(p)) uiOf.set(p, slidersOf(p)); return uiOf.get(p); };
    let nodeAddr = new Map(), paramSends = 0, knobRow = null;
    const knobs = createParamKnobs({
      onChange: (name, v) => {
        const a = nodeAddr.get(name);
        if (node && a) { node.setParamValue(a, v); paramSends++; }
      },
    });
    /** Every knob's value onto `n`, before it is heard. */
    function applyKnobs(n) {
      for (const [k, v] of knobs.values()) {
        const a = nodeAddr.get(k);
        if (a) { n.setParamValue(a, v); paramSends++; }
      }
    }
    /* THE SLIDE'S OWN WORDS WEAR THE BOOK TOO, 2026-10-06 (*"in the text use
       variable name with colorcoding"*): every `` `name` `` in the words
       beside this slot takes its knob's hue from the same book, every time
       the book changes, so the word, the code and the knob cannot disagree,
       and a name with no knob (`process`) stays in the slide's ink. */
    const words = host.closest('.sl-in') || host;
    const paintWords = () => hueVars(words, book.hueOf);
    /** The row from a list: made the first time there is a slider, hidden when there is none. */
    function showKnobs(list) {
      if (!list.length) {
        if (knobRow) { knobRow.hidden = true; knobs.set([]); }
        book.clear();
        paintWords();
        return;
      }
      if (!knobRow) knobRow = panel.addRow(knobs.el);
      knobRow.hidden = false;
      knobs.set(list);
      book.assign(knobs.names());
      for (const n of knobs.names()) {
        const h = book.hueOf(n), k = knobs.knob(n)?.el;
        if (!k) continue;
        if (h === null) k.style.removeProperty('--param-hue');
        else k.style.setProperty('--param-hue', String(h));
      }
      paintWords();
    }
    showKnobs(readSliders(shipped));

    const text = () => code.value().replace(/\n$/, '');
    const edited = () => text() !== shipped;
    const say = () => {};
    let parts = null, partsText = null;

    let shownFs = 0;
    const REDUCED = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
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
      // THE SCALE GLIDES, 2026-10-06 (*"can scale change be animated?"*): the
      // drawn scale eases a fifth of the way to the chosen one each frame, on a
      // log scale so a step up and a step down take the same time, and the
      // label names where it is going; reduced motion jumps
      shownFs = !shownFs || REDUCED() ? fs : Math.exp(Math.log(shownFs) + (Math.log(fs) - Math.log(shownFs)) * 0.2);
      if (Math.abs(Math.log(shownFs / fs)) < 0.005) shownFs = fs;
      scope.set({
        points: Array.from(win, (v) => Math.max(-1, Math.min(1, v / shownFs))), reason: '', name: '',
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
      showKnobs(ui(p).list);
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
      nodeAddr = ui(p).addr;
      applyKnobs(n);
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
      /** The knob row, or null for a program that never had a slider. */
      knobRow: () => knobRow,
      /** How many `setParamValue`s a turn or a new node has sent. */
      paramSends: () => paramSends,
      /** The sounding node's own value for a slider, by name, or null. */
      nodeValue(name) {
        const a = nodeAddr.get(name);
        return node && a ? node.getParamValue(a) : null;
      },
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
      step, code, scope, tone, idle, panel, codeRow, fb, url, shipped, book, knobs, words,
    };
    return ctl;
  };
}
