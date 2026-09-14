// proto/loops/loops.mjs — the two pieces plan-timeline §8.5 says the score
// layer gets FOR FREE, built as the one thing they actually are: a quotation
// with `repeat`.
//
// DOM-free on purpose. index.html runs this on the wall clock with audio and a
// strip; verify.mjs runs the SAME functions on a virtual clock and measures
// them. One implementation, so the page cannot show a number the headless run
// did not earn.
//
// ---------------------------------------------------------------------------
// PHASING — Reich, *It's Gonna Rain* (1965), as arithmetic
// ---------------------------------------------------------------------------
// §8.5: "we already proved *the same deck quoted twice*. Quote it twice at rate
// 1.0 and 1.002 and that is Reich." Almost — and the almost is the interesting
// part. nested.mjs rule 7g forbids two quotations of ONE deck from overlapping
// in parent time, because *a deck has one position*; its error message already
// says what to do ("build a second deck to overlay"). So phasing is two DECKS
// over one tape, not one deck quoted twice. Reich needed two tape machines for
// exactly the same reason, and it is the same reason: a playback head has one
// position. The abstraction reproduced the physical constraint without being
// told about it.
//
// THE ORIGIN IS EPOCH-ANCHORED, not first-event-anchored. tracker's rule is
// "any beat can be beat 0" (origin = the first real event); proto/jam/jam-core
// .js's is "the beat boundary is a property of the wall clock, not of either
// peer". For phasing the second is the right one: two processes launched
// minutes apart land on the same phase with zero negotiation, so the drift
// measured here is reproducible across machines rather than per-run.
//
// THE PROOF is that the drift is `(rate − 1) · elapsed` and nothing else. Not
// approximately — that is the closed form of the modulo map, and any deviation
// is servo error, which is the number worth reporting.
//
// ---------------------------------------------------------------------------
// DISINTEGRATION — Basinski, *The Disintegration Loops* (2001), as evidence
// ---------------------------------------------------------------------------
// §8.5: "a loop whose Nth repetition applies one more tier of reconstruction is
// Basinski as an evidence gradient: iteration 1 is attested, iteration 12 is
// mostly dreamed, and the strip's hatching shows it happening."
//
// Built with the firewall that already exists and no new machinery: each
// iteration's material is appended by a REGISTERED RECONSTRUCTOR
// (`deck.registerReconstructor`) into its own derived lane, carrying real
// {source, method, tier, confidence, refs}. The attested lane is never touched
// — lane purity is enforced by transport.mjs, not by discipline — so the
// evidence-only toggle plays iteration 1's tape at iteration 12, unchanged.
// `deck.evidenceAccounting()` is then the invented-percentage, computed by the
// library, and it is the piece: **the composition IS the decay of its own
// provenance.**
//
// Source material: a SYNTHETIC tone row, not proto/aikajana's corpus. The
// corpus is metadata-only — its 13 playable items are `media: {url}` references
// to archive.org MP3s, streamed cross-origin — so a Kurenniemi disintegration
// would measure the network, not the loop, and could not run headless. A tone
// row makes the evidence gradient exactly countable, which is the whole point.
//
// WHY IT IS BOUNDED (`repeat: 12`) AND NOT INFINITE: a loop that READS is free
// (see NOTES: the resident page set is constant at any repeat count), but a
// loop that WRITES at every wrap is an infinite log. §8.7 asked what a loop
// means for the store; this is the half of the answer that bites.

import { createDeck } from '../../timeline/transport.mjs';
import { createNest } from '../../timeline/nested.mjs';
import { refDeck } from '../../timeline/score.mjs';

// ===========================================================================
// PHASING
// ===========================================================================

export const LOOP_MS = 2000;          // the loop, and the shared epoch grid
export const RATE_B = 1.002;          // Reich's second machine, 0.2 % fast

/** Eight hits over two seconds — an uneven figure, so the phase is audible as
 *  the pattern smearing into itself rather than as a flam. */
