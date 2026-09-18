// rig/box/test.mjs — the patchbay's checks, against a fixture, no hardware.
//
// Everything the box does BEFORE it touches a rig — parse, name, validate — is
// pure, so it is checkable on a laptop. What is left needing the board is
// exactly: real ports, real sound, unattended boot. Those are named in the
// README rather than faked here, because a fake that passes is worse than a
// gap that is written down.
import { parseAconnect, addressable, resolve, plan, apply, listPorts, CARRY } from './alsa.mjs';
import { parseBanks, parseInstance, chooseRoot, yoshimiPatches, flatten, MAX_PROGRAM } from './yoshimi.mjs';
import { parseJackLsp, jackChain, jackRebuild } from './jacksynth.mjs';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let pass = 0, fail = 0;
const is = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}\n         got  ${g}\n         want ${w}`); }
};
const ok = (name, cond, detail = '') => is(name, !!cond, true) || (detail && !cond && console.log(`         ${detail}`));

const text = readFileSync(new URL('./fixtures/aconnect-l.txt', import.meta.url), 'utf8');
const clients = parseAconnect(text);
const ports = addressable(clients);

console.log('parse');
is('client count', clients.length, 7);
is('System has two ports', clients[0].ports.length, 2);
is('Circuit is client 20', clients.find((c) => c.name === 'Circuit')?.id, 20);
is('card attribute read', clients.find((c) => c.name === 'Circuit')?.card, '1');
is('existing subscription read', clients.find((c) => c.name === 'Circuit').ports[0].to, ['24:0']);
is('reverse side read', clients.find((c) => c.name === 'MicroFreak').ports[0].from, ['20:0']);

console.log('addressable');
is('plumbing hidden', ports.some((p) => p.client === 'System' || p.client === 'Midi Through'), false);
is('five real ports', ports.length, 5);
is('virtual ports flagged', ports.filter((p) => p.virtual).length, 2);

console.log('naming');
is('by client name', resolve('circuit', ports).port?.addr, '20:0');
is('case does not matter', resolve('MICROFREAK', ports).port?.addr, '24:0');
is('by explicit address', resolve('28:0', ports).port?.addr, '28:0');
is('address that does not exist', resolve('99:0', ports).ok, false);
// Two VirMIDI clients match "virtual" — the whole point is that this REPORTS
// rather than picks, because picking wrong is silent.
is('ambiguity is refused', resolve('virtual', ports).ok, false);
ok('ambiguity lists the candidates', (resolve('virtual', ports).candidates ?? []).length === 2);
is('unknown name', resolve('juno', ports).ok, false);
ok('unknown name suggests what IS here', (resolve('juno', ports).candidates ?? []).includes('Circuit'));

console.log('plan');
const full = (from, to, carry) => ({ v: 1, links: [{ from, to, ...(carry ? { carry } : {}) }] });
is('a new link plans a connect', plan(full('digitakt', 'microfreak'), ports).steps[0].action, 'connect');
is('planning changes nothing', resolve('digitakt', ports).port.to, []);
is('an existing link is noticed', plan(full('circuit', 'microfreak'), ports).steps[0].action, 'already connected');
is('missing name is a problem', plan(full('juno', 'microfreak'), ports).ok, false);
is('self-connection is a problem', plan(full('circuit', 'circuit'), ports).ok, false);
is('bad version is a problem', plan({ v: 9, links: [] }, ports).ok, false);
is('not an object', plan(null, ports).ok, false);

console.log('carry');
is('carry all is fine', plan(full('digitakt', 'microfreak', ['all']), ports).ok, true);
is('omitted carry means all', plan(full('digitakt', 'microfreak'), ports).steps[0].carry, ['all']);
is('a missing port list is said, not thrown', plan(full('a', 'b'), undefined).problems[0], 'no port list to resolve names against');
// The finding this file exists to pin down: an ALSA subscription cannot filter
// by message class, so a subset is REFUSED. If this ever starts passing as
// 'connect', something learned to filter and the comment in alsa.mjs is stale.
is('a subset is refused, not approximated', plan(full('circuit', 'digitakt', ['note']), ports).ok, false);
ok('and it says why', /cannot filter/.test(plan(full('circuit', 'digitakt', ['note']), ports).problems[0] ?? ''));
is('unknown carry name is a problem', plan(full('circuit', 'digitakt', ['notes']), ports).ok, false);
is('every carry name is known', CARRY.filter((c) => typeof c !== 'string').length, 0);

console.log('apply');
is('a broken plan applies nothing', apply(plan(full('juno', 'microfreak'), ports)).ran, []);
is('a clean plan is dry-runnable', apply(plan(full('digitakt', 'microfreak'), ports), { dry: true }).ran[0].result, 'dry');

console.log('backend');
// Explicitly the fixture. Reading the LIVE backend here crashed this suite on
// arm64 Linux, where `aconnect` exists but the sequencer does not — the tests
// must not need a working sound stack to check code that has nothing to do
// with one.
const fixed = listPorts({ fixture: true });
is('fixture backend', fixed.backend, 'fake');
is('fixture has no error', fixed.error, null);
ok('and it lists ports', fixed.clients.length > 0);

// The distinction the box exists to keep: a broken sequencer and an empty rig
// are BOTH zero ports, and they are not the same thing.
const live = listPorts();
ok(`live backend is ${live.backend}`, ['alsa', 'fake'].includes(live.backend));
if (live.backend === 'alsa' && live.error) {
  ok('a broken sequencer is reported, not thrown', typeof live.error === 'string', live.error);
  ok('and it says what to do', !!live.hint, live.hint ?? '');
} else {
  ok('live backend did not throw', true, live.error ? live.error : `${live.clients.length} clients`);
}

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

console.log('yoshimi: the list the box sends');
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
// The file it was read from is `file`, never `source` — box.mjs spreads this
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

// ── the JACK audio graph ─────────────────────────────────────────────────────
//
// 🔴 THE PART OF THE RECOVERY VERBS A LAPTOP CAN GRADE, AND THE REST IS NAMED
// AS UNVERIFIED IN THE README. `jack.graph` and `jack.rebuild` were written
// 2026-09-18 against a board that does not answer ssh from here, so nothing
// below has met a JACK server. What it does check is the half where the bugs
// would be silent: a parser that drops a line reports a healthy graph about a
// broken one, and a chain that calls a drifted graph intact is a recovery verb
// that does nothing and says it worked.
console.log('jack: the connection list');
const jackText = readFileSync(new URL('./fixtures/jack-lsp-c.txt', import.meta.url), 'utf8');
const jackRows = parseJackLsp(jackText);
is('every port is a row', jackRows.length, 7);
is('a port with no connections has none', jackRows.find((r) => r.port === 'system:capture_1').connected, []);
is('the capture names both sources', jackRows.find((r) => r.port === 'posbox:input_1').connected,
   ['yoshimi:left', 'yoshimi:right']);
is('an indented line is never a port', jackRows.some((r) => /^\s/.test(r.port)), false);

console.log('jack: what the chain should be');
const yosh = { instrumentPort: 'yoshimi:left', instrumentPortR: 'yoshimi:right' };
const graph = { graph: jackRows };
const dry = jackChain({ ...yosh, graph });
is('a healthy graph is intact', dry.intact, true);
is('and wants exactly two links', dry.want.length, 2);
is('with nothing missing', dry.missing, []);
is('and nothing extra', dry.extra, []);
is('the capture is on the graph', dry.capture.present, true);

// The NEGATIVE CONTROLS. Each one is a real failure this board has had, and
// without them `intact` could be hard-coded true and still read green.
const halfRows = parseJackLsp(jackText.replace(/^yoshimi:right\n   posbox:input_1\n/m, 'yoshimi:right\n')
                                      .replace('   yoshimi:right\n', ''));
const half = jackChain({ ...yosh, graph: { graph: halfRows } });
is('a missing right channel is not intact', half.intact, false);
is('and it is named', half.missing, [['yoshimi:right', 'posbox:input_1']]);
const strayRows = parseJackLsp(jackText.replace('posbox:input_1\n   yoshimi:left',
                                                'posbox:input_1\n   ghost:out_1\n   yoshimi:left'));
const stray = jackChain({ ...yosh, graph: { graph: strayRows } });
is('a stray source summed into the capture is not intact', stray.intact, false);
is('and it is named', stray.extra, [['ghost:out_1', 'posbox:input_1']]);
is('while nothing reads as missing', stray.missing, []);
const goneRows = parseJackLsp(jackText.replace(/^posbox:input_1\n(   .*\n)*/m, ''));
is('a capture that has gone is reported', jackChain({ ...yosh, graph: { graph: goneRows } }).capture.present, false);
is('nothing playing is not intact either', jackChain({ graph }).intact, false);

console.log('jack: the insert, and the material');
// With the granulator in, the instrument feeds IT and it feeds the capture,
// so the same healthy-looking graph above is wrong, which is the whole reason
// the chain is computed from the board's state rather than from the ports.
const ins = jackChain({ ...yosh, insert: true, graph });
is('the insert wants four links', ins.want.length, 4);
is('and the direct pair now reads as extra', ins.extra,
   [['yoshimi:left', 'posbox:input_1'], ['yoshimi:right', 'posbox:input_1']]);
// 🔴 THE ONE A REBUILD COULD SILENTLY UNDO. `/grains/` unplugs the instrument
// from the granulator on purpose, because scsynth sums its input bus with the
// generated material. A rebuild that put it back would restore a third sound
// neither end can describe, and every readout would go on saying the two were
// comparable.
const made = jackChain({ ...yosh, insert: true, source: true, graph });
is('generated material leaves the instrument unplugged', made.want.length, 2);
ok('and never asks for it back',
   !made.want.some(([f]) => f.startsWith('yoshimi:')) && !made.missing.some(([f]) => f.startsWith('yoshimi:')));

console.log('jack: the repair, planned only');
const planned = jackRebuild({ ...yosh, insert: true, plan: true, graph });
is('a plan runs nothing', planned.changed, 0);
is('it disconnects before it connects', planned.steps.map((s) => s.act),
   ['disconnect', 'disconnect', 'connect', 'connect', 'connect', 'connect']);
ok('and every step is a patch, never a kill',
   planned.steps.every((s) => /^jack_(dis)?connect /.test(s.cmd)));
is('a healthy graph plans nothing at all', jackRebuild({ ...yosh, plan: true, graph }).steps.length, 0);
is('with no instrument there is nothing to rebuild', jackRebuild({ plan: true, graph }).ok, false);
is('a missing capture says which verbs raise it',
   /audio\.stop then audio\.start/.test(jackRebuild({ ...yosh, plan: true, graph: { graph: goneRows } }).reason ?? ''), true);

console.log(`\n${pass}/${pass + fail} green`);
process.exit(fail ? 1 : 0);
