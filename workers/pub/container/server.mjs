// positron-pub container: ffmpeg for /stage/'s film and the LL-HLS loopback.
//
//   POST /start-whip {url, source: 'film-copy'} -> the film copied onto WHIP (idempotent)
//   POST /stop                            -> end the WHIP leg
//   GET  /status                          -> {publishing, containerUpS, whip, cam}
//   POST /cam/open  {key, fmt, sid}       -> a camera's WebM rewrapped to RTMPS
//   POST /cam/chunk?sid=                  -> one MediaRecorder chunk onto its stdin
//   POST /cam/stop  {sid?, why?}          -> end the camera leg
//
// The WHIP URL and the stream key arrive in the POST body from the Worker,
// which reads them from Worker secrets. They are never baked into the image
// and never logged.
// The test pattern's RTMPS leg and its burned clocks were removed 2026-10-14;
// why they were built that way: .claude/skills/positron-streaming/SKILL.md.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

const PORT = Number(process.env.PORT) || 8080;   // the image uses 8080; a laptop test may not
const BOOT = Date.now();

const legs = { whip: null };

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

// ── the camera leg ───────────────────────────────────────────────────────
//
// /video/llhls/'s MediaRecorder chunks (H.264 in WebM, 2 s keyframes, no
// B-frames) arrive from the DO and ffmpeg only rewraps them to FLV for RTMPS:
// about 0.5 per cent of realtime, where an x264 would not fit on this vCPU
// (plans/plan-cam-llhls.md). Independent of `legs.whip`: /stop never ends it.
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
    const whip = legState('whip');
    return json(res, {
      publishing: whip.publishing,
      containerUpS: Math.round((Date.now() - BOOT) / 1000),
      whip,
      cam: camState(),
    });
  }

  if (url.pathname === '/stop' && req.method === 'POST') return json(res, stopLeg('whip'));

  if (url.pathname === '/start-whip' && req.method === 'POST') {
    let o = {};
    try { o = JSON.parse((await readBody(req)).toString() || '{}'); } catch { return json(res, { error: 'bad json' }, 400); }
    if (!o.url) return json(res, { error: 'url required' }, 400);
    // The film copy is the only source; a body cannot point ffmpeg anywhere else.
    if (o.source !== 'film-copy') return json(res, { error: 'source must be film-copy' }, 400);
    remember(o.url);
    return json(res, startLeg('whip', whipCopyArgs(o.url)));
  }

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

  return json(res, { error: 'use /start-whip /stop /status /cam/open /cam/chunk /cam/stop' }, 404);
}).listen(PORT, () => console.log(`pub container on :${PORT}`));
