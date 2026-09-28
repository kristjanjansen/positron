// demo/shell/circuit-sample-test.mjs
// The sample half of the pack, against the real 64, with no browser.
//
//   node demo/shell/circuit-sample-test.mjs
//
// 🔴 IT READS `New Pack.circuitpack`, SOMEBODY'S ONLY BACKUP OF A DEVICE WITH NO
// FACTORY RESET. Reading is free. Nothing here writes a file, touches a port or
// modifies the pack, and the samples are pulled out of it IN MEMORY with
// `unzip.mjs` rather than extracted to disk.
//
// 🔴 THE REAL CORPUS CANNOT GRADE THE CHUNK WALKER, WHICH IS WHY HALF THIS FILE
// IS SYNTHETIC. All 64 samples are `fmt ` then `data` and nothing else, so the
// audio starts at offset 44 in 64 of 64 and a reader that skipped 44 bytes and
// called it a header would be green on every one of them. The fixtures below
// carry a `LIST` chunk of odd length before the data and another chunk after
// it, and they are the only thing in this repository that can tell the two
// readers apart.
//
// 🔴 AND THE SABOTAGES ARE THE POINT. A parser is easy to write green: it reads
// a file that is already correct. So a real sample is broken five ways here and
// the number of structural claims that go red is the measurement. One of them
// takes only 2 of 12 red and all ten survivors are RIGHT to survive, which is
// reported rather than tuned away.
import fs from 'node:fs';
import path from 'node:path';
import { readZip, entry } from './unzip.mjs';
import * as W from './circuit-sample.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const PACK = path.join(HERE, '../../tmp/personal/New Pack.circuitpack');
const BOUGHT = path.join(HERE, '../../tmp/purchages/Synth-Patches.com - Soundbank for Novation Circuit and Tracks.zip');
const PACKS = path.join(HERE, '../../tmp/packs');

let pass = 0, fail = 0, skip = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? '  ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? '  ' + detail : ''}`); }
};
const note = (s) => { skip++; console.log(`  skip ${s}`); };
const uniq = (a) => [...new Set(a)];

console.log('\n== the Circuit pack, sample side ==');

// ---------------------------------------------------------- the fixtures

// 🔴 THE TEST BUILDS WAV FILES AND THE MODULE DOES NOT, WHICH IS THE WHOLE
// ARRANGEMENT. A writer in `circuit-sample.mjs` would be a function that turns
// an intention into bytes aimed at an instrument, and the one in here cannot
// leave this file.
function chunk(id, body) {
  const pad = body.length & 1;
  const out = new Uint8Array(8 + body.length + pad);
  for (let i = 0; i < 4; i++) out[i] = id.charCodeAt(i);
  new DataView(out.buffer).setUint32(4, body.length, true);
  out.set(body, 8);
  return out;
}

