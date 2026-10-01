// demo/shell/testsrc2.mjs: ffmpeg's `testsrc2`, drawn by a browser.
//
// 🔴 WHY IT EXISTS. Asked 2026-09-30: *"try to generate 1:1 same graphics +
// timecode bar as in container ffmpeg examples"*. The container legs paint
// `testsrc2` and then the burned clock over it; `/moq/` publishes from a canvas
// and painted a flat field. This is the field it was missing, so a MoQ picture
// and an LL-HLS or WHEP picture of the same instant look like one pattern.
//
// 🔴 `testsrc2` IS NOT A SPEC, IT IS A C FUNCTION, AND THIS IS A PORT OF IT.
// Every line below is `test2_fill_picture` in FFmpeg's
// `libavfilter/vsrc_testsrc.c`, read off master on 2026-09-30, with the
// blend arithmetic from `libavfilter/drawutils.c` (`blend_pixel`,
// `ff_blend_mask`). The integer arithmetic is kept, rounding included:
// `av_rescale` rounds half away from zero, and the motion is a function of the
// frame number and nothing else, so frame N here and frame N out of ffmpeg are
// the same picture. What that claim is worth was MEASURED, not assumed: see the
// note at `drawTestsrc2`.
//
// ⚠️ IT DRAWS INTO RGB, WHICH IS THE ONE FORMAT WHERE THE PORT CAN BE EXACT.
// ffmpeg negotiates a pixel format per graph, and in a YUV one every rectangle
// edge is rounded to the chroma grid and every colour goes through a matrix.
// A canvas is RGB, so the comparison is against `format=rgb24`, where
// `ff_draw_round_to_sub` is the identity.
//
// ⚠️ AND THE CORNER COUNTER IS COVERED, NOT DRAWN, BECAUSE THE CONTAINER COVERS
// IT. `workers/pub/container/server.mjs` paints a 240x48 box over testsrc2's
// own timecode and frame number (asked 2026-09-29 as *"rm top left
// counters"*), red then green at the first bar edge since 2026-09-30. Drawing
// the VGA font only to paint over it would be work nobody sees, so this paints
// the same box and stops.

/** The container's cover over testsrc2's own counter, read off `server.mjs`. */
export const CORNER = { w: 240, h: 48 };

// av_rescale(a, b, c) with AV_ROUND_NEAR_INF: half away from zero.
function rescale(a, b, c) {
  if (a < 0) return -rescale(-a, b, c);
  return Math.floor((a * b + Math.floor(c / 2)) / c);
}

// testsrc2's colour wheel, six segments of 256.
function gradient(index) {
  const si = index & 0xff, sd = 0xff - si;
  switch (index >> 8) {
    case 0: return 0xff0000 + (si << 8);
    case 1: return 0x00ff00 + (sd << 16);
    case 2: return 0x00ff00 + si;
    case 3: return 0x0000ff + (sd << 8);
    case 4: return 0x0000ff + (si << 16);
    default: return 0xff0000 + sd;
  }
}

/**
 * Fill an RGBA buffer with frame `pts` of testsrc2. Pure: no DOM, so the same
 * code is graded in node against a real ffmpeg render.
 *
 * @param {Uint8ClampedArray|Uint8Array} px  w * h * 4 bytes, RGBA
 * @param {number} pts  the frame number, which is what ffmpeg's pts is here
 * @param {number} rate frames per second, the source's time base is 1 / rate
 */
