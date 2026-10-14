// node demo/fake-tapes.mjs [--port N] (:8901), then /tapes/?base=http://127.0.0.1:8901 Real MP3 and
// MP4 at the exact lengths corpus.json records (MP3 within one 24 ms frame), with Range and CORS,
// so /tapes/'s geometry checks grade the page. Grades our code only; needs ffmpeg once.
// why: lessons/harness.md#fake-tapes

import { createServer } from 'node:http';
import { execFile, execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, statSync, createReadStream } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(HERE, 'resources', 'corpus.json');
const CACHE = join(tmpdir(), 'positron-fake-tapes');

// 48 kHz at 64 kbit/s makes whole 192-byte, 24 ms frames with no padding bit, so a tiled file is
// addressable by the byte. Not archive.org's rate, which the page never reads.
// why: lessons/harness.md#rate
const RATE = 48000;
const KBPS = 64;
const FRAME_MS = (1152 / RATE) * 1000;            // 24.000
const FRAME_BYTES = (144 * KBPS * 1000) / RATE;   // 192
const TILE_S = 8;
const TILE = join(CACHE, `tile-${RATE}-${KBPS}.mp3`);

// Eight seconds of two tones, one pulsing at 2 Hz (the page reads a level). No Xing header and no
// ID3
// (`-write_xing 0`): a Xing frame would declare the tile's length for the whole recording.
// why: lessons/harness.md#tile
function makeTile() {
  if (existsSync(TILE)) return readFileSync(TILE);
  mkdirSync(CACHE, { recursive: true });
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', `sine=frequency=220:duration=${TILE_S}`,
      '-f', 'lavfi', '-i', `sine=frequency=330:duration=${TILE_S}`,
      '-filter_complex',
      '[1:a]tremolo=f=2:d=0.9[p];[0:a][p]amix=inputs=2:duration=shortest,'
      + 'aformat=sample_fmts=s16:channel_layouts=mono[a]',
      '-map', '[a]', '-c:a', 'libmp3lame', '-b:a', `${KBPS}k`, '-ar', String(RATE),
      '-write_xing', '0', '-id3v2_version', '0', '-write_id3v1', '0', TILE]);
  } catch (e) {
    console.error('this needs ffmpeg to make its audio, and ffmpeg did not run:');
    console.error(`  ${String(e.message).split('\n')[0]}`);
    return null;
  }
  return readFileSync(TILE);
}

/** How long a recording at `ms` comes out, rounded to a whole frame. */
const framesFor = (ms) => Math.max(1, Math.round(ms / FRAME_MS));
const bytesFor = (ms) => framesFor(ms) * FRAME_BYTES;

// Each .mp4 row is a real MP4 (an MP4 cannot be tiled), encoded once and kept; the 626 s one takes
// 3.2 s. Built on demand under a harness, which only opens MP3 rows; --no-prewarm turns prewarm
// off.
// why: lessons/harness.md#mp4
const mp4Path = (ms) => join(CACHE, `clip-${ms}.mp4`);
/** One description of the encode, so the blocking and background paths cannot drift. */
function mp4Args(ms) {
  const secs = (ms / 1000).toFixed(3);
  return ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', `sine=frequency=220:duration=${secs}`,
    '-f', 'lavfi', '-i', `sine=frequency=330:duration=${secs}`,
    '-filter_complex',
    '[1:a]tremolo=f=2:d=0.9[p];[0:a][p]amix=inputs=2:duration=shortest,'
    + 'aformat=sample_fmts=fltp:channel_layouts=mono[a]',
    '-map', '[a]', '-t', secs, '-c:a', 'aac', '-b:a', `${KBPS}k`, '-ar', String(RATE),
    '-movflags', '+faststart', '-f', 'mp4', mp4Path(ms)];
}
function makeMp4(ms) {
  const out = mp4Path(ms);
  if (existsSync(out)) return out;
  mkdirSync(CACHE, { recursive: true });
  try {
    // This blocks the event loop about 3 s, once per recording per machine; hence prewarm.
    // why: lessons/harness.md#blocks
    execFileSync('ffmpeg', mp4Args(ms), { timeout: 120000 });
  } catch (e) {
    console.error(`could not build a ${(ms / 1000).toFixed(1)}s mp4: ${String(e.message).split('\n')[0]}`);
    return null;
  }
  return out;
}

// Keyed on the path, which survives the page's rewrite: 129 rows, 126 distinct paths, no conflicts.
// why: lessons/harness.md#by-path
const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
function readCorpus() {
  const corpus = JSON.parse(readFileSync(CORPUS, 'utf8'));
  const byPath = new Map();
  for (const it of corpus.items || []) {
    if (!it.file || !(it.durationMs > 0)) continue;
    let path;
    try { path = new URL(it.file).pathname; } catch { continue; }
    const row = { ms: it.durationMs, title: it.title || path };
    // Both spellings, encoded and decoded, since the browser's encoding is not the corpus's.
    // why: lessons/harness.md#spellings
    for (const k of new Set([path, safeDecode(path)])) if (!byPath.has(k)) byPath.set(k, row);
  }
  return byPath;
}

// ACAO `*` and Range, as archive.org answers, the pair /tapes/ depends on.
// why: lessons/harness.md#cors
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'range',
  'access-control-expose-headers': 'content-length, content-range, accept-ranges, content-type',
};

/** `bytes=N-`, `bytes=N-M`, `bytes=-N`, against a known total. */
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

