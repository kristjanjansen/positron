# workers-shout

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `workers/shout/deploy.mjs`

### deploy

Above `import { spawnSync } from 'node:child_process';`, lines 1 to 16 before the cut.

~~~js
// workers/shout/deploy.mjs — ship the relay, from a directory wrangler is happy in.
//
// 🔴 WHY THIS EXISTS AND WHY IT IS NOT JUST `npx wrangler deploy`. CLAUDE.md
// says a `.env` in the cwd shadows machine OAuth, and the documented fix is to
// deploy from a directory without one or to unset the two variables. MEASURED
// 2026-09-16: running `npx wrangler deploy -c workers/shout/wrangler.jsonc`
// from the repo root failed with `Authentication error [code: 10000]` while
// announcing it was using `CF_API_TOKEN` from the environment, and the same
// deploy through `workers/view/deploy.mjs` had succeeded minutes earlier. The
// difference is the working directory and the cleaned environment, both of
// which that file already gets right.
//
// ⚠️ THERE IS NO BUILD STEP HERE, so there is no build/upload interlock either.
// `worker.mjs` is the deployed artefact: what is on disk is what ships, and the
// race `workers/view/deploy.mjs` guards against (two agents building into one
// `public/`) has no equivalent.
~~~

## `workers/shout/tee-test.mjs`

### tee-test

Above `import { startStation } from '../../demo/fake-station.mjs';`, lines 1 to 4 before the cut.

~~~js
// node workers/shout/tee-test.mjs
// The tee against demo/fake-station.mjs: listeners arriving together must open
// one upstream connection. Any fetch to a host other than 127.0.0.1 throws, so
// this test cannot reach a broadcaster even if a station URL leaks into it.
~~~

## `workers/shout/worker.mjs`

### header

Above `import { OPEN } from '../_lib/http.mjs';`, lines 1 to 18 before the cut.

~~~js
// positron-shout — an Icecast/SHOUTcast stream, relayed through Cloudflare.
//
// WHY A RELAY AT ALL. The origin (Icecast 2.4.4 at icecast.err.ee) sends NO
// `access-control-allow-origin`, so a browser can put it in an <audio> element
// and nothing else: no fetch, no WebAudio graph, no reading `icy-metaint`, no
// measuring anything. `<audio src>` is a no-cors load — it plays and stays
// opaque. The relay's entire job is to hand the same bytes back with CORS on
// them, which is what turns a radio stream into something a page can measure.
//
// NOT AN OPEN PROXY. STATIONS is an allowlist; anything else is 404. An
// unbounded URL parameter here would make this worker a bandwidth laundromat
// for whoever finds it, and the account's egress is the project's.
//
// The body is passed through UNTOUCHED and UNBUFFERED: `new Response(up.body)`
// hands Cloudflare the upstream ReadableStream, so bytes leave as they arrive.
// Anything that reads the stream here (a TransformStream that inspects ICY
// metadata, say) would add a hop of latency to every byte for no gain — the
// metadata is already in the frames the client parses.
~~~

### stations

Above `const IDA = 'https://broadcast.idaidaida.net/listen';`, lines 24 to 44 before the cut.

~~~js
/**
 * id -> the FULL upstream URL, allowlisted.
 *
 * ⚠️ THIS WAS `id -> path` AGAINST ONE `ORIGIN` CONSTANT, and that held exactly
 * as long as every station was ERR's. A single origin is a shared mutable
 * global of the same family as a fixed port: it is a property of the first
 * caller that gets silently imposed on the second. Full URLs cost one repeated
 * hostname and let a station live anywhere.
 *
 * 🔴 `radio` IS PLAIN HTTP ON PORT 8001, AND THAT IS WHY IT IS HERE.
 * Their Icecast sends no `access-control-allow-origin` AND terminates no TLS,
 * so an HTTPS page cannot play it at all — not "cannot measure it", cannot
 * play it: the browser refuses the mixed-content load before any CORS question
 * is asked. This relay is the only way that stream reaches a browser on
 * positron.studio. MEASURED DIRECT 2026-09-14: Icecast 2.4.4, `audio/mpeg`,
 * 128 kbit/s 44.1 kHz stereo, `icy-name: Radio 1965`, `icy-metaint: 16000`,
 * mean volume -20.4 dB against a synthesised-silence control at -91.0 dB.
 *
 * ⚠️ It is somebody else's stream on this account's egress, which is the thing
 * the allowlist above exists to bound. One named mount, added on purpose.
 */
~~~

### radio1965

