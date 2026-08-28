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
  createTransport, createScheduler, createVirtualRuntime, createDeck,
  defaultTickHost, tickHostByKind,
} from '../transport.mjs';
import { createNest, composeRate, rateLattice, MAX_NEST_DEPTH } from '../nested.mjs';

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

// ---------------------------------------------------------------------------
// suite 4: NESTING — a span that is itself a deck (timeline/nested.mjs).
// Nested seek (reduce-on-seek must run INSIDE the child), rate composition
// (incl. honest degradation against the child's caps.rates lattice), nested
// pause, absence outside the span, and cycle/depth rejection.
//
// Two decks need two tick metronomes on ONE clock: the virtual host holds a
// single tickCb, so it is fanned out here (setTimer passes straight through, so
// commit ordering is still exact).
// ---------------------------------------------------------------------------
function sharedVR(startMs = 1_000_000) {
  const vr = createVirtualRuntime(startMs);
  const cbs = new Set();
  let started = false;
  vr.newHost = () => {
    let mine = null;
    return {
      name: 'virtual',
      start(cb, ms) {
        mine = cb; cbs.add(cb);
        if (!started) { started = true; vr.host.start(() => { for (const c of [...cbs]) c(); }, ms || 25); }
      },
      stop() { if (mine) cbs.delete(mine); },
      setTimer: (d, f) => vr.host.setTimer(d, f),
    };
  };
  return vr;
}

const NOTES = [
  { n: 60, on: 100, off: 400 }, { n: 62, on: 500, off: 1200 },
  { n: 64, on: 900, off: 2500 }, { n: 67, on: 1500, off: 3800 },
  { n: 72, on: 2600, off: 3000 },
];
const CHILD_END = 4000;
const heldAt = (t) => NOTES.filter((x) => x.on <= t && x.off > t).map((x) => x.n).sort((a, b) => a - b);
const CHILD_RATES = [0.25, 0.5, 1, 2, 4];

function makeChild(vr, sink) {
  const items = [];
  for (const x of NOTES) {
    items.push({ at: x.on, kind: 'note', payload: { raw: [144, x.n, 90] } });
    items.push({ at: x.off, kind: 'note', payload: { raw: [128, x.n, 0] } });
  }
  return createDeck({
    clock: vr.clock, tickHost: vr.newHost(), items, range: [0, CHILD_END],
    adapters: {
      note: {
        caps: { catchUp: 'reduce', rates: CHILD_RATES, reducible: true, seekable: true },
        actuate(p) { const [s, n] = p.raw; if ((s & 0xf0) === 0x90) sink.live.add(n); else sink.live.delete(n); sink.fires++; },
        reduce(payloads) {
          const held = new Map();
          for (const p of payloads) { const [s, n, v] = p.raw; if ((s & 0xf0) === 0x90 && v > 0) held.set(n, p); else held.delete(n); }
          return held;
        },
        assertState(held, info) {
          sink.live = new Set(held.keys());
          sink.asserts.push({ pos: +info.pos.toFixed(3), reason: info.reason, keys: [...held.keys()].sort((a, b) => a - b) });
        },
      },
    },
  });
}
const heldNow = (sink) => [...sink.live].sort((a, b) => a - b);

// --- 4a: nested seek, nested pause, absence, rate composition --------------
{
  const vr = sharedVR();
  const sink = { live: new Set(), asserts: [], fires: 0 };
  const child = makeChild(vr, sink);
  const marks = [];
  const parent = createDeck({
    clock: vr.clock, tickHost: vr.newHost(), range: [0, 20000],
    items: [{ at: 1000, kind: 'mark', payload: { v: 'a' } }, { at: 9000, kind: 'mark', payload: { v: 'b' } }],
    adapters: { mark: { caps: { catchUp: 'burst' }, actuate: (p) => marks.push(p.v) } },
  });
  const nest = createNest(parent, { toleranceMs: 5, hardSeekMs: 200 });
  const AT = 3000;
  const sp = nest.add({ id: 'sess', at: AT, rate: 1, deck: child });

  check('nest-span', 0, Math.abs(sp.parentDur - CHILD_END) < 1e-9,
    `span length in parent domain ${sp.parentDur} !== child duration ${CHILD_END} at rate 1`);
  check('nest-span', 0, String(rateLattice(child)) === String(CHILD_RATES),
    `rate lattice ${rateLattice(child)} !== child caps.rates`);
  check('nest-span', 0, parent.caps('deck-span').nested === true && parent.caps('deck-span').clockMaster === false,
    'the nested adapter must declare nested:true and clockMaster:false (rule 4)');

  // --- absence BEFORE the span: the child is absent, and absence is content
  parent.seek(500);
  check('nest-absent', 0, nest.present('sess') === false && !child.playing(),
    `child must be absent+paused before the span (present=${nest.present('sess')})`);
  check('nest-absent', 0, heldNow(sink).length === 0, `child held ${heldNow(sink)} while absent`);
  check('nest-absent', 0, child.position() === 0, `absent-before must park the child at its range start, got ${child.position()}`);

  // --- NESTED SEEK: a parent seek into the middle of the span is a seek in
  //     the child, and the child's reduce-on-seek runs (assertState holds)
  for (const u of [0, 700, 1500, 2600, 3999]) {
    sink.asserts.length = 0;
    parent.seek(AT + u);
    check('nest-seek', u, Math.abs(child.position() - u) < 1e-6,
      `parent seek to ${AT + u} put the child at ${child.position()}, want ${u}`);
    const want = heldAt(u);
    check('nest-seek', u, String(heldNow(sink)) === String(want),
      `held after nested seek = [${heldNow(sink)}], reduce(<=${u}) = [${want}]`);
    const mine = sink.asserts.filter((a) => a.reason === 'seek');
    check('nest-seek', u, mine.length >= 1 && Math.abs(mine[mine.length - 1].pos - u) < 1e-6,
      `reduce-on-seek did not run IN THE CHILD at ${u} (${JSON.stringify(sink.asserts)})`);
    check('nest-seek', u, String(child.reduceAt('note', u) ? [...child.reduceAt('note', u).keys()].sort((a, b) => a - b) : []) === String(want),
      'child reduceAt disagrees with the fold — nesting broke the C2 left-hand side');
  }

  // --- NESTED PAUSE: pause the parent, everything stops and holds
  parent.seek(AT + 1000);
  parent.play();
  check('nest-play', 0, child.playing(), 'parent play must propagate into the child');
  vr.advanceTo(vr.now() + 500);
  nest.servo();
  check('nest-play', 0, Math.abs(parent.position() - (AT + 1500)) < 1e-6 && Math.abs(child.position() - 1500) < 1e-6,
    `1x: parent ${parent.position()} child ${child.position()} after 500 ms (want ${AT + 1500} / 1500)`);
  parent.pause();
  check('nest-pause', 0, !child.playing() && !parent.playing(), 'parent pause must stop the child');
  const heldParent = parent.position(), heldChild = child.position();
  vr.advanceTo(vr.now() + 3000);
  check('nest-pause', 0, parent.position() === heldParent && child.position() === heldChild,
    `positions moved while paused: parent ${parent.position()} child ${child.position()}`);
  check('nest-pause', 0, nest.servo() === 0, 'the servo must not correct anything while the parent is paused');

  // --- RATE COMPOSES multiplicatively (and setRate still arms while paused)
  parent.setRate(2);
  check('nest-rate', 0, !parent.playing() && !child.playing(), 'setRate must not start either deck (seam 2, one level down)');
  check('nest-rate', 0, child.targetRate() === 2, `child targetRate ${child.targetRate()} !== parentRate 2 x spanRate 1`);
  parent.play();
  vr.advanceTo(vr.now() + 1000);
  nest.servo();
  check('nest-rate', 0, Math.abs(parent.position() - (heldParent + 2000)) < 1e-6,
    `parent at 2x advanced ${parent.position() - heldParent} ms in 1000 ms wall`);
  check('nest-rate', 0, Math.abs(child.position() - (heldChild + 2000)) < 1e-6,
    `child at composed 2x advanced ${child.position() - heldChild} ms (mapping and child transport disagree)`);
  parent.pause();

  // --- ABSENCE OUTSIDE the span while the parent's own layers keep playing
  marks.length = 0;
  parent.setRate(1);
  parent.seek(8000);
  check('nest-absent', 1, nest.present('sess') === false && !child.playing(),
    'past the span end the child must be absent');
  check('nest-absent', 1, heldNow(sink).length === 0, `child still holding ${heldNow(sink)} past the span end`);
  check('nest-absent', 1, child.position() === CHILD_END,
    `absent-after must park the child at its range end, got ${child.position()}`);
  parent.play();
  vr.advanceTo(vr.now() + 1500);
  check('nest-absent', 1, marks.join(',') === 'b', `parent layers must keep playing outside the span (marks=[${marks}])`);
  check('nest-absent', 1, !child.playing() && child.position() === CHILD_END,
    'the absent child must not advance while the parent plays past it');
  parent.pause();

  // --- the FOLLOW servo pulls a drifted child back with sync(), not a re-fire
  parent.seek(AT + 2000);
  parent.play();
  const firesBefore = sink.fires;
  child.transport.sync(child.position() + 60);          // shove the child out of band
  const n = nest.servo();
  check('nest-servo', 0, n === 1 && Math.abs(child.position() - 2000) < 1e-6,
    `servo corrections ${n}, child at ${child.position()} (want 2000)`);
  check('nest-servo', 0, sink.fires === firesBefore, 'a servo correction must not re-fire anything (sync, not seek)');
  parent.pause();

  const ds = nest.driftStats();
  check('nest-stats', 0, ds.spans.length === 1 && ds.spans[0].child && ds.spans[0].child.kinds,
    'driftStats must NEST the child channel, not flatten it');
  check('nest-stats', 0, ds.spans[0].childRange[1] === CHILD_END && ds.depth === 2,
    `nested depth/range wrong: ${JSON.stringify({ d: ds.depth, r: ds.spans[0].childRange })}`);

  nest.dispose(); parent.dispose(); child.dispose();
}

