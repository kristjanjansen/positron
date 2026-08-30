// timeline/lab/prop-render.mjs — THE DETERMINISM PROPERTY of the offline
// render mode (timeline/render.mjs, v0.6).
//
//   node timeline/lab/prop-render.mjs                 # 30 seeds
//   node timeline/lab/prop-render.mjs --seeds 100     # 100 seeds
//   node timeline/lab/prop-render.mjs --verbose
//
// Runs in plain node; no browser, no wall-clock flake, no real-time waiting
// (that IS one of the asserts). The audio half is proved here against a STUB
// OfflineAudioContext — enough to prove the SEAM, since the seam is the shim's
// `currentTime`; the real `OfflineAudioContext` buffer hash is measured in the
// browser by timeline/lab/run-render.mjs.
//
// THE PROPERTIES:
//   D1  two renders of the same deck produce a BYTE-IDENTICAL trace
//   D2  the render trace equals real-time playback modulo timing jitter
//       (same events, same order, same count) — against BOTH a real wall
//       clock and an irregularly-advanced virtual one
//   D3  every event in the window fires EXACTLY ONCE, in (at, seq) order
//   D4  frame positions are exact — computed from the integer index, never
//       accumulated
//   D5  the render does not wait: faster-than-real-time by orders of magnitude
//   D6  a deck on a WALL clock is REFUSED, not silently rendered
//   D7  what cannot be deterministic is REPORTED — declared and suspected —
//       and the heuristic's blind spot is itself asserted, so nobody mistakes
//       a clean scan for a proof
//   D8  seedRandom makes an Math.random-using adapter reproducible, and its
//       absence is visible in the result
//   A1  the audio lane's OfflineAudioContext seam works ONLY through the
//       virtual-clock shim — with a NEGATIVE CONTROL on the bare context
//
// v0.7 — THE NEST (plan-timeline §8.8's last seam, "renderDeck cannot see a
// nest"). Same bar as the flat renderer, one level up:
//   N1  two renders of the same NEST are byte-identical — trace AND wrap set
//   N2  the fragment/loop position map is exact at every frame, and a bounded
//       loop renders byte-identically twice
//   N3  the nested render EQUALS wall-clock playback of the same nest: same
//       events, same per-deck order, same count, same final state
//   N4  the wrap discipline is the SAME one playback uses (a committed one-shot
//       on a TickHost) — with the POLLED arm as the negative control, which
//       renders a DIFFERENT EVENT SET, reproducibly
//   N5  the committed boundary alone carries the loop (`servo:false`)
//   N6  an unbounded loop routes through renderBound() -> LOOP_UNBOUNDED
//   N7  a degraded child rate is REPORTED, never overridden
//   N8  caps.loopState 'rearm'/'carry' and adapter.loopWrap() are identical
//       offline and in playback
//   N9  a child on a wall clock is refused BY NAME
//   N10 deep nesting: exactly-once holds through two levels
//   N11 a FLAT render's trace bytes are unchanged by all of the above
import { createDeck, createTransport, createScheduler, createVirtualRuntime,
         createAudioLane, mainTickHost } from '../transport.mjs';
import { createNest, nestOf } from '../nested.mjs';
import { scoreToJSON, parseScore, loadScore, refDeck } from '../score.mjs';
import { createRenderRuntime, offlineDeck, offlineNest, renderDeck, renderNest,
         nestTree, offlineAudioTarget, auditAdapters, hashText } from '../render.mjs';

