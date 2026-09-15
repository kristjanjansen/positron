# What Ojanen's thesis changed in `demo/resources/corpus.json` (2026-09-15)

Every date in this corpus that came from a filename, a compilation's span or a
title match has now been held up against a named scholar with an argument.
Source throughout: Mikko Ojanen, *User Stories of Erkki Kurenniemi's Electronic
Musical Instruments, 1961-1978* (PhD, University of Helsinki, 2020),
`10.5281/zenodo.4306056`, **CC-BY-4.0 on the text**. Extraction:
`research/ojanen-ekis-thesis.md`. Analysis it was read against:
`research/ojanen-ekis-notes.md`. **Every page number here is the PRINTED one**
(pdf page minus 26), and every passage below was read at that page in the
extraction rather than taken from the summary.

`READ` = it is in the document, page given. `MEASURED` = a program was run and
this is what it answered. `INFERRED` = reasoning, shown.

**Headline: 14 records touched, 0 added, 334 before and 334 after.** Ten date
brackets moved, one was re-evidenced without moving, three were corroborated.
One of the ten got **wider**.

> ⚠️ **SINCE THIS WAS WRITTEN, 2026-09-15 evening. §1's warning and §6's first
> two open items are DONE and the text below is kept as it was measured.**
> The readings are no longer hand-edited into a generated file: twelve live in
> `proto/deck/ingest.mjs` and two in `demo/resources/build-corpus.mjs`, both
> generators reproduce all fourteen, and three guards refuse a run rather than
> drop one. `/resources/` reads `when.how` and `when.note` now: the date cell
> carries who says so and how wide the bracket is, the row carries what the
> record is and why the bracket is not narrower. The `proto/aikajana` paths
> §1 names are gone from both generated files and from `proto/deck/verify.mjs`.
>
> 🔴 And rebuilding found a second defect this document could not have seen.
> The `kurenniemi` -> `resources` demo rename had matched BARE WORDS inside
> `build-corpus.mjs` and corrupted twelve string literals: three record filters
> became `/resources/i.test(…)`, which no archive record satisfies, and two live
> hosts became paths that do not exist. The committed corpus was built before the
> rename, so it looked perfect. A real rebuild returned **285 rows, not 334**,
> with Zenodo keeping 0 of 28 and archive.org 0 of 15. Repaired, and 334 again.
> **Every number in this document was measured against a corpus built by a
> generator that could not have reproduced it.**

---

## 0. The rule that decided every bracket

Written down because it is the thing that will be argued with, and because this
file's own `precisionConventions` now carries it:

> A qualifier does not narrow a bracket. "the fall of 1970" and "early 1964"
> keep the whole year and carry the qualifier in words. A dated event that the
> object has to precede DOES narrow it, to that day.

The first half is not new here. `corpus.json` already applied it to
lahteilla.fi's Finnish decades: *"The qualified decades keep the WHOLE decade as
their bracket and carry the qualifier in words: 'mid' has no defined width, and
inventing one would put a number in this file that the archivist never wrote."*
This is the same rule one unit down.

The second half is what makes On-Off and Oigu-S ranges rather than years. A
premiere or a performance is a hard ceiling on a tape, because the tape has to
exist to be played.

## 1. Where the provenance went, and what does not read it yet

The schema already had the field, so **no new field was invented**:

| field | what it now carries | read by a page today? |
|---|---|---|
| `when.how` | the citation slug, e.g. `ojanen-2020-thesis-p205-n402` | **no** |
| `when.note` | one sentence on why this bracket has this width | **no** |
| `note` (item level) | what the record is, per the thesis | **yes**, `/resources/` puts it on the row's `title` |

🔴 **So the two fields that make a date checkable are invisible on both pages.**
`/resources/` prints `when.edtf` in a column and nothing else from `when`, and
`/tapes/` prints `when.edtf` in one line above the strip. A visitor can see that
On-Off got wider and has nowhere to find out why. That is a page change, not a
corpus change, and it is left open deliberately: the honest home for
`when.how` is a column or a hover on the date cell, and `/resources/` already
spends its one `note` slot on the row.

