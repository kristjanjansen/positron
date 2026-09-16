// demo/fake-station.mjs — an Icecast mount that is nobody's radio station.
//
//   node demo/fake-station.mjs                 # :8899, every mount the page asks for
//   node demo/fake-station.mjs --port 9100
//
// Then open the page against it:
//   http://127.0.0.1:8890/radio/?base=http://127.0.0.1:8899
//
// 🔴 WHY THIS EXISTS, AND IT IS THE FIRST RULE IN CLAUDE.MD RATHER THAN A
// CONVENIENCE. Every station `/radio/` offers is an ERR mount, ERR told us our
// listeners were corrupting their audience figures, and the standing rule is
// that a connection to one of their mounts is opened only when a PERSON is
// going to listen to it. That left the page's decode and loop paths ungradeable:
// a change to them could be shipped, and could only be checked by becoming a
// listener at a public broadcaster.
//
// So this is a mount with the same shape and none of the ethics: real MP3
// frames, real ICY headers, a real `icy-metaint` text channel with a title in
// it, paced at its own bitrate so the page's arrival gaps and buffer numbers
// mean what they mean on a live stream. `?base=` is already in the page, so
// nothing has to be added there to use it.
//
// ⚠️ IT IS NOT A CLAIM ABOUT ERR. What it grades is OUR code: does the demuxer
// find frames, does the decoder configure, does a loop keep the seconds and play
// them round, backwards and there-and-back. It says nothing about whether a
// broadcaster's mount is up, and a page that works here can still meet a 403
// out there.
//
// ⚠️ IT NEEDS ffmpeg, ONCE. The audio is generated the first time and cached in
// the system temporary directory: a repository is the wrong place for a
// megabyte of test tone. With no ffmpeg it says so and exits, because a harness
// that cannot run has to say why rather than serve silence that reads as a
// broken page.

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

/**
 * Thirty seconds of something with a shape to it: two tones a fifth apart, one
 * of them pulsing at 2 Hz.
 *
 * 🔴 NOT SILENCE AND NOT WHITE NOISE. A loop over silence passes every check
 * that counts frames and none that measure a level, which is the vacuous pass
 * this repo has already shipped twice. A tone has a peak a meter can read, and a
 * PULSE means a check can tell a loop playing backwards from one playing
 * forwards by looking at where the loud part landed.
 */
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
    // ⚠️ IT SAYS WHY AND RETURNS FALSE RATHER THAN EXITING. A harness importing
    // this has to be able to report "the stand-in could not be built" as the
    // reason a page was not graded, which is a different sentence from a page
    // that failed.
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
/**
 * 🔴 IT BURSTS AT CONNECT, BECAUSE ICECAST DOES, AND A PAGE THAT MEASURES ITS
 * OWN CUSHION CAN TELL. `burst-size` defaults to 65536 bytes on a real mount:
 * four seconds of 128 kbit/s audio arrive at once so a new listener has
 * something in hand before the paced bytes start. `/radio/`'s own settled-rate
 * check already names it (*"the difference is Icecast's burst"*).
 *
 * MEASURED without it: the page's cushion sat at 199 ms against a 104 ms worst
 * gap, which is 95 ms of headroom and a red `the cushion outlasts the worst gap
 * in it` at a threshold of 100. That assert was reading a property of this file
 * rather than of the page, which is the whole failure mode a stand-in has.
 */
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

/**
 * Start it. `port: 0` lets the OS choose, which is what a harness should do:
 * a fixed port is a shared mutable global, and this repo has already paid for
 * that twice (a suite and a dev server on 8890, a harness attaching to the
 * previous run's Chrome).
 *
 * Returns the server, or `null` when there is no audio to serve.
 */
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

    /**
     * 🔴 THE SAME SHAPE `shout` ANSWERS, because the page asks this BEFORE it
     * plays anything and disables its play button when nothing is up. A stand-in
     * that answered a different shape would take the page down the "neither
     * station is answering" path, where it makes one assert and none of the
     * thirty-four that matter. Every mount asked about is up here, which is the
     * one thing a stand-in can honestly say about itself.
     */
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

    // 🔴 IT STARTS ON A FRAME BOUNDARY, WHICH IS THE WHOLE POINT OF A STAND-IN
    // THAT IS HONEST. A real mount joins a listener mid-frame and the splitter has
    // to resynchronise; starting at byte 0 of the file would let a scanner that
    // can only find frames at the head pass. `sinceMeta` carries across the loop
    // for the same reason: the text channel does not restart when the audio does.
    let at = Math.floor(Math.random() * AUDIO.length);
    let sinceMeta = 0, sent = 0, titles = 0;
    /**
     * 🔴 PACED AGAINST THE CLOCK, NOT AGAINST THE TIMER, AND THE DIFFERENCE WAS
     * MEASURABLE FROM INSIDE THE PAGE. Sending a fixed chunk per `setInterval`
     * tick sends at the rate the timer actually fires, and node's timers run a
     * millisecond or two late: MEASURED through `/radio/`'s own settled-rate
     * readout, **125 kbit/s against the 128 declared**, which is 2.3% slow. A
     * listener then loses about 23 ms of cushion every second, so the page's
     * 600 ms floor drained to 32 ms over half a minute and its `the cushion
     * outlasts the worst gap in it` check went red about a page that was
     * working perfectly. A real Icecast paces against its own audio clock; so
     * does this now, by sending however many bytes are OWED since the
     * connection opened.
     */
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
    console.log(`  http://127.0.0.1:8890/radio/?base=http://127.0.0.1:${p}`);
  });
}
