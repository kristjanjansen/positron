# workers-relay

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `workers/relay/src/index.js`

### header

Above `// A 4 KiB roof was inherited from elektron-jam, where it was right: jam relayed`, lines 1 to 34 before the cut.

~~~js
/**
 * positron-ws — the TOKENLESS verbatim WS relay. ws.positron.studio
 *
 * elektron-jam does the same job but is token-gated, and a token pasted into a
 * public page is a published token — which is exactly why the looper's
 * cross-device rooms have been a deliberate gap. This worker closes it by
 * removing the secret rather than publishing one, and paying for that with
 * limits instead.
 *
 *   wss://ws.positron.studio/room/<name>/ws
 *   GET  https://ws.positron.studio/room/<name>/stats
 *
 * What it keeps from elektron-jam, because these are load-bearing:
 *   · VERBATIM. No parse, no storage, no envelope. Text or binary, relayed as
 *     received to EVERY socket in the room INCLUDING the sender — that echo is
 *     the loopback-through-server ordering point, not an accident.
 *   · NEVER RE-STAMP. Sender stamps live inside the payload. A relay's idea of
 *     "now" measured +/-50 ms of bias, which at a 2 s loop is 2.5 % of the
 *     circle and an audible flam.
 *   · ping -> pong via hibernation autoresponse, so an RTT probe never wakes
 *     the DO and measures pure network. Verified: a peer in the same room never
 *     sees the ping, because the runtime answers it and the DO stays asleep.
 *
 * What it adds, because there is no longer a token in front of it:
 *   · a 256 KiB message roof and a BYTES-PER-SECOND budget (fan-out is the cost)
 *   · at most MAX_SOCKETS in a room
 *   · a per-socket token bucket; a socket that keeps overrunning is closed
 *   · room names constrained, so the DO namespace cannot be sprayed with junk
 *
 * Residual risk, stated rather than hidden: nothing here caps how many DISTINCT
 * rooms one client can open, so a determined bot can still create rooms. That
 * needs an account-wide limiter DO or Cloudflare rate-limiting rules in front,
 * and is deliberately not pretended-to here.
 */
~~~

### limits

Above `import { json, OPEN, keyMatches } from '../../_lib/http.mjs';`, lines 36 to 76 before the cut.

~~~js
// A 4 KiB roof was inherited from elektron-jam, where it was right: jam relayed
// tiny latency probes. It is WRONG here. peer.mjs publishes a committed layer as
// ONE message carrying the material — every note row of every layer, ~98 bytes
// each. Measured: 2 layers x 16 notes is ~7 KB, 8 x 32 is ~52 KB. A 4 KiB roof
// passes the tiny live-note plane and silently eats the loop plane, which is the
// one thing cross-device looping needs.
//
// The real cost is not message size, it is FAN-OUT AMPLIFICATION: one message
// goes to every socket in the room, so N sockets multiply egress by N. So the
// budget is bytes-per-second, and the per-message cap only has to sit under the
// platform's 1 MiB WebSocket message limit with room to spare.
// 🔴 RAISED 2026-09-13, AND THE OLD NUMBERS WERE GUESSES DEFENDED AS LIMITS.
//
// They were picked before any of this had been run in anger, against a
// production this project does not have and a public it has never had. What
// they actually produced was a day of hand-serialising work — refusing to run
// a measurement because a demo was open, treating one relay as a thing to take
// turns on — and every one of those refusals was enforcing a number somebody
// made up rather than one anybody measured.
//
// What IS measured, and is why the old ceiling was visible at all: at both 120
// and 300 msg/s the relay delivered exactly 298 messages in three seconds —
// `MSG_BURST` 120 plus 3 s at 60/s — and THE SENDER WAS TOLD NOTHING. No
// error, no close, no backpressure. That property is worth keeping and it has
// nothing to do with the size of the number.
//
// So the numbers open up and the honesty stays. The real constraints are the
// platform's (a 1 MiB WebSocket message) and the device's (one Raspberry Pi,
// one JACK graph, and no cap here makes that two). When something actually
// breaks, the break will be a measurement, which is worth more than a guess
// that prevented it.
//
// ⚠️ A LIVE DURABLE OBJECT KEEPS ITS CODE. Deploying does not change a room
// that has a socket in it — the board holds `studio-1` awake — so these
// numbers arrive there when the object next restarts, and in a fresh room
// immediately. `/room/<name>/stats` reports what the OBJECT thinks, which is
// how to tell the two apart.
//
// ⚠️ `demo/wire/` reads these off `/stats` rather than assuming them, so it
// follows whatever they are — but its recorded 298-in-three-seconds belongs to
// the old values and is history now.
~~~

