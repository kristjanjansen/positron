# proto/paths — the first CONTINUOUS timeline kind (2026-08-28)

demo10 revived as a library client. Four prior clients (jam, selfrec, remixer,
instrument) are all **discrete** kinds — a note fires, a tile appears, a cue
lands. This is the first kind whose state is defined **between** samples, and it
is therefore the first client to exercise the one slot in plan-timeline's adapter
contract `{capture, actuate, reducer, interpolate, caps}` that nothing has ever
touched: **`interpolate`**.

Why it matters: interpolation is **tier 1** of plan-timeline §5b's reconstruction
spectrum — inference bounded by evidence on both sides — and §5b names demo10's
overlay of *evidence + reconstructions drawn at once* as the canonical
**tratteggio** UI: perceptually seamless in performance, always distinguishable
on inspection. This demo is that doctrine, runnable, with the invention measured
in pixels.

```
node proto/paths/server.mjs            # rig on :8887
open http://127.0.0.1:8887/            # drag on the canvas, or "synthesize path"
node proto/paths/harness/run-paths.mjs # headless verify, ONE Chrome → results/
```

Files: `server.mjs` (:8887, aliases `/timeline/*` to the repo library — loaded,
never copied), `paths.html`, `paths.js` (capture + overlay + transport),
`pointer-adapter.js` (the adapter + interpolators + deviation metric),
`harness/{run-paths.mjs,cdp.mjs}`, `results/{verify.json,paths-verify.png}`.

**Update 2026-08-28:** §3's seam report was written against library v0.3, where
`timeline/*` was not modified and every gap was worked around in this client.
Those gaps are now closed in the library (v0.4) and the workarounds here are
**deleted** — §6 is the before/after.

---

## 1. What was ported, and what was fixed

Ported (the ideas): `~/personal/time/public/demo10.html` — full-rate mouse path,
decimated, reconstructed several ways, **all paths drawn overlaid at once**, with
stepped `lineWidth`/`alpha` so lower-fidelity paths read *under* higher-fidelity
ones. `~/personal/demo/pages/{draw,drag}.vue` — the 150 ms capture throttle,
Catmull-Rom smoothing, and the live / raw-replay / smoothed side-by-side layout.

Fixed (the documented defects, from research/timeline-own-prior-art-2026-08.md
§6 + §2 — every one of these is marked `FIX-n` in `pointer-adapter.js`):

| # | Inherited defect | What this client does |
|---|---|---|
| FIX-1 | **Destructive sampler** — demo10's `samplePoints()` did `realTimePoints.length = 0`, so decimation *consumed its own ground truth* and the comparison it existed to make was invalid (§6). | Two append-only lanes, `S.evidence` and `S.stored`, written in the same `pushSample()` call. Stored rows are **fresh objects**, so the lanes cannot alias. Evidence is never read destructively. |
| FIX-2 | **Frame-count decimation** (`frameCount % 5`) — breaks on 120 Hz displays and in throttled tabs (§6). | Wall-clock: `if (atUs - lastStoredUs >= 100_000)`. The throttle is 100 ms, the lineage's stored-lane rule. |
| FIX-3 | **First and last segments dropped** — demo10 looped `for (i = 1; i < n-2; i++)`, silently discarding both terminal segments of every path. | Reflected **phantom endpoints** (`p₋₁ = 2p₀ − p₁`), so every segment `0 … n−2` exists and the terminal tangents degrade to the chord slope. Verified: the flattener yields `n−1` segments for `n` samples. |
| FIX-4 | **Fixed `t += 0.2` subdivision** — starves long segments, wastes work on short ones, and float accumulation never lands exactly on `u = 1` (so segments do not join). | **Pixel-budget** subdivision: `steps = clamp(⌈chord / 3 px⌉, 2, 32)`, stepped with an **integer** index so `u = s/steps` hits `1.0` exactly. |
| FIX-5 | **Per-frame recompute over an unbounded array** — demo10 rebuilt the entire smooth path inside `draw()`, every frame, forever. | `makeFlattener()` caches per segment; appending sample `n−1` invalidates only segments `n−4 … n−2` (segment *k* depends on `lane[k−1 … k+2]`). Per-frame cost is O(1): measured `renderAt` ≈ **0.02 ms**. |
| FIX-6 | **Uniform-knot Catmull-Rom** — demo10's form assumes evenly spaced samples. A wall-clock-throttled pointer lane never is, so uniform knots bend the curve toward whichever sample happened to arrive late. | **Time-knotted (non-uniform) Catmull-Rom**, written as a cubic Hermite with finite-difference tangents over the samples' *actual* timestamps. The synthetic trace carries ±2 ms arrival jitter specifically to exercise this. |
| §2 | **Re-stamping at handler time** — `draw.vue` used `Date.now()` inside the handler. | `performance.timeOrigin + ev.timeStamp` → epoch µs: the **event's own** clock, monotonic-anchored (steal #8), plus `getCoalescedEvents()` so the evidence lane is genuinely full-rate. |
| §2 | **Origin/duration derived from events** (trims leading/trailing silence). | `S.header = {t0Us, durationMs, source}` — session properties, stored, never derived. |

