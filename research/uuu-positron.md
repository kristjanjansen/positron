# positron and U:

Read from the code, not the pitch: `tarmoj/radio` cloned, the other 40
repos read over the API. Both projects make media happen at the right time in
more than one place. They answer it differently, and each answer follows from
where the work happens.

---

## The one place they already agree

VideoSync's README:

> Drift correction — playback rate is nudged (±5 %) when drift is small; hard
> seek is used when drift exceeds 500 ms.

`timeline/media-master.mjs`, rule L2:

> DRIFT IS A `sync()`, A DISCONTINUITY IS A `seek()`. Inside `jumpMs` the error
> is frame quantisation and decode jitter. Past `jumpMs` the element has MOVED,
> and a sync would leave every cue in between pending, to be burst all at once.

Two codebases, no contact, same structure: nudge inside a threshold, seek
outside it. 500 ms there, 250 ms here. When two independent implementations
converge on a mechanism, that is the mechanism being right rather than either
team being clever. It is also the natural place to start talking.

---

## Where they diverge

| | U: / tarmoj | positron |
|---|---|---|
| sync authority | a Host device on the LAN | shared skew-corrected epoch, or media-as-master |
| reach | one room, one wifi | anywhere with a network path |
| score format | **Csound** (vClick) | JSON quotations (`score.mjs`) |
| control transport | OSC and WebSocket over LAN | WS relay + Durable Object |
| infrastructure | a hand-administered VPS | versioned; one command deploys |
| measurement | none in any repo | the whole `rig/` |
| time model | now, plus `publish_at` / `shelf_at` | deep time, uncertainty brackets |

### One room, or the internet

Everything U: builds assumes **a wifi network you can see**: VideoSync does UDP
broadcast discovery and elects a Host device; vClick sends OSC to players in the
same hall; `location-music` tracks musicians moving around a concert space.

positron never assumes a shared LAN. `peer.mjs` cannot use
`performance.now()` across two documents — their origins differ — so it runs an
NTP-style exchange, keeps only the fastest sample, and elects the **lowest peer
id** as reference: no election protocol, no leader heartbeat, no split brain.
That machinery is pure overhead in one room and the only thing that works
between two cities.

### Measured, or not

`rig/` exists to produce numbers, and they set the design: MoQ browser-to-browser
**26 ms** p50 at 720p30, WebRTC WHIP/WHEP **74 ms** glass-to-glass, tuned LL-HLS
**2.4–4.0 s**, a Durable Object cue relay at **27 ms**. The word `drift` appears
exactly **once** across all 40 U: repos — in VideoSync's README, as a feature
description. There is no harness anywhere.

That is not a criticism of craft; it is a difference in what the work is for. A
piece that runs once in a hall is verified by the performance. A platform is not.

---

## Icecast, since both projects lean on it

Icecast is a shoutcast-style audio server, and its model is the opposite of
HLS's. A **source client** opens one HTTP request to a **mountpoint** and then
writes MP3 frames forever; a **listener** does a plain `GET` on the same path
and the server copies bytes to them. No manifest, no segments, no playlist —
which is why `<audio src="https://icecast.err.ee/vikerraadio.mp3">` needs no
library at all, and equally why there is no seeking and no DVR.

Three things follow in `radio`:

- **The mounts are declared in advance, and that is the capacity limit.**
  `icecast.xml` defines five — `radio`, `user1`–`user4` — and a mount holds
  one source at a time. Five simultaneous broadcasters is architectural, not a
  knob. The app polls `status-json.xsl` to grey out the occupied ones.
- **The Qt app is a source client, hand-written.** `icecastbroadcaster.cpp`
  does `QAudioSource` → libmp3lame → raw `QTcpSocket`, speaking the Icecast
  source protocol itself, with libmp3lame cross-compiled through the Android NDK.
- **The hooks are the best idea in the repo.** `<on-connect>` runs a script when
  anyone starts broadcasting, and it POSTs a `livestream` event to the same
  `/events/publish` the editor uses; `<on-disconnect>` shelves it. Going on air
  creates its own catalogue row and its own push notification — the broadcast
  and the database record are one act.

### Measured, because "a few seconds" is not a number

There is no reference signal in a live radio stream, so glass-to-glass is not
available. But the dominant term is: Icecast sends a **burst** from its backlog
the instant you connect, so a listener starts that far behind live. Probing
ERR's five mounts for 12 s each, splitting the initial burst from the
real-time-paced tail:

| mount | measured | burst | behind live at join |
|---|---|---|---|
| vikerraadio | 128 kbps | 63 KiB | **4.04 s** |
| raadio2 | 128 kbps | 63 KiB | **4.05 s** |
| klassikaraadio | 128 kbps | 62 KiB | **3.97 s** |
| raadio4 | 128 kbps | 62 KiB | **3.97 s** |
| raadiotallinn | 128 kbps | 62 KiB | **3.99 s** |

64 KiB ÷ 16 KB/s = **4.0 s**. That is Icecast's default `burst-size` of 65536
bytes divided by the bitrate, and the spread across five independent mounts is
±0.04 s — a configuration constant, not network variance. Time to first byte was
262–315 ms, so the delay is not the network.

And there is no catch-up: Icecast has no notion of a live edge to chase, so a
listener stays wherever they joined, playing at 1×.

**Which makes it a knob U: already owns.** `burst-size` is in their
`icecast.xml`. Lowering it moves join latency down proportionally, at the cost of
a client having less to chew on before playback starts.

### Where it sits against the other transports

| | Icecast | LL-HLS | WebRTC | MoQ |
|---|---|---|---|---|
| latency | **4.0 s measured** | 2.4–4.0 s | 74 ms | 26 ms |
| seek / DVR | none | yes (2 h on ERR) | no | no |
| media | audio only | audio + video | audio + video | audio + video |
| client | `<audio src>` | hls.js | SDP negotiation | WebTransport stack |
| capacity | one source per declared mount | per input | per room | per namespace |

Icecast's virtue is that it is boring in the best way: no build step, no library,
no negotiation, and it plays in every browser and every podcast app. For a radio
station that is a good trade. It just cannot do the two things positron is built
around — low latency and seeking backwards.

The same asymmetry is visible inside `19 flipper`: ERR's five radio stations are
Icecast MP3 and their cells have no scrub track, while the three TV channels are
HLS and theirs scrub two hours.

---

## Six ways to cowork, in order of how little they cost

### 1. Play their channels today — zero work either side

`radio`'s Icecast mounts and the nginx HLS endpoints are already
`Access-Control-Allow-Origin: *`:

```
https://live.uuu.ee:4443/hls/<key>.m3u8
https://live.uuu.ee:4443/hls_audio/<key>.m3u8
```

`19 flipper` plays eight ERR channels in equal cells with a scrubbable 2 h DVR.
Adding U:'s five mounts is a manifest edit. Their Broadcast tab and `19 flipper`
are the same screen, built twice.

### 2. Give them the thing their own TODO asks for

Their notes say it twice: *"audio, video, streams — to be implemented"* and
*"TODO: proper support of audio streams, needs a separate streaming service."*
That is the one thing positron has measured to death. Their `payload: {}` column
is explicitly for type-specific data, so measured numbers can ride along without
touching their schema.

### 3. Compile vClick scores into quotations

**What a Csound score is.** Csound splits a piece in two: an *orchestra* of
numbered instruments built from opcodes, and a *score* of flat, absolutely
timed event lines plus a tempo map.

```
i 1   0.0   2.0   8000   440
; |   |     |     +------+-- p4, p5: whatever that instrument reads
; |   |     +-- p3: duration
; |   +-- p2: start time, ABSOLUTE
; +-- p1: which instrument
t 0 120  30 90                ; tempo: 120 bpm at 0, 90 bpm at beat 30
```

**What vClick does with it.** The server runs Csound over that score, but the
events do not only make sound — they carry bar, beat and tempo, which the
server pushes to the players over OSC on wifi. A wire-free click track: no
headphones, no cables, no mixer. It can fire backing tracks from the same
score. Their README: *"Every piece requires its own written out score."*

It is a shrewd choice. `t` gives real accelerandi, absolute `p2` means the
piece is a precomputed timeline with nothing inferred at runtime, and Csound
already schedules sample-accurately.

**Three places it runs out, each answered by machinery that exists:**

- **No quotation.** A score is flat events, so "this passage is that passage,
  at half speed, three times" has to be written out again — which is exactly
  why every piece needs its own score. `nested.mjs` makes a repeat a
  REFERENCE: `quotation({ ref, at, in, out, repeat: 3 })`.
- **Seek is not a property of the format.** To start at bar 47 you need the
  state AT bar 47: which tempo is in force, what is still ringing, where a
  backing track has got to. The score carries no fold, hence the README's
  *"if the vClick score is done well"*. `deck.reduceAt(kind, pos)` computes
  that state from the rows, which is why `15 seek` can assert it at every cue
  boundary ±1 ms — 24 probes, 0 wrong.
- **Tempo lives in the score, not the transport.** So a client cannot derive
  "where are we now" for itself; the server must tell it, which puts the
  network in the critical path of every beat. positron derives position from
  a shared clock, so a blip costs nothing already delivered.

