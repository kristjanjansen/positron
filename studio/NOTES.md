# studio/ — v0 (plan-studio §5, Sessions B + C) + v1 SOUND · ROOM · GRID

Built 2026-08-28; extended and re-verified 2026-08-30.

**DoD: one command + one URL runs a complete show, and the replay link works at
the end.** ✅ Verified headlessly on a synthetic canvas source — **24/24** as of
2026-08-30. Still nothing here has been used by a human.

```sh
node studio/engine.mjs          # ONE COMMAND
open http://127.0.0.1:8899/     # ONE URL — GO LIVE · ARCHIVE · SHOW · SOUND · ROOM · GRID
```

The verifier drives the *real* surface — it clicks GO LIVE, types cues into the
cue box, clicks STOP, reads the replay `href` out of the DOM and opens it:

```sh
node studio/verify.mjs --duration=80        # the DoD check — SOUND + ROOM now too
node studio/verify-grid.mjs --participants=1  # the grid archive, end to end
node studio/anchor-probe.mjs --run=<runId>  # the anchor, split into its legs
node studio/engine.mjs --reconcile          # R2 is the memory
node studio/engine.mjs --autopilot --duration=25 --offsets=6.3,14.7 --no-upload
```

## v1 (2026-08-30) — what changed

* **§anchor is closed.** The −45.3 ms was never a constant. The per-cue replay
  error — the number the 150 ms budget is measured against — is now
  **abs p95 19–26 ms over five runs** (was 39 on one). Read §anchor.
* **SOUND**, **ROOM** and the **grid archive** are built and exercised through
  the real surface. `studio/roster.mjs` is the roster adapter plan-studio §5
  promised (it did not exist anywhere in `timeline/`).
* Two negative results worth as much as the fixes: `-fps_mode passthrough`
  (§anchor) and the content anchor's own one-frame bias (§anchor, last section).

## Measured — v1, `node studio/verify.mjs --duration=80`, **24/24**

Run `studio-20260830T074151`, 82 s, 5 cues at fractional offsets, 20 segments.
The v0 column is the 2026-08-28 run this replaces — same script, same source,
same room, same machine, so the two columns are directly comparable.

| number | v0 (2026-08-28) | **v1 (2026-08-30)** |
|---|---|---|
| GO LIVE click → live (native T₀ stamped) | 2 992 ms | **2 502 ms** (engine boot 275 ms) |
| STOP click → working replay link in the DOM | 20 898 ms | **20 001 ms** (18.5–24.3 s over 5 runs — the uploader drain dominates) |
| **per-cue replay error** (burned clock @ fire − fireAt) | p50 −37, abs p95 **39 ms** | **p50 −10, abs p95 22 ms** · over **5** runs p50 −15…+23, abs p95 **19–26 ms** |
| content anchor − native T₀ | −45.3 ms ⚠️ unexplained | **−29.3 ms** · over 5 runs −30.3…+2 — still frame-quantised, and biased; §anchor |
| cue engine drift (`deck.drift()`, **cue lane only**) | p50 1.12 / p95 1.48 ms | **p50 0.66 / p95 2.11 ms** |
| upload lag (segment close → verified in R2) | p50 5.00 / p95 6.08 s | **p50 4.62 / p95 5.94 s** (min 2.51, max 6.30) |
| disk high-water while recording | 1.88 MB = 2 seg | **1.90 MB = 2 seg** — O(1) in show length |
| burned-row decode from R2 | 2114/2114 | **2105/2105 (100 %)** |
| run timeline | 119 rows, 173 B sidecar | **132 rows, 173 B sidecar** |
| reconcile | 6/6 green | 6/6 green |

New in v1, same run unless noted:

| number | value |
|---|---|
| sound check, whole publish path (encode → R2 → back → decode) | **19 964 ms** · silent arm (encode 2.7 s / upload ~9 s / return 1.4 s); tone arm 13.9 s |
| tone through the real path | encoder −21.03 rms / −18.06 peak dBFS → after R2 −23.87 / −20.79 — AAC 96k costs **2.7 dB** |
| VU meter source | the RECORD leg's own `astats` — **579** metered frames by the 30 s mark, ~47/s |
| promote / demote round trip (send → DO echo, operator's own socket) | **34 / 47 ms** (32–47 ms over 3 runs) |
| permission window | closed → `stage.mayPublish=false`, reopened → `true` (per-participant → per-role → open) |
| grid archive, `verify-grid.mjs --participants=1` | **8/8** · 1 recorder, 20 chunks, 39.0 s, `h264-in-webm`, skew est 96 ms, degraded=false |
| grid replay compose | `replay-grid.html` phase=running, 1 tile, 3 cues off the room cuelog, 41 s range |
| grid clock master | tile `p1` takes the role; playhead **+6 s in 6 s** (rate 1.0) |
| anchor probe, offline reproduction | 23 runs; identity `anchor − T₀ = swallow − pixelAge` holds **±4 ms** |

Shows are kept in the EXISTING bucket `elektron-archive-test` under
`shows/studio-*`; sound-check objects go to `shows/studio-sc-*` and are
**deleted again** at the end of the check. No CF resource was created, and no
worker was deployed.

## §anchor — CLOSED 2026-08-30. It was never a constant.

**The claim it replaces** (kept, because the correction is the finding): "content
anchor − native T₀ = −45.3 ms; the archive rig measures −15 ms; systematic,
reproduced with a negative control, unexplained."

**The verdict: the quantity has a ~95 ms-wide, frame-quantised distribution, and
−45.3 and −15 are two draws from it — one frame apart at 30 fps.** "Reproduced"
was two samples that happened to land near each other. The negative control
(no console browser) correctly ruled out machine contention, but contention was
never the variable; *which source frame becomes media t=0* was.

### The instrument — `studio/anchor-probe.mjs`

`replay.html` computes the anchor in a browser, off hls.js, off rVFC:
`T0content = median over the first 15 presented frames of (burnedClock − mediaTime·1000)`.
That is three suspects welded into one number. The probe splits it:

* it reproduces **the same median rule offline** — ffmpeg → one 768×1 rgb24 row
  per frame, `showinfo` on the same pass so pixels and PTS cannot mis-align,
  and `decodeRow()` copied verbatim from `replay.html` so the two decoders
  cannot drift;
* and `engine.mjs --probe=N` keeps the first N screencast **JPEGs** with the
  stamps that bracket the hot path, so the burned clock *inside the pixels the
  engine fed ffmpeg* is readable too.

Three legs, independently measurable, plus an identity that must hold:

| leg | what it is |
|---|---|
| `pixelAge` = `tArr − burnedClock` | how old the pixels already are when node stamps T₀ |
| `swallow` = `clockOut[0] − clockIn[0]` | how much source time the encoder consumes before media t=0 exists |
| `anchorOffline − T₀` | the offline anchor |

**Identity `anchorOffline − T₀ = swallow − pixelAge` held within ±4 ms on every
one of 23 runs.** That is what makes the decomposition a measurement and not a story.

### What the two terms actually are

**(a) `Page.startScreencast` hands back a STALE RE-CAPTURE.** The first frame is
whatever is already on the surface — its pixels are up to one 33 ms draw
interval old — but CDP stamps it *now*. Measured age of frame 0: **20–36 ms**
across 7 runs; age of frame 1 onward: a steady **6–9 ms**. So stamping on frame
0 samples a 33 ms-wide uniform lottery. (The CDP swap→arrival lag is a separate,
steady **3–5 ms**.)

**(b) the encoder swallows whole source frames at start-up.** `fps=30` puts the
capture on a 30 Hz grid anchored at the first frame's *read* time; ffmpeg's own
cold-start latency means the first one or two frames are read in a burst, land
in grid slot 0 together, and all but one are dropped — so media t=0 becomes a
frame the engine never stamped. Measured `swallow`: **0 or 33 ms** with the legs
spawned early (n=7), and **0/34/66/66** with `--legs-late`, which reproduces
`proto/archive/record-local.mjs`'s ordering (ffmpeg spawned in the same breath
as the screencast, so it has even less time to initialise). *The archive rig is
the one with more of this artefact, not less.*

