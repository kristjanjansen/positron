// demo/shell/range-slider.mjs: one lane, two handles (`get()` answers a pair), the same `.sld`
// classes as slider.mjs. `from` never passes `to` (`clampPair`); one tab stop per handle.
// NO INVISIBLE HAND HERE (range-slider-test asserts this phrase): slider.mjs keeps one.
// why: lessons/kit-range-slider.md#header

import { el } from './shell.mjs';

/**
 * The least the handles may be apart, as a share of the scale. Zero: touching is a real setting
 * (a macro leg with no travel).
 * why: lessons/kit-range-slider.md#min-gap
 */
export const MIN_GAP = 0;

/**
 * How close two distances have to be before a press counts as landing between
 * both handles rather than nearer one of them. See `nearestHandle`, which is
 * where the measurement that bought this lives.
 */
export const TIE = 1e-9;

/**
 * Which handle a press at position `t` takes hold of.
 *
 * @param {number} t      where the press landed, 0 at the left of the travel
 * @param {number} fromT  the start handle's position, same scale
 * @param {number} toT    the end handle's position, same scale
 * @returns {'from'|'to'}
 */
export function nearestHandle(t, fromT, toT) {
  const p = Number(t) || 0;
  const a = Number(fromT) || 0;
  const b = Number(toT) || 0;
  const da = Math.abs(p - a);
  const db = Math.abs(p - b);
  // Stacked handles tie, so the side of the press decides, or a collapsed range opens one way only.
  // Near enough, not exact: |0.5 - 0.8| is 0.30000000000000004, so exact ties would look random.
  // why: lessons/kit-range-slider.md#tie
  if (Math.abs(da - db) <= TIE) return p < a ? 'from' : 'to';
  return da < db ? 'from' : 'to';
}

/**
 * What one handle's own scale is, given where the other one is standing.
 *
 * This is what `aria-valuemin` and `aria-valuemax` carry, and what `Home` and
 * `End` move to. It is a separate function from `clampPair` because the two
 * answer different questions: this one says where a handle MAY go, and that one
 * says where a handle ENDED UP.
 *
 * @param {'from'|'to'} which
 * @param {{from:number, to:number, min:number, max:number, gap?:number}} o
 * @returns {{lo:number, hi:number}}
 */
export function limitsFor(which, { from, to, min, max, gap = MIN_GAP } = {}) {
  const g = Math.max(0, Number(gap) || 0);
  if (which === 'from') return { lo: min, hi: Math.max(min, to - g) };
  return { lo: Math.min(max, from + g), hi: max };
}

/**
 * Move one handle and get back a pair that still obeys the invariant. It pushes nothing:
 * a handle stops at its neighbour rather than carrying it.
 * @param {{from:number, to:number, which:'from'|'to', next:number,
 *          min:number, max:number, gap?:number}} o
 * @returns {{from:number, to:number}}
 * why: lessons/kit-range-slider.md#clamp-pair
 */
export function clampPair({ from, to, which, next, min, max, gap = MIN_GAP } = {}) {
  const { lo, hi } = limitsFor(which, { from, to, min, max, gap });
  const v = Math.max(lo, Math.min(hi, Number(next)));
  return which === 'from' ? { from: v, to } : { from, to: v };
}

/**
 * Where the band between the handles is drawn, in pixels: the `calc()` stated once so node can
 * grade it (/kit/ measures the real band). Centre to centre of the 20 px handles.
 * @param {number} fromT  0 to 1
 * @param {number} toT    0 to 1
 * @param {number} laneW  the lane's width in pixels
 * @param {number} knobW  a handle's width in pixels
 * @returns {{left:number, width:number}}
 * why: lessons/kit-range-slider.md#span-pixels
 */
export function spanPixels(fromT, toT, laneW, knobW) {
  const w = Math.max(0, Number(laneW) || 0);
  const k = Math.max(0, Number(knobW) || 0);
  const travel = Math.max(0, w - k);
  const a = Math.max(0, Math.min(1, Number(fromT) || 0));
  const b = Math.max(a, Math.min(1, Number(toT) || 0));
  return { left: a * travel + k / 2, width: (b - a) * travel };
}

