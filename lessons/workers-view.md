# workers-view

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `workers/view/analytics.mjs`

### analytics-header

Above `import { readFile } from 'node:fs/promises';`, lines 1 to 101 before the cut.

~~~js
// workers/view/analytics.mjs — which demos does anybody actually open.
//
//   node workers/view/analytics.mjs                    the last 24 hours
//   node workers/view/analytics.mjs --days 7           merge seven days, one query each
//   node workers/view/analytics.mjs --since 2026-09-10 from that date to now
//   node workers/view/analytics.mjs --no-sweeps        drop clients that walked the index
//   node workers/view/analytics.mjs --without 1.2.3.4  drop a client, usually yours
//   node workers/view/analytics.mjs --json             the same numbers, machine readable
//
// A day is one round trip and about a second. Seven days is seven of them.
//
// NODE ONLY, READ ONLY. It asks Cloudflare's GraphQL Analytics API about the
// `positron.studio` zone and prints. It changes no setting, adds no rule and
// purges nothing. It is not a demo page and has no `mount()`; `verify.mjs` does
// not see it.
//
// 🔴 IT LIVES HERE BECAUSE `workers/view` IS WHAT SERVES THAT ZONE. LAYOUT.md's
// rule is that a directory says WHO RUNS IT, and this runs on the laptop rather
// than on Cloudflare. So does `deploy.mjs`, and so does `build.mjs`: the
// standing pattern is that laptop-side tooling for a worker lives beside the
// worker it acts on. ⚠️ THE ZONE IS WIDER THAN THIS WORKER. `pub`, `shout`,
// `items`, `backlog`, `relay` and the rest are all hosts on `positron.studio`,
// so the zone totals cover them too. Everything that rolls up BY SLUG is
// filtered to `positron.studio` and `www.positron.studio` first, which is the
// site this worker serves.
//
// ── WHAT THE NUMBERS DO NOT MEAN ────────────────────────────────────────────
//
// 🔴 A REQUEST COUNT IS NOT A PERSON, AND ON THIS ZONE MOST OF IT IS US.
// MEASURED 2026-09-16 over 24 hours: the single busiest user agent was a
// desktop Chrome on one Estonian address, the second was a Quest 3, and the
// third was `HeadlessChrome`. Those are this repo's owner, this repo's headset
// and this repo's own `verify.mjs`. A "visitors" figure taken off the top of
// this data and quoted anywhere would be mostly a measurement of us working.
// That is why every table here splits four ways rather than printing one total.
//
// 🔴 AND THE BOT SHARE IS A FLOOR, NEVER A TOTAL. Three layers are readable on
// a Free zone and each one sees something different:
//   · `verifiedBotCategory` is Cloudflare's own verification, so it is the only
//     layer that cannot be faked. It caught 58 requests of 13,350 in that same
//     day, which is not the bot share, it is the HONEST bot share.
//   · the user agent string, which catches a crawler that says what it is
//     (Baiduspider, OAI-SearchBot, a LeakIX vulnerability scanner) and catches
//     nothing at all from one that does not.
//   · headless and command-line clients, which on this site are overwhelmingly
//     our own harnesses.
// A headless crawler wearing an ordinary Chrome user agent is INVISIBLE here.
// `botScore`, `botManagementDecision` and `jsDetectionPassed` are the fields
// that would see it and all three are refused on this plan by name, MEASURED,
// not assumed. The floor is the accepted price of a Free zone. Say "at least",
// never "only".
//
// ⚠️ THERE IS NO REFERRER ON THIS PLAN. `clientRefererHost` and
// `clientRequestReferer` are both refused for this zone, so "where did they
// come from" is answerable as a COUNTRY and not as a link. Do not quote an
// empty referrer table as evidence that nobody links here.
//
// ⚠️ A PAGE OPEN IS COUNTED AS AN HTML RESPONSE, NOT AS A SESSION. A reload is
// a second open, a page kept in a tab for an hour is one, and a page opened
// from the browser's back-forward cache is none. `clients` is distinct client
// addresses, which merges a household behind one address and splits one phone
// that changed network.
//
// ── WHAT IT ASKS FOR, AND WHY THOSE DATASETS ────────────────────────────────
//
// `httpRequests1dGroups` for the day table. It is pre-aggregated rather than
// sampled, it carries Cloudflare's own `uniques`, and MEASURED it reaches 365
// days back on this zone. It cannot break a day down by path.
//
// `httpRequestsAdaptiveGroups` for everything per slug, because it is the only
// dataset with `clientRequestPath` on it. Two measured limits shape the code:
//   🔴 ONE QUERY MAY SPAN AT MOST ONE DAY on this zone, so a week is seven
//      queries merged here rather than one query with a wider filter. The
//      refusal is an error inside a 200 response, which is the failure shape
//      the whole API has.
//   🔴 `count` IS ALREADY THE ESTIMATE. The dataset is sampled and carries
//      `avg.sampleInterval`, so the obvious move is to multiply. PROVED WRONG
//      on 2026-09-15, a whole UTC day: `count` with `requestSource: eyeball`
//      read 22,672 where the unsampled `httpRequests1dGroups` read 22,732,
//      which is 0.26% apart, while `count` times the 1.54 average interval
//      would have read about 35,000. Multiplying would inflate every figure on
//      this page by half.
// `requestSource: "eyeball"` is what makes those two agree: the zone also
// carries `edgeWorkerFetch`, the worker's own subrequests, which are real
// traffic and are not a visitor.
//
// ── AUTHENTICATION ──────────────────────────────────────────────────────────
//
// 🔴 THE MACHINE'S WRANGLER OAUTH TOKEN IS ENOUGH. No API token has to be
// minted; `zone:read` and `account:read` in the OAuth grant carry the whole
// query. It is read out of wrangler's own config file rather than from an
// environment variable, so there is nothing to export and nothing to rotate.
// ⚠️ IT EXPIRES ABOUT HOURLY. When it has, this shells out to
// `npx wrangler whoami`, which refreshes it in place, and reads the file again.
// ⚠️ `.env` IN THE CWD SHADOWS MACHINE OAUTH (CLAUDE.md), and the repo root
// holds one with live secrets. Both spawns unset `CF_API_TOKEN` and
// `CLOUDFLARE_API_TOKEN` and run from this directory, which is the same fix
// `deploy.mjs` uses and the one nobody has to remember.
// 🔴 THE TOKEN NEVER REACHES A LOG. It is never printed, never interpolated
// into a message, and never put on a command line. An error from the API is
// reported by its own text, which carries no credential.
~~~

### span

Above `const MAX_SPAN_HOURS = 24;`, lines 117 to 117 before the cut.

~~~js
// MEASURED on this zone: a wider filter is refused by name. See the header.
~~~

### sweep

Above `const SWEEP_SLUGS = 10;`, lines 120 to 130 before the cut.

~~~js
/**
 * 🔴 HOW MANY DIFFERENT SLUGS ONE ADDRESS HAS TO TOUCH BEFORE IT IS A SWEEP
 * RATHER THAN A VISIT. This is the one thing that sees the crawler a free zone
 * cannot: MEASURED over seven days, four addresses in one OVH range opened
 * forty-odd different demos each with an ordinary Windows Chrome user agent,
 * four requests apart, and every layer above classed them as a browser.
 * Nobody reads forty demos in a week. A person who does is rare enough that
 * losing them from one table is the cheaper mistake.
 * ⚠️ IT IS A HEURISTIC AND IT IS LABELLED AS ONE EVERYWHERE IT IS PRINTED. It
 * is never subtracted silently, and `--no-sweeps` has to be typed.
 */
~~~

### who

Above `/** Our own harnesses and command-line tools. */`, lines 133 to 137 before the cut.

~~~js
// ── who is asking ───────────────────────────────────────────────────────────
//
// Order matters and it is not alphabetical. `HeadlessChrome` contains
// "headless", which the crawler pattern also matches, so ours is tested first
// or every harness run is reported as somebody else's crawler.
~~~

### named-bot

Above `const NAMED_BOT = new RegExp([`, lines 142 to 145 before the cut.

~~~js
/** A client that says it is a crawler, a scanner, or not a browser at all.
 *  The first half is lifted from the sibling project's `bot.ts`, which is the
 *  same list Cloudflare's own free AI Crawl Control matches on. The second half
 *  is what actually turned up in this zone's logs. */
~~~

### slug-of

Above `export function slugOf(path) {`, lines 176 to 182 before the cut.

~~~js
/**
 * The slug a path belongs to. `/` is the index, `/videoradio/` is a demo,
 * `/proto/deck/` keeps both segments because that is where those pages live.
 * ⚠️ It returns the path unchanged when it does not recognise the shape, so a
 * scanner probing `/wp-config.php` shows up as itself rather than as a slug
 * that does not exist.
 */
~~~

### live-token

Above `async function liveToken() {`, lines 210 to 217 before the cut.

~~~js
/**
 * A live OAuth token, refreshing it through wrangler if it has expired.
 *
 * ⚠️ THE REFRESH IS WRANGLER'S, NOT OURS. `wrangler whoami` exchanges the
 * refresh token and rewrites the config in place; doing that by hand here would
 * mean a second implementation of a credential rotation, and a bug in it would
 * log the user out of every other tool on this machine.
 */
~~~

### stderr

Above `console.error('wrangler OAuth token has expired. Refreshing through 'wrangler wh`..., lines 230 to 232 before the cut.

~~~js
// ⚠️ stderr, NOT stdout. MEASURED: as a `console.log` this line landed on
// top of `--json` output and made it unparseable, roughly once an hour and
// never twice in a row, which is the shape of a bug nobody can reproduce.
~~~

### gql

Above `async function gql(token, query, variables) {`, lines 250 to 255 before the cut.

~~~js
/**
 * 🔴 A GRAPHQL FAILURE ARRIVES AS HTTP 200 WITH AN `errors` ARRAY AND A NULL
 * `data`. Nothing about the response status says anything went wrong, so a
 * caller that only checks `r.ok` prints an empty table and calls it a quiet
 * week. Both halves are checked here and the API's own words are shown.
 */
~~~

### published

Above `async function publishedSlugs() {`, lines 272 to 284 before the cut.

~~~js
/**
 * Every slug this repo publishes, so a page nobody opened can be NAMED. Half
 * the question "which demos does anybody open" is the list that never appears
 * in the table, and a table can only show what has a row.
 *
 * ⚠️ IT READS THE CHECKOUT AND THE CHECKOUT CAN DISAGREE WITH THE DEPLOY. A
 * page added since the last deploy has no traffic because it is not live yet,
 * which is not the same finding as a live page nobody wants. Both the heading
 * and this comment say so rather than implying a verdict.
 * ⚠️ AND IT IS ALLOWED TO FAIL. `manifest.mjs` is edited constantly and may be
 * half-written when this runs. A broken import costs this one section and
 * nothing else, which is why it is caught here instead of at the top.
 */
~~~

### target-path

Above `const clean = (t) => String(t).split(/[?#]/)[0];`, lines 288 to 292 before the cut.

