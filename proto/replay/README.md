# proto/replay — synced VOD replay with cues (measured end-to-end)

A recorded live show, replayed later with its cue track re-firing **on the
correct video moments** — the full pipeline, built and measured 2026-08-26:

```
show.html (canvas stage, headless Chrome)          operator.mjs (node WS)
  · joins elektron-rtc room `replay-test`            · 12 cues: 6 "now" + 6
  · fires cues live when wall clock crosses at        scheduled (+2 s), 15 s apart
  · burns EVERYTHING into the pixels:                 · sender stamps (at, sentAt)
      clock row  = 48-bit wall-clock ms                 travel + persist verbatim
      cue row    = firedAt ms + cue seq                       │
        ↓ CDP screencast → ffmpeg → RTMPS                     ▼
Cloudflare Stream live input (recording automatic)   RtcRoom DO cue-log
        ↓ ~12 s after stream end                     GET /room/{name}/cuelog
VOD asset (de39bf19…, 200.02 s)                               │
        └────────────► replay.html ◄──────────────────────────┘
                        hls.js VOD + timeline/transport.mjs: one `cue`
                        adapter on a deck whose vector is SLAVED to
                        T0 + video.currentTime·1000 (the video is the
                        clock master) — see "the replay engine" below
```

## The one hard fact this design hangs on

**Cloudflare Stream VOD manifests carry NO `EXT-X-PROGRAM-DATE-TIME`**
(re-verified here on both the master and rendition playlists — the
`vod-manifest-has-no-PDT` check in `run-measure.mjs`). The live LL-HLS
manifests do carry PDT, which is what `src/timed-messages.js` uses via
`hls.playingDate`. On a VOD that returns `null` forever, so the wall-clock ↔
playhead mapping must come from **metadata you keep yourself**: a T0 anchor
with `wallClockAtPlayhead = T0 + video.currentTime × 1000`.

## T0 anchor design (three candidates, measured against each other)

| anchor | how | measured value | error vs content |
|---|---|---|---|
| **content** (PRIMARY) | decode the burned wall-clock row from the first N=15 presented VOD frames; `T0 = median(decodedMs − mediaTime·1000)` (64 ms spread) | 1787737748366 | 0 (definitionally) |
| publisher stamp | `Date.now()` when the first screencast frame went to ffmpeg | 1787737748257 | **−109 ms** (cold-start: encode/mux head loss) |
| Stream API `created` | asset metadata on the VOD | 1787737754542 | **+6176 ms** (!) |

The content anchor is self-calibrating: publisher-start stamps inherit
cold-start effects (RTMPS connect, keyframe wait, head trim — here only
~109 ms, but unbounded in principle), and the Stream API's `created` is
**6.2 s late** — anchoring on it would misplace every cue by six seconds.
`replay.html` computes the content anchor at boot (`anchor=content`, default)
and can be forced onto the stamp (`anchor=stamp&t0=…`) for comparison.

**Production implication:** a show that wants replayable cues should carry a
machine-readable timecode element in the picture. The 64-block binary row used
here (48-bit epoch ms + id byte + XOR checksum, blockW 12 at 1280×720) costs
one `fillRect` loop per frame, survived the Stream transcode with **5427/5427
(100 %) decodes from the top rendition** (lock `hls.currentLevel` to it — the
lower renditions exist), and enables self-calibrating replay plus periodic
re-anchoring across mid-stream ingest gaps (a gap shifts PTS vs wall clock;
re-deriving T0 every few seconds would absorb it — not exercised here).

## The replay engine is the timeline library (since 2026-08-28, DoD-A)

`replay.html` used to import `createTimedMessages` from
`src/timed-messages.js` and hand it a fake player whose `hls.playingDate` was
`T0 + video.currentTime*1000` — a 100 ms poll, destroyed and rebuilt from the
whole cue log on every `seeked`. It is now ONE deck from
`timeline/transport.mjs` with ONE adapter:

```js
const cueAdapter = {
  caps: { kind:'cue', domain:'wall', unit:'ms', seekable:true, reducible:true,
          catchUp:'burst' },                       // a cue is a note
  actuate(p, rec) { deliver(p, rec); },            // = the page's render path
  reduce(payloads) { return new Set(payloads.map(p => p.id)); },  // fired set ≤ t
  assertState(set, info) { /* behind the playhead = caught-up, never re-animated */ },
};
```

- Position domain is **absolute wall ms** — a cue's `at` *is* its position.
- **The video element is the clock master**: `deck.sync(T0 + currentTime*1000)`
  every rAF (tolerance 10 ms), with `timeupdate` as the hidden-tab backstop. A
  paused or stalled master pauses the deck — cues cannot run ahead of the
  picture. A discontinuity > 400 ms is routed to `seek()`, never `sync()`
  (syncing across a jump would leave the skipped cues pending and burst them).
- **Seek is a fold, not a rebuild**: the library reconciles statuses (behind →
  passed, ahead → pending) and re-runs `reduce`/`assertState`, so backward
  seeks rewind for free and the cues ahead re-fire on the way up — same
  semantics as before, without replaying the log. `pastWindow` survives as the
  rule that downgrades a *burst-late* delivery (a real stall) to caught-up.
- Fires ride a **worker** tick host with a committed one-shot timer per cue:
  no poll floor, and no 1 Hz clamp when the tab is backgrounded.

Full adoption record, the pre-adoption measurement and the library seams:
`NOTES.md`.

## Measured (VOD de39bf1916469a4bc8b18e73a8726762, 12 cues, all checks green)

