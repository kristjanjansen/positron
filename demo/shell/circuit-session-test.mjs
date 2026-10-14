// demo/shell/circuit-session-test.mjs: the session container against the real pack, no browser.
//   CIRCUIT_PACK=<path> node demo/shell/circuit-session-test.mjs
// Figures reproduce an earlier independent implementation; the round trip is sabotaged four ways.
// why: lessons/kit-circuit-session.md#test-header
import fs from 'node:fs';
import path from 'node:path';
import { readZip, entry } from './unzip.mjs';
import * as S from './circuit-session.mjs';
import * as C from './circuit-patch.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const PACK = process.env.CIRCUIT_PACK || '';
const BOUGHT = path.join(HERE, '../../tmp/purchages/Synth-Patches.com - Soundbank for Novation Circuit and Tracks.zip');

let pass = 0, fail = 0, skip = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? '  ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? '  ' + detail : ''}`); }
};
const note = (s) => { skip++; console.log(`  skip ${s}`); };
const tally = (a) => a.reduce((m, k) => ({ ...m, [k]: (m[k] || 0) + 1 }), {});
const threw = (fn) => { try { fn(); return ''; } catch (e) { return e.message; } };
const printable = (s) => [...s].every((c) => c >= ' ' && c <= '~');

console.log('\n== the Circuit session container ==');

if (!fs.existsSync(PACK)) {
  // exit 77 is SKIP to demo/shell/run-tests.mjs: nothing was measured, so it must not read as a pass
  console.log('  SKIP: no pack. The owner\'s pack is in the owner\'s private pack repository;');
  console.log('  run with CIRCUIT_PACK=<a .circuitpack file> to measure it.');
  process.exit(77);
}

const list = readZip(fs.readFileSync(PACK));
const meta = JSON.parse(new TextDecoder().decode(await entry(list, 'index.json').read()));
const all = [];
for (const s of meta.sessions) all.push(await entry(list, s.url).read());
const syx = [];
for (let i = 0; i < 64; i++) syx.push(await entry(list, `patches/patch_${i}.syx`).read());
const PATCHES = syx.map(C.readPatch);

// ------------------------------------------------------------------ the grid

console.log('\n-- the fifty regions, before any file is opened --');

ok('fifty regions, contiguous, covering exactly 53,248 bytes',
  S.SLOTS.length === 50
  && S.SLOTS.every((s, i) => i === 0 || s.at === S.SLOTS[i - 1].at + S.SLOTS[i - 1].size)
  && S.SLOTS.reduce((n, s) => n + s.size, 0) === S.SESSION_BYTES,
  `${S.SLOTS.length} regions, ${S.SLOTS.reduce((n, s) => n + s.size, 0)} bytes`);
ok('a 76 byte header, 16 slots of 1508, 32 of 720 and a final 6004',
  JSON.stringify(tally(S.SLOTS.map((s) => `${s.kind}:${s.size}`)))
  === JSON.stringify({ 'header:76': 1, 'wide:1508': 16, 'narrow:720': 32, 'tail:6004': 1 }),
  JSON.stringify(tally(S.SLOTS.map((s) => s.kind))));
// 528 - 452 = 76, and 76 + 16 x 1508 lands where the 720 stride begins; off by one, the grid
// would not close on 53,248.
// why: lessons/kit-circuit-session.md#test-76
ok('76 plus 16 x 1508 is 24,204 and that is where the 720 stride starts',
  S.NARROW_AT === 24204 && S.TAIL_AT === 47244 && S.TAIL_AT + S.TAIL_LEN === S.SESSION_BYTES,
  `${S.NARROW_AT} then ${S.TAIL_AT}`);
ok('and 528 less 452 is 76, which is the only split making the first record the same as the rest',
  528 - 452 === S.HEADER_LEN);

// --------------------------------- the published census, research §1, session_0

console.log('\n-- session_0, against research/circuit-session-format-2026-09-21.md §1 --');

const c0 = S.census(all[0]);
ok('53,248 bytes, and all 32 are', c0.length === 53248 && all.every((u) => u.length === 53248),
  `${c0.length}`);
ok('115 distinct byte values', c0.distinct === 115, `${c0.distinct}`);
ok('entropy 0.91 bits a byte', c0.entropy.toFixed(2) === '0.91', c0.entropy.toFixed(4));
ok('44,069 bytes of 0xFF, 82.8 per cent',
  c0.erased === 44069 && (c0.erased / c0.length * 100).toFixed(1) === '82.8', `${c0.erased}`);
