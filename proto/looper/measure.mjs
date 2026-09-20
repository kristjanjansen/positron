#!/usr/bin/env node
// proto/looper/measure.mjs — the looper on a virtual clock, hard asserts, no
// browser and no flake.
//
//   node proto/looper/measure.mjs [--json]
//
// A virtual clock's zeros are not the honest timing numbers — verify.mjs
// produces those on a real clock with real audio. What a virtual clock proves
// is everything that must be EXACTLY right rather than approximately: that the
// projection is a faithful map, that a note comes back in the pass it belongs
// to, that the error does not accumulate over hundreds of wraps, and that the
// edge lane and the level lane behave differently at the same boundary.
//
// Every offset in the fixture is FRACTIONAL. A previous session in this repo
// measured cue sync with cues at exactly 15.000 s — exactly 150 poll periods —
// and reported one locked phase sample as a distribution. That mistake is
// cheap to avoid and expensive to make.

import { createVirtualRuntime } from '../../timeline/transport.mjs';
import { createLooper, loadSession, projectToPhase, stats, slope, PHASE_RULE } from './looper.mjs';
import { createLogVoices } from './synth.mjs';

const JSON_OUT = process.argv.includes('--json');
let fails = 0, checks = 0;
const log = (...a) => { if (!JSON_OUT) console.log(...a); };
function ok(label, cond, detail) {
  checks++;
  if (!cond) { fails++; console.error(`FAIL [${label}] ${detail}`); }
  else log(`  ok  ${label}${detail ? `  ${detail}` : ''}`);
}
const f = (x, n = 3) => (x == null ? 'null' : Number(x).toFixed(n));

/**
 * One virtual clock, many tick hosts — the prop-suite rig, plus a FREEZE.
 *
 * `vr.advanceTo()` runs every intervening tick and timer, so simply jumping the
 * clock forwards does not model a blurred tab at all: it models a tab that ran
 * perfectly and merely reported late. (The first version of the blur test did
 * exactly that, and "proved" a burst of 120 onsets that was really 15 passes
 * playing normally in fast-forward.)
 *
 * `freeze(ms)` is the honest model, and it is the one transport.mjs measured by
 * SIGSTOP: the tick host is frozen WITH the page, so ticks do not fire AND
 * committed one-shots do not fire. What survives a freeze is arithmetic, and
 * what recovers from one is servo(). Nothing else gets a vote.
 */
function rig(startMs = 1_700_000_000_000) {
  const vr = createVirtualRuntime(startMs);
  const cbs = new Set(); let started = false, frozen = false, skippedTimers = 0, skippedTicks = 0;
  const newHost = () => {
    let mine = null;
    return {
      name: 'virtual',
      start(cb, ms) {
        mine = cb; cbs.add(cb);
        if (!started) {
          started = true;
          vr.host.start(() => { if (frozen) { skippedTicks++; return; } for (const c of [...cbs]) c(); }, ms || 25);
        }
      },
      stop() { if (mine) cbs.delete(mine); },
      // a committed one-shot that comes due inside a freeze does not run — it
      // is dropped exactly as a frozen page's timer is
      setTimer: (d, f2) => vr.host.setTimer(d, () => { if (frozen) { skippedTimers++; return; } f2(); }),
    };
  };
  const freeze = (ms) => {
    frozen = true; const t = vr.now(); vr.advanceTo(t + ms); frozen = false;
    return { skippedTicks, skippedTimers };
  };
  return { vr, newHost, freeze, skipped: () => ({ ticks: skippedTicks, timers: skippedTimers }) };
}

const LOOP = 2000;

/**
 * WHAT "EXACT" MAY MEAN HERE, and it is not zero.
 *
 * The position domain is wall time in epoch milliseconds (~1.7e12), because
 * that is what an epoch-anchored loop grid needs. A double at 1.7e12 has an ulp
 * of 2^-12 ms = **244 ns**: adding a phase to an epoch instant and subtracting
 * it again is lossy at that scale and no earlier. So the tightest honest
 * exactness threshold is one ulp, and this is it — asserting 1e-9 ms would be
 * asserting something arithmetic cannot deliver, and passing it would only mean
 * the fixture got lucky.
 *
 * 244 ns is 1/85th of a sample period at 48 kHz. It is not audible and it is
 * not going to become audible; it is written down because the same arithmetic
 * at the OTHER end of the scale is what breaks ms-as-a-position-domain in deep
 * time (13.8 Gyr in ms is 4.35e20, well past 2^53).
 */
