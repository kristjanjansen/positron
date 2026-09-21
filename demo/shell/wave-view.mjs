// demo/shell/wave-view.mjs
// A picture of one short sample, with a play head.
//
// The picture is a MIN/MAX ENVELOPE: every column is the lowest and the highest
// sample in the slice of audio that column covers, so a transient one sample
// wide still reaches the top of the box. A picture drawn by taking one sample
// every N instead would be faster, would look almost identical on a sine, and
// would be a lie about every peak in the file.
//
// 🔴 THE NUMBERS THAT MAKE THAT WORTH SAYING, MEASURED 2026-09-21 ON THE 64
// SAMPLES IN `New Pack.circuitpack`: they run 5,999 to 95,947 frames, 0.124979
// to 1.998896 seconds, 2,561,855 frames in total, all 48 kHz 16 bit mono. The
// longest one in a 700 px box is 137 frames a column, so a reader taking one
// sample a column would be drawing 0.73 PER CENT OF THE FILE and would have to
// be lucky to land on any peak at all. `envelope()` reads all 95,947, which
// costs one pass and is the only thing here that could ever be called slow.
//
// 🔴 IT DRAWS AND IT DOES NOT PLAY. There is no `AudioContext` in this file, no
// `decodeAudioData`, no `BufferSource`, no `fetch` and no media element. The
// page owns the sound and hands this component a POSITION in seconds; a
// component that made its own would be a second audio path in a page that
// already has one, and the position it drew could then disagree with the sound
// somebody is listening to. `wave-view-test.mjs` asserts that absence over the
// exported names and over this file's own source text, the way
// `circuit-sample-test.mjs` does, because a name test cannot see a call inside
// a function.
//
// 🔴 AND THE HEAD MOVES ONLY WHILE SOMETHING IS PLAYING. `follow(fn)` starts an
// animation frame loop and `rest()` stops it dead. There are two
// `requestAnimationFrame` call sites and no more: the one that arms the loop
// and the one inside it that asks for the next frame, and a single
// `cancelAnimationFrame` ends both. A component that ran a frame loop for a
// still picture would be spending a phone's battery to redraw the same pixels,
// and nothing on screen would say so. `paints` counts, so a check can watch the
// counter STOP rather than ask a boolean whether it thinks it has stopped.
//
// ⚠️ NOTHING IN HERE IS TEXT, WHICH IS A LAYOUT DECISION AND NOT AN OMISSION.
// `grain-scope`'s live caption reflowed between three and four lines sixty
// times a second and made the whole page jump, reported as *"a horrible jump of
// content each time it updates"*. The only thing this component owns is a
// canvas of fixed height, so there is nothing here that can change its own size
// while somebody is looking at it. A number that has to be read goes in the
// page's readout, which is a fixed box, and a name goes in the page's table.
//
// ⚠️ AND IT DOES NOT SEEK. A press on this picture does nothing, on purpose.
// Seeking is a claim about a position inside a sound, one position surface per
// page owns that claim, and the audio this was built for is a one shot
// `BufferSource` that cannot be seeked at all. Adding a pointer handler here
// would put a control on the page that lies about what it can do.
//
// ⚠️ NO `touch-action` ON THE CANVAS, DELIBERATELY. The project rule is that
// selection suppression is global and `touch-action` is not: a canvas you drag
// to look around wants it off, and a canvas inside a page you scroll must not
// eat the scroll. Nothing here is dragged, so the page keeps its scroll.
//
// STYLING. Three rules, prepended to <head> so `shell.css` and any page's own
// <style> override them on source order, which is the arrangement `xy-pad.mjs`
// already uses and records. They want hoisting into `shell.css` and are not
// there yet because that file is being edited by another hand today, and a
// component that only looks right next to one page's stylesheet is the
// `choice.mjs` bug in a new costume.
//
// ⚠️ AND THE WRAPPER PAINTS ITS OWN GROUND, WHICH MATTERS BECAUSE THIS GETS PUT
// INSIDE THINGS. `createGlue` lays its children out with a 1 px gap over a
// `--line` ground, so a transparent child does not show a hairline between two
// panes, it shows that colour across its whole area. `.pos-wave` sets
// `background: var(--card)`, so the component is safe in a glue. A caller that
// wraps it in a box of its own has to paint that box.
//
// 🔴 THE BORDER IS ON THE WRAPPER AND NOT ON THE CANVAS, WHICH IS ARITHMETIC
// RATHER THAN TASTE. `box-sizing: border-box` is global here, so a canvas with
// a 1 px border whose CSS width is set from its container's width renders 2 px
// of content narrower than its backing store and stretches the picture by
// 0.3 per cent. On a 1.3 second sample that is 4 ms of head position, which is
// small and is also free to not have. The wrapper carries the border and
// `clientWidth` is a CONTENT width, so the two agree by construction.