Above `radio1965: 'http://live.uuu.ee:8001/radio1965',`, lines 48 to 72 before the cut.

~~~js
/**
 * 🔴 RADIO 1965 IS BACK, 2026-09-16, ON INSTRUCTION AND ON THE SAME CONDITION
 * AS IDA: *"bring back radio65 stream as last. we are single user
 * connected?"*. The answer is yes, and it is read off the code below rather
 * than remembered: `Mount` holds ONE upstream connection per station and
 * copies it to every subscriber, so `upstreamConnections` is 1 however many
 * people are listening. `GET /tee/radio1965` reports it.
 *
 * WHAT IT WAS REMOVED FOR, 2026-09-15: the operator of the uuu.ee server
 * found roughly 100 concurrent clients against their limit, traced to
 * positron.studio. Ours. THE LOAD WAS THE CHECKS, NOT THE VISITORS: every
 * `verify.mjs radio` and every `verify-gl.mjs videoradio` opened a live mount,
 * dozens of times in one evening. `demo/fake-station.mjs` ended that half of
 * it: the suite now runs against a stand-in and opens nothing of anybody's.
 *
 * ⚠️ THE OPERATOR HAS NOT BEEN RE-ASKED, and that is worth saying rather than
 * implying consent from a mechanism. What changed is the SIZE of the claim,
 * not their permission.
 * ⚠️ AND IT IS LAST IN THE PAGE'S LIST, which is the half that actually
 * caused the damage: a page opens the first entry it finds, so being at the
 * front is what put every visitor and every run on one volunteer's server.
 * ⚠️ IT IS PLAIN HTTP ON PORT 8001 AND NEVER TLS. That is the whole reason
 * this worker exists for this mount: a page on https cannot fetch it directly.
 */
// Estonian Centre of Contemporary Music's community station (uuu.ee).
~~~

### ida

Above `'ida-tallinn': '${IDA}/tallinn/stream',`, lines 80 to 105 before the cut.

~~~js
/**
 * 🔴 IDA IS BACK, 2026-09-16, ON INSTRUCTION AND ON ONE CONDITION THE USER
 * SET THEMSELVES: *"bring ida's back to radio (if single listener)"*.
 *
 * WHAT IT WAS REMOVED FOR, 2026-09-15: their operator reported roughly 100
 * concurrent clients against their limit, traced to positron.studio. That was
 * us. Two mounts had been moved to the FRONT of the station list an hour
 * before, which made them the default every visitor and every harness run
 * opens, and at 320 kbit/s they are 2.5x the weight of any other mount here.
 *
 * WHAT CHANGED: `Mount` below. This worker opened a fresh `fetch(upstream)`
 * per request when that happened, so a hundred browsers were a hundred
 * clients at the broadcaster. It now holds ONE connection per mount in a
 * Durable Object addressed by `idFromName(station)` and copies the bytes to
 * every subscriber, so the number the operator counts is one however many
 * people are listening, plus one per harness run that overlaps it.
 * `GET /tee/ida-tallinn` reports `upstreamConnections`, and it must read 1.
 *
 * ⚠️ THE OPERATOR HAS NOT BEEN RE-ASKED. That is worth saying plainly rather
 * than implying consent from a mechanism: what has changed is the size of the
 * claim, not their permission. `hello@idaidaida.net` still costs one email,
 * and this file already recommends it further down.
 * ⚠️ AND THEY GO AT THE BACK OF THE LIST, WHICH IS THE OTHER HALF. The damage
 * was caused by defaulting to them, not by carrying them: a page opens the
 * first entry it finds. Nothing here may move them forward.
 */
~~~

### rec-headers

Above `'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag',`, lines 116 to 118 before the cut.

~~~js
// ⚠️ THE RECORDINGS NEED THESE AND THE LIVE MOUNTS NEVER WILL. A stream has
// no length and no position; a recording has both, and a page that cannot
// read `content-length` or `content-range` cannot draw a scrub bar for one.
~~~

### rec

Above `const REC_BASE = 'https://eccm.ee/radio/streams/';`, lines 123 to 152 before the cut.

~~~js
/**
 * Health answers, collapsed.
 *
 * ⚠️ PER ISOLATE, WHICH IS ENOUGH AND IS NOT A GUARANTEE. Workers isolates come
 * and go, so this does not bound the rate globally — what it does is collapse a
 * BURST, which is the shape the traffic actually had: a harness run and every
 * open tab asking within the same few seconds. A hard global bound would need a
 * Durable Object, and that is worth doing if this is not enough.
 */
