// proto/looper/peer-test.mjs: three peers in one room, with no browser and no relay.
//
//   node proto/looper/peer-test.mjs
//
// THE BUG THIS FILE WAS WRITTEN FOR (BACKLOG, 2026-10-12, found on
// /concepts/clock/080/): a pong was matched to its ping by `seq` alone, and
// every peer counts its seqs from 1. A room relays every message to every
// other socket, so with three peers in it, B's pong to A's ping #3 also reaches
// C, and C, holding a ping #3 of its own, took it as its answer. That sample
// pairs C's send time with B's stamp of a moment A chose, so its offset and
// round trip are wrong by however far apart A and C pinged, and C's real
// answers to its #3 then arrived to an empty slot and were dropped. A ping is
// also answered by EVERY other peer, and the first answer deleted the slot, so
// with three in a room each ping could only ever measure one of the two. /concepts/clock/070/ puts three peers in one room.
//
// The room here is a bus with a virtual clock: every message reaches every
// OTHER member after exactly DELAY ms, so every honest sample has a round trip
// of exactly 2 * DELAY and the offset to each peer is the skew injected. Any
// sample that is not is a stolen pong, which is what makes the stolen pong
// countable rather than a matter of tolerance.
//
// TWELVE OF THE 23 ARE NEGATIVE CONTROLS, marked and counted. MEASURED
// 2026-10-12 against the module as it was BEFORE the fix: 12/23, 11 red. And
// four sabotages of the fix, each on a copy, 23/23 before every one:
//
//   S1  the `to` guard removed from onPong                  2 red
//   S2  the echoed t0 no longer compared                    2 red
//   S3  the slot deleted on the first answer, as before     8 red
//   S4  the pong sent without `to`                          2 red
//
// S1 and S4 are red only in the last section (two peers on one clock), and S2
// only in the old-peer section: each guard covers a case the other cannot.
//
// WHAT IS NOT GRADED HERE: a real relay, jitter, loss. rig/peer.mjs
// --self-test covers the two-peer estimator over a jittery lossy pair.

import { createPeer } from './peer.mjs';

let pass = 0, fail = 0, neg = 0;
const ok = (name, cond, detail = '') => {
  if (name.startsWith('NEGATIVE CONTROL')) neg++;
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ', ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ', ' + detail : ''}`); }
};

const DELAY = 7;

/** A room: every send reaches every other member after DELAY virtual ms. */
function makeRoom({ strip = null, delay = () => DELAY } = {}) {
  let t = 0;
  const q = [];
  const members = [];
  const advance = (ms) => {
    const end = t + ms;
    while (true) {
      q.sort((x, y) => x.at - y.at || x.n - y.n);
      if (!q.length || q[0].at > end) break;
      const e = q.shift();
      t = e.at;
      e.fn();
    }
    t = end;
  };
  let n = 0;
  const transport = (name) => {
    const me = { name, cbs: [] };
    members.push(me);
    return {
      send(obj) {
        let wire = JSON.parse(JSON.stringify(obj));
        if (strip && strip(name, wire)) wire = strip(name, wire);
        for (const m of members) {
          if (m === me) continue;
          const copy = JSON.parse(JSON.stringify(wire));
          q.push({ at: t + delay(name, m.name), n: n++, fn: () => { for (const cb of m.cbs) cb(copy); } });
        }
      },
      onMessage(cb) { me.cbs.push(cb); },
      close() { me.cbs.length = 0; },
    };
  };
  return { transport, advance, now: () => t };
}

const BASE = 1_760_000_000_000;
const SKEW = { a: 0, b: 41.25, c: -73.5 };

function threePeers(opts = {}) {
  const room = makeRoom(opts);
  // every socket is in the room before anybody speaks, so every opening burst
  // reaches both others and the expected counts below are exact
  const ts = { a: room.transport('a'), b: room.transport('b'), c: room.transport('c') };
  const mk = (id) => createPeer({ id, transport: ts[id], now: () => BASE + room.now() + SKEW[id], pingEveryMs: 0 });
  const peers = { a: mk('a'), b: mk('b'), c: mk('c') };
  return { room, peers };
}

/** every skew sample one peer kept a log line for, honest or not */
const samples = (p) => p.log.filter((e) => e.type === 'skew');
/** a sample is honest when its round trip is the bus's and its offset is the injected skew */
const honest = (self, s) => Math.abs(s.rtt - 2 * DELAY) < 1e-6 && Math.abs(s.offset - (SKEW[s.peer] - SKEW[self])) < 1e-6;

console.log('\n== three peers, all counting from 1, one room ==');
{
  const { room, peers } = threePeers();
  for (let r = 0; r < 3; r++) { for (const p of Object.values(peers)) p.ping(); room.advance(100); }

  for (const [id, p] of Object.entries(peers)) {
    const all = samples(p);
    const bad = all.filter((s) => !honest(id, s));
    ok(`NEGATIVE CONTROL ${id} kept no stolen pong`, bad.length === 0,
      `${all.length} samples, ${bad.length} not its own${bad.length ? ` (first: from ${bad[0].peer}, rtt ${bad[0].rtt}, offset ${bad[0].offset})` : ''}`);
  }

  // every ping a peer sent was heard by both others and both answered it, so
  // each of the other two contributed one sample per ping sent
  for (const [id, p] of Object.entries(peers)) {
    const sent = 3 * 5 + 5 + 2 * 5;      // three manual bursts, the opening burst, one burst per newly seen peer
    for (const other of Object.keys(peers).filter((k) => k !== id)) {
      const got = samples(p).filter((s) => s.peer === other).length;
      ok(`NEGATIVE CONTROL ${id} heard every one of its ${sent} pings answered by ${other}`, got === sent, `${got} samples`);
    }
  }

  // c is the peer this used to break: a is the reference (lowest id), so c's
  // correction must be a's clock minus c's, exactly
  ok('c agrees with the reference a', Math.abs(peers.c.offsetMs() - (SKEW.a - SKEW.c)) < 1e-6, `${peers.c.offsetMs()} ms`);
  ok('b agrees with the reference a', Math.abs(peers.b.offsetMs() - (SKEW.a - SKEW.b)) < 1e-6, `${peers.b.offsetMs()} ms`);
  ok('a, the reference, corrects by nothing', peers.a.offsetMs() === 0);
  for (const [id, p] of Object.entries(peers)) {
    ok(`${id} measured the bus's round trip to everyone`, p.peers().every((q) => Math.abs(q.rttMs - 2 * DELAY) < 1e-6),
      p.peers().map((q) => `${q.id} ${q.rttMs}`).join(', '));
  }
  for (const p of Object.values(peers)) p.dispose();
}

