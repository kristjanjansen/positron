# U: and positron — what connects, what it costs, and how their gear gets on a network (2026-09-14)

**Asked: what has been built here that is useful to U:, how does it fit their
setup, and what is the cheapest way to get their analogue gear onto a network.**

🔴 **The headline is a failure, and it is the most useful thing in this
document. ✅ `timeline/csound.mjs` has never been pointed at a real vClick
score, and both of the ones that exist break it — not with a warning, with an
uncaught throw.** `server/simple-4-4.sco` and `server/test.sco` are the only two
scores in `tarmoj/vclick`; line 12 of each reads `t 0 $REPTEMPO`, `#define` /
`$MACRO` is unsupported, the tempo comes back `NaN`, and `tempoMap` throws. Put
a twelve-line macro pass in front and **both compile clean** — 56 rows / 2
sections / 1 warning, and 25 rows / 2 sections / 0 warnings, every `i` line
accounted for. So the gap is one small, known, testable thing. But
`plans/plan-uuu-local.md` calls itself *"not started, and mostly already true"*, and
its P1 — one real score through the compiler — was **untrue at the first
statement of the first file**, for a week, while 42/42 read green.

Three more findings the rest of this document rests on:

- 🔴 ✅ **The plan's "single most important unknown" is answered, and the answer
  is no.** Neither real score contains a single `m` or `n` statement — both are
  written out bar by bar, exactly as vClick's README implies. **The quotation
  win is theoretical until somebody re-notates a piece.** What real scores
  actually use, and what the compiler must therefore learn, is `#define`
  (including a macro whose body names another macro), `[8/3]`-style score
  expressions, string instrument names (`i "countdown"`), and `s` sections.
- 🔴 ✅ **Their Icecast is HTTP-only, which quietly kills "play their channels
  today".** Measured on their own server: 65,536 B burst, 128.1 kbit/s,
  **4.09 s behind live at join**, `Access-Control-Allow-Origin: *`, ttfb 444 ms
  — and port 8001 speaks no TLS, so an HTTPS page cannot load it at all. The
  CORS half of `demo/notes/uuu-positron.md` §1 is right and the *zero work*
  half is wrong.
- 🔴 📄 **Csound already listens on a network socket.** `csound --port=N` is a
  documented flag — *"Set UDP port on which to listen for commands and
  instruments/orchestra code (implies --daemon)"* — and U: have already written
  the client for it (`tarmoj/CsoundRemote`). The shortest bridge between this
  repo and their sound engine is a WebSocket-to-UDP forwarder, and it does not
  require either side to change.

**On the hardware question: the recommendation is MIDI first, CV only where a
specific box has no MIDI socket — and the first spend is €0, because nobody here
knows what the gear is yet.** §3 weighs the options; §5 is the list of questions
that have to be answered before any of it is worth buying.

---

## 0 · Marks used in this file

- ✅ **MEASURED** — run here, on this machine or against a live endpoint, on the
  date given. Reproducible from the commands quoted.
- 📄 **READ** — taken from a repo, README, manual or vendor page. The source is
  named. Not confirmed by running.
- ⚠️ **UNMEASURED** — could not be checked here, and the reason why.
- 🔴 **Load-bearing** — a decision in §2, §3 or §4 rests on it.

Every claim carries one. Where a mark is missing the sentence is an opinion, and
it says so.

**Two words used throughout, because they are not interchangeable.** *Latency*
is how late a thing is. *Jitter* is how much that lateness varies. A click track
survives 20 ms of latency and is ruined by 20 ms of jitter; a note played from
another building survives jitter and is ruined by latency. Every option in §3 is
bad at one of them and the two are named separately.

---

## 1 · What is already true

### 1.1 The Tarmo repo, found

✅ **`tarmoj/radio` is cloned at `/Users/s32863/personal/radio`**, last
commit `0ff5e8a`, 2026-08-29. It is the only U: repo on this machine. Everything
else here about their code was read over the GitHub API today (📄) — including
the two vClick score files, which were fetched to a scratchpad and run through
the compiler, so the claims about *them* are ✅.

📄 **`tarmoj` has 20 public repos** (GitHub API, 2026-09-13). The ones that
matter for this:

| repo | language | last push | what it is |
|---|---|---|---|
| `radio` | QML | 2026-09-12 | the community-radio app; Icecast + FastAPI + Qt |
| `vclick` | QML | 2026-03-11 | the wireless click track; Csound score, OSC + WebSocket |
| `VideoSync` | C++ | 2026-05-29 | video in sync across devices on a LAN |
| `qosc` | C++ | 2025-06-18 | their Qt OSC client/server library |
| `CsoundRemote` | QML | 2019-09-09 | 🔴 drives a running Csound over UDP |
| `harmonicsgame` | Csound | 2026-03-23 | audience phones control harmonics; WS + Csound API |
| `location-music` | QML | 2026-05-15 | tracking musicians in a hall (with Scott Miller) |
| `MeeBlueReader` | C++ | 2026-05-15 | reads RSSI off Meeblue BLE beacons |
| `solaris` | HTML | 2026-02-04 | performance piece; secure WS server, port 1234 |

📄 **The shape of the house is consistent and worth naming: Qt, Csound,
WebSockets, OSC, UDP discovery, one box.** There is no build pipeline, no
harness, and no measurement anywhere. That is a difference in what the work is
for, not a criticism — a piece that runs once in a hall is verified by the
performance.

### 1.2 What could be connected this week with no new code

**One thing, and it is smaller than the note claims.**

✅ **Their events API is browser-reachable.** `GET
https://live.uuu.ee/radio/api/events` answers `200` from uvicorn, 3,083
bytes of JSON, and **with an `Origin` header present it returns
`access-control-allow-origin: *`** (measured 2026-09-13 21:00 UTC). ⚠️ Note the
trap that cost me a wrong conclusion ten minutes earlier: probed *without* an
`Origin` header the same endpoint returns no ACAO at all, because FastAPI's CORS
middleware only adds it when asked. **A CORS check with no `Origin` header
measures nothing.**

✅ **Their Icecast is up, open, and unusable from an HTTPS page.** Measured
2026-09-13 21:00 UTC against `http://live.uuu.ee:8001/radio`:

| | |
|---|---|
| server | Icecast 2.4.4, up since 2026-09-11 06:43 +0300 |
| live mounts | **one** — `/radio`, "Improvisations by EMA", on air since 2026-09-11 19:19 |
| listeners | 0 (peak 2) |
| CORS | `Access-Control-Allow-Origin: *` ✅ |
| ttfb | 444 ms |
| burst | **65,536 B** — Icecast's stock `burst-size`, to the byte |
| steady rate | 128.1 kbit/s |
| **behind live at join** | **4.09 s** |
| TLS on 8001 | ⚠️ **none** — `https://live.uuu.ee:8001/...` times out |

🔴 The 4.09 s is the same mechanism `demo/notes/uuu-positron.md` measured on
ERR's five mounts (3.97–4.05 s): 64 KiB over 16 KB/s. It is a config constant,
not network variance, and **it is a knob they own** — `burst-size` is in their
own `icecast.xml`. This is now measured on *their* box rather than inferred from
somebody else's.

🔴 **But `19 flipper` cannot add their mounts today.** positron.studio is HTTPS;
`http://live.uuu.ee:8001/...` is mixed content and the browser refuses it before
CORS is ever consulted. Two fixes, belonging to different people:

- **They terminate TLS in front of Icecast.** nginx on that host already holds a
  cert for `live.uuu.ee` and already serves `:4443`; this is one `location`
  block. ✅ It is the better fix, because it also makes their own HTTPS pages
  able to play their own mounts.
- **Or this side proxies it.** ✅ `workers/shout` exists and is deployed at
  `shout.positron.studio`. ⚠️ **But read why it exists before assuming it
  fits:** its comment says *"The origin (Icecast 2.4.4 at `icecast.err.ee`) sends
  NO [CORS]"*, and `ORIGIN` is the hardcoded constant
  `'https://icecast.err.ee'` with a `STATIONS` map beside it. ERR's problem is
  missing CORS over working TLS; U:'s is the exact opposite — working CORS with
  no TLS. So it is **a second origin and a small edit to that worker**, solving a
  different problem with the same machinery, not a config change.

So the honest version of "zero work either side" is **one `location` block on
their side, or roughly an hour on ours** — and the first is better.

✅ **Their video path is idle.** `https://live.uuu.ee:4443/hls/stream.m3u8` and
`/hls_audio/stream.m3u8` both 404 (nginx 1.24.0), and `https://live.uuu.ee/live`
404s from Apache. Nothing is broadcasting; ⚠️ whether the key is simply
different from `stream` is not knowable from outside. 📄 The HLS wrapper page
that does exist, `https://live.uuu.ee/stream/`, loads `hls.js@latest` from
jsDelivr — an unpinned CDN dependency in a live performance path.

### 1.3 What `plans/plan-uuu-local.md` said that has since become true — or was never true

Read that file's status line before this table: *"not started, and mostly
already true."*

| the plan says | actually, today |
|---|---|
| P1 — one real score through the compiler | 🔴 ✅ **attempted here, and it throws.** Both real scores. §2.1 |
| §3 "UNSETTLED: do real scores use `m`/`n`?" | 🔴 ✅ **settled: no.** Zero `m`/`n` in either score |
| §3 "`csound-test.mjs`, 22/22" | ✅ it is **42/42** now (run here, exit 0) |
| §6 "`t` is SECTION-LOCAL — KNOWN OPEN … ours carries one global map" | ✅ **fixed.** Measured: `t 0 120` / two beats / `s` / two beats puts section 1 at 60 bpm — 0, 2000, 2500, 6500 ms, no warnings |
| §4 "A local relay does not exist" | ✅ **it does, as the real worker run locally** — `cd workers/relay && npx wrangler dev --local --ip 0.0.0.0 --port 8892`, per `proto/looper/server.mjs`. A hand-written stand-in was built, A/B'd against the real worker, matched on every check and **deliberately deleted**; it survives at `archive/plans/looper-local-relay.mjs` |
| §4 "Discovery does not exist … theirs to lend" | 📄 still true here, and **theirs is 25 lines of header**: `ServerBroadcaster` / `ServerDiscovery`, UDP broadcast on **port 16006**, in `tarmoj/vclick` |
| P2 — the offline claim asserted rather than assumed | ✅ still unasserted, and still true: `demo/vclick/index.html` greps clean for `fetch`, `WebSocket`, `XMLHttpRequest`, `EventSource`, `sendBeacon` |
| P3 — two devices on a LAN, a measured number | ⚠️ still the one unmeasured number. Everything so far is loopback |

🔴 **So the status line is wrong in both directions at once**, which is the worst
shape for a reader: §6's known-open trap has been fixed (better than stated) and
P1 fails at the first line of the first file (worse than stated). A reader
trusting *"mostly already true"* would skip the one thing that is not.

### 1.4 Three things the existing note gets wrong about vClick

📄 Read from `tarmoj/vclick`'s headers today. None of these were knowable when
the note was written from the README alone.

- **vClick already has a WebSocket server.** `server/wsserver.h` includes
  `QWebSocketServer` alongside `qosc/qoscclient.h`. The note's table says their
  control transport is *"OSC and WebSocket over LAN"*, which is right, but
  `plan-uuu-local` then treats a local WebSocket relay as the missing piece.
  🔴 **On their side it is not missing.** `wsTransport(url)` does not care whose
  WebSocket it is.
- **The client has a manual delay knob.** `client/oschandler.h` exposes
  `Q_INVOKABLE void setDelay(int delay)`. That is a human compensating, by ear,
  for lateness in the per-beat path — which is precisely the thing
  `plan-uuu-local` §1 argues compiling removes. It is the strongest available
  evidence *from their own code* that the argument is about a real problem.
  ⚠️ How much delay anyone actually dials in is not in the repo and has to be
  asked.
- **The server can follow JACK transport.** `server/jackreader.h` is a
  `QThread` over `jack/transport.h`. So vClick can already be slaved to a JACK
  graph — an Ardour session, a hardware-clocked interface — which matters for
  §3 far more than it matters for the score work.

📄 Also worth recording because it is a nice fossil: the OSC port is `57878`,
with a comment noting it *"was 87878"* — a number that is not a port.

---

## 2 · The bridges, ordered by effort

Effort estimates are mine and they are guesses about work, not about value. Each
one says what it would take and what could make it not worth doing.

### 2.1 🔴 Teach the compiler `#define` — half a day

**The problem, ✅ measured 2026-09-14.** Both real scores throw:

```
compileCsound(simple-4-4.sco)  ->  tempoMap: non-finite point 0,NaN
compileCsound(test.sco)        ->  tempoMap: non-finite point 0,NaN
```

Because line 12 is `t 0 $REPTEMPO` and the macro is never expanded. With a
throwaway twelve-line expander in front of it (scratchpad only — nothing in the
repo was changed):

| | `simple-4-4.sco` | `test.sco` |
|---|---|---|
| `i` lines in the file | 56 | 25 |
| rows emitted | **56** | **25** |
| sections found | 2 | 2 |
| warnings | 1 (`'f' statement ignored`) | **0** |
| repeats | 0 | 0 |
| compiled length | 1,003,000 ms | 30,346 ms |

So everything else in a real score already works: `s` sections with their own
clocks, a real tempo ramp (`t 0 80 4 80 12 52`), string instrument names,
the glued `i1 4 8 …` form, negative bar numbers in p7, tab separators, and
comments with tabs in them.

**What the fix has to cover, from the files themselves:**

- ✅ `#define NAME #body#` and `$NAME` substitution. Both scores use it.
- ✅ **Nested macros.** `#define REPTEMPO #$TEMPO1#` — a macro body naming
  another macro. A single-pass substituter leaves `$TEMPO1` standing. Expansion
  has to repeat to a fixed point, with a bound so a cycle terminates.
- ⚠️ Macros **with arguments** (`#define NAME(a'b) # … #`), `#include`, `#undef`
  and the `$NAME.` terminator form appear in **neither** score. 🔴 They should
  therefore be *warned about*, not implemented — CLAUDE.md's rule about
  implementing somebody else's format applies, and the honest position is
  "recognised, not supported" rather than a guess at semantics nobody here can
  grade.

**And a second defect the same exercise found, ✅ measured:**

```
i 1 [4/2] 1 100   ->  at: 0,  beat: 0        and ZERO warnings
i 1 0 [8/3] 100   ->  durBeats: 0            and ZERO warnings
```

🔴 **A Csound score expression in p2 or p3 is silently wrong.** In the two real
scores the brackets sit only in p4 and p5 (`[8/3]` and `[16/3]`, five of them in
`test.sco`), where they are carried through verbatim as strings and nothing is
mistimed — but that is luck, not a property. Either evaluate them or **warn**;
what must not happen is a note landing at beat 0 with a green run.

⚠️ **And neither fix can be graded here.** `which csound` → not found.
`node timeline/lab/csound-oracle.mjs` prints `SKIPPED: no csound on PATH` and
exits 0. `csound-test.mjs` is 42/42, but CLAUDE.md is explicit that a test
comparing the compiler against its own formula catches a typo and can never
catch a misreading — that is how the tempo integral stayed wrong for months at
22/22 green. **So the real cost of this half-day is a machine with csound on
it**, and `timeline/lab/csound-ssh.mjs` exists for exactly that.

### 2.2 A WebSocket-to-UDP forwarder for Csound — a weekend

📄 `csound --port=N`: *"Set UDP port on which to listen for commands and
instruments/orchestra code (implies --daemon)"* (Csound manual, Command Flags,
read 2026-09-13). 📄 `--udp-console=address:port` and
`--udp-mirror-console=address:port` send the console back the other way. 📄
U: already drive this from `tarmoj/CsoundRemote`, whose README describes
*"controlling a running Csound instance on a headless Raspberry Pi from a touch
screen device"* — which is `/keys/`'s shape, arrived at independently.

**The bridge is a program that joins a relay room and writes datagrams.**
✅ `rig/board/ask.mjs` is 57 lines and already does the first half — joins
`wss://ws.positron.studio/room/<name>/ws`, sends one envelope, prints the reply.
The second half is `dgram.createSocket('udp4').send(...)`. Nothing in
`workers/relay` needs to change: ✅ it is tokenless by design, and as deployed it
carries **128 sockets per room, 1000 msg/s, 1,024,000 B per message** (read back
live from `/room/studio-1/stats` today).

🔴 **Two traps, both already paid for in this repo.**

- 🔴 ⚠️ **`demo/shell/wire.mjs:35` still exports the OLD limits, under a comment
  saying it does not.** ✅ Verified here today: the constant reads
  `maxBytes: 256*1024, maxSockets: 16, bytesPerSec: 512*1024, msgPerSec: 60`,
  while `workers/relay/src/index.js:77-82` — the deployed worker, confirmed live
  off `/stats` — reads 1000 KiB, **128**, 8 MiB/s, **1000**. The comment directly
  above the stale block says *"Read from `workers/relay/src/index.js` rather than
  typed twice: a description that can disagree with the config is worse than
  none."* It was typed twice, and it now disagrees. Anything sizing a bridge off
  that constant is sizing it for a relay that no longer exists. (Reported, not
  changed — `demo/` is off limits for this task.)
- 🔴 **Do not put the forwarder in the per-beat path.** ✅ The relay costs 1–2 ms
  at p50 for the hop itself, but the end-to-end control-path measurement in
  `rig/m1/README.md` (2026-09-10, 100 alternating presses) is **direct
  peer-to-peer 6.00 ms typical / 8.20 ms p95 / 0 of 100 over 100 ms**, against
  **relay 68.90 ms / 94.80 ms / 4 of 100 over 100 ms**. That is fine for "play
  an instrument that is somewhere else". It is not a click track.

### 2.3 Lend them the harness — a weekend, and probably the highest value per hour

📄 The word `drift` appears once across all of U:'s repos, in VideoSync's README,
as a feature description. There is no measurement anywhere. Meanwhile
`VideoSync` and `timeline/media-master.mjs` converged independently on the same
mechanism — nudge the rate inside a threshold, hard-seek outside it, at 500 ms
and 250 ms respectively. 🔴 **Two independent implementations agreeing is the
mechanism being right. Neither team has a number for how well it works.**

The cheapest useful artefact is not software: it is the burst measurement in
§1.2 repeated on each of their five mounts and handed over, plus `rig/`'s
burned-clock method pointed at a VideoSync pair. ✅ `demo/shell/pattern.mjs`
burns a clock into pixels and `readBurned` reads it back (600/600 exact through
three moves), and it needs no internet.

⚠️ **This is an offer, not a plan.** Nobody has asked for it, and a harness
arriving unrequested in somebody else's studio reads as a critique. §5 has the
question that should precede it.

