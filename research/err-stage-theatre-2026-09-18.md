# ERR archive: stage performances and theatre (2026-09-18)

What `arhiiv.err.ee` holds of the Estonian stage, how it is filed, and which
search parameters actually work. Catalogue only. **No media of any kind was
fetched**: not a manifest, not a segment, not an mp3, not an mp4, not a
thumbnail. Every host contacted was `arhiiv.err.ee`. `vod.err.ee`,
`heli.err.ee` and `arhiiv-images.err.ee` were never opened.

**161 requests in total**, spaced 1,800 ms apart, every response cached so
nothing was asked twice: 90 `POST /api/v1/search`, 51
`GET /api/v1/content/{audio|video}/{slug}`, 19 static files of the archive's
own web app (1 HTML, 18 JS) read to find the search parameter names, and 1
`GET /`. One request answered non-200 and it was my fault, not theirs: a search
body with no `timeRange` answers **500**. The API refused nothing.

Marks: ✅ measured here, 📄 from ERR's own text, ⚠️ inferred or unverified.

Builds on `research/err-archives-2026-08.md`, which established the API, the
year-query recipe and the media/rights picture. Read that first; this file does
not repeat it. Two things in it are **corrected below**: the shape of the
metadata block, and the 1969 photo peak in `archive/megatimeline/census.json`.

---

## Why this is a document and not a JSON corpus

I harvested 10,185 catalogue rows and then decided not to ship them.

The reason is that **the set has no honest membership rule yet**, which is the
finding rather than a hedge. The archive's own class for staged work is a
category called `Lavastuslik`, and it is 10,185 audio and video rows. But only
**1,604 of them (15.7%) say anything about a stage** ✅, and the same search
term finds **more theatre material in the `Kultuur` category than in
`Lavastuslik`** ✅ (2,377 against 1,079). So a JSON file of those 10,185 rows
would be shipping a set I have just measured to be both too wide and too narrow,
under a filename that claims otherwise. The tables below are the part that is
true, and §8 is the recipe that regenerates the rows in 22 requests when
somebody knows what they want them for.

---

## 1. The vocabulary, and which of it the API understands ✅

Estonian first, because the free-text index is Estonian and English returns
almost nothing useful.

| Estonian | what it means |
|---|---|
| `teater` | theatre, the building and the company. Inflects: `teatri`, `teatris`, `teatrit` |
| `lavastus` | a staged production. `lavastaja` is the stage director, `laval` is "on stage" |
| `etendus` | a performance, one showing of a production |
| `esietendus` | premiere |
| `näidend` | a play, the text |
| `kuuldemäng` | radio play |
| `telelavastus` | television production, a play made for television |
| `lavakava` | a staged programme, usually poetry or a recital |
| `estraad` | variety stage |
| `ooper`, `ballett`, `operett`, `muusikal` | opera, ballet, operetta, musical |
| `Tegijad`, `Näitleja`, `Režissöör`, `Kunstnik` | credits, actor, director, designer |

**The search endpoint takes seven advanced parameters and two of them do
nothing I could detect.** They are read out of the archive's own web app
bundle (`chunk-J7UXTDS5.js`): `year`, `photographer`, `keywords`,
`partNumber`, `content`, `category`, `transcription`. They travel in the POST
body as `advancedParams: [{ type, value }]`.

| parameter | effect, measured on a 1980 window where the baseline is 3,393 rows |
|---|---|
| `category` | ✅ works. `lavastuslik` takes 3,393 to 508 |
| `content` | ✅ works. `teater` takes 3,393 to 31 |
| `keywords` | 🔴 **inert.** `teater` returns 3,393, identical in all four count cells |
| `year`, `photographer`, `partNumber`, `transcription` | ⚠️ not tested |

🔴 **The `keywords` finding was nearly recorded as a fact about theatre.** Ten
theatre terms run against `keywords` over the whole archive all returned
**exactly 30,000 / 10,000 / 10,000 / 10,000**, which is the unfiltered archive
saturating its count cap. Ten different words giving one identical number is a
broken collector, not a discovery about the corpus, and the year-bounded test
above is what proved it. The likely reason nobody noticed: the keyword index is
nearly empty on this material anyway. `Märksõnad` appears on **1 of 41** sampled
item records ✅.

Free-text `phrase` is broader than `content`. On the same 1980 window,
`phrase: 'teater'` returns 58 and `content: 'teater'` returns 31 ✅. ⚠️ Which
fields each reads is not documented and I did not determine it.

