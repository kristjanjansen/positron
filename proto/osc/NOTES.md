# proto/osc — the `osc` kind, bundle atomicity, and the transport question

Owned files: `proto/osc/*`, `timeline/osc.mjs`, `workers/osc/*`.
Nothing else was touched. `timeline/transport.mjs` was read, never edited.

```
timeline/osc.mjs        PART A the wire codec · PART B the `osc` kind
proto/osc/corpus.mjs    the shared interop corpus (37 messages, 7 bundles)
proto/osc/interop.mjs   Phase 2 driver: liblo · osc.js · osc-min · python-osc · Pd
proto/osc/interop_py.py   the python-osc side
proto/osc/atomic-test.mjs the bundle-atomicity proof (32 assertions)
proto/osc/bench-node.mjs  Phase 3, node arms (local control, DO relay)
proto/osc/bench.js|html   Phase 3, browser arms (dc-direct, moq-bundle, moq-msg, do)
proto/osc/run-bench.mjs   two headless Chromes over CDP
proto/osc/server.mjs      :8893 static + /time-local + /msg mailbox
workers/osc/              elektron-osc — the DO relay (deployed)
```

Run:
```
node proto/osc/atomic-test.mjs                 # 32/32
node proto/osc/interop.mjs --only liblo|js|min|py|pd|self
node proto/osc/bench-node.mjs --n 300
node proto/osc/run-bench.mjs --n 300           # needs two Chromes
```

---

## 1. The codec

OSC 1.0 + 1.1. **Encodes** `i f s b` (1.0 required), `T F N I` (1.1 required),
`h t d S c r m` (optional). **Decodes** all of those plus `[ ]` 1.1 array
grouping. Bundles with 64-bit NTP time tags, nested to any depth, `#bundle`
sentinel, the special tag `1` = *immediately*. Length framing for stream
transports; **SLIP is deliberately not implemented** (declared in `caps.framing`,
not hidden) — WebSocket already frames, so SLIP would only serve a raw TCP
bridge we do not have.

### The bug that justifies Phase 2 on its own

The first draft padded OSC-strings with `4 - ((len + 1) % 4)`. The correct law
is `4 - (len % 4)`. The wrong formula is off by one for every length ≡ 0 or 2
(mod 4) — so `/abc` came out 3 bytes instead of 4 and `/foo` 7 instead of 8.

**It round-tripped against itself perfectly**, because the decoder made the same
mistake. Every self-test passed. It died on the first real packet. A codec is
not testable against itself, and that is the whole argument for the corpus.

### The time-tag asymmetry, measured

`at` is transport-ms as a JS double; a time tag is NTP 32.32 fixed point.

| direction | verdict | measured |
|---|---|---|
| ours → NTP | exact | round-trips within **1.00 ULP** of the double (n=20 000) |
| NTP → ours | **lossy** | ~233 ps tag LSB vs ~244 ns double step at 2026 epochs — **~10 bits thrown away** |

So `decode → re-encode` is *not* byte-identical, verified as a test rather than
asserted as a comment. The mitigation is the rawData rule: every row from a
bundle carries `rawTag` (the 8 bytes verbatim) beside the derived `at`.
Re-emitting from `rawTag` **is** byte-exact — also tested. Arithmetic uses `at`;
the wire uses `rawTag`.

Also worth stating: an OSC time tag has no era field, so the representable range
ends **2036-02-07**. That is a limit of the format, and `epochMsToNtp` throws
rather than silently wrapping.

---

## 2. The kind

**`caps.series(payload) = payload.address`.** This is the cap U5 was built for.
One lane (`osc`), one sub-lane per address, so `bracket`/`sampleAt` can never
straddle two different controls — the CC lane's modwheel-vs-cutoff defect,
avoided by construction rather than by care.

**Level vs edge: the ADDRESS decides, and nothing else can.** MIDI CC could
answer per controller number because the 128 controllers are an enumerated set.
OSC's address space is open: `/synth/3/cutoff` and `/scene/next` are the same
wire shape. Three layers, in priority order — explicit client policy (OSC glob
syntax plus `**` for "any number of segments"), then a default heuristic, then
`unknown`.

