# plan-jam — two machines on one pulse, and the number nobody has measured

Status: **written 2026-09-14, P1 in flight.** Proposed after reading `jam` and
`instrument` beside `click`, and finding that the three are the same page with
different scores — and that the one measurement this repo still owes itself
falls out of making them so.

Read `plan-uuu-local.md` §4 and `research/uuu-integration-2026-09.md` §2.4
first: this is the build that answers their open question, and the reason to
do it is not tidiness.

---

## 0. One line

**`jam` is already the score-plus-clock architecture and `instrument` is
already the per-event one. The comparison between them is a RUN, not a build —
what is missing is a second machine.**

---

## 1. What these two pages are

| | `jam` (141 lines) | `instrument` (262 lines) |
|---|---|---|
| what crosses | nothing, per beat | `{note, vel}`, per press |
| the clock | `createPeer` — NTP-style exchange, fastest sample kept, lowest peer id elected reference | the sender's `Date.now()` stamp |
| what it reports | `offset` · `round trip` · `others` · `beat` | `note in` · `sound back` · `sent` · `received` |
| who leads | nobody — every device derives the grid from the shared clock | whoever pressed |

Both are real and both were measured when they were built. `instrument`'s
design decision is worth keeping in front of any rewrite: **what crosses the
wire is a note NUMBER, stamped by the sender** — raw MIDI bytes never leave the
page that owns the device, so the relay carries music rather than a device
protocol and cannot tell a MIDI keyboard from a tapped screen.

---

## 2. What is dated, specifically

Not style. Each of these is a mechanism that now exists once in the repo and
twice on these pages.

- 🔴 **`jam` schedules with `setInterval(…, 12)`** and derives the beat by
  modulo. That is a hand-rolled scheduler — the same shape as the
  `requestAnimationFrame` trigger just taken out of `click`, where in a
  background tab `late` read **2487.2 ms** of browser throttling and **2.1 ms**
  once the deck's worker tick host owned the clock.
- 🔴 **`instrument` uses a raw `ws.send(JSON.stringify(…))`**, not
  `demo/shell/wire.mjs`. No envelope, no `seq`, no reconnect. It predates the
  one-message-shape decision of session 14, so it cannot see the relay dropping
  under its own caps — which is silent, by measurement: at both 120 and 300
  msg/s exactly 298 messages arrive in three seconds and **the sender is told
  nothing**.
- **Neither has a timeline.** No deck, no transport bar, no strip. `jam`'s
  score is two constants, `BEATS = 8, LOOP = 2000`.
- **Both check themselves only when a button is pressed.** A page that checks
  itself only when asked is a page nobody checks — the rule `rack` produced.
- **`instrument` is partly superseded.** `rack` (Ableton on the studio Mac) and
  `/box/` (the Raspberry Pi) are the grown-up form of "the sound is made
  somewhere else", with measurements neither of these pages has.

---

## 3. The M1 and the Pi — verified, not assumed

✅ **`proto/looper/peer.mjs` runs unmodified in node.** `wsTransport` uses only
the standard `WebSocket` API, and node has a global `WebSocket` (checked
2026-09-14). `rig/box/ask.mjs` already joins a relay room from node in 57
lines.

So the second peer does not have to be a browser, and it should not be: *open
this page twice* is a demo of one machine, while *a browser here and a
Raspberry Pi in another building on one pulse* is the thing being claimed.

---

## 4. Phases, in the order that unblocks the most

### P1 — `rig/peer.mjs`, a node peer  ← the piece that does not exist

Joins a room, runs the same clock as the page, prints its own offset and RTT.
Nothing else waits on anything else; everything waits on this.

**Done when** it runs on the Pi and on the studio Mac, and a browser on this
LAN sees it in `others`.

### P2 — `jam` onto a score document and a deck

Its eight beats become a `scoreDoc` exactly as `click` builds one; the deck's
worker host fires them; a transport bar and a strip put the pulse on a line.
At that point `jam` and `click` are one page with two scores, which is the
honest relationship between them.

