// demo/resources/build-corpus.mjs — the corpus `/resources/` reads.
//
//   node demo/resources/build-corpus.mjs           # ask every source, write corpus.json
//   node demo/resources/build-corpus.mjs --offline # rebuild from the cache, ask nothing
//   node demo/resources/build-corpus.mjs --only zenodo,commons
//
// Steps, for `--only`: zenodo · fng · commons · musicbrainz · wikidata ·
// archive · europeana · digi · vandal · lahteilla · crossref · discogs ·
// openalex · byname.
//
// NODE ONLY. Never shipped to a browser, never imported by the page.
//
// 🔴 REFS, NOT CONTENT. Every row is a POINTER — a title, a date, who holds it,
// its identifier there, one URL, a licence and who asserts it. Nothing is
// mirrored: no audio, no images, no PDFs, no page text. Six of these sources
// send no `access-control-allow-origin` at all — including the Internet
// Archive, which is where a third of this corpus now lives, so the temptation
// to "just keep a copy so the page can read it" is real and is refused here on
// purpose. The page says where a thing lives; the institution keeps it.
//
// 🔴 AND WHERE THE DIARIES ARE IS THE QUESTION THIS FILE WAS ASKED SECOND.
// The first pass had 122 rows and not one of them was a diary, notebook,
// päiväkirja or dagbok, which is a hole in the middle of the subject: the
// whole "In 2048" project is built on them. They exist and they are these,
// in descending order of how much of them you can actually see:
//   · FIVE PAGES, PHOTOGRAPHED — 1975-01-09, 1975-06-30 twice (the original and
//     the version he typed up), and two from 1986. On `lahteilla.fi`, which is
//     DNS-dead; four thumbnails and one 2.6 MB readable page survive in the
//     Internet Archive.
//   · `Audio Diary C4008-1 (1971)` — printed in full as a chapter of the 2015
//     MIT Press volume, DOI 10.7551/mitpress/10014.003.0008. Paywalled.
//   · The PAPER VOLUMES, "from the early 1970s to 2005" — described by the
//     holder and NOT DIGITISED. The description is itself only in the Wayback
//     Machine now.
//   · 100 DIGITISED CASSETTES of his spoken diary, 1970–1975 — counted by
//     Constant for dOCUMENTA (13) and published by nobody.
//   · An APPLE NEWTON diary, each entry stamped with a date and time — read by
//     Constant's scripts, never published.
//   · 3986 timestamped photo files, which is the same project in pictures.
// The three National Gallery fonds records list `diaries / päiväkirjat /
// dagböcker` among their subjects and describe the contents in a sentence, and
// that was in the bulk dump from the first run — unread, because nothing
// printed the keywords. The item-level finding aid is behind the API key: the
// twenty child records the fonds point at are not in the open dump and
// `GET /api/v1/objects/{id}` answers 403 for every id including ones that are.
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
// ⚠️ AND A COUNT THAT IS TOO TIDY IS A BROKEN COLLECTOR. Five of these
// endpoints will answer 200 with a result that is silently wrong if you ask
// them slightly wrong — the National Library's search returns ALL 2.6 million
// bindings when `queryTargetsOcrText` is left out, Europeana's unquoted
// `Kurenniemi` returns a guitarist and a building, archive.org's search returns
// a bicycle bell, OpenAlex's returns a paper on fungi growing in a Karelian
// nature reserve that happens to be CALLED Kurenniemi, and the Wayback capture
// of the timeline page this whole archive was built around is an empty frame,
// because its contents load with JavaScript the crawler never ran. Each of
// those is filtered or worked around here BY A STATED RULE, and the rule is in
// a comment beside it, so a future run that returns a different number can be
// told apart from a future run that asked a different question.
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

// 🔴 THE PAGE'S OWN CAP, TYPED HERE SO THE TWO CANNOT DISAGREE. `index.html`
// passes this number to `createTable` and this file refuses to write a corpus
// larger than it. A table drawing fewer rows than the file holds is a page
// reporting a smaller archive than was found, with nothing on screen saying so.
const PAGE_CAP = 600;
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
 * `proto/deck/ingest.mjs` already decodes, arriving through a different
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