**The default is EDGE, and the asymmetry is the design.** Guessing *level*
wrongly means a seek re-sends a one-shot trigger: audible, destructive.
Guessing *edge* wrongly means a fader goes stale: visible, recoverable, fixable
by naming the address. Asymmetric costs, asymmetric default.

Every inference is **reported** through `onReport` and `deck.degradations`,
never applied silently. The heuristic's sharpest rule is `/mixer/3/mute` →
**level**: it looks like a command and is a state, and getting it wrong is
exactly the class of the SWITCHES step-series bug.

`reduce(prefix ≤ t)` returns **two** maps: last value per address for level
addresses, and a fired-set for edge addresses. Both are needed — a seek must
re-send the first and must never re-send the second, and a caller inspecting
state should be able to see which edges went by without that being an
instruction to fire them.

`assertState` re-sends the level map **as one bundle with an immediate tag**.
Not cosmetic: a cutoff and its resonance restored half a scan apart is an
audible artefact, so the kind's own atomicity primitive implements its own seek
correctness.

**`caps.continuous: false`, and no `caps.tier`.** An OSC level is a zero-order
hold: `/synth/1/cutoff 800` means 800 until told otherwise, and inventing 812.5
between two samples is a claim the sender never made. Declaring `continuous`
would make the library offer interpolation for a signal whose semantics forbid
it. A client that genuinely wants smoothed OSC registers a second, derived lane
and pays the tier-1 provenance — the firewall working as designed. (This also
means the kind never takes the "interpolates but declares no `caps.tier`"
degradation that `makeCcAdapter` currently takes.)

---

## 3. Bundle atomicity — the decision and its argument

**DECIDED: N rows sharing a `bundleId` and an identical `at`, with atomicity
enforced at the ACTUATION boundary — not one row whose payload is the bundle.**

| against | why N rows wins |
|---|---|
| **seek** | A bundle is routinely heterogeneous: `{/synth/1/cutoff 800, /scene/next}` is one level and one edge. One row ⇒ one address ⇒ `caps.series` has one key for a payload holding two signals — precisely the defect U5 exists to prevent. **This is the deciding argument: one-row-per-bundle makes the library's own positional reads lie.** |
| **reduce** | "Last value per address" is one linear pass when each payload has one address; with bundles-as-payloads every fold must recursively flatten every bundle in the prefix, at scrub rate. Worse, `at` stops being the position of the message: a bundle at *t* containing a nested bundle tagged *t*+50 ms has children that are not at *t*, and one row cannot express two positions. |
| **evidence** | Provenance and `when` are per row (E1/U1). One row per bundle forces one provenance for the whole group — so interpolating a single fader would relabel a `/scene/next` in the same bundle as tier-1 restoration. A false provenance claim is exactly what the firewall exists to make impossible. |
| **the store** | The case that looks like it argues the other way. A 5-message bundle straddling a page boundary is atomic-by-construction under one-row-per-bundle. **We give that up on purpose**: it buys atomicity at the storage layer while costing it at the semantic layer, and a paged client still has to seek, reduce and interpolate. We buy it back explicitly — every row carries `{bundleId, bundleN, bundleI}`, so "do I have all of it?" is a **count**, not a structural property. Partial becomes *detectable* rather than merely impossible, and detectable composes with the other three. |

**How the group is enforced.** The scheduler fires rows one at a time and has no
notion of a group (and a bundle is an OSC concept, not a transport concept — it
does not belong in `transport.mjs`). So the adapter buffers: stage messages by
`bundleId`, commit in one call to the sink when the staged count reaches
`bundleN`. Because every row of a bundle shares `at`, the scheduler's own
`(at, seq)` ordering delivers them consecutively inside one synchronous fire
burst — the common path stages N and commits with no timer and no async. A
`queueMicrotask` marks the burst boundary; an open group there **can never be
completed** (its siblings share `at` and would already have fired), so it is
abandoned and reported.

**Proven, not asserted** — `atomic-test.mjs`, 32/32:

| scenario | result |
|---|---|
| happy path | 3 rows → **one** packet, flagged atomic |
| store miss (3 of 5 rows) | **nothing emitted**; abandonment reported with the dropped addresses |
| seek landing past two bundles | no partial bundle; seek produced one assert packet, itself one bundle |
| foreign message mid-group | group abandoned, loose message delivered, **never 2 of 3** |
| catch-up over 404 events | **one** assert packet (not 404 sends); levels re-sent at last value; `/scene/next` fired 3× and asserted **0×**, suppression reported |

