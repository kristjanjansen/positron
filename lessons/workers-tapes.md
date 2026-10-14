# workers-tapes

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `workers/tapes/test.mjs`

### test-header

Above `import { resolveTape, rangeKey, originOk } from './worker.mjs';`, lines 1 to 24 before the cut.

~~~js
// workers/tapes/test.mjs: the proxy's two gates, with no network and no worker.
//
//   node workers/tapes/test.mjs
//
// 🔴 WHAT IT GRADES IS THE SCOPING, WHICH IS THE ONE CLAIM IN THAT FILE WORTH
// DOUBTING. "It caches" can be read off the source; "it is not an open relay"
// is a claim about every input anybody can send, and a proxy that answered for
// one URL it should have refused would be a bandwidth laundromat for whoever
// found it, on this account's egress.
//
// 🔴 A NAMED PROPORTION OF THIS FILE IS NEGATIVE CONTROLS, which is the
// convention in `demo/shell/*-test.mjs` and the reason to believe any of it.
// THIRTEEN of the nineteen are written so that a gate which had been removed
// would fail them, COUNTED rather than claimed. A validator that refuses
// everything is the same bug from the other side, so five of the other six are
// positive controls on inputs that must be accepted, and the REASON is asserted
// as well as the refusal.
//
// ⚠️ WHAT IT DOES NOT GRADE, SAID HERE RATHER THAN DISCOVERED LATER: nothing in
// this file opens a socket, so it says nothing about whether the cache really
// holds, whether Cloudflare honours `cacheTtl`, whether archive.org answers a
// Range, or whether a media element is happy with what comes back. Those need
// the worker deployed and a recording fetched, and the second half of that is
// the thing the standing external-source rule says not to do on a whim.
~~~

### join

Above `let pass = 0, fail = 0;`, lines 28 to 31 before the cut.

~~~js
// ⚠️ NO MIDDOT IN THE JOIN, WHICH IS CLAUDE.md'S RULE ABOUT THE CHARACTER THAT
// REPLACED THE EM DASH. `pedal-test.mjs` already prints its detail on plain
// spaces; `looper-test.mjs` does not, and this is a new file rather than a
// sweep of an old one.
~~~

### substring

Above `{`, lines 70 to 75 before the cut.

~~~js
// 🔴 THE SUBSTRING TRAP, AND IT IS THE REASON THIS FILE EXISTS AT ALL.
// `"Saharan uni II".includes("Saharan uni I")` is TRUE, and `Saharan uni I` was
// removed from the corpus on 2026-09-25 while `Saharan uni II` stayed. A
// resolver written on `includes` would hand out the SECOND recording for the
// id of the first, which is not an error anywhere: a working proxy, a playable
// file, and the wrong piece of music.
~~~

### reason

Above `{`, lines 99 to 101 before the cut.

~~~js
// ⚠️ THE REASON IS ASSERTED, NOT ONLY THE REFUSAL. `bay-test.mjs` does the same
// and for the same reason: a resolver that answered "no" to everything with one
// message would pass every line above.
~~~

### multipart

Above `ok('a range shape this does not understand refuses a key rather than inventing o`..., lines 119 to 121 before the cut.

~~~js
// ⚠️ A MULTIPART RANGE IS NOT CACHED RATHER THAN CACHED WRONG. `null` is the
// worker's signal to go straight upstream and skip the cache entirely, which is
// a slower answer and never a wrong one.
~~~

### suffix

Above `ok('a hostname that merely CONTAINS the site is not the site',`, lines 130 to 132 before the cut.

~~~js
// 🔴 THE SUBSTRING TRAP AGAIN, ONE LAYER DOWN. `endsWith('.positron.studio')`
// is the test rather than `includes('positron.studio')`, because
// `https://positron.studio.example.com` contains the site's name and is not it.
~~~

## `workers/tapes/worker.mjs`

### header

Above `/** The four hosts the 128 rows with a file actually live on, READ off`, lines 1 to 72 before the cut.

