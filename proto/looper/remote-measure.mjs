#!/usr/bin/env node
// proto/looper/remote-measure.mjs — two peers, one loop, on a virtual clock
// with a channel whose delay, jitter, loss and CLOCK SKEW are numbers this file
// chose. That is the point: latency-indifference cannot be demonstrated on a
// fast link, only on a slow one that changes nothing.
//
//   node proto/looper/remote-measure.mjs [--json]
//
// R1  the skew estimator recovers an injected clock offset
// R2  LATENCY-INDIFFERENCE — the same loop over 5 ms and over 1500 ms produces
//     the identical onset sequence, because a value that arrives once does not
//     care how long it took
// R3  a layer that misses its downbeat starts on the next one, and says so
// R4  the two peers play the same thing, with no messages after the layer
// R5  NEGATIVE CONTROL — skip the skew correction and the flam is exactly the
//     skew, which is what makes R1 load-bearing rather than decorative
// R6  the live plane can be lossy without touching the loop plane

import { createVirtualRuntime } from '../../timeline/transport.mjs';
import { createLooper, loadSession, stats } from './looper.mjs';
import { createLogVoices } from './synth.mjs';
import { createPeer, pairTransports } from './peer.mjs';

const JSON_OUT = process.argv.includes('--json');
let fails = 0, checks = 0;
const log = (...a) => { if (!JSON_OUT) console.log(...a); };
function ok(label, cond, detail) {
  checks++;
  if (!cond) { fails++; console.error(`FAIL [${label}] ${detail}`); }
  else log(`  ok  ${label}  ${detail}`);
}
const f = (x, n = 3) => (x == null || Number.isNaN(x) ? '—' : (+x).toFixed(n));

const LOOP = 2000;
const EPOCH_ULP_MS = 2 ** -12;
const FIGURE = [
  { at: 3.7, note: 48, dur: 180.4 },
  { at: 251.3, note: 55, dur: 140.9 },
  { at: 499.1, note: 60, dur: 220.6 },
  { at: 748.9, note: 63, dur: 130.2 },
  { at: 1002.4, note: 67, dur: 260.8 },
  { at: 1501.6, note: 72, dur: 190.3 },
];

/** one virtual clock, many tick hosts, and message delivery on the same clock */
function rig(startMs = 1_700_000_000_000) {
  const vr = createVirtualRuntime(startMs);
  const cbs = new Set(); let started = false;
  const newHost = () => {
    let mine = null;
    return {
      name: 'virtual',
      start(cb, ms) { mine = cb; cbs.add(cb); if (!started) { started = true; vr.host.start(() => { for (const c of [...cbs]) c(); }, ms || 25); } },
      stop() { if (mine) cbs.delete(mine); },
      setTimer: (d, fn) => vr.host.setTimer(d, fn),
    };
  };
  return { vr, newHost, schedule: (d, fn) => vr.host.setTimer(d, fn) };
}

/** deterministic PRNG, so a "lossy" arm is the SAME lossy arm every run */
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function performInto(looper, vr, figure, origin, { layer = 0, at = null, onReach = null } = {}) {
  const evs = [];
  for (const n of figure) {
    evs.push({ t: origin + n.at, type: 'note-on', note: n.note });
    evs.push({ t: origin + n.at + n.dur, type: 'note-off', note: n.note });
  }
  evs.sort((a, b) => a.t - b.t);
  let reached = at === null;
  for (const e of evs) {
    if (!reached && e.t >= at) { vr.advanceTo(at); onReach && onReach(at); reached = true; }
    vr.advanceTo(e.t);
    looper.capture({ at: e.t, handlerAt: e.t, type: e.type, note: e.note, vel: 100, layer });
  }
  if (!reached) { vr.advanceTo(at); onReach && onReach(at); }
}

const sig = (rows) => rows.filter((o) => o.path === 'loop')
  .map((o) => `${o.iter}:${o.note}:${o.phase.toFixed(4)}`);

