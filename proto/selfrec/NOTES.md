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

---

# SYNC LEG (2026-08-27, session 7) — participant recordings onto the central timeline

Four pieces + regression. Same machine rules (port 8894, `selfrec` process
patterns, burned wall clock, plain node ESM, fetch-not-sendBeacon). elektron-rtc
used AS DEPLOYED (cue passthrough for media-span markers — choreography
precedent); elektron-selfrec is OURS to redeploy.

## Sync checkpoint 0 — plan (2026-08-27)

1. Worker: GET /time (tokenless, rate-safe, no storage ops) + POST /derived/
   upload route for repackaged artifacts → redeploy elektron-selfrec.
2. participant.html: 5× /time sample at join → skewEst via min-RTT; room WS
   (deployed elektron-rtc) media-span markers via cue passthrough:
   start/beat(10 s)/end. `pidbyte` param so two participants burn distinct IDs.
3. h264 probe in headless chromium → repackage.mjs (node+ffmpeg, copy vs
   transcode fMP4 HLS, 4 s, -fps_mode vfr for the 1 kHz-timebase trap) +
   indexer.mjs (pure-JS EBML cluster index — the no-ffmpeg CF path).
4. replay-grid.html (two tiles, one playhead, hls.js 1.7.1 vendored from
   proto/flipper) + run-sync.mjs regression R1–R4.

## Sync checkpoint 1 — worker redeployed + h264 probe verdict (2026-08-27 ~09:15 UTC)

- **elektron-selfrec redeployed, version 9f7e7a01** (same URL). New routes:
  - `GET /time` — TOKENLESS `{now: epoch ms}`, `cache-control: no-store`, zero
    storage ops, per-isolate rate guard 120 req/10 s → 429. Verified live.
  - `POST /derived/<show>/<pid>/<...>` — Bearer-authed upload lane for derived
    artifacts → `selfrec/<show>/<pid>/derived/<path>` (consent delete sweeps
    it too, same prefix). Verified: put + pub-URL readback + 403 w/o token;
    probe debris deleted.
- **h264 PROBE VERDICT: SUPPORTED.** HeadlessChrome 148 (macOS) says
  isTypeSupported=true for `video/webm;codecs=h264`, all avc1 profile
  variants, x-matroska+avc1, mp4+avc1, vp8/vp9/av1 — everything. So the sync
  scenario records **p1 = h264-in-webm (repackage = REMUX-ONLY -c copy)** and
  **p2 = vp8 (deliberate, to measure the transcode cost)** — both 3b variants
  land on real recordings in one run.
- participant.html grew (defaults preserve PROTO A behavior): `/time` 5×
  sampling at join (min-RTT offset → skewEst+rttMin, raw samples beaconed);
  room WS to DEPLOYED elektron-rtc w/ media-span markers as cue passthrough
  (kind:'media-span', payload also in cue.data; DO echo = ack — broadcast has
  no sender-skip, verified in source; un-echoed markers resent once on
  reconnect, same id); start marker at=T0recStart, beat/10 s, end after drain
  w/ final chunkCount+degraded; `pidbyte` + `mime` params.

## Sync checkpoint 2 — pieces built + smoke green (2026-08-27 ~09:35 UTC)

- Built: repackage.mjs (copy/transcode → fMP4 HLS 4 s → /derived upload),
  indexer.mjs (pure-JS EBML cluster scan, exported core `indexWebmBuffer`),
  replay-grid.html (two tiles/one playhead, linear + per-chunk-re-anchored
  mappings, in-page burned-row decoder, cue lane), run-sync.mjs (regression
  R1–R4), collector serves replay-grid.html + vendored hls.min.js 1.7.1.
- Local validation on a1-concat.webm (90 s vp8, 13 MB): transcode → h264 fMP4
  HLS in **2.1 s wall (ratio 0.023)**, 23 segs; indexer: **26 clusters
  (~3.5 s cadence, Chrome muxer), 8.4 ms/MB, 0 false positives**, timecode
  scale 1 ms, header 145 B.
