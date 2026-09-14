# plan-radio-messages — a clean-room editorial platform on positron primitives

🔴 **NOTHING IN THIS DOCUMENT IS BUILT.** No page, no worker, no route, no
deploy. It is an architecture and a set of arguments.

Written 2026-09-14 from a dictated brief, then **reframed**: the first draft was
a migration plan for somebody else's server, and it was the wrong document. This
one designs the thing from first principles on what positron already has, and
meets an existing client at the edge.

---

## 0. The clean-room rule, and how to audit it

**Nothing in the design below is derived from reading anyone else's code.** The
Radio 1965 repo (`github.com/tarmoj/radio1965`, `origin/main` = `8606632`,
2026-09-14) is cited in exactly two roles, and never as a justification:

| label | means |
|---|---|
| **REQ** | a **requirement** — something the world demands, observed from the running product or stated by its authors as an intention |
| **INTEROP** | a **fact about bytes an existing client expects**, so our document can project onto it |
| **CONVERGES** | the design independently landed where theirs did. Marked, because convergence is evidence a model is close to forced by the problem — not evidence of copying |
| **DIVERGES** | the design differs, **with the reason stated**. This is the point of the exercise |

🔴 **"Because that is how they did it" appears nowhere in this document as a
reason.** Where a choice matches theirs it is argued from the problem first and
the match noted afterwards. Every DIVERGES entry carries an argument that would
stand if their repo did not exist.

⚠️ **Marks used for evidence**, as elsewhere in this repo: **READ** = in a source
file, cited by path and line. **MEASURED** = I asked a running system, with the
time. **INFERRED** = reasoning, flagged as such.

⚠️ **Provenance of every READ.** `origin/main` = `8606632`, 2026-09-14, fetched
while writing. The clone on this machine was sixteen days stale and produced
three wrong facts before the fetch — an endpoint that had been renamed with
different semantics, a field that had been added, and a constant that had
changed. `git fetch` before reading anyone's code.

---

## 1. What the system is for

An editorial team publishes short items — a note, a link to a recording, a page
worth reading, or word that a broadcast has just started. Each item has to reach
a reader whether their app is open in their hand, closed in their pocket, or has
never been installed at all. The platform's job is to take one item from one
author, land it in all three of those places at a stated time, and take it back
down when it is over.

That is three delivery paths, one schedule, one lifecycle, and one source of
truth — and §4 and §5 are almost entirely about keeping those four things from
becoming four systems.

---

## 2. Requirements, in my own words

Restated from observing the running product and from its authors' stated
intentions. **These are the things that survive whatever is built.**

| | requirement | where it comes from |
|---|---|---|
| **REQ-1** | **Scheduled publication.** An item is written now and becomes visible at a stated instant, possibly days later | REQ: the product has a publish time distinct from a creation time |
| **REQ-2** | **A prominence lifecycle.** An item arrives, is prominent for a while, then recedes into a browsable back catalogue without vanishing | REQ: the product presents "New Arrivals" and a "Collection", `project-description.md` §2.1 |
| **REQ-3** | 🔴 **Waking a closed phone.** The reader is not looking at anything. This is the hardest requirement and it cannot be met by a socket | REQ: the product is a notification service; its whole point is unsolicited arrival |
| **REQ-4** | **Retraction.** A broadcast ends, or something is published in error. The card must come down everywhere | REQ: broadcasts end; and see §8.3, where the existing import path **cannot** do this |
| **REQ-5** | **Several content kinds, including live streams.** Text, audio, video, third-party web pages, and live broadcasts of at least audio | REQ: observed in the live catalogue, MEASURED 2026-09-14 |
| **REQ-6** | **Ingest from a CMS that stays.** Long-form articles are authored elsewhere (Joomla, `eccm.ee`) and must flow in | REQ: stated by its authors — *"Some content can be created in separate JOOMLA system, a bridge is needed"*, `project-description.md:8` |
| **REQ-7** | **Editorial, not conversational.** A few writers, many readers. Not chat | REQ: the dictated brief, §0 of the original request |
| **REQ-8** | **Persistence and history.** A reader arriving late, or on a new device, sees the catalogue — not just what happened while they watched | REQ: the product persists items indefinitely and offers search over past items |
| **REQ-9** | **Clearing, for testing.** A test run must be able to empty its own catalogue | REQ: the dictated brief |

⚠️ **Two requirements are deliberately NOT on this list**, because observing a
system is not the same as accepting its scope: **comments** (a per-item flag
exists in the product and nothing implements it, on either side) and
**per-editor roles** (nothing enforces authorship today at all). §9 says what
this design does about each.

---

## 3. The item, designed

### 3.1 Deriving the fields from the delivery paths

The item's shape is **not a content-modelling exercise**; it is dictated by what
each of the three delivery paths in §1 demands. Ask each path what it needs and
the field list falls out:

| path | demands | field |
|---|---|---|
| a push notification | a **short headline** and **one line of prose** — this is APNs' and FCM's shape, not a display preference | `title`, `summary` |
| a card in a list | the same two, plus enough to pick a renderer | `kind` |
| opening or playing | **where the content actually is** | `url` |
| scheduling (REQ-1) | an **instant** | `publishAt` |
| the lifecycle (REQ-2, REQ-4) | one more instant, and one **decision** | `shelfAt`, `retractedAt` |
| "what is on right now" (REQ-5) | a way to ask without enumerating kinds | `live` |
| finding things (REQ-8) | classification | `tags` |
| an inbound adapter (REQ-6) | **typed provenance** | `source` |
| kinds nobody has thought of | a bounded escape hatch | `extra` |
| attribution | a **verified** author | `by` |
| editing without duplicating | stable identity, separate from version | `id`, `rev` |

🔴 **The first row is the one that shapes everything else.** A push is a title
and a body. That is not negotiable, it comes from Apple and Google, and it means
an item that cannot be reduced to a headline and a line **cannot be delivered on
the path that matters most**. So those two fields are **required**, and the
coupling is stated rather than hidden.

### 3.2 The document

```json
{
  "id":          "9f3a1c7e42b8d05619ae7c33f0b28d41",
  "rev":         3,
  "kind":        "page",
  "live":        false,
  "title":       "Kuidas raadiost sai subkultuurimaja",
  "summary":     "Janno Sooääre artikkel Sirbis, 7.08.26",
  "url":         "https://www.sirp.ee/kuidas-raadiost-sai-subkultuurimaja/",
  "publishAt":   1787950586329,
  "shelfAt":     1788555386329,
  "retractedAt": null,
  "tags":        ["press"],
  "source":      { "kind": "composer" },
  "extra":       {},
  "by":          "editor:tarmo"
}
```

Carried on positron's existing envelope (`demo/shell/wire.mjs`, `plan-ws` §2)
when it travels over the relay — `type` / `from` / `at` / `seq`, with the item
**nested under one key**, never spread.

🔴 **Nesting is structural, not stylistic.** `format()` in
`demo/shell/wire.mjs:77-85` guards `from`, `at` and `seq` — it **throws** if a
payload carries one — but it does **not** guard `type`, and the body is built
`{ id, type:'', ...msg, from, at, seq }`. A spread item's own type key would
silently overwrite the wire verb, and the backlog's `?type=` filter
(`workers/backlog/src/index.js:178`) would then filter content kind while
appearing to filter verb. Nothing would throw. ⚠️ The item also has an `id` and
so does the envelope: **two ids, two jobs** — the envelope's dedupes a message
when history is merged into a live list, the item's names the thing. Nesting
keeps them from colliding too.

### 3.3 What I would not repeat, and why

Eight decisions where the design differs from what the running product does.
Each argument stands on its own; the comparison is noted afterwards.

**DIVERGES 1 — identity is client-minted and random, not server-minted from a
clock.**
The composer names the item before it sends it. That single choice makes a
publish **idempotent and retryable**: a request that times out is re-sent
unchanged, and the store recognises it. A server-minted identifier makes that
impossible — the client has no name for the thing it just tried to create, so a
timeout forces a choice between duplicating and giving up.
A clock-derived identifier has a second defect: it collides when two things are
published in the same millisecond, and it smuggles an **ordering** into a field
whose job is naming. Ordering belongs to `publishAt`, where it can be reasoned
about. 128 random bits, hex.
⚠️ *Observed for contrast*: the running product mints `evt_<epoch ms>` server-side
and answers `409` on collision (`server/main.py:180, 210`) — INTEROP only; §8.1
projects onto it.

