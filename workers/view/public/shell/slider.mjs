// demo/shell/slider.mjs — a value you can drag, the same height as a button.
//
// ⚠️ IT MATCHES THE BUTTON, and that is the whole brief. Controls in this
// project sit in one flex row — `.pos-controls` — so anything that is not 34 px
// tall makes the row grow and pushes everything else off its baseline. The
// lane and the thing that moves along it are the SAME height as each other and
// as a button, with the same 4 px corner, so a row of buttons and sliders reads
// as one row of controls rather than as two kinds of thing.
//
// ⚠️ AND THE HANDLE SITS FLUSH IN THE CORNERS. It travels
// `laneWidth - handleWidth`, never the full width — so at the minimum its left
// edge is the lane's left edge and at the maximum its right edge is the lane's
// right edge. A handle centred on the value instead hangs half out of the lane
// at both ends, which reads as a bug in the layout and makes the extremes
// impossible to hit.
//
// 🔴 `verify.mjs` CANNOT DRAG THIS. It presses `.pos-controls button, .tbar-x`
// with `element.click()`, which fires `click` and nothing else — MEASURED, and
// the reason `demo/verify-quest.mjs` exists. So a page that ships a slider and
// asserts nothing about it has an ungraded control. `set()` is exported for
// exactly that: drive it from the page's own check and assert on the value that
// came out, not on the pixel that moved.

import { el } from './shell.mjs';
import { MOVES, MOVE_TURN, MOVE_GLYPH, MOVE_SAYS, MOVE_OFF,
  plan as planMove, positionAt, minSteps } from './hand.mjs';

/**
 * 🔴 A CEILING, BECAUSE A HAND LEFT ON IS A PAGE SENDING FOR AS LONG AS THE TAB
 * IS OPEN. `/knobs/` puts fifty messages a second on a relay and into a
 * Raspberry Pi in another building, so ten minutes is about thirty thousand
 * messages: long enough to demonstrate anything, short enough that walking away
 * from it costs nothing. `transport-bar.mjs` already says the general form of
 * this, that a live loop with no ceiling is a recording with no end.
 */
export const HAND_MAX_MS = 10 * 60 * 1000;

/**
 * How long the hand keeps its own hands off after somebody else moved the
 * handle.
 *
 * ⚠️ YIELD, NOT OFF. A motorised fader you can grab is the physical thing the
 * phrase "invisible hand" names, and nothing pressed the button, so the hand
 * picks the movement up again from wherever it was left. A pointer lifting
 * resumes it at once; a `set()` from the page or from an arrow key has no lift,
 * so it waits this long instead. Shorter and the arrow keys look broken,
 * because the value is dragged away between one press and the next.
 */
export const HAND_YIELD_MS = 1200;

/**
 * How long a glide takes. ONE number, because a knob and the sound it stands
 * for must not move at different speeds — a page that ramps its engine over a
 * quarter second while the knob snaps is two controls wearing one label.
 */
// 🔴 SLOW, AND SLOWER THAN FEELS RIGHT WHEN YOU WRITE IT. Asked for: "way
// slower and humanlike easing". 250 ms is the reflex-fast default every UI
// library ships and it reads as a SNAP with a blur on it — the knob is at the
// new value before the eye has found it, so what you perceive is a jump, and
// the animation has bought nothing. 900 ms is long enough to be FOLLOWED: the
// eye tracks the knob across the lane, which is the only thing a moving control
// can tell you that a jumping one cannot — WHERE IT CAME FROM.
//
// ⚠️ THIS IS A DRAWING, NOT THE VALUE. The number is committed immediately and
// everything downstream — the sound, the readout, `aria-valuenow` — already
// uses it; only the handle is still travelling. So a longer glide cannot make
// anything late, which is the property that makes 900 ms affordable at all.
// ⚠️ And `prefers-reduced-motion` skips it entirely, which matters more the
// longer it gets.
export const GLIDE_MS = 900;

const reducedMotion = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