- 15 s live smoke (show+room synccheck-*, debris deleted): **h264-in-webm
  RECORDS for real** (ffprobe: h264, 8 chunks, finalized clean); markers
  start/beat/end persisted in cuelog + 3/3 echo-acks; **skewEst +34 ms @
  rttMin 40 ms vs known-zero same-machine truth** — the min-RTT method's
  honest bias (edge/worker asymmetry), consistent across samples (34–39 ms
  at 40–56 ms rtt).

## Sync checkpoint 3 — regression run 1: 12/14, the re-anchor lesson (2026-08-27 ~09:30 UTC)

Run 1 (show sync-20260827T092612, stagger came out 5.2 s): recording, markers,
repackage, indexer all green. **R2/R4 failed — and the failure is the
finding**: the per-chunk re-anchored mapping (run-1 default) carries
byte→time interpolation noise of ±100–270 ms (clusters every ~3.5 s, VBR
bytes between them), which is BIGGER than the ~30 ms drift it corrects at
75 s scale. Linear (span.at + skewEst) decoded −29 ms at the tail vs
anchored +73 ms; anchored seek errs swung −213…+273 ms. Numbers that matter:
- repackage COPY (h264): **ffmpeg 75 ms for 75 s media — ratio 0.001**;
  transcode (vp8→h264): 1635 ms — ratio 0.022; copy is 22× cheaper wall,
  both trivially real-time-safe. Totals ~16-20 s dominated by download+upload.
- indexer on the real chunk sequences: 22 clusters each, 8.2/10.0 ms/MB, 0
  false positives, spans match manifests.
- R1 anchored: p50 92 / max 189 ms; R3 divergence at tail p1 −89 / p2 +132 ms.
FIX for run 2: replay default mapping = LINEAR (anchored stays, measured in
R3); p2 launch lead corrected (boot measured 1.4 s) for a true ~7 s stagger.
Run-1 show deleted after run 2 goes green. Re-anchoring verdict: only worth
it at hour scale, and then it wants a SimpleBlock-level index, not clusters.

## Sync checkpoint 4 — run 2: 13/14, the B-frame trap (2026-08-27 ~09:36 UTC)

Run 2 (show sync-20260827T093154, stagger 6.67 s, linear default): everything
green except R4 — by ONE ms on ONE cue, and the shape of the miss is the
finding: **tile A (h264 copy) errs +5/+2/−37 ms — essentially perfect; tile B
(vp8→libx264 transcode) errs −151/−122/−125 ms — a CONSTANT bias.** ffprobe
of the derived p2 rendition: `has_b_frames=2`, first pts +66 ms, dts shifted —
libx264 veryfast emits B-frames, the fMP4 muxer shifts the timeline by the
reorder delay, and hls.js does not apply the edit-list compensation → every
seek lands ~125 ms early. R2 passed but with the same −112…−125 ms bias on B
vs −27…−69 on A. R3 (both tiles now measured on linear): divergence tail
p1 13 / p2 27 ms — the ACTUAL drift at 75 s, matching the A5 30–50 ms/90 s
suspicion; anchored decode −61 vs linear −31 ms (anchored still noisier).
R1 p50 89 / max 123 ms. FIX: `-bf 0` on the transcode (pts==dts==source);
run 3 dispatched. Run-1 show deleted from R2 (122 objects).

## Sync checkpoint 5 — FINAL: run 3 = 14/14 GREEN (2026-08-27 ~09:40 UTC)

Show **sync-20260827T093613**, room **selfrecsync-20260827T093613**, stagger
6.82 s, p1 h264 / p2 vp8, 38 chunks each, clean finalize.

- **Skew** (/time, 5×, min-RTT): p1 +42 ms @ rtt 24, p2 +41.5 ms @ rtt 27
  (runs 1-2: 22–25 ms) — vs known-zero same-machine truth, so ±25–45 ms IS
  the method error envelope; estimator is stable within a run (±3 ms across
  samples) but the absolute offset wanders ~20 ms between runs → treat
  skewEst as ±50 ms grade, exactly the C5 "~±25 ms" claim's real-world shape.