/**
 * ONE SESSION, end to end. Everything a test wants to vary is an argument, so
 * the arms differ only in the numbers and never in the code path.
 */
function session({ delayMs = 0, jitterMs = 0, lossRate = 0, skewMs = 0, correctSkew = true,
                   publishAfterMs = 0, passes = 12, seed = 7, gate = false } = {}) {
  const { vr, newHost, schedule } = rig();
  const rng = mulberry(seed);
  const pair = pairTransports({ schedule, delayMs, jitterMs, lossRate, rng });

  // TWO SYSTEM CLOCKS. B's is `skewMs` ahead — the thing the estimator has to
  // find, and the thing that becomes an audible flam if it does not.
  const nowA = () => vr.now();
  const nowB = () => vr.now() + skewMs;
  const A = createPeer({ id: 'alice', transport: pair.a, now: nowA, pingEveryMs: 0 });
  const B = createPeer({ id: 'bob', transport: pair.b, now: nowB, pingEveryMs: 0 });

  // let hello/ping/pong settle — long enough for a FULL ROUND TRIP on the
  // slowest link under test, or the estimator has no sample and silently
  // reports an offset of zero (which it did, and which read as "the estimator
  // fails on slow links" until the settle window was the thing at fault)
  const settle = Math.max(200, 6 * (delayMs + jitterMs));
  for (let i = 0; i < 40; i++) vr.advanceTo(vr.now() + settle / 40);
  const bOffset = B.offsetMs();
  if (!correctSkew) { /* leave B on its own clock: the negative control */ }
  const clockB = correctSkew ? B.clock : { domain: 'uncorrected', now: nowB };

  const onA = [], onB = [];
  const voicesA = createLogVoices({ clock: A.clock, onOnset: (r) => onA.push(r) });
  const voicesB = createLogVoices({ clock: clockB, onOnset: (r) => onB.push(r) });

  const looperA = createLooper({ clock: A.clock, newHost, voices: voicesA, loopMs: LOOP });
  let looperB = null;
  let entry = null, delivery = null, ungatedAt = null;

  B.rxLayers.length = 0;
  const bReceives = (rec) => {
    const s = rec.session;
    delivery = rec.deliveryMs;
    // WHERE IT STARTS, and getting this wrong was the most instructive mistake
    // of the build. The first version seeked B's parent to the next grid
    // boundary — "the layer is late, so start it on the next downbeat" — which
    // moves the CLOCK into the future and desynchronises the peer by exactly
    // the amount it moved. Measured: a flam of one loop minus the link delay.
    //
    // The position domain is shared wall time, so there is only one correct
    // place to start: NOW. The loop is epoch-anchored and infinite, so it is
    // already at the right phase; nothing needs catching up.
    //
    // Waiting for the downbeat is a legitimate musical choice, but it is a
    // GATE, not a seek — you silence the layer until the boundary and let the
    // clock alone. R3 tests that separately, for exactly this reason.
    entry = B.entryFor(s.loopMs, s.origin, B.now());
    looperB = loadSession(s, { clock: clockB, newHost, voices: voicesB });
    looperB.start(clockB.now());
    if (gate) {
      for (let i = 0; i < looperB.layers.length; i++) looperB.setLayerMuted(i, true);
      // ARM THE UNGATE AS A ONE-SHOT, exactly as the wrap is armed. Polling it
      // from the client loop lifts the gate up to one loop-period LATE, and the
      // downbeat — the note at phase 3.7 — is already gone when it does. That is
      // the same defect proto/loops measured at the wrap (one lost downbeat per
      // pass when the boundary was polled), reappearing at a different boundary
      // in a different file. A boundary is a committed instant or it is wrong.
      const lead = 1;                       // arrive a hair early; nothing precedes the downbeat
      schedule(Math.max(0, entry.at - clockB.now() - lead), () => {
        for (let i = 0; i < looperB.layers.length; i++) looperB.setLayerMuted(i, false);
        ungatedAt = clockB.now();
      });
    }
  };
  B.rxLayers.push = function (rec) { Array.prototype.push.call(this, rec); bReceives(rec); return this.length; };

  const t0 = Math.ceil((vr.now() + 100) / LOOP) * LOOP;      // epoch-anchored
  vr.advanceTo(t0);
  looperA.start(t0);
  looperA.armRecord(t0);
  performInto(looperA, vr, FIGURE, t0, { at: t0 + LOOP, onReach: (t) => {
    looperA.commitLayer(t);
    A.setGrid(LOOP, t0);
  } });

  // publish, possibly after a delay — a peer who joined late, or a pedal press
  // that happened while the link was busy
  if (publishAfterMs > 0) vr.advanceTo(vr.now() + publishAfterMs);
  const bytes = A.publishLayer(looperA.toSession({ id: 'take-1' }));

  const markA = onA.length;
  for (let i = 0; i < passes * 40; i++) {
    vr.advanceTo(vr.now() + LOOP / 40);
    looperA.nest.servo();
    if (looperB) looperB.nest.servo();
  }

  const r = {
    bytes, delivery, entry, bOffset, ungatedAt,
    firstAudibleB: onB.filter((o) => o.path === 'loop' && !o.muted)[0] || null,
    sigA: sig(onA.slice(markA)), sigB: sig(onB),
    phasesA: [...new Set(onA.slice(markA).filter((o) => o.path === 'loop').map((o) => +o.phase.toFixed(4)))].sort((a, b) => a - b),
    phasesB: [...new Set(onB.filter((o) => o.path === 'loop').map((o) => +o.phase.toFixed(4)))].sort((a, b) => a - b),
    wire: pair.stats(),
    // the flam: A's intended instant for a note vs B's, in shared time
    // ALIGNMENT IS ONLY MEANINGFUL IN A SINGLE TRUE DOMAIN. Each peer stamps
    // `intendedUs` in ITS OWN clock, so comparing them directly cancels the
    // very skew under test — the uncorrected arm scored a perfect 0.0 ms until
    // this conversion existed, which is the most flattering possible bug.
    // B's clock reads `bClockOffset` ahead of the virtual (true) clock.
    alignment: (() => {
      if (!looperB) return null;
      const bOff = correctSkew ? 0 : skewMs;
      const byKey = new Map();
      for (const o of onA.slice(markA)) if (o.path === 'loop') byKey.set(`${o.iter}:${o.note}`, o.intendedUs / 1000);
      const errs = [];
      for (const o of onB) {
        if (o.path !== 'loop' || o.intendedUs == null) continue;
        const a = byKey.get(`${o.iter}:${o.note}`);
        if (a != null) errs.push((o.intendedUs / 1000 - bOff) - a);
      }
      return stats(errs.map(Math.abs));
    })(),
  };
  looperA.dispose(); if (looperB) looperB.dispose();
  A.dispose(); B.dispose();
  return r;
}

