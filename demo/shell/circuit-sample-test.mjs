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
const PACK = path.join(HERE, '../../New Pack.circuitpack');
const BOUGHT = path.join(HERE, '../../purchased/Synth-Patches.com - Soundbank for Novation Circuit and Tracks.zip');

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

// 🔴 THE DEPTHS AND CHANNEL COUNTS THAT ARE REFUSED ON PURPOSE. `DEPTHS` is one
// entry long because the corpus is one depth deep, and a page asking for 8 bit
// gets a sentence rather than arithmetic nobody graded.
{
  const eight = W.readWave(wav({ bits: 8, pcm: new Uint8Array([0, 128, 255]) }));
  const m8 = W.toMono(eight);
  ok('an 8 bit file PARSES and then refuses to decode, which is the honest split',
    eight.ok && eight.bits === 8 && eight.frames === 3 && m8.ok === false && m8.why.includes('8 bit'),
    m8.why);
  const twentyfour = W.readWave(wav({ bits: 24, pcm: new Uint8Array(9) }));
  ok('and 24 bit the same way, with the reason naming the depth',
    twentyfour.ok && twentyfour.frames === 3 && W.toMono(twentyfour).why.includes('24 bit'));
  const stereo = W.readWave(wav({ channels: 2, pcm: int16([1, 2, 3, 4]) }));
  ok('a stereo file parses as 2 frames and is not mixed down, because no mixdown has been graded',
    stereo.ok && stereo.frames === 2 && stereo.blockAlignOk
    && W.toMono(stereo).why.includes('2 channels'),
    W.toMono(stereo).why);
  ok('DEPTHS says 16 and only 16, so the refusal and the decoder cannot drift apart',
    JSON.stringify(W.DEPTHS) === '[16]');
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

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}${skip ? `  ${skip} skipped` : ''}\n`);
process.exit(fail ? 1 : 0);
