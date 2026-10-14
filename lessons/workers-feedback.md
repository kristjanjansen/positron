# workers-feedback

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `workers/feedback/src/index.js`

### header

Above `import { json as baseJson, OPEN, preflight, callerIp, keyMatches } from '../../_`..., lines 1 to 50 before the cut.

~~~js
/**
 * positron-feedback — what a visitor typed, kept. feedback.positron.studio
 *
 * Every shelled page carries a button beside its title. It opens a box, you
 * write a few lines, and the lines travel the same way everything else in this
 * project travels: over the verbatim relay, into a room of their own, to a
 * recorder that joined that room as an ordinary socket. This worker is the
 * recorder and the reader.
 *
 *   POST /arm                          wake the recorder into this origin's room
 *   GET  /feedback?room=&last=&slug=   what is stored, as JSON (or text)
 *   GET  /stats?room=
 *   POST /clear?room=                  needs FEEDBACK_KEY, which is unset by default
 *
 * 🔴 THE ONE THING THIS FILE EXISTS TO GET RIGHT: A SUITE RUN MUST NOT BE ABLE
 * TO WRITE HERE. `demo/verify.mjs` presses every control on every page on every
 * run, and CLAUDE.md records at length what happened the last time a shared
 * resource sat behind forty partitioned ones — one FCM topic, and every run of
 * the suite sent two real notifications to every real subscriber for a day. The
 * lesson it drew is the one applied here: **an allowlist of ONE, never a test
 * for things that LOOK like tests, because the default has to be silence.**
 *
 * So there are two rooms and the SERVER picks which one, from a header a page
 * cannot forge:
 *
 *   Origin: https://positron.studio   ->  room `feedback`      the real one
 *   anything else, or no Origin       ->  room `feedback-dev`  a sandbox
 *
 * A harness runs on 127.0.0.1, so it resolves to the sandbox and its writes
 * land in a different Durable Object that the real table never reads. `curl`
 * sends no Origin at all and gets the sandbox too. There is no parameter, body
 * field or path that can move a write into `feedback` from anywhere else: the
 * room is computed here, from `request.headers.get('origin')`, and nowhere
 * else. ⚠️ The page derives the same room from `location.origin` and CHECKS the
 * two agree, because a page writing into a room nobody is recording is the
 * silent failure this design is trying not to have.
 *
 * ⚠️ READS ARE NOT GUARDED and are not meant to be. `/feedback` takes an
 * explicit `room` so an agent with `curl` — which has no Origin — can read the
 * real one. The page is unlisted, not secret: a token pasted into a public page
 * is a published token, which is the same argument that made the relay
 * tokenless. Nothing here is worth more protection than that buys.
 *
 * What is NOT stored, deliberately: no IP address with a note (the recorder
 * hears notes over the relay; /arm keeps a 4 byte hash of the caller's address
 * for one hour to count arms, apart from any note), no user agent, no
 * screen size, no language, no cookie and no lasting visitor id. `sender` is
 * the wire's per-CONNECTION id, which dies with the socket. Nobody typed any of
 * the rest, and a page should keep what a visitor typed.
 */
~~~

### allowlist

Above `const LIVE_ORIGIN = 'https://positron.studio';`, lines 57 to 57 before the cut.

~~~js
// 🔴 THE ALLOWLIST. One entry, exact match, no prefix test, no pattern.
~~~

### credit

Above `const CREDIT_MS = 60 * 1000;`, lines 76 to 80 before the cut.

~~~js
// A note is kept only against an arm. /arm is an HTTP request, so its Origin
// and cf-connecting-ip are set by the browser and by Cloudflare, not by the
// sender; each arm grants one note for CREDIT_MS, and arms are counted per
// address (a 4 byte hash, kept one hour) and per room. A note's own `from` and
// `origin` fields are claims and limit nothing.
~~~

### arm

Above `async #arm(room) {`, lines 104 to 108 before the cut.

~~~js
/**
 * Join the room and do not return until the socket is open, so a caller that
 * sends the moment this answers cannot race its own message into a room the
 * recorder has not reached yet. Same reason positron-store awaits it.
 */
~~~

### sent-stamp

Above `Number(m.sent ?? m.at) || Date.now(),`, lines 169 to 169 before the cut.

~~~js
// the send stamp: `sent` since 2026-10-04, `at` from an older page
~~~

### noindex

Above `const NOINDEX = 'noindex, nofollow';`, lines 283 to 293 before the cut.

~~~js
// ── not ready to be found ───────────────────────────────────────────────────
// 🔴 THIS HOST ANSWERS 200 JSON AT `/` AND A SEARCH ENGINE WILL KEEP THAT.
// The header of this file calls the service unlisted rather than secret, and
// unlisted is exactly the thing an index undoes: it turns a URL nobody has into
// a result anybody can find. positron.studio itself is noindexed as of
// 2026-09-16 and this host is covered the same way.
//
// ⚠️ THE WRAPPER IS THE POINT, NOT THE HELPER. Most of the traffic here is
// `/feedback` and `/stats`, and both return a Durable Object's response
// verbatim without ever passing through `json()`. Marking the helper would have
// missed the majority of real requests while looking like a fix.
~~~

### immutable

Above `function marked(res) {`, lines 305 to 305 before the cut.

~~~js
/** ⚠️ A DO RESPONSE HAS IMMUTABLE HEADERS and a 204 must not be given a body. */
~~~

### room-here

Above `if (url.pathname === '/arm' && request.method === 'POST') {`, lines 345 to 346 before the cut.

~~~js
// 🔴 THE ROOM IS DECIDED HERE AND NOWHERE ELSE, from a header a page cannot
// forge. No query parameter reaches this line and no body is read.
~~~

### clear-key

Above `if (url.pathname === '/clear' && request.method === 'POST') {`, lines 357 to 358 before the cut.

~~~js
// Clearing is the one destructive act, so it needs a secret — and with no
// secret set it refuses rather than allows. `wrangler secret put FEEDBACK_KEY`.
~~~
