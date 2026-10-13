// demo/fake-arhiiv.mjs: an ERR archive that is nobody's archive.
//
//   node demo/fake-arhiiv.mjs                  # :8903
//   node demo/fake-arhiiv.mjs --port 9400
//
// Then open the page against it:
//   http://127.0.0.1:8890/history/newsreels/?base=http://127.0.0.1:8903
//
// WHY THIS EXISTS. /reel/ and /history/newsreels/ ask arhiiv.err.ee for a
// film's stream and then play it from vod.err.ee, and ERR has told us our
// headless browsers corrupt their audience figures (CLAUDE.md, "What costs real
// money and somebody else's server"). So a check that plays anything plays it
// from here: the same content API shape the pages read
// (`/api/v1/content/<video|audio>/<slug>` answering `data.media.src.hls`), and
// two small HLS streams made once with ffmpeg, a picture with no sound for
// every newsreel and a tone for every radio programme.
//
// IT GRADES OUR CODE AND NOTHING ELSE. Every slug gets the same twelve seconds,
// so it cannot say a film is missing, slow, or longer than the shot list says,
// and its URLs are absolute http rather than ERR's protocol relative ones, so
// the page's `//` pinning is never exercised here.
//
// NEEDS ffmpeg, once; the segments are cached in the system temp directory.

import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, createReadStream } from 'node:fs';
import { join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const PORT = Number(arg('--port', 8903));
const CACHE = join(tmpdir(), 'positron-fake-arhiiv');
const SECONDS = 12;

function make(dir, args) {
  const out = join(CACHE, dir);
  if (existsSync(join(out, 'index.m3u8'))) return;
  mkdirSync(out, { recursive: true });
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args,
    '-t', String(SECONDS), '-f', 'hls', '-hls_time', '4', '-hls_playlist_type', 'vod',
    join(out, 'index.m3u8')]);
}
try {
  // A test picture with a SILENT audio track, as AK filmikroonika is: the
  // films were shot mute and ERR's audio group carries silence.
  make('film', ['-f', 'lavfi', '-i', `testsrc2=size=640x360:rate=25`,
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-g', '50', '-c:a', 'aac', '-b:a', '64k', '-shortest']);
  // The radio: a quiet 440 Hz tone, audio only.
  make('radio', ['-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000',
    '-af', 'volume=0.2', '-c:a', 'aac', '-b:a', '64k']);
} catch (e) {
  console.error(`fake-arhiiv: ffmpeg could not make the streams (${e.message}). Nothing is served.`);
  process.exit(1);
}

const TYPES = { '.m3u8': 'application/vnd.apple.mpegurl', '.ts': 'video/mp2t', '.m4s': 'video/iso.segment' };
let reaches = 0;

createServer((req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  const url = new URL(req.url, `http://${req.headers.host}`);
  const api = url.pathname.match(/^\/api\/v1\/content\/(video|audio)\/([^/]+)$/);
  if (api) {
    reaches += 1;
    const dir = api[1] === 'video' ? 'film' : 'radio';
    const body = { data: { media: { src: { hls: `http://${req.headers.host}/${dir}/index.m3u8` } } } };
    console.log(`content ${api[1]} ${decodeURIComponent(api[2])} (${reaches} asked)`);
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
    return;
  }
  const file = normalize(join(CACHE, url.pathname));
  if (!file.startsWith(CACHE) || !existsSync(file)) { res.statusCode = 404; res.end(); return; }
  res.setHeader('content-type', TYPES[file.slice(file.lastIndexOf('.'))] || 'application/octet-stream');
  createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`fake-arhiiv on http://127.0.0.1:${PORT}, ${SECONDS} s of film and of radio for every slug`));
