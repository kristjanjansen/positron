# Low-latency streaming on Cloudflare — working setup

Measured **2.45 s** glass-to-playhead against a 2.50 s target, playback rate 1.000.

## Run it

```bash
cp ../.env.example ../.env      # CF_API_TOKEN (Account → Stream → Edit) + CF_ACCOUNT_ID

./provision.sh my-stream        # creates the live input, prints URLs, writes .last-input
./publish.sh                    # pushes a test pattern with a burned-in clock
./publish.sh video.mp4          # ...or loop a real file

python3 -m http.server 8900
open "http://127.0.0.1:8900/index.html?uid=<UID from provision.sh>"
```

## What each piece does

| File | Role |
|---|---|
| `provision.sh` | Creates a Stream live input with `preferLowLatency: true`. |
| `publish.sh` | ffmpeg → RTMPS with LL-HLS-compliant encoding. |
| `low-latency-player.js` | The player. Drop-in module, no build step. |
| `index.html` | Demo page + live latency readout. |

## Using the player in your app

```js
import { createLowLatencyPlayer } from './low-latency-player.js';

const player = createLowLatencyPlayer(videoEl, manifestUrl);
player.on('latency', ({ latency, target }) => console.log(latency, target));
player.destroy();
```

Needs `hls.js` v1.6+ on the page. Falls back to native HLS on Safari, which
handles the live edge correctly on its own.

## Resilience — tested against encoder stop/start chaos

`rig/chaos.sh` interrupts the ingest at 2/5/12/25/60 s gaps. Verified result
(run v5b): **5/5 interruptions recovered, median 15.4 s, max 22.9 s, landing at
target latency (2–4 s), zero crashes** — against a platform where **every clean
encoder reconnect mints a new video UID** behind the same live-input URL, and
the edge serves the dead broadcast's manifest for ~10–15 s after each swap
(client-irreducible; recovery is near the platform floor).

The recovery model, each rule earned by a measured failure:

| signal | response |
|---|---|
| latency drift < 0.3 s over target | nothing |
| drift 0.3–2 s | playbackRate ≤ 1.05 (invisible) |
| drift > 2 s | seek to live edge (one skip; never backwards) |
| playhead frozen 6 s | seek; after 2 failed seeks → full rebuild |
| live edge (`seekable.end`) frozen 12 s | full rebuild — source died |
| fatal hls.js error | 2 in-place media recoveries, else rebuild |
| manifest 204 (stream not started) | rebuild on rising backoff, forever |
| tab became visible | seek to live edge |

"Rebuild" = destroy the Hls instance and create a fresh one — the programmatic
page refresh. Every observed wedge recovers under it and under nothing weaker.
Rebuilds are rate-limited (3 s) and freeze the last frame into `poster` first,
so viewers see a still image, not black.

## Timed messages, subtitles, invisible events

`timed-messages.js` + the deployed relay
(`https://elektron-cues.kristjan-jansen.workers.dev/room/<name>/ws`) deliver
cues synced to the *stream moment* via `EXT-X-PROGRAM-DATE-TIME`:

The relay now requires a token: `?token=<CUES_TOKEN>` (or Authorization Bearer)
on the WS URL — the value lives in the repo `.env` as `CUES_TOKEN` (worker
secret; never committed). `createTimedMessages` accepts it as a `token` option
and appends it to the URL; `demo.html` takes it as a `token` query param. The
worker also validates cue frames (finite `at`, ≤ 8 KB serialized) and answers
bad ones with `{type:'error'}` instead of relaying.

```js
import { createTimedMessages } from './timed-messages.js';
const cues = createTimedMessages(player, videoEl, { onMessage: showOverlay, token: CUES_TOKEN });
cues.connect('wss://elektron-cues.kristjan-jansen.workers.dev/room/show1/ws');
cues.attachSubtitleTrack('et');          // visible: native subtitle rendering
cues.attachMetadataTrack(onEvent);       // invisible: exact-time events
cues.add({ at: Date.now() + 5000, until: Date.now() + 9000,
           data: { text: 'Tere tulemast' } });
```

Every viewer sees a cue at the same point *in the video* regardless of their
individual latency. Measured relay lag: one-way p50 **27 ms** — two orders of
magnitude ahead of video latency, so cues always arrive in time.

## Why the wrapper exists

hls.js picks a start position **once** and, by default, has no way to recover:
`maxLiveSyncPlaybackRate` is `1` (rate catch-up off) and `maxLatency` is
`Infinity` unless `liveMaxLatencyDuration*` is set (seek correction can never
fire). So any delay at startup — a backgrounded tab, a network hiccup, a
sleeping laptop — parks the player at that offset **for the rest of the
session**.

Measured on this exact stream, stock hls.js: **7.6 s** in one run, **15.4 s** in
the next. Same config, same stream. Each perfectly stable, neither recovering.
The defect is non-determinism, not slowness.

The wrapper adds a latency controller that escalates by how disruptive the fix is:

| drift past target | action | visible? |
|---|---|---|
| < 0.3 s | nothing | — |
| 0.3–2.0 s | nudge `playbackRate` up to 1.05 | no |
| > 2.0 s | hard-seek to `liveSyncPosition` | one skip |
| tab became visible | hard-seek immediately | one skip |

That last row is the one that matters in production. A hidden tab stops
buffering entirely, so it *always* returns parked far behind. Without it,
minimising a tab permanently degrades latency until reload.

## Encoder requirements — not optional

- **H.264, no B-frames** (`-bf 0`). B-frames break LL-HLS, and WebRTC egress
  rejects them outright while HLS silently accepts and misbehaves.
- **CBR** — set `-b:v`, `-minrate`, `-maxrate`, `-bufsize` to the same value.
- **Fixed GOP == segment length.** `-g` alone is not enough: scenecut fires and
  you get a 29-frame cadence from `-g 30`. Set `-keyint_min` and
  `-sc_threshold 0` too.
- `recording.mode` must be `automatic`, or the LL-HLS pipeline never engages.

Verify keyframes with `key_frame=1`, never `pict_type=I` — x264 emits non-IDR
intra frames. Note `ffprobe -show_entries frame=pkt_pts_time` is silently broken
(renamed to `pts_time`; ffprobe accepts the old name and prints nothing).

## Gotchas that cost real time

- **`?protocol=llhls` does nothing on its own.** Without `preferLowLatency` on
  the input you get a plain HLS playlist with zero LL tags and no error.
- **`drawtext`'s `basetime=` is silently ignored** by `%{pts:hms}`. Use the third
  argument: `%{pts:flt:<epoch>}`.
- **Homebrew's `ffmpeg` 9.x dropped libfreetype and libsrt** — no `drawtext`, no
  SRT. `publish.sh` defaults to `ffmpeg@7`. `brew install ffmpeg-full` gets
  everything (including the `whip` muxer) in one binary.
- **A hidden tab never starts buffering**, and hls.js reports no error — it just
  sits at `streamController.state === 'IDLE'` forever.

## Known non-fatal warnings

`bufferStalledError` and `aborted` appear in the log during normal operation;
hls.js recovers from both. They are logged, not swallowed, so they show up in
the demo page's console.
