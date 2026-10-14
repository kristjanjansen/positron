# Kit lessons: ingest

The longer comments cut from `demo/shell/ingest.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-ingest.md#<anchor>`.

<a id="header"></a>

## `ingest.mjs` module header

```text
demo/shell/ingest.mjs — the one tokenless write path to R2, as a client.

`ingest.positron.studio` mints session ids server-side and enforces
per-segment / per-session / per-address caps in a single Durable Object, with
a 6-hour TTL and a cron that actually deletes. `selfrec` is the token-gated
path and stays separate: a public page cannot hold a secret, which is the
whole reason this exists.

Promoted out of `demo/capture/index.html` so a second page cannot copy it —
and with one correctness fix that the copy did not have. See `ship()`.
```

<a id="opensession"></a>

## `ingest.mjs` openSession

```text
Open a session. Returns `{ session, limits, expiresAt }` or null when refused.

A refusal is normal and is not an error: five sessions per address per hour is
a real cap, and the answer carries `retryInS`. Callers should say so rather
than reading as broken.
```

<a id="putwhole"></a>

## `ingest.mjs` putWhole

```text
Store one finished recording as a SINGLE object, and return its public url.

The API is segment-shaped because `record` proved the disk economics of
ship-then-delete: across a SHOW you never hold the whole thing and the
high-water stays at two segments however long it runs. That argument does not
reach a short take — a few hundred KB, well under the 2 MiB an object may be —
and slicing one costs real fragility for nothing: the worker requires a DENSE
sequence, so one refused piece poisons every later one, and a WebM assembled
from timeslice chunks only plays if its header chunk arrived first.

So a whole recording goes as segment 0 and the session is closed immediately.
What lands in R2 is a complete, directly playable file.

`shipper()` — the queued per-slice version — was here and is in the history if
a long recording ever needs it. It fixed a real latent bug in `capture` on the
way: that page fires its uploads without awaiting them, so two PUTs can be in
flight and arrive swapped, which the worker answers with 409 out-of-order. At
a 2 s timeslice it has never raced; it is still worth knowing.
```

<a id="createshipper"></a>

## `ingest.mjs` createShipper

```text
🔴 A RECORDING OF UNKNOWN LENGTH, SHIPPED AS IT HAPPENS, which is the case
`putWhole` above says it does not reach. Asked 2026-10-04 for `/patchbay/`'s
record link (plan-universal-routing §10 item 5): a link stays open until a
person unlinks it, so there is no whole take to send at the end.
⚠️ ONE PUT AT A TIME, IN ORDER. The worker requires a dense sequence and
answers a piece that overtook its predecessor with 409 out-of-order, which is
the race `capture` has and has never lost. A queue makes it impossible.
⚠️ AND ONE REFUSED PIECE STOPS THE SHIP, because every later one would be
refused as out of order anyway, and saying so once is the honest answer.
⚠️ `bytes` IS THE WORKER'S OWN COUNT FROM ITS ANSWER, never what was queued,
so the number a page shows was counted on the far side of the wire.
@param {string} session  a session from `openSession`
@returns {{ put(Blob): void, finish(): Promise<object|null>, stats(): object }}
```

<a id="provereadable"></a>

## `ingest.mjs` proveReadable

```text
Prove a stored object is READABLE, which a 200 on the PUT does not.

🔴 "UPLOADED" AND "READABLE" ARE TWO CLAIMS AND ONLY ONE OF THEM IS THE ONE
ANYBODY CARES ABOUT. A PUT answering 200 says a worker accepted the bytes. It
does not say the object is retrievable at the public URL, and the gap between
those two is exactly where a recording goes missing while every log line reads
fine. `proto/selfrec/participant.html` makes both claims separately and this
is that discipline in one function.

⚠️ IT REPORTS THE LENGTH RATHER THAN ONLY A BOOLEAN, because a 200 on a HEAD
with `content-length: 0` is the failure this is for: the object exists and is
empty. A caller comparing that against what it sent is making the real check.

@returns {Promise<{ok: boolean, status: number, bytes: number|null}>}
```
