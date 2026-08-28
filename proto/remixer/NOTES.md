# remixer — working notes (2026-08-27)

Checkpoint log; findings doc goes to research/err-remixer-2026-08.md.
The instrument: historic year chords / blend visuals from year X, on top of
arhiiv.err.ee (recipes from research/err-archives-2026-08.md).

## Step 1 — CORS probe of the arhiiv API (decides proxy question) ✅ measured

- `OPTIONS /api/v1/search` (preflight, Origin localhost:8891) → **204 with NO
  access-control-allow-origin** → browser blocks any JSON POST.
- `POST /api/v1/search` actual response: **has ACAO:*** — only the preflight is
  broken. `Content-Type: text/plain` (preflight-free) → upstream **500** (needs
  the JSON content type). So no client-side workaround.
- `GET /api/v1/content/{type}/{slug}` (simple request, no preflight) →
  **ACAO:* → direct from browser works.**
- Verdict: server.mjs proxies **POST /search only**; content GETs and all media
  (vod.err.ee, ACAO:* per research doc) go direct. Proxy enforces ≥1 s spacing
  upstream; the page adds its own shared 1 req/s gate over search+content.
- Search recipe re-verified: 1965 → audioCount 543, videoCount 298, photoCount
  11 (matches research doc exactly). Search hits carry `date`/`heading`/`url`
  (slug) but **no `month`, no duration** → list badges start as heuristic
  (day-15 convention decoded from `date` alone), upgraded to confirmed once the
  content record (month + Eetrikuupäev + Kestus) is fetched — lazily at ≤1/s
  ("trickle", interactive mode only), or on load-into-layer.

## Step 2 — build ✅

- server.mjs: port 8891, static + POST /api/search proxy (1 s serialized gate,
  UA elektron-remixer-proto/0.1, not an open proxy — fixed upstream path) +
  /report sink. No media proxying, nothing cached to disk.
- index.html: year dial 1908–2026 → 20 audio + 20 video items; honest date
  badges (heuristic italic → content-confirmed solid); year strip (day ticks /
  month-wide smears / faint full-year bands, audio zone + video zone); rack =
  4 audio layers (shared AudioContext, per-layer MediaElementSource→GainNode)
  + 2 video layers stacked in a blendbox (opacity + mix-blend-mode
  normal/screen/multiply); CHORD (3 random from pool, resolve → arm → single
  play() tick, spread measured); per-layer + all SHUFFLE; split A/V via
  audio-year input; keys 1-9 / ⇧1-9 / space / c / s.
- Respect: ONE shared client gate ≥1000 ms across search+content, pages of 20,
  autotest plays 6 items total. Media streamed from vod.err.ee only.

## Step 3 — autotest run 1 ✅ (title REMIXER OK)

- counts 1965: **543 audio / 298 video** — matches research doc exactly.
- search latency 2117/1108 ms (proxied, gated); content GETs 60–117 ms raw.
- CHORD ×3 @1965: all HLS (64k AAC .m4a masters), buf 143–344 ms,
  **start-together spread 43 ms**, all three currentTime advancing 30.9 s at
  the 30 s mark. Video layer: HLS, ttff 342 ms, **740 rVFC frames in 30 s**
  (~24.7 fps). Zero media errors.
- Findings that forced fixes:
  1. **1938 has no video at all** — wide 1930–1946 search: 0. Oldest archive
     video = **1958-07-11** (AK filmikroonika). → nearest-hunt widened to
     1908–1964 sorted old (597 hits, all ≥1958); cross-decade becomes
     1965-audio under 1958-video. p2 verdict tightened (was vacuously true
     when video pick was null).
  2. **Precision decode refined**: AK 1965 video has `month:null` +
     `dateCombined "Esmaeeter 4. jaanuar 1965"` + date 1965-01-04 — day-precise
     despite null month. So `month:null ⇒ year` is an AUDIO-only rule; video
     relies on synthesized 07-15 / day-15 patterns + Esmaeeter/Eetrikuupäev
     day evidence.
  3. Sorted-'old' page 1 = all January → strip bunches left. Year searches now
     `sortOption:'abc'` → dates scatter across the year (single call, honest
     smear demo). Bonus find: **1966-01-01 item returned inside the 1965 UTC
     range** — local-midnight (EET) vs UTC epoch boundary leak, ~2-3 h smear
     at year edges.

## Step 4 — autotest runs 2+3 ✅ (both REMIXER OK)

