# plan-uuu-local — U:'s scores through our compiler, with the network out of the TIMING path

Status: ⚠️ **CORRECTED 2026-09-14 — it was NOT "mostly already true", and it was
wrong in both directions at once.** ✅ **P1 fails at the first statement of the
first file:** `compileCsound` THROWS `tempoMap: non-finite point 0,NaN` on BOTH
real scores in `tarmoj/vclick` (`server/simple-4-4.sco`, `server/test.sco`),
because line 12 of each reads `t 0 $REPTEMPO` and `#define` / `$MACRO` is
unsupported. With a twelve-line macro pass in front, both compile clean and every
`i` line is accounted for. ✅ **§3's "single most important unknown" is settled and
the answer is no** — neither real score contains a single `m` or `n`, so the
quotation win is theoretical until somebody re-notates. ✅ And §6's *"`t` is
SECTION-LOCAL — KNOWN OPEN"* trap is **fixed**, §3's "22/22" is now **42/42**,
and §4's *"a local relay does not exist"* is superseded (run the real worker:
`wrangler dev --local --ip 0.0.0.0 --port 8892`). The body below is otherwise
unchanged; read **`research/uuu-integration-2026-09.md`** first, which carries
the measurements and what follows from them.

Written 2026-09-07 out of the question "could uuu's local material run through
the vClick compiler, and does needing a network kill it?"

Primary source is `demo/notes/uuu-positron.md` — read §3 before this file, which
is only the plan that follows from it. `timeline/csound.mjs`'s header cites that
§3 as the source of its claims.

---

## 0. One line

**The network stays. What leaves is the network's place in the TIMING path.**

An earlier draft of this file said "the compiler removes the network", and that
is wrong in a way worth recording, because the correction is the actual point.
vClick has a server and a client for a reason that compiling does not touch:
**band members need click tracks, in their ears, together.** Several humans on
several devices hearing one pulse is the whole job. No amount of compiling makes
that a single-device problem.

What compiling changes is WHAT the network carries and how much timing depends
on it:

| | vClick today | compiled |
|---|---|---|
| the score | executed server-side | distributed once, held by each client |
| position | pushed every beat over OSC | derived locally from the beat↔ms map |
| a network blip | a missed beat | costs nothing already delivered |
| what timing depends on | network jitter | **clock agreement** |

So the network's remaining jobs are per-PIECE and per-SESSION, never per-beat:
distribute the score once, agree a start instant, carry transport commands when
an operator jumps to bar 47 in rehearsal, and let devices find each other at
all. That last is the one positron does not have and U: does.

**This is not a smaller claim than the one it replaces — it is a different and
better-supported one.** This project has already measured what it buys: a
committed loop is a VALUE, and identical loops held across links from 1.1 ms to
4700.8 ms, with 25% packet loss changing nothing, because the loop plane is one
message rather than a stream of them. The cost of a slow link is paid in
PASSES, not in timing. And the negative control is decisive — with the skew
correction off, the flam is *exactly* the injected skew.

Which names the real hard problem, and it is not bandwidth or latency:
**clock agreement between devices.** HANDOFF still lists min-RTT skew over a
real link as the one unmeasured number; everything so far is loopback.

A single device needs no network at all, and `demo/vclick/` already is one — it
imports nothing but `/shell/` and `/timeline/` and makes no `fetch`, no
`WebSocket`, no HTTP request of any kind. That is the existence proof for the
derivation, not a proposal to play alone.

---

## 1. The decision everything follows from

**Compiling moves the score from a runtime protocol to a value.**

vClick's server runs Csound over the score and pushes bar/beat/tempo to players
over OSC on wifi. The score is a program the server executes and the players
subscribe to. Every beat is a message.

Compiled, the score becomes a document each client holds. Position is derived
locally from a shared clock and the beat↔ms map; nothing is pushed. `uuu-positron.md`
§3 states the consequence in one line: *"positron derives position from a shared
clock, so a blip costs nothing already delivered."*

That inversion is the whole plan. Everything below is a consequence of it, and
the test for any proposed feature is: **does this put anything back in the
per-beat path?** If it does, it is wrong regardless of how convenient it is.

---

## 2. What U:'s local material actually is

From the note, and not generalised past it:

| repo | material | shape |
|---|---|---|
| **vClick** | Csound scores — `i` lines, `t` tempo map | notation, precomputed, absolutely timed |
| VideoSync | video files + a Host device | media, plus LAN discovery and drift correction |
| radio1965 | Icecast mounts, a Qt source client | live audio, no seek, no DVR |
| location-music | musicians' positions in a hall | sensor, continuous |
| u-vary-player | 1.46 GB of recordings, carried in git | media |

**Only the first is score material.** The rest is media and sensor data, and it
belongs in the score container as *parts* (`plan-score.md` §4b) rather than
through this compiler. Saying so is the point of §1 of that plan — a common
vocabulary across unlike things is a lie about all of them, and a Csound
compiler pointed at a video file would be exactly that lie.

