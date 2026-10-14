// demo/shell/param-knobs.mjs: one knob per parameter a program declares, rebuilt per compile.
// A parameter is { name, value, min, max, warp, step } (ControlSpec); a turn is the page's
// onChange(name, value). A surviving name keeps its value and its running hand. The dial runs
// 0 to 1 through mapSpec/unmapSpec. An empty row holds one hidden inert knob, so it keeps a
// knob's height. onHold(name, on) is a pointer on a dial; data-param is the colour hook.
// why: lessons/kit-param-knobs.md#header

import { createKnob, knobPlaces } from './knob.mjs';
import { createControlGrid } from './control-grid.mjs';
import { MOVES, MOVE_TURN } from './hand.mjs';

/** What an empty row says. See the header. */

/** The warps this maps. A number is `CurveWarp`'s curve. */
export const WARPS = ['lin', 'exp', 'sin', 'cos'];

const clip01 = (n) => Math.min(1, Math.max(0, Number(n)));
/** `SimpleNumber.round(step)`, with the float noise taken off. */
const roundTo = (v, step) => (step > 0 ? Number((Math.round(v / step) * step).toFixed(10)) : v);

/**
 * `ControlSpec.map`: 0 to 1 onto the range through the warp, then onto a step.
 * `warp.map(value.clip(0.0, 1.0)).round(step)` in `Spec.sc`.
 * @param {number} n
 * @param {{min:number, max:number, warp?:string|number, step?:number}} s
 */
export function mapSpec(n, { min, max, warp = 'lin', step = 0 }) {
  const x = clip01(n), range = max - min;
  let v;
  if (typeof warp === 'number') {
    // `CurveWarp`: grow = e^curve, a = range / (1 - grow), b = min + a, map = b - a * grow^x.
    const grow = Math.exp(warp), a = range / (1 - grow);
    v = (min + a) - a * grow ** x;
  } else if (warp === 'exp') v = (max / min) ** x * min;
  else if (warp === 'sin') v = Math.sin(0.5 * Math.PI * x) * range + min;
  else if (warp === 'cos') v = (0.5 - Math.cos(Math.PI * x) * 0.5) * range + min;
  else v = x * range + min;
  return roundTo(v, step);
}

/**
 * `ControlSpec.unmap`: a value back to 0 to 1. `warp.unmap(value.round(step)
 * .clip(clipLo, clipHi))` in `Spec.sc`.
 */
export function unmapSpec(v, { min, max, warp = 'lin', step = 0 }) {
  const lo = Math.min(min, max), hi = Math.max(min, max), range = max - min;
  const x = Math.min(hi, Math.max(lo, roundTo(Number(v), step)));
  let n;
  if (typeof warp === 'number') {
    const grow = Math.exp(warp), a = range / (1 - grow);
    n = Math.log(((min + a) - x) / a) / warp;
  } else if (warp === 'exp') n = Math.log(x / min) / Math.log(max / min);
  else if (warp === 'sin') n = Math.asin((x - min) / range) / (0.5 * Math.PI);
  else if (warp === 'cos') n = Math.acos(1 - ((x - min) / range) * 2) / Math.PI;
  else n = (x - min) / range;
  return clip01(n);
}

/**
 * How many decimals a parameter prints at, decided once. The step's own
 * decimals where there is a step. On an exponential range, enough to show the
 * small end: 0.05 to 6 prints `0.05` and `6.00`, 100 to 8000 prints whole
 * numbers. Otherwise `knob.mjs`'s own rule for a range of that size.
 */
export function placesFor({ min, max, warp = 'lin', step = 0 }) {
  const cap = (n) => Math.max(0, Math.min(4, n));
  if (step > 0) return cap(String(step).split('.')[1]?.length ?? 0);
  if (warp === 'exp') return cap(Math.ceil(-Math.log10(Math.min(Math.abs(min), Math.abs(max)))));
  return knobPlaces({ min: Math.min(min, max), max: Math.max(min, max) });
}

/**
 * The row.
 *
 * @param {object} o
 * @param {(name:string, value:number) => void} o.onChange  a person, or a knob's
 *   invisible hand, turned one
 * @param {(name:string, on:boolean) => void} [o.onHold]  a pointer went down on a
 *   dial, or came up
 * @returns {{el: HTMLElement, set: (params: object[]) => {name:string, value:number}[],
 *   values: () => Map<string, number>, value: (name:string) => number|undefined,
 *   knob: (name:string) => object|undefined, names: () => string[]}}
 */