const args = process.argv.slice(2);
const NSEEDS = +(args.includes('--seeds') ? args[args.indexOf('--seeds') + 1] : 30);
const VERBOSE = args.includes('--verbose');
let failures = 0, checks = 0;
function check(label, seed, cond, detail) {
  checks++;
  if (!cond) { failures++; console.error(`FAIL [${label} seed ${seed}] ${detail}`); }
  else if (VERBOSE) console.log(`ok   [${label} seed ${seed}] ${detail || ''}`);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// A trace with BOTH kinds of lane — a discrete cue lane whose reducer is
// non-commutative (so ordering bugs surface as a value, not just a count) and
// a continuous lane read per frame. Same shape the property tests use.
// ---------------------------------------------------------------------------
const SPAN = 12000;
function genItems(rand) {
  const items = [];
  const n = 120 + Math.floor(rand() * 200);
  for (let i = 0; i < n; i++) {
    const r = rand();
    const at = +(rand() * SPAN).toFixed(3);
    if (r < 0.25) {
      // same-ms tie: two events at one instant must keep their capture order
      items.push({ at, kind: 'cue', id: `c${i}a`, payload: { op: 'add', v: 1 + Math.floor(rand() * 9) } });
      items.push({ at, kind: 'cue', id: `c${i}b`, payload: { op: 'mul', v: 2 } });
    } else if (r < 0.6) {
      items.push({ at, kind: 'cue', id: `c${i}`, payload: { op: 'add', v: 1 + Math.floor(rand() * 9) } });
    } else {
      items.push({ at, kind: 'pointer', id: `p${i}`, payload: { x: +(rand() * 100).toFixed(4), at } });
    }
  }
  return items;
}
const applyOp = (s, p) => (p.op === 'add' ? (s + p.v) % 1000003 : p.op === 'mul' ? (s * p.v) % 1000003 : p.v);

function makeAdapters(sink) {
  return {
    cue: {
      caps: { catchUp: 'reduce', deterministic: true },
      actuate: (p) => { sink.fired.push(p); sink.state = applyOp(sink.state, p); },
      reduce: (ps) => ps.reduce((s, p) => applyOp(s, p), 0),
      assertState: (s) => { sink.state = s; sink.asserts++; },
    },
    pointer: {
      caps: { continuous: true, catchUp: 'drop', tier: 1, method: 'linear', deterministic: true },
      actuate: () => {},
      interpolate: (a, b, u) => ({ x: a.x + (b.x - a.x) * u }),
    },
  };
}
const newSink = () => ({ fired: [], state: 0, asserts: 0 });

function buildOffline(items, sink) {
  return offlineDeck({
    items, adapters: makeAdapters(sink), range: [0, SPAN + 1000],
    evidence: { restored: { maxTier: 1 } }, autoStart: false,
  });
}

// ===========================================================================
// D1/D3/D4 — determinism, exactly-once, exact frame grid, per seed
// ===========================================================================
const FPSES = [24, 30, 60];
for (let seed = 1; seed <= NSEEDS; seed++) {
  const rand = mulberry32(seed * 7919 + 13);
  const items = genItems(rand);
  const fps = FPSES[seed % FPSES.length];

  const frames1 = [], frames2 = [];
  const s1 = newSink(), s2 = newSink();
  const d1 = buildOffline(items, s1);
  const r1 = renderDeck(d1, { from: 0, to: SPAN, fps,
    onFrame: ({ frameIndex, pos, state }) => frames1.push([frameIndex, pos, state.cue]),
    stateKinds: ['cue'] });
  const d2 = buildOffline(items, s2);
  const r2 = renderDeck(d2, { from: 0, to: SPAN, fps,
    onFrame: ({ frameIndex, pos, state }) => frames2.push([frameIndex, pos, state.cue]),
    stateKinds: ['cue'] });

  // D1 — THE DELIVERABLE.
  check('render-det', seed, r1.traceText === r2.traceText,
    `two renders must produce a BYTE-IDENTICAL trace (${r1.traceText.length} vs ${r2.traceText.length} bytes, hash ${r1.traceHash} vs ${r2.traceHash})`);
  check('render-det', seed, r1.traceHash === r2.traceHash && r1.traceHash === hashText(r1.traceText),
    'the hash must be a function of the trace text');
  check('render-det', seed, JSON.stringify(frames1) === JSON.stringify(frames2),
    'the per-frame callback must see the same (index, pos, state) on both runs');
  check('render-det', seed, s1.state === s2.state && s1.fired.length === s2.fired.length,
    `both renders must land on the same state (${s1.state} vs ${s2.state})`);

  // D3 — every event in the window, exactly once, in order.
  const fires = r1.trace.filter((r) => !String(r.id).startsWith('#'));
  const ids = fires.map((r) => r.id);
  check('render-once', seed, new Set(ids).size === ids.length,
    `no event may fire twice (${ids.length} fires, ${new Set(ids).size} unique)`);
  const cueIds = items.filter((i) => i.kind === 'cue').map((i) => i.id);
  const firedCue = new Set(fires.filter((r) => r.k === 'cue').map((r) => r.id));
  check('render-once', seed, cueIds.every((id) => firedCue.has(id)),
    `every cue in [0, ${SPAN}] must fire (${firedCue.size}/${cueIds.length})`);
  check('render-order', seed, fires.every((r, i) => i === 0 || fires[i - 1].at <= r.at),
    'fires must arrive in nondecreasing position order');

  // D4 — the frame grid is exact and computed from the index, not accumulated.
  const nExp = Math.round(SPAN * fps / 1000) + 1;
  check('render-frames', seed, r1.frames === nExp && frames1.length === nExp,
    `frame count must be round((to-from)*fps/1000)+1 = ${nExp} (got ${r1.frames})`);
  check('render-frames', seed, frames1.every(([i, pos]) => pos === (i * 1000) / fps),
    'every frame position must equal i*1000/fps exactly — no accumulation');

  d1.dispose(); d2.dispose();
}

// ===========================================================================
// D2 — the render trace equals real-time playback, modulo timing jitter.
// Two controls: an irregularly-advanced virtual clock (jitter, no waiting) and
// a GENUINE wall clock with the main tick host (short, so CI stays fast).
// ===========================================================================
{
  const rand = mulberry32(4242);
  const items = genItems(rand);

  // (a) the frame-stepped render
  const sR = newSink();
  const dR = buildOffline(items, sR);
  const rR = renderDeck(dR, { from: 0, to: SPAN, fps: 30 });
  const renderIds = rR.trace.filter((r) => !String(r.id).startsWith('#')).map((r) => r.id);
  dR.dispose();

  // (b) same deck, virtual clock, IRREGULAR advances (jitter, dropped ticks)
  const sJ = newSink();
  const vr = createVirtualRuntime(1_000_000);
  const dJ = createDeck({ clock: vr.clock, tickHost: vr.host, items, adapters: makeAdapters(sJ),
    range: [0, SPAN + 1000], evidence: { restored: { maxTier: 1 } } });
  const jitterIds = [];
  const offJ = dJ.sched.onFire((ev) => jitterIds.push(ev.id));
  dJ.seek(0); dJ.play();
  const jr = mulberry32(99);
  let t = vr.now();
  while (t < 1_000_000 + SPAN) { t += 1 + jr() * 120; vr.advanceTo(Math.min(t, 1_000_000 + SPAN)); }
  vr.advanceTo(1_000_000 + SPAN);
  dJ.pause(); offJ();
  check('render-vs-jitter', 0, jitterIds.length === renderIds.length && String(jitterIds) === String(renderIds),
    `an irregularly-clocked play must fire the same events in the same order (${renderIds.length} vs ${jitterIds.length})`);
  check('render-vs-jitter', 0, sJ.state === sR.state,
    `and land on the same state (${sR.state} vs ${sJ.state})`);
  dJ.dispose();

  // (c) a GENUINE wall clock, main tick host, over a SHORT window — the proof
  //     that the render matches what really happens, not just another virtual
  //     run of the same code.
  const SHORT = 1500;
  const shortItems = items.filter((i) => i.at <= SHORT);
  const sW = newSink();
  const dW = createDeck({ tickHost: mainTickHost(), items: shortItems, adapters: makeAdapters(sW),
    range: [0, SHORT + 500], evidence: { restored: { maxTier: 1 } } });
  const wallIds = [];
  const offW = dW.sched.onFire((ev) => wallIds.push(ev.id));
  const sO = newSink();
  const dO = buildOffline(shortItems, sO);
  const rO = renderDeck(dO, { from: 0, to: SHORT, fps: 30 });
  const offIds = rO.trace.filter((r) => !String(r.id).startsWith('#')).map((r) => r.id);
  dO.dispose();
  await new Promise((res) => {
    dW.seek(0); dW.play();
    setTimeout(() => { dW.pause(); offW(); res(); }, SHORT + 400);
  });
  check('render-vs-realtime', 0, wallIds.length === offIds.length,
    `real-time wall-clock playback must fire the same COUNT as the render (${offIds.length} rendered, ${wallIds.length} real-time)`);
  check('render-vs-realtime', 0, String(wallIds) === String(offIds),
    `…the same events in the same ORDER (first divergence at ${wallIds.findIndex((x, i) => x !== offIds[i])})`);
  check('render-vs-realtime', 0, sW.state === sO.state,
    `…and the same final state (${sO.state} rendered vs ${sW.state} real-time)`);
  dW.dispose();
}

// ===========================================================================
// D5 — the render does not wait. This is the whole point of the mode: a
// 90-minute archival remix must not take 90 minutes to export.
// ===========================================================================
{
  const LONG = 10 * 60 * 1000;                 // ten minutes of position time
  const items = [];
  // note the `i + 1`: an event at EXACTLY `from` is passed by the opening seek,
  // not fired (see the render-boundary check) — this arm is about speed, so it
  // keeps clear of that boundary.
  for (let i = 0; i < 6000; i++) items.push({ at: ((i + 1) * LONG) / 6001, kind: 'cue', id: `L${i}`, payload: { op: 'add', v: 1 } });
  const sink = newSink();
  const deck = offlineDeck({ items, adapters: makeAdapters(sink), range: [0, LONG + 1000], autoStart: false });
  const t0 = Date.now();
  const r = renderDeck(deck, { from: 0, to: LONG, fps: 30 });
  const wall = Date.now() - t0;
  check('render-fast', 0, r.events === 6000 && r.frames === 18001,
    `a 10-minute 30 fps render must produce 18001 frames and fire all 6000 events (${r.frames}, ${r.events})`);
  check('render-fast', 0, wall < 20000,
    `a 10-minute render must not take real time (took ${wall} ms = ${(LONG / Math.max(1, wall)).toFixed(0)}x faster than real time)`);
  console.log(`  [render-fast] 10 min of position time, 18001 frames, 6000 events in ${wall} ms = ${(LONG / Math.max(1, wall)).toFixed(0)}x real time`);
  deck.dispose();
}

// ===========================================================================
// THE WINDOW'S LEFT EDGE, stated as a check rather than discovered later. A
// render opens with a real `seek(from)`, and the seek contract says an event at
// or behind the playhead is PASSED (its effect belongs in the folded state, not
// in a fire). So the render window is HALF-OPEN on the left, `(from, to]`,
// exactly as a seek is — and the state at `from` is `reduce(<= from)`.
// ===========================================================================
{
  const sink = newSink();
  const deck = offlineDeck({
    items: [{ at: 0, kind: 'cue', id: 'AT_FROM', payload: { op: 'add', v: 5 } },
            { at: 1, kind: 'cue', id: 'AFTER', payload: { op: 'add', v: 7 } },
            { at: 500, kind: 'cue', id: 'AT_TO', payload: { op: 'add', v: 9 } }],
    adapters: makeAdapters(sink), range: [0, 1000], autoStart: false,
  });
  const r = renderDeck(deck, { from: 0, to: 500, fps: 30 });
  const ids = r.trace.filter((x) => !String(x.id).startsWith('#')).map((x) => x.id);
  check('render-boundary', 0, !ids.includes('AT_FROM') && ids.includes('AFTER') && ids.includes('AT_TO'),
    `the window is half-open on the left: an event at exactly \`from\` is folded by the opening seek, one at exactly \`to\` fires (${ids})`);
  check('render-boundary', 0, deck.reduceAt('cue', 0) === 5,
    `…and its effect IS in the state at from: reduce(<=0) = ${deck.reduceAt('cue', 0)} (expected 5)`);
  deck.dispose();
}

// ===========================================================================
// D6 — a WALL-CLOCK deck is refused. Rendering it would reintroduce exactly
// the failure the mode exists to remove.
// ===========================================================================
{
  const deck = createDeck({ items: [{ at: 10, kind: 'cue', id: 'x', payload: { op: 'add', v: 1 } }],
    adapters: makeAdapters(newSink()), range: [0, 1000] });
  let err = null;
  try { renderDeck(deck, { from: 0, to: 100, fps: 30 }); } catch (e) { err = e; }
  check('render-refuse', 0, err && err.code === 'RENDER_NEEDS_VIRTUAL_CLOCK',
    `a wall-clock deck must be refused with RENDER_NEEDS_VIRTUAL_CLOCK (got ${err && err.code})`);
  check('render-refuse', 0, err && /NO WALL CLOCK/.test(err.message),
    `…and the refusal must say why: ${err && err.message.slice(0, 80)}`);
  deck.dispose();

  const rt = createRenderRuntime(0);
  const wrong = createDeck({ items: [], adapters: {}, range: [0, 1000] });
  let e2 = null;
  try { renderDeck(wrong, { from: 0, to: 100, fps: 30, runtime: rt }); } catch (e) { e2 = e; }
  check('render-refuse', 0, e2 && e2.code === 'RENDER_NEEDS_VIRTUAL_CLOCK' && /differ across machines/.test(e2.message),
    `a deck whose clock is not the runtime's must be refused too: ${e2 && e2.message.slice(0, 60)}`);
  wrong.dispose();
}

// ===========================================================================
// D7 — what cannot be made deterministic is REPORTED, and the report's own
// blind spot is asserted so nobody reads a clean scan as a proof.
// ===========================================================================
{
  const sink = newSink();
  const deck = offlineDeck({
    items: [{ at: 100, kind: 'live', id: 'a', payload: {} }, { at: 200, kind: 'pure', id: 'b', payload: {} }],
    range: [0, 1000], autoStart: false,
    adapters: {
      live: { caps: { catchUp: 'drop' }, actuate: () => { sink.fired.push(Math.random() + Date.now()); } },
      pure: { caps: { catchUp: 'drop', deterministic: true }, actuate: () => { sink.fired.push(1); } },
      dev: { caps: { catchUp: 'drop', deterministic: false }, actuate: () => {} },
    },
  });
  const a = auditAdapters(deck);
  check('render-audit', 0, a.suspectedNondeterministic.includes('live'),
    `an adapter calling Math.random()/Date.now() must be SUSPECTED: ${JSON.stringify(a.suspectedNondeterministic)}`);
  check('render-audit', 0, a.declaredNondeterministic.includes('dev'),
    `caps.deterministic:false must be reported as DECLARED: ${JSON.stringify(a.declaredNondeterministic)}`);
  const liveRow = a.rows.find((r) => r.kind === 'live');
  check('render-audit', 0, liveRow.suspected.some((h) => h.what === 'Math.random()') &&
                           liveRow.suspected.some((h) => h.what === 'Date.now()'),
    `the report must name WHAT it saw: ${JSON.stringify(liveRow.suspected)}`);
  check('render-audit', 0, a.rows.find((r) => r.kind === 'pure').clean === true,
    'a declared-deterministic, clean-scanning adapter must come back clean');
  check('render-audit', 0, a.undeclared.includes('live') && !a.undeclared.includes('pure'),
    `an adapter that never declared must be listed as undeclared: ${JSON.stringify(a.undeclared)}`);

  const rep = renderDeck(deck, { from: 0, to: 500, fps: 30 });
  check('render-audit', 0, rep.audit.ok === false && rep.audit.rows.length === 3,
    'the render RESULT must carry the audit, not hide it');
  let thrown = null;
  try { renderDeck(deck, { from: 0, to: 500, fps: 30, onNondeterministic: 'throw' }); }
  catch (e) { thrown = e; }
  check('render-audit', 0, thrown && thrown.code === 'RENDER_NONDETERMINISTIC_ADAPTER' && thrown.audit,
    `onNondeterministic:'throw' must be a usable CI gate (got ${thrown && thrown.code})`);
  deck.dispose();

  // THE BLIND SPOT, asserted. A source-text scan cannot see through a closure,
  // so a clean report is NOT a proof of determinism — and this check exists so
  // that claim is a measured fact in the suite rather than a sentence in a
  // comment nobody re-reads.
  const hidden = (() => { const draw = Math.random; return () => draw(); })();
  const sneaky = offlineDeck({
    items: [{ at: 100, kind: 'sneaky', id: 'a', payload: {} }], range: [0, 1000], autoStart: false,
    adapters: { sneaky: { caps: { catchUp: 'drop' }, actuate: () => { sink.fired.push(hidden()); } } },
  });
  const sa = auditAdapters(sneaky);
  check('render-audit-blindspot', 0, sa.rows[0].suspected.length === 0 && sa.ok === true,
    'DOCUMENTED LIMIT: randomness reached through a closure scans CLEAN — the audit is a heuristic, not a proof');
  check('render-audit-blindspot', 0, /HEURISTIC/.test(sa.note) || /heuristic/i.test(sa.note),
    'and the audit says so in its own note');
  sneaky.dispose();
}

// ===========================================================================
// D8 — seedRandom: the one nondeterminism the mode can FIX rather than report.
// ===========================================================================
{
  const mk = (bag) => offlineDeck({
    items: [{ at: 100, kind: 'r', id: 'a', payload: {} }, { at: 200, kind: 'r', id: 'b', payload: {} }],
    range: [0, 1000], autoStart: false,
    adapters: { r: { caps: { catchUp: 'drop' }, actuate: () => bag.push(Math.random()) } },
  });
  const b1 = [], b2 = [], b3 = [], b4 = [];
  const d1 = mk(b1), d2 = mk(b2), d3 = mk(b3), d4 = mk(b4);
  const rs1 = renderDeck(d1, { from: 0, to: 500, fps: 30, seedRandom: 7 });
  const rs2 = renderDeck(d2, { from: 0, to: 500, fps: 30, seedRandom: 7 });
  renderDeck(d3, { from: 0, to: 500, fps: 30 });
  renderDeck(d4, { from: 0, to: 500, fps: 30 });
  check('render-seed', 0, String(b1) === String(b2) && b1.length === 2,
    `seedRandom must make an Math.random adapter reproducible (${b1} vs ${b2})`);
  check('render-seed', 0, rs1.random.seeded === true && rs1.random.calls === 2 && rs1.random.seed === 7,
    `the draws must be COUNTED and reported: ${JSON.stringify(rs1.random)}`);
  check('render-seed', 0, String(b3) !== String(b4),
    'without seedRandom the same render really does differ — the report is not theatre');
  check('render-seed', 0, typeof Math.random() === 'number' && Math.random !== rs1.random.fn,
    'Math.random must be RESTORED after the render');
  for (const d of [d1, d2, d3, d4]) d.dispose();
}

// ===========================================================================
// A1 — the audio seam. The lane is the SHIPPED createAudioLane, unmodified,
// taking its context by argument. Proved against a stub OfflineAudioContext,
// WITH the negative control that shows the shim is load-bearing.
// ===========================================================================
function stubOffline(sampleRate = 48000) {
  const started = [];
  const ctx = {
    sampleRate, currentTime: 0, destination: { __dest: true },
    createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }),
    createBufferSource: () => ({ buffer: null, onended: null, connect() {}, disconnect() {},
      start(t) { started.push(+t.toFixed(9)); }, stop() {} }),
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
    // enough of a buffer for hashAudioBuffer(): the stub proves the SEAM (node
    // times), never the PCM — the PCM is measured in a real browser by
    // timeline/lab/run-render.mjs.
    startRendering: async () => { const d = new Float32Array(8);
      return { numberOfChannels: 1, length: d.length, sampleRate, getChannelData: () => d }; },
    started,
  };
  return ctx;
}
{
  const AT = [500, 1500, 2500, 3500];
  const run = (shim) => {
    const sink = newSink();
    const deck = offlineDeck({ items: [], adapters: makeAdapters(sink), range: [0, 5000], autoStart: false });
    const ctx = stubOffline();
    const target = shim ? offlineAudioTarget(ctx, deck.renderRuntime, { startMs: deck.renderRuntime.now() }) : ctx;
    const lane = createAudioLane(deck.transport, target, { host: deck.renderRuntime.newHost('audio') });
    for (const at of AT) lane.schedule({ at, kind: 'click', id: `k${at}` });
    lane.start();
    const r = renderDeck(deck, { from: 0, to: 4000, fps: 30 });
    lane.stop();
    return { started: ctx.started.slice(), anchor: lane.anchorInfo(), stats: lane.stats(), r, deck };
  };
  const withShim = run(true);
  const bare = run(false);
  const want = AT.map((a) => a / 1000);
  check('render-audio', 0, String(withShim.started) === String(want),
    `through the virtual-clock shim the lane must start nodes at the EXACT offsets ${want} (got ${withShim.started})`);
  check('render-audio', 0, withShim.anchor && Math.abs(withShim.anchor.audio - withShim.anchor.wall / 1000) < 1e-9,
    `the anchor must map wall->audio exactly: ${JSON.stringify(withShim.anchor)}`);
  check('render-audio-control', 0, String(bare.started) !== String(want) && bare.started.every((x) => x <= 0.2),
    `NEGATIVE CONTROL: a BARE OfflineAudioContext (currentTime pinned at 0) collapses every node into the first 200 ms — got ${bare.started}`);
  // and the audio render is deterministic too
  const again = run(true);
  check('render-audio', 0, String(again.started) === String(withShim.started) &&
                           again.r.traceText === withShim.r.traceText,
    'two audio renders must schedule the identical node times and the identical trace');
  for (const x of [withShim, bare, again]) x.deck.dispose();
}

