#!/usr/bin/env node
// timeline/lab/firewall.mjs — THE FIRE-SIDE FIREWALL: the proof, and the price.
//
//   node timeline/lab/firewall.mjs [--json] [--baseline <path/to/pre-v0.7/transport.mjs>]
//
// plan-timeline §8.8 left the evidence firewall READ-SIDE ONLY: "nothing stops
// a derived lane from FIRING under 'attested', so an evidence-only performance
// is the adapter's job". This file is the gate's evidence, in the shape the
// read side already set:
//
//   the read side proved  — under 'attested' the error is bit-identical to a
//                           plain hold, and dropping 1,674 derived rows leaves
//                           the master trace and the audit bit-identical.
//   the fire side proves  — the ACTUATION TRACE of an 'attested' deck holding
//                           twelve derived lanes is BIT-IDENTICAL to the trace
//                           of a deck that never had them, and to the trace of
//                           the same deck after the lanes were physically
//                           dropped. Three decks, one string.
//
// Everything runs on the virtual runtime (deterministic, zero wall-clock flake)
// except §D's cost measurement, which is wall-clock by necessity and uses a
// FRACTIONAL cadence — a past session in this repo presented a single locked
// phase sample as a distribution (cues at exactly 15.000 s = exactly 150 poll
// periods) and "improved" cue sync 59 -> 16 ms by measuring the same instant
// over and over. Nothing here samples on a tick multiple.

import { createDeck, createVirtualRuntime } from '../transport.mjs';
import { createNest } from '../nested.mjs';
import { offlineDeck, renderDeck } from '../render.mjs';
import { PARTIALS, DIS_ITERS, tierOf, METHOD } from '../../proto/loops/loops.mjs';

const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const BASELINE = argv.includes('--baseline') ? argv[argv.indexOf('--baseline') + 1] : null;
const log = (...a) => { if (!JSON_OUT) console.log(...a); };
let fails = 0, checks = 0;
function ok(label, cond, detail) {
  checks++;
  if (!cond) { fails++; console.error(`FAIL [${label}] ${detail}`); }
  else log(`  ok  ${label}${detail ? `  ${detail}` : ''}`);
}
const out = {};
const pct = (xs, p) => { if (!xs.length) return 0; const s = xs.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };

// --- the prop-suite rig: one virtual clock, many tick hosts -----------------
function rig(startMs = 1_700_000_000_000) {
  const vr = createVirtualRuntime(startMs);
  const cbs = new Set(); let started = false;
  const newHost = () => {
    let mine = null;
    return {
      name: 'virtual',
      start(cb, ms) { mine = cb; cbs.add(cb); if (!started) { started = true; vr.host.start(() => { for (const c of [...cbs]) c(); }, ms || 25); } },
      stop() { if (mine) cbs.delete(mine); },
      setTimer: (d, f) => vr.host.setTimer(d, f),
    };
  };
  return { vr, newHost };
}

// FRACTIONAL, deliberately: 5.137 ms is coprime with the 25 ms tick and with
// every event position below, so nothing in this file is ever sampled at a
// locked phase.
const STEP_MS = 5.137;

// ===========================================================================
// THE FIXTURE — proto/loops' disintegration, with the adapter's hand-written
// gate REMOVED. loops.mjs closes the hole by hand inside actuate()
// (`if (ev.maxTier < tier) return`), which is exactly the thing that was the
// adapter's job; this fixture reuses its constants (PARTIALS, tierOf, METHOD)
// and does NOT close it, so what is measured below is the LIBRARY's gate.
// ===========================================================================

function buildPiece({ clock, newHost, evidence, iters = DIS_ITERS, loopMs = 2000, trace, withDerived = true }) {
  const T = (row) => { if (trace) trace.push(row); };
  const child = createDeck({
    clock, tickHost: newHost(), range: [-1, loopMs], evidence,
    items: PARTIALS.map((p, i) => ({ at: p.at, kind: 'tone', id: `t${i}`, payload: { f: p.f, g: 1, i } })),
    adapters: {
      tone: {
        caps: { catchUp: 'reduce', valued: 'edge', absentState: 'silence' },
        actuate: (p, rec) => T(['actuate', 'tone', p.f, p.i, rec.at, rec.origin]),
        reduce: (ps) => ps.length,
        assertState: (s, info) => T(['assert', 'tone', s, info.pos, info.reason]),
        silence: (i) => T(['silence', 'tone', i.reason]),
      },
    },
  });
  const recs = [];
  if (withDerived) {
    for (let k = 1; k <= iters; k++) {
      const tier = tierOf(k, iters);
      const into = `tone~erode-${k}`;
      const rc = child.registerReconstructor(`erode-${k}`, {
        from: 'tone', into, tier, method: METHOD[tier],
        plan: ({ aAt, bAt }) => [aAt + (bAt - aAt) * (0.2 + 0.6 * ((k - 1) / Math.max(1, iters - 1)))],
        derive: (pos, ctx) => ({
          f: tier < 3 ? (ctx.a.f + ctx.b.f) / 2 * (1 + 0.03 * k) : ctx.a.f * Math.pow(2, ((k * 7) % 12) / 12),
          g: +Math.max(0.08, 1 - k / (iters + 2)).toFixed(3), iter: k, tier,
        }),
        confidence: () => +Math.max(0.02, 1 - k / iters).toFixed(3),
        // NO HAND-GATE. This is the one line loops.mjs had to write and the
        // reason this file exists.
        actuate: (p, rec) => T(['actuate', into, p.f, p.iter, rec.at, rec.origin]),
      });
      recs.push({ k, tier, into, rc, ran: false });
    }
  }
  const parent = createDeck({ clock, tickHost: newHost(), range: [0, (iters + 1) * loopMs], items: [] });
  const nest = createNest(parent, { toleranceMs: 5, hardSeekMs: 250, tickHost: newHost() });
  nest.add({ id: 'D', at: 0, rate: 1, deck: child, in: 0, out: loopMs, repeat: iters });
  const perIteration = [{ repetition: 1, ...snap(child) }];
  const offWrap = nest.onWrap((info) => {
    if (info.span !== 'D') return;
    const r = recs[info.to - 1];
    if (r && !r.ran) { r.rc.run(); r.ran = true; }
    perIteration.push({ repetition: info.to + 1, ...snap(child) });
  });
  return {
    child, parent, nest, recs, iters, loopMs, perIteration,
    dispose() { offWrap(); nest.dispose(); child.dispose(); parent.dispose(); },
  };
}
function snap(child) {
  const a = child.evidenceAccounting();
  return { attested: a.attested, restored: a.restored, total: a.total,
           inventedPct: +(a.inventedFraction * 100).toFixed(1) };
}

