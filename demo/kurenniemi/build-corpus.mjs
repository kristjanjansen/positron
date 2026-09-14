// demo/kurenniemi/build-corpus.mjs — the corpus `/kurenniemi/` reads.
//
//   node demo/kurenniemi/build-corpus.mjs           # ask every source, write corpus.json
//   node demo/kurenniemi/build-corpus.mjs --offline # rebuild from the cache, ask nothing
//   node demo/kurenniemi/build-corpus.mjs --only zenodo,commons
//
// NODE ONLY. Never shipped to a browser, never imported by the page.
//
// 🔴 REFS, NOT CONTENT. Every row is a POINTER — a title, a date, who holds it,
// its identifier there, one URL, a licence and who asserts it. Nothing is
// mirrored: no audio, no images, no PDFs, no page text. Four of these sources
// send no `access-control-allow-origin` at all, so the temptation to "just keep
// a copy so the page can read it" is real and is refused here on purpose. The
// page says where a thing lives; the institution keeps it.
//
// ⚠️ EVERY STATUS IN THE OUTPUT WAS OBSERVED, NOT ASSUMED. `ask()` records the
// code and the `access-control-allow-origin` header of the request that
// actually produced each row, and a source that could not be reached is written
// into the file WITH ITS STATUS rather than dropped. A dropped source and a
// source with nothing in it look identical in a finished list, and only one of
// them is a finding. `httpFrom` says which request the code belongs to:
// `listing` (the query that returned this row among others) or `url` (this
// row's own address, asked for by name).
//
// ⚠️ AND A COUNT THAT IS TOO TIDY IS A BROKEN COLLECTOR. Three of these
// endpoints will answer 200 with a result that is silently wrong if you ask
// them slightly wrong — the National Library's search returns ALL 2.6 million
// bindings when `queryTargetsOcrText` is left out, Europeana's unquoted
// `Kurenniemi` returns a guitarist and a building, and archive.org's search
// returns a bicycle bell. Each of those is filtered here BY A STATED RULE, and
// the rule is in a comment beside it, so a future run that returns a different
// number can be told apart from a future run that asked a different question.
//
// The cache lives OUTSIDE the repo (`$TMPDIR/positron-kurenniemi-cache`, or
// `$KUR_CACHE`): the National Gallery's dump is 29 MB gzipped and 275 MB
// expanded, and a 29 MB blob in git to save a one-second download is a bad
// trade. `--offline` re-reads it and asks nothing, which is how the shape of
// the output gets iterated on without hammering anybody's archive.

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

// 🔴 AND AN `Origin` HEADER, BECAUSE WITHOUT ONE THIS IS NOT A CORS TEST.
// MEASURED 2026-09-15, the same URL, one header apart: `api.europeana.eu`
// answers with NO `access-control-allow-origin` to a bare GET and with
// `access-control-allow-origin: *` when an Origin is sent — it says
// `vary: Access-Control-Request-Method` and means it. The first run of this
// script recorded Europeana as browser-unreadable, which is the exact shape of
// measuring the quantity next to the one in question: a browser ALWAYS sends
// Origin on a cross-origin fetch, so a probe that does not is answering a
// question nobody asked. Every request below carries it, and `cache-v2` in the
// keys exists to throw away the answers gathered before it did.
const ORIGIN = 'https://positron.studio';

// ── the record of what was asked ────────────────────────────────────────────
const sources = [];
const items = [];
const log = (...a) => console.error(...a);

/**
 * One request, and a record of how it went.
 *
 * The status is a NUMBER when the host answered and a STRING when it did not
 * (`DNS ENOTFOUND`, `NETWORK ECONNRESET`). Both are written into the output as
 * they are: "the host does not exist" and "the host said 403" are different
 * facts, and flattening them to `null` loses the one that is interesting.
 */