---

## 2. The category taxonomy ✅

Every search response carries the full list in `activeList.categories`. Fifteen
categories, and the one that means "staged" is `Lavastuslik`.

`Film` · `Meelelahutus` · **`Lavastuslik`** · `Muusika` · `Sport` · `Uudised` ·
`Info` · `Päevakajaline` · `Elu` · `Kultuur` · `Haridus` · `Religioon` ·
`Lastele` · `Varia` · `Järjejutt`

Whole-archive counts per category, `phrase: '*'`, `timeRange: 'all'` ✅. A cell
reading 10000 is the count cap, so it means "10,000 or more".

| category | video | audio | photo |
|---|---|---|---|
| `lavastuslik` | 5,609 | 4,576 | 10000+ |
| `kultuur` | 9,670 | 10000+ | 10000+ |
| `muusika` | 5,166 | 10000+ | 10000+ |
| `meelelahutus` | 5,108 | 4,623 | 10000+ |
| `jarjejutt` | 0 | 3,836 | 0 |
| `film` | 966 | 0 | 5 |

🔴 **Theatre does not live in one category, and the obvious one is not the
biggest.** `content: 'etendus'` split by category ✅:

| category | video | audio | photo | total |
|---|---|---|---|---|
| `kultuur` | 1,502 | 434 | 441 | **2,377** |
| `lavastuslik` | 679 | 81 | 319 | 1,079 |
| `muusika` | 145 | 579 | 112 | 836 |
| `meelelahutus` | 259 | 27 | 21 | 307 |

The split has a meaning. `Lavastuslik` holds the **productions**, a recording
of a performance or a drama made for broadcast. `Kultuur` holds the **writing
about them**: actor portraits, theatre magazine strands. Reading the first
twenty `kultuur` + `etendus` video hits by air date gives `Albert Üksip` (1963),
`Jüri Järvet` (1970), `Säärane Ird ehk sada aastat Vanemuise teatrit` (1971),
`Maskiga ja maskita. Ita Ever` (1974), and the strands `Pöördlava` and
`Estraaditähestik` ✅. Not one of them is a performance.

Theatre-word counts over the whole archive, all categories, `content` ✅:

| term | video | audio | photo | total |
|---|---|---|---|---|
| `lavastus` | 4,621 | 2,251 | 10000+ | 16,872 |
| `teater` | 3,407 | 2,892 | 1,880 | 8,179 |
| `ooper` | 2,346 | 3,137 | 2,079 | 7,562 |
| `etendus` | 3,904 | 2,013 | 938 | 6,855 |
| `kuuldemäng` | 65 | 2,637 | 214 | 2,916 |
| `näidend` | 1,140 | 766 | 695 | 2,601 |
| `ballett` | 544 | 351 | 253 | 1,148 |

---

## 3. What is in `Lavastuslik`: 10,185 rows, 1928 to 2026 ✅

Harvested complete: every audio and video row, 22 requests at 500 rows a page.
5,609 video and 4,576 audio, matching the counts the API declares. 10,185
distinct slugs, no duplicates. 10,175 carry a `fileId` and 9 of those collide,
so the slug is the only identifier that is both present and unique.

Photos were not harvested. The per-decade census below puts them at **30,243 or
more**, and the floor cannot be lifted without going per-month, because 1969
alone saturates the count cap.

Dated rows by decade, counted from the harvested rows themselves ✅:

| decade | video | audio | total |
|---|---|---|---|
| 1920s | 0 | 4 | 4 |
| 1930s | 0 | 7 | 7 |
| 1940s | 0 | 17 | 17 |
| 1950s | 1 | 614 | 615 |
| 1960s | 13 | 842 | 855 |
| 1970s | 93 | 651 | 744 |
| 1980s | 743 | 588 | 1,331 |
| 1990s | 957 | 496 | 1,453 |
| 2000s | 1,067 | 155 | 1,222 |
| 2010s | 2,099 | 609 | 2,708 |
| 2020s | 537 | 306 | 843 |
| **dated total** | **5,510** | **4,289** | **9,799** |
| undated | 99 | 287 | 386 |

Earliest dated row **1928-07-15**, latest **2026-09-14**, 84 distinct years ✅.
The earliest is `Oskar Luts - Seda ja teist (1928)`, whose record says
`Fonogrammi tootja: 1928 PD` and `Salvestuskuupäev: 15.07.1928`. That is the
synthesized mid-year date the earlier research names as the year-only precision
leak, still in force.

