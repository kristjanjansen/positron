# timeline-score

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `timeline/score.mjs`

### header

Above `import { createNest } from './nested.mjs';`, lines 1 to 50 before the cut.

~~~js
// timeline/score.mjs — A QUOTATION IS A VALUE.
//
// plan-timeline §5 C10 draws the boundary: *the timeline is a TRACE format,
// never an authoring format; a score is a PROGRAM that QUOTES traces.* §7.7
// names the seam that made C10 unbuildable: **a quotation was not yet a value.**
// `nest.add({deck, in, out, rate})` mutated a nest, took a live object for its
// `deck`, and left nothing behind that a stored score could carry. You could
// build an arrangement. You could not SAVE one, mail one, diff one, or load one
// in a process that had never seen the decks.
//
// This module is that value, and the two functions that close the loop:
//
//     const q = quotation({ ref: 'kurenniemi-1972', at: 5000, rate: 1,
//                           in: { mark: 'chorus-3' }, out: { mark: 'chorus-4' },
//                           provenance: { source, asserter, certainty: [...] } });
//     const s = nest.toScore({ id: 'ekstra-1' });      // arrangement -> value
//     const json = JSON.stringify(s);                  // value -> bytes
//     loadScore(JSON.parse(json), (ref) => decks[ref], { parent });  // bytes -> arrangement
//
// THREE PROPERTIES, and they are the whole point:
//
// 1. **A quotation is a VALUE.** Frozen, structurally comparable
//    (`quotationEquals`), JSON round-trippable with no loss. It names its source
//    by IDENTITY (`ref`, a string) and never by object, so the value outlives
//    the process that made it. `resolve` is the only place a ref becomes a deck.
//
// 2. **`in`/`out` may be MARKS, not numbers.** `{mark: 'chorus-3'}` is resolved
//    against the child's own `mark` lane AT LOAD TIME. A number says "1200 ms
//    into the tape"; a mark says "the third chorus". When the source is re-cut —
//    a leader trimmed, a restoration inserted, the tape re-transferred — the
//    numbers are silently wrong and the marks are silently right. That is the
//    seam that lets a score survive its source. Numeric in/out keeps working
//    unchanged, and is what you get when you never asked for more.
//
// 3. **Provenance survives the door.** `exportProvenance()` emits the three
//    carriers the survey found (research/browser-av-editors-wide-2026-08.md §4):
//    C2PA `Action.changes[].regionOfInterest` + `reviewRatings`, HLS
//    `EXT-X-DATERANGE` with `X-` attributes, and OTIO namespaced per-clip
//    metadata. We emit STRUCTURES, validated against published field names. We
//    do not sign, and `exportProvenance().caveats` says so in every document.
//
// The certainty model is TEI's, because TEI is the only standard that has both
// certainty and media time: `@cert` + `@resp` + — the sleeper — **`@locus`**,
// which separates uncertainty about the BOUNDARY (`start`/`end`) from
// uncertainty about the IDENTITY (`name`). "I am 0.95 this is the Kurenniemi
// segment and 0.6 on where it starts" is one sentence in TEI and is
// inexpressible in C2PA, PROV-O, Web Annotation, or OTIO. We keep it in the
// value and report what each carrier loses.
//
// Plain ESM, browser+node, no deps beyond the library itself.
~~~

### refs

Above `const REFS = new WeakMap();     // deck -> ref`, lines 57 to 61 before the cut.

~~~js
// ---------------------------------------------------------------------------
// 1. DECK IDENTITY — a ref is a string, and a deck is an object. The WeakMap is
//    the only bridge, and it is deliberately one-directional: a score never
//    holds a deck, and a deck never learns which scores quote it.
// ---------------------------------------------------------------------------
~~~

### marks

Above `export function registerMarks(deck, marks) {`, lines 78 to 90 before the cut.

~~~js
// ---------------------------------------------------------------------------
// 2. MARKS — content addressing, minimally.
//
//    A deck exposes marks in whichever of three ways it already can:
//      a. a real LANE of kind `mark` (`deck.schedule({at, kind:'mark', id,
//         payload:{label}})`) — the native form, because then a mark is an event
//         like everything else, moves with a re-cut, and is visible in window();
//      b. `deck.marks` / `deck.marks()` — for decks built by an adapter that
//         already has its own mark list;
//      c. `registerMarks(deck, [...])` — the escape hatch for a deck you do not
//         own (a media element wrapper).
//    All three normalise to `{id, at, label}`.
// ---------------------------------------------------------------------------
~~~

### resolve-address

Above `export function resolveAddress(deck, address, { kind = 'mark', where = 'in' } = `..., lines 124 to 130 before the cut.