ok('6,941 bytes of 0x00', c0.zero === 6941, `${c0.zero}`);
ok('1,495 bytes of 0x60, the commonest non-zero value',
  c0.hist[0x60] === 1495 && c0.commonNonZero === 0x60, `${c0.hist[0x60]}`);

const r0 = S.runs(all[0]);
ok('49 data blocks and 49 padding runs',
  r0.blocks.length === 49 && r0.pads.length === 49,
  `${r0.blocks.length} and ${r0.pads.length}`);
ok('their sizes are 1 x 528, 15 x 452, 32 x 32 and 1 x 848',
  JSON.stringify(tally(r0.blocks.map((b) => b.length))) === JSON.stringify({ 32: 32, 452: 15, 528: 1, 848: 1 }),
  JSON.stringify(tally(r0.blocks.map((b) => b.length))));
ok('9,180 bytes of real data, 17 per cent of the file',
  r0.blocks.reduce((n, b) => n + b.length, 0) === 9180,
  `${(9180 / 53248 * 100).toFixed(0)} per cent`);
ok('three padding lengths only: 688, 1056 and 5156',
  JSON.stringify(tally(r0.pads.map((p) => p.length))) === JSON.stringify({ 688: 32, 1056: 16, 5156: 1 }),
  JSON.stringify(tally(r0.pads.map((p) => p.length))));
ok('the stride is 1508 for the 452 byte blocks, 452 of data and 1056 of pad',
  (() => {
    const at = r0.blocks.filter((b) => b.length === 452).map((b) => b.at);
    return at.slice(1).every((x, i) => x - at[i] === 1508) && 452 + 1056 === 1508;
  })());
ok('the last pad ends exactly at the end of the file',
  r0.pads[48].at + r0.pads[48].length === 53248,
  `${r0.pads[48].at + r0.pads[48].length}`);

// 9,180 is the block total and the non-0xFF count is 9,179 (one 0xFF inside a block); both
// are right and both are asserted.
// why: lessons/kit-circuit-session.md#test-9180
{
  let ff = 0, high = 0, highNotFf = 0;
  for (const b of r0.blocks) {
    for (let i = b.at; i < b.at + b.length; i++) {
      const v = all[0][i];
      if (v === 0xff) ff++;
      if (v > 0x7f) high++;
      if (v > 0x7f && v !== 0xff) highNotFf++;
    }
  }
  ok('the blocks hold 9,180 bytes of which 9,179 are not 0xFF, one 0xFF sitting inside one',
    9180 - ff === c0.notErased && ff === 1, `${9180 - ff} not erased, ${ff} 0xFF inside a block`);
  ok('and 2 of them are above 0x7F, so the payload is seven bit',
    highNotFf === 2 && high === 3, `${highNotFf} above 0x7F, ${high} counting the 0xFF`);
}
// Over the whole file the count is 44,071 and it measures the erasure: the denominator lesson.
// why: lessons/kit-circuit-session.md#test-whole-file
ok('over the whole file 44,071 bytes are above 0x7F, and that number measures the erasure',
  c0.highBytes === 44071, `${c0.highBytes}`);

// The 49 block map is true of `session_0` and 21 of 32, not all: a finding, not a tuning.
// why: lessons/kit-circuit-session.md#test-49-blocks
{
  const counts = all.map((u) => S.runs(u).blocks.length);
  ok('the 49 block map holds for 21 of the 32 and runs to 332 in the busiest',
    counts.filter((n) => n === 49).length === 21 && Math.max(...counts) === 332,
    `${counts.filter((n) => n === 49).length} of 32, max ${Math.max(...counts)}`);
}

// ------------------------------------------------- the grid across all 32

console.log('\n-- and the grid, which does hold for all 32 --');

const SESS = all.map(S.readSession);
ok('every one parses into the same fifty regions at the same offsets',
  SESS.every((s) => s.slots.length === 50 && s.slots.every((x, i) => x.at === S.SLOTS[i].at && x.size === S.SLOTS[i].size)));
ok('the header region is 76 bytes of data with no erasure in any of the 32',
  SESS.every((s) => s.slots[0].used === 76 && s.slots[0].pad === 0));
