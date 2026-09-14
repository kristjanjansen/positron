# Kurenniemi — other digitised sources, and what a machine can do with each (2026-09-14)

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
