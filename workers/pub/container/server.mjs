// positron-pub container — ffmpeg publisher for the Act 1 demos.
//
// One test pattern with an ABSOLUTE EPOCH BURNED INTO THE PIXELS, pushed to
// Cloudflare Stream over RTMPS. The burn is the whole point: glass-to-glass
// latency is then measurable from a screenshot alone, and the SAME burn is
// comparable across every transport, which is what lets them share one axis.
//
//   POST /start   {key, fps?, bitrate?}   -> begin publishing (idempotent)
//   POST /stop                            -> kill ffmpeg
//   GET  /status                          -> {publishing, uptimeS, pid, lastError, whip, cam}
//   POST /cam/open  {key, fmt, sid}       -> a camera's WebM rewrapped to RTMPS
//   POST /cam/chunk?sid=                  -> one MediaRecorder chunk onto its stdin
//   POST /cam/stop  {sid?, why?}          -> end the camera leg
//
// The stream key arrives in the POST body from the Worker, which reads it from
// a Worker secret. It is never baked into the image and never logged.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

const PORT = Number(process.env.PORT) || 8080;   // the image uses 8080; a laptop test may not
const BOOT = Date.now();

// TWO INDEPENDENT LEGS, because Cloudflare requires it. Its docs are explicit:
// "WHIP and WHEP must be used together: we do not yet support inputs using
// RTMP/SRT to be played using WHEP". One input cannot serve both 06 (LL-HLS off
// RTMPS) and 07 (WHEP), so each leg publishes the SAME burned-in test pattern to
// its OWN input — which is exactly what makes 09 able to compare them.
const legs = { rtmps: null, whip: null };
let ff = null;
let startedAt = 0;
let lastError = null;
let lastStderr = '';
let stopping = false;   // a SIGTERM exit is not a fault

/**
 * 🔴 THE PICTURE IS A FILM NOW, NOT `testsrc2`. Asked 2026-09-25: *"can you
 * replace test screen with r2 mim-goes-sustainable-2011-kirikustseen.mp4"*, and
 * then, when a browser-side background was proposed, *"why not ffmpeg take that
 * and stream?"* followed by *"keep pipeline"*. That is the right instinct and it
 * is the whole reason this belongs here: the container encodes ONCE and every
 * viewer gets the result as ordinary live delivery. A page-side background
 * meant every visit downloading **252,886,867 bytes**, and `CLAUDE.md`'s rule
 * from `/reel/` is that a visit, a step and a scrub must open nothing.
 * ⚠️ THE PIPELINE IS UNCHANGED, WHICH WAS THE INSTRUCTION. Same `-re` on every
 * input, same `drawFilters` burn, same libx264 CBR with a fixed GOP and
 * `-bf 0`, same aac and libopus. ONLY the input swaps.
 * ⚠️ AND IT IS OURS. The corpus row says *"MIMproject, ours. The file is in our
 * own R2 bucket"*, so this is not somebody else's server, which is the rule
 * that governs every other source in this repository.
 * ⚠️ `PUB_SOURCE=` EMPTY PUTS `testsrc2` BACK, deliberately. The test pattern
 * is what the measurement rig reads a burned clock off, and a film is a worse
 * subject for that than a moving chart is. One env var, no rebuild, because
 * `PUB_W`/`PUB_H`/`PUB_FPS` earned exactly that argument on this same file.
 */
const FILM = 'https://positron-station.kristjan-jansen.workers.dev'
  + '/media/mimproject/mim-goes-sustainable-2011-kirikustseen.mp4';
// ⚠️ `testsrc2` SPELLED OUT MEANS THE SAME AS EMPTY. Added 2026-09-30 because
// whether the container runtime passes an EMPTY env value through, rather than
// dropping it and so selecting the film, was never measured. A word survives
// any runtime that passes strings at all.
const RAW_SOURCE = process.env.PUB_SOURCE === undefined ? FILM : process.env.PUB_SOURCE;
const SOURCE = RAW_SOURCE === 'testsrc2' ? '' : RAW_SOURCE;

/**
 * 🔴 NO BURNED CLOCK OVER THE FILM. Asked 2026-09-25: *"rm burn overlay. not
 * needed for messages sync, right"*, and that is correct, verified rather than
 * agreed: cue sync reads the PLAYHEAD'S OWN WALL CLOCK out of the manifest.
 * `src/timed-messages.js` defaults to `clock: 'pdt'` and gets it from
 * `video.getStartDate()` and the PDT tags. It never reads a pixel, so the
 * overlay was never part of that path.
 * ⚠️ WHAT IT WAS ACTUALLY FOR, AND WHAT IS LOST: measuring latency off the
 * PICTURE. The burned epoch is how glass to glass was measured on this account,
 * which is where the `p50 67 ms` figure comes from, and `rig/measure-llhls.html`
 * reads it back. With the burn off, that measurement cannot be taken from a
 * frame at all. It is a real capability and it is one env var away rather than
 * deleted, for the same reason `PUB_SOURCE` is.
 * ⚠️ AND `/stage/` ALREADY EXPECTED THIS. Its own comment records that the
 * burned clock is not in the feed when a film is up and that `readBurnedFrom`
 * degrades to `null`, which its assert tolerates because it grades the PLAYHEAD
 * rather than the picture. So nothing downstream is surprised.
 * ⚠️ `PUB_BURN=1` PUTS IT BACK, over whatever the source is.
 */
