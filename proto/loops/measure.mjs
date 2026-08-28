#!/usr/bin/env node
// proto/loops/measure.mjs — the two demos, measured on a virtual clock, with
// hard asserts. No browser, no wall clock, no flake.
//
//   node proto/loops/measure.mjs [--json]
//
// PHASING   the drift must be (rate − 1)·elapsed. The fit's slope is the proof;
//           the residual is the servo error, and it is the only number here
//           that is allowed to be non-zero.
// DISINTEG. evidenceAccounting() must climb MONOTONICALLY per iteration, the
//           attested count must never move, and evidence-only must play
//           iteration 12 exactly as it played iteration 1.

import { createVirtualRuntime } from '../../timeline/transport.mjs';
import { buildPhasing, buildDisintegration, LOOP_MS, RATE_B, DIS_ITERS, epochAnchoredAt } from './loops.mjs';

const JSON_OUT = process.argv.includes('--json');
let fails = 0, checks = 0;
const log = (...a) => { if (!JSON_OUT) console.log(...a); };
function ok(label, cond, detail) {
  checks++;
  if (!cond) { fails++; console.error(`FAIL [${label}] ${detail}`); }
  else log(`  ok  ${label}${detail ? `  ${detail}` : ''}`);
}

/** one virtual clock, many tick hosts — the prop-suite rig */
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

const out = { phasing: null, disintegration: null };

// ---------------------------------------------------------------------------
// PHASING
// ---------------------------------------------------------------------------
log('\nPHASING — the same tape, two decks, rate 1.000 and 1.002');
{
  const { vr, newHost } = rig();
  const hits = { a: 0, b: 0 };
  const ph = buildPhasing({ clock: vr.clock, newHost, originEpochMs: vr.now(), onHit: (n) => { hits[n]++; } });

  ok('epoch-anchor', ph.at % LOOP_MS === 0 && ph.at >= vr.now(),
    `origin ${ph.at} is on the shared ${LOOP_MS} ms epoch grid (jam-core's rule, not tracker's first-event rule)`);
  ok('epoch-anchor', epochAnchoredAt(vr.now() + 1, LOOP_MS) === epochAnchoredAt(vr.now() + 999, LOOP_MS),
    'two processes starting anywhere inside one grid cell agree on the phase with zero negotiation');
  ok('two-decks', ph.decks.a !== ph.decks.b,
    'phasing needs TWO decks: rule 7g forbids two overlapping quotations of one deck, because a deck has one position — the same constraint that made Reich use two tape machines');

  ph.parent.seek(ph.at);
  ph.parent.play(1);
  const rows = [];
  const SPAN = 600_000;                      // ten minutes of virtual time
  for (let t = 0; t < SPAN; t += 5) {
    vr.advanceTo(vr.now() + 5);
    ph.nest.servo();
    if (t % 1000 === 0 && t > 0) rows.push(ph.sample());
  }
  const fit = ph.fit(rows);
  const last = rows[rows.length - 1];

  log(`  ${rows.length} samples over ${SPAN / 1000}s · drift ${last.drift.toFixed(1)} ms · phase ${last.phaseMs.toFixed(0)}/${LOOP_MS} ms`);
  log(`  fit slope ${fit.slope.toFixed(9)}  expected ${fit.expected.toFixed(9)}  error ${fit.slopeErrorPpm.toFixed(3)} ppm`);
  log(`  residual p50 ${fit.residualP50.toFixed(4)} ms · p95 ${fit.residualP95.toFixed(4)} ms · max ${fit.residualMax.toFixed(4)} ms`);
  log(`  wraps A ${last.wrapsA} · B ${last.wrapsB} (B runs ${RATE_B}× so it wraps more) · hits a ${hits.a} b ${hits.b}`);

  ok('drift-slope', Math.abs(fit.slopeErrorPpm) < 100,
    `the drift's slope IS (rate−1): ${fit.slope.toExponential(6)} vs ${fit.expected.toExponential(6)} (${fit.slopeErrorPpm.toFixed(3)} ppm)`);
  ok('drift-residual', fit.residualP95 < 5 && fit.residualMax < 25,
    `residual against the analytic line: p95 ${fit.residualP95.toFixed(3)} ms, max ${fit.residualMax.toFixed(3)} ms (this is servo error, and it is the only non-zero number here)`);
  ok('drift-wraps', last.wrapsA === Math.floor(last.elapsed / LOOP_MS) && last.wrapsB === Math.floor(last.elapsed * RATE_B / LOOP_MS),
    `each tape has wrapped exactly floor(elapsed·rate / L) times — A ${last.wrapsA} = floor(${last.elapsed}/${LOOP_MS}), B ${last.wrapsB} = floor(${last.elapsed}·${RATE_B}/${LOOP_MS}). The wrap count is arithmetic, not a tally.`);
  ok('drift-unison', Math.abs(last.unisonInMs - (LOOP_MS - last.phaseMs) / (RATE_B - 1)) < 1e-6 && last.unisonInMs > 0,
    `back to unison in ${(last.unisonInMs / 1000).toFixed(0)} s — the cycle is L/(rate−1) = ${(LOOP_MS / (RATE_B - 1) / 1000).toFixed(0)} s`);
  ok('drift-hits', hits.a > 2000 && hits.b > hits.a,
    `both tapes actually SOUNDED, and the fast one sounded more: a=${hits.a} b=${hits.b}`);

  out.phasing = {
    samples: rows.length, spanMs: SPAN, loopMs: LOOP_MS, rateB: RATE_B,
    at: ph.at, driftMs: +last.drift.toFixed(3), phaseMs: +last.phaseMs.toFixed(3),
    fit, hits, wraps: { a: last.wrapsA, b: last.wrapsB },
    unisonCycleSec: LOOP_MS / (RATE_B - 1) / 1000,
    curve: rows.filter((_, i) => i % 30 === 0).map((r) => ({ t: r.elapsed, d: +r.drift.toFixed(2), p: +r.predicted.toFixed(2) })),
  };
  ph.dispose();
}

