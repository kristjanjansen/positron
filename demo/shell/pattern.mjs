// demo/shell/pattern.mjs: one generated test pattern, drawn by canvas (burn, readBurned) and ffmpeg (ffmpegFilters).
// ROW is frozen: every publisher burns the same 48-bit ms clock and XOR checksum, so transports compare.
// readBurned thresholds on luminance, so nothing coloured goes inside the bed; proto/m2m's row is a different spec.
// why: lessons/kit-pattern.md#header

/**
 * The one margin every element keeps from the frame's edges.
 * why: lessons/kit-pattern.md#pad
 */
export const PAD = 60;

/**
 * The bed sits PAD from the top and is centred: 1120 px of blocks plus 40 px margin is 1160 of 1280.
 * workers/pub/container/server.mjs carries the same numbers and must move with these.
 * why: lessons/kit-pattern.md#frame-geometry
 */
export const FRAME_W = 1280;
export const FRAME_H = 720;
export const ROW = {
  NBLOCKS: 56, BLOCK_W: 20, H: 56,
  X: PAD + 20,
  // AT THE BOTTOM. The row is the machine's half of the picture and the numbers
  // are the reader's, so the reader's half gets the top. `Y` is derived so the
  // bed sits PAD off the bottom edge, the same PAD as every other side.
  Y: FRAME_H - PAD - 20 - 56,
};

/** 48 bits of epoch milliseconds, MSB first, then the 8-bit XOR of those bytes. */
export const CLOCK_BITS = 48;

/** The six clock bytes, MSB first. */
function clockBytes(ms) {
  const bytes = [];
  let v = ms;
  for (let i = 5; i >= 0; i--) { bytes[i] = v % 256; v = Math.floor(v / 256); }
  return bytes;
}

/** The 56 bits the row encodes for `ms`. Exported so a test can check any drawing of it. */
export function bitsFor(ms) {
  const bytes = clockBytes(ms);
  let ck = 0;
  for (const b of bytes) ck ^= b;
  const bits = [];
  for (const b of bytes.concat([ck])) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  return bits;
}

/**
 * The key colour for video: hue 50, shell.css's --hi #ffd400.
 * why: lessons/kit-pattern.md#video-hue
 */
export const VIDEO_HUE = 50;

/**
 * The field is never tinted: a warm hue at low saturation and lightness reads as mud.
 * why: lessons/kit-pattern.md#field
 */
export const FIELD = '#0d1017';

/**
 * The band video hues may occupy: apart enough to tell sources apart, one family.
 * why: lessons/kit-pattern.md#band
 */
const BAND = 100;   // degrees, centred on VIDEO_HUE

/**
 * The nth distinct video hue. Offsets, not a step, so consecutive takes sit far apart in the band.
 * why: lessons/kit-pattern.md#video-hue-fn
 */
const SPREAD = [0, 42, -18, 60, -40, 22];
export function videoHue(i = 0) {
  return (VIDEO_HUE + SPREAD[((i % SPREAD.length) + SPREAD.length) % SPREAD.length] + 360) % 360;
}

/**
 * A stable hue inside the video band for any string, so sources differ with no allocation.
 * why: lessons/kit-pattern.md#hue-for
 */
export function hueFor(s) {
  let h = 2166136261;
  const str = String(s ?? '');
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (VIDEO_HUE - BAND / 2 + ((h >>> 0) % BAND) + 360) % 360;
}

const pad = (n, k = 2) => String(n).padStart(k, '0');