// --- 4b: rate composition against a child that CANNOT honour it ------------
{
  check('nest-rate', 1, composeRate(2, 1, CHILD_RATES).chose === 2 && !composeRate(2, 1, CHILD_RATES).degraded, 'exact composed rate must not degrade');
  check('nest-rate', 1, composeRate(2, 3, CHILD_RATES).chose === 4 && composeRate(2, 3, CHILD_RATES).degraded,
    `6x on a [${CHILD_RATES}] lattice must degrade to 4, got ${JSON.stringify(composeRate(2, 3, CHILD_RATES))}`);
  check('nest-rate', 1, composeRate(1, 0.3, CHILD_RATES).chose === 0.25,
    `0.3x must pick the nearest in LOG space (0.25), got ${composeRate(1, 0.3, CHILD_RATES).chose}`);
  check('nest-rate', 1, composeRate(0, 3, CHILD_RATES).chose === 0 && !composeRate(0, 3, CHILD_RATES).degraded,
    'pause must always be expressible and never degrade');
  check('nest-rate', 1, composeRate(1, 7, null).chose === 7, 'a child declaring no rates accepts any composed rate');

  const vr = sharedVR();
  const sink = { live: new Set(), asserts: [], fires: 0 };
  const child = makeChild(vr, sink);
  const parent = createDeck({ clock: vr.clock, tickHost: vr.newHost(), range: [0, 20000], items: [] });
  const nest = createNest(parent, { toleranceMs: 5 });
  nest.add({ id: 'fast', at: 0, rate: 3, deck: child });   // 3x span: 4000 ms child -> 1333 ms parent
  check('nest-rate', 2, Math.abs(nest.span('fast').parentDur - CHILD_END / 3) < 1e-9,
    `a 3x span must occupy childDur/3 of parent time, got ${nest.span('fast').parentDur}`);
  parent.seek(0);
  parent.setRate(2);                                       // wanted 6x, lattice tops out at 4x
  const r = nest.rateReport('fast');
  check('nest-rate', 2, r.wanted === 6 && r.chose === 4 && r.degraded === true,
    `composition must degrade HONESTLY: ${JSON.stringify(r)}`);
  check('nest-rate', 2, child.targetRate() === 4, `child must run at the rate it CHOSE (4), got ${child.targetRate()}`);
  check('nest-rate', 2, nest.driftStats().spans[0].degradations === 1, 'a degradation must be counted, not swallowed');
  // and the servo pays for it in corrections rather than lying about position
  parent.play();
  vr.advanceTo(vr.now() + 200);
  const corr = nest.servo();
  check('nest-rate', 2, corr === 1 && Math.abs(child.position() - 1200) < 1e-6,
    `the degraded child must be re-anchored to the mapping (${child.position()}, want 1200, corrections ${corr})`);
  parent.pause();
  nest.dispose(); parent.dispose(); child.dispose();
}

// --- 4c: cycles and the depth limit ---------------------------------------
{
  const vr = sharedVR();
  const mk = () => createDeck({ clock: vr.clock, tickHost: vr.newHost(), range: [0, 1000], items: [], autoStart: false });
  const threw = (fn) => { try { fn(); return null; } catch (e) { return e.message; } };

  const a = mk(), b = mk(), c = mk();
  const na = createNest(a), nb = createNest(b), nc = createNest(c);
  check('nest-cycle', 0, /cannot contain itself/.test(threw(() => na.add({ id: 'self', deck: a })) || ''),
    'a deck containing ITSELF must be rejected');
  na.add({ id: 'b', deck: b });
  nb.add({ id: 'c', deck: c });
  check('nest-cycle', 0, /cycle/.test(threw(() => nc.add({ id: 'a', deck: a })) || ''),
    'c -> a closes the a -> b -> c cycle and must be rejected');
  check('nest-cycle', 0, threw(() => na.add({ id: 'c', deck: c })) === null,
    'a -> c is a DAG edge (a deck appearing twice in the tree), not a cycle: it must be allowed');
  check('nest-cycle', 0, /already exists/.test(threw(() => na.add({ id: 'b', deck: b })) || ''),
    'duplicate span id must be rejected');

  // depth: a chain of MAX_NEST_DEPTH decks is legal, one more is not
  const chain = [], nests = [];
  for (let i = 0; i < MAX_NEST_DEPTH + 1; i++) chain.push(mk());
  let err = null;
  for (let i = 0; i < MAX_NEST_DEPTH; i++) {
    const n = createNest(chain[i]); nests.push(n);
    const e = threw(() => n.add({ id: 'k', deck: chain[i + 1] }));
    if (e) { err = { i, e }; break; }
  }
  check('nest-depth', 0, err !== null && err.i === MAX_NEST_DEPTH - 1 && /depth/.test(err.e),
    `chain of ${MAX_NEST_DEPTH} must be legal and ${MAX_NEST_DEPTH + 1} rejected; got ${JSON.stringify(err)}`);

  // exactly one clock master per parent (rule 4)
  const d = mk(), e2 = mk(), nd = createNest(d);
  nd.add({ id: 'm1', deck: e2, master: true });
  check('nest-master', 0, nd.masterId() === 'm1', 'the declared master must be recorded');
  check('nest-master', 0, /master already claimed/.test(threw(() => nd.add({ id: 'm2', deck: mk(), master: true })) || ''),
    'a second nested clock master must be rejected');

  for (const n of [na, nb, nc, nd, ...nests]) n.dispose();
  for (const dk of [a, b, c, d, e2, ...chain]) dk.dispose();
}

// --- 4d: the MASTER direction — the parent slaves to the CHILD'S POSITION,
//     never to whatever masters the child (rule 4, the important half).
{
  const vr = sharedVR();
  const sink = { live: new Set(), asserts: [], fires: 0 };
  const child = makeChild(vr, sink);
  const parent = createDeck({ clock: vr.clock, tickHost: vr.newHost(), range: [0, 20000], items: [] });
  const nest = createNest(parent, { toleranceMs: 5 });
  const AT = 2000;
  nest.add({ id: 'sess', at: AT, rate: 0.5, deck: child, master: true });  // 0.5x: 4000 child -> 8000 parent
  parent.seek(AT + 1000);
  check('nest-master', 1, Math.abs(child.position() - 500) < 1e-6,
    `a 0.5x span maps parent+1000 to child 500, got ${child.position()}`);
  parent.play();
  vr.advanceTo(vr.now() + 400);
  // something INSIDE the child (its own media master) shoves the child forward.
  // The parent must follow the CHILD'S POSITION, and the child must not be
  // dragged back by the parent.
  const cBefore = child.position();
  child.transport.sync(cBefore + 90);
  const n = nest.servo();
  check('nest-master', 1, n === 1, `master span must correct the PARENT (corrections ${n})`);
  check('nest-master', 1, Math.abs(child.position() - (cBefore + 90)) < 1e-6,
    `the parent must not drag its master child back (child ${child.position()})`);
  check('nest-master', 1, Math.abs(parent.position() - (AT + (cBefore + 90) / 0.5)) < 1e-6,
    `parent must land on toParent(childPos) = ${AT + (cBefore + 90) / 0.5}, got ${parent.position()}`);
  parent.pause();
  check('nest-master', 1, nest.servo() === 0, 'a paused parent must not be synced by its child');

  // A DEGRADED CHILD CANNOT MASTER: at parent 1.5x the composed rate 0.75x is
  // off the child's lattice, so the child runs at a rate the parent did not ask
  // for. Mastering must SUSPEND (else that rate is silently imposed on the whole
  // arrangement) and the direction flip back to follow.
  parent.setRate(1.5);
  const rep = nest.rateReport('sess');
  check('nest-master', 2, rep.wanted === 0.75 && rep.chose === 1 && rep.degraded,
    `1.5 x 0.5 = 0.75 must round onto the lattice: ${JSON.stringify(rep)}`);
  parent.play();
  vr.advanceTo(vr.now() + 300);
  const pBefore = parent.position();
  const n2 = nest.servo();
  check('nest-master', 2, n2 === 1 && parent.position() === pBefore,
    `a degraded child must NOT drive the parent (corrections ${n2}, parent moved ${parent.position() - pBefore})`);
  check('nest-master', 2, Math.abs(child.position() - (parent.position() - AT) * 0.5) < 1e-6,
    `the degraded child must be re-anchored to the parent's mapping, got ${child.position()}`);
  check('nest-master', 2, nest.driftStats().spans[0].masterSuspended > 0,
    'the suspension must be counted, not hidden');
  parent.pause();
  nest.dispose(); parent.dispose(); child.dispose();
}

// ---------------------------------------------------------------------------
// suite 5: CONTINUOUS KINDS (v0.4). A kind whose state is defined BETWEEN
// samples. Every arm here is one of the six seams proto/paths filed:
//   5a sampleAt() against an ANALYTIC curve (and the proof that a two-sample
//      ctx really does force a C1 interpolator down to linear)
//   5b the CURSOR is not O(n) — comparisons counted under forward play,
//      backward seek and random access
//   5c info.next / info.nexts: an interpolated reduce is expressible, and it
//      agrees with sampleAt to the last bit
//   5d caps are READ, and refusals are reported {wanted, chose, degraded, reason}
//   5e caps.followsTransport: play/pause/rate delivered, seek and sync NOT
//   5f logdeck: a row's epoch-µs `at` must not clobber the injected position `at`
// ---------------------------------------------------------------------------
import { createCursor } from '../transport.mjs';
import { makeLogDeck } from '../logdeck.mjs';

const CURVE = { A: 380, B: 240, cx: 480, cy: 300, f1: 1, f2: 2, phase: 0.4 };
const DUR = 6000;
const curveAt = (ms) => {
  const s = ms / DUR;
  return { x: CURVE.cx + CURVE.A * Math.sin(2 * Math.PI * CURVE.f1 * s + CURVE.phase),
           y: CURVE.cy + CURVE.B * Math.sin(2 * Math.PI * CURVE.f2 * s) };
};
const lerp1 = (a, b, u) => a + (b - a) * u;
const clamp01 = (u) => Math.min(1, Math.max(0, u));

/** time-knotted (non-uniform) Catmull-Rom as a cubic Hermite — the same form
 *  proto/paths uses; p0/p3 null -> reflected phantom endpoints. */
function catmull(p0, p1, p2, p3, u) {
  const t1 = p1.at, t2 = p2.at, h = t2 - t1;
  if (!(h > 0)) return { x: p1.x, y: p1.y, at: t1 };
  const P0 = p0 && p0.at < t1 ? p0 : { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y, at: t1 - h };
  const P3 = p3 && p3.at > t2 ? p3 : { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y, at: t2 + h };
  const d1 = t2 - P0.at, d2 = P3.at - t1;
  const m1x = (p2.x - P0.x) / d1, m1y = (p2.y - P0.y) / d1;
  const m2x = (P3.x - p1.x) / d2, m2y = (P3.y - p1.y) / d2;
  const u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  return { x: h00 * p1.x + h10 * h * m1x + h01 * p2.x + h11 * h * m2x,
           y: h00 * p1.y + h10 * h * m1y + h01 * p2.y + h11 * h * m2y, at: lerp1(t1, t2, u) };
}

