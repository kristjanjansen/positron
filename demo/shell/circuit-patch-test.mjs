// demo/shell/circuit-patch-test.mjs — the patch decoder, against the real pack.
//
//   node demo/shell/circuit-patch-test.mjs
//
// 🔴 IT IS GRADED AGAINST AN IMPLEMENTATION THAT NO LONGER EXISTS, WHICH IS THE
// ONLY GRADING WORTH HAVING HERE. `research/circuit-soundbank-2026-09-21.md` and
// `plans/plan-circuit-editor.md` published a census of this exact file, computed
// by a decoder that lived in a scratchpad and is gone. Every figure below was
// written down before this module existed, so reproducing one is two independent
// implementations agreeing about one real artefact. That is the `csound.mjs`
// lesson applied in advance: a test comparing a decoder against a number derived
// from the same formula the decoder implements catches a typo and can never
// catch a misreading.
//
// 🔴 AND IT READS `New Pack.circuitpack`, SOMEBODY'S ONLY BACKUP OF A DEVICE
// WITH NO FACTORY RESET. Reading is free and nothing here writes.
import fs from 'node:fs';
import path from 'node:path';
import { readZip, entry } from './unzip.mjs';
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
const median = (a) => {
  const x = [...a].sort((p, q) => p - q);
  return x.length % 2 ? x[(x.length - 1) / 2] : (x[x.length / 2 - 1] + x[x.length / 2]) / 2;
};
const tally = (a) => a.reduce((m, k) => ({ ...m, [k]: (m[k] || 0) + 1 }), {});
const threw = async (fn) => { try { await fn(); return ''; } catch (e) { return e.message; } };

console.log('\n== the Circuit patch decoder ==');

if (!fs.existsSync(PACK)) {
  console.log('  New Pack.circuitpack is not here, so there is nothing to decode.');
  process.exit(0);
}

// ---------------------------------------------------------------- the table

ok('the address table is 340 rows', C.ADDRESSES.length === C.PATCH_DATA, `${C.ADDRESSES.length}`);
ok('and they are addresses 0 to 339 in order with no gaps',
  C.ADDRESSES.every((r, i) => r.a === i));
ok('the two wrapped rows came out as bitfields rather than truncated names',
  !!C.ADDRESSES[91].bits && !!C.ADDRESSES[99].bits
  && C.ADDRESSES[91].bits.length === 5 && !C.ADDRESSES[91].p.includes('('),
  `${C.ADDRESSES[91].p}, ${C.ADDRESSES[91].bits.length} bits`);
ok('a parameter name nobody has throws rather than answering address 0',
  !!(await threw(() => C.addressOf('Filter_Freqency'))));
ok('and the ones the page reads resolve',
  C.addressOf('Patch_Category') === 16 && C.addressOf('Voice_PolyphonyMode') === 32
  && C.addressOf('Osc1_Wave') === 36 && C.addressOf('Filter_Frequency') === 64
  && C.addressOf('MacroKnob8_DepthD') === 339);

// ------------------------------------------------------------------ the pack

const list = readZip(fs.readFileSync(PACK));
const files = list
  .filter((e) => /^patches\/patch_\d+\.syx$/.test(e.name))
  .sort((a, b) => +a.name.match(/\d+/)[0] - +b.name.match(/\d+/)[0]);
const raw = [];
for (const f of files) raw.push(await f.read());
const P = raw.map(C.readPatch);
const S = P.map(C.summarise);

console.log('\n-- the byte census, against plans/plan-circuit-editor.md §2 --');

ok('64 patches and every one is 350 bytes',
  raw.length === 64 && raw.every((b) => b.length === C.PATCH_BYTES), `${raw.length}`);

const varying = [];
for (let i = 0; i < C.PATCH_BYTES; i++) if (new Set(raw.map((b) => b[i])).size > 1) varying.push(i);
ok('offsets 0 to 8 are identical in all 64 and are the documented header',
  varying[0] === 9
  && [...raw[0].slice(0, 9)].join() === [...C.SYSEX_HEAD, 0, 0, 0].join(),
  [...raw[0].slice(0, 9)].map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' '));
ok('the last varying offset is 348 and the final byte is F7',
  varying[varying.length - 1] === 348 && raw.every((b) => b[349] === 0xf7),
  `${varying[varying.length - 1]}`);

const high = raw.reduce((n, b) => n + [...b.slice(9, 349)].filter((x) => x > 0x7f).length, 0);
ok('no data byte is above 0x7F', high === 0, `${high}`);

const printable = (s) => [...s].every((c) => c >= ' ' && c <= '~');
ok('every patch name is printable ascii', P.every((p) => printable(p.rawName)));