Per-cue error = decoded burned wall-clock on the glass at the fire moment −
`fireAt` (content-referenced, so this is pure engine error):

| cue | mode | err ms (lib) | err ms (old) | | cue | mode | err ms (lib) | err ms (old) |
|---|---|---|---|---|---|---|---|---|
| CUE-01 | now | **25** | 59 | | CUE-07 | now | **16** | 49 |
| CUE-02 | sched | **9** | 42 | | CUE-08 | sched | **31** | 65 |
| CUE-03 | now | **24** | 56 | | CUE-09 | now | **5** | 37 |
| CUE-04 | sched | **6** | 71 | | CUE-10 | sched | **−4** | 62 |
| CUE-05 | now | **21** | 53 | | CUE-11 | now | **8** | 41 |
| CUE-06 | sched | **34** | 69 | | CUE-12 | sched | **−6** | 60 |

**p50 = 16 ms, p95 = 34 ms, range −6…34** (11/11 checks green) — down from
**p50 59 / p95 71** on the hand-rolled engine, whose error was one poll
interval: engine lateness went p50 52 ms → **5.5 ms**. A negative err is not an
early fire (engine lateness never went below 0); it means the frame drawn at
the fire moment is the one before the cue's — at this accuracy the ground
truth's own 33 ms frame grid is the dominant term.

The old table was also **phase-locked, not sampled**: re-run two days later it
reproduced all twelve values bit-identically (cues every 15.000 s = 150 poll
periods). Its honest spec was 0–100 ms + quantization, worst case ~133 ms
against the 150 ms target; proto/archive read 129 ms at a locked worst-case
phase. The library number has no such phase.

Seek tests (all asserted programmatically, 11/11 checks pass): late join at
+65 s shows CUE-04 immediately as caught-up with zero re-fires, CUE-05 then
fires at 53 ms error; forward seek to 150 s catches up CUE-01…10; backward
seek to 30 s rewinds to CUE-02, clears CUE-03+ back to pending, and CUE-03
re-fires at 56 ms error.

## Live-vs-replay asymmetry (the cross-check finding)

The cue row in the pixels records when each cue fired **live**; comparing
replay fire moments against it:

- **"now" cues** (sent at the fire moment): replay − live = **−32…−34 ms**.
  Live pays WS transit + draw tick (37–59 ms measured); replay now pays only
  frame quantization. *(Before the library adoption this read 0…1 ms and the
  README called the two delays "cancelling" — they were: live transit ≈ replay
  poll floor. Removing the poll floor exposed the real offset.)*
- **scheduled cues** (delivered 2 s early): replay − live = **0…+32 ms** (was
  +33…+67 ms). The live stage had them queued and fired within 2–31 ms; replay
  now fires at intent.

So replay does NOT reproduce the live experience exactly — it honors
**operator intent** (`fireAt`). `replay.html?fireDelayMs=N` shifts every fire
by +N ms to reproduce the live feel instead (verified: `fireDelayMs=500` moved
a cue's content-referenced fire from +53 ms to +581 ms). Default 0 = intent.

## Files

- `show.html` — the recorded stage: clock row + cue row + human clock + CUE
  ZONE; joins the room as viewer and fires cues live (wall clock = playhead).
- `operator.mjs` — sends the cue schedule with sender-side stamps.
- `run-record.mjs` — p3b pipeline driver (screencast → ffmpeg → RTMPS),
  stamps T0 candidates, polls the VOD, saves cuelog + live-fire telemetry.
- `replay.html` — hls.js VOD + the timeline library's cue lane (above).
- `NOTES.md` — the DoD-A adoption record: old-path measurement, what replaced
  it, the gate numbers on both anchors, library seams found.
- `run-measure.mjs` — the measurement: straight-through, late join, seeks.
- `replay-server.py` — static server (project root) + `/collect`, port 8885.
- `artifacts/` — run meta, cuelog, live fires, per-cue report
  (`replay-report.json`), VOD + live-input JSON.

## How to run

```sh
cd proto/replay
python3 replay-server.py &                      # :8885
node run-record.mjs                             # needs a live input in
                                                # artifacts/replay-live-input.json
node run-measure.mjs                            # after the VOD is ready
```

Or just watch the existing recording with cues:

```
http://127.0.0.1:8885/proto/replay/replay.html?src=<VOD m3u8>&room=replay-test&token=<ROOM_TOKEN>
```

## What a production replay page still needs

- **Audio**: this rig streams silence (anullsrc); a real show needs the mix.
- **Anchor without burned pixels** for shows that refuse an in-picture strip:
  persist T0 (content-calibrated once, at publish time) next to the VOD uid in
  your own metadata store — never trust Stream's `created` (+6.2 s here).
- **Mid-stream ingest gaps**: Stream splices them out of the VOD; a single T0
  is then wrong after the gap. Periodic re-anchoring from the timecode strip
  (or a segment-map you record yourself) is required for gap-crossing cues.
- **Cue revisions/cancels in the log**: the cuelog stores every frame;
  `loadCues()` now compacts it explicitly — **last record per id wins**, cancel
  records (`{kind:'cancel', id}`) drop the cue — instead of leaning on engine
  `add()` ordering. Producer-side compaction is still the better place for it.
- **DRM/signed URLs**: this VOD is public; signed playback changes nothing in
  the design (the anchor is in the pixels) but the cuelog fetch needs auth.
- **UI**: the overlay here is a test harness; a show player would route
  `onMessage` into its real overlay/scene system (same callback shape as live).
