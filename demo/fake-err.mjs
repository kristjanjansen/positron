// node demo/fake-err.mjs [--port N] [--radio] (:8902); a page takes ?base=http://127.0.0.1:8902
// ERR's live HLS shape and its three refusal shapes (403, no ACAO; /wall is the measured day).
// The boundary slides here rather than jumping per programme. Needs ffmpeg once.
// why: lessons/harness.md#fake-err

import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, rmSync, renameSync, readdirSync,
         statSync, createReadStream } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

// 1.92 s segments, 3750 to a 2 h window, as measured at ERR: 48 frames at 25 fps, 90 AAC frames.
// why: lessons/harness.md#err-seg-ms
const SEG_MS = 1920;
const SEG_S = SEG_MS / 1000;
const WINDOW_N = 3750;                    // 2 h exactly, measured
// The pool is as long as the window, so a window holds exactly one wrap.
// why: lessons/harness.md#err-pool
const POOL_N = WINDOW_N;
const FPS = 25;                           // ERR's frame rate, measured
const GOP = Math.round((FPS * SEG_MS) / 1000);   // 48
const SIZE = '320x180';
const CACHE = join(tmpdir(), 'positron-fake-err');
const POOL = join(CACHE, `pool-fmp4-${SIZE}-${FPS}-${SEG_MS}ms-${POOL_N}`);
const TONE = join(CACHE, 'tone-128.mp3');

const IDS = ['etv', 'etv2', 'etvpluss'];

// ERR's three measured shapes: newest ~45 min refused, oldest ~78 min refused, all served.
// why: lessons/harness.md#err-measured
const MEASURED = {
  etv: { refuse: 'newest', minutes: 45 },
  etv2: { refuse: 'oldest', minutes: 78 },
  etvpluss: { refuse: 'none', minutes: 0 },
};

// The default swaps the first two so channel 0's edge plays; `/wall` is the measured arrangement.
// why: lessons/harness.md#err-open-edge
const OPEN_EDGE = {
  etv: { refuse: 'oldest', minutes: 78 },
  etv2: { refuse: 'newest', minutes: 45 },
  etvpluss: { refuse: 'none', minutes: 0 },
};
const ARRANGEMENTS = { '': OPEN_EDGE, wall: MEASURED };
/** The radio mounts `/flipper/` puts in its lower five cells. */
const MOUNTS = ['vikerraadio', 'raadio2', 'klassikaraadio', 'raadio4', 'raadiotallinn'];

// ── the picture ────────────────────────────────────────────────────────────

