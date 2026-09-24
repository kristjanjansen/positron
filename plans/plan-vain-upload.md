# plan-vain-upload: put a broadcast in R2 and give it back, without a database

Status: **not started.** Written 2026-09-15, session 28, at the owner's request.
Nothing here is built. Proposed worker **`workers/vain`**, proposed bucket
**`vain-archive`**, proposed read host **`vain.positron.studio`**.

Companions: `research/radio-app-2026-09.md` (their app, end to end),
`research/radio-server-2026-09-15.md` (what their server does today), and
`workers/shout/NOTES.md` (the relay that already carries their live mount and
their first recording).

⚠️ **Three labels, and they are not interchangeable.** **READ** = it is in the
source or in a vendor's documentation, with the file and line or the URL.
**MEASURED** = something was asked and this is what it answered, with a date.
**INFERRED** = arithmetic or reasoning, flagged as such. Every Cloudflare number
below was fetched from their documentation on 2026-09-15 and is marked with the
page it came from. None of them is remembered.

---

## 0. One line

A contributor drops audio files on a page, they land in R2, and a second page
plays one back and scrubs it. No SQL anywhere, no Cloudflare Stream, and no
second copy of the truth.

---

## 1. The size of the thing, which decides almost everything else

READ, `workers/shout/NOTES.md:158`: a 128 kbit/s stream is about **57.6 MB per
listener-hour**. READ, `research/radio-server-2026-09-15.md` §3: their
recording pipeline is `ffmpeg -c copy` against that mount, so a recording is
that bitrate exactly. INFERRED from those two:

| a broadcast of | as their mount records it | as a 48 kHz 24-bit stereo master |
|---|---|---|
| 30 min | 28.8 MB | 518 MB |
| 1 h | 57.6 MB | 1.04 GB |
| 2 h | **115.2 MB** | 2.07 GB |
| 3 h | 172.8 MB | 3.11 GB |

READ, <https://developers.cloudflare.com/workers/platform/limits/> (fetched
2026-09-15): the **request body size limit** is *100 MB* on Free and Pro,
*200 MB* on Business, and *up to 5 GB* on Enterprise. It is a limit of the
**zone plan**, not of the Workers plan.

🔴 **So a two-hour broadcast, at the bitrate their own server writes, does not
fit through a Worker in one request on this account's likely plan.** That single
sentence settles question 1 before any preference is expressed. A design that
depends on knowing which plan the zone is on is a design that will be wrong once;
a design that never sends more than 16 MiB in a request is right on every plan.

⚠️ **Which plan the zone is on is NOT measured here.** The measurement is one
command: `PUT` a 120 MB body at any worker on the zone and read the status. A
413 means 100 MB. Do it before quoting a limit at anybody, and do not let the
answer change the design, because the design below does not use the headroom
either way.

READ, <https://developers.cloudflare.com/r2/platform/limits/> (fetched
2026-09-15), the numbers on the other side of the same problem:

| | |
|---|---|
| object size | 5 TiB |
| single-part upload | 5 GiB |
| multipart upload | 4.995 TiB |
| maximum upload parts | 10,000 |
| object key length | 1,024 bytes |
| object metadata size | **8,192 bytes** |
| concurrent writes to the same key | **1 per second** |

READ, <https://developers.cloudflare.com/r2/api/error-codes/>: multipart part
below **5 MiB** is `EntityTooSmall` (10011) except for the last part, and
**all non-trailing parts must have the same size** (10048, `InvalidPart`). That
second one is R2 being stricter than S3, it is not a detail, and a client that
picks its part size adaptively will fail at the end of a long upload rather than
at the start.

---

## 2. Where this goes: not `shout`, not `ingest`, a new worker

### Not `shout`

READ, `workers/shout/wrangler.jsonc`: it has no bucket binding and no Durable
Object binding. READ, the header of `workers/shout/worker.mjs`: the body is
passed through untouched and unbuffered, and the whole architectural claim is
that the worker holds a long connection and reads none of it. Adding a write
path means adding a bucket and a DO to the one worker whose value is having
neither, and giving the site's radio relay a new way to fall over.

⚠️ **What DOES carry over from `shout` is the `/rec/` branch, and almost all of
it.** READ, `workers/shout/worker.mjs`:

- the client's `range` header forwarded verbatim, because seeking in an hour of
  audio is a Range request and swallowing it turns every scrub into a fresh
  download;
- the status guard written `>= 400` rather than `!up.ok`, because a Range
  answers 206 and a guard on `ok` reports a working seek as a broken origin;
- `content-length`, `content-range`, `accept-ranges`, `last-modified` and `etag`
  copied through **and named in `access-control-expose-headers`**, because a
  browser that cannot read `content-length` cannot draw a scrub bar;
- `public, max-age=86400, immutable`, correct for a file and wrong for a stream;
- the name matched against a **pattern** rather than taken as a `?url=`
  parameter, proved by breaking it (READ, `NOTES.md`: traversal, a wrong
  extension, a capitalised extension and a short datestamp all answer 404).

What does **not** carry over is the reason the branch exists. `/rec/` re-serves
somebody else's web server because that server sends no CORS header. An R2
bucket on a custom domain returns its own CORS headers (§8), so the question
flips from *how do I re-serve this* to *does anything need to be in front of it
at all*, and the answer is no.

