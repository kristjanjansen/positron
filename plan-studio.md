# Elektron Studio — operator app plan (2026-08-26)

Goal: collapse all measured pathways into ONE operator surface with ~three buttons.
Audience/participants never install anything (their pages exist). Only the operator
side needs wrapping — and it must survive ThreatLocker.

## 0. The ThreatLocker-proof architecture

TL kills unapproved app bundles (OBS, cargo output, unsigned dylibs, Tauri/Electron
alike). It does NOT kill: web pages, homebrew node, homebrew ffmpeg, headless Chrome —
everything this project has run for two days. Therefore:

```
┌─ CONSOLE (deployed web page, like every test page) ───────────────┐
│  GO LIVE · SHOW · ROOM · ARCHIVE · SOUND panels                   │
│  talks to ▼ via localhost WS + to the room DO via wss             │
└───────────────────────────────────────────────────────────────────┘
┌─ ENGINE (node CLI: `node engine.mjs`, run in a terminal) ─────────┐
│  spawns/supervises: ffmpeg legs · uploader · headless publishers  │
│  exposes localhost control WS · stamps T0 · watches health        │
└───────────────────────────────────────────────────────────────────┘
```

- No bundle, no installer, nothing for TL to kill. `git pull && node engine.mjs`.
- Tauri/Electron single-icon packaging = LATER, only for unmanaged studio machines
  (v2, needs signing). The web+CLI split is the permanent core either way.
- Console deploys as a Worker (pattern: elektron-moq-safari) — versioned, tokened.

## 1. Panels and what they hide

**GO LIVE** — source picker (OBS-out / virtual cam / test pattern) + audio source
(mic / BlackHole / SILENT — explicit first-class option) → one button. Engine starts
the right legs with measured defaults; console shows per-leg status lights.
Hidden: all transport names, codecs, retries, ports.

