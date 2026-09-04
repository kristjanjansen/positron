# ERR archive platforms — API, metadata, playability (2026-08-27)

Hands-on probe of arhiiv.err.ee + jupiter.err.ee for the §−1 cultural-heritage
horizon and radio-tallinn-1965. All endpoints exercised live from this machine
(in Estonia); low request rate, sample items only. Marks: ✅ measured here,
📄 from ERR's own docs/FAQ, ⚠️ inferred/untested.

## Verdict

**The 1965 experiment is feasible today, without scraping or a proxy.** ✅
arhiiv.err.ee has an open JSON API with real date-range search (unix seconds,
negative epochs work — audio back to 1908), item records with day-precise air
dates + provenance-grade technical metadata, and media on vod.err.ee served
with `Access-Control-Allow-Origin: *`, Range support, no tokens, no Referer
checks. Audio for a year → HLS or the official download endpoint → N parallel
players from our own origin. The one thing the API does NOT give: an explicit
`precision` field — but it leaks precision through a synthesized-midpoint
convention (below), which the ingest adapter can decode.

## Platform matrix

| | arhiiv.err.ee (heritage) | jupiter.err.ee (VOD portal) |
|---|---|---|
| API base | ✅ `https://arhiiv.err.ee/api/v1` (Angular SPA's "zeus" API) | ✅ `https://services.err.ee/api` (+v2) |
| Auth | ✅ none needed for search/content/media | ✅ none for public items |
| Search | ✅ `POST /search`, phrase `*` wildcard, **time-range in unix s** | ✅ `GET /search/getVodContents2/` — phrase only, **no date filter** |
| Year query | ✅ **yes — the recipe below** | ⚠️ no (dates are platform-publish dates) |
| Item record | ✅ `GET /content/{audio\|video\|photo}/{slug}` | ✅ `GET /v2/vodContent/getContentPageData?contentId=` |
| Air date | ✅ ISO day-precise `date` + `year`/`month` + human `dateCombined` | ⚠️ `publicStart` = Jupiter publish date, `year: 0`; original date only in prose |
| Media | ✅ HLS+DASH on vod.err.ee; audio also official `audioDownload` | ✅ HLS+DASH+**progressive MP4/M4A** (`src.file`), radio also `podcastUrl` MP3 on heli.err.ee |
| CORS on media | ✅ `*` on manifests, segments, MP4 | ✅ `*` (same vod.err.ee) |
| Range/seek | ✅ 206 on segments and MP4 | ✅ 206 |
| Tokens/expiry | ✅ none seen; cache-control 2d; URLs filename- or id-addressed | ✅ none on tested items; DRM plumbing exists (`skd`/`jwt`/Axinom) but `restrictions.drm: false` on tested items |
| Geo | 📄 "ERRarhiivi saadetel puudub territoriaalne piirang" (no territorial restriction, archive FAQ) | ✅ per-item `restrictions.geoBlock` flag + `GET /api/geoblock/getRegionalData` (Estonia/EU tiers); ⚠️ blocked-case untested from here (machine is in Estonia) |
| Playable from another origin | ✅ **direct** (hls.js / `<audio src=mp4>`) | ✅ direct where `drm:false, geoBlock:false` |

## The year-query recipe (arhiiv) ✅

```
POST https://arhiiv.err.ee/api/v1/search
Content-Type: application/json
{"queryParams":{"phrase":"*","type":"audio",          // audio|video|photo|all
  "sortOption":"old",                                  // accuracy|old|new|abc
  "page":1,"limit":100,                                // UI offers 20/100/500
  "timeRange":"custom",
  "timeRangeFrom":-157766400,"timeRangeTo":-126230401, // 1965 in unix s (negatives OK)
  "includeTranscription":false,"advancedParams":[]}}
```

→ 1965: **543 audio, 298 video, 11 photo** ✅. Each hit: `date` (ISO), `heading`,
`lead`, `fileId`, `url` (slug), series/category nav links, waveform preview
array. Then per item:

```
GET https://arhiiv.err.ee/api/v1/content/audio/{slug}
```

→ `media.src.hls = //vod.err.ee/hls/arhiiv/AUDIO/a_59256_RMARHIIV.m4a/master.m3u8`
(+ `.dash`), `info.downloadUrl = /api/v1/audioDownload/{slug}` (GET only, 405 on
HEAD ✅), photos: `/api/v1/imageDownload/{slug}`. Other content sub-APIs seen in
the bundle: `contentSeries`, `contentRelated`, `transcription/{type}/{slug}`
(POST; ✅ live but empty for the 1965 test item — ASR transcripts exist only for
processed items), `frontpage`, `contentAY` (alphabet browse, not years).

## Sample item (trimmed) ✅ — audio, day-precise

```json
{"info":{"archiveType":"audio","date":"1965-07-07T00:00:00.000000Z",
  "dateCombined":"7. juuli 1965","year":1965,"month":7,
  "title":"Soomekeelne saade. Tallinn–Helsingi laevaliin",
  "synopsis":"Reporter Ellen Noot. ... Kõned: 00:01:55 ENSV välisminister
    Arnold Green; 00:03:57 Soome välisminister Ahti Karjalainen. Eetris
    07.07.1965. VAS-4915.1",
  "guid":59256,"id":51794,"filename":"a_59256_RMARHIIV.mp3",
  "seriesTitle":"Soomekeelne saade","uploadDate":"2012-10-13T03:28:54Z",
  "downloadUrl":"https://arhiiv.err.ee/api/v1/audioDownload/soomekeelne-..."},
 "media":{"src":{"hls":"//vod.err.ee/hls/arhiiv/AUDIO/a_59256_RMARHIIV.m4a/master.m3u8",
                 "dash":"//vod.err.ee/dash/arhiiv/AUDIO/a_59256_RMARHIIV.m4a/manifest.mpd"},
          "waveform":{"data":[3,4,3,5,...]}},
 "metadata":{"technical":[
   {"label":"Fonoteegi number","value":"RMARH-59256"},
   {"label":"Fonogrammi tootja","value":"1965 EESTI RAADIO"},
   {"label":"Eetrikuupäev","value":"07.07.1965"},
   {"label":"Kestus","value":"00:06:24"},
   {"label":"Esineja","value":"Green Arnold"},
   {"label":"Esineja","value":"Karjalainen Ahti"}]}}
```

Video adds ✅: `Kestus` 00:02:17, `Märksõnad` (keywords), **`Kandja tüüp`
("FILM 16mm m/v negatiiv helita")**, `Võtte aasta` — the capture-chain
provenance the PREMIS bridge wants. Photos add ✅: `Fotograaf`, `Kohanimi`
(place), `Inventari nr.`, `Originaali tüüp` ("negatiiv mustvalge"), scan px/dpi.
Video media is hash-addressed (`/hls/vod/{hash}/v/master.m3u8`) vs audio
filename-addressed — ⚠️ treat both as re-resolvable via the content API, don't
hot-store URLs.

## The precision leak ✅ (the timeline's `precision` question)

No explicit precision field anywhere. But:

- Year-only items get a **synthesized mid-year date `YYYY-07-15`** (1908 and
  1919 samples both land on 07-15) and audio `month: null` while `date` shows
  July — the contradiction IS the signal.
- Month-only appears as **day 15** (photo pair "Telemaja kohviku avamine",
  `1965-09-15`, dateCombined "Võttekuupäev 15. september 1965" — ⚠️ mid-month
  convention inferred from pattern, not documented).
- Day-precise items agree everywhere: `date`, `month`, `dateCombined`,
  and metadata `Eetrikuupäev` (a second, independent day-precise source).
- `dateCombined` renders fake precision ("15. juuli 1908") — never trust it
  alone. Video prefixes tell provenance: "Esmaeeter" = first air.
- 📄 ERR's own FAQ warns the data has errors: "Aastakümnete jooksul
  andmebaasidesse ... sisestatud andmetes võib leiduda nii kirja- kui
  faktivigu" — uncertainty is officially real, render the smear.

## Playability measurements ✅

```
GET vod.err.ee/.../master.m3u8   (Origin: https://elektron.art)
→ 200, access-control-allow-origin: *, allow-methods GET/HEAD/OPTIONS,
  expose-headers Server,range,Content-Length,Content-Range
GET fragment-1-a1.ts  Range: bytes=0-1023 → 206, content-range 0-1023/90616, ACAO *
GET vod.err.ee/file/etv2saated/818864.mp4  Range 0-2047 → 206 of 414863579, ACAO *
```

10 s TS segments, `#EXT-X-PLAYLIST-TYPE:VOD`, absolute segment URLs, single
64 kbps AAC variant for archive audio. No PDT / no internal timecode in
manifests — **sync anchor = airdate + elapsed**, per-item offset from t=0
(positron's native-T₀ discipline applies unchanged). openresty origin, 2-day
cache headers, no cookies on vod.err.ee (arhiiv.err.ee API sits behind
Cloudflare, cookies harmless). Images (arhiiv-images.err.ee, s.err.ee): plain
200, ⚠️ **no ACAO header** — fine in `<img>`, taints canvas.

## Terms — what they actually say 📄

From `GET arhiiv.err.ee/api/v1/help` (the archive's own FAQ, quoted verbatim):

> "ERRarhiivi kasutamiseks pole vajalik sisselogimine, ka tuvastuseta on
> võimalik teostada arhiivis otsinguid, vaadata ja kuulata tele- ja
> raadiosaateid, vaadata fotosid ning jagada sisu linke. Audioarhiivist saab
> alla laadida faile, mis on vabakasutuses või mille kõik õigused kuuluvad
> ERR-ile. ERRarhiivi saadetel puudub territoriaalne piirang."

(No login needed; search/watch/listen/share links freely; audio downloads
offered where public-domain or ERR-owned; no geo restriction.)

> "Enamus arhiivimaterjale on seotud intellektuaalomandi õigusi kaitsvate
> seadustega. ... ERR ei oma saadetes sisalduvate autorite ja esitajate
> autori- ja esitajaõigusi ..." — and personal-use copies: "pole lubatud
> kasutada ärilisel eesmärgil. Seda ei tohi müüa, laenutada ega
> reprodutseerida või levitada, üles laadida Internetti jms."

> "Arhiivides leiduvate materjalide ... avalikku kasutust vahendab ERRarhiiv
> litsentsilepingute alusel." (Public use — advertising, film, CD, public
> events, exhibitions — goes through license agreements; sirje.joesaar[ät]err.ee,
> general queries arhiiv[ät]err.ee, ~1 week response.)

**Unstated**: API access itself (no ToS mentions programmatic use, no robots
restriction seen on the API paths ⚠️); embedding/hotlinking of streams; what
"avalik kasutus" means for a non-commercial art platform that *streams from
their origin rather than copying*. The load-bearing distinction in their text
is copies-vs-links: sharing/linking/viewing is blessed, redistribution of
copies is not. **A public positron/Radio Tallinn show should get a license
conversation anyway** — provenance discipline (§−1) wants the rights status
explicit per span, and ERR's own channel for that exists and answers in a week.

## Historic-year chords — feasibility ✅

- N parallel 1965 streams: trivially N hls.js instances (64 kbps AAC each) or
  N `<audio>` on `audioDownload` MP4/MP3; tested CORS+Range mean full seek.
- No internal timecode/PDT → chord alignment is OUR choice of anchor (airdate
  midnight + offset). Items are single-span, 3–40 min typical.
- Practical recipe: search(year, type) → for each hit GET content/{type}/{slug}
  → cache {date, precision(decoded), dur (metadata Kestus), hls, download,
  waveform, provenance} as JSONL → Span per item; media stays on vod.err.ee
  (their FAQ blesses linking; nothing bulk-copied).
- The `waveform` array ships in every audio search hit — a free visual layer
  for the strip visualizer before any audio is even loaded.

## What the archival ingest adapter must synthesize (for plan-timeline)

1. **`precision`** — decode: `month:null` + date `*-07-15` → year;
   date `*-15` + no Eetrikuupäev → probably month ⚠️; Eetrikuupäev present →
   day. Store the raw evidence fields alongside.
2. **`dur`** — parse `Kestus` "HH:MM:SS" from metadata (absent on some items →
   fall back to HLS manifest sum ✅ works).
3. **`at`** — airdate at local-midnight ⚠️ (no time-of-day anywhere; Radio
   Tallinn slotting must invent broadcast time — declare it DERIVED).
4. **Provenance block** — free: fileId+guid+Fonoteegi nr (stable IDs), Kandja
   tüüp / Fonogrammi tootja (capture chain + rights year), uploadDate/
   dateModified (custody), photographer/Esineja (people).
5. **Rights field** — NOT in the API ⚠️ (audio downloadUrl presence ≈ "free or
   ERR-owned" proxy 📄); per-show license status must be attached manually.
6. **mediaRef indirection** — store {type, slug}, re-resolve src at play time;
   video hashes and CDN layout are theirs to change.
7. Jupiter adapter (for post-1991 / restored material): id-keyed, progressive
   MP4 + explicit `restrictions.{drm,geoBlock}` flags — but must extract
   original air year from prose ⚠️; treat Jupiter as a delivery tier, arhiiv as
   the date authority.

## Addendum — megatimeline census + payload probe (2026-08-27) ✅

New platform facts measured while building proto/megatimeline (census.json +
4-request payload probe; details in proto/megatimeline/NOTES.md):

- **Search-hit thumbnail field: `photoUrl`** — a RELATIVE path
  (`thumbnails/1965/ERR-Fototeek-00053174_THUMB.jpg`), served from
  **`https://arhiiv-images.err.ee/`** (200 image/jpeg, ~34 kB for a photo
  THUMB). Video hits carry it too (`thumbnails/{year}/{YYYY0000}_…_
  {timestamp}.jpg`); audio hits have `photoUrl: ""`. Companion fields:
  `photoUrlCropType: "file"`, `imageFolder: "{year}"`. No ACAO (as measured
  before) — fine as DOM `<img>`, taints canvas.
- **Audio search-hit `waveform` is a JSON-stringified array** — a ~100-sample
  string `"[5, 6, 4, …]"`, not an object like the content record's
  `media.waveform.data`. JSON.parse it. Video/photo hits: `waveform: ""`.
- **Every search response carries ALL THREE per-type counts** —
  `activeList.{audioCount,videoCount,photoCount}` reflect the time-filtered
  query regardless of the `type` param. Consequence: a whole-archive per-year
  census costs ONE request per year (119 total, ~2.2 min at 1.1 s spacing),
  not one per year×type.
- **Count fields saturate at exactly 10 000** (Elasticsearch-style
  track-total-hits cap): photoCount reads 10000 for 1969, 2023 and 2024.
  Treat 10000 as "10 000+"; sums over years are lower bounds.
- **Whole-archive census** (per-type sums over 1908–2026, census.json,
  committed): **audio 133 718 · video 79 422 · photo 234 478** (photo a
  lower bound per the cap). First video year confirmed at whole-archive
  scale: **1958 (6 items), zero video 1908–1957**. Peaks: audio 2020
  (6 808), video 2023 (2 980), photo 1969 (10 000+).
- Photo hits say `archiveType: "foto"` (Estonian) while the search `type`
  param and count field use "photo"; item pages live at `/foto/{slug}`, and
  photo slugs end in the numeric fileId (`ants-varavas-133720`).
