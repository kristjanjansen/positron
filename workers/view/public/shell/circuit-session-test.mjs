// demo/shell/circuit-session-test.mjs
// The session container, against the real pack, with no browser.
//
//   node demo/shell/circuit-session-test.mjs
//
// 🔴 IT IS GRADED AGAINST AN IMPLEMENTATION THAT NO LONGER EXISTS, WHICH IS THE
// ONLY GRADING WORTH HAVING HERE. Every figure in the first section was measured
// in Python on a different day and published in
// `research/circuit-session-format-2026-09-21.md` §1 before this module existed,
// so reproducing one is two independent implementations agreeing about one real
// artefact. Where they DISAGREE the disagreement is kept and named rather than
// tuned away, and there is one of those: the 49 block map is true of `session_0`
// and of 21 of the 32 sessions, not of all of them.
//
// 🔴 AND THE ROUND TRIP IS THE DELIVERABLE, SO IT IS SABOTAGED FOUR WAYS. A
// `rebuild()` written as `return bytes` passes a round trip trivially and proves
// nothing, so this file breaks the writer on purpose and counts what goes red.
// One of those sabotages leaves the round trip GREEN, which is the honest answer
// to what it can and cannot prove, and it is reported rather than hidden.
//
// 🔴 AND IT READS `New Pack.circuitpack`, SOMEBODY'S ONLY BACKUP OF A DEVICE
// WITH NO FACTORY RESET. Reading is free and nothing here writes, sends or
// touches a port.
import fs from 'node:fs';
import path from 'node:path';
import { readZip, entry } from './unzip.mjs';
import * as S from './circuit-session.mjs';
import * as C from './circuit-patch.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const PACK = path.join(HERE, '../../New Pack.circuitpack');
const BOUGHT = path.join(HERE, '../../purchased/Synth-Patches.com - Soundbank for Novation Circuit and Tracks.zip');

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
  console.log('  New Pack.circuitpack is not here, so there is nothing to read.');
  process.exit(0);
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
// 🔴 THE TWO ARITHMETIC FACTS THE 76 RESTS ON. 528 less 452 is 76, and 76 plus
// sixteen strides of 1508 lands exactly on the offset where the 720 stride
// begins. If either were off by one the grid would not close on 53,248.
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

// 🔴 THE FIGURE THAT LOOKED LIKE A DISAGREEMENT AND IS TWO DEFINITIONS OF ONE
// WORD, WHICH IS THE SAME SHAPE AS THE `slot 15` ONE IN `circuit-patch-test.mjs`.
// The research says "of the 9,180 non-0xFF bytes, 2 are above 0x7F". 9,180 is
// the BLOCK TOTAL and the non-0xFF count is 9,179, because exactly one 0xFF byte
// sits inside a block in a run too short to be padding. Both numbers are right
// and they are not the same number, so both are asserted here.
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
// ⚠️ THE CORRECTION THE RESEARCH OPENS WITH, REPRODUCED, BECAUSE IT IS THE
// DENOMINATOR LESSON AND NOT A DETAIL. Over the whole file the same count is
// 44,071 and it measures the erasure.
ok('over the whole file 44,071 bytes are above 0x7F, and that number measures the erasure',
  c0.highBytes === 44071, `${c0.highBytes}`);

// 🔴 THE ONE PUBLISHED FIGURE THAT DOES NOT HOLD FOR ALL 32, AND IT IS A FINDING
// RATHER THAN SOMETHING TO TUNE. The 49 block map is presented under a heading
// about the container. It is a description of ONE file.
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

// 🔴 AN INDEPENDENT DERIVATION OF THE SAME STRIDES, POOLED OVER ALL 32 RATHER
// THAN READ OFF ONE FILE. Take every offset where a run of 0xFF ends and data
// begins, keep only the offsets where that is true in ALL 32, and look at the
// gaps. If the grid were an artefact of `session_0` this would disagree.
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

  // 🔴 THE PROOF THAT IT IS A MODEL AND NOT A COPY. Parse, then scribble over
  // the ORIGINAL buffer, then rebuild. If `rebuild` read the buffer at all the
  // output would carry the scribble. It does not, because the model holds
  // copies.
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
// ✅ TWO INDEPENDENT SOURCES, WHICH IS THE ONLY REASON THIS ONE IS A FACT AND
// NOT A READING. The name in the bytes was decoded here; the name in
// `index.json` was written by Novation Components. They can disagree.
{
  const agree = SESS.filter((s, n) => s.header.name === meta.sessions[n].name).length;
  ok('the 32 byte name field agrees with index.json in 32 of 32',
    agree === 32, `${agree} of 32, ${JSON.stringify(SESS[3].header.name)} and ${JSON.stringify(SESS[17].header.name)}`);
  ok('and it is printable ascii in all 32, space padded',
    SESS.every((s) => printable(s.header.rawName)));
}
ok('offset 4 is DC BB in all 32', SESS.every((s) => s.header.magicOk));

