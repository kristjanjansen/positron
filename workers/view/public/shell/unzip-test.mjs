// demo/shell/unzip-test.mjs — the zip reader, against the real pack.
//
//   node demo/shell/unzip-test.mjs
//
// 🔴 IT READS `New Pack.circuitpack`, WHICH IS IN THE REPOSITORY AND IS
// SOMEBODY'S ONLY BACKUP OF A DEVICE WITH NO FACTORY RESET. Reading is free and
// nothing here writes. It is the right fixture precisely because it is real: a
// zip somebody made for a test has whatever shape the test wanted.
//
// THREE OF THESE ARE NEGATIVE CONTROLS, because a reader that returned an empty
// array for everything would pass a suite that only counts entries.
import fs from 'node:fs';
import path from 'node:path';
import { readZip, entry } from './unzip.mjs';

const PACK = path.join(path.dirname(new URL(import.meta.url).pathname), '../../tmp/personal/New Pack.circuitpack');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' · ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' · ' + detail : ''}`); }
};

console.log('\n== the zip reader ==');

if (!fs.existsSync(PACK)) {
  console.log('  New Pack.circuitpack is not here, so there is nothing to read.');
  process.exit(0);
}

const buf = fs.readFileSync(PACK);
const list = readZip(buf);

ok('the pack has 164 entries', list.length === 164, `${list.length}`);

const methods = list.reduce((m, e) => ({ ...m, [e.method]: (m[e.method] || 0) + 1 }), {});
ok('161 are deflated and 3 are stored, which is what it was written for',
  methods[8] === 161 && methods[0] === 3, JSON.stringify(methods));

const idx = entry(list, 'index.json');
ok('index.json is found by exact name', !!idx, idx ? `${idx.size} bytes` : 'missing');

const text = new TextDecoder().decode(await idx.read());
const meta = JSON.parse(text);
ok('it inflates to JSON that parses', meta.product === 'circuit' && meta.version === '2.0',
  `${meta.product} ${meta.version}`);
ok('and it lists 32 sessions', Array.isArray(meta.sessions) && meta.sessions.length === 32,
  `${meta.sessions?.length}`);

const wavs = list.filter((e) => e.name.endsWith('.wav'));
ok('64 samples are in it', wavs.length === 64, `${wavs.length}`);

const wav = await wavs[0].read();
ok('a sample inflates to a RIFF header and its declared length',
  new TextDecoder().decode(wav.slice(0, 4)) === 'RIFF' && wav.length === wavs[0].size,
  `${wav.length} bytes of a declared ${wavs[0].size}`);

// ⚠️ THE WAV'S OWN HEADER IS A SECOND SOURCE. A reader that returned the right
// NUMBER of bytes of rubbish would pass the line above.
const dv = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
const channels = dv.getUint16(22, true), rate = dv.getUint32(24, true), bits = dv.getUint16(34, true);
ok('and the bytes really are 48 kHz 16 bit mono, read out of the file itself',
  channels === 1 && rate === 48000 && bits === 16, `${rate} Hz, ${channels} ch, ${bits} bit`);

const syx = list.filter((e) => e.name.endsWith('.syx'));
const patch = await syx[0].read();
ok('64 patches are in it and one is 350 bytes between F0 and F7',
  syx.length === 64 && patch.length === 350 && patch[0] === 0xf0 && patch[349] === 0xf7,
  `${syx.length} patches, ${patch.length} bytes`);

const ses = list.filter((e) => e.name.endsWith('.circuitsession'));
const s0 = await ses[0].read();
ok('32 sessions are in it, every one 53,248 bytes, starting USER',
  ses.length === 32 && ses.every((e) => e.size === 53248)
  && new TextDecoder().decode(s0.slice(0, 4)) === 'USER',
  `${ses.length} sessions, ${s0.length} bytes`);

// ── the negative controls ──────────────────────────────────────────────────

{
  let threw = '';
  try { readZip(new Uint8Array(100)); } catch (e) { threw = e.message; }
  ok('something that is not a zip says so', threw.includes('not a zip'), threw);
}

{
  // A truncated pack must not read as a smaller one. The end of central
  // directory is at the END, so cutting the tail off removes it entirely.
  let threw = '';
  try { readZip(buf.subarray(0, 1000)); } catch (e) { threw = e.message; }
  ok('a truncated archive is refused rather than partly read', !!threw, threw);
}

{
  // 🔴 THE ONE THAT PROVES THE INFLATE IS REAL. Corrupt one byte in the middle
  // of a deflated entry's data and it must not come back as a plausible
  // shorter buffer.
  const copy = new Uint8Array(buf);
  const e = readZip(copy).find((x) => x.method === 8 && x.size > 2000);
  const dv2 = new DataView(copy.buffer);
  const at = e.offset + 30 + dv2.getUint16(e.offset + 26, true) + dv2.getUint16(e.offset + 28, true);
  copy[at + Math.floor(e.compressed / 2)] ^= 0xff;
  let threw = '';
  try { await readZip(copy).find((x) => x.name === e.name).read(); }
  catch (err) { threw = err.message; }
  ok('a corrupted entry throws rather than returning rubbish', !!threw, threw.slice(0, 70));
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
