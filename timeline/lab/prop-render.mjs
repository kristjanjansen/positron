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
import { createDeck, createTransport, createScheduler, createVirtualRuntime,
         createAudioLane, mainTickHost } from '../transport.mjs';
import { createRenderRuntime, offlineDeck, renderDeck, offlineAudioTarget,
         auditAdapters, hashText } from '../render.mjs';

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

if (failures) {
  console.error(`prop-render: ${failures} VIOLATION(S) in ${checks} checks`);
  process.exit(1);
}
console.log(`prop-render OK: ${checks} checks over ${NSEEDS} seeds, 0 violations`);
console.log('determinism OK: two renders are BYTE-IDENTICAL (trace text and hash) / per-frame (index, pos, state) identical / every event fires exactly once in position order / the frame grid is i*1000/fps exactly, never accumulated');
console.log('equivalence OK: the render trace === an irregularly-clocked virtual play === a REAL wall-clock main-host play, same events, same order, same count, same final state');
console.log('boundary OK: a wall-clock deck is REFUSED (RENDER_NEEDS_VIRTUAL_CLOCK) / nondeterministic adapters are declared+suspected and reported in the result / onNondeterministic:\'throw\' is a CI gate / the scan\'s closure blind spot is itself asserted / seedRandom fixes and counts Math.random and restores it');
console.log('audio OK: the SHIPPED createAudioLane renders into an OfflineAudioContext through the virtual-clock shim at exact offsets, deterministically — with the NEGATIVE CONTROL proving a bare OfflineAudioContext collapses every node into the first 200 ms');
