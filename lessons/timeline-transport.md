# timeline-transport

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `timeline/transport.mjs`

### header

Above `// ---------------------------------------------------------------------------`, lines 1 to 207 before the cut.

~~~js
// timeline/transport.mjs — transport vector + wall-lane lookahead scheduler +
// audio lane. Plain ESM, browser+node, no deps. Seeded by plan-timeline §1/§4
// and the graveyard laws in research/timeline-own-prior-art-2026-08.md §2:
//   - NO timers inside the vector; position(now) is pure math over {p0,t0,rate}.
//   - Lookahead loop + committed-vs-pending with cancel (never per-event
//     fan-out armed at play — that corpse is reproduced in
//     createFanoutScheduler below, for measurement only).
//   - Drift channel first-class: every fire logs {intendedT, firedT, deltaMs};
//     position observable is separate from event callbacks.
//   - Explicit catch-up policy per kind: 'burst' | 'drop' | {reduce}.
//   - The log is immutable; cursor/status state lives here, never on stored
//     payloads (statuses live on scheduler-private wrappers).
// Measured defaults (tick 25 ms / horizon 100 ms) validated by timeline/lab.
//
// v0.2 — the six API seams the first two clients (proto/jam, proto/selfrec)
// hit, all closed in-library (see proto/jam/NOTES.md C11 for the field report):
//   1. registerAdapter(kind, {actuate, caps, reduce, assertState}) + dispatch —
//      clients no longer filter onFire or wire setPolicy themselves.
//   2. setRate() no longer doubles as play(); .targetRate exposes the resume
//      rate so a PAUSED ui can display 0.5× instead of 0.00×.
//   3. createScheduler defaults to the WORKER tick host — the lab VERDICT —
//      with main/raf as explicit opt-ins (hostKind or an explicit host).
//   4. caps.audio = {ctx, leadMs} gives actuate() a third `when` argument
//      carrying the fire's instant in AudioContext seconds: sample-accurate
//      voices scheduled straight from the wall lane.
//   5. reduce() is handed the WHOLE ordered prefix (plus an explicit
//      {from:{pos,state}, since} pair), not one scan's missed events — correct
//      for non-commutative reducers.
//   6. onDrift()/peekDrift() read the drift channel non-destructively (HUD and
//      assert harness can coexist); drainDrift() stays for bounded memory.
//   +  transport.sync(pos) slaves the vector to an external clock master (a
//      media element) without seek semantics; createDeck() is the facade.
//
// v0.4 — CONTINUOUS KINDS are first-class. The first four clients were all
// discrete (a note fires, a tile appears, a cue lands); proto/paths brought the
// first kind whose state is defined BETWEEN samples and filed six seams
// (proto/paths/NOTES.md §3). All six are closed here:
//   C1. deck.sampleAt(kind, pos) — the interpolated value at ANY position,
//       O(1) amortised through a per-kind CURSOR (binary search on seek, linear
//       advance on play). Driving an interpolator from reduceAt() at 60 Hz would
//       reproduce demo10's per-frame-recompute-over-an-unbounded-array defect
//       inside the library; this is the read that does not.
//   C2. deck.bracket(kind, pos) -> {prev, a, b, next, u, …} for clients that
//       want the raw pair (and prevs/nexts for higher-order interpolators).
//   C3. interpolate(a, b, u, ctx) with ctx = {prev, next, pos, dtMs, …}. A
//       spline is NOT a function of two samples: the old 2-arg signature
//       silently forced every C1 interpolator to degrade to linear.
//       caps.neighbourhood = k asks for k extra samples EACH SIDE of the pair
//       (0 = two-sample, 1 = one each side = Catmull-Rom, …).
//   C4. info.next / info.nexts in reduce. PREFIX PURITY, SHARPENED: for a
//       DISCRETE kind the reducer is a pure function of the prefix (SEAM 5,
//       unchanged); for a CONTINUOUS kind the state at t is a function of the
//       prefix PLUS THE SUCCESSOR — the sample straddling t on the right, which
//       is by construction absent from the prefix. Without info.next an
//       interpolated reduce is not expressible at all.
//   C5. THE CAPS ARE ACTUALLY READ: continuous, interpolate, interpolators,
//       neighbourhood and followsTransport. An adapter declaring
//       caps.followsTransport gets adapter.transport({reason,playing,rate,…})
//       on play/pause/rate (never on seek — seek is reduce+assertState — and
//       never on sync — a correction must not cascade), which is the onState
//       reason-filter three clients had each rewritten by hand.
//   C6. DEGRADE HONESTLY, out loud: when a client asks for something the
//       adapter's caps refuse, deck.request(kind, want) answers in nested.mjs's
//       shape — {wanted, chose, degraded, reason} — and every implicit
//       degradation is recorded in deck.degradations(kind).
// NOT done, deliberately: the library does NOT own a render tick. Rendering
// cadence belongs to the client; observePosition() already serves anyone who
// wants a 60 Hz pull, and a library-owned rAF would be a second timer inside a
// library whose first law is that the vector has no timers.
//
// v0.5 — THE EVIDENCE FIREWALL (plan-timeline §5b). v0.4 made a continuous kind
// interpolate; §5b names what that IS: interpolation is the first tier of a
// restoration spectrum (1 interpolation → 2 inpainting → 3 generative infill),
// ONE mechanism at three declared tiers, and a system that serves restored
// material without saying so is lying by omission. Four things close it:
//   E1. PROVENANCE IS A FIELD, not a convention. A derived row carries
//       {source: 'reconstructor-<name>', method, confidence, tier, refs, from};
//       an ATTESTED row carries none of it, and `row.provenance === undefined`
//       is therefore the definition of attested — distinguishable by
//       construction, not by a flag someone can forget to set.
//   E2. LANE PURITY + APPEND-ONLY. A reconstructor APPENDS a derived lane; it
//       may never write into its evidence lane, and an attested row may never
//       be appended to a derived lane (scheduleEvent throws both ways). The
//       master trace is never rewritten, so DELETING A RESTORATION IS DROPPING
//       ITS LANE — reversibility for free, and provable: the master's rows are
//       the same objects in the same order before, during and after.
//   E3. THE POLICY IS FORCED, NOT DEFAULTED. sampleAt / reduceAt / window /
//       bracket take {evidence}: 'attested' | {restored:{maxTier:n}} | 'all'.
//       Resolution is per-call → explicit deck policy (createDeck({evidence}))
//       → THROW. There is no silent default; the only omission that is answered
//       is one whose answer is provably identical under all three policies
//       (policyMatters() below), which is not a default but a proof.
//   E4. degradations() IS THE HONESTY LEDGER. Asking `attested` of a kind that
//       can only answer by inventing returns the last ATTESTED sample plus a
//       {wanted, chose, degraded, reason} report — the same shape C6 already
//       used — and asking for a tier the deck does not hold, or querying a lane
//       whose tier exceeds the policy, is reported the same way. A lane over
//       the cap is EXCLUDED, never quietly down-mixed.
// Tier 1 ships as a real reconstructor (registerReconstructor: the interpolator
// sampleAt already is, appended as rows). Tiers 2 and 3 are UNIMPLEMENTED BY
// DESIGN — they are the same seam, not the same code: a tier ≥ 2 registration
// must bring its own derive(), and the library refuses to guess one.
//
// v0.6 — UNCERTAINTY AS POSITION (plan-timeline §7.4, §−1's founding ask: "a
// smear, not a fake instant"; research/spatiotemporal-uncertainty-2026-08.md).
// `at` does NOT become a distribution. It stays one scalar, and every hot loop
// (insertInto, afterIdx, createCursor's bsearch, scan's `ev.at > horizonPos`
// early exit, reconcile) is byte-for-byte unchanged. Four things close it:
//   U1. THE ROW SHAPE. One optional frozen sibling `when = {verbatim, edtf,
//       earliest, latest, innerFrom, innerTo, rule, kind, note}` (§8.1).
//       ABSENCE OF `when` IS THE CRISP FAST PATH — exactly as absence of
//       `provenance` is the definition of attested. TWO ABSENCES, TWO AXES:
//       an uncertain ATTESTED row is tier 0 with a wide bracket, a precise
//       RESTORED row is tier 1 with no bracket at all, and neither restriction
//       may imply the other. `when` is normalized and FROZEN PER ROW, never
//       interned (CRM: one shared Time-Span asserts simultaneity).
//   U2. THE FIRING RULE: `at = when.earliest`, ALWAYS, resolved ONCE at ingest
//       by a VERSIONED NAMED RULE recorded on the row (DarwinCore's
//       `georeferenceProtocol`). It is one-sided sound — `earliest <= true
//       position` is a theorem, not an estimate — and it gives the existing
//       `ev.at <= pos` a true semantics: "POSSIBLY already occurred by pos",
//       the *possible* half of Allen, for free. The anchoring is REPORTED, not
//       silent: degradations() gains a fourth literal, 'anchored'.
//   U3. THE QUERY KNOB. window(kind, a, b, {certainty:'possible'|'necessary'}).
//       possible = the bracket OVERLAPS the range (Postgres &&); necessary =
//       the range CONTAINS the row's certain extent — the INNER bracket
//       (Y @> cert), because `Y @> outer` under-reports. Unlike the evidence
//       policy this knob DEFAULTS rather than throws: silence here
//       over-includes, it does not fabricate. Where 'necessary' genuinely
//       cannot be decided (no inner bracket, outer not contained) the row is
//       excluded AND the undecidability is reported ('unanswerable').
//   U4. positionAccounting(kind?) — the position-axis twin of
//       evidenceAccounting(), reported BY RULE, so "43 % of this lane is
//       positioned by a padding artefact" is a number someone can see (NSSDA's
//       discipline: publish the accuracy statement or declare it untested).
// Also closed here, because they degraded QUIETLY and caps exist to prevent
// exactly that:
//   U5. caps.series(payload) — bracketing used to group by KIND, so a
//       multi-controller lane's "straddling pair" could be two different
//       controllers. sampleAt/bracket now ride a PER-SERIES sub-lane when the
//       adapter declares one, and an omitted {series} on a lane that declares
//       caps.series is reported instead of silently answering nonsense.
//   U6. TWO-PHASE SEEK — JACK's slow-sync barrier. Opt-in per adapter
//       (caps.slowSync), non-blocking (the locate happens immediately; only
//       ROLLING waits), FAIL-OPEN on timeout (laggards catch up, and the
//       timeout is on the record), re-armed by a locate mid-roll, and carrying
//       Ardour's LocateTransportDisposition {MustRoll, MustStop,
//       RollIfAppropriate} in the seek request.
// DEFERRED, explicitly (research §8.6): space entirely; the trapezoid interior
// (innerFrom/innerTo are STORED and read only by the necessary predicate and a
// renderer's core/skirt split — no membership functions, no fuzzified Allen);
// NON-CONTIGUOUS brackets (EDTF's `[1821,1822,1830..1832]` / `1984-X1` — a
// `when` bracket is CONTIGUOUS and that is NOT a guarantee about the world);
// Monte Carlo; competing authorities (one `when` per row); transaction time;
// and `when` on spans (the span type does not exist yet).
//
// v0.7 — THE FIRE-SIDE FIREWALL and deck.assertState (plan-timeline §8.8's two
// named seams). v0.5's firewall gates READS. It does not gate ACTUATION, so an
// evidence-only PERFORMANCE — the thing a heritage institution would stand
// behind — was the adapter's own job, i.e. unenforced. Measured on the shipped
// code: under `evidence:'attested'` a tier-3 generative lane fired 3/3 of its
// rows, and a seek pushed a state folded from those same rows into
// `adapter.assertState()` while `deck.reduceAt()` for that lane returned null.
// ONE LANE, TWO ANSWERS, decided by which door the query came through.
//   G1. ACTUATION HAS TWO DOORS, and both are now gated: `fire()` (the
//       scheduled actuation) and `applyReduce()`'s `assertState()` call (the
//       seek/catch-up actuation). A lane whose tier exceeds the policy is
//       REFUSED at both, exactly as `window()` EXCLUDES it.
//   G2. UNCONDITIONAL, NOT `caps.evidenceGated`. An opt-in cap reproduces the
//       `caps.series` failure with the sign flipped: the safe behaviour would
//       depend on every adapter author remembering to declare it, and the
//       guarantee an archive needs cannot rest on that. It is also unnecessary:
//       the gate can only bite where the client ALREADY made §5b's forced
//       choice (an unset policy is EV_UNSET, maxTier Infinity, nothing gated),
//       so it never surprises a client who never chose. And it costs nothing:
//       LANE PURITY means the gate is a per-LANE Set, so the hot path is
//       `gatedKinds.size !== 0` — one integer compare for every deck that holds
//       no restoration at all, which is every deck that existed before v0.5.
//   G3. REFUSED, NEVER SILENT. A gated row takes a new terminal status
//       'gated' — it is not fired, not dropped and not reduced — and the
//       refusal surfaces three ways: `degradations()` in the same
//       {wanted, chose, degraded, reason} shape, `gateAccounting()`, and the
//       `onGate()` channel. It emits NO drift row, because drift is the record
//       of what reached a transducer and a refusal did not; that absence is
//       what makes the actuation trace of an 'attested' deck BIT-IDENTICAL to
//       the trace of a deck from which the derived lanes were physically
//       removed.
//   G4. TIGHTENING MID-PLAY RE-ASSERTS. `setEvidence()` is a state change, not
//       a filter: a lane that becomes gated is asked to go quiet
//       (`caps.absentState:'silence'` → `silence({reason:'evidence-gated'})`;
//       without the cap it HOLDS and says so), and a lane that becomes ungated
//       is re-asserted at the playhead (reduce + assertState) so it catches up
//       on the prefix it was refused. Committed one-shots on a newly gated lane
//       are cancelled at the transition, so the tighten is immediate rather
//       than one tick late.
//   G5. deck.assertState(kind, state, info) — §7.5's DAW "MIDI chase" / ETC
//       Eos "Assert", at the DECK level: push authoritative state IN without
//       replaying a prefix (after an external sync, a media-master handover, a
//       policy change, a loop wrap). It moves the reduce snapshot to
//       {pos, state}, so a forward-folding reducer's `info.from`/`info.since`
//       continue from the assertion. It writes NO drift row (an assert has no
//       event and no intended instant; a synthetic row would poison every
//       lateness statistic in the repo). Verification is OPT-IN
//       (`{verify:true}`): checking costs exactly the fold assertState exists
//       to avoid, and unlike the evidence policy, silence here cannot fabricate
//       — the caller IS the authority. When asked, a disagreement with
//       reduce(<= pos) is reported as 'asserted-over'.
~~~

