// demo/shell/bay-node-test.mjs: a page as a patchbay node, against a relay that
// lives in this file, with no socket, no browser and no studio.
//
//   node demo/shell/bay-node-test.mjs
//
// Step 1 of `plans/plan-routing-migration.md`. What is graded here is what the
// three hand copies got wrong between them: which room, whether anything opens
// before a press, which site, and who answers a `link.request`.
//
// MOST OF THESE ARE NEGATIVE CONTROLS, for the reason `bay-test.mjs` gives: a
// node that joined on load and announced everywhere would pass every positive
// check below. Each NEGATIVE CONTROL has to see something NOT happen: a socket
// not opened, a room not reached, a request not answered.
//
// ⚠️ WHAT IS NOT GRADED HERE: the real relay (`openWire` is replaced by
// `fakeRelay`), and whether a page calls `join()` only from a press. The pages
// assert that themselves (`/patchbay/`, `/partitur/`: *building joined nothing*).

import { createBayNode, roomFor, randomSite, STUDIO_ROOM, REANNOUNCE_MS, ROOM_RE } from './bay-node.mjs';
import { STALE_MS } from './graph-registry.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

/**
 * A relay in memory with `openWire`'s shape: `open(room, { onOpen, onMessage })`
 * answers `{ send, close }`, opens on the next turn, and delivers every message
 * to every socket in the room, the sender included, as the real relay echoes.
 */
function fakeRelay() {
  const rooms = new Map();
  const opened = [];
  let n = 0;
  function open(room, { onOpen = () => {}, onMessage = () => {} } = {}) {
    const sock = { room, from: `s${++n}`, closed: false, onMessage };
    opened.push(room);
    if (!rooms.has(room)) rooms.set(room, new Set());
    setTimeout(() => { if (!sock.closed) { rooms.get(room).add(sock); onOpen(sock.from); } }, 1);
    return {
      send(msg) {
        if (sock.closed) return null;
        const out = { ...msg, from: sock.from };
        for (const s of rooms.get(room)) setTimeout(() => !s.closed && s.onMessage({ kind: 'json', msg: out }), 1);
        return { sent: true };
      },
      close() { sock.closed = true; rooms.get(room).delete(sock); },
      /** A reconnect: the same socket object opens again under a new `from`. */
      reopen() { sock.from = `s${++n}`; setTimeout(() => onOpen(sock.from), 1); },
    };
  }
  return { open, opened, inRoom: (room) => rooms.get(room)?.size || 0 };
}
const graph = (site, ports = []) => ({ v: 1, site, place: 'browser', nodes: [{ id: `${site}:n`, kind: 'screen', label: site, place: 'browser' }],
  ports: ports.map(([p, dir, medium]) => ({ id: `${site}:n:${p}`, label: p, dir, medium })) });

{
  // 1. The room.
  ok('a page with ?room= joins that room', roomFor({ search: '?room=patchbay-test-abc123' }) === 'patchbay-test-abc123');
  ok('a person with no ?room= joins the studio', roomFor({ search: '' }) === STUDIO_ROOM && STUDIO_ROOM === 'studio-1');
  const own = roomFor({ slug: 'patchbay', search: '?selfcheck=1' });
  ok('a harness with no ?room= gets a room of the run\'s own, never the studio',
    own !== STUDIO_ROOM && own.startsWith('patchbay-test-') && ROOM_RE.test(own), own);
  ok('and every ask from one page gets the same one, so two tabs of a page meet there',
    roomFor({ slug: 'patchbay', search: '?selfcheck=2' }) === own);
  /* NEGATIVE CONTROLS */
  ok('NEGATIVE CONTROL: a harness that does pass ?room= gets that room, not a new one',
    roomFor({ slug: 'patchbay', search: '?selfcheck=1&room=given-1' }) === 'given-1');
  ok('NEGATIVE CONTROL: a ?room= the relay would refuse is not passed on',
    roomFor({ search: '?room=../../etc' }) === STUDIO_ROOM && roomFor({ search: `?room=${'x'.repeat(65)}` }) === STUDIO_ROOM);
  ok('NEGATIVE CONTROL: selfcheck=0 is a person, and a person gets the studio', roomFor({ search: '?selfcheck=0' }) === STUDIO_ROOM);
  let threw = '';
  try { createBayNode({ room: '' }); } catch (e) { threw = e.message; }
  ok('NEGATIVE CONTROL: a node with no room throws rather than joining somewhere by default', /room/.test(threw), threw);
}