// ⚖️ INFERRED AND SAID TO BE, IN THE SAME BREATH AS THE MEASUREMENT. What is
// MEASURED is that byte 48 takes ten values across the 32 sessions, all between
// 69 and 158, with 120 in 23 of them, and byte 49 takes seven values between 50
// and 60 with 50 in 25. What is INFERRED is that these are the tempo and the
// swing: the Circuit's tempo runs 40 to 240 with 120 as its default and its
// swing runs 20 to 80 with 50 as its default, both readings fit every value, and
// the mode of each is its default. NOTHING CONFIRMS IT. The experiment that
// would is one export, one tempo change on the instrument, a second export and a
// diff, and it needs a person at the Circuit.
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
// 🔴 THE CHECK THAT SAYS THESE REALLY ARE PATCHES AND NOT A COINCIDENCE OF
// ASCII. `circuit-patch-test.mjs` asserts of the 64 `.syx` payloads that
// addresses 18 to 31 are zero and that no byte is above 0x7F. Both hold here
// too, on bytes this module found by arithmetic rather than by looking.
ok('all 64 have addresses 18 to 31 zero, the same reserved block a .syx has',
  PAY.flat().every((p) => [...p.data.subarray(18, 32)].every((b) => b === 0)));
ok('and not one byte of the 21,760 is above 0x7F',
  PAY.flat().every((p) => p.data.every((b) => b <= 0x7f)),
  `${PAY.flat().length * 340} bytes`);
// ✅ AND THE STRONGEST ONE: TEN OF THEM ARE BYTE IDENTICAL TO A PATCH FILE IN
// THE SAME PACK. That is the container model and the patch module agreeing about
// bytes neither of them was pointed at.
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

// 🔴 `CLAUDE.md` SAYS `32 DISTINCT FINGERPRINTS OF 32, NOT ONE A COPY OF
// ANOTHER` AND USES THAT TO SAY ALL 32 ARE REAL WORK. The count is true and the
// conclusion does not follow, because a ONE BYTE delta produces a distinct
// fingerprint. It is the third time this lesson has arrived: a name was not
// evidence, then a four byte head was not evidence, and now a unique hash is not
// evidence either.
// ✅ AND `circuit-patch-test.mjs` SAYS THIS CANNOT BE SETTLED WITHOUT THE STOCK
// TEMPLATE, WHICH IS NOT IN THIS REPOSITORY. IT CAN. Comparing the three INIT
// slots against EACH OTHER needs no template at all, and the separation is
// enormous: one byte between them, 415 bytes between the closest pair of the
// other 29.
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

  // 🔴 THE FLOOR, WHICH IS THE HALF THAT MAKES ONE BYTE MEAN ANYTHING. Without
  // it, "one byte apart" is a number with nothing to be small compared to.
  let closest = Infinity;
  for (let x = 0; x < rest.length; x++) for (let y = x + 1; y < rest.length; y++) {
    closest = Math.min(closest, apart(rest[x].u, rest[y].u));
  }
  let reach = Infinity;
  for (const a of init) for (const b of rest) reach = Math.min(reach, apart(a.u, b.u));
  ok('while the closest pair among the other 29 is 415 bytes apart, and no INIT comes within 262 of one',
    closest === 415 && reach === 262, `${closest} and ${reach}`);

  // 🔴 AND THE CONCLUSION THAT MUST TRAVEL WITH IT. The correction is 32 to 29.
  // It is not `some of these are disposable`. The owner said `user sessions are
  // mine. very important` and this pack is still the only backup of 29 of them.
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
  // 🔴 AND THEY ARE PADDED WITH 0x00, NOT 0xFF, WHICH IS A FACT THE MODEL HAS TO
  // SURVIVE RATHER THAN ASSUME. A blank holds 36 non-zero bytes: the four byte
  // tag and 32 spaces where the name goes. Nothing else.
  ok('not one 0xFF byte anywhere in any of them, and exactly 36 non-zero bytes each',
    blanks.every((b) => !b.some((x) => x === 0xff))
    && blanks.every((b) => [...b].filter((x) => x).length === 36));
  ok('those 36 are the tag at 0 and 32 spaces at 16, which is the header this module reads',
    blanks.every((b) => {
      const s = S.readSession(b);
      return s.header.tag === 'INIT' && s.header.rawName === ' '.repeat(32);
    }));
  // 🔴 A NEW DISCRIMINATOR, AND IT IS STRONGER THAN THE ONE THAT WAS PUBLISHED.
  // `CLAUDE.md` and the research both offered the first four bytes, and
  // `circuit-patch-test.mjs` already corrected that: INIT is on both sides.
  // DC BB at offset 4 is on one side only, measured over 96 files.
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
  // ⚠️ THE LENGTH GUARD IS NOT DECORATION. Without it this check reads GREEN on
  // a truncated file, because `every` over an empty array is true. It was
  // written without the guard, the truncation sabotage took 9 red instead of 10,
  // and the missing one was this.
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