### 2.4 Two devices, one LAN, no uplink — a weekend, and it is `plan-uuu-local` P3

Everything needed exists on one side or the other:

- ✅ `proto/looper/peer.mjs`, 292 lines, three transports behind one interface;
  `wsTransport(url)` takes any URL.
- ✅ The relay runs locally as the real worker under
  `wrangler dev --local --ip 0.0.0.0 --port 8892`.
- 📄 Or point `wsTransport` at **vClick's own `QWebSocketServer`** and skip the
  relay entirely (§1.4).
- 📄 Discovery is theirs: UDP broadcast on port 16006.
- ✅ The clock is worth taking: peer-to-peer min-RTT-of-N estimation reads
  **±0.15 ms** with **7 µs of drift over 25 minutes**, where asking a Worker
  `/time` endpoint reads **±50 ms — and it is BIAS, not jitter**. At a 2 s loop
  that is 2.5% of the circle, a constant audible flam.

🔴 **The number that would come out of this is the one thing `HANDOFF.md` still
lists as unmeasured: min-RTT skew over a real link.** Everything measured so far
is loopback, and the note is careful to call its fastest chain (20.6 / 52.1 /
57.9 / 67.0 ms p50/p90/p95/p99) a **floor**, not a LAN figure.

### 2.5 Put their recordings on a timeline — a project

📄 `u-vary-player` carries 1.46 GB of recordings in git (from the existing note;
⚠️ not re-verified today — that repo is not in the current API listing under
`tarmoj`, so it may have moved or be under an organisation). ✅ `replay` plays a
190 s show off R2 with the eight cues it was recorded with, and `seek` asserts
the fold at every cue boundary ±1 ms, 24 probes, 0 wrong.

This is a project rather than a weekend because the work is not the player — it
is deciding what a date means for material whose dates are uncertain, which is
`plan-archive-timeline`'s subject and `strip`'s. ⚠️ And it needs a conversation
about where the bytes live that `demo/notes/uuu-positron.md` already flags:
*"`uuu.ee` is not in version control."*

### 2.6 A shared score container — a project, and possibly the wrong shape

📄 U:'s material is four unlike things: Csound scores (vClick), video files
(VideoSync), Icecast mounts (radio), and musician positions
(`location-music` + BLE RSSI from `MeeBlueReader`). 🔴 `plans/plan-score.md` §1's rule
applies with force: **a common vocabulary across unlike things is a lie about
all of them.** Only the first is score material. The rest belong in the
container as parts, or nowhere.

⚠️ I would not start here, and I would want to hear what they think the pieces
have in common before agreeing they have anything in common.

### 2.7 Things this repo has that are probably NOT bridges

Said plainly so they are not proposed by accident.

- **`rack`** — Ableton Live from a browser with no virtual audio cable, via a
  Core Audio process tap. ✅ Real and measured (−5.3 dBFS with keys held, 0
  dropped of 801, 4.2% of one core). ⚠️ It is macOS-specific, its TCC grant is
  bound to a code-signing identity so **rebuilding it requires somebody to click
  Allow in person**, and U: are a Qt/Linux house. Useful as a demonstration of
  what a process tap removes; not useful as something to hand over.
- **Cloudflare Stream, R2, MoQ, WHEP** — ✅ measured (MoQ p50 26.2 ms, WHEP p50
  67.0 ms) and all of it needs an uplink. Their problem is a room.
- **`workers/osc`** — deployed at `osc.positron.studio`, token-gated, 64 KB
  frames, and 🔴 **it never parses and never re-stamps**, so OSC bundle time
  tags survive the hop. That last property is genuinely valuable. But the
  measured p99 on sparse traffic is **446.7 ms** (n=300, 2026-08-28), so it is a
  control plane, never a timing path.

---

## 3 · Getting the gear on the network

⚠️ **Everything in this section is conditional on §5.3, and that is not a
formality.** Nothing in any U: repo names a single instrument. "Plenty of
analogue gear able to wire to net" is the whole of what is known, and the
recommendation changes completely depending on whether that means six synths
with MIDI DIN sockets or a Eurorack case.

### 3.0 The question behind the question

🔴 **"Should there be more CV-to-MIDI" assumes conversion, and conversion is
usually the expensive way round.** Before choosing a connector, separate four
jobs that get conflated, because they need different hardware and the difference
is most of the cost:

| job | what it needs | is it solved here? |
|---|---|---|
| **the network HEARS the gear** | an audio input | ✅ twice — `rig/board` (`arecord` → relay) and `rig/m1` (process tap → relay) |
| **the network PLAYS the gear** | notes out | ✅ written, ⚠️ **never tested on hardware** — §3.1 |
| **the network TURNS KNOBS on the gear** | continuous control out | partly — `proto/automation`, and §3.2 |
| **the network READS the gear's knobs** | continuous control in | nothing here does this |

🔴 **The first row is the one that is already finished, and it is probably the
one that matters most.** Getting a hardware synth's output onto a page in
another building needs no MIDI and no CV at all: it is a class-compliant USB
audio interface, a Raspberry Pi, and `rig/board/board.mjs` unchanged. ✅ That chain
is running today — the board dials out to `wss://ws.positron.studio`, publishes
`arecord -f S16_LE -r 48000 -c 1` in 20 ms frames at 50 frames/s, and `/keys/`
plays it. **If the ask is "let people hear the studio", stop reading here.**

### 3.1 The recommendation: MIDI first, and the reason is arithmetic

🔴 **For any box with a MIDI DIN socket, MIDI is the answer and it is not
close.**

📄 From `plans/plan-hardware.md` §3, which surveyed eight boards for this repo's own
purposes and cites its sources:

- A USB-MIDI interface is **$15–40** and needs no driver.
- A DIN socket driven off a Pi's own serial pins is **two resistors and a jack,
  about $2**. MIDI 1.0 is a 31,250 bit/s serial line; 📄 the electrical spec was
  updated for 3.3 V parts to 33 Ω and 10 Ω in place of the old 220 Ω
  ([MMA/AMEI CA-033](https://www.midi.org/wp-content/uploads/wpforo/default_attachments/1709416667-ca33-MIDI-10-Electrical-Specification-Update.pdf)).

✅ **What it costs in time, computed here from the bit rate** (31,250 bit/s,
10 bits a byte):

| | on the wire | a 10-note chord |
|---|---|---|
| note-on, 3 bytes | **960 µs** | **9.6 ms** from first note to last |
| running status, 2 bytes | 640 µs | 6.4 ms |
| one knob at 100 Hz, 3-byte CC | 9.6% of the whole line | — |

🔴 **Name the failure mode precisely, because this is the latency/jitter
distinction in its clearest form.** DIN MIDI's lateness is *deterministic* — a
serial line, no arbitration, nothing to contend with. But it is
**density-dependent**: one note is 960 µs late and the tenth note of a chord is
9.6 ms late, so the *spread within a chord* grows with how much you play. That
reads to a player as jitter even though every byte is exactly on schedule. It is
also the one thing CV does not have, because every CV channel is physically
separate — §3.2.

🔴 **And then the arithmetic that settles it: the transport dominates the
connector by two orders of magnitude.** ✅ Measured in `rig/m1/README.md`
(2026-09-10, 100 alternating presses):

| leg | round trip |
|---|---|
| direct peer-to-peer, one room | **6.00 ms** typical / 8.20 ms p95 |
| **via the Cloudflare relay** | **68.90 ms** typical / 94.80 ms p95, 4 of 100 over 100 ms |
| the Durable Object itself | 0.18 ms — noise |
| DIN MIDI, one note | **0.96 ms** |

So buying a better connector to fix a 69 ms path is `plans/plan-hardware.md` §2's
argument in a new costume: *measuring the quantity next to the one in question*.

⚠️ **One real caveat, and it is this repo's, not theirs.**
`timeline/transport.mjs`'s `createMidiLane` carries its own warning in the
source: *"UNVERIFIED ON HARDWARE. No MIDI device has ever been attached to this
project."* 🔴 The lane is written to use `MIDIOutput.send(data, when)` with a
**future** timestamp so the port — not JavaScript — owns the accuracy, which is
the right design and is exactly what removes jitter from the send path. But the
first version of that conversion scheduled every note **fifty-six years out**
while the lane's own counter incremented as if it had worked, because the
counter counted what was queued rather than what the port accepted. That is
CLAUDE.md's *"a count is only evidence on the far side of the boundary"* with a
MIDI cable attached, and it means **step one of any hardware work here is
attaching one device and proving a note sounds.**

⚠️ And one open question this repo already wrote down: *"Does Chrome on Arm Linux
enumerate MIDI OUTPUTS? There is field evidence of Linux Chromium returning an
outputs map of length zero"* (`plans/plan-hardware.md` §6). If the answer is no, the
Pi drives MIDI natively through ALSA raw MIDI instead — ✅ which `rig/board/` is
already doing for its own synths (`alsa.mjs`, 238 lines).

### 3.2 CV: what it is actually for, and the direction the question got backwards

CV earns its place in exactly two cases.

1. **A box with no MIDI socket.** Then there is no choice and the question is
   only which converter.
2. **Continuous control that MIDI is too coarse or too slow for.** A 7-bit CC is
   128 steps; a filter sweep across 128 steps is audibly stepped. 14-bit NRPN
   exists and doubles the bytes, which doubles the 960 µs. CV has no steps and
   no message rate — it is a voltage.

🔴 **But "CV-to-MIDI" is the input direction, and for getting gear state onto a
network it is the wrong tool.** A CV-to-MIDI converter takes a continuous
voltage and quantises it to 7 or 14 bits *before* anything reaches the network.
If the point is to carry what the gear is doing, **the cheaper and higher-
resolution answer is to treat CV as what it electrically is — audio — and record
it through a DC-coupled input.** No conversion, no quantisation, full rate, and
✅ this repo already knows how to put 48 kHz int16 frames on the relay. 🔴 **But
the thing doing the reading has to be the Pi, not a page** — 📄 `getUserMedia`
is capped at two channels and has been since 2015, so a browser cannot see an
ES-8's four CV inputs however they are wired (§3.4).

🔴 **Five traps. The first two this repo has already paid for once; all five
bite harder on CV than on audio, because on CV a wrong answer looks like broken
gear rather than broken software.**

- **A channel count cannot be inferred from a payload** (CLAUDE.md, in
  capitals). 960 int16s is a valid 20 ms mono frame and a valid 10 ms stereo
  one. On audio, guessing wrong plays an octave down and *sounds* like a broken
  instrument. **On CV, guessing wrong swaps pitch for gate**, and the result is
  a silent instrument or a stuck note — which reads as broken gear. Senders must
  declare `audioChannels` **and** `frameMs`; receivers must check
  `samples / channels / rate === frameMs`.
- **A device INDEX is a shared mutable global, exactly like a fixed port.**
  ✅ This repo measured `ffmpeg -f avfoundation -i ":0"` meaning the microphone
  in one README and **BlackHole** by the time anyone re-read it — and both read
  −91.0 dB, where one number proves "this capture is deaf" and the other proves
  "nothing is playing". 🔴 On a multi-channel CV interface the same mistake is
  worse: output 1 and output 2 are pitch and gate. **Resolve by NAME every
  time.**
- 🔴 **A normal jack lead can DAMAGE the interface.** 📄 Expert Sleepers, on
  their own compatibility page: *"If you use a regular stereo or mono jack lead,
  you'll be shorting out one of the balanced output signals… While this probably
  wouldn't be a problem for normal audio use, when outputting the sustained
  voltages that are useful as CVs you risk damaging the interface hardware."*
  You need TRS→TS cables with the ring left floating. ⚠️ **In somebody else's
  studio this is the first thing to say out loud**, and it is a real reason to
  prefer unbalanced 3.5 mm outputs (Eurorack modules, or the Bitwig Connect) over
  a balanced rack interface.
- **DC coupling is a property of the whole path and anything in it can silently
  remove it.** A mixer, an ordinary audio interface, a codec — every one of them
  high-passes. A gate that has been high-passed still produces a transient, so
  the note still *sort of* fires and then decays; it looks like an envelope
  problem, not a wiring one. ⚠️ Nothing in this repo has ever carried DC, and
  Opus certainly will not: the box's audio path is a lossy codec by design.
  **CV cannot ride the existing audio path. It needs its own, uncompressed.**
- 🔴 **A browser will disconnect a held CV after 30 seconds and say nothing.**
  📄 Chrome's `SilentSinkSuspender` swaps the hardware sink for a fake one after
  30 s of bit-exact-zero frames, and a gate held low *is* bit-exact zero. Full
  mechanism and the one-line workaround in §3.4.

### 3.3 The options, weighed

Marks: 📄 where a figure comes from a vendor or spec, ✅ where it is arithmetic
done here or a number this repo measured. Prices are ⚠️ list prices as of
September 2026 from `plans/plan-hardware.md`'s survey, not quotes, and they go stale.

| option | latency | jitter | what it gives up |
|---|---|---|---|
| **MIDI DIN off a Pi UART** (~$2 of parts) | ✅ 960 µs/note, deterministic | ✅ none of its own; **spread grows with chord density** | 7-bit CC; no per-note voltage; needs the box to have a DIN socket |
| **USB-MIDI interface** ($15–40) | 📄 vendor figures are rarely published with test conditions | ⚠️ USB is polled, so it adds host-scheduling jitter DIN does not | same as above, plus a USB stack in the path |
| **CV out of a DC-coupled interface** | 📄 **not the buffer — about 9× it.** Measured round trip **3.021 ms** at 32 samples / 96 kHz on a MOTU 828, where the buffer alone is 0.333 ms (AudioFanzine with RTL Utility, table dated 2025-04-10) against MOTU's published *"~2 ms"* | ✅ the audio callback's, which is very good | 🔴 **output-only and Chromium-only from a browser, and unmeasured by anyone** (§3.4); needs a host program; needs DC end to end; ⚠️ **cable hazard** (below) |
| **Dedicated MIDI-to-CV module** | 📄 not published with conditions by most vendors | 📄 as above | one more box, one more power supply, one more thing to debug |
| **CV-to-MIDI (the direction asked about)** | — | — | 🔴 **resolution, before the data ever reaches the network.** §3.2 |
| **DC-coupled audio INPUT for reading CV** | ✅ the audio buffer | ✅ the audio callback's | nothing, if the path is DC end to end — this is the good answer for reading |
| **RTP-MIDI / AppleMIDI over Ethernet** | 📄 designed for it; timestamped | 📄 its recovery journal exists precisely because UDP reorders | 🔴 this repo **already rejected the recovery journal** in favour of periodic full-state keyframes (`demo/shell/cc-adapter.mjs`, `proto/osc/NOTES.md`) — so adopting it would reverse a decision made on measurement |
| **OSC over UDP** | ⚠️ on a LAN, sub-millisecond and not measured here. ✅ Over `workers/osc` — i.e. across the internet — p50 **37.5 ms** | ✅ over that worker, **p99 446.7 ms on sparse traffic** (n=300, 2026-08-28); on a LAN, unmeasured | 🔴 **no analogue gear speaks OSC.** It needs a bridge at the gear whatever the latency, so it is a control plane, never the last hop |
| **Audio-over-IP (Dante / AES67 / AVB)** | 📄 sub-millisecond is the category's whole claim | 📄 PTP-locked, which is the point | ⚠️ managed switches, a clock domain, and **it carries no notes** — it is the audio row of §3.0 with better engineering and a much larger bill |

**The named products, with prices and the date they were read.** ⚠️ Prices go
stale; these are 📄 Thomann UK listings read **2026-09-14** unless stated, and
they are listings, not quotes.

| | 📄 price | what it is |
|---|---|---|
| **Bitwig Connect 4/12** | **£419 / €499**, in stock | purpose-built: *"6 × 3.5 mm TS DC-coupled mini jack ports for audio/CV: 2 inputs, 4 outputs"*, USB-C bus-powered, class-compliant, **includes Bitwig Studio Essentials**. 🔴 Unbalanced minijacks, so **no cable hazard** |
| **Expert Sleepers ES-10** | **£311**, in stock | 📄 shipped 2024-08-22, not new. The sensible specify in this family today |
| **Expert Sleepers ES-9** | £539, **sold out** | 8 × 3.5 mm DC out; ⚠️ its two balanced ¼" *main* outputs are **AC-coupled** — the most obviously "main" jacks are the ones that cannot do CV |
| **Expert Sleepers ES-6 mk3 / ESX-8CV / ES-5** | £138 / £165 / £121 | expanders |
| **Expert Sleepers ES-3 mk4** | ⚠️ **delisted** | Thomann: *"regretfully no longer available"*; Schneidersladen: *"Product is archived"* — despite a live MSRP on the manufacturer page. **Do not specify it** |
| **RME Fireface UCX II / UFX II / 802 FS** | £1,079 / £1,690 / — | 📄 the *FS generation* states it plainly: *"All of the … line-level outputs are fully DC-coupled, allowing for the sending of control voltages (CV) or Gate information to modular synthesizers."* |

🔴 **Two corrections to received wisdom, both worth carrying.** First, **"MOTU is
the DC-coupled one" is out of date** — RME's FS generation says so explicitly and
per-model, while MOTU publishes **no voltage range per model at all**, only a
generic *"typically between ±2 VDC and ±9 VDC"*. Second, **DC-coupled is a
per-model and sometimes per-OUTPUT property, never a brand one**: 📄 Expert
Sleepers' own tested list notes *"RME Fireface 400 — Only the headphone outputs
are DC-coupled"*, and RME's Babyface Pro FS advertises *"DC-coupled Outputs"* as
a bare feature chip with no statement of which ones. ⚠️ **This is the
avfoundation-device-index trap in hardware form**: a property that looks like it
belongs to the box actually belongs to one jack on it.

⚠️ **Voltage range is unpublished for every rack interface except Expert
Sleepers** (±10 V / ±11 V). Bitwig publishes none for the Connect; RME publishes
none. 📄 One Cycling '74 forum user measured **2.35 V** out of a MOTU UltraLite
AVB — not enough for a useful 1 V/oct span. 🔴 **So "is it DC-coupled" is the
wrong question on its own; "how many volts does it actually swing" is the one
that decides whether it can play a pitch**, and for most interfaces it has to be
measured rather than looked up.

**Software, since it decides as much as the hardware:** 📄 VCV Rack **2.6.6**
(2025-11-04), Rack 2 Pro $149. Bitwig €99/€199/€399, ⚠️ **the Grid is Studio-only**.
📄 **Ableton CV Tools now needs only Live 12 Intro** — not Suite, and not a
separate Max for Live licence, which is a change worth knowing if anyone costed
this before. ⚠️ **Reaper has no native CV** and the one community project
(`pagauthier/CVplugins`) was last pushed **2017-11-30** — abandoned. And Expert
Sleepers' own **Silent Way is maintained, not developed**: 📄 announced releases
stop at **v2.11.0, 2022-03-14**, with unannounced point builds since (macOS AU
2.11.4, Windows VST 2.11.2) and **the Windows AAX build still at 2.9.0**.

🔴 **None of this is a shopping list yet, because it is all downstream of §5.3.**
A module is only the answer if the gear is Eurorack; a rack of standalone synths
with DIN sockets needs none of it.

### 3.4 The browser-shaped hole, stated plainly

⚠️ **CORRECTED 2026-09-14 — my first draft of this section guessed, and the
guess was wrong in the most useful direction.** It said a DC-shaped signal
*"will meet a high-pass somewhere in the OS mix path"*. 📄 It does not: the Web
Audio spec mandates no DC blocking anywhere, and Blink's
`RealtimeAudioDestinationHandler::Render` has no filter in the output path. **DC
reaches the platform sink unmodified.** The blockers are real but they are
different ones, and they are worse.

🔴 **Chrome swaps your sound card for a fake one after 30 seconds of silence,
and a gate held low is bit-exact silence.** 📄
`RendererWebAudioDeviceImpl` wraps the output in `media::SilentSinkSuspender`,
whose 30 s timer tests `AreFramesZero()` and then replaces the real hardware
sink. A pitch CV parked at 0 V and a gate held low are both exactly zero frames.
📄 The workaround is in the same source — park one dangling `AnalyserNode` in
the graph and silence detection is disabled — but **the default behaviour is a
CV output that stops existing after half a minute of a held note, with nothing
thrown and nothing logged.** That is the exact failure shape CLAUDE.md keeps
warning about, and it would read as a dying oscillator rather than a browser
decision.

📄 There is a second one with no workaround at all:
`AudioContext::HandleVolumeMultiplier` lets the media host duck the entire
destination bus, so every pitch goes flat at once with **no web-facing way to
observe or veto it**.

🔴 **And CV *into* the browser is blocked outright.** 📄 Chromium issue
**40403559**, *"Support multichannel input from audio device via
getUserMedia()"*, has been open **since 2015**; `getUserMedia` is capped at two
channels. An ES-8's four CV inputs and an ES-9's fourteen are unreachable from a
page, full stop — and there is no escape hatch, because 📄 the WebUSB spec lists
`0x01 Audio` among its protected interface classes, so a page cannot claim the
interface and write isochronous frames itself.

📄 Output device selection is Chromium-only on top of all that:
`AudioContext.setSinkId` is Chrome 110+, **Firefox no, Safari no**
(MDN browser-compat-data, read 2026-09-14).

⚠️ **Nobody has published a measurement of a browser driving a DC-coupled
interface as CV.** Anyone who tries it here will be the first to measure it,
which is a reason to budget for the measurement rather than to assume the
capability.

🔴 **This is not a gap to close, it is a boundary to respect.** The shape that
already works in this repo is: **the browser is the interface, a small computer
next to the gear is the driver, and a relay is between them.** ✅ That is
literally `/keys/` — a page in one building, a Raspberry Pi in another, `ask.mjs`
as the proof that the browser is not the only client. Whatever converts to CV
should sit on the Pi's side of that line, as a native program, and report its
own counters upward.

### 3.5 The recommendation

🔴 **In order, and the first two cost nothing:**

1. **Ask §5.3 before spending anything.** The entire recommendation inverts if
   the gear is Eurorack.
2. **If the ask is "let people hear it": it is already built.** A
   class-compliant USB interface, a Pi, `rig/board/` unchanged. No MIDI, no CV.
3. **If the ask is "let people play it": MIDI, on every box that has a socket.**
   $2–40 per instrument, 960 µs on the wire, against a 69 ms transport that
   dominates it by 70×. 🔴 And first, attach one device and prove `createMidiLane`
   actually sounds a note — because today nobody knows that it does.
4. **CV only for the boxes that have no MIDI socket**, driven from the Pi's
   side as a native program, on its own uncompressed path. 📄 The two concrete
   shapes, priced 2026-09-14: a Pi plus an **NTX-8CV** at about **$254**, or —
   if a desktop interface suits the room better — the **Bitwig Connect 4/12** at
   **£419**, which now undercuts the ES-8 (£435), ships with software, and has
   no cable hazard. ⚠️ Measure its actual voltage swing before trusting it with
   a pitch.
5. **For reading the gear's voltages: a DC-coupled audio input, not a CV-to-MIDI
   converter.** Keep the resolution; this repo already carries PCM frames. 🔴 And
   it **must** be the Pi doing the reading, not a page — 📄 `getUserMedia` is
   capped at two channels and has been since 2015 (§3.4), so a browser cannot
   see more than two CV inputs no matter what is plugged in.

**Rejected, with reasons:**

- **CV-to-MIDI as the general answer** — 🔴 it quantises before the network,
  which is the opposite of what "get it onto the net" wants. It is right only
  where the destination is genuinely a MIDI device.
- **RTP-MIDI** — technically the correct protocol, and adopting it would reverse
  a decision this repo made on measurement. If the LAN case gets serious it
  should be revisited *with* that decision in hand, not around it.
- **OSC as the last hop** — nothing analogue speaks it, so something at the gear
  has to convert regardless; and ✅ `workers/osc`'s sparse p99 of 446.7 ms says
  what the *internet-crossing* version of it is for. ⚠️ Note the distinction the
  table makes: OSC on their own LAN would be fast, and nothing here has measured
  it. The objection is that it does not reach a voltage, not that it is slow.
- **Dante/AES67** — the right answer to a question nobody has asked yet, and the
  bill arrives before the benefit.
- **Bela, Daisy, Teensy as the first box** — 📄 `plans/plan-hardware.md` §3 already
  worked this through: Bela's *"under 1 ms round-trip audio latency"* is real and
  it is about the leg that is already small, its guarantee covers the audio
  thread and not the network stack, and Teensy and Daisy have no network at all.
  ✅ The Pi is the only board that runs today's chain unchanged.

---

## 4 · What to do first

🔴 **Get one real vClick score to compile, and get a machine with csound on it to
grade the result.**

That is one afternoon, it needs nothing from U: beyond a file they have already
published, and it is decisive in both directions:

- **If it compiles and the oracle agrees**, then `plan-uuu-local` P1 is done for
  real rather than by assertion, the seek-from-any-bar claim has a corpus behind
  it, and every later bridge has a reason to exist.
- **If the oracle disagrees**, the compiler has a third misreading in it and
  that is worth more than any of the bridges, because ✅ this has happened
  before: 22/22 green for months with two real defects, found by real Csound in
  an hour.

**The steps, in order, with what each would prove:**

1. ✅ *Already done today, in a scratchpad:* both real scores throw; with a
   macro pass both compile; every `i` line is accounted for; a bracket in p2 is
   silently wrong. This is the evidence that the rest is worth doing.
2. Add `#define` / `$MACRO` expansion to `timeline/csound.mjs`, recursive to a
   fixed point, **warning** on the argument, `#include`, `#undef` and `$NAME.`
   forms rather than guessing at them.
3. Warn on a bracket expression anywhere in p2 or p3. 🔴 **Break it on purpose
   once** to prove the warning fires — CLAUDE.md's rule, and the reason this
   defect was findable at all.
4. Get csound onto a machine that can run it — ⚠️ not this one, which is
   Defender-managed and SIGKILLs locally compiled binaries — and run
   `timeline/lab/csound-oracle.mjs` and then the two real scores through
   `timeline/lab/csound-ssh.mjs`.
5. Only then ask U: for a score of a piece somebody actually performed, with the
   specific question in §5.1 attached. Turning up with a compiler that already
   eats their published examples is a different conversation from turning up
   with one that throws on them.

**What it costs if the answer is no:** an afternoon, and a genuinely useful
warning in a file this repo already ships.

---

## 5 · Questions that have to be asked, not guessed

This is a proposal about somebody else's studio. Most of what would decide it is
not in any repo, and the list below is worth more than a confident plan built on
top of assumptions.

### 5.1 About the scores

1. **Do any performed pieces use `m`/`n` repeats?** ✅ The two published
   examples do not. If real repertoire does not either, the quotation argument
   in `plan-uuu-local` §1 is correct but worth nothing until someone re-notates
   — and that is a composer's decision, not an engineering one.
2. **Is `simple-4-4.sco` / `test.sco` representative?** They are templates.
   ⚠️ One score from a piece that was performed would settle §2.1's whole
   warning list in an hour.
3. **What do p4–p8 mean in their vClick scores?** ✅ The header comment in
   `test.sco` reads `instrnr / start / duration / number of beats / part of the
   whole note / subdivision / bar number / instruments`, and ✅ negative bar
   numbers appear in p7 (`-5.2`, `-5.3`, `-6.2`, `-7.2`, `-8.2`, `-9.2`) with
   comments saying *"don't show red for
   beat 3"*. That convention is not written down anywhere. **This repo must not
   invent a meaning for it** (`plans/plan-score.md` §1), so it has to be asked.
4. **Does anything else generate these scores**, or are they typed by hand?

### 5.2 About the click track in the room

5. 🔴 **What does `setDelay()` get set to in practice?** 📄 The client exposes a
   manual delay knob. The number a conductor actually dials in *is* the measured
   lateness of their current path, and it is the single most useful figure
   nobody has written down.
6. **How many players, in what kind of room, on whose wifi?** Contended hall
   wifi is the case `plan-uuu-local` is built around and none of it is measured.
7. **Does anyone ever start from bar 47 in rehearsal, and does it work?**
   📄 vClick's README says playback can start from any bar *"if the vClick score
   is done well"*. That qualifier is the whole argument for the fold.

### 5.3 About the gear — the questions §3 could not answer

8. 🔴 **What is the gear?** "Plenty of analogue gear" is the brief and there is
   nothing in any repo that names a single instrument. Every recommendation in
   §3 changes depending on the answer. **Ask for a list of boxes and, for each
   one, whether it has a MIDI DIN socket.**
9. 🔴 **What should the network actually do to it** — play it (notes in), record
   it (audio out), control it continuously (knobs), or just switch it on and
   off? These need different hardware and the difference is most of the cost.
10. **Is any of it Eurorack**, or is it all standalone boxes with MIDI sockets?
    This is the question that decides whether CV comes up at all.
11. **Is there a computer near the gear already, and what is it?** A Linux box
    with JACK changes the answer, because 📄 vClick can already follow JACK
    transport.
12. **Is the gear in the same room as the performance, or somewhere else?**
    Latency budget follows entirely from this.

### 5.4 About the infrastructure

13. 🔴 **Their Icecast source password is a literal in two public files** — in
    `radio`'s `app/icecastbroadcaster.cpp` and again in
    `project-description.md` §8.1. ✅ Confirmed present in both by reading the
    clone; not reproduced here and not tested against their server. **Ask
    whether it is still live, and if so rotate it.**
14. **Will they terminate TLS in front of Icecast?** §1.2. Without it, no HTTPS
    page can play their mounts — theirs included.
15. **Is `burst-size` deliberate?** ✅ 4.09 s at join is the stock value. Lowering
    it moves join latency down proportionally, at the cost of a client having
    less to chew on. It is their knob and their trade.
16. **What is the live video key?** ✅ `hls/stream.m3u8` 404s; ⚠️ that could mean
    nothing is broadcasting or that the key is different, and those are not the
    same.
17. **Do they want their infrastructure versioned?** 📄 `uuu.ee` exists only as a
    deploy target in shell scripts; the only infrastructure code anywhere is two
    Icecast hooks and an nginx snippet pasted into a markdown file. That is an
    offer to make, not a change to make.

---

## 6 · The honest summary

📄 U: build instruments for occasions and each is finished when the occasion is
served. positron builds one substrate and measures it. The collaboration is not
a merge: they have the repertoire, the performers and the rooms, and this side
has the transport, the timeline and the harness.

🔴 **What today changed is the order of the queue.** The cheapest proof is no
longer "their five mounts in `flipper`" — ✅ that is blocked on their TLS, which
is their decision and not this side's work. It is **one real score through the
compiler**, because it has already been tried, it already failed, the failure is
small and named, and fixing it makes the next five conversations possible.

And the register matters more than the plan. ⚠️ Nothing above is a promise about
what their gear does, because nothing here knows what their gear is. §5.3 is the
part to send first.