### clocks

Above `export function wallClock() {`, lines 209 to 213 before the cut.

~~~js
// ---------------------------------------------------------------------------
// Clocks. A ClockSource is {domain, now()} with now() in *milliseconds* float
// (µs resolution preserved in the fraction). Wall = epoch-anchored monotonic
// (steal #8: performance.timeOrigin + performance.now(), never Date.now()).
// ---------------------------------------------------------------------------
~~~

### audio-clock

Above `export function audioClock(ctx) {`, lines 219 to 222 before the cut.

~~~js
/** Audio-domain clock over an AudioContext, with a wall<->audio anchor.
 *  now() returns wall-equivalent ms derived from ctx.currentTime, so a
 *  transport on this clock advances on the audio hardware clock.
 *  reanchor() re-samples the mapping (call sparingly; drift is the point). */
~~~

### transport

Above `export function createTransport({ clock = wallClock() } = {}) {`, lines 246 to 258 before the cut.

~~~js
// ---------------------------------------------------------------------------
// Transport vector. State is exactly {p0, t0, rate}; position is pure math.
// rate === 0 means paused; play() restores the last nonzero rate.
//
// SEAM 2 (client feedback C11.2): setRate() used to double as play() — there
// was no set-rate-while-paused and `lastRate` was private, so a paused UI could
// only ever display 0.00×. Now:
//   setRate(r)  sets the rate WITHOUT starting playback (paused stays paused);
//               setRate(0) is still an explicit pause.
//   play(r?)    is the only thing that starts motion (optionally at rate r).
//   .rate       current effective rate (0 while paused) — unchanged.
//   .targetRate the rate play() would resume at — what a paused UI displays.
// ---------------------------------------------------------------------------
~~~

### sync

Above `sync(pos, { toleranceMs = 0 } = {}) {`, lines 297 to 302 before the cut.

~~~js
/** Slave the vector to an EXTERNAL clock master (a media element, a remote
 *  peer) — re-anchor {p0,t0} onto an observed position WITHOUT seek
 *  semantics: no status reconcile, no re-assert, nothing re-fires; only
 *  committed timers are re-armed against the new anchor. Corrections
 *  smaller than toleranceMs are ignored (don't churn the lookahead).
 *  Returns the correction actually applied, in ms. */
~~~

### tick-hosts

Above `/** (a) main-thread setTimeout/setInterval host — tightest in the foreground`, lines 323 to 327 before the cut.

~~~js
// ---------------------------------------------------------------------------
// Tick hosts. A TickHost is {start(onTick, tickMs), stop(), setTimer(delayMs,
// fn) -> cancelFn}. The scheduler only ever talks to time through its clock
// and its host — which is what makes the virtual runtime (below) possible.
// ---------------------------------------------------------------------------
~~~

### main-host

Above `export function mainTickHost() {`, lines 329 to 331 before the cut.

~~~js
/** (a) main-thread setTimeout/setInterval host — tightest in the foreground
 *  (6.4 ms p95 measured) but dies to the 1 Hz clamp in a hidden tab; an
 *  explicit opt-in since v0.2 (SEAM 3). */
~~~

### raf-host

Above `export function rafTickHost() {`, lines 375 to 377 before the cut.

~~~js
/** (c) rAF-driven host — the anti-pattern for background tabs, measured
 *  anyway. Ticks on every frame; "timers" fire on the first frame past their
 *  deadline (frame-quantized, dies entirely when the tab is hidden). */
~~~

### default-host

Above `export function defaultTickHost() {`, lines 401 to 406 before the cut.

~~~js
/** SEAM 3: the SHIPPING default host. The lab VERDICT is worker (the only host
 *  that survives a hidden tab: 8.5 ms p95 hidden vs main ~1 s, rAF 9.2 s), so
 *  the code default is worker wherever Worker exists, and main is an explicit
 *  opt-in (`host: mainTickHost()` or `hostKind: 'main'`) for foreground-
 *  critical precision (6.4 vs 15.3 ms p95, measured). Outside a browser there
 *  is no Worker — fall back to the main-thread host. */
~~~

### cursor

Above `export function createCursor(rows, { key = (r) => r.at, linearWindow = 4 } = {})`..., lines 417 to 429 before the cut.

