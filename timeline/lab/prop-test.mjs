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

const basicRuns = NSEEDS, gymRuns = Math.ceil(NSEEDS / 2), seamRuns = Math.ceil(NSEEDS / 3);
if (failures) {
  console.error(`prop-test: ${failures} VIOLATION(S) across ${basicRuns} basic + ${gymRuns} gymnastics seeds + seams + nesting`);
  process.exit(1);
}
console.log(`prop-test OK: ${basicRuns} basic + ${gymRuns} gymnastics seeds, 0 violations (reduce(<=t) === play(0->t))`);
console.log(`seams OK: adapter registry / setRate!=play / worker default / wall->audio bridge / whole-prefix reduce (${seamRuns} freeze seeds) / non-destructive drift`);
console.log('nesting OK: nested seek (reduce-on-seek runs in the child) / rate composition incl. honest degradation / nested pause / absence outside the span / follow+master servo / cycle + depth rejection');