const BURN = process.env.PUB_BURN === '1';

/**
 * 🔴 THE WHIP LEG'S UDP SEND BUFFER, SET ONLY WHERE IT IS ASKED FOR.
 * MEASURED 2026-10-07 on the new `durable_object` Containers runtime: the WHIP
 * leg died with exit 245, "Error muxing a packet / Task finished with error
 * code: -11 (Resource temporarily unavailable)", 2 to 15 s after every start,
 * eight times in a row over 150 s, while the RTMPS leg in the same container
 * held, and the legacy runtime's WHIP leg held on the same input minutes
 * apart. -11 is EAGAIN on a non-blocking UDP send, which the whip muxer treats
 * as fatal, and a full socket send buffer is what returns it. `-ts_buffer_size`
 * is the whip muxer's own pass-through to the UDP socket's buffer. Read from
 * the environment so the legacy class, which never sets it, sends exactly the
 * arguments it always did.
 */
const WHIP_SNDBUF = /^\d+$/.test(process.env.PUB_WHIP_SNDBUF || '') ? process.env.PUB_WHIP_SNDBUF : '';
const whipOut = (url) => [...(WHIP_SNDBUF ? ['-ts_buffer_size', WHIP_SNDBUF] : []), '-f', 'whip', url];

/**
 * The input arguments for one leg. A film and a test pattern are not the same
 * shape of input, and this is the one place that knows the difference.
 * ⚠️ `-stream_loop -1` BEFORE `-i`, because it is an INPUT option. A show that
 * ends mid-stream is a live input going dark, and the container has no idea how
 * long anybody is watching.
 * ⚠️ AND THE FILM CARRIES ITS OWN SOUND, so a lavfi tone is not mixed under a
 * performance. `-map` is then explicit on both streams: with two inputs and no
 * map, ffmpeg picks the best of each and silently preferred the film's audio
 * over the chord, which is a behaviour change nobody wrote down.
 */
/**
 * The video filter chain, or nothing at all when there is no filtering to do.
 * ⚠️ AN EMPTY `-vf` IS AN ERROR, NOT A NO-OP, so a chain that comes out empty
 * has to leave the flag off entirely rather than pass a bare string.
 * ⚠️ AND A TRAILING COMMA IS ALSO AN ERROR: `src.pre` ends in one so it can be
 * concatenated with a filter, which means dropping the filter leaves it
 * dangling. Trimmed here, once, rather than at each call.
 */
function vf(pre, draw, burn = BURN) {
  const chain = (burn ? pre + draw : pre).replace(/,+$/, '');
  return chain ? ['-vf', chain] : [];
}

/** testsrc2's first bar edge: av_rescale(1, w, 6), rounding half up. */
const bar1 = (w) => Math.floor((w + 3) / 6);

function sourceArgs({ w, h, fps }, source = SOURCE) {
  if (!source) {
    return {
      input: ['-re', '-f', 'lavfi', '-i', `testsrc2=size=${w}x${h}:rate=${fps}`],
      // 🔴 THE "TOP LEFT COUNTERS" ARE testsrc2's OWN, NOT A drawtext HERE.
      // Asked 2026-09-29, verbatim: "rm top left counters", with a grab showing
      // a timecode over a frame number top left. There is no drawtext for
      // either anywhere in this file — `ffmpeg -h filter=testsrc2` lists only
      // size/rate/duration/sar/alpha, no way to turn its own overlay off, so it
      // has to be PAINTED OVER rather than configured away. A crop would change
      // the frame size every filter after this one assumes.
      // MEASURED at 1280x720: the box is a FIXED PIXEL size, about 101x33 at
      // frame 0, about 115x33 at frame 500,000 (six digits, 4h38m at 30fps) —
      // the SAME size at 640x360, 1280x720 and 1920x1080 alike, so it does not
      // scale with the picture. A fixed-pixel cover is therefore the correct
      // match for it, not a hard-coded position standing in for one that should
      // track PUB_W/PUB_H. 240x48 clears it with margin to spare even for a
      // session that runs for days.
      // ⚠️ ONLY ON THIS BRANCH. The film has no such overlay to hide, and
      // painting a black box over a corner of it would be a new defect.
      // 🔴 RED AND GREEN, NOT BLACK. Asked 2026-09-30 of the black box:
      // *"what is this black box? put red and green on it with right widths"*.
      // The cover is painted in the two bars it sits on, split where testsrc2
      // splits them: av_rescale(1, w, 6), rounding half up, which is 213 at
      // 1280. `demo/shell/testsrc2.mjs` paints the same so /moq/ stays equal.
      pre: `drawbox=x=0:y=0:w=${bar1(w)}:h=48:color=0xFF0000:t=fill,`
        + `drawbox=x=${bar1(w)}:y=0:w=${240 - bar1(w)}:h=48:color=0x00FF00:t=fill,`,
    };
  }
  return {
    input: ['-re', '-stream_loop', '-1', '-i', source],
    // Normalise to the encode budget BEFORE the burn is drawn, so the overlay is
    // the same size on every source and never scaled with the picture.
    pre: `scale=${w}:${h}:force_original_aspect_ratio=decrease,`
       + `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,fps=${fps},`,
  };
}


