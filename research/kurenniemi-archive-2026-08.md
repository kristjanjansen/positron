# Kurenniemi — what is publicly reachable, and what a SECOND institution taught (2026-08-28)

Availability probe for the §−1 PhD case study, and the Tier-A demo it supported
(`proto/aikajana/`). Every endpoint below was exercised live from this machine
at ≤1 req/s. Marks: ✅ measured here, 📄 from the source's own docs/terms,
⚠️ inferred or untested.

## Verdict

**Tier A — media playable cross-origin.** Not from the institution that holds
his archive, but from an aggregator: **archive.org serves 12 real Kurenniemi
audio tracks with `access-control-allow-origin: *` and Range 206** ✅, enough
for a working transport-driven client. The dated spine (life, works, films)
comes from **Wikidata**, which is the first source we have met that **declares
precision as a field** instead of leaking it. The surviving **DIMI-A**
instrument is an image object in **Europeana/MIMO**. `proto/aikajana/` is
built on those three and verifies **8/8**.

**The institution that actually holds the archive is closed to us.** The
Kurenniemi papers/tapes/diaries sit with the **Central Art Archives / Finnish
National Gallery**; the FNG open API serves the *artwork* collection only, and
**Finna — the Finnish national aggregator, the true analogue of arhiiv.err.ee —
is unreachable from this host**: a Cloudflare managed challenge answers curl,
node `fetch`, WebFetch **and headless Chrome** with 403 ✅. That is a *transport*
block, not a policy one (Finna's API is documented, keyless, open) — so it is
the single highest-value thing a rights/technical conversation could unblock.

## Availability table

| source | API base + auth | year / date-range query | item metadata | media | CORS + Range (measured) | rights |
|---|---|---|---|---|---|---|
| **archive.org** | ✅ `archive.org/metadata/{id}`, `advancedsearch.php?output=json` — **no key** | ✅ `date` is a Solr field, range-queryable — but see the trap below | ✅ per-file `format/length/size`, item `creator/subject/description/licenseurl/uploader/publicdate` | ✅ **MP3 + MP4, direct** | ✅ **audio 206 + `ACAO: *`**; ⚠️ **video 206 with NO ACAO** on the node (the 302 has it, the final hop does not) — plays in `<video>`, taints canvas, unreadable by `fetch`. ⚠️ **no `access-control-expose-headers`** → JS cannot read `Content-Range` even on a successful 206 | ⚠️ `licenseurl` is **uploader-asserted**, and provably wrong on our best item |
| **Wikidata** | ✅ `Special:EntityData/{Q}.json`, `w/api.php` (`wbgetentities`, CirrusSearch `haswbstatement:`) — no key | ✅ by statement, and every time value carries **explicit `precision`** | ✅ **best dating in the whole probe** — P569/P570/P571/P577 with precision 8–11 | ❌ none | n/a (JSON, ACAO `*`) | ✅ CC0 on the **statements** (not on the works) |
| **Europeana** | ✅ `api.europeana.eu/record/v2/` with the public `api2demo` key | ⚠️ `year` facet exists; our subject has only 8 hits, 7 of them false positives | ✅ full EDM: `dcDate` literal, `dcCreator`, `dcCoverage` (GeoNames), `edmRights`, attribution snippets | ⚠️ image only (`edmIsShownBy` → mimo-international.com) | ✅ image 200 · ❌ **no ACAO** (fine as `<img>`, taints canvas) | ✅ **machine-readable `edmRights`** asserted by the holding institution — `CC BY-NC-SA 4.0` on the DIMI-A |
| **Finna.fi** (FI national aggregator) | 📄 documented open REST at `api.finna.fi/v1`, no key | — | — | — | ❌ **403 Cloudflare managed challenge** to curl ✅, node fetch ✅, WebFetch ✅ **and headless Chrome (36 s, never resolves)** ✅ | 📄 (unread — the terms page is behind the same edge) |
| **Finnish National Gallery** | ✅ `kokoelma.kansallisgalleria.fi/api/v1/objects` (the `www.kansallisgalleria.fi/api/v1` host redirects there), no key, **must send `Accept-Encoding` handling — responses are brotli** ✅ | ⚠️ `?q=` is **silently ignored** (returns the same first page) — no full-text search found | ✅ rich artwork records (people with birth/death **dates and places**, inventory numbers, categories) | ⚠️ artworks only | ⚠️ untested | ⚠️ not surfaced in the sampled records |
| **AV-arkki** | ❌ no JSON API found; WordPress search 200 ✅ | — | — | — | — | 📄 distribution catalogue, licensed per screening |
| **Yle Areena / Elävä arkisto** | ❌ probed paths 404 ✅; no open API surfaced | — | — | — | — | ⚠️ geo-restricted to Finland (standard for Yle) |
| **Constant / kurenniemi.activearchives.org** | ❌ **host does not resolve** ✅ (`HTTP=000`) — the "Erkki Kurenniemi (In 2048)" experimental archive interface is **gone**; `constantvzw.org` 404s on the article path ✅ | — | — | — | — | — |
| **Taanila, *The Future Is Not What It Used To Be*** | present on archive.org as `20210908_20210908_1925` ✅ — but the thumbnails are named `YLE.Time.and.Matter…`, i.e. **a rip of a Yle broadcast**, `licenseurl: null` | — | — | ⚠️ present | — | ❌ **rights closed. Deliberately excluded from the corpus.** |

Politeness: the ingest is hard-capped at one request per 1.05 s with a 3-try
backoff; the whole corpus costs ~16 requests.

## The precision conventions — four sources, four rules

This is the concrete decode the brief asked for. **The same fact — "1970" —
travels four different ways:**

| source | year-only looks like | precision declared? | the trap |
|---|---|---|---|
| **ERR** (arhiiv, for contrast) | `1970-07-15T00:00:00Z` | ❌ no | **midpoint padding** — indistinguishable from an attested 15 July. Only the `month: null` contradiction gives it away. |
| **Wikidata, raw JSON** | `+1970-00-00T00:00:00Z` | ✅ **`precision: 9`** | **zero-fill** — month 00, day 00. Not a valid ISO date; a naive `new Date()` gives NaN or slides a month. |
| **Wikidata, SPARQL/RDF** | `1970-01-01T00:00:00Z` | ✅ `wikibase:timePrecision` | **start-padding** — the *same statement*, serialized differently. Read `precision`, never the string. |
| **Europeana / EDM** | `"1970"` | ⚠️ implicitly — **the literal survives** | honest by omission; precision = string length. The `europeanaProxy` copy prefixes a normalization marker (`"#1970"`) — strip it. |
| **archive.org** | `"1966-01-01"` *or* `"2022"` — uploader-typed | ❌ no | **the date describes the FILE, not the WORK** (below). |

Wikidata's ladder, measured on this subject: **11** = day (`+1941-07-10`, born),
**9** = year (every film), **8** = decade — his spouse's `P26` end qualifier is
precision 8, i.e. "the 1970s", the first genuine decade-precision datum we have
handled.

**The rule the client adopts:** `at` is the band's **lower bound**, never its
midpoint, and `bandMs` travels with it. A lower bound is a statement that is
*true*; a midpoint is a statement that is *false and looks precise*. Verified:
`V2 — 0 mid-year, 0 off-band`.

## What the SECOND institution taught that ERR did not

ERR is one institution describing its own holdings. Everything here breaks one
assumption that made the ERR adapter look simpler than it is.

**1. The date field can describe the FILE, not the WORK.** ERR's `date` is the
air date — the work's own event. archive.org's `date` on *Erkki Kurenniemi
Collection* is **2022-04-11**: the day someone ripped it off YouTube. On
*Erkki Kurenniemi Audio Works* it is **2002**. Both items contain tapes from
1963–1973. **An ingest adapter that maps `source.date → at` produces a corpus
that is off by half a century and internally consistent about it.** The
adapter now needs a per-source declaration of *what the date field means*, and
the corpus keeps the unused field (`prov.itemDateField` + `itemDateMeans`) so
the rejection is auditable rather than invisible. The demo renders it as a red
`trap` row.

**2. Rights need an ASSERTER, not just a value.** ERR asserts about ERR.
archive.org's `licenseurl` on *Antropoidien tanssi (Love Records, 1968)* is
`publicdomain/mark/1.0` — **a Public Domain Mark on a 1968 commercial record
release, applied by an anonymous uploader**. The value is machine-readable,
well-formed, and wrong. So `rights` alone is useless; the corpus carries
`{rights, rightsAsserter, rightsConfidence}` and 13 of 22 items are
`confidence: LOW`. Contrast Europeana, where `edmRights` is asserted *by the
holding institution* through a standards path — same field, completely
different evidential weight. **A rights field without a chain of assertion is
not provenance, it is decoration.**

**3. Ingest must be MULTI-SOURCE by construction, because no single source has
both the dates and the media.** ERR had both in one record. Here the media is
on archive.org (with no usable dates), the dates are on Wikidata (with no
media), and the object is in Europeana (with neither). The adapter's real job
turns out to be **reconciliation**: a per-item `dateEvidence.how` naming which
of five methods produced the date —
`wikidata-declared-precision` (11 items) · `filename-year` (3) ·
`edm-literal-length` (1) · `wikidata-title-match` (1) ·
`derived-from-corpus-range` (9, tier 1).

**4. Weak evidence is still evidence, and the honest form of "undated" is a
BAND, not a guess.** Nine tapes carry no date anywhere. Rather than drop them
or invent a year, they take the range from the title of the authoritative
compilation (Wikidata Q122801742, *"Äänityksiä / Recordings 1963–1973"*) — a
**10-year band, precision `range`, marked tier 1**. On screen they stack as
nine identical hatched bars: *nine items pinned to one guess*, which is the
truth and is visible at a glance. Two more tapes are dated only by a
parenthetical in a filename (`… (Love Records, 1968).mp3`) — weak, but real,
and recorded as `filename-year` with the raw filename kept.

**5. A CDN's CORS posture varies per content type, not per item.** ERR's
vod.err.ee gave `ACAO: *` on everything. archive.org gives it on **audio** but
**not on the video node**, and gives **no `expose-headers` anywhere**, so JS
cannot read `Content-Range` off a 206 it just made. `mediaRef` indirection
(ERR lesson 6) is therefore not enough — the corpus must also record
**what the client is allowed to do with the bytes** (`prov.corsOnMedia`).

**6. An aggregator can rate-limit you into a silent lie.** WDQS answers a
throttled SPARQL query **200 with zero bindings**. The first ingest run shipped
a corpus with `work: 0` and *reported success*. The fix is in the code and is
the general rule: an ingest must **refuse to ship an empty spine**
(`throw new Error('… refusing to ship an empty spine')`), because for archival
data a quiet empty result is worse than a crash. The production path is now
CirrusSearch `haswbstatement:` + `wbgetentities`, which is rate-stable — and
which, as a bonus, returns the raw zero-filled time values SPARQL hides.

**7. The institution that holds the archive is the one you cannot reach.** Both
real custodians — FNG/Kiasma's Central Art Archives and Finna — are effectively
closed: one has no archive-collection API, the other is behind a bot wall. The
material we *can* play is on an aggregator, uploaded by strangers, with
unverifiable rights. **That asymmetry is the normal condition of heritage
access, and the design consequence is that provenance confidence must be a
first-class field rather than an afterthought** — the demo's whole rights
column exists because of it.

## What a rights/technical conversation would need to unlock

Narrow, concrete, in priority order:

1. **Finna** — the block is a Cloudflare edge rule, not a policy. Ask for an
   allowlisted `User-Agent` or an API-key path for `api.finna.fi/v1`. This is
   the one that turns the probe from three sources into a national aggregator.
2. **Finnish National Gallery / Central Art Archives** — the open API covers
   artworks; ask whether the **Kurenniemi collection finding aid** (the
   diaries/tapes/photos series list) is available as data, even without
   digitized objects. Even a finding aid gives dated series with real
   institutional precision, which is exactly what the `record` kind wants.
3. **Yle** — for the Taanila documentary and 1960s TV appearances; expect
   Finland-only geo and a licence per use. Do **not** use the archive.org rip.
4. **archive.org items** — no permission needed to *link*, but the rights
   status of the tapes themselves (Love Records 1968; Numminen collaborations)
   is unresolved and would need the rightsholders for any public performance.

## The demo — `proto/aikajana/` (Tier A)

```
proto/aikajana/ingest.mjs    live fetch -> corpus.json  (~16 requests, 1/s)
proto/aikajana/index.html    the deck; imports timeline/{transport,media-master}.mjs
proto/aikajana/verify.mjs    one headless Chrome on :8894, 8 asserts + shot.png
proto/aikajana/corpus.json   22 items, 3 sources, provenance per item
```

Position domain **is calendar time** (1941-01-01 → 2018-01-01, epoch ms) — no
re-basing. Three adapters on one `createDeck`:

- **`record`** (discrete, `catchUp: 'reduce'`) — life/work/instrument/film.
- **`tape`** (discrete, **`caps.rates: [1]`**) — the 12 playable MP3s. A tape
  can only be played at tape speed, so at archive rates the deck **refuses**
  via `deck.request('tape', {rate})` and the refusal lands in
  `deck.degradations('tape')` instead of stuttering 12 files past a
  one-year-per-second sweep. Clicking a tape drops to 1×, and
  **`mediaMaster(deck, audio, {anchorMs: item.at})` makes the tape the clock
  master** — deck position = *when this was recorded* + elapsed-in-tape.
- **`certainty`** (continuous, **`caps.tier: 1`**, Catmull-Rom,
  `neighbourhood: 1`) — how sharply the archive knows *where* it is
  (1/log band width). Declaring tier 1 is what arms the **evidence firewall**:
  `sampleAt` without a policy throws `EVIDENCE_POLICY_REQUIRED`. The ribbon
  draws the **attested** reading as a filled floor and the **tier-1**
  interpolation as a hatched line above it — demo10's all-paths-at-once ethic,
  §5b's tratteggio principle.

### Verification — 8/8 ✅

| # | assertion | measured |
|---|---|---|
| V1 | every item has band + precision + a named rights **asserter** | 22 items, 3 sources, 12 playable, **13 LOW-rights** |
| V2 | no ERR-style midpoint padding; `at` == band lower bound | **0** mid-year, **0** off-band |
| V3 | `sampleAt('certainty')` with no evidence policy **throws** | `EVIDENCE_POLICY_REQUIRED` |
| V4 | attested ≠ restored, and attested **invents nothing** | **297/300** probes differ, max Δ **0.9118**; attested took **4** distinct values, **all of them real samples** |
| V5 | 1 yr/s sweep: records fire, tapes refused **on the record** | **38** fires, **12** refusals, reason `caps.rates lattice [1] cannot express 31557600`; **no audio started** |
| V6 | archive.org MP3 cross-origin with Range | **206**, `ACAO: *` (⚠️ `Content-Range` unreadable — no expose-headers) |
| V6 | the tape masters the deck | `currentTime 3.0 s` → deck at **1963-01-01T00:00:03**, rate 1 |
| V7 | seek idempotent forwards and backwards | identical provenance panel both ways |

Cursor cost over the 420-probe ribbon plus the sweep: **8 073 comparisons /
3 829 hits / 9 bisects** — the v0.4 cursor doing its job on a 22-sample lane
read ~840 times per repaint.

Corpus shape: precision **2 day · 11 year · 9 range**; **10** dates DERIVED
rather than attested; **13** items rights-flagged LOW.

## Library notes (v0.4/v0.5 as imported — nothing edited)

- `caps.rates` + `deck.request` is a **better fit for archival material than
  for nested timelines**, which is what it was built for: "this medium can only
  be played at its own speed" is exactly a rate-lattice refusal, and the ledger
  turns it into an audit trail for free.
- `caps.tier` is the right trigger for the firewall. The `certainty` adapter
  declaring `tier: 1` made three otherwise-invisible things testable at once
  (V3, V4, and the ledger entry).
- ⚠️ **`deck.range` is a seek window, not a play stop.** At rate 3.16e7 the
  vector runs straight past 2018 into year 10943 with nothing complaining; the
  client has to stop it in `onPosition`. Worth a line in NOTES — for an archival
  deck, "the archive ends" is a normal condition, not an error.
- `mediaMaster` needed no changes for a 1963 anchor 2 000 000 000 000 ms below
  `Date.now()`; `anchorMs` + `currentTime * 1000` is domain-agnostic, as
  advertised.