### Not `workers/ingest`

`workers/ingest` is the right shape and the wrong home. Three reasons, and the
first is the one the file makes about itself.

1. READ, `workers/ingest/worker.mjs` header: it is separate from `selfrec`
   precisely so that the auth story is not *all of them except this one*. Väin
   uploads are the mirror image of tokenless: a named contributor putting
   something into an archive that is kept. Adding a second auth model to the one
   file whose entire argument is having exactly one repeats the mistake in
   reverse.
2. READ, its `LIMITS`: 24 MiB a session, 45 segments, a **6-hour TTL with a cron
   that actually deletes**. A broadcast is 57.6 MB an hour and must be kept
   permanently. Every number would have to change, and those numbers are shared
   with an `open` tier that a public demo page depends on.
3. Its keys are `demo/ingest/<session>/seg00000.ts` under a server-minted
   session id, which is exactly right for a throwaway take and wrong for
   something a person will look for by name in five years.

⚠️ But its `trusted` tier already does the right thing (READ, `TIERS.trusted`:
`ttlHours: null`, caps at `Infinity`), and its Quota DO is the proven mechanism.
So the honest statement is: **the same design, a second deployment.** Copy the
structure, not the file, and say in both files that they are siblings.

### A new worker, and a new bucket

`workers/vain`: one R2 binding, one Durable Object, three write routes and
nothing else. READ, `workers/store/wrangler.jsonc`, which already argues this
exact split: a separate script gets its own deploy and its own failure, and
nothing in it can slow the thing it sits beside.

🔴 **Not the `elektron-archive-test` bucket.** READ,
`workers/ingest/wrangler.jsonc` and `workers/selfrec/wrangler.jsonc`: two
workers already share it, its name says `test`, and `workers/ingest`'s cron
sweep deletes every object under a prefix in it. Material somebody cannot
re-record does not go in a bucket that has a delete loop in it, one prefix typo
away.

---

## 3. Decision 1: how the bytes travel

**Pieces of 16 MiB, each one a `PUT` at the Worker, assembled by R2's multipart
API through the binding. No presigned URLs.**

### Why pieces rather than one PUT

Three separate reasons, and any one of them is enough:

- **The body limit.** §1. A piece is 16 MiB; the smallest plan's limit is 100 MB.
  The wall stops existing rather than being negotiated with.
- **Progress that is evidence.** A single PUT gives byte counts from the browser
  and one acknowledgement, at the end. Pieces give an acknowledgement every
  16 MiB, from the far side of the wire. CLAUDE.md: *a count is only evidence on
  the far side of the boundary*, and `createMidiLane`'s `scheduled()` is the
  recorded case of a counter that read identically to delivery while every note
  was fifty-six years out. §4 depends on this.
- **A retry that costs 16 MiB instead of 500 MB.** READ, the R2 Workers API
  reference: an uncompleted multipart upload auto-aborts after 7 days, so a
  dropped connection leaves nothing behind and the completed parts are still
  there to resume against.

INFERRED: 10,000 parts at 16 MiB is a ceiling of 156 GiB, which is past anything
in this material by three orders of magnitude. 16 MiB is over the 5 MiB floor
with room, and small enough that the slowest plausible uplink acknowledges one
inside a minute.

⚠️ **The part size is fixed at `POST /open` and never adapts.** R2 refuses
non-uniform non-trailing parts (READ, error 10048), so a client that speeds the
pieces up when the link looks good fails at `complete()`, after every byte has
been sent. The server declares the piece size and the client obeys it.

### Why not presigned URLs

READ, <https://developers.cloudflare.com/r2/api/s3/presigned-urls/>: R2 presigns
GET, HEAD, PUT and DELETE, with an expiry from 1 second to 7 days. POST form
uploads are not supported. So a presigned PUT straight to R2 is genuinely
available and it is genuinely cheaper on paper, because no Worker touches a byte.
It is rejected on three grounds:

1. **It needs an S3 credential to exist.** A presigned URL is signed with an
   account access key pair held as a Worker secret. The binding path needs no
   such credential at all. This repo has a `research/SECRETS-ROTATION.md`; the best
   secret is the one that was never created.
2. 🔴 **R2 sends no CORS headers on an expired presigned URL.** READ,
   <https://developers.cloudflare.com/r2/buckets/cors/>: an expired URL returns
   403 `ExpiredRequest` and the response carries no CORS headers, so browser
   JavaScript cannot read the error body. That is precisely the failure shape
   CLAUDE.md names: *an error string cannot tell "API absent" from "API
   blocked"*. An upload that dies at minute 40 of a long file would report
   nothing a page could show a person.
3. **The caps cannot be enforced through it.** READ,
   `workers/ingest/worker.mjs`, in the `PUT /seg` route: the body is read FIRST
   so the charge is against the real length rather than a client-declared
   `content-length`. A presigned URL is a hole the quota object cannot see
   through; bounding it means signing a `content-length`, and a client that
   sends a different one gets a 403 `SignatureDoesNotMatch` that, by (2), it
   cannot read either.