async function ask(url, o = {}) {
  const key = `cache-v2-${o.key || url}`;
  const file = join(CACHE, encodeURIComponent(key).replace(/%/g, '_').slice(0, 180));
  const meta = file + '.meta.json';
  if (OFFLINE || o.cache) {
    if (existsSync(meta)) {
      const m = JSON.parse(readFileSync(meta, 'utf8'));
      if (OFFLINE || m.at > Date.now() - (o.maxAgeMs ?? 6 * 3600e3)) {
        // ⚠️ A FAILURE IS CACHED TOO, AND ONLY ITS META. A host that does not
        // resolve returns no body, so a cache keyed on the body having arrived
        // would forget the one thing that happened — and the offline rebuild
        // would print `NOT CACHED` where the live run had measured
        // `DNS ENOTFOUND`. Not reached and not asked are different answers.
        const body = existsSync(file) ? (o.binary ? readFileSync(file) : readFileSync(file, 'utf8')) : null;
        return { ...m, body, cached: true };
      }
    }
    if (OFFLINE) return { url, status: 'NOT ASKED — nothing cached', cors: null, body: null, cached: false };
  }
  let out;
  // ⚠️ RETRY ONLY WHAT SAYS "COME BACK LATER". MusicBrainz answers 503 with a
  // plain `{"error":"…server is currently busy…"}` under load and 200 on the
  // third try, measured 503/503/200 today — so a single attempt reports "this
  // source has nothing" about a source that has five releases in it. A 403 or a
  // 404 is an answer, not a wobble, and is never retried.
  for (let attempt = 0; attempt < (o.tries ?? 1); attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1500 * attempt));
    try {
      const res = await fetch(url, {
        method: o.method || 'GET',
        headers: { 'user-agent': UA, origin: ORIGIN, ...(o.headers || {}) },
        body: o.body,
      });
      const body = o.binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
      // ⚠️ `content-length` IS THE ONLY WAY TO SEE WHAT CROSSED THE WIRE.
      // `fetch` decompresses gzip and drops `content-encoding`, so
      // `body.length` is the EXPANDED size — which is how the first run of this
      // script recorded the National Gallery's dump as "274 MB gzipped", nine
      // times its actual 29 MB, from a number that was perfectly real and was
      // measuring the other end of the same pipe.
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
 * A licence's NAME, and separately the string the source gave.
 *
 * ⚠️ THIS IS A LOOKUP, NOT A SHORTENING, and the difference matters enough to
 * say: `https://creativecommons.org/publicdomain/mark/1.0/` IS called Public
 * Domain Mark 1.0, so writing that is faithful, while cutting
 * `CC BY-NC-SA 4.0` down to fit a column would produce the name of a DIFFERENT
 * licence with different terms. Anything unrecognised is passed through
 * untouched rather than guessed at — `not stated` and `unknown` are answers.
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
 * ⚠️ A CATALOGUE THAT ALLOWS CORS AND A FILE HOST THAT DOES NOT ARE THE SAME
 * SOURCE AND DIFFERENT ANSWERS. Zenodo's API and Zenodo's file endpoint are
 * two hosts' worth of policy; archive.org serves audio with `ACAO: *` and
 * redirects video to a node that has none. A page that can read the LIST and
 * not the FILE looks broken in a way the catalogue's headers cannot predict, so
 * one file per source gets a real Range request and the answer is written into
 * the ledger beside the catalogue's.
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

// ── dates ───────────────────────────────────────────────────────────────────
//
// ⚠️ THE DATE IS WRITTEN THE WAY THE SOURCE WROTE IT, AND THE BRACKET IS
// COMPUTED FROM IT. A bare `1966` becomes the whole of 1966, not 1 January
// 1966 — the difference between those two is the whole reason this corpus
// carries `precision` at all, and a source that pads a year to a day silently
// (ERR does; the National Library's `k` rows do, which is why its own flag is
// the only thing that saves them) is the failure this is written against.
//
// `latest` is EXCLUSIVE: the first instant the thing is already over. A year
// that runs to 1974-01-01T00:00 covers 1973, and a reader that wants the last
// year it touches subtracts a millisecond first.
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
 * Wikimedia's date field carries a literal QuickStatements qualifier —
 * `+1971-01-00T00:00:00Z/10` — where the trailing integer is Wikidata's
 * precision ladder (11 day / 10 month / 9 year). It is the same ladder
 * `proto/aikajana/ingest.mjs` already decodes, arriving through a different
 * door, and it is DECLARED rather than inferred, which is the whole point.
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

// ── 0. what is already gathered: proto/aikajana/corpus.json ─────────────────
//
// ⚠️ ONE GATHERING, NOT TWO. The 22 rows the deck plays from are not
// re-researched here — their dates carry evidence this script has no way to
// re-derive (a filename year, a compilation's span, Wikidata's declared
// precision) and a second opinion about them would be a second opinion that
// drifts. They are read in, converted to this file's shape, and their source
// file is recorded in `inputs` with ITS generation date, so a stale fold is
// visible in the output rather than invisible in it. The page checks the same
// thing from the other end: it fetches both files and asserts every id in the
// deck's list is in this one.
function foldDeck() {
  const path = 'proto/aikajana/corpus.json';
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
      },
      licence: it.prov.rights || 'not stated',
      licenceBy: it.prov.rightsAsserter || 'nobody',
      licenceConfidence: it.prov.rightsConfidence || null,
      http: null, httpFrom: 'deck',
      cors: null,
      note: null,
      via: path,
    };
  });
  return { deck, out };
}