/**
 * @param {object} o
 * @param {string} o.label     shown before the lane, uppercased by CSS
 * @param {string} [o.sub]     a second, dimmer label under the first, exactly as
 *   `slider.mjs` uses it: the primary names what the control moves, the
 *   secondary names what it is on the wire.
 * @param {number} [o.min]
 * @param {number} [o.max]
 * @param {number} [o.step]    rounding applied to both values
 * @param {number} [o.from]    where the start handle opens, default `min`
 * @param {number} [o.to]      where the end handle opens, default `max`
 * @param {number} [o.gap]     the least the two may be apart, default `MIN_GAP`
 * @param {string} [o.unit]    printed after both numbers
 * @param {number} [o.digits]  decimal places, default inferred from step
 * @param {string} [o.aria]    a name for a control with no visible label
 * @param {(p:{from:number,to:number,moved:'from'|'to'})=>void} [o.onInput]
 * @param {(p:{from:number,to:number})=>void} [o.onChange]
 * @returns {{el:HTMLElement, lane:HTMLElement, knobs:HTMLElement[],
 *   get:()=>{from:number,to:number},
 *   set:(from:number, to:number, quiet?:boolean)=>{from:number,to:number},
 *   setFrom:(v:number, quiet?:boolean)=>{from:number,to:number},
 *   setTo:(v:number, quiet?:boolean)=>{from:number,to:number},
 *   limits:(which:'from'|'to')=>{lo:number,hi:number},
 *   disabled:(v:boolean)=>void}}
 */
