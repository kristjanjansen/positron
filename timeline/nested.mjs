// A span that is a deck: nest.add({ id, at, rate, deck, in, out }). Domains stay separate, rates
// multiply and degrade out loud, a parent seek is a child seek, only `master: true` leads, no
// cycles, fragments quote, quotations are values. servo() is driven by the client's loop.
// why: lessons/timeline-nested.md#rules

// Rule 10: a loop is a quotation with repetition (`repeat`: count, {untilMs} or 'infinite'), mapped
// by modulo. The wrap re-seeks and never re-fires; level lanes carry; a wrap is a callback, not a
// row; an unbounded loop binds to the parent range and cannot render; the joint is a hard cut.
// why: lessons/timeline-nested.md#loop-rule

import { pstats } from './logdeck.mjs';
import { isQuotation, quotation, score, deckRef, refDeck, resolveAddress, isMarkAddress, normalizeProvenance,
         normalizeRepeat, repeatGeometry, loopPhase } from './score.mjs';

// --- the nesting graph (rule 6) --------------------------------------------
const CHILDREN = new WeakMap();   // deck -> Set<deck>
const PARENTS = new WeakMap();    // deck -> Set<deck>
const NESTS = new WeakMap();      // deck -> nest (for recursive drift)

export const MAX_NEST_DEPTH = 8;

const kids = (d) => CHILDREN.get(d) || null;
const dads = (d) => PARENTS.get(d) || null;

function walk(deck, edge, out = new Set()) {
  for (const n of edge(deck) || []) if (!out.has(n)) { out.add(n); walk(n, edge, out); }
  return out;
}
function depth(deck, edge) {
  let d = 0;
  for (const n of edge(deck) || []) d = Math.max(d, 1 + depth(n, edge));
  return d;
}

// assertNoCycle throws on a cycle or the depth cap. nestOf(deck): the nest a deck is the parent of,
// so the offline renderer can fold a composition.
// why: lessons/timeline-nested.md#nest-of
export function nestOf(deck) { return (deck && NESTS.get(deck)) || null; }

export function checkNestable(parent, child) {
  if (parent === child) throw new Error('nested cycle: a deck cannot contain itself');
  if (walk(child, kids).has(parent)) throw new Error('nested cycle: the child already contains this parent');
  if (walk(parent, dads).has(child)) throw new Error('nested cycle: the child is an ancestor of this parent');
  const chain = depth(parent, dads) + 1 + 1 + depth(child, kids);
  if (chain > MAX_NEST_DEPTH)
    throw new Error(`nesting depth ${chain} exceeds MAX_NEST_DEPTH ${MAX_NEST_DEPTH}`);
  return chain;
}

// --- rate composition (rule 2) ---------------------------------------------

/** The child's rate lattice: the INTERSECTION of every declared
 *  `adapter.caps.rates` in the child. null = the child declared no limit. */
export function rateLattice(deck) {
  const caps = typeof deck.caps === 'function' ? deck.caps() : {};
  let allowed = null;
  for (const c of Object.values(caps || {})) {
    if (!c || !Array.isArray(c.rates) || !c.rates.length) continue;
    const s = new Set(c.rates.map(Number));
    allowed = allowed === null ? s : new Set([...allowed].filter((r) => s.has(r)));
  }
  return allowed === null ? null : [...allowed].sort((a, b) => a - b);
}

/** parentRate × spanRate, clipped to the child's lattice, reported honestly. */
export function composeRate(parentRate, spanRate, allowed) {
  const wanted = parentRate * spanRate;
  if (wanted === 0) return { wanted: 0, chose: 0, degraded: false, allowed };  // pause always expressible
  if (!allowed || !allowed.length) return { wanted, chose: wanted, degraded: false, allowed };
  if (allowed.some((r) => Math.abs(r - wanted) < 1e-9)) return { wanted, chose: wanted, degraded: false, allowed };
  let best = allowed[0];
  const d = (r) => Math.abs(Math.log(r / wanted));
  for (const r of allowed) if (r > 0 && d(r) < d(best)) best = r;
  return { wanted, chose: best, degraded: true, allowed, reason: 'child caps.rates lattice' };
}

// --- the nest ---------------------------------------------------------------

