// demo/shell/slider.mjs: a value you can drag, 34 px tall like a button, handle flush in the lane.
// verify.mjs cannot drag it (click only), so a page drives set() from its own check
// and asserts on the value that came out.
// why: lessons/kit-slider.md#header

import { el } from './shell.mjs';
import { MOVES, MOVE_TURN, MOVE_GLYPH, MOVE_OFF } from './hand.mjs';
import { createHandDrive, HAND_MAX_MS, HAND_YIELD_MS } from './hand-drive.mjs';

/**
 * Re-exported from hand-drive.mjs: /archive/radio/, /kit/ and /knobs/ import them from here.
 * why: lessons/kit-slider.md#hand-reexport
 */
export { HAND_MAX_MS, HAND_YIELD_MS };


// How long a glide takes: one number, so a knob and its sound move at one speed.
// 900 ms so the eye can follow it; only the drawing glides, the value is committed at once,
// and prefers-reduced-motion skips it.
// why: lessons/kit-slider.md#glide-ms
export const GLIDE_MS = 900;

const reducedMotion = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

/**
 * Call onFrame(k), k running 0 -> 1 over ms, eased, and exactly once at 1.
 * Returns stop(finish). A timer past the end lands it when a background tab stops rAF.
 * why: lessons/kit-slider.md#glide
 */
export function glide(onFrame, { ms = GLIDE_MS } = {}) {
  if (!(ms > 0)) { onFrame(1); return () => {}; }
  const t0 = performance.now();
  let raf = 0, timer = 0, done = false;
  const stop = (finish = false) => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf); clearTimeout(timer);
    if (finish) onFrame(1);
  };
  const step = () => {
    if (done) return;
    const t = Math.min(1, (performance.now() - t0) / ms);
    // Ease-out-quint: off quickly, then a long settle, the way a hand moves.
    // why: lessons/kit-slider.md#glide-ease
    onFrame(1 - Math.pow(1 - t, 5));
    if (t >= 1) { stop(); return; }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  timer = setTimeout(() => stop(true), ms + 60);
  return stop;
}

/**
 * Several sliders sharing one set of columns (labels, lanes, values), so the lanes align.
 * @param sliders
 * @param [opt.pair]  two sliders across on a wide screen, stacked below the breakpoint.
 * why: lessons/kit-slider.md#slider-group
 */
export function createSliderGroup(sliders = [], { pair = false } = {}) {
  const wrap = el('div', `sld-group${pair ? ' pos-pair' : ''}`);
  for (const s of sliders) wrap.append(s.el ?? s);
  return { el: wrap, add: (s) => { wrap.append(s.el ?? s); return s; } };
}

/**
 * @param {object} o
 * @param {string} o.label     shown before the lane, uppercased by CSS
 * @param {string} [o.sub]     a dimmer second label: what it is on the wire (CC 74); omit and nothing is drawn
 * @param {number} o.min
 * @param {number} o.max
 * @param {number} [o.step]    rounding applied to every value, default (max-min)/100
 * @param {number} [o.value]   where it starts, default min
 * @param {string} [o.unit]    printed after the number: 'ms', 'Hz', '%'
 * @param {number} [o.digits]  decimal places, default inferred from step
 * @param {(v:number)=>void} [o.onInput]   every move, cheap things only
 * @param {(v:number)=>void} [o.onChange]  on release, and on a keyboard step
 * @param [o.warp]  'exp' for a logarithmic lane; min must be above zero (it throws).
 * @param [o.hand]  true, or { preset }, for an invisible hand button; never inside .pos-controls.
 * @param [o.onHand]  called when the hand starts or stops, for the page's log.
 * @param {Array<string|Node>} [o.ends]  two names inside the lane for a crossfader; the slider fills its row.
 * @returns {{el:HTMLElement, get:()=>number,
 *   set:(v:number, opt?:boolean|{quiet?:boolean, glideMs?:number})=>number,
 *   label:(text:string)=>void,
 *   disabled:(v:boolean)=>void}}
 * why: lessons/kit-slider.md#create-slider
 */