export function createRangeSlider({ label, sub = '', aria, min = 0, max = 1, step,
                                    from, to, gap = MIN_GAP, unit = '', digits,
                                    onInput, onChange } = {}) {
  const span = max - min;
  const stp = step ?? span / 100;
  const dp = digits ?? Math.max(0, Math.min(4, String(stp).split('.')[1]?.length ?? 0));

  const snap = (x) => {
    const s = Math.round((x - min) / stp) * stp + min;
    return Math.max(min, Math.min(max, Number(s.toFixed(6))));
  };
  const toT = (x) => (span ? (x - min) / span : 0);
  const fromTpos = (t) => min + t * span;

  let a = snap(from ?? min);
  let b = snap(to ?? max);
  if (b < a) { const t = a; a = b; b = t; }
  ({ from: a, to: b } = clampPair({ from: a, to: b, which: 'to', next: b, min, max, gap }));

  const wrap = el('span', 'sld sld-range');
  const head = el('span', 'sld-head');
  const name = el('span', 'sld-l', sub ? null : (label || ''));
  if (sub) {
    name.classList.add('sld-l-pair');
    name.append(el('span', 'sld-l-p', label || ''), el('span', 'sld-l-s', sub));
  }

  /**
   * Two cells, not one string with a dash; each reserves its widest value so neither moves.
   * why: lessons/kit-range-slider.md#two-cells
   */
  const widest = Math.max(...[min, max]
    .map((v) => `${v.toFixed(dp)}${unit ? ' ' + unit : ''}`.length));
  const readA = el('span', 'sld-v', '');
  const readB = el('span', 'sld-v', '');
  readA.style.minWidth = `${widest}ch`;
  readB.style.minWidth = `${widest}ch`;
  const reads = el('span', 'sld-v-pair');
  reads.append(readA, readB);
  head.append(name, reads);

  const lane = el('span', 'sld-lane sld-lane-range', null, {
    role: 'group',
    'aria-label': aria || label || 'range',
  });
  const band = el('span', 'sld-span');
  const mk = (which, word) => el('span', 'sld-knob', null, {
    role: 'slider', tabindex: '0',
    'data-handle': which,
    'aria-label': `${aria || label || 'range'} ${word}`,
  });
  const knobA = mk('from', 'start');
  const knobB = mk('to', 'end');
  lane.append(band, knobA, knobB);
  wrap.append(head, lane);

  const show = (x) => `${x.toFixed(dp)}${unit ? ' ' + unit : ''}`;
  /**
   * The same `calc` the single slider uses: a share of the TRAVEL rather than
   * of the lane, so the two ends land flush inside the corners.
   */
  const atCss = (t) => {
    const p = (Math.max(0, Math.min(1, t)) * 100).toFixed(3);
    return `calc(${p}% - ${p} * var(--sld-knob) / 100)`;
  };

  function paint() {
    const ta = toT(a), tb = toT(b);
    knobA.style.left = atCss(ta);
    knobB.style.left = atCss(tb);
    // The band's two ends are the two handles' centres. See `spanPixels`, which
    // is this line written as arithmetic so it can be graded without a browser.
    const pa = (Math.max(0, Math.min(1, ta)) * 100).toFixed(3);
    const pw = (Math.max(0, Math.min(1, tb - ta)) * 100).toFixed(3);
    band.style.left = `calc(${pa}% - ${pa} * var(--sld-knob) / 100 + var(--sld-knob) / 2)`;
    band.style.width = `calc(${pw}% - ${pw} * var(--sld-knob) / 100)`;
    readA.textContent = show(a);
    readB.textContent = show(b);
    for (const [k, which] of [[knobA, 'from'], [knobB, 'to']]) {
      const { lo, hi } = limitsFor(which, { from: a, to: b, min, max, gap });
      const v = which === 'from' ? a : b;
      k.setAttribute('aria-valuemin', String(lo));
      k.setAttribute('aria-valuemax', String(hi));
      k.setAttribute('aria-valuenow', String(v));
      k.setAttribute('aria-valuetext', show(v));
    }
  }

  function write(which, next, quiet = false) {
    const was = which === 'from' ? a : b;
    const pair = clampPair({ from: a, to: b, which, next: snap(next), min, max, gap });
    a = pair.from; b = pair.to;
    paint();
    const now = which === 'from' ? a : b;
    if (!quiet && now !== was) onInput?.({ from: a, to: b, moved: which });
    return { from: a, to: b };
  }

  // ── pointer ───────────────────────────────────────────────────────────────
  const posAt = (clientX) => {
    const r = lane.getBoundingClientRect();
    const kw = knobA.getBoundingClientRect().width || 0;
    const travel = Math.max(1, r.width - kw);
    // The pointer grabs the CENTRE of a handle, so the usable range is inset by
    // half a handle at each end. Same arithmetic as the single slider.
    const x = Math.max(0, Math.min(travel, clientX - r.left - kw / 2));
    return fromTpos(x / travel);
  };

  let dragging = null;
  lane.addEventListener('pointerdown', (e) => {
    if (lane.hasAttribute('aria-disabled')) return;
    const v = posAt(e.clientX);
    dragging = nearestHandle(toT(v), toT(a), toT(b));
    // A synthetic pointer cannot be captured (`NotFoundError`); capture is optional for a drag.
    // why: lessons/kit-range-slider.md#pointer-capture
    try { lane.setPointerCapture(e.pointerId); } catch { /* synthetic, or gone */ }
    (dragging === 'from' ? knobA : knobB).focus({ preventScroll: true });
    write(dragging, v);
    e.preventDefault();
  });
  lane.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    write(dragging, posAt(e.clientX));
  });
  const lift = () => {
    if (!dragging) return;
    dragging = null;
    onChange?.({ from: a, to: b });
  };
  lane.addEventListener('pointerup', lift);
  lane.addEventListener('pointercancel', lift);

  // ── keyboard, one handle at a time ────────────────────────────────────────
  const onKey = (which) => (e) => {
    if (lane.hasAttribute('aria-disabled')) return;
    const v = which === 'from' ? a : b;
    const big = span / 10;
    const d = { ArrowLeft: -stp, ArrowDown: -stp, ArrowRight: stp, ArrowUp: stp,
                PageDown: -big, PageUp: big }[e.key];
    if (d !== undefined) {
      write(which, v + d);
      onChange?.({ from: a, to: b });
      e.preventDefault(); return;
    }
    // `Home` and `End` go to this handle's own limit, not the scale's.
    // why: lessons/kit-range-slider.md#home-end
    const { lo, hi } = limitsFor(which, { from: a, to: b, min, max, gap });
    if (e.key === 'Home') { write(which, lo); onChange?.({ from: a, to: b }); e.preventDefault(); }
    if (e.key === 'End') { write(which, hi); onChange?.({ from: a, to: b }); e.preventDefault(); }
  };
  knobA.addEventListener('keydown', onKey('from'));
  knobB.addEventListener('keydown', onKey('to'));

  paint();

  return {
    el: wrap,
    lane,
    knobs: [knobA, knobB],
    get: () => ({ from: a, to: b }),
    /**
     * Both values at once: end, start, end again, so the pair can travel either way past itself.
     * A crossed pair is swapped, not collapsed.
     * why: lessons/kit-range-slider.md#set
     */
    set(nf, nt, quiet = false) {
      let lo = Number(nf), hi = Number(nt);
      if (hi < lo) { const t = lo; lo = hi; hi = t; }
      const wasA = a, wasB = b;
      write('to', hi, true);
      write('from', lo, true);
      write('to', hi, true);
      if (!quiet && (a !== wasA || b !== wasB)) {
        onInput?.({ from: a, to: b, moved: a !== wasA ? 'from' : 'to' });
        onChange?.({ from: a, to: b });
      }
      return { from: a, to: b };
    },
    setFrom: (v, quiet = false) => write('from', v, quiet),
    setTo: (v, quiet = false) => write('to', v, quiet),
    limits: (which) => limitsFor(which, { from: a, to: b, min, max, gap }),
    disabled(yes) {
      if (yes) {
        lane.setAttribute('aria-disabled', 'true');
        for (const k of [knobA, knobB]) k.removeAttribute('tabindex');
      } else {
        lane.removeAttribute('aria-disabled');
        for (const k of [knobA, knobB]) k.setAttribute('tabindex', '0');
      }
    },
  };
}
