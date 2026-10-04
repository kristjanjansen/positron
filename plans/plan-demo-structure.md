# plan-demo-structure: fewer pages for time, messages, sync and routing

> Asked 2026-10-04, verbatim: *"Too many of thise demos, those old halfbroken
> but useful… peopose a new structure of denis for this suff of times messages
> ayncs routes etc"*.
>
> **A proposal. Nothing is moved, renamed or archived by this document.** Every
> name below is a proposal and says so. Counted today, not remembered:
> **64 rows in `DEMOS`, 61 built, 4 unlisted** (`graph`, `rout`, `grains`,
> `feedback`), and 86 plans before this one.
>
> Every state in §2 comes from a `node demo/verify.mjs <slugs>` run made today,
> 2026-10-04, in five batches, locally, with the stand-ins `verify.mjs` starts
> itself. No external broadcaster was reached; `reel`, `floor`, `radio` and
> `tapes` were not run at all.

## 1. The verdict

**Twenty listed pages on these subjects become five, plus the ones that stay
as they are.** Each new page holds the old pages as tabs (`demo/shell/tabs.mjs`,
the way `/stage/`, `/making/` and `/kit/` already do), keyed on the four
questions the owner named: what time is, how a message travels, how two places
agree, and where a thing is routed.

| page (proposed name) | tabs (proposed labels) | absorbs | subject |
| --- | --- | --- | --- |
| **`/sync/`** (slug kept) | ARRIVAL, AHEAD, FOLLOW, AFTER | `cues`, `jam`, `sync`, `replay` | how two places agree on when |
| **`/time/`** (new slug) | SCHEDULE, BEAT, LOOPS, SCORE, DATES | `transport`, `lanes`, `loops`, `score`, `strip` | the clock under everything, on one machine |
| **`/wire/`** (slug kept) | BYTES, NOTES | `wire`, `instrument` | what a message is and how late it lands |
| **`/patchbay/`** (slug kept) | as it is | `graph`, `rout` already folded in; both archived | where a thing goes |
| **`/capture/`** (slug kept), second wave | TAKES, SEGMENTS, ROUND TRIP, FAR END | `take`, `record`, `capture`, `keep`, `show` | recording what came over a link |

**`/sync/` is the one to build first**, because its four tabs are exactly the
four regimes `plans/plan-routing-time.md` §1 already settled on, and three of
the four pages exist and pass:

| tab | regime in plan-routing-time | comes from |
| --- | --- | --- |
| ARRIVAL | *as it happens*: fire when the message lands | `/cues/` |
| AHEAD | *scheduled ahead on the peer clock* | `/jam/` |
| FOLLOW | *following a heavy link* | `/sync/` as it is today |
| AFTER | *aligned after, on one recording* | `/replay/` |

It is also the answer to the BACKLOG line *"Can we do demo on synving thing and
two clocks"*: the AHEAD tab IS the two clocks agreeing, and it is the place the
`at` / `sent` rename lands on a page.

**Stays as it is:** `und`, `click` (U:'s Csound pages, content rather than
mechanism), `draw`, `typist` (gesture and typing recorded on a line, a
different subject), `held`, `partitur` (compositions), `wish`, `away`
(instruments), `stage`, and the streaming five (`llhls`, `webrtc`, `moq`, `cam`,
`room`), which are outside what was asked. `wall` stays deployed at its URL and
leaves the index (§3.4).

**Retired to `archive/demos/`:** `graph` and `rout` (already folded into
`/patchbay/` and unlisted), and `looper` if the owner agrees (§4). Every
absorbed page's original HTML also goes to `archive/demos/<slug>-index.html`
once its tab grades at least what the page did.

**Listed rows on these subjects: 20 before, 6 after** (`sync`, `time`, `wire`,
`patchbay`, `capture`, `partitur`), with `wall` unlisted and `looper` asked
about. `DEMOS` drops from 64 rows to 50 or 49 (14 absorbed or archived, plus one
new `time` row, plus `looper` if it goes).

