# plan-archive-timeline — 1965 on the line, played from ERR

Status: **not started.** Written 2026-09-08, out of `take`/`keep` and the §−1
archival horizon. Proposed slug **`reel`**, Act 5 (*archives*), directly after
`flipper`.

Read `demo/take/index.html` first — this is that page with the material
replaced, and every place the replacement bites is a section below. Read
`research/err-archives-2026-08.md` and `research/err-remixer-2026-08.md` for
what was measured about ERR in August; everything marked **✅ 2026-09-08** here
was re-probed while writing this, from this machine, in Estonia, at ≤1 request
per 1.2 s.

---

## 0. One line

Two hundred and ninety-eight films ERR first broadcast in 1965, laid on one line
at the dates they were shown, and any one of them plays and scrubs where it
sits. The line is a year wide, the material is sixty-one years old and not ours,
and neither of those is a decoration: they are the two things that break `take`.

---

## 1. What is actually reachable

### Confirmed, and re-confirmed today

| thing | status |
|---|---|
| `GET arhiiv.err.ee/api/v1/content/video/{slug}` | ✅ 2026-09-08 — 200, `access-control-allow-origin: *` **with an `Origin: https://positron.studio` header present**, `cache-control: public, max-age=10`. A browser on our origin can read it directly. |
| `POST arhiiv.err.ee/api/v1/search` | ✅ measured 2026-08-27, unchanged assumption — the *response* carries ACAO but the OPTIONS preflight forced by the JSON content type answers **204 with no ACAO**, so a browser cannot call it. `text/plain` (preflight-free) → upstream 500. |
| media, `vod.err.ee/hls/vod/{hash}/v/master.m3u8` | ✅ 2026-09-08 — 200, ACAO `*`, `access-control-allow-methods: GET, HEAD, OPTIONS`, `accept-ranges: bytes`, `cache-control: max-age=172800`. |
| format | ✅ 2026-09-08 — **HLS, fMP4** (`#EXT-X-VERSION:6`, `EXT-X-MAP` init + `.m4s` fragments), `#EXT-X-PLAYLIST-TYPE:VOD`, `#EXT-X-ENDLIST`, 10 s segments. Three renditions 704×396 / 1280×720 / 1920×1080, all 25 fps, `avc1` + `mp4a`. Audio is a **separate rendition group**, not muxed. |
| seek | ✅ 2026-09-08 — a **mid-file** fragment (`fragment-10`, i.e. 90–100 s in) answered `206`, `content-range: bytes 0-1/1972483`, ACAO `*`. Plus `PLAYLIST-TYPE:VOD` with `ENDLIST`, which is what lets a player seek anywhere without guessing. |
| encryption | ✅ 2026-09-08 — no `EXT-X-KEY` anywhere in master or media playlist. |
| playing it in a browser | ✅ measured 2026-08-27 (`proto/remixer`, headless Chrome 151): 1965 video, attach→canplay 302 ms, play→advancing 325 ms, **740 real presented frames in 30 s at ~24.7 fps**, zero media errors, zero 403s across three runs. |
| no clock in the stream | ✅ 2026-09-08 — grepped the master and the 177-segment media playlist for `EXT-X-PROGRAM-DATE-TIME`, `EXT-X-KEY` and `EXT-X-I-FRAME`: **zero hits, all three**. ⚠️ Not checked: `USP-X-TIMESTAMP-MAP` (present on the LIVE stack) and in-band ID3, which needs `ffprobe` on a fragment rather than a header read. §3 is about this. |

### The 403 question, answered as far as it has been asked

CLAUDE.md records that **ERR blocks LIVE segments by programme, not by age** —
403 with no ACAO, which reaches a browser as a CORS failure and leaves hls.js
holding an empty buffer and a black cell. `flipper` sweeps back from the edge
with a two-byte Range GET because of it.

**Nobody has run that sweep on the archive.** What exists:

- ✅ 2026-09-08, n = 2 items, 2 segments (one first, one mid-file): both `206`,
  both ACAO `*`.
- ✅ 2026-08-27, n = 6 items played end to end in `proto/remixer`: **zero
  403s**.

That is eight data points against an origin with 79,422 video items. It is
evidence that the archive is *not obviously* gated the way live is; it is not a
sweep and must not be quoted as one. **The honest statement is: the archive has
never been probed for per-programme refusal, and the probe that would settle it
is `flipper`'s, unchanged** — a two-byte Range GET across N items × M positions.
Name it as work (§7, P4), do not assume the answer.

Two further unknowns, stated as unknowns:

- **Geo.** ERR's archive FAQ says "ERRarhiivi saadetel puudub territoriaalne
  piirang" (no territorial restriction). Every measurement this project has
  made was from Estonia. ⚠️ Untested from outside.
- **URL stability.** Video media is **hash-addressed**
  (`/hls/vod/77208308228006ac581bb465baeca880/v/`), audio is filename-addressed.
  The research's own rule stands: store `{type, slug}`, re-resolve the media URL
  at play time. A stored hash is a 404 waiting for a re-encode.

### What this forces on the architecture

The search endpoint is the only one a browser cannot reach, and the deployed
`workers/view/src/index.js` already proxies it at `POST /api/search` (same-origin
only, Gate DO cache, `/api/item/{type}/{slug}` beside it). **The demo will not
use it**, for one reason: `demo/server.mjs` is static-only, and `verify.mjs`
starts *that* server. A page that searches at runtime is green on the deploy and
red under the harness — the exact "true explanation that is not THE explanation"
shape of LESSONS #29.

