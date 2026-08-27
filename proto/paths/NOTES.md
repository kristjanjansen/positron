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

`timeline/*` was not modified. Two siblings own it and proto/{replay,remixer,
instrument}; everything below that the library cannot do is worked around **in
this client** and reported here.

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
  neighbourhood: 2,            // samples of context each side interpolate() wants
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