---

## 2. The adapter

```js
caps: {
  continuous: true,            // state is defined BETWEEN samples, not only at them
  interpolate: true,
  interpolators: ['hold', 'linear', 'catmull-rom'],
  neighbourhood: 1,            // v0.4: EXTRA samples each side of the bracketing
                               // pair (0 = two-sample; 1 = one each side, which
                               // is exactly what a Catmull-Rom needs)
  tier: 1,                     // §5b spectrum: interpolation, bounded by evidence
  method: 'catmull-rom',
  evidence: 'attested-endpoints',
  deviates: true,              // the RENDERER deviates; the log stays faithful
  seek: true, rate: true,
  seekReduce: 'interpolated',  // reduce(prefix ≤ t) returns the INTERPOLATED position
  catchUp: 'reduce',           // a pointer must never burst a queue of stale moves
  assertOnSeek: true,
  throttleMs: 100,
  swallowOriginal: false,
}
```

`actuate(payload, rec)` marks the attested fire. `interpolate(a, b, u, ctx)`
returns the intermediate state. `reduce(payloads, pos)` is `reduce(prefix ≤ t)`
for a continuous kind — **the interpolated version**: not the last sample before
`t` but the interpolation between the samples *bracketing* `t`. `assertState()`
routes to the same actuation path as a live fire (one code path, live and
replay). Measured: the interpolated `reduce` lands **0.042 px** from analytic
truth where zero-order hold lands **38 px** away.

---

## 3. THE INTERPOLATE-SEAM REPORT (primary deliverable)

> **CLOSED 2026-08-28 (library v0.4).** All six seams below are now first-class
> in `timeline/*`, and this client's workarounds have been **deleted** — see §6
> for what went and what the numbers did (nothing: they are identical to the
> last digit). The report is kept verbatim because it is the evidence that
> motivated the change.

**Verdict: the library does not support continuous kinds. Its transport half
needs nothing; its adapter half is missing four things, three of them small.**
Nothing here blocked the client — everything was workable around — but every
workaround is code the next continuous client will write again.

### S1 — `interpolate` is never called. `caps` are inert.
`interpolate` appears **nowhere** in `timeline/transport.mjs` or `logdeck.mjs`.
`registerAdapter()` validates `actuate` only; of the whole `caps` object the
library reads exactly `caps.catchUp`, `caps.audio` and `caps.assertOnSeek`.
So `caps:{continuous:true, interpolate:true}` is pure documentation.
plan-timeline C3 says *"every adapter declares `caps:{seek, rate, interpolate}`
and the transport degrades honestly"* — the transport currently reads none of
them and so cannot degrade at all.

