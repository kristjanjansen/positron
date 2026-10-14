// Builds corpus.json for /resources/: pointers to Kurenniemi material, never copies. Every
// status and CORS header is observed and unreachable sources are kept. Cache: $KUR_CACHE.
// Run: node demo/resources/build-corpus.mjs [--offline] [--only zenodo,commons,...]
// See lessons/page-resources.md#resources-141

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const OUT = join(HERE, 'corpus.json');
const CACHE = process.env.KUR_CACHE || join(tmpdir(), 'positron-kurenniemi-cache');

const argv = process.argv.slice(2);
const OFFLINE = argv.includes('--offline');
const ONLY = (() => {
  const i = argv.indexOf('--only');
  return i < 0 ? null : new Set(argv[i + 1].split(','));
})();

// A real user agent with a way to reach us. MusicBrainz answers 503 to a
// generic one, and it is right to: an archive should be able to tell who is
// asking. Every request here carries it.
const UA = 'positron-corpus/1.0 (+https://positron.studio; kristjan.jansen@gmail.com)';

// Every request sends an Origin header, or it is not a CORS test (Europeana answers ACAO
// only with one); `cache-v2` discards answers gathered without it.
// See lessons/page-resources.md#resources-142
const ORIGIN = 'https://positron.studio';

// ── the record of what was asked ────────────────────────────────────────────

// The page's createTable cap, mirrored here; the build refuses a larger corpus.
// See lessons/page-resources.md#resources-143
const PAGE_CAP = 600;
const sources = [];
const items = [];
const log = (...a) => console.error(...a);

/**
 * One request, and a record of how it went. Status is a number when the host answered and a
 * string (`DNS ENOTFOUND`) when it did not, kept distinct rather than flattened to null.
 * See lessons/page-resources.md#resources-144
 */
async function ask(url, o = {}) {
  const key = `cache-v2-${o.key || url}`;
  const file = join(CACHE, encodeURIComponent(key).replace(/%/g, '_').slice(0, 180));
  const meta = file + '.meta.json';
  if (OFFLINE || o.cache) {
    if (existsSync(meta)) {
      const m = JSON.parse(readFileSync(meta, 'utf8'));
      if (OFFLINE || m.at > Date.now() - (o.maxAgeMs ?? 6 * 3600e3)) {
        // A failure is cached too (meta only), so --offline reports what the live run saw.
        // See lessons/page-resources.md#resources-145
        const body = existsSync(file) ? (o.binary ? readFileSync(file) : readFileSync(file, 'utf8')) : null;
        return { ...m, body, cached: true };
      }
    }
    if (OFFLINE) return { url, status: 'NOT ASKED — nothing cached', cors: null, body: null, cached: false };
  }
  let out;
  // Retry only 503-style "come back later" (MusicBrainz under load); a 403 or 404 is an answer.
  // See lessons/page-resources.md#resources-146
  for (let attempt = 0; attempt < (o.tries ?? 1); attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1500 * attempt));
    try {
      const res = await fetch(url, {
        method: o.method || 'GET',
        headers: { 'user-agent': UA, origin: ORIGIN, ...(o.headers || {}) },
        body: o.body,
      });
      const body = o.binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
      // `content-length` is the wire size; fetch decompresses gzip, so `body.length` is expanded.
      // See lessons/page-resources.md#resources-147
      const seen = (h) => {
        const v = res.headers.get(h);
        return v ? [...new Set(v.split(',').map((s) => s.trim()))].join(', ') : null;
      };
      out = { url, status: res.status, cors: seen('access-control-allow-origin'),
              expose: seen('access-control-expose-headers'), type: seen('content-type'),
              wireBytes: +res.headers.get('content-length') || null, body };
    } catch (e) {
      const code = e.cause?.code || e.code || e.message;
      out = { url, status: `${/ENOTFOUND|EAI_AGAIN|SERVFAIL/.test(code) ? 'DNS' : 'NETWORK'} ${code}`,
              cors: null, expose: null, type: null, wireBytes: null, body: null };
    }
    if (out.status === 200 || (typeof out.status === 'number' && out.status !== 503)) break;
  }
  if (o.cache) {
    mkdirSync(CACHE, { recursive: true });
    if (out.body != null) writeFileSync(file, out.body);
    writeFileSync(meta, JSON.stringify({ url, status: out.status, cors: out.cors, expose: out.expose,
                                         type: out.type, wireBytes: out.wireBytes, at: Date.now() }));
  }
  log(`  ${out.status}  ${url.slice(0, 96)}`);
  return out;
}

const json = (r) => { try { return JSON.parse(r.body); } catch { return null; } };
const corsOf = (r) => (r.cors == null ? false : r.cors === '*' || r.cors.startsWith('http'));

/** Register a source in the output's ledger. `items` is filled in at the end. */
function source(row) { sources.push({ items: 0, ...row }); return row.name; }

/**
 * A licence's name by lookup, never by shortening, plus the string the source gave;
 * anything unrecognised passes through untouched.
 * See lessons/page-resources.md#resources-148
 */
function licenceName(raw) {
  const s = String(raw || '').trim();
  const table = [
    [/publicdomain\/zero|^cc0/i, 'CC0 1.0'],
    [/publicdomain\/mark/i, 'public domain mark'],
    [/^public domain$/i, 'public domain'],
    [/licenses\/by-nc-sa\/4/i, 'CC BY-NC-SA 4.0'],
    [/licenses\/by-nc-nd\/4/i, 'CC BY-NC-ND 4.0'],
    [/licenses\/by-sa\/4/i, 'CC BY-SA 4.0'],
    [/licenses\/by\/4|^cc-by-4\.0$|^cc by 4\.0$/i, 'CC BY 4.0'],
  ];
  for (const [re, name] of table) if (re.test(s)) return name;
  return s || 'not stated';
}

/**
 * One file per source gets a real Range request: a catalogue's CORS does not predict its
 * file host's (archive.org redirects video to a node without ACAO).
 * See lessons/page-resources.md#resources-149
 */
async function mediaCheck(url) {
  if (!url) return null;
  const r = await ask(url, { cache: true, key: `media-${url}`, headers: { range: 'bytes=0-1023' } });
  return {
    url, status: r.status, cors: r.cors || null, type: r.type || null,
    // Without this header a browser can fetch the bytes and cannot see how many
    // there are — which is the difference between streaming a file and
    // guessing at it.
    exposesRange: /content-range/i.test(r.expose || ''),
  };
}

// Dates: written as the source wrote them, bracket computed from that (a bare `1966` is the
// whole year). `latest` is exclusive: the first instant the thing is over.
// See lessons/page-resources.md#resources-150
const Y = (y) => Date.UTC(y, 0, 1);
const none = (how, note) =>
  ({ edtf: null, earliest: null, latest: null, precision: 'none', how, ...(note ? { note } : {}) });

/** `1968`, `1968-08`, `1968-08-04` — precision is the length of what was given. */
function whenFrom(text, how) {
  if (!text) return none(how, 'the source recorded no date');
  const s = String(text).trim().slice(0, 10);
  let m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) {
    const a = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return { edtf: s, earliest: a, latest: a + 86400e3, precision: 'day', how };
  }
  if ((m = /^(\d{4})-(\d{2})$/.exec(s))) {
    return { edtf: s, earliest: Date.UTC(+m[1], +m[2] - 1, 1),
             latest: Date.UTC(+m[1], +m[2], 1), precision: 'month', how };
  }
  if ((m = /^(\d{4})/.exec(s))) {
    return { edtf: m[1], earliest: Y(+m[1]), latest: Y(+m[1] + 1), precision: 'year', how };
  }
  return none(how, `unparsed date literal ${JSON.stringify(text)}`);
}

/** A span of whole years, as an institution's `yearFrom`/`yearTo` gives it. */
function whenYears(from, to, how) {
  if (!from) return none(how, 'the source recorded no year');
  if (!to || to === from) return whenFrom(String(from), how);
  return { edtf: `${from}–${to}`, earliest: Y(from), latest: Y(to + 1), precision: 'range', how };
}

/**
 * Wikimedia's date carries a QuickStatements precision suffix (`/10`: 11 day, 10 month,
 * 9 year), declared rather than inferred; proto/deck/ingest.mjs decodes the same ladder.
 * See lessons/page-resources.md#resources-151
 */
function whenQS(raw, how) {
  const m = /([+-]\d{4})-(\d{2})-(\d{2})T[^/]*\/(\d+)/.exec(raw || '');
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3], p = +m[4];
    if (p >= 11 && mo && d) return whenFrom(`${String(y).padStart(4, '0')}-${m[2]}-${m[3]}`, how);
    if (p === 10 && mo) return whenFrom(`${String(y).padStart(4, '0')}-${m[2]}`, how);
    return whenFrom(String(y), how);
  }
  // No qualifier: fall back to whatever ISO-ish text is in there.
  const iso = /(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(String(raw).replace(/<[^>]+>/g, ''));
  if (!iso) return none(how, `unparsed date literal ${JSON.stringify(raw)}`);
  return whenFrom([iso[1], iso[2], iso[3]].filter(Boolean).join('-'), how);
}

/**
 * A Finnish archivist's date in its eleven written forms (`1950-luku`, `30-06-1975`,
 * `1992-00-00`...). A qualifier like "mid" goes into the note, never narrows the bracket;
 * `jälkeen` closes at 2018, after his death, an inference stated in the note.
 * See lessons/page-resources.md#resources-152
 */
function whenFinnishArchive(text, how) {
  const s = String(text || '').trim();
  if (!s) return none(how, 'the source recorded no date');
  let m;
  // `30-06-1975` — day first. Checked BEFORE the ISO forms: both are three
  // integers and only the position of the four-digit one tells them apart.
  if ((m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s))) {
    return { ...whenFrom(`${m[3]}-${m[2]}-${m[1]}`, how), edtf: `${m[3]}-${m[2]}-${m[1]}` };
  }
  // `1992-00-00` — a declared unknown inside a date-shaped field. The year is
  // real; the zeros are not a January the 0th.
  if ((m = /^(\d{4})-00(-00)?$/.exec(s))) {
    return { ...whenFrom(m[1], how),
             note: 'the source wrote the month and day as 00, which is its way of saying it does not know them' };
  }
  // `1963-2005` — a span of whole years. Told from `1976-11` by the width of
  // the second number.
  if ((m = /^(\d{4})-(\d{4})$/.exec(s))) return whenYears(+m[1], +m[2], how);
  // `1994, 2003-09-30`: two dates, the bracket spans them.
  // See lessons/page-resources.md#resources-153
  if ((m = /^(\d{4})\s*,\s*(\d{4})-(\d{2})-(\d{2})$/.exec(s))) {
    return { edtf: `${m[1]}–${m[2]}-${m[3]}-${m[4]}`, earliest: Y(+m[1]),
             latest: Date.UTC(+m[2], +m[3] - 1, +m[4]) + 86400e3, precision: 'range', how,
             note: `the source gives two dates, ${s}` };
  }
  // `1975 jälkeen` — an open start. See the block comment for why it closes
  // where it does.
  if ((m = /^(\d{4})\s+jälkeen$/i.exec(s))) {
    return { edtf: `after ${m[1]}`, earliest: Y(+m[1]), latest: Y(2018), precision: 'after', how,
             note: `the source says "${s}": after ${m[1]}, with no end. The bracket closes at his `
                 + 'death in 2017 because nothing in his own archive can be later' };
  }
  // `1950-luku`, and the four qualified forms.
  if ((m = /^(\d{3})0-luku|^(\d{3})0-luvun/.exec(s))) {
    const dec = +(m[1] ?? m[2]) * 10;
    // The Finnish qualifier is translated rather than passed through: `the
    // source says "1950-luvun puoliväli" — puoliväli of the decade` says
    // nothing to a reader who does not have the word, which is most readers.
    const FI = { puoliväli: 'the middle', alkupuoli: 'the first half',
                 loppupuoli: 'the latter half', alku: 'the beginning', loppu: 'the end' };
    const qual = /puoliväli|alkupuoli|loppupuoli|alku|loppu/.exec(s)?.[0] || null;
    return { edtf: `${String(dec).slice(0, 3)}X`, earliest: Y(dec), latest: Y(dec + 10),
             precision: 'decade', how,
             ...(qual ? { note: `the source says "${s}", which is ${FI[qual]} of the ${dec}s. The bracket is `
                              + 'the whole decade because that qualifier has no defined width' } : {}) };
  }
  return whenFrom(s, how);
}

