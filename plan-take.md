# plan-take — a recording you can scrub, with nothing on the wire

Status: **not started.** Written 2026-09-07, out of the `transport`–`vclick`
rework. Proposed slug **`take`**, Act 3 (*capture and return*), first row.

Read `plan-glass.md` §2 before quoting any number this demo produces, and
`plan-score.md` §4b for what a media part becomes once it enters the container.

---

## 0. One line

Record a few seconds from the camera and scrub it — **with no network at all.**
No R2, no Worker, nothing uploaded and nothing fetched. The simplest complete
instance of *capture and return*, and the one place where the cost of turning a
recording into a seekable thing is the subject rather than an obstacle.

`capture` already does camera → segments → R2 → deck. **That is a pipeline
demo.** This is the artefact: one take, on a timeline, on your own machine.

---

## 1. The decision everything follows from

**The picture is the clock. The deck bends to it.**

Not open, and `timeline/media-master.mjs` exists because three clients answered
it three ways and diverged:

> **L1. THE MASTER IS NEVER NUDGED.** Its rate and its `currentTime` are read,
> never written. The picture is the ground truth; the vector is what bends.

So: `mediaMaster(deck, video, …)`, and **never write `video.currentTime` from
the deck**. The temptation runs the other way — a transport bar looks like it
should drive the video — and giving in inverts the master and reopens the
burst-every-skipped-cue bug that `replay-grid`'s hand-rolled copy had.

Two phases, two clocks, and conflating them is the first thing that will go
wrong:

| phase | clock | why |
|---|---|---|
| recording | the wall clock | there is no element to master and no playable file yet |
| playing back | the `<video>` | L1 — the picture is the ground truth |

Nothing masters during recording. The recorder's events (`start`,
`dataavailable`, `stop`) are stamped **at source** and become rows on a lane.

---

## 2. Where a local recording lives

The constraint is no network, so the only question is which local store — and
the repo already has a proven answer for part of it.

### The precedent, with numbers

`proto/selfrec/participant.html:99–125` already puts MediaRecorder blobs in
**IndexedDB**, keyed by sequence number, as its offline buffer. It was measured:
**25 s offline = zero loss, tab-kill 790 ms** (`SUMMARY.md:134`). So
IndexedDB-holds-video-blobs is not a guess here; it has shipped and been tested.

### The options

| store | survives reload | mobile | verdict |
|---|---|---|---|
| **`Blob` + `createObjectURL`** | no | yes | **P1.** Simplest thing that works; the take dies with the tab |
| **IndexedDB** | yes | yes, incl. iOS Safari | **P2.** The upgrade, with the repo's own precedent |
| **OPFS** (`navigator.storage.getDirectory`) | yes | partial | name as the path for large or streamed writes; `createSyncAccessHandle` wants a worker |
| **File System Access** (`showSaveFilePicker`) | yes | **no — desktop Chromium only** | cannot be the answer if a phone matters |
| **`<input type=file accept=video/* capture>`** | n/a | yes | the **no-permission path**: a local file with no `getUserMedia` at all |

**Verify before building**, do not take this table on faith: the mobile column
for OPFS and File System Access is stated from general knowledge, **not from
anything measured in this repo**. `grep` found no OPFS or `showSaveFilePicker`
use anywhere. Probe the capability and report it rather than inferring it from
an error string — the lesson `@moq/net` taught this project when a library's
"not supported" turned out to mean "I will not".

### "Small enough" for IndexedDB, as a number

The repo's existing recorders use `videoBitsPerSecond: 800_000`
(`demo/capture/index.html:159`, `demo/record/index.html:87`) — 800 kbps, i.e.
**100 KB/s**. So:

- a 4 s take ≈ **400 KB**
- a 60 s take ≈ **6 MB**
- an hour ≈ **360 MB**

A lores take is comfortably inside any browser's IndexedDB quota. Record at
that bitrate or below, put the number on the page, and the storage question
stops being a worry and becomes a readout.

**Done when** a take survives a reload, and the page says where it is kept and
how large it is.

---

## 3. The codec trap, which this repo is currently standing in

**All three existing recorder demos hard-code WebM and fail outright otherwise:**

```js
// demo/capture/index.html:156, demo/record/index.html:84, demo/show/index.html:315
const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  .find((m) => MediaRecorder.isTypeSupported(m));
if (!mime) { d.fail(new Error('no webm MediaRecorder support')); return; }
```

iOS Safari's `MediaRecorder` produces **MP4/H.264, not WebM** — so
`isTypeSupported` returns false for every entry in that list and all three
demos `d.fail()` on a phone. **This is unverified on a device from inside this
repo** and is exactly the shape that has cost this project most often: a green
laptop and a dead phone, with `verify.mjs` unable to see the difference because
desktop Chrome never takes that branch.

`take` must **negotiate rather than assume**: probe an ordered list that
includes `video/mp4`, take the first supported, and **put the chosen mime on the
page**. If nothing is supported, say which were tried.

