# plan-stage-patchbay: `/stage/` as patchbay nodes and links

> Asked 2026-10-05, verbatim, in `BACKLOG.md` under `## Open`: *"can we rework
> stage to new patchbay stuff"*.
>
> **NOTHING HERE IS BUILT.** Written from reading `demo/stage/index.html`,
> `demo/patchbay/index.html`, `demo/shell/bay.mjs`,
> `demo/shell/graph-registry.mjs`, `demo/wall/index.html`,
> `demo/partitur/index.html`, `workers/pub/worker.mjs`, `demo/shell/ingest.mjs`,
> `demo/shell/live.mjs` and the eight plans named below, plus ONE harness run.
> Every claim says MEASURED (run or counted today, 2026-10-05) or READ (read in
> source or a plan, not run).
>
> Read before designing, per the rule that a plan starts from what is already
> planned: `plan-universal-routing.md`, `plan-route-core.md`,
> `plan-routing-time.md`, `plan-patchbay.md`, `plan-stage-live.md`,
> `plan-stage-hls-record.md`, `plan-stage-hls-webrtc.md`,
> `plan-demo-structure.md`. **None of them proposes this rework.** The nearest
> are `plan-universal-routing.md` §9 (`cam:phone/video -> stage:screen/video`,
> one illustrative line) and `plan-routing-time.md` §5a
> (`partitur:light:cues -> wall:cue { follow: stage:cam:video }`), which both
> name a stage node that does not exist yet.

## 1. The verdict

**Do it, and do it as REGISTRATION, not as embedding.** `/stage/` already is a
signal path of six links with a lease, a store and a consent gate, written by
hand. Re-describing it as bay nodes and links costs little, makes the stage
visible and linkable on `/patchbay/`, and gives it its first cross-page link for
free: `/partitur/`'s existing `stage cues` lane can caption the live picture
with **zero new code in partitur**, because partitur already offers every
`state` in port whose `shape.schema` is `cue` (READ, `demo/partitur/index.html`
`targets()`).

**What it will NOT do is make `/stage/` much shorter.** MEASURED by counting:
the page is 4,788 lines, of which **3,035 are comment lines, 136 blank, and
about 1,617 code**, and of the code **1,031 lines are the page and 586 are its
checks**. The routing parts are a small fraction of that. The rework moves
roughly 150 to 250 lines out into shared modules and adds roughly 120 back
(graph, announce, caption, links table, new asserts). Anybody expecting a
page half the size should hear that now. A smaller page is a comment pruning
job, which nobody has asked for.

**And three shared changes come first**, because the patchbay as built would
mis-handle the stage the moment it was announced (§3, findings F1 to F3).

## 2. A correction to the brief, MEASURED

The brief says the default is an in-page loopback and `?live=1` is the real
WHIP/WHEP leg. **That stopped being true on 2026-09-25.** MEASURED by grep: no
`Q.get('live')` exists; the only query parameters read are `room`, `r2`,
`from`, `to`, `bg`. The page's own comment at lines 113 to 124 records *"rm
loopback"* and *"make it pure receivers"*, and `startShow()` (line 2388) holds
`wss://pub.positron.studio/stage/watch`, waits for the container's WHIP leg
with `waitForWhip`, then subscribes with `whepPlay(stageWhep())`. The header
comment at lines 44 to 58 still describes the loopback and `?live=1` and is
stale. **Every visitor press of Start WebRTC holds a real Cloudflare publisher.**
The harness does not: under `?selfcheck=1` without `DEEP` the press logs and
does nothing (`LIGHT`, line 138).

## 3. The stage's signal path, mapped onto bay (question 1)

### 3.1 What `/stage/` routes today, piece by piece