⚠️ **One thing about the presigned route is untested and is not the reason it is
rejected.** R2's documented presigned methods do not include `POST`, which is
what `CreateMultipartUpload` uses, so a presigned multipart flow would need the
Worker to create and complete the upload through the binding and presign only
the `UploadPart` PUTs. Whether an uploadId minted by the binding is valid for an
S3 `UploadPart` call is **not confirmed and was not measured**. It does not
matter for this plan. It would matter if egress through the Worker ever turned
out to cost something worth measuring, which is the trigger to come back here.

### The cost of the chosen route, stated rather than hidden

Every byte is read by a Worker. READ, the Workers limits page: an HTTP request
has **no duration limit**, and CPU on a pass-through stream is small, so this is
not a wall. It is one billable request per 16 MiB and one extra hop
(browser, colo, R2) instead of (browser, R2). INFERRED, and **not measured**:
R2 sits behind the same edge, so the hop is unlikely to be visible against the
uplink. If it ever is, §3's rejected option is where to look.

### The routes

```
POST /open          {name, size, type}  -> {id, key, pieceBytes, pieces, limits}
PUT  /piece/<id>/<n>   the bytes        -> {ok, n, bytes, etag}
POST /close/<id>    {meta}              -> {ok, url, key, bytes}
POST /abort/<id>                        -> {ok}
GET  /limits                            -> the caps, so a page can show them
```

`/open` mints the id and the key; the client never chooses either. That is
`workers/ingest`'s rule and its reason is the same: a client that picks its own
prefix can overwrite somebody else's.

---

## 4. Decision 2: progress, concretely

### Which events

**`XMLHttpRequest`, not `fetch`.** READ,
<https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload>
(fetched 2026-09-15): `XMLHttpRequestUpload` fires `loadstart`, `progress`,
`abort`, `error`, `load`, `timeout` and `loadend`, and `progress` is
*periodically delivered to indicate the amount of progress made so far*.
`fetch()` has no upload progress event. INFERRED, and worth confirming on real
devices before relying on it: a streaming request body (`duplex: 'half'`) exists
in Chromium and not in WebKit, and even where it exists it reports bytes pulled
from the stream rather than bytes the server has taken, so it is not a
substitute.

So there are **two quantities and they are different**:

| | where it comes from | what it is worth |
|---|---|---|
| bytes sent | `xhr.upload.onprogress` on the piece in flight | it moves smoothly, and on a slow link with a large socket buffer it can read 100% while nothing has been acknowledged |
| pieces accepted | a 200 from `PUT /piece/<id>/<n>` | it moves in steps, and every step is a fact from the far side |

Both are shown. The first is the one that makes a long upload feel alive; the
second is the one that is true. Showing only the first is the `scheduled()` bug
again.

### What the page draws

**A readout of four cells, and every one of them moves.**

| cell | unit | what it is |
|---|---|---|
| `sent` | MB | bytes handed to the socket across the whole drop |
| `pieces` | (none) | accepted, against the total: `7 of 24` |
| `speed` | MB/s | over the last few seconds, not since the start |
| `left` | s | remaining bytes over that speed |

Four is even, so `mount()` accepts it (READ, `demo/shell/shell.mjs:76`, which
throws on an odd count). Nothing in it is a structural constant. ⚠️ `left` is
the derived cell and the first suspect if it ever reads as noise; it cannot go
alone, because `speed` is what it is derived from and the two leave together,
which keeps the count even.

**One row per file, in a `table.mjs` table.** READ, `demo/shell/table.mjs`: it
takes columns the caller declares, with `width`, `grow`, `align`, `clip` and
`hover`, and it throws unless exactly one column grows. Columns: `name` (grow,
clip, hover the full name), `size` (fixed, right), `state` (**fixed width**,
right). CLAUDE.md, in two rules that both apply here:

- 🔴 nothing that redraws every frame may change how much room it takes. A fixed
  `state` column cannot reflow; a sentence under the table would.
- 🔴 a page does not narrate its own state in sentences. There is no
  *"Uploading part 7 of 24, 3.2 MB/s, about 40 seconds left"* anywhere on this
  page. Every figure in that sentence has a cell.

**Colour says how it landed, never which file it is.** CLAUDE.md's one meaning
for colour: grey for not started, slate for in flight (moving, and this row
cannot yet say how it went), green for accepted, amber for accepted after a
retry, red for refused. The file's identity is its name and its row.

**The log takes one line per piece accepted and one per failure.** Text that
moves when something happened rather than on a clock is allowed, and a log is
the place CLAUDE.md names for a state change.

### Granularity

`upload.onprogress` fires at whatever rate the browser chooses. Coalesce into a
**250 ms tick** and write the readout from that, so the cells change four times a
second rather than at the browser's whim. `pieces` changes only on an
acknowledgement, which is a real event and needs no throttle.

⚠️ **And a harness note, because this page would otherwise read as broken.**
CLAUDE.md: `verify.mjs` stops collecting 400 ms after the last assert, and its
stabiliser only waits while the count is still growing. A real upload takes
longer than that. Every assert about an upload belongs behind **control 0**,
which is the only control that gets `settleMs`, and the asserts must land in one
burst at the end rather than being spread across the upload.

---

## 5. Decision 3: many files at once