ok('the final region carries 848 bytes in all 32 and the remaining 5,156 are erasure',
  SESS.every((s) => s.slots[49].used === 848 && s.slots[49].pad === 5156));
ok('so the erasure that ends every file starts at 48,092',
  SESS.every((s, n) => all[n].subarray(48092).every((b) => b === 0xff)) && S.TAIL_AT + 848 === 48092);
ok('no synth region ever fills, and the drum regions run 32 to 720',
  SESS.every((s) => s.slots.slice(1, 17).every((x) => x.used >= 452 && x.used < 1508))
  && Math.min(...SESS.flatMap((s) => s.slots.slice(17, 49).map((x) => x.used))) === 32
  && Math.max(...SESS.flatMap((s) => s.slots.slice(17, 49).map((x) => x.used))) === 720,
  `synth ${Math.max(...SESS.flatMap((s) => s.slots.slice(1, 17).map((x) => x.used)))} at most`);

// An independent derivation: offsets where data begins in all 32, and their gaps.
// why: lessons/kit-circuit-session.md#test-pooled
{
  const always = [];
  for (let i = 1; i < 53248; i++) {
    if (all.every((u) => u[i] !== 0xff && u[i - 1] === 0xff)) always.push(i);
  }
  const gaps = [...new Set(always.slice(1).map((x, k) => x - always[k]))].sort((a, b) => a - b);
  ok('30 offsets begin data in all 32, first 1584 and last 47,244',
    always.length === 30 && always[0] === 1584 && always[always.length - 1] === S.TAIL_AT,
    `${always.length} offsets`);
  ok('and every gap between them is 1508 or a whole multiple of 720',
    gaps.every((g) => g === 1508 || g % 720 === 0), JSON.stringify(gaps));
}

// ---------------------------------------------------------- the round trip

console.log('\n-- the round trip, which is the deliverable --');

{
  let same = 0;
  const outs = [];
  for (let n = 0; n < all.length; n++) {
    const out = S.rebuild(SESS[n]);
    outs.push(out);
    if (await S.fingerprint(out) === await S.fingerprint(all[n])) same++;
  }
  ok('all 32 rebuild to a file with the same SHA-256 as the one that went in',
    same === 32, `${same} of 32`);
  ok('and to the same length, checked apart because a digest can only say yes or no',
    outs.every((o, n) => o.length === all[n].length));

  // Model, not copy: scribble over the original buffer, then rebuild.
  // why: lessons/kit-circuit-session.md#test-model
  const scratch = all[0].slice();
  const parsed = S.readSession(scratch);
  scratch.fill(0x5a, 0, 4096);
  const after = S.rebuild(parsed);
  ok('rebuilding after the source buffer is overwritten still gives the original file',
    await S.fingerprint(after) === await S.fingerprint(all[0]),
    'so nothing in rebuild reads the buffer it parsed');
  ok('and the scribble really landed, so that check is not passing by accident',
    scratch[0] === 0x5a && all[0][0] !== 0x5a);
}

// -------------------------------------------------------------- the header

console.log('\n-- the header, corroborated against a second source --');

ok('the four byte tag splits 22 USER, 7 DEMO and 3 INIT, the same as the patch module reads',
  JSON.stringify(tally(SESS.map((s) => s.header.tag))) === JSON.stringify({ USER: 22, DEMO: 7, INIT: 3 }),
  JSON.stringify(tally(SESS.map((s) => s.header.tag))));
// The name in the bytes against the name Components wrote in `index.json`.
// why: lessons/kit-circuit-session.md#test-name
{
  const agree = SESS.filter((s, n) => s.header.name === meta.sessions[n].name).length;
  ok('the 32 byte name field agrees with index.json in 32 of 32',
    agree === 32, `${agree} of 32, ${JSON.stringify(SESS[3].header.name)} and ${JSON.stringify(SESS[17].header.name)}`);
  ok('and it is printable ascii in all 32, space padded',
    SESS.every((s) => printable(s.header.rawName)));
}
ok('offset 4 is DC BB in all 32', SESS.every((s) => s.header.magicOk));

