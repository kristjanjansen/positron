// proto/aikajana/ingest.mjs — THE ARCHIVAL INGEST ADAPTER, pointed at a
// SECOND institution set (plan-timeline §−1).
//
// ERR taught the adapter one shape: ONE institution, describing ITS OWN
// holdings, with a date that describes the WORK (the broadcast) and a precision
// convention it leaks rather than declares (`YYYY-07-15` midpoint padding).
//
// This ingest hits four sources that break that shape in four different ways,
// which is the whole point of running it:
//
//   1. archive.org        — an AGGREGATOR of USER uploads. `date` describes the
//                           FILE (when someone ripped it), not the work. Rights
//                           are UPLOADER-ASSERTED and demonstrably wrong on at
//                           least one item. Media is real and playable.
//   2. Wikidata           — precision is an EXPLICIT integer (8 decade / 9 year
//                           / 10 month / 11 day). The SAME fact is padded two
//                           different ways depending on the serialization
//                           (raw JSON zero-fills `+1970-00-00`, SPARQL/RDF
//                           start-pads `1970-01-01`). No media.
//   3. Europeana / MIMO   — EDM keeps the DATE LITERAL (`"1970"`), so precision
//                           is the string's own length. Honest by omission.
//                           Image only, no ACAO.
//   4. (ERR, for contrast — not fetched here; see research/err-archives-2026-08.md)
//
// Everything is fetched live, ≤1 req/s, a handful of items. Nothing is copied:
// media stays at its origin and the corpus stores a REFERENCE plus the rights
// status and who asserted it.
//
// Run:  node proto/aikajana/ingest.mjs   -> proto/aikajana/corpus.json

import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const UA = 'positron-timeline-research/0.1 (https://elektron.art; kristjan.jansen@gmail.com)';
const RETRIEVED = new Date().toISOString().slice(0, 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastReq = 0;
async function polite(url, opts = {}, tries = 3) {   // <= 1 req/s, always
  for (let n = 1; ; n++) {
    const wait = 1050 - (Date.now() - lastReq);
    if (wait > 0) await sleep(wait);
    lastReq = Date.now();
    try {
      const r = await fetch(url, { ...opts, headers: { 'User-Agent': UA, Accept: 'application/json', ...(opts.headers || {}) } });
      // 429 is the one that MUST NOT be swallowed: WDQS answers a throttled
      // query 200-with-zero-rows, so an ingest that shrugs at rate limits ships
      // an empty corpus that looks successful.
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.json();
    } catch (e) {
      if (n >= tries) throw e;
      await sleep(2000 * n);                       // archive.org closes idle keep-alives
    }
  }
}

// ---------------------------------------------------------------------------
// PRECISION — the four conventions, decoded into ONE honest band.
//
// A band is [lo, hi] epoch-ms: the interval the source's evidence actually
// supports. A day-precise fact is a 24 h band; a year-precise fact is a 365 d
// band. NOTHING is ever collapsed to a fake instant — `at` (used for ordering
// and for the fire) is the band's START, never its midpoint, and the band
// travels with it so the renderer can smear it.
//
// Why START and not midpoint: ERR's `YYYY-07-15` proved that a midpoint is
// indistinguishable from an attested 15 July. A start is at least a LOWER
// BOUND that is true.
// ---------------------------------------------------------------------------
const U = (y, m = 1, d = 1) => Date.UTC(y, m - 1, d);
const YEAR = 365.2425 * 864e5;

function band(kind, ...a) {
  switch (kind) {
    case 'day':    return { at: U(a[0], a[1], a[2]), hi: U(a[0], a[1], a[2]) + 864e5, precision: 'day' };
    case 'month':  return { at: U(a[0], a[1]), hi: U(a[0], a[1] + 1), precision: 'month' };
    case 'year':   return { at: U(a[0]), hi: U(a[0] + 1), precision: 'year' };
    case 'decade': return { at: U(a[0]), hi: U(a[0] + 10), precision: 'decade' };
    case 'range':  return { at: U(a[0]), hi: U(a[1] + 1), precision: 'range' };
    default: throw new Error('band? ' + kind);
  }
}

/** Wikidata declares precision as an integer — the ONE source that does not
 *  make us guess. 11 day, 10 month, 9 year, 8 decade, 7 century. The value
 *  string is zero-filled in raw JSON (`+1970-00-00`) and start-padded in
 *  SPARQL (`1970-01-01`); both parse the same way once precision is read. */
function fromWikidataTime(t, precision) {
  const m = /^([+-]\d{4,})-(\d\d)-(\d\d)T/.exec(t);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]) || 1, d = Number(m[3]) || 1;
  if (precision >= 11) return band('day', y, mo, d);
  if (precision === 10) return band('month', y, mo);
  if (precision === 9) return band('year', y);
  if (precision === 8) return band('decade', Math.floor(y / 10) * 10);
  return band('range', Math.floor(y / 100) * 100, Math.floor(y / 100) * 100 + 99);
}

