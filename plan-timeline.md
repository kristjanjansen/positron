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

## 5b. RECONSTRUCTION — from Catmull-Rom to generative restoration (2026-08-26)

demo10 generalized: interpolation of sparse mouse samples is the seed of a full
restoration capability — and demo10's real insight was drawing ALL paths at
once (evidence + reconstructions overlaid). That is the ethic; the rest is
engineering.

**The inference spectrum** (one mechanism, rising epistemic risk):
1. **Interpolation** — between attested samples (Catmull-Rom, crossfade over a
   tape splice). Bounded by evidence on both sides.
2. **Inpainting** — filling a gap from surrounding context + priors (missing
   diary page summarized from adjacent pages; video frame interpolation across
   a cut; audio inpainting). Plausible, not attested.
3. **Generative restoration** — creating detail never captured (super-
   resolution, colorization, voice enhancement, "AI photo enhance"). A NEW WORK
   conditioned on the trace. This is fabrication — the design's job is to make
   fabrication HONEST by construction, not to forbid it.

**Architecture (slots into existing seams, no new machinery):**
- A **reconstructor is an adapter that READS evidence lanes and APPENDS derived
  events/spans**: `source: reconstructor-<name>`, provenance = refs to the
  evidence events, plus `method`, `confidence`, `tier (1|2|3)`. The master
  trace is never touched (append-only + C6 tombstones already guarantee it);
  deleting a restoration = dropping its lane. Reversibility for free.
- **Reconstruction renders INTO the uncertainty smear** (§−1): where evidence
  is fuzzy or absent, derived lanes fill the smear — visibly.
- **C10 extends: restoration IS remix** — a program quoting the trace, with
  restorative rather than transformative intent. One operation, two intents;
  same provenance rules; unifies the PhD framing (restoration) with the
  performance framing (new works on top).
- **The evidence firewall**: `reduce()` and `window()` take an evidence policy
  — `attested | restored(tier ≤ n) | all` — and the API FORCES the choice; no
  default that silently mixes dreamed data into archival queries.
- **The tratteggio principle** (fresco-restoration practice: infill hatched —
  visible up close, seamless at distance): reconstructed material is
  perceptually seamless in performance but ALWAYS distinguishable on
  inspection — styling in the strip, provenance popover, a global
  evidence-only toggle. demo10's four-paths view is the canonical UI.
- Models (RIFE/FILM frame interpolation, audio inpainting/enhancement, OCR+LLM
  text reconstruction, colorization) are pluggable reconstructor adapters —
  the system hosts them and disciplines them; it never bakes one in.
- **Performance opportunity**: the gap itself is material — a show can perform
  the lacunae (render evidence-only vs restored live, let the audience hear
  the cut and then the dream). Kurenniemi limit-case stated honestly:
  "reconstructing the mind" is tier-3 all the way down, and the system's value
  is keeping the attested/dreamed boundary legible even there.

## 6. V0 — merged with studio v0

See plan-studio.md §5 "MERGED V0" — the timeline library ships as the studio
engine's event backbone; the replay-page refactor onto the lib is the
regression gate (the existing measurement suite must stay green).

## 7. BUILT — state of the library (2026-08-28, sessions 6h–6ab)

The substrate described above is no longer a plan. `timeline/` exists, is
measured, and has **eight clients**. What follows amends §§1–6 with what the
building taught; where a section above is now wrong, this section wins.