/**
 * Call `onFrame(k)` with k running 0 -> 1 over `ms`, eased, and exactly once
 * at 1. Returns `stop(finish)`: `stop()` leaves the glide where it is,
 * `stop(true)` jumps it to the end.
 *
 * ⚠️ IT ALWAYS LANDS, and rAF alone cannot promise that. A background tab
 * stops animation frames, so an rAF-only glide can halt half way — which for a
 * knob is a cosmetic stall and for a sound is a granulator stuck between two
 * patches with nothing on screen saying so. A timer just past the end finishes
 * it; timers are throttled in a background tab but they do still fire.
 *
 * The shape is smoothstep: it leaves and arrives at rest, so the start and the
 * end of the move are the two places nothing jerks.
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
    // HUMANLIKE, WHICH IS NOT SYMMETRIC. Smoothstep (`t²(3−2t)`) leaves and
    // arrives at rest with the same shape at both ends, and over 900 ms that
    // reads as machinery: a hand does not accelerate as gently as it decelerates.
    // This is the standard ease-out-quint — off quickly, then a long settle —
    // which is what a thrown-then-caught object does and what every physical
    // control you have ever used does.
    onFrame(1 - Math.pow(1 - t, 5));
    if (t >= 1) { stop(); return; }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  timer = setTimeout(() => stop(true), ms + 60);
  return stop;
}

/**
 * Several sliders stacked, sharing one set of columns.
 *
 * 🔴 A STACK IS NOT FOUR SLIDERS IN A DIV, and `grains` proved it: it appended
 * them to `el('div', 'knobs')`, a class with **no CSS anywhere** — so they fell
 * into block layout, touching, and every lane started at a different x because
 * a wider label pushes its own lane right. `SPRAY` is two characters longer
 * than `RATE`, so two lanes were indented and two were not, on a control whose
 * entire job is comparing four values at a glance. That is the second class in
 * one day that a component emitted and no stylesheet matched.
 *
 * The columns are shared, which is the only thing that can align them: one
 * `max-content` column for the labels, one `1fr` for the lanes so they take the
 * width that is actually there, one `max-content` for the values. Each slider
 * becomes `display: contents` so its three parts land in those columns rather
 * than in a box of its own.
 */
/**
 * @param sliders
 * @param [opt.pair]  two sliders ACROSS on a wide screen rather than stacked.
 *   Side by side there is nothing to line up; stacked there is everything, so
 *   it falls back to the stacked three columns below the breakpoint and the
 *   shared-column argument still holds where it applies.
 */
export function createSliderGroup(sliders = [], { pair = false } = {}) {
  const wrap = el('div', `sld-group${pair ? ' pos-pair' : ''}`);
  for (const s of sliders) wrap.append(s.el ?? s);
  return { el: wrap, add: (s) => { wrap.append(s.el ?? s); return s; } };
}

/**
 * @param {object} o
 * @param {string} o.label     shown before the lane, uppercased by CSS
 * @param {number} o.min
 * @param {number} o.max
 * @param {number} [o.step]    rounding applied to every value, default (max-min)/100
 * @param {number} [o.value]   where it starts, default min
 * @param {string} [o.unit]    printed after the number: 'ms', 'Hz', '%'
 * @param {number} [o.digits]  decimal places, default inferred from step
 * @param {(v:number)=>void} [o.onInput]   every move — cheap things only
 * @param {(v:number)=>void} [o.onChange]  on release, and on a keyboard step
 * @returns {{el:HTMLElement, get:()=>number,
 *   set:(v:number, opt?:boolean|{quiet?:boolean, glideMs?:number})=>number,
 *   label:(text:string)=>void,
 *   disabled:(v:boolean)=>void}}
 */