/** EDM / Europeana keeps the literal. Precision IS the string's length. */
function fromEdmLiteral(s) {
  const t = String(s).replace(/^#/, '').trim();
  if (/^\d{4}$/.test(t)) return band('year', +t);
  if (/^\d{4}-\d{2}$/.test(t)) return band('month', +t.slice(0, 4), +t.slice(5, 7));
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return band('day', +t.slice(0, 4), +t.slice(5, 7), +t.slice(8, 10));
  return null;
}

// ---------------------------------------------------------------------------
// THE BAND, RE-EXPRESSED AS `when` (timeline/transport.mjs v0.6, U1).
//
// This adapter reached the library's rule from the data BEFORE the library had
// it: `at` = the band's START, never a midpoint, "because a start is at least a
// LOWER BOUND that is true". That is exactly `at = when.earliest`. What the ad
// hoc `{at, hi, precision, how}` could NOT say, and `when` can:
//
//   · WHICH RULE produced the bracket, versioned, per row — so when the
//     heuristic changes the affected rows are one `WHERE rule = …` away
//     (DarwinCore's georeferenceProtocol; §5.2's "untested is a declarable
//     state with its own wording");
//   · the VERBATIM source string beside the derived numbers, kept even when it
//     parses cleanly, because it is the evidence that the rule fired;
//   · an honest EDTF re-expression (`196X`, `1963/1973`) instead of a private
//     `precision` enum;
//   · ignorance vs vagueness — and the answer for this corpus is uniform, which
//     is itself a finding: EVERY smear here is IGNORANCE. A tape was recorded on
//     a real day and the catalogue lost it; a person was born at a real moment.
//     Nothing in Kurenniemi's archive is vague in Fisher's sense. The vagueness
//     cases are the ones a PERFORMANCE will author, not the ones an archive
//     hands us.
//   · innerFrom/innerTo — CRM P81, "ongoing throughout". NULL on every row here,
//     and correctly so (CRM Issue 288): no source in this set carries inner
//     evidence. The consequence is precise and worth stating: "certainly in
//     1966" is answerable for these rows ONLY through outer containment, which
//     is sound but incomplete. If MIMO ever says "spring 1970", that is an inner
//     bracket and the query gets sharper for free.
//
// `bandMs` and `precision` survive as DERIVED fields (bandMs = latest -
// earliest) so the renderer and the older asserts keep working — but `when` is
// now the single source of truth and they are computed from it, never beside it.
// ---------------------------------------------------------------------------
const CORPUS_RANGE_WHY = 'Wikidata Q122801742 "Äänityksiä / Recordings 1963–1973" — the authoritative compilation of his tapes';
const RULE_OF = {
  'wikidata-declared-precision': 'wikidata-precision@1',
  'edm-literal-length': 'edm-literal-length@1',
  'filename-year': 'ia-filename-year@1',
  'wikidata-title-match': 'wikidata-title-match@1',
  'derived-from-corpus-range': 'corpus-range@1',
};
const NOTE_OF = {
  'wikidata-declared-precision': 'Wikidata declares precision as an integer (11 day / 10 month / 9 year / 8 decade). The bracket is that unit; the raw value is zero-filled in JSON (+1966-00-00) and start-padded in SPARQL (1966-01-01) — same fact, two paddings, one declared precision.',
  'edm-literal-length': 'Europeana/EDM keeps the date LITERAL, so precision is the string\'s own length. Honest by omission; the bracket is the unit the literal names.',
  'filename-year': 'The only date evidence for this track is a year in parentheses in the uploaded filename. Weak, and real — the bracket is the whole year.',
  'wikidata-title-match': 'No date on the file; a Wikidata work with the same normalised title carries one, and its declared precision is inherited whole.',
  'derived-from-corpus-range': `No date evidence at all on the file. The bracket is the corpus range: ${CORPUS_RANGE_WHY}. A lower AND upper bound that are true, in place of a point that is false.`,
};

const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
/** the honest EDTF re-expression of a band. Level 1 suffices except for the
 *  decade case, which is L2's unspecified digit (`196X`). */
function edtfOf(precision, lo, hi) {
  const y = new Date(lo).getUTCFullYear();
  if (precision === 'day') return isoDay(lo);
  if (precision === 'month') return isoDay(lo).slice(0, 7);
  if (precision === 'year') return String(y);
  if (precision === 'decade') return `${Math.floor(y / 10)}X`;
  return `${y}/${new Date(hi - 1).getUTCFullYear()}`;      // EDTF interval
}

/** dateEvidence -> the library's frozen-sibling shape. Pure, so the corpus can
 *  be re-expressed offline (`--rewhen`) without re-hitting four APIs. */
export function whenFor(e) {
  if (!e || !Number.isFinite(e.at) || !Number.isFinite(e.hi)) return null;
  const rule = RULE_OF[e.how];
  if (!rule) throw new Error(`no versioned rule for dateEvidence.how='${e.how}' — every bracket must name the rule that made it`);
  return {
    verbatim: e.raw === undefined ? null : e.raw,
    edtf: edtfOf(e.precision, e.at, e.hi),
    earliest: e.at,
    latest: e.hi,                 // CLOSED-OPEN
    innerFrom: null, innerTo: null,   // CRM P81 not instantiated — correct here
    rule,
    kind: 'ignorance',            // see the block comment: uniform, and a finding
    note: NOTE_OF[e.how] || null,
  };
}

// ---------------------------------------------------------------------------
// 1. archive.org — the media. Two items, both community uploads.
// ---------------------------------------------------------------------------
const IA_ITEMS = ['videoplayback-13_202304', 'computer-music-1966-dir.-erkki-kurenniemi'];

/** Some IA filenames carry the ONLY date evidence there is for that track:
 *  "… (Love Records, 1968).mp3", "… Jan Barkille (1963) ….mp3". That is
 *  evidence, and it is weak, and both facts must survive into the corpus. */
const yearInName = (n) => { const m = /\(\s*(?:[^()]*,\s*)?(19\d\d)\s*\)/.exec(n); return m ? +m[1] : null; };

/** The filename is BOTH the title and (sometimes) the only date evidence. It is
 *  cleaned for display AFTER yearInName() has read it, and the raw name is kept
 *  in dateEvidence.raw so the evidence is never destroyed by the cosmetics. */
const clean = (n) => n.replace(/\.(mp3|mp4)$/i, '')
  .replace(/\s*(dir\.|Dir\.)?\s*(by\s+)?Erkki Kurenniemi\s*$/, '')
  .replace(/^Erkki Kurenniemi\s*-\s*/, '')
  .replace(/\s*\((?:64|128|320) kbps\)\s*/g, ' ')
  .replace(/\s*\(\s*(?:[^()]*,\s*)?19\d\d\s*\)\s*/g, ' ')     // the year parenthetical
  .replace(/\s*\(\d+\)\s*$/, '')
  .replace(/\s+/g, ' ').trim();

async function archiveOrg() {
  const out = [];
  for (const id of IA_ITEMS) {
    const md = await polite(`https://archive.org/metadata/${id}`);
    const m = md.metadata || {};
    for (const f of md.files || []) {
      if (f.format !== 'VBR MP3' && f.format !== 'MPEG4') continue;
      if (/^videoplayback \(\d+\)\.mp4$/.test(f.name)) continue;   // untitled rips, no evidence at all
      const title = clean(f.name);
      const y = yearInName(f.name);
      out.push({
        id: `ia:${id}/${f.name}`,
        title,
        kind: f.format === 'VBR MP3' ? 'audio' : 'film',
        // DATE EVIDENCE, ranked. The IA `date` field is NOT used for the work:
        // it is the upload/rip era (2022, 2002) and would be a lie.
        dateEvidence: y
          ? { how: 'filename-year', raw: f.name, ...band('year', y) }
          : { how: 'undated', raw: null },
        durSec: Number(f.length) || null,
        media: {
          url: `https://archive.org/download/${id}/${encodeURIComponent(f.name)}`,
          type: f.format === 'VBR MP3' ? 'audio/mpeg' : 'video/mp4',
          bytes: Number(f.size) || null,
        },
        thumb: `https://archive.org/services/img/${id}`,
        prov: {
          source: 'archive.org',
          sourceId: `${id}/${f.name}`,
          sourceUrl: `https://archive.org/details/${id}`,
          custody: 'community upload (aggregator), not an institutional deposit',
          uploader: m.uploader || null,
          uploaded: m.publicdate || null,
          itemDateField: m.date || null,     // KEPT, and deliberately NOT used as `at`
          itemDateMeans: 'when the FILE was made/ripped, not when the work was made',
          rights: m.licenseurl || null,
          rightsAsserter: 'uploader (self-asserted, unverified)',
          rightsConfidence: 'LOW',
          retrieved: RETRIEVED,
        },
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. Wikidata — the dated spine, with precision DECLARED.
// ---------------------------------------------------------------------------
const Q = 'Q3056683';

async function wikidataLife() {
  const d = await polite(`https://www.wikidata.org/wiki/Special:EntityData/${Q}.json`);
  const e = d.entities[Q], cl = e.claims, out = [];
  const push = (p, label, kind) => {
    for (const s of cl[p] || []) {
      const v = s.mainsnak?.datavalue?.value;
      if (!v?.time) continue;
      const b = fromWikidataTime(v.time, v.precision);
      if (!b) continue;
      out.push({
        id: `wd:${Q}/${p}`, title: label, kind,
        dateEvidence: { how: 'wikidata-declared-precision', raw: v.time, wdPrecision: v.precision, ...b },
        prov: {
          source: 'Wikidata', sourceId: `${Q}#${p}`, sourceUrl: `https://www.wikidata.org/wiki/${Q}`,
          custody: 'community knowledge base (CC0 data)',
          rights: 'https://creativecommons.org/publicdomain/zero/1.0/',
          rightsAsserter: 'Wikidata (CC0 by project policy — applies to the DATA, not to any media)',
          rightsConfidence: 'HIGH (for the statement); media n/a',
          retrieved: RETRIEVED,
        },
      });
    }
  };
  push('P569', 'Born — Hämeenlinna', 'life');
  push('P570', 'Died', 'life');
  return out;
}

// The obvious route here is WDQS SPARQL:
//   VALUES ?p { wdt:P170 wdt:P287 wdt:P57 wdt:P86 wdt:P175 } ?item ?p wd:Q3056683
//   OPTIONAL { ?item p:P571/psv:P571 [ wikibase:timeValue ?date ;
//                                      wikibase:timePrecision ?prec ] }
// It works (measured: 14 rows, every ?prec = 9) but WDQS answers 429 to an
// unregistered agent within a couple of calls AND — the trap — a throttled
// answer can come back 200 with ZERO bindings, i.e. an empty corpus that looks
// like a successful ingest. CirrusSearch + EntityData is rate-stable and, as a
// bonus, returns the RAW time value, which is where Wikidata's zero-fill
// convention (`+1966-00-00T00:00:00Z`) is visible; SPARQL start-pads it to
// `1966-01-01` and hides that.
const WD_PROPS = ['P170', 'P287', 'P57', 'P86', 'P175', 'P61'];   // creator, designer, director, composer, performer, inventor

async function wikidataWorks() {
  // One query per property: CirrusSearch takes `haswbstatement:P57=Q…` fine but
  // silently returns nothing for the OR of several of them.
  const qidSet = new Set();
  for (const p of WD_PROPS) {
    const s = await polite('https://www.wikidata.org/w/api.php?action=query&list=search&format=json&srlimit=50&srsearch='
      + encodeURIComponent(`haswbstatement:${p}=${Q}`));
    for (const r of s.query?.search || []) if (/^Q\d+$/.test(r.title)) qidSet.add(r.title);
  }
  const qids = [...qidSet];
  if (!qids.length) throw new Error('wikidata: search returned no QIDs — refusing to ship an empty spine');
  const out = [];
  for (let i = 0; i < qids.length; i += 25) {
    const batch = qids.slice(i, i + 25);
    const d = await polite('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|claims'
      + '&languages=en|fi|sv&ids=' + batch.join('|'));
    for (const qid of batch) {
      const e = d.entities?.[qid]; if (!e || e.missing !== undefined) continue;
      const label = e.labels?.en?.value || e.labels?.fi?.value || e.labels?.sv?.value || qid;
      const inc = e.claims?.P571?.[0]?.mainsnak?.datavalue?.value           // inception
        || e.claims?.P577?.[0]?.mainsnak?.datavalue?.value;                // publication date
      const b = inc?.time ? fromWikidataTime(inc.time, inc.precision) : null;
      out.push({
        id: `wd:${qid}`, title: label, kind: 'work',
        dateEvidence: b
          ? { how: 'wikidata-declared-precision', raw: inc.time, wdPrecision: inc.precision, ...b }
          : { how: 'undated', raw: null },
        prov: {
          source: 'Wikidata', sourceId: qid, sourceUrl: `https://www.wikidata.org/wiki/${qid}`,
          custody: 'community knowledge base (CC0 data)',
          rights: 'https://creativecommons.org/publicdomain/zero/1.0/',
          rightsAsserter: 'Wikidata (CC0 — the STATEMENT; the work itself is not free)',
          rightsConfidence: 'HIGH (statement)', retrieved: RETRIEVED,
        },
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3. Europeana — the surviving INSTRUMENT. A DIMI-A in Stockholm.
// ---------------------------------------------------------------------------
async function europeana() {
  const d = await polite('https://api.europeana.eu/record/v2/09102/_SMS_MM_X5176.json?wskey=api2demo');
  const o = d.object;
  const prox = (o.proxies || []).find((p) => !p.europeanaProxy) || {};
  const agg = (o.aggregations || [])[0] || {};
  const lit = prox.dcDate?.def?.[0];
  const b = fromEdmLiteral(lit);
  return [{
    id: 'eu:09102/_SMS_MM_X5176',
    title: 'DIMI-A — the surviving instrument (Stockholm)',
    kind: 'instrument',
    dateEvidence: { how: 'edm-literal-length', raw: lit, ...(b || {}) },
    thumb: agg.edmIsShownBy || null,
    prov: {
      source: 'Europeana / MIMO — Swedish Museum of Performing Arts',
      sourceId: 'SMS-MM:X5176',
      sourceUrl: 'https://www.europeana.eu/item/09102/_SMS_MM_X5176',
      custody: 'institutional (Scenkonstmuseet), aggregated via MIMO -> Europeana',
      rights: agg.edmRights?.def?.[0] || null,
      rightsAsserter: 'holding institution, via the aggregator (machine-readable EDM field)',
      rightsConfidence: 'HIGH',
      photo: agg.webResources?.[0]?.webResourceDcRights?.sv?.[0] || null,
      corsOnMedia: false,
      retrieved: RETRIEVED,
    },
  }];
}

// ---------------------------------------------------------------------------
// Reconciliation — the ONLY place a date is invented, and it says so.
// ---------------------------------------------------------------------------
/** The undated IA tracks are not undatable: Wikidata knows the authoritative
 *  compilation of his tapes is titled "Äänityksiä / Recordings 1963–1973".
 *  So an undated track gets THAT decade as its band, precision `range`,
 *  `how: 'derived-from-corpus-range'`. It is a lower- and upper-bound that is
 *  TRUE, rather than a point that is false. Tier 1 on §5b's spectrum:
 *  bounded by evidence on both sides. */
const CORPUS_RANGE = { from: 1963, to: 1973, why: CORPUS_RANGE_WHY };

function reconcile(items, works) {
  const byTitle = new Map(works.filter((w) => w.dateEvidence.at != null)
    .map((w) => [w.title.toLowerCase().replace(/[^a-z0-9]/g, ''), w]));
  for (const it of items) {
    if (it.dateEvidence.at != null) continue;
    const key = it.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hit = byTitle.get(key);
    if (hit) {
      it.dateEvidence = { ...hit.dateEvidence, how: 'wikidata-title-match', matched: hit.id, tier: 1 };
      continue;
    }
    const b = band('range', CORPUS_RANGE.from, CORPUS_RANGE.to);
    it.dateEvidence = { how: 'derived-from-corpus-range', raw: null, tier: 1, why: CORPUS_RANGE.why, ...b };
  }
  return items;
}

/** The one place `at`, `bandMs` and `precision` are written, and all three are
 *  now DERIVED from `when` — one source of truth, so they cannot drift apart.
 *  `at = when.earliest` is the library's firing rule stated in the client. */
const withWhen = (i) => {
  const when = whenFor(i.dateEvidence);
  return { ...i, when, at: when.earliest, bandMs: when.latest - when.earliest, precision: i.dateEvidence.precision };
};

function summarise(all, label) {
  const n = (k) => all.filter((i) => i.kind === k).length;
  console.log(`${label}: ${all.length} items — life ${n('life')} · work ${n('work')} · instrument ${n('instrument')} · audio ${n('audio')} · film ${n('film')}`);
  const byP = {}; for (const i of all) byP[i.precision] = (byP[i.precision] || 0) + 1;
  console.log('precision:', byP);
  // the U4 number, computed here so it is visible without a browser: what
  // fraction of this corpus is positioned by WHICH rule.
  const byR = {}; for (const i of all) byR[i.when.rule] = (byR[i.when.rule] || 0) + 1;
  console.log('by rule  :', Object.entries(byR).map(([r, c]) => `${r} ${c} (${((c / all.length) * 100).toFixed(0)}%)`).join(' · '));
  console.log('smeared  :', all.filter((i) => i.bandMs > 0).length, '/', all.length,
    '· with an inner bracket:', all.filter((i) => i.when.innerFrom !== null).length,
    '· kinds:', [...new Set(all.map((i) => i.when.kind))].join(','));
  console.log('playable :', all.filter((i) => i.media).length, 'media refs,',
    all.filter((i) => i.media?.type === 'audio/mpeg').length, 'audio');
  const span = [all[0].at, Math.max(...all.map((i) => i.when.latest))];
  console.log('span     :', isoDay(span[0]), '->', isoDay(span[1]), `(${((span[1] - span[0]) / YEAR).toFixed(1)} y)`);
}

/** `--rewhen` — RE-EXPRESS the existing corpus through `when`, offline.
 *  `when` is a PURE function of `dateEvidence`, which every row already carries,
 *  so this is a migration and not a re-ingest: no API is hit, no number can move
 *  for a reason unrelated to the change, and the diff is exactly the new field
 *  plus whatever `bandMs`/`precision` were if they had ever drifted from it. */
function rewhen() {
  const path = join(HERE, 'corpus.json');
  const corpus = JSON.parse(readFileSync(path, 'utf8'));
  const before = corpus.items.map((i) => [i.id, i.at, i.bandMs, i.precision]);
  corpus.items = corpus.items.map(withWhen);
  corpus.generated = new Date().toISOString();
  corpus.generator = 'proto/aikajana/ingest.mjs --rewhen';
  corpus.positionRule = {
    anchor: 'at = when.earliest (timeline/transport.mjs v0.6 U2) — the bracket\'s lower bound, never a midpoint',
    bracket: 'CLOSED-OPEN [earliest, latest)',
    rules: [...new Set(corpus.items.map((i) => i.when.rule))],
    inner: 'innerFrom/innerTo are null on every row: no source in this set carries CRM P81 evidence, so "certainly in year Y" is answerable only through outer containment (sound, incomplete)',
    kind: 'every smear here is IGNORANCE — a real day the catalogue lost, never a vague concept',
  };
  writeFileSync(path, JSON.stringify(corpus, null, 1));
  const moved = corpus.items.filter((i, k) => before[k][1] !== i.at || before[k][2] !== i.bandMs || before[k][3] !== i.precision);
  console.log(`--rewhen: ${corpus.items.length} items re-expressed through \`when\`; ${moved.length} number(s) moved` +
    (moved.length ? `: ${moved.map((m) => m.id).join(', ')}` : ' — at / bandMs / precision are BIT-IDENTICAL'));
  summarise(corpus.items, 'corpus.json');
}

// ---------------------------------------------------------------------------
const main = async () => {
  const [ia, life, works, eu] = [await archiveOrg(), await wikidataLife(), await wikidataWorks(), await europeana()];
  reconcile(ia, works);
  // A Wikidata work that HAS an IA file is one item, not two: the file wins
  // (it has media) and takes the work's declared precision if it is better.
  const iaKeys = new Set(ia.map((i) => i.title.toLowerCase().replace(/[^a-z0-9]/g, '')));
  const spine = works.filter((w) => !iaKeys.has(w.title.toLowerCase().replace(/[^a-z0-9]/g, '')));

  const all = [...life, ...spine, ...eu, ...ia]
    .filter((i) => Number.isFinite(i.dateEvidence.at))
    .sort((a, b2) => a.dateEvidence.at - b2.dateEvidence.at)
    .map(withWhen);

  const corpus = {
    subject: 'Erkki Kurenniemi (1941–2017)',
    generated: new Date().toISOString(),
    generator: 'proto/aikajana/ingest.mjs',
    note: 'Media is REFERENCED at its origin, never copied. Rights status and its ASSERTER travel per item.',
    corpusRange: CORPUS_RANGE,
    positionRule: {
      anchor: "at = when.earliest (timeline/transport.mjs v0.6 U2) — the bracket's lower bound, never a midpoint",
      bracket: 'CLOSED-OPEN [earliest, latest)',
      rules: [...new Set(all.map((i) => i.when.rule))],
      inner: 'innerFrom/innerTo are null on every row: no source in this set carries CRM P81 evidence, so "certainly in year Y" is answerable only through outer containment (sound, incomplete)',
      kind: 'every smear here is IGNORANCE — a real day the catalogue lost, never a vague concept',
    },
    precisionConventions: {
      'archive.org': "no precision field; `date` is uploader-typed and describes the FILE not the work — UNUSED as `at`. Year evidence comes from the FILENAME.",
      Wikidata: 'EXPLICIT integer precision (8 decade / 9 year / 10 month / 11 day). Raw JSON zero-fills (+1970-00-00); SPARQL start-pads (1970-01-01). Same fact, two paddings, one declared precision.',
      'Europeana/EDM': 'the date LITERAL survives ("1970") — precision is the string length. Honest by omission.',
      'ERR (arhiiv.err.ee, for contrast)': 'no precision field; year-only MIDPOINT-padded to YYYY-07-15 — indistinguishable from an attested 15 July. Must be reverse-engineered.',
    },
    items: all,
  };
  writeFileSync(join(HERE, 'corpus.json'), JSON.stringify(corpus, null, 1));
  summarise(all, 'corpus.json');
};
if (process.argv.includes('--rewhen')) rewhen();
else main().catch((e) => { console.error(e); process.exit(1); });