// Two hours of fMP4 (ERR's TV is CMAF), generated once; `-g 48 -sc_threshold 0` makes every segment
// exactly 1.92 s so a sequence number is a clock. Built in a temp directory and renamed in.
// why: lessons/harness.md#err-make-pool
function makePool(say) {
  const count = (d) => readdirSync(d).filter((f) => f.endsWith('.m4s')).length;
  if (existsSync(POOL) && count(POOL) === POOL_N && existsSync(join(POOL, 'init.mp4'))) return true;
  const tmp = `${POOL}.building-${process.pid}`;
  rmSync(tmp, { recursive: true, force: true });
  rmSync(POOL, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const secs = POOL_N * SEG_S;
  say(`building ${(secs / 3600).toFixed(0)} h of picture, about a minute, once · ${POOL}`);
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', `testsrc2=size=${SIZE}:rate=${FPS}:duration=${secs}`,
      '-f', 'lavfi', '-i', `sine=frequency=330:duration=${secs}`,
      '-c:v', 'libx264', '-preset', 'veryfast',
      '-g', String(GOP), '-keyint_min', String(GOP), '-sc_threshold', '0',
      '-pix_fmt', 'yuv420p', '-b:v', '70k', '-maxrate', '90k', '-bufsize', '180k',
      '-c:a', 'aac', '-b:a', '24k', '-ar', '48000', '-ac', '1',
      '-f', 'hls', '-hls_time', String(SEG_S), '-hls_list_size', '0',
      '-hls_flags', 'independent_segments',
      '-hls_segment_type', 'fmp4', '-hls_fmp4_init_filename', 'init.mp4',
      '-hls_segment_filename', join(tmp, 'seg-%05d.m4s'), join(tmp, 'pool.m3u8')],
      { timeout: 10 * 60 * 1000 });
  } catch (e) {
    // Says why and returns false, so the stand-in, not the page, is reported.
    // why: lessons/harness.md#err-no-ffmpeg
    console.error('this needs ffmpeg to make its picture, and ffmpeg did not run:');
    console.error(`  ${String(e.message).split('\n')[0]}`);
    rmSync(tmp, { recursive: true, force: true });
    return false;
  }
  // Refuse a short pool: a hole would answer exactly like a rights refusal.
  // why: lessons/harness.md#err-short-pool
  const got = count(tmp);
  if (got !== POOL_N || !existsSync(join(tmp, 'init.mp4'))) {
    rmSync(tmp, { recursive: true, force: true });
    console.error(`ffmpeg wrote ${got} segments and ${POOL_N} were asked for; not serving a window with a hole in it`);
    return false;
  }
  // A sequence number is only a clock if every segment is the length the
  // playlist says. Ask ffmpeg's own playlist rather than trusting the flags.
  const lens = new Set((readFileSync(join(tmp, 'pool.m3u8'), 'utf8').match(/#EXTINF:[\d.]+/g) || [])
    .map((l) => Number(l.slice(8)).toFixed(3)));
  if (lens.size !== 1 || !lens.has(SEG_S.toFixed(3))) {
    rmSync(tmp, { recursive: true, force: true });
    console.error(`ffmpeg cut segments of ${[...lens].join(', ')} s and ${SEG_S} was asked for; not serving a clock that drifts`);
    return false;
  }
  renameSync(tmp, POOL);
  return true;
}

// Thirty seconds of two tones a fifth apart for the radio cells (a level must be measurable).
// why: lessons/harness.md#err-tone
function makeTone() {
  if (existsSync(TONE)) return readFileSync(TONE);
  mkdirSync(CACHE, { recursive: true });
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', 'sine=frequency=220:duration=30',
      '-f', 'lavfi', '-i', 'sine=frequency=330:duration=30',
      '-filter_complex',
      '[1:a]tremolo=f=2:d=0.9[p];[0:a][p]amix=inputs=2:duration=shortest,'
      + 'aformat=sample_fmts=s16:channel_layouts=stereo[a]',
      '-map', '[a]', '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', TONE]);
  } catch { return null; }   // the radio cells are the small half; the picture is the subject
  return readFileSync(TONE);
}

// ── the radio channels as live.err.ee serves them ──────────────────────────

// Audio-only HLS as ERR's radio: per-channel master minting `?id=`, AAC rungs, 1.92 s TS segments.
// Only with --radio. Every rung is the same pool at 32 kbit/s mono.
// why: lessons/harness.md#err-radio
const RADIO_SEG_MS = 1920;
const RADIO_N = 3750;                      // 2 h, which is what ERR advertises
const RADIO_POOL = join(CACHE, `radio-1920ms-${RADIO_N}`);
const RADIO_RUNGS = [70000, 130000, 260000];

function makeRadioPool(say) {
  const have = (d) => existsSync(d) && readdirSync(d).filter((f) => f.endsWith('.ts')).length >= RADIO_N;
  if (have(RADIO_POOL)) return true;
  const tmp = `${RADIO_POOL}.building-${process.pid}`;
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  say(`building 2 h of radio once, about half a minute, in ${RADIO_POOL}`);
  try {
    // A tone with a slow swell, 550 Hz, so it is never mistaken for the
    // station's own 220/330/440 Hz test programmes when somebody listens.
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', `sine=frequency=550:duration=${(RADIO_N * RADIO_SEG_MS) / 1000}`,
      '-af', 'tremolo=f=0.5:d=0.6',
      '-c:a', 'aac', '-b:a', '32k', '-ar', '48000', '-ac', '1',
      '-f', 'hls', '-hls_time', String(RADIO_SEG_MS / 1000), '-hls_list_size', '0',
      '-hls_segment_filename', join(tmp, 'r-%05d.ts'), join(tmp, 'pool.m3u8')],
    { timeout: 10 * 60 * 1000 });
  } catch (e) {
    console.error('the radio pool needs ffmpeg, and ffmpeg did not run:');
    console.error(`  ${String(e.message).split('\n')[0]}`);
    rmSync(tmp, { recursive: true, force: true });
    return false;
  }
  if (!have(tmp)) {
    rmSync(tmp, { recursive: true, force: true });
    console.error(`ffmpeg wrote fewer than ${RADIO_N} radio segments; not serving a window with a hole in it`);
    return false;
  }
  rmSync(RADIO_POOL, { recursive: true, force: true });
  renameSync(tmp, RADIO_POOL);
  return true;
}