// ── 1. Zenodo ───────────────────────────────────────────────────────────────
async function zenodo() {
  const asked = 'https://zenodo.org/api/records?q=Kurenniemi&size=25&page=1';
  let page = 1, total = null, http = null, cors = null;
  const out = [];
  // ⚠️ ZENODO SEARCHES THE FULL TEXT, SO FOUR OF THE TWENTY-EIGHT HITS ARE NOT
  // ABOUT HIM — two copies of a paper called `Memory in the digital age`, one on
  // student sport in harsh weather, and one M.Sc thesis on train weighbridges.
  // The rule is that the record's own metadata has to name him; what it costs is
  // NAMED in the ledger rather than quietly dropped, because the thesis is by
  // Risto Rautee, who co-founded Digelius with him, and a reader may well want
  // it back.
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
      // A record with exactly one file gets a direct address for it; a record
      // with several gets its own page, because picking one of thirty-seven
      // TIFFs to be "the" file would be a choice nobody made. `count` says how
      // many are behind the row either way, so nothing is hidden by the rule.
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
        // The extension, not the header: Zenodo answers `application/octet-stream`
        // for every file it holds, which is honest about how it stores them and
        // useless for deciding whether a browser can play one. `mediaCheck`
        // records what the header actually said, once, in the ledger.
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

// ── 2. Finnish National Gallery ─────────────────────────────────────────────
//
// ⚠️ A BULK DUMP, NOT A QUERY ENDPOINT. `?limit=2` is ignored and the whole
// collection comes back — 89,072 records, 29 MB gzipped, 275 MB expanded — so
// the Kurenniemi rows are filtered HERE. That is also why this one is cached:
// asking a national museum for a quarter of a gigabyte to re-render a table is
// not a thing to do twice.
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
  // The rule: a record whose JSON mentions the name anywhere. It catches the
  // fonds, the films, the instruments, the concert recordings AND the portrait
  // of him painted by somebody else — which belongs here, because the question
  // is what the institution holds about him, not what he made.
  const hits = all.filter((x) => JSON.stringify(x).includes('urenniemi'));
  const out = hits.map((x) => {
    const t = x.title || {};
    const cat = (x.category || {}).en || (x.category || {}).fi || 'record';
    const kind = { 'private archive': 'collection', series: 'collection',
                   'audio-visual material': 'video', artwork: 'work' }[cat]
      || (cat.includes('archive') ? 'collection' : 'work');
    const metres = (x.dimensions || []).find((d) => d.unit === 'm')?.measurements?.[0];
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
             (x.children || []).length ? `${x.children.length} child records, none of which are in the open dump` : null,
             x.acquisitionYear ? `acquired ${x.acquisitionYear}` : null].filter(Boolean).join(' · ') || null,
    };
  });
  source({
    name: 'National Gallery', host: 'kokoelma.kansallisgalleria.fi', asked,
    http: r.status, cors: false,
    licence: 'CC0-1.0 stated of the images; the catalogue text is not stated',
    what: 'the Central Art Archives: both Kurenniemi fonds, the 1960s films, Dimi-S and Dimi-O',
    note: `${all.length} records in the whole dump — ${r.wireBytes ?? '?'} bytes on the wire gzipped, `
        + `${Buffer.byteLength(text)} expanded; no access-control-allow-origin, so a browser cannot `
        + 'read this — it is folded in here instead',
  });
  return out;
}

// ── 3. Wikimedia Commons ────────────────────────────────────────────────────
//
// ⚠️ THE CATEGORY, NOT THE SEARCH. A free-text search for `Kurenniemi` in the
// file namespace returns eleven files, of which five are him: the others are
// his relative Marjatta, a guitarist called Mikko, a lighthouse, an 1878
// newspaper and a divisibility lattice. Filtering those out by reading the
// titles would be this script's editorial opinion; asking for the members of
// Commons' own `Category:Erkki Kurenniemi` is the institution's.
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
        // ⚠️ NOT THE RELEASE DATE. MusicBrainz reports 2002 for all eleven,
        // which is when the CD came out, not when the tape was made. Writing
        // 2002 here would be a confident wrong answer where none is a true one.
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
  source({
    name: 'MusicBrainz', host: 'musicbrainz.org', asked,
    http: r.status, cors: corsOf(r),
    licence: 'CC0-1.0 on the data',
    what: 'the canonical tracklist of the 2002 Love Records compilation, and four other releases',
    note: 'a real user agent is required — a generic one is answered 503',
  });
  return out;
}

