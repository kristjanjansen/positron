// Offline render: a frame-stepping driver over the same engine on a virtual clock (no wall clock).
// renderDeck twice gives a byte-identical event trace with playback's events (lab/prop-render.mjs).
// Adapters touching devices, I/O, randomness or clocks are audited, not fixed. Nests fold.
// why: lessons/timeline-render.md#header

import { createDeck, createAudioLane } from './transport.mjs';
import { createNest, nestOf } from './nested.mjs';

// One deterministic clock, many tick hosts (createVirtualRuntime's single host overwrites). Time
// moves
// only via advanceTo(); timers fire in (time, id) order with the clock set to their due moment.
// why: lessons/timeline-render.md#runtime

export function createRenderRuntime(startMs = 0) {
  let t = startMs, seq = 0;
  const timers = [];   // {due, id, fn}
  const hosts = [];    // {id, cb, tickMs, next}
  let fires = 0, ticks = 0;

  const clock = { domain: 'virtual', now: () => t };

  function newHost(name = 'render') {
    const h = { id: ++seq, name, cb: null, tickMs: 25, next: Infinity };
    hosts.push(h);
    return {
      name: 'virtual',
      start(cb, ms) { h.cb = cb; h.tickMs = ms > 0 ? ms : 25; h.next = t; },
      stop() { h.cb = null; h.next = Infinity; },
      setTimer(delayMs, fn) {
        const id = ++seq;
        timers.push({ due: t + Math.max(0, delayMs), id, fn });
        return () => { const i = timers.findIndex((x) => x.id === id); if (i >= 0) timers.splice(i, 1); };
      },
    };
  }

  /** Run time forward to `target`, firing everything due, in order, once. */
  function advanceTo(target) {
    if (!(target >= t)) { t = target; return; }   // a render never runs backwards
    for (;;) {
      let bi = -1;
      for (let i = 0; i < timers.length; i++) {
        const x = timers[i];
        if (x.due > target) continue;
        if (bi < 0 || x.due < timers[bi].due || (x.due === timers[bi].due && x.id < timers[bi].id)) bi = i;
      }
      const timerDue = bi >= 0 ? timers[bi].due : Infinity;
      let hi = -1;
      for (let i = 0; i < hosts.length; i++) {
        const h = hosts[i];
        if (!h.cb || h.next > target) continue;
        if (hi < 0 || h.next < hosts[hi].next || (h.next === hosts[hi].next && h.id < hosts[hi].id)) hi = i;
      }
      const tickDue = hi >= 0 ? hosts[hi].next : Infinity;
      if (timerDue === Infinity && tickDue === Infinity) break;
      if (timerDue <= tickDue) {
        const tm = timers.splice(bi, 1)[0];
        t = tm.due; fires++; tm.fn();
      } else {
        const h = hosts[hi];
        t = h.next; h.next = h.next + h.tickMs; ticks++;
        h.cb && h.cb();
      }
    }
    t = target;
  }

  return {
    clock, newHost, advanceTo,
    /** drop-in for createVirtualRuntime's single `host` */
    host: newHost('default'),
    now: () => t,
    stats: () => ({ now: t, hosts: hosts.length, armed: timers.length, timerFires: fires, ticks }),
  };
}

// createDeck with deterministic seams wired, carrying its runtime; `{runtime}` shares one clock
// (nests).
// why: lessons/timeline-render.md#offline-deck
export function offlineDeck(spec = {}) {
  const runtime = spec.runtime || createRenderRuntime(spec.startMs ?? 0);
  const { runtime: _r, startMs: _s, ...rest } = spec;
  const deck = createDeck({ ...rest, clock: runtime.clock, tickHost: runtime.newHost('deck') });
  deck.renderRuntime = runtime;
  return deck;
}

// A nest whose wrap boundary is committed on the render runtime: the offline twin of a worker host.
// why: lessons/timeline-render.md#offline-nest
export function offlineNest(parent, opts = {}) {
  const runtime = opts.runtime || parent.renderRuntime;
  if (!runtime || typeof runtime.newHost !== 'function') {
    const e = new Error('offlineNest: the parent deck carries no render runtime — build it with offlineDeck({…}), or pass {runtime}.');
    e.code = 'RENDER_NEEDS_VIRTUAL_CLOCK';
    throw e;
  }
  const { runtime: _r, ...rest } = opts;
  return createNest(parent, { ...rest, tickHost: opts.tickHost || runtime.newHost('nest') });
}

