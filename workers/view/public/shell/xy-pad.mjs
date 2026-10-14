// demo/shell/xy-pad.mjs: one surface you move a point across, and the record of it.
// It captures at full rate, hands every sample to `onInput` unthrottled, and draws only what
// it captured (a derived reading goes through `overlay`). `clear()` starts a fresh trace array
// so a held snapshot stays valid. An axis `min` is the near edge (left, top); reversed is
// just the two numbers swapped.
// why: lessons/kit-xy-pad.md#header

import { el } from './shell.mjs';

/** The pad's own pixel grid. A caller whose values ARE pixels on this surface
 *  (a drawing pad) declares its axes against these, and the projection below is
 *  then the identity — which is the point: one geometry, named once. */
export const PAD = { w: 960, h: 520 };

// Fixed, not devicePixelRatio, so ink counted off this canvas is the same on every display.
// why: lessons/kit-xy-pad.md#scale
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
 * @param o.x         {label, min, max, unit}, left edge to right edge
 * @param o.y         {label, min, max, unit}, TOP edge to bottom edge
 * @param o.onStart   (x, y, ev) a gesture began; the trace is empty again
 * @param o.onInput   (x, y, ev) EVERY sample, full rate, local, never throttled
 * @param o.onDone    (trace)    the gesture ended
 * @param o.value     () => ({x, y}) | null: where something else says the point is. Drawn as the mark.
 * @param o.overlay   (ctx, view): a second reading drawn over the capture. `view` = {W, H, px(x,y), colors, axes}.
 * @param o.upTo      () => number | null: draw the capture only up to this timestamp; null draws all.
 * @param o.ink       () => number: capture strength 0 to 1, asked once a frame. Default 1.
 * why: lessons/kit-xy-pad.md#create-xy-pad
 */
export function createXyPad(host, {
  label = '', x, y, onStart, onInput, onDone, value, overlay, upTo, ink, gesture = true,
  showMark = true,
} = {}) {
  ensureCss();
  const ax = axis(x, 'x'), ay = axis(y, 'y');
  const fx = fmtFor(ax), fy = fmtFor(ay);
  const W = PAD.w, H = PAD.h;

  const cv = el('canvas', 'xy-pad');
  cv.width = W * SCALE; cv.height = H * SCALE;
  cv.style.aspectRatio = `${W} / ${H}`;
  cv.setAttribute('aria-label', label || 'xy pad');
  // `data-gesture` tells verify.mjs to drag across this element rather than click it.
  // why: lessons/kit-xy-pad.md#data-gesture
  if (gesture) cv.setAttribute('data-gesture', label || 'xy');
  host.append(cv);
  const ctx = cv.getContext('2d');

  const css = getComputedStyle(document.documentElement);
  const tok = (n, fb) => (css.getPropertyValue(n) || '').trim() || fb;
  const C = {
    // The capture is the only near-white ink on the pad, so a page can count it off the pixels.
    // why: lessons/kit-xy-pad.md#trace-colour
    trace: tok('--fg', '#e6e6e6'),
    dim: tok('--dim', '#8b93a1'),
    card: tok('--card', '#11151d'),
    // the mark is the playhead's colour, the same one every demo uses
    mark: tok('--hi', '#ffd400'),
    grid: 'rgba(255,255,255,0.05)',
  };
  // `ctx.font` cannot read `var(--sans)` and silently ignores it, so the token is resolved here.
  // why: lessons/kit-xy-pad.md#ctx-font
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

  // Stamped with `event.timeStamp`, when the input happened, not when the handler ran.
  // why: lessons/kit-xy-pad.md#stamp-at-source
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
    // Coalesced: one `pointermove` per frame hides the samples between.
    // why: lessons/kit-xy-pad.md#coalesced
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
  // One paint per animation frame however fast samples arrive; the capture is full rate.
  // why: lessons/kit-xy-pad.md#drawing
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

    // A 2x2 grid: one line each way says two axes without ruled paper.
    // why: lessons/kit-xy-pad.md#grid
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    {
      const gx = Math.round(W / 2) + 0.5, gy = Math.round(H / 2) + 0.5;
      ctx.moveTo(gx, 0); ctx.lineTo(gx, H);
      ctx.moveTo(0, gy); ctx.lineTo(W, gy);
    }
    ctx.stroke();

    furniture();

    // The capture, the loudest thing here. `upTo` caps it at a time, not a count, so a replay grows
    // the line under its playhead; below the first sample nothing is drawn.
    // why: lessons/kit-xy-pad.md#up-to
    const limit = upTo ? upTo() : null;
    const capped = Number.isFinite(limit);
    // `ink` is applied inside its own save/restore, or the overlay would inherit the dimming.
    // why: lessons/kit-xy-pad.md#ink
    const weight = ink ? Math.max(0, Math.min(1, ink())) : 1;
    if (trace.length > 1 && weight > 0 && (!capped || limit >= trace[0].at)) {
      ctx.save();
      ctx.globalAlpha = weight;
      ctx.strokeStyle = C.trace; ctx.lineWidth = 6;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      const [x0, y0] = px(trace[0].x, trace[0].y);
      ctx.moveTo(x0, y0);
      for (const p of trace) {
        if (capped && p.at > limit) break;
        const [a, b] = px(p.x, p.y); ctx.lineTo(a, b);
      }
      ctx.stroke();
      ctx.restore();
    }

    // whatever the caller makes of the same gesture, over the top
    if (overlay) overlay(ctx, view);

    // And where something else says the point is now. `showMark: false` is for a pad whose line
    // already ends at the playhead; the value still reaches `upTo`.
    // why: lessons/kit-xy-pad.md#show-mark
    const v = value && value();
    if (showMark && v && Number.isFinite(v.x) && Number.isFinite(v.y)) mark(v);

    ctx.restore();
  }

  const PAD_IN = 12;
  /** a unit joins its number with a space, in one place — `330px` reads as a
   *  token and `330 px` as a measurement */
  const u = (a) => (a.unit ? (a.unit.startsWith(' ') ? a.unit : ' ' + a.unit) : '');
  /**
   * The pad draws no furniture: names and ranges are on the page. The labels still reach
   * `aria-label` and `data-gesture`.
   * why: lessons/kit-xy-pad.md#furniture
   */
  function furniture() {
    // nothing. See the note above; the axes speak through aria and the page.
  }

  /** The playhead's position on the pad: one filled dot with a border in the
   *  pad's ground, so it reads over both the pale line and the bright one. */
  function mark(v) {
    const [mx, my] = px(v.x, v.y);
    // One dot with a border in the pad's own ground, so it reads over the line without a ring.
    // In pad pixels, drawn at about half size on a page.
    // why: lessons/kit-xy-pad.md#mark
    ctx.beginPath(); ctx.arc(mx, my, 11, 0, Math.PI * 2);
    ctx.fillStyle = C.mark; ctx.fill();
    ctx.strokeStyle = C.card; ctx.lineWidth = 6; ctx.stroke();
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
