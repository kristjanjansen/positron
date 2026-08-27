// timeline/lab/prop-test.mjs — the C2 property test (plan-timeline §5 C2):
//     reduce(events <= t)  ===  state after play(0 -> t)
// on randomized synthetic traces (the simulate_typing rule: synthetic and real
// traces share one shape; no humans in CI). Runs in plain node on the virtual
// runtime (deterministic — zero wall-clock flake). Exits nonzero on violation.
//
//   node timeline/lab/prop-test.mjs [--seeds 30] [--verbose]
//
// Two suites:
//   basic      — play straight through 0 -> t, t random (may bisect the trace).
//   gymnastics — random seek/pause/resume/rate ops mid-run; on seek the state
//                is reconstructed via reduce(<= target) (the documented seek
//                semantics); final state must STILL equal reduce(<= tEnd).
// State machine is non-commutative (add/mul/set) so ordering bugs, double
// fires and drops all surface as value mismatches. Fire counts are audited
// separately (exactly-once per pass).

import { createTransport, createScheduler, createVirtualRuntime } from '../transport.mjs';

const args = process.argv.slice(2);
const NSEEDS = +(args.includes('--seeds') ? args[args.indexOf('--seeds') + 1] : 30);
const VERBOSE = args.includes('--verbose');

// ---------- deterministic PRNG ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- trace generator: mixed density incl. same-ms ties + 1 ms clusters ----------
function genTrace(rand) {
  const n = 200 + Math.floor(rand() * 400);
  const events = [];
  let i = 0;
  while (events.length < n) {
    const r = rand();
    if (r < 0.15 && events.length > 3) {
      // same-ms tie with an existing event (the MIDI-chord case)
      const other = events[Math.floor(rand() * events.length)];
      events.push({ at: other.at, op: randOp(rand), idx: i++ });
    } else if (r < 0.3) {
      // 1 ms cluster of 3-6
      const base = rand() * 29000;
      const k = 3 + Math.floor(rand() * 4);
      for (let j = 0; j < k && events.length < n; j++) events.push({ at: +(base + j).toFixed(3), op: randOp(rand), idx: i++ });
    } else {
      events.push({ at: +(rand() * 30000).toFixed(3), op: randOp(rand), idx: i++ });
    }
  }
  return events; // idx = capture order; scheduler insertion follows idx order
}
function randOp(rand) {
  const r = rand();
  if (r < 0.5) return { f: 'add', v: 1 + Math.floor(rand() * 9) };
  if (r < 0.8) return { f: 'mul', v: 2 + Math.floor(rand() * 2) };
  return { f: 'set', v: Math.floor(rand() * 100) };
}
const apply = (s, op) => op.f === 'add' ? (s + op.v) % 1000003 : op.f === 'mul' ? (s * op.v) % 1000003 : op.v;

// ---------- the reducer (pure; fold in (at, capture-order) order) ----------
function reduce(events, t) {
  const sel = events.filter((e) => e.at <= t).sort((a, b) => a.at - b.at || a.idx - b.idx);
  let s = 0;
  for (const e of sel) s = apply(s, e.op);
  return { state: s, count: sel.length };
}

// ---------- harness ----------
function makeRig(events) {
  const vr = createVirtualRuntime(1_000_000); // nonzero epoch: catches 0-assumptions
  const transport = createTransport({ clock: vr.clock });
  const sched = createScheduler(transport, { tickMs: 25, horizonMs: 100, host: vr.host });
  let state = 0, applied = 0;
  sched.onFire((ev) => { state = apply(state, ev.payload.op); applied++; });
  for (const e of events) sched.schedule({ at: e.at, kind: 'ctr', payload: { op: e.op } });
  sched.start();
  return {
    vr, transport, sched,
    get state() { return state; },
    set state(v) { state = v; },
    get applied() { return applied; },
    /** advance wall time until position === pos exactly, then pause there */
    runToPos(pos) {
      for (;;) {
        if (transport.rate === 0) transport.play();
        const tHit = transport.timeAt(pos);
        vr.advanceTo(tHit);
        transport.pause();
        if (Math.abs(transport.position() - pos) < 1e-6) return;
      }
    },
  };
}

