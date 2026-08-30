# NOTES-firewall — the FIRE-SIDE evidence firewall, and `deck.assertState`

transport **v0.7**. Closes the two seams `plan-timeline` §8.8 named:

> the evidence firewall is **read-side only** — nothing stops a derived lane
> from FIRING under `'attested'`, so an evidence-only performance is the
> adapter's job (wants `fire()` gating or `caps.evidenceGated`); no
> `deck.assertState(kind, state, info)`.

Runnable: `node timeline/lab/firewall.mjs [--json] [--baseline <pre-v0.7 transport.mjs>]`
(33 checks, 36 with `--baseline`; ~15 s) and suite 8 of
`node timeline/lab/prop-test.mjs`.
Artefact: `timeline/lab/results/firewall-report.json`.

Eight sections: **A** the hole (negative control, needs `--baseline`) · **B**
bit-identical actuation · **C** disintegration invariance · **D** the price ·
**E** a mid-play policy change · **F** `assertState` · **G** the loop wrap ·
**H** the offline render.

---

## 1. The hole was worse than the seam note said — it had TWO doors

Measured on the shipped pre-v0.7 code (`firewall.mjs` §A, negative control):

| door | under `evidence:'attested'` | |
|---|---|---|
| `fire()` | a **tier-3 generative** lane fired **3/3** of its rows | the known hole |
| `applyReduce()` → `adapter.assertState()` | a seek folded that lane's **whole prefix** and pushed the result into its actuator | **not known** |

The second one is the sharp one. At the same position, on the same lane:

```
deck.reduceAt('tone~erode', 600.5)   ->  null      (evExcludes: EXCLUDED and reported)
deck.seek(600.5)                     ->  assertState('tone~erode', 3)   (silently)
```

**One lane, two answers, decided by which door the query came through.**
`assertState()` is an actuation — it is how a seek puts held state back — but
`applyReduce()` never consulted the firewall at all: it called `softEvidence()`
only to decide whether to *withhold the successor* (`evRestrictsFold`), never
whether the lane was admissible. A read said "excluded"; the seek path performed
it anyway.

So v0.7 gates **both** doors, plus the new third one (`deck.assertState`, §5).

---

## 2. REFUTED: `caps.evidenceGated` is the wrong shape

§8.8 asked for `fire()` gating **or** `caps.evidenceGated`. The cap is refuted
and the gate is **unconditional**. Four reasons, in the order they decided it:

1. **An opt-in cap makes the SAFE behaviour the thing an adapter author has to
   remember.** That is `caps.series` with the sign flipped. §7.9's story:
   `caps.series` was *declared and unread*, and a lane with controllers 1 and 74
   interleaved returned **150 — a value belonging to neither controller**, in
   silence. *Undeclared and unenforced* produces a dreamed note in an archival
   performance, in silence. Same failure; this one is the one an institution
   would be asked to stand behind.
2. **It cannot surprise anyone.** The gate reads `evPolicy`, which is `null`
   until the client makes §5b's FORCED choice. An unqualified deck resolves to
   `EV_UNSET` (`maxTier: Infinity`) and **nothing is ever gated**. A client that
   wrote `evidence:'attested'` has already said this in words — the gate only
   makes the words true. (And `registerReconstructor()` already throws without a
   policy, so a derived lane cannot exist unqualified in the first place.)
3. **The cost argument evaporates under LANE PURITY.** A lane is attested or
   derived, never both, so the gate is one `Set` of kinds — not a per-row test.
   The hot path is `gatedKinds.size !== 0`, hoisted out of `scan()`'s row loop.
   Measured in §4: indistinguishable from a same-module control.
4. **It would be indefensible beside the read side.** `window()` excludes an
   over-cap lane without asking the adapter's permission. A firewall that asks
   permission on one side and not the other is not a firewall.

What the adapter *does* get a say in is not **whether** it is refused but what
the refusal **sounds like** — `caps.absentState` / `silence()`, §5 below.

---

## 3. THE PROOF — bit-identical actuation traces

The read side proved: under `attested` the error is bit-identical to a plain
hold, and dropping 1,674 derived rows leaves master trace and audit
bit-identical. The fire side's mirror, on proto/loops' disintegration fixture
**with `loops.mjs`'s hand-written gate removed** (it does
`if (ev.maxTier < tier) return` inside `actuate()` — the exact thing that was
the adapter's job), so what is measured is the LIBRARY's gate:

Three decks, all `evidence:'attested'`, one virtual clock, fractional cadence
(5.137 ms, coprime with the 25 ms tick):

- **A** — 11 derived lanes present and gated
- **B** — the derived lanes never created
- **C** — A, then every restoration physically `drop()`ped (77 rows removed)

| | |
|---|---|
| actuation trace A vs B | **bit-identical** — 110 rows, **4,165 bytes, one string** |
| actuation trace A vs C | **bit-identical** |
| drift channel A vs B vs C | **bit-identical** — 96 rows |
| refusals in A | **462 fires refused across 11 lanes** |
| invented fraction A | 0 % → **90.6 %** (unchanged by the gate) |
| attested rows A | **8, throughout** |

**Disintegration invariance** (12 repetitions, `firewall.mjs` §C): the attested
performance's 12 repetitions carry **one distinct signature** — the same 8
onsets, byte for byte. Iteration 12 sounds exactly as iteration 1 did, and the
library did it, not the adapter. Under `'all'` the *same fixture* actuates 12
lanes and **558 onsets vs 96**. `evidenceAccounting()` is **identical under both
policies**: the gate refuses actuation, it never edits the trace or the ledger.

### The drift channel is why the identity is possible

A refused row writes **no drift row**. That is a design decision, not an
oversight: drift is the record of what reached a transducer, and a refusal did
not. Had refusals been logged there, deck A's drift channel would carry 462 rows
deck B does not, and the bit-identity — the only claim here that is hard to fake
— would be unavailable. The refusal is instead visible in three other places
(§4).

Suite 8a re-proves this as a **property over random traces** (`prop-test.mjs`,
`NSEEDS/2` seeds, tiers 1+2+3 on every deck, a fractional-cadence play-through
and a seek): the actuation trace and drift channel of an `'attested'` deck must
be bit-identical to the same deck with no restoration in it, while the
restoration really is there and really was refused.

---

## 4. What a refusal LOOKS like (it is never silent)

- **A new terminal status `'gated'`** — not `fired` (nothing happened), not
  `dropped` (the transport was not late), not `reduced` (nothing was folded).
  `stats().counts.gated` counts them; `audit()` shows them. A backward seek
  returns them to `'pending'` through the ordinary `reconcile()`, so loosening
  the policy and replaying is all it takes to hear them.
- **`degradations()`** in the same `{wanted, chose, degraded, reason}` shape
  everything else uses: `chose:'not-actuated'` (fire) / `'not-asserted'` (fold) /
  `'gated'` (assertState) / `'gated-but-held'` (a tightened lane that cannot go
  quiet).
- **`gateAccounting()`** — the actuation-axis twin of `evidenceAccounting()`.
  "How much of what you are about to look at was invented" now has a sibling:
  *how much of what was about to happen was refused*. Returns
  `{policy, gated[], refusedFires, refusedFolds, refusedAsserts, silenced, held,
  reasserted, lanes[], transitions[]}`.
- **`onGate(cb)`** — a live channel, once per refused row, for a UI that must
  SHOW the gate rather than discover it in a ledger afterwards.
- **`request(kind, {actuate:true})`** — the pre-flight. `request({evidence})`
  already answered *what will this lane SERVE*; this answers *will it HAPPEN*,
  which the read-side answer never implied. `chose: 'gated' | true`.
- **`isGated(kind)`**.

Rejected: **fired-as-silence**. Calling `silence()` per gated row would put a
row in the actuation trace — breaking §3's bit-identity for no gain, since a
lane whose rows are all refused never started anything to silence. `silence()`
belongs at the **transition**, once (§5), which is where the state actually
needs unwinding.

---

## 5. A policy change mid-play is a STATE change, not a filter

`setEvidence()` runs transition handlers. Measured (`firewall.mjs` §E, and
suite 8d over the prop rig):

**TIGHTEN** (a lane becomes gated)
- committed one-shots on that lane are **cancelled at the transition**, so the
  tighten is immediate rather than one 25 ms tick late;
- if the adapter declares `caps.absentState: 'silence'` it is called with
  `{reason:'evidence-gated', policy, tier, source}` — the seam that already
  existed for a quotation edge, same mechanism, new reason;