/**
 * @param [o.warp] `'exp'` for a logarithmic lane. Default linear, unchanged.
 *
 * 🔴 WHY A LINEAR LANE HIDES THE INTERESTING HALF OF A RANGE, MEASURED.
 * `/radio/` granulates a radio station and every setting sounded like the
 * same wash. The upstream norns script this engine came from declares grain
 * rate `0.1-100 Hz EXPONENTIAL` and grain length `0.002-8 beats EXPONENTIAL`;
 * this page exposed `0.5-40` and `0.01-1` LINEAR. So the top of the engine was
 * unreachable, and worse, half the travel sat between 0.5 s and 1 s where
 * nothing audibly changes — while 2 ms to 50 ms, which is where a granulator
 * stops being a delay and starts being a texture, was squeezed into the first
 * two percent of the lane.
 *
 * A perceptual quantity wants a perceptual lane: each step of the hand is a
 * constant RATIO rather than a constant amount, which is how pitch, level and
 * time are actually heard.
 *
 * ⚠️ `min` MUST BE ABOVE ZERO — a ratio lane cannot reach zero, by construction.
 * It throws rather than quietly producing NaN for every position, because a
 * lane whose knob is at `NaN%` renders at the far left and looks like a slider
 * sitting at its minimum.
 */
/**
 * @param [o.hand]  `true` for an invisible hand on this slider: one button on
 *   the right of the lane that cycles the movement presets, off first. Pass an
 *   object to hand it a movement of its own: `{ preset }` is the same ten
 *   numbers `MOVES` holds, with no name.
 *
 * 🔴 THE WRAPPER EXISTS ONLY WHEN A HAND IS ASKED FOR, AND THAT IS NOT TIDINESS.
 * `/grains/` selects `.fade > .sld > .sld-lane` and `.fade > .sld > .sld-head`
 * with a CHILD combinator, so an unconditional wrapper would stop both matching
 * and take that slider's lane silently back to its standalone 96 px. A
 * component swap moves every selector that named the old one.
 *
 * 🔴 AND A SLIDER WITH A HAND MUST NOT LIVE IN `.pos-controls`. `verify.mjs`
 * presses `.pos-controls button` on every demo on every run, dozens of times a
 * day, and `/draw/` and `/grains/` both build their own `.pos-controls` and put
 * sliders in it. A hand button in one of those rows would start fifty messages
 * a second to shared hardware on every suite run. A page that turns a hand on
 * asserts `!d.el.querySelector('.pos-controls .sld-hand')`.
 *
 * @param [o.onHand]  called when the hand starts or stops, with
 *   `{ on, move, why, says, coarse }`, so the page can put a line in its log.
 *   A state change belongs in the log and nowhere else: it is the only channel
 *   that survives a screenshot taken a minute later.
 */