/** play the whole piece on a fractional cadence; return the actuation trace */
function playPiece(opts) {
  const { vr, newHost } = rig();
  const trace = [];
  const piece = buildPiece({ clock: vr.clock, newHost, trace, ...opts });
  piece.parent.seek(0); piece.parent.play(1);
  const total = piece.iters * piece.loopMs + 200;
  for (let t = 0; t < total; t += STEP_MS) { vr.advanceTo(vr.now() + STEP_MS); piece.nest.servo(); }
  const drift = piece.child.drift().map((d) => [d.id, d.kind, d.at, d.intendedUs, d.firedUs, d.deltaMs, d.origin]);
  const acct = piece.child.evidenceAccounting();
  const gate = piece.child.gateAccounting();
  const per = piece.perIteration.slice();
  const audit = piece.child.audit().fires.filter((f) => f.kind === 'tone');
  piece.dispose();
  return { trace, drift, acct, gate, per, audit };
}

// ===========================================================================
// A. THE HOLE — the negative control, on the pre-v0.7 code.
// ===========================================================================
log('\nA. THE HOLE (negative control: the shipped read-side-only firewall)');
out.hole = { measured: false };
if (BASELINE) {
  const base = await import(BASELINE.startsWith('/') ? BASELINE : `${process.cwd()}/${BASELINE}`);
  const vr = base.createVirtualRuntime(1_700_000_000_000);
  const fired = [], asserted = [];
  const deck = base.createDeck({
    clock: vr.clock, tickHost: vr.host, range: [0, 5000], evidence: 'attested',
    items: [0, 240.5, 480.25, 720.75].map((at, i) => ({ at, kind: 'tone', id: `t${i}`, payload: { f: 100 + i } })),
    adapters: { tone: { caps: { catchUp: 'reduce' }, actuate: (p) => fired.push(['tone', p.f]), reduce: (ps) => ps.length, assertState: (s) => asserted.push(['tone', s]) } },
  });
  const rc = deck.registerReconstructor('erode', {
    from: 'tone', into: 'tone~erode', tier: 3, method: 'generative-infill',
    plan: ({ aAt, bAt }) => [aAt + (bAt - aAt) * 0.5], derive: (pos) => ({ f: -1, pos }), confidence: () => 0.1,
  });
  deck.sched.registerAdapter('tone~erode', {
    caps: { tier: 3, catchUp: 'reduce', assertOnSeek: true },
    actuate: (p) => fired.push(['tone~erode', p.f]),
    reduce: (ps) => ps.length, assertState: (s) => asserted.push(['tone~erode', s]),
  });
  const emitted = rc.run().emitted;
  deck.play(1);
  for (let t = 0; t < 1200; t += STEP_MS) vr.advanceTo(vr.now() + STEP_MS);
  deck.pause();
  const derivedFires = fired.filter((f) => f[0] === 'tone~erode').length;
  asserted.length = 0;
  deck.seek(600.5);
  const derivedAsserts = asserted.filter((a) => a[0] === 'tone~erode');
  const readAnswer = deck.reduceAt('tone~erode', 600.5);
  out.hole = { measured: true, emitted, derivedFires, derivedAsserts: derivedAsserts.length, readAnswer };
  ok('hole-fire', derivedFires === emitted,
    `pre-v0.7, under evidence:'attested', a tier-3 GENERATIVE lane fired ${derivedFires}/${emitted} of its rows — the performance was not evidence-only, and nothing said so`);
  ok('hole-assert', derivedAsserts.length === 1 && readAnswer === null,
    `…and the SECOND door was worse: a seek folded that lane's whole prefix and pushed the result into assertState() (${JSON.stringify(derivedAsserts[0])}) while reduceAt() on the SAME lane at the SAME position returned ${readAnswer}. One lane, two answers, decided by which door the query came through.`);
  deck.dispose();
} else {
  log('  NOT MEASURED — pass --baseline <path to a pre-v0.7 transport.mjs> to reproduce the hole');
}