~~~js
// ---------------------------------------------------------------------------
// THE CURSOR (v0.4, C1). "The pair of samples straddling pos" is the one read a
// continuous kind makes constantly — once per rendered frame, per lane. Done by
// rescanning it is O(n) per frame over an unbounded array: demo10's defect. Done
// by a cursor it is O(1) amortised while playing forward (the index advances by
// ~1 per frame), O(log n) on a seek, and it degrades to a binary search rather
// than a walk on random access. The scheduler runs one of these per continuous
// kind; it is exported because a client's OWN un-logged lanes (ground truth, an
// analysis track) want exactly the same read and should not re-write it.
//
// `comparisons` counts every probe of a row's time — that is what makes
// "this is not O(n)" an assertion in prop-test rather than a claim.
// ---------------------------------------------------------------------------
~~~

### bracket

Above `bracket(pos, nbr = 0) {`, lines 465 to 468 before the cut.

~~~js
/** {i, u, pos, a, b, prev, next, prevs, nexts, aAt, bAt, dtMs} | null.
 *  u is clamped to [0,1]: before the first sample and after the last one the
 *  bracket degenerates to the terminal pair (u = 0 / u = 1), so a caller
 *  never has to special-case the ends. */
~~~

### evidence

Above `export function normalizeEvidence(p, where = 'evidence') {`, lines 502 to 517 before the cut.

~~~js
// ---------------------------------------------------------------------------
// THE EVIDENCE POLICY (v0.5, plan-timeline §5b). Three declared forms, one
// canonical shape {mode, maxTier, label}:
//
//   'attested'                 nothing invented. maxTier 0 — and note that this
//                              EXCLUDES interpolation, which is tier-1
//                              restoration however cheap it looks.
//   {restored:{maxTier: n}}    restoration up to tier n:
//                              1 interpolation (bounded by evidence both sides)
//                              2 inpainting     (context + priors)
//                              3 generative     (detail never captured)
//   'all'                      every tier, and unqualified interpolation too.
//
// There is deliberately NO fourth form and no boolean shorthand: a policy that
// can be written `true` is a policy nobody reads.
// ---------------------------------------------------------------------------
~~~

### when

Above `export const WHEN_KINDS = ['ignorance', 'vagueness'];`, lines 532 to 569 before the cut.

~~~js
// ---------------------------------------------------------------------------
// THE POSITION BRACKET (v0.6, U1 — research §8.1). Nine fields, no more:
//
//   verbatim   EXACTLY what the source said ('Esmaeeter 4. jaanuar 1965',
//              '1965-07-15', 'sometime that spring'). Never normalised, never
//              dropped — it is the evidence that the rule fired, and the only
//              way to re-audit which rows we reinterpreted.
//   edtf       the honest re-expression ('1965', '1971-21?'), or null.
//   earliest   CLOSED-open transport ms. THE indexed bound, and the anchor.
//   latest     the open upper bound, or null for an OPEN end (EDTF '..').
//              open (still running) and unknown (we lost it) are different
//              facts; null here means open, and `rule` carries which.
//   innerFrom  CRM P81a — null when there is no known inner bound. CRM Issue
//   innerTo    CRM P81b — 288: not instantiating P81 is CORRECT when nothing is
//              known. innerFrom > innerTo is LEGAL, not a bug: it degenerates
//              the trapezoid to a triangle, i.e. "no known inner bound".
//   rule       the VERSIONED NAMED RULE that produced the bracket and the
//              anchor — DarwinCore's `georeferenceProtocol`. Required.
//              'err-july15-padding@1', 'wikidata-precision@1', 'edtf-l1@1'.
//              Two reserved unversioned literals: 'hand' (a human typed it)
//              and 'unknown' (genuinely unbounded). Everything else MUST carry
//              @<int>, because when a heuristic changes the affected rows have
//              to be one `WHERE rule = …` away.
//   kind       'ignorance' (a fact of the matter exists and the catalogue lost
//              it — narrowing is a REPAIR) | 'vagueness' (no fact of the matter
//              — narrowing is a FALSIFICATION). Same bracket, opposite
//              affordances; the transport treats them identically (a vague
//              event still has to sort) and only the UI cares.
//   note       DarwinCore's `georeferenceRemarks`: the assumption made.
//
// NOT here, deliberately: `confidence`. provenance.confidence is a number in
// [0,1] about FABRICATION; position uncertainty is a bracket, not a scalar, and
// no mature standard in the survey emits a confidence number for it.
//
// The returned object is a FRESH FROZEN COPY on every call. Never interned:
// sharing one uncertainty object between two rows asserts they are simultaneous
// (CIDOC E52 scope note), which is a claim no ingest ever means to make.
// ---------------------------------------------------------------------------
~~~

### crm

Above `for (const [k, v] of [['innerFrom', innerFrom], ['innerTo', innerTo]]) {`, lines 595 to 597 before the cut.

~~~js
// CRM's four-date constraints — MINUS the one that is deliberately absent.
// P82a <= P81a, P82a <= P81b, P81a <= P82b, P81b <= P82b are real; asserting
// P81a <= P81b is a BUG, not a validation (§3).
~~~

### fresh

Above `return Object.freeze({`, lines 616 to 616 before the cut.

~~~js
// A FRESH object every call — never interned (§3's CRM trap).
~~~

### certainty

Above `export function normalizeCertainty(c, where = 'certainty') {`, lines 624 to 628 before the cut.

~~~js
/** U3 — the certainty knob. Unlike the evidence policy this DEFAULTS instead of
 *  throwing: 'possible' never omits a row that really is in the window, so a
 *  silent default here over-includes; it cannot fabricate. The asymmetry is the
 *  point — forced choice where silence mixes in dreamed data, safe default
 *  where silence merely widens the net. */
~~~

### scheduler

Above `export function createScheduler(transport, {`, lines 636 to 659 before the cut.

~~~js
// ---------------------------------------------------------------------------
// Wall-lane scheduler: lookahead loop, committed-vs-pending, per-kind catch-up
// policies, first-class drift log, ADAPTER REGISTRY. Port of the timed-messages
// crossing engine generalized per plan-timeline §1.
//
// SEAM 1 — adapter registry. Clients think in per-kind adapters; the library
// used to offer only unfiltered onFire + setPolicy, so every client re-wrote
// the same dispatch/filter/policy-wiring block. registerAdapter() now lives
// here:
//     sched.registerAdapter(kind, {
//       caps,                       // {catchUp, audio, rates, continuous,
//                                   //  interpolate, interpolators, neighbourhood,
//                                   //  followsTransport, …} — declares behaviour
//       actuate(payload, rec, when),// called ONLY for this kind
//       reduce(payloads, pos, info),// catch-up + seek fold (whole prefix, SEAM 5;
//                                   //  + info.next/info.nexts, C4)
//       assertState(state, info),   // idempotent state assertion
//       interpolate(a, b, u, ctx),  // CONTINUOUS kinds only (C1/C3)
//       transport(state),           // caps.followsTransport only (C5)
//     }) -> unregister
// caps.catchUp ('burst' | 'drop' | 'reduce') selects the per-kind policy, so a
// client never touches setPolicy either. onFire stays, for HUDs and harnesses
// that want every kind.
// ---------------------------------------------------------------------------
~~~

### host-kind

Trailing comment on line 665 before the cut.

~~~js
hostKind,            // 'worker' | 'main' | 'raf' — explicit opt-in shorthand
~~~

### gated-kinds

Above `let gatedKinds = new Set();`, lines 691 to 698 before the cut.

~~~js
// G1/G2 — THE FIRE-SIDE FIREWALL. `gatedKinds` is the set of lanes whose
// ACTUATION the current policy refuses. It is a per-LANE set and not a
// per-row test because of LANE PURITY (a lane is attested or derived, never
// both) — the same invariant that makes the read side O(1). The hot path in
// scan()/fire() is therefore `gatedKinds.size !== 0`: one integer compare for
// every deck that holds no restoration, which is every deck that existed
// before v0.5. Recomputed only when the lane set changes (a first derived row
// or a tier rise) or the policy changes — never per row, never per tick.
~~~

### assert-log

Above `const assertLog = [];`, lines 705 to 706 before the cut.

~~~js
// G5 — the assert channel. Deliberately NOT the drift channel: a drift row is
// {id, at, intendedUs, deltaMs} for one EVENT, and an assert has no event.
~~~

### pos-for

Above `function posFor(kind) {`, lines 742 to 748 before the cut.

~~~js
/** U4 — the POSITION ledger, the exact twin of laneProv on the other axis.
 *  Counters only (O(1) per row); medians are computed by scanning the lane at
 *  report time, because positionAccounting() is a reporting call and a
 *  parallel span array would double the deck's memory for a number nobody
 *  reads at 60 Hz. `maxSpan` is load-bearing beyond reporting: it is how far
 *  BACK a certainty query has to scan (the interval-index trick), and a lane
 *  with maxSpan 0 — i.e. every lane that existed before v0.6 — costs nothing. */
~~~

### log-drift

Above `function logDrift(rec) {`, lines 793 to 797 before the cut.

~~~js
/** SEAM 6: drift is a CHANNEL, not a mailbox — subscribers see every row and
 *  peekDrift() is non-destructive, so a HUD and an assert harness can both
 *  observe the same fires. drainDrift() stays, for bounded memory; the
 *  retained buffer is also capped at driftLimit so a peek-only client cannot
 *  grow it without bound (drops are counted, never silent). */
~~~

### audio-when

Above `function audioWhen(ad, rec) {`, lines 804 to 812 before the cut.