So this plan is about **vClick scores only**. The rest is `plan-score.md`'s P5.

---

## 3. Does the compiler fit? Yes, and it is built

`timeline/csound.mjs` exists and is tested (`timeline/lab/csound-test.mjs`,
22/22; the fold exact at 57 probes and either side of all 16 notes).

The mapping, from the note's own table and confirmed against the code:

| Csound | positron | in the code |
|---|---|---|
| `t` statements | the beat↔ms map | `tempoMap(pairs)`, trapezoid on seconds-per-beat |
| `i` lines | deck rows | `p2`→`at`, `p3`→duration, `p1`→kind, rest→payload |
| `m` / `n` repeats | a **quotation**, not duplicated lines | `repeatsAsQuotations()` |
| bar/beat readout | a derived lane off the map | not pushed over OSC |

**The one thing a parser would have got wrong**, and the reason this is a
compiler: `p2` and `p3` are BEATS. What Csound interpolates linearly in beat is
**seconds per beat**, NOT tempo — so beat→time is the trapezoid of `60/tempo`.
On `t 0 120  30 90` the answer is **17.500 s** at beat 30.

⚠️ **Corrected 2026-09-09, and the correction is the lesson.** This paragraph
used to say the map was the *logarithmic* integral of a linearly-interpolated
TEMPO, `Δt = (60/k)·ln(m1/m0)` = 17.2609 s, and warned that the mean-tempo
shortcut (17.1429 s) lands notes "118 ms early". Both the code and this text
were wrong: **17.2609 is not Csound's answer either**, so that 118 ms was the
distance between two wrong answers. Measured against csound 6.18, the real error
was **239 ms** at beat 30, and **2.35 s** by beat 20 on `t 0 60 20 180`.

It survived because `csound-test.mjs` checked the compiler against a number
derived from the same formula the compiler implemented — which catches a typo
and can never catch a misreading. `timeline/lab/csound-oracle.mjs` now runs both
against the reference implementation (10/10 green), and skips cleanly where
`csound` is not installed.

### Where it does NOT fit, stated rather than smoothed over

- **Orchestra, not score.** Csound splits a piece into an orchestra of
  instruments and a score of events. The compiler reads the score. `f`-tables,
  `a`, `v`, `r`, `{`, `}` are orchestra-side or authoring sugar and carry no
  timeline row — the compiler records them as **warnings** rather than dropping
  them silently, because a score leaning on them compiles to something quietly
  shorter than it reads. **A piece whose musical content lives in the orchestra
  does not become a timeline by compiling its score.** That is a real limit and
  no amount of compiler work removes it.
- **What the p-fields MEAN is unknown to us**, by design (`plan-score.md` §1).
  `p5` might be frequency, amplitude, a table number or nothing. The container
  carries them verbatim. A demo that drew p4 as a height would be inventing a
  meaning.
- **UNSETTLED, and the note does not answer it:** whether real vClick scores in
  the wild actually use `m`/`n`, or whether "every piece requires its own
  written out score" means the repeats are already expanded by hand. If they
  are expanded, the quotation win is theoretical until someone re-notates. **This
  is the single most important unknown in this plan and it is answered by
  reading one real score, not by more design.**

---

## 4. Does the network kill it?

No, and the worry is inverted. Three things are being confused as one.

### What genuinely needs a network

| need | when | per beat? |
|---|---|---|
| get the score to the device | once per piece | **no** |
| agree a shared clock and a start instant | once per session, and only if >1 device | **no** |
| find the other devices | once per session | **no** |

### What does not

Everything per-beat. The beat↔ms map is compiled once and held locally;
`deck.reduceAt(kind, pos)` computes the state at any position from the rows, so
starting at bar 47 needs no server to say what is in force. `15 seek` asserts
that at every cue boundary ±1 ms — **24 probes, 0 wrong**.

### One device: zero network

`demo/vclick/` is the existence proof. It imports `/shell/` and `/timeline/`
only, and makes no network call. A conductor with a laptop and a compiled score
needs nothing else — no wifi, no server, no uplink.

### More than one device: a clock, not a server

This is the only real cost, and it is a session cost rather than a beat cost.
`proto/looper/peer.mjs` has three interchangeable transports behind one
interface — `broadcastTransport` (same browser, no network at all),
`wsTransport(url)` (any WebSocket relay), and `pairTransports({delayMs, jitterMs,
lossRate})` (in-process, chosen latency). Pointing `wsTransport` at
`ws://192.168.1.50:8080` runs the whole clock and score machinery on a laptop in
the hall with no internet.

The measured facts that make this cheap:

- **Skew, not latency, is the hard problem.** Identical loops held across links
  from **1.1 ms to 4700.8 ms**; the cost of a slow link is paid in PASSES, not
  in timing.
