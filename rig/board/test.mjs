// rig/board/test.mjs — the patchbay's checks, against a fixture, no hardware.
//
// Everything the board does BEFORE it touches a rig — parse, name, validate — is
// pure, so it is checkable on a laptop. What is left needing the board is
// exactly: real ports, real sound, unattended boot. Those are named in the
// README rather than faked here, because a fake that passes is worse than a
// gap that is written down.
import { parseAconnect, addressable, resolve, plan, apply, listPorts, CARRY } from './alsa.mjs';
import { parseBanks, parseInstance, chooseRoot, yoshimiPatches, flatten, MAX_PROGRAM } from './yoshimi.mjs';
import { parseJackLsp, jackChain, jackRebuild } from './jacksynth.mjs';
import { parseInputs, takeChannel, createByteOrder, leaseExpired, createInputs, midiVerdict, SYNTH_CC } from './inputs.mjs';
import { CIRCUIT_CC } from '../../demo/shell/circuit-cc.mjs';
import { fresher, midiKey, MAX_PEERS } from './rtc.mjs';
import { EventEmitter } from 'node:events';
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

// The distinction the board exists to keep: a broken sequencer and an empty rig
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
is('the capture names both sources', jackRows.find((r) => r.port === 'posboard:input_1').connected,
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
const halfRows = parseJackLsp(jackText.replace(/^yoshimi:right\n   posboard:input_1\n/m, 'yoshimi:right\n')
                                      .replace('   yoshimi:right\n', ''));
const half = jackChain({ ...yosh, graph: { graph: halfRows } });
is('a missing right channel is not intact', half.intact, false);
is('and it is named', half.missing, [['yoshimi:right', 'posboard:input_1']]);
const strayRows = parseJackLsp(jackText.replace('posboard:input_1\n   yoshimi:left',
                                                'posboard:input_1\n   ghost:out_1\n   yoshimi:left'));
const stray = jackChain({ ...yosh, graph: { graph: strayRows } });
is('a stray source summed into the capture is not intact', stray.intact, false);
is('and it is named', stray.extra, [['ghost:out_1', 'posboard:input_1']]);
is('while nothing reads as missing', stray.missing, []);
const goneRows = parseJackLsp(jackText.replace(/^posboard:input_1\n(   .*\n)*/m, ''));
is('a capture that has gone is reported', jackChain({ ...yosh, graph: { graph: goneRows } }).capture.present, false);
is('nothing playing is not intact either', jackChain({ graph }).intact, false);

console.log('jack: the insert, and the material');
// With the granulator in, the instrument feeds IT and it feeds the capture,
// so the same healthy-looking graph above is wrong, which is the whole reason
// the chain is computed from the board's state rather than from the ports.
const ins = jackChain({ ...yosh, insert: true, graph });
is('the insert wants four links', ins.want.length, 4);
is('and the direct pair now reads as extra', ins.extra,
   [['yoshimi:left', 'posboard:input_1'], ['yoshimi:right', 'posboard:input_1']]);
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

console.log('inputs: a name, a room and a lease');
{
  const good = parseInputs('{"circuit":{"device":"hw:CARD=Pro,DEV=0","channels":2,"take":1}}');
  is('a good entry is read whole', good.inputs.get('circuit'), { name: 'circuit', device: 'hw:CARD=Pro,DEV=0', channels: 2, take: 1, midi: null });
  const bad = parseInputs('{"circuit":{"device":"hw:CARD=Pro,DEV=0","channels":2,"take":3},"Bad Name":{"device":"x"},"ok":{"device":"default"}}');
  is('a take past the channel count is refused', bad.inputs.has('circuit'), false);
  is('a name with spaces is refused', bad.inputs.has('Bad Name'), false);
  is('and a bad entry does not take the good one down', bad.inputs.has('ok'), true);
  is('each refusal says why', bad.problems.length, 2);
  is('nothing configured is no inputs, not an error', parseInputs('').problems.length, 0);
  is('not JSON is one reason, not a throw', parseInputs('circuit=hw:0').problems.length, 1);

  // Channel 1 is the Circuit and channel 2 is an open input with its gain up.
  const inter = Int16Array.from([100, 7, 200, 7, 300, 7]);
  is('it keeps the channel asked for', [...takeChannel(inter, 2, 1, 3)], [100, 200, 300]);
  // negative control: a downmix would read [53, 103, 153]
  ok('and never sums the open input in', takeChannel(inter, 2, 1, 3)[0] === 100);
  is('the other channel is reachable too', [...takeChannel(inter, 2, 2, 3)], [7, 7, 7]);

  // The Fast Track Pro sent big endian under an S16_LE label (2026-09-30).
  // Stereo tones at the levels measured that day: a quiet Circuit (peak 18,
  // with a little noise), a loud one, and the open input beside it.
  const tone = (amp, secs = 0.5) => {
    const n = 48000 * secs, a = new Int16Array(n * 2);
    let seed = 1;
    const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 6;
    for (let i = 0; i < n; i++) {
      a[i * 2] = Math.round(amp * Math.sin(2 * Math.PI * 220 * i / 48000) + noise());
      a[i * 2 + 1] = Math.round(noise());
    }
    return a;
  };
  const swapped = (a) => new Int16Array(a.map((v) => ((v & 0xFF) << 8) | ((v >> 8) & 0xFF)));
  const feed = (a) => {
    const o = createByteOrder({ channels: 2 }), out = [];
    for (let i = 0; i < a.length; i += 960) out.push(...o.fix(a.slice(i, i + 960)));
    return { o, out };
  };
  for (const [name, amp] of [['a quiet Circuit', 18], ['a loud Circuit', 12000]]) {
    const good = tone(amp);
    // negative control: audio the right way round is never touched
    const le = feed(good);
    is(`${name} sent little endian is left alone`, le.o.swapped, false);
    const be = feed(swapped(good));
    is(`${name} sent big endian is found`, be.o.swapped, true);
    // once decided, the tail comes out as it went in
    const tail = good.length - 960;
    is(`${name} sent big endian plays as it went in`, be.out.slice(tail).join(), [...good.slice(tail)].join());
  }
  ok('digital silence decides nothing', !feed(new Int16Array(48000)).o.swapped);
  const q = tone(18, 0.3), said = [];
  const flipLog = createByteOrder({ channels: 2, onChange: (s) => said.push(s) });
  for (let i = 0; i < q.length; i += 960) flipLog.fix(swapped(q.slice(i, i + 960)));
  for (let i = 0; i < q.length; i += 960) flipLog.fix(q.slice(i, i + 960));
  is('a device that turns back is followed back, and each change is said once', said, [true, false]);

  is('a lease in the future holds', leaseExpired(10_000, 9_999), false);
  is('a lease at its end has run out', leaseExpired(10_000, 10_000), true);
  is('no lease at all is run out, not forever', leaseExpired(0, 1), true);
  is('an unset lease is run out, not NaN-true', leaseExpired(undefined, 1), true);

  // The live half against fakes: no relay, no ALSA.
  let t = 1_000;
  const spawned = [];
  const fakeSpawn = (cmd, args) => {
    const p = new EventEmitter();
    p.stdout = new EventEmitter(); p.stderr = new EventEmitter();
    p.kill = () => { p.killed = true; p.emit('exit', null); };
    spawned.push({ cmd, args, p });
    return p;
  };
  const sockets = [];
  class FakeWS { constructor(url) { this.url = url; this.readyState = 1; this.sent = []; sockets.push(this); }
    send(x) { this.sent.push(x); } close() { this.readyState = 3; } }
  const fmt = (m, env) => JSON.stringify({ ...m, ...env });
  const prs = (x) => ({ kind: 'json', msg: JSON.parse(x) });
  const hw = createInputs({
    inputs: good.inputs, room: 'studio-1', relay: 'wss://relay', frame: 3, rate: 48000, name: 'pi', id: 'pi-1',
    spawn: fakeSpawn, WebSocket: FakeWS, format: fmt, parse: prs, randomId: () => 'abc', now: () => t,
    leaseMs: 60_000, beatMs: 5_000,
  });
  const c = hw.get('circuit');
  c.connect();
  is('an input joins a room of its own', sockets[0].url, 'wss://relay/room/studio-1-circuit/ws');
  is('and nothing is captured until somebody asks', spawned.length, 0);
  c.handle({ type: 'input.want', id: 'w1', device: 'hw:0' });
  is('asking starts arecord', spawned.length, 1);
  is('on the configured device, whatever the page sent', spawned[0].args[spawned[0].args.indexOf('-D') + 1], 'hw:CARD=Pro,DEV=0');
  is('at the configured channel count', spawned[0].args[spawned[0].args.indexOf('-c') + 1], '2');
  // negative control: ALSA's own default here was 6000 frames, 125 ms of lump
  is('with a 10 ms period, never the 125 ms default', spawned[0].args.includes('--period-size=480'), true);
  c.handle({ type: 'input.want', id: 'w2' });
  is('asking again renews rather than starting a second', spawned.length, 1);
  spawned[0].p.stdout.emit('data', Buffer.from(new Int16Array([100, 7, 200, 7, 300, 7]).buffer));
  const bin = sockets[0].sent.find((x) => Buffer.isBuffer(x));
  is('a frame goes out with one channel in it', bin && [...new Int16Array(bin.buffer.slice(bin.byteOffset + 12, bin.byteOffset + bin.length))], [100, 200, 300]);
  // The relay echoes every message to its sender; the watchdog lives on that.
  t += 59_000; c.s.lastHeard = t; c.beat();
  is('inside the lease it keeps running', !!c.s.proc, true);
  t += 2_000; c.s.lastHeard = t; c.beat();
  is('past the lease it stops by itself', !!c.s.proc, false);
  is('and the process was really killed', spawned[0].p.killed, true);
  c.handle({ type: 'audio.status', id: 's1' });
  const st = JSON.parse(sockets[0].sent.filter((x) => typeof x === 'string').at(-1));
  is('status in the input room says what is playing', [st.type, st.ok, st.source], ['audio.started', false, 'circuit']);
  hw.close();
}

console.log('inputs: what a page may send the Circuit');
{
  const CH = [1, 2, 10];
  is('a note on for synth 1 passes', midiVerdict([0x90, 60, 100], CH).ok, true);
  is('a note off for drums passes', midiVerdict([0x89, 60, 0], CH).ok, true);
  is('all notes off passes', midiVerdict([0xB1, 123, 0], CH).ok, true);
  // negative controls, each the shape that could hurt the instrument
  is('SysEx is refused, a Replace Patch writes flash', midiVerdict([0xF0, 0x00, 0x20], CH).ok, false);
  is('a program change is refused', midiVerdict([0xC0, 5, 0], CH).ok, false);
  is('an ordinary controller is refused', midiVerdict([0xB0, 7, 100], CH).ok, false);
  is('CC 123 with a value is not all notes off', midiVerdict([0xB0, 123, 5], CH).ok, false);
  is('a note on channel 16, the session channel, is refused', midiVerdict([0x9F, 60, 100], CH).ok, false);
  is('a data byte past 127 is refused', midiVerdict([0x90, 200, 100], CH).ok, false);
  is('four bytes is refused', midiVerdict([0x90, 60, 100, 0], CH).ok, false);
  is('and the refusal says why', /channel 16/.test(midiVerdict([0x9F, 60, 100], CH).why), true);

  // ── the synth control changes, widened 2026-09-30 for /shape/ ──────────────
  // Graded against the table /shape/ sends from, row by row, so a gate that
  // lost a controller the page can move goes red here rather than as a silent
  // slider in another building.
  const synthRows = CIRCUIT_CC.filter((p) => p.ch === '1/2');
  is('the synth allowlist is the 52 synth rows of the reference, no more', SYNTH_CC.size, 52);
  is('every synth control change /shape/ can send passes on channel 1 and on channel 2',
    synthRows.filter((p) => midiVerdict([0xB0, p.cc, 64], CH).ok && midiVerdict([0xB1, p.cc, 64], CH).ok).length, 52);
  is('the filter at both ends of its travel passes', [midiVerdict([0xB0, 74, 0], CH).ok, midiVerdict([0xB1, 74, 127], CH).ok], [true, true]);
  // negative controls, each one a class a gate that let every CC through would pass
  const notSynth = [...Array(128).keys()].filter((n) => !SYNTH_CC.has(n) && n !== 123);
  is('every other controller number is refused on a synth channel', notSynth.filter((n) => midiVerdict([0xB0, n, 0], CH).ok), []);
  is('bank select, CC 0 and 32, is refused', [midiVerdict([0xB0, 0, 1], CH).ok, midiVerdict([0xB0, 32, 1], CH).ok], [false, false]);
  is('NRPN and RPN, CC 98 to 101, and data entry, 6 and 38, are refused',
    [98, 99, 100, 101, 6, 38].map((n) => midiVerdict([0xB0, n, 1], CH).ok), [false, false, false, false, false, false]);
  is('all sound off, reset controllers, local off and omni, CC 120 to 127 but 123, are refused',
    [120, 121, 122, 124, 125, 126, 127].map((n) => midiVerdict([0xB0, n, 0], CH).ok), [false, false, false, false, false, false, false]);
  is('drum patch select, CC 8 on channel 10, is refused', midiVerdict([0xB9, 8, 3], CH).ok, false);
  is('a synth controller on the drum channel is refused', midiVerdict([0xB9, 74, 64], CH).ok, false);
  is('and on the session channel even if a config named it', midiVerdict([0xBF, 74, 64], [1, 2, 10, 16]).ok, false);
  is('a program change is still refused on every channel', [0xC0, 0xC1, 0xC9, 0xCF].map((s) => midiVerdict([s, 5, 0], [1, 2, 10, 16]).ok), [false, false, false, false]);
  is('pitch bend and aftertouch are refused', [0xE0, 0xD0, 0xA0].map((s) => midiVerdict([s, 0, 64], CH).ok), [false, false, false]);
  is('and a synth controller refusal on the drums says why', /not a synth/.test(midiVerdict([0xB9, 74, 64], CH).why), true);

  const cfg = parseInputs('{"circuit":{"device":"hw:CARD=Pro,DEV=0","channels":2,"take":1,"midi":{"port":"Circuit","channels":[1,2,10]}}}');
  is('a midi port is read from config', cfg.inputs.get('circuit').midi, { port: 'Circuit', channels: [1, 2, 10] });
  is('a midi port that is a path is refused', parseInputs('{"c":{"device":"x","midi":{"port":"/dev/snd/midiC0D0","channels":[1]}}}').inputs.has('c'), false);

  let t = 0; const writes = []; const opened = [];
  const fakeFs = { readlinkSync: () => 'card7', openSync: (pth) => { opened.push(pth); return 42; },
    writeSync: (fd, buf) => writes.push([...buf]), closeSync: () => {} };
  const sock = [];
  class WS { constructor() { this.readyState = 1; this.sent = []; sock.push(this); } send(x) { this.sent.push(x); } close() { this.readyState = 3; } }
  const hw = createInputs({ inputs: cfg.inputs, room: 'r', relay: 'wss://x', frame: 3, rate: 48000, name: 'pi', id: 'pi',
    spawn: () => { const p = new EventEmitter(); p.stdout = new EventEmitter(); p.stderr = new EventEmitter(); p.kill = () => p.emit('exit'); return p; },
    WebSocket: WS, format: (m, e) => JSON.stringify({ ...m, ...e }), parse: (x) => ({ kind: 'json', msg: JSON.parse(x) }),
    randomId: () => 'x', now: () => t, fs: fakeFs, leaseMs: 60_000, beatMs: 5_000 });
  const c = hw.get('circuit'); c.connect();
  c.handle({ type: 'midi.send', id: 'a', bytes: [0x90, 60, 100] });
  is('a note reaches the port the card name resolves to', opened, ['/dev/snd/midiC7D0']);
  is('with exactly the bytes sent', writes, [[0x90, 60, 100]]);
  c.handle({ type: 'midi.send', id: 'b', bytes: [0xF0, 0x7E, 0x7F] });
  is('SysEx never reaches the port', writes.length, 1);
  const refusedMsg = JSON.parse(sock[0].sent.filter((x) => typeof x === 'string').at(-1));
  is('and the page is told it was refused', refusedMsg.type, 'midi.refused');
  c.handle({ type: 'input.want', id: 'w' });
  t += 61_000; c.s.lastHeard = t; c.beat();
  is('when the lease runs out, a note left held is released', writes.at(-1), [0x80, 60, 0]);
  is('and nothing is left held', c.s.held.size, 0);
  // A control change under a held note must not forget the note, or the lease's
  // panic leaves it sounding. Only CC 123 lets go.
  c.handle({ type: 'input.want', id: 'w2' });
  c.handle({ type: 'midi.send', id: 'n', bytes: [0x90, 64, 100] });
  c.handle({ type: 'midi.send', id: 'f', bytes: [0xB0, 74, 20] });
  is('a filter move reaches the port', writes.at(-1), [0xB0, 74, 20]);
  is('and the note under it is still known to be held', c.s.held.size, 1);
  c.handle({ type: 'midi.send', id: 'p', bytes: [0xC0, 3, 0] });
  is('a program change never reaches the port', writes.at(-1), [0xB0, 74, 20]);
  t += 61_000; c.s.lastHeard = t; c.beat();
  is('so the lease still releases it', writes.at(-1), [0x80, 64, 0]);
  hw.close();
}

console.log('\nrtc: the direct path, against a fake peer');
{
  // ── the reorder guard, pure ────────────────────────────────────────────────
  const last = new Map();
  is('a note on is keyed by channel and note', midiKey([0x90, 60, 100]), '0:n:60');
  is('and its note off shares the key', midiKey([0x80, 60, 0]), '0:n:60');
  is('a numbered note on applies', fresher(last, [0x90, 60, 100], 1), true);
  is('its note off, numbered after, applies', fresher(last, [0x80, 60, 0], 2), true);
  // negative control: the reorder an unordered channel can deliver
  const r = new Map();
  is('a note off that overtook its note on applies', fresher(r, [0x80, 64, 0], 2), true);
  is('and the late note on is refused, so nothing sticks', fresher(r, [0x90, 64, 100], 1), false);
  is('another note is not held back by it', fresher(r, [0x90, 65, 100], 1), true);
  is('an unnumbered message from an older page applies', fresher(r, [0x90, 64, 100], undefined), true);
  is('a stale filter value is refused too', [fresher(r, [0xB0, 74, 90], 9), fresher(r, [0xB0, 74, 10], 8)], [true, false]);

  // ── the live half ──────────────────────────────────────────────────────────
  const pcs = [];
  class FakeDC {
    constructor(label) { this.label = label; this.out = []; this.open = true; this.backlog = 0; }
    getLabel() { return this.label; } isOpen() { return this.open; } bufferedAmount() { return this.backlog; }
    sendMessage(x) { this.out.push(JSON.parse(x)); } sendMessageBinary(b) { this.out.push(b); }
    onMessage(f) { this.recv = f; } close() { this.open = false; }
  }
  class FakePC {
    constructor(name, cfg) { this.name = name; this.cfg = cfg; this.cands = []; this.closed = false; pcs.push(this); }
    onLocalDescription(f) { this.ld = f; } onLocalCandidate(f) { this.lc = f; }
    onStateChange(f) { this.sc = f; } onDataChannel(f) { this.dcf = f; }
    setRemoteDescription(sdp, kind) { this.remote = [sdp, kind]; this.ld('v=0 answer', 'answer'); this.lc('candidate:1 1 UDP 1 192.168.1.213 5000 typ host', '0'); }
    addRemoteCandidate(c, mid) { this.cands.push([c, mid]); }
    close() { this.closed = true; }
    // what the page's two createDataChannel calls look like from here
    channels() { const pcm = new FakeDC('pcm'), ctl = new FakeDC('ctl'); this.dcf(pcm); this.dcf(ctl); return { pcm, ctl }; }
  }
  let t = 0; const writes = [];
  const fakeFs = { readlinkSync: () => 'card7', openSync: () => 42, writeSync: (fd, b) => writes.push([...b]), closeSync: () => {} };
  const spawned = [];
  const sock = [];
  class WS { constructor() { this.readyState = 1; this.sent = []; sock.push(this); } send(x) { this.sent.push(x); } close() { this.readyState = 3; } }
  const cfg = parseInputs('{"circuit":{"device":"hw:CARD=Pro,DEV=0","channels":2,"take":1,"midi":{"port":"Circuit","channels":[1,2,10]}}}');
  const mk = (PeerConnection) => createInputs({ inputs: cfg.inputs, room: 'r', relay: 'wss://x', frame: 4, rate: 200, name: 'pi', id: 'pi',
    spawn: () => { const p = new EventEmitter(); p.stdout = new EventEmitter(); p.stderr = new EventEmitter(); p.kill = () => p.emit('exit'); spawned.push(p); return p; },
    WebSocket: WS, format: (m, e) => JSON.stringify({ ...m, ...e }), parse: (x) => ({ kind: 'json', msg: JSON.parse(x) }),
    randomId: () => 'x', now: () => t, fs: fakeFs, leaseMs: 60_000, beatMs: 5_000, PeerConnection });
  const relayOut = (w) => w.sent.filter((x) => typeof x === 'string').map((x) => JSON.parse(x));

  // a board with no library answers, rather than leaving a page waiting
  const bare = mk(null); const b = bare.get('circuit'); b.connect(); sock[0].onopen();
  is('a board with no library says so in its hello', relayOut(sock[0]).find((m) => m.type === 'board.hello').direct, false);
  sock[0].onmessage({ data: JSON.stringify({ type: 'rtc.offer', peer: 'page1', sdp: 'v=0', from: 'p' }) });
  is('and refuses an offer out loud', relayOut(sock[0]).at(-1).type, 'rtc.refused');
  bare.close();

  const hw = mk(FakePC); const c = hw.get('circuit'); c.connect();
  const ws = sock[1]; ws.onopen();
  is('a board with the library says so in its hello', relayOut(ws).find((m) => m.type === 'board.hello').direct, true);
  ws.onmessage({ data: JSON.stringify({ type: 'rtc.offer', peer: 'page1', sdp: 'v=0 offer', from: 'p' }) });
  is('an offer makes a peer', pcs.length, 1);
  is('with a STUN server, so a board off the LAN has a public candidate', pcs[0].cfg.iceServers.some((x) => x.startsWith('stun:')), true);
  const ans = relayOut(ws).find((m) => m.type === 'rtc.answer');
  is('the answer goes back into the room, addressed to that peer', [ans?.peer, ans?.sdp], ['page1', 'v=0 answer']);
  is('and so does the board\'s candidate', relayOut(ws).some((m) => m.type === 'rtc.candidate' && m.peer === 'page1'), true);
  ws.onmessage({ data: JSON.stringify({ type: 'rtc.candidate', peer: 'page1', cand: 'candidate:9 1 udp 1 x.local 1 typ host', mid: '0', from: 'p' }) });
  is('the page\'s candidate reaches its peer', pcs[0].cands.length, 1);
  ws.onmessage({ data: JSON.stringify({ type: 'rtc.candidate', peer: 'other', cand: 'candidate:9', mid: '0', from: 'q' }) });
  is('a candidate for nobody here is ignored', pcs[0].cands.length, 1);

  const { pcm, ctl } = pcs[0].channels();
  is('ctl opens with the frame length on this path', [ctl.out[0].type, ctl.out[0].frameMs], ['rtc.hello', 10]);
  const before = relayOut(ws).length;
  ctl.recv(JSON.stringify({ type: 'midi.send', id: 'a', n: 1, bytes: [0x90, 60, 100] }));
  is('a note over ctl reaches the instrument', writes.at(-1), [0x90, 60, 100]);
  ctl.recv(JSON.stringify({ type: 'midi.send', id: 'b', n: 2, bytes: [0xF0, 0x7E, 0x7F] }));
  // negative control for the gate: the same message over the relay is refused too, above
  is('SysEx over ctl never reaches the instrument', writes.length, 1);
  is('and the refusal comes back on ctl', ctl.out.at(-1).type, 'midi.refused');
  is('not into the relay room', relayOut(ws).length, before);
  ctl.recv(JSON.stringify({ type: 'midi.send', id: 'c', n: 4, bytes: [0x80, 62, 0] }));
  ctl.recv(JSON.stringify({ type: 'midi.send', id: 'd', n: 3, bytes: [0x90, 62, 100] }));
  is('a note on that arrives after its own note off is dropped', writes.some((w) => w[0] === 0x90 && w[1] === 62), false);
  ctl.recv(JSON.stringify({ type: 'rtc.offer', peer: 'sneaky', sdp: 'v=0' }));
  is('ctl cannot open another peer', pcs.length, 1);
  ctl.recv(JSON.stringify({ type: 'input.want', id: 'w' }));
  is('input.want over ctl starts the capture', spawned.length, 1);
  is('and answers on ctl', ctl.out.at(-1).type, 'input.wanted');

  // frame 4 at 200 Hz: 20 ms a frame and a 10 ms unit, as on the board
  const frame = (a) => spawned[0].stdout.emit('data', Buffer.from(new Int16Array(a.flatMap((x) => [x, 7])).buffer));
  frame([1, 2]);
  const bins = () => pcm.out.filter((x) => Buffer.isBuffer(x));
  const relayBins = () => ws.sent.filter((x) => Buffer.isBuffer(x));
  is('half a frame goes direct as soon as it exists', bins().length, 1);
  is('and the relay waits for the whole frame', relayBins().length, 0);
  frame([3, 4]);
  is('the relay gets its whole frame from two halves', [...new Int16Array(relayBins()[0].buffer.slice(relayBins()[0].byteOffset + 12, relayBins()[0].byteOffset + relayBins()[0].length))], [1, 2, 3, 4]);
  const d = bins()[1];
  is('a direct frame carries one channel, the same 12 byte header', [d.readUInt32LE(0), ...new Int16Array(d.buffer.slice(d.byteOffset + 12, d.byteOffset + d.length))], [1, 3, 4]);
  pcm.backlog = 1 << 20; frame([5, 6]);
  is('a peer that is not draining loses the frame rather than queueing it', bins().length, 2);
  pcm.backlog = 0;

  // a second peer asking for 20 ms frames gets whole frames
  ws.onmessage({ data: JSON.stringify({ type: 'rtc.offer', peer: 'page2', sdp: 'v=0', frameMs: 20, from: 'q' }) });
  const two = pcs[1].channels();
  is('a page may ask for the longer frame', two.ctl.out[0].frameMs, 20);

  // the cap
  for (const k of [3, 4]) ws.onmessage({ data: JSON.stringify({ type: 'rtc.offer', peer: `page${k}`, sdp: 'v=0', from: 'q' }) });
  ws.onmessage({ data: JSON.stringify({ type: 'rtc.offer', peer: 'page5', sdp: 'v=0', from: 'q' }) });
  is(`a peer past ${MAX_PEERS} is refused and told to use the relay`, [pcs.length, relayOut(ws).at(-1).type], [MAX_PEERS, 'rtc.refused']);

  // a held note from a peer that goes quiet
  ctl.recv(JSON.stringify({ type: 'midi.send', id: 'e', n: 5, bytes: [0x91, 67, 100] }));
  c.handle({ type: 'midi.send', id: 'r', bytes: [0x92, 70, 100] });   // somebody on the relay
  c.handle({ type: 'input.want', id: 'w' });
  t += 61_000; c.s.lastHeard = t; two.ctl.recv(JSON.stringify({ type: 'rtc.ping', id: 'k', t: 1 }));
  c.handle({ type: 'input.want', id: 'w2' });
  c.beat();
  is('a peer silent for a minute is closed', pcs[0].closed, true);
  is('the peer that kept talking stays', pcs[1].closed, false);
  is('the quiet peer\'s held note is released', writes.some((w) => w[0] === 0x81 && w[1] === 67), true);
  is('and nobody else\'s is', writes.some((w) => w[0] === 0x82 && w[1] === 70), false);
  hw.close();
  is('closing the board closes every peer', pcs.every((p) => p.closed), true);
}

console.log(`\n${pass}/${pass + fail} green`);
process.exit(fail ? 1 : 0);