~~~js
/** SEAM 4: wall -> audio bridge. The wall lane hands actuate() an instant;
 *  an adapter that declares caps.audio = {ctx, leadMs?} additionally gets a
 *  `when` object carrying that instant in AudioContext seconds, so a
 *  sample-accurate voice can be start()ed FROM THE WALL LANE. The conversion
 *  is free: the drift record already knows how early/late this fire is
 *  (deltaMs), and ctx.currentTime sampled at the same instant is the audio
 *  domain's "now" — so intended-in-audio = ctx.currentTime - deltaMs/1000.
 *  A negative delta (fired early, the normal lookahead case) leaves positive
 *  headroom: `when.earlyMs`. Opt-in per adapter; nothing else pays for it. */
~~~

### fire-gate

Above `if (gatedKinds.size !== 0 && gatedKinds.has(ev.kind)) return gateRefuse(ev, orig`..., lines 826 to 830 before the cut.

~~~js
// G1 — the first of actuation's two doors. One integer compare when nothing
// is gated; a Set hit otherwise. scan() refuses earlier still (so no timer
// is ever armed for a gated row), but this guard is load-bearing and not
// belt-and-braces: a committed one-shot armed BEFORE a mid-play tighten, and
// the overdub path in scheduleEvent(), both arrive here directly.
~~~

### public-ev

Above `const publicEv = (ev) => {`, lines 856 to 862 before the cut.

~~~js
/** E1: an ATTESTED row has no `provenance` key AT ALL. That absence is the
 *  definition of attested — not a flag, not `provenance: null`, nothing to
 *  forget to set and nothing a payload can spoof (the key is injected by the
 *  library, after the payload, and only when the row really is derived).
 *  U1: `when` is the SECOND absence, on the OTHER axis. A crisp row has no
 *  `when` key; a row may carry either, both or neither, and no query may
 *  read one as evidence about the other. */
~~~

### schedule-event

Above `function scheduleEvent({ at, kind = 'default', id, payload, provenance, when }) `..., lines 871 to 877 before the cut.

~~~js
/** E1/E2. The ONE place a row enters the log — and therefore the one place
 *  LANE PURITY is enforced: a lane is attested or derived, never both. That
 *  single invariant is what makes the firewall O(1) (a lane's tier is the
 *  lane's, not a per-row scan) and what makes §5b's reversibility claim
 *  *provable* rather than asserted: a restoration lives in its own lane, so
 *  deleting it is dropping that lane, and the master trace's rows are the same
 *  objects in the same order before, during and after. */
~~~

### firing-rule

Above `const w = normalizeWhen(when, 'schedule({kind:'${kind}'}).when');`, lines 880 to 891 before the cut.

~~~js
// U2 — THE FIRING RULE, and it is the whole of it: `at = when.earliest`,
// resolved ONCE, here, by the named rule the row carries. One-sided sound
// (`earliest <= true position` is a theorem), so `ev.at <= pos` keeps a TRUE
// meaning — "possibly already occurred by pos" — instead of a fictional one.
// Rejected: a midpoint (that is the `07-15` disease with our name on it and
// it supports no inference), the inner bound (frequently absent, and a
// stronger claim than the outer bound), render-only-never-fire (prefixEvents
// folds every row with at <= pos, so a non-firing row hands a reducer a
// positionless payload AND vanishes from evidenceAccounting — silently
// shrinking the archive under exactly the query the firewall protects), and
// a per-kind caps policy (the transport has ONE ordering key; two lanes
// disagreeing about what `at <= pos` means makes window() ill-defined).
~~~

### lane-tier

Above `if (prov && (derivedBefore === 0 || lp.tier !== tierBefore)) recomputeGate('lane`..., lines 947 to 950 before the cut.

~~~js
// G2: the gated-lane set only ever changes when a lane BECOMES derived or
// its tier RISES — one recompute per lane over a whole restoration, not one
// per row. Must run before the overdub fire below, which goes through the
// gate like any other actuation.
~~~

### scan-gate

Above `if (gating && gatedKinds.has(ev.kind)) { gateRefuse(ev, 'scan'); continue; }`, lines 1000 to 1002 before the cut.

~~~js
// G1 — refuse HERE rather than at the commit, so a gated lane never arms
// a timer at all. Strictly cheaper than firing: no drift row, no actuate,
// no fire callbacks, no one-shot.
~~~

### prefix

Above `function prefixEvents(kind, pos) {`, lines 1029 to 1062 before the cut.

~~~js
// -------------------------------------------------------------------------
// SEAM 5 — the reduce policy's INPUT. It used to see only the events one scan
// happened to miss, which is fine for a commutative fold (held notes) and
// WRONG for a non-commutative one (a counter, a cue state machine): the
// reducer cannot know what came before the window.
//
// GUARANTEE NOW: a reducer is always handed the COMPLETE ORDERED PREFIX of
// its kind — every event with at <= pos in (at, seq) order — so `reduce` is a
// pure function of the prefix and `assertState` is an absolute (idempotent)
// assertion. That makes it exactly the C2 property in miniature:
//     assertState(reduce(prefix(<=t)))  ===  state after play(0 -> t)
// for ANY reducer, commutative or not. Reducers that prefer to fold forward
// get the explicit alternative in the same call: info.from = {pos, state}
// (the last reduce boundary and the state it returned) plus info.since (the
// events in (from.pos, pos]) — so `fold(info.from.state, info.since)` is
// equally available and equally correct. info.missed keeps the old one-scan
// batch for diagnostics.
//
// The raw setPolicy(kind, {reduce}) escape hatch keeps its historical
// signature reduce(missedBatch, info) — the enriched info carries prefix/
// since/from — so existing lab arms are untouched.
// -------------------------------------------------------------------------
//
// C4 — THE GUARANTEE, SHARPENED. For a DISCRETE kind everything above holds
// unchanged: the reducer is a pure function of the prefix. For a CONTINUOUS
// kind it cannot be — the state at t is defined by the samples STRADDLING t,
// and the right one has at > pos, so it is by construction absent from the
// prefix. So the contract now reads:
//     discrete kind    : state(t) = f(prefix(<= t))
//     continuous kind  : state(t) = f(prefix(<= t), successor(s) of t)
// and `info.next` (first event of this kind with at > pos) plus `info.nexts`
// (1 + caps.neighbourhood of them) are supplied on every reduce call. They are
// a bisect over a lane the scheduler already keeps sorted — the two lines
// without which an interpolated reduce is inexpressible.
~~~

### reduce-gate

Above `if (gatedKinds.size !== 0 && gatedKinds.has(kind) && reason !== 'evidence-ungate`..., lines 1076 to 1083 before the cut.

~~~js
// G1 — ACTUATION'S SECOND DOOR, and the one that was invisible. This path
// ends in `ad.assertState(state, info)`, which is an actuation: it is how a
// seek puts held notes back. Before v0.7 it folded the WHOLE prefix of an
// over-cap derived lane and asserted it, while `reduceAt()` on the same lane
// and the same position returned null — one lane, two answers, decided by
// the door. Measured on the shipped code: a tier-3 lane under 'attested'
// asserted a state folded from three generative rows. It is EXCLUDED here
// for exactly the reason evExcludes() excludes it from a read.
~~~

### soft-evidence

Above `const ev = softEvidence(kind, 'reduce');`, lines 1090 to 1093 before the cut.

~~~js
// E3: the internal fold obeys the deck policy too, and WITHHOLDS the
// successor when the policy forbids restoration — which is what makes an
// interpolating reducer degrade to a hold without knowing the firewall
// exists (C4 read backwards: no successor, no interpolation).
~~~

### forced-choice

Above `const EV_UNSET = { mode: 'all', maxTier: Infinity, label: 'all', implicit: true `..., lines 1128 to 1150 before the cut.

~~~js
// -------------------------------------------------------------------------
// E3/E4 — THE EVIDENCE FIREWALL. Everything below this line is the resolution
// of one question asked before every positional read: *is the caller willing
// to be told something that was invented?*
//
// THE FORCED-CHOICE RULE, in three steps:
//   1. the per-call {evidence} wins;
//   2. else the deck policy the client set EXPLICITLY at createDeck({evidence})
//      (or deck.setEvidence()) applies;
//   3. else the call THROWS (code: EVIDENCE_POLICY_REQUIRED) — unless the
//      answer is provably identical under all three policies, which is what
//      policyMatters() decides. That exemption is not a default: it is a proof
//      that the omission cannot mix anything. A discrete kind's sampleAt, a
//      bracket over an attested lane and a window over one are all in it; a
//      continuous kind that DECLARES caps.tier >= 1, and any derived lane, are
//      not, and must choose.
//
// Why an adapter's `caps.tier` is the trigger and not `caps.continuous`: tier
// is the adapter's own statement that what it returns BETWEEN samples is
// restoration on §5b's spectrum. An adapter that has not made that statement
// has not entered the spectrum, and the library will say so (registerAdapter
// records it) rather than retro-classify four shipped clients' semantics.
// -------------------------------------------------------------------------
~~~

### soft

Above `function softEvidence(kind, op) {`, lines 1184 to 1187 before the cut.

~~~js
/** The same resolution for the library's OWN internal folds (the seek and
 *  catch-up paths), which run inside a transport listener where throwing would
 *  blow up a click handler rather than the query that deserves it. An
 *  unqualified internal fold is RECORDED in the ledger instead. */
~~~

### fire-firewall

Above `function gateStatOf(kind) {`, lines 1214 to 1240 before the cut.

