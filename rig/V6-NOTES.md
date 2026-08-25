# Player v6 — build + chaos validation (session 4)

Agent notes for the v6 fix (26 s park family). Checkpointed after every step.
Port **8899** is mine (collector). Own live input to be provisioned; delete at end.
Spec: CONFIG-ARM-NOTES.md checkpoints 8+10. Baseline traces: results/config-arm-session2.jsonl
(runs m2a/m2b), results/resilience-v5.jsonl (gap ladder).

---

## Checkpoint 1 — context read, backup made (2026-08-25)

Read plan.md (§10, §1, §8 Q6), CONFIG-ARM-NOTES.md (checkpoints 8+10 = the spec),
PROGRESS.md session 3, src/low-latency-player.js (v5), rig/{chaos.sh, resilience.html,
push-llhls.sh, collector.py, config-arm-resume.html}. Battery: AC, charging, 92%.

Plan of record:
1. `cp src/low-latency-player.js src/low-latency-player.v5.js` (no git — backup IS history).
2. v6 edits: split paused/readyState gate (re-play() when visible; starved branch keeps
   stall clock counting + hole-skip + escalate), onVisibility play(), drift-seek escalation
   (6 consecutive silent failures → rebuild('drift-seek-wedged')), pdtLatency in telemetry,
   flag-gated (default OFF) PDT-triggered drift.
3. Validate: own CF live input + own encoder + collector :8899 + adapted resilience page.
   (a) gap ladder 2/5/12/25/60 vs v5 (5/5, median 15.4 s, no storms);
   (b) SIGSTOP 8 s + 20 s — park must be gone (v5: 20.0 s and 18.5 s parks);
   (c) 5-min soak (2.4–3 s latency, no spurious rebuilds).
4. Watch targetLatency across stalls (plan §8 Q6: 1.5→2.5 bump, probable).

---

## Checkpoint 2 — v6 applied to src/low-latency-player.js (23:1x) ✅

Backup: `src/low-latency-player.v5.js` (335 lines). v6 = 401 lines, `node --check` clean.
Changes (all from CONFIG-ARM-NOTES checkpoints 8+10):
- tick() gate SPLIT: `paused` branch resets lastAdvance and (everPlayed && visible)
  re-requests play(); `readyState<2` branch KEEPS the stall clock counting — after
  stallTimeout it emits stall{kind:'starved'}, hole-skips to the first buffered range
  starting >0.1 s ahead (len >0.5 s), escalates to rebuild('starved') when
  failedSeeks > seeksBeforeReload or when no range exists and syncToEdge fails.
- drift branch: observes syncToEdge return; 6 consecutive silent failures →
  rebuild('drift-seek-wedged'); counter (failedDriftSeeks) in watchdog state +
  resetWatchdogs().
- onVisibility: after syncToEdge('visibility'), `if (video.paused) play().catch(()=>{})`.
- telemetry: `pdtLatency = (Date.now() - hls.playingDate?.getTime())/1000` added to the
  'latency' event payload.
- NEW cfg flag `pdtDriftTrigger` (default false): drift path also fires when
  pdtLatency-target > seekThreshold AND liveSyncPosition-currentTime > seekThreshold.
- header comment: v6 changelog + recovery-model lines for starved/drift-escalation.

Known behavioural deltas to watch in validation:
- During an outage after a rebuild, the paused-branch play() flips paused→false with
  readyState 0, so the starved branch counts and may add rebuild('starved') at ~6-9 s
  cadence on top of the manifestParsingError backoff ladder. Rate limit (3 s) applies;
  MUST count rebuilds per gap vs v5.

---

## Checkpoint 3 — rig up, v6 smoke test PASSED (23:40) ✅

- Provisioned MY OWN live input `56f462840d77c9aa078151809bbe3cac` (v6-validation-rig,
  preferLowLatency:true, timeoutSeconds:10). Key in scratchpad/v6_key.txt. DELETE AT END.