/**
 * A FINNISH ARCHIVIST'S DATE, WHICH IS NOT ISO AND IS NOT ALWAYS A POINT.
 *
 * The Central Art Archives' own catalogue text dates its Kurenniemi items in
 * eleven distinct written forms, counted rather than remembered: `1953`,
 * `1953-04-07`, `30-06-1975` (day first), `1976-11`, `1950-luku` (the 1950s),
 * `1950-luvun puoliväli` (mid-1950s), `1960-luvun alku` / `1970-luku,
 * alkupuoli` (early), `1960-luvun loppu` / `1960-luku, loppupuoli` (late),
 * `1975 jälkeen` (after 1975), `1963-2005` (a span) and `1992-00-00` — a zero
 * month and a zero day, which is an explicit "not known", the same honest-null
 * shape the Constant mirror uses.
 *
 * 🔴 THE QUALIFIER IS RECORDED AND THE BRACKET IS NOT NARROWED BY IT.
 * `1950-luvun puoliväli` really does say something `1950-luku` does not — but
 * "mid" has no defined width, and choosing one (1953–1957? 1954–1956?) would
 * put a number in the file that the archivist never wrote. The bracket stays
 * the whole decade, `precision` says `decade`, and the qualifier goes into the
 * note in the archivist's own words. A wider bracket is a weaker claim; a
 * narrower one made up here is a wrong claim that reads as a measurement.
 *
 * `jälkeen` ("after") closes at 2018 — the January after he died — because a
 * thing in his personal archive cannot be from after him. That IS an
 * inference, so it is stated in the note rather than hidden in the number.
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
  // `1994, 2003-09-30` — two dates, which the archivist wrote because both are
  // true of the object. The bracket spans them.
  if ((m = /^(\d{4})\s*,\s*(\d{4})-(\d{2})-(\d{2})$/.exec(s))) {
    return { edtf: `${m[1]}–${m[2]}-${m[3]}-${m[4]}`, earliest: Y(+m[1]),
             latest: Date.UTC(+m[2], +m[3] - 1, +m[4]) + 86400e3, precision: 'range', how,
             note: `the source gives two dates, ${s}` };
  }
  // `1975 jälkeen` — an open start. See the block comment for why it closes
  // where it does.
  if ((m = /^(\d{4})\s+jälkeen$/i.exec(s))) {
    return { edtf: `after ${m[1]}`, earliest: Y(+m[1]), latest: Y(2018), precision: 'after', how,
             note: `the source says "${s}" — after ${m[1]}, with no end. The bracket closes at his `
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
             ...(qual ? { note: `the source says "${s}" — ${FI[qual]} of the ${dec}s. The bracket is `
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

// ── 0. what is already gathered: proto/deck/corpus.json ─────────────────
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
      if (!/resources/i.test(says)) {
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
             // ⚠️ WHAT THE FONDS SAYS IT CONTAINS IS THE ANSWER TO "ARE THE
             // DIARIES IN THIS?" — and it was in the dump all along, unread.
             // The keyword list on 101, 5690185 and 6092302 carries `diaries /
             // päiväkirjat / dagböcker` in three languages, and the description
             // spells it out. Naming the material groups here is what turns
             // three rows that stand for 33 shelf metres into rows a reader can
             // interrogate.
             kws.length ? `what is in it, in the catalogue's own words: ${kws.join(', ')}` : null,
             (x.children || []).length
               ? `${x.children.length} child records (${(x.children || []).join(', ')}) — NOT ONE of them `
                 + 'is in the open dump, and the per-object endpoint answers 403 for every id including '
                 + 'this one, so the series and item list is behind the API key'
               : null,
             x.acquisitionYear ? `acquired ${x.acquisitionYear}` : null].filter(Boolean).join(' · ') || null,
    };
  });
  // 🔴 THE HIERARCHY IS BROKEN IN BOTH DIRECTIONS, AND SAYING SO IS THE ROW.
  // `6092302` (AV materials, series 11 of the fonds) declares `parents:
  // [5690185]`; `5690185` does NOT list it among its eight children. So the
  // open dump disagrees with itself about what is inside the archive, and the
  // series numbering — `KG-ARK-THAA106-S-11` — says there are at least eleven
  // series of which exactly one is published. Counting the dangling ids is the
  // only measurement of how much is described and unreachable.
  //
  // ⚠️ THE TWO FONDS' CHILDREN, NOT EVERY DANGLING CHILD ON EVERY RECORD. The
  // first version of this row counted 28 and called them "series and item
  // records inside the two fonds" — but eight of those belong to the artwork
  // `Winterreise` and to `Dimi-O`, which are objects in Kiasma and not part of
  // the archive at all. A count that sweeps up whatever matches is a count that
  // describes something other than its own title.
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
  // The WORK is the composition, which is a different thing from a recording of
  // it and from the disc it came out on — MusicBrainz keeps all three and only
  // the work has a stable identity across the eleven tapes, the 2002 CD and the
  // 2013 reissue. Three of them exist.
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
  // ⚠️ THE 60 RECORDINGS ARE NOT ENUMERATED, AND THE REASON IS IN THE NUMBERS.
  // `ws/2/recording?artist=` answers 60, of which 27 are `[Sähkö-shokki-ilta,
  // part N]` — one 2013 live set chopped into parts by whoever entered it — and
  // most of the rest are second and third catalogue entries for the same eleven
  // tapes already listed above from the compilation's tracklist. Enumerating
  // them would treble MusicBrainz's share of this file with duplicates. The
  // count is stated instead, which is the honest form of "there is more here".
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

// ── 5. Wikidata ─────────────────────────────────────────────────────────────
//
// The deck already carries six works and the two life events. This asks the
// query service for everything Wikidata attributes to him by any of seven
// properties, which finds three more — `Computer Music`, `On-Off` and the
// compilation album itself. Rows the deck already has are dropped by id later.
//
// ⚠️ THE PROPERTY LIST IS A CHOICE AND THE THINGS LEFT OUT ARE NAMED. A query
// for EVERY inbound direct claim returns 14 items rather than 10, and the four
// extra are `Madhar Abol Naga` (property: DIFFERENT FROM — a statement that
// something is not him), his mother, his father and his wife. People are not
// things an archive holds, and "different from" is the opposite of a link.
// `P710`, participant in, IS in the list, because dOCUMENTA (13) is where the
// archive project that produced half of this corpus happened.
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
  // 🔴 THE KEY CARRIES THE QUERY'S VERSION, BECAUSE THE URL DOES NOT.
  // `ask()` caches on `key` when one is given, and the key was a constant while
  // the SPARQL underneath it changed — so adding P710 to the property list
  // re-ran nothing and the output was byte-identical to the run before it. It
  // looked like Wikidata simply has no P710 statement about him; the same query
  // asked by hand returned dOCUMENTA (13) in one request. A cache key that does
  // not move when the question moves answers the old question forever.
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
  // 🔴 THE ITEM'S OUTBOUND STATEMENTS ARE WHERE THE NEXT DIG STARTS, AND THEY
  // ARE NOT ROWS. Wikidata carries 82 statements about him, and about forty of
  // them are external catalogue identifiers — each one a claim that some
  // institution has a record under that number. They are not holdings, so
  // putting them in the list would pad it with pointers to pointers; they are
  // a map of where to look next, so they go in the ledger where somebody
  // planning the next session will read them. Two of them are already load-
  // bearing here: `P1953` gave the Discogs artist id this file harvests from
  // rather than a name search, and `P2977` names Elonet record 117760 — which
  // is the Finnish film catalogue sitting behind the Finna 403 two rows down.
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
  const mine = docs.filter((d) => /resources/i.test(`${d.identifier} ${d.title}`));
  // ⚠️ FIVE ITEMS IS THE WHOLE OF IT, AND THAT IS ASKED RATHER THAN ASSUMED.
  // The free-text query is the widest one there is; the four field queries are
  // the narrow ones. If the collection grew, the field queries would find it
  // first. Each returns its own count into the ledger.
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

// ── 7. Europeana ────────────────────────────────────────────────────────────
//
// ⚠️ QUOTE THE NAME. Unquoted, `Kurenniemi` returns eight records and seven are
// a guitarist, a building and a photographer's surname. The phrase query
// returns one, and it is the right one: the surviving DIMI-A in Stockholm.
//
// ⚠️ AND THE THINNESS IS A MEASUREMENT, NOT AN UNDER-QUERY. One row out of an
// aggregator of 50-odd million looks like a badly-asked question, so it was
// asked six ways: the quoted name (1), the bare surname (8), `DIMI Kurenniemi`
// (1), Europeana's own `who:` person field (1), `proxy_dc_creator:Kurenniemi`
// (1) and `Sähkökvartetti` (0). The most any form returns is eight, seven of
// which are a guitarist called Mikko and a Helsinki building. Europeana really
// does hold one Kurenniemi object. The counts are in the ledger so the next
// person does not have to re-run the sweep to believe it.
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
  const body = (a, b, auth) => JSON.stringify({
    query: 'Kurenniemi', requireAllKeywords: true,
    queryTargetsOcrText: true, queryTargetsMetadata: false,
    formats: ['NEWSPAPER', 'JOURNAL'],
    startDate: a, endDate: b,
    includeUnauthorizedResults: auth,
  });
  // 🔴 ONE WINDOW WAS NOT A MEASUREMENT, IT WAS A SAMPLE — AND IT HID THE
  // THING THAT MAKES THIS SOURCE HONEST. The old row asked 1960–1979 only,
  // reported 1279 citations and 0 readable, and read as "the press index is
  // shut". Asked across its whole range the same endpoint answers 7549, of
  // which 2640 CAN be read — and 2622 of those readable ones are from BEFORE
  // HE WAS BORN. That is not a bonus: it is the proof that this is a SURNAME
  // search over OCR text and not a person search, which no single window could
  // show. His mother Marjatta was a well-known children's author and his father
  // Tauno a physicist; the name is in the Finnish papers for a century before
  // him. One row per window, each with its own two numbers, is the only shape
  // in which that is visible rather than averaged away.
  //
  // ⚠️ THE FIRST WINDOW STARTS AT 1900 AND NOT AT THE INDEX'S OWN START. The
  // binding search goes back to 1771, the first Finnish newspaper, and asking
  // it that way is a true measurement — but the ROW would then bracket
  // 1771–1940, which is a claim about a corpus rather than about a person, on
  // a page whose other 334 rows are about one. The whole-range figure is asked
  // for separately and quoted in the ledger, where prose can say what it is.
  const WINDOWS = [
    ['1900-01-01', '1940-12-31', 'before he was born'],
    ['1941-01-01', '1959-12-31', 'his childhood — the name is mostly his parents\''],
    ['1960-01-01', '1979-12-31', 'the instruments and the films'],
    ['1980-01-01', '1999-12-31', 'Dimensio, Datart and the computer years'],
    ['2000-01-01', '2026-12-31', 'the archive, the documentary and the obituaries'],
  ];
  // ⚠️ A JSON POST NEEDS A PREFLIGHT, SO THE POST'S OWN HEADERS ARE NOT THE
  // ANSWER. A browser asks OPTIONS first and never sends the POST if that is
  // refused — measured 403 here — so this endpoint is unreachable from a page
  // even though the POST itself answers 200 to a script.
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

// ── 9. the Constant / KURATOR mirror ────────────────────────────────────────
//
// 3986 rows of one file each, and the pixels are not in the mirror. One row
// here, with the count read off the page rather than remembered — the page
// prints `N total, starting on record 1` and that N is what goes in `count`.
async function vandal() {
  const asked = 'https://vandal.ist/resources/sampledata/index.html';
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
  // 🔴 THE PROJECT'S OWN PAGE ABOUT THE TAPES IS THE ONLY PLACE ANYBODY SAYS
  // HOW MANY AUDIO DIARIES THERE ARE. The mirror kept the sample data and
  // dropped the Data Radio — `vandal.ist/resources/dataradio/material.html`
  // answers 404, measured — so the page survives only on the dead
  // `kurenniemi.activearchives.org` in the Wayback Machine, where it reads:
  // "Kurenniemi's archive contains 100 digitized cassettes of a period that
  // ranges from 1970 to 1975." That sentence is a finding aid nobody else
  // publishes, and it is two rows below: the cassettes and the Newton diary.
  const DR = 'http://kurenniemi.activearchives.org/dataradio/';
  const gone = await ask('https://vandal.ist/resources/dataradio/material.html',
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

// ── 9b. lahteilla.fi, through the Internet Archive ──────────────────────────
//
// 🔴 THIS IS WHERE THE DIARIES ARE, AND THE SITE THAT HOLDS THEM IS DEAD.
// `lahteilla.fi/resources/` was the Finnish National Gallery's own public
// presentation of the fonds — *Erkki Kurenniemi, Mies tulevaisuudesta* — and it
// does not resolve (`DNS ENOTFOUND`, measured, and already a row in this file).
// The Wayback Machine holds 545 of its URLs, and inside them is the item-level
// digitisation nothing else publishes: photographs of the PAGES OF HIS DIARIES,
// scans of his manuscripts and drafts, his 2003 correspondence with Leena
// Krohn, and a hundred captioned photographs — each with a date an archivist
// typed.
//
// ⚠️ THE ITEMS ARE ON THE KEYWORD PAGES, NOT THE TIMELINE PAGES. The timeline
// the site was built around fills itself with JavaScript the crawler never ran,
// so a capture of `/timelinepage/8` is an empty frame and reads as "the content
// is gone". The 48 `/thing-tags/<keyword>` pages are server-rendered and
// complete, and every item is on at least one of them. Harvesting those and
// de-duplicating on the site's own `thingid` recovers the set.
//
// ⚠️ AND WEB.ARCHIVE.ORG SENDS NO `access-control-allow-origin`. Measured with
// an Origin header on both an HTML page and a JPEG: 200, and no ACAO on either.
// So these rows are `<img>`-able from a page and not readable by `fetch` — the
// same posture as the National Gallery's own API, reached from the other side.
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
// The seven sections the site divides the archive into. Each carries the
// institution's own prose about that part of the fonds, and
// `muistiin-kirjoitettu-elämä` — "a life written down into notes" — is the
// diaries one.
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
  // The CDX index says which of the site's images the crawler actually kept. It
  // is asked ONCE and matched against the img src on each tag page, because the
  // timestamp baked into a rewritten src belongs to the HTML capture and not to
  // the image — following one of those verbatim is a 404, measured.
  const cdx = await ask('http://web.archive.org/cdx/search/cdx?url=lahteilla.fi/resources/'
    + 'sites/default/files*&output=json&collapse=urlkey&limit=5000'
    + '&fl=original,timestamp,statuscode,mimetype,length',
    { cache: true, key: 'lahteilla-cdx-files', tries: 3, maxAgeMs: 30 * 86400e3 });
  //
  // 🔴 KEY ON THE FILE, NOT ON THE RENDERING — AND THE DIARIES ARE WHY. Drupal
  // serves one original through several image styles, and the tag pages all
  // link `styles/keyword_thumb/`, which is 150 px square. Matching that path
  // exactly found four of the five diary pages and missed the fifth, because
  // the crawler never took its thumbnail — while it DID take
  // `styles/very_big/public/EK0000056.jpg`, 2.6 MB, which is a diary page you
  // can actually read. Keying on everything after `public/` and keeping the
  // LARGEST capture of each file recovers it, and upgrades several photographs
  // from a thumbnail to the 400 kB rendering beside it.
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
      // The name of the underlying file, which is what `caps` is keyed on. The
      // timestamp in a rewritten src belongs to the HTML capture and not to the
      // image — following one verbatim is a 404, measured — so only the file
      // part of it is used.
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
    // The site's OWN tags decide what kind of object each is — no reading of
    // titles here. `tekstit` (texts), `päiväkirjat` (diaries) and
    // `kirjeenvaihto` (correspondence) are documents, `videot` is a video, and
    // everything else on this site is a photograph.
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
    // ⚠️ THE PROSE IS ONE DIV, AND TAKING THE WHOLE PAGE GETS THE FURNITURE.
    // Stripping the tags off the document and cutting at the menu produced
    // `"Erkki Kurenniemi A documented life Erkki Kurenniemi Muistiin
    // kirjoitettu elämä A documented life Kurenniemen arkisto sisältää…"` —
    // the site name twice and the section title three times, in two languages,
    // ahead of the sentence that matters. Drupal wraps the description in
    // `.timeline-front-content` inside the `<article>`; that div, minus the
    // preview image, IS the description. The English section label opens it and
    // is already in this row's own title, so it comes off the front.
    const art = /<div class="timeline-front-content">([\s\S]*?)<\/article>/.exec(r.body || '');
    const txt = unent((art?.[1] || '')
      .replace(/<div class="preview_image"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/, ' ')
      .replace(/<[^>]+>/g, ' '));
    // ⚠️ THE LABEL TO STRIP IS THE PAGE'S OWN, NOT THE ONE IN THE TABLE ABOVE.
    // The site calls this section "Photographs from Erkki Kurenniemi's
    // archives" and the table above calls it "Photographs from his archives";
    // matching on the second left the first standing at the head of the quote.
    // Read it out of `.page-title` and take that off instead.
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
      // 🔴 THE SPAN COMES OUT OF THE SENTENCE, NOT OUT OF A GUESS. The diaries
      // page says "1970-luvun alusta vuoteen 2005" — from the start of the
      // 1970s to 2005 — so that is the bracket, and `how` says where it was
      // read. The other six section pages describe material with no span in
      // them and get NO date rather than the fonds dates borrowed.
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
        // ⚠️ AN EMPTY DESCRIPTION IS SAID IN WORDS, NEVER AS AN EMPTY QUOTE.
        // Two of the seven section pages carry a heading and no text at all,
        // and a bare `""` beside them reads as a collector that dropped
        // something rather than as a page that was always blank.
        : r.status === 200
          ? 'the section page carries a heading and no description — the institution never wrote '
            + 'one, which is a different thing from this run failing to read it'
          : `the page answered ${r.status} on this run`),
    });
  }
  // The publication the National Gallery made about this archive, chapter by
  // chapter. Open PDFs, every one of them, on a host that is gone.
  const pubs = await ask('http://web.archive.org/cdx/search/cdx?url=lahteilla.fi/resources/'
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
      url: wb('http://www.lahteilla.fi/resources/julkaisu/' + name, row[1]),
      file: wb('http://www.lahteilla.fi/resources/julkaisu/' + name, row[1] + 'if_'),
      fileType: 'application/pdf',
      bytes: +row[4] || null,
      count: 1,
      // 🔴 NO DATE, AND THE REASON IS THE RULE THIS FILE IS BUILT ON. The PDF
      // is not opened — this corpus points at files and never reads them — so
      // the only date available is the crawl timestamp, which dates the COPY
      // and not the publication. Writing that year here would be the
      // archive.org upload-date mistake in a second costume.
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

// ── 9c. Crossref — the book that IS the documentary evidence ────────────────
//
// 🔴 THE MIT PRESS VOLUME WAS ONE ROW SAYING "PAYWALLED", AND INSIDE IT ARE
// TWENTY OF HIS OWN TEXTS, EACH DATED. *Writing and Unwriting (Media) Art
// History: Erkki Kurenniemi in 2048* prints his diaries, essays, drafts and
// interviews as chapters, and the editors put the year of the ORIGINAL document
// in each chapter title — `Audio Diary C4008-1 (1971)`, `Message Is Massage
// (1971)`, `Computer Eats Art (1972–1982)`, `Relative Life (2003)`. Crossref
// registers every one with a DOI and an author list, keyless, `ACAO: *`. So the
// book's table of contents is a dated list of primary sources and it is
// machine-readable — which is the opposite of what "paywalled" suggested.
//
// ⚠️ THE DATE IS THE ONE IN THE TITLE, NOT THE ONE CROSSREF GIVES. Crossref
// says 2015-09-11 for all 36 chapters, which is the day the book came out; a
// row that carried that would date a 1971 diary entry to 2015. The year in the
// parentheses is an editorial statement about the document, made by the
// editors who had the manuscript, and it is the better evidence. Where a title
// has no year the chapter is a modern essay ABOUT him, and it keeps the book's
// date, because for those two facts are the same.
//
// ⚠️ AND SIX ROWS ARE DROPPED BY A NAMED RULE. `Index`, `Contributors`,
// `[ Front Matter ]`, `[ Opening ]`, `Acknowledgments` and `Series Foreword`
// are the apparatus of a book rather than anything held anywhere. They are
// named in the ledger rather than quietly binned.
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
          note: /ca\./i.test(title) ? 'the editors wrote "ca." — the year is their estimate, not a date on the document' : undefined }
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

// ── 9d. Discogs ─────────────────────────────────────────────────────────────
//
// MusicBrainz has five releases; Discogs has thirty-four credits on twenty-nine
// distinct releases, keyless and with `ACAO: *`. It is the discography the
// other one is a subset of — the 1967 `Information Explosion`, the 1970 `DIMI 1`
// on Musica, the bootlegs, and the compilations he turns up on.
//
// ⚠️ ONE RELEASE CAN CARRY THREE CREDITS AND IS STILL ONE OBJECT. `Perspectives
// '68` comes back as `Appearance` and as `TrackAppearance`; `Tombstone
// Valentine` as `Appearance` and as `UnofficialRelease`. De-duplicating on the
// release id and keeping the roles in the note is the difference between a
// discography and a padded one.
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

// ── 9e. OpenAlex ────────────────────────────────────────────────────────────
//
// The scholarly literature, including the things neither Zenodo nor Crossref
// carries: the 2023 Hatje Cantz monograph, the Leonardo review, the Nordic
// journal pieces — and `Spontaneous Impulse Activity in Immature Rabbit Brain`
// (Acta Physiologica Scandinavica, 1966), which is the paper he wrote as a
// neurophysiologist and which nothing else in this corpus knew about.
//
// ⚠️ TWO NARROW QUERIES, NOT ONE WIDE ONE. `search=Kurenniemi` returns 243
// works, because it covers the full text of everything. The union of
// `title.search:Kurenniemi` (19) and `author.id:` his own OpenAlex id (16) is
// 33 — and two of those still are not his, for reasons worth reading below the
// filter.
//
// ⚠️ AND DE-DUPLICATED AGAINST WHAT IS ALREADY HERE, BY DOI. Seventeen of the
// 33 are MIT Press chapters Crossref already returned and four are Zenodo
// deposits; emitting them again would put the same text in this file three
// times under three ids. The DOI is the join key and the count of collisions
// goes in the ledger, because a de-duplication nobody is told about cannot be
// told apart from a source that found nothing.
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
    // 🔴 KURENNIEMI IS ALSO A PLACE, AND THE FULL-TEXT INDEX WILL RETURN IT
    // FOREVER. One hit is `New data on aphyllophoroid fungi (Basidiomycota) of
    // the protected areas of the Leningrad Region. XI. Planned protected area
    // «Kurenniemi»` — a Karelian headland, which is where the surname comes
    // from, written in guillemets the way a Russian-language paper names a
    // nature reserve. It is part XI of a series, so parts XII and XIII are
    // coming. Filtering on the topic does not separate them: OpenAlex files the
    // Leonardo review of the Kurenniemi BOOK under Neuroscience, so "drop the
    // natural sciences" would drop a real row and keep the fungi. What DOES
    // separate them is the punctuation — a place is quoted, a person is not.
    // Strip the quoted form and require the name to survive somewhere else.
    const unquoted = title.replace(/[«"“”'‘’‹›]\s*Kurenniemi\s*[»"“”'‘’‹›]/gi, ' ');
    if (!/resources/i.test(unquoted + ' ' + authors.join(' '))) {
      dropped.push(`${title} — the name is a place here, not him`);
      continue;
    }
    // ⚠️ AND A RECORD WITH NEITHER A DOI NOR A YEAR IS AN INDEX STUB. OpenAlex
    // holds a second, empty copy of the MIT Press volume with no identifier and
    // no date; a row for it would show the same book twice, once with a dash
    // where its date should be, which reads as a date this collector lost.
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
  { id: 'lahteilla:kurenniemi', url: 'https://web.archive.org/web/2024/http://lahteilla.fi/resources/',
    probe: 'http://lahteilla.fi/resources/',
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
  // 🔴 THE DOCUMENTED, KEYLESS REST API IS BLOCKED TOO, AND THAT IS WORTH ITS
  // OWN ROW. "Finna 403s" could have meant "the search page has a bot check and
  // the API is fine" — that is the obvious next thing to try and it is why this
  // was re-attacked. It is not fine. `api.finna.fi/v1/search` answers the same
  // Cloudflare managed challenge, and it does so with this script's user agent,
  // with a desktop Chrome one and with NO user agent at all — three forms, one
  // answer. `elonet.finna.fi` is the same edge and the same 403. So the whole
  // Finnish national discovery layer is shut to this machine, and nobody should
  // spend another hour finding out.
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
  // These hosts are one row each rather than a harvest, so their ledger entries
  // are written from the rows themselves — with the code each one answered.
  //
  // 🔴 ONE LEDGER ENTRY PER SOURCE NAME, AND THIS IS WHERE THAT BROKE. When
  // `lahteilla()` was added, this loop kept writing a SECOND `lahteilla.fi`
  // entry from the dead-host probe, and the two disagreed: one said 200 and one
  // said `DNS ENOTFOUND`, both claiming the same 129 rows. The output looked
  // fine and the page's own check — every source's `items` summing to the row
  // count — would have gone red with the totals off by exactly one source's
  // worth. An entry that already exists is EXTENDED with what the probe found
  // rather than duplicated, because "the host is dead" and "the Internet
  // Archive still has it" are two halves of one fact about one place.
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

// ── run ─────────────────────────────────────────────────────────────────────
//
// ⚠️ ORDER MATTERS FOR EXACTLY ONE STEP AND IT IS DECLARED HERE RATHER THAN
// IMPLIED. `openalex` de-duplicates against the DOIs already gathered, so it
// runs after `crossref` and `zenodo` and is handed the id set. Everything else
// is independent; a step is free to move.
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

// 🔴 A DUPLICATE ID IS A ROW THAT SILENTLY REPLACES ANOTHER ONE IN EVERY MAP
// DOWNSTREAM, AND THE PAGE WOULD STILL READ GREEN. Two harvesters can reach the
// same object by different doors — Crossref and OpenAlex both key on the DOI —
// so the collision is checked for rather than assumed away, and it is a hard
// failure because there is no sensible thing to do with the second copy.
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

// 🔴 THE PAGE ASSERTS THAT THE LEDGER'S COUNTS ADD UP TO THE LIST, SO THE
// BUILDER PROVES IT BEFORE WRITING. Two ledger entries with the same name each
// count all of that source's rows, and the sum silently doubles — which is
// exactly what happened the first time `lahteilla` ran alongside the by-name
// probe of the same host. Failing here costs a rebuild; failing in the browser
// costs somebody's afternoon working out which of eighteen numbers is wrong.
{
  const seen = new Set(), clash = [];
  for (const s of sources) { if (seen.has(s.name)) clash.push(s.name); seen.add(s.name); }
  if (clash.length) throw new Error(`two ledger entries for one source: ${clash.join(', ')}`);
  const summed = sources.reduce((n, s) => n + s.items, 0);
  if (summed !== items.length) {
    throw new Error(`the ledger counts ${summed} rows and the list has ${items.length}`);
  }
  // And the page's table is capped: over the cap it draws fewer rows than the
  // corpus holds and its own count check goes red on a file that is otherwise
  // correct. The cap is 400 and it lives in `index.html`; this is the only
  // place that can see the total before it is written.
  if (items.length > PAGE_CAP) {
    throw new Error(`${items.length} rows — the page's table caps at ${PAGE_CAP} and would draw fewer`);
  }
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