const EPOCH_ULP_MS = 2 ** -12;      // 0.000244 ms at 1.7e12
/**
 * A two-bar figure with deliberately unmusical, fractional onsets, plus ONE
 * note that runs past the splice (the last one) so the truncation path is
 * exercised in every run rather than in a special case.
 */
const FIGURE = [
  { at: 3.7, note: 48, dur: 180.4 },
  { at: 251.3, note: 55, dur: 140.9 },
  { at: 499.1, note: 60, dur: 220.6 },
  { at: 748.9, note: 63, dur: 130.2 },
  { at: 1002.4, note: 67, dur: 260.8 },
  { at: 1253.8, note: 60, dur: 150.5 },
  { at: 1501.6, note: 55, dur: 190.3 },
  { at: 1877.2, note: 43, dur: 400.0 },      // straddles `out` — must be cut
];
const OVERDUB = [
  { at: 126.5, note: 72, dur: 90.1 },
  { at: 624.2, note: 75, dur: 90.4 },
  { at: 1126.9, note: 79, dur: 90.7 },
  { at: 1625.4, note: 75, dur: 91.2 },
];

/**
 * Play a figure into the looper as the virtual clock passes each instant.
 *
 * ⚠ `vr.advanceTo(target)` ends with `t = target` UNCONDITIONALLY, so advancing
 * to a stale instant runs the clock BACKWARDS and no one complains. The first
 * version of this function sorted every note-on and note-off by time and
 * advanced to each — which meant a note held across the pedal press advanced
 * past the commit point and then jumped back to it. The artefact was one event
 * firing 48.7 ms late as `tick-late`, in the first pass only, and it looked
 * exactly like a scheduler defect for about twenty minutes. It was a clock that
 * went backwards.
 *
 * So this walks time strictly forwards, and `at` (the pedal) is a first-class
 * instant in the sequence rather than something applied afterwards.
 */
function performInto(looper, vr, figure, origin, { layer = 0, handlerLagMs = 0, at = null, onReach = null } = {}) {
  const events = [];
  for (const n of figure) {
    events.push({ t: origin + n.at, type: 'note-on', note: n.note, dur: n.dur });
    events.push({ t: origin + n.at + n.dur, type: 'note-off', note: n.note });
  }
  events.sort((a, b) => a.t - b.t);
  let reached = at === null;
  for (const e of events) {
    if (!reached && e.t >= at) { vr.advanceTo(at); onReach && onReach(at); reached = true; }
    vr.advanceTo(e.t);
    looper.capture({ at: e.t, handlerAt: e.t + handlerLagMs, type: e.type, note: e.note, vel: 100, layer });
  }
  if (!reached) { vr.advanceTo(at); onReach && onReach(at); }
}

const out = {};