// Measured: byte 48 is 69 to 158 (120 in 23), byte 49 is 50 to 60 (50 in 25). Inferred, not
// confirmed: tempo and swing, each mode being the Circuit's default.
// why: lessons/kit-circuit-session.md#test-tempo
{
  const b48 = all.map((u) => u[48]), b49 = all.map((u) => u[49]);
  ok('MEASURED: byte 48 runs 69 to 158 with 120 in 23 of 32, byte 49 runs 50 to 60 with 50 in 25',
    Math.min(...b48) === 69 && Math.max(...b48) === 158 && tally(b48)[120] === 23
    && Math.min(...b49) === 50 && Math.max(...b49) === 60 && tally(b49)[50] === 25,
    'tempo and swing is INFERRED from those ranges and is not confirmed');
}

// ------------------------------------------------- the patches in the tail

console.log('\n-- two synth patches live in the final region --');

const PAY = SESS.map(S.patchPayloads);
ok('two payloads per session, 340 bytes each, 340 apart, at 47,300 and 47,640',
  PAY.every((p) => p.length === 2 && p.every((x) => x.data.length === 340))
  && PAY[0][0].at === 47300 && PAY[0][1].at === 47640,
  `${PAY[0][0].at} and ${PAY[0][1].at}`);
ok('every one of the 64 names is printable ascii and none is empty',
  PAY.flat().every((p) => printable(p.rawName) && p.name.length > 0),
  `${JSON.stringify(PAY[0].map((p) => p.name))}`);
// Addresses 18 to 31 zero and no byte above 0x7F, as for the `.syx` payloads.
// why: lessons/kit-circuit-session.md#test-reserved
ok('all 64 have addresses 18 to 31 zero, the same reserved block a .syx has',
  PAY.flat().every((p) => [...p.data.subarray(18, 32)].every((b) => b === 0)));
ok('and not one byte of the 21,760 is above 0x7F',
  PAY.flat().every((p) => p.data.every((b) => b <= 0x7f)),
  `${PAY.flat().length * 340} bytes`);
// Ten are byte identical to a patch file in the same pack.
// why: lessons/kit-circuit-session.md#test-identical
{
  const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const exact = PAY.flat().filter((p) => PATCHES.some((q) => eq([...q.data], [...p.data]))).length;
  const byName = PAY.flat().filter((p) => PATCHES.some((q) => q.name === p.name)).length;
  ok('10 of the 64 are byte identical to a patches/patch_*.syx payload in the same pack',
    exact === 10, `${exact} identical, ${byName} share a name`);
  ok('and 53 of 64 share a name with one, so the rest are edits that were never saved back',
    byName === 53, `${byName}`);
}

// ------------------------------------- two implementations of the same census

// ------------------------------------------- what the pack actually holds

console.log('\n-- 29 sessions of work and 3 stock slots, from this pack alone --');

// Distinct fingerprints do not prove real work: one byte makes a distinct hash. The three INIT
// slots differ by one byte from each other, the closest of the other 29 by 415.
// why: lessons/kit-circuit-session.md#test-init
{
  const apart = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
  const init = all.map((u, i) => ({ i, u })).filter(({ i }) => SESS[i].header.tag === 'INIT');
  const rest = all.map((u, i) => ({ i, u })).filter(({ i }) => SESS[i].header.tag !== 'INIT');

  ok('the three INIT slots are 10, 16 and 22, and index.json names all three Initial Session',
    init.map(({ i }) => i).join() === '10,16,22'
    && init.every(({ i }) => meta.sessions[i].name === 'Initial Session'),
    init.map(({ i }) => i).join());

  const pairs = [];
  for (let x = 0; x < init.length; x++) for (let y = x + 1; y < init.length; y++) {
    pairs.push(apart(init[x].u, init[y].u));
  }
  ok('and all three pairs differ in exactly one byte, so they are one stock image',
    pairs.length === 3 && pairs.every((n) => n === 1), `${pairs.join(', ')} bytes apart`);

  // The floor that makes one byte small by comparison.
  // why: lessons/kit-circuit-session.md#test-closest
  let closest = Infinity;
  for (let x = 0; x < rest.length; x++) for (let y = x + 1; y < rest.length; y++) {
    closest = Math.min(closest, apart(rest[x].u, rest[y].u));
  }
  let reach = Infinity;
  for (const a of init) for (const b of rest) reach = Math.min(reach, apart(a.u, b.u));
  ok('while the closest pair among the other 29 is 415 bytes apart, and no INIT comes within 262 of one',
    closest === 415 && reach === 262, `${closest} and ${reach}`);

  // The correction is 32 to 29, and the pack is still the only backup of those 29.
  // why: lessons/kit-circuit-session.md#test-29
  ok('so the pack holds 29 sessions of work and 3 stock slots, and is still the only backup',
    rest.length === 29 && init.length === 3, `${rest.length} and ${init.length}`);
}