**DIVERGES 2 — identity and version are separate fields.**
An edit is a **new revision of the same item**, not a mutation and not a new
item. Without `rev` there is no way to answer "did I already apply this?" when
history and live traffic are merged, and no way to say what changed. With it,
the store is append-only — which is what a message log wants to be anyway — and
"latest wins" is a comparison rather than a timestamp race.

**DIVERGES 3 — `kind` + `live` instead of one flat enum of content types.**
A single enum that must express *what the content is*, *whether it is live*, and
*where it came from* grows a new value every time any one of those three axes
gains a member. Split them and the axes stop multiplying: **four kinds**
(`note`, `audio`, `video`, `page`) times **one boolean**. Provenance leaves the
type entirely, because §3.3's `source` field already carries it properly.
The practical payoff is query shape. "Is anything on right now?" is
`live == true` — one predicate that never changes. With a flat enum it is a
membership test against a list of stream-ish values, and that list has to be
edited every time a new source appears, in every place it was written.
⚠️ *Observed for contrast*: eight flat values (`server/db.py:33`), of which three
are stream variants distinguished partly by origin. INTEROP: §8.1 collapses
`kind`+`live`+`source` back onto them.

**DIVERGES 4 — lifecycle status is DERIVED, not stored.**
Of the four states a reader can observe, **three are pure functions of the
clock**: before `publishAt`, between the two instants, and after `shelfAt`. Only
retraction is a decision somebody made. Storing all four means something must
sweep to keep them true, and **a stored value maintained by a sweep is a value
that is wrong whenever the sweep is late, early, or runs twice.**
So: store `retractedAt`; compute the rest at read time. There is nothing to
sweep and the class of bug goes with it.
🔴 **And the honest limit, because this is where the argument is usually
overstated: deriving fixes DISPLAY only.** A push has to fire at an instant, and
an instant needs a timer. §4 gives that timer an owner. Display and notification
are different problems and only the first is solved here.

**DIVERGES 5 — instants are epoch milliseconds. Always.**
A wall-clock string with no offset is ambiguous across a daylight-saving
boundary, unorderable without knowing a zone, and silently wrong when the reader
and the writer are in different ones. The composer renders local time in the UI;
the document stores an instant. `plan-ws` §2 already settled this for positron's
envelope — *nothing should parse a string to do arithmetic* — and the same
reasoning applies to content.
⚠️ **This is a genuine correctness difference, not a preference.** §8.1 converts
at the edge and names the zone it converts into, because an hour's error in a
publish time reads as an editorial decision rather than a bug.

**DIVERGES 6 — no `comments_enabled`, or any other per-item platform flag.**
Two objections, either sufficient. First, it stores a **platform policy** on
every **item**: whether a discussion feature is available is a property of the
platform and its moderation capacity, not of a paragraph of text. Second, a
field that has never been true has never been exercised, and shipping it in a
contract every client parses invites clients to branch on it.
If comments arrive, they are a **separate resource with their own address**
(`/item/<id>/comments`) and their own access rules. §9 keeps this out of scope
deliberately rather than by omission.

**DIVERGES 7 — the escape hatch is split into `source` and `extra`.**
The instinct behind a free-form bag is right — a top level that changes for every
new content kind is a contract nobody can depend on. The error is putting **two
different kinds of thing in one untyped bag**: where an item came from, and
whatever a particular kind happens to need.
Provenance deserves to be typed because it is **queried**: "everything from the
CMS", "is this broadcast ours or somebody else's", "re-import this one". A
typed `source` makes those answerable; a convention inside an opaque blob makes
them grep. `extra` then gets to be honestly uninterpreted — **the platform never
reads it**, and that is a promise worth being able to make.

**DIVERGES 8 — `by` is stamped by the store from the credential, never read
from the document.**
A self-declared author field is a **claim**; a stamped one is a **fact**. Drawing
the two identically is the failure CLAUDE.md's colour rule describes — a reader
cannot tell which is which, so the verified one is devalued to the level of the
claim.
⚠️ This is only available **because** writes are credentialled (§6). It is a
consequence of the architecture, not a free improvement, and if the credential
tier is ever widened the guarantee weakens with it.

### 3.4 Where it converges, and why that is worth saying

**CONVERGES** — `title`, `summary`, a link, a scheduling pair, tags, and a
bounded escape hatch. Derived in §3.1 from the delivery paths, and the running
product has the same six.

That is worth stating plainly: **when two independent passes at a problem land
on the same six fields, the model is close to forced by the problem.** It is
evidence the shape is right, and it is also the reason §8's projection is cheap —
most fields map one to one, and the interesting part of that section is the four
that do not.

### 3.5 Budgets, stated where they bind

- `title` — a notification title truncates. Budget **~65 characters**; the
  composer shows the count and where the cut falls.
- `summary` — a notification body truncates too, and more aggressively on a
  locked screen. Budget **~180 characters**.
- 🔴 The whole item travels inside a push payload (§5.2), against a documented
  ceiling of **4,096 bytes** — and possibly **2,048** for the topic send this
  design uses, which §5.7 shows is **no longer citable in the current
  documentation**. ⚠️ Either way `extra` is the field most likely to break
  delivery, so the store **caps it** and says so, rather than discovering a limit
  in the field that nobody can look up.

⚠️ These are budgets the **composer enforces**, not truths about every platform —
the exact truncation point differs by OS, lock state and font size, and a design
that claims a precise number is claiming something it cannot check.

---

## 4. The architecture

### 4.1 Four concerns, four owners

The design principle is that **each of these fails differently, so each needs an
owner that can be reasoned about alone.** Collapsing any two is what makes a
system whose failures are indistinguishable from outside.

| concern | owner | why that owner | 🔴 how it fails |
|---|---|---|---|
| **authorship** | a **Worker route**, tiered by credential | who may write is a property of a **request**, not of a deployment — `plan-names` §2 argues this at length and `workers/ingest/worker.mjs:36-85` already ships it | one shared token has **no per-editor revocation**, and a stolen token is indistinguishable from an editor. §6 |
| **storage + ordering** | **one Durable Object per catalogue**, SQLite, append-only revisions | a single writer gives a single order **for free**, and here order is the product | a single DO is a single writer. Fine at items-per-day; **fatal at messages-per-second**. §4.3 states the ceiling |
| **scheduling** | **the same DO's alarm** | the thing that knows what is pending should be the thing that wakes. A scheduler that must ask another service what is due has two sources of truth | **one alarm per object**, so it must be re-armed after every fire; a missed re-arm strands every later item **silently**. §4.4 |
| **delivery** | **three paths**, §5 | different readers are reachable by different means, and pretending otherwise is the central error this design avoids | each path fails differently and independently. §5.4 |
| **media** | **R2**, through the existing tokenless write path | if anything is ever hosted | today nothing is — items are links to other people's sites. A named non-requirement, §4.6 |

### 4.2 What the relay is, and is not

`ws.positron.studio` is a **fan-out for live readers and nothing else.** It is
not the store, not the scheduler, and not an authorisation boundary.

**It parses nothing** — that is its contract, stated in its own header
(`workers/relay/src/index.js:25`) and defended in `plan-ws` §3 — and that single
property is why §6's enforcement cannot live in it and why §4.1 gives storage to
a different object. Making the relay parse would mean a parse per message, a
write per room, and the hibernation `ping`/`pong` round trip disappearing behind
a Durable Object wake.

MEASURED 2026-09-14, `GET https://ws.positron.studio/`:

```json
{"limits":{"maxBytes":1024000,"maxSockets":128,
           "bytesPerSec":8388608,"msgPerSec":1000}}
```

The hop costs **1–2 ms at p50** over a 26–38 ms network, and a full room costs a
sender **8 ms at p50** over an empty one with zero loss (`plan-ws` §1,
`demo/perf-wire.mjs`).

🔴 **`demo/shell/wire.mjs:35-40` exports these limits as 16 sockets / 60 msg/s /
256 KiB / 512 KiB/s, under a comment claiming it reads them from the relay
"rather than typed twice: a description that can disagree with the config is
worse than none."** It disagrees — **8× on sockets, 16× on message rate.** Any
page quoting `LIMITS` in prose is quoting a fiction. Fix before this design's
composer cites it. Reported, not fixed; this document builds nothing.

### 4.3 Why one Durable Object per catalogue

**Not one per item.** Ordering is the product — a feed is a sequence, and
per-item objects cannot produce one without a second thing to merge them, which
is a second source of truth and a second failure mode.