function wav({ channels = 1, rate = 48000, bits = 16, format = 1,
  pcm = new Uint8Array(0), before = [], after = [], blockAlign, byteRate } = {}) {
  const align = blockAlign ?? channels * (bits / 8);
  const br = byteRate ?? rate * align;
  const fmt = new Uint8Array(16);
  const fv = new DataView(fmt.buffer);
  fv.setUint16(0, format, true);
  fv.setUint16(2, channels, true);
  fv.setUint32(4, rate, true);
  fv.setUint32(8, br, true);
  fv.setUint16(12, align, true);
  fv.setUint16(14, bits, true);
  const parts = [chunk('fmt ', fmt), ...before, chunk('data', pcm), ...after];
  const body = parts.reduce((n, p) => n + p.length, 0) + 4;
  const out = new Uint8Array(8 + body);
  out.set([0x52, 0x49, 0x46, 0x46], 0);                       // RIFF
  new DataView(out.buffer).setUint32(4, body, true);
  out.set([0x57, 0x41, 0x56, 0x45], 8);                       // WAVE
  let at = 12;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

const int16 = (values) => {
  const out = new Uint8Array(values.length * 2);
  const dv = new DataView(out.buffer);
  values.forEach((v, i) => dv.setInt16(i * 2, v, true));
  return out;
};

// 🔴 THREE BYTES LITTLE ENDIAN, WRITTEN BY HAND AND NOT BY A `DataView`, WHICH
// IS THE POINT. There is no `setInt24`, so this is an INDEPENDENT second
// implementation of the byte order the module reads: if both sides shared one
// helper the test would be grading the helper. Negative values are written as
// the two's complement in 24 bits, which is where the sign really lives.
const int24 = (values) => {
  const out = new Uint8Array(values.length * 3);
  values.forEach((v, i) => {
    const u = ((v % 0x1000000) + 0x1000000) % 0x1000000;
    out[i * 3] = u & 0xff;
    out[i * 3 + 1] = (u >> 8) & 0xff;
    out[i * 3 + 2] = (u >> 16) & 0xff;
  });
  return out;
};

/** Two channel frames from two equal length lists, left then right per frame. */
const interleave = (l, r) => l.flatMap((v, i) => [v, r[i]]);

console.log('\n-- the container, on files whose every number is known by construction --');

{
  const KNOWN = [0, 32767, -32768, 1, -1, 16384];
  const f = wav({ pcm: int16(KNOWN) });
  const w = W.readWave(f);
  ok('a plain fmt-then-data file parses, and its audio lands at 44',
    w.ok && w.dataAt === W.PLAIN_DATA_AT && w.length === 44 + KNOWN.length * 2,
    `${w.ok ? w.dataAt : w.why}`);
  ok('and every header field comes back as it was written',
    w.format === 1 && w.channels === 1 && w.rate === 48000 && w.bits === 16
    && w.byteRate === 96000 && w.blockAlign === 2 && w.fmtSize === 16
    && w.byteRateOk && w.blockAlignOk && w.riffSizeOk && !w.truncated);
  ok('6 frames of 48 kHz is 0.000125 s, derived from the data length and not from byteRate',
    w.frames === 6 && w.duration === 6 / 48000 && w.partialFrameBytes === 0,
    `${w.frames} frames, ${w.duration}`);

  const m = W.toMono(w);
  ok('the floats are the int16 values over 32768, full scale negative reaching exactly -1',
    m.ok && m.samples.length === 6
    && m.samples[0] === 0 && m.samples[1] === 32767 / 32768 && m.samples[2] === -1
    && m.samples[3] === 1 / 32768 && m.samples[5] === 0.5,
    m.ok ? `[${[...m.samples].join(', ')}]` : m.why);
  const c = W.content(w);
  ok('and the content reads peak 1, two clipped samples and nothing leading or trailing',
    c.peak === 1 && c.clipped === 2 && c.silent === false
    && c.leadingZeros === 1 && c.trailingZeros === 0 && c.sound === 5,
    `peak ${c.peak}, clipped ${c.clipped}, lead ${c.leadingZeros}`);
}

// 🔴 THE CHECK THE REAL PACK CANNOT MAKE. An odd length `LIST` before the data
// moves the audio to 58 and costs a pad byte, and a chunk after the data proves
// the walker does not stop when it has what it wants.
{
  const info = chunk('LIST', new Uint8Array([0x49, 0x4e, 0x46, 0x4f, 0x21]));   // 'INFO!' , 5 bytes
  const f = wav({ pcm: int16([100, -100, 0, 0]), before: [info], after: [chunk('fact', new Uint8Array(4))] });
  const w = W.readWave(f);
  ok('a LIST chunk of 5 bytes before the data moves the audio to 58, pad byte and all',
    w.ok && w.dataAt === 58 && w.frames === 4,
    w.ok ? `data at ${w.dataAt}` : w.why);
  ok('and the walker finds all four chunks, including the one after the data',
    w.chunkIds.join(' ') === 'fmt  LIST data fact', w.ok ? w.chunkIds.join(' ') : w.why);
  // ⚠️ THE CONTROL THAT MAKES THE ABOVE WORTH READING. A reader that assumed a
  // 44 byte header would read this file's LIST text as audio and say so to
  // nobody.
  const at44 = new DataView(f.buffer, f.byteOffset).getInt16(44, true);
  const real = new DataView(f.buffer, f.byteOffset).getInt16(58, true);
  ok('a 44 byte assumption would have read this file as noise, which is why the chunks are walked',
    at44 !== 100 && real === 100, `offset 44 holds ${at44}, offset 58 holds ${real}`);
}

// 🔴 A SILENT FILE IS A FINDING, NOT A FAILURE, AND IT HAS TO READ AS ONE.
{
  const w = W.readWave(wav({ pcm: new Uint8Array(200) }));
  const c = W.content(w);
  ok('a file of nothing but zeros parses, reads silent, and counts as all leading and no trailing',
    w.ok && c.silent && c.peak === 0 && c.rms === 0
    && c.leadingZeros === 100 && c.trailingZeros === 0 && c.sound === 0,
    `${c.leadingZeros} leading of ${c.frames}`);
  // ⚠️ AND AN EMPTY DATA CHUNK IS A THIRD THING AGAIN: NOT A REFUSAL, NOT
  // SILENCE WITH A LENGTH. A pack slot holding one of these is a slot a page
  // must show as 0.000 s rather than hide.
  const e = W.readWave(wav());
  const ec = W.content(e);
  const em = W.toMono(e);
  ok('a data chunk of zero bytes parses as 0 frames and 0.000 s, reads silent, and decodes to nothing',
    e.ok && e.dataBytes === 0 && e.frames === 0 && e.duration === 0
    && ec.silent && ec.sound === 0 && em.ok && em.samples.length === 0
    && W.summarise(e).seconds === 0,
    'an empty slot is a finding a table shows, not an error');
}

// ------------------------------------------------------------ the refusals

console.log('\n-- what it refuses, by name, as a value rather than a throw --');

{
  const cases = [
    ['a file too short to hold a RIFF header', new Uint8Array(8), '8 bytes'],
    ['something that is not RIFF at all', (() => { const f = wav(); f[1] = 0x58; return f; })(), 'RXFF'],
    ['a RIFF that is not a WAVE', (() => { const f = wav(); f.set([0x41, 0x56, 0x49, 0x20], 8); return f; })(), 'AVI '],
    ['a WAVE with no fmt chunk', (() => {
      const f = wav({ pcm: int16([1, 2]) }); f.set([0x66, 0x6d, 0x74, 0x78], 12); return f;
    })(), 'no fmt chunk'],
    // ⚠️ THE FIRST ATTEMPT AT THIS ONE WAS NOT A TEST OF ANYTHING. It passed
    // `wav()` with no audio, which still writes a `data` chunk of length zero,
    // and the reader accepted it correctly. An absent chunk and an empty one are
    // different files and both are below.
    ['a WAVE whose data chunk is named something else', (() => {
      const f = wav({ pcm: int16([1, 2]) }); f.set([0x64, 0x61, 0x74, 0x78], 36); return f;
    })(), 'no data chunk'],
    ['a fmt chunk too short to be PCM', (() => {
      const f = wav({ pcm: int16([1]) });
      new DataView(f.buffer, f.byteOffset).setUint32(16, 12, true); return f;
    })(), 'at least 16'],
    ['IEEE float, which is a format tag and not a depth', wav({ format: 3, bits: 32, pcm: new Uint8Array(8) }), 'IEEE float'],
    ['ADPCM, which is compressed', wav({ format: 2, pcm: new Uint8Array(8) }), 'ADPCM'],
    ['MP3 inside a RIFF wrapper', wav({ format: 85, pcm: new Uint8Array(8) }), 'MP3'],
    ['WAVE_FORMAT_EXTENSIBLE, which is not plain PCM either', wav({ format: 0xfffe, pcm: new Uint8Array(8) }), 'EXTENSIBLE'],
    ['0 channels', wav({ channels: 0, pcm: int16([1]), blockAlign: 2 }), '0 channels'],
    ['0 Hz', wav({ rate: 0, pcm: int16([1]) }), '0 Hz'],
    ['a block align of 0, which would divide by nothing', wav({ pcm: int16([1]), blockAlign: 0 }), 'Block align is 0'.toLowerCase()],
  ];
  let refused = 0, worded = 0, thrown = 0;
  for (const [what, bytes, word] of cases) {
    let r;
    try { r = W.readWave(bytes); } catch (e) { thrown++; r = { ok: true }; }
    if (r.ok === false) refused++;
    if (r.ok === false && r.why.toLowerCase().includes(word.toLowerCase())) worded++;
    else if (r.ok === false) console.log(`       ${what}: ${r.why}`);
  }
  ok(`all ${cases.length} bad files are refused, each with the reason in words, and not one throws`,
    refused === cases.length && worded === cases.length && thrown === 0,
    `${refused} refused, ${worded} worded, ${thrown} threw`);
  ok('and the wording is a sentence a page can show, not a code',
    W.readWave(new Uint8Array(8)).why === 'not a WAVE: 8 bytes, and a RIFF header alone is 12',
    W.readWave(new Uint8Array(8)).why);
}

// ═════════════════════════════════════ 24 bit, and the sign in the top byte ══
//
// 🔴 EVERY VALUE BELOW IS WRITTEN OUT BY HAND BEFORE THE MODULE IS ASKED
// ANYTHING, WHICH IS THE ONLY WAY A DEPTH BRANCH IS GRADED RATHER THAN
// EXERCISED. `DEPTHS` gained 24 on 2026-09-28 because 100 real files on this
// disk are 24 bit, and a 24 bit reader that is subtly wrong does not throw and
// does not look wrong: it produces audio at a strange amplitude or with the
// sign of every loud sample inverted, which is the module's own definition of
// the worst thing a decoder can hand a page.

console.log('\n-- 24 bit, three bytes little endian, the sign in the top one --');

{
  // 0, full scale positive, full scale negative, one step either way, and half
  // scale. The same six shapes the 16 bit block above uses, one depth along.
  const KNOWN24 = [0, 8388607, -8388608, 1, -1, 4194304];
  const w = W.readWave(wav({ bits: 24, pcm: int24(KNOWN24) }));
  ok('a 24 bit file parses, three bytes to a frame, and the duration comes off the data length',
    w.ok && w.bits === 24 && w.blockAlign === 3 && w.blockAlignOk && w.byteRateOk
    && w.frames === 6 && w.dataBytes === 18 && w.partialFrameBytes === 0,
    `${w.frames} frames of ${w.blockAlign} bytes`);
  const m = W.toMono(w);
  ok('and the floats are the int24 values over 8388608, full scale negative reaching exactly -1',
    m.ok && m.samples.length === 6
    && m.samples[0] === 0 && m.samples[1] === 8388607 / 8388608 && m.samples[2] === -1
    && m.samples[3] === 1 / 8388608 && m.samples[4] === -1 / 8388608 && m.samples[5] === 0.5,
    m.ok ? [...m.samples].join(', ') : m.why);

  // 🔴 THE SABOTAGE THAT SAYS THE SIGN IS READ FROM THE TOP BYTE AND NOT FROM
  // THE MIDDLE ONE. `0x00 0x00 0x80` is -8388608 and its low two bytes are
  // `00 00`, which a 16 bit reader calls 0 and a reader taking the sign off
  // byte 1 calls +8388608. Three answers, one file, and only one is right.
  const low = new DataView(w.data.buffer, w.data.byteOffset).getInt16(2 * 3, true);
  ok('SABOTAGE: reading the low two bytes of that full scale negative frame gives 0, not -1',
    low === 0 && m.samples[2] === -1,
    `the low 16 bits read ${low} and the frame is ${m.samples[2]}`);

  // 🔴 AND THE ONE A BYTE ORDER MISTAKE PRODUCES, WHICH IS THE COMMON ONE.
  // 0x123456 big endian is 0x563412, a completely different sample, and both
  // are inside -1 to 1 so nothing downstream could tell them apart.
  const be = W.toMono(W.readWave(wav({ bits: 24, pcm: Uint8Array.from([0x56, 0x34, 0x12]) })));
  ok('SABOTAGE: the bytes 56 34 12 read as 0x123456 and not as 0x563412, so the order is little endian',
    Math.round(be.samples[0] * 8388608) === 0x123456,
    `${Math.round(be.samples[0] * 8388608).toString(16)} rather than 563412`);

  // ⚠️ THE RAIL IS ONE STEP OF THE FILE'S OWN DEPTH. A sample at 0.99998 of
  // full scale is 256 steps off the rail in 24 bit and would have counted as
  // clipped under the old 16 bit constant.
  const near = W.content(W.readWave(wav({ bits: 24, pcm: int24([8388607, 8388352, 0]) })));
  ok('one step off full scale counts as clipped and 256 steps off does not, which is the 24 bit rail',
    near.clipped === 1 && near.peak === 8388607 / 8388608,
    `${near.clipped} clipped of 3, and the 16 bit rail would have said 2`);
}

console.log('\n-- stereo, and the mean that is chosen rather than assumed --');

// 🔴 THE MIXDOWN IS DOCUMENTED IN THE MODULE AND IT IS THE MEAN, so these
// grade the mean AND grade that it is not one of the three things it could
// have been. A sum, a left channel and a max all give a different answer to
// at least one of the files below, which is what makes them a test.
{
  const L = [8000, 0, 16384, -32768];
  const R = [0, 8000, 16384, -32768];
  const w = W.readWave(wav({ channels: 2, pcm: int16(interleave(L, R)) }));
  const m = W.toMono(w);
  ok('a 16 bit stereo file is 4 frames of 4 bytes and mixes down to one float a frame',
    w.ok && w.channels === 2 && w.blockAlign === 4 && w.blockAlignOk
    && w.frames === 4 && m.ok && m.samples.length === 4 && m.mixed === true,
    `${w.frames} frames, mixed ${m.mixed}`);
  ok('and every value is the MEAN of the two channels, which is the arithmetic the module names',
    m.samples[0] === 4000 / 32768 && m.samples[1] === 4000 / 32768
    && m.samples[2] === 16384 / 32768 && m.samples[3] === -1
    && m.mix === W.MIX,
    `${[...m.samples].map((v) => Math.round(v * 32768)).join(', ')}, mix "${m.mix}"`);
  // 🔴 THE THREE IT IS NOT, EACH DISPROVED BY A NAMED FRAME. Without these the
  // assert above is satisfied by any function that happens to agree on one row,
  // and the three candidates the module's own comment weighs are exactly the
  // three a reader would suspect.
  const sum0 = (L[0] + R[0]) / 32768;
  const left1 = L[1] / 32768;
  const max0 = Math.max(Math.abs(L[0]), Math.abs(R[0])) / 32768;
  ok('NEGATIVE CONTROL: it is not the sum, not the left channel and not the louder of the two',
    m.samples[0] !== sum0 && m.samples[1] !== left1 && m.samples[0] !== max0
    && sum0 === 8000 / 32768 && left1 === 0 && max0 === 8000 / 32768,
    `frame 0 is ${Math.round(m.samples[0] * 32768)} where a sum says ${Math.round(sum0 * 32768)} `
    + `and a max says ${Math.round(max0 * 32768)}, and frame 1 is `
    + `${Math.round(m.samples[1] * 32768)} where the left channel alone says 0`);

  // 🔴 PER CHANNEL PEAKS ARE A SECOND, INDEPENDENT READING AND THIS IS WHY.
  const c = W.content(w);
  ok('content reports the mixed peak AND each channel\'s own, because they are different numbers',
    c.peak === 1 && c.channelPeaks.length === 2
    && c.channelPeaks[0] === 1 && c.channelPeaks[1] === 1
    && c.channelPeak === 1 && c.channels === 2 && c.mixed === true,
    `mix ${c.peak}, channels ${c.channelPeaks.join(' and ')}`);

  // 🔴 THE HARD PANNED CASE, WHERE THE TWO READINGS DISAGREE BY 6 dB. This is
  // the shape the corpus has: the widest of 150 real stereo files reads 0.4664
  // of its own loudest channel after the mix.
  // ⚠️ FULL SCALE POSITIVE IS 32767/32768 AND NOT 1, WHICH IS WRITTEN OUT
  // RATHER THAN ROUNDED TO, because the first version of the swap sabotage
  // below asserted 1 and went red on a correct reading. The asymmetry is real:
  // -32768 reaches exactly -1 and +32767 never reaches +1.
  const FS = 32767 / 32768;
  const panned = W.readWave(wav({ channels: 2, pcm: int16(interleave([32767, 0], [0, 0])) }));
  const pc = W.content(panned);
  ok('a hard panned file reads half as loud mixed as its loudest channel, and BOTH numbers are reported',
    pc.peak === FS / 2 && pc.channelPeak === FS && pc.cancelled === false,
    `mixed ${pc.peak.toFixed(4)} against a channel peak of ${pc.channelPeak.toFixed(4)}`);

  // 🔴 SABOTAGE: THE TWO CHANNELS SWAPPED. The mean is symmetric so it must NOT
  // move, and the per channel peaks MUST. A reader taking the left channel
  // alone fails the first half; one that reads channel 0 twice fails the second.
  const swapped = W.readWave(wav({ channels: 2, pcm: int16(interleave(R, L)) }));
  const sm = W.toMono(swapped);
  const sc = W.content(swapped);
  const pannedSwap = W.content(W.readWave(wav({ channels: 2, pcm: int16(interleave([0, 0], [32767, 0])) })));
  ok('SABOTAGE: swapping the channels leaves the mean untouched and moves the per channel reading',
    sm.samples.every((v, i) => v === m.samples[i])
    && pannedSwap.channelPeaks[0] === 0 && pannedSwap.channelPeaks[1] === FS
    && pc.channelPeaks[0] === FS && pc.channelPeaks[1] === 0
    && pannedSwap.peak === pc.peak,
    `the mean is the same 4 values and the peaks went ${pc.channelPeaks.join('/')} to ${pannedSwap.channelPeaks.join('/')}`);

  // 🔴 SABOTAGE: ONE CHANNEL INVERTED, WHICH IS THE ONE CASE THE MEAN LIES
  // ABOUT. The mix is digital silence and the file is loud, and a bare zero
  // there would read as an empty sample.
  const anti = W.readWave(wav({ channels: 2, pcm: int16(interleave([20000, -9000], [-20000, 9000])) }));
  const ac = W.content(anti);
  ok('SABOTAGE: two channels in anti phase mix to silence, and it is reported as cancelled rather than empty',
    ac.peak === 0 && ac.silent === true && ac.cancelled === true
    && Math.abs(ac.channelPeak - 20000 / 32768) < 1e-9,
    `mix is silent while the channels peak at ${ac.channelPeak.toFixed(4)}`);
  ok('NEGATIVE CONTROL: a file that really is empty is silent and NOT cancelled, so the two are told apart',
    W.content(W.readWave(wav({ channels: 2, pcm: new Uint8Array(16) }))).silent === true
    && W.content(W.readWave(wav({ channels: 2, pcm: new Uint8Array(16) }))).cancelled === false
    && W.content(W.readWave(wav({ pcm: int16([0, 0, 0]) }))).cancelled === false,
    'silent and cancelled are two cells and only one of them is set here');

  // 24 bit stereo is the commonest refused shape on this disk: 98 of the 152.
  const both = W.readWave(wav({ bits: 24, channels: 2, pcm: int24(interleave([8388607, 0], [0, -8388608])) }));
  const bm = W.toMono(both);
  ok('24 bit stereo, which is 98 of the 152 files that used to open with no numbers at all',
    both.ok && both.blockAlign === 6 && both.blockAlignOk && both.frames === 2
    && bm.ok && Math.abs(bm.samples[0] - 8388607 / 8388608 / 2) < 1e-9
    && bm.samples[1] === -0.5,
    `${both.frames} frames of ${both.blockAlign} bytes, ${[...bm.samples].join(' and ')}`);
}

console.log('\n-- the depths and the shapes still refused, each one by name --');

// 🔴 A WIDENED CONSTANT IS NOT THE JOB. What is NOT in `DEPTHS` is a decision
// with a corpus behind it: there are zero 8 bit, zero 32 bit integer, zero IEEE
// float and zero WAVE_FORMAT_EXTENSIBLE files among the 965 real `.wav` files
// on this disk, counting one archive deeper. Each is refused with its name in
// the sentence, and none of them throws.
{
  const eight = W.readWave(wav({ bits: 8, pcm: new Uint8Array([0, 128, 255]) }));
  const m8 = W.toMono(eight);
  ok('an 8 bit file PARSES and then refuses to decode, which is the honest split',
    eight.ok && eight.bits === 8 && eight.frames === 3 && m8.ok === false && m8.why.includes('8 bit'),
    m8.why);
  const m32 = W.toMono(W.readWave(wav({ bits: 32, pcm: new Uint8Array(12) })));
  ok('and 32 bit integer the same way, with the depth named rather than a number printed',
    m32.ok === false && m32.why.includes('32 bit') && m32.why.includes('16 and 24'),
    m32.why);
  // 🔴 IEEE FLOAT IS REFUSED AT THE FORMAT GATE AND NOT AT THE DEPTH GATE, and
  // that ordering is the honest one: float is a different number line rather
  // than a wider integer, it is allowed to run past 1.0, and `peak`, `clipped`
  // and the rail all mean something else on it.
  const flt = W.readWave(wav({ format: 3, bits: 32, pcm: new Uint8Array(8) }));
  ok('32 bit IEEE float is refused by NAME at the format gate, which is a decision and not an oversight',
    flt.ok === false && flt.why.includes('IEEE float') && flt.why.includes('PCM')
    && flt.format === 3,
    flt.why);
  const ext = W.readWave(wav({ format: 0xfffe, bits: 24, pcm: new Uint8Array(6) }));
  ok('and WAVE_FORMAT_EXTENSIBLE too, which is how most DAWs would have written these 24 bit files',
    ext.ok === false && ext.why.includes('EXTENSIBLE'),
    ext.why);
  // ⚠️ AND THE REASON THAT REFUSAL COSTS NOTHING HERE IS A MEASUREMENT: every
  // one of the 100 real 24 bit files declares format tag 1, plain PCM.
  const six = W.readWave(wav({ channels: 6, pcm: int16(new Array(12).fill(1000)) }));
  ok('more than two channels is refused by name, because a plain average is a guess about a surround set',
    six.ok && six.channels === 6 && W.toMono(six).ok === false
    && W.toMono(six).why.includes('6 channels') && W.toMono(six).why.includes('LFE'),
    W.toMono(six).why);
  ok('DEPTHS is 16 and 24, MIX_CHANNELS_MAX is 2, and every refusal above quotes them',
    JSON.stringify(W.DEPTHS) === '[16,24]' && W.MIX_CHANNELS_MAX === 2
    && W.FULL_SCALE[16] === 32768 && W.FULL_SCALE[24] === 8388608,
    `${W.DEPTHS.join(' and ')} bit, up to ${W.MIX_CHANNELS_MAX} channels`);
  // 🔴 AND NOT ONE OF THEM THROWS, WHICH IS THE PROPERTY THE WHOLE MODULE
  // RESTS ON: a page opening a stranger's zip shows a sentence, never a stack.
  const shapes = [
    wav({ bits: 8, pcm: new Uint8Array(3) }),
    wav({ bits: 32, pcm: new Uint8Array(8) }),
    wav({ bits: 24, channels: 6, pcm: new Uint8Array(36) }),
    wav({ format: 3, bits: 32, pcm: new Uint8Array(8) }),
    wav({ format: 0xfffe, bits: 24, pcm: new Uint8Array(6) }),
    wav({ bits: 12, pcm: new Uint8Array(6) }),
    wav({ bits: 0, pcm: new Uint8Array(4) }),
  ];
  let threw = 0, refused = 0;
  for (const b of shapes) {
    try {
      const x = W.readWave(b);
      const r = x.ok === false ? x : W.toMono(x);
      if (r.ok === false && r.why.length > 20) refused++;
      // content and summarise take the same shapes and must not throw either
      if (x.ok) { W.content(x); W.summarise(x, 'x'); }
    } catch (e) { threw++; }
  }
  ok(`all ${shapes.length} undecodable shapes are refused in words through every entry point, and none throws`,
    refused === shapes.length && threw === 0,
    `${refused} refused, ${threw} threw`);
}

console.log('\n-- the block align that used to throw a RangeError out of three functions --');

// 🔴 FOUND WHILE ADDING THE TWO SHAPES ABOVE, AND IT WAS LIVE ON A PAGE THAT
// OPENS ANYBODY'S ZIP. `frames` comes from the DECLARED block align and the
// reader steps by the DERIVED one, so a file declaring a block align SMALLER
// than its own frame claimed more frames than there were bytes and `toMono`,
// `content` and `summarise` all died inside a `DataView`. MEASURED before the
// repair: 8 frames claimed over 8 bytes, 16 bytes asked for, three exported
// functions throwing `RangeError: Offset is outside the bounds of the DataView`.
{
  const w = W.readWave(wav({ pcm: int16([1, 2, 3, 4]), blockAlign: 1 }));
  let threw = 0;
  let m, c, r;
  try { m = W.toMono(w); c = W.content(w); r = W.summarise(w, 'x'); } catch (e) { threw++; }
  ok('a block align of 1 on a 16 bit mono file is clamped to the frames the data can supply, not thrown on',
    threw === 0 && w.ok && w.framesDeclared === 8 && w.frames === 4
    && w.framesClamped === true && m.ok && m.samples.length === 4
    && c.ok && r.ok && r.frames === 4,
    `${w.framesDeclared} frames declared, ${w.frames} readable, ${threw} throws`);
  ok('and a file whose block align is right says so, so the clamp cannot hide a real disagreement',
    W.readWave(wav({ pcm: int16([1, 2]) })).framesClamped === false
    && W.readWave(wav({ pcm: int16([1, 2, 3, 4]), blockAlign: 4 })).framesClamped === false
    && W.readWave(wav({ pcm: int16([1, 2, 3, 4]), blockAlign: 4 })).frames === 2,
    'a block align that is too LARGE reports fewer frames and is not a clamp');
  // ⚠️ THE SAME SHAPE ON A STEREO 24 BIT FILE, because the clamp has to be
  // computed from the real frame size rather than from a constant.
  const s = W.readWave(wav({ bits: 24, channels: 2, pcm: int24(new Array(8).fill(0)), blockAlign: 2 }));
  ok('and on a 24 bit stereo file the clamp counts six byte frames rather than two byte ones',
    s.ok && s.framesDeclared === 12 && s.frames === 4 && s.framesClamped === true
    && W.toMono(s).ok && W.toMono(s).samples.length === 4,
    `${s.framesDeclared} declared, ${s.frames} readable at ${s.channels * s.bits / 8} bytes a frame`);
}

// ═══════════════════════════════════════════ the other container ═════════
//
// 🔴 EVERYTHING FROM HERE TO THE REAL PACK RUNS WITH NO CORPUS AT ALL, and that
// is on purpose: this block sits ABOVE the `New Pack.circuitpack` early exit, so
// a clone with no `tmp/` still grades the stream reader, the checksum and the
// slot walker. The real corpus is at the bottom of the file behind its own
// existence check.

console.log('\n-- one line reading byte 0, which is the whole of the routing --');

{
  const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]);
  const stream0 = new Uint8Array([0xf0, 0x00, 0x20, 0x29, 0x00, 0x77, 0xf7]);
  const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
  ok('50 4b is a zip and f0 is a sysex stream, which is the whole test',
    W.containerOf(zip).kind === W.CONTAINER.zip
    && W.containerOf(stream0).kind === W.CONTAINER.sysex,
    `${W.containerOf(zip).kind} and ${W.containerOf(stream0).kind}`);
  // 🔴 THE THIRD ANSWER IS THE ONE THAT MATTERS ON THIS DISK. Two files in the
  // archive download are a Windows executable and a Nintendo DS ROM, and a
  // router with two branches would have to put them somewhere.
  ok('anything else is neither, and the refusal quotes the two bytes it found',
    W.containerOf(exe).kind === W.CONTAINER.unknown
    && W.containerOf(exe).why.includes('4d 5a')
    && W.containerOf(exe).head === '4d 5a',
    W.containerOf(exe).why);
  ok('and a file too short to have two bytes is unknown rather than a guess',
    W.containerOf(new Uint8Array([0xf0])).kind === W.CONTAINER.unknown
    && W.containerOf(new Uint8Array(0)).kind === W.CONTAINER.unknown,
    W.containerOf(new Uint8Array([0xf0])).why);
  // ⚠️ A PATCH MESSAGE STARTS `f0` TOO, so the byte 0 test says which READER to
  // reach for and never what is in the file. That is the layering and it is the
  // thing a one line test could get subtly wrong.
  const patch = new Uint8Array(350);
  patch.set([0xf0, 0x00, 0x20, 0x29, 0x01, 0x60, 0x00, 0x00], 0);
  patch[349] = 0xf7;
  ok('a loose patch message answers sysex as well, because byte 0 says the reader and not the content',
    W.containerOf(patch).kind === W.CONTAINER.sysex
    && W.sampleSetIn(patch).messages === 1 && W.sampleSetIn(patch).other === 1
    && W.sampleSetIn(patch).ok === false
    && W.sampleSetIn(patch).why.includes('not one stream start'),
    W.sampleSetIn(patch).why);
}