The same census run by asking the API per decade instead ✅. It agrees on video
to the row and disagrees on the 1960s by a lot, for a reason worth its own
section.

| decade | video | audio | photo |
|---|---|---|---|
| 1950s | 1 | 615 | 167 |
| 1960s | **112** | **1,119** | 10000+ |
| 1970s | 96 | 653 | 521 |
| 1980s | 740 | 587 | 1,737 |
| 1990s | 958 | 496 | 7,038 |
| 2000s | 1,066 | 155 | 2,731 |
| 2010s | 2,099 | 609 | 3,991 |
| 2020s | 537 | 306 | 3,586 |

---

## 4. 🔴 An undated item is parked on 1969-12-31, and it poisons any 1969 query ✅

A one-day window on **1969-12-31** returns **99 video and 278 audio** staged
items, plus 10,000 or more photos. The staged category has exactly **99**
undated video rows and 287 undated audio rows. So effectively every item with
no air date is indexed on that one day, which is where the unix epoch turns
over.

Their item records say what they actually are. `info.date` is `""`, `info.year`
carries a real year, and `dateCombined` names which kind of year it is ✅:

| slug | `info.date` | `info.year` | `dateCombined` |
|---|---|---|---|
| `pokumang` | `""` | 1999 | `Tootmisaasta 1999` (production year) |
| `kaksteist-vihast-meest-2` | `""` | 1998 | `Tootmisaasta 1998` |
| `peatukk-quot-ulestousmise-puha-quo` | `""` | 1964 | `Salvestusaasta 1964` (recording year) |
| `veera-tsubakova-naine` | `""` | 1963 | `Salvestusaasta 1963` |
| `doris-kareva-luulet-autori-esituses` | `""` | 2003 | `Salvestusaasta 2003` |
| `luule-eestile` | `2018-01-06` | 2018 | `6. jaanuar 2018` |

Three consequences.

**The catalogue separates a broadcast date from a production or recording
year.** An item that only ever had the second gets no `date` at all, and its
year survives in `info.year` and in the prose of `dateCombined`. Read the prefix:
`Tootmisaasta` and `Salvestusaasta` are not `Eetrikuupäev`.

**Any year search that touches 1969 sweeps in the whole undated pile**,
whatever decade the items belong to. The six above span 1963 to 2003.

🔴 **This repo already has that artefact committed and believed.**
`archive/megatimeline/census.json` records a whole-archive photo peak at 1969 of
10,000 or more, described in `research/err-archives-2026-08.md` as the
archive's photo peak. ⚠️ That peak is at least partly the undated pile and not
1969. I could not separate them, because both readings saturate the cap, and a
per-month sweep of 1969 would be the way to try.

**And a missing `date` in a search hit is not the same as an undated item.**
`luule-eestile` came back from search with no date and its record holds
`2018-01-06` ✅. 1 of the 6 sampled undated hits was dated in its own record, so
⚠️ the search hit's `date` is lossy at a rate I did not measure beyond n=6.

---

## 5. Which fields are actually there ✅

### The search hit, measured over all 10,185 rows

| field | present | note |
|---|---|---|
| `archiveType` `type` `url` `heading` `role` `count` `customImage` `photoUrlCropType` `navigationLinks` | **100%** | `url` is the slug and is the only unique id |
| `fileId` | 99.9% | 10 rows have none, 9 more collide |
| `lead` | 97.9% | the synopsis, and the only place a theatre is named |
| `date` | 96.2% | video 98.2%, audio 93.7%. See §4 |
| `photoUrl` | 57.6% | video **100%**, audio **5.7%**. Relative path, no ACAO |
| `imageFolder` | 55.1% | video only, always |
| `colour` | 44.9% | audio only, always |
| `waveform` | 43.7% | audio **97.3%**, video 0%. A JSON-stringified array |
| `seriesId` `seriesLabel` | **0.1%** | 10 rows of 10,185. Do not use these |
| `categoryLinks` | **0%** | empty on every row |

**The series arrives through `navigationLinks`, not through `seriesId`.** Every
row carries an `archiveType` link and a `category` link; **8,712 (85.5%)** carry
a `series` link ✅. That is the grouping axis that works.

⚠️ One row of 10,185 returned by a `lavastuslik` filter carries a `category`
link reading `Kultuur`: `kirjandusminutid`. One row, so either the filter or
the link is slightly off, and I did not determine which.