/** HTML entities, because these titles come off a rendered page and not an API. */
const unent = (s) => String(s || '')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
  .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘')
  .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// 0. proto/deck/corpus.json is folded in, not re-researched, with `when.note` and `note`
// carried; its generation date goes into `inputs`, and the page checks every deck id is here.
// See lessons/page-resources.md#resources-154
function foldDeck() {
  const path = 'proto/deck/corpus.json';
  const deck = JSON.parse(readFileSync(join(REPO, path), 'utf8'));
  // The deck writes one source name as a sentence — the institution, the
  // aggregator and the museum in one string. This file uses the name of the
  // SITE you would go to, and says the rest in `holder`.
  const SRC = {
    'archive.org': ['archive.org', 'uploaded by a member of the public, not deposited by an institution'],
    Wikidata: ['Wikidata', 'community knowledge base'],
    'Europeana / MIMO — Swedish Museum of Performing Arts':
      ['Europeana', 'Swedish Museum of Performing Arts, through Europeana and MIMO'],
  };
  const out = deck.items.map((it) => {
    const [src, holder] = SRC[it.prov.source] || [it.prov.source, it.prov.custody || ''];
    return {
      id: it.id,
      title: it.title,
      kind: it.kind,
      source: src,
      holder,
      sourceId: it.prov.sourceId,
      url: it.prov.sourceUrl,
      file: it.media?.url || null,
      fileType: it.media?.type || null,
      bytes: it.media?.bytes ?? null,
      count: 1,
      when: {
        edtf: it.when.edtf.replace('/', '–'),
        earliest: it.when.earliest,
        latest: it.when.latest,
        precision: it.precision,
        how: it.dateEvidence?.how || it.when.rule,
        note: it.when.note || null,
      },
      licence: it.prov.rights || 'not stated',
      licenceBy: it.prov.rightsAsserter || 'nobody',
      licenceConfidence: it.prov.rightsConfidence || null,
      http: null, httpFrom: 'deck',
      cors: null,
      note: it.note || null,
      via: path,
    };
  });
  return { deck, out };
}

// Thesis pass: fourteen dates rest on Ojanen's PhD pages. Twelve fold in from
// proto/deck/ingest.mjs and two National Gallery rows are here; any total but 14 refuses.
// These two move no date; they corroborate the catalogue's year (Table 3, p. 81).
// See lessons/page-resources.md#resources-155
const THESIS_ROWS = 14;
const THESIS_SOURCE = 'Mikko Ojanen, "User Stories of Erkki Kurenniemi\'s Electronic Musical '
  + 'Instruments, 1961-1978" (PhD, University of Helsinki, 2020), 10.5281/zenodo.4306056, '
  + 'CC BY 4.0 on the text';
const CORROBORATED = {
  'fng:646207': 'Ojanen 2020 Table 3 (printed p. 81) gives the DIMI-O as 1971 with one built, '
    + 'which agrees with the year the catalogue states',
  'fng:382248': 'Ojanen 2020 Table 3 (printed p. 81) gives the DIMI-S as 1972 with two built, '
    + 'which agrees with the year the catalogue states',
};