~~~js
/**
 * Resolve one in/out address against a deck. Numbers pass through untouched —
 * that is the "numeric in/out working unchanged" guarantee.
 *
 * @returns {{at:number, address, mark:?object, matchedBy:?string, offset:number,
 *            wasAt:?number, moved:?{from:number,to:number,deltaMs:number}}}
 */
~~~

### was-at

Above `const wasAt = Number.isFinite(address.wasAt) ? Number(address.wasAt) : null;`, lines 150 to 152 before the cut.

~~~js
// `wasAt` is what the mark resolved to when the score was WRITTEN. It is
// forensic only — never used to position anything — and it is how a load can
// say out loud "this mark moved 300 ms since you saved this".
~~~

### quotation-banner

Above `const LOCI = new Set(['name', 'start', 'end', 'location', 'value']);   // TEI @l`..., lines 159 to 161 before the cut.

~~~js
// ---------------------------------------------------------------------------
// 3. THE QUOTATION VALUE
// ---------------------------------------------------------------------------
~~~

### repeat

Above `/** 'infinite' | positive integer | {untilMs} -> the canonical stored form. */`, lines 209 to 228 before the cut.

~~~js
// --- §8: REPEAT — the smallest program that quotes a trace -----------------
//
// plan-timeline §8.1: a loop is AUTHORING ("do this again" is an instruction,
// not an observation), so it is a SCORE concept and never a log concept. The
// log of a looped performance holds N repetitions at N timestamps, because that
// is what happened. The loop lives HERE, beside {ref, in, out, rate}, as one
// more field of the quotation value — which makes a loop *a quotation with
// repetition*, the smallest possible program that quotes a trace.
//
// §8.7 asked "count, duration, or infinite?" and guessed "probably all three".
// All three, with one canonical spelling each:
//     repeat: 7               a COUNT — 7 passes of [in, out)
//     repeat: {untilMs: n}    a DURATION in PARENT ms; the last pass may be CUT
//     repeat: 'infinite'      until something stops it — and §8.7's other two
//                             questions (the store, the renderer) are entirely
//                             about this value.
// `repeat: 1` is "played once", which is the absence of a loop, so it
// normalises AWAY: quotation({…, repeat: 1}) and quotation({…}) are the same
// value and compare equal. That keeps `repeat` a field that appears only when
// it changes something.
~~~

### loop-phase

Above `export function loopPhase(x, L, childTotal = Infinity) {`, lines 250 to 266 before the cut.

~~~js
/**
 * §8.2, THE MAP: `childPos = in + ((parentPos − at)·rate) mod (out − in)` —
 * the fragment map with **modulo instead of clamp**. One function, exported, so
 * the nest, the tests and a client all phrase the loop the same way.
 *
 * @param x           (parentPos − at) · rate — elapsed in the CHILD's domain
 * @param L           out − in, the loop length in the child's domain
 * @param childTotal  the child-domain total this loop is allowed to consume
 *                    (iterations·L, or Infinity)
 * @returns {{iter, off, x, past}} `off` ∈ [0, L]; `iter` is 0-based.
 *
 * The one non-obvious clause: at the very END (x = childTotal, an exact
 * multiple of L) the modulo says 0, which would park the child at `in` after
 * its last pass. Rule 7c says `out` IS the child's end, so the final instant
 * resolves to (iter = n−1, off = L) instead — the loop leaves through the same
 * door a single pass leaves through.
 */
~~~

### geometry

Above `export function repeatGeometry({ in: cin = 0, out: cout, rate = 1, repeat } = {}`..., lines 280 to 285 before the cut.

~~~js
/**
 * The PARENT-time geometry a `repeat` implies. Everything the nest, the
 * renderer and the store need to answer §8.7 is one call.
 * @returns {{loop, L, onePassMs, iterations, parentDurMs, childTotal,
 *            unbounded, partialLast}}
 */
~~~

### quotation

Above `export function quotation(spec = {}) {`, lines 320 to 331 before the cut.

~~~js
/**
 * Build a quotation VALUE. Frozen; no live references; JSON-safe.
 *
 * @param spec {id?, ref, at?, rate?, in?, out?, repeat?, master?, provenance?, meta?}
 *        `ref`  names the quoted deck by IDENTITY (a string), never by object.
 *        `in`/`out` are numbers in the child's domain, or `{mark:'id'}`.
 *        `at`   is the placement in the PARENT's domain.
 *        `repeat` is §8: a count, `{untilMs}`, or `'infinite'`. Omitted (or 1)
 *               is one pass, i.e. no loop, and the field does not appear.
 *        Omitting `in`/`out` quotes the child's whole range — rule 1 is still
 *        the special case of rule 7.
 */