/** The viewer's UTC offset, e.g. "UTC+03:00". Named, because an unlabelled clock is noise. */
function zoneLabel(d) {
  const off = -d.getTimezoneOffset();
  const s = off < 0 ? '-' : '+';
  const a = Math.abs(off);
  return `UTC${s}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/**
 * Field, the whole camera frame, then a scrim so the burned clock stays readable. Contain by default:
 * an iOS camera arrives portrait, and cover shows 32% of it. fit: 'cover' is for a film (keeps 75%).
 * scrim defaults to 0.55; pass 0 when nothing is drawn on top. Returns false before the source has size.
 * why: lessons/kit-pattern.md#draw-camera
 */
export function drawCamera(ctx, src, w, h, opts = {}) {
  const sw = src.videoWidth || src.naturalWidth || src.width || 0;
  const sh = src.videoHeight || src.naturalHeight || src.height || 0;
  const scrim = opts.scrim ?? 0.55;
  ctx.fillStyle = FIELD;
  ctx.fillRect(0, 0, w, h);
  if (!sw || !sh) return false;
  const scale = opts.fit === 'cover'
    ? Math.max(w / sw, h / sh)
    : Math.min(w / sw, h / sh);
  const dw = sw * scale, dh = sh * scale;
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
  if (scrim > 0) {
    ctx.fillStyle = `rgba(13,16,23,${scrim})`;
    ctx.fillRect(0, 0, w, h);
  }
  return true;
}

/**
 * Where the canvas's two clock columns go: one starts at PAD, two ends at w - PAD, both sized from
 * the widest string printed (monospace, so 0 stands for any digit). gap < 0 is an overlap.
 * why: lessons/kit-pattern.md#clock-columns
 */
export function clockColumns(ctx, w, ms, second, { NUM = 64, LBL = 28 } = {}) {
  const width = (font, ...strs) => {
    ctx.font = font;
    return Math.max(...strs.map((t) => ctx.measureText(t).width));
  };
  const num = `bold ${NUM}px ${MONO}`, lbl = `bold ${LBL}px ${MONO}`;
  const w1 = Math.max(
    width(num, '0'.repeat(String(ms).length), '0'.repeat(13)),
    width(lbl, 'ABSOLUTE'),
  );
  const w2 = Math.max(
    width(num, second.label === 'LOCAL' ? '00:00:00.000' : '00:00.000', second.text),
    width(lbl, second.label),
  );
  const x2 = Math.round(w - PAD - w2);
  return { x1: PAD, w1, x2, w2, gap: x2 - (PAD + w1) };
}

/**
 * Draw one frame of the pattern and return the epoch ms it burned.
 *
 * @param ctx    2d context
 * @param w,h    canvas size (the ROW is drawn at frozen absolute coordinates)
 * @param frame  frame counter — drives the motion
 * @param opts   { hue, label, position, ms }
 *   hue       0..359, drives the field and the two labels ONLY — never the row
 *   position  seconds — when given, the second clock shows POSITION instead of
 *             the viewer's wall time. Two clocks, and the frame says which.
 *   field     false to skip the background fill, when the caller has already
 *             painted the frame (a camera, say). Everything else still draws.
 *   ms        override the clock (tests)
 *   scrim     true to paint a black 0.55 box behind each label and number, the
 *             container's `box=1:boxcolor=black@0.55:boxborderw=14`. Off by
 *             default, so the pages that call this without it do not change.
 */
export function burn(ctx, w, h, frame, opts = {}) {
  const ms = opts.ms ?? Math.round(performance.timeOrigin + performance.now());
  // ROUNDED. A caller deriving hues by golden angle hands in 307.0160000000001,
  // and the header printed every digit of it — a number with thirteen decimals
  // in a picture reads as a bug, because it is one.
  const hue = Math.round((((opts.hue ?? 205) % 360) + 360) % 360);

  // field: false skips only this fill; the row's black bed still draws, or the clock stops reading back.
  // why: lessons/kit-pattern.md#burn-field
  if (opts.field !== false) {
    ctx.fillStyle = FIELD;
    ctx.fillRect(0, 0, w, h);
  }

  // ── the frozen row ───────────────────────────────────────────────────────
  // Black bed with a 20 px margin so compression ringing has somewhere to go,
  // then white blocks. NOTHING hue-coloured may enter this rectangle.
  ctx.fillStyle = '#000';
  ctx.fillRect(ROW.X - 20, ROW.Y - 20, ROW.NBLOCKS * ROW.BLOCK_W + 40, ROW.H + 40);
  const bits = bitsFor(ms);
  ctx.fillStyle = '#fff';
  for (let i = 0; i < ROW.NBLOCKS; i++) {
    if (bits[i]) ctx.fillRect(ROW.X + i * ROW.BLOCK_W, ROW.Y, ROW.BLOCK_W, ROW.H);
  }

  // Two labelled clocks and nothing else, one size, side by side. 64 px fits: 499 + 461 px plus the
  // 60 px gutter is 1020 of 1160; at 84 px they came to 1319. Shown at about 440 px, 64 reads as ~22 px.
  // why: lessons/kit-pattern.md#burn-clocks
  const NUM = 64, LBL = 28;
  ctx.textBaseline = 'alphabetic';
  const d = new Date(ms);
  const second = Number.isFinite(opts.position)
    ? {
        label: 'POSITION',
        text: `${pad(Math.floor(opts.position / 60))}:${pad(Math.floor(opts.position % 60))}`
          + `.${pad(Math.floor((opts.position % 1) * 1000), 3)}`,
      }
    : {
        label: 'LOCAL',
        text: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
          + `.${pad(d.getMilliseconds(), 3)}`,
      };

  // The numbers sit on top of the row, PAD above the bed as the bed is PAD off the bottom; the middle stays
  // empty for drawCamera. Digits do not descend, so the baseline is the visual bottom.
  // why: lessons/kit-pattern.md#burn-numbers-y
  const NUM_Y = ROW.Y - 20 - PAD;
  // 80 less the 64 px number's cap height (about 50) is a 30 px visible gap.
  // why: lessons/kit-pattern.md#burn-label-y
  const LBL_Y = NUM_Y - 80;
  /**
   * Side by side and never overlapping: the right column hangs from the right margin and is measured
   * from the widest string this renderer prints. At 9999999999999 the gap is 197 px at 1280.
   * why: lessons/kit-pattern.md#burn-columns
   */
  const cols = clockColumns(ctx, w, ms, second, { NUM, LBL });
  /**
   * opts.scrim draws the container's black@0.55 box with a 14 px border: glyph extent tall, advance wide.
   * Opt in, since nine other pages call this. It never reaches the bed, so readBurned is unaffected.
   * why: lessons/kit-pattern.md#burn-scrim
   */
  const SCRIM_BORDER = 14;
  const scrimBehind = (t, x, y) => {
    if (!opts.scrim) return;
    const m = ctx.measureText(t);
    const b = SCRIM_BORDER;
    const up = Math.ceil(m.actualBoundingBoxAscent), down = Math.ceil(m.actualBoundingBoxDescent);
    const fill = ctx.fillStyle;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(Math.round(x - b), y - up - b, Math.ceil(m.width) + 2 * b, up + down + 2 * b);
    ctx.fillStyle = fill;
  };
  const say = (t, x, y) => { scrimBehind(t, x, y); ctx.fillText(t, x, y); };
  ctx.font = `bold ${LBL}px ${MONO}`;
  ctx.fillStyle = `hsl(${hue} 55% 70%)`;
  say('ABSOLUTE', PAD, LBL_Y);
  say(second.label, cols.x2, LBL_Y);
  ctx.font = `bold ${NUM}px ${MONO}`;
  ctx.fillStyle = '#fff';
  say(String(ms), PAD, NUM_Y);
  ctx.fillStyle = '#e9eef7';
  say(second.text, cols.x2, NUM_Y);

  // The square crosses the frame once every 10 s of the burned clock, so an encoder never dedupes the frame
  // and two pictures of the same instant put it in the same place: the offset between them is the delay.
  // why: lessons/kit-pattern.md#burn-motion
  const SWEEP_MS = 10000;
  // 30 by 30, PAD off the top, crossing between the strip's own margins.
  // why: lessons/kit-pattern.md#burn-square
  const SQ = 30;
  // BETWEEN the numbers and the row: it belongs with the things a person reads,
  // not tucked under the machine-readable row where it looked like part of it.
  ctx.fillStyle = `hsl(${hue} 85% 55%)`;
  // At the top, where an eye lands first; it reads when the digits are too small to resolve.
  // why: lessons/kit-pattern.md#burn-square-top
  ctx.fillRect(PAD + ((ms % SWEEP_MS) / SWEEP_MS) * (w - 2 * PAD - SQ), PAD, SQ, SQ);
  return ms;
}

/**
 * Read the burned clock off a <video>, drawn at its natural size (readBurned samples fixed coordinates).
 * Null before a frame, or when the checksum disagrees.
 * why: lessons/kit-pattern.md#read-burned-from
 */
export function readBurnedFrom(video, scratch) {
  const w = video.videoWidth, h = video.videoHeight;
  if (!w || !h) return null;
  // Normalise back onto the 1280 grid: WHEP ramps 640x360 to 1280x720, and at 960x540 0 of 85 frames read.
  // Safe only for the same aspect; a differently shaped source would misplace the row.
  // why: lessons/kit-pattern.md#read-burned-scale
  const c = scratch || document.createElement('canvas');
  const sameShape = Math.abs(w / h - FRAME_W / FRAME_H) < 0.01;
  const cw = sameShape ? FRAME_W : w, chh = sameShape ? FRAME_H : h;
  if (c.width !== cw || c.height !== chh) { c.width = cw; c.height = chh; }
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;      // keep block edges hard
  ctx.drawImage(video, 0, 0, cw, chh);
  return readBurned(ctx);
}

/** Read the burned clock back. Returns null unless the checksum agrees. */
export function readBurned(ctx) {
  const img = ctx.getImageData(ROW.X, ROW.Y + ROW.H / 2, ROW.NBLOCKS * ROW.BLOCK_W, 1).data;
  const levels = [];
  for (let i = 0; i < ROW.NBLOCKS; i++) {
    let s = 0;
    for (let dx = 6; dx < 14; dx++) s += img[(i * ROW.BLOCK_W + dx) * 4 + 1];
    levels.push(s / 8);
  }
  const mn = Math.min(...levels), mx = Math.max(...levels);
  if (mx - mn < 60) return null;                  // nothing decoded into this row yet
  const thr = (mn + mx) / 2;
  const bits = levels.map((l) => (l > thr ? 1 : 0));
  let ms = 0;
  for (let i = 0; i < CLOCK_BITS; i++) ms = ms * 2 + bits[i];
  let ck = 0;
  for (let i = CLOCK_BITS; i < ROW.NBLOCKS; i++) ck = ck * 2 + bits[i];
  let expect = 0;
  for (const b of clockBytes(ms)) expect ^= b;
  return expect === ck ? ms : null;
}

// ffmpeg reproduces the hue, clocks and labels, but its clock is spawn epoch + pts, the publisher's clock.
// drawtext with no fontfile fails silently, and homebrew ffmpeg lacks drawtext (publish.sh pins ffmpeg@7).
// why: lessons/kit-pattern.md#ffmpeg-side

/** Bold monospace. Proportional digits shift sideways as they change, which is
 *  jitter in exactly the region a reader is watching. */
export const FFMPEG_FONT = '/usr/share/fonts/dejavu/DejaVuSansMono-Bold.ttf';

/**
 * Quote a filtergraph option value; drawtext's own expansion layer consumes the inner escapes.
 * why: lessons/kit-pattern.md#q
 */
const q = (s) => `'${String(s).replace(/'/g, "\\'")}'`;