~~~js
// -------------------------------------------------------------------------
// G1–G4 — THE FIRE-SIDE FIREWALL.
//
// The read side asks "is the caller willing to be TOLD something invented?".
// This asks the other half of the same question: *is the caller willing for
// something invented to HAPPEN?* — which is what an evidence-only performance
// means, and what the read side alone could not deliver.
//
// WHY UNCONDITIONAL AND NOT `caps.evidenceGated` (the shape §8.8 asked for,
// refuted here):
//   · An opt-in cap makes the SAFE behaviour the one an adapter author has to
//     remember. That is `caps.series` with the sign flipped — declared and
//     unread produced "150, a value belonging to neither controller", in
//     silence; undeclared and unenforced produces a dreamed note in an
//     archival performance, in silence. The same failure, and this one is
//     the one an institution would be asked to stand behind.
//   · It cannot surprise anyone. The gate reads `evPolicy`, which is null
//     until the client makes §5b's FORCED choice; an unqualified deck is
//     EV_UNSET (maxTier Infinity) and nothing is ever gated. A client that
//     wrote `evidence:'attested'` has already said this in words.
//   · The cost argument for opt-in does not survive LANE PURITY: the gate is
//     one Set of kinds, so the price on the hot path is `size !== 0`.
//   · And it would be indefensible beside the read side, which excludes an
//     over-cap lane from window() without asking the adapter's permission.
// What the adapter DOES get a say in is not *whether* it is refused but what
// the refusal SOUNDS like: caps.absentState / silence(), below.
// -------------------------------------------------------------------------
~~~

### gate-why

Above `const gateWhy = (kind, pol) => {`, lines 1250 to 1257 before the cut.

~~~js
/** MEMOIZED PER (lane, policy generation), and the memo is not a micro-
 *  optimisation — it was measured. The first cut built this sentence on every
 *  refused row and made REFUSING 37 % more expensive than FIRING (8000 tier-3
 *  rows: 3.7 ms refused vs 2.7 ms fired), which is an absurd shape for a gate
 *  whose whole job is to do less. The memo is sound because the string is a
 *  function of exactly (kind, tier, source, method, policy) — and because
 *  noteDegraded() already folds consecutive identical reports, so the rows
 *  were sharing one report anyway; only the string was being rebuilt. */
~~~

### gate-refuse

Above `function gateRefuse(ev, origin) {`, lines 1278 to 1282 before the cut.

~~~js
/** G3: a scheduled row the policy refuses. Terminal status 'gated' — not
 *  fired (nothing happened), not dropped (the transport was not late), not
 *  reduced (nothing was folded). A backward seek puts it back to 'pending'
 *  through the ordinary reconcile, so loosening the policy and replaying is
 *  all it takes to hear it. */
~~~

### recompute-gate

Above `function recomputeGate(reason, { transitions = false } = {}) {`, lines 1307 to 1311 before the cut.

~~~js
/** Recompute the gated-lane set. Called ONLY when the lane set changes (a
 *  lane's first derived row, or a tier rise, or a dropped restoration) or
 *  when the policy changes — never per row and never per tick.
 *  `transitions` runs G4's mid-play handlers; the lane-set path passes false
 *  because a lane that has just come into existence holds nothing. */
~~~

### gate-tighten

Above `function gateTighten(kind, pol, pos, reason) {`, lines 1338 to 1343 before the cut.

~~~js
/** G4 — THE POLICY TIGHTENED WHILE PLAYING. This is a state change, not a
 *  filter: the lane may be holding a note the policy now forbids, and simply
 *  refusing its FUTURE rows would leave the forbidden material ringing —
 *  which is precisely the failure `caps.absentState` was invented for at a
 *  quotation edge. Same mechanism, new reason. An adapter that cannot go
 *  quiet HOLDS and says so; it is never guessed at. */
~~~

### gate-loosen

Above `function gateLoosen(kind, pol, pos, reason) {`, lines 1370 to 1375 before the cut.

~~~js
/** G4 — THE POLICY LOOSENED. The lane was refused; its actuator has missed
 *  everything up to `pos`. Rows AHEAD of the playhead that scan() already
 *  marked 'gated' go back to 'pending' (nothing else would ever revisit
 *  them), and the lane is re-asserted at the playhead so it catches up on the
 *  prefix it was not allowed to see. A lane with no reduce()+assertState()
 *  cannot be caught up — it resumes at its next row, and that is REPORTED. */
~~~

### assert-state

Above `function sameValue(a, b) {`, lines 1395 to 1425 before the cut.

~~~js
// -------------------------------------------------------------------------
// G5 — deck.assertState(kind, state, info). §7.5's honest positioning applies
// in full: this is DAW MIDI chase / ETC Eos "Assert", thirty-year-old shipped
// practice, and what was missing was not the idea but the DECK-LEVEL entry
// point. `assertAt(pos, kind)` folds AND asserts; a client that already KNOWS
// the state — after an external sync, a media-master handover, a policy
// change, a loop wrap that ended at `out` while the playhead sits at `in` —
// has no prefix to replay and no reason to pay for one.
//
// WHAT IT TOUCHES:
//   · adapter.assertState(state, info) — the actuation.
//   · the reduce SNAPSHOT, set to {pos, state}, so a forward-folding reducer's
//     info.from/info.since continue from the assertion rather than from a
//     boundary that no longer describes anything.
// WHAT IT DOES NOT TOUCH:
//   · THE DRIFT CHANNEL. A drift row is {id, at, intendedUs, firedUs,
//     deltaMs} for one EVENT. An assert has no event and no intended instant,
//     so a synthetic row would be a fabricated zero-lateness sample in every
//     p50/p95 in this repo. Asserts have their own channel (asserts(),
//     onGate is for the gate). Symmetric with the reason `sync()` is not
//     `seek()`: a correction is not an event.
//   · POSITION AND STATUSES. Asserting state is not seeking. Conflating them
//     is the distinction sync()/seek() already exists to keep.
// VERIFICATION IS OPT-IN, and that is a considered default, not laziness:
// checking the assertion means folding the prefix, which is exactly the cost
// assertState exists to avoid. The asymmetry with the evidence policy is the
// same one §7.9 already drew — silence that can FABRICATE throws (evidence),
// silence that merely trusts or widens defaults (certainty, and this). The
// caller IS the authority here by construction. Ask with {verify:true} and a
// disagreement with reduce(<= pos) lands in degradations() as 'asserted-over'.
// -------------------------------------------------------------------------
~~~

### cert-accepts

Above `function certAccepts(ev, from, to, cert, kind) {`, lines 1500 to 1516 before the cut.

~~~js
// -------------------------------------------------------------------------
// U3 — THE CERTAINTY PREDICATE. Two integer comparisons per row, which is the
// whole of "possibly in 1965" vs "certainly in 1965".
//
//   POSSIBLY in [a,b]   <=>  the closed-open bracket OVERLAPS it   (PG `&&`)
//   NECESSARILY in [a,b]<=>  [a,b] CONTAINS the row's CERTAIN extent (PG `@>`)
//
// The certain extent is the INNER bracket (CRM P81, "ongoing throughout") when
// one exists. Where it does not — the common case, and CORRECT per CRM Issue
// 288 ("it is also correct not to instantiate P81") — outer containment is
// still a SOUND sufficient condition (a bracket wholly inside the window is
// certainly inside it), so it is tried; and where THAT fails the question is
// genuinely undecidable from what the row carries. Undecidable is not `false`:
// the row is excluded and the undecidability is REPORTED, because a query that
// silently answers "no" to a question it cannot answer is the failure mode
// every renderer in the survey shipped.
// -------------------------------------------------------------------------
~~~

### continuous-reads

Above `const payOf = (ev) => (ev ? ev.payload : undefined);`, lines 1533 to 1539 before the cut.

~~~js
// -------------------------------------------------------------------------
// C1/C2/C3 — the CONTINUOUS reads. bracket() is the raw pair (plus its
// neighbourhood); sampleAt() is the interpolated value, which is what a
// renderer actually wants. Both go through the per-kind cursor: O(1) amortised
// playing forward, O(log n) on a seek. Neither is a render tick — the client
// calls them from whatever cadence it already runs (C-not-done).
// -------------------------------------------------------------------------
~~~

### series

Above `function seriesFn(kind) {`, lines 1542 to 1553 before the cut.

~~~js
// -------------------------------------------------------------------------
// U5 — caps.series. A lane is one KIND; a kind is not always one SIGNAL. A
// MIDI CC lane carries controller 1 and controller 74 interleaved, and
// "the pair of samples straddling pos" over the merged lane can be two
// different controllers — an interpolation between a modwheel value and a
// filter-cutoff value, which is not wrong by a little. The declared-and-unread
// `caps.series` closes it: `caps.series(payload, ev) -> key` splits the lane
// into per-series sub-lanes, each with its OWN cursor, and bracket/sampleAt
// ride the sub-lane named by `{series}`. Sub-lanes are built LAZILY (one scan
// of an already-sorted lane) and maintained incrementally on schedule, so a
// lane whose adapter declares no series never allocates and never pays.
// -------------------------------------------------------------------------
~~~

### rows-for

Above `function rowsFor(kind, opts) {`, lines 1578 to 1581 before the cut.

~~~js
/** the rows bracket()/sampleAt() should ride for this call, plus the cursor
 *  cache key. Falls back to the whole lane — and REPORTS — when a lane that
 *  declares caps.series is read without naming one, which is the case that
 *  used to answer nonsense in silence. */
~~~

### attested-hold

Above `const report = { wanted: ev.label, chose: 'attested-hold', degraded: true, pos,`, lines 1641 to 1644 before the cut.

~~~js
// E4 — THE FIREWALL, at its sharpest. Interpolating between two attested
// samples IS restoration (§5b tier 1); under a policy that does not admit
// it the honest answer is the last ATTESTED sample, returned WITH the
// report rather than instead of one.
~~~