// 🔴 SABOTAGE 1: A TRUNCATED FILE.
// ⚠️ IT TAKES 9 OF 11 AND NOT 11, AND BOTH SURVIVORS ARE CORRECT TO SURVIVE,
// WHICH IS WHY THEY ARE NAMED HERE RATHER THAN QUIETLY COUNTED. The 1,024 bytes
// cut off the end were erasure, so the erasure still starts at 48,092 and four
// fifths of what is left is still erasure. Both statements are true of the
// truncated file. A check that went red on either would be measuring the length
// and calling it a share.
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

// 🔴 SABOTAGE 2: THE 0xFF RUNS REMOVED. Two readings of "removed" and both are
// worth doing, because they take different things red.
{
  const stripped = Uint8Array.from([...all[0]].filter((b) => b !== 0xff));
  const r1 = reds(stripped);
  ok(`deleting every 0xFF leaves 9,179 bytes and takes ${r1.length} of ${N} red`,
    stripped.length === 9179 && r1.length === N, `${stripped.length} bytes`);

  const flattened = all[0].slice();
  for (let i = 0; i < flattened.length; i++) if (flattened[i] === 0xff) flattened[i] = 0x00;
  const r2 = reds(flattened);
  // 🔴 AND THIS IS THE ONE THAT MATTERS. Replacing the erasure rather than
  // deleting it leaves the length, the grid, the header and THE ROUND TRIP
  // green. It is not a hole to fix: any partition that stores data plus a count
  // of regenerated padding rebuilds whatever it is given. It is the boundary of
  // what a round trip can prove, and it is why the structural claims above exist.
  ok(`replacing every 0xFF with 0x00 takes ${r2.length} of ${N} red and leaves the round trip GREEN`,
    r2.length === 3 && !r2.some((c) => c.name.includes('rebuild')),
    r2.map((c) => c.name).join('; '));
}

// 🔴 SABOTAGE 3: A BLOCK MUTATED. First in the model, which is the one that
// grades the writer, then in the file, which grades the battery.
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

// 🔴 SABOTAGE 4: THE WRITER BROKEN FOUR WAYS. Each one is a different thing the
// model could get wrong, and each has to come out as a different file.
{
  const fresh = () => S.readSession(all[0]);
  const shapes = [];

  // 🔴 A REGION MOVED, AND THE FIRST ATTEMPT AT THIS WAS NOT A SABOTAGE AT ALL.
  // It swapped drum regions 20 and 21 and the output came back IDENTICAL, which
  // read as a broken writer and was nothing of the kind: most drum regions in
  // `session_0` hold 32 zero bytes, so swapping two of them changes nothing.
  // The pair is chosen by looking now, and the fact that they differ is asserted
  // before the swap, which is the half that makes the result mean anything.
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

  // 🔴 AND THE CONTROL ON THE CONTROLS. A `rebuild` written as `return bytes`
  // would pass every round trip above and fail every line in this block, so the
  // block is only worth anything if a correct rebuild still passes.
  ok('while an untouched model still rebuilds identically, so the sabotages are the difference',
    S.compare(S.rebuild(fresh()), all[0]).same);
}

// ------------------------------------------------------------- the absence

console.log('\n-- what this module must not be able to do --');

// 🔴 THE EXPORT TEST, THE SAME ONE `circuit-patch-test.mjs` RUNS.
{
  const makers = Object.keys(S).filter((k) => /write|send|encode|emit|sysex|bytes/i.test(k)
    && typeof S[k] === 'function');
  ok('no exported function is named for making or sending a message', makers.length === 0,
    makers.join() || `none of ${Object.keys(S).length} exports`);
}
// 🔴 AND THE SOURCE TEST, BECAUSE A NAME TEST CANNOT SEE A CALL INSIDE A
// FUNCTION. `rebuild()` returns bytes on purpose, so the export test alone would
// not notice a line that handed those bytes to a port.
{
  const src = fs.readFileSync(path.join(HERE, 'circuit-session.mjs'), 'utf8');
  // 🔴 THE COMMENTS COME OUT FIRST, AND THAT IS NOT TIDINESS. Written without
  // this the check went RED on a correct file, because the module's own header
  // says the words `requestMIDIAccess` and `MIDIAccess` in the sentence
  // promising it does not call them. That is `CLAUDE.md`'s
  // `s.includes(<substring>)` rule arriving in a new costume, where `BUILD`
  // matched inside `REBUILD`. A guard that cannot tell code from prose about
  // code is not guarding anything.
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

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}${skip ? `  ${skip} skipped` : ''}\n`);
process.exit(fail ? 1 : 0);
