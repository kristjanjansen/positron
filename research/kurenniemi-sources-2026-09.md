# Kurenniemi — other digitised sources, and what a machine can do with each (2026-09-14)

Status (2026-10-14): done. Zenodo, its headline find, is now a corpus source in demo/resources/build-corpus.mjs and demo/resources/corpus.json, and the file is cited by PROGRESS.md and research/corpus-from-thesis-2026-09.md.

Follow-up to `research/kurenniemi-archive-2026-08.md`, which probed what
`proto/aikajana/` is built on. This asks the next question: **what else is
out there that we do not already pull?** Every endpoint below was exercised
live from this machine today unless marked otherwise.

Marks: **✅ measured here** (status + headers recorded) · **📄 from the
source's own docs** · **⚠️ inferred, not verified** · **❌ blocked/absent,
measured**.

## Headline

Three sources found that we do not use and that are **strictly better than
what we have for the thing they cover**:

1. **Zenodo** — 28 records, 80 files, 884 MB, **every one CC-BY-4.0**,
   `ACAO: *` and Range on the file endpoint ✅. Includes a **238-row dated CSV
   of every appearance of every Kurenniemi instrument 1962–2018** whose date
   convention is *declared in a README*. It dates six of the nine tapes our
   corpus currently pins to a flat 1963–1973 guess.
2. **Finnish National Gallery `/api/v1/objects`** — the August report concluded
   the archive collection had no API. **It does.** The open bulk dump carries
   **30 Kurenniemi records including both archive fonds** (`Erkki Kurenniemi
   Archive I`, 22.65 shelf-metres, 1962–2005) with institutional year ranges ✅.
3. **`vandal.ist/kurenniemi/`** — the Constant "Erkki Kurenniemi (In 2048)"
   prototype, reported in August as *"host does not resolve — gone"*. It moved.
   **3986 timestamped file records, 200 pages, harvested complete today** ✅.

And one loss to record: **`lahteilla.fi`, the FNG's own public Kurenniemi
site, is DNS-dead** (SERVFAIL ✅). Wayback last captured it 2026-02-12, so it
died inside the last seven months. 545 of its URLs are recoverable there.

---

## 0. What we ALREADY have — `proto/aikajana/corpus.json`

Do not read the rest of this document as if it were all new. The existing
corpus is **22 items from 3 sources**:

| source | items | what | media |
|---|---|---|---|
| **archive.org** | 13 | 12 MP3 tapes + 1 MP4 (`Computer Music`, 1966) | ✅ playable, `ACAO: *` on audio |
| **Wikidata** | 8 | 2 life events (born/died) + 6 works/films | ❌ none |
| **Europeana / MIMO** | 1 | DIMI-A, the surviving instrument (Stockholm) | image only, no ACAO |

`ingest.mjs` pulls exactly two archive.org identifiers —
`videoplayback-13_202304` and `computer-music-1966-dir.-erkki-kurenniemi`
(line 193). Dating: 2 day-precise, 11 year, **9 `range`** — those nine are the
tapes with no date anywhere, pinned to the 1963–1973 span of the Love Records
compilation title. 13 of 22 items carry `rightsConfidence: LOW`.

**archive.org re-measured today** ✅ — nothing has changed since August:
audio `206` + `ACAO: *`, **still no `access-control-expose-headers`** so JS
cannot read `Content-Range`; video `302` carries ACAO, the final `206` node
does **not**.

---

## 1. The sources

### Summary table

| source | API | auth | CORS on data | CORS on media | licence | volume | new to us |
|---|---|---|---|---|---|---|---|
| **Zenodo** | ✅ `zenodo.org/api/records?q=` | none (25/page cap) | ✅ `ACAO: *` | ✅ `ACAO: *`, `206`, Range | ✅ **CC-BY-4.0**, all 28 | 80 files, **884 MB** | **yes** |
| **Finnish National Gallery** | ✅ `GET /api/v1/objects` (full dump) | none | ❌ no ACAO | ❌ no ACAO on `/media-assets/` | 📄 CC0 on images | 89 072 records, 29 MB gz | **yes** |
| **vandal.ist (Constant)** | ❌ static HTML only | none | ❌ no ACAO | derived JPEGs only | ⚠️ unstated | **3986 records** | **yes** |
| **Wikimedia Commons** | ✅ `w/api.php` + `origin=*` | none | ✅ `ACAO: *` | ✅ `206`, **`expose-headers` incl. `Content-Range`** | ✅ all 5 Public Domain | 5 dated portraits | **yes** |
| **MusicBrainz** | ✅ `ws/2/` | none (UA required) | ✅ `ACAO: *` | n/a | ✅ CC0 data | 5 releases | **yes** |
| **Nat. Library (digi)** | ✅ `POST /rest/binding-search/…` | none | ❌ no ACAO | ❌ **gated** | ❌ legal-deposit only | **1279 hits 1960–79** | **yes** |
| **AV-arkki** | ⚠️ `wp-json` open but catalogue not exposed | none | ✅ **echoes Origin** | Vimeo embed | 📄 licensed per screening | 25 news/page hits | partly |
| **archive.org** | ✅ | none | ✅ audio only | see above | ⚠️ uploader-asserted | 4 items, 2 unused | mostly exhausted |
| **Europeana** | ✅ | `api2demo` | ✅ `ACAO: *` | no ACAO | ✅ institution-asserted | **1 real hit** | no |
| **Finna.fi** | 📄 documented | none | ❌ **403 Cloudflare** | — | — | — | still blocked |
| **Yle** | 📄 `external.api.yle.fi` | **key required** | ❌ 403 without key | ⚠️ FI geo-lock | ❌ | — | still blocked |
| **Elonet / KAVI** | — | — | ❌ 403 (Finna edge) | — | — | — | still blocked |
| **Musiikkiarkisto** | ❌ searchable only via Finna | — | — | — | — | 📄 60 TB total | blocked via Finna |

---

### 1.1 Zenodo — the Helsinki research corpus ⭐ ✅

`https://zenodo.org/api/records?q=Kurenniemi&size=25` (page size **capped at
25** without auth — a `size=50` request is a hard `400` ✅).

**28 records, 80 files, 884.4 MB, every record `cc-by-4.0`.** 25 are the
University of Helsinki / Mikko Ojanen electroacoustic-music research corpus;
3 are false positives. By type: 21 publications, 3 datasets, 2 videos,
1 image set, 1 presentation. **No audio.**

**CORS measured on the file endpoint** ✅ — `Range: bytes=0-1023` on the 431 MB
MP4 returned `206 PARTIAL_CONTENT`, `content-range: bytes 0-1023/431949041`,
`access-control-allow-origin: *`, `access-control-expose-headers: Content-Type,
ETag, Link, X-RateLimit-*`. So a browser can Range-fetch it. ⚠️ **But the
`content-type` is `application/octet-stream` on a `.mp4` and on a `.mpg`** —
Chrome sniffs media and will usually play it, WebKit is stricter, and an
`.mpg` (MPEG-1 program stream) is not natively playable anywhere. Treat the
video as *fetchable*, not as *`<video src=>`-able*, until tested on the device.

The records that matter, with their direct file URLs:

| id | date | what | files |
|---|---|---|---|
| **5678270** | 2020-01-11 | **`Appearances of Erkki Kurenniemi's Electronic Musical Instruments`** — dated event list | 2 CSV, 57 KB |
| **3596466** | 2020-01-01 | EKIS user-interface & functionality charts | **37** (CSV + TIF) |
| **3592770** | 2019-12-24 | Development of Digelius Electronics Finland in documentary evidence | 1 CSV, 30 rows |
| **1469722** | 2018-10-23 | **DIMI-A playing Bach's Inventio** — analysis video + master-tape photos | 9, **432 MB MP4** |
| **5801697** | 2021-12-23 | **DICO demonstration video** (for Osmo Lindeman) | 1, 226 MB `.mpg` |
| **3601403** | 2020-01-08 | **Photos of the master tape of `On-Off` (1963)** | 6 TIF/JPG, 67 MB |
| **5798032** | 2021-12-20 | **Sähkökvartetti assembly/wiring diagram** | 1 PDF |
| **4290670** | 2020-11-25 | Oulu Symphony concert programme, **1972-10-18**, DIMI-O | 1 PDF |
| **4290689** | 2020-11-25 | **The 1968 HYY / Love Records draft contract** (`680530`) | 2 PDF |
| **4306056** | 2020-11-27 | Ojanen, *User Stories of Erkki Kurenniemi's Electronic Musical Instruments, 1961–1978* — PhD | 1 PDF, 12 MB |
| **4289048** | 2020-11-24 | Ruohomäki, history of Finnish electroacoustic music [manuscript] | 1 PDF |
| 804884 / 850915 | 2014 | *DIMI-6000: An Early Musical Microcomputer* (ICMC + SMC versions) | 2 PDF |
| 1177211 / 806210 | 2007 | NIME 2007 — design principles and user interfaces of the instruments | PDF |

