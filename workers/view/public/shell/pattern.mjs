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

/**
 * The margin every element on the frame keeps from the top and the left. One
 * number, because two that happen to differ read as a mistake — the row used to
 * sit 20 px from the left edge and 80 px from the top, and off-centre besides
 * (20 px of margin on the left against 100 on the right).
 */
export const PAD = 60;

/**
 * MOVED 2026-09-07, from X:40 Y:100 — so the bed sits PAD from the top and is
 * CENTRED: 56 x 20 = 1120 of blocks, plus the bed's own 20 px ringing margin,
 * is 1160 wide on a 1280 frame, which leaves exactly PAD either side.
 *
 * `workers/pub/container/server.mjs` carries the same numbers and MUST move with
 * this, because `readBurned()` here reads the row that file's ffmpeg draws.
 * `rig/obs-docker/*` and `rig/whep/*` each hold a burner and a reader that agree
 * with EACH OTHER on the old geometry; they are self-contained rigs and are
 * deliberately left alone. So "byte-identical everywhere" is no longer true and
 * this comment says so rather than letting the next reader assume it.
 */
export const ROW = { NBLOCKS: 56, BLOCK_W: 20, X: PAD + 20, Y: PAD + 20, H: 80 };

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
 * THE KEY COLOUR FOR VIDEO. `--hi` in shell.css is #ffd400, which is hue 50, so
 * that is what a picture this project generated looks like — the same colour the
 * transport bar's playhead and the primary buttons use.
 */
export const VIDEO_HUE = 50;

/**
 * The band video hues are allowed to occupy: wide enough that two sources are
 * obviously different, narrow enough that everything still reads as one family
 * rather than a bag of random colours. An earlier version spread hues over the
 * whole circle, which put `record` on magenta and `capture` on green — two
 * pictures with nothing to say to each other and neither of them ours.
 */
const BAND = 100;   // degrees, centred on VIDEO_HUE

/**
 * The nth distinct video hue. Offsets rather than an angle step, so consecutive
 * takes are far apart INSIDE the band — a plain step of BAND/n puts take 1 and
 * take 2 next to each other, which is the one case the colour exists to tell
 * apart. Index 0 is the key colour itself.
 */
const SPREAD = [0, 42, -18, 60, -40, 22];
export function videoHue(i = 0) {
  return (VIDEO_HUE + SPREAD[((i % SPREAD.length) + SPREAD.length) % SPREAD.length] + 360) % 360;
}

/**
 * A stable hue for any string, so two sources pick different colours unaided —
 * now INSIDE the video band, so a MoQ publisher and a local recording are
 * recognisably the same kind of thing. A person can still tell two publishers
 * apart at a glance, and nobody has to allocate a colour by hand.
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
 * Draw a camera (or any image source) to fill w x h WITHOUT DISTORTING IT —
 * scaled to cover, centred, cropped on the long side.
 *
 * `drawImage(src, 0, 0, w, h)` stretches, and on a phone that is not a subtle
 * defect: iOS does not honour a 640x360 request, so the track comes back 4:3 or
 * portrait and a face gets squashed sideways into a 16:9 box. Reported from an
 * iPhone against the deployed page. The constraint is a HINT; the drawing has to
 * cope with whatever the device actually hands over.
 *
 * Returns false if the source has no dimensions yet, so a caller can skip the
 * frame rather than divide by zero.
 */
