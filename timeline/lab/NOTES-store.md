# NOTES-store — the STORE layer (2026-08-28)

*A new file. `timeline/lab/NOTES.md` belongs to a sibling; nothing here edits it.*

plan-timeline §3 promised v0 as "Event type + **store (memory/DO/JSONL-R2
backends)** + transport + wall-lane scheduler". Everything but the store got
built. Checkpoint 7 named it the largest remaining gap and also said why it had
suddenly become tractable: since v0.4 **the cursor is the only positional
reader**. `sampleAt`/`bracket` go through it, `prefixEvents` bisects a per-kind
lane, and `createCursor(rows)` is exported.

So a backend does not have to satisfy "the transport". It has to satisfy two
lines:

    rows.length     -> a number
    rows[k]         -> a row whose key(row) is NON-DECREASING in k

That is the entire contract. `timeline/store.mjs` (+ `lab/prop-store.mjs`,
`lab/bench-store.mjs`) is what it takes to serve those two lines out of
something that is not in memory.

**Not touched:** `transport.mjs`, `logdeck.mjs`, `prop-test.mjs`, `nested.mjs`
(siblings own them). The wiring patch is a **sketch** below; it is not applied.

---

## 1. The interface

```js
const reader = await openStore({kind:'jsonl', url});      // or memoryStore / doStore

reader.count                     // rows addressable now (indexed prefix + live tail)
reader.at(i)                     // SYNC. always returns a row (real or ghost)
reader.slice(from, to)           // SYNC. + .gaps under missPolicy 'skip'
reader.bracketAt(pos, nbr)       // SYNC. cursor-backed, + {cold, ghosts, page}
reader.ensure(fromPos, toPos)    // ASYNC. PREFETCH BY WINDOW
reader.ensureIndex(fromI, toI)   // ASYNC. same, by row index
reader.residentFor(a, b)         // SYNC fast path: is that window resident?
reader.appendBatch(rows)         // live growth under the playhead
reader.rows                      // the {length, [k]} view -> createCursor(reader.rows)
reader.resident() / .stats() / .misses() / .onMiss(cb) / .close()
```

**`open()` is async; every read after it is synchronous.** That split is forced,
not chosen: a lookahead scheduler cannot `await` inside its tick — the tick is
what keeps `position(now)` pure math over `{p0,t0,rate}`. So the whole async half
is pushed into `ensure(fromPos, toPos)`, driven by the number the scheduler
already computes:

    pos + horizonMs * rate          // transport.mjs scan(), ~line 536

Prefetch is therefore not a new concept in this library. It is the existing
lookahead extended one level down the stack — `driveStore(reader, transport)`
is the four-line pump, and it lives in the *client's* cadence, per the standing
"the library does not own a render tick" law.

A resident window costs one `Map` lookup (`residentFor` → `st.ensureFast`).

### Pages, not byte ranges

Pages are **row-index** ranges (default 4096 rows), so `at(i)` is arithmetic. The
sidecar carries **one entry per page** — `{i0, n, off, len, firstAt, lastAt}` —
which is what makes the index O(rows/pageRows): **22.7 KB for a 69.7 MB,
1 000 000-row log** (245 entries; 3145× smaller than the log).

`firstAt/lastAt` per page are what let a **positional** query (`ensure(fromPos,
toPos)`) bisect 245 entries instead of 1 000 000 rows.

---

## 2. The miss policy — decided, and why

A synchronous read into a non-resident page is the one genuinely new failure
mode a store adds. Three honest options; the default is **(c) fire late**.

**(a) STALL THE LANE — rejected as default.** The library's first law is that the
vector has no timers. There is no "stall" that is not a `pause()`, and a pause is
a user-visible transport state change: it emits `'pause'`, it runs
`followTransport`, a HUD shows 0.00×. **A store must not move the transport
behind the client's back.** Kept as `missPolicy:'stall'`, which *reports* the
miss with `action:'stall'` and lets the client decide (`onMiss(() =>
deck.pause())` is one line). The store reports; the client decides.