### The item record, sampled 41 items ✅

Stratified one or two per decade per type, 17 video and 24 audio. **n = 41 of
10,185, so read these as a sample and not as a census.**

`GET /api/v1/content/{type}/{slug}` returns `{ info, media, metadata,
description, relatedContents, seriesList, status }`.

`info.*` non-empty: `archiveType` `category` `customImage` `dateCombined`
`filename` `fullUrl` `guid` `id` `idec` `navigationLinks` `photoUrlCropType`
`title` `txDay` `type` `uploadDate` `url` `urlType` `year` all **41/41**;
`categoryId` `dateModified` 40; `synopsis` 40; `date` 37; `month` 34;
`photoUrl` `photoCropUrl` `videoPhotoUrl` 33; `seriesId` `seriesTitle`
`seriesUrl` 28; `colour` 24; `imageFolder` 17; `episode` 11; `description` 4;
**`downloadUrl` 2**; `photoGuidUrl` 1.

🔴 **The metadata block has a different shape from the one the 2026-08 research
records.** It said `metadata.technical[]`, a flat array of
`{label, value}`. It is now **`metadata.data[]`, three groups**, each
`{type, label, data[]}`: `general` (Info), `technical` (Tehnilised andmed),
`makers` (Tegijad). All three groups are present on all 41 items and
**`makers` is empty on 24 of them, which is every audio item** ✅. Audio credits
live under `technical` instead.

| label | of 41 | video (17) | audio (24) |
|---|---|---|---|
| `general.Kestus`, `technical.Kestus` (duration) | **41** | 17 | 24 |
| `technical.Aasta` (year) | **41** | 17 | 24 |
| `general.Pealkiri` (title) | 32 | 8 | 24 |
| `technical.Sarja pealkiri` (series title) | 28 | 11 | 17 |
| `technical.Fonoteegi number` (sound archive id) | 24 | 0 | **24** |
| `technical.Fonogrammi tootja` (producer, carries rights year) | 24 | 0 | **24** |
| `technical.Esineja` (performer) | 24 | 0 | **24** |
| `technical.Teksti autor` (text author) | 23 | 0 | 23 |
| `technical.Faili nimi`, `technical.Indeks` | 17 | **17** | 0 |
| `makers.Näitleja` (actor) | 16 | 16 | 0 |
| `general.Režissöör`, `makers.Režissöör` (TV director) | 15 | 15 | 0 |
| `makers.Levitaja`, `makers.Kunstnik` | 13 | 13 | 0 |
| `technical.Režii`, `technical.Helirežii` | 12 | 0 | 12 |
| `technical.Salvestuskuupäev`, `technical.Eetrikuupäev` | 11 | 0 | 11 |
| `general.Osa nr.`, `makers.Operaator` | 11 | 11 | 0 |
| **`makers.Lavastaja`** (stage director) | **6** | 6 | 0 |
| `general.Märksõnad` (keywords) | **1** | 1 | 0 |

**A duration is there for the asking and costs one request per item.** `Kestus`
is `HH:MM:SS` and was present on 41 of 41 ✅. 10,185 items is 10,185 requests,
so it is a decision to be made about a chosen subset and not a field to harvest
wholesale.

🔴 **`downloadUrl` is non-empty on 2 of 41.** The 2026-08 research treats its
presence as the proxy for "public domain or ERR-owned". On staged material that
proxy says almost everything is neither. ⚠️ n=41.

---

## 6. 🔴 The signature of a recorded stage production ✅

Three ETV recordings from 1980 were read in full. Every one carries **both**
`makers.Lavastaja` and `makers.Režissöör`, and they are different people:

```
Mäng : 1    Lavastaja Hanschmidt Teet   Režissöör Kala Aime    01:01:45  1980
Mäng : 2    Lavastaja Hanschmidt Teet   Režissöör Kala Aime    00:55:12  1980
Ciao! : 2   Lavastaja Petrova Natalja   Režissöör Kala Aime    00:59:52  1980
```

`Lavastaja` is who staged it in the theatre. `Režissöör` is who directed the
television recording. **A record carrying both is a stage production that
television recorded**; a drama made for television has only the second. ⚠️ Three
of three, which is enough to propose the rule and not enough to claim it. It is
cheap to test properly on a sample of a few hundred.

