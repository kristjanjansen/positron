# Gapless relay — proof of concept (working, one known defect)

## The problem it solves

Cloudflare ends the broadcast the instant the encoder's TCP socket closes —
verified: even a 2 s stop mints a new video UID, costing viewers ~15 s of
outage (player recovery is already at the platform floor). Only a connection
that never closes survives.

## Architecture

```
encoder ──rtmp──> mediamtx ──┐
                              feeder loop ──MPEG-TS──> FIFO ──> uplink ffmpeg ──RTMPS──> Cloudflare
slate (lavfi, always-on) ────┘                                  (socket NEVER closes)
```

- `gapless.sh` — uplink (one long-lived ffmpeg re-encoding from the FIFO with
  `setpts=N/30/TB`, so timestamp jumps at splices vanish) + feeder loop that
  writes whichever source exists: the real encoder via mediamtx, else a slate.
- `handover-test.sh` — four-phase verification: slate → encoder in →
  encoder killed (10 s) → encoder back, checking videoUID + live frames.
- The slate carries `drawtext=textfile=/tmp/overlay.txt:reload=30` — burned-in
  messages driven live by `rig/overlay-bridge.mjs` from the Durable Object
  cue room (works during technical breaks, visible to all viewers).

## Verified

- ✅ **One Cloudflare broadcast across encoder in / kill / return** (videoUID
  stable through all phases, twice).
- ✅ Content switching (feeder lifecycle log + distinct frame hashes).
- ✅ Viewer cost of an encoder restart drops from ~15 s frozen outage to a
  slate interlude on an unbroken stream.

## Splicer defect ledger — every entry found by test, then fixed

| # | defect | fix |
|---|---|---|
| 1 | torn TS packets wedge the uplink decoder (permanent gray) | 188-byte alignment in `splicer.py` |
| 2 | mid-GOP joins decode gray until next IDR | RAI-gated output after every switch |
| 3 | backward PTS jump (live→webcam) → per-frame discontinuity flip-flop → CF drops the session | per-leg `-output_ts_offset` |
| 4 | starved-but-open RTSP socket blocked switching for 17 min | select() reads + 2 s starvation trigger |
| 5 | wall-clock offsets jump ~1000 s ahead after starvation | offsets track the last **PCR actually delivered** |
| 6 | audio PES truncated at splice → corrupt packet → x264/mux cascade death | uplink `-fflags +discardcorrupt`, pinned `-r 30` |
| 7 | source warm-up (RTSP connect + first keyframe) mistaken for starvation | 6 s grace while still gated |
| 8 | camera that never delivers a frame escapes the bench, retried forever | bench on any webcam leg that ends without ungating |

## Source tiers

`encoder (mediamtx) > webcam (avfoundation) > slate` — upgrade-on-recovery,
60 s bench for a failing camera, `SPLICER_WEBCAM=0` / `SPLICER_CAM_INDEX` env
knobs. Webcam audio is deliberately silent (feedback hazard).

## Verification status (honest)

- ✅ slate→live and webcam→live: same broadcast, distinct content frames,
  **0 timestamp discontinuities** with PCR offsets.
- ✅ dead camera: benched → slate → Cloudflare live, self-healing.
- ⚠️ The full four-phase walk on the FINAL build (defects 6–8 fixed) has not
  passed in one clean run — the camera died (laptop lid closed) mid-campaign.
  **Run `handover-test.sh` once with the camera available** to close it out.

## Lessons that transfer

- mediamtx `fallback:` switches only at reader-connect time; `overridePublisher`
  kills reader sessions. Neither gives mid-session switching on its own.
- Supervisor scripts must not `set -e` (a failing `kill` silently killed the
  feeder, orphaning a slate writer).
- Long-running `curl` probes need `-m` timeouts — one hung curl froze the
  feeder for 8 minutes.