**(b) SKIP WITH A REPORTED GAP — rejected as default.** It breaks SEAM 5's
guarantee — *the reducer is handed the COMPLETE ORDERED PREFIX* — and breaks it
invisibly for exactly the reducers that care. A hole in the prefix makes a
non-commutative fold (a counter, a cue state machine) silently wrong; that is
the C2 property test failing in production with nothing to catch it. Kept as
`missPolicy:'skip'`, where `slice()` omits the rows and returns `.gaps =
[[i0,i1], …]` so a client that genuinely wants holes gets them **labelled**.

**(c) FIRE LATE WITH A DRIFT RECORD — the default.** Chosen because it is *not a
new failure mode at all*. Every fire in this library already logs
`{intendedUs, firedUs, deltaMs, origin}`; a store miss is the same record with a
bigger delta and `origin:'store-miss'`. That reuse buys three things free:

- a HUD that already draws drift draws store misses with no new code;
- `lateGraceMs` and the per-kind catch-up policy (`'burst' | 'drop' | 'reduce'`)
  **already decide** what a late batch means — the client's declared policy, not
  the store's guess;
- **the prefix stays complete.** Only actuation is late. C2 still holds.

### The ghost row — the mechanism all three share

A miss cannot return `undefined` (the cursor probes `key(rows[k])` and would
throw) and must not return a stale key (the bisect would diverge). So it returns
a **ghost**: a synthetic row whose key is interpolated inside its page's known
`[firstAt, lastAt]`. Page bounds are monotone ⇒ ghost keys are monotone across
the whole log ⇒ **the binary search still converges on the correct page**, and
once that page lands the real row is served. `prop-store` asserts exactly this:
a cold seek's bracket lands on the page a direct bisect of the sidecar says is
correct. A ghost is `__ghost`-flagged on every path, `bracketAt` returns
`{cold:true, ghosts:n}`, and every one is counted.

Two supporting decisions found by measurement, not by design:

- **Pinning is a correctness requirement, not an optimisation.** A cold bisect
  probes O(log pageCount) pages; each probe kicks off a background repair load;
  without a pin those repairs land *later* and evict the window `ensure()` just
  paid for — so an ensured read came back cold. `ensure()` pins its window until
  the next `ensure()` replaces it. (First run: 200/200 seek-anywhere reads
  failed intermittently. After pinning: 0 failures.)
- **Repairs are capped at 2 concurrent.** We are not fetching seventeen pages to
  answer one synchronous read. The miss is still reported; filling the window is
  `ensure()`'s job.

---

## 3. The three backends, measured

### memory — byte-compatible with today's array

Deliberately **not** the paged reader. `reader.rows` **is the same array object**
(identity, not a copy), so a deck holding it and the reader are the same storage
— which is why `appendBatch` is visible to an already-running deck, and why
"nothing regresses" is a fact rather than a hope. Wrapping it in a Proxy would
have added an indirection to the exact read Checkpoint 7 measured at 3.67
comparisons/call, for nothing.

Proven identical to `createCursor(rawArray)` over 6 400 probes (forward sweep +
random access + backward walk, on a trace with same-ms ties and 1 ms clusters):
same `i`, `u`, `aAt`, `bAt`, `a`, `b`, `prevs`, `nexts`, **and the same cursor
trajectory to the comparison** (equal `comparisons/searches/advances/hits`). A
deck driven off `reader.slice(0,count)` fires the identical sequence.

### jsonl — Range-fetched pages + index sidecar (the archive / R2 / ERR case)

`<name>.jsonl` (one row per line, sorted) + `<name>.idx.json`. Reads are HTTP
`Range` (206) or a positional `fs` read — one code path, proven on both (the
lab serves the fixture over **port 8892**, which is what r2.dev does).

At **1 000 000 rows / 69.7 MB**:

| claim | measured |
|---|---|
| sidecar is O(rows/pageRows) | **22.7 KB** for 69.7 MB — **3145×** |
| cmp/call flat in n | **2.38 at 10k rows, 2.38 at 1M** (a rescan would be ~500 000) |
| resident memory bounded | **32 768 rows = 3.277 %** of the log, ceiling identical at 10k and 1M |
| seek anywhere | 200 random seeks, all exact: `a.seq === i` and `aAt ≤ pos ≤ bAt` |
| cold seek honest | `cold:true`, `ghosts>0`, `misses()[0] = {policy:'late', action:'fire-late', origin:'store-miss'}`, and the ghost bisect landed on the *correct* page; after `ensure()` the same position is exact |
| the other two policies | `'skip'` → `action:'gap'` + `slice().gaps === [[1000,1010]]`; `'stall'` → `action:'stall'` |

**Ceiling = `maxPages × pageRows` rows + the live tail**, and `resident()`
reports it rather than claiming it. Default 8 × 4096 = 32 768 rows ≈ **3.8 MB of
heap**, measured, *at any log size* — vs **114.5 MB** for the same 1M rows as an
array.

**Stale-index guard.** The sidecar holds byte offsets, and a C6 redaction
compaction moves bytes. So the index is bound to the log's byte length and the
binding is checked — at open for a path, against the first 206's
`content-range` for a URL. An index that no longer matches its log **throws**;
it does not Range into the middle of a line and hand back garbage that parses.

### do — paged reads against the deployed `elektron-instrument`, read-only

`GET {base}/session/<id>?from=&limit=` returns rows ordered by `(at, seq)` and
`from` is a **row offset** — which is the page addressing above with *no
translation at all*. That is not luck. plan-timeline **C4** made the worker store
**DO SQLite ROWS, never one JSON value**, and "rows + offset + limit" is exactly
the shape a paged store wants. A session kept as one 128 KiB JSON value could
not serve a page at all; the amendment paid for itself here, two layers away.

Against the **KEPT proof session `smtc1hu37j5yeph`** (read-only, no writes, no
new CF resources):

- **392 / 392 rows** reproduced, field for field (`at`, `kind`, `source`, `seq`)
  against the API's own full read;
- order preserved and non-decreasing in `at` across 4 pages of 128;
- lanes as the DO reports them: `instrument/media-span:4`,
  `instrument/midi-actuated:256`, `player/audio-span:1`, `player/midi:128`,
  `worker/session:3`;
- `bracketAt` over the paged log straddles a real stamp, warm, `cold:false`.

