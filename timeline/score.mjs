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

import { createNest } from './nested.mjs';

export const SCORE_VERSION = 1;
export const NS = 'org.elektron.timeline';

// ---------------------------------------------------------------------------
// 1. DECK IDENTITY — a ref is a string, and a deck is an object. The WeakMap is
//    the only bridge, and it is deliberately one-directional: a score never
//    holds a deck, and a deck never learns which scores quote it.
// ---------------------------------------------------------------------------
const REFS = new WeakMap();     // deck -> ref
const MARKS = new WeakMap();    // deck -> [{id, at, label}]  (registry fallback)

/** Name a deck. The name is what a score carries; without one a deck cannot be
 *  serialised, and `toScore()` says so rather than inventing an identifier that
 *  will not mean anything on the other side. */
export function refDeck(deck, ref) {
  if (!deck || typeof deck.position !== 'function') throw new Error('refDeck needs a deck');
  if (typeof ref !== 'string' || !ref) throw new Error('refDeck needs a non-empty string ref');
  const had = REFS.get(deck);
  if (had && had !== ref) throw new Error(`refDeck: this deck is already named '${had}' — a deck has one identity`);
  REFS.set(deck, ref);
  return ref;
}
export function deckRef(deck) { return (deck && REFS.get(deck)) || null; }

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

export function registerMarks(deck, marks) {
  MARKS.set(deck, normMarks(marks));
  return MARKS.get(deck);
}