## 2. Inventory

The five runs, in order: `transport lanes loops score und click strip draw`
**186/186**; `cues wire jam instrument room looper take keep` **144/144**;
`record replay capture show held partitur sync wall` **172/172**; `patchbay
graph rout wish away now flipper` **264/264** (`now` and `flipper` against
`fake-err.mjs`); `llhls webrtc moq cam stage` **139/139**. **905 of 905 across
37 pages, every one green.**

`pass` is this run's harness total for the page. `page` is the page's own
asserts (`page asserted something`), and two of every page's are the shell's
feedback-button checks, so the page's real own count is `page - 2`. `needs` is
what the page reaches off this machine when a person presses its controls.

| slug | what it shows | subject | needs | pass | page | state, read from the run and the code |
| --- | --- | --- | --- | --- | --- | --- |
| `transport` | twenty events one a second, timers set just ahead and cancellable | clock | nothing | 18/18 | 6 | green; `what` is two sentences |
| `lanes` | one beat sent as worker timer, sound card and MIDI | clock | nothing (MIDI optional) | 18/18 | 6 | green but thin: `both lanes advanced` read `worker 18 / sound card 1`, `1 paired positions` |
| `loops` | one recording placed three times, the last looping | timeline | nothing | 25/25 | 13 | green |
| `score` | one file format for scores in several languages | timeline | nothing | 23/23 | 11 | green; `what` is three sentences |
| `strip` | two thousand years on one line, dates as brackets | timeline | nothing | 23/23 | 11 | green; 9 middots in the page |
| `und` | a Csound score compiled as you type | timeline (U:) | nothing | 28/28 | 16 | green; stays |
| `click` | U:'s vClick, a click track on a screen | timeline (U:) | nothing | 24/24 | 12 | green; stays |
| `draw` | record a line drawn by hand | technologies | nothing | 27/27 | 15 | green; stays |
| `cues` | one press, every open copy shows the cue | messages, sync | relay | 14/14 | 8 | green; **hand-rolls its WebSocket** (not `openWire`), stamps a payload `at: Date.now()` which the rename changes meaning of; only its OWN echo is graded, never a second copy |
| `jam` | two machines counting eight beats, neither leading | sync | relay (peer clock) | 21/21 | 9 | green; **its subject is two machines and the run grades one**: `alone means zero offset`, `0 peer(s)` |
| `sync` | cues against a late picture, arrival wall and following wall | sync | nothing | 14/14 | 8 | green, built today, includes a negative control |
| `replay` | a 190 s show off R2 with its eight recorded cues | sync (aligned after) | R2 | 22/22 | 10 | green; 12 middots |
| `wire` | compose a message, see the bytes out and back | messages | relay, `workers/store` | 23/23 | 17 | green, strongest of the old pages; `room: 'fixed'`; 11 middots |
| `instrument` | a keyboard whose sound may come from another machine | messages | relay, WebRTC | 22/22 | 15 | green; **the other machine's sound is never graded**: `sound source matches what is connected`, `here, peer no` |
| `looper` | a WebAudio synth with a space-bar loop pedal | instruments | nothing | 14/14 | 8 | green; the keyboard component now carries its own Loop on every keyboard page (BACKLOG, done 2026-09-30) |
| `take` | record again and again, takes laid end to end | capture | nothing (camera) | 20/20 | 8 | green; 16 middots |
| `keep` | send out, record the copy that comes back | capture | Stream (WHIP and WHEP) | 17/17 | 5 | **green with eleven of its own asserts unreached**: 14 distinct `d.assert` names in the source, 3 ran (the TURN ones), and `the picture went out and came back`, `the clock survived the round trip`, `the take is seekable` and eight more never ran. Not diagnosed |
| `record` | bytes held never grow past one segment | capture | nothing (stand-in hand-off) | 13/13 | 7 | green; `what` is three sentences and says `capture` is the page that really uploads |
| `capture` | camera recorded in 2 s segments and played back | capture | R2 with `?r2=1` | 14/14 | 8 | green; overlaps `record` (both are 2 s MediaRecorder segments) |
| `show` | what the far end of a WebRTC hop received is recorded | capture | relay (signalling) | 17/17 | 11 | green |
| `held` | Held in Human played from its score | composition | nothing | 55/55 | 43 | green; stays |
| `partitur` | Moholy-Nagy's 1924 score as a timeline | composition | relay when linked | 27/27 | 15 | green; stays |
| `wall` | a screen that joins the patchbay as a projection wall | routing | relay (`studio-1`) | 10/10 | 4 | green; a surface opened on a projector, not a page to read |
| `patchbay` | one patchbay for notes, sound, video and code, Pi included | routing | relay, the Pi | 35/35 | 29 | green |
| `graph` | the first universal-routing page | routing | relay, the Pi | 22/22 | 16 | unlisted since 2026-10-04, folded into `patchbay` |
| `rout` | the routing core's test vectors and a split keyboard | routing | nothing | 47/47 | 41 | unlisted since 2026-10-04, folded into `patchbay` |
| `wish` | say which instrument plays which, a model makes the link | routing | `wish-local.mjs`, WebMIDI | 77/77 | 71 | green; stays |
| `away` | an instrument panel on the Pi | instruments | the Pi | 25/25 | 19 | stays |
| `now` | one ERR channel, right edge is now | archives | ERR (stand-in in the run) | 35/35 | 23 | green against `fake-err.mjs`; out of scope |
| `flipper` | eight ERR channels | archives | ERR (stand-in in the run) | 23/23 | 11 | green against the stand-in; out of scope |
| `llhls` | the tuned low-latency player | streaming | Stream | 16/16 | 10 | out of scope |
| `webrtc` | the same live picture over WHEP | streaming | Stream | 28/28 | 22 | out of scope |
| `moq` | the test picture over MoQ and back | streaming | Cloudflare MoQ relay | 25/25 | 19 | out of scope |
| `cam` | one webcam over WebRTC, MoQ and LL-HLS | streaming | Stream, MoQ | 15/15 | 9 | out of scope; overlaps `webrtc` and `moq` |
| `room` | two windows see each other peer to peer | streaming | relay (signalling) | 13/13 | 7 | out of scope |
| `stage` | a MIMproject scene live over WebRTC | streaming, th | Stream | 55/55 | 45 | stays; its own tabs |