/**
 * 🔴 THE SAME STATION'S PAST, WHICH DID NOT EXIST UNTIL THIS WEEK. Their server
 * now records a broadcast when the broadcaster asks it to: Icecast's on-connect
 * hook starts `ffmpeg -c copy` against the mount, on-disconnect stops it and
 * rsyncs the mp3 to eccm.ee, and a `streamrecording` event replaces the
 * `livestream` one with an https URL. So a live station finally has a past, and
 * it is an ordinary file with byte ranges.
 *
 * ⚠️ AND IT HAS THE SAME DEFECT AS THE MOUNT: MEASURED 2026-09-15, a recording
 * answers 200 and honours a Range with a 206, and sends NO
 * `access-control-allow-origin`. A page can put one in an <audio> element and
 * read nothing about it, which is the whole reason this worker exists. Their
 * events API is fine on its own (`live.uuu.ee/radio/api/events` answers
 * with `allow-origin: *`), so only the audio needs carrying.
 *
 * 🔴 A PATTERN, NOT A PATH PARAMETER, and for the same reason `STATIONS` is an
 * allowlist. `/rec/?url=…` would make this an open proxy for anything on
 * eccm.ee; the names their hook writes are a slug of at most twenty characters
 * and a datestamp, so that is exactly what is accepted and nothing else. No
 * slashes, no dots beyond the one, no traversal to reason about.
 */
~~~

### env

Above `async fetch(req, env) {`, lines 170 to 173 before the cut.

~~~js
// ⚠️ `env` IS TAKEN NOW, FOR THE DURABLE OBJECT BINDING. It was omitted while
// this worker had no state at all, and a handler that silently reads
// `undefined.MOUNT` is a 500 on every listen with nothing in the log saying
// which line.
~~~

### hosts

Above `return Response.json({`, lines 188 to 189 before the cut.

~~~js
// The upstream HOST per station, not one `origin` — there is no longer a
// single one, and reporting a stale constant is worse than reporting none.
~~~

### health

Above `if (url.pathname === '/health') {`, lines 196 to 217 before the cut.

~~~js
/**
 * 🔴 IS EACH STATION UP — ANSWERED WITH A 200 WHATEVER THE ANSWER IS.
 *
 * A page cannot ask this by fetching the mount, because a dead mount answers
 * 502 and **the browser logs that to the console**. There is no way to
 * suppress it from script, so a page that probes before it plays trips its
 * own "no console errors" check, and a visitor watching a phone sees a red
 * line about a station being down rather than the page handling it. The
 * question belongs here anyway: this is the thing that knows.
 *
 * ⚠️ CANCEL EVERY BODY. These are ENDLESS streams — a probe that reads the
 * status line and walks away leaves one socket per station open on the
 * origin for as long as the runtime keeps this invocation, which turns a
 * health check into a load generator against a volunteer's Icecast.
 *
 * ⚠️ IT SAID "NEVER CACHED" AND THAT WAS THE MISTAKE. The reasoning — a
 * cached answer about a live stream is wrong in the confident direction —
 * is true and was the wrong thing to optimise for. Twenty seconds of
 * staleness about a station that has been up for hours costs nothing; six
 * upstream connections per caller cost the broadcaster, and they stopped
 * answering. Freshness is a preference; their bandwidth is not ours.
 */
~~~

### fan-out

Above `const only = (url.searchParams.get('only') || '')`, lines 219 to 231 before the cut.

~~~js
// 🔴 THIS FANS OUT TO EVERY MOUNT, AND THAT MADE IT A LOAD GENERATOR.
// One innocuous-looking request opened SIX upstream connections, the page
// polled it every 30 s per open tab, and every harness run called it —
// forty runs in an afternoon. MEASURED afterwards: three ERR mounts began
// answering this Worker **502 in 9 ms** while the same mounts served a
// laptop 200, and nine milliseconds is too fast to have reached Estonia.
// That is a refusal at the first hop, and it was earned.
//
// LESSONS #50 is this exact shape — *"the heavy request had no `fetch` in
// it"* — and its rule applies: this is a public broadcaster, not a service
// we pay for. So: answers are CACHED for `HEALTH_TTL_MS`, a caller may ask
// about only the stations it needs, and a refusal is not answered with
// another request.
~~~

### down

Above `return [k, { up: false, status: 0, ms: Date.now() - t, why: String(e).slice(0, 8`..., lines 255 to 256 before the cut.

~~~js
// A throw here is the origin refusing or timing out, which is a
// station that is down — reported as such, not as an error page.
~~~