~~~js
// ⚠️ `targetOf` RETURNS A LINK, NOT A PATH. Four rows read `/mirror/?xr=1`,
// and `clientRequestPath` never carries a query, so comparing the two
// directly reported four pages as untouched while the table above them
// showed their opens. It cost one run and it was visible only because the
// two lists disagreed on the same screen.
~~~

### fail

Above `const fail = (err) => { console.error('\n' + (err?.message || err)); process.exi`..., lines 381 to 385 before the cut.

~~~js
// A failure here is nearly always Cloudflare saying no in words worth reading,
// and a Node stack trace buries those words under five lines of this file's own
// internals. Print what the API said and stop.
// ⚠️ IT IS SAFE TO PRINT: every message this file raises is built from the
// API's own text or from a constant. The token is never interpolated into one.
~~~

### clamp

Above `if (Number.isNaN(from.getTime())) {`, lines 419 to 426 before the cut.

~~~js
// 🔴 CLAMP BEFORE ASKING, NOT AFTER. MEASURED: this zone refuses
// `httpRequestsAdaptiveGroups` older than 4w3d and refuses any single query
// wider than a day, so a `--since 2026-01-01` typed by somebody who has not
// read the header is 260 round trips that all fail the same way. Cut it here,
// say so, and ask once.
// ⚠️ AN `Invalid Date` COMPARES FALSE AGAINST EVERYTHING, so it slips past both
// of the checks below and fails four calls later inside `pageRows`, with a
// message about a filter rather than about the flag that was typed wrong.
~~~

### by-path

Above `const key = '${r.edgeResponseStatus} ${r.clientRequestPath}';`, lines 486 to 490 before the cut.

~~~js
// 🔴 BY PATH, NOT BY CODE ALONE. This section said "mostly vulnerability
// scanners walking a wordlist" over a bare count of 403s, which was a
// guess dressed as a caption: nothing in a status code names what was
// asked for, and a 403 on `/` is a completely different event from a 403
// on `/wp-config.php`. Print what was refused and let the reader decide.
~~~

## `workers/view/build.mjs`

### build-header

Above `import zlib from 'node:zlib';`, lines 1 to 21 before the cut.

~~~js
// build.mjs — assemble workers/view/public/ from the repo's protos.
//
//   node build.mjs                 -> public/, the deploy artefact (committed)
//   node build.mjs --out /tmp/x    -> anywhere else; public/ untouched. Use this
//                                     to ask "does the build still pass?".
//
// Why a build step instead of pointing wrangler's `assets.directory` at the
// repo root: the repo root holds `.env` (13 live secrets). An assets directory
// is uploaded VERBATIM AND PUBLICLY. So we copy an explicit allowlist of files
// — never a directory glob — into public/, and nothing else can leak.
//
// The layout MIRRORS THE REPO on purpose. Every page's imports then resolve
// untouched, exactly as they do under its own dev server:
//   proto/deck      `../../timeline/transport.mjs` → /timeline/transport.mjs
//   proto/remixer     `/timeline/transport.mjs`      → /timeline/transport.mjs
//   proto/deck      `./ingest.mjs`                  → /proto/deck/…
// That is the "solve it in the asset layout, not in the proto" rule.
//
// ⚠️ THERE WAS A CACHE-EXPLODING STEP HERE and the page it served is archived;
// `explode()` still exists further down, unused, for the next proto that ships
// a committed cache. See the note beside it.
~~~

### out

Above `const OUT = (() => {`, lines 37 to 57 before the cut.

~~~js
// ── where the build lands ───────────────────────────────────────────────────
//
// 🔴 A FIXED OUTPUT DIRECTORY IS A SHARED MUTABLE GLOBAL. That is this repo's
// own rule about ports — *"let the OS choose and read back what you got"* — and
// `public/` is the same shape wearing a directory: it is `rm -rf`'d and
// rewritten on every run. Two builds at once and one of them empties the
// directory the other is copying into, with nothing in either output saying so.
// MEASURED 2026-09-14: one ordinary build left **60 files dirty, none of them
// written by a person**, which is what every other agent's `git status` then
// has to be read through.
//
// `--out <dir>` (or `BUILD_OUT=<dir>`) builds somewhere else. Use it whenever
// the question is *"does the build still pass?"* — which is what the four
// refusals at the bottom of this file exist to answer — because then the answer
// costs nothing in the shared tree.
//
// ⚠️ IT IS DELIBERATELY NOT THE DEFAULT. `public/` is the deploy artefact and
// it is committed on purpose: `git log --oneline -- workers/view/public` is how
// anyone answers *"what was actually on the edge when that log was written?"*.
// A scratch build must never be mistaken for one, so it says so on the way in
// and on the way out.
~~~

### manifest

Above `const { DEMOS: DEMO_MANIFEST, extraPages } =`, lines 69 to 71 before the cut.

~~~js
// the demo story order, single-sourced from demo/manifest.mjs
// rowHTML/noteHTML come from the manifest too. They used to be duplicated here
// AND in demo/index.html, so fixing one left the other printing `undefined`.
~~~

### concept-rows

Above `const { CONCEPTS, CONCEPT_DIRS, DEMO_CARDS } =`, lines 74 to 75 before the cut.

~~~js
// The concept pages: their rows and the folders they live in. Since 2026-10-13
// they are the front page and answer at /<group>/<slug>/ (demo/shell/concept-list.mjs).
~~~

### timeline

Above `['timeline/transport.mjs', 'timeline/transport.mjs'],`, lines 87 to 88 before the cut.

~~~js
// shared timeline library — loaded by remixer and deck, never copied
// into either proto. One canonical copy, same as the dev servers alias.
~~~

### megatimeline

Above `// 2. remixer, ARCHIVED 2026-10-05 (archive/remixer/). Only its hls.js stays:`, lines 92 to 97 before the cut.

~~~js
// ⚠️ `megatimeline` WAS HERE AND IS IN `archive/`. Four entries came out with
// it — the page, its viewport and gesture modules, and the census it fetched
// from the ROOT (`/census.json`), which nothing else ever read. Its two
// committed JSONL caches were exploded into static assets a little further
// down; those calls are gone too, so the build no longer writes nine search
// results and one item that had no reader. The source is under `archive/`.
~~~

### remixer

Above `['proto/remixer/hls.min.js', 'proto/remixer/hls.min.js'],`, lines 99 to 100 before the cut.

~~~js
// 2. remixer, ARCHIVED 2026-10-05 (archive/remixer/). Only its hls.js stays:
//    eight pages load /proto/remixer/hls.min.js, so the path keeps answering.
~~~

### deck

Above `['proto/deck/index.html', 'proto/deck/index.html'],`, lines 103 to 104 before the cut.

~~~js
// 3. deck — renamed from `aikajana` 2026-09-15; the corpus plus archive.org
//    media, nothing proxied
~~~

### looper

Above `['timeline/nested.mjs', 'timeline/nested.mjs'],`, lines 112 to 117 before the cut.

~~~js
// 5. looper — an INSTRUMENT, not a viewer, and the first page here with no
// upstream of any kind: no ERR, no proxy, no Durable Object, no network at
// all once loaded. It needs three more library modules than the viewers do,
// and the AudioWorklet processor, which is fetched at runtime by URL
// (`addModule('./onset-worklet.js')`) rather than imported — easy to forget,
// and the failure mode is a silent ear that detects nothing.
~~~

### moq-return

Above `['proto/jam/moq/www/moq-synth.js', 'proto/jam/moq/www/moq-synth.js'],`, lines 128 to 131 before the cut.

~~~js
// MoQ audio return (shell/moq-audio.mjs). The wrapper and the PCM worklets
// live under proto/jam because that is where they were measured (session 6i,
// 35.8 ms key->ear); the shell module is the only consumer and the build
// refuses it if these are missing, which is how they got listed at all.
~~~

### strip

Above `['timeline/strip.mjs', 'timeline/strip.mjs'],`, lines 135 to 139 before the cut.

~~~js
// ── the demo sequence (plans/plan-demos.md) ─────────────────────────────────────
// strip.mjs is REQUIRED here: every Act 0 demo imports it, and
// proto/megatimeline/index.html has imported /timeline/strip.mjs since
// commit 3647696 without it ever being allowlisted — which is why
// megatimeline has been dead on the public URL. Adding it fixes both.
~~~

### shell-enumerated

Above `...shellFiles(),`, lines 142 to 145 before the cut.

~~~js
// demo/shell is ENUMERATED, not listed: see shellFiles() below. A hand-kept
// list meant a new shell module deployed as a 404 while local verify passed,
// because the dev server serves the repo directly and only the deploy strips
// to public/. That is a silent break, so the list is gone.
~~~

### route-vectors

Above `...routeVectorFiles(),`, lines 147 to 149 before the cut.

~~~js
// ⚠️ THE ROUTE VECTORS ARE DATA, ENUMERATED ONE LEVEL DOWN AND JSON ONLY, so
// `/rout/` runs the same files `route-core-test.mjs` runs. Hand-written
// contract files with no secret in them; `index.json` is their list.
~~~

### patches

Above `['demo/resources/patches/aciiid.syx', 'resources/patches/aciiid.syx'],`, lines 154 to 180 before the cut.

~~~js
// ── six Circuit patches, so `/pack/` has something to open ────────────────
//
// 🔴 THESE ARE THE OWNER'S OWN PATCHES AND PUBLISHING THEM WAS ASKED FOR IN
// WORDS. `/pack/` shows nothing until a file lands and `New Pack.circuitpack`
// is NOT published, so a visitor met an upload box and an empty page. The
// request was *"can we get some sample patches in to choose from?"*, then
// *"at least one"*, and the publishing question was put to the owner rather
// than assumed: *"that is your sound design going onto a public URL, so I am
// not doing it unless you say"*, answered *"do it"*.
//
// 🔴 A PATCH IS NOT A PACK, AND THAT DISTINCTION IS THE WHOLE SAFETY OF THIS
// BLOCK. `New Pack.circuitpack` holds 32 of somebody's SESSIONS and stays off
// this list for good. These are six 350 byte synth patches with no session
// data in them at all.
//
// ✅ AND EVERY ONE WAS CHECKED BEFORE IT WAS WRITTEN, not after. Each is
// exactly 350 bytes and each carries `00` at offset 6, which is
// `Replace Current Patch` and lands in RAM. The extractor THROWS on a length
// that is not 350, on a byte 6 that is not `00`, and on anything `readPatch`
// calls `writesFlash`, because `01` at that offset is `Replace Patch` and
// writes flash on an instrument with no factory reset.
//
// ⚠️ SIX AND NOT ONE, AND NOT SIXTY FOUR. The ask was `at least one`; six is
// what it takes to make the page's picture move. Between them they cover six
// waveforms, three filter types, all three voice modes and 0 to 4 mod slots
// in use, so pressing through them changes every box in the diagram. Sixty
// four would be publishing the bank.
~~~

### notes-off

Above `// The box listener: play a Raspberry Pi in another building from a phone.`, lines 187 to 192 before the cut.