**What "half broken" turned out to mean.** Every page run today is green. What
is wrong with the old ones is not red runs, it is three things the harness
total hides:

1. **A green page whose headline is never graded.** `keep` (11 of 14 own
   asserts unreached), `jam` (two machines, graded alone), `instrument` (the
   other machine's sound, graded as `peer no`), `cues` (another copy's view,
   graded by its own echo), `lanes` (one sound-card mark). CLAUDE.md already
   says it: only the assert COUNT says so.
2. **The older socket code.** `cues` opens its own `new WebSocket` rather than
   `openWire`, which is the hand-rolled-control shape `positron-ui` records for
   `/keys/` against `board.mjs`.
3. **The prose rules arrived after them.** `transport`, `lanes`, `score`,
   `jam`, `cues`, `wire`, `instrument`, `room`, `take`, `keep`, `record`,
   `capture`, `show` all carry a `what` of two to four sentences; `strip`,
   `take`, `keep`, `replay`, `wire`, `looper`, `show` carry 6 to 16 middots
   each. A merge is the occasion to fix both, page by page, as CLAUDE.md asks.

## 3. Each merge

The mechanism is the same for all of them and is §5 step 1. A tab is the old
page's body moved into a module under the new page's directory
(`demo/sync/arrival.mjs` and so on), built into `tabs.panel(id)` with its own
report (`createReport` in `shell.mjs`, which `/stage/`, `/pack/` and `/kit/`
already use for exactly this), and its checks run from the page's one
`SELFCHECK` pass. **Nothing is opened on load, and nothing is opened for a tab
nobody has picked**: `cues` and `jam` join the relay at load today, and inside
`/sync/` they join on the first press in their own tab.