- Run 2: cross-decade now real — videoPick 1958-07-11 üliõpilaslaulupidu-riias
  under 1965 audio, both playedOk; chord spread 0 ms (≤50 ms resolution).
  Found: p2 video frames reported -347 — rVFC `presentedFrames` resets per
  media source; framesAt0 baseline went stale on re-attach. Fixed (rebase to 0
  on attach).
- Run 3 (final): verdict {p1ok, p2ok, mediaErrorFree} all true, plays 6/8,
  0 errors. Chord 3×HLS buf 13–266 ms, ttff 40 ms each, 30.9 s advance; video
  740 f/30 s (P1), 395 f/16 s (P2). API avg 569 ms (searches 941–1780 ms via
  proxy, content GETs 62–218 ms incl. gate wait). Format mix: 100 % HLS.
- More precision specimens: year-only (month:null audio) at dates 1965-02-15
  AND 1965-06-11 → synthesized date is NOT always 07-15; month:null is the
  signal. abc-sort strip verified scattered; 1966-01-01 boundary-leak item
  visibly (and honestly) badged inside the 1965 pool.
- Evidence: autotest-report.json, autotest-screenshot.png (P1 chord),
  autotest-screenshot-p2.png (1938 dial + split-from-1965 + 1958 picture).
- Findings doc written: research/err-remixer-2026-08.md.
- Cleanup: server killed, no stray Chrome (drive.mjs Browser.close each run),
  port 8891 free, server.pid removed.

## Step 5 — one playhead: the timeline library adopted (2026-08-28)

Until now the rack was **N independent players**. The "1965 chord" was three
`<audio>` elements and one `<video>`, hand-started in a single tick, and that
was the whole of the synchronisation: they started together (0–43 ms measured)
and then drifted for the rest of their lives. There was no playhead, so there
was nothing to pause, nothing to seek, and rate did not exist at all.

The rack is now ONE timeline — `timeline/transport.mjs`, the same file
`timeline/lab` measured and `proto/jam`, `proto/selfrec` and `proto/instrument`
import (server aliases `/timeline/*` to the repo; nothing is copied). The
remixer is the **fourth** client and the second archive-domain one.

- Each archive item is a **`media-span`**: `{at, dur, mediaRef:{type, slug}}` on
  a shared arrangement axis. One row, two items (enter/exit) — a span is an
  interval, not an instant.
- **One adapter**, `media-span`, caps:
  `{domain:'arrangement', unit:'ms', seekable, reducible, clockMaster:true,
    seekAccuracyMs:40, rates:[0.5,0.75,1,1.5,2], rateNudge:[0.94,1.06],
    servoBandMs:20, syncToleranceMs:40, catchUp:'reduce',
    anchor:'arrangement-offset'}`.
  `actuate` seeks/plays a layer's element; `reduce` is the set of layers present
  at `t`; `assertState` hard-asserts every element (what a seek means).
- The **first playable layer is the clock master**: it is never rate-nudged, and
  the library's vector is slaved to its `currentTime` via
  `transport.sync(pos, {toleranceMs: 40})`. Every other layer servos to the
  library's position inside a ±20 ms dead band (0.94/1.06 nudge), hard-resync
  past 150 ms. Master stall for >1 s → free-run on the wall clock.
- Transport UI under the year strip: play/pause, click-to-seek scrubber with one
  bar per layer, rate ±, and a readout carrying the live inter-layer skew.
  Keys `p` transport, `[`/`]` rate; `space`/`c`/`s` and the year dial, strip,
  badges, shuffle and cross-decade behaviour are untouched.
- The per-layer ▶ now means "is this layer in the arrangement" — with one shared
  playhead there is no longer such a thing as starting a single layer.

### HONESTY: the alignment is ours, not the archive's

ERR archive items **carry no internal timecode**. Nothing in the metadata says
how a 1965 radio broadcast lines up with a 1965 newsreel; `Eetrikuupäev` is a
date, at best a day, and the badge work in Step 1 exists precisely because even
the *date* is often synthesized. So the `at` offsets on this timeline are an
**arrangement — a composer's choice, defaulted to 0 so a chord starts together —
NOT attested synchronisation.** What the transport buys is that the chosen
alignment is now exact, seekable and repeatable. It does not make it true, and
no amount of servo precision will turn it into a fact about 1965.

### Verification (headless, 1965: 3 audio + 1 video) — 11/11