~~~js
// 🔴 `/notes/` IS NOT SHIPPED. It rendered two essays on the front page, and
// those have moved to `research/`, which is where writing that argues or
// reports lives and which is not deployed. A viewer page with nothing left to
// view is furniture, so the three lines go together rather than leaving a URL
// that 404s whatever you ask it for. `demo/notes/index.html` stays in the
// repo: putting a note back is these lines and a row in `NOTES`.
~~~

### supersonic

Above `['demo/shell/vendor/supersonic.js', 'shell/vendor/supersonic.js'],`, lines 194 to 240 before the cut.

~~~js
// The box listener: play a Raspberry Pi in another building from a phone.
// It needs nothing else deployed — proto/jam/playout-worklet.js is already
// listed above for the MoQ return path, and the page talks only to
// ws.positron.studio. Served at /keys/.
// ⚠️ FROM THE MANIFEST, NOT LISTED HERE. `demoFiles()` enumerates BUILT demos;
// a page that is not one — the box's listener in rig/, the component sandbox —
// used to need a hand-written line here AND a matching rewrite in
// demo/server.mjs. Two pages, four edits, in two files, with nothing to notice
// if only one of the pair was made. Each declares its own `src` now.
// ── SuperCollider's own sound server, vendored ────────────────────────────
//
// ⚠️ LISTED BY NAME, because `shellFiles()` enumerates ONE directory level and
// filters to web extensions — it would take neither the `.wasm` nor anything
// under `vendor/chunks/`. That is the containment argument working as
// intended rather than a gap to widen: this is 1.86 MB of third-party binary
// and it should cost somebody a deliberate line.
//
// 🔴 IT MOVED HERE FROM `demo/patch/vendor/` ON 2026-09-13, AND THE REASON IS
// THAT `patch` IS OFF THE SITE. Its row is gone from `demo/manifest.mjs`, so
// nothing under `demo/patch/` is copied any more — and `/grains/` now boots
// this engine to run Pappus in the tab. A page fetching `/patch/vendor/…`
// would be asking for a URL with nothing behind it, which is `moq.mjs`
// exactly: a module holding a path a rename had moved, 404ing with nothing
// saying so, killing the page for a reason no log line mentions.
//
// 🔴 AND NOT A SECOND COPY UNDER `demo/grains/vendor/`, which `LAYOUT.md`
// rule 6 would suggest. Two copies of a 1.7 MB AGPL binary can drift apart
// and the drift is SILENT, because each page goes on working. One copy; the
// protection the rule was giving is replaced by `checkPresent()` and
// `checkVendorUrls()` below, both proved by breaking them. Same argument, and
// the same departure, as the controller meshes in the next block.
//
// 🔴 THE CHUNKS ARE NOT OPTIONAL EVEN THOUGH THEY ARE NEVER FETCHED.
// `supersonic.js` holds `import("./chunks/midi_manager-….js")` and one for
// gamepads — dynamic imports that a page using neither will never run, but
// `checkImports()` reads the source and would refuse the build over them, and
// rightly: an import with no deployed file is a 404 waiting for the first
// person to plug in a controller. `chunk-V5WXEJ46.js` IS loaded, statically.
//
// LICENCE: the engine is scsynth (GPL-3.0-or-later) on clockwork
// (AGPL-3.0-or-later) and the combined work is AGPL-3.0-or-later — the one
// licence where serving over a network is the trigger, and this serves it
// over a network. The texts ship beside the binaries rather than living in
// somebody's memory. ⚠️ `sonic-pi-beep.scsyndef` and its MIT synthdefs
// licence did NOT come across: that was `patch`'s demo asset and nothing
// fetches it any more, and a vendored file with no consumer in the shared kit
// is a thing for somebody to wonder about later.
~~~

### grains-defs

Above `['demo/grains/defs/pappus-tiny.scsyndef', 'grains/defs/pappus-tiny.scsyndef'],`, lines 250 to 263 before the cut.

~~~js
// ── the two definitions `/grains/` loads into that engine ─────────────────
//
// 🔴 NOT VENDORED AND NOT BUILT HERE: these are compiled by sclang ON THE
// BOARD, by `rig/board/norns/writedefs.scd`, out of the same
// `Engine_Pappus.sc` and `PosSource.sc` the Raspberry Pi's own service
// compiles. `/grains/` claims the browser runs the graph the board runs, and
// that claim is only true while these bytes came from there.
//
// ⚠️ `demoFiles()` cannot take them — a subdirectory, and `.scsyndef` is not
// a web extension — so they are named here, and `checkCompiledDefs()` below
// refuses the build when either one has drifted from the source it was
// compiled from. A stale artefact is silent in the worst direction: the tab
// runs last week's graph beside the board's today, and the page goes on
// saying they are the same instrument.
~~~

### controllers

Above `// ── the slide face, JetBrains Mono, for 'demo/shell/slide.mjs' ──────────`, lines 268 to 286 before the cut.

~~~js
// ── the controller models, vendored ───────────────────────────────────────
//
// ⚠️ LISTED BY NAME for the same reason `patch/vendor/` is: `shellFiles()`
// enumerates ONE directory level and filters to web extensions, so it takes
// neither a `.glb` nor anything under `shell/vendor/`. The wall is working;
// this is a deliberate line through it.
//
// 🔴 AND THEY ARE UNDER `shell/`, NOT UNDER A DEMO'S `vendor/`, WHICH IS A
// DEPARTURE FROM `LAYOUT.md` RULE 6 AND IS ARGUED THERE. The consumer is
// `demo/shell/xr-room.mjs`, which BOTH `scene` and `mirror` import — so a
// per-slug path would mean one page's controllers came out of a directory
// named after the other page. The hazard that rule exists to prevent is
// `moq.mjs`'s: a shared module holding a path a rename had moved, 404ing
// silently. What replaces it is the existence check below, which refuses the
// build rather than shipping the 404.
//
// LICENCE: MIT, Copyright (c) 2019 Amazon —
// `@webxr-input-profiles/assets@1.0.20`, `immersive-web/webxr-input-profiles`.
// 217,984 + 213,868 bytes. The text and the provenance ship beside them.
~~~

### mono

Above `['demo/shell/vendor/jetbrains-mono-latin-400-normal.woff2', 'shell/vendor/jetbra`..., lines 288 to 297 before the cut.

~~~js
// ── the slide face, JetBrains Mono, for `demo/shell/slide.mjs` ──────────
//
// The site's one mono since 2026-10-12 (`--mono`, `--brand` and the slide
// face all read these files), and the archived `/slides/` deck reads them
// too since its own vendor folder and its byte-identical copy went
// (plans/plan-fonts-minimal.md). Under `shell/` because the consumers are kit
// components, and a kit module loading a font out of one demo's folder is
// the cross-page import this file refuses. 400 and 600, Latin subset, plus
// the Greek 600 subset for the logo's β, @fontsource 5.3.0, SIL OFL 1.1,
// licence beside them.
~~~

### geist

Above `...['geist'].flatMap((f) => [`, lines 303 to 310 before the cut.

~~~js
// ── Geist, the site's `--sans` from 2026-10-12 ──────────────────────────
//
// Picked from six sans faces sampled beside the brand mono on
// `/kit/frontpage/` (*"we need sans serif to match our brand mono"*), and the
// other five deleted with plans/plan-fonts-minimal.md. Under `shell/` because
// `shell.css` declares it as `Brand Geist` and every page reads it through
// `--sans`. 400 and 600, Latin subset, @fontsource/geist 5.3.0 off
// cdn.jsdelivr.net, SIL OFL 1.1, licence beside it.
~~~

### pico

Above `['demo/shell/vendor/rp2040js.mjs', 'shell/vendor/rp2040js.mjs'],`, lines 321 to 332 before the cut.

~~~js
// ── the Pico router firmware and the emulator it runs in, for `/kit/` ─────
//
// ⚠️ LISTED BY NAME FOR THE REASON EVERY LINE IN THIS BLOCK IS: `shellFiles()`
// enumerates ONE directory level, so nothing under `shell/vendor/` ships
// unless it is here, and `.uf2` is on no extension list at all.
// `demo/shell/pico.mjs` and `pico-worker.mjs` are flat in `demo/shell/` and
// are enumerated. The emulator is rp2040js 1.4.0 bundled into one module
// (MIT); the boot ROM is the RP2040 B1's, which the firmware calls into, and
// its terms are in the licence file beside it. The UF2 is
// `rig/pico/firmware/build-pico/router.uf2`, byte for byte, 57,856 bytes:
// the owner's own firmware, published because the HARDWARE tab was asked for
// as *"Can you make demo of hw kit in psoitron kit new tab?"*.
~~~

### oled

Above `['demo/resources/pico/oled-ui.wasm', 'resources/pico/oled-ui.wasm'],`, lines 344 to 347 before the cut.

~~~js
// ui.c alone as WebAssembly, for the OLED part blocks (rig/pico/firmware/wasm/).
// ⚠️ IT SHIPPED MISSING ONCE, 2026-10-04: green locally, because the dev
// server serves the whole repository, and a 404 on the edge. A file the page
// FETCHES is invisible to the import check above.
~~~

### gabarito

Above `['demo/weight/vendor/gabarito-latin.woff2', 'weight/vendor/gabarito-latin.woff2'`..., lines 350 to 375 before the cut.

~~~js
// ── the typeface `/weight/` is made of, vendored ────────────────────────────
//
// ⚠️ LISTED BY NAME, and this one would have been missed by looking: a font
// is not an `import`, so `checkImports()` cannot see it, AND `.woff2` is not
// in `demoFiles()`'s extension set, so even at the top of `demo/weight/` it
// would not have been copied. That is the `manifest.webmanifest` failure
// exactly — `/items/` renamed one file and shipped a 404 to production
// because an allowlist declined silently. `checkVendorUrls()` below is what
// now refuses the build instead, which is why the page's `@font-face` writes
// its `src` as a QUOTED `/weight/vendor/…` string.
//
// 🔴 TWO FILES, BECAUSE ESTONIAN IS SPLIT ACROSS TWO OF THEM. Ä Ö Ü Õ are in
// `latin` (U+00xx) and Š Ž are in `latin-ext` (U+0160, U+017E). Dropping
// either one does not fail: the browser substitutes a system face for the
// letters it cannot find, per glyph, with no 404 and no exception — one
// letter of one word in the wrong typeface. The page measures that rather
// than trusting it (`text.mjs`, `ensureFont`).
//
// ⚠️ THE PAGE DOES NOT NAME THE TYPEFACE — it asks for `weight-display` and
// `weight-text`, two aliases its stylesheet points at whatever is listed here.
// So a font change is these three lines, two files, and the `src` pair in the
// page; nothing in `text.mjs` or in any assert moves. Keep it that way.
//
// LICENCE: SIL Open Font License 1.1 — Gabarito, via `google/fonts`
// (`ofl/gabarito`). The two subsets are Google's own builds; the licence
// ships beside them.
~~~

### muta

Above `['demo/muta/vendor/plai.wasm', 'muta/vendor/plai.wasm'],`, lines 380 to 408 before the cut.