**Not a shared relational database.** The scheduler and the store want to be
**the same object**, because the alarm's whole job is "what is due next", and
answering that from another service means the schedule can disagree with the
catalogue.

🔴 **The ceiling, stated rather than discovered.** A single DO is a single
writer. Editorial traffic is **items per day**; this design is sized for that and
would be wrong for anything at message rates. The trigger for revisiting is a
number, not a feeling: **if one catalogue ever needs sustained writes above a few
per second, this partitioning is wrong** and the answer is a DO per time-bucket
with a merge, not a bigger object.

⚠️ The existing `workers/backlog` proves the *recorder* pattern — it joins a room
as an ordinary socket so the relay stays unparsing (`src/index.js:66-94`) — and
that pattern is worth reusing. But its **retention is a 24-hour ring**
(`#prune()` at `src:151` deletes anything older on every write, plus a 1,000-row
cap) and its recorder **stops 30 minutes after the last HTTP call rather than the
last message** (`meta.lastUse` is written by `/record`, `/clear` and `/history`
at `src:73, 224, 237`; `#onMessage` at `src:107-146` never touches it). Both are
correct for a demo of a socket and **disqualifying for a catalogue**, which is
REQ-8. This design does not build on it unchanged — §11 stages that honestly.

### 4.4 Scheduling: one alarm, re-armed

The DO holds **one alarm**, set to the **earliest pending `publishAt`**. When it
fires it publishes everything now due, then re-arms to the next-earliest, or
clears if nothing is pending.

⚠️ **One alarm is not a simplification, it is the platform.** A Durable Object
has **exactly one** alarm scheduled at a time; calling `setAlarm()` again
**overwrites** the pending one silently rather than queueing a second. Delivery
is **at-least-once**, and the alarm **wakes an object that is not in memory** —
which is what lets a catalogue sleep between publications and cost nothing. An
alarm set for a time already past fires **immediately** rather than never, which
is the useful direction for that edge to fall. A handler gets **15 minutes** of
wall time.

⚠️ **How punctual, honestly.** Alarms are millisecond-granular and *"will usually
execute within a few milliseconds after the set time, but can be delayed by up to
a minute due to maintenance or failures while failover takes place."* So the
claim this design may make is **"typically milliseconds, worst case a minute"** —
not "to the second". ⚠️ That is still a real improvement on a minute-resolution
poll, which is late by up to a minute *every time* rather than rarely, and it
costs nothing when idle. But **the design must be correct with a one-minute-late
alarm, not merely tolerant of one**: an item's visibility comes from the clock
(DIVERGES 4), so lateness delays the *announcement* and never the *truth*.

🔴 **The failure mode this creates, named up front: a missed re-arm is silent.**
Nothing throws, nothing logs, no reader notices — items simply never become
visible, and the first symptom is somebody asking why a scheduled post did not
appear. So:

- re-arming is the **last statement of the handler**, not a branch inside it;
- the handler is **idempotent** — publishing an already-published revision is a
  no-op, because at-least-once delivery means a retry **will** happen, and a
  non-idempotent handler turns one retry into a second notification;
- a **heartbeat re-arm** runs even when nothing is pending, so a stranded
  schedule self-heals rather than waiting for a write;
- the DO reports **next-due** in its stats so the condition is observable from
  outside instead of only by its absence.

🔴 **And the retry budget runs out, which is the version of this failure that
actually bites.** Alarms retry a throwing handler with **exponential backoff
starting at 2 seconds, up to six times** — on the order of a couple of minutes of
cover. Cloudflare's own warning is explicit: a downstream outage or an unfixed
bug can **exhaust the retries, after which the alarm is never re-run** until
something calls `setAlarm()` again. Two minutes of cover is nothing against an
FCM outage. So the handler **catches its own exceptions and schedules a new alarm
before returning**, rather than throwing and spending a retry — the platform's
retries are a safety net for the unexpected, not the backoff strategy.
⚠️ The handler receives `retryCount` and `isRetry`, so "this is the fourth
attempt" is knowable and loggable rather than inferred.

⚠️ **Three smaller edges, each of which produces a wrong-looking system:**

- **The constructor runs before the handler on a cold wake.** So a `setAlarm()`
  in the constructor can overwrite the alarm that was about to fire — Cloudflare
  documents the resulting livelock directly: a constructor that keeps extending a
  deadline means the handler **never runs at all**. Set alarms from writes and
  from the handler, never unconditionally at construction.
- **`getAlarm()` inside a running handler returns `null`** unless `setAlarm()` has
  been called since the handler started. So a handler cannot ask whether it has an
  alarm to decide whether to reschedule — `null` there means *"running"*, not
  *"unscheduled"*, and reading it as the latter is how a schedule gets dropped.
- **There is no documented maximum scheduling horizon.** REQ-1 allows publication
  days or weeks ahead, and `setAlarm()` is specified only as epoch milliseconds
  with no stated ceiling — but "undocumented" is not "safe". ⚠️ Use the pattern
  Cloudflare documents for multi-event scheduling anyway: **keep the schedule in
  storage and chain shorter alarms**, which has no horizon question and is already
  what the earliest-pending design does. A month-out alarm is not something to
  assume; it is something to measure.

⚠️ **And a retraction must never re-arm an item.** An item taken down has its
`retractedAt` set and is excluded from the pending query — not returned to a
pre-publication state. Returning it to "unpublished" makes it due again, and the
next alarm re-announces something that was explicitly withdrawn.
🔴 This exact failure has been observed in production in this problem domain: a
sweep treating a just-ended broadcast as newly due and **re-sending the "is on
air" notification once a minute**, documented by its authors at
`server/main.py:232-238`. Cited as a **REQ** — the requirement is "retraction must
be terminal" — not as a design borrowed.

### 4.5 Authorship and the live path, inverted

🔴 **The composer does not write to the relay. It writes to the store, and the
store publishes to the relay.**

This inverts the obvious design and the inversion is the point. If a composer
posts directly into a room, then **anyone who knows the room name can inject into
the live path**, because the relay is tokenless by design and cannot tell them
apart. Routing the write through the credentialled store closes that entirely:
the only thing that ever speaks into the room is the store, and it speaks only
about things it accepted.

The cost is one extra hop on the write (a few milliseconds, §4.2) and it buys the
difference between "uncredentialled writes are ignored by the record but still
seen live" and "uncredentialled writes do not exist".

### 4.6 Media: a named non-requirement

MEASURED 2026-09-14: the live catalogue's items point at `sirp.ee`, `ubuweb.com`
and `uuu.ee`. **Almost nothing is hosted**, and this design hosts nothing either.

If that changes, the write path already exists — `workers/ingest` mints
server-side session ids, caps per segment / session / principal, and expires on a
cron (`worker.mjs:10-30`). ⚠️ The **trigger for revisiting** is stated so it is a
decision rather than a drift: *the first time an item's content has no URL because
nobody else is hosting it.* Until then, a link is the right representation and
costs nothing.

---

## 5. Delivery, tiered

### 5.1 Three paths to one item

🔴 **This is the section the whole design is organised around**, because the
common error is to pick one mechanism and discover the others were required.

| the reader is | path | reaches them | costs | 🔴 fails by |
|---|---|---|---|---|
| **a phone, app closed** | a **push service** (FCM → APNs) | seconds after the alarm | a service-account credential must live somewhere (§5.3); topic sends give **no per-device accounting** | **silently undelivered** — there is no receipt, and nothing distinguishes "not sent" from "not shown" |
| **an app or browser, open** | the **relay**, a socket | ~40 ms MEASURED | one socket per reader; the caps are per-socket | the relay **drops past its caps and tells the sender nothing** (`plan-ws` §1: 298 of 900 delivered at 300 msg/s, no error, no close) |
| **new, returning, or on a new device** | an **HTTP read** of the catalogue | one request | nothing | a snapshot **races a live message** — fixed by opening the socket first and buffering, §5.5 |

### 5.2 The principle that falls out: announce three ways, be true once

> **The push and the socket are ANNOUNCEMENTS. The catalogue read is the TRUTH.**

Every path carries the **full item**, so a client *may* render immediately and
skip a round trip. No path is *trusted*, so every client is free to ignore what
it was handed and re-read the catalogue. That is what makes three paths safe:
they are three ways of saying "something changed", and exactly one way of
finding out what.

**CONVERGES, and this is the strongest convergence in the document.** A shipping
client in this domain independently chose exactly this discipline, and says so in
a comment — READ, `app/Main.qml:47-51`:

> *"Push is FYI-only (project-description.md #5): NotificationManager never
> mutates the event list from a push payload itself - any push arrival
> (foreground, background, or a notification tap while the app was already
> running) just re-fetches the real list from the server, same as the manual
> refresh button."*

And the code agrees: `NotificationManager::addMessage()` **discards all three of
its arguments** and its body is `emit refreshRequested();`; `upsertEvents()` is
wired from exactly one place — `app/main.cpp:37-41`, to the HTTP fetch — whose
own comment reads *"GET /events is the source of truth on every fetch (launch,
manual refresh, push-triggered refresh)"*.

⚠️ **Meanwhile their server embeds the whole item in the push anyway**
(`server/notifications.py`, `send_event_notification()`: `data` carries
`"event": json.dumps(event)`, with a docstring saying the intent is *"letting the
client render/deep-link into it without a DB round-trip"*). So one half sends a
payload the other half deliberately discards — and the only use of it anywhere in
the client is Android's `resolveTitleAndBody()`, reading it **solely to recover
the banner's title and body** when the OS stripped the notification block.

**That divergence is the argument for this section.** Both halves are defensible
alone; together they are two teams' worth of assumptions that never met. Naming
the principle — *announce three ways, be true once* — makes the payload a
deliberate optimisation a client may take, rather than an accident nobody owns.

### 5.3 🔴 What a backgrounded phone actually does today — stated once, unambiguously

This correction matters because it changes what "the phone was woken" means, and
an earlier summary of mine stated it the wrong way round.

READ, `server/notifications.py`. There are four send functions and they do **not**
carry the same platform configuration:

| function | `apns` block | `android` block | carries the item? | on the live path? |
|---|---|---|---|---|
| `send_single()` | ✅ `sound`, **`content_available=True`** | ✅ `priority="high"`, `channel_id` | no | ❌ |
| `send_to_many()` | ✅ same | ✅ same | no | ❌ |
| `send_to_topic()` | ❌ **none** | ❌ **none** | no | ❌ |
| **`send_event_notification()`** | 🔴 **NONE** | 🔴 **NONE** | ✅ the whole item | ✅ **this is the one the scheduler calls** |

🔴 **So on the live publish path there is neither an `apns` nor an `android`
block.** `content_available` — the iOS silent-wake flag — and Android's
`priority: high` / `channel_id` exist **only in the two functions the scheduler
never calls** (`server/cron_publish.py` calls `send_event_notification` and
nothing else).

**Consequence for a backgrounded phone: it gets a banner, and the app reads the
item when the user taps it. It is not woken to pre-fetch.**

⚠️ This is an **INTEROP fact about an existing deployment**, and it is a
**requirement input** for this design rather than a thing to reproduce: *if silent
wake is wanted, the platform blocks must be sent.* §8.2 says what this design
sends and why.

### 5.4 How each path fails, and what the design does about it

- **Push has no receipt.** Nothing in this design can know an item arrived. So
  the push is never load-bearing for correctness — §5.2 — and the catalogue read
  makes a missed push recoverable rather than fatal. ⚠️ A topic send also cannot
  prune dead tokens, because there are no tokens to prune. Per-device sends can,
  at the cost of holding a device registry, which is a real product decision
  (§10.2) and not a technical detail. ⚠️ And if that decision is ever taken, note
  the target field is moving: `message.token` is now marked **deprecated in
  favour of `message.fid`** (a Firebase Installation ID), with both co-supported
  and **no announced removal date**. A design written today should say `fid` and
  know why.
- **The socket drops silently.** The relay's token bucket does not signal. The
  envelope's `seq` is the only thing that can see it, and a reader that notices a
  gap **re-reads the catalogue** rather than trying to recover the message.
- **The catalogue read races.** §5.5.
- 🔴 **All three can fail at once and look like nothing happened.** So the store
  reports what it sent — next-due, last-alarm, last-push-status — and a page can
  show it. A delivery system with no observable send is one where "nobody posted
  anything" and "everything is broken" are the same screen.

### 5.5 Replay on join, and the ordering rule

1. **Open the socket first and buffer.** Anything arriving before the read
   completes is held, not dropped.
2. **Read the catalogue** over HTTP.
3. **Apply the buffer on top**, newest revision per `id` winning.

⚠️ Reading before opening loses every item published in between, and the loss is
**invisible because both halves succeeded**. `rev` (DIVERGES 2) is what makes
step 3 safe: an overlap is a comparison, not a guess.

### 5.6 The browser tier, and the constraint on it

A browser that is open gets the socket (§5.1). A browser that is **closed** would
need Web Push, and that tier has a platform constraint sharp enough to design
around rather than discover — covered in §5.7 with its evidence, because getting
this wrong produces a feature that looks implemented and reaches nobody.

### 5.7 The push tier, concretely — and two hard limits

**Who sends it.** The catalogue DO, from its alarm (§4.4). No separate service,
no cron, no VM.

**How, with no SDK.** Firebase's legacy server-key auth (`key=AAAA…` against
`/fcm/send`) is **gone** — deprecated **20 June 2023**, shutdown beginning
**22 July 2024** — so **HTTP v1 with OAuth2 is the only route**.

⚠️ **There is no live Google URL for those dates**: the migration guide that
carried them now **404s**, and the wording above is quotable only from a Wayback
snapshot. MEASURED 2026-09-14, which is better evidence than a document anyway:
`POST https://fcm.googleapis.com/fcm/send` with a bogus key answers **404** — the
route itself is gone, not the credential rejected — while
`POST https://fcm.googleapis.com/v1/projects/example/messages:send` answers
**401** with a JSON error body. The v1 control is what separates "this endpoint
is dead" from "Google is 404-ing everything".

A Worker does the whole thing with no dependency:

1. Import the service account's PKCS#8 private key —
   `crypto.subtle.importKey('pkcs8', der, {name:'RSASSA-PKCS1-v1_5', hash:'SHA-256'}, false, ['sign'])`.
2. Sign a JWT (RS256) with `iss` = the service account email,
   `scope` = `https://www.googleapis.com/auth/firebase.messaging`,
   `aud` = `https://oauth2.googleapis.com/token`, `iat`/`exp` at most an hour apart.
3. Exchange it — `POST https://oauth2.googleapis.com/token` with
   `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`.
4. Send — `POST https://fcm.googleapis.com/v1/projects/<project-id>/messages:send`
   with `Authorization: Bearer <access token>`.

⚠️ **The access token lasts ~3600 s and must be cached**, or every publish pays
two extra round trips and an RSA signature. The DO is the natural holder: it is
already a single object with state and it is already the thing that sends. **The
same object owns the schedule, the catalogue and the token** — which is §4.1's
argument arriving a third time.

🔴 **Hard limit 1 — the payload ceiling, and it is smaller for exactly the send
this design uses.** The documented general limit is **4,096 bytes** of payload,
keys and values included — live, on FCM's current message-type page. The
**2,048-byte limit for messages sent to a topic** is the one that would bind
here, because a catalogue-wide announcement *is* a topic message.

⚠️ **And that second number is NOT confirmed for HTTP v1.** It was documented for
the **legacy** HTTP protocol, on a reference page that no longer exists (it now
redirects), and the string `2048` **does not appear anywhere in the current v1
documentation** — not in the overview, the message-type page, the topic page, the
quota page, or the REST reference. It is widely repeated by third parties. Treat
it as **unconfirmed for v1 and measure it**; the design must not rest on a number
nobody can currently cite.

🔴 **What the design does about that is the interesting part, and it does not
depend on which number is right.** A title at its 65-character budget, a summary
at 180, a URL, tags and a typed `source` come to a few hundred bytes — but the
item travels as a **JSON string inside a data value** (FCM data values must all
be strings; v1 removed the legacy API's nested-JSON support, so the conversion is
mandatory), and escaping inflates it. **`extra` is the field that breaks this**,
which is why §3.5 caps it.

⚠️ **This is a second, independent reason the push must not be load-bearing.**
§5.2 argued it from trust; a byte ceiling argues it from arithmetic — and an
*uncertain* ceiling argues it harder, because the failure point is not knowable in
advance. An item can be **too large to announce in full while being perfectly
valid**, so the store **degrades deliberately**: over the limit, it sends the
notification plus the id and kind only, and the client re-reads.
🔴 **Silent truncation is the failure to avoid.** A client receiving half an item
cannot tell it received half, so the store drops the item **wholesale** rather
than trimming, and reports in its own stats that it did. ⚠️ That behaviour is
also the measurement: ship it, then push an oversized item on purpose and read
which ceiling actually bit.