// createNest(parent, { kind, toleranceMs, hardSeekMs, ... }). The parent's range must cover the
// spans:
// declare it, or call parent.setRange('auto') after the last add().
// why: lessons/timeline-nested.md#create-nest
export function createNest(parent, {
  kind = 'deck-span',
  toleranceMs = 40,
  hardSeekMs = 250,
  epsMs = 0.5,
  resolve = null,          // rule 8: (ref, quotation) -> deck, for score loading
  markKind = 'mark',       // rule 8: the child lane a {mark:'id'} address reads
  // How late a wrap may still play its pass's head: transport.mjs's lateGraceMs, one constant.
  // why: lessons/timeline-nested.md#wrap-grace
  wrapGraceMs = 150,
  // The wrap is committed as a one-shot on this TickHost; without one servo() finds it late and
  // `nest.loop(id).boundary` says 'polled'.
  // why: lessons/timeline-nested.md#tick-host
  tickHost = null,
} = {}) {
  const boundaryHost = tickHost && typeof tickHost.setTimer === 'function' ? tickHost : null;
  const clockNow = () => parent.transport.clock.now();
  const spans = new Map();     // id -> span record
  let masterId = null, servoTicks = 0, disposed = false;
  const wrapCbs = new Set();   // rule 10c

  const parentDurOf = (sp) => sp.parentDur;
  const inSpan = (sp, pos) => pos >= sp.at - epsMs && pos <= sp.at + sp.parentDur + epsMs;
  // The fragment map (c0 is `in`); a loop uses modulo instead of clamp via score.mjs's loopPhase.
  // why: lessons/timeline-nested.md#phase-of
  const phaseOf = (sp, pos) => loopPhase((pos - sp.at) * sp.rate, sp.c1 - sp.c0, sp.childTotal);
  const toChild = (sp, pos) => (sp.loop
    ? sp.c0 + phaseOf(sp, pos).off
    : Math.max(sp.c0, Math.min(sp.c1, sp.c0 + (pos - sp.at) * sp.rate)));
  const iterAt = (sp, pos) => (sp.loop ? phaseOf(sp, pos).iter : 0);
  // The inverse: a loop has one parent position per repetition, so the caller names which.
  // why: lessons/timeline-nested.md#to-parent
  const toParent = (sp, cpos, iter = sp.iter || 0) =>
    sp.at + ((cpos - sp.c0) + (sp.loop ? iter * (sp.c1 - sp.c0) : 0)) / sp.rate;

  /** rule 7g: is some OTHER span quoting the SAME deck present right now? If so
   *  this span's absence is not the child's absence, and must not touch it. */
  const otherPresentOn = (sp, pos) => {
    for (const [, o] of spans) if (o !== sp && o.deck === sp.deck && inSpan(o, pos)) return o;
    return null;
  };
  /** distance from `pos` to a span's parent window (0 = inside) */
  const distTo = (sp, pos) => (pos < sp.at ? sp.at - pos : Math.max(0, pos - (sp.at + sp.parentDur)));
  // When every quotation of a deck is absent, the child parks at the edge of the nearest one.
  // why: lessons/timeline-nested.md#parks-it
  const parksIt = (sp, pos) => {
    const d = distTo(sp, pos);
    for (const [, o] of spans) {
      if (o === sp || o.deck !== sp.deck) continue;
      const od = distTo(o, pos);
      if (od < d) return false;
      if (od === d && [...spans.values()].indexOf(o) < [...spans.values()].indexOf(sp)) return false;
    }
    return true;
  };

  // A child's adapters, to ask them to be silent; falls back for decks without `deck.adapter()`.
  // why: lessons/timeline-nested.md#adapters-of
  const adaptersOf = (deck) => (typeof deck.adapter === 'function'
    ? new Proxy({}, { get: (_, k) => deck.adapter(String(k)), has: (_, k) => !!deck.adapter(String(k)) })
    : (deck && deck.adapters && typeof deck.adapters === 'object' ? deck.adapters : {}));

  // Ask lanes declaring `caps.absentState: 'silence'` to go quiet; the nest knows nothing of notes.
  // why: lessons/timeline-nested.md#silence-child
  function silenceChild(sp, park, reason) {
    const caps = typeof sp.deck.caps === 'function' ? (sp.deck.caps() || {}) : {};
    const ads = adaptersOf(sp.deck);
    const rep = { mode: 'hold', kinds: [], degraded: [], park, reason };
    for (const [k, c] of Object.entries(caps)) {
      const mode = (c && c.absentState) || 'hold';
      if (mode === 'hold') continue;
      if (mode !== 'silence') {
        rep.degraded.push({ kind: k, wanted: mode, chose: 'hold', degraded: true,
          reason: `caps.absentState '${mode}' is not a mode this nest knows — use 'hold' | 'silence'` });
        continue;
      }
      const ad = ads[k];
      if (!ad || typeof ad.silence !== 'function') {
        rep.degraded.push({ kind: k, wanted: 'silence', chose: 'hold', degraded: true,
          reason: ad ? `adapter '${k}' declares caps.absentState 'silence' but implements no silence()`
                     : `adapter '${k}' is not reachable through deck.adapters (registered after construction) — see the transport.mjs seam note in nested.mjs`,
          unreachable: !ad });
        continue;
      }
      ad.silence({ kind: k, deck: sp.deck, pos: park, reason, span: sp.id, in: sp.c0, out: sp.c1 });
      rep.kinds.push(k);
      rep.mode = 'silence';
    }
    sp.absent = rep;
    if (rep.kinds.length) sp.silences++;
    if (rep.degraded.length) sp.absentDegradations++;
    return rep;
  }

  // Rule 10a/10b: the wrap boundary.
  // why: lessons/timeline-nested.md#wrap-boundary

  // Split lanes into 'rearm' (default) and 'carry' per `caps.loopState` (or `caps.valued`).
  // 'carry' on a lane the transport cannot fold is a reported degradation.
  // why: lessons/timeline-nested.md#loop-lanes
  function loopLanes(deck) {
    const caps = typeof deck.caps === 'function' ? (deck.caps() || {}) : {};
    const carry = [], rearm = [], degraded = [];
    for (const [k, c] of Object.entries(caps)) {
      const declared = (c && c.loopState) || (c && c.valued === 'level' ? 'carry' : c && c.valued === 'edge' ? 'rearm' : null);
      if (!declared || declared === 'rearm') { rearm.push(k); continue; }
      if (declared !== 'carry') {
        degraded.push({ kind: k, wanted: declared, chose: 'rearm', degraded: true,
          reason: `caps.loopState '${declared}' is not a mode this nest knows — use 'carry' | 'rearm'` });
        continue;
      }
      // `deck.adapter(k)` reaches adapters registered AFTER construction too
      // (transport v0.6). The seam noted at silenceChild() below is CLOSED.
      const ad = typeof deck.adapter === 'function' ? deck.adapter(k) : (deck.adapters || {})[k];
      if (!ad || typeof ad.reduce !== 'function' || typeof ad.assertState !== 'function') {
        degraded.push({ kind: k, wanted: 'carry', chose: 'rearm', degraded: true,
          reason: `lane '${k}' declares caps.loopState 'carry' but has no reduce()+assertState() — there is nothing to carry, so the wrap re-arms it like an edge` });
        continue;
      }
      carry.push(k);
    }
    return { carry, rearm, degraded };
  }

  // The wrap: notify `loopWrap` adapters, then child.seek just before `in` (a real seek re-arms
  // edge lanes), then re-assert carry lanes at `out`. A quotation is [in, out), so the seek lands a
  // hair before `in` and the downbeat still fires; `in === range[0]` loses the hair, reported.
  // why: lessons/timeline-nested.md#wrap
  const WRAP_LEAD_MS = 1e-6;
  function wrapSeekTarget(sp) {
    const want = sp.c0 - WRAP_LEAD_MS;
    const got = Math.max(sp.deckRange[0], want);
    if (got !== want && !sp.leadClamped) {
      sp.leadClamped = true;
      sp.loopDegradations.push({ kind: '*', wanted: 'wrap-lead', chose: 'clamped', degraded: true,
        reason: `this quotation's \`in\` (${sp.c0}) IS the child's range start, so the wrap cannot seek before it — ` +
          'an event sitting exactly on `in` is FOLDED at every wrap instead of firing (a lost downbeat). ' +
          'Move `in` inside the child\'s range, or widen the child\'s range by one unit.' });
    }
    return got;
  }

  function wrapSpan(sp, toIter, pos, reason = 'wrap') {
    const from = sp.iter;
    // A wrap seeks to the top of the pass, within lateGraceMs, using the signed distance from the
    // boundary
    // (an early timer read off the map seeked to the end of the pass: 141 of 2400 onsets lost).
    // why: lessons/timeline-nested.md#wrap-top
    const lateMs = (pos - (sp.at + toIter * sp.onePassMs)) * sp.rate;
    const want = lateMs <= wrapGraceMs ? wrapSeekTarget(sp)
      : sp.c0 + Math.min(sp.c1 - sp.c0, lateMs);
    const lanes = sp.loopLanes || (sp.loopLanes = loopLanes(sp.deck));
    const info = {
      span: sp.id, ref: deckRef(sp.deck) || null, reason,
      from, to: toIter, wraps: sp.wraps + 1, iterations: sp.iterations,
      parentPos: pos, childPos: want, in: sp.c0, out: sp.c1, lengthMs: sp.c1 - sp.c0,
      carry: lanes.carry, rearm: lanes.rearm, joint: 'cut',
    };
    const ads = typeof sp.deck.adapter === 'function' ? (k) => sp.deck.adapter(k) : (k) => (sp.deck.adapters || {})[k];
    const caps = typeof sp.deck.caps === 'function' ? (sp.deck.caps() || {}) : {};
    info.heard = [];
    for (const k of [...lanes.rearm, ...lanes.carry]) {
      const ad = ads(k), c = caps[k] || {};
      if (ad && typeof ad.loopWrap === 'function') {
        try { ad.loopWrap({ ...info, kind: k }); info.heard.push(k); } catch (e) { sp.wrapErrors.push(String(e.message)); }
      } else if (c.loopWrap) {
        // symmetric with rule 9: a declared capability that is not implemented
        // is a DEGRADATION, never a silent skip.
        sp.loopDegradations.push({ kind: k, wanted: 'loopWrap', chose: 'none', degraded: true,
          reason: `adapter '${k}' declares caps.loopWrap but implements no loopWrap(info) — the wrap still re-seeks, but this lane is never told` });
      }
    }
    sp.deck.seek(want);                                    // 2, the re-seek; why: lessons/timeline-nested.md#reseek
    // 3, the carry: fold at `out`, assert at the playhead; skip a lane the evidence policy
    // excludes.
    // why: lessons/timeline-nested.md#carry
    for (const k of lanes.carry) {
      const state = sp.deck.reduceAt(k, sp.c1);
      if (state === undefined || state === null) continue;
      sp.deck.assertState(k, state, { pos: want, reason: 'loop-carry', source: sp.id });
    }
    sp.iter = toIter; sp.wraps++; sp.lastWrap = info;
    if (lanes.degraded.length) for (const d of lanes.degraded) if (!sp.loopDegradations.some((x) => x.kind === d.kind && x.wanted === d.wanted)) sp.loopDegradations.push(d);
    for (const cb of [...wrapCbs]) { try { cb(info); } catch (e) { sp.wrapErrors.push(String(e.message)); } }
    armWrap(sp);                                   // roll to the next boundary
    return info;
  }

  // Position is arithmetic, never integrated; the re-seek is a state operation. The boundary is a
  // cancellable one-shot re-armed from the iteration index, so it cannot drift.
  // why: lessons/timeline-nested.md#committed
  function disarmWrap(sp) { if (sp.timerCancel) { try { sp.timerCancel(); } catch {} sp.timerCancel = null; } sp.armedFor = null; }

  function armWrap(sp) {
    disarmWrap(sp);
    if (disposed || !boundaryHost || !sp.loop) return;
    if (!parent.playing()) return;
    const r = sp.rateReport;
    if (!r || !(r.chose > 0)) return;
    const pos = parent.position();
    if (!inSpan(sp, pos)) return;
    // max with `iter + 1`, so an early one-shot cannot re-arm the boundary just taken.
    // why: lessons/timeline-nested.md#monotonic
    const next = Math.max(phaseOf(sp, pos).iter + 1, sp.iter + 1);
    if (Number.isFinite(sp.iterations) && next >= sp.iterations) return;   // the last pass has no wrap
    const at = sp.at + next * sp.onePassMs;                                // from the index; why: lessons/timeline-nested.md#from-index
    if (at > sp.at + sp.parentDur + epsMs) return;
    const delay = parent.transport.timeAt(at) - clockNow();
    sp.armedFor = next;
    sp.timerCancel = boundaryHost.setTimer(Math.max(0, delay), () => {
      sp.timerCancel = null; sp.armedFor = null;
      if (disposed || !parent.playing() || !inSpan(sp, parent.position())) return;
      if (next <= sp.iter) return;                         // already taken (a seek beat us)
      wrapSpan(sp, next, parent.position(), 'boundary');
    });
  }
  const armAll = () => { for (const [, sp] of spans) if (sp.loop) armWrap(sp); };

  // Presence is an event (onPresence), fire and forget like onWrap.
  // why: lessons/timeline-nested.md#presence
  const presenceCbs = new Set();
  function firePresence(sp, present, pos, reason) {
    if (!presenceCbs.size) return;
    const info = { span: sp.id, ref: deckRef(sp.deck) || null, present, parentPos: pos, reason,
                   enters: sp.enters, exits: sp.exits };
    for (const cb of presenceCbs) { try { cb(info); } catch { /* listener's problem */ } }
  }
  const setPresent = (sp, present, pos, reason) => {
    if (sp.present === present) return;
    sp.present = present;
    if (present) sp.enters++; else sp.exits++;
    firePresence(sp, present, pos, reason);
  };

  function applyRate(sp) {
    const r = composeRate(parent.targetRate(), sp.rate, sp.allowed);
    if (r.degraded && (!sp.rateReport || sp.rateReport.chose !== r.chose)) sp.degradations++;
    sp.rateReport = r;
    if (r.chose > 0 && Math.abs(sp.deck.targetRate() - r.chose) > 1e-9) sp.deck.setRate(r.chose);
    return r;
  }

  // Put the child where the parent says, with a real child seek (rule 3).
  // why: lessons/timeline-nested.md#assert-span
  function assertSpan(sp, parentPos, present, entry = null) {
    const inside = present && inSpan(sp, parentPos);
    if (!inside) {
      if (sp.loop) disarmWrap(sp);
      // rule 7g: a sibling quotation of the same deck owns the child right now.
      // Parking would drag it out from under the span that IS present.
      if (otherPresentOn(sp, parentPos)) {
        setPresent(sp, false, parentPos, 'sibling');
        return;
      }
      if (sp.deck.playing()) sp.deck.pause();
      // Park at the edge actually left through, driven by position, not by the transition;
      // for a cut loop, `endPark`.
      // why: lessons/timeline-nested.md#park
      const park = parentPos < sp.at ? sp.c0 : sp.endPark;
      if (parksIt(sp, parentPos)) {
        if (sp.deck.position() !== park) { sp.deck.seek(park); sp.silencedAt = null; }
        // Ask a silence-capable adapter once per park position.
        // why: lessons/timeline-nested.md#silence-once
        if (sp.silencedAt !== park) { silenceChild(sp, park, 'absent'); sp.silencedAt = park; }
      }
      setPresent(sp, false, parentPos, 'outside');
      return;
    }
    applyRate(sp);
    // `in` is inclusive on every pass: an arrival (enter actuated within wrapGraceMs) takes the
    // hair-before-`in` lead, a jump folds. An exact-float test failed in wall-clock playback.
    // why: lessons/timeline-nested.md#entry
    const off = sp.loop ? phaseOf(sp, parentPos).off : 0;
    const entryLead = !!(sp.loop && entry && off <= wrapGraceMs);
    sp.deck.seek(sp.loop && (off === 0 || entryLead) ? wrapSeekTarget(sp) : toChild(sp, parentPos));
    // A seek lands in whichever iteration the arithmetic says and folds there; it never wraps.
    // why: lessons/timeline-nested.md#seek-iteration
    if (sp.loop) { sp.iter = iterAt(sp, parentPos); armWrap(sp); }
    sp.silencedAt = null;                    // present again: the fold re-asserts
    setPresent(sp, true, parentPos, 'inside');
    if (parent.playing() && sp.rateReport.chose > 0) sp.deck.play(); else sp.deck.pause();
  }

  const adapter = {
    caps: {
      kind, domain: 'parent', unit: 'ms',
      // The parent's playable rates: each child's rates divided by its span's rate, intersected.
      // A getter (spans arrive later); undefined with no spans.
      // why: lessons/timeline-nested.md#rates
      get rates() {
        if (!spans.size) return undefined;
        const key = (x) => Math.round(x * 1e6) / 1e6;
        let acc = null;
        for (const [, sp] of spans) {
          const allowed = Array.isArray(sp.allowed) ? sp.allowed : null;
          if (!allowed || !allowed.length) continue;
          const r = sp.rate || 1;
          const mine = allowed.map((a) => key(a / r)).filter((x) => x > 0 && Number.isFinite(x));
          acc = acc === null ? mine : acc.filter((x) => mine.includes(x));
        }
        return acc === null ? undefined : acc.sort((a, b) => a - b);
      },
      nested: true, seekable: true, reducible: true,
      clockMaster: false,           // rule 4: never, unless a span opts in
      catchUp: 'reduce',            // a missed span boundary is re-asserted, never burst
      composesRate: true, followsTransport: true,
      syncToleranceMs: toleranceMs, hardSeekMs, maxDepth: MAX_NEST_DEPTH,
      anchor: 'nested-offset (childPos = (parentPos - at) * rate)',
    },
    actuate(p, rec) {
      const sp = spans.get(p.ref);
      // `rec.deltaMs` tells an entry from a seek that lands on the same position.
      // why: lessons/timeline-nested.md#delta
      if (sp) assertSpan(sp, parent.position(), p.phase === 'enter',
        p.phase === 'enter' ? { lateMs: (rec && Number.isFinite(rec.deltaMs)) ? rec.deltaMs : 0 } : null);
    },
    // Play, pause and rate reach the child via caps.followsTransport; never seek or sync.
    // why: lessons/timeline-nested.md#follow
    transport(st) {
      const pos = st.pos;
      for (const [, sp] of spans) {
        if (!inSpan(sp, pos)) {
          if (!otherPresentOn(sp, pos) && sp.deck.playing()) sp.deck.pause();   // rule 7g
          continue;
        }
        const r = applyRate(sp);
        // A span the playhead has not entered must not start, or an event on `c0` fires twice.
        // why: lessons/timeline-nested.md#present
        if (parent.playing() && r.chose > 0 && sp.present !== false) sp.deck.play(); else sp.deck.pause();
        // play/pause/rate move the boundary's WALL time without moving its
        // POSITION, so the committed one-shot has to be re-armed here.
        if (sp.loop) armWrap(sp);
      }
    },
    reduce(payloads, pos) {
      const present = new Set();
      for (const p of payloads) { if (p.phase === 'enter') present.add(p.ref); else present.delete(p.ref); }
      for (const ref of [...present]) {
        const sp = spans.get(ref);
        if (!sp || !inSpan(sp, pos)) present.delete(ref);
      }
      return present;
    },
    assertState(present, info) {
      for (const [ref, sp] of spans) assertSpan(sp, info.pos, present.has(ref));
    },
  };
  const unregister = parent.sched.registerAdapter(kind, adapter);

  // The play/pause/rate follower is adapter.transport() above.
  // why: lessons/timeline-nested.md#follower
  const offState = () => {};

  const nest = {
    kind, adapter, toleranceMs, hardSeekMs,
    /** the deck this nest arranges INTO. A renderer handed a nest needs the
     *  deck whose transport it must step; a nest handed a deck needs nothing.
     *  (`nestOf(parent) === nest` is the other direction of the same edge.) */
    parent,
    // Is the wrap committed ('lookahead') or 'polled'? Offline, polled is a different event set.
    // why: lessons/timeline-nested.md#boundary
    boundary: () => (boundaryHost ? 'lookahead' : 'polled'),

    // Add a span, optionally a fragment (`in`/`out`, default deck.range, or {mark, offset?}), or a
    // quotation value whose deck comes from `resolve`. Throws on a cycle, depth, in >= out, a
    // fragment outside the range, or two quotations of one deck overlapping.
    // why: lessons/timeline-nested.md#add
    add(spec = {}, extra = {}) {
      if (disposed) throw new Error('nest disposed');
      // --- rule 8: a quotation VALUE is an acceptable argument ---------------
      let opts = spec, qval = null;
      if (isQuotation(spec)) {
        qval = spec;
        const res = extra.resolve || resolve;
        const d = extra.deck || (res ? res(qval.ref, qval) : null);
        if (!d) throw new Error(`nest.add: quotation names ref '${qval.ref}' and no resolver supplied a deck for it — ` +
          'pass createNest(parent, {resolve}) or nest.add(q, {resolve}) (a quotation names its source by IDENTITY, never by object)');
        opts = { id: qval.id === null ? undefined : qval.id, at: qval.at, rate: qval.rate, deck: d,
                 master: !!qval.master, in: qval.in, out: qval.out, repeat: qval.repeat,
                 provenance: qval.provenance, meta: qval.meta, ref: qval.ref };
      }
      const { at = 0, rate = 1, deck, master = false } = opts;
      let { id } = opts;
      if (!deck || typeof deck.position !== 'function') throw new Error('nest.add needs a deck');
      if (opts.ref) refDeck(deck, String(opts.ref));
      if (!(rate > 0)) throw new Error('nest.add needs a positive span rate');
      if (id === undefined) id = `n${spans.size}`;
      if (spans.has(id)) throw new Error(`nested span ${id} already exists`);
      const chain = checkNestable(parent, deck);
      if (master && masterId !== null) throw new Error(`nested master already claimed by ${masterId}`);

      // The fragment lives on the span record, never on the child; marks resolve here at add()
      // time.
      // why: lessons/timeline-nested.md#fragment
      const mk = extra.markKind || markKind;
      const [d0, d1] = deck.range;
      const isFrag = opts.in !== undefined || opts.out !== undefined;
      const inA = opts.in === undefined ? null : resolveAddress(deck, opts.in, { kind: mk, where: 'in' });
      const outA = opts.out === undefined ? null : resolveAddress(deck, opts.out, { kind: mk, where: 'out' });
      const wantIn = inA ? inA.at : d0;
      const wantOut = outA ? outA.at : d1;
      const marks = (inA && inA.mark) || (outA && outA.mark)
        ? { in: inA && inA.mark ? inA : null, out: outA && outA.mark ? outA : null } : null;
      if (!Number.isFinite(wantIn) || !Number.isFinite(wantOut))
        throw new Error('nest.add: in/out must be finite positions in the child domain');
      if (wantIn >= wantOut)                                              // 7f
        throw new Error(`nest.add: in (${wantIn}) must be strictly before out (${wantOut})`);
      const c0 = Math.max(d0, Math.min(d1, wantIn));                      // 7e
      const c1 = Math.max(d0, Math.min(d1, wantOut));
      const clamped = c0 !== wantIn || c1 !== wantOut;
      if (!(c1 > c0))
        throw new Error(`nest.add: fragment [${wantIn}, ${wantOut}] lies entirely outside the child's range [${d0}, ${d1}] — nothing to quote`);
      const trim = {
        fragment: isFrag, in: c0, out: c1, wanted: [wantIn, wantOut], chose: [c0, c1],
        deckRange: [d0, d1], clamped, degraded: clamped,
        childDurMs: c1 - c0, quotedFraction: +((c1 - c0) / (d1 - d0)).toFixed(6),
        reason: clamped ? `in/out clamped to the child's range [${d0}, ${d1}]` : null,
      };

      // --- rule 10 / §8: REPEAT. The geometry is score.mjs's, so the value and
      // the live span cannot disagree about how long a loop is. -------------
      const repeat = normalizeRepeat(opts.repeat, `nest.add('${id}').repeat`);
      const geom = repeatGeometry({ in: c0, out: c1, rate, repeat });
      let parentDur = geom.parentDurMs, boundedTo = null;
      if (geom.unbounded) {
        // An unbounded loop is bound to the parent's range, and says so.
        // why: lessons/timeline-nested.md#unbounded
        const hi = parent.range && parent.range[1];
        if (!Number.isFinite(hi))
          throw new Error(`nest.add('${id}'): repeat:'infinite' needs the parent to have a finite range — ` +
            'an unbounded loop is bound to the parent\'s end, and this parent has none. ' +
            'Give the parent a range, or use a bounded repeat (a count or {untilMs}).');
        if (!(hi > at))
          throw new Error(`nest.add('${id}'): repeat:'infinite' at ${at} is at or past the parent's end (${hi}) — nothing would ever play`);
        boundedTo = hi; parentDur = hi - at;
      }

      // Two quotations of one deck may not be present at once; a loop is present for its whole run.
      // why: lessons/timeline-nested.md#overlap
      for (const [oid, o] of spans) {
        if (o.deck !== deck) continue;
        if (at < o.at + o.parentDur - epsMs && o.at < at + parentDur - epsMs)
          throw new Error(`nest.add: deck already quoted by span ${oid} over an OVERLAPPING parent window ` +
            `([${o.at}, ${o.at + o.parentDur}] vs [${at}, ${at + parentDur}]) — a deck has one position; ` +
            `quote non-overlapping fragments, or build a second deck to overlay`);
      }

      const sp = {
        id, at, rate, deck, master: !!master, c0, c1, chain,
        in: c0, out: c1, trim, deckRange: [d0, d1],
        parentDur: 0, present: null, enters: 0, exits: 0, degradations: 0,
        hardSeeks: 0, masterSuspended: 0, parentCorrections: [], childCorrections: [],
        allowed: rateLattice(deck), rateReport: null,
        // rule 8: the ADDRESSES as authored (a mark stays a mark), so toScore()
        // gives back what was written and not what it happened to resolve to.
        marks, quotation: qval,
        // rule 10
        repeat, loop: geom.loop, iterations: geom.iterations, childTotal: geom.childTotal,
        onePassMs: geom.onePassMs, partialLast: geom.partialLast,
        unbounded: geom.unbounded, boundedTo,
        iter: 0, wraps: 0, lastWrap: null, wrapErrors: [], loopLanes: null, loopDegradations: [],
        timerCancel: null, armedFor: null, leadClamped: false,
        quoted: { at, rate, master: !!master, in: opts.in, out: opts.out, repeat,
                  // normalised HERE so a bad @locus / tier is a rejection at add()
                  // time, not a surprise at export time.
                  provenance: normalizeProvenance(opts.provenance, `nest.add('${id}')`),
                  meta: opts.meta ?? null },
        // rule 9
        absent: null, silencedAt: null, silences: 0, absentDegradations: 0,
      };
      sp.parentDur = parentDur;
      sp.endPark = geom.loop && Number.isFinite(geom.childTotal)
        ? c0 + loopPhase(geom.childTotal, c1 - c0, geom.childTotal).off
        : c1;
      spans.set(id, sp);
      if (master) masterId = id;

      if (!CHILDREN.has(parent)) CHILDREN.set(parent, new Set());
      CHILDREN.get(parent).add(deck);
      if (!PARENTS.has(deck)) PARENTS.set(deck, new Set());
      PARENTS.get(deck).add(parent);

      // one span, two items: an interval, not an instant
      // why: lessons/timeline-nested.md#two-items
      parent.schedule({ at, kind, id: `${kind}-${id}-in`,
        payload: { ref: id, phase: 'enter', at, rate, parentDur: sp.parentDur, childRange: [c0, c1],
                   in: c0, out: c1, fragment: isFrag, deckRange: [d0, d1],
                   repeat: repeat ?? null, iterations: geom.iterations, unbounded: geom.unbounded } });
      parent.schedule({ at: at + sp.parentDur, kind, id: `${kind}-${id}-out`,
        payload: { ref: id, phase: 'exit', at, rate, parentDur: sp.parentDur, childRange: [c0, c1],
                   in: c0, out: c1, fragment: isFrag, deckRange: [d0, d1],
                   repeat: repeat ?? null, iterations: geom.iterations, unbounded: geom.unbounded } });

      applyRate(sp);
      if (!otherPresentOn(sp, parent.position())) sp.deck.pause();   // rule 7g
      if (sp.loop) armWrap(sp);
      return sp;
    },

    /** THE SERVO. Call it from the loop you already run (rAF / interval).
     *  Returns the number of corrections this tick. No timers live in here. */
    servo() {
      if (disposed) return 0;
      servoTicks++;
      const pos = parent.position();
      let n = 0;
      for (const [, sp] of spans) {
        if (!inSpan(sp, pos)) continue;
        // The wrap as arithmetic: a long blur is one re-seek, never replayed passes. With a
        // boundary host
        // this is only the backstop, and only forward.
        // why: lessons/timeline-nested.md#backstop
        if (sp.loop && parent.playing() && sp.rateReport && sp.rateReport.chose > 0) {
          const it = iterAt(sp, pos);
          if (it > sp.iter) { wrapSpan(sp, it, pos, boundaryHost ? 'late' : 'polled'); n++; continue; }
          if (!sp.timerCancel) armWrap(sp);
        }
        // A degraded child cannot master; mastering is suspended and counted.
        // why: lessons/timeline-nested.md#degraded-master
        const masters = sp.master && !(sp.rateReport && sp.rateReport.degraded);
        if (sp.master && !masters) sp.masterSuspended++;
        if (masters) {
          // rule 4: the parent slaves to the CHILD'S POSITION. Whatever masters
          // the child (a media element) governs only within the child.
          if (!parent.playing() || !sp.deck.playing()) continue;
          const c = parent.sync(toParent(sp, sp.deck.position()), { toleranceMs });
          if (c) { push(sp.parentCorrections, +c.toFixed(2)); n++; }
        } else {
          if (!parent.playing() || !sp.deck.playing()) continue;
          const want = toChild(sp, pos);
          const err = sp.deck.position() - want;
          if (Math.abs(err) > hardSeekMs) { sp.deck.seek(want); sp.hardSeeks++; n++; }
          else { const c = sp.deck.sync(want, { toleranceMs }); if (c) { push(sp.childCorrections, +c.toFixed(2)); n++; } }
        }
      }
      return n;
    },

    span: (id) => spans.get(id) || null,
    spans: () => [...spans.values()],
    masterId: () => masterId,
    /** the child position the parent's playhead currently implies */
    childPos: (id) => { const sp = spans.get(id); return sp ? toChild(sp, parent.position()) : null; },
    // The inverse map; `iter` picks the repetition (the offline renderer expands loops with it).
    // why: lessons/timeline-nested.md#parent-pos
    parentPos: (id, cpos, iter) => { const sp = spans.get(id); return sp ? toParent(sp, cpos, iter === undefined ? (sp.iter || 0) : iter) : null; },
    present: (id) => { const sp = spans.get(id); return !!(sp && inSpan(sp, parent.position())); },
    rateReport: (id) => { const sp = spans.get(id); return sp ? sp.rateReport : null; },
    /** rule 7: the quoted fragment [in, out] in the CHILD's domain, and the
     *  honest report of any clamping that produced it. */
    fragment: (id) => { const sp = spans.get(id); return sp ? [sp.c0, sp.c1] : null; },
    trim: (id) => { const sp = spans.get(id); return sp ? sp.trim : null; },
    // every span quoting this deck
    // why: lessons/timeline-nested.md#quotations-of
    quotationsOf: (deck) => [...spans.values()].filter((sp) => sp.deck === deck),

    // --- rule 10 / §8: THE LOOP --------------------------------------------

    // Everything a loop is, reported: repeat, pass length in both domains, phase, wraps, carry
    // lanes,
    // boundedness and joint.
    // why: lessons/timeline-nested.md#loop
    loop(id) {
      const sp = spans.get(id);
      if (!sp) return null;
      return {
        id: sp.id, repeat: sp.repeat ?? null, loop: sp.loop,
        iterations: sp.iterations, lengthMs: sp.c1 - sp.c0,
        onePassParentMs: sp.onePassMs, parentDurMs: sp.parentDur,
        partialLast: sp.partialLast,
        unbounded: sp.unbounded, boundedTo: sp.boundedTo,
        iter: sp.iter, wraps: sp.wraps, lastWrap: sp.lastWrap,
        // the gate's answer: is the wrap COMMITTED at the instant, or discovered
        // by the client's loop one period late?
        boundary: boundaryHost ? 'lookahead' : 'polled',
        armedFor: sp.armedFor, leadClamped: sp.leadClamped,
        lanes: sp.loopLanes || (sp.loop ? (sp.loopLanes = loopLanes(sp.deck)) : null),
        degradations: sp.loopDegradations, errors: sp.wrapErrors.slice(),
        // No crossfade: a blend across a splice is a tier-1 reconstruction lane, or the source's
        // job.
        // why: lessons/timeline-nested.md#joint
        joint: 'cut',
        jointNote: 'hard cut. A crossfade at the wrap is INTERPOLATION ACROSS A SPLICE — §5b tier 1 — and must be appended as a derived lane with {tier, method, confidence} or declared on the source adapter, never configured here.',
      };
    },
    // A wrap is a callback, never a row, so an infinite loop is not an infinite log.
    // why: lessons/timeline-nested.md#on-wrap
    onWrap(cb) { wrapCbs.add(cb); return () => wrapCbs.delete(cb); },
    // {span, ref, present, parentPos, reason ('inside'|'outside'|'sibling'), enters, exits}.
    // why: lessons/timeline-nested.md#on-presence
    onPresence(cb) { presenceCbs.add(cb); return () => presenceCbs.delete(cb); },
    /** the current repetition index (0-based) of a looping span */
    iteration: (id) => { const sp = spans.get(id); return sp ? (sp.loop ? iterAt(sp, parent.position()) : 0) : null; },
    /** the parent position at which repetition `iter` of `id` begins */
    iterationAt: (id, iter) => { const sp = spans.get(id); return sp ? sp.at + iter * sp.onePassMs : null; },

    // nest.renderBound() -> {from, to} for renderDeck; throws LOOP_UNBOUNDED for an infinite loop.
    // why: lessons/timeline-nested.md#render-bound
    renderBound({ until } = {}) {
      const un = [...spans.values()].filter((sp) => sp.unbounded);
      if (un.length && until === undefined) {
        const e = new Error(
          `renderBound: span(s) [${un.map((s) => s.id).join(', ')}] carry repeat:'infinite'. ` +
          'An offline render has no "until someone stops it" — it is a fixed number of frames by construction. ' +
          'Pass {until: <parent ms>} to name the end yourself, or give the quotation a bounded repeat ' +
          '(a count, or {untilMs}). The relay reached the same conclusion from the other side: there is no ' +
          '-stream_loop anywhere in the lineage, because a source that must never end is GENERATED, not repeated.');
        e.code = 'LOOP_UNBOUNDED';
        e.spans = un.map((s) => s.id);
        throw e;
      }
      const all = [...spans.values()];
      if (!all.length) return { from: parent.range[0], to: parent.range[1], spans: 0, unbounded: [] };
      const from = Math.min(...all.map((sp) => sp.at));
      const to = until !== undefined ? Number(until)
        : Math.max(...all.map((sp) => sp.at + sp.parentDur));
      if (!Number.isFinite(from) || !Number.isFinite(to) || !(to >= from))
        throw new Error(`renderBound: derived a non-finite window [${from}, ${to}]`);
      return { from, to, spans: all.length, unbounded: un.map((s) => s.id), until: until ?? null };
    },

    // --- rule 8: a quotation is a VALUE ------------------------------------

    // The JSON-safe quotation value for one span; a mark keeps `wasAt` so a moved mark is reported.
    // why: lessons/timeline-nested.md#quotation
    quotation(id) {
      const sp = spans.get(id);
      if (!sp) return null;
      const ref = deckRef(sp.deck);
      if (!ref) throw new Error(`nest.quotation('${id}'): the quoted deck has no identity. ` +
        `Name it — refDeck(deck, '<ref>') or nest.add({…, ref:'<ref>'}) — because a quotation names its source by identity, never by object.`);
      const stamp = (addr, m) => (isMarkAddress(addr) && m ? { ...addr, wasAt: m.at } : addr);
      return quotation({
        id: sp.id, ref, at: sp.quoted.at, rate: sp.quoted.rate, master: sp.quoted.master,
        in: stamp(sp.quoted.in, sp.marks && sp.marks.in), out: stamp(sp.quoted.out, sp.marks && sp.marks.out),
        repeat: sp.quoted.repeat,                                   // rule 10
        provenance: sp.quoted.provenance, meta: sp.quoted.meta,
      });
    },
    // A live arrangement to a value loadScore() reads back.
    // why: lessons/timeline-nested.md#to-score
    toScore(opts = {}) {
      return score({ id: opts.id, meta: opts.meta,
        quotations: [...spans.keys()].map((id) => nest.quotation(id)) });
    },
    /** rule 8: how a span's mark addresses resolved (and whether they moved) */
    marks: (id) => { const sp = spans.get(id); return sp ? sp.marks : null; },
    /** rule 9: what the child did when this span went absent */
    absent: (id) => { const sp = spans.get(id); return sp ? sp.absent : null; },

    /** rule 5: NESTED stats. The child's drift channel stays in the child's
     *  domain; the parent gets a table of spans, not an average. */
    driftStats() {
      return {
        kind, servoTicks, depth: 1 + depth(parent, kids),
        spans: [...spans.values()].map((sp) => ({
          id: sp.id, at: sp.at, rate: sp.rate, master: sp.master,
          parentDurMs: +sp.parentDur.toFixed(3), childRange: [sp.c0, sp.c1],
          fragment: sp.trim.fragment ? [sp.c0, sp.c1] : null, deckRange: sp.deckRange, trim: sp.trim,
          loop: sp.loop ? nest.loop(sp.id) : null,
          marks: sp.marks, absent: sp.absent, silences: sp.silences,
          absentDegradations: sp.absentDegradations,
          present: sp.present, enters: sp.enters, exits: sp.exits,
          rate_composition: sp.rateReport, degradations: sp.degradations,
          hardSeeks: sp.hardSeeks, masterSuspended: sp.masterSuspended,
          parentCorrections: { n: sp.parentCorrections.length, ...pstats(sp.parentCorrections.map(Math.abs)) },
          childCorrections: { n: sp.childCorrections.length, ...pstats(sp.childCorrections.map(Math.abs)) },
          child: nestedDrift(sp.deck),
        })),
      };
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      offState(); unregister();
      for (const [, sp] of spans) {
        const cs = CHILDREN.get(parent); if (cs) cs.delete(sp.deck);
        const ps = PARENTS.get(sp.deck); if (ps) ps.delete(parent);
      }
      for (const [, sp] of spans) disarmWrap(sp);
      spans.clear(); masterId = null;
      NESTS.delete(parent);
    },
  };
  // Registered at creation, so an empty nest is still found by the renderer.
  // why: lessons/timeline-nested.md#register
  NESTS.set(parent, nest);
  return nest;
}

function push(arr, v) { arr.push(v); if (arr.length > 400) arr.shift(); }

// One deck's drift with its nest, recursively; never averaged across domains.
// why: lessons/timeline-nested.md#nested-drift
export function nestedDrift(deck) {
  const rows = typeof deck.drift === 'function' ? deck.drift() : [];
  const byKind = {};
  for (const r of rows) (byKind[r.kind] = byKind[r.kind] || []).push(r.deltaMs);
  const out = { fires: rows.length, range: deck.range, pos: +deck.position().toFixed(2),
    rate: deck.rate(), targetRate: deck.targetRate(), playing: deck.playing(), kinds: {} };
  for (const [k, xs] of Object.entries(byKind)) out.kinds[k] = pstats(xs);
  const n = NESTS.get(deck);
  if (n) out.nested = n.driftStats();
  return out;
}