import { el } from './shell.mjs';

/**
 * How wide the play head is drawn, in CSS pixels. One, solid, brightest grey.
 * `grain-scope.mjs` settled this for the whole project: the loop furniture is
 * grey because a picture where five things are yellow is one colour saying five
 * things, and the head keeps the brightest ink because it is the only mark that
 * is somewhere different every frame.
 */
export const HEAD_PX = 1;

/** How wide one column is, in CSS pixels. One, so a column is a pixel. */
export const COL_PX = 1;

/**
 * The fewest columns an envelope is ever built with.
 *
 * ⚠️ IT EXISTS FOR THE MOMENT BEFORE LAYOUT, not as a taste. A wrapper that is
 * hidden or not yet in the document measures 0 wide, and a 0 column envelope is
 * a divide by zero wearing a picture. 64 is enough to draw something honest if
 * a resize observation never arrives at all.
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

/* ── the arithmetic, which is pure and is graded with no browser ───────────
   Everything from here to `createWaveView` takes numbers and returns numbers.
   `wave-view-test.mjs` runs it in node, because every bug this kind of picture
   has ever had lives in exactly these four functions: a bucket that skips
   samples, a bucket that is empty, a head that sits off the right edge, and a
   round trip between seconds and pixels that does not come back. */

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
 * The half open range of samples column `i` covers, `from` up to but not
 * including `to`.
 *
 * 🔴 THE TWO PROPERTIES THIS HAS TO HAVE, AND BOTH ARE ASSERTED. With at least
 * as many samples as columns the ranges TILE the file: every sample is in
 * exactly one column and none is skipped, which is the whole difference between
 * an envelope and a decimation. With FEWER samples than columns they repeat
 * instead, and no column is ever empty, because an empty column has no minimum
 * and no maximum and would be drawn as silence in the middle of a sound.
 *
 * @param {number} frames  samples in the file
 * @param {number} cols    columns in the picture
 * @param {number} i       which column
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
 * The picture, as two arrays of the same length as there are columns.
 *
 * `min` and `max` are SIGNED, so a column of nothing but negative samples
 * reports a negative maximum rather than zero. Taking the absolute value per
 * column and drawing it symmetrically would throw away which side of the line
 * the sound is on, and a transient that only goes one way is exactly the thing
 * this picture exists to show.
 *
 * `peak` is the amplitude the picture DRAWS, which is a different claim from
 * the amplitude in the file only if the bucketing is wrong. They are equal for
 * every column count, and that equality is the assert that kills a decimator.
 *
 * @param {Float32Array|number[]} samples
 * @param {number} cols
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
 * Where a position sits across the picture, 0 to 1, or `null` when there is
 * nothing to draw.
 *
 * A position before the start or past the end is CLAMPED rather than refused,
 * because both happen for real reasons: an `AudioContext` clock read a frame
 * before the sound starts is slightly negative, and one read a frame after a
 * one shot ends is slightly past the duration. Neither is an error and neither
 * should make the head disappear for one frame.
 *
 * 🔴 IT TAKES A NUMBER AND NOTHING ELSE, AND THIS WAS WRITTEN AS
 * `Number.isFinite(Number(position))` FIRST, WHICH IS A DEAD GUARD. `Number(null)`
 * is 0 and `Number('')` is 0, so a head that had been TAKEN AWAY came back as a
 * head at the very start of the sample: a bright line pinned to the left edge
 * of a picture nothing is playing, and a `played` shade over column 0 to go
 * with it. Found by running the component against a stub document and reading
 * `facts()`, where `position: null` sat next to `headX: 0` in the same object.
 * Two fields that can disagree is what made it visible; one field would have
 * been believed.
 * ⚠️ A NUMERIC STRING IS REFUSED TOO, deliberately. A position arriving as text
 * is a page bug, and a component that quietly parses it is a component that
 * draws a head somebody else thinks they cleared.
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
 * Where the head is DRAWN, which is not quite where it is.
 *
 * 🔴 THE LAST PIXEL IS THE ONE THAT GOES WRONG. A head at the very end of a
 * sample maps to x equal to the full width, and a 1 px line drawn there is
 * entirely outside the canvas: the head vanishes at the exact moment a reader
 * is watching for it to arrive. That is the pingpong head bug from `looper.mjs`
 * in a different picture, where a ramp sat at the right edge for the whole
 * return half. The inset is one head width and it is asserted.
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
 *
 * @param host                     where the picture goes
 * @param o.height                 CSS pixels tall, default 120
 * @param o.label                  what the picture is of, for `aria-label`
 * @param o.normalise              draw relative to this sample's own peak
 *   instead of full scale. DEFAULT FALSE, and the reason is measured: the 64
 *   samples in the pack peak between 0.586 and 0.997, so normalising every one
 *   to the top of the box would draw the quietest and the loudest identically
 *   while the table beside it reports two different numbers. `grain-scope.mjs`
 *   learned the same thing from the other end, where a scale that moved was
 *   reported as *"the scale keeps changing"*.
 * @param o.minCols                the floor under the column count
 */
