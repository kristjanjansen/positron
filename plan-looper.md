# plan-looper — the local looper (built) and the remote looper (2026-08-30)

## 0. Where this sits

`proto/looper` is built and measured (`proto/looper/NOTES.md`): a MIDI looper
with a polyphonic synth on `timeline/`, 29 virtual-clock asserts and 16
real-clock asserts green, playable in a browser by a human. This plan carries it
to the thing the jam work was always pointing at: **two people, two rooms, one
loop.**

It leans entirely on measurements this project already owns — the latency matrix
(PROGRESS §6f), the remote-instrument platform (§6j), the loops gate (§8.8) and
the looper's own numbers. Nothing here is a guess about network behaviour; where
something is unmeasured it says so.

---

## 1. THE ARCHITECTURAL CLAIM: a loop does not need a fast transport

Every networked-music system this project surveyed treats the problem as *how do
I get a note across quickly enough*. NINJAM gave up and shipped a whole measure
late. JackTrip spends the entire budget on audio frames. Our own matrix says the
best we can do browser-to-browser is **1.0 ms p50 on a direct DataChannel**,
**16.2 ms via the CF SFU**, **34.5 ms via the elektron-jam DO**.

**A looper does not have that problem, because a committed loop is a VALUE.**

§8.1 put `repeat` in the score and not in the log; `score.mjs` makes a quotation
a value that round-trips byte-identically and resolves refs by identity. So
when a peer finishes a layer, the thing to send is not a stream of notes — it is
the quotation plus its material, **once, reliably, and latency-indifferent**:

```
{ ref: 'layer-1@bob', at: <epoch origin>, in: 0, out: L, repeat: 'infinite',
  items: [ {at, kind:'note', payload:{note, vel, durMs, …}} … ] }
```

A hundred notes is roughly **6 KB of JSON**. Our matrix already established that
**the JSON tax at MIDI sizes is zero** and that relay software never matters,
only the network. Delivery can take 30 ms or 300 ms; what matters is only
whether it arrives before the downbeat you want it audible on — and if it
misses, it starts on the next pass, which is `nest.add({at: origin + k·L})` with
a larger `k`. **That converts a latency problem into a scheduling problem, and
the scheduling problem is already solved.**

Once delivered, each peer plays the layer from its own clock, sample-accurately,
with **no ongoing network dependence at all**. A dropped packet cannot make the
loop late; a 200 ms TCP min-RTO stall (measured, §6f) cannot make it flam. The
network is used once per layer, not once per note.

**So the remote looper has two planes and they have opposite requirements:**

| plane | carries | transport | requirement |
|---|---|---|---|
| **LIVE** | what you are playing *right now*, so the other person can play along | DC-direct unordered, `maxRetransmits: 0` | lowest possible latency; **dropped beats late** (measured: reliable modes stall 200–412 ms, worst on sparse phrases; unreliable converts that to ~2 % vanished notes at p95 2.5 ms) |
| **LOOP** | a committed layer, as a score value | reliable, ordered — DO relay or an ordered DC | arrives eventually and intact; latency irrelevant |

This is the same split the project already made for the archive (live tier vs
the log path stays reliable) and it is the right one again.

---

## 2. What has to be shared, and how little that is

**The origin.** `at = ceil(now / L) · L` on the epoch — jam-core's rule, already
shipped in `jam-interval.html` and already used by proto/loops' phasing demo:
*the beat boundary is a property of the wall clock, not of either peer.* Two
processes started minutes apart land on the same grid with **zero negotiation
messages**. This is the single most valuable thing the jam work built for this
plan, and it is already proven twice.

**The length.** The first peer to commit a layer fixes `L`. Everyone else
inherits it. (§6 below: what happens when two peers commit at once.)

**Nothing else.** No transport clock, no cursor, no per-note stream. Position is
arithmetic re-derived from each peer's own vector — the property that gave
`0.000e+0 ms/wrap` accumulation over 600 wraps and survived a 30 s freeze with
zero re-sync.

---

## 3. THE ONE HARD PROBLEM: clock agreement, not latency

If peers disagree about *now*, they disagree about the origin, and the loops
flam. This is the number that decides whether the whole thing is playable, and
our own measurements say the obvious approach is not good enough:

- against the **worker `/time` endpoint**: real-world grade **±50 ms**, and the
  error is *bias* (edge/worker path asymmetry), not jitter — C5's optimistic
  "±25 ms" was revised to this by measurement.
- **peer-to-peer over a DataChannel, min-RTT-of-N**: **±0.15 ms**, with skew
  drift **7 µs over 25 minutes** (the jam truth clock).