export function createParamKnobs({ onChange = () => {}, onHold = null, cols = 4 } = {}) {
  const root = document.createElement('div');
  root.className = 'pos-pknobs';
  /** name -> { knob, spec, value } for what is on screen now. */
  let now = new Map();

  function build(p, start) {
    const spec = { min: p.min, max: p.max, warp: p.warp ?? 'lin', step: p.step ?? 0 };
    const dp = placesFor(spec);
    const show = (n) => mapSpec(n, spec).toFixed(dp);
    const entry = { spec, value: start };
    const say = () => entry.dial?.setAttribute('aria-valuetext', show(unmapSpec(entry.value, spec)));
    const k = createKnob({
      label: p.name,
      min: 0, max: 1,
      value: unmapSpec(start, spec),
      home: unmapSpec(p.value, spec),
      format: show,
      title: `${p.name}, ${spec.min} to ${spec.max}${spec.warp === 'lin' ? '' : `, ${typeof spec.warp === 'number' ? `curve ${spec.warp}` : spec.warp}`}`,
      hand: true,
      onInput: (n) => {
        entry.value = mapSpec(n, spec);
        say();
        onChange(p.name, entry.value);
      },
    });
    k.el.dataset.param = p.name;
    entry.knob = k;
    entry.dial = k.el.querySelector('.pos-knob-dial');
    if (onHold) {
      entry.dial.addEventListener('pointerdown', () => onHold(p.name, true));
      for (const ev of ['pointerup', 'pointercancel']) entry.dial.addEventListener(ev, () => onHold(p.name, false));
    }
    say();
    return entry;
  }

  // On createControlGrid's lattice (one measured pitch per cell), rebuilt each time because
  // it holds a ResizeObserver. `cols` defaults to 4.
  // why: lessons/kit-param-knobs.md#lattice
  const COLS = cols, GAP = 10;
  let grid = null;
  const lattice = (knobs) => {
    grid?.destroy();
    grid = createControlGrid({ cols: Math.min(knobs.length, COLS), gap: GAP, items: knobs });
    return grid.el;
  };

  /** The reserve an empty row holds: a hidden knob for the height, and nothing to read. */
  function none() {
    const wrap = document.createElement('div');
    wrap.className = 'pos-pknobs-none';
    const ghost = lattice([createKnob({ label: 'none', min: 0, max: 1, value: 0 })]);
    ghost.classList.add('pos-pknobs-ghost');
    ghost.inert = true;
    ghost.setAttribute('aria-hidden', 'true');
    wrap.append(ghost);
    return wrap;
  }

  /** Which movement a running hand is making, as `start()` takes it, or -1. */
  const moving = (k) => (k?.hand?.running
    ? MOVE_TURN.findIndex((m) => MOVES[m][0] === k.hand.move) : -1);

  /**
   * Rebuild from a compile's parameters. A name that survives keeps its value,
   * held inside its new range. Answers with every value now on the row.
   */
  function set(params = []) {
    const seen = new Set();
    for (const p of params) {
      if (seen.has(p.name)) throw new Error(`createParamKnobs: ${p.name} is listed twice`);
      seen.add(p.name);
    }
    /* Every old hand stops before its knob goes, and remembers what it was doing. */
    const was = new Map();
    for (const [name, e] of now) {
      const i = moving(e.knob);
      if (i >= 0) was.set(name, i);
      e.knob.hand?.stop('rebuilt');
    }
    const next = new Map();
    for (const p of params) {
      const had = now.get(p.name);
      const lo = Math.min(p.min, p.max), hi = Math.max(p.min, p.max);
      const start = had ? Math.min(hi, Math.max(lo, had.value)) : p.value;
      next.set(p.name, build(p, start));
    }
    now = next;
    root.replaceChildren();
    root.append(now.size ? lattice([...now.values()].map((e) => e.knob)) : none());
    // Re-measured once attached: a detached cell measures 0 px.
    // why: lessons/kit-param-knobs.md#measure-attached
    if (root.isConnected) grid?.size();
    for (const [name, i] of was) now.get(name)?.knob.hand?.start(i, 'rebuilt');
    return [...now].map(([name, e]) => ({ name, value: e.value }));
  }

  /* The reserve from the start, so the first compile does not push the keys
     down either: `/fau/`'s arrives behind a six megabyte download. */
  root.append(none());

  return {
    el: root,
    set,
    values: () => new Map([...now].map(([k, e]) => [k, e.value])),
    value: (name) => now.get(name)?.value,
    knob: (name) => now.get(name)?.knob,
    names: () => [...now.keys()],
    /** whether that parameter's invisible hand is moving it */
    handOn: (name) => !!now.get(name)?.knob.hand?.running,
  };
}
