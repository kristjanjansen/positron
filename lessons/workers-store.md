# workers-store

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `workers/store/src/graph.js`

### graph

Above `export const STORE_GRAPH = {`, lines 1 to 11 before the cut.

~~~js
// workers/store/src/graph.js: what positron-store says it is, as a site.
//
/*
 * THE STORE IS A SITE IN THE ROOM IT RECORDS (plans/plan-site-names.md §4g,
 * 2026-10-09). Its socket is already a member, so it says what it is in the
 * shape `demo/shell/graph-registry.mjs` reads, and every page's registry sees
 * it without a page announcing it on its behalf.
 * ⚠️ A LITERAL, NOT AN IMPORT. The worker imports nothing from demo/, and
 * `workers/store/graph-check.mjs` runs this exact object through
 * `graphProblem` so the two cannot drift silently.
 */
~~~

## `workers/store/src/index.js`

### header

Above `import { STORE_GRAPH } from './graph.js';`, lines 1 to 37 before the cut.

~~~js
/**
 * positron-store — the history the relay refuses to keep. plan-ws §3.
 *
 * The relay's whole value is that it does not parse: no envelope, no storage,
 * text or binary relayed as-is, and a `ping` answered by the runtime's
 * hibernation autoresponse so an RTT probe never even wakes it. Putting
 * history inside it would make every message a parse and every room a write.
 *
 * So the backlog sits BESIDE it, and fills the only way that keeps that true:
 *
 *   THE RECORDER JOINS THE ROOM AS AN ORDINARY SOCKET.
 *
 * It costs one of the relay's sixteen slots, it sees exactly the order every
 * other member sees — the echo is the ordering point — and it is allowed to
 * parse because it is not the relay. It is also the one place `store: true`
 * can be honoured, which is why that flag lives in the envelope rather than in
 * a query string.
 *
 * The cost, stated rather than hidden: a recorded room is a Durable Object
 * kept awake. Recording is therefore something you turn ON for a room, with an
 * idle stop, not a property every room has.
 *
 *   POST /room/<name>/record   {cap?}   -> starts it; returns when the socket is open
 *   GET  /room/<name>/history?last=|since=|from=&to=|type=   -> NDJSON, oldest first
 *   GET  /room/<name>/stats
 *   POST /room/<name>/clear       one room, from one of this project's pages (Origin)
 *   POST /clear-all               every room the index knows of, needs x-store-key
 *
 * `clear-all` needs a list of rooms, and a DO namespace cannot be enumerated —
 * so one reserved instance, `__index`, keeps the names as they start recording.
 * ⚠️ It therefore knows only what was recorded SINCE it existed: rooms from
 * before are unreachable by name and keep up to `cap` rows until something
 * writes to them again, because the prune runs on write. At demo scale that is
 * a handful of rows; if it ever matters, prune on the idle-stop alarm.
 * The public room route refuses any name beginning `__`, so nothing outside
 * this file can address it.
 */
~~~

### announce

Above `#announce() {`, lines 139 to 143 before the cut.

~~~js
/**
 * `graph.announce` in wire.mjs's envelope. ⚠️ NO `store: true`, so the
 * store never keeps its own announcement, nor anybody else's `graph.*`,
 * when the relay echoes them back to it.
 */
~~~

### store-flag

Above `async onMessage(data) {`, lines 154 to 163 before the cut.

~~~js
/**
 * `store: true` is elektron's, and it is right: the sender knows which
 * messages are worth keeping. Without it a room carrying cues at 60/s fills
 * a 1,000-message cap in seventeen seconds and buries the one line somebody
 * wanted to read back.
 *
 * A binary frame cannot carry the flag — it has no fields — so it is kept
 * whenever recording is on. That asymmetry is real and the page prints it
 * rather than pretending the two paths are the same.
 */
~~~

### sent-column

Above `at: Number(m.sent ?? m.at) || Date.now(),`, lines 176 to 180 before the cut.

~~~js
// The column is called `at` and holds the SEND STAMP. The envelope
// renamed that stamp to `sent` on 2026-10-04 (`at` is an event's own
// time now); an old sender still writes `at`. The column keeps its
// name rather than migrating a Durable Object table, so read
// `sent` first and fall back to the old envelope field.
~~~

### blob

Above `const buf = typeof data.arrayBuffer === 'function' ? await data.arrayBuffer() : `..., lines 191 to 195 before the cut.

~~~js
// A DO's OUTBOUND client socket hands binary over as a **Blob**, not an
// ArrayBuffer (measured: `Blob`, size 9, byteLength undefined) — and the
// SQL bind takes a Uint8Array without complaining and stores an EMPTY
// blob, so the row reads back at 0 bytes with the frame apparently
// recorded. Convert, then bind an ArrayBuffer.
~~~

### blob-out

Above `return new Response(lines ? '${lines}\n' : '', {`, lines 316 to 317 before the cut.

~~~js
// (a BLOB comes back as an ArrayBuffer, which has no .slice() worth
//  having and no iterator — hex() wraps it before reading)
~~~

### clear-all

Above `if (url.pathname === '/clear-all' && request.method === 'POST') {`, lines 371 to 375 before the cut.

~~~js
// Blunt on purpose, and the button says so: this is demo history, and a
// page that keeps a room per visitor leaves rooms nobody will ever name
// again. Clearing one room at a time would never reach them.
// Every room at once has no page behind it, so it takes the operator's key:
// `wrangler secret put STORE_KEY`, sent as `x-store-key`. Unset refuses.
~~~