| check | number |
|---|---|
| 1965 counts | **543 audio / 298 video** (unchanged from Step 3) |
| one deck, 4 layers, one adapter | caps `['media-span']`, `clockMaster:true`, tick host **worker** |
| clock master | `A3`/`A1`, **1169 `sync()` calls**, **0** corrections over the 40 ms tolerance — the vector tracked the master inside the dead band the whole run |
| chord start-together spread | **0.1 ms** (recorded before: 0–43 ms) |
| inter-layer skew while playing | max **17 ms** (audio layers ≤5 ms) |
| **ONE seek moves EVERY layer** | seek to 120.000 s → A1 122.502 / A2 122.501 / A3 122.502 / V1 122.487 s; skew **−1, −2, −1, −16 ms** |
| absence is content | seek past V1's 181 s span → V1 paused and out-of-span, the three audio layers keep playing at skew ≤4 ms |
| rate 2× | armed while paused (`rate` 0 / `targetRate` 2); **7961 ms advanced in 4000 ms**; every element rate 2.00; skew ≤16 ms |
| pause | playhead held **0.000 ms**, every layer paused, per-layer drift **0 ms** |
| errors | **0** console errors, **0** media errors |

Respect: the run used `?trickle=0` (new flag — suppresses the lazy per-item
content resolver, which would otherwise be 40 upstream GETs a verification does
not need), so upstream traffic was **6 calls total** — 2 searches + 4 content
GETs — every one through the page's own ≥1 s gate. No media proxied, nothing
cached to disk.

Evidence: `timeline-transport.png` (chord playing under the AK filmikroonika
1 May newsreel, transport bar and span lanes visible).

### Note on the script tag

`index.html`'s script is now `type="module"` (it imports the library). Module
scope is not global, so the driver handles are exported deliberately as
`window.__remix` / `window.__timeline` rather than by accident.

## Step 6 — a timeline INSIDE the arrangement: `compose.html` (2026-08-28)

Step 5 made the rack one playhead. This step answers the next question the rack
asks and could not express: **what if one of the layers is itself a session?**
`timeline/nested.mjs` (v0.3 of the library — see `timeline/lab/NOTES.md`
Checkpoint 6 for the primitive and its rules) adds a **nested/offset span
`{at, rate, deck}`**: one transport drives another DECK's position instead of an
element's `currentTime`, through the same `sync()` contract.

`compose.html` is the motivating case, built as a NEW page so `index.html`'s
autotest is untouched:

- **Parent** — an arrangement deck with the same `media-span` adapter this page
  already ships (arrangement domain, ±20 ms servo band, hard resync 150 ms),
  carrying two archive layers: `A1` 0–75 s and `A2` 10–50 s.
- **Nested child** — the instrument rig's **kept proof session**,
  `proto/instrument/results/instr-session.jsonl` (131 log rows, **128 real MIDI
  rows in epoch µs**), rebuilt through `makeLogDeck` with the instrument's own
  lane shape: an audible `midi-actuated` lane (held-note reduce, `catchUp:
  'burst'`) plus a `media-span` whose element is the **clock master inside the
  session**. Child range `[0, 18644]` ms; placed at **30 s, rate 1**, so it
  occupies 30–48.64 s of the arrangement, declared `master: true`.
- The server now aliases `/instrument/*` read-only to `proto/instrument/` — the
  session file is **loaded, never copied**, exactly as `/timeline/*` is.

### HONESTY — what is real here and what is a stand-in

- The **nested deck is real**: real MIDI rows, real inter-onset timing, real
  µs stamps from the instrument rig's own recording.
- The **archive neighbours are synthetic generated tones**, not ERR items. This
  page makes **ZERO upstream calls** by construction. The real-1965 case is
  already proven by `index.html` (Step 5, 11/11, 6 upstream calls); repeating it
  here would buy nothing and cost the archive.
- The session's **audio return is not in the repo** (it lives in the rig's
  IndexedDB), so the child's `media-span` element is likewise a generated tone
  of the session's *own recorded duration* (17.894 s), anchored at the session's
  *own* `audio-span` timestamp. **The timing comes out of the log; the sound
  does not.**
- This kept session stored no `midi-actuated` lane, so — per `play.js`'s
  `masterLane()` — the player's own rows are the master lane and the audio
  alignment is skew-limited. Stated, not hidden.

### Verification (headless, `node proto/remixer/compose-run.mjs`) — 16/16