/** The newest complete radio segment; `sn * 1920` ms is when it began. */
function radioEdge(atMs = Date.now()) {
  const latest = Math.floor(atMs / RADIO_SEG_MS) - 1;
  return { latest, first: latest - RADIO_N + 1 };
}

function radioMaster(mount) {
  // A fresh session on every ask, fifteen digits, the way ERR mints one.
  const id = String(Math.floor(1e14 + Math.random() * 9e14));
  const out = ['#EXTM3U', '#EXT-X-VERSION:7', '#EXT-X-INDEPENDENT-SEGMENTS'];
  for (const bw of RADIO_RUNGS) {
    out.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bw},CODECS="mp4a.40.2"`, `${mount}/a${bw}.m3u8?id=${id}`);
  }
  out.push('');
  return out.join('\n');
}

function radioMedia(now = Date.now()) {
  const { first, latest } = radioEdge(now);
  const out = ['#EXTM3U', '#EXT-X-VERSION:7',
    `#EXT-X-TARGETDURATION:${Math.ceil(RADIO_SEG_MS / 1000)}`,
    `#EXT-X-MEDIA-SEQUENCE:${first}`,
    `#EXT-X-DISCONTINUITY-SEQUENCE:${Math.floor(first / RADIO_N)}`,
    '#EXT-X-INDEPENDENT-SEGMENTS',
    `#EXT-X-PROGRAM-DATE-TIME:${iso(first * RADIO_SEG_MS)}`];
  for (let sn = first; sn <= latest; sn++) {
    if (sn !== first && sn % RADIO_N === 0) out.push('#EXT-X-DISCONTINUITY');
    out.push(`#EXTINF:${(RADIO_SEG_MS / 1000).toFixed(6)},`, `r-${sn}.ts`);
  }
  out.push('');
  return out.join('\n');
}

// ── where the live edge is, right now ──────────────────────────────────────

// The newest complete segment and the oldest in the window: segment `sn` covers sn * SEG_MS, so
// the sequence number is the clock. The edge is one behind the present.
// why: lessons/harness.md#err-edge
function edge(atMs = Date.now()) {
  const latest = Math.floor(atMs / SEG_MS) - 1;
  return { latest, first: latest - WINDOW_N + 1 };
}

// Out of the window and refused answer the same, as at ERR, so pages probe only listed segments.
// why: lessons/harness.md#err-serves
function serves(arrangement, id, sn, now = Date.now()) {
  const { first, latest } = edge(now);
  if (sn < first || sn > latest) return false;
  const ch = ARRANGEMENTS[arrangement][id];
  const n = Math.round((ch.minutes * 60 * 1000) / SEG_MS);
  if (ch.refuse === 'newest') return sn <= latest - n;
  if (ch.refuse === 'oldest') return sn >= first + n;
  return true;
}

// ── what a browser is allowed to read ──────────────────────────────────────

// `date` must be exposed for readPlaylist to read it; whether ERR exposes it is not known here.
// why: lessons/harness.md#err-cors
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'range',
  'access-control-expose-headers':
    'content-length, content-range, accept-ranges, content-type, date',
};

/** `bytes=N-`, `bytes=N-M`, `bytes=-N`, against a known total. Same as `fake-tapes.mjs`. */
function parseRange(header, total) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header || '').trim());
  if (!m) return null;
  const [, a, b] = m;
  if (a === '' && b === '') return null;
  let from = a === '' ? total - Number(b) : Number(a);
  let to = a === '' ? total - 1 : (b === '' ? total - 1 : Number(b));
  from = Math.max(0, from); to = Math.min(total - 1, to);
  if (from > to) return null;
  return { from, to };
}