**The mapping is mechanical:**

| Csound score | positron |
|---|---|
| `t` statements | the transport tempo map |
| `i` lines | deck items — `p2`→`at`, `p3`→duration, `p1`→`kind` |
| fermatas, stops | a hold, or a `when` bracket |
| repeated material | a **quotation**, not duplicated lines |
| bar/beat readout | a DERIVED lane off the tempo map, not pushed over OSC |

A vClick-to-quotation compiler would give them seek-from-anywhere as a
guarantee rather than a discipline, and give positron a real corpus of notated
pieces — which is exactly what the timeline lacks. Their scores are the client
`plan-timeline` has been waiting for.

**It exists now: `timeline/csound.mjs`** (`timeline/lab/csound-test.mjs`, 22/22).
`t` statements become a beat↔ms map, `i` lines become rows, `m`/`n` become
quotation values that round-trip through `score.mjs` byte-identically, and the
fold is exact at 57 probes and either side of all 16 notes. The `.` carry, `+`
and `^+x` shorthands are handled, because real scores use them.

One thing the compiler had to get right that a parser would not have: **p2 and
p3 are BEATS**, so beat→time needs the tempo map rather than a multiplication.

⚠️ **Corrected 2026-09-09.** This paragraph said Csound interpolates *tempo*
linearly in beat, making the map "the integral of 60/tempo — closed-form and
logarithmic", 17.2609 s at beat 30 of `t 0 120 30 90`, with a mean-tempo
shortcut 118 ms early. Measured against csound 6.18, Csound interpolates
**seconds per beat** linearly in beat, so the map is a TRAPEZOID and beat 30 is
**17.500 s**. Neither number here was Csound's, so the 118 ms was the distance
between two wrong answers and the real error was 239 ms. The compiler is fixed
and `timeline/lab/csound-oracle.mjs` now checks it against the reference
implementation rather than against its own arithmetic.
### 4. Borrow their LAN, which positron does not have

Their in-room Host/Guest with UDP discovery is genuinely missing here. positron
assumes an internet path and a relay; a rehearsal room with bad wifi and no
uplink is a case it does not serve. VideoSync solves it, cross-platform, today.
This is the one direction where the borrowing runs the other way.

### 5. Bridge OSC properly

`qosc` is a Qt OSC library; positron has `workers/osc` (a Durable Object OSC
room) and `proto/osc`. A Qt app speaking OSC into a DO room connects a hall full
of native apps to an internet-wide timeline. Both halves exist.

### 6. Put the 1.46 GB somewhere with a timeline over it

`u-vary-player` carries its recordings in git. R2 is roughly 25× cheaper than
Stream storage with zero egress, and `14 replay` already plays a show off R2
with the cues it was recorded with. The archive would gain `when.kind` brackets
and an aoristic statistic that *names what it dropped* — which matters for
material whose dates are uncertain, and which the Radio Tallinn 1965 theses
demand anyway.

---

## What positron can offer a LAN setup

Everything U: builds assumes a wifi network you can see, and positron is
internet-first — so the obvious answer is "nothing". That is wrong, and the
reason is one design decision made early for a different purpose.

### The relay was always optional

`proto/looper/peer.mjs` has three interchangeable transports behind one
interface (`send` / `onMessage` / `close`):

```js
broadcastTransport(name)   // same browser, no network at all
wsTransport(url)           // ANY websocket relay
pairTransports({ delayMs, jitterMs, lossRate })   // in-process, chosen latency
```

`wsTransport` does not know or care that `ws.positron.studio` is a Cloudflare
Durable Object. Point it at `ws://192.168.1.50:8080` and the whole clock and
score machinery runs on a laptop in the hall with no internet. That is a
one-line change, not a port — and the third transport exists precisely because
latency had to be a number the test chose, which is also what makes a LAN
trivial to model before you are in the room.

### The clock is the part worth taking, and it beats a Host

VideoSync elects a **Host device** and everyone follows it. That means the
reference is one machine's clock: if it drifts, everyone drifts with it, and
if it leaves, the reference leaves.

`peer.mjs` elects **the lowest peer id** as reference, with no election
protocol, no leader heartbeat and no split brain, and every peer computes the
same correction independently:

```js
const rtt    = t2 - t0;
const offset = m.t1 - (t0 + t2) / 2;
if (rtt < p.rttMs) { p.rttMs = rtt; p.offsetMs = offset; }   // keep the FASTEST only
```