// Encoder settings Cloudflare LL-HLS requires: H.264, CBR, fixed GOP, and
// B-frames OFF (they break LL-HLS). GOP == segment length; 2 s is the shortest
// Cloudflare recommends.
// 1280x720@30 on testsrc2, which is what it was before the background
// experiment. testsrc2 moves on its own and the burned-in epoch moves
// regardless, so there is nothing a background was adding.
//
// Size stays tunable via PUB_W/PUB_H/PUB_FPS because it earned that: two
// simultaneous encodes on a half-vCPU instance stalled the stream, and
// being able to drop the budget without rebuilding the image is how that
// got diagnosed.
// A quiet open-fifth triad (A3 + E4 + A4) breathing on a 4 s cycle, instead of
// a bare 440 Hz sine at full scale. The sine was correct and unlistenable; the
// burned-in video clock is what carries the measurement, so the audio only has
// to be present, paced, and not painful.
const CHORD = "aevalsrc='(0.06*sin(2*PI*220*t)+0.05*sin(2*PI*330*t)+0.035*sin(2*PI*440*t))"
  + "*(0.75+0.25*sin(2*PI*0.25*t))':s=48000:c=stereo";

// ── the burned pattern ──────────────────────────────────────────────────────
//
// A COPY of demo/shell/pattern.mjs's ffmpegFilters(), which is where the spec
// lives — the same file draws the browser-canvas version, so the two publishers
// cannot drift apart on the geometry a cross-transport comparison rests on. It
// is duplicated
// here ONLY because the image is built from `COPY server.mjs .`, one file, with
// nothing to import from. src/publish.sh does NOT duplicate it; it generates
// its filter from pattern.mjs directly. If you change one, change the other.
// ⚠️ AND SINCE 2026-09-30 THE TWO CLOCKS' LAYOUT IS THE SAME SPEC AGAIN.
// Asked, verbatim: "test screen: move local timecode to right not to overlap
// with absolute". ABSOLUTE on the left margin, LOCAL hanging from the right
// one, one row, in drawFilters() here and in both renderings in pattern.mjs.
//
// TRAP: drawtext with no `fontfile` resolves to nothing and FAILS SILENTLY, so
// the epoch never reaches the pixels — the one thing that makes glass-to-glass
// measurable. The path below is in ttf-dejavu, which the Dockerfile installs
// (verified against node:22-alpine + ttf-dejavu, 2026-09-07).
//
// MONOSPACE, not DejaVuSans-Bold: in a proportional face the digits shift
// sideways as they change, which is jitter in exactly the region a reader is
// watching. src/publish.sh has used a monospace bold all along.
const FONT = '/usr/share/fonts/dejavu/DejaVuSansMono-Bold.ttf';

// 48-bit epoch ms, MSB first, then the 8-bit XOR of those six bytes.
//
// MUST MATCH demo/shell/pattern.mjs, because readBurned() THERE reads the row
// ffmpeg draws HERE. Moved with it on 2026-09-07 (was X:40 Y:100) so the bed
// sits PAD from the top and is centred on a 1280 frame. `rig/whep/*` and
// `rig/obs-docker/*` still hold the old geometry; each of those is a burner and
// a reader that agree with each other, so they keep working — but "byte-
// identical everywhere" is no longer true and this comment no longer says it.
const PAD = 60;
const FRAME_H = 720;
const ROW = {
  NBLOCKS: 56, BLOCK_W: 20, H: 56,
  X: PAD + 20,
  // at the BOTTOM: the machine's half of the picture, PAD off the bottom edge
  Y: FRAME_H - PAD - 20 - 56,
};
// ⚠️ ROW AND FRAME_H NO LONGER POSITION ANYTHING DRAWN HERE, SINCE 2026-09-29.
// The two burned clocks used to anchor off ROW.Y, which is itself derived from
// this hard-coded FRAME_H rather than the real encode height — harmless while
// there was one line to place, wrong the moment a second stacked line needed
// room below it. drawFilters() now positions both off the actual `h` it is
// passed. ROW stays: it is still the frozen 48-bit bit-encoding geometry that
// `rig/whep/*` and `rig/obs-docker/*` key off, even though nothing in this
// file draws the block row itself (see the note below — removed 2026-09-08).

/** Single-quote a filtergraph option value; the inner escapes are drawtext's. */
const q = (s) => `'${String(s).replace(/'/g, "\\'")}'`;

// The 56-block machine-readable row used to be drawn here too. NOTHING EVER
// READ IT — every reader in the repo is fed by a browser canvas — and it cost a
// measured +16 % encoder CPU on this box, which is one vCPU carrying two
// encodes. Removed 2026-09-08 along with demo/shell/pattern.mjs's generator and
// the PUB_ROW var. See that file's note.

/**
 * The whole -vf chain: a hue rotation and TWO LABELLED CLOCKS.
 *
 * `hue` is a ROTATION of the source's colours, not an absolute hue — testsrc2
 * has no single hue to set. It exists so two publishers are distinguishable at
 * a glance, which is why the two legs below pass different values.
 *
 * The absolute clock is in SECONDS where the canvas prints milliseconds. Not a
 * choice: drawtext's `%{expr_int_format:…:d}` clamps at INT32_MAX, so epoch ms
 * (1.79e12) prints as 2147483647 and ffmpeg says "Conversion of floating-point
 * result to int failed" — measured. Hence the unit printed beside the number.
 */
