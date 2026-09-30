// demo/shell/param-knobs.mjs: one row of knobs under a program's text, one
// knob per parameter the program declares, rebuilt after every compile.
//
// Asked 2026-09-30: *"what about variables in code ... that are under the code
// and adjust parameters in real time"*, then *"do test with single knob laer.
// can we do it on fau too?"*. `/collide/` and `/fau/` both hand this the list
// their compiler read out of the program, and both are the same row.
//
// 🔴 THE PAGE SAYS WHAT A PARAMETER IS, AND THIS SAYS NOTHING ABOUT A LANGUAGE.
// A parameter is `{ name, value, min, max, warp, step }`: SuperCollider's
// `ControlSpec` fields, because they are the richer of the two (a Faust
// `hslider` is `min, max, step` and a linear warp, or `[scale:log]`, which is
// the exponential one). What a turn DOES is the page's `onChange(name, value)`:
// `/n_set` on every sounding node there, `setParamValue` on the worklet here.
//
// 🔴 A KNOB KEEPS ITS VALUE ACROSS A RECOMPILE WHEN ITS NAME SURVIVES. `set()`
// is called with every compile's list; a name that was there before keeps the
// value a hand left it at, held inside the new range, and a new name starts at
// the value the program wrote. `set()` answers with every value it settled on,
// so the page can hand them to whatever the new program is running in.
//
// 🔴 THE KNOB TURNS 0 TO 1 AND THE WARP IS HERE. `knob.mjs` is linear, and an
// exponential range on a linear dial puts 0.05 to 3 seconds of a 0.05 to 6
// release in the first half of the travel and nothing a hand can find below
// 0.2. So the dial runs 0 to 1, exactly as a `ControlSpec` is mapped in
// sclang, and `mapSpec` and `unmapSpec` are `ControlSpec.map` and `.unmap`
// with their warps (`Spec.sc`, read at supercollider 19954900). The number
// under the dial is the mapped value through the knob's own `format`, at a
// number of places decided once per knob (`placesFor`), because a string that
// gains and loses a decimal while it is turned is what `knob.mjs` was told to
// stop doing.
//
// ⚠️ NO ROW WHEN THERE IS NOTHING TO TURN. The root is `hidden` with no knobs
// in it, and a page puts it in a row that it hides with it (`hidden` on the
// row, which `.pos-rows-r[hidden]` honours), because an empty box is a line.
//
// ⚠️ THE HOOK FOR COLOUR, AND NOTHING ELSE ABOUT COLOUR. Every knob carries
// `data-param="<name>"`, and `shell.css` draws its arc in
// `hsl(var(--param-hue) ...)` when a `--param-hue` is set on it or above it,
// and in the ordinary `--hi` when not. That is for the editor work in
// `plans/plan-code-editor.md`, which colours a parameter's text and its knob
// alike. Nothing here sets a hue.

import { createKnob, createKnobBank, knobPlaces } from './knob.mjs';

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
 * @param {(name:string, value:number) => void} o.onChange  a person turned one
 * @returns {{el: HTMLElement, set: (params: object[]) => {name:string, value:number}[],
 *   values: () => Map<string, number>, value: (name:string) => number|undefined,
 *   knob: (name:string) => object|undefined, names: () => string[]}}
 */
export function createParamKnobs({ onChange = () => {} } = {}) {
  const root = document.createElement('div');
  root.className = 'pos-pknobs';
  root.hidden = true;
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
      onInput: (n) => {
        entry.value = mapSpec(n, spec);
        say();
        onChange(p.name, entry.value);
      },
    });
    k.el.dataset.param = p.name;
    entry.knob = k;
    entry.dial = k.el.querySelector('.pos-knob-dial');
    say();
    return entry;
  }

  /**
   * Rebuild from a compile's parameters. A name that survives keeps its value,
   * held inside its new range. Answers with every value now on the row.
   */
  function set(params = []) {
    const next = new Map();
    for (const p of params) {
      if (next.has(p.name)) throw new Error(`createParamKnobs: ${p.name} is listed twice`);
      const had = now.get(p.name);
      const lo = Math.min(p.min, p.max), hi = Math.max(p.min, p.max);
      const start = had ? Math.min(hi, Math.max(lo, had.value)) : p.value;
      next.set(p.name, build(p, start));
    }
    now = next;
    root.replaceChildren();
    if (now.size) root.append(createKnobBank([...now.values()].map((e) => e.knob)).el);
    root.hidden = now.size === 0;
    return [...now].map(([name, e]) => ({ name, value: e.value }));
  }

  return {
    el: root,
    set,
    values: () => new Map([...now].map(([k, e]) => [k, e.value])),
    value: (name) => now.get(name)?.value,
    knob: (name) => now.get(name)?.knob,
    names: () => [...now.keys()],
  };
}