**The one wart:** the session API has no positional query, so `firstAt/lastAt`
per page are *probed* with `limit=1` at each page start (pageCount + 1 tiny
requests, cached for the reader's life). That is the 359 ms `open` in the bench
— five sequential round-trips to Frankfurt, not compute. At archive scale this
is the wrong shape and it is the first thing §6 asks for.

---

## 4. Bench

`node --expose-gc timeline/lab/prop-store.mjs` (or `node timeline/lab/bench-store.mjs`).
Cold seek = p50 of 12 random `ensure()`+`bracketAt`; warm advance = per-call over
a 4 000-step forward sweep inside a resident window; heap = GC'd `heapUsed` delta.

| backend    | rows    | open ms | cold seek ms | warm adv µs | cmp/call | resident rows | ceiling | heap MB | reqs | note                         |
|------------|---------|---------|--------------|-------------|----------|---------------|---------|---------|------|------------------------------|
| memory     | 10000   | 2.486   | 0.003        | 0.536       | 2.01     | 10000         | ∞       | 0.90    | 0    | array identity               |
| jsonl:fs   | 10000   | 0.470   | 0.011        | 1.857       | 2.01     | 10000         | 32768   | 1.17    | 3    | page 4096                    |
| jsonl:http | 10000   | 1.962   | 0.011        | 1.412       | 2.01     | 10000         | 32768   | 1.32    | 3    | Range 206                    |
| memory     | 100000  | 10.864  | 0.004        | 0.497       | 2.05     | 100000        | ∞       | 11.45   | 0    | array identity               |
| jsonl:fs   | 100000  | 0.404   | 6.165        | 1.837       | 2.05     | 32768         | 32768   | 3.82    | 26   | page 4096                    |
| jsonl:http | 100000  | 1.088   | 8.095        | 1.324       | 2.05     | 32768         | 32768   | 3.95    | 17   | Range 206                    |
| memory     | 1000000 | 143.758 | 0.007        | 4.369       | 2.51     | 1000000       | ∞       | 114.46  | 0    | array identity               |
| jsonl:fs   | 1000000 | 2.495   | 7.620        | 1.184       | 2.51     | 32768         | 32768   | 3.81    | 53   | page 4096                    |
| jsonl:http | 1000000 | 1.094   | 10.294       | 1.931       | 2.50     | 32768         | 32768   | 3.92    | 36   | Range 206                    |
| do:sqlite  | 392     | 359.877 | 0.019        | 1.743       | 2.02     | 392           | 16000   | 0.04    | 1    | kept session smtc1hu37j5yeph |

**What the table says.** `open` and `heap` are **flat in n** for the paged
backends and **linear in n** for the array (143 ms / 114 MB at 1M and climbing).
`warm advance` is ~1–2 µs and **cmp/call is flat at ~2.0–2.5** — the store does
not cost the cursor its Checkpoint 7 property. The price is paid exactly once,
at `cold seek`: **6–10 ms**, which is one Range round-trip, which is why
`ensure()` is horizon-driven and why the default miss policy is *late* rather
than *stall*.

`jsonl:fs` cold seek at 10k is 0.011 ms because the whole 10k-row log is 3 pages
and never leaves residency — the paged backend degenerates to the memory
backend when the log fits, which is the correct behaviour.

---

## 5. Append-live: proven

Real `createTransport` on the virtual clock, rate 1, playhead sweeping a
JSONL-backed reader (immutable indexed prefix + live tail). Three rows appended
60 ms ahead of the playhead at three different moments:

- **all 3 reached by the moving playhead, in order** `[0,1,2]`;
- **`cursorResets === 0`**;
- `count` 10 000 → 10 003, `tailCount === 3`, `indexedCount === 10 000`;
- the cursor index advanced monotonically across every append;
- the walked sequence is still sorted.

**Why it holds by construction:** appends land in a `tail` that is always
resident, never evicted, and addressed at indices ≥ `indexed`. Growing an array
at the end cannot move an index the cursor is holding. There is nothing to
invalidate.

The one case that *can* move an index — an out-of-order append — is handled the
way the DO already handles it (`workers/instrument`: a non-monotonic `seq` per
source is rejected *individually*, so a retried batch is idempotent instead of
fatal): the row is inserted in sorted position (the log must stay sorted or the
cursor is meaningless), and **if that position is at or before the cursor's
index the cursor is reset and the reset is reported**. Never silent.
`appendBatch` returns `{appended, rejected, reordered, cursorReset, count}`.

Mirrored through a full deck: `deck.schedule()` during playback fires the 3
live events in order (the existing overdub law), and the memory store mirrors
the same 3 appends with zero resets.

---

## 6. The wiring patch for `transport.mjs` — SKETCH, NOT APPLIED

A sibling owns `transport.mjs` right now. This is the diff that would land, sized
at **~40 changed lines, every one behind `if (store)`, zero cost when `store` is
null.**

```diff
--- a/timeline/transport.mjs
+++ b/timeline/transport.mjs
@@ export function createScheduler(transport, {
   tickMs = 25,
   horizonMs = 100,
   lateGraceMs = 150,
   hostKind,
   host = tickHostByKind(hostKind),
   driftLimit = 20000,
+  store = null,          // an OPENED store.mjs reader. null => today's arrays.
+  storeLead = 8,         // ensure() this many horizons ahead of the playhead
+  storePrefixMax = 4096, // cap on a store-backed reduce window (see prefixEvents)
 } = {}) {

@@ function laneOf(kind) {
     let l = byKind.get(kind);
-    if (!l) byKind.set(kind, l = []);
+    if (!l) byKind.set(kind, l = store ? storeLane(store, kind) : []);
     return l;
   }
```

`afterIdx(lane, pos)` and `cursorFor(kind)` need **no change at all** — they only
ever touch `lane.length` and `lane[m]`, which is the whole contract, and
`cursorFor` already re-creates the cursor when `cur.rows !== lane`.

```diff
@@ schedule({ at, kind = 'default', id, payload }) {
       const ev = { at, kind, id: id ?? `e${seq}`, seq: seq++, payload, status: 'pending', fires: 0, cancel: null };
-      events.splice(insertIdx(at, ev.seq), 0, ev);
-      const lane = laneOf(kind);
-      lane.splice(insertInto(lane, at, ev.seq), 0, ev);
+      if (store) {
+        const r = store.appendBatch([ev]);        // tail-append: cursor stays valid
+        if (r.cursorReset) cursors.delete(kind);  // only ever on an OUT-OF-ORDER append
+      } else {
+        events.splice(insertIdx(at, ev.seq), 0, ev);
+        const lane = laneOf(kind);
+        lane.splice(insertInto(lane, at, ev.seq), 0, ev);
+      }
       if (running && transport.rate > 0 && at <= transport.position()) fire(ev, 'overdub');
       return ev.id;
     },

@@ function scan(now) {
     const rate = transport.rate;
     const pos = transport.position(now);
     const horizonPos = pos + horizonMs * rate;
+    // PREFETCH BY WINDOW, from the horizon the lookahead already computed.
+    // Fire-and-forget: a tick must never await, or the vector stops being math.
+    if (store) {
+      const to = pos + horizonMs * rate * storeLead;
+      if (!store.residentFor(pos, to)) store.ensure(pos, to).catch(() => {});
+    }
     const myGen = gen;
     const reduceBatches = new Map();
@@
-    for (let i = firstLive; i < events.length; i++) {
-      const ev = events[i];
+    const n = store ? store.count : events.length;
+    for (let i = firstLive; i < n; i++) {
+      const ev = store ? store.at(i) : events[i];
+      if (ev && ev.__ghost) {
+        // THE MISS POLICY, INSIDE THE SCHEDULER. Do not fire a ghost, do not
+        // skip past it (that would hole the prefix): stop the scan here and
+        // leave firstLive where it is. When the page lands, the next tick fires
+        // the real event with a real, large deltaMs — and lateGraceMs + the
+        // per-kind catch-up policy already know what to do with that.
+        logDrift({ id: null, kind: ev.kind, at: ev.at, intendedUs: null,
+                   firedUs: Math.round(clock.now() * 1000), deltaMs: null,
+                   origin: 'store-miss', tag: null });
+        break;
+      }
       if (ev.at > horizonPos) break;

@@ function prefixEvents(kind, pos) {
     const lane = byKind.get(kind);
     if (!lane || !lane.length) return [];
-    return lane.slice(0, afterIdx(lane, pos));
+    const end = afterIdx(lane, pos);
+    if (!store) return lane.slice(0, end);
+    // SEAM 5 said the reducer gets the COMPLETE ORDERED PREFIX. Over an archive
+    // that prefix is not materialisable, and pretending otherwise is exactly the
+    // silent-hole failure the store's miss policy refuses. So: fold FORWARD from
+    // the last snapshot — info.from/info.since already exist for this — and SAY
+    // SO. plan-timeline C2's snapshot amendment is the long-term answer.
+    const snap = snapshots.get(kind) || { pos: -Infinity };
+    const start = snap.pos === -Infinity
+      ? Math.max(0, end - storePrefixMax)
+      : afterIdx(lane, snap.pos);
+    const win = [];
+    for (let i = start; i < end; i++) win.push(lane[i]);
+    win.truncated = start > 0 ? { from: start, snapshotPos: snap.pos, reason: 'store-backed prefix' } : null;
+    return win;
   }

@@ function applyReduce(kind, missed, pos, now, reason) {
     const info = {
       kind, pos, reason, nowUs: Math.round(now * 1000),
       count: missed ? missed.length : prefix.length,
       missed: missed || [], prefix, since, from: { pos: snap.pos, state: snap.state },
       next: nexts[0] || null, nexts,
+      prefixTruncated: prefix.truncated || null,   // a reducer is TOLD, never fooled
     };

@@ export function createDeck({
   tickMs = 25, horizonMs = 100, lateGraceMs = 150,
+  store = null,
 } = {}) {
-  const sched = createScheduler(transport, { tickMs, horizonMs, lateGraceMs, host });
+  const sched = createScheduler(transport, { tickMs, horizonMs, lateGraceMs, host, store });
```

Plus one line of import at the top: `import { storeLane } from './store.mjs';`
— or, to keep `transport.mjs` dependency-free (it currently imports nothing),
accept `laneFor: (kind) => rowsView` as the option instead of `store`, which
inverts the dependency and is probably the better shape.

**Three things this patch does NOT solve, and should not pretend to:**

1. `storeLane(reader, kind)` builds a kind→index map by walking the reader, which
   is O(n) and needs the pages resident. **For an archive the right answer is one
   reader per kind** — one JSONL + one sidecar per lane, which is also what makes
   a per-kind Range fetch touch only that kind's bytes. "Tracks are queries, not
   containers" stays true logically; physically, lanes want to be partitioned.
2. `reconcile(pos)` and `stats()` and `audit()` still iterate `events` whole.
   They are diagnostics and a seek path, both bounded in the live case and
   both wrong over an archive; they want the same windowing.
3. A store-backed `schedule()` writing into a JSONL reader's tail does not
   persist. The live path is `doStore` + the DO's batched `POST /session/<id>/
   events` at the ~100 ms flush plan-timeline C4 already specifies; that write
   half is deliberately absent here (read-only was the brief).

---

## 7. What a decades-scale ERR archive still needs beyond this

Extrapolating from the measured 1M-row point (73 B/row of JSONL, 95 B per page
entry at 4096 rows/page). Take a decade of a broadcaster's timeline at ~30
events/second across all sources ≈ **10⁹ rows ≈ 73 GB**, and forty years of it
≈ 300 GB.

**Index size.** The sidecar scales at 0.023 B/row — 10⁹ rows is a **23 MB
index**, forty years ~90 MB. That is small relative to the log and far too big to
fetch at `open()`. It needs a **second level**: a root manifest of segments (one
per year, or per show) of a few KB, and a per-segment sidecar fetched only when
you seek into it. The pattern already exists in this repo one layer up —
`proto/selfrec`'s show manifest → per-participant `manifest.json` →
`derived/index.json` is exactly this tree, and `postshow.mjs` already treats the
derived layer as regenerable-from-masters. The store's `open()` would take a
root manifest and lazily open a segment reader per year; `pagesForWindow` becomes
`segmentsForWindow` → `pagesForWindow`, the same bisect twice.

**Cold start.** Today `open()` is 1–2.5 ms because the whole sidecar is one
fetch. With a root manifest it stays ~1 ms; the first *seek* into a cold year
costs one segment-sidecar fetch (~100 KB) plus one page Range — call it two
round-trips, ~40–80 ms over the public internet. That is well inside the
fire-late policy's tolerance and nowhere near a stall. What genuinely hurts is
the **`doStore` boundary probing** (359 ms for five sequential round-trips on a
392-row session): a DO-backed archive segment must serve `firstAt/lastAt` per
page in its *own* index response — `GET /session/<id>/index` returning the page
table — instead of being probed one `limit=1` at a time. That is a ~15-line
addition to `workers/instrument/src/index.js` (one `SELECT at FROM events WHERE
sessionId=? ORDER BY at,seq LIMIT 1 OFFSET ?` per page, or one windowed query),
deliberately not made here.

**Cross-year queries.** This is the real gap, and the store as built does not
close it. Everything above answers a *positional* question over one ordered log:
"what is at t", "what straddles t". "Every event of kind X across forty years",
"every appearance of source S", "every redaction" are **queries**, and answering
them with this store means touching every page of every year. Three ways out,
in increasing order of honesty:

1. **Physically partition by kind at ingest** — one JSONL + sidecar per (kind,
   year). A cross-year single-kind query then Range-fetches only that kind's
   bytes, and the multi-kind merge is a k-way merge over k cursors, which is the
   same cursor. Cheap, no new infrastructure, and it also fixes `storeLane`'s
   O(n) map. This is the one to do first.
2. **A real index alongside the log** — an inverted index (kind → page list,
   source → page list) built by the same pass that builds the sidecar. Turns a
   cross-year kind query into a page list, and it is small: page-granular
   postings over 10⁹ rows are ~244 000 page ids per kind at worst.
3. **A query engine** — SQLite/DuckDB/Parquet over R2, or D1 per decade. Only
   worth it when the questions stop being "which pages" and start being
   aggregations. plan-timeline C4's amendment (**DO SQLite rows**) is already the
   right primitive at session scale; at archive scale the same rows want to land
   in a columnar file, and the `?from=&limit=` paging contract survives the move
   unchanged — which is the point of having made the store speak offsets.

**Two more that an archive forces and a session hides:**

- **Tombstones (C6) invalidate byte offsets.** A redaction compaction rewrites
  the log, so every sidecar downstream of it is stale. The stale-index guard
  added here *detects* that (byte-length binding, throws rather than parsing
  garbage) but does not *fix* it. An archive needs the sidecar to carry the log's
  content hash and the compaction job to rebuild sidecars as part of its own
  transaction — masters are truth, derived is regenerable, but only if something
  actually regenerates it.
- **Schema versions (C7).** `v` per kind means a forty-year log holds decoders
  for kinds nobody has run since 2031. The store is correctly indifferent — it
  moves rows, it does not read payloads — but `buildJsonlIndex` parses each line
  to get `at`, which is the one place a schema change could break indexing. It
  should read the stamp without full JSON parsing (the stamp is the first field
  by convention), so an index can be built over rows whose payloads this code
  cannot decode. Forward-compat by ignoring, never dropping — applied to the
  indexer.

---

## Commands

```
node timeline/lab/prop-store.mjs                 # full: builds a 1M-row fixture once, runs all 5 arms + bench
node timeline/lab/prop-store.mjs --quick         # 100k, no bench
node timeline/lab/prop-store.mjs --no-do         # skip the network arm
node --expose-gc timeline/lab/prop-store.mjs     # exact heap numbers
node timeline/lab/bench-store.mjs [--rows N]     # the bench table alone
```

Fixtures cache outside the repo (`$STORE_FIXTURES` or `$TMPDIR/positron-store-fx`);
the 1M-row log is 69.7 MB and builds in ~1 s. The lab's Range server binds
**127.0.0.1:8892** and is closed in a `finally`. **39 checks, 0 violations.**

## Kept / not kept

- **No CF resources created, no writes.** `doStore` is read-only against the
  already-KEPT session `smtc1hu37j5yeph` on `elektron-instrument`; no wrangler
  was invoked, no R2 touched.
- New files only: `timeline/store.mjs`, `timeline/lab/prop-store.mjs`,
  `timeline/lab/bench-store.mjs`, this file. `transport.mjs`, `logdeck.mjs`,
  `nested.mjs`, `prop-test.mjs`, `NOTES.md` untouched.
- No git commits.