console.log('\n-- the checksum, against an oracle that is not this file --');

// 🔴 A CRC GRADED AGAINST ITSELF IS `timeline/csound.mjs` AGAIN: 22 asserts green
// for months with two real defects, because the check derived its answer from
// the same formula the code implements. `node:zlib` has a CRC32 nobody here
// wrote, so it is the oracle. The module cannot use it, because it runs in a
// browser too.
{
  const zlib = await import('node:zlib');
  const cases = [
    new Uint8Array(0),
    new Uint8Array([0]),
    Uint8Array.from('123456789', (c) => c.charCodeAt(0)),
    new Uint8Array(1024).fill(0xff),
  ];
  for (let i = 0; i < 300; i++) {
    cases.push(Uint8Array.from({ length: Math.floor(Math.random() * 4096) },
      () => Math.floor(Math.random() * 256)));
  }
  const wrong = cases.filter((b) => W.crc32(b) !== (zlib.crc32(Buffer.from(b)) >>> 0));
  ok(`crc32 agrees with node's own on all ${cases.length} buffers, empty and 4 KB of noise included`,
    wrong.length === 0, `${wrong.length} disagreed`);
  ok('and the check digit everybody publishes for "123456789" is 0xcbf43926',
    W.crc32(Uint8Array.from('123456789', (c) => c.charCodeAt(0))) === 0xcbf43926,
    `0x${W.crc32(Uint8Array.from('123456789', (c) => c.charCodeAt(0))).toString(16)}`);
}

// ---------------------------------------------------- the synthetic streams
//
// 🔴 THE TEST PACKS AND THE MODULE DOES NOT, WHICH IS THE SAME ARRANGEMENT THE
// WAV BUILDER ABOVE IS UNDER AND IT MATTERS MORE HERE. A complete bulk sample
// transfer is the file that would replace every sample slot on an instrument
// with no factory reset, and `research/dump-samples-2026-09-21.md` §8 says
// whether one writes flash is UNSETTLED. So the packer lives in a node test that
// writes nothing to disk, and the last block of this file asserts that no such
// function exists in the module.

/** MSB first 7 to 8, the inverse of `unpack7()`. Ten lines, and they stay here. */
function pack7(plain) {
  const out = [];
  for (let i = 0; i < plain.length; i += 7) {
    const group = plain.subarray(i, Math.min(i + 7, plain.length));
    let mask = 0;
    for (let k = 0; k < group.length; k++) if (group[k] & 0x80) mask |= 1 << k;
    out.push(mask);
    for (let k = 0; k < group.length; k++) out.push(group[k] & 0x7f);
  }
  return Uint8Array.from(out);
}

/** A value as `n` nibbles, most significant first, which is how a stream head
 *  and a stream end both carry their numbers. */
function nibbles(v, n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(Math.floor(v / 16 ** i) % 16);
  return out;
}

const F = (...parts) => Uint8Array.from([0xf0, 0x00, 0x20, 0x29, 0x00, ...parts.flat(), 0xf7]);

/**
 * One logical stream round a payload. Every field the reader checks is a
 * parameter, so a sabotage is a call rather than a byte edit.
 */