function makePointerish() {
  const stats = { interp: 0, reduce: 0, transport: [] };
  const ad = {
    stats,
    caps: {
      continuous: true, interpolate: true, interpolators: ['hold', 'linear', 'catmull-rom'],
      neighbourhood: 1,                    // 0 = two-sample, 1 = one each side
      tier: 1,                             // §5b: what I return BETWEEN samples is
                                           // tier-1 restoration, and I say so —
                                           // which is what arms the firewall (E3)
      method: 'catmull-rom', catchUp: 'reduce', assertOnSeek: true,
      seek: true, rate: true, rates: [0.25, 0.5, 1, 2, 4], followsTransport: true,
    },
    actuate() {},
    transport(st) { stats.transport.push(st.reason); },
    interpolate(a, b, u, ctx) {
      stats.interp++;
      const m = (ctx && ctx.mode) || 'catmull-rom';
      if (m === 'hold') return { x: a.x, y: a.y, at: a.at, method: 'hold' };
      const lin = { x: lerp1(a.x, b.x, u), y: lerp1(a.y, b.y, u), at: lerp1(a.at, b.at, u), method: 'linear' };
      if (m === 'linear') return lin;
      // A SPLINE IS NOT A FUNCTION OF TWO SAMPLES: with no neighbourhood at all
      // this is the honest best, and it says so.
      if (!ctx || (ctx.prev === undefined && ctx.next === undefined))
        return { ...lin, method: 'linear-degraded' };
      return { ...catmull(ctx.prev || null, a, b, ctx.next || null, u), method: 'catmull-rom' };
    },
    reduce(payloads, pos, info) {
      stats.reduce++;
      if (!payloads.length) return null;
      const a = payloads[payloads.length - 1];
      const b = info && info.next && info.next.payload;      // C4: the successor
      if (!b || !(b.at > a.at)) return { x: a.x, y: a.y, at: a.at, method: 'hold' };
      return ad.interpolate(a, b, clamp01((pos - a.at) / (b.at - a.at)), {
        prev: payloads[payloads.length - 2],
        next: info.nexts[1] ? info.nexts[1].payload : undefined,
        pos, aAt: a.at, bAt: b.at, dtMs: b.at - a.at,
      });
    },
    assertState() {},
  };
  return ad;
}

function makeContinuousDeck(vr, opts = {}) {
  const { stepMs = 100, jitterMs = 2, seed = 7 } = opts;
  const rand = mulberry32(seed);
  const items = [];
  for (let t = 0; t <= DUR; t += stepMs) {
    const at = t === 0 || t + stepMs > DUR ? t : +(t + (rand() - 0.5) * 2 * jitterMs).toFixed(3);
    const p = curveAt(at);
    items.push({ at, kind: 'p', payload: { x: p.x, y: p.y, at, i: items.length } });
  }
  const ad = makePointerish();
  const disc = { caps: { catchUp: 'burst' }, actuate() {} };
  const deck = createDeck({
    clock: vr.clock, tickHost: vr.newHost(), range: [0, DUR], items: [
      ...items, { at: 500, kind: 'd', payload: { v: 1 } }, { at: 2500, kind: 'd', payload: { v: 2 } },
    ],
    adapters: { p: ad, d: disc },
    // E3: the deck-level policy every omitting query below resolves to. It is
    // here BECAUSE `p` declares caps.tier 1 — without it every sampleAt in
    // suite 5 would throw EVIDENCE_POLICY_REQUIRED, which is the point.
    evidence: opts.evidence === undefined ? { restored: { maxTier: 1 } } : opts.evidence,
  });
  return { deck, ad, items };
}

// --- 5a: sampleAt() vs analytic truth --------------------------------------
{
  const vr = sharedVR();
  const { deck, ad, items } = makeContinuousDeck(vr);
  const err = { hold: [], linear: [], catmull: [], degraded: [] };
  for (let t = 0; t <= DUR; t += 7.3) {
    const truth = curveAt(t);
    const d = (s) => Math.hypot(s.x - truth.x, s.y - truth.y);
    err.hold.push(d(deck.sampleAt('p', t, { mode: 'hold' })));
    err.linear.push(d(deck.sampleAt('p', t, { mode: 'linear' })));
    err.catmull.push(d(deck.sampleAt('p', t)));
    err.degraded.push(d(deck.sampleAt('p', t, { neighbourhood: 0 })));
  }
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const [mh, ml, mc, md] = [mean(err.hold), mean(err.linear), mean(err.catmull), mean(err.degraded)];
  check('cont-sample', 0, mh > ml && ml > mc,
    `sampleAt px error must order hold(${mh.toFixed(3)}) > linear(${ml.toFixed(3)}) > catmull(${mc.toFixed(4)})`);
  check('cont-sample', 0, mc < 0.2, `catmull sampleAt mean error ${mc.toFixed(4)} px (want < 0.2 vs analytic truth)`);
  if (VERBOSE) console.log(`cont-sample mean px error: hold ${mh.toFixed(3)} · linear ${ml.toFixed(4)} · catmull ${mc.toFixed(4)}`);
  check('cont-sample', 0, Math.abs(md - ml) < 1e-9,
    `C3: with neighbourhood 0 a C1 interpolator MUST degrade to linear (${md.toFixed(4)} vs ${ml.toFixed(4)})`);
  check('cont-sample', 0, deck.sampleAt('p', 0, { neighbourhood: 0 }).method === 'linear-degraded',
    'the degradation must be visible in the returned value, not silent');
  // exactly on an attested sample: u === 0, the value IS the sample
  for (const k of [0, 7, 30, items.length - 1]) {
    const it = items[k];
    const s = deck.sampleAt('p', it.at);
    check('cont-sample', k, Math.abs(s.x - it.payload.x) < 1e-9 && Math.abs(s.y - it.payload.y) < 1e-9,
      `sampleAt AT an attested sample must return that sample (i=${k}: ${s.x} vs ${it.payload.x})`);
  }
  // and the ends clamp rather than extrapolate
  const before = deck.sampleAt('p', -5000), after = deck.sampleAt('p', DUR + 5000);
  check('cont-sample', 1, Math.abs(before.x - items[0].payload.x) < 1e-9 &&
    Math.abs(after.x - items[items.length - 1].payload.x) < 1e-9,
    'outside the attested span sampleAt must clamp to the terminal samples, never extrapolate');
  // C2: the raw pair, and caps.neighbourhood honoured
  const br = deck.bracket('p', 1234.5);
  check('cont-bracket', 0, br.a.at <= 1234.5 && br.b.at > 1234.5 && br.u > 0 && br.u < 1,
    `bracket must straddle pos: a=${br.a.at} b=${br.b.at} u=${br.u}`);
  check('cont-bracket', 0, br.prevs.length === 1 && br.nexts.length === 1 &&
    br.prev.i === br.a.i - 1 && br.next.i === br.b.i + 1,
    `caps.neighbourhood=1 must give exactly one sample EACH SIDE of the pair (${br.prevs.length}/${br.nexts.length})`);
  check('cont-bracket', 0, deck.bracket('p', 1234.5, { neighbourhood: 3 }).prevs.length === 3,
    'an explicit neighbourhood override must widen the request');
  check('cont-bracket', 0, ad.stats.interp > 0, 'the library must actually CALL interpolate() (S1: it never did)');
  deck.dispose();
}

// --- 5b: the cursor is O(1) amortised, not O(n) ----------------------------
{
  const vr = sharedVR();
  const N = 2000;
  const mkDeck = (n) => {
    const items = [];
    for (let i = 0; i < n; i++) items.push({ at: i * 10, kind: 'p', payload: { x: i, y: -i, at: i * 10, i } });
    return createDeck({ clock: vr.clock, tickHost: vr.newHost(), range: [0, n * 10], items,
      adapters: { p: makePointerish() }, evidence: { restored: { maxTier: 1 } } });
  };
  const deck = mkDeck(N);
  const cmps = () => deck.cursorStats('p').cursor.comparisons;

  // forward play: 60 Hz over the whole trace — the render loop's access pattern.
  // THE WITNESS that it is not O(n): the same sweep over a 4x longer trace must
  // cost the same PER FRAME. A rescan would cost 4x more.
  const sweep = (dk, n, frames) => {
    dk.sampleAt('p', 0);
    const c0 = dk.cursorStats('p').cursor.comparisons;
    for (let f = 0; f < frames; f++) dk.sampleAt('p', (f * n * 10) / frames);
    return (dk.cursorStats('p').cursor.comparisons - c0) / frames;
  };
  const FRAMES = 1200;
  const perForward = sweep(deck, N, FRAMES);
  const big = mkDeck(N * 4);
  const perForwardBig = sweep(big, N * 4, FRAMES * 4);   // same cadence, 4x the content
  check('cont-cursor', 0, perForward < 12,
    `forward play: ${perForward.toFixed(2)} comparisons/frame over ${N} samples (a rescan would be ~${N / 2})`);
  check('cont-cursor', 0, perForwardBig < perForward * 1.5,
    `NOT O(n): ${N} samples cost ${perForward.toFixed(2)} cmp/frame, ${N * 4} samples cost ${perForwardBig.toFixed(2)} (a rescan would be 4x)`);
  big.dispose();

  // backward seek, then forward again: the cursor must re-find, not walk back
  const c1 = cmps();
  for (let f = FRAMES; f > 0; f--) deck.sampleAt('p', (f * N * 10) / FRAMES);
  const perBackward = (cmps() - c1) / FRAMES;
  check('cont-cursor', 1, perBackward < 2 * Math.ceil(Math.log2(N)) + 8,
    `backward sweep: ${perBackward.toFixed(2)} comparisons/call (binary-search bound ~${2 * Math.ceil(Math.log2(N)) + 8})`);

  // random access: strictly bounded by the binary search, never by n
  const rand = mulberry32(4242);
  const c2 = cmps();
  const K = 400;
  for (let k = 0; k < K; k++) deck.sampleAt('p', rand() * N * 10);
  const perRandom = (cmps() - c2) / K;
  check('cont-cursor', 2, perRandom < 2 * Math.ceil(Math.log2(N)) + 8 && perRandom < N / 50,
    `random access: ${perRandom.toFixed(2)} comparisons/call — must be O(log n), not O(n)=${N}`);
  const st = deck.cursorStats('p').cursor;
  if (VERBOSE) console.log(`cont-cursor cmp/call: forward ${perForward.toFixed(2)} (n=${N}) · ${perForwardBig.toFixed(2)} (n=${N * 4}) · backward ${perBackward.toFixed(2)} · random ${perRandom.toFixed(2)} · rescan would be ${N / 2}`);
  check('cont-cursor', 3, st.advances > 0 && st.searches > 0,
    `the cursor must use BOTH paths (linear advance ${st.advances}, binary search ${st.searches})`);
  // the free-standing cursor is the same object a client can put over its own
  // un-logged lanes (proto/paths' evidence lane)
  const rows = [];
  for (let k = 0; k < N; k++) rows.push({ at: k * 10, x: k });
  const cur = createCursor(rows);
  const b = cur.bracket(12345, 1);
  check('cont-cursor', 4, b.a.at <= 12345 && b.b.at > 12345 && b.prev && b.next,
    'the exported cursor must bracket a plain array too');
  deck.dispose();
}

