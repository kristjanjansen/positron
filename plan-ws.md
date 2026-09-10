# plan-ws — one message shape, and a backlog that is ours to write

Status: **P1–P3 BUILT AND DEPLOYED 2026-09-09** — `demo/shell/wire.mjs`,
`workers/backlog` on `backlog.positron.studio`, and `wire` at
`positron.studio/wire/` (17/17 green). Two things are outstanding: the
`t` → `type` sweep across the other six files (§2, P1's second half — only
`wire` speaks `type` today), and §7's P4 comparison, which still waits on §0.
Written 2026-09-09 from a spoken request; §0 records what I think was asked and
what I could not make out, because acting on a wrong reading of a dictated brief
is expensive.

**Three decisions taken since, each argued where it lands**: the room stays in
the URL and `channel` is not added (§5); the verb field is `type`, not `t`
(§2); and the backlog is filled by a recorder that joins the room as an ordinary
socket, so the relay still never parses (§3).

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

Three authors, one convention, never written down: **`t` is the verb** — which
§2 renames to `type` — the relay adds nothing, and `from` is stamped by the
sender. Two more shared rules
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

### What it costs and how it scales — measured 2026-09-09

Against the DEPLOYED relay from one Mac, three runs; the backlog numbers are
`wrangler dev` on this machine and are NOT edge numbers. Method and script:
`demo/perf-wire.mjs`, 200 samples per round-trip figure.

| | run A | run B | run C |
|---|---|---|---|
| `ping`→`pong`, answered by the runtime, DO never woken | p50 26.0 / p95 32.6 ms | p50 36.4 / p95 46.2 ms | p50 37.5 / p95 49.5 ms |
| echo, through the room's Durable Object | p50 27.0 / p95 40.4 ms | p50 38.0 / p95 51.2 ms | p50 38.3 / p95 50.5 ms |
| **what the DO hop costs** | **+1.0 p50 / +7.8 p95** | **+1.6 p50 / +5.0 p95** | **+0.8 p50 / +1.1 p95** |

The absolute numbers are this link and moved 11 ms across three runs; the
DIFFERENCE is the relay, and it is **one to two milliseconds at the median**. Quoting the
autoresponse RTT as "the relay's latency" would be quoting the network.

**Fan-out is nearly free.** One sender at 20 msg/s, N receivers, 60 messages
each time, delivery measured at the sender's own echo:

    N= 1   p50 40 ms    60/60 delivered, 0 lost
    N= 2   p50 42 ms   120/120
    N= 4   p50 42 ms   240/240
    N= 8   p50 45 ms   480/480
    N=15   p50 48 ms   900/900 delivered, 0 lost

A full room costs the sender **8 ms at p50** over an empty one, and nothing is
lost at the ceiling of 16 sockets. So the per-room limit is the cap, not the
machine.

**Size**: 1 KiB p50 47 ms · 8 KiB 70 · 64 KiB 81 · 200 KiB 116 · 256 KiB 125,
one sender to one receiver, paced to stay under the byte budget. A message at
the roof costs ~78 ms more than a small one — worth knowing before putting a
committed loop layer on the hot path.

**And the caps bite exactly where the relay says they do, counted by `seq`:**

    30 msg/s   delivered  90/90    dropped   0   (0.0%)
    60 msg/s   delivered 180/180   dropped   0   (0.0%)
   120 msg/s   delivered 298/360   dropped  62  (17.2%)
   300 msg/s   delivered 298/900   dropped 599  (66.6%)

Both overloads delivered **298 in three seconds**, and a third run repeated it
to the message (298 again, 61 and 601 dropped), which is the token bucket
read back out of the wire: `MSG_BURST` 120 plus 3 s at `MSG_PER_SEC` 60 is a
300-message allowance, and 298 arrived. **The sender was told nothing in either
case** — no error, no close, no backpressure — and the only reason those 599
losses have a number at all is that the receiver could see the counter skip.
That is `seq` earning its place against a real mechanism rather than a
hypothetical one (§2).

**The backlog** (local dev, so treat as a floor rather than a number): kept 300
of 300 at a 60 msg/s send, and history reads of 8, 50 and 200 rows all returned
in **5–8 ms**, flat in the row count.

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
| `type` | `t` | **their name wins** — §2 |
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

   **And they did not get the one connection.** `useChat()` calls
   `useMessage()`, and `useMessage()` opens its own `ReconnectingWebsocket` — so
   a page with two chats holds two sockets AND filters every channel on both.
   The multiplexing advantage was never realised, which makes the argument for
   room-in-the-URL theirs rather than mine. §5 records the decision.