| check | number |
|---|---|
| one parent deck, two adapters | `['media-span','deck-span']`; the nested adapter declares `nested:true`, **`clockMaster:false`** |
| the child is a real 3-lane deck | `['midi-actuated','media-span']`, child media `clockMaster:true`, nesting **depth 2**, `masterId='sess'` |
| **it plays in its slot** | parent 34.91 s → child **4.91 s**, **map error 0.0 ms**, 23 notes fired, the session's own audio at 4.657 s, readyState 4 |
| the two masters do not fight | child's INNER master: **570 `sync()` calls, 2 corrections** > 40 ms · nest's OUTER servo: **2 parent corrections, taken from the CHILD'S position** |
| **a parent seek lands inside the session** | **14/14 probes exact** (8 landing mid-note, 6 in gaps): max child position error **0.000 ms**, and the held-note set equals `reduce(<= childPos)` on every one |
| parent pause stops everything | parent drift **0.000 ms**, child drift **0.000 ms**, child media drift **0.0 ms**, both archive layers 0.0 ms; child + its media + both archive elements all paused |
| **rate 2× composes** | armed while paused (`rate` 0 / `targetRate` 2 / child target 2, `degraded:false`); playing: **5987 ms parent AND 5987 ms child in 3007 ms wall (1.99×)**, child media element at exactly **2.00×**, archive elements 2.00× |
| rate degrades HONESTLY | parent 1.5× (a legal ARCHIVE rate) is **not** on the child's `[0.25,0.5,1,2,4]` lattice → child **chose 2×, `degraded:true`**, mastering **suspended 300 servo ticks**, 206 child corrections; the arrangement still ran at **1.50×** (not silently 2×) and the child held the mapping to **4.1 ms**. Price stated: the child's inner element drifts **158 ms** ahead while the outer servo wins each frame. |
| **absence is content, one level down** | at 60 s: nested span absent, child paused, **0 notes held, 0 fires, position frozen 0.000 ms**, its media paused — while **A1 keeps playing (+2497 ms in 2.5 s)** and A2, past its own span, is correctly absent too |
| cycles rejected on the LIVE decks | `nest.add(parent)` → *"a deck cannot contain itself"*; child → parent → *"the child already contains this parent"* |
| drift nests | `driftStats().spans[0].child.kinds` = `{media-span, midi-actuated}` — the child's channel stays in the child's domain |
| errors | **0** page errors, **0** console errors, **0** media errors |

Run twice back to back, both 16/16.