export function createSlider({ label, aria, min = 0, max = 1, step, value, unit = '',
                               digits, warp, onInput, onChange, hand = false, onHand } = {}) {
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
    // ⚠️ AN EXPONENTIAL LANE IS NOT SNAPPED TO A FIXED STEP. A step of 0.01
    // across 0.002-4 would make the bottom two thirds of the lane unreachable —
    // every value below 0.01 snapping to the same place. It rounds to the
    // slider's decimals instead, so resolution follows the value.
    const snapped = exp ? Number(x.toFixed(dp)) : Math.round((x - min) / stp) * stp + min;
    return Math.max(min, Math.min(max, Number(snapped.toFixed(6))));
  }

  const wrap = el('span', 'sld');
  const head = el('span', 'sld-head');
  const name = el('span', 'sld-l', label || '');
  const lane = el('span', 'sld-lane', null, {
    // A real slider to anything that asks: a screen reader, and a keyboard.
    role: 'slider', tabindex: '0',
    // ⚠️ `aria` FOR A SLIDER WITH NO VISIBLE LABEL. `grains`' blend sits
    // between two labelled ends — `this page` / `the board` — so a third word
    // between them is noise on screen and the only thing a screen reader has.
    // The two are different audiences with different needs, and collapsing them
    // means one of the two always loses.
    'aria-label': aria || label || 'value',
    'aria-valuemin': String(min), 'aria-valuemax': String(max),
  });
  const knob = el('span', 'sld-knob');
  const read = el('span', 'sld-v', '');
  // ⚠️ RESERVE THE WIDEST VALUE, DO NOT LET IT JUMP. `0.5` and `12.40` are
  // different widths, so the number moved — and worse, so did everything to the
  // right of it — on every drag, which makes a value you are trying to read
  // while listening impossible to read. The width is computed from the widest
  // string this slider can ever show rather than guessed at: both ends, at this
  // slider's own decimal places, plus the unit. `ch` is exact here because the
  // face is monospaced and the cell is `tabular-nums`.
  const widest = Math.max(...[min, max].map((v) => `${v.toFixed(dp)}${unit ? ' ' + unit : ''}`.length));
  read.style.minWidth = `${widest}ch`;
  lane.append(knob);
  // 🔴 THE NUMBER GOES UNDER ITS OWN LABEL, NOT ON THE FAR SIDE OF THE LANE.
  // Asked for, and it fixes a spacing complaint that was never about spacing.
  // A slider used to be THREE grid columns — label, lane, number — so a row of
  // two sliders was six evenly-spaced things and the eye could not tell where
  // one slider ended. Worse, the third column is as wide as the widest value
  // that slider can ever show, so the gap before the NEXT slider's label was a
  // different width on every row. PHOTOGRAPHED on /draw/: `SAMPLE EVERY` sat
  // tight against its lane while `100 ms` and `SMOOTHING` had a visibly larger
  // gap between them — the same `column-gap`, three different-looking spaces,
  // because one of the columns was sized by its content.
  //
  // Stacked, a slider is TWO columns and the label column is as wide as the
  // wider of its two lines. The number is beside the word it belongs to, which
  // is this project's rule for every other figure it prints (a lane's numbers
  // go in that lane's gutter, never in a table somewhere else).
  head.append(name, read);
  /**
   * The hand's button, and the row that joins it to the lane.
   *
   * ⚠️ IT BORROWS THE LOOP PAIR'S LOOK AND WRITES NO CSS ABOUT JOINING.
   * `.pos-seg` is the six declarations that make two controls read as one
   * object, lifted out of `.tbar-loopgrp`, `.step` and `.pos-pick-cell`, which
   * had each written them separately.
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
   * @param [at] the position to draw, default the real value.
   * ⚠️ `aria-*` ALWAYS CARRIES `v`, NEVER `at`. A glide is a drawing; a screen
   * reader that was read eight intermediate numbers on a patch change would be
   * told about an animation nobody asked it to narrate, and the last one it
   * heard would be whatever frame it caught.
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
   * 🔴 `set()` IS A PERSON OR A PAGE, AND THE HAND IS NEITHER. There are three
   * ways a person can move a slider and all three have to interrupt an
   * invisible hand: a pointer on the lane, an arrow key, and the page calling
   * `set()` itself (a patch landing, or `/knobs/`'s stop bringing both handles
   * home). The keyboard goes through `set()` and so does the page, so ONE rule
   * covers all three and cannot be forgotten for one of them: the hand writes
   * through a private paint-and-emit path that shares `clamp()`, and every call
   * to the public `set()` yields it.
   *
   * ⚠️ Assigned below rather than declared there, because `set` is defined
   * above the hand and the hand needs `clamp`, `paint` and `endGlide`.
   */
  let handYield = null, handPickUp = null;

  /**
   * @param next
   * @param [opt]  `true` for the old quiet flag, or `{ quiet, glideMs }`.
   *
   * 🔴 THE VALUE LANDS AT ONCE, ONLY THE DRAWING GLIDES. `get()` answers with
   * the new number on the line after the call and the callbacks fire once, on
   * the same tick they always did — so a glide can never make a harness read a
   * stale value, and `verify.mjs`, which stops collecting 400 ms after the last
   * assert, never has to wait for one. What moves over `glideMs` is the handle
   * and the number under it: a patch that changes four settings shows four
   * handles travelling instead of redrawing the panel as if nothing happened.
   *
   * ⚠️ `quiet` still means exactly what it meant — no `onInput`, no `onChange`.
   * The glide is a separate opt-in, so every existing caller is unchanged.
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
      // ⚠️ PAINT ONCE BEFORE THE GLIDE, AND THIS IS NOT COSMETIC. `glide()`
      // makes its first call inside an animation frame, so without this the
      // `aria-*` attributes carry the OLD value for one frame — MEASURED: a
      // probe reading `aria-valuenow` on the line after `set()` got the
      // previous patch's number, which is exactly the stale read this file's
      // header promises a harness will never see. `shown` is where the handle
      // already is, so this moves nothing.
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
    // ⚠️ A POINTER THE BROWSER NEVER SAW CANNOT BE CAPTURED, AND THE THROW TOOK
    // THE WHOLE DRAG WITH IT. `setPointerCapture` raises `NotFoundError` for an
    // id that is not an active pointer, which is every synthetic `PointerEvent`
    // a page dispatches at itself, and the exception escapes before the value
    // is read or `onInput` fires. So a check that drives a real pointer path
    // measured a control that had done nothing, which is the shape of failure
    // this project keeps paying for. Capture is an improvement on a drag that
    // leaves the lane, not a requirement of one.
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
  // ⚠️ THE LIFT RESUMES THE HAND, it does not turn it on. `handPickUp` does
  // nothing at all unless the button says the hand is running, which is what
  // makes "yield, not off" a promise rather than a surprise.
  const end = () => { if (!dragging) return; dragging = false; onChange?.(v); handPickUp?.(); };
  lane.addEventListener('pointerup', end);
  lane.addEventListener('pointercancel', end);

  // ⚠️ A KEYBOARD PATH, and not only for accessibility: it is the one route a
  // harness can drive without synthesising pointer events.
  lane.addEventListener('keydown', (e) => {
    // ⚠️ ON AN EXPONENTIAL LANE THE KEYS MOVE BY POSITION, NOT BY VALUE. A fixed
    // `+0.01` is a huge jump at the bottom of 0.002-4 and invisible at the top;
    // one percent of the LANE is the same gesture everywhere, which is the whole
    // reason the lane is warped.
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

  // ── the invisible hand ────────────────────────────────────────────────────
  //
  // What a movement IS lives in `hand.mjs` and is graded with no browser at all
  // by `node demo/shell/hand-test.mjs`. What lives here is the button, the
  // frame loop and the hand-over, which is the same split `looper.mjs` uses.
  let handApi = null;
  if (hand) {
    const opt = (hand && typeof hand === 'object') ? hand : {};
    const nameOf = (i) => MOVES[MOVE_TURN[i]][0];
    const presetOf = (i) => opt.preset || MOVES[MOVE_TURN[i]][1];
    // -1 is off, and it opens there on every page and forever: the button is a
    // press, and nothing this page can do turns it on by itself.
    let idx = -1;
    let raf = 0, pl = null, t0 = 0, startedAt = 0, seed = ((Math.random() * 1e9) | 0) || 1;
    let yielded = false, yieldTimer = 0;

    /**
     * 🔴 A SLIDER TOO COARSE TO SHOW A HAND SAYS SO RATHER THAN DRAWING A
     * STAIRCASE. The ends of a sweep wander by `endJit` of the travel, so on a
     * lane of N steps that wander is `endJit * N` steps, and under one step it
     * rounds away and every lap turns at the same number. MEASURED at 8 steps:
     * the metric cannot find a single reach to measure while the ends still read
     * as varied, which is a page looking right and moving like a machine.
     * ⚠️ AN EXPONENTIAL LANE IS COUNTED BY ITS KEYBOARD STEP, which is one per
     * cent of the lane, because a ratio lane has no fixed step to count.
     */
    const steps = exp ? 100 : Math.max(1, Math.round(span / stp));
    const need = minSteps(presetOf(0));
    const coarse = steps < need
      ? `this lane has ${steps} steps and an invisible hand needs about ${need}: `
        + 'the wander at each end would be less than one step, so it would draw a staircase'
      : null;

    const nextSeed = () => { seed = ((seed * 1664525 + 1013904223) >>> 0) || 1; return seed; };

    function face() {
      const on = idx >= 0;
      handRow.dataset.hand = on ? 'on' : 'off';
      if (yielded) handRow.dataset.held = '1'; else delete handRow.dataset.held;
      const says = on ? MOVE_SAYS[nameOf(idx)] : MOVE_OFF;
      handBtn.textContent = MOVE_GLYPH[nameOf(on ? idx : 0)];
      handBtn.title = says;
      handBtn.setAttribute('aria-label', says);
      handBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      handBtn.dataset.on = on ? '1' : '0';
    }

    /**
     * ⚠️ THE VALUE IS A FUNCTION OF THE CLOCK, NEVER AN ACCUMULATION PER FRAME,
     * so a dropped frame costs a skipped sample and never a drifted phase.
     * ⚠️ AND IT NEVER CALLS `set()`. It shares `clamp()` and `paint()` and emits
     * `onInput` exactly as a pointer move does, which is what makes `set()`
     * mean "somebody else is moving this" with no exceptions.
     */
    const frame = () => {
      raf = 0;
      if (idx < 0 || yielded) return;
      const now = performance.now();
      if (now - startedAt >= HAND_MAX_MS) { stop('ceiling'); return; }
      let t = now - t0;
      // The plan is regenerated when it runs out and the seed advances, so a
      // hand left on for ten minutes does not repeat itself.
      if (t >= pl.totalMs) { pl = planMove(presetOf(idx), { seed: nextSeed(), from: toT(v) }); t0 = now; t = 0; }
      const nv = clamp(fromT(positionAt(pl, t)));
      if (nv !== v) { v = nv; paint(); onInput?.(v); }
      raf = requestAnimationFrame(frame);
    };

    function start(i, why = 'press') {
      // The refusal below is on `start` rather than only on the button, because
      // a page can reach `hand.start()` directly and a check certainly will.
      if (barred) return;
      idx = i;
      endGlide(false);
      pl = planMove(presetOf(idx), { seed: nextSeed(), from: toT(v) });
      t0 = startedAt = performance.now();
      yielded = false; clearTimeout(yieldTimer); yieldTimer = 0;
      if (!raf) raf = requestAnimationFrame(frame);
      face();
      onHand?.({ on: true, move: nameOf(idx), why, says: MOVE_SAYS[nameOf(idx)], coarse });
    }

    function stop(why = 'press') {
      if (idx < 0) return;
      const was = nameOf(idx);
      idx = -1; yielded = false;
      cancelAnimationFrame(raf); raf = 0;
      clearTimeout(yieldTimer); yieldTimer = 0;
      face();
      // ⚠️ THE LAST VALUE OF A GESTURE IS THE ONE THAT HAS TO LAND. A send gate
      // holds back a move that is not due yet, so a hand that stopped without an
      // endpoint could leave a filter at the second to last position for ever.
      // This is what `onChange` on a pointer lift is for, and a hand stopping is
      // the same event.
      onChange?.(v);
      onHand?.({ on: false, move: was, why, says: MOVE_OFF, coarse });
    }

    handYield = () => {
      if (idx < 0) return;
      yielded = true;
      cancelAnimationFrame(raf); raf = 0;
      clearTimeout(yieldTimer);
      yieldTimer = setTimeout(() => handPickUp(), HAND_YIELD_MS);
      face();
    };
    handPickUp = () => {
      if (idx < 0 || !yielded) return;
      clearTimeout(yieldTimer); yieldTimer = 0;
      yielded = false;
      endGlide(false);
      // It picks the movement up from wherever the handle was left, which is
      // what makes it a fader you can grab rather than one that argues with you.
      pl = planMove(presetOf(idx), { seed: nextSeed(), from: toT(v) });
      t0 = performance.now();
      if (!raf) raf = requestAnimationFrame(frame);
      face();
    };

    /**
     * 🔴 IT REFUSES TO RUN FROM INSIDE A CONTROL ROW, AND THAT IS NOT
     * THEORETICAL. `verify.mjs` presses `.pos-controls button` on every demo on
     * every run, dozens of times a day, and TWO pages build their own
     * `.pos-controls` and put sliders in it: `/draw/` appends a two-slider group
     * to one, and `/grains/` puts its fade and its brightness in two of them.
     * Neither has a hand today and both are one `hand: true` away from a suite
     * run starting fifty messages a second to a shared Raspberry Pi.
     *
     * ⚠️ A COMMENT IN THIS FILE AND AN ASSERT ON THE PAGE THAT TURNED IT ON
     * PROTECT NEITHER OF THOSE PAGES, because the mistake would be made on a
     * page that has no such assert. So the component answers for itself: the
     * button is disabled, it says why on its own face, and the page gets a line
     * for its log. It fails in the log rather than on the board.
     * ⚠️ AND IT IS READ ONE FRAME LATE, because a slider is built before it is
     * appended to anything: asking at construction time asks about an element
     * with no parent, which always answers no.
     */
    let barred = null;
    requestAnimationFrame(() => {
      if (!handBtn.closest('.pos-controls')) return;
      barred = 'a slider in a control row may not have an invisible hand: the suite presses '
        + 'every button in that row on every run, and this one would start sending';
      stop('in-controls');
      handBtn.disabled = true;
      handBtn.title = barred;
      handBtn.setAttribute('aria-label', barred);
      onHand?.({ on: false, move: null, why: 'in-controls', says: barred, coarse });
    });

    const press = () => {
      const at = idx < 0 ? 0 : idx + 1;
      if (at >= MOVE_TURN.length) stop('press'); else start(at, 'press');
    };
    handBtn.addEventListener('click', press);

    // 🔴 OFF WHEN THE TAB IS HIDDEN. A forgotten tab on a second monitor sending
    // fifty messages a second to shared hardware is the `/tapes/` and
    // `/videoradio/` failure in a new costume.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop('hidden');
    });

    face();
    handApi = {
      el: handBtn,
      press,
      start: (i = 0, why = 'page') => start(i, why),
      stop: (why = 'page') => stop(why),
      yield: () => handYield(),
      resume: () => handPickUp(),
      get running() { return idx >= 0; },
      get held() { return yielded; },
      get move() { return idx < 0 ? null : nameOf(idx); },
      get says() { return idx < 0 ? MOVE_OFF : MOVE_SAYS[nameOf(idx)]; },
      get plan() { return pl; },
      /** how long it has left before the ceiling stops it, in ms */
      get leftMs() { return idx < 0 ? 0 : Math.max(0, HAND_MAX_MS - (performance.now() - startedAt)); },
      coarse,
      steps,
    };
    if (coarse) onHand?.({ on: false, move: null, why: 'coarse', says: coarse, coarse });
  }

  paint();
  return {
    el: wrap,
    /** the invisible hand, or `null` on a slider that was not given one */
    hand: handApi,
    get: () => v,
    set,
    /**
     * Re-scale this slider in place.
     *
     * 🔴 A CONTROL WHOSE MEANING CHANGES NEEDS ITS UNITS TO CHANGE WITH IT, and
     * without this the page could only relabel the word. `/radio/`'s read
     * head is a PLACE in one mode, a SPEED in another and a LAG in a third —
     * `Engine_Pappus.sc:719` selects between them — so one 0..1 lane showed
     * `0.30` for what was actually **-0.10x**, a number that is not wrong so
     * much as meaningless. Relabelling alone would have left the units lying.
     *
     * ⚠️ The VALUE is re-derived by the caller, not converted here: only the
     * caller knows what the old number meant.
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
     * Rename the control.
     *
     * 🔴 FOR A CONTROL WHOSE MEANING A PRESET DECIDES, NOT FOR DECORATION.
     * `/radio/`'s read-head slider drives `mscan` in one engine mode and
     * `mdelay` in another, and in a third `mscan` is a SPEED rather than a
     * place — so one fixed word is wrong for two of the three, which is this
     * project's named hazard: a control that looks like it does one thing and
     * does another. The page had a comment saying exactly that and no way to
     * act on it.
     *
     * ⚠️ IT CHANGES AT HUMAN PACE OR NOT AT ALL. A label that rewrites itself
     * on a clock is the caption that reflowed under `grain-scope` (CLAUDE.md);
     * this one moves when somebody chooses a preset, which is a thing that
     * happened rather than a thing that ticks.
     *
     * ⚠️ AND IT CAN CHANGE THE LABEL COLUMN'S WIDTH. `.sld-group` sizes that
     * column from its widest label, and a page sharing one column across two
     * groups measures it itself — so a caller that renames must re-measure, or
     * every lane on the page shifts sideways on a preset press. The `aria`
     * label is left alone: it was given for a reason when it differs.
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