### hold

Above `noteDegraded(kind, {`, lines 1651 to 1652 before the cut.

~~~js
// C6: a discrete kind sampled between two events is a zero-order HOLD —
// the honest answer, and the degradation is reported, not implied.
~~~

### ctx-order

Above `const out = ad.interpolate(br.a, br.b, br.u, {`, lines 1663 to 1665 before the cut.

~~~js
// NOTE the ordering: caller opts spread FIRST, control fields injected
// AFTER. This is §2's law ("payloads must not spread over control fields")
// applied to the ctx object — the same law logdeck was breaking.
~~~

### request

Above `function request(kind, want = {}) {`, lines 1675 to 1679 before the cut.

~~~js
/** C6 — ASK, and be told honestly. Mirrors nested.mjs's rate report shape:
 *  {wanted, chose, degraded, reason}. `want` keys understood specially:
 *  interpolate (true | method name), neighbourhood (number), rate (number,
 *  against caps.rates); anything else is treated as a boolean capability
 *  claim and checked against caps[key]. */
~~~

### actuate-gate

Above `const pol = normalizeEvidence(want.evidence, "request({actuate})") || evPolicy |`..., lines 1723 to 1725 before the cut.

~~~js
// G3 — ASK THE FIRE-SIDE GATE, before a performance rather than after.
// request({evidence}) answers what this lane will SERVE; this answers
// whether it will HAPPEN, which the read-side answer never implied.
~~~

### follow-transport

Above `function followTransport(st) {`, lines 1747 to 1752 before the cut.

~~~js
/** C5 — caps.followsTransport. play/pause/rate are NOT seeks, so nothing
 *  re-asserts on them (correctly: nothing should re-fire) — but a media
 *  element still has to follow. Three clients had each written the same
 *  onState reason-filter by hand; it lives here now. 'seek' is excluded (it
 *  goes through reduce + assertState) and 'sync' is excluded on purpose: a
 *  servo correction must never cascade. */
~~~

### two-phase

Above `const LOCATE_DISPOSITIONS = ['MustRoll', 'MustStop', 'RollIfAppropriate'];`, lines 1772 to 1800 before the cut.

~~~js
// -------------------------------------------------------------------------
// U6 — TWO-PHASE SEEK (JACK's slow-sync barrier + Ardour's locate
// disposition). The problem the transport already has: `seek()` moves the
// vector and re-asserts state in one synchronous step, but a real client —
// a media element that must finish a `currentTime` seek, a sampler that must
// reload a bank, a nested deck that must re-fold — is not ready at that
// instant, and today it just plays the wrong thing for a few hundred ms.
//
// JACK's answer, ported with its safety properties intact:
//   OPT-IN     per adapter (caps.slowSync + prepareSeek). A deck with no
//              slow-sync adapter takes the v0.5 path, byte for byte.
//   PHASE 1    the LOCATE happens immediately and unconditionally. The
//              position moves, reconcile + assertState run. Only ROLLING is
//              deferred — the transport parks at the new position.
//   NON-BLOCKING  seek() still returns the clamped position synchronously.
//              The barrier is observable (seekBarrier(), and a promise) and
//              nothing awaits it on the caller's behalf.
//   FAIL-OPEN  on timeout the barrier opens ANYWAY, every laggard is named
//              in degradations(), and the laggards catch up on their own
//              (they are not rewound, and the transport is not held hostage
//              by one slow client — the correctness bug JACK's own docs warn
//              about).
//   RE-ARMED   a locate mid-barrier supersedes the one in flight, and
//              inherits its TRUE rolling state, so a scrub that fires ten
//              locates does not lose the roll on the tenth.
//   DISPOSITION  Ardour's LocateTransportDisposition, carried in the request
//              and honoured at the barrier: MustRoll | MustStop |
//              RollIfAppropriate (default — roll iff it was rolling).
// -------------------------------------------------------------------------
~~~

### phase-1

Above `if (clients.length && transport.rate !== 0) transport.pause();`, lines 1833 to 1833 before the cut.

~~~js
// PHASE 1 — the locate. Unconditional, immediate, identical to v0.5.
~~~

### phase-2

Above `let waiting = clients.length;`, lines 1850 to 1851 before the cut.

~~~js
// PHASE 2 — the barrier. Armed BEFORE dispatch, so a synchronously-ready
// client cannot race the timer.
~~~

### schedule

Above `schedule: scheduleEvent,`, lines 1899 to 1902 before the cut.

~~~js
/** Add an event {at, kind, id?, payload?, provenance?}. During playback, an
 *  event at or behind the playhead fires immediately (overdub law, steal
 *  #11). `provenance` marks the row DERIVED (E1) and is normally supplied by
 *  a reconstructor rather than by hand. */
~~~

### no-tier

Above `if (caps.continuous === true && typeof adapter.interpolate === 'function' && cap`..., lines 1932 to 1934 before the cut.

~~~js
// E3: an adapter that INVENTS between samples but declares no tier has not
// entered §5b's spectrum, so the firewall cannot police it. That is a fact
// about the adapter, recorded — not a reason to guess a tier for it.
~~~

### request-seek

Above `requestSeek,`, lines 1947 to 1948 before the cut.

~~~js
/** U6: the two-phase seek entry point. Returns {report, promise} — the
 *  LOCATE has already happened when it returns; only the roll is deferred. */
~~~

### adapter-gen

Above `adapterGen() { return adapterGen; },`, lines 1953 to 1958 before the cut.

~~~js
/** How many times the adapter registry has changed. The same idea as
 *  `rangeGen`, for the same reason: a client that derived something from
 *  the registry (the transport bar derives its rate lattice) needs to know
 *  cheaply that its derivation is stale. A nest registers its adapter on
 *  the parent AFTER construction, so anything computed once at build time
 *  describes a deck that does not exist yet. */
~~~

### adapter

Above `adapter(kind) { return adapters.get(kind) || null; },`, lines 1966 to 1969 before the cut.

~~~js
/** Read accessor on the adapter registry. `deck.adapters` only ever held the
 *  CONSTRUCTOR-registered ones, so anything registered later through
 *  registerAdapter() was unreachable from outside — a nest could see the cap
 *  and not the method. Read-only, additive. */
~~~

### silence

Above `silence(info = {}) {`, lines 1971 to 1978 before the cut.

~~~js
/** caps.absentState — the deck-level fan-out, so a caller never has to know
 *  WHERE the registry lives. A quotation parked outside its span currently
 *  holds whatever the cut left ringing; an adapter that declares
 *  caps.absentState === 'silence' says how to go quiet, and this calls it.
 *  The DEFAULT stays 'hold' (right for a video frame; wrong for a note), and
 *  declaring the cap without implementing silence() is REPORTED, never
 *  guessed at. `info.kind` narrows to one lane; omitted, it fans out.
 *  -> {kinds, silenced, held, missing} */
~~~

### assert-into

Above `assertState: assertStateInto,`, lines 2004 to 2007 before the cut.

~~~js
/** G5: push AUTHORITATIVE state in, without replaying a prefix.
 *  -> {kind, pos, chose, degraded, applied, verified, agreed, expected, from}
 *  `info`: {pos?, reason?, source?, verify?} — everything else is passed
 *  through to adapter.assertState(state, info). */
~~~

### snapshot

Above `snapshotOf(kind) { const s = snapshots.get(kind); return s ? { pos: s.pos, state`..., lines 2014 to 2015 before the cut.

~~~js
/** the reduce boundary for a kind — {pos, state} — which assertState() moves
 *  and a forward-folding reducer reads back as info.from. */
~~~

### gate-accounting

Above `gateAccounting(kind) {`, lines 2017 to 2020 before the cut.

~~~js
/** G3: the fire-side firewall's own accounting — the twin of
 *  evidenceAccounting() on the ACTUATION axis. "How much of what you are
 *  about to look at was invented" has a sibling: "how much of what was
 *  about to happen was refused". */
~~~

### reduce-at

Above `reduceAt(kind, pos, opts) {`, lines 2045 to 2049 before the cut.

~~~js
/** reduce(prefix <= pos) for one kind, without asserting — the expected
 *  state a harness compares against (the C2 left-hand side). §5b's
 *  `reduce()` with an evidence policy: under a policy that forbids
 *  restoration the successor is WITHHELD, so an interpolating reducer
 *  returns its own honest hold. */
~~~

### window

Above `window(kind, from = -Infinity, to = Infinity, opts) {`, lines 2068 to 2083 before the cut.

~~~js
/** §5b's `window()`: the ordered rows in [from, to] for one kind, a list of
 *  kinds (merged in (at, seq) order) or every kind — filtered by the
 *  evidence policy. A lane over the tier cap is EXCLUDED and reported.
 *  Rows carry `provenance` iff they are derived (E1).
 *
 *  U3 — and, ORTHOGONALLY, by `{certainty}`. The two filters read disjoint
 *  fields: the evidence filter reads only `laneTier(kind)`, the certainty
 *  filter reads only `row.when`. Neither can imply the other, and that is
 *  structural rather than disciplinary: a per-row `when` cannot reach
 *  evExcludes even by a careless patch, and a lane tier is not a bracket.
 *
 *    certainty:'possible'   (DEFAULT) the row's bracket OVERLAPS [from, to]
 *    certainty:'necessary'  [from, to] CONTAINS the row's certain extent
 *
 *  A crisp row is a POINT under both: [at, at]. A lane with no `when` row
 *  at all takes exactly the v0.5 code path, scan bounds included. */