#### The `Appearances` CSV — the single most useful file found ✅

Downloaded and parsed ✅. 8 columns, **238 data rows**, `;`-delimited:

```
Instrument; Event; Location/Venue; Composer/Artist/Group;
Musical work / Art work; Type of work; Date; Reference
```

**Its date convention is DECLARED, in a README file shipped beside it** —
which makes it the third source we have met that declares precision instead of
leaking it (after Wikidata's integer and EDM's surviving literal):

> `Dates marked as yyyymmdd; e.g. 19650101 = 1965 January 1st`
> `If spesific information is missing or unknown, marked as 00; e.g. 19650100 =
> 1965 January spesific day unknown; 19650000 = 1965 spesific month unknown`

Measured distribution ✅: **134 day-precise · 57 month · 47 year · 0 missing.**
Span **1962 → 2018**, 33 distinct years, 23 instrument labels (DIMI-A 37,
DIMI-O 36, Electric Quartet 31, DICO 27, Andromatic 24, DIMI 6000 11,
DIMI-S 9, DIMI-T 4, DIMIX 4, DIMI-P 2, DIMI-U 1, …).

**It dates our undated tapes.** Cross-matched against `corpus.json` ✅:

| our item | our current date | Appearances says | gain |
|---|---|---|---|
| `On-Off` | range 1963–1973 (tier 1) | **`19630100`** — Jan 1963, UH studio | 10 yr → 1 month |
| `Saharan uni I & II` | range 1963–1973 | **`19670000`** — 1967, "first music system" | 10 yr → 1 year |
| `Oigu-S` | range 1963–1973 | **`19640300`** — March 1964 | 10 yr → 1 month |
| `Inventio / Outventio` | range 1963–1973 | **`19701000`** — Oct 1970, **DIMI-A** | 10 yr → 1 month |
| `Katkelmia äänikirjeestä Jan Barkille` | filename-year 1963 | **`19630800`** — Aug 1963 | year → month |
| `Antropoidien tanssi` | filename-year 1968 | **`19680800`** — Aug 1968, Vironkatu, **Andromatic** | year → month |
| `Kaukana väijyy ystäviä` | range 1963–1973 | **`19680728`** + 8 more performances | 10 yr → **one day** |

It also attaches an **instrument** and a **venue** to each, which the corpus
has no way to express today, and for `Inventio` it points at Zenodo 1469722 —
a video of the DIMI-A playing the piece whose audio we already stream from
archive.org.

---

### 1.2 Finnish National Gallery — the archive IS in the API ✅

**The August conclusion ("the open API serves the *artwork* collection only")
was wrong, and this is the correction.**

`GET https://kokoelma.kansallisgalleria.fi/api/v1/objects` — no auth,
documented, and it is a **bulk dump, not a query endpoint**: `?limit=2` is
**ignored** and returns the whole set ✅. Measured today:
**29 320 352 bytes gzip → 274 756 954 bytes JSON → 89 072 records.** Send
`Accept-Encoding: gzip`. **No `access-control-allow-origin`** ✅ — a browser
cannot fetch it directly; `workers/shout` or a build-time ingest is required.

The spec (`https://kokoelma.kansallisgalleria.fi/docs/swagger.json` ✅) lists
exactly two endpoints:

- `GET /api/v1/objects` — `security: []`, "Authentication is not required",
  "All images are under CC0 license", and a warning that matches what we
  measured: *"objects children and parents can contain ids to other objects
  that are not available."*
- `POST /api/v1/search` — requires an `x-api-key` header.

A per-object `GET /api/v1/objects/{id}` is **not** an endpoint: `278`, `101`
and `6092302` all answer `403 {"message":"Missing Authentication Token"}` ✅.

**30 records mention Kurenniemi** ✅, 11 of them in
`Kansallisgalleria / Arkistokokoelmat` — the Central Art Archives:

| objectId | category | years | inventory | title |
|---|---|---|---|---|
| **101** | **private archive** | **1962–2005** | `THAA106` | **Erkki Kurenniemi Archive I** — 22.65 m, acquired 2006 |
| **5690185** | **private archive** | **1894–2003** | `KG-ARK-THAA106` | **Erkki Kurenniemi Archive II** — 5.54 m, acquired 2006 |
| **6092302** | series | 1962–2005 | `KG-ARK-THAA106-S-11` | **AV materials of the Erkki Kurenniemi Archive** |
| 382248 | artwork | 1972– | `N-2007-21` | **Dimi-S** |
| 646207 | artwork | 1971– | `V-2014-93` | **Dimi-O** |
| 613914…622920 | artwork | 1963–1971 | `N-2003-36:1…14` | the **14 1960s short films**, individually inventoried |
| 396372 | artwork | 1982–2008 | `N-2009-1` | Master Chaynjis |
| 93452, 94372, 94535, 94653, 94766, 94769, 94947, 3372997 | av-material | 2000–2016 | `KG-ARK-AV-*` | Kurenniemi-related concerts, seminars, demos, book launch |

Record 101 carries a real finding-aid payload: `category: private archive`,
`acquisitionYear: 2006`, `yearFrom/yearTo`, `dimensions: [{unit:"m",
measurements:[22.65]}]` (shelf metres), a person with role
`arkistonmuodostaja` (records creator) and birth/death **dates with places
resolved to YSO ids**, and 11 keywords in fi/sv/en — `diaries`, `photos`,
`notes`, `press cutting`, `electroacoustic music`, `computers`.

