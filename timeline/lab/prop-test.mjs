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

import {
  createTransport, createScheduler, createVirtualRuntime,
  defaultTickHost, tickHostByKind,
} from '../transport.mjs';

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

// ---------------------------------------------------------------------------
// suite 3: the SIX API SEAMS (v0.2), each asserted deterministically on the
// virtual runtime. Every one of these was a real client's bug report.
// ---------------------------------------------------------------------------

// --- seam 3: shipped default host must be the lab VERDICT (worker), with main
//     an explicit opt-in. In node there is no global Worker, so the default
//     falls back to main — assert BOTH branches of the rule.
{
  const vr = createVirtualRuntime(1_000_000);
  const t = createTransport({ clock: vr.clock });
  const s = createScheduler(t, { host: vr.host });
  check('seam3', 0, s.hostName === 'virtual', `explicit host ignored: ${s.hostName}`);
  const dflt = defaultTickHost();
  const wantDefault = typeof Worker === 'function' ? 'worker' : 'main';
  check('seam3', 0, dflt.name === wantDefault, `defaultTickHost() = ${dflt.name}, want ${wantDefault}`);
  dflt.stop && dflt.stop();
  check('seam3', 0, tickHostByKind('main').name === 'main', 'hostKind main opt-in broken');
  check('seam3', 0, tickHostByKind('raf').name === 'raf', 'hostKind raf opt-in broken');
}

// --- seam 2: setRate() must NOT start playback, and the resume rate must be
//     readable while paused (a paused UI shows 0.5×, not 0.00×).
{
  const vr = createVirtualRuntime(1_000_000);
  const t = createTransport({ clock: vr.clock });
  t.seek(0);
  t.setRate(0.5);
  check('seam2', 0, t.rate === 0, `setRate started playback: rate=${t.rate}`);
  check('seam2', 0, t.playing === false, 'setRate() left the transport playing');
  check('seam2', 0, t.targetRate === 0.5, `targetRate ${t.targetRate} !== 0.5 while paused`);
  const posBefore = t.position();
  vr.advanceTo(vr.now() + 5000);
  check('seam2', 0, t.position() === posBefore, `position moved after set-rate-while-paused: ${t.position()}`);
  t.play();
  check('seam2', 0, t.rate === 0.5 && t.targetRate === 0.5, `play() did not resume at the armed rate: ${t.rate}`);
  vr.advanceTo(vr.now() + 1000);
  check('seam2', 0, Math.abs(t.position() - 500) < 1e-9, `0.5x advanced ${t.position()} ms in 1000 ms wall`);
  t.play(2);
  check('seam2', 0, t.rate === 2, `play(rate) override ignored: ${t.rate}`);
  t.setRate(0);
  check('seam2', 0, t.rate === 0 && t.targetRate === 2, 'setRate(0) must pause and keep the resume rate');
}

// --- seam 1 + 6: adapter registry dispatches per kind (no client-side onFire
//     filtering), caps drive the policy, and the drift channel can be read by
//     TWO observers at once (a peek + a subscription) while a third drains.
{
  const vr = createVirtualRuntime(1_000_000);
  const t = createTransport({ clock: vr.clock });
  const s = createScheduler(t, { host: vr.host });
  const gotA = [], gotB = [], subDrift = [];
  s.registerAdapter('a', { caps: { catchUp: 'burst' }, actuate: (p) => gotA.push(p.v) });
  const offB = s.registerAdapter('b', { caps: { catchUp: 'drop' }, actuate: (p) => gotB.push(p.v) });
  s.onDrift((rec) => subDrift.push(rec.id));
  for (let i = 1; i <= 5; i++) { s.schedule({ at: i * 100, kind: 'a', payload: { v: i } }); s.schedule({ at: i * 100, kind: 'b', payload: { v: -i } }); }
  s.start(); t.seek(0); t.play();
  vr.advanceTo(vr.now() + 700);
  check('seam1', 0, gotA.join(',') === '1,2,3,4,5', `kind a adapter got [${gotA}] (expect 1..5, unfiltered onFire would leak b)`);
  check('seam1', 0, gotB.join(',') === '-1,-2,-3,-4,-5', `kind b adapter got [${gotB}]`);
  check('seam1', 0, s.adapterCaps('a').catchUp === 'burst', 'caps not readable from the registry');
  const peek1 = s.peekDrift();
  const peek2 = s.peekDrift();
  check('seam6', 0, peek1.length === 10 && peek2.length === 10,
    `peekDrift is destructive: ${peek1.length} then ${peek2.length}`);
  check('seam6', 0, subDrift.length === 10, `onDrift subscriber saw ${subDrift.length}/10 fires`);
  check('seam6', 0, s.driftStats().total === 10 && s.driftStats().dropped === 0, JSON.stringify(s.driftStats()));
  const drained = s.drainDrift();
  check('seam6', 0, drained.length === 10 && s.peekDrift().length === 0, 'drain must still empty the buffer');
  check('seam6', 0, s.driftStats().total === 10, 'driftStats().total must survive a drain (it is a counter)');
  offB();
  s.schedule({ at: 10, kind: 'b', payload: { v: 99 } });     // overdub, adapter gone
  check('seam1', 0, gotB.length === 5, 'unregister() did not detach the adapter');
}

