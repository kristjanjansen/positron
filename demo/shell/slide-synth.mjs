// demo/shell/slide-synth.mjs: a playable Faust synth on a split slide, its code beside it.
//
//   import { synthSlot } from '/shell/slide-synth.mjs';
//   { layout: 'split', side: 'right', say: 'One oscillator', slot: synthSlot(step) }
//
// 🔴 THE SLOT BUILDER `plans/plan-live-slides.md` STEP 4 NAMES, 2026-10-06, for
// the front page's `synths` deck (*"do slide deck Synths in code in the fau
// examples ... basic osc (2 col view, synth in side)"*). `step` is one entry of
// `SYNTH_STEPS` in `demo/shell/synth-steps.mjs`: its Faust text goes in a
// read-only code box on the words side of the split, and the instrument (its
// knobs, if the step names any, and one octave of keys) goes in the slot, on
// the darker side.
//
// ── THE CONTRACT, plan section 3.3 ─────────────────────────────────────────
//
//   build   (this function, called by `createSlide` on a VISIT, for every slide
//           of every deck) DRAWS ONLY: the code box with the Faust hues, the
//           knobs, the keys. No `import()`, no `fetch`, no AudioContext.
//   arm     the first key pressed on THIS slide: `sharedAudio()` and `claim()`
//           from `audio.mjs`, then `import('./faust.mjs')`, `faustFactory()` of
//           this step's ahead of time files and `faustNode()`. Memoised, and a
//           failed arm clears itself so the next press tries again.
//   start   called by the player on show, INCLUDING on a visit for slide 0 and
//           on every step. It never arms, never loads, never sounds. It only
//           scrolls the code box to the lines this step added.
//   stop    called on leaving the slide, and by `claim()` when another slot
//           takes the sound: every note off, and `release()`, which suspends
//           the context when nobody holds it.
//
// 🔴 `audio.mjs` IS A STATIC IMPORT AND `faust.mjs` IS NOT, ON PURPOSE.
// `audio.mjs` does nothing on import (its header says so) and `sharedAudio()`
// has to run INSIDE the gesture, synchronously, or a strict browser leaves the
// new context suspended. `faust.mjs` is reached only through `import()`, so the
// front page never pays for it on a visit (plan section 6.2's trap).
//
// 🔴 THE CODE GOES IN THE SPLIT'S WORDS COLUMN, WHICH A SLOT DOES NOT OWN. A
// split has one slot, and the ask is the code on one side and the synth on the
// other. So the builder appends the code box to the slide's own evidence
// region (`.sl-ev`, under the headline), found from the slot host's parent,
// which `createSlide` has built before it calls a slot builder. It is the one
// place this module reaches outside its host, and it reaches only into the
// slide it was built for.
//
// ⚠️ THE CODE BOX IS AT MOST 12 LINES AND SCROLLS TO ITS END, where every step
// puts what it added and the `process` line it changed. 29 lines at once would
// be 7 px type in half a front page player; 12 is width limited rather than
// height limited there, which is the most a 56 character line allows.
// ⚠️ KNOBS FOR WHAT THIS STEP ADDED, NOT FOR EVERY SLIDER. The step's `knobs`
// list names them, and the earlier sliders keep the default the text shows.

import { el } from './shell.mjs';
import { fitBox } from './slide.mjs';
import { createKeyboard, keyRange } from './keyboard.mjs';
import { createCodeBox } from './code-box.mjs';
import { createHueBook } from './code-lang.mjs';
import { createParamKnobs } from './param-knobs.mjs';
import { createInstrumentPanel } from './instrument-panel.mjs';
import { sharedAudio, claim, release } from './audio.mjs';
import { synthUrl } from './synth-steps.mjs';

/** Voices per node: `/fau/`'s eight, so a chord on one octave never steals. */
export const VOICES = 8;
/** The velocity a pointer press plays at. A pointer has no velocity of its own. */
export const VELOCITY = 100;
/** The code box's height in lines, at most. See the header. */
export const CODE_ROWS = 12;
/** The keys: one octave and its top C, from middle C. */
const SPAN = 12, BASE = 60;
/** A white key's width in logical px, `/fau/`'s 44, which the fitted box scales. */
const KEY_PX = 44;

/**
 * Every `hslider` the text declares, as `createParamKnobs` takes it. Read off
 * the text the slide shows, so a knob cannot disagree with the line it turns.
 * `[scale:log]` is the exponential warp, which is what Faust's own log scale
 * does to a slider's travel.
 */