🔴 **AND THE FILE IS NOW HAND-EDITED, WHICH IT SAYS.** `demo/resources/corpus.json`
declares `generator: demo/resources/build-corpus.mjs`. A new top-level
`amended` array records this edit, its ids and this warning:

> Running `demo/resources/build-corpus.mjs` rewrites this whole file and drops
> every line of this. The eleven archive.org rows are folded in from
> `proto/deck/corpus.json`, so that is where the dates have to go to survive a
> rebuild.

MEASURED: `foldDeck()` in `build-corpus.mjs` reads `proto/deck/corpus.json` and
copies `it.when.edtf`, `it.when.earliest`, `it.when.latest`, `it.precision` and
`it.dateEvidence?.how` straight through. Those are the eleven rows below. The
three corroborated instrument rows come from Europeana and the National Gallery
passes and have no hand-editable upstream.

⚠️ **The chain is already drifted, which is how it was noticed.** Each amended
row carries `via: "proto/aikajana/corpus.json"`, a path that does not exist.
`proto/deck/corpus.json`'s own `generator` says
`proto/aikajana/ingest.mjs --rewhen`, which does not exist either. Both were
renamed to `proto/deck/` and neither generated file was regenerated afterwards.

---

## 2. The corrections, record by record

Eleven archive.org rows, all in the item `videoplayback-13_202304`, all playable
in `/tapes/`. `before` is what the file said this morning.

### 2.1 Sähkösoittimen ääniä and Sähkösoittimen Ääniä: a re-attribution, not just a date

`ia:videoplayback-13_202304/Erkki Kurenniemi - Sähkösoittimen ääniä .mp3`
`ia:videoplayback-13_202304/Erkki Kurenniemi - Sähkösoittimen Ääniä .mp3`

| | |
|---|---|
| before | `1963–1973` · range · `derived-from-corpus-range` |
| after | `1971` · year · `ojanen-2020-thesis-p205-n402` |

READ, p. 205 n. 402, verbatim:

> "Some of the Sähkökvartetti and DIMI-A parts were released on Kurenniemi's
> compilation CD Äänityksiä/Recordings 1963-1973 in 2002 under the track titles
> Sähkösoittimen ääniä #1 and #4. On the CD the tracks are credited to
> Kurenniemi and the DIMI-A track is introduced as the Sähkökvartetti recording.
> Vihreä eläin is not mentioned as the origin of the sound material."

READ, p. 141, which dates and places the session:

> "Shortly after the first version was completed, Kurenniemi, Ruohomäki, Donner
> and Vesterinen recorded sound material for the radio play Vihreä eläin (1971)
> based on Vesterinen's text. Donner organized the session in Yle's Fabianinkatu
> studio, to where the equipment was transported from the nearby University
> Studio, even though the only instruments (Sähkökvartetti, DIMI-A, DIMI-O) being
> used were from the University Studio."

READ, p. 206 n. 403:

> "The tempo change can be detected on the track Sähkösoittimen ääniä #4 on
> Kurenniemi's compilation CD Äänityksiä/Recordings 1963-1973, which the
> original radio-play session recording without the latter overdubs."

READ, p. 116, a third independent statement of the year: *"in 1971 Donner used
sounds from Sähkökvartetti, DIMI-A and DIMI-O in a radio play entitled Vihreä
eläin"*.

⚠️ **WHICH FILE IS #1 AND WHICH IS #4 IS NOT ESTABLISHED, AND IS NOT GUESSED.**
The two archive.org filenames differ only by the case of two letters and carry
no track number. MEASURED off `proto/deck/corpus.json`: the durations are 162.1 s
and 170.5 s, eight seconds apart, which separates nothing. The note on each row
says the CD numbers them #1 and #4 and says the mapping is not established here.

This is the single most valuable line in the thesis for this corpus, because it
is not a date correction: it is a documented case of a commercial release
stripping provenance, on a record this project points at.

### 2.2 Saharan uni I and Saharan uni II