So: **the line is a committed fixture; the film is a live fetch.**

---

## 2. What a lane is here, and what a part is

In `take` a lane holds takes recorded now, one after another. Nothing about that
survives except the word.

**A lane is a series.** `proto/megatimeline` already proved this doctrine and
called it *tracks are queries*: at year zoom it replaces the three type tracks
with lanes derived from each item's `navigationLinks[type: 'series']`, top 7 by
count, everything else pooled into "muu / other" — **zero new data layer, lanes
group what the loader already fetched**, verified at 8 lanes / 809 items.

For 1965 video that resolves to almost nothing, and the numbers are worth
printing because they are the whole reason "a couple of lanes" is the right
scope. From the committed `proto/megatimeline/search-cache.jsonl` (298 hits,
zero upstream cost):

| series | items |
|---|---|
| `AK filmikroonika 1958-1991` | **282** |
| `Saadete algmaterjalid 16mm filmilt` | 6 |
| (no series) | 10 |

Date span `1965-01-04` → `1965-12-31`; by month
27 / 19 / 25 / 22 / 39 / 25 / 46 / 28 / 21 / 17 / 19 / 10. All 298 carry a
thumbnail path.

So **two lanes**: `AK filmikroonika` (282) and `everything else` (16, of which 6
are the 16 mm rushes series). Not three, because a lane of 6 beside a lane of
282 beside a lane of 10 is three ways of saying "the newsreel, and a handful".
The pool's gutter says what is in it.

**A part is one catalogue item** — one programme, one playable file, the same
word `take`, `keep` and `loops` use for a container placed on a line. Nothing is
specialised.

**An event is one shot from ERR's own shot list**, and this is the specialisation,
justified the way `keep` justified dropping `slices`. `take` has a slices lane
because MediaRecorder's timeslice behaviour is its subject; `keep` dropped it
because a take is stored as one file and the lane would draw an implementation
detail. Here there is something with genuine sub-programme time in it, and it is
not ours:

```
description.data[] = [{ beginTime, endTime, readableBeginTime,
                        readableEndTime, content, photoUrl }, …]
```

✅ 2026-09-08, `ak-filmikroonika-1958-1991-suusatamine-otepaal`: **five shots,
contiguous, in milliseconds** — `0 → 289760`, `289800 → 697920`,
`697960 → 1030480`, `1030520 → 1328480`, `1328520 → 1775720`, each with a
sentence of description and a still. The 3-minute item has exactly one.

That is a real event lane out of the catalogue, it is the only thing in the
whole record that says *where inside the film*, and it is what makes a seek
mean something to a reader: jump to 11:38 and you are in *naiste 5 km*. It
earns its lane. It also **does not fit inside the material** — §3.

---

## 3. The clock problem

`take` burns the position on the line into every frame, so a scrub checks
itself with no arithmetic. `keep` burns wall time *before* the picture crosses
the wire, so the receiving side cannot fake it. **Archive video has no burned
clock and never will**, and there is no in-band substitute: no
`EXT-X-PROGRAM-DATE-TIME`, no ID3, no `EXT-X-KEY`, nothing (✅ 2026-09-08).

Do not paper over it. State what replaces the check, in three tiers.

### Tier 1 — what the transport can still prove about itself

Unchanged from `take` and `seek`, and deterministic:

- the seek reports what it **got**, not what it asked: the `seeked` event's
  `currentTime`, turned into a line position through `part.at`, differenced
  against the asked position. `take` already asserts exactly this.
- `deck.reduceAt(kind, pos)` folds exactly at every event boundary ±1 ms.
  `demo/seek` does this today over a pre-existing show with **24 probes at each
  of 8 cues plus a 5-stop seek sweep**, and asserts *no retroactive burst* — a
  cue firing >1.5 s after its own position. Every one of those checks transfers
  to the shot list unchanged, and none of them touches a pixel.

This proves the arithmetic. It proves nothing about the picture.

### Tier 2 — the check that actually replaces the burned clock

**Two independent sources exist for one number, and they disagree.**

| item | catalogue `Kestus` | Σ `EXTINF` from the manifest | apart |
|---|---|---|---|
| `…-1-mai-demonstratsioon-kohtla-jarvel` | 181,000 ms | **180,840 ms** (19 segments) | −160 ms |
| `…-suusatamine-otepaal` | 1,776,000 ms | **1,768,840 ms** (177 segments) | **−7,160 ms** |

✅ both 2026-09-08. And a third source agrees with the catalogue and not with
the media: the shot list's last `endTime` is `180,880` and `1,775,720` — within
280 ms of `Kestus` on both, and **6,880 ms past the last frame** on the second.

This is the check. It is not a tautology (one item agrees to 0.16 s, one
disagrees by 7.2 s), it needs no pixels, and it is the only thing on this page
that can say *the file you got is the file the catalogue describes* — or say by
how much it is not.

It has a consequence that must be designed in, not discovered: **the part's
length on the line comes from the media, never from the catalogue.** Take the
catalogue's number and the last seven seconds of the line are a place the
picture cannot go, and the last shot boundary sits past the end of the film.