// --- seam 4: wall -> audio bridge. A fake AudioContext (deterministic) proves
//     the conversion: the instant handed to actuate() in AudioContext seconds
//     must equal ctx.currentTime + (-deltaMs + leadMs)/1000, i.e. an EARLY fire
//     leaves exactly its earliness as scheduling headroom.
{
  const vr = createVirtualRuntime(1_000_000);
  const ctx = { get currentTime() { return (vr.now() - 1_000_000) / 1000; } }; // audio secs since epoch
  const t = createTransport({ clock: vr.clock });
  const s = createScheduler(t, { host: vr.host });
  const whens = [];
  s.registerAdapter('voice', {
    caps: { catchUp: 'burst', audio: { ctx, leadMs: 5 } },
    actuate: (p, rec, when) => whens.push({ at: p.at, rec, when }),
  });
  for (let i = 1; i <= 4; i++) s.schedule({ at: i * 250, kind: 'voice', payload: { at: i * 250 } });
  s.start(); t.seek(0); t.play();
  vr.advanceTo(vr.now() + 1200);
  check('seam4', 0, whens.length === 4 && whens.every((w) => w.when),
    `${whens.filter((w) => w.when).length}/4 fires carried an audio when-object`);
  for (const w of whens) {
    const want = w.when.ctxTime + (-w.rec.deltaMs + 5) / 1000;
    check('seam4', 0, Math.abs(w.when.audioTime - want) < 1e-9,
      `audioTime ${w.when.audioTime} !== ctxTime+(early+lead) ${want}`);
    check('seam4', 0, Math.abs(w.when.earlyMs + w.rec.deltaMs) < 1e-6, 'earlyMs must be -deltaMs');
    // the virtual host is exact, so every fire lands ON its intended instant;
    // the audio time must then be exactly lead ms in the future, never in the past
    check('seam4', 0, w.when.audioTime >= w.when.ctxTime && !w.when.late,
      `audio instant fell in the past (early ${w.when.earlyMs} ms)`);
    check('seam4', 0, w.rec.audioTime !== undefined && w.rec.earlyMs !== undefined,
      'the drift record must carry the converted instant');
  }
  const nb = [];
  s.registerAdapter('plain', { caps: {}, actuate: (p, rec, when) => nb.push(when) });
  s.schedule({ at: t.position() + 50, kind: 'plain', payload: {} });
  vr.advanceTo(vr.now() + 200);
  check('seam4', 0, nb.length === 1 && nb[0] === null, 'the bridge must be opt-in: no caps.audio -> when === null');
}