### max-bytes

Trailing comment on line 79 before the cut.

~~~js
const MAX_BYTES = 1000 * 1024;            // per message — just under the platform's 1 MiB
~~~

### max-sockets

Trailing comment on line 80 before the cut.

~~~js
const MAX_SOCKETS = 128;                  // was 16, which a handful of browser tabs could fill
~~~

### msg-per-sec

Trailing comment on line 83 before the cut.

~~~js
const MSG_PER_SEC = 1000;                 // was 60 — one knob turn is ~60/s on its own
~~~

### idle

Above `const IDLE_MS = 10 * 60 * 1000;           // silent this long, and only if the r`..., lines 86 to 99 before the cut.

~~~js
// 🔴 A FULL ROOM IS A SILENT OUTAGE, AND A DEPLOY DOES NOT CLEAR IT. MEASURED
// 2026-09-12: `studio-1` sat at 16/16 and refused the box for hours — the board
// dialled every 30 s and logged `closed 1006`, which reads as a network fault
// on the board rather than a full room. Hibernated sockets are RESTORED across
// a restart (that is the point of hibernation), so redeploying the worker does
// not drop them: nothing outside the object can close a socket, so the object
// has to do it.
//
// ⚠️ Liveness cannot come from "did it send recently" alone — a page that is
// only LISTENING to audio sends nothing for minutes and is perfectly alive.
// `getWebSocketAutoResponseTimestamp` is the signal that survives hibernation:
// `wire.mjs` clients send 'ping' and the RUNTIME answers without waking this
// object, so the timestamp is maintained for free. In-memory message times
// cover the agents, which do not ping but do send constantly.
~~~

### cam-room

Above `const CAM_ROOM = /-cam$/;`, lines 102 to 120 before the cut.

~~~js
// 🔴 ONE KIND OF ROOM HERE IS NOT TOKENLESS: A ROOM WHOSE NAME ENDS `-cam`.
// Asked 2026-10-13: *"add pi camera to https://positron.studio/concepts/remote/010/.
// url secret parameter to enable (key in cf secrets)"*. `studio-1-cam` carries
// the picture from the Raspberry Pi's own camera, and the Pi starts that camera
// for whoever speaks in the room (rig/board/camera.mjs), so who may speak there
// is who may turn a camera on in somebody's room.
// ⚠️ THE KEY ARRIVES IN THE FIRST MESSAGE, NOT IN THE URL OR A HEADER. Workers
// Logs records every request's URL and headers (observability is on, below in
// wrangler.jsonc), so a key in either would be written into a log on every
// join. A message body is not. Until a socket's first message is
// `{"type":"cam.key","key":...}` with the key that matches the secret
// `PI_CAM_KEY`, it hears nothing and what it sends is dropped; a wrong key is
// closed with 4003.
// ⚠️ AND THE 403 A PERSON CAN SEE IS `POST /room/<name>-cam/key`, with the key
// as the body: 204 when it matches, 403 when it does not. The page asks it
// before it opens the room, because a browser cannot read why a WebSocket closed
// before it opened.
// ⚠️ NO SECRET SET MEANS NOBODY GETS IN, never everybody: the comparison is
// against the secret, and a missing one matches nothing.
~~~

### seen

Above `this.seen = new WeakMap();`, lines 148 to 149 before the cut.

~~~js
/** last message time per socket, in memory only — lost on hibernation,
 *  which is why it is only ever the OPTIMISTIC half of a liveness check. */
~~~

### since-wake