// ===========================================================================
// B. BIT-IDENTICAL ACTUATION — the fire side's answer to the read side's proof.
// ===========================================================================
log("\nB. BIT-IDENTICAL ACTUATION — three decks, one string");
{
  const A = playPiece({ evidence: 'attested', withDerived: true });   // gated
  const B = playPiece({ evidence: 'attested', withDerived: false });  // never existed
  // C: same as A, then every restoration physically dropped, replayed
  const { vr, newHost } = rig();
  const traceC = [];
  const pieceC = buildPiece({ clock: vr.clock, newHost, trace: traceC, evidence: 'attested' });
  pieceC.parent.seek(0); pieceC.parent.play(1);
  for (let t = 0; t < pieceC.iters * pieceC.loopMs + 200; t += STEP_MS) { vr.advanceTo(vr.now() + STEP_MS); pieceC.nest.servo(); }
  const beforeDrop = pieceC.child.evidenceAccounting();
  let droppedRows = 0;
  for (const r of pieceC.recs) if (r.ran) droppedRows += r.rc.drop().dropped;
  const afterDrop = pieceC.child.evidenceAccounting();
  const C = { trace: traceC, drift: pieceC.child.drift().map((d) => [d.id, d.kind, d.at, d.intendedUs, d.firedUs, d.deltaMs, d.origin]) };
  pieceC.dispose();

  const sA = JSON.stringify(A.trace), sB = JSON.stringify(B.trace), sC = JSON.stringify(C.trace);
  const dA = JSON.stringify(A.drift), dB = JSON.stringify(B.drift), dC = JSON.stringify(C.drift);
  const last = A.per[A.per.length - 1];

  ok('bit-actuation', sA === sB,
    `the actuation trace of an 'attested' deck holding ${A.gate.gatedLanes} derived lanes is BIT-IDENTICAL to a deck that never had them: ${A.trace.length} rows, ${sA.length} bytes, one string`);
  ok('bit-actuation', sA === sC,
    `…and to the same deck's trace with every restoration physically DROPPED afterwards (${droppedRows} rows removed, invented ${(beforeDrop.inventedFraction * 100).toFixed(1)}% -> ${(afterDrop.inventedFraction * 100).toFixed(1)}%)`);
  ok('bit-drift', dA === dB && dA === dC,
    `the DRIFT CHANNEL is bit-identical too (${A.drift.length} rows) — a refusal writes no drift row, which is what makes the identity possible at all`);
  ok('bit-refused', A.gate.refusedFires > 0 && B.gate.refusedFires === 0,
    `and the refusals are not nothing: deck A refused ${A.gate.refusedFires} fires across ${A.gate.gatedLanes} lanes, deck B had none to refuse`);
  ok('bit-invented', last.inventedPct > 50 && A.per.every((r) => r.attested === 8),
    `the piece still disintegrates while the performance does not move: invented 0% -> ${last.inventedPct}%, attested 8 rows throughout`);

  out.bitIdentical = {
    traceRows: A.trace.length, traceBytes: sA.length, driftRows: A.drift.length,
    identicalAB: sA === sB, identicalAC: sA === sC, driftIdentical: dA === dB && dA === dC,
    refusedFiresA: A.gate.refusedFires, gatedLanes: A.gate.gatedLanes,
    droppedRows, inventedPctFinal: last.inventedPct,
  };
}

// ===========================================================================
// C. DISINTEGRATION INVARIANCE — twelve repetitions, one performance.
// ===========================================================================
log('\nC. DISINTEGRATION INVARIANCE — inventedFraction 0 -> 90.6 %, the performance does not move');
{
  const att = playPiece({ evidence: 'attested' });
  const all = playPiece({ evidence: 'all' });
  // split the attested run's actuation trace into repetitions by wrap order
  const perRep = [];
  {
    let cur = [], lastAt = -Infinity;
    for (const row of att.trace) {
      if (row[0] !== 'actuate') continue;
      if (row[4] < lastAt) { perRep.push(cur); cur = []; }
      lastAt = row[4];
      cur.push([row[1], row[2], row[3], row[4]]);   // lane, f, i, at
    }
    perRep.push(cur);
  }
  const sigs = perRep.map((r) => JSON.stringify(r));
  const uniq = [...new Set(sigs)];
  const lanesAtt = [...new Set(att.trace.filter((r) => r[0] === 'actuate').map((r) => r[1]))];
  const lanesAll = [...new Set(all.trace.filter((r) => r[0] === 'actuate').map((r) => r[1]))];

  ok('dis-invariant', uniq.length === 1 && perRep.length >= DIS_ITERS,
    `all ${perRep.length} repetitions of the ATTESTED performance are the same ${perRep[0].length} onsets, byte for byte (${uniq.length} distinct signature across the piece) — iteration 12 sounds exactly as iteration 1 did, and the library did it, not the adapter`);
  ok('dis-invariant', lanesAtt.length === 1 && lanesAtt[0] === 'tone',
    `…and only the attested lane ever reached an actuator: ${JSON.stringify(lanesAtt)}`);
  // 12 repetitions = 11 wraps = 11 reconstructors run, plus the attested lane
  ok('dis-contrast', lanesAll.length === DIS_ITERS,
    `under 'all' the SAME fixture performs every restoration: ${lanesAll.length} lanes actuated (1 attested + ${DIS_ITERS - 1} derived — 12 repetitions are 11 wraps), ${all.trace.filter((r) => r[0] === 'actuate').length} onsets vs ${att.trace.filter((r) => r[0] === 'actuate').length}`);
  ok('dis-accounting', att.per[att.per.length - 1].inventedPct === all.per[all.per.length - 1].inventedPct,
    `the evidence ACCOUNTING is identical under both policies (${att.per[att.per.length - 1].inventedPct}% invented) — the gate refuses actuation, it never edits the trace or the ledger`);

  log(`   rep  attested  invented%   attested-policy onsets   all-policy onsets`);
  for (let i = 0; i < att.per.length; i++) {
    const a = att.per[i];
    log(`   ${String(a.repetition).padStart(3)}   ${String(a.attested).padStart(6)}   ${String(a.inventedPct).padStart(6)}%   ${String(perRep[i] ? perRep[i].length : '-').padStart(20)}   ${String(all.per[i] ? '' : '').padStart(4)}`);
  }
  out.disintegration = {
    repetitions: perRep.length, onsetsPerRepetition: perRep[0].length,
    distinctSignatures: uniq.length, lanesActuatedAttested: lanesAtt, lanesActuatedAll: lanesAll.length,
    onsetsAttested: att.trace.filter((r) => r[0] === 'actuate').length,
    onsetsAll: all.trace.filter((r) => r[0] === 'actuate').length,
    perIteration: att.per,
    refusedFires: att.gate.refusedFires,
  };
}

