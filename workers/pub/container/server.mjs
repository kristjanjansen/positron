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
function args({ key, fps = 30, bitrate = '2500k', w = 1280, h = 720 }) {
  const gop = fps * 2;
  const epoch = (Date.now() / 1000).toFixed(6);
  // %{pts:flt:OFFSET} — `basetime` does NOT work here (measured, publish.sh).
  const draw = [
    // explicit fontfile: drawtext with no font resolves to nothing and the
    // epoch never reaches the pixels — a silent failure of the one thing
    // that makes glass-to-glass measurable
    `drawtext=fontfile=/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf`,
    `text='%{pts\\:flt\\:${epoch}}'`,
    'x=36', 'y=36', 'fontsize=52', 'fontcolor=black',
    'box=1', 'boxcolor=white', 'boxborderw=13',
  ].join(':');
  return [
    '-hide_banner', '-loglevel', 'warning',
    '-re',
    '-f', 'lavfi', '-i', `testsrc2=size=${w}x${h}:rate=${fps}`,
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000',
    '-vf', draw,
    '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
    '-profile:v', 'main', '-pix_fmt', 'yuv420p',
    '-b:v', bitrate, '-minrate', bitrate, '-maxrate', bitrate, '-bufsize', bitrate,
    '-g', String(gop), '-keyint_min', String(gop), '-sc_threshold', '0',
    '-bf', '0',                                  // B-frames OFF for LL-HLS
    '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2',
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
function whipArgs({ url, fps = 30, bitrate = '2000k', w = 1280, h = 720 }) {
  const gop = fps * 2;
  const epoch = (Date.now() / 1000).toFixed(6);
  const draw = [
    'drawtext=fontfile=/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
    `text='%{pts\\:flt\\:${epoch}}'`,
    'x=36', 'y=36', 'fontsize=52', 'fontcolor=black',
    'box=1', 'boxcolor=white', 'boxborderw=13',
  ].join(':');
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

function startLeg(name, argv) {
  if (legs[name]) return { already: true };
  const p = spawn('ffmpeg', argv, { stdio: ['ignore', 'ignore', 'pipe'] });
  const st = { proc: p, startedAt: Date.now(), stderr: '', error: null, stopping: false };
  legs[name] = st;
  p.stderr.on('data', (b) => { st.stderr = redact(st.stderr + b.toString()).slice(-1200); });
  p.on('exit', (code, sig) => {
    const clean = st.stopping || code === 0 || code === null || sig === 'SIGTERM' || code === 255;
    if (!clean) st.error = `exit ${code}${sig ? ' ' + sig : ''}`;
    const keep = st.error;
    legs[name] = keep ? { ...st, proc: null, dead: true } : null;
  });
  return { started: true };
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
  return {
    publishing: !!st.proc,
    uptimeS: st.proc ? Math.round((Date.now() - st.startedAt) / 1000) : 0,
    error: st.error,
    stderrTail: redact(st.stderr).slice(-300) || null,
  };
}

function start(opts) {
  if (ff) return { already: true };
  lastError = null;
  lastStderr = '';
  stopping = false;
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
