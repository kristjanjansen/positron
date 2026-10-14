// demo/shell/knob.mjs: a rotary control dragged vertically, never angularly: near the centre
// two pixels of angular drag swing the whole range. `movementY` plus pointer capture, so
// the gesture is about the hand; pointer lock is deliberately not taken.
// why: lessons/kit-knob.md#header

/** How far the hand travels, in pixels, to cross the whole range. */
const SWEEP = 180;
/** Shift multiplies the travel by this, so the same gesture is five times finer. */
const FINE = 0.2;
/**
 * Degrees of sweep, with the gap at the bottom where a real knob's gap is.
 * 270 is the only value; there is no per-knob option, so every page's knobs match.
 * why: lessons/kit-knob.md#arc
 */
// The invisible hand's button, frame loop and hand-over come from
// `hand-drive.mjs`, shared with `slider.mjs`. What a movement IS lives in
// `hand.mjs` and is graded with no browser by `node demo/shell/hand-test.mjs`.
import { createHandDrive } from './hand-drive.mjs';

const ARC = 270;

/**
 * `receive(v, { from })` glides the dial to a value from elsewhere and never calls `onInput`
 * or `onChange`, so it cannot echo back. `value()` is new at once; only the drawing glides.
 * A person or the invisible hand within `RECEIVE_HOLD_MS` wins and the value is `ignored`.
 * why: lessons/kit-knob.md#receive
 */
export const RECEIVE_GLIDE_MS = 160;
export const RECEIVE_MARK_MS = 700;
export const RECEIVE_HOLD_MS = 300;
/** The ease of a received glide: fast out of the start, settling at the end. */
export const easeOut = (x) => 1 - (1 - x) ** 3;

/**
 * `from: 'hand'` means a person; the invisible hand's moves are `from: 'self'` with their own
 * counter. The option stays `hand` to match `slider.mjs` and the button.
 * why: lessons/kit-knob.md#self
 */
const SELF = 'self';

/**
 * A value held inside the ends and, when there is a step, rounded onto one.
 * Pure so `knob-test.mjs` grades it with no browser. Six places, as `slider.mjs`, because
 * `Math.round((3 - 1) / 0.1) * 0.1 + 1` is 3.0000000000000004.
 * @param {number} n
 * @param {object} o
 * @param {number} o.min @param {number} o.max
 * @param {number} [o.step]  0 or omitted for a continuous travel
 * why: lessons/kit-knob.md#snapto
 */
export function snapTo(n, { min, max, step = 0 } = {}) {
  const x = Math.min(max, Math.max(min, Number(n)));
  if (!step) return x;
  return Math.min(max, Math.max(min,
    Number((Math.round((x - min) / step) * step + min).toFixed(6))));
}

/**
 * How many decimal places a knob prints its value at, from its own resolution.
 * Decided once and never per frame, so the string does not gain and lose a decimal point.
 * @param {object} o
 * @param {number} o.min @param {number} o.max
 * @param {number} [o.step]
 * @param {number} [o.sweep]  the travel in pixels. Only a test passes this.
 * why: lessons/kit-knob.md#knobplaces
 */
export function knobPlaces({ min, max, step = 0, sweep = SWEEP } = {}) {
  const cap = (n) => Math.max(0, Math.min(4, n));
  if (step) return cap(String(step).split('.')[1]?.length ?? 0);
  return cap(Math.round(-Math.log10((max - min) / sweep)));
}

/**
 * One knob.
 * @param {object} o
 * @param {string} o.label     under the dial, uppercased by CSS. Keep it short.
 * @param {string} [o.sub]     a dimmer second line: `CC 80`.
 * @param {number} [o.min]     default 0, because these are MIDI controllers
 * @param {number} [o.max]     default 127
 * @param {number} [o.value]   where it starts, default the midpoint
 * @param {number} [o.home]    where a double press returns it to, default `value`
 * @param {string} [o.unit]    printed after the number
 * @param {string} [o.title]   hover text
 * @param {number} [o.step]    a knob that lands only on whole steps, rounded here so needle and number agree
 * @param {number} [o.stroke]  ring and needle thickness in the dial's 100 unit space, default 4
 * @param {(v:number, from:string)=>void} [o.onInput]
 * @param {(v:number, from:string)=>void} [o.onChange]
 * @returns {{el:HTMLElement, set:Function, value:()=>number, source:()=>string, hardwareMoves:()=>number, handMoves:()=>number}}
 * why: lessons/kit-knob.md#createknob
 */
