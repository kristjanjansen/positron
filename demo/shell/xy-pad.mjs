// demo/shell/xy-pad.mjs — one surface you move a point across, and the record
// of how you moved it.
//
// A movement — a finger on a pad, a knob, a fader — produces hundreds of
// samples a second. Something decides what to write down, something else
// decides what to draw between the things written down, and a third thing puts
// a playhead back in the middle of it and asks "where was the hand at 4.212 s?".
// This file is the FIRST of those three and nothing else: it captures at full
// rate, it hands every sample straight to the caller, and it draws what it
// captured. What gets written down is the caller's decision; so is what gets
// invented between two of them.
//
// ⚠️ THE REUSABILITY TEST, and it is the one that matters: a sync control is an
// XY pad whose x is offset in milliseconds and whose y is rate. Nothing below
// takes a per-caller flag to be that — the axes carry their own units and their
// own direction, and a caller that wants rate to grow UPWARD names the larger
// value first (`y: { min: 2, max: 0.5 }`). An axis is a mapping from an edge of
// the pad to a number; `min` is the value at the near edge (left, and TOP —
// screen order, which is the order a pointer event arrives in) and `max` the
// value at the far one. Reversed is not a special case, it is the same two
// numbers the other way round.
//
// THREE RULES IT CARRIES, all of them already paid for elsewhere:
//
//  1. THE LIVE PATH IS FULL RATE AND LOCAL. `onInput` is called for every
//     coalesced sample, synchronously, before anything else — a knob must not
//     travel to a relay and back before it moves anything. Throttling decides
//     what enters a LOG, never what the actuator hears, so there is no throttle
//     in this file at all.
//  2. CAPTURE AND EVIDENCE ARE TWO APPEND-ONLY BUFFERS, NEVER ONE. This one
//     owns the capture and never touches it again: `trace()` hands back the
//     live array and `clear()` starts a FRESH one rather than emptying it, so a
//     snapshot somebody is holding stays valid. demo10's sampler decimated by
//     doing `realTimePoints.length = 0` and so consumed the ground truth of the
//     comparison it existed to make.
//  3. WHAT IT DRAWS IS WHAT WAS RECORDED, not what it was asked to show. The
//     white line is the capture. A second reading of the same gesture — a
//     reconstruction, a sparse record, anything derived — is the caller's, and
//     goes through `overlay`, on top, in its own colour.
//
// STYLING. Five rules, prepended to <head> so shell.css and any page's own
// <style> both override them on source order. They want hoisting into
// shell.css, and are not there yet on purpose: that file was being edited by
// two other hands when this landed and a component that only looks right next
// to one page's stylesheet is the `choice.mjs` bug in a new costume.

import { el } from './shell.mjs';

/** The pad's own pixel grid. A caller whose values ARE pixels on this surface
 *  (a drawing pad) declares its axes against these, and the projection below is
 *  then the identity — which is the point: one geometry, named once. */
export const PAD = { w: 960, h: 520 };

// Fixed, not devicePixelRatio. The backing store is twice the grid on every
// machine, so the ink a page counts off this canvas is the same number in a
// headless run and on a retina laptop — a measurement that moves with the
// display is not a measurement.
const SCALE = 2;

const CSS_ID = 'pos-xy-pad-css';
function ensureCss() {
  if (document.getElementById(CSS_ID)) return;
  const s = el('style', '', `
.xy-pad { display: block; width: 100%; background: var(--card);
          border: 1px solid var(--line); border-radius: 4px;
          cursor: crosshair; touch-action: none;
          -webkit-user-select: none; user-select: none;
          -webkit-touch-callout: none; }
`);
  s.id = CSS_ID;
  document.head.prepend(s);
}

const axis = (a, fb) => ({
  label: (a && a.label) || fb,
  min: a && Number.isFinite(a.min) ? a.min : 0,
  max: a && Number.isFinite(a.max) ? a.max : 1,
  unit: (a && a.unit) || '',
});

/** enough decimals to tell two ends of THIS axis apart, and no more */
function fmtFor(a) {
  const span = Math.abs(a.max - a.min);
  const dp = span >= 100 ? 0 : span >= 10 ? 1 : span >= 1 ? 2 : 3;
  return (v) => (Number.isFinite(v) ? v.toFixed(dp) : '–');
}