🔴 **Hard limit 2 — Web Push on iOS reaches nobody in a normal tab.** iOS 16.4
added Web Push, **but only to Home Screen web apps**. Apple's own wording: *"Add
web push to Home Screen web apps in iOS 16.4 or later and Webpages in Safari 16
for macOS 13 or later."*

⚠️ **Note the asymmetry, because it is this repo's own lesson in a new accent.**
macOS Safari does Web Push in an **ordinary tab**; iOS Safari does not. Same
engine, different rule — so **"Safari" is the wrong unit**, exactly as CLAUDE.md
already records for the Fullscreen API, where "iOS" was the wrong unit because
iPad carries an API iPhone does not. The unit is **platform plus launch
context**, and it has to be asked rather than branched on.

Four consequences, and together they decide whether a browser-first delivery
story is worth building at all:

- ✅ **A capability probe genuinely works here.** In an ordinary iOS Safari tab
  the API is **absent, not present-and-inert**: `Notification` is undefined and
  `pushManager` is not on the service worker registration. So `caps.mjs`'
  discipline applies directly — probe, un-link with the reason **in words**, and
  a probe that cannot answer returns `unknown` and never blocks.
  🔴 **But `navigator.serviceWorker` IS present in that same tab**, so service
  worker support is **not** a proxy for push support. Probe `Notification` and
  `PushManager`; probing the service worker answers a different question and
  answers it yes.
  🔴 **And the optional-chaining trap is live here**, which this repo has already
  paid for once: `registration.pushManager?.subscribe()` **optional-chains
  straight past a missing `pushManager`** — no throw, no `catch`, no log line,
  and a subscribe button that is inert while looking implemented. That is
  `p.requestFullscreen?.()` on an iPhone, identically.
- 🔴 **There is no programmatic install prompt.** `beforeinstallprompt` is
  Chromium-only, not on a standards track, and unimplemented by Apple. There is
  no API to trigger the Share → Add to Home Screen flow, detect its outcome, or
  detect its availability. The only move is **instructions shown to the user** —
  and only when the probe says we are in a tab rather than an installed app,
  which `navigator.standalone` or `matchMedia('(display-mode: standalone)')`
  answers.
- 🔴 **Safari does not allow an invisible push.** Apple: *"Safari doesn't support
  invisible push notifications… Present push notifications to the user
  immediately after your service worker receives them. If you don't, Safari
  revokes the push notification permission for your site."* ⚠️ So on this
  platform the push **cannot** be used as a quiet nudge to re-read — every push
  must show something, or the subscription dies. §5.2's "announce three ways" is
  compatible with that; a design that used push as a silent sync signal would not
  be, and would fail slowly and invisibly as permissions were revoked one reader
  at a time.
- ⚠️ **The manifest requirement moved, and the answer is to ship it anyway.**
  MDN's compatibility note still says the manifest must carry a non-default
  `display`; WebKit says that as of iOS 26 *"there are now zero requirements for
  'installability' in Safari"* and every added site opens as a web app. I could
  not find a statement resolving whether a **manifest-less** iOS 26 Home Screen
  app gets a defined `Notification`. **Ship `"display": "standalone"` regardless**
  — it costs nothing, it is still required on 16.4 through 18.x which are in the
  field, and it removes the question.

So the honest browser story is: *a browser that is open gets the socket; a
browser that is closed gets nothing on iOS unless its owner installed the page
by hand.* A design that assumes otherwise ships a notification feature reaching a
fraction of its audience and **looking identical to a broken configuration**.

**So the tiers are not symmetric, and §5.1's table is the honest version**: the
native app is the only reader reliably reachable when closed. That is a reason to
keep a native client in the picture, and it is an argument this design owes to
the platform rather than to anybody's code.

⚠️ **Two fan-out facts worth knowing before sizing anything.** The per-project
downstream quota is **600,000 messages per minute**, over which FCM answers
**429 `QUOTA_EXCEEDED`** until the next minute — and those minutes are *not*
clock-aligned. More interesting at this scale: **fan-out capacity is divided
among a project's own in-flight fan-outs**, so two concurrent topic sends each
run at half rate, and concurrent fan-outs are capped at 1,000 per project. An
editorial catalogue publishing items per day is nowhere near any of this; it is
recorded so that nobody has to guess later. ⚠️ Also: the `topic` field takes a
bare name — **the `/topics/` prefix must not be included** — and FCM's own quota
page says these limits are subject to change.

⚠️ **Where the credential lives is a real decision, not a detail.** The Firebase
web config is public by design and is already published in their service worker —
READ, `client/firebase-messaging-sw.js`: project `radio1965-fbffd`, sender
`43305541336`. The **service-account key is not**, and it is **not on this
machine**: `server/config/` contains only a `README.md`. Sending from a Worker
means that key becomes a Worker secret on a shared platform rather than a file on
a box somebody owns, which changes rotation, blast radius and who can read it.
§10.2 asks; it is not ours to decide.

---

## 6. Authorship

### 6.1 Where enforcement can and cannot live

**Not the relay.** It parses nothing (§4.2), and that is the property worth
protecting. A relay that checks a credential per message is a relay that parses
every message.

**Not the reader.** By the time a reader could object, the thing has been said.

🔴 **The write route, before anything is stored** — because it is the only place
that sees a **credential and a document together**, and the only place where
refusing costs nothing.

### 6.2 Tiered by credential, not by deployment

The pattern already exists and ships: `workers/ingest/worker.mjs:36-85`. Its
discipline transfers **exactly**, and it is written down because it was learned:

- 🔴 **the open tier is the DEFAULT VALUE of the variable, never an
  else-branch.** `tierOf()` returns `open` unless a token **validates** — never
  "not open" by elimination, because a truthy check on an absent header hands an
  anonymous caller the trusted tier;
- **constant-time compare**, so the answer does not leak a prefix through timing;
- **the tier is echoed in the response**, so a caller can see what it got and a
  test can assert on it;
- **four assert cases** — absent, empty, malformed, and *wrong* — because "no
  token" and "bad token" are different bugs and only one of them is an attack.

Applied here:

| tier | may | reaches |
|---|---|---|
| **open** (no credential) | **read** the catalogue, open a socket | everything published |
| **editor** (a credential) | **publish**, **edit**, **retract** | the write route |

⚠️ `plan-names` §2 states the honest cost of merging tiers into one surface and
it applies here unchanged: **two workers are two blast radii**, and a mistake in
tier selection is not an error — it is handing an anonymous caller the editor
tier. The discipline above is the price of the merge, and if it is not wanted,
the answer is two routes, not a relaxed check.

### 6.3 What a credential can and cannot be

🔴 **A public page cannot hold a secret.** That reasoning made the relay
tokenless (`workers/ingest/worker.mjs:10-12`) and it constrains this directly:
the composer cannot ship a token in its source.

Two honest shapes, and the design says which is which:

- **A demo tier** — no gate, the page says so in its own words, and it is
  published nowhere a real reader is watching. Correct for proving a *document
  shape*; incorrect for anything a real client reads.
- **A real tier** — the credential is typed at compose time and never stored, or
  held by a small build that is not the public page. The store stamps `by`
  (DIVERGES 8) from whichever principal validated.

⚠️ **Single shared token is the weak point, and §4.1 already names it: no
per-editor revocation.** The upgrade path is per-editor credentials with an id,
which makes `by` meaningful and revocation possible — and that is a real
increment, not a rewrite, because `tierOf()` already returns a principal rather
than a boolean.

### 6.4 Editorial, not chat — what that actually constrains

REQ-7 is not a UI decision. It has three structural consequences:

1. **Write rate is items per day**, which is what lets §4.3 put one catalogue in
   one Durable Object.
2. **Every write is attributable**, because there are few enough writers for that
   to be meaningful.
3. **There is no reply, no thread and no presence** — so none of the machinery
   those need exists, and adding any of it later is a different product, not a
   feature.

---

## 7. The views

### 7.1 One page, not two

The brief left this open and asked for a recommendation. **One page.**

1. **The subject is that composing and reading are the same list.** Splitting
   them into two surfaces is the failure `wire` already paid for and documented
   (`demo/wire/index.html:105-113`): live traffic and stored history lived in two
   panes, and *"one message looked like two unrelated things depending on which
   half of the page it was in"*. A catalogue earns that faster, because a
   composed item and a published card genuinely do look different.
