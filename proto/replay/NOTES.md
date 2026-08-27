# proto/replay — NOTES

## 2026-08-28 · DoD-A: replay.html adopted onto `timeline/transport.mjs`

plan-studio §5 Session A names this page as the regression gate: *"replay.html
REFACTORED onto the lib and the existing measurement suite passes ≤100 ms p50 —
the lib is proven against already-green numbers before anything new is built on
it."* Done, both anchors, suite unchanged.

### 1. The old path measured FIRST (before a line was changed)

`scratchpad/old-path-probe.mjs` drove the shipped `src/timed-messages.js` page
through the same error math as `run-measure.mjs` plus four arms the suite has
no assert for. Result — **no correctness bug**:

| arm | result |
|---|---|
| A straight-through, 12 cues | err `59 42 56 71 53 69 49 65 37 62 41 60` → **p50 59 / p95 71**, engine lateness p50 **52 ms** |
| duplicate fires | none — each cue fired exactly once |
| forward seek 5 → 150 s (10 cues skipped) | **0 re-fires**, 10/10 caught-up (the replay-grid bug is NOT present here: rebuild-on-`seeked` + `onMissed` already handled it) |
| pause 4 s at ct 41.05 (cue due 41.89) | **0 fires while frozen**; fires on resume at err 56 ms (the engine is playhead-driven, not wall-driven — the instrument bug is not present either) |
| hidden tab | **could not be produced in headless** — page stays `visibilityState:"visible"` under both `page.bringToFront()` and browser-level `Target.activateTarget`, with and without Playwright's default anti-throttling args. Not measured; see the analytic note in §5 |

**But the fourth finding is real, and it is about the number itself.** The 12
per-cue errors came back **bit-identical to the 2026-08-26 run, two days and a
fresh browser later** (59, 42, 56, 71, 53, 69, 49, 65, 37, 62, 41, 60). A
100 ms polling engine cannot be that reproducible unless the poll phase is
locked — which it is: cues are spaced exactly 15.000 s = 150 poll periods, and
the engine is built a fixed number of frames after boot. So the headline
"p50 59 / p95 71" was **one deterministic phase sample, not a distribution**.
proto/archive already saw the other side of this (a locked worst-case phase
read **129 ms**, and it de-aliased its own run with fractional offsets). The
honest old-path spec was therefore *0–100 ms poll floor + frame quantization,
phase-dependent, worst case ~133 ms* against a 150 ms target — a page whose
real margin was ~11 %, presented as 60 %.

### 2. What replaced it

One deck, one adapter, ~30 lines of glue where a cue engine used to be:

```js
const cueAdapter = {
  caps: { kind:'cue', domain:'wall', unit:'ms', seekable:true, reducible:true,
          catchUp:'burst' },          // a cue is a note: never silently dropped
  actuate(p, rec) { deliver(p, rec); },        // = the page's render path
  reduce(payloads) { return new Set(payloads.map(p => p.id)); },   // fired set ≤ t
  assertState(set, info) { /* everything behind the playhead = caught-up */ },
};
deck = createDeck({ items: cues, range: [T0, T0+durMs], adapters: { cue: cueAdapter } });
deck.seek(T0 + vid.currentTime*1000);   // the FIRST fold == the late-join policy
deck.play();
```

