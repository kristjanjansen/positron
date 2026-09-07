# plan-take — a recording you can scrub

Status: **not started.** Written 2026-09-07, out of the 01–05 rework. Proposed
slug **`take`**, Act 3 (*capture and return*), first row of that act.

Read `plan-glass.md` §2 before quoting any number this demo produces, and
`plan-score.md` §4b for what a media part is once it enters the container.

---

## 0. One line

Record a few seconds from the camera and put the result on a timeline you can
scrub — the simplest possible instance of *capture and return*, and the one
place where the cost of turning a recording into a seekable thing is the
subject rather than an obstacle.

`capture` already does camera → segments → R2 → deck. This is the other half:
not the pipeline, the **artefact**, and what it costs to make it scrubbable.

---

## 1. The decision everything follows from

**The picture is the clock. The deck bends to it.**

This is not open, and `timeline/media-master.mjs` exists because three clients
answered it three different ways and diverged:

> **L1. THE MASTER IS NEVER NUDGED.** Its rate and its `currentTime` are read,
> never written. The picture is the ground truth; the vector is what bends.

So the demo uses `mediaMaster(deck, video, …)` and **never writes
`video.currentTime` from the deck**. The temptation runs the other way — a
transport bar looks like it should drive the video — and giving in to it
inverts the master and reopens the burst-every-skipped-cue bug that
`replay-grid`'s hand-rolled copy had.

But note the demo has **two phases with two different clocks**, and conflating
them is the first thing that will go wrong:

| phase | clock | why |
|---|---|---|
| recording | the wall clock | there is no element to master; there is no playable file yet |
| playing back | the `<video>` | L1 — the picture is the ground truth |

Nothing masters during recording. The recorder's own events (`dataavailable`,
`start`, `stop`) are stamped **at source**, per the lineage law, and become rows
on a lane. The deck for playback does not exist until the take does.

---

## 2. `duration: Infinity`, and how it becomes a measurement

`CLAUDE.md` records the trap:

> **MediaRecorder output reports `duration: Infinity`**, which leaves a
> transport bar with no range to scrub. Seek far past the end, let the browser
> resolve the duration, then come back.

`capture`'s `assemble()` already implements the workaround (`currentTime = 1e6`,
wait for `timeupdate`, come back). What it does **not** do is make the problem
visible, and here it should, because the transport bar's whole seekability test
is `Number.isFinite(deck.durationMs) && deck.durationMs > 0`.

**The plan: build the deck immediately with the range we already know, then
correct it.**

1. On stop, we know how long we recorded — wall clock, `stop − start`. Create
   the deck with that range at once, so the timeline exists the moment the take
   does.
2. Resolve the file's real duration by the known dance.
3. `deck.setRange([0, fileDurationMs])`. The range is not fixed at construction
   (v0.5), `deck.range` stays one stable reference, and `rangeGen()` moves — and
   the transport bar already re-derives on `rangeGen`, so this costs the bar
   nothing.
4. **Report the difference.** *"recorded 4.00 s, the file says 4.03 s"* is a real
   number the page observed, and it is the `Infinity` trap turned into
   something a reader can see rather than a workaround buried in a helper.

**Done when** the transport bar is seekable within one frame of the take
finishing, and the correction — if any — is on screen rather than swallowed.

---

## 3. What it can honestly measure

Every demo in 01–05 reports a real number about itself. This one can observe
four, and must not pretend to a fifth.

| number | how it is observed | honest? |
|---|---|---|
| **segment cadence** | `dataavailable` inter-arrival against the requested timeslice | yes — both sides are ours |
| **recorded vs file duration** | wall clock at stop, against the resolved `video.duration` | yes — §2 |
| **seek: asked vs got** | the position requested, against `video.currentTime` once `seeked` fires | yes — and it is `plan-score` §4b's *"`in` is a request, not a fact"* made visible |
| **sync corrections** | `mediaMaster.stats()` — `syncs`, `corrections`, `jumps`, `lastCorrectionMs` | yes — `replay-grid` measured 1169 syncs with 0 corrections over tolerance |

### What it cannot measure, and must not print

- **Capture-to-available latency.** MediaRecorder gives no capture timestamp per
  chunk, so "how old is this blob's oldest frame" is not observable from the
  API. What *is* observable is the delay between `stop()` and the final
  `dataavailable`, which is a different quantity and must be labelled as one.
- **Any content anchor.** "The wall-clock instant this frame was captured,
  against timeline zero" is exactly the number `plan-glass.md` P0 blocks:

  > every content-anchor number this project has printed carries roughly one
  > frame of bias — the studio engine's −45.3 ms, the archive rig's −15 ms,
  > DoD-A's native-anchor p50.

  **This demo prints no anchor.** If it later wants one it inherits the bias and
  waits for `plan-glass` P0, and the page should say so where a reader would
  otherwise expect the figure — the same way `02` says a lane cannot report
  rather than showing it a zero.

**Done when** every number on the page is one the page observed, and the two it
cannot observe are named as absent rather than quietly missing.

---

## 4. Phases

### P1 — a take exists

Camera → `MediaRecorder` → blob → `<video>`. One primary control, because
`getUserMedia` genuinely needs a gesture and `armVideo` has to spend the
activation before any `await` (the measured iOS failure: WHEP negotiated in
1952 ms, then `play refused: NotAllowedError`, with the connection healthy
behind a black box).