~~~js
// ── Plaits and Warps, compiled to WebAssembly, for `/muta/` ─────────────────
//
// ⚠️ LISTED BY NAME FOR THE THIRD REASON IN A ROW AND IT IS THE SAME ONE:
// `.wasm` is not in `demoFiles()`'s extension set and `vendor/` is a
// subdirectory, so these artefacts would be declined silently and the page
// would ship pointing at a 404. `checkVendorUrls()` below is what refuses
// the build instead, which is why `demo/muta/index.html` writes both URLs as
// quoted `/muta/vendor/*.wasm` strings.
//
// 🔴 UNDER THE PAGE, NOT IN `demo/shell/`, WHICH IS LAYOUT.md RULE 6.
// One page reads it. Promoting 188 KB of somebody else's DSP into the shared
// kit invites a second page to import it without noticing what it costs, and
// the two exceptions already recorded there (the controller meshes, wasm
// scsynth) both moved because TWO pages needed them.
//
// LICENCE: MIT, Emilie Gillet, for BOTH, and it is worth checking per module
// rather than per repository. `plaits/` and `stmlib/` are STM32F projects,
// which is the half of the eurorack grant that is MIT rather than GPL:
// `plaits/makefile` says `FAMILY = f37x` and `warps/makefile` says
// `FAMILY = f4xx`. The panel graphics are NOT taken and are the one thing in
// that ecosystem that could not be. The licences, the upstream commits and
// the source digests baked into each wasm live in `demo/muta/vendor/`; the
// build recipe for both is `demo/muta/build/build.sh`.
//
// ⚠️ `PROVENANCE-*.json` IS DELIBERATELY NOT DEPLOYED. The page reads each
// build stamp out of the WASM ITSELF (`plai_build()`, `warp_build()`), which
// is the copy that cannot drift from the thing making the sound. A second
// copy served beside it would be a number that agrees by construction, which
// LESSONS #82 records as two witnesses who are one witness.
~~~

### faust

Above `['demo/fau/vendor/libfaust-wasm.wasm', 'fau/vendor/libfaust-wasm.wasm'],`, lines 414 to 452 before the cut.

~~~js
// ── the Faust compiler itself, for `/fau/` ─────────────────────────────────
//
// ⚠️ THE FOURTH CASE OF THE SAME RULE: `demoFiles()` takes neither a `.wasm`
// nor a subdirectory, and `.data` is not a web extension at all, so all four
// of these would be declined in silence and the page would ship pointing at
// four 404s. `checkVendorUrls()` is what refuses the build instead, which is
// why `demo/shell/faust.mjs` (until 2026-10-06 `demo/fau/index.html`) writes
// each of them out as a whole quoted path in one object. ⚠️ AND WHY NEITHER FILE SPELLS A VENDOR
// PATH IN PROSE: this check reads comments as well as code, and refused this
// very build over an ellipsis standing in for a file name.
//
// 🔴 6,162,473 BYTES OF COMPILER, WHICH IS 2.49 TIMES THE VENDORED SCSYNTH
// ALREADY IN THIS REPOSITORY OVER BROTLI. `plans/plan-fau.md` §1 prices it
// file by file: 3,598,106 for the compiler, 2,407,445 that is not data at all
// but the 53 standard library `.lib` files as plain Faust source, and 156,922
// of Emscripten glue. The page fetches none of it on a visit — the first
// press does — and says in its own log what pressing will cost.
//
// 🔴 THE EDGE DOES NOT COMPRESS AN EXTENSION IT HAS NEVER HEARD OF, MEASURED
// 2026-09-23 AGAINST THE DEPLOY, which is what `plans/plan-fau.md` §11 item 3
// asked somebody to check. Shipped as `libfaust-wasm.data` it came back with
// NO content-type and NO content-encoding, 2,407,445 bytes whole, while the
// `.wasm`, the `.js` and the `.mjs` beside it were all brotli. That is 2 MB of
// a visitor's bandwidth on the one file in the set that compresses best.
// ✅ SO IT IS SERVED AS `.txt` AND IT IS HONESTLY ONE: 99.95 per cent of its
// bytes are printable, because it is 53 Faust library sources concatenated by
// Emscripten's `file_packager`. The page names this path explicitly, and the
// package name baked INSIDE the compiler is untouched by the rename.
//
// LICENCE: LGPL 2.1 or later. The text shipped in the package is the FAUST
// wasm copyright header (GRAME, 2021-2024) over the full LGPL 2.1, and it is
// vendored verbatim beside the binaries. ⚠️ npm's own metadata for
// `@grame/faustwasm@0.18.5` says `LGPL-3.0`, which disagrees with the file in
// the tarball; the file is what ships here and what a reader can check.
// ⚠️ THE STANDARD LIBRARY IS A PATCHWORK and the licence above does not cover
// it: of the 53 `.lib` files inside the `.data` blob, five declare
// `LicenseRef-LGPL-2.1-or-later-with-Faust-exception`, THREE declare
// `STK-4.3`, two declare `LGPL with exception`, one `LGPL-2.1-or-later`, and
// 42 declare nothing at all. `plans/plan-fau.md` §7.2 lists them.
~~~

### organ

Above `['demo/resources/faust/organ.json', 'resources/faust/organ.json'],`, lines 459 to 470 before the cut.

~~~js
// ── the Organ, compiled ahead of time, for a page with no compiler ─────────
//
// ⚠️ LISTED BY NAME FOR THE SAME REASON AS EVERY `.wasm` ABOVE: `demoFiles()`
// takes no `.wasm` and `demo/resources/` is not a demo. These are what
// `demo/shell/faust.mjs`'s `faustFactory('/resources/faust/organ.json')`
// fetches on a press: 13,332 B raw, against 6,162,473 B for the compiler
// (`plans/plan-live-slides.md` section 5). Made by
// `node demo/resources/build-faust-aot.mjs` from `demo/fau/presets.mjs`.
// 🔴 AND `checkFaustAot()` BELOW REFUSES THE BUILD WHEN THEY ARE STALE, which
// is `checkCompiledDefs()` for `/grains/` again: edit the Organ on `/fau/`
// and the ahead of time copy would go on playing the old one, with nothing
// 404ing and every number agreeing with itself.
~~~

### synth-steps

Above `...SYNTH_STEPS.flatMap((st) => ['${st.id}.json', '${st.id}.wasm']`, lines 476 to 487 before the cut.

~~~js
// ⚠️ AND THE MONO SINE OF THE FRONT PAGE'S `synths` DECK, 2026-10-06, from
// `demo/shell/synth-steps.mjs` by the same script, fetched by
// `demo/shell/slide-synth.mjs` on the first `Test tone` press of the
// unedited program. A mono program is one `.wasm` and no mixer. The four
// polyphonic steps that were listed here (osc2, env, filter, echo) and the
// first one (osc) left the deck the same day.
// 🔴 READ OFF `SYNTH_STEPS`, NOT TYPED, SINCE 2026-10-06: the filter and LFO
// slides shipped with their `.json` and `.wasm` missing from a hand list
// here, so both 404'd on the edge while every local check was green (the
// dev server serves `demo/` itself). Reported as *"does no compile"*. A
// step is one `.wasm` and its `.json`, hidden ones too, so a step brought
// back plays at once.
~~~

### rhodes

Above `['demo/nola/LICENSE-jrhodes3d', 'nola/LICENSE-jrhodes3d'],`, lines 491 to 502 before the cut.

~~~js
// ── the Rhodes attribution for `/nola/` ───────────────────────────────────
//
// ⚠️ LISTED BY NAME FOR THE FIFTH TIME AND FOR THE SAME REASON: `demoFiles()`
// filters to web extensions and a licence file has none. The 65 `rhodes-*.m4a`
// it names ARE enumerated, because `.m4a` is on that list and they are flat in
// `demo/nola/` rather than in a subdirectory, which is the whole reason they
// are flat. `PROVENANCE-rhodes.json` rides along the same way.
//
// 🔴 AND IT IS NOT OPTIONAL PAPERWORK. The samples are Jeff Learman's 1977
// Rhodes under CC BY-NC-SA 4.0, and attribution is a condition of serving them
// at all. A deploy that shipped the audio and declined the credit would be
// shipping the one file that makes the other 65 allowed.
~~~

### front

Above `['demo/index.html', 'index.html'],`, lines 506 to 510 before the cut.

~~~js
// 🔴 THE FRONT PAGE IS demo/index.html, COPIED AS IT IS, SINCE 2026-10-13
// (*"move concepts to frontpage"*): the concepts index with THE HERO, LARGE on
// top. Until then this file baked the manifest's groups into menu.html, and
// demo/index.html was a second renderer of the same rows for the dev server.
// Both are in archive/frontpage/. One page now, the same file on both ends.
~~~

### demo-files

Above `function routeVectorFiles() {`, lines 517 to 525 before the cut.

~~~js
/**
 * Allowlist entries for every BUILT demo, generated from demo/manifest.mjs so
 * the list stops being hand-maintained (plans/plan-demos.md, order of work step 8).
 *
 * This reads a directory, which the rule above forbids — but the rule exists
 * because the REPO ROOT holds .env. Enumeration here is confined to
 * demo/<nn>-<name>/ and filtered to web extensions, so there is no path by
 * which a secret enters public/.
 */
~~~

### shell-files

Above `function shellFiles() {`, lines 537 to 541 before the cut.

~~~js
/**
 * Every web file in demo/shell that git tracks, deployed flat at /shell/. An
 * untracked scratch file cannot ship; a page that needs one fails checkImports().
 * Without git it falls back to the directory listing and says so on stderr.
 */
~~~

### check-imports

Above `function checkImports(copied) {`, lines 561 to 575 before the cut.

~~~js
/**
 * Refuse to ship a demo whose /shell/… or ./… import has no file in public/.
 *
 * This is the check that would have caught the 404 above before it went out:
 * the page imported /shell/moq.mjs, the copy list did not carry it, and
 * nothing complained until a browser asked for it on the live site.
 *
 * IT SCANS MODULES, NOT JUST PAGES, and it did not always. While it read HTML
 * only, `demo/shell/moq.mjs` went on importing `/08-moq/moq-vendor.js` for the
 * whole life of the slug rename — a 404 that killed the module, so `moq` and
 * `ladder` never reached `__demo.ready` and asserted NOTHING. Both read as red
 * for a plausible wrong reason (no relay on this network) and stayed that way.
 * A page is not the only thing that can import; the check has to follow the
 * imports wherever they live.
 */
~~~

### import-regex

Above `for (const m of text.matchAll(/(?:import[^'"\n]*?|from\s*)['"](\.\/[^'"]+|\/[^'"`..., lines 585 to 595 before the cut.

~~~js
// ⚠️ `[^'"\n]`, AND THE NEWLINE IS THE PART THAT WAS MISSING. Without it
// the `import…` alternative runs across line breaks, so any IDENTIFIER
// containing the word — `importMs` — swallowed everything up to the next
// quoted string and reported `grains/engine.mjs imports /status.reply`
// about an OSC address in a comparison twelve lines below it. It refused a
// build over two things that are not imports, and `demo/patch/engine.mjs`
// had the same variable and passed only because the string that followed it
// happened to be a real deployed path. A guard that can refuse for a reason
// that is not true teaches people to edit the guard.
// A multi-line `import { … } from '…'` is still caught: its specifier
// follows `from`, which is the second alternative.
~~~

