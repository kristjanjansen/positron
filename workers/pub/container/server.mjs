// positron-pub container — ffmpeg publisher for the Act 1 demos.
//
// One test pattern with an ABSOLUTE EPOCH BURNED INTO THE PIXELS, pushed to
// Cloudflare Stream over RTMPS. The burn is the whole point: glass-to-glass
// latency is then measurable from a screenshot alone, and the SAME burn is
// comparable across every transport 09 ladder puts side by side.
//
//   POST /start   {key, fps?, bitrate?}   -> begin publishing (idempotent)
//   POST /stop                            -> kill ffmpeg
//   GET  /status                          -> {publishing, uptimeS, pid, lastError}
//
// The stream key arrives in the POST body from the Worker, which reads it from
// a Worker secret. It is never baked into the image and never logged.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

const PORT = 8080;
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
// cannot drift apart on the geometry that 09 ladder compares. It is duplicated
// here ONLY because the image is built from `COPY server.mjs .`, one file, with
// nothing to import from. src/publish.sh does NOT duplicate it; it generates
// its filter from pattern.mjs directly. If you change one, change the other.
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
const ROW = { NBLOCKS: 56, BLOCK_W: 20, X: PAD + 20, Y: PAD + 20, H: 80 };

/** Single-quote a filtergraph option value; the inner escapes are drawtext's. */
const q = (s) => `'${String(s).replace(/'/g, "\\'")}'`;

/**
 * The 56-block row as 57 drawboxes, each gated by an `enable` expression.
 *
 * MEASURED 2026-09-07, ffmpeg@7, 1280x720@30 through these exact x264 settings,
 * decoded back out with readBurned()'s own algorithm: 150 of 150 frames
 * checksum-clean, worst error 0 ms, and a deliberately corrupted block IS
 * rejected. Cost: +16 % encoder-process CPU (utime 3.095 s -> 3.598 s per 20 s
 * of video).
 *
 * OFF BY DEFAULT ANYWAY. This box is 1 vCPU running TWO 720p30 encodes, and
 * half a vCPU already stalled that pair once (wrangler.jsonc). +16 % on each leg
 * is a real bite out of a budget nobody has re-measured on the actual instance,
 * and the only way to find out is to switch it on for one run and watch EXTINF
 * sd — which is 0.003 s today and is what a starved encoder wrecks first.
 * Flip PUB_ROW=1 in the worker's vars; no image rebuild needed.
 */
function rowFilters(epoch) {
  const ms = `floor((t+${epoch})*1000)`;
  const bit = (n) => `mod(floor(${ms}/${2 ** n}),2)`;
  const exprs = [];
  for (let i = 0; i < 48; i++) exprs.push(bit(47 - i));
  for (let i = 48; i < ROW.NBLOCKS; i++) {
    // XOR of one bit position across six bytes is the parity of their sum,
    // which the expression language CAN do — it has no xor.
    const k = ROW.NBLOCKS - 1 - i;
    exprs.push(`mod(${[0, 1, 2, 3, 4, 5].map((m) => bit(8 * m + k)).join('+')},2)`);
  }
  return [
    `drawbox=x=${ROW.X - 20}:y=${ROW.Y - 20}:w=${ROW.NBLOCKS * ROW.BLOCK_W + 40}`
      + `:h=${ROW.H + 40}:color=black:t=fill`,
    ...exprs.map((e, i) => `drawbox=x=${ROW.X + i * ROW.BLOCK_W}:y=${ROW.Y}`
      + `:w=${ROW.BLOCK_W}:h=${ROW.H}:color=white:t=fill:enable='${e}'`),
  ];
}

/**
 * The whole -vf chain: hue, optional row, and TWO LABELLED CLOCKS.
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
function drawFilters({ epoch, hue = 0, row = false }) {
  // Same typography as the browser canvas: a small brand-yellow word over a big
  // light number, on a dark scrim rather than a white slab. Not hue-rotated —
  // `hue=` is applied to the source first and drawtext paints after it, so
  // #ffd400 is the shell's #ffd400 on every leg whatever its rotation.
  const text = (t, y, size, colour) => [
    `drawtext=fontfile=${q(FONT)}`, `text=${q(t)}`,
    `x=${PAD}`, `y=${y}`, `fontsize=${size}`, `fontcolor=${colour}`,
    'box=1', 'boxcolor=black@0.55', 'boxborderw=14',
  ].join(':');
  const NUM = 96;             // one size for both clocks, as on the canvas
  const LABEL = '0xFFD400';
  const VALUE = '0xE9EEF7';
  return [
    // hue FIRST: rotating chroma afterwards would tint the white boxes and,
    // with the row on, the row itself — which readBurned thresholds on.
    ...(hue ? [`hue=h=${((hue % 360) + 360) % 360}`] : []),
    ...(row ? rowFilters(epoch) : []),
    // FOUR draws, mirroring burn()'s layout: a small word, then a big number,
    // twice. No source label — the hue says which publisher this is, and a name
    // burned into a picture is a small text nobody can read at the size a demo
    // shows it.
    text('ABSOLUTE', 230, 34, LABEL),
    // pts-derived, the same instant the row encodes.
    text(`%{pts\\:flt\\:${epoch}} s`, 280, NUM, VALUE),
    text('LOCAL', 420, 34, LABEL),
    // LEGIBLE — this box's own wall clock, for a human with a watch. The two
    // drifting apart is real information: it is encoder drift.
    // The triple backslash is not a typo: gmtime's strftime argument has to
    // survive drawtext's expansion parser, which splits `%{name:args}` on a
    // bare colon. Measured on ffmpeg@7 — `\\\:` renders 15:31:25, `\:` errors
    // with "%{gmtime} requires at most 1 arguments".
    text('%{gmtime\\:%H\\\\\\:%M\\\\\\:%S}', 465, NUM, VALUE),
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
function args({ key, fps = 30, bitrate = '2500k', w = 1280, h = 720, tracks = 'av', row = false }) {
  const gop = fps * 2;
  // %{pts:flt:OFFSET} — `basetime` does NOT work here (measured, publish.sh).
  const epoch = (Date.now() / 1000).toFixed(6);
  const draw = drawFilters({ epoch, hue: 0, row });
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
    ...(wantV ? ['-re', '-f', 'lavfi', '-i', `testsrc2=size=${w}x${h}:rate=${fps}`] : []),
    ...(wantA ? ['-re', '-f', 'lavfi', '-i', CHORD] : []),
    ...(wantV ? ['-vf', draw] : []),
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
function whipArgs({ url, fps = 30, bitrate = '2000k', w = 1280, h = 720, row = false }) {
  const gop = fps * 2;
  const epoch = (Date.now() / 1000).toFixed(6);
  // A DIFFERENT hue from the RTMPS leg, deliberately. They are two ffmpeg
  // processes on two Cloudflare inputs — the page already says so — and 09
  // ladder shows them side by side, where telling them apart is the point.
  const draw = drawFilters({ epoch, hue: 150, row });
  return [
    '-hide_banner', '-loglevel', 'warning',
    '-re', '-f', 'lavfi', '-i', `testsrc2=size=${w}x${h}:rate=${fps}`,
    '-re', '-f', 'lavfi', '-i', 'sine=frequency=440',
    '-vf', draw,
    '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.1',
    '-bf', '0', '-pix_fmt', 'yuv420p', '-g', String(gop), '-b:v', bitrate,
    '-c:a', 'libopus', '-ar', '48000', '-ac', '2',
    '-f', 'whip', url,
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

  return json(res, { error: 'use /start /stop /status' }, 404);
}).listen(PORT, () => console.log(`pub container on :${PORT}`));
