// demo/shell/wave-view.mjs: a min/max envelope picture of one short sample, with a play head.
// IT DRAWS AND IT DOES NOT PLAY: the page owns the sound and passes seconds; no seek, no text.
// THE HEAD MOVES ONLY WHILE SOMETHING IS PLAYING, between `follow()` and `rest()`.
// The border is on the wrapper so `clientWidth` is the canvas content width (wave-view-test.mjs
// asserts the two capitalised phrases above).
// why: lessons/kit-wave-view.md#header

import { el } from './shell.mjs';

/**
 * How wide the play head is drawn, in CSS pixels: one, solid, brightest grey.
 * why: lessons/kit-wave-view.md#head-px
 */
export const HEAD_PX = 1;

/** How wide one column is, in CSS pixels. One, so a column is a pixel. */
export const COL_PX = 1;

/**
 * The fewest columns an envelope is ever built with, for a wrapper that measures 0 before layout.
 * why: lessons/kit-wave-view.md#min-cols
 */
export const MIN_COLS = 64;

/** How much air above and below the wave, in CSS pixels, so full scale is not
 *  flush against the border. */
export const PAD_Y = 3;

const CSS_ID = 'pos-wave-css';

function ensureCss() {
  if (document.getElementById(CSS_ID)) return;
  const s = el('style', '', `
.pos-wave { display: block; background: var(--card); border: 1px solid var(--line);
            border-radius: 4px; overflow: hidden; }
.pos-wave[hidden] { display: none; }
.pos-wave-c { display: block; width: 100%; height: var(--wave-h, 120px); }
`);
  s.id = CSS_ID;
  document.head.prepend(s);
}

// ── the arithmetic, pure numbers, graded in node by wave-view-test.mjs ──
// why: lessons/kit-wave-view.md#arithmetic

/**
 * How many columns a picture this wide is drawn with.
 *
 * @param {number} width  the CSS pixels available
 * @returns {number} at least `MIN_COLS`
 */
export function columnCount(width, { colPx = COL_PX, min = MIN_COLS } = {}) {
  const w = Math.max(0, Math.round(Number(width) || 0));
  const px = Math.max(1, Number(colPx) || COL_PX);
  return Math.max(Math.max(1, Math.floor(min)), Math.round(w / px));
}

/**
 * The half open range of samples column `i` covers. The ranges tile the file when there are
 * enough samples, and repeat (never empty) when there are fewer.
 * @param {number} frames  samples in the file
 * @param {number} cols    columns in the picture
 * @param {number} i       which column
 * why: lessons/kit-wave-view.md#column-range
 */
export function columnRange(frames, cols, i) {
  const n = Math.max(0, Math.floor(Number(frames) || 0));
  const c = Math.max(1, Math.floor(Number(cols) || 0));
  if (!n) return { from: 0, to: 0 };
  const k = Math.max(0, Math.min(c - 1, Math.floor(Number(i) || 0)));
  let from = Math.floor((k * n) / c);
  let to = Math.floor(((k + 1) * n) / c);
  if (from > n - 1) from = n - 1;
  if (to <= from) to = from + 1;
  if (to > n) to = n;
  return { from, to };
}

/**
 * The picture, as signed `min` and `max` arrays, one entry per column. `peak` is what the
 * picture draws and equals the file's peak for every column count.
 * @param {Float32Array|number[]} samples
 * @param {number} cols
 * why: lessons/kit-wave-view.md#envelope
 */
