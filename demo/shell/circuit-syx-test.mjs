// demo/shell/circuit-syx-test.mjs
// The SysEx stream reader, graded on a known signal first and on real files
// second.
//
//   node demo/shell/circuit-syx-test.mjs
//
// 🔴 THE UNPACKER IS GRADED ON A SYNTHETIC GROUP BEFORE IT IS POINTED AT A FILE,
// WHICH IS THE `wobble-test.mjs` RULE. A floor proves an instrument does not
// invent movement; only a KNOWN signal proves it can see any. Two builds of that
// tool measured the wrong quantity and passed their floor perfectly. So the
// first four asserts here decode a group whose answer is written out by hand.
//
// 🔴 AND THE REAL FILES ARE NOT IN THIS REPOSITORY AND MUST NOT BE. They came off
// an archive.org item that carries no licence, and `purchased/` is gitignored for
// the same reason. The file checks SKIP CLEANLY when they are absent, the way
// `timeline/lab/csound-oracle.mjs` skips where Csound is not installed, and the
// skip NAMES what goes unmeasured rather than passing quietly.
import fs from 'node:fs';
import path from 'node:path';
import * as X from './circuit-syx.mjs';
import * as S from './circuit-session.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
/** The two archive.org session streams, wherever they are kept. */
const files = ['on_the_run.circuitpack', 'factory_16.syx'];

// 🔴 THE FILES ARE LOOKED FOR IN `purchased/` FIRST AND A SCRATCHPAD SECOND,
// AND THE ORDER IS THE POINT. A scratchpad path is session specific and gets
// swept, so a test that only knows one is a test that silently stops measuring
// anything the day the directory goes. `purchased/` is gitignored, durable, and
// already the documented home for third party material that is not ours to
// publish.
// ⚠️ NOTHING IS COPIED THERE BY THIS FILE. It looks, it does not move, because
// `on_the_run.circuitpack` writes flash on all 64 synth slots and deciding where
// that file lives is not a test's decision to make.
const CANDIDATES = [
  path.join(HERE, '../../purchased'),
  '/private/tmp/claude-501/-Users-s32863-personal-positron/7ece5d66-afd6-4d4c-9d1b-db3bd7f3b538/scratchpad/pull',
];
const PULL = CANDIDATES.find((d) => fs.existsSync(d) && files.some((f) => fs.existsSync(path.join(d, f))))
  || CANDIDATES[0];

let pass = 0, fail = 0, skip = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? '  ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? '  ' + detail : ''}`); }
};
const note = (s) => { skip++; console.log(`  skip ${s}`); };
const printable = (s) => [...s].every((c) => c >= ' ' && c <= '~');

console.log('\n== the Circuit SysEx stream reader ==');

// ------------------------------------------------- the known signal, no file

console.log('\n-- the unpacker, against a group written out by hand --');

// 🔴 mask 0x15 is bits 0, 2 and 4, so data bytes 0, 2 and 4 get their high bit
// back and the other four do not. Worked out on paper, not by running the code.
{
  const group = Uint8Array.from([0x15, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
  const want = [0x81, 0x02, 0x83, 0x04, 0x85, 0x06, 0x07];
  const got = [...X.unpack7(group)];
  ok('one group of 8 restores to 7 bytes with the high bits the mask names',
    JSON.stringify(got) === JSON.stringify(want),
    got.map((b) => b.toString(16)).join(' '));
  ok('a mask of 0x00 leaves all seven alone',
    [...X.unpack7(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]))].join() === '1,2,3,4,5,6,7');
  ok('a mask of 0x7F sets the high bit on all seven',
    [...X.unpack7(Uint8Array.from([0x7f, 1, 2, 3, 4, 5, 6, 7]))].every((b) => b > 0x7f));
  // ⚠️ 293 IS NOT A MULTIPLE OF 8, AND THE LAST GROUP IS SHORT ON PURPOSE.
  // 36 whole groups carry 252 bytes and the 37th carries 4, which is 256.
  ok('293 packed bytes restore to exactly 256, with a short final group',
    X.unpack7(new Uint8Array(X.CARRIER_PAYLOAD)).length === X.CARRIER_PLAIN
    && 36 * 7 + 4 === 256, `${X.unpack7(new Uint8Array(293)).length}`);
  ok('and 208 carriers of 256 make one 53,248 byte session',
    X.CARRIERS_PER_SESSION * X.CARRIER_PLAIN === S.SESSION_BYTES);
}