The second signature is in the `lead`, and it is prose rather than a field.
**158 rows (1.6%) open their lead with `<Theatre> etendus.`** ✅, in 52 spellings
of about twenty companies: `Viljandi Draamateatri Ugala`, `Tallinna
Linnateatri`, `Teater Vanemuine`, `Rakvere Teatri`, `Vanalinnastuudio`, `Endla
Teatri`, `Eesti Draamateatri`, `Noorsooteatri`, `Pärnu Teatri Endla`, `Eesti
Riikliku Nukuteatri`, `TRA Draamateatri`, `VAT Teatri`, `Stockholmi Eesti
Teatri`. 156 of the 158 are video. Dated 1978 to 2020, 27 undated, and by
decade: 1970s 2, 1980s 61, 1990s 30, 2000s 31, 2010s 6, 2020s 1. **97 distinct
productions.**

⚠️ It is a convention rather than a rule, and it undercounts: 1,036 rows name a
company somewhere and only 158 use this opening.

### Companies named anywhere in a staged row ✅

Matched on heading, lead and series over all 10,185 rows. Spot-checked
`Endla` for the false positive it invites, since it is also a common given
name: 12 of 12 sampled were the Pärnu theatre.

| company | rows | video | audio | distinct productions | years |
|---|---|---|---|---|---|
| Eesti Draamateater | 404 | 197 | 207 | 125 | 1950..2020 |
| Vanemuine | 170 | 97 | 73 | 69 | 1953..2020 |
| Ugala | 143 | 114 | 29 | 68 | 1954..2024 |
| Rakvere teater | 104 | 86 | 18 | 55 | 1955..2019 |
| Endla | 85 | 63 | 22 | 43 | 1954..2016 |
| Noorsooteater | 66 | 50 | 16 | 41 | 1970..2020 |
| Tallinna Linnateater | 60 | 58 | 2 | 36 | 1986..2024 |
| Piip ja Tuut | 25 | 25 | 0 | 5 | 2014..2021 |
| Rahvusooper Estonia | 21 | 18 | 3 | 10 | 1947..2019 |
| VAT teater | 20 | 18 | 2 | 13 | 1989..2015 |
| R.A.A.A.M. | 4 | 4 | 0 | 3 | 2009..2012 |
| Nukuteater | 3 | 3 | 0 | 2 | 1999..2016 |
| Von Krahl | 3 | 2 | 1 | 3 | 1997..2013 |
| NO99 | 2 | 1 | 1 | 2 | 2013..2017 |
| Vene teater | 1 | 1 | 0 | 1 | 2009 |

**1,036 rows (10.2%) name at least one company** ✅, 675 video and 361 audio.
1,285 rows (12.6%) use stage vocabulary. The union is **1,604 (15.7%)**.

The two media split by era, cleanly. Audio rows naming a company run **1947 to
1968** and are radio plays cast from the theatres. Video rows run **1971 to
2021** and peak hard in the 1980s: **301 of 623 dated video rows (48%) fall in
1979 to 1991** ✅, 20 to 34 a year every year from 1980 to 1993. That decade is
Estonian television recording the repertoire, and it is the densest stage
holding in the archive.

**406 distinct video productions carry a company name**, 191 of them in two or
more parts ✅. A production is split into parts and the heading says which:
**2,874 rows (28.2%) end in ` : <n>`**. Examples from the 1980s run, each three
or four parts:

```
1979  Eesti Draamateater   Päikese lapsed              4 parts
1981  Eesti Draamateater   Kolm õde                    4 parts
1981  Rakvere teater       Onu Vanja                   3 parts
1982  Eesti Draamateater   Vassa Železnova             3 parts
1983  Eesti Draamateater   Kes kardab Virginia Woolfi? 3 parts
1983  Noorsooteater        Bernarda Alba maja          3 parts
1985  Rakvere teater       Kuningas Richard Teine      3 parts
1988  Ugala                Nora                        3 parts
1989  Rakvere teater       Vaata raevus tagasi         3 parts
1996  Ugala                Kirsiaed                    3 parts
```

---

## 7. How the 10,185 break down by series ✅

608 distinct series. 8,712 rows sit in one and **1,473 sit in none**. 8 series
hold one row, 503 hold 2 to 9, and 97 hold 10 or more.