console.log('\n-- against circuit-patch.mjs, written on the same day by another hand --');
{
  let agree = 0;
  for (let n = 0; n < all.length; n++) {
    const a = S.census(all[n]);
    const b = await C.sessionStats(all[n]);
    if (a.entropy.toFixed(12) === b.entropy.toFixed(12) && a.notErased === b.notErased
      && a.payload === b.payload && a.length === b.bytes) agree++;
  }
  ok('the two census implementations agree on entropy, notErased and payload for all 32',
    agree === 32, `${agree} of 32`);
}

// --------------------------------------------------- the degenerate case

console.log('\n-- the purchased blanks, which are a session file and not a session --');

let blanks = [];
if (!fs.existsSync(BOUGHT)) {
  note('the purchased soundbank is not on this machine, so the degenerate case is unmeasured');
} else {
  const outer = readZip(fs.readFileSync(BOUGHT));
  for (const pk of outer.filter((e) => e.name.endsWith('.circuitpack'))) {
    const inner = readZip(await pk.read());
    for (const e of inner.filter((x) => x.name.endsWith('.circuitsession'))) blanks.push(await e.read());
  }
  ok('64 of them, every one 53,248 bytes, so the grid applies',
    blanks.length === 64 && blanks.every((b) => b.length === 53248), `${blanks.length}`);
  // Blanks are padded with 0x00, not 0xFF: 36 non-zero bytes, the tag and 32 spaces.
  // why: lessons/kit-circuit-session.md#test-blanks
  ok('not one 0xFF byte anywhere in any of them, and exactly 36 non-zero bytes each',
    blanks.every((b) => !b.some((x) => x === 0xff))
    && blanks.every((b) => [...b].filter((x) => x).length === 36));
  ok('those 36 are the tag at 0 and 32 spaces at 16, which is the header this module reads',
    blanks.every((b) => {
      const s = S.readSession(b);
      return s.header.tag === 'INIT' && s.header.rawName === ' '.repeat(32);
    }));
  // `DC BB` at offset 4 separates the packs over 96 files, where the four byte tag does not.
  // why: lessons/kit-circuit-session.md#test-dcbb
  ok('DC BB at offset 4 is in all 32 of the owner\'s and in none of the 64 blanks',
    SESS.every((s) => s.header.magicOk) && blanks.every((b) => !S.readSession(b).header.magicOk));
  let rt = 0;
  for (const b of blanks) if (await S.fingerprint(S.rebuild(S.readSession(b))) === await S.fingerprint(b)) rt++;
  ok('and all 64 round trip too, with every region reading as data and no erasure at all',
    rt === 64 && S.readSession(blanks[0]).slots.every((s) => s.pad === 0), `${rt} of 64`);
}

// -------------------------------------------------------- negative controls

console.log('\n-- the negative controls, and what stays green under each --');

// The battery. Eleven structural claims, all true of a real session. Each
// sabotage below runs it and the number that goes red is the measurement.
function battery(u8) {
  const out = [];
  const add = (name, fn) => { try { out.push({ name, ok: !!fn() }); } catch (e) { out.push({ name, ok: false, why: e.message }); } };
  add('it is 53,248 bytes', () => u8.length === S.SESSION_BYTES);
  add('the grid covers every byte', () => {
    const s = S.readSession(u8);
    return s.slots.reduce((n, x) => n + x.size, 0) === u8.length;
  });
  add('the tag is one the pack uses', () => S.readSession(u8).header.known);
  add('offset 4 is DC BB', () => S.readSession(u8).header.magicOk);
  add('the name field is printable ascii', () => printable(S.readSession(u8).header.rawName));
  add('the final region carries 848 bytes', () => S.readSession(u8).slots[49].used === 848);
  // The length guard matters: `every` over an empty array is true on a truncated file.
  // why: lessons/kit-circuit-session.md#test-guard
  add('the erasure ending the file starts at 48,092',
    () => u8.length > 48092 && u8.subarray(48092).every((b) => b === 0xff));
  add('two payloads, both named in printable ascii', () => {
    const p = S.patchPayloads(S.readSession(u8));
    return p.length === 2 && p.every((x) => printable(x.rawName) && x.name.length > 0);
  });
  add('neither payload has a byte above 0x7F', () => {
    return S.patchPayloads(S.readSession(u8)).every((p) => p.data.every((b) => b <= 0x7f));
  });
  add('four fifths of the file is erasure', () => S.census(u8).erased / u8.length > 0.8);
  add('the rebuild is byte identical', () => S.compare(S.rebuild(S.readSession(u8)), u8).same);
  return out;
}
const reds = (u8) => battery(u8).filter((c) => !c.ok);
const N = battery(all[0]).length;