### 7.1 What exists
- **`transport.mjs` (v0.5)** — the position vector `{p0,t0,rate}` over a
  pluggable ClockSource (zero timers inside the vector); lookahead wall lane
  (25 ms tick / 100 ms horizon / 150 ms lateGrace, committed-vs-pending with
  cancel); **worker tick host by default** (8.5 ms p95 hidden vs main's 981 ms
  and rAF's 9175 ms); Chris-Wilson audio lane, **sample-accurate at 10 µs**,
  which holds through a 500 ms main-thread stall; `registerAdapter(kind, {caps,
  actuate, reduce, assertState, interpolate})` with per-kind dispatch and
  policy derived from caps; `createDeck` / `makeLogDeck` (multi-lane logs);
  `sampleAt` / `bracket` (O(1) amortised cursor — 3.67 comparisons/call at both
  n=2k and n=8k); `deck.request()` → `{wanted, chose, degraded, reason}` and
  `degradations()`; `sync()` for external clock masters, distinct from `seek()`;
  `setRange()`; non-destructive drift reads (`onDrift`/`peekDrift`/`driftStats`).
- **`nested.mjs`** — composition across timelines: `createNest(deck).add({id,
  at, rate, deck, in, out, master})`. A nested deck is an ordinary adapter kind,
  so `transport.mjs` needed **zero changes** to accept it. Fragment quotation
  (`in`/`out`) plays a PIECE of a child; the same deck may be quoted twice at
  different fragments; a degraded child cannot master the parent's clock.
- **`media-master.mjs`** — the five laws (never nudge the master; drift is
  `sync()` but a discontinuity > jumpMs is `seek()`; a stall gives up the role;
  `timeupdate` is the hidden-tab backstop; paused/ended/seeking is not a clock).
- **`store.mjs`** — memory / JSONL+Range / DO-paged backends behind the cursor's
  two-line interface; **1 M rows open in 2.5 ms holding 3.8 MB** (vs an array's
  143 ms / 114 MB), append-live under a moving playhead with zero cursor resets,
  and a **fire-late-with-a-drift-record** miss policy (stall was rejected —
  a store must not move the transport behind the client's back; skip was
  rejected — it holes the prefix and breaks non-commutative reducers silently).
- **The evidence firewall** (§5b as code) — see 7.3.
- **`lab/prop-test.mjs`** — the C2 gate, runnable, six suites, green at 100
  seeds; plus `prop-nested.mjs`, `prop-store.mjs`.

### 7.2 Clients (each adoption found a latent bug in the code it replaced — 4/4)
jam · jam-interval · replay-grid · instrument session replay · remixer ·
paths (pointer/continuous) · text performer · Kurenniemi corpus. The bugs:
a **−101 ms constant offset** nobody had measured; a forward seek that **fired
every skipped cue**; stored audio starting **+1075 ms early** past a test
structurally blind to it (`advanced > 0` passes for a one-second-early track);
a child media element silently never playing. **Adoption is a bug-detector;
budget for that, not just for the port.**

### 7.3 §5b is now code — and the doctrine survived contact
`createDeck({evidence})` / `setEvidence`, with `'attested' | {restored:{maxTier}}
| 'all'` **forced**: a query either names its policy, inherits one the session
explicitly set, or throws — and the only omission answered is one whose answer
is *provably identical* under all three policies. `registerReconstructor()`
appends **derived lanes**; **attested rows carry no `provenance` key at all —
absence is the definition**; lane purity (a lane is attested or derived, never
both) makes the firewall O(1) and makes "delete a restoration = drop its lane"
the only thing dropping can mean. Proven: under `attested` the error is
**bit-identical to a plain hold** (i.e. attested never secretly interpolates),
and dropping 1,674 derived rows leaves master trace and audit **bit-identical**.
- **The trigger is `caps.tier ≥ 1`, not `caps.continuous`** — tier is the
  adapter's own admission that its between-sample values are restoration.
  Gating on continuity would retro-classify honest clients (a MIDI CC holds a
  level between messages *because MIDI says so*).
- Still owed: tiers 2–3 (seam proved, no model plugged in), confidence not
  mapped to stroke alpha, no provenance popover, reconstructors run once.

### 7.4 §−1's uncertainty requirement — DESIGN SETTLED, cheaper than feared
**Do not turn `at` into a distribution.** Keep the scalar; add an optional
frozen sibling `when = {verbatim, edtf, earliest, latest, innerFrom, innerTo,
rule, kind, note}`, resolved ONCE at ingest by a **versioned named rule**
recorded on the row (`err-july15-padding@1`). **Absence of `when` is the crisp
fast path — mirroring the firewall, where absence of `provenance` means
attested. Two absences, two axes.**
- **Firing rule: `at = when.earliest`, always.** It is one-sided sound
  (`earliest ≤ true position` is a theorem), it gives the existing `ev.at <= pos`
  comparison a true semantics ("possibly already occurred by pos" — the
  *possible* half of Allen, free), and **nothing in the transport moves**.
  Render-only was rejected: `prefixEvents` folds every row with `at <= pos`, so
  a non-firing row hands a reducer a positionless payload AND vanishes from
  `evidenceAccounting()` — silently shrinking the archive under exactly the
  query the firewall protects.
- `innerFrom`/`innerTo` are **not decoration**: without the inner bracket
  "certainly in 1965" is unanswerable (`Y @> possible` under-reports). Four
  traditions converged on four points (CIDOC P81/P82, OpenAtlas, PlanningLines,
  TimeViz) and **every renderer surveyed keeps only two** — including PeriodO,
  whose own model has four.
- Query knob `window(..., {certainty:'possible'|'necessary'})` — Dyreson &
  Snodgrass's *ordering plausibility* at its two endpoints; unlike the evidence
  policy it DEFAULTS rather than throws (silence over-includes, it does not
  fabricate). `positionAccounting()` reports **by rule**, so "43 % of this lane
  is positioned by a padding artefact" is a visible number.
- **Rendering is settled by a controlled study** (Gschwandtner et al. 2016):
  *ambiguation* (two-tone: saturated certain core, lighter possible flanks) for
  "when / how long"; *gradient/density* only for "how likely at t". Our flat
  band is the right default; an aoristic curve answers a different question.
  Fix the per-lane aggregate (currently a miscomputed aoristic sum): one bin per
  **pixel column** (M4's discipline), mass `1/(b−a)` per item, divided by
  overlapping-period count.
- Deferred explicitly: **space** (the geo analogy taught the temporal problem;
  adding a spatial axis is not in scope), the trapezoid interior, non-contiguous
  brackets, Monte Carlo, competing authorities, transaction time, `when` on spans.

### 7.5 Honest positioning — what we thought was novel, and what actually is
An adversarial survey refuted two of three uniqueness claims and complicated
the third:
- **`reduce(prefix ≤ t)` + assert is thirty-year-old shipped practice**: DAWs
  call it **MIDI chase** (Ardour's `midi_chase()` scans to the seek point
  accumulating held-note/CC state, on by default); lighting consoles call it
  **tracking**, and ETC Eos's flag is literally named **Assert**. What survives:
  heterogeneity, the property proof, nesting, the cost model.
- **Caps-driven adapters shipped in 2005** — `IMFRateSupport::IsRateSupported
  (requested, &actual)` is `request()` with a Windows Media Foundation ship
  date; AVFoundation publishes the rate lattice; GStreamer calls them caps.
  Only **composition through nesting** survives.
- **Provenance-as-a-timeline-axis ships — in Premiere** (Generative Extend
  marks the invented frames in the timeline UI). But the exported credential
  collapses to per-clip and the ecosystem cannot receive temporal regions (no
  temporal manifests in the wild, no scrubber in the verifier, zero conformance
  tests). The honest claim: **the firewall exists inside one editor and dies at
  the door.** Ours is the one that has to survive the door.
- **Our clock vector has a second ancestor**: Ableton Link's `(beat, time,
  tempo)` triple — with a **drift slope** our re-anchoring lacks and a
  `requestBeatAtTime`/`forceBeatAtTime` split that is exactly `sync()`/`seek()`.
- The transport defaults (25/100 ms, worker) are **rediscovery** of Chris
  Wilson 2013 / Tone.js. Arriving by measurement was still worth it — nobody
  publishes p95s — but say so. **The deck was not a rediscovery**: heterogeneous
  kinds + a real trace + media as clock master + state-reconstructing seek +
  hidden-tab survival is an empty intersection.
- The gap nobody has filled: **an interactive, zoomable, uncertainty-native
  timeline.** Tools that model uncertainty don't draw it; tools that draw time
  don't model it; the statistics packages render static PNGs.

### 7.6 The steal list (adopt in this order)
1. **`rVFC.mediaTime`** in the media servo — the dead band currently measures
   `currentTime`, a coarse async view, when the browser can give the PTS of the
   frame it actually showed. *(in flight)*
2. **Deterministic offline render** — Remotion's doctrine ("no shared wall
   clock ⇒ no wall clock at all"); we are uniquely placed (virtual runtime,
   audio context by argument, pluggable host). ⚠️ `OfflineAudioContext` carries
   **no determinism guarantee** and is not exposed in Workers — measure, don't
   assume. *(in flight)*
3. **Web Lock as a freeze exemption** — `kHoldingWebLock` is a standalone
   Chrome exemption, which is the mitigation for Energy-Saver freezing hidden
   tabs after ~5 min (a worker tick is NOT exempt). Also candidate:
   **`Atomics.wait` tick host** (V8 waits on an OS condvar, structurally out of
   the throttler's reach). Both want COOP/COEP, which also fixes Safari's 1 ms
   `performance.now()`. Datum: **Windows on battery has an 8 ms timer floor**.
4. **Two-phase seek** — JACK's slow-sync barrier (opt-in, non-blocking,
   fail-open on timeout, re-armed by a locate mid-roll) + Ardour's
   `LocateTransportDisposition {MustRoll, MustStop, RollIfAppropriate}`.
5. **Time-ranged provenance on three carriers** — C2PA `Action.changes` +
   `regionOfInterest` (and `reviewRatings` 1–5, the only confidence number in a
   shipping media standard), `EXT-X-DATERANGE` `X-` attributes for the live
   lane, OTIO namespaced metadata for the edit. TEI's `@locus` is the model for
   separating uncertainty about the *boundary* from uncertainty about the
   *identity*.
6. **Proxy / decoded-frame scrub tier** — deferred; our `sampleAt` cursor is
   already the right shape (a playhead-centred window sized by scrub direction),
   but no current client scrubs heavy video hard enough to need it.

### 7.7 Open seams, in cost order
`caps.absentState`/`silence()` (a quotation parked at its edge currently holds
whatever note `in`/`out` cut) · **a quotation is not yet a VALUE** — `nest.add()`
mutates a nest and there is no serialisable `{deck, in, out, rate}` a stored
score can carry, **which is the actual C10 ask** · content addressing (in/out
are numbers; "from the third chorus" needs the child's own marks as an
addressable lane) · overlapping quotations of one deck (rejected, not solved —
a canon needs an instancing seam) · bracketing groups by kind, not series
(`caps.series` is declared and unread, so a multi-controller lane degrades
QUIETLY) · cross-year **queries** over the store (partition by (kind, year) at
ingest) · the strip visualizer is STILL promised as a component and was
hand-drawn again today.

### 7.8 What the archives taught (two institutions)
ERR gave the API and the padding convention; **Kurenniemi gave the lessons ERR
alone could not**: the date field can describe the **file, not the work** (an
Internet Archive rip date yields a corpus off by fifty years that is internally
consistent about it); **rights need an asserter** (a 1968 commercial release
marked public-domain — well-formed, machine-readable, wrong); ingest is
**multi-source by construction**, so the adapter's real job is reconciliation;
the honest form of "undated" is a **band**, and nine tapes sharing one guess
render as nine identical bands — visible at a glance; **CORS posture varies by
content type, not by item**; a throttled aggregator answers **200 with zero
results** (the first ingest shipped an empty spine and reported success); and
**the custodian is the one you cannot reach** — what plays is on an aggregator,
uploaded by strangers, which is why provenance confidence must be first-class.
