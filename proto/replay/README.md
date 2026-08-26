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
                        hls.js VOD + src/timed-messages.js UNCHANGED,
                        fed a fake `hls.playingDate` = T0 + currentTime·1000
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

## The replay engine is the live engine

`replay.html` imports `createTimedMessages` from `src/timed-messages.js`
**unchanged** and hands it a fake player:

```js
{ hls: { get playingDate() { return new Date(T0 + video.currentTime * 1000); } } }
```

Crossing rule, ordering, `pastWindow` catch-up — all the live code. Seeks
follow the repo's rebuild-never-patch rule: on `seeked` the engine is
destroyed and rebuilt from the full cue log; the first tick fires the newest
past cues and routes older ones through `onMissed` as caught-up (rendered
grey "CAUGHT UP", never re-animated). Backward seeks therefore rewind state
for free, and the cues ahead become pending again and re-fire on the way up.

## Measured (VOD de39bf1916469a4bc8b18e73a8726762, 12 cues, all checks green)

Per-cue error = decoded burned wall-clock on the glass at the fire moment −
`fireAt` (content-referenced, so this is pure engine error):

| cue | mode | err ms | | cue | mode | err ms |
|---|---|---|---|---|---|---|
| CUE-01 | now | 59 | | CUE-07 | now | 49 |
| CUE-02 | sched | 42 | | CUE-08 | sched | 65 |
| CUE-03 | now | 56 | | CUE-09 | now | 37 |
| CUE-04 | sched | 71 | | CUE-10 | sched | 62 |
| CUE-05 | now | 53 | | CUE-11 | now | 41 |
| CUE-06 | sched | 69 | | CUE-12 | sched | 60 |

**p50 = 59 ms, p95 = 71 ms, range 37–71 ms** — inside the live engine's own
65–98 ms band and comfortably under the 150 ms target. (Components: ≤100 ms
poll + ~33 ms frame quantization; the tight clustering is partly aliasing —
cues every 15.000 s against the 100 ms poll grid lock phase.)

Seek tests (all asserted programmatically, 11/11 checks pass): late join at
+65 s shows CUE-04 immediately as caught-up with zero re-fires, CUE-05 then
fires at 53 ms error; forward seek to 150 s catches up CUE-01…10; backward
seek to 30 s rewinds to CUE-02, clears CUE-03+ back to pending, and CUE-03
re-fires at 56 ms error.

## Live-vs-replay asymmetry (the cross-check finding)

The cue row in the pixels records when each cue fired **live**; comparing
replay fire moments against it:

- **"now" cues** (sent at the fire moment): replay − live = **0…1 ms**. Live
  pays WS transit + draw tick (37–59 ms measured); replay pays engine poll +
  frame quantization (37–71 ms). The two delays happen to cancel here.
- **scheduled cues** (delivered 2 s early): replay − live = **+33…+67 ms**.
  The live stage had them queued and fired within 2–31 ms; replay still pays
  its poll floor.

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
- `replay.html` — hls.js VOD + the live cue engine in replay mode (above).
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
- **Cue revisions/cancels in the log**: the cuelog stores every frame; replay
  currently applies same-id revision by replay order (engine `add` semantics).
  A production log should be compacted (last revision wins, cancels honored).
- **DRM/signed URLs**: this VOD is public; signed playback changes nothing in
  the design (the anchor is in the pixels) but the cuelog fetch needs auth.
- **UI**: the overlay here is a test harness; a show player would route
  `onMessage` into its real overlay/scene system (same callback shape as live).