Above `return json({`, lines 193 to 196 before the cut.

~~~js
// HIBERNATION IS KEPT ON PURPOSE (it is what makes an idle room free, and
// setWebSocketAutoResponse only exists on the hibernatable API). The cost
// is that these counters live in DO memory and reset on wake — so they are
// reported as sinceWake rather than dressed up as lifetime totals.
~~~

### arrived

Above `this.seen.set(pair[1], Date.now());`, lines 224 to 225 before the cut.

~~~js
// A socket that has just arrived and not yet spoken is alive, obviously —
// without this it looks exactly like one whose owner left.
~~~

### connected-at

Above `const gated = CAM_ROOM.test(url.pathname.split('/')[2] || '');`, lines 227 to 231 before the cut.

~~~js
// 🔴 AND THE SAME FACT AGAIN, DURABLY. The in-memory line above is lost on
// hibernation, and dating a restored socket from the object's WAKE instead
// makes it permanently un-evictable: every restart resets its apparent age,
// so a room full of dead sockets stays full forever — measured, that is
// exactly what `studio-1` did. ONE write per connection, never per message.
~~~

### key-deadline

Above `const ws = pair[1];`, lines 237 to 240 before the cut.

~~~js
// A socket that never proves the key is not left holding a place. Two
// ways, because neither is enough alone: a timer, which a hibernating
// object drops (MEASURED 2026-10-13, a silent socket was still open at
// 11 s), and a sweep on every join, which needs no timer at all.
~~~

### idle-ms

Above `#idleMs(ws, now) {`, lines 254 to 258 before the cut.

~~~js
/**
 * How long since this socket last gave any sign of life. The runtime's
 * ping/pong timestamp survives hibernation and costs nothing; the in-memory
 * message time does not survive but covers senders that never ping.
 */
~~~

### no-attachment

Above `let at = 0;`, lines 263 to 266 before the cut.

~~~js
// Never pinged, nothing sent since this object woke. Fall back to WHEN IT
// CONNECTED, which survives hibernation. A socket with no attachment at
// all predates this code, so it has been sitting there at least since the
// deploy — old by definition, and the only way the stuck rooms clear.
~~~

### reclaim

Above `#reclaim() {`, lines 274 to 278 before the cut.

~~~js
/**
 * Close sockets that have been silent past IDLE_MS. Called ONLY when the room
 * is full — an idle socket in a room with space costs nothing and evicting it
 * would be a policy nobody asked for.
 */
~~~

### allow

Above `#allow(ws, size) {`, lines 288 to 293 before the cut.

~~~js
/**
 * TWO buckets, both refilled by elapsed time:
 *   bytes — the one that matters, because fan-out multiplies it by room size
 *   msgs  — so a flood of 10-byte messages still costs something
 * Either running dry drops the message; persistent overrun closes the socket.
 */
~~~

### alive-first

Above `this.seen.set(ws, Date.now());`, lines 325 to 327 before the cut.

~~~js
// ⚠️ Before any cap or bucket check — a socket that is being rate-limited is
// very much alive, and marking liveness only on ACCEPTED messages would
// make the busiest client look like the deadest one.
~~~

### byte-roof

Above `const size = typeof msg === 'string'`, lines 329 to 334 before the cut.

~~~js
// A TRUE BYTE ROOF. `msg.byteLength` is undefined on a string, so the naive
// `msg.byteLength > MAX_BYTES` never fires for text at all; and
// `String.length` counts UTF-16 CODE UNITS, so 4000 units of emoji is 8000
// UTF-8 bytes and slipped through a length check. Measured, not assumed.
// UTF-8 bytes >= code units always, so the length test is a safe fast
// reject before the encode.
~~~

### fan-out

Above `if (me.gated) {`, lines 371 to 375 before the cut.

~~~js
// VERBATIM, to everyone, sender included. Never parsed, never re-stamped.
// ⚠️ IN A KEYED ROOM, only to sockets that proved the key, and a BINARY
// frame is not echoed to its sender: the Pi sends the camera there at about
// 1.5 Mbit/s and has no use for its own picture coming back down a link in
// another building.
~~~