// ===========================================================================
// P — THE PROJECTION, on its own
// ===========================================================================
log('\nPROJECTION — trace → phase, the one transformation a looper performs');
{
  const origin = 1000;
  const rows = [];
  for (const n of FIGURE) {
    rows.push({ at: origin + n.at, type: 'note-on', note: n.note, vel: 100 });
    rows.push({ at: origin + n.at + n.dur, type: 'note-off', note: n.note });
  }
  rows.sort((a, b) => a.at - b.at);
  const p = projectToPhase(rows, { origin, loopMs: LOOP });

  ok('P1', p.notes === FIGURE.length && p.orphanOffs === 0,
    `every note-on paired with its off: ${p.notes} notes, ${p.orphanOffs} orphan offs`);
  ok('P2', p.items.every((it, i) => i === 0 || it.at >= p.items[i - 1].at),
    'items come out sorted by phase — the deck receives a lane, not a pile');
  ok('P3', p.items.every((it) => it.at >= 0 && it.at < LOOP),
    `every projected position is inside [0, ${LOOP}) — the phase domain is closed`);
  const src = p.items.map((it) => +(it.payload.srcAt - origin).toFixed(3));
  ok('P4', src.every((s, i) => Math.abs(s - p.items[i].at) < 1e-9),
    'the projection is EXACT for a single pass: phase === (source − origin), no rounding introduced');
  const cut = p.items.filter((it) => it.payload.trimmed);
  ok('P5', p.trimmed === 1 && cut.length === 1 && cut[0].payload.note === 43 &&
      Math.abs(cut[0].payload.durMs - (LOOP - cut[0].at)) < 1e-9,
    `the note across the splice is CUT AT out and says so: note ${cut[0].payload.note} kept ${f(cut[0].payload.durMs, 1)} ms, lost ${f(cut[0].payload.lostMs, 1)} ms (§8.8: hard cut, no parameter)`);
  ok('P6', p.items.every((it) => it.payload.rule === PHASE_RULE && Number.isFinite(it.payload.pass)),
    `every row names the rule that positioned it ('${PHASE_RULE}') and keeps the pass it was played on — the one thing a phase position forgets is recorded, not hidden`);

  // The same trace projected onto an EARLIER origin must be a pure rotation.
  // (Earlier, not later: a row before the origin predates the loop and the
  // projection refuses it — see P8, which is the assert that a test failure
  // turned into a rule.)
  const p2 = projectToPhase(rows, { origin: origin - 500, loopMs: LOOP });
  const rot = p2.items.map((it) => it.at).sort((a, b) => a - b);
  const want = p.items.map((it) => (it.at + 500) % LOOP).sort((a, b) => a - b);
  ok('P7', rot.length === want.length && rot.every((x, i) => Math.abs(x - want[i]) < 1e-9),
    'moving the origin rotates the loop and changes nothing else — the projection is a group action, not an edit');

  const p3 = projectToPhase(rows, { origin: origin + 600, loopMs: LOOP });
  ok('P8', p3.beforeOrigin === 5 && p3.items.every((it) => it.payload.srcAt >= origin + 600),
    `a row BEFORE the origin is refused and COUNTED (${p3.beforeOrigin} of ${rows.length}), never folded to phase 0 — loopPhase answers 0 for a negative argument, which would have stacked the whole pre-roll on the downbeat as a chord`);
  out.projection = { notes: p.notes, trimmed: p.trimmed, orphanOffs: p.orphanOffs, beforeOrigin: p3.beforeOrigin };
}

// ===========================================================================
// L — THE LOOPER: record one pass, then let it run
// ===========================================================================
log('\nLOOPER — the first pass sets the length, then 200 passes of it');
let roundTrip = null;
{
  const { vr, newHost } = rig();
  const onsets = [];
  const voices = createLogVoices({ clock: vr.clock, onOnset: (r) => onsets.push(r) });
  const looper = createLooper({ clock: vr.clock, newHost, voices, loopMs: LOOP });

  const t0 = vr.now() + 100;
  vr.advanceTo(t0);
  looper.start(t0);
  looper.armRecord(t0);
  let layer0 = null;
  performInto(looper, vr, FIGURE, t0, { at: t0 + LOOP, onReach: (t) => { layer0 = looper.commitLayer(t); } });

  ok('L1', looper.lengthSetByPlaying() && Math.abs(looper.loopMs() - LOOP) < 1e-9,
    `THE FIRST PASS SET THE LENGTH: ${f(looper.loopMs(), 1)} ms, from the pedal and not from a parameter — and it needed no library feature, because the quotation is authored AFTER the trace exists (C10)`);
  ok('L1', layer0.items.length === FIGURE.length,
    `layer 0 quotes ${layer0.items.length} notes of a ${f(layer0.spanMs, 1)} ms trace`);

  // --- run it -------------------------------------------------------------
  const PASSES = 200;
  for (let i = 0; i < PASSES * 40; i++) { vr.advanceTo(vr.now() + LOOP / 40); looper.nest.servo(); }

  const loopOnsets = onsets.filter((o) => o.path === 'loop');
  const wraps = looper.nest.loop('L0').wraps;
  ok('L2', wraps >= PASSES - 2,
    `${wraps} wraps over ${PASSES} loop lengths of virtual time`);
  // every pass must sound every note: the count is arithmetic, not a tally
  const perIter = new Map();
  for (const o of loopOnsets) perIter.set(o.iter, (perIter.get(o.iter) || 0) + 1);
  const complete = [...perIter.entries()].filter(([, c]) => c === FIGURE.length).length;
  ok('L3', complete >= wraps - 1,
    `EVERY PASS KEPT EVERY NOTE: ${complete} complete passes of ${FIGURE.length} notes over ${wraps} wraps (a polled boundary loses the downbeat of each — proto/loops measured 2100 of 2400)`);

  // the round trip: where the note came back vs where the projection put it
  const phaseErr = loopOnsets.map((o) => o.childPos - o.phase);
  const lateness = loopOnsets.map((o) => o.deltaMs);
  const sP = stats(phaseErr), sL = stats(lateness);
  const acc = slope(loopOnsets.map((o) => o.iter), phaseErr);
  ok('L4', sP.max <= EPOCH_ULP_MS,
    `ROUND TRIP: a note comes back exactly where it was recorded — phase error p50 ${sP.p50.toExponential(1)} · max ${sP.max.toExponential(1)} ms over ${sP.n} onsets`);
  ok('L5', Math.abs(acc) < 1e-6,
    `and it does not accumulate: slope ${acc.toExponential(1)} ms/pass over ${wraps} wraps — position is re-derived from the parent's vector every call, never integrated`);
  ok('L5', sL.max <= EPOCH_ULP_MS,
    `firing lateness on a virtual clock is analytically zero (p95 ${f(sL.p95)} ms) — the real number is verify.mjs's`);

  roundTrip = { onsets: sP.n, wraps, phaseErrMax: sP.max, latenessP95: sL.p95, slopePerPass: acc, complete };
  out.roundTrip = roundTrip;
  looper.dispose();
}