export function envelope(samples, cols) {
  const c = Math.max(1, Math.floor(Number(cols) || 0));
  const n = samples && samples.length ? samples.length : 0;
  const min = new Float32Array(c);
  const max = new Float32Array(c);
  if (!n) {
    return { cols: c, frames: 0, min, max, peak: 0, peakCol: -1, lit: 0, perCol: 0, empty: true };
  }
  let peak = 0, peakCol = -1, lit = 0;
  for (let i = 0; i < c; i++) {
    const { from, to } = columnRange(n, c, i);
    let lo = samples[from], hi = samples[from];
    for (let j = from + 1; j < to; j++) {
      const v = samples[j];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    min[i] = lo; max[i] = hi;
    const a = Math.max(Math.abs(lo), Math.abs(hi));
    if (a > 0) lit++;
    if (a > peak) { peak = a; peakCol = i; }
  }
  return { cols: c, frames: n, min, max, peak, peakCol, lit, perCol: n / c, empty: false };
}

/**
 * Where a position sits across the picture, 0 to 1, clamped, or `null` when nothing to draw.
 * Only a finite number counts: `Number(null)` is 0, which would pin a cleared head to the left.
 * why: lessons/kit-wave-view.md#head-at
 */
export function headAt(position, seconds) {
  if (typeof position !== 'number' || !Number.isFinite(position)) return null;
  const d = Number(seconds);
  if (!Number.isFinite(d) || d <= 0) return null;
  return Math.max(0, Math.min(1, position / d));
}

/** Seconds to a pixel across a picture this wide. The one mapping, named once. */
export function secondsToX(t, seconds, width) {
  const f = headAt(t, seconds);
  if (f === null) return null;
  return f * Math.max(0, Number(width) || 0);
}

/** A pixel back to seconds. The inverse of `secondsToX`, and asserted to be. */
export function xToSeconds(x, width, seconds) {
  const w = Math.max(1, Number(width) || 0);
  const d = Math.max(0, Number(seconds) || 0);
  return Math.max(0, Math.min(d, ((Number(x) || 0) / w) * d));
}

/**
 * Where the head is drawn: inset one head width at the end, or a head at the full width
 * is drawn entirely outside the canvas.
 * why: lessons/kit-wave-view.md#head-x
 */
export function headX(position, seconds, width, thick = HEAD_PX) {
  const x = secondsToX(position, seconds, width);
  if (x === null) return null;
  const w = Math.max(0, Number(width) || 0);
  const t = Math.max(1, Number(thick) || HEAD_PX);
  return Math.max(0, Math.min(w - t, x));
}

/* ── the component ────────────────────────────────────────────────────────── */

/**
 * A canvas that draws one sample, and a head that a page moves.
 * @param host                     where the picture goes
 * @param o.height                 CSS pixels tall, default 120
 * @param o.label                  what the picture is of, for `aria-label`
 * @param o.normalise              draw relative to this sample's own peak; default false, so
 *   samples peaking 0.586 and 0.997 do not draw identically
 * @param o.minCols                the floor under the column count
 * why: lessons/kit-wave-view.md#create-wave-view
 */
export function createWaveView(host, { height = 120, label = '', normalise = false,
  minCols = MIN_COLS } = {}) {
  ensureCss();

  const wrap = el('div', 'pos-wave');
  // A per instance value goes on a custom property, so a stylesheet can still override it.
  // why: lessons/kit-wave-view.md#custom-property
  wrap.style.setProperty('--wave-h', `${Math.max(24, Math.round(height))}px`);
  // Hidden until there is something to show: an empty bordered box is a stray rule.
  // why: lessons/kit-wave-view.md#hidden-until-set
  wrap.hidden = true;
  const canvas = el('canvas', 'pos-wave-c', '', { 'aria-label': label || 'waveform' });
  wrap.append(canvas);
  host.append(wrap);

  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const tok = (n, fb) => (css.getPropertyValue(n) || '').trim() || fb;
  /**
   * Three greys and no hue, as grain-scope.mjs: colour here says how a mark landed.
   * why: lessons/kit-wave-view.md#greys
   */
  const C = {
    field: tok('--card', '#11151d'),
    line: tok('--line', '#1f2937'),
    wave: tok('--dim2', '#6a7280'),
    played: tok('--dim', '#8b93a1'),
    head: tok('--fg', '#e6e6e6'),
  };

  let W = 0, H = 0, dpr = 1;
  let samples = null, rate = 0, seconds = 0, name = '';
  let env = null;
  let pos = null;                 // seconds, or null when there is no head
  let follower = null;            // () => seconds|null, while something plays
  let raf = null;
  let paints = 0, ticks = 0, sets = 0;

  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    // `clientWidth` is a CONTENT width, and the border is on the wrapper, so
    // this is exactly the number of CSS pixels the canvas will render into.
    const w = Math.max(0, Math.round(wrap.clientWidth));
    const h = Math.max(0, Math.round(canvas.clientHeight)) || Math.round(height);
    if (w === W && h === H && canvas.width) return false;
    W = w; H = h;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    return true;
  }

  function build() {
    env = samples ? envelope(samples, columnCount(W, { min: minCols })) : null;
  }

  function paint() {
    if (!W || !H) return;
    paints++;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Nothing to draw is an empty bitmap, not a field and a midline, so `ink()` can tell a
    // cleared picture from a drawn one.
    // why: lessons/kit-wave-view.md#empty-bitmap
    if (!env || env.empty) { ctx.clearRect(0, 0, W, H); return; }

    ctx.fillStyle = C.field;
    ctx.fillRect(0, 0, W, H);

    const mid = H / 2;
    ctx.fillStyle = C.line;
    ctx.fillRect(0, mid - 0.5, W, 1);

    // Full scale by default: 1.0 reaches PAD_Y from the edge. `normalise`
    // divides by this sample's own peak instead, which is opt in for the reason
    // on the option.
    const room = Math.max(1, mid - PAD_Y);
    const scale = normalise && env.peak > 0 ? room / env.peak : room;
    const hx = headX(pos, seconds, W);
    const headCol = hx === null ? -1 : Math.min(env.cols - 1, Math.floor((hx / Math.max(1, W)) * env.cols));
    // Column width is derived: a picture narrower than MIN_COLS has more columns than pixels.
    // why: lessons/kit-wave-view.md#column-width
    const cw = W / env.cols;

    for (let i = 0; i < env.cols; i++) {
      const top = mid - Math.min(room, env.max[i] * scale);
      const bot = mid - Math.max(-room, env.min[i] * scale);
      ctx.fillStyle = i <= headCol ? C.played : C.wave;
      ctx.fillRect(i * cw, top, Math.max(COL_PX, cw), Math.max(1, bot - top));
    }

    if (hx !== null) {
      ctx.fillStyle = C.head;
      ctx.fillRect(hx, 0, HEAD_PX, H);
    }
  }

  function redraw() { build(); paint(); }

  /** The loop and nothing else. `rest()` is the public half and also decides
   *  what happens to the head, which is a separate question. */
  function stopLoop() {
    if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    follower = null;
  }

  const ro = new ResizeObserver(() => { if (size()) redraw(); });
  ro.observe(wrap);

  function tick() {
    raf = null;
    if (!follower) return;
    ticks++;
    const t = follower();
    // `null` means the sound stopped, and stops the loop rather than drawing position zero.
    // why: lessons/kit-wave-view.md#null-stops
    if (typeof t !== 'number' || !Number.isFinite(t)) { api.rest(); return; }
    pos = t;
    paint();
    raf = requestAnimationFrame(tick);
  }

  const api = {
    el: wrap,
    canvas,

    /**
     * Swap in another sample. The head is cleared, because a position inside
     * the last sample means nothing inside this one.
     *
     * @param {Float32Array} s  mono floats, which is what `toMono()` returns
     * @param {number} r        the sample rate those floats were taken at
     * @returns {{ok:boolean, why?:string, frames?:number, seconds?:number,
     *            cols?:number, peak?:number}} a value a page can log
     */
    set(s, r, { name: n = '' } = {}) {
      const len = s && s.length ? s.length : 0;
      if (!len) return { ok: false, why: 'no samples in that, so there is nothing to draw' };
      if (!Number.isFinite(Number(r)) || Number(r) <= 0) {
        return { ok: false, why: `a rate of ${r} gives no duration, so the picture would have no axis` };
      }
      stopLoop();
      samples = s; rate = Number(r); seconds = len / Number(r); name = n;
      pos = null; sets++;
      wrap.hidden = false;
      size();
      redraw();
      return { ok: true, frames: len, seconds, cols: env.cols, peak: env.peak, lit: env.lit };
    },

    /**
     * Nothing drawn, no head, no loop, and the box goes away with it. Wipes the bitmap
     * synchronously; hiding the wrapper alone left `ink()` reading the old sample.
     * why: lessons/kit-wave-view.md#clear
     */
    clear() {
      stopLoop();
      pos = null;
      samples = null; env = null; rate = 0; seconds = 0; name = '';
      paint();
      wrap.hidden = true;
    },

    /**
     * Put the head somewhere and paint ONCE. `null` takes the head away.
     * This is the whole of the still case: no frame loop is started.
     */
    head(t) {
      // The same strict test `headAt()` makes, and for the same reason: this
      // line read `Number.isFinite(Number(t))` first, so `head(null)` parked the
      // head at zero instead of taking it away.
      pos = typeof t === 'number' && Number.isFinite(t) ? t : null;
      paint();
      return pos;
    },

    /**
     * Follow a position while something is playing. `fn` is asked once a frame and returns
     * seconds, or `null` when the sound has stopped. A number throws: that is `head()`.
     * why: lessons/kit-wave-view.md#follow
     */
    follow(fn) {
      if (typeof fn !== 'function') {
        throw new Error('follow() takes a function returning seconds. For a position that is not moving, call head(seconds)');
      }
      follower = fn;
      if (raf === null) raf = requestAnimationFrame(tick);
    },

    /**
     * Stop the frame loop. The head STANDS STILL where it was, which is what a
     * sound that has stopped looks like. Pass a number to park it somewhere
     * else, or `null` to take it away.
     */
    rest(at = undefined) {
      stopLoop();
      if (at !== undefined) api.head(at);
      else paint();
    },

    /**
     * What is drawn, for an assert. Every number here comes off the model, not
     * off the canvas. `ink()` is the one that reads pixels.
     */
    facts() {
      return {
        drawn: !!env && !env.empty,
        name,
        frames: env ? env.frames : 0,
        rate,
        seconds,
        cols: env ? env.cols : 0,
        perCol: env ? env.perCol : 0,
        peak: env ? env.peak : 0,
        peakCol: env ? env.peakCol : -1,
        lit: env ? env.lit : 0,
        position: pos,
        headX: headX(pos, seconds, W),
        moving: raf !== null,
        follows: !!follower,
        width: W,
        height: H,
        paints,
        ticks,
        sets,
      };
    },

    /**
     * How much of the canvas is not field colour, read off the pixels, for a check only.
     * Read `measured` first: on an unpainted or wiped bitmap the corner is transparent and
     * `share` means nothing. @returns {{ink:number, total:number, share:number, measured:boolean, why:string}}
     * why: lessons/kit-wave-view.md#ink
     */
    ink() {
      const none = (why) => ({ ink: 0, total: 0, share: 0, measured: false, why });
      if (!W || !H || !canvas.width) return none('the picture has no size yet, so nothing has been drawn into it');
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      // The corner carries the field colour on any painted bitmap, and an alpha
      // of zero is how an unpainted or wiped one says so.
      if (d[3] === 0) return none('the bitmap is empty, so there is no field colour to compare against');
      const r0 = d[0], g0 = d[1], b0 = d[2];
      let ink = 0;
      const total = canvas.width * canvas.height;
      for (let p = 0; p < d.length; p += 4) {
        if (Math.abs(d[p] - r0) > 8 || Math.abs(d[p + 1] - g0) > 8 || Math.abs(d[p + 2] - b0) > 8) ink++;
      }
      return { ink, total, share: total ? ink / total : 0, measured: true, why: '' };
    },

    /** Put it away: the loop, the observer and the element. */
    destroy() {
      stopLoop();
      ro.disconnect();
      wrap.remove();
    },
  };

  size();
  paint();
  return api;
}
