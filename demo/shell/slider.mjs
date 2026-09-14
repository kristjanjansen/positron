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
export function createSlider({ label, aria, min = 0, max = 1, step, value, unit = '',
                               digits, onInput, onChange } = {}) {
  const span = max - min;
  const stp = step ?? span / 100;
  const dp = digits ?? Math.max(0, Math.min(4, String(stp).split('.')[1]?.length ?? 0));
  let v = clamp(value ?? min);

  function clamp(x) {
    const snapped = Math.round((x - min) / stp) * stp + min;
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
  wrap.append(head, lane);

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
    const t = span ? (at - min) / span : 0;
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
    return min + (x / travel) * span;
  };

  let dragging = false;
  lane.addEventListener('pointerdown', (e) => {
    if (lane.hasAttribute('aria-disabled')) return;
    // A hand on the control outranks an animation of the last patch.
    endGlide(false);
    dragging = true;
    lane.setPointerCapture(e.pointerId);
    v = clamp(fromX(e.clientX)); paint(); onInput?.(v);
    e.preventDefault();
  });
  lane.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const was = v;
    v = clamp(fromX(e.clientX)); paint();
    if (v !== was) onInput?.(v);
  });
  const end = () => { if (!dragging) return; dragging = false; onChange?.(v); };
  lane.addEventListener('pointerup', end);
  lane.addEventListener('pointercancel', end);

  // ⚠️ A KEYBOARD PATH, and not only for accessibility: it is the one route a
  // harness can drive without synthesising pointer events.
  lane.addEventListener('keydown', (e) => {
    const big = span / 10;
    const d = { ArrowLeft: -stp, ArrowDown: -stp, ArrowRight: stp, ArrowUp: stp,
                PageDown: -big, PageUp: big }[e.key];
    if (d !== undefined) { set(v + d); e.preventDefault(); return; }
    if (e.key === 'Home') { set(min); e.preventDefault(); }
    if (e.key === 'End') { set(max); e.preventDefault(); }
  });

  paint();
  return {
    el: wrap,
    get: () => v,
    set,
    /**
     * Rename the control.
     *
     * 🔴 FOR A CONTROL WHOSE MEANING A PRESET DECIDES, NOT FOR DECORATION.
     * `/radio1965/`'s read-head slider drives `mscan` in one engine mode and
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
    },
  };
}