2. **One page can assert the whole loop** — compose → store → announce → read →
   render — which is **mechanism**, and mechanism is what this repo asserts on.
   Two pages means each has to simulate the other's half to have anything to
   assert against.
3. **The claim being made is that one document serves both roles.** Demonstrating
   it on one surface is the argument; splitting it quietly concedes it.

### 7.2 What is on it

- **The `what` paragraph** — three or four sentences, no jargon. ⚠️ CLAUDE.md
  bans `fold`, `lane`, `deck`, `commit` in anything a visitor sees.
- **A four-cell readout.** `mount()` **throws** on an odd count
  (`demo/shell/shell.mjs:69-73`), and every cell must be able to move:

  | cell | unit | why it moves |
  |---|---|---|
  | `showing` | — | items visible right now, after the clock is applied |
  | `stored` | — | revisions in the catalogue; differs from `showing`, because edits and retractions are rows too |
  | `next due` | — | time to the next scheduled publication — 🔴 **§4.4's silent failure made visible**, and the single most valuable cell on the page |
  | `delivery` | ms | composer's stamp to its own echo |

  ⚠️ A cell holding a room name or a cap would be a **constant**, which teaches a
  reader to ignore the row.

- **The composer** — the fields of §3.2, with `title` and `summary` showing their
  budgets and where truncation falls (§3.5), and a **Notify** control, because
  whether a phone buzzes is a decision an editor makes per item, not a property
  of the item (§8.2).
- **The shelf** — published items as cards: kind, title, summary, link, the two
  instants rendered in local time, tags, derived status.
  ⚠️ **Colour says status, never kind.** CLAUDE.md's rule is that a mark's colour
  says how something landed, not which lane it is in — kind is a word, and colour
  is reserved for *scheduled / live / shelved / retracted*.
- **The raw document for the selected card** — because "this is the shape that
  travels" is a claim about bytes, and the only way to make that checkable is to
  show the bytes. `createMessageList` (`demo/shell/messages.mjs:36`) already does
  this.
- **Controls** — `Publish` (primary), `Retract`, `Clear the catalogue`, plus
  hidden mechanism checks behind `?checks=1`. ⚠️ A control the harness cannot
  reach is a subject the suite silently stops testing, so they are **hidden, not
  removed**.

⚠️ The composer block goes **above** `.pos-controls`, never inside it — `wire`
does `cbar.parentNode.insertBefore(compose, cbar)` (`demo/wire/index.html:100`)
precisely so the primary button stays in the one row the harness walks while
still sitting under the fields it sends.

### 7.3 Does an item render as content?

| kind | on the page |
|---|---|
| `note` | yes — the summary **is** the content |
| `audio` / `video`, not live | a card with a link; playable where the origin allows it |
| `page` | a card with a **link out**. ⚠️ **Not an iframe** — embedding arbitrary third-party HTML in a positron page is a separate decision this page does not get to take alone |
| anything with `live: true` | 🔴 **the strongest case, and it can actually play.** A public Icecast mount on plain HTTP with no CORS is unreachable from any HTTPS page — positron's `shout` worker already re-serves exactly this one over TLS with `access-control-allow-origin: *`, MEASURED at 200 with `icy-name` preserved and TTFB 300 ms. A card that says "we are on air" and then **plays, in the page that composed it**, is worth more than a paragraph about streams |

### 7.4 🔴 What the kit does not have — reported, not built

CLAUDE.md is explicit: **build from `/kit/`, and if the thing you need is not
there, stop and ask.** Surveyed:

| need | present? | what exists |
|---|---|---|
| kind picker (4 values) | ✅ | `picker.mjs` → `createPicker({label, prev, next, onPick})`, or `choice.mjs` for a segmented row at this count |
| log | ✅ free | `mount()` returns `log` / `clearLog` |
| raw-document list | ⚠️ partial | `messages.mjs` → `createMessageList` — a flat four-column list, **not cards** |
| text input | 🔴 **no** | nothing in the kit creates an `<input>`; page-local precedent at `demo/wire/index.html:92` and its `.compose` CSS at `:16-19` |
| textarea | 🔴 **no** | page-local: `demo/vclick/index.html:117` |
| date / time input | 🔴 **no** | **nothing in the whole repo** — no `datetime-local` anywhere |
| tag input with suggestions | 🔴 **no** | no `<datalist>` anywhere |
| checkbox / toggle | 🔴 **no** | substitute: a two-option `createChoice`, or an `aria-pressed` button |
| status badge | 🔴 **no component** | CSS only — `.pos-tag` (`shell.css:452`), `.tbar-badge` (`:405`), `.pos-hw-tag` (`:245`) |
| card grid | 🔴 **no** | closest is 8 lines of page CSS at `demo/seek/index.html:14` |

**Six missing components for one page.** ⚠️ `demo/kit/index.html` has no form
section **because there are no form components** — this would be the project's
first real forms consumer. Two of the six are already on the standing gap list
(HANDOFF.md:483-486, PROGRESS.md:736-739: *the publisher badge*, carried as
byte-identical copies in `webrtc` and `llhls`, and *a labelled tile grid*), which
means this page would be the **third** caller for a badge and the **second** for
a grid — the point at which the rule says build the component rather than the
next copy.

**Ask before building any of them.** §11 keeps stage 1 buildable without them.

---

## 8. Interop — meeting an existing client at the edge

Everything above is designed without reference to anyone's schema. **This
section is where it meets one**, and it is deliberately at the back: interop is a
projection at a boundary, not an internal model.

The target is the Radio 1965 app ("Väin", Qt 6 / QML, `org.eccm.vain`). Two
projections and one inbound adapter.

### 8.1 Projection onto an `events` row

🔴 **The entire integration surface is one HTTP GET.** READ,
`app/eventsapiclient.cpp:16-44`:

```cpp
QNetworkRequest request(QUrl(baseUrl + "/events"));
…
const QJsonArray events = doc.object().value("events").toArray();
```

No auth, no paging, no delta, **and no WebSocket** — READ, `app/CMakeLists.txt:9`,
`find_package(Qt6 REQUIRED COMPONENTS Quick Network Multimedia WebView)`, with no
`WebSockets` module, and `git grep -i websocket` over `app/`, `client/` and
`server/` returning **nothing**.

⚠️ **So the socket tier of §5 does not reach this client at all**, and cannot
without adding a Qt module and shipping through two app stores. For this client
the three tiers collapse to two: **push, and the catalogue read.** That is not a
shortcoming of the design — it is why the design has tiers.

**The consequence is the highest-value thing in this document:** a route that
answers `{"events":[…]}` in their shape lets this client read from a positron
catalogue by changing **one base-URL string** — no rebuild, no app-store round
trip.

| our field | their field | the projection |
|---|---|---|
| `id` | `id` | passed through. ⚠️ Theirs is `VARCHAR(64)`; 32 hex characters fits |
| `kind` + `live` + `source.kind` | `type` | 🔴 **collapsed** onto their flat enum. `note`→`text`; `page`→`webcontent`, or `article` when `source.kind == 'joomla'`; `audio`/`video` → the plain or `…stream` variant by `live`; `live && source.kind == 'icecast'` → `livestream` |
| `title` | `title` | passed through, ≤255 |
| `summary` | `summary` | passed through |
| `url` | `url` | passed through; `""` when null, matching their default |
| `publishAt` | `publish_at` | 🔴 **epoch ms → a naive local ISO string**, §8.4 |
| `shelfAt` | `shelf_at` | same conversion, or `null` |
| derived status (§3.3 D4) | `status` | computed at read time onto their four names: `unpublished` / `new` / `shelved`, and `archived` when `retractedAt` is set |
| — | `comments_enabled` | 🔴 **emitted as `false`.** We do not model it (DIVERGES 6); their client reads the key, so the projection supplies it |
| `tags` | `tags` | passed through as a flat string array |
| `source` + `extra` | `payload` | 🔴 **merged.** ⚠️ `source.ref` for a CMS item **must** surface as `payload.article_id` — their client uses it to fetch the article body, and losing it silently empties every article card |
| `rev` | — | **dropped.** Their model has no revisions; the projection emits the latest |
| `by` | — | **dropped.** Their schema has no author field |

⚠️ Ordering and limit: `publish_at` descending, **200 rows**, matching what their
server does (`server/main.py:258`) so the two feeds can be diffed without an
off-by-N.

