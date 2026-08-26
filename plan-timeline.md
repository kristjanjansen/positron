# plan-timeline — "save anything to a timeline, play anything back" (2026-08-26)

The universal substrate under studio/replay/archive. Synthesis of two lineages:
the user's four timeline experiments (~/personal/{time,demo,maria,tracker}) and
elektron's measured machinery. Each supplies what the other lacks.

## 0. The convergence

Four prior generations (time→demo→maria→tracker) independently settled on:
- **Absolute epoch timestamps; relative origins derived at play, never stored.**
- **One flat sorted array of `{timestamp, payload, status}`** — kind is a `type`
  field IN the payload; no track containers.
- **A six-function transport**: `schedule / on / play / stop / clear` + `events`
  + `status` (maria/composables/transport.ts is the typed reference).
- **Record and replay share one path**: schedule() during playback fires
  immediately; only actuators render, live or replayed.
- **Throttle at capture (~100 ms), interpolate at replay** (CSS transitions,
  Catmull-Rom — measured tradeoff, time/demo10).
- **Two clocks, chosen deliberately**: Date.now()+timeouts for UI replay;
  AudioContext + Chris-Wilson lookahead for tight timing (tracker/demo has the
  production-grade loop + the `nowBeatFloat()` gap-mapping one-liner, plus the
  rule: clock origin = first REAL event, not the arm).
- **The strip visualizer** (px-per-second, playhead line, event log) — rebuilt
  four times; build it once as a component.

**The gap in all four: no seek, no position-preserving pause, no rate.** Every
replay is "from the top, forward". `timeline-emitter.js` declares playbackRate/
seekOffset and never uses them.

**Elektron supplies exactly that missing piece, measured:** the timed-messages
crossing engine + catch-up = state reconstruction at any playhead (seek tests
green, ±80 ms replay accuracy), plus native-T₀ anchoring (−15 ms), sender-stamp
discipline (DO clocks lie), DO persistence w/ backlog, R2 media segments as the
heavy-payload store, and multi-user rooms (maria already recorded off a
websocket — data.elektron.art — this was always one system).

## 1. Architecture

```
CAPTURE ADAPTERS        TIMELINE (the substrate)         ACTUATOR ADAPTERS
keyboard mouse MIDI  →  append-only log of Events     →  keyboard-out MIDI-out
cue chat roster         {at, kind, source, payload      cue-render chat-render
media-clip audio         | mediaRef}                     video-tile audio-node
sensor (Max/OSC)        sender-stamped, absolute ms     canvas/DOM/interp
        └── one path: live = playhead at now ──┘
STORE   live: room DO (broadcast-then-persist, backlog on join)
        archive: JSONL + media segments in R2; anchor = native T₀
TRANSPORT  maria's six functions + the missing four:
        seek(t)  – reconstruct state at t via per-kind reducers (elektron's
                   catch-up generalized: reducer(events≤t) → state; media kinds
                   seek their element; heavy kinds may keyframe/snapshot)
        pause/resume – position-preserving (accumulated offset, time/demo9 model)
        rate(r)  – scale scheduler mapping (wall lane only; audio lane re-derives)
        window() – query view for visualizers/lanes (kind/source filters —
                   "tracks" are queries, not containers)
CLOCKS  wall lane: the proven 100 ms crossing engine (cues, UI, chat)
        tight lane: tracker's lookahead scheduler for WebAudio/MIDI kinds;
        bridge via nowBeatFloat()-style gap mapping; media lane: element time
        mapped through T₀ (proven)
```

Adapter contract (maria/keyboard.ts generalized): a capture half (emit Events),
an actuate half (render an Event), an optional reducer (state at t), an optional
interpolator (between sparse samples). Registry-based, like visualia's
registerSteppable seam.

## 2. What it unifies in elektron (v1 targets)

cues, chat, roster/tier changes, score commands, per-participant media segments,
sensor/OSC from Max — all become kinds on ONE log. The replay page becomes the
generic timeline player; grid-replay = video-tile actuators + roster reducer;
show-control = a timeline being appended live; the score system = a pre-authored
timeline merged with the live one.

## 3. Phases

- **v0 — the library** (`timeline/` in-repo, no framework): Event type + store
  (memory/DO/JSONL-R2 backends) + transport (six + four) + wall-lane scheduler
  (port from timed-messages) + 3 adapters (cue, mouse, media-clip) + the strip
  visualizer component + trace-replay tests (simulate_typing.mjs rule: synthetic
  and real traces share one shape — no humans needed in CI).
- **v1 — elektron on it**: cuelog/roster/chat migrate to kinds; replay page →
  timeline player; per-participant archive replay (plan-studio grid-archive)
  rides the roster reducer.
- **v2 — the tight lane**: tracker's lookahead scheduler as the audio/MIDI lane;
  beat-domain storage optional per kind (tracker's loops model); Ableton Link
  bridge experiment.
- **v3 — editing**: mute/solo by query, trim/re-time, timelines referencing
  timelines (a show quoting a show); the DAW-ish surface, only if earned.

## 4. Rules inherited (non-negotiable)

Stamp at the source; the store never re-stamps. Absolute ms epoch. Payload
carries kind. One render path for live and replay. Anchor from content/native
stamp, never platform metadata. Heavy payloads by reference (R2), presence as
events. Throttle capture, interpolate replay. Choose the clock per kind, bridge
explicitly.

## 5. Open questions

Reducer cost for long logs (snapshot cadence?); cross-device clock skew bounds
for multi-user music (wall lane fine at ±50 ms; tight lane needs Link-style
sync?); event schema versioning (replayed by code that didn't write it);
rate≠1 over media lanes (element playbackRate vs scheduler scaling).