// The row is drawn by canvas only: ffmpeg's drawbox row cost +16 % encoder CPU and nothing read it.
// why: lessons/kit-pattern.md#row-canvas-only

/**
 * DejaVu Sans Mono Bold's advance, 1233 of 2048 units, from its hmtx table; drawtext cannot measure.
 * why: lessons/kit-pattern.md#ffmpeg-advance
 */
export const FFMPEG_ADVANCE = 1233 / 2048;

/**
 * The ffmpeg picture's two clock columns, from drawtext's widest strings: the absolute clock is
 * 19 characters (%.6f plus ' s'), the wall clock 8. gap is between the drawn boxes, borders off.
 * why: lessons/kit-pattern.md#ffmpeg-columns
 */
export function ffmpegColumns({ w = FRAME_W, NUM = 64, LBL = 28, border = 14 } = {}) {
  const adv = (n, size) => n * FFMPEG_ADVANCE * size;
  const w1 = Math.max(adv('0000000000.000000 s'.length, NUM), adv('ABSOLUTE'.length, LBL));
  const w2 = Math.max(adv('00:00:00'.length, NUM), adv('LOCAL'.length, LBL));
  const x2 = Math.round(w - PAD - w2);
  return { x1: PAD, w1, x2, w2, gap: Math.floor(x2 - border - (PAD + w1 + border)) };
}