Related and already recorded: **MSE refuses h264-in-WebM** (`SUMMARY.md:139`).
Not this demo's problem while it plays a whole blob through `<video src>`, but
it becomes one the moment anything here reaches for MSE.

**Done when** the page names the mime it got, and the mime list is not a
WebM-only list.

---

## 4. `duration: Infinity`, turned into a measurement

`CLAUDE.md`:

> **MediaRecorder output reports `duration: Infinity`**, which leaves a
> transport bar with no range to scrub. Seek far past the end, let the browser
> resolve the duration, then come back.

`capture`'s `assemble()` implements the workaround and hides it. Here it should
be visible, because the bar's seekability test is exactly
`Number.isFinite(deck.durationMs) && deck.durationMs > 0`.

1. On stop we already know how long we recorded — wall clock, `stop − start`.
   Build the deck with that range at once, so the timeline exists the moment the
   take does.
2. Resolve the file's real duration by the known dance.
3. `deck.setRange([0, fileDurationMs])` — the range is **not** fixed at
   construction since v0.5, `deck.range` stays one stable reference, and
   `rangeGen()` moves. The transport bar already re-derives on `rangeGen`, so
   this costs the bar nothing.
4. **Report the difference.** *"recorded 4.00 s, the file says 4.03 s"* is a real
   observed number, and it turns a buried workaround into something a reader can
   see.

**Done when** the bar is seekable within a frame of the take finishing, and the
correction is on screen rather than swallowed.

---

## 5. What it can honestly measure

Every demo in this act's neighbourhood reports a real number about itself. This
one can observe four, and must not pretend to a fifth.

| number | how observed | honest? |
|---|---|---|
| **chunk cadence** | `dataavailable` inter-arrival vs the requested timeslice | yes — both sides ours |
| **recorded vs file duration** | wall clock at stop vs resolved `video.duration` | yes — §4 |
| **seek: asked vs got** | requested position vs `currentTime` once `seeked` fires | yes — and it is `plan-score` §4b's *"`in` is a request, not a fact"* made visible |
| **sync corrections** | `mediaMaster.stats()` — `syncs`, `corrections`, `jumps`, `lastCorrectionMs` | yes — `replay-grid` measured 1169 syncs, 0 corrections over tolerance |
| **bytes on disk** | blob sizes, and the IndexedDB total | yes, and it makes §2 concrete |

### What it cannot measure, and must not print

- **Capture-to-available latency.** `MediaRecorder` gives no capture timestamp
  per chunk, so "how old is this blob's oldest frame" is not observable from the
  API. What *is* observable is the delay between `stop()` and the final
  `dataavailable` — a different quantity, and it must be labelled as one.
- **Any content anchor.** "The wall-clock instant this frame was captured,
  against timeline zero" is precisely what `plan-glass.md` P0 blocks:

  > every content-anchor number this project has printed carries roughly one
  > frame of bias — the studio engine's −45.3 ms, the archive rig's −15 ms,
  > DoD-A's native-anchor p50.

  **This demo prints no anchor.** If it later wants one it inherits the bias and
  waits for `plan-glass` P0. Where a reader would expect the figure, the page
  says it cannot answer — the way `lanes` says a lane cannot report rather than
  showing it a zero.

**Done when** every number on the page was observed by the page, and the two it
cannot observe are named as absent rather than quietly missing.

---

## 6. Phases

### P1 — a take exists, in memory

Camera → `MediaRecorder` (negotiated mime, §3) → blob → `<video>`. One primary
control, because `getUserMedia` genuinely needs a gesture and `armVideo` must
spend the activation **before any `await`** — the measured iOS failure was WHEP
negotiated in 1952 ms then `play refused: NotAllowedError`, connection healthy
behind a black box.

A **fixed short length** — 4 s — so the harness is bounded and the page has an
end. `capture` uses 6 s for the same reason.

**Done when** one press yields a playable take, a refused camera says so in
words, and the chosen mime is on the page.

### P2 — the take persists

The blob into IndexedDB (§2), restored on load. The page says how many takes it
holds and how many bytes.

**Done when** a reload still has your recording, and deleting it is possible and
visible.

### P3 — the take on a timeline

`createDeck` + `mediaMaster` + `createTransportBar(…, { scrub: false })` +
`createStripView(…, { size: 'auto' })`. The strip is the position surface; the
bar keeps play/pause, the clock and the rates.

`caps.rates` for a media part is **much shorter** than a note lane's —
`plan-score` §4b — because a `<video>` at 0.25× is a decoder question, not
arithmetic. Declare only what the element honours; the bar reads the live
registry and shows exactly what is declared.

**Done when** dragging the strip moves the picture, and the picture — not the
bar — is what the playhead follows.

### P4 — the lanes and their numbers

Two lanes in the current idiom:

- **`chunks`** — one mark per `dataavailable`, coloured by how close its arrival
  was to the requested timeslice. Colour means **how it landed**, never which
  lane. Gutter carries typical and worst.
- **`seeks`** — one mark per seek, coloured by asked-vs-got. Empty until you
  scrub, and saying so.

`showReadout: false`; numbers live under the lane that owns them. Tooltips two
or three short lines. **No `?? 0`** — a null duration renders `—`, never a
confident zero, which is the bug found three times in one day.

**Done when** the gutter numbers move when you scrub, and nothing on the page is
a constant dressed as a measurement.

### P5 — the seek is a request

Scrub, then report what the element actually gave you. With a 2.0 s GOP only one
part per segment is `INDEPENDENT` (10 of 38 measured), so the landing point is
keyframe-granular. This is the demo's most transferable lesson and the same fact
`plan-score` §4b needs for media parts.

**Done when** a seek that asked for one instant and got another is shown with
the gap named, and is not treated as a failure.

### P6 — the network version, later and elsewhere

If a networked variant is wanted it is `capture`'s job, not this one's. **Do not
grow `take` into `capture`.** If they ever converge, `take` is the one that
should lose the pipeline, not the one that should gain it.

---

## 7. Traps, most already paid for

- **Never write `video.currentTime` from the deck.** §1, L1.
- **A seeking element is not a clock** (L5) — while seeking, `currentTime` is a
  target, not a position; driving from it fights the seek in progress.
- **rVFC inside `mediaMaster` is an OBSERVATION primitive, never a seek
  primitive** (L4b). It sharpens the sensor; it moves nothing.
- **`timeupdate` is the hidden-tab backstop** (L4). rAF dies when hidden, the
  library's worker tick does not — so without it a hidden tab runs the vector
  free against a picture nobody re-anchors. Do not build a rAF-only loop.
- **iOS refuses to autoplay an UNMUTED video**, and autoplay is granted only
  while a user activation is live. `armVideo` inside the handler, before any
  `await`.
- **The WebM-only mime list.** §3. Three demos are standing in this trap now.
- **Headless needs more than a flag.** `--use-fake-ui-for-media-devices` is
  insufficient under `headless=new`; it needs `Browser.grantPermissions`
  (`HANDOFF.md:516`). Check what `verify.mjs` grants before assuming the camera
  path runs there at all — and if it cannot, assert the fallback honestly rather
  than skipping.
- **`settleMs` in the manifest, behind control 0.** A 4 s record plus duration
  resolution plus a seek is slow work, and `verify.mjs` stops collecting 400 ms
  after the last assert. Slow work belongs behind the first control, the only
  one that gets `settleMs`.
- **Assert the mechanism, not an effect that has to be waited for.** An assert
  that waits gets written tolerantly, and a tolerant assert is how `loops` spent
  its whole life not looping.
- **`duration: Infinity`** — §4.
- **MSE refuses h264-in-WebM** (`SUMMARY.md:139`) — the moment anything here
  reaches for MSE.

---

## 8. Definition of done

1. One press yields a take, scrubbable within a frame of finishing, **with no
   network request made at any point** — verifiable as zero entries in the
   harness's `no failed requests` companion, and by reading the network log.
2. The picture masters the deck; nothing writes `currentTime` from the vector.
3. The recording survives a reload, and the page says where it is kept, how big
   it is, and in which container format.
4. The mime was negotiated, not assumed, and is named on the page.
5. Every number on screen was observed by the page; capture-to-available latency
   and any content anchor are named as absent rather than silently omitted.
6. A seek landing on a keyframe rather than the asked instant is shown as such,
   not as an error.
7. `verify.mjs` moves by the asserts added and no others, diffed against the
   last known total.

---

## 9. Where it sits, and what it is not

**Act 3, first row**, before `record`. The act is *capture and return* and this
is its simplest complete instance: make one yourself, then scrub it. Each later
row adds exactly one thing — `record` adds disk economics, `replay` and `seek`
add a pre-existing 190 s show and an exact fold, `show` adds a real WebRTC hop
between camera and recorder.

It will be the **only network-free row in Act 3**, and that belongs in its
one-line rather than being left for a reader to notice.

*(The alternative placement is Act 0, since the user asked for the `transport`–
`vclick` style and those touch nothing outside the page. `lanes` already touches
the sound card and a MIDI port, so hardware alone does not disqualify a demo
from Act 0 — but Act 0 is the library's own substrate, and a camera is not
substrate. Act 3 is the better home.)*

**Against `capture`.** `capture`'s subject is the pipeline: segments, an O(1)
disk high-water of 2, a tokenless R2 round trip, a manifest fetched back. `take`
shares none of it — no R2, no segment economics, one blob, no wire.

**Not a glass demo.** It says nothing about when a frame reached the display.
That is `plan-glass`, it is blocked behind the rVFC pair fix, and this plan must
not quietly ship a worse version of it.
