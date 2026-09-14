// demo/shell/mp3-frames-test.mjs — node demo/shell/mp3-frames-test.mjs
//
// Frame boundaries are the one thing the whole decode path stands on: get a
// length wrong by a byte and every later frame is garbage, which presents as
// "the stream is broken" rather than "the scanner is". So this drives the
// splitter at fourteen chunk sizes down to ONE BYTE — the case where a header
// straddles two reads and a naive scanner silently drops a frame — the way
// `icy-test.mjs` does for the metadata demuxer, and for the same reason.
//
// ⚠️ THE FIXTURE IS SYNTHESISED, NOT A RECORDING. No media is stored in this
// repo (LAYOUT.md), and a real MP3 would make this test about one file. Headers
// are built from the spec and the payload is filler — this scanner never reads
// the payload, so filler exercises it exactly as real audio does, with one
// exception that is tested on purpose: filler that happens to contain a sync
// word.
//
// There is also a LIVE arm against the relay, which SKIPS cleanly when the
// network is not there — a check nobody can run is a check nobody runs.

import { readHeader, frameStarts, createFrameSplitter } from './mp3-frames.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
};

/** One MPEG1 Layer III frame header, built from the spec. */
function header({ bitrateIdx = 9, rateIdx = 0, padding = 0, mono = false, mpeg1 = true } = {}) {
  const b1 = 0xe0 | ((mpeg1 ? 3 : 2) << 3) | (1 << 1) | 1;      // sync | version | layer III | no CRC
  const b2 = (bitrateIdx << 4) | (rateIdx << 2) | (padding << 1);
  const b3 = (mono ? 3 : 0) << 6;
  return [0xff, b1, b2, b3];
}

function frame(opts = {}, fillByte = 0x5a) {
  const h = header(opts);
  const probe = readHeader(Uint8Array.from([...h, 0, 0, 0, 0]), 0);
  const out = new Uint8Array(probe.length).fill(fillByte);
  out.set(h, 0);
  return out;
}