- Collector on :8899 (scratchpad/collector-v6.py, serves repo root, /collect + /event)
  → results/resilience-v6.jsonl. Encoder scratchpad/push-v6.sh (lavfi testsrc2 only,
  MY key = kill pattern). Page rig/resilience-v6.html: `?player=v5|v6` dynamic import
  runs BOTH versions through one harness; payload adds rebuilds, hlsTargetLatency (Q6),
  pdtWallLatency, evtPdtLatency, lsp/lspMinusCt, structured events.
- Ops traps hit: (a) `setsid` does not exist on macOS — detach via python
  subprocess.Popen(start_new_session=True); (b) a SIBLING agent's ffmpeg (pid 15532,
  p2_filt.txt, different key) shares this scratchpad — all kills stay scoped to MY
  key / MY chrome profile path.
- v5 BASELINE RECHECK: resilience-v5.jsonl is the broken-meter run (advancing never
  reset across rebuilds). Recomputed from raw currentTime deltas: 5/5, median 23.8 s,
  max 33.2 s — does NOT reproduce the recorded "median 15.4 s" (criterion unknown).
  Decision: re-run the ladder for BOTH v5 and v6 this session, same page + analyzer,
  and report the same-criterion numbers side by side.
- SMOKE (45 s, headless=new, visible): v6 plays at 1.83-1.86 s latency (target 2.5),
  0 rebuilds. Bonus: startup drift-seek landed in a hole (bufferSeekOverHole) and the
  NEW starved path fired at exactly stallTimeout: stall{kind:starved} → resync
  {reason:hole-skip, to:34.438} → healthy 6 s later. The v5 park would have sat there
  ~20 s. Mechanism works live.

---

## Checkpoint 4 — baselines pinned with the SAME analyzer (23:45)

Wrote scratchpad/analyze-v6.py (ladder | sigstop | soak | q6 modes; recovery = 3
consecutive RAW-currentTime-advancing samples from ingest_up; sigstop "stable" =
advancing AND pdtWallLatency <= target+3 PERSISTING >=10 s — hls.latency is disqualified
as a stable-signal because it freezes stale (GAP C), and a rebuilt instance can play
~2 s of fresh content before parking (false positive caught and fixed)).

v5 baselines under this analyzer:
- gap ladder (resilience-v5.jsonl, raw-ct recompute): 5/5, median 23.8 s, max 33.2 s,
  settled lat 1.7-3.8 s. (Recorded "median 15.4 s" not reproducible from this file;
  criterion unknown — same-criterion re-runs of v5+v6 this session are the comparison.)
- SIGSTOP m2a (config-arm-session2.jsonl): 8 s pause → 1 rebuild(player-stall),
  drift resync at t+12.2, stable 4.7 s post-CONT. 20 s pause → PARKS 19.5 s @ t+30.4
  and 18.0 s @ t+57.9 (readyState 1, not paused, all watchdogs disarmed), 2 rebuilds
  mid-pause, stable only 56.4 s post-CONT. maxPdt 32.8 s. Matches checkpoint 10.

v6 gap ladder (run chaos-v6) in flight.

---

## Checkpoint 5 — v6 GAP LADDER PASSED (00:0x) ✅

Run chaos-v6 (2/5/12/25/60 s SIGTERM gaps, 40 s up between; all 5 minted NEW broadcasts):

| gap | recovery | rebuilds | settled lat | settled pdt |
|---|---|---|---|---|
| 2 | 23.0 s | 1 | 2.23 s | 3.20 s |
| 5 | 30.3 s | 3 | 2.40 s | 3.47 s |
| 12 | 31.7 s | 6 | 2.33 s | 3.35 s |
| 25 | 29.5 s | 8 | 2.41 s | 3.37 s |
| 60 | 23.5 s | 11 | 2.39 s | 3.32 s |

5/5 recovered, median 29.5 s, max 31.7 s, ALL land at target (2.2-2.4 s), tab alive.
Rebuild reasons: manifestParsingError 19 (the unavoidable outage ladder), fragLoadError 4,
levelParsingError 2, source-stall 3, **starved 1**. Starved path fired 9 stalls → 3
hole-skips + 5 syncToEdge resyncs + 1 rebuild — mostly recovers WITHOUT rebuild.
Min rebuild spacing 3.0 s (rate limit respected) — NO storm. v5 re-run (chaos-v5r)
in flight for the same-conditions comparison (esp. rebuild counts per gap).