~~~js
// workers/tapes/worker.mjs: a read-through proxy for the recordings `/tapes/` plays.
//
//   GET /tape?id=<a corpus id>     the recording, with CORS headers on it
//   GET /                          one line saying what this is
//
// 🔴 WHY IT EXISTS, AND IT IS NOT A CONVENIENCE. Asked, verbatim: *"this
// recordin wil noot allow read its sound: make proxy"*. Every recording on
// `/tapes/` is on archive.org, which redirects a download to a storage node,
// and that node does not always send `access-control-allow-origin`. Without it
// `crossOrigin = 'anonymous'` is refused outright, so the page reopens the
// element WITHOUT the crossing: the tape plays and the audio graph is TAINTED,
// which means the analyser is allowed to run and is not allowed to return real
// numbers. The recording is audible and its sound cannot be read, so there is
// no waveform for that one. A same-origin hop is the only thing that fixes it,
// because "may I display this" and "may I read its samples" are different
// permissions and only the second one is missing.
//
// 🔴 IT IS GENERAL, NOT ONE FILE, AND THAT IS A DECISION RATHER THAN SCOPE
// CREEP. Which recording prompted the ask is NOT KNOWN: *"this recordin"*
// points at something that was on screen. Probing the twenty-three to find out
// which ones refuse is the exact thing the standing external-source rule
// forbids, so nothing here was measured against archive.org and nothing here
// may be. Any corpus row can be read through this, the page reaches for it only
// after a recording has actually refused, and no run of anything in this
// repository touches it. See `demo/tapes/index.html`'s `retryOpen`.
//
// 🔴 A PROXY DOES NOT REMOVE THE FETCH, IT MOVES IT FROM THE BROWSER TO HERE,
// SO IT HAS TO CACHE OR IT IS THE SAME LOAD ON SOMEBODY ELSE'S SERVER WITH AN
// EXTRA HOP. Three layers, each covering the one before's miss, which is the
// arrangement `workers/view/src/index.js` already uses for the archive images:
//
//   · the BROWSER, through `cache-control: public, max-age=2592000, immutable`
//   · this COLO, through `caches.default`, keyed on the upstream URL plus the
//     range asked for. ⚠️ `caches.default` IS PER COLO, so a listener in
//     another region misses it entirely, which is what the third layer is for.
//   · CLOUDFLARE, through `cf: { cacheEverything: true, cacheTtl: 2592000 }` on
//     the subrequest, so a colo miss still lands in Cloudflare's own cache
//     rather than on archive.org.
//
// THIRTY DAYS on all three. These are archival recordings of work finished in
// the 1960s and 70s, deposited years ago and never edited: a URL that answers
// today answers the same bytes next month, and the only thing a short TTL would
// buy is more requests to a public archive. ⚠️ THE CONSEQUENCE IS THE POINT:
// past the first listen, one recording costs archive.org one GET per range per
// colo per thirty days, whoever is listening and however many times.
//
// 🔴 AND IT IS NOT AN OPEN RELAY. An unbounded URL parameter would make this a
// bandwidth laundromat for whoever finds it, and the account's egress is the
// project's. `workers/shout/worker.mjs` refuses the same thing for the same
// reason. Two gates, and the FIRST is the load-bearing one:
//
//   1. THE CORPUS. The caller names an `id`, never a URL. The id has to be a
//      row in `corpus.json` that carries a `file`, and the answer is that row's
//      own URL. There is no shape of input that reaches a URL the corpus does
//      not already hold.
//   2. THE HOST. That URL's host has to be one of the four the corpus actually
//      uses. ⚠️ IT IS A SECOND TEST AND NOT A RESTATEMENT OF THE FIRST: the
//      corpus is a generated file that grows rows from new sources, and a row
//      pointing somewhere nobody weighed should not become proxyable by being
//      committed.
//
// ⚠️ AN `Origin` ALLOWLIST IS NOT SECURITY AND IS NOT DESCRIBED AS ONE HERE. A
// browser sets that header and a page cannot forge it, so it stops a stray tab
// on another site; anything that is not a browser sends whatever it likes. What
// it buys is that the accidents cannot happen. The corpus gate above is what
// bounds the damage, because it bounds the SET OF URLS rather than the callers.
//
// ⚠️ THE CORPUS IS READ OFF THE SITE RATHER THAN BUNDLED INTO THIS WORKER, so
// it cannot drift from the page. `demo/fake-tapes.mjs` reads its paths off the
// same file for the same reason, written down there as *"so it cannot drift
// from the page"*. A copy compiled in here would be right on the day it was
// deployed and quietly wrong after the next corpus rebuild.
~~~

### hosts

Above `const HOSTS = new Set([`, lines 74 to 75 before the cut.

~~~js
/** The four hosts the 128 rows with a file actually live on, READ off
 *  `corpus.json` on 2026-09-25 rather than recalled. */
~~~

### origin-ok

Above `export const originOk = (o) => {`, lines 92 to 99 before the cut.