function drawFilters({ epoch, hue = 0, w = 1280, h = 720 }) {
  // Same typography as the browser canvas: a small brand-yellow word over a big
  // light number, on a dark scrim rather than a white slab. Not hue-rotated,
  // because `hue=` is applied to the source first and drawtext paints after
  // it, so #ffd400 is the shell's #ffd400 on every leg whatever its rotation.
  // 🔴 SIDE BY SIDE, ONE ROW, NEVER OVERLAPPING. ASKED 2026-09-30, VERBATIM:
  // "test screen: move local timecode to right not to overlap with absolute".
  // The grab showed the old two column layout still live, with the absolute
  // number running UNDER the local one, because this container had not been
  // redeployed since 2026-09-25 and the 2026-09-29 stack never reached it.
  const text = (t, x, y, size, colour) => [
    `drawtext=fontfile=${q(FONT)}`, `text=${q(t)}`,
    `x=${x}`, `y=${y}`, `fontsize=${size}`, `fontcolor=${colour}`,
    'box=1', 'boxcolor=black@0.55', 'boxborderw=14',
  ].join(':');
  const NUM = 64, LBL = 28;   // same sizes as the canvas
  // 🔴 ffmpeg's `y` IS THE TOP OF THE TEXT BOX AND THE CANVAS'S IS THE
  // BASELINE, SO ONE HAS TO BE CONVERTED INTO THE OTHER. 0.774 is that ratio,
  // read back off the numbers this file shipped with (32 px label offset 25,
  // 84 px number offset 65).
  const top = (baseline, size) => Math.round(baseline - 0.774 * size);
  // EXPRESSED AGAINST `w` AND `h`, THE REAL ENCODE SIZE PASSED IN FROM args()/
  // whipArgs(), never a hard-coded 1280x720, and in `demo/shell/pattern.mjs`'s
  // own form, because this is the third copy of one picture and nothing here
  // can import that file (the image is `COPY server.mjs .`). The bed sits PAD
  // off the bottom, is 56 tall and carries a 20 px lip; the numbers' baseline
  // sits PAD above it and the labels' 80 above that. At h=720 that is 504 and
  // 424, which is what `node demo/shell/pattern.mjs --epoch=…` prints.
  const ROW_Y = h - PAD - 20 - 56;
  const NUM_Y = ROW_Y - 20 - PAD;
  const LBL_Y = NUM_Y - 80;
  // 🔴 THE RIGHT COLUMN IS DERIVED FROM THE WIDEST STRING THIS DRAWS, NOT FROM
  // A CHARACTER COUNT BORROWED FROM THE CANVAS. That borrowing is exactly what
  // put LOCAL on top of the absolute number: the old COL2 reserved 13
  // characters, the canvas's epoch in ms, while this side prints
  // `%{pts:flt:…}`, which formats with `%.6f`: `1790752257.100333 s`, NINETEEN
  // characters. MEASURED 2026-09-30 on ffmpeg@7, a 760 px box, 732 of text
  // and 14 px of border each side. LOCAL is `%H:%M:%S`, eight characters.
  // ADVANCE is DejaVu Sans Mono Bold's, 1233 of 2048 units for every glyph
  // printed here, read out of the font's hmtx table, because drawtext cannot
  // measure a string before drawing it. Same numbers as `ffmpegColumns()` in
  // pattern.mjs: at 1280 the absolute column is 732 px wide from x=60, LOCAL
  // starts at x=912, and the two BOXES have 91 px of clear space between them.
  const ADVANCE = 1233 / 2048;
  const widest = (chars, size) => chars * ADVANCE * size;
  const COL2 = Math.round(w - PAD - Math.max(widest(8, NUM), widest(5, LBL)));
  const LABEL = '0xFFD400';
  const VALUE = '0xE9EEF7';
  return [
    // hue FIRST: rotating chroma afterwards would tint the white boxes.
    ...(hue ? [`hue=h=${((hue % 360) + 360) % 360}`] : []),
    // FOUR draws: a small word over a big number, twice, ABSOLUTE on the left
    // and LOCAL on the right. No source label: the hue says which publisher
    // this is, and a name burned into a picture is a small text nobody can
    // read at the size a demo shows it.
    text('ABSOLUTE', PAD, top(LBL_Y, LBL), LBL, LABEL),
    // pts-derived, the same instant the row encodes.
    text(`%{pts\\:flt\\:${epoch}} s`, PAD, top(NUM_Y, NUM), NUM, VALUE),
    text('LOCAL', COL2, top(LBL_Y, LBL), LBL, LABEL),
    // LEGIBLE: this box's own wall clock, for a human with a watch. The two
    // drifting apart is real information: it is encoder drift.
    // The triple backslash is not a typo: gmtime's strftime argument has to
    // survive drawtext's expansion parser, which splits `%{name:args}` on a
    // bare colon. Measured on ffmpeg@7: `\\\:` renders 15:31:25, `\:` errors
    // with "%{gmtime} requires at most 1 arguments".
    text('%{gmtime\\:%H\\\\\\:%M\\\\\\:%S}', COL2, top(NUM_Y, NUM), NUM, VALUE),
  ].join(',');
}

/**
 * tracks: "av" (default), "v" (video only) or "a" (audio only).
 *
 * This exists to settle a specific question rather than for variety. At startup
 * Cloudflare lands the audio track seconds behind the video track, and
 * video.buffered in the browser is their INTERSECTION — so the element has
 * ~0.05 s to play while video holds 5 s, which is what makes 06 stutter for the
 * first ~20 s. A video-only stream has no audio group at all. If the stutter
 * disappears there, audio is the cause; if it survives, it is not.
 */