// --- seam 5: the reduce POLICY must see the whole prefix, not one scan's
//     missed events. Reproduced deterministically: a freeze host swallows ticks
//     for a window (the SIGSTOP shape) so a batch of events is missed mid-run;
//     the reducer is NON-COMMUTATIVE, so a batch-only reducer cannot be right.
function freezeHost(inner, fromT, toT, nowFn) {
  return {
    name: 'freeze',
    start(cb, ms) { inner.start(() => { if (nowFn() >= fromT && nowFn() < toT) return; cb(); }, ms); },
    stop() { inner.stop(); },
    setTimer(delayMs, fn) {
      const due = nowFn() + Math.max(0, delayMs);
      if (due >= fromT && due < toT) return inner.setTimer(toT - nowFn(), fn); // delivered at wake
      return inner.setTimer(delayMs, fn);
    },
  };
}
for (let seed = 1; seed <= Math.ceil(NSEEDS / 3); seed++) {
  const rand = mulberry32(seed * 15485863 + 7);
  const events = [];
  // add/mul only — NO `set`. A `set` inside the missed window would let a
  // batch-only fold resynchronize by luck and hide the very bug under test.
  const op2 = () => (rand() < 0.5 ? { f: 'add', v: 1 + Math.floor(rand() * 9) } : { f: 'mul', v: 2 + Math.floor(rand() * 2) });
  for (let i = 0; i < 240; i++) events.push({ at: +(i * 100 + 50).toFixed(3), op: op2(), idx: i });
  const vr = createVirtualRuntime(1_000_000);
  const FROM = 1_000_000 + 8000, TO = FROM + 3000;      // 3 s freeze at t=8 s
  const transport = createTransport({ clock: vr.clock });
  const sched = createScheduler(transport, {
    tickMs: 25, horizonMs: 100, host: freezeHost(vr.host, FROM, TO, vr.now),
  });
  let asserted = null;
  const calls = [];   // {reason, pos, prefixN, missedN, sinceN, fromPos}
  sched.registerAdapter('ctr', {
    caps: { catchUp: 'reduce' },
    actuate() { /* fired events actuate; reduce ASSERTS absolute state */ },
    reduce(payloads) { let s = 0; for (const p of payloads) s = apply(s, p.op); return s; },
    assertState(state, info) {
      asserted = state;
      // what the OLD library handed the reducer: this scan's missed events only
      let batchOnly = 0;
      for (const e of info.missed) batchOnly = apply(batchOnly, e.payload.op);
      // and the documented alternative: fold forward from the last snapshot
      let fromSnap = info.from.state === undefined ? 0 : info.from.state;
      for (const e of info.since) fromSnap = apply(fromSnap, e.payload.op);
      calls.push({ reason: info.reason, pos: info.pos, prefixN: info.prefix.length,
                   missedN: info.missed.length, sinceN: info.since.length, fromPos: info.from.pos,
                   batchOnly, fromSnap });
    },
  });
  for (const e of events) sched.schedule({ at: e.at, kind: 'ctr', payload: { op: e.op } });
  sched.start(); transport.seek(0); transport.play();
  vr.advanceTo(1_000_000 + 25000);
  const catchUps = calls.filter((c) => c.reason === 'catch-up');
  check('seam5', seed, catchUps.length === 1, `freeze produced ${catchUps.length} catch-up reduce calls (expect 1)`);
  if (catchUps.length) {
    const c = catchUps[0];
    const want = reduce(events, c.pos);
    check('seam5', seed, asserted === want.state,
      `reduce policy asserted ${asserted}, whole-prefix fold is ${want.state} (batch-only reducer bug)`);
    check('seam5', seed, c.prefixN === want.count,
      `reducer got a prefix of ${c.prefixN}, whole prefix at pos ${c.pos} is ${want.count}`);
    // the one-scan batch is a strict, much smaller subset — the OLD input
    check('seam5', seed, c.missedN > 0 && c.missedN < c.prefixN,
      `missed batch ${c.missedN} vs prefix ${c.prefixN} — the freeze did not actually starve a scan`);
    // and the explicit fromSnapshot alternative is consistent with the prefix
    check('seam5', seed, c.sinceN <= c.prefixN && c.fromPos < c.pos,
      `from/since inconsistent: from.pos=${c.fromPos} since=${c.sinceN} prefix=${c.prefixN}`);
    check('seam5', seed, c.fromSnap === want.state,
      `fold(from.state, since) = ${c.fromSnap} !== whole-prefix fold ${want.state}`);
    // THE WITNESS: the old one-scan input gives a DIFFERENT answer, so this
    // test would have failed against the pre-v0.2 library.
    check('seam5', seed, c.batchOnly !== want.state,
      `batch-only fold coincidentally equals the prefix fold (${c.batchOnly}) — test is blind this seed`);
  }
  const posAtWake = catchUps.length ? catchUps[0].pos : null;
  // and the seek path re-folds + re-asserts through the SAME reducer (no client
  // code): after a backward seek the asserted state === reduce(<= target)
  const target = 5000;
  transport.pause(); transport.seek(target);
  check('seam5', seed, asserted === reduce(events, target).state,
    `after seek(${target}) asserted ${asserted} !== reduce(<=t) ${reduce(events, target).state}`);
  check('seam5', seed, sched.reduceAt('ctr', target) === reduce(events, target).state,
    'reduceAt() (the C2 left-hand side, queryable) disagrees with the fold');
}

const basicRuns = NSEEDS, gymRuns = Math.ceil(NSEEDS / 2), seamRuns = Math.ceil(NSEEDS / 3);
if (failures) {
  console.error(`prop-test: ${failures} VIOLATION(S) across ${basicRuns} basic + ${gymRuns} gymnastics seeds + seams`);
  process.exit(1);
}
console.log(`prop-test OK: ${basicRuns} basic + ${gymRuns} gymnastics seeds, 0 violations (reduce(<=t) === play(0->t))`);
console.log(`seams OK: adapter registry / setRate!=play / worker default / wall->audio bridge / whole-prefix reduce (${seamRuns} freeze seeds) / non-destructive drift`);