ok(`a real session passes all ${N} of the battery`, reds(all[0]).length === 0,
  reds(all[0]).map((c) => c.name).join('; ') || 'nothing red');

// Sabotage 1: truncated. 9 of 11 red; the two survivors are true of the truncated file.
// why: lessons/kit-circuit-session.md#test-sabotage-1
{
  const cut = all[0].slice(0, 53248 - 1024);
  const r = reds(cut);
  const alive = battery(cut).filter((c) => c.ok).map((c) => c.name);
  ok(`truncating 1,024 bytes takes ${r.length} of ${N} red, and the reader refuses it by name`,
    r.length === 9 && alive.length === 2
    && alive.every((n) => n.includes('four fifths') || n.includes('48,092'))
    && threw(() => S.readSession(cut)).includes('52224'),
    `${threw(() => S.readSession(cut))}, still green: ${alive.join('; ')}`);
}

// Sabotage 2: the 0xFF runs removed, in two readings that take different things red.
// why: lessons/kit-circuit-session.md#test-sabotage-2
{
  const stripped = Uint8Array.from([...all[0]].filter((b) => b !== 0xff));
  const r1 = reds(stripped);
  ok(`deleting every 0xFF leaves 9,179 bytes and takes ${r1.length} of ${N} red`,
    stripped.length === 9179 && r1.length === N, `${stripped.length} bytes`);

  const flattened = all[0].slice();
  for (let i = 0; i < flattened.length; i++) if (flattened[i] === 0xff) flattened[i] = 0x00;
  const r2 = reds(flattened);
  // Replacing the erasure leaves the round trip green: the limit of what a round trip proves.
  // why: lessons/kit-circuit-session.md#test-erasure-replaced
  ok(`replacing every 0xFF with 0x00 takes ${r2.length} of ${N} red and leaves the round trip GREEN`,
    r2.length === 3 && !r2.some((c) => c.name.includes('rebuild')),
    r2.map((c) => c.name).join('; '));
}

// Sabotage 3: a block mutated, in the model (grades the writer) then the file (the battery).
// why: lessons/kit-circuit-session.md#test-sabotage-3
{
  const s = S.readSession(all[0]);
  const target = s.slots[20];                 // a drum region, 32 bytes of data
  const at = target.at + 7;
  s.slots[20].data[7] ^= 0xff;
  const d = S.compare(S.rebuild(s), all[0]);
  ok('changing one byte of one parsed region moves exactly one byte of the output, at that offset',
    !d.same && d.count === 1 && d.first === at, `one byte differs, at ${d.first}, expected ${at}`);

  const f = all[0].slice();
  f[47300 + 3] = 0x01;                        // inside the first patch payload's name
  const r = reds(f);
  ok(`corrupting a byte of an embedded patch name takes ${r.length} of ${N} red`,
    r.length === 1 && r[0].name.includes('printable'), r.map((c) => c.name).join('; '));
}