// ===========================================================================
// O — OVERDUB: layers are tape machines (rule 7g)
// ===========================================================================
log('\nOVERDUB — N layers are N tape machines, and they stay in phase');
{
  const { vr, newHost } = rig();
  const onsets = [];
  const voices = createLogVoices({ clock: vr.clock, onOnset: (r) => onsets.push(r) });
  const looper = createLooper({ clock: vr.clock, newHost, voices, loopMs: LOOP });

  const t0 = vr.now() + 100;
  vr.advanceTo(t0); looper.start(t0); looper.armRecord(t0);
  performInto(looper, vr, FIGURE, t0, { at: t0 + LOOP, onReach: (t) => looper.commitLayer(t) });

  // overdub across pass 2, i.e. while layer 0 is playing
  looper.armOverdub(t0 + LOOP);
  let layer1 = null;
  performInto(looper, vr, OVERDUB, t0 + LOOP, { layer: 1, at: t0 + 2 * LOOP, onReach: (t) => { layer1 = looper.commitLayer(t); } });

  ok('O1', looper.layers.length === 2 && looper.layers[0].deck !== looper.layers[1].deck,
    'an overdub is its OWN DECK — rule 7g forbids two overlapping quotations of one deck because a deck has one position, so N overdubs are N tape machines (the same constraint that made Reich use two machines)');
  ok('O2', Math.abs(layer1.loopMs - LOOP) < 1e-9 && layer1.items.length === OVERDUB.length,
    `the overdub inherits the length it was played against: ${f(layer1.loopMs, 1)} ms, ${layer1.items.length} notes`);
  const wantPhase = OVERDUB.map((n) => +n.at.toFixed(3)).sort((a, b) => a - b);
  const gotPhase = layer1.items.filter((i) => !i.payload.off).map((i) => +i.at.toFixed(3)).sort((a, b) => a - b);
  ok('O3', gotPhase.every((x, i) => Math.abs(x - wantPhase[i]) < 1e-6),
    'a note played in pass 2 lands at the phase it was played at, not one loop later — the projection is modulo, so which pass you overdubbed on is exactly what it forgets');

  // run both and check they stay together
  const before = onsets.length;
  for (let i = 0; i < 100 * 40; i++) { vr.advanceTo(vr.now() + LOOP / 40); looper.nest.servo(); }
  const both = onsets.slice(before).filter((o) => o.path === 'loop');
  const byIter = new Map();
  for (const o of both) {
    const k = o.iter;
    if (!byIter.has(k)) byIter.set(k, { 0: 0, 1: 0 });
    byIter.get(k)[o.layer]++;
  }
  const together = [...byIter.values()].filter((c) => c[0] === FIGURE.length && c[1] === OVERDUB.length).length;
  ok('O4', together >= byIter.size - 2,
    `both machines run the same passes: ${together} of ${byIter.size} iterations carried all ${FIGURE.length} + ${OVERDUB.length} notes`);
  const skew = stats(both.map((o) => o.childPos - o.phase));
  ok('O4', skew.max <= EPOCH_ULP_MS,
    `and they do not drift apart: cross-layer phase error max ${skew.max.toExponential(1)} ms over ${skew.n} onsets — both spans are re-derived from ONE parent vector, so there is nothing to drift`);
  out.overdub = { layers: 2, together, iterations: byIter.size, skewMax: skew.max };
  looper.dispose();
}