- if it does not, the lane **HOLDS and says so**: `chose:'gated-but-held'`,
  *"the gate can refuse the future; it cannot un-play the past"*. Measured: the
  derived lane goes from 4 onsets to 0 the instant the toggle is thrown.

**LOOSEN** (a lane becomes ungated)
- rows AHEAD of the playhead that `scan()` had already marked `'gated'` go back
  to `'pending'` — nothing else would ever revisit them (suite 8d asserts
  `rearmed > 0`);
- the lane is **re-asserted at the playhead** (`reduce` + `assertState`, reason
  `'evidence-ungated'`) so it catches up on the prefix it was refused instead of
  resuming mid-phrase;
- a lane with no `reduce()`+`assertState()` pair **cannot** be caught up:
  `chose:'resumes-from-next-row'`, reported. Same shape as nested.mjs's
  `caps.loopState:'carry'` refusal, for the same reason.

Both transitions are on `gateAccounting().transitions`:
`[{tighten, tone~r, silenced}, {loosen, tone~r, reasserted}]`.

### × the loop wrap (`caps.loopState` / `adapter.loopWrap()`) — `firewall.mjs` §G

nested.mjs's wrap does three things in order. Only two are actuation:

| step | gated? | |
|---|---|---|
| 1. `adapter.loopWrap(info)` | **no** | a FLUSH/notification hook. It carries no invented material, and a gated lane that is never told the tape came round is a lane that cannot go quiet at the boundary. |
| 2. `child.seek(in)` → `assertAt` | **yes** | door 2 |
| 3. `deck.assertAt(out, k)` for CARRY lanes | **yes** | door 2 |

Measured over 4 wraps with a gated tier-2 lane declaring `loopState:'carry'`:
**15 fires and 10 carry/seek folds refused, 0 reaching an actuator, 4/4
`loopWrap()` calls delivered**, the attested carry lane still carrying (10
carries, 20 onsets), and the refused carry named in the ledger — *a lane that
declared carry and got nothing must not discover it by sounding wrong.*

---

## 6. `deck.assertState(kind, state, info)`

Honest positioning first (§7.5): `reduce(prefix ≤ t)` + assert is thirty-year-old
shipped practice — Ardour's `midi_chase()`, ETC Eos's flag literally named
**Assert**. What was missing was not the idea but the **deck-level entry point**.
`assertAt(pos, kind)` folds *and* asserts; a client that already KNOWS the state
— after an external sync, a media-master handover, a policy change, a loop wrap
that ended at `out` while the playhead sits at `in` — has no prefix to replay and
no reason to pay for one.

**What it touches**
- `adapter.assertState(state, info)` — the actuation.
- the reduce **snapshot**, set to `{pos, state}`, so a forward-folding reducer's
  `info.from` / `info.since` continue from the assertion.

**What it does not touch**
- **the drift channel.** A drift row is `{id, at, intendedUs, firedUs, deltaMs}`
  for one EVENT; an assert has no event and no intended instant, so a synthetic
  row would be a fabricated **zero-lateness** sample in every p50/p95 in this
  repo. Measured: 602 asserts against a 2,001-row drift channel would have been
  **23 % of the distribution**, all at delta 0. Asserts have their own channel
  (`deck.asserts()` → `{total, retained, dropped, rows}`). Symmetric with the
  reason `sync()` is not `seek()`: a correction is not an event.
- **position and statuses.** Asserting state is not seeking; conflating them is
  the distinction `sync()`/`seek()` already exists to keep.

**Verification is OPT-IN (`{verify:true}`)**, and that is a considered default:
checking means folding the prefix, which is exactly the cost `assertState`
exists to avoid. Measured over a 2,001-row prefix, n=300 each:

| | |
|---|---|
| unverified | **1.46 µs** |
| verified | **77.06 µs** |
| ratio | **52.7×** |

The asymmetry with the evidence policy is the one §7.9 already drew: **silence
that can FABRICATE throws** (evidence), **silence that merely trusts or widens
defaults** (certainty — and this). The caller IS the authority here by
construction. When asked, a disagreement with `reduce(≤ pos)` is applied anyway
(that is what "authoritative" means) and **reported as `'asserted-over'` with
both values** — *if the log is right the assertion has just diverged the deck
from its own trace; if the caller is right the trace is incomplete and should
say so.*

