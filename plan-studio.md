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
| Grid archive | composite RENDERER (headless page, unavoidable — the grid exists only per-browser) → the SAME local recorder → R2. RTMPS from the composite ONLY when it doubles as a live feed (audience-camera cut / HLS grid channel) — a delivery choice, not an archive one |
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
- v1 (≈2 sessions): SHOW + ROOM + SOUND panels; score editor (textarea + validate is
  enough); sound-check; health strip. Two-clock rehearsal happens HERE (first real
  human test through the console).
- v2 (when an unmanaged machine exists): Tauri wrap + signing; OBS plugin/profile
  auto-config; composite-recorder audio mix test; MoQ auto-upgrade tier in the
  audience player; R2 lifecycle rules (retention/pruning).

## 4. Risks / open items

- Composite grid-audio mix untested (flagged phase 3); engine treats grid-archive
  as v2.
- Two-clock policy is an aesthetic decision — console ships a "house sound follows
  which tier" toggle for the rehearsal to decide.
- iPhone MoQ AUDIO verdict pending (one visit to ?namespace=elektron-audio-test).
- UDP-hostile-network rate unknown → the MoQ auto-upgrade must fail fast + silent
  to SFU (already the probe design).
- Token rotation + draft-16 relay still on the user (unchanged).
