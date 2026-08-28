// timeline/nested.mjs — COMPOSITION ACROSS TIMELINES: a span that is itself a
// deck. The last structural piece of the library (PROGRESS 6q).
//
// Four clients in, every one of them could put *media* on a timeline and none
// of them could put a *timeline* on a timeline. `transport.sync()` slaves a
// vector to exactly one external master, and a deck's position is a single
// scalar — so "a stored instrument session dropped into an arrangement beside a
// 1965 broadcast" had no representation. It does now:
//
//     nest.add({ id, at, rate, deck })                // a nested/offset span
//     nest.add({ id, at, rate, deck, in, out })       // …QUOTING A FRAGMENT
//
// One transport drives another DECK's position instead of an element's
// currentTime, through the SAME sync() contract. Everything below is the
// consequence of that one sentence.
//
// THE RULES, stated once and enforced here:
//
// 1. POSITION DOMAINS DO NOT MIX. The child's position domain is its own (its
//    `range`, whatever units and origin it chose). The parent maps
//        childPos = clamp(child.range, child.range[0] + (parentPos - at) * rate)
//    and the span occupies (child.range[1]-child.range[0])/rate ms of PARENT
//    time. Outside that window the child is ABSENT — paused, and asserted at
//    the boundary it left through. Absence is content.
//
// 2. RATE COMPOSES MULTIPLICATIVELY, AND DEGRADES OUT LOUD. The child's
//    effective rate is parentRate × span.rate. The child's own adapters
//    declare what they can honestly play (`caps.rates`); the intersection of
//    those is the child's rate lattice. If the composed rate is not on it we
//    choose the nearest *in log space* and SAY SO — `span.rateReport` carries
//    {wanted, chose, degraded, allowed}, and the servo's correction count is
//    the price of the lie we did not tell. Rate 0 (pause) is always
//    expressible and never degrades.
//
// 3. SEEK IN THE PARENT IS A SEEK IN THE CHILD — a real `deck.seek()`, not a
//    `sync()`. That is what makes reduce-on-seek run *inside* the nested span,
//    so `assertState(reduce(prefix ≤ t))` still holds one level down (held
//    notes are re-asserted, media elements are re-anchored). `sync()` is
//    reserved for the servo: a correction must never re-fire anything.
//
// 4. A NESTED CHILD NEVER MASTERS THE PARENT'S CLOCK — unless the span is
//    declared `master: true`, and at most one span per parent may be. The
//    default is `follow`: the parent leads, the child is slaved (sync inside
//    the dead band, a real seek past `hardSeekMs`). With `master: true` the
//    direction reverses and the important half of the rule applies: if the
//    child contains its own clock master (a media element inside the session),
//    that master governs ONLY WITHIN THE CHILD — the parent slaves to the
//    CHILD'S POSITION, never to the element. One indirection, and the two
//    masters cannot fight: the element moves the child's vector, the child's
//    vector moves the parent's.
//
// 5. DRIFT NESTS, IT DOES NOT FLATTEN. `nest.driftStats()` returns the parent's
//    span table with each child's own drift channel (and ITS nest, recursively)
//    hanging off it. A p95 measured across two position domains would be a
//    number about nothing.
//
// 6. CYCLES ARE REJECTED AT `add()` TIME, not discovered at play time. A deck
//    may not contain itself, nor any of its ancestors. Depth is capped at
//    MAX_NEST_DEPTH (8 decks in a chain) — the limit exists because seek and
//    assert recurse through the whole chain synchronously.
//
// 7. A SPAN QUOTES A FRAGMENT, NOT A WHOLE. `add({… in, out})` selects a
//    sub-range of the CHILD's domain, and that is the whole point of the
//    format: plan-timeline §−1 says a new work is a score that QUOTES archive
//    timelines, and nobody quotes a whole broadcast. `in`/`out` default to the
//    child's own `range`, so rule 1 is the special case `in = c0, out = c1`.
//
//    a. The span occupies `(out - in) / rate` of PARENT time.
//    b. `in` IS the child's start for this span: entry seeks the child to `in`
//       and asserts there, exactly as the whole-range case asserts at `c0`.
//    c. `out` IS the child's end: past it the child is absent, parked and
//       asserted at `out`.
//    d. A parent seek anywhere inside maps to `in + (parentPos - at) * rate`,
//       exactly (the same affine map, with a different origin).
//    e. `in`/`out` outside the child's range CLAMP, and the clamp is REPORTED
//       (`span.trim` / `nest.trim(id)` carries {wanted, chose, clamped,
//       reason}) — never silently. A fragment entirely outside the range is a
//       rejection, not a clamp to nothing.
//    f. `in >= out` is rejected at `add()`.
//    g. **TRIM DOES NOT MUTATE THE CHILD.** The fragment lives on the SPAN
//       record; `deck.range` is untouched. That is what lets the SAME deck be
//       quoted twice, at two different fragments, in one arrangement — the
//       "timelines referencing timelines" case, and the thing trim is FOR. The
//       consequence enforced below: a span that is ABSENT must not park or
//       pause the child when a SIBLING quotation of that same deck is present
//       (`otherPresentOn`), and two quotations of one deck may not OVERLAP in
//       parent time — a deck has one position, so an overlap is not a trim
//       problem but an arithmetic impossibility, and it is rejected at add().
//
// No timers live in here (the vector law): `servo()` is called by the client's
// existing rAF/interval loop, exactly like the media servo every media client
// already runs.
//
// Plain ESM, browser+node, no deps beyond the library itself.