{
  // 2. A site per tab.
  const a = randomSite('web'), b = randomSite('web');
  ok('a site is the prefix and four characters, new on every call', /^web-[a-z0-9]{4}$/.test(a) && a !== b, `${a} ${b}`);
}

{
  // 3. Nothing on load; one socket on join; the announce and the ask.
  const relay = fakeRelay();
  const A = createBayNode({ room: 'r1', graphs: [graph('web-aaaa', [['keys', 'out', 'midi']])], wire: relay.open });
  await tick(10);
  ok('NEGATIVE CONTROL: building a node opens no socket and starts no clock', relay.opened.length === 0 && !A.joined() && !A.joining()
    && !A.stats().ticking);
  ok('and its own graph is already in its own registry, so a page draws itself before joining',
    A.registry.merged().sites.some((s) => s.site === 'web-aaaa'));
  ok('NEGATIVE CONTROL: and announce and request before a join send nothing', A.announce() === 0 && A.send({ type: 'x' }) === false
    && (await A.request('a:b:c', 'd:e:f', true, { timeoutMs: 5 })) === null);
  const B = createBayNode({ room: 'r1', graphs: [graph('web-bbbb', [['screen', 'in', 'audio']])], wire: relay.open });
  const C = createBayNode({ room: 'r2', graphs: [graph('web-cccc')], wire: relay.open });
  const fromA = await A.join();
  await A.join();
  ok('join opens one socket however many times it is called', relay.opened.length === 1 && A.joined() && typeof fromA === 'string');
  await B.join(); await C.join();
  await tick(20);
  ok('a node joining hears what is already in the room, because it asks', B.registry.merged().sites.some((s) => s.site === 'web-aaaa'));
  ok('and what is in the room hears it', A.registry.merged().sites.some((s) => s.site === 'web-bbbb'));
  ok('NEGATIVE CONTROL: a node in another room hears neither, and neither hears it',
    !C.registry.merged().sites.some((s) => /aaaa|bbbb/.test(s.site)) && !A.registry.merged().sites.some((s) => s.site === 'web-cccc'));
  const before = A.stats().announced;
  B.ask();
  await tick(20);
  ok('a graph.ask from another page is answered with an announce', A.stats().announced === before + 1,
    `${before} then ${A.stats().announced}`);
}

{
  // 4. Again on a clock, and again on a reconnect; nothing after a leave.
  const relay = fakeRelay();
  let wire = null;
  const open = (room, o) => (wire = relay.open(room, o));
  const A = createBayNode({ room: 'r3', graphs: [graph('web-dddd')], wire: open, reannounceMs: 20 });
  await A.join();
  const at0 = A.stats().announced;
  await tick(70);
  ok('a joined node announces again on its own clock', A.stats().announced >= at0 + 2, `${at0} then ${A.stats().announced}`);
  ok('and the real clock is inside the stale window, so a joined page is never drawn stale',
    REANNOUNCE_MS < STALE_MS, `${REANNOUNCE_MS} against ${STALE_MS}`);
  const first = A.me();
  const atR = A.stats().announced;
  wire.reopen();
  await tick(10);
  ok('a reconnect is a new from, and it announces under it', A.me() !== first && A.stats().announced > atR, `${first} then ${A.me()}`);
  A.leave();
  const atL = A.stats().announced;
  await tick(70);
  ok('NEGATIVE CONTROL: after a leave nothing is announced, the clock is stopped and the node is not joined',
    A.stats().announced === atL && !A.stats().ticking && !A.joined() && relay.inRoom('r3') === 0, `${atL} then ${A.stats().announced}`);
  await A.join();
  ok('and it can join again', A.joined() && relay.inRoom('r3') === 1);
  A.leave();
}

