# Item 7 — edge lag via LL-HLS blocking playlist reload

Agent notes. Checkpointed after every step. Owner: input `4c93bc4b…` + `rig/push-llhls.sh` encoder.
Do-not-touch: relay stack + `5cfa5053…`, whep `224558e8…`, ports 8897/8898/8900.

Goal: replace the polling edge-lag metric (lower bound only — conflates edge lag with
playlist staleness) with blocking reload (`_HLS_msn`/`_HLS_part`): the edge holds the
response until the requested part exists, so response arrival == availability moment.
edge_lag = t_arrival_corrected − (PDT(msn) + (part+1)×PART-TARGET). Report p50/p95 over
≥50 parts + delta vs polling method.

CLOCK: system clock ~+159 ms fast per dispatch, cannot step (no sudo). Sample
`sntp time.apple.com` immediately before AND after each run; subtract mean offset in
analysis; residual uncertainty ~±25 ms.

---

## Checkpoints

- [start] Context read: plans/plan.md (§1 blocking-reload rationale, §2.1 LL tag set, §5 clock),
  PROGRESS.md (midday ground truth + session-2 dispatch), rig/edge-lag.sh (polling metric:
  edge = last_PDT + tail_parts×0.5, lag = t1 − edge), rig/push-llhls.sh (reads /tmp/li_key.txt,
  burns encoder epoch, writes epoch.txt to an OLD session scratchpad path — note: scratchpad
  path in that script is from a prior session; must verify it exists or the script dies).
  Next: env checks (battery, /tmp/li_uid.txt, /tmp/li_key.txt, .env, sntp baseline).
- [env] Battery: AC power, charging (7%) — long runs allowed while charging; re-check
  before each run. `/tmp/li_uid.txt` + `/tmp/li_key.txt` were GONE (tmp cleared since
  session 1) — restored via API: input `4c93bc4b4809c29b03cc60fd8add29df`
  (latency-rig-llhls, preferLowLatency=true, timeoutSeconds=10). Key not logged; file
  chmod 600. `.env` holds only CF_ACCOUNT_ID/CF_API_TOKEN/realtime pair — no uid there.
- [clock t_pre-session] sntp: `+0.157835 ± 0.016362 time.apple.com`,
  `+0.158626 ± 0.016125 time.cloudflare.com` — clock ~+158 ms FAST (matches dispatch
  ~+159). Convention (per plans/plan.md §5): positive = local ahead of true UTC.
  Correction: corrected_lag = raw_lag − offset. Will re-sample immediately
  before/after each measurement run.
- [fix] `push-llhls.sh` SCRATCH pointed at a dead prior-session scratchpad (dir gone;
  `set -e` would abort). Changed to env-overridable default = current scratchpad +
  `mkdir -p`. No other changes to the encoder.
  Next: write rig/edge-lag-blocking.sh (wrapper; leaves polling edge-lag.sh intact for
  the A/B), then start encoder + short run.
- [build] Wrote `rig/edge-lag-blocking.py` (kept `edge-lag.sh` untouched for the A/B).
  One process, one persistent HTTPS conn (keep-alive → no per-request TLS handshake in
  the block-duration numbers), `time.time()` immediately after response headers =
  t_arrival. Bootstrap: master?protocol=llhls → child → parse MEDIA-SEQUENCE /
  PART-INF / TARGETDURATION / per-segment PDT / per-segment part counts → next
  (msn,part). Loop: GET child + `_HLS_msn=&_HLS_part=`, raw_lag = t_hdr −
  (PDT[msn] + (part+1)×PART-TARGET) — same edge convention as edge-lag.sh (end of last
  part), so directly comparable. Rows → JSONL (raw, uncorrected; sntp correction in
  analysis). Also records block_ms (t_hdr−t0) to prove the hold actually happens, and
  `contains` (response really has the requested part).
  Next: start encoder, wait for LL manifest, smoke run N=8.
- [encoder] First start (pid 2885) DIED ~10 s in (flv trailer warnings = socket
  closed; cause unknown, possibly transient network — machine just came off a
  2%-battery emergency). Restart (pid 3409) survived 30 s, manifest 200/1635 B.
  As expected each start mints a new broadcast (videoUID 5bdab6b1… this time).
- [smoke N=8] ✅ Blocking reload WORKS on Cloudflare. Child URL that CF itself hands
  out already carries `blockReload=true`. block_ms = 182–1183 (median ~416) — the
  server demonstrably holds ~one part-duration per request; every response contained
  the requested (msn,part); 0 non-200. raw_lag (uncorrected) p50 777 ms over 8 parts
  INCLUDING startup transient (one 1.39 s outlier where parts 1–3 of seg 13 appeared
  in one playlist publish — a real burst, not an instrument error).
  Two parser findings: (1) TARGETDURATION=3 but real segments are 4×0.5 s parts →
  parts/seg guess wrong at segment boundaries; (2) EXT-X-PRELOAD-HINT names the exact
  next part (`seg_N_part_P`). Fixed: next target now comes from the response's
  PRELOAD-HINT (authoritative), fallback to counting. Also avoids ever requesting a
  part that will never exist (unknown CF hold/timeout behaviour).
  Next: re-smoke with hint logic, then main run (sntp → blocking N=80 → sntp →
  polling edge-lag.sh 20 → sntp), ≥60 s after encoder start to skip warm-up.
