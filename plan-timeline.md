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


### 7.9 Uncertainty-as-position — BUILT (transport v0.6), and what the archive said back
The design of §7.4 shipped: `when` is optional, **frozen per row, never interned**;
`at = when.earliest` always, reported as an `'anchored'` degradation; `rule` is
enforced as `<name>@<int>` (only `hand`/`unknown` may be unversioned); zero-width
brackets are refused in words. **Nothing in the transport's ordering moved** —
the crisp fast path is structural (a lane's `maxSpan` is 0 until a `when` row
lands, and `window()` branches on that).
- **`certainty` defaults to `'possible'`, and the asymmetry with the evidence
  policy is the point**: silence about evidence can FABRICATE (dreamed data in
  an archival answer) so it throws; silence about certainty merely widens the
  net, so it defaults. `implicit` still distinguishes a default from a choice.
- **The brief was wrong: `necessary` has THREE answers, not two.** Literal
  `Y ⊇ inner` deletes a true one — an ERR year-only row (outer [1965,1966), no
  inner) IS certainly in 1965. So: ordered inner pair → inner containment; else
  **outer containment, sound but incomplete**; else **undecidable → excluded AND
  reported** (`chose:'unanswerable'`, naming the rule). That third state is why
  the inner bracket is not decoration.
- **`caps.series` was silently wrong and is now measured**: one lane with
  controllers 1 and 74 interleaved returned **150 — a value belonging to neither
  controller** — in silence; now it reports `series-ambiguous` and `{series:n}`
  answers from per-series cursors.
- **Two-phase seek**: locate is immediate, only the roll waits, **fails open**
  naming the laggard, a locate mid-barrier supersedes and inherits the true
  rolling state.
- **Kurenniemi re-expressed, 8/8, and NO number moved** (`at`/`bandMs`/
  `precision` bit-identical, derived from `when`; the client now passes **no
  `at` at all**, so it *cannot* pad a position because it never writes one).
  New numbers, and they are the point: **22/22 rows are a smear — this archive
  holds no crisply positioned row at all** — and by rule **41 % come from
  `corpus-range@1`**: forty-one percent of the spine positioned by one guess
  about a compilation title. All `ignorance`, none `vagueness`; `innerFrom/To`
  null on all 22, so "certainly in 1966" is answerable here only by the
  sound-but-incomplete outer path.