### web-ext

Above `const OK = new Set(['.html', '.mjs', '.js', '.css', '.json', '.webmanifest',`, lines 622 to 640 before the cut.

~~~js
// ⚠️ MEDIA TOO. This was code and stylesheets only, so a demo that carries a
// sound file shipped the page and not the sound — a 404 the page cannot
// recover from and the build had no reason to mention. `dust` carries two
// 1965 excerpts; the allowlist is still an allowlist, because this directory
// is the wall that keeps `enumerate, don't list` away from the repo root.
// 🔴 `.webmanifest` IS ON THIS LIST BECAUSE LEAVING IT OFF SHIPPED A 404 TO
// PRODUCTION. `/items/` renamed `manifest.json` to `manifest.webmanifest` to
// get the spec content type, the build silently declined to copy it, and the
// deploy went out with `<link rel="manifest">` pointing at nothing — the one
// file an iPhone reads to decide whether a page may be installed at all.
// ⚠️ AN ALLOWLIST FAILS SILENTLY BY DESIGN, which is the point of it; what
// was missing is that nothing ASKED whether every local URL in a page has a
// file behind it. `checkImports()` does that for modules only.
// 🔴 `.mp4` ADDED 2026-09-18 FOR THE SAME REASON `.m4a` IS HERE, AND IT
// FAILED IN THE SAME SILENT WAY FIRST. `/stage/` gained a public domain film
// as its default background; the build copied the film's provenance JSON
// beside it and declined the film, so the page would have shipped with a
// `<video>` pointing at a 404 and the build would have said `copied 182
// files` about it. That is the `.webmanifest` story again, third time.
~~~

### concept-files

Above `function conceptFiles() {`, lines 660 to 683 before the cut.

~~~js
/**
 * The concept pages, deployed WHOLE, one folder per group: demo/<group>/ at
 * /<group>/, each page at /<group>/<slug>/, with no manifest row. Asked
 * 2026-10-09 as `demo/concepts/` at /concepts/<n>/; moved to the front page and
 * to /<group>/<slug>/ on 2026-10-13 (*"move concepts to frontpage ... rename
 * all with group/slug, rm numbers"*). The folders are CONCEPT_DIRS in
 * demo/shell/concept-list.mjs.
 *
 * ⚠️ A RULE AND NOT ROWS, ON PURPOSE. A manifest row is also a subject for
 * `demo/verify.mjs`, which grades every `built` row, `unlisted` or not, and
 * these pages publish nothing for it to grade beyond the shell's own. And a
 * row per page means a new page deploys only after somebody remembers to add
 * one. This walks the folders, so a new page ships on the next build.
 * ⚠️ SAME CONTAINMENT AS demoFiles(): named subtrees, filtered to the same web
 * extensions, so nothing from the repo root can reach public/.
 * 🔴 AND IT REFUSES A FOLDER THAT WOULD TAKE OVER A STILL-SERVED ADDRESS. A
 * concept group is a top-level path now, beside every demo slug. For one
 * afternoon the radio concepts were /stations/ because the archived radio demo
 * still answered at /radio/; asked *"Resolve clashes"*, the demo moved to
 * /archive/radio/ (manifest row `archive/radio`) and the group took /radio/. A demo slug, a manifest page path, or a top-level destination
 * of the hand list above, under the same name as a concept folder, stops the
 * build here, as does a row whose folder is not in CONCEPT_DIRS (it would not
 * be copied and its card would 404).
 */
~~~

### archive-files

Above `function archiveFiles() {`, lines 713 to 722 before the cut.

~~~js
/**
 * `/archive/`, 2026-10-12 (*"make "/arhive" page and move csound and tutotial
 * slide there"*): `demo/archive/` deployed whole at /archive/, as conceptFiles()
 * does for the concept folders, with no manifest row. Beside it the markdown notes that
 * describe removed pages, `archive/typist.md` and `archive/concepts/*.md`,
 * deployed at their repository paths so the dev server (which serves the repo
 * root) and the deploy answer the same URL. `_headers` below serves them as
 * plain text. Only `.md`, from those two places, so nothing else in archive/
 * (old pages, captures) reaches public/.
 */
~~~

### archive-subdirs

Above `const owned = new Set(DEMO_MANIFEST.filter((d) => d.name.startsWith('archive/'))`..., lines 725 to 730 before the cut.

~~~js
// One level of subdirectories as well, for a retired page kept whole
// (`demo/archive/clock-follow/`, the old concepts clock/040, moved there
// 2026-10-12 when the clock pages were renumbered).
// A folder a manifest row owns (`archive/radio`, the archived radio demo, since
// 2026-10-13) is copied by demoFiles() with its media, so it is skipped here:
// copying it twice is a duplicate destination and the build refuses it.
~~~

### rewrites

Above `const BACK = '<a href="/" style="position:fixed;left:8px;bottom:8px;z-index:9999`..., lines 747 to 761 before the cut.

~~~js
// ── deployed-copy rewrites ──────────────────────────────────────────────────
// The ONLY edits made to any proto's bytes, applied to the COPY in public/.
// The files in proto/ are not touched. Each one exists because the source
// hardcodes a dev-server localhost URL that cannot resolve from a phone.
// ── appended to the deployed copy ───────────────────────────────────────────
// A BACK LINK for the archive pages, which predate the index and have no way
// to reach it — on a phone the only exit is the browser gesture.
//
// APPENDED rather than substituted, deliberately: the first attempt used
// REWRITES with "</html>" as the anchor and build.mjs correctly refused,
// because proto/megatimeline/index.html has no closing tag. A position:fixed
// anchor works wherever it lands in the body, so it needs no anchor at all.
//
// Deployed copy only: under each proto's own dev server "/" is the repo root,
// not the index, so the link would point at nothing there.
~~~

### tree-digest

Above `const treeDigest = () => {`, lines 770 to 779 before the cut.

~~~js
/**
 * A digest of the bytes about to be copied — four hex, enough to tell two
 * trees apart and short enough to read off a phone.
 *
 * ⚠️ TOLERATE AN UNREADABLE FILE RATHER THAN THROWING HERE. `checkPresent()` is
 * what reports a missing file — by name, with the build refused and nothing
 * deleted — and it runs a few hundred lines below this. An ENOENT thrown out of
 * the stamp would pre-empt it with a stack trace, which is exactly the raw
 * failure that check exists to replace.
 */
~~~

### stamp

Above `const BUILD_STAMP = '${execSync('git rev-parse --short HEAD', { cwd: REPO }).toS`..., lines 789 to 799 before the cut.

~~~js
// A build id the browser can report back. git sha + build time + the tree.
//
// ⚠️ THE SHA AND THE CLOCK ARE EACH INSUFFICIENT, FOR DIFFERENT REASONS. The
// sha alone is not enough because an uncommitted edit deploys under the
// previous one — which is why the time was added. But a time says WHEN, never
// WHOSE: two working trees at one sha, built seconds apart by two agents, then
// differ by a number that looks like a clock and carries nothing about which
// tree shipped. `Attribute a run to a build before iterating on it` quietly
// stops working there, because the stamp DID change and it is the wrong
// build's. The digest is over the bytes themselves, so two identical trees
// stamp identically and two different ones cannot.
~~~

### flipper-viewport

Above `['<meta charset="utf-8">',`, lines 809 to 817 before the cut.

~~~js
// flipper has NO viewport meta. research/mobile-2026-08.md §3 lists exactly
// this bug — "the single biggest bug on three of the four public surfaces"
// — and fixed it in megatimeline, remixer, aikajana and replay. flipper
// was not in that pass, so it still lays out at 980 px and a phone renders
// it shrunk to ~40%. Measured at a true 390 px layout it is already fluid:
// 0 px horizontal overflow, tiles and HUD intact, three live streams
// playing. So the deployed copy gets the same one line the other three
// carry, verbatim. proto/flipper/index.html itself is NOT modified — the
// missing meta is a real gap in that proto and belongs in its own commit.
~~~

### icons

Above `const PS_ICON_SPECS = {`, lines 836 to 857 before the cut.

~~~js
// ── the icons: p.s, drawn here with no browser ─────────────────────────────
//
// 🔴 p.s SINCE 2026-10-14, REPLACING β+. The owner said yes to the trials on
// /kit/logo/#p-s (`PS_ICONS` in demo/kit/logo/index.html), and these are those
// trials made here, the way the avatars below are: SVG text through resvg
// (`renderPng`), centred on resvg's own ink box (`inkBox`). The mark is the
// mono face at 600, tracked -0.12 em, the dot in the accent #ffd400, on
// #0b0e14, clipped to the shape the trial names: `square` is a 0.18 radius,
// `ios` 0.225, `circle` a circle. `ps` has no dot (two pixels at 16) and keeps
// the face's own spacing, as `drawPs` does.
//
//   /favicon.ico                    16 ps, 32 p.s, 48 p.s, one ICO, never renamed
//   /icons/apple-touch-<hash>.png   180, ios
//   /icons/android-<hash>.png       192, circle, in the manifest
//   /icons/store-<hash>.png         512, ios, in the manifest
//   /icons/manifest-<hash>.webmanifest
//
// ⚠️ demo/favicon.ico IS THE DEV SERVER'S COPY, AND ONLY THAT. demo/server.mjs
// serves files off disk and has no build step, so a page on :8890 asking for
// /favicon.ico needs a file there (a 404 has turned harnesses red before, see
// demo/partitur/index.html). The build never reads it: it compares, and says
// so when the two differ.
~~~

### refusals

Above `checkImports(FILES);`, lines 923 to 936 before the cut.

~~~js
// ── run ─────────────────────────────────────────────────────────────────────
//
// 🔴 EVERY REFUSAL FIRST, BEFORE ONE BYTE IS WRITTEN OR DELETED — AND THAT WAS
// NOT TRUE UNTIL 2026-09-14, WHILE `checkPresent`'S OWN COMMENT SAID IT WAS.
// All four calls sat BELOW the copy loop, so a listed file that was not on disk
// did not produce the named refusal this file goes to such trouble to write: it
// produced a raw `ENOENT` from `copyFile` in the middle of the run, on top of
// an `OUT` that had already been emptied — a half-built output directory and a
// stack trace, which is the exact failure the comment claimed was prevented.
// MEASURED by moving `scsynth-nrt.wasm` aside and watching it happen.
//
// The checks read FILES and the repo, never OUT, so there was never a reason
// for them to be down there. Function declarations hoist; the calls moved and
// nothing else did.
~~~

### which

Above `console.log(SCRATCH ? 'SCRATCH BUILD -> ${OUT} (public/ untouched)' : 'build -> `..., lines 944 to 946 before the cut.

