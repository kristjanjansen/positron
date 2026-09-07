// demo/shell/pattern.mjs — ONE generated test pattern, drawn two ways.
//
// Every publisher in this repo burns an absolute clock into its pixels, because
// that is what makes glass-to-glass latency readable from a screenshot alone and
// comparable ACROSS transports. There were three drawings of that idea (the MoQ
// canvas, rig/whep/publish.html, and a bare ffmpeg drawtext) and no single place
// that said what the pattern IS. This is that place.
//
//   burn(ctx, w, h, frame, opts)  — the canvas implementation
//   readBurned(ctx)               — decode the row back out of a canvas
//   ffmpegFilters(opts)           — the SAME spec as an ffmpeg -vf chain
//
// ── THE ROW IS FROZEN ───────────────────────────────────────────────────────
// ROW below is byte-identical to rig/whep/publish.html. That identity is the
// whole point: the same 48-bit millisecond clock plus 8-bit XOR checksum is
// burned by every transport's publisher, so `ladder` can put MoQ, WHEP and
// LL-HLS on ONE axis instead of three. CHANGE THESE NUMBERS AND THE COMPARISON
// SILENTLY STOPS MEANING ANYTHING.
//
// And readBurned() thresholds on LUMINANCE. The bed stays black, the blocks stay
// white, and no decoration — hue included — is allowed inside the bed rectangle.
// Everything colourful lives outside it.
//
// ── the OTHER pattern in this repo ─────────────────────────────────────────
// proto/m2m/* and proto/centralrec/pub.html carry a DIFFERENT, deliberately
// derived row: 64 blocks of 9 px at 32,40,56 on a 640x360 reference grid, with a
// 7th payload byte holding a participant id. Its own comment says so ("rig/whep
// pattern, halved to 360p, +1 pid byte"). It is a separate spec for a separate
// question (who sent this tile?), it is internally consistent across those
// pages, and it is NOT interchangeable with this one. Do not unify them by
// editing constants; that would move numbers those rigs have already published.

/** Frozen. See above. */
export const ROW = { NBLOCKS: 56, BLOCK_W: 20, X: 40, Y: 100, H: 80 };

/** 48 bits of epoch milliseconds, MSB first, then the 8-bit XOR of those bytes. */
export const CLOCK_BITS = 48;
export const CHECK_BITS = 8;

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
 * A stable hue for any string, so two sources pick different colours unaided.
 *
 * The point of the hue is that a person can tell two publishers apart at a
 * glance without reading anything; deriving it from the namespace or the take
 * name means nobody has to allocate them.
 */