### range

Above `const range = req.headers.get('range');`, lines 272 to 276 before the cut.

~~~js
// ⚠️ THE RANGE HEADER IS FORWARDED, AND THAT IS THE WHOLE POINT OF THIS
// BRANCH BEING SEPARATE. Seeking in an hour of audio is a Range request;
// swallowing it would turn every scrub into a fresh download from the
// beginning, which on a phone is the difference between a transport bar
// and a progress bar.
~~~

### 206

Above `if (up.status >= 400) {`, lines 286 to 288 before the cut.

~~~js
// 🔴 NOT `!up.ok`. A Range request answers 206, which is not `ok` on some
// readings and is exactly what a working seek looks like. Guarding on
// `ok` here would have made every scrub report the origin as broken.
~~~

### tee

Above `if (url.pathname.startsWith('/tee/')) {`, lines 305 to 309 before the cut.

~~~js
/**
 * `GET /tee/<id>` — what the tee is doing for one mount: how many listeners
 * it is serving and how many connections it is holding upstream. The second
 * number is the one that matters and it must be 1.
 */
~~~

### bytes

Above `const bytes = Math.min(Number(url.searchParams.get('bytes')) || 0, 4 << 20);`, lines 322 to 325 before the cut.

~~~js
// `?bytes=N` closes the connection after N bytes. A radio stream never
// ends, so without a bound every probe — the demo's, the harness's — has to
// decide when to hang up, and a harness that forgets leaves a socket
// holding the origin open for the length of the run.
~~~

### through-tee

Above `if (req.method !== 'HEAD') {`, lines 328 to 343 before the cut.

~~~js
/**
 * 🔴 THROUGH THE TEE, WHICH IS ONE CONNECTION TO THE BROADCASTER FOR ALL OF
 * US. `idFromName(id)` is the whole mechanism: a Durable Object addressed
 * by name is the same object everywhere, so every listener on every machine
 * arrives at one place and that place holds one socket open. See `Mount`.
 *
 * ⚠️ A HEAD STILL GOES DIRECT. It is a health question, it wants the
 * origin's own answer, and it hangs up before a frame of audio is paid for;
 * putting it through the object would open a broadcast to answer a
 * question about whether there is one. The `/rec/` recordings are files and
 * were never in this path at all.
 * ⚠️ AND `?direct=1` IS DELIBERATELY NOT OFFERED. An escape hatch back to a
 * connection per client is the defect with a flag on it, and the one thing
 * this object exists to make impossible is that somebody re-enables it in a
 * hurry.
 */
~~~

### get-upstream

Above `const up = await fetch(upstream, {`, lines 357 to 362 before the cut.

~~~js
// ALWAYS GET UPSTREAM, even for a HEAD. Icecast 2.4.4 answers HEAD with
// `400 Bad Request` — measured against every mount — so forwarding the
// method verbatim made the relay report a healthy station as a 502, and
// every uptime checker that HEADs a URL would have believed it. The relay
// does the GET, keeps the headers, and cancels the body before a frame of
// audio is paid for.
~~~

### no-cache

Above `cf: { cacheEverything: false, cacheTtl: 0 },`, lines 372 to 373 before the cut.

~~~js
// The origin is Icecast: an infinite body, `Connection: Close`, HTTP/1.0.
// No cache, ever — a cached radio stream is a contradiction.
~~~

### content-type

Above `const upType = up.headers.get('content-type');`, lines 382 to 388 before the cut.

~~~js
// 🔴 THE CONTENT-TYPE IS FORWARDED, NEVER INVENTED. It used to fall back to
// `audio/mpeg`, which was harmless while every mount here was MP3 and is a
// trap now that two of them are AAC: the page reads its frame scanner off
// this header, and a scanner pointed at the wrong framing finds NOTHING
// rather than finding rubbish. A default would turn a missing header into a
// confident wrong answer, and the page handles an ABSENT one correctly by
// looking at the bytes.
~~~

### cap

Above `function cap(body, limit) {`, lines 408 to 408 before the cut.

~~~js
/** Pass bytes through until `limit`, then close — the stream itself never will. */
~~~

### mount

Above `const METAINT = 16000;`, lines 423 to 452 before the cut.

