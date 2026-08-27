# proto/automation — the CONTINUOUS-CONTROL client (`cc` kind)

Port **8888**. `node server.mjs`, then `xy.html` and `automation.html`.
Verify: `node harness/run-automation.mjs` (one headless Chrome, two tabs).
Last run: **19/19 checks, 0 console errors** — `results/verify.json`,
`results/xy.png`, `results/automation.png`.

Owns: `proto/automation/*` and port 8888 only. `timeline/*` is imported as-is
(aliased at `/timeline/*` by the server, never copied); seams found in it are
reported at the bottom of this file, not patched.

`proto/paths/NOTES.md` did **not exist** when this was built, so the
continuous-kind adapter shape here was invented rather than reused. If the
pointer client has since landed a different one, `cc-core.js`'s
`makeCcAdapter` is the thing to reconcile — the shape it settled on is
`{caps:{continuous, interpolate, series, resolution, range, catchUp:'reduce',
captureThrottleMs, …}, actuate, reduce, assertState, interpolate}`.

---

## 1. Why continuous is a different kind, not a different payload

The discrete `midi` kind is **edge-valued**: note-on and note-off are two halves
of one object, and losing either wedges the instrument. The `cc` kind is
**level-valued**: every CC message is a complete statement of a controller's
value, last-writer-wins. Losing one is harmless the instant the next arrives —
unless it was the *last* one, in which case the filter is wrong forever.

Every decision in `cc-core.js` falls out of that asymmetry:

| | discrete `midi` | continuous `cc` |
|---|---|---|
| catch-up | `burst` — never silently drop a note | **`reduce`** — replaying 400 skipped sweep messages is pure waste |
| reducer state | held-note **set** | **map keyed by controller number** |
| seek | re-trigger what should be sounding | **restore the console** |
| capture | log every event | **throttle 100 ms**, interpolate at replay |
| loss repair | RTP-MIDI **recovery journal** (edges can't be reconstructed from state) | **full-state keyframe** (see §4) |
| interpolation | meaningless | the whole point |

## 2. `caps` and the reducer, concretely

```js
caps: {
  kind:'cc', domain:'wall', unit:'ms',
  continuous:true, interpolate:true,
  series: (p) => p.key,          // series identity WITHIN the kind — see seam S1
  resolution:14, range:[0,16383],
  catchUp:'reduce', seekable:true, reducible:true,
  assertOnSeek:true, interpolatedAssert:true,
  rates:[0.25,0.5,1,2,4],
  captureThrottleMs:100,
  captureNeverThrottle:[64,65,66,67,68,69,120..127],
  captureEndpointRule:'always-log-last-sample-of-gesture',
  msbZerosLsb:false,             // interop honesty, see §3
  repair:'keyframe', keyframeMs:500,
  panic:[120,123,121],
}
```

`reduce(prefix ≤ t)` = **the last value per controller number**, folded onto a
`Map`. Key space: `cc:<ch>:<coarse n>` and `pb:<ch>`, where *coarse* folds the
MIDI fine/coarse pair (CC *n* and CC *n*+32 are one controller, not two) so the
fold restores a coherent 14-bit value instead of half of one.

`assertState(map)` = **CC 121 (reset all controllers) per channel, then re-state
every entry**, MSB before LSB. The reset is what makes seek *absolute*: without
it you land on "the fold, plus whatever the previous playhead position left
behind on controllers the prefix never touched".

Not every series inside the continuous kind is continuous. **Switches are STEP
series** — sustain down at 1.5 s and up at 3.0 s does not mean "half pressed"
at 2.2 s. `isInterpolableKey()` excludes CC 64–69 and 120–127 from both
`interpolate()` and the interpolated assert. This was caught by the smoke test,
not by theory, and it is the first thing any other continuous kind will hit.

## 3. Wire form — the CC variant of the 16-byte frame

Byte-identical to `proto/jam/jam-core.js`'s note frame, read through a different
lens. jam calls bytes 1–2 `note`/`vel`; they are MIDI **data1/data2**:

```
u8 status | u8 d1 | u8 d2 | u8 src | u32 seq (LE) | f64 tUs (LE)     = 16 B
  0xB0|ch   ctrl    value                                              CC
  0xE0|ch   lsb     msb                                                pitch bend
```

Byte 0 discriminates. One frame size, one parser, and a receiver that has never
heard of the `cc` kind still forwards three valid MIDI bytes to a synth (C7's
unknown-kind round-trip). Nothing derived is transmitted: `{key, label, form,
value14}` are computed at the receiver from the raw bytes.

**14-bit CC is genuinely two messages on the wire** (MSB = CC *n*, LSB = CC
*n*+32, in that order) and `enc14()` returns both — raw bytes travel verbatim,
so the 14-bit-ness lives in the *reducer's key space*, not in a widened frame.
**Pitch bend is one message** carrying both halves, LSB in data1, centre 8192.

*Interop note, declared in caps:* strict MIDI receivers zero the LSB when an MSB
arrives alone. This reducer folds `msb` and `lsb` independently
(`msbZerosLsb:false`), because our encoder always emits the pair back-to-back
and independent folding is what makes `reduce(prefix)` reproduce `play(0→t)`
exactly. A hardware bridge that needs strict behaviour flips the flag.

## 4. Stuck-state guard: keyframe, not journal — and why

RTP-MIDI (RFC 6295) attaches a **recovery journal** to every packet because
notes are edge-valued: no amount of "current state" recreates an attack you
missed, so the journal has to describe undelivered *edges*.

CC is level-valued, so **the journal and the keyframe are the same object** —
and the keyframe strictly dominates:

- it needs no per-receiver ack bookkeeping and no journal trimming;
- it is idempotent, so it can be sent blind on a cadence;
- it repairs a receiver that **joined late** as well as one that dropped a
  packet — a journal only does the latter;
- it is small: 128 controllers × 16 channels is a 2 KB worst case, and a real
  performance touches 3–6 of them (the verify run: 4–5).

Implementation: every frame already carries `seq` (gap detection); the sender
emits a keyframe every **500 ms** and at **every gesture end**; every keyframe
carries a 4-byte **FNV-1a digest** over the sorted `(key, value14)` pairs so a
receiver can detect divergence between keyframes instead of being blind. Verify
run produced 18 keyframes over an 8 s gesture.

The `cc` panic set is **CC 120 + 123 + 121**: `proto/instrument` already sends
120/123 (all-sound-off, all-notes-off) plus an explicit sustain-off because
CC 123 is undone by a held pedal. **121 is the continuous half of that same
panic** and is currently missing there — see §7.

## 5. Capture discipline

A knob sweep emits 100–400 msg/s. The gate:

1. **Wall-clock throttle, ~100 ms, per controller key.** Never frame-count
   decimation — `frameCount % 10` dies on 120 Hz displays and throttled tabs
   (own-prior-art §6).
2. **The last sample of a gesture is always logged** (`flush()`), at its own
   original timestamp. Drop it and every replay undershoots the endpoint the
   performer actually reached.
3. **Switches are never throttled.**
4. A **14-bit pair passes the gate as one decision**, so the MSB can never be
   logged without its LSB.
5. The **full-rate evidence lane is a separate buffer**, not a view of the
   decimated one — demo10's destructive sampler invalidated its own comparison
   by consuming the ground truth.

Measured on the verify gesture (8 s, 5 ms steps, 4 controllers + a switch):
**6408 raw samples → 409 logged rows, 15.7:1**, and the reconstruction error
against the evidence lane is:

| controller | mean | p95 | max | max % of range |
|---|---|---|---|---|
| CC74 cutoff (7-bit) | 45 | 108.8 | 172.8 | 1.05 % |
| CC71 resonance (7-bit) | 57 | 140.8 | 204.8 | 1.25 % |
| CC1 mod wheel (14-bit) | 15.9 | 34.5 | 37.3 | 0.23 % |
| pitch bend (14-bit) | 10.2 | 22.4 | 24.0 | 0.15 % |
| CC64 sustain (switch) | 0 | 0 | 0 | 0 % |

(units are 14-bit LSBs of 16383; the 7-bit rows carry a 128-LSB quantisation
floor of their own, which is most of their number.)

## 6. `automation.html` — the 2025 experiment, completed

`slider-video.vue` was the **final commit of the demo repo**: an automation lane
bound to a media clip by `clipId`. It died of exactly one thing —

> **the missing `transportPosition ↔ mediaCurrentTime ↔ pixel` mapping.**
> Absolute epoch ms had to be projected onto a foreign media element's
> normalized position and there was no position domain in between. The slider
> knew where it was on screen; the video knew where it was inside itself;
> nothing converted. Gen-1's `onProgress(progress, currentTime)` channel had
> supplied half of it and had been **deleted as "noise"** two generations
> earlier (own-prior-art §1.6).

Both halves exist in the library now, and the page names all four mappings in
one place because their absence is the whole reason the experiment is a corpse:

```js
posToMedia  = (pos) => (pos - LEAD_IN) / 1000        // position ms  -> media s
mediaToPos  = (ct)  => LEAD_IN + ct * 1000           // media s      -> position ms
epochToPos  = makeLogDeck's toPos                    // epoch µs     -> position ms
posToPx     = strip.xOf                              // position ms  -> pixels
```

`LEAD_IN` is 500 ms on purpose: the clip does **not** start at position 0, so
the mapping is a real offset and not an accidental identity.

Two lanes on one deck: a `media` **span** lane (start/end pair via logdeck's
`expand`, carrying `clipId`) whose actuator owns the element, and the `cc`
automation lane. Mastering is explicitly two-directional:

- **media is clock master while it plays** — a rAF loop reads `currentTime` and
  calls `transport.sync(pos, {toleranceMs:8})`, which re-anchors `{p0,t0}` with
  *no* seek semantics, so a 6 ms media wobble does not re-fire the lane;
- **transport is master while you scrub** — `seek()` → `assertState` →
  `currentTime`, with a 220 ms lock so the element settles before it re-masters;
- the **threshold between them is a client policy**, not a library one:
  `|Δ| > 250 ms` is a jump (seek, re-assert), below that it is drift (sync).
  See seam S5.

The media clock is read **edge-extrapolated**, not sampled raw:
`HTMLMediaElement.currentTime` only advances at its own granularity, so a naive
per-frame comparison measures that granularity and calls it drift. Tracking the
edges and extrapolating between them is `proto/instrument`'s ct→epoch map in
miniature.

**Measured drift across a 5-target scrub sequence while playing:**
`|max| 9.09 ms, p95 6.19 ms` over 446 samples, 2 sync corrections; post-scrub
settle `|max| 5.31 ms`. The control value under the playhead tracked the
analytic curve to `max 0.71 of 127`.

Default media is a generated 20 s WAV (its own internal clock is the only
property the demo needs from it, so it carries no binary asset).
`?media=/media/a1-concat.webm` swaps in a real file on the identical code path.

## 7. Folding this into the remote instrument (`proto/instrument` — NOT edited)

A sibling owns that directory. What this would take, file by file:

**`proto/instrument/instrument-core.js`**
- Import or vendor the `cc` half of `cc-core.js`: `keyOf/COARSE/enc14/encPB/
  dec14/foldRows/assertBytes/ccDigest/keyframe`. `isRealtime` already filters
  0xF8/0xFA/0xFC/0xFE, which is the right pre-log allowlist for CC too.
- **Add `RESET_ALL_CONTROLLERS = 121` beside the existing `ALL_SOUND_OFF = 120`
  / `ALL_NOTES_OFF = 123`, and extend `allNotesOffBytes()` into a full panic:**
  per channel `[0xB0|ch,120,0], [0xB0|ch,123,0], [0xB0|ch,121,0], [0xB0|ch,64,0]`.
  The existing explicit sustain-off stays — 121 resets *modulation, expression,
  pedals and bend* but is vendor-dependent for everything else, so the belt-and-
  braces CC 64 line is still load-bearing, not redundant.
- `makeSynthVoice` gains a filter/gain the CC lane can drive (or reuse
  `makeCcVoice`), so the synthetic stand-in has a console to restore.

**The frame** — `buildBin`/`parseBin` in `proto/jam/jam-core.js` (and the copy
the instrument uses): **no layout change**, only a rename and a discriminator.
`note`/`vel` become `d1`/`d2`; `parseBin` switches on `status & 0xF0` to attach
the derived view. Existing note frames are byte-identical, so recorded shows
stay readable. This is the cheapest possible fold — deliberately.

**`host.js` / `play.js`**
- Register a second adapter beside the `midi` one: `sched.registerAdapter('cc',
  makeCcAdapter({send: output.send.bind(output) | voice.send}))`.
- Route incoming CC/bend frames to it; keep the **local-monitor-at-0 ms, log by
  sender stamp** split (a knob must not travel to the relay and back before it
  is heard).
- Apply the capture throttle **before** the DataChannel, not after: this is the
  MIDI-clock-flood cousin and the reason a mod-wheel sweep would otherwise cost
  ~15× its useful bandwidth.
- On a lost-frame `seq` gap, wait for the next keyframe rather than requesting a
  retransmit — the keyframe is already in flight every 500 ms.

**Safety additions**
- Panic must send **CC 121 alongside 120/123**, on the actuator side *and* on
  socket close / peer drop: a stuck note is loud and obvious, a stuck filter is
  silent and permanent.
- `assertState` after every seek is already the pattern; the CC map makes it
  necessary rather than merely tidy.

**Storage — does the two-lane model need anything new for CC rows?**
No new store, no schema break. The `cc` rows are the same flat log shape
(`{at µs, status, d1, d2, src, seq}`), so they are a **third lane on the same
`makeLogDeck` call**, exactly as the instrument's two note lanes + media lane
already are. Three additions, all additive:
1. a `kind:'cc'` lane per source (per-source `seq` is already there);
2. keyframes stored **out of band** as a sidecar, like media blobs — they are
   derived state, not events, and writing them into the event log would
   double-count on replay (`reduce` would fold them as if performed);
3. the throttled log and the full-rate evidence lane are **separate rows or
   separate files** if the evidence is kept at all — never one lane that the
   reader has to de-duplicate.

---

## 8. Library seams (`timeline/*`, unpatched by me)

`timeline/transport.mjs` and `logdeck.mjs` were **rewritten by a sibling while
this client was being built** and now carry real continuous-kind support (C4
successors, `sampleAt`/`bracketAt` with an O(1) cursor, `caps.continuous /
interpolate / interpolators / neighbourhood`, and a `request()` honest-
degradation API). Everything below is re-checked against that version — the
final 20/20 run is against it.

### Solved since this client started

**S2 — `reduce` could not land on the line. SOLVED (C4).** The truthful state of
a continuous series at `t` needs the knot *after* `t`, which is by construction
absent from the prefix. `applyReduce` now supplies `info.next` and `info.nexts`
(1 + `caps.neighbourhood` successors). Measured cost of *not* having it, at
three seek positions:

| seek | knot-only error vs the analytic curve | interpolated assert |
|---|---|---|
| 1234 ms | max **1152** LSB (7.03 %) | max **128** LSB (0.78 %) |
| 5678 ms | max **512** LSB (3.13 %) | max **9** LSB (0.05 %) |
| 3210 ms | max **1408** LSB (8.59 %) | max **21** LSB (0.13 %) |

**~50–150× better.** This adapter now takes the successor from `info.nexts` and
keeps the client-side series index only as a fallback: **16/16 interpolated
asserts were served by the library**, 0 fell back. The seam is closed.

**S3 — `payload.at` shadowed the item's position. SOLVED.** `makeLogDeck` now
spreads the row **first** and injects `i, at` after, and preserves the row's
epoch stamp as `atUs`. (The same ordering law is applied to `sampleAt`'s ctx
object.) Worth recording that this was a live foot-gun for every log client, not
only continuous ones.

### Still open

**S1 — no series identity within a kind (partially worked around).** The library
treats a `kind` as one homogeneous stream, but a continuous kind is N
interleaved series — here 5 controllers on one `cc` lane. Both the cursor's
`bracketAt` and C4's `info.nexts` group by **kind**, not by series, so:

- `interpolate(a,b,u)` still has to defend itself by comparing keys and
  returning `null` for a mismatched pair — otherwise it ramps CC74 into CC71;
- the successor channel only works because this adapter **over-asks**:
  `caps.neighbourhood = 8` to be reasonably sure a successor of *this*
  controller is among the returned events. 8 is a guess sized by eye against 5
  series. With 12 controllers and an unlucky interleave it silently degrades to
  the last-knot fold — and degrades *quietly*, which is the part that matters;
- `sampleAt(kind, pos)` is unusable for a multi-series kind for the same reason.

`caps.series(payload) -> string` is already declared by this adapter and simply
not read. Wanted: the library groups by it before bracketing, and
`neighbourhood` then means "samples each side **of this series**" — which is
what an interpolator actually needs, and removes the guess.

**S4 — the overdub law is wrong for level-valued kinds.** `schedule()` fires an
event at or behind the playhead immediately (steal #11). That is exactly right
for a note — you hear what you just played — and exactly wrong for a level: a
curve authored *in the past* must not move the *current* value. The automation
lane works around it by calling `deck.assertAt(position, 'cc')` after every
pencil stroke. Wanted: `caps.overdubFires: 'immediate' | 'never' | 'reassert'`,
defaulting to today's behaviour.

**S5 — no sync-vs-seek threshold policy for an external clock master.**
`transport.sync()` (drift, no re-assert) and `transport.seek()` (jump,
re-assert) are both correct and the library gives no guidance on which to use
when. A media master needs *both* and the crossover — here 250 ms — is a client
constant. Wanted: `sync(pos, {toleranceMs, seekThresholdMs})` that escalates to
seek semantics by itself, so every media client does not re-derive it.

**S6 — `caps` is not serialisable.** `caps.series` is a function, so
`JSON.stringify(deck.caps())` silently drops it. Harnesses and HUDs that
introspect caps over CDP or a wire get a lossy view. Minor, but caps is
advertised as a declaration and `request()` now makes it load-bearing.

Confirmed working as documented, no seam needed: `catchUp:'reduce'` with the
whole-ordered-prefix guarantee (library fold === an independent node-side fold,
error **0**, at all three seek positions); C4's `info.nexts`; `sync()`'s
tolerance gate; `setRate()` not starting playback; `assertOnSeek`; `expand()`
for media spans; the overdub law (as a law — see S4 for the level-valued case).