Legacy rule, 11 identical runs: `content − native` **−24.3 … +42 ms**, in 33 ms
steps. There is no constant to explain.

### The fix, and where the number went

Two engine changes, both defaulted on, both A/B-switchable:

1. **`--anchor-mode=swap`** (default; `legacy` restores the old rule) — do not
   feed the stale first frame to the encoders at all, and stamp T₀ from the
   **CDP frame-swap timestamp** of the first frame actually written. Result:
   pixel age of the media-0 frame **20–36 ms → 7–10 ms** (n=6).
2. **`--record-fps=`** on the RECORD leg. See the negative result below.

Product number, two full 80 s DoD runs through the real console:

| config | n | content−native (browser) | per-cue err p50 | abs p95 |
|---|---|---|---|---|
| legacy: CFR + `Date.now()` on frame 0 | 1 | −45.3 ms | **−37 ms** | 39 ms |
| **CFR + swap stamp (SHIPPED)** | **5** | −30.3 … +2 ms | **−15 … +23 ms** | **19–26 ms** |
| passthrough + swap stamp | 1 | −45.3 ms | −71 ms | 81 ms |

**The per-cue replay error — the number the 150 ms budget is actually measured
against — went from abs p95 39 ms to abs p95 19–26 ms over five independent
runs**, i.e. 83–87 % under target instead of 74 %. Note that content−native
still moves ±30 ms between those five runs while the per-cue error does not
move nearly as much: the anchor number is frame-quantised AND carries the
browser bias below, so it is the noisier of the two. Trust the per-cue error.

### The negative result: `-fps_mode passthrough` made it twice as bad

Dropping the `fps=30` grid makes the swallow **structurally impossible** — media
t=0 *is* the first frame written, measured 0 swallow in 6/6 runs versus 2/6
under CFR and 4/4 under the archive rig's ordering. It looked obviously right,
and it is the same flag the selfrec repackage path needs for the same class of
problem. It is wrong here: the grid was also **smoothing ±20 ms of pipe-read
jitter out of the media timeline**, and losing that costs more than the swallow
ever did (per-cue abs p95 19–26 → 81 ms; the per-frame anchor estimates go from a
±2 ms band with occasional one-frame outliers to a continuous ±20 ms sawtooth).
Keep the grid, fix the stamp. `STUDIO_RECORD_FPS=passthrough` still selects it.

### The finding nobody was looking for: the content anchor's own bias

Run `anchor-probe` on the *published* playlist a verified run actually played,
and compare with what the browser reported for the same bytes: they disagree by
**26 ms on one run and 50 ms on another** — one to two frame intervals. It is
not pinned tighter than that on purpose: under CFR the fps grid duplicates ~20 %
of output frames, so the offline median can itself land a whole frame either
way. The disagreement is real and one-frame-ish; its exact size is not measured.

