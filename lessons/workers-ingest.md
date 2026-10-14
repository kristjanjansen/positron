# workers-ingest

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `workers/ingest/worker.mjs`

### header

Above `import { json as baseJson, OPEN } from '../_lib/http.mjs';`, lines 1 to 27 before the cut.

~~~js
// positron-ingest — a TOKENLESS write path to R2, with caps.
//
// The token-gated path was workers/selfrec, deleted from Cloudflare 2026-10-13;
// this is the public one, alone in one file.
//
// WHY TOKENLESS AT ALL. A public demo page cannot hold a secret — the same
// reasoning that made the relay tokenless. So instead of a credential, the
// blast radius is bounded by construction:
//
//   · the SERVER mints the session id, so a client cannot choose its prefix and
//     therefore cannot overwrite anybody else's
//   · every object lands under demo/ingest/<session>/ and nowhere else
//   · a segment is capped, a session is capped in both segments and bytes, and
//     an address is capped in sessions and bytes per hour
//   · everything expires, and a cron sweep actually deletes it
//
// None of those caps are advisory: they are enforced in the Durable Object that
// also does the accounting, so two parallel uploads cannot both pass a check.
//
//   POST /open                  -> { session, expiresAt, limits }
//   PUT  /seg/<session>/<n>     -> store one segment (video/mp2t)
//   POST /close/<session>       -> write index.m3u8 with ENDLIST, return the URL
//   GET  /show/<session>        -> { segments, bytes, closed, url }
//   GET  /limits                -> the caps, so a client can show them
//
// Objects are readable at https://archive.positron.studio/demo/ingest/<session>/
// which is the same public base 14 replay already plays from.
~~~

### one-tier

Above `/** Every cap in one place, and served at /limits so the page can display them. `..., lines 34 to 36 before the cut.

~~~js
// One tier since 2026-10-14: the token-gated `trusted` tier was selfrec's,
// had no other caller, and answered 403 on every segment (the session's
// principal was `tier:trusted`, every later route compared an address hash).
~~~

### segment-cap

Above `maxSegmentBytes: 24 * 1024 * 1024,      // one object, up to a whole session`, lines 40 to 53 before the cut.

~~~js
// ONE OBJECT MAY BE A WHOLE SESSION.
//
// This was 2 MiB, sized for one 4-second segment, which was right while every
// caller sliced. `keep` stores a whole take as a single object — slicing an
// eight-second recording buys nothing and costs the dense-sequence fragility
// — and against that a 2 MiB per-object cap is not a size limit, it is a
// silent limit on how long a take may be (~18 s at 900 kbps), enforced in the
// wrong place and reported as "segment too large".
//
// Raising it to the session cap changes NO abuse bound: an address is still
// held to 5 sessions and 64 MiB an hour, and a session to 24 MiB. Those are
// the guards; this was a shape.
//
// R2 itself would take ~5 GiB in one PUT. Nothing here is a platform limit.
~~~

### formats

Above `const FORMATS = {`, lines 63 to 71 before the cut.

~~~js
/**
 * What a segment may be, and what it is called.
 *
 * The first version of this hardcoded .ts and wrote an HLS playlist — which is
 * right for proto/archive (ffmpeg emits real MPEG-TS) and WRONG for a browser,
 * where MediaRecorder emits WebM. An HLS playlist listing WebM segments does not
 * play, so the store is format-aware and only writes a playlist for the format
 * that can actually use one.
 */
~~~

### quota

Above `export class Quota {`, lines 94 to 100 before the cut.

~~~js
/**
 * One DO for all accounting, so the caps are actually atomic.
 *
 * A per-request check against KV or isolate-local state would let two parallel
 * uploads both read "under the cap" and both write — which is how a cap becomes
 * a suggestion. Single object, single thread, no race.
 */
~~~

### window

Above `if (now - rec.windowStart > 3600_000) { rec.windowStart = now; rec.sessions = 0;`..., lines 129 to 129 before the cut.

~~~js
// a rolling hour, reset rather than decayed — simpler to reason about
~~~

### sweep

Above `async #sweep() {`, lines 196 to 199 before the cut.

~~~js
/**
 * Delete what has expired. Called by cron, because a TTL that nothing enforces
 * is a comment rather than a limit.
 */
~~~