export function createKnob({
  label, sub = '', min = 0, max = 127, value, home, unit = '', title = '',
  onInput = () => {}, onChange = () => {}, disabled = false,
  stroke, ends, step, hand: wantHand = false, format = null,
} = {}) {
  if (!label) throw new Error('a knob needs a label: it is the only thing naming what it moves');
  const span = max - min;
  if (!(span > 0)) throw new Error(`a knob needs max above min, got ${min}..${max}`);
  /**
   * The step, or 0 for continuous: 0 makes `Math.max(x, stp)` and `stp || fallback` the identity.
   * A step wider than the travel, or zero or less, is refused at build time, not clamped.
   * why: lessons/kit-knob.md#step
   */
  const stp = step === undefined ? 0 : Number(step);
  if (step !== undefined && !(stp > 0 && stp <= span)) {
    throw new Error(`a knob's step is above 0 and no wider than its travel, got ${step} on ${min}..${max}`);
  }
  /**
   * Decimals decided once from the control's own resolution (the step, or `span / SWEEP`):
   * 0 places on a 0 to 127 knob, 2 on a -1 to 1 attenuverter. Never per frame, or the
   * string wiggles; never a blanket zero, or attenuverters read only -1, 0 and 1.
   * why: lessons/kit-knob.md#dp
   */
  const dp = knobPlaces({ min, max, step: stp });

  const mk = (tag, cls, text) => {
    const n = document.createElementNS(
      tag === 'svg' || tag === 'circle' || tag === 'path'
        ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml', tag);
    if (cls) n.setAttribute('class', cls);
    if (text != null) n.textContent = text;
    return n;
  };

  let v = clamp(value === undefined ? min + span / 2 : value);
  const rest = home === undefined ? v : clamp(home);
  let from = '', hw = 0, hand = 0, selfMoves = 0;

  const root = mk('div', 'pos-knob');
  if (title) root.setAttribute('title', title);
  // A custom property, not a stroke written onto the paths, so the stylesheet can override it.
  // why: lessons/kit-knob.md#stroke-property
  if (stroke !== undefined) root.style.setProperty('--knob-stroke', String(stroke));
  // A local name though always `ARC`: the viewBox crop and the needle angle both read it.
  // why: lessons/kit-knob.md#sweep-deg
  const SWEEP_DEG = ARC;
  let off = !!disabled;

  /**
   * SVG rather than a `conic-gradient`, for the gap at the bottom: `stroke-dasharray` on an arc
   * path is one number, where a gradient needs a second shape that agrees on a radius.
   * why: lessons/kit-knob.md#svg-dial
   */
  const svg = mk('svg', 'pos-knob-dial');
  /**
   * The viewBox is cropped to what is drawn and computed from the sweep, never typed.
   * The element's height follows its width through the viewBox ratio (`height: auto`).
   * why: lessons/kit-knob.md#viewbox
   */
  const half = (SWEEP_DEG / 2) * Math.PI / 180;
  const R = 38, PAD = 9;
  const xOut = SWEEP_DEG >= 180 ? R : R * Math.sin(half);
  const yTop = 50 - R;
  const yBot = SWEEP_DEG >= 180 ? 50 + R : 50 - R * Math.cos(half);
  const vb = [
    (50 - xOut - PAD).toFixed(2), (yTop - PAD).toFixed(2),
    (2 * (xOut + PAD)).toFixed(2), (yBot - yTop + 2 * PAD).toFixed(2),
  ].join(' ');
  svg.setAttribute('viewBox', vb);
  /**
   * Where the ring's lower edge is, as a fraction of the drawing, because the hand button sits
   * on it. Derived from the sweep: at 270 degrees, y 88 of a box spanning 3 to 97, 0.904.
   * why: lessons/kit-knob.md#ring-edge
   */
  const vbW = 2 * (xOut + PAD), vbH = yBot - yTop + 2 * PAD;
  root.style.setProperty('--knob-dial-r', (vbH / vbW).toFixed(4));
  /**
   * The arc's real lowest ink, not the bounding box's `yBot`: a 270 degree arc ends at
   * `50 + R cos(135)`, 76.9 against 88. Using `yBot` put the button over the label.
   * why: lessons/kit-knob.md#inkbot
   */
  const inkBot = 50 - R * Math.cos(half);
  root.style.setProperty('--knob-ring-f', ((inkBot - (yTop - PAD)) / vbH).toFixed(4));
  const track = mk('path', 'pos-knob-track');
  const arc = mk('path', 'pos-knob-arc');
  const pointer = mk('path', 'pos-knob-ptr');
  const d = arcPath(50, 50, 38, -SWEEP_DEG / 2, SWEEP_DEG / 2);
  track.setAttribute('d', d);
  arc.setAttribute('d', d);
  svg.append(track, arc, pointer);

  // The dial takes focus, not a wrapper, so the ring marks the control and not the column.
  // why: lessons/kit-knob.md#focus
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('role', 'slider');
  svg.setAttribute('aria-label', label);
  svg.setAttribute('aria-valuemin', String(min));
  svg.setAttribute('aria-valuemax', String(max));

  const num = mk('div', 'pos-knob-v');
  const lab = mk('div', 'pos-knob-lab', label);
  root.append(num, svg, lab);
  /**
   * The two ends of the travel, printed in the dial's own gap: `ends: true` prints min and max,
   * a pair such as `['-', '+']` prints panel marks. Not a new row, which would change
   * `--ctl-foot` for every knob on the site.
   * why: lessons/kit-knob.md#ends
   */
  if (ends) {
    const [lo, hi] = ends === true
      ? [String(min), String(max)]
      : [String(ends[0] ?? min), String(ends[1] ?? max)];
    const row = mk('div', 'pos-knob-ends');
    row.append(mk('span', 'pos-knob-end', lo), mk('span', 'pos-knob-end', hi));
    root.insertBefore(row, lab);
  }
  if (sub) root.append(mk('div', 'pos-knob-sub', sub));

  /** The ends only, with no snap, so a drag can keep what the snap ate. */
  function hold(n) { return Math.min(max, Math.max(min, Number(n))); }

  /**
   * Inside the ends and on a whole step. `hold` is the half without the snap, for the drag.
   * why: lessons/kit-knob.md#clamp
   */
  function clamp(n) { return snapTo(n, { min, max, step: stp }); }

  /**
   * What the number reads, at a fixed number of places.
   * `-0.00` is written as `0.00`, or an attenuverter at zero flickers a minus sign.
   * why: lessons/kit-knob.md#show
   */
  function show(n) {
    /**
     * A knob whose value has a name prints the caller's `format(n)`, with no `unit` appended.
     * The naming lives with the caller because it is a fact about an instrument.
     * why: lessons/kit-knob.md#format
     */
    if (format) return String(format(n));
    let t = n.toFixed(dp);
    if (t === `-${(0).toFixed(dp)}`) t = (0).toFixed(dp);
    return unit ? `${t} ${unit}` : t;
  }

  /**
   * The number's box reserves the widest thing this knob can print, so `9` becoming `10` does
   * not slide it. A custom property, never `style.minWidth`; `ch` is exact on a monospaced face.
   * why: lessons/kit-knob.md#widest
   */
  /**
   * A knob that prints names is sampled across its travel, because the longest name is often
   * in the middle: every step, or one sweep of points when continuous.
   * why: lessons/kit-knob.md#widest-names
   */
  const widestValue = () => {
    if (!format) return Math.max(...[min, max].map((n) => show(n).length));
    const n = stp > 0 ? Math.round(span / stp) : SWEEP;
    let w = 0;
    for (let i = 0; i <= n; i++) w = Math.max(w, show(min + (span * i) / n).length);
    return w;
  };
  root.style.setProperty('--knob-num-w', `${widestValue()}ch`);

  function paint(at = v) {
    const frac = (at - min) / span;
    const len = arc.getTotalLength ? arc.getTotalLength() : 0;
    if (len) {
      arc.style.strokeDasharray = String(len);
      arc.style.strokeDashoffset = String(len * (1 - frac));
    }
    const a = (-SWEEP_DEG / 2 + frac * SWEEP_DEG) * Math.PI / 180;
    /**
     * A short tick just inside the ring, r=24 to r=32 against a stroke starting near 36.
     * A long hand reads as escaping the track; the gap is what makes it read.
     * why: lessons/kit-knob.md#needle
     */
    const cx = 50 + Math.sin(a) * 24, cy = 50 - Math.cos(a) * 24;
    const ex = 50 + Math.sin(a) * 32, ey = 50 - Math.cos(a) * 32;
    pointer.setAttribute('d', `M ${cx.toFixed(2)} ${cy.toFixed(2)} L ${ex.toFixed(2)} ${ey.toFixed(2)}`);
    // `tabular-nums` is on the class, the unit hides when there is no number, and the places
    // are fixed (see `dp` and `show`).
    // why: lessons/kit-knob.md#paint-number
    num.textContent = show(at === v ? v : clamp(at));
    svg.setAttribute('aria-valuenow', String(Math.round(v)));
    if (from) root.setAttribute('data-from', from); else root.removeAttribute('data-from');
  }

  /**
   * @param {number} next
   * @param {object} [o]
   * @param {string} [o.from]   `'hardware'` or `'hand'`
   * @param {boolean} [o.quiet] do not call back, for echoing a value that came
   *                            from the thing that would be called
   */
  function set(next, { from: src = 'hand', quiet = false } = {}) {
    const was = v;
    v = clamp(Number(next));
    from = src;
    if (src === 'hardware') hw++; else if (src === 'hand') { hand++; userAt = now(); }
    stopGlide();
    paint();
    if (!quiet && v !== was) { onInput(v, src); onChange(v, src); }
    return v;
  }

  // ── a value from somewhere else: glide, mark, send nothing ──────────────
  // See `RECEIVE_GLIDE_MS` at the top of this file for the why.
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => setTimeout(() => fn(now()), 16);
  const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let userAt = -Infinity, glide = null, markTimer = null;
  const got = { n: 0, ignored: 0, last: null, from: '' };
  function stopGlide() { if (glide) { clearTimeout(glide.end); glide = null; } }
  // `force` is for a value the visitor ASKED for elsewhere on the page (a
  // patch they picked), which must land even if they touched this knob a
  // moment ago; it still waits for nothing and still sends nothing.
  function receive(next, { from: src = 'remote', glideMs = RECEIVE_GLIDE_MS, force = false } = {}) {
    const target = clamp(Number(next));
    if (!Number.isFinite(target)) return v;
    if (!force && (dragging || now() - userAt < RECEIVE_HOLD_MS)) { got.ignored++; return v; }
    // A forced value mid-drag ends the drag the way a lift does, or the pointer
    // stays captured and an auto-moving knob is never resumed.
    if (dragging) endDrag(dragId);
    got.n++; got.last = target; got.from = src;
    from = src;
    if (src === 'hardware') hw++;
    if (target === v && !glide) { paint(); return v; }
    // A glide already running starts again from where the DIAL is, not from
    // where it was going, so two values in a row never jump.
    const fromAt = glide ? glide.drawn : v;
    stopGlide();
    v = target;
    root.setAttribute('data-remote', src);
    clearTimeout(markTimer);
    markTimer = setTimeout(() => root.removeAttribute('data-remote'), RECEIVE_MARK_MS);
    const ms = still() ? 0 : glideMs;
    if (!(ms > 0)) { paint(); return v; }
    const g = { t0: now(), drawn: fromAt, end: null };
    glide = g;
    const step = () => {
      if (glide !== g) return;
      const k = Math.min(1, (now() - g.t0) / ms);
      g.drawn = fromAt + (v - fromAt) * easeOut(k);
      paint(g.drawn);
      if (k < 1) raf(step); else glide = null;
    };
    // A hidden tab runs no frames, so the end is also a timer and the dial always lands.
    // why: lessons/kit-knob.md#glide-end
    g.end = setTimeout(() => { if (glide === g) { glide = null; paint(); } }, ms + 50);
    raf(step);
    return v;
  }

  // ── the hand ──
  // `handApi` is declared here and filled further down, so no handler reads a `let` in its
  // dead zone during construction.
  // why: lessons/kit-knob.md#hand-api
  let handApi = null;
  let dragging = false, acc = 0, dragId = null;

  svg.addEventListener('pointerdown', (e) => {
    if (off) return;
    // Yield, not off: grabbing it is a motorised fader, and `hand-drive.mjs` resumes from here.
    // why: lessons/kit-knob.md#yield
    handApi?.yield();
    stopGlide();
    dragging = true;
    acc = 0;
    dragId = e.pointerId;
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  svg.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    // Up is more: `movementY` is positive downwards, so it is negated.
    // why: lessons/kit-knob.md#up-is-more
    const dy = -(e.movementY ?? 0);
    acc += dy * (e.shiftKey ? FINE : 1);
    const per = span / SWEEP;
    if (Math.abs(acc) < 0.001) return;
    /**
     * The accumulator is spent by what the value actually moved and keeps what the snap ate,
     * or a stepped knob never moves. With no step `want` equals `got` and `acc` lands on 0.
     * why: lessons/kit-knob.md#accumulator
     */
    const want = hold(v + acc * per);
    const got = set(want, { from: 'hand' });
    acc = (want - got) / per;
  });

  function endDrag(id) {
    dragging = false;
    userAt = now();
    try { svg.releasePointerCapture(id); } catch { /* already gone */ }
    // A lift resumes it at once. Only a `set()` with no lift has to wait out
    // `HAND_YIELD_MS`, which is the arrow-key case below.
    handApi?.resume();
  }
  const stop = (e) => { if (dragging) endDrag(e.pointerId); };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);

  // A double press goes home, using the platform's `dblclick` rather than a tap timer.
  // why: lessons/kit-knob.md#dblclick
  svg.addEventListener('dblclick', (e) => { e.preventDefault(); set(rest, { from: 'hand' }); });

  // `passive: false`, or `preventDefault` does nothing and the page scrolls (Chrome default).
  // why: lessons/kit-knob.md#wheel
  svg.addEventListener('wheel', (e) => {
    if (off) return;
    e.preventDefault();
    // A floor of one step, or the wheel is inert on a stepped knob; `Math.max(x, 0)` is the
    // identity on a continuous one.
    // why: lessons/kit-knob.md#wheel-floor
    const amount = Math.max((span / SWEEP) * (e.shiftKey ? FINE : 1) * 6, stp);
    handApi?.yield();
    set(v - Math.sign(e.deltaY) * amount, { from: 'hand' });
  }, { passive: false });

  svg.addEventListener('keydown', (e) => {
    if (off) return;
    const fine = e.shiftKey ? FINE : 1;
    // One step is the whole unit on a stepped knob, and shift does not make it finer.
    // why: lessons/kit-knob.md#key-step
    const one = stp || Math.max(span / 127, span / SWEEP) * fine;
    const go = { ArrowUp: one, ArrowRight: one, ArrowDown: -one, ArrowLeft: -one,
                 PageUp: one * 10, PageDown: -one * 10,
                 Home: min - v, End: max - v }[e.key];
    if (go === undefined) return;
    e.preventDefault();
    // No lift on a key press, so this waits out `HAND_YIELD_MS` rather than resuming at once.
    // why: lessons/kit-knob.md#key-yield
    handApi?.yield();
    set(v + go, { from: 'hand' });
  });

  // ── the invisible hand ──
  // Everything but the step count, the share-to-value map and the barred sentence comes
  // from `hand-drive.mjs`.
  // why: lessons/kit-knob.md#invisible-hand
  if (wantHand) {
    const opt = (wantHand && typeof wantHand === 'object') ? wantHand : {};
    /**
     * Steps are the drag resolution, `SWEEP`, not the range, so a 0..1 knob is as fine as 0..127;
     * unless it has real steps, which `hand-drive.mjs` may then rightly refuse a hand for.
     * why: lessons/kit-knob.md#hand-steps
     */
    const steps = stp ? Math.max(1, Math.round(span / stp)) : SWEEP;
    const handBtn = mk('button', 'pos-knob-hand');
    handBtn.setAttribute('type', 'button');
    // The button is not the dial: a press on it must not start a drag underneath.
    // why: lessons/kit-knob.md#hand-button
    for (const ev of ['pointerdown', 'pointerup', 'wheel', 'dblclick'])
      handBtn.addEventListener(ev, (e) => e.stopPropagation());
    root.append(handBtn);
    handApi = createHandDrive({
      btn: handBtn,
      row: root,
      at: () => (v - min) / span,
      /**
       * It does not call `set()`, which keeps `set()` meaning somebody else moved this.
       * Emits `onInput` like a drag, with `from: 'self'`.
       * why: lessons/kit-knob.md#hand-move
       */
      move: (share) => {
        const nv = clamp(min + share * span);
        if (nv === v) return;
        v = nv; from = SELF; selfMoves++;
        // The invisible hand holds a received value off exactly as a person
        // does, so an instrument echoing what the hand just sent cannot pull
        // the dial back under it.
        userAt = now();
        stopGlide();
        paint();
        onInput(v, SELF);
      },
      rest: () => onChange(v, SELF),
      steps,
      preset: opt.preset,
      onHand: opt.onHand,
      barredSays: 'a knob in a control row may not have an invisible hand: the suite presses '
        + 'every button in that row on every run, and this one would start sending',
    });
  }

  /** See the note on `pad.mjs`'s `enable`: a disabled control costs the checks
   *  behind it, and is still the right answer when the control cannot do its job. */
  function enable(yes, why = '') {
    off = !yes;
    if (off) { root.setAttribute('data-off', '1'); svg.removeAttribute('tabindex'); }
    else { root.removeAttribute('data-off'); svg.setAttribute('tabindex', '0'); }
    if (why) root.setAttribute('title', why);
    // A control that cannot be dragged cannot be driven by a hand either, and a
    // hand still running on a disabled knob is the page arguing with its own
    // greyed-out control. Same rule `slider.mjs` states for its own disable.
    handApi?.setEnabled(!off);
    if (off) handApi?.stop('disabled');
    return !off;
  }
  enable(!off, title);

  paint();
  // The arc length is only knowable once the path is in a document, so the
  // first paint above draws no fill. This one runs when it can.
  queueMicrotask(paint);

  return {
    el: root,
    set,
    /** A value from somewhere else: glides, marks, never calls back. */
    receive,
    /** How many values were received and drawn, how many were held off by a
     *  person's hand, the last one and where it came from. */
    received: () => ({ ...got, gliding: !!glide }),
    value: () => v,
    /** '' until something has moved it, then 'hand', 'hardware' or 'self'. */
    source: () => from,
    // Counters, so whether a binding is live is answerable after the fact.
    // why: lessons/kit-knob.md#counters
    hardwareMoves: () => hw,
    /** how many times A PERSON moved it. See the note on `SELF` above. */
    handMoves: () => hand,
    /** how many times the INVISIBLE hand moved it, which is nobody moving it. */
    selfMoves: () => selfMoves,
    /** the invisible hand, or `null` on a knob that was not given one. */
    hand: handApi,
    repaint: paint,
    enable,
    disabled: () => off,
  };
}