`replay.html`'s anchor pairs `decodeNow()`'s pixels — the frame **on the glass**
— with `meta.mediaTime`, which is the PTS of the frame that will be shown at
`expectedDisplayTime`, i.e. the **next** one. That is exactly the trap this repo
already documents ("`rVFC.mediaTime − currentTime` is a one-frame BIAS, not
noise; the correct use is the pair `mediaAtNow = mediaTime + (now −
expectedDisplayTime)·rate`"), and the anchor does not use the pair.

Consequence: **every content-anchor number this project has printed carries
roughly one frame of bias** — this engine's −45.3, the archive rig's −15, and
DoD-A's native-anchor p50. It is common to both rigs, so it does not explain the
−45/−15 gap (the capture-side lottery does), but it means none of those numbers
is the anchor's true value. **`proto/replay/replay.html` is not this session's
file to edit; the one-line fix is `mediaTime + (now − expectedDisplayTime)/1000`
inside `onFrame`, and it should be made with the archive rig re-measured in the
same breath, since every historical figure moves with it.**

### What is left open, precisely

The swallow still happens under CFR (2/6 short runs, and the shipped 80 s
verify run shows it too). Its cause is named and its size is exactly one source
frame; the intervention that removes it costs more than it saves. Every run now
records how its anchor was built — `show.json.anchor = {mode, skippedFirstFrame,
t0swap, t0arrive, swapMinusArriveMs}` and the same on the `t0` timeline marker —
so any run's anchor is auditable after the fact instead of being assumed.
`verify.mjs` asserts that **construction** (deterministic, cannot flake at n=5)
and keeps the value gate on the budget rather than on a number whose ground
truth is itself one frame wide.

Related discipline kept: cue offsets are always FRACTIONAL seconds
(10.3/22.7/35.1/48.9/62.3). Integer seconds phase-lock any poll grid and alias
the error distribution — the 6u lesson, and the reason the historic "59 ms" was
one deterministic sample rather than a distribution.

## SOUND (v1, plan-studio §1)

Three things, and the third is the only one that is not decoration.

**VU meter.** `astats` sits in the RECORD leg's own audio filter chain
(`astats=metadata=1:reset=1:measure_overall=RMS_level+Peak_level` →
`ametadata=print:file=-`, drained off the child's stdout). So the dB the console
shows is the level of **the samples being encoded into the archive**, not a
second capture of a second stream in the browser. Pass-through filters: they do
not touch the samples. Digital silence prints `-inf`, floored at −120 dBFS.
⚠️ stdout must be drained or ffmpeg blocks — the meter's own pipe is the hazard.

**Monitor toggle.** One more tracked child: `ffmpeg … -f audiotoolbox -` from the
configured source to this machine's default output. In the child registry, so
the fatal path kills it. The muxer exists in this ffmpeg build (`E audiotoolbox`)
and the leg is wired and lit; **it is audibly UNVERIFIED** — like the STAGE leg,
there is no headless way to hear it. The console says outright that monitoring a
mic through speakers is a feedback loop.

**The 5 s loopback check — through the real publish path.** A check that does not
traverse the real path is theatre, so this one *is* the path, in miniature and
with the same code: `audioInput()` → the same `FF_VIDEO`/`FF_AUDIO` → HLS mux →
`wranglerPut` → R2 → public HTTPS → decode, measuring the level at **both** ends.
It exists to discriminate four states, which is the whole reason it is worth the
18 s:

| configured | at the encoder | after R2 | verdict |
|---|---|---|---|
| SILENT | silent | silent | **OK** — "a silent show is a valid show; the path is proven, not merely quiet" |
| SILENT | audio | — | FAULT: something is bleeding into the mix |
| audio | silent | — | FAULT: wrong device, muted input, or held by another process |
| audio | audio | silent | FAULT: the publish path is eating it |

A meter alone cannot tell the first from the third. Measured, both arms exercised:

| arm | result |
|---|---|
| `audio=silent` | OK · encoder −120/−120 dBFS · after R2 −120/−120 · 142 frames decoded back · encode 2.74 s / upload 9.05 s / return 1.38 s / **18.1 s** total |
| `audio=tone` | OK · encoder **−21.03 rms / −18.06 peak** dBFS → after R2 **−23.87 / −20.79** — the 96 kbps AAC round trip costs **2.7 dB** · **13.9 s** total |

Objects land under `shows/studio-sc-<ts>` in the existing bucket and are
**deleted again** at the end of the check; no CF resource was created.
The check is **idle-only** — during a show the live meter is the live
instrument, and a second encode plus a second R2 stream would tax the very show
it is checking. The console says that instead of silently disabling the button.

## ROOM (v1, plan-studio §1)

**`studio/roster.mjs` is the roster adapter plan-studio §5 promised and v0 did
not ship.** (It was not "already there": nothing named roster existed anywhere in
`timeline/`.) Plain ESM with no imports, so node and the browser load the
identical file and the live roster and a replayed roster are the same
computation rather than two implementations that agree today.

A roster is a **fold over an ordered prefix**, not a snapshot that gets patched.
The DO sends exactly one `roster` snapshot — to the joiner, at join — and nothing
but deltas afterwards. Anything holding a private copy is holding page state,
which is what DoD-A forbids; and only the fold can answer the question the grid
replay has to ask, *"who was on screen, in which tier, at 19:42:07.3"*.
It satisfies `timeline/transport.mjs`'s adapter contract
(`caps.catchUp:'reduce'` + `reduce` + `assertState`) and is registered on the
**same deck as the cues**, so `deck.reduceAt('roster', t)` works and every room
delta is one `roster` row on the run's timeline.

Nine ops, one vocabulary: `snapshot · join · left · tier · publish · unpublish ·
perm · liveness`. Every server→client frame the DO can send maps onto one of them.

Wired in the console: faces (the room DO's own snapshot tiles, `GET /tile/{room}/{pid}`,
which needs no token), tier badges, click a face → promote/demote, the
permission-window toggle, dead-tile flags.

Things the DO's shape forces, all of them found by reading its source:

- **A rejected `promote` produces no error frame at all.** Non-operator, bad
  tier — the DO drops it silently. The echo (it broadcasts to *everyone
  including the sender*) is the only acknowledgement there is, so the engine
  waits for it, **measures it**, and a 4 s timeout is part of the contract, not
  a nicety. The console prints "NOT echoed" rather than showing a tier that did
  not change.
- **`perm.publish` is one flat namespace keyed by both role names and
  participant ids**, resolved per-participant → per-role → OPEN. `rosterView()`
  mirrors that resolution so the console shows what the room will actually do,
  not what the operator typed.
- **A rejoin closes the old socket with 4001 and deliberately emits no `left`.**
  Absence of `left` is therefore not evidence of presence.

**Dead tiles.** `left` is the clean-departure detector (38–126 ms, versus the
SFU's 31–47 **s** session 410). A *frozen* publisher never sends one — the socket
stays open and the pixels stop. The only per-participant liveness signal that
exists is the room DO's snapshot tile, so the watchdog polls
`GET /tile/{room}/{pid}` every 3 s and reads `X-Tile-Age-Ms`: fresher than 6 s →
`live`, older → `stalled`, no tile ever → **`unknown`, which is a real answer** —
a participant who has never posted a tile is not evidence of death. State
changes become `liveness` rows on the timeline like everything else.

## GRID ARCHIVE (v1, plan-studio §2 + §5's "FIRST v1 feature")

The A/B is closed by measurement and is **not** re-litigated: per-participant
self-recording beat central recording decisively (central = 8.1–8.6× the grid's
live budget at N=54, and every join/leave cuts a 130–172 ms frame gap into every
*other* participant's file). So the engine does not record the grid at all.
It does three things:

1. hands out a **participant link** for the run (`/proto/selfrec/participant.html`
   with this run's `show`, `room`, tokens) — each browser records **itself**,
   source quality, off camera = zero bytes;
2. **is their collector**: `POST /beacon` on the engine's own origin, which is
   also where `participant.html` is served from, so a participant needs no
   second process to be measurable;
3. at stop, if the room's own cue log shows anyone self-recorded (participant.html
   publishes a `media-span` cue at `start`/`end`), spawns
   **`proto/selfrec/postshow.mjs` verbatim** — whose own header says "this is the
   engine.mjs seed: Session B calls this verbatim when a show's media-span ends" —
   and publishes the grid replay URL beside the ordinary one.

`node studio/verify-grid.mjs --duration=45 --participants=1` drives the whole
thing headlessly: the engine's autopilot with real self-recording participant
browsers, then the real `replay-grid.html` at the URL the engine put in
`show.json`, checked through its documented hooks only.

Anchors: the participant's is `T0recStartDate` (`Date.now()` immediately before
`recorder.start()`, timeslice 2000 ms). **Never `T0firstData` — measured −1989 ms,
one whole timeslice late.** That is the same class of mistake as §anchor above,
one layer up, and it is why the two anchors are documented together.

## What the engine is

`engine.mjs` is a **supervisor**, not a script. One child registry; every handle
in it; `killAll()` on any fatal path, on SIGINT/SIGTERM, on uncaughtException and
on unhandledRejection. Proven in anger: the first shakeout died on
`deck.transport.driftStats is not a function` **after** the uploader had already
been spawned, and the fatal path killed ffmpeg + chromium + uploader before
exiting — no orphan kept writing that run's R2 prefix.

Children: headless chromium source (CDP screencast) · ffmpeg RECORD leg (local
segmented HLS) · ffmpeg STAGE leg (RTMPS, optional) · `proto/archive/uploader.mjs`
**verbatim, unmodified**. The screencast tees one JPEG buffer to every encoder
leg's stdin, so stage and archive share a single capture.

**Per-run isolation is a rule, not a nicety** (the rerun-poison lesson): run id,
room name, RECDIR and R2 prefix are all `studio-<ts>`. A rerun can never replay a
stale cuelog or clobber a previous run's segments.

### The cue engine IS the library

One `createDeck()` whose position domain is **absolute wall ms** (replay.html's
law: a cue's `at` IS its position), one `cue` adapter whose `actuate()` sends the
room frame. `tickHost:'main'` because node has no `Worker`.

Every cue — typed or scored — goes down the **same lane**: a "now" cue is stamped
`Date.now() + 150 ms` so the scheduler owns it exactly like a scored one.
Uniform path, honest drift, imperceptible to an operator. The residual between
the deck's position and wall time is measured once at go-live and *reported*
(`deckOffsetMs`, −0.9 ms both runs), never silently absorbed.

That is what makes the SHOW strip legible: it renders `deck.drift()`,
`deck.audit()` and `sched.driftStats()` — the library's own channel — and
nothing derived from what the page clicked. `verify.mjs` asserts this
(`strip-reads-drift-channel`) by reading the caption the strip prints.

⚠️ `driftStats()` lives on **`deck.sched`**, not `deck.transport`. The deck facade
does not re-export it. That cost one run.

### The run's timeline

One JSONL per run, rows `{at, kind, source, v, payload}` stamped in **epoch
microseconds** (`timeline/logdeck.mjs`'s capture-log convention, so
`makeLogDeck()` can consume it directly). Kinds: `marker` (go-pressed, t0,
leg-up/leg-down, cue, score-loaded, stop, run-end, fatal), `media-span` (one per
CLOSED segment — the playlist is the close signal; `at` is its exact wall start
from the EXTINF prefix sum), `health` (1 Hz: cpu of every tracked child, encoder
fps, upload lag, resident bytes/segments, per-leg up/down), `cue` (with the
deck's drift record attached).

At stop it is indexed with the library's own `buildJsonlIndex()`, **read back
through `jsonlStore().open()`** (so the sidecar is proven, not assumed) and
uploaded beside the show with `show.json` and `cuelog.json`.

### Reconcile

`postshow.mjs`'s rule, one level simpler: **R2 is the only truth.** Nothing local
is consulted — the playlist is re-fetched *from R2* and every `.ts` it references
is HEAD-verified, plus the three sidecars. Runs at every stop and on demand
(`--reconcile` sweeps every run this machine knows about). It already earned its
keep: it correctly reports the crashed shakeout run as DEGRADED
(`playlist-in-r2` missing) because that run never recorded anything.

Wrangler is called with a scrubbed env **and** `cwd` pinned to `proto/archive`
(no `.env` there) — the auth trap, unchanged.

## Files

| file | what |
|---|---|
| `studio/engine.mjs` | the CLI: supervisor, control WS, static server, cue deck, roster fold, sound, timeline JSONL, reconcile |
| `studio/console.html` | the operator surface: GO LIVE · ARCHIVE · SHOW · SOUND · ROOM · GRID + strip |
| `studio/roster.mjs` | the roster adapter — one fold, loaded by node AND the browser |
| `studio/verify.mjs` | the DoD check — drives the real console, opens the real replay link, measures |
| `studio/verify-grid.mjs` | the grid-archive check — real participants, real postshow, real replay-grid |
| `studio/anchor-probe.mjs` | the anchor instrument: splits content−native into capture / encode / playback |
| `studio/runs/<runId>/` | `timeline.jsonl` + `.idx.json`, `show.json`, `cuelog.json`, `uploader-report.json` |
| `studio/runs/index.jsonl` | one line per run (a hint for `--reconcile`; R2 is the truth) |
| `studio/artifacts/` | `verify-report.json`, `console-mid-show.png`, `console-stopped.png`, `replay-final.png` |
| `results/studio-verify.jsonl`, `results/studio-upload.jsonl` | the measurement trail |

Nothing under `timeline/` or `proto/` was edited. The library is imported;
`proto/archive/uploader.mjs` is spawned as-is.

## Notes for whoever is next

- **The one change worth making in another agent's file** (I did not, on
  purpose): `proto/replay/replay.html`'s content anchor pairs the pixels on the
  glass with the mediaTime of the NEXT frame. One line in `onFrame`:
  `anchorEstimates.push(d.clockMs - (meta.mediaTime + (now - meta.expectedDisplayTime) / 1000) * 1000)`.
  Every historical content-anchor figure in this repo moves when it lands, so
  it should be done with `proto/archive`'s rig re-measured in the same breath.
- **`studio/roster.mjs` is already loadable by the grid replay** — it is plain
  ESM with no imports, served from the same origin as
  `proto/selfrec/replay-grid.html`. Wiring the roster lane into the grid is an
  import plus a lane there, not new code here.
- **`--legs-late`, `--anchor-mode=legacy`, `--record-fps=passthrough` and
  `--probe=N` are kept as switches, not deleted.** They are how the §anchor
  A/Bs were run and how the next person re-runs them without re-deriving the
  rig. `--no-upload` makes an anchor run cost zero R2.
- **`timeline/strip.mjs` LANDED mid-session and I did not adopt it. Here is
  exactly why, because it is a real finding and not a dodge.** The component's
  entry point is `createStrip(canvas, deck, opts)` and it is *deck-coupled*: it
  calls `deck.position/range/window/sampleAt/caps/evidence/setEvidence/
  provenanceOf/evidenceAccounting/rangeGen/playing/seek/drift/driftStats/
  durationMs/transport/sched` — seventeen members — every frame, because its
  doctrine is "lanes are queries, not containers: the strip asks the deck, the
  client never pushes rows into a lane."

  **In studio the deck is in the other process.** The cue deck lives in
  `engine.mjs` (node); the console is a browser page on the far side of a
  WebSocket. So there are only three ways to use the component, and all three
  are wrong for v0:
  1. build a *mirror* deck in the page from the streamed rows — but a mirror
     deck's `drift()` is the console's own scheduling, i.e. **page state**,
     which is precisely what plan-studio §5 DoD-A forbids the strip from
     reading;
  2. shim a fake deck over the streamed snapshot — ~17 members, several
     (evidence policy, provenance, caps negotiation) whose semantics I would be
     guessing at;
  3. proxy every call over the wire — a synchronous per-frame interface across
     an async transport.

  The honest fix is a **remote-deck seam in the library** — a serialisable deck
  view (`window`/`position`/`drift`/`audit` over a snapshot) that `createStrip`
  accepts alongside a live deck. That is a `timeline/` change and `timeline/` is
  a sibling's. Flagged for v1; it is the single thing standing between studio
  and the canonical visualizer.

  Meanwhile the strip is drawn inline in `console.html` — ~50 lines, clearly
  fenced, reading `deck.drift()` / `deck.audit()` / `sched.driftStats()` out of
  the engine's status frame. It renders the engine's real channel; it is just
  not the shared component. (I also left it un-refactored on purpose: the
  component file was being edited by its owner *while this ran* — it shows as
  `M timeline/strip.mjs` in git — and importing a moving target into a verified
  page to re-verify with fresh credits was the wrong trade.)
- **Port 8899 serves the whole repo root** so `/timeline/*.mjs`,
  `/proto/replay/replay.html` and `/studio/console.html` share one origin
  (replay.html imports `/timeline/transport.mjs` absolutely). Same hardening as
  `replay-server.py`: local `Host` only, any dotted path component → 403 (the
  root holds `.env`; verified `GET /.env` → 403).
- **The WS server is hand-rolled** (~45 lines of RFC 6455 in `engine.mjs`). There
  is no `ws` package on this machine and installing one is a bundler-shaped
  problem the TL constraint forbids. Text frames, ping/pong, close. Sufficient.
- **The engine holds the room socket**, so the console never needs `ROOM_TOKEN`
  and every cue is stamped by one clock. The DO never re-stamps (unchanged).
- **The replay link is a localhost URL** carrying `ROOM_TOKEN` as a query param —
  replay.html needs it to fetch the cuelog. Same as the archive rig. Fine on
  localhost, wrong the day the console is deployed as a Worker.

## What the studio still does NOT do

- **Monitor is audibly unverified** — the leg spawns, is tracked and is lit, but
  nothing headless can hear it. Same honesty as the STAGE leg.
- **The baked grid audio policy** ("featured + active speaker audible, rest
  push-to-talk", plan-studio §1) is NOT implemented. The studio has no grid
  audio path at all: the grid is self-recording plus the SFU, and the stage mix
  is a separate ffmpeg leg. Nothing here mixes participants. The composite
  grid-audio mix is still the flagged phase-3 unknown it always was.
- **The sound check is idle-only.** Mid-show it refuses and says why.
- **`replay-grid.html` does not read the roster lane yet.** The engine writes
  `roster` rows into the run's timeline and `studio/roster.mjs` is a plain,
  browser-loadable ESM served from the same origin as the grid page — so the
  wiring is a one-line import there plus a lane. That file belongs to
  `proto/selfrec`, not to this session. Today the grid composes off `show.json`
  + the cue log, which is what it already knew how to do.
- **The grid was verified with ONE participant.** Tier-driven layout, N>1 skew
  and the 130–172 ms join/leave gap that killed central recording are all
  untested here (they are measured in `proto/selfrec`, not through the studio).
- **The stall watchdog needs tiles.** A participant that never POSTs a snapshot
  tile reports `unknown` forever — correct, but it means the watchdog is only as
  good as the participant page's tile cadence. `participant.html` does not post
  tiles at all, so in the grid path today every recorder is `unknown`.
- **Tauri / any packaging** — deliberately never. The web+CLI split is the point.
- **STAGE leg is implemented but UNVERIFIED.** It needs `STAGE_RTMPS` (or
  `STAGE_KEY`) in `.env`; there is none, and creating a Stream live input was out
  of scope (no new CF resources). The console disables the checkbox and says so.
  The ffmpeg invocation is `rig/push-llhls.sh`'s proven LL-HLS-compliant encode.
- **`source=lavfi` is implemented but its T₀ is APPROXIMATE and flagged as such**
  (`t0Exact:false`): with no input-side write there is nothing to stamp, so the
  spawn moment is used. It is never presented as native. Only `source=page` was
  verified.
- **`audio=device:N`** (avfoundation) is implemented and unverified.
- **ARCHIVE panel lists nothing.** Wrangler has no `r2 object list`, so there is
  no cheap bucket enumeration; `runs/index.jsonl` + `/api/runs` is the local
  index and R2 is verified per-run by HEAD. A shows-index object is v1.
- **No score editor, no fire/hold, no cancel** — a score loads and arms; there is
  no way to un-arm it short of stopping. `scores/*.json` `promote`/`demote`
  actions ride plain `setTimeout`, not the deck (only `cue` actions are on the
  lane).
- **No seek/scrub on the live strip** — it is a monitor, not a transport.
- **rate ≠ 1 on media, editing, nested quotation** — out of v0 by the plan.

## Mobile (2026-08-28) — console.html

Operator-facing and still desktop-first; this was the cheap pass only. It
already had a viewport meta and did not overflow. Added, all inside
`@media (pointer: coarse)` so a mouse never sees it: 48 px GO/STOP, 44 px
inputs/selects at **16 px font** (iOS zooms the whole page in on focusing
anything smaller and never zooms back), 44 px checkbox rows via the existing
`<label for=…>`, and safe-area padding.

One real bug found on the way: `fetch("/api/scores").then(r => r.json())` had
no `.catch`, so opening the console **without the engine behind it** (a phone
pointed at a static copy, a bookmark loaded before `node studio/engine.mjs` is
up) threw an unhandled rejection that aborted the rest of that task — the score
picker stayed empty and said nothing. It now degrades to
`<option disabled>no engine — …</option>`.

`node timeline/lab/mobile-verify.mjs console` — 9/9 at four device modes.
Screenshot: `results/mobile/console-390x844.png`.