**Refusals**: no adapter → `'no-adapter'`; no `assertState()` → `'no-assertState'`;
a gated lane → `'gated'`. In every refusal the **snapshot is not moved** — writing
one for a state nothing received would make the next forward fold resume from a
boundary that never happened.

**The property** (suite 8e, `NSEEDS/3` seeds, the non-commutative add/mul/set
reducer in forward-fold mode):

```
assertState(k, reduce(≤ t1), {pos: t1});   then a forward fold to t2
                                   ===   reduce(≤ t2)
```

plus: the snapshot moves to exactly `{t1, reduce(≤t1)}`; `assertAt(t2)` lands on
the same state; zero drift rows; `{verify:true}` confirms agreement silently and
reports disagreement.

---

## 7. THE PRICE — and a measurement that had to be thrown away

The wall lane's committed-vs-pending scheduler is latency-critical (25 ms tick /
100 ms horizon), so the gate had to cost nothing there.

**Structure**: one `Set.size` read per `scan()` call — **hoisted out of the row
loop** — plus one local-boolean test per candidate row. `fire()` keeps its own
`gatedKinds.size !== 0 && has()` guard, which is load-bearing rather than
belt-and-braces: a one-shot committed *before* a mid-play tighten, and
`scheduleEvent()`'s overdub path, both arrive there directly.

**The measurement that lied.** The first cut compared p50s of two independent
sample sets, and gave, on the *same two builds*:

```
+11.4 %   +0.8 %   +9.8 %   +10.7 %   +5.5 %
```

Five "measurements" of one number, spanning an order of magnitude. That is this
repo's own locked-phase trap wearing a different hat, so the arm was rebuilt
twice over:

1. **paired differences** — A and B run back to back inside one rep, order
   alternating, and the DIFFERENCE is the sample, so a thermal ramp or a GC pause
   lands on both halves of the pair;
2. **a same-module negative control** — the baseline benchmarked against a
   **byte-identical copy of itself**, loaded as a second module instance. An
   earlier version of this control (difference-of-p50s) had two identical builds
   disagreeing by **−7.7 %, −4.5 %, +3.9 %** across three runs, which is larger
   than any effect that could be attributed to the code.

Result, N=20,000 events/run, n=120 pairs, four runs:

| arm | paired p50Δ |
|---|---|
| CONTROL: baseline vs a byte-identical copy of itself | **−4.7 … +8.3 ns/event** (IQR ±25…90) |
| EFFECT: v0.7 vs pre-v0.7 | **+1.4 … +14.8 ns/event** (always inside the control band) |
| the scan itself | **418–438 ns/event** |

**The honest claim is an upper bound, not a value**: the gate's fast-path cost is
inside a control band this benchmark cannot resolve — < ~15 ns/event on the
medians, < 3.5 % of scan. Best point estimate ≈ **+6 ns/event**, which is what
one hoisted `Set.size` and one boolean per row should look like. **Not measured**:
the cost on a real browser main thread, or under a worker tick host.

### The negative result that changed the code

The first cut of the gate made **refusing 37 % MORE expensive than firing**
(8,000 tier-3 rows: 3.7 ms refused vs 2.7 ms fired) — an absurd shape for a gate
whose whole job is to do less. Cause: `gateRefuse()` built its ~500-character
explanation string **per refused row**. Fixed by memoising the reason string and
the report object per `(lane, policy generation)` — sound because
`noteDegraded()` already folds consecutive identical reports into `n`, so the
rows were sharing one *report* while the *string* was rebuilt each time. After:

| | |
|---|---|
| 8,000 tier-3 rows FIRED under `'all'` | **2.9–3.1 ms p50** |
| the same rows REFUSED under `'attested'` | **0.6 ms p50** |
| | **79–80 % cheaper**, n=40 |

Which is the shape the design predicts: the gate stops in `scan()`, so a refused
row never arms a one-shot, never builds a drift record and never enters
`actuate()`.

---

## 8. API added (all additive; nothing existing changed shape)

```js
deck.assertState(kind, state, info?)   // {pos, reason, source, verify} -> report
deck.asserts(fromTotal?)               // {total, retained, dropped, rows}
deck.snapshotOf(kind)                  // {pos, state} — the reduce boundary
deck.gateAccounting(kind?)             // the actuation-axis twin of evidenceAccounting
deck.onGate(cb)                        // live refusals; returns unsubscribe
deck.isGated(kind)
deck.request(kind, {actuate: true})    // pre-flight -> chose: 'gated' | true
deck.stats().counts.gated              // the new terminal status
```