`ia:videoplayback-13_202304/Erkki Kurenniemi - Saharan uni I (64 kbps).mp3`
`ia:videoplayback-13_202304/Erkki Kurenniemi - Saharan uni II (64 kbps).mp3`

| | |
|---|---|
| before | `1963–1973` · range · `derived-from-corpus-range` |
| after | `1967` · year · `ojanen-2020-thesis-p180` |

READ, p. 180, which names both parts and dates them in one clause:

> "the two-piece tape music work Saharan uni I & II (1967, realized with Kari
> Hakala)"

READ, p. 100, the session and the premiere:

> "Kurenniemi and Kari Hakala used the Integrated Synthesizer as a sound source
> for the two-piece work Saharan uni (1967), which was the first stereophonic
> electronic work produced in Finland. Kurenniemi and Hakala recorded the sound
> material in the University Studio in Vironkatu, but they mixed the final work
> with the four-tracker in the Yle sound-control room in Kulttuuritalo"

> "Saharan uni was premiered on February 9, 1968 during the Sähköshokki-ilta
> (Engl. Electro Shock Evening) event at the Amos Anderson Art Museum in
> Helsinki, at which the Integrated Synthesizer made its last known public
> appearance"

READ, p. 100 n. 160: *"sound recording from the rehearsals on February 8, 1968."*

🔴 **THE DATE IS 1967, NOT 9 FEBRUARY 1968, AND THAT IS THE WHOLE POINT OF THE
RULE.** INFERRED, and it is one step: a tape music premiere is a playback of a
tape that already exists. Dating this file to the premiere day would claim the
CD holds a recording of the Amos Anderson event, which the thesis does not say
and which the rehearsal footnote argues against. The premiere and the rehearsal
are in the item note, where they are facts about the record rather than its date.

### 2.3 Inventio / Outventio

`ia:videoplayback-13_202304/Erkki Kurenniemi - Inventio _ Outventio (64 kbps).mp3`

| | |
|---|---|
| before | `1963–1973` · range · `derived-from-corpus-range` |
| after | `1970` · year · `ojanen-2020-thesis-p138` |

READ, p. 138:

> "The two-part piece Inventio-Outventio (1970), which was realized in the fall
> of 1970, consists of Kurenniemi's arrangement of Johann Sebastian Bach's
> Invention No. 13 in A minor (BWV 784) for the DIMI-A, and the tape collage
> Outventio realized jointly by Kurenniemi and Ruohomäki in a separate session.
> Kurenniemi's Bach arrangement for the DIMI-A remains the only work he composed
> solely with the instrument."

**Not `1970-09/1970-12`.** "Fall" has no width the thesis defines, so by the rule
in §0 the bracket is the whole year and the qualifier is in `when.note`. This is
the one place the rule visibly costs something, and it is the same cost this file
already pays on every `1960-luvun alku` row.

### 2.4 Mix Master Universe 2

`ia:videoplayback-13_202304/Erkki Kurenniemi - Mix Master Universe 2 (64 kbps).mp3`

| | |
|---|---|
| before | `1963–1973` · range · `derived-from-corpus-range` |
| after | `1973` · year · `ojanen-2020-thesis-p138` |

READ, p. 138: *"He used the DIMI-A sounds later in his sound collages Mix Master
Universe (1973, with Ruohomäki) and ?Death (1972-1975)"*.

READ, p. 180, independently: *"some of Ruutsalo's tape collages including Mix
Master Universe (1973, realized with Jukka Ruohomäki)"*.

⚠️ The thesis names no part 2. The corpus title says `Mix Master Universe 2` and
the file name says the same, so the title is left exactly as it is and the note
says the thesis names no part 2. Renaming a record to match a book would be a
worse error than an unexplained numeral.

### 2.5 Oigu-S

`ia:videoplayback-13_202304/M.A. Numminen & Erkki Kurenniemi - Oigu-S (64 kbps).mp3`

| | |
|---|---|
| before | `1963–1973` · range · `derived-from-corpus-range` |
| after | `1964–1964-04-04` · range · `ojanen-2020-thesis-p110-p111` |

READ, p. 110:

> "Around the turn of 1964, Numminen enrolled for the academic singing contest to
> be held on April 4. He made use of the University Studio in early 1964 to
> prepare for the contest, in which he wanted to perform avant-garde electronic
> music. He planned to perform two pieces, Ontogim and Oigu-S (1964), for which
> he needed equipment to process his singing."

READ, p. 111: *"As accompaniment and using University Studio equipment, Numminen
produced a background tape that included concrete and electronic sounds."*

READ, p. 111 n. 189, and it matters for what the file actually is:

> "The background tape for Oigu-S has been released on a retrospective
> compilation album More Arctic Hysteria / Son Of Arctic Hysteria: The Later
> Years Of Early Finnish Avant-Garde (LXCD 647) by Love Records in 2005."

So this one track is **not** from the 2002 compilation the other ten came off,
which is why its `derived-from-corpus-range` bracket was wrong twice over: wrong
width and wrong parent release.

Both halves of the §0 rule are visible here. "Early 1964" does not narrow the
start, so the bracket opens on 1 January 1964. The contest of 4 April 1964 is a
dated event the tape has to precede, so the bracket closes on that day.

⚠️ **UNRESOLVED, AND LEFT UNRESOLVED.** `kurenniemi-sources-2026-09.md` reports
the Appearances CSV giving `19640300` for Oigu-S, which is March 1964. That sits
inside this bracket and does not contradict it. The two are not reconciled here,
and they may describe different events (a session against a performance).

### 2.6 Kaukana väijyy ystäviä

`ia:videoplayback-13_202304/M.A. Nummisen sähkökvartetti - Kaukana väijyy ystäviä (64 kbps).mp3`

| | |
|---|---|
| before | `1963–1973` · range · `derived-from-corpus-range` |
| after | `1968–1970` · range · `ojanen-2020-thesis-p116-p216` |

READ, p. 114: *"Sähkökvartetti typically played one improvised piece entitled
Kaukana väijyy ystäviä (1968, Engl. Far Lurking Friends), the duration and
structure of which varied from one performance to another."*

READ, p. 216:

> "The Sähkökvartetti (instrument) was used in several live performances by
> Sähkökvartetti (the band), but only three recordings have survived."

The three, READ at pp. 116, 216 and 217: the Kommunikaatiokonsertti of
**25 November 1968**, an excerpt recorded by Yle for the television documentary
*Ungdom för helvete!* (**1969**), and Sähköinen tapahtuma Vanhalla on
**17 November 1970**. READ, Table 7 p. 211: the band played about fifteen times
between **August 1968 and November 1970**.

INFERRED: the work is dated 1968, but the file is a recording of one performance
of an improvisation whose shape changed every time, and **which of the three it
is cannot be told from anything in the corpus**. MEASURED: the file is 96.2 s,
while the thesis says performances ran "from a few minutes to one-and-a-half
hours", so it is an excerpt of one of them and the duration identifies nothing.
Dating it `1968` would assert a performance date the source does not support.
The bracket is the band's whole working period.

### 2.7 Katkelmia äänikirjeestä Jan Barkille

`ia:videoplayback-13_202304/Erkki Kurenniemi - Katkelmia äänikirjeestä Jan Barkille (1963) (320 kbps) (1).mp3`

| | |
|---|---|
| before | `1963` · year · `filename-year` |
| after | `1963-08` · month · `ojanen-2020-thesis-p89` |

READ, p. 89:

> "In August 1963, Kurenniemi, Donner, Salmenhaara, Kaj Chydenius, and Raija
> Mattila produced a tape collage Äänikirje Jan Barkille (1963; Engl. Sound
> Letter to Jan Bark) as a tribute to Swedish composer Jan Bark, who had given a
> composition course in Helsinki during August 1963 (Kuljuntausta 2008, 208).
> Parts of tape collage were recorded in various locations. The project was
> directed by Chydenius, according to whose instructions Kurenniemi spliced the
> final work."

A year off a filename replaced by a month off a book, plus five named authors the
file name credits to one person.

### 2.8 Antropoidien tanssi: the year did not move and its evidence did

