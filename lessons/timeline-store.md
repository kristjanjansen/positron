# timeline-store

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `timeline/store.mjs`

### header

Above `import { createCursor } from './transport.mjs';`, lines 1 to 96 before the cut.

~~~js
// timeline/store.mjs — THE STORE LAYER. plan-timeline §3 promised the v0 library
// as "Event type + store (memory/DO/JSONL-R2 backends) + transport…"; the store
// half was never built, and the library's log is an in-memory array. Decades of
// ERR archive is not a JS array.
//
// WHAT MADE THIS TRACTABLE NOW (NOTES.md Checkpoint 7): since v0.4 the CURSOR is
// the ONLY positional reader in the library. `sampleAt`/`bracket` go through it,
// `prefixEvents` bisects a per-kind lane, and `createCursor(rows)` is exported.
// So a backend does not have to satisfy "the transport"; it has to satisfy ONE
// tiny structural contract:
//
//     rows.length            -> a number
//     rows[k]                -> a row whose key(row) is NON-DECREASING in k
//
// That is the whole interface. Everything below exists to serve those two lines
// out of something that is not resident in memory.
//
// ---------------------------------------------------------------------------
// THE ONE INTERFACE
// ---------------------------------------------------------------------------
//   const reader = await store.open(query);
//   reader.count                       rows currently addressable (indexed + tail)
//   reader.at(i)                       row i — SYNC, always returns something
//   reader.slice(from, to)             rows [from, to) — SYNC, ghosts flagged
//   reader.bracketAt(pos, nbr)         the straddling pair — SYNC, cursor-backed
//   reader.ensure(fromPos, toPos)      PREFETCH BY WINDOW — async, horizon-driven
//   reader.residentFor(fromPos, toPos) SYNC fast path: is that window resident?
//   reader.appendBatch(rows)           live growth under the playhead
//   reader.rows                        the cursor-shaped view (pass to createCursor)
//   reader.resident() / .stats() / .misses() / .onMiss(cb)
//   reader.close()
//
// SYNC-OR-ASYNC. `open()` is async (an index has to be read). Every read after
// that is SYNCHRONOUS, because a lookahead scheduler cannot await inside its
// tick — the tick is the thing that keeps the vector honest. The async half is
// pushed entirely into `ensure(fromPos, toPos)`, which the client drives from
// the SAME horizon the scheduler already computes:
//
//     pos + horizonMs * rate       (transport.mjs scan(), line ~536)
//
// so prefetch is not a new concept, it is the existing lookahead extended one
// level down the stack. A window that is resident costs a Map lookup.
//
// ---------------------------------------------------------------------------
// THE MISS POLICY — the honest decision, stated out loud
// ---------------------------------------------------------------------------
// A synchronous read into a non-resident page is the one genuinely new failure
// mode a store adds to this library. Three options were on the table:
//
//   (a) STALL THE LANE. Rejected. The library's first law is that the vector has
//       no timers and position(now) is pure math over {p0,t0,rate}. There is no
//       "stall" that is not a pause(), and a pause is a user-visible transport
//       state change (it emits 'pause', it runs followTransport, a HUD shows
//       0.00x). A STORE MUST NOT MOVE THE TRANSPORT BEHIND THE CLIENT'S BACK.
//       Available as `missPolicy:'stall'` — which reports the miss with
//       action:'stall' and lets the CLIENT call pause(). The store reports; the
//       client decides.
//
//   (b) SKIP WITH A REPORTED GAP. Rejected as the default. It breaks SEAM 5's
//       guarantee — the reducer is handed the COMPLETE ORDERED PREFIX — and it
//       breaks it INVISIBLY for exactly the reducers that care: a hole in the
//       prefix makes a non-commutative fold (a counter, a cue state machine)
//       silently wrong. Available as `missPolicy:'skip'`; slice() then omits the
//       ghosts and reports `gaps`, so a client that genuinely wants holes gets
//       them labelled.
//
//   (c) FIRE LATE WITH A DRIFT RECORD.  *** THE DEFAULT ***
//       Because it is not a new failure mode at all — it is the one the library
//       already models. Every fire logs {intendedUs, firedUs, deltaMs, origin};
//       a store miss is the same record with a larger delta and origin
//       'store-miss'. Reuse buys three things for free:
//         · a HUD that already draws drift draws store misses with no new code;
//         · `lateGraceMs` and the per-kind catch-up policy ('burst'|'drop'|
//           'reduce') ALREADY decide what a late batch means — the client's
//           declared policy, not the store's guess;
//         · the prefix stays COMPLETE. Only actuation is late. C2 still holds.
//
// THE GHOST ROW is the mechanism all three share. A miss cannot return undefined
// (the cursor would probe key(undefined) and throw) and must not return a stale
// key (the binary search would diverge). So it returns a GHOST: a synthetic row
// carrying a key INTERPOLATED INSIDE ITS PAGE'S KNOWN [firstAt, lastAt] bounds.
// Page bounds are monotone, so ghost keys are monotone across the whole log:
// the bisect still converges on the right page, and once that page lands the
// real row is served. A ghost is flagged `__ghost` on every path, is never
// handed to an actuator, and every one is counted.
//
// ---------------------------------------------------------------------------
// WINDOWING — bounded memory for an unbounded log
// ---------------------------------------------------------------------------
// Pages are ROW-INDEX ranges (default 4096 rows), never byte ranges, so at(i) is
// page arithmetic. The sidecar index holds one entry per page — {i0,n,off,len,
// firstAt,lastAt} — so a 1M-row log has 245 index entries, not 1M. Resident
// pages are an LRU of `maxPages` (default 8). CEILING = maxPages*pageRows rows
// + the live tail, and `resident()` reports it rather than claiming it.
//
// Plain ESM, no deps, browser + node (node-only paths are dynamic imports).
~~~