~~~js
// ⚠️ SAY WHICH BUILD THIS IS, BEFORE IT RUNS AND AGAIN AFTER. A scratch build
// that is mistaken for a real one is a deploy nobody made; a real one mistaken
// for a scratch build is sixty files somebody has to explain.
~~~

### front-page

Above `// favicon.ico, generated here. Browsers request /favicon.ico for every page`, lines 955 to 958 before the cut.

~~~js
// 🔴 NO GENERATED FRONT PAGE SINCE 2026-10-13. This block baked the manifest's
// groups (`byGroup`, `groupHTML`, `noteHTML`) into workers/view/menu.html at
// public/index.html. The front page is demo/index.html now, copied by the list
// above like any other page, and menu.html is archive/frontpage/menu.html.
~~~

### favicon

Above `const ICONS = await psIcons();`, lines 960 to 965 before the cut.

~~~js
// favicon.ico, generated here. Browsers request /favicon.ico for every page
// whether or not the HTML asks for one; without this the four protos (which
// declare no icon, and three of which we must not edit) each log a 404 to the
// console, and "zero console errors" stops being true. The apple touch icon and
// the manifest are written beside it under /icons/, hashed, and named in every
// page by `withIconLinks` below.
~~~

### share-card

Above `const CARD = siteCard();`, lines 982 to 999 before the cut.

~~~js
// ── the share card, og/site-<hash>.png ───────────────────────────────────────
//
// 🔴 ONE CARD FOR EVERY PAGE FOR NOW, DRAWN WITH NO BROWSER, 2026-10-13. Asked:
// *"Build frontpage og card and apply to all pages"*, then *"What headless
// chrome?!!? See ../eccm etc"*, and since the same evening the hero's type
// alone (*"No patchbay. Do like frontpage"*). The SVG is written by
// share-card.mjs from HERO and the font metrics, and resvg (wasm, og/render.mjs)
// rasterises it with the site's faces as TTFs (og/og-fonts.py). eccm and trip
// render the same way at the EDGE, on the first fetch, because their cards come
// from a database; here every input is in the repository at build, so the PNG
// is a static asset like the favicon and costs no Worker, no R2 and no wasm in
// the deployed bundle.
// ⚠️ THE NAME CARRIES A HASH OF THE SVG AND TEMPLATE_V, because scrapers cache
// a preview by URL: a changed card is a new URL, and an old one is a 404 after
// the next deploy, which is fine for a scraper that already holds its bytes.
// ⚠️ AND THE INSTAGRAM PORTRAIT BESIDE IT, 1080 BY 1350 (*"Do also ig image"*),
// which no page names: Instagram reads no Open Graph, it is posted by hand and
// downloaded from /kit/share/.
~~~

### avatars

Above `for (const [NET, S, FILL] of [['instagram', 320, 0.56], ['github', 460, 0.62], [`..., lines 1009 to 1017 before the cut.

~~~js
// 🔴 THE INSTAGRAM AVATAR AS A FILE, 2026-10-13: *"deploy. links to ig first
// post and avatar in positron.studio"*. /kit/logo/'s P.S AVATARS draws it on a
// canvas for a download; this is the same mark made here, with no browser, so
// it has a URL: p.s in the mono face at 600, tracked -0.12 em, the dot in the
// accent, its ink 0.56 of the width and centred on resvg's own ink box, on a
// full 320 square that Instagram crops to a circle.
// GitHub (460, square, ink 0.62) and YouTube (800, cropped to a circle, ink
// 0.56) joined it 2026-10-14 (*"do profile images for gh and yt"*), at
// /kit/logo/'s upload sizes and fills.
~~~

### headers

Above `await writeFile(join(OUT, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n'`, lines 1032 to 1051 before the cut.

~~~js
// ── _headers — the half of the noindex that the Worker cannot reach ──────────
//
// 🔴 STATIC ASSETS ARE SERVED BY THE EDGE BEFORE THE WORKER RUNS. `src/index.js`
// wraps every response IT returns in `X-Robots-Tag`, and that covers `/api/*`,
// `/err-img`, `/icy/*`, `/report`, `/notes/<slug>` and the 404. It covers none
// of the fifty pages, none of the modules and none of the committed cache,
// because for those the Worker is never invoked at all. This file is what
// covers them, and the two must keep saying the same thing.
//
// ⚠️ `_headers` IS A CONFIG FILE, NOT AN ASSET. Cloudflare reads it at upload
// and does not serve it, so this does not put a file at /_headers. `/*` matches
// every path on every hostname this Worker answers, which includes the
// `workers.dev` name that `workers_dev: true` keeps alive.
//
// To turn indexing back on when the site IS ready: delete this block, delete
// `NOINDEX`/`marked()`/`ROBOTS` from src/index.js, and drop the meta pass in
// the copy loop below. Nothing else knows about any of it.
// The second block serves archiveFiles()'s markdown notes as plain text, so a
// browser shows them rather than offering a download.
// The third serves the share card for a year: its name changes when it does.
~~~

### robots-meta

Above `const ROBOTS_META = '<meta name="robots" content="noindex, nofollow">';`, lines 1057 to 1070 before the cut.

~~~js
// ── the noindex meta, on every page, whoever wrote the page ─────────────────
//
// The header above is the control that actually works. This is the second
// channel, and it exists because a header is invisible in the file: somebody
// reading a page's source should be able to see that it is not meant to be
// found. 45 of the 50 pages already carried it when this landed.
//
// ⚠️ IT PATCHES THE DEPLOYED COPY ONLY, which is the same treatment
// `proto/flipper/index.html` already gets for its missing viewport, and for the
// same reason: three of the four protos must not be edited. A page in demo/
// should carry the tag in its own source, and this is the net under it.
// ⚠️ AND IT SAYS HOW MANY IT CAUGHT. A build step that silently repairs pages
// cannot be told apart from one that has nothing to repair, so the count is
// printed: if it ever rises, a new page shipped without the tag.
~~~

### share-tags

Above `const SHARE = new Map();`, lines 1086 to 1096 before the cut.

~~~js
// ── the share tags, on every page ───────────────────────────────────────────
//
// Open Graph and the X card, written into the deployed copy of every page next
// to the robots meta, because a link preview bot reads the HTML the edge serves
// and runs no script (so `mount()` cannot be where they come from). The tag set
// is eccm's and trip's. Title and description per page, from what already
// names it: a concept page's CONCEPTS row (`title`, `say`), a demo's manifest
// row (`title` or its name, the card's `say` or the row's `one`), the front page
// from HERO, and anything else from its own <title>. The image is the one site
// card for every page. A page that carries its own og:image keeps it, and the
// count is printed, as for the robots meta.
~~~

### check-present

Above `function checkPresent(copied) {`, lines 1181 to 1196 before the cut.

~~~js
/**
 * 🔴 REFUSE THE BUILD IF A LISTED FILE IS NOT THERE.
 *
 * `checkImports` catches a MODULE that imports something undeployed. It cannot
 * catch a BINARY, because a binary is not imported — it is fetched by URL, and
 * a URL is just a string to every check in this file. So a vendored asset that
 * was renamed, or never committed, would copy-fail somewhere in the middle of
 * the run with a raw ENOENT, or — worse, if the list were edited but the file
 * left behind — ship a 404 that only a headset would ever meet.
 *
 * That is `moq.mjs` again: a module holding a path that moved. The controller
 * models live under `shell/vendor/` precisely because the module that wants
 * them is shared, so this check is what makes that safe. It runs BEFORE
 * anything is copied, so a missing file is a refusal rather than a half-built
 * output directory.
 */
~~~

### check-out

Above `function checkOut(out) {`, lines 1206 to 1222 before the cut.

~~~js
/**
 * 🔴 REFUSE AN `--out` THAT WOULD DELETE SOMETHING THIS BUILD DID NOT WRITE.
 *
 * The run section empties OUT with `rm -rf`. For `public/` that is correct and
 * has been for a year. For a directory somebody typed on the command line it is
 * a loaded gun pointed at whatever they mistyped — and the whole point of
 * `--out` is that it gets typed, often, by people and agents in a hurry.
 *
 * So three refusals, in rising order of how bad the mistake would be: never the
 * repo or anything containing it; never a directory that has files in it which
 * this build did not put there. A build output is recognisable — it always has
 * `index.html` and `favicon.ico`, both of which this file authors itself — so
 * "did we write this?" is answerable without keeping a marker file around.
 *
 * ⚠️ An EMPTY or ABSENT directory is fine and is the common case: `--out` into
 * a fresh temp dir is the whole intended use.
 */
~~~

### check-vendor

Above `function checkVendorUrls(copied) {`, lines 1241 to 1255 before the cut.

~~~js
/**
 * 🔴 AND REFUSE A `vendor/` URL IN THE SOURCE WITH NOTHING DEPLOYED BEHIND IT.
 *
 * The other half of the same hazard, from the other end: `xr-room.mjs` holds
 * the string `/shell/vendor/` and builds a filename from a profile id. If the
 * directory were renamed, `checkPresent` above would still pass — the files
 * exist, they are just somewhere else — and the module would 404 at runtime on
 * a headset, which is the most expensive place this repo has to find anything.
 *
 * So the literal paths in the source are checked too. Only fixed ones can be:
 * a name built from a runtime value cannot be known here, which is why the
 * runtime ALSO falls back to a drawn stand-in and says on the tablet's own face
 * which one you are looking at. Three guards, because this exact class of bug
 * has already cost two demos a day of reading red for the wrong reason.
 */
~~~

### defs

Above `for (const m of text.matchAll(/['"'](\/[A-Za-z0-9_-]+\/(?:vendor|defs)\/[^'"'${}`..., lines 1263 to 1267 before the cut.

~~~js
// ⚠️ `defs` AS WELL AS `vendor`, ADDED 2026-09-13. `/grains/` fetches two
// compiled SynthDefs from `/grains/defs/`. They are not vendored — they are
// build artefacts of the Raspberry Pi — but the hazard is identical: a
// string in the source, no import to follow, and a 404 at runtime that
// leaves the page booting for ever with nothing in the log.
~~~

### dir

Above `const isDir = rel.endsWith('/');`, lines 1270 to 1271 before the cut.

~~~js
// a bare directory prefix is a base that gets a filename appended at
// runtime — check the DIRECTORY has something in it
~~~

### faust-aot

Above `async function checkFaustAot() {`, lines 1284 to 1325 before the cut.

~~~js
/**
 * 🔴 AND REFUSE A COMPILED SynthDef THAT NO LONGER MATCHES ITS SOURCE.
 *
 * `demo/grains/defs/*.scsyndef` are built by sclang ON THE BOARD out of
 * `rig/board/norns/Engine_Pappus.sc` and `PosSource.sc`. `/grains/` loads them
 * into wasm scsynth in the tab and claims, in its own first paragraph, that the
 * browser is running the graph the Raspberry Pi is running.
 *
 * That claim has one silent failure and this is it: somebody edits the engine,
 * the board recompiles on its next restart, and the checked-in artefact does
 * not — so the tab runs the OLD graph beside the board's new one and every
 * number on the page goes on agreeing, because both ends are still measured
 * the same way. Nothing 404s, nothing throws, and the page's whole subject is
 * quietly false.
 *
 * `PROVENANCE.json` records the md5 of every source and every artefact. This
 * re-takes both and refuses the build on any disagreement, with the recipe in
 * the message — the artefact cannot be rebuilt here, so the refusal has to say
 * where it is rebuilt.
 *
 * ⚠️ IT IS A HASH OF THE SOURCE, NOT OF THE COMPILER. A different sclang could
 * still produce different bytes from the same `.sc`; that is why the artefact's
 * own hash is checked too, so at least "the file in the repo is the file that
 * was weighed" is never in doubt.
 */