// ── 5. Wikidata ─────────────────────────────────────────────────────────────
//
// The deck already carries six works and the two life events. This asks the
// query service for everything Wikidata attributes to him by any of six
// properties, which finds three more — `Computer Music`, `On-Off` and the
// compilation album itself. Rows the deck already has are dropped by id later.
async function wikidata() {
  const q = `SELECT ?item ?itemLabel ?typeLabel ?when WHERE {
  VALUES ?p { wdt:P170 wdt:P57 wdt:P86 wdt:P175 wdt:P50 wdt:P287 }
  ?item ?p wd:Q3056683 .
  OPTIONAL { ?item wdt:P577 ?when }
  OPTIONAL { ?item wdt:P571 ?when }
  OPTIONAL { ?item wdt:P31 ?type }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fi" }
} LIMIT 200`;
  const asked = 'https://query.wikidata.org/sparql';
  const r = await ask(`${asked}?query=${encodeURIComponent(q)}`,
    { cache: true, key: 'wd-sparql', headers: { accept: 'application/sparql-results+json' } });
  const rows = json(r)?.results?.bindings || [];
  const seen = new Map();
  for (const b of rows) {
    const qid = b.item.value.split('/').pop();
    if (!seen.has(qid)) seen.set(qid, b);
  }
  const out = [...seen.entries()].map(([qid, b]) => ({
    id: `wd:${qid}`,
    title: b.itemLabel?.value || qid,
    kind: /album/.test(b.typeLabel?.value || '') ? 'release' : 'work',
    source: 'Wikidata',
    holder: 'community knowledge base',
    sourceId: qid,
    url: `https://www.wikidata.org/wiki/${qid}`,
    file: null, fileType: null, bytes: null,
    count: 1,
    when: b.when ? whenFrom(b.when.value, 'wikidata-P577-or-P571')
                 : none('wikidata-has-no-date', 'no publication or inception date on the item'),
    licence: 'CC0-1.0',
    licenceBy: 'Wikidata, of the DATA, by project policy',
    licenceConfidence: 'HIGH',
    http: r.status, httpFrom: 'listing',
    cors: corsOf(r),
    note: b.typeLabel?.value || null,
  }));
  source({
    name: 'Wikidata', host: 'query.wikidata.org', asked,
    http: r.status, cors: corsOf(r),
    licence: 'CC0-1.0 on the data',
    what: 'works attributed to him by creator, director, composer, performer, author or architect',
    note: `${seen.size} distinct items over ${rows.length} statement rows`,
  });
  return out;
}

// ── 6. archive.org ──────────────────────────────────────────────────────────
//
// ⚠️ THE SEARCH RETURNS A BICYCLE BELL. `q=Kurenniemi` finds fifteen items and
// ten of them are other people's podcasts, because the word appears in a
// description somewhere. The rule: the identifier or the title must contain the
// name. It keeps exactly the five Kurenniemi items and no judgement of mine is
// involved in which five.
async function archiveOrg() {
  const asked = 'https://archive.org/advancedsearch.php?q=Kurenniemi&rows=100&output=json';
  const r = await ask(asked + '&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=mediatype'
    + '&fl%5B%5D=licenseurl&fl%5B%5D=uploader&fl%5B%5D=date', { cache: true, key: 'ia-search' });
  const docs = json(r)?.response?.docs || [];
  const mine = docs.filter((d) => /kurenniemi/i.test(`${d.identifier} ${d.title}`));
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
    note: `${docs.length} items matched the word, ${mine.length} of them are his`,
  });
  return out;
}

// ── 7. Europeana ────────────────────────────────────────────────────────────
//
// ⚠️ QUOTE THE NAME. Unquoted, `Kurenniemi` returns eight records and seven are
// a guitarist, a building and a photographer's surname. The phrase query
// returns one, and it is the right one: the surviving DIMI-A in Stockholm.
async function europeana() {
  const asked = 'https://api.europeana.eu/record/v2/search.json?wskey=api2demo&query=%22Erkki+Kurenniemi%22';
  const r = await ask(asked + '&rows=50', { cache: true, key: 'europeana' });
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
    note: `${j?.totalResults ?? '?'} records for the quoted name; the unquoted query returns `
        + 'eight, seven of which are other Kurenniemis',
  });
  return out;
}