// 🔴 324 IS 340 DATA BYTES LESS THE 16 THE NAME TAKES. If the module's DATA_AT
// or NAME_LEN were wrong by one this number moves, which is why it is here
// rather than just the decoded fields.
const paramVary = varying.filter((i) => i >= C.DATA_AT + C.NAME_LEN && i <= 348).length;
ok('246 of the 324 parameter bytes differ between patches', paramVary === 246,
  `${paramVary} of ${349 - (C.DATA_AT + C.NAME_LEN)}`);

console.log('\n-- patch_0, which the plan quotes byte for byte --');

const p0 = P[0];
ok('it is called Aciiid', p0.name === 'Aciiid', JSON.stringify(p0.name));
ok('category 2 and genre 3', p0.category === 2 && p0.genre === 3,
  `${p0.category} / ${p0.genre}`);
ok('the reserved block 18 to 31 is zero in all 64',
  P.every((p) => [...p.data.subarray(18, 32)].every((b) => b === 0)));
// 🔴 THE SAFETY READING, AND IT IS THE FIRST THING TO KNOW ABOUT ANY .syx.
ok('byte 6 is a replace current patch, which lands in RAM',
  p0.command === 0 && p0.commandName === 'replace current patch'
  && p0.writesFlash === false && p0.slotName === 'synth 1',
  `${p0.commandName}, ${p0.slotName}`);
ok('and all 64 in this pack are, so none of them writes flash',
  P.every((p) => !p.writesFlash));

console.log('\n-- the factory bank, against research §4.1 and §4.2 --');

const n = (f) => S.filter(f).length;
ok('37 polyphonic, 22 mono, 5 mono AG',
  n((s) => s.poly === 'poly') === 37 && n((s) => s.poly === 'mono') === 22
  && n((s) => s.poly === 'mono AG') === 5,
  `${n((s) => s.poly === 'poly')} / ${n((s) => s.poly === 'mono')} / ${n((s) => s.poly === 'mono AG')}`);
ok('26 leave the second oscillator silent', n((s) => s.osc2Silent) === 26, `${n((s) => s.osc2Silent)}`);
ok('22 engage the filter drive', n((s) => s.drive) === 22, `${n((s) => s.drive)}`);
ok('9 engage the chorus', n((s) => s.chorus) === 9, `${n((s) => s.chorus)}`);
ok('6 engage the distortion', n((s) => s.distortion) === 6, `${n((s) => s.distortion)}`);
ok('the median amp attack is 2 and the median release is 40',
  median(S.map((s) => s.attack)) === 2 && median(S.map((s) => s.release)) === 40,
  `${median(S.map((s) => s.attack))} / ${median(S.map((s) => s.release))}`);
ok('4 of 64 hold a release above 80', n((s) => s.release > 80) === 4, `${n((s) => s.release > 80)}`);

// ⚠️ "EQ MOVED OFF CENTRE" IS THE RESEARCH'S PHRASE AND IT HAS TWO READINGS.
// The three LEVEL bytes off their default gives 21, which is the published
// figure; counting the frequency bytes too gives 23. The ambiguity was resolved
// by the number matching, so this one assert is weaker evidence than the rest
// and says so rather than being quoted as if it were not.
const eqLevels = P.filter((p) => ['Equaliser_BassLevel', 'Equaliser_MidLevel', 'Equaliser_TrebleLevel']
  .some((k) => p.value(k) !== 64)).length;
ok('21 move an EQ level off centre', eqLevels === 21, `${eqLevels}, and counting frequencies too gives 23`);

const lfo = tally(S.map((s) => s.lfo));
ok('the LFO reach splits 43 none, 13 lfo 1, 7 lfo 2, 1 both',
  lfo.none === 43 && lfo['lfo 1'] === 13 && lfo['lfo 2'] === 7 && lfo.both === 1,
  JSON.stringify(lfo));
ok('so 21 of 64 have an LFO reaching something', n((s) => s.lfo !== 'none') === 21);

const dest = {}, src = {};
for (const p of P) for (const s of C.modSlots(p)) if (s.used) {
  dest[C.MOD_DESTINATIONS[s.destination]] = (dest[C.MOD_DESTINATIONS[s.destination]] || 0) + 1;
  for (const v of [s.source1, s.source2]) if (v !== 0) src[C.MOD_SOURCES[v]] = (src[C.MOD_SOURCES[v]] || 0) + 1;
}
const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
ok('the commonest mod destination is the filter frequency', top(dest)[0] === 'filter frequency', top(dest).join(' '));
ok('and the commonest source that is not direct is velocity, 31 times',
  top(src)[0] === 'velocity' && top(src)[1] === 31, top(src).join(' '));