// ===========================================================================
// R — §8.3 AT A REAL INSTRUMENT: the edge lane re-arms, the level lane carries
// ===========================================================================
log('\n§8.3 — one boundary, two correct behaviours, chosen by the adapter');
{
  // THREE notes across the splice, so a stranded voice is countable rather than
  // a single yes/no. In 'edges' mode their note-offs land past `out` and simply
  // do not exist in [0, L) — which is the whole hazard, stated as a fixture.
  const STRADDLE = [
    { at: 3.7, note: 48, dur: 180.4 },
    { at: 1877.2, note: 43, dur: 400.0 },
    { at: 1901.6, note: 45, dur: 380.7 },
    { at: 1944.3, note: 47, dur: 350.1 },
  ];
  const run = (noteMode, rearm, reducer = true) => {
    const { vr, newHost } = rig();
    const voices = createLogVoices({ clock: vr.clock, rearm });
    const looper = createLooper({ clock: vr.clock, newHost, voices, loopMs: LOOP, noteMode, reducer });
    const t0 = vr.now() + 100;
    vr.advanceTo(t0); looper.start(t0); looper.armRecord(t0);
    performInto(looper, vr, STRADDLE, t0, { at: t0 + LOOP, onReach: (t) => looper.commitLayer(t) });
    const atWrap = [];
    const off = looper.nest.onWrap(() => atWrap.push(voices.voiceCount()));
    for (let i = 0; i < 55 * 40; i++) { vr.advanceTo(vr.now() + LOOP / 40); looper.nest.servo(); }
    off();
    const r = { peak: voices.peakVoices(), held: voices.voiceCount(),
                wraps: looper.nest.loop('L0').wraps, lanes: looper.loopLanes(0),
                heldAtWrap: atWrap.length ? Math.max(...atWrap) : 0,
                trimmed: looper.layers[0].trimmed };
    looper.dispose();
    return r;
  };

  const paired = run('paired', true);
  const edgesRearm = run('edges', true);          // reducer present, callback on
  const edgesCbOff = run('edges', false);         // reducer present, callback OFF
  const edgesNoReducer = run('edges', false, false);   // NO reducer at all

  ok('R1', paired.lanes.rearm.includes('note') && paired.lanes.carry.includes('cc'),
    `the nest split the lanes by their own caps: rearm ${JSON.stringify(paired.lanes.rearm)}, carry ${JSON.stringify(paired.lanes.carry)} — the loop asked, it did not decide`);
  ok('R1', paired.lanes.boundary === 'lookahead',
    `the wrap is a COMMITTED one-shot ('${paired.lanes.boundary}'), not polled — proto/loops measured one lost downbeat per wrap when it was polled`);
  ok('R2', edgesNoReducer.held === 3 && edgesNoReducer.heldAtWrap >= 3,
    `THE NEGATIVE CONTROL BITES, and it names the mechanism: with NO REDUCER on the lane, the ${edgesNoReducer.trimmed} notes whose offs fell past the splice are still sounding after ${edgesNoReducer.wraps} wraps (${edgesNoReducer.held} stuck voices) and never clear — the row that would clear them does not exist in [0, L)`);
  ok('R2', edgesRearm.held === 0 && edgesCbOff.held === 0,
    `AND THE CALLBACK IS NOT WHAT SAVES YOU: with the reducer present, disabling loopWrap() changes nothing (${edgesCbOff.held} stuck either way). The re-arm is step 2 — the wrap's own child.seek(in), whose reduce+assertState re-states the lane — and loopWrap() is step 1, a chance to flush BEFORE the fold. nested.mjs says so; this measures it`);
  ok('R3', paired.held === 0 && paired.peak <= STRADDLE.length,
    `and pairing the note WITH its duration removes the failure mode a level earlier (peak ${paired.peak} of ${STRADDLE.length}, ${paired.held} stuck): a voice scheduled with its own release cannot be stranded by a row that never arrives`);
  out.rearm = { pairedHeld: paired.held, edgesRearmHeld: edgesRearm.held,
                edgesCallbackOffHeld: edgesCbOff.held, edgesNoReducerHeld: edgesNoReducer.held,
                straddlers: edgesNoReducer.trimmed, wraps: edgesNoReducer.wraps };
}