console.log('\n== a newcomer after two peers have been talking ==');
{
  // 080's shape: a and b have used seqs already, then c arrives counting from 1
  const room = makeRoom();
  const mk = (id) => createPeer({ id, transport: room.transport(id), now: () => BASE + room.now() + SKEW[id], pingEveryMs: 0 });
  const a = mk('a'), b = mk('b');
  room.advance(100);
  const c = mk('c');
  for (let r = 0; r < 2; r++) { a.ping(); b.ping(); c.ping(); room.advance(100); }
  const bad = samples(c).filter((s) => !honest('c', s));
  ok('NEGATIVE CONTROL the newcomer kept no stolen pong', bad.length === 0, `${samples(c).length} samples, ${bad.length} not its own`);
  ok('the newcomer has five samples of the reference at least', (c.peers().find((p) => p.id === 'a')?.samples ?? 0) >= 5,
    `${c.peers().find((p) => p.id === 'a')?.samples ?? 0}`);
  ok('the newcomer agrees with the reference', Math.abs(c.offsetMs() - (SKEW.a - SKEW.c)) < 1e-6, `${c.offsetMs()} ms`);
  a.dispose(); b.dispose(); c.dispose();
}

console.log('\n== an old peer in the room, whose pongs carry no `to` ==');
{
  // A peer still running the code from before the fix answers without `to`.
  // Its answers to OUR pings must still count, and its answers to somebody
  // else's must still not.
  const strip = (from, m) => (from === 'b' && m.type === 'pong' ? (delete m.to, m) : null);
  const { room, peers } = threePeers({ strip });
  // staggered, so b's answer to a's ping #k reaches c while c is waiting on a
  // #k of its own sent 3 ms later: a stolen sample would read a round trip of
  // 11 ms, not 14, and the honesty test can see it
  for (let r = 0; r < 3; r++) { peers.a.ping(); room.advance(3); peers.c.ping(); room.advance(100); }
  const fromB = samples(peers.c).filter((s) => s.peer === 'b');
  ok('an old peer\'s answers to our pings still count', fromB.length > 0 && fromB.every((s) => honest('c', s)), `${fromB.length} samples from b`);
  const bad = ['a', 'c'].flatMap((id) => samples(peers[id]).filter((s) => s.peer === 'b' && !honest(id, s)));
  ok('NEGATIVE CONTROL an old peer\'s answers to somebody else are not taken', bad.length === 0, `${bad.length} stolen`);
  ok('c still agrees with the reference', Math.abs(peers.c.offsetMs() - (SKEW.a - SKEW.c)) < 1e-6, `${peers.c.offsetMs()} ms`);
  for (const p of Object.values(peers)) p.dispose();
}

console.log('\n== two peers on one clock, pinging in the same instant ==');
{
  // Two tabs on one machine read the same epoch clock, so they can send the
  // same seq with the SAME t0, and then the echoed t0 cannot tell their pongs
  // apart: only `to` can. The links are uneven (a to b 7 ms each way, a2 to b
  // 12 ms) so a stolen answer reads the wrong round trip and can be seen.
  const one = { a: 7, a2: 12 };
  const delay = (from, to) => one[from] ?? one[to] ?? DELAY;
  const room = makeRoom({ delay });
  const ts = { a: room.transport('a'), a2: room.transport('a2'), b: room.transport('b') };
  const clock = { a: 0, a2: 0, b: 41.25 };
  const mk = (id) => createPeer({ id, transport: ts[id], now: () => BASE + room.now() + clock[id], pingEveryMs: 0 });
  const peers = { a: mk('a'), a2: mk('a2'), b: mk('b') };
  room.advance(200);
  for (let r = 0; r < 3; r++) { peers.a.ping(); peers.a2.ping(); room.advance(100); }
  const rtt = (id, s) => s.peer === 'b' ? 2 * one[id] : (one[id] ?? DELAY) + (one[s.peer] ?? DELAY);
  const bad = ['a', 'a2'].flatMap((id) => samples(peers[id]).filter((s) => s.peer === 'b' && Math.abs(s.rtt - rtt(id, s)) > 1e-6));
  ok('NEGATIVE CONTROL a pong naming one peer is not taken by its twin', bad.length === 0,
    `${bad.length} stolen${bad.length ? ` (first rtt ${bad[0].rtt})` : ''}`);
  ok('both twins measured b over their own link', peers.a.peers().find((q) => q.id === 'b')?.rttMs === 14 && peers.a2.peers().find((q) => q.id === 'b')?.rttMs === 24,
    `a ${peers.a.peers().find((q) => q.id === 'b')?.rttMs}, a2 ${peers.a2.peers().find((q) => q.id === 'b')?.rttMs}`);
  for (const p of Object.values(peers)) p.dispose();
}

console.log(`\n${pass}/${pass + fail} passed, ${neg} of them negative controls${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