- **Markers**: 21 cuelog entries; per pid start=1 beat=7 end=1, 9/9 echo-acks,
  start.at == T0recStartDate exactly, end carries final chunkCount+degraded.
- **Repackage** (both fMP4 HLS 4 s, 21 files): COPY 80 ms ffmpeg for 75.1 s
  media (ratio 0.0011); TRANSCODE (-bf 0) 1226 ms (ratio 0.0163) — copy is
  ~15-22× cheaper; both ~0.23-0.26 total ratio END-TO-END incl. R2 down+up.
  vp8→x264 crf22 also shrank 10.8→3.4 MB on this content.
- **Regression** (linear mapping default, band 150 ms):
  R1 inter-tile skew during play: **4/29/34 ms → p50 29, max 34** (target ≤100).
  R2 seeks: absent tiles absent both directions; present errs −29…−65 ms.
  R3 tail 73 s: linear decoded −64 ms vs anchored −100 ms; analytic
  divergence 33–56 ms ≈ the 30–50 ms/90 s drift — **at minute scale the
  re-anchor's interpolation noise eats its own correction; linear + skew
  wins. Re-anchor becomes worthwhile at hour scale w/ a SimpleBlock index.**
  R4 cues: engine fired +3-5 ms late; burned-clock errs A −33/−64/−68,
  B −40/−64/−68 — all well inside the 150 ms band.
  (Residual −30…−70 ms bias = skewEst(+40) applied to a truly-zero-skew pair
  minus the +20 ms anchor delta — the known constituents, nothing mysterious.)
- **Indexer**: 22 clusters per recording, 78/103 ms parse for 7.1/10.3 MB
  (**10-11 ms/MB**), 0 false positives. WORKER-CRON VERDICT: whole-show parse
  does NOT fit the free 10 ms CPU (a 75 s show alone is ~80-100 ms) but fits
  the paid 30 s cron ~300× over (≈3 GB ≈ 5 h of 1.2 Mbps per invocation);
  per-chunk incremental (~0.33 MB ≈ 3 ms) fits even free tier at upload/
  finalize. Memory: this impl concats whole show (10 MB « 128 MB Worker roof);
  production shape = chunk-at-a-time scan w/ 32 B carry. Range+MSE replay off
  the index NOT exercised here (hls.js derived path was) — stated honestly.
- **B-frame trap** (run 2, now fixed): libx264 defaults emit B-frames → fMP4
  timeline shifted by reorder delay (+66 ms first-pts) that hls.js doesn't
  compensate → constant −125 ms on every seek of that tile. `-bf 0` required
  for repackaged MediaRecorder streams.

### Kept / deleted (sync leg)

- KEPT worker: elektron-selfrec now **version 9f7e7a01** (adds GET /time +
  POST /derived; SELFREC_TOKEN unchanged).
- KEPT proof show: `r2://elektron-archive-test/selfrec/sync-20260827T093613/`
  — 122 objects, **27.7 MB** (2×38 chunks + 2 manifests + 2×21 derived HLS
  files + 2 index.json). Room cuelog persists in the elektron-rtc DO
  (selfrecsync-20260827T093613, 21 entries).
- DELETED: run-1 show sync-20260827T092612 (122 obj), run-2 show
  sync-20260827T093154 (122 obj), synccheck-* smoke (9 obj) — all via
  POST /delete. PROTO A's a1 kept show untouched (12.5 MB verified).
- Local: artifacts/sync-report.json (+.run1/.run2 archived for the two
  lessons), artifacts/sync-cuelog.json, logs/sync-r*.png screenshots,
  results/selfrec-sync.jsonl. All selfrec processes dead, :8894 free,
  scratch UDDs removed.

# PLAYBACK LEG (2026-08-27, session 6c) — participant-archive playback layer

Four pieces on top of the kept proof show sync-20260827T093613 (REUSED, no new
recording): postshow runner (engine seed), replay-grid from show.json + scrubber
UI, no-ffmpeg masters replay (Range+MSE), SimpleBlock-level index (hour-scale
re-anchor question). Same machine rules (port 8894, selfrec patterns).