At L = 2000 ms, ±50 ms is **2.5 % of the loop** — an audible flam at any tempo,
and worse: a *constant* one, since it is bias. ±0.15 ms is inaudible and stays
inaudible for the length of a set.

**Design consequence, and it is the plan's sharpest one: estimate skew
peer-to-peer over the data channel, never against a worker.** The DO relay is
the ordering point and the recorder feed (its established role), not the clock.
Where no DC exists (a UDP-hostile network forcing the SFU path), the SFU
DataChannel carries the same min-RTT estimator — 16.2 ms of latency does not
matter for an estimator that takes the *minimum* of N round trips.

**Unmeasured and must be measured before anything else is built**: min-RTT skew
estimation over a *real* distance rather than over loopback. The ±0.15 ms figure
is two Chromes on one Mac. It will be worse. The question the measurement has to
answer is whether it stays under ~5 ms, which is the flam threshold worth
defending.

---

## 4. Architecture

```
        PEER A                                      PEER B
   ┌──────────────────────┐                  ┌──────────────────────┐
   │ trace (local, source-│                  │ trace (local)        │
   │ stamped, never sent  │                  │                      │
   │ wholesale)           │                  │                      │
   │        │ pedal       │                  │        │ pedal       │
   │        ▼             │                  │        ▼             │
   │ projectToPhase       │                  │ projectToPhase       │
   │        │             │                  │        │             │
   │        ▼             │   LOOP PLANE     │        ▼             │
   │   quotation ─────────┼─── reliable ─────┼──► nest.add(remote)  │
   │        │             │   (DO relay)     │                      │
   │        ▼             │                  │                      │
   │   nest.add(local)    │                  │   quotation ◄────────┼──
   │                      │                  │                      │
   │  live notes ─────────┼─── DC unordered ─┼──► monitor voice     │
   │                      │   LIVE PLANE     │   (not recorded by B)│
   └──────────────────────┘                  └──────────────────────┘
             both play every layer locally, from their own clock,
             against one epoch-anchored origin. No shared playhead.
```

**Layers are already tape machines** (rule 7g), so a remote layer is *exactly*
the same object as a local overdub — its own deck, its own quotation, added to
the same nest. **The looper needs no new concept to become multiplayer.** That
is the second time the trace/score split has paid: the first was the pedal
needing no `retrigger()`.

Provenance carries who played it: a remote layer's quotation gets
`provenance: {source: 'peer:bob', …}` through the field `nest.add()` already
normalises at add() time.

---

## 5. What exists already and what has to be built

**Exists, measured, deployed:**
- `elektron-jam` DO (hibernation, echoes verbatim binary + text, stores nothing)
  — the reliable ordering point and recorder feed.
- `jam-core.js`: source stamping in epoch-µs, monotonic-anchored clock, min-RTT
  calibration, the epoch-anchored beat grid, the lookahead scheduler, DC-direct
  and SFU-DC and DO-relay transports behind one `sendRaw`.
- `proto/looper`: the whole instrument, DOM-free core, projection, synth,
  measurement harnesses.
- `score.mjs`: quotation-as-a-value with byte-identical round-trip, `loadScore`,
  `refDeck`/`deckRef` identity resolution.
- `render.mjs`: deterministic offline render with a byte-identical trace hash.

**To build (small, because of the above):**
1. `looper.toScore()` / `looper.loadScore()` — the missing hour named in
   proto/looper/NOTES.md. A layer must serialise to `{quotation, items}` and
   come back. **Prerequisite for everything else.**
2. A `peer.mjs`: min-RTT skew over DC, origin agreement, layer publish/subscribe
   over the reliable plane, live-note forwarding over the unreliable one.
3. Two-pane demo page (both peers in one browser first — see phases).
4. Late-arrival scheduling: a layer that misses its downbeat enters on the next
   one, and says so.

---

## 6. Open questions to settle IN THE BUILD, not in advance

- **Two peers commit a first layer simultaneously.** Whoever wins fixes `L` for
  the session and the loser's layer is either re-projected onto the winner's `L`
  (changing what they played) or refused. Neither is obviously right; a
  deterministic tiebreak (lowest peer id) plus a visible "your loop was
  re-projected onto 2.003 s" is the honest version. Do not hide it.
- **Overdub latency compounds across the network.** Locally the looper already
  owes a `outputLatency` compensation (37.33 ms measured, unbuilt). Remotely you
  play against a layer you hear late by *your* output latency, and the peer
  hears your result late by theirs. The compensation is per-peer and per-layer
  and it is the difference between "tight" and "behind the beat".