/**
 * 🔴 EVERY AHEAD OF TIME PROGRAM MUST HAVE BEEN COMPILED FROM THE TEXT ITS PAGE
 * SHOWS, BY THE COMPILER THIS REPOSITORY VENDORS, WITH THE FLAGS IT USES: the
 * Organ `/fau/` shows, and since 2026-10-06 the program of the `synths` deck.
 * `checkCompiledDefs()`'s twin, and for the same reason: a stale artefact
 * plays the old instrument and nothing anywhere says so.
 *
 * `demo/resources/faust/PROVENANCE.json` records the md5 of each program's TEXT
 * (read out of `demo/fau/presets.mjs` or `demo/shell/synth-steps.mjs` by
 * importing it, the same module the page or the deck imports), the md5 of each compiler file, the flags, and the md5 of each
 * artefact. This re-takes all of them and refuses on any disagreement, with
 * the command that remakes them in the message.
 * ⚠️ IT DOES NOT COMPILE. A build must not boot a 6 MB compiler; the md5 of
 * the source and of the compiler files is what a recompile would depend on,
 * and `node demo/resources/build-faust-aot.mjs --check` is the full recompile,
 * byte for byte and by RMS.
 */
~~~

### never-compiled

Above `for (const s of SYNTH_STEPS) {`, lines 1343 to 1344 before the cut.

~~~js
/* ⚠️ AND A PROGRAM THAT EXISTS AND WAS NEVER COMPILED IS STALE TOO: a step
   added to the deck with no artefact would 404 on its first press. */
~~~

### explode

Above `console.log('cache: nothing to explode — megatimeline is archived');`, lines 1426 to 1431 before the cut.

~~~js
// ⚠️ THE EXPLODED CACHES WENT WITH MEGATIMELINE. They turned its two committed
// JSONL files into one static asset per entry, so a cache hit was a plain file
// read and ERR was never called for a query already on disk. Nothing else ever
// read them: the page that asked for `cache/search/…` and `cache/item/…` is the
// page now in `archive/`. `explode()` and `queryHash()` are left in this file —
// they are the mechanism, and the next proto with a committed cache wants them.
~~~

## `workers/view/deploy.mjs`

### deploy-header

Above `import { spawnSync } from 'node:child_process';`, lines 1 to 22 before the cut.

~~~js
// deploy.mjs — build public/ and ship exactly that build, or refuse.
//
//   node workers/view/deploy.mjs            build, interlock, deploy, confirm
//   node workers/view/deploy.mjs --dry-run  everything except the upload
//
// 🔴 WHY THIS EXISTS. `build.mjs` and `npx wrangler deploy` are two commands
// about two different moments, and nothing has ever joined them. With one
// person that is fine. With two agents in one checkout it is this:
//
//   A: node build.mjs        public/ is A's tree
//   B: node build.mjs        public/ is B's tree
//   A: npx wrangler deploy   A ships B's tree, under B's stamp
//
// and every downstream rule quietly stops working. `Attribute a run to a build
// before iterating on it` reads a stamp that is somebody else's.
// `Confirm the stamp changed before asking anyone to retest` confirms it —
// it did change, to the wrong thing. There is no output anywhere that looks
// wrong, which is the worst shape there is.
//
// So: hold a lock across build and upload, have build.mjs record a fingerprint
// of what it wrote and its stamp, and refuse to upload a public/ that differs
// from that record by one byte. The fingerprint is over CONTENT, not mtimes.
~~~

### wrangler

Above `export const WRANGLER = '4.75.0';`, lines 32 to 32 before the cut.

~~~js
// The wrangler `npx wrangler --version` resolved to on 2026-10-14. Raise it on purpose.
~~~

### lock

Above `export function takeBuildLock(what) {`, lines 38 to 42 before the cut.

~~~js
/**
 * Hold the lock on building into public/ until this process exits. A build
 * spawned by a deploy that already holds it is told so through
 * POSITRON_BUILD_LOCK=<holder pid>. Refuses (exit 1) while a live process holds it.
 */
~~~

### drift

Above `export function drift(before, after) {`, lines 87 to 93 before the cut.

~~~js
/**
 * What changed between two fingerprints, in words. Empty array means identical.
 *
 * ⚠️ IT REPORTS ALL THREE KINDS. An output directory that lost a file between
 * the build and the upload is as wrong as one that gained a changed one, and a
 * check that only looked for modifications would call that clean.
 */
~~~

### run

Above `if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.ur`..., lines 104 to 106 before the cut.

~~~js
// ── run ─────────────────────────────────────────────────────────────────────
// (guarded, so the functions above can be imported and tested without
// building or deploying anything — which is how their refusal was proved)
~~~

### uncommitted

Above `const REPO = join(HERE, '..', '..');`, lines 111 to 135 before the cut.

~~~js
// ── what this deploy is about to ship that nobody has committed ───────────
//
// 🔴 IT ALWAYS LISTS AND IT NEVER REFUSES, and that asymmetry is the whole
// design. This started as a hard gate — refuse when the tree is dirty — and
// the agent who had been on the receiving end of it all day priced it: they
// had deployed five times in ninety minutes, every one at the user's explicit
// instruction, every one with legitimate half-finished work in the tree. A
// gate would have fired on all five, so the override would have been typed
// five times and been muscle memory by the third.
//
// That is this repo's own rule arriving somewhere new: *"a colour scale whose
// normal reading is a warning has no warning left."* A refusal that fires on
// the normal case is not a guard, it is a keystroke — and it is worse than no
// guard, because it trains you straight past the once it would have mattered.
//
// ⚠️ AND THE HARM WAS NEVER THE DEPLOYING. Every one of those deploys was the
// right call. The harm was that the OTHER agent did not know — and what fixed
// that was the announcements, not anything that could have refused. So the
// part worth automating is the part a person cannot forget to do: enumerate,
// out of git rather than out of somebody's memory, exactly what is going out
// uncommitted. It was done by hand five times and nearly missed a file.
//
// `--strict` is for when the tree SHOULD be clean — a release, a bisect — and
// there the refusal means something precisely because it is not the normal
// answer.
~~~

### deploy-env

Above `const env = { ...process.env };`, lines 219 to 221 before the cut.

~~~js
// ⚠️ `.env` IN THE CWD SHADOWS MACHINE OAUTH (CLAUDE.md). Unset the two
// variables rather than requiring a particular working directory, which is
// the documented fix and the one nobody has to remember.
~~~

### confirm

Above `const WANT = 'export const BUILD = '${stamp}'';`, lines 238 to 240 before the cut.

~~~js
// `Confirm the stamp changed before asking anyone to retest — the edge serves
// the previous build for a few seconds after deploy.` That rule has been
// carried in prose and performed by hand. Perform it here.
~~~

## `workers/view/og/render.mjs`

### og-render

Above `import { readFile } from 'node:fs/promises';`, lines 1 to 14 before the cut.

~~~js
// workers/view/og/render.mjs: SVG to PNG in Node, through resvg compiled to
// wasm, with the site's two faces as TTFs and no system fonts. eccm's
// src/og/render.mjs (itself trip's renderer) moved to build time: the same
// @resvg/resvg-wasm 2.6.2, the same `fontBuffers` and `loadSystemFonts: false`,
// initialised once per process because a second initWasm throws.
//
// ⚠️ NO BROWSER ANYWHERE IN THIS PATH, asked 2026-10-13: *"What headless
// chrome?!!?"*. The SVG is written by demo/shell/share-card.mjs and
// demo/shell/bay-svg.mjs from data and font metrics; this file only rasterises.
// ⚠️ THE WASM IS VENDORED, NOT INSTALLED. vendor/resvg-wasm/ is index.mjs,
// index_bg.wasm and package.json copied byte for byte from the npm package
// @resvg/resvg-wasm 2.6.2 (MPL-2.0, its package.json beside it). It lives here
// and not under demo/ so the build never deploys 2.48 MB nobody fetches.
// ⚠️ THE FACES ARE fonts/*.ttf, made by og-fonts.py from demo/shell/vendor/.
~~~

## `workers/view/preview.mjs`

### preview

Above `import { spawnSync } from 'node:child_process';`, lines 1 to 23 before the cut.

~~~js
// workers/view/preview.mjs — build and upload a VERSION, without deploying it.
//
//   node workers/view/preview.mjs            alias from the current git branch
//   node workers/view/preview.mjs staging    alias given by hand
//
// 🔴 WHAT THIS IS FOR, AND IT IS NOT "being careful". It answers one question
// `deploy.mjs` cannot: *is what I am about to ship good, without shipping it
// over somebody else's tree*. With two or three agents in one checkout,
// `public/` is a shared mutable global and a deploy takes whatever is in
// `demo/` at that instant. A version upload puts the same bytes on a URL
// nobody's visitors are on, so the tree can be graded before production moves.
//
// ⚠️ IT DOES NOT TOUCH THE CUSTOM DOMAIN. `versions upload` publishes a version
// and does not point any route at it; `wrangler deploy` is still what moves
// positron.studio. That is the whole distinction and it is why this file exists
// beside `deploy.mjs` rather than as a flag on it.
//
// ⚠️ THE ALIAS IS SET AT UPLOAD AND CANNOT BE CHANGED AFTERWARDS. Cloudflare
// keeps the 1000 most recent versions.
//
// ⚠️ AND IT RUNS THE SAME BUILD AND THE SAME INTERLOCK AS A DEPLOY. A preview
// built from a different tree than the one that gets deployed is a preview that
// grades nothing, which is the failure `deploy.mjs`'s header is about.
~~~

### env

Above `const env = { ...process.env };`, lines 80 to 81 before the cut.

~~~js
// ⚠️ `.env` IN THE CWD SHADOWS MACHINE OAUTH (CLAUDE.md), and the documented
// fix is to unset the two variables rather than to require a directory.
~~~

## `workers/view/src/index.js`

### header

Above `const UA = 'elektron-view/1.0 (+https://positron.studio; archive viewer prototyp`..., lines 1 to 18 before the cut.

