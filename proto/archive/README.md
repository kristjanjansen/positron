# proto/archive — LOCAL-FIRST ARCHIVE: record local HLS → segmented upload to R2 → replay with cues

Built and measured 2026-08-26. Replaces the Stream-recording anchor gymnastics:
the show is recorded **locally** as segmented HLS with an **exact native T₀**
(no content calibration needed), each segment is shipped to R2 the moment it
closes and deleted locally (**bounded disk**), and the replay plays straight
from the R2 public URL with the cue engine anchored on the native stamp.

```
show.html (canvas stage, headless Chrome)      operator.mjs — 8 cues through the
  burned clock row + cue row + CUE ZONE          deployed elektron-rtc room
      ↓ CDP screencast → ffmpeg                  `archive-test` (cuelog persists)
LOCAL segmented HLS  (-f hls -hls_time 4                │
  -hls_list_size 0, seg%05d.ts + index.m3u8)            │
      ↓ uploader.mjs (segment closes → put →            ▼
        verify → DELETE local; playlist on      GET /room/archive-test/cuelog
        every update; ENDLIST playlist last)            │
R2 bucket elektron-archive-test                         │
      └────────► proto/replay/replay.html ◄─────────────┘
                 UNCHANGED — src=<r2.dev m3u8>&anchor=stamp&t0=<native T₀>
```

## VERDICT (all 7/7 checks green, `artifacts/archive-report.json`)

**The native T₀ is as exact as claimed: content-anchor − native-stamp =
−15 ms** (smoke run: +8.3 ms; the content anchor itself has a 38 ms
median-of-15 spread, so the native stamp is exact to within the measurement's
own noise — about half a frame at 30 fps). Compare the Stream path this
replaces: publisher stamp −109 ms (RTMPS cold-start head loss), Stream API
`created` **+6.2 s**. Local recording removes the two mechanisms that made
stamps lie: no RTMPS connect/keyframe wait, no head trim — with
`-use_wallclock_as_timestamps 1` + `setpts=PTS-STARTPTS`, output t=0 IS the
first screencast frame written to ffmpeg, and that write moment is the stamp.

Per-cue replay error with the NATIVE anchor, **no calibration** (decoded
burned wall-clock on the glass at the fire moment − fireAt):

| cue | mode | err ms | | cue | mode | err ms |
|---|---|---|---|---|---|---|
| CUE-01 | now | 92 | | CUE-05 | now | 67 |
| CUE-02 | sched | 77 | | CUE-06 | sched | 95 |
| CUE-03 | now | 59 | | CUE-07 | now | 78 |
| CUE-04 | sched | 54 | | CUE-08 | sched | 66 |

**p50 = 77 ms, p95 = 95 ms, range 54–95** — under the 150 ms target.
Numerically above the previous content-anchored 59/71, but that run's tight
clustering was aliasing (15.000 s cue spacing phase-locked to the engine's
100 ms poll); this run de-aliases with fractional offsets (36.3, 57.7 …) so
the poll phase is sampled honestly (the smoke run at a locked worst-case
phase read 129 ms). err = anchorΔ (−15) + engine lateness (69–110 here) — the
same engine band as ever; the anchor contributes nothing beyond noise.
Live-vs-replay asymmetry reproduced exactly: "now" cues 0–1 ms vs the live
burn (one 33 ms outlier), scheduled cues +31…+67 ms — identical to §11b.

**RE-MEASURED 2026-08-28** on the same kept R2 show after `proto/replay/replay.html`
was refactored onto `timeline/transport.mjs` (plan-studio DoD-A): same script,
same native anchor, **7/7 green**, err `−7 −21 −7 −10 0 −4 11 1` →
**p50 −4 ms / p95 11 ms (|err| p95 21)**, from 77/95. The anchor result is
unchanged (content−native still −15 ms, burn decode 5116/5116) — what moved is
the engine: the old 100 ms poll floor (69–110 ms lateness) became 0–9 ms, so
`errMs` is now dominated by the ±1-frame quantization of the burned-clock
ground truth itself. `artifacts/archive-report.json` holds the new run; the
pre-adoption copy is in git at `HEAD~`. Details: `proto/replay/NOTES.md`.