| piece | where (READ) | what it is in bay terms | medium | exists in bay/patchbay today? |
| --- | --- | --- | --- | --- |
| the MIM film, R2 corpus row `mim:mim-goes-sustainable-2011-kirikustseen` | `readFilm()` 601, `loadBackground()` 628 | a `store` out port, read twice: once by the container, once by the page as a monitor | `video` (file) | store kind yes; a video store port **no** (patchbay's `r2:recordings` ports are `audio` only) |
| the container publisher (ffmpeg on WHIP into the stage live input) | `workers/pub/worker.mjs:36` *"the MIM film on its own WebRTC input, WHIP only, no clocks, no RTMPS"* | provisioning, out of band. `plan-universal-routing.md` §7: *"A link can point at one, never make one"*. Not a node | | correctly absent |
| the hold that wakes it | `holdShow` 1794 (`holdPublisher(..., STAGE_PUB)`), `waitShow` 1796 | **the lease of the link below**, exactly §4's *"a link is a lease"* | | lease idea yes, as code only inside patchbay (`holdSource`, `RENEW_MS`); no shared lease helper |
| the Cloudflare live input `STAGE_UID` | `live.mjs:48` | an `endpoint` node with one `video` out port, FIXED address | `video` | `endpoint` is in `NODE_KINDS` but **no page announces one** (MEASURED, grep of `demo/`) |
| WHEP into the page | `startShow()` 2472 to 2486 | a heavy link `endpoint:video -> stage:room:video`, session `{ transport: 'whep' }` | `video` | chooser row yes (`TRANSPORTS.video['internet-one']`); **no WHEP opener** in patchbay (openers are `remote, listen, synth, video, keys, notes, record, play`, and `video` is the Pi's relay H.264) |
| the control room and audience panels | panels 248ff, `showPictureOn` 987 | one `screen` node, `video` in | `video` | screen kind yes |
| MediaRecorder on the received track | `startRecorder()` 2293 | a record link from the screen's video into a store | `video` into store | record opener exists **for audio only** (`kindOf` requires `a.medium === 'audio'`) |
| IndexedDB, 2 s pieces | `openLocal`..`localRead` 2221 to 2292 | a `store` on the browser's own machine, chooser row `file/machine` = `indexeddb` | `video` | row yes; nobody uses it |
| upload at stop, one object, with progress | `uploadToR2()` 2695 | a link `local:out -> r2:recordings:in`, chooser row `file/internet-one` = `ingest` | `video` | row yes; patchbay ships PIECES via `createShipper`, stage ships ONE object via a private XHR copy of `putWhole` |
| playback from the R2 URL | `openArchive()` 2818 | `r2:recordings:out -> stage:archive:video` | `video` | **no chooser row for reading one object over https**: a store's out port on `internet-one` is answered `ingest`, which names the write path |
| `?bg=` ERR archive clip behind the stage | `BG_ASKED` 842, gated `!SELFCHECK` | an `external` node; the link needs consent | `video` | **yes**: `validate()` refuses a link out of `external` without `opts.consent` |
| questions out, answers back, presence, `show.state` | `openWire(ROOM)` 1023, `onWire` 1094 | a many to many bus | `state` | `plan-universal-routing.md` §7 says keep it a room, and so does this plan |
| `__demo.chain = { local, r2, play, url }` | 1970 to 1977 | the hand-rolled link-state record of the three links above | | it IS bay's link list with a state per link, written by hand |
| ICE path and RTT cells | `readPath` 894 | a property of an open WHEP session, `via` in patchbay's terms | | patchbay shows `via` per open link |

### 3.2 The same, as bay's level 2 text

```
stage-input:live:video   -> stage-ab12:room:video     # whep, lease: the hold socket
stage-ab12:room:video    -> stage-ab12:local:in       # indexeddb, while on air
stage-ab12:local:out     -> r2:recordings:video-in    # ingest, one object at stop
r2:recordings:video-out  -> stage-ab12:archive:video  # https, the object URL
r2:mim:film              -> stage-ab12:room:monitor   # the control room's own copy of the film
err:<slug>:video         -> stage-ab12:room:monitor   # ?bg=, consent, a person only
partitur-xx:light:cues   -> stage-ab12:room:cue       # state, schema cue, NEW
```

`stage-ab12` is the page's rendezvous (`ROOM` is already
`stage-<rand6>`). `stage-input` is an address: one Cloudflare input serves every
visitor. That is `plan-universal-routing.md` §8's rule, *"an address is fixed, a
rendezvous never is"*, and the page's own comment at line 93 is where the rule
was first written.

### 3.3 Findings that block a naive version, READ

- **F1. The chooser would pick a transport the stage input does not have.**
  `whereOf()` turns a second internet receiver of one port into
  `internet-many`, and `TRANSPORTS.video['internet-many']` is `llhls`. The stage
  input is WHIP only (READ, `workers/pub/worker.mjs:36`), and the owner removed
  the HLS leg on 2026-09-30 (*"can you have just webrtc transport?"*). So on
  `/patchbay/`, the second screen linked to the stage would get a session naming
  LL-HLS that does not exist. **Fix in `bay.mjs`: a port may declare
  `transports: ['whep']`, and `sessionFor` picks the first row that port
  allows, or refuses in words.** Graded in `bay-test.mjs` with a negative
  control (an undeclared port still gets the table's answer).
- **F2. `/patchbay/` dispatches openers by medium, not by session.** `kindOf()`
  answers `'video'` for ANY video link into `web:screen:video` with an address,
  and `openVideo` then calls `boardOn(site)` and asks the Pi for `video.start`.
  Announce the stage input and press Open, and the patchbay would try to start
  the Raspberry Pi's GPU video in a room named after a Cloudflare input. **Fix:
  dispatch heavy links on `session.transport` (`relay-h264` to `openVideo`,
  `whep` to a new WHEP opener).**
- **F3. A registry keeps one graph per socket and a graph is one site**
  (`graph-registry.mjs` `ingest`, keyed by `msg.from`; `graphProblem` refuses a
  node outside `g.site`). The stage needs two sites, its own rendezvous and the
  fixed `stage-input`. Either the registry keys by `from + site` (a small
  change, graded by `graph-registry-test.mjs`), or `workers/pub` announces the
  input itself the way `workers/store` joins a room as a peer. **Recommended:
  the registry change**, because it touches no worker and no deploy of `pub`;
  identical `stage-input` graphs from many tabs then merge under the existing
  *freshest per site wins* rule.
- **F4. `file` versus the carried medium on store ports.** `plan-universal-
  routing.md` §3 gives a store `file` ports; `/patchbay/` gave
  `r2:recordings` `audio` ports so the medium check passes, and `sessionFor`
  already treats any link with a store end as the `file` row. The stage follows
  patchbay's working convention (`video-in`, `video-out` on the store) and this
  plan does not reopen it.
- **F5. The "join the patchbay" handshake is hand-rolled three times.**
  `wall`, `partitur` and `patchbay` each carry `ROOM = 'studio-1'`, a random
  `SITE`, `openWire`, announce on open, answer `graph.ask`, re-announce on a
  timer, and (two of them) `link.request` / `link.state`. Stage would be the
  fourth copy. Lift it once (§5, step 2).
- **F6. A harness run of `wall` or `partitur` announces into the real
  `studio-1`.** Both hard-code the room and ignore the `?room=` that
  `demo/verify.mjs:704` appends, and neither is `room: 'fixed'`. That is the
  `FCM_TOPIC` shape from CLAUDE.md in small: every suite run puts a fake wall on
  the owner's `/patchbay/`. The stage must not repeat it, and the shared helper
  is where to fix all three at once: **`studio-1` for a person, the run's own
  room under `SELFCHECK`.**
- **F7. WHIP's 20 an hour does not bind `/stage/`.** `WHIP_PER_HOUR = 20` in
  `workers/pub/worker.mjs:30` counts BROWSER publishes through `/whip`, and the
  stage page publishes nothing since 2026-09-25. What binds a stage press:
  `ICE_PER_HOUR = 120` relay credentials overall (one per press,
  `fetchIceServers`), the container's cold wake (about 22 s, READ from the
  page), Stream minutes delivered (billing from 2026-10-15, READ from the
  page's own comment), and on stop `ingest`'s **5 sessions and 64 MiB per
  address per hour, 24 MiB per session** (READ, `workers/ingest/worker.mjs:100`).

## 4. What a visitor sees (question 2)

**Recommended: register, do not embed.** The stage announces its nodes into the
studio's room so `/patchbay/` draws them and can link them, keeps its own
links in a page-local bay, and shows those links as one read-only table in the
control room. The audience tab does not change at all.

Why not embed the patchbay view:

1. **The page is a show, not a desk.** Embedding `/patchbay/` puts the
   Raspberry Pi's synths, keys and recordings into a page about a 2011 church
   scene, and on the Audience tab they are nobody's business (the page's own
   reason for having no controls row, line 196).
2. **1,203 lines of somebody else's page.** The patchbay is a page, not a
   component. Embedding means lifting its renderer, its openers and its scenes
   into the kit first, which is a rework of `/patchbay/` disguised as a rework
   of `/stage/`.
3. **Harness arithmetic.** Every control the embed adds moves the harness's
   presses (CLAUDE.md's rule that adding a control moves every other control's
   press). The stage's only control today is control 0, `Start WebRTC`.
4. **It already exists one click away.** Once the stage announces,
   `https://positron.studio/patchbay/` is the patchbay view of it.

What changes on screen, all in the Control room tab:

- **A Links table** (`createTable`, read-only, no buttons): one row per link in
  §3.2, its level 2 text, its transport, and its state (`described`, `held`,
  `open 1280x720`, `rec 12 pieces`, `stored 4.1 MiB`, `off in this run`). It
  replaces nothing visible today; `__demo.chain` becomes a projection of it so
  every existing chain assert keeps reading the same four fields.
- **A caption line on the live picture** when a `cue` arrives on
  `stage-ab12:room:cue`, drawn where the question already sits (line 1613,
  *"ON THE PICTURE, WHERE SUBTITLES LIVE"*). This is the payoff a person can
  see: open `/partitur/`, pick the stage in `cues to`, press play, and the score
  captions the show.
- **The diagram stays hand-written**, with one new check that every media link
  it draws names a link the bay holds. Generating it from the bay would need
  `/patchbay/`'s private `specFor` lifted into the kit and the
  `positron-diagram` rules about notes re-earned; not worth it in this pass.
- **The `what` and `one` lines do not change** unless the caption ships, and
  then by the one-sentence rule, re-read whole and not stapled.

## 5. Order of work, shared first (question 3)

Steps 1 to 4 are shared and done by ONE agent before any page work starts, as
CLAUDE.md requires. Agents do not commit.

| step | file | what | lines (estimate) |
| --- | --- | --- | --- |
| 1 | `demo/shell/bay.mjs`, `bay-test.mjs` | F1: `transports` on a port, honoured by `sessionFor`, refusal in words; negative control | +30 module, +25 test |
| 1 | `demo/shell/graph-registry.mjs`, `graph-registry-test.mjs` | F3: key by `from + site`, so one socket may announce its rendezvous and a fixed endpoint | +10, +20 test |
| 2 | NEW `demo/shell/bay-join.mjs` | F5 and F6: join a room as patchbay nodes. `{ graphs, onLink, onMessage }`; announce on open, answer `graph.ask`, re-announce every 10 s, answer `link.request` through a callback; room is `studio-1` for a person and the run's own room under `SELFCHECK`, overridable with `?bay=` | +80 |
| 2 | `demo/wall/index.html`, `demo/partitur/index.html` | move both onto `bay-join.mjs` in the same step, so the module lands with users and F6 is fixed where it already happens | about -20 each |
| 3 | `demo/shell/ingest.mjs` | `putWhole(blob, { onProgress })` over XHR, which the stage's own comment at `uploadToR2` already asks for (*"The right home for it is an `onProgress` option on `putWhole`"*) | +25 |
| 4 | `demo/shell/live.mjs` | `openHeldWhep({ hold, statusUrl, whepUrl, video, iceServers, log })`: hold, wait for the publisher, ICE, `whepPlay`, `waitForFirstFrame`, returning `{ sub, seen, close }`. The two waits keep their ordering (inner shorter, the page's 37/49 lesson) and their comments move verbatim | +60 |
| 5 | `demo/patchbay/index.html` | F2: dispatch heavy links on `session.transport`; a `whep` opener that SUBSCRIBES ONLY and never holds the publisher (see §7 question 2); store `video-in`/`video-out` ports declared locally, not announced | +50 |
| 6 | `demo/stage/index.html` | the stage's graph (§3.2) and a page-local bay; announce through `bay-join.mjs`; `startShow` uses `openHeldWhep`; `uploadToR2` becomes a call to `putWhole` with `onProgress`; `__demo.chain` projected from the bay; the Links table; the `cue` port and its caption; the stale header lines 44 to 58 corrected | about -200 / +120 |
| 7 | `demo/stage/index.html` checks | the new ordinary-tier asserts in §6 | +40 |

What leaves `/stage/`, READ and counted with `sed` on today's file:

| block | lines today (total / code) | after |
| --- | --- | --- |
| `uploadToR2` 2695 to 2817 | 123 / 85 | about 20, a `putWhole` call plus the progress quarters |
| the WHEP composition inside `startShow` 2462 to 2529 | about 70 / 25 | a call to `openHeldWhep`; its comments move to `live.mjs` verbatim |
| `recPath` and its reset 1963 to 1977 | 15 / 6 | a projection getter |
| `holdShow`, `showWhep`, `waitShow` 1794 to 1796 | 3 / 3 | gone into `openHeldWhep`'s arguments |

What stays in `/stage/` and why: IndexedDB (2221 to 2292, 66 code lines) has
ONE user and patchbay's recorder ships pieces live rather than buffering, so a
shared recorder today would be one module with two modes and no third user.
The question form, presence, the strip, both decks, the film monitor and the
drill stay; they are the show, not the routing.

## 6. Verify impact (question 4)

**MEASURED 2026-10-05, ONE RUN, default (ordinary) tier, no external server
touched:** `node demo/verify.mjs stage` read **27/27 green**, with **page
asserted something: 17**, `no console errors 0`, `no failed requests 0`, three
requests aborted on teardown (expected for a media page). It ran on port 8892
because 8890 was busy. The page logged its own `left for the deep run: the
publisher, the show over WebRTC, the film playing under it, the recording, its
trip to the archive and the diagram measure`.

**NOT MEASURED: the deep tier.** `DEMO_DEEP=1 node demo/verify.mjs stage` holds
the real container and the stage live input (a cold wake, Stream minutes, one
ICE credential) and was not run for a plan. READ: `checks()` has 16 `A(` call
sites and `showDrill()` 28; `plan-demo-structure.md` recorded `stage` at
**55/55** before the tiers split. Under any `selfcheck` the recording stays in
the browser (`USE_R2` is false), so a deep run spends **0 of the 5 ingest
sessions an hour**; only `?r2=1` or a person's stop spends one.

Which asserts survive:

- **All 17 ordinary page asserts survive unchanged** if two things hold: the
  Start WebRTC press stays control 0 (the Links table must have no buttons),
  and the panel and footer structure the fullscreen, footer and *no video
  before there is anything* asserts read is not touched.
- **The deep drill's chain asserts** (around lines 4198 to 4320, reading
  `__demo.chain.local`, `.r2`, `.play`, `.url`) survive if the projection keeps
  those four names and values. That is the reason for a projection rather than
  a rename.
- **`relay servers were asked for on the press and not on load`** survives
  only if `openHeldWhep` keeps the ICE ask on the press and in parallel with the
  wake, as `startShow` does now.

New ordinary-tier asserts, none needing a network beyond our own relay:

1. the stage describes itself as a site with a `video` in, a `cue` state in, a
   store and an archive screen, and every port id is on its own site (the wall's
   assert, same shape);
2. every link in §3.2 validates in the page-local bay, and the WHEP link's
   session reads `whep` **with a second screen linked too** (F1's guard);
3. **negative control:** a link from `err:*` without consent is refused, with
   the reason;
4. under `selfcheck` the announce went to the run's own room and **not to
   `studio-1`** (F6);
5. a `cue.set` addressed to the stage's own port draws a caption, and one
   addressed to another port draws nothing (the negative control that keeps
   the first from passing by drawing everything).

Expected after: ordinary **about 22 page asserts**, deep unchanged plus the
same five. Verify economically: `node demo/check-html.mjs
demo/stage/index.html` first, then `node demo/verify.mjs stage patchbay wall
partitur` once, then ONE deep stage run at the end. `/patchbay/`'s current
count was not measured for this plan and should be read once before step 5.

## 7. Risks and what only the owner can settle (question 5)

| question | why it is the owner's | what this plan assumes until told |
| --- | --- | --- |
| 1. Does every visitor's stage appear on the owner's `/patchbay/`? | announcing into `studio-1` by default means a stranger's tab is a node on the owner's desk, the same thing `wall` and `partitur` already do | yes for a person, never for the harness (F6), and `?bay=` to point it elsewhere |
| 2. May `/patchbay/` or `/wall/` open the stage's picture? | a WHEP subscriber bills Stream delivery minutes from 2026-10-15; holding the publisher wakes the container | they may SUBSCRIBE only while a show is already live, and never hold the publisher. Waking it stays a press on the stage itself |
| 3. Does `/wall/` get a `video` in port, so a projector shows the stage? | `plan-routing-time.md` §5a assumed *"the wall is a projector page showing the stage"*, and READ: the wall has only `light` and `cue` ports today | not in this pass; it is step 5's WHEP opener plus 30 lines on the wall, and it is the natural next ask |
| 4. Are partitur's cues recorded onto the stage's timeline? | it is `plan-routing-time.md` §5d's sidecar, which is not built | no: shown live only. The questions keep their own lane |
| 5. Who announces `stage-input`? | stage tabs (F3, registry change) or `workers/pub` itself (a worker change and a deploy) | the stage tabs |
| 6. Did *"new patchbay stuff"* mean a wiring UI ON the stage? | the one real ambiguity in the ask | no: registration plus a read-only links table (§4). If the answer is yes, §4 reason 2 is the cost |

Risks, in the order they would bite:

- **A cue from the studio room reaches only the tab that holds the studio
  socket.** The stage's audience on other phones is in `stage-ab12`, not
  `studio-1`. Forwarding the caption onto the stage's own room fixes it, and is
  one more message per cue against a relay of 1000 msg/s (READ, the relay
  source as quoted in `plan-universal-routing.md` §12).
- **The relay cap in `bay.mjs`'s `TRANSPORTS` still says 60 msg/s**, already
  flagged in `plan-universal-routing.md` §12. The Links table would print it
  for the `state` link. Correct it in step 1 while the file is open.
- **Two tabs of one show both announce `stage-input`**: harmless under
  freshest-per-site, but a `seenAt` that bounces between tabs makes staleness
  meaningless for that node. The endpoint's freshness should come from the
  publisher's status, not from whoever announced last.
- **The deep drill is the long pole.** It was 37/49 twice from two timeouts
  that disagreed (READ, the comments at lines 2498 to 2521). Moving the composition into
  `live.mjs` touches exactly those waits; their order is part of the contract.

## 8. Rough cost

| part | agent time | money and budgets |
| --- | --- | --- |
| steps 1 to 4, shared | 2 to 3 h | none: pure modules and our own relay |
| step 5, patchbay | 1 to 1.5 h | none until a person presses Open on a live show |
| steps 6 and 7, stage | 2 to 3 h | ordinary runs cost nothing outside our relay |
| final checks | 30 min | ONE deep stage run: one container wake, about a minute of Stream, one ICE credential, 0 ingest sessions. One person's stop with R2 on: 1 of 5 ingest sessions for that hour |

About **6 to 8 agent hours**, one session with a parallel split after step 4
(patchbay and stage are independent pages once the shared modules exist).
Finished means deployed with the build stamp quoted, and the URL to check is
`https://positron.studio/patchbay/` with a stage tab open in
`https://positron.studio/stage/`: the stage's site should appear on the desk,
and `https://positron.studio/partitur/` should list the stage under
`cues to`.