- **Still owed by §−1**: the RENDERER (ambiguation settled and unbuilt; the
  megatimeline aggregate is still the miscomputed `+1`-per-item sum; `when.kind`
  is stored and nothing draws a different edge — **the transport can now say
  what it does not know; the strip still cannot show it**), deep time
  (regime-swapping ticks read, not built; ms spans are useless at 13.8 Gyr),
  `when` on spans, non-contiguous brackets, **competing authorities (one `when`
  per row — the deferral most likely to be regretted)**, transaction time, the
  aoristic sum as a statistic, and space.

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
1. ✅ **`rVFC.mediaTime`** — DONE (law L4b), but **the naive steal is a
   regression and we measured it first: preferring `mediaTime` "when it is the
   newer sample" (Remotion's rule) took corrections 9 → 380.** `mediaTime −
   currentTime` is a **one-frame BIAS, not noise** (signed mean +8.8 ms @30 fps,
   +12.5 @60) because `mediaTime` is the PTS of the frame shown at
   `expectedDisplayTime`, which is in the FUTURE — and Chrome re-interpolates
   `currentTime` on every read, so "newest" alternated between two clocks a
   frame apart. The fix is to use the sample as the PAIR it is:
   `mediaAtNow = mediaTime + (now − expectedDisplayTime)·rate`.
   Result: at a 5 ms band corrections **365 → 18 (−95 %)** and residual |err|
   p95 **7.52 → 0.87 ms**. ⚠️ **Honest finding: at the 20/40 ms bands our
   clients ship, corrections were already ~0 and the change is invisible
   (8→8, 4→4). The steal does not improve the shipped config — it removes the
   SENSOR as the thing that sets the dead band.** Defaults unchanged.
2. ✅ **Deterministic offline render** — DONE (`timeline/render.mjs`):
   **60,000–86,000× real time** (10 min of position time = 18,001 frames +
   6,000 events in 7–10 ms), byte-identical trace + hash across renders,
   **identical audio buffer hash across two separate Chrome processes**, and
   equal to real wall-clock playback (same events, order, count, state).
   Two seams only findable by building it: a bare `OfflineAudioContext` pins
   `currentTime` at 0 so the lane's anchor collapses every node into the first
   200 ms (hence a virtual-clock Proxy), and a closing `transport.pause()`
   tears down committed nodes microseconds before `startRendering()` — which
   produced a **silent 192,000-sample buffer** on the first run. Determinism is
   reported as **observed, not guaranteed** (the spec gives none), and Web Audio
   is `[Exposed=Window]` so **offline audio cannot leave a document's main
   thread — a render farm parallelises across documents, not workers.**
   Non-determinism is *reported*: `caps.deterministic` + a source scan +
   `onNondeterministic:'throw'` as a CI gate — and the suite **asserts the
   scan's blind spot** (closure-hidden `Math.random` scans clean) so nobody
   reads clean as proof.
3. ⚠️ **Web Lock freeze exemption — implemented, NOT verified.**
   `timeline/keepalive.mjs` (held Web Lock + optional audible tone) exists, but
   **Chrome's natural Energy-Saver freeze could not be reproduced** (380 s
   hidden, CPU-burning, muted, features forced → no freeze in either arm), so
   the exemption is documented, not proven. **What WAS measured, by SIGSTOP for
   300 s: the worker tick host is frozen WITH the page (300,091 ms gap) — a
   worker defends against throttling, never against freezing.** The real
   defence is the catch-up policy: `'reduce'` landed correct non-commutative
   state **1.1 ms after resume, a cost independent of freeze length** (vs
   `'burst'` firing 300 cues up to 5 min late, `'drop'` losing 300).
   Bonus: worker `maxTickGapMs` was **33 ms over 380 s hidden** — the
   hidden-tab win extends from 10 s to 6.5 minutes. `Atomics.wait` host needs
   COOP/COEP (`crossOriginIsolated: false` today) — documented, not built.
   Windows' 8 ms battery timer floor vs our 25 ms tick = 3× margin, no change.
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

## 8. LOOPS — the smallest program that quotes a trace (2026-08-28)

### 8.1 Where a loop belongs
C10 says the timeline is a TRACE and never an authoring format. A loop is
authoring by definition — "do this again" is an instruction, not an observation —
so **a loop is a SCORE concept, never a log concept.** The log of a looped
performance contains N repetitions at N different timestamps, because that is
what happened. The loop lives in `score.mjs` beside `{ref, in, out, rate}`, as
`repeat`. This resolves cleanly and is the whole design: **a loop is a quotation
with repetition**, which makes it the smallest possible program that quotes a
trace — §−1's mission in one field.

### 8.2 The mechanism already exists
`nested.mjs` maps `childPos = clamp(c0 + (parentPos − at)·rate)`. A loop is the
same map with **modulo instead of clamp**:
`childPos = in + ((parentPos − at)·rate) mod (out − in)`.
Everything else — reduce-on-seek, assertState, the servo, drift, absence —
follows unchanged. A parent seek into the 7th repetition maps into the child
exactly as it does into a single pass.

### 8.3 The reducer question, and why the CC work already answered it
What is state at time t inside repetition N? **The edge/level distinction
decides it, per kind:**
- **Level-valued** state (CC, filter cutoff, gain, roster, camera selection)
  PERSISTS across the loop boundary — a filter sweep set in repetition 3 is
  still there in repetition 4. Reduce folds the whole prefix, loop or not.
- **Edge-valued** state (note-on/off, cues) is RE-ASSERTED per iteration —
  each repetition sounds its own notes; a note-on from repetition 1 must not
  still be held in repetition 3.
This is exactly `caps` we already carry, so a loop needs no new adapter
vocabulary — only a boundary event the adapter can hear (`loop-wrap`), so an
edge kind can silence-and-rearm the way `caps.absentState` already does at a
quotation edge.

### 8.4 What the lineage already knew
`tracker`'s loops are the reference: **per-loop `startBeat` + `len`, so nothing
shares a master bar** — polymetric by construction, "any beat can be beat 0",
and **relaunch = re-basing the origin to now, not seeking a cursor**. That is
`{at, in, out, repeat}` with `at` rewritten on retrigger. Also from the mine:
length snapping to whole BEATS not bars, and abort-if-empty on a toggle.

### 8.5 Two pieces the score layer gets for free
- **Phasing.** We already proved "the same deck quoted twice at different
  fragments". Quote it twice at **rate 1.0 and 1.002** and that is Reich's
  *It's Gonna Rain* — the phase drift is arithmetic, not a feature. The
  twice-quoted-deck test was a phasing rig without knowing it.
- **Disintegration.** A loop whose Nth repetition applies one more tier of
  reconstruction is **Basinski's *Disintegration Loops* as an evidence
  gradient**: iteration 1 is attested, iteration 12 is mostly dreamed, and the
  strip's hatching shows it happening. That is §5b's doctrine as a piece of
  music rather than an argument — and the honest inverse of restoration, since
  here the reconstruction is the composition.

### 8.6 Loop as an ANALYTICAL instrument, not only a musical one
The heritage case for a loop is close listening: scrubbing a 2-second fragment
repeatedly is how a researcher hears what is on a tape. A loop with the
evidence firewall on is a *auditing* instrument — loop the fragment, toggle
attested-only, and hear exactly what the archive contains versus what we
supplied. Taavet Jansen's thesis names "how to recognise the accumulating data"
as future work; a loop with an evidence toggle is a direct answer.

### 8.7 Open questions to settle in the build
- Is `repeat` a count, a duration, or infinite-until-stopped? (Probably all
  three: `{repeat: n | {untilMs} | 'infinite'}`.)
- Does a loop RE-FIRE its events or re-seek the child? (Re-seek, so
  reduce-on-seek runs and edges re-arm — consistent with everything else.)
- What does a loop mean for the STORE (an infinite loop over a paged log must
  not pin pages forever) and for the RENDERER (an infinite loop cannot be
  rendered — `renderDeck` must refuse or require a bound).
- Crossfade at the wrap point, or hard cut? (Hard cut by default; a crossfade
  is a reconstruction and should be declared as one.)

### 8.8 BUILT (2026-08-29) — and the gate answered
`repeat: n | {untilMs} | 'infinite'` on a quotation; `repeat: 1` normalises AWAY
("played once" is the absence of a loop); all three round-trip byte-identically.
- **THE GATE — "loops stay in time and do not lag on re-seek": PASSED, and
  inverted.** Firing lateness **wrap-adjacent p50 0.10 / p95 0.70 ms** vs all
  other events **p50 4.50 / p95 14.60 ms** — **the lag number is −13.9 ms: the
  loop point is the MOST precisely timed instant in the loop**, because the
  re-seek's immediate `scan()` commits it instead of waiting for the next 25 ms
  tick. 13 downbeats for 12 wraps; across-wrap IOI spread 14.30 ms vs 13.90 ms
  within a pass; **accumulation over 600 wraps: slope 0.000e+0 ms/wrap**; every
  wrap survived 40×500 ms main-thread stalls.
- **The gate forced the design change the archaeology did not predict**: the
  boundary is a **committed one-shot on a TickHost, not polled by `servo()`**.
  Polling is late by one client loop and `reconcile` folds everything in that
  window — measured, **one lost downbeat per wrap (2100/2400 onsets)**. The wrap
  also seeks a hair before `in`, else the downbeat sitting exactly on `in` is
  folded. `servo()` survives only as the backstop, which is what collapses a
  30 s blur to ONE wrap rather than fifteen.
- **§8.3 was wrong that this needs no new vocabulary.** Transport has no
  edge/level flag, so: **`caps.loopState: 'rearm' | 'carry'`, defaulting to
  `'rearm'`**, with `adapter.loopWrap()` opt-in per the archaeology. Proven over
  55 reps: held notes peak at 2 and never accumulate across 54 wraps; a CC
  survives every wrap while the same lane declared `'rearm'` folds back; a
  reducer-less lane rings across the boundary exactly as tracker's does.
- **Store answer inverted the worry**: 1000 wraps over a 40,000-row store =
  **one resident page set, 0 evictions**, 999/1000 ensures on the fast path. The
  constraint that bites is the reverse — **a wrap must never APPEND a row**, or
  an infinite loop is an infinite log. Hence `loop-wrap` is a callback, never an
  event. `renderBound()` throws `LOOP_UNBOUNDED`; a bounded loop renders
  byte-identically twice.
- **Hard cut, no parameter to change it** — `joint === 'cut'`; a blend across a
  splice is §5b tier 1 (an appended lane with tier/method/confidence) or a
  property of the source adapter.
- **PHASING: §8.5 was almost right — and the abstraction reproduced physics.**
  Rule 7g forbids two overlapping quotations of one deck ("a deck has one
  position"), so phasing needs TWO DECKS. **Reich needed two tape machines for
  the same reason.** Origin is epoch-anchored (jam-core's school, not
  tracker's), so phase is reproducible across processes. Virtual drift slope
  0.002000000 vs 0.002000000 analytic, **−0.000 ppm, residual max 0.0001 ms**;
  wall-clock residual p95 4.34 ms — and that staircase riding the analytic line
  IS the servo's dead band. Unison returns at L/(rate−1) = 1000 s.
- **DISINTEGRATION: §5b as a piece of music, measured.** `repeat: 12`, each wrap
  running one more registered reconstructor with real tier/method/confidence/
  refs. `inventedFraction` climbs monotonically **0 → 46.7 → … → 90.6 %**,
  tiers 1→2→3, and **the attested count NEVER MOVES** (8 rows throughout, 77
  dreamed beside them). `strip.inkOf()` paints **294 px under 'all', 0 px under
  'attested'** — tratteggio measured in pixels.
- Two bugs found in already-green code: `score.mjs` turned a null quotation id
  into the string `"null"` (broke byte-identity on the SECOND round-trip);
  nested's "adapter registered after construction is unreachable" seam is closed
  by v0.6's `deck.adapter`/`deck.silence`.
- **Seams still open**: the evidence firewall is **read-side only** — nothing
  stops a derived lane from FIRING under `'attested'`, so an evidence-only
  performance is the adapter's job (wants `fire()` gating or
  `caps.evidenceGated`); no `deck.assertState(kind, state, info)`; `renderDeck`
  cannot see a nest.
- **Loops still cannot express**: retrigger without remove-and-re-add; a shared
  bar to be polymetric AGAINST; addressing an inner loop's repetitions from an
  outer score; and a wrap the SCORE can branch on — a score quotes traces, it
  does not branch.