**Bounded disk: high-water mark 1.82 MB = 2 segments resident** (sampled 1 Hz,
246 samples) against 40.2 MB total recorded — 4.4 %, and O(1) in show length:
steady state is one closed segment in flight + one being written.

**Upload lag (segment close → verified available in R2): p50 5.5 s, p95
6.6 s, max 7.2 s** (48/48 segments verified: HEAD content-length == size AND
etag == local md5 — R2 single-part etag is the plain md5). Components: ≤0.5 s
close-detection poll + ~2.0 s per wrangler CLI call (startup dominates) × 2
calls/cycle (segment + playlist) vs the 4 s segment cadence → occasionally one
cycle of queue wait. Fine for archival; production would use rclone/S3
multipart with R2 access keys (no rclone/aws-cli on this machine — wrangler
per-object was the documented choice).

## Cost math (observed)

191.2 s show → **42,182,148 B stored (40.2 MB, 1.77 Mbit/s effective)**,
86 class-A ops (48 segments + 38 playlist updates).

| | this show (3.19 min) | per hour of show |
|---|---|---|
| R2 storage ($0.015/GB·mo) | **$0.00063/mo** | $0.0119/mo (0.794 GB) |
| R2 class-A ops ($4.50/M) | $0.00039 once | ~$0.008 once |
| R2 egress | $0 | $0 |
| Stream storage ($5/1000 min) | $0.0159/mo | $0.30/mo |
| Stream delivery ($1/1000 min watched) | per view | per view |

**R2 is ~25× cheaper on storage and free on egress**; Stream additionally
bills every minute watched. (r2.dev dev URLs are rate-limited — production
serves via a custom domain on the bucket, same zero egress.)

## T₀ stamp candidates (this run)

| stamp | value | vs content truth |
|---|---|---|
| ffmpeg process spawn | 1787745030498 | −13 ms early (comparison only) |
| **first frame → ffmpeg stdin (NATIVE)** | **1787745030511** | **+15 ms** (≤ noise) |
| CDP capture timestamp of that frame | 1787745030506 | +10 ms |
| ffmpeg `-progress` first frame report | 1787745034768 | +4.3 s — useless (progress waits for the mux pipeline to fill; parse it for liveness, never for anchoring) |
| content (median of 15 burned-row decodes) | 1787745030496 | 0 (definitionally) |

## Files

- `record-local.mjs` — show driver: headless-Chrome show page (reuses
  `proto/replay/show.html` + `operator.mjs` verbatim) → CDP screencast →
  ffmpeg → local segmented HLS; stamps all T₀ candidates; spawns the uploader;
  writes `artifacts/archive-meta.json` (+ cuelog, live fires).
  **Per-run isolation (default):** room, RECDIR and the R2 prefix all get a
  timestamp suffix (`archive-test-<ts>`, `shows/archive-test-<ts>`) so a rerun
  can never replay a stale cuelog or clobber/mix a previous run's segments;
  `ROOM=`/`RECDIR=` still override for deliberate reuse. On any fatal, the
  driver kills **every** spawned child (uploader, operator) — no orphan
  uploader keeps writing the prefix after the driver dies.
- `uploader.mjs` — the daemon: a segment listed in `index.m3u8` is closed
  (ffmpeg appends only after the .ts is fully written) → put to R2 → verify
  (HEAD: length + etag==md5) → delete local. Playlist after its segments on
  every change; ENDLIST playlist last. Tracks disk high-water at 1 Hz.
  **Failed segments are RETRIED** on later passes with exponential backoff
  (`MAX_SEG_ATTEMPTS`, default 10); the playlist is only uploaded once every
  segment it references is verified in R2. A segment that exhausts its
  attempts is logged loudly and **EXCLUDED from the uploaded playlist**
  (never a 404 reference); the report is then `degraded:true` and the exit
  code is 2.
  Report → `artifacts/uploader-report.json`, JSONL → `results/archive-upload.jsonl`.