### Tier 3 — the picture moved

The strongest available pixel claim, and it must be stated for exactly what it
is. Seek to two positions ≥30 s apart inside one film, draw each frame into a
scratch canvas, and require the mean absolute difference to clear a floor.
**That proves the picture changed when the playhead moved. It does not prove
the picture is from 1965.**

Mechanics: under hls.js the element's source is a same-origin blob URL, so
`getImageData` is untainted. Under WebKit's native path (`video.src = <m3u8>`)
the pixels come from `vod.err.ee` and the element needs
`crossOrigin = 'anonymous'`; vod.err.ee sends ACAO `*` so it should work, ⚠️
untested. `keep` does the same readback (`readBurnedFrom`) against a WHEP
stream and is the working precedent for the canvas side.

### What cannot be asserted, said out loud on the page

**That these pixels are from 1965.** The claim is ERR's, made in their
catalogue, and this page repeats it with attribution rather than measuring it.
Everything the page *can* check is above. The evidence chain that does exist is
worth showing, because it is unusually good for archive material:

```
Faili nimi      19650126_SPORT_XHD_SUUSATAMINE-OTEPAAL
Kandja tüüp     FILM 16mm m/v negatiiv helita
Võtte aasta     1965
dateCombined    Esmaeeter 21. märts 1965
```

A 16 mm black-and-white negative **without sound**, shot in 1965, first aired
21 March 1965 — and note the filename says 26 January, which is the *shooting*
date, not the air date (§7, T6).

---

## 4. Time — the position domain

**Decided: the line is positioned in 1965 wall time, absolute epoch
milliseconds, which are NEGATIVE.**

```
1965-01-01T00:00:00Z   = -157,766,400,000 ms
1966-01-01T00:00:00Z   = -126,230,400,000 ms
span                   =   31,536,000,000 ms  (365 days)
```

The alternative — playback time from zero, films butted end to end — is what
`proto/remixer` does, and remixer says so in its own report string:
`anchor: 'arrangement-offset (chosen, NOT attested sync — items carry no
timecode)'`. That is the right answer for a chord instrument. It is the wrong
answer here, because it throws away the only fact the archive is certain about.
This is the first demo where the archival horizon and the timeline library
actually meet, and the meeting *is* the position domain.

Positioning in 1965 also lights up machinery that already exists and has never
had a client: `timeline/strip.mjs` reaches from 1 ms to 10 Gyr on one ladder,
and `normalizeWhen` in `timeline/transport.mjs` is built for exactly this
catalogue's imprecision.

### 4a. Findings — negative positions have never been run

Checked in the source, not assumed:

1. **`createDeck` does not seek into its own range.** `createTransport` starts
   at `p0 = 0`; `clamp` is `Math.max(span[0], Math.min(span[1], p))` and only
   runs inside `seek`/`sync`/`setRange`. So a deck constructed with
   `range: [-157766400000, -126230400000]` **starts with its playhead at
   1970-01-01, five years to the right of the whole range**, and stays there
   until something seeks. `setRange` *does* re-clamp
   (`const p = transport.position(), q = clamp(p); if (q !== p) …`), which is
   why `flipper` gets away with it. **The page must `deck.seek(range[0])` as its
   first act, and assert it** (A2). Nothing else in the repo has run a deck
   below zero.
2. **Everything else is sign-agnostic.** `setRange` demands only `max > min`;
   `observePosition`, the scheduler's `setTimer(Math.max(0, delayMs))` and the
   strip's `x(t)`/`tAt(px)` are all relative. `Math.max(0, …)` appears in
   `strip.mjs` four times and every one is pixel space.
3. **`formatTime`'s automatic absolute/relative detection is wrong for 1965.**
   `createStrip` line 870:
   `absolute: opts.absolute !== undefined ? opts.absolute : !!(deck.range && deck.range[0] > 1e12)`.
   `|-1.578e11| < 1e12`, so the guess says *relative* and the axis prints
   `-1826d` where it should print `1965-05-01`. The blind spot is exactly
   **1938-04-24 → 2001-09-09**, which contains every date the archival horizon
   cares about — and the code's own comment saw the collision from the other
   side ("a 60-year ERR relative domain is the same magnitude"). Fix: pass
   `absolute: true` explicitly. No library change; but the default is a trap
   and belongs in LESSONS.

### 4b. What the tick ladder actually produces — measured, not hoped

`tickLOD(pxPerSecond)` picks the MAJOR first (must clear 68 px) then the
smallest MINOR that clears 7 px **and divides the major**. Run against a
950 px plot (1100 px card − 150 px gutter):

| view | major | minor | major px |
|---|---|---|---|
| the whole of 1965 | **30 days** | 7 days | 78.1 |
| one month | **7 days** | 6 hours | 221.7 |
| one day | 2 hours | 15 min | 79.2 |
| a 3:01 film | 15 s | 5 s | 78.8 |
| a 29:36 film | 5 min | 15 s | 161.1 |

So **days and months are what the axis reads at the spans these programmes sit
at** — the constraint is satisfied by the shipped ladder, with one caveat that
must be stated rather than glossed:

**The 30-day major is not a month.** `drawAxis` places ticks at
`ceil(t0/major)*major` — multiples of the interval counted from the Unix epoch,
never calendar-aligned. `DAY`, `2·DAY` and `7·DAY` *are* midnight-true, because
86,400,000 divides the epoch exactly (a week tick is a Thursday). `30·DAY`,
`91·DAY`, `182·DAY` and `YR` are not: near May 1965 the 30-day majors fall on
`1965-03-28 · 1965-04-27 · 1965-05-27 · 1965-06-26`, and the year tick nearest
1965 is `1966-01-01T00:43:12Z` because `YR = 365.2425 · DAY`. The ladder's own
comment says why this was left alone — *"a year is not a whole number of 91-day
steps, so the search would never reach year ticks"*.

**Decision: accept it, and label honestly.** The reader sees real ISO dates a
month apart on a regular grid, which is a calendar reading. A calendar tick
source (ticks on the 1st of each month) is a second tick generator inside
`drawAxis`, it would need its own LOD rung, and it buys alignment nobody asked
for. Named as a possible follow-up, not built.

### 4c. Two defects in the axis labels, and the one option that fixes both

`formatTime(ms, major, absolute)` with `absolute = true`:

- `major >= DAY` → `new Date(ms).toISOString().slice(0, 10)` → `1965-05-01`. ✅
- `major >= MIN` → `new Date(ms).toTimeString().slice(0, 5)` → **local** time.
- `major >= SEC` → `toTimeString().slice(0, 8)`.

Two things break at once. **The axis silently changes time zone** between the
day view (UTC date) and the two-hour view (local time) — ✅ measured on this
machine, `1965-05-01T00:00:00Z` labels as `03:00:00`. And **the time of day is
not a fact**: these items are day-precise at best, their `at` is midnight UTC by
convention, and printing `03:00:00` beside a film is a fabricated number of
exactly the class CLAUDE.md bans.

**Decision: one new option on `createStrip`, `axisFmt`, defaulting to
`formatTime`.** The page supplies the words:

```
major >= DAY   →  '1965-05-01'                    (the calendar, from the line)
major <  DAY   →  '1:12'                          (elapsed into the film picked)
no film picked →  ''                              (nothing can answer)
```

That is CLAUDE.md's *a number belongs to the lane that can answer for it*
applied to an axis: above a day, the year answers; below a day, only the film
can, and it answers in film time. One option, one default, no existing page
changes.

### 4d. The transport bar's readout

`clock(ms, absolute)` today gives `0:03.910` or, with `absolute`,
`new Date(ms).toISOString().slice(11, 23)` — a bare time of day. And `paint()`
prints `clock(pos) / clock(range[1] - range[0])`, so a year-wide range renders
as `525960:00.000`. Both are meaningless here.

**Decision: one new option on `createTransportBar`, `fmt: (pos, range) =>
string`, defaulting to today's `clock` pair.** Transport UI is
`demo/shell/transport-bar.mjs` and nothing else, so the alternative — a page-local
time element beside the bar — is not available and should not be. The demo's
formatter:

```
browsing the year      1965 · 1 May
inside a film          1965-05-01 · 1:12 / 3:01
in a gap               1965-05-04 · no film · next in 3 days
```

### 4e. Rate, and how a 3-minute film is findable on a year

At year zoom a 3-minute film occupies **0.0054 px** (180,840 ms at
3.01e-5 px per second). Three answers, in order of how much they carry:

1. **The strip already draws it.** `bw = Math.max(1.5, xb - xa - gap)` — every
   span has a 1.5 px floor, so 298 films are 298 hairlines on a 950 px year and
   hover hit-testing works in time units with a pixel tolerance, so a hairline
   is pointable. **But the year is 0.384 days per pixel and they DO collide**:
   July 1965 holds 46 films across 81 px of axis, 0.57 films per pixel, and on a
   `stack: false` lane the overlaps merge into one bar. That is the honest
   argument for the aoristic density lane, and it moves it from "optional" to
   "the thing that makes July readable" — see P4.
2. **The strip zooms.** Wheel zoom about the cursor is on by default
   (`opts.zoom !== false`), pinch is implemented for touch about the midpoint,
   `fit(from, to)` frames any interval. **One deck, two views, and the tick
   ladder swaps the unit with no branch** — that is the "one that zooms"
   answer, and §4b is the evidence it works at these spans. Caveat: `fit()`
   runs once at construction (and once more on the first non-zero width), so a
   page that sets its range afterwards must call `view.strip.fit()` itself.
3. **Picking a film re-ranges the deck**, exactly as `flipper` re-ranges to a
   moving DVR window. `deck.setRange([part.at, part.at + mediaMs])` narrows the
   clamp to the film, `rangeGen` makes the bar re-derive on one integer compare,
   `view.strip.fit(part.at, part.at + mediaMs)` frames it. Pressing "the whole
   year" puts both back. The strip keeps drawing every lane in either view —
   `rows()` returns everything and the renderer virtualises — so the year does
   not vanish, it is just off-screen.

**Playback rate is 1x and the bar will say so as a static label**, not a slider:
`buildRates()` intersects `caps.rates` across declared adapters, there are none
here, and `mediaMaster` L1 forbids writing the element's rate anyway. Deliberately
rejected: playing the *year* at ~30,000× so films flicker past. It is a real idea
and it is incompatible with L1 — a video element cannot be the clock at that
rate. What it would need instead is a "jump to the next film" transport verb
armed as a committed one-shot, which the library already does and which is
listed as P4, not P1.