// --- 5c: info.next makes an interpolated reduce expressible ----------------
{
  const vr = sharedVR();
  const { deck, ad } = makeContinuousDeck(vr);
  const seen = [];
  const spy = { ...ad, reduce(payloads, pos, info) {
    seen.push({ pos, hasNext: !!info.next, nexts: info.nexts.length,
                nextAt: info.next ? info.next.at : null, prefixN: payloads.length });
    return ad.reduce(payloads, pos, info);
  } };
  deck.sched.registerAdapter('p', spy);
  for (const t of [137.5, 1000.4, 3333.3, 4750.5]) {
    const red = deck.reduceAt('p', t);
    const smp = deck.sampleAt('p', t);
    const info = seen[seen.length - 1];
    check('cont-next', 0, info.hasNext && info.nextAt > t,
      `info.next must be the first event with at > pos (${info.nextAt} vs pos ${t})`);
    check('cont-next', 0, info.nexts === 2,
      `info.nexts must carry 1 + caps.neighbourhood = 2 successors, got ${info.nexts}`);
    check('cont-next', 0, red.method === 'catmull-rom',
      `an INTERPOLATED reduce must be expressible now (method=${red.method})`);
    check('cont-next', 0, Math.abs(red.x - smp.x) < 1e-9 && Math.abs(red.y - smp.y) < 1e-9,
      `reduce(prefix + successor) must equal sampleAt at ${t}: (${red.x},${red.y}) vs (${smp.x},${smp.y})`);
    const truth = curveAt(t);
    check('cont-next', 0, Math.hypot(red.x - truth.x, red.y - truth.y) < 1.0,
      `the interpolated reduce must land near analytic truth at ${t}`);
  }
  // seek routes through the same reducer, and past the end there IS no
  // successor: the reducer degrades to hold and says so.
  deck.seek(DUR + 10);
  const tail = deck.reduceAt('p', DUR + 10);
  check('cont-next', 1, tail.method === 'hold',
    `past the last attested sample the successor is genuinely absent — hold, honestly (got ${tail.method})`);
  deck.dispose();
}

// --- 5d: the caps are READ, and refusals are reported ----------------------
{
  const vr = sharedVR();
  const { deck } = makeContinuousDeck(vr);
  // a DISCRETE kind sampled between two events: zero-order hold + a report
  const held = deck.sampleAt('d', 1500);
  const dg = deck.degradations('d');
  check('cont-caps', 0, held && held.v === 1 && dg.count > 0 && dg.reports[0].chose === 'hold' && dg.reports[0].degraded,
    `sampling a discrete kind must hold AND report: ${JSON.stringify(dg.reports[0])}`);
  const r1 = deck.request('p', { interpolate: 'bezier' });
  check('cont-caps', 1, r1.degraded && r1.chose === 'catmull-rom' && /interpolators/.test(r1.reason),
    `an unsupported interpolator must degrade honestly: ${JSON.stringify(r1)}`);
  check('cont-caps', 1, !deck.request('p', { interpolate: 'catmull-rom' }).degraded,
    'a supported interpolator must NOT report a degradation');
  const r2 = deck.request('p', { neighbourhood: 3 });
  check('cont-caps', 2, r2.degraded && r2.chose === 1 && /neighbourhood/.test(r2.reason),
    `neighbourhood over caps must degrade: ${JSON.stringify(r2)}`);
  const r3 = deck.request('d', { interpolate: true });
  check('cont-caps', 3, r3.degraded && r3.chose === 'hold' && /discrete/.test(r3.reason),
    `asking a discrete kind to interpolate must be refused in words: ${JSON.stringify(r3)}`);
  const r4 = deck.request('p', { rate: 3 });
  check('cont-caps', 4, r4.degraded && r4.chose === 4,
    `rate 3 on a [0.25,0.5,1,2,4] lattice must pick the log-nearest (4): ${JSON.stringify(r4)}`);
  const r5 = deck.request('p', { seek: true, swallowOriginal: true });
  check('cont-caps', 5, r5.per.seek.degraded === false && r5.per.swallowOriginal.degraded === true && r5.degraded,
    `a multi-key ask must answer per key: ${JSON.stringify(r5.per)}`);
  // a claim the adapter cannot back is caught at REGISTRATION, not at 60 Hz
  deck.sched.registerAdapter('liar', { caps: { continuous: true, followsTransport: true }, actuate() {} });
  const lied = deck.degradations('liar');
  check('cont-caps', 6, lied.count === 2 && lied.reports.some((r) => /interpolate/.test(r.reason)) &&
    lied.reports.some((r) => /transport\(state\)/.test(r.reason)),
    `caps.continuous / caps.followsTransport without the method must be reported at registerAdapter: ${JSON.stringify(lied.reports)}`);
  deck.dispose();
}

// --- 5e: caps.followsTransport — play/pause/rate, never seek, never sync ----
{
  const vr = sharedVR();
  const { deck, ad } = makeContinuousDeck(vr);
  ad.stats.transport.length = 0;
  deck.seek(1000);
  check('cont-follow', 0, ad.stats.transport.length === 0,
    'a SEEK must not arrive as a transport() call — seek is reduce + assertState');
  deck.play(); deck.setRate(2); deck.pause();
  check('cont-follow', 1, ad.stats.transport.join(',') === 'play,rate,pause',
    `play/pause/rate must be delivered in order, got [${ad.stats.transport}]`);
  ad.stats.transport.length = 0;
  deck.sync(1200);
  check('cont-follow', 2, ad.stats.transport.length === 0,
    'a servo sync() must never cascade into adapters');
  deck.play(); // an adapter WITHOUT the cap must get nothing
  const quiet = { caps: { catchUp: 'burst' }, actuate() {}, transport() { failures++; } };
  deck.sched.registerAdapter('quiet', quiet);
  deck.pause();
  deck.dispose();
}

// --- 5f: logdeck — the row's epoch-µs `at` must not clobber the injected one -
{
  const vr = sharedVR();
  const T0 = 1_756_000_000_000_000;           // epoch µs, the shape every client stores
  const rows = [{ at: T0, x: 1 }, { at: T0 + 250_000, x: 2 }, { at: T0 + 900_000, x: 3 }];
  const deck = makeLogDeck({
    lanes: [{ kind: 'k', rows, adapter: { caps: { catchUp: 'burst' }, actuate() {} } }],
    leadInMs: 250, clock: vr.clock, tickHost: vr.newHost(), autoStart: false,
  });
  const pays = deck.items.filter((it) => it.kind === 'k');
  check('logdeck-at', 0, pays.every((it) => it.payload.at === it.at),
    `payload.at must be the POSITION-domain at the library injected: ${JSON.stringify(pays.map((p) => [p.at, p.payload.at]))}`);
  check('logdeck-at', 0, pays[0].payload.at === 250 && pays[1].payload.at === 500 && pays[2].payload.at === 1150,
    `position domain wrong: ${pays.map((p) => p.payload.at)}`);
  check('logdeck-at', 0, pays.every((it, i) => it.payload.i === i && it.payload.atUs === rows[i].at),
    'the row\'s own epoch stamp must survive as atUs, and `i` must not be clobbered either');
  check('logdeck-at', 0, pays[2].payload.x === 3, 'the rest of the row must still spread through');
  deck.dispose();
}

// ---------------------------------------------------------------------------
// suite 6: THE EVIDENCE FIREWALL (v0.5, plan-timeline §5b). Interpolation is
// not a rendering detail — it is tier 1 of a restoration spectrum, and a system
// that serves restored material without saying so is lying by omission.
//   6a  attested NEVER returns an interpolated value; restored(tier<=1) does
//   6b  the FORCED-CHOICE rule fires when the policy is omitted, and only where
//       the answer could actually differ
//   6c  a reconstructor APPENDS a derived lane; provenance round-trips
//   6d  a tier-2 lane is EXCLUDED at maxTier 1, not down-mixed
//   6e  REVERSIBILITY: dropping a derived lane leaves the master bit-identical
//   6f  tiers 2/3 are unimplemented BY DESIGN — the same seam, not the same code
// ---------------------------------------------------------------------------

// --- 6a: attested never interpolates; restored(<=1) does -------------------
{
  const vr = sharedVR();
  const { deck, items } = makeContinuousDeck(vr);
  const err = { attested: [], restored: [] };
  let everInterpolated = false;
  const attestedAt = new Set(items.map((it) => +it.at.toFixed(6)));
  for (let t = 0; t <= DUR; t += 7.3) {
    const truth = curveAt(t);
    const a = deck.sampleAt('p', t, { evidence: 'attested' });
    const r = deck.sampleAt('p', t, { evidence: { restored: { maxTier: 1 } } });
    // THE CLAIM: every value 'attested' returns is a row that is IN THE LOG.
    if (!attestedAt.has(+a.at.toFixed(6))) everInterpolated = true;
    if (a.evidence === undefined || a.evidence.interpolated !== false) everInterpolated = true;
    err.attested.push(Math.hypot(a.x - truth.x, a.y - truth.y));
    err.restored.push(Math.hypot(r.x - truth.x, r.y - truth.y));
  }
  const mean = (xs) => xs.reduce((x, y) => x + y, 0) / xs.length;
  const [ma, mr] = [mean(err.attested), mean(err.restored)];
  check('ev-attested', 0, !everInterpolated,
    'evidence:attested returned a value that is NOT an attested row — the firewall leaked');
  check('ev-attested', 0, ma > mr * 100,
    `attested must be the ZERO-ORDER answer and restored the interpolated one: ${ma.toFixed(3)} vs ${mr.toFixed(4)} px`);
  if (VERBOSE) console.log(`ev-attested mean px error: attested(hold) ${ma.toFixed(3)} · restored(tier<=1) ${mr.toFixed(4)}`);
  // and it is REPORTED, in the C6 shape, not silently held
  const dg = deck.degradations('p');
  const rep = dg.reports.find((x) => x.chose === 'attested-hold');
  check('ev-attested', 1, rep && rep.degraded && rep.wanted === 'attested' && /tier-1 restoration/.test(rep.reason),
    `an attested ask served by a hold must be a reported degradation: ${JSON.stringify(rep)}`);
  // reduce() obeys the same firewall: no successor, so the reducer holds
  const rr = deck.reduceAt('p', 1234.5, { evidence: 'attested' });
  const ri = deck.reduceAt('p', 1234.5, { evidence: { restored: { maxTier: 1 } } });
  check('ev-attested', 2, rr.method === 'hold' && ri.method === 'catmull-rom' && attestedAt.has(+rr.at.toFixed(6)),
    `reduce under attested must hold (${rr.method}) and under restored must interpolate (${ri.method})`);
  deck.dispose();
}

// --- 6b: the forced choice ------------------------------------------------
{
  const vr = sharedVR();
  const { deck } = makeContinuousDeck(vr, { evidence: null });   // NO policy, on purpose
  check('ev-forced', 0, deck.evidence() === null, 'a deck with no explicit policy must report none');
  let code = null;
  try { deck.sampleAt('p', 1234.5); } catch (e) { code = e.code; }
  check('ev-forced', 0, code === 'EVIDENCE_POLICY_REQUIRED',
    `sampleAt on a tier-declaring kind with no policy must THROW, got ${code}`);
  code = null;
  try { deck.reduceAt('p', 1234.5); } catch (e) { code = e.code; }
  check('ev-forced', 1, code === 'EVIDENCE_POLICY_REQUIRED',
    `reduce on a tier-declaring kind with no policy must THROW, got ${code}`);
  // ...and ONLY where the answer could differ. These cannot invent, so they answer.
  check('ev-forced', 2, deck.sampleAt('d', 1500).v === 1,
    'a DISCRETE kind cannot interpolate, so its answer is identical under all three policies and must not throw');
  check('ev-forced', 2, !!deck.bracket('p', 1234.5) && deck.window('p', 0, 300).length > 0,
    'bracket()/window() over an ATTESTED lane return the same rows under every policy and must not throw');
  // the per-call policy satisfies it, and so does an explicitly set deck policy
  check('ev-forced', 3, !!deck.sampleAt('p', 1234.5, { evidence: 'all' }), 'a per-call policy must satisfy the rule');
  deck.setEvidence({ restored: { maxTier: 1 } });
  check('ev-forced', 3, deck.evidence().maxTier === 1 && !!deck.sampleAt('p', 1234.5),
    'an EXPLICIT deck policy is what an omitting call resolves to');
  let bad = null;
  try { deck.sampleAt('p', 0, { evidence: true }); } catch (e) { bad = e.message; }
  check('ev-forced', 4, bad && /unknown policy/.test(bad), `a bogus policy must be refused in words: ${bad}`);
  deck.dispose();
}

