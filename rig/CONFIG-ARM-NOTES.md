# Item 9 — config-arm mystery + 26 s resume (session 2)

Agent notes. Checkpointed after every step. Port 8898 is mine. Own live input to be provisioned
(inputs 5cfa5053…/4c93bc4b…/224558e8… belong to other agents — untouched).

---

## Checkpoint 1 — context read (2026-08-25)

Read plans/plan.md, PROGRESS.md, run-arms.sh, measure-llhls.html, resilience.html, chaos.sh,
kill-test.sh, src/low-latency-player.js, results/*.jsonl heads.

**Immediate finding in the run data (results/config.jsonl):** every `config` row is

```
{"run":"config","n":0, ..., "rvfcFired":0, "visibility":"visible",
 "maxLatency":null, "targetLatency":null, "server_ts":...}
```

and — critically — **the `hlsLatency` key is ABSENT** from every config row, while it is present
(as a number) in every `none`/`seek` row. `JSON.stringify` drops `undefined` values, and the page
builds the payload as `hlsLatency: hls?.latency`. So in the config arm **`hls` itself was
`undefined`** — not a wedged instance, no instance at all. `rvfcFired: 0` confirms the
`v.requestVideoFrameCallback(onFrame)` arming line (measure-llhls.html:122, AFTER the
`new Hls(...)` block) never executed.

**Working hypothesis (Mystery 1):** `new Hls({... liveMaxLatencyDurationCount: 5 ...})`
**throws synchronously** in its config merge, killing the whole `<script>` block via uncaught
exception. The two `setInterval`s (render + POST) were registered BEFORE the constructor
(lines 90/94), so telemetry kept flowing with `hls === undefined` — exactly the observed
35 batches of n=0 / null / no-error. hls.js's documented constraint: user config that sets
`liveMaxLatencyDurationCount` must ALSO explicitly set `liveSyncDurationCount` (and be greater);
the arm at measure-llhls.html:106 sets only `liveMaxLatencyDurationCount: 5`.

Also verified statically:
- run-arms.sh does NOT drop the arm (`for arm in none config seek`, `fix=config` passed). Not the cause.
- No typo: `liveMaxLatencyDurationCount` spelled correctly at measure-llhls.html:106.

Next: confirm the throw against the actual hls.js dist the page loads (jsdelivr hls.js@1),
then reproduce live with debug:true.

---

## Checkpoint 2 — Mystery 1 root cause PROVEN statically (22:01)

Fetched the exact dist the page loads (`https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js`,
jsdelivr resolves to **1.7.1** — the same version plans/plan.md records for the runs). Its config merge
contains:

```js
if (void 0 !== t.liveMaxLatencyDurationCount &&
    (void 0 === t.liveSyncDurationCount ||
     t.liveMaxLatencyDurationCount <= t.liveSyncDurationCount))
  throw new Error('Illegal hls.js config: "liveMaxLatencyDurationCount" must be greater than "liveSyncDurationCount"');
```

**The trap:** `t` is the USER config, not the merged config. The arm's value (5) IS greater than
the default `liveSyncDurationCount` (3), but hls.js never compares against the default — if the
user config omits `liveSyncDurationCount`, `void 0 === t.liveSyncDurationCount` is true and the
constructor **throws unconditionally**. So this is not the "too-tight maxLatency wedges the
seek/flush loop" scenario — playback never got that far. It is a synchronous constructor throw.

✅ **Reproduced in node against the downloaded dist** (scratchpad, `node -e`):

```
hls.js version: 1.7.1
ARM CONFIG THROWS: Illegal hls.js config: "liveMaxLatencyDurationCount" must be greater than "liveSyncDurationCount"
FIXED CONFIG: constructed OK        <- same + liveSyncDurationCount: 3
```

Causal chain matching every observed symptom:
1. `new Hls({lowLatencyMode:true, backBufferLength:30, liveMaxLatencyDurationCount:5, maxLiveSyncPlaybackRate:1.05})` throws (measure-llhls.html:101-107).
2. Uncaught exception aborts the `<script>` block → `hls` never assigned, `window.__log` never
   created, `loadSource`/`attachMedia` never called, rVFC arming (line 122) never runs.
3. The two `setInterval`s registered BEFORE the constructor (render @90, POST @94) keep running
   → 35 batches of `n=0, rvfcFired=0, targetLatency:null, maxLatency:null`, `hlsLatency` key
   dropped from JSON (undefined), zero errors — exactly results/config.jsonl.

**Proposed fix (measure-llhls.html:106):**

```diff
-    ...(FIX === 'config' ? { liveMaxLatencyDurationCount: 5, maxLiveSyncPlaybackRate: 1.05 } : {}),
+    ...(FIX === 'config' ? { liveSyncDurationCount: 3, liveMaxLatencyDurationCount: 5, maxLiveSyncPlaybackRate: 1.05 } : {}),
```

(hls.js requires BOTH in user config; 5 > 3 then passes. Note count-based knobs cannot be mixed
with `liveSyncDuration`/`liveMaxLatencyDuration` — separate throw.) With Cloudflare's 2 s
targetduration this yields maxLatency = 5 × 2 = 10 s — sane vs PART-HOLD-BACK 1.5–3.5 s.
Wrap the constructor in try/catch in rig pages so a config throw becomes a visible telemetry row,
not silence.

Still to do for Mystery 1: live repro with debug:true on MY OWN input (prove the arm now plays
when fixed, and capture the throw in a real browser console).

---

## Checkpoint 3 — Mystery 2 data archaeology (22:10)

Mined all results/resilience*.jsonl for the "~26 s same-broadcast resume":

- **No `same_video` chaos marker exists in ANY results file.** Every recorded chaos gap
  (v1–v5, incl. gap=2) minted a `new_video`. The "2 s gap sometimes resumes same broadcast"
  + "settled ~26 s" observation was therefore seen live (browser HUD / kill-test window), not
  cleanly persisted — cannot be replayed from disk. Reproduction needed.
- The only ~26 s regions in the data are (a) post-gap recovery transients (`currentTime: 0,
  readyState: 0`, latency counting up while a rebuilt instance waits for the edge) and (b) the
  chaos-v5b hidden-tab artifact (resilience.jsonl t+1.4 s onward: tab hidden, Chrome pauses the
  muted video, `paused: true`, `currentTime` frozen at 9.041 while `buffered` end keeps growing
  18→32 s — same broadcast, edge alive — latency ramps through 26 s unbounded, `resyncs` frozen
  at 19). (b) is at least a *demonstration in data* that latency can pass 26 s with the
  drift-seek predicate never evaluated: `tick()` gate `if (video.paused || video.readyState < 2)
  return;` sits BEFORE the latency-control block.

Next: line-level static analysis of hls.js 1.7.1 LatencyController vs the v5 tick() gates.

---

## Checkpoint 4b — live phase start (22:25)

Power: AC, charging (17%). Port 8898 free.
**Provisioned MY OWN live input: uid `f46a8c21256d5e422311ff7773f891a6`**
(`config-arm-rig-item9`, preferLowLatency:true, recording.timeoutSeconds:10 — matches the other
inputs' same-broadcast semantics). Key stored in scratchpad `my_input.json`, NOT in /tmp/li_key.txt
(that file belongs to the other agents' push script). **Delete this input at session end.**

---

## Checkpoint 5 — rig up (22:30)

- Collector on **:8898** (scratchpad/collector8898.py) serving repo root; all rows →
  `results/config-arm-session2.jsonl` (kind: page|chaos, ts server-side).
- Own encoder up via scratchpad/push-mine.sh (identifiable by MY stream key in the cmdline —
  pkill/-STOP targets only that pattern, never other agents' ffmpeg).
- Input `f46a8c21…` live after 4 s, videoUID `3d46f86be857a87960adb4c2225cda84`.
- New rig pages (mine, committed to rig/): `config-arm-debug.html` (Mystery 1: exact failing arm
  + debug:true + window.onerror + console capture, telemetry survives constructor throw;
  modes arm | fixed-count | fixed-duration) and `config-arm-resume.html` (Mystery 2: v5 player +
  per-500ms row of every tick()/syncToEdge gate input INCLUDING `hls.playingDate` PDT wall
  latency vs `hls.latency` media-timeline latency).

Note found while writing fixed modes (hls.js 1.7.1 line 34711): explicitly setting
`liveSyncDurationCount` in user config makes targetLatency = count × targetduration (= 3×2 = 6 s),
**overriding the manifest's PART-HOLD-BACK 1.5 s** — the count-based "idiomatic fix" silently
trades away the low-latency target. The seconds-based pair (`liveSyncDuration: 1.5` +
`liveMaxLatencyDuration: 6`) keeps a low target. Testing both.

---

## Checkpoint 6 — Mystery 1 REPRODUCED in-browser (22:35) ✅

Headless Chrome (headless=new + anti-throttle flags), page `rig/config-arm-debug.html?mode=arm`
(byte-identical arm config + debug:true), against MY live input. Captured row
(results/config-arm-session2.jsonl, ts 1787685254.49):

```
Uncaught Error: Illegal hls.js config: "liveMaxLatencyDurationCount" must be greater than "liveSyncDurationCount"
    at Fd (hls.min.js:3:572924)          <- mergeConfig
    at new e (hls.min.js:3:600916)       <- Hls constructor
    at config-arm-debug.html:61:7        <- new Hls({lowLatencyMode, backBufferLength, liveMaxLatencyDurationCount:5, maxLiveSyncPlaybackRate:1.05, debug:true})
consoleTail: ['[log] > Debug logs enabled for "Hls instance" in hls.js version 1.7.1']
hlsDefined: false, rvfcFired: 0, visibility: visible
```

The ONLY hls.js output before death is the "debug logs enabled" banner — the constructor throws
in mergeConfig before any loading begins. `hlsDefined:false` + `rvfcFired:0` + subsequent empty
telemetry rows byte-match the original results/config.jsonl signature. **Mystery 1 = uncaught
synchronous constructor throw, because the arm set `liveMaxLatencyDurationCount` without an
explicit `liveSyncDurationCount` in user config (hls.js compares only user-config keys, never
the default 3).**

Ops notes for the record: (a) first attempt used `--virtual-time-budget=0` which makes Chrome
timers run on instant virtual time — 27,579 telemetry rows in 35 s; flag removed. (b) the CDN
`<script>` needed `crossorigin="anonymous"` for window.onerror to see more than "Script error.".
(c) another agent's cleanup `pkill -f 'rtmps://live.cloudflare.com'` killed MY encoder at ~22:32
— their pattern matches every CF push incl. mine; restarted, new videoUID expected. (d) stray
headless Chrome on the same user-data-dir swallows subsequent launches — pkill by profile path
between runs.

Next: fixed-count and fixed-duration arms (does the config fix actually play, and at what target).

---

## Checkpoint 7 — the config arm WORKS once legal (22:50) ✅

Both fixed variants run 75 s each against my live input (results/config-arm-session2.jsonl,
runs m1-fixed-count / m1-fixed-duration):

| variant | user config | target | max | behaviour |
|---|---|---|---|---|
| fixed-count | `liveSyncDurationCount:3, liveMaxLatencyDurationCount:5` | **9 s** (3×targetduration 3) | 15 s | starts 14.5 s, rate catch-up crawls down ~0.05 s/s → 11.6 s at 70 s; minutes to target |
| fixed-duration | `liveSyncDuration:1.5, liveMaxLatencyDuration:6` | 1.5→2.5 s (one stall bump) | 6 s | **settles 2.4-2.5 s within ~20 s and stays** |

Two bonus findings:
- **plans/plan.md open question 5 answered in passing:** `maxLiveSyncPlaybackRate: 1.05` DOES engage
  once the config is legal — fixed-count ct advances 2.09-2.11 s per 2.0 s wall (1.05×),
  latency ramps down smoothly. In the original runs it "never engaged" because the only arm that
  set it was the arm whose constructor threw.
- Count-based knobs override PART-HOLD-BACK (targetLatency becomes count×targetduration = 9 s) —
  the count-based idiomatic fix silently abandons the low-latency target. The seconds-based pair
  matches the manual seek shim's measured 2.6-3.0 s, **as a pure config line**.

**Recommended arm config for re-runs:**
`{ lowLatencyMode:true, liveSyncDuration:1.5, liveMaxLatencyDuration:6, maxLiveSyncPlaybackRate:1.05 }`

---

## Checkpoint 8 — M2 repro launched (22:55) + proposed v5 fix (NOT applied)

M2 run in flight: v5 player headless on my input, 40 s settle → SIGSTOP 8 s → CONT → 60 s →
SIGSTOP 20 s → CONT → 90 s. Battery AC/charging 28%.

**Proposed diff for src/low-latency-player.js — description only, main session decides:**

```diff
   function tick() {
     if (destroyed || Date.now() < cooldownUntil) return;
     ...
-    if (video.paused || video.readyState < 2) { lastAdvance = Date.now(); return; }
+    if (video.paused || video.readyState < 2) {
+      lastAdvance = Date.now();
+      // GAP A: a muted live player has no legitimate long-lived paused state.
+      // Chrome pauses hidden/occluded tabs; nothing on the resume path ever
+      // calls play() again (boot() only plays on MANIFEST_PARSED). Re-request.
+      if (video.paused && everPlayed && document.visibilityState === 'visible') {
+        video.play().catch(() => {});
+      }
+      return;
+    }
     ...
     if (drift > cfg.seekThreshold) {
-      syncToEdge('drift');
+      // GAP B: syncToEdge can fail silently (lsp null, or lsp behind the
+      // playhead on a stale level). A failing drift-seek must escalate, not
+      // no-op forever with playbackRate parked at 1.
+      if (!syncToEdge('drift')) {
+        failedDriftSeeks++;
+        if (failedDriftSeeks >= 6) { failedDriftSeeks = 0; rebuild('drift-seek-wedged'); return; }
+      } else failedDriftSeeks = 0;
     } else if (drift > cfg.nudgeThreshold) {
```

plus in `onVisibility` (GAP A companion): after `syncToEdge('visibility')`, also
`if (video.paused) video.play().catch(()=>{})` — a background-paused tab that becomes visible
currently seeks but stays paused forever, gated at the readyState/paused line.
(`let failedDriftSeeks = 0` joins the watchdog state; reset in `resetWatchdogs()`.)

GAP C/D (wall-clock blindness) fix sketch, pending repro confirmation: v5 already receives PDT
via Cloudflare — add `pdtLatency = (Date.now() - hls.playingDate?.getTime())/1000` to the
telemetry `latency` event so wall staleness is at least VISIBLE, and optionally trigger the same
drift path when `pdtLatency - target > seekThreshold` **and** `liveSyncPosition - currentTime >
seekThreshold` (i.e. there is actually somewhere ahead to seek to; without that second condition
a continuous-timeline resume has nothing to seek to and the wall lag is player-irreducible).

---

## Checkpoint 9 — M2 repro, 8 s pause trace (23:00) ✅ two gaps observed live

SIGSTOP 8 s on my encoder (socket open). Full 500 ms trace in results/config-arm-session2.jsonl
(run m2a, sigstop marker ts 1787685552.9). What the trace shows, relative to SIGSTOP t=0:

- t −0.3: healthy: ct 59.1, hlsLat 1.83, pdtLat 2.75, lspΔ −0.68 (lsp normally sits slightly
  BEHIND the playhead at steady state — the never-seek-backwards guard is routinely active).
- t +1.7: buffer drained (1.7 s), playhead freezes at 60.977, readyState 2, bufferStalledError.
- **t +2.2 … +7.2: `hls.latency` FROZEN at 1.70 while `pdtWallLatency` climbs 3.4 → 8.4.**
  GAP C measured: the drift predicate input under-reports by 6.7 s and growing, because
  timeupdate stopped and the playlist isn't advancing (advanced=false → no recompute).
- Same window: **lspΔ = −1.977 constant** — liveSyncPosition (frozen-edge − holdback) is 2 s
  BEHIND the playhead. Any syncToEdge call fails silently. GAP B measured.
- t +8.0: player-stall watchdog (6 s frozen) → syncToEdge('stall') returns false (lsp behind) →
  **rebuild('player-stall')** — v5 rebuilds even though the broadcast survives. (Buffer drain
  ~1.7 s + stallTimeout 6 s ⇒ any socket-open pause ≳ 7.7 s triggers a rebuild.)
- t +8.0 SIGCONT: ffmpeg `-re` BURSTS the backlog — seekableEnd jumps 22 → 31 in 1 s; the media
  timeline catches up to wall clock (GAP D's benign case: the pause becomes visible as
  media-distance).
- t +12.2: rebuilt instance sees hlsLat 11.15 → **resync(drift) fires, seek to 32.06,
  pdtLat 11.98 → 2.34**. Recovered ≈ 4 s after CONT; steady state hlsLat ~2.1 / pdtLat ~2.9.

So: with tab visible, 8 s pause, v5 recovers (stall-rebuild + drift-seek), total viewer impact
~12 s. The 26 s park did not manifest here — but both silent-gate mechanisms (stale hls.latency;
lsp-behind-playhead silent false) are now measured facts, not hypotheses. videoUID unchanged
(71720c5c…) through the pause — same broadcast confirmed.

20 s pause (crosses sourceStallTimeout 12 s) trace next.

---

## Checkpoint 10 — M2 20 s pause: THE PARK REPRODUCED, twice (23:20) ✅

20 s SIGSTOP (sigstop marker ts 1787685621.8), same broadcast throughout (videoUID 71720c5c…
unchanged after BOTH pauses — vid_check markers). Trace (times relative to SIGSTOP):

- t+3.9 buffer drained → stall at ct 89.956, rs=2; hlsLat frozen 4.06 while pdtLat climbs
  (GAP C again). lspΔ −2.95 (GAP B again).
- t+10.4 stall watchdog → syncToEdge('stall') fails → **rebuild #2 mid-pause**; rebuilt instance
  attaches the STALE manifest, plays 1.2 s of stale content, stalls again.
- t+20 SIGCONT (ffmpeg -re bursts backlog; se later jumps 20 → 41.5).
- t+20.9 stall watchdog → **rebuild #3**; new instance starts ct 32.1, plays 1.9 s, stalls at
  33.967 (`bufferSeekOverHole`, `bufferAppendNoProgress` — the resumed timeline has a HOLE
  between pre-pause and post-burst content).
- **t+30.4 resync(drift) fires → seeks to liveSyncPosition 36.583 → lands INSIDE the hole.
  readyState drops to 1 and stays 1 for 20.0 s (t+30.4 → t+50.4)** while buffered-ahead grows to
  32 s and hlsLat climbs 3.0 → 21.0 (pdtLat to 22.9). **resyncs/stalls/rebuilds all frozen: the
  `paused || readyState < 2` early-return (line 277) resets lastAdvance every tick and disarms
  the player-stall watchdog, the drift branch, and the nudge.** The source watchdog stays quiet
  because seekableEnd IS advancing. This is the park: latency >20 s, "drift-seek not firing",
  zero telemetry events.
- t+50.4 hls.js's own gap controller finally jumps the hole (ct 36.583 → 56.444) — rescue by
  luck, 20 s later.
- **t+57.9 second resync(drift) → seek to 63.102 → SAME park again, 18.5 s** (rs=1 until t+76.4,
  hlsLat climbs to 20.5).
- t+76.4 gap-jump to 81.465 → healthy: settles hlsLat 3.7 / pdtLat 4.5, stable through t+110.

**Mystery 2 root cause (mechanism ✅ measured; the specific historic 26 s instance ⚠️ inferred
to be this mechanism — it was never persisted to disk, no same_video marker exists in any
results file):** after a same-broadcast resume the drift-seek's target `liveSyncPosition` maps
into a buffer hole between the pre-pause and post-resume content. The seek itself puts the
element into readyState 1, and v5's tick() gate `if (video.paused || video.readyState < 2)
{ lastAdvance = Date.now(); return; }` then **disarms every recovery mechanism while
continuously resetting the stall clock**. The player parks with latency climbing through ~20-26 s
until hls.js's gap controller happens to skip the hole (~20 s in both measured instances). No
resync/stall/rebuild events fire during the park — matching the historic observation "settled
~26 s behind without a drift-seek firing" (the drift-seek had ALREADY fired, into the hole;
observers see only its absence afterwards).

Contributing gaps, all measured this session: GAP C (hls.latency stale during the outage,
under-reporting by 6-17 s), GAP B (lsp behind playhead → syncToEdge silent false), and the
readyState<2 branch of GAP A (the park). The paused branch of GAP A was additionally witnessed
in the historic chaos-v5b data (hidden-tab pause, latency through 26 s, resyncs frozen).

**Refined proposed diff (supersedes Checkpoint 8's GAP A part; NOT applied):**

```diff
-    if (video.paused || video.readyState < 2) { lastAdvance = Date.now(); return; }
+    if (video.paused) {
+      lastAdvance = Date.now();
+      // Chrome pauses muted video in background tabs; nothing ever called play() again.
+      if (everPlayed && document.visibilityState === 'visible') video.play().catch(() => {});
+      return;
+    }
+    if (video.readyState < 2) {
+      // Starved element. Do NOT reset the stall clock: a drift-seek that lands in
+      // a buffer hole leaves readyState at 1 indefinitely (measured: 20.0 s and
+      // 18.5 s parks) and this early-return used to disarm every watchdog.
+      if (Date.now() - lastAdvance > cfg.stallTimeout) {
+        lastAdvance = Date.now();
+        failedSeeks++;
+        emit('stall', { kind: 'starved', attempt: failedSeeks });
+        // Prefer jumping to buffered data (what hls.js's gap controller eventually
+        // does anyway); escalate to rebuild if that keeps failing.
+        const b = video.buffered;
+        const next = (() => { for (let i = 0; i < b.length; i++)
+          if (b.start(i) > video.currentTime + 0.1 && b.end(i) - b.start(i) > 0.5) return b.start(i) + 0.1;
+          return null; })();
+        if (failedSeeks > cfg.seeksBeforeReload) rebuild('starved');
+        else if (next != null) { video.currentTime = next; emit('resync', { reason: 'hole-skip', to: next }); }
+        else if (!syncToEdge('starved')) rebuild('starved');
+      }
+      return;
+    }
```

plus GAP B (drift branch, unchanged from Checkpoint 8):

```diff
     if (drift > cfg.seekThreshold) {
-      syncToEdge('drift');
+      if (!syncToEdge('drift')) {
+        failedDriftSeeks++;
+        if (failedDriftSeeks >= 6) { failedDriftSeeks = 0; rebuild('drift-seek-wedged'); return; }
+      } else failedDriftSeeks = 0;
     } else if (drift > cfg.nudgeThreshold) {
```

plus `onVisibility`: after `syncToEdge('visibility')`, `if (video.paused) video.play().catch(()=>{})`.
Optional telemetry: include `pdtLatency = (Date.now() - hls.playingDate?.getTime())/1000` in the
`latency` event — it was the only honest latency signal throughout both pauses.

Timing data for context: with these gaps unfixed, the 20 s pause cost the viewer ~76 s to
stable recovery; the 8 s pause cost ~12 s. A hole-skip at stallTimeout would have cut the 20 s
case to ~35 s (still bounded below by pause + edge propagation).

---

## Checkpoint 11 — CLEANUP DONE, session closed (23:25) ✅

- My encoder (ffmpeg, key pattern b9dada8595b0…) killed; verified gone. (Killed by exact key
  pattern — never by 'rtmps://live.cloudflare.com', which matches other agents' encoders too.)
- My headless Chrome killed by profile path (`…/scratchpad/chrome-profile`); verified gone.
- collector8898.py stopped; **port 8898 free**.
- **Live input `f46a8c21256d5e422311ff7773f891a6` DELETED via API** (delete success:True,
  follow-up GET success:False). Nothing of mine remains on Cloudflare.
- Artifacts left for the main session: this file; rig/config-arm-debug.html;
  rig/config-arm-resume.html; results/config-arm-session2.jsonl (M1 arm/fixed runs + full M2
  traces + chaos markers). No edits to plans/plan.md / PROGRESS.md / src/low-latency-player.js.

### TL;DR for merge
1. **Mystery 1 ✅ solved+reproduced:** the config arm never played because `new Hls()` THROWS —
   `liveMaxLatencyDurationCount` without an explicit `liveSyncDurationCount` in user config is an
   illegal-config exception in hls.js (validated against user config only, not defaults). The
   uncaught throw killed the page script after the telemetry intervals were registered → 35
   batches of n=0 with no error. Fix = one line; best variant
   `{liveSyncDuration:1.5, liveMaxLatencyDuration:6}` → measured 2.4-2.5 s latency, at target,
   pure config, no shim. Also answers open question 5: maxLiveSyncPlaybackRate 1.05 engages fine
   once the constructor survives.
2. **Mystery 2 ✅ mechanism measured (historic instance ⚠️ inferred):** same-broadcast resume
   leaves a buffer hole; drift-seek fires INTO the hole; readyState drops to 1; tick()'s
   `paused || readyState < 2` early-return then disarms all watchdogs while resetting the stall
   clock → parked 18.5-20 s with latency climbing through ~21 s until hls.js's gap controller
   jumps the hole. Proposed v5 diffs in Checkpoint 10 (not applied).

---

## Checkpoint 4 — Mystery 2 static analysis (22:20)

Read hls.js 1.7.1 unminified (`LatencyController` lines 34522-34774, `LevelDetails` 9200-9333 of
the dist). Facts that matter:

- `hls.latency` = cached `_latency || 0`; **recomputed ONLY on (a) media `timeupdate`, (b)
  `LEVEL_UPDATED` when `details.advanced === true`** (playlist actually grew). A stalled video +
  frozen playlist → `_latency` freezes at its last (healthy, ~2-3 s) value.
- `computeLatency() = levelDetails.edge + levelDetails.age − currentTime`; `age` is UNCAPPED
  wall-clock since last playlist advance — so while a *level keeps advancing* and the *video is
  paused*, latency grows accurately (this is what the hidden-tab rows show).
- `liveSyncPosition` is computed fresh per read: `clamp(edge − totalduration,
  edge+age − targetLatency − edgeStalled, edge − partTarget)`. Note the upper clamp uses `edge`
  WITHOUT age — with a stale playlist, lsp is pinned ≤ frozen edge.
- If `estimateLiveEdge()` returns null (no levelDetails), `onTimeupdate` early-returns and
  **`_latency` keeps its stale nonzero value** while `liveSyncPosition` returns null.

v5 `tick()` gates (src/low-latency-player.js:263-307), in order, each a way latency can sit at
~26 s with the drift-seek predicate never firing / never reached:

**GAP A — the paused/readyState gate (line 277).**
`if (video.paused || video.readyState < 2) { lastAdvance = Date.now(); return; }` sits BEFORE
the latency-control block. Any resume path that leaves the element paused (Chrome pauses muted
video in hidden/occluded tabs; a rejected `play()`; a same-broadcast resume that needs no rebuild
so `boot()`'s `play()` never re-runs) parks the player at ANY latency forever: drift-seek
unreachable, player-stall watchdog unreachable, and the line also continually resets
`lastAdvance` (the advancing-metric reset family). **The visibility resume path (onVisibility,
line 309) seeks but never calls `video.play()`** — a background-paused tab that becomes visible
stays paused, gated at line 277 forever. Data witness: resilience.jsonl chaos-v5b t+16..t+32 —
`paused:true`, `currentTime` frozen 9.041, `buffered` end growing (same broadcast, edge alive),
latency ramping straight through 26 s, `resyncs` frozen at 19.

**GAP B — syncToEdge's silent false with no fallback (lines 247-257, 298-299).**
`if (drift > cfg.seekThreshold) { syncToEdge('drift'); }` ignores the return value. syncToEdge
returns false silently when `liveSyncPosition` is null OR `lsp < currentTime − 0.5`
(never-seek-backwards guard — stale frozen edge behind the playhead). In both cases: no `resync`
event (so telemetry says "drift-seek never fired"), no escalation, and because the drift branch
is an else-if chain, **the rate-nudge is also skipped** — playbackRate stays 1.0. Latency parked,
zero corrective action, zero telemetry.

**GAP C — stale `_latency` under-report.** During a socket-open ingest pause the playlist stops
advancing (`advanced=false` → no recompute) and the stalled video fires no timeupdate →
`hls.latency` stays ~2-3 s while true wall-clock staleness grows. `currentLatency()` trusts it →
drift predicate false on stale data. Whether this persists after resume depends on how the
timeline resumes (GAP D).

**GAP D — media-timeline vs wall-clock blindness (structural).** `hls.latency` measures distance
along the MEDIA timeline. If a same-broadcast resume keeps the media timeline continuous (PTS
continue where they stopped; the pause exists only in wall time), the playhead can be at target
media-distance from the edge — hls.latency reads "at target", liveSyncPosition ≈ currentTime,
drift ≈ 0 — while every frame displayed is ~26 s old by wall clock. **No v5 trigger can see this
kind of lag**; only PDT (`hls.playingDate` vs Date.now()) exposes it. If instead Cloudflare/the
encoder re-stamps so the timeline jumps forward by the gap, hls.latency spikes and the drift-seek
DOES fire — unless blocked by GAP A/B.

Discriminating experiment (next): own input + SIGSTOP/SIGCONT pause (same broadcast per
kill-test.sh finding), instrument BOTH `hls.latency` and PDT wall latency + paused/readyState/
liveSyncPosition per 500 ms row. Short pause (8 s < sourceStallTimeout 12 s → no rebuild) and
long pause (20 s → source-stall rebuild path).

---