~~~

### interval-index

Above `const span = laneMaxSpan(k);`, lines 2093 to 2096 before the cut.

~~~js
// The interval-index trick: a row whose bracket reaches into [from, to]
// may START before `from`, so the scan begins one maxSpan earlier. For
// every lane that has no bracket at all maxSpan is 0 and this is the
// identical `fromIdx(lane, from)` v0.5 used.
~~~

### position-accounting

Above `positionAccounting(kind) {`, lines 2107 to 2113 before the cut.

~~~js
/** U4 — the POSITION-axis twin of evidenceAccounting(), reported BY RULE.
 *  "43 % of this lane is positioned by err-july15-padding@1" is the number
 *  NSSDA's discipline demands: publish the accuracy statement, or declare
 *  it untested. NEVER multiply this with the evidence numbers — a "trust"
 *  score that folds tier and span is the exact collapse the whole design
 *  exists to prevent, and it deletes the pre-1960 archive from any
 *  attested-only view. */
~~~

### series-of

Above `seriesOf(kind) { const m = seriesMap(kind); return m ? [...m.keys()] : null; },`, lines 2165 to 2166 before the cut.

~~~js
/** U5: the series keys a lane actually holds (null when the adapter
 *  declares no caps.series — one kind, one series). */
~~~

### sample-at

Above `sampleAt,`, lines 2175 to 2177 before the cut.

~~~js
/** C1: the INTERPOLATED value at any position — O(1) amortised. E3: takes
 *  {evidence}; under 'attested' it returns the last attested sample plus a
 *  report instead of interpolating. */
~~~

### evidence-policy

Above `evidence() { return evPolicy ? { ...evPolicy } : null; },`, lines 2179 to 2180 before the cut.

~~~js
/** E3: the deck-level evidence policy — the explicit choice every omitting
 *  query resolves to. null means the client never made one. */
~~~

### evidence-accounting

Above `evidenceAccounting(kind) {`, lines 2200 to 2203 before the cut.

~~~js
/** E4: the firewall's own accounting — "how much of what you are about to
 *  look at was invented", over one kind, a list of kinds, or the whole deck.
 *  This is the number a tratteggio UI displays; it is not the client's to
 *  compute. */
~~~

### reconstructor

Above `registerReconstructor(name, spec = {}) {`, lines 2218 to 2236 before the cut.

~~~js
/** §5b's reconstructor-as-adapter, and the whole of it: a reconstructor
 *  READS an evidence lane and APPENDS a derived lane carrying
 *  {source, method, confidence, tier, refs}. It never touches the master.
 *
 *    const rc = deck.registerReconstructor('catmull', {
 *      from: 'pointer',            // the evidence lane it reads
 *      into: 'pointer~catmull',    // the derived lane it appends (default)
 *      tier: 1, method: 'catmull-rom',
 *      plan: ({a, b, aAt, bAt, dtMs, i}) => [positions…],   // WHERE to invent
 *      derive: (pos, ctx) => payload,                       // WHAT to invent
 *    });
 *    rc.run();     // append (idempotent: a re-run drops and rebuilds)
 *    rc.drop();    // delete the restoration — the master is bit-identical
 *
 *  TIER 1 IS THE ONLY ONE THE LIBRARY IMPLEMENTS, and it implements it by
 *  reusing the interpolator sampleAt already is. Tiers 2 (inpainting) and 3
 *  (generative) are UNIMPLEMENTED BY DESIGN: they register through this same
 *  seam and must bring their own derive() — the library hosts a model, it
 *  never guesses one. */
~~~

### default-derive

Above `const derive = spec.derive || ((pos) => sampleAt(from, pos, { ...(spec.opts || {`..., lines 2260 to 2263 before the cut.

~~~js
// The DEFAULT tier-1 derive is the interpolator sampleAt already is —
// asked with {evidence:'all'} because a reconstructor is the one caller
// whose whole job is to invent. What makes that honest is not refusing to
// do it; it is that every row it emits says so.
~~~

### drain-drift

Above `drainDrift() { return driftLog.splice(0); },`, lines 2378 to 2380 before the cut.

~~~js
/** Drain the drift channel (every fire's {intendedUs, firedUs, deltaMs}).
 *  Destructive by design — the bounded-memory path. Observers should use
 *  onDrift()/peekDrift() so draining does not blind them. */
~~~

### counts

Above `return { counts, total: events.length, attested: events.length - derivedTotal, d`..., lines 2385 to 2390 before the cut.

~~~js
// E1: `total` counts every row in the deck; `attested` and `derived` split
// it, so a client asserting "my capture is intact" compares against
// `attested` and a restoration can never inflate it.
// U1: the SECOND split, on the other axis, and deliberately not multiplied
// into the first — `attested + derived` and `crisp + smeared` are two
// partitions of the same rows, never one score.
~~~

### fanout

Above `export function createFanoutScheduler(transport) {`, lines 2406 to 2411 before the cut.

~~~js
// ---------------------------------------------------------------------------
// (d) THE GRAVEYARD ARM — per-event setTimeout fan-out, reproduced faithfully
// for measurement (demo gen-3 / maria): play() arms one setTimeout per event;
// there is NO cancellation path, so pause/seek/rate leave orphan timers and
// clear() empties the model while armed timers keep ringing. DO NOT SHIP.
// ---------------------------------------------------------------------------
~~~

### corpse

Trailing comment on line 2422 before the cut.

~~~js
const intended = transport.timeAt(ev.at); // may be null (paused) or stale — that's the corpse
~~~

### observe

Above `export function observePosition(transport, cb, { hz = 60, useRaf = typeof reques`..., lines 2464 to 2467 before the cut.

~~~js
// ---------------------------------------------------------------------------
// Position observable — the drift channel's second half (steal #6): a ~60 Hz
// {pos, nowUs} stream for visualizers, separate from event callbacks.
// ---------------------------------------------------------------------------
~~~

### create-deck

Above `export function createDeck({`, lines 2484 to 2501 before the cut.

~~~js
// ---------------------------------------------------------------------------
// createDeck — the batteries-included facade the first client had to write by
// hand (proto/jam/jam-timeline.js). Transport + scheduler + adapter registry +
// position observable + accumulated drift, one object, with the measured
// defaults already applied. This is the whole of what a client needs:
//
//   const deck = createDeck({
//     items: [{at, kind, id, payload}, …],
//     adapters: { midi: {caps, actuate, reduce, assertState} },
//     range: [0, durationMs], onPosition, onDrift,
//   });
//   deck.play(); deck.setRate(0.5); deck.seek(t); deck.pause();
//
// `range` is the seekable window in the position domain (absolute wall ms is
// as legal as 0-based ms — replay-grid uses the former, jam the latter). Since
// v0.5 it is NOT fixed at construction: `deck.setRange([min,max] | 'auto')`
// moves it in place for a client whose item set grows at runtime.
// ---------------------------------------------------------------------------
~~~

### clock

Trailing comment on line 2504 before the cut.

~~~js
clock,                       // ClockSource — default wall
~~~

### span

Above `const anchorOf = (i) => (i && i.when && Number.isFinite(Number(i.when.earliest))`..., lines 2521 to 2526 before the cut.

~~~js
// `span` is MUTATED IN PLACE by setRange() so `deck.range` stays one stable
// reference every holder already has (nested.mjs reads it at add(), HUDs cache
// it). `lastAt` tracks the furthest item ever scheduled, which is what an
// 'auto' range is derived from.
// U2: an item may carry ONLY a `when` — the anchor is `when.earliest`, so
// that is the position the range has to see.
~~~

### start-inside

Above `if (transport.position() < span[0] || transport.position() > span[1]) {`, lines 2551 to 2567 before the cut.

~~~js
// START INSIDE THE RANGE. `createTransport` opens at p0 = 0, and for a range
// beginning at 0 — every deck this library has ever had — that is right by
// accident rather than by construction. Give it a range that does not contain
// zero and the playhead begins OUTSIDE it: a deck built for 1965 opened at
// 1970-01-01, five years to the right of its own window, with `position()`
// outside `range` from the first frame.
//
// `setRange()` has always re-clamped; the constructor never did, so nothing
// caught it — no deck had been positioned anywhere but zero until an archive
// timeline needed negative epoch ms. Found by plan-archive-timeline §4 and
// measured before this line existed.
//
// `span[0]`, not `clamp(0)`. Clamping is what `setRange` does to a position it
// already has; here there is no position worth preserving, and clamping zero
// against a range that is entirely NEGATIVE returns `span[1]` — so a 1965 deck
// opened on 1966-01-01, at the far END of its window. Caught by testing the
// fix rather than by reading it.
~~~

### loop-view

Above `let loopView = null;`, lines 2572 to 2588 before the cut.

~~~js
/**
 * 🔴 THE LOOP, PUBLISHED ON THE DECK SO THE PICTURE CAN DRAW IT. Asked for
 * 2026-09-16: *"timeline global feature: draw loop boundaries (depends on
 * loop cycle state) and add light transclucent shade on loop area on
 * timeline"*.
 *
 * The loop itself belongs to the transport BAR, which is right: the bar owns
 * the three presses, the wrap and the live window, and it keeps only two
 * numbers. But a strip drawing the same deck had no way to learn about it,
 * and every page with both was drawing a picture of time with the loop
 * missing from it. The deck is the one object the two share, so the bar
 * publishes here and anything drawing this deck can read it.
 *
 * ⚠️ IT IS A VIEW, NOT A MECHANISM. Nothing in this file acts on it: the deck
 * does not wrap, does not seek and does not know what a lap is. Writing a
 * loop here does not make one.
 */