## Playback checkpoint 1 — postshow runner green (2026-08-27 ~10:11 UTC)

- **elektron-selfrec redeployed, version 81c20db7** (same URL): adds
  `POST /show/<show>` -> `selfrec/<show>/show.json` (Bearer; show-level key
  that no participant-scoped route could write; consent delete sweeps it).
  Verified: 403 w/o token, put + pub readback; probe debris deleted.
- repackage.mjs + indexer.mjs refactored into module+CLI (exported
  `repackageParticipant` / `indexParticipant`; run-sync.mjs CLI spawn path
  unchanged). Block indexer core added (see checkpoint 4).
- **postshow.mjs** (the engine.mjs Session B call): /list -> pids UNION cuelog
  media-span sources (cuelog-only participant => degraded no-masters row);
  repackage+index only what's missing; show.json always rewritten (pure
  function of stored state). ROOM defaults to "selfrec"+SHOW (run-sync
  convention). Cuelog unreachable is non-fatal (skewEst null, cuelogOk:false).
- **Proof-show numbers**: run 1 (nothing to do) 1537 ms, all
  skipped — IDEMPOTENT. run 2 FORCE=1 (full pipeline, overwrite same keys):
  **37,726 ms end-to-end** for 2×75 s participants = p1 copy (ffmpeg 219 ms,
  dl 4.3 s, ul 6.9 s) + p2 transcode (ffmpeg 1229 ms, dl 4.9 s, ul 7.5 s) +
  2× index (~5.2 s each, dominated by re-download). run 3: skipped again,
  1406 ms. Engine note: repackage and indexer each download the chunks
  (~4.5 s×4 of the 37.7 s) — sharing one download per pid would cut ~9 s.
- show.json readback: both pids, T0==marker start.at (t0MatchesMarker true),
  skewEst 42/41.5 carried from cuelog, hls/masters/index/manifest refs.

## Playback checkpoint 2 — RECONCILE mode (scope addendum) (2026-08-27 ~10:25 UTC)

"Studio doesn't always run; chunks arrive late; what does it resume?" —
`node postshow.mjs --reconcile` sweeps ALL of selfrec/ (new tokenless-arg
`GET /list` = whole prefix; worker **version 381acbe8**) and computes
desired-vs-actual per participant. R2 is the ONLY truth; every derived
artifact is reproducible from masters.