### 3.1 `/sync/`: ARRIVAL, AHEAD, FOLLOW, AFTER

- **ARRIVAL, from `/cues/`.** Brings: fire a cue, fire ten, the name on show,
  delivery time. Ported to `openWire` on the way in, and its `at` follows the
  rename (`sent` for when it left, `at` for when it should happen), which is
  the other agent's work and lands first. Gains what it never had: a second
  copy of the receiver inside the same tab, so *every open copy shows the same
  cue* is graded rather than inferred from the sender's own echo. Drops: its
  three-sentence `what`.
- **AHEAD, from `/jam/`.** Brings: the peer clock (`proto/looper/peer.mjs`),
  the deck on the shared clock, the eight-beat pulse. Gains: two peers in one
  tab with an injected offset, the way `/sync/` already runs its negative
  control, so *two machines with neither leading* is graded on one machine
  (offset found, beats agree within the 3 ms `/jam/` measured). The real
  second machine (`node rig/peer.mjs` on the Pi) stays a thing a person can
  add. This tab is the two-clocks demo the BACKLOG asked for.
- **FOLLOW, the current `/sync/`.** Moves into a tab unchanged: three links,
  two walls, `timebase.mjs`, the negative control.
- **AFTER, from `/replay/`.** Brings: the 190 s show off R2, the eight cues,
  media as transport master, the loop. It is the only tab with a transport bar,
  so it keeps `__demo.transport` and the harness's own drill on it (§5 step 1).
- **Surviving URL:** `/sync/`. `/cues/`, `/jam/`, `/replay/` redirect to
  `/sync/#arrival`, `#ahead`, `#after` (§3.6).
- **Carries over, measured today:** page asserts 8 (`sync`) + 6 (`cues`, less
  the two shared) + 7 (`jam`) + 8 (`replay`) = **29 at least**, plus the two
  new two-copy and two-peer checks. Harness totals today: 14 + 14 + 21 + 22 =
  71 across four runs.
- **Description, proposed, one sentence:** *Four ways two places agree on when
  something happens, from firing on arrival to lining up on a recording.*

### 3.2 `/time/`: SCHEDULE, BEAT, LOOPS, SCORE, DATES

- **SCHEDULE, from `/transport/`.** Twenty events, timers set just ahead,
  pause really stops. The whole of the old page.
- **BEAT, from `/lanes/`.** One beat as worker timer, sound card and MIDI.
  Brings its thin sound-card check as it is and says so; strengthening it
  (more than one committed mark) is a separate line in `BACKLOG.md`.
- **LOOPS, from `/loops/`.** One recording placed three times.
- **SCORE, from `/score/`.** One file format for several score languages.
- **DATES, from `/strip/`.** Dates that are a bracket rather than a day.
- **Every one of these has its own transport bar**, and `verify.mjs` drills
  only `__demo.transport` (play advances, pause holds, keyboard seek, rate
  lattice, strip has ink: five asserts a page). Four of the five bars lose that
  drill in a merge unless it is re-expressed as page asserts per tab, which is
  why §5 step 1 makes it a helper first. Each tab's bar is built with
  `publish: false` except the one the page names.
- **Surviving URL:** `/time/` (new). `/transport/`, `/lanes/`, `/loops/`,
  `/score/`, `/strip/` redirect to its tabs.
- **Carries over:** page asserts 4 + 4 + 11 + 9 + 9 = **37**, plus 4 bars x 5
  drill asserts = 20 re-expressed. Harness totals today: 18 + 18 + 25 + 23 + 23
  = 107.
- **Description, proposed:** *The clock every other page here runs on, set a
  moment ahead so it can still be stopped.*