**Done when** `jam` has no scheduler of its own, its score is a document, and
its assert count is not lower than it is today.

### P3 — the number nobody has: min-RTT skew over a real link

`HANDOFF` still lists it, and the note is careful to call its fastest chain
(20.6 / 52.1 / 57.9 / 67.0 ms p50/p90/p95/p99) a **floor**, not a LAN figure —
everything so far is loopback.

🔴 **The trap decides the instrument, so it is chosen BEFORE the rig.**
Measuring the shared clock's agreement *with* the shared clock is circular — it
reports the estimator's opinion of itself. Two non-circular instruments this
repo already owns:

- **the burned clock** — `demo/shell/pattern.mjs` writes a clock into pixels and
  `readBurned` reads it back, 600/600 exact through three moves. Two screens in
  one camera frame needs no clock agreement at all.
- **round trip on ONE clock** — every timing measured at the machine that sent,
  never across two `performance.now()`s, which are private to a document and
  cannot be compared.

**Done when** there is a skew figure that says which link it was taken over,
and the method is one of the two above rather than the clock grading itself.

### P4 — `instrument` onto `wire.mjs`, and its notes onto a deck

Its two latency cells are the best numbers either page has; they stay. What
changes is the envelope underneath them and that a played phrase lands on the
line and can be scrubbed.

---

## 5. What this is FOR, and it is not tidiness

`plan-uuu-local` §4 argues that compiling a score removes the network from the
timing path, and the argument rests on two measured legs:

| leg | typical | p95 | over 100 ms |
|---|---|---|---|
| direct peer-to-peer, one room | **6.00 ms** | 8.20 ms | 0 of 100 |
| via the Cloudflare relay | **68.90 ms** | 94.80 ms | **4 of 100** |
| the Durable Object hop itself | 0.18 ms | — | — |

**For a per-event click track the relay is fatal** — 4% of beats more than
100 ms late, and it is the variance a player hears, not the latency. vClick's
client has a manual delay knob for exactly this, and a constant cannot correct
a distribution.

**For score-plus-clock the relay never enters the timing path.** The score
crosses once; after that each device derives position locally. What matters is
skew, and skew estimation is scale-free — *a 311 ms link estimates as well as a
1.3 ms one*. Measured: min-RTT-of-N reads **±0.15 ms with 7 µs of drift over 25
minutes**, against **±50 ms of BIAS** — not jitter, so it does not average out —
if a Worker `/time` endpoint is asked instead.

🔴 **So the answer to "is the relay killing us, do we need a LAN" is: only if
something crosses per beat.** A LAN rescues the architecture that pushes
events and is nearly irrelevant to the one that pushes a score. That inverts
the intuition, which is exactly why it has to be measured rather than asserted
— and P3 is the measurement.

---

## 6. Traps

- **Do not put anything back in the per-beat path.** `plan-uuu-local` §6, and
  every convenience pulls that way.
- **A shared clock cannot grade itself.** §4 P3.
- **`performance.now()` is private to a document.** Two of them are not
  comparable, at all, ever.
- **Loopback is not a LAN**, and any figure from P3 must say which it is.
- **A count is only evidence on the far side of the boundary.**
  `createMidiLane`'s `scheduled()` counted what the page QUEUED and read
  identically to delivery while every note was scheduled fifty-six years out.
- **A fixed room name is a shared mutable global** — the port lesson at the
  WebSocket layer. Every run gets its own room; the four that keep their names
  keep them because the name is a machine's address.

---

## 7. Definition of done

1. A node peer runs on the Pi and on the studio Mac and a browser sees it.
2. `jam` holds a score document and has no scheduler of its own.
3. There is a skew number over a real link, taken with an instrument that is
   not the clock being measured, and it says which link it was.
4. `instrument` speaks the same envelope as everything else on the relay.
