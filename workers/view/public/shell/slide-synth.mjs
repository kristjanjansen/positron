// demo/shell/slide-synth.mjs: a mono Faust program on a split slide (synthSlot(step)): live scope, editable
// code, knobs for its sliders, FAU plate with Start/Stop. A visit draws only; Start loads faust.mjs and the
// 3.8 kB ahead of time program, an edit the ~1 MB compiler. A compile error is shown, never thrown.
// why: lessons/kit-slide-synth.md#header

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
import { createChoice } from './choice.mjs';

/**
 * The panel's logical width, scaled into the slot; 400 holds slide 3's hslider line on one line.
 * why: lessons/kit-slide-synth.md#panel-px
 */
const PANEL_PX = 400;
/**
 * The logical height every synth panel is scaled by, the tallest of them (slide 4, 599 px), so every
 * instrument slide draws at one scale. A shorter panel is centred in its slot.
 * why: lessons/kit-slide-synth.md#panel-h
 */
export const PANEL_H = 599;
/**
 * One code box height on every slide: twelve rows hold the longest program (nine lines) with room to type.
 * why: lessons/kit-slide-synth.md#code-rows
 */
export const CODE_ROWS = 12;
/** The scope's height in logical px, `/muta/`'s 140 less a little for half a slide. */
const WAVE_PX = 120;
/** Samples shown per frame: about 10.7 ms at 48 kHz, four and a bit cycles of 440 Hz. */
export const WINDOW = 512;
/** The scope's full scales, the smallest that clears the peak by a quarter is used. */
export const FULL_SCALE = [0.05, 0.1, 0.2, 0.5, 1, 2];
/**
 * The scope at rest: no name, only the scale it will measure against.
 * why: lessons/kit-slide-synth.md#idle
 */
const IDLE = Object.freeze({ points: null, name: '', reason: null,
  axes: { y: '\u00b12', x: `${((WINDOW / 48000) * 1000).toFixed(1)} ms` } });

// An edit compiles itself once typing stops (compile-idle.mjs), Compiling breathing in the code box corner.
// A failed compile keeps the last good sound and says why on the scope.
// why: lessons/kit-slide-synth.md#autocompile

/**
 * The compiler's message cut to its first useful line; libfaust's factory name is put as `line N`.
 * why: lessons/kit-slide-synth.md#first-line
 */
export function firstLine(msg) {
  const lines = String(msg || '').split('\n').map((l) => l.trim()).filter(Boolean)
    .filter((l) => !/^Aborted\(/.test(l));
  const one = lines.find((l) => /error/i.test(l)) || lines[0] || 'the compiler refused it';
  return one.replace(/^\S+?:(\d+)\s*:\s*ERROR\s*:\s*/i, 'line $1, ').slice(0, 160);
}

const SLIDERS = ['hslider', 'vslider', 'nentry'];

/**
 * The options of a style:radio{...} control as [[name, value], ...], or null. Faust's JSON rewrites the
 * quotes round each name to dashes, so either is read.
 * why: lessons/kit-slide-synth.md#radio-options
 */
export function radioOptions(style) {
  const m = /^\s*radio\s*\{([^}]*)\}\s*$/.exec(String(style ?? ''));
  if (!m) return null;
  const out = [];
  for (const part of m[1].split(';')) {
    const o = /^\s*(['"-]?)(.*?)\1\s*:\s*(-?[\d.]+(?:e-?\d+)?)\s*$/.exec(part);
    if (o && o[2]) out.push([o[2], Number(o[3])]);
  }
  return out.length ? out : null;
}
/** A control's `[style:...]` out of its label, or null. */
const styleIn = (label) => /\[style:([^\]]*)\]/.exec(label)?.[1] ?? null;
const num = String.raw`\s*(-?[\d.]+(?:e-?\d+)?)\s*`;
const SLIDER_RE = new RegExp(String.raw`\b(?:hslider|vslider|nentry)\s*\(\s*"([^"]*)"\s*,${num},${num},${num},${num}\)`, 'g');

/**
 * The sliders written in a program's text, for a visit that compiled nothing; literal numbers only.
 * slidersOf replaces this on the first press.
 * why: lessons/kit-slide-synth.md#read-sliders
 */
export function readSliders(code) {
  const list = [];
  for (const m of String(code).matchAll(SLIDER_RE)) {
    const name = m[1].replace(/\[[^\]]*\]/g, '').trim();
    if (!name || list.some((p) => p.name === name)) continue;
    const [value, min, max, step] = m.slice(2, 6).map(Number);
    const options = radioOptions(styleIn(m[1]));
    list.push({ name, value, min, max, step, warp: /\[scale:log\]/.test(m[1]) && min > 0 ? 'exp' : 'lin',
      ...(options ? { kind: 'radio', options } : {}) });
  }
  return list;
}

/**
 * The knobs in the order their sliders are declared in the text: Faust lists controls in the order
 * process uses them, which reordered the row after a compile.
 * why: lessons/kit-slide-synth.md#in-text-order
 */
export function inTextOrder(list, code) {
  const order = readSliders(code).map((p) => p.name);
  const at = (n) => { const i = order.indexOf(n); return i < 0 ? order.length : i; };
  return [...list].sort((a, b) => at(a.name) - at(b.name));
}

