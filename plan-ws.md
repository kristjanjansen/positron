# plan-ws — one message shape, and a backlog that is ours to write

Status: **not started.** Written 2026-09-09 from a spoken request; §0 records what
I think was asked and what I could not make out, because acting on a wrong
reading of a dictated brief is expensive.

---

## 0. The request, as I read it — correct me here first

1. A **general WebSocket demo**: compose a message, send it, see exactly what
   travels. Not another demo that happens to use a socket — a demo *about* the
   socket.
2. **One standard message shape**, the one our demos already use, shown
   explicitly. Newline-delimited JSON was named alongside the Csound and media
   work.
3. **Subscriptions** — some way to say which messages you want, rather than
   every socket getting everything.
4. **History / backlog.** "In some demos we have some kind of SQL-backed thing
   — is that custom, or something Durable Objects provides?" And: how do you
   ask for the last N messages, or N days, in a room?
5. **Binary**: should the transport carry it, or should payloads always be JSON
   with base64 when binary is unavoidable?

**Three fragments I could not parse and have not guessed at:**

- *"look at the electricity bill"* — the cost of running this? A specific bill?
- *"I can bear a strappy site which has a WebSocket server attached to it"* —
  possibly a comparison target: a plain site with its own WS server, against our
  Durable Object approach. If so, say which site and I will measure both.
- *"we should have some contact data"* — contract? concrete? contact?

Everything below §1 follows from 1–5 and is safe to read; the three fragments
change §6 at most.

---

## 1. What is already true, measured rather than assumed

### The relay carries binary today. This was the surprise.

`workers/relay/src/index.js` opens with its own contract:

> VERBATIM. No parse, no storage, no envelope. **Text or binary**, relayed as-is.

So question 5 is half-answered before any work: `ws.positron.studio` will carry
an `ArrayBuffer` unchanged. Base64 is not needed *for the transport*. It is only
needed if the message must also be **readable by something that reads JSON** —
the backlog, a log line, this demo's own display. That is a storage-and-display
argument, not a wire argument, and §4 settles it on those terms.

### There is no backlog anywhere, and nothing gives us one for free

Swept the whole `workers/` tree. Two storage APIs are in use and **both are
ours to drive** — Durable Objects hand you the primitives, never a history:

| API | where | shape |
|---|---|---|
| `state.storage.get/put/list/delete` | `instrument`, `ingest` | key-value |
| `state.storage.sql` | `instrument` only | **SQLite inside the DO** |

The SQL one is the answer to "is it custom or provided?" — **the engine is
provided, the schema is ours**, and we have already written one. `instrument`'s
`Sessions` DO:

```sql
CREATE TABLE events(sessionId TEXT, seq INTEGER, at INTEGER,
                    kind TEXT, source TEXT, raw BLOB, display TEXT,
                    ref INTEGER, payload TEXT);
CREATE INDEX events_by_time ON events(sessionId, at);
```

**One row per event, indexed by time.** That is exactly the backlog machinery
this plan needs, already written, already carrying a `raw BLOB` column — so
binary in the backlog is a solved problem too. Note `raw BLOB` beside
`display TEXT`: the bytes and a human-readable rendering of them, side by side,
which is the shape §4 argues for.

**The relay itself stores nothing** and must keep not storing it — see §3.

### Every demo invented its own envelope, and they all agree anyway

| demo | messages |
|---|---|
| `cues` | `{t:'hello'}` `{t:'here'}` `{t:'cue', id, at}` |
| `instrument` | `{t:'on', note, vel, at, src}` `{t:'off', note, at}` |
| `looper` (`proto/looper/peer.mjs`) | `{t:'hello'}` `{t:'grid', loopMs, origin}` `{t:'grid-set'}` `{t:'grid-yield'}` `{t:'layer-recv', from, bytes, deliveryMs}` |

Three authors, one convention, never written down: **`t` is the verb**, the
relay adds nothing, and `from` is stamped by the sender. Two more shared rules
are in the code as comments rather than as a spec:

- **the sender stamps `at`, the relay never re-stamps** (`cues`) — which is why
  a delivery time is honest even though the relay has no idea what time it is;
- **the echo is the point**: the relay returns every message to its sender too,
  so everyone including the sender sees one order.

So there is no envelope to invent. There is an envelope to **write down**.

### The caps the relay already enforces, since it is tokenless

256 KiB per message · 16 sockets per room · 512 KiB/s per socket · 60 msg/s ·
constrained room names. `ping`→`pong` is answered by the runtime's hibernation
autoresponse, so an RTT probe never wakes the DO and measures pure network.