---

## Checkpoint 6 — v5 same-conditions ladder re-run + Q6 signal (00:1x) ✅

Run chaos-v5r (identical harness, page dynamically imported low-latency-player.v5.js —
ver field confirms 'v5'; all 5 gaps NEW broadcasts):

| gap | v5r recovery / rebuilds / lat@settle | v6 recovery / rebuilds / lat@settle |
|---|---|---|
| 2 | 18.1 s / 1 / 3.37 s | 23.0 s / 1 / 2.23 s |
| 5 | 31.1 s / 3 / 2.23 s | 30.3 s / 3 / 2.40 s |
| 12 | 31.2 s / 5 / 1.84 s | 31.7 s / 6 / 2.33 s |
| 25 | 25.0 s / 7 / 2.37 s | 29.5 s / 8 / 2.41 s |
| 60 | 19.2 s / 11 / 5.66 s | 23.5 s / 11 / 2.39 s |

v5r: median 25.0 s max 31.2 s, 27 rebuilds. v6: median 29.5 s max 31.7 s, 29 rebuilds.
→ Recovery + rebuild count EQUIVALENT (single runs, autocorrelated — differences are
noise). v6's starved path added only ~2 rebuilds and NO sub-3 s spacing. v6 settles
at target on all 5 (v5r off-target on 2: 3.37 / 5.66 s).

Q6 (from chaos-v6 hlsTargetLatency trace): CONFIRMED — within one hls.js instance
targetLatency bumps +1.0 s per stall (1.5→2.5 at t+44.0, →3.5 at t+45.5; again
1.5→2.5→3.5 at t+414.5/439.5). Rebuild resets it to the manifest's 1.5. ALSO seen:
jumps to 9 or 11 when the swap-era manifest momentarily loses LL tags (count-based
fallback 3×3 s, plus stall bumps). Plan §8 Q6's "probable" mechanism is now measured.

SIGSTOP phase next (the actual fix validation).

---

## Checkpoint 7 — SIGSTOP v6 run 1: park BOUNDED but 2-cycle; iteration 2 applied (00:3x) ✅

Run sigstop-v6 (same protocol as m2: settle 40 → STOP 8 s → CONT → 60 → STOP 20 s →
CONT → 90; videoUID 38d32321 SAME through both pauses):

- 8 s pause: stable 3.3-4.3 s post-CONT, 1 rebuild(player-stall) mid-pause — matches
  v5 behaviour (v5: stable 4.7 s). Note: 9 consecutive drift resyncs to the same frozen
  lsp during the pause (lsp AHEAD this time, seek "succeeds" as a no-op) — harmless,
  no escalation (counter resets on success), ends at the player-stall rebuild.
- 20 s pause (the park scenario): park now 12.5 s (v5: 19.5 s + 18.0 s = 37.5 s parked);
  stable 15.0 s post-CONT (v5: 56.4 s). Rescue was OURS (starved escalation), not the
  gap controller. Trace decode: drift-seek t+22.0 → hole; t+22.5-30.0 NOTHING buffered
  ahead (burst still arriving — platform-bound); starved#1 t+28.5 syncToEdge (correct,
  no range ahead yet); burst appends land at ~36.9+ leaving playhead beached at 36.325
  rs=1 WITH 5-17 s buffered just ahead t+30.5-34.5 (pure waste, one full stallTimeout);
  starved#2 t+34.5 hole-skip to 42.1 → rs=4, stable.
- Also observed: pdtWallLatency reads NEGATIVE (−1.6 s) briefly right after the -re
  backlog burst (CF re-stamps PDT ahead of wall clock) — telemetry consumers beware.

**Iteration 2** (the beached fast path): in the rs<2 branch, BEFORE the stallTimeout
clock — if a buffered range starts >0.25 s ahead (len >0.5 s) for 3 consecutive ticks
(~1.5 s confirmation, filters in-flight seeks), hole-skip immediately. beachedTicks
joins watchdog state; starved escalation now = edge-seek/rebuild only (no-data-ahead
case). Expected: phase-2 waste 6 s → ~1.5 s; v5-m2b-style second park (18 s with 32 s
buffered ahead) → ~1.5 s. Re-validating: SIGSTOP re-run, then full ladder re-run
(house rule: every plausible fix re-earns its chaos pass), then soak.