**STATE MODEL** (masters = chunk-*.webm + manifest.json; derived/* and
show.json are our own writes and NEVER reset the settle clock — else the
sweep would inhibit itself):

| state | action |
|---|---|
| deleted.marker present, prefix otherwise empty | noop (tombstoned) |
| deleted.marker + ANY other objects (zombie drain) | re-delete prefix (resurrection-blocked); NEVER derive |
| any pid's newest master younger than SETTLE_MIN (10 min default) | whole show deferred ("settling" — a partial show.json would be wrong-but-plausible) |
| chunks, NO manifest (tab died pre-finalize) | synthesize manifest: mime SNIFFED from chunk-0 EBML (V_MPEG4/ISO/AVC etc.), dur=n×timeslice estimated, degraded+finalized:false+seq gaps in missing[]; then derive |
| manifest missing listed chunks (post-finalize late arrivals) | extend manifest (lateSeqs, closeT null, degraded); RE-derive (stale) |
| show.json row != listing, unexplained | re-derive pid (derived vintage unknowable — conservative, converging) |
| derived or show.json missing | plain postshow derive |
| everything matches | noop |

- Tombstone: POST /delete now writes `deleted.marker` after the sweep
  (consent deletes survive late uploads); `?tombstone=0` purges marker+all
  (test debris only).
- **Proof (all on live R2)**: sweep run A derived the a1 show (legitimately
  underived PROTO A keep: transcode 1501 ms/90 s + 26-cluster index +
  show.json — a real reconcile find, +3.9 MB); run B **0 actions, 1042 ms
  wall, one 331 ms listing of 198 objects**. Demo show rczdemo-20260827
  (COPY of sync p1 chunks, kept proof untouched): 37 chunks no-finalize →
  default gate said "settling 5s old" (rule 1); SETTLE_MIN=0 →
  synthesize-manifest (mime sniffed h264 → copy remux) + derive + show.json
  (rule 3); +1 late chunk → extend-manifest +re-derive, show.json
  chunkCount 37→38 lateSeqs:[37] (rule 2); re-run 0 actions (rule 5);
  tombstone + zombie chunk → resurrection-blocked re-delete, then
  tombstoned-noop (rule 4); purged with ?tombstone=0 (count 0 verified).
- Sweep cost at current bucket size (~200 objects, 3 shows): list 330-500 ms,
  no-op sweep ~1.0-1.4 s wall total.

## Playback checkpoint 3 — replay-grid promoted to ?show= (2026-08-27 ~10:17 UTC)

- replay-grid.html boots from `?show=<id>`: show.json = spans (T0/skewEst/
  dur/refs), room cuelog = CUE LANE ONLY (unreachable cuelog degrades to an
  empty lane, not a failure); `?room=` legacy path kept intact (run-sync
  regression still drives it). New transport UI: play/pause button, scrubber
  with click-to-seek + per-span underlay bars + cue ticks (fired ticks
  recolor), time readout, last-crossed-cue display. Absent-tile rendering
  kept. buildAnchors skips closeT:null rows (synthesized manifests).
- **verify-replay.mjs headless vs proof show — 5/5**:
  - R1-style inter-tile skew through the NEW loading path: **p50 4 / max
    33 ms** (samples 0/4/33; target ≤100; run-sync's own-orchestration run
    was p50 29 / max 34 — the show.json path is equal-or-better).
  - 2 SCRUBBER seeks (real mouse clicks on #scrub): burned-clock errs
    30 s: p1 −49/p2 −51 ms, 70 s: p1 −65/p2 −41 ms — all in the 150 ms
    band. Scrubber pixel quantization measured −49/0 ms (≈600 px for 84 s
    → ~140 ms/px; the clicked-T is the grid's own truth, so this is UI
    resolution, not sync error).

## Playback checkpoint 4 — the no-ffmpeg masters path VERDICT (2026-08-27 ~10:26 UTC)

replay-masters.html: untouched WebM masters via cluster index + HTTP Range
(206 + CORS proven on the pub URL) + MSE, fresh MediaSource per seek so
bytes-per-seek is honest; init = logical bytes [0, headerBytes), media =
[cluster(<=t), cluster(>t+8 s)) mapped through manifest chunk sizes to
per-object Range fetches; timestampOffset stays 0 (webm cluster timecodes
ARE span time). verify-masters.mjs, split verdict:

- **p2 (vp8): WORKS, and beats the derived-HLS path on accuracy.** Seek errs
  **+11/+5/+5 ms** vs T0+t at 10/40/70 s (vs −29…−69 ms through hls.js —
  no skewEst bias applied here, and MSE lands frame-exact); bytes/seek
  **1.1–2.0 MB = 10.4–18.8 % of the 10.6 MB full file** (5–8 range reqs,
  0.9–1.3 s cold-seek wall incl. R2 RTTs); ZERO back-steps — every cluster
  starts on a keyframe (block index: 22 keyframes == 22 clusters).
- **p1 (h264-in-webm): MSE REFUSES the mime.** Chrome
  MediaSource.isTypeSupported=false for ALL of: video/webm;codecs=h264,
  ;codecs="h264", ;codecs="avc1.42E01E", video/x-matroska;codecs="avc1.42E01E",
  bare video/webm — even though MediaRecorder RECORDS h264-in-webm and
  <video> plays it. The 1 kHz-timebase fight never happens; it dies at the
  door. **Consequence: h264-in-webm masters (the 22× cheaper repackage) have
  NO in-browser MSE replay — they need the ffmpeg remux (80 ms/75 s) or a
  JS webm→fMP4 transmux. vp8 masters need no ffmpeg at all.**

## Playback checkpoint 5 — SimpleBlock index: the hour-scale answer (2026-08-27 ~10:26 UTC)

- indexer.mjs `--blocks` (BLOCKS=1): walks validated clusters' children by
  element size (SimpleBlock 0xA3 rel-int16 + keyframe flag; BlockGroup 0xA0
  handled w/ ReferenceBlock detection, keyflag −1 if undetectable) →
  derived/index-blocks.json, columnar [tMs, byteOffset, keyflag].
  Validation: a1-concat gives **2591 blocks == the ffprobe-verified 2591
  real frames** (A5), gaps p50 33 ms, 0 bails.
- Proof-show cost: p1 2132 / p2 2142 blocks, block walk **+1 ms** on top of
  the ~86-105 ms cluster scan (total 10.2-12.2 ms/MB), index **38.0/38.5 KB
  ≈ 1.8 MB per media-hour** (~20× the 1.8 KB cluster index; still trivial).
- **R3 re-run** (verify-replay V4, tail 73 s): block anchoring cuts the
  anchored-vs-linear mapping divergence from **±33-72 ms (cluster interp)
  to 15-22 ms** — the ±100-270 ms interpolation noise is GONE; the residual
  is closeT jitter + true drift. Decoded seek err at tail: linear −64/−69,
  cluster-anchored −100/−99, **blocks −64/−99** — at 75 s scale block
  anchoring TIES linear on p1 and is one 30 ms frame worse on p2, so
  **linear+skew still wins at minute scale — but the mechanism now works**:
  with mapping noise ~20 ms < the 30-50 ms/90 s drift rate, block-anchored
  mapping overtakes linear once accumulated drift clears ~50 ms (≈2-3 min
  of show) and is the required tool at hour scale (drift extrapolates to
  1.2-2 s/h vs the flat ~20 ms block-anchor residual). Number reported
  either way, as asked.

### Kept / deleted (playback leg)

- KEPT worker: elektron-selfrec **version 381acbe8** (adds POST /show,
  bare GET /list sweep, delete-tombstone + ?tombstone=0 purge).
- KEPT proof show: sync-20260827T093613 masters UNTOUCHED (38+38 chunks +
  2 manifests byte-identical); derived/hls re-generated in place by the
  FORCE run (same keys), + NEW: show.json (2 KB), 2× index-blocks.json
  (76 KB). Room cuelog untouched. a1-20260827T083642 masters untouched +
  NEW derived/hls + index.json + show.json (+3.9 MB, the reconcile run-A
  find). **R2 selfrec/ total: 198 objects, 44.2 MB; net additions this leg
  ≈ +4.0 MB** (budget <50 MB).
- DELETED: rczdemo-20260827 (all phases + tombstone, ?tombstone=0,
  list count 0 verified), showprobe-test (1 obj). Scratch UDDs + test
  scripts removed; :8894 free; no selfrec processes (ps-verified).
- Files: NEW postshow.mjs (+reconcile), replay-masters.html,
  verify-replay.mjs, verify-masters.mjs; MODIFIED repackage.mjs +
  indexer.mjs (module+CLI refactor, --blocks), replay-grid.html (show-mode
  + transport UI + blocks mapping), collector.mjs (+replay-masters route),
  workers/selfrec/src/index.js. Reports: artifacts/playback-report.json,
  results/selfrec-playback.jsonl, logs/playback-*.png.

## Checkpoint — replay-grid adopts timeline/transport.mjs (2026-08-28)

replay-grid.html's hand-rolled replay is GONE; the playhead is now the shared
library's (`timeline/transport.mjs` v0.2, the same file timeline/lab measures —
collector.mjs aliases `/timeline/*` to the repo, never a copy). This is the
library's SECOND kind mix, and the one that mattered: media spans + a cue lane,
with per-tile `<video>` elements as clock masters.

- **Two adapters, no glue.** `media-span` — `actuate` = seek/play a tile
  element; `caps` declare the honest limits of an HTMLMediaElement slave
  (`seekAccuracyMs: 40`, `rates: [1]`, `rateNudge: [0.94, 1.06]`,
  `clockMaster: true`, `catchUp: 'reduce'`); `reduce(payloads, pos)` = the set
  of tiles PRESENT at pos; `assertState` = hard-seek every tile to u(pos).
  `cue` — `actuate` = fire + decode both tiles, `catchUp: 'burst'` (a cue is a
  note, never silently dropped), `reduce` = the fired set ≤ t, `assertState` =
  `firedIds` (the rewind semantics, previously hand-rolled).
- **Master clock stays the media element.** The first present tile is the clock
  master, is never rate-nudged, and the library's vector is SLAVED to its
  `currentTime` via the new `transport.sync(pos, {toleranceMs})` — a re-anchor
  with NO seek semantics (no reconcile, no re-assert, nothing re-fires; only
  committed timers are re-armed). Every other tile servos to the library's
  position. A stalled master (no `currentTime` advance for 1 s) releases the
  role and the deck free-runs on the wall clock. Slaving is enabled only for
  the `linear` mapping — `anchored`/`blocks` are not invertible T→u.
- The rAF loop is now PURELY the video servo + paint. The cue lane runs on the
  library's worker tick host, so it survives a backgrounded tab — the old rAF
  cue engine could not (lab: rAF p95 9.2 s hidden).

**Verification — `node verify-replay.mjs`, 5/5 PASS (was 5/5).**
- **V3 scrubber seeks: IDENTICAL, to the millisecond.** 30 s (px quant −49 ms):
  p1 −49 / p2 −51; 70 s (quant 0): p1 −65 / p2 −41. Same as the pre-adoption
  run. Seek accuracy is a property of the media element, and the library did
  not touch it.
- **V2 inter-tile skew MOVED: p50 4 → 29 ms, max 33 → 34 ms** (samples 0/29/34
  vs 33/4/0), target ≤100 ms, still passing. The mechanism is real and worth
  recording: under the old wall-clock playhead BOTH tiles chased the same
  external clock, so their errors were *correlated* (old tileErr −45…−78 ms on
  both) and their mutual skew was smaller than either's absolute error. With a
  media-element master, p1 sits at zero by definition and the ±40 ms rate-nudge
  dead band IS the skew budget. Tightening the band to ±20 ms (`SERVO_BAND_MS`)
  brought max back to 34 ms = ONE 30 fps frame, which is the physical floor.
  Absolute tile error improved on the slave (p2 −29…−68 vs −56…−78 before).
- V1 boot and V4 (linear vs cluster- vs block-anchored at the 73 s tail:
  linear p1 −64 / p2 −69, cluster −100/−99, blocks −64/−99, linear still wins)
  are unchanged — the mapping arithmetic was not touched.

**SECOND LATENT BUG FOUND (the jam finding repeats).** Measuring the old path
before replacing it, per the jam lesson:
- *Firing offset:* the rAF cue engine fired one frame LATE — +0.2 / +15.5 /
  +14.7 ms on the three cues (it fires on the first frame at/after `c.at`, so
  the error is 0…16.7 ms, unbounded on a dropped frame and infinite in a hidden
  tab). The library's drift channel now reports +1.9 / +2.5 / +1.2 ms for the
  same cues, and reports it AT ALL, which the old path never did.
- *Forward seek burst (the real bug):* `__seekWall` rebuilt `firedIds` from
  `S.fires` — records of what had ALREADY fired — instead of from `S.cues ≤ T`.
  On a fresh page nothing has fired, so `firedIds` was empty and a forward seek
  past cues made every skipped cue fire at once. Measured on a fresh boot,
  seek past all three then play: **3 cues burst, 45.0 s / 25.0 s / 5.0 s late.**
  That is exactly the lab's `seek-no-skipped-fires` assert — the one the
  fan-out graveyard arm fails — live in a shipped demo. Post-adoption, same
  test: **0 fires** (the library's `reconcile()` marks the skipped window
  `passed`).
- Files: MODIFIED replay-grid.html (−1 hand-rolled transport, +2 adapters),
  collector.mjs (+`/timeline/*` route). Cleanup: :8894 free, no selfrec
  processes, scratch UDDs removed.

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

## replay-grid: the clock-master block is now the library's — and it had a bug

**A live bug, found by review and fixed here.** `replay-grid.html`'s
hand-written clock-master block called `deck.sync()` **unconditionally**:

```js
const corr = deck.sync(mediaT, { toleranceMs: SYNC_TOL_MS });   // no jump check
```

There is no jump-vs-drift discrimination in that line. The cue kind on this page
is `catchUp: "burst"` (a cue is a note, never silently dropped), so any
**discontinuity** in the master tile's `currentTime` — an external scrub of the
`<video>`, an hls.js recovery jump, a gap skip — slid the vector across every
cue in between with a `sync()`, leaving them all `pending`, and the lookahead
fired ALL of them at once on the next tick. That is exactly the
burst-every-skipped-cue bug this page's own adoption of the library had already
fixed for the SEEK path (`__seekWall` → `deck.seek` → reduce + assertState). It
was still open on the MASTER path, because that path was hand-written.

`proto/replay/replay.html` had the fix (`if (Math.abs(d) > JUMP_MS) deck.seek()`).
Two copies of one law, one of which had lost half of it — so the law moved into
the library as **`timeline/media-master.mjs`** and both pages now call it:

```js
mmaster = mediaMaster(deck, () => { … pick the usable tile … return {el, pos, key}; }, {
  toleranceMs: 40, jumpMs: 250, stallMs: 1000,
  stallPolicy: "release",     // N tiles: free the role, re-pick / free-run
  autoPlayPause: false,       // this page owns play/pause (the scrubber does)
});
function loop() { …; driveFromMaster(); …; requestAnimationFrame(loop); }
```

Laws (L1 never nudge the master · L2 sync inside tolerance, **SEEK past
`jumpMs`** · L3 a stall releases the role · L4 `timeupdate` is the hidden-tab
backstop · L5 a paused/ended/seeking element is not a clock). `proto/replay`
uses the same helper with `stallPolicy: "hold"` — one video, so a stall must
stall the playhead rather than release the role.

### `node proto/selfrec/verify-replay.mjs` — **6/6** (was 5/5)

V1–V4 unchanged and passing (boot 2 spans + 3 cues; inter-tile skew p50 **0 ms**;
scrubber seeks p1 −49/−65 ms, p2 −51/−41 ms inside the ±150 ms band; block
anchoring re-measured at the 73 s tail). The new one is the regression this
chore exists to prevent:

**V5-master-jump-folds-not-bursts** — `window.__jumpMaster(T)` (new test hook)
sets the MASTER tile's `currentTime` discontinuously, without telling the deck:
exactly what an external scrub or an hls.js recovery jump looks like from here.

| | measured |
|---|---|
| jump | master `p1`, **+61 189 ms**, over all three cues (`RCUE-20, RCUE-40, RCUE-60`) |
| burst fires | **0** (the assertion; the pre-adoption code bursts here) |
| folded fired set | `RCUE-20, RCUE-40, RCUE-60` — the skipped cues are *state*, not *events* |
| reported | one `{reason:"jump", jumpMs:61189}` in `S.masterEvents` (`__masterInfo()`, `__deckStats().mediaMaster`) |
| playhead | landed within 2.6 s of the jump target |

The library-level negative control is in `timeline/lab/prop-nested.mjs`
(`media-master/control`): on a virtual clock, `deck.sync()` across a 9 s gap
bursts **9 of 10** cues on a `catchUp:'burst'` lane; `mediaMaster()` on the
identical gap bursts **0** and folds all 9. That is the bug, reproduced and
fixed, deterministically, in node.

New page hooks: `window.__jumpMaster(T)`, `window.__masterInfo()`,
`S.masterEvents`, and `mediaMaster` stats inside `__deckStats()`.