export function drawCover(ctx, src, w, h) {
  const sw = src.videoWidth || src.naturalWidth || src.width || 0;
  const sh = src.videoHeight || src.naturalHeight || src.height || 0;
  if (!sw || !sh) return false;
  const scale = Math.max(w / sw, h / sh);
  const dw = sw * scale, dh = sh * scale;
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return true;
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
 */
export function burn(ctx, w, h, frame, opts = {}) {
  const ms = opts.ms ?? Math.round(performance.timeOrigin + performance.now());
  // ROUNDED. A caller deriving hues by golden angle hands in 307.0160000000001,
  // and the header printed every digit of it — a number with thirteen decimals
  // in a picture reads as a bug, because it is one.
  const hue = Math.round((((opts.hue ?? 205) % 360) + 360) % 360);

  // ── field ────────────────────────────────────────────────────────────────
  // `field: false` skips ONLY this fill, for a caller that has already painted
  // the frame — `take` puts the camera there and scrims it. Everything else
  // still draws, including the row's black bed, which must stay opaque or the
  // clock stops being readable back.
  if (opts.field !== false) {
    // The SITE's dark, with the hue as a wash over it — not a hue-tinted field.
    // `hsl(hue 26% 12%)` sounded reasonable and is muddy in practice: at the
    // brand hue it lands on dark olive, and any warm hue at low saturation and
    // middling lightness reads as dirt. The base is the shell's own near-black
    // so every pattern sits in the site's palette, and the hue does its real
    // work where it is saturated and large — the labels and the square.
    ctx.fillStyle = '#0d1017';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = `hsl(${hue} 70% 50% / 0.07)`;
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

  // ── two clocks, and which is which ───────────────────────────────────────
  // EVERYTHING ON THIS FRAME IS BIG, and there is nothing on it that is not a
  // clock. The pattern carried a header, a caption, a moving second-hand, a
  // rule under the header and a footer; all of them rendered between 3 and 8 px
  // once the picture was displayed at the size a demo actually shows it, which
  // is to say they were decoration that cost legibility and gave nothing back.
  // A picture whose whole job is to be READ off a small pane has room for two
  // labelled numbers and no more.
  // ONE SIZE FOR BOTH NUMBERS. They are the same kind of thing — a clock — and
  // drawing one bigger said one mattered more. 96 is what fits: the epoch is 13
  // characters, and 13 x 0.6 x 96 is 749 px inside the 1160 the margins leave.
  const NUM = 96;
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

  ctx.font = `bold 34px ${MONO}`;
  ctx.fillStyle = `hsl(${hue} 55% 70%)`;
  ctx.fillText('ABSOLUTE', PAD, 265);
  ctx.font = `bold ${NUM}px ${MONO}`;
  ctx.fillStyle = '#fff';
  ctx.fillText(String(ms), PAD, 360);

  ctx.font = `bold 34px ${MONO}`;
  ctx.fillStyle = `hsl(${hue} 55% 70%)`;
  ctx.fillText(second.label, PAD, 450);
  ctx.font = `bold ${NUM}px ${MONO}`;
  ctx.fillStyle = '#e9eef7';
  ctx.fillText(second.text, PAD, 545);

  // ── motion, and it MEANS something ───────────────────────────────────────
  // The block has to move, or a rate-controlled encoder dedupes a near-static
  // frame down to nothing (server.mjs picks testsrc2 for the same reason). It
  // used to travel at `frame * 7` px, which satisfies the encoder and says
  // nothing — a moving thing on a measuring instrument that is not measuring
  // anything.
  //
  // It now crosses the frame ONCE EVERY 10 SECONDS of the burned clock. So it
  // is a coarse second hand you can read at a glance from across a room and at
  // any size, when the digits are too small to resolve — and, because it is
  // driven by the absolute clock rather than a frame counter, TWO PICTURES OF
  // THE SAME INSTANT PUT IT IN THE SAME PLACE. Two sources side by side, one
  // block visibly behind the other, is the delay between them, with nothing to
  // read and no arithmetic. At 30 fps it still advances ~4 px a frame, which is
  // more motion than the row's low bits gave the encoder anyway.
  const SWEEP_MS = 10000;
  const SQ = 60;                       // square, and the same 60 as PAD
  ctx.fillStyle = `hsl(${hue} 85% 55%)`;
  ctx.fillRect(((ms % SWEEP_MS) / SWEEP_MS) * (w - SQ), h - PAD - SQ, SQ, SQ);
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
 * @param font    fontfile path — REQUIRED, see the trap above
 * @param row     draw the 56-block row too (default false; see rowFilters)
 */
export function ffmpegFilters({ epoch, hue = 0, font = FFMPEG_FONT, row = false } = {}) {
  if (!epoch) throw new Error('ffmpegFilters: epoch required');
  if (!font) throw new Error('ffmpegFilters: fontfile required — drawtext without one fails silently');
  // SAME TYPOGRAPHY AS THE CANVAS: a small brand-yellow word over a big light
  // number, not black text in a white box. The box stays, but as a dark scrim
  // rather than a white slab — testsrc2 is a bright, busy background and plain
  // white text on it is unreadable, which is why the white box existed at all.
  //
  // These colours are NOT hue-rotated: `hue=` is applied first, to the source,
  // and drawtext paints after it. So #ffd400 here is the same #ffd400 the shell
  // uses, on every publisher, whatever its hue rotation.
  const text = (t, y, size, colour) => [
    `drawtext=fontfile=${q(font)}`,
    `text=${q(t)}`,
    `x=${PAD}`, `y=${y}`, `fontsize=${size}`, `fontcolor=${colour}`,
    'box=1', 'boxcolor=black@0.55', 'boxborderw=14',
  ].join(':');
  const NUM = 96;             // one size for both clocks, as on the canvas
  const LABEL = '0xFFD400';   // --hi
  const VALUE = '0xE9EEF7';   // the canvas's own near-white
  return [
    // hue FIRST: rotating chroma after the overlays would tint the white boxes
    // and, with row=1, the row itself.
    ...(hue ? [`hue=h=${((hue % 360) + 360) % 360}`] : []),
    ...(row ? rowFilters(epoch) : []),
    // FOUR draws, mirroring burn()'s layout: a small word, then a big number,
    // twice. It used to be two lines with the word and the number sharing one
    // box, which is not what the canvas does — and the two have to LOOK the
    // same or "one pattern, two renderings" is a claim nothing supports.
    // There is no source label any more: the hue says which publisher this is,
    // and a name burned into a picture is a small text that cannot be read at
    // the size a demo shows it.
    text('ABSOLUTE', 230, 34, LABEL),
    // pts-derived, and the same instant the row encodes.
    //
    // In SECONDS, not milliseconds, where the canvas prints ms. Not a choice:
    // drawtext's `%{expr_int_format:…:d}` clamps at INT32_MAX, so epoch ms
    // (1.79e12) prints as 2147483647 and ffmpeg says "Conversion of
    // floating-point result to int failed" — measured on ffmpeg@7. The unit is
    // therefore printed beside the number rather than left to be guessed.
    text(`%{pts\\:flt\\:${epoch}} s`, 280, NUM, VALUE),
    text('LOCAL', 420, 34, LABEL),
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
    text('%{gmtime\\:%H\\\\\\:%M\\\\\\:%S}', 465, NUM, VALUE),
  ].join(',');
}

// CLI: `node demo/shell/pattern.mjs --epoch=… [--hue=…] [--font=…] [--row]`
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
    font: arg('font', FFMPEG_FONT),
    row: process.argv.includes('--row'),
  }));
}