// ── the playlists ──────────────────────────────────────────────────────────

const iso = (ms) => new Date(ms).toISOString().replace('Z', '+00:00');

// A fresh `?id=` per master read; a variant without one answers 400. Sessions never expire here.
// why: lessons/harness.md#err-sessions
const SESSIONS = new Set();
const SESSION_CAP = 10000;
function mint() {
  const id = String(Math.floor(1e14 + Math.random() * 9e14));
  SESSIONS.add(id);
  if (SESSIONS.size > SESSION_CAP) SESSIONS.delete(SESSIONS.values().next().value);
  return id;
}

function masterPlaylist(id) {
  return ['#EXTM3U',
    '#EXT-X-VERSION:7',
    '#EXT-X-INDEPENDENT-SEGMENTS',
    '#EXT-X-STREAM-INF:BANDWIDTH=180000,AVERAGE-BANDWIDTH=120000,'
    + `RESOLUTION=${SIZE},CODECS="avc1.64000c,mp4a.40.2",FRAME-RATE=${FPS}.000`,
    `${id}/index.m3u8?id=${mint()}`, ''].join('\n');
}

// The sliding window, fresh per ask: one PDT on the first segment (as ERR), a DISCONTINUITY at the
// wrap.
// why: lessons/harness.md#err-media-playlist
function mediaPlaylist(id, now = Date.now()) {
  const { first, latest } = edge(now);
  const out = ['#EXTM3U',
    '#EXT-X-VERSION:7',
    `#EXT-X-TARGETDURATION:${Math.ceil(SEG_S)}`,
    `#EXT-X-MEDIA-SEQUENCE:${first}`,
    `#EXT-X-DISCONTINUITY-SEQUENCE:${Math.floor(first / POOL_N)}`,
    '#EXT-X-INDEPENDENT-SEGMENTS',
    '#EXT-X-MAP:URI="init.mp4"',
    `#EXT-X-PROGRAM-DATE-TIME:${iso(first * SEG_MS)}`];
  for (let sn = first; sn <= latest; sn++) {
    if (sn !== first && sn % POOL_N === 0) out.push('#EXT-X-DISCONTINUITY');
    out.push(`#EXTINF:${SEG_S.toFixed(6)},`, `seg-${sn}.m4s`);
  }
  out.push('');
  return out.join('\n');
}

// ── what was on ────────────────────────────────────────────────────────────

// A day on a half-hour grid in ERR's getTimelineSchedule shape (startTime in epoch seconds),
// contiguous across midnight; names that are obviously not Estonian television.
// why: lessons/harness.md#err-schedule
function schedule(dayDate) {
  const day = new Date(dayDate);
  day.setHours(0, 0, 0, 0);
  const rows = [];
  for (let i = 0; i < 48; i++) {
    const at = day.getTime() + i * 30 * 60 * 1000;
    const hh = String(new Date(at).getHours()).padStart(2, '0');
    const mm = String(new Date(at).getMinutes()).padStart(2, '0');
    rows.push({
      startTime: Math.round(at / 1000),
      programName: `Stand-in ${hh}:${mm}`,
      automaticReplay: i % 3 === 2 ? 'Y' : 'N',
    });
  }
  return rows;
}

// ── the server ─────────────────────────────────────────────────────────────