**Two files in flight, in the order they were chosen. Within one file, pieces
strictly in sequence, each awaited.**

- **Two, not one**, so a file stalled on a slow acknowledgement does not idle the
  uplink. **Two, not five**, because more parallelism across one uplink mostly
  redistributes the same bandwidth while making every file's progress bar lie
  about its own share, and because a failure among five concurrent uploads is
  harder to attribute than a failure among two.
- **Pieces in sequence and awaited.** READ, `workers/ingest/worker.mjs`,
  `#charge`: it requires a dense sequence and answers 409 `out of order`
  otherwise. READ, `demo/shell/ingest.mjs`, the `putWhole` docstring: `capture`
  fires its uploads without awaiting them, so two PUTs can be in flight and
  arrive swapped, and *at a 2 s timeslice it has never raced*. That is a latent
  bug with a known name in this repo. Do not ship a second copy of it.

### When one of five fails

🔴 **The other four land, and the fifth says what happened, in its own row, in
words.** Never a *"4 of 5 uploaded"* and nothing else. CLAUDE.md: *a partial
result that is too tidy is a broken collector, not a finding*, and its examples
are exactly this shape (exactly 4 of 5 events, exactly 0 across every case).

- A **refusal is not an error.** READ, `demo/shell/ingest.mjs`: a cap refusal is
  normal, carries `retryInS`, and callers should say so rather than reading as
  broken. A 413 for an over-size file, a 415 for a format, a 429 for a quota:
  each gets its own words and its own colour, and none of them is red.
- A **retry is bounded**: three attempts on a piece, with backoff, then the file
  stops and names the piece it stopped on. CLAUDE.md: a recovery action is not
  free, it must be rate-limited and it must yield rather than retry for ever.
- A **failed file leaves nothing behind.** Its multipart upload is never
  completed, so no object exists, and R2 aborts the upload itself after seven
  days (READ, Workers API reference). There is no half-file to clean up and no
  half-file for a listing to trip over. That property is the quiet half of the
  answer to §7.
- **Order of completion is not order of selection.** Two files in flight means
  the second can finish first. The table stays in selection order; the log is in
  event order. Two surfaces, two orders, both honest.

---

## 6. Decision 4: size and MIME, and where they are enforced

### Where

🔴 **In the Durable Object, charged against bytes actually read.** A check in the
browser is a courtesy that fails fast and is not a limit. READ,
`workers/ingest/worker.mjs`: one DO does all the accounting so the caps are
atomic, because a per-request check against KV or isolate state lets two
parallel uploads both read *under the cap* and both write, *which is how a cap
becomes a suggestion*.

Three points of enforcement, in this order:

1. **`POST /open`** reads the declared `{size, type}` and can refuse before a
   byte is sent. This is the courtesy, and it is also real: the declared size is
   recorded.
2. **`PUT /piece`** charges `buf.byteLength`, the length the Worker actually
   read, not a header. A declared size that was a lie is caught at piece 0.
3. **`POST /close`** refuses to complete if the accumulated bytes do not match
   what was declared and charged.

### What

Argued from the material rather than picked:

| cap | value | why |
|---|---|---|
| one file | **500 MB** | INFERRED: 8.7 hours of their 128 kbit/s mount, longer than any broadcast in the material, and 29 minutes of a 48 kHz 24-bit stereo master, which is a plausible studio file |
| one drop | **2 GB, 20 files** | a session a person can supervise |
| piece | **16 MiB** | §3 |
| per contributor per day | **10 GB** | INFERRED, a placeholder. It should be set from the first month of real use, not now |

⚠️ **This path is token-gated, and that is the point of it being a separate
worker.** `workers/ingest`'s open tier exists because a public demo page cannot
hold a secret. A contributor upload page is not that; it has somebody behind it.
READ, `workers/ingest/worker.mjs`, `tierOf`: the open tier is the **default
value, never an else-branch**, because the mistake in the other direction hands
an anonymous caller the untimed path. `workers/vain` has no open tier at all,
which is a stronger version of the same rule: there is no default to get wrong.

### MIME, checked on the bytes

🔴 **`File.type` is a client claim derived from the file extension. It is a hint
for the form and it is never the check.** The Worker reads the first bytes of
piece 0 and matches a magic number:

| format | what is at the front |
|---|---|
| MP3 | `ID3` at byte 0, or a valid Layer III frame header |
| WAV / BWF | `RIFF` at 0, `WAVE` at 8 |
| FLAC | `fLaC` at 0 |
| Ogg | `OggS` at 0 |
| MP4 / M4A | `ftyp` at byte 4 |

Anything else is a **415 that names the first four bytes it found**, so the
person can see why.

⚠️ For the MP3 case, reuse `demo/shell/mp3-frames.mjs` rather than writing a
sync test. READ, its docstring: *a sync word is not a frame*, eleven set bits
occur in ordinary audio about once every 2 KB by chance, every field is
validated, and a candidate is confirmed by finding another header at
`i + length`. A bare `0xFF 0xEx` test would pass on a JPEG often enough to
matter.

⚠️ **And a magic number is a format check, not a safety check and not a
playability check.** It says the file begins the way that format begins. The
only thing that proves a file plays is playing it, which is what §9's first
build does and why that is the first build.

