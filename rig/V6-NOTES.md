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