function args({ key, fps = 30, bitrate = '2500k', w = 1280, h = 720, tracks = 'av' }) {
  const gop = fps * 2;
  // %{pts:flt:OFFSET} — `basetime` does NOT work here (measured, publish.sh).
  const epoch = (Date.now() / 1000).toFixed(6);
  const draw = drawFilters({ epoch, hue: 0, w, h });   // see the note above
  const src = sourceArgs({ w, h, fps });
  const wantV = tracks !== 'a';
  const wantA = tracks !== 'v';
  return [
    '-hide_banner', '-loglevel', 'warning',
    // -re IS A PER-INPUT OPTION. It was on the video only, so lavfi's sine was
    // read unpaced and ffmpeg raced audio ahead of video into the muxer queue —
    // on a demuxed LL-HLS stream that is exactly what makes audio and video
    // ranges stop overlapping at the client, and video.buffered on a
    // MediaSource is their INTERSECTION. The WHIP leg below always had it on
    // both, and so does src/publish.sh; only this leg was wrong.
    //
    // The container-vs-local A/B could not have caught this: the local arm was
    // given these same args, so both sides shared the defect.
    // The film (or `testsrc2` when `PUB_SOURCE` is empty). See `sourceArgs`.
    ...(wantV ? src.input : []),
    // ⚠️ THE CHORD IS ONLY FOR A SOURCE WITH NO SOUND OF ITS OWN. A sine triad
    // under a church scene is not a stand-in, it is a second thing happening.
    ...(wantA && !SOURCE ? ['-re', '-f', 'lavfi', '-i', CHORD] : []),
    ...(wantA && SOURCE && !wantV ? ['-re', '-stream_loop', '-1', '-i', SOURCE] : []),
    // ⚠️ EXPLICIT MAPS, because two inputs and no map is ffmpeg guessing, and
    // what it guesses changed the moment input 0 gained an audio stream.
    ...(wantV && wantA && !SOURCE ? ['-map', '0:v:0', '-map', '1:a:0'] : []),
    ...(wantV && wantA && SOURCE ? ['-map', '0:v:0', '-map', '0:a:0?'] : []),
    ...(wantV ? vf(src.pre, draw) : []),
    ...(wantV ? [
      '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
      '-profile:v', 'main', '-pix_fmt', 'yuv420p',
      '-b:v', bitrate, '-minrate', bitrate, '-maxrate', bitrate, '-bufsize', bitrate,
      '-g', String(gop), '-keyint_min', String(gop), '-sc_threshold', '0',
      '-bf', '0',                                // B-frames OFF for LL-HLS
    ] : []),
    ...(wantA ? ['-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2'] : []),
    '-f', 'flv', `rtmps://live.cloudflare.com:443/live/${key}`,
  ];
}

/**
 * WHIP args as MEASURED in rig/whep/WHIP-FFMPEG-NOTES.md, not invented:
 *  · libopus, not aac — the whip muxer defaults h264+opus
 *  · baseline/3.1 offers profile-level-id=42001f, which Cloudflare ACCEPTS and
 *    echoes verbatim; the 42e01f in the docs is a documentation value, not a
 *    negotiation gate (run 1 of those notes proved it first try)
 *  · -bf 0 for the same reason as the RTMPS leg
 */
/**
 * 🔴 THE FILM, ALREADY WHIP SHAPED, SENT WITHOUT ENCODING. MEASURED 2026-09-30:
 * the film re-encoded on the main box ran at about 0.6x realtime (`-re` lag
 * 9.8 s growing to 29.3 s over 90 s), because the original is H.264 Main with
 * B-frames, a 5.12 s GOP and AAC, none of which the whip muxer can pass
 * through. This copy is baseline 3.1, no B-frames, a 2 s GOP at 25 fps and
 * Opus 48 kHz, made once off the original, so the leg is a copy and costs a
 * demux and a packetiser rather than an x264.
 * ⚠️ NO BURN IS POSSIBLE HERE: a copied stream has no pixels to draw on.
 */
const FILM_WHIP = 'https://positron-station.kristjan-jansen.workers.dev'
  + '/media/mimproject/mim-goes-sustainable-2011-kirikustseen-whip.mp4';
function whipCopyArgs(url) {
  return [
    '-hide_banner', '-loglevel', 'warning',
    '-re', '-stream_loop', '-1', '-i', FILM_WHIP,
    '-map', '0:v:0', '-map', '0:a:0',
    '-c:v', 'copy', '-bsf:v', 'h264_mp4toannexb', '-c:a', 'copy',
    ...whipOut(url),
  ];
}

/**
 * A PER-REQUEST OVERRIDE, FOR /stage/'S OWN INSTANCE. That instance runs this
 * image with the same container env as the main one (the test pattern and the
 * clocks), so the WHIP leg takes `source` ('film-copy', 'film' or 'testsrc2', nothing
 * else, so a body cannot point ffmpeg at an arbitrary URL) and `burn` (a
 * boolean) in the /start-whip body. Both absent is the env, as before.
 */
const pickSource = (v) => (v === 'film' ? FILM : v === 'testsrc2' ? '' : SOURCE);