~~~

### null-id

Above `id: spec.id == null ? null : String(spec.id),`, lines 344 to 347 before the cut.

~~~js
// `== null` on purpose: an ABSENT id and a null id are the same absence,
// and `String(null)` is the string "null" — which round-tripped an
// anonymous quotation into one named "null" and broke byte-identity on the
// second pass. Found by the §8 repeat round-trip; the bug predates it.
~~~

### key

Above `export function quotationKey(q) { return canonical(q); }`, lines 365 to 365 before the cut.

~~~js
/** Canonical (key-sorted) JSON — the identity of a quotation as a value. */
~~~

### score-banner

Above `/** A score is a program: an id, a list of quotations, and metadata. Nothing in`, lines 369 to 371 before the cut.

~~~js
// ---------------------------------------------------------------------------
// 4. THE SCORE VALUE
// ---------------------------------------------------------------------------
~~~

### parse-score

Above `export function parseScore(input) {`, lines 395 to 397 before the cut.

~~~js
/** Total parse: every failure names the field. A score that parses is a score
 *  that will load, modulo refs the resolver cannot supply and marks the source
 *  no longer carries — the two failures that are about the WORLD, not the file. */
~~~

### score-refs

Above `export function scoreRefs(s) { return [...new Set(s.quotations.map((q) => q.ref)`..., lines 408 to 408 before the cut.

~~~js
/** Every ref a score needs — the manifest a loader must be able to supply. */
~~~

### load-banner

Above `/**`, lines 411 to 413 before the cut.

~~~js
// ---------------------------------------------------------------------------
// 5. LOAD — the other half of the round trip.
// ---------------------------------------------------------------------------
~~~

### load-score

Above `export function loadScore(s, resolve, opts = {}) {`, lines 415 to 425 before the cut.

~~~js
/**
 * Instantiate a score as a live arrangement.
 *
 * @param s        a score value (or its JSON text)
 * @param resolve  (ref, quotation) -> deck. THE ONLY place a ref becomes an
 *                 object. A process that has never seen these decks needs
 *                 nothing else.
 * @param opts     {parent, nest, autoRange, markKind, ...nestOpts}
 * @returns {{nest, spans, report}} — `report.marks` carries every mark that
 *          resolved, and every mark that MOVED since the score was written.
 */
~~~

### provenance

Above `const C2PA_ACTION_FIELDS = new Set(['action', 'when', 'softwareAgent', 'changed'`..., lines 458 to 469 before the cut.

~~~js
// ---------------------------------------------------------------------------
// 6. PROVENANCE EXPORT — three carriers.
//
// The survey's finding (research/browser-av-editors-wide-2026-08.md §4b) is the
// design constraint: **nobody writes time-ranged provenance.** C2PA has had the
// fields since 2.x, the reference SDK ships one fixture with an EMPTY time map,
// the official Verify UI has zero `temporal` code paths, and the conformance
// program never tests it. Premiere marks generated frames in its own UI and its
// exported credential collapses to per-clip. So: we emit the structures, we
// validate them against published field names, and every document carries its
// own `caveats` list saying what it is NOT.
// ---------------------------------------------------------------------------
~~~

### provenance-rows

Above `export function provenanceRows(subject, { markKind = 'mark', resolve } = {}) {`, lines 511 to 517 before the cut.

~~~js
/**
 * Normalise any subject (score | nest | deck) to provenance ROWS in ms:
 *   {id, ref, parentIn, parentOut, childIn, childOut, rate, tier, method,
 *    source, asserter, certainty[], confidence, kind}
 * A row is "a claim about a time range", which is precisely what all three
 * carriers can hold and no ecosystem tool currently reads.
 */
~~~

### repeat-claim

Above `repeat: sp.repeat === undefined ? undefined : sp.repeat,`, lines 531 to 533 before the cut.

~~~js
// §8: a repeated quotation claims N × the fragment's worth of parent
// time, and an UNBOUNDED one claims a time range with no end — which is
// exactly what none of the three carriers can say (see the caveats).
~~~

### deck-rows

Above `if (subject && typeof subject.provenanceOf === 'function') {`, lines 569 to 569 before the cut.

~~~js
// a deck: one row per DERIVED lane — "these seconds were reconstructed"
~~~

### export

Above `export function exportProvenance(subject, opts = {}) {`, lines 617 to 624 before the cut.