2. **`id` and `seq` answer different questions and we may want both.** A random
   id lets two lists be merged without duplicates — which is exactly what v3's
   history code does, `uniqueCollection([...loaded, ...messages], "id")`. It
   cannot see a gap. A per-connection counter sees the gap and cannot dedupe an
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

## 1c. What an elektron client has to change

Read from source 2026-09-09: `v1/src/lib/websocket.js`, `v3/src/utils/message.ts`,
`v3/src/utils/chat.ts`, `v3/src/components/Chat.vue`.

Before, as v3 stands:

```ts
const ws = new ReconnectingWebsocket(config.wsUrl)          // one URL, everything

formatMessage = (m) => JSON.stringify({
  id: randomString(16),
  datetime: new Date().toISOString(),
  channel: "", type: "", value: "",     // never omit a key a client might read
  ...m })

sendMessage({ userId, userName, type: "CHAT", channel, value, store: true })

chatMessages = messages.filter(
  (m) => m.type === receiveMessageType && m.channel === channel)
```

After:

```js
const ws = new ReconnectingWebSocket(`wss://ws.positron.studio/room/${channel}/ws`)

format = (m) => JSON.stringify({
  id: randomString(16),
  type: "", value: "",                  // the same scar, kept
  from: connectionId, at: Date.now(), seq: seq++,
  ...m })

send({ from: connectionId, userId, userName, type: "CHAT", value })

chatMessages = messages.filter((m) => m.type === receiveMessageType)
```

| field | change | why |
|---|---|---|
| `id` | unchanged | the only thing that dedupes history merged into a live list |
| `type` | unchanged | §2 |
| `value` | unchanged | past the four envelope keys it is carried verbatim — their nesting is not ours to have an opinion about |
| `userId` / `userName` | **unchanged, and still theirs** | app data that rides along; `from` does not replace it, because they are not the same thing — see below |
| `channel` | **removed**, becomes a URL path segment | the room is the channel |
| `datetime` ISO | → `at`, epoch ms | `now` subtracts stamps; nothing should parse a string to do arithmetic |
| — | **`from` added**, minted per socket | a CONNECTION id, which is what `seq` counts |
| — | **`seq` added** | §2 |
| `store: true` | **kept, and §3 has to honour it** | below |

**`from` is not `userId` renamed.** A user id is a person and persists across
tabs and reloads; `from` identifies one socket, because that is the only scope in
which a counter means anything (§2). Two tabs are two senders on the wire and one
person in the app, and the envelope should not pretend those are one fact.

The filter loses one clause because the URL does that half. `safeJsonParse` stays
exactly as written — v3's comment (*"payload can also contain binary data so we
try to be on safe side"*) is right, and now literally so.

**`store: true` is theirs and we should take it.** v3 marks the messages worth
keeping at the point of sending, where the sender knows; §3 as first written
assumed the backlog keeps everything, which in a room carrying cues at 60/s fills
a 1,000-message cap in seventeen seconds and buries the chat somebody actually
wants to read back. The cost is that the backlog stops being a faithful record of
the wire, so the page must print KEPT against SENT rather than letting one imply
the other.

---

## 2. The envelope

```
{ "type": "<verb>", "from": "<connection id>", "at": <epoch ms, sender's clock>,
  "seq": <per-connection counter>, ... }