/**
 * @param host        where the canvas goes
 * @param o.label     what the pad is FOR, in words
 * @param o.x         {label, min, max, unit} — left edge to right edge
 * @param o.y         {label, min, max, unit} — TOP edge to bottom edge
 * @param o.onStart   (x, y, ev) a gesture began; the trace is empty again
 * @param o.onInput   (x, y, ev) EVERY sample, full rate, local — never throttled
 * @param o.onDone    (trace)    the gesture ended
 * @param o.value     () => ({x, y}) | null — where something ELSE says the point
 *                    is (a playhead, a remote peer). Drawn as the mark.
 * @param o.overlay   (ctx, view) — a second reading of the same gesture, drawn
 *                    over the capture. `view` = {W, H, px(x,y), colors, axes}.
 */
export function createXyPad(host, {
  label = '', x, y, onStart, onInput, onDone, value, overlay, gesture = true,
} = {}) {
  ensureCss();
  const ax = axis(x, 'x'), ay = axis(y, 'y');
  const fx = fmtFor(ax), fy = fmtFor(ay);
  const W = PAD.w, H = PAD.h;

  const cv = el('canvas', 'xy-pad');
  cv.width = W * SCALE; cv.height = H * SCALE;
  cv.style.aspectRatio = `${W} / ${H}`;
  cv.setAttribute('aria-label', label || 'xy pad');
  // `data-gesture` is how `verify.mjs` knows to DRAG across an element rather
  // than click it — a surface whose only input is a drag was a subject the
  // suite could not reach at all. It belongs to the component, so every pad
  // ever mounted is drivable without a page remembering to say so.
  if (gesture) cv.setAttribute('data-gesture', label || 'xy');
  host.append(cv);
  const ctx = cv.getContext('2d');

  const css = getComputedStyle(document.documentElement);
  const tok = (n, fb) => (css.getPropertyValue(n) || '').trim() || fb;
  const C = {
    // 🔴 THE RECORDED LINE IS THE LOUDEST THING ON THE PAD. Everything else —
    // the grid, the axis names, the live numbers — is `--dim`, which also
    // leaves the capture as the ONLY near-white ink on the canvas, so a page
    // can count "is there a line here" off the pixels without counting its own
    // furniture.
    trace: tok('--fg', '#e6e6e6'),
    dim: tok('--dim', '#8b93a1'),
    card: tok('--card', '#11151d'),
    // the mark is the playhead's colour, the same one every demo uses
    mark: tok('--hi', '#ffd400'),
    grid: 'rgba(255,255,255,0.05)',
  };
  // ⚠️ `ctx.font` IS NOT CSS-VARIABLE-AWARE. A canvas font string is parsed with
  // no element behind it, so `var(--sans)` is invalid, the assignment is
  // silently IGNORED and the label comes out in the 10 px default — a styling
  // bug that throws nothing and logs nothing. Resolve the token here instead.
  const SANS = tok('--sans', 'sans-serif');
  const MONO = tok('--mono', 'monospace');

  // ── the capture ─────────────────────────────────────────────────────────
  // Append-only. Nothing in this file ever removes from it; `clear()` swaps in
  // a new array so a caller holding the old one still holds a whole gesture.
  let trace = [];
  let drawing = false;

  const spanX = ax.max - ax.min, spanY = ay.max - ay.min;
  /** value -> pad pixels */
  const px = (vx, vy) => [((vx - ax.min) / spanX) * W, ((vy - ay.min) / spanY) * H];
  /** a client point -> value, clamped to the axes (either order) */
  function valueAt(ev) {
    const r = cv.getBoundingClientRect();
    const u = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
    const v = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
    return { x: ax.min + u * spanX, y: ay.min + v * spanY };
  }

  // ⚠️ STAMP AT SOURCE. `event.timeStamp` is the browser's own clock for when
  // the input happened; `performance.now()` read in the handler is when we got
  // round to it, and the gap between them is not a constant anybody could
  // subtract back out later.
  function push(ev, p) {
    const s = { at: ev.timeStamp, x: p.x, y: p.y, pressure: ev.pressure || 0.5 };
    trace.push(s);
    return s;
  }

  cv.addEventListener('pointerdown', (ev) => {
    trace = [];                       // a NEW array, never a truncation
    drawing = true;
    // A synthetic pointer (the harness dispatches real pointer events through
    // CDP) can refuse capture; losing it costs nothing, since the pad is the
    // only thing being drawn on.
    try { cv.setPointerCapture(ev.pointerId); } catch { /* not capturable */ }
    const p = valueAt(ev);
    push(ev, p);
    onStart && onStart(p.x, p.y, ev);
    onInput && onInput(p.x, p.y, ev);
    repaint();
  });

  cv.addEventListener('pointermove', (ev) => {
    if (!drawing) return;
    // ⚠️ COALESCED. A browser hands one `pointermove` per frame and hides the
    // samples between; `getCoalescedEvents` is the difference between a record
    // of the INPUT and a record of the repaint.
    const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
    for (const e of evs) {
      const p = valueAt(e);
      push(e, p);
      // rule 1: every sample, in the handler, before anything is drawn
      onInput && onInput(p.x, p.y, e);
    }
    repaint();
  });

  for (const t of ['pointerup', 'pointercancel']) {
    cv.addEventListener(t, () => {
      if (!drawing) return;
      drawing = false;
      repaint();
      onDone && onDone(trace);
    });
  }

  // ── drawing ─────────────────────────────────────────────────────────────
  // One paint per animation frame however fast the samples arrive. The CAPTURE
  // is full rate (above); a repaint per coalesced sample would be three or four
  // pictures nobody sees per frame, and it is the picture that is expensive.
  let raf = 0;
  function repaint() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; paint(); });
  }

  const view = { W, H, px, colors: C, axes: { x: ax, y: ay } };

  function paint() {
    ctx.save();
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = C.card;
    ctx.fillRect(0, 0, W, H);

    // quarters, faint: enough to read the surface as two axes rather than a box
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 4; i++) {
      const gx = Math.round((i * W) / 4) + 0.5, gy = Math.round((i * H) / 4) + 0.5;
      ctx.moveTo(gx, 0); ctx.lineTo(gx, H);
      ctx.moveTo(0, gy); ctx.lineTo(W, gy);
    }
    ctx.stroke();

    furniture();

    // THE CAPTURE, and it is the loudest thing here.
    if (trace.length > 1) {
      ctx.strokeStyle = C.trace; ctx.lineWidth = 6;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      const [x0, y0] = px(trace[0].x, trace[0].y);
      ctx.moveTo(x0, y0);
      for (const p of trace) { const [a, b] = px(p.x, p.y); ctx.lineTo(a, b); }
      ctx.stroke();
    }

    // whatever the caller makes of the same gesture, over the top
    if (overlay) overlay(ctx, view);

    // and where something ELSE says the point is now
    const v = value && value();
    if (v && Number.isFinite(v.x) && Number.isFinite(v.y)) mark(v);

    ctx.restore();
  }

  const PAD_IN = 12;
  /** a unit joins its number with a space, in one place — `330px` reads as a
   *  token and `330 px` as a measurement */
  const u = (a) => (a.unit ? (a.unit.startsWith(' ') ? a.unit : ' ' + a.unit) : '');
  /**
   * 🔴 THE PAD DRAWS NO FURNITURE — asked for, and right. It carried its name,
   * the live pair, and both axes' ranges written down the edges, and on a page
   * whose whole subject is a LINE that is five pieces of text competing with
   * the one thing you came to look at. The numbers were already on the page:
   * `across`/`down` name the axes in the strip's own gutters and the readout
   * carries the measurements.
   *
   * ⚠️ THE LABELS ARE NOT DELETED, ONLY UNDRAWN. `label`, `x.label` and
   * `y.label` still reach `aria-label` and `data-gesture`, which is what a
   * screen reader and the harness read — a pad that is silent to a person who
   * cannot see it is a different and worse thing than an uncluttered one.
   */
  function furniture() {
    // nothing. See the note above; the axes speak through aria and the page.
  }

  /** The playhead's position on the pad — a filled dot inside a ring, so it
   *  reads over both the pale line and the bright one. */
  function mark(v) {
    const [mx, my] = px(v.x, v.y);
    ctx.fillStyle = C.mark;
    ctx.beginPath(); ctx.arc(mx, my, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.mark; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(mx, my, 10, 0, Math.PI * 2); ctx.stroke();
  }

  paint();

  return {
    el: cv,
    ctx,
    view,
    axes: { x: ax, y: ay },
    /** the capture: every sample of the current gesture, append-only. The live
     *  array — `clear()` replaces it rather than emptying it, so this stays a
     *  whole gesture for as long as you hold it. */
    trace: () => trace,
    drawing: () => drawing,
    /** value -> pad pixels, for anything drawing over the same surface */
    px,
    /** repaint NOW (a caller changed something the pad cannot see) */
    paint,
    /** repaint on the next frame */
    repaint,
    clear() { trace = []; paint(); },
    destroy() { if (raf) cancelAnimationFrame(raf); cv.remove(); },
  };
}