⚠️ Residual risk the relay's own header states rather than hides: nothing caps
how many DISTINCT rooms one client opens.

---

## 1b. What elektron already settled — v1 and v3, read 2026-09-09

The prior art is ours. `elektronstudio/v1` (`src/lib/websocket.js`) and
`elektronstudio/v3` (`src/utils/message.ts`) carry the same envelope, five years
apart:

```js
// v1                                    // v3
{ id: randomId(),                        { id: randomString(16),
  datetime: new Date().toISOString(),      datetime: new Date().toISOString(),
  userId, userName,                        channel: "",
  type: "", channel: "", value: "",        type: "", value: "",
  ...message }                             ...message }
```

Beside positron's, which three demos invented independently:

| elektron | positron | the difference that matters |
|---|---|---|
| `type` | `t` | the same field, shorter |
| `channel` **in the message** | the room **in the URL** | see below |
| `value` | fields spread at top level | elektron nests, we do not |
| `id`, random 16 chars | — (`seq` proposed) | **dedupe** vs **gap detection** |
| `datetime`, ISO string | `at`, epoch ms | readable vs arithmetic |
| `userId` / `userName` | `from` | same job |

**Four things it teaches, each of which changes this plan:**

1. **`channel` in the message is a different architecture, not a different
   name.** One socket carries every channel and the client filters, against our
   socket-per-room with the DO fanning out. Theirs costs one connection and
   every message to everyone; ours costs a connection per room and delivers only
   what a room sent. §5's "the filter is applied by the receiver" is elektron's
   model arriving by the back door — worth choosing on purpose rather than
   drifting into.

2. **`id` and `seq` answer different questions and we may want both.** A random
   id lets two lists be merged without duplicates — which is exactly what v3's
   history code does, `uniqueCollection([...loaded, ...messages], "id")`. It
   cannot see a gap. A per-sender counter sees the gap and cannot dedupe an
   overlap. **The moment history is merged into a live list, the random id stops
   being optional**, and that is the case §3 is proposing.

3. **History over HTTP existed here already, and is commented out.** v3 has a
   `config.messagesUrl` fetch that loads past messages and merges them by `id`
   into the live list — the whole of §3's read path, written and disabled. Worth
   finding out why before rebuilding it: if it was turned off because the
   backlog grew without bound, that is §3's retention question answered from
   experience.

4. **Never omit a key some client might read.** v3 fills `channel`, `type` and
   `value` with empty strings and says why: *"Some clients just check for the
   value in the message, not whenever the key exists."* That is a scar, and the
   cheap way to avoid re-earning it is to send the full shape always.

**And one thing they have that we do not**: both versions use
`reconnecting-websocket`, v1 vendored into `src/deps/`. Every positron demo uses
a raw `new WebSocket` with no reconnect at all — `cues` logs "relay closed" and
stops. On a phone that changes network, our pages simply stop working and say
so quietly. ⚠️ Not measured yet; it is a reading of the code, and the fix is a
shell module rather than a per-demo patch.

The remaining unknown: **the server is not in the org.** `WebSocketServer`,
`socket.io` and `new WebSocket` return nothing across `elektronstudio/*`, so
whatever answered `VITE_WS_URL` lived elsewhere. If it is the Strapi host
(`elektronstudio/strapi4`, `data.elektron.art`), that is the comparison §0's
second fragment was probably asking for.

---

## 2. The envelope

```
{ "t": "<verb>", "from": "<sender id>", "at": <epoch ms, sender's clock>,
  "seq": <per-sender counter>, ... }
```

One line of JSON per message, `\n`-delimited when several are batched or
written to the backlog — the same NDJSON the Csound and media work uses, so a
backlog file is `jq`-able and a `curl` of a room is readable without a tool.

`t`, `from`, `at` are the existing three, promoted from convention to contract.
`seq` is the one addition, and it earns its place: **without a per-sender
counter you cannot tell "the message never arrived" from "the message arrived
out of order"**, and a demo about a socket has to be able to tell.

**Anything beyond those four is the sender's own business** and is carried
verbatim. This is the rule `plan-score` already settled for p-fields: a
container that normalises what it does not understand is lying about it.

---

## 3. Where the backlog lives, and what does NOT change

**The relay stays verbatim and storage-free.** It is the one component in this
project whose whole value is that it does not parse. Adding history to it makes
every message a parse, every room a write, and the hibernation ping/pong
measurement stops being pure network. So:

> **A second Durable Object, `Backlog`, sits beside the relay — never inside it.**

Sketch, following `instrument`'s schema because it is proven:

```sql
CREATE TABLE msg(room TEXT, seq INTEGER, at INTEGER, sender TEXT,
                 t TEXT, body TEXT, raw BLOB);
CREATE INDEX msg_by_time ON msg(room, at);
```

Reads are **plain HTTP against the same hostname**, which is the "accessed with
regular connections" part of the request:

```
GET /room/<room>/history?last=200
GET /room/<room>/history?since=<epoch ms>
GET /room/<room>/history?from=<ms>&to=<ms>
                      → NDJSON, oldest first, one message per line
```

**Retention has to be a decision, not a default.** `SELECT` over a table nobody
prunes is a demo that works for a week. Proposal, to be argued: **the newer of
1,000 messages or 24 hours per room**, pruned on write, with the room's own
count and oldest instant returned in a `X-Backlog` header so the page can print
what it is looking at rather than implying completeness.

---

## 4. Binary

The wire already carries it (§1), so this is only about the backlog and the
display.

| | on the wire | in the backlog | on the page |
|---|---|---|---|
| JSON message | as text | `body TEXT` | pretty-printed |
| binary frame | as bytes, unchanged | `raw BLOB` | hex head + byte count |
| binary *inside* a JSON message | base64 in a field | in `body` | decoded length, not the bytes |

**Base64 only where a JSON reader has to survive it**, and never for the
transport. The cost is stated on the page rather than hidden: base64 is +33 %
bytes, so a 256 KiB message roof becomes a ~192 KiB payload roof the moment you
put binary inside JSON — which is exactly the sort of arithmetic a demo about a
socket should print.

---

## 5. Subscriptions

The smallest thing that is not a lie: **a room is the subscription**, and
within a room a socket may declare `{t:'sub', verbs:['cue','note']}`. The relay
cannot honour that without parsing — so **the filter is applied by the
receiver, not the relay**, and the page says so. A server-side filter belongs to
the `Backlog` DO, which already parses, and applies to history queries only:
`?t=cue`.

Anything more (wildcards, per-topic fan-out) is a different product. Recorded as
a decision, not an omission.

---

## 6. The demo

Slug `wire`. One page, three things on it:

1. **A composer.** Pick a verb, type a body, send. A checkbox sends the same
   payload as **binary** instead, so the two paths are one press apart.
2. **What actually travelled**, both directions, as bytes: the exact line that
   went out, its size, and the same for what came back — including the echo of
   your own message, which is how the ordering point shows itself.
3. **The backlog**, fetched over plain HTTP, with the room's count and oldest
   instant printed beside it.

**What it measures** (all four cells move): round trip via the hibernation
autoresponse; delivery time from the sender's own stamp; bytes out against
bytes stored; and messages held against the retention cap.

**Asserts, mechanism not effect:**

- the echo returns the sender's own message, byte-identical
- `seq` arrives contiguous per sender — a gap is a loss, and it is named as one
- a binary frame round-trips with its bytes unchanged (not its base64)
- history over HTTP returns the same messages the socket delivered, same order
- the retention cap holds: writing cap+1 leaves cap, and the oldest is the one
  that went
- a message over 256 KiB is refused by the relay rather than truncated

---

## 7. Phases

**P1 — the envelope, written down and adopted.** `demo/shell/wire.mjs`: build,
parse, validate, and the `seq` counter. `cues` moves onto it first, because it
is the smallest existing caller and its assert count is a check on the move.

**P2 — the `Backlog` DO.** Schema, write path, the three history queries, the
retention prune. Lab test against the cap before any page uses it.

**P3 — the `wire` demo.** §6.

**P4 — the comparison**, if the third fragment in §0 turns out to name one: our
DO against a plain site with its own WebSocket server, measured the same way —
RTT, delivery, and what each costs to keep a room alive with nobody in it.

---

## 8. Traps

- **Do not put storage in the relay.** §3. Its value is that it does not parse.
- **A backlog with no retention is a demo that works for a week.**
- **`String.length` counts UTF-16 code units**, so 4,000 units of emoji is 8,000
  bytes — the relay already learned this and the demo must not re-learn it when
  it prints a size.
- **A conditional assert makes the suite total vary**, which is how four went
  missing before. Every assert in §6 runs on every run.
- **The `at` stamp is the sender's clock.** Across devices it carries their
  clock error, and `now` has already established that a browser cannot read
  ERR's `Date` header to correct one. Print it as what it is.
