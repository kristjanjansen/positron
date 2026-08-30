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
// ===========================================================================
// v0.7 — THE NEST (plan-timeline §8.8's last open seam: "`renderDeck` cannot
// see a nest"). Until this version the renderer was excellent on a FLAT deck
// and blind to the composition layer — fragment quotation, loops, phasing,
// disintegration — which is where all the interesting work is. A nested render
// folds the child decks through the nest's own position map:
//
//     fragment   childPos = clamp(in + (parentPos − at)·rate)
//     loop       childPos = in + ((parentPos − at)·rate) mod (out − in)
//
// and it does that by RUNNING THE SHIPPED NEST, not by re-deriving it here. The
// renderer supplies the two things a nest needs from its host and nothing else:
//
//   (1) A TICK HOST FOR THE WRAP. §8.8 measured that a loop boundary polled by
//       `servo()` loses material (one downbeat per wrap, 2100/2400 onsets) and
//       that a boundary COMMITTED as a one-shot does not. That finding is about
//       SCHEDULING DISCIPLINE, not about wall clocks, so it survives into the
//       offline mode unchanged — and the render runtime is already a multi-host
//       TickHost factory, so the offline path does not lack a TickHost, it has
//       a DETERMINISTIC one. `offlineNest()` wires it. A nest built without one
//       still renders, reproducibly, and the render SAYS `boundary:'polled'`
//       and how many wraps were taken late — because polled is not a timing
//       artefact offline, it is a DIFFERENT EVENT SET, and a render that
//       quietly produced one would be reproducible and wrong.
//   (2) THE SERVO'S LOOP. `nest.servo()` has no timers by design; the client's
//       rAF loop calls it. Offline the FRAME LOOP is that client loop — one
//       `servo()` per frame, after the clock has moved and before `onFrame`.
//       Pass `servo:false` to run the render on the committed boundary alone;
//       that is the negative control, and it is asserted in prop-render.
//
// An UNBOUNDED loop is refused, and the refusal is `nest.renderBound()`'s, not
// a second one written here: call `renderDeck(parent)` with no window and the
// window comes from `renderBound()`, which throws LOOP_UNBOUNDED naming the
// spans. Naming the end yourself (`{from, to}`) is still allowed — that is
// exactly `renderBound({until})` — and then the render REPORTS which spans were
// bounded by the window rather than by the score.
//
// A DEGRADED CHILD IS REPORTED, NEVER OVERRIDDEN. `caps.rates:[1]` on a child
// adapter refuses the parent's 1.5×; the nest chooses the nearest lattice point
// and says so, and that report rides out in `r.nest.rates[]` with
// `degraded:true`. The render does not "fix" it by rendering the rate the score
// asked for, because that would be a render of a performance that cannot happen.
//
// WHAT THE NEST RENDER IS MORE OF THAN PLAYBACK: cross-deck simultaneity. Two
// decks firing at the same instant are ordered by (time, timer-id) inside one
// `advanceTo`, so the render fixes a total order that NO wall clock provides
// (two schedulers, two hosts, no shared tick). Same events, same count, same
// per-deck order, same final state — but the interleaving between decks is a
// render property, not a transport contract. Stated here so nobody proves a
// regression against it.
// ===========================================================================
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
import { createNest, nestOf } from './nested.mjs';

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
 *  already wired, and it carries its runtime so renderDeck() can find it.
 *  `{runtime}` shares one clock with an already-built offline deck — which is
 *  what a NEST needs: a parent and its children must ride the same virtual
 *  clock or the composition is not a composition. */
export function offlineDeck(spec = {}) {
  const runtime = spec.runtime || createRenderRuntime(spec.startMs ?? 0);
  const { runtime: _r, startMs: _s, ...rest } = spec;
  const deck = createDeck({ ...rest, clock: runtime.clock, tickHost: runtime.newHost('deck') });
  deck.renderRuntime = runtime;
  return deck;
}

/**
 * A nest whose WRAP BOUNDARY is committed on the render runtime — the offline
 * twin of `createNest(parent, {tickHost: workerTickHost()})`.
 *
 * This is one line and it is the whole difference between a loop that renders
 * the event set playback produces and one that does not (§8.8: the boundary is
 * a committed one-shot, never polled). `createNest` is unmodified; the renderer
 * just hands it a deterministic host instead of a worker.
 */
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

