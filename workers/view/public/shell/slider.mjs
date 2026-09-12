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
 * @returns {{el:HTMLElement, get:()=>number, set:(v:number, quiet?:boolean)=>number, disabled:(v:boolean)=>void}}
 */
export function createSlider({ label, min = 0, max = 1, step, value, unit = '',
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
  const name = el('span', 'sld-l', label || '');
  const lane = el('span', 'sld-lane', null, {
    // A real slider to anything that asks: a screen reader, and a keyboard.
    role: 'slider', tabindex: '0',
    'aria-label': label || 'value',
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
  wrap.append(name, lane, read);

  function paint() {
    const t = span ? (v - min) / span : 0;
    // Percentage of the TRAVEL, not of the lane: `calc` subtracts the handle's
    // own width so the two ends land flush. See the note at the top.
    knob.style.left = `calc(${(t * 100).toFixed(3)}% - ${(t * 100).toFixed(3)} * var(--sld-knob) / 100)`;
    read.textContent = `${v.toFixed(dp)}${unit ? ' ' + unit : ''}`;
    lane.setAttribute('aria-valuenow', String(v));
    lane.setAttribute('aria-valuetext', read.textContent);
  }

  function set(next, quiet = false) {
    const was = v;
    v = clamp(next);
    paint();
    if (!quiet && v !== was) { onInput?.(v); onChange?.(v); }
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
    disabled: (yes) => {
      if (yes) { lane.setAttribute('aria-disabled', 'true'); lane.removeAttribute('tabindex'); }
      else { lane.removeAttribute('aria-disabled'); lane.setAttribute('tabindex', '0'); }
    },
  };
}
