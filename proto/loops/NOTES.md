# proto/loops — a quotation with repetition (plan-timeline §8)

Two pieces, one field. `repeat` on a quotation, and the fragment map with
**modulo instead of clamp**. Port 8890.

```
node proto/loops/server.mjs        # http://127.0.0.1:8890/proto/loops/
node proto/loops/measure.mjs       # both pieces on a virtual clock, 18 asserts
node proto/loops/gate.mjs          # THE TIMING GATE, 13 asserts, 600 wraps
node proto/loops/verify.mjs        # one headless Chrome, 14 asserts + 3 shots
```

`loops.mjs` is DOM-free and is the only implementation: the page, the headless
measurement and the browser verification all import the same two builders, so
the page cannot display a number the headless run did not earn.

---

## THE GATE — "loops stay in time and do not lag on re-seek"

This is the acceptance criterion, above every feature, and it found a real
defect. Two things are kept apart and that is the whole answer:

- **Position is arithmetic and never pauses.** `childPos = in + ((parentPos −
  at)·rate) mod (out − in)` is re-derived from the parent's vector on every
  call. Never integrated, never "add one loop length". The timing error at wrap
  500 therefore *is* the error at wrap 1 — measured, not argued: **slope
  0.000e+0 ms/wrap over 600 wraps** (gate G2).
- **The re-seek is a STATE operation, not a transport one.** `deck.seek()`
  re-anchors and re-folds; it does not stop the transport, move the rate or
  re-issue `play()`. transport.mjs's own seek handler ends with `scan(now)` —
  *"re-arm immediately, don't wait a tick"* — so the next pass's lookahead is
  committed inside the same call.

### What was broken, and the three fixes

The design as settled discovered the boundary by **polling `servo()`**. That is
late by up to one client-loop period, and everything inside that window is
`reconcile`d to `passed` rather than fired: **a hole in the head of every pass.**
Measured on the phasing demo before the fix: **2100 of 2400 onsets — exactly one
lost downbeat per wrap.** Three changes, in the order they were forced:

1. **The wrap is COMMITTED, not polled.** `createNest(parent, {tickHost})` arms
   one cancellable one-shot per span for the exact instant of the next
   boundary — the identical mechanism transport.mjs uses to commit every event.
   Re-armed from the *iteration index* (`at + k·onePass`), never from the last
   boundary, so it cannot drift either. `servo()` remains the backstop and is
   what makes a blurred tab collapse to one wrap instead of fifteen. Without a
   host, `nest.loop(id).boundary === 'polled'` says so out loud.
   Negative control (gate G1): polled at 17 ms, **60 of 61 downbeats lost**.
2. **A wrap seeks a hair BEFORE `in`.** `seek(in)` reconciles everything at
   `at <= in` to `passed`, so an event sitting exactly on `in` — the downbeat —
   is folded instead of fired. A quotation is `[in, out)`, so the wrap targets
   `in − 1e-6`. The one case the library cannot fix is `in === deck.range[0]`,
   where the seek clamps; that is **reported** (`nest.loop(id).leadClamped`) and
   both demos avoid it by starting the child's range one unit early — the
   splice. Entry into the first pass takes the same lead, so pass 1 is not the
   only pass missing its downbeat.