`ia:videoplayback-13_202304/Erkki Kurenniemi - Antropoidien tanssi (Love Records, 1968).mp3`

| | |
|---|---|
| before | `1968` · year · `filename-year` |
| after | `1968` · year · `ojanen-2020-thesis-p121` |

READ, p. 121:

> "Later on, Kurenniemi selected three segments from the tape he recorded with
> Andromatic and simply spliced them together without further processing to
> complete the commissioned work. The eventual title of Kurenniemi's work on the
> album was Antropoidien tanssi (Engl. Dance of the Anthropoids, 1968)"

> "Perspectives '68: Music in Finland (Love records, LRLP 4), which was released
> jointly by The Student Union of the University of Helsinki (HYY) and the newly
> founded record label Love records to honor the 100th Anniversary of HYY in
> November 1968. The production of the album and collaboration with Love records
> were settled at the meeting of the HYY executive committee on June 19, 1968.
> Meanwhile, the draft contract between HYY and Love records and the initial
> production plan for the album contents were discussed by the anniversary
> planning committee on May 30, 1968."

🔴 **NOT NARROWED TO NOVEMBER 1968, AND THE NOTES DOCUMENT PROPOSED THAT IT
SHOULD BE.** `ojanen-ekis-notes.md` §4 row 12 scores this "year to a month". It
is refused. November 1968 is when the **album** came out; the tape was recorded
with the Andromatic earlier and spliced at some point before the pressing. This
file's own `precisionConventions` already refuses exactly this move for
MusicBrainz: *"The eleven tape titles all report 2002, which is the CD, so they
are written here with NO date rather than a confident wrong one."* A release
month is not a recording month, one unit down.

What the row gains instead is real: its year stops resting on a filename and
starts resting on a page, and the three dated bounds (30 May, 19 June, November
1968) are in the note with the deposited draft contract, `zenodo:4290689`.

### 2.9 🔴 On-Off: THE DATE GOT WIDER, ON PURPOSE

`ia:videoplayback-13_202304/Erkki Kurenniemi - On-Off.mp3`

| | |
|---|---|
| before | `1963` · year · `wikidata-title-match` |
| after | `1962–1963-07-11` · range · `ojanen-2020-thesis-p89` |

**This will read as a regression in a diff and it is the strongest result on the
page.** A ten-year band being cut to a year is arithmetic. A one-year band being
opened to eighteen months is a judgement, and it is the one the source forces.

READ, p. 88:

> "The two first standalone tape music works from the studio were Kurenniemi's
> On-Off (1963) and Erkki Salmenhaara's White Label (1963), both of which
> premiered at the Jyväskylän Kesä festival on July 11, 1963."

READ, p. 89, the whole of the argument, verbatim:

> "Kurenniemi associated the critical comments and the move to the cellar with
> his recording session of On-Off, which could have happened at the end of 1962.
> The container of the On-Off master tape does not include any date markings.
> [...] However, according to the university's annual report for the academic
> year 1963-64, the studio moved to the cellar in the fall of 1963. **The exact
> dates of the move, and of Kurenniemi's On-Off session remain unknown.**"

Three facts under that, all READ at p. 89 and its footnotes: the memory is
Kurenniemi's own, given in a 2004 interview with Ojanen and Suominen (n. 113);
the physical master tape carries no date (n. 114, and it is photographed at
`10.5281/zenodo.3601403`, which is already a row in this corpus as
`zenodo:3601403`); and the contradicting annual report is quoted in Finnish in
full (n. 118).

**What the old date was.** `wikidata-title-match` means: no date on the file, a
Wikidata work with the same normalised title carries `+1963-00-00T00:00:00Z`, and
its declared precision was inherited whole. That is a year with a plausible
provenance and no evidence in it about this tape.