// ===========================================================================
// Multi-host runtime: the thing createVirtualRuntime cannot do.
// ===========================================================================
{
  const rt = createRenderRuntime(0);
  const h1 = rt.newHost('a'), h2 = rt.newHost('b');
  const seen = [];
  h1.start(() => seen.push('a'), 10);
  h2.start(() => seen.push('b'), 25);
  rt.advanceTo(50);
  const a = seen.filter((x) => x === 'a').length, b = seen.filter((x) => x === 'b').length;
  check('render-runtime', 0, a === 6 && b === 3,
    `two hosts at 10 ms and 25 ms over [0,50] must both tick independently (a=${a} expected 6, b=${b} expected 3)`);
  const vr = createVirtualRuntime(0);
  const s2 = [];
  vr.host.start(() => s2.push('x'), 10);
  vr.host.start(() => s2.push('y'), 10);          // the documented limitation
  vr.advanceTo(30);
  check('render-runtime', 0, s2.every((v) => v === 'y'),
    'CONTROL: createVirtualRuntime\'s single host loses the first callback when a second consumer starts — which is why createRenderRuntime exists');
}

// ===========================================================================
// N — THE NEST. plan-timeline §8.8's last open seam. Everything below renders
// a COMPOSITION (fragment quotation, loops, nested nests), not a flat deck.
// ===========================================================================