// startErr({ port, quiet, radio }); port 0 lets the OS choose. Returns the server, or null.
// why: lessons/harness.md#err-start
export function startErr({ port = 8902, quiet = false, radio = false } = {}) {
  const say = (...a) => { if (!quiet) console.log(...a); };
  const radioHls = radio && makeRadioPool(console.log);
  // The build notice ignores `quiet`: a minute of silence reads as a hang.
  // why: lessons/harness.md#err-notice
  if (!makePool(console.log)) return null;
  const poolSize = readdirSync(POOL).filter((f) => f.endsWith('.m4s'))
    .reduce((n, f) => n + statSync(join(POOL, f)).size, 0);
  const tone = makeTone();
  say(`${POOL_N} segments of ${SEG_S}s, ${(poolSize / 1048576).toFixed(0)} MB · ${POOL}`);
  for (const [name, arr] of Object.entries(ARRANGEMENTS)) {
    say(`  ${name ? `/${name}/` : 'default'}: ${IDS.map((id) => `${id} ${
      arr[id].refuse === 'none' ? 'all served' : `${arr[id].refuse} ${arr[id].minutes} min refused`
    }`).join(' · ')}`);
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    // The arrangement is a leading path segment, so every relative URL below follows it.
    // why: lessons/harness.md#err-arrangement
    const pre = /^\/(wall)(\/.*)$/.exec(url.pathname);
    const arrangement = pre ? pre[1] : '';
    const path = pre ? pre[2] : url.pathname;

    // ── a segment ──────────────────────────────────────────────────────────
    const seg = /^\/live\/([a-z0-9]+)\/seg-(\d+)\.m4s$/.exec(path);
    if (seg && IDS.includes(seg[1])) {
      const [, id, snText] = seg;
      const sn = Number(snText);
      if (!serves(arrangement, id, sn)) {
        // 403 with no CORS header, OPTIONS included: in a browser it is a fetch failure, as at ERR.
        // why: lessons/harness.md#err-403
        res.writeHead(403, { 'content-type': 'text/plain' });
        return res.end('rights\n');
      }
      const file = join(POOL, `seg-${String(sn % POOL_N).padStart(5, '0')}.m4s`);
      if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
      return serveFile(req, res, file, 'video/mp4');
    }
    // The init segment is always served; whether ERR refuses one is not measured.
    // why: lessons/harness.md#err-init
    const init = /^\/live\/([a-z0-9]+)\/init\.mp4$/.exec(path);
    if (init && IDS.includes(init[1])) return serveFile(req, res, join(POOL, 'init.mp4'), 'video/mp4');

    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

    // ── the radio channels over HLS, when asked for ────────────────────────
    if (radioHls) {
      const rm = /^\/live\/([a-z0-9]+)\.m3u8$/.exec(path);
      if (rm && MOUNTS.includes(rm[1])) return text(res, radioMaster(rm[1]), 'application/vnd.apple.mpegurl');
      const rv = /^\/live\/([a-z0-9]+)\/a\d+\.m3u8$/.exec(path);
      if (rv && MOUNTS.includes(rv[1])) {
        // What ERR answers a variant asked for without the master's session.
        if (!/^\d{15}$/.test(url.searchParams.get('id') || '')) {
          res.writeHead(400, { ...CORS, 'content-type': 'text/plain' });
          return res.end('Failed to set session: not found\n');
        }
        return text(res, radioMedia(), 'application/vnd.apple.mpegurl');
      }
      const rs = /^\/live\/([a-z0-9]+)\/r-(\d+)\.ts$/.exec(path);
      if (rs && MOUNTS.includes(rs[1])) {
        const sn = Number(rs[2]);
        const { first, latest } = radioEdge();
        if (sn < first || sn > latest) {
          res.writeHead(404, { ...CORS, 'content-type': 'text/plain' });
          return res.end('not in the window\n');
        }
        return serveFile(req, res, join(RADIO_POOL, `r-${String(sn % RADIO_N).padStart(5, '0')}.ts`), 'video/mp2t');
      }
    }

    // ── the playlists ──────────────────────────────────────────────────────
    const master = /^\/live\/([a-z0-9]+)\.m3u8$/.exec(path);
    if (master && IDS.includes(master[1])) return text(res, masterPlaylist(master[1]), 'application/vnd.apple.mpegurl');
    const media = /^\/live\/([a-z0-9]+)\/index\.m3u8$/.exec(path);
    if (media && IDS.includes(media[1])) {
      if (!SESSIONS.has(url.searchParams.get('id') || '')) {
        res.writeHead(400, { ...CORS, 'content-type': 'text/plain' });
        return res.end('Failed to set session: not found\n');
      }
      return text(res, mediaPlaylist(media[1]), 'application/vnd.apple.mpegurl');
    }

    // ── what was on ────────────────────────────────────────────────────────
    if (path === '/api/tvSchedule/getTimelineSchedule') {
      const y = Number(url.searchParams.get('year'));
      const mo = Number(url.searchParams.get('month'));
      const da = Number(url.searchParams.get('day'));
      const when = Number.isFinite(y) && y ? new Date(y, mo - 1, da) : new Date();
      res.writeHead(200, { ...CORS, 'content-type': 'application/json', 'cache-control': 'no-store' });
      return res.end(JSON.stringify(schedule(when)));
    }

    // ── the five radio cells ───────────────────────────────────────────────
    const mount = /^\/([a-z0-9]+)\.mp3$/.exec(path);
    if (mount && MOUNTS.includes(mount[1])) return serveMount(req, res, tone, say);

    // A 404 says what it does not have; a refusal is a 403 without CORS, never a 404.
    // why: lessons/harness.md#err-not-have
    res.writeHead(404, { ...CORS, 'content-type': 'text/plain' });
    return res.end(`no such channel or path here: ${path}\n`);
  });

  server.listen(port, '127.0.0.1');
  return server;
}