const out = {};

// ===========================================================================
log('\nR1 — the skew estimator, peer to peer, never against a relay');
{
  const rows = [];
  for (const skew of [0, 137.4, -412.9, 5000.3]) {
    for (const delay of [1.3, 47.6, 311.2]) {
      const r = session({ skewMs: skew, delayMs: delay, passes: 2 });
      rows.push({ skew, delay, found: -r.bOffset, err: -r.bOffset - skew });
    }
  }
  for (const r of rows) log(`     skew ${String(r.skew).padStart(8)} ms · link ${String(r.delay).padStart(6)} ms → recovered ${f(r.found, 3).padStart(10)} ms  (error ${f(r.err, 6)})`);
  const worst = Math.max(...rows.map((r) => Math.abs(r.err)));
  ok('R1', worst <= EPOCH_ULP_MS,
    `the estimator recovers the injected offset EXACTLY on a symmetric link, at every skew and every delay tested: worst error ${worst.toExponential(1)} ms over ${rows.length} arms. ` +
    `min-RTT-of-N is scale-free — a 311 ms link estimates as well as a 1.3 ms one, which is precisely why the relay's latency never needed to be small`);
  out.skew = rows;
}

// ===========================================================================
log('\nR2 — LATENCY-INDIFFERENCE: the claim the whole architecture rests on');
{
  const arms = [1.1, 12.7, 89.3, 402.6, 2500.4, 4700.8].map((d) => ({ d, r: session({ delayMs: d, passes: 14 }) }));
  const ref = arms[0].r;
  for (const a of arms) {
    log(`     link ${String(a.d).padStart(7)} ms → delivered in ${f(a.r.delivery, 1).padStart(8)} ms · starts on pass ${a.r.entry.iteration} ` +
        `(${a.r.entry.missedPasses} missed) · ${a.r.phasesB.length} phases · ${a.r.sigB.length} onsets`);
  }
  const samePhases = arms.every((a) => JSON.stringify(a.r.phasesB) === JSON.stringify(ref.phasesB));
  ok('R2', samePhases,
    `A 4.7 SECOND LINK AND A 1 ms LINK PLAY THE IDENTICAL LOOP: the same ${ref.phasesB.length} phases, to the last decimal, across ${arms.length} link speeds spanning three orders of magnitude. ` +
    `A committed loop is a value; delivery moves WHICH PASS it starts on and nothing else`);
  const last = arms[arms.length - 1].r, first = arms[0].r;
  ok('R2', last.entry.iteration > first.entry.iteration && last.entry.missedPasses > first.entry.missedPasses,
    `and the cost of a slow link is paid in PASSES, not in timing: the ${arms[arms.length - 1].d} ms arm joins on pass ${last.entry.iteration} having missed ${last.entry.missedPasses}, where the ${arms[0].d} ms arm joins on pass ${first.entry.iteration}. ` +
    `Late, and still exactly on the beat`);
  const align = arms.map((a) => a.r.alignment).filter(Boolean);
  ok('R2', align.every((s) => s.max <= EPOCH_ULP_MS),
    `cross-peer alignment is one epoch ulp at every link speed (worst ${Math.max(...align.map((s) => s.max)).toExponential(1)} ms) — the two peers never exchange another message after the layer, and never need to`);
  out.latencyIndifference = arms.map((a) => ({ linkMs: a.d, deliveryMs: a.r.delivery, startsOnPass: a.r.entry.iteration, onsets: a.r.sigB.length }));
}