// The rig, in both worlds. One factory, two clocks: `offline` builds every deck
// on ONE render runtime (the composition's requirement), `wall` builds the same
// arrangement on the real clock with mainTickHost() everywhere — including for
// the nest's boundary, so the two arms differ ONLY in what a clock is.
const N_IN = 0, N_OUT = 1690, N_AT = 500;      // 1690 ms: NOT a frame multiple
const N_CHILD_RANGE = [-10, 6000];             // room for the wrap's hair-lead
const nItems = () => [
  { at: N_IN, kind: 'note', id: 'DOWN', payload: { v: 'DOWN' } },   // exactly on `in`
  { at: 700, kind: 'note', id: 'MID', payload: { v: 'MID' } },
  { at: 1200, kind: 'cc', id: 'CC1', payload: { v: 74 } },          // a LEVEL lane
  { at: N_OUT + 5, kind: 'note', id: 'TAIL', payload: { v: 'TAIL' } }, // 5 ms past `out`
];
const newNSink = () => ({ fired: [], cc: null, wraps: [], asserts: 0 });
function nAdapters(sink, { rates = null, ccCarry = true } = {}) {
  const noteCaps = { catchUp: 'reduce', reducible: true, seekable: true, deterministic: true, loopState: 'rearm' };
  if (rates) noteCaps.rates = rates;
  return {
    note: { caps: noteCaps,
      actuate: (p) => sink.fired.push(p.v),
      reduce: (ps) => ps.length,
      assertState: () => { sink.asserts++; },
      loopWrap: (i) => sink.wraps.push(`${i.from}->${i.to}:${i.reason}`) },
    cc: { caps: { catchUp: 'reduce', reducible: true, seekable: true, deterministic: true,
                  loopState: ccCarry ? 'carry' : 'rearm' },
      actuate: (p) => { sink.cc = p.v; },
      reduce: (ps) => (ps.length ? ps[ps.length - 1].v : null),
      assertState: (s) => { sink.cc = s; } },
  };
}
function nRigOffline({ repeat = 4, host = true, at = N_AT, rate = 1, adOpts = {} } = {}) {
  const rt = createRenderRuntime(0);
  const sink = newNSink();
  const child = offlineDeck({ runtime: rt, range: N_CHILD_RANGE, items: nItems(),
    adapters: nAdapters(sink, adOpts), autoStart: false });
  const parent = offlineDeck({ runtime: rt, range: [0, 30000], items: [], autoStart: false });
  const nest = host ? offlineNest(parent, { runtime: rt }) : createNest(parent);
  nest.add({ id: 'q', at, rate, deck: child, in: N_IN, out: N_OUT, repeat });
  return { rt, parent, child, nest, sink };
}
function nRigWall({ repeat = 4, at = N_AT, rate = 1, adOpts = {} } = {}) {
  const sink = newNSink();
  const child = createDeck({ tickHost: mainTickHost(), range: N_CHILD_RANGE, items: nItems(),
    adapters: nAdapters(sink, adOpts) });
  const parent = createDeck({ tickHost: mainTickHost(), range: [0, 30000], items: [] });
  const nest = createNest(parent, { tickHost: mainTickHost() });
  nest.add({ id: 'q', at, rate, deck: child, in: N_IN, out: N_OUT, repeat });
  return { parent, child, nest, sink };
}
const idsOf = (r, s) => r.trace.filter((x) => x.s === s && !String(x.id).startsWith('#')).map((x) => x.id);

// --- N1/N2: byte-identity, twice, for a FRAGMENT and for a LOOP -------------
{
  for (const [label, repeat] of [['fragment', null], ['loop', 4]]) {
    const a = nRigOffline({ repeat: repeat === null ? null : repeat }), b = nRigOffline({ repeat: repeat === null ? null : repeat });
    const posA = [], posB = [];
    const ra = renderNest(a.nest, { fps: 30, onFrame: ({ children }) => posA.push(children[0].pos) });
    const rb = renderNest(b.nest, { fps: 30, onFrame: ({ children }) => posB.push(children[0].pos) });
    check('nest-det', 0, ra.traceText === rb.traceText && ra.traceHash === rb.traceHash,
      `${label}: two renders of one nest must produce a BYTE-IDENTICAL trace (${ra.traceText.length} bytes, ${ra.traceHash} vs ${rb.traceHash})`);
    check('nest-det', 0, ra.nest.wrapsText === rb.nest.wrapsText && ra.renderHash === rb.renderHash,
      `${label}: …including the WRAP SET, which is not in the trace (rule 10c) but has its own hash: ${ra.nest.wrapsHash} vs ${rb.nest.wrapsHash}`);
    check('nest-det', 0, a.sink.fired.join(',') === b.sink.fired.join(',') && a.sink.fired.length > 0,
      `${label}: the CHILD's adapter must see the same events in the same order (${a.sink.fired.join(',')})`);
    check('nest-det', 0, JSON.stringify(posA) === JSON.stringify(posB),
      `${label}: the child's per-frame position must be identical on both runs`);

    // N2 — the position map is the arithmetic §8.2 states, at EVERY frame.
    const L = N_OUT - N_IN;
    const bad = [];
    for (let i = 0; i < posA.length; i++) {
      const pp = ra.from + (i * 1000) / 30;
      const x = (pp - N_AT) * 1;
      const want = repeat === null
        ? Math.max(N_IN, Math.min(N_OUT, N_IN + x))                       // clamp
        : (x <= 0 ? N_IN : x >= repeat * L ? N_OUT : N_IN + (x - Math.floor(x / L) * L));  // modulo
      if (Math.abs(posA[i] - want) > 1e-6) bad.push([i, posA[i], want]);
    }
    check('nest-map', 0, bad.length === 0,
      `${label}: childPos must be ${repeat === null ? 'clamp(in + (pos-at)*rate)' : 'in + ((pos-at)*rate) mod (out-in)'} at every frame (${bad.length} mismatches, first ${JSON.stringify(bad[0])})`);
    check('nest-map', 0, ra.events > 0 && ra.nest.events > 0 && ra.nest.spans === 1,
      `${label}: the render must carry BOTH lanes — parent ${ra.events}, child ${ra.nest.events}, spans ${ra.nest.spans}`);
    // the fragment is a FRAGMENT: nothing past `out` is ever heard.
    check('nest-map', 0, !a.sink.fired.includes('TAIL'),
      `${label}: an event 5 ms past \`out\` is NOT part of the quotation and must never fire (${a.sink.fired.join(',')})`);
  }
}