3. **`wrapGraceMs` (default 150 = transport's own `lateGraceMs`).** A wrap
   always seeks to the top of the pass *if it is within grace*; past it — a 30 s
   blurred tab — the material was genuinely missed and the child lands where the
   clock says, instead of playing a head it would immediately jump out of. One
   constant, one meaning.
   *(A bug this line created and the gate caught: reading `phaseOf(pos).off`
   here instead of the SIGNED distance made an early-firing timer see `off ≈ L`,
   conclude it was two seconds late, and seek to the END of the pass it was
   about to play. 141 of 2400 onsets vanished. `lateMs = (pos − boundary)·rate`
   is the fix.)*

### The numbers (gate.mjs, virtual clock, 600 wraps)

| | p50 | p95 | max |
|---|---|---|---|
| IOI error **within** a pass | 0 ms | 0 ms | 0 ms |
| IOI error **across** the wrap | 0 ms | 0 ms | 0 ms |
| firing error, **wrap-adjacent** | 0 ms | 0 ms | 0 ms |
| firing error, all others | 0 ms | 0 ms | 0 ms |

4808 of 4808 onsets, 601 of 601 downbeats, accumulation slope **0.000e+0
ms/wrap**, origins `["commit"]` only (nothing burst). Under load — 40 × 500 ms
main-thread stalls — every wrap still happened exactly once and the worst
across-wrap interval equalled the worst within-pass interval. The zeros are real
but they are a *virtual* clock's zeros; the honest numbers are below.

### The numbers (verify.mjs, headless Chrome, WALL clock, 12 wraps)

| | p50 | p95 | max |
|---|---|---|---|
| IOI error within a pass | 1.50 ms | 10.20 ms | 13.90 ms |
| IOI error across the wrap | −9.90 ms | −4.70 ms | **14.30 ms** |
| firing lateness, **wrap-adjacent** | **0.10 ms** | **0.70 ms** | **0.70 ms** |
| firing lateness, all others | 4.50 ms | 14.60 ms | 16.20 ms |

**13 downbeats for 12 wraps — every pass kept its own.** The lag number the gate
asked for is **−13.9 ms at p95**: an event beside a wrap fires *more* accurately
than an ordinary event, because it is committed by the re-seek's immediate
`scan()` rather than waiting for the next 25 ms tick. **The loop point is the
most precisely timed instant in the loop.**

The −9.9 ms p50 on the across-wrap interval is not the wrap: it is the *previous*
onset's own lateness (p50 4.5 ms, max 16.2 ms) landing in a difference of two
samples, plus the servo's dead-band corrections near the end of a pass. The
wrap's own contribution to it is the 0.10 ms in the row below. The spread —
which is what "does it stutter" actually asks — is 14.30 ms across a wrap
against 13.90 ms within a pass: the same envelope.

---

## PHASING — Reich, *It's Gonna Rain*, as arithmetic

**§8.5 was almost right.** "Quote the same deck twice at rate 1.0 and 1.002" —
except rule 7g forbids two quotations of one deck from overlapping in parent
time, *because a deck has one position*, and its error message already says
"build a second deck to overlay". **Phasing needs two decks, not one deck quoted
twice.** Reich needed two tape machines for exactly the same reason. The
abstraction reproduced the physical constraint without being told about it, and
that is the most interesting thing the demo found.

**The origin is EPOCH-ANCHORED**, not first-event-anchored. tracker's rule is
"any beat can be beat 0"; `proto/jam/jam-core.js`'s is "the beat boundary is a
property of the wall clock, not of either peer". For phasing the second is
right: `at = ceil(now / 2000) · 2000`, so two processes started minutes apart
land on the same phase with zero negotiation, and the drift is reproducible
across machines rather than per-run.

### The drift fit

Virtual clock, 600 s, 599 samples:

```
fit slope   0.002000000     expected  0.002000000     error  -0.000 ppm
residual    p50 0.0001 ms · p95 0.0001 ms · max 0.0001 ms
wraps       A 299 = floor(t/L)   B 300 = floor(t·1.002/L)
onsets      a 2401   b 2406      (300 and 301 complete passes × 8)
```

Wall clock, headless Chrome, 24 s, 86 samples:

```
drift 47.80 ms    predicted 48.01 ms    residual -0.21 ms
fit slope 2.134997e-3 vs 2.000000e-3   (135 ppm)
residual p50 0.60 · p95 4.34 · max 4.50 ms
```

**The drift is `(rate−1)·elapsed` and nothing else.** On a virtual clock the
residual is analytically zero; on a real one it is **4.5 ms at the worst over
24 s**, and that is servo error — visible in the screenshot as a staircase
riding the analytic line, one step per dead-band correction. The 135 ppm slope
error is the fit over 24 s of a 1000 s cycle; it shrinks with the window.

Back to unison in `L/(rate−1)` = **1000 s**. That number is the piece.

---

## DISINTEGRATION — Basinski, as an evidence gradient

`repeat: 12`. Every wrap runs **one more registered reconstructor** — a real
`deck.registerReconstructor(name, {from:'tone', into:'tone~erode-k', tier,
method, plan, derive, confidence})` — which appends a derived lane carrying
`{source, method, tier, confidence, refs}`. Lane purity is enforced by
transport.mjs, so **the attested lane cannot be touched**: 8 rows at repetition
1, 8 rows at repetition 12, with 77 dreamed rows beside them.

```
 rep  tier  method                          attested  derived  invented   conf
   1    0   attested                               8        0       0 %   1
   2    1   linear-partial-interpolation           8        7    46.7 %   0.917
   5    1   linear-partial-interpolation           8       28    77.8 %   0.667
   6    2   spectral-inpainting                    8       35    81.4 %   0.583
   9    2   spectral-inpainting                    8       56    87.5 %   0.333
  10    3   generative-infill                      8       63    88.7 %   0.25
  12    3   generative-infill                      8       77    90.6 %   0.083
```

`evidenceAccounting().inventedFraction` climbs **monotonically, every
repetition**, and the number is the library's, not the client's. Under
`evidence: 'attested'` the deck answers with the 8 attested partials and nothing
else, and `strip.inkOf('tone~erode-1')` paints **294 px under 'all' and 0 px
under 'attested'** while the attested lane keeps its 624 px — the tratteggio
proof, measured in pixels.

**Source material: a synthetic tone row, not `proto/kurenniemi`'s corpus.** The
corpus is metadata-only; its 13 playable items are `media: {url}` references to
archive.org MP3s streamed cross-origin, so a Kurenniemi disintegration would
measure the network, could not run headless, and would make the evidence
gradient uncountable. The tone row makes it exactly countable, which is the
point of the piece.

**Why it is `repeat: 12` and not `'infinite'`.** A loop that READS is free — the
resident page set is constant at any repeat count (§8.7 below). A loop that
**WRITES at every wrap is an infinite log**: store.mjs's live `tail` is "always
resident, never evicted" by design. That is the half of §8.7's store question
that actually bites, and it is why the wrap is a **callback and never a row**.

---

## Seams found in code I do not own

> **UPDATE 2026-08-30 (session 7): seams 1, 2 and 3 are all CLOSED.** See
> plan-timeline.md §9. Seam 1 turned out to have a second door nobody had
> noticed — the seek fold's `assertState()` — and `caps.evidenceGated`, wanted
> below, was refuted in favour of an unconditional gate. Seam 2's
> `deck.assertState` exists and `wrapSpan()` now uses it. Seam 3 is closed by a
> renderer that runs the nest rather than being handed two numbers. The
> original text is kept below as written.

1. **The evidence firewall is a READ-side firewall.** `window`/`reduce`/
   `sampleAt`/`bracket` are gated by the policy; **actuation is not** — nothing
   in transport.mjs stops a derived lane from FIRING under `'attested'`. An
   evidence-only *performance* is therefore the adapter's job, and
   `loops.mjs` does it by hand (`if (ev.maxTier < tier) return`). Wanted:
   the scheduler consulting the policy before `fire()`, or a
   `caps.evidenceGated: true` an adapter can opt into.
2. **No `deck.assertState(kind, state, info)`.** The level-CARRY at a wrap wants
   to assert a state folded at `out` while the playhead sits at `in`. It is done
   with `deck.assertAt(out, kind)`, which folds *and* asserts, so the snapshot
   stays consistent — but the position reported to `assertState` is `out`, not
   the playhead. Works; slightly untrue.
3. **`renderDeck` cannot see a nest.** It is handed two numbers and has no way
   to know one of them was invented, so the unbounded-loop refusal has to live
   where the loop is declared (`nest.renderBound()`). Wanted: `renderDeck`
   consulting an optional `deck.renderBound?.()`.
4. **The nested.mjs "adapter registered after construction is unreachable" seam
   is CLOSED** (transport v0.6 added `deck.adapter(kind)` and `deck.silence()`).
   The stale note in nested.mjs is corrected.

## What loops still cannot express

- **A loop whose length changes while it runs.** `repeat` is fixed at `add()`.
  tracker's `relaunch()` — re-basing `at` to now — is expressible only by
  removing and re-adding the span; there is no `nest.retrigger(id)`.
- **Polymetry across a shared origin.** Each span has its own `at` and its own
  `L`, so polymeter works — but there is no notion of a shared bar to be
  polymetric *against*, and no way to say "wrap at the next common multiple".
- **A loop that quotes a loop with an independent count.** Nesting works; the
  inner loop's repetitions are not addressable from the outer score.
- **Snapping.** Deliberately absent: tracker quantizes the container and never
  the content, and there is nothing here that could re-time quoted material
  even by accident. If snapping is added it must land on `{in, out}` only.
- **A crossfade at the wrap.** Absent on purpose. `nest.loop(id).joint` is
  `'cut'` and its `jointNote` says why: a blend across a splice is §5b tier 1
  and belongs in a declared reconstruction lane, or on the source adapter (the
  lineage's only blend is `Tone.GrainPlayer`'s grain `overlap`, a property of
  the player and not of the loop).
- **A wrap that is audible to the SCORE.** The wrap is a callback; a score
  cannot say "on the 4th repetition, do X". That is a program, and the score is
  a program that quotes traces, not one that branches.