- **Name, and why not `/clock/`:** `time` is the owner's own word in the ask.
  `/clock/` would read as the peer clock, which lives in `/sync/`.

### 3.3 `/wire/`: BYTES, NOTES

- **BYTES, the current `/wire/`.** Unchanged, and it keeps `room: 'fixed'`
  because its history is the subject.
- **NOTES, from `/instrument/`.** A keyboard over the relay with the sound
  made here or on another machine. Brings its two latencies and the Evolution
  Loop checks. Gains a second peer in the same tab offering sound, so
  *hear the other machine* is graded once rather than never.
- ⚠️ **The fixed room is per PAGE in the manifest** and `instrument` must NOT
  inherit it, or two harness runs meet in one room. The tab passes its own
  room; §6 lists this as the one manifest field a merge strains.
- **Surviving URL:** `/wire/`. `/instrument/` redirects to `/wire/#notes`.
- **Carries over:** 15 + 13 = **28 page asserts at least**. Harness totals
  today 23 + 22 = 45.
- **Description, proposed:** *A message as the exact bytes that travel, and a
  note as how late it lands on another machine.*

### 3.4 `/patchbay/`, `graph`, `rout` and `wall`

- `graph` and `rout` were folded into `/patchbay/` on 2026-10-04 (BACKLOG:
  *"`/rout/` and `/graph/` become one page"*, done, *"keep their URLs"*) and
  are unlisted. **Proposed: archive both**, rows out of `DEMOS`, files to
  `archive/demos/`, and redirects to `/patchbay/` rather than the 404 that
  `/able/` and `/seek/` got, because the plans that name them are four days
  old and still read.
- `route-core-test.mjs` and the vectors (`index.json`) are not page code and do
  not move.
- **`wall` stays built and goes `unlisted: true`.** It is a surface somebody
  opens on a projector or a phone and points at the room `studio-1`; it is
  never a page anybody reads for its own sake. Its card on the front page is
  noise. It keeps its 4 page asserts in the suite.
- `partitur` and `wish` are untouched.

### 3.5 `/capture/`, second wave: TAKES, SEGMENTS, ROUND TRIP, FAR END

- **TAKES from `take`, SEGMENTS from `capture` plus `record`** (both are
  MediaRecorder in 2 s segments; `record` proves memory stays flat and stands
  in for the hand-off, `capture` really uploads with `?r2=1`, so they are one
  tab with both readings), **ROUND TRIP from `keep`, FAR END from `show`.**
- ⚠️ **ONE COST ARGUES AGAINST PUTTING ROUND TRIP HERE.** `keep` publishes over
  WHIP and plays back over WHEP, which is Stream minutes, and one page means one
  harness run, so a change to TAKES would then pay for a Stream round trip every
  time it is checked. Two ways out, for the owner: ROUND TRIP self-checks only
  when its tab is the one named in the query, or `keep` stays its own page.
- ⚠️ **AND `keep` IS FIXED BEFORE IT MOVES.** Its eleven unreached asserts are a
  separate finding; merging a page whose headline does not run would carry 5
  page asserts where 16 are written.
- **Surviving URL:** `/capture/` (its slug is the subject's own word, which is
  why it survives rather than `take`).
- **Carries over:** 6 + 6 + 5 + 3 + 9 = **29 measured today**, and **40** once
  `keep`'s eleven run. Harness totals today 20 + 14 + 13 + 17 + 17 = 81.
- **Description, proposed:** *Recording what came over a link, from a take on
  this machine to the far end of a live connection.*

### 3.6 Redirects

**Today the site redirects exactly one path.** `workers/view/src/index.js:460`
answers `/eccm` and `/eccm/*` with a 301 to `https://eccm.positron.studio`,
query kept. Every earlier rename (`/radio1965/`, `/box/`, `/vclick/`,
`/sound/`) and every retirement (`/seek/`, `/able/`, `/bay/`) simply 404s, by
choice, written down in `positron-history`.

