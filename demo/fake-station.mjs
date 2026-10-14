// node demo/fake-station.mjs [--port N] (:8899), then a page with ?base=http://127.0.0.1:8899
// An Icecast mount that is nobody's: real MP3 frames, ICY headers and metadata, paced at its
// bitrate. Grades our code, not ERR. Needs ffmpeg once; audio is cached in the temp dir.
// why: lessons/harness.md#fake-station

import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const KBPS = 128;
// Every `icy-metaint` bytes of audio, one metadata block. 8192 is what Icecast
// ships by default and what the relay passes through.
const METAINT = 8192;
const CACHE = join(tmpdir(), 'positron-fake-station');
const MP3 = join(CACHE, `tone-${KBPS}.mp3`);

// Thirty seconds of two tones a fifth apart, one pulsing at 2 Hz: a meter can read it, and the
// pulse tells a loop played backwards from forwards. Not silence, not noise.
// why: lessons/harness.md#tone
function makeMp3() {
  if (existsSync(MP3)) return true;
  mkdirSync(CACHE, { recursive: true });
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', 'sine=frequency=220:duration=30',
      '-f', 'lavfi', '-i', 'sine=frequency=330:duration=30',
      '-filter_complex',
      // The second voice swells twice a second, so the material has a rhythm a
      // measurement can find rather than a constant a measurement cannot.
      '[1:a]tremolo=f=2:d=0.9[p];[0:a][p]amix=inputs=2:duration=shortest,'
      + 'aformat=sample_fmts=s16:channel_layouts=stereo[a]',
      '-map', '[a]', '-c:a', 'libmp3lame', '-b:a', `${KBPS}k`, '-ar', '44100', MP3]);
  } catch (e) {
    // Says why and returns false, so a harness can report the stand-in, not the page, as the
    // reason.
    // why: lessons/harness.md#no-ffmpeg
    console.error('this needs ffmpeg to make its audio, and ffmpeg did not run:');
    console.error(`  ${String(e.message).split('\n')[0]}`);
    return false;
  }
  return true;
}

// What a listener is sent per second. The page measures arrival gaps and buffer
// depth off the wire, so bytes have to arrive at about the rate they are
// consumed: a file dumped at once looks like a station with an infinite buffer.
const BYTES_PER_S = (KBPS * 1000) / 8;
const TICK_MS = 50;
// Burst 65536 bytes at connect, as Icecast does, or the page's cushion check grades this file.
// why: lessons/harness.md#burst
const BURST = 65536;

const enc = new TextEncoder();
/** An ICY metadata block: one length byte in sixteens, then padded text. */
function metaBlock(title) {
  if (!title) return Buffer.from([0]);
  const txt = enc.encode(`StreamTitle='${title}';StreamUrl='';`);
  const pad = (16 - (txt.length % 16)) % 16;
  const out = Buffer.alloc(1 + txt.length + pad);
  out[0] = (txt.length + pad) / 16;
  out.set(txt, 1);
  return out;
}

// startStation({ port, quiet }); port 0 lets the OS choose. Returns the server, or null with no
// audio.
// why: lessons/harness.md#station-start
export function startStation({ port = 8899, quiet = false } = {}) {
  if (!makeMp3()) return null;
  const AUDIO = readFileSync(MP3);
  const say = (...a) => { if (!quiet) console.log(...a); };
  say(`${(AUDIO.length / 1024).toFixed(0)} KB of ${KBPS} kbit/s MP3 · ${MP3}`);
  let listeners = 0;
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const mount = url.pathname.replace(/^\/+/, '') || 'mount';

    // A browser asking for `Icy-MetaData` sends a non-simple header, so it
    // preflights first. Refusing OPTIONS here looks exactly like a CORS bug in the
    // page.
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'icy-metadata, range',
      'access-control-expose-headers':
        'icy-name, icy-description, icy-genre, icy-br, icy-metaint, content-type',
    };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }

    // The same health shape `shout` answers: the page asks it before playing.
    // why: lessons/harness.md#health
    if (mount === 'health') {
      const only = (url.searchParams.get('only') || 'mount').split(',').filter(Boolean);
      res.writeHead(200, { ...cors, 'content-type': 'application/json' });
      return res.end(JSON.stringify({
        ok: true, listeners, what: 'a stand-in, not a station',
        stations: Object.fromEntries(only.map((id) => [id, { up: true, kbps: KBPS }])),
      }));
    }

    const wantsMeta = String(req.headers['icy-metadata'] || '') === '1';
    res.writeHead(200, {
      ...cors,
      'content-type': 'audio/mpeg',
      'cache-control': 'no-store',
      'icy-name': `Stand-in (${mount})`,
      'icy-description': 'a test tone that is nobody\'s radio station',
      'icy-genre': 'test',
      'icy-br': String(KBPS),
      ...(wantsMeta ? { 'icy-metaint': String(METAINT) } : {}),
    });
    listeners++;

    // Start mid-file on a frame boundary; the metadata counter carries across the loop.
    // why: lessons/harness.md#boundary
    let at = Math.floor(Math.random() * AUDIO.length);
    let sinceMeta = 0, sent = 0, titles = 0;
    // Paced against the clock (bytes owed since connect), not the timer: timer pacing ran 2.3% slow
    // and drained the page's cushion.
    // why: lessons/harness.md#paced
    const t0 = Date.now();
    const timer = setInterval(() => {
      // Owed = what the clock says, plus the burst a new listener is given at
      // once, minus what has gone out.
      let need = Math.max(0, Math.round(((Date.now() - t0) / 1000) * BYTES_PER_S) + BURST - sent);
      while (need > 0) {
        const room = wantsMeta ? Math.min(need, METAINT - sinceMeta) : need;
        const end = Math.min(at + room, AUDIO.length);
        const slice = AUDIO.subarray(at, end);
        if (!res.write(slice)) { /* the socket will drain; pacing is the cap */ }
        sent += slice.length; sinceMeta += slice.length; need -= slice.length;
        at = end === AUDIO.length ? 0 : end;
        if (wantsMeta && sinceMeta >= METAINT) {
          // A title every fourth block, and nothing in between, which is what a
          // real mount does: most blocks are the single zero byte.
          res.write(metaBlock(++titles % 4 === 1 ? `stand-in ${titles} · 220 + 330 Hz` : null));
          sinceMeta = 0;
        }
      }
    }, TICK_MS);

    const stop = () => {
      clearInterval(timer);
      listeners--;
      say(`  ${mount}: gone after ${(sent / 1024).toFixed(0)} KB`);
    };
    req.on('close', stop);
    res.on('error', stop);
    say(`  ${mount}: a listener${wantsMeta ? ' wanting titles' : ''}`);
  });

  server.listen(port, '127.0.0.1');
  return server;
}

// Run directly: a station on 8899 (or `--port`), and the URL to open.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const argv = process.argv.slice(2);
  const port = Number(argv[argv.indexOf('--port') + 1]) || 8899;
  const server = startStation({ port });
  if (!server) process.exit(1);
  server.on('listening', () => {
    const p = server.address().port;
    console.log(`stand-in station on http://127.0.0.1:${p}`);
    console.log(`  http://127.0.0.1:8890/archive/radio/?base=http://127.0.0.1:${p}`);
  });
}
