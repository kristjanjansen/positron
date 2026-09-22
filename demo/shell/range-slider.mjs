// demo/shell/range-slider.mjs
// One lane, two handles, a start and an end.
//
// 🔴 IT IS A NEW MODULE AND NOT A MODE OF `slider.mjs`, AND THE REASON IS THE
// RETURN VALUE. `createSlider` answers `get()` with a number, and every one of
// its call sites reads that number. A `range: true` option would have to make
// `get()` answer a pair, or grow a second accessor that only some sliders have,
// and then `set()`, `setRange()`, the keyboard path, the pointer path, the
// glide and the invisible hand each acquire a branch for a shape most callers
// never use. Two values are not one value with a flag on them.
//
// ✅ AND WHAT IT DOES REUSE IS EVERYTHING A READER CAN SEE. The root carries
// `.sld`, the head is `.sld-head`, the label is `.sld-l`, the lane is
// `.sld-lane` and each handle is a `.sld-knob`, all of which are declared once
// in `shell.css` for the single slider. So this control is the same height as a
// button, its lane is the same lane, its corner is the same corner, and
// `createSliderGroup` takes it with no change at all: a group is a grid and
// `.sld-group .sld { display: contents }` puts a head and a lane into the
// shared columns, which is exactly what this contributes.
// ⚠️ **TWO CHILDREN, NEVER THREE.** That `display: contents` is what aligns a
// stack of sliders, and a third child here would take a column of its own and
// push every lane in the group sideways. The head holds both numbers.
//
// 🔴 THE INVARIANT IS THAT `from` NEVER PASSES `to`, AND IT IS ENFORCED IN ONE
// FUNCTION. `clampPair` is the only place either value is written, so the
// pointer, the keyboard and a page calling `set()` cannot disagree about what
// happens when a handle is pushed past its neighbour. A range control that lets
// the two cross reports a negative span and draws a band backwards, and the
// page reading it has no way to tell that from a real reading.
//
// 🔴 AND THE ARIA LIMITS FOLLOW THE OTHER HANDLE, WHICH IS THE THING A NAIVE
// RANGE CONTROL GETS WRONG. Each handle is its own `role="slider"` with its own
// `aria-valuemin` and `aria-valuemax`, and those are the limits it can ACTUALLY
// reach: the start handle's maximum is wherever the end handle is standing, and
// it is rewritten every time either one moves. Reporting the full scale on both
// handles tells somebody using a screen reader that the start can go to 127
// when the end is at 40, and the only way to find out otherwise is to press the
// key and hear nothing change. `limitsFor` is that rule, and it is graded
// without a browser.
//
// ⚠️ TWO TAB STOPS, ONE PER HANDLE, AND THE LANE IS NOT ONE. A table is one tab
// stop with a roving index because its rows are a list you scan. This is two
// VALUES, and a control that hides one of its two values behind a mode key is a
// control where one of them cannot be reached from the keyboard at all. The
// lane carries `role="group"` and no `tabindex`, so tabbing through this
// control is start, end, out.
//
// ⚠️ ARROWS MOVE BY A STEP, PAGE KEYS BY A TENTH, AND `Home` AND `End` GO TO
// THIS HANDLE'S OWN LIMIT rather than to the scale's. `End` on the start handle
// puts it against the end handle, which is where it can actually get to, and is
// the same answer the arrow keys converge on.
//
// 🔴 A PRESS WHERE THE TWO HANDLES ARE STACKED HAS TO PICK ONE, AND PICKING THE
// NEARER IS NOT ENOUGH. With `from` and `to` on the same number both are
// exactly as near, so the tie is broken by WHICH SIDE the press is on: a press
// to the left grabs the start, because the start is the handle that can move
// left. Breaking the tie the other way makes a collapsed range impossible to
// open again, which looks like a control that has stopped working. See
// `nearestHandle`.
//
// ⚠️ NO INVISIBLE HAND HERE. A hand is one value wandering, and there is no
// settled answer for what two of them wandering against a shared invariant
// should look like. `slider.mjs` keeps it; this does not pretend to.
//
// STYLING lives in `shell.css` beside the single slider's, because everything
// this draws except the band between the handles is already declared there and
// a second copy is the drift this kit exists to catch.

import { el } from './shell.mjs';