// ===========================================================================
// D. THE PRICE — the wall lane's scan is latency-critical (25 ms tick /
// 100 ms horizon). Three arms, all on a FRACTIONAL cadence.
// ===========================================================================
log('\nD. THE PRICE — what the gate costs the hot path');
{
  const N = 20000, REPS = 40;
  // A deck with no derived lane at all (gatedKinds.size === 0: the fast path
  // every pre-v0.5 deck takes) vs one with a gated lane present.
  function benchScan({ derived }) {
    const vr = createVirtualRuntime(1_700_000_000_000);
    let fires = 0;
    const deck = createDeck({
      clock: vr.clock, tickHost: vr.host, range: [0, N * 1.37 + 1000], evidence: 'attested',
      items: Array.from({ length: N }, (_, i) => ({ at: +(i * 1.37 + 0.113).toFixed(3), kind: 'x', id: `x${i}`, payload: { i } })),
      adapters: { x: { caps: { catchUp: 'burst' }, actuate: () => { fires++; } } },
    });
    if (derived) {
      const rc = deck.registerReconstructor('d', {
        from: 'x', into: 'x~d', tier: 3, plan: ({ aAt, bAt }) => [(aAt + bAt) / 2],
        derive: (pos) => ({ pos }), confidence: () => 0.5,
      });
      rc.run();
    }
    const t0 = process.hrtime.bigint();
    deck.play(1);
    // fractional advance, never a tick multiple
    for (let t = 0; t < N * 1.37 + 100; t += 7.331) vr.advanceTo(vr.now() + 7.331);
    const ns = Number(process.hrtime.bigint() - t0);
    const st = deck.stats();
    const g = deck.gateAccounting();
    deck.dispose();
    return { ns, fires, counts: st.counts, busyMs: st.busyMs, refused: g.refusedFires };
  }
  // warm both arms, then INTERLEAVE and ALTERNATE the order every rep, so a
  // JIT-warmup or thermal ramp lands on both arms equally.
  const warm = [benchScan({ derived: false }), benchScan({ derived: true }), benchScan({ derived: false }), benchScan({ derived: true })];
  const plain = [], gatedArm = [];
  for (let r = 0; r < REPS; r++) {
    if (r % 2 === 0) { plain.push(benchScan({ derived: false }).ns / 1e6); gatedArm.push(benchScan({ derived: true }).ns / 1e6); }
    else { gatedArm.push(benchScan({ derived: true }).ns / 1e6); plain.push(benchScan({ derived: false }).ns / 1e6); }
  }
  const p50p = pct(plain, 0.5), p50g = pct(gatedArm, 0.5);
  const perEventPlainNs = (p50p * 1e6) / N;
  ok('price-fastpath', true,
    `NO derived lane (gatedKinds.size === 0, the fast path): ${p50p.toFixed(1)} ms p50 for ${N} events end-to-end = ${perEventPlainNs.toFixed(0)} ns/event, n=${REPS}`);
  ok('price-gated', true,
    `WITH a gated tier-3 lane of ${warm[1].refused} rows beside them: ${p50g.toFixed(1)} ms p50 (${((p50g / p50p - 1) * 100).toFixed(1)} % on a run that also SCHEDULES and REFUSES ${warm[1].refused} extra rows)`);

  // The claim that matters: refusing is cheaper than firing. Same lane, same
  // rows, policy 'all' (fires) vs 'attested' (refuses).
  function benchPolicy(policy) {
    const vr = createVirtualRuntime(1_700_000_000_000);
    let fires = 0;
    const deck = createDeck({ clock: vr.clock, tickHost: vr.host, range: [0, 30000], evidence: policy, items: [], adapters: {} });
    deck.sched.registerAdapter('y', { caps: { catchUp: 'burst' }, actuate: () => { fires++; } });
    for (let i = 0; i < 8000; i++) deck.schedule({ at: +(i * 3.41 + 0.113).toFixed(3), kind: 'y', id: `y${i}`, payload: { i }, provenance: { source: 'reconstructor-b', tier: 3, method: 'x', confidence: 0.1, refs: [] } });
    const t0 = process.hrtime.bigint();
    deck.play(1);
    for (let t = 0; t < 8000 * 3.41 + 100; t += 7.331) vr.advanceTo(vr.now() + 7.331);
    const ns = Number(process.hrtime.bigint() - t0);
    const g = deck.gateAccounting();
    deck.dispose();
    return { ns, fires, refused: g.refusedFires };
  }
  benchPolicy('all'); benchPolicy('attested'); benchPolicy('all'); benchPolicy('attested');
  const firesArm = [], refusesArm = [];
  for (let r = 0; r < REPS; r++) {
    if (r % 2 === 0) { firesArm.push(benchPolicy('all').ns / 1e6); refusesArm.push(benchPolicy('attested').ns / 1e6); }
    else { refusesArm.push(benchPolicy('attested').ns / 1e6); firesArm.push(benchPolicy('all').ns / 1e6); }
  }
  const pf = pct(firesArm, 0.5), pr = pct(refusesArm, 0.5);
  const probe = benchPolicy('attested');
  ok('price-refuse', pr < pf,
    `refusing is CHEAPER than firing, which is the shape the design predicted: 8000 tier-3 rows fired under 'all' ${pf.toFixed(1)} ms p50 vs refused under 'attested' ${pr.toFixed(1)} ms p50 (${((1 - pr / pf) * 100).toFixed(0)} % less), n=${REPS} — the gate stops in scan() so a refused row never arms a one-shot, never builds a drift record and never enters actuate()`);
  ok('price-refuse', probe.fires === 0 && probe.refused === 8000,
    `and it refused all of them: ${probe.refused} refusals, ${probe.fires} actuations`);

  out.price = {
    n: N, reps: REPS,
    scanNoDerivedMsP50: +p50p.toFixed(2), scanNoDerivedMsP95: +pct(plain, 0.95).toFixed(2),
    scanGatedMsP50: +p50g.toFixed(2), scanGatedMsP95: +pct(gatedArm, 0.95).toFixed(2),
    nsPerEventFastPath: +perEventPlainNs.toFixed(1),
    firedMsP50: +pf.toFixed(2), refusedMsP50: +pr.toFixed(2),
    refusedCheaperPct: +((1 - pr / pf) * 100).toFixed(1),
  };

  // The gate against the PRE-v0.7 code, if a baseline was supplied.
  //
  // METHOD, and it is the point of this arm: a DIFFERENCE OF TWO p50s over this
  // workload gave +11.4 %, +0.8 %, +9.8 %, +10.7 % and +5.5 % on the SAME two
  // builds — five "measurements" of one number, spanning an order of magnitude.
  // That is the repo's own locked-phase trap wearing a different hat, so this
  // arm does two things instead:
  //   1. PAIRED DIFFERENCES — A and B run back to back inside one rep (order
  //      alternating) and the DIFFERENCE is the sample, so a thermal ramp or a
  //      GC pause lands on both halves of the pair;
  //   2. A SAME-MODULE NEGATIVE CONTROL — the baseline benchmarked against a
  //      byte-identical copy of itself, loaded as a second module instance.
  //      Whatever that control reports is this benchmark's floor, and no effect
  //      smaller than it may be claimed.
  if (BASELINE) {
    const url = BASELINE.startsWith('/') ? BASELINE : `${process.cwd()}/${BASELINE}`;
    const base = await import(url);
    const baseCopy = await import(`${url}?control=1`);     // byte-identical, second instance
    const mkBench = (m) => () => {
      const vr = m.createVirtualRuntime(1_700_000_000_000);
      let fires = 0;
      const deck = m.createDeck({
        clock: vr.clock, tickHost: vr.host, range: [0, N * 1.37 + 1000], evidence: 'attested',
        items: Array.from({ length: N }, (_, i) => ({ at: +(i * 1.37 + 0.113).toFixed(3), kind: 'x', id: `x${i}`, payload: { i } })),
        adapters: { x: { caps: { catchUp: 'burst' }, actuate: () => { fires++; } } },
      });
      const t0 = process.hrtime.bigint();
      deck.play(1);
      for (let t = 0; t < N * 1.37 + 100; t += 7.331) vr.advanceTo(vr.now() + 7.331);
      const ns = Number(process.hrtime.bigint() - t0);
      deck.dispose();
      return ns / 1e6;
    };
    const bBase = mkBench(base), bCtrl = mkBench(baseCopy), bV7 = () => benchScan({ derived: false }).ns / 1e6;
    for (const f of [bBase, bCtrl, bV7]) { f(); f(); }
    const PAIRS = 120;
    const pairDelta = (f1, f2) => {
      const d = [];
      for (let r = 0; r < PAIRS; r++) {
        if (r % 2) { const y = f2(); const x = f1(); d.push(y - x); } else { const x = f1(); const y = f2(); d.push(y - x); }
      }
      return d;
    };
    const ctrl = pairDelta(bBase, bCtrl);
    const eff = pairDelta(bBase, bV7);
    const nsE = (ms) => (ms * 1e6) / N;
    const ctrlNs = nsE(pct(ctrl, 0.5)), effNs = nsE(pct(eff, 0.5));
    const cLo = nsE(pct(ctrl, 0.25)), cHi = nsE(pct(ctrl, 0.75));
    ok('price-control', cHi - cLo > 0,
      `NEGATIVE CONTROL — the baseline against a byte-identical COPY of itself: paired p50Δ ${ctrlNs.toFixed(1)} ns/event, IQR ${cLo.toFixed(0)}..${cHi.toFixed(0)} ns/event, n=${PAIRS} pairs. Two identical builds disagree by that much, so that band is this benchmark's floor and NO effect inside it may be claimed as real.`);
    ok('price-vs-baseline', effNs >= cLo && effNs <= cHi,
      `THE GATE — v0.7 against pre-v0.7, same method: paired p50Δ ${effNs.toFixed(1)} ns/event (IQR ${nsE(pct(eff, 0.25)).toFixed(0)}..${nsE(pct(eff, 0.75)).toFixed(0)}), inside the control band, against ${perEventPlainNs.toFixed(0)} ns/event of scan. So the honest claim is an UPPER BOUND and not a value: < ${(Math.max(Math.abs(cLo), Math.abs(cHi))).toFixed(0)} ns/event, i.e. < ${((Math.max(Math.abs(cLo), Math.abs(cHi)) / perEventPlainNs) * 100).toFixed(1)} % of scan — which is what the structure predicts (one Set.size read per scan(), hoisted OUT of the row loop, plus one local-boolean test per candidate row).`);
    out.price.pairs = PAIRS;
    out.price.controlNsPerEventP50 = +ctrlNs.toFixed(2);
    out.price.controlNsPerEventIQR = [+cLo.toFixed(1), +cHi.toFixed(1)];
    out.price.gateNsPerEventP50 = +effNs.toFixed(2);
    out.price.gateNsPerEventIQR = [+nsE(pct(eff, 0.25)).toFixed(1), +nsE(pct(eff, 0.75)).toFixed(1)];
    out.price.gateNsPerEventUpperBound = +Math.max(Math.abs(cLo), Math.abs(cHi)).toFixed(1);
  } else log('  (pre-v0.7 A/B: NOT MEASURED — pass --baseline)');
}

