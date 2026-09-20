#!/usr/bin/env node
// rig/peer.mjs — a machine on the shared clock, with no browser.
//
//   node rig/peer.mjs --room jam-demo
//   node rig/peer.mjs --room jam-demo --id pi --seconds 60
//   node rig/peer.mjs --self-test          # no network, no room, proves the math
//
// ⚠️ `rig/m1/skew.mjs` GOT HERE FIRST, on 2026-09-10, with the same insight
// that peer.mjs runs in node — and it is what produced HANDOFF item 0's ~3 ms
// real-link figure. Keep both, and know which is which: THAT one is a
// measurement run, two machines for 180 s, and its numbers are cited. THIS one
// is the demo-facing peer — it joins and stays, names itself after the machine
// so a roster reads `raspberrypi 3.1 ms away`, and carries a `--self-test` with
// an injected skew so the estimator can be graded with no network at all.
// ⚠️ If they start to disagree about anything, the measurement tool wins.
//
// WHY THIS EXISTS. `jam` says "open this page a second time — in another tab,
// or on a phone". Two tabs on one machine share a clock by construction, so the
// thing the page exists to measure cannot be wrong there: the skew estimator
// has nothing to estimate. 🔴 Every number this project has for peer-to-peer
// skew is therefore LOOPBACK, and `HANDOFF.md` has carried "min-RTT skew over a
// real link" as unmeasured since it was written. `plans/plan-jam.md` P1.
//
// 🔴 AND IT NEEDED NO NEW PROTOCOL. `proto/looper/peer.mjs` is DOM-free by
// design — a transport is two functions — and `wsTransport` uses only the
// standard `WebSocket`, which node has had globally since 22. VERIFIED before
// this file was written rather than after: `node -e "typeof WebSocket"` answers
// `function`. So the Raspberry Pi and the studio Mac can be real peers, and the
// demo stops being "open this page twice" and becomes a browser in one building
// and a board in another, on one pulse.
//
// ⚠️ WHAT THIS CANNOT TELL YOU, said here because the number is the point.
// The offset printed below is the estimator's OWN answer. It is not a
// measurement of how right the estimator is — a clock cannot grade itself, and
// reading agreement off the thing being graded is the circularity `plans/plan-jam.md`
// §4 P3 exists to avoid. What this DOES give honestly is the round trip, which
// is measured entirely at this machine on one clock, and the estimator's
// convergence, which is a fact about the estimator.

import { createPeer, wsTransport } from '../proto/looper/peer.mjs';

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const ROOM = flag('room', 'jam-demo');
const BASE = flag('base', 'wss://ws.positron.studio');
const SECONDS = Number(flag('seconds', '0')) || 0;      // 0 = until interrupted
const EVERY = Number(flag('every', '2')) || 2;

// ⚠️ A DEFAULT ID THAT IS THE MACHINE'S NAME, not a random string. `jam` gives
// browsers random ids because a browser is anonymous; a board is not, and a
// roster reading `raspberrypi 3.1 ms away` is the thing somebody wants to see.
// It still falls back to a random suffix, because two Pis would otherwise elect
// each other reference by a coin toss nobody can see.
const { hostname } = await import('node:os');
const ID = flag('id', `${hostname().split('.')[0]}-${Math.random().toString(36).slice(2, 5)}`);