{
  // 5. link.request and link.state.
  const relay = fakeRelay();
  const asks = [];
  const owner = createBayNode({ room: 'r4', graphs: [graph('lane-1', [['light', 'out', 'value']])], wire: relay.open,
    onLinkRequest: (m) => { asks.push(m); return m.target === 'wall-1:n:bad' ? { ok: false, why: 'that wall is not a light' } : { ok: true }; } });
  const shy = createBayNode({ room: 'r4', graphs: [graph('shy-1', [['keys', 'out', 'midi']])], wire: relay.open });
  const asker = createBayNode({ room: 'r4', graphs: [graph('web-eeee')], wire: relay.open });
  await owner.join(); await shy.join(); await asker.join();
  await tick(10);
  const yes = await asker.request('lane-1:n:light', 'wall-1:n:light', true, { timeoutMs: 200 });
  ok('a link.request about a page\'s own port is answered by that page with link.state',
    yes?.type === 'link.state' && yes.open === true && asks.length === 1 && asks[0].open === true, JSON.stringify(yes));
  const no = await asker.request('lane-1:n:light', 'wall-1:n:bad', true, { timeoutMs: 200 });
  ok('and a refusal comes back closed, with the page\'s own words', no?.open === false && no.why === 'that wall is not a light',
    JSON.stringify(no));
  const shut = await asker.request('lane-1:n:light', 'wall-1:n:light', false, { timeoutMs: 200 });
  ok('a close is asked the same way and answers closed', shut?.open === false && asks.at(-1).open === false);
  const unhandled = await asker.request('shy-1:n:keys', 'x:y:z', true, { timeoutMs: 200 });
  ok('a page with no handler still answers, and refuses in words rather than going quiet',
    unhandled?.open === false && /a person here opens it/.test(unhandled.why || ''), JSON.stringify(unhandled));
  /* NEGATIVE CONTROLS */
  const n0 = asks.length;
  const nobody = await asker.request('ghost-1:n:out', 'x:y:z', true, { timeoutMs: 60 });
  ok('NEGATIVE CONTROL: a request about a port nobody owns is answered by nobody, and says so with null',
    nobody === null && asks.length === n0);
  const stats = owner.stats().answered;
  shy.send({ type: 'link.request', source: 'shy-1:n:keys', target: 'a:b:c', open: true });
  await tick(20);
  ok('NEGATIVE CONTROL: a page does not answer for another page\'s port', owner.stats().answered === stats && asks.length === n0);
  ok('owns is true of a page\'s own sites and of nothing else',
    owner.owns('lane-1:n:light') && !owner.owns('shy-1:n:keys') && !owner.owns(''));
}

{
  // 6. Graphs kept local, and graphs changed.
  const relay = fakeRelay();
  const store = { v: 1, site: 'r2', place: 'cloudflare', nodes: [], ports: [{ id: 'r2:rec:in', dir: 'in', medium: 'audio' }] };
  const A = createBayNode({ room: 'r5', graphs: [graph('web-ffff')], local: [store], wire: relay.open });
  const B = createBayNode({ room: 'r5', graphs: [graph('web-gggg')], wire: relay.open });
  await A.join(); await B.join(); await tick(10);
  ok('a local graph is in its own page\'s registry', A.registry.merged().sites.some((s) => s.site === 'r2'));
  ok('NEGATIVE CONTROL: and is never sent to the room', !B.registry.merged().sites.some((s) => s.site === 'r2'));
  A.setGraphs([graph('web-ffff', [['keys', 'out', 'midi']]), graph('cam-ffff')]);
  await tick(10);
  const heardB = B.registry.merged();
  ok('a page that becomes two sites is heard as two, from one socket',
    heardB.sites.filter((s) => /ffff/.test(s.site)).length === 2 && heardB.ports.some((p) => p.id === 'web-ffff:n:keys'),
    heardB.sites.map((s) => s.site).join(', '));
  A.leave();
  ok('a leave forgets what other pages said, and keeps the page\'s own',
    !A.registry.merged().sites.some((s) => s.site === 'web-gggg') && A.registry.merged().sites.some((s) => s.site === 'web-ffff'));
  B.leave();
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);