// --- N1b: exactly-once and left-edge inside a loop --------------------------
{
  const a = nRigOffline({ repeat: 4 });
  const r = renderNest(a.nest, { fps: 30 });
  const ids = idsOf(r, 'q');
  check('nest-once', 0, ids.length === 12 && ids.join(',') === 'DOWN,MID,CC1,DOWN,MID,CC1,DOWN,MID,CC1,DOWN,MID,CC1',
    `4 passes of a 3-event fragment must fire 12 events in pass order (${ids.length}: ${ids.join(',')})`);
  check('nest-once', 0, r.nest.loops[0].wraps === 3 && r.nest.wraps === 3 && r.nest.wrapsByReason.boundary === 3,
    `N passes = N-1 wraps, all COMMITTED at the instant: ${JSON.stringify(r.nest.wrapsByReason)}`);
  // §8.8's downbeat detail, offline: the wrap seeks a HAIR before `in`, so the
  // event sitting exactly on `in` is pending and commits — 4 downbeats, not 3.
  check('nest-once', 0, ids.filter((x) => x === 'DOWN').length === 4 && r.nest.loops[0].leadClamped === false,
    `the downbeat sitting exactly on \`in\` must fire on EVERY pass including the first (${ids.filter((x) => x === 'DOWN').length}/4)`);
  // …and the one case the library cannot fix is REPORTED, not hidden.
  const rt = createRenderRuntime(0);
  const sink = newNSink();
  const ch = offlineDeck({ runtime: rt, range: [0, 6000], items: nItems(), adapters: nAdapters(sink) });
  const par = offlineDeck({ runtime: rt, range: [0, 30000], items: [] });
  const ne = offlineNest(par, { runtime: rt });
  ne.add({ id: 'q', at: 0, deck: ch, in: 0, out: N_OUT, repeat: 3 });
  const rc = renderNest(ne, { fps: 30 });
  check('nest-once', 0, rc.nest.loops[0].leadClamped === true &&
        rc.nest.loops[0].degradations.some((d) => /lost downbeat/.test(d.reason)),
    `\`in\` === the child's range start loses the hair-lead, and the render REPORTS it: ${JSON.stringify(rc.nest.loops[0].degradations.map((d) => d.wanted))}`);
  // OFFLINE LATENESS IS ZERO. §8.8 measured wrap-adjacent firing lateness at
  // p50 0.10 / p95 0.70 ms in playback; the render has no wall clock to be late
  // against, so every fire lands on its intended microsecond exactly.
  const lates = r.trace.filter((x) => !String(x.id).startsWith('#')).map((x) => x.d);
  check('nest-once', 0, lates.length > 0 && lates.every((d) => d === 0),
    `every fire in a nested render must have deltaMs === 0 (${lates.filter((d) => d !== 0).length}/${lates.length} nonzero)`);
}

// --- N3: THE RENDER EQUALS WALL-CLOCK PLAYBACK OF THE SAME NEST -------------
{
  const SHORT_OUT = 400, PASSES = 4;
  const mkItems = () => [
    { at: 0, kind: 'note', id: 'DOWN', payload: { v: 'DOWN' } },
    { at: 180, kind: 'note', id: 'MID', payload: { v: 'MID' } },
    { at: 300, kind: 'cc', id: 'CC1', payload: { v: 74 } },
    { at: SHORT_OUT + 5, kind: 'note', id: 'TAIL', payload: { v: 'TAIL' } },
  ];
  const mkOffline = () => {
    const rt = createRenderRuntime(0); const sink = newNSink();
    const child = offlineDeck({ runtime: rt, range: [-10, 3000], items: mkItems(), adapters: nAdapters(sink) });
    const parent = offlineDeck({ runtime: rt, range: [0, 8000], items: [] });
    const nest = offlineNest(parent, { runtime: rt });
    nest.add({ id: 'q', at: 200, rate: 1, deck: child, in: 0, out: SHORT_OUT, repeat: PASSES });
    return { rt, parent, child, nest, sink };
  };
  const o = mkOffline();
  // The window opens BEFORE the span, so the enter event FIRES rather than being
  // folded by the opening seek (the flat suite's half-open left edge, one level
  // up). That is deliberate: the entry is the interesting path — it is where the
  // first pass's downbeat is won or lost — so both arms must play through it.
  const WIN = { from: 0, to: 200 + PASSES * SHORT_OUT };
  const ro = renderNest(o.nest, { ...WIN, fps: 30 });
  const offChild = idsOf(ro, 'q');
  const offParent = ro.trace.filter((x) => !x.s && !String(x.id).startsWith('#')).map((x) => x.id);

  const w = (() => {
    const sink = newNSink();
    const child = createDeck({ tickHost: mainTickHost(), range: [-10, 3000], items: mkItems(), adapters: nAdapters(sink) });
    const parent = createDeck({ tickHost: mainTickHost(), range: [0, 8000], items: [] });
    const nest = createNest(parent, { tickHost: mainTickHost() });
    nest.add({ id: 'q', at: 200, rate: 1, deck: child, in: 0, out: SHORT_OUT, repeat: PASSES });
    return { parent, child, nest, sink };
  })();
  const wChild = [], wParent = [];
  const offC = w.child.sched.onFire((ev) => wChild.push(ev.id));
  const offP = w.parent.sched.onFire((ev) => wParent.push(ev.id));
  const iv = setInterval(() => w.nest.servo(), 16);
  await new Promise((res) => {
    w.parent.seek(0); w.parent.play(1);
    setTimeout(() => { w.parent.pause(); clearInterval(iv); offC(); offP(); res(); },
      200 + PASSES * SHORT_OUT + 250);
  });
  check('nest-vs-realtime', 0, wChild.length === offChild.length,
    `real wall-clock playback of the nest must fire the same CHILD count as the render (${offChild.length} rendered, ${wChild.length} played)`);
  check('nest-vs-realtime', 0, String(wChild) === String(offChild),
    `…the same child events in the same ORDER (rendered ${offChild.join(',')} | played ${wChild.join(',')})`);
  check('nest-vs-realtime', 0, String(wParent) === String(offParent),
    `…and the same PARENT (span) events (${offParent.join(',')} | ${wParent.join(',')})`);
  check('nest-vs-realtime', 0, o.sink.fired.join(',') === w.sink.fired.join(',') && o.sink.cc === w.sink.cc,
    `…and the same final adapter state (cc ${o.sink.cc} vs ${w.sink.cc})`);
  check('nest-vs-realtime', 0, w.nest.loop('q').wraps === ro.nest.wraps,
    `…and the same number of wraps (${ro.nest.wraps} rendered, ${w.nest.loop('q').wraps} played)`);
  w.parent.dispose(); w.child.dispose();

  // …and against an IRREGULARLY-advanced virtual clock, which is the jitter
  // control the flat suite uses: same events, no waiting. (createVirtualRuntime
  // cannot host three tick hosts — that limitation is asserted at the end of
  // this file — so the jitter arm rides a render runtime it advances by hand.)
  const vr = createRenderRuntime(5_000_000);
  const sinkJ = newNSink();
  const childJ = createDeck({ clock: vr.clock, tickHost: vr.newHost(), range: [-10, 3000], items: mkItems(), adapters: nAdapters(sinkJ) });
  const parentJ = createDeck({ clock: vr.clock, tickHost: vr.newHost(), range: [0, 8000], items: [] });
  const nestJ = createNest(parentJ, { tickHost: vr.newHost() });
  nestJ.add({ id: 'q', at: 200, rate: 1, deck: childJ, in: 0, out: SHORT_OUT, repeat: PASSES });
  const jIds = [];
  const offJ = childJ.sched.onFire((ev) => jIds.push(ev.id));
  parentJ.seek(0); parentJ.play(1);
  const jr = mulberry32(31337);
  let t = vr.now();
  const END = 5_000_000 + WIN.to;
  while (t < END) { t += 1 + jr() * 40; vr.advanceTo(Math.min(t, END)); nestJ.servo(); }
  vr.advanceTo(END); nestJ.servo();
  parentJ.pause(); offJ();
  check('nest-vs-jitter', 0, String(jIds) === String(offChild),
    `an irregularly-clocked play of the nest must fire the same child events in the same order (${offChild.length} vs ${jIds.length}: ${jIds.join(',')})`);
  parentJ.dispose(); childJ.dispose();
}