/**
 * The least the two handles may be apart, as a share of the scale, when a
 * caller does not say. Zero: they may touch.
 *
 * ⚠️ TOUCHING IS A REAL SETTING RATHER THAN A DEGENERATE ONE. A macro leg on
 * the Circuit is `Destination, Start, End, Depth`, and a leg whose start and
 * end are the same number is a leg with no travel, which somebody may well
 * want. Refusing it by default would be this component deciding something about
 * an instrument it has never been connected to.
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
  // 🔴 THE TIE IS THE CASE THAT MATTERS AND IT IS THE ONLY ONE WORTH A COMMENT.
  // Two handles on the same number are equally near to every press, so a plain
  // `da <= db` would always answer `from` and a plain `da < db` would always
  // answer `to`. Either way one of the two is unreachable and a collapsed range
  // can only ever be opened in one direction. Deciding on the SIDE gives both
  // directions back: press left of the pair and the start comes with you, press
  // right and the end does.
  // 🔴 AND THE TIE IS NEAR ENOUGH RATHER THAN EXACT, WHICH WAS MEASURED RATHER
  // THAN GUESSED AT. `Math.abs(0.5 - 0.2)` is 0.3 and `Math.abs(0.5 - 0.8)` is
  // 0.30000000000000004, so an exact comparison makes a press halfway between
  // two handles take the START, while the same press halfway between 0.4 and
  // 0.6 ties exactly and takes the END. Two identical gestures answering
  // differently because of where the handles happen to sit is the shape a
  // reader calls random, and no amount of looking at the source shows it.
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
 * Move one handle and get back a pair that still obeys the invariant.
 *
 * 🔴 IT PUSHES NOTHING. A start dragged past the end stops AT the end rather
 * than carrying it along, and that is a decision rather than the easy path. A
 * range that shoves its other handle loses the value you were not touching,
 * silently, and the page reading `to` gets a number nobody set. Stopping is
 * visible: the handle refuses to go further and the number under it stops
 * changing, which is the control saying what it just did.
 *
 * @param {{from:number, to:number, which:'from'|'to', next:number,
 *          min:number, max:number, gap?:number}} o
 * @returns {{from:number, to:number}}
 */
export function clampPair({ from, to, which, next, min, max, gap = MIN_GAP } = {}) {
  const { lo, hi } = limitsFor(which, { from, to, min, max, gap });
  const v = Math.max(lo, Math.min(hi, Number(next)));
  return which === 'from' ? { from: v, to } : { from, to: v };
}

/**
 * Where the band between the handles is drawn, in pixels.
 *
 * 🔴 THIS IS A STATEMENT OF WHAT THE `calc()` MEANS, NOT THE CODE THAT RUNS.
 * The component positions the band with percentages so it follows the lane
 * without a resize observation, the same way `slider.mjs` positions its handle,
 * and a percentage cannot be graded in node. So the arithmetic is written here
 * once, in pixels, and asserted without a browser; and `/kit/` measures the
 * real band against the two real handles, which is the half that grades the
 * `calc`. Neither alone would be worth much: the first cannot see a typo in a
 * CSS string and the second cannot be run cheaply.
 *
 * The band runs from the CENTRE of the start handle to the centre of the end
 * handle, because a handle is 20 px wide and a band drawn to its edges would be
 * a fifth of a lane longer than the range it stands for.
 *
 * @param {number} fromT  0 to 1
 * @param {number} toT    0 to 1
 * @param {number} laneW  the lane's width in pixels
 * @param {number} knobW  a handle's width in pixels
 * @returns {{left:number, width:number}}
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
   * 🔴 TWO CELLS, NOT ONE STRING WITH A DASH IN IT. The house rule is that a
   * row of facts is cells: `0 to 127` glues two readings into a sentence that
   * has to be parsed, and the glue is the first thing to go wrong when one of
   * the numbers gets wider. Two fixed boxes side by side say the same thing and
   * line up under the two handles they belong to.
   * ⚠️ AND EACH RESERVES ITS WIDEST VALUE, the same way a single slider does, so
   * neither number can move the other one while somebody is dragging.
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
    // ⚠️ A SYNTHETIC POINTER CANNOT BE CAPTURED AND THE THROW TAKES THE DRAG
    // WITH IT. `setPointerCapture` raises `NotFoundError` for an id that is not
    // an active pointer, which is every `PointerEvent` a check dispatches at
    // itself, and the exception escapes before the value is read. Capture is an
    // improvement on a drag that leaves the lane, not a requirement of one.
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
    // 🔴 `Home` AND `End` GO TO THIS HANDLE'S LIMIT, NOT TO THE SCALE'S. On the
    // start handle `End` is wherever the end handle is standing, which is the
    // furthest it can get; sending it to `max` and letting the clamp pull it
    // back would be the same landing place reached by a lie about the scale.
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
     * Both values at once.
     *
     * 🔴 THREE WRITES, NOT TWO, AND THAT IS THE BUG THIS SHAPE EXISTS TO AVOID.
     * Each value is clamped against where the OTHER one is standing right now,
     * so a pair moving wholesale from the top of the scale to the bottom has
     * its first write refused by a neighbour that has not moved yet. Writing
     * the end, then the start, then the end again lets the pair travel in
     * either direction with no special case for which way it is going.
     * ⚠️ AND A CROSSED PAIR IS SWAPPED RATHER THAN COLLAPSED. `set(30, 15)` is
     * somebody handing over two numbers in the order they had them, and
     * collapsing both onto 15 would throw one of them away without saying so.
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