function whipArgs({ url, fps = 30, bitrate = '2000k', w = 1280, h = 720, source, burn }) {
  const SRC = pickSource(source);
  const BRN = typeof burn === 'boolean' ? burn : BURN;
  // NOTHING ENCODED: the pre-transcoded film goes out as it is stored.
  if (source === 'film-copy') return whipCopyArgs(url);
  const gop = fps * 2;
  const epoch = (Date.now() / 1000).toFixed(6);
  // A DIFFERENT hue from the RTMPS leg, deliberately. They are two ffmpeg
  // processes on two Cloudflare inputs — the page already says so — and any
  // page showing them side by side needs to tell them apart.
  const draw = drawFilters({ epoch, hue: 150, w, h });
  const src = sourceArgs({ w, h, fps }, SRC);
  return [
    '-hide_banner', '-loglevel', 'warning',
    // The film, or `testsrc2` when `PUB_SOURCE` is empty. See `sourceArgs`.
    ...src.input,
    // The 440 sine only when the source is silent, for the reason on the RTMPS
    // leg: a tone under a performance is a second thing happening.
    ...(SRC ? [] : ['-re', '-f', 'lavfi', '-i', 'sine=frequency=440']),
    ...(SRC ? ['-map', '0:v:0', '-map', '0:a:0?'] : ['-map', '0:v:0', '-map', '1:a:0']),
    ...vf(src.pre, draw, BRN),
    '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.1',
    '-bf', '0', '-pix_fmt', 'yuv420p', '-g', String(gop), '-b:v', bitrate,
    '-c:a', 'libopus', '-ar', '48000', '-ac', '2',
    ...whipOut(url),
  ];
}