- `run-measure-archive.mjs` — replay from R2 via `proto/replay/replay.html`
  **unchanged** (`anchor=stamp&t0=<native>`); per-cue burned-frame errors, the
  content-vs-native delta, checks. Report → `artifacts/archive-report.json`,
  JSONL → `results/archive-replay.jsonl`.
- `cors.json` — the bucket CORS policy (wrangler `rules` format).

## How to run

```sh
cd proto/replay && python3 replay-server.py &        # :8885 (show + replay pages)
cd ../archive
node record-local.mjs                                 # ~3.2 min show + upload drain
node run-measure-archive.mjs                          # replay from R2, measured
```

Proof artifact (kept): room `archive-test`, 48 segments + playlist at
**https://archive.positron.studio/shows/archive-test/index.m3u8**
— watch it with cues:
`http://127.0.0.1:8885/proto/replay/replay.html?src=<that m3u8>&room=archive-test&token=<ROOM_TOKEN>&anchor=stamp&t0=1787745030511`
(or drop `anchor`/`t0` for content anchoring — both land within 15 ms).

## NOTES

- **Wrangler auth trap, sharpened**: the known rule was "clean env + machine
  OAuth" (workers/rtc/NOTES.md). It is NOT enough — **wrangler auto-loads
  `.env` from its cwd**, so running in the repo root re-imports the legacy
  `CF_API_TOKEN` even with a scrubbed environment (whoami from the root =
  unscoped API token; from `proto/archive` = OAuth). The working invocation is
  `env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN -u CF_ACCOUNT_ID
  -u CLOUDFLARE_ACCOUNT_ID wrangler …` **from a directory with no `.env`**
  (uploader.mjs pins `cwd` to `proto/archive` for every call).
- **R2 was simply available** — `r2 bucket create` succeeded first try on the
  free plan; no dashboard click was needed. Public access via
  `wrangler r2 bucket dev-url enable`, CORS via `r2 bucket cors set` (file
  must be `{"rules":[{"allowed":{…}}]}` — the S3-style array is rejected).
- **R2 single-part ETag == plain MD5** (proven) — free end-to-end verify with
  one HEAD; no download needed.
- **Playlist-as-close-signal**: ffmpeg's hls muxer appends a segment to the
  playlist only after the .ts is complete, so parsing `index.m3u8` beats
  watching file mtimes; `#EXT-X-ENDLIST` is the natural shutdown signal.
- The local HLS carries a single 720p rendition; replay.html's top-rendition
  lock degrades gracefully (one level). Burned-row decode from R2: 5116/5117
  frames (99.98 % — one low-contrast frame at a segment boundary; the Stream
  VOD run read 100 %). No transcode happens, so decode quality is bounded by
  the JPEG-80 screencast, not a re-encode.
- Cue spacing for measurement runs should use **fractional-second offsets**;
  integer seconds phase-lock to the engine's 100 ms poll grid and alias the
  error distribution (129 ms at locked phase vs 54–95 ms honest spread).
- Room cuelog is per-room and append-only — reuse a room name and the replay
  will load stale cues. `archive-test` was verified empty before the run.
  Since the review fixes, record-local defaults to a fresh
  `archive-test-<ts>` room per run (meta.room carries it to the measure
  script), so this footgun only exists behind an explicit `ROOM=` override.
- Kept CF resources: bucket `elektron-archive-test` (public dev URL enabled)
  containing only `shows/archive-test/*` (49 objects, 40.2 MB). Smoke debris
  (`shows/archive-smoke/*`, `smoke/smoke.txt`) deleted and 404-verified.