```

One line of JSON per message, `\n`-delimited when several are batched or
written to the backlog — the same NDJSON the Csound and media work uses, so a
backlog file is `jq`-able and a `curl` of a room is readable without a tool.

**`type`, not `t`** — decided 2026-09-09, against three demos that already say
`t`. It costs three bytes a message, which at the relay's own 60 msg/s ceiling
is 180 B/s against a 512 KiB/s budget. What it buys: `t` sits beside `at` in one
object while everywhere else in this project `t` is TIME (`reduce(events ≤ t)`,
`t0`, the strip's row `t`), so a key meaning *verb* and a key meaning *when* end
up one letter apart with nothing to catch a misread; `wire`'s whole subject is
printing the raw line to a reader, and CLAUDE.md bans jargon in anything a
visitor sees, which a single-letter key is; and it is the name five years of
elektron already used, so §1c's migration is one line shorter. Counted rather
than estimated: **6 source files, ~46 send-side literals** — `room` 8, `show` 6,
`instrument` 5, `cues` 5, `proto/looper/peer.mjs` 13,
`workers/instrument/src/index.js` 9 — with `workers/view/public/*` following as
build output, and each demo's assert count the check on its own move.

`type`, `from`, `at` are the existing three, promoted from convention to
contract. `seq` is the one addition, and **the reason first written here was
wrong**: on one socket the order is already guaranteed. A WebSocket rides TCP,
so a single sender's messages cannot arrive out of order, and nothing goes
missing without the connection dying. Any check written to catch reordering is
checking something that cannot happen and will pass forever.

What `seq` actually sees is the two ways this relay loses a message anyway, both
of them deliberate design, neither of them reported to the sender:

- **the caps bite.** 256 KiB, 512 KiB/s, 60 msg/s, 20 strikes — the relay drops
  and counts, and that counter lives in `/stats` where it cannot be attributed
  to a message. The looper publishes a committed layer at ~52 KB, so this is not
  hypothetical.
- **a reconnect gaps.** The socket goes and comes back; `seq` says how many went
  missing, which is how you know whether the history fetch that filled the hole
  filled all of it. `id` merges the overlap and cannot see the hole.

⚠️ **`seq` counts a CONNECTION, not a person**, which is why `from` is minted
per socket and elektron's `userId` rides beside it rather than replacing it
(§1c). Two tabs under one persisted id interleave two counters and manufacture
gaps that never happened; a reconnect that keeps the id but restarts the count
reads as a duplicate range.

It is also the only counter available. A server-assigned per-room sequence would
be strictly better — one number, every sender, authoritative — and the relay
cannot mint one without parsing, which §3 is the whole argument against.

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

**How it fills, which the first draft left unsaid**: the recorder **joins the
room as an ordinary socket**. It costs one of the sixteen slots, it sees exactly
the order every other member sees — the echo is the ordering point — and it is
allowed to parse because it is not the relay. That is also the one place
`store: true` can be honoured, which is why the flag belongs in the envelope
rather than in a query string. The cost is stated rather than hidden: a recorded
room is a DO kept awake, so recording is a thing you turn on for a room, not a
property every room has.

Sketch, following `instrument`'s schema because it is proven:

```sql
CREATE TABLE msg(room TEXT, seq INTEGER, at INTEGER, sender TEXT,
                 t TEXT, body TEXT, raw BLOB);
CREATE INDEX msg_by_time ON msg(room, at);
```

Reads are **plain HTTP against the same hostname**, which is the "accessed with
regular connections" part of the request:

```
GET  /room/<room>/history?last=200
GET  /room/<room>/history?since=<epoch ms>
GET  /room/<room>/history?from=<ms>&to=<ms>&type=<verb>
                      → NDJSON, oldest first, one message per line
POST /room/<room>/clear        one room
POST /clear-all                every room the index knows of
```

**`clear-all` needs a list of rooms and a DO namespace cannot be enumerated**,
so one reserved instance — `__index`, unreachable from outside because the room
route refuses any name starting `__` — keeps the names as they start recording.
⚠️ It therefore knows only what was recorded SINCE it existed; rooms from before
are unreachable by name and hold up to `cap` rows until something writes to them
again, because the prune runs on write. At demo scale that is a handful of rows.
If it matters, prune on the idle-stop alarm.

**Retention has to be a decision, not a default.** `SELECT` over a table nobody
prunes is a demo that works for a week. Proposal, to be argued: **the newer of
1,000 messages or 24 hours per room**, pruned on write, with the room's own
count and oldest instant returned in a `X-Backlog` header so the page can print
what it is looking at rather than implying completeness. The cap counts KEPT
messages, so a room full of unstored live traffic cannot evict the handful
somebody asked to keep.

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

## 5. Subscriptions — room, not channel

**Decided 2026-09-09: the room stays in the URL and `channel` is not added.**
The relay is the argument. Put the channel in the message and there are exactly
two ways to route it — the relay parses every message, which ends the verbatim
contract, makes every message a parse, and puts the hibernation `ping`/`pong`
measurement behind a DO wake; or the receiver filters, in which case the wire
carried every channel to every socket and full fan-out was paid for messages
nobody wanted. Room-in-the-URL is the only shape where the relay routes
correctly while knowing nothing about the payload.

The budget makes it concrete: **the caps are per SOCKET**, so multiplexing four
channels onto one puts them in a single 512 KiB/s, 60 msg/s bucket, where a
chatty channel starves a sparse one and the strikes close the socket carrying
both. Separate rooms get separate budgets and separate 16-socket ceilings. And
§1b settles it from their side — v3 opened a socket per chat anyway, so it paid
N sockets AND full fan-out.

What it costs, stated rather than hidden:

- **A connection per room, not per client.** Cheap here, since an idle room
  hibernates and costs nothing, but the client pays N handshakes and N
  reconnects — and today we have no reconnect at all (§1b).
- **No order across rooms.** The echo is the ordering point and it is per-DO, so
  two kinds of message that must interleave in a known order have to share a
  room. That is the test for when to split: same order, same room.
- **The uncapped-distinct-rooms risk gets heavier**, since more rooms per client
  leans harder on the one limit that does not exist (§1).

So elektron's `channel` is our room and their `type` is our `type`: the mapping
is exact and nothing is lost. **Do not add a `channel` field** — that is two
overlapping filters at two levels for one job.

Within a room a socket may declare `{type:'sub', verbs:['cue','note']}`. The
relay cannot honour that without parsing — so **the filter is applied by the
receiver, not the relay**, and the page says so. A server-side filter belongs to
the `Backlog` DO, which already parses, and applies to history queries only:
`?type=cue`.

The case that would reverse this: a client that routinely needs many SPARSE
streams at once and one order across them. Then multiplexing wins, the relay
still must not parse, and the receiver filters everything — elektron's
architecture, adopted deliberately, with the shared-budget consequence printed on
the page. Anything more (wildcards, per-topic fan-out) is a different product.
Recorded as a decision, not an omission.

---

## 6. The demo

Slug `wire`, **built 2026-09-09**. One page, three things on it:

1. **A composer, with the two acts under it as two buttons** — *Send it* and
   *Send and keep it*. Not a send button plus a "keep" checkbox: keeping is a
   different ACT, not a setting on this one, and a checkbox makes you read a
   tick back before you press. One primary, because two yellow buttons side by
   side say neither is the main path.
2. **What actually travelled**, both directions, as bytes: the exact line that
   went out, its size, and the same for what came back — including the echo of
   your own message, which is how the ordering point shows itself. Every line
   WRAPS: a message is 110-odd bytes and a phone is ~45 characters wide, so an
   ellipsis hid the one thing the page exists to show.
3. **The history, already on the page when you arrive** — not behind a press.
   That is why the room is SHARED (`wire`) rather than one per tab: a fresh room
   has no past, so loading it on arrival would have shown an empty box every
   time. `?room=NAME` still splits one off. Beside it, **Clear history**, which
   clears THIS room: a two-word button must not be wired to a wider blast radius
   than it names. The worker's `/clear-all` still exists for the rooms this page
   left behind when it kept one per tab, and it has done that job.

**Three visible controls** — *Send it*, *Send and keep it*, *Clear history*.
The three that exercise
mechanism (binary, the roof, the retention cap) are **hidden, not removed**:
the harness presses `.d-controls button`, and a control it cannot reach is a
subject the suite silently stops testing. `?checks=1` shows them.

**What it measures** (every cell moves): round trip via the hibernation
autoresponse; delivery time from the sender's own stamp; bytes out against bytes
stored; messages KEPT against messages SENT, because `store` makes those two
different numbers; and messages held against the retention cap.

**Asserts, mechanism not effect:**

- the echo returns the sender's own message, byte-identical
- `seq` arrives contiguous per CONNECTION — a gap is a loss and is named as one.
  Prove the guard fires: send one message over the 256 KiB roof and watch the
  next `seq` skip, which is the relay's own cap becoming visible
- a binary frame round-trips with its bytes unchanged (not its base64)
- history over HTTP returns the same messages the socket delivered, same order
- a message sent without `store` reaches every socket and is NOT in the history
- the retention cap holds: writing cap+1 leaves cap, and the oldest is the one
  that went
- a message over 256 KiB is refused by the relay rather than truncated

---

## 7. Phases

**P1 — the envelope, written down and adopted.** `demo/shell/wire.mjs`: build,
parse, validate, the per-connection `from`, the `seq` counter, and the reconnect
every positron page currently lacks (§1b). `cues` moves onto it first, because it
is the smallest existing caller and its assert count is a check on the move; then
the `t` → `type` sweep across the other five files, diffing per-demo assert counts
after each.

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
- **`seq` counts a connection, not a person.** Two tabs under one persisted user
  id manufacture gaps that never happened. §2.
- **On one socket, order is not the risk — loss is.** TCP already orders a
  sender's messages, so a reordering check passes forever and measures nothing.
- **A shim that reads `m.type ?? m.t` is how two names become permanent.** If the
  migration needs one, it ships with the condition for removing it.
