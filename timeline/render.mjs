// timeline/render.mjs — OFFLINE RENDER: the second driver over the one engine.
// v0.6. Plain ESM, no deps. Node and browser (the audio half needs an
// OfflineAudioContext, so that part is browser-only).
//
// ===========================================================================
// THE DOCTRINE, and it is not ours — it is Remotion's `/docs/flickering`, the
// most explicit statement of it in the whole browser-A/V survey:
//
//     render workers are independent parallel tabs with NO SHARED WALL CLOCK
//   ⇒ "There is no real timing synchronization and results will differ across
//      machines"
//   ⇒ therefore the render has NO WALL CLOCK AT ALL.
//
// Motion Canvas ships the same split as a second driver over one core
// (`Player` rAF-gated vs `Renderer` "does not use an update loop… plays through
// the animation as fast as it can"); Elementary ships
// `@elemaudio/offline-renderer`; `OfflineAudioContext` is the standardised
// audio half ("renders as quickly as possible… fulfilling the returned promise
// with the rendered result as an AudioBuffer").
//
// WE GOT THE SEAMS FOR FREE AND HAD NEVER USED THEM:
//   · `createVirtualRuntime()` in transport.mjs is already a deterministic
//     ClockSource + TickHost — it is the CI gate for the C2 property test;
//   · the audio lane takes its AudioContext BY ARGUMENT;
//   · the tick host is pluggable per deck.
// So this file is not a second engine. It is a frame-stepping DRIVER plus the
// two things the seams did not already provide:
//   (1) a virtual runtime that can host MANY tick hosts on one clock (the
//       scheduler's and the audio lane's), which `createVirtualRuntime` cannot
//       — its single host's `start()` overwrites the previous callback;
//   (2) an `OfflineAudioContext` whose `currentTime` RIDES THE VIRTUAL CLOCK,
//       because a bare OfflineAudioContext's `currentTime` is pinned at 0 until
//       `startRendering()` and the audio lane's anchor would collapse onto it.
//       That is a real finding: "the audio lane takes a context by argument so
//       OfflineAudioContext drops in" is TRUE ONLY THROUGH THIS SHIM.
//
// TWO LIMITS OF THE AUDIO HALF, both verified rather than assumed:
//
//   (a) `OfflineAudioContext` CARRIES NO DETERMINISM GUARANTEE. The spec says it
//       "renders as quickly as possible… fulfilling the returned promise with
//       the rendered result as an AudioBuffer" and says NOTHING about
//       bit-exactness. So the event trace is the contract this file guarantees
//       (it is our arithmetic on our virtual clock); audio PCM equality is
//       something to MEASURE. Measured here: identical hashes twice in-process
//       AND across two separate browser processes, for a one-sample-impulse
//       graph and for a real DSP graph (sawtooth -> swept biquad -> exponential
//       envelope, 2ch/48k, rms identical to 9 dp) — headless Chromium, macOS
//       arm64, 2026-08-28. `hashAudioBuffer()` exists so a fleet can re-verify
//       that per browser/build instead of trusting this paragraph.
//   (b) WEB AUDIO IS `[Exposed=Window]`. Verified: inside a dedicated Worker
//       `OfflineAudioContext`, `AudioContext` and `BaseAudioContext` are all
//       `undefined`. So an offline AUDIO render cannot leave a document's main
//       thread. `renderDeck()`'s wall lane has no such limit — it is pure JS
//       over a virtual clock — so a render farm parallelises across DOCUMENTS
//       (Remotion Lambda's shape: N tabs), never across workers in one page.
//
// ===========================================================================
// THE DELIVERABLE IS A PROPERTY, NOT A FEATURE:
//
//     renderDeck(deck, o) twice  ⇒  BYTE-IDENTICAL event trace
//     renderDeck(deck, o)        ⇒  same events, same order, same count as
//                                   real-time playback (only the timing moves)
//
// asserted in `timeline/lab/prop-render.mjs`.
//
// ===========================================================================
// WHAT THIS MODE CANNOT MAKE DETERMINISTIC — stated up front, because the
// honest half of a determinism claim is its boundary. The transport, the
// scheduler, the reduce/assertState fold, the cursor and the audio lane are all
// pure functions of the virtual clock and are therefore exactly reproducible.
// AN ADAPTER IS NOT, and the library cannot make it so:
//
//   · anything reading a REAL DEVICE — a media element's `currentTime`, a MIDI
//     port, a camera, `getOutputTimestamp()` off audio hardware;
//   · anything doing I/O — `fetch`, WebSocket, IndexedDB;
//   · `Math.random` / `crypto.getRandomValues` (Remotion forbids unseeded
//     randomness outright, for exactly this reason);
//   · anything reading a wall clock directly — `Date.now`, `performance.now`,
//     `new Date()` — INCLUDING via `requestAnimationFrame`.
//
// The mode's answer is to REPORT rather than to silently produce a different
// result: `renderDeck()` audits every registered adapter before the first frame
// and returns `audit`, with `onNondeterministic: 'throw'` available for a CI
// gate. The audit has two halves and they are honestly different in strength:
//   DECLARED  — `caps.deterministic === true | false`, the adapter's own word.
//   SUSPECTED — a source-text scan of the adapter's functions. It is a
//               HEURISTIC and it says so: it cannot see through a closure, an
//               imported helper, a bound native or a dynamic property read.
//               A clean scan is NOT a proof; a dirty scan IS a reason to look.
// The one thing the mode can actually FIX rather than report is unseeded
// randomness, and only on request: `seedRandom: <int>` swaps `Math.random` for
// a seeded mulberry32 for the duration of the render and counts the draws.
// ===========================================================================