### lru

Above `function lru(max) {`, lines 107 to 114 before the cut.

~~~js
// ---------------------------------------------------------------------------
// LRU over page index -> rows[]
// ---------------------------------------------------------------------------
// PINNING is not an optimisation, it is a correctness requirement. A cold
// bisect probes O(log pageCount) pages and each probe kicks off a background
// repair load; without a pin those repairs land later and evict the very window
// ensure() just paid for, so an ensured read could still come back cold. The
// window the client asked for is pinned until the next ensure() replaces it.
~~~

### paged-reader

Above `function createPagedReader(source, {`, lines 156 to 162 before the cut.

~~~js
// ---------------------------------------------------------------------------
// THE PAGED READER — one implementation, three sources.
//
// A `source` supplies:
//   {name, pageRows, total(), pageCount(), pageMeta(p) -> {i0,n,firstAt,lastAt},
//    loadPage(p) -> Promise<rows[]>, warm() -> Promise<void>, close()}
// ---------------------------------------------------------------------------
~~~

### tail

Trailing comment on line 175 before the cut.

~~~js
const tail = [];                     // live appends — RESIDENT ALWAYS, never evicted
~~~

### repairs

Above `if (inflight.size < maxRepairs) loadPage(p).catch(() => {});`, lines 248 to 250 before the cut.

~~~js
// Repair in the background — but a COLD BISECT probes O(log pageCount)
// pages and we are not going to fetch seventeen of them to answer one
// synchronous read. Two concurrent repairs; the rest is ensure()'s job.
~~~

### rows-view

Above `const rows = new Proxy(Object.create(null), {`, lines 273 to 277 before the cut.

~~~js
// -------------------------------------------------------------------------
// THE CURSOR VIEW. This is the whole point: a Proxy whose only job is to be
// `{length, [k]}` so createCursor() — the library's one positional reader —
// rides an unbounded log without knowing it.
// -------------------------------------------------------------------------
~~~

### bracket-at

Above `function bracketAt(pos, nbr = 0) {`, lines 304 to 305 before the cut.

~~~js
/** SYNC. The straddling pair at pos, plus {cold, ghosts} — the C6 law applied
 *  to residency: a cold read degrades, and says so, rather than lying. */
~~~

### window

Above `function pagesForWindow(fromPos, toPos) {`, lines 313 to 318 before the cut.

~~~js
// -------------------------------------------------------------------------
// PREFETCH BY WINDOW. Driven by the scheduler's own horizon:
//     reader.ensure(pos, pos + horizonMs * rate)
// Returns {fast, pages, loaded} — `fast:true` means it was already resident
// and NOTHING was awaited (the common case at 40 Hz).
// -------------------------------------------------------------------------
~~~

### append

Above `function appendBatch(batch) {`, lines 367 to 381 before the cut.

~~~js
// -------------------------------------------------------------------------
// APPEND-LIVE. The live-show case: the log grows UNDER the playhead.
//
// Appends land in `tail`, which is (a) always resident, (b) never evicted, and
// (c) addressed at indices >= indexed. Growing an array at the END cannot move
// any index the cursor is holding, so THE CURSOR STAYS VALID BY CONSTRUCTION —
// no invalidation, no reset, no re-seek. That is the whole guarantee.
//
// An out-of-order append (at < the tail's last at) WOULD move indices. The DO
// already answers this: it rejects a non-monotonic seq per source, INDIVIDUALLY,
// so a retried batch is idempotent instead of fatal. Same rule here — the row
// is inserted in sorted position (the log must stay sorted or the cursor is
// meaningless), and if that position sits at or before the cursor's index the
// cursor is reset and the reset is REPORTED. Never silent.
// -------------------------------------------------------------------------
~~~

### index

Above `index() { return source.index ? source.index() : null; },`, lines 437 to 437 before the cut.

~~~js
/** rows in the position domain the deck uses — for logdeck-style clients. */
~~~

### memory

Above `export function memoryStore(rows = [], { key = (r) => r.at } = {}) {`, lines 444 to 453 before the cut.