// ── 1. Zenodo ───────────────────────────────────────────────────────────────
async function zenodo() {
  const asked = 'https://zenodo.org/api/records?q=Kurenniemi&size=25&page=1';
  let page = 1, total = null, http = null, cors = null;
  const out = [];
  // Zenodo searches full text: the record's own metadata must name him; the four that do not
  // are named in the ledger (one is Risto Rautee's thesis).
  // See lessons/page-resources.md#resources-156
  const dropped = [];
  while (page < 10) {
    const url = `https://zenodo.org/api/records?q=Kurenniemi&size=25&page=${page}`;
    const r = await ask(url, { cache: true, key: `zenodo-${page}` });
    if (page === 1) { http = r.status; cors = corsOf(r); }
    const j = json(r);
    if (!j?.hits) break;
    total = j.hits.total;
    for (const h of j.hits.hits) {
      const m = h.metadata || {};
      const says = [m.title, (m.creators || []).map((c) => c.name).join(' '),
                    (m.keywords || []).join(' '), String(m.description || '').replace(/<[^>]+>/g, ' ')]
        .join(' ');
      if (!/kurenniemi/i.test(says)) {
        dropped.push(`${h.id} "${m.title}" (${(m.creators || []).map((c) => c.name).join('; ')})`);
        continue;
      }
      const files = h.files || [];
      const bytes = files.reduce((n, f) => n + (f.size || 0), 0);
      // One file gets a direct address; several get the record page. `count` says how many.
      // See lessons/page-resources.md#resources-157
      const one = files.length === 1 ? files[0] : null;
      const type = (h.metadata?.resource_type?.type || 'text').toLowerCase();
      const ext = (one?.key.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase();
      out.push({
        id: `zenodo:${h.id}`,
        title: h.metadata?.title?.replace(/\s+/g, ' ').trim(),
        kind: { video: 'video', image: 'image', dataset: 'data', presentation: 'text',
                publication: 'text', poster: 'text', software: 'data' }[type] || 'text',
        source: 'Zenodo',
        holder: 'deposited by University of Helsinki researchers (Mikko Ojanen and others)',
        sourceId: String(h.id),
        url: h.links?.self_html || `https://zenodo.org/records/${h.id}`,
        file: one ? one.links.self : null,
        // Decide by extension: Zenodo answers application/octet-stream for every file.
        // See lessons/page-resources.md#resources-158
        fileType: ext ? ({ pdf: 'application/pdf', csv: 'text/csv', mp4: 'video/mp4',
                           mpg: 'video/mpeg', tif: 'image/tiff', jpg: 'image/jpeg',
                           png: 'image/png', zip: 'application/zip' }[ext] || null) : null,
        bytes: bytes || null,
        count: files.length || 1,
        when: whenFrom(h.metadata?.publication_date, 'zenodo-publication-date'),
        licence: h.metadata?.license?.id || 'not stated',
        licenceBy: 'the depositor, declared on the record',
        licenceConfidence: 'HIGH',
        http: r.status, httpFrom: 'listing',
        cors: corsOf(r),
        note: files.length > 1 ? `${files.length} files on the record` : null,
        doi: h.doi || null,
      });
    }
    if (out.length + dropped.length >= (total ?? 0)) break;
    page++;
  }
  source({
    name: 'Zenodo', host: 'zenodo.org', asked, http, cors,
    media: await mediaCheck(out.find((x) => x.file)?.file),
    licence: 'CC-BY-4.0 on every record found',
    what: 'the University of Helsinki electroacoustic-music research deposit',
    note: `${total} records matched the word and ${out.length} name him in their own metadata; `
        + `the page size is capped at 25 without a login, so this is ${page} requests. `
        + `Left out by that rule: ${dropped.join(' · ')}`,
  });
  return out;
}

// 2. Finnish National Gallery: a bulk dump (89,072 records, 29 MB gzipped), filtered here
// and cached.
// See lessons/page-resources.md#resources-159
async function fng() {
  const asked = 'https://kokoelma.kansallisgalleria.fi/api/v1/objects';
  const r = await ask(asked, { cache: true, binary: true, key: 'fng-objects', maxAgeMs: 30 * 86400e3,
                               headers: { 'accept-encoding': 'gzip' } });
  if (!r.body) {
    source({ name: 'National Gallery', host: 'kokoelma.kansallisgalleria.fi', asked,
             http: r.status, cors: null, licence: 'unknown — not reached',
             what: 'the Central Art Archives: both Kurenniemi fonds, the films, two instruments',
             note: 'could not be read on this run' });
    return [];
  }
  // The cache holds the bytes as they arrived, which are gzip; `fetch` already
  // decoded them once when it was live. Try both rather than guess which.
  let text;
  try { text = gunzipSync(r.body).toString('utf8'); } catch { text = r.body.toString('utf8'); }
  const all = JSON.parse(text);
  // Rule: the record's JSON mentions the name anywhere, including works about him by others.
  // See lessons/page-resources.md#resources-160
  const hits = all.filter((x) => JSON.stringify(x).includes('urenniemi'));
  const out = hits.map((x) => {
    const t = x.title || {};
    const cat = (x.category || {}).en || (x.category || {}).fi || 'record';
    const kind = { 'private archive': 'collection', series: 'collection',
                   'audio-visual material': 'video', artwork: 'work' }[cat]
      || (cat.includes('archive') ? 'collection' : 'work');
    const metres = (x.dimensions || []).find((d) => d.unit === 'm')?.measurements?.[0];
    // Only the fonds and series records carry a subject list worth printing —
    // an artwork's keywords describe the picture, not the holding.
    const kws = /archive|series|sarja/i.test(cat)
      ? (x.keywords || []).map((k) => k.en || k.fi).filter(Boolean)
      : [];
    return {
      id: `fng:${x.objectId}`,
      title: (t.en || t.fi || t.sv || '(untitled)').replace(/\s+/g, ' ').trim(),
      kind: x.objectId === 382248 || x.objectId === 646207 ? 'instrument' : kind,
      source: 'National Gallery',
      holder: x.responsibleOrganisation || 'Finnish National Gallery',
      sourceId: x.inventoryNumber || String(x.objectId),
      url: `https://kokoelma.kansallisgalleria.fi/en/object/${x.objectId}`,
      file: null, fileType: null, bytes: null,
      count: 1,
      when: whenYears(x.yearFrom, x.yearTo, 'national-gallery-yearFrom-yearTo'),
      licence: 'CC0-1.0',
      licenceBy: 'the National Gallery, of its IMAGES, in its own API documentation — '
               + 'none of these records carries an image, and the catalogue text itself is unstated',
      licenceConfidence: 'MEDIUM',
      http: r.status, httpFrom: 'listing',
      cors: false,
      note: [metres ? `${metres} shelf metres` : null,
             // The fonds' material groups, from the keyword lists on 101, 5690185 and 6092302, which
             // include `diaries / päiväkirjat / dagböcker`.
             // See lessons/page-resources.md#resources-161
             kws.length ? `what is in it, in the catalogue's own words: ${kws.join(', ')}` : null,
             (x.children || []).length
               ? `${x.children.length} child records (${(x.children || []).join(', ')}) — NOT ONE of them `
                 + 'is in the open dump, and the per-object endpoint answers 403 for every id including '
                 + 'this one, so the series and item list is behind the API key'
               : null,
             x.acquisitionYear ? `acquired ${x.acquisitionYear}` : null].filter(Boolean).join(' · ') || null,
    };
  });
  // The hierarchy disagrees with itself (6092302 names 5690185 as parent, not vice versa).
  // Counts only the two fonds' dangling children; artworks' children are excluded.
  // See lessons/page-resources.md#resources-162
  const fondsIds = new Set([101, 5690185, 6092302]);
  const dangling = hits.filter((x) => fondsIds.has(x.objectId))
    .flatMap((x) => (x.children || []))
    .filter((c) => !all.some((y) => y.objectId === c));
  const probe = await ask('https://kokoelma.kansallisgalleria.fi/api/v1/objects/101',
    { cache: true, key: 'fng-one-object' });
  out.push({
    id: 'fng:unpublished-series',
    title: `${dangling.length} series and item records inside the two fonds that the open API does not publish`,
    kind: 'collection',
    source: 'National Gallery',
    holder: 'Kansallisgalleria / Arkistokokoelmat — the Central Art Archives',
    sourceId: 'THAA106 + KG-ARK-THAA106 children',
    url: 'https://kokoelma.kansallisgalleria.fi/en/object/101',
    file: null, fileType: null, bytes: null,
    count: dangling.length,
    when: whenYears(1894, 2005, 'the-two-fonds-own-yearFrom-yearTo-taken-together'),
    licence: 'unknown',
    licenceBy: 'nobody — these records cannot be read, so nothing states a licence for them',
    licenceConfidence: 'HIGH',
    http: probe.status, httpFrom: 'probe',
    cors: false,
    note: `the ids are ${dangling.join(', ')}. The bulk dump holds 3 THAA106 records and no more; `
        + `GET /api/v1/objects/101 — a record that IS in the dump — answers ${probe.status}, so there `
        + 'is no per-object endpoint to walk the tree with, and the HTML page for a child id renders '
        + 'the site shell with no og:title. The one series that IS published is KG-ARK-THAA106-S-11, '
        + 'the AV materials, which means at least ten more series exist and are not here',
  });
  source({
    name: 'National Gallery', host: 'kokoelma.kansallisgalleria.fi', asked,
    http: r.status, cors: false,
    licence: 'CC0-1.0 stated of the images; the catalogue text is not stated',
    what: 'the Central Art Archives: both Kurenniemi fonds — which SAY they hold diaries — '
        + 'the 1960s films, Dimi-S and Dimi-O',
    note: `${all.length} records in the whole dump — ${r.wireBytes ?? '?'} bytes on the wire gzipped, `
        + `${Buffer.byteLength(text)} expanded; no access-control-allow-origin, so a browser cannot `
        + 'read this — it is folded in here instead. '
        + `${hits.length} records name him. Inventory numbers containing THAA106 — the Kurenniemi `
        + `fonds — number ${all.filter((x) => /THAA106/i.test(x.inventoryNumber || '')).length}: the two `
        + `fonds roots and one series. ${dangling.length} child ids are referenced and not published, and `
        + `GET /api/v1/objects/{id} answers ${probe.status} even for an id the dump contains`,
  });
  return out;
}

// 3. Wikimedia Commons: members of Category:Erkki Kurenniemi, not a free-text search (which
// returns six unrelated files of eleven).
// See lessons/page-resources.md#resources-163
async function commons() {
  const API = 'https://commons.wikimedia.org/w/api.php';
  const asked = `${API}?action=query&list=categorymembers&cmtitle=Category:Erkki Kurenniemi&origin=*`;
  const r = await ask(`${API}?action=query&list=categorymembers&cmtitle=Category%3AErkki%20Kurenniemi`
    + '&cmtype=file&cmlimit=200&format=json&origin=*', { cache: true, key: 'commons-cat' });
  const titles = (json(r)?.query?.categorymembers || []).map((m) => m.title);
  let out = [];
  if (titles.length) {
    const r2 = await ask(`${API}?action=query&titles=${encodeURIComponent(titles.join('|'))}`
      + '&prop=imageinfo&iiprop=url|size|mime|extmetadata&format=json&origin=*',
      { cache: true, key: 'commons-info' });
    const pages = json(r2)?.query?.pages || {};
    out = Object.values(pages).map((p) => {
      const ii = (p.imageinfo || [])[0] || {};
      const em = ii.extmetadata || {};
      const txt = (v) => (v?.value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return {
        id: `commons:${p.title.replace(/^File:/, '')}`,
        title: p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '').replace(/-/g, ' '),
        kind: 'image',
        source: 'Wikimedia Commons',
        holder: txt(em.Credit) || txt(em.Artist) || 'uploaded to Commons',
        sourceId: p.title,
        url: ii.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
        file: ii.url || null,
        fileType: ii.mime || null,
        bytes: ii.size ?? null,
        count: 1,
        when: whenQS(em.DateTimeOriginal?.value, 'commons-quickstatements-precision'),
        licence: txt(em.LicenseShortName) || 'not stated',
        licenceBy: `the uploader, on the file page · photographer ${txt(em.Artist) || 'unknown'}`,
        licenceConfidence: 'MEDIUM',
        http: r2.status, httpFrom: 'listing',
        cors: corsOf(r2),
        // The one media host measured here that lets a browser read a byte
        // range AND see the Content-Range header it came back with.
        note: 'upload.wikimedia.org serves Range requests with '
            + 'access-control-expose-headers: Content-Range, which archive.org does not',
      };
    });
  }
  source({
    name: 'Wikimedia Commons', host: 'commons.wikimedia.org', asked,
    http: r.status, cors: corsOf(r),
    media: await mediaCheck(out.find((x) => x.file)?.file),
    licence: 'Public domain on all five',
    what: 'the only photographs of the man himself that are free to use',
    note: `${titles.length} files in Commons' own Category:Erkki Kurenniemi. `
        + 'The `origin=*` parameter is required — without it there is no ACAO header at all',
  });
  return out;
}

// ── 4. MusicBrainz ──────────────────────────────────────────────────────────
async function musicbrainz() {
  const ARTIST = '996815b7-12e3-49f8-bccf-6fb70c3e9e2f';
  const asked = `https://musicbrainz.org/ws/2/release?artist=${ARTIST}&fmt=json`;
  const r = await ask(`${asked}&limit=100&inc=labels`, { cache: true, key: 'mb-releases', tries: 4 });
  const j = json(r);
  const out = [];
  for (const rel of j?.releases || []) {
    const label = (rel['label-info'] || [])
      .map((l) => [l.label?.name, l['catalog-number']].filter(Boolean).join(' ')).join(', ');
    out.push({
      id: `mb:release/${rel.id}`,
      title: rel.title,
      kind: 'release',
      source: 'MusicBrainz',
      holder: label || 'no label recorded',
      sourceId: rel.id,
      url: `https://musicbrainz.org/release/${rel.id}`,
      file: null, fileType: null, bytes: null,
      count: 1,
      when: whenFrom(rel.date, 'musicbrainz-release-date'),
      licence: 'CC0-1.0',
      licenceBy: 'MusicBrainz, of the DATA — the recordings themselves are not licensed here',
      licenceConfidence: 'HIGH',
      http: r.status, httpFrom: 'listing',
      cors: corsOf(r),
      note: null,
    });
  }
  // The tracklist of the compilation, because it is the only list anywhere of
  // what the tapes ARE. Four of its eleven titles are on no file we can reach,
  // which is a fact the corpus can only state if the titles are in it.
  const LOVE = '358bd25a-3b0e-4455-b5a3-67d97d2a6be4';
  const r2 = await ask(`https://musicbrainz.org/ws/2/release/${LOVE}?fmt=json&inc=recordings`,
    { cache: true, key: 'mb-love', tries: 4 });
  const media = json(r2)?.media || [];
  for (const m of media) {
    for (const t of m.tracks || []) {
      out.push({
        id: `mb:recording/${t.recording.id}`,
        title: t.title,
        kind: 'recording',
        source: 'MusicBrainz',
        holder: 'Love Records LXCD 637, track ' + t.position,
        sourceId: t.recording.id,
        url: `https://musicbrainz.org/recording/${t.recording.id}`,
        file: null, fileType: null, bytes: null,
        count: 1,
        // Not the release date: MusicBrainz gives 2002 (the CD) for all eleven tapes.
        // See lessons/page-resources.md#resources-164
        when: none('musicbrainz-has-no-recording-date',
          'the catalogue dates the 2002 CD, not the tapes on it'),
        licence: 'CC0-1.0',
        licenceBy: 'MusicBrainz, of the DATA',
        licenceConfidence: 'HIGH',
        http: r2.status, httpFrom: 'listing',
        cors: corsOf(r2),
        note: `${Math.round((t.length || 0) / 1000)} s as catalogued`,
      });
    }
  }
  // The work is the composition, stable across the tapes, the 2002 CD and the 2013 reissue.
  // See lessons/page-resources.md#resources-165
  const r3 = await ask(`https://musicbrainz.org/ws/2/work?artist=${ARTIST}&fmt=json&limit=100`,
    { cache: true, key: 'mb-works', tries: 4 });
  const j3 = json(r3);
  for (const w of j3?.works || []) {
    out.push({
      id: `mb:work/${w.id}`,
      title: w.title,
      kind: 'work',
      source: 'MusicBrainz',
      holder: 'no holder — a work is a composition, not an object',
      sourceId: w.id,
      url: `https://musicbrainz.org/work/${w.id}`,
      file: null, fileType: null, bytes: null,
      count: 1,
      when: none('musicbrainz-works-carry-no-date',
        'the work entity has no date field at all; only its recordings and releases do'),
      licence: 'CC0-1.0',
      licenceBy: 'MusicBrainz, of the DATA',
      licenceConfidence: 'HIGH',
      http: r3.status, httpFrom: 'listing',
      cors: corsOf(r3),
      note: 'the composition, as distinct from any one recording of it',
    });
  }
  // The 60 recordings are counted, not enumerated: 27 are parts of one 2013 live set and most
  // of the rest duplicate the eleven tapes above.
  // See lessons/page-resources.md#resources-166
  const r4 = await ask(`https://musicbrainz.org/ws/2/recording?artist=${ARTIST}&fmt=json&limit=1`,
    { cache: true, key: 'mb-recording-count', tries: 4 });
  const recCount = json(r4)?.['recording-count'] ?? null;
  source({
    name: 'MusicBrainz', host: 'musicbrainz.org', asked,
    http: r.status, cors: corsOf(r),
    licence: 'CC0-1.0 on the data',
    what: 'the canonical tracklist of the 2002 Love Records compilation, four other releases '
        + 'and the three works behind them',
    note: 'a real user agent is required — a generic one is answered 503. '
        + `${recCount} recordings are catalogued and are deliberately NOT one row each: 27 of them `
        + 'are one 2013 live set split into numbered parts, and most of the rest are duplicate '
        + 'catalogue entries for the eleven tapes already listed from the compilation',
  });
  return out;
}

// 5. Wikidata: everything attributed to him by seven properties (P710 included); rows the
// deck has are dropped by id later. Left out: `different from` and family members.
// See lessons/page-resources.md#resources-167
async function wikidata() {
  const q = `SELECT ?item ?itemLabel ?typeLabel ?when WHERE {
  VALUES ?p { wdt:P170 wdt:P57 wdt:P86 wdt:P175 wdt:P50 wdt:P287 wdt:P710 }
  ?item ?p wd:Q3056683 .
  OPTIONAL { ?item wdt:P577 ?when }
  OPTIONAL { ?item wdt:P571 ?when }
  OPTIONAL { ?item wdt:P580 ?when }
  OPTIONAL { ?item wdt:P31 ?type }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fi" }
} LIMIT 200`;
  const asked = 'https://query.wikidata.org/sparql';
  // The cache key carries the query's version, because the URL does not change with the SPARQL.
  // See lessons/page-resources.md#resources-168
  const r = await ask(`${asked}?query=${encodeURIComponent(q)}`,
    { cache: true, key: 'wd-sparql-p710-p580', headers: { accept: 'application/sparql-results+json' } });
  const rows = json(r)?.results?.bindings || [];
  const seen = new Map();
  for (const b of rows) {
    const qid = b.item.value.split('/').pop();
    if (!seen.has(qid)) seen.set(qid, b);
  }
  const out = [...seen.entries()].map(([qid, b]) => ({
    id: `wd:${qid}`,
    title: b.itemLabel?.value || qid,
    // An exhibition is not a work and calling it one is the kind of small lie
    // that makes a `kind` column worth ignoring. The type comes from the item's
    // own P31 rather than from reading the title.
    kind: /album/.test(b.typeLabel?.value || '') ? 'release'
      : /documenta|exhibition/i.test(b.typeLabel?.value || '') ? 'event' : 'work',
    source: 'Wikidata',
    holder: 'community knowledge base',
    sourceId: qid,
    url: `https://www.wikidata.org/wiki/${qid}`,
    file: null, fileType: null, bytes: null,
    count: 1,
    when: b.when ? whenFrom(b.when.value, 'wikidata-P577-P571-or-P580')
                 : none('wikidata-has-no-date',
                        'no publication, inception or start date on the item'),
    licence: 'CC0-1.0',
    licenceBy: 'Wikidata, of the DATA, by project policy',
    licenceConfidence: 'HIGH',
    http: r.status, httpFrom: 'listing',
    cors: corsOf(r),
    note: b.typeLabel?.value || null,
  }));
  // His outbound statements (about forty external ids) go in the ledger, not rows. P1953 gives
  // the Discogs id and P2977 the Elonet record behind the Finna 403.
  // See lessons/page-resources.md#resources-169
  const q2 = `SELECT ?p ?pLabel ?v WHERE { wd:Q3056683 ?pr ?v . ?p wikibase:directClaim ?pr .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } } LIMIT 300`;
  const r2 = await ask(`${asked}?query=${encodeURIComponent(q2)}`,
    { cache: true, key: 'wd-outbound', headers: { accept: 'application/sparql-results+json' } });
  const stmts = json(r2)?.results?.bindings || [];
  // An identifier is a literal, not a link to another Wikidata item — which is
  // how the catalogue numbers are told from the biography (occupation, spouse,
  // place of birth) without a list of property names to keep up to date.
  const idStmts = stmts.filter((b) => b.v.type === 'literal' && /ID|identifier/i.test(b.pLabel?.value || ''));
  const HOLDERS = /Elonet|documenta|Kansallisbiografia|National Gallery|Discogs|IMDb|VIAF|ISNI|GND|Library of Congress|WorldCat|Union List/i;
  const holders = idStmts.filter((b) => HOLDERS.test(b.pLabel.value))
    .map((b) => `${b.pLabel.value} ${b.v.value}`);
  source({
    name: 'Wikidata', host: 'query.wikidata.org', asked,
    http: r.status, cors: corsOf(r),
    licence: 'CC0-1.0 on the data',
    what: 'works attributed to him by creator, director, composer, performer, author or architect — '
        + 'and the catalogue numbers that say where to look next',
    note: `${seen.size} distinct items over ${rows.length} statement rows. The item itself carries `
        + `${stmts.length} statements, ${idStmts.length} of them external catalogue identifiers. `
        + `The ones that name an institution holding material: ${holders.join(' · ')}. `
        + 'These are deliberately NOT rows — a row is a thing somebody holds, and an identifier is '
        + 'a direction to look in',
  });
  return out;
}

// 6. archive.org: keep items whose identifier or title contains the name (five of fifteen).
// See lessons/page-resources.md#resources-170
async function archiveOrg() {
  const asked = 'https://archive.org/advancedsearch.php?q=Kurenniemi&rows=100&output=json';
  const r = await ask(asked + '&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=mediatype'
    + '&fl%5B%5D=licenseurl&fl%5B%5D=uploader&fl%5B%5D=date', { cache: true, key: 'ia-search' });
  const docs = json(r)?.response?.docs || [];
  const mine = docs.filter((d) => /kurenniemi/i.test(`${d.identifier} ${d.title}`));
  // Four narrow field queries beside the free-text one, each count into the ledger.
  // See lessons/page-resources.md#resources-171
  const FIELDS = ['"Erkki Kurenniemi"', 'subject:Kurenniemi', 'creator:Kurenniemi',
                  'title:Kurenniemi', 'description:Kurenniemi'];
  const sweep = [];
  for (const q of FIELDS) {
    const a = await ask('https://archive.org/advancedsearch.php?rows=0&output=json&q='
      + encodeURIComponent(q), { cache: true, key: `ia-sweep-${q}` });
    sweep.push(`${q} → ${json(a)?.response?.numFound ?? '?'}`);
  }
  const MEDIA = /\.(mp3|mp4|m4a|ogg|oga|webm|wav|flac|avi|mkv|mpg|mpeg)$/i;
  const out = [];
  for (const d of mine) {
    const m = await ask(`https://archive.org/metadata/${d.identifier}`,
      { cache: true, key: `ia-${d.identifier}` });
    const meta = json(m) || {};
    for (const f of meta.files || []) {
      if (f.source !== 'original' || !MEDIA.test(f.name)) continue;
      const kind = /\.(mp3|m4a|ogg|oga|wav|flac)$/i.test(f.name) ? 'audio' : 'video';
      out.push({
        id: `ia:${d.identifier}/${f.name}`,
        title: f.name.replace(/\.[a-z0-9]+$/i, ''),
        kind,
        source: 'archive.org',
        holder: `uploaded by ${meta.metadata?.uploader || 'an unnamed member of the public'}, `
              + 'not deposited by an institution',
        sourceId: `${d.identifier}/${f.name}`,
        url: `https://archive.org/details/${d.identifier}`,
        file: `https://archive.org/download/${d.identifier}/${encodeURIComponent(f.name)}`,
        fileType: kind === 'audio' ? 'audio/mpeg' : 'video/mp4',
        bytes: f.size ? +f.size : null,
        count: 1,
        // The item's own `date` field is when the FILE was made or ripped, and
        // the uploader typed it. It is not evidence about the work, so it is
        // recorded as what it is and the precision says `none`.
        when: none('archive-org-has-no-work-date',
          `the item's date field says ${d.date || 'nothing'}, which describes the upload`),
        licence: d.licenseurl || 'not stated',
        licenceBy: 'the uploader, self-asserted and unverified — the same person marked a '
                 + '1968 Love Records release public domain, which it is not',
        licenceConfidence: 'LOW',
        http: m.status, httpFrom: 'url',
        cors: corsOf(m),
        note: f.length ? `${Math.round(+f.length)} s` : null,
      });
    }
  }
  source({
    name: 'archive.org', host: 'archive.org', asked,
    http: r.status, cors: corsOf(r),
    media: await mediaCheck(out.find((x) => x.kind === 'audio')?.file),
    licence: 'public-domain mark, asserted by the uploader and wrong on at least one item',
    what: 'the only Kurenniemi audio anywhere that a browser can actually play',
    note: `${docs.length} items matched the word, ${mine.length} of them are his. Re-asked five `
        + `narrower ways in case the free-text query was hiding something: ${sweep.join(' · ')} — `
        + 'every one of them is a subset of the same five items, so this source is exhausted',
  });
  return out;
}

// 7. Europeana: quote the name. Asked six ways (counts in the ledger); it holds one
// Kurenniemi object, the DIMI-A in Stockholm.
// See lessons/page-resources.md#resources-172
async function europeana() {
  const asked = 'https://api.europeana.eu/record/v2/search.json?wskey=api2demo&query=%22Erkki+Kurenniemi%22';
  const r = await ask(asked + '&rows=50', { cache: true, key: 'europeana' });
  // Each alternative form is asked FOR REAL rather than quoted from a notebook,
  // so a day when Europeana starts carrying more shows up as a changed number.
  const ALT = ['Kurenniemi', 'DIMI Kurenniemi', 'who:"Kurenniemi"',
               'proxy_dc_creator:Kurenniemi', 'Sähkökvartetti'];
  const sweep = [];
  for (const q of ALT) {
    const a = await ask('https://api.europeana.eu/record/v2/search.json?wskey=api2demo&rows=1&query='
      + encodeURIComponent(q), { cache: true, key: `europeana-alt-${q}` });
    sweep.push(`${q} → ${json(a)?.totalResults ?? '?'}`);
  }
  const j = json(r);
  const out = (j?.items || []).map((i) => ({
    id: `eu:${i.id.replace(/^\//, '')}`,
    title: [].concat(i.title || []).join(' — ') || i.id,
    kind: 'instrument',
    source: 'Europeana',
    holder: [].concat(i.dataProvider || []).join(', '),
    sourceId: i.id,
    url: i.guid || `https://www.europeana.eu/item${i.id}`,
    file: null, fileType: null, bytes: null,
    count: 1,
    when: whenFrom(([].concat(i.year || []))[0], 'europeana-year-literal'),
    licence: [].concat(i.rights || [])[0] || 'not stated',
    licenceBy: 'the holding institution, through Europeana',
    licenceConfidence: 'HIGH',
    http: r.status, httpFrom: 'listing',
    cors: corsOf(r),
    note: 'the instrument itself, not a recording of it',
  }));
  source({
    name: 'Europeana', host: 'api.europeana.eu', asked,
    http: r.status, cors: corsOf(r),
    licence: 'CC-BY-NC-SA-4.0 on the one record',
    what: 'the surviving DIMI-A, held by the Swedish Museum of Performing Arts',
    note: `${j?.totalResults ?? '?'} records for the quoted name. Asked five more ways to check that `
        + `one is not an under-query: ${sweep.join(' · ')} — the eight are a guitarist called Mikko `
        + 'Kurenniemi and six photographs of a Helsinki building. This aggregator holds one '
        + 'Kurenniemi object and that is the finding',
  });
  return out;
}

// 8. National Library press index: `queryTargetsOcrText` is required, else every binding
// (2,621,824) comes back. `includeUnauthorizedResults: false` returns zero readable rows.
// See lessons/page-resources.md#resources-173
async function digi() {
  const asked = 'https://digi.kansalliskirjasto.fi/rest/binding-search/search/binding';
  const body = (a, b, auth) => JSON.stringify({
    query: 'Kurenniemi', requireAllKeywords: true,
    queryTargetsOcrText: true, queryTargetsMetadata: false,
    formats: ['NEWSPAPER', 'JOURNAL'],
    startDate: a, endDate: b,
    includeUnauthorizedResults: auth,
  });
  // One row per window, each with total and readable counts: it is a surname search over OCR,
  // and readable hits from before his birth show it. Windows start at 1900; the whole-range
  // figure goes in the ledger.
  // See lessons/page-resources.md#resources-174
  const WINDOWS = [
    ['1900-01-01', '1940-12-31', 'before he was born'],
    ['1941-01-01', '1959-12-31', 'his childhood — the name is mostly his parents\''],
    ['1960-01-01', '1979-12-31', 'the instruments and the films'],
    ['1980-01-01', '1999-12-31', 'Dimensio, Datart and the computer years'],
    ['2000-01-01', '2026-12-31', 'the archive, the documentary and the obituaries'],
  ];
  // A JSON POST needs a preflight, which answers 403, so a page cannot reach this endpoint.
  // See lessons/page-resources.md#resources-175
  const pre = await ask(`${asked}`, { cache: true, key: 'digi-preflight', method: 'OPTIONS',
    headers: { 'access-control-request-method': 'POST',
               'access-control-request-headers': 'content-type' } });
  const out = [];
  let first = null, sumAll = 0, sumRead = 0;
  for (const [a, b, what] of WINDOWS) {
    const r = await ask(`${asked}?offset=0&count=20`, { cache: true, key: `digi-open-${a}`,
      method: 'POST', headers: { 'content-type': 'application/json' }, body: body(a, b, true) });
    const r2 = await ask(`${asked}?offset=0&count=1`, { cache: true, key: `digi-authed-${a}`,
      method: 'POST', headers: { 'content-type': 'application/json' }, body: body(a, b, false) });
    first ??= r;
    const j = json(r), j2 = json(r2);
    const total = j?.totalResults ?? null;
    const readable = j2?.totalResults ?? null;
    if (total == null) continue;
    sumAll += total; sumRead += readable || 0;
    const y0 = +a.slice(0, 4), y1 = +b.slice(0, 4);
    const rows = j.rows || [];
    const years = rows.map((x) => +String(x.date).slice(0, 4)).filter(Boolean);
    out.push({
      id: `digi:kurenniemi-${y0}-${y1}`,
      title: `${total} press mentions of the name, ${y0}–${y1} — ${readable} of them readable`,
      kind: 'collection',
      source: 'National Library',
      holder: 'National Library of Finland',
      sourceId: `binding-search/Kurenniemi/${y0}-${y1}`,
      url: `https://digi.kansalliskirjasto.fi/search?query=Kurenniemi&startDate=${a}`
         + `&endDate=${b}&formats=NEWSPAPER&formats=JOURNAL`,
      file: null, fileType: null, bytes: null,
      count: total,
      when: whenYears(y0, y1, 'the-window-this-search-asked-for'),
      licence: readable ? 'legal deposit — this window is partly readable' : 'not reproducible',
      licenceBy: 'Finnish legal deposit law, enforced by the server',
      licenceConfidence: 'HIGH',
      http: r.status, httpFrom: 'url',
      cors: corsOf(r),
      note: `${what} · the same search allowing only readable results returns ${readable}`
          + (readable === 0 ? ', so every one of these is a citation with no page behind it' : '')
          + '. Each row carries its own declared accuracy, p for day and k for month'
          + (years.length ? ` · the first 20 span ${Math.min(...years)}–${Math.max(...years)}` : ''),
    });
  }
  // The index's whole range, asked once, for the ledger. It is not a row: a
  // bracket of 1771–2026 describes the National Library's holdings and not
  // anything of his.
  const whole = await ask(`${asked}?offset=0&count=1`, { cache: true, key: 'digi-whole-range',
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: body('1771-01-01', '2026-12-31', true) });
  source({
    name: 'National Library', host: 'digi.kansalliskirjasto.fi', asked,
    http: first?.status ?? null, cors: corsOf(first || {}) && corsOf(pre),
    preflight: `OPTIONS answers ${pre.status}${pre.cors ? '' : ' with no access-control-allow-origin'}`,
    licence: 'legal deposit — the citations are open, most page images are not',
    what: 'every mention of the surname in Finnish newspapers and journals, asked in five windows',
    note: `${sumAll} citations across the five windows 1900–2026, of which ${sumRead} can be read `
        + 'outside a legal-deposit terminal — and all but 18 of those readable ones are dated BEFORE '
        + 'HIS BIRTH in 1941, which is how you can tell this is a surname in OCR text rather than a '
        + 'person: his mother Marjatta was a well-known children\'s author and his father Tauno a '
        + `physicist. Nothing from 1960 onward is readable at all. Asked across the index's own full `
        + `range, 1771 to today, the same search answers ${json(whole)?.totalResults ?? '?'} — that `
        + 'wider figure is here rather than in a row, because a bracket of 1771–2026 would describe '
        + 'the National Library rather than him',
  });
  return out;
}

// 9. Constant / KURATOR mirror: one row, `count` read off the page's `N total` line.
// See lessons/page-resources.md#resources-176
async function vandal() {
  const asked = 'https://vandal.ist/kurenniemi/sampledata/index.html';
  const r = await ask(asked, { cache: true, key: 'vandal' });
  const m = /(\d+)\s+total, starting on record/.exec(r.body || '');
  source({
    name: 'vandal.ist', host: 'vandal.ist', asked,
    http: r.status, cors: corsOf(r),
    licence: 'unstated anywhere on the site',
    what: "the Constant / dOCUMENTA(13) prototype's file index of his photo archive",
    note: m ? `${m[1]} file records, each with an EXIF timestamp; the originals are not here`
            : 'the total could not be read off the page on this run',
  });
  // The cassette count (100, 1970 to 1975) comes from the Wayback copy of the project page;
  // the mirror's dataradio page is a 404.
  // See lessons/page-resources.md#resources-177
  const DR = 'http://kurenniemi.activearchives.org/dataradio/';
  const gone = await ask('https://vandal.ist/kurenniemi/dataradio/material.html',
    { cache: true, key: 'vandal-dataradio-404' });
  const mat = await ask(`https://web.archive.org/web/2020/${DR}material.html`,
    { cache: true, key: 'aa-dataradio-material' });
  const prog = await ask(`https://web.archive.org/web/2020/${DR}programs.html`,
    { cache: true, key: 'aa-dataradio-programs' });
  const said = (r) => (r.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const cassettes = /contains\s+(\d+)\s+digitized cassettes/.exec(said(mat))?.[1] || null;
  const extra = [];
  if (cassettes) extra.push({
    id: 'aa:audio-diaries',
    title: `${cassettes} digitised cassettes of his spoken audio diary, 1970–1975 — described, not published`,
    kind: 'audio',
    source: 'vandal.ist',
    holder: 'the Central Art Archives hold the tapes; Constant digitised and described them for '
          + 'dOCUMENTA (13). Nobody publishes them',
    sourceId: 'dataradio/material',
    url: `https://web.archive.org/web/2020/${DR}material.html`,
    file: null, fileType: null, bytes: null,
    count: +cassettes,
    when: whenYears(1970, 1975, 'the-span-the-dataradio-page-states-for-the-cassettes'),
    licence: 'not stated',
    licenceBy: 'nobody — neither Constant nor the archive states terms for the tapes',
    licenceConfidence: 'LOW',
    http: mat.status, httpFrom: 'url',
    cors: corsOf(mat),
    note: 'in the project\'s own words: long monologues in the car, conversations with friends, '
        + 'field recordings, lectures, "from the airplane to the bedroom". '
        + `The mirror does not carry this page — vandal.ist answers ${gone.status} for it — so the `
        + 'only copy is the Internet Archive\'s, which sends no access-control-allow-origin',
  });
  if (/Newton/i.test(said(prog))) extra.push({
    id: 'aa:newton-diary',
    title: 'His Apple Newton MessagePad diary — handwritten entries, each stamped with a date and time',
    kind: 'text',
    source: 'vandal.ist',
    holder: 'the Central Art Archives; read by Constant\'s scripts for the Data Radio. Not published',
    sourceId: 'dataradio/programs#audiogrep',
    url: `https://web.archive.org/web/2020/${DR}programs.html`,
    file: null, fileType: null, bytes: null,
    count: 1,
    // The Newton MessagePad shipped in 1993 and he kept the archive to 2005;
    // the page gives 1993 and no end, so the bracket is the device's life in
    // his hands and the note says that is where the number came from.
    when: whenYears(1993, 2005, 'the-page-dates-the-device-to-1993-and-the-fonds-ends-in-2005'),
    licence: 'not stated',
    licenceBy: 'nobody',
    licenceConfidence: 'LOW',
    http: prog.status, httpFrom: 'url',
    cors: corsOf(prog),
    note: 'a third diary in a third medium — after the paper volumes and the cassettes. Constant '
        + 'searched the entries for phrases and read them aloud with a speech synthesiser for a '
        + 'radio programme called Audiogrep; the entries themselves have never been published',
  });
  if (!m) return extra;
  return [...extra, {
    id: 'vandal:sampledata',
    title: `${m[1]} files from his photo archive, timestamped to the second — index only`,
    kind: 'collection',
    source: 'vandal.ist',
    holder: 'Constant vzw, with the Central Art Archives — an unmaintained mirror of a 2012 prototype',
    sourceId: 'kurenniemi/sampledata',
    url: asked,
    file: null, fileType: null, bytes: null,
    count: +m[1],
    when: whenYears(2001, 2009, 'the-span-of-the-timestamps-in-the-index'),
    licence: 'not stated',
    licenceBy: 'nobody — the site states no licence and no provenance',
    licenceConfidence: 'LOW',
    http: r.status, httpFrom: 'url',
    cors: corsOf(r),
    note: 'it moved here from kurenniemi.activearchives.org, and the site it mirrors '
        + '(lahteilla.fi) is already gone',
  }];
}

// 9b. lahteilla.fi through the Wayback Machine (the host is DNS-dead): items harvested from
// the 48 server-rendered `/thing-tags/` pages, de-duplicated on `thingid`. web.archive.org
// sends no ACAO, so rows are img-able, not fetchable.
// See lessons/page-resources.md#resources-178
const LAHTEILLA = 'http://www.lahteilla.fi/kurenniemi';
const LAHTEILLA_TAGS = ['1940-luku', '1950-luku', '1960-luku', '1970-luku', '1980-luku',
  '1990-luku', '2000-luku', '3d', 'datart', 'digelius-electronics-finland', 'dimensio', 'dimi-0',
  'dimi', 'dimi-h', 'dimi-o', 'dimi-s', 'elektroninen-musiikki', 'erkki-kurenniemi', 'harmoniat',
  'helsinki', 'henkilökuvat', 'järvenpää', 'kirjeenvaihto', 'kollaasit', 'kurenniemi',
  'leena-krohn', 'marjatta-kurenniemi', 'master-chaynjis', 'muisti', 'musiikki',
  'musiikkitieteen-laitos', 'päiväkirjat', 'perhe', 'taide', 'tawaststjerna',
  'teknillinen-korkeakoulu', 'teknologia', 'tekstit', 'teoriat', 'tiede', 'tietokoneet',
  'tietokonepelit', 'tietokonetaide', 'tietotekniikka', 'tietoyhteiskunta', 'tulevaisuus',
  'valokuvat', 'videot'];
// The site's seven sections; `muistiin-kirjoitettu-elämä` is the diaries.
// See lessons/page-resources.md#resources-179
const LAHTEILLA_SECTIONS = [
  ['muistiin-kirjoitettu-elämä', 'A documented life'],
  ['ihminen-teknologia-ja-tulevaisuus', 'Man, technology and the future'],
  ['musiikki', 'Music'], ['taide', 'Art'], ['kirjeenvaihtoa', 'Correspondence'],
  ['valokuvia-erkki-kurenniemen-arkistosta', 'Photographs from his archives'],
  ['henkilökuvia-erkki-kurenniemestä-0', 'Profiles of Erkki Kurenniemi'],
];
const wb = (u, ts) => 'https://web.archive.org/web/' + (ts || '2024') + '/' + u;

async function lahteilla() {
  const asked = wb(LAHTEILLA + '/fi/used-keywords');
  // The CDX index is asked once and matched by file; a rewritten src's timestamp 404s.
  // See lessons/page-resources.md#resources-180
  const cdx = await ask('http://web.archive.org/cdx/search/cdx?url=lahteilla.fi/kurenniemi/'
    + 'sites/default/files*&output=json&collapse=urlkey&limit=5000'
    + '&fl=original,timestamp,statuscode,mimetype,length',
    { cache: true, key: 'lahteilla-cdx-files', tries: 3, maxAgeMs: 30 * 86400e3 });
  // Keyed on everything after `public/`, keeping the largest capture of each file, so a
  // missed 150 px thumbnail falls back to a larger rendering.
  // See lessons/page-resources.md#resources-181
  const caps = new Map();
  for (const row of (json(cdx) || []).slice(1)) {
    if (row[2] !== '200') continue;
    const path = row[0].replace(/^https?:\/\/[^/]+/, '');
    const file = /\/public\/(.+?)(\?|$)/.exec(path)?.[1];
    if (!file) continue;
    const bytes = +row[4] || 0;
    const prev = caps.get(file);
    if (prev && prev.bytes >= bytes) continue;
    caps.set(file, { ts: row[1], bytes: bytes || null, path });
  }
  const things = new Map();
  let pagesOk = 0, pagesBad = 0;
  for (const tag of LAHTEILLA_TAGS) {
    const r = await ask(wb(LAHTEILLA + '/fi/thing-tags/' + encodeURIComponent(tag)),
      { cache: true, key: 'lahteilla-tag-' + tag, maxAgeMs: 30 * 86400e3, tries: 3 });
    if (r.status !== 200 || !r.body) { pagesBad++; continue; }
    pagesOk++;
    for (const li of r.body.match(/<li class="views-row[\s\S]*?<\/li>/g) || []) {
      const g = (k) => new RegExp('<div class="' + k + '">([\\s\\S]*?)<\\/div>').exec(li)?.[1]
        ?.replace(/<[^>]+>/g, '').trim() || null;
      const id = g('thingid');
      if (!id) continue;
      const prev = things.get(id);
      if (prev) { prev.tags.push(tag); continue; }
      const src = /<img src="([^"]+)"/.exec(li)?.[1] || null;
      // The underlying file name, which `caps` is keyed on; the src's timestamp is not used.
      // See lessons/page-resources.md#resources-182
      const file = src
        ? /\/public\/(.+?)(\?|$)/.exec(decodeURI(src))?.[1] ?? null
        : null;
      things.set(id, { id, title: unent(g('thingtitle')), date: g('thingdate'),
                       theme: unent(g('themetitle')), timeline: g('timelineid'), file, tags: [tag] });
    }
  }
  const out = [];
  let withFile = 0, diaries = 0;
  for (const t of things.values()) {
    // The site's own tags decide the kind: tekstit, päiväkirjat, kirjeenvaihto are documents,
    // videot a video, anything else a photograph.
    // See lessons/page-resources.md#resources-183
    const kind = t.tags.some((x) => /^(tekstit|päiväkirjat|kirjeenvaihto)$/.test(x)) ? 'text'
      : t.tags.includes('videot') ? 'video' : 'image';
    const cap = t.file ? caps.get(t.file) : null;
    if (cap) withFile++;
    const isDiary = t.tags.includes('päiväkirjat');
    if (isDiary) diaries++;
    out.push({
      id: 'lahteilla:thing/' + t.id,
      title: t.title || '(untitled)',
      kind,
      source: 'lahteilla.fi',
      holder: 'Kansallisgalleria / Arkistokokoelmat — the Central Art Archives. The page that '
            + 'showed it is dead; this address is the Internet Archive copy',
      sourceId: 'thing/' + t.id,
      // The site's own address for one item is an anchor inside its timeline
      // page, so that is what the row points at — through the Wayback Machine,
      // because the host it belongs to does not resolve.
      url: wb(LAHTEILLA + '/fi/timelinepage/' + (t.timeline || '8') + '#' + t.id),
      file: cap ? wb('http://www.lahteilla.fi' + cap.path, cap.ts + 'im_') : null,
      fileType: cap ? 'image/jpeg' : null,
      bytes: cap?.bytes ?? null,
      count: 1,
      when: whenFinnishArchive(t.date, 'the-date-the-archivist-typed-on-the-record'),
      licence: 'not stated',
      licenceBy: 'nobody — the site stated no terms, and the institution that ran it took it down',
      licenceConfidence: 'LOW',
      http: 200, httpFrom: 'listing',
      // Measured with an Origin header on a Wayback JPEG and on a Wayback HTML
      // page: 200 and no access-control-allow-origin on either.
      cors: false,
      note: [isDiary ? 'A PAGE OF HIS DIARY, photographed' : null,
             'section: ' + t.theme,
             'keywords: ' + t.tags.join(', '),
             cap ? null : 'the crawler never kept this image, so only the caption survives']
        .filter(Boolean).join(' · '),
    });
  }
  // The institution's prose about each part of the fonds. Seven short pages,
  // and one of them is the only published description of the diaries anywhere.
  for (const [slug, label] of LAHTEILLA_SECTIONS) {
    const u = wb(LAHTEILLA + '/en/content/' + encodeURIComponent(slug));
    const r = await ask(u, { cache: true, key: 'lahteilla-section-' + slug,
                             maxAgeMs: 30 * 86400e3, tries: 3 });
    // The prose is `.timeline-front-content` in the `<article>`, minus the preview image and the
    // leading section label.
    // See lessons/page-resources.md#resources-184
    const art = /<div class="timeline-front-content">([\s\S]*?)<\/article>/.exec(r.body || '');
    const txt = unent((art?.[1] || '')
      .replace(/<div class="preview_image"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/, ' ')
      .replace(/<[^>]+>/g, ' '));
    // Strip the label from `.page-title`, the page's own wording, not the table's.
    // See lessons/page-resources.md#resources-185
    const pageLabel = unent(/<div class="page-title">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/
      .exec(r.body || '')?.[1] || label);
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const body = txt
      .replace(new RegExp('^(?:' + esc(pageLabel) + '|' + esc(label) + ')\\s*', 'i'), '')
      // The first item of the section menu bleeds in when the article's closing
      // tag is late. It is furniture, not prose.
      .replace(/\s*Timeline\s*$/, '').trim();
    const isDiaries = slug === 'muistiin-kirjoitettu-elämä';
    out.push({
      id: 'lahteilla:section/' + slug,
      title: isDiaries
        ? 'The diaries — "the archive contains diaries from the early 1970s to 2005", said by the '
          + 'institution that holds them, on a site that no longer exists'
        : label + ' — what the holder says this part of the archive is',
      kind: 'text',
      source: 'lahteilla.fi',
      holder: 'Kansallisgalleria / Arkistokokoelmat, writing about its own holdings',
      sourceId: 'content/' + slug,
      url: u,
      file: null, fileType: null, bytes: null,
      count: 1,
      // The span comes from the sentence ("1970-luvun alusta vuoteen 2005"); sections without one
      // get no date.
      // See lessons/page-resources.md#resources-186
      when: isDiaries
        ? whenYears(1970, 2005, 'the-span-stated-in-the-holders-own-description-of-the-diary-series')
        : none('the-section-page-states-no-span',
               'the page describes the material and gives no dates'),
      licence: 'not stated',
      licenceBy: 'nobody — the site stated no terms',
      licenceConfidence: 'LOW',
      http: r.status, httpFrom: 'url',
      cors: false,
      note: (isDiaries
        ? 'Written day after day, public and private interleaved in the order things happened, with '
          + 'receipts and leaflets glued to the pages. NOT DIGITISED — five photographed pages are '
          + 'all that was ever put online, and each of those is its own row here. In the holder\'s '
          + 'words: '
        : '') + (body ? '"' + body.slice(0, 400) + (body.length > 400 ? '…"' : '"')
        // An empty description is said in words, never as an empty quote.
        // See lessons/page-resources.md#resources-187
        : r.status === 200
          ? 'the section page carries a heading and no description — the institution never wrote '
            + 'one, which is a different thing from this run failing to read it'
          : `the page answered ${r.status} on this run`),
    });
  }
  // The publication the National Gallery made about this archive, chapter by
  // chapter. Open PDFs, every one of them, on a host that is gone.
  const pubs = await ask('http://web.archive.org/cdx/search/cdx?url=lahteilla.fi/kurenniemi/'
    + 'julkaisu*&output=json&collapse=urlkey&fl=original,timestamp,statuscode,mimetype,length',
    { cache: true, key: 'lahteilla-cdx-julkaisu', tries: 3, maxAgeMs: 30 * 86400e3 });
  let pubCount = 0, pubBytes = 0;
  for (const row of (json(pubs) || []).slice(1)) {
    if (row[2] !== '200' || !/\.pdf$/i.test(row[0])) continue;
    const name = decodeURIComponent(row[0].split('/').pop());
    const fi = /_fi\.pdf$/i.test(name);
    const who = name.replace(/_fi\.pdf$|\.pdf$/i, '').replace(/_/g, ' ');
    const whole = /A Man From The Future/i.test(who);
    pubCount++; pubBytes += +row[4] || 0;
    out.push({
      id: 'lahteilla:julkaisu/' + name,
      title: whole ? 'Erkki Kurenniemi — A Man From The Future, the whole publication'
        : who + (fi ? ', Finnish version' : '') + ' — in Erkki Kurenniemi: A Man From The Future',
      kind: 'text',
      source: 'lahteilla.fi',
      holder: 'the Finnish National Gallery published it; only the Internet Archive still serves it',
      sourceId: 'julkaisu/' + name,
      url: wb('http://www.lahteilla.fi/kurenniemi/julkaisu/' + name, row[1]),
      file: wb('http://www.lahteilla.fi/kurenniemi/julkaisu/' + name, row[1] + 'if_'),
      fileType: 'application/pdf',
      bytes: +row[4] || null,
      count: 1,
      // No date: the PDF is not opened, and the crawl timestamp dates the copy.
      // See lessons/page-resources.md#resources-188
      when: none('the-pdf-is-not-opened-here',
        'the crawl timestamp dates the copy, not the publication, and the file itself is not read'),
      licence: 'not stated',
      licenceBy: 'nobody — no licence page is visible from the index',
      licenceConfidence: 'LOW',
      http: 200, httpFrom: 'listing',
      cors: false,
      note: 'captured ' + row[1].slice(0, 4) + '-' + row[1].slice(4, 6) + '-' + row[1].slice(6, 8)
          + ' · the only copy left is the Internet Archive one, which sends no '
          + 'access-control-allow-origin',
    });
  }
  source({
    name: 'lahteilla.fi', host: 'web.archive.org', asked,
    http: pagesOk ? 200 : 'NOT REACHED', cors: false,
    // The claim that web.archive.org sends no ACAO is CHECKED against a real
    // Range request on one of these files rather than asserted in a comment —
    // the same treatment every other media host in this ledger gets.
    media: await mediaCheck(out.find((x) => x.file && x.fileType === 'image/jpeg')?.file),
    licence: 'unstated — the site declared none and the institution that ran it took it down',
    what: 'the Finnish National Gallery own Kurenniemi site: the item-level digitisation of the '
        + 'fonds, including five photographed pages of his diaries',
    note: pagesOk + ' of ' + LAHTEILLA_TAGS.length + ' keyword pages read'
        + (pagesBad ? ', ' + pagesBad + ' failed' : '') + '; ' + things.size
        + ' distinct items behind them, ' + diaries + ' of them diary pages, and the crawler kept the '
        + 'image for ' + withFile + '. ' + pubCount + ' chapter PDFs of the accompanying publication '
        + 'survive, ' + Math.round(pubBytes / 1e6) + ' MB in total. The live host answers DNS '
        + 'ENOTFOUND, so all of this is the Internet Archive copy — and web.archive.org sends NO '
        + 'access-control-allow-origin, measured on an HTML page and on a JPEG with an Origin '
        + 'header on both',
  });
  return out;
}

// 9c. Crossref: the MIT Press Kurenniemi volume's chapters, each with a DOI. The date is the
// year in the chapter title (the original document), else the book's; apparatus chapters
// (Index, Front Matter...) are dropped and named in the ledger.
// See lessons/page-resources.md#resources-189
const BOOK = 'Writing and Unwriting (Media) Art History';
const APPARATUS = /^(index|contributors|\[ ?front matter ?\]|\[ ?opening ?\]|acknowledgments|series foreword)$/i;

async function crossref() {
  const asked = 'https://api.crossref.org/works?filter=container-title:' + encodeURIComponent(BOOK);
  const r = await ask(asked + '&rows=100&mailto=kristjan.jansen@gmail.com',
    { cache: true, key: 'crossref-book', tries: 3 });
  const items = json(r)?.message?.items || [];
  const dropped = [];
  const out = [];
  for (const w of items) {
    const title = unent((w.title || [])[0] || '');
    if (!title) continue;
    if (APPARATUS.test(title)) { dropped.push(title); continue; }
    const authors = (w.author || [])
      .map((a) => [a.given, a.family].filter(Boolean).join(' ')).filter(Boolean);
    const his = authors.some((a) => /Kurenniemi/i.test(a));
    // `(1971)`, `(ca. 1986)`, `(1972–1982)`, `(1999–2000)` — the year or years
    // the editors printed after the title of one of his own texts.
    const m = /\((?:ca\.\s*)?(\d{4})(?:\s*[–-]\s*(\d{4}))?\)\s*$/.exec(title);
    const pub = (w.issued?.['date-parts'] || [[]])[0];
    const when = m
      ? { ...whenYears(+m[1], m[2] ? +m[2] : null, 'the-year-the-editors-printed-in-the-chapter-title'),
          note: /ca\./i.test(title) ? 'the editors wrote "ca.", so the year is their estimate and not a date on the document' : undefined }
      : whenFrom(pub.length ? pub.slice(0, 3).map((n, i) => String(n).padStart(i ? 2 : 4, '0')).join('-') : null,
                 'crossref-issued-date-of-the-book');
    out.push({
      id: 'doi:' + w.DOI,
      title,
      kind: 'text',
      source: 'Crossref',
      holder: his
        ? 'the manuscript is in the Central Art Archives; MIT Press printed it in 2015'
        : 'MIT Press',
      sourceId: w.DOI,
      url: 'https://doi.org/' + w.DOI,
      file: null, fileType: null, bytes: null,
      count: 1,
      when,
      licence: 'all rights reserved',
      licenceBy: 'MIT Press, on the volume',
      licenceConfidence: 'HIGH',
      http: r.status, httpFrom: 'listing',
      cors: corsOf(r),
      note: (his ? 'HIS OWN WRITING, printed as a chapter' : 'a chapter about him')
          + (authors.length ? ' · ' + authors.join('; ') : '')
          + (m ? ' · the date is the year in the chapter title, not the 2015 publication date' : ''),
    });
  }
  source({
    name: 'Crossref', host: 'api.crossref.org', asked,
    http: r.status, cors: corsOf(r),
    licence: 'CC0-1.0 on the metadata; the chapters themselves are all rights reserved',
    what: 'the chapter-by-chapter contents of the 2015 MIT Press volume — including twenty texts '
        + 'by Kurenniemi himself, one of which is a diary',
    note: (json(r)?.message?.['total-results'] ?? '?') + ' registered parts of the book, '
        + out.length + ' kept. '
        + out.filter((x) => /HIS OWN WRITING/.test(x.note)).length + ' are his own writing. '
        + 'Dropped as the apparatus of a book rather than a holding: ' + dropped.join(' · '),
  });
  return out;
}

// 9d. Discogs: the fuller discography, de-duplicated on release id with the roles in the note.
// See lessons/page-resources.md#resources-190
async function discogs() {
  const ARTIST = 60504;   // wd:Q3056683 P1953 — declared on Wikidata, not guessed
  const asked = 'https://api.discogs.com/artists/' + ARTIST + '/releases?per_page=100';
  const r = await ask(asked, { cache: true, key: 'discogs-releases', tries: 3 });
  const j = json(r);
  const by = new Map();
  for (const rel of j?.releases || []) {
    const k = String(rel.id);
    if (by.has(k)) { by.get(k).roles.push(rel.role); continue; }
    by.set(k, { rel, roles: [rel.role] });
  }
  const out = [...by.values()].map(({ rel, roles }) => ({
    id: 'discogs:' + rel.type + '/' + rel.id,
    title: unent(rel.title),
    kind: 'release',
    source: 'Discogs',
    holder: rel.label || 'no label recorded',
    sourceId: String(rel.id),
    url: 'https://www.discogs.com/' + (rel.type === 'master' ? 'master/' : 'release/') + rel.id,
    file: null, fileType: null, bytes: null,
    count: 1,
    // A Discogs year is an integer and nothing finer, and a `master` year is
    // the EARLIEST of its versions rather than any one pressing. Year
    // precision either way, which is what the field can carry.
    when: rel.year ? whenFrom(String(rel.year), 'discogs-year-integer')
                   : none('discogs-has-no-year-on-this-release', 'the release carries no year'),
    licence: 'unknown',
    licenceBy: 'nobody — Discogs describes records and states no terms for the music',
    licenceConfidence: 'HIGH',
    http: r.status, httpFrom: 'listing',
    cors: corsOf(r),
    note: [...new Set(roles)].join(', ')
        + (rel.type === 'master' ? ' · a master, so the year is the earliest version of it' : '')
        + (/Unofficial/i.test(roles.join(' ')) ? ' · Discogs marks this an unofficial release' : ''),
  }));
  source({
    name: 'Discogs', host: 'api.discogs.com', asked,
    http: r.status, cors: corsOf(r),
    licence: 'unstated for the music; the database is free to query without a key',
    what: 'the full discography — twenty-nine releases where MusicBrainz has five',
    note: (j?.pagination?.items ?? '?') + ' credits on ' + by.size + ' distinct releases, which is '
        + 'what the de-duplication is for: one record can appear as Appearance, TrackAppearance and '
        + 'UnofficialRelease at once. The artist id comes from Wikidata property P1953 rather than '
        + 'from a name search',
  });
  return out;
}

// 9e. OpenAlex: union of `title.search` and his author id, filtered below, de-duplicated by
// DOI against what is already here, with the collision count in the ledger.
// See lessons/page-resources.md#resources-191
async function openalex(have) {
  const M = '&mailto=kristjan.jansen@gmail.com';
  const asked = 'https://api.openalex.org/works?filter=title.search:Kurenniemi';
  const a = await ask(asked + '&per-page=100' + M, { cache: true, key: 'openalex-title', tries: 3 });
  const b = await ask('https://api.openalex.org/works?filter=author.id:A5079826445&per-page=100' + M,
    { cache: true, key: 'openalex-author', tries: 3 });
  const seen = new Map();
  for (const w of [...(json(a)?.results || []), ...(json(b)?.results || [])]) {
    if (!seen.has(w.id)) seen.set(w.id, w);
  }
  const out = [];
  const dropped = [], dupes = [];
  for (const w of seen.values()) {
    const title = unent(w.display_name || w.title || '');
    const authors = (w.authorships || []).map((x) => x.author?.display_name).filter(Boolean);
    // Kurenniemi is also a place, written in guillemets: strip the quoted form and require the
    // name elsewhere. Topic filters would drop real rows.
    // See lessons/page-resources.md#resources-192
    const unquoted = title.replace(/[«"“”'‘’‹›]\s*Kurenniemi\s*[»"“”'‘’‹›]/gi, ' ');
    if (!/kurenniemi/i.test(unquoted + ' ' + authors.join(' '))) {
      dropped.push(`${title} — the name is a place here, not him`);
      continue;
    }
    // A record with neither DOI nor year is an index stub and is dropped.
    // See lessons/page-resources.md#resources-193
    if (!w.doi && !w.publication_year) {
      dropped.push(`${title} — an index stub with no identifier and no date`);
      continue;
    }
    const doi = w.doi ? w.doi.replace(/^https?:\/\/doi\.org\//, '') : null;
    if (doi && have.has('doi:' + doi)) { dupes.push(doi); continue; }
    if (doi && have.has('zenodo:' + (/zenodo\.(\d+)/.exec(doi) || [])[1])) { dupes.push(doi); continue; }
    const oa = w.open_access || {};
    out.push({
      id: 'openalex:' + w.id.split('/').pop(),
      title,
      kind: 'text',
      source: 'OpenAlex',
      holder: w.primary_location?.source?.display_name || 'no publisher recorded',
      sourceId: w.id.split('/').pop(),
      url: doi ? 'https://doi.org/' + doi : w.id,
      // The open-access copy, when the index knows of one and it is a PDF. This
      // is a POINTER like every other file in here; nothing is fetched.
      file: /\.pdf($|\?)/i.test(oa.oa_url || '') ? oa.oa_url : null,
      fileType: /\.pdf($|\?)/i.test(oa.oa_url || '') ? 'application/pdf' : null,
      bytes: null,
      count: 1,
      // OpenAlex gives a full publication date on most records and a bare year
      // on the rest; `whenFrom` takes the precision from the length of what it
      // is handed, which is exactly the distinction.
      when: whenFrom(w.publication_date || (w.publication_year ? String(w.publication_year) : null),
                     'openalex-publication-date'),
      licence: oa.oa_status === 'closed' ? 'not stated' : (w.primary_location?.license || 'not stated'),
      licenceBy: 'OpenAlex, reporting what the publisher declared',
      licenceConfidence: 'MEDIUM',
      http: a.status, httpFrom: 'listing',
      cors: corsOf(a),
      note: (w.type || 'work') + ' · open access: ' + (oa.oa_status || 'unknown')
          + (authors.length ? ' · ' + authors.slice(0, 4).join('; ') : ''),
    });
  }
  source({
    name: 'OpenAlex', host: 'api.openalex.org', asked,
    http: a.status, cors: corsOf(a),
    licence: 'CC0-1.0 on the index; the works themselves are whatever their publisher says',
    what: 'the scholarly literature by and about him — including the 1966 neurophysiology paper '
        + 'he published before any of the instruments existed',
    note: seen.size + ' works across the two narrow queries (the wide `search=Kurenniemi` returns '
        + '243 and includes a paper on fungi), ' + out.length + ' kept. ' + dupes.length
        + ' were already in this file under the same DOI from Crossref or Zenodo and are not '
        + 'repeated' + (dropped.length ? '. Dropped, each with its reason: ' + dropped.join(' · ') : ''),
  });
  return out;
}

// 10. Pages asked for by name, so `http` is their own; includes the four Yle articles.
// See lessons/page-resources.md#resources-194
const BY_NAME = [
  { id: 'yle:20-89298', url: 'https://yle.fi/a/20-89298', kind: 'article', source: 'Yle',
    title: 'Erkki Kurenniemi, digitaalisten näkyjen näkijä',
    holder: 'Yle Elävä arkisto', when: () => whenFrom('2014', 'the-article-page'),
    licence: 'all rights reserved', licenceBy: 'Yle',
    note: 'the article loads from anywhere; its Areena video is geo-locked to Finland' },
  { id: 'yle:20-89300', url: 'https://yle.fi/a/20-89300', kind: 'article', source: 'Yle',
    title: "M. A. Nummisen Sähkökvartetti — includes the 40 s clip Sähkökvartetti Bulgariassa, 30.09.1968",
    holder: 'Yle Elävä arkisto', when: () => whenFrom('1968-09-30', 'the-clip-date-given-in-the-article'),
    licence: 'all rights reserved', licenceBy: 'Yle', note: 'geo-locked media' },
  { id: 'yle:20-89301', url: 'https://yle.fi/a/20-89301', kind: 'article', source: 'Yle',
    title: 'Kurenniemi in Elävä arkisto', holder: 'Yle Elävä arkisto',
    when: () => none('no-date-on-the-page', 'the article carries no date this script can read'),
    licence: 'all rights reserved', licenceBy: 'Yle', note: 'geo-locked media' },
  { id: 'yle:20-130968', url: 'https://yle.fi/a/20-130968', kind: 'article', source: 'Yle',
    title: 'Kurenniemi in Elävä arkisto', holder: 'Yle Elävä arkisto',
    when: () => none('no-date-on-the-page', 'the article carries no date this script can read'),
    licence: 'all rights reserved', licenceBy: 'Yle', note: 'geo-locked media' },
  { id: 'avarkki:tulevaisuus-ei-ole-entisensa',
    url: 'https://www.av-arkki.fi/works/tulevaisuus-ei-ole-entisensa/', kind: 'film', source: 'AV-arkki',
    title: 'Tulevaisuus ei ole entisensä / The Future Is Not What It Used to Be — Mika Taanila',
    holder: 'AV-arkki, the Distribution Centre for Finnish Media Art',
    when: () => whenFrom('2002', 'the-distribution-record'),
    licence: 'licensed per screening', licenceBy: 'AV-arkki',
    note: '52 min, 35 mm. The catalogue is HTML only — its REST API is open and permissive '
        + 'but the works post type is not exposed on it. A request form, not an endpoint' },
  { id: 'mitpress:9780262528771',
    url: 'https://mitpress.mit.edu/9780262528771/writing-and-unwriting-media-art-history/',
    kind: 'text', source: 'MIT Press',
    title: 'Writing and Unwriting (Media) Art History: Erkki Kurenniemi in 2048',
    holder: 'MIT Press', when: () => whenFrom('2015', 'the-publisher'),
    licence: 'all rights reserved', licenceBy: 'MIT Press',
    note: 'the book the dOCUMENTA(13) project produced; paywalled, no open chapter found' },
  // The row's status is the dead host's (`probe`); `url` is the Wayback copy.
  // See lessons/page-resources.md#resources-195
  { id: 'lahteilla:kurenniemi', url: 'https://web.archive.org/web/2024/http://lahteilla.fi/kurenniemi/',
    probe: 'http://lahteilla.fi/kurenniemi/',
    kind: 'collection', source: 'lahteilla.fi', title: "the National Gallery's own Kurenniemi site — dead",
    holder: 'was the Finnish National Gallery; now only the Internet Archive',
    when: () => whenYears(2013, 2026, 'the-span-of-the-wayback-captures'),
    licence: 'unknown', licenceBy: 'nobody — the site is gone',
    note: 'lahteilla.fi does not resolve at all. It was the institution\'s public presentation '
        + 'of the archive and it died inside the last seven months' },
  { id: 'finna:kurenniemi', url: 'https://finna.fi/Search/Results?lookfor=Kurenniemi',
    kind: 'collection', source: 'Finna', title: 'Finna — the front door to Elonet, Musiikkiarkisto and the rest',
    holder: 'the Finnish national discovery service',
    when: () => none('not-reached', 'nothing behind the challenge could be asked about a date'),
    licence: 'unknown', licenceBy: 'nobody — nothing could be read',
    note: 'a Cloudflare managed challenge answers this host. Everything downstream of it — '
        + 'the Music Archive\'s 60 TB, Elonet\'s film records — is unreachable from here, '
        + 'including whether it holds anything at all' },
  // Finna's keyless REST API and elonet.finna.fi answer a Cloudflare challenge (403) for any
  // user agent, so it gets its own row.
  // See lessons/page-resources.md#resources-196
  { id: 'finna-api:search', url: 'https://api.finna.fi/v1/search?lookfor=Kurenniemi&limit=100',
    kind: 'collection', source: 'Finna', title: "Finna's documented REST API — the same 403 as its web page",
    holder: 'the Finnish national discovery service',
    when: () => none('not-reached', 'nothing behind the challenge could be asked about a date'),
    licence: 'unknown', licenceBy: 'nobody — nothing could be read',
    note: 'the keyless API documented at api.finna.fi answers a Cloudflare managed challenge, '
        + 'measured three ways — this script\'s user agent, a desktop Chrome one, and none at all. '
        + 'elonet.finna.fi answers the same. There is no second door' },
  { id: 'yle-api:programs', url: 'https://external.api.yle.fi/v1/programs/items.json?q=Kurenniemi',
    kind: 'collection', source: 'Yle', title: "Yle's programme API — needs a registered key",
    holder: 'Yle', when: () => none('not-reached', 'no key'),
    licence: 'unknown', licenceBy: 'nobody — nothing could be read',
    note: 'keys are free but need a Yle Tunnus registration, and the media behind them is '
        + 'geo-locked to Finland anyway' },
];

async function byName() {
  const out = [];
  for (const b of BY_NAME) {
    const r = await ask(b.probe || b.url, { cache: true, key: `byname-${b.id}` });
    out.push({
      id: b.id, title: b.title, kind: b.kind, source: b.source, holder: b.holder,
      sourceId: b.id.split(':')[1], url: b.url,
      file: null, fileType: null, bytes: null, count: 1,
      when: b.when(),
      licence: b.licence, licenceBy: b.licenceBy, licenceConfidence: 'HIGH',
      http: r.status, httpFrom: b.probe ? 'probe' : 'url', cors: corsOf(r),
      note: b.probe ? `${b.probe} answers ${r.status} · ${b.note}` : b.note,
    });
  }
  // Ledger entries for one-row hosts come from the rows. An existing entry for the same source
  // name is extended, never duplicated (lahteilla.fi).
  // See lessons/page-resources.md#resources-197
  for (const name of ['Yle', 'AV-arkki', 'MIT Press', 'lahteilla.fi', 'Finna']) {
    const rows = out.filter((x) => x.source === name);
    if (!rows.length) continue;
    // The ledger's `asked` is the URL whose status is quoted beside it — which
    // for the dead host is the dead host, not the Wayback copy of it.
    const askedOf = (r) => BY_NAME.find((b) => b.id === r.id).probe || r.url;
    const line = rows.map((r) => `${r.http} ${askedOf(r)}`).join(' · ');
    const already = sources.find((s) => s.name === name);
    if (already) { already.note = `${already.note} · probed by name: ${line}`; continue; }
    source({
      name, host: new URL(askedOf(rows[0])).host, asked: askedOf(rows[0]),
      http: rows[0].http, cors: rows[0].cors,
      licence: rows[0].licence,
      what: { Yle: 'four Elävä arkisto articles and the programme API',
              'AV-arkki': 'the distribution record for the Taanila documentary',
              'MIT Press': 'the book about the archive',
              'lahteilla.fi': "the National Gallery's own Kurenniemi site, now only in the Wayback Machine",
              Finna: 'the national discovery service, and everything behind it' }[name],
      note: line,
    });
  }
  return out;
}

// Run order: openalex runs after crossref and zenodo and gets their DOIs; the rest is free.
// See lessons/page-resources.md#resources-198
const STEPS = [
  ['zenodo', zenodo], ['fng', fng], ['commons', commons], ['musicbrainz', musicbrainz],
  ['wikidata', wikidata], ['archive', archiveOrg], ['europeana', europeana],
  ['digi', digi], ['vandal', vandal], ['lahteilla', lahteilla], ['crossref', crossref],
  ['discogs', discogs], ['openalex', openalex], ['byname', byName],
];

const { deck, out: folded } = foldDeck();
items.push(...folded);
const fromDeck = new Set(folded.map((x) => x.id));

for (const [name, fn] of STEPS) {
  if (ONLY && !ONLY.has(name)) continue;
  log(`\n${name}`);
  // The set of ids gathered so far, for the one step that needs to know.
  const rows = await fn(new Set(items.map((x) => x.id)));
  let kept = 0, dup = 0;
  for (const r of rows) {
    if (fromDeck.has(r.id)) { dup++; continue; }
    items.push(r); kept++;
  }
  log(`  ${kept} rows${dup ? `, ${dup} already in the deck's list` : ''}`);
}

// A duplicate id fails hard: it would silently replace a row in every map downstream.
// See lessons/page-resources.md#resources-199
{
  const seen = new Set(), clash = [];
  for (const it of items) { if (seen.has(it.id)) clash.push(it.id); seen.add(it.id); }
  if (clash.length) throw new Error(`duplicate ids in the corpus: ${clash.join(', ')}`);
}

// The deck's rows carry no status of their own — they were read out of a file.
// Give each one the status this run measured for its source, so every row in
// the output can answer "was this reachable today?" with something observed.
for (const it of items) {
  if (it.httpFrom !== 'deck') continue;
  const s = sources.find((x) => x.name === it.source);
  if (s) { it.http = s.http; it.cors = s.cors; it.httpFrom = 'listing'; }
}
// The deck's Europeana row keeps the deck's own source name; make sure it has
// a ledger entry even when --only skipped that step.
for (const it of items) {
  if (!sources.some((s) => s.name === it.source)) {
    source({ name: it.source, host: new URL(it.url).host, asked: it.url,
             http: it.http, cors: it.cors, licence: it.licence,
             what: 'read out of the deck\'s list, not re-harvested on this run', note: null });
  }
}
// Licence names are resolved here in one pass; `licenceRef` keeps what the source said.
// See lessons/page-resources.md#resources-200
for (const it of items) {
  it.licenceRef = it.licence;
  it.licence = licenceName(it.licence);
  // A licence nobody stated gets no high confidence.
  // See lessons/page-resources.md#resources-201
  if (/^(unknown|not stated)$/i.test(it.licence)) it.licenceConfidence = 'n/a — nobody states one';
}
for (const s of sources) s.items = items.filter((x) => x.source === s.name).length;

// The page asserts the ledger counts sum to the list, so the builder checks it first.
// See lessons/page-resources.md#resources-202
{
  const seen = new Set(), clash = [];
  for (const s of sources) { if (seen.has(s.name)) clash.push(s.name); seen.add(s.name); }
  if (clash.length) throw new Error(`two ledger entries for one source: ${clash.join(', ')}`);
  const summed = sources.reduce((n, s) => n + s.items, 0);
  if (summed !== items.length) {
    throw new Error(`the ledger counts ${summed} rows and the list has ${items.length}`);
  }
  // Over PAGE_CAP the page's table draws fewer rows and its count check fails, so refuse here.
  // See lessons/page-resources.md#resources-203
  if (items.length > PAGE_CAP) {
    throw new Error(`${items.length} rows — the page's table caps at ${PAGE_CAP} and would draw fewer`);
  }
}

// The thesis pass: the two rows with no upstream, then the count of fourteen (see
// CORROBORATED). Under --only a partial corpus is expected.
// See lessons/page-resources.md#resources-204
{
  const missing = [];
  for (const [id, note] of Object.entries(CORROBORATED)) {
    const it = items.find((x) => x.id === id);
    if (!it) { missing.push(id); continue; }
    it.when = { ...it.when, note };
  }
  if (missing.length && !ONLY) {
    throw new Error(`nothing to corroborate: ${missing.join(', ')} is not in this corpus`);
  }
  if (missing.length) log(`  --only: ${missing.length} corroborated rows not in this partial build`);
}
// The twelve deck rows are counted by `dateEvidence.replaces` from ingest.mjs; a stale deck
// lowers the count and the build refuses.
// See lessons/page-resources.md#resources-205
const amendedIds = new Set([
  ...deck.items.filter((i) => i.dateEvidence?.replaces !== undefined).map((i) => i.id),
  ...Object.keys(CORROBORATED),
]);
const amended = items.filter((x) => amendedIds.has(x.id));
if (amended.length !== THESIS_ROWS && !ONLY) {
  const lost = [...amendedIds].filter((id) => !items.some((x) => x.id === id));
  throw new Error(`the thesis pass reached ${amended.length} rows and there are ${THESIS_ROWS} of them: `
    + (lost.length ? `not in the corpus — ${lost.join(', ')}`
                   : 'proto/deck/corpus.json is stale, run `node proto/deck/ingest.mjs --rewhen`'));
}
{
  const mute = amended.filter((x) => !x.when.note);
  if (mute.length) throw new Error(`amended with no reason given: ${mute.map((x) => x.id).join(', ')}`);
}

// Durations come from durations.json (measure-durations.mjs), merged here. A row asked with
// no answer gets `durationMs: null`.
// See lessons/page-resources.md#resources-206
const durations = (() => {
  const p = join(HERE, 'durations.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch (e) { log(`  durations.json is unreadable, so no lengths: ${e.message}`); return null; }
})();
{
  const rows = durations?.items || {};
  let put = 0, empty = 0;
  for (const it of items) {
    const d = rows[it.id];
    if (!d) continue;
    it.durationMs = d.ms ?? null;
    if (d.ms) put++; else empty++;
  }
  // A length for a row no longer in the corpus is named: the two files have drifted.
  // See lessons/page-resources.md#resources-207
  const orphans = Object.keys(rows).filter((id) => !items.some((x) => x.id === id));
  if (orphans.length && !ONLY) {
    log(`  ${orphans.length} measured length(s) for rows that are not in this corpus: `
      + orphans.slice(0, 3).join(', ') + (orphans.length > 3 ? ' …' : ''));
  }
  if (durations) log(`\ndurations: ${put} rows carry a length, ${empty} were asked and would not say`);
}

const dated = items.filter((x) => x.when.earliest != null);
const doc = {
  subject: 'Erkki Kurenniemi (1941–2017)',
  generated: new Date().toISOString(),
  generator: 'demo/resources/build-corpus.mjs',
  note: 'Every row is a POINTER to something somebody else holds: a title, a date, '
      + 'who holds it, its identifier there, one URL and a licence. Nothing is copied. '
      + 'Statuses and CORS were observed on the date above, not assumed.',
  inputs: [{ path: 'proto/deck/corpus.json', generated: deck.generated, items: deck.items.length }],
  // The rows that rest on a book, named so /resources/ goes red if one loses its bracket.
  // See lessons/page-resources.md#resources-208
  amended: {
    source: THESIS_SOURCE,
    recordedIn: 'research/corpus-from-thesis-2026-09.md',
    what: `${amended.filter((x) => /^ojanen-2020-thesis/.test(x.when.how || '')).length} records re-dated `
        + `or re-evidenced from named pages and ${amended.filter((x) => !/^ojanen-2020-thesis/.test(x.when.how || '')).length} `
        + 'corroborated without moving. One bracket got WIDER, on a better source.',
    heldIn: ['proto/deck/ingest.mjs', 'demo/resources/build-corpus.mjs'],
    rows: amended.map((x) => ({ id: x.id, edtf: x.when.edtf, how: x.when.how })),
  },
  // Where the lengths came from, beside them: /tapes/ draws recordings as wide as they are long.
  // See lessons/page-resources.md#resources-209
  durations: durations ? {
    source: durations.generator,
    how: durations.how,
    measured: durations.generated,
    what: durations.what,
    known: items.filter((x) => x.durationMs > 0).length,
    refused: items.filter((x) => 'durationMs' in x && !(x.durationMs > 0)).length,
  } : null,
  counts: {
    items: items.length,
    sources: sources.length,
    dated: dated.length,
    withFile: items.filter((x) => x.file).length,
    withDuration: items.filter((x) => x.durationMs > 0).length,
    unreachable: items.filter((x) => x.http !== 200).length,
    behind: items.reduce((n, x) => n + (x.count || 1), 0),
  },
  precisionConventions: {
    'Zenodo': 'publication_date, always a full day — it dates the DEPOSIT, not always the object.',
    'National Gallery': 'yearFrom/yearTo, whole years. Honest: across 2779 dated archive records '
      + 'none sits on 07-15 and only three on 01-01, so a day given here is a real day.',
    'Wikimedia Commons': 'a literal QuickStatements qualifier (+1971-01-00T00:00:00Z/10) — '
      + "Wikidata's integer ladder, 11 day / 10 month / 9 year, declared rather than inferred.",
    'Wikidata': 'explicit integer precision. Raw JSON zero-fills, SPARQL start-pads: same fact, '
      + 'two paddings, one declared precision.',
    'MusicBrainz': 'release dates only. The eleven tape titles all report 2002, which is the CD, '
      + 'so they are written here with NO date rather than a confident wrong one.',
    'archive.org': "no precision field, and the item's date describes the upload rather than the "
      + 'work — so it is not used as a date at all. Year evidence comes from the filename.',
    'National Library': 'a one-letter flag per row, p for day and k for month, and the k rows are '
      + 'start-padded to day 01 — indistinguishable from an attested 1st without the flag.',
    'lahteilla.fi': 'an archivist writing Finnish, in eleven forms counted rather than remembered: '
      + '1953 · 1953-04-07 · 30-06-1975 (DAY FIRST, and only the position of the four-digit number '
      + 'tells it from the ISO form) · 1976-11 · 1950-luku (the decade) · 1950-luvun puoliväli '
      + '(mid-decade) · 1960-luvun alku (early) · 1960-luku, loppupuoli (late) · 1975 jälkeen '
      + '(after 1975) · 1963-2005 (a span) · 1992-00-00 (a zero month and day, which is an EXPLICIT '
      + 'not-known and not a January the 0th). The qualified decades keep the WHOLE decade as their '
      + 'bracket and carry the qualifier in words: "mid" has no defined width, and inventing one '
      + 'would put a number in this file that the archivist never wrote.',
    'Crossref': 'the registered date is 2015-09-11 for all 36 parts, which is the day the book came '
      + 'out — so for the twenty chapters that are HIS OWN TEXTS the date used here is the year the '
      + 'editors printed in the chapter title (Audio Diary C4008-1 (1971)), which is a statement '
      + 'about the document made by people who had the manuscript. "ca." in a title is recorded as '
      + 'the editors\' estimate.',
    'Discogs': 'a year integer and nothing finer. A `master` year is the EARLIEST of its versions '
      + 'rather than any one pressing, which the row says.',
    'OpenAlex': 'publication_date, a full day where the publisher registered one and a bare year '
      + 'where it did not — the precision follows the length of the string, not a default.',
    'ERR (for contrast, not a source here)': 'year-only dates midpoint-padded to YYYY-07-15, '
      + 'indistinguishable from an attested 15 July. Must be reverse-engineered.',
  },
  sources: sources.sort((a, b) => b.items - a.items),
  items: items.sort((a, b) => (a.when.earliest ?? Infinity) - (b.when.earliest ?? Infinity)
    || a.title.localeCompare(b.title)),
};

writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
log(`\n${OUT}`);
log(`${doc.counts.items} rows · ${doc.counts.sources} sources · ${doc.counts.dated} dated · `
  + `${doc.counts.withFile} with a file · ${doc.counts.unreachable} whose source did not answer 200`);
for (const s of doc.sources) log(`  ${String(s.items).padStart(3)}  ${s.name.padEnd(20)} ${s.http}  cors=${s.cors}`);