| rows | series | what it is |
|---|---|---|
| 2,100 | `Kuuldemäng` | radio plays, the single biggest thing in the category |
| 1,248 | `Lastetuba` | children's programme |
| 973 | `Õnne 13` | the long-running television serial |
| 298 | `Pehmed ja karvased` | satirical puppet sketch show |
| 266 | `Lasteekraan. Saame kokku Tomi juures` | children's programme |
| 154 | `154 William Shakespeare'i sonetti` | the sonnets, read |
| 121 | `ENSV` | period comedy serial |
| 120 | `Luise ja Oliver` | serial |
| 106 | `Doris Kareva luulet autori esituses` | poetry, read by the author |
| 105 | `Luule Eestile` | poetry |
| 84 | `Buratino tegutseb jälle` | children's |
| 84 | `Luuletus` | poetry |
| 39 | `A. H. Tammsaare "Tõde ja õigus"` | the novel, dramatised |
| 36 | `Juhan Viidingu lavakava "Öötöö" Kirjanike Majas` | a staged recital |
| 33 | `Tugitooliteater` | "armchair theatre", the television drama strand |

**This is the shape of the answer.** `Lavastuslik` means dramatised, not
theatrical: radio plays, serials, children's television and poetry recitals are
the bulk of it, and recorded stage performance is a real but minority holding of
roughly 1,000 to 1,600 rows inside it. Only 12 of the 608 series have a
theatrical name at all, and they account for 2,228 rows, of which `Kuuldemäng`
alone is 2,100.

---

## 8. The recipe, so nothing here has to be asked twice ✅

```
POST https://arhiiv.err.ee/api/v1/search
Content-Type: application/json

{"queryParams":{
  "phrase":"*",
  "type":"video",                 // video | audio | photo | all
  "sortOption":"old",             // accuracy | old | new | abc
  "page":1,"limit":500,           // 20 | 100 | 500; `all` caps every group at 6
  "timeRange":"all",              // REQUIRED. Omitting it answers 500
  "timeRangeFrom":-1956528000,"timeRangeTo":<now unix s>,
  "includeTranscription":false,
  "advancedParams":[{"type":"category","value":"lavastuslik"}]}}
```

- 12 pages of `video` and 10 of `audio` is the whole staged category, **22
  requests**.
- `timeRange: 'custom'` with unix second bounds narrows by date. Negative
  epochs work.
- Counts sit in `activeList.{videoCount,audioCount,photoCount,totalCount}` and
  are reported for **all three types on every query**, whatever `type` says.
  They **saturate at exactly 10000**, so that number always means "or more".
- ⚠️ The window edges leak by two or three hours, because the index stores
  local-midnight epochs and the query is in UTC seconds. Adjacent year queries
  overlap by a few rows.
- Item record: `GET /api/v1/content/{audio|video|photo}/{slug}`, where the slug
  is the search hit's `url`. One request each.

**Politeness.** 1,800 ms between requests, an identifying User-Agent, `limit: 1`
for anything that only needs a count, and every response cached to disk so a
re-run asks nothing. ERR's own FAQ blesses searching and linking 📄. It does not
mention programmatic access either way ⚠️.

---

## 9. What I could not determine

- **The real photo count.** 30,243 is a floor. 1969 saturates the cap on its
  own, and it is contaminated by the undated pile (§4), so a per-month sweep of
  that year is the only way through.
- **Whether the 1969 photo peak in `archive/megatimeline/census.json` is real.**
  Both the 1969 reading and the undated pile read 10000. They cannot be
  separated without going below year granularity.
- **Whether `Lavastaja` plus `Režissöör` really identifies a recorded stage
  production.** 3 of 3, which proposes it and does not establish it. Testing it
  properly is one request per item over a sample of a few hundred.
- **How lossy the search hit's `date` is.** 386 rows arrive without one and 1 of
  6 sampled had a date in its own record. The rate is unmeasured.
- **What `phrase` and `content` each search.** They differ by roughly a factor
  of two and the difference is undocumented.
- **Whether `year`, `photographer`, `partNumber` and `transcription` work**, or
  are inert like `keywords`.
- **Rights.** `downloadUrl` is non-empty on 2 of 41 sampled staged items, and
  there is no rights field in the API. 📄 ERR's archive routes public use
  through licence agreements (`sirje.joesaar[ät]err.ee`, general
  `arhiiv[ät]err.ee`, about a week to answer). Recorded stage productions are
  the worst case for this: the playwright, the translator, the stage director,
  the designer, the composer and every actor hold rights, on top of ERR's own.
  Nothing here should be assumed clearable.
- **Anything about playback.** No media was fetched, so this file says nothing
  about whether a given item plays, what it sounds like, how long it really is,
  or whether its mount answers. The 2026-08 research measured that on other
  material and it was not re-checked.