// ===========================================================================
// S — A FROZEN TAB: the page was gone for fifteen loop lengths
// ===========================================================================
log('\nFREEZE — the page was gone for fifteen loop lengths');
{
  const { vr, newHost, freeze } = rig();
  const onsets = [];
  const voices = createLogVoices({ clock: vr.clock, onOnset: (r) => onsets.push(r) });
  const looper = createLooper({ clock: vr.clock, newHost, voices, loopMs: LOOP });
  const t0 = vr.now() + 100;
  vr.advanceTo(t0); looper.start(t0); looper.armRecord(t0);
  performInto(looper, vr, FIGURE, t0, { at: t0 + LOOP, onReach: (t) => looper.commitLayer(t) });
  for (let i = 0; i < 3 * 40; i++) { vr.advanceTo(vr.now() + LOOP / 40); looper.nest.servo(); }

  const beforeIter = looper.nest.iteration('L0');
  const before = onsets.length;
  const skipped = freeze(15 * LOOP + 137.4);          // the freeze, fractional
  const duringFreeze = onsets.length - before;
  looper.nest.servo();                                 // the backstop, once
  const afterServo = onsets.length - before;
  const afterIter = looper.nest.iteration('L0');

  ok('S1', duringFreeze === 0 && skipped.skippedTicks > 500,
    `a frozen page fires NOTHING: ${duringFreeze} onsets over ${f(15 * LOOP / 1000, 1)} s, ${skipped.skippedTicks} ticks and ${skipped.skippedTimers} committed one-shots dropped on the floor — a worker tick host defends against throttling, never against freezing`);
  ok('S2', afterIter - beforeIter >= 15,
    `position is ARITHMETIC, so the loop comes back where the clock says: the iteration advanced by ${afterIter - beforeIter} across the freeze, without a single tick to count with`);
  ok('S3', afterServo < FIGURE.length * 2,
    `and the fifteen missed passes are NOT burst on return: ${afterServo} onsets after the backstop servo, not ${FIGURE.length * 15} — the blur collapses to ONE wrap (the wrap-artefact catalogue's "tab-blur burst is unbounded under an infinite loop", refuted here)`);
  const post = [];
  for (let i = 0; i < 6 * 40; i++) { vr.advanceTo(vr.now() + LOOP / 40); looper.nest.servo(); post.push(onsets.length); }
  const resumed = onsets.slice(before + afterServo).filter((o) => o.path === 'loop');
  const sErr = stats(resumed.map((o) => o.childPos - o.phase));
  ok('S4', resumed.length > FIGURE.length * 4 && sErr.max <= EPOCH_ULP_MS,
    `and it is in phase IMMEDIATELY, with no resynchronisation: ${resumed.length} onsets after the freeze, phase error max ${sErr.max.toExponential(1)} ms — there was no accumulated state to be wrong`);
  out.freeze = { skippedTicks: skipped.skippedTicks, skippedTimers: skipped.skippedTimers,
                 duringFreeze, advancedIterations: afterIter - beforeIter, burst: afterServo,
                 resumedOnsets: resumed.length };
  looper.dispose();
}

