# plan-glass — the fourth clock owner

Status: **not started.** Written 2026-09-07, out of the `02 lanes` work, which
put three lanes on one page each measuring itself. This is the fourth, and it is
blocked behind a correction that reaches backwards through the whole project.

Read `plan-timeline.md` §7–§9 first for the lane taxonomy this extends.

---

## 0. One line

`requestVideoFrameCallback` is the only way to ask **when a frame reached the
glass**, which makes the compositor a fourth owner of the clock beside the JS
timer, the sound card and the MIDI port. Add it as a lane type — but **not
before** the one-frame rVFC bias already documented in `studio/NOTES.md` is
fixed and every content anchor re-measured in the same breath, because a glass
lane built on the current reading would inherit that bias and launder it into
a fifth place.

---

## 1. Why it is a lane TYPE and not another adapter

The taxonomy `02` now demonstrates is **who owns the clock at the last hop**:

| lane | mechanism | measured |
|---|---|---|
| bg worker | a timer wakes a worker, JS runs | +1.50 ms typical, +2.90 worst |
| sound card | handed a future instant, acts on it itself | **+0.01 ms typical, +0.04 worst** (1–2 samples @48 k) |
| MIDI out | handed a future instant, acts on it itself | no feedback; **≤ +0.40 ms**, derived from the round trip |
| MIDI in | reports when something arrived | +0.40 ms typical, +0.80 worst |

The glass belongs in the second column conceptually and the **fourth row
practically**, and that asymmetry is the whole design question:

- Audio and MIDI are **told** when to act. You hand them an instant and they
  honour it below JS.
- The compositor **cannot be told**. There is no "present this frame at time T"
  API on a `<video>`. It decides, and rVFC *reports* what it decided.

So a glass lane is a **capture lane, like MIDI in** — a record of what happened,
not a schedule. That has a concrete consequence for the library: it wants
`caps.capture`, an arrival log and a reduce, and it must NOT be modelled on
`createAudioLane`, whose whole shape is "commit ahead and cancel". Getting this
backwards would produce a lane that pretends to schedule something it cannot.

---

## 2. The blocker, precisely

`studio/NOTES.md` lines 179–193, quoted because it is exact:

> `replay.html`'s anchor pairs `decodeNow()`'s pixels — the frame **on the
> glass** — with `meta.mediaTime`, which is the PTS of the frame that will be
> shown at `expectedDisplayTime`, i.e. the **next** one.

The correct use is the **pair**, not the single value:

```js
mediaAtNow = mediaTime + (now - expectedDisplayTime) * rate     // seconds
// the one-line fix in onFrame:  mediaTime + (now - expectedDisplayTime) / 1000
```

**Consequence, and it reaches backwards:** every content-anchor number this
project has printed carries roughly one frame of bias — the studio engine's
−45.3 ms, the archive rig's −15 ms, DoD-A's native-anchor p50. The bias is
common to both rigs, so it does **not** explain the −45/−15 gap (the capture-side
lottery does), but it means none of those figures is the anchor's true value.

`proto/replay/replay.html` is the file. The instruction already recorded there
stands: **make the fix with the archive rig re-measured in the same breath**,
since every historical figure moves with it.

---

## 3. Phases

### P0 — fix the pair, re-measure the anchors (blocking)

1. `proto/replay/replay.html` `onFrame`: use the pair.
2. Re-run the archive rig and the studio anchor **in one session**, so the two
   numbers are comparable to each other and not to their own history.
3. Publish both new figures beside the old ones and mark every historical
   content-anchor number superseded — `SUMMARY.md`, `PROGRESS.md` and
   `HANDOFF.md` all carry the ⚠ warning today and all three need the correction.

**Done when** no document quotes a content anchor without saying which reading
produced it.

### P1 — `createGlassLane(transport, videoEl, opts)`

Shaped on the MIDI-in half of `02`, not on `createAudioLane`:

- subscribes with `video.requestVideoFrameCallback`
- records `{ presentedAt, mediaAtNow, expectedDisplayTime, presentationTime,
  processingDuration }` per frame
- exposes `scheduled()`-equivalent `presented()` and a drift channel in the
  transport's own domain, so it can sit in the same stats gutter as the others
- **cancellation is trivial** (unregister the callback) — unlike MIDI, nothing
  is queued downstream

Open API question to settle by measurement, not by reading: **which timestamp is
the lane's own clock** — `expectedDisplayTime` (what the compositor intends) or
`presentationTime` (when the frame was submitted). They answer different
questions and the project should pick one and say why.

### P2 — the demo

Extend **`15 seek`** rather than build a new page: it already drives video and
already has the transport bar and strip, and a fourth row there makes the point
without inventing a fixture. `14 replay` is the alternative.

The picture to aim for is `02`'s: one beat, several ways out, each row saying
how close it landed — with the glass row inevitably the coarsest, which is the
result, not a defect.

### P3 — what it unlocks

The MoQ and WHEP glass-to-glass numbers (p50 26.2 and 67.0 ms) were taken with
**burned pixels** — a wall clock rendered into the frame and read back. rVFC may
replace that rig with something cheaper and finer. **Do not assume it does.**
The burn measures the whole path including the display; rVFC stops at the
compositor's report. Prove they agree on one stream before retiring anything.

---

## 4. Traps, some already paid for

- **The pair-vs-single bias.** §2. This is the one that has already cost real
  numbers.
- **Vsync quantisation is the lane's resolution floor.** 16.7 ms at 60 Hz,
  8.3 ms at 120. A glass measurement that reports sub-millisecond precision is
  reporting something other than what it claims. Expect a frame-quantised
  distribution, and remember the studio anchor turned out to be exactly that —
  a ~95 ms-wide frame-quantised distribution, not a constant.
- **rVFC stops in a hidden tab**, like rAF, which the lab measured at
  **9,174.6 ms p95 hidden**. So a glass lane cannot be measured in a background
  tab, and — more importantly — it must never be given any transport
  responsibility, for exactly the reason the stop-at-end was moved out of
  `paint()`.
- **`Page.startScreencast` frame 0 is a stale re-capture stamped `now`** (20–36
  ms old; frames 1+ are 6–9 ms). Any harness comparing rVFC against a screencast
  must drop frame 0.
- **Safari/iOS support is unverified here.** Report the capability, do not infer
  it from an error string — the lesson `@moq/net` taught this project when a
  library's "not supported" turned out to mean "I will not".
- **`video.buffered` on MSE is the intersection of the source buffers.** Not
  this lane's problem directly, but any glass demo that also reasons about
  starvation will hit it.

---

## 5. Definition of done

1. No document quotes a content anchor produced by the unpaired reading.
2. `createGlassLane` exists, with the timestamp choice justified by a
   measurement rather than by a docs quote.
3. One demo shows the glass row beside at least two lanes that are not the
   glass, with each row's number being its own error, and the glass row's
   quantisation visible rather than averaged away.
4. The `verify.mjs` count moves by the number of asserts added and no other.