- **Does the live plane get recorded?** `jam.html` records local notes at their
  true time and interval mode records remote notes at their *quantized* time. A
  looper has a third option: do not record the live plane at all, and let the
  loop plane be the only thing that persists. Probably right, definitely a
  decision.
- **Leaving and rejoining.** A peer that reloads needs every layer again. The DO
  relay stores nothing by design; either the layers get persisted (the room
  cuelog precedent) or a rejoining peer asks a present peer for the score. The
  second is less infrastructure and more failure modes.
- **`leadMs` per peer.** The looper's headline finding is that a declared lead
  converts 11.5× of jitter into constant latency. Remotely, peers with different
  leads have different constant offsets — i.e. a flam that is nobody's clock
  error. The lead has to be part of the shared session, not a local preference.

---

## 7. Phases, each ending in a number

**P0 — score round-trip (no network). ✅ DONE 2026-08-30** (`measure.mjs` X1/X2,
35/35 green). `looper.toSession()` / `loadSession()`; a second looper in the
same process loads the JSON and plays it.
- byte-identical round-trip **twice** (the null-id trap needs the second pass),
  3,396 B for 2 layers, **1,698 B per layer** — the number under §1's claim;
- the session carries **no trace**, only the score and the material its refs
  name — the C10 cut, and the right one for a wire format;
- **THE GATE PASSED: two independent players, one score, zero messages between
  them, identical (iteration, layer, note, phase) sequences — 480 onsets over 41
  wraps.** No shared playhead, no ongoing sync. The remote claim is now proven
  in everything except the network.

⇒ P1's only genuinely new ingredient is **clock agreement** (§3). That is the
right shape for the risk to have: everything else is already discharged.

**P1 — two tabs, one machine. ✅ DONE 2026-08-30** (`peer.mjs`,
`remote-measure.mjs` 12/12, `remote-verify.mjs` 12/12; play it at `?room=NAME`).
Epoch-anchored origin, layer exchange, live plane, skew estimated peer-to-peer.
- **§1's claim held**: identical phase sets, to the last decimal, across links
  from 1.1 ms to 4700.8 ms. The cost of a slow link is paid in *passes* — the
  4.7 s arm joins on pass 4 where the 1.1 ms arm joins on pass 2. 25 % packet
  loss changes nothing, because the loop plane is one message.
- **§3's claim held, with its negative control**: min-RTT recovers an injected
  offset to 9.8e-5 ms at every skew and every link speed; with the correction
  off, the flam is *exactly* the injected skew (137.4 ms = 6.9 % of the circle).
- **The gate, measured at the two audio render threads: p50 −5.77 · p95
  −1.52 ms · sd 10.17.** ⚠ max 28.39 ms, tail unexplained — see below.
- **A design error worth carrying forward**: a late layer must be *gated*, never
  *seeked*. Seeking to the next downbeat moves the clock and desynchronises the
  peer by exactly the amount it moved. And the gate must be armed as a one-shot,
  not polled — polling loses the downbeat, which is proto/loops' wrap defect at
  a different boundary.
- **New, and it needs following up**: the servo's dead band is a *per-peer*
  position error, invisible solo (one child, one error, nothing to compare) and
  a cross-peer flam when shared. 5 → 1 ms moved p50 from −8.24 to −5.77, so it
  is part of the tail and not all of it.

**P2 — over the deployed `elektron-jam` DO (34.5 ms p50).** Same gates. The
point of this phase is to demonstrate the architectural claim: **the loop plane
should be indistinguishable from P1**, because a value that arrives once does
not care how long it took. If it is not indistinguishable, the claim is wrong
and that is the most valuable possible outcome.

**P3 — real distance, two machines, one of them not on this desk.** Re-measure
min-RTT skew (§3's unmeasured number), alignment, and layer delivery misses per
hour. This is also the first phase where a human on each end is the instrument
under test, which HANDOFF item 1 has been asking for since the beginning.

---

## 8. What would falsify the plan

Written down first, so the measurement can find it rather than the demo hiding it:

- **Peer clock skew over a real link exceeds ~5 ms** and drifts. Then the epoch
  grid stops being free and the loop plane needs continuous discipline — which
  is the servo, one level up, and a much bigger build.
- **Layer delivery misses often enough to be noticed.** A layer that lands a
  pass late is a musical event, not an error, but if it happens on a quarter of
  layers the interaction feels broken.
- **The live plane and the loop plane fight.** You play along with a peer's live
  notes, they commit, and now you hear their committed layer where you were
  hearing their live playing — with a different latency. If that transition is
  audible as a jump, the two planes need a crossfade, and §8.8 says a blend
  across a splice is a declared reconstruction and not a free parameter.