// ── 8. the National Library of Finland press index ──────────────────────────
//
// 🔴 THE FIELD THAT MAKES THIS WORK IS `queryTargetsOcrText`. Without it the
// endpoint answers 200 with `totalResults: 2621824` — every binding it has —
// and a collector that believed it would have written "2.6 million Kurenniemi
// mentions" into this file. Measured both ways on 2026-09-15.
//
// The counterpart measurement is the one that matters editorially:
// `includeUnauthorizedResults: false` returns ZERO. Every row is a citation
// with no readable page behind it, and the row says so.
async function digi() {
  const asked = 'https://digi.kansalliskirjasto.fi/rest/binding-search/search/binding';
  const body = (auth) => JSON.stringify({
    query: 'Kurenniemi', requireAllKeywords: true,
    queryTargetsOcrText: true, queryTargetsMetadata: false,
    formats: ['NEWSPAPER', 'JOURNAL'],
    startDate: '1960-01-01', endDate: '1979-12-31',
    includeUnauthorizedResults: auth,
  });
  const r = await ask(`${asked}?offset=0&count=20`, { cache: true, key: 'digi-open',
    method: 'POST', headers: { 'content-type': 'application/json' }, body: body(true) });
  const r2 = await ask(`${asked}?offset=0&count=1`, { cache: true, key: 'digi-authed',
    method: 'POST', headers: { 'content-type': 'application/json' }, body: body(false) });
  const j = json(r), j2 = json(r2);
  const total = j?.totalResults ?? null;
  const readable = j2?.totalResults ?? null;
  // ⚠️ A JSON POST NEEDS A PREFLIGHT, SO THE POST'S OWN HEADERS ARE NOT THE
  // ANSWER. A browser asks OPTIONS first and never sends the POST if that is
  // refused — measured 403 here — so this endpoint is unreachable from a page
  // even though the POST itself answers 200 to a script.
  const pre = await ask(`${asked}`, { cache: true, key: 'digi-preflight', method: 'OPTIONS',
    headers: { 'access-control-request-method': 'POST',
               'access-control-request-headers': 'content-type' } });
  source({
    name: 'National Library', host: 'digi.kansalliskirjasto.fi', asked,
    http: r.status, cors: corsOf(r) && corsOf(pre),
    preflight: `OPTIONS answers ${pre.status}${pre.cors ? '' : ' with no access-control-allow-origin'}`,
    licence: 'legal deposit — the citations are open, the page images are not',
    what: 'every mention of the name in Finnish newspapers and journals, 1960–1979',
    note: `${total} citations, of which ${readable} can be read outside a legal-deposit terminal`,
  });
  if (total == null) return [];
  const rows = j.rows || [];
  const years = rows.map((x) => +String(x.date).slice(0, 4)).filter(Boolean);
  return [{
    id: 'digi:kurenniemi-1960-1979',
    title: `${total} press mentions, 1960–1979 — citations only, no readable page`,
    kind: 'collection',
    source: 'National Library',
    holder: 'National Library of Finland',
    sourceId: 'binding-search/Kurenniemi/1960-1979',
    url: 'https://digi.kansalliskirjasto.fi/search?query=Kurenniemi&startDate=1960-01-01'
       + '&endDate=1979-12-31&formats=NEWSPAPER&formats=JOURNAL',
    file: null, fileType: null, bytes: null,
    count: total,
    when: whenYears(1960, 1979, 'the-window-this-search-asked-for'),
    licence: 'not reproducible',
    licenceBy: 'Finnish legal deposit law, enforced by the server',
    licenceConfidence: 'HIGH',
    http: r.status, httpFrom: 'url',
    cors: corsOf(r),
    note: `every one is marked unauthorized: the same search allowing only readable results returns `
        + `${readable}. Each row carries its own declared accuracy, p for day and k for month`
        + (years.length ? ` · the first 20 span ${Math.min(...years)}–${Math.max(...years)}` : ''),
  }];
}