~~~js
// ---------------------------------------------------------------------------
// (1) memoryStore — BYTE-COMPATIBLE WITH TODAY'S ARRAY.
//
// Deliberately NOT the paged reader. The array IS the resident set; wrapping it
// in a Proxy would add a per-probe indirection to the exact read v0.4 measured
// at 3.67 comparisons/call, for nothing. `reader.rows` is the SAME array object
// (identity, not a copy), so a deck holding it and this reader are the same
// storage — which is what makes appendBatch visible to an already-running deck
// and what makes "nothing regresses" a fact rather than a hope.
// ---------------------------------------------------------------------------
~~~

### identity

Trailing comment on line 473 before the cut.

~~~js
rows: arr,                                   // IDENTITY — the same array
~~~

### jsonl

Above `/** Build the sidecar. Streams the file once; never holds it in memory. */`, lines 513 to 525 before the cut.

~~~js
// ---------------------------------------------------------------------------
// (2) jsonlStore — Range-fetched pages + an index sidecar. THE ARCHIVE CASE.
//
// This is proto/selfrec's manifest shape one level down: masters are truth, the
// sidecar is derived and regenerable (postshow.mjs's `derived/index.json` rule).
// Layout:
//     <name>.jsonl        one JSON row per line, sorted by key
//     <name>.idx.json     {v, key, rows, pageRows, bytes,
//                          pages:[{i0,n,off,len,firstAt,lastAt}], …}
// ONE index entry per PAGE, so the sidecar is O(rows/pageRows) — 245 entries for
// a 1M-row log, not 1M. Reads are HTTP Range (R2/r2.dev serve them) or a
// positional fs read; both hand back exactly `len` bytes of whole lines.
// ---------------------------------------------------------------------------
~~~

### stale-sidecar

Above `let fh = null, sizeChecked = false;`, lines 573 to 579 before the cut.

~~~js
// THE SIDECAR IS DERIVED, AND DERIVED DATA GOES STALE. Page offsets are
// BYTE offsets: an index built before a C6 redaction compaction will Range
// into the middle of a line and hand back garbage that parses. So the
// index is bound to the log's byte length, and the binding is CHECKED —
// at open for a path, and against the first 206's content-range for a URL.
// (postshow.mjs's rule, one level down: masters are truth, derived is
// regenerable — but only if you can tell that it needs regenerating.)
~~~

### do-store

Above `export function doStore({`, lines 644 to 663 before the cut.

~~~js
// ---------------------------------------------------------------------------
// (3) doStore — paged reads against the DEPLOYED elektron-instrument session API.
//
//     GET {base}/session/<id>?from=&limit=   -> {session, lanes, from, limit,
//                                                count, total, events[]}
// ordered by (at, seq); `from` is a ROW OFFSET, which is exactly the page
// addressing above with no translation at all. That is not luck: workers/
// instrument/src/index.js stores notes as SQLite ROWS (plan-timeline C4 — rows,
// NEVER one JSON value), and "rows + an offset + a limit" is the same shape a
// paged store wants. A session log kept as one 128 KiB JSON value could not
// serve a page at all.
//
// READ-ONLY. No writes, no new CF resources, no token needed for reads (the
// session API's reads are open; a token is only sent if you hand one in).
//
// PAGE BOUNDS. The API has no positional query, so firstAt/lastAt per page are
// PROBED with limit=1 at each page start — pageCount+1 tiny requests, cached for
// the reader's life. For a 392-row session at pageRows 4096 that is one probe.
// (What a decades-scale archive needs instead is in NOTES-store.md.)
// ---------------------------------------------------------------------------
~~~

### warm

Above `async warm() {`, lines 696 to 696 before the cut.

~~~js
/** probe page boundaries — the positional index the API does not serve. */
~~~

### open-store

Above `export function openStore(spec = {}) {`, lines 727 to 732 before the cut.

~~~js
// ---------------------------------------------------------------------------
// openStore — one entry point, so a client writes ONE line to change backend.
//   openStore({kind:'memory', rows})
//   openStore({kind:'jsonl', url|path})
//   openStore({kind:'do', base, session})
// ---------------------------------------------------------------------------
~~~

### store-lane

Above `export function storeLane(reader, kind) {`, lines 741 to 748 before the cut.

~~~js
// ---------------------------------------------------------------------------
// storeLane — the shim that makes a reader look like ONE per-kind lane, which is
// what transport.mjs's byKind map holds. It filters by kind over the reader's
// index space, so `lane.length` / `lane[k]` still satisfy the cursor contract.
// Cheap only when the store is single-kind or the pages are resident; for a
// multi-kind archive the RIGHT answer is one reader per kind (one sidecar per
// lane) — see NOTES-store.md, "what ERR still needs".
// ---------------------------------------------------------------------------
~~~

### drive

Above `export function driveStore(reader, transport, { horizonMs = 100, leadFactor = 8,`..., lines 769 to 775 before the cut.

~~~js
// ---------------------------------------------------------------------------
// driveStore — the horizon -> ensure() pump. This is the ONE line of glue a
// client (or, later, the scheduler) needs: prefetch the window the lookahead is
// about to walk into, from the same numbers the lookahead already has. It is NOT
// a timer inside the library's vector — it is the CLIENT's cadence, per the
// "the library does not own a render tick" law, and it is opt-in.
// ---------------------------------------------------------------------------
~~~