- **min-RTT estimation is scale-free** — "a 311 ms link estimates as well as a
  1.3 ms one" — so a LAN is the easy case for machinery built for the open
  internet, not a different problem.
- **The negative control is decisive**: with the correction off, the flam is
  *exactly* the injected skew.
- A committed layer goes out **once, as a value**, and each client schedules
  locally. A quotation whose `at` has passed does not misfire; it starts on the
  next grid boundary. So a wifi blip loses nothing already delivered — which,
  in a hall with contended wifi, is the material difference.

### What is honestly missing

- **A local relay does not exist.** `proto/looper/server.mjs` is a static file
  server with no WebSocket. The note describes swapping in "a ~40-line local WS
  server"; it is unwritten. `ws.positron.studio` is a Durable Object and cannot
  run on a laptop.
- **Discovery does not exist.** positron has no equivalent of VideoSync's UDP
  broadcast Host-finding. The note is explicit that this is the one direction
  where the borrowing runs the other way.
- **min-RTT skew over a real link is the one unmeasured number** — HANDOFF names
  it as what P3 needs. Everything measured so far is loopback, and the note is
  careful about this: the 20.6 / 52.1 / 57.9 / 67.0 ms p50/p90/p95/p99 local
  chain was **all on one machine**, so it is a FLOOR, not a LAN figure.

---

## 5. Phases

### P1 — a real vClick score through the compiler

Get one actual score from U: and compile it. Not a fixture written to please the
compiler — a piece somebody performed.

**Done when** one real score compiles, its warnings are shown rather than
swallowed, and either its `m`/`n` repeats became quotations or the plan records
that real scores do not use them.

### P2 — the offline claim, asserted rather than assumed

`demo/vclick/` makes no network call today. Nothing enforces that, so it is one
careless import from being untrue.

**Done when** the page's offline-ness is a check rather than a property — a
harness assert or a build-time check that the demo's import graph reaches
nothing outside `/shell/` and `/timeline/`, and that it issues no request.

### P3 — two devices on a LAN, no internet

The ~40-line local WebSocket relay, `wsTransport` pointed at it, two browsers on
one wifi holding one compiled score.

**Done when** two devices play the same score in time with no uplink, and the
number that says so is measured rather than asserted — and stated as a LAN
figure, not a loopback one.

### P4 — discovery, which is theirs to lend

Only if P3 proves out. VideoSync's UDP broadcast Host-finding solves the problem
positron does not address. This is a borrowing, not a build.

---

## 6. Traps

- **Do not put anything back in the per-beat path.** §1. It is the whole point,
  and every convenience will pull that way.
- **The tempo integral, and TWO ways to get it wrong.** Averaging the tempo is
  the obvious mistake. The subtle one, which this project actually shipped until
  2026-09-09, is interpolating the TEMPO linearly rather than SECONDS PER BEAT —
  it looks more rigorous, it is closed-form and logarithmic, and it is 239 ms out
  at beat 30 of a gentle ramp. **Do not check an implementation of somebody
  else's format against your own reading of it**; run
  `timeline/lab/csound-oracle.mjs`.
- **Csound's `t` is SECTION-LOCAL — KNOWN OPEN.** After `s` the tempo resets to
  60 bpm unless the new section declares its own; ours carries one global map, so
  a multi-section score with a tempo is wrong by 2 s in the oracle's case. The
  oracle reports it rather than omitting it.
- **A repeat under a changing tempo is not the same material in time.** Found
  and fixed in `demo/vclick/` this session: the document keeps the repeat as one
  line (authoring) while the deck is built from the expanded compile (trace),
  per `plan-timeline` C10. The last note had been **578 ms** early. A quotation
  replayed at `rate: 1` reproduces the stored spacing, not the stretched one,
  and a scalar rate cannot fix a continuously changing tempo — it matches the
  endpoints and drifts in the middle, which looks fixed.
- **Do not normalize the payload.** `p5` is not velocity. A demo that draws a
  p-field as anything is claiming to know what it means.
- **A tolerant assert is how a subject goes missing.** `loops` was not looping
  for its whole life behind `wraps > 0 || !reached`; `vclick` had five transport
  asserts silently SKIPPED because its deck was built inside a button handler.
  Assert the mechanism, not a downstream effect that has to be waited for.
- **Loopback is not a LAN.** The note says so explicitly about its own fastest
  number. Any figure from P3 must say which it is.
- **`uuu.ee` is not in version control** and exists only as a deploy target in
  shell scripts. Fine to consume their streams; not somewhere to put anything
  that must not be lost.

---

## 7. Definition of done

1. One real vClick score compiles, plays, and seeks from an arbitrary bar with
   the fold exact — and the unknown in §3 is settled by reading it.
2. The offline claim is checked, not assumed.
3. Two devices, one LAN, no uplink, with a measured number that says which it is.
4. Nothing in the per-beat path but the local clock and the compiled map.