// --- N4: THE WRAP DISCIPLINE, and its negative control ----------------------
{
  // The discipline: the boundary is a COMMITTED ONE-SHOT on a TickHost, exactly
  // as in playback (§8.8) — the render runtime supplies a deterministic one, so
  // the offline path runs the SAME code, not an offline imitation of it.
  const c = nRigOffline({ repeat: 4, host: true });
  const rc = renderNest(c.nest, { fps: 30 });
  const p = nRigOffline({ repeat: 4, host: false });
  const rp = renderNest(p.nest, { fps: 30 });
  check('nest-wrap', 0, rc.nest.loops[0].boundary === 'lookahead' && rp.nest.loops[0].boundary === 'polled',
    `offlineNest() commits the boundary; a bare createNest() polls it, and the render says which: ${rc.nest.loops[0].boundary} vs ${rp.nest.loops[0].boundary}`);
  check('nest-wrap', 0, rc.nest.wraps === rp.nest.wraps && rp.nest.wrapsByReason.polled === 3,
    `both take the same NUMBER of wraps — the difference is not the count: ${rc.nest.wraps} vs ${rp.nest.wraps}`);
  // THE NEGATIVE CONTROL, and it inverts §8.8's playback finding. Polling in
  // PLAYBACK lost a downbeat (2100/2400 onsets) because the head of the pass was
  // folded. Polling OFFLINE loses nothing — `wrapSpan` seeks to the top of the
  // pass, so the downbeat still fires — it LEAKS instead: the child free-runs
  // past `out` for up to one frame, and material outside the quotation sounds.
  check('nest-wrap', 0, rp.nest.events > rc.nest.events && p.sink.fired.includes('TAIL') && !c.sink.fired.includes('TAIL'),
    `a POLLED boundary renders a DIFFERENT EVENT SET — ${rc.nest.events} committed vs ${rp.nest.events} polled, and the extra events are material past \`out\` (${p.sink.fired.filter((x) => x === 'TAIL').length} TAIL leaks)`);
  check('nest-wrap', 0, rp.notes.some((n) => /LOOP BOUNDARY POLLED/.test(n)) && rp.nest.polled.join() === 'q',
    `…and the render REPORTS it rather than letting a reproducible-but-wrong render pass as clean: ${JSON.stringify(rp.nest.polled)}`);
  // both are still DETERMINISTIC — being wrong reproducibly is the trap this
  // report exists to catch.
  const p2 = nRigOffline({ repeat: 4, host: false });
  const rp2 = renderNest(p2.nest, { fps: 30 });
  check('nest-wrap', 0, rp.traceText === rp2.traceText,
    'the POLLED render is byte-identical too — determinism is not correctness, which is why the report exists');
}

// --- N5: the committed boundary alone carries the loop ----------------------
{
  const a = nRigOffline({ repeat: 4 }), b = nRigOffline({ repeat: 4 });
  const ra = renderNest(a.nest, { fps: 30 });
  const rb = renderNest(b.nest, { fps: 30, servo: false });
  check('nest-servo', 0, ra.traceText === rb.traceText && ra.nest.wrapsText === rb.nest.wrapsText,
    `with the boundary committed, servo:false renders IDENTICALLY — the servo is a backstop, not the mechanism (${ra.traceHash} vs ${rb.traceHash})`);
  check('nest-servo', 0, ra.nest.servo.corrections === 0 && ra.nest.servo.calls === ra.frames,
    `and the servo makes ZERO corrections offline: parent and child ride one clock, so the position error is exactly 0 (${ra.nest.servo.corrections} corrections in ${ra.nest.servo.calls} calls)`);
  check('nest-servo', 0, rb.notes.some((n) => /servo:false/.test(n)),
    'servo:false is a reported render condition, not a silent one');
  // THE FOURTH CELL. The 2x2 is the whole discipline in one table:
  //   host+servo -> 3 wraps, correct        host, no servo -> 3 wraps, IDENTICAL
  //   no host+servo -> 3 wraps, LEAKS       no host, no servo -> 0 wraps, NO LOOP
  const c = nRigOffline({ repeat: 4, host: false });
  const rc = renderNest(c.nest, { fps: 30, servo: false });
  check('nest-servo', 0, rc.nest.wraps === 0,
    `no tick host AND no servo = NOTHING drives the boundary, so the "loop" plays its first pass and stops: ${rc.nest.wraps} wraps, ${rc.nest.events} events`);
  check('nest-servo', 0, rc.nest.events < ra.nest.events && rc.notes.some((n) => /LOOP BOUNDARY POLLED/.test(n)),
    `…and both conditions are reported (${rc.nest.events} vs ${ra.nest.events} events)`);
}

// --- N6: an unbounded loop cannot be rendered -------------------------------
{
  const rt = createRenderRuntime(0);
  const sink = newNSink();
  const child = offlineDeck({ runtime: rt, range: N_CHILD_RANGE, items: nItems(), adapters: nAdapters(sink) });
  const parent = offlineDeck({ runtime: rt, range: [0, 12000], items: [] });
  const nest = offlineNest(parent, { runtime: rt });
  nest.add({ id: 'forever', at: 0, rate: 1, deck: child, in: 0, out: 1000, repeat: 'infinite' });
  let e = null;
  try { renderNest(nest, { fps: 30 }); } catch (x) { e = x; }
  check('nest-unbounded', 0, e && e.code === 'LOOP_UNBOUNDED' && String(e.spans) === 'forever',
    `renderDeck must ROUTE THROUGH renderBound() rather than hang or invent a window: ${e && e.code} ${JSON.stringify(e && e.spans)}`);
  const t0 = Date.now();
  const r = renderNest(nest, { from: 0, to: 6000, fps: 30 });
  const ms = Date.now() - t0;
  check('nest-unbounded', 0, r.nest.wraps === 6 && r.nest.unbounded.join() === 'forever' && ms < 2000,
    `…and naming the end yourself is accepted, bounded, and REPORTED as invented (${r.nest.wraps} wraps in ${ms} ms, unbounded ${JSON.stringify(r.nest.unbounded)})`);
  check('nest-unbounded', 0, r.notes.some((n) => /bounded by the RENDER WINDOW/.test(n)),
    'the note must say the bound came from the render, not from the score');
}

// --- N7: a degraded child rate is REPORTED, never overridden ----------------
{
  const a = nRigOffline({ repeat: null, rate: 1.5, adOpts: { rates: [1] } });
  const r = renderNest(a.nest, { fps: 30 });
  const row = r.nest.rates[0];
  check('nest-rate', 0, row.degraded === true && row.wanted === 1.5 && row.chose === 1 && String(row.allowed) === '1',
    `a child adapter with caps.rates:[1] REFUSES 1.5x and the refusal rides out in the report: ${JSON.stringify(row)}`);
  check('nest-rate', 0, a.child.targetRate() === 1 && r.nest.degradedRates.join() === 'q',
    `…the child really runs at the rate it CAN (${a.child.targetRate()}), not the one the score asked for`);
  check('nest-rate', 0, r.notes.some((n) => /RATE DEGRADED/.test(n)) && row.corrections > 0,
    `…and the servo's correction count is the price of the honest degradation (${row.corrections} corrections)`);
  // the control: no lattice, no degradation, no corrections.
  const b = nRigOffline({ repeat: null, rate: 1.5 });
  const rb = renderNest(b.nest, { fps: 30 });
  check('nest-rate', 0, rb.nest.rates[0].degraded === false && rb.nest.rates[0].corrections === 0 && rb.nest.degradedRates.length === 0,
    `CONTROL: with no lattice the same 1.5x composes exactly and corrects zero times (${JSON.stringify(rb.nest.rates[0])})`);
}

// --- N8: caps.loopState + adapter.loopWrap() are identical offline ----------
{
  // `cc` declares 'carry' and `note` declares 'rearm'. §8.3: a level lane keeps
  // its value across the boundary; an edge lane re-arms from the entry state.
  const a = nRigOffline({ repeat: 4 });
  const ccPerFrame = [];
  const r = renderNest(a.nest, { fps: 30, onFrame: ({ children }) => ccPerFrame.push([children[0].iter, a.sink.cc]) });
  const lanes = r.nest.loops[0].lanes;
  check('nest-loopstate', 0, lanes.carry.join() === 'cc' && lanes.rearm.join() === 'note',
    `the render must report which lanes CARRY and which RE-ARM: ${JSON.stringify(lanes)}`);
  // the CC is set at child 1200 (inside the pass) and must still be set at the
  // top of the NEXT pass — that is what 'carry' means.
  const atWrap = [];
  for (let i = 1; i < ccPerFrame.length; i++) if (ccPerFrame[i][0] !== ccPerFrame[i - 1][0]) atWrap.push(ccPerFrame[i][1]);
  check('nest-loopstate', 0, atWrap.length === 3 && atWrap.every((v) => v === 74),
    `a 'carry' lane survives every wrap: cc at the 3 boundaries = ${JSON.stringify(atWrap)} (expected 74,74,74)`);
  check('nest-loopstate', 0, a.sink.wraps.length === 3 && a.sink.wraps.every((w) => /:boundary$/.test(w)),
    `adapter.loopWrap() must be called offline, once per wrap, with the reason: ${JSON.stringify(a.sink.wraps)}`);
  // the same lane declared 'rearm' folds back to the entry state instead.
  const b = nRigOffline({ repeat: 4, adOpts: { ccCarry: false } });
  const ccB = [];
  renderNest(b.nest, { fps: 30, onFrame: ({ children }) => ccB.push([children[0].iter, b.sink.cc]) });
  const atWrapB = [];
  for (let i = 1; i < ccB.length; i++) if (ccB[i][0] !== ccB[i - 1][0]) atWrapB.push(ccB[i][1]);
  check('nest-loopstate', 0, atWrapB.length === 3 && atWrapB.every((v) => v === null),
    `CONTROL: the SAME lane declared 'rearm' folds back to the entry state at every wrap: ${JSON.stringify(atWrapB)}`);
}

