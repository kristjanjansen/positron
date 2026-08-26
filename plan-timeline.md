# plan-timeline — "save anything to a timeline, play anything back" (2026-08-26)

The universal substrate under studio/replay/archive. Synthesis of two lineages:
the user's four timeline experiments (~/personal/{time,demo,maria,tracker}) and
elektron's measured machinery. Each supplies what the other lacks.

## −1. ORIGIN — the cultural-heritage horizon (added 2026-08-26, from the user)

The idea predates elektron: it comes from cultural-heritage work — media reuse,
remix, restoration, storage, archival, preservation — via a PhD project whose
case study is **Erkki Kurenniemi**: the Finnish electronic-music pioneer whose
instruments (the DIMI sequencer-synthesizers) were event-capture machines AND
whose life was an event-capture project (diaries, tapes, photos — everything
timestamped, with the explicit ambition that the archive could reconstruct the
mind). His devices and his archive share one shape: timestamped moments
awaiting replay. The abstraction generalizes that shape; the horizon is public
media archives (e.g. **ERR** — voice, video, tapes, memories, text) "brought to
new life" through one timestamp format. Kurenniemi's reconstruction dream IS
`reduce(events ≤ t) → state` at its limit.

Requirements this origin ADDS (beyond the live-show case):
- **Deep time + uncertainty**: archival timestamps span decades and are often
  approximate ("1971, probably spring"). Events gain optional `precision` /
  `uncertainty` fields; absolute-epoch ms remains the spine, but reducers and
  visualizers must render fuzziness honestly (a smear, not a fake instant).
- **Provenance and rights as payload discipline**: source, chain of custody,
  rights status travel with every ingested event/span — non-negotiable for
  heritage material, and it strengthens the consent story (C6) for live work.
- **Ingest adapters become archival**: digitized tapes (spans with internal
  time), OCR'd diaries (events from dated pages), broadcast logs, photo EXIF —
  the same capture-adapter contract pointed at the past.
- **"Create something new on top" = programs quoting traces** (C10 enriched):
  a new work is a score that QUOTES archive timelines — which gives v3
  (timelines referencing timelines) its first real client. It stays staged, but
  it is now mission, not indulgence.
- **Standards bridge, not reinvention**: the heritage world already has OAIS/
  PREMIS (preservation), IIIF incl. A/V (presentation), and **W3C Web
  Annotations with temporal media-fragment targets** — the latter is nearly our
  cue/span model as a standard. The timeline positions as the ACCESS AND
  PERFORMANCE layer over preserved objects (export/import to these, never
  replacing them); archive masters stay in the institution's OAIS custody,
  our log references them.

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

## 5. Self-critique (2026-08-26 review) and the resulting amendments

**C1 — "everything is one type" was slightly wrong: instants vs SPANS.** A video/
audio segment is not an instant; it has duration and internal time, and seeking
into its middle needs span-awareness (at + offset, keyframe granularity). The
flat-instant purism worked in the prior experiments because payloads were
moments. AMENDMENT: two primitive shapes on one log — `Event {at, kind, source,
v, payload}` and `Span {at, dur, kind, source, v, mediaRef}`. Consumers that
ignore spans still work; media actuators get honest semantics.

**C2 — reducers can become "reimplement every app twice", with bugs invisible
until someone scrubs.** AMENDMENT: reducers must be pure; the CI property test
is `reduce(events≤t) === state after play(0→t)` on synthetic traces (the
simulate_typing rule); kinds with heavy state emit periodic SNAPSHOT events the
reducer may start from.

**C3 — "two clocks" is really four** (wall, audio, per-media-element, iOS
suspended-context), and rate() breaks differently in each (element playbackRate
has range+pitch limits; audio rate = tempo, only sane in beat domain).
AMENDMENT: v0 rate() applies to the wall lane only; every adapter declares
`caps: {seek, rate, interpolate}` and the transport degrades honestly.

**C4 — the DO-as-store won't take high-rate streams** (per-event broadcast cost;
the review already flagged full-array read-modify-write; 128 KiB value limits).
AMENDMENT: worker store = **DO SQLite rows** (the BeaconStore pattern), never
one JSON value; transports batch capture at ~100 ms flush (matching the
throttle-at-capture rule); broadcast batches, not single events.

**C5 — sender stamps from AUDIENCE devices carry unknown skew** (operator
machines are NTP-checked; a random phone may not be). AMENDMENT: on join, the
client measures its offset against a worker time endpoint (~±25 ms) and every
event carries `{at, skewEst}`; replay may correct. Keep raw stamps verbatim
(never rewrite at).

**C6 — redaction fights append-only, and consent is now load-bearing** (the
per-participant archive argument). AMENDMENT: tombstone events (`kind:redact,
source:X`) + a compaction job that physically deletes tombstoned payloads/media
from R2; replay respects tombstones. First-class from v0, not bolted on.

**C7 — schema versioning is the existential open question, not a footnote**
(archives outlive code). AMENDMENT as law: every event carries `v` per kind;
adapters keep old decoders; UNKNOWN kinds round-trip untouched and render as
opaque ticks — forward-compat by ignoring, never dropping.

**C8 — don't migrate for purity.** Cues/roster work and are measured; migration
is only justified when a feature needs the substrate. v1 is therefore DRIVEN by
the per-participant grid-archive replay (which genuinely needs roster-as-
timeline), and cues migrate only when the replay page refactor proves the lib
against the existing measurement suite.

**C9 — v3 (editing, timelines-of-timelines) is where such projects die.** It
stays out of scope until a real show asks for it by name.

**Interop stance (2026-08-26): MIDI 2.0 = adapter + interchange, NEVER the
protocol.** UMP is a device vocabulary; JR timestamps are jitter offsets, not
absolute time; Web MIDI still exposes 1.0 semantics. Ship: a `midi` kind
(maria's adapter, payload holds raw/UMP words — 32-bit res + per-note data
survive inside), SMF/SMF2 export-import of the midi lane (DAW interchange;
imports are score material per C10), and MIDI Show Control as an actuator for
lighting desks. Same layer-verdict as NDI: great at its layer, wrong substrate.

**C10 — THE BOUNDARY: the timeline is a TRACE format, never an AUTHORING
format.** Scores/patches are programs (relative, conditional, structural time);
the timeline is the trace a performance of them leaves. Performing a score
EMITS events; editing means editing the score, not the log. Musical time enters
as a tempo-map KIND on the log (the MIDI-file move), not by abandoning wall
time. Blurring this is the one way the abstraction turns hostile.

## 6. V0 — merged with studio v0

See plan-studio.md §5 "MERGED V0" — the timeline library ships as the studio
engine's event backbone; the replay-page refactor onto the lib is the
regression gate (the existing measurement suite must stay green).