- [smoke2 N=6] Hint-advance works (correctly skipped burst-published parts, incl. a
  whole segment 56 that was never part-advertised). BUT: parts arrived in BURSTS
  (2.2 s hold then 3–4 parts at once); raw_lag spread 0.26–2.87 s. Not lowpowermode
  (off), no thermal warning.
- [encoder death #2 + root cause candidate] My encoder (pid 3409) was found DEAD right
  after smoke2 — and the Item 2+8 agent's relay stack is NOW RUNNING (3 ffmpeg procs
  pushing to 5cfa5053…, /tmp/rig-ts.fifo). Both of my encoder deaths coincide with
  their stack activity; relay harnesses historically `pkill ffmpeg` broadly. Same log
  signature both times (flv trailer flush = clean-ish termination, consistent with
  SIGTERM). ⚠️ inferred, not proven. Smoke2's burstiness may also be CPU/network
  contention from their stack starting up — re-judge in steady state.
  Mitigation (no touching their resources): copied ffmpeg@7 binary to scratchpad as
  `edgelag-enc`; made FF env-overridable in push-llhls.sh (only change: hardcoded path
  → `FF=${FF:-…}`). My encoder now runs under a name broad ffmpeg pkills won't match.
  Next: relaunch encoder via edgelag-enc, verify 60 s survival, then main run.