---

## 4. Interop matrix (Phase 2)

Corpus: 37 messages + 7 bundles, every typetag implemented, both directions.
`byte-identical` is the strong verdict; `pass` means their decoder read our
bytes correctly; `unsupported` means the tool cannot express the case *and says
so* — recorded, never skipped.

| tool | ours → theirs (msg) | theirs → ours (msg) | ours → theirs (bundle) | theirs → ours (bundle) |
|---|---|---|---|---|
| **liblo 0.36** (reference C impl) | **36/37 pass**, 1 rejected | **29 byte-identical**, 7 unsupported, 1 differs | **7/7 pass** (incl. nested + empty) | n/a (CLI has no bundle syntax) |
| **osc.js 2.x** | **37/37 pass** | **34 byte-identical**, 3 differ | **7/7 pass** | **7/7 byte-identical** |
| **osc-min** | **37/37 pass** | — | **7/7 pass** | — |
| **python-osc** | **37/37 pass** | **30 byte-identical**, 7 unsupported | **7/7 pass** | byte-identical |
| **Pure Data 0.56-5** | *blocked* | *blocked* | *blocked* | *blocked* |
| self (round-trip + spec bytes) | 37/37 + canonical example byte-exact | | 7/7 | |

**Every implementation decodes every message and every bundle we emit**,
including nested bundles, the empty bundle, and non-immediate NTP tags. The
disagreements are all in the *other* direction and all in optional typetags.

### The named incompatibilities

1. **liblo has no `r` (RGBA) type at all** — and rejects the **entire message**,
   not just the argument: `liblo server error 9912 in path /r: Invalid message
   received`. `oscsend` agrees: `Type 'r' is not supported or invalid.` The
   reference implementation does not implement an OSC 1.0 optional type. *Ours
   is not wrong; `r` is simply not portable to the liblo world.*

2. **osc.js silently encodes int64 as ZERO for a BigInt.** It requires a `Long`
   instance; given a BigInt it writes `0000000000000000` and does not throw.
   With a `Long` it is byte-identical to ours, and its *decoder* reads our `h`
   correctly. Silent data loss on the encode side only — the worst shape of bug.

3. **osc.js's `r` alpha is a normalised float 0…1** while R/G/B are 0…255.
   `{r:255,g:128,b:64,a:0.125}` produces our `ff804020`. Its `r` *decoder* is
   also broken (returns `{r:13,g:10,b:0,a:0}` for valid bytes). An API-level
   difference plus a real decode bug — not a wire disagreement.

4. **python-osc's builder supports only `f d i h b s r m T F N`** — no `I`
   (impulse), no `S` (symbol), no `c` (char), no `t` (timetag). Its *parser*
   handles all of ours. Asymmetric coverage.

5. **python-osc refuses to build a zero-length blob** ("Blob value cannot be
   empty") though the spec allows it — and parses ours without complaint.

6. **`oscsend`'s CLI cannot express `b`, `r`, `t`** (liblo's C API can), and its
   `m` value parser produces garbage for every documented form tried
   (`0,144,60,100` → `00 00 00 00`; `144 60 100` → `00 00 01 44`). Confirmed a
   CLI limit, not a codec limit: **liblo decodes our `m` exactly** —
   `oscdump` prints `MIDI [0x00 0x90 0x3c 0x64]` for our bytes, and our `c`
   (`'A'`) and `S` (`'sym`) likewise.

### Where implementations legitimately differ

- **Padding**: no disagreement found. All four agree on `4 - (len % 4)` for
  strings and on blobs being padded but *counted* unpadded.
- **`S` / `c` / `r` / `m`**: support is genuinely patchy (see above). `S` and
  `c` are wire-identical to `s` and an int32 respectively, so a peer that lacks
  them loses only the tag's intent, not the value. `r` and `m` are not portable.
- **1.0 vs 1.1 nullary tags**: `T`/`F`/`N` are universal in practice; **`I` is
  not** — python-osc's builder has no name for it. liblo prints it as
  `Infinitum` (the 1.0 name) where 1.1 calls it Impulse. Same byte, three names.
