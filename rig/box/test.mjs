// rig/box/test.mjs — the patchbay's checks, against a fixture, no hardware.
//
// Everything the box does BEFORE it touches a rig — parse, name, validate — is
// pure, so it is checkable on a laptop. What is left needing the board is
// exactly: real ports, real sound, unattended boot. Those are named in the
// README rather than faked here, because a fake that passes is worse than a
// gap that is written down.
import { parseAconnect, addressable, resolve, plan, apply, listPorts, CARRY } from './alsa.mjs';
import { readFileSync } from 'node:fs';

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

console.log(`\n${pass}/${pass + fail} green`);
process.exit(fail ? 1 : 0);
