// demo/shell/announce-test.mjs: a page's announce, in the registry's shape, with no socket,
// no browser and no studio. `node demo/shell/announce-test.mjs`. 9 of 21 are negative controls.
// why: lessons/kit-announce.md#test-header

import { pageGraph, announceOn, mayAnnounce } from './announce.mjs';
import { graphProblem, createRegistry, BOARD_SITE } from './graph-registry.mjs';
import { createBay } from './bay.mjs';
import { DEFAULT_RELAY } from './wire.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pageBay() {
  const b = createBay();
  b.addNode({ id: 'web:keys', kind: 'person', label: 'keyboard' });
  b.addPort({ id: 'web:keys:midi-out', dir: 'out', medium: 'midi', emits: ['note'] });
  b.addPort({ id: 'web:keys:midi-in', dir: 'in', medium: 'midi', accepts: ['note'], deliver: () => {} });
  b.addNode({ id: 'web:speaker', kind: 'endpoint', label: 'speaker' });
  b.addPort({ id: 'web:speaker:audio-in', dir: 'in', medium: 'audio' });
  b.addNode({ id: `${BOARD_SITE}:circuit`, kind: 'device', label: 'Circuit on the Pi', place: 'studio-1' });
  b.addPort({ id: `${BOARD_SITE}:circuit:midi-in`, dir: 'in', medium: 'midi', accepts: ['note'], never: ['sysex'] });
  return b;
}

console.log('pageGraph');
const bay = pageBay();
const { graph: g, dropped } = pageGraph(bay, { site: 'web-a1b', label: 'Circuit on Pi' });
ok('the announce is a graph graphProblem reads', graphProblem(g) === '', graphProblem(g) || 'no problem');
ok('it is a browser site with the page\'s name', g.kind === 'browser' && g.label === 'Circuit on Pi' && g.site === 'web-a1b');
ok('every own node is there under the tab\'s site', g.nodes.map((n) => n.id).sort().join() === 'web-a1b:keys,web-a1b:speaker');
ok('every own port is there, with its medium and direction',
  g.ports.length === 3 && g.ports.every((p) => p.id.startsWith('web-a1b:') && p.medium && p.dir), g.ports.map((p) => p.id).join(' '));
ok('accepts and emits travel with a port', g.ports.find((p) => p.id.endsWith('keys:midi-out')).emits?.[0] === 'note'
  && g.ports.find((p) => p.id.endsWith('keys:midi-in')).accepts?.[0] === 'note');
ok('nothing was dropped', dropped.length === 0, dropped.join(' '));
const reg = createRegistry();
ok('a registry takes it as a graph.announce', reg.ingest({ type: 'graph.announce', from: 's1', graph: g }) && reg.merged().nodes.length === 2);
ok('NEGATIVE CONTROL: the Pi\'s nodes the page draws are not announced as the page\'s',
  !g.nodes.some((n) => n.id.includes('circuit')) && !g.ports.some((p) => p.id.includes('circuit')));
ok('NEGATIVE CONTROL: no function and no counter leaves the page', !JSON.stringify(g).includes('deliver')
  && !g.ports.some((p) => 'heard' in p || 'seenAt' in p) && JSON.stringify(JSON.parse(JSON.stringify(g))) === JSON.stringify(g));
const raw = { v: 1, site: 'web-a1b', kind: 'browser', nodes: bay.nodes().map((n) => ({ id: n.id, kind: n.kind })), ports: [] };
ok('NEGATIVE CONTROL: the bay as it stands, ids not rewritten, is refused by graphProblem', graphProblem(raw) !== '', graphProblem(raw));
ok('NEGATIVE CONTROL: two tabs are two sites, never one', pageGraph(bay).graph.site !== pageGraph(bay).graph.site);

console.log('mayAnnounce');
ok('a person\'s visit may announce', mayAnnounce('', DEFAULT_RELAY) === true);
ok('a check against a stand-in may announce', mayAnnounce('?selfcheck=1', 'ws://127.0.0.1:8897') === true);
ok('NEGATIVE CONTROL: a check against the real relay may not', mayAnnounce('?selfcheck=1', DEFAULT_RELAY) === false
  && mayAnnounce('?selfcheck=2', DEFAULT_RELAY) === false);

console.log('announceOn');
function fakeBoard() {
  const sent = [];
  let state = 0, from = 'f1';
  return {
    sent, open: () => { state = 1; }, reconnect: () => { from = `f${Number(from.slice(1)) + 1}`; },
    wire: { state: () => state, stats: () => ({ from }), send: (m) => (state === 1 ? (sent.push(m), { sent: true }) : null) },
    closed: 0, close() { this.closed++; state = 3; },
  };
}
{
  const fb = fakeBoard();
  const a = announceOn(fb, bay, { pollMs: 5, everyMs: 60, may: true, site: 'web-z9z', label: 't' });
  await sleep(30);
  ok('NEGATIVE CONTROL: nothing is sent before the socket is open', fb.sent.length === 0);
  fb.open(); await sleep(20);
  ok('one announce as the socket opens', fb.sent.length === 1 && fb.sent[0].type === 'graph.announce' && fb.sent[0].graph.site === 'web-z9z');
  await sleep(15);
  ok('NEGATIVE CONTROL: not again inside everyMs', fb.sent.length === 1, `${fb.sent.length} sent`);
  fb.reconnect(); await sleep(20);
  ok('a reconnect is a new announce at once', fb.sent.length === 2);
  await sleep(80);
  ok('again after everyMs, under STALE_MS', fb.sent.length >= 3, `${fb.sent.length} sent`);
  fb.close();
  const n = fb.sent.length;
  await sleep(40);
  ok('closing the board stops it and still closes the board', !a.stats().ticking && fb.closed === 1 && fb.sent.length === n);
}
{
  const fb = fakeBoard();
  fb.open();
  const a = announceOn(fb, bay, { pollMs: 5, may: false });
  await sleep(30);
  ok('NEGATIVE CONTROL: a run that may not announce sends nothing, and says it held one', fb.sent.length === 0 && a.stats().held === 1);
  fb.close();
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