// ---------------------------------------------------------------------------
// --self-test: the estimator, against a link whose skew we CHOSE
// ---------------------------------------------------------------------------
//
// 🔴 A CHECK THAT CANNOT FAIL IS NOT A CHECK. This drives two peers through an
// in-process transport pair with an INJECTED delay and an INJECTED clock
// offset, so the right answer is known in advance and the estimator either
// finds it or does not. `pairTransports` is already in peer.mjs for exactly
// this; the negative control it makes possible is the one recorded in
// plan-uuu-local §4 — with the correction off, the flam is EXACTLY the
// injected skew.
if (has('self-test')) {
  const { pairTransports } = await import('../proto/looper/peer.mjs');
  const SKEW = 137.5;            // ms that B's clock is ahead of A's
  const DELAY = 40;              // one-way link delay

  // ⚠️ A VIRTUAL CLOCK, NOT `setTimeout`. `pairTransports` takes a `schedule`
  // so the link's delay can be exact instead of approximately right, and
  // `pingEveryMs: 0` turns off the peer's own real-timer ping — otherwise the
  // test would be measuring the event loop as much as the estimator.
  let t = 0;
  const q = [];
  const schedule = (d, fn) => q.push({ at: t + d, fn });
  const advance = (ms) => {
    for (let k = 0; k < ms; k++) {
      t += 1;
      const due = q.filter((e) => e.at <= t).sort((x, y) => x.at - y.at);
      for (const e of due) q.splice(q.indexOf(e), 1);
      for (const e of due) e.fn();
    }
  };

  const { a: ta, b: tb } = pairTransports({ schedule, delayMs: DELAY });
  const base = Date.now();
  const a = createPeer({ id: 'a', transport: ta, now: () => base + t, pingEveryMs: 0 });
  const b = createPeer({ id: 'b', transport: tb, now: () => base + t + SKEW, pingEveryMs: 0 });

  for (let r = 0; r < 6; r += 1) { a.ping(); b.ping(); advance(200); }

  const seen = b.peers().find((p) => p.id === 'a');
  const off = b.offsetMs();
  // 'a' is the lower id and is therefore the reference, so B — whose clock runs
  // SKEW ahead — must correct by about -SKEW to agree with it.
  const err = Math.abs(off - -SKEW);
  const rttErr = seen ? Math.abs(seen.rttMs - 2 * DELAY) : Infinity;
  const ok = err < 5 && rttErr < 5;
  console.log(`injected skew ${SKEW} ms · b corrected by ${off.toFixed(2)} ms · error ${err.toFixed(2)} ms`);
  console.log(`injected one-way ${DELAY} ms · measured round trip `
    + `${seen ? seen.rttMs.toFixed(2) : '\u2014'} ms · error `
    + `${Number.isFinite(rttErr) ? rttErr.toFixed(2) : '\u2014'} ms`);
  console.log(`a stayed at ${a.offsetMs().toFixed(2)} ms, which is what being the reference means`);
  // 🔴 A SECOND ARM, BECAUSE THE FIRST ONE IS TOO EASY TO FAIL. With zero
  // jitter and zero loss every sample is perfect, so an estimator that simply
  // AVERAGED would score exactly as well — the arm above discriminates against
  // "no correction at all" and against nothing else. min-RTT-of-N's actual
  // claim is that it keeps only the FASTEST sample, and that claim only has
  // teeth on a link where the samples disagree. 30 ms of jitter on a 40 ms link
  // biases a mean; it must not move the minimum.
  let t2 = 0;
  const q2 = [];
  const sched2 = (d, fn) => q2.push({ at: t2 + d, fn });
  const adv2 = (ms) => {
    for (let k = 0; k < ms; k++) {
      t2 += 1;
      const due = q2.filter((e) => e.at <= t2).sort((x, y) => x.at - y.at);
      for (const e of due) q2.splice(q2.indexOf(e), 1);
      for (const e of due) e.fn();
    }
  };
  // a deterministic pseudo-random, so a failure is reproducible rather than
  // something that happened once on somebody's machine
  let seed = 12345;
  const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const { a: ja, b: jb } = pairTransports({ schedule: sched2, delayMs: DELAY, jitterMs: 30, lossRate: 0.1, rng });
  const base2 = Date.now();
  const ja2 = createPeer({ id: 'a', transport: ja, now: () => base2 + t2, pingEveryMs: 0 });
  const jb2 = createPeer({ id: 'b', transport: jb, now: () => base2 + t2 + SKEW, pingEveryMs: 0 });
  for (let r = 0; r < 12; r += 1) { ja2.ping(); jb2.ping(); adv2(200); }
  const jErr = Math.abs(jb2.offsetMs() - -SKEW);
  const jSeen = jb2.peers().find((p) => p.id === 'a');
  const ok2 = jErr < 5;
  console.log(`with 30 ms jitter and 10% loss · b corrected by ${jb2.offsetMs().toFixed(2)} ms`
    + ` · error ${jErr.toFixed(2)} ms · min round trip ${jSeen ? jSeen.rttMs.toFixed(2) : '\u2014'} ms`
    + ` (floor ${2 * (DELAY - 30)} ms, not ${2 * DELAY} \u2014 jitter is per`
    + ` direction, so the luckiest sample is two SHORT trips)`);
  ja2.dispose(); jb2.dispose();
  console.log(ok && ok2 ? 'self-test PASSED' : 'self-test FAILED');
  a.dispose(); b.dispose();
  process.exit(ok && ok2 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// the real thing
// ---------------------------------------------------------------------------
const url = `${BASE}/room/${ROOM}/ws`;
console.log(`joining ${url} as ${ID}`);

const peer = createPeer({ id: ID, transport: wsTransport(url) });

let roster = null;
const report = () => {
  const ps = peer.peers();
  const now = ps.map((p) => p.id).sort().join(' ');
  // ⚠️ A STATE CHANGE GOES IN THE LOG WHEN IT CHANGES, not on a timer — the
  // same rule `jam` learned when it was rewriting a paragraph twice a second.
  if (now !== roster) {
    roster = now;
    console.log(ps.length
      ? `in the room: ${ps.map((p) => `${p.id} ${Number.isFinite(p.rttMs) ? `${p.rttMs.toFixed(1)} ms away` : 'not timed yet'}`).join(' · ')}`
      : 'alone in the room');
  }
  const timed = ps.filter((p) => Number.isFinite(p.rttMs) && p.rttMs < Infinity);
  if (!timed.length) return;
  const rtts = timed.map((p) => p.rttMs).sort((x, y) => x - y);
  const p50 = rtts[Math.floor(rtts.length / 2)];
  // ⚠️ `offset` is the estimator's own answer and is printed as such. The round
  // trip is measured at this machine on one clock and is the honest number.
  console.log(`${new Date().toISOString()}  peers ${ps.length}`
    + `  round trip min ${rtts[0].toFixed(2)} ms  p50 ${p50.toFixed(2)} ms`
    + `  offset(estimated) ${peer.offsetMs().toFixed(2)} ms`);
};

const timer = setInterval(report, EVERY * 1000);
report();

const stop = () => {
  clearInterval(timer);
  const ps = peer.peers();
  console.log(`leaving · ${ps.length} peer(s) seen · offset(estimated) ${peer.offsetMs().toFixed(2)} ms`);
  peer.dispose();
  process.exit(0);
};
process.on('SIGINT', stop);
if (SECONDS > 0) setTimeout(stop, SECONDS * 1000);