⚠️ **AND IT CONTRADICTS A PROPOSAL IN THIS PROJECT'S OWN RESEARCH.**
`kurenniemi-sources-2026-09.md` §1.1 proposes moving On-Off to **January 1963**
on the Appearances CSV cell `19630100`, scored as "10 yr to 1 month". That
proposal is **not taken**. INFERRED, and this is the reasoning rather than a
preference: the CSV records an *appearance* under a `yyyymm00` convention, the
prose records a *recording session*, and they are by the same author. Reading the
CSV cell as a recording date produces a claim the author contradicts in prose on
a numbered page. A tighter wrong date is worse than a looser right one, because
only one of them can be undone by a reader.

**Why this bracket.** The lower edge is the whole of 1962, because "the end of
1962" is a qualifier with no defined width (§0) and the memory is anyway
contested by a document. The upper edge is 11 July 1963, the premiere, which the
tape has to precede. The disagreement is carried rather than resolved, which is
what `kurenniemi-archive-2026-08.md` §5b's tratteggio idea was for.

### 2.10 The three instrument rows: corroborated, not moved

Table 3 (printed p. 81) is a complete instrument chronology with build years and
quantities. MEASURED against the corpus: it agrees with all three instrument
rows already in it and moves none of them. Each row gained one sentence in
`when.note` and nothing else.

| id | title | corpus date and its evidence | Table 3 |
|---|---|---|---|
| `eu:09102/_SMS_MM_X5176` | DIMI-A (Stockholm) | `1970`, from a Europeana length literal | DIMI-A, **1970**, 2 built |
| `fng:646207` | Dimi-O | `1971`, National Gallery yearFrom/yearTo | DIMI-O, **1971**, 1 built |
| `fng:382248` | Dimi-S | `1972`, National Gallery yearFrom/yearTo | DIMI-S, **1972**, 2 built |

The DIMI-A row is the one worth the sentence. Its `how` is `edm-literal-length`,
which is a year read out of a *length* field, and it was the weakest date
evidence of the three. It now has a second, independent source saying the same
year. The value did not change and the confidence did, which is the only kind of
corroboration worth recording.

---

## 3. What the thesis did NOT give, which is also a result

### 3.1 Two records get nothing, and they stay exactly as they are

**`Virsi`** (`ia:videoplayback-13_202304/Erkki Kurenniemi - Virsi (64 kbps).mp3`,
still `1963–1973`). MEASURED on the 320-page extraction: `Virsi` appears **zero**
times as a word. The one match is inside `valitusvirsi`, in an untranslated
Finnish title in a footnote on p. 133. A 293-page study that catalogues this
composer's works and does not mention a title is weak evidence about that title
and no evidence at all for a date. It keeps its ten-year band, and it now sits
second in `/tapes/`'s run between two records that got narrowed, which is the
picture doing its job.

**`Computer Music`** (`ia:computer-music-1966-dir.-erkki-kurenniemi/…mp4`, still
`1966` from the filename). MEASURED: **no Kurenniemi work titled *Computer
Music* appears anywhere in the thesis.** Every occurrence of the phrase is either
a journal name (*Computer Music Journal*), a seminar name (the UNESCO Computer
Music seminar, p. 225), a Sibelius Academy course title (p. 119), or **Osmo
Lindeman's** *Computer Music for Stereophonic Tape* (p. 129 n. 265, Yle
Programme ID 000102029, also known as *Datamaskinmusik för stereoband*). That
last one is a different composer, a different work and a 1969 date, and it is a
name collision to stay away from rather than a lead.

### 3.2 No records were added, and that is the finding about Zenodo

MEASURED on the corpus: all 24 Zenodo rows were listed and compared against every
Zenodo deposit the thesis cites. **Every one of them is already in the file**,
including the thesis itself (`zenodo:4306056`), the On-Off master tape photo set
(`zenodo:3601403`), the Appearances dataset (`zenodo:5678270`), the HYY and Love
Records draft contract (`zenodo:4290689`), the annotated video of the Bach
arrangement master tape (`zenodo:1469722`) and the EKIS user interface charts
(`zenodo:3596466`).

So the thesis adds **zero** pointers and corrects **eleven** records. That is a
useful shape to know: the Zenodo sweep in `build-corpus.mjs` had already caught
this author's whole deposit, and what the book adds is not more objects but a
reading of the ones already here.

---