export function createWaveView(host, { height = 120, label = '', normalise = false,
  minCols = MIN_COLS } = {}) {
  ensureCss();

  const wrap = el('div', 'pos-wave');
  // A per instance value goes on a CUSTOM PROPERTY and never on the property
  // itself. `video-panel.mjs` wrote `style.aspectRatio` from an option and no
  // stylesheet could ever take it back, which left one page's picture square on
  // a 16:9 screen with the way out of full screen off the top of it.
  wrap.style.setProperty('--wave-h', `${Math.max(24, Math.round(height))}px`);
  // 🔴 NOTHING ON SCREEN UNTIL THERE IS SOMETHING TO SHOW. An empty bordered box
  // is a horizontal rule nobody wrote, which is the defect `shell.css` already
  // records for an empty readout: a container with nothing in it must not paint
  // its edges. `set()` brings it back.
  wrap.hidden = true;
  const canvas = el('canvas', 'pos-wave-c', '', { 'aria-label': label || 'waveform' });
  wrap.append(canvas);
  host.append(wrap);

  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const tok = (n, fb) => (css.getPropertyValue(n) || '').trim() || fb;
  /**
   * 🔴 THREE GREYS AND NO HUE, WHICH IS `grain-scope.mjs`'S SETTLED ANSWER
   * REUSED RATHER THAN RE-ARGUED. Colour in this project says HOW A MARK
   * LANDED, and nothing on this picture has landed well or badly: it is
   * material, a part of it has been played, and a line says where. Three steps
   * of ink put them in order, and the head keeps the brightest because it is
   * the only thing here that moves.
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

    // 🔴 NOTHING TO DRAW IS AN EMPTY BITMAP, NOT AN EMPTY PICTURE, AND THIS
    // LINE SHIPPED PAINTING A FIELD AND A MIDLINE INSTEAD. `clear()` did not
    // repaint at all, so the canvas kept the LAST SAMPLE and only the wrapper
    // being hidden made it look gone. REPORTED 2026-09-21 while `/pack/` was
    // being wired up: a page drew a sample, read `ink()`, called `clear()`, read
    // `ink()` again, and got **the same 63,264 pixels both times**, so a check
    // built on the difference was measuring nothing. Two ways it bites. A page
    // that unhides the wrapper again for any reason flashes the previous
    // sample, and every number a check could ask for reads exactly the same
    // whether the clear worked or not.
    // ⚠️ AND IT IS CLEARED RATHER THAN FILLED WITH A FIELD AND A MIDLINE. A
    // midline on an empty picture is a drawing of silence, which is a different
    // claim from there being nothing here. The wrapper paints `--card`, so an
    // empty canvas shows an empty box either way, and a transparent bitmap is
    // the one state `ink()` can tell apart from a picture.
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
    // ⚠️ THE COLUMN WIDTH IS DERIVED AND NOT ASSUMED TO BE ONE PIXEL. A picture
    // narrower than `MIN_COLS` has more columns than pixels, and drawing each
    // one a pixel wide would run the last two thirds of the sample off the
    // right hand edge while the picture looked perfectly ordinary.
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
    // 🔴 `null` IS THE PAGE SAYING THE SOUND HAS STOPPED, and it stops the loop
    // rather than being drawn as position zero. A component that kept running
    // because a page forgot to tell it anything is the frame loop this file
    // exists not to have.
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
     * Nothing drawn, no head, no loop, and the box goes away with it.
     *
     * 🔴 IT WIPES THE BITMAP, SYNCHRONOUSLY, AND THE FIRST VERSION DID NOT.
     * Hiding the wrapper is not clearing the picture: the canvas kept every
     * pixel of the last sample, `ink()` went on reporting them, and the only
     * thing that would eventually have wiped it is a resize observation
     * arriving later and setting `canvas.width`. A cleanup that depends on
     * something else happening afterwards is not a cleanup.
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
     * Follow a position while something is playing. `fn` is asked once a frame
     * and returns seconds, or `null` when the sound has stopped.
     *
     * A number is refused rather than accepted quietly, because a number is the
     * still case and `head()` is what draws it. A component that took either
     * and guessed would be a control that looks live and is inert, which is the
     * `requestFullscreen?.()` defect in a different costume.
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
     * How much of the canvas is not field colour, READ BACK OFF THE PIXELS.
     *
     * 🔴 A COLUMN COUNT IS NOT A PICTURE. `/radio/` already records this: a
     * check that a wave was drawn has to ask the canvas, because every number
     * in `facts()` would be exactly the same if the fill colour were the field
     * colour, if the scale were zero, or if `paint()` returned early. The field
     * colour is SAMPLED at the top left corner rather than parsed out of a
     * token, because the corner is field by construction: the wave is inset by
     * `PAD_Y` and can never reach row zero.
     *
     * 🔴 SO IT HAS TO SAY WHEN THE CORNER IS NOT A FIELD COLOUR AT ALL, AND
     * THIS RETURNED A BARE SHARE UNTIL 2026-09-21. On a bitmap that has never
     * been painted, or one this component has just wiped, the corner is
     * TRANSPARENT: every pixel then matches it, or every pixel differs from it
     * depending on which channels are compared, and the number that comes out
     * is about nothing. Reported from `/pack/` as a `share` near 0.999 passing
     * a `share > 0` assert while meaning nothing. `measured` is the field that
     * says whether there was anything to measure, and it is the one to read
     * FIRST, the way `table.mjs` reports a table that has not been laid out.
     * A check that reads `share` without reading `measured` is back to
     * believing a number that cannot move.
     *
     * ⚠️ IT IS A READBACK AND IT IS FOR A CHECK. Do not call it in a frame.
     *
     * @returns {{ink:number, total:number, share:number, measured:boolean, why:string}}
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
