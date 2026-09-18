// demo/fake-tapes.mjs: an archive that is nobody's archive.
//
//   node demo/fake-tapes.mjs                   # :8901, every recording the page asks for
//   node demo/fake-tapes.mjs --port 9200
//
// Then open the page against it:
//   http://127.0.0.1:8890/tapes/?base=http://127.0.0.1:8901
//
// 🔴 WHY THIS EXISTS. `/tapes/` plays twenty-four Kurenniemi recordings off
// archive.org, and the standing instruction is *"stil: super careful with
// external sources, better avoid"*. The reasoning that got that reply was
// "it uses archive.org, not ERR, so it is safe to run": the rule is about whose
// server it is, not about which harm has been named yet. So every run of
// `node demo/verify.mjs tapes` was spending somebody else's bandwidth, and
// `node demo/verify.mjs` with no arguments did it by accident.
//
// This is the same answer `demo/fake-station.mjs` gave `/radio/`. Real MP3
// frames, real `content-length`, real `accept-ranges` and real Range replies, at
// the exact lengths `corpus.json` records, served from a port on this machine.
//
// 🔴 THE LENGTHS ARE THE WHOLE POINT, NOT A DETAIL. `/tapes/` lays every
// recording END TO END as one long tape, each as wide as it really is, and its
// checks grade that geometry: the bars tile with nothing between them, a bar is
// as wide as its tape is long, the picture opens on an hour of it. A stand-in
// whose lengths were invented would leave every one of those asserts grading
// this file instead of the page. So each path is served at the `durationMs` the
// corpus already carries, measured once by `measure-durations.mjs`.
//
// MEASURED off the wire with ffprobe, against what the corpus says: the MP4 rows
// land EXACTLY (626335 asked, 626.335000 read), and the MP3 rows land inside one
// frame, which is 24 ms and is the smallest thing a stream of whole frames can
// be cut to (829832 asked, 829824 read; 73169 asked, 73176 read).
//
// ⚠️ IT GRADES OUR CODE AND NOTHING ELSE. It cannot tell you that a recording
// has been taken down, that archive.org has redirected a download to a storage
// node which then omits `access-control-allow-origin` (which is what `/tapes/`'s
// own retry-without-crossing path exists for), or that a file is slow enough to
// miss the page's deadline. A page that is green here can still meet all three
// out there.
//
// ⚠️ IT NEEDS ffmpeg, ONCE, for a few seconds of audio that is then cached in
// the system temporary directory. With no ffmpeg it says so and returns null,
// because a harness that cannot run has to say why rather than serve silence
// that reads as a broken page.

import { createServer } from 'node:http';
import { execFile, execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, statSync, createReadStream } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(HERE, 'resources', 'corpus.json');
const CACHE = join(tmpdir(), 'positron-fake-tapes');

/**
 * 🔴 48 kHz AT 64 kbit/s, AND BOTH NUMBERS ARE LOAD-BEARING. An MPEG-1 Layer
 * III frame is 1152 samples and `144 * bitrate / rate` bytes, so this pair is
 * the one that comes out WHOLE: 24.000 ms and 192 bytes exactly, with no
 * padding bit alternating the frame size. That is what makes a recording of any
 * length addressable by the byte. The file below is one tile repeated, and
 * every wrap lands on a frame boundary because the tile is a whole number of
 * frames and so is the file.
 *
 * ⚠️ The real recordings are mostly 44.1 kHz, where 64 kbit/s gives 208.98
 * bytes and frames alternate 208/209. A stand-in that copied that would have to
 * carry a frame table to answer a Range request. The rate is the one thing here
 * that is deliberately not what archive.org holds, and it costs the page
 * nothing: it reads a duration and a waveform, never a sample rate.
 */
const RATE = 48000;
const KBPS = 64;
const FRAME_MS = (1152 / RATE) * 1000;            // 24.000
const FRAME_BYTES = (144 * KBPS * 1000) / RATE;   // 192
const TILE_S = 8;
const TILE = join(CACHE, `tile-${RATE}-${KBPS}.mp3`);

/**
 * Eight seconds of something with a shape to it: two tones a fifth apart, one
 * of them pulsing at 2 Hz.
 *
 * 🔴 NOT SILENCE. `fake-station.mjs` already wrote down why and it applies
 * unchanged: a check that counts frames passes over silence and a check that
 * measures a level does not, and this page reads a level. `/tapes/`'s loop check
 * fills a ring from the analyser tap and compares the kept lap against its
 * mirror, which needs audio that is not a constant.
 *
 * 🔴 NO Xing HEADER AND NO ID3, WHICH IS THE TRAP IN TILING AN MP3. libmp3lame
 * writes a Xing/LAME frame at the head declaring the frame COUNT of the file it
 * encoded. Tile that and the browser reports the tile's eight seconds for a
 * thirteen minute recording: a stand-in that lies about exactly the quantity it
 * exists to get right. `-write_xing 0` drops it, and the guard below refuses a
 * tile that is not a whole number of frames starting on a sync word, which is
 * what a header of any kind would leave behind.
 */
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