// --- N9: every deck in the composition must be on the render's clock --------
{
  const rt = createRenderRuntime(0);
  const sink = newNSink();
  const wallChild = createDeck({ range: N_CHILD_RANGE, items: nItems(), adapters: nAdapters(sink) });
  const parent = offlineDeck({ runtime: rt, range: [0, 30000], items: [] });
  const nest = offlineNest(parent, { runtime: rt });
  nest.add({ id: 'q', at: 0, deck: wallChild, in: 0, out: 1000 });
  let e = null;
  try { renderNest(nest, { fps: 30 }); } catch (x) { e = x; }
  check('nest-refuse', 0, e && e.code === 'RENDER_NEEDS_VIRTUAL_CLOCK' && e.span === 'q' && /nested deck 'q'/.test(e.message),
    `a CHILD on a wall clock must be refused BY NAME — the parent's clock check is not enough: ${e && e.message.slice(0, 70)}`);
  wallChild.dispose(); parent.dispose();
}

// --- N10: two levels deep — exactly-once still holds -------------------------
{
  const build = () => {
    const rt = createRenderRuntime(0);
    const sG = newNSink(), sM = newNSink();
    const grand = offlineDeck({ runtime: rt, range: [-10, 2000],
      items: [{ at: 0, kind: 'note', id: 'G0', payload: { v: 'G' } }, { at: 400, kind: 'note', id: 'G1', payload: { v: 'g' } }],
      adapters: nAdapters(sG) });
    const mid = offlineDeck({ runtime: rt, range: N_CHILD_RANGE, items: nItems(), adapters: nAdapters(sM) });
    const inner = offlineNest(mid, { runtime: rt });
    inner.add({ id: 'in', at: 0, rate: 1, deck: grand, in: 0, out: 800, repeat: 2 });
    const parent = offlineDeck({ runtime: rt, range: [0, 30000], items: [] });
    const outer = offlineNest(parent, { runtime: rt });
    outer.add({ id: 'out', at: 100, rate: 1, deck: mid, in: N_IN, out: N_OUT, repeat: 2 });
    return { outer, sG, sM };
  };
  const a = build(), b = build();
  const ra = renderNest(a.outer, { fps: 30 });
  const rb = renderNest(b.outer, { fps: 30 });
  check('nest-deep', 0, ra.nest.depth === 2 && ra.nest.nests === 2 && ra.nest.decks.length === 2 &&
        ra.nest.decks.map((d) => d.label).join() === 'out,out/in',
    `a nest inside a nest must be folded too, and labelled by arrangement PATH: ${JSON.stringify(ra.nest.decks.map((d) => d.label))}`);
  const gIds = idsOf(ra, 'out/in');
  check('nest-deep', 0, gIds.join(',') === 'G0,G1,G0,G1,G0,G1,G0,G1',
    `2 outer passes x 2 inner passes x 2 events = 8, each EXACTLY ONCE (${gIds.length}: ${gIds.join(',')})`);
  check('nest-deep', 0, ra.traceText === rb.traceText && ra.renderHash === rb.renderHash,
    `…byte-identically, two levels down (${ra.renderHash} vs ${rb.renderHash})`);
  check('nest-deep', 0, a.sG.fired.join(',') === 'G,g,G,g,G,g,G,g',
    `the grandchild's own adapter agrees: ${a.sG.fired.join(',')}`);
}

// --- N10b: a SCORE, round-tripped TWICE, renders identically ----------------
{
  // The trap §8.8 names: a null quotation id became the string "null" and broke
  // byte-identity on the SECOND round-trip. So: twice, never once.
  const mk = () => {
    const rt = createRenderRuntime(0); const sink = newNSink();
    const child = offlineDeck({ runtime: rt, range: N_CHILD_RANGE, items: nItems(), adapters: nAdapters(sink) });
    refDeck(child, 'tape-1');
    const parent = offlineDeck({ runtime: rt, range: [0, 30000], items: [] });
    return { rt, child, parent, sink };
  };
  const src = mk();
  const n0 = offlineNest(src.parent, { runtime: src.rt });
  n0.add({ id: 'q', at: N_AT, rate: 1, deck: src.child, in: N_IN, out: N_OUT, repeat: 3 });
  const j1 = scoreToJSON(n0.toScore({ id: 's' }));
  const j2 = scoreToJSON(parseScore(j1));
  const j3 = scoreToJSON(parseScore(j2));
  check('nest-score', 0, j1 === j2 && j2 === j3,
    'a looped arrangement must round-trip byte-identically TWICE, not once (the "null" trap)');
  const r0 = renderNest(n0, { fps: 30 });

  const dst = mk();
  const nd = offlineNest(dst.parent, { runtime: dst.rt });
  loadScore(j3, () => dst.child, { nest: nd });
  const r1 = renderNest(nd, { fps: 30 });
  check('nest-score', 0, r0.traceText === r1.traceText && r0.renderHash === r1.renderHash,
    `a score loaded in a fresh runtime from BYTES ONLY must render byte-identically (${r0.renderHash} vs ${r1.renderHash})`);
  check('nest-score', 0, src.sink.fired.join(',') === dst.sink.fired.join(',') && src.sink.fired.length === 6,
    `…and the two child adapters must have heard the same 6 note fires, 3 passes x 2 (${dst.sink.fired.join(',')})`);
}

// --- N11: a FLAT render is byte-for-byte what it was before v0.7 ------------
{
  const sink = newSink();
  const items = genItems(mulberry32(777));
  const d1 = buildOffline(items, sink);
  const r1 = renderDeck(d1, { from: 0, to: SPAN, fps: 30 });
  check('nest-flat', 0, r1.nest === null && r1.renderHash === r1.traceHash,
    'a deck with no nest renders exactly as before: nest report null, renderHash === traceHash');
  check('nest-flat', 0, r1.trace.every((x) => x.s === undefined) && !/"s":/.test(r1.traceText),
    'no `s` key may appear in a flat trace — the child tag is additive, so no existing hash moved');
  d1.dispose();
  // and an explicit `nest:false` renders a NESTED parent flat (the two span
  // markers and nothing else), which is a real request and must stay possible.
  const a = nRigOffline({ repeat: 4 });
  check('nest-flat', 0, nestOf(a.parent) === a.nest && nestTree(a.nest).decks[0].deck === a.child,
    'nestOf(parent) is how the renderer FINDS a composition it was not handed, and nestTree walks it');
  const rf = renderDeck(a.parent, { from: 0, to: N_AT + 4 * N_OUT, fps: 30, nest: false });
  check('nest-flat', 0, rf.nest === null && rf.events === 2 && a.sink.fired.length === 0,
    `nest:false renders the parent's own lanes only — 2 span markers, 0 child events (${rf.events}, ${a.sink.fired.length})`);
}

// --- N12: the composition's determinism is the COMPOSITION's ----------------
{
  const rt = createRenderRuntime(0);
  const bag = [];
  const child = offlineDeck({ runtime: rt, range: [0, 2000],
    items: [{ at: 100, kind: 'live', id: 'x', payload: {} }],
    adapters: { live: { caps: { catchUp: 'drop' }, actuate: () => bag.push(Math.random()) } } });
  const parent = offlineDeck({ runtime: rt, range: [0, 8000], items: [] });
  const nest = offlineNest(parent, { runtime: rt });
  nest.add({ id: 'q', at: 0, deck: child, in: 0, out: 1000 });
  const r = renderNest(nest, { fps: 30 });
  check('nest-audit', 0, r.audit.ok === false && r.audit.suspectedNondeterministic.includes('q.live'),
    `a Math.random CHILD must make the whole render's audit dirty, named by span: ${JSON.stringify(r.audit.suspectedNondeterministic)}`);
  check('nest-audit', 0, Array.isArray(r.audit.decks) && r.audit.decks[0].label === 'q' && r.audit.rows.some((x) => x.deck === 'q'),
    'the audit must carry a per-deck breakdown, not one flattened verdict');
  let thrown = null;
  try { renderNest(nest, { fps: 30, onNondeterministic: 'throw' }); } catch (e) { thrown = e; }
  check('nest-audit', 0, thrown && thrown.code === 'RENDER_NONDETERMINISTIC_ADAPTER',
    `onNondeterministic:'throw' must be a CI gate for the COMPOSITION, not just the parent (${thrown && thrown.code})`);
  parent.dispose(); child.dispose();
}