- **Type inference**: ours maps a bare JS number to `i` when it is an exact
  int32 and `f` otherwise — matching `oscsend`. This is a documented sharp edge,
  not a bug: sending `1.0` from JS yields `i 1`. Callers who care use the
  wrappers, and the corpus always passes `types` explicitly so no interop row is
  ever about inference.

### Pure Data: blocked, honestly

`brew install --cask pd` (0.56-5) installs, but the binary produces **no output
at all**, not even for `-version`, and delivers nothing over `netreceive`.
Clearing `com.apple.quarantine` did not change it. This is the local
Gatekeeper/ThreatLocker class of failure the brief warned about — a cask
(GUI app bundle), not a formula. **Reported as an environment block, not as an
interop result.** The harness arm is written and will run wherever `pd -nogui`
runs.

---

## 5. Transport (Phase 3)

See §6 for the tables. Method: bundles of 3–8 real OSC messages built by the
real codec, sender-stamped inside the payload, three traffic shapes (burst
40 ms, sparse 300 ms, chord = triples back-to-back then a gap). Node arms use
two sockets in one process (one clock, zero sync error); browser arms calibrate
both Chromes by min-RTT against `/time-local`.

**Integrity is scored from the WIRE**, by counting the messages that carry each
bundle's id — never from the transport's own framing. A transport cannot be
asked to grade its own atomicity.

### The tables

**Browser arms** (two headless Chromes, n=300 bundles of 3–8 messages; sparse
n=120). `integrity` = of the bundles that arrived at all, the share that arrived
**complete**. `whole` = of everything sent, the share that arrived complete.

| arm | shape | loss % | **integrity %** | whole % | p50 | p95 | p99 |
|---|---|---|---|---|---|---|---|
| **dc-direct** (unordered, maxRetransmits 0) | burst | 0 | **100** | 100 | **0.98** | 1.58 | 2.18 |
| | sparse | 0 | **100** | 100 | 1.58 | 2.38 | 3.38 |
| | chord | 0 | **100** | 100 | 1.18 | 1.98 | 2.48 |
| **moq-bundle** (one bundle = one group) | burst | 47.0 | **100** | 53.0 | 21.4 | 26.7 | 31.5 |
| | sparse | 0 | **100** | 100 | 23.6 | 41.7 | 113.2 |
| | chord | 5.67 | **100** | 94.3 | 23.7 | 42.8 | 45.5 |
| **moq-msg** (one message = one group) | burst | 98.3 | **0** | 0 | 30.0 | 39.5 | 39.5 |
| | sparse | 0 | **9.17** | 9.17 | 27.2 | 54.8 | 63.6 |
| | chord | 99.3 | **0** | 0 | 42.1 | 42.1 | 42.1 |
| **DO relay** (elektron-osc) | burst | 0 | **100** | 100 | 34.7 | 42.9 | 104.6 |
| | sparse | 0 | **100** | 100 | 35.7 | 53.4 | 75.6 |
| | chord | 0 | **100** | 100 | 38.4 | 71.4 | 86.9 |

**Node arms** (two sockets in one process — one clock, zero sync error):

| arm | shape | loss | integrity | p50 | p95 | p99 |
|---|---|---|---|---|---|---|
| local (codec + harness only) | all three | 0 % | 100 % | **0.13–0.16** | 0.25–0.35 | 0.36–0.46 |
| DO relay | burst | 0 % | 100 % | 37.5 | 45.1 | 58.6 |
| DO relay | sparse | 0 % | 100 % | 37.9 | 79.1 | **446.7** |
| DO relay | chord | 0 % | 100 % | 37.4 | 52.9 | 68.6 |

Our own codec costs **~0.15 ms per bundle**, so every network number above can
be read as network cost.

### THE MoQ VERDICT — the hypothesis is confirmed, and sharply

Same traffic, same sizes, same schedule; the only variable is the grouping.

> **One bundle per MoQ group fixes bundle integrity completely: 100 % across
> all three shapes, 720 bundles, ZERO partial bundles.
> One message per group destroys it: 0 %, 0 % and 9.17 %.**