Same names on `sched` (`createScheduler`'s returned object).

---

## 9. Seams still open

- ~~`renderDeck` does not know about the gate.~~ **MEASURED and closed**
  (`firewall.mjs` §H): `offlineDeck()` is `createDeck()` on a render runtime, so
  it uses the same `createScheduler` and inherits the gate with **zero changes to
  `render.mjs`**. A rendered `'attested'` deck holding 10 derived rows is
  byte-identical to a render of the same deck with no restoration in it —
  identical trace AND identical `renderHash` (`53f54d24780ad98f`), while 10/10
  rows were refused offline exactly as online. **Not measured**: the same claim
  through `renderNest` over a loop (a nest was not built for this arm).
- **`nested.mjs` cannot yet use `deck.assertState`.** proto/loops' seam #2 asked
  for exactly it: the level-CARRY at a wrap wants to assert a state folded at
  `out` while the playhead sits at `in`, and today does `deck.assertAt(out, k)`,
  which folds *and* asserts, so the position reported to `assertState` is `out`
  rather than the playhead. The one-line fix now exists (see §11).
- **A gated lane's `evidenceAccounting()` is unchanged by the gate** — correct
  (the ledger describes the log, not the performance), but it means a UI showing
  "90.6 % invented" beside a performance in which 0 % of it sounded needs
  `gateAccounting()` too. No renderer reads it yet.
- **Nothing gates `caps.followsTransport`.** A gated lane's adapter still hears
  play/pause/rate. Deliberate — transport state is not evidence — but unproven
  against a client that treats `transport({playing:true})` as a cue to start
  something.
- **One policy per deck.** A nest's child and parent can disagree, and nothing
  reconciles them; `setEvidence` on a child does not propagate. Untested.
- **The gate is per-LANE, so a mixed-tier lane cannot be partially served.**
  `lp.tier` is the max over the lane, so one tier-3 row gates a lane that is
  otherwise tier 1. That is lane purity working as designed (a restoration lives
  in its own lane), but it is a real constraint on a reconstructor that wants to
  deepen in place rather than append a new lane.
- **Not measured**: the gate under a real browser worker tick host; the gate's
  effect on the audio lane (`createAudioLane` has its own commit path and does
  **not** consult the gate — a derived lane routed through the audio lane instead
  of the wall lane would still sound).

---

## 10. Note on the neighbours

`prop-render.mjs` showed 1–4 transient failures (`nest-vs-realtime` firing 0 of
12 child events; `nest-audio`) during this session while `nested.mjs`,
`render.mjs` and `prop-render.mjs` were being rewritten by another agent
(mtimes 09:57–10:09). **Not this change**: an isolated copy of the same tree with
the *pre-v0.7* transport failed identically at the time, and both copies pass
0/0 now. Final state, all at `--seeds 100`: `prop-test` 0 · `prop-nested` 0 ·
`prop-store` 0 · `prop-render` 0 · `firewall.mjs` 36/36 (with `--baseline`).

---

## 11. The one change wanted in a file I do not own

`timeline/nested.mjs`, `wrapSpan()`, step 3 (currently line ~486):

```js
    for (const k of lanes.carry) sp.deck.assertAt(sp.c1, k);  // 3 — the carry
```

wants to become, now that the entry point exists:

```js
    for (const k of lanes.carry) {                            // 3 — the carry
      const state = sp.deck.reduceAt(k, sp.c1);               // fold at `out`
      sp.deck.assertState(k, state, {                         // assert at the PLAYHEAD
        pos: want, reason: 'loop-carry', source: sp.id,
      });
    }
```

This is proto/loops NOTES seam #2 ("works; slightly untrue") closed: the state is
still the level the iteration ended in, but the position reported to
`assertState` is where the playhead actually is. Two notes for whoever makes it:

- `reduceAt` **throws** `EVIDENCE_POLICY_REQUIRED` on a deck with no explicit
  policy where the answer could differ, and returns `null` for a lane the policy
  excludes — so guard with `if (state === undefined || state === null) continue;`
  rather than asserting a null.
- a **gated** carry lane refuses both calls and reports; today `assertAt` already
  refuses it (measured, §5), so the change does not open a hole.