// ── secret hygiene ────────────────────────────────────────────────────────
// The header above claims the key is "never logged". Truncating a tail is not
// redaction: ffmpeg echoes the FULL RTMPS URL in its error messages ("Error
// opening output files"), and /status serves that tail publicly. Measured on
// 2026-09-04: a failed run leaked the key verbatim into plain output. Scrub at
// the point of capture so an unredacted secret is never held in memory.
const secrets = new Set();
const remember = (v) => { if (typeof v === 'string' && v.length >= 8) secrets.add(v); };
function redact(s) {
  if (!s) return s;
  let out = s;
  for (const sec of secrets) out = out.split(sec).join('<redacted>');
  // belt and braces: scrub the URL shapes even for a secret never registered
  out = out.replace(/(rtmps?:\/\/[^\s/]+\/live\/)[^\s'"]+/gi, '$1<redacted>');
  out = out.replace(/([?&](?:token|key|signature)=)[^\s&'"]+/gi, '$1<redacted>');
  return out;
}

/**
 * How long to leave a failed leg alone before retrying it.
 *
 * Cloudflare holds a WHIP input against a stale publisher: a leg that died with
 * "Error muxing a packet / Resource temporarily unavailable" (exit 245) cannot
 * be restarted immediately — measured, it needs roughly 45 s before the input
 * accepts a new session.
 */
const LEG_RETRY_MS = 45_000;

function startLeg(name, argv) {
  const cur = legs[name];
  if (cur?.proc) return { already: true };
  // A DEAD leg used to stay in `legs` forever, and `if (legs[name])` above then
  // reported {already: true} — so the Worker's 30 s sweep believed the leg was
  // running and NEVER restarted it. The WHIP leg died with exit 245 and stayed
  // down until a human ran /stop, waited for publishing:false, waited another
  // 45 s and ran /start. That ritual is now the code's job.
  if (cur?.dead) {
    const since = Date.now() - (cur.diedAt || 0);
    if (since < LEG_RETRY_MS) {
      return { retryIn: Math.ceil((LEG_RETRY_MS - since) / 1000), error: cur.error };
    }
    legs[name] = null;                       // eligible again
  }
  const p = spawn('ffmpeg', argv, { stdio: ['ignore', 'ignore', 'pipe'] });
  const st = {
    proc: p, startedAt: Date.now(), stderr: '', error: null, stopping: false,
    restarts: (cur?.restarts || 0) + (cur?.dead ? 1 : 0),
  };
  legs[name] = st;
  p.stderr.on('data', (b) => { st.stderr = redact(st.stderr + b.toString()).slice(-1200); });
  p.on('exit', (code, sig) => {
    const clean = st.stopping || code === 0 || code === null || sig === 'SIGTERM' || code === 255;
    if (!clean) st.error = `exit ${code}${sig ? ' ' + sig : ''}`;
    // Keep the record so the retry timer has something to measure from, but
    // mark WHEN it died so the sweep can act on its own.
    legs[name] = st.error
      ? { ...st, proc: null, dead: true, diedAt: Date.now() }
      : null;
  });
  return { started: true, restarts: st.restarts };
}

function stopLeg(name) {
  const st = legs[name];
  if (!st || !st.proc) { legs[name] = null; return { already: true }; }
  st.stopping = true;
  try { st.proc.kill('SIGTERM'); } catch { /* gone */ }
  return { stopped: true };
}

function legState(name) {
  const st = legs[name];
  if (!st) return { publishing: false, uptimeS: 0, error: null };
  const out = {
    publishing: !!st.proc,
    uptimeS: st.proc ? Math.round((Date.now() - st.startedAt) / 1000) : 0,
    error: st.error,
    restarts: st.restarts || 0,
    stderrTail: redact(st.stderr).slice(-300) || null,
  };
  if (st.dead) {
    const since = Date.now() - (st.diedAt || 0);
    out.dead = true;
    out.retryInS = Math.max(0, Math.ceil((LEG_RETRY_MS - since) / 1000));
  }
  return out;
}

let tracksMode = null;

function start(opts) {
  if (ff) return { already: true };
  lastError = null;
  lastStderr = '';
  stopping = false;
  tracksMode = opts.tracks || 'av';
  ff = spawn('ffmpeg', args(opts), { stdio: ['ignore', 'ignore', 'pipe'] });
  startedAt = Date.now();
  ff.stderr.on('data', (b) => {
    // keep a tail only; ffmpeg is chatty and the key must never be echoed
    lastStderr = redact(lastStderr + b.toString()).slice(-1500);
  });
  ff.on('exit', (code, sig) => {
    // 255 is what ffmpeg returns for a SIGTERM it handled — i.e. exactly what
    // an intentional /stop looks like. Reporting that as lastError made a clean
    // shutdown read as a failure.
    const clean = stopping || code === 0 || code === null || sig === 'SIGTERM' || code === 255;
    if (!clean) lastError = `ffmpeg exit ${code}${sig ? ` ${sig}` : ''}`;
    ff = null;
    startedAt = 0;
    stopping = false;
  });
  return { started: true };
}

function stop() {
  if (!ff) return { already: true };
  stopping = true;
  try { ff.kill('SIGTERM'); } catch { /* gone */ }
  return { stopped: true };
}

// ── the camera leg ───────────────────────────────────────────────────────
//
// A THIRD LEG, AND IT RE-ENCODES NOTHING. `/cam/` records its burned camera
// canvas with MediaRecorder (H.264 in WebM, a keyframe every 2 s, no
// B-frames, which is Cloudflare's LL-HLS recipe arriving straight out of the
// browser), the Pub Durable Object holds the page's socket and POSTs each
// chunk here, and ffmpeg only REWRAPS WebM into FLV for RTMPS. MEASURED in
// plans/plan-cam-llhls.md: a copy costs about 0.5 per cent of realtime where
// a third x264 would not fit on this vCPU at all.
//
// 🔴 IT RUNS ON ITS OWN INSTANCE (`cam`) AND PUBLISHES TO ITS OWN INPUT
// (CAM_STREAM_KEY). Until 2026-09-30 it borrowed the test pattern's input by
// handover, and /llhls/ stalled while a camera was tested on it, because every
// hand back is a new Stream video UID. So this leg and the pattern do not know
// about each other: no waiting on `ff`, and /start does not end a camera.
// ⚠️ INDEPENDENT OF `ff` AND `legs.whip`, so a /stop never touches it. /stop
// is about the pattern; /cam/stop is about the camera.
const CAM_IDLE_MS = 5_000;      // no chunk for this long and the leg stops itself
const CAM_MAX_MS = 330_000;     // the DO caps a session at 300 s; this is the floor under it
const CAM_MAX_BUFFER = 8 << 20; // bytes queued on stdin before we call RTMPS stalled
// ⚠️ TESTING ONLY. Points the camera leg's output somewhere other than Stream,
// so the whole leg can be graded on a laptop with zero bytes to anybody's
// server (plans/plan-cam-llhls.md section 6). Unset in the image.
const CAM_OUT = process.env.PUB_CAM_OUT || '';
let cam = null;
let camLast = null;   // the last session's end, for /status after it is gone

function camArgs({ key, fmt }) {
  const out = CAM_OUT || `rtmps://live.cloudflare.com:443/live/${key}`;
  return [
    '-hide_banner', '-loglevel', 'warning',
    // No probing: the first chunk carries the header and ffmpeg starts on it.
    // No -re: the camera paces this input already.
    // 🔴 AND NO `-fflags nobuffer`, WHICH THE PLAN'S RECIPE HAD. MEASURED
    // 2026-09-30 on one MediaRecorder capture piped in three ways: with it the
    // output began at 1.78 to 2.04 s and 115 of 171 frames came out, because
    // the packets read while probing were thrown away, and they are the whole
    // first GOP. Without it, frame 0 is a keyframe at 0.000 and all 171 arrive.
    // The plan measured how SOON output appeared, which nobuffer does not hurt;
    // it did not count what was missing.
    '-probesize', '32', '-analyzeduration', '0',
    '-f', fmt === 'mp4' ? 'mp4' : 'webm', '-i', 'pipe:0',
    '-map', '0:v:0', '-c:v', 'copy', '-an',
    '-f', 'flv', out,
  ];
}

const exited = (p, ms) => new Promise((r) => {
  if (!p || p.exitCode !== null || p.signalCode !== null) return r(true);
  const t = setTimeout(() => r(false), ms);
  p.once('exit', () => { clearTimeout(t); r(true); });
});

async function camOpen({ key, fmt, sid }) {
  if (cam) await camStop('replaced by a new camera session');
  const p = spawn('ffmpeg', camArgs({ key, fmt }), { stdio: ['pipe', 'ignore', 'pipe'] });
  const st = {
    proc: p, sid: String(sid || ''), fmt, startedAt: Date.now(), lastChunkAt: Date.now(),
    bytesIn: 0, chunks: 0, stderr: '', error: null, why: null, stopping: false,
  };
  cam = st;
  p.stdin.on('error', () => { /* ffmpeg went away; the exit handler says why */ });
  p.stderr.on('data', (b) => { st.stderr = redact(st.stderr + b.toString()).slice(-1200); });
  p.on('exit', (code, sig) => {
    const clean = st.stopping || code === 0 || code === null || sig === 'SIGTERM' || code === 255;
    if (!clean) st.error = `exit ${code}${sig ? ' ' + sig : ''}`;
    st.endedAt = Date.now();
    camLast = st;
    if (cam === st) cam = null;
  });
  return { started: true, sid: st.sid };
}

function camChunk(sid, buf) {
  const st = cam;
  if (!st || !st.proc) return { error: 'no camera session', status: 409 };
  if (sid && st.sid && sid !== st.sid) return { error: 'not the current camera session', status: 409 };
  st.lastChunkAt = Date.now();
  st.bytesIn += buf.length;
  st.chunks++;
  try { st.proc.stdin.write(buf); } catch { /* the exit handler says why */ }
  if (st.proc.stdin.writableLength > CAM_MAX_BUFFER) {
    camStop('the RTMPS side stopped taking bytes');
    return { error: 'stalled', status: 503 };
  }
  return { ok: true };
}

/** End stdin so ffmpeg flushes and closes RTMPS cleanly; SIGTERM if it will not. */
async function camStop(why) {
  const st = cam;
  if (!st || !st.proc) return { already: true };
  st.stopping = true;
  st.why = why || 'stopped';
  try { st.proc.stdin.end(); } catch { /* gone */ }
  if (!(await exited(st.proc, 3000))) {
    try { st.proc.kill('SIGTERM'); } catch { /* gone */ }
    if (!(await exited(st.proc, 2000))) { try { st.proc.kill('SIGKILL'); } catch { /* gone */ } }
  }
  return { stopped: true, why: st.why };
}

function camState() {
  const st = cam || camLast;
  if (!st) return { publishing: false };
  const now = Date.now();
  return {
    publishing: !!(cam && cam.proc),
    sid: st.sid || null,
    fmt: st.fmt,
    uptimeS: Math.round(((cam ? now : st.endedAt || now) - st.startedAt) / 1000),
    bytesIn: st.bytesIn,
    chunks: st.chunks,
    lastChunkAgoMs: now - st.lastChunkAt,
    why: st.why,
    error: st.error,
    stderrTail: redact(st.stderr).slice(-300) || null,
  };
}

// THE CONTAINER'S OWN WATCHDOG, the third of three independent stops. A DO that
// lost its state, or a socket that went quiet without closing, cannot leave an
// encoder publishing into Stream with nobody at the other end.
setInterval(() => {
  if (!cam || !cam.proc || cam.stopping) return;
  const now = Date.now();
  if (now - cam.lastChunkAt > CAM_IDLE_MS) camStop(`no chunk for ${Math.round((now - cam.lastChunkAt) / 1000)} s`);
  else if (now - cam.startedAt > CAM_MAX_MS) camStop('the session reached its length cap');
}, 1000).unref();

const readBody = async (req) => {
  const parts = [];
  for await (const c of req) parts.push(c);
  return Buffer.concat(parts);
};

const json = (res, obj, status = 200) => {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://c');

  if (url.pathname === '/status') {
    return json(res, {
      publishing: !!ff,
      uptimeS: ff ? Math.round((Date.now() - startedAt) / 1000) : 0,
      containerUpS: Math.round((Date.now() - BOOT) / 1000),
      pid: ff ? ff.pid : null,
      lastError,
      tracks: tracksMode,
      stderrTail: redact(lastStderr).slice(-400) || null,
      whip: legState('whip'),
      cam: camState(),
    });
  }

  if (url.pathname === '/start' && req.method === 'POST') {
    let body = '';
    for await (const c of req) body += c;
    let opts = {};
    try { opts = JSON.parse(body || '{}'); } catch { return json(res, { error: 'bad json' }, 400); }
    if (!opts.key) return json(res, { error: 'key required' }, 400);
    remember(opts.key);
    return json(res, start(opts));
  }

  if (url.pathname === '/stop' && req.method === 'POST') {
    stopLeg('whip');
    return json(res, stop());
  }

  if (url.pathname === '/start-whip' && req.method === 'POST') {
    let body = '';
    for await (const ch of req) body += ch;
    let o = {};
    try { o = JSON.parse(body || '{}'); } catch { return json(res, { error: 'bad json' }, 400); }
    if (!o.url) return json(res, { error: 'url required' }, 400);
    remember(o.url);
    return json(res, startLeg('whip', whipArgs(o)));
  }

  if (url.pathname === '/stop-whip' && req.method === 'POST') return json(res, stopLeg('whip'));

  if (url.pathname === '/cam/open' && req.method === 'POST') {
    let o = {};
    try { o = JSON.parse((await readBody(req)).toString() || '{}'); } catch { return json(res, { error: 'bad json' }, 400); }
    if (!o.key) return json(res, { error: 'key required' }, 400);
    remember(o.key);
    return json(res, await camOpen(o));
  }
  if (url.pathname === '/cam/chunk' && req.method === 'POST') {
    const r = camChunk(url.searchParams.get('sid') || '', await readBody(req));
    return json(res, r, r.status || 200);
  }
  if (url.pathname === '/cam/stop' && req.method === 'POST') {
    let o = {};
    try { o = JSON.parse((await readBody(req)).toString() || '{}'); } catch { /* a bare stop is fine */ }
    // A stop for a session that is no longer current must not end the new one.
    if (o.sid && cam && cam.sid && o.sid !== cam.sid) return json(res, { already: true, current: cam.sid });
    return json(res, await camStop(o.why || 'stopped'));
  }

  return json(res, { error: 'use /start /stop /status /cam/open /cam/chunk /cam/stop' }, 404);
}).listen(PORT, () => console.log(`pub container on :${PORT}`));