**One real bug this adoption found (the pattern holds — every adoption finds
one), and it is the `caps.followsTransport` seam again.** On one headless run the
child's media element was asked to `play()` at the exact instant the nested span
entered and silently stayed paused for the whole pass (`innerSyncCalls: 0`,
`currentTime: 0`) — the deck was correct, the element just never started. Every
media client in this repo re-writes some version of this repair; `compose.html`
now has it once (`followChildMedia()`: if the child is playing and in-span and
its element is idle, restart it — never *nudge* it, it is the child's clock).
The counter `mediaRestarts` is in the report: **0 on one run, 1 on the next**,
both 16/16. This is the second time this exact seam has been filed from a client
(PROGRESS 6q listed it after four adoptions); nesting makes it three.

Evidence: `compose-nested.png` — the parent playhead at 40.29 s crossing the
nested deck's own note lane, the child's playhead glowing at 10.29 s inside it,
and key **C5 lit because a parent seek landed in the middle of that note and the
child's reducer re-asserted it**. Report: `compose-report.json`.

## Step 7 — QUOTATION: the same session deck, twice, at two fragments (v0.5)

Step 6 nested a whole stored session. `compose.html` now also **quotes a slice**
of it — `timeline/nested.mjs` rule 7, `nest.add({… in, out})`:

```js
PA.nest.add({ id: 'sess',  at: 30000, rate: 1, deck: child.deck, master: true });
PA.nest.add({ id: 'quote', at:  5000, rate: 1, deck: child.deck,
              in: 4322, out: 14322 });          // a 10 s slice of the SAME deck
```

One child deck, one audio element under it, **two spans**. The trim lives on the
span record, not on the deck (`CH.deck.range` is still `[0, 18644]` after both
adds — asserted). This is plan-timeline §−1 / C10 made executable: *a new work
is a score that QUOTES archive timelines*, and until now a span could only play
the child's whole range.

### `node proto/remixer/compose-run.mjs` — **20/20**, 0 console errors

All 16 of Step 6's checks pass unchanged. The four new ones:

| check | measured |
|---|---|
| ONE session deck QUOTED TWICE and trim did not mutate the child | `[{sess, at 30000, [0,18644]}, {quote, at 5000, [4322,14322]}]` — a 10 000 ms slice of 18 644 ms, `CH.deck.range` still `[0, 18644]` |
| a parent seek inside the QUOTATION lands inside the FRAGMENT | **6/6 exact, max child position error 0.000 ms**, held-note reduce exact at every probe (2 of 6 land mid-note). The whole-range mapping would have put the child at `u`; the fragment map puts it at `in + u` |
| past the quotation's `out` the session is absent and parked AT `out` | parked at **14 322**, not at the deck's end 18 644 — `out` IS the child's end for this quotation |
| a 20 s ask on an 18.6 s session CLAMPS and REPORTS it | `{wanted:[4322,24322], chose:[4322,18644], clamped:true, reason:"in/out clamped to the child's range [0, 18644]"}`; `in===out` and an overlapping quotation of the same deck both rejected at `add()` in words |

The 20 s slice the brief asked for does not exist: the real instrument session
is **18 644 ms**. So the demo quotes the largest true MIDDLE slice (10 s,
53.6 % of the session) and asserts the 20 s ask **clamps and says so** — which
is the more useful of the two facts.

**Placement is a rule, not a preference.** `quote` sits at `[5000, 15000]` and
`sess` at `[30000, 48644]`: rule 7g rejects two quotations of one deck that
OVERLAP in parent time, because a deck has one position. Asked for an overlap,
the library answers with the arithmetic and the workaround (two decks, to
overlay). That rejection is a check here.

**The bug the twice-quoted case forced out of the library** (both fixed in
`timeline/nested.mjs`, see lab NOTES Checkpoint 9 §2): an absent span used to
park + pause the shared child even when a sibling quotation was PRESENT (the
second quotation would have played for zero milliseconds), and the park used to
fire only on the present→absent *transition*, so playing past a span and then
seeking before it left the child stuck at the wrong edge.

`deck.setRange()` also landed this cycle (transport v0.5) — this client is the
one that filed it: a layer loading at runtime no longer needs the arrangement
deck disposed and rebuilt. `compose.html` still declares `range: [0, ARR_END]`
because its layout is static; `index.html` is the one that should adopt it.

## Mobile (2026-08-28) — index.html

No viewport meta, and `#main`'s `minmax(430px,1fr) minmax(520px,1.1fr)` grid
declares a 950 px minimum, so on a phone it was not "cramped", it was a
horizontal scrollbar. Now one column below 900 px, and a
`@media (pointer: coarse)` block gives 44 px controls, a 44 px scrubber that
takes a real **drag** (it was `onclick` only — one seek per lift and no scrub
at all), and a 96 px year strip.

**Marks are not controls.** A day tick is 2 px; there is no world in which each
becomes a 44 px target without every tick in a month overlapping. Under coarse
the marks get `pointer-events: none` (in CSS — a media query is live, a boolean
read at render time is not, and that was a real bug here) and `#strip` gets one
delegated hit-test picking the nearest item within 22 px. Same answer
`timeline/strip.mjs` gives for a canvas tick.

**Audio unlock.** iOS creates an AudioContext suspended, refuses `play()`
outside a gesture, and — the one that actually bites this rack — the layer
plays happen *after* `await resolvePlayable()`, i.e. in a later task, so they
are not inside the gesture even when a finger started them. `unlockAudio()`
runs on the first gesture of any kind (captured `pointerdown`/`touchend`/
`keydown`): it resumes the context and **primes** every media element with a
silent WAV (play → pause), which marks each element user-activated for the
session. `#unlock` is the visible fallback if `resume()` still fails.

**MediaSource, said out loud.** `attach()` already degraded correctly
(`else L.el.src = src.url` — Safari plays HLS natively). What was missing was
saying so: a silent fallback and a silent failure look identical. `#compat` now
names it, and `window.__mediaReport()` reports `{mse, managed, hlsjs,
nativeHls}`. Playback works on that path; per-layer buffer statistics and the
rendition lock do not.

`compose-run.mjs` still **20/20** (it drives `compose.html`, untouched).
`node timeline/lab/mobile-verify.mjs remixer` — 9/9.
Screenshot: `results/mobile/remixer-390x844.png`.