The single most informative row is **moq-msg / sparse: 0 % bundle loss and
9.17 % integrity**. Every bundle arrived. 109 of 120 arrived **incomplete**.
That is the 6f chord-loss finding in its purest form — the messages get there,
but not all of the ones that belong together — and it is invisible to any
metric that counts messages instead of groups. A message-loss number would have
called that arm *lossless*.

Two things the numbers say that the hypothesis did not predict:

1. **Grouping also fixes LOSS, by an order of magnitude**, because it divides
   the group rate by the bundle size. `moq-msg` burst pushes ~125 groups/s and
   loses 98.3 %; `moq-bundle` pushes ~25 groups/s and loses 47 %. This is the
   documented mechanism — *one MoQ group = one QUIC uni-stream*, so group rate
   is stream-credit consumption — and bundling is simply the largest available
   constant-factor reduction in it.

2. **MoQ is still not good enough for burst OSC.** Even at 25 groups/s,
   `moq-bundle` loses 47 % in the burst arm. Grouping made what arrives
   trustworthy; it did not make enough arrive. The sparse arm (3.3 groups/s) is
   clean at 0 % loss, and the chord arm (~6.7 groups/s) at 5.67 %. **The
   ceiling is a group RATE, not a byte rate** — which is exactly why the fix is
   to put more into each group rather than to send less.

### The structural rule this exposes

> A transport can only produce a **partial** bundle if it splits that bundle
> across independently-deliverable units.

DC-direct, the DO relay and `moq-bundle` all carry one bundle as **one**
deliverable unit (one SCTP message, one WebSocket message, one MoQ group), so
their integrity is 100 % by construction, not by luck — and a bundle either
arrives whole or not at all. `moq-msg` splits, so it can and does deliver 4 of
a 5-message chord.

This is also why the **CF SFU DataChannel arm was not separately re-measured**:
an SFU DataChannel carries one bundle as one SCTP message exactly as DC-direct
does, so its integrity is 100 % for the same structural reason, and its latency
(**16.2 ms p50**, unordered ≈ ordered) is already measured at n=550 in session
6f over the same anycast path. Re-running it would have produced a third
instance of "one message in, one message out ⇒ 100 %". Stated as inherited, not
as measured here.

### Trap that cost a run

On CF d14 there is no `SUBSCRIBE_NAMESPACE`, so a subscriber that consumes a
path **before the publisher has announced it** does not wait — it fails
permanently, and each failed attempt burns one of the session's ~40–60
subscribe credits. The first MoQ run reported **100 % loss** for exactly this
reason and nothing to do with MoQ. Fix: publisher up first, announce over the
signalling mailbox, subscriber consumes only after. Fresh session-suffixed
namespace per run (§13.4).

---

## 6. Recommendation — which transport for which case

| case | transport | why |
|---|---|---|
| **LAN gear (real UDP)** | **node bridge on the operator machine** | See §7. Nothing browser-reachable competes. |
| **browser ↔ browser, same city** | **DC-direct**, unordered, `maxRetransmits:0` | p50 **0.98 ms**, 0 % loss, 100 % integrity in all three shapes. Nothing else is within 20×. |
| **browser ↔ browser, no direct path** | **CF SFU DataChannel** | 16.2 ms (6f), anycast, no TURN; integrity 100 % structurally (one bundle = one SCTP message). |
| **wide-area / many listeners** | **DO relay** (`elektron-osc`) | 34.7–38.4 ms p50, **0 % loss and 100 % integrity in every shape**, one WS message in → one out. Watch the sparse p99 (447 ms node / 75 ms browser): TCP with no packets in flight has no fast retransmit. |
| **recording / ordering** | **DO relay**, unambiguously | It is the only arm that is reliable, ordered, and a natural single point through which every packet passes. The log wants exactly that, and 37 ms is free for a recorder. |
| **MoQ** | **only sparse traffic, and only bundled** | Group-per-bundle is mandatory (integrity 0 % → 100 %). Even then, 47 % loss under burst. Fine for a slow control surface, not for a keyboard. |

**The one-line rule:** put a whole bundle in a single deliverable unit on every
transport. It is free on DC and WebSocket, and on MoQ it is the difference
between 100 % and 0 % integrity.

---

## 7. What a node bridge on the operator machine buys

`studio/engine.mjs` already supervises children and holds a localhost socket, so
this is a small addition rather than a new component. It buys **four things no
CF transport can**:

