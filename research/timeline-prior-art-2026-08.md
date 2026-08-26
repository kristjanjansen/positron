# Universal timeline — prior-art survey (2026-08-26)

VERDICT: not invented as a whole. Every half exists per-domain; no shipped system
unifies heterogeneous events + media spans + live/archive continuum + transport
semantics + adapters + multi-user capture + web playback. Two qualified
near-misses, both robotics-framed. Full agent report in git history; essentials:

- **rrweb 2.x** (stable, ~20k stars; engine inside Sentry/PostHog/Datadog):
  DOM-only; commercializing; NB their roadmap "token-efficient AI session replay
  format" — the AI-agent-context wave is the likeliest birthplace of a competitor.
- **MCAP/Foxglove**: rosbag2 default since 2023; serialization-agnostic chunked
  append-only container with channels+schemas+summary index; OFFICIAL browser
  SDK (@mcap/browser 1.0.2, 2026). Foxglove = "observability for Physical AI",
  iframe-embeddable views. Nobody using it for human sessions.
- **Rerun** (rerun.io): the closest single org — SDK + time-aware store + Wasm
  viewer + live-scrub + multi-timeline indexing. Robotics-aimed; gaps = ours to
  own (multi-user capture, show transport, media spans, performance framing).
- **W3C Timing Object**: CG closed Jan 2025, final report Dec 2024 — a FINISHED,
  UNENCUMBERED transport spec nobody uses. Successor "Sync on the Web" CG
  (Jan 2025) scopes sender-side sync only. DataCue still stalled.
- **Show control**: ossia score very alive (3.8.x 2026: backwards playback,
  scrubbing) but authoring-centric; QLab 5.5 "Record Cue Sequence" records an
  operator into a timeline group — the record gesture, inside its cue universe
  only; TouchDesigner has channel-level Record/Gesture CHOPs.
- **New entrants**: Replay.io RETREATED from universal time-travel ("once you
  can see video+network you don't need it") → cautionary tale on selling it
  standalone; Croquet→Multisynq = deterministic snapshot+event-log multiuser
  replay (no media); LiveKit ships per-call session replays for AI agents;
  Jam.dev = ring-buffer flight recorder UX + MCP.
- **Standards**: SMPTE ST 2110-41 (2024) timed-metadata streams (broadcast);
  MoQ draft-17 Standards Track — commoditizes live+archive-as-one-track
  UNDERNEATH us; its DVR/seek semantics are unspecified = exactly the layer a
  timeline supplies. **Xerox PARC patented the whole idea in the 1990s**
  (US 5,717,879 "capture and replay of temporal data representing collaborative
  activities"; US 5,786,814) — expired; validation + freedom-to-operate comfort.

STEAL LIST (adopted into plan-timeline):
1. MCAP's container shape: channels=kinds bound to schema records; chunked
   append-only + summary index at close → same bytes serve live (read forward)
   and archive (seek). Candidate replacement for bare JSONL at the archive layer.
2. Rerun's multi-timeline indexing: every event on multiple named clocks
   (wall/sequence/beat); static data shadowing all timelines; temporal batching.
3. Timing Object transport semantics: transport = (position, velocity,
   acceleration) vector; play/pause/seek/rate are vector updates; renderers
   slave to it (their MediaSync = how to slave <video>).