**Date precision is honest here** ✅. Across the 6370 Arkistokokoelmat records,
2779 carry a `dateFrom`; **0 of them sit on `07-15`** (ERR's midpoint tell) and
only **3 on `01-01`**. Where a day is given it is a real day.

**Two hard limits, both measured:**

- **The hierarchy dangles.** Archive I lists 12 children, Archive II lists 8.
  **None of those child ids exist in the dump** — a full traversal from both
  fonds returns 2 records, the roots themselves. The item-level finding aid is
  behind the API key. (The HTML object pages *do* render — e.g.
  `https://kokoelma.kansallisgalleria.fi/en/object/6092302` → 200, title
  *"AV materials of the Erkki Kurenniemi Archive"* ✅ — so it is scrapeable.)
- **No images on any Kurenniemi record.** 36 442 of 89 072 records carry a
  `multimedia` array; **0 of the 30 Kurenniemi ones do** ✅. `/media-assets/`
  serves `200` with **no ACAO** ✅ — fine as `<img>`, taints canvas.

---

### 1.3 `vandal.ist/kurenniemi/` — the Constant archive is back ✅

August recorded `kurenniemi.activearchives.org` as *"host does not resolve —
gone"*. It resolves now and **301-redirects to `https://vandal.ist/kurenniemi/`** ✅.
It is a static mirror of the dOCUMENTA (13) / KURATOR prototype built by
Constant with the Central Art Archive.

**Harvested complete today**: 200 index pages, **0 pages failed**, **3986
records** (199 × 20 + 6) ✅ — which matches the `3986 total` in the mirror's own
commented-out pagination line.

Each record is one file from Kurenniemi's photo archive with: an **EXIF/mtime
timestamp to the second**, a filename, an archive path, a MIME type, dominant
RGB/HSV, and flags for faces, contours and thumbnails. Derived images
(`colors/colors_NNNN.jpg`, `contours/contours_NNNN.jpg`) are served ✅. **The
original photographs are not in the mirror.**

Measured shape of the trace ✅:

- **1170 of 3986 (29.4%) carry `0000-00-00 00:00:00`** — an explicit unknown
  sentinel. Not a padded guess, not a silent drop. This is the honest-null form
  the corpus's `precision` field exists to carry.
- 2816 dated, **2001-05 → 2009-02** (plus one 1904 EXIF artefact), peaking at
  1023 files in 2003.
- **Median gap between consecutive files: 15.0 s**; p90 141.7 min. 323
  timestamps are shared by more than one file. The trace is burst-shaped —
  a person shooting, not a clock ticking.
- 94 distinct archive paths (`kuvia/Lorinaa` 229, `kuvia/people_pict/EK` 163,
  `kuvia/Venetsia2003` 130, …). MIME: 1917 JPEG, 2 TIFF, 1 PSD in the sample
  that parsed mime.

**No ACAO** ✅, static HTML, no JSON. Its `Data Radio` link **404s** on the
mirror ✅ and its `Code` link points at `gitorious.org`, which has not existed
since 2015. Licence: **unstated anywhere on the site** ✅.

---

### 1.4 Wikimedia Commons — five dated portraits with the best CORS posture found ✅

`https://commons.wikimedia.org/w/api.php?…&origin=*` → `ACAO: *` ✅ (the
`origin=*` parameter is required; without it there is no ACAO header at all).
11 file-namespace hits for "Kurenniemi", **5 of them him**:

| file | date as given | declared precision | licence | photographer |
|---|---|---|---|---|
| `Erkki-Kurenniemi-1965.jpg` | "Taken on 23 March 1965" | **day** | Public domain | Holger Eklund |
| `Erkki-Kurenniemi-1965b.jpg` | "Taken on 23 March 1965" | **day** | Public domain | Holger Eklund |
| `Ruohomaki-Kurenniemi-1971.jpg` | `January 1971 … +1971-01-00T00:00:00Z/10` | **10 = month** | Public domain | Matti Saves / Helsingin Sanomat |
| `Kurenniemi-Portman-1972.jpg` | `October 1972 … +1972-10-00T00:00:00Z/10` | **10 = month** | Public domain | Unto Järvinen / Helsingin Sanomat |
| `ErkkiKurenniemi.jpg` | `circa 1962 … +1962-00-00T00:00:00Z/9` | **9 = year**, `Q5727902` = *circa* | Public domain | unknown |

The `extmetadata` date field carries a **literal Wikidata QuickStatements
qualifier** (`QS:P571,+1971-01-00T00:00:00Z/10`), i.e. the same integer
precision ladder `ingest.mjs` already decodes in `fromWikidataTime()`. One of
them even declares *circa* as a distinct sourcing circumstance (`Q5727902`),
which is a stronger statement than any precision integer.

**`upload.wikimedia.org` is the only media host measured today that gives us
everything** ✅: `206`, `access-control-allow-origin: *`, **and**
`access-control-expose-headers: Age, Date, Content-Length, Content-Range,
X-Content-Duration, X-Cache` — so JS can read `Content-Range`, which
archive.org still refuses.

---

### 1.5 MusicBrainz — the canonical tracklist ✅

`https://musicbrainz.org/ws/2/…&fmt=json` — `ACAO: *` ✅, CC0 data, **a real
User-Agent is required** (a generic one got `503`; two retries with backoff
succeeded — MusicBrainz also returns a plain `{"error":"…server is currently
busy…"}` under load, which is a 503 body, not a rate-limit signal).

5 releases. The one that matters: **`Äänityksiä / Recordings 1963-1973`**,
`358bd25a-3b0e-4455-b5a3-67d97d2a6be4`, **Love Records LXCD 637, 2002, 11
tracks** with canonical titles and durations ✅.

Diffing it against our 12 archive.org MP3s is immediately useful:

- **4 album tracks we do not have**: `Hana`, `Improvisaatio`, `Preludi`,
  `Nimetön`.
- **5 files we have that are not on the album**: `Saharan uni I`, `Saharan uni
  II`, `Oigu-S`, `Kaukana väijyy ystäviä`, `Katkelmia äänikirjeestä Jan
  Barkille` — so the uploader's "Audio Works" item is a mix of the compilation
  and other sources, which our `corpusRange` justification silently assumed
  away.
- Our two near-identical `Sähkösoittimen ääniä` files are album tracks **#4 and
  #1**, not duplicates.

Other releases: `Rules` (2012), `Rakkaus tulessa` (2011-08-11, with Circle),
`Sähkö-shokki-ilta` (2013). **No per-recording dates** — MusicBrainz reports
`first-release-date: 2002` for all 11, so it fixes *identity*, not *when*.
Discogs (`api.discogs.com`, `ACAO: *` ✅) covers the same ground.

---

### 1.6 National Library of Finland — metadata free, pages gated ✅

`POST https://digi.kansalliskirjasto.fi/rest/binding-search/search/binding?offset=0&count=100`
with a JSON body. No key ✅. **No ACAO** ✅ → relay required.

Measured today: **1279 hits** for `Kurenniemi` in newspapers+journals
1960–1979 ✅. And the decisive measurement:

- `includeUnauthorizedResults: true` → 1010 hits for
  `Kurenniemi sähkökvartetti` (1960–1975)
- `includeUnauthorizedResults: false` → **0** ✅

**Every single 1960s–70s hit is `authorized: false`.** Free access at digi
stops before this material; the page images and OCR are legal-deposit-terminal
only. What *is* free is the row: `date`, `bindingTitle` (Helsingin Sanomat,
Ilta-Sanomat, Hufvudstadsbladet, Nya Pressen, Apu, Tekniikan maailma, Stump…),
`publicationId`, `pageNumber`, `textHighlights`, `terms`, `url`,
`thumbnailUrl`.

It carries **a fourth declared-precision convention**, a single letter:
`dateAccuracy: "p"` (päivä, day) or `"k"` (kuukausi, month) ✅. The `k` rows
are **start-padded to day 01** (`1968-09-01`, `1972-11-01`), which is exactly
the shape that would be indistinguishable from an attested 1 September — the
flag is the only thing that saves it.

So: a **dated press timeline of ~1300 mentions, 1960–1979, with per-row
declared accuracy, free** — and **no readable page behind any of them**.

---

### 1.7 AV-arkki — REST is open, the catalogue is not ✅

`https://www.av-arkki.fi/wp-json/` → `200`, and it **echoes the request
Origin**: `access-control-allow-origin: https://positron.studio`,
`access-control-expose-headers: X-WP-Total, X-WP-TotalPages, Link` ✅. So it is
genuinely browser-fetchable — correcting August's "no JSON API found".

But `wp/v2/types` lists only `post`, `page`, `attachment` and scaffolding ✅.
The `works` and `artists` custom post types **404 on REST** ✅ — they are
registered with `show_in_rest: false`. `wp/v2/search?search=Kurenniemi` returns
**25 hits**, all news posts and one catalogue page ✅.

The distribution record for the Taanila documentary is
`https://www.av-arkki.fi/works/tulevaisuus-ei-ole-entisensa/` (2002, 52 min,
35 mm) ✅ — HTML only, with a **Vimeo embed (`803484725`)** that is a preview.
Rights: licensed per screening. **This is a request-form source, not an API
source.**

---

### 1.8 archive.org — essentially exhausted ✅

`advancedsearch.php?q=Kurenniemi&rows=100` → **`numFound: 15`** ✅, of which
4 are Kurenniemi items:

| identifier | media | status |
|---|---|---|
| `videoplayback-13_202304` *Erkki Kurenniemi Audio Works* | 12 MP3 | **already ingested** |
| `computer-music-1966-dir.-erkki-kurenniemi` | 1 MP4 | **already ingested** |
| `videoplayback-14_202304` *Erkki Kurenniemi Collection* | 4 MP3 + 4 MP4 | **not ingested** — all 4 MP3s duplicate `-13`; the MP4s are the untitled `videoplayback (11..14).mp4` rips `ingest.mjs:218` deliberately skips ("no evidence at all") |
| `videoplayback_20221202_1653` *Antropoidien Tanssi* | 1 MP4 | not ingested — a video of a track we already have |
| `20210908_20210908_1925` *The Future Is Not What It Used to be* | — | **rights-closed**, a Yle rip, correctly excluded |

All four carry `licenseurl: publicdomain/mark/1.0` self-asserted by the same
uploader (`4033675@opsb.info`), including on the 1968 Love Records release —
the provably-wrong assertion the August report used to justify
`rightsAsserter`. Nothing here changes that verdict. **There is no more
Kurenniemi audio on archive.org than we already stream.**

---

### 1.9 Still blocked, re-measured today

| source | measured | note |
|---|---|---|
| **Finna.fi** | `403`, `cf-mitigated: challenge`, `server: cloudflare` ✅ | Unchanged from August. Still the single highest-value unblock: it is the front door to Musiikkiarkisto, Elonet, the Finnish Museum of Photography and the rest. |
| **elonet.finna.fi** | `403` ✅ | Same edge. |
| **elonet.fi** | `403` ✅ | Same edge. |
| **data.nationallibrary.fi** | `403` ✅ | Not investigated further. |
| **Yle `external.api.yle.fi`** | `403` without `app_id`/`app_key` ✅ | 📄 Keys are free but require a Yle Tunnus registration. |
| **Yle Elävä arkisto** | pages load `200` ✅ | Real Kurenniemi material exists — `yle.fi/a/20-89298` (*Erkki Kurenniemi, digitaalisten näkyjen näkijä*), `yle.fi/a/20-89300` (*M. A. Nummisen Sähkökvartetti*, incl. the 40 s **Sähkökvartetti Bulgariassa 30.09.1968** clip), `yle.fi/a/20-89301`, `yle.fi/a/20-130968`. Media is served through Areena ids (`1-3253227`, `1-71193336`, `1-71193342`) ⚠️ geo-locked to Finland and not fetchable without the key. |
| **Musiikkiarkisto** | site `200` ✅, but 📄 its catalogue is searchable *only through Finna* | 📄 ~60 TB digital, 450+ personal archives. Unreachable from here in practice. |
| **`lahteilla.fi`** (FNG's own Kurenniemi site) | **DNS SERVFAIL** ✅ | Dead. Wayback holds **13 182 unique URLs** of the site, **545 under `/kurenniemi/`, 475 with a `200` capture**, spanning 2013-11 → 2024-10; whole site last captured **2026-02-12** ✅. Wayback replay has **no ACAO** ✅. This was the institution's public presentation of the archive — thematic, by decade, keyword-searchable — and it is now only in a third party's cache. |
| **Books** | — | *Writing and Unwriting (Media) Art History: Erkki Kurenniemi in 2048* (Krysa & Parikka, MIT Press 2015) and *Relive: Media Art Histories* (Cubitt & Thomas, MIT Press 2013 — **not** Amsterdam University Press) are both paywalled; ⚠️ no open-access chapter found. Ojanen's PhD covers much of the same ground and **is** open on Zenodo (4306056). |
| **DIMI emulations** | — | ⚠️ **None found.** No open-source emulator, no VCV module, no circuit repo. The nearest thing to machine-readable hardware documentation is Zenodo 5798032 (Sähkökvartetti wiring PDF) and 3596466 (37-file UI/functionality chart set). One GitHub repo named `Kurenniemi` exists (`pesinasiller/Kurenniemi`, JavaScript, 1.4 MB, last push 2023-10) ✅ — unrelated content, no licence. |

---

## 2. What changed since 2026-08-28

Three of that report's conclusions are now wrong and should not be quoted:

1. *"the FNG open API serves the artwork collection only"* — **false.** The
   archive collection (`Arkistokokoelmat`, 6370 records) is in the same open
   dump, including both Kurenniemi fonds with shelf metres and date ranges.
2. *"`kurenniemi.activearchives.org` — host does not resolve — the archive
   interface is gone"* — **it moved** to `vandal.ist/kurenniemi/` and is
   complete.
3. *"AV-arkki — no JSON API found"* — there is one, with permissive CORS; it
   just does not expose the work catalogue.

One thing got worse: `lahteilla.fi` died between February and now.

---

## 3. Ranked shortlist — what to build against, and what it unlocks

### 1. Zenodo, and specifically the `Appearances` CSV (id 5678270)

**Build this first.** It is the only source found that changes what a page can
*say*, not just what it can *show*.

Today `proto/aikajana/` renders nine tapes as nine identical hatched bars
spanning 1963–1973 — honest, and useless as a position. With this CSV, six of
them move to month or day precision from a **named human source with a
declared convention and a CC-BY licence**, and each gains an **instrument** and
a **venue**. `Kaukana väijyy ystäviä` goes from a ten-year band to
**28 July 1968**.

It also gives the corpus its first **derived-vs-attested contrast that is worth
drawing**: the same tape can now carry the archive.org filename-year *and* the
Ojanen date, disagreeing or agreeing, with both asserters named — which is
exactly the tratteggio view §5b describes and which the current corpus cannot
demonstrate because it only ever has one date per item.

Machine cost: near zero. `ACAO: *`, 57 KB, no key, CC-BY, one `fetch`.
Add a fifth `dateEvidence.how`: `ojanen-zenodo-yyyymmdd-zerofill`.

Second-order: Zenodo 1469722 is a **432 MB video of the DIMI-A playing
`Inventio`**, Range-fetchable cross-origin, alongside our archive.org MP3 of
the same work — two lanes, two media, one moment, from two institutions. That
is the strongest concrete demo in the whole survey.

### 2. Finnish National Gallery `/api/v1/objects`

**Build this second.** It is the only institutional custody record we can get
at all, and it answers the question the corpus currently cannot: *where does
this actually live, and how much of it is there?* `Erkki Kurenniemi Archive I`
— 22.65 shelf metres, 1962–2005, acquired 2006, records creator role declared
— is a `record`-kind item with **HIGH** rights confidence asserted by the
holding institution, against a corpus where 13 of 22 items are LOW.

It also supplies institutional inventory numbers for the 14 short films that
currently exist in our corpus only as Wikidata Q-ids, and puts **DIMI-S** and
**DIMI-O** beside the Europeana **DIMI-A** — three surviving instruments in
three institutions, which is a page in itself.

Machine cost: **29 MB gzip, no ACAO**. That means a build-time ingest (fine —
`ingest.mjs` already runs offline) or `workers/shout`. The dangling child ids
are a known, documented limit: the fonds-level record is all we get without an
`x-api-key`, and asking for one is a single email.

### 3. Wikimedia Commons

**Cheap, and it fixes a real hole.** The corpus has no photograph of the man at
all. Five exist, all Public Domain, two day-precise to 23 March 1965, and they
arrive through the **only media host measured today that serves `ACAO: *`
*with* `access-control-expose-headers: Content-Range`** — so unlike
archive.org they can be Range-read from JavaScript. Their dates come through
the same QuickStatements precision ladder `ingest.mjs` already parses, and one
declares *circa* explicitly, which is a sourcing-circumstance the corpus has
never had to represent.

### Honourable mention, not yet

**The National Library press search.** ~1300 dated mentions 1960–1979 with
per-row declared accuracy would be the densest spine in the corpus — but
**every one is `authorized: false`**, so the page behind the citation cannot be
shown. That is a legitimate kind of item (attested existence, no reproducible
content) and might be the honest way to render "the archive knows this happened
and will not let you read it". Cost: a relay hop, plus the design decision.

**`vandal.ist`.** 3986 timestamps with a 29.4% explicit-unknown rate and a
15-second median gap is a beautiful trace and a bad corpus: the pixels are not
there, the licence is unstated, and it is one person's unmaintained mirror of a
2012 prototype. Worth **archiving locally now** before it goes the way of
`lahteilla.fi`, and worth studying as a precision case study. Not worth
shipping against.

---

## 4. Not verified, and why

- **Yle's actual media.** `external.api.yle.fi` needs a registered
  `app_id`/`app_key`; the Elävä arkisto pages load but their Areena media is
  Finland-geo-locked and this host is not in Finland. So the four Kurenniemi
  Elävä arkisto articles are confirmed to exist, and **nothing about their
  playability was measured**.
- **Finna, Elonet, Musiikkiarkisto, the Finnish Museum of Photography.** All
  behind the same Cloudflare managed challenge, re-measured `403` today.
  Nothing downstream of it could be checked — including whether the Music
  Archive holds Kurenniemi material at all.
- **Whether the FNG child records contain item-level detail.** They 403 on the
  API and render as HTML pages; the HTML was confirmed to load (`200`, correct
  `<title>`) but **was not parsed**, so what a scrape would actually yield is
  unknown.
- **Whether Zenodo's `application/octet-stream` video plays in a `<video>`
  element.** Range + CORS were measured; playback was not. The `.mpg` almost
  certainly does not.
- **`vandal.ist` licence and provenance.** Nothing on the site states either.
  Who runs it, and under what permission from the FNG, is unknown.
- **Bandcamp.** `erkki-kurenniemi.bandcamp.com` returns `200`; the album path
  found in search results `404`s and the page is JS-rendered, so the catalogue
  there was **not** enumerated.
- **The `EKIS UI charts` (37 files) and the DEF CSV (30 rows)** were downloaded
  and their headers read, but their content was not analysed against the
  corpus.

---

Final section, merged from `research/kurenniemi-audio-hunt-2026-09.md` on 2026-10-14. Its title, status line and body follow unchanged.

# Kurenniemi audio: why 24 of 334 play, what else is out there, and where it should go

Status (2026-10-14): partly done. demo/resources/build-corpus.mjs names kurenniemi.activearchives.org, but demo/resources/corpus.json holds no .ogg file, so the 23 Ogg recordings it found are not in what /tapes/ plays.

**2026-09-15.** Every claim below is labelled **READ** (taken from a file or a
page), **MEASURED** (a request I made, with the time it was made) or
**INFERRED** (reasoned, not observed). Candidates nobody probed are in §5, under
a heading that says so.

The page under discussion is <https://positron.studio/tapes/>. The corpus it
reads is <https://positron.studio/resources/corpus.json>.

---

## The three answers in one place

1. **The 310 that do not play are almost entirely records with no file.** 199 of
   334 rows point at a thing and carry no URL for it, and 80 more carry a URL
   that is a photograph or a PDF. **Not one audio file in the corpus is blocked
   by CORS, and not one is blocked by a codec.** Both of the fixes that sounded
   likely turn out to fix nothing, because there is nothing in those buckets.
2. **There is more Kurenniemi audio, and it is not on archive.org.** It is 23
   Ogg Vorbis files on `kurenniemi.activearchives.org`, **3 h 27 m of them**,
   against the 2 h 22 m the page plays today. Five of them are cut straight from
   the numbered cassettes of his spoken audio diary. MEASURED today. Archive.org
   is exhausted, exactly as `research/kurenniemi-sources-2026-09.md` already
   said.
3. **A proxy, not a copy.** Those 23 files are served over plain HTTP with no
   TLS and no CORS, which is the `radio` case `workers/shout` already exists
   to solve. A proxy is technically sufficient and nothing needs storing. It is
   also the smaller act to take against material whose terms nobody has stated,
   and nobody has stated terms for these.

---

## 1. Why only 24 of 334 records play

### 1.1 The gate, read off the page

**READ**, `demo/tapes/index.html` lines 96 to 126. A record plays when all three
are true:

```
stateOf(it) === 'open'          // it.file is set AND it.cors is true
                                //   AND it.http is not 403 and not a DNS error
PLAYS.test(it.file)             // /\.(mp3|m4a|mp4|webm|ogg|opus|wav|aac)(\?|#|$)/i
probeEl.canPlayType(it.fileType)   // truthy
```

Two of those are deliberate distrust of the corpus and the comment in the file
explains why: `fileType` is the content type the **host** sent, and the
extension is checked separately because archive.org serves an `.avi` as
`video/mp4`.

### 1.2 The breakdown

**MEASURED 2026-09-15T13:05Z**, by running that same gate over all 334 rows in
Node, in the order the page applies it. Every row falls in exactly one line.

| stopped at | count | what these actually are |
|---|---:|---|
| **plays** | **24** | all archive.org, from 4 items |
| marked gone by an earlier probe (`http` 403 or a DNS failure) | 6 | Finna x2, Yle API, MIT Press, the National Gallery's unpublished series, the dead `lahteilla.fi` root |
| **no `file` at all** | **199** | a pointer to a holding, never a URL for bytes |
| has a file, `cors: false` | 80 | 64 JPEG and 16 PDF, every one of them `lahteilla.fi` through the Wayback Machine |
| has a file and CORS, extension is not audio | 25 | 19 Zenodo, 5 Wikimedia JPEG, 1 archive.org `.avi` |
| **audio extension but `cors: false`** | **0** | |
| **audio extension and CORS, but the browser refuses the type** | **0** | |
| total | 334 | |

**The last two rows are the finding.** The two repairs anyone would reach for
first, a CORS proxy and a transcode, would move **zero** records between
columns, because no audio file in this corpus is sitting in either bucket.

### 1.3 The 199 with no file, by what they are

**MEASURED 2026-09-15T13:22Z**, counting `kind` over the 199.

| kind | n | | kind | n |
|---|---:|---|---|---:|
| text | 67 | | collection | 9 |
| release | 34 | | article | 4 |
| work | 28 | | instrument | 3 |
| image | 27 | | life, data | 2 each |
| recording | 11 | | audio, film, event | 1 each |
| video | 9 | | | |

**56 of the 199 are sound or moving image by kind** and none of them carries a
file. By source: Crossref 30, Discogs 29, the National Gallery 30, MusicBrainz
18, OpenAlex 13, Wikidata 12, `lahteilla.fi` 48, the National Library 5, Zenodo
5, Yle 4, vandal.ist 3, Europeana 1, AV-arkki 1.

**INFERRED.** Most of these have no fix at all, and that is the honest answer
for them. A Crossref row is a book chapter. A Discogs row is a pressing. A
National Gallery row is a custody record for an object in a box in Helsinki.
"No file" is a correct statement about the world, not a defect in the corpus.

### 1.4 One real defect, and it costs a browser-playable video

**MEASURED 2026-09-15T13:11Z.** 13 rows have `file: null` **and** `count > 1`.
The corpus builder records a file only when a record holds exactly one, so every
multi-file record loses its media.

Five of the 13 are Zenodo, and one of those five is
`zenodo:1469722`, *"Arrangement of J.S. Bach's Invention No. 13 in A minor
(BWV784) for the DIMI-A synthesizer by Erkki Kurenniemi (1970): An annotated
video of the master tape"*. It holds 9 files, and one of them is
`20181023 Inventio analysis v2.mp4`.

**MEASURED 2026-09-15T13:12Z** with `ffprobe` against the live URL:

```
h264 Main 1920x1080 + aac LC 48000 Hz stereo
duration 113.20 s   size 431 949 041 bytes   bit_rate 30 526 433
```

So it is a browser codec pair, and the corpus has it as a record with no file.
The other four multi-file Zenodo rows are photographs, charts, a CSV and a
contract scan.

⚠️ **Fixing the builder is not enough to make that video play**, and this is
worth writing down because it looks like a one-line fix. **MEASURED
2026-09-15T13:11Z and 13:19Z**, every Zenodo file URL answers
`content-type: application/octet-stream`, on all three URL forms
(`/api/records/<id>/files/<name>/content`, `/records/<id>/files/<name>`, and the
same with `?download=1`). And **MEASURED 2026-09-15T13:18Z** in headless Chrome
152, `canPlayType('application/octet-stream')` returns `""`. The `/content` form
also puts `.mp4` in the middle of the path, so it fails the extension test too.
Two of the three gates refuse it.

### 1.5 What `canPlayType` actually answers here

**MEASURED 2026-09-15T13:18Z**, headless Chrome 152 on this machine, driven over
CDP, `new Audio().canPlayType(t)` for every `fileType` in the corpus plus the
types found during this hunt:

| type | answer |
|---|---|
| `audio/mpeg` | `"probably"` |
| `video/mp4` | `"maybe"` |
| `audio/ogg` | `"maybe"` |
| `application/octet-stream` | `""` |
| `video/mpeg` | `""` |
| `video/x-msvideo` | `""` |
| `image/jpeg`, `application/pdf`, `text/csv`, `""` | `""` |

The 24 that play are 16 `audio/mpeg` and 8 `video/mp4`. That is the whole of it.

⚠️ **`audio/ogg` passing in Chrome does not mean it passes everywhere**, and
this matters for §2. **INFERRED, NOT MEASURED**: WebKit's Ogg support is not the
same as Chrome's, and CLAUDE.md is explicit that a green desktop suite can mean
zero coverage on the iPhone path. Before any Ogg file is put on `/tapes/`,
`node demo/verify-safari.mjs` and `node demo/verify-native.mjs` have to say so.
I did not run them.

### 1.6 Six of the 24 are the same bytes twice

**MEASURED 2026-09-15T13:22Z**, grouping the 24 by `bytes`. Six pairs share a
byte count exactly, because `videoplayback-13_202304` and
`videoplayback-14_202304` are two uploads of an overlapping set: `On-Off.mp3`,
both spellings of `Sähkösoittimen ääniä`, `Antropoidien tanssi`, and the
untitled `videoplayback (11).mp4` and `(13).mp4`.

**24 rows, 18 distinct files.** Total playing time of the 24 as the corpus
schedules them is **8 541 s (2 h 22 m)**, of which 2 761 s is the duplicate half
of those six pairs.

---

## 2. Is there more Kurenniemi audio out there

### 2.1 archive.org is exhausted, confirmed rather than assumed

**MEASURED 2026-09-15T13:07Z to 13:11Z.**

- `advancedsearch.php?q=kurenniemi&rows=200` returns **16 items**. Five are
  Kurenniemi holdings, and the corpus already has all five:
  `videoplayback-13_202304`, `videoplayback-14_202304`,
  `computer-music-1966-dir.-erkki-kurenniemi`, `videoplayback_20221202_1653`,
  `20210908_20210908_1925`. The other eleven are podcasts, DJ mixes and two
  books that mention the name.
- `q=creator:(kurenniemi)` returns **6**, a subset of the same.
- `q=DIMI AND Kurenniemi` returns 1, already held. `q=Sähkökvartetti` returns
  **0**. `q=Vihreä eläin` returns **0**. `q="M.A. Numminen"` returns 1, a
  scanned 1969 magazine.
- `https://archive.org/metadata/<id>` for all five, full file lists read. **One
  file in the five items is not in the corpus**, and it is treated below.

This agrees with `research/kurenniemi-sources-2026-09.md` §1.8, which already
said so. Nothing changed.

### 2.2 The one archive.org file the corpus missed, and why it should stay missed

**MEASURED 2026-09-15T13:10Z.** Item `20210908_20210908_1925` holds two files.
The corpus recorded the 990 MB `.avi`. Beside it sits an archive.org derivative:

```
YLE.Time.and.Matter.4of5.The.Future.Is.Not.What.It.Used.To.Be.mp4
h.264   315 674 117 bytes   3 148.92 s (52 m 29 s)
206 on a Range, content-type video/mp4
```

That would be, on its own, **more tape than the entire current page**.

🔴 **It is Mika Taanila's 2002 film ripped off Yle television and it must not be
used.** **MEASURED 2026-09-15T13:10Z**: the item has **no `licenseurl` at all**,
its uploader is `alexjames91@hotmail.co.uk`, and the filename is a television
broadcast slug. `research/kurenniemi-archive-2026-08.md` already ruled it out in
those words. AV-arkki distributes the film and licenses it per screening. This
paragraph exists so the file is not "discovered" again by whoever next reads the
item metadata.

### 2.3 What the licence on the other four archive.org items is worth

**MEASURED 2026-09-15T13:09Z.** All four Kurenniemi items carry
`licenseurl: https://creativecommons.org/publicdomain/mark/1.0/` and all four
were uploaded by the same account, `4033675@opsb.info`. Querying that uploader
returns **39 items**. Among them: `Venetian Snares- Detrimentalist`,
`Venetian Snares- Traditional Synthesizer Music`,
`Venetian Snares-Chocolate Wheelchair Album`, `Merzbow- Pulse Demon (Full
Album)`, `Breaking Bad Jr.`, and a dozen YouTube rips whose filenames are
literally `videoplayback`.

**INFERRED, and the inference is not a close call.** A Public Domain Mark
applied by that account to a 1968 Love Records release is a field somebody typed,
not a right somebody holds. The whole of `/tapes/` currently rests on it. That
is a fact about the page's footing, not an argument to take it down.

### 2.4 Zenodo: 33 records, 2 videos, no audio

**MEASURED 2026-09-15T13:11Z and 13:13Z.** `q=kurenniemi` returns **28**
records; the community query
`communities=electronic-musical-instruments-by-kurenniemi` returns **33**.
`research/ojanen-ekis-notes.md` §6.1 flagged that gap and left the extra records
unenumerated. They are enumerated now:

| id | what | files |
|---|---|---|
| `2092578` | List of Analysed Works and Events | 3 (xlsx, csv) |
| `3765248` | Perspectives '18 programme and poster | 2 (pdf, jpg) |
| `3600460` | Integrated Synthesizer generator unit manual | 1 pdf |
| `3591336` | **Preliminary metadata for the UHMRL digital tape archive pilot** | 1 csv |
| `2615161` | Kaksi kanaa (1963) soundtrack comparison | 1 pdf |
| `2528175` | Templates for research data agreements | 3 docx |
| `4289359` | An interview with Andrew Bentley | **0 files** |
| `4289354` | An interview with Ralph Lundsten | **0 files** |
| `4271168` | An interview with Leo Nilsson | **0 files** |
| `3886432` | The Scrapbook of Osmo Lindeman | **0 files** |

**No audio anywhere in the community.** Three of the four zero-file records are
interviews, which is exactly what Ojanen said he would do: **READ**,
`research/ojanen-ekis-notes.md` quoting the thesis p. 17, he keeps sensitive
material closed and opens only the metadata. The Zenodo community is the
demonstration of that policy, not a gap in it.

`3591336` is worth naming: it is the inventory of the UHMRL tape digitisation
pilot. It is a CSV of what exists, not the tapes.

The two Zenodo videos are `1469722` (treated in §1.4) and `5801697`,
`DICO chromatic scale II.mpg`, 225 705 984 bytes, `video/mpeg`, which Chrome
refuses (§1.5).

### 2.5 The find: 23 Ogg files on the Constant archive, live today

🔴 **This is the whole of the new material, and the corpus says the page it
comes from is dead.**

**READ**, `demo/resources/corpus.json`, row `aa:audio-diaries`:

> *"The mirror does not carry this page, vandal.ist answers 404 for it, so the
> only copy is the Internet Archive"*

**MEASURED 2026-09-15T13:12Z: the ORIGINAL host is alive.**
`http://kurenniemi.activearchives.org/` answers **200**, nginx 1.18.0. The
corpus is right that `vandal.ist` 404s the Dataradio pages and right that the
live host was thought gone. It is not gone. It never stopped serving; the
redirect to `vandal.ist` that `research/kurenniemi-sources-2026-09.md` §1.3
recorded applies to the site index, not to these subtrees.

**MEASURED 2026-09-15T13:14Z**, Wayback CDX over `kurenniemi.activearchives.org*`
gave 219 captured URLs including **6 of mimetype `audio/ogg`**. Crawling the live
host from `/`, `/kiasma/`, `/spectrum/` and `/dataradio/` found **21**, and the
two sets together are **23 distinct files**.

**MEASURED 2026-09-15T13:17Z and 13:18Z**, each probed with
`Origin: https://positron.studio` and `Range: bytes=0-1`, then `ffprobe`'d over
the wire for codec and duration. Every one of the 23: **`206 Partial Content`,
`Content-Type: audio/ogg`, Vorbis, Range honoured, and NO
`access-control-allow-origin`.**

| path on `kurenniemi.activearchives.org` | bytes | seconds | rate, ch |
|---|---:|---:|---|
| `/spectrum/C4004.spso.ogg` | 138 182 713 | **5 619.0** | 44.1k mono |
| `/kiasma/samples/gradual_average_part_1.ogg` | 77 888 928 | 1 770.0 | 44.1k st |
| `/kiasma/samples/doaf_Lorinaa.ogg` | 4 974 151 | 958.1 | 16k st |
| `/kiasma/samples/asc.ogg` | 7 996 421 | 600.0 | 44.1k st |
| `/kiasma/samples/C4005_s62_e72_len10.ogg` | 8 041 843 | 600.0 | 44.1k st |
| `/kiasma/samples/desc.ogg` | 6 931 778 | 544.9 | 44.1k st |
| `/kiasma/samples/C4019-1_s01_e10_len09.ogg` | 6 728 418 | 540.0 | 44.1k st |
| `/kiasma/samples/C4018-1_s05_e11_len06.ogg` | 4 322 704 | 360.0 | 44.1k st |
| `/kiasma/samples/C4054_s47_e53_len06.ogg` | 4 792 212 | 360.0 | 44.1k st |
| `/kiasma/samples/audiogrep_newton.ogg` | 2 583 650 | 252.0 | 16k st |
| `/spectrum/associative.spso.ogg` | 3 209 067 | 238.0 | 44.1k mono |
| `/kiasma/samples/audiogrep_sleep.ogg` | 489 170 | 106.0 | 16k mono |
| `/kiasma/samples/doaf_venetsia.ogg` | 351 842 | 70.6 | 16k st |
| `/kiasma/samples/C4026-2_s18_e19_len01.ogg` | 764 431 | 60.0 | 44.1k st |
| `/kiasma/samples/240x60_seconds.ogg` | 810 882 | 60.0 | 44.1k st |
| `/kiasma/samples/300x60_seconds.ogg` | 814 484 | 60.0 | 44.1k st |
| `/kiasma/samples/480x60_seconds.ogg` | 820 137 | 60.0 | 44.1k st |
| `/kiasma/samples/50x60_seconds.ogg` | 691 702 | 51.0 | 44.1k st |
| `/kiasma/samples/100x60_seconds.ogg` | 667 300 | 50.0 | 44.1k st |
| `/kiasma/samples/doai_DSC01192.ogg` | 212 491 | 42.2 | 16k st |
| `/kiasma/samples/doai_DSC01199.ogg` | 210 983 | 41.7 | 16k st |
| `/translit/recombined/your_hardware_prevents_nothing.ogg` | 48 402 | 3.3 | 44.1k st |
| `/translit/recombined/dont_spoil_you_immortal_soul.ogg` | 36 183 | 2.3 | 44.1k st |

**23 files, 271 569 892 bytes (271.6 MB), 12 449.3 s = 3 h 27 m 29 s.**

A 24th exists on the mirror and is a second rendering of one of the above.
**MEASURED 2026-09-15T13:20Z**: `https://vandal.ist/kurenniemi/audio/associativememory.ogg`,
4 618 969 bytes, Vorbis 44.1 kHz **stereo**, **238.000 s**, `206`, no ACAO. The
`/spectrum/associative.spso.ogg` above is the same 238.000 s in **mono**. The
mirror is HTTPS and carries only this one file; it does not mirror `/spectrum/`
or `/kiasma/` at all (**MEASURED**, both 404).

### 2.6 What these recordings are

**READ**, the pages that link them, fetched 2026-09-15T13:15Z:

- **`C4004`, `C4005`, `C4018-1`, `C4019-1`, `C4026-2`, `C4054`** are cassette
  numbers from Kurenniemi's own taped diary. `research/ojanen-ekis-notes.md`
  cites `C4000`, `C4059`, `C4060`, `C4113`, `C4136` to `C4138` from the thesis as
  unpublished archive material. **These are five of the same series, published,
  playing, on a public web server.** `C4004.spso.ogg` alone is 93 minutes.
  The `_sNN_eNN_lenNN` suffix on the fragments is start minute, end minute,
  length in minutes.
- **`gradual_average_part_1.ogg`** is Constant's own composition: **READ**,
  *"produced by gradually overlaying all the cassettes. Every minute a new
  cassette file is overlayed until we obtain a superposition of twenty
  cassettes."*
- **`asc.ogg` / `desc.ogg`** are the ten loudest and ten quietest minutes of the
  whole corpus, reordered by a script.
- **`audiogrep_newton.ogg` / `audiogrep_sleep.ogg`** are his Apple Newton diary
  entries read by a speech synthesiser, which is why they are 16 kHz.
- **`doai_*` / `doaf_*`** are camera metadata read aloud.
- **`*x60_seconds.ogg`** are chance reassemblies of one-minute units.

**INFERRED.** Half of this is primary archival audio and half is algorithmic
work made from it. For a page whose subject is an archive and the ways of
reading one, that mixture is arguably better than 23 more tape transfers would
be. But the two are different things and a row that does not say which is a row
that lies.

### 2.7 Who made it, and what the terms are

**READ**, `https://vandal.ist/kurenniemi/code/README`, fetched
2026-09-15T13:20Z: Constant, named as Nicolas Malevé and Michael Murtaugh.
**READ**, the site index: *"KURATOR working with dOCUMENTA (13) commissioned
Constant to develop a prototype online archive project in collaboration with the
Central Art Archive of the Finnish National Gallery."*

🔴 **MEASURED 2026-09-15T13:20Z: there is no licence statement anywhere on the
pages fetched.** I grepped every page I pulled for `licen`, `copyleft`,
`creative commons`, `cc-by`, `copyright` and `free art`. Zero matches. The
corpus already records `licence: "not stated"` for both vandal.ist rows and it is
correct.

So there are **two** rights layers and neither states terms: Constant's
derivative works, and Kurenniemi's cassettes underneath them, which are held by
the Finnish National Gallery.

### 2.8 Everything else, probed and refused

**MEASURED 2026-09-15T13:14Z and 13:21Z**, one request each with
`Origin: https://positron.studio`:

| host | status | verdict |
|---|---|---|
| `api.finna.fi/v1/search?lookfor=Kurenniemi` | **403** | unchanged since 2026-09-14 |
| `elonet.finna.fi` | **403** | same edge |
| `urn.fi/urn:nbn:fi:lb-2020030421` (Kielipankki) | **403** | confirmed, as `research/idaidaida-2026-09.md` records. Not re-derived |
| `www.kielipankki.fi` | 200 | the institution answers, the identifier does not |
| `ekis.helsinki.fi` | 200, redirects to a `blogs.helsinki.fi` stub | confirmed, as `research/ojanen-ekis-notes.md` records. Not re-derived |
| `areena.yle.fi/1-3253227` | 200 HTML | media geo-locked, nothing fetchable |
| `musiikkiarkisto.fi` | 200 | catalogue is searchable only through Finna, which is 403 |
| `kavi.fi` | 200 | same |
| `ubu.com/sound/kurenniemi.html` | **404** | UbuWeb has no Kurenniemi page |
| `erkki-kurenniemi.bandcamp.com` | 200, and the page served is **Bandcamp's signup form** | the subdomain is not a live artist page. A web search result pointing at it is stale |
| `kurenniemi.activearchives.org` over **HTTPS** | **TLS failure**, certificate subject does not match | the host is HTTP only |

**Fonoteca.** The task named it and it is worth being precise: **MEASURED**, a
grep of the whole repository finds zero occurrences of the word, so it had never
been probed here. There is no Finnish institution of that name. `fono.fi` (the
Finnish national discography) and `aanitearkisto.fi` (the Finnish Institute of
Recorded Sound) both resolve in DNS but **MEASURED 2026-09-15T13:14Z, neither
returned an HTTP status to curl from this host**. They are discographies rather
than audio servers, so **INFERRED**, they would give metadata the corpus already
has from Discogs and MusicBrainz. Not worth another round.

**Wayback as a source of audio.** **MEASURED 2026-09-15T13:13Z**, the CDX index
for `lahteilla.fi*` holds **13 182 unique URLs and not one audio or video
mimetype**: 9 941 HTML, 2 129 JPEG, 427 PNG, 21 PDF, and nothing else. The
National Gallery's own Kurenniemi site never published a sound file.

### 2.9 The honest size of the result

**There is very little more.** One host, found because a corpus note said a page
was dead and it was not. Everything else named in the previous research
documents is still closed, and I confirmed the closures rather than re-deriving
them.

Against that: the one host has **more audio on it than the entire current
page**, and five of its files come off the numbered cassettes that the doctoral
thesis lists as unpublished. That is not a thin result. It is a narrow one.

---

## 3. Where a file should go when it cannot be played directly

### 3.1 Three different problems, and only one of them is a storage problem

| material | what is actually wrong | is a proxy enough |
|---|---|---|
| the 23 Ogg files | **no TLS and no CORS** | **yes, and a proxy is mandatory** |
| `zenodo:1469722` mp4 | the corpus has no file for it, and the type is `application/octet-stream` | a proxy fixes the header. 432 MB for 113 s is the real problem |
| `zenodo:5801697` `.mpg` | no browser decodes MPEG-1 program streams | **no. Only a transcode fixes it, and that is a copy** |
| the Yle documentary mp4 | nothing technical | **irrelevant. It is rights-closed** |

### 3.2 The Ogg files need a proxy and cannot be hotlinked at all

🔴 **MEASURED 2026-09-15T13:15Z: the host terminates no TLS.** An HTTPS request
fails the certificate check outright. So a page on `https://positron.studio`
cannot load these files **even without the CORS question**. The browser refuses
the mixed-content load first.

This is the exact case already written into `workers/shout/worker.mjs`, **READ**:

> *"🔴 `radio` IS PLAIN HTTP ON PORT 8001, AND THAT IS WHY IT IS HERE. Their
> Icecast sends no `access-control-allow-origin` AND terminates no TLS, so an
> HTTPS page cannot play it at all, not 'cannot measure it', cannot play it."*

And the `/rec/` branch added on 2026-09-15 is the same shape for files rather
than streams: **READ**, `workers/shout/NOTES.md`, a recording on `eccm.ee`
answers 200, honours a Range with a 206, and sends no ACAO, so `/rec/<name>.mp3`
re-serves it with CORS and forwards the client's `range` straight through.

The 23 Ogg files match that branch's preconditions exactly: static files, Range
honoured, no ACAO, never going to change. They would need a second base URL and
a second name pattern, and the three rules `/rec/` already establishes carry
over without argument:

- **an allowlist of names, never a `?url=` parameter.** 23 known paths, matched
  against a pattern.
- **pass the upstream status through, and guard on `>= 400`, not on `!ok`**, or
  every seek reports the origin as broken.
- **cache it**, because these are files. `public, max-age=86400, immutable`.
  `/rec/` already does exactly this and the live mounts deliberately do not.

⚠️ **One thing does not carry over and has to be measured before this ships.**
`workers/shout` is an MP3 relay; these are Ogg Vorbis, and §1.5 leaves WebKit
unmeasured. Transcoding to MP3 to dodge that question would turn a proxy into a
copy, so the order matters: measure Safari and the iPhone path **first**, and
only then decide.

### 3.3 The cost of a proxy, honestly

**READ**, `workers/shout/NOTES.md` "Still open": a 128 kbps live mount is about
57.6 MB per listener-hour *"all of it billable and none of it cacheable"*.

**INFERRED, and the difference is the whole point.** These are files, not
streams, so the second half of that sentence is false for them. `/rec/` already
marks its responses `immutable` and the edge caches them. The upstream fetch
happens once per file per colo, not once per listener: **271.6 MB of origin pull
in total, ever**, against however many times a visitor presses play.

**INFERRED**: the risk that is real is the one `NOTES.md` names next, that
nothing here throttles or counts listeners. A proxy for 271.6 MB of somebody
else's archive on a public page should get a cap before it gets a link.

### 3.4 The cost of a copy

**READ**, Cloudflare's R2 pricing page, fetched 2026-09-15: standard storage
$0.015 per GB-month, Class A $4.50 per million, Class B $0.36 per million,
**egress free**, and a free tier of 10 GB-month, 1 M Class A and 10 M Class B
each month.

**MEASURED**: the material in question is 271.6 MB of Ogg, plus 432 MB if the
Zenodo video is taken, plus 316 MB if the Yle rip were taken, which it must not
be. Call it **1.02 GB at the very most, and 0.27 GB for the part that matters.**

**INFERRED**: that is inside the free tier with 90% of it to spare, and Cloudflare
rounds a partial GB-month up to 1, so the worst case is **$0.015 a month** if the
free tier were already full. 23 writes is 23 Class A operations. Reads are Class
B against an allowance of ten million.

**READ**, three workers already bind the bucket `elektron-archive-test`
(`workers/ingest`, `workers/selfrec`, `workers/instrument`), so there is nothing
to provision either.

🔴 **So money is not the variable, and framing this as "R2 is cheap" is the
wrong frame.** R2 costs nothing here. The decision is entirely about rights.

### 3.5 The rights, source by source

| source | terms | stated by | copy? |
|---|---|---|---|
| `kurenniemi.activearchives.org` (23 Ogg) | **not stated** (MEASURED, no licence text on any page) | nobody | **no** |
| Zenodo `1469722`, `5801697` | **CC BY 4.0** | the depositor, on the record | **yes, derivatives included, with attribution** |
| archive.org, the 4 Kurenniemi items | PD Mark, **self-asserted by an uploader whose catalogue is pirated albums** | `4033675@opsb.info` | **no** |
| archive.org `20210908_20210908_1925` | **none at all** | nobody. It is a Yle broadcast rip | **no, and do not link it either** |

The Constant material is the awkward one, and it deserves saying plainly rather
than hedging. Two layers of rights, neither stated. The files are public and
have been since 2013. The project was commissioned by a documenta curatorial
programme in collaboration with the institution that holds the originals, so
somebody had permission to publish them, and that somebody is reachable:
Constant is an active organisation in Brussels.

**Recommendation on those 23: proxy, do not copy, and ask.** A proxy is a hop
that can be removed in one deploy and stores nothing. A copy into R2 is a
republication that outlives the origin and makes this project the holder of
record for archival audio it has no statement of terms for. The difference is
small in law and large in what it commits to.

### 3.6 Where R2 is the right answer

Exactly one place: **`zenodo:5801697`**, the 225 MB `DICO chromatic scale II.mpg`.
No browser decodes it, so a proxy cannot help, and **CC BY 4.0 permits the
derivative**. A transcode to a web codec, stored in R2 with the DOI and the
attribution beside it, is licensed, cheap and the only route that works.

**INFERRED**: `zenodo:1469722` is the second candidate and a weaker one. It is
432 MB for 113 seconds, which is 30.5 Mbit/s, so a proxy would work technically
and be unkind to anyone on a phone. A CC BY transcode would take it to a few MB.
Both of those are decisions about whether a two-minute video of a DIMI-A playing
Bach belongs on a page about tapes, which is not a question this document should
answer.

---

## 4. What to do, shortest first

1. **Fix the corpus builder's multi-file case.** 13 rows lose their media today,
   and one of them is a browser-playable CC BY video. `demo/resources/corpus.json`
   is generated, so the fix is in the generator and the `amended` warning in the
   file applies.
2. **Correct the `aa:audio-diaries` note.** It says the only copy is the
   Internet Archive. The original host is up and serving 23 audio files.
3. **Measure Ogg Vorbis on WebKit** with `node demo/verify-safari.mjs` and
   `node demo/verify-native.mjs` before anything else is decided. If WebKit
   refuses it, everything below changes shape.
4. **Add an `/aa/` branch to `workers/shout`**, allowlisted by name, Range
   forwarded, status passed through, `immutable` cache, in the shape `/rec/`
   already proved. That is the only thing standing between these 23 files and
   the page.
5. **Write to Constant.** The material is theirs and the FNG's, the terms are
   unstated, and a page that says where a recording came from should be able to
   say under what permission.
6. **Leave archive.org alone**, and leave the Yle rip out by name so it is not
   found again.

---

## 5. Unverified. Nobody probed these

Listed so they are not mistaken for findings. Every one of them is a lead, not a
measurement.

- **More files on `kurenniemi.activearchives.org` that nothing links to.**
  `/kiasma/samples/` and `/translit/` answer **403** with no directory listing
  (MEASURED), and the two `/translit/recombined/` files were found only because
  the Wayback Machine had captured them. There may be more behind those 403s.
  Guessing filenames is fishing and I did not do it.
- **`/audio/` on that host answers 403** while `/audio/associativememory.ogg` on
  the mirror answers 206. A directory that exists and is not listed.
- **The four zero-file Zenodo interview records** (`4289359`, `4289354`,
  `4271168`, `3886432`). Their access conditions were not requested. The thesis
  says such material stays closed.
- **`zenodo:3591336`**, the UHMRL tape-digitisation inventory CSV. Downloaded
  headers only, contents not read. It is the index to roughly 350 reel-to-reel
  tapes.
- **Yle's programme API with a registered key.** Keys are free; the media behind
  them is geo-locked to Finland. Not attempted.
- **Kielipankki from a Finnish IP.** The 403 from this host is confirmed. Whether
  it is geoblocking, bot mitigation or a licence gate is still unknown, and
  `research/ojanen-ekis-notes.md` §7 already says the three have different
  answers.
- **AV-arkki's request form** for the Taanila film. A form, not an endpoint.
- **Whether Chrome actually decodes `zenodo:1469722` through a proxied
  `video/mp4` header.** `ffprobe` says h264 Main plus AAC LC, which is the right
  codec pair. Playback in a browser was not attempted.
- **`fono.fi` and `aanitearkisto.fi`** returned no HTTP status from this host.
  Whether that is them or this network was not separated.

---

## 6. Reproducing the measurements

```sh
# the playability breakdown, straight off the shipped corpus
node -e "const c=require('./demo/resources/corpus.json');
const P=/\.(mp3|m4a|mp4|webm|ogg|opus|wav|aac)(\?|#|$)/i;
const s=i=>{const h=i.http; if(h===403||(typeof h==='string'&&/DNS|ENOTFOUND/i.test(h)))return 'gone';
 if(i.file&&i.cors)return 'open'; if(i.file)return 'held'; return 'ref'};
const b={}; for(const i of c.items){const k=s(i)+(i.file&&P.test(i.file)?' audio':''); b[k]=(b[k]||0)+1} console.log(b)"

# the 23 Ogg files: status, type, size, CORS
curl -sSI -H 'Origin: https://positron.studio' -H 'Range: bytes=0-1' \
  http://kurenniemi.activearchives.org/spectrum/C4004.spso.ogg

# codec and duration over the wire, no download
ffprobe -v error -show_entries format=duration:stream=codec_name,sample_rate,channels \
  -of default=nw=1 http://kurenniemi.activearchives.org/kiasma/samples/C4005_s62_e72_len10.ogg

# archive.org, exhausted
curl -sS 'https://archive.org/advancedsearch.php?q=kurenniemi&fl%5B%5D=identifier&rows=200&output=json'

# Ojanen's Zenodo community, all 33
curl -sS -G https://zenodo.org/api/records \
  --data-urlencode communities=electronic-musical-instruments-by-kurenniemi \
  --data-urlencode size=25 --data-urlencode page=1
```

⚠️ Two traps hit while measuring, both worth the line:

- **Zenodo caps `size` at 25** without authentication and answers `400` above it,
  so a one-page query silently under-reports a 33-record community.
- **macOS `awk` has no `IGNORECASE`.** A header filter written with it read
  archive.org's HTTP/2 responses correctly (lowercase headers) and reported
  **every field of the nginx HTTP/1.1 responses as empty**, which looked like a
  server that sends no content type. `grep -i` is the second opinion. This is the
  project's own rule about checking the instrument before believing the pattern,
  in a new costume.