---

## 5. Rights

Not a footnote. What ERR's own FAQ says, verbatim from
`GET arhiiv.err.ee/api/v1/help`:

> "ERRarhiivi kasutamiseks pole vajalik sisselogimine … võimalik teostada
> arhiivis otsinguid, vaadata ja kuulata tele- ja raadiosaateid … ning jagada
> sisu linke."

No login; search, watch, listen and **share links** are blessed. Downloads are
offered only for material that is free or ERR-owned. And:

> "Arhiivides leiduvate materjalide … avalikku kasutust vahendab ERRarhiiv
> litsentsilepingute alusel."

Public use goes through licence agreements. The load-bearing distinction in
their text is **copies versus links**.

One measured signal on this exact material: ✅ 2026-09-08, both 1965 video items
returned `downloadUrl: ""`. Audio items carry one; these do not. So the
"free or ERR-owned" proxy the research identified says **no** for AK
filmikroonika. That is a fact about copies, and it does not touch streaming.

### What this demo may do

- **Stream** from `vod.err.ee` at play time, one film at a time, on a gesture.
- **Link** every part to its `info.fullUrl` on arhiiv.err.ee, visibly.
- **Commit catalogue metadata** — slug, title, series, date, duration. That is
  what a link is made of, it is the data ERR publishes to be searched, and it
  is not media.
- Name ERRarhiiv on the page, in the `what` paragraph, not in a footer.

### What it must not do, and this is enforced not promised

- **No caching, no re-hosting, no recording.** Nothing goes to R2,
  `demo/shell/ingest.mjs`, `selfrec`, localStorage, IndexedDB or a
  `URL.createObjectURL` over fetched bytes. The element gets a URL; the page
  never gets the bytes. A blob URL over ERR segments is a copy in the only sense
  that matters here.
- **No proxying media through our origin.** The worker's own header already
  draws this line — *"Nothing media-shaped is ever proxied or stored here."*
- **No canvas readback of thumbnails.** `arhiiv-images.err.ee` sends no ACAO;
  fine in a DOM `<img>`, taints a canvas. The frame-difference check in §3 reads
  the `<video>`, never a thumbnail. (⚠️ The per-shot stills at
  `/stratum/{id}/…jpg` 404 on `arhiiv-images.err.ee` — ✅ 2026-09-08 — so their
  host is unresolved and they are not used.)
- **Politeness.** One content GET per film picked, no prefetch, no polling.
  A harness run costs about one API request and a handful of media requests.
  Note the UA: a **direct** fetch from the page carries the browser's own
  user-agent, not the identifying string in `workers/view/src/index.js`
  (`elektron-view/1.0 (+https://positron.studio; … contact …)`). Only the
  fixture builder and the worker can identify themselves — which is a second,
  small argument for routing runtime item fetches through `/api/item` **once
  `demo/server.mjs` can answer it too**, and a reason not to today (T8).

### `built: true`?

**Recommendation: yes, from P1** — with the licence email sent in the same
breath, not afterwards.

The argument for. The page does precisely what the FAQ blesses — search results
turned into links, watched, shared — and copies nothing. `flipper` is already
`built: true` and public, embedding ERR's live HLS. Every demo page carries
`<meta name="robots" content="noindex, nofollow">`.

The argument that decides it. **`verify.mjs` filters on `built`**
(`DEMOS.filter((d) => d.built && …)`), and `build.mjs` skips unbuilt rows
entirely. So `built: false` means the suite never runs this page, which is
LESSONS #2 and #30 in one move: a demo nobody exercises, whose failures nobody
sees. The rights decision and the coverage decision are **one decision**, and
"safe" is not the safe option.

The condition. `HANDOFF.md`'s *Yours alone* already carries "the ERR licence
conversation, which gates anything public", and `research/err-archives-2026-08.md`
names the channel (`sirje.joesaar[ät]err.ee`, ~1 week). Send it at P0 with this
page described plainly: streams from your origin, stores nothing, links every
item back. **If the answer is no, `built: false` and no `page:` row is one
word**, the files stay in the repo, and nothing is deployed.

---

## 6. Asserts

Expect **15**, including the harness's own `__demo.ready`. Diff the count after
any change (CLAUDE.md).

### Mechanism — deterministic, no network, fired at load

These run before any control is pressed, which is both LESSONS #27 (*assert the
mechanism, not its downstream effect; an assert that has to wait gets written
tolerantly*) and CLAUDE.md's 400 ms settle rule satisfied at once — the page can
never read "asserted nothing".

- **A1 `the line is the year 1965, not a stopwatch from zero`** —
  `deck.range` equals `YEAR` = `[-157766400000, -126230400000]`, both ends
  negative, read from the same constant the deck was built with. Detail prints
  both numbers and both ISO dates. **At load only**: §4e.3 narrows the range to
  the picked film, so this is the state on arrival, not a standing invariant —
  which is why it fires before any control is pressed.
- **A2 `the playhead starts inside the line`** —
  `pos >= range[0] && pos <= range[1]`. This is the one that fails today if
  §4a.1 is forgotten; break it on purpose once (CLAUDE.md: *prove a guard
  fires*).