// ===========================================================================
// E. THE POLICY MOVES WHILE IT PLAYS — G4.
// ===========================================================================
log('\nE. THE POLICY MOVES WHILE IT PLAYS');
{
  const vr = createVirtualRuntime(1_700_000_000_000);
  const t = [];
  const deck = createDeck({
    clock: vr.clock, tickHost: vr.host, range: [0, 6000], evidence: 'all',
    items: Array.from({ length: 12 }, (_, i) => ({ at: +(i * 200 + 50.5).toFixed(1), kind: 'tone', id: `a${i}`, payload: { i } })),
    adapters: { tone: { caps: { catchUp: 'reduce' }, actuate: (p) => t.push(['tone', p.i]), reduce: (ps) => ps.length, assertState: (s) => t.push(['assert-tone', s]) } },
  });
  const rc = deck.registerReconstructor('r', {
    from: 'tone', into: 'tone~r', tier: 2, method: 'spectral-inpainting',
    plan: ({ aAt, bAt }) => [(aAt + bAt) / 2], derive: (pos) => ({ pos }), confidence: () => 0.4,
  });
  rc.run();
  // the derived lane declares it can go quiet, AND can be re-folded
  deck.sched.registerAdapter('tone~r', {
    caps: { tier: 2, catchUp: 'reduce', absentState: 'silence', assertOnSeek: true },
    actuate: (p) => t.push(['derived', +p.pos.toFixed(1)]),
    reduce: (ps) => ps.length,
    assertState: (s, info) => t.push(['assert-derived', s, +info.pos.toFixed(1), info.reason]),
    silence: (i) => t.push(['silence-derived', i.reason, i.policy]),
  });
  deck.play(1);
  for (let x = 0; x < 900; x += STEP_MS) vr.advanceTo(vr.now() + STEP_MS);
  const beforeTighten = t.filter((r) => r[0] === 'derived').length;
  deck.setEvidence('attested');                       // TIGHTEN, mid-play
  const silenced = t.filter((r) => r[0] === 'silence-derived');
  for (let x = 0; x < 1200; x += STEP_MS) vr.advanceTo(vr.now() + STEP_MS);
  const afterTighten = t.filter((r) => r[0] === 'derived').length;
  const gA = deck.gateAccounting();
  deck.setEvidence({ restored: { maxTier: 2 } });      // LOOSEN, mid-play
  const reassert = t.filter((r) => r[0] === 'assert-derived' && r[3] === 'evidence-ungated');
  for (let x = 0; x < 1200; x += STEP_MS) vr.advanceTo(vr.now() + STEP_MS);
  const afterLoosen = t.filter((r) => r[0] === 'derived').length;
  const gB = deck.gateAccounting();

  ok('mid-tighten', beforeTighten > 0 && afterTighten === beforeTighten,
    `a tightening policy stops the derived lane DEAD: ${beforeTighten} onsets before setEvidence('attested'), ${afterTighten - beforeTighten} after`);
  ok('mid-tighten', silenced.length === 1 && silenced[0][1] === 'evidence-gated',
    `…and the lane is asked to GO QUIET at the instant the toggle is thrown, through the caps.absentState/silence() seam that already existed for a quotation edge: ${JSON.stringify(silenced[0])}`);
  ok('mid-loosen', afterLoosen > afterTighten,
    `a loosening policy lets it back in: ${afterLoosen - afterTighten} more onsets after setEvidence({restored:{maxTier:2}})`);
  ok('mid-loosen', reassert.length === 1,
    `…and the lane is RE-ASSERTED at the playhead first, so it catches up on the prefix it was refused instead of resuming mid-phrase: ${JSON.stringify(reassert[0])}`);
  ok('mid-ledger', gA.gated.includes('tone~r') && !gB.gated.includes('tone~r') && gA.transitions.length + 0 >= 1,
    `both transitions are on the ledger: ${JSON.stringify(gB.transitions.map((x) => [x.gate, x.kind, x.action]))}`);

  // the lane that CANNOT go quiet says so
  const t2 = [];
  const vr2 = createVirtualRuntime(1_700_000_000_000);
  const d2 = createDeck({ clock: vr2.clock, tickHost: vr2.host, range: [0, 3000], evidence: 'all',
    items: [{ at: 10.5, kind: 'n', payload: {} }], adapters: { n: { caps: {}, actuate: () => {} } } });
  d2.sched.registerAdapter('n~r', { caps: { tier: 3 }, actuate: () => t2.push('x') });
  d2.schedule({ at: 20.5, kind: 'n~r', payload: {}, provenance: { source: 'reconstructor-q', tier: 3, refs: [] } });
  d2.setEvidence('attested');
  const held = d2.degradations('n~r').reports.find((r) => r.chose === 'gated-but-held');
  ok('mid-held', !!held, `a lane that declares no caps.absentState HOLDS whatever it was ringing and SAYS so rather than pretending the toggle was clean: "${held && held.reason.slice(0, 110)}…"`);
  out.midPlay = {
    beforeTighten, afterTighten, afterLoosen,
    silenced: silenced.length, reasserted: reassert.length,
    transitions: gB.transitions.map((x) => ({ gate: x.gate, kind: x.kind, action: x.action })),
    heldReported: !!held,
  };
  deck.dispose(); d2.dispose();
}