// ===========================================================================
log('\nR3 — joining late: a GATE, never a seek');
{
  const free = session({ delayMs: 5.3, publishAfterMs: 3 * LOOP + 743.2, passes: 10, gate: false });
  const gated = session({ delayMs: 5.3, publishAfterMs: 3 * LOOP + 743.2, passes: 10, gate: true });
  log(`     published ${f(3 * LOOP + 743.2, 1)} ms after the pedal → next boundary is pass ${free.entry.iteration} (${free.entry.missedPasses} missed)`);
  log(`     ungated: first sound at phase ${f(free.sigB.length ? +free.sigB[0].split(':')[2] : -1, 1)} ms into the pass`);
  const firstAudible = gated.firstAudibleB;
  log(`     gated  : first sound at phase ${firstAudible ? f(firstAudible.phase, 1) : '—'} ms`);
  ok('R3', free.entry.iteration >= 4 && free.entry.missedPasses >= 3,
    `a layer published ${f((3 * LOOP + 743.2) / 1000, 2)} s late reports where it landed: pass ${free.entry.iteration}, ${free.entry.missedPasses} missed — information for a UI, not an instruction to the clock`);
  ok('R3', firstAudible && firstAudible.phase < 60,
    `and WAITING for the downbeat is a gate on the OUTPUT: the gated arm's first audible note is at phase ${firstAudible ? f(firstAudible.phase, 1) : '—'} ms — the top of a pass — while the clock was never touched`);
  ok('R3', JSON.stringify(gated.phasesB) === JSON.stringify(free.phasesB),
    `the gated and ungated arms hold the IDENTICAL material (${gated.phasesB.length} phases); gating changed when it was heard and nothing about where it sits`);
  out.lateEntry = { entry: free.entry, gatedFirstPhase: firstAudible ? firstAudible.phase : null };
}