- **A3 `every day-precise film sits on its own broadcast date`** — for every
  row with no `when`, `new Date(part.at).toISOString().slice(0,10) ===
  part.date`. Proves the fixture→position mapping itself, not a picture. It is
  restricted to the crisp rows on purpose: a month-precise row's `at` is the
  first of its month and would fail this by design, which is A4's subject.
- **A4 `a film dated only to a month is positioned at the month's start and
  drawn across the month`** — every `when` row satisfies `at === when.earliest`
  (`normalizeWhen`'s U2 firing rule, enforced by the library and re-asserted
  here because it is what makes the smear honest), `latest - earliest` equals
  that calendar month's length, `kind === 'ignorance'` (a real day the catalogue
  lost, so narrowing is a repair) and `rule` matches `/@\d+$/`. And the
  day-precise rows carry **no** `when` at all — absence of `when` is the crisp
  fast path, and the library throws on a zero-width bracket rather than let a
  page fake one.
- **A5 `the axis reads in dates`** — `view.strip.report()` says
  `absolute: true`, `lod.major >= 86400000` at the year view, and the label at
  `range[0]` starts `1965-`.
- **A6 `exactly one film is under the playhead`** — `take`'s, unchanged.
- **A7 `the two lanes hold every film, and none twice`** — the lanes' row counts
  sum to 298 and their slug sets are disjoint.
- **A8 `nothing from ERR is stored`** — no key of ours in `localStorage`, no
  IndexedDB opened, zero object URLs created. A negative assert that makes §5 a
  mechanism instead of a comment.

### Evidence — needs the network, fired behind controls

- **B1 `the film ERR named is the film that loaded`** — the master URL played
  is the one this run's content GET returned for that slug, and hls.js reported
  `MANIFEST_PARSED` with ≥1 level.
- **B2 `the catalogue's length and the delivered length are both known`** —
  `Kestus` and `Σ EXTINF` (or `video.duration × 1000`) both finite; the
  **difference is printed, not bounded**, because the sample runs from 0.16 s to
  7.16 s. This is the burned clock's replacement and its number goes in the
  readout.
- **B3 `the shot list was measured against the material`** — every shot's
  `endMs` compared to `mediaMs`; the assert is that the comparison happened and
  the overhang is reported, with the count in the detail
  (`1 of 5 shots ends 6.9 s past the last frame`). Not `overhang === 0`: that
  is false on real data and the page's job is to say so.
- **B4 `a seek reports what it actually got`** — `take`'s, from the `seeked`
  event, `|got − asked|` in the detail.
- **B5 `the picture changed when the playhead moved`** — mean absolute pixel
  difference between two frames ≥30 s apart in one film, over a floor. The
  detail says in words that this proves motion, not provenance.
- **B6 `seeking between two films shows no picture and names the next one`** —
  the gap case. Replaces `take`'s boundary handover, because here the boundary
  is days wide.

### Cannot run in the harness, and why