// --- N13: nested audio — a loop repeats its AUDIO, at exact offsets ---------
{
  const { renderDeckAudio } = await import('../render.mjs');
  const mk = async () => {
    const rt = createRenderRuntime(0); const sink = newNSink();
    const child = offlineDeck({ runtime: rt, range: [-10, 3000],
      items: [{ at: 0, kind: 'note', id: 'D', payload: { v: 'D' } }], adapters: nAdapters(sink) });
    const parent = offlineDeck({ runtime: rt, range: [0, 8000], items: [] });
    const nest = offlineNest(parent, { runtime: rt });
    nest.add({ id: 'q', at: 0, rate: 1, deck: child, in: 0, out: 1000, repeat: 3 });
    const ctx = stubOffline();
    const r = await renderDeckAudio(parent, {
      fps: 30, OfflineCtor: function () { return ctx; },
      audioItems: [{ at: 250, kind: 'click', id: 'P0' }],
      childAudio: [{ span: 'q', items: [{ at: 100, kind: 'click', id: 'c0' }, { at: 500, kind: 'click', id: 'c1' }] }],
    });
    return { started: ctx.started.slice(), r };
  };
  const a = await mk(), b = await mk();
  const want = [0.1, 0.25, 0.5, 1.1, 1.5, 2.1, 2.5];
  check('nest-audio', 0, String(a.started) === String(want),
    `a LOOPED quotation's audio must appear once per repetition at EXACT offsets: want ${JSON.stringify(want)} got ${JSON.stringify(a.started)}`);
  check('nest-audio', 0, a.r.audio.children.length === 1 && a.r.audio.children[0].expanded === 6 &&
        a.r.audio.children[0].mode === 'expand',
    `the child lane is reported separately, with how many nodes the loop EXPANDED to: ${JSON.stringify(a.r.audio.children.map((c) => [c.label, c.mode, c.expanded]))}`);
  // EXPANSION IS EXACT, and that is a difference from the replay path worth
  // stating: the wrap's hair-before-`in` lead (1e-6 ms) is a property of
  // RE-SEEKING, so an expanded loop does not carry it. The event lanes still
  // do — the trace shows the lead, the samples do not.
  check('nest-audio', 0, a.started[0] === 0.1 && a.started.every((x) => Number.isFinite(x)),
    `an expanded loop lands on the score's own numbers, with no wrap lead: first click at ${a.started[0]} (exactly 0.1)`);
  check('nest-audio', 0, String(a.started) === String(b.started) && a.r.renderHash === b.r.renderHash,
    'two nested audio renders must schedule identical node times and the identical render hash');
  // DOCUMENTED LIMIT, asserted so nobody trusts the node arm too far: a STUB
  // context cannot see the bug that made this function exist. `cancelCommitted`
  // calls node.stop()/disconnect(), and the stub has already recorded the start
  // time by then — so the 'lane' mode scores 7/7 here and 1/7 in a real
  // OfflineAudioContext (measured, timeline/lab/run-render.mjs).
  const rtL = createRenderRuntime(0);
  const sinkL = newNSink();
  const childL = offlineDeck({ runtime: rtL, range: [-10, 3000],
    items: [{ at: 0, kind: 'note', id: 'D', payload: { v: 'D' } }], adapters: nAdapters(sinkL) });
  const parentL = offlineDeck({ runtime: rtL, range: [0, 8000], items: [] });
  const nestL = offlineNest(parentL, { runtime: rtL });
  nestL.add({ id: 'q', at: 0, rate: 1, deck: childL, in: 0, out: 1000, repeat: 3 });
  const ctxL = stubOffline();
  await renderDeckAudio(parentL, { fps: 30, OfflineCtor: function () { return ctxL; },
    audioItems: [{ at: 250, kind: 'click', id: 'P0' }],
    childAudio: [{ span: 'q', mode: 'lane', items: [{ at: 100, kind: 'click', id: 'c0' }, { at: 500, kind: 'click', id: 'c1' }] }] });
  check('nest-audio-blindspot', 0, ctxL.started.length === 7,
    `DOCUMENTED LIMIT: mode:'lane' schedules all 7 starts against a STUB context and renders 1/7 nonzero samples against a real one — a stub proves the SEAM, never the PCM (${ctxL.started.length} starts here)`);
}

// --- N14: a nest does not cost real time either -----------------------------
{
  // The flat arm renders 10 minutes in ~10 ms. A COMPOSITION has N+1 schedulers,
  // a servo call per frame and a committed boundary per wrap — so the question
  // "does folding a nest reintroduce real time?" has to be answered with a
  // number, not an assurance.
  const rt = createRenderRuntime(0);
  const sink = newNSink();
  const child = offlineDeck({ runtime: rt, range: [-10, 2000],
    items: Array.from({ length: 50 }, (_, i) => ({ at: i * 40, kind: 'note', id: `n${i}`, payload: { v: i } })),
    adapters: nAdapters(sink) });
  const parent = offlineDeck({ runtime: rt, range: [0, 11 * 60 * 1000], items: [] });
  const nest = offlineNest(parent, { runtime: rt });
  const PASSES = 300;                                    // 300 x 2000 ms = 10 min
  nest.add({ id: 'q', at: 0, rate: 1, deck: child, in: 0, out: 2000, repeat: PASSES });
  const t0 = Date.now();
  const r = renderNest(nest, { fps: 30 });
  const wall = Date.now() - t0;
  const span = r.to - r.from;
  check('nest-fast', 0, r.nest.wraps === PASSES - 1 && r.nest.events === PASSES * 50 && wall < 20000,
    `a 10-minute LOOPED composition: ${r.frames} frames, ${r.nest.events} child events, ${r.nest.wraps} wraps in ${wall} ms`);
  console.log(`  [nest-fast] 10 min of composition (${PASSES} passes, ${r.nest.wraps} committed wraps, ${r.frames} frames, ${r.nest.events} child events + ${r.events} parent) in ${wall} ms = ${(span / Math.max(1, wall)).toFixed(0)}x real time`);
  // …and accumulation across 299 wraps is still zero, because nothing counts
  // wraps to know where it is (§8.8's 0.000 ms/wrap, offline).
  const firstPass = r.trace.filter((x) => x.s === 'q' && x.id === 'n1').map((x) => x.i / 1000);
  const gaps = firstPass.slice(1).map((v, i) => v - firstPass[i]);
  const spread = Math.max(...gaps) - Math.min(...gaps);
  check('nest-fast', 0, spread === 0,
    `the same event in ${firstPass.length} repetitions must be exactly 2000 ms apart every time — accumulation spread ${spread} ms over ${gaps.length} wraps`);
}

if (failures) {
  console.error(`prop-render: ${failures} VIOLATION(S) in ${checks} checks`);
  process.exit(1);
}
console.log(`prop-render OK: ${checks} checks over ${NSEEDS} seeds, 0 violations`);
console.log('determinism OK: two renders are BYTE-IDENTICAL (trace text and hash) / per-frame (index, pos, state) identical / every event fires exactly once in position order / the frame grid is i*1000/fps exactly, never accumulated');
console.log('equivalence OK: the render trace === an irregularly-clocked virtual play === a REAL wall-clock main-host play, same events, same order, same count, same final state');
console.log('boundary OK: a wall-clock deck is REFUSED (RENDER_NEEDS_VIRTUAL_CLOCK) / nondeterministic adapters are declared+suspected and reported in the result / onNondeterministic:\'throw\' is a CI gate / the scan\'s closure blind spot is itself asserted / seedRandom fixes and counts Math.random and restores it');
console.log('audio OK: the SHIPPED createAudioLane renders into an OfflineAudioContext through the virtual-clock shim at exact offsets, deterministically — with the NEGATIVE CONTROL proving a bare OfflineAudioContext collapses every node into the first 200 ms');
console.log('NEST OK: renderDeck folds a nest — fragment quotation clamps and a loop takes the modulo, exactly, at every frame; two renders of one composition are byte-identical in the trace AND in the wrap set (which stays OUT of the log, rule 10c); a nested render fires the same events in the same order with the same final state as REAL wall-clock playback of the same arrangement and as an irregularly-clocked one; the wrap is the same committed one-shot playback uses, and the POLLED arm is the negative control — same wrap count, DIFFERENT event set (material past `out` leaks), reproducible and reported; servo:false renders identically and the servo corrects ZERO times; repeat:\'infinite\' routes through renderBound() to LOOP_UNBOUNDED; a caps.rates lattice refusal is reported and never overridden; caps.loopState carry/rearm and adapter.loopWrap() behave identically offline; a CHILD on a wall clock is refused by name; exactly-once holds two levels deep; a score round-tripped TWICE renders identically from bytes alone; and a flat render\'s trace bytes did not move');