let failures = 0;
function check(label, seed, cond, detail) {
  if (!cond) { failures++; console.error(`FAIL [${label} seed=${seed}] ${detail}`); }
}

// ---------- suite 1: basic play(0 -> t) ----------
for (let seed = 1; seed <= NSEEDS; seed++) {
  const rand = mulberry32(seed * 7919);
  const events = genTrace(rand);
  const t = rand() < 0.3 ? 30001 : +(rand() * 30000).toFixed(3); // sometimes past the end
  const rig = makeRig(events);
  rig.transport.seek(0);
  rig.runToPos(t);
  const want = reduce(events, t);
  check('basic', seed, rig.state === want.state, `state ${rig.state} !== reduce ${want.state} at t=${t}`);
  check('basic', seed, rig.applied === want.count, `fired ${rig.applied} !== expected ${want.count} at t=${t}`);
  const audit = rig.sched.audit();
  const multi = audit.fires.filter((f) => f.fires > 1);
  check('basic', seed, multi.length === 0, `${multi.length} events fired >1x in a single pass`);
  if (VERBOSE) console.log(`basic seed=${seed} n=${events.length} t=${t.toFixed ? t.toFixed(0) : t} state=${rig.state} ok`);
}

// ---------- suite 2: gymnastics (seek/pause/rate mid-run, reduce on seek) ----------
for (let seed = 1; seed <= Math.ceil(NSEEDS / 2); seed++) {
  const rand = mulberry32(seed * 104729 + 13);
  const events = genTrace(rand);
  const tEnd = 25000 + rand() * 5000;
  const rig = makeRig(events);
  rig.transport.seek(0);
  rig.transport.play();

  const nOps = 4 + Math.floor(rand() * 5);
  let cursor = 0;
  for (let k = 0; k < nOps; k++) {
    // advance to a random position strictly before tEnd
    cursor = Math.min(tEnd - 1, cursor + rand() * (tEnd - cursor) * 0.5);
    rig.runToPos(cursor);
    const r = rand();
    if (r < 0.4) {
      const target = +(rand() * tEnd).toFixed(3);
      rig.transport.seek(target);
      rig.state = reduce(events, target).state;   // documented seek semantics
      cursor = target;
    } else if (r < 0.7) {
      // pause 0.5-2 s of wall time, then resume (position must hold)
      const posBefore = rig.transport.position();
      rig.vr.advanceTo(rig.vr.now() + 500 + rand() * 1500);
      check('gym', seed, Math.abs(rig.transport.position() - posBefore) < 1e-9,
        `position moved while paused: ${posBefore} -> ${rig.transport.position()}`);
    } else {
      rig.transport.play();
      rig.transport.setRate([0.5, 1, 2, 3][Math.floor(rand() * 4)]);
      rig.transport.pause();
    }
  }
  rig.runToPos(tEnd);
  const want = reduce(events, tEnd);
  check('gym', seed, rig.state === want.state, `state ${rig.state} !== reduce ${want.state} at tEnd=${tEnd.toFixed(1)}`);
  if (VERBOSE) console.log(`gym seed=${seed} n=${events.length} ops=${nOps} state=${rig.state} ok`);
}

const basicRuns = NSEEDS, gymRuns = Math.ceil(NSEEDS / 2);
if (failures) {
  console.error(`prop-test: ${failures} VIOLATION(S) across ${basicRuns} basic + ${gymRuns} gymnastics seeds`);
  process.exit(1);
}
console.log(`prop-test OK: ${basicRuns} basic + ${gymRuns} gymnastics seeds, 0 violations (reduce(<=t) === play(0->t))`);