export function slidersOf(parts) {
  const list = [], addr = new Map();
  let ui = [];
  try { ui = JSON.parse(parts?.factory?.json || '{}').ui || []; } catch { /* no UI */ }
  const walk = (items) => {
    for (const it of items || []) {
      if (it.items) { walk(it.items); continue; }
      if (!SLIDERS.includes(it.type) || addr.has(it.shortname)) continue;
      const log = (it.meta || []).some((m) => m.scale === 'log') && it.min > 0;
      const options = radioOptions((it.meta || []).find((m) => 'style' in m)?.style);
      addr.set(it.shortname, it.address);
      list.push({ name: it.shortname, value: it.init, min: it.min, max: it.max, step: it.step, warp: log ? 'exp' : 'lin',
        ...(options ? { kind: 'radio', options } : {}) });
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
    // Code rows: never shorter than the shipped lines plus three. Each knob's slider wears the knob's hue
    // from one hue book; the rest of the code is toned down, as on /fau/.
    // why: lessons/kit-slide-synth.md#code-box
    const book = createHueBook();
    const code = createCodeBox({
      language: 'faust', hues: book, rows: CODE_ROWS, label: '', value: shipped,
      ariaLabel: `the Faust program Start plays, ${lines} lines, editable`,
    });
    // Start and Stop share one grid cell, so the button is as wide as the wider word in either state.
    // why: lessons/kit-slide-synth.md#start-stop
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
    // One panel height on every slide: the code row gets what the scope, knobs and plate leave, and scrolls.
    // why: lessons/kit-slide-synth.md#panel-height
    panel.el.classList.add('sl-synth-panel');
    panel.el.style.setProperty('--synth-h', `${PANEL_H}px`);
    codeRow.classList.add('sl-synth-code');
    const mid = el('div', 'sl-mid');
    mid.append(panel.el);
    // More room either side of the panel than above and below: the slot's inset again left and right.
    // why: lessons/kit-slide-synth.md#slot-padding
    host.classList.add('sl-synth-slot');
    const fb = fitBox(host, PANEL_PX, { h: PANEL_H, top: true, fill: true });
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
      // one row for every program in the deck: the LFO slide has five
      cols: 6,
      onChange: (name, v) => {
        const a = nodeAddr.get(name);
        if (node && a) { node.setParamValue(a, v); paramSends++; }
      },
    });
    // A style:radio{...} control is the kit's choice, after the knobs in the knob row, in its own hue; a pick
    // is setParamValue like a turn. After the knobs because their lattice cells are a knob's pitch wide.
    // why: lessons/kit-slide-synth.md#radio-control
    const radios = new Map();
    const radioBox = el('div', 'sl-radios');
    const ctlRow = el('div', 'sl-synth-ctls');
    ctlRow.append(knobs.el, radioBox);
    function showRadios(list) {
      const keep = new Map([...radios].map(([n, r]) => [n, r.value]));
      radios.clear();
      radioBox.replaceChildren();
      for (const p of list) {
        const had = keep.get(p.name);
        const value = p.options.some(([, v]) => v === had) ? had : p.value;
        const at = Math.max(0, p.options.findIndex(([, v]) => v === value));
        const r = { value: p.options[at][1], options: p.options };
        const choice = createChoice({
          options: p.options, at,
          onPick: (v) => {
            r.value = v;
            const a = nodeAddr.get(p.name);
            if (node && a) { node.setParamValue(a, v); paramSends++; }
          },
        });
        choice.el.dataset.param = p.name;
        const cell = el('div', 'sl-radio');
        cell.dataset.param = p.name;
        // the knob's value line, held empty above the choice, so the choice
        // centres on the dials beside it and its name lines up with theirs
        const head = el('span', 'pos-knob-v sl-radio-head', '0');
        head.setAttribute('aria-hidden', 'true');
        cell.append(head, choice.el, el('span', 'pos-knob-lab sl-radio-lab', p.name));
        r.choice = choice;
        r.cell = cell;
        radios.set(p.name, r);
        radioBox.append(cell);
      }
      radioBox.hidden = !radios.size;
    }
    /** Every knob's value and every pick onto `n`, before it is heard. */
    function applyKnobs(n) {
      const all = [...knobs.values(), ...[...radios].map(([k, r]) => [k, r.value])];
      for (const [k, v] of all) {
        const a = nodeAddr.get(k);
        if (a) { n.setParamValue(a, v); paramSends++; }
      }
    }
    // Every `name` in the slide's words takes its knob's hue from the same book, so word, code and knob agree.
    // why: lessons/kit-slide-synth.md#words-hue
    const words = host.closest('.sl-in') || host;
    const paintWords = () => hueVars(words, book.hueOf);
    /** The row from a list: made the first time there is a slider, hidden when there is none. */
    function showKnobs(list) {
      if (!list.length) {
        if (knobRow) { knobRow.hidden = true; knobs.set([]); showRadios([]); }
        book.clear();
        paintWords();
        return;
      }
      if (!knobRow) knobRow = panel.addRow(ctlRow);
      knobRow.hidden = false;
      const dials = list.filter((p) => p.kind !== 'radio');
      knobs.set(dials);
      // a program with only a radio has no knob, and no knob's reserve either
      knobs.el.hidden = !dials.length;
      showRadios(list.filter((p) => p.kind === 'radio'));
      book.assign(list.map((p) => p.name));
      const paint = (n, e) => {
        const h = book.hueOf(n);
        if (!e) return;
        if (h === null) e.style.removeProperty('--param-hue');
        else e.style.setProperty('--param-hue', String(h));
      };
      for (const n of knobs.names()) paint(n, knobs.knob(n)?.el);
      for (const [n, r] of radios) paint(n, r.cell);
      paintWords();
    }
    showKnobs(readSliders(shipped));

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
      // One fixed scale of +-2, so a turn of the volume knob changes the wave's height.
      // why: lessons/kit-slide-synth.md#fixed-scale
      const fs = 2;
      scope.set({
        points: Array.from(win, (v) => Math.max(-1, Math.min(1, v / fs))), reason: '', name: '',
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
      showKnobs(inTextOrder(ui(p).list, t));
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
      /** The radios in the knob row, by name: `{ value, options, choice, cell }`. */
      radios: () => radios,
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