// ===========================================================================
// C — OVERDUB LATENCY COMPENSATION: the performer plays what they HEAR
// ===========================================================================
// Every other test here plays a figure at instants a script chose. That is the
// one thing a real performer never does on an overdub: they play in response to
// SOUND, which arrives after the note was meant to. So this arm simulates the
// ear — layer 1's key presses are derived from when layer 0 was AUDIBLE, not
// from the grid — and it is the only arm that can tell whether the compensation
// works or merely exists.
log('\nOVERDUB — the second layer is played against what came out of the speakers');
{
  const OUT_LAT = 37.4, LEAD = 30;          // a real machine's numbers, fractional
  const DELAY = OUT_LAT + LEAD;

  // four notes with UNIQUE pitches, so an overdub note can be paired with the
  // note it was played against by pitch rather than by array index — the order
  // changes under compensation, because a note dragged before the origin wraps
  // to the end of the loop
  const PICK = [0, 3, 4, 7];

  const run = (compensate) => {
    const { vr, newHost } = rig();
    const voices = createLogVoices({ clock: vr.clock, latencyMs: OUT_LAT });
    const looper = createLooper({ clock: vr.clock, newHost, voices, loopMs: LOOP,
                                  ctx: null, leadMs: LEAD, compensate });
    const t0 = vr.now() + 100;
    vr.advanceTo(t0); looper.start(t0); looper.armRecord(t0);
    performInto(looper, vr, FIGURE, t0, { at: t0 + LOOP, onReach: (t) => looper.commitLayer(t) });

    // THE SIMULATED PERFORMER, and the whole test turns on this being derived
    // rather than assumed. They cannot know whether compensation is on; they
    // only know when the sound reached them. So the instant they play is read
    // out of the system: layer 0's STORED phase is where the note is scheduled,
    // it becomes audible `DELAY` later, and that is when the key goes down.
    // (My first version used a constant `p_raw + DELAY` for both arms, which is
    // only true of the uncompensated one — the compensated arm then "failed" by
    // exactly the delay it had just removed.)
    const l0 = looper.layers[0];
    const heard = PICK.map((i) => {
      const note = FIGURE[i].note;
      const it = l0.items.find((x) => !x.payload.off && x.payload.note === note);
      return { at: ((it.at + DELAY) % LOOP + LOOP) % LOOP, note: note + 24, dur: 90.3 };
    }).sort((a, b) => a.at - b.at);

    looper.armOverdub(t0 + LOOP);
    performInto(looper, vr, heard, t0 + LOOP, { layer: 1, at: t0 + 2 * LOOP,
      onReach: (t) => looper.commitLayer(t) });

    const l1 = looper.layers[1];
    const err = [];
    for (const it of l1.items) {
      if (it.payload.off) continue;
      const mate = l0.items.find((x) => !x.payload.off && x.payload.note === it.payload.note - 24);
      let d = it.at - mate.at;
      if (d > LOOP / 2) d -= LOOP; if (d < -LOOP / 2) d += LOOP;
      err.push(d);
    }
    const r = { err: stats(err.map(Math.abs)), raw: err, delay: DELAY,
                n0: l0.items.filter((x) => !x.payload.off).length,
                n1: err.length,
                beforeOrigin: l0.beforeOrigin + l1.beforeOrigin };
    looper.dispose();
    return r;
  };

  const off = run(false), on = run(true);
  console.log(`     monitoring delay modelled: ${f(off.delay, 1)} ms  (output ${OUT_LAT} + lead ${LEAD})`);
  console.log(`     uncompensated: overdub sits ${f(off.err.p50, 2)} ms behind the layer it was played against`);
  console.log(`     compensated  : ${f(on.err.max, 4)} ms`);
  ok('C1', Math.abs(off.err.p50 - off.delay) < 0.5,
    `WITHOUT compensation the overdub is late by EXACTLY the monitoring delay — ${f(off.err.p50, 2)} ms against a modelled ${f(off.delay, 1)} ms. ` +
    `That is not a tuning problem, it is a closed loop: you play with what you hear, and what you hear is late`);
  ok('C2', on.err.max <= EPOCH_ULP_MS,
    `WITH it, the overdub lands on the same phase as the note it was played in unison with: max error ${on.err.max.toExponential(1)} ms across ${on.n1} notes`);
  ok('C3', on.beforeOrigin === 0 && on.n0 === FIGURE.length,
    `and pulling notes back across the origin does not lose any: ${on.beforeOrigin} refused, ${on.n0} of ${FIGURE.length} kept — a note dragged before the pedal wraps to the end of the loop, because a loop is a circle`);
  ok('C4', run(true).err.max === on.err.max,
    'the compensation is a pure function of declared latencies, so it reproduces exactly');
  out.overdubCompensation = { modelledDelayMs: DELAY, uncompensatedP50: off.err.p50, compensatedMax: on.err.max };
}