---

## Checkpoint 8 — SIGSTOP re-run with iteration 2: park ≤2.5 s (00:5x) ✅

Run sigstop-v6b (same protocol, same broadcast 38d32321 through both pauses):
- 8 s pause: stable 5.0 s post-CONT, 1 mid-pause rebuild — unchanged, good.
- 20 s pause: **max park 2.5 s** (iter-1: 12.5 s; v5: 19.5+18.0 s), stable 13.2 s
  post-CONT (iter-1: 15.0 s; v5: 56.4 s). maxPdt 24.0 vs v5's 32.8. This run resolved
  via two quick drift resyncs (t+24.3→26.5 stale, t+25.3→43.0 fresh) — the fast path
  wasn't needed (micro-timing differs run to run; 2 mid-pause rebuilds left a fresher
  instance). Post-resume behaviour is now bounded by fast path (1.5 s) with starved
  escalation as backstop — but the fast path itself did NOT fire this run, so its
  live proof must come from the ladder re-run (iter-1 ladder had 3 hole-skips at 6 s
  cadence; iter-2 should convert those to ~1.5 s skips).
Final ladder re-run (chaos-v6b) next, then 5-min soak.

---

## Checkpoint 9 — ladder re-run with iter-2 exposed a skip-fight; iteration 3 applied (01:1x)