- **Position domain = absolute wall ms** — a cue's `at` *is* its position, so
  there is no mapping layer at all (replay-grid's choice, reused).
- **The video element is the clock master**: an rAF loop calls
  `deck.sync(T0 + vid.currentTime*1000, {toleranceMs:10})`, with `timeupdate`
  (~4 Hz, survives a hidden tab) as the backstop. A stalled or paused master
  pauses the deck — cues can never run ahead of the picture.
- **A discontinuity is a seek, not a sync** (`JUMP_MS = 400`): syncing across a
  jump would leave every skipped cue `pending` and `catchUp:'burst'` would fire
  them all — the exact bug found in replay-grid. Routing jumps to `seek()`
  makes the library reconcile (behind → `passed`, ahead → `pending`) and re-fold.
- **Late join / seek is a FOLD, not a rebuild.** `assertState(firedSet ≤ pos)`
  replaces destroy-and-replay-the-log; `pastWindow` survives as the rule that
  downgrades a *burst-late* delivery (a real stall) to caught-up.
- Preserved verbatim: the URL contract (`src room token remote anchor t0
  startAt pastWindow fireDelayMs anchorN`), `window.__state` shape,
  `window.__seekTo`, the burned-row decoder + rVFC anchor derivation, the
  content-vs-stamp anchor choice, the overlay renderer. The subtitle and
  metadata TextTrack renderers from `src/timed-messages.js` ride along as
  `data.render: 'subtitle'|'metadata'` (opt-in per cue, default overlay
  unchanged). Cue revisions now compact **last-record-wins** in `loadCues()`
  instead of relying on engine `add()` order; cancels unchanged.

### 3. THE GATE — existing suite, unchanged, both anchors

No CF resources were created: the kept Stream VOD `de39bf19…` and the kept R2
proof show `shows/archive-test` were replayed as-is (`run-record.mjs` was NOT
re-run — it would mint a new VOD).

`node run-measure.mjs` (content anchor) — **11/11 checks PASS**

| cue | old err | new err | | cue | old err | new err |
|---|---|---|---|---|---|---|
| CUE-01 | 59 | **25** | | CUE-07 | 49 | **16** |
| CUE-02 | 42 | **9** | | CUE-08 | 65 | **31** |
| CUE-03 | 56 | **24** | | CUE-09 | 37 | **5** |
| CUE-04 | 71 | **6** | | CUE-10 | 62 | **−4** |
| CUE-05 | 53 | **21** | | CUE-11 | 41 | **8** |
| CUE-06 | 69 | **34** | | CUE-12 | 60 | **−6** |

**p50 16 ms / p95 34 ms** (was 59/71) · |err| p95 34 ms · range −6…34.
Engine lateness (`playhead − at` at the fire) **p50 5.5 ms, max 9 ms** — was
52 ms. Library drift (`intended vs actual instant`) 1–9 ms. Late join, forward
seek, backward seek, re-fire: all green, unchanged assertions.

`node ../archive/run-measure-archive.mjs` (native T₀, `anchor=stamp&t0=`, from
R2) — **7/7 checks PASS**: err `−7 −21 −7 −10 0 −4 11 1` → **p50 −4 ms / p95
11 ms, |err| p95 21 ms** (was 77/95). content−native anchor delta −15 ms,
unchanged; burn decode 5116/5116.

**DoD-A: PASS** — ≤100 ms p50 required, 16 ms delivered on the content anchor
and −4 ms on the native anchor, with every pre-existing check still green.

Two honest caveats on those numbers:
- **Negative errors are not early fires.** The engine's own lateness never went
  below 0 (0–9 ms). A negative `errMs` means the burned-clock frame drawn at the
  fire moment is the one *before* the cue's frame — i.e. the ground truth's own
  33 ms quantization now dominates the measurement. The engine is inside the
  frame grid; this harness cannot resolve better than ±1 frame.
- **The live-vs-replay asymmetry moved, as it should.** README §"Live-vs-replay"
  recorded replay − live = 0…1 ms for "now" cues and called the two delays
  "cancelling". They were: live transit (~50 ms) vs replay poll floor (~55 ms).
  With the poll floor gone, "now" cues now replay **32–34 ms EARLIER** than the
  live burn — replay honors operator intent, and `fireDelayMs` is the knob that
  buys the live feel back. Scheduled cues: 0…32 ms (were +33…+67).

### 4. Library seams hit (worked around in the client, NOT patched in the lib)

1. **No media-element master helper.** The sync/jump/stall/backstop block is
   now written twice with the same laws and different code (here and
   `proto/selfrec/replay-grid.html`). It wants to be
   `mediaMaster(deck, videoEl, {toleranceMs, jumpMs, stallMs})` in the library.
   **And the two copies do not agree**: replay-grid syncs unconditionally, with
   no jump→seek discrimination — so an external scrub of a tile element (or an
   hls.js recovery jump) would sync it across a discontinuity and burst every
   skipped cue. That is the *same* bug replay-grid's adoption originally fixed,
   re-openable through the sync path. Worth a look by whoever owns `timeline/`.
2. **`createDeck` has no initial position.** The transport starts at p0 = 0,
   rate 0, so a client in an absolute-wall-ms domain must `deck.seek(pos)`
   before `play()`. Harmless here — that first seek *is* the late-join fold —
   but it conflates "place the playhead" with "assert past state". A
   `createDeck({at})` (or `position`) option would separate them.
3. **No staleness policy.** "Deliver, but too late to animate" (the old
   `pastWindow`) is client code comparing `position − at`, even though the
   drift record already knows `deltaMs` and the origin. `caps.staleMs` →
   deliver as caught-up would remove the last piece of policy from the client.
4. Non-seams, confirmed working as documented: `caps.catchUp:'burst'` *plus*
   `reduce`/`assertState` is legal and does the right thing (burst while
   playing, fold on seek — `assertAt` iterates on reduce+assertState, not on
   the policy); `transport.sync()` returning the applied correction is enough
   to drive a HUD; `deck.stats()/audit()` gave the exactly-once evidence for
   free (`CUE-xx:fired:1`).

### 5. Not measured here (flagged, not claimed)

The old engine was a **main-thread `setInterval(100 ms)`**, so in a
backgrounded tab it inherits Chrome's 1 Hz clamp — `timeline/lab` arm BG
measured that host at **p95 980.7 ms hidden** vs the worker host's 8.5 ms. The
adopted page runs on the library's default **worker** tick host (confirmed
`host=worker`) and keeps a `timeupdate` sync backstop for exactly this case, so
the exposure is closed by construction. It could not be *demonstrated* here:
headless Chrome under Playwright never reported `hidden` (both
`page.bringToFront()` and browser-level `Target.activateTarget`, with and
without Playwright's default anti-throttling args). The lab's own BG arm — raw
CDP, its own Chrome — is the method that works.

### 6. Re-verified against the moving library

`timeline/transport.mjs` was edited (continuous-kind seams, +368 lines) ~4 min
after the gate finished. The adoption was re-smoked against that newer file:
late-join fold, `host=worker`, pause (0 fires while frozen, deck rate 0),
forward jump (0 re-fires, 10/10 caught up), CUE-03 err 24 ms / lateness 0.8 ms,
CUE-11 err 8 ms, `audit()` exactly-once — all identical. The seams this client
uses (`createDeck`, `registerAdapter` via `adapters:`, `sync`, `reduce` /
`assertState`, `seek`) are stable across that change.

### 7. Housekeeping

- `artifacts/replay-report.json` and `../archive/artifacts/archive-report.json`
  were overwritten by the gate runs (the pre-adoption copies are in git at
  `HEAD~`; the numbers are quoted above and in both READMEs).
- Ports: 8885 only (this rig's own). One headless Chrome at a time. No CF
  resources created; no `run-record.mjs` run; `timeline/` untouched.