// 🔴 THE NEGATIVE CONTROL ON THE KNOWN SIGNAL. A decoder that ignored the mask
// entirely would pass "it returns 7 bytes" and fail here.
{
  const a = X.unpack7(Uint8Array.from([0x15, 1, 2, 3, 4, 5, 6, 7]));
  const b = X.unpack7(Uint8Array.from([0x16, 1, 2, 3, 4, 5, 6, 7]));
  ok('changing one bit of the mask changes exactly two output bytes',
    [...a].filter((v, i) => v !== b[i]).length === 2,
    `${[...a].filter((v, i) => v !== b[i]).length}`);
}

// ------------------------------------------------------ the message splitter

console.log('\n-- splitting a stream into messages --');
{
  const s = Uint8Array.from([0xf0, 1, 2, 0xf7, 0x55, 0xf0, 3, 0xf7]);
  const m = X.messages(s);
  ok('two messages, and the stray byte between them is skipped rather than refused',
    m.length === 2 && m[0].length === 4 && m[1].length === 3 && m[1].at === 5);
  ok('an unterminated tail is dropped, not returned half built',
    X.messages(Uint8Array.from([0xf0, 1, 2])).length === 0);
}

// -------------------------------------------------------------- real files

const have = files.filter((f) => fs.existsSync(path.join(PULL, f)));