// --- 6c/6d/6e: reconstructors, provenance, exclusion, reversibility --------
{
  const vr = sharedVR();
  const { deck, items } = makeContinuousDeck(vr);
  // the master trace, byte for byte, BEFORE any restoration exists
  const masterBefore = JSON.stringify(deck.eventsOf('p'));
  const auditBefore = JSON.stringify(deck.audit().fires.filter((f) => f.kind === 'p'));
  check('ev-recon', 0, !JSON.parse(masterBefore).some((r) => 'provenance' in r),
    'an attested row must carry NO provenance key at all — absence is the definition (E1)');

  const rc = deck.registerReconstructor('catmull', {
    from: 'p', tier: 1, method: 'catmull-rom', hz: 40,
  });
  const ran = rc.run();
  check('ev-recon', 1, ran.emitted > 0 && ran.into === 'p~catmull',
    `the tier-1 reconstructor must APPEND rows into its own lane: ${JSON.stringify(ran)}`);
  check('ev-recon', 1, JSON.stringify(deck.eventsOf('p')) === masterBefore,
    'APPEND-ONLY: running a reconstructor must not touch one byte of the master trace');

  // provenance round-trips, and its refs point at REAL attested rows
  const rows = deck.window('p~catmull', -Infinity, Infinity, { evidence: { restored: { maxTier: 1 } } });
  const ids = new Set(deck.eventsOf('p').map((e) => e.id));
  const p0 = rows[0].provenance;
  check('ev-recon', 2, rows.length === ran.emitted && rows.every((r) => r.provenance),
    `every row of a derived lane must carry provenance (${rows.length}/${ran.emitted})`);
  check('ev-recon', 2, p0.source === 'reconstructor-catmull' && p0.method === 'catmull-rom' && p0.tier === 1 &&
    typeof p0.confidence === 'number' && p0.from === 'p' && p0.refs.length === 2,
    `provenance schema must round-trip {source, method, confidence, tier, refs, from}: ${JSON.stringify(p0)}`);
  check('ev-recon', 2, rows.every((r) => r.provenance.refs.every((id) => ids.has(id))),
    'refs must name the ATTESTED rows the restoration was derived from, and they must exist');
  check('ev-recon', 2, rows.every((r) => r.provenance.confidence <= 1 && r.provenance.confidence >= 0),
    'confidence must be a [0,1] number on every derived row');
  // the accounting the tratteggio UI displays is the LIBRARY's, not the client's
  const acct = deck.evidenceAccounting(['p', 'p~catmull']);
  check('ev-recon', 3, acct.attested === items.length && acct.restored === ran.emitted &&
    Math.abs(acct.inventedFraction - ran.emitted / (items.length + ran.emitted)) < 1e-12 &&
    acct.byTier[1] === ran.emitted,
    `evidenceAccounting must split attested/restored and give the invented fraction: ${JSON.stringify(acct)}`);

  // the firewall over a DERIVED lane: attested excludes it entirely
  const none = deck.window('p~catmull', -Infinity, Infinity, { evidence: 'attested' });
  const dgd = deck.degradations('p~catmull');
  check('ev-recon', 4, none.length === 0 && dgd.reports.some((r) => r.chose === 'excluded'),
    `a tier-1 lane under 'attested' must be EXCLUDED and reported, not down-mixed: ${none.length} rows`);
  check('ev-recon', 4, deck.sampleAt('p~catmull', 1234.5, { evidence: 'attested' }) === null,
    'sampleAt on an excluded lane must answer null, never a quietly held value');

  // 6d — a TIER-2 lane, and the cap that excludes it
  const rc2 = deck.registerReconstructor('dream', {
    from: 'p', tier: 2, method: 'inpaint-stub', confidence: 0.4,
    hz: 10,
    // tier >= 2 MUST bring its own derive() — the library implements tier 1 only
    derive: (pos, ctx) => ({ x: ctx.a.x, y: ctx.a.y, at: pos, method: 'inpaint-stub' }),
  });
  const ran2 = rc2.run();
  check('ev-tier', 0, ran2.emitted > 0 && deck.provenanceOf('p~dream').tier === 2,
    `a tier-2 lane must register and record its tier: ${JSON.stringify(deck.provenanceOf('p~dream'))}`);
  check('ev-tier', 1, deck.window('p~dream', -Infinity, Infinity, { evidence: { restored: { maxTier: 1 } } }).length === 0,
    'a TIER-2 lane must be excluded when the query allows tier <= 1');
  check('ev-tier', 1, deck.window('p~dream', -Infinity, Infinity, { evidence: { restored: { maxTier: 2 } } }).length === ran2.emitted,
    'the same lane must be served in full when the query allows tier <= 2');
  const dgD = deck.degradations('p~dream').reports.find((r) => r.chose === 'excluded');
  check('ev-tier', 1, dgD && /tier-2/.test(dgD.reason) && /allows tier <= 1/.test(dgD.reason),
    `the exclusion must say which tier and which cap: ${JSON.stringify(dgD)}`);
  // a mixed window under maxTier 1 keeps tier-1 and drops tier-2 — one query
  const mixed = deck.window(['p', 'p~catmull', 'p~dream'], -Infinity, Infinity, { evidence: { restored: { maxTier: 1 } } });
  check('ev-tier', 2, mixed.length === items.length + ran.emitted &&
    mixed.every((r, i, a) => i === 0 || a[i - 1].at <= r.at),
    `a multi-lane window must merge in position order and drop only the over-tier lane (${mixed.length})`);

  // 6f — tiers 2/3 are the same SEAM, not the same code, and the library says so
  let refused = null;
  try { deck.registerReconstructor('halluc', { from: 'p', tier: 3 }); } catch (e) { refused = e.message; }
  check('ev-tier', 3, refused && /tier 3 must bring its own derive/.test(refused),
    `a tier-3 registration with no derive() must be refused in words: ${refused}`);
  let lane = null;
  try { deck.registerReconstructor('selfish', { from: 'p', into: 'p', tier: 1 }); } catch (e) { lane = e.message; }
  check('ev-tier', 3, lane && /never write into its own evidence lane/.test(lane),
    `a reconstructor writing into its evidence lane must be refused: ${lane}`);
  let purity = null;
  try { deck.schedule({ at: 10, kind: 'p~catmull', payload: { x: 0, y: 0, at: 10 } }); } catch (e) { purity = e.message; }
  check('ev-tier', 3, purity && /lane purity/.test(purity),
    `an attested row appended to a derived lane must be refused: ${purity}`);
  purity = null;
  try { deck.schedule({ at: 10, kind: 'p', payload: { x: 0, y: 0, at: 10 }, provenance: { source: 'x', tier: 1 } }); } catch (e) { purity = e.message; }
  check('ev-tier', 3, purity && /lane purity/.test(purity),
    `a derived row appended to the MASTER trace must be refused: ${purity}`);

  // 6e — REVERSIBILITY. Deleting a restoration is dropping its lane.
  const dropped = rc.drop().dropped + rc2.drop().dropped;
  check('ev-drop', 0, dropped === ran.emitted + ran2.emitted, `both lanes must drop in full (${dropped})`);
  check('ev-drop', 0, JSON.stringify(deck.eventsOf('p')) === masterBefore,
    'THE REVERSIBILITY CLAIM: after dropping every derived lane the master trace must be BIT-IDENTICAL');
  check('ev-drop', 0, JSON.stringify(deck.audit().fires.filter((f) => f.kind === 'p')) === auditBefore,
    'and so must its scheduler state — statuses, fire counts, order');
  check('ev-drop', 1, deck.stats().derived === 0 && deck.stats().attested === deck.stats().total,
    `the deck must be back to attested-only: ${JSON.stringify(deck.stats())}`);
  check('ev-drop', 1, deck.window('p~catmull', -Infinity, Infinity, { evidence: 'all' }).length === 0,
    'a dropped restoration must leave nothing behind');
  // and re-running it reproduces the same rows: a restoration is a FUNCTION of
  // the evidence, which is why dropping it loses nothing.
  const again = rc.run();
  check('ev-drop', 2, again.emitted === ran.emitted &&
    JSON.stringify(deck.window('p~catmull', -Infinity, Infinity, { evidence: 'all' })) === JSON.stringify(rows),
    'a re-run must reproduce the identical derived lane — the restoration is a function of the evidence');
  check('ev-drop', 2, JSON.stringify(deck.eventsOf('p')) === masterBefore, 'and STILL not touch the master');
  deck.dispose();
}

// ---------------------------------------------------------------------------
// suite 7: UNCERTAINTY AS POSITION (v0.6, plan-timeline §7.4 / §−1's "a smear,
// not a fake instant"). `at` stays a scalar; a frozen sibling `when` carries the
// bracket, and the scalar is resolved ONCE at ingest by a named versioned rule.
//   7a  a `when` row fires at `earliest`, exactly once, and NEVER moves the sort
//   7b  possible/necessary give different, correct answers — and `necessary` is
//       UNANSWERABLE-AND-SAYS-SO when the inner bracket is absent
//   7c  the two axes stay independent: all four cells of evidence × certainty
//   7d  positionAccounting() sums correctly, BY RULE
//   7e  caps.series fixes a multi-controller lane that degraded SILENTLY
//   7f  two-phase seek FAILS OPEN under a deliberately slow adapter
// ---------------------------------------------------------------------------
import { normalizeWhen, normalizeCertainty, WHEN_KINDS } from '../transport.mjs';