### S2 — there is no adapter-facing hook between two fires. (The big one.)
The wall lane calls `actuate()` **only at attested sample positions**. Between
two fires the library makes no adapter call of any kind. `observePosition()`
exists and is exactly the right 60 Hz channel, but `createDeck` wires it to the
**client** (`onPosition`), never to the adapter. Measured on a 6.5 s trace:
**59 attested `actuate()` fires vs 4 854 `interpolate()` calls** — **98.8 % of
the rendered motion was driven by client code the library knows nothing about.**
The client had to own its own render loop, its own bracketing cursor, and its own
per-frame call into its own adapter. Every continuous client will rewrite it.

*Minimal fix:* when a registered adapter declares `caps.continuous`, drive it
from the position observable the deck already runs — one `adapter.render(pos)`
(or `interpolate` + internal actuate) call per frame per continuous kind.

### S3 — no bracketing-pair query, and the only positional read is O(n).
The scheduler holds the sorted `events` array *and* a `firstLive` cursor — the
O(1)-amortized machinery already exists — but exposes neither. `prefixEvents()`
is private; the only positional read is `reduceAt(kind, pos)`, which re-scans
**from index 0** on every call. Driving an interpolator from `reduceAt()` at
60 Hz therefore reproduces demo10's **per-frame-recompute-over-an-unbounded-array
defect inside the library**. Worked around with a client-side `makeBracket()`
(binary search on seek, linear advance on play).

*Minimal fix:* `sched.bracket(kind, pos) -> {a, b, u}` over the existing cursor.

### S4 — `reduce()` structurally cannot see the right bracket. (The deep one.)
`applyReduce()` hands the reducer `prefixEvents(kind, pos)` = every event with
`at <= pos`. For a continuous kind the state at *t* is a function of the samples
**straddling** *t*, and the successor is by construction absent from the prefix.
**An interpolated `reduce` is therefore not expressible in the current
contract.** SEAM 5's guarantee ("the reducer is a pure function of the prefix")
is exactly right for discrete kinds and exactly wrong for continuous ones: for a
continuous kind, the prefix is not sufficient statistics for the state.

Worked around by having the adapter hold a reference to the lane and look up
`lane[a.i + 1]` — i.e. the adapter keeps a second handle on the log, defeating
"the library owns the log".

*Minimal fix:* add `info.next` (first event of this kind with `at > pos`) — the
scheduler already has the sorted array, so this is a two-line addition — and let
`caps.neighbourhood = n` request *n* successors for higher-order interpolators.