**Proposed: one table beside the `/eccm/` block**, `old slug -> new path and
hash`, answered with a 301, and the same table read by `demo/server.mjs` so a
local link behaves like the deployed one. A fragment in a `Location` header is
kept by browsers, so `/jam/` lands on `/sync/#ahead`.

- ⚠️ **THE TABLE IS ALSO THE REGISTER OF SLUGS THAT MAY NEVER BE REUSED.** The
  `/held/` lesson (`positron-history`): a kept link that silently opens a
  different page is worse than a dead one. A slug in this table is spent.
- ⚠️ **A 301 IS CACHED BY BROWSERS FOR GOOD.** That is the right property for a
  slug that is spent, and the reason not to use one for anything temporary.
- The alternative is the house default, 404. It costs nothing to build and
  leaves about 60 references in `plans/`, `HANDOFF.md`, `BACKLOG.md` and
  `research/` pointing at dead pages (counted loosely today: `/replay/` 14
  files, `/looper/` 15, `/jam/` 13, `/instrument/` 11).

## 4. What is retired, and why

| slug | why | how |
| --- | --- | --- |
| `graph` | folded into `/patchbay/` 2026-10-04, unlisted since, its page is the older half | row out, file to `archive/demos/graph-index.html`, redirect to `/patchbay/` |
| `rout` | the same; its test vectors live on in `route-core-test.mjs` and in `/patchbay/`'s contract | row out, file to `archive/demos/rout-index.html`, redirect to `/patchbay/` |
| `looper` | **asked, not decided.** Its loop pedal is now on every keyboard (BACKLOG, done 2026-09-30, the Evolution Loop) and its WebAudio synth is one of several (`nola`, `fau`, `collide`); `looper.mjs` the KIT module is used by `/radio/` and `/tapes/` and does not move. It is not about time, messages, sync or routing, which is why it has no tab to go to | row out, file to `archive/demos/looper-index.html`, 404 or redirect to `/kit/` |
| every absorbed page | its code now lives in a tab; the file is kept as the record of what the page was | each `demo/<slug>/index.html` to `archive/demos/<slug>-index.html` in the step that makes its tab green, with a section in `archive/demos/README.md` |

**`built: false` is never the tool for any of this.** It removes the page from
the deploy and leaves a dead card (`workers/view/build.mjs:566`, `if (!d.built) continue`; CLAUDE.md still says line 532). The steps are
`unlisted: true` while a tab is being built, then the row out and the file to
`archive/`.

## 5. Order of work

One page per step, shared pieces first, done by one agent before any page
agent starts (CLAUDE.md, *"anything shared is done once"*). Agents do not
commit. Each step ends with a build, a deploy, the stamp, and a URL.

**How every step is graded.** `node demo/check-html.mjs demo/<page>/index.html`
first. Then ONE run, `node demo/verify.mjs <new> <old>`, with the old page
still built and unlisted, so the two counts sit side by side in the same
output. **The step is done when the new page's own asserts are at least its
previous own count plus the absorbed page's own count (less its two shared
feedback checks), plus five per absorbed transport bar.** Then one sabotage per
new tab (break the thing the tab is about, see its asserts go red, put it
back), because a tab whose checks cannot fail is the `/webrtc/` story again.
Only then is the old row taken out.

