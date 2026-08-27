# proto/selfrec — PROTO A: participant self-recording (MediaRecorder → Worker → R2)

Working notes / checkpoints. Port 8894, process prefix `selfrec`. Sibling
PROTO B (proto/centralrec, :8893) untouched.

## Checkpoint 1 — worker deployed + smoke green (2026-08-27 ~08:31 UTC)

- **Worker `elektron-selfrec` DEPLOYED: https://elektron-selfrec.kristjan-jansen.workers.dev**
  (version 57d220f0). Source `workers/selfrec/` (new — workers/rtc untouched).
- Routes (all Bearer `SELFREC_TOKEN`, secret set; token in
  `proto/selfrec/.env.selfrec`, gitignored via `.env.*`):
  - `POST /chunk/<show>/<participant>/<seq>` → streams body to
    `selfrec/<show>/<participant>/chunk-<seq%05d>.webm` in bucket
    `elektron-archive-test`. Optional `X-Chunk-Sha256` → R2 verifies
    server-side; PROVEN: mismatched body is REJECTED (error 10037), so a
    truncated upload can never land silently.
  - `POST /finalize/<show>/<participant>` → `manifest.json` under same prefix.
  - `GET /list/<show>[/<participant>]` → key/size/etag list (A3 verification).
  - `POST /delete/<show>` → deletes whole `selfrec/<show>/` prefix — the
    consent story in one call (smoke debris deleted this way, 3 objects).
- Public read via the bucket's existing dev URL
  `https://pub-b8d50fdb5f6a41dbba072e433903705d.r2.dev/selfrec/...` — HEAD
  shows Content-Length + ETag(==md5, single-part, proven in proto/archive);
  bucket CORS already allows GET/HEAD `*` (proto/archive/cors.json).
- Wrangler ran from `workers/selfrec` (no .env) with CF_*/CLOUDFLARE_* env
  deleted — whoami = OAuth, per the proto/archive trap notes.

## Checkpoint 2 — smoke + A1 + A5 green (2026-08-27 ~08:41 UTC)

- smoke (20 s): 10/10 chunks verified, lag p50 480 / p95 689 ms, non-degraded.
- **A1 baseline (90 s, show `a1-20260827T083642`)**: 45/45 chunks verified
  single-attempt; **upload lag (chunk close → HEAD-verified on pub URL) p50
  483 / p95 636 ms (min 396, max 711)** — ~11× faster than proto/archive's
  wrangler-CLI path (5.5 s p50), because the browser POSTs straight to the
  worker. Effective bitrate 1.167 Mbps (kbps=1200 requested). mem hwm 5.5 MB,
  queue hwm 362 KB (= one chunk), IDB hwm 0 (never touched in baseline).
- **A5 playback integrity**: 45/45 downloaded chunks md5==R2-etag; concat
  plays — 2591/2591 real frames decode the burned row (100 %); content span
  90 024 ms vs manifest 90 075 ms vs ffprobe last-pts 90.056 s — all agree.
  **ANCHOR DELTA: first burned frame − T0recStart(Date) = +20 ms**
  (+19.7 ms vs the perf-domain stamp; the two stamps agree to 0.3 ms).
  T0firstData is −1989 ms off — first ondataavailable is one timeslice late,
  NOT an anchor; **T0 at recorder.start() is the archive anchor**.
- ffmpeg decode gotcha: MediaRecorder webm = 1 kHz timebase, no fps → default
  CFR sync duplicated to 90 090 "frames"; `-fps_mode passthrough` gives the
  real 2591. (~28.8 fps effective from a 30 fps captureStream.)

## Checkpoint 3 — FINAL: A2/A3/A4 green, cleanup done (2026-08-27 ~08:47 UTC)

- **A2 offline window** (show `a2-20260827T084335`, 90 s, CDP
  Network.emulateNetworkConditions offline at t=30.1 s for 25 s): 13 chunks
  buffered in IndexedDB (**hwm 4,051,882 B / 13 chunks**), ZERO loss — all 45
  chunks verified in R2, non-degraded. **Backlog drained 6,816 ms after
  restore** (drain starts ~instantly on the `online` event; the 6.8 s is 13
  serialized upload+verify cycles ≈ 4.6 Mbps burst). attemptsTotal=45 → every
  chunk uploaded exactly once (offline chunks skip the doomed POST via
  navigator.onLine and go straight to IDB).
  - Fixed during A2 rev 1: (a) `online` handler now cancels the pending
    long-backoff timer and drains immediately (rev 1 sat out a stale 8 s
    timer → 7.0 s dead time); (b) drainedAt bookkeeping keyed on a
    hadBacklog flag, not offlineFailures (CDP offline flips navigator.onLine
    so no fetch ever "fails"). Rev 1 data was correct on resilience (zero
    loss) — only the drain stamp was missing. Rev 1 debris deleted.