function normMarks(rows) {
  const out = [];
  for (const r of rows || []) {
    if (!r) continue;
    const at = Number(r.at);
    if (!Number.isFinite(at)) continue;
    out.push({ id: String(r.id ?? r.label ?? `mark@${at}`), at, label: r.label ?? r.id ?? null });
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Every mark this deck exposes, from whichever carrier it uses. */
export function marksOf(deck, { kind = 'mark' } = {}) {
  if (!deck) return [];
  const own = typeof deck.marks === 'function' ? deck.marks() : Array.isArray(deck.marks) ? deck.marks : null;
  if (own) return normMarks(own);
  if (typeof deck.window === 'function') {
    let rows = [];
    try { rows = deck.window(kind, -Infinity, Infinity) || []; } catch { rows = []; }
    if (rows.length) return normMarks(rows.map((r) => ({ id: r.id, at: r.at, label: (r.payload || {}).label })));
  }
  return MARKS.get(deck) ? MARKS.get(deck).slice() : [];
}

/** Is this in/out a mark address rather than a number? */
export function isMarkAddress(a) { return !!a && typeof a === 'object' && typeof a.mark === 'string'; }

/**
 * Resolve one in/out address against a deck. Numbers pass through untouched —
 * that is the "numeric in/out working unchanged" guarantee.
 *
 * @returns {{at:number, address, mark:?object, matchedBy:?string, offset:number,
 *            wasAt:?number, moved:?{from:number,to:number,deltaMs:number}}}
 */
export function resolveAddress(deck, address, { kind = 'mark', where = 'in' } = {}) {
  if (typeof address === 'number' || typeof address === 'string') {
    const n = Number(address);
    if (!Number.isFinite(n)) throw new Error(`quotation.${where}: ${JSON.stringify(address)} is not a finite position`);
    return { at: n, address: n, mark: null, matchedBy: 'numeric', offset: 0, wasAt: null, moved: null };
  }
  if (!isMarkAddress(address))
    throw new Error(`quotation.${where}: must be a number or {mark:'id'}, got ${JSON.stringify(address)}`);
  const marks = marksOf(deck, { kind });
  const wanted = address.mark;
  let hit = marks.find((m) => m.id === wanted), matchedBy = 'id';
  if (!hit) { hit = marks.find((m) => m.label === wanted); matchedBy = 'label'; }
  if (!hit) {
    const known = marks.map((m) => m.id).join(', ') || '(this deck exposes no marks)';
    throw new Error(`quotation.${where}: mark '${wanted}' does not resolve on deck '${deckRef(deck) || '?'}' — known marks: ${known}`);
  }
  const offset = Number(address.offset || 0);
  if (!Number.isFinite(offset)) throw new Error(`quotation.${where}: mark offset must be finite`);
  const at = hit.at + offset;
  // `wasAt` is what the mark resolved to when the score was WRITTEN. It is
  // forensic only — never used to position anything — and it is how a load can
  // say out loud "this mark moved 300 ms since you saved this".
  const wasAt = Number.isFinite(address.wasAt) ? Number(address.wasAt) : null;
  const moved = wasAt !== null && Math.abs(wasAt - at) > 1e-9
    ? { from: wasAt, to: at, deltaMs: +(at - wasAt).toFixed(6) } : null;
  return { at, address: { ...address, offset: offset || undefined }, mark: hit, matchedBy, offset, wasAt, moved };
}

// ---------------------------------------------------------------------------
// 3. THE QUOTATION VALUE
// ---------------------------------------------------------------------------

const LOCI = new Set(['name', 'start', 'end', 'location', 'value']);   // TEI @locus, verbatim

function normCertainty(list, where) {
  const out = [];
  for (const c of list || []) {
    if (!c) continue;
    const locus = c.locus === undefined ? 'value' : String(c.locus);
    if (!LOCI.has(locus))
      throw new Error(`${where}: certainty @locus must be one of ${[...LOCI].join('|')} (TEI P5) — got '${locus}'`);
    const cert = c.cert === undefined ? null : (typeof c.cert === 'number' ? c.cert : String(c.cert));
    if (typeof cert === 'number' && !(cert >= 0 && cert <= 1))
      throw new Error(`${where}: numeric @cert is a probability in [0,1] (TEI teidata.probCert) — got ${cert}`);
    if (typeof cert === 'string' && !['high', 'medium', 'low', 'unknown'].includes(cert))
      throw new Error(`${where}: coded @cert must be high|medium|low|unknown (TEI teidata.probCert) — got '${cert}'`);
    // `widthMs` is the BAND: how wide the uncertainty about this boundary is.
    // TEI has @locus but no extent; the smear (§−1) needs one, and C2PA's
    // temporal region is the only field that can carry it.
    out.push(clean({ locus, cert, resp: c.resp ?? null, note: c.note ?? null,
      widthMs: Number.isFinite(c.widthMs) ? Number(c.widthMs) : undefined }));
  }
  return out;
}

export function normalizeProvenance(p, where = 'provenance') { return normProvenance(p, where); }
function normProvenance(p, where) {
  if (p === undefined || p === null) return null;
  if (typeof p !== 'object') throw new Error(`${where}: provenance must be an object`);
  const tier = p.tier === undefined ? 0 : Number(p.tier);
  if (!Number.isFinite(tier) || tier < 0 || tier > 3)
    throw new Error(`${where}: provenance.tier is §5b's spectrum — 0 attested | 1 interpolation | 2 inpainting | 3 generative`);
  const cert = normCertainty(p.certainty, where);
  const out = clean({
    source: p.source ?? null,
    // Kurenniemi's lesson: a rights/identity claim with no asserter is a claim
    // nobody can weigh. The field is optional; its ABSENCE is reported.
    asserter: p.asserter ?? null,
    method: p.method ?? null,
    tier,
    certainty: cert.length ? cert : null,
    note: p.note ?? null,
    // anything else the client wants to carry, verbatim
    ...(p.extra ? { extra: p.extra } : {}),
  });
  return Object.keys(out).length ? out : null;
}

function normAddress(a, where) {
  if (a === undefined) return undefined;
  if (typeof a === 'number') {
    if (!Number.isFinite(a)) throw new Error(`${where}: must be a finite position`);
    return a;
  }
  if (isMarkAddress(a)) {
    const o = { mark: a.mark };
    if (a.offset !== undefined && Number(a.offset) !== 0) o.offset = Number(a.offset);
    if (Number.isFinite(a.wasAt)) o.wasAt = Number(a.wasAt);
    return o;
  }
  throw new Error(`${where}: must be a number or {mark:'id', offset?, wasAt?}, got ${JSON.stringify(a)}`);
}

/**
 * Build a quotation VALUE. Frozen; no live references; JSON-safe.
 *
 * @param spec {id?, ref, at?, rate?, in?, out?, master?, provenance?, meta?}
 *        `ref`  names the quoted deck by IDENTITY (a string), never by object.
 *        `in`/`out` are numbers in the child's domain, or `{mark:'id'}`.
 *        `at`   is the placement in the PARENT's domain.
 *        Omitting `in`/`out` quotes the child's whole range — rule 1 is still
 *        the special case of rule 7.
 */
export function quotation(spec = {}) {
  if (!spec || typeof spec !== 'object') throw new Error('quotation(spec) needs an object');
  const ref = spec.ref !== undefined ? String(spec.ref) : (spec.deck ? deckRef(spec.deck) : null);
  if (!ref)
    throw new Error('quotation: `ref` is required — a quotation names its source by IDENTITY, not by object. ' +
      'Name the deck first: refDeck(deck, "kurenniemi-1972").');
  const at = spec.at === undefined ? 0 : Number(spec.at);
  const rate = spec.rate === undefined ? 1 : Number(spec.rate);
  if (!Number.isFinite(at)) throw new Error('quotation: `at` must be a finite parent position');
  if (!(rate > 0)) throw new Error('quotation: `rate` must be positive');
  const q = clean({
    v: SCORE_VERSION,
    id: spec.id === undefined ? null : String(spec.id),
    ref, at, rate,
    in: normAddress(spec.in, 'quotation.in'),
    out: normAddress(spec.out, 'quotation.out'),
    master: spec.master ? true : undefined,
    provenance: normProvenance(spec.provenance, 'quotation'),
    meta: spec.meta ?? null,
  });
  return deepFreeze(q);
}

export function isQuotation(x) {
  return !!x && typeof x === 'object' && typeof x.ref === 'string' && x.v === SCORE_VERSION
    && typeof x.at === 'number' && typeof x.rate === 'number';
}

/** Canonical (key-sorted) JSON — the identity of a quotation as a value. */
export function quotationKey(q) { return canonical(q); }
export function quotationEquals(a, b) { return canonical(a) === canonical(b); }

// ---------------------------------------------------------------------------
// 4. THE SCORE VALUE
// ---------------------------------------------------------------------------

/** A score is a program: an id, a list of quotations, and metadata. Nothing in
 *  it is a live object, so the whole thing is `JSON.stringify`-able and the
 *  parse is total. */
export function score(spec = {}) {
  const qs = (spec.quotations || []).map((q) => (isQuotation(q) ? q : quotation(q)));
  const seen = new Set();
  for (const q of qs) {
    if (q.id === null) continue;
    if (seen.has(q.id)) throw new Error(`score: duplicate quotation id '${q.id}'`);
    seen.add(q.id);
  }
  return deepFreeze(clean({
    v: SCORE_VERSION,
    id: spec.id === undefined ? null : String(spec.id),
    quotations: qs,
    meta: spec.meta ?? null,
  }));
}

export function isScore(x) { return !!x && typeof x === 'object' && x.v === SCORE_VERSION && Array.isArray(x.quotations); }
export function scoreToJSON(s, space) { return JSON.stringify(s, null, space); }

/** Total parse: every failure names the field. A score that parses is a score
 *  that will load, modulo refs the resolver cannot supply and marks the source
 *  no longer carries — the two failures that are about the WORLD, not the file. */
export function parseScore(input) {
  const raw = typeof input === 'string' ? JSON.parse(input) : input;
  if (!raw || typeof raw !== 'object') throw new Error('parseScore: not an object');
  if (raw.v !== SCORE_VERSION) throw new Error(`parseScore: unknown score version ${raw.v} (this build reads v${SCORE_VERSION})`);
  if (!Array.isArray(raw.quotations)) throw new Error('parseScore: `quotations` must be an array');
  return score({ id: raw.id, meta: raw.meta, quotations: raw.quotations.map((q, i) => {
    try { return quotation(q); } catch (e) { throw new Error(`parseScore: quotations[${i}]: ${e.message}`); }
  }) });
}

/** Every ref a score needs — the manifest a loader must be able to supply. */
export function scoreRefs(s) { return [...new Set(s.quotations.map((q) => q.ref))]; }

// ---------------------------------------------------------------------------
// 5. LOAD — the other half of the round trip.
// ---------------------------------------------------------------------------

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
export function loadScore(s, resolve, opts = {}) {
  const sc = typeof s === 'string' || !isScore(s) ? parseScore(s) : s;
  if (typeof resolve !== 'function')
    throw new Error('loadScore(score, resolve): `resolve` maps a ref to a deck — without it a score is just bytes');
  const { parent, nest: given, autoRange = false, markKind = 'mark' } = opts;
  if (!given && !parent) throw new Error('loadScore: needs {parent} (a deck to arrange into) or {nest}');
  const nest = given || createNest(parent, opts);
  const spans = [], marks = [], missing = [];
  for (const q of sc.quotations) {
    const deck = resolve(q.ref, q);
    if (!deck) { missing.push(q.ref); throw new Error(`loadScore: resolve('${q.ref}') returned nothing — a score names its sources and the loader must supply them (needed: ${scoreRefs(sc).join(', ')})`); }
    if (!deckRef(deck)) refDeck(deck, q.ref);
    const sp = nest.add(q, { resolve: () => deck, markKind });
    spans.push(sp);
    if (sp.marks) for (const [where, m] of Object.entries(sp.marks)) if (m && m.mark) marks.push({ id: sp.id, where, ...m });
  }
  if (autoRange && parent) parent.setRange('auto');
  const moved = marks.filter((m) => m.moved);
  return {
    nest, spans,
    report: {
      scoreId: sc.id, quotations: sc.quotations.length, refs: scoreRefs(sc), missing,
      marks, movedMarks: moved,
      // the honest headline: a score whose marks moved still points at the
      // right music; the numbers it would have stored do not.
      note: moved.length
        ? `${moved.length} mark(s) moved since this score was written; the quotation followed them (${moved.map((m) => `${m.mark.id} ${m.moved.from}->${m.moved.to}`).join(', ')})`
        : null,
    },
  };
}

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

const C2PA_ACTION_FIELDS = new Set(['action', 'when', 'softwareAgent', 'changed', 'instanceId',
  'parameters', 'digitalSourceType', 'changes', 'actors', 'description', 'reason', 'related']);
const C2PA_REGION_FIELDS = new Set(['region', 'name', 'identifier', 'type', 'role', 'description', 'metadata']);
const C2PA_RANGE_FIELDS = new Set(['type', 'shape', 'time', 'frame', 'text', 'item']);
const C2PA_RANGE_TYPES = new Set(['spatial', 'temporal', 'frame', 'textual', 'identified']);
const C2PA_NPT_FIELDS = new Set(['type', 'start', 'end', 'endInclusivity']);
const C2PA_META_FIELDS = new Set(['reviewRatings', 'dateTime', 'reference', 'regionOfInterest', 'dataSource', 'localizations']);
const C2PA_RATING_FIELDS = new Set(['value', 'code', 'explanation']);
const C2PA_DATASOURCE_FIELDS = new Set(['type', 'details', 'actors']);
const C2PA_SOURCE_TYPES = new Set(['signer', 'claimGenerator', 'claimGenerator.REVIEW', 'localProvider',
  'remoteProvider.1stParty', 'remoteProvider.3rdParty', 'humanEntry.anonymous', 'humanEntry.identified',
  'cryptoSignature', 'algorithmicMedia']);
const C2PA_REVIEW_CODES = new Set(['actions.unknownActionsPerformed', 'actions.missing', 'actions.possiblyMissing',
  'depthMap.sceneMismatch', 'ingredient.modified', 'ingredient.possiblyModified', 'ingredient.unknownProvenance',
  'thumbnail.primaryMismatch', 'stds.iptc.location.inaccurate', 'stds.schema-org.CreativeWork.misattributed',
  'stds.schema-org.CreativeWork.missingAttribution']);
const C2PA_ROLES = new Set(['c2pa.areaOfInterest', 'c2pa.cropped', 'c2pa.edited', 'c2pa.placed',
  'c2pa.redacted', 'c2pa.subjectArea', 'c2pa.deleted', 'c2pa.watermarked', 'c2pa.identified']);
const C2PA_ACTIONS = new Set(['c2pa.created', 'c2pa.edited', 'c2pa.placed', 'c2pa.filtered', 'c2pa.opened',
  'c2pa.converted', 'c2pa.dubbed', 'c2pa.transcribed', 'c2pa.resized', 'c2pa.cropped', 'c2pa.repackaged',
  'c2pa.published', 'c2pa.unknown']);
const IPTC = 'http://cv.iptc.org/newscodes/digitalsourcetype/';
export const DIGITAL_SOURCE_TYPE = {
  0: `${IPTC}digitalCapture`,
  1: `${IPTC}algorithmicallyEnhanced`,           // interpolation / restoration
  2: `${IPTC}algorithmicallyEnhanced`,           // inpainting: still "correction by algorithm"
  3: `${IPTC}compositeWithTrainedAlgorithmicMedia`, // generative infill
};

const HLS_KNOWN = new Set(['ID', 'CLASS', 'START-DATE', 'CUE', 'END-DATE', 'DURATION',
  'PLANNED-DURATION', 'END-ON-NEXT', 'SCTE35-CMD', 'SCTE35-OUT', 'SCTE35-IN']);

const OTIO_SCHEMAS = new Set(['Timeline.1', 'Stack.1', 'Track.1', 'Clip.1', 'Clip.2', 'Gap.1',
  'RationalTime.1', 'TimeRange.1', 'ExternalReference.1', 'MissingReference.1', 'Marker.2',
  'LinearTimeWarp.1', 'Effect.1']);
const OTIO_CLIP_FIELDS = new Set(['OTIO_SCHEMA', 'name', 'source_range', 'media_reference',
  'media_references', 'active_media_reference_key', 'metadata', 'effects', 'markers', 'enabled']);

// --- the uniform row a carrier serialises ----------------------------------

/**
 * Normalise any subject (score | nest | deck) to provenance ROWS in ms:
 *   {id, ref, parentIn, parentOut, childIn, childOut, rate, tier, method,
 *    source, asserter, certainty[], confidence, kind}
 * A row is "a claim about a time range", which is precisely what all three
 * carriers can hold and no ecosystem tool currently reads.
 */
export function provenanceRows(subject, { markKind = 'mark', resolve } = {}) {
  // a nest
  if (subject && typeof subject.spans === 'function') {
    return subject.spans().map((sp) => {
      const p = (sp.quoted && sp.quoted.provenance) || (sp.quotation && sp.quotation.provenance) || {};
      return clean({
        id: sp.id, ref: deckRef(sp.deck) || sp.id,
        parentIn: sp.at, parentOut: sp.at + sp.parentDur,
        childIn: sp.c0, childOut: sp.c1, rate: sp.rate,
        tier: p.tier || 0, method: p.method || null, source: p.source || null,
        asserter: p.asserter || null, certainty: p.certainty || [],
        confidence: identityCert(p.certainty), kind: 'quotation',
        marks: sp.marks || null, trim: sp.trim || null,
      });
    });
  }
  // a score
  if (isScore(subject)) {
    return subject.quotations.map((q, i) => {
      const deck = resolve ? resolve(q.ref, q) : null;
      const a = deck ? resolveAddress(deck, q.in === undefined ? deck.range[0] : q.in, { kind: markKind, where: 'in' }) : null;
      const b = deck ? resolveAddress(deck, q.out === undefined ? deck.range[1] : q.out, { kind: markKind, where: 'out' }) : null;
      const ci = a ? a.at : (typeof q.in === 'number' ? q.in : null);
      const co = b ? b.at : (typeof q.out === 'number' ? q.out : null);
      const p = q.provenance || {};
      return clean({
        id: q.id || `q${i}`, ref: q.ref,
        parentIn: q.at, parentOut: ci !== null && co !== null ? q.at + (co - ci) / q.rate : null,
        childIn: ci, childOut: co, rate: q.rate,
        tier: p.tier || 0, method: p.method || null, source: p.source || null,
        asserter: p.asserter || null, certainty: p.certainty || [],
        confidence: identityCert(p.certainty), kind: 'quotation',
        unresolved: ci === null || co === null ? 'mark address, no deck supplied to resolve it' : undefined,
      });
    });
  }
  // a deck: one row per DERIVED lane — "these seconds were reconstructed"
  if (subject && typeof subject.provenanceOf === 'function') {
    const ref = deckRef(subject) || 'deck';
    const rows = [];
    for (const lp of subject.provenanceOf() || []) {
      if (!lp.restored) continue;
      const evs = subject.window(lp.kind, -Infinity, Infinity) || [];
      const der = evs.filter((e) => e.provenance);
      if (!der.length) continue;
      rows.push(clean({
        id: `${ref}:${lp.kind}`, ref,
        parentIn: der[0].at, parentOut: der[der.length - 1].at,
        childIn: der[0].at, childOut: der[der.length - 1].at, rate: 1,
        tier: lp.tier || 0, method: lp.method || null, source: lp.source || null,
        asserter: null,
        certainty: lp.confidence ? [{ locus: 'value', cert: lp.confidence.mean, resp: lp.source || null }] : [],
        confidence: lp.confidence ? lp.confidence.mean : null,
        kind: 'reconstruction', lane: lp.kind, n: lp.restored,
      }));
    }
    return rows;
  }
  throw new Error('provenanceRows: subject must be a score, a nest, or a deck');
}

function identityCert(list) {
  for (const c of list || []) if (c.locus === 'name' && typeof c.cert === 'number') return c.cert;
  for (const c of list || []) if (c.locus === 'value' && typeof c.cert === 'number') return c.cert;
  return null;
}
function boundaryCerts(list) { return (list || []).filter((c) => c.locus === 'start' || c.locus === 'end'); }

/** 0..1 -> C2PA rating-map 1..5 (`int-range = 1..5`, 1 worst, 5 best). */
export function toReviewRating(conf) {
  if (typeof conf !== 'number') return null;
  return Math.max(1, Math.min(5, Math.round(1 + 4 * Math.max(0, Math.min(1, conf)))));
}

/** RFC 2326 Normal Play Time, seconds, as C2PA §18.2.2.3 requires (tstr). */
export function npt(ms) {
  const s = ms / 1000;
  if (!Number.isFinite(s)) return '0';
  const t = s.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  return t === '' || t === '-0' ? '0' : t;
}

// --- the door ---------------------------------------------------------------

/**
 * Emit provenance for a score / nest / deck on one of three carriers.
 *
 * @param subject  score | nest | deck
 * @param opts {carrier: 'c2pa'|'hls'|'otio', anchor, title, softwareAgent,
 *              ns, resolve, markKind}
 * @returns {{carrier, doc, text?, rows, caveats:[], validation}}
 */
export function exportProvenance(subject, opts = {}) {
  const carrier = String(opts.carrier || 'c2pa').toLowerCase();
  const rows = provenanceRows(subject, opts);
  const build = { c2pa: c2paDoc, hls: hlsDoc, 'hls-daterange': hlsDoc, otio: otioDoc }[carrier];
  if (!build) throw new Error(`exportProvenance: unknown carrier '${carrier}' — use 'c2pa' | 'hls' | 'otio'`);
  const out = build(rows, opts, subject);
  out.rows = rows;
  out.carrier = carrier === 'hls-daterange' ? 'hls' : carrier;
  out.validation = validateProvenance(out.doc !== undefined ? out.doc : out.tags, out.carrier);
  return out;
}

// --- (a) C2PA-shaped -------------------------------------------------------

function c2paDoc(rows, opts) {
  const agent = opts.softwareAgent || { name: 'elektron/timeline', version: '0.5' };
  const ns = opts.ns || NS;
  const actions = [], ingredients = [];
  for (const r of rows) {
    const changes = [];
    // 1. the region that IS the quotation — a temporal range in the delivered
    //    asset's own play time (§18.15.4.6: `Action.changes` is an array of
    //    region-maps naming the regions of interest that were changed).
    changes.push(clean({
      region: [{ type: 'temporal', time: clean({ type: 'npt', start: npt(r.parentIn), end: npt(r.parentOut) }) }],
      name: r.id,
      role: r.kind === 'reconstruction' ? 'c2pa.edited' : 'c2pa.placed',
      description: r.kind === 'reconstruction'
        ? `lane '${r.lane}' reconstructed (tier ${r.tier}, ${r.method || 'unspecified method'})`
        : `quotes ${r.ref} [${npt(r.childIn)}, ${npt(r.childOut)}) at rate ${r.rate}`,
      metadata: clean({
        reviewRatings: ratings(r),
        // $source-type is a CLOSED vocabulary. The Kurenniemi lesson lands
        // exactly here: an assertion with no asserter is `humanEntry.anonymous`
        // and the carrier says so, rather than letting an unsigned claim read
        // like an identified one.
        dataSource: r.source ? clean({
          type: r.tier ? 'algorithmicMedia' : (r.asserter ? 'humanEntry.identified' : 'humanEntry.anonymous'),
          details: r.source,
          actors: r.asserter ? [{ identifier: String(r.asserter) }] : undefined,
        }) : undefined,
      }),
    }));
    // 2. BOUNDARY uncertainty gets its OWN region, because C2PA has exactly one
    //    place to put a confidence number (reviewRatings, on assertion
    //    metadata) and no way to say *which part* of the claim it qualifies.
    //    TEI's @locus does; the mapping is lossy and this is the loss, made
    //    visible instead of dropped.
    for (const c of boundaryCerts(r.certainty)) {
      const edge = c.locus === 'start' ? r.parentIn : r.parentOut;
      const w = Number(c.widthMs || 0);
      changes.push(clean({
        region: [{ type: 'temporal', time: { type: 'npt', start: npt(edge - w), end: npt(edge + w) } }],
        name: `${r.id}:${c.locus}`,
        role: 'c2pa.areaOfInterest',
        description: `boundary uncertainty at the ${c.locus} of ${r.id}${c.note ? ` — ${c.note}` : ''} (TEI @locus='${c.locus}', @cert=${c.cert}${c.resp ? `, @resp=${c.resp}` : ''})`,
        metadata: clean({ reviewRatings: certRating(c, `${c.locus} boundary`) }),
      }));
    }
    actions.push(clean({
      action: r.kind === 'reconstruction' ? 'c2pa.edited' : 'c2pa.placed',
      softwareAgent: agent,
      digitalSourceType: DIGITAL_SOURCE_TYPE[r.tier] || DIGITAL_SOURCE_TYPE[0],
      description: r.kind === 'reconstruction' ? `reconstruction of lane ${r.lane}` : `quotation of ${r.ref}`,
      parameters: { [ns]: clean({
        ref: r.ref, in: r.childIn, out: r.childOut, rate: r.rate, at: r.parentIn,
        unit: 'ms', tier: r.tier, method: r.method, asserter: r.asserter,
        // the TEI model, carried WHOLE in our namespace because no C2PA field
        // can hold it. This is the part a reader of ours gets back losslessly.
        certainty: r.certainty && r.certainty.length ? r.certainty : undefined,
        marks: r.marks || undefined, trim: r.trim || undefined,
      }) },
      changes,
    }));
    if (r.kind === 'quotation') {
      // §18.16.13, normative: *"when only a portion of an ingredient is used…
      // the metadata field should contain a regionOfInterest field"*. That
      // sentence is the archival-quotation case, written by a standards body.
      ingredients.push(clean({
        label: 'c2pa.ingredient.v3',
        data: clean({
          title: r.ref, relationship: 'componentOf',
          metadata: clean({
            regionOfInterest: {
              region: [{ type: 'temporal', time: { type: 'npt', start: npt(r.childIn), end: npt(r.childOut) } }],
              name: `${r.id}@source`, role: 'c2pa.placed',
              description: `the portion of ${r.ref} used`,
            },
            reviewRatings: ratings(r),
          }),
        }),
      }));
    }
  }
  const doc = {
    // NOT a manifest: a manifest is a signed claim over a hashed asset. This is
    // the assertion payload a Builder would add before signing.
    claim_generator_info: [agent],
    assertions: [clean({
      label: 'c2pa.actions.v2',
      data: { actions },
      metadata: clean({
        dateTime: opts.dateTime || undefined,
        reviewRatings: rowsRating(rows),
      }),
    }), ...ingredients],
  };
  return { doc, caveats: C2PA_CAVEATS };
}

function ratings(r) {
  const v = toReviewRating(r.confidence);
  if (v === null && !r.tier) return undefined;
  const out = [];
  if (v !== null) out.push(clean({
    value: v,
    code: r.tier ? 'ingredient.possiblyModified' : undefined,
    explanation: `identity confidence ${r.confidence} (TEI @locus='name') mapped onto the 1-5 rating-map`,
  }));
  if (r.tier) out.push({ value: Math.max(1, 4 - r.tier), code: 'ingredient.possiblyModified',
    explanation: `tier ${r.tier} restoration (${r.tier === 1 ? 'interpolation' : r.tier === 2 ? 'inpainting' : 'generative infill'})` });
  return out.length ? out : undefined;
}
function certRating(c, what) {
  const v = toReviewRating(typeof c.cert === 'number' ? c.cert : { high: 0.9, medium: 0.6, low: 0.3, unknown: 0 }[c.cert]);
  return v === null ? undefined : [clean({ value: v, explanation: `${what}: @cert=${c.cert}${c.resp ? `, @resp=${c.resp}` : ''}` })];
}
function rowsRating(rows) {
  const cs = rows.map((r) => r.confidence).filter((x) => typeof x === 'number');
  if (!cs.length) return undefined;
  const mean = cs.reduce((a, b) => a + b, 0) / cs.length;
  return [{ value: toReviewRating(mean), explanation: `mean identity confidence over ${cs.length} time-ranged claim(s)` }];
}

const C2PA_CAVEATS = [
  'NOT SIGNED and NOT A MANIFEST. These are assertion payloads. A real implementation adds: a c2pa Builder (@contentauth/c2pa-web 0.14.x WASM, or @trustnxt/c2pa-ts for pure TS + MP4), a hard binding (c2pa.hash.bmff.v3 Merkle hashing over the fragmented MP4 we already ship), a COSE signature from a certificate on a recognised trust list, and a claim over the hashed asset.',
  'NOTHING IN THE ECOSYSTEM WILL READ THE TIME RANGES. contentauth/verify-site has zero `temporal` code paths; c2pa-org/conformance-public never tests `regionOfInterest`; the only c2pa-rs fixture emits an EMPTY time map (= whole asset). Adobe Premiere marks generated frames in its own UI and its exported credential collapses to per-clip. If we emit these we are first, and only our own client renders them.',
  'c2pa-rs `TimeType` currently has only `Npt` — no wallClock, no endInclusivity. We emit npt seconds only, and omit endInclusivity (spec default: end EXCLUSIVE, which matches our half-open ranges and Media Fragments).',
  'reviewRatings is a 1-5 integer and is the ONLY confidence number in a shipping media standard. Our TEI-shaped certainty (@cert/@resp/@locus) does not survive it: locus is lost, resp is lost, the probability is quantised to five buckets. The unquantised original is carried verbatim under parameters["' + NS + '"].certainty, which only our reader understands.',
  'Live assets: C2PA 2.3 handles an undefined end time (the range extends forward until updated). We emit explicit ends; a live encoder should omit `end` instead.',
];

// --- (b) EXT-X-DATERANGE ---------------------------------------------------

/** RFC 8216 §4.3.2.7. `X-` is *"a namespace reserved for client-defined
 *  attributes"*, and clients *"SHOULD use a reverse-DNS syntax"*. Our namespace
 *  is X-ORG-ELEKTRON-*. hls.js surfaces these already
 *  (`enableDateRangeMetadataCues`, default true) as metadata TextTrack cues. */
function hlsDoc(rows, opts) {
  const anchor = opts.anchor === undefined ? 0
    : (opts.anchor instanceof Date ? opts.anchor.getTime() : (typeof opts.anchor === 'string' ? Date.parse(opts.anchor) : Number(opts.anchor)));
  if (!Number.isFinite(anchor)) throw new Error('exportProvenance(hls): `anchor` must be a Date/ISO string/epoch ms — EXT-X-DATERANGE START-DATE is WALL CLOCK, not a media offset');
  const pfx = (opts.xPrefix || 'X-ORG-ELEKTRON').toUpperCase();
  const cls = opts.class || `${NS}.quotation`;
  const tags = [], attrs = [];
  for (const r of rows) {
    const a = [
      ['ID', qs(r.id)],
      ['CLASS', qs(cls)],
      ['START-DATE', qs(new Date(anchor + r.parentIn).toISOString())],
      ['END-DATE', qs(new Date(anchor + r.parentOut).toISOString())],
      ['DURATION', num((r.parentOut - r.parentIn) / 1000)],
      [`${pfx}-REF`, qs(r.ref)],
      [`${pfx}-IN`, num(r.childIn / 1000)],
      [`${pfx}-OUT`, num(r.childOut / 1000)],
      [`${pfx}-RATE`, num(r.rate)],
      [`${pfx}-TIER`, num(r.tier || 0)],
    ];
    if (r.method) a.push([`${pfx}-METHOD`, qs(r.method)]);
    if (r.source) a.push([`${pfx}-SOURCE`, qs(r.source)]);
    if (r.asserter) a.push([`${pfx}-ASSERTER`, qs(r.asserter)]);
    if (typeof r.confidence === 'number') a.push([`${pfx}-CONFIDENCE`, num(r.confidence)]);
    // TEI @locus, one attribute per uncertain THING — the carrier that can
    // actually hold the distinction, because X- attributes are free-form.
    for (const c of r.certainty || []) {
      a.push([`${pfx}-CERT-${String(c.locus).toUpperCase()}`, typeof c.cert === 'number' ? num(c.cert) : qs(String(c.cert))]);
      if (c.resp) a.push([`${pfx}-RESP-${String(c.locus).toUpperCase()}`, qs(String(c.resp))]);
    }
    attrs.push(Object.fromEntries(a));
    tags.push('#EXT-X-DATERANGE:' + a.map(([k, v]) => `${k}=${v}`).join(','));
  }
  return { doc: attrs, tags, text: tags.join('\n'), caveats: HLS_CAVEATS };
}
const qs = (s) => `"${String(s).replace(/"/g, "'")}"`;   // quoted-string: no " or CR/LF
const num = (n) => {
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : String(+v.toFixed(6));
};

const HLS_CAVEATS = [
  'EXT-X-DATERANGE is WALL CLOCK. START-DATE is an ISO-8601 date, so every export needs an `anchor` mapping media position 0 to a real instant. For an archival VOD asset that anchor is a fiction we chose; for a live lane it is the truth and this carrier is the right one.',
  'hls.js exposes these as metadata TextTrack cues (`enableDateRangeMetadataCues`, default true) — so a browser client CAN read them today. That makes this the only one of the three carriers with a shipping reader, and it is the weakest carrier: no signature, no integrity, anyone can edit the playlist.',
  'RFC 8216 has no METADATA rendition type (EXT-X-MEDIA TYPE is AUDIO|VIDEO|SUBTITLES|CLOSED-CAPTIONS), so a WebVTT sidecar must be attached via addTextTrack rather than declared in the playlist.',
  'A tag with END-ON-NEXT=YES must have a CLASS and no END-DATE/DURATION; we always emit explicit ends, which is wrong for an open-ended live segment.',
];

// --- (c) OTIO-shaped -------------------------------------------------------

/** OTIO has NO provenance in its schema; the sanctioned hook is the namespaced
 *  per-object `metadata` dict (Clip, Track, Timeline, MediaReference all have
 *  one). We put the whole quotation value there under `org.elektron.timeline`,
 *  which means an OTIO round trip through any conforming tool preserves it
 *  verbatim — the one carrier that loses NOTHING, and the one nothing acts on.
 *  RationalTime rate is 1000 (ms), so no 23.976 rounding exists here at all. */
function otioDoc(rows, opts) {
  const rate = 1000;
  const RT = (ms) => ({ OTIO_SCHEMA: 'RationalTime.1', value: +ms.toFixed(6), rate });
  const TR = (start, dur) => ({ OTIO_SCHEMA: 'TimeRange.1', start_time: RT(start), duration: RT(dur) });
  const sorted = rows.slice().sort((a, b) => a.parentIn - b.parentIn);
  const children = [];
  let cursor = sorted.length ? Math.min(0, sorted[0].parentIn) : 0;
  for (const r of sorted) {
    if (r.parentIn > cursor + 1e-9) {
      children.push({ OTIO_SCHEMA: 'Gap.1', name: `gap@${cursor}`, source_range: TR(0, r.parentIn - cursor) });
      cursor = r.parentIn;
    }
    const clip = clean({
      OTIO_SCHEMA: 'Clip.2',
      name: r.id,
      enabled: true,
      // source_range is in the SOURCE's domain — which is exactly our in/out.
      source_range: TR(r.childIn, r.childOut - r.childIn),
      media_reference: { OTIO_SCHEMA: 'ExternalReference.1', target_url: `elektron:deck/${r.ref}`,
        metadata: { [NS]: { ref: r.ref, unit: 'ms' } } },
      effects: r.rate !== 1 ? [{ OTIO_SCHEMA: 'LinearTimeWarp.1', name: `rate ${r.rate}`, effect_name: 'LinearTimeWarp', time_scalar: r.rate }] : [],
      markers: (r.marks ? Object.entries(r.marks) : []).filter(([, m]) => m && m.mark).map(([where, m]) => ({
        OTIO_SCHEMA: 'Marker.2', name: `${where}:${m.mark.id}`, color: 'GREEN',
        marked_range: TR(m.at, 0), metadata: { [NS]: clean({ where, mark: m.mark.id, matchedBy: m.matchedBy, moved: m.moved || undefined }) },
      })),
      metadata: { [NS]: clean({
        ref: r.ref, at: r.parentIn, rate: r.rate, in: r.childIn, out: r.childOut, unit: 'ms',
        tier: r.tier, method: r.method, source: r.source, asserter: r.asserter,
        certainty: r.certainty && r.certainty.length ? r.certainty : undefined,
        confidence: r.confidence === null ? undefined : r.confidence,
        trim: r.trim || undefined,
        note: 'TEI-shaped certainty: @locus separates uncertainty about the BOUNDARY (start/end) from uncertainty about the IDENTITY (name). OTIO has no field for either.',
      }) },
    });
    children.push(clip);
    cursor = r.parentOut;
  }
  const doc = {
    OTIO_SCHEMA: 'Timeline.1',
    name: opts.title || 'elektron score',
    global_start_time: RT(0),
    metadata: { [NS]: { v: SCORE_VERSION, unit: 'ms', rate, generator: 'timeline/score.mjs' } },
    tracks: {
      OTIO_SCHEMA: 'Stack.1', name: 'tracks', children: [
        { OTIO_SCHEMA: 'Track.1', name: 'quotations', kind: 'Video', metadata: {}, children },
      ], metadata: {},
    },
  };
  return { doc, caveats: OTIO_CAVEATS };
}

const OTIO_CAVEATS = [
  'OTIO has NO provenance, certainty or confidence in its schema. The namespaced `metadata` dict is the sanctioned hook and is what we use, so a round trip through a conforming tool preserves the value byte-for-byte and acts on none of it.',
  'There is no production JS/WASM OTIO. npm `opentimelineio` 0.1.0 has one release; otio-cpp-wasm self-describes as experimental. Validation here is structural (schema names + field names), not a real OTIO parse.',
  'RationalTime rate is fixed at 1000 (milliseconds) deliberately: OTIO issue #468 (48 frames @23.976 -> 29.97 giving 59.88017976...) is a rounding class we never enter because our domain is ms and our maths is one multiply.',
  'A quotation whose rate != 1 becomes a LinearTimeWarp effect. OTIO applies time_scalar to the clip; our rate composes multiplicatively through the nest and degrades onto the child caps.rates lattice. A tool reading this back gets the WANTED rate, never the rate we actually chose.',
];

// --- validation -------------------------------------------------------------

/** Check a document against PUBLISHED field names. This is not a schema
 *  validator — it is the check that we did not invent a spelling, which is the
 *  failure mode that matters when nothing downstream will tell us. */
export function validateProvenance(doc, carrier) {
  const errors = [], warnings = [], seen = { regions: 0, temporal: 0, ratings: 0, clips: 0, tags: 0 };
  const bad = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  if (carrier === 'c2pa') {
    const as = (doc && doc.assertions) || [];
    if (!as.length) bad('c2pa: no assertions');
    for (const a of as) {
      if (!a.label) bad('c2pa: assertion without a label');
      if (a.metadata) for (const k of Object.keys(a.metadata)) if (!C2PA_META_FIELDS.has(k)) bad(`c2pa: unknown assertion-metadata field '${k}'`);
      for (const r of (a.metadata && a.metadata.reviewRatings) || []) checkRating(r);
      for (const act of (a.data && a.data.actions) || []) {
        for (const k of Object.keys(act)) if (!C2PA_ACTION_FIELDS.has(k)) bad(`c2pa: unknown Action field '${k}'`);
        if (!C2PA_ACTIONS.has(act.action)) warn(`c2pa: action '${act.action}' is not in the v2 core vocabulary`);
        for (const region of act.changes || []) checkRegion(region);
      }
      const roi = a.data && a.data.metadata && a.data.metadata.regionOfInterest;
      if (roi) checkRegion(roi);
      for (const r of (a.data && a.data.metadata && a.data.metadata.reviewRatings) || []) checkRating(r);
    }
    function checkRegion(region) {
      seen.regions++;
      for (const k of Object.keys(region)) if (!C2PA_REGION_FIELDS.has(k)) bad(`c2pa: unknown region-map field '${k}'`);
      if (!Array.isArray(region.region) || !region.region.length) bad('c2pa: region-map needs at least one range-map in `region`');
      if (region.role && !C2PA_ROLES.has(region.role)) warn(`c2pa: role '${region.role}' is not in the published Role vocabulary`);
      for (const rm of region.region || []) {
        for (const k of Object.keys(rm)) if (!C2PA_RANGE_FIELDS.has(k)) bad(`c2pa: unknown range-map field '${k}'`);
        if (!C2PA_RANGE_TYPES.has(rm.type)) bad(`c2pa: range-map type '${rm.type}' not in ${[...C2PA_RANGE_TYPES].join('|')}`);
        if (rm.type === 'temporal') {
          seen.temporal++;
          if (!rm.time) bad('c2pa: a temporal range-map needs `time`');
          else {
            for (const k of Object.keys(rm.time)) if (!C2PA_NPT_FIELDS.has(k)) bad(`c2pa: unknown npt-time-map field '${k}'`);
            if (rm.time.type && rm.time.type !== 'npt') warn(`c2pa: time type '${rm.time.type}' — c2pa-rs TimeType has only Npt and will not round-trip`);
            for (const f of ['start', 'end']) if (rm.time[f] !== undefined && typeof rm.time[f] !== 'string')
              bad(`c2pa: npt ${f} must be a string (tstr), got ${typeof rm.time[f]}`);
            if (rm.time.start !== undefined && rm.time.end !== undefined && Number(rm.time.end) < Number(rm.time.start))
              bad(`c2pa: npt end ${rm.time.end} before start ${rm.time.start}`);
          }
        }
      }
      if (region.metadata) for (const k of Object.keys(region.metadata)) if (!C2PA_META_FIELDS.has(k)) bad(`c2pa: unknown region metadata field '${k}'`);
      for (const r of (region.metadata && region.metadata.reviewRatings) || []) checkRating(r);
      if (region.metadata && region.metadata.dataSource) checkDataSource(region.metadata.dataSource);
    }
    function checkDataSource(ds) {
      for (const k of Object.keys(ds)) if (!C2PA_DATASOURCE_FIELDS.has(k)) bad(`c2pa: unknown dataSource field '${k}'`);
      if (!C2PA_SOURCE_TYPES.has(ds.type)) bad(`c2pa: dataSource type '${ds.type}' is not in the published $source-type vocabulary`);
    }
    function checkRating(r) {
      seen.ratings++;
      for (const k of Object.keys(r)) if (!C2PA_RATING_FIELDS.has(k)) bad(`c2pa: unknown rating-map field '${k}'`);
      if (!(Number.isInteger(r.value) && r.value >= 1 && r.value <= 5)) bad(`c2pa: rating value must be int-range 1..5, got ${r.value}`);
      if (r.code && !C2PA_REVIEW_CODES.has(r.code)) warn(`c2pa: review code '${r.code}' is not published`);
    }
  } else if (carrier === 'hls') {
    const tags = Array.isArray(doc) ? doc : [];
    for (const t of tags) {
      seen.tags++;
      const a = typeof t === 'string' ? parseTag(t) : t;
      if (!a.ID) bad('hls: EXT-X-DATERANGE requires ID');
      if (!a['START-DATE']) bad('hls: EXT-X-DATERANGE requires START-DATE');
      for (const k of Object.keys(a)) {
        if (HLS_KNOWN.has(k)) continue;
        if (!k.startsWith('X-')) bad(`hls: '${k}' is neither a published attribute nor an X- client attribute`);
        else if (!/^X-[A-Z0-9-]+$/.test(k)) bad(`hls: client attribute '${k}' must be [A-Z0-9-] (RFC 8216 §4.3.2.7)`);
        else if (k.split('-').length < 4) warn(`hls: client attribute '${k}' should use reverse-DNS syntax (X-COM-EXAMPLE-...)`);
      }
      for (const k of ['ID', 'CLASS', 'START-DATE', 'END-DATE']) if (a[k] !== undefined && !/^".*"$/.test(a[k])) bad(`hls: ${k} must be a quoted-string`);
      const sd = a['START-DATE'] && Date.parse(a['START-DATE'].slice(1, -1));
      if (a['START-DATE'] && Number.isNaN(sd)) bad(`hls: START-DATE is not ISO-8601: ${a['START-DATE']}`);
      const ed = a['END-DATE'] && Date.parse(a['END-DATE'].slice(1, -1));
      if (ed && sd && ed < sd) bad('hls: END-DATE precedes START-DATE');
      if (a.DURATION !== undefined && !(Number(a.DURATION) >= 0)) bad('hls: DURATION must be a non-negative decimal-floating-point');
      if (a['END-ON-NEXT'] === 'YES' && (a['END-DATE'] || a.DURATION)) bad('hls: END-ON-NEXT=YES forbids END-DATE/DURATION');
    }
    if (!tags.length) warn('hls: no tags emitted');
  } else if (carrier === 'otio') {
    if (!doc || doc.OTIO_SCHEMA !== 'Timeline.1') bad('otio: root must be OTIO_SCHEMA Timeline.1');
    const walkO = (n) => {
      if (!n || typeof n !== 'object') return;
      if (n.OTIO_SCHEMA && !OTIO_SCHEMAS.has(n.OTIO_SCHEMA)) bad(`otio: unknown OTIO_SCHEMA '${n.OTIO_SCHEMA}'`);
      if (n.OTIO_SCHEMA === 'Clip.2') {
        seen.clips++;
        for (const k of Object.keys(n)) if (!OTIO_CLIP_FIELDS.has(k)) bad(`otio: unknown Clip field '${k}'`);
        if (!n.source_range) bad(`otio: clip '${n.name}' has no source_range`);
        const md = n.metadata || {};
        const keys = Object.keys(md);
        if (!keys.length) warn(`otio: clip '${n.name}' carries no metadata`);
        for (const k of keys) if (!k.includes('.')) bad(`otio: metadata key '${k}' is not namespaced (reverse-DNS required by convention)`);
      }
      if (n.OTIO_SCHEMA === 'RationalTime.1' && !(n.rate > 0)) bad('otio: RationalTime needs a positive rate');
      if (n.OTIO_SCHEMA === 'TimeRange.1') {
        if (!n.start_time || !n.duration) bad('otio: TimeRange needs start_time and duration');
        else if (n.duration.value < 0) bad('otio: TimeRange duration is negative');
      }
      for (const v of Object.values(n)) Array.isArray(v) ? v.forEach(walkO) : walkO(v);
    };
    walkO(doc);
  } else bad(`unknown carrier '${carrier}'`);

  return { ok: errors.length === 0, carrier, errors, warnings, seen };
}

function parseTag(line) {
  const s = String(line).replace(/^#EXT-X-DATERANGE:/, '');
  const out = {};
  let i = 0;
  while (i < s.length) {
    const eq = s.indexOf('=', i);
    if (eq < 0) break;
    const k = s.slice(i, eq);
    let v, j;
    if (s[eq + 1] === '"') { j = s.indexOf('"', eq + 2); v = s.slice(eq + 1, j + 1); i = j + 2; }
    else { j = s.indexOf(',', eq + 1); j = j < 0 ? s.length : j; v = s.slice(eq + 1, j); i = j + 1; }
    out[k] = v;
  }
  return out;
}

// --- small shared helpers ---------------------------------------------------

function clean(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out;
}
function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}
/** key-sorted JSON: two structurally equal values have one spelling. */
function canonical(x) {
  if (x === null || typeof x !== 'object') return JSON.stringify(x === undefined ? null : x);
  if (Array.isArray(x)) return `[${x.map(canonical).join(',')}]`;
  const ks = Object.keys(x).filter((k) => x[k] !== undefined).sort();
  return `{${ks.map((k) => `${JSON.stringify(k)}:${canonical(x[k])}`).join(',')}}`;
}
export { canonical as canonicalJSON };