- **The WebKit native-HLS path.** `verify.mjs` is Chrome, and
  `canPlayType('application/vnd.apple.mpegurl')` answers `"maybe"` in headless
  Chrome too — the trap that left **291 asserts green across three pages that
  never played a frame**. Gate on `ManagedMediaSource`, and add the new URL to
  **both** `verify-native.mjs` and `verify-safari.mjs`; the last rename left
  both pointed at a 404, which is the iPhone path (LESSONS #29).
- **Any claim that the content is from 1965.** No in-band clock exists (§3).
- **Geo-blocking.** Every probe has been from Estonia.
- **Per-programme refusal on the archive.** n = 8 is not a sweep (§1).
- **B5 on the native path** — canvas taint with `crossOrigin='anonymous'` against
  `vod.err.ee` is ⚠️ untested.

---

## 7. Phases, and traps

### P0 — the fixture, and the email

`demo/reel/build-fixture.mjs` (node, never shipped to a browser) reads the
committed `proto/megatimeline/search-cache.jsonl` for the 298 hits — **zero
upstream cost** — then one content GET per slug at ≥1.2 s with the registered UA
to pick up `Kestus`. Writes `demo/reel/1965.json`:

```
{ slug, series, title, lead, date, month, dateCombined,
  at,              // epoch ms, UTC midnight of the air date — NEGATIVE
  when,            // null for day-precise; a bracket otherwise
  catalogueMs }    // Kestus. A claim, not a measurement.
```

No URLs, no shots, no media. ~80 KB. **Done when:** the file exists, 298 rows,
two series plus a pool, dates `1965-01-04`…`1965-12-31`; re-running the builder
from the committed file makes zero upstream requests; and the licence email is
sent.

### P1 — the line, with no media at all

Deck at 1965 wall ms; two lanes; `createStripView(…, { absolute: true,
armWall: false, follow: false, gutter: 150 })`; `createTransportBar(…,
{ scrub: false, fmt })`. Gutters carry what each lane measured, ~21 characters a
line, from the fixture and never typed twice:

```
AK filmikroonika    282 films · <total>       every figure read from the same
                    <shortest> to <longest>   fixture the lanes are drawn from,
everything else     16 films · 2 series       never typed twice
                    6 are 16 mm rushes
```

The angle brackets are slots, not numbers: only two 1965 durations have been
measured (3:01 and 29:36), and a gutter that printed a range derived from two
items would be a fabricated figure of exactly the class `01 transport` was
caught printing. They are filled by the fixture builder or they stay empty.

**Done when:** A1–A8 green; the axis prints the twelve 30-day majors of 1965 —
computed, not hoped: `1965-01-27 · 02-26 · 03-28 · 04-27 · 05-27 · 06-26 ·
07-26 · 08-25 · 09-24 · 10-24 · 11-23 · 12-23` — read by eye on a real page and
not inferred; and the strip's own `report()` says `absolute: true`.

### P2 — one film plays

Pick a part → one content GET direct to arhiiv (ACAO `*`) → resolve
`media.src.hls` → hls.js (or native on WebKit, gated on MMS) →
`mediaMaster(deck, video, { anchorMs: part.at, autoPlayPause: false })` →
`deck.setRange([part.at, part.at + mediaMs])`. Every seek mirrors to the element
exactly as `take` does it, one in flight, latest wins.

**Done when:** B1, B2, B4 green; the readout shows the catalogue-versus-media
difference; a press at 11:38 inside `suusatamine-otepaal` lands in *naiste
5 km*.

### P3 — the shot lane, and the gaps

Events from `description.data`, one lane, only shown while a film is picked
(`strip.show('shots', false)` otherwise — a lane narrating its own emptiness is
two channels saying one thing). Seeking into a gap: no picture, and the readout
names the next film and how far away it is. This is the archive's own "perform
the lacunae" doctrine (`research/radio-tallinn-1965`) arriving as a mechanism
rather than a slogan.

**Done when:** B3, B6 green; the 6.88 s overhang is a number on screen.

### P4 — the harder checks

B5; the two-byte Range sweep of §1 across ~20 items × 5 positions, reported as
`flipper` reports its refused minutes; the "jump to the next film" transport
verb as a committed one-shot; `verify-safari.mjs` and `verify-native.mjs`
updated. And the **aoristic density lane**, which §4e.1 promotes from optional
to needed: at 0.384 days per pixel July's 46 films merge into one bar, and a
count is exactly what a merged bar cannot carry. `aoristic()` is already
exported from the shipped `timeline/strip.mjs` and already imported by
`proto/megatimeline`, so it costs an import and a lane declaration. It stays out
of P1 only because P1 is about the position domain and this is about legibility;
if the year view reads badly by hand at the end of P1, pull it forward.

### Traps specific to this build

- **T1 — negative positions are new ground.** §4a. `createDeck` does not seek
  into its own range; `formatTime`'s absolute guess is blind from 1938 to 2001.
- **T2 — a 30-day major is not a month.** Days, 2 days and 7 days are
  midnight-true; 30/91/182 days and years are not (§4b).
- **T3 — the audio track is a lie.** These are `FILM 16mm m/v negatiiv helita`
  — silent — and the HLS master nevertheless carries an audio rendition group
  named `Chamoru` (`LANGUAGE="ch"`), ✅ 2026-09-08. Because A/V are **demuxed**,
  `video.buffered` is the INTERSECTION of the source buffers (CLAUDE.md); a
  stall diagnosed off `buffered` will be diagnosed wrong.
- **T4 — `Kestus` is not the media's length.** −0.16 s and −7.16 s on a sample
  of two. Take the length from the media.
- **T5 — the shot list can end past the last frame.** 6,880 ms on
  `suusatamine-otepaal`.
- **T6 — the air date is not the shooting date.** `date 1965-03-21`
  ("Esmaeeter 21. märts 1965") against filename `19650126_…`. **The line
  positions on first air**, because that is the field with a precision
  convention behind it; the shooting date goes in the tooltip beside
  `Võtte aasta`.
- **T7 — `month: null` means year-only for AUDIO and nothing for VIDEO.**
  Measured in `err-remixer`: `…-1965-aasta-esimesed-abiellujad` is `month: null`,
  `date: 1965-01-04`, `dateCombined: "Esmaeeter 4. jaanuar 1965"` — a real day.
  Both 1965 items probed today are `month: null` and both are day-precise. Get
  this backwards and 282 day-precise films smear across whole years.
- **T8 — search cannot be called from a browser**, and the local dev server has
  no `/api/search`. Fixture, not fetch (§1).
- **T9 — a blob URL over ERR bytes is a copy.** §5.
- **T10 — `built: false` is zero coverage.** §5.
- **T11 — one `what` paragraph.** `d.how()` no longer exists; three or four
  sentences saying what happens, how, and what the numbers mean.
- **T12 — the strip `fit()`s once.** Call it yourself after `setRange`.
- **T13 — one engine per URL.** A `video.src = <m3u8>` load stores an opaque
  cache entry that hls.js's XHR for the same URL is then served and rejects.
  Never both in one page life.
- **T14 — nothing may convert a position into a host clock.** `createMidiLane`
  scheduled every note **fifty-six years out** by handing epoch ms to an API
  speaking `performance.now()`. Here every position is *sixty-one years
  negative*; the only converter on this page is `mediaMaster`, which is
  anchor-relative and safe. Any lane added later that touches
  `AudioContext.currentTime` or `MIDIOutput.send()` will be catastrophically
  wrong and will look fine.

---

## 8. Reuse — what is new, and why

| piece | where it lives | verdict |
|---|---|---|
| `mount`, `guard`, `el`, `armVideo`, `playOrPrompt` | `demo/shell/shell.mjs` | **(a) as-is** |
| `createDeck`, `normalizeWhen`, `observePosition` | `timeline/transport.mjs` | **(a) as-is.** Negative ranges work; the page seeks into its own range (§4a.1). |
| `mediaMaster` | `timeline/media-master.mjs` | **(a) as-is**, `anchorMs: part.at`, `autoPlayPause: false`. The `{el, pos, key}` function form is `take`'s and needs no change. |
| the strip: tick ladder, `when` ambiguation, aoristic, pinch/wheel zoom, `fit`, `spansOf` | `timeline/strip.mjs` | **(a) as-is**, plus **(b) one option**: `axisFmt`, default `formatTime` (§4c). |
| `createStripView` | `demo/shell/strip.mjs` | **(a) as-is**, with `absolute: true` |
| `createTransportBar`, `scrub: false`, `extras` | `demo/shell/transport-bar.mjs` | **(b) one option**: `fmt`, default today's `clock` pair (§4d). |
| hls.js 1.7.1, vendored | `proto/remixer/hls.min.js` | **(a) as-is** — the same file `flipper`, `seek` and `replay` load. |
| the `ManagedMediaSource` gate, the two-byte Range probe, the wall handler | `demo/flipper/index.html` | **(b) promote to `demo/shell/hls.mjs` first.** The MMS gate is currently copied byte-for-byte into `replay`, `seek` and `flipper`; this would be the fourth. LESSONS #30 says a shared module needs a reader — this one would have four, which is the justification the pattern module lacked. |
| 1965 search hits, 298 rows | `proto/megatimeline/search-cache.jsonl` | **(a) as-is** — the fixture builder's input, zero upstream cost. |
| the aoristic sum | `timeline/strip.mjs`, already imported by megatimeline | **(a) as-is** if P4 wants it. |
| `POST /api/search`, `GET /api/item/{type}/{slug}` | `workers/view/src/index.js` | **deployed, and deliberately unused.** It is the obvious answer and it is wrong: `demo/server.mjs` is static, so the page would be green on the deploy and red under the harness (§1, T8). |
| `demo/shell/live.mjs` | — | **not used.** WHIP/WHEP/Cloudflare Stream — our own live plumbing. Nothing here touches it. Named because the brief named it. |
| `demo/shell/pattern.mjs` | — | **not used.** There is no generated picture and no burned clock, and that absence is §3's entire subject. |
| `demo/shell/ingest.mjs`, R2, `selfrec` | — | **must not be used.** §5. |
| **`demo/reel/index.html`** | new | **(c) new.** The only genuinely new code. Justified: no page in this repo positions a *remote, playable* item at *its own date* on a positron deck. `proto/remixer` puts archive items on a deck and says in its own report string that the anchor is `arrangement-offset (chosen, NOT attested sync)`, and it servos elements to the vector — the inverse of `mediaMaster` L1, correct for N layers with no single ground truth, wrong for one picture under one playhead. `proto/megatimeline` draws 1908–2026 with its own viewport, `createDeck` nowhere in it, and nothing plays. The two halves exist; nobody has joined them. |
| **`demo/reel/build-fixture.mjs`** | new | **(c) new**, and it never runs in a browser. One-off, node, ≤1 request per 1.2 s, the same politeness `census.mjs` already proved at 119/119 years with zero errors. |
| **`demo/reel/1965.json`** | new | **(c) new, and it is data.** Catalogue metadata only — no URLs, no media (§5). |

Three new files, one of which is data and one of which never reaches a browser.
Two library options, each one line with an unchanged default.

---

## 9. If it should not be built as asked

It should, with one substitution already folded in above: **the fixture instead
of a live search.** The brief's shape — take/keep's UX, remote 1965 video, a
couple of lanes — survives contact with the measurements. What does not survive
is the assumption hiding inside "put it on a timeline and play it back": that
the burned clock has an equivalent. It does not. The replacement is the
catalogue-versus-media length check of §3, and it is a weaker claim honestly
made rather than a strong one faked.

The one thing that could stop the build is ERR's answer, and it is one word in
`demo/manifest.mjs`.

---

## 10. Where it sits

`demo/manifest.mjs`, Act 5 (*archives*), immediately after `flipper` — the two
ERR pages together, one live and one sixty-one years old, which is the pairing
`research/err-live-feeds` and `research/err-archives` were written as.

```js
{ name: 'reel', act: 5, built: true, settleMs: 12000,
  one: 'films ERR first showed in 1965, on a line a year wide, played where they sit',
  tags: ['HLS', 'ERR archive', 'timeline'] },
```

`settleMs` sizes control 0 (resolve one item, attach hls.js, first frames) and
the wait for the first assert — but the mechanism asserts fire at load, so a
page whose network leg is down still reports eight green and a failure, never
"asserted nothing".

Draft `what` — four sentences, which is the budget:

> Films that Estonian television first showed in 1965, laid on one line at the
> dates they were shown — the line is a whole year, so a film is a hairline and
> the axis reads in days and months. Press one and it plays from ERR's archive
> over the network; nothing is copied here, and the line becomes the inside of
> that film. These pictures carry no clock written into them the way the ones
> this site generates do, so the page cannot prove a jump landed by reading a
> frame; what it does instead is compare the length ERR's catalogue claims
> against the length the file actually delivers, and print both. On the two
> films measured while planning this, that gap was 0.16 s and 7.2 s.