// ===========================================================================
// F. deck.assertState — G5. The cost of verifying, and the drift channel it
// deliberately does not touch.
// ===========================================================================
log('\nF. deck.assertState(kind, state, info)');
{
  const N = 4000;
  const vr = createVirtualRuntime(1_700_000_000_000);
  let asserts = 0, lastInfo = null;
  const deck = createDeck({
    clock: vr.clock, tickHost: vr.host, range: [0, N * 3.17 + 100],
    items: Array.from({ length: N }, (_, i) => ({ at: +(i * 3.17 + 0.113).toFixed(3), kind: 'c', id: `c${i}`, payload: { v: (i % 7) + 1 } })),
    adapters: { c: { caps: { catchUp: 'reduce' }, actuate: () => {},
      reduce: (ps) => ps.reduce((s, p) => (s * 3 + p.v) % 1000003, 0),
      assertState: (s, info) => { asserts++; lastInfo = info; } } },
  });
  deck.play(1);
  for (let x = 0; x < N * 3.17 * 0.5; x += 7.331) vr.advanceTo(vr.now() + 7.331);
  deck.pause();
  const pos = deck.position();
  const truth = deck.reduceAt('c', pos);
  const driftBefore = deck.drift().length;

  // cost: verify off vs on, at a prefix of this depth
  const REPS = 300;
  const tA = process.hrtime.bigint();
  for (let i = 0; i < REPS; i++) deck.assertState('c', truth, { pos, reason: 'bench' });
  const nsOff = Number(process.hrtime.bigint() - tA) / REPS;
  const tB = process.hrtime.bigint();
  for (let i = 0; i < REPS; i++) deck.assertState('c', truth, { pos, reason: 'bench', verify: true });
  const nsOn = Number(process.hrtime.bigint() - tB) / REPS;
  const prefixLen = deck.eventsOf('c').filter((e) => e.at <= pos).length;

  const r1 = deck.assertState('c', truth, { pos, reason: 'sync-handover', verify: true });
  const snap = deck.snapshotOf('c');
  const r2 = deck.assertState('c', truth + 1, { pos, reason: 'wrong', verify: true });
  const overs = deck.degradations('c').reports.filter((x) => x.chose === 'asserted-over');
  const driftAfter = deck.drift().length;
  const aLog = deck.asserts();

  ok('assert-applies', r1.applied && r1.agreed === true && snap.pos === pos && snap.state === truth,
    `assertState moves the reduce SNAPSHOT to {pos, state} without replaying anything: ${JSON.stringify({ pos: +snap.pos.toFixed(1), state: snap.state })}`);
  ok('assert-drift', driftAfter === driftBefore,
    `and it writes NO drift row — ${driftBefore} before ${REPS * 2 + 2} asserts, ${driftAfter} after. Injecting them would have added ${REPS * 2 + 2} fabricated zero-lateness samples to a channel of ${driftBefore}, i.e. ${((REPS * 2 + 2) / (driftBefore + REPS * 2 + 2) * 100).toFixed(0)} % of every p50/p95 this repo quotes`);
  ok('assert-over', r2.chose === 'asserted-over' && r2.agreed === false && overs.length === 1,
    `a VERIFIED disagreement is on the record — the caller still wins (that is what "authoritative" means) but 'asserted-over' names both values: expected ${r2.expected}, asserted ${truth + 1}`);
  ok('assert-cost', nsOn > nsOff,
    `verification costs exactly the fold assertState exists to avoid: ${(nsOff / 1000).toFixed(1)} µs unverified vs ${(nsOn / 1000).toFixed(1)} µs verified over a ${prefixLen}-row prefix (${(nsOn / nsOff).toFixed(0)}×, n=${REPS} each) — which is why {verify:true} is opt-in and silence here does not throw the way the evidence policy does: silence cannot FABRICATE here, the caller IS the authority`);
  ok('assert-log', aLog.total === REPS * 2 + 2 && aLog.rows.length === aLog.total,
    `asserts have their own channel: ${aLog.total} rows, ${aLog.rows.filter((r) => r.verified).length} verified`);

  // refusals
  const noKind = deck.assertState('nope', 1);
  const noMethod = (() => { deck.sched.registerAdapter('m', { caps: {}, actuate: () => {} }); return deck.assertState('m', 1); })();
  ok('assert-refuse', noKind.chose === 'no-adapter' && !noKind.applied && noMethod.chose === 'no-assertState' && !noMethod.applied,
    'asserting into a kind with no adapter, or an adapter with no assertState(), is REFUSED and reported — never a snapshot written for a state nothing received');

  out.assertState = {
    prefixRows: prefixLen, reps: REPS,
    usUnverified: +(nsOff / 1000).toFixed(2), usVerified: +(nsOn / 1000).toFixed(2),
    verifyCostRatio: +(nsOn / nsOff).toFixed(1),
    driftRowsBefore: driftBefore, driftRowsAfter: driftAfter,
    assertsTotal: aLog.total, assertedOver: overs.length,
  };
  deck.dispose();
}