**SHOW** — cue send box (subtitle/overlay/custom), score loader (scores/*.json =
the proven choreography format), fire/hold, show-health strip (the expected-state
fold from phase 3c). Hidden: PDT sync, DO mechanics, fireAt stamping (console clock,
NTP-checked on open).

**ROOM** — roster with tier badges; click a face → promote/demote (measured 0.5 s);
perm window toggle; dead tiles flagged via `left` (38–126 ms) + stall watchdog.

**ARCHIVE** — on by default. Local segmented record (native T0 at first frame) →
uploader → R2 → replay link appears at show end. Silent-show safe. Off-switch only.

**SOUND** — one VU meter, monitor toggle, 5 s loopback sound-check through the real
publish path. Grid policy baked: featured+active-speaker audible, rest push-to-talk.

## 2. Baked decisions (never asked again)

| Concern | Decision (all measured) |
|---|---|
| Grid transport | SFU + elektron-rtc rooms (jittered retry, batch closes) |
| Stage transport | RTMPS→LL-HLS at ≤1080p + v6 player; WHEP direct optional |
| Fast tier | MoQ auto-upgrade on probe pass (H.264+Opus; phones ≤1080p; 4K only to render-capable endpoints) |
| Archive | LOCAL segmented + native T0 → R2 (free egress); Stream recording = backup only when RTMPS leg exists; NEVER anchor on Stream API `created` (−6.2 s) |
| Grid archive | **PER-PARTICIPANT self-recording** (MediaRecorder in each publishing browser, source quality, segments → R2, recording only-while-publishing — off camera = zero bytes) + the room DO's roster/cue log as the timeline (already persisted). Per-client native T₀ stamps. Replay = grid.html re-composing recorded tracks against the event log — re-viewable, re-editable, per-participant deletable. A composed single file is a DERIVED artifact rendered on demand; the live composite feed exists only when the stage mix wants an audience camera |
| Replay | proto/replay engine (59 ms proven), T0 from engine stamp, cuelog from DO |
| Cues | operator-stamped fireAt, DO never re-stamps |
| Audio codecs | Opus (web legs) / AAC (RTMPS); silence is a valid config |
| Discovery/auth | ROOM_TOKEN + role frames via RtcRoom; MoQ grid = not yet (subscribe budget, silent death, name bricking) |

## 3. What already exists vs to build

EXISTS (tested): all transports + players, RtcRoom DO + cuelog, score system +
choreography semantics, replay page + measurement, recorder pipeline (CDP→ffmpeg),
uploader.mjs + R2 bucket, connect-retry, catalog-shim tri-dialect player, health
patterns, device-verdict beacon rig.

TO BUILD:
- v0 (≈2 sessions): engine.mjs (leg supervisor + control WS + T0 stamping + uploader
  integration); console page with GO LIVE + ARCHIVE wired end-to-end. Definition of
  done: one command + one page runs a complete show incl. replay link.
- v1 ✅ **DONE 2026-08-30** (session 7): SHOW + ROOM + SOUND panels, sound-check,
  health strip. `studio/roster.mjs` is the roster adapter §5 promised and that
  had never been written — plain ESM, loaded identically by node and the browser,
  registered on the same deck as the cues so `deck.reduceAt('roster', t)` works
  and every room delta is a row on the run's timeline. Measured: promote/demote
  echo 32–47 ms; the 5 s sound check traverses the REAL publish path to R2 and
  back (silent → "a silent show is a valid show"; tone → AAC 96k costs 2.7 dB).
  Grid archive wired end to end, 8/8. Verify 14/15 → **24/24**.
  **Two-clock rehearsal has still not happened — it needs a human, and that is
  now the binding constraint on the whole project.**
- v2 (when an unmanaged machine exists): Tauri wrap + signing; OBS plugin/profile
  auto-config; composite-recorder audio mix test; MoQ auto-upgrade tier in the
  audience player; R2 lifecycle rules (retention/pruning).

## 5. MERGED V0 — studio + timeline, one build (3 sessions)

The timeline library IS the engine's event backbone; the SHOW panel IS a
timeline transport UI. One build, not two.

**Session A — `timeline/` core library** (plain ESM, no framework):
- `core.mjs`: `Event {at, kind, source, v, payload}` + `Span {at, dur, kind,
  source, v, mediaRef}`; store interface `append / window(q) / reduce(kind, t)`;
  backends: memory + JSONL file (engine side). Tombstone + unknown-kind
  round-trip rules from plan-timeline §5.
- `transport.mjs`: maria's six functions + `seek(t) / pause / resume /
  rate(wall-only) / window(q)`; wall-lane scheduler PORTED from
  src/timed-messages.js (crossing + catch-up generalized to reducers).
  Adapter contract: `{capture?, actuate, reducer?, interpolate?, caps}`.
- Adapters: `cue` (actuate+reducer — extracted from replay.html), `roster`
  (reducer), `media-span` (video-element actuator w/ seek), `chat`.
- `strip.mjs`: the canonical visualizer (canvas, px/s, playhead, lanes = queries).
- Tests: trace-replay harness; property test `reduce(t) ≡ play(0→t)`; runs in CI
  (plain node, no humans).
- **DoD-A**: ✅ **DISCHARGED 2026-08-28.** replay.html runs on `timeline/`; both
  suites pass unchanged and the numbers IMPROVED: content anchor p50 59 → **16 ms**
  (p95 71 → 34), native T₀ anchor p50 77 → **−4 ms** (p95 95 → 11), engine
  lateness 52 → **5.5 ms**. ⚠️ AND the old figure was wrong in kind, not degree:
  the historic 59 ms was **one deterministic phase sample, not a distribution**
  (cues at 15.000 s = exactly 150 poll periods, so the errors reproduced
  bit-identically two days later). Honest old spec: 0–100 ms + quantization,
  worst case ~133 ms against a 150 ms target — **~11 % real margin, presented as
  60 %.** Measurement cadences must use fractional offsets forever.
  ⇒ Sessions B/C are unblocked; the SHOW panel's strip should read the deck's
  drift channel (`audit()`/`driftStats()`), not page state.

**Session B — `studio/engine.mjs`** (node CLI, TL-proof):
- Supervises children: ffmpeg RTMPS leg, local segmented recorder (native T₀),
  fixed uploader, optional MoQ/SFU publisher pages (headless chrome). All child
  handles tracked; fatal path kills all (review lesson).
- Emits the run's timeline: `media-span` per closed segment, `marker` events
  (go-live, stop, leg up/down), `health` events (CPU, fps, upload lag) — one
  JSONL via the lib's file backend, uploaded beside the show.
- Control WS on localhost:8899: `{go, stop, status}`; reads .env; per-run names.
- **DoD-B**: `node studio/engine.mjs` + `go` runs stage + archive end-to-end
  unattended; `stop` yields an R2 show whose replay works (D below).

**Session C — console + replay** (deploy Worker `elektron-studio`):
- GO LIVE panel → engine WS (source picker, audio source incl. SILENT, one
  button, per-leg lights from `health` events).
- SHOW panel = the strip component live on the room DO feed + cue send box +
  score loader (scores/*.json). Operator joins with OPERATOR_TOKEN.
- ARCHIVE panel: list R2 shows (manifest of runs), open replay.
- Replay page (from DoD-A) linked per show; SOUND = engine-reported meter +
  5 s loopback check command.
- **DoD-C (= v0 done)**: one command + one URL runs a complete show; the replay
  link appears at stop; measurement suite green; grid pages unaffected.

Explicitly OUT of v0: ROOM panel (v1), tight audio lane (v2), rate≠1 on media,
editing, Tauri. Grid-archive replay (per-participant, roster reducer) is the
FIRST v1 feature and the reason the roster adapter ships in v0.

## 4. Risks / open items

**Closed 2026-08-30**: the ⚠ −45.3 ms content anchor is explained — it was never
a constant but a ~95 ms-wide, frame-quantised distribution (a stale first
screencast frame stamped `now`, plus encoder frame swallow). Stamping on frame
swap took per-cue replay abs p95 from 39 to 19–26 ms. ⚠ **And it reaches
further: `replay.html`'s content anchor carries ~one frame of bias of its own,
so every content-anchor number this project has printed carries it, including
the archive rig's −15 ms.** See `studio/NOTES.md` for the one-line fix and the
"re-measure them all in the same breath" caveat.

- Composite grid-audio mix untested (flagged phase 3); engine treats grid-archive
  as v2.
- Two-clock policy is an aesthetic decision — console ships a "house sound follows
  which tier" toggle for the rehearsal to decide.
- iPhone MoQ AUDIO verdict pending (one visit to ?namespace=elektron-audio-test).
- UDP-hostile-network rate unknown → the MoQ auto-upgrade must fail fast + silent
  to SFU (already the probe design).
- Token rotation + draft-16 relay still on the user (unchanged).
