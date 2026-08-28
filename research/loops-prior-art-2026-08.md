# Loops in the lineage — what the wrap point already cost (2026-08-28)

Mined from elektronstudio v1–v4, tracker, wakeup-synth, the relay, and this repo.
Companion to `plan-timeline.md` §8. Marks: ✅ read here · 📄 documented · ⚠️ inferred.

## THE HEADLINE: the wrap is not an event, it is the absence of one
✅ tracker schedules every loop as
`pos = (((beat − lp.startBeat) % lp.len) + lp.len) % lp.len` and has **no wrap
handler at all** — nothing is reset, re-armed, silenced or faded at `pos === 0`.
Position is a pure function of the parent clock. §8.2's modulo IS the whole
implementation; `loop-wrap` should be **opt-in per `caps`**, not a boundary every
adapter must handle. tracker deliberately rings notes ≥1.6 s ACROSS the wrap
(`Math.max(1.6, e.durBeats * secPerBeat)`) and that is correct there, because a
fire-and-forget envelope has no held state to leak.

## RE-SEEK, NOT RE-FIRE — three independent proofs
1. tracker has no re-fire operation to have.
2. `time/timeline-emitter.js` puts `played: true` ON THE EVENT, so a second pass
   needs `events.forEach(e => e.played = false)` by hand (`demo12.html:146`).
   **Mutable per-event cursor state in the log makes a loop structurally
   unbuildable** — the strongest argument in the mine.
3. `proto/remixer` already replaced N×`play()` with one `deck.seek(0); play()`
   and the comment says why: the layers "stay together afterwards instead of
   only starting together".

## Inherit
- **Quantize the container, never the content**: tracker floors `startBeat` and
  rounds `len` to whole beats while each event's `beat` stays fractional — the
  take's sub-beat feel survives, only the box snaps.
- **Retrigger = rewrite the origin** (`relaunch()` is one line:
  `startBeat = Math.floor(nowBeatFloat())`) — but it **races the 100 ms
  lookahead**, so the first beat after a re-base can drop or double. Relaunch =
  re-seek PLUS an explicit flush of pending.
- **Two schools of phase origin, and the plan names only one.** tracker: origin
  = first real event, "any beat can be beat 0". `proto/jam/jam-core.js`:
  **epoch-anchored** — "the beat boundary is a property of the wall clock, not
  of either peer", giving N clients shared phase with zero negotiation. A
  multi-client loop needs the second; `at` should accept an absolute stamp OR
  "align to the shared grid".
- **Abort-if-empty generalises** — it appears twice independently (tracker's
  `rec.events.length === 0`; v2's all-black-frame guard
  `buffer.some(c => c !== 0)`, which leaked often enough to need a second
  cosmetic filter downstream). A repetition asserting nothing should not be
  emitted, and the guard belongs at the emitter.
- **Store (§8.7 q3) is friendlier than feared**: a loop re-seeks a FIXED
  fragment, so the resident set is constant regardless of repeat count — an
  infinite loop pins one fragment's pages, never the log. Constraint: the loop
  must resolve to a bounded window query, never a full scan (tracker scans every
  event of every loop every beat, survivable only because its loops are tiny).
- **`repeat: n` needs the cancel-flush contract or it lies.** No count and no
  duration exist anywhere in the mine — `repeat` was only ever infinite. The one
  hard datum about stopping: it left a ~1.6 s audio tail because committed
  events had no cancel path. Without per-adapter cancel, `repeat: 4` sounds like
  "four and a bit".
- **Hard cut. Zero `crossfade` hits org-wide.** The only blend is
  `Tone.GrainPlayer`'s `overlap` (v2 Synth.vue / wakeup-synth) — granular
  overlap-add, a property of the **source**, which is why a `playbackRate: 0.1`
  reversed drum loop has no click. That is exactly §8.7's "declare a crossfade
  as a reconstruction": declare it on the adapter, not the timeline.

## Avoid
- **Index-based cycling.** v4's `frames[currentFrame % frames.length]` throws
  away the `timestamp` its own capture recorded and **re-phases whenever the set
  changes size**. Loop over the log's stamps, never over a counter.
- **Per-event `played` flags** (above).
- **Frame-count modulo as a rate** — `frameCount % 10` is already in the
  negative-results ledger (breaks at 120 Hz and under throttling).
- **`loop` as stall recovery.** The attribute sits on LIVE HLS elements in four
  repos doing nothing; real recovery is the `seekable.end(0)` watchdog + full
  source reload. Don't let `repeat` acquire an implicit "restart on failure"
  meaning — that is `absence`, already a separate concept.

## The wrap-artefact catalogue (every row earned by a measured failure)
**Transport splices** (rig/relay/README.md): torn TS packet → permanent gray
(forward whole 188-byte packets) · mid-GOP join → gray until IDR (gate on RAI) ·
backward PTS jump → discontinuity storm → CF drops the session (per-leg
`-output_ts_offset`) · starved-but-open socket blocked switching **17 minutes**
(select + 2 s starvation trigger) · wall-clock offsets jumped **~1000 s** after
starvation (track the last **PCR delivered**, not the clock) · truncated audio
PES → mux death (`+discardcorrupt`) · warm-up mistaken for starvation (6 s
grace) · dead camera retried forever (bench it).
**Beat wraps**: a note played inside trigger latency folds to beat 0 · a note
held across the arm boundary wraps to the wrong END (head.html buffers on
note-OFF) · notes ring across the wrap by design · stopping leaves a scheduled
tail · relaunch races the lookahead · tab-blur burst is unbounded under an
infinite loop.
**Frame wraps**: phase jump when the frame set changes size · all-black frame at
camera start (guarded twice) · frame-count decimation breaks at 120 Hz.

## Notable: the relay's answer to "a source that must never end"
✅ **There is no `-stream_loop` anywhere in the repo.** The slate is an
infinitely *generated* lavfi source, not a repeated asset — GENERATE, DO NOT
REPEAT, because every wrap in that pipeline cost a defect. The renderer's
refusal of an unbounded loop has the same shape.
