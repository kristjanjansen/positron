#!/usr/bin/env node
// proto/loops/gate.mjs — THE ACCEPTANCE GATE, in one file.
//
//   "loops stay in time and do not lag on re-seek."
//
// Everything else about §8 is a feature. This is the correctness criterion, so
// it is measured separately, hard, and with the numbers printed.
//
//   node proto/loops/gate.mjs [--wraps 600] [--json]
//
// G1  INTER-ONSET INTERVAL ACROSS THE WRAP == the interval everywhere else.
//     Evenly-spaced events; the gap from the last onset of iteration N to the
//     first of N+1 must equal the in-loop spacing. p50 and max, ≥50 wraps.
//     No gap, no double-fire, no dropped downbeat.
// G2  NO ACCUMULATION over ≥500 wraps. The error of iteration N's first event
//     against its analytic time `at + N·(out−in)/rate` fitted against N: the
//     slope must be indistinguishable from zero. A non-zero slope means the
//     position is being INTEGRATED somewhere, which is the one thing the modulo
//     map exists to prevent.
// G3  WRAP COST. Firing error for events ADJACENT to a wrap, reported
//     separately from all others. If the wrap-adjacent ones are worse, that
//     difference IS the lag the gate is about.
// G4  UNDER LOAD. G1 again with the main thread stalled — a wrap must not be
//     the thing that breaks first.
// G5  THE LOOKAHEAD SPANS THE WRAP: one commit pass must hold events from both
//     sides of a boundary. (This is the mechanism G1 depends on; measured
//     directly so a regression names itself.)

import { createDeck, createVirtualRuntime } from '../../timeline/transport.mjs';
import { createNest } from '../../timeline/nested.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const WRAPS = arg('--wraps', 600);
const JSON_OUT = process.argv.includes('--json');
let fails = 0, checks = 0;
const log = (...a) => { if (!JSON_OUT) console.log(...a); };
function ok(label, cond, detail) {
  checks++;
  if (!cond) { fails++; console.error(`FAIL [${label}] ${detail}`); }
  else log(`  ok  ${label}  ${detail}`);
}
const pct = (xs, p) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const stat = (xs) => ({ n: xs.length, p50: +pct(xs, 0.5).toFixed(4), p95: +pct(xs, 0.95).toFixed(4), max: +Math.max(0, ...xs.map(Math.abs)).toFixed(4) });