⚠️ **Read their field set from `server/db.py:33-57`, not `sql/schema.sql`.** The
DDL's type enum omits `livestream` while `db.py` has it and production serves it
— MEASURED, `evt_1789402021908`, `"type":"livestream"`, 2026-09-14. A projection
built from the DDL would refuse to emit the most visible item they have.

### 8.2 Projection onto a push payload

The push carries the **full item** (§5.2 — announce three ways, be true once), so
a client that wants to render without a round trip can, and one that would rather
re-read is unaffected.

- **notification**: `title` → title, `summary` → body. §3.5's budgets exist for
  this.
- **data**: the item, plus its id and projected type. ⚠️ FCM data values are
  strings, so a nested object travels as a JSON string — which is an encoding
  constraint, not a modelling one, and it is why §3.5 caps `extra`.
- 🔴 **platform blocks are SENT, and this is a deliberate difference.** §5.3
  establishes that the existing live path sends **neither** an `apns` nor an
  `android` block, so a backgrounded phone gets a banner and reads on tap rather
  than being woken. This design sends them — the iOS silent-wake flag and the
  Android channel and priority — because REQ-3 is *waking a closed phone* and a
  path that only wakes on tap does not meet it.
  ⚠️ Stated as a **requirement met**, not a defect fixed: their choice is
  defensible if tap-to-read is the intended behaviour, and §10.2 asks.
- **Notify is per item**, set by the composer (§7.2). Not every item should
  buzz; a correction to a typo should not.

### 8.3 Joomla as an inbound adapter

REQ-6: long-form articles are authored in a CMS that **stays**. It is a content
**source**, not a competitor, and it survives whatever replaces a server.

MEASURED 2026-09-14: `eccm.ee` is Joomla (`<meta name="generator" content="Joomla!
- Open Source Content Management">`, `/administrator/` → 200, its Web Services
API → **401** unauthenticated, correctly gated). INTEROP facts for the adapter,
READ from `server/joomla_importer.py`: articles come from
`{base}/api/index.php/v1/content/articles` with `filter[state]=1`,
`filter[category]=47`, a Bearer token and `Accept: application/vnd.api+json`; the
list endpoint returns the body under **`text`** — ✅ confirmed against Joomla's own
source, whose articles view sets `$item->text = $item->introtext . ' ' .
$item->fulltext` and exposes neither of the other two.

The adapter maps an article to an item: `kind: 'page'`, `live: false`, title
through, body stripped to a summary, the article's link as `url`, its publish
window onto the scheduling pair, tags through, and
`source: { kind: 'joomla', ref: '<article id>' }` — which is what §8.1 projects
back to `payload.article_id`.

🔴 **And the adapter retracts, which is a requirement (REQ-4) that the existing
one does not meet.** Two facts combine in the running system: the fetch asks
`filter[state]=1` — Published only — and `run_import()` (`:186-218`) has an
`if existing is None: … else: …` and **no delete path at all**. So unpublishing
an article in the CMS does not take the card down; it simply stops appearing in
the fetch and **sits in the catalogue indefinitely**. A one-way door, silent at
both ends.

The fix is cheap and belongs in the adapter: periodically list **all** published
ids in the category, and any item with `source.kind == 'joomla'` whose `ref` is
absent gets `retractedAt` set. ⚠️ This is a requirement met, not a behaviour
copied — and it is worth telling them regardless of whether anything here is
built.

### 8.4 🔴 The timezone boundary, which is where this will break

Our instants are epoch milliseconds (DIVERGES 5). Their contract is a **naive
local datetime string with no zone** — READ, `server/joomla_importer.py:66-72`
says so outright (*"as naive local time, matching the rest of the app"*), and
MEASURED confirms it: `"publish_at":"2026-09-14T19:07:02"`, no `Z`, no offset,
while Icecast reports the same broadcast starting `2026-09-11T19:19:59 +0300`.

So §8.1's conversion **must name a zone** — Europe/Tallinn — and that name is a
configured value, not a constant compiled in. ⚠️ An hour's error in a publish
time reads as an editorial decision rather than a bug, which is exactly why this
gets its own section instead of a footnote.

⚠️ **INFERRED, and worth their attention:** Joomla stores `publish_up` as UTC and
serves a bare datetime string; their importer reads it with
`datetime.fromisoformat()` into a naive local value and compares against
`datetime.now()`. If that reading is right, CMS-sourced items are **2–3 hours
early** for Estonia. It is masked for anything already published, because the
importer clamps a past time up to now — so it would only bite a **future-dated**
article, which is precisely the case nobody tests. One future-dated article
settles it; it needs their token, so it is a question (§10.2), not a claim.

---

## 9. What this deliberately does not do

⚠️ A proposal that lists only wins gets taken apart in five minutes by whoever
owns the thing it touches. Each of these is a decision with a reason, not an
omission.