// Sabotage 4: the writer broken four ways, each a different file.
// why: lessons/kit-circuit-session.md#test-sabotage-4
{
  const fresh = () => S.readSession(all[0]);
  const shapes = [];

  // A region moved: the pair is chosen by looking and asserted different first, since most
  // narrow regions are identical zeros.
  // why: lessons/kit-circuit-session.md#test-region-moved
  {
    const s = fresh();
    const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
    let i = 17;
    while (i < 48 && eq(s.slots[i].data, s.slots[i + 1].data)) i++;
    const a = s.slots[i], b = s.slots[i + 1];
    ok('two drum regions that really differ were found to swap',
      i < 48 && !eq(a.data, b.data), `regions ${i} and ${i + 1} at ${a.at} and ${b.at}`);
    let k = 0;
    while (a.data[k] === b.data[k]) k++;
    s.slots[i] = b; s.slots[i + 1] = a;
    shapes.push(['two drum regions swapped', S.compare(S.rebuild(s), all[0]), a.at + k]);
  }
  // a pad length wrong by one
  {
    const s = fresh();
    const t = s.slots[20];
    t.pad -= 1;
    shapes.push(['one pad a byte short', S.compare(S.rebuild(s), all[0]), t.at + t.size - 1]);
  }
  // the pad filled with the wrong byte, done by moving it into the data
  {
    const s = fresh();
    const t = s.slots[49];
    t.data = new Uint8Array(t.size); t.data.set(S.readSession(all[0]).slots[49].data); t.pad = 0;
    shapes.push(['the final pad written as 0x00 instead of erasure', S.compare(S.rebuild(s), all[0]), 48092]);
  }
  // a region size misread
  {
    const s = fresh();
    s.slots[1].data = s.slots[1].data.slice(0, 451); s.slots[1].pad += 1;
    shapes.push(['a region read one byte short', S.compare(S.rebuild(s), all[0]), 76 + 451]);
  }

  for (const [what, d, where] of shapes) {
    ok(`${what} comes out as a different file, first differing at ${where}`,
      !d.same && d.first === where, `first differs at ${d.first}, ${d.count} bytes apart`);
  }

  // Control on the controls: an untouched model still rebuilds identically.
  // why: lessons/kit-circuit-session.md#test-sabotage-control
  ok('while an untouched model still rebuilds identically, so the sabotages are the difference',
    S.compare(S.rebuild(fresh()), all[0]).same);
}

// ------------------------------------------------------------- the absence

console.log('\n-- what this module must not be able to do --');

// The export test, the same one `circuit-patch-test.mjs` runs.
// why: lessons/kit-circuit-session.md#test-exports
{
  const makers = Object.keys(S).filter((k) => /write|send|encode|emit|sysex|bytes/i.test(k)
    && typeof S[k] === 'function');
  ok('no exported function is named for making or sending a message', makers.length === 0,
    makers.join() || `none of ${Object.keys(S).length} exports`);
}
// The source test: a name test cannot see a call inside a function.
// why: lessons/kit-circuit-session.md#test-source
{
  const src = fs.readFileSync(path.join(HERE, 'circuit-session.mjs'), 'utf8');
  // Comments are stripped first: the module's prose names the calls it promises not to make.
  // why: lessons/kit-circuit-session.md#test-strip
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  ok('the comment stripper left the code behind, which is what makes the next check worth reading',
    code.includes('export function rebuild') && !code.includes('NOTHING HERE SENDS'),
    `${src.length} characters down to ${code.length}`);
  const banned = ['requestMIDIAccess', 'MIDIAccess', 'MIDIOutput', 'midiOut', 'navigator.',
    'XMLHttpRequest', 'WebSocket', 'fetch(', '.send('];
  const found = banned.filter((b) => code.includes(b));
  ok('and the code contains no MIDI, no port, no socket and no fetch',
    found.length === 0, found.join() || `${banned.length} patterns, none present`);
  ok('the file does say so in its own header, so the next reader is told rather than left to notice',
    src.includes('NOTHING HERE SENDS ANYTHING ANYWHERE'));
}