export function hueFor(s) {
  let h = 2166136261;
  const str = String(s ?? '');
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 360;
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
 * Draw one frame of the pattern and return the epoch ms it burned.
 *
 * @param ctx    2d context
 * @param w,h    canvas size (the ROW is drawn at frozen absolute coordinates)
 * @param frame  frame counter — drives the motion
 * @param opts   { hue, label, position, ms }
 *   hue       0..359, drives the background and the decoration ONLY
 *   label     what this source is, printed in the header
 *   position  seconds — when given, the second clock shows POSITION instead of
 *             the viewer's wall time. Two clocks, and the frame says which.
 *   ms        override the clock (tests)
 */
export function burn(ctx, w, h, frame, opts = {}) {
  const ms = opts.ms ?? Math.round(performance.timeOrigin + performance.now());
  const hue = (((opts.hue ?? 205) % 360) + 360) % 360;
  const label = opts.label ?? 'positron';

  // ── field ────────────────────────────────────────────────────────────────
  // Dark and hue-tinted rather than the old flat #404040: the hue has to be
  // visible from across a room, and the white digits need something to sit on.
  ctx.fillStyle = `hsl(${hue} 26% 12%)`;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = `hsl(${hue} 30% 16%)`;
  ctx.fillRect(0, 0, w, 60);
  ctx.fillStyle = `hsl(${hue} 78% 52%)`;
  ctx.fillRect(0, 60, w, 3);

  ctx.textBaseline = 'alphabetic';
  ctx.font = `bold 26px ${MONO}`;
  ctx.fillStyle = `hsl(${hue} 60% 78%)`;
  ctx.fillText(String(label).toUpperCase(), 40, 41);
  ctx.font = `500 17px ${MONO}`;
  ctx.fillStyle = `hsl(${hue} 22% 58%)`;
  ctx.textAlign = 'right';
  ctx.fillText(`${w}x${h}  hue ${pad(hue, 3)}`, w - 40, 41);
  ctx.textAlign = 'left';

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

  // Everything below is OUTSIDE the bed, which ends at ROW.Y + ROW.H + 20 = 200.
  // Nothing hue-coloured may cross that line, so these start at 212.
  const bedBottom = ROW.Y + ROW.H + 20;
  ctx.font = `500 15px ${MONO}`;
  ctx.fillStyle = `hsl(${hue} 18% 52%)`;
  ctx.fillText('48-BIT EPOCH MS  ·  8-BIT XOR  ·  MACHINE READABLE', ROW.X, bedBottom + 24);

  // A second hand under the caption: the fraction of the current second, in
  // hue. It also changes on every single frame, which is the second reason it
  // is here — see the motion note below.
  const rowW = ROW.NBLOCKS * ROW.BLOCK_W;
  ctx.fillStyle = `hsl(${hue} 20% 22%)`;
  ctx.fillRect(ROW.X, bedBottom + 38, rowW, 5);
  ctx.fillStyle = `hsl(${hue} 85% 55%)`;
  ctx.fillRect(ROW.X, bedBottom + 38, rowW * ((ms % 1000) / 1000), 5);

  // ── two clocks, and which is which ───────────────────────────────────────
  // Two unlabelled numbers are worse than one. The first is EXACTLY what the
  // row above encodes; the second is the same instant for a human.
  const d = new Date(ms);
  const second = Number.isFinite(opts.position)
    ? {
        label: 'POSITION  seconds on this deck',
        text: `${pad(Math.floor(opts.position / 60))}:${pad(Math.floor(opts.position % 60))}`
          + `.${pad(Math.floor((opts.position % 1) * 1000), 3)}`,
      }
    : {
        label: `LOCAL  wall clock, ${zoneLabel(d)}`,
        text: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
          + `.${pad(d.getMilliseconds(), 3)}`,
      };

  ctx.font = `500 19px ${MONO}`;
  ctx.fillStyle = `hsl(${hue} 45% 66%)`;
  ctx.fillText('ABSOLUTE  epoch ms, the number burned above', 40, 288);
  ctx.font = `bold 76px ${MONO}`;
  ctx.fillStyle = '#fff';
  ctx.fillText(String(ms), 40, 366);

  ctx.font = `500 19px ${MONO}`;
  ctx.fillStyle = `hsl(${hue} 45% 66%)`;
  ctx.fillText(second.label, 40, 428);
  ctx.font = `bold 58px ${MONO}`;
  ctx.fillStyle = '#e9eef7';
  ctx.fillText(second.text, 40, 494);

  // ── motion ───────────────────────────────────────────────────────────────
  // A travelling block, so the encoder never dedupes a static frame down to
  // nothing. This is an ENCODER CONSTRAINT, not decoration: server.mjs uses
  // testsrc2 for the same reason ("moves on its own"). The row's low bits do
  // change every frame, but they are 8 blocks in a corner of the picture and a
  // rate-controlled encoder is entitled to spend almost nothing on them.
  //
  // Same travel as the pattern has always had — (frame * 7) px per frame — with
  // a track drawn under it, so it reads as a mechanism rather than a stray box.
  const by = Math.round(h * 0.83);
  ctx.fillStyle = `hsl(${hue} 20% 20%)`;
  ctx.fillRect(0, by + 39, w, 2);
  ctx.fillStyle = `hsl(${hue} 85% 55%)`;
  ctx.fillRect((frame * 7) % Math.max(1, w - 80), by, 80, 80);

  // ── footer ───────────────────────────────────────────────────────────────
  ctx.fillStyle = `hsl(${hue} 30% 16%)`;
  ctx.fillRect(0, h - 36, w, 36);
  ctx.font = `500 15px ${MONO}`;
  ctx.fillStyle = `hsl(${hue} 30% 62%)`;
  ctx.fillText('positron test pattern', 40, h - 13);
  ctx.textAlign = 'right';
  ctx.fillText(`frame ${frame}`, w - 40, h - 13);
  ctx.textAlign = 'left';
  return ms;
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

// ── the ffmpeg side ─────────────────────────────────────────────────────────
//
// WHAT IT CAN REPRODUCE: the hue, both clocks, the labels, and — measured, see
// below — the 56-block row itself.
//
// WHAT IT CANNOT: the ffmpeg clock is `spawn epoch + pts`, i.e. the PUBLISHER'S
// clock advanced by presentation time, while the canvas burns the DRAWING
// machine's wall clock. Read in a browser, an ffmpeg row therefore carries an
// unknown container-vs-viewer clock offset. That is fine at the LL-HLS tier
// (seconds) and dominates at the WHEP tier (tens of ms). The row makes the
// picture identical; it does not make the two numbers the same kind of number.
//
// TWO TRAPS, both already paid for:
//   · drawtext with no `fontfile` resolves to nothing and FAILS SILENTLY — the
//     epoch never reaches the pixels.
//   · the default homebrew ffmpeg has no drawtext at all; src/publish.sh pins
//     ffmpeg@7 for libfreetype and the pin is not decoration.

/** Bold monospace. Proportional digits shift sideways as they change, which is
 *  jitter in exactly the region a reader is watching. */
export const FFMPEG_FONT = '/usr/share/fonts/dejavu/DejaVuSansMono-Bold.ttf';

/**
 * Quote a filtergraph option value.
 *
 * Single quotes are the filtergraph parser's own quoting, so a `:` or a space
 * inside them reaches drawtext untouched — which is why the font path can carry
 * "Courier New Bold.ttf" and why `%{pts\:flt\:…}` keeps its backslashes all the
 * way to drawtext's OWN expansion layer, which is what actually consumes them.
 * Two escaping layers, and only the inner one is ours to write.
 */
const q = (s) => `'${String(s).replace(/'/g, "\\'")}'`;

/** epoch milliseconds as an ffmpeg expression over the frame timestamp `t` */
const MS_EXPR = (epoch) => `floor((t+${epoch})*1000)`;
/** bit n (0 = LSB) of that value */
const BIT_EXPR = (epoch, n) => `mod(floor(${MS_EXPR(epoch)}/${2 ** n}),2)`;

/**
 * The 56 `enable` expressions, in the same order bitsFor() produces bits.
 *
 * The checksum bits cannot be XORed directly in the expression language, but
 * XOR of one bit position across six bytes is just the parity of their sum,
 * which it can do.
 */
export function rowBitExprs(epoch) {
  const out = [];
  for (let i = 0; i < CLOCK_BITS; i++) out.push(BIT_EXPR(epoch, CLOCK_BITS - 1 - i));
  for (let i = CLOCK_BITS; i < ROW.NBLOCKS; i++) {
    const k = ROW.NBLOCKS - 1 - i;                 // bit position inside the xor byte
    const terms = [0, 1, 2, 3, 4, 5].map((m) => BIT_EXPR(epoch, 8 * m + k));
    out.push(`mod(${terms.join('+')},2)`);
  }
  return out;
}

/**
 * The same 56-block row, as 57 drawboxes.
 *
 * MEASURED 2026-09-07 with ffmpeg@7, 1280x720@30 through the production x264
 * settings, then decoded back out with readBurned()'s own algorithm:
 *   · 150 of 150 frames checksum-clean, worst error 0 ms
 *   · +16 % encoder-process CPU (utime 3.095 s -> 3.598 s per 20 s of video)
 *   · and the reader is not vacuous: flipping ONE block of one frame on
 *     purpose is rejected, at bit 51.
 *   · it also survives a TRANSCODE LADDER, which was the open question: scaled
 *     to 480p/360p/240p, re-encoded, then normalised back onto this 1280-wide
 *     grid the way a browser drawing <video> into a canvas would, every rung
 *     read 90/90 clean — down to 6.7 px blocks at 240p. So a lower Cloudflare
 *     rendition does not cost the row.
 *
 * So it works and it is not expensive in absolute terms — but the publisher
 * container is 1 vCPU running TWO 720p30 encodes, and half a vCPU already
 * stalled that pair once (wrangler.jsonc). +16 % on each leg is a real bite out
 * of a budget nobody has re-measured on the actual instance. Hence OFF by
 * default: switch it on for one measured run, then decide.
 */
export function rowFilters(epoch) {
  const f = [
    `drawbox=x=${ROW.X - 20}:y=${ROW.Y - 20}:w=${ROW.NBLOCKS * ROW.BLOCK_W + 40}`
      + `:h=${ROW.H + 40}:color=black:t=fill`,
  ];
  rowBitExprs(epoch).forEach((e, i) => {
    f.push(`drawbox=x=${ROW.X + i * ROW.BLOCK_W}:y=${ROW.Y}:w=${ROW.BLOCK_W}:h=${ROW.H}`
      + `:color=white:t=fill:enable='${e}'`);
  });
  return f;
}

/**
 * The whole video filter chain for a generated ffmpeg source.
 *
 * @param epoch   seconds since the epoch at spawn, e.g. (Date.now()/1000).toFixed(6)
 * @param hue     0..359 — a ROTATION applied to the source's colours, not an
 *                absolute hue: testsrc2 has no single hue to set. Two publishers
 *                with different values look different, which is the requirement.
 * @param label   printed beside the absolute clock
 * @param font    fontfile path — REQUIRED, see the trap above
 * @param row     draw the 56-block row too (default false; see rowFilters)
 */
export function ffmpegFilters({ epoch, hue = 0, label = 'positron', font = FFMPEG_FONT, row = false } = {}) {
  if (!epoch) throw new Error('ffmpegFilters: epoch required');
  if (!font) throw new Error('ffmpegFilters: fontfile required — drawtext without one fails silently');
  const text = (t, y, size) => [
    `drawtext=fontfile=${q(font)}`,
    `text=${q(t)}`,
    'x=40', `y=${y}`, `fontsize=${size}`, 'fontcolor=black',
    'box=1', 'boxcolor=white', 'boxborderw=12',
  ].join(':');
  const safe = String(label).replace(/[^A-Za-z0-9 _-]/g, '');
  return [
    // hue FIRST: rotating chroma after the overlays would tint the white boxes
    // and, with row=1, the row itself.
    ...(hue ? [`hue=h=${((hue % 360) + 360) % 360}`] : []),
    ...(row ? rowFilters(epoch) : []),
    // ABSOLUTE — pts-derived, and the same instant the row encodes.
    //
    // In SECONDS, not milliseconds, where the canvas prints ms. Not a choice:
    // drawtext's `%{expr_int_format:…:d}` clamps at INT32_MAX, so epoch ms
    // (1.79e12) prints as 2147483647 and ffmpeg says "Conversion of
    // floating-point result to int failed" — measured on ffmpeg@7. The unit is
    // therefore printed beside the number rather than left to be guessed.
    text(`ABS %{pts\\:flt\\:${epoch}} s  ${safe}`, 240, 46),
    // LEGIBLE — the publisher's own wall clock. %{pts:flt:…} is precise and
    // unreadable; this is the one a person checks against their own watch.
    // The two drifting apart is real information: it is encoder drift.
    //
    // The triple backslash is not a typo. gmtime's strftime argument has to
    // survive drawtext's expansion parser, which splits `%{name:args}` on a
    // bare colon — so the colons INSIDE the format need an escape of their own,
    // one level deeper than the one separating `gmtime` from its argument.
    // Measured against ffmpeg@7: `\\\:` renders 15:31:25, `\:` errors with
    // "%{gmtime} requires at most 1 arguments".
    text('UTC %{gmtime\\:%H\\\\\\:%M\\\\\\:%S}', 320, 40),
  ].join(',');
}

// CLI: `node demo/shell/pattern.mjs --epoch=… [--hue=…] [--label=…] [--font=…] [--row]`
// which is how src/publish.sh gets its filter — one spec, two renderings.
//
// The guard is an EXACT url match, demo/server.mjs's idiom, not
// `argv[1].endsWith('pattern.mjs')`: a suffix test would also fire for any
// script whose own name happens to end that way, and this module is imported by
// a browser where `process` does not exist at all.
if (typeof process !== 'undefined' && import.meta.url === `file://${process.argv?.[1]}`) {
  const arg = (k, d) => {
    const m = process.argv.find((a) => a.startsWith(`--${k}=`));
    return m ? m.slice(k.length + 3) : d;
  };
  process.stdout.write(ffmpegFilters({
    epoch: arg('epoch'),
    hue: Number(arg('hue', 0)),
    label: arg('label', 'positron'),
    font: arg('font', FFMPEG_FONT),
    row: process.argv.includes('--row'),
  }));
}