### S5 — `interpolate(a, b, u)` is under-specified for any C¹ interpolator.
A spline is **not a function of two samples**. With only the pair you can express
hold and linear and nothing better. This adapter degrades honestly — asked with
no neighbourhood it returns `method: 'linear'` and says so in the result — and
obtains Catmull-Rom only because it holds the lane (S4's workaround again).

*Minimal fix:* make the fourth argument part of the contract:
`interpolate(a, b, u, {prev, next, pos, dtMs})`.

### S6 (`logdeck`) — the payload spread clobbers the injected position `at`.
`makeLogDeck` builds `payload: { i, at, ...p.payload }`, where `p.payload`
defaults to the **raw capture row** — whose own `at` is in **epoch µs**. The
spread therefore silently overwrites the position-domain `at` the library just
computed, *in the field the library itself injected*. This is §2's law —
*"untrusted payloads must not spread over control fields"* — being broken inside
the library that records it. Worked around with an `expand()` whose payload
carries no `at` key (ours uses `atUs` / `posMs`).

*Minimal fix:* inject last — `{ ...p.payload, i, at }` — or namespace the
control fields.

### What already works, unchanged, and needed nothing
- **seek → `assertAt` → `reduce` + `assertState`** is exactly the right shape for
  a continuous kind, and delivered 0.042 px seek accuracy.
- **`caps.catchUp: 'reduce'`** is precisely correct for a pointer: after a stall
  the actuator must be *placed*, never fed a burst of stale moves.
- **`reconcile()` after a backward seek** marks passed events `passed`, not
  re-fired, so scrubbing left does not machine-gun the actuator; the position is
  re-established by `assertState`. Correct as-is.
- `setRate()` while paused, `sync()`, the drift channel, worker tick host, the
  position observable: all fine. **The transport half of the library is done.**

---

## 4. Verification (headless, ONE Chrome, 2026-08-28) — 9 pass / 0 fail

Trace: parametric Lissajous, 6 000 ms, 120 Hz evidence with ±2 ms arrival jitter,
so ground truth is known **analytically** at every instant.
721 evidence samples → **59** stored after the 100 ms wall-clock throttle.

| assert | result |
|---|---|
| A sample count | stored 59 = lane payloads 59 = deck items 59 = scheduler total 59 |
| B seek ×3 vs analytic truth | **0.042 / 0.032 / 0.042 px** (`method: catmull-rom`) |
| B2 interpolated ≠ hold | same seeks with zero-order hold: **38.31 / 45.55 / 27.03 px** — a ~900× improvement, and the proof that `reduce()` really interpolates |
| C pause holds | 301.700 ms → 301.700 ms after 400 ms; drift **0.000 ms**, rate 0 |
| D rate 2× | 1 500 ms span: 1 506.0 ms @1× vs 756.9 ms @2× → **1.990×**; observed rates 0.9999× / 1.9997× |
| E four lanes render | per-lane offscreen ink: evidence 4 690 px, stored 5 529 px, linear 18 652 px, Catmull-Rom 7 203 px |
| F deviation computed | see below |
| F2 adapter actuated | 59-sample lane: **29 attested fires**, **4 854 `interpolate()` calls**, 11 `reduce()` calls, per-frame render **0.02 ms** |
| G console | **0 errors**, 0 exceptions |

### Reconstruction deviation — "how much did we invent", in pixels
Every reconstruction evaluated at each of the 721 evidence samples' **own**
timestamps:

| reconstruction | mean | p95 | max |
|---|---|---|---|
| hold (zero-order — no interpolation at all) | **24.19 px** | 52.72 | 67.66 |
| linear (tier 1) | **0.679 px** | 1.41 | 1.63 |
| Catmull-Rom (tier 1) | **0.036 px** | 0.08 | 0.16 |

And the blunt version: **59 attested samples, 896 points drawn on the
Catmull-Rom lane → 93.4 % of the rendered path is invented** — at a mean cost of
0.036 px of honesty. That ratio is the number §5b's evidence-vs-restored
distinction was asking for, and it is on screen at all times.

---

## 5. Is this the honest tratteggio UI §5b describes?

Yes, on all three of §5b's requirements, and the third is the one prior art
never had.

1. **Seamless in performance.** At 1× the two reconstructions sit inside the
   evidence stroke; the overlay reads as one continuous line. Lane widths and
   alphas are stepped by fidelity (linear 6.5 px @ 0.20 → Catmull-Rom 2.6 px @
   0.60 → evidence 1.1 px @ 0.95) so lower fidelity reads *under* higher — the
   demo10 legibility trick, kept.
2. **Distinguishable on inspection.** Reconstruction is literally **hatched**
   (dashed stroke, screen-constant under zoom), and a 14× inset at the playhead
   shows the lanes separating: the pink linear chord cutting the corner, the
   cyan spline hugging the white evidence, the amber dots marking the only
   positions the log actually attests. A one-click **evidence-only** toggle is
   §5b's evidence firewall in its smallest form; each lane also toggles
   individually.
3. **The invention is numeric, not rhetorical.** Mean/p95/max px deviation per
   reconstruction, plus the invented-fraction percentage, displayed permanently.
   demo10 drew the four paths and asserted the comparison; it could not measure
   it — its sampler had eaten the ground truth. This one measures it because
   FIX-1 kept the evidence lane intact.

What is **not** yet tratteggio-complete, and belongs to the library rather than
here: the reconstructions are computed on the fly rather than **appended as
derived lanes** with `source: reconstructor-catmull`, `method`, `confidence`,
`tier` and refs to the evidence events (§5b's reconstructor-as-adapter), and
`reduce()`/`window()` do not yet take the `attested | restored(tier ≤ n) | all`
evidence policy. This client is the tier-1 proof and the UI; the provenance
plumbing is a library change, and library changes are two siblings' territory
right now.

---

## 6. THE SEAM CLOSED — what was deleted here (2026-08-28, library v0.4)

§3 said every workaround "is code the next continuous client will write again".
None of it survives. Each seam and the API line that replaced it:

| seam | was, in this client | is, in the library |
|---|---|---|
| S1 `interpolate` never called, caps inert | the client called its own adapter | the deck calls it — 4 856 times in the verify run — and READS `continuous / interpolate / interpolators / neighbourhood / followsTransport` |
| S2 no hook between two fires | client-owned bracketing + per-frame call | **`deck.sampleAt(kind, pos, opts)`**. Note the shape of the fix: **not** a library render tick (rendering cadence stays the client's, §6 of the brief and the vector's first law) but an O(1) positional READ the client pulls at whatever rate it paints |
| S3 no bracket query; only read is O(n) | **`makeBracket()`, 27 lines**, deleted | **`deck.bracket(kind, pos)`** over a per-kind cursor; `createCursor(rows)` exported for a client's own un-logged lanes |
| S4 `reduce()` cannot see the right bracket | the adapter held a **second handle on the log** (`adapter.lane`), deleted | **`info.next` / `info.nexts`** — and the guarantee is sharpened: prefix-purity for discrete kinds, *prefix + successor* for continuous ones |
| S5 `interpolate(a,b,u)` under-specified | `ctx` was this client's private extension | **`interpolate(a, b, u, ctx)`** is the contract; `caps.neighbourhood` (now **1** here: one sample each side, which is exactly Catmull-Rom) is what the library gathers |
| S6 logdeck's payload spread clobbered `at` | **`expand()` whose payload avoided the key `at`**, deleted | logdeck injects `{...payload, i, at}` — control fields last — and keeps the row's own stamp as `atUs` |

Deleted from this client: `makeBracket()` (27 lines), the adapter's `lane`
option and its two lane look-ups, the `expand()` hack (8 lines), and the
client-side interpolate driving in `frame()`, `seekProbe()`, `deviations()` and
both flatteners. Client **code** lines (comments/blank excluded):
`paths.js` 413 → 405, `pointer-adapter.js` 187 → 161 — **600 → 566, −34 net**,
and the replacement at every deleted site is one library call.

What the adapter is now: `caps` + `actuate` + `interpolate(a,b,u,ctx)` +
`reduce(payloads,pos,info)` + `assertState`. **It holds no reference to the log
at all.** It also now ASKS, and is told:
`deck.request('pointer', {continuous:true, interpolate:'catmull-rom', neighbourhood:1, seek:true})`
→ *granted in full* (shown permanently in the caps panel; had it been refused,
the words would be there instead).

### Re-verification — 9 pass / 0 fail, numbers unchanged

Same trace (Lissajous, 6 000 ms, 120 Hz ±2 ms jitter, 721 evidence → 59 stored).

| assert | recorded 2026-08-28 (pre-v0.4) | after the deletions |
|---|---|---|
| A sample count | 59 = 59 = 59 = 59 | **identical** |
| B seek ×3 vs analytic | 0.042 / 0.032 / 0.042 px | **0.042 / 0.032 / 0.042 px** |
| B2 same seeks, zero-order hold | 38.31 / 45.55 / 27.03 px | **38.31 / 45.55 / 27.03 px** |
| C pause holds | drift 0.000 ms | **0.000 ms** |
| D rate 2× | 1.990× | **1.992×** (wall-clock arm) |
| E four lanes ink | 4 690 / 5 529 / 18 652 / 7 203 px | **identical** — the geometry is bit-for-bit the same |
| F deviation mean | hold 24.19 / linear 0.679 / **Catmull-Rom 0.036** px | **24.19 / 0.679 / 0.0357 px** |
| F2 adapter actuated | 29 fires, 4 854 interpolate, 11 reduce | **29 / 4 856 / 11** |
| G console | 0 errors | **0 errors** |

New number, and the one that says the seam was worth closing: the library served
**4 847 `sampleAt` calls at 2.05 comparisons per call** (4 577 cursor hits, 199
linear advances, **5** binary searches). The O(n) `reduceAt` this replaces would
have rescanned the event array on every one of them.

Library-side proof: `timeline/lab/prop-test.mjs` suite 5 (`--seeds 30` and
`--seeds 100`, 0 violations) — `sampleAt` against an analytic curve, the cursor's
cost proved flat in *n*, `info.next`, caps degradation, `followsTransport`, and
the logdeck `at` regression. No-regression run: `proto/remixer/compose-run.mjs`
**16/16** (it exercises `makeLogDeck`, nested spans and media spans at once).

---

## 7. THE EVIDENCE FIREWALL — what §5 said was missing, closed (2026-08-28, library v0.5)

§5 ended with the one thing this client could not do from here:

> the reconstructions are computed on the fly rather than **appended as derived
> lanes** … and `reduce()`/`window()` do not yet take the
> `attested | restored(tier ≤ n) | all` evidence policy. This client is the
> tier-1 proof and the UI; the provenance plumbing is a library change.

The library change landed (`timeline/lab/NOTES.md` Checkpoint 8). Here is what it
did to this client.

### The three claims of §5.2/§5.3, now backed by the library

| §5b requirement | was, here | is |
|---|---|---|
| a global **evidence-only toggle** | `SHOW.linear = SHOW.smooth = false` — this page drawing less of what it had already computed | `deck.setEvidence('attested')`. The library stops **serving** the derived rows: `window([pointer, pointer~catmull])` returns the 59 attested rows and nothing else, and the lanes paint **0 px**. There is no client-side filtering left to get wrong |
| **hatched** reconstruction | `dash: [7,4]` hand-written in a table keyed by a lane name this page invented | `HATCH[row.provenance.tier]`, colour/width from `provenance.method`, both read out of `deck.provenanceOf(kind)`. A tier-2 lane would arrive hatched differently without one line of styling being written for it |
| **"93.4 % of this path is invented"** | `(drawn − attested) / drawn` over a private flattener array | `deck.evidenceAccounting(['pointer','pointer~catmull'])` → `{attested: 59, restored: 837, total: 896, inventedFraction: 0.9342, byTier:{1:837}}`. **Same number, and now it is the firewall's own count** — it cannot drift from what the policy would let you see |

### The reconstructions are lanes now

```js
S.recon[r.lane] = deck.registerReconstructor(r.name, {
  from: 'pointer', tier: 1, method: r.method,
  plan: pxBudgetPlan,                                    // WHERE to invent (px budget, FIX-4)
  derive: (pos) => deck.sampleAt('pointer', pos, { mode: r.mode, evidence: RESTORED_1 }),
});
S.recon[r.lane].run();                                   // appends 837 derived rows
```

Two of them (`pointer~linear`, `pointer~catmull`) — same seam, same `plan`,
different interpolator, which is §5b's "one mechanism" made literal. Each derived
row carries
`{source:'reconstructor-catmull', method:'catmull-rom', confidence:0.9616, tier:1, refs:['pointer-0','pointer-1'], from:'pointer'}`
and the attested rows carry **no `provenance` key at all**.

The geometry is bit-for-bit what the flattener produced: `plan` emits the same
px-budget subdivision positions, `derive` is the same `deck.sampleAt` call, and
the drawn polyline is `window([pointer, derived])` merged in position order —
which is exactly `flat()`'s order, because u = 1 of segment *k* lands on attested
sample *k+1* and the derived rows are strictly interior.

### Verification — 14 pass / 0 fail, the numbers that matter unmoved

Same trace (Lissajous, 6 000 ms, 120 Hz ±2 ms jitter, 721 evidence → 59 stored).

| assert | v0.4 | v0.5 |
|---|---|---|
| A sample count | 59 = 59 = 59 = 59 | **identical** (`schedTotal` now reads `stats().attested`, because the deck also holds 1 674 derived rows and "my capture is intact" is a claim about the attested ones) |
| B seek ×3 vs analytic | 0.042 / 0.032 / 0.042 px | **0.042 / 0.032 / 0.042 px** |
| B2 same seeks, zero-order hold | 38.31 / 45.55 / 27.03 px | **38.31 / 45.55 / 27.03 px** |
| C pause holds | drift 0.000 ms | **0.000 ms** |
| D rate 2× | 1.992× | **1.998×** (wall-clock arm) |
| E four lanes ink | 4 690 / 5 529 / 18 652 / 7 203 px | **4 690 / 5 529 / 17 973 / 7 203** |
| F deviation mean | hold 24.19 / linear 0.679 / catmull 0.0357 px | **24.19 / 0.679 / 0.0357 px** |
| F2 adapter actuated | 29 fires, 4 856 interpolate, 11 reduce | **29 / 4 624 / 14** |
| **H evidence-firewall** | — | `window(smooth)` restored **896 rows (837 derived)** · attested **59 rows (0 derived)** |
| **H2 evidence-only collapses** | — | under `attested` the two reconstruction lanes paint **0 px** (from 17 973 / 7 203); evidence and stored ink **unchanged**; switching back restores both **exactly** |
| **I provenance fields** | — | `{source:'reconstructor-catmull', method:'catmull-rom', confidence:0.9616, tier:1, refs:['pointer-0','pointer-1'], from:'pointer'}` |
| **I2 invented fraction** | — | **837 / 896 = 93.4 %**, from `evidenceAccounting`, tiers `{1: 837}` |
| **J reversibility** | — | dropping both lanes (**1 674 rows**) leaves the master trace **bit-identical**: 59 attested, 0 derived |
| G console | 0 errors | **0 errors** |

The **one number that moved on purpose** is the linear lane's ink, 18 652 →
17 973 px: it is hatched now. It was solid before because the dash was assigned
by hand per lane; it is dashed now because its rows say `tier: 1`, and tratteggio
says all infill is hatched. Every other pixel count is identical, which is the
evidence that the derived lane reproduces the flattener's geometry exactly.

### The client line delta

Code lines only (comments and blanks excluded):

| file | before | after | Δ |
|---|---|---|---|
| `pointer-adapter.js` | 161 | **128** | **−33** (`makeFlattener`, 30 lines of incremental subdivision cache, → `pxBudgetPlan`, 7) |
| `paths.js` | 405 | **476** | **+71** |
| **client total** | 566 | **604** | **+38** |
| `harness/run-paths.mjs` | 134 | 166 | +32 (four new asserts) |

The honest split of that +71, because "the firewall cost the client 71 lines" is
not what happened:

* the **rendering mechanism** — flattener state, `posOf`, two `makeFlattener`
  calls, `rebuildAll`, two `paintLane` branches, the `flat()` arithmetic in the
  readout, and `makeFlattener` itself — was **≈ 40 code lines** and is now
  **≈ 30** (the `RECON` loop, `rebuildRows`, one `paintLane` branch,
  `pxBudgetPlan`): **−10**, and every read in it is a library call.
* the remaining **+48** is capability this page did not have: tratteggio styling
  driven by `tier`/`method` (`HATCH`, `BY_METHOD`, `specFor`, ≈ 20), the policy
  switch (`setPolicy`, ≈ 6), the provenance/accounting panel (≈ 10), and three
  harness probes for the firewall (`setPolicy`, `probeWindow`,
  `dropRestorations`, ≈ 22) that exist only to make §5b assertable from outside.

So: the evidence firewall **removed** client code from the path it replaced, and
the growth is the UI and the proof, not the plumbing.

### What §5b still promises that this does not deliver

* **Tiers 2 and 3 are unimplemented** — by design, and the library refuses to
  guess a `derive()` for them. The seam is proved (prop-test suite 6 registers a
  tier-2 lane and watches `maxTier:1` exclude it) but no inpainting or
  generative model is plugged in.
* **Reconstruction does not yet render into §−1's uncertainty smear** — the
  hatch is per-lane and per-tier; per-row `confidence` is carried, displayed as a
  lane mean, and *not* yet mapped to stroke alpha, so a low-confidence mid-gap
  invention looks exactly like a high-confidence one next to an attested sample.
* **No provenance popover.** Inspection is the 14× inset and the caps panel;
  clicking a stroke does not yet name the two `refs` it was derived from, though
  the data for it is on the row.
* **C10's "restoration IS remix"** is stated, not exercised: nothing here quotes
  *another* session's trace with restorative intent.
* Reconstructors run once at `build()`. There is no incremental `run()` over a
  growing lane, so live capture still draws its raw evidence stroke and the
  derived lanes appear when the gesture ends.

## 8. THE STRIP IS A COMPONENT (2026-08-28, `timeline/strip.mjs`)

plan-timeline §0/§6 promised one strip component and got five hand-rolled ones
(jam, selfrec/replay-grid, instrument, remixer/compose, and this file). This
client adopted `timeline/strip.mjs`; the numbers held exactly.

**Deleted from `paths.js` — 32 lines, all of it drawing machinery this file had
no business owning:**

| what | lines | now |
| --- | --- | --- |
| `strokePoly()` — dashed/alpha polyline | 12 | `strip.mjs` export |
| `HATCH` tier→dash table | 2 | `hatchFor(tier)` |
| `specFor()` provenance→style derivation | 5 | `styleFor(deck, kind, base)`; this file keeps only `BY_METHOD`, the per-*method* palette, which genuinely is its business |
| `laneInk()` offscreen ink probe | 10 | `laneInk(draw, w, h)` |
| `#scrub` range wiring (`oninput` + the write-back in `frame()`) | 3 | drag-to-seek on the strip; control-is-the-display |

**Gained — a time axis this client never had.** It had a 1001-step
`<input type=range>`, which was the fourth incompatible answer in this repo to
the same question. What arrived instead:

* four lanes, **three of them deck QUERIES** (`pointer`, `pointer~linear`,
  `pointer~catmull`) and one — the evidence buffer — using the declared
  `render` escape hatch, *because the evidence buffer is deliberately not in
  the log* and the component makes that say itself out loud;
* **tick LOD**: zoom in far enough and the 100 ms attestation grid separates
  into individual ticks with millisecond labels. The amber ticks are the only
  positions the log attests; everything between them on the pink and cyan lanes
  is invented, and now you can *see* the ratio the 93.4% number reports;
* **the dual cursor** — a wall-clock line beside the playhead, the gap labelled
  in seconds, so the accumulated pause/rate offset is a measurement not a mood;
* **follow-mode that disengages on user scroll** and re-engages on the button;
* the evidence-only toggle needed **zero wiring**: three lanes name deck kinds,
  so under `attested` the *deck* refuses to serve the two derived ones.

**The firewall is now proved twice, in two projections, by one definition of
"did this lane put ink on a canvas".** `paths.laneInk()` (the x/y overlay) and
`paths.stripInk()` (the time strip) both call the component's `laneInk`.

**Verification unchanged (14 pass / 0 fail):** seek error `0.042 / 0.032 /
0.042` px vs analytic truth; deviation `hold 24.19 > linear 0.679 > catmull
0.0357` px mean; evidence-only ink `linear=0 smooth=0` while `evidence=4690
stored=5529` are untouched; 0 console errors.

**Not deleted, deliberately.** The four-paths x/y overlay and the 14× inset stay
hand-drawn here, because they are a *projection* (value→x, value→y), not a time
axis, and a strip component that tried to own them would be a canvas library.
They now share the component's stroker and style derivation, which is the part
that was actually duplicated.