A **fixed short length** — 4 s — so the harness is bounded and the page has an
end. `capture` uses 6 s for the same reason.

**Done when** pressing once yields a playable take, and refusing the camera
says so in words rather than leaving a black rectangle.

### P2 — the take on a timeline

`createDeck` + `mediaMaster` + `createTransportBar(…, { scrub: false })` +
`createStripView(…, { size: 'auto' })`. The strip is the position surface; the
bar keeps play/pause, the clock and the rates.

Rate lattice: `caps.rates` for a media part is **much shorter** than a note
lane's — `plan-score` §4b says so, and a `<video>` at 0.25× is a decoder
question, not arithmetic. Declare only what the element will honour; the bar
now reads the live registry and shows exactly the lattice declared.

**Done when** dragging the strip moves the picture, and the picture — not the
bar — is what the playhead follows.

### P3 — the lanes, and the numbers under them

Two lanes, in the 01–05 idiom:

- **`chunks`** — one mark per `dataavailable`, coloured by how close its arrival
  was to the requested timeslice. Colour means **how it landed**, never which
  lane. Gutter carries typical and worst.
- **`seeks`** — one mark per seek performed, coloured by asked-vs-got. Empty
  until you scrub, and saying so.

`showReadout: false`; the numbers live under the lane that owns them. Tooltips
of two or three short lines. No `?? 0` — a null duration renders as `—`, never
as a confident zero, which is the bug found three times in one day.

**Done when** the gutter numbers move when you scrub and nothing on the page is
a constant dressed as a measurement.

### P4 — the seek is a request

Scrub to a position; report what the element actually gave you. With a 2.0 s GOP
only one part per segment is `INDEPENDENT` (10 of 38 measured), so the landing
point is keyframe-granular and the difference is the demo's most transferable
lesson — it is the same fact `plan-score` §4b needs for media parts and
`19 flipper` already lives with.

**Done when** the page shows a seek that asked for one instant and got another,
with the gap named, and does not treat that as a failure.

---

## 5. Traps, most already paid for

- **Never write `video.currentTime` from the deck.** §1, L1. The seek command
  goes through the element in the client; `mediaMaster` observes.
- **A seeking element is not a clock** (L5). While seeking, `currentTime` is a
  target, not a position — driving from it fights the seek in progress.
- **rVFC inside `mediaMaster` is an OBSERVATION primitive, never a seek
  primitive** (L4b). It sharpens the sensor; it does not move anything.
- **`timeupdate` is the hidden-tab backstop** (L4). rAF dies when hidden and the
  library's worker tick does not, so without it a hidden tab runs the vector
  free against a picture nobody re-anchors it to. Do not build a rAF-only loop.
- **iOS refuses to autoplay an UNMUTED video**, and autoplay is granted only
  while a user activation is live. `armVideo` inside the handler, before any
  `await`.
- **Headless needs more than a flag.** `--use-fake-ui-for-media-devices` is
  insufficient under `headless=new`; it needs `Browser.grantPermissions`. Check
  what `verify.mjs` currently grants before assuming the camera path runs there
  at all, and if it cannot, assert the *fallback* honestly rather than skipping.
- **`settleMs` in the manifest**, behind control 0. A 4 s record plus duration
  resolution plus a seek is slow work, and `verify.mjs` stops collecting 400 ms
  after the last assert — slow work belongs behind the first control, which is
  the only one that gets `settleMs`.
- **Assert the mechanism, not an effect that has to be waited for.** An assert
  that waits gets written tolerantly, and a tolerant assert is how `loops` spent
  its whole life not looping.
- **`duration: Infinity`** — §2.
- **MediaRecorder mime support varies.** Pick by `isTypeSupported` and report
  which was chosen; a page that hard-codes one codec is a page that works on one
  browser.

---

## 6. Definition of done

1. One press yields a take, and the take is scrubbable within a frame of
   finishing.
2. The picture masters the deck; nothing writes `currentTime` from the vector.
3. Every number on screen was observed by the page, and the two it cannot
   observe — capture-to-available latency, and any content anchor — are named
   as absent rather than silently omitted.
4. A seek that lands on a keyframe rather than the asked instant is shown as
   such, not as an error.
5. `verify.mjs` moves by the asserts added and no others, and the count is
   diffed against the last known total.

---

## 7. Where it sits, and what it is not

**Act 3, first row**, before `record`. The act is *capture and return*, and this
is its simplest complete instance: make one yourself, then scrub it. The rows
after it each add one thing — `record` adds disk economics, `replay` and `seek`
add a pre-existing 190 s show and an exact fold, `show` adds a real WebRTC hop
between the camera and the recorder.

**Against `capture` (Act 4).** `capture`'s subject is the pipeline — segments,
an O(1) disk high-water of 2, a tokenless R2 round trip, and a manifest fetched
back. Its asserts are about segments closing and bytes arriving. `take` shares
none of that: no R2, no segment economics, one blob. If the two ever converge,
`take` is the one that should lose the pipeline, not the one that should gain it.

**Not a glass demo.** It says nothing about when a frame reached the display.
That is `plan-glass`, it is blocked, and this plan must not quietly do a worse
version of it.