// ── 9. the Constant / KURATOR mirror ────────────────────────────────────────
//
// 3986 rows of one file each, and the pixels are not in the mirror. One row
// here, with the count read off the page rather than remembered — the page
// prints `N total, starting on record 1` and that N is what goes in `count`.
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
  if (!m) return [];
  return [{
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

// ── 10. one-by-one: pages that are their own row ────────────────────────────
//
// Each of these is asked for BY NAME, so its `http` is its own rather than a
// listing's. The four Yle articles are the reason this block exists: they are
// the only Kurenniemi broadcast material anywhere that is known to exist, they
// load, and their media cannot be fetched from outside Finland without a key —
// which is a fact worth a row each rather than a footnote.
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
  // ⚠️ THE STATUS THAT BELONGS TO THIS ROW IS THE DEAD HOST'S, NOT THE WAYBACK
  // COPY'S. `url` is where you can still read it; `probe` is the thing whose
  // answer the row is about, and writing the cache's 200 here would have said
  // the opposite of what happened.
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
  // These hosts are one row each rather than a harvest, so their ledger entries
  // are written from the rows themselves — with the code each one answered.
  for (const name of ['Yle', 'AV-arkki', 'MIT Press', 'lahteilla.fi', 'Finna']) {
    const rows = out.filter((x) => x.source === name);
    if (!rows.length) continue;
    // The ledger's `asked` is the URL whose status is quoted beside it — which
    // for the dead host is the dead host, not the Wayback copy of it.
    const askedOf = (r) => BY_NAME.find((b) => b.id === r.id).probe || r.url;
    source({
      name, host: new URL(askedOf(rows[0])).host, asked: askedOf(rows[0]),
      http: rows[0].http, cors: rows[0].cors,
      licence: rows[0].licence,
      what: { Yle: 'four Elävä arkisto articles and the programme API',
              'AV-arkki': 'the distribution record for the Taanila documentary',
              'MIT Press': 'the book about the archive',
              'lahteilla.fi': "the National Gallery's own Kurenniemi site, now only in the Wayback Machine",
              Finna: 'the national discovery service, and everything behind it' }[name],
      note: rows.map((r) => `${r.http} ${askedOf(r)}`).join(' · '),
    });
  }
  return out;
}

// ── run ─────────────────────────────────────────────────────────────────────
const STEPS = [
  ['zenodo', zenodo], ['fng', fng], ['commons', commons], ['musicbrainz', musicbrainz],
  ['wikidata', wikidata], ['archive', archiveOrg], ['europeana', europeana],
  ['digi', digi], ['vandal', vandal], ['byname', byName],
];

const { deck, out: folded } = foldDeck();
items.push(...folded);
const fromDeck = new Set(folded.map((x) => x.id));

for (const [name, fn] of STEPS) {
  if (ONLY && !ONLY.has(name)) continue;
  log(`\n${name}`);
  const rows = await fn();
  let kept = 0, dup = 0;
  for (const r of rows) {
    if (fromDeck.has(r.id)) { dup++; continue; }
    items.push(r); kept++;
  }
  log(`  ${kept} rows${dup ? `, ${dup} already in the deck's list` : ''}`);
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
// ONE PASS, ONE PLACE. Every harvester above writes the licence down exactly as
// its source stated it — a URL, a slug, a sentence — and the name is resolved
// here rather than in ten functions that would drift apart. `licenceRef` keeps
// what was actually said, so nothing is lost by naming it.
for (const it of items) {
  it.licenceRef = it.licence;
  it.licence = licenceName(it.licence);
  // ⚠️ THERE IS NO SUCH THING AS HIGH CONFIDENCE IN A LICENCE NOBODY STATED.
  // Four rows read `unknown · HIGH`, which is a confident measurement of
  // nothing — the same defect as a readout cell pre-set to 0.
  if (/^(unknown|not stated)$/i.test(it.licence)) it.licenceConfidence = 'n/a — nobody states one';
}
for (const s of sources) s.items = items.filter((x) => x.source === s.name).length;

const dated = items.filter((x) => x.when.earliest != null);
const doc = {
  subject: 'Erkki Kurenniemi (1941–2017)',
  generated: new Date().toISOString(),
  generator: 'demo/kurenniemi/build-corpus.mjs',
  note: 'Every row is a POINTER to something somebody else holds: a title, a date, '
      + 'who holds it, its identifier there, one URL and a licence. Nothing is copied. '
      + 'Statuses and CORS were observed on the date above, not assumed.',
  inputs: [{ path: 'proto/aikajana/corpus.json', generated: deck.generated, items: deck.items.length }],
  counts: {
    items: items.length,
    sources: sources.length,
    dated: dated.length,
    withFile: items.filter((x) => x.file).length,
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