// ===========================================================================
// X — THE SESSION: a loop is a VALUE, and two players of it agree
// ===========================================================================
// This is plans/plan-looper.md's P0 gate, and it is the whole basis of the remote
// looper: if a committed loop round-trips byte-identically and a second process
// that has never seen the performance plays the SAME events at the SAME
// positions, then sending it over a network is a delivery problem and not a
// timing one.
log('\nSESSION — save, reload, and prove the two players agree');
{
  const { vr, newHost } = rig();
  const onsetsA = [];
  const voicesA = createLogVoices({ clock: vr.clock, onOnset: (r) => onsetsA.push(r) });
  const looperA = createLooper({ clock: vr.clock, newHost, voices: voicesA, loopMs: LOOP });
  const t0 = vr.now() + 100;
  vr.advanceTo(t0); looperA.start(t0); looperA.armRecord(t0);
  performInto(looperA, vr, FIGURE, t0, { at: t0 + LOOP, onReach: (t) => looperA.commitLayer(t) });
  looperA.armOverdub(t0 + LOOP);
  performInto(looperA, vr, OVERDUB, t0 + LOOP, { layer: 1, at: t0 + 2 * LOOP, onReach: (t) => looperA.commitLayer(t) });

  // --- byte identity, TWICE ------------------------------------------------
  // Once is not enough: the loops work found a null quotation id that became
  // the string "null" and broke byte-identity only on the SECOND round-trip.
  const j1 = looperA.toSessionJSON({ id: 'take-1' });
  const back1 = JSON.parse(j1);
  const j2 = JSON.stringify(back1);
  const j3 = JSON.stringify(JSON.parse(j2));
  ok('X1', j1 === j2 && j2 === j3,
    `a session round-trips BYTE-IDENTICALLY, twice: ${j1.length} B for ${looperA.layers.length} layers and ${looperA.stats().notes} notes`);
  ok('X1', back1.score && back1.score.quotations.length === 2 && back1.material.length === 2,
    `and it splits the way score.mjs demands: ${back1.score.quotations.length} quotations naming their sources by ref, ${back1.material.length} material entries carrying the notes — a quotation names its source by IDENTITY, never by object`);
  const perLayerBytes = Math.round(j1.length / looperA.layers.length);
  ok('X1', perLayerBytes < 20000,
    `SIZE IS THE REMOTE ARGUMENT: ${perLayerBytes} B per layer. plans/plan-looper.md §1 claims a committed loop is a value small enough that delivery latency is irrelevant; this is the number behind that claim`);

  // --- a second player, which has never seen the performance ---------------
  const onsetsB = [];
  const voicesB = createLogVoices({ clock: vr.clock, onOnset: (r) => onsetsB.push(r) });
  const looperB = loadSession(j1, { clock: vr.clock, newHost, voices: voicesB, loopMs: LOOP });
  ok('X2', looperB.layers.length === 2 && looperB.trace.length === 0,
    `the loaded player has both layers and NO TRACE (${looperB.trace.length} rows) — a session carries the score and the material it quotes, never the performer's own log. That is the C10 cut, and it is the right one for a wire format`);
  ok('X2', Math.abs(looperB.loopMs() - looperA.loopMs()) < EPOCH_ULP_MS && looperB.origin() === looperA.origin(),
    `both players share the origin (${looperB.origin()}) and the length (${f(looperB.loopMs(), 1)} ms) — which on a network is the ONLY shared state, and it comes from the epoch grid with zero negotiation`);

  // run both against the SAME clock, from the same instant
  const mark = { a: onsetsA.length, b: onsetsB.length };
  looperB.start(looperA.parent.position());
  for (let i = 0; i < 40 * 40; i++) { vr.advanceTo(vr.now() + LOOP / 40); looperA.nest.servo(); looperB.nest.servo(); }

  const sig = (rows) => rows.slice().filter((o) => o.path === 'loop')
    .map((o) => `${o.iter}:${o.layer}:${o.note}:${o.phase.toFixed(4)}`);
  const A = sig(onsetsA.slice(mark.a)), B = sig(onsetsB.slice(mark.b));
  // compare the overlap: B entered at A's current position, so align on the
  // first iteration both saw rather than on array index
  const firstShared = Math.max(
    Math.min(...onsetsA.slice(mark.a).filter((o) => o.path === 'loop').map((o) => o.iter)),
    Math.min(...onsetsB.slice(mark.b).filter((o) => o.path === 'loop').map((o) => o.iter)));
  const keep = (rows) => rows.filter((r) => +r.split(':')[0] >= firstShared);
  const KA = keep(A), KB = keep(B);
  const same = KA.length === KB.length && KA.every((x, i) => x === KB[i]);
  ok('X2', same && KA.length > FIGURE.length * 10,
    `AND THEY PLAY THE SAME THING: ${KA.length} onsets each, identical (iteration, layer, note, phase) sequences over ${looperA.nest.loop('L0').wraps} wraps. ` +
    `Two independent players, one score, no shared playhead and no messages between them after the score arrived — which is exactly the remote looper's claim, proven locally first`);
  if (!same) {
    const i = KA.findIndex((x, k) => x !== KB[k]);
    console.error(`     first divergence at ${i}: A=${KA[i]} B=${KB[i]}`);
  }
  out.session = { bytes: j1.length, perLayerBytes, layers: 2, onsetsCompared: KA.length, identical: same };
  looperA.dispose(); looperB.dispose();
}

// ===========================================================================
log(`\n${fails ? `${fails} VIOLATION(S)` : 'OK'} — ${checks} checks`);
if (JSON_OUT) console.log(JSON.stringify(out, null, 2));
process.exit(fails ? 1 : 0);
