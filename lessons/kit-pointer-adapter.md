# Kit lessons: pointer-adapter.mjs

The long comments cut from `demo/shell/pointer-adapter.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-pointer-adapter.md#<anchor>`.

<a id="header"></a>

## pointer-adapter.mjs, file header and FIX-n list

demo/shell/pointer-adapter.mjs — the FIRST continuous-kind adapter for the

🔴 PROMOTED FROM proto/paths/, UNCHANGED BELOW THIS HEADER. It was finished
and measured and had never been given a page: hold 24.19 px mean error
against linear 0.679 and Catmull-Rom 0.036, and seek accuracy 0.042 px
interpolated against 38.31 px held — about 900x. `demo/draw/` is the page.

(was: the FIRST continuous-kind adapter for the timeline library — a
`pointer` kind with a real `interpolate`.)

Ported from ~/personal/time/public/demo10.html (four overlaid paths) and
~/personal/demo/pages/{draw,drag}.vue (150 ms throttle + Catmull-Rom), with
every defect written up in research/timeline-own-prior-art-2026-08.md §6/§2
deliberately NOT inherited. Each fix is marked FIX-n and cross-referenced in
NOTES.md:

  FIX-1  capture and decimation NEVER share a buffer (demo10's sampler did
         `realTimePoints.length = 0` — decimation consumed its own ground
         truth and invalidated the comparison). Two append-only lanes.
  FIX-2  wall-clock decimation, not frame-count (`frameCount % 5` breaks on
         120 Hz displays and throttled tabs).
  FIX-3  phantom (reflected) endpoints, so the FIRST and LAST segments
         survive (demo10 looped `i = 1 .. n-3` and silently dropped both).
  FIX-4  pixel-budget subdivision with INTEGER steps, not `t += 0.2`
         (fixed subdivision starves long segments, wastes work on short
         ones, and float accumulation never lands exactly on u = 1).
  FIX-5  incremental per-segment cache, not a per-frame recompute over an
         unbounded array.
  FIX-6  TIME-KNOTTED (non-uniform) Catmull-Rom. demo10's uniform form
         assumes evenly spaced samples; a wall-clock-throttled pointer lane
         is never evenly spaced, so uniform knots bend the curve toward
         whichever sample happened to arrive late.

Plain ESM, no deps, browser+node.

<a id="make-bracket"></a>

## pointer-adapter.mjs, makeBracket (deleted)

---------------------------------------------------------------------------
[DELETED 2026-08-28] `makeBracket(lane)` — 27 lines of client-side bracketing
cursor (binary search on seek, linear advance on play) that existed only
because the library exposed no positional read but the O(n) `reduceAt`. It is
now `deck.bracket(kind, pos)` / `deck.sampleAt(kind, pos)` in
timeline/transport.mjs (v0.4 C1/C2), riding a cursor the scheduler keeps per
kind. For a client's OWN un-logged lanes (here: the full-rate evidence lane,
which is ground truth and deliberately not in the log) the same cursor is
exported as `createCursor(rows)` — used, not re-written.
---------------------------------------------------------------------------

<a id="make-flattener"></a>

## pointer-adapter.mjs, makeFlattener (deleted)

---------------------------------------------------------------------------
[DELETED 2026-08-28, library v0.5] `makeFlattener(lane, interp)` — 44 lines of
client-side incremental flattening cache. It existed because the
reconstructions were computed ON THE FLY, per frame, into a private array the
library knew nothing about; §5b's answer is that a reconstruction is not a
rendering pass, it is a DERIVED LANE appended to the timeline with provenance.
So the cache is now `deck.registerReconstructor(...).run()` (append once) plus
`deck.window([evidence, derived], …, {evidence: policy})` (read back, in
position order, honestly filtered). What survives of the flattener is the only
part that was ever this client's business: WHERE to invent, in pixels.
---------------------------------------------------------------------------

<a id="px-budget-plan"></a>

## pointer-adapter.mjs, pxBudgetPlan

§5b `plan`: the positions a reconstructor should invent between two attested
samples. Arc-length budget with INTEGER steps (FIX-4) — fixed subdivision
starves long segments and wastes work on short ones. INTERIOR ONLY: the
endpoints are attested, and emitting a derived row on top of one would
double-count the evidence in the firewall's invented-fraction.

<a id="make-pointer-adapter"></a>

## pointer-adapter.mjs, makePointerAdapter

@param opts.mode   'catmull' | 'linear' | 'hold' — the reconstruction the
                  adapter uses when the caller does not name one.
@param opts.onActuate(sample, rec) — the attested fire (sparse).

[DELETED 2026-08-28] `opts.lane` — the adapter used to hold its own reference
to the log, because `interpolate` was handed two samples and `reduce` was
handed a prefix that structurally cannot contain the right-hand bracket. That
second handle on the log defeated "the library owns the log". It is gone: the
neighbourhood arrives in `interpolate`'s ctx and the successor arrives as
`info.next` (v0.4 C3/C4). This adapter now knows nothing but the samples it
is given.

<a id="rates"></a>

## pointer-adapter.mjs, caps.rates

--- transport capability declaration (plan-timeline C3) ---
⚠️ `rate: true` ON ITS OWN IS A CAPABILITY NO UI CAN OFFER. It says the
kind can be played at some speed and never which, and `transport-bar`
builds its buttons from the INTERSECTED `caps.rates` of the deck's
adapters — so a bar over this kind alone resolved its rate set to
`null` and drew no speed control at all, on an adapter that had
declared it supported one. A boolean that promises a feature and
withholds the values it needs is worse than not declaring it: the page
looks capable and the control is absent.

<a id="interpolate"></a>

## pointer-adapter.mjs, interpolate

The library's contract, v0.4: interpolate(a, b, u, ctx) with
ctx = {prev, next, pos, dtMs, prevs, nexts, …}. A C¹ spline is NOT a
function of two samples; the neighbourhood the adapter declared
(caps.neighbourhood = 1) is now handed to it. With NO neighbourhood at
all we still degrade honestly to linear and say so in `method`.

<a id="reduce"></a>

## pointer-adapter.mjs, reduce

reduce(prefix <= pos) for a CONTINUOUS kind. The interpolated version:
the state at t is the interpolation between the samples BRACKETING t,
not merely the last one before it.

`payloads` only ever contains events with at <= pos, so the RIGHT
bracket is by construction absent from the prefix — which is why the
library now supplies `info.next` (the successor) and `info.nexts` (1 +
caps.neighbourhood of them). The adapter no longer holds the log.