chaos-v6b (iter-2 ladder): 5/5, all windows END healthy (lat 0.5-2.8 / pdt 1.5-3.6),
35 rebuilds (starved 3, source-stall 5, fragLoadError 12, manifestParsingError 15),
min spacing 3.0 s — no storm, tab alive. BUT the advancing-criterion "recovery" numbers
went unstable (3.1-47.1 s) because brief STALE-content playback after a swap satisfies
3 consecutive advancing samples — metric artifact, will report time-to-live-pdt for all
runs instead. NEW pathology found in the trace (gap-12 window t+160-177): on a wedged
mid-swap level hls.js bounces the playhead to 0 repeatedly; the iter-2 fast path then
re-skips to the SAME buffered-range start every ~3 s, interleaved with drift seeks —
17 s of seek noise until source-stall rebuilt (outcome same as v5's, just noisy).

**Iteration 3**: fast path skips a given target ONCE (lastHoleSkipTo, ±0.5 s window);
a bounced-back playhead falls through to the starved escalation (edge-seek → rebuild
ladder). Cleared on any playhead advancement and in resetWatchdogs. Re-validating:
ladder (chaos-v6c) + SIGSTOP (sigstop-v6c) + 5-min soak (soak-v6).

---

## Checkpoint 10 — iter-3 ladder: equivalent to v5, tails are platform weather (01:3x) ✅

chaos-v6c (iter-3): 5/5, 33 rebuilds, no spacing <3 s, tab alive. TTL (time-to-live:
pdt<=6 sustained 5 s, same metric for all runs): 16.5/14.6/20.7 s on gaps 12/25/60 —
BEATS v5r — but 137.2/79.8 s on gaps 2/5. Trace attribution: those two windows hit
prolonged Cloudflare post-swap 404 propagation (old-broadcast fragLoadError 404 ladders
for 45-120 s; historic sessions saw 10-15 s, today's weather is worse) — handled by the
same rebuild ladder as v5, and the historic v5 file shows identical minutes-long ct=0
waits in its gap-12. Same-day comparison, pooled TTL medians: v5r 30.1 s (5 gaps) vs
v6 iters 1-3 pooled 29.3 s (15 gaps) → EQUIVALENT.
v6-specific residual noise observed: on a stale-manifest phase, hole-skip (to stale
buffered content) alternates with drift-seek (to stale lsp at frozen edge) every ~2.5 s
until source-stall rebuilds at 12 s — v5 in the same state parks silently for the same
12 s, so outcome is identical; the noise is telemetry-only. Root cause is the frozen
hls.latency driving drift seeks (GAP C) — out of scope beyond the existing escalation.
Iter-3 accepted. SIGSTOP re-run under iter-3 next, then soak.

---

## Checkpoint 11 — iter-3 SIGSTOP re-run (02:0x) ✅

sigstop-v6c (same broadcast 5782bb4a through both pauses):
- 8 s pause: stable 3.0 s post-CONT, no park. 
- 20 s pause: parks 13.5 s + 4.0 s, stable 23.5 s post-CONT; rescue chain =
  starved escalation → source-stall rebuild → hole-skip (all OURS — hls.js's gap
  controller never had to save us in ANY v6 run).
Cross-run summary (20 s pause): v6 parks 12.5 / 2.5 / 13.5 s (iters 1/2/3 runs),
stable 15.0 / 13.2 / 23.5 s. v5: parks 19.5+18.0 s consecutive, stable 56.4 s.
Worst-case v6 beats v5 2.4× on time-to-stable; best case 4.3×. Residual variance is
GAP-C (stale hls.latency steering drift seeks into the append frontier) — bounded by
the new escalations, full fix (PDT-based drift target) out of scope for v6.
5-min soak next.

---

## Checkpoint 12 — SOAK PASSED, teardown complete, session closed (02:1x) ✅

Soak (run soak-v6, 317 s, no chaos): latency p50 2.70 / p95 2.81 / p99 2.85 s
(target band 2.4-3 s ✓), pdtWall p50 3.62 s, rebuilds 0, resyncs 0, stalls 0,
fatals 0, non-advancing samples 0/633. No regression.

Instrument integrity across the WHOLE campaign: 6591/6591 player rows visible,
max telemetry gap 0.5 s in every run — no tab crash at any point (v4's failure
mode never appeared).

### Final v6 vs v5 (all same-day, same harness, same analyzer)

| metric | v5 | v6 (final = iter 3) |
|---|---|---|
| gap ladder recovered | 5/5 (chaos-v5r) | 15/15 across 3 ladder runs |
| TTL median (pdt<=6 sust.) | 30.1 s | 20.7 s (final run; pooled 3 runs 29.3 s) |
| ladder rebuilds/run | 27 | 29 / 35 / 33 — no spacing <3 s, no storms |
| settle at target | 3/5 gaps | final-run all windows end lat 1.7-3.6 s |
| SIGSTOP 20 s park | 19.5+18.0 s (gap-ctrl rescue) | max 13.5 s, all rescues OURS |
| SIGSTOP 20 s stable | 56.4 s post-CONT | 13.2-23.5 s post-CONT |
| SIGSTOP 8 s stable | 4.7 s | 3.0-5.0 s |
| soak 5 min | (not run for v5) | p50 2.70 / p99 2.85, zero events |

Iterations: (1) checkpoint-8+10 diffs as specced; (2) beached fast path (immediate
hole-skip after 3-tick confirm when data sits >0.25 s ahead); (3) one-skip-per-target
guard (kills the stale-manifest skip/drift ping-pong).

Q6 VERDICT (plan §8): CONFIRMED ✅ measured — hls.js 1.7.1 bumps targetLatency +1.0 s
per stall within an instance lifetime (1.5→2.5→3.5 observed twice in chaos-v6, once in
smoke); a rebuild resets it to the manifest's 1.5; additionally the target jumps to
9-11 s when a post-swap manifest briefly loses LL tags (count-based fallback).
Bonus telemetry finding: pdtWallLatency reads NEGATIVE (~−1.6 s) for a few seconds
right after an -re backlog burst (CF re-stamps PDT ahead of wall clock).

### Teardown (verified)
- Chrome killed by profile path; encoder killed by MY stream key; collector-v6.py
  killed; port 8899 FREE. Sibling agent's ffmpeg (pid 15532) untouched throughout.
- Live input 56f462840d77c9aa078151809bbe3cac DELETED (success:True; follow-up GET
  error 10003 not-found). Nothing of mine remains on Cloudflare.
- Files: src/low-latency-player.js = v6 (426 lines); src/low-latency-player.v5.js =
  backup; rig/resilience-v6.html (A/B harness page, ?player=v5|v6); this file;
  results/resilience-v6.jsonl (all 9 runs, one ordered stream).