~~~js
/**
 * Emit provenance for a score / nest / deck on one of three carriers.
 *
 * @param subject  score | nest | deck
 * @param opts {carrier: 'c2pa'|'hls'|'otio', anchor, title, softwareAgent,
 *              ns, resolve, markKind}
 * @returns {{carrier, doc, text?, rows, caveats:[], validation}}
 */
~~~

### c2pa-region

Above `changes.push(clean({`, lines 645 to 647 before the cut.

~~~js
// 1. the region that IS the quotation — a temporal range in the delivered
//    asset's own play time (§18.15.4.6: `Action.changes` is an array of
//    region-maps naming the regions of interest that were changed).
~~~

### source-type

Above `dataSource: r.source ? clean({`, lines 657 to 660 before the cut.

~~~js
// $source-type is a CLOSED vocabulary. The Kurenniemi lesson lands
// exactly here: an assertion with no asserter is `humanEntry.anonymous`
// and the carrier says so, rather than letting an unsigned claim read
// like an identified one.
~~~

### boundary

Above `for (const c of boundaryCerts(r.certainty)) {`, lines 668 to 672 before the cut.

~~~js
// 2. BOUNDARY uncertainty gets its OWN region, because C2PA has exactly one
//    place to put a confidence number (reviewRatings, on assertion
//    metadata) and no way to say *which part* of the claim it qualifies.
//    TEI's @locus does; the mapping is lossy and this is the loss, made
//    visible instead of dropped.
~~~

### ingredient

Above `ingredients.push(clean({`, lines 701 to 703 before the cut.

~~~js
// §18.16.13, normative: *"when only a portion of an ingredient is used…
// the metadata field should contain a regionOfInterest field"*. That
// sentence is the archival-quotation case, written by a standards body.
~~~

### hls-doc

Above `function hlsDoc(rows, opts) {`, lines 771 to 774 before the cut.

~~~js
/** RFC 8216 §4.3.2.7. `X-` is *"a namespace reserved for client-defined
 *  attributes"*, and clients *"SHOULD use a reverse-DNS syntax"*. Our namespace
 *  is X-ORG-POSITRON-*. hls.js surfaces these already
 *  (`enableDateRangeMetadataCues`, default true) as metadata TextTrack cues. */
~~~

### hls-repeat

Above `if (r.repeat !== undefined) a.push(['${pfx}-REPEAT', typeof r.repeat === 'object`..., lines 795 to 798 before the cut.

~~~js
// §8: a loop is authoring, and no carrier has a word for it. HLS is the one
// that CAN say "this never ends" natively — END-ON-NEXT — and we still do
// not use it, because our repeat is a parent-domain program, not a playlist
// boundary. The X- attribute is the honest spelling.
~~~

### locus

Above `for (const c of r.certainty || []) {`, lines 804 to 805 before the cut.

~~~js
// TEI @locus, one attribute per uncertain THING — the carrier that can
// actually hold the distinction, because X- attributes are free-form.
~~~

### otio-doc

Above `function otioDoc(rows, opts) {`, lines 830 to 835 before the cut.

~~~js
/** OTIO has NO provenance in its schema; the sanctioned hook is the namespaced
 *  per-object `metadata` dict (Clip, Track, Timeline, MediaReference all have
 *  one). We put the whole quotation value there under `org.positron.timeline`,
 *  which means an OTIO round trip through any conforming tool preserves it
 *  verbatim — the one carrier that loses NOTHING, and the one nothing acts on.
 *  RationalTime rate is 1000 (ms), so no 23.976 rounding exists here at all. */
~~~

### source-range

Above `source_range: TR(r.childIn, r.childOut - r.childIn),`, lines 852 to 852 before the cut.

~~~js
// source_range is in the SOURCE's domain — which is exactly our in/out.
~~~

### validate

Above `export function validateProvenance(doc, carrier) {`, lines 897 to 899 before the cut.

~~~js
/** Check a document against PUBLISHED field names. This is not a schema
 *  validator — it is the check that we did not invent a spelling, which is the
 *  failure mode that matters when nothing downstream will tell us. */
~~~

### score-doc

Above `export const SCORE_DOC_VERSION = 1;`, lines 1044 to 1072 before the cut.