import { pstats } from './logdeck.mjs';

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

/** Throws if linking parent -> child would make a cycle or exceed the depth
 *  cap. Exported so a client can ask before it builds. */
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

/**
 * @param parent  a deck (createDeck / makeLogDeck). It must have a `range`
 *                covering the nested spans. Either declare it at construction,
 *                or — since transport v0.5 — call `parent.setRange('auto')`
 *                after the last `nest.add()`: add() schedules the span's two
 *                items, so the derived range already covers them.
 * @param kind    the parent-domain event kind for nested spans
 * @param toleranceMs  servo dead band, both directions (sync's toleranceMs)
 * @param hardSeekMs   follow mode: past this error, seek the child instead
 */
export function createNest(parent, {
  kind = 'deck-span',
  toleranceMs = 40,
  hardSeekMs = 250,
  epsMs = 0.5,
} = {}) {
  const spans = new Map();     // id -> span record
  let masterId = null, servoTicks = 0, disposed = false;

  const parentDurOf = (sp) => (sp.c1 - sp.c0) / sp.rate;
  const inSpan = (sp, pos) => pos >= sp.at - epsMs && pos <= sp.at + sp.parentDur + epsMs;
  // rule 7d: the fragment map. c0 IS `in`, so this is the whole-range map with
  // a different origin — and it stays exact because it is still one multiply.
  const toChild = (sp, pos) => Math.max(sp.c0, Math.min(sp.c1, sp.c0 + (pos - sp.at) * sp.rate));
  const toParent = (sp, cpos) => sp.at + (cpos - sp.c0) / sp.rate;

  /** rule 7g: is some OTHER span quoting the SAME deck present right now? If so
   *  this span's absence is not the child's absence, and must not touch it. */
  const otherPresentOn = (sp, pos) => {
    for (const [, o] of spans) if (o !== sp && o.deck === sp.deck && inSpan(o, pos)) return o;
    return null;
  };
  /** distance from `pos` to a span's parent window (0 = inside) */
  const distTo = (sp, pos) => (pos < sp.at ? sp.at - pos : Math.max(0, pos - (sp.at + sp.parentDur)));
  /** rule 7g: when EVERY quotation of a deck is absent they would all want to
   *  park it, at different edges, and the last writer would win at random. The
   *  child parks at the edge of the quotation the playhead is NEAREST to (ties
   *  go to insertion order) — deterministic, and the edge you actually left. */
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

  function applyRate(sp) {
    const r = composeRate(parent.targetRate(), sp.rate, sp.allowed);
    if (r.degraded && (!sp.rateReport || sp.rateReport.chose !== r.chose)) sp.degradations++;
    sp.rateReport = r;
    if (r.chose > 0 && Math.abs(sp.deck.targetRate() - r.chose) > 1e-9) sp.deck.setRate(r.chose);
    return r;
  }

  /** Put the child exactly where the parent says it should be. This IS what a
   *  seek means one level down (rule 3) — a real child seek, so the child's own
   *  reduce/assertState runs and holds. */
  function assertSpan(sp, parentPos, present) {
    const inside = present && inSpan(sp, parentPos);
    if (!inside) {
      // rule 7g: a sibling quotation of the same deck owns the child right now.
      // Parking would drag it out from under the span that IS present.
      if (otherPresentOn(sp, parentPos)) {
        if (sp.present !== false) { sp.present = false; sp.exits++; }
        return;
      }
      if (sp.deck.playing()) sp.deck.pause();
      // Leave through the boundary we actually left through, so the child's
      // reducer asserts the edge state. With a fragment those boundaries are
      // `in` and `out` (rule 7b/7c), not the deck's own ends.
      //
      // This used to be inside `if (sp.present !== false)` — i.e. it parked
      // ONLY on the present -> absent transition. Fragments made the bug
      // visible: play past a span (parked at `out`, present=false), then seek
      // to BEFORE it, and the child stayed at `out` because the transition had
      // already been spent. Absence is a POSITION, not an edge event, so the
      // park is now driven by where the child actually is.
      const park = parentPos < sp.at ? sp.c0 : sp.c1;
      if (parksIt(sp, parentPos) && sp.deck.position() !== park) sp.deck.seek(park);
      if (sp.present !== false) { sp.present = false; sp.exits++; }
      return;
    }
    applyRate(sp);
    sp.deck.seek(toChild(sp, parentPos));
    if (sp.present !== true) { sp.present = true; sp.enters++; }
    if (parent.playing() && sp.rateReport.chose > 0) sp.deck.play(); else sp.deck.pause();
  }

  const adapter = {
    caps: {
      kind, domain: 'parent', unit: 'ms',
      nested: true, seekable: true, reducible: true,
      clockMaster: false,           // rule 4: never, unless a span opts in
      catchUp: 'reduce',            // a missed span boundary is re-asserted, never burst
      composesRate: true, followsTransport: true,
      syncToleranceMs: toleranceMs, hardSeekMs, maxDepth: MAX_NEST_DEPTH,
      anchor: 'nested-offset (childPos = (parentPos - at) * rate)',
    },
    actuate(p) {
      const sp = spans.get(p.ref);
      if (sp) assertSpan(sp, parent.position(), p.phase === 'enter');
    },
    /** play / pause / rate are NOT seeks — nothing re-asserts on them, but the
     *  child still has to follow the parent's transport (rule 4, follow half).
     *  This used to be a hand-written `parent.transport.onState()` filter here;
     *  since v0.4 the library reads `caps.followsTransport` and delivers exactly
     *  play/pause/rate (never 'seek' — that is reduce+assertState — and never
     *  'sync': a servo correction must not cascade). */
    transport(st) {
      const pos = st.pos;
      for (const [, sp] of spans) {
        if (!inSpan(sp, pos)) {
          if (!otherPresentOn(sp, pos) && sp.deck.playing()) sp.deck.pause();   // rule 7g
          continue;
        }
        const r = applyRate(sp);
        if (parent.playing() && r.chose > 0) sp.deck.play(); else sp.deck.pause();
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

  // (the play/pause/rate follower is adapter.transport() above — v0.4's
  // caps.followsTransport, which is exactly this filter, written once.)
  const offState = () => {};

  const nest = {
    kind, adapter, toleranceMs, hardSeekMs,

    /** Add a nested/offset span, optionally QUOTING A FRAGMENT of the child
     *  (`in`/`out`, rule 7). Throws on cycle / depth (rule 6), on `in >= out`,
     *  on a fragment wholly outside the child's range, and on two quotations of
     *  one deck overlapping in parent time.
     *
     *  @param opts {id, at, rate, deck, in, out, master}
     *              `in`/`out` are positions in the CHILD's domain and default
     *              to `deck.range` — the whole-range case is the default case.
     */
    add(opts = {}) {
      const { at = 0, rate = 1, deck, master = false } = opts;
      let { id } = opts;
      if (disposed) throw new Error('nest disposed');
      if (!deck || typeof deck.position !== 'function') throw new Error('nest.add needs a deck');
      if (!(rate > 0)) throw new Error('nest.add needs a positive span rate');
      if (id === undefined) id = `n${spans.size}`;
      if (spans.has(id)) throw new Error(`nested span ${id} already exists`);
      const chain = checkNestable(parent, deck);
      if (master && masterId !== null) throw new Error(`nested master already claimed by ${masterId}`);

      // --- rule 7: the fragment. The child is NEVER touched: everything below
      // lands on the SPAN record, so one deck can carry many quotations. ------
      const [d0, d1] = deck.range;
      const isFrag = opts.in !== undefined || opts.out !== undefined;
      const wantIn = opts.in === undefined ? d0 : +opts.in;
      const wantOut = opts.out === undefined ? d1 : +opts.out;
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

      // 7g: one deck has ONE position — two quotations of it may not be present
      // at the same parent instant. That is arithmetic, not policy.
      const parentDur = (c1 - c0) / rate;
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
      };
      sp.parentDur = parentDurOf(sp);
      spans.set(id, sp);
      if (master) masterId = id;

      if (!CHILDREN.has(parent)) CHILDREN.set(parent, new Set());
      CHILDREN.get(parent).add(deck);
      if (!PARENTS.has(deck)) PARENTS.set(deck, new Set());
      PARENTS.get(deck).add(parent);
      NESTS.set(parent, nest);

      // one span, TWO items — a span is an interval, not an instant
      parent.schedule({ at, kind, id: `${kind}-${id}-in`,
        payload: { ref: id, phase: 'enter', at, rate, parentDur: sp.parentDur, childRange: [c0, c1],
                   in: c0, out: c1, fragment: isFrag, deckRange: [d0, d1] } });
      parent.schedule({ at: at + sp.parentDur, kind, id: `${kind}-${id}-out`,
        payload: { ref: id, phase: 'exit', at, rate, parentDur: sp.parentDur, childRange: [c0, c1],
                   in: c0, out: c1, fragment: isFrag, deckRange: [d0, d1] } });

      applyRate(sp);
      if (!otherPresentOn(sp, parent.position())) sp.deck.pause();   // rule 7g
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
        // A DEGRADED CHILD CANNOT MASTER. If the composed rate had to be
        // rounded onto the child's lattice, the child is running at a rate the
        // parent did not ask for — letting it drive the parent's clock would
        // silently impose that rate on the whole arrangement. So mastering is
        // SUSPENDED for as long as the degradation lasts: the parent leads, the
        // child is re-anchored by sync corrections, and the suspension is
        // counted (`masterSuspended`) rather than hidden.
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
    parentPos: (id, cpos) => { const sp = spans.get(id); return sp ? toParent(sp, cpos) : null; },
    present: (id) => { const sp = spans.get(id); return !!(sp && inSpan(sp, parent.position())); },
    rateReport: (id) => { const sp = spans.get(id); return sp ? sp.rateReport : null; },
    /** rule 7: the quoted fragment [in, out] in the CHILD's domain, and the
     *  honest report of any clamping that produced it. */
    fragment: (id) => { const sp = spans.get(id); return sp ? [sp.c0, sp.c1] : null; },
    trim: (id) => { const sp = spans.get(id); return sp ? sp.trim : null; },
    /** every span quoting this deck — the "one timeline, many quotations" read */
    quotationsOf: (deck) => [...spans.values()].filter((sp) => sp.deck === deck),

    /** rule 5: NESTED stats. The child's drift channel stays in the child's
     *  domain; the parent gets a table of spans, not an average. */
    driftStats() {
      return {
        kind, servoTicks, depth: 1 + depth(parent, kids),
        spans: [...spans.values()].map((sp) => ({
          id: sp.id, at: sp.at, rate: sp.rate, master: sp.master,
          parentDurMs: +sp.parentDur.toFixed(3), childRange: [sp.c0, sp.c1],
          fragment: sp.trim.fragment ? [sp.c0, sp.c1] : null, deckRange: sp.deckRange, trim: sp.trim,
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
      spans.clear(); masterId = null;
      NESTS.delete(parent);
    },
  };
  return nest;
}

function push(arr, v) { arr.push(v); if (arr.length > 400) arr.shift(); }

/** One deck's drift channel, with ITS nest hanging off it — recursively.
 *  Never averaged across domains (rule 5). */
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