// 🔴 THE ONE FIGURE THAT LOOKED LIKE A DISAGREEMENT, AND IS NOT.
// Research §4.2 says "the factory bank reaches slot 15". Under `used`, which is
// a depth other than 64, the highest slot this bank reaches is 11. Both are
// right: slot 15 carries a destination somebody set and a depth of 64, so it is
// ADDRESSED and reaches nothing. The two definitions are kept apart here because
// merging them is how a reader gets told an LFO is modulating something when its
// depth is zero.
let hiUsed = 0, hiTouched = 0;
const base = C.addressOf('ModMatrix1_Source1');
for (const p of P) for (let i = 1; i <= C.MOD_SLOTS; i++) {
  const at = base + (i - 1) * 4;
  if (p.data[at + 2] !== C.ZERO_DEPTH) hiUsed = Math.max(hiUsed, i);
  if ([0, 1, 2, 3].some((k) => p.data[at + k] !== C.ADDRESSES[at + k].d)) hiTouched = Math.max(hiTouched, i);
}
ok('the highest slot reaching anything is 11, and the highest slot touched at all is 15',
  hiUsed === 11 && hiTouched === 15, `${hiUsed} and ${hiTouched}`);

console.log('\n-- the sessions, which is the safety check --');

const sessions = list.filter((e) => e.name.endsWith('.circuitsession'));
const stats = [];
for (const e of sessions) stats.push(await C.sessionStats(await e.read()));
const fps = new Set(stats.map((s) => s.fingerprint));
ok('32 sessions and 32 distinct fingerprints', sessions.length === 32 && fps.size === 32,
  `${sessions.length} sessions, ${fps.size} distinct`);
ok('none is flat, and the entropy runs 0.827 to 1.462 bits a byte',
  Math.min(...stats.map((s) => s.entropy)).toFixed(3) === '0.827'
  && Math.max(...stats.map((s) => s.entropy)).toFixed(3) === '1.462');
ok('non-zero runs 84.6 to 89.6 per cent',
  Math.min(...stats.map((s) => s.nonZero)) > 0.845 && Math.max(...stats.map((s) => s.nonZero)) < 0.896,
  `${(Math.min(...stats.map((s) => s.nonZero)) * 100).toFixed(2)} to ${(Math.max(...stats.map((s) => s.nonZero)) * 100).toFixed(2)}`);
ok('every session file is 53,248 bytes', stats.every((s) => s.bytes === 53248));
ok('session_0 has 9,179 bytes that are not erasure and 2,238 that are neither erasure nor zero',
  stats[0].notErased === 9179 && stats[0].payload === 2238,
  `${stats[0].notErased} / ${stats[0].payload}`);

// 🔴 THE CORRECTION. `CLAUDE.md`, `plans/plan-pack-page.md` §2.1 and
// `research/circuit-soundbank-2026-09-21.md` all published the first four bytes
// as a discriminator: `INIT` for a blank against the owner's `DEMO`. This file
// says otherwise and it is the file.
const heads = tally(stats.map((s) => s.head));
ok('the owner\'s own sessions are USER 22, DEMO 7 and INIT 3',
  heads.USER === 22 && heads.DEMO === 7 && heads.INIT === 3, JSON.stringify(heads));
// 🔴 THIS ASSERT'S CONDITION WAS RIGHT AND ITS SENTENCE WAS WRONG, WHICH IS THE
// WORST COMBINATION THERE IS: it read `the three that say INIT are ordinary work
// rather than blanks` and passed every time. They are not blanks, and they are
// not work either. MEASURED 2026-09-21 against a stranger's pack off the public
// archive: `session_16` is BYTE IDENTICAL to a stock template that appears ten
// times in that pack, and `session_10` and `session_22` differ from it at
// exactly one byte, 0xBBAC. The owner's other 29 differ from it by 262 to 5,412
// bytes, a median of 1,524. `index.json` names all three `Initial Session`.
// ⚠️ SO THE CLAIM IS NARROWED TO WHAT WAS ACTUALLY MEASURED HERE: they are not
// empty. Whether a session is WORK is a comparison against the stock template
// and this file cannot make it, because the template is not in this repository.
const initOnes = stats.filter((s) => s.head === 'INIT');
ok('the three that say INIT are not blanks, whatever else they turn out to be',
  initOnes.every((s) => s.entropy > 0.8 && s.nonZero > 0.8)
  && new Set(initOnes.map((s) => s.fingerprint)).size === 3,
  `entropy ${initOnes.map((s) => s.entropy.toFixed(2)).join(', ')}`);