1. **Real UDP to real gear.** Browsers cannot open a UDP socket — not with
   WebRTC, not with WebTransport, not ever. Every hardware synth, every Max
   patch, every lighting desk, every OSC-speaking pedal on the LAN speaks UDP on
   port 8000-something. A bridge is not an optimisation here; it is the only
   door. `timeline/osc.mjs`'s codec runs unchanged in node, so the bridge is a
   socket and a `decodePacket`.
2. **LAN latency, ~0.1 ms.** Our local control arm measured **0.13–0.16 ms**
   for the codec, and a LAN UDP hop is a few hundred microseconds. That is 7×
   better than DC-direct and 250× better than the DO relay — and it is the only
   arm where the transport is cheaper than the audio buffer it feeds.
3. **The time tag becomes usable.** OSC's `t` exists so a receiver can schedule
   ahead of a jittery network — CNMAT's "trade jitter for latency". That only
   works if sender and receiver share a clock. On a LAN they do (PTP/NTP to
   microseconds); across CF anycast they do not, and the tag degrades to a
   sequence hint.
4. **No frame roof, no credits, no relay.** No 64 KB cap, no QUIC stream budget,
   no ~40–60 subscribe credits, nothing to brick with a same-name rejoin.

What it does **not** buy: reach. It is one machine on one LAN. The right shape
is both — **bridge for the room, DO relay for the world and for the log** — and
they compose cleanly because the bridge speaks the same `osc` kind: the relay
carries encoded packets, the bridge decodes them onto the wire, and neither has
to know the other exists.

---

## 8. What the `osc` kind still cannot express

Honest list; every item is a real limit, not a TODO.

1. **Query / reply.** OSC 1.1's address *patterns* (`/synth/*/cutoff` as a
   message address, matching many receivers) and the whole `#reply` convention
   are RPC, and a timeline row is not a request. We match patterns in the
   *policy*, never on the wire: an outgoing address is always concrete. A
   round-trip query has no position, so it has no `at`, so it is not a row.
2. **The absent value.** A level address that was never set has no state, and
   `assertState` cannot re-send what was never sent. Unlike MIDI CC there is no
   `RESET_ALL_CONTROLLERS` equivalent — no OSC message means "put everything
   back" — so a seek to *t*=0 leaves a receiver holding whatever the last scrub
   left, and only the receiver's own patch knows its defaults. The CC adapter
   sends CC 121 first and lands on a *known* console; **the `osc` kind cannot,
   and this is the sharpest thing it cannot do.**
3. **Bundle semantics beyond simultaneity.** A bundle says "these fire
   together". It cannot say "these are alternatives", "this supersedes that", or
   "abort if any fails". `bundleId` gives grouping, not a transaction.
4. **The nested bundle's atomic scope.** We make atomicity **per innermost
   bundle** — the smallest set the sender said fires together. A sender who
   meant "this whole tree or nothing" cannot say so, and neither can the spec.
5. **Argument-level provenance.** Provenance and `when` are per row, and a row
   is one message. A bundle where one *argument* of one message is
   reconstructed cannot be marked; the granularity floor is the message.
6. **`[]` array encoding.** We decode 1.1 arrays and refuse to encode them,
   because a JS array argument is ambiguous with our blob-from-array
   convenience. Declared in `caps.decodes` vs `caps.encodes`, not hidden.
7. **SLIP framing** (1.1's stream framing). Length framing only. Declared.
8. **Era.** Time tags end **2036-02-07**; `epochMsToNtp` throws rather than wrap.
9. **A level's rate of change.** `caps.continuous:false` is right for OSC's
   semantics but means the kind cannot answer "what was the cutoff at 1.5 s"
   with anything but a zero-order hold. Interpolated OSC has to be a separate
   derived lane carrying tier-1 provenance — correct, and more work than a cap.
10. **Loss repair.** OSC has none (RTP-MIDI's recovery journal is RTP-MIDI's
    alone). For level addresses our `assertState` bundle *is* the CC keyframe
    trick and repairs a late joiner for free. **For edge addresses there is no
    repair at all** — a lost `/scene/next` is simply gone, and no amount of
    folding brings it back. This is why the edge/level split is load-bearing far
    beyond seek.