// ⚠️ EACH CARRIER IS PACKED ON ITS OWN AND THE FIRST BUILD OF THIS PACKED THE
// WHOLE PAYLOAD AND THEN CUT IT UP, WHICH LOST 59 BYTES. A real carrier holds
// 293 packed bytes restoring to 256, and 293 is 36 groups of eight plus a
// partial group of five. Cutting one packed run at a carrier boundary lands in
// the middle of a group, so the mask and its data go to different messages. The
// declared length caught it immediately, which is what that field is for.
function makeStream(plain, {
  declared = plain.length, region = W.REGION_SAMPLES, crc = null, end = true,
  per = 256,
} = {}) {
  const parts = [F(0x77, 0, 0, nibbles(region, 6), 0, 0, nibbles(declared, 6))];
  for (let i = 0; i < plain.length; i += per) {
    parts.push(F(0x79, [...pack7(plain.subarray(i, Math.min(i + per, plain.length)))]));
  }
  if (end) parts.push(F(0x7a, nibbles(crc === null ? W.crc32(plain) : crc, 8)));
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(n);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

/**
 * A sample memory image: 64 records of a ten byte header and signed 16 bit mono
 * PCM, then zero fill. `lengths` is in FRAMES so a zero is an empty slot.
 */
function image(lengths, { pad = 512, rate = 48000, bits = 16, mark = 1 } = {}) {
  const body = lengths.reduce((n, f) => n + 10 + f * 2, 0);
  const out = new Uint8Array(body + pad);
  const dv = new DataView(out.buffer);
  let p = 0;
  lengths.forEach((frames, i) => {
    out[p] = (i * 7) & 0xff;                       // ⚖️ byte 0, unexplained
    out[p + 1] = mark;
    out[p + 2] = bits;
    dv.setUint32(p + 3, rate, true);
    const len = frames * 2;
    out[p + 7] = len & 0xff; out[p + 8] = (len >> 8) & 0xff; out[p + 9] = (len >> 16) & 0xff;
    for (let k = 0; k < frames; k++) dv.setInt16(p + 10 + k * 2, ((i + 1) * 100 + k) % 3000 - 1500, true);
    p += 10 + len;
  });
  return out;
}

const LENGTHS = Array.from({ length: 64 }, (_, i) => (i % 8 === 7 ? 0 : 48 + i * 3));
const IMAGE = image(LENGTHS);
const GOOD = makeStream(IMAGE);

console.log('\n-- a stream, split on 0x77 and 0x7a and checked against its own numbers --');

{
  const s = W.streamsIn(GOOD);
  ok('one stream comes out of it, with the carriers counted and the payload restored exactly',
    s.streams.length === 1 && s.streams[0].ok === true
    && s.streams[0].plain.length === IMAGE.length
    && s.streams[0].plain.every((v, i) => v === IMAGE[i])
    && s.orphanCarriers === 0 && s.orphanEnds === 0,
    `${s.streams.length} stream, ${s.streams[0].carriers} carriers, ${s.streams[0].plain.length} bytes`);
  ok('the declared length, the region field and the checksum all come back as they were written',
    s.streams[0].declared === IMAGE.length && s.streams[0].lengthOk === true
    && s.streams[0].region === W.REGION_SAMPLES
    && s.streams[0].crcOk === true && s.streams[0].crc === W.crc32(IMAGE),
    `declared ${s.streams[0].declared}, region 0x${s.streams[0].region.toString(16)}, `
    + `crc 0x${s.streams[0].crc.toString(16)}`);

  // 🔴 TWO STREAMS BACK TO BACK IS THE SHAPE ELEVEN FILES IN THE DOWNLOAD HAVE,
  // and concatenating their carriers first is the measured defect this splitter
  // exists to avoid.
  const sessions = new Uint8Array(1024).fill(0x5a);
  const two = new Uint8Array(GOOD.length + makeStream(sessions, { region: W.REGION_SESSIONS }).length);
  two.set(makeStream(sessions, { region: W.REGION_SESSIONS }), 0);
  two.set(GOOD, makeStream(sessions, { region: W.REGION_SESSIONS }).length);
  const t = W.streamsIn(two);
  ok('two streams back to back stay two, each verifying against its own length and checksum',
    t.streams.length === 2 && t.streams.every((x) => x.ok)
    && t.streams[0].plain.length === 1024 && t.streams[1].plain.length === IMAGE.length
    && t.streams[0].region === W.REGION_SESSIONS && t.streams[1].region === W.REGION_SAMPLES,
    t.streams.map((x) => `${x.plainBytes || x.plain.length} bytes at ${x.at}`).join(', '));
  ok('and concatenating them instead would have made one run that is neither, which is the defect it avoids',
    t.streams[0].plain.length + t.streams[1].plain.length === 1024 + IMAGE.length
    && t.streams[0].crc !== t.streams[1].crc,
    `${1024} + ${IMAGE.length} would have been one ${1024 + IMAGE.length} byte blob`);
}

console.log('\n-- the 64 slot walk --');

{
  const w = W.slotsIn(IMAGE);
  ok('64 slots come out, 56 filled and 8 empty, with the tail counted and not refused',
    w.ok && w.read === 64 && w.filled === 56 && w.empty === 8
    && w.tail === 512 && w.tailNonZero === 0,
    `${w.read} slots, ${w.filled} filled, ${w.tail} byte tail with ${w.tailNonZero} non-zero`);
  ok('the gap from one header to the next minus the declared length is exactly 10 on all 63 gaps',
    w.slots.slice(1).every((s, i) => s.at - (w.slots[i].at + w.slots[i].pcmBytes) === W.SLOT_HEADER_BYTES),
    `${W.SLOT_HEADER_BYTES} bytes, 63 of 63`);
  ok('an empty slot advances exactly 10 bytes and lands on the next valid header',
    w.slots.filter((s) => s.empty).every((s) => w.slots[s.index + 1] === undefined
      || w.slots[s.index + 1].at === s.at + W.SLOT_HEADER_BYTES),
    `${w.empty} empty slots walked through`);

  const waves = w.slots.map((s) => W.slotWave(IMAGE, s));
  ok('every slot becomes a wave model that toMono, content and summarise read with no special case',
    waves.every((x) => W.toMono(x).ok) && waves.every((x) => W.content(x).ok)
    && waves.every((x, i) => W.toMono(x).samples.length === LENGTHS[i])
    && W.summariseAll(waves).parsed === 64 && W.summariseAll(waves).refused === 0,
    `${W.summariseAll(waves).frames} frames, ${W.summariseAll(waves).seconds.toFixed(3)} s`);
  ok('and the floats are the int16s that were written, so the walk landed on the audio and not beside it',
    waves.every((x, i) => {
      const m = W.toMono(x);
      return m.samples.every((v, k) => Math.round(v * 32768) === ((i + 1) * 100 + k) % 3000 - 1500);
    }),
    'every sample of every slot');
  // 🔴 THE FIELDS A RIFF FILE HAS AND A SLOT DOES NOT ARE null, NEVER INVENTED.
  // `riffSizeOk` is an agreement between two header fields and a slot has one of
  // each, so a `true` there would be a check that never looked at anything.
  ok('a slot wave says where it came from and leaves every RIFF-only agreement null',
    waves[0].from === W.SLOT_SOURCE && waves[0].riffSizeOk === null
    && waves[0].byteRateOk === null && waves[0].blockAlignOk === null
    && waves[0].chunkIds.length === 0 && waves[0].channelsFromHeader === false
    && W.readWave(wav({ pcm: int16([1]) })).from === undefined,
    `from "${waves[0].from}", chunks "${W.summarise(waves[0]).chunks}"`);
  ok('an empty slot is 0 frames and 0.000 s rather than a refusal, the same as an empty data chunk',
    waves[7].frames === 0 && waves[7].duration === 0 && W.summarise(waves[7]).seconds === 0
    && W.content(waves[7]).silent === true && W.toMono(waves[7]).samples.length === 0,
    'an empty slot is a finding a table shows');
}

console.log('\n-- the negative controls: what the walker finds in things that are not a sample table --');

// 🔴 THIS IS THE HALF THAT STOPS A DECODER FINDING STRUCTURE THAT IS NOT THERE.
// A walker that reported slots in noise would produce 64 rows of plausible audio
// out of anything, and the CRC above would say nothing about it because the CRC
// grades the TRANSPORT.
{
  const controls = [
    ['random bytes', Uint8Array.from({ length: 53248 }, () => Math.floor(Math.random() * 256))],
    ['nothing but zeros', new Uint8Array(53248)],
    ['nothing but 0xFF, which is erased flash', new Uint8Array(53248).fill(0xff)],
    ['one byte', new Uint8Array(1)],
  ];
  const got = controls.map(([what, b]) => ({ what, r: W.slotsIn(b) }));
  ok('0 slots in random bytes, in zeros, in erased flash and in one byte, every refusal in words',
    got.every((x) => x.r.ok === false && x.r.read === 0 && x.r.why.length > 20),
    got.map((x) => `${x.what}: ${x.r.read}`).join(', '));
  ok('and the reason names the slot, the offset and the byte that was there instead',
    got[1].r.why.includes('slot 0') && got[1].r.why.includes('0x00')
    && got[2].r.why.includes('0xff'),
    `zeros: "${got[1].r.why}"`);
  // ⚠️ THE CONTROL ON THE CONTROLS. A walker that refused everything would pass
  // every line above and be worthless, which is the `fake-err.mjs` lesson: a
  // check that reports a boundary whatever it is shown has not found one.
  ok('NEGATIVE CONTROL ON THE CONTROLS: the real image still walks to 64, so the refusals are the difference',
    W.slotsIn(IMAGE).read === 64);
}

console.log('\n-- the sabotages, each one named by the assert it takes red --');

// Eight structural claims, all true of a good stream. Each sabotage runs the
// battery and the reds are the measurement.
function streamBattery(bytes) {
  const out = [];
  const add = (name, fn) => {
    try { out.push({ name, ok: !!fn() }); } catch (e) { out.push({ name, ok: false, why: e.message }); }
  };
  add('byte 0 says sysex stream', () => W.containerOf(bytes).kind === W.CONTAINER.sysex);
  add('exactly one stream comes out', () => W.streamsIn(bytes).streams.length === 1);
  add('the stream verifies', () => W.streamsIn(bytes).streams[0].ok === true);
  add('the carriers restore to the declared length', () => W.streamsIn(bytes).streams[0].lengthOk === true);
  add('the checksum in the stream end matches the payload', () => W.streamsIn(bytes).streams[0].crcOk === true);
  add('the payload walks as a 64 slot sample table', () => W.slotsIn(W.streamsIn(bytes).streams[0].plain).read === 64);
  add('sampleSetIn hands back 64 rows', () => W.sampleSetIn(bytes).samples.length === 64);
  add('and every row decodes to floats in range', () => W.sampleSetIn(bytes).samples
    .every((x) => { const m = W.toMono(x.wave); return m.ok && m.samples.every((v) => v >= -1 && v <= 1); }));
  return out;
}
const streamReds = (b) => streamBattery(b).filter((c) => !c.ok);
const SN = streamBattery(GOOD).length;

ok(`a good stream passes all ${SN} of the battery`, streamReds(GOOD).length === 0,
  streamReds(GOOD).map((c) => c.name).join('; ') || 'nothing red');

// 🔴 SABOTAGE A: ONE PAYLOAD BYTE, WHICH IS THE ONE THE CHECKSUM EXISTS FOR.
// Everything about the file stays right: the message count, the carrier count,
// the declared length, even the slot table. The audio is simply wrong by one
// sample and only the CRC can say so.
{
  const bad = GOOD.slice();
  const at = bad.indexOf(0x79, 6) + 40;                     // deep inside a carrier
  bad[at] = bad[at] ^ 0x01;
  const r = streamReds(bad);
  ok(`flipping one bit of one payload byte takes ${r.length} of ${SN} red, and it is the checksum`,
    r.length === 3
    && r.some((c) => c.name.includes('checksum'))
    && r.some((c) => c.name.includes('64 rows'))
    && !r.some((c) => c.name.includes('declared length')),
    r.map((c) => c.name).join('; '));
  const s = W.streamsIn(bad).streams[0];
  ok('and the refusal quotes both checksums, so a reader is told which byte count disagreed',
    s.ok === false && s.lengthOk === true
    && s.why.includes(s.crc.toString(16)) && s.why.includes(s.crcDeclared.toString(16)),
    s.why);
  // ⚠️ AND THE PAGE-FACING FUNCTION REFUSES RATHER THAN RETURNING THE AUDIO IT
  // HAS. The slot table still walks perfectly: a wrong byte in 21 kB of PCM
  // changes nothing structural, which is exactly why this is the dangerous case.
  const set = W.sampleSetIn(bad);
  ok('NEGATIVE CONTROL: the slot table still walks, and sampleSetIn refuses the file anyway',
    W.slotsIn(W.streamsIn(bad).streams[0].plain).read === 64
    && set.ok === false && set.samples.length === 0
    && set.streams[0].holds === 'nothing, because the stream did not verify',
    `"${set.why}"`);
}

// 🔴 SABOTAGE B: THE CHECKSUM ITSELF, which is the other side of the same claim.
{
  const bad = makeStream(IMAGE, { crc: (W.crc32(IMAGE) ^ 0x10000) >>> 0 });
  const r = streamReds(bad);
  ok(`a checksum one nibble out takes the same ${r.length} of ${SN} red, led by the checksum assert`,
    r.length === 3 && r.some((c) => c.name.includes('checksum'))
    && W.streamsIn(bad).streams[0].lengthOk === true,
    r.map((c) => c.name).join('; '));
}

// 🔴 SABOTAGE C: THE DECLARED LENGTH, AND THE CHECKSUM ASSERT SURVIVES IT,
// WHICH IS NOT WHAT THIS BLOCK EXPECTED. It was written asserting 4 reds on the
// reasoning that a stream failing anything fails everything, and the run said 3:
// the payload is untouched, so `crcOk` is genuinely true and the only claim that
// broke is the one about the length. Two independent fields, measured
// independently, is the shape the whole module wants and it is reported rather
// than tuned to the guess.
{
  const bad = makeStream(IMAGE, { declared: IMAGE.length + 16 });
  const r = streamReds(bad);
  const s = W.streamsIn(bad).streams[0];
  ok(`a length field 16 bytes out takes ${r.length} of ${SN} red, led by the declared length assert`,
    r.length === 3 && r.some((c) => c.name.includes('declared length'))
    && !r.some((c) => c.name.includes('checksum')),
    r.map((c) => c.name).join('; '));
  ok('and the reason names both numbers rather than saying the file is bad',
    s.why.includes((IMAGE.length + 16).toLocaleString()) && s.why.includes(IMAGE.length.toLocaleString()),
    s.why);
  ok('NEGATIVE CONTROL: the payload itself is untouched, so its checksum still matches the bytes',
    s.crc === W.crc32(IMAGE) && s.crcDeclared === W.crc32(IMAGE) && s.crcOk === true
    && s.ok === false && s.why.includes('declares'),
    `crc 0x${s.crc.toString(16)} is right and the stream is refused on its length`);
}

// 🔴 SABOTAGE D: THE STREAM NEVER ENDS. There is no checksum to check at all,
// and a reader that only compared lengths would call this file perfect.
{
  const bad = makeStream(IMAGE, { end: false });
  const r = streamReds(bad);
  const s = W.streamsIn(bad).streams[0];
  ok(`cutting the 0x7a message takes ${r.length} of ${SN} red, and the length assert survives correctly`,
    r.length === 3 && r.some((c) => c.name.includes('checksum'))
    && !r.some((c) => c.name.includes('declared length'))
    && s.lengthOk === true && s.crcDeclared === null,
    r.map((c) => c.name).join('; '));
  ok('and it is refused as a stream that never ends rather than as a bad checksum',
    s.ok === false && /never ends/.test(s.why), s.why);

  // ⚠️ AND A TRUNCATION THAT TAKES CARRIERS WITH IT FAILS ON THE LENGTH FIRST.
  const cut = bad.slice(0, Math.floor(bad.length * 0.6));
  const cs = W.streamsIn(cut).streams[0];
  ok('a stream cut in half mid carrier is refused, with the bytes it has against the bytes it promised',
    cs.ok === false && cs.plain.length < IMAGE.length && cs.declared === IMAGE.length,
    cs.why);
}

// 🔴 SABOTAGE E: A SLOT HEADER, which the transport cannot see at all. The
// checksum is recomputed over the damaged image, so the stream verifies
// perfectly and the walk is the only thing left to notice.
{
  const broken = IMAGE.slice();
  broken[10 + LENGTHS[0] * 2 + 1] = 0x02;                   // slot 1's mark byte
  const bad = makeStream(broken);
  const r = streamReds(bad);
  const s = W.streamsIn(bad).streams[0];
  ok(`a slot marker takes ${r.length} of ${SN} red while the stream still verifies, which is the split`,
    r.length === 2 && s.ok === true && s.crcOk === true
    && r.some((c) => c.name.includes('64 slot sample table'))
    && !r.some((c) => c.name.includes('checksum')),
    r.map((c) => c.name).join('; '));
  ok('and the refusal names the slot, the offset and the byte it found there',
    W.slotsIn(broken).why.includes('slot 1') && W.slotsIn(broken).why.includes('0x02'),
    W.slotsIn(broken).why);

  const rate = IMAGE.slice();
  new DataView(rate.buffer).setUint32(10 + LENGTHS[0] * 2 + 3, 44100, true);
  ok('a rate of 44,100 in a slot header is refused by name, because a Circuit slot is 48 kHz',
    W.slotsIn(rate).ok === false && W.slotsIn(rate).why.includes('44100')
    && W.slotsIn(rate).why.includes('48000'),
    W.slotsIn(rate).why);

  const odd = IMAGE.slice();
  odd[7] = (odd[7] + 1) & 0xff;                             // slot 0's length, now odd
  ok('a PCM length that is not a whole number of 16 bit frames is refused rather than rounded',
    W.slotsIn(odd).ok === false && /whole number of frames/.test(W.slotsIn(odd).why),
    W.slotsIn(odd).why);

  const over = IMAGE.slice();
  over[9] = 0x40;                                           // slot 0 claims ~4 MB
  ok('a slot claiming more audio than the image holds is refused with both numbers',
    W.slotsIn(over).ok === false && /are left in the image/.test(W.slotsIn(over).why),
    W.slotsIn(over).why);
}

// ═══════════════════════ every wav in every zip, which is what the job is ═══
//
// 🔴 THIS BLOCK SITS ABOVE THE `New Pack.circuitpack` EARLY EXIT ON PURPOSE,
// the same way the stream and slot blocks do, because the pack left this
// repository on 2026-09-24 and everything below that exit is unreachable on a
// checkout that follows CLAUDE.md. A measurement behind a file nobody has is a
// measurement nobody takes.
//
// 🔴 AND THIS IS THE CORPUS THE MODULE'S HEADER SAID DID NOT EXIST. It has said
// since 2026-09-21 that all 64 samples in the pack are `fmt ` then `data` and
// nothing else, so no real file here could grade the chunk walker and only the
// synthetic fixtures above could. That stopped being true the day `/pack/`
// started opening anybody's zip: these 901 files carry **18 distinct chunk
// layouts** and **265 of them put the audio somewhere other than offset 44**.

console.log('\n-- 901 real wavs out of six zips, which is what "any wavs in zip" means --');

if (!fs.existsSync(PACKS)) {
  note('tmp/packs is not on this machine, so the 901 file corpus is unmeasured here');
} else {
  /**
   * ⚠️ READ IN MEMORY, NOTHING EXTRACTED, NOTHING EXECUTED, and the resource
   * forks counted rather than quietly skipped. A `.zip` made on a Mac carries a
   * `__MACOSX/._name.wav` beside every real file: 88 of the 989 named `.wav`
   * entries here are those, they are 4 KB of finder metadata rather than audio,
   * and counting them as refused samples would put an 88 file hole in every
   * figure below.
   */
  const FORK = (name) => /(^|\/)__MACOSX\//.test(name) || /^\._/.test(name.split('/').pop());

  const files = [];
  let named = 0, forks = 0;
  for (const z of fs.readdirSync(PACKS).filter((f) => f.endsWith('.zip'))) {
    let list;
    try { list = readZip(fs.readFileSync(path.join(PACKS, z))); } catch { continue; }
    const wav = list.filter((e) => /\.wav$/i.test(e.name));
    if (!wav.length) continue;
    named += wav.length;
    for (const e of wav) {
      if (FORK(e.name)) { forks++; continue; }
      files.push({ zip: z, name: e.name, bytes: await e.read() });
    }
  }

  ok('989 named .wav entries across six zips, 88 of them Mac resource forks, leaving 901 real files',
    named === 989 && forks === 88 && files.length === 901,
    `${named} named, ${forks} forks, ${files.length} real`);

  // 🔴 THE FOUR QUESTIONS THE REQUEST IS ABOUT, ASKED SEPARATELY BECAUSE A
  // FILE THAT READS IS NOT A FILE THAT PLAYS. Before 2026-09-28 all 901 read
  // and only 749 of them did anything else, so a page showed a full header row
  // and four empty measured cells on 152 of them.
  let read = 0, play = 0, measure = 0, draw = 0, threw = 0;
  const shapes = new Map();
  const layouts = new Map();
  let notAt44 = 0, deepest = 0, stereo = 0, deep24 = 0, mixedRows = 0;
  const waves = [];
  for (const f of files) {
    try {
      const w = W.readWave(f.bytes);
      if (!w.ok) continue;
      read++;
      waves.push(w);
      const key = `${w.rate} ${w.bits} ${w.channels}`;
      shapes.set(key, (shapes.get(key) || 0) + 1);
      const lay = w.chunkIds.join(' ');
      layouts.set(lay, (layouts.get(lay) || 0) + 1);
      if (w.dataAt !== 44) { notAt44++; deepest = Math.max(deepest, w.dataAt); }
      if (w.channels === 2) stereo++;
      if (w.bits === 24) deep24++;
      const m = W.toMono(w);
      if (m.ok && m.samples.length === w.frames) play++;
      if (m.mixed) mixedRows++;
      const c = W.content(w);
      if (c.ok) measure++;
      const row = W.summarise(w, f.name.split('/').pop());
      if (row.ok && row.peak !== null && row.sound !== null && row.chanPeak !== null) draw++;
    } catch (e) { threw++; }
  }

  ok('all 901 read, measure, draw and play, against 749 that played before 24 bit and stereo landed',
    read === 901 && play === 901 && measure === 901 && draw === 901 && threw === 0,
    `${read} read, ${measure} measured, ${draw} drawable, ${play} play, ${threw} threw`);

  // 🔴 THE SHAPE CENSUS, WHICH IS WHAT SAYS THE 152 WERE A REAL POPULATION AND
  // NOT AN ODDITY. Two whole zips are nothing but 24 bit stereo.
  ok('the shapes are 534 + 215 sixteen bit mono, 98 twenty four bit stereo, 52 sixteen bit stereo and 2 twenty four bit mono',
    shapes.get('44100 16 1') === 534 && shapes.get('48000 16 1') === 215
    && shapes.get('44100 24 2') === 98 && shapes.get('44100 16 2') === 52
    && shapes.get('44100 24 1') === 2 && shapes.size === 5,
    [...shapes].map(([k, v]) => `${v} at ${k.split(' ').join('/')}`).join(', '));
  ok('so 100 of them are 24 bit and 150 are stereo, and 152 files needed one branch or the other',
    deep24 === 100 && stereo === 150 && mixedRows === 150
    && waves.filter((w) => w.bits === 24 || w.channels > 1).length === 152,
    `${deep24} at 24 bit, ${stereo} stereo, ${mixedRows} mixed down`);

  // 🔴 AND THE CHUNK WALKER FINALLY HAS A REAL CORPUS, WHICH IS A CLAIM THIS
  // MODULE'S HEADER HAS BEEN UNABLE TO MAKE SINCE IT WAS WRITTEN. `bext` is a
  // broadcast metadata chunk 602 bytes long, and a reader that skipped 44 bytes
  // would have played it as audio on 247 files.
  ok('18 distinct chunk layouts, and 265 of the 901 put their audio somewhere other than offset 44',
    layouts.size === 18 && notAt44 === 265 && deepest === 736
    && layouts.get('fmt  data') === 84
    && layouts.get('fmt  bext junk data') === 247
    && layouts.get('fmt  data LIST CDif CDif') === 515,
    `${layouts.size} layouts, deepest audio at byte ${deepest}, and only ${layouts.get('fmt  data')} are plain fmt-then-data`);
  // ⚠️ THREE FILES PUT `bext` BEFORE `fmt `, so a reader that assumed the format
  // chunk comes first would miss it on those. The walker does not assume.
  ok('and 11 of them put bext BEFORE fmt, which a reader expecting fmt first would read as no fmt at all',
    waves.filter((w) => w.chunkIds[0] !== 'fmt ').length === 11
    && waves.filter((w) => w.chunkIds[0] !== 'fmt ').every((w) => w.chunkIds[0] === 'bext')
    && waves.filter((w) => w.chunkIds[0] !== 'fmt ').every((w) => w.ok && w.frames > 0),
    `${waves.filter((w) => w.chunkIds[0] !== 'fmt ').length} files open on bext, all of them parsed`);

  // 🔴 THE TOTALS A PAGE SHOWS, AND `mixed` IS THE ONE THAT WAS NOT THERE.
  const all = W.summariseAll(waves);
  ok('summariseAll counts the whole corpus, 0 refused, and says how many had to be mixed down',
    all.count === 901 && all.parsed === 901 && all.refused === 0 && all.mixed === 150
    && all.depths.slice().sort((a, b) => a - b).join() === '16,24'
    && all.channels.slice().sort((a, b) => a - b).join() === '1,2',
    `${all.parsed} parsed, ${all.mixed} mixed, ${(all.seconds / 60).toFixed(1)} minutes of audio`);

  // 🔴 THE MIXDOWN AGAINST THE REAL STEREO FILES, WHICH IS THE NUMBER THE
  // MODULE'S COMMENT QUOTES. If the mean were a sum this ratio would run above
  // 1; if it were the left channel it would sit at 0 on a hard panned file.
  const ratios = [];
  let cancelled = 0, clamped = 0;
  for (const w of waves) {
    if (w.framesClamped) clamped++;
    if (w.channels !== 2) continue;
    const c = W.content(w);
    if (c.cancelled) cancelled++;
    if (c.channelPeak > 0) ratios.push(c.peak / c.channelPeak);
  }
  ratios.sort((a, b) => a - b);
  // ⚠️ THE MEDIAN IS 0.99996 AND THIS ASSERT SAID 1 UNTIL IT WENT RED. The
  // survey that produced the figure printed four decimal places and `1.0000`
  // was a ROUNDING rather than a reading, so the number went into the module's
  // comment wrong before this line caught it. It is asserted to five places
  // here for exactly that reason.
  ok('the mixed peak runs 0.46642 to exactly 1 of the loudest channel over the 150 stereo files, median 0.99996',
    ratios.length === 150
    && ratios[0].toFixed(5) === '0.46642'
    && ratios[ratios.length - 1] === 1
    && ratios[Math.floor(ratios.length / 2)].toFixed(5) === '0.99996'
    && ratios.filter((r) => r === 1).length === 39
    && ratios.every((r) => r <= 1)
    && ratios.filter((r) => r < 0.9).length === 15,
    `worst ${ratios[0].toFixed(5)}, 39 of 150 land on exactly 1, 15 below 0.9, `
    + 'and not one above 1 because a mean of two numbers cannot exceed the larger');
  ok('and not one of the 901 cancels or needs its frame count clamped, so both guards are guards rather than reports',
    cancelled === 0 && clamped === 0,
    'the anti phase and block align fixtures above are the only subjects either has');

  // ── the oracle, which is not this file and not this repository ──────────
  //
  // 🔴 A DEPTH BRANCH GRADED AGAINST ITSELF IS `timeline/csound.mjs` AGAIN:
  // 22 asserts green for months with two real defects, because the check
  // derived its answer from the formula the code implements. ffmpeg decodes
  // these files with an implementation nobody here wrote, so it is the oracle.
  // ⚠️ IT SKIPS CLEANLY WHERE FFMPEG IS NOT INSTALLED, the way
  // `timeline/lab/csound-oracle.mjs` does, because a check nobody can run is a
  // check nobody runs.
  // ⚠️ AND THE BYTES GO DOWN A PIPE, so this file still writes nothing to disk.
  {
    const cp = await import('node:child_process');
    let have = true;
    try { cp.execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { have = false; }
    if (!have) note('ffmpeg is not on PATH, so the 24 bit and stereo arithmetic was not graded against a second decoder');
    else {
      // One file of each of the five shapes, taken from the corpus rather than
      // chosen, so the oracle covers what the census found.
      const bySh = new Map();
      for (let i = 0; i < waves.length; i++) {
        const k = `${waves[i].rate} ${waves[i].bits} ${waves[i].channels}`;
        if (!bySh.has(k)) bySh.set(k, i);
      }
      let worstSample = 0, worstPeak = 0, framesOff = 0, graded = 0;
      for (const [, i] of bySh) {
        const w = waves[i];
        const raw = cp.execFileSync('ffmpeg',
          ['-v', 'error', '-i', 'pipe:0', '-f', 'f32le', '-acodec', 'pcm_f32le', '-'],
          { input: Buffer.from(files[i].bytes), maxBuffer: 1 << 28 });
        const fl = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
        const ch = w.channels;
        const frames = Math.floor(fl.length / ch);
        if (frames !== w.frames) framesOff++;
        const mine = W.toMono(w).samples;
        const peaks = W.channelPeaks(w).peaks;
        const ref = new Array(ch).fill(0);
        for (let k = 0; k < Math.min(frames, w.frames); k++) {
          let sum = 0;
          for (let c = 0; c < ch; c++) {
            const v = fl[k * ch + c];
            sum += v;
            if (Math.abs(v) > ref[c]) ref[c] = Math.abs(v);
          }
          worstSample = Math.max(worstSample, Math.abs(mine[k] - sum / ch));
        }
        for (let c = 0; c < ch; c++) worstPeak = Math.max(worstPeak, Math.abs(peaks[c] - ref[c]));
        graded++;
      }
      ok(`ffmpeg decodes one file of each of the ${graded} shapes to the same floats, sample for sample`,
        graded === 5 && framesOff === 0 && worstSample === 0 && worstPeak === 0,
        `worst sample difference ${worstSample}, worst channel peak difference ${worstPeak}, `
        + `${framesOff} frame counts disagreed`);
    }
  }

  // 🔴 THE SABOTAGE ON REAL BYTES, WHICH IS THE ONE THAT MATTERS MOST. Every
  // fixture above is built by this file; this one takes a 24 bit stereo file
  // out of somebody's zip and tells it that it is 16 bit mono. Nothing about
  // the file is unreadable afterwards: it parses, it decodes, every float is
  // in range, and it is completely different audio.
  {
    const i = waves.findIndex((w) => w.bits === 24 && w.channels === 2);
    const good = waves[i];
    const bad = files[i].bytes.slice();
    const dv = new DataView(bad.buffer, bad.byteOffset);
    dv.setUint16(good.fmtAt + 14, 16, true);      // bits 24 -> 16
    dv.setUint16(good.fmtAt + 2, 1, true);        // channels 2 -> 1
    dv.setUint16(good.fmtAt + 12, 2, true);       // block align 6 -> 2
    const w2 = W.readWave(bad);
    const a = W.toMono(good).samples;
    const b = W.toMono(w2).samples;
    let same = 0;
    for (let k = 0; k < Math.min(200, b.length); k++) if (a[k] === b[k]) same++;
    ok('SABOTAGE on real bytes: a 24 bit stereo file relabelled 16 bit mono still parses and decodes DIFFERENT audio',
      w2.ok && w2.bits === 16 && w2.frames === good.frames * 3
      && W.toMono(w2).ok && b.every((v) => v >= -1 && v <= 1)
      && same < 20,
      `${same} of the first 200 samples agree, and the depth is read from the header rather than guessed`);
    ok('NEGATIVE CONTROL: the untouched file still reads 24 bit stereo, so the relabelling is the difference',
      good.bits === 24 && good.channels === 2 && W.readWave(files[i].bytes).bits === 24,
      `${files[i].name.split('/').pop()}`);
  }
}

// ------------------------------------------------------------ the real pack

if (!fs.existsSync(PACK)) {
  console.log('\n  New Pack.circuitpack is not here, so the corpus is unmeasured.');


console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
  process.exit(fail ? 1 : 0);
}

console.log('\n-- all 64 samples in New Pack.circuitpack --');

const list = readZip(fs.readFileSync(PACK));
const meta = JSON.parse(new TextDecoder().decode(await entry(list, 'index.json').read()));
const RAW = [];
for (let i = 0; i < W.SAMPLE_SLOTS; i++) RAW.push(await entry(list, `samples/sample_${i}.wav`).read());
const WAVES = RAW.map(W.readWave);
const CONTENT = WAVES.map(W.content);
const TOTAL = W.summariseAll(WAVES);

ok('64 of them in the archive, and 64 parse with nothing refused',
  list.filter((e) => e.name.endsWith('.wav')).length === 64
  && TOTAL.count === 64 && TOTAL.parsed === 64 && TOTAL.refused === 0,
  `${TOTAL.parsed} parsed`);
ok('every one is 48 kHz, 16 bit, mono PCM, with a 16 byte fmt chunk',
  JSON.stringify(TOTAL.rates) === '[48000]' && JSON.stringify(TOTAL.depths) === '[16]'
  && JSON.stringify(TOTAL.channels) === '[1]'
  && WAVES.every((w) => w.format === W.FORMAT_PCM && w.fmtSize === 16),
  `${TOTAL.rates} Hz, ${TOTAL.depths} bit, ${TOTAL.channels} channel`);
ok('and the header is internally consistent in all 64: RIFF size, byte rate, block align, whole frames',
  WAVES.every((w) => w.riffSizeOk && w.byteRateOk && w.blockAlignOk
    && w.partialFrameBytes === 0 && !w.truncated));
// 🔴 THE MEASUREMENT THAT JUSTIFIES THE WALKER AND ALSO SHOWS WHY IT IS NEVER
// EXERCISED HERE. Two chunks, in that order, in 64 of 64.
ok('all 64 carry exactly two chunks, fmt then data, so the audio is at 44 in every one',
  uniq(WAVES.map((w) => w.chunkIds.join(' '))).join() === 'fmt  data'
  && uniq(WAVES.map((w) => w.dataAt)).join() === '44',
  `${uniq(WAVES.map((w) => w.chunkIds.join(' '))).length} layout, data at ${uniq(WAVES.map((w) => w.dataAt))}`);

console.log('\n-- the figures, against plans/plan-circuit-samples.md §2 --');

// 🔴 EVERY LINE IN THIS BLOCK WAS PUBLISHED BEFORE THIS MODULE EXISTED, WHICH IS
// WHAT MAKES REPRODUCING ONE WORTH ANYTHING. The plan read the headers with a
// different tool on a different day and printed five numbers. All five hold.
ok('shortest 0.12 s, which is 5,999 frames',
  TOTAL.shortest.toFixed(2) === '0.12' && Math.min(...WAVES.map((w) => w.frames)) === 5999,
  `${TOTAL.shortest.toFixed(6)} s`);
ok('longest 2.00 s, which is 95,947 frames and is 53 frames short of a round two seconds',
  TOTAL.longest.toFixed(2) === '2.00' && Math.max(...WAVES.map((w) => w.frames)) === 95947,
  `${TOTAL.longest.toFixed(6)} s`);
ok('median 0.75 s, the mean of a 36,000 frame sample and a 36,188 frame one',
  TOTAL.median.toFixed(2) === '0.75'
  && WAVES.map((w) => w.frames).sort((a, b) => a - b).slice(31, 33).join() === '36000,36188',
  `${TOTAL.median.toFixed(6)} s`);
ok('53.4 s in total, 2,561,855 frames across the 64',
  TOTAL.seconds.toFixed(1) === '53.4' && TOTAL.frames === 2561855,
  `${TOTAL.seconds.toFixed(4)} s`);
ok('5.13 MB on disk, of which 5,123,710 bytes are audio and 2,816 are container',
  (TOTAL.bytes / 1e6).toFixed(2) === '5.13' && TOTAL.bytes === 5126526
  && WAVES.reduce((n, w) => n + w.dataBytes, 0) === 5123710
  && TOTAL.bytes - WAVES.reduce((n, w) => n + w.dataBytes, 0) === 64 * 44,
  `${TOTAL.bytes} bytes, 64 headers of 44`);
// ⚖️ THE PLAN'S OPEN QUESTION, RESTATED WITH THE NUMBER THIS MODULE MEASURES AND
// NOT SETTLED. Whether the Circuit's pack budget is seconds or samples decides
// whether 53.4 s at 48 kHz is nearly full or two thirds full, and the experiment
// that would answer it writes to the instrument.
ok('MEASURED: 2,561,855 samples against the 2,646,000 that 60 s at 44.1 kHz would be, 96.8 per cent',
  (TOTAL.frames / (60 * 44100) * 100).toFixed(1) === '96.8',
  'whether the budget is seconds or samples is UNSETTLED and needs the device');

console.log('\n-- what is actually in the audio --');

ok('not one of the 64 is silent, and not one sample in 2.56 million is clipped',
  CONTENT.every((c) => !c.silent) && CONTENT.reduce((n, c) => n + c.clipped, 0) === 0,
  `${CONTENT.filter((c) => c.silent).length} silent`);
ok('peak runs 0.586 to 0.997 of full scale, so every one is normalised and none touches the rail',
  Math.min(...CONTENT.map((c) => c.peak)).toFixed(3) === '0.586'
  && Math.max(...CONTENT.map((c) => c.peak)).toFixed(3) === '0.997',
  `loudest is sample ${CONTENT.findIndex((c) => c.peak === Math.max(...CONTENT.map((x) => x.peak)))}`);
ok('RMS runs 0.017 to 0.394, which is the column that separates a hat from a kick',
  Math.min(...CONTENT.map((c) => c.rms)).toFixed(3) === '0.017'
  && Math.max(...CONTENT.map((c) => c.rms)).toFixed(3) === '0.394');
// 🔴 THE NUMBER A PAGE IS FOR: HOW MUCH OF A SAMPLE IS SOUND. 4 per cent of this
// pack is zeros at one end or the other, and it is almost all at the END.
ok('27 of 64 start with silence and 57 end with it, at most 105 frames in and 9,118 out',
  CONTENT.filter((c) => c.leadingZeros > 0).length === 27
  && CONTENT.filter((c) => c.trailingZeros > 0).length === 57
  && Math.max(...CONTENT.map((c) => c.leadingZeros)) === 105
  && Math.max(...CONTENT.map((c) => c.trailingZeros)) === 9118,
  `worst tail is sample ${CONTENT.findIndex((c) => c.trailingZeros === 9118)}, 0.19 s of nothing`);
ok('so 2,456,256 frames of the 2,561,855 are sound, 95.9 per cent',
  CONTENT.reduce((n, c) => n + c.sound, 0) === 2456256
  && (CONTENT.reduce((n, c) => n + c.sound, 0) / TOTAL.frames * 100).toFixed(1) === '95.9');

console.log('\n-- the floats, which are what a page actually plays --');

{
  const monos = WAVES.map(W.toMono);
  ok('all 64 decode, one float per frame, every value inside -1 to 1',
    monos.every((m) => m.ok) && monos.every((m, i) => m.samples.length === WAVES[i].frames)
    && monos.every((m) => m.samples.every((v) => v >= -1 && v <= 1)),
    `${monos.reduce((n, m) => n + m.samples.length, 0)} floats`);
  // 🔴 THE SCALING, GRADED AGAINST THE BYTES RATHER THAN AGAINST ITSELF. If the
  // divisor were 32767 this would go red on every non-zero sample.
  let wrong = 0;
  for (let i = 0; i < WAVES.length; i++) {
    const dv = new DataView(WAVES[i].data.buffer, WAVES[i].data.byteOffset, WAVES[i].data.byteLength);
    const s = monos[i].samples;
    for (let k = 0; k < s.length; k++) if (Math.round(s[k] * 32768) !== dv.getInt16(k * 2, true)) wrong++;
  }
  ok('and all 2,561,855 come back to the exact int16 they were, so the divisor is 32768 and not 32767',
    wrong === 0, `${wrong} wrong`);

  // 🔴 THE PROOF THAT THE MODEL HOLDS COPIES. Parse, scribble over the buffer
  // that was parsed, decode. If `readWave` had kept a view the audio would carry
  // the scribble.
  const scratch = RAW[0].slice();
  const parsed = W.readWave(scratch);
  scratch.fill(0x5a, 0, 4096);
  const after = W.toMono(parsed);
  const clean = W.toMono(WAVES[0]);
  ok('decoding after the source buffer is overwritten still gives the original audio',
    after.ok && after.samples.every((v, i) => v === clean.samples[i]),
    'so nothing in toMono reads the buffer readWave parsed');
  ok('and the scribble really landed, so that check is not passing by accident',
    scratch[44] === 0x5a && RAW[0][44] !== 0x5a);
}

console.log('\n-- the one thing a second source can corroborate --');

// ✅ WHICH FILE IS WHICH SLOT, AND NOTHING MORE. `index.json` was written by
// Novation Components and the file names were read by `unzip.mjs`. They agree.
// ⚖️ WHICH PAD PLAYS SLOT 37 IS NOT IN HERE AND IS NOT GUESSED. It is a property
// of a session, not of a WAV, and nothing in this repository corroborates a
// mapping.
{
  ok('index.json lists 64 samples, named Sample1 to Sample64, in file order',
    meta.samples.length === 64
    && meta.samples.every((s, i) => s.name === `Sample${i + 1}` && s.url === `samples/sample_${i}.wav`),
    `${meta.samples.length} entries, first ${JSON.stringify(meta.samples[0].name)}`);
  ok('and every url it names is really in the archive',
    meta.samples.every((s) => list.some((e) => e.name === s.url)));
  const rows = WAVES.map((w, i) => W.summarise(w, meta.samples[i].name));
  ok('so summarise() gives 64 table rows with a name, a length and a peak on each',
    rows.length === 64 && rows.every((r) => r.ok && r.name && r.seconds > 0 && r.peak > 0)
    && rows[0].chunks === 'fmt  data',
    JSON.stringify(rows[0]));
  // ⚠️ HALF A MILLISECOND IS THE BOUND AND ONE ROW SITS EXACTLY ON IT. Sample 43
  // is 0.3125 s, which rounds half up to 0.313, so a strict `< 0.0005` goes red
  // on a correct row. The bound is inclusive and the float slop is named rather
  // than papered over with a looser number.
  const off = rows.map((r, i) => Math.abs(r.seconds - WAVES[i].duration));
  ok('and the rounding in a row is for the cell, with the full precision still on the wave',
    rows[0].seconds === 1.5 && WAVES[0].duration === 1.5
    && off.every((d) => d <= 0.0005 + 1e-9),
    `worst cell is ${Math.max(...off).toFixed(6)} s out, sample ${off.indexOf(Math.max(...off))} at 0.3125 s`);
}

// ------------------------------------------------------- the second corpus

console.log('\n-- the second corpus, which does not exist, measured rather than shrugged at --');

if (!fs.existsSync(BOUGHT)) {
  note('the purchased soundbank is not on this machine, so there is no second pack to look in');
} else {
  const outer = readZip(fs.readFileSync(BOUGHT));
  const packs = outer.filter((e) => e.name.endsWith('.circuitpack'));
  let entries = 0, wavs = 0, promised = 0, emptyNames = 0;
  for (const pk of packs) {
    const inner = readZip(await pk.read());
    entries += inner.length;
    wavs += inner.filter((e) => e.name.endsWith('.wav')).length;
    const idx = JSON.parse(new TextDecoder().decode(await inner.find((e) => e.name === 'index.json').read()));
    promised += idx.samples.length;
    emptyNames += idx.samples.filter((s) => s.name === '').length;
  }
  ok('the two purchased packs hold 198 entries between them and not one .wav',
    packs.length === 2 && entries === 198 && wavs === 0,
    `${entries} entries, ${wavs} wav`);
  // 🔴 AND THEIR index.json PROMISES 128 SAMPLES THAT ARE NOT IN THE FILE. That
  // is the `User Session` lesson one layer along: a manifest is a label, the
  // archive is the fact, and a page that built its table from `index.json`
  // would show 64 rows of audio that does not exist.
  ok('while their index.json lists 128 samples between them, every one with an empty name',
    promised === 128 && emptyNames === 128,
    'a manifest is a promise, the archive is the inventory');
  note('so no figure above rests on two packs: there is exactly one corpus of Circuit samples here, 64 files');
}

// ------------------------------------------------------ the negative controls

console.log('\n-- the negative controls, and what stays green under each --');

// Twelve structural claims, all true of a real sample. Each sabotage runs the
// battery and the number that goes red is the measurement.
function battery(u8) {
  const out = [];
  const add = (name, fn) => {
    try { out.push({ name, ok: !!fn() }); } catch (e) { out.push({ name, ok: false, why: e.message }); }
  };
  add('the reader accepts it', () => W.readWave(u8).ok);
  add('the RIFF size agrees with the file length', () => W.readWave(u8).riffSizeOk);
  add('the data chunk holds every byte it declares', () => {
    const w = W.readWave(u8);
    return w.ok && !w.chunks.find((c) => c.id === 'data').truncated;
  });
  add('48 kHz, 16 bit, mono', () => {
    const w = W.readWave(u8);
    return w.rate === 48000 && w.bits === 16 && w.channels === 1;
  });
  add('block align is channels times bits over eight', () => W.readWave(u8).blockAlignOk);
  add('byte rate is the rate times the block align', () => W.readWave(u8).byteRateOk);
  add('the data is a whole number of frames', () => W.readWave(u8).partialFrameBytes === 0);
  // ⚠️ THE CROSS CHECK BETWEEN THE TWO WAYS OF ASKING HOW LONG IT IS. One reads
  // the data, the other believes the header. They agree in all 64 and a wrong
  // block align pulls them apart.
  add('the length from the data agrees with the length the byte rate claims', () => {
    const w = W.readWave(u8);
    return Math.abs(w.duration - w.dataBytes / w.byteRate) < 1e-9;
  });
  add('it is between 0.12 and 2.00 seconds', () => {
    const d = W.readWave(u8).duration;
    return d >= 0.124 && d <= 2.0;
  });
  add('it decodes to floats, every one inside -1 to 1', () => {
    const m = W.toMono(W.readWave(u8));
    return m.ok && m.samples.every((v) => v >= -1 && v <= 1);
  });
  add('one float for every pair of data bytes', () => {
    const w = W.readWave(u8);
    return W.toMono(w).samples.length === w.dataBytes / 2;
  });
  add('it is not silent', () => {
    const c = W.content(W.readWave(u8));
    return c.ok && !c.silent;
  });
  return out;
}
const reds = (u8) => battery(u8).filter((c) => !c.ok);
const N = battery(RAW[0]).length;

ok(`a real sample passes all ${N} of the battery`, reds(RAW[0]).length === 0,
  reds(RAW[0]).map((c) => c.name).join('; ') || 'nothing red');

// 🔴 SABOTAGE 1: THE DATA CHUNK TRUNCATED.
// ⚠️ IT TAKES 2 OF 12 AND ALL TEN SURVIVORS ARE RIGHT TO SURVIVE, WHICH IS THE
// REPORTABLE RESULT RATHER THAN A HOLE. Cut 1,024 bytes off a 16 bit mono file
// and what is left is a shorter file that is correct in every other way: whole
// frames, a consistent byte rate, floats in range. The ONLY thing that says it
// was cut is that two headers still declare the old length, and those are the
// two checks that go red. A reader that skipped 44 bytes and trusted what it
// found would report 1.49 s and complain to nobody.
{
  const cut = RAW[0].slice(0, RAW[0].length - 1024);
  const r = reds(cut);
  const alive = battery(cut).filter((c) => c.ok).map((c) => c.name);
  ok(`truncating 1,024 bytes takes ${r.length} of ${N} red, both of them a declared length`,
    r.length === 2
    && r.every((c) => c.name.includes('RIFF size') || c.name.includes('declares'))
    && alive.length === 10,
    r.map((c) => c.name).join('; '));
  ok('and the wave still reports itself truncated, with the data it really has',
    W.readWave(cut).truncated === true
    && W.readWave(cut).dataBytes === 144000 - 1024
    && W.readWave(cut).dataDeclared === 144000,
    `${W.readWave(cut).dataBytes} present of ${W.readWave(cut).dataDeclared} declared`);

  // 🔴 AND CUTTING AN ODD NUMBER OF BYTES TAKES MORE, WHICH IS NOT A BUG IN
  // EITHER READING. A dangling half sample is a fact about the file that the
  // even cut genuinely does not have.
  const odd = RAW[0].slice(0, RAW[0].length - 1025);
  const ro = reds(odd);
  ok(`cutting 1,025 instead takes ${ro.length} of ${N} red, the extra three all about the half frame left dangling`,
    ro.length === 5 && W.readWave(odd).partialFrameBytes === 1,
    ro.map((c) => c.name).join('; '));
}

// 🔴 SABOTAGE 2: THE RIFF MAGIC CORRUPTED. One byte, and the reader refuses the
// file rather than reading the audio that is undeniably still in it.
{
  const bad = RAW[0].slice();
  bad[1] = 0x58;                                    // RIFF becomes RXFF
  const r = reds(bad);
  ok(`one byte of the magic takes all ${N} of ${N} red, and the refusal quotes what it found`,
    r.length === N && W.readWave(bad).why.includes('"RXFF"'),
    W.readWave(bad).why);
  // ⚠️ AND THE FORM IS A SEPARATE BYTE RANGE, SO IT IS A SEPARATE SABOTAGE.
  // A file can say RIFF and be an AVI.
  const avi = RAW[0].slice();
  avi.set([0x41, 0x56, 0x49, 0x20], 8);
  ok('and corrupting the form instead refuses it as a RIFF that is not a WAVE',
    reds(avi).length === N && W.readWave(avi).why.includes('"AVI "'),
    W.readWave(avi).why);
}

// 🔴 SABOTAGE 3: A BLOCK ALIGN THAT DISAGREES WITH CHANNELS TIMES BITS. The most
// dangerous of the three, because nothing about the file looks wrong: it is
// still RIFF, still WAVE, still 48 kHz 16 bit mono, still whole frames, and it
// still decodes to floats in range. It is simply half as long as it is.
{
  const bad = RAW[0].slice();
  new DataView(bad.buffer, bad.byteOffset).setUint16(32, 4, true);    // blockAlign 2 -> 4
  const w = W.readWave(bad);
  const r = reds(bad);
  ok(`a block align of 4 on a 16 bit mono file takes ${r.length} of ${N} red`,
    r.length === 4
    && r.map((c) => c.name).join(';').includes('block align is channels')
    && r.map((c) => c.name).join(';').includes('byte rate is the rate'),
    r.map((c) => c.name).join('; '));
  ok('and the damage is a duration halved to 0.75 s from a file that still holds 1.5 s of audio',
    w.ok && w.blockAlignOk === false && w.frames === 36000 && w.duration === 0.75
    && w.dataBytes === 144000,
    `${w.frames} frames claimed, ${w.dataBytes / 2} samples present`);
}

// 🔴 SABOTAGE 4: THE FORMAT TAG FLIPPED TO A COMPRESSED ONE. The bytes are
// unchanged PCM and the reader must still refuse, because believing the audio
// over the header is how a decoder produces confident noise.
{
  const bad = RAW[0].slice();
  new DataView(bad.buffer, bad.byteOffset).setUint16(20, 17, true);   // IMA ADPCM
  ok(`a format tag of 17 takes all ${N} of ${N} red and names IMA ADPCM in the refusal`,
    reds(bad).length === N && W.readWave(bad).why.includes('IMA ADPCM'),
    W.readWave(bad).why);
}

// 🔴 SABOTAGE 5: THE data CHUNK RENAMED. There is 144,000 bytes of audio in the
// file and no chunk claiming it, which is exactly the case a 44 byte assumption
// cannot see.
{
  const bad = RAW[0].slice();
  bad.set([0x64, 0x61, 0x74, 0x78], 36);                              // 'data' -> 'datx'
  ok(`renaming the data chunk takes all ${N} of ${N} red, with 144,000 bytes of audio still in the file`,
    reds(bad).length === N && W.readWave(bad).why === 'no data chunk, so there is no audio in it',
    W.readWave(bad).why);
  // 🔴 THE CONTROL ON THE CONTROLS. Every sabotage above is one edit to a copy
  // of `sample_0.wav`, so the block is only worth anything if the untouched
  // original is still green after all of it.
  ok('while the untouched sample is still green, so the sabotages are the difference',
    reds(RAW[0]).length === 0 && RAW[0][36] === 0x64);
}

// ------------------------------------------------------------- the absence

console.log('\n-- what this module must not be able to do --');

// 🔴 THE EXPORT TEST, THE SAME ONE `circuit-session-test.mjs` RUNS.
{
  const makers = Object.keys(W).filter((k) => /write|send|encode|emit|sysex|bytes/i.test(k)
    && typeof W[k] === 'function');
  ok('no exported function is named for making or sending a message', makers.length === 0,
    makers.join() || `none of ${Object.keys(W).length} exports`);
}
// 🔴 AND THE SOURCE TEST, BECAUSE A NAME TEST CANNOT SEE A CALL INSIDE A
// FUNCTION. `toMono()` returns an array of floats on purpose, so the export test
// alone would not notice a line that handed those floats to a device.
{
  const src = fs.readFileSync(path.join(HERE, 'circuit-sample.mjs'), 'utf8');
  // 🔴 THE COMMENTS COME OUT FIRST, AND THAT IS NOT TIDINESS. The module's own
  // header says `requestMIDIAccess`, `AudioContext` and `decodeAudioData` in the
  // sentences promising it calls none of them, so a check run over the raw text
  // goes red on a correct file.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  ok('the comment stripper left the code behind, which is what makes the next two checks worth reading',
    code.includes('export function readWave') && !code.includes('NOTHING HERE SENDS'),
    `${src.length} characters down to ${code.length}`);
  const banned = ['requestMIDIAccess', 'MIDIAccess', 'MIDIOutput', 'midiOut', 'navigator.',
    'XMLHttpRequest', 'WebSocket', 'fetch(', '.send('];
  const found = banned.filter((b) => code.includes(b));
  ok('the code contains no MIDI, no port, no socket and no fetch',
    found.length === 0, found.join() || `${banned.length} patterns, none present`);
  // 🔴 AND A SECOND LIST THIS MODULE NEEDS AND THE SESSION ONE DOES NOT. A
  // sample decoder is the one place an `AudioContext` would look natural, and an
  // audio device opened inside a decoder is a decoder that cannot be run in
  // node, which is where every figure above was measured.
  const audio = ['AudioContext', 'decodeAudioData', 'AudioWorklet', 'createBufferSource', 'postMessage'];
  const heard = audio.filter((b) => code.includes(b));
  ok('and it opens no audio device either, so every number here was measured with no browser',
    heard.length === 0, heard.join() || `${audio.length} patterns, none present`);
  ok('the file does say so in its own header, so the next reader is told rather than left to notice',
    src.includes('NOTHING HERE SENDS ANYTHING ANYWHERE') && src.includes('OPENS NO AUDIO DEVICE'));
  // 🔴 AND A THIRD LIST SINCE THE STREAM READER LANDED, WHICH IS THE ONE THIS
  // WORK COULD HAVE BROKEN. `unpack7` has an inverse and the inverse is the
  // first half of a complete bulk sample transfer, the file that would replace
  // every sample slot on an instrument with no factory reset. `pack7` and
  // `makeStream` are in THIS file and they may not move into that one.
  // ⚠️ AND THESE ARE ANCHORED RATHER THAN SUBSTRINGS, WHICH THE FIRST RUN
  // PROVED IT HAD TO BE: `'pack7'` matched inside `unpack7` and took this assert
  // red on a correct module. That is the rule in CLAUDE.md about never guarding
  // on `includes(<substring>)`, arriving inside the check written to enforce a
  // different rule.
  const making = [/\bpack7/, /function\s+makeStream/, /Uint8Array\.from\(\[0xf0/, /0xf7\]\)/];
  const built = making.filter((b) => b.test(code));
  ok('and there is no packer in it: no inverse of unpack7 and no function that assembles a stream',
    built.length === 0
    && code.includes("import { messages, unpack7 } from './circuit-syx.mjs'"),
    built.map(String).join() || 'it imports the unpacker and has no packer of its own');
  ok('while this test does have one, which is what makes the four stream sabotages above possible',
    typeof pack7 === 'function' && typeof makeStream === 'function'
    && pack7(Uint8Array.from([0xff, 0x01])).length === 3,
    'the packer lives in the test and cannot leave it');
}

// ── the samples out of a pack, which is the half two pages share ──────────
//
// 🔴 `samplesIn` EXISTS BECAUSE A SECOND PAGE WAS ABOUT TO GROW A COPY OF IT.
// Instructed 2026-09-21: *"use shared code to get samples"*. What it has to get
// right beyond parsing is the ORDER, and that is the part a reader could never
// catch by looking: `sample_10.wav` sorts before `sample_2.wav` as text, and the
// pack's own `index.json` names `Sample1` to `Sample64` against `sample_0.wav`
// to `sample_63.wav` in order, 64 of 64. A page showing slot 10 where slot 2
// lives would be silently wrong on every row after the ninth.
{
  const got = await W.samplesIn(list);
  ok('it finds all 64 samples in a real pack and every one of them parses',
    got.length === 64 && got.every((x) => x.wave.ok && x.row.ok),
    `${got.length} found, ${got.filter((x) => x.wave.ok).length} parsed`);

  ok('and they come back in the pack\'s own numeric order, not in the order the names sort',
    got.every((x, i) => x.name === `sample_${i}.wav`),
    `${got[0].name}, ${got[1].name}, ${got[2].name} ... ${got[63].name}`);

  // 🔴 THE NEGATIVE CONTROL FOR THAT ORDER, AND WITHOUT IT THE ASSERT ABOVE IS
  // SATISFIED BY THE ARCHIVE HAPPENING TO BE IN ORDER ALREADY. The entries are
  // handed over shuffled here, so a function that returned them as it found
  // them goes red.
  const shuffled = list.slice().reverse();
  const back = await W.samplesIn(shuffled);
  ok('NEGATIVE CONTROL: handed the entries backwards it still returns them in the pack\'s order',
    back.length === 64 && back.every((x, i) => x.name === `sample_${i}.wav`),
    `${back[0].name} then ${back[1].name}`);

  // ⚠️ AN ARCHIVE WITH NO WAVS IS NOT AN ERROR, IT IS AN ANSWER, and it is the
  // real shape of both packs in `purchased/`, whose index promises 128 samples
  // that are not in either file.
  ok('an archive with no samples in it comes back empty rather than throwing',
    (await W.samplesIn(list.filter((e) => !/\.wav$/i.test(e.name)))).length === 0
    && (await W.samplesIn([])).length === 0
    && (await W.samplesIn(null)).length === 0,
    'no wavs, an empty list and nothing at all all come back as no samples');

  // 🔴 A FILE THAT WILL NOT PARSE KEEPS ITS PLACE AND CARRIES ITS REASON, which
  // is what stops a pack looking smaller than it is.
  const broken = [{
    name: 'samples/sample_0.wav', size: 12,
    read: async () => new Uint8Array([0x52, 0x58, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]),
  }];
  const bad = await W.samplesIn(broken);
  ok('a sample that will not read keeps its row and says why rather than being dropped',
    bad.length === 1 && bad[0].wave.ok === false && bad[0].row.ok === false
    && /RIFF/.test(bad[0].row.why)
    && W.summariseAll(bad.map((x) => x.wave)).refused === 1,
    `1 row saying "${bad[0].row.why}"`);
}

// ── a real session image is not a sample table ────────────────────────────
//
// 🔴 THE NEGATIVE CONTROL THE SYNTHETIC ONES CANNOT GIVE. Zeros, 0xFF and noise
// are easy to refuse. A real 53,248 byte Circuit session is structured data from
// the same instrument in the same family of formats, and it is the buffer a
// sliced sample stream would be mistaken for.
{
  const sess = list.find((e) => e.name.endsWith('.circuitsession'));
  const bytes = await sess.read();
  const r = W.slotsIn(bytes);
  ok('a real 53,248 byte session yields 0 slots, and the reason names the byte that is not a slot marker',
    bytes.length === 53248 && r.ok === false && r.read === 0
    && r.why.includes('slot 0') && /0x[0-9a-f]{2}/.test(r.why),
    `${sess.name}: ${r.why}`);
  // ⚠️ AND THROUGH THE PAGE-FACING FUNCTION TOO, because a session file dropped
  // on a sample page has to be told what it is rather than shown nothing.
  const set = W.sampleSetIn(bytes);
  ok('and dropped on the whole reader it is refused for what it is rather than for being empty',
    set.ok === false && set.samples.length === 0
    && set.container === W.CONTAINER.unknown,
    `container ${set.container}, "${set.why}"`);
}

// ── the archive download, which is the corpus this was built for ──────────

console.log('\n-- the archive corpus in tmp/packs, absent on a fresh clone --');

if (!fs.existsSync(PACKS)) {
  note('tmp/packs is not on this machine, so the 4 stream files are unmeasured here');
} else {
  /**
   * ⚠️ EVERY FILE BELOW IS READ IN MEMORY AND NOTHING IS EXTRACTED TO DISK.
   * `tmp/` is gitignored as a whole and one zip in that directory is a Windows
   * executable and another a Nintendo DS ROM. Nothing here runs anything.
   * ⚠️ AND THE TEN INSIDE `Future_Kawaii.rar` ARE NOT HERE. `unzip.mjs` reads
   * zips and that file is a rar, so the ten `.circuitpack` files in it are
   * measured in the research and not by this test.
   */
  const raw = (f) => new Uint8Array(fs.readFileSync(path.join(PACKS, f)));
  const inZip = async (f, ends) => {
    const l = readZip(fs.readFileSync(path.join(PACKS, f)));
    const e = l.find((x) => x.name.endsWith(ends));
    return e ? await e.read() : null;
  };

  const CORPUS = [
    { file: '80S Drums_sampleset.syx', bytes: fs.existsSync(path.join(PACKS, '80S Drums_sampleset.syx')) ? raw('80S Drums_sampleset.syx') : null,
      streams: 1, tables: 1, filled: 64, empty: 0, seconds: 21.03, crc: 0xd79d1ca4 },
    { file: 'Roland_Classics.zip -> Roland Classics.syx', bytes: await inZip('Roland_Classics.zip', 'Roland Classics.syx'),
      streams: 1, tables: 1, filled: 48, empty: 16, seconds: 17.31 },
    { file: 'drum_and_synth_samples.zip -> drum_and_synth.syx', bytes: await inZip('drum_and_synth_samples.zip', 'drum_and_synth.syx'),
      streams: 1, tables: 1, filled: 64, empty: 0, seconds: 41.72 },
    { file: 'payton_carter_circuit_pack_210615.zip -> payton_carter.circuitpack', bytes: await inZip('payton_carter_circuit_pack_210615.zip', 'payton_carter.circuitpack'),
      streams: 2, tables: 1, filled: 64, empty: 0, seconds: 24.46, other: 64 },
    { file: 'payton_carter_circuit_pack_210615.zip -> payton_carter_sessions.syx', bytes: await inZip('payton_carter_circuit_pack_210615.zip', 'payton_carter_sessions.syx'),
      streams: 1, tables: 0, filled: 0, empty: 0, seconds: 0 },
  ];
  // 🔴 AND THE MISSING ONES ARE COUNTED RATHER THAN INDEXED INTO.
  // `circuit-session-test.mjs` indexed an optional corpus unconditionally on
  // 2026-09-21 and turned a clean skip into `Cannot read properties of
  // undefined`, which reads as a broken decoder rather than an absent file.
  const here = CORPUS.filter((c) => c.bytes);
  if (!here.length) {
    note('none of the five stream files are in tmp/packs, so nothing below ran');
  } else {
    if (here.length < CORPUS.length) {
      note(`${CORPUS.length - here.length} of ${CORPUS.length} stream files are not here and were not measured`);
    }
    const READ = here.map((c) => ({ ...c, set: W.sampleSetIn(c.bytes), split: W.streamsIn(c.bytes) }));

    ok(`byte 0 says sysex on all ${READ.length}, and every one of them is refused by readZip today`,
      READ.every((c) => W.containerOf(c.bytes).kind === W.CONTAINER.sysex)
      && READ.every((c) => { try { readZip(c.bytes); return false; } catch { return true; } }),
      READ.map((c) => W.containerOf(c.bytes).head).join(', '));

    const allStreams = READ.flatMap((c) => c.split.streams);
    ok(`all ${allStreams.length} streams in them verify: declared length and CRC32 both, 0 refused`,
      allStreams.every((s) => s.ok && s.lengthOk && s.crcOk),
      `${allStreams.filter((s) => s.ok).length} of ${allStreams.length}`);
    // ✅ THE FIELD THAT SEPARATES THE TWO KINDS, REPRODUCED. ⚖️ What it MEANS is
    // a reading and nothing here decides on it: the slot walker decides.
    const regions = allStreams.reduce((m, s) => ({ ...m, [s.region]: (m[s.region] || 0) + 1 }), {});
    ok('the six nibble field at bytes 8 to 13 is 0x23b000 on every sample stream and 0x2e000 on every session one',
      allStreams.filter((s) => s.region === W.REGION_SAMPLES).length
        === READ.reduce((n, c) => n + c.tables, 0)
      && allStreams.filter((s) => s.region === W.REGION_SESSIONS).length
        === allStreams.length - READ.reduce((n, c) => n + c.tables, 0),
      Object.entries(regions).map(([k, v]) => `0x${(+k).toString(16)} x${v}`).join(', '));

    for (const c of READ) {
      const s = c.set;
      const tables = s.streams.filter((x) => x.slots === 64).length;
      ok(`${c.file}: ${c.streams} stream(s), ${c.tables} sample table(s), ${c.filled} filled and ${c.empty} empty, ${c.seconds} s`,
        s.streams.length === c.streams && tables === c.tables
        && s.samples.filter((x) => x.wave.frames > 0).length === c.filled
        && s.samples.filter((x) => x.wave.frames === 0).length === c.empty
        && +W.summariseAll(s.samples.map((x) => x.wave)).seconds.toFixed(2) === c.seconds
        && (c.other === undefined || s.other === c.other),
        `${s.streams.length} stream(s), ${s.samples.length} rows, `
        + `${W.summariseAll(s.samples.map((x) => x.wave)).seconds.toFixed(2)} s`
        + `${c.other === undefined ? '' : `, ${s.other} message(s) outside any stream`}`);
    }

    const one = READ.find((c) => c.crc);
    if (!one) note('the file whose published CRC is on record is not here, so that figure was not checked');
    else {
      ok(`the CRC published in the research for ${one.file.split(' ')[0]} is 0xd79d1ca4, and it is what the payload computes`,
        one.split.streams[0].crc === one.crc && one.split.streams[0].crcDeclared === one.crc
        && one.split.streams[0].plain.length === 5763072
        && one.split.streams[0].carriers === 22512,
        `0x${one.split.streams[0].crc.toString(16)} over ${one.split.streams[0].plain.length.toLocaleString()} bytes`);
      // 🔴 THE SABOTAGE THAT MATTERS MOST, BECAUSE IT IS ON REAL BYTES. One bit
      // in 5,763,072 and nothing else in the file changes.
      const bad = one.bytes.slice();
      const at = 6 + 23 + 100;
      bad[at] = bad[at] ^ 0x01;
      const bs = W.streamsIn(bad).streams[0];
      ok('flipping one bit in one carrier of that real file takes the checksum red and nothing else',
        bs.ok === false && bs.crcOk === false && bs.lengthOk === true
        && bs.plain.length === 5763072
        && W.slotsIn(bs.plain).read === 64
        && W.sampleSetIn(bad).samples.length === 0,
        `0x${bs.crc.toString(16)} against a declared 0x${bs.crcDeclared.toString(16)}, `
        + 'and the 64 slot table still walks perfectly');
      // ⚠️ THE TAIL IS ZERO FILL AND IT IS 70.3 BLOCKS OF 53,248, which is where
      // the `141 sessions` in `research/dump-samples-2026-09-21.md` §7.3 comes
      // from. It is reported and not refused.
      const walk = W.slotsIn(one.split.streams[0].plain);
      ok('and 2,019,664 of its 5,763,072 bytes are used, with the other 3,743,408 zero to the last byte',
        walk.used === 2019664 && walk.tail === 3743408 && walk.tailNonZero === 0,
        `${walk.used.toLocaleString()} used, ${walk.tail.toLocaleString()} tail, ${walk.tailNonZero} non-zero in it`);
    }

    const total = READ.reduce((n, c) => n + c.set.samples.length, 0);
    const filled = READ.reduce((n, c) => n + c.set.samples.filter((x) => x.wave.frames > 0).length, 0);
    const secs = READ.reduce((n, c) => n + W.summariseAll(c.set.samples.map((x) => x.wave)).seconds, 0);
    ok(`${total} slots come out of ${READ.length} files that both pages refused this morning, ${filled} of them filled`,
      total === 256 && filled === 240
      && READ.every((c) => c.set.samples.every((x) => x.row.ok))
      && READ.flatMap((c) => c.set.samples).every((x) => x.wave.rate === 48000
        && x.wave.bits === 16 && x.wave.channels === 1),
      `${secs.toFixed(1)} s, all 48 kHz 16 bit mono, 0 refused`);
  }
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}${skip ? `  ${skip} skipped` : ''}\n`);
process.exit(fail ? 1 : 0);