// startTapes({ port, quiet }); port 0 lets the OS choose. Returns the server, or null with no
// audio.
// why: lessons/harness.md#tapes-start
export function startTapes({ port = 8901, quiet = false } = {}) {
  const tile = makeTile();
  if (!tile) return null;
  // Refuse a tile that is not whole frames: a header would put a click every eight seconds.
  // why: lessons/harness.md#whole-frames
  if (tile.length % FRAME_BYTES !== 0 || tile[0] !== 0xff || (tile[1] & 0xe0) !== 0xe0) {
    throw new Error(`the tile is ${tile.length} bytes and starts ${tile.subarray(0, 2).toString('hex')}: `
      + `expected a whole number of ${FRAME_BYTES}-byte frames starting on a sync word`);
  }
  const byPath = readCorpus();
  const say = (...a) => { if (!quiet) console.log(...a); };
  say(`${byPath.size} recordings, ${(tile.length / 1024).toFixed(0)} KB tile at `
    + `${KBPS} kbit/s · ${TILE}`);

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const path = url.pathname;
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

    const row = byPath.get(path) || byPath.get(safeDecode(path));
    if (!row) {
      // Say what it does not have; a bare 404 would claim the recording is gone.
      // why: lessons/harness.md#not-have
      res.writeHead(404, { ...CORS, 'content-type': 'text/plain' });
      return res.end(`no such recording in corpus.json: ${path}\n`);
    }

    if (/\.mp4(\?|#|$)/i.test(path)) return serveMp4(req, res, row, say);
    return serveMp3(req, res, row, tile, say);
  });

  server.listen(port, '127.0.0.1');
  return server;
}

// A recording of exactly `row.ms` as one tile repeated, never materialised (65 MB for all rows):
// byte i is tile byte i % length.
// why: lessons/harness.md#serve-mp3
function serveMp3(req, res, row, tile, say) {
  const total = bytesFor(row.ms);
  const range = parseRange(req.headers.range, total);
  const head = {
    ...CORS,
    'content-type': 'audio/mpeg',
    'accept-ranges': 'bytes',
    'cache-control': 'no-store',
  };
  if (req.headers.range && !range) {
    res.writeHead(416, { ...head, 'content-range': `bytes */${total}` });
    return res.end();
  }
  const from = range ? range.from : 0;
  const to = range ? range.to : total - 1;
  const len = to - from + 1;
  res.writeHead(range ? 206 : 200, {
    ...head,
    'content-length': String(len),
    ...(range ? { 'content-range': `bytes ${from}-${to}/${total}` } : {}),
  });
  say(`  ${row.title}: ${range ? `bytes ${from}-${to} of ${total}` : `${(total / 1024).toFixed(0)} KB`}`);
  if (req.method === 'HEAD') return res.end();

  // Walked rather than built: see the header above. The write loop stops on
  // backpressure and resumes on `drain`, so a paused element cannot make this
  // process hold a whole recording in a socket buffer.
  let at = from;
  const pump = () => {
    while (at <= to) {
      const off = at % tile.length;
      const n = Math.min(tile.length - off, to - at + 1);
      at += n;
      if (!res.write(tile.subarray(off, off + n))) { res.once('drain', pump); return; }
    }
    res.end();
  };
  pump();
}

/** A real MP4, built on first ask and kept. See `makeMp4`. */
function serveMp4(req, res, row, say) {
  const file = makeMp4(row.ms);
  if (!file) {
    res.writeHead(500, { ...CORS, 'content-type': 'text/plain' });
    return res.end('ffmpeg could not build this one\n');
  }
  const total = statSync(file).size;
  const range = parseRange(req.headers.range, total);
  const head = {
    ...CORS,
    'content-type': 'video/mp4',
    'accept-ranges': 'bytes',
    'cache-control': 'no-store',
  };
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
  say(`  ${row.title}: ${range ? `bytes ${from}-${to} of ${total}` : `${(total / 1024).toFixed(0)} KB`}`);
  if (req.method === 'HEAD') return res.end();
  createReadStream(file, { start: from, end: to }).pipe(res);
}

// Build the video rows now, one at a time, standalone only.
// why: lessons/harness.md#prewarm
function prewarm(say) {
  const want = [...readCorpus().entries()]
    .filter(([p]) => /\.mp4(\?|#|$)/i.test(p))
    .map(([, r]) => r.ms);
  const todo = [...new Set(want)].filter((ms) => !existsSync(mp4Path(ms)));
  if (!todo.length) return;
  mkdirSync(CACHE, { recursive: true });
  say(`building ${todo.length} video recording${todo.length === 1 ? '' : 's'} in the background`);
  const one = () => {
    const ms = todo.shift();
    if (ms === undefined) return say('every recording is ready');
    // Async and one at a time, so the server keeps answering and the laptop stays usable.
    // why: lessons/harness.md#exec-file
    execFile('ffmpeg', mp4Args(ms), () => one());
  };
  one();
}

// Run directly: an archive on 8901 (or `--port`), and the URL to open.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const argv = process.argv.slice(2);
  const port = Number(argv[argv.indexOf('--port') + 1]) || 8901;
  const server = startTapes({ port });
  if (!server) process.exit(1);
  server.on('listening', () => {
    const p = server.address().port;
    console.log(`stand-in archive on http://127.0.0.1:${p}`);
    console.log(`  http://127.0.0.1:8890/tapes/?base=http://127.0.0.1:${p}`);
    if (!argv.includes('--no-prewarm')) prewarm(console.log);
  });
}