- **A3 tab kill** (show `a3-20260827T084522`): SIGKILL at t=45.06 s of a
  planned 120 s (pids matched by own `selfrec-udd` pattern ONLY — 6 chrome
  procs). closed=22 = expected-by-wallclock; **all 22 already verified in R2
  at kill time (chunksLost=0)** — 0.5 s upload lag beats the 2 s cadence, so
  the in-flight window is usually empty. Concat of the uploaded prefix plays:
  1272/1272 frames decode. **Media lost = 790 ms** (kill 1787820368920 −
  last uploaded burned frame 1787820368130) = the accumulating timeslice
  only. ≤ 1 timeslice CONFIRMED.
- **A4 stop-publish tie** (show `a4-20260827T084626`, 30 s clean stop):
  15/15 chunks, finalize wrote the manifest, driver re-HEAD-verified every
  manifest chunk (15/15, sizes match), degraded=false, exit 0. (degraded
  path = missing[] + degraded:true in manifest + driver exit 2 —
  proto/archive pattern; not triggered, path exists in code.)
- Worker-side verify layer proven separately at deploy: X-Chunk-Sha256
  mismatch REJECTS the put (error 10037) — a truncated body can't land.

## Kept / deleted

- KEPT worker: `elektron-selfrec` @
  https://elektron-selfrec.kristjan-jansen.workers.dev (57d220f0, secret
  SELFREC_TOKEN; token in proto/selfrec/.env.selfrec, gitignored).
- KEPT proof show: `r2://elektron-archive-test/selfrec/a1-20260827T083642/p1/`
  — 46 objects = chunk-00000..00044.webm + manifest.json, **13,144,496 B**.
  Manifest: https://pub-b8d50fdb5f6a41dbba072e433903705d.r2.dev/selfrec/a1-20260827T083642/p1/manifest.json
- DELETED debris (all via POST /delete/<show>, spot 404-verified):
  smoke (11 obj), a2 rev1 (46), a2 rev2 (46), a3 (22), a4 (16) — R2 net kept
  = 13.1 MB, far under the 200 MB budget.
- Local: artifacts/a1-concat.webm (13 MB) is regenerable via `SCENARIO=a5
  node run-selfrec.mjs`; results in results/selfrec-{smoke,a1..a5}.jsonl;
  full report artifacts/selfrec-report.json. All selfrec processes dead
  (ps-verified), scratch UDDs removed.

## Comparison ammo (PROTO A side)

- Uplink cost: archive adds **1.167 Mbps measured** on a nominal 1 Mbps live
  publish (≈2.17 Mbps total per participant); post-outage drain bursts
  ~4.6 Mbps until the backlog clears.
- Source quality: encoded once, locally, from the raw stream — no transcode;
  md5 end-to-end green, 100 % burned-row decode.
- Failure isolation: one participant's death costs 790 ms of THEIR media,
  nothing else.
- Consent: forget-me = one prefix delete (proven 5× in cleanup).
- Anchor: **T0 = recorder.start() stamp; first-frame delta +20 ms.** Never
  anchor on first ondataavailable (−1989 ms = one timeslice late).

## Plan of record

1. participant.html — canvas 1280x720 + captureStream(30), burned binary
   clock row (same 64-block geometry as proto/replay show.html, PID byte 'P'),
   MediaRecorder vp8 timeslice 2000 ms; upload queue → worker; IndexedDB
   buffer on failure/offline; metrics beacons to 127.0.0.1:8894 collector
   (fetch, never sendBeacon).
2. collector.mjs (:8894) — serves the page + appends beacons to
   results/selfrec-<scenario>.jsonl.
3. run-selfrec.mjs — headless chromium (playwright, persistent ctx under
   scratchpad `selfrec-udd*`), scenarios A1..A5, CDP
   Network.emulateNetworkConditions for A2, ps-by-udd-prefix SIGKILL for A3
   (kills ONLY selfrec-udd processes).
