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
// 🔴 THE ROW KEEPS ONE KNOB'S HEIGHT WHEN THERE IS NOTHING TO TURN, SINCE
// 2026-09-30. Asked: *"make the area h for thise buttons fixed so no junmp"*.
// It was `hidden` with no knobs in it, so picking a preset with no parameter
// (the Growl on `/collide/`, the Organ on `/fau/`) pulled the keyboard under
// it up by a knob's height, and picking one with a parameter pushed it down
// again, under the hand that was about to play it.
// ⚠️ THE RESERVE IS A KNOB, NOT A NUMBER. An empty row holds a bank of one
// knob that is `visibility: hidden`, `inert` and `aria-hidden`, alone in
// the row, so the height is whatever a knob is today and
// cannot disagree with it when the knob grows a label. A typed `min-height`
// would be a second copy of the knob's height in a second file.
// ⚠️ AND IT SAYS NOTHING. It carried the words `no knobs in this program`
// for its first afternoon, and they went on *"rm no knobs in this program"*
// (2026-09-30): the band stays a knob tall and empty.
//
// 🔴 EVERY KNOB HAS AN INVISIBLE HAND, SINCE THE SAME DAY. Asked: *"add
// invisible hands to these cutoff buttons"*. It is `knob.mjs`'s own `hand`,
// whose moves come out of the knob's `onInput` exactly as a drag does, so
// they reach the page's `onChange` through the same warp and the same spec.
// ⚠️ A RECOMPILE THAT KEEPS THE NAME KEEPS THE HAND RUNNING, and one that
// drops the name stops it. Every knob is rebuilt on every `set()`, so the old
// hand is STOPPED before its knob is thrown away (a hand on a detached knob
// would go on calling `onChange` from a frame loop nobody can see), and the
// new knob's hand is started with the same movement.
//
// ⚠️ `onHold(name, on)` IS A POINTER ON THE DIAL, so a page can light the
// parameter's text in the code while a person holds its knob. It is here
// rather than on the page because the knobs are rebuilt here, and a listener
// a page attached would be on a knob that no longer exists after the next
// compile.
//
// ⚠️ THE HOOK FOR COLOUR, AND NOTHING ELSE ABOUT COLOUR. Every knob carries
// `data-param="<name>"`, and `shell.css` draws its arc, its name and its
// number in `hsl(var(--param-hue) ...)` when a `--param-hue` is set on it or
// above it, and in the ordinary inks when not. The page sets it, from the one
// hue book the code box reads (`code-lang.mjs`, `createHueBook`), so a
// parameter's text and its knob cannot disagree. Nothing here sets a hue.

import { createKnob, createKnobBank, knobPlaces } from './knob.mjs';
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
export function createParamKnobs({ onChange = () => {}, onHold = null } = {}) {
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

  /** The reserve an empty row holds: a hidden knob for the height, and nothing to read. */
  function none() {
    const wrap = document.createElement('div');
    wrap.className = 'pos-pknobs-none';
    const ghost = createKnobBank([createKnob({ label: 'none', min: 0, max: 1, value: 0 })]).el;
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
    root.append(now.size ? createKnobBank([...now.values()].map((e) => e.knob)).el : none());
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