- [dead end + encoder death #3 explained] The renamed-binary dodge FAILS: the copied
  `edgelag-enc` dies instantly and silently (`-version` prints nothing, empty log) —
  exactly the ThreatLocker endpoint-control pattern from plans/plan.md §15 ("silent instant
  process death with zero forensics"). Unapproved binary path = killed. So "death #3"
  was ThreatLocker, not a pkill. Reverting to the approved /opt/homebrew ffmpeg@7 path
  (FF default unchanged). New mitigation: babysitter loop in scratchpad that restarts
  push-llhls.sh whenever no process matches my stream-key suffix `k4c93bc4b…`
  (pattern can never match the relay agent's ffmpeg, which pushes k5cfa5053…).
  Restarts logged with timestamps → any measurement overlapping a restart is invalid
  and rerun (a restart also mints a new broadcast → my per-broadcast child URL goes
  204 → the measurement fails loudly, not silently).
  Next: babysitter up → warmup 60 s → MAIN RUN 1: pmset, sntp, blocking N=70, sntp.
- [babysitter] Up (pid 3977), pattern `live/[0-9a-f]*k4c93bc4b` (cannot match relay's
  k5cfa5053 push). Encoder death #4 at ~22:13 (2.5 min into broadcast 3) — babysitter
  restarted within 5 s. Restarts logged: 22:10:38, 22:13:04.
- [tooling bug] First run-1 attempt never started: macOS `ps` has no `etimes` keyword
  → warm-up until-loop condition always empty → spun for the whole 5-min timeout.
  Fixed with `etime` parse. Lesson: BSD ps ≠ GNU ps.
- [RUN 1 ✅ blocking N=70] Encoder broadcast 4 (started 22:13:04), run at uptime
  ~4.5 min, battery 27% charging AC. NO restarts during run, encoder alive after,
  70/70 http=200, contains=True all, 0 missing.
  sntp PRE  +0.055425 ± 0.022158 (22:17)  |  sntp POST +0.057253 ± 0.027445
  ⚠️ CLOCK MOVED between session start and run 1: +158 ms → +55 ms in ~15 min
  (−7 ms/min >> documented 0.4 ms/min drift ⇒ timed stepped/slewed after AC power
  came back). Pre/post agree within 1.9 ms ⇒ stable DURING the run. Correction for
  run 1 = mean +56.3 ms.
  RAW:       p50= 905.7 ms  p95=2182.9 ms  min=734.8  max=2803.6  (n=70)
  CORRECTED: p50≈ 849 ms    p95≈2127 ms    (−56.3 ms, residual ±25 ms)
  block_ms: p50=421, p95=1734, min=73, max=1908 → server demonstrably HOLDS
  (~part cadence); blocking works.
  Pattern: steady state ~0.75–0.98 s; recurring stall-then-burst (block 1.2–1.7 s,
  then PRELOAD-HINT skips over parts published in the same playlist write — often
  the LAST part of a segment is never individually advertised, hint jumps to next
  segment's part 0). raw JSONL → results/edge-lag-blocking-1.jsonl.
  Next: polling comparison (edge-lag.sh 20) on the SAME broadcast, sntp bracketed.
- [POLLING RUN ✅ edge-lag.sh 20, same broadcast 4] sntp PRE +0.055125 ± 0.023426,
  POST +0.054449 ± 0.021853 (one server .43 timed out both times; .35 answered —
  values consistent with run 1). Correction +54.8 ms.
  RAW edge_lag: 2.80–3.32 s (p50 3.16), last_PDT_age steady 4.06–4.33 s,
  tail_parts 2–3. CORRECTED p50 ≈ 3.11 s.
  → Polling reads ~2.3 s HIGHER than blocking truth on the same broadcast.
- [ROOT CAUSE OF POLLING STALENESS ✅ observed] Child playlist probe (6 fetches,
  400 ms apart, headers captured): `cache-control: no-cache, no-store` and NO
  cf-cache-status — not classic caching. But successive responses BOUNCE between
  playlist revisions ~1.5–1.9 s apart in freshness; PRELOAD-HINT went BACKWARDS
  between consecutive fetches (212/1 → 211/3 → 213/0 → 213/1 → 212/3 → 214/0);
  tail-media-end age alternated 0.80–1.02 s (fresh replica) vs 2.66 s (stale
  replica). ⇒ Non-blocking playlist GETs are served by MULTIPLE edge replicas with
  different freshness; a poller's "edge lag" = true lag + whatever replica staleness
  it happens to draw (0.8–3.3 s observed today). Blocking requests cannot return a
  stale revision by construction (server must hold until the requested part exists).
  This also explains session-1's 0.87–1.23 s "polling" numbers: lucky fresh replicas;
  and session-2's 1.05–3.24 s spread: replica lottery, not clock.
  Next: RUN 2 (blocking N=70, sntp bracketed) for repeatability, then analysis with
  clock correction, then teardown.
- [RUN 2 ✅ blocking N=70, same broadcast 4] Battery 33% charging. sntp PRE
  +0.053909 ± 0.021088, POST +0.053755 ± 0.019026 (correction +53.8 ms).
  70/70 http=200, all contains=True, no restarts. RAW p50 891.7 / p95 1919.4.
  → results/edge-lag-blocking-2.jsonl.

## RESULTS (clock-corrected; residual uncertainty ±25 ms)

| run | n | offset applied | p50 | p95 | p99 | min | max |
|---|---|---|---|---|---|---|---|
| blocking 1 | 70 | −56.3 ms | 849 ms | 2127 ms | 2747 ms | 678 | 2747 |
| blocking 2 | 70 | −53.8 ms | 838 ms | 1866 ms | 1956 ms | 667 | 1956 |
| **combined** | 140 | | **842 ms** | **1951 ms** | 2191 ms | | |
| polling (edge-lag.sh 20) | 20 | −54.8 ms | 3125 ms | 3265 ms | | 2745 | 3265 |

- **TRUE ingest→edge lag: p50 ≈ 0.84 s, p95 ≈ 1.95 s** (per-run medians agree
  within 12 ms — excellent repeatability). Plan §1's "~1 s lower bound" was in fact
  approximately right as a MEDIAN; the tail is ~2 s.
- **Blocking proven**: 99–100 % of requests held ≥150 ms, 93–96 % ≥300 ms,
  block p50 ≈ 425 ms ≈ part cadence (0.5 s); every response contained the requested
  (msn,part); non-blocking probes meanwhile bounced between replica revisions —
  blocking responses can never be stale by construction.
- **Polling overestimates by ~2.3 s here** (3.13 s vs 0.84 s p50) — and the morning
  sessions' 0.87–1.23 s polling numbers were the same instrument getting LUCKY
  replicas. Polling = truth + replica-staleness lottery (0…~2.5 s observed).
- **Anomaly (replicated in both runs): part index 2 of each 2 s segment is
  systematically late** — p50 ≈ 1400 ms vs ≈ 800 ms for parts 0/1/3, and parts 2/3
  are undersampled (hint skips) because the segment's back half often publishes as a
  burst with segment finalize. Periodic per-segment structure, present in both runs;
  cause unknown (x264 chunking? CF segmenter buffering the segment tail?).
- Encoder deaths #1/#2/#4 remain ⚠️ unexplained-but-mitigated (babysitter caught #4
  in <5 s; deaths coincide with sibling-agent stack activity; ThreatLocker explains
  only #3, the renamed-binary attempt).
- [teardown ✅] babysitter killed first, then encoder (broadcast ended, manifest 204
  — expected for this input). Relay agent's ffmpeg (k5cfa5053, pid 4524) verified
  untouched. sntp FINAL +0.052641 ± 0.020231. edgelag-enc copy removed.
  /tmp/li_uid.txt + /tmp/li_key.txt left in place (chmod 600) for future sessions.

## Files
- `rig/edge-lag-blocking.py` — NEW: blocking-reload measurer (hint-driven targets).
- `rig/edge-lag.sh` — UNTOUCHED (kept as the polling A/B reference).
- `rig/push-llhls.sh` — two minimal edits: SCRATCH env-overridable + mkdir -p
  (old path was a dead prior-session dir), FF env-overridable.
- `results/edge-lag-blocking-{1,2}.jsonl` — 140 raw rows (uncorrected; offsets above).
- Scratchpad: run1.log, run2.log, poll1.log, sntp-*.txt, babysit.log, push.log.