export const TAPE = [0, 190, 400, 620, 900, 1180, 1440, 1730]
  .map((at, i) => ({ at, kind: 'hit', id: `h${i}`, payload: { i, f: 440 * Math.pow(2, [0, 3, 5, 7, 5, 3, 10, 7][i] / 12) } }));

/** jam-core's rule: the boundary belongs to the WALL CLOCK, not to a peer.
 *  Two processes that call this with any instant inside the same 2 s cell get
 *  the same origin, so the phase is shared with no negotiation at all. */
export function epochAnchoredAt(epochMs, gridMs = LOOP_MS) {
  return Math.ceil(epochMs / gridMs) * gridMs;
}

export function buildPhasing({
  clock, newHost, onHit = null, rateB = RATE_B, loopMs = LOOP_MS,
  originEpochMs = Date.now(), horizonMs = 60 * 60 * 1000,
} = {}) {
  const mk = (name) => {
    const d = createDeck({
      // THE RANGE STARTS AT THE SPLICE, one unit before `in`. A wrap seeks a
      // hair before `in` so the downbeat sitting exactly ON `in` is still
      // pending and fires; if `in` were the range start that seek would clamp
      // and the downbeat would be folded away at every pass. The nest reports
      // the clamp when it happens (`nest.loop(id).leadClamped`); this is what
      // avoiding it looks like.
      clock, tickHost: newHost(), range: [-1, loopMs],
      items: TAPE.map((t) => ({ ...t })),
      adapters: {
        hit: {
          // edge-valued, and it declares so: a hit is an attack, and no amount
          // of "current state" recreates one you missed.
          caps: { catchUp: 'reduce', reducible: true, seekable: true, valued: 'edge', deterministic: true,
                  rates: null, absentState: 'hold' },
          actuate(p, rec) { onHit && onHit(name, p, rec); },
          reduce(payloads) { return payloads.length; },
          assertState() {},
        },
      },
    });
    return d;
  };
  const a = mk('a'), b = mk('b');
  refDeck(a, 'tape-a'); refDeck(b, 'tape-b');

  const at = epochAnchoredAt(originEpochMs, loopMs);
  const parent = createDeck({ clock, tickHost: newHost(), range: [at, at + horizonMs], items: [] });
  // `tickHost` is what makes the wrap a COMMITTED boundary rather than a polled
  // one: without it the loop point is discovered by servo() up to one client
  // loop late, and the head of every pass is folded instead of fired.
  const nest = createNest(parent, { toleranceMs: 5, hardSeekMs: 250, tickHost: newHost() });
  // THE WHOLE DEMO IS THESE TWO LINES.
  nest.add({ id: 'A', at, rate: 1, deck: a, in: 0, out: loopMs, repeat: 'infinite' });
  nest.add({ id: 'B', at, rate: rateB, deck: b, in: 0, out: loopMs, repeat: 'infinite' });

  /** The child's position UNWRAPPED — repetition index × loop length plus where
   *  it is inside the pass. Measured from the DECK, never from the map, so the
   *  residual below is real servo error and not a tautology. */
  // `nest.loop(id).iter` is the repetition the CHILD'S POSITION belongs to —
  // the span's own committed count — not the one the parent's arithmetic
  // implies. At a boundary those two disagree for as long as the wrap is in
  // flight, and using the arithmetic one puts a whole loop length of phantom
  // drift into the measurement exactly at the instant that matters most.
  const unwrapped = (id, deck) => nest.loop(id).iter * loopMs + deck.position();

  return {
    parent, nest, decks: { a, b }, at, loopMs, rateB,
    /** one row of the measurement */
    sample() {
      const elapsed = parent.position() - at;
      const ua = unwrapped('A', a), ub = unwrapped('B', b);
      const drift = ub - ua;
      const predicted = (rateB - 1) * elapsed;
      return {
        elapsed, ua, ub, drift, predicted, residual: drift - predicted,
        // what you HEAR: the phase inside one pass, and how far through the
        // 1000-second cycle back to unison we are.
        phaseMs: ((drift % loopMs) + loopMs) % loopMs,
        cycleFraction: (((drift % loopMs) + loopMs) % loopMs) / loopMs,
        unisonInMs: (loopMs - (((drift % loopMs) + loopMs) % loopMs)) / (rateB - 1),
        iterA: nest.iteration('A'), iterB: nest.iteration('B'),
        wrapsA: nest.loop('A').wraps, wrapsB: nest.loop('B').wraps,
      };
    },
    /** least-squares slope of drift against elapsed, through the origin —
     *  the fit whose answer must be exactly (rateB − 1). */
    fit(rows) {
      let sxx = 0, sxy = 0;
      for (const r of rows) { sxx += r.elapsed * r.elapsed; sxy += r.elapsed * r.drift; }
      const slope = sxy / sxx;
      const res = rows.map((r) => r.drift - slope * r.elapsed);
      const abs = res.map(Math.abs).sort((x, y) => x - y);
      return {
        n: rows.length, slope, expected: rateB - 1,
        slopeErrorPpm: (slope - (rateB - 1)) * 1e6,
        residualP50: abs[Math.floor(abs.length * 0.5)] || 0,
        residualP95: abs[Math.floor(abs.length * 0.95)] || 0,
        residualMax: abs[abs.length - 1] || 0,
      };
    },
    dispose() { nest.dispose(); a.dispose(); b.dispose(); parent.dispose(); },
  };
}