function text(res, body, type) {
  res.writeHead(200, { ...CORS, 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

/** A segment, with Range, because `probeSegment` asks for two bytes. */
function serveFile(req, res, file, type) {
  let total;
  try { total = statSync(file).size; } catch {
    res.writeHead(404, { ...CORS, 'content-type': 'text/plain' });
    return res.end('the pool is missing a segment it said it had\n');
  }
  const range = parseRange(req.headers.range, total);
  const head = { ...CORS, 'content-type': type, 'accept-ranges': 'bytes', 'cache-control': 'no-store' };
  if (req.headers.range && !range) {
    res.writeHead(416, { ...head, 'content-range': `bytes */${total}` });
    return res.end();
  }
  const from = range ? range.from : 0;
  const to = range ? range.to : total - 1;
  res.writeHead(range ? 206 : 200, {
    ...head,
    'content-length': String(to - from + 1),
    ...(range ? { 'content-range': `bytes ${from}-${to}/${total}` } : {}),
  });
  if (req.method === 'HEAD') return res.end();
  createReadStream(file, { start: from, end: to }).pipe(res);
}

// A radio mount paced on bytes owed since connect, not on timer ticks.
// why: lessons/harness.md#err-mount
function serveMount(req, res, tone, say) {
  if (!tone) { res.writeHead(503, { 'content-type': 'text/plain' }); return res.end('no audio\n'); }
  const BYTES_PER_S = (128 * 1000) / 8;
  res.writeHead(200, {
    ...CORS, 'content-type': 'audio/mpeg', 'cache-control': 'no-store',
    'icy-name': 'a stand-in, not a radio station',
  });
  let at = Math.floor(Math.random() * tone.length), sent = 0;
  const t0 = Date.now();
  const timer = setInterval(() => {
    let need = Math.max(0, Math.round(((Date.now() - t0) / 1000) * BYTES_PER_S) + 65536 - sent);
    while (need > 0) {
      const end = Math.min(at + need, tone.length);
      const slice = tone.subarray(at, end);
      res.write(slice);
      sent += slice.length; need -= slice.length;
      at = end === tone.length ? 0 : end;
    }
  }, 50);
  const stop = () => { clearInterval(timer); say(`  a radio cell closed after ${(sent / 1024).toFixed(0)} KB`); };
  req.on('close', stop);
  res.on('error', stop);
}

// Run directly: a broadcaster on 8902 (or `--port`), and the URLs to open.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const argv = process.argv.slice(2);
  const port = Number(argv[argv.indexOf('--port') + 1]) || 8902;
  const server = startErr({ port, radio: argv.includes('--radio') });
  if (!server) process.exit(1);
  server.on('listening', () => {
    const p = server.address().port;
    console.log(`stand-in broadcaster on http://127.0.0.1:${p}`);
    console.log(`  http://127.0.0.1:8890/flipper/?base=http://127.0.0.1:${p}`);
    console.log(`  http://127.0.0.1:8890/flipper/?base=http://127.0.0.1:${p}/wall`);
  });
}