if (!have.length) {
  note('the archive.org SysEx streams are not on this machine, so the 66 session grade,');
  note('the flash-write safety reading and the packing direction are all UNMEASURED here.');
  note(`they were at ${PULL}`);
} else {
  for (const f of have) {
    const u8 = new Uint8Array(fs.readFileSync(path.join(PULL, f)));
    const v = X.survey(u8);
    console.log(`\n-- ${f}, ${u8.length} bytes --`);
    ok('one stream start, 6,864 carriers, one stream end',
      v.lengths[X.CARRIER_BYTES] === 6864 && v.lengths[23] === 1 && v.lengths[15] === 1,
      JSON.stringify(v.lengths));
    ok('6,864 carriers is 33 sessions, not 32, and nothing is left over',
      v.sessions.length === 33 && v.leftover === 0
      && v.carriers / X.CARRIERS_PER_SESSION === 33,
      `${v.sessions.length} sessions, ${v.leftover} bytes left over`);

    // ✅ THE GRADE THAT MATTERS: 33 session images from a file that has nothing
    // to do with the owner's instrument, through the container model.
    let parsed = 0, rt = 0, named = 0;
    for (const one of v.sessions) {
      const sess = S.readSession(one);
      parsed++;
      if (S.compare(S.rebuild(sess), one).same) rt++;
      if (sess.header.known && sess.header.magicOk && printable(sess.header.rawName)) named++;
    }
    ok('all 33 parse, round trip byte identical, and carry a known tag, DC BB and a printable name',
      parsed === 33 && rt === 33 && named === 33, `${parsed} / ${rt} / ${named}`);

    // 🔴 THE SAFETY READING, AND IT IS THE FIRST THING A PAGE SHOWS.
    if (f === 'on_the_run.circuitpack') {
      ok('it is NOT a zip: a file named .circuitpack that is a bare SysEx stream',
        u8[0] === 0xf0 && !(u8[0] === 0x50 && u8[1] === 0x4b), `starts ${u8[0].toString(16)}`);
      ok('64 patch messages and every one writes FLASH, at all 64 synth locations',
        v.patches === 64 && v.writesFlash === true && v.flashMessages === 64
        && v.flashLocations.length === 64 && v.flashLocations[0] === 0
        && v.flashLocations[63] === 63,
        `${v.flashMessages} flash writes, locations ${v.flashLocations[0]} to ${v.flashLocations[63]}`);
    }
    if (f === 'factory_16.syx') {
      ok('it carries no patch messages at all, so nothing in it writes flash',
        v.patches === 0 && v.writesFlash === false);
      ok('16 sessions named Demo Session, which is not the named factory pack',
        v.sessions.filter((x) => S.readSession(x).header.name === 'Demo Session').length === 16,
        `${v.sessions.filter((x) => S.readSession(x).header.name === 'Demo Session').length}`);
    }
  }

  // 🔴 THE SABOTAGE THAT PROVES THE PACKING DIRECTION IS MEASURED AND NOT
  // ASSUMED. Read the mask the other way round, bit 6 minus k instead of bit k,
  // and the same 6,864 carriers still produce 33 files of exactly 53,248 bytes.
  // The length is no evidence at all. What collapses is the content.
  {
    const u8 = new Uint8Array(fs.readFileSync(path.join(PULL, have[0])));
    const wrong = [];
    for (const m of X.messages(u8).filter((x) => x.length === X.CARRIER_BYTES)) {
      const p = m.data.subarray(6, m.data.length - 1);
      for (let g = 0; g < p.length; g += 8) {
        const mask = p[g];
        for (let k = 0; k < 7 && g + 1 + k < p.length; k++) {
          wrong.push(p[g + 1 + k] | (((mask >> (6 - k)) & 1) << 7));
        }
      }
    }
    const flat = Uint8Array.from(wrong);
    let good = 0, right = 0;
    for (let i = 0; i + 53248 <= flat.length; i += 53248) {
      const s = S.readSession(flat.slice(i, i + 53248));
      if (s.header.known && s.header.magicOk) good++;
    }
    for (const one of X.survey(u8).sessions) {
      const s = S.readSession(one);
      if (s.header.known && s.header.magicOk) right++;
    }
    ok('reading the mask backwards still gives 33 files of the right LENGTH and 0 of 33 valid',
      flat.length === 33 * 53248 && good === 0 && right === 33,
      `${good} of 33 backwards against ${right} of 33 forwards`);
  }
}

// ------------------------------------------------------------- the absence

console.log('\n-- what this module must not be able to do --');
{
  const makers = Object.keys(X).filter((k) => /write|send|encode|emit|sysex|bytes/i.test(k)
    && typeof X[k] === 'function');
  ok('no exported function is named for making or sending a message', makers.length === 0,
    makers.join() || `none of ${Object.keys(X).length} exports`);
}
{
  const src = fs.readFileSync(path.join(HERE, 'circuit-syx.mjs'), 'utf8');
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  ok('the comment stripper left the code behind',
    code.includes('export function unpack7') && !code.includes('NOTHING HERE SENDS'));
  const banned = ['requestMIDIAccess', 'MIDIAccess', 'MIDIOutput', 'midiOut', 'navigator.',
    'XMLHttpRequest', 'WebSocket', 'fetch(', '.send('];
  const found = banned.filter((b) => code.includes(b));
  ok('and the code contains no MIDI, no port, no socket and no fetch',
    found.length === 0, found.join() || `${banned.length} patterns, none present`);
  // 🔴 AND THE ONE THAT IS SPECIFIC TO THIS MODULE: THERE IS NO PACKER. An
  // unpacker is a reader. A packer is the first half of a sender.
  ok('there is no function that packs 8 bit content back into 7 bit carriers',
    !/function\s+pack7|export\s+const\s+pack7/.test(code) && !code.includes('0x7f &'));
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}${skip ? `  ${skip} skipped` : ''}\n`);
process.exit(fail ? 1 : 0);