// ===========================================================================
// DISINTEGRATION
// ===========================================================================

export const DIS_ITERS = 12;
/** Eight partials of one chord, two seconds. Attested, tier 0, and never
 *  touched again by anything below. */
export const PARTIALS = [
  { at: 0, f: 110 }, { at: 240, f: 165 }, { at: 480, f: 220 }, { at: 720, f: 275 },
  { at: 960, f: 330 }, { at: 1200, f: 440 }, { at: 1440, f: 550 }, { at: 1680, f: 660 },
];

/** §5b's spectrum, one tier per third of the piece. */
export const tierOf = (iter, iters = DIS_ITERS) => (iter <= iters / 3 ? 1 : iter <= (2 * iters) / 3 ? 2 : 3);
export const METHOD = {
  1: 'linear-partial-interpolation',       // between two attested partials
  2: 'spectral-inpainting',                // plausible, not attested
  3: 'generative-infill',                  // a new work conditioned on the trace
};

export function buildDisintegration({
  clock, newHost, onTone = null, iters = DIS_ITERS, loopMs = 2000,
} = {}) {
  const child = createDeck({
    clock, tickHost: newHost(), range: [-1, loopMs],       // -1 = the splice; see buildPhasing
    items: PARTIALS.map((p, i) => ({ at: p.at, kind: 'tone', id: `t${i}`, payload: { f: p.f, g: 1, i } })),
    // §5b: registering a reconstructor is exactly what makes a policy
    // necessary, and the API forces the choice rather than defaulting.
    evidence: 'all',
    adapters: {
      tone: {
        caps: { catchUp: 'reduce', reducible: true, seekable: true, valued: 'edge', deterministic: true },
        actuate(p, rec) { onTone && onTone({ ...p, tier: 0, lane: 'tone' }, rec); },
        reduce(payloads) { return payloads.length; },
        assertState() {},
      },
    },
  });
  refDeck(child, 'tone-row-1');

  // one reconstructor per repetition, each one tier deeper into the spectrum
  const recs = [];
  for (let k = 1; k <= iters; k++) {
    const tier = tierOf(k, iters);
    const conf = +Math.max(0.02, 1 - k / iters).toFixed(3);
    const name = `erode-${k}`;
    const into = `tone~${name}`;
    const rc = child.registerReconstructor(name, {
      from: 'tone', into, tier, method: METHOD[tier],
      // WHERE to invent: one row per gap, marching across the gap as the piece
      // decays, so each repetition lays its material somewhere new.
      plan: ({ aAt, bAt }) => [aAt + (bAt - aAt) * (0.2 + 0.6 * ((k - 1) / Math.max(1, iters - 1)))],
      // WHAT to invent: the two neighbours, detuned and dimmed by how far into
      // the decay we are. Tier 3 stops pretending to be between them at all.
      derive: (pos, ctx) => ({
        f: tier < 3 ? (ctx.a.f + ctx.b.f) / 2 * (1 + 0.03 * k)
                    : ctx.a.f * Math.pow(2, ((k * 7) % 12) / 12),
        g: +Math.max(0.08, 1 - k / (iters + 2)).toFixed(3),
        iter: k, tier,
      }),
      confidence: () => conf,
      actuate: (p, rec) => {
        // ⚠ THE FIREWALL IS A READ-SIDE FIREWALL. `window`/`reduce`/`sampleAt`
        // are gated by the evidence policy; ACTUATION is not — nothing in
        // transport.mjs stops a derived lane from FIRING under 'attested'. So
        // an evidence-only PERFORMANCE is the adapter's job, and this is it.
        // (Reported as a seam; see NOTES.md.)
        const ev = child.evidence();
        if (ev && ev.maxTier < tier) return;
        onTone && onTone({ ...p, lane: into, method: METHOD[tier] }, rec);
      },
    });
    recs.push({ k, tier, conf, rc, into, ran: false, emitted: 0 });
  }

  const parent = createDeck({ clock, tickHost: newHost(), range: [0, (iters + 1) * loopMs], items: [] });
  const nest = createNest(parent, { toleranceMs: 5, hardSeekMs: 250, tickHost: newHost() });
  // BOUNDED, and the bound is the point: this loop APPENDS at every wrap.
  nest.add({ id: 'D', at: 0, rate: 1, deck: child, in: 0, out: loopMs, repeat: iters });

  const perIteration = [];
  /** `rep` is 1-based: repetition 1 is the attested tape, and repetition N has
   *  had N−1 reconstructors run over it. */
  const snapshot = (rep) => {
    const iter = rep - 1;
    const acct = child.evidenceAccounting();
    const row = {
      repetition: rep, iteration: iter,
      attested: acct.attested, restored: acct.restored, total: acct.total,
      inventedFraction: acct.inventedFraction,
      inventedPct: +(acct.inventedFraction * 100).toFixed(1),
      byTier: { ...acct.byTier },
      lanes: acct.lanes.length,
      tier: iter > 0 ? tierOf(iter, iters) : 0,
      method: iter > 0 ? METHOD[tierOf(iter, iters)] : 'attested',
      confidence: iter > 0 ? recs[iter - 1].conf : 1,
    };
    perIteration.push(row);
    return row;
  };
  snapshot(1);                                   // repetition 1 is attested

  // THE WRAP IS THE TAPE PASSING THE HEAD. One more tier of reconstruction is
  // appended per repetition, by a registered reconstructor, with provenance.
  const offWrap = nest.onWrap((info) => {
    if (info.span !== 'D') return;
    const r = recs[info.to - 1];
    if (!r || r.ran) return;
    const res = r.rc.run();
    r.ran = true; r.emitted = res.emitted;
    snapshot(info.to + 1);
  });

  return {
    parent, nest, child, recs, iters, loopMs, perIteration,
    accounting: () => child.evidenceAccounting(),
    /** the lanes a strip should draw: the attested one, then every derived lane
     *  that exists yet. Lanes are QUERIES, so this is just a list of kinds. */
    lanes: () => ['tone', ...recs.filter((r) => r.ran).map((r) => r.into)],
    provenance: () => child.provenanceOf(),
    /** §5b's reversibility, and the evidence-only toggle's honest twin */
    setEvidence: (p) => child.setEvidence(p),
    evidence: () => child.evidence(),
    dispose() { offWrap(); nest.dispose(); child.dispose(); parent.dispose(); },
  };
}