export function slidersOf(code) {
  const out = new Map();
  const re = /hslider\(\s*"([^"[]+)(\[[^"]*\])?"\s*,\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g;
  for (const m of code.matchAll(re)) {
    const [value, min, max, step] = [m[3], m[4], m[5], m[6]].map(Number);
    out.set(m[1].trim(), { name: m[1].trim(), value, min, max, step,
      warp: /scale:log/.test(m[2] || '') && min > 0 ? 'exp' : 'lin' });
  }
  return out;
}

/**
 * The slot builder for one step. Returns `(host) => ctl`.
 *
 * @param {{id: string, code: string, knobs: string[]}} step one of `SYNTH_STEPS`
 * @param {{url?: string}} [o] where the ahead of time instrument is; the step's own by default
 */
export function synthSlot(step, { url = synthUrl(step.id) } = {}) {
  const sliders = slidersOf(step.code);
  for (const k of step.knobs) if (!sliders.has(k)) throw new Error(`synth step ${step.id}: no hslider called ${k} in its code`);

  return (host) => {
    // ── the code, on the words side ─────────────────────────────────────────
    const ev = host.parentElement?.querySelector(':scope > .sl-words .sl-ev');
    if (!ev) throw new Error('synthSlot is for a split slide, whose words column holds the code');
    const book = createHueBook();
    book.assign(step.knobs);
    const lines = step.code.replace(/\n$/, '').split('\n').length;
    const code = createCodeBox({
      language: 'faust', rows: Math.min(lines, CODE_ROWS), hues: book, label: '',
      ariaLabel: `the Faust program this slide plays, ${lines} lines`, value: step.code.replace(/\n$/, ''),
    });
    code.input.readOnly = true;
    // wide enough for the longest line at the code box's 12.5 px mono, whose
    // advance is 0.6 em, plus its padding and border, so a line never wraps
    const longest = Math.max(...step.code.split('\n').map((l) => l.length));
    const codeFit = fitBox(ev, Math.ceil(longest * 7.5) + 40);
    codeFit.inner.append(code.el);
    const toEnd = () => { code.scroller.scrollTop = code.scroller.scrollHeight; };
    new ResizeObserver(toEnd).observe(code.scroller);

    // ── the instrument, in the slot ─────────────────────────────────────────
    let node = null, out = null, meter = null, armP = null, failed = null;
    let presses = 0, stops = 0, arms = 0;
    const held = new Set();
    const addr = new Map();

    const knobs = step.knobs.length ? createParamKnobs({
      onChange: (name, v) => { const a = addr.get(name); if (node && a) node.setParamValue(a, v); },
    }) : null;
    if (knobs) {
      knobs.set(step.knobs.map((n) => sliders.get(n)));
      for (const n of knobs.names()) knobs.knob(n).el.style.setProperty('--param-hue', String(book.hueOf(n)));
    }

    const ctl = {
      // never arms, never loads, never sounds: a step is not a press (plan 3.3)
      start() { requestAnimationFrame(toEnd); },
      stop() {
        stops++;
        for (const n of held) ctl.keys?.lightNote(n, false);
        held.clear();
        try { node?.allNotesOff?.(true); } catch { /* nothing sounding */ }
        release(ctl);
      },
      /** A note on, the way a pointer on a key plays one. For a check as well as for the keys. */
      press(n) { down(n); },
      /** That note off. */
      lift(n) { up(n); },
      armed: () => !!node,
      /** The arm in flight or done, or null; it rejects when the arm failed. */
      arming: () => armP,
      failed: () => failed,
      held: () => [...held],
      presses: () => presses,
      stops: () => stops,
      arms: () => arms,
      /** RMS of one 2048 sample window of what this slot is putting out, 0 before it is armed. */
      level() {
        if (!meter) return 0;
        const buf = new Float32Array(meter.fftSize);
        meter.getFloatTimeDomainData(buf);
        let s = 0;
        for (const v of buf) s += v * v;
        return Math.sqrt(s / buf.length);
      },
      context: () => out?.context || null,
      step, code, codeFit, knobs, url,
    };

    function arm(ctx) {
      if (!armP) {
        armP = (async () => {
          const { faustFactory, faustNode } = await import('./faust.mjs');
          const parts = await faustFactory(url);
          const n = await faustNode(ctx, parts, VOICES);
          for (const a of n.getParams()) addr.set(a.split('/').pop(), a);
          if (knobs) for (const [k, v] of knobs.values()) { const a = addr.get(k); if (a) n.setParamValue(a, v); }
          out = ctx.createGain();
          meter = ctx.createAnalyser();
          meter.fftSize = 2048;
          n.connect(out);
          out.connect(ctx.destination);
          out.connect(meter);
          node = n;
          arms++;
          // the keys still down while it loaded are played now
          for (const k of held) node.keyOn(0, k, VELOCITY);
          return node;
        })().catch((e) => { armP = null; failed = e; throw e; });
        armP.catch(() => {});
      }
      return armP;
    }

    function down(n) {
      presses++;
      held.add(n);
      // inside the gesture, synchronously: the context, then this slot as its owner
      const ctx = sharedAudio();
      claim(ctl);
      if (node) node.keyOn(0, n, VELOCITY);
      else arm(ctx);
    }
    function up(n) {
      held.delete(n);
      node?.keyOff(0, n, 0);
    }

    const keys = createKeyboard(el('div'), {
      ...keyRange(SPAN), base: BASE, letters: false, chord: false, pad: false,
      onDown: (n) => { keys.lightNote(n, true); down(n); },
      onUp: (n) => { keys.lightNote(n, false); up(n); },
    });
    keys.el.style.setProperty('--k-min', `${KEY_PX}px`);
    const panel = createInstrumentPanel({ keys: keys.el, plate: false });
    if (knobs) panel.addRow(knobs.el);
    const mid = el('div', 'sl-mid');
    mid.append(panel.el);
    const fb = fitBox(host, (keyRange(SPAN).whites + 1) * KEY_PX);
    fb.inner.append(mid);
    Object.assign(ctl, { keys, panel, fb });
    return ctl;
  };
}