---

## 7. Decision 5: metadata, and the recorded date in particular

### Where a recorded date actually lives

| container | field | where | readable in a browser without the whole file |
|---|---|---|---|
| MP3 | ID3v2 `TDRC` (v2.4), `TYER` + `TDAT` (v2.3) | a tag at byte 0 whose length is in its own first 10 bytes | **yes**: read 10 bytes, then read the length they declare |
| MP3 | ID3v1 `year` | the **last 128 bytes** of the file | **yes**: `file.slice(size - 128)` |
| WAV / BWF | `bext` chunk, `OriginationDate` (`yyyy-mm-dd`) and `OriginationTime` (`hh:mm:ss`) | inside the `bext` chunk, at offsets 320 and 330 of its data, and the chunk is normally near the top | **yes**, by walking chunks in the first 64 KiB |
| FLAC | `VORBIS_COMMENT` block, `DATE=` | after `fLaC`, in length-prefixed blocks with `STREAMINFO` first | **yes** |
| Ogg Vorbis / Opus | the comment header | the second packet, so within the first few KiB | **yes** |
| MP4 / M4A | `mvhd` `creation_time` (seconds since 1904-01-01 UTC), and `©day` under `moov/udta/meta/ilst` | inside `moov`, which **may be at the end of the file** | **sometimes.** A file that was not written faststart needs a read from the tail |

**The browser reads them, not the server.** Two reasons: the server would have to
range-read the object back out of R2 immediately after writing it, which is a
second pass over bytes it has just seen; and the browser already has the file
open with the OS cache warm. `File.slice(a, b).arrayBuffer()` reads a range
rather than the file.

⚠️ That last sentence is INFERRED from the File API's design and is **not
measured**. It is worth measuring on a 500 MB file before the plan leans on it,
because a browser that quietly reads the whole file to satisfy a slice turns
metadata extraction into a second upload's worth of disk on a phone. The
measurement is a timer around one slice of a large file.

⚠️ And the server must not **trust** what the browser sends. An extracted date is
a client claim like every other field in the body. It is stored as a claim with
a named source, which is the next part and is the part that matters.

### The date model is already decided. Do not invent a second one.

READ, `timeline/transport.mjs:540-620`, `normalizeWhen`. Every date in this
project is:

- a **closed-open bracket**, `earliest` and `latest`, never a point. A
  zero-width bracket throws, and its error message says a crisp position is
  expressed by omitting `when` entirely.
- `rule`: the **versioned named rule** that produced the bracket, REQUIRED,
  matching `<name>@<int>`, so that when a heuristic changes the affected rows are
  one `WHERE rule = …` away. There are exactly two reserved unversioned
  literals: **`'hand'`, meaning a human typed it**, and `'unknown'`.
- `kind`: `'ignorance'` (a fact of the matter exists and the catalogue lost it,
  so narrowing is a repair) or `'vagueness'` (no fact of the matter exists, so
  narrowing is a falsification).
- `verbatim`: what the source literally said.

🔴 **So "how does a reader tell a read date from a typed one" is already
answered and needs no new field.** A read date carries a versioned rule; a typed
one carries `'hand'`. And `/tapes/` already draws the difference: READ,
`demo/tapes/index.html` around line 1055, a span built from a date is
`vagueness` or `ignorance` and is drawn feathered with bracket terminators,
while a span built from a measured length is exact and drawn as a plain bar, and
`timeline/strip.mjs:1921` renders *no exact date exists* for the vague case. A
typed date shown as a crisp bar would be this project's own named failure:
fabricated precision.

The rules this route would add:

| source | rule | bracket | kind | note |
|---|---|---|---|---|
| their recording filename `<slug>-YYYYMMDD-HHMMSS.mp3` | `vain-recname@1` | 1 second | ignorance | **the best source for their material**: READ, `workers/shout/worker.mjs`, `REC_NAME`; their own hook writes it at the moment the broadcast starts |
| BWF `bext` date + time | `bext-origination@1` | 1 second | ignorance | what a field recorder writes, and the best source generally |
| ID3v2 `TDRC` | `id3-tdrc@1` | as precise as the string is: a year, a day, a second | ignorance | the tag kept what it kept |
| ID3v2 `TYER` | `id3-tyer@1` | 1 year | ignorance | |
| FLAC / Ogg `DATE` | `vorbis-date@1` | as precise as the string is | ignorance | |
| MP4 `mvhd` creation_time | `mp4-mvhd@1` | 1 second | ignorance | this is when the **container** was created, which is not always when the sound was made. The `note` field says so |
| `File.lastModified` | `file-mtime@1` | 1 second | ignorance | the filesystem's last-write time, which after a copy or an rsync is the copy's date |
| somebody typed it | **`hand`** | whatever they typed | either | §7's override |

🔴 **`file-mtime@1` is last and must never be promoted quietly.** It is the one
source that **always** has a value, so in any ranking by availability it wins
every tie and silently becomes the only source anyone ever sees. A source that
cannot fail is a source that has to be ordered by hand.

### The override

**A typed date is a second row, not an edit.** Both are kept:

```json
"when":      { "earliest": …, "latest": …, "rule": "hand", "kind": "ignorance",
               "verbatim": "spring 1998", "note": "corrected by <who>, <when>" },
"whenRead":  { "earliest": …, "latest": …, "rule": "id3-tyer@1", "kind": "ignorance",
               "verbatim": "1998" }
```

Reasons, and they are this project's, not new ones: a value nobody can re-audit
will be wrong silently; `normalizeWhen`'s own comment says the versioned rule
exists so a changed heuristic can be found by `WHERE rule = …`, which only works
if the read row is still there; and CLAUDE.md records that a measurement
outranks a repeated claim, proved by shipping a liar. The page shows the typed
date and shows, in one line, what the file said.

⚠️ **An override with no `verbatim` and no `note` is not an override, it is a
number nobody can question.** Both are required when `rule` is `hand`.

### The rest of the metadata

- **Title and artist** from ID3 or Vorbis, offered as a **suggestion in the
  form**, never stored as the title. The stored title is what the person typed.
- **Duration and bitrate**: not from a tag, because tags lie, and not from
  scanning every frame, because on a 500 MB file that is a whole-file pass.
  Read it **after** the upload by pointing an `<audio>` element at the object's
  URL. ⚠️ Two traps already recorded: CLAUDE.md, `MediaRecorder` output reports
  `duration: Infinity` and needs a seek far past the end before the browser will
  resolve it; and `demo/tapes/index.html` around line 1030 records the MEASURED
  fact that a 2 KB range request answers in about a second while
  `loadedmetadata` on the same file can take far longer. So **duration is
  allowed to be absent**, it is filled in later, and a missing one prints as one
  em dash with the unit hidden (CLAUDE.md's readout rule), never as `0`.

---

## 8. Decision 6: 🔴 no SQL to sync against R2, and what that costs

### First, name the wish precisely

It is not *no database*. It is **no second copy of the truth**. A SQL table
beside a bucket is two stores that can disagree, and every failure below is one
of those disagreements: an object with no row, or a row with no object.

### The options, and what each one breaks

**(a) R2 custom metadata on the object itself.**
READ, the R2 limits page: object metadata is capped at 8,192 bytes in total, and
custom metadata is part of that. READ, the Workers API reference: `list()` does
**not** return `customMetadata` unless you pass `include: ['customMetadata']`,
and including it *may reduce results returned*.
What breaks: **editing**. Custom metadata cannot be changed without rewriting
the object, and rewriting a 100 MB object to correct a typed date is absurd.
That alone disqualifies it for the field the owner explicitly said must be
overridable. Also: no filtering, no sorting, no search. `list()` orders by key
and by nothing else.
Verdict: **keep it, for the immutable half only.** What was read out of the file
at upload time, plus the upload session id, plus the declared MIME. It is the
one store that cannot drift from the object, because it is part of the object.

**(b) A sidecar JSON object per file.**
What breaks: **two writes, and the second one can fail.** That is the exact split
being avoided, minus the SQL. Two things make it survivable and both are free:
- **Order.** Write the audio first and the sidecar last. A half-failure then
  leaves audio with no sidecar, which is recoverable by reading the audio again,
  rather than a sidecar pointing at nothing, which is a ghost that outlives
  everybody who remembers it.
- **Multipart.** §5: an incomplete multipart upload is not an object, so *audio
  half-written* is not a reachable state. The file is there or it is not.
Cost: listing is one `list()` per 1,000 keys (READ: `limit` defaults to 1,000 and
maxes at 1,000) plus **one GET per sidecar**. At 50 recordings that is 51
requests and is fast. At 5,000 it is not.
Verdict: **this is the store of record for everything editable.**

**(c) `list()` as the index.**
What breaks: **ordering and search.** `list()` is lexicographic by key, with
`prefix` and `delimiter` and nothing else. There is no order-by-date and no text
search.
Partly repairable by **naming the key so its sort is the order you want**. But
if the key encodes the recorded date, then correcting a date means copying the
object, which is (a)'s problem again. So the key encodes the **upload** time,
which is never corrected.
Pagination: 1,000 per page with a `cursor`. That is the honest ceiling and it
should be written on the page rather than discovered.
Verdict: `list()` is the **enumeration**, not the index. It answers *what objects
exist*, which is the one question no other store can answer truthfully.

**(d) A Durable Object holding the listing.**
This is `workers/items` again and the shape is proven here (READ,
`workers/items/src/index.js`: `idFromName(room)`, SQLite inside, an alarm).
What breaks: **it is SQL**, which is the thing being avoided, and it is SQL only
one object can read, so nothing else can repair it when it drifts. It
reintroduces two-stores-disagree with the second store hidden inside a DO.
🔴 And it carries this repo's own recorded traps: READ,
`workers/items/src/index.js`, a DO does not know its own name because the alarm
fires with no request and `idFromName` tells an object nothing; and CLAUDE.md's
FCM incident, where a shared resource in a partitioned system sent two real
notifications to every subscriber for a day and the bug was *true of every part
and of no part's author*.
Verdict: **not as the index.** It comes back below for one job it is uniquely
good at.

**(e) KV.**
What breaks: **eventual consistency.** A file uploaded a second ago may not be in
the listing, and a listing that is confidently missing something is worse than a
listing that is slow. It is also (c)'s problems plus a second store to keep in
step.
Verdict: no. It buys nothing over (b).

### The pick

🔴 **R2 is the only store. `list()` enumerates, one sidecar JSON per recording
holds everything editable, custom metadata holds what was read at upload and can
never be edited, and nothing anywhere else holds a copy.**

```
vain/<YYYYMMDD-HHMMSS>-<id>/audio.<ext>     the bytes, custom metadata on them
vain/<YYYYMMDD-HHMMSS>-<id>/meta.json       the record, rewritable
```

A directory per recording, so `list({ prefix: 'vain/', delimiter: '/' })` returns
the **recordings** as `delimitedPrefixes` rather than every file (READ, the
Workers API reference: a delimiter groups keys, so `foo/bar/baz` with delimiter
`/` returns `foo`). One call enumerates, ordered by upload time by construction,
reversed for newest first, which is the ordering the front page already uses
(CLAUDE.md).

### 🔴 The downside, named

**You cannot ask this store a question. You can only read all of it.** There is
no *everything recorded in 1998*, no *everything by this contributor*, no
*everything over an hour*, without fetching every `meta.json` and filtering in
the page. At the scale of this material, which is currently **one 7-second test
recording** (MEASURED 2026-09-15, `research/radio-server-2026-09-15.md` §3),
that is fine and will be fine for years. At a few thousand it is not.

The repair, when it is needed and not before, is **an index that is a cache and
not a store**: one `vain/index.json`, one line per recording, rewritten after
every upload. It is allowed to be stale and it is allowed to be wrong, because it
can always be rebuilt from `list()` plus the sidecars. ⚠️ **And the rebuild
endpoint must exist and must be run**, because that is the only thing separating
a cache from a second source of truth. A cache nobody has ever rebuilt is a
database with an optimistic name.

⚠️ `vain/index.json` is a single key with concurrent writers, and READ, the R2
limits page: **maximum 1 concurrent write per second to the same key**. Two
uploads finishing in the same second race, and a lost write to an index is
invisible. **That is the one job the Durable Object comes back for.** It already
exists for the caps, it is single-threaded by construction (READ,
`workers/ingest/worker.mjs`: single object, single thread, no race), and it holds
**no listing data of its own**: it holds the lock and a rebuild flag. A DO that
caches nothing cannot drift.

### The half-failures, answered one by one

| state | reachable | what happens |
|---|---|---|
| audio half-written | **no** | an incomplete multipart upload is not an object |
| audio, no `meta.json` | yes: the sidecar write failed | `list()` shows the prefix with an audio object and no sidecar. The record is **shown**, with everything unknown except what R2 knows (key, size, upload time) and what custom metadata carries (the read date), and it says so in words |
| `meta.json`, no audio | only if the write order was violated | shown, saying the audio is missing |
| a charged session that produced nothing | yes | it expires in the DO, the same way `workers/ingest` expires one |

🔴 **A broken record is SHOWN, never hidden.** CLAUDE.md, about `caps.mjs`: a
vanished row says the thing does not exist, which is a different and false
statement. A file nobody can see is a file nobody will ever fix.

---

## 9. Decision 7: serving it back

**A plain object with Range, from an R2 custom domain. No HLS, and no Worker in
the read path.**

### Why a plain file

What a scrubbing client needs is a byte range and a known length, and that is
what a static object over HTTP already is. This is not a guess: MEASURED
2026-09-15 (READ, `workers/shout/NOTES.md`), on this exact material through
`shout`'s `/rec/` branch, a recording answers 200 with `content-length` and
`accept-ranges`, and a Range answers `bytes 1000-1999/116823`. `demo/tapes`
already scrubs files this way.

### Why not Cloudflare Stream or LL-HLS

READ, CLAUDE.md:471 and 481-483: **Stream bills minutes, not bytes**, and this
account has a **1000 storage-minute cap that blocks new live streams when it
fills**, at roughly 225 minutes a day of ordinary testing. INFERRED: 1000
minutes is **16.7 hours**, so an archive of a dozen broadcasts would consume the
entire cap, and the failure is not a bill, it is an outage on the live demos.

READ, CLAUDE.md, the LL-HLS entry: audio-only LL-HLS on this provider is not
lower latency, only smaller (3.88 s against 3.82 s), and the byte saving is
*worth exactly $0 on this provider* because the meter is duration. And latency is
not the question here in any case. Nothing about a finished broadcast is live.

### When HLS would be worth it, so this is not re-argued

1. **More than one rendition**, where a client has to choose. There is not: the
   material is one 128 kbit/s MP3.
2. **When a byte offset cannot be turned into a time.** This is the real one.
   Seeking in a constant-bitrate MP3 by byte offset is exact; seeking in a
   variable-bitrate MP3 with no Xing or VBRI header is a guess. Their
   `ffmpeg -c copy` of a CBR mount is CBR, so it is exact today, and a
   contributor uploading a VBR file changes the answer. The page must be able to
   say *this file's positions are approximate* rather than being quietly wrong.
   INFERRED from the format, **not measured**, and it is the second measurement
   this plan asks for.
3. **When the client cannot hold the whole thing.** It can; that is what a Range
   request is.

### Does a Worker sit in front of it

Only if it has a job, and the obvious job is already done for it. READ,
<https://developers.cloudflare.com/r2/buckets/cors/>: a custom domain connected
to an R2 bucket with a CORS policy **automatically returns CORS response headers
for cross-origin requests**. CORS is the one thing `shout` exists for, and on an
R2 custom domain it needs no worker at all.

So: **a public bucket on `vain.positron.studio`, a CORS policy on the bucket, and
nothing in the read path.** If the archive ever needs to not be public, that is
the moment a read worker earns its place, and it will look a great deal like
`shout`'s `/rec/` branch, which §2 lists piece by piece.

---

## 10. What to build first

**One file, in pieces, played back and seeked. Nothing else.**

1. `workers/vain`: a new bucket, one DO, `POST /open`, `PUT /piece/<id>/<n>`,
   `POST /close/<id>`, `POST /abort/<id>`, `GET /limits`. Caps in the DO,
   charged on bytes read.
2. A page that takes **one** file, uploads it in 16 MiB pieces with
   `XMLHttpRequest` progress, and then **plays it back from the public URL with a
   transport bar that seeks.** The seek is the point. An upload that reports
   success and cannot be scrubbed is what a fake success looks like here, and it
   is indistinguishable from a real one until somebody drags the bar.
3. The asserts, all behind control 0 so `settleMs` covers them:
   - the object's size equals the file's size;
   - a Range GET for bytes 1000-1999 answers **206** with a `content-range`;
   - a seek to 60 s lands within a second of 60 s;
   - the date the page read out of the file is on the record with a **versioned
     rule**, and a typed override sits beside it with rule `hand` and both are
     visible;
   - the piece count on the page equals the part count R2 completed.
4. **Prove one guard by breaking it**: send a piece of the wrong size and watch
   `complete()` refuse, or send a JPEG renamed `.mp3` and watch the 415 name the
   first four bytes. CLAUDE.md: printing *ok* is not evidence.
5. **Test against a file of real size that this repo generates itself.** A
   90-minute tone from ffmpeg at 128 kbit/s is 86.4 MB by construction. Do not
   prove this route on the 7-second test recording, which is the only real file
   that exists.

### What must NOT be built until that is green

- **No multi-file queue.** One file proves the transport. Five files prove a
  scheduler, and a scheduler over a broken transport is five copies of one bug.
- **No `index.json`, no lock, no rebuild.** Until a `list()` sweep is measurably
  slow, the index **is** `list()`. Building the cache first means building a
  cache nobody can measure against the thing it caches.
- **No resume across a page reload.** It needs the uploadId and the part list to
  survive, which means a second place they are written down, which is §8's whole
  problem in miniature. It is a good feature and it is the second one.
- **No second metadata parser.** Read one field from one container (their
  filename, since it is their material), prove it reaches the page as a read
  date distinguishable from a typed one, then add the table in §7 one row at a
  time.
- **No strip lane per file.** `table.mjs` exists (READ, `demo/shell/table.mjs`)
  and a fixed-width state column already satisfies the no-reflow rule. A strip
  is a time axis and an upload is arguably one, which makes it a judgement call
  and therefore a question for the owner, not a thing to build quietly.
- **No HLS, no transcoding, no waveform.** Each is a project.

---

## 11. Done when

1. A 90-minute file uploads from a laptop and from a phone, and both report a
   piece count that matches what R2 completed.
2. The same file plays back from `vain.positron.studio` and seeks to 60 minutes
   in under a second.
3. Killing the network mid-upload leaves **no object** in the bucket, and the
   page says which piece it stopped on.
4. A date read from the file and a date typed over it are both on the record,
   both visible, and told apart by their `rule` without the reader having to
   know anything.
5. `node demo/verify.mjs vain` moves by exactly the asserts added, diffed
   against the last known total (CLAUDE.md: assert both modes, watch the count).
6. The page is handed over as a **URL**, deployed, with the worker up.
   CLAUDE.md is explicit and the rule has been broken by its own author: a slug
   is not an answer to *where is it*.

---

## 12. The risks, in order

🔴 **1. The material does not exist yet.** MEASURED 2026-09-15
(`research/radio-server-2026-09-15.md` §3): **one recording exists and it is
seven seconds of a test**, and their Icecast was answering zero bytes on both
mounts that morning. Every real assumption in this plan (a body over 100 MB, a
uniform part size at the end of a long upload, a seek an hour into a file, a date
in a `bext` chunk) is untested on anything but a 116 KB file. The whole plan can
go green on that file and be wrong about all of it. This is why §10 generates a
90-minute file rather than waiting for one.

**2. The plan-dependent body limit.** Not measured. It does not change the
design, because no request in it exceeds 16 MiB, and that is the reason to keep
it that way even if the zone turns out to be on Business.

**3. The sidecar sweep is O(n) and nobody will notice when it stops being
cheap.** §8's downside, named. The trigger to build the cache is a measured page
load, not a feeling, and the rebuild endpoint ships with the cache or the cache
does not ship.

**4. `file.slice()` on a large file.** INFERRED, not measured. If a browser reads
the whole file to satisfy a slice, metadata extraction on a phone becomes an
upload's worth of disk before the upload starts. One timer answers it.