~~~js
// elektron-view: positron.studio's Worker.
//
// Static assets (public/, built by build.mjs) serve every page directly from
// the edge, and this Worker runs only for paths with no asset behind them:
// /robots.txt, /err-img, /icy/*, /report, /notes/<slug>, a few redirects and
// the 404. Every response it returns carries X-Robots-Tag (see `marked`).
//
// The ERR search proxy (/api/search, /api/item, /api/stats) and the `Gate`
// Durable Object behind it were removed on 2026-10-14: nothing outside
// archive/ called them. wrangler.jsonc carries the migration that deletes Gate.
//
// /err-img stays because https://positron.studio/floor/ reads ERR thumbnails
// as WebGL textures. MEASURED 2026-09-14 with an Origin header: both
// `arhiiv-images.err.ee` and the `arhiiv-img.err.ee` resizer answer 200 with NO
// `access-control-allow-origin`. A page can DISPLAY such an image; it cannot
// read its pixels, and `texImage2D` on one throws a SecurityError. So the floor
// needs them same-origin. The distinction is display versus READ, and it is
// invisible until something tries to read.
~~~

### noindex

Above `const NOINDEX = 'noindex, nofollow';`, lines 28 to 42 before the cut.

~~~js
// ── not ready to be found ───────────────────────────────────────────────────
//
// 🔴 positron.studio IS R&D AND MUST NOT BE INDEXED. Asked for 2026-09-16:
// "hide positron from Google ... no indexing. We are not ready."
//
// Three channels, and they do different jobs. The meta tag in each page is the
// weakest: it only covers HTML, and only HTML whose head carries it. robots.txt
// is the next: it stops a compliant crawler FETCHING, and does NOT stop one
// listing a URL it heard about elsewhere. `X-Robots-Tag` is the one that
// actually works, because it rides on EVERY response, HTML or not, and it is
// the only one of the three that removes a URL already in an index.
//
// ⚠️ THIS HEADER IS ONLY HALF THE SURFACE. Static assets are served by the edge
// BEFORE this Worker runs, so nothing here can reach them. `public/_headers`
// (written by build.mjs) is the other half, and the two must say the same thing.
~~~

### marked

Above `function marked(res) {`, lines 45 to 55 before the cut.

~~~js
/**
 * Every response this Worker returns, marked.
 *
 * ⚠️ A RESPONSE OUT OF THE CACHE API OR THE ASSET BINDING HAS IMMUTABLE
 * HEADERS, and `.set()` on one throws a TypeError rather than failing quietly.
 * Both kinds are returned from the routes below (`/err-img` serves a
 * `caches.default` hit, `/notes/<slug>` serves an `env.ASSETS` fetch), so this
 * rebuilds rather than mutating.
 * ⚠️ AND A BODY-LESS STATUS MUST NOT BE GIVEN A BODY: `/report` answers 204,
 * and `new Response(<body>, { status: 204 })` is a TypeError.
 */
~~~

### robots-groups

Above `const PREVIEW_BOTS = [`, lines 63 to 82 before the cut.

~~~js
/**
 * 🔴 ONE `User-agent` PER GROUP. NEVER A SHARED ONE.
 *
 * The shared form (N `User-agent` lines above one `Allow`) is legal under
 * RFC 9309 and Meta's parser does not honour it: `facebookexternalhit` binds
 * directives to the NEAREST `User-agent` line only, so it fell through to
 * `* Disallow` and the Sharing Debugger reported a 403 while the edge had
 * served it 200 all afternoon. That is a synthetic code for "robots.txt
 * refuses me", and it sent the sibling project on an evening's tour of Bot
 * Fight Mode, Browser Integrity Check and AI Crawl Control before zone
 * analytics said the requests had never been blocked at all. Write this file
 * in the dumbest parser's dialect and the whole class of bug goes away.
 *
 * 🔴 AND ALLOWING THE PREVIEW BOTS IS A DELIBERATE CALL, NOT AN OVERSIGHT.
 * They build the card when somebody pastes a positron link into Slack,
 * Telegram, Discord or a chat. They do not build a search index, and the ask
 * was about search. A blanket `Disallow: /` takes those cards out everywhere,
 * silently, and the breakage is invisible from here. To go completely dark,
 * delete every group above `User-agent: *` and nothing else changes.
 */
~~~

### routes

Above `const routes = {`, lines 115 to 117 before the cut.

~~~js
// 🔴 THE ROUTES LIVE HERE AND THE EXPORT IS BELOW THEM, so the header cannot be
// forgotten by a route that returns early. Adding one to `routes` is the only
// way to serve anything from this Worker, and there is exactly one way out.
~~~

### robots

Above `if (p === '/robots.txt' && (request.method === 'GET' || request.method === 'HEAD`..., lines 123 to 133 before the cut.

~~~js
// ── GET /robots.txt ────────────────────────────────────────────────────
// Served from the Worker rather than committed into public/, so no build
// allowlist and no asset route can drop it. Assets are tried first, so this
// is reached only because build.mjs does not write a robots.txt; if one ever
// appears in public/ it would win silently and this route would go dead.
// ⚠️ HEAD AS WELL AS GET. Every other route here is GET-only and that is
// fine, because the paths a crawler HEADs are static assets and the asset
// server answers those itself. This one has no asset behind it, so a
// GET-only guard sends a HEAD straight to the 404 below: `curl -sI` on it
// read `404` while `curl -s` on the same URL read the file, which is the
// shape of a bug that survives being tested.
~~~

### same-origin

Above `const origin = request.headers.get('origin');`, lines 146 to 149 before the cut.

~~~js
// Same-origin only. Our own pages are
// same-origin so they always pass; a POST from anyone else's site carries
// a foreign Origin and is refused. No CORS headers are ever sent, so no
// third-party page can read a response even if it got one.
~~~

### err-img

Above `if (p === '/err-img' && request.method === 'GET') {`, lines 155 to 166 before the cut.

~~~js
// ── GET /err-img — a thumbnail, same-origin, so WebGL can READ it ──────
//
// 🔴 THE ONLY REASON THIS EXISTS IS THE CORS DISTINCTION IN THE HEADER.
// These images are already public and already fetched direct by `reel` and
// `remixer`; nothing here is being unlocked. What changes is that the bytes
// arrive same-origin, so a texture upload is allowed to read them.
//
// Not an open proxy: the upstream HOST is a constant, and the only thing a
// caller controls is a path that must match the archive's own thumbnail
// shape: a four-digit year folder and a plain filename. No `..`, no slashes beyond the one, no other extension.
// Size is clamped to a tile-sized range, because the point is a floor of
// small pictures and an unbounded `width` is somebody else's bandwidth.
~~~

### cache-key

Above `const key = new Request('${url.origin}/err-img?f=${encodeURIComponent(f)}&w=${w}`..., lines 179 to 182 before the cut.

~~~js
// ⚠️ A CACHE KEY THAT IS NOT THE REQUEST URL. The browser may send this
// with any order of query parameters and any casing; the edge entry is
// keyed on the three things that decide the bytes, so two spellings of
// one picture are one entry rather than two upstream fetches.
~~~

### cache-everything

Above `r = await fetch(upstream, {`, lines 193 to 200 before the cut.

~~~js
// ⚠️ `cf.cacheEverything` CACHES THE UPSTREAM FETCH, WHICH IS A DIFFERENT
// CACHE FROM THE ONE ABOVE AND THAT IS THE POINT. `caches.default` is
// per-COLO: a visitor in another region misses it and would go to the
// archive. This makes the SUBREQUEST cacheable too, so a colo miss
// still lands in Cloudflare's own cache rather than on somebody else's
// server. Three layers, each covering the one before's miss:
//   browser (cache-control below) → colo (caches.default) → CF (here)
// and the archive is asked roughly once per picture, ever.
~~~

### cache-hard

Above `const out = new Response(r.body, {`, lines 210 to 216 before the cut.

~~~js
// ⚠️ A THUMBNAIL OF A 1965 FILM DOES NOT CHANGE, so this is cached hard.
// The BROWSER layer is the one that matters most for this page: a floor
// re-asks for the same tiles every time you walk back over them, and a
// week in the local cache means walking back costs nothing at all.
// ⚠️ NOT stored in the repo, deliberately — 298 thumbnails is ~2 MB of
// somebody else's images, and nothing media-shaped is kept
// here. Proxied and cached is not the same as held.
~~~

### icy

Above `if (p.startsWith('/icy/') && request.method === 'GET') {`, lines 229 to 235 before the cut.

~~~js
// ── /icy/{mount}.mp3 — DELIBERATELY NOT PROXIED ────────────────────────
// flipper's now-playing line wants icecast ICY metadata. Reading it means
// opening the live MP3 stream and pulling audio bytes until a metadata
// block arrives — i.e. running someone else's radio through this Worker to
// scrape a song title. Not worth it. A well-formed empty answer keeps the
// page's `catch {}` quiet and the console clean; the channel list, the
// streams and the flipping all work without it.
~~~

### report

Above `if (p === '/report' && request.method === 'POST') {`, lines 245 to 246 before the cut.

~~~js
// autotest report sink — the harnesses POST here. Accepted and dropped;
// this deployment keeps nothing.
~~~

### notes

Above `const note = p.match(/^\/notes\/([a-z0-9-]+)\/?$/);`, lines 251 to 263 before the cut.

~~~js
// ── GET /notes/<slug> — a real path for a note ─────────────────────────
// Assets are tried before this Worker runs, so `/notes/index.html` and
// `/notes/<slug>.md` are already served and never reach here. What reaches
// here is the READABLE form, which has no file behind it.
//
// The dot is not in the character class on purpose, so `<slug>.md` cannot
// match this and shadow the asset it is named after.
//
// NO FALLBACK: the note must EXIST before the viewer is served. Serving the
// viewer for any slug-shaped path gives a soft 404 — the reader sees "could
// not load", while a crawler, a link checker and every automated caller see
// 200 and success. A page that says it is broken is not the same as a site
// that says so, and only one of them is true to anything but a human eye.
~~~

### frontpage

Above `if (p === '/frontpage' || p === '/frontpage/') {`, lines 273 to 275 before the cut.

~~~js
// ── /frontpage, 2026-10-12 ─────────────────────────────────────────────
// Asked three times for https://positron.studio/frontpage: the samples live
// at /kit/frontpage/. 302, because a real /frontpage/ page may come.
~~~

### concepts

Above `if (p === '/concepts' || p === '/concepts/') {`, lines 280 to 285 before the cut.

~~~js
// ── /concepts/ is the front page, 2026-10-13 ──────────────────────────
// *"when all is done, move concepts to frontpage"*: the concepts index is
// demo/index.html at / now, and the old index address forwards there. The
// index ONLY: a concept page's old /concepts/<group>/<number>/ address is a
// 404 and stays one (positron-concepts: no old address forwarding), so this
// matches the two exact paths and nothing under them. 302, as /frontpage.
~~~

### eccm

Above `if (p === '/eccm' || p.startsWith('/eccm/')) {`, lines 290 to 296 before the cut.

~~~js
// ── /eccm/* moved out, 2026-09-27 ──────────────────────────────────────
// The eccm demo lived under demo/eccm/ for two days and its URLs were
// handed over from here; the project is its own repository now and the
// site is https://eccm.positron.studio/ (plans went with it). Same path
// there, query kept, 301 because nothing is coming back. Assets are tried
// before the Worker, so this is reached only because the build no longer
// writes public/eccm/.
~~~
