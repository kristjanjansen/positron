# Kurenniemi audio: why 24 of 334 play, what else is out there, and where it should go

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
   TLS and no CORS, which is the `radio1965` case `workers/shout` already exists
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

> *"🔴 `radio1965` IS PLAIN HTTP ON PORT 8001, AND THAT IS WHY IT IS HERE. Their
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
node -e "const c=require('/Users/s32863/personal/positron/demo/resources/corpus.json');
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