/**
 * The whole video filter chain for a generated ffmpeg source.
 * @param epoch seconds since the epoch at spawn; @param hue a rotation of the source's colours, 0..359
 * @param font fontfile path, required (drawtext fails silently without one)
 * why: lessons/kit-pattern.md#ffmpeg-filters
 */
export function ffmpegFilters({ epoch, hue = 0, font = FFMPEG_FONT, w = FRAME_W } = {}) {
  if (!epoch) throw new Error('ffmpegFilters: epoch required');
  if (!font) throw new Error('ffmpegFilters: fontfile required; drawtext without one fails silently');
  // Same typography as the canvas on a dark scrim. drawtext paints after hue=, so #ffd400 is not rotated;
  // x is a parameter because the canvas draws two columns.
  // why: lessons/kit-pattern.md#ffmpeg-typography
  const text = (t, x, y, size, colour) => [
    `drawtext=fontfile=${q(font)}`,
    `text=${q(t)}`,
    `x=${x}`, `y=${y}`, `fontsize=${size}`, `fontcolor=${colour}`,
    'box=1', 'boxcolor=black@0.55', 'boxborderw=14',
  ].join(':');
  // SAME SIZES AND THE SAME TWO COLUMNS AS THE CANVAS, EACH SIZED FROM ITS
  // OWN WIDEST STRING. See `ffmpegColumns` for the arithmetic and the numbers.
  const NUM = 64, LBL = 28;
  // ffmpeg's y is the top of the text box and the canvas's is the baseline. 0.774 converts, derived from
  // the offsets this shipped with; hand typed offsets once drew the number 25 px too low.
  // why: lessons/kit-pattern.md#ffmpeg-top
  const top = (baseline, size) => Math.round(baseline - 0.774 * size);
  // The canvas's own baselines, computed the same way, so the two renderings cannot drift.
  // why: lessons/kit-pattern.md#ffmpeg-baselines
  const NUM_Y = ROW.Y - 20 - PAD;
  const LBL_Y = NUM_Y - 80;
  const { x2 } = ffmpegColumns({ w, NUM, LBL });
  const LABEL = '0xFFD400';   // --hi
  const VALUE = '0xE9EEF7';   // the canvas's own near-white
  return [
    // hue FIRST: rotating chroma after the overlays would tint the white boxes
    // and, with row=1, the row itself.
    ...(hue ? [`hue=h=${((hue % 360) + 360) % 360}`] : []),
    // Four draws mirroring burn(): a small word, then a big number, twice. No source label.
    // why: lessons/kit-pattern.md#ffmpeg-four-draws
    text('ABSOLUTE', PAD, top(LBL_Y, LBL), LBL, LABEL),
    // pts-derived, the instant the row encodes, in seconds: expr_int_format clamps at INT32_MAX, so epoch ms
    // cannot print. The unit is printed beside it.
    // why: lessons/kit-pattern.md#ffmpeg-seconds
    text(`%{pts\\:flt\\:${epoch}} s`, PAD, top(NUM_Y, NUM), NUM, VALUE),
    text('LOCAL', x2, top(LBL_Y, LBL), LBL, LABEL),
    // The publisher's wall clock. The triple backslash survives drawtext's expansion parser; on ffmpeg@7
    // a single one errors with "%{gmtime} requires at most 1 arguments".
    // why: lessons/kit-pattern.md#ffmpeg-gmtime
    text('%{gmtime\\:%H\\\\\\:%M\\\\\\:%S}', x2, top(NUM_Y, NUM), NUM, VALUE),
  ].join(',');
}

// CLI: `node demo/shell/pattern.mjs --epoch=... [--hue=...] [--font=...]`, src/publish.sh's filter.
// An exact url match, not a suffix test; in a browser process does not exist.
// why: lessons/kit-pattern.md#cli
if (typeof process !== 'undefined' && import.meta.url === `file://${process.argv?.[1]}`) {
  const arg = (k, d) => {
    const m = process.argv.find((a) => a.startsWith(`--${k}=`));
    return m ? m.slice(k.length + 3) : d;
  };
  process.stdout.write(ffmpegFilters({
    epoch: arg('epoch'),
    hue: Number(arg('hue', 0)),
    font: arg('font', FFMPEG_FONT),
  }));
}