## 4. 🔴 Instruments were considered for the corpus and REFUSED

Table 3 (p. 81) is thirteen rows of instrument, year and quantity built, and it
is the most citable thing in the thesis. **None of it was added as records**, and
this section exists so that decision is not re-litigated from scratch.

**Reproduced here instead**, READ, p. 81, which is where it belongs:

| instrument | year | qty | description |
|---|---|---|---|
| The 1st digital music system (later *sähkö-ääni-kone*, *System-1*, Integrated Synthesizer) | 1964-68 | 1 | three-piece modular synthesizer and sound processor, digital and analog modules |
| Electric quartet | 1968 | 1 | collective instrument for four players, mobile controllers, 10-step sequencer |
| Andromatic (automatic Andromedean) | 1968 | 1 | polyphonic synthesizer with a 10-step sequencer |
| DICO (digitally controlled oscillator) | 1969 | 1 | monophonic synthesizer, 12-step sequencer, digital memory |
| DIMI-A (associative memory) | 1970 | **2** | two-voice synthesizer, 256-step sequencer, digital memory |
| DIMI-O (optical input) | 1971 | 1 | polyphonic synthesizer, 32-step sequencer, video interface |
| DIMIX (mixer and digital patch bay) | 1971 | 1 | mixing console, digitally controlled patch bay, video-camera connection |
| DIMI-U (universal) | 1971- | **0** | modular music production system, **none built** |
| DIMI-S (sexophone) | 1972 | **2** | controlled by the skin resistance of players |
| DIMI-P (programmable) | 1972- | **0** | programmable studio system, **none built** |
| DIMI-T (thinking; *Electroencephalophone*, *α/θ cyborg*) | 1973 | 1 | oscillator controlled by the player's EEG signal |
| DIMI 6000 | 1973-75 | **2** | computer-controlled analog synthesizer |
| DIMI-H (harmonies) | 2005 | 1 | software instrument from his mathematical theory of harmonies |

**Four reasons it does not go in the corpus.** The first is the only one that
would be enough on its own.

1. **A row here is a pointer to something somebody else HOLDS.** The file says so
   in its own `note`: *"Every row is a POINTER to something somebody else holds: a
   title, a date, who holds it, its identifier there, one URL and a licence.
   Nothing is copied."* MEASURED: all 334 rows carry a non-empty `holder`,
   `sourceId` and `url`, and `/resources/` asserts on exactly that. A Table 3 row
   has no holder, no identifier anywhere and no URL of its own. It is a claim in a
   book about a class of object, not the object.
2. **Two of the thirteen were never built.** There is nothing to hold and nothing
   to point at, and a row whose `url` pointed at a page of a PDF would be a row
   about a citation wearing the clothes of a row about a thing.
3. **One `when` model cannot mean two things.** For every row in this file `when`
   is when the object is from. For DIMI-U it would have to mean when a design was
   drafted for a machine that does not exist. The brief for this work put it
   exactly right: a corpus with two kinds of thing in it and one `when` model is
   worse than a corpus that is only one thing.
4. **Nothing would regenerate them.** `build-corpus.mjs` enumerates APIs. Table 3
   has no API behind it, so thirteen hand-typed rows would be thirteen rows that
   vanish on the next build with no error, which is the failure mode this repo has
   paid for more than once.

⚠️ **And instruments are not absent from the corpus.** Three are already in it,
as museum objects with catalogue numbers, and §2.10 is what Table 3 could
honestly do for them. The distinction that matters is not "recording against
instrument", it is **object somebody holds against claim in a book**.

---

## 5. What was checked, and the numbers

MEASURED 2026-09-15, in this order.

**Before, both demos, run together:** `resources` **14/14**, `tapes` **FAIL on
`__demo.ready`** with a leftover headless Chrome of mine alongside the suite.
Re-run alone per the rule in CLAUDE.md: `tapes` **24/24 green**. So the baseline
is **14/14 and 24/24**, and the first run was competing with itself.

**After:** see §5.1 below for the run.

**Invariants, MEASURED on the amended file:**