~~~js
/**
 * 🔴 ONE UPSTREAM CONNECTION PER MOUNT, FANNED OUT TO EVERY LISTENER.
 *
 * THIS IS THE FIX FOR THE THING ERR REPORTED. Until 2026-09-16 this relay was a
 * pass-through: every request did its own `fetch(upstream)` and handed the body
 * straight back, so **N browsers were N listeners at the broadcaster**, plus one
 * per harness tab and one per orphaned Chrome. On 2026-09-15 that reached about
 * a hundred concurrent clients against one operator's limit, and on 2026-09-16
 * ERR said the same traffic was corrupting their public listener statistics,
 * which is a fact about their funding rather than about their bandwidth.
 *
 * A Durable Object is addressed by NAME, and `idFromName(station)` gives every
 * mount exactly one object in the world. That object opens the origin once and
 * copies the bytes to everybody. Ten listeners, a hundred listeners and a
 * harness are one listener upstream.
 *
 * ⚠️ THE ICY METADATA IS STRIPPED AND RE-INSERTED PER SUBSCRIBER, AND THAT IS
 * NOT A FLOURISH. Icecast interleaves a metadata block every `icy-metaint`
 * bytes COUNTED FROM THE FIRST BYTE THE CLIENT RECEIVED. A tee hands a late
 * joiner bytes from the middle of the origin's stream, so its byte 0 is not the
 * origin's byte 0 and every block it expects lands in the wrong place: it would
 * read audio as a length byte and then delete that many bytes of sound. So the
 * object parses the blocks out once, keeps the title, and writes fresh blocks
 * into each subscriber's own stream at that subscriber's own offset. Every
 * listener gets a well-formed ICY stream that begins where they began.
 *
 * ⚠️ A LATE JOINER STARTS MID-FRAME AND THAT IS FINE. An MP3 decoder scans for
 * the next sync word, which is what `demo/shell/mp3-frames.mjs` already does and
 * what every media element does. The first few milliseconds are discarded.
 */
~~~

### upstreams

Above `upstreamConnections: this.upstreams,`, lines 487 to 490 before the cut.

~~~js
// 🔴 THE NUMBER THE WHOLE OBJECT EXISTS TO MAKE TRUE. One connection
// upstream however many are downstream; anything but 1 here with
// listeners on is the tee not working.
// Counted per dial and per pump end, so a duplicate dial shows as 2.
~~~

### own-bytes

Above `const sub = { ctrl: null, sent: 0, behind: 0, cap, icy: wantIcy, said: '' };`, lines 504 to 506 before the cut.

~~~js
// ⚠️ EACH SUBSCRIBER COUNTS ITS OWN BYTES, because the metadata blocks are
// written at ITS offset and not at the origin's. `sent` is why a listener
// who joined a minute late still gets a block exactly 16000 bytes in.
~~~

### icy-always

Above `'Icy-MetaData': '1',`, lines 536 to 540 before the cut.

~~~js
// 🔴 ALWAYS ASKED FOR, WHATEVER THE CLIENT WANTED. There is one
// upstream for everybody now, so it cannot be tailored to the first
// caller: it is parsed out here and written back per subscriber. The
// old pass-through forwarded the client's own preference, which was
// correct exactly while each client had its own connection.
~~~

### pump

Above `async pump() {`, lines 564 to 569 before the cut.

~~~js
/**
 * Read the origin forever and copy to everyone.
 *
 * ⚠️ NOT AWAITED BY `fetch`. A pump that the request awaited would hold the
 * response open until the radio station ends, which it never does.
 */
~~~

### empty-title

Above `if (m) this.title = m[1];`, lines 621 to 623 before the cut.

~~~js
// ⚠️ AN EMPTY TITLE IS A TITLE THAT WENT AWAY, so it is recorded rather
// than ignored: a page that keeps showing the last song of the last
// programme is worse than one showing nothing.
~~~

### behind

Above `if (sub.ctrl.desiredSize !== null && sub.ctrl.desiredSize < -MAX_BEHIND) {`, lines 647 to 649 before the cut.

~~~js
// ⚠️ `desiredSize` GOES NEGATIVE WHEN A SOCKET IS NOT DRAINING, and it
// is the only backpressure signal there is here. Radio has no rewind,
// so a listener this far behind is dropped rather than buffered for.
~~~

### linger

Above `if (this.subs.size === 0 && this.reader && !this.linger) {`, lines 674 to 679 before the cut.

~~~js
// 🔴 THE LAST LISTENER LEAVING MUST EVENTUALLY CLOSE THE ORIGIN, or the tee
// becomes a permanent listener nobody is hearing, which is WORSE than the
// pass-through it replaced: one connection held for ever against N held
// only while somebody was listening. The linger is because a page reload is
// two seconds of nobody, and hanging up on every one of those is more
// connections to the broadcaster rather than fewer.
~~~