~~~

### range-gen

Above `rangeGen: () => rangeGen,`, lines 2604 to 2605 before the cut.

~~~js
/** how many times the range has moved — a positional reader (a cursor
 *  client, a scrubber) can cheaply notice it must re-derive. */
~~~

### set-range

Above `setRange(r) {`, lines 2607 to 2627 before the cut.

~~~js
/**
 * RANGE IS NO LONGER FIXED AT CONSTRUCTION (v0.5). Every client whose item
 * set grows at runtime — the remixer, every time a layer loads — had to
 * `dispose()` and rebuild the whole deck just to widen the seekable window,
 * throwing away the drift log, the adapters and the playhead with it.
 *
 *   deck.setRange([min, max])   explicit window in the position domain
 *   deck.setRange('auto')       [span[0], furthest scheduled at + tailMs]
 *
 * Purely additive and invariant-preserving:
 *  · `deck.range` keeps its identity (the array is mutated in place), so
 *    nested.mjs spans and HUDs holding it stay correct;
 *  · `durationMs` is a getter and follows;
 *  · if the playhead is now OUTSIDE the window it is moved with a real
 *    `seek()` — reduce + assertState — never a silent clamp, so the state
 *    at the new position is re-folded exactly as any other seek;
 *  · the scheduler's per-kind lanes and their CURSORS are untouched: range
 *    is a *window on positions*, not a filter on events. The cursor stays
 *    the only positional reader and it keeps riding the same lane array.
 * @returns {[number, number]} the new range
 */
~~~

### seek

Above `seek(p, opts) {`, lines 2643 to 2647 before the cut.

~~~js
/** seek(pos) is unchanged. seek(pos, {disposition, timeoutMs}) — or ANY
 *  seek on a deck holding a caps.slowSync adapter — goes through U6's
 *  two-phase barrier: the LOCATE still happens synchronously (and this
 *  still returns the clamped position), only the ROLL waits, and it fails
 *  open. deck.seekBarrier() is the report; .promise settles when it opens. */
~~~

### drift

Above `drift: () => (flush(), drift.slice()),`, lines 2669 to 2669 before the cut.

~~~js
/** every fire's {intendedUs, firedUs, deltaMs, origin} — the drift channel */
~~~

### deck-assert

Above `assertState: (kind, state, info) => sched.assertState(kind, state, info),`, lines 2675 to 2677 before the cut.

~~~js
/** v0.7 G5 — push AUTHORITATIVE state in without replaying a prefix (an
 *  external sync, a media-master handover, a policy change, a loop wrap).
 *  Moves the reduce snapshot; writes NO drift row; verification opt-in. */
~~~

### deck-gate

Above `gateAccounting: (kind) => sched.gateAccounting(kind),`, lines 2681 to 2681 before the cut.

~~~js
/** v0.7 G3 — the fire-side firewall's accounting and its live channel. */
~~~

### deck-sample

Above `sampleAt: (kind, pos, opts) => sched.sampleAt(kind, pos, opts),`, lines 2685 to 2687 before the cut.

~~~js
/** v0.4 CONTINUOUS KINDS — the interpolated value at any position (C1), the
 *  raw straddling pair (C2), honest capability negotiation (C6).
 *  v0.5 THE EVIDENCE FIREWALL — all four take {evidence} (E3). */
~~~

### deck-position

Above `positionAccounting: (kind) => sched.positionAccounting(kind),`, lines 2695 to 2696 before the cut.

~~~js
/** U4: the position-axis twin, reported BY RULE. Never multiply it with
 *  evidenceAccounting() — two axes, two numbers, no score. */
~~~

### deck-adapter-gen

Above `adapterGen: () => sched.adapterGen(),`, lines 2707 to 2709 before the cut.

~~~js
/** bumps whenever an adapter is registered or removed — a nest installs one
 *  on its parent AFTER construction, so anything derived from the registry
 *  at build time is describing a deck that does not exist yet */
~~~

### deck-adapter

Above `adapter: (kind) => sched.adapter(kind),`, lines 2711 to 2712 before the cut.

~~~js
/** the adapter registry, readable — including adapters registered AFTER
 *  construction, which `deck.adapters` (the constructor object) never held. */
~~~

### audio-lane

Above `export function createAudioLane(transport, ctx, {`, lines 2723 to 2730 before the cut.

~~~js
// ---------------------------------------------------------------------------
// Audio lane — Chris Wilson lookahead over an AudioContext: a coarse tick
// (worker-hosted by preference) commits events inside the horizon as
// sample-accurately start()ed nodes; committed nodes are held for cancel
// (the cancellation path the oscillator-per-event corpse lacked).
// Emits one-sample impulses into `bus` (a GainNode) by default; pass
// makeNode(ctx, audioT, ev) to schedule arbitrary graphs.
// ---------------------------------------------------------------------------
~~~

### rendered-reset

Above `if (st.reason === 'seek') {`, lines 2806 to 2830 before the cut.

~~~js
/**
 * 🔴 'rendered' IS RESET HERE TOO, AND LEAVING IT OUT MEANT THIS LANE COULD
 * NOT LOOP. A node's `onended` is the only thing that writes 'rendered',
 * so what stayed silent on a second lap was exactly the set of events that
 * had SOUNDED on the first one.
 *
 * MEASURED 2026-09-21 in a real AudioContext with the audio thread doing
 * the counting (demo/shell/impulse-worklet.js, the ear /lanes/ uses): four
 * events at 300, 900, 1500 and 2100 over a 2400 ms lap, played out, then
 * seek(0). Lap one 4 impulses heard, LAP TWO 0, stats {rendered: 4}.
 * THE CONTROL, in the same run and the same lane: cut the lap at 1200
 * instead, and the two events that had not sounded yet DID sound after the
 * seek, at 1496 and 2097 ms. The anchor, the commit path and the ear are
 * all fine across a seek; only the terminal status was wrong.
 *
 * ⚠️ IT IS WHAT THE OTHER TWO LANES IN THIS FILE ALREADY DO. The wall
 * scheduler's reconcile() resets ANY event ahead of the playhead ('re-fire
 * after a backward seek is correct replay'), and createMidiLane has no
 * terminal status at all, so both of them loop. This was the odd one out.
 * ⚠️ AND THE OFFLINE RENDER LAB COULD NOT HAVE CAUGHT IT: offline nothing
 * sounds until startRendering(), so `onended` never fires while the
 * commits are being made and 'rendered' never happens there. Two loop
 * defects on one lane, and the arm that found the other one is blind to
 * this one.
 */
~~~

### midi-lane

Above `export function createMidiLane(transport, output, {`, lines 2858 to 2896 before the cut.

~~~js
/**
 * MIDI out is an AUDIO-SHAPED lane, not a timer-shaped one.
 *
 * `MIDIOutput.send(data, when)` takes a future DOMHighResTimeStamp and the port
 * delivers it there, so — exactly like the audio lane — nothing happens "at the
 * moment" and the accuracy is owned below JS. This is why the library needed a
 * third lane type rather than a `midi` adapter on the wall scheduler: an
 * adapter would fire at the moment and hand MIDI its worst case.
 *
 * Two differences from createAudioLane, both worth knowing:
 *
 *   · IT STILL NEEDS A DOMAIN CONVERSION, and the first version of this file
 *     got it wrong in the most silent way available. `MIDIOutput.send()` takes
 *     a `DOMHighResTimeStamp` — `performance.now()`'s domain — while the
 *     transport's default `wallClock()` is `performance.timeOrigin +
 *     performance.now()`, i.e. EPOCH ms. Handing `transport.timeAt()` straight
 *     to `send()` therefore scheduled every note about fifty-six years out.
 *     Nothing threw, nothing logged, and the lane's own `scheduled()` counter
 *     went up exactly as if it had worked — the counter counts what we QUEUED,
 *     not what the port accepted. The conversion below is a delta rather than
 *     `- performance.timeOrigin`, so it holds for any ClockSource, including
 *     the audio clock and the virtual runtime.
 *     The audio lane re-anchors best-of-five every tick because
 *     `AudioContext.currentTime` also DRIFTS against wall time; this one does
 *     not drift, both being the same underlying clock, so a fresh pair of
 *     readings per commit is enough.
 *   · CANCELLATION IS ALL-OR-NOTHING. There is no per-message cancel;
 *     `clear()` drops every pending message on the port. That is fine for a
 *     note whose note-on has not sounded yet, and leaves a HUNG NOTE for one
 *     that has — so cancelling also sends all-notes-off. The looper learned
 *     the same lesson from the other end: no-stuck-notes is a property of the
 *     cancel path, never of the callback that was supposed to run.
 *
 * UNVERIFIED ON HARDWARE. No MIDI device has ever been attached to this
 * project (HANDOFF: the macOS IAC toggle is still open), and headless Chrome
 * needs `Browser.grantPermissions` for midi before it can even enumerate a
 * port — so `verify.mjs` cannot reach this code. Treat the timing claim above
 * as the spec's, not as measured.
 */
~~~

### virtual

Above `export function createVirtualRuntime(startMs = 0) {`, lines 2974 to 2980 before the cut.

~~~js
// ---------------------------------------------------------------------------
// Virtual runtime — a deterministic ClockSource + TickHost pair for CI. Time
// advances only through advanceTo(); due timers and ticks fire in exact time
// order with the clock set to their due moment. This is what makes the C2
// property test (`reduce(events<=t) === play(0->t)`) runnable in plain node
// with zero wall-clock flake.
// ---------------------------------------------------------------------------
~~~