```
parses ok, items 334, sources 17
ledger sums to 334                      (matches items: the sources assert holds)
dated 275, counts.dated 275             (unchanged: no row gained or lost a date)
earliest year 1894, latest year 2026    (inside the 1800-to-today assert)
bad brackets 0                          (every latest is greater than its earliest)
blank rows 0                            (kind, title, source and url all present)
refused 6, mute 0                       (every refusing row still says what it answered)
```

**The order `/tapes/` now lays the run in**, MEASURED by replaying the page's own
sort against the amended file. It was thirteen dated records mostly piled on
1 January 1963 by the compilation's span; it is a chronology now:

```
 0  1962–1963-07-11  On-Off
 1  1963–1973        Virsi                       <- the one the thesis says nothing about
 2  1963-08          Katkelmia äänikirjeestä Jan Barkille
 3  1964–1964-04-04  Oigu-S
 4  1966             Computer Music              <- probably not his, see 3.1
 5  1967             Saharan uni I
 6  1967             Saharan uni II
 7  1968–1970        Kaukana väijyy ystäviä
 8  1968             Antropoidien tanssi
 9  1970             Inventio / Outventio
10  1971             Sähkösoittimen ääniä
11  1971             Sähkösoittimen Ääniä
12  1973             Mix Master Universe 2
13-23                the eleven with no date at all
```

⚠️ **One consequence worth stating before somebody finds it.** `/tapes/` calls
`select(0)` on the first tape in that order. It was *Inventio / Outventio*
(235 s) and it is now **On-Off** (770 s, 12.3 MB), because On-Off is now the
earliest dated record in the corpus. Nothing in the asserts is about which tape
that is, but the detail lines of three of them quote it, so a diff of the run
output will show a different title and a different duration for a reason that is
not a fault.

### 5.1 The run after the change

`node demo/verify.mjs resources tapes`, MEASURED 2026-09-15, **38/38 green**:
`resources` **14/14** and `tapes` **24/24**, the same counts as the baseline, with
one other headless Chrome of somebody else's running alongside it and no failure
to re-run alone. The asserts on both pages are about the run and the table rather
than about dates, and they did not move.

Three detail lines changed and all three are the consequence named above:

| assert | before | after |
|---|---|---|
| the tape says how long it is | `235 s of tape, from archive.org` | `770 s of tape, from archive.org` |
| one mark is the tape you are hearing | `it is Inventio _ Outventio` | `it is On-Off` |
| the playhead follows the tape | `47917 ms` | `154644 ms` |

The third is the keyboard seek landing at a fraction of a longer tape. None of
the three is a claim about a date.

---

## 6. Left open, deliberately

1. **Nothing reads `when.how` or `when.note`.** §1. A date whose evidence a
   reader cannot see is a date a reader has to take on trust, and this corpus now
   holds fourteen of them with a printed page number attached.
2. **The amendment does not survive a rebuild.** §1. The eleven archive.org rows
   need the same `when` in `proto/deck/corpus.json`, or `build-corpus.mjs` needs
   an overrides table. Every value needed is in §2 of this document.
3. **Four duplicate rows in `videoplayback-14_202304` stay undated.** On-Off,
   both Sähkösoittimen tracks and Antropoidien tanssi exist twice in the corpus,
   from two archive.org items. The `-13` copies are folded in from the deck with
   date evidence; the `-14` copies carry `archive-org-has-no-work-date` and are
   untouched. INFERRED: they are the same recordings and the thesis dates them
   too, so the asymmetry is structural rather than principled. Not fixed here
   because it would move four records onto the axis on an inference rather than a
   reading.
4. **`#1` against `#4`.** §2.1.
5. **Oigu-S: the CSV's `19640300` against the thesis's "early 1964".** §2.5.
6. **Table 7 against the Appearances CSV.** Not diffed, per
   `ojanen-ekis-notes.md` §7, and a diff would probably sharpen two or three more
   of these rows.
7. **Photographs.** READ, printed p. ii: the CC-BY licence excludes the
   photographic content listed on pp. viii-xi. Nothing visual from the thesis is
   used here, and nothing should be.