const Y = (y, m = 0, d = 1) => Date.UTC(y, m, d);
/** the nine fields, with the optional five defaulted — tests name only what matters */
const W = (o) => ({ verbatim: null, edtf: null, innerFrom: null, innerTo: null, note: null, ...o });
const ids = (rows) => rows.map((r) => r.id);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// --- 7a: THE FIRING RULE — at = when.earliest, and nothing else moves --------
{
  // The supplied `at` on `smear-200` is deliberately WRONG (9999) and
  // `smear-050` supplies none at all: both must land on `when.earliest`.
  const mk = () => [
    { at: 100, kind: 'arc', id: 'crisp-100', payload: { tag: 'crisp-100' } },
    { at: 9999, kind: 'arc', id: 'smear-200', payload: { tag: 'smear-200' },
      when: W({ earliest: 200, latest: 1200, rule: 'test-band@1', kind: 'ignorance', verbatim: '1965-07-15' }) },
    { kind: 'arc', id: 'smear-050', payload: { tag: 'smear-050' },
      when: W({ earliest: 50, latest: 5000, rule: 'test-wide@1', kind: 'vagueness' }) },
    { at: 400, kind: 'arc', id: 'crisp-400', payload: { tag: 'crisp-400' } },
  ];
  const vr = sharedVR();
  const deck = createDeck({ clock: vr.clock, tickHost: vr.newHost(), range: [0, 6000], items: mk() });
  const rows = deck.eventsOf('arc');
  check('when-fire', 0, same(rows.map((r) => r.at), [50, 100, 200, 400]),
    `at must be when.earliest for every smeared row and untouched for crisp ones: ${JSON.stringify(rows.map((r) => [r.id, r.at]))}`);
  check('when-fire', 0, same(ids(rows), ['smear-050', 'crisp-100', 'smear-200', 'crisp-400']),
    `the lane must be sorted by the ANCHOR: ${ids(rows)}`);
  check('when-fire', 0, rows.find((r) => r.id === 'smear-200').at === 200,
    'a supplied at that disagrees with when.earliest must be OVERRIDDEN, not honoured');
  // the anchoring is REPORTED — degradations() gains its fourth literal
  const anc = deck.degradations('arc').reports.filter((r) => r.chose === 'anchored');
  check('when-fire', 1, anc.length === 2 && anc.some((r) => /test-band@1/.test(r.reason)) &&
    anc.some((r) => /OVERRIDDEN/.test(r.reason)),
    `every anchoring must be on the record, naming its rule: ${JSON.stringify(anc.map((r) => r.reason.slice(0, 60)))}`);

  // THE SORT DOES NOT MOVE: a twin deck given the same anchors as plain scalars
  // fires the same ids in the same order at the same positions.
  const vr2 = sharedVR();
  const twin = createDeck({ clock: vr2.clock, tickHost: vr2.newHost(), range: [0, 6000], items: [
    { at: 100, kind: 'arc', id: 'crisp-100', payload: {} }, { at: 200, kind: 'arc', id: 'smear-200', payload: {} },
    { at: 50, kind: 'arc', id: 'smear-050', payload: {} }, { at: 400, kind: 'arc', id: 'crisp-400', payload: {} },
  ] });
  check('when-fire', 1, same(ids(deck.eventsOf('arc')), ids(twin.eventsOf('arc'))) &&
    same(deck.eventsOf('arc').map((r) => r.at), twin.eventsOf('arc').map((r) => r.at)),
    'a `when` row must sort EXACTLY where its anchor sorts — the bracket is not an ordering key');

  const fired = [], drifted = [];
  deck.sched.onFire((pub, rec) => { fired.push(pub.id); drifted.push(rec); });
  const runTo = (d, v, pos) => { d.play(); v.advanceTo(v.now() + (pos - d.position())); d.pause(); };
  deck.seek(0); runTo(deck, vr, 300);
  check('when-fire', 2, same(fired, ['smear-050', 'crisp-100', 'smear-200']),
    `play(0 -> 300) must fire exactly the rows whose ANCHOR is <= 300, in anchor order: ${fired}`);
  check('when-fire', 2, deck.audit().fires.every((f) => f.fires <= 1), 'exactly once each');
  // the fire is MARKED, not suppressed: `when` rides the public event AND the
  // drift record, so a consumer that must not act on a bound can see the bound.
  const dr = drifted.find((r) => r.id === 'smear-200');
  check('when-fire', 3, dr && dr.anchored === true && dr.when && dr.when.rule === 'test-band@1' && dr.when.verbatim === '1965-07-15',
    `the drift record must carry the bracket and say it is anchored: ${JSON.stringify(dr && { anchored: dr.anchored, rule: dr.when && dr.when.rule })}`);
  check('when-fire', 3, deck.eventsOf('arc').filter((r) => r.when).length === 2 &&
    deck.eventsOf('arc').filter((r) => r.when === undefined).length === 2,
    'ABSENCE of `when` is the crisp fast path — a crisp row must carry no `when` KEY at all');
  check('when-fire', 3, deck.stats().crisp === 2 && deck.stats().smeared === 2 && deck.stats().attested === 4,
    `crisp/smeared and attested/derived are TWO partitions of the same rows: ${JSON.stringify(deck.stats())}`);
  deck.dispose(); twin.dispose();
}

// --- 7a': the bracket is frozen, per-row, and validated ---------------------
{
  const vr = sharedVR();
  const shared = { earliest: 10, latest: 20, rule: 'hand', kind: 'ignorance' };
  const deck = createDeck({ clock: vr.clock, tickHost: vr.newHost(), range: [0, 100], autoStart: false, items: [
    { kind: 'k', id: 'a', payload: {}, when: shared }, { kind: 'k', id: 'b', payload: {}, when: shared },
  ] });
  const [a, b] = deck.eventsOf('k');
  check('when-shape', 0, a.when !== b.when && a.when !== shared,
    'NEVER INTERNED: sharing one uncertainty object between two rows asserts they are SIMULTANEOUS (CIDOC E52), so every row gets its own copy');
  check('when-shape', 0, Object.isFrozen(a.when) && Object.keys(a.when).length === 9 &&
    Object.keys(a.when).join(',') === 'verbatim,edtf,earliest,latest,innerFrom,innerTo,rule,kind,note',
    `frozen, exactly nine fields: ${Object.keys(a.when)}`);
  check('when-shape', 0, a.when.innerFrom === null && a.when.innerTo === null,
    'no inner bound is null, not a sentinel — CRM Issue 288: NOT instantiating P81 is correct');
  const boom = (w) => { try { normalizeWhen(w); return null; } catch (e) { return e.message; } };
  check('when-shape', 1, /crisp fast path/.test(boom({ earliest: 5, latest: 5, rule: 'hand', kind: 'ignorance' }) || ''),
    'a ZERO-WIDTH bracket must be refused in words: it is a crisp position, and absence of `when` is how you say that');
  check('when-shape', 1, /VERSIONED/.test(boom({ earliest: 1, latest: 2, rule: 'err-july15-padding', kind: 'ignorance' }) || ''),
    'an UNVERSIONED rule must be refused — when the heuristic changes the affected rows must be one WHERE away');
  check('when-shape', 1, boom({ earliest: 1, latest: 2, rule: 'hand', kind: 'ignorance' }) === null &&
    boom({ earliest: 1, latest: 2, rule: 'unknown', kind: 'vagueness' }) === null,
    "'hand' and 'unknown' are the two reserved unversioned literals");
  check('when-shape', 1, /kind must be/.test(boom({ earliest: 1, latest: 2, rule: 'hand', kind: 'fuzzy' }) || '') &&
    same(WHEN_KINDS, ['ignorance', 'vagueness']),
    'ignorance vs vagueness is REQUIRED: same bracket, opposite affordances');
  check('when-shape', 1, /rule is REQUIRED/.test(boom({ earliest: 1, latest: 2, kind: 'hand' }) || ''),
    'a bracket with no recorded rule is a number nobody can re-audit');
  check('when-shape', 2, /P82a <= P81a/.test(boom({ earliest: 10, latest: 20, innerFrom: 5, rule: 'hand', kind: 'ignorance' }) || ''),
    'CRM: the inner bracket may not escape the outer one');
  check('when-shape', 2, boom({ earliest: 10, latest: 20, innerFrom: 18, innerTo: 12, rule: 'hand', kind: 'ignorance' }) === null,
    'innerFrom > innerTo is LEGAL, not a bug (CRM §3: it degenerates the trapezoid to a triangle = no known inner bound)');
  check('when-shape', 2, normalizeWhen({ earliest: 10, latest: null, rule: 'unknown', kind: 'ignorance' }).latest === null,
    'latest:null is an OPEN end — open and unknown are different facts and both must be representable');
  deck.dispose();
}

// --- 7b: possible vs necessary on a hand-built fuzzy set --------------------
const FUZZY = [
  { at: Y(1965, 5, 15), kind: 'arch', id: 'exact-1965', payload: {} },
  { at: Y(1971, 3, 10), kind: 'arch', id: 'exact-1971', payload: {} },
  { kind: 'arch', id: 'err-1965', payload: {}, when: W({ verbatim: '1965-07-15', edtf: '1965',
    earliest: Y(1965), latest: Y(1966), rule: 'err-audio-month-null@1', kind: 'ignorance',
    note: 'ERR month field null on an audio record; 07-15 is a database padding artefact.' }) },
  { kind: 'arch', id: 'sixties', payload: {}, when: W({ verbatim: 'the sixties', edtf: '196X',
    earliest: Y(1960), latest: Y(1970), rule: 'decade-guess@1', kind: 'vagueness' }) },
  // THE §9.2 CASE: an outer decade with a KNOWN inner month. Outer containment
  // says "not certainly 1965"; the inner bracket says it certainly is.
  { kind: 'arch', id: 'sixties-inner-65', payload: {}, when: W({ verbatim: 'spring 1965, in the sixties tapes',
    earliest: Y(1960), latest: Y(1970), innerFrom: Y(1965, 2, 1), innerTo: Y(1965, 3, 1),
    rule: 'hand', kind: 'ignorance' }) },
  { kind: 'arch', id: 'spring-71', payload: {}, when: W({ verbatim: 'probably spring 1971', edtf: '1971-21?',
    earliest: Y(1971), latest: Y(1972), innerFrom: Y(1971, 2, 1), innerTo: Y(1971, 4, 1),
    rule: 'edtf-l1@1', kind: 'vagueness' }) },
  { kind: 'arch', id: 'open-end', payload: {}, when: W({ verbatim: 'from 1964, end lost',
    earliest: Y(1964), latest: null, rule: 'unknown', kind: 'ignorance' }) },
  { kind: 'arch', id: 'tri', payload: {}, when: W({ earliest: Y(1968), latest: Y(1969),
    innerFrom: Y(1968, 5, 1), innerTo: Y(1968, 2, 1), rule: 'hand', kind: 'ignorance' }) },
];
{
  const vr = sharedVR();
  const deck = createDeck({ clock: vr.clock, tickHost: vr.newHost(), autoStart: false,
    range: [Y(1955), Y(1980)], items: FUZZY.map((x) => ({ ...x })) });
  const A = Y(1965), B = Y(1966);
  const poss = deck.window('arch', A, B, { certainty: 'possible' });
  const nec = deck.window('arch', A, B, { certainty: 'necessary' });
  check('cert', 0, same(ids(poss).sort(), ['err-1965', 'exact-1965', 'open-end', 'sixties', 'sixties-inner-65']),
    `POSSIBLY in 1965 = every bracket that OVERLAPS the year: ${ids(poss)}`);
  check('cert', 0, same(ids(nec).sort(), ['err-1965', 'exact-1965', 'sixties-inner-65']),
    `CERTAINLY in 1965 = the query contains the row's CERTAIN extent: ${ids(nec)}`);
  check('cert', 1, ids(poss).includes('sixties') && !ids(nec).includes('sixties'),
    'a decade-wide row is POSSIBLY 1965 and not NECESSARILY — two different, both-correct answers to what looks like one question');
  check('cert', 1, ids(nec).includes('sixties-inner-65'),
    'THE INNER BRACKET IS NOT DECORATION: a decade-wide outer with a known 1965 inner IS certainly 1965, and outer containment (Y @> possible) would under-report it');
  check('cert', 1, ids(nec).includes('err-1965'),
    'a year-only ERR row IS certainly in its own year — outer containment is a SOUND sufficient condition where no inner bracket exists');
  // …and where that sufficient condition fails, the question is UNDECIDABLE
  const un = deck.degradations('arch').reports.filter((r) => r.chose === 'unanswerable');
  check('cert', 2, un.length > 0 && un.some((r) => /decade-guess@1/.test(r.reason)) && un.some((r) => /unknown/.test(r.reason)) &&
    un.every((r) => /EXCLUDED rather than answered 'no'/.test(r.reason)),
    `necessary must be UNANSWERABLE-AND-SAY-SO when the inner bracket is absent: ${JSON.stringify(un.map((r) => r.reason.slice(0, 48)))}`);
  // innerFrom > innerTo is "no known inner bound", so it takes the same path
  const nec68 = deck.window('arch', Y(1968), Y(1968, 6, 1), { certainty: 'necessary' });
  check('cert', 2, !ids(nec68).includes('tri'),
    'a REVERSED inner pair is CRM\'s "no known inner bound" — it must not be read as an interval');
  check('cert', 3, same(deck.window('arch', A, B), poss),
    "the DEFAULT is 'possible' — silence over-includes, it does not fabricate");
  let bad = null;
  try { deck.window('arch', A, B, { certainty: 'probably' }); } catch (e) { bad = e.message; }
  check('cert', 3, bad && /use 'possible'/.test(bad), `an unknown certainty must be refused: ${bad}`);
  check('cert', 3, normalizeCertainty(undefined).implicit === true && normalizeCertainty('possible').implicit === false,
    'the default is marked as implicit, so a caller can tell it apart from an explicit choice');
  // the CRISP FAST PATH: a lane with no bracket answers identically under both
  const crispOnly = deck.window('arch', A, B, { certainty: 'possible' }).filter((r) => !r.when);
  check('cert', 4, same(ids(crispOnly), ['exact-1965']) &&
    same(ids(deck.window('arch', A, B, { certainty: 'necessary' }).filter((r) => !r.when)), ['exact-1965']),
    'a crisp row is a POINT under both readings, and a lane with no bracket is unaffected by the knob');
  // sanity: an event with a wide bracket that STARTS before the window is found
  check('cert', 4, ids(poss).includes('open-end') && FUZZY.find((f) => f.id === 'open-end').when.earliest < A,
    'a row whose anchor precedes the window must still be found when its bracket reaches into it');
  deck.dispose();
}