| not done | why, and what would change it |
|---|---|
| 🔴 **Deliver the push itself** | Waking a closed phone is a **platform capability** belonging to APNs and Google. This design *triggers* and *formats* a push; it does not replace one. Nothing changes this |
| 🔴 **Replace the CMS** | REQ-6: long-form authoring — 800 words, images, a WYSIWYG, editors who already know it — stays where it is. A composer with a summary box is not a substitute and claiming otherwise loses the argument immediately. §8.3 makes the CMS a first-class **source** |
| **Article rendering** | An article's body lives behind its own origin's API, reached with a token a public page must not hold. Cards link out. Would change if the CMS ever served the body publicly with CORS |
| **A native client** | §5.7 establishes the native app is the only reader reliably reachable when closed. This design serves it (§8.1); it does not rebuild it |
| **Roles and per-editor permissions** | §6.3 ships **one credential tier**. Real roles need per-editor identities, which is a real increment (§6.3's upgrade path) but not stage one. ⚠️ Conceded fully: a CMS's ACL is richer than this |
| **A revision UI** | The store keeps every revision (DIVERGES 2) so the **data** for history exists. The **interface** — a diff, a restore button — does not. Precise concession: the archaeology is better, the editing is worse |
| **Preview and drafts** | An item scheduled ahead is invisible until due, and nothing renders it for its author first. A real gap, and an easy one to close later |
| **Localisation** | ⚠️ No language field, and the client this interoperates with has none either — so the catalogue would be a step back from a multilingual CMS for the articles it carries. `source`/`extra` can hold a tag today; a real answer needs a decision about whether it is one catalogue or several (§10.2) |
| **Search at scale** | Reading 200 items and filtering in a page is fine. Twenty thousand is not. The ceiling is stated rather than the capability |
| **Comments** | DIVERGES 6. A separate resource if it ever exists |
| **Hosting media** | §4.6, with a named trigger for revisiting |
| **Anything at message rates** | §4.3. One catalogue, one Durable Object, items per day |

---

## 10. Risks and open questions

### 10.1 Ours

1. 🔴 **A missed alarm re-arm is silent** (§4.4). The mitigations are a heartbeat
   re-arm and a visible `next due`; neither is free and both must exist from the
   first version, because this failure has no symptom until somebody complains.
2. 🔴 **Nothing can confirm a push arrived** (§5.4). The design makes this
   survivable rather than solved, and must not be described as solved.
3. 🔴 **The push payload ceiling can make a valid item unannouncable in full**
   (§5.7) — and ⚠️ **the binding number is not currently citable**: 4,096 bytes is
   documented, the 2,048-byte topic figure survives only in withdrawn legacy docs.
   Degrading to id-and-kind is the answer and it does not depend on which is
   right; **silent truncation is the failure to avoid**, and the degradation path
   is also the measurement that settles the number.
4. ⚠️ **Three platform facts this design rests on are soft.** No documented
   maximum alarm horizon (§4.4 — chain short alarms rather than assume);
   `message.token` deprecated in favour of `fid` with no removal date (§5.4);
   and whether a manifest-less iOS 26 Home Screen app gets a defined
   `Notification` (§5.7 — ship the manifest regardless). None blocks the design;
   all three would silently date it.
5. **One Durable Object is one writer** (§4.3). Correct here, wrong for anything
   faster, and the trigger for repartitioning is stated as a number.
6. **One shared credential has no per-editor revocation** (§6.3).
7. **`demo/shell/wire.mjs:35-40` is stale by 8× and 16×** (§4.2) and claims in a
   comment to be read from the relay. Fix before any page quotes it.
8. **Six kit components are missing** (§7.4). Two are already on the standing gap
   list. Ask before building.
9. **The timezone boundary is where interop breaks** (§8.4), and an hour's error
   looks like an editorial decision rather than a bug.
10. **The harness drives whatever room is the default.** A page carrying
   `room: 'fixed'` in `demo/manifest.mjs` is driven on every `verify.mjs` run, so
   the default must be a scratch catalogue and the real one reached explicitly.
   One line; forgetting it is expensive in a way that is visible to somebody else.
11. **Effort in §11 is estimated, not measured** — guesses about work, in the
    register `research/uuu-integration-2026-09.md` §2 uses.

### 10.2 Theirs — only they can answer

1. 🔴 **Where may the FCM service-account key live?** §5.7. Two shapes and it is
   their call: a Worker secret, or their existing process stays as a thin
   notifier that the catalogue calls at publish time. The second keeps the key
   exactly where it is and still removes the cron, the poll, the database and the
   editor page. **This decides how much of the existing server survives.**
2. 🔴 **Is tap-to-read the intended behaviour on a backgrounded phone?** §5.3: the
   live path sends no `apns`/`android` blocks, so there is no silent wake. If
   that is deliberate, §8.2's difference should be reverted; if not, it is a
   one-line fix in their existing system whether or not any of this is built.
3. **How long must an item stay retrievable?** Indefinite is assumed (REQ-8).
   ⚠️ This is the cheapest question here and it decides whether the existing
   24-hour-ring recorder can be reused at all (§4.3).
4. **May a client be repointed, or must the existing URL keep answering?** §8.1's
   one-string change exists, but only they can say whether production goes
   anywhere.
5. **Should the CMS adapter retract?** §8.3 — unpublishing an article currently
   leaves the card up forever. This design fixes it; confirming they want that is
   a five-word question.
6. ⚠️ **Are CMS-sourced publish times off by the UTC offset?** §8.4, INFERRED. One
   future-dated article settles it.
7. **Is the publish endpoint's lack of authentication known?** Their
   `POST /events/publish` answers on the public deployment with
   `allow_origins=["*"]` and no credential, and their own code carries a
   *"restrict before production"* comment. 🔴 **Raise privately and first**, and
   independently of this proposal.
8. **One catalogue or several?** §9's localisation row.
9. ⚠️ **Licence.** `github.com/tarmoj/radio1965` reports `license: null`. This
   repo **may read it and may not copy from it**. §0's clean-room rule is what
   makes that safe: the design is argued from requirements, and their repo is
   cited only for requirements and interop bytes. Worth asking them to add a
   licence regardless.

---

## 11. Staged build order

Effort in **sessions**, and they are guesses about work, not about value.

### S1 — the document and the loop, in a page. One session.

`demo/<slug>/index.html` plus one row in `demo/manifest.mjs` (`act: 5`,
`tags: ['WS', 'DO', 'SQLite']`). Composer of §3.2, catalogue in a Durable Object,
shelf rendered from a read, `Clear the catalogue`. **No push, no credential** —
those are S3 and S4, and the page says so in its own paragraph.

**Asserts — mechanism, and every one runs on every run:**

- an item survives the round trip with **every field intact** — a deep compare
  against what was composed, not a spot check on the title;
- a second publish of the same `id` with a higher `rev` **replaces**, and one
  with a lower `rev` **does not**;
- a `retract` removes it from the visible set and **cannot be undone by a later
  alarm** (§4.4's rule, asserted rather than commented);
- derived status matches the clock at **both** boundaries — before `publishAt`
  and after `shelfAt` — because a design that branches must assert every branch;
- the catalogue is on the page **before anything is composed**;
- clearing empties it and the counts say so.

**Hidden behind `?checks=1`:** a revision arriving out of order; an item whose
projected payload exceeds the topic ceiling degrades to id-and-kind rather than
truncating (§5.7); an `extra` over its cap is refused at the write.

🔴 **Handed over as a URL, not a path.**

### S2 — the projection. Half a session. **The one that matters to a real client.**

§8.1's route, answering `{"events":[…]}`, plus a check that **diffs it field by
field against a live instance of the shape it targets**. ⚠️ This turns the claim
into a measurement: an existing client reads from it by changing one base-URL
string, with no rebuild and no app-store round trip — which, given §8.1's missing
WebSockets module, is the only path into that client that exists.
**Do not repoint anybody's app.** Offer the URL.

### S3 — scheduling. One session.

The alarm of §4.4: earliest-pending, re-armed last, idempotent, heartbeat, and
`next due` in the stats. 🔴 **Break the re-arm on purpose once** to prove the
heartbeat recovers it — CLAUDE.md's rule, and the only way a silent failure gets
a test.

### S4 — the push tier. One session, and it is the one with a dependency.

§5.7's OAuth2-and-send, the cached access token in the DO, the platform blocks of
§8.2, and the size-degradation path. ⚠️ **Blocked on §10.2 question 1** — the
credential decision is theirs, and the same code serves either answer (a Worker
secret, or a call out to a thin notifier), so build the send behind one interface.

### S5 — the inbound adapter. One session.

§8.3, **including retraction**, which is the requirement the existing path does
not meet.

### S6 — the kit components. One session, and only if S1 says they are wanted.

§7.4's six, as modules in `demo/shell/` with sections in `demo/kit/`. ⚠️ `wire`'s
`.compose` block should be **absorbed**, not copied.

### What to do first, in one line

**S1**, because it costs a session, needs nothing from anybody, and turns an
architecture into a URL that can be opened and typed into.

---

## 12. Sources

**This repo:** `CLAUDE.md`, `LAYOUT.md`, `plan-ws.md`, `plan-names.md`,
`HANDOFF.md:478-492`, `PROGRESS.md:730-740`,
`research/radio1965-app-2026-09.md`, `research/uuu-integration-2026-09.md`,
`demo/shell/wire.mjs`, `demo/shell/shell.mjs`, `demo/shell/messages.mjs`,
`demo/shell/picker.mjs`, `demo/shell/choice.mjs`, `demo/shell/caps.mjs`,
`demo/wire/index.html`, `demo/manifest.mjs`, `workers/relay/src/index.js`,
`workers/backlog/src/index.js`, `workers/ingest/worker.mjs`.

**MEASURED 2026-09-14, ~16:21–16:26 UTC:**
`https://ws.positron.studio/` → relay limits;
`https://backlog.positron.studio/` → retention;
`https://live.uuu.ee/radio1965/api/events` → 200, 8 items;
`https://eccm.ee/` → Joomla generator tag, `/administrator/` → 200,
`/api/index.php/v1/content/articles` → 401.

**Cited for REQUIREMENTS and INTEROP only** (§0), `github.com/tarmoj/radio1965`
@ `origin/main` = `8606632`, 2026-09-14: `project-description.md`,
`server/db.py`, `server/main.py`, `server/notifications.py`,
`server/cron_publish.py`, `server/config.py`, `server/joomla_importer.py`,
`sql/schema.sql`, `client/firebase-messaging-sw.js`, `app/CMakeLists.txt`,
`app/main.cpp`, `app/Main.qml`, `app/eventsapiclient.cpp`,
`app/notificationmanager.cpp`,
`app/android/src/org/eccm/radio65/PushMessagingService.java`.

**Platform documentation**, for the mechanics in §4.4, §5.7 and §8.3:
FCM's `projects.messages/send` REST reference, message-type and
throttling-and-quotas pages; Google's OAuth2 service-account flow (the RS256
claim set and the `jwt-bearer` exchange); MDN's `SubtleCrypto.importKey`/`sign`
and its `Notification` browser-compat data; Cloudflare's Workers Web Crypto,
Durable Object alarms and Storage API pages; Apple's web-push documentation and
WebKit's iOS 16.4 and Safari 26 announcements; and Joomla's own `com_content`
API source for the `text` attribute.

🔴 **Five citations are to withdrawn or absent documentation, and the document
says so where it uses them** rather than laundering them into facts: FCM's
legacy-shutdown dates (migration guide now 404s — §5.7 leans on a MEASURED 404
against the dead endpoint instead), the 2,048-byte topic limit (legacy protocol
reference, removed — §5.7 marks it unconfirmed for v1), Cloudflare's accepted
`importKey` formats (it says "implements all operations of the WebCrypto
standard" and defers to MDN — the `pkcs8` path is an inference, trivially
provable with a five-line Worker), the maximum alarm horizon (undocumented), and
the iOS 26 manifest question (WebKit and MDN disagree).

⚠️ `plan-names.md`'s header still reads **"Status: not started"** and is stale —
the tiering it argues for is shipped in `workers/ingest/worker.mjs:36-85`. Noted
rather than edited, since this document changes nothing.