No device is privileged, and on a LAN where RTT is under 2 ms it converges
almost immediately — the same machinery that was built to survive the open
internet is simply *easy* on a local network. Their nudge-then-seek drift
correction then sits on top of a derived shared clock instead of a nominated
machine.

### A shipped score survives the network dropping

vClick has a server that plays the score and pushes OSC to the players. If
wifi stutters, a player stops receiving events — the network is in the
critical path of every note.

positron inverts that. A committed layer goes out **once, as a value**, and
each client schedules locally against the shared clock:

```js
/** LOOP PLANE. One committed layer, as a value. Latency-indifferent. */
function publishLayer(session, meta = {}) { … }
```

A quotation whose `at` has already passed does not misfire; it starts on the
next grid boundary. So a blip loses nothing already delivered. In a hall with
contended wifi — which is every hall — that is a material difference, and it
is why the live plane and the loop plane are separated at all: a lost live
note is a note nobody hears once, while a lost layer would be a lost piece.

### Seek-from-any-bar, as a guarantee rather than a hope

vClick's README is candid: playback can start from any bar *"if the vClick
score is done well"*. In a rehearsal that is the most-used feature there is —
nobody rehearses a piece from the top.

`15 seek` makes it a property of the machinery instead of the notation:
`deck.reduceAt(kind, pos)` recomputes state from the rows rather than replaying
them, asserted at every cue boundary ±1 ms — 24 probes, 0 wrong — plus a
sweep that counts retroactive fires (a cue landing more than 1.5 s after its
own position, which is what a seek that replayed a backlog produces).

### The measurement is probably worth more than the software

The word `drift` appears **once** across all 40 U: repos, in a README, as a
feature description. There is no harness anywhere.

`rig/` runs unchanged against a LAN chain: burn a clock into the pixels and
the glass-to-glass number is readable from a screenshot. The local-venue
measurement already exists — ffmpeg-WHIP into mediamtx into a browser measured
**20.6 / 52.1 / 57.9 / 67.0 ms** p50/p90/p95/p99 with **+12 ms** A/V skew and
zero dropped frames (2653 decoded of 2653 on the wire, 30 fps flat).

That is the fastest chain in the whole campaign and the only one needing no
internet — but state it precisely: **everything in that run was loopback**, one
machine, so it is the FLOOR rather than a LAN figure. A real wifi hop to a second
device adds to it, and the RUNBOOK is explicit that the p90 tail (~52 ms) is
x264/WHIP-side batching rather than transport. What it establishes is that the
local path is not the bottleneck — which is the thing worth knowing before
wiring a hall.

### What runs on the LAN and what does not

| | on a LAN with no internet |
|---|---|
| `timeline/` — transport, nested, score, strip, store, render | **yes**, no network in it at all |
| `peer.mjs` shared clock + planes | **yes**, via `wsTransport` at a local relay |
| the demo shell and Act 0 | **yes**, `demo/server.mjs` serves the repo |
| `16 looper` | **yes**, it has no upstream by design |
| `ws.positron.studio` relay | **no** — a Durable Object cannot run on a laptop. Swap in a ~40-line local WS server; the client code does not change |
| `06`–`09`, `14`, `15` | **no**, they are Cloudflare Stream and R2 by definition |
| LAN discovery | **no, and this is theirs to lend** — positron has no equivalent of VideoSync's UDP broadcast Host-finding |

So the honest split for a room: their discovery and their Qt clients find each
other, positron's clock and score decide when things happen, and `rig/` says
whether it worked. None of that needs an uplink.
---

## One thing to be careful about

`uuu.ee` is not in version control. It appears across the repos only as a deploy
target in `deploy.sh` scripts. The only infrastructure code that exists anywhere
is `radio`'s two Icecast hook scripts and an nginx snippet pasted into a
markdown file. If that machine dies it is rebuilt by hand from prose.

Their own `TODOs.md` is candid about the live path still settling: *"When video
streaming is started, no automatic notification is saved"* and *"Sometimes old
stream data stays hanging on player bar."*

So: fine to consume their streams, and worth offering to version their infra.
Not somewhere to put anything that must not be lost — not yet.

---

## The honest summary

U: builds **instruments for occasions** — a click track for this ensemble, a
player for that composition, a station for this centre. Each is finished when
the occasion is served.

positron builds **one substrate and measures it** — save anything, play anything
back, seek inside it, and prove the numbers.

The collaboration is not a merge. It is that U: has the repertoire, the
performers and the rooms, and positron has the transport, the timeline and the
harness. The fastest proof is the cheapest one: their five Icecast mounts in
`19 flipper`, this week, and one vClick score compiled into a quotation to see
whether the model survives contact with real notation.