/** An SVG arc path, degrees clockwise from twelve o'clock. */
function arcPath(cx, cy, r, a0, a1) {
  const p = (deg) => {
    const a = deg * Math.PI / 180;
    return [cx + Math.sin(a) * r, cy - Math.cos(a) * r];
  };
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/**
 * Several knobs in a row, compared across. It scrolls sideways rather than shrinking, and the
 * scroller needs `min-width: 0`, or the page overflowed by 141 px at 390 px.
 * @param {number[]} [o.split]  indices to draw a hairline before: one row with a grouping,
 *   not two banks.
 * why: lessons/kit-knob.md#knob-bank
 */
export function createKnobBank(knobs = [], { label = '', split = [] } = {}) {
  if (!knobs.length) throw new Error('a knob bank with no knobs is an empty box painting its own edges');
  const wrap = document.createElement('div');
  wrap.className = 'pos-knob-bank';
  if (label) {
    const l = document.createElement('div');
    l.className = 'pos-knob-banklab';
    l.textContent = label;
    wrap.append(l);
  }
  const row = document.createElement('div');
  row.className = 'pos-knob-row';
  const cuts = new Set(split.filter((i) => i > 0 && i < knobs.length));
  knobs.forEach((k, i) => {
    if (cuts.has(i)) {
      const d = document.createElement('div');
      d.className = 'pos-knob-div';
      // A hairline is furniture, hidden from a screen reader rather than read as an empty group.
      // why: lessons/kit-knob.md#divider
      d.setAttribute('aria-hidden', 'true');
      row.append(d);
    }
    row.append(k.el);
  });
  wrap.append(row);
  return {
    el: wrap,
    knobs,
    /** where the hairlines are, so a check can grade the grouping */
    splits: () => [...cuts],
    /** How many have ever been moved by hardware, which is what "is it bound" means. */
    bound: () => knobs.filter((k) => k.hardwareMoves() > 0).length,
    repaint: () => knobs.forEach((k) => k.repaint()),
  };
}