if (!fs.existsSync(BOUGHT)) {
  note('the purchased soundbank is not on this machine, so the other side of the comparison is unmeasured');
} else {
  const outer = readZip(fs.readFileSync(BOUGHT));
  const packs = outer.filter((e) => e.name.endsWith('.circuitpack'));
  const blanks = [];
  let names = new Set();
  for (const pk of packs) {
    const inner = readZip(await pk.read());
    const meta = JSON.parse(new TextDecoder().decode(await entry(inner, 'index.json').read()));
    names.add(meta.name);
    const per = new Set();
    for (const e of inner.filter((x) => x.name.endsWith('.circuitsession'))) {
      const st = await C.sessionStats(await e.read());
      blanks.push(st); per.add(st.fingerprint);
    }
    ok(`${pk.name.split('/').pop()} has 32 sessions and 1 distinct fingerprint`, per.size === 1, `${per.size}`);
  }
  ok('both purchased packs call themselves *New Pack, the same as the owner\'s',
    names.size === 1 && [...names][0] === '*New Pack', [...names].join());
  ok('their entropy is 0.009 flat and 0.07 per cent of their bytes are non-zero',
    blanks.every((s) => s.entropy < 0.02) && blanks.every((s) => s.nonZero < 0.001),
    `${Math.max(...blanks.map((s) => s.entropy)).toFixed(3)}, ${(Math.max(...blanks.map((s) => s.nonZero)) * 100).toFixed(2)}%`);

  // 🔴 THE NEGATIVE CONTROL ON THE SAFETY CHECK ITSELF. A check that said the
  // head separates them would pass every day the blanks happened to differ. It
  // does not separate them: `INIT` is on BOTH sides. The three numbers that do
  // separate them are two orders of magnitude apart, which is what the page
  // rests on.
  const blankHeads = new Set(blanks.map((s) => s.head));
  const ownHeads = new Set(stats.map((s) => s.head));
  ok('the first four bytes do NOT separate a backup from a blank, because INIT is on both sides',
    [...blankHeads].some((h) => ownHeads.has(h)),
    `blanks ${[...blankHeads].join()} against owner ${[...ownHeads].join()}`);
  // MEASURED and stronger than expected: all 64 blank session files across the
  // TWO purchased packs share ONE fingerprint, so they are byte identical to
  // each other as well as to themselves.
  const blankFps = new Set(blanks.map((s) => s.fingerprint));
  ok('the fingerprint count, the entropy and the non-zero share all do',
    fps.size === 32 && blankFps.size === 1
    && Math.min(...stats.map((s) => s.entropy)) > 40 * Math.max(...blanks.map((s) => s.entropy))
    && Math.min(...stats.map((s) => s.nonZero)) > 100 * Math.max(...blanks.map((s) => s.nonZero)),
    `${blanks.length} blank files, ${blankFps.size} fingerprint, against 32 of 32`);
}

console.log('\n-- what it refuses, and what it cannot do --');

ok('a buffer of the wrong length is refused by name',
  (await threw(() => C.readPatch(raw[0].slice(0, 349)))).includes('349'));
ok('a header that is not Novation\'s is refused',
  !!(await threw(() => { const b = raw[0].slice(); b[2] = 0x21; return C.readPatch(b); })));
ok('a message with no end of sysex is refused',
  !!(await threw(() => { const b = raw[0].slice(); b[349] = 0; return C.readPatch(b); })));
ok('a command byte the reference does not define is refused',
  !!(await threw(() => { const b = raw[0].slice(); b[6] = 0x7f; return C.readPatch(b); })));

// 🔴 THE ONE THAT MATTERS MOST. Flip byte 6 from 00 to 01 and the same 350 bytes
// stop being a message that lands in RAM and become one that overwrites a patch
// in flash. A reader that did not say so would let somebody open a file, see a
// patch, and never learn that sending it is destructive.
{
  const b = raw[0].slice();
  b[6] = 0x01; b[7] = 13;
  const p = C.readPatch(b);
  ok('a Replace Patch is read as writing flash, and says which patch',
    p.writesFlash === true && p.commandName === 'replace patch' && p.slotName === 'patch 13',
    `${p.commandName}, ${p.slotName}`);
}

// 🔴 AND THE ABSENCE IS ASSERTED RATHER THAN INTENDED. `plans/plan-pack-page.md`
// §2: the function that turns an intention into bytes does not exist at all, so
// it cannot be called by mistake. This is the assert that keeps it that way when
// somebody adds a convenience helper six months from now.
{
  const makers = Object.keys(C).filter((k) => /write|send|encode|emit|sysex|bytes/i.test(k)
    && typeof C[k] === 'function');
  ok('the module exports nothing that makes or sends a message', makers.length === 0,
    makers.join() || 'none of 32 exports');
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}${skip ? `  ${skip} skipped` : ''}\n`);
process.exit(fail ? 1 : 0);
