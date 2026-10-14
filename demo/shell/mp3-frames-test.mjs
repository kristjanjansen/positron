// demo/shell/mp3-frames-test.mjs: frame boundaries at fourteen chunk sizes down to one byte.
// The fixture is synthesised from the spec (no media in the repo); filler with a sync word is
// tested on purpose. The live arm against the relay skips cleanly without a network.
// why: lessons/kit-mp3-frames.md#test-header

import { readHeader, readAdtsHeader, frameStarts, createFrameSplitter, framingFor }
  from './mp3-frames.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' · ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' · ' + detail : ''}`); }
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

// Chunked, down to one byte: a four byte header split across two reads.
// why: lessons/kit-mp3-frames.md#test-chunked
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
// ...and the streaming path, which defers the trailing frame to the next push rather than
// losing it: 8 here, not 9.
// why: lessons/kit-mp3-frames.md#test-streaming-defers
const mid = createFrameSplitter();
const first = mid.push(TEN.subarray(200)).length;
const then = mid.push(new Uint8Array(0)).length;
ok('the splitter resyncs mid-frame, deferring its last frame rather than losing it',
  first + then === 9, `${first} then ${then} = ${first + then} of the remaining 9`);

// Sabotage: filler that contains a sync word; confirm is all that stops an invented frame.
// why: lessons/kit-mp3-frames.md#test-sabotage
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

// ══ AAC in ADTS ═══════════════════════════════════════════════════════════
console.log('\n[adts-frames]');

/** One ADTS frame header, built from the spec. `len` includes the header. */
function adtsHeader({ profile = 1, rateIdx = 4, chanCfg = 2, len = 928,
                      protectionAbsent = 1, blocks = 1, layer = 0, mpeg2 = 0 } = {}) {
  return [
    0xff,
    0xf0 | (mpeg2 << 3) | (layer << 1) | protectionAbsent,
    (profile << 6) | (rateIdx << 2) | ((chanCfg >> 2) & 0x01),
    ((chanCfg & 0x03) << 6) | ((len >> 11) & 0x03),
    (len >> 3) & 0xff,
    ((len & 0x07) << 5) | 0x1f,          // buffer fullness 0x7FF, which means VBR
    0xfc | (blocks - 1),
  ];
}
const adtsProbe = (o) => readAdtsHeader(Uint8Array.from([...adtsHeader(o), 0, 0, 0]), 0);

function adtsFrame(opts = {}, fillByte = 0x5a) {
  const h = adtsHeader(opts);
  const out = new Uint8Array(opts.len ?? 928).fill(fillByte);
  out.set(h, 0);
  return out;
}
function adtsStream(n, opts = {}, fillByte = 0x5a) {
  const one = adtsFrame(opts, fillByte);
  const out = new Uint8Array(one.length * n);
  for (let i = 0; i < n; i++) out.set(one, i * one.length);
  return out;
}

const a320 = adtsProbe();
ok('the 13-bit length spans three bytes and reads back exactly',
  a320.length === 928, `${a320.length} B`);
ok('...1024 samples at 44100 Hz, 2 channels',
  a320.samplesPerFrame === 1024 && a320.sampleRate === 44100 && a320.channels === 2,
  `${a320.samplesPerFrame} samples, ${a320.sampleRate} Hz, ${a320.channels} ch`);
ok('...and LC profile reads as mp4a.40.2', a320.codec === 'mp4a.40.2', a320.codec);
// A length near the 13-bit ceiling proves the shifts are not losing a top bit.
ok('a length of 8191 survives the shifts', adtsProbe({ len: 8191 })?.length === 8191,
  String(adtsProbe({ len: 8191 })?.length));
ok('four raw data blocks are four times the samples',
  adtsProbe({ blocks: 4 })?.samplesPerFrame === 4096,
  String(adtsProbe({ blocks: 4 })?.samplesPerFrame));
ok('the sample rate index is read, not assumed',
  adtsProbe({ rateIdx: 3 })?.sampleRate === 48000, String(adtsProbe({ rateIdx: 3 })?.sampleRate));
ok('mono is read off the channel configuration',
  adtsProbe({ chanCfg: 1 })?.channels === 1, String(adtsProbe({ chanCfg: 1 })?.channels));
ok('channel configuration 7 is eight channels, not seven',
  adtsProbe({ chanCfg: 7 })?.channels === 8, String(adtsProbe({ chanCfg: 7 })?.channels));
// A CRC frame shorter than its own header is refused, whichever header it claims.
// why: lessons/kit-mp3-frames.md#test-crc
ok('a CRC frame shorter than 9 bytes is refused',
  adtsProbe({ protectionAbsent: 0, len: 8 }) === null);
ok('a frame shorter than its own header is refused', adtsProbe({ len: 6 }) === null);
ok('a reserved sample rate index is refused', adtsProbe({ rateIdx: 13 }) === null);
ok('channel configuration 0 is refused: the count is not in the frame',
  adtsProbe({ chanCfg: 0 }) === null);
ok('a non-zero layer is refused: that is MPEG audio', adtsProbe({ layer: 1 }) === null);

// The control: each scanner finds its own framing and nothing in the other's.
// why: lessons/kit-mp3-frames.md#test-control
const TEN_ADTS = adtsStream(10);
ok('CONTROL: the ADTS reader finds every ADTS frame',
  frameStarts(TEN_ADTS, 0, { framing: 'adts', final: true }).frames.length === 10);
ok('CONTROL: ...and none at all in MPEG audio',
  frameStarts(TEN, 0, { framing: 'adts', final: true }).frames.length === 0,
  `${frameStarts(TEN, 0, { framing: 'adts', final: true }).frames.length} found`);
ok('CONTROL: the MPEG reader finds every MPEG frame',
  frameStarts(TEN, 0, { framing: 'mpeg', final: true }).frames.length === 10);
ok('CONTROL: ...and none at all in ADTS',
  frameStarts(TEN_ADTS, 0, { framing: 'mpeg', final: true }).frames.length === 0,
  `${frameStarts(TEN_ADTS, 0, { framing: 'mpeg', final: true }).frames.length} found`);

// ADTS chunked down to one byte: the walk must not be bounded at the MPEG header size of 4.
// why: lessons/kit-mp3-frames.md#test-adts-chunked
let adtsChunked = 0;
for (const size of SIZES) {
  const sp = createFrameSplitter({ framing: 'adts' });
  let got = 0;
  for (let i = 0; i < TEN_ADTS.length; i += size) got += sp.push(TEN_ADTS.subarray(i, i + size)).length;
  if (got === 10) adtsChunked++;
  else console.log(`       (size ${size} gave ${got})`);
}
ok('every chunk size finds all ten ADTS frames', adtsChunked === SIZES.length,
  `${adtsChunked}/${SIZES.length} sizes, down to 1 byte`);

const adtsTrap = frameStarts(adtsStream(6, {}, 0xff), 0, { framing: 'adts', final: true });
ok('a sync word inside the AAC payload does not become a frame',
  adtsTrap.frames.length === 6, `${adtsTrap.frames.length} frames, 6 real`);
ok('no ADTS frames are found in noise',
  frameStarts(noise, 0, { framing: 'adts', final: true }).frames.length === 0);

// ── which framing a content-type names ────────────────────────────────────
ok('audio/mpeg names the MPEG framing', framingFor('audio/mpeg') === 'mpeg');
ok('audio/aac names ADTS', framingFor('audio/aac') === 'adts');
ok('a charset parameter does not confuse it', framingFor('audio/aac;charset=utf-8') === 'adts');
ok('a type neither name matches answers null, never a default',
  framingFor('application/ogg') === null && framingFor('') === null);

// ── the splitter with no content-type has to look at the bytes ────────────
for (const [name, bytes, want] of [['MPEG audio', TEN, 'mpeg'], ['ADTS', TEN_ADTS, 'adts']]) {
  const sp = createFrameSplitter();
  let got = 0;
  for (let i = 0; i < bytes.length; i += 300) got += sp.push(bytes.subarray(i, i + 300)).length;
  ok(`an unlabelled stream of ${name} is sniffed`, sp.framing === want && got === 10,
    `${sp.framing}, ${got} frames`);
}

// The live arm, skipped without a network. A list of mounts, so one station's 502 is not a skip.
// why: lessons/kit-mp3-frames.md#test-live
const BASE = process.env.SHOUT_BASE || 'https://shout.positron.studio';
const LIVE = [
  ['MP3', 'mpeg', 44100,
    ['klassikaraadio', 'raadiotallinn', 'raadio4', 'vikerraadio', 'raadio2']
      .map((id) => `${BASE}/${id}.mp3?bytes=${64 << 10}`)],
  // IDA sends CORS and TLS of its own, so this arm needs no relay at all.
  ['AAC', 'adts', 44100,
    []],   // IDA removed 2026-09-15 at their operator's request
];

for (const [label, framing, wantRate, urls] of LIVE) {
  let bytes = null, from = '', ctype = '';
  for (const u of urls) {
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 8000);
      const res = await fetch(u, { signal: ac.signal });
      clearTimeout(t);
      if (!res.ok) { res.body?.cancel?.(); continue; }
      ctype = res.headers.get('content-type') || '';
      // The relay honours `?bytes=`; IDA does not, so read a bounded amount and
      // hang up rather than holding somebody else's Icecast open for ever.
      const reader = res.body.getReader();
      const parts = [];
      let n = 0;
      while (n < (64 << 10)) {
        const { value, done } = await reader.read();
        if (done) break;
        parts.push(value); n += value.length;
      }
      try { await reader.cancel(); } catch { /* an endless stream never ends */ }
      bytes = new Uint8Array(n);
      let at = 0;
      for (const p of parts) { bytes.set(p, at); at += p.length; }
      from = new URL(u).host + new URL(u).pathname;
      break;
    } catch { /* try the next one */ }
  }
  if (!bytes) { console.log(`  skip LIVE ${label}: none of ${urls.length} mounts answered`); continue; }

  ok(`LIVE ${label}: the content-type names the framing`, framingFor(ctype) === framing,
    `${ctype || 'absent'} -> ${framingFor(ctype)}`);
  const live = frameStarts(bytes, 0, { framing, final: true });
  const rates = new Set(live.frames.map((f) => f.sampleRate));
  // Frames must TILE the stream: every byte from the first sync to the last
  // frame's end accounted for, with nothing skipped. That is the property a
  // wrong length formula breaks, and a count alone would not notice.
  const first = live.frames[0];
  const last = live.frames[live.frames.length - 1];
  const tiled = live.frames.length > 1
    && last.at + last.length - first.at === live.frames.reduce((s, f) => s + f.length, 0);
  ok(`LIVE ${label}: real Icecast bytes split into frames`, live.frames.length > 50,
    `${live.frames.length} frames in ${(bytes.length / 1024).toFixed(0)} KiB from ${from}`);
  ok(`LIVE ${label}: the frames tile the stream with no gaps`, tiled,
    tiled ? 'contiguous' : 'a gap between frames: the length formula is wrong');
  ok(`LIVE ${label}: one sample rate throughout`, rates.size === 1 && rates.has(wantRate),
    `${[...rates].join(',')} Hz`);
  // And the other scanner must find nothing in it.
  // why: lessons/kit-mp3-frames.md#test-live-other
  const other = framing === 'mpeg' ? 'adts' : 'mpeg';
  const wrong = frameStarts(bytes, 0, { framing: other, final: true }).frames.length;
  ok(`LIVE ${label}: the ${other} reader finds nothing in it`, wrong === 0, `${wrong} found`);
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