// --- 7c: THE TWO AXES ARE INDEPENDENT — all four combinations ---------------
{
  const vr = sharedVR();
  const deck = createDeck({ clock: vr.clock, tickHost: vr.newHost(), autoStart: false, range: [0, 10000], items: [
    { at: 1000, kind: 'a', id: 'att-crisp', payload: {} },
    // an uncertain ATTESTED row: tier 0, wide bracket. It MUST survive 'attested'.
    { kind: 'a', id: 'att-smear', payload: {}, when: W({ earliest: 2000, latest: 6000, rule: 'test-band@1', kind: 'ignorance' }) },
  ] });
  // a precise RESTORED row: tier 1, NO bracket. It MUST survive 'necessary'.
  deck.schedule({ at: 3000, kind: 'a~r', id: 'res-crisp', payload: {},
    provenance: { source: 'reconstructor-t', tier: 1, method: 'linear' } });
  deck.schedule({ kind: 'a~r', id: 'res-smear', payload: {}, provenance: { source: 'reconstructor-t', tier: 1, method: 'linear' },
    when: W({ earliest: 4000, latest: 8000, rule: 'test-band@1', kind: 'vagueness' }) });
  const K = ['a', 'a~r'];
  const q = (evidence, certainty) => ids(deck.window(K, 0, 5000, { evidence, certainty })).sort();
  const cell = {
    'attested|possible': q('attested', 'possible'),
    'attested|necessary': q('attested', 'necessary'),
    'all|possible': q('all', 'possible'),
    'all|necessary': q('all', 'necessary'),
  };
  check('axes', 0, same(cell['attested|possible'], ['att-crisp', 'att-smear']),
    `AN UNCERTAIN ATTESTED ROW IS TIER 0 and must survive an attested-only query — folding the axes here deletes the whole pre-1960 archive: ${cell['attested|possible']}`);
  check('axes', 0, same(cell['all|necessary'], ['att-crisp', 'res-crisp']),
    `A PRECISE RESTORED ROW must survive a necessary query — being invented is not being badly positioned: ${cell['all|necessary']}`);
  check('axes', 1, same(cell['attested|necessary'], ['att-crisp']) && same(cell['all|possible'], ['att-crisp', 'att-smear', 'res-crisp', 'res-smear']),
    `all four cells must be populated and distinct: ${JSON.stringify(cell)}`);
  check('axes', 1, new Set(Object.values(cell).map((v) => v.join(','))).size === 4,
    'no cell may be a synonym for another — the 2x2 is fully populated');
  // NEITHER RESTRICTION IMPLIES THE OTHER, stated as an equality on the sets
  check('axes', 2, cell['attested|possible'].filter((x) => x.startsWith('res')).length === 0 &&
    cell['all|necessary'].filter((x) => x === 'att-smear' || x === 'res-smear').length === 0 &&
    cell['all|possible'].length === 4,
    'evidence filters ONLY on fabrication, certainty ONLY on width, and each leaves the other axis whole');
  // the certainty knob does NOT satisfy the evidence forced choice
  let forced = null;
  try { deck.window(K, 0, 5000, { certainty: 'necessary' }); } catch (e) { forced = e.code; }
  check('axes', 2, forced === 'EVIDENCE_POLICY_REQUIRED',
    'naming a certainty must NOT be mistaken for naming an evidence policy — the forced choice is on the other axis');
  // and the two accountings are two numbers, never one score
  const ea = deck.evidenceAccounting(K), pa = deck.positionAccounting(K);
  check('axes', 3, ea.total === 4 && ea.restored === 2 && pa.total === 4 && pa.smeared === 2 &&
    ea.inventedFraction === 0.5 && pa.smearedFraction === 0.5 && ea.restored !== undefined && pa.byRule !== undefined,
    `two partitions of the same four rows, crossing: ${JSON.stringify({ ea: [ea.attested, ea.restored], pa: [pa.crisp, pa.smeared] })}`);
  deck.dispose();
}

// --- 7d: positionAccounting sums correctly, BY RULE -------------------------
{
  const vr = sharedVR();
  const deck = createDeck({ clock: vr.clock, tickHost: vr.newHost(), autoStart: false,
    range: [Y(1955), Y(1980)], items: FUZZY.map((x) => ({ ...x })) });
  const pa = deck.positionAccounting('arch');
  check('pos-acct', 0, pa.total === 8 && pa.crisp === 2 && pa.smeared === 6 && pa.smearedFraction === 0.75,
    `crisp + smeared must partition the lane: ${JSON.stringify({ t: pa.total, c: pa.crisp, s: pa.smeared })}`);
  const byRuleN = Object.values(pa.byRule).reduce((a, r) => a + r.n, 0);
  check('pos-acct', 0, byRuleN === pa.smeared,
    `every smeared row must be attributed to exactly one rule: ${byRuleN} vs ${pa.smeared}`);
  check('pos-acct', 0, same(Object.keys(pa.byRule).sort(),
    ['decade-guess@1', 'edtf-l1@1', 'err-audio-month-null@1', 'hand', 'unknown']),
    `the rules must be the ones the rows carry: ${Object.keys(pa.byRule)}`);
  // THE HEADLINE NUMBER: "N % of this lane is positioned by a padding artefact"
  check('pos-acct', 1, pa.byRule['err-audio-month-null@1'].n === 1 && pa.byRule['err-audio-month-null@1'].fraction === 1 / 8 &&
    pa.byRule.hand.n === 2 && pa.byRule.hand.fraction === 2 / 8,
    `fraction must be n / TOTAL rows (not n / smeared) — the visible number is "x % of this lane": ${JSON.stringify(Object.entries(pa.byRule).map(([k, r]) => [k, r.n, +r.fraction.toFixed(3)]))}`);
  check('pos-acct', 1, pa.byWhenKind.ignorance === 4 && pa.byWhenKind.vagueness === 2 &&
    pa.byWhenKind.ignorance + pa.byWhenKind.vagueness === pa.smeared,
    `ignorance and vagueness must partition the smeared rows: ${JSON.stringify(pa.byWhenKind)}`);
  check('pos-acct', 2, pa.openEnded === 1 && pa.byRule.unknown.open === 1 && pa.byRule.unknown.medianSpanMs === null,
    'an OPEN end has no width and must not be averaged into one');
  check('pos-acct', 2, pa.withInner === 2 && pa.byRule['edtf-l1@1'].withInner === 1 && pa.byRule.hand.withInner === 1,
    `only an ORDERED inner pair counts as "has an inner bracket": ${pa.withInner}`);
  const spans = FUZZY.filter((f) => f.when && f.when.latest !== null).map((f) => f.when.latest - f.when.earliest).sort((a, b) => a - b);
  check('pos-acct', 3, pa.maxSpanMs === spans[spans.length - 1] && pa.medianSpanMs === spans[spans.length >> 1],
    `median/max must be over FINITE spans only: ${pa.medianSpanMs} / ${pa.maxSpanMs} vs ${spans}`);
  check('pos-acct', 3, pa.byRule['decade-guess@1'].meanSpanMs === Y(1970) - Y(1960) &&
    pa.byRule['err-audio-month-null@1'].maxSpanMs === Y(1966) - Y(1965),
    'per-rule widths must be the rows\' own widths');
  check('pos-acct', 3, pa.lanes.length === 1 && pa.lanes[0].kind === 'arch' && pa.lanes[0].smeared === 6,
    'the per-lane rollup must be there too');
  const whole = deck.positionAccounting();
  check('pos-acct', 4, whole.total === pa.total && deck.positionAccounting('nope').total === 0,
    'the whole-deck call and an unknown kind must both answer, not throw');
  deck.dispose();
}