// Walk a nest depth-first in insertion order: nests (servo order), spans, decks (one per deck,
// labelled by the first span to reach it).
// why: lessons/timeline-render.md#nest-tree
export function nestTree(root) {
  const nests = [], spans = [], decks = [], byDeck = new Map(), seen = new Set();
  const visit = (n, path, depth) => {
    if (!n || seen.has(n) || depth > 32) return;
    seen.add(n);
    nests.push({ nest: n, path, depth });
    for (const sp of n.spans()) {
      const spanPath = path ? `${path}/${sp.id}` : sp.id;
      spans.push({ path: spanPath, id: sp.id, sp, nest: n, depth });
      let d = byDeck.get(sp.deck);
      if (!d) { d = { deck: sp.deck, label: spanPath, spans: [] }; byDeck.set(sp.deck, d); decks.push(d); }
      d.spans.push(spanPath);
      visit(nestOf(sp.deck), spanPath, depth + 1);
    }
  };
  visit(root, '', 0);
  return { nests, spans, decks, depth: nests.reduce((m, x) => Math.max(m, x.depth), 0) + 1 };
}

// ---------------------------------------------------------------------------
// The nondeterminism audit.
// ---------------------------------------------------------------------------

const SUSPECTS = [
  [/\bMath\s*\.\s*random\s*\(/, 'Math.random()', 'unseeded randomness (pass seedRandom to make it reproducible)'],
  [/\bcrypto\s*\.\s*(getRandomValues|randomUUID)\s*\(/, 'crypto random', 'unseeded randomness that cannot be seeded'],
  [/\bDate\s*\.\s*now\s*\(/, 'Date.now()', 'a wall clock'],
  [/\bnew\s+Date\s*\(\s*\)/, 'new Date()', 'a wall clock'],
  [/\bperformance\s*\.\s*now\s*\(/, 'performance.now()', 'a wall clock'],
  [/\bhrtime\b/, 'process.hrtime', 'a wall clock'],
  [/\brequestAnimationFrame\s*\(/, 'requestAnimationFrame()', 'a display clock that does not exist offline'],
  [/\brequestVideoFrameCallback\s*\(/, 'requestVideoFrameCallback()', 'a compositor clock that does not exist offline'],
  [/\bsetTimeout\s*\(|\bsetInterval\s*\(/, 'setTimeout/setInterval', 'a wall-clock timer outside the runtime'],
  [/\.\s*currentTime\b/, '.currentTime', 'a real media/audio device clock'],
  [/\bgetOutputTimestamp\s*\(/, 'getOutputTimestamp()', 'audio hardware'],
  [/\bfetch\s*\(/, 'fetch()', 'the network'],
  [/\bXMLHttpRequest\b/, 'XMLHttpRequest', 'the network'],
  [/\bWebSocket\b/, 'WebSocket', 'the network'],
  [/\bindexedDB\b|\blocalStorage\b/, 'storage', 'ambient state outside the deck'],
  [/\bnavigator\s*\./, 'navigator.*', 'the host environment'],
  [/\brequestMIDIAccess\b|\bMIDIOutput\b/, 'Web MIDI', 'a real device'],
  [/\bgetUserMedia\b/, 'getUserMedia', 'a real device'],
];
const AUDITED_FNS = ['actuate', 'reduce', 'assertState', 'interpolate', 'transport'];

// Audit every adapter: `declared` (caps.deterministic) and `suspected` (a source scan that cannot
// see through closures).
// why: lessons/timeline-render.md#audit
export function auditAdapters(deck) {
  const caps = deck.caps ? deck.caps() : {};
  const rows = [];
  for (const kind of Object.keys(caps)) {
    const ad = deck.adapters && deck.adapters[kind];
    const c = caps[kind] || {};
    const declared = c.deterministic === true ? 'deterministic'
      : c.deterministic === false ? 'nondeterministic' : 'undeclared';
    const hits = [];
    if (ad) {
      for (const fname of AUDITED_FNS) {
        const fn = ad[fname];
        if (typeof fn !== 'function') continue;
        let src = '';
        try { src = Function.prototype.toString.call(fn); } catch { src = ''; }
        if (/\[native code\]/.test(src)) { hits.push({ fn: fname, what: 'native/bound function', why: 'source not readable — the scan cannot see it' }); continue; }
        for (const [re, what, why] of SUSPECTS) if (re.test(src)) hits.push({ fn: fname, what, why });
      }
    }
    rows.push({ kind, declared, suspected: hits, clean: declared !== 'nondeterministic' && hits.length === 0 });
  }
  const bad = rows.filter((r) => r.declared === 'nondeterministic');
  const suspect = rows.filter((r) => r.declared !== 'nondeterministic' && r.suspected.length);
  return {
    kinds: rows.length, rows,
    declaredNondeterministic: bad.map((r) => r.kind),
    suspectedNondeterministic: suspect.map((r) => r.kind),
    undeclared: rows.filter((r) => r.declared === 'undeclared').map((r) => r.kind),
    ok: bad.length === 0 && suspect.length === 0,
    note: 'declared = the adapter\'s own caps.deterministic; suspected = a source-text scan and therefore a HEURISTIC — it cannot see through closures, imported helpers, bound natives or dynamic property reads. A clean scan is not a proof.',
  };
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

// FNV-1a 64 over a string; the real assert is string equality of the trace.
// why: lessons/timeline-render.md#hash-text
export function hashText(s) {
  let h1 = 0x811c9dc5, h2 = 0xcbf29ce4;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 ^= c; h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= c + i; h2 = Math.imul(h2, 0x01000193) >>> 0;
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

// Hash the PCM of a rendered AudioBuffer.
// why: lessons/timeline-render.md#hash-audio
export function hashAudioBuffer(buf) {
  let h1 = 0x811c9dc5, h2 = 0xcbf29ce4, nonzero = 0, peak = 0, sum = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    const bytes = new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
    for (let i = 0; i < bytes.length; i++) {
      h1 ^= bytes[i]; h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 ^= bytes[i] + (i & 0xff); h2 = Math.imul(h2, 0x01000193) >>> 0;
    }
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i]);
      if (a > 0) nonzero++;
      if (a > peak) peak = a;
      sum += a;
    }
  }
  return {
    hash: (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0'),
    channels: buf.numberOfChannels, length: buf.length, sampleRate: buf.sampleRate,
    nonzero, peak: +peak.toFixed(6), rmsish: +(sum / (buf.length * buf.numberOfChannels)).toFixed(9),
  };
}

// renderDeck: the frame-stepping driver.
// why: lessons/timeline-render.md#render-deck-banner

// renderDeck(deck, { from, to, fps=30, rate=1, onFrame, stateKinds, trace, seedRandom,
// onNondeterministic, startPos, nest, servo }) -> { traceText, traceHash, audit, ... }. A deck on a
// wall clock is refused; with a nest the window defaults to nest.renderBound().
// why: lessons/timeline-render.md#render-deck
export function renderDeck(deck, {
  from, to, fps = 30, rate = 1,
  onFrame, stateKinds = [], trace = true,
  seedRandom = null, onNondeterministic = 'report',
  runtime: runtimeOpt, startPos, pauseAtEnd = true,
  nest: nestOpt, servo = true,
} = {}) {
  const runtime = runtimeOpt || deck.renderRuntime;
  if (!runtime || typeof runtime.advanceTo !== 'function') {
    const e = new Error(
      'renderDeck: no render runtime. An offline render has NO WALL CLOCK by construction — ' +
      'build the deck with offlineDeck({…}) (or createDeck({clock: rt.clock, tickHost: rt.newHost()}) ' +
      'from createRenderRuntime()) and pass {runtime} if the deck does not carry it.');
    e.code = 'RENDER_NEEDS_VIRTUAL_CLOCK';
    throw e;
  }
  if (deck.transport.clock !== runtime.clock) {
    const e = new Error(
      `renderDeck: this deck is on a '${deck.transport.clock.domain}' clock, not the render runtime's. ` +
      'Rendering it would read a wall clock and the result would differ across machines — which is the ' +
      'one thing this mode exists to prevent.');
    e.code = 'RENDER_NEEDS_VIRTUAL_CLOCK';
    throw e;
  }
  // Resolve the nest first: on a nested deck the window comes from renderBound().
  // why: lessons/timeline-render.md#nest-first
  const nest = nestOpt === false || nestOpt === null ? null : (nestOpt || nestOf(deck));
  const tree = nest ? nestTree(nest) : { nests: [], spans: [], decks: [], depth: 0 };
  const notes = [];
  if (nest && (from === undefined || to === undefined)) {
    // renderBound() throws LOOP_UNBOUNDED and names the spans. Routing through
    // it (rather than writing a second refusal here) is deliberate: the nest is
    // the only thing that knows a `to` was invented.
    const b = nest.renderBound();
    if (from === undefined) from = b.from;
    if (to === undefined) to = b.to;
    notes.push(`window derived from nest.renderBound(): [${from}, ${to}] over ${b.spans} span(s)`);
  }
  if (!Number.isFinite(from) || !Number.isFinite(to) || !(to >= from))
    throw new Error(`renderDeck needs finite {from, to} with to >= from (got ${from}, ${to})`);
  if (!(fps > 0)) throw new Error(`renderDeck needs fps > 0 (got ${fps})`);
  if (!(rate > 0)) throw new Error(`renderDeck needs rate > 0 (got ${rate})`);

  // Every deck in the composition must be on the render's clock, refused by name otherwise.
  // why: lessons/timeline-render.md#child-clocks
  for (const d of tree.decks) {
    if (d.deck.transport.clock !== runtime.clock) {
      const e = new Error(
        `renderDeck: nested deck '${d.label}' is on a '${d.deck.transport.clock.domain}' clock, not the render ` +
        'runtime\'s. A composition renders only if EVERY deck in it rides the same virtual clock — build the ' +
        'children with offlineDeck({runtime: parent.renderRuntime}) (or createDeck({clock: rt.clock, tickHost: rt.newHost()})).');
      e.code = 'RENDER_NEEDS_VIRTUAL_CLOCK'; e.span = d.label;
      throw e;
    }
  }

  const audit = auditAdapters(deck);
  if (tree.decks.length) {
    // The composition's adapters are the composition's determinism. A clean
    // parent over a Math.random child is not a clean render.
    audit.decks = tree.decks.map((d) => ({ label: d.label, spans: d.spans.slice(), ...auditAdapters(d.deck) }));
    for (const a of audit.decks) {
      audit.kinds += a.kinds;
      for (const r of a.rows) audit.rows.push({ ...r, deck: a.label });
      for (const k of a.declaredNondeterministic) audit.declaredNondeterministic.push(`${a.label}.${k}`);
      for (const k of a.suspectedNondeterministic) audit.suspectedNondeterministic.push(`${a.label}.${k}`);
      for (const k of a.undeclared) audit.undeclared.push(`${a.label}.${k}`);
      audit.ok = audit.ok && a.ok;
    }
  }
  if (onNondeterministic === 'throw' && !audit.ok) {
    const e = new Error(
      `renderDeck: ${audit.declaredNondeterministic.length} adapter(s) declared nondeterministic ` +
      `[${audit.declaredNondeterministic}] and ${audit.suspectedNondeterministic.length} suspected ` +
      `[${audit.suspectedNondeterministic}]. A render containing one of these is not reproducible; ` +
      'fix the adapter, declare caps.deterministic: true, or pass onNondeterministic: \'report\'.');
    e.code = 'RENDER_NONDETERMINISTIC_ADAPTER'; e.audit = audit;
    throw e;
  }

  // --- the position -> wall map. `from + i*1000/fps` is computed from the
  // integer i EVERY TIME, never accumulated, so there is no float drift and
  // frame i is the same number on the first render and the thousandth.
  const frameMs = 1000 / fps;
  const nFrames = Math.max(0, Math.round((to - from) * fps / 1000)) + 1;
  const posOf = (i) => from + (i * 1000) / fps;

  // --- range: a render names its own window; if the deck's is narrower, say so
  if (Array.isArray(deck.range) && typeof deck.setRange === 'function') {
    const [lo, hi] = deck.range;
    if (from < lo || to > hi) {
      notes.push(`render window [${from}, ${to}] is outside the deck range [${lo}, ${hi}] — the range was widened for the render (deck.setRange)`);
      deck.setRange([Math.min(lo, from), Math.max(hi, to)]);
    }
  }

  const rows = [];
  const byKind = new Map();
  let fired = 0, reduces = 0;
  const offFire = deck.sched.onFire((ev, rec) => {
    fired++;
    byKind.set(ev.kind, (byKind.get(ev.kind) || 0) + 1);
    if (trace) rows.push({
      f: null, k: ev.kind, id: ev.id, at: ev.at,
      o: rec.origin, i: rec.intendedUs, d: rec.deltaMs,
    });
  });
  const offPolicy = deck.sched.onPolicy((p) => {
    reduces++;
    if (trace) rows.push({ f: null, k: p.kind, id: `#${p.policy}`, at: p.pos, o: p.reason, i: p.nowUs, d: p.count });
  });

  // One listener per child deck, tagged `s:<label>`; parent rows keep their shape so flat hashes
  // hold.
  // why: lessons/timeline-render.md#child-lanes
  const childOffs = [];
  const childByKind = new Map();
  const childByDeck = new Map();
  let childFired = 0, childReduces = 0;
  for (const d of tree.decks) {
    childByDeck.set(d.label, 0);
    childOffs.push(d.deck.sched.onFire((ev, rec) => {
      childFired++;
      childByDeck.set(d.label, childByDeck.get(d.label) + 1);
      const key = `${d.label}.${ev.kind}`;
      childByKind.set(key, (childByKind.get(key) || 0) + 1);
      if (trace) rows.push({
        f: null, s: d.label, k: ev.kind, id: ev.id, at: ev.at,
        o: rec.origin, i: rec.intendedUs, d: rec.deltaMs,
      });
    }));
    childOffs.push(d.deck.sched.onPolicy((p) => {
      childReduces++;
      if (trace) rows.push({ f: null, s: d.label, k: p.kind, id: `#${p.policy}`, at: p.pos, o: p.reason, i: p.nowUs, d: p.count });
    }));
  }

  // Wraps get their own bounded list and hash, never trace rows.
  // why: lessons/timeline-render.md#wraps
  const wrapRows = [];
  const offWraps = tree.nests.map(({ nest: n, path }) =>
    n.onWrap((info) => wrapRows.push({
      f: null, n: path, sp: info.span, from: info.from, to: info.to,
      r: info.reason, pp: +info.parentPos.toFixed(6), cp: +info.childPos.toFixed(9),
      h: info.heard.join('|'),
    })));

  // --- seeded randomness, only when asked. A global swap is a side effect and
  // is therefore opt-in, always restored, and always counted.
  const realRandom = Math.random;
  let randomCalls = 0;
  if (seedRandom !== null && seedRandom !== undefined) {
    const rnd = mulberry32(seedRandom);
    Math.random = () => { randomCalls++; return rnd(); };
  }

  const t0 = runtime.now();
  let frames = 0, tagged = 0, wrapTagged = 0, servoCalls = 0, servoCorrections = 0;
  try {
    deck.sched.start();
    for (const d of tree.decks) d.deck.sched.start();
    deck.transport.seek(startPos === undefined ? from : startPos);
    deck.transport.play(rate);
    for (let i = 0; i < nFrames; i++) {
      // One advance per frame; a committed wrap lands at its instant and the next pass commits in
      // it.
      // why: lessons/timeline-render.md#advance
      runtime.advanceTo(t0 + (i * 1000) / fps / rate);
      // The frame loop is the servo's client loop: outermost nest first.
      // why: lessons/timeline-render.md#servo
      if (servo) for (const { nest: n } of tree.nests) { servoCalls++; servoCorrections += n.servo() || 0; }
      const pos = posOf(i);
      while (tagged < rows.length) rows[tagged++].f = i;   // stamp this frame's fires
      while (wrapTagged < wrapRows.length) wrapRows[wrapTagged++].f = i;
      frames++;
      if (onFrame) {
        const state = {};
        for (const k of stateKinds) state[k] = deck.reduceAt(k, pos);
        state.get = (k, o) => deck.reduceAt(k, pos, o);
        // Where each child is, read from the nest's position map.
        // why: lessons/timeline-render.md#children
        const children = tree.spans.map(({ path, id, sp, nest: n }) => ({
          path, id, deck: sp.deck, pos: n.childPos(id),
          iter: n.iteration(id), present: n.present(id),
        }));
        onFrame({ frameIndex: i, pos, state, timeUs: Math.round(runtime.now() * 1000), deck, fps, frameMs, children, nest });
      }
    }
    // `pauseAtEnd: false` for offline audio: pausing cancels every committed node before
    // startRendering() reads it (measured: 7 nodes, 0 nonzero samples).
    // why: lessons/timeline-render.md#pause-at-end
    if (pauseAtEnd) deck.transport.pause();
  } finally {
    if (seedRandom !== null && seedRandom !== undefined) Math.random = realRandom;
    offFire(); offPolicy();
    for (const off of childOffs) off();
    for (const off of offWraps) off();
    deck.sched.stop();
    for (const d of tree.decks) d.deck.sched.stop();
  }

  const traceText = trace ? rows.map((r) => JSON.stringify(r)).join('\n') : '';
  const nestReport = nest ? buildNestReport(nest, tree, {
    wrapRows, childFired, childReduces, childByKind, childByDeck,
    servoCalls, servoCorrections, servo, from, to, notes,
  }) : null;
  return {
    frames, fps, frameMs: +frameMs.toFixed(9), from, to, rate,
    nFrames, events: fired, reduces,
    byKind: Object.fromEntries([...byKind].sort((a, b) => (a[0] < b[0] ? -1 : 1))),
    trace: rows, traceText, traceHash: hashText(traceText),
    audit, notes, nest: nestReport,
    /** the whole render's identity: the event trace AND the wrap set. Equal to
     *  `traceHash` when there is no nest, so a flat render's number is
     *  unchanged. */
    renderHash: nestReport ? hashText(`${traceText}\n--wraps--\n${nestReport.wrapsText}`) : hashText(traceText),
    random: seedRandom !== null && seedRandom !== undefined
      ? { seeded: true, seed: seedRandom, calls: randomCalls }
      : { seeded: false, calls: null,
          note: 'Math.random was NOT replaced. If an adapter draws from it, this render is not reproducible — pass seedRandom.' },
    runtime: runtime.stats(),
    endPos: +deck.position().toFixed(6),
  };
}

// Everything the composition layer did, reported after the render.
// why: lessons/timeline-render.md#nest-report
function buildNestReport(nest, tree, x) {
  const rates = [], loops = [], polled = [], degradedRates = [], unbounded = [];
  for (const { path, id, sp, nest: n } of tree.spans) {
    const rr = n.rateReport(id);
    rates.push({ span: path, wanted: rr && rr.wanted, chose: rr && rr.chose,
      degraded: !!(rr && rr.degraded), allowed: rr && rr.allowed, reason: (rr && rr.reason) || null,
      corrections: sp.childCorrections.length, hardSeeks: sp.hardSeeks,
      enters: sp.enters, exits: sp.exits });
    if (rr && rr.degraded) degradedRates.push(path);
    if (sp.unbounded) unbounded.push(path);
    const lp = n.loop(id);
    if (lp && lp.loop) {
      loops.push({ span: path, repeat: lp.repeat, iterations: lp.iterations, lengthMs: lp.lengthMs,
        onePassParentMs: lp.onePassParentMs, wraps: lp.wraps, iter: lp.iter,
        boundary: lp.boundary, leadClamped: lp.leadClamped, partialLast: lp.partialLast,
        lanes: lp.lanes ? { carry: lp.lanes.carry, rearm: lp.lanes.rearm } : null,
        degradations: lp.degradations, errors: lp.errors, joint: lp.joint });
      if (lp.boundary !== 'lookahead') polled.push(path);
    }
  }
  const byReason = {};
  for (const w of x.wrapRows) byReason[w.r] = (byReason[w.r] || 0) + 1;
  if (polled.length) x.notes.push(
    `LOOP BOUNDARY POLLED on span(s) [${polled.join(', ')}] — this nest was built without a tickHost, so the wrap ` +
    'is discovered by servo() at a FRAME boundary instead of being committed at the instant. The render is still ' +
    'reproducible, but it is not the event set playback produces: use offlineNest(parent) (or ' +
    'createNest(parent, {tickHost: runtime.newHost()})).');
  if (x.servo === false) x.notes.push('servo:false — the composition ran on the committed boundary alone, with no backstop.');
  if (degradedRates.length) x.notes.push(
    `RATE DEGRADED on span(s) [${degradedRates.join(', ')}] — a child adapter's caps.rates lattice refused the ` +
    'composed rate and the nest chose the nearest point on it. The render is of what CAN be played, not of what ' +
    'the score asked for; see r.nest.rates[].');
  if (unbounded.length) x.notes.push(
    `span(s) [${unbounded.join(', ')}] carry repeat:'infinite' and were bounded by the RENDER WINDOW ` +
    `[${x.from}, ${x.to}], not by the score.`);
  const wrapsText = x.wrapRows.map((w) => JSON.stringify(w)).join('\n');
  return {
    kind: nest.kind, nests: tree.nests.length, spans: tree.spans.length,
    decks: tree.decks.map((d) => ({ label: d.label, spans: d.spans.slice(), events: x.childByDeck.get(d.label) })),
    depth: tree.depth,
    events: x.childFired, reduces: x.childReduces,
    byKind: Object.fromEntries([...x.childByKind].sort((a, b) => (a[0] < b[0] ? -1 : 1))),
    rates, loops, degradedRates, unbounded, polled,
    servo: { called: x.servo !== false, calls: x.servoCalls, corrections: x.servoCorrections },
    wraps: x.wrapRows.length, wrapsByReason: byReason, wrapRows: x.wrapRows,
    wrapsText, wrapsHash: hashText(wrapsText),
  };
}

/** `renderDeck` from the nest's side: derive the window from the score and
 *  render the composition. Throws LOOP_UNBOUNDED on an infinite loop. */
export function renderNest(nest, opts = {}) {
  if (!nest || typeof nest.spans !== 'function' || !nest.parent)
    throw new Error('renderNest(nest, opts): needs a nest from createNest()/offlineNest()');
  return renderDeck(nest.parent, { ...opts, nest });
}

// ---------------------------------------------------------------------------
// The audio half.
// ---------------------------------------------------------------------------

// An OfflineAudioContext whose currentTime rides the virtual clock (a bare one stays 0, so every
// node lands a horizon in). A Proxy with bound methods, since natives throw on foreign receivers.
// why: lessons/timeline-render.md#audio-target
export function offlineAudioTarget(ctx, runtime, { startMs } = {}) {
  const t0 = startMs === undefined ? runtime.now() : startMs;
  return new Proxy(ctx, {
    get(target, prop) {
      if (prop === 'currentTime') return (runtime.now() - t0) / 1000;
      if (prop === '__realContext') return target;
      if (prop === '__renderT0') return t0;
      const v = Reflect.get(target, prop);
      return typeof v === 'function' ? v.bind(target) : v;
    },
    set(target, prop, value) { Reflect.set(target, prop, value); return true; },
  });
}

// renderDeckAudio(deck, { from, to, fps, audioItems, childAudio, ... }) -> r.audio.hash. Browser
// only. The shipped createAudioLane, unmodified; child lanes share one context and clock. One
// document per render: Web Audio does not exist in workers.
// why: lessons/timeline-render.md#render-audio
export async function renderDeckAudio(deck, {
  from, to, fps = 30, rate = 1,
  audioItems = [], makeNode = null, clickGain = 1.0,
  childAudio = [],
  sampleRate = 48000, channels = 1,
  OfflineCtor = (typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : null),
  tickMs = 25, horizonMs = 100,
  ...renderOpts
} = {}) {
  if (!OfflineCtor) throw new Error('renderDeckAudio needs an OfflineAudioContext (browser) — pass {OfflineCtor}');
  const runtime = renderOpts.runtime || deck.renderRuntime;
  if (!runtime) throw new Error('renderDeckAudio: no render runtime (use offlineDeck)');

  // The window is resolved here, since an OfflineAudioContext's length is fixed at construction.
  // why: lessons/timeline-render.md#nest-window
  const nest = renderOpts.nest === false || renderOpts.nest === null
    ? null : (renderOpts.nest || nestOf(deck));
  if (nest && (from === undefined || to === undefined)) {
    const b = nest.renderBound();
    if (from === undefined) from = b.from;
    if (to === undefined) to = b.to;
  }
  const lengthSamples = Math.max(1, Math.round(((to - from) / 1000 / rate) * sampleRate));
  const ctx = new OfflineCtor(channels, lengthSamples, sampleRate);
  const target = offlineAudioTarget(ctx, runtime, { startMs: runtime.now() });
  const lane = createAudioLane(deck.transport, target, {
    tickMs, horizonMs, host: runtime.newHost('audio'), makeNode, clickGain,
  });
  lane.bus.connect(ctx.destination);
  for (const it of audioItems) lane.schedule(it);
  lane.start();

  // --- child lanes: one per named span, on the SAME context and clock.
  const tree = nest ? nestTree(nest) : { spans: [], decks: [] };
  const childLanes = [];
  for (const spec of childAudio) {
    const row = tree.spans.find((s) => s.path === spec.span || s.id === spec.span);
    if (!row) throw new Error(
      `renderDeckAudio: childAudio names span '${spec.span}' and the nest has no such span ` +
      `(have: ${tree.spans.map((s) => s.path).join(', ') || 'none'})`);
    const label = row.path;
    const mode = spec.mode || 'expand';
    // 'lane' binds to the child's transport, the obvious design and wrong offline (see
    // expandSpanTimes).
    // why: lessons/timeline-render.md#lane-mode
    const boundTo = mode === 'lane' ? row.sp.deck.transport : deck.transport;
    const l = createAudioLane(boundTo, target, {
      tickMs: spec.tickMs ?? tickMs, horizonMs: spec.horizonMs ?? horizonMs,
      host: runtime.newHost(`audio:${label}`),
      makeNode: spec.makeNode ?? makeNode, clickGain: spec.clickGain ?? clickGain,
    });
    l.bus.connect(ctx.destination);
    let n = 0;
    for (const it of (spec.items || [])) {
      if (mode === 'lane') { l.schedule(it); n++; continue; }
      const ts = expandSpanTimes(tree, row.path, it.at);
      for (let k = 0; k < ts.length; k++) { l.schedule({ ...it, at: ts[k], id: `${it.id ?? 'a'}#${k}` }); n++; }
    }
    l.start();
    childLanes.push({ label, lane: l, deck: row.sp.deck, mode, scheduledCount: n });
  }

  let r;
  try {
    // pauseAtEnd: false, so nothing cancels the committed nodes before rendering.
    // why: lessons/timeline-render.md#no-pause
    r = renderDeck(deck, { from, to, fps, rate, ...renderOpts, nest: nest || false, pauseAtEnd: false });
  } catch (e) {
    lane.stop(); for (const c of childLanes) c.lane.stop();
    deck.transport.pause();
    throw e;
  }
  const buffer = await ctx.startRendering();
  deck.transport.pause();
  lane.stop();
  for (const c of childLanes) { c.lane.stop(); c.deck.transport.pause(); }
  const audio = hashAudioBuffer(buffer);
  return {
    ...r,
    audio: { ...audio, scheduled: lane.scheduled(), laneStats: lane.stats(), anchor: lane.anchorInfo(),
      children: childLanes.map((c) => ({ label: c.label, mode: c.mode, scheduled: c.lane.scheduled(),
        expanded: c.scheduledCount, laneStats: c.lane.stats() })) },
    buffer,
  };
}

// Offline a loop is expanded, not replayed: each child audio item is mapped to parent time once per
// repetition via nest.parentPos() and scheduled on the root transport, since a child seek cancels
// its own nodes (measured 1 of 7). `mode: 'lane'` keeps the broken path as a negative control.
// why: lessons/timeline-render.md#expand
function expandSpanTimes(tree, path, childAt) {
  const row = tree.spans.find((s) => s.path === path);
  if (!row) return [];
  const sp = row.sp, n = row.nest;
  // outside the quotation is not part of the quotation, at any depth
  if (!(childAt >= sp.c0 - 1e-9 && childAt < sp.c1 + 1e-9)) return [];
  const iters = Number.isFinite(sp.iterations) ? sp.iterations : 1;
  const parentPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : null;
  const out = [];
  for (let k = 0; k < iters; k++) {
    const pt = n.parentPos(row.id, childAt, k);
    if (pt === null || !Number.isFinite(pt)) continue;
    if (pt < sp.at - 1e-9 || pt > sp.at + sp.parentDur + 1e-9) continue;   // {untilMs} may CUT the last pass
    if (parentPath === null) out.push(pt);
    else out.push(...expandSpanTimes(tree, parentPath, pt));
  }
  return out.sort((a, b) => a - b);
}