/**
 * 🔴 EVERY .mp4 ROW IS A REAL MP4, BUILT ONE AT A TIME AND KEPT.
 *
 * Eight of the twenty-four rows are `video/mp4`, and `/tapes/` opens them in an
 * `<audio>` element on the strength of `canPlayType`. MP3 bytes under an
 * `.mp4` name would be a stand-in answering a different shape from the thing it
 * stands in for, which is the failure mode a stand-in has: whatever a browser
 * then did with it would be a fact about Chrome's container sniffing rather than
 * about this page. An MP4 cannot be tiled by the byte, so these are encoded.
 *
 * MEASURED: the longest of them (626 s) takes 3.2 s of ffmpeg, once, and lands
 * at 626.335000 exactly, because `-t` trims through the edit list. After that it
 * is a file on disk.
 *
 * ⚠️ IT IS ON DEMAND RATHER THAN AT STARTUP WHEN THE HARNESS IS DRIVING. Eleven
 * seconds of ffmpeg alongside a headless Chrome is this repo's "a second
 * browser of your own is a harness that reads broken" in a new costume, and the
 * harness never opens a video row: it walks the first two recordings and both
 * are MP3. A standalone run builds them in the background instead, where the
 * only thing waiting is a person about to press one. `--no-prewarm` turns that
 * off.
 */
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
    // ⚠️ THIS ONE BLOCKS THE EVENT LOOP, WHICH IS WHY `--prewarm` EXISTS. A
    // request that arrives before the file does stops this server answering
    // anything else for about three seconds. It happens once per recording per
    // machine, and the standalone run builds them before anybody presses one.
    execFileSync('ffmpeg', mp4Args(ms), { timeout: 120000 });
  } catch (e) {
    console.error(`could not build a ${(ms / 1000).toFixed(1)}s mp4: ${String(e.message).split('\n')[0]}`);
    return null;
  }
  return out;
}

/**
 * What the page will ask for, read off the corpus rather than listed here.
 *
 * 🔴 KEYED ON THE PATH, BECAUSE THAT IS WHAT SURVIVES THE REWRITE. The page
 * turns `https://archive.org/download/<item>/<name>` into
 * `<base>/download/<item>/<name>`, so the host is gone by the time a request
 * arrives and the path is the whole of the identity. MEASURED over the whole
 * file: 129 rows carry a file, 126 distinct paths, and no two of them disagree
 * about a duration, so a path is enough.
 */
const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
function readCorpus() {
  const corpus = JSON.parse(readFileSync(CORPUS, 'utf8'));
  const byPath = new Map();
  for (const it of corpus.items || []) {
    if (!it.file || !(it.durationMs > 0)) continue;
    let path;
    try { path = new URL(it.file).pathname; } catch { continue; }
    const row = { ms: it.durationMs, title: it.title || path };
    // ⚠️ BOTH SPELLINGS, BECAUSE ONLY ONE OF THEM IS THIS FILE'S TO CHOOSE.
    // These names carry spaces, brackets and Finnish vowels, so the path is
    // percent-encoded, and the encoding that comes back on the wire is the
    // browser's rather than the corpus's. Indexing the decoded form as well means a
    // difference of one escape is a recording that plays rather than a 404 that
    // reads as a file having been taken down.
    for (const k of new Set([path, safeDecode(path)])) if (!byPath.has(k)) byPath.set(k, row);
  }
  return byPath;
}

// archive.org answers a media file with `access-control-allow-origin: *` and
// honours Range, which is the pair `/tapes/` depends on: without the first,
// `crossOrigin = 'anonymous'` is refused and the page falls back to a tainted
// graph with no waveform; without the second a seek downloads the file again.
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

/**
 * Start it. `port: 0` lets the OS choose, which is what a harness should do: a
 * fixed port is a shared mutable global, and this repo has paid for that twice.
 *
 * Returns the server, or `null` when there is no audio to serve.
 */
export function startTapes({ port = 8901, quiet = false } = {}) {
  const tile = makeTile();
  if (!tile) return null;
  // 🔴 REFUSE A TILE THAT IS NOT WHOLE FRAMES, RATHER THAN SERVING IT. An ID3
  // or Xing block at the head shifts every frame off the 192-byte grid, so the
  // wrap in the middle of a long recording would land inside a frame and the
  // decoder would hear a click every eight seconds. It would still play, and
  // the page would still be green, which is why this is a throw and not a log.
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
      // ⚠️ IT SAYS WHAT IT DOES NOT HAVE. A bare 404 from a stand-in reads as
      // the recording being gone, which is a claim this file is not entitled to
      // make about anybody's archive.
      res.writeHead(404, { ...CORS, 'content-type': 'text/plain' });
      return res.end(`no such recording in corpus.json: ${path}\n`);
    }

    if (/\.mp4(\?|#|$)/i.test(path)) return serveMp4(req, res, row, say);
    return serveMp3(req, res, row, tile, say);
  });

  server.listen(port, '127.0.0.1');
  return server;
}

/**
 * A recording of exactly `row.ms`, as one tile repeated.
 *
 * 🔴 THE FILE IS NEVER MATERIALISED, AND THAT IS NOT A MICRO-OPTIMISATION. The
 * twenty-four rows come to 2 h 22 min, which is 68 MB at this bitrate, and a
 * Map of buffers keyed by duration would hold all of it for the life of a run
 * that reads two of them. Byte `i` of the file is byte `i % tile.length` of the
 * tile, so a Range reply is a walk over the tile with no allocation but the
 * chunk being written.
 */
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

/**
 * Build the video rows now, one at a time, so the first press on one is not a
 * three second wait. Standalone only: see `makeMp4`.
 */
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
    // `execFile` rather than the sync form: this runs while the server is
    // already answering, and a blocked event loop is a server that is down.
    // One at a time, which is the same `gently` the corpus measurement was
    // asked for: eight ffmpegs at once is a laptop nobody can type on.
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