~~~js
// ---------------------------------------------------------------------------
// 8. THE SCORE DOCUMENT — one container, several languages (plans/plan-score.md).
//
// NORMALIZE THE ENVELOPE, NEVER THE PAYLOAD.
//
// A Csound note is `i 1 0.0 2.0 8000 440` — instrument, start, duration, then
// whatever p-fields that instrument reads. A MIDI note is channel, number,
// velocity. One of ours is a `kind` and an arbitrary payload. A container that
// made these one vocabulary would need a lowest common denominator, and that
// denominator is a lie about all three: p5 is not velocity, velocity is not p5,
// and "note number" means nothing to an instrument that reads a frequency.
//
// So a ROW standardises only what is genuinely common — when, how long, what
// kind of thing it is, which line it came from — and carries the rest verbatim
// under `payload`, tagged by the part's `lang`. The test for any proposed
// envelope field: could a Csound p-field, a MIDI velocity and one of our
// payloads all answer it without one of them lying?
//
// TWO DOMAINS, ON PURPOSE. A document is authored in BEATS (`unit: 'beat'`)
// with a tempo MAP, because that is what a score is; an arrangement runs in ms.
// `loadScoreDoc` is the converter, and it takes the beat->ms map as an ARGUMENT
// rather than importing one — the same inversion `repeatsAsQuotations` uses to
// avoid depending on this file. A container that imported a language's compiler
// would be a container with a favourite language.
//
// A `unit: 'beat'` document with no tempo means 60 bpm, at which one beat is
// one second. A MIDI part gets `tempo: [[0, 60]]` and SAYS SO, rather than
// quietly meaning milliseconds.
// ---------------------------------------------------------------------------
~~~

### langs

Above `export const SCORE_LANGS = ['csound', 'midi', 'positron'];`, lines 1076 to 1078 before the cut.

~~~js
/** The languages a part may declare. Open by design — an unknown lang is a
 *  warning on load, never a refusal, because the envelope is readable whether
 *  or not this build knows how to sound the payload. */
~~~

### warnings

Above `warnings: Array.isArray(p.warnings) && p.warnings.length ? p.warnings.map(String`..., lines 1104 to 1107 before the cut.

~~~js
// Csound statements that carry no row (`f`, `a`, `v`, `r`, `{`, `}`) are
// warnings in the compiler, not silent drops. A score leaning on them
// compiles to something quietly shorter than it reads, so the document
// carries the warnings and a reader can be told.
~~~

### score-doc-fn

Above `export function scoreDoc(spec = {}) {`, lines 1113 to 1122 before the cut.

~~~js
/**
 * A score document: named parts, and uses of them.
 *
 * `uses` are QUOTATIONS — the same value `nest.add()` takes — and a use's `ref`
 * names a PART rather than a deck. That is deliberate reuse rather than a
 * second vocabulary: one thing that names its source by identity, one
 * canonicaliser, one equality.
 *
 * @param spec {id?, unit?, tempo?, parts, uses, meta?}
 */
~~~

### jsonl

Above `export function scoreDocToJSONL(doc) {`, lines 1171 to 1183 before the cut.

~~~js
/**
 * THE JSONL VIEW — a deterministic projection, never a second source of truth.
 *
 * Canonical JSON is authoritative; this is a rendering of it, one record per
 * line, so a player can light "the line playing now" by index instead of
 * searching a path. `parseScoreDocJSONL` reads it back, and the demo asserts
 * the two agree byte for byte — two representations that can disagree is
 * exactly the defect worth designing out.
 *
 * Line order is header, then each part's declaration followed by its rows in
 * document order, then the uses. Parts are visited in sorted name order because
 * `scoreDoc` stores them that way.
 */
~~~

### part-items

Above `export function partItems(doc, name, { tempoMap, kind } = {}) {`, lines 1217 to 1227 before the cut.

~~~js
/**
 * A part's rows as DECK ITEMS, in milliseconds.
 *
 * `tempoMap` is passed in rather than imported: the beat->ms integral lives in
 * `timeline/csound.mjs` because that is where it was needed first, and a
 * container that imported a language's compiler would be a container with a
 * favourite language. Pass `tempoMap` from there.
 *
 * Every item carries `payload.row` — the row's id — which is what lets a player
 * light the score line a firing note came from without a lookup by position.
 */
~~~

### part-range

Above `export function partRangeMs(doc, name, { tempoMap } = {}) {`, lines 1246 to 1246 before the cut.

~~~js
/** The span a part occupies, in ms — what a use with no `in`/`out` quotes. */
~~~

### load-doc

Above `export function loadScoreDoc(doc, resolve, opts = {}) {`, lines 1255 to 1265 before the cut.

~~~js
/**
 * Instantiate a document as a live arrangement.
 *
 * The document is in beats; the arrangement runs in ms, so every use's `at`,
 * `in` and `out` is converted here. A MARK address passes through untouched —
 * a mark is resolved against the source's own lane at load, which is the whole
 * reason it survives a re-cut.
 *
 * @param resolve (partName, use) -> deck. The only place a name becomes an
 *        object, exactly as in `loadScore`.
 */
~~~