/**
 * Walk a nest and everything under it, in a STABLE order (insertion order of
 * spans, depth-first), producing:
 *   nests  [{nest, path}]        — servo order, outermost first
 *   spans  [{path, id, sp, nest}]
 *   decks  [{deck, label, spans}] — one row per DECK (a deck may be quoted more
 *                                   than once; a deck has one scheduler, so the
 *                                   trace tag is per deck, not per span)
 * The label is the path of the span that FIRST reached the deck, so it names a
 * position in the arrangement and is reproducible from the arrangement alone.
 */
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
 *   from, to      the position window, inclusive of both ends
 *                 [required — UNLESS the deck has a nest, in which case they
 *                  default to `nest.renderBound()`, which throws
 *                  LOOP_UNBOUNDED on an infinite loop rather than inventing
 *                  a window nothing in the score justifies]
 *   fps           frames per second of POSITION time                     [30]
 *   rate          transport rate during the render                        [1]
 *   onFrame       ({frameIndex, pos, state, timeUs, deck, children}) per frame
 *   stateKinds    kinds to pre-fold into `state` each frame               [[]]
 *   trace         collect the event trace                               [true]
 *   seedRandom    int — swap Math.random for a seeded stream, and count  [null]
 *   onNondeterministic  'report' | 'throw'                          ['report']
 *   startPos      seek here before frame 0 (default `from`)
 *   nest          a nest to fold; `undefined` auto-detects `nestOf(deck)`;
 *                 `false` renders the parent FLAT (the pre-v0.7 behaviour,
 *                 kept because "render only this deck's own lanes" is a real
 *                 request and silently changing it would be a regression)
 *   servo         call `nest.servo()` once per frame                    [true]
 */
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
  // --- v0.7: THE NEST. Resolve it before the window, because on a nested deck
  // the WINDOW COMES FROM THE NEST (`renderBound()`), and that is the call that
  // refuses an unbounded loop.
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

  // Every deck in the composition must be on the RENDER'S clock. One child on a
  // wall clock is the whole failure back again, one level down and harder to
  // see — so it is refused by name, not averaged into a caveat.
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

  // --- v0.7: the CHILD lanes. One listener per DECK (a deck has one scheduler,
  // however many times it is quoted), tagged `s:<label>`. A child row therefore
  // has a DIFFERENT SHAPE from a parent row — `{f,s,k,id,at,o,i,d}` vs
  // `{f,k,id,at,o,i,d}` — which keeps a FLAT render's trace bytes exactly what
  // they were before this version, so no existing hash moved.
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

  // rule 10c, honoured: a wrap is a CALLBACK, never a row in the log. It is not
  // in `trace` either — it gets its own bounded list and its own hash, so the
  // wrap set is provable without an infinite loop ever becoming an infinite log.
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
      // ONE advance per frame; everything due inside the interval fires in
      // (time, id) order with the clock set to its own due moment. A committed
      // WRAP is one of those due things, so it lands at its exact instant and
      // the head of the new pass commits inside the SAME advance.
      runtime.advanceTo(t0 + (i * 1000) / fps / rate);
      // THE SERVO'S LOOP IS THE FRAME LOOP. `nest.servo()` owns no timers by
      // design (the vector law); a client calls it from its rAF loop, and
      // offline the frame loop IS that client. Outermost nest first, so a
      // parent's correction reaches its grandchildren in the same frame.
      if (servo) for (const { nest: n } of tree.nests) { servoCalls++; servoCorrections += n.servo() || 0; }
      const pos = posOf(i);
      while (tagged < rows.length) rows[tagged++].f = i;   // stamp this frame's fires
      while (wrapTagged < wrapRows.length) wrapRows[wrapTagged++].f = i;
      frames++;
      if (onFrame) {
        const state = {};
        for (const k of stateKinds) state[k] = deck.reduceAt(k, pos);
        state.get = (k, o) => deck.reduceAt(k, pos, o);
        // A nested renderer needs to know WHERE EACH CHILD IS to draw it. That
        // is the nest's position map, read, never re-derived here.
        const children = tree.spans.map(({ path, id, sp, nest: n }) => ({
          path, id, deck: sp.deck, pos: n.childPos(id),
          iter: n.iteration(id), present: n.present(id),
        }));
        onFrame({ frameIndex: i, pos, state, timeUs: Math.round(runtime.now() * 1000), deck, fps, frameMs, children, nest });
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

/** Everything the composition layer did, reported rather than inferred. Split
 *  out because it is all reading — the render is already over when it runs. */
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
 *
 * v0.7 — A NEST GETS AUDIO TOO, and this is where §8.5's two pieces stop being
 * live-only demos and become rendered files:
 *
 *     childAudio: [{span: 'q', items: [{at, kind, id}, …], makeNode}]
 *
 * A child lane is a `createAudioLane` on the CHILD's transport, sharing the one
 * OfflineAudioContext and the one virtual clock. That composes correctly for
 * free, and the reason is worth stating: the lane maps `transport.timeAt(ev.at)`
 * (the CHILD's position -> wall) and then wall -> audio through the shared
 * anchor, so a child event's sample index is the composition's arithmetic, not
 * a second copy of it. A LOOP therefore repeats its audio without any code
 * here: `child.seek()` at the wrap is a transport state change, `createAudioLane`
 * cancels the committed nodes and re-pends everything after the seek point, and
 * the next pass commits again — the same mechanism that makes a live loop work.
 *
 * The `[Exposed=Window]` limit is unchanged and it is the shape of a render
 * farm: one document per render, N documents in parallel, never N workers.
 */
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

  // The window may come from the nest (renderBound) exactly as in renderDeck —
  // and it has to be resolved HERE, because the buffer length is a function of
  // it and an OfflineAudioContext's length is fixed at construction.
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
    // 'lane' binds the lane to the CHILD's transport. It is kept because it is
    // the obvious design and because it is WRONG OFFLINE, measurably — see the
    // note above expandSpanTimes().
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
    // pauseAtEnd:false — see the note in renderDeck. Nothing may touch the
    // transport (and therefore the lane's committed nodes) until the buffer is
    // rendered; the virtual clock does not advance on its own, so leaving the
    // transport 'playing' between the last frame and startRendering() costs
    // nothing and changes no position.
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

/**
 * THE SEAM AT THE NEST'S AUDIO BOUNDARY, and it is the one the flat renderer's
 * closing `transport.pause()` already taught — one level down, and this time
 * caused BY THE COMPOSITION rather than by the renderer's epilogue.
 *
 * MEASURED, on a real OfflineAudioContext (Chromium, macOS arm64, 2026-08-30):
 * a child audio lane bound to the CHILD's transport rendered **1 nonzero sample
 * out of an expected 7** for a 3-pass loop. The cause is not the anchor and not
 * the map — both are exact — it is that `createAudioLane` subscribes to
 * `transport.onState` and calls `cancelCommitted()` on EVERY state change,
 * which is exactly right live (a seek must not leave notes ringing) and exactly
 * wrong offline. Offline, nothing has played when the graph is built: the whole
 * buffer is rendered at `startRendering()`, so a node stopped and disconnected
 * at wrap 1 never sounds at all. And a loop's wrap IS a `child.seek()` — the
 * mechanism §8.8 chose on purpose — so a looping child cancels its own audio,
 * once per repetition, by design.
 *
 * The fix is not a flag on the lane; it is a change of what an offline render
 * IS. **Offline, a loop is EXPANDED, not replayed.** The renderer maps each
 * child-domain audio item to its parent-domain time ONCE PER REPETITION —
 * through the nest's own inverse map, `nest.parentPos(id, cpos, iter)`, so the
 * expansion cannot disagree with the position map the event lanes use — and
 * schedules them all on a lane bound to the ROOT transport, which never seeks
 * during a render. A loop inside a loop expands multiplicatively, which is why
 * this is recursive.
 *
 * `mode:'lane'` keeps the broken path reachable, because a negative control you
 * can run is worth more than a paragraph you can read.
 */
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