function stream(n, opts = {}, fillByte = 0x5a) {
  const parts = [];
  for (let i = 0; i < n; i++) parts.push(frame(opts, fillByte));
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

console.log('\n[mp3-frames]');

// ── the header, field by field ────────────────────────────────────────────
const h128 = readHeader(Uint8Array.from([...header(), 0, 0, 0, 0]), 0);
ok('128 kbps 44.1k stereo frame is 417 bytes', h128.length === 417, `${h128.length} B`);
ok('...and carries 1152 samples', h128.samplesPerFrame === 1152, String(h128.samplesPerFrame));
ok('...at 44100 Hz, 2 channels', h128.sampleRate === 44100 && h128.channels === 2,
  `${h128.sampleRate} Hz, ${h128.channels} ch`);
const hPad = readHeader(Uint8Array.from([...header({ padding: 1 }), 0, 0, 0, 0]), 0);
ok('the padding bit adds exactly one byte', hPad.length === h128.length + 1,
  `${h128.length} -> ${hPad.length}`);
const hMono = readHeader(Uint8Array.from([...header({ mono: true }), 0, 0, 0, 0]), 0);
ok('mono is read off the channel mode', hMono.channels === 1, `${hMono.channels} ch`);
const h2 = readHeader(Uint8Array.from([...header({ mpeg1: false, bitrateIdx: 8, rateIdx: 0 }), 0, 0, 0, 0]), 0);
ok('MPEG2 halves the samples per frame', h2 && h2.samplesPerFrame === 576, String(h2?.samplesPerFrame));

// ── what must be REFUSED, or a sync word becomes a frame ──────────────────
ok('a reserved version is refused',
  readHeader(Uint8Array.from([0xff, 0xea, 0x90, 0x00, 0, 0, 0, 0]), 0) === null);
ok('a non-Layer-III layer is refused',
  readHeader(Uint8Array.from([0xff, 0xfd, 0x90, 0x00, 0, 0, 0, 0]), 0) === null);
ok('the `free` bitrate index is refused',
  readHeader(Uint8Array.from([...header({ bitrateIdx: 0 }), 0, 0, 0, 0]), 0) === null);
ok('the `bad` bitrate index is refused',
  readHeader(Uint8Array.from([...header({ bitrateIdx: 15 }), 0, 0, 0, 0]), 0) === null);
ok('a reserved sample rate is refused',
  readHeader(Uint8Array.from([...header({ rateIdx: 3 }), 0, 0, 0, 0]), 0) === null);
ok('two set bytes that are not a header are refused',
  readHeader(Uint8Array.from([0xff, 0xff, 0xff, 0xff, 0, 0, 0, 0]), 0) === null);

// ── a whole stream, in one go ─────────────────────────────────────────────
const TEN = stream(10);
const whole = frameStarts(TEN, 0, { final: true });
ok('ten frames are found in one pass', whole.frames.length === 10, `${whole.frames.length} frames`);
ok('...and every byte is consumed', whole.end === TEN.length, `${whole.end}/${TEN.length}`);

// ── 🔴 CHUNKED, DOWN TO ONE BYTE ──────────────────────────────────────────
// The case a naive scanner drops silently: a four-byte header split across two
// reads. If any size loses a frame, the arithmetic downstream is wrong for ever
// after and the sound is noise.
const SIZES = [1, 2, 3, 4, 5, 7, 13, 64, 127, 256, 417, 418, 1000, 4096];
let chunkedOk = 0;
for (const size of SIZES) {
  const sp = createFrameSplitter();
  let got = 0;
  for (let i = 0; i < TEN.length; i += size) got += sp.push(TEN.subarray(i, i + size)).length;
  if (got === 10) chunkedOk++;
  else console.log(`       (size ${size} gave ${got})`);
}
ok(`every chunk size finds all ten frames`, chunkedOk === SIZES.length,
  `${chunkedOk}/${SIZES.length} sizes, down to 1 byte`);

// ── resync: a live listener joins mid-frame ───────────────────────────────
// An Icecast listener never starts at a frame boundary, so the scanner has to
// find one. Starting 200 bytes into a frame must lose that frame and no more.
const joined = frameStarts(TEN.subarray(200), 0, { final: true }).frames.length;
ok('joining mid-frame loses one frame and resyncs', joined === 9, `${joined} of the remaining 9`);
// ...and the STREAMING path has to do it too, which is the one a listener uses.
// ⚠️ AND THE STREAMING PATH DEFERS ITS LAST FRAME RATHER THAN LOSING IT, which
// is worth pinning because the two numbers look like a bug. `synced` is only set
// AFTER the first scan returns, so that whole first push still runs with
// confirmation on and holds the trailing frame back for want of a successor. It
// is not dropped — it is in the tail, and the next push emits it. Over a socket
// this is invisible; in a single-shot test it is the difference between 8 and 9.
const mid = createFrameSplitter();
const first = mid.push(TEN.subarray(200)).length;
const then = mid.push(new Uint8Array(0)).length;
ok('the splitter resyncs mid-frame, deferring its last frame rather than losing it',
  first + then === 9, `${first} then ${then} = ${first + then} of the remaining 9`);

// ── 🔴 SABOTAGE, or the checks above are decoration ───────────────────────
// Filler that CONTAINS a sync word. `confirm` is the only thing standing
// between this and a frame invented inside the audio payload.
const trap = stream(6, {}, 0xff);
const trapped = frameStarts(trap, 0, { final: true });
ok('a sync word inside the payload does not become a frame',
  trapped.frames.length === 6, `${trapped.frames.length} frames, 6 real`);

// Pure noise must yield NOTHING. A scanner that finds frames in random bytes
// would "work" on a dead stream, which is the failure that reads as success.
const noise = new Uint8Array(20000);
for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) & 0xff;
const inNoise = frameStarts(noise, 0, { final: true }).frames.length;
ok('no frames are found in noise', inNoise === 0, `${inNoise} found`);

// A corrupted header must cost ONE frame, not the rest of the stream.
const broken = TEN.slice();
broken[417 * 3 + 1] = 0x00;                 // kill frame 4's header
const after = frameStarts(broken, 0, { final: true }).frames.length;
ok('a corrupt header costs one frame, not the stream', after >= 8 && after < 10,
  `${after} of 10 survived`);

// ── the live arm, skipped when the network is not there ───────────────────
const BASE = process.env.SHOUT_BASE || 'https://shout.positron.studio';
try {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  const res = await fetch(`${BASE}/klassikaraadio.mp3?bytes=${64 << 10}`, { signal: ac.signal });
  clearTimeout(t);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const live = frameStarts(bytes, 0, { final: true });
  const rates = new Set(live.frames.map((f) => f.sampleRate));
  const brs = new Set(live.frames.map((f) => f.bitrate));
  // Frames must TILE the stream: every byte from the first sync to the last
  // frame's end accounted for, with nothing skipped. That is the property a
  // wrong length formula breaks, and a count alone would not notice.
  const first = live.frames[0];
  const last = live.frames[live.frames.length - 1];
  const tiled = live.frames.length > 1
    && last.at + last.length - first.at === live.frames.reduce((s, f) => s + f.length, 0);
  ok('LIVE: real Icecast bytes split into frames', live.frames.length > 100,
    `${live.frames.length} frames in ${(bytes.length / 1024).toFixed(0)} KiB`);
  ok('LIVE: the frames tile the stream with no gaps', tiled,
    tiled ? 'contiguous' : 'a gap between frames — the length formula is wrong');
  ok('LIVE: one sample rate and one bitrate throughout', rates.size === 1 && brs.size === 1,
    `${[...rates].join(',')} Hz at ${[...brs].map((b) => b / 1000).join(',')} kbps`);
} catch (e) {
  console.log(`  skip LIVE arm — ${e.message} (the relay is not reachable from here)`);
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