export function createSlider({ label, sub = '', aria, min = 0, max = 1, step, value, unit = '',
                               digits, warp, onInput, onChange, hand = false, onHand, ends } = {}) {
  if (ends !== undefined && !(Array.isArray(ends) && ends.length === 2)) {
    throw new Error('slider: `ends` is two names, the left end and the right end');
  }
  let span = max - min;
  let exp = warp === 'exp';
  if (exp && !(min > 0)) throw new Error('slider: warp "exp" needs min > 0');
  const stp = step ?? span / 100;
  let dp = digits ?? Math.max(0, Math.min(4, String(stp).split('.')[1]?.length ?? 0));
  // position 0..1 -> value, and back. The linear pair is what every existing
  // caller already had; nothing about it changes.
  let ratio = exp ? Math.log(max / min) : 0;
  const fromT = (t) => (exp ? min * Math.exp(ratio * t) : min + t * span);
  const toT = (x) => (exp ? Math.log(x / min) / ratio : (span ? (x - min) / span : 0));
  let v = clamp(value ?? min);

  function clamp(x) {
    // An exponential lane rounds to decimals, not a fixed step, so low values stay reachable.
    // why: lessons/kit-slider.md#exp-snap
    const snapped = exp ? Number(x.toFixed(dp)) : Math.round((x - min) / stp) * stp + min;
    return Math.max(min, Math.min(max, Number(snapped.toFixed(6))));
  }

  const wrap = el('span', 'sld');
  const head = el('span', 'sld-head');
  // The two labels nest in one column, wrapped only when there is a sub, because /grains/
  // selects .fade > .sld > .sld-lane with a child combinator.
  // why: lessons/kit-slider.md#label-pair
  const name = el('span', 'sld-l', sub ? null : (label || ''));
  if (sub) {
    name.classList.add('sld-l-pair');
    name.append(el('span', 'sld-l-p', label || ''), el('span', 'sld-l-s', sub));
  }
  const lane = el('span', 'sld-lane', null, {
    // A real slider to anything that asks: a screen reader, and a keyboard.
    role: 'slider', tabindex: '0',
    // `aria` names a slider that has no visible label, for a screen reader.
    // why: lessons/kit-slider.md#aria
    'aria-label': aria || label || 'value',
    'aria-valuemin': String(min), 'aria-valuemax': String(max),
  });
  const knob = el('span', 'sld-knob');
  const read = el('span', 'sld-v', '');
  // Reserve the widest value this slider can show, so the number does not jump on a drag.
  // why: lessons/kit-slider.md#widest-value
  const widest = Math.max(...[min, max].map((v) => `${v.toFixed(dp)}${unit ? ' ' + unit : ''}`.length));
  read.style.minWidth = `${widest}ch`;
  // The names go in BEFORE the handle, so the handle paints over them.
  const endEls = ends ? ends.map((x, i) => {
    const e = el('span', `sld-end sld-end-${i ? 'r' : 'l'}`, null, { 'aria-hidden': 'true' });
    if (x instanceof Node) e.append(x); else e.textContent = x ?? '';
    lane.append(e);
    return e;
  }) : null;
  if (ends) wrap.dataset.ends = '';
  lane.append(knob);
  // The number goes under its own label, so a slider is two columns and the gap
  // before the next slider does not depend on a value's width.
  // why: lessons/kit-slider.md#number-under-label
  head.append(name, read);
  /**
   * The hand's button, joined to the lane with the shared .pos-seg look.
   * why: lessons/kit-slider.md#hand-row
   */
  const handRow = hand ? el('span', 'sld-hand-row pos-seg', null, { 'data-hand': 'off' }) : null;
  const handBtn = hand
    ? el('button', 'sld-hand', MOVE_GLYPH[MOVES[MOVE_TURN[0]][0]],
      { type: 'button', title: MOVE_OFF, 'aria-label': MOVE_OFF, 'aria-pressed': 'false' })
    : null;
  if (handRow) { handRow.append(lane, handBtn); wrap.append(head, handRow); }
  else wrap.append(head, lane);

  const show = (x) => `${x.toFixed(dp)}${unit ? ' ' + unit : ''}`;
  // Where the handle is DRAWN, which is `v` except while a glide is running.
  // Kept so a second glide starts from the pixel you can see rather than from
  // the value that pixel is on its way to.
  let shown = v;

  /**
   * @param [at] the position to draw, default the real value. aria-* always carries v.
   * why: lessons/kit-slider.md#paint
   */
  function paint(at = v) {
    shown = at;
    const t = Math.max(0, Math.min(1, toT(at)));
    // Percentage of the TRAVEL, not of the lane: `calc` subtracts the handle's
    // own width so the two ends land flush. See the note at the top.
    knob.style.left = `calc(${(t * 100).toFixed(3)}% - ${(t * 100).toFixed(3)} * var(--sld-knob) / 100)`;
    read.textContent = show(at);
    lane.setAttribute('aria-valuenow', String(v));
    lane.setAttribute('aria-valuetext', show(v));
  }

  let stopGlide = null;
  const endGlide = (finish) => { stopGlide?.(finish); stopGlide = null; };

  /**
   * Every public set() yields the hand: a pointer, a key and the page all go through it.
   * Assigned below, because the hand needs clamp, paint and endGlide.
   * why: lessons/kit-slider.md#hand-yield
   */
  let handYield = null, handPickUp = null;

  /**
   * @param next
   * @param [opt]  true for quiet, or { quiet, glideMs }. The value lands at once and the
   *   callbacks fire on the same tick; only the drawing glides.
   * why: lessons/kit-slider.md#set
   */
  function set(next, opt = false) {
    const o = (opt && typeof opt === 'object') ? opt : { quiet: !!opt };
    handYield?.();
    const was = v;
    v = clamp(next);
    const from = shown;
    endGlide(false);
    // Reduced motion is a request about the SCREEN, and this is the screen.
    // shell.css's global `animation: none` cannot reach a glide driven from
    // script, so the one place that can ask is here.
    if (o.glideMs > 0 && v !== from && !reducedMotion()) {
      // Paint once before the glide, or aria-valuenow is stale for one frame.
      // why: lessons/kit-slider.md#paint-before-glide
      paint(shown);
      stopGlide = glide((k) => paint(from + (v - from) * k), { ms: o.glideMs });
    } else {
      paint();
    }
    if (!o.quiet && v !== was) { onInput?.(v); onChange?.(v); }
    return v;
  }

  const fromX = (clientX) => {
    const r = lane.getBoundingClientRect();
    const kw = knob.getBoundingClientRect().width || 0;
    const travel = Math.max(1, r.width - kw);
    // The pointer grabs the CENTRE of the handle, so the usable range is inset
    // by half a handle at each end — otherwise the value only reaches its
    // extremes when the pointer leaves the lane entirely.
    const x = Math.max(0, Math.min(travel, clientX - r.left - kw / 2));
    return fromT(x / travel);
  };

  let dragging = false;
  lane.addEventListener('pointerdown', (e) => {
    if (lane.hasAttribute('aria-disabled')) return;
    // A hand on the control outranks an animation of the last patch, and it
    // outranks an invisible one too.
    endGlide(false);
    handYield?.();
    dragging = true;
    // setPointerCapture throws for a synthetic pointer; capture is optional, the drag is not.
    // why: lessons/kit-slider.md#pointer-capture
    try { lane.setPointerCapture(e.pointerId); } catch { /* synthetic, or already gone */ }
    v = clamp(fromX(e.clientX)); paint(); onInput?.(v);
    e.preventDefault();
  });
  lane.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const was = v;
    v = clamp(fromX(e.clientX)); paint();
    if (v !== was) onInput?.(v);
  });
  // The lift resumes a running hand; it never turns one on.
  // why: lessons/kit-slider.md#lift-resumes
  const end = () => { if (!dragging) return; dragging = false; onChange?.(v); handPickUp?.(); };
  lane.addEventListener('pointerup', end);
  lane.addEventListener('pointercancel', end);

  // A keyboard path, also the one route a harness can drive without pointer events.
  // why: lessons/kit-slider.md#keyboard
  lane.addEventListener('keydown', (e) => {
    // On an exponential lane a key moves one per cent of the lane, not a fixed value.
    // why: lessons/kit-slider.md#exp-keys
    const big = span / 10;
    const step1 = exp ? 0.01 : stp;
    const stepBig = exp ? 0.1 : big;
    const d = { ArrowLeft: -step1, ArrowDown: -step1, ArrowRight: step1, ArrowUp: step1,
                PageDown: -stepBig, PageUp: stepBig }[e.key];
    if (d !== undefined) {
      set(exp ? fromT(Math.max(0, Math.min(1, toT(v) + d))) : v + d);
      e.preventDefault(); return;
    }
    if (e.key === 'Home') { set(min); e.preventDefault(); }
    if (e.key === 'End') { set(max); e.preventDefault(); }
  });

  // The movement is hand.mjs, the driver hand-drive.mjs; here only what a slider knows:
  // its step count, share to value, and the sentence it says when barred.
  // why: lessons/kit-slider.md#invisible-hand
  let handApi = null;
  if (hand) {
    const opt = (hand && typeof hand === 'object') ? hand : {};
    /**
     * A lane too coarse for a hand says so; an exponential lane counts 100 key steps.
     * why: lessons/kit-slider.md#hand-steps
     */
    const steps = exp ? 100 : Math.max(1, Math.round(span / stp));
    handApi = createHandDrive({
      btn: handBtn,
      row: handRow,
      at: () => toT(v),
      /**
       * The pointer drag's path, not set(), so set() always means somebody else is moving it.
       * why: lessons/kit-slider.md#hand-move
       */
      move: (share) => {
        const nv = clamp(fromT(share));
        if (nv !== v) { v = nv; paint(); onInput?.(v); }
      },
      rest: () => onChange?.(v),
      settle: () => endGlide(false),
      steps,
      preset: opt.preset,
      onHand,
      barredSays: 'a slider in a control row may not have an invisible hand: the suite presses '
        + 'every button in that row on every run, and this one would start sending',
    });
    handYield = handApi.yield;
    handPickUp = handApi.resume;
  }

  paint();
  return {
    el: wrap,
    /** the invisible hand, or `null` on a slider that was not given one */
    hand: handApi,
    /** the two name slots inside the lane, left then right, or `null` */
    ends: endEls,
    get: () => v,
    set,
    /**
     * Re-scale this slider in place when the control's meaning changes.
     * The caller re-derives the value; only it knows what the old number meant.
     * why: lessons/kit-slider.md#set-range
     */
    setRange({ min: lo, max: hi, unit: u, digits: dg, warp: w } = {}) {
      if (lo !== undefined) min = lo;
      if (hi !== undefined) max = hi;
      if (u !== undefined) unit = u;
      if (dg !== undefined) dp = dg;
      if (w !== undefined) { exp = w === 'exp'; ratio = exp ? Math.log(max / min) : 0; }
      span = max - min;
      lane.setAttribute('aria-valuemin', String(min));
      lane.setAttribute('aria-valuemax', String(max));
      read.style.minWidth = `${Math.max(...[min, max]
        .map((x) => `${x.toFixed(dp)}${unit ? ' ' + unit : ''}`.length))}ch`;
      v = clamp(v);
      paint();
    },
    /**
     * Rename the control when a preset decides its meaning. A caller sharing a label column
     * must re-measure it; the aria label is left alone.
     * why: lessons/kit-slider.md#label
     */
    label: (text) => { name.textContent = text ?? ''; },
    disabled: (yes) => {
      if (yes) { lane.setAttribute('aria-disabled', 'true'); lane.removeAttribute('tabindex'); }
      else { lane.removeAttribute('aria-disabled'); lane.setAttribute('tabindex', '0'); }
      // A control that cannot be dragged cannot be driven by a hand either, and
      // a hand still running on a disabled slider is the page arguing with its
      // own greyed-out control.
      if (handBtn) handBtn.disabled = !!yes;
      if (yes) handApi?.stop('disabled');
    },
  };
}
