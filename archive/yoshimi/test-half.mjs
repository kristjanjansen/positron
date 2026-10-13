// archive/yoshimi/test-half.mjs: the checks of yoshimi.mjs that stood in
// rig/board/test.mjs, verbatim, cut out on 2026-10-13 when Yoshimi left the
// Raspberry Pi (archive/yoshimi/README.md).
//
// Runnable from here, no hardware: `node archive/yoshimi/test-half.mjs`. To
// restore, paste section 1 back where the comment in rig/board/test.mjs says,
// section 2 into its `jackd on the card` block, and add these names to its
// imports from ./yoshimi.mjs and ./jacksynth.mjs (YOSHIMI_ARGS).
import { parseBanks, parseInstance, chooseRoot, yoshimiPatches, flatten, MAX_PROGRAM, noAutoconnect, externalMidi, boardInstance, ensureBoardInstance } from './yoshimi.mjs';
import { YOSHIMI_ARGS } from './jacksynth-entry.mjs';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let pass = 0, fail = 0;
const is = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}\n         got  ${g}\n         want ${w}`); }
};
const ok = (name, cond, detail = '') => is(name, !!cond, true) || (detail && !cond && console.log(`         ${detail}`));

// ── 1. the bank map reader ──────────────────────────────────────────────────
// ---------------------------------------------------------------- yoshimi
//
// ⚠️ WHAT THIS SECTION CANNOT DO. It checks that the reader agrees with a
// fixture, and the fixture was written by the same hand as the reader — so it
// catches a typo and can never catch a misreading of Yoshimi's format. The
// thing that GRADED this code is Yoshimi itself: a throwaway instance was sent
// real MIDI bytes and asked what it had loaded (2026-09-11), and it answered
//
//   program 0 -> loaded 0001-DX Rhodes 1     program 5 -> FAILED, no instrument at 6
//   program 1 -> loaded 0002-DX Rhodes 2     program 6 -> loaded 0007-Dig Rhodes
//
// which is the `program === NNNN - 1` rule these checks pin down. `yoshimi-test.mjs`
// is the other half: it grades the whole path by the SOUND changing, on the board.
console.log('\nyoshimi: reading the bank map');
const yBanksSrc = readFileSync(new URL('./fixtures/yoshimi-banks.xml', import.meta.url), 'utf8');
const yInstSrc = readFileSync(new URL('./fixtures/yoshimi-instance.xml', import.meta.url), 'utf8');

const tmp = mkdtempSync(join(tmpdir(), 'positron-yoshimi-'));
const cfg = join(tmp, 'config'), rootA = join(tmp, 'found'), rootB = join(tmp, 'installed');
mkdirSync(cfg);
// Real directories with real files, because the reader cross-checks the bank
// map against the disk and a cross-check against nothing always passes.
const LAID = { Arpeggios: 2, Rhodes: 6, Drums: 2 };
for (const root of [rootA, rootB]) for (const [dir, n] of Object.entries(LAID)) {
  mkdirSync(join(root, dir), { recursive: true });
  for (let i = 1; i <= n; i++) writeFileSync(join(root, dir, `${String(i).padStart(4, '0')}-fixture.xiz`), '');
  // The same slot, saved in Yoshimi's other format. Real banks are full of
  // these — Strings holds 54 files in 47 slots — and counting files rather
  // than slots made a healthy board report a stale bank map.
  writeFileSync(join(root, dir, '0001-fixture.xiy'), '');
}
const banksXml = yBanksSrc.replaceAll('__ROOT_A__', rootA).replaceAll('__ROOT_B__', rootB);
writeFileSync(join(cfg, 'yoshimi.banks'), banksXml);
writeFileSync(join(cfg, 'yoshimi-0.instance'), yInstSrc);

const parsedBanks = parseBanks(banksXml);
is('both bank roots are read', parsedBanks.roots.map((r) => r.root), [5, 10]);
is('banks are numbered in fives, not from zero', parsedBanks.roots[1].banks.map((b) => b.bank), [5, 30, 80]);
// THE fact this module exists for. The filename counts from 1, the MIDI
// program counts from 0, and every entry must obey the same offset.
const everyPatch = parsedBanks.roots.flatMap((r) => r.banks.flatMap((b) => b.patches));
ok('a program number is the filename NNNN minus one, every time',
  everyPatch.every((p) => Number(p.file.slice(0, 4)) === p.program + 1), `${everyPatch.length} patches`);
is('slots are sparse, not a run', parsedBanks.roots[1].banks.find((b) => b.bank === 80).patches.map((p) => p.program),
  [0, 1, 4, 6, 67, 130]);
is('a slot Yoshimi marks unused is dropped', parsedBanks.roots[1].banks.find((b) => b.bank === 30).patches.length, 2);
is('an escaped name is decoded', parsedBanks.roots[1].banks.find((b) => b.bank === 30).patches[1].name, 'Bell & Hammer');

console.log('yoshimi: the three settings that decide whether a patch lands');
const inst = parseInstance(yInstSrc);
// The one that cost an hour. Banks go on 32; CC 0 moves the ROOT DIRECTORY.
is('bank select is CC 32', inst.bankCC, 32);
is('and CC 0 is the root control, left alone', inst.rootCC, 0);
is('program change is obeyed', inst.programChange, true);
is('the extended program control is switched off', inst.upperVoiceCC, 128);
// root_current_ID 0 matches no root, and Yoshimi falls back rather than fails.
is('a current root that does not exist falls back', chooseRoot(parsedBanks.roots, inst.rootCurrent).root, 10);
is('and a real one is honoured', chooseRoot(parsedBanks.roots, 5).root, 5);

console.log('yoshimi: the list the board sends');
const list = yoshimiPatches({ dir: cfg });
is('it reads', list.ok, true);
is('the chosen root is the one Yoshimi would use', list.root, 10);
is('both roots hold the same instruments', list.rootsAgree, true);
// 2 + 2 + 5: the slot at 130 is past the end of a seven-bit program change.
is('only reachable slots are offered', list.count, 9);
is('and the unreachable one is counted, not hidden', list.hidden, 1);
ok('nothing offered is past the last program number',
  flatten(list).every((p) => p.program <= MAX_PROGRAM));
is('the walk is bank order, then slot order', flatten(list).map((p) => `${p.bank}/${p.program}`),
  ['5/0', '5/1', '30/1', '30/11', '80/0', '80/1', '80/4', '80/6', '80/67']);
is('the bank map agrees with the files on disk', list.stale, false);
is('a slot saved in both of Yoshimi\'s formats counts once', list.banks.find((b) => b.bank === 30).disk, 2);

console.log('yoshimi: and when it does not');
// gzip is the normal case on a board — Yoshimi writes zlib whenever
// gzip_compression is non-zero, under the same filename.
writeFileSync(join(cfg, 'yoshimi.banks'), gzipSync(Buffer.from(banksXml)));
is('a gzipped bank map reads the same', yoshimiPatches({ dir: cfg }).count, 9);
// One extra file on the board and the map is out of date. Saying so is the
// difference between a list that is quietly wrong and one that is right.
writeFileSync(join(rootB, 'Drums', '0099-added-later.xiz'), '');
is('a bank map older than the disk is reported', yoshimiPatches({ dir: cfg }).stale, true);
is('no bank map at all is an answer, not a throw', yoshimiPatches({ dir: join(tmp, 'nowhere') }).ok, false);
ok('and it says where it looked', /nowhere/.test(yoshimiPatches({ dir: join(tmp, 'nowhere') }).reason ?? ''));
// The file it was read from is `file`, never `source` — board.mjs spreads this
// object beside a `source` that names the instrument, and a collision there
// left every client waiting for a reply that had already arrived.
ok('the file it read is not called `source`', list.source === undefined && /yoshimi\.banks$/.test(list.file ?? ''));
// Two roots that disagree is a rig somebody edited; it must not read as fine.
is('roots that disagree are noticed', parseBanks(banksXml.replace('DX Rhodes 2', 'Something Else')).roots.length, 2);
ok('and rootsAgree goes false', (() => {
  const x = banksXml.replace('<string name="listname">Dig Rhodes</string>', '<string name="listname">Edited</string>');
  writeFileSync(join(cfg, 'yoshimi.banks'), x);
  return yoshimiPatches({ dir: cfg }).rootsAgree === false;
})());
rmSync(tmp, { recursive: true, force: true });

console.log('yoshimi: the instance edits and the command line');
{
  // Yoshimi with no physical playback port. MEASURED 2026-10-11 the first time
  // jackd ran on the card capture only: `No physical jack playback ports
  // found. Failed to connect jack audio ports ... Yoshimi stages a strategic
  // retreat`, exit 1, because its saved instance asks to auto connect.
  const inst = '<par name="audio_engine" value="1" />\n<par name="connect_jack_audio" value="1" />\n<par name="other" value="1" />';
  const na = noAutoconnect(inst);
  is('auto connect is switched off in the instance', [na.changed, /connect_jack_audio" value="0"/.test(na.xml)], [true, true]);
  is('NEGATIVE CONTROL: and nothing else in the file moves', na.xml.replace('value="0" />\n<par name="other"', 'value="1" />\n<par name="other"'), inst);
  is('NEGATIVE CONTROL: an instance already off is left alone', noAutoconnect(na.xml).changed, false);
  // Yoshimi on ALSA MIDI `Search`. MEASURED 2026-10-11: `alsa_midi_type` 1
  // subscribed it to the Circuit, the board's raw read of the Circuit went
  // EBUSY and /concepts/synth/070/ lost its patch name. 2 is `External`.
  const midiInst = '<par name="midi_engine" value="1" />\n<par name="alsa_midi_type" value="1" />\n<string name="linux_alsa_midi_dev">default</string>';
  const em = externalMidi(midiInst);
  is('ALSA MIDI search is switched to External in the instance', [em.changed, /alsa_midi_type" value="2"/.test(em.xml)], [true, true]);
  is('NEGATIVE CONTROL: and nothing else in the file moves', em.xml.replace('"alsa_midi_type" value="2"', '"alsa_midi_type" value="1"'), midiInst);
  is('NEGATIVE CONTROL: Fixed (0) is not left alone either, its default source list is not the board', externalMidi(midiInst.replace('value="1" />\n<string', 'value="0" />\n<string')).changed, true);
  is('NEGATIVE CONTROL: an instance already External is left alone', externalMidi(em.xml).changed, false);
  is('NEGATIVE CONTROL: midi_engine is not mistaken for the type', externalMidi('<par name="midi_engine" value="1" />').changed, false);
  const both = boardInstance(inst + '\n' + midiInst);
  is('both edits land in one pass and are named', [both.edits, /connect_jack_audio" value="0"/.test(both.xml), /alsa_midi_type" value="2"/.test(both.xml)], [['connect_jack_audio', 'alsa_midi_type'], true, true]);
  is('NEGATIVE CONTROL: a second pass moves nothing', boardInstance(both.xml).changed, false);
  {
    const d = mkdtempSync(join(tmpdir(), 'yinst-'));
    writeFileSync(join(d, 'yoshimi-0.instance'), gzipSync(inst + '\n' + midiInst));
    const r1 = ensureBoardInstance(d), r2 = ensureBoardInstance(d);
    const back = readFileSync(join(d, 'yoshimi-0.instance'));
    const text = gunzipSync(back).toString('utf8');
    is('the gzipped instance on disk is rewritten once and stays gzipped', [r1.changed, r2.changed, back[0] === 0x1f && back[1] === 0x8b], [true, false, true]);
    is('and on disk it says no auto connect and External MIDI', [/connect_jack_audio" value="0"/.test(text), /alsa_midi_type" value="2"/.test(text)], [true, true]);
    is('NEGATIVE CONTROL: no instance file is not an error, Yoshimi writes one on its first run', ensureBoardInstance(join(d, 'none')).changed, false);
    rmSync(d, { recursive: true, force: true });
  }
  is('the Yoshimi command line asks for ALSA MIDI with no fixed device', YOSHIMI_ARGS.includes('-a') && !YOSHIMI_ARGS.some((a) => /^-a=|^--alsa-midi=/.test(a)), true);
  is('NEGATIVE CONTROL: and neither JACK auto connect nor a second jackd', YOSHIMI_ARGS.some((a) => a === '-K' || a === '-k' || /^--auto-connect|^--autostart-jack/.test(a)), false);
}

console.log(`\n${pass}/${pass + fail} green`);
process.exit(fail ? 1 : 0);
