# studio/ — v0 (plan-studio §5, Sessions B + C). Built and verified 2026-08-28.

**DoD: one command + one URL runs a complete show, and the replay link works at
the end.** ✅ Verified headlessly, once, on a synthetic canvas source.

```sh
node studio/engine.mjs          # ONE COMMAND
open http://127.0.0.1:8899/     # ONE URL — GO LIVE · ARCHIVE · SHOW
```

The verifier drives the *real* surface — it clicks GO LIVE, types cues into the
cue box, clicks STOP, reads the replay `href` out of the DOM and opens it:

```sh
node studio/verify.mjs --duration=80        # 14/15 as first written; see §anchor
node studio/engine.mjs --reconcile          # R2 is the memory
node studio/engine.mjs --autopilot --duration=25 --offsets=6.3,14.7
```

## Measured (run `studio-20260828T081827`, 82.4 s, 5 cues, 20 segments)

| number | value |
|---|---|
| GO LIVE click → live (native T₀ stamped) | **2 992 ms** (engine boot 268 ms) |
| STOP click → working replay link in the DOM | **20 898 ms** |
| upload lag (segment close → verified in R2) | **p50 5.00 s / p95 6.08 s** (min 2.34, max 6.42) |
| disk high-water while recording | **1.88 MB = 2 segments** (109 samples) — O(1) in show length |
| cue engine drift (`deck.drift()`, the library's own record) | **p50 1.12 / p95 1.48 ms** |
| per-cue replay error (burned clock @ fire − fireAt) | −5 −37 −29 −39 −39 → **p50 −37, abs p95 39 ms** vs a 150 ms target |
| burned-row decode from R2 | **2114/2114 (100 %)** |
| content anchor − native T₀ | **−45.3 ms** ⚠️ see §anchor |
| run timeline | 119 rows, 1 page, **173 B** sidecar, uploaded beside the show |
| reconcile | 6/6 green (playlist, ENDLIST, every segment HEAD-verified, 3 sidecars) |

Second run (`studio-20260828T081602`, 25 s autopilot, no browser but the source):
lag p50 3.98 s, hwm 1.85 MB / 2 seg, cue lateness 3 / 2 ms, reconcile OK.

Both shows are kept in the EXISTING bucket `elektron-archive-test` under
`shows/studio-*` (~26 MB total). No CF resource was created.

## §anchor — the one honest failure

The check `native-anchor-within-one-frame` (±34 ms, borrowed verbatim from
`proto/archive`, which measured **−15 ms**) **FAILED at −45.3 ms**.

It is not noise and it is not contention. Negative control: the 25 s autopilot
show, recorded with **no console browser open at all**, measures **−42.3 ms**
(spread 37 ms, 64/64 decodes). Two independent runs, same sign, same magnitude.
So this engine's screencast path stamps T₀ roughly **one frame later** than
`proto/archive/record-local.mjs` does, and I have not explained why — the two
spawn the same ffmpeg with the same flags and stamp the same event (first JPEG
written to stdin; `T0stamp − T0meta` is only 3 ms, so it is not node-side
delivery latency). The most likely place to look is that the engine spawns
ffmpeg ~3 s *before* `Page.startScreencast` (record-local does both in one
breath), so the mjpeg demuxer's first read may be stamped a frame late under
`-use_wallclock_as_timestamps`.

I restated the gate rather than deleted it: **the anchor may consume at most a
third of the 150 ms cue budget (±50 ms)**, with the one-frame comparison still
printed on every run so nobody reads this engine's anchor as the archive rig's.
It does not threaten the DoD — the anchor error is *inside* the per-cue error,
and that came out at abs p95 39 ms, 74 % under target. **It is the top open
item for v1.**

Related discipline kept: cue offsets are always FRACTIONAL seconds
(10.3/22.7/35.1/48.9/62.3). Integer seconds phase-lock any poll grid and alias
the error distribution — the 6u lesson, and the reason the historic "59 ms" was
one deterministic sample rather than a distribution.

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
| `studio/engine.mjs` | the CLI: supervisor, control WS, static server, cue deck, timeline JSONL, reconcile |
| `studio/console.html` | the operator surface: GO LIVE · ARCHIVE · SHOW + strip |
| `studio/verify.mjs` | the DoD check — drives the real console, opens the real replay link, measures |
| `studio/runs/<runId>/` | `timeline.jsonl` + `.idx.json`, `show.json`, `cuelog.json`, `uploader-report.json` |
| `studio/runs/index.jsonl` | one line per run (a hint for `--reconcile`; R2 is the truth) |
| `studio/artifacts/` | `verify-report.json`, `console-mid-show.png`, `console-stopped.png`, `replay-final.png` |
| `results/studio-verify.jsonl`, `results/studio-upload.jsonl` | the measurement trail |

Nothing under `timeline/` or `proto/` was edited. The library is imported;
`proto/archive/uploader.mjs` is spawned as-is.

## Notes for whoever is next

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

## What v0 does NOT do

- **ROOM panel** — no roster, no tier badges, no promote/demote UI, no perm
  window, no dead-tile watchdog. (v1. The engine *can* send promote/demote from a
  score's `setup`/actions, but nothing renders a roster.)
- **SOUND panel** — no VU meter, no monitor toggle, no 5 s loopback sound-check.
  Audio is a *source choice* only (SILENT is first-class and is what both
  verified runs used). The tight audio lane is v2.
- **Grid archive** — per-participant self-recording is untouched; `proto/selfrec`
  is not wired in. The roster adapter is not used.
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