// --- 7e: caps.series — a multi-controller lane that used to lie silently -----
{
  const vr = sharedVR();
  // ONE kind, TWO controllers, interleaved. The straddling pair over the merged
  // lane at t=750 is (cc74@500, cc1@1000) — two DIFFERENT controllers.
  const cc = [
    { at: 0, cc: 1, v: 0 }, { at: 500, cc: 74, v: 200 }, { at: 1000, cc: 1, v: 100 },
    { at: 1500, cc: 74, v: 200 }, { at: 2000, cc: 1, v: 0 }, { at: 2500, cc: 74, v: 200 },
  ];
  const ad = {
    caps: { continuous: true, interpolate: true, tier: 1, series: (p) => p.cc, catchUp: 'drop' },
    actuate() {},
    interpolate: (a, b, u) => a.v + (b.v - a.v) * u,
  };
  const deck = createDeck({ clock: vr.clock, tickHost: vr.newHost(), autoStart: false, range: [0, 3000],
    evidence: { restored: { maxTier: 1 } }, adapters: { cc: ad },
    items: cc.map((r, i) => ({ at: r.at, kind: 'cc', id: `cc-${i}`, payload: r })) });
  // (1) THE OLD BEHAVIOUR, now on the record instead of silent
  const merged = deck.sampleAt('cc', 750);
  check('series', 0, merged === 150,
    `without a series the merged lane still interpolates ACROSS controllers (cc74=200 -> cc1=100): got ${merged}`);
  const amb = deck.degradations('cc').reports.filter((r) => r.chose === 'series-ambiguous');
  check('series', 0, amb.length === 1 && /may belong to DIFFERENT series/.test(amb[0].reason) && /deck.seriesOf/.test(amb[0].reason),
    `…and THAT is the fix: the degradation is now reported, with the remedy: ${amb.length && amb[0].reason.slice(0, 70)}`);
  // (2) THE FIX: per-series sub-lanes, each with its own cursor
  check('series', 1, deck.sampleAt('cc', 750, { series: 1 }) === 75,
    `series 1 brackets (0@0, 100@1000) -> 75, got ${deck.sampleAt('cc', 750, { series: 1 })}`);
  check('series', 1, deck.sampleAt('cc', 750, { series: 74 }) === 200,
    `series 74 brackets (200@500, 200@1500) -> 200, got ${deck.sampleAt('cc', 750, { series: 74 })}`);
  const br = deck.bracket('cc', 750, { series: 1 });
  check('series', 1, same(br.ids, ['cc-0', 'cc-2']) && br.series === '1' && br.aAt === 0 && br.bAt === 1000,
    `the bracket must come from ONE series: ${JSON.stringify(br.ids)}`);
  check('series', 2, same(deck.seriesOf('cc'), ['1', '74']) && deck.seriesOf('nope') === null,
    `seriesOf must enumerate what the lane holds, and answer null where no caps.series is declared: ${deck.seriesOf('cc')}`);
  // (3) the sub-lanes are maintained INCREMENTALLY, not rebuilt
  deck.schedule({ at: 750, kind: 'cc', id: 'cc-late', payload: { at: 750, cc: 1, v: 60 } });
  check('series', 2, deck.sampleAt('cc', 750, { series: 1 }) === 60 &&
    same(deck.bracket('cc', 900, { series: 1 }).ids, ['cc-late', 'cc-2']),
    'a row scheduled after the split must land in its own sub-lane, in order');
  const miss = deck.sampleAt('cc', 750, { series: 99 });
  check('series', 3, miss === null && deck.degradations('cc').reports.some((r) => r.chose === 'empty' && /known series/.test(r.reason)),
    'an unknown series must be reported, not silently answered from the merged lane');
  deck.dispose();
}

// --- 7f: two-phase seek — non-blocking, fail-open, re-armed -----------------
{
  const vr = sharedVR();
  const log = [];
  let releaseSlow = null;
  const fast = { caps: { slowSync: true, catchUp: 'drop' }, actuate() {},
    prepareSeek(req) { log.push(['fast', req.pos, req.disposition]); return true; } };
  const slow = { caps: { slowSync: true, catchUp: 'drop' }, actuate() {},
    prepareSeek(req, ready) { log.push(['slow', req.pos, req.disposition]); releaseSlow = ready; } };
  const deck = createDeck({ clock: vr.clock, tickHost: vr.newHost(), range: [0, 10000],
    adapters: { fast, slow }, items: [{ at: 100, kind: 'fast', payload: {} }, { at: 5000, kind: 'slow', payload: {} }] });
  deck.seek(0); deck.play();
  vr.advanceTo(vr.now() + 200);
  const t0 = vr.now();
  const q = deck.seek(1500, { timeoutMs: 300, disposition: 'RollIfAppropriate' });
  const b0 = deck.seekBarrier();
  // PHASE 1 happened; PHASE 2 has not.
  check('2phase', 0, q === 1500 && deck.position() === 1500 && !deck.playing(),
    `the LOCATE is immediate and synchronous (seek still returns the clamped position); only the ROLL waits: pos ${deck.position()}, playing ${deck.playing()}`);
  check('2phase', 0, b0.phase === 'locate' && same(b0.ready, ['fast']) && same(b0.clients.sort(), ['fast', 'slow']),
    `the ready client is in, the slow one is not: ${JSON.stringify({ phase: b0.phase, ready: b0.ready })}`);
  check('2phase', 0, same(log.map((l) => l[0]).sort(), ['fast', 'slow']) && log.every((l) => l[1] === 1500 && l[2] === 'RollIfAppropriate'),
    `Ardour's LocateTransportDisposition must be CARRIED in the request: ${JSON.stringify(log)}`);
  // FAIL OPEN
  vr.advanceTo(vr.now() + 301);
  const b1 = deck.seekBarrier();
  check('2phase', 1, b1.phase === 'done' && b1.why === 'timeout' && b1.failedOpen === true &&
    same(b1.timedOut, ['slow']) && b1.rolled === true && deck.playing(),
    `the barrier must FAIL OPEN and roll: ${JSON.stringify({ why: b1.why, timedOut: b1.timedOut, rolled: b1.rolled, playing: deck.playing() })}`);
  check('2phase', 1, +(b1.waitedMs).toFixed(0) === 300 && vr.now() - t0 >= 300,
    `and it must have actually waited the timeout, not skipped it: ${b1.waitedMs}`);
  const fo = deck.degradations('slow').reports.filter((r) => r.chose === 'fail-open');
  check('2phase', 1, fo.length === 1 && /did not report ready within 300 ms/.test(fo[0].reason) && /held hostage/.test(fo[0].reason),
    `the laggard must be named on the record: ${fo.length && fo[0].reason.slice(0, 60)}`);
  // the laggard catches up LATE and nothing breaks
  const posBefore = deck.position();
  releaseSlow();
  check('2phase', 2, deck.playing() && deck.position() === posBefore,
    'a late ready() after a fail-open must be inert — the laggard catches up, it does not rewind the transport');
  // RE-ARMED by a locate mid-barrier: the second inherits the TRUE rolling state
  log.length = 0; releaseSlow = null;
  deck.seek(2000, { timeoutMs: 400 });
  const g1 = deck.seekBarrier().gen;
  deck.seek(2500, { timeoutMs: 400 });
  const b2 = deck.seekBarrier();
  check('2phase', 3, b2.gen === g1 + 1 && b2.rolling === true && deck.position() === 2500 && !deck.playing(),
    `a locate mid-barrier must supersede and INHERIT the rolling state: ${JSON.stringify({ gen: b2.gen, rolling: b2.rolling })}`);
  releaseSlow();
  const b3 = deck.seekBarrier();
  check('2phase', 3, b3.phase === 'done' && b3.why === 'all-ready' && b3.rolled === true && deck.playing() && b3.timedOut.length === 0,
    `and when everyone reports, it opens EARLY with nothing on the record: ${JSON.stringify({ why: b3.why, rolled: b3.rolled })}`);
  // DISPOSITION
  deck.seek(3000, { disposition: 'MustStop', timeoutMs: 50 }); releaseSlow();
  check('2phase', 4, !deck.playing() && deck.seekBarrier().rolled === false,
    'MustStop must not roll, whatever the transport was doing');
  deck.seek(3500, { disposition: 'MustRoll', timeoutMs: 50 }); releaseSlow();
  check('2phase', 4, deck.playing() && deck.seekBarrier().rolled === true,
    'MustRoll must roll from a stopped transport');
  let badDisp = null;
  try { deck.seek(10, { disposition: 'Whenever' }); } catch (e) { badDisp = e.message; }
  check('2phase', 4, badDisp && /LocateTransportDisposition/.test(badDisp), `an unknown disposition must be refused: ${badDisp}`);
  deck.dispose();
  // THE FAST PATH: a deck with NO slow-sync adapter takes the v0.5 path exactly
  const vr2 = sharedVR();
  const plain = createDeck({ clock: vr2.clock, tickHost: vr2.newHost(), range: [0, 10000],
    items: [{ at: 100, kind: 'x', payload: {} }] });
  plain.play(); const r = plain.seek(1500);
  check('2phase', 5, r === 1500 && plain.playing() && plain.seekBarrier() === null,
    'a deck holding no caps.slowSync adapter must never build a barrier and must never lose the roll');
  plain.dispose();
}

const basicRuns = NSEEDS, gymRuns = Math.ceil(NSEEDS / 2), seamRuns = Math.ceil(NSEEDS / 3);
if (failures) {
  console.error(`prop-test: ${failures} VIOLATION(S) across ${basicRuns} basic + ${gymRuns} gymnastics seeds + seams + nesting`);
  process.exit(1);
}
console.log(`prop-test OK: ${basicRuns} basic + ${gymRuns} gymnastics seeds, 0 violations (reduce(<=t) === play(0->t))`);
console.log(`seams OK: adapter registry / setRate!=play / worker default / wall->audio bridge / whole-prefix reduce (${seamRuns} freeze seeds) / non-destructive drift`);
console.log('nesting OK: nested seek (reduce-on-seek runs in the child) / rate composition incl. honest degradation / nested pause / absence outside the span / follow+master servo / cycle + depth rejection');
console.log('evidence OK: attested never interpolates (and is reported when it holds) / restored(tier<=1) does / the forced-choice rule throws EVIDENCE_POLICY_REQUIRED exactly where the answer could differ / a reconstructor APPENDS a derived lane and provenance {source, method, confidence, tier, refs, from} round-trips / a tier-2 lane is EXCLUDED at maxTier 1 / dropping a derived lane leaves the master trace BIT-IDENTICAL and a re-run reproduces it');
console.log("uncertainty OK: a `when` row fires ONCE at when.earliest and never moves the sort (a twin deck of plain anchors is identical) / the anchoring is on the record as 'anchored' and rides the fire + the drift row / the bracket is frozen, nine fields, PER ROW (never interned) and refuses a zero-width bracket, an unversioned rule and an inner bound outside the outer one / possible vs necessary differ correctly on a hand-built fuzzy set, the INNER bracket recovers 'certainly 1965' from a decade-wide row, and necessary is UNANSWERABLE-AND-SAYS-SO without one / the default is 'possible' / all four cells of evidence x certainty are populated and neither restriction implies the other / positionAccounting sums BY RULE");
console.log('seams v0.6 OK: caps.series splits a multi-controller lane into per-series cursors (the merged lane interpolated 200->100 across two controllers and said nothing; now it says so, and {series} answers correctly) / two-phase seek locates immediately, holds only the ROLL, FAILS OPEN on timeout with the laggard named, is re-armed by a locate mid-roll inheriting the true rolling state, and carries MustRoll/MustStop/RollIfAppropriate — a deck with no slowSync adapter never builds a barrier');
console.log('continuous OK: sampleAt vs analytic curve (hold > linear > catmull, C1 degrades to linear without a neighbourhood) / cursor O(1) forward + O(log n) on seek and random access / info.next makes an interpolated reduce expressible and it equals sampleAt / caps read + refusals reported / followsTransport (play,rate,pause; never seek, never sync) / logdeck at-clobber regression');