// ===========================================================================
// G. THE LOOP WRAP — how the gate meets caps.loopState 'carry'/'rearm' and
// adapter.loopWrap(). nested.mjs's wrap does three things in order: tell the
// adapters that asked (loopWrap), re-seek the child, re-assert the CARRY lanes
// at `out`. Only the last two are actuation, so only those are gated — and a
// gated CARRY lane is the interesting cell, because it is the one place a lane
// asks to have state pushed into it at every boundary.
// ===========================================================================
log('\nG. THE LOOP WRAP × THE GATE');
{
  const { vr, newHost } = rig();
  const t = [];
  const child = createDeck({
    clock: vr.clock, tickHost: newHost(), range: [-1, 500], evidence: 'all',
    items: [0, 120.5, 240.25, 360.75].map((at, i) => ({ at, kind: 'lv', id: `l${i}`, payload: { v: i } })),
    adapters: { lv: { caps: { catchUp: 'reduce', loopState: 'carry' }, actuate: (p) => t.push(['lv', p.v]), reduce: (ps) => ps.length, assertState: (s) => t.push(['assert-lv', s]) } },
  });
  const rc = child.registerReconstructor('d', {
    from: 'lv', into: 'lv~d', tier: 2, method: 'inpaint',
    plan: ({ aAt, bAt }) => [(aAt + bAt) / 2], derive: (pos) => ({ pos }), confidence: () => 0.4,
  });
  rc.run();
  // the derived lane declares CARRY too — it has the reduce+assertState pair,
  // so nested will try to assert it at `out` on every wrap
  child.sched.registerAdapter('lv~d', {
    caps: { tier: 2, catchUp: 'reduce', loopState: 'carry', assertOnSeek: true, loopWrap: true },
    actuate: () => t.push(['derived']),
    reduce: (ps) => ps.length,
    assertState: () => t.push(['assert-derived']),
    loopWrap: () => t.push(['loopWrap-derived']),
  });
  const parent = createDeck({ clock: vr.clock, tickHost: newHost(), range: [0, 3000], items: [] });
  const nest = createNest(parent, { toleranceMs: 5, hardSeekMs: 250, tickHost: newHost() });
  nest.add({ id: 'L', at: 0, rate: 1, deck: child, in: 0, out: 500, repeat: 5 });
  child.setEvidence('attested');
  parent.seek(0); parent.play(1);
  for (let x = 0; x < 2600; x += STEP_MS) { vr.advanceTo(vr.now() + STEP_MS); nest.servo(); }
  const wraps = nest.loop('L').wraps;
  const g = child.gateAccounting();
  ok('loop-gate', !t.some((r) => r[0] === 'derived') && !t.some((r) => r[0] === 'assert-derived'),
    `across ${wraps} wraps a gated CARRY lane is refused at BOTH actuation doors — ${g.refusedFires} fires and ${g.refusedFolds} carry/seek folds refused, 0 reaching an actuator`);
  ok('loop-gate', t.filter((r) => r[0] === 'loopWrap-derived').length === wraps,
    `…but adapter.loopWrap() is NOT gated and fires on every wrap (${t.filter((r) => r[0] === 'loopWrap-derived').length}/${wraps}). Deliberate: loopWrap is a FLUSH/notification hook ("a real MIDI lane can flush ahead of the fold"), it carries no invented material, and a gated lane that is never told the tape came round is a lane that cannot go quiet at the boundary.`);
  ok('loop-gate', t.filter((r) => r[0] === 'assert-lv').length >= wraps && t.filter((r) => r[0] === 'lv').length > 0,
    `and the ATTESTED carry lane still carries and still sounds: ${t.filter((r) => r[0] === 'assert-lv').length} carries, ${t.filter((r) => r[0] === 'lv').length} onsets`);
  ok('loop-gate', child.degradations('lv~d').reports.some((r) => r.chose === 'not-asserted'),
    'the refused carry is named in the ledger — a lane that declared carry and got nothing must not discover it by sounding wrong');
  out.loopWrap = {
    wraps, refusedFires: g.refusedFires, refusedFolds: g.refusedFolds,
    loopWrapCalls: t.filter((r) => r[0] === 'loopWrap-derived').length,
    derivedActuations: t.filter((r) => r[0] === 'derived' || r[0] === 'assert-derived').length,
  };
  nest.dispose(); child.dispose(); parent.dispose();
}