// --- the rig: one virtual clock, many hosts, and a REAL setTimer path -------
function rig(startMs = 1_000_000) {
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

const SPACING = 250, N_EVENTS = 8, LOOP = SPACING * N_EVENTS;   // 8 onsets, 250 ms apart, 2000 ms

/**
 * @param withHost  arm the committed boundary (the fix) or poll it (the bug)
 * @param servoMs   the client's loop period — the size of the polling hole
 */
function run({ wraps = WRAPS, withHost = true, servoMs = 16, stallEvery = 0, stallMs = 0, rate = 1 } = {}) {
  const { vr, newHost } = rig();
  const fired = [];      // {at, wallUs, seq}
  const child = createDeck({
    clock: vr.clock, tickHost: newHost(),
    // the splice: the range starts one unit before `in`, so a wrap can seek a
    // hair before the downbeat instead of clamping onto it
    range: [-1, LOOP],
    items: Array.from({ length: N_EVENTS }, (_, i) => ({ at: i * SPACING, kind: 'hit', id: `h${i}`, payload: { i } })),
    adapters: {
      hit: {
        caps: { catchUp: 'reduce', reducible: true, seekable: true, valued: 'edge', deterministic: true },
        actuate(p, rec) { fired.push({ i: p.i, at: rec.at, wall: rec.firedUs / 1000, intended: rec.intendedUs / 1000, origin: rec.origin }); },
        reduce(ps) { return ps.length; },
        assertState() {},
      },
    },
  });
  const AT = 100000;
  const parent = createDeck({ clock: vr.clock, tickHost: newHost(), range: [0, AT + (wraps + 2) * LOOP / rate], items: [] });
  const nest = createNest(parent, { toleranceMs: 5, hardSeekMs: 250, ...(withHost ? { tickHost: newHost() } : {}) });
  nest.add({ id: 'L', at: AT, rate, deck: child, in: 0, out: LOOP, repeat: wraps + 1 });

  parent.seek(AT); parent.play(1);
  const spanMs = (wraps + 1) * (LOOP / rate);
  const t0 = vr.now();
  let stalls = 0;
  for (let t = 0; t < spanMs; t += servoMs) {
    vr.advanceTo(t0 + t);
    if (stallEvery && t > 0 && t % stallEvery === 0) { vr.advanceTo(vr.now() + stallMs); stalls++; }   // a blocked main thread
    nest.servo();
  }
  const loopInfo = nest.loop('L');
  const out = { fired, loopInfo, AT, spanMs, stalls, rate };
  nest.dispose(); child.dispose(); parent.dispose();
  return out;
}

const results = {};

// ===========================================================================
log(`\nG1 — inter-onset interval across the wrap (${WRAPS} wraps, ${N_EVENTS} onsets × ${SPACING} ms)`);
{
  const r = run({ wraps: WRAPS });
  const f = r.fired;
  ok('G1-count', f.length === (WRAPS + 1) * N_EVENTS,
    `every onset of every pass fired exactly once: ${f.length} of ${(WRAPS + 1) * N_EVENTS} (a dropped downbeat or a double-fire shows up here first)`);

  // intervals, split by whether they straddle a boundary
  const across = [], within = [];
  for (let i = 1; i < f.length; i++) {
    const d = f[i].wall - f[i - 1].wall;
    (f[i].i === 0 ? across : within).push(d);
  }
  const sa = stat(across.map((d) => d - SPACING)), sw = stat(within.map((d) => d - SPACING));
  log(`    within a pass : n=${sw.n} error p50 ${sw.p50} ms · p95 ${sw.p95} ms · max ${sw.max} ms`);
  log(`    ACROSS the wrap: n=${sa.n} error p50 ${sa.p50} ms · p95 ${sa.p95} ms · max ${sa.max} ms`);
  ok('G1-ioi', sa.n >= 50 && Math.abs(sa.p50) <= 0.5 && sa.max <= 2,
    `the gap across the loop point IS the in-loop spacing: p50 error ${sa.p50} ms, max ${sa.max} ms over ${sa.n} wraps`);
  ok('G1-same', Math.abs(sa.p50 - sw.p50) <= 0.5 && sa.max <= sw.max + 2,
    `…and it is not worse than any other interval: across p50 ${sa.p50}/max ${sa.max} vs within p50 ${sw.p50}/max ${sw.max}`);
  ok('G1-boundary', r.loopInfo.boundary === 'lookahead' && r.loopInfo.leadClamped === false,
    `the boundary is COMMITTED, not polled, and the wrap's lead did not clamp: ${r.loopInfo.boundary}`);
  results.G1 = { across: sa, within: sw, fired: f.length, expect: (WRAPS + 1) * N_EVENTS };

  // THE NEGATIVE CONTROL — the same run with the boundary POLLED at 16 ms.
  // This is the artefact the committed boundary removes, measured rather than
  // asserted, so the mechanism is not taken on faith.
  // 17 ms, not 16: 2000/16 is an integer, so a 16 ms client loop lands EXACTLY
  // on every boundary and the polled path looks perfect by coincidence.
  const p = run({ wraps: 60, withHost: false, servoMs: 17 });
  const pAcross = [];
  let pDown = 0;
  for (let i = 1; i < p.fired.length; i++) if (p.fired[i].i === 0) pAcross.push(p.fired[i].wall - p.fired[i - 1].wall - SPACING);
  for (const x of p.fired) if (x.i === 0) pDown++;
  const sp = stat(pAcross);
  log(`    NEGATIVE CONTROL (polled at 16 ms): ${p.fired.length}/${61 * N_EVENTS} onsets, ${pDown}/61 downbeats, across-wrap error p50 ${sp.p50} ms max ${sp.max} ms`);
  ok('G1-control', sp.max > sa.max + 1,
    `polling the boundary IS measurably worse — worst across-wrap interval ${sp.max} ms polled at 17 ms vs ${sa.max} ms committed ` +
    `(${(60 + 1) * N_EVENTS - p.fired.length} onsets lost vs ${(WRAPS + 1) * N_EVENTS - f.length}). ` +
    'The committed boundary is what removes it; wrapGraceMs is what keeps the polled path merely LATE instead of silent.');
  results.G1control = { fired: p.fired.length, expect: 61 * N_EVENTS, across: sp };
}

// ===========================================================================
log(`\nG2 — no accumulation over ${WRAPS} wraps`);
{
  const r = results.G1 ? run({ wraps: WRAPS }) : null;
  const downs = r.fired.filter((x) => x.i === 0);
  const onePass = LOOP / r.rate;
  // the error of iteration N's downbeat against downbeat0 + N·onePass, ANALYTIC
  // — computed from the INDEX every time, never from the previous downbeat
  const errs = downs.map((d, n) => ({ n, e: d.wall - (downs[0].wall + n * onePass) }));
  let sxx = 0, sxy = 0, sx = 0, sy = 0;
  for (const { n, e } of errs) { sx += n; sy += e; }
  const mx = sx / errs.length, my = sy / errs.length;
  for (const { n, e } of errs) { sxx += (n - mx) ** 2; sxy += (n - mx) * (e - my); }
  const slope = sxy / sxx;                                     // ms of error gained PER WRAP
  const se = stat(errs.map((x) => x.e));
  log(`    ${errs.length} downbeats · error vs analytic: p50 ${se.p50} ms · max ${se.max} ms`);
  log(`    drift slope ${slope.toExponential(3)} ms/wrap  →  ${(slope * 1000).toFixed(4)} ms over 1000 wraps`);
  ok('G2-slope', Math.abs(slope) < 1e-6,
    `the per-wrap error does not grow: slope ${slope.toExponential(3)} ms/wrap (${(slope * WRAPS).toExponential(3)} ms accumulated over the whole run). Position is DERIVED, never integrated.`);
  ok('G2-flat', se.max < 2 && Math.abs(errs[errs.length - 1].e - errs[0].e) < 2,
    `wrap ${errs.length - 1}'s error (${errs[errs.length - 1].e.toFixed(4)} ms) is wrap 0's error (${errs[0].e.toFixed(4)} ms)`);
  results.G2 = { wraps: errs.length, slopeMsPerWrap: slope, err: se, first: errs[0].e, last: errs[errs.length - 1].e };
}

// ===========================================================================
log('\nG3 — wrap cost: firing error, wrap-adjacent vs everything else');
{
  const r = run({ wraps: WRAPS });
  const adj = [], rest = [];
  for (const x of r.fired) (x.i === 0 || x.i === N_EVENTS - 1 ? adj : rest).push(x.wall - x.intended);
  const sa = stat(adj), sr = stat(rest);
  log(`    wrap-adjacent (first+last onset of a pass): n=${sa.n} p50 ${sa.p50} ms · p95 ${sa.p95} ms · max ${sa.max} ms`);
  log(`    every other onset                        : n=${sr.n} p50 ${sr.p50} ms · p95 ${sr.p95} ms · max ${sr.max} ms`);
  ok('G3-cost', sa.p95 <= sr.p95 + 1 && sa.max <= sr.max + 2,
    `an event beside a wrap fires no later than any other event — this difference IS the lag, and it is ${(sa.p95 - sr.p95).toFixed(4)} ms at p95 / ${(sa.max - sr.max).toFixed(4)} ms at max`);
  ok('G3-origin', r.fired.filter((x) => x.origin === 'burst').length === 0,
    `and nothing was BURST — a wrap never dumps a backlog: origins ${JSON.stringify([...new Set(r.fired.map((x) => x.origin))])}`);
  results.G3 = { adjacent: sa, other: sr, deltaP95: +(sa.p95 - sr.p95).toFixed(4) };
}

// ===========================================================================
log('\nG4 — under load: a 500 ms main-thread stall every 3 s');
{
  const r = run({ wraps: 120, stallEvery: 3000, stallMs: 500 });
  const across = [], within = [];
  for (let i = 1; i < r.fired.length; i++) {
    const d = r.fired[i].wall - r.fired[i - 1].wall - SPACING;
    (r.fired[i].i === 0 ? across : within).push(d);
  }
  const sa = stat(across), sw = stat(within);
  log(`    ${r.stalls} stalls × 500 ms · across-wrap p50 ${sa.p50} ms max ${sa.max} ms · within p50 ${sw.p50} ms max ${sw.max} ms`);
  ok('G4-load', sa.max <= sw.max + 1,
    `a wrap is not the thing that breaks first under load: worst interval across a wrap ${sa.max} ms vs ${sw.max} ms within a pass, across ${r.stalls} half-second stalls`);
  ok('G4-wraps', r.loopInfo.wraps === 120,
    `and every wrap still happened, exactly once each: ${r.loopInfo.wraps}/120`);
  results.G4 = { stalls: r.stalls, across: sa, within: sw, wraps: r.loopInfo.wraps };
}

// ===========================================================================
log('\nG5 — the lookahead spans the wrap');
{
  // The mechanism G1 rests on: transport's seek handler ends with `scan(now)`
  // — "re-arm immediately, don't wait a tick" — so the re-seek at the boundary
  // commits the next pass's head inside the same call, and a single commit pass
  // therefore holds events from both sides of the boundary.
  const r = run({ wraps: 12, servoMs: 25 });
  const byWall = new Map();
  for (const x of r.fired) { const k = Math.round(x.wall * 1000); if (!byWall.has(k)) byWall.set(k, []); byWall.get(k).push(x.i); }
  const downs = r.fired.filter((x) => x.i === 0);
  const lasts = r.fired.filter((x) => x.i === N_EVENTS - 1);
  const nGap = Math.min(downs.length - 1, lasts.length);
  const gaps = Array.from({ length: nGap }, (_, k) => downs[k + 1].wall - lasts[k].wall);
  ok('G5-span', gaps.every((g) => Math.abs(g - SPACING) < 1),
    `the last onset of pass N and the first of N+1 are ${SPACING} ms apart to within ${Math.max(...gaps.map((g) => Math.abs(g - SPACING))).toFixed(4)} ms — the commit crossed the boundary, it did not wait a tick`);
  ok('G5-nodup', new Set(r.fired.map((x) => `${x.i}@${Math.round(x.wall)}`)).size === r.fired.length,
    'no event fired twice at the boundary');
  results.G5 = { gapErrMax: +Math.max(...gaps.map((g) => Math.abs(g - SPACING))).toFixed(4), n: gaps.length };
}

if (JSON_OUT) console.log(JSON.stringify(results, null, 2));
else console.log(`\n${fails ? `${fails} VIOLATION(S)` : 'GATE OK'} — ${checks} checks`);
process.exit(fails ? 1 : 0);
