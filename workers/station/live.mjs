// live.mjs: the recorder for a live slot, the half of "a show someone
// broadcasts into the station" that runs where the sound is (asked 2026-10-01:
// "live: a show someone broadcasts into the station. build it. how to test?").
// The station already takes the other half: POST /live/<key>/append with one
// MP3 chunk puts it in R2 and on the slot's list, and POST /live/<key>/close
// ends the show (worker.mjs). This reads an MP3 stream, cuts it on frame
// boundaries into pieces of about ten seconds, and posts each one, so the
// chunk is the encoder's own frames: nothing is re-encoded here.
//
//   node workers/station/live.mjs --key <slot> [--channel <name>] [--src <url|file>] [--realtime] [--secs 10]
//
//   a microphone, through ffmpeg (macOS):
//     ffmpeg -f avfoundation -i ":0" -ac 2 -ar 44100 -b:a 128k -f mp3 - | node workers/station/live.mjs --key mic-test
//   an Icecast mount:   node workers/station/live.mjs --key night --src https://example.org/mount.mp3
//   a file, at the pace it would be heard:   node workers/station/live.mjs --key rehearsal --src take.mp3 --realtime
//
// The token is STATION_TOKEN from the environment or from this repository's
// git-ignored .env; the station is STATION_BASE or positron-station's
// workers.dev address. Ctrl-C closes the show (POST /close) after sending what
// is buffered. The slot must be in the channel's running order as
// {"key": "<slot>", "kind": "live"}; until a first chunk arrives it plays
// nothing, and while it is open the station's edge is its last chunk.
import { readFileSync, createReadStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const KEY = arg('key');
if (!KEY || KEY === true) { console.error('--key <slot> is required'); process.exit(2); }
const CHANNEL = arg('channel', 'main');
const SRC = arg('src');
const REALTIME = !!arg('realtime', false);
const SECS = Number(arg('secs', 10));
const ENV = (() => { try { return readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env'), 'utf8'); } catch { return ''; } })();
const TOKEN = process.env.STATION_TOKEN || /^STATION_TOKEN=(.+)$/m.exec(ENV)?.[1]?.trim();
if (!TOKEN) { console.error('no STATION_TOKEN in the environment or in .env'); process.exit(2); }
const BASE = (process.env.STATION_BASE || 'https://positron-station.kristjan-jansen.workers.dev').replace(/\/$/, '');
// the default channel answers on the un-prefixed routes, any other under /c/<channel>/
const route = (tail) => `${BASE}${CHANNEL === 'main' ? '' : `/c/${encodeURIComponent(CHANNEL)}`}/live/${encodeURIComponent(KEY)}/${tail}`;

// MPEG audio Layer III frames, the same reading worker.mjs's frameAt() does
const BR1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const BR2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const RATES = [[11025, 12000, 8000], null, [22050, 24000, 16000], [44100, 48000, 32000]];
function frame(b, i) {
  if (i + 4 > b.length || b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) return null;
  const ver = (b[i + 1] >> 3) & 3, layer = (b[i + 1] >> 1) & 3;
  if (ver === 1 || layer !== 1) return null;
  const bi = (b[i + 2] >> 4) & 15, si = (b[i + 2] >> 2) & 3;
  if (bi === 0 || bi === 15 || si === 3) return null;
  const rate = RATES[ver][si], kbps = (ver === 3 ? BR1 : BR2)[bi];
  const len = Math.floor((ver === 3 ? 144 : 72) * kbps * 1000 / rate) + ((b[i + 2] >> 1) & 1);
  return len < 8 ? null : { len, dur: (ver === 3 ? 1152 : 576) / rate };
}

let buf = Buffer.alloc(0);     // bytes not yet cut into a frame
let piece = [], pieceDur = 0;  // whole frames waiting to be sent
let seq = Date.now();          // a chunk's number; time-based so a restarted recorder never reuses one
let sent = 0, inFlight = Promise.resolve();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(bytes, dur) {
  const n = seq++;
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(`${route('append')}?seq=${n}`, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'audio/mpeg' }, body: bytes });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(`${r.status} ${j.error || ''}`);
      sent++;
      console.log(`chunk ${sent}: ${dur.toFixed(2)} s, ${bytes.length} bytes, ${j.segments ?? '?'} on the slot`);
      return;
    } catch (e) {
      if (attempt >= 3) { console.error(`chunk ${n} lost after 3 tries: ${e.message}`); return; }
      await sleep(1000 * attempt);
    }
  }
}

function flush(force = false) {
  if (!piece.length || (!force && pieceDur < SECS)) return;
  const bytes = Buffer.concat(piece), dur = pieceDur;
  piece = []; pieceDur = 0;
  // chunks go out in order: the station plays them in the order they were appended
  inFlight = inFlight.then(() => post(bytes, dur));
}

let started = 0, played = 0;   // for --realtime: hold the reader to the clock
async function feed(chunk) {
  buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
  let i = 0;
  while (i < buf.length) {
    const f = frame(buf, i);
    if (!f) {
      // not on a frame: skip a byte, unless the frame may simply be cut off at the end of what has arrived
      if (buf.length - i < 4 || (buf[i] === 0xff && buf.length - i < 1500)) break;
      i++; continue;
    }
    if (i + f.len > buf.length) break;
    piece.push(buf.subarray(i, i + f.len)); pieceDur += f.dur; played += f.dur;
    i += f.len;
    flush();
  }
  buf = buf.subarray(i);
  if (REALTIME) { if (!started) started = Date.now(); const ahead = played * 1000 - (Date.now() - started); if (ahead > 0) await sleep(ahead); }
}

async function close() {
  flush(true);
  await inFlight;
  const r = await fetch(route('close'), { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } }).catch((e) => ({ ok: false, statusText: e.message }));
  console.log(r.ok ? `closed ${KEY} on ${CHANNEL} after ${sent} chunks` : `close failed: ${r.status || ''} ${r.statusText || ''}`);
}

let closing = false;
process.on('SIGINT', async () => { if (closing) process.exit(1); closing = true; console.log('closing...'); await close(); process.exit(0); });

console.log(`live ${KEY} on ${CHANNEL} at ${BASE}, ${SECS} s chunks${REALTIME ? ', at real time' : ''}`);
let stream;
if (!SRC || SRC === true) stream = process.stdin;
else if (/^https?:\/\//.test(SRC)) { const r = await fetch(SRC, { headers: { 'icy-metadata': '0' } }); if (!r.ok) { console.error(`${SRC} answered ${r.status}`); process.exit(1); } stream = r.body; }
else stream = createReadStream(SRC);
for await (const c of stream) { await feed(Buffer.from(c)); if (closing) break; }
if (!closing) await close();