// ===========================================================================
// H. THE OFFLINE RENDER — does the gate come along for free?
// `offlineDeck()` is `createDeck()` on a render runtime, so it uses the same
// createScheduler and SHOULD inherit the gate. "Should" is a hypothesis; this
// makes it a result. The claim under test is §B's, one domain over: a rendered
// 'attested' deck must be byte-identical to a render of the same deck with no
// restoration in it.
// ===========================================================================
log('\nH. THE OFFLINE RENDER');
{
  const items = [0, 200.5, 400.25, 600.75, 800.125, 1000.5].map((at, i) => ({ at, kind: 'z', id: `z${i}`, payload: { i } }));
  const mk = (withDerived) => {
    const deck = offlineDeck({
      range: [0, 2000], items: items.map((i) => ({ ...i })), evidence: 'attested',
      adapters: { z: { caps: { catchUp: 'reduce' }, actuate() {}, reduce: (ps) => ps.length, assertState() {} } },
    });
    if (withDerived) {
      for (const tier of [1, 3]) {
        deck.registerReconstructor(`e${tier}`, {
          from: 'z', into: `z~e${tier}`, tier, method: `m${tier}`,
          plan: ({ aAt, bAt }) => [aAt + (bAt - aAt) * (0.3 * tier)],
          derive: (pos) => ({ pos, tier }), confidence: () => 0.3,
          actuate() {},
        }).run();
      }
    }
    return deck;
  };
  const dA = mk(true), dB = mk(false);
  const rA = renderDeck(dA, { from: 0, to: 1500, fps: 30 });
  const rB = renderDeck(dB, { from: 0, to: 1500, fps: 30 });
  const norm = (r) => JSON.stringify(r.trace);
  ok('render-gate', norm(rA) === norm(rB),
    `a rendered 'attested' deck is byte-identical to a render of the same deck with no restoration in it (${rA.trace.length} trace rows) — the gate lives in createScheduler, so offlineDeck inherits it and renderDeck needed no change`);
  ok('render-gate', rA.renderHash === rB.renderHash && rA.traceHash === rB.traceHash && !!rA.renderHash,
    `and so is the render's own IDENTITY HASH — the number render.mjs already publishes as "this render, byte for byte": ${rA.renderHash} === ${rB.renderHash}`);
  ok('render-gate', dA.gateAccounting().refusedFires > 0 && dA.evidenceAccounting().restored > 0,
    `…while the restoration is there and was refused offline exactly as it is online: ${dA.evidenceAccounting().restored} derived rows, ${dA.gateAccounting().refusedFires} refused`);
  out.render = {
    traceRows: rA.trace.length, identical: norm(rA) === norm(rB),
    renderHashA: rA.renderHash, renderHashB: rB.renderHash,
    derived: dA.evidenceAccounting().restored, refused: dA.gateAccounting().refusedFires,
  };
  dA.dispose(); dB.dispose();
}

// ===========================================================================
if (JSON_OUT) console.log(JSON.stringify(out, null, 2));
else console.log(`\n${fails ? `${fails} VIOLATION(S)` : 'OK'} — ${checks} checks`);
process.exit(fails ? 1 : 0);