// ===========================================================================
log('\nR4 — the two peers play the same thing, with no messages between them');
{
  const r = session({ delayMs: 37.2, jitterMs: 11.4, passes: 14 });
  // +1: B joins mid-pass, so the pass it arrived in is complete for A and
  // partial for B. The first pass both saw whole is the first comparable one.
  const from = Math.max(+r.sigA[0].split(':')[0], +r.sigB[0].split(':')[0]) + 1;
  const keep = (xs) => xs.filter((x) => +x.split(':')[0] >= from);
  const KA = keep(r.sigA), KB = keep(r.sigB);
  const same = KA.length === KB.length && KA.every((x, i) => x === KB[i]);
  ok('R4', same && KA.length > FIGURE.length * 8,
    `identical (iteration, note, phase) sequences — ${KA.length} onsets each over a ${37.2}±${11.4} ms jittery link. ` +
    `After the layer arrives the peers exchange NOTHING and stay together anyway, because each is re-deriving position from its own vector against a shared origin`);
  out.agreement = { onsets: KA.length, identical: same };
}

// ===========================================================================
log('\nR5 — NEGATIVE CONTROL: the same run with the skew correction switched off');
{
  const SKEW = 137.4;
  const on = session({ skewMs: SKEW, delayMs: 22.8, correctSkew: true, passes: 10 });
  const off = session({ skewMs: SKEW, delayMs: 22.8, correctSkew: false, passes: 10 });
  log(`     corrected   : alignment max ${f(on.alignment.max, 4)} ms`);
  log(`     uncorrected : alignment max ${f(off.alignment.max, 1)} ms  (injected skew ${SKEW} ms)`);
  ok('R5', off.alignment.max > SKEW - 1 && off.alignment.max < SKEW + 1,
    `without the correction the two loops flam by EXACTLY the clock skew — ${f(off.alignment.max, 1)} ms against an injected ${SKEW} ms. ` +
    `At a ${LOOP} ms loop that is ${f(100 * SKEW / LOOP, 1)} % of the circle: a constant, audible flam that no amount of link speed would fix`);
  ok('R5', on.alignment.max <= EPOCH_ULP_MS,
    `with it, one epoch ulp (${on.alignment.max.toExponential(1)} ms). THIS is the hard problem of the remote looper, and it is a clock problem, not a network one`);
  out.skewControl = { injected: SKEW, corrected: on.alignment.max, uncorrected: off.alignment.max };
}

// ===========================================================================
log('\nR6 — a lossy link');
{
  const r = session({ delayMs: 31.5, jitterMs: 9.2, lossRate: 0.25, seed: 11, passes: 12 });
  log(`     wire: ${r.wire.sent} sent · ${r.wire.dropped} dropped (${f(100 * r.wire.dropped / r.wire.sent, 1)} %) · ${r.wire.delivered} delivered`);
  ok('R6', r.wire.dropped > 0 && r.sigB.length > FIGURE.length * 6,
    `a link dropping a quarter of its messages and the loop is unharmed: ${r.wire.dropped} of ${r.wire.sent} messages dropped, ${r.sigB.length} onsets still played. ` +
    `The loop plane is ONE message — if it lands the loop is perfect forever, and if it does not the layer simply never starts. There is no partial loop`);
  ok('R6', JSON.stringify(r.phasesB) === JSON.stringify(r.phasesA),
    `and what did arrive is exact: the receiver's ${r.phasesB.length} phases equal the sender's, to the last decimal`);
  out.loss = { ...r.wire, onsets: r.sigB.length };
}

log(`\n${fails ? `${fails} VIOLATION(S)` : 'OK'} — ${checks} checks`);
if (JSON_OUT) console.log(JSON.stringify(out, null, 2));
process.exit(fails ? 1 : 0);
