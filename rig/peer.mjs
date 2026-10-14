#!/usr/bin/env node
// node rig/peer.mjs --room jam-demo [--id pi] [--seconds 60] | --self-test: a node peer.
// rig/m1/skew.mjs is the measurement tool and wins on disagreement.
// The printed offset is the estimator's own answer; the round trip is the honest number.
// why: lessons/rig-misc.md#peer-header

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

// Default id is the hostname plus a random suffix, so two boards do not tie.
// why: lessons/rig-misc.md#peer-id
const { hostname } = await import('node:os');
const ID = flag('id', `${hostname().split('.')[0]}-${Math.random().toString(36).slice(2, 5)}`);

// --self-test: two peers over an in-process link with injected delay and clock offset.
// why: lessons/rig-misc.md#peer-self-test
if (has('self-test')) {
  const { pairTransports } = await import('../proto/looper/peer.mjs');
  const SKEW = 137.5;            // ms that B's clock is ahead of A's
  const DELAY = 40;              // one-way link delay

  // A virtual clock and `pingEveryMs: 0`, so the link delay is exact and no real timer runs.
  // why: lessons/rig-misc.md#peer-virtual-clock
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
  // 'a' is the reference, so B (SKEW ahead) must correct by about -SKEW.
  // why: lessons/rig-misc.md#peer-reference
  const err = Math.abs(off - -SKEW);
  const rttErr = seen ? Math.abs(seen.rttMs - 2 * DELAY) : Infinity;
  const ok = err < 5 && rttErr < 5;
  console.log(`injected skew ${SKEW} ms · b corrected by ${off.toFixed(2)} ms · error ${err.toFixed(2)} ms`);
  console.log(`injected one-way ${DELAY} ms · measured round trip `
    + `${seen ? seen.rttMs.toFixed(2) : '\u2014'} ms · error `
    + `${Number.isFinite(rttErr) ? rttErr.toFixed(2) : '\u2014'} ms`);
  console.log(`a stayed at ${a.offsetMs().toFixed(2)} ms, which is what being the reference means`);
  // Second arm with jitter: it would bias a mean, and must not move the minimum.
  // why: lessons/rig-misc.md#peer-jitter-arm
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
  // Log the roster when it changes, not on a timer.
  // why: lessons/rig-misc.md#peer-roster-log
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
  // `offset` is the estimator's answer; the round trip is measured on one clock.
  // why: lessons/rig-misc.md#peer-offset
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