~~~js
/**
 * Who may read the answer in a browser.
 *
 * ⚠️ THE LOOPBACK ENTRIES ARE FOR A DEVELOPMENT SERVER AND THEY COST NOTHING
 * HERE, because a page on `127.0.0.1` can only ever be one somebody is running
 * on their own machine. The harness never reaches this worker at all: pointed
 * at `demo/fake-tapes.mjs` the page disables the proxy outright.
 */
~~~

### vary

Above `function cors(origin) {`, lines 111 to 114 before the cut.

~~~js
/**
 * ⚠️ `vary: origin` OR A CACHE HANDS ONE CALLER'S PERMISSION TO ANOTHER. The
 * echo is per caller, so the entry it is attached to has to say so.
 */
~~~

### expose

Above `h['access-control-expose-headers'] =`, lines 119 to 122 before the cut.

~~~js
// 🔴 WITHOUT `expose-headers` A BROWSER SEES THE RESPONSE AND NOT ONE HEADER
// OF IT, and a page that cannot read `content-length` or `content-range`
// cannot draw a scrub bar for a recording. `workers/shout/worker.mjs`
// carries the same line for the same reason.
~~~

### corpus

Above `async function corpusRows(env, ctx) {`, lines 134 to 140 before the cut.

~~~js
/**
 * The corpus, through the cache.
 *
 * ⚠️ IT IS A SUBREQUEST TO OUR OWN ORIGIN AND IT IS CACHED TWICE, so the cost of
 * being drift-free is one conditional request an hour per colo rather than one
 * per listener.
 */
~~~

### resolve

Above `export function resolveTape(rows, id) {`, lines 152 to 159 before the cut.

~~~js
/**
 * Turn an id into the URL the corpus says that recording lives at, or a reason.
 *
 * 🔴 MATCHED WITH `===` ON THE WHOLE ID, NEVER ON A SUBSTRING. This repository's
 * standing rule, from three bugs in one day where `BUILD` matched inside
 * `REBUILD`, and the corpus is full of ids that contain each other: `Saharan
 * uni I` is a substring of `Saharan uni II`.
 */
~~~

### name-host

Above `return { why: '${u.hostname} is not a host this proxy fetches from' };`, lines 168 to 169 before the cut.

~~~js
// ⚠️ IT NAMES THE HOST RATHER THAN THE LIST. A list of accepted hosts in an
// error body is a list of hosts to try.
~~~

### range-key

Above `export function rangeKey(header) {`, lines 175 to 179 before the cut.

~~~js
/**
 * ⚠️ ONE NORMALISED RANGE IN THE CACHE KEY, NOT THE RAW HEADER. A media element
 * asks for a small set of ranges and writes them in more than one spelling, and
 * two spellings of one request must not be two entries and two fetches.
 */
~~~

### head

Above `return text('GET or HEAD\n', 405, origin, { allow: 'GET, HEAD, OPTIONS' });`, lines 215 to 216 before the cut.

~~~js
// ⚠️ HEAD AS WELL AS GET. A GET-only guard sends a HEAD to the 404, which
// is the shape of bug that survives being tested.
~~~

### cache-key

Above `const key = rk === null ? null`, lines 231 to 233 before the cut.

~~~js
// ⚠️ THE KEY IS NOT THE INCOMING REQUEST. A caller may spell the id with any
// escaping and send any order of parameters, and all of those are one entry:
// the upstream URL and the range decide the bytes, so they are the key.
~~~

### 206

Above `if (up.status !== 200 && up.status !== 206) {`, lines 255 to 256 before the cut.

~~~js
// 🔴 NOT `!up.ok`. A RANGE REQUEST ANSWERS 206, which is not `ok` on some
// readings and is exactly what a working seek looks like.
~~~

### whose

Above `return text('the archive answered ${up.status} for ${got.title || id}\n', 502, o`..., lines 258 to 259 before the cut.

~~~js
// ⚠️ IT SAYS WHOSE REFUSAL IT IS. A bare status here reads as this worker
// being broken, and the two have completely different fixes.
~~~

### clone

Above `ctx.waitUntil(cache.put(key, body.clone()));`, lines 275 to 277 before the cut.

~~~js
// ⚠️ THE CACHE GETS A CLONE AND THE CALLER GETS THE STREAM, so the bytes
// leave as they arrive rather than after the whole recording has been
// read into this isolate.
~~~

### dress

Above `function dress(res, origin, how) {`, lines 284 to 288 before the cut.

~~~js
/**
 * ⚠️ A RESPONSE OUT OF THE CACHE API HAS IMMUTABLE HEADERS and `.set()` on one
 * throws a TypeError rather than failing quietly, so the CORS echo is put on a
 * rebuilt response rather than on the one that came back.
 */
~~~