export function testsrc2Pixels(px, w, h, pts, { rate = 30, corner = true } = {}) {
  const fill = (x, y, rw, rh, rgb) => {
    const r = (rgb >> 16) & 0xff, g = (rgb >> 8) & 0xff, b = rgb & 0xff;
    const x0 = Math.max(0, x), y0 = Math.max(0, y);
    const x1 = Math.min(w, x + rw), y1 = Math.min(h, y + rh);
    for (let yy = y0; yy < y1; yy++) {
      let o = (yy * w + x0) * 4;
      for (let xx = x0; xx < x1; xx++, o += 4) {
        px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255;
      }
    }
  };

  // ── six vertical bars: red, green, yellow, blue, magenta, cyan ─────────────
  for (let i = 1, x = 0; i < 7; i++) {
    const x2 = rescale(i, w, 6);
    fill(x, 0, x2 - x, h, ((i & 1) ? 0xff0000 : 0) | ((i & 2) ? 0x00ff00 : 0) | ((i & 4) ? 0x0000ff : 0));
    x = x2;
  }

  // ── the oblique gradient line, bouncing between the top and bottom ─────────
  if (h >= 64) {
    const y0 = rescale(pts, h - 16, rate * 2);
    const g0 = rescale(pts, 128, rate);
    for (let x = 0; x < w; x++) {
      const g = (rescale(x, 6 * 256, w) + g0) % (6 * 256);
      let y = y0 + rescale(x, Math.floor(h / 2), w);
      y %= 2 * (h - 16);
      if (y > h - 16) y = 2 * (h - 16) - y;
      fill(x, y, 1, 16, gradient(g));
    }
  }

  // ── top right: three clock hands, each a row of 8x8 squares ───────────────
  if (w >= 64 && h >= 64) {
    const l = (Math.min(w, h) - 32) >> 1;
    const steps = Math.max(4, l >> 5);
    const xc = (w >> 2) + (w >> 1), yc = h >> 2;
    const cycle = l << 2;
    for (let c = 0; c < 3; c++) {
      const rgb = (0xbbbbbb ^ (0xff << (c << 3))) & 0xffffff;
      const pos = rescale(pts, cycle, rate * (64 >> (c << 1))) % cycle;
      let xh = pos < l ? pos : pos < 2 * l ? l : pos < 3 * l ? 3 * l - pos : 0;
      let yh = pos < l ? 0 : pos < 2 * l ? pos - l : pos < 3 * l ? l : cycle - pos;
      xh -= l >> 1; yh -= l >> 1;
      for (let i = 1; i <= steps; i++) {
        fill(rescale(xh, i, steps) + xc, rescale(yh, i, steps) + yc, 8, 8, rgb);
      }
    }
  }

  // ── bottom left: the beating grey cross and square ─────────────────────────
  if (w >= 64 && h >= 64) {
    const l = (Math.min(w, h) - 16) >> 2;
    const cycle = l << 3;
    const xc = w >> 2, yc = (h >> 2) + (h >> 1);
    const xm1 = xc - 8, xm2 = xc + 8, ym1 = yc - 8, ym2 = yc + 8;
    let size = rescale(pts, cycle, rate * 4);
    let step = Math.floor(size / l);
    size %= l;
    if (step & 1) size = l - size;
    step = (step >> 1) & 3;
    const x1 = xc - 4 - size, x2 = xc + 4 + size, y1 = yc - 4 - size, y2 = yc + 4 + size;
    if (step === 0 || step === 2) fill(x1, ym1, x2 - x1, ym2 - ym1, 0x808080);
    if (step === 1 || step === 2) fill(xm1, y1, xm2 - xm1, y2 - y1, 0x808080);
    if (step === 3) fill(x1, y1, x2 - x1, y2 - y1, 0x808080);
  }

  // ── bottom right: a checker of noise, blended green over the bars ─────────
  // The noise is a 32-bit LCG seeded with the frame number, 256 draws a cell,
  // and the blend is `blend_pixel`'s fixed point, so it lands on the same byte.
  {
    const xmin = rescale(5, w, 8), xmax = rescale(7, w, 8);
    const ymin = rescale(5, h, 8), ymax = rescale(7, h, 8);
    const A = (0x10307 * 255 + 3) >> 8;           // colour alpha 0xFF, as ff_blend_mask scales it
    const src = [0x00, 0xff, 0x80];               // 0xFF00FF80
    const mask = new Uint8Array(256);
    let r = pts >>> 0;
    for (let y = ymin; y + 15 < ymax; y += 16) {
      for (let x = xmin; x + 15 < xmax; x += 16) {
        if ((x ^ y) & 16) continue;
        for (let i = 0; i < 256; i++) {
          r = (Math.imul(r, 1664525) + 1013904223) >>> 0;
          mask[i] = r >>> 24;
        }
        for (let my = 0; my < 16; my++) {
          for (let mx = 0; mx < 16; mx++) {
            const px0 = x + mx, py0 = y + my;
            if (px0 >= w || py0 >= h) continue;
            const a = mask[my * 16 + mx] * A;
            const o = (py0 * w + px0) * 4;
            for (let k = 0; k < 3; k++) {
              px[o + k] = Math.floor(((0x1010101 - a) * px[o + k] + a * src[k]) / 0x1000000);
            }
          }
        }
      }
    }
  }

  // ── the bouncing purple square ─────────────────────────────────────────────
  if (w >= 16 && h >= 16) {
    const bw = w - 8, bh = h - 8;
    let x = rescale(pts, 55 * bw, rate * 233) % (bw * 2);
    let y = rescale(pts, 89 * bh, rate * 233) % (bh * 2);
    if (x > bw) x = bw * 2 - x;
    if (y > bh) y = bh * 2 - y;
    fill(x, y, 8, 8, 0x8000ff);
  }

  // ── top left: testsrc2 prints a timecode and a frame number here ───────────
  // The container paints them out, so this paints the same box and draws no
  // text. `corner: false` leaves the bars showing instead.
  // Red then green, split at the first bar edge, as server.mjs paints it since
  // 2026-09-30. It used to be black.
  if (corner) {
    const b1 = rescale(1, w, 6);
    fill(0, 0, b1, CORNER.h, 0xff0000);
    fill(b1, 0, CORNER.w - b1, CORNER.h, 0x00ff00);
  }
  return px;
}

const cache = new WeakMap();

/**
 * Paint frame `frame` of testsrc2 into a 2d context, whole frame, opaque.
 *
 * MEASURED 2026-09-30 against ffmpeg 9.0.1, `testsrc2=size=1280x720:rate=30,
 * format=rgb24` with the container's corner `drawbox`: **0 of 921,600 pixels
 * differ** at frames 0, 1, 37, 300, 1234 and 5000. The instrument can fail:
 * this port's frame 36 against ffmpeg's 37 differs in 64,758 pixels, and
 * leaving the corner uncovered differs in 11,520, which is 240 x 48.
 * ⚠️ THAT IS THE SOURCE PICTURE, NOT THE PICTURE A VIEWER GETS. Both then go
 * through an encoder, and an encoder does not keep a single pixel exact.
 *
 * Call `burn(ctx, w, h, frame, { field: false })` from `pattern.mjs` over it:
 * the burned clock's bed is opaque black, so nothing painted here can reach
 * the row `readBurned` decodes.
 */
export function drawTestsrc2(ctx, w, h, frame, opts = {}) {
  let img = cache.get(ctx);
  if (!img || img.width !== w || img.height !== h) {
    img = ctx.createImageData(w, h);
    cache.set(ctx, img);
  }
  testsrc2Pixels(img.data, w, h, frame, opts);
  ctx.putImageData(img, 0, 0);
}