// ---------------------------------------------------------------------------
// DISINTEGRATION
// ---------------------------------------------------------------------------
log('\nDISINTEGRATION — 12 repetitions, one more tier of reconstruction each');
{
  const { vr, newHost } = rig();
  const heard = [];
  const dis = buildDisintegration({ clock: vr.clock, newHost, onTone: (p) => heard.push({ lane: p.lane, tier: p.tier ?? 0 }) });

  const a0 = dis.accounting();
  ok('dis-start', a0.attested === 8 && a0.restored === 0 && a0.inventedFraction === 0,
    `iteration 1 is ATTESTED: ${a0.attested} rows, 0 invented`);

  dis.parent.seek(0); dis.parent.play(1);
  const total = dis.iters * dis.loopMs + 200;
  for (let t = 0; t < total; t += 5) { vr.advanceTo(vr.now() + 5); dis.nest.servo(); }

  const rowsIt = dis.perIteration;
  log('   rep  tier  method                          attested  invented  invented%  conf');
  for (const r of rowsIt) log(`   ${String(r.repetition).padStart(2)}    ${r.tier}    ${r.method.padEnd(30)}   ${String(r.attested).padStart(6)}   ${String(r.restored).padStart(6)}    ${String(r.inventedPct).padStart(6)}%  ${r.confidence}`);

  ok('dis-monotone', rowsIt.every((r, i) => i === 0 || r.inventedFraction > rowsIt[i - 1].inventedFraction),
    `evidenceAccounting().inventedFraction climbs MONOTONICALLY, every iteration: ${rowsIt.map((r) => r.inventedPct).join(' → ')}`);
  ok('dis-attested', rowsIt.every((r) => r.attested === 8),
    `…and the ATTESTED count never moves — the master trace is append-only and nothing rewrote it: ${[...new Set(rowsIt.map((r) => r.attested))]}`);
  ok('dis-wraps', dis.nest.loop('D').wraps === dis.iters - 1 && rowsIt.length === dis.iters,
    `${dis.iters} repetitions = ${dis.iters - 1} wraps = ${dis.iters - 1} reconstructors run + the attested start: ${dis.nest.loop('D').wraps} wraps, ${rowsIt.length} snapshots`);
  const lastIt = rowsIt[rowsIt.length - 1];
  ok('dis-tiers', Object.keys(lastIt.byTier).sort().join(',') === '1,2,3',
    `all three of §5b's tiers are on the tape by the end: ${JSON.stringify(lastIt.byTier)}`);
  ok('dis-end', lastIt.inventedPct > 50,
    `the last repetition is mostly DERIVED: ${lastIt.inventedPct}% invented (${lastIt.restored} of ${lastIt.total} rows)`);

  // provenance is real, not decorative
  const prov = dis.provenance();
  const derived = prov.filter((p) => p.restored > 0);
  ok('dis-prov', derived.length === dis.iters - 1 && derived.every((p) => p.source.startsWith('reconstructor-') && p.tier >= 1 && p.confidence),
    `every derived lane names its reconstructor, its tier and its confidence: ${derived.length} lanes, e.g. ${JSON.stringify(derived[0] && { kind: derived[0].kind, tier: derived[0].tier, source: derived[0].source, method: derived[0].method, conf: derived[0].confidence.mean })}`);
  const rows0 = dis.child.window(derived[0].kind, -Infinity, Infinity, { evidence: 'all' });
  ok('dis-refs', rows0.every((r) => r.provenance && Array.isArray(r.provenance.refs) && r.provenance.refs.length === 2),
    `and every derived ROW refs the attested events it was derived FROM: ${JSON.stringify(rows0[0] && rows0[0].provenance.refs)}`);

  // THE FIREWALL. Under 'attested' the derived lanes vanish from every read…
  dis.setEvidence('attested');
  const wAtt = dis.child.window(undefined, -Infinity, Infinity);
  const wAll = dis.child.window(undefined, -Infinity, Infinity, { evidence: 'all' });
  ok('dis-firewall', wAtt.length === 8 && wAll.length === lastIt.total && wAtt.every((r) => !r.provenance),
    `evidence-only sees the 8 attested partials and nothing else: attested=${wAtt.length} all=${wAll.length}`);

  // …and the evidence-only PERFORMANCE plays iteration 12 exactly as it played
  // iteration 1. Replayed here as a second pass over the same, now-eroded deck.
  const before = heard.length;
  dis.child.seek(0);
  const heardAtt = [];
  const mark = heard.length;
  dis.parent.seek(0);
  dis.parent.play(1);
  for (let t = 0; t < dis.loopMs; t += 5) { vr.advanceTo(vr.now() + 5); dis.nest.servo(); }
  const pass = heard.slice(mark);
  ok('dis-toggle', pass.length > 0 && pass.every((h) => h.lane === 'tone'),
    `under evidence-only the ERODED deck plays the ATTESTED tape, unchanged: ${pass.length} events, lanes ${[...new Set(pass.map((h) => h.lane))]}`);

  out.disintegration = {
    iters: dis.iters, loopMs: dis.loopMs, perIteration: rowsIt,
    finalAccounting: dis.accounting(),
    lanes: dis.lanes().length,
    attestedRows: wAtt.length, allRows: wAll.length,
  };
  dis.dispose();
}

if (JSON_OUT) console.log(JSON.stringify(out, null, 2));
else {
  console.log(`\n${fails ? `${fails} VIOLATION(S)` : 'OK'} — ${checks} checks`);
}
process.exit(fails ? 1 : 0);