// Note data, graded against the real pack and against the blanks.
// why: lessons/kit-circuit-session.md#test-notes
if (fs.existsSync(PACK)) {
  const notes = all.map((b) => S.notesIn(b));
  const total = notes.reduce((n, x) => n + x.length, 0);
  ok('5,095 note events come out of the owner\'s 32 sessions',
    total === 5095, `${total} events`);

  // The control: blanks pass shape tests by being zero; the yield cannot be faked by emptiness.
  // why: lessons/kit-circuit-session.md#test-yield
  ok('and ZERO come out of all 64 purchased blanks, which is what the shape tests cannot tell you',
    blanks.length === 64 && blanks.every((b) => S.notesIn(b).length === 0),
    `${blanks.length} blank sessions, ${blanks.reduce((n, b) => n + S.notesIn(b).length, 0)} events`);

  const zero = notes.map((x, i) => (x.length ? null : i)).filter((i) => i !== null);
  ok('the three sessions with no notes are 10, 16 and 22, which is a THIRD road to the same three files',
    zero.join(',') === '10,16,22',
    `${zero.join(', ')} · CLAUDE.md reached them by distance from a template and index.json names all three Initial Session`);

  const first = notes[0][0];
  ok('session_0\'s first event is note 55 at gate 2 and velocity 41, in region 0 step 0 slot 0',
    first.note === 55 && first.gate === 2 && first.velocity === 41
    && first.region === 0 && first.step === 0 && first.slot === 0 && first.at === 80,
    JSON.stringify(first));

  const flat = notes.flat();
  ok('no velocity is above 127, in 5,095 of 5,095',
    flat.every((e) => e.velocity <= 127),
    `${flat.filter((e) => e.velocity > 127).length} above it`);
  // 105 note bytes above 127, unexplained and not clamped.
  // why: lessons/kit-circuit-session.md#test-above-127
  ok('105 note bytes ARE above 127, all in one session, and that is unexplained rather than hidden',
    flat.filter((e) => e.note > 127).length === 105
    && new Set(flat.filter((e) => e.note > 127).map((e, i) => notes.findIndex((x) => x.includes(flat.filter((y) => y.note > 127)[0])))).size === 1,
    `${flat.filter((e) => e.note > 127).length} of ${flat.length}`);

  ok('every step record has its two zero bytes and no high bit in its mask, in all 32',
    all.every((b) => S.stepGridLooksRight(b).share === 1),
    `${all.filter((b) => S.stepGridLooksRight(b).share === 1).length} of ${all.length} sessions at 256 of 256 records`);

  // The velocity mode, with a second source on this disk.
  // why: lessons/kit-circuit-session.md#test-velocity
  const heads = new Map();
  for (const b of all) { const k = b[S.VELOCITY_AT]; heads.set(k, (heads.get(k) || 0) + 1); }
  ok('header byte 8 is a THIRD byte separating the two packs: FF 24 and 07 8 here, 00 on all 64 blanks',
    heads.get(0xff) === 24 && heads.get(0x07) === 8 && heads.size === 2
    && blanks.every((b) => b[S.VELOCITY_AT] === 0x00),
    [...heads].map(([k, v]) => `0x${k.toString(16)} x${v}`).join(', '));

  // Sabotages: each must move exactly what it should.
  // why: lessons/kit-circuit-session.md#test-note-sabotages
  const cut = all[0].slice();
  cut[80] = (cut[80] + 7) & 0x7f;
  ok('SABOTAGE: moving one note byte moves exactly that one event and nothing else',
    S.notesIn(cut).length === notes[0].length
    && S.notesIn(cut)[0].note === ((first.note + 7) & 0x7f)
    && S.notesIn(cut).slice(1).every((e, i) => e.note === notes[0][i + 1].note),
    `${S.notesIn(cut)[0].note} against ${first.note}, with ${S.notesIn(cut).length} events either way`);

  const masked = all[0].slice();
  for (let st = 0; st < S.STEPS; st++) masked[S.HEADER_LEN + st * S.STEP_LEN] = 0;
  ok('SABOTAGE: zeroing one region\'s sixteen masks removes only that region\'s events',
    S.notesIn(masked).length < notes[0].length
    && S.notesIn(masked).every((e) => e.region !== 0)
    && notes[0].filter((e) => e.region !== 0).length === S.notesIn(masked).length,
    `${notes[0].length} down to ${S.notesIn(masked).length}`);

  // A blank with one hand written record must read back exactly that. Guarded: the soundbank
  // is optional and an unguarded `blanks[0]` turned a skip into a TypeError.
  // why: lessons/kit-circuit-session.md#test-planted
  if (!blanks.length) note('the purchased soundbank is not here, so the planted record is unmeasured');
  const planted = blanks.length ? blanks[0].slice() : new Uint8Array(S.SESSION_BYTES);
  const at = S.HEADER_LEN;
  planted[at] = 0b11;
  planted[at + 4] = 60; planted[at + 5] = 3; planted[at + 7] = 100;
  planted[at + 8] = 64; planted[at + 9] = 3; planted[at + 11] = 90;
  const got = S.notesIn(planted);
  ok('NEGATIVE CONTROL: one planted record in a blank reads back the two notes written into it',
    got.length === 2 && got[0].note === 60 && got[1].note === 64
    && got[0].gate === 3 && got[0].velocity === 100 && got[1].velocity === 90,
    got.map((e) => `${e.note}@${e.velocity}`).join(' '));
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}${skip ? `  ${skip} skipped` : ''}\n`);
process.exit(fail ? 1 : 0);