| step | what | graded by |
| --- | --- | --- |
| 0 | **Owner decides**: the names, `looper`, redirects or 404, whether `/capture/` is in scope and where ROUND TRIP goes | |
| 1 | **Shared, once**: (a) a tab-section convention, a module per tab exporting `build({ panel, d, report })` and its checks, written into `positron-ui`; (b) a helper that runs the harness's five-assert bar drill against a named bar as page asserts, because `verify.mjs` drills only `__demo.transport`; (c) the redirect table in `workers/view/src/index.js` and `demo/server.mjs` | `/kit/` gains a specimen of (a) and (b) with its own asserts; `curl -sI` on one redirect locally |
| 2 | archive `graph` and `rout`, redirect them | `patchbay` unchanged at 35/35 and 29 page asserts |
| 3 | `wall` to `unlisted: true` | `wall` unchanged at 10/10 |
| 4 | `/sync/` gains FOLLOW as a tab (itself) | 14/14, 8 page asserts, nothing lost |
| 5 | ARRIVAL from `cues`, after the `at`/`sent` rename has landed | `sync` own >= 8 + 6 + the two-copy check |
| 6 | AHEAD from `jam` | + 7 + the two-peer check |
| 7 | AFTER from `replay` | + 8, and the harness drill now on AFTER's bar |
| 8 | `/wire/` gains NOTES from `instrument` | `wire` own >= 15 + 13 + the second-peer check, `wire`'s fixed room untouched |
| 9 | `/time/` created from `transport` | 4 own + 5 drill |
| 10 to 13 | `lanes`, `loops`, `score`, `strip`, one each | + own + 5 drill per step |
| 14 | `keep`'s eleven unreached asserts made to run, alone | `keep` own 3 to 14 |
| 15 to 18 | `/capture/` gains TAKES, ROUND TRIP or not, SEGMENTS, FAR END | sums in §3.5 |
| 19 | `looper` if agreed | |
| 20 | front page: group titles, `act`, the `one` lines, CLAUDE.md's count by the command | `node -e "…DEMOS.length"` |

## 6. What could not be settled

- **Whether "half broken" means more than what a run shows.** Every page here
  was green today. The defects in §2 are the ones a run and a read of the code
  can show; something the owner has seen on a phone or on the projector would
  not appear in either, and is worth asking about before step 4.
- **Why `keep`'s eleven asserts did not run.** The run pressed `Send and receive`,
  `Use the camera`, `Delete takes` and `●` in that order, and `runChecks` is
  called from the recorder's `onstop`. Whether the take never stopped inside
  the 30 s settle, or `Delete takes` raced it, was not looked into; the brief
  for this plan was read only.
- **One manifest row per page.** `room: 'fixed'`, `settleMs` and `bootMs` are
  per page, and a tabbed page needs them per tab (`wire` fixed, `instrument`
  not). Either the tab passes its own room, or the manifest grows a per-tab
  field. Not decided here.
- **The harness drill on several bars.** Re-expressing it as page asserts
  (step 1b) is a proposal; teaching `verify.mjs` to drill every bar a page
  names is the other way, and it touches every page's count.
- **Settle time adds up.** `/sync/` stays short (`replay` 6 s, `cues` under 1
  s). `/capture/` would sum to about 80 s (`keep` 30, `capture` 26, `take` 13,
  `show` 9) in one run.
- **Whether redirects are wanted at all.** The house rule has been 404 on
  every rename. §3.6 argues for a table; it is the owner's call.
- **The streaming five were left alone on purpose** (`llhls`, `webrtc`, `moq`,
  `cam`, `room`). `cam` repeats `webrtc` and `moq` from a camera, and a later
  `/streams/` with tabs is possible, but each of them wakes Stream or the MoQ
  relay and one page would make every check of one leg pay for all of them.
- **The names.** `time`, `sync`, `wire`, `capture` and every tab label are
  proposals. Kept short and plain, and `sync` and `wire` keep slugs that exist.
- **The runs were made while another agent was renaming the wire envelope's
  `at` to `sent`.** `demo/cues/`, `demo/wire/`, `demo/sync/`,
  `demo/instrument/` and `demo/shell/wire.mjs` were modified in the working tree
  during the second and third batches, so those four pages' counts may describe
  a tree that was half renamed. All four were green; they are worth one rerun
  each once the rename lands, which step 5 needs anyway.
- **CLAUDE.md's pointer for the `built: false` rule is stale by 34 lines.** It
  says `workers/view/build.mjs:532`; the line `if (!d.built) continue` is at
  566 today. The rule itself is unchanged.