import { createDeck, createAudioLane } from './transport.mjs';

// ---------------------------------------------------------------------------
// The render runtime: one deterministic clock, MANY tick hosts.
//
// `createVirtualRuntime()` exports a single host, so a deck and an audio lane
// cannot both `start()` on it — the second call replaces the first's callback.
// A render needs at least two. Same laws otherwise: time advances only through
// `advanceTo()`, and due timers and ticks fire in exact (time, id) order with
// the clock SET TO THEIR DUE MOMENT, so nothing observes a time it did not
// happen at.
// ---------------------------------------------------------------------------

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

/** A deck built for offline render: same createDeck, deterministic seams
 *  already wired, and it carries its runtime so renderDeck() can find it. */
export function offlineDeck(spec = {}) {
  const runtime = createRenderRuntime(spec.startMs ?? 0);
  const deck = createDeck({ ...spec, clock: runtime.clock, tickHost: runtime.newHost('deck') });
  deck.renderRuntime = runtime;
  return deck;
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

/** Audit every registered adapter. See the header for why this is two halves
 *  of different strength — `declared` is the adapter's word, `suspected` is a
 *  source-text heuristic that CANNOT see through closures. */
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

/** FNV-1a 64-bit (as two 32-bit halves, hex) over a string. Synchronous, so it
 *  works identically in node and the browser; the REAL determinism assert is
 *  string equality of the trace text — this is the short form to print. */
export function hashText(s) {
  let h1 = 0x811c9dc5, h2 = 0xcbf29ce4;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 ^= c; h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= c + i; h2 = Math.imul(h2, 0x01000193) >>> 0;
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

/** Hash the PCM of a rendered AudioBuffer — the audio half's byte-identity. */
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

// ---------------------------------------------------------------------------
// renderDeck — the frame-stepping driver.
// ---------------------------------------------------------------------------

/**
 * Step the transport by EXACT frame increments on a deterministic runtime,
 * firing every event in order, exactly once, with no wall-clock dependence and
 * no real-time waiting.
 *
 *   const deck = offlineDeck({items, adapters, range: [0, 10000]});
 *   const r = renderDeck(deck, {from: 0, to: 10000, fps: 30,
 *                              onFrame: ({frameIndex, pos, state}) => draw(...)});
 *   r.traceText   // the canonical event trace — byte-identical across runs
 *   r.traceHash   // its FNV-1a 64 short form
 *   r.audit       // what could not be made deterministic, and why
 *
 * @param deck  a deck built on a render runtime (`offlineDeck()`), or any deck
 *              plus an explicit `{runtime}`. A deck on a WALL clock is refused:
 *              silently rendering it would reintroduce exactly the "results
 *              differ across machines" failure this mode exists to remove.
 * @param opts
 *   from, to      the position window, inclusive of both ends       [required]
 *   fps           frames per second of POSITION time                     [30]
 *   rate          transport rate during the render                        [1]
 *   onFrame       ({frameIndex, pos, state, timeUs, deck}) per frame
 *   stateKinds    kinds to pre-fold into `state` each frame               [[]]
 *   trace         collect the event trace                               [true]
 *   seedRandom    int — swap Math.random for a seeded stream, and count  [null]
 *   onNondeterministic  'report' | 'throw'                          ['report']
 *   startPos      seek here before frame 0 (default `from`)
 */
export function renderDeck(deck, {
  from, to, fps = 30, rate = 1,
  onFrame, stateKinds = [], trace = true,
  seedRandom = null, onNondeterministic = 'report',
  runtime: runtimeOpt, startPos, pauseAtEnd = true,
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
  if (!Number.isFinite(from) || !Number.isFinite(to) || !(to >= from))
    throw new Error(`renderDeck needs finite {from, to} with to >= from (got ${from}, ${to})`);
  if (!(fps > 0)) throw new Error(`renderDeck needs fps > 0 (got ${fps})`);
  if (!(rate > 0)) throw new Error(`renderDeck needs rate > 0 (got ${rate})`);

  const audit = auditAdapters(deck);
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
  const notes = [];
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

  // --- seeded randomness, only when asked. A global swap is a side effect and
  // is therefore opt-in, always restored, and always counted.
  const realRandom = Math.random;
  let randomCalls = 0;
  if (seedRandom !== null && seedRandom !== undefined) {
    const rnd = mulberry32(seedRandom);
    Math.random = () => { randomCalls++; return rnd(); };
  }

  const t0 = runtime.now();
  let frames = 0, tagged = 0;
  try {
    deck.sched.start();
    deck.transport.seek(startPos === undefined ? from : startPos);
    deck.transport.play(rate);
    for (let i = 0; i < nFrames; i++) {
      // ONE advance per frame; everything due inside the interval fires in
      // (time, id) order with the clock set to its own due moment.
      runtime.advanceTo(t0 + (i * 1000) / fps / rate);
      const pos = posOf(i);
      while (tagged < rows.length) rows[tagged++].f = i;   // stamp this frame's fires
      frames++;
      if (onFrame) {
        const state = {};
        for (const k of stateKinds) state[k] = deck.reduceAt(k, pos);
        state.get = (k, o) => deck.reduceAt(k, pos, o);
        onFrame({ frameIndex: i, pos, state, timeUs: Math.round(runtime.now() * 1000), deck, fps, frameMs });
      }
    }
    // `pauseAtEnd: false` exists for ONE reason and it is a real property of
    // offline audio: an OfflineAudioContext has not rendered anything yet when
    // the last frame is stepped. `createAudioLane` cancels every COMMITTED node
    // on any transport state change (correct — a pause must not leave notes
    // ringing), so a closing `pause()` would `stop()` and `disconnect()` the
    // entire scheduled graph microseconds before `startRendering()` reads it,
    // and the render would come out SILENT. Measured, not theorised: that is
    // exactly what the first run of run-render.mjs produced (7 nodes, all
    // 'pending', 0 nonzero samples). renderDeckAudio() therefore pauses AFTER
    // the buffer exists.
    if (pauseAtEnd) deck.transport.pause();
  } finally {
    if (seedRandom !== null && seedRandom !== undefined) Math.random = realRandom;
    offFire(); offPolicy();
    deck.sched.stop();
  }

  const traceText = trace ? rows.map((r) => JSON.stringify(r)).join('\n') : '';
  return {
    frames, fps, frameMs: +frameMs.toFixed(9), from, to, rate,
    nFrames, events: fired, reduces,
    byKind: Object.fromEntries([...byKind].sort((a, b) => (a[0] < b[0] ? -1 : 1))),
    trace: rows, traceText, traceHash: hashText(traceText),
    audit, notes,
    random: seedRandom !== null && seedRandom !== undefined
      ? { seeded: true, seed: seedRandom, calls: randomCalls }
      : { seeded: false, calls: null,
          note: 'Math.random was NOT replaced. If an adapter draws from it, this render is not reproducible — pass seedRandom.' },
    runtime: runtime.stats(),
    endPos: +deck.position().toFixed(6),
  };
}

// ---------------------------------------------------------------------------
// The audio half.
// ---------------------------------------------------------------------------

/**
 * An OfflineAudioContext whose `currentTime` RIDES THE VIRTUAL CLOCK.
 *
 * Why this is necessary and not decoration: `createAudioLane` anchors wall time
 * to audio time by sampling `clock.now()` and `ctx.currentTime` together, then
 * schedules `node.start(anchor.audio + (wallT - anchor.wall)/1000)`. A bare
 * OfflineAudioContext reports `currentTime === 0` until `startRendering()` and
 * never advances during scheduling, so every re-anchor would map "now" back to
 * 0 and every node would be started ~one lookahead horizon into the buffer,
 * regardless of its real position. With this shim the anchor is exact and
 * constant: audioTimeFor(wall) === (wall - t0)/1000 for every sample of it.
 *
 * Everything except `currentTime` is delegated to the real context, with
 * methods bound to it (a native AudioContext method throws on a foreign
 * receiver, which is why this is a Proxy and not Object.create).
 */
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

/**
 * Render a deck's WALL lane and an AUDIO lane together, offline, into an
 * AudioBuffer. Browser-only (needs OfflineAudioContext).
 *
 *   const r = await renderDeckAudio(deck, {
 *     from: 0, to: 4000, fps: 30,
 *     audioItems: [{at: 500, kind: 'click'}, …],
 *   });
 *   r.audio.hash   // byte-identity of the rendered PCM
 *
 * The audio lane is the SHIPPED `createAudioLane` — unmodified, taking its
 * context by argument exactly as it always has. Proving that seam works with a
 * different kind of context is half the point of this function existing.
 */
export async function renderDeckAudio(deck, {
  from, to, fps = 30, rate = 1,
  audioItems = [], makeNode = null, clickGain = 1.0,
  sampleRate = 48000, channels = 1,
  OfflineCtor = (typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : null),
  tickMs = 25, horizonMs = 100,
  ...renderOpts
} = {}) {
  if (!OfflineCtor) throw new Error('renderDeckAudio needs an OfflineAudioContext (browser) — pass {OfflineCtor}');
  const runtime = renderOpts.runtime || deck.renderRuntime;
  if (!runtime) throw new Error('renderDeckAudio: no render runtime (use offlineDeck)');

  const lengthSamples = Math.max(1, Math.round(((to - from) / 1000 / rate) * sampleRate));
  const ctx = new OfflineCtor(channels, lengthSamples, sampleRate);
  const target = offlineAudioTarget(ctx, runtime, { startMs: runtime.now() });
  const lane = createAudioLane(deck.transport, target, {
    tickMs, horizonMs, host: runtime.newHost('audio'), makeNode, clickGain,
  });
  lane.bus.connect(ctx.destination);
  for (const it of audioItems) lane.schedule(it);
  lane.start();

  let r;
  try {
    // pauseAtEnd:false — see the note in renderDeck. Nothing may touch the
    // transport (and therefore the lane's committed nodes) until the buffer is
    // rendered; the virtual clock does not advance on its own, so leaving the
    // transport 'playing' between the last frame and startRendering() costs
    // nothing and changes no position.
    r = renderDeck(deck, { from, to, fps, rate, ...renderOpts, pauseAtEnd: false });
  } catch (e) {
    lane.stop(); deck.transport.pause();
    throw e;
  }
  const buffer = await ctx.startRendering();
  deck.transport.pause();
  lane.stop();
  const audio = hashAudioBuffer(buffer);
  return {
    ...r,
    audio: { ...audio, scheduled: lane.scheduled(), laneStats: lane.stats(), anchor: lane.anchorInfo() },
    buffer,
  };
}
