# Browser A/V tooling — the wide pass (2026-08-28)

Companion to `research/browser-av-editors-2026-08.md` (1,057 lines, 63 URLs). That file
surveyed browser NLEs/DAWs, the engines they build on, timingsrc/MediaSync and the hard
problems. **This one goes where that one did not**: native engines with published
architecture, the web platform primitives we are under-using, multiplayer time, the
export/interchange question, and what shipped since 2024. Nothing here repeats the first
pass; where the two disagree, this file says so explicitly (§10).

Marks: ✅ measured / read from shipping source · 📄 documented with a quote · ⚠️ inferred.

---

## VERDICT UP FRONT

**All three of the first pass's "things nobody else does" are weakened, two of them badly.**

- `reduce(prefix ≤ t)` → `assertState()` is **thirty-year-old practice** in two industries
  the first pass never looked at. DAWs call it *MIDI chase* — Cubase, Cakewalk, Ardour
  all ship it, on by default. Lighting consoles call it *tracking*, and ETC Eos's
  out-of-sequence cue recall uses **literally the word "assert"** for playing back tracked
  (i.e. folded-from-prefix) values. What survives is narrow and worth stating precisely
  (§8.1).
- The **caps-driven adapter registry is GStreamer, Media Foundation and AVFoundation
  practice**. `IMFRateSupport::IsRateSupported(rate, &actualRate)` is our
  `request() → {wanted, chose, degraded}` with a 2005 ship date. LV2 rejects a plugin at
  load time when a `requiredFeature` is unmet — our "unbacked claims caught at
  `registerAdapter`". (§8.2)
- **Provenance as a timeline axis is shipped** — by Adobe. Premiere's Generative Extend
  puts an AI-generated marker on the exact frames it invented. But the **exported**
  Content Credential collapses to whole-file/per-clip. The firewall exists inside the
  editor and breaks at the door. (§8.3)

**And our clock vector has a second, independent ancestor.** Ableton Link: *"A timeline is
represented as a triple of `(beat, time, tempo)`, which defines a bijection between the
sets of all beat and time values."* 📄 That is `{p0, t0, rate}`, published, leaderless, and
running on a two-stage affine map with **drift slope**, not just offset (§1.3). The first
pass found the W3C Timing Object's `(position, velocity, acceleration)`. Two independent
prior arts for the same object is the strongest signal in this file that the vector is the
right shape — and that we should stop calling it ours.

**The genuinely empty seat is narrower and better than we thought.** Nobody has
(a) a two-phase seek with a readiness barrier in a browser, (b) a shared playhead that
corrects by rate rather than by seek — the video world syncs *events* and admits it
drifts, while the audio world (AirPlay 2, Sonos, Syncplay) solved it with schedule-ahead
+ rate correction fifteen years ago, and (c) **time-ranged provenance that survives
export**. On (c) the standard is finished, the reference SDK implements it, the
conformance suite does not test it, and the official viewer cannot render it. §8.3.

---

## 1. Native engines whose model is worth stealing

### 1a. OpenTimelineIO — the proxy mechanism is in the data model; provenance is absent

- ⚠️ **`RationalTime` is not rational.** Private members are `double _value, _rate;` —
  two IEEE754 doubles. `value_rescaled_to()` is naked double division
  `(_value * new_rate) / _rate`, with **no snapping policy**. `to_frames()` is
  `int(_value)` — truncation toward zero. 📄
  https://github.com/AcademySoftwareFoundation/OpenTimelineIO/blob/main/src/opentime/rationalTime.h
  - Issue #190 (open since 2017): *"there are cases where floating point arithmetic leads
    to precision issues, rounding and undesirable drift. Some other systems represent rate
    as an int/int rational number. For example 30000/1001 vs 29.97."* 📄
  - ✅ Real drift, issue #468: 48 frames @23.976 → 29.97 gives `59.88017976…`; OTIO yields
    **60**, Premiere yields **59** — *"every clip that comes after it on the same track
    will be 1 frame out of sync."* Issue #1742: `from_frames(29,25).to_seconds()` → 1.16;
    `from_seconds(1.16,25).to_frames()` → **28** (`1.16*25 == 28.999999999999996`).
  - 📄 Issue #807, open since 2020: *"We should inspect all rounding and snapping
    operations… We should write a policy on rounding and snapping. The code and policy
    should agree."* **No such policy exists.**
  - `DEFAULT_EPSILON_s = 1.0/(2*192000.0)` — *"twice 192kHz… half a frame at 192kHz."* 📄
- 📄 **`TimeRange` is half-open**: *"inclusive of the start time, and exclusive of the end
  time. All of the predicates are computed accordingly."* `end_time_inclusive` = *"the
  time of the last sample containing data"*, `end_time_exclusive` = *"time of the first
  sample outside the time range."* Track invariant:
  `clipA.range_in_parent().end_time_exclusive() == clipB.range_in_parent().start_time`.
- ✅ **`TimeTransform` is vestigial.** Serialised as `TimeTransform.1`, *"1D transform for
  RationalTime. Has offset and scale"* — and **no OTIO schema has a field of this type**.
  Its only substantive use in the codebase is one internal line in
  `imageSequenceReference.cpp`. OTIO chose explicit `source_range` + `effects` over a
  transform stack.
- ✅ **The proxy lane is first-class in the schema.** `Clip` (schema **v2**) holds
  `std::map<std::string, Retainer<MediaReference>> _media_references` plus
  `std::string _active_media_reference_key`, with a reserved
  `default_media_key = "DEFAULT_MEDIA"`; setting an absent key raises.
  ⚠️ `"high_quality"`/`"proxy_quality"` appear only in tests — no published key convention.
  https://github.com/AcademySoftwareFoundation/OpenTimelineIO/blob/main/src/opentimelineio/clip.h
- ✅ **Provenance/uncertainty/confidence: zero.** The complete registered schema list is 24
  types; a case-insensitive grep for `provenance|confidence|uncertaint|derivation|synthes`
  across `src/` and `docs/` returns one hit, an unrelated destructor comment.
  `GeneratorReference` is *"A reference to dynamically generated media"* with two fields:
  an opaque `generator_kind` string and free-form `parameters`. No model, no version, no
  timestamp, no confidence. 📄
- 📄 **But `metadata` is a sanctioned namespaced carrier**: *"Timeline, Stack, Track, Clip,
  MediaReference, and most other OTIO objects all have a `metadata` property… it is
  important to group metadata inside namespaces so that independent workflows can
  coexist."* Per-clip = per-time-range arbitrary JSON. That is the export hook (§4).
- ⚠️ **No production JS/WASM OTIO.** The org has Java/C/Swift/Unreal bindings and no
  JS repo; `jminor/otio-cpp-wasm` (by OTIO's creator) self-describes as *"an experimental
  project, and a learning exercise… so far the actual result is just a proof of
  concept"*; `otio-wasm` ships the whole Pyodide runtime. **But**: npm `opentimelineio`
  (`otio.js`) v0.1.0, 2025-10-19, zero deps, browser-friendly — writes the JSON directly.
  ⚠️ One release, one star: vendor it, don't depend on it.
  https://www.npmjs.com/package/opentimelineio

### 1b. Ardour + JACK — the two-phase seek, and state chase as a diff

**Ardour's transport is an explicit FSM, and a locate carries its intent.**

- 📄 `enum MotionState { Stopped, Rolling, DeclickToStop, DeclickToLocate, WaitingForLocate };`
  `enum EventType { ButlerDone, ButlerRequired, DeclickDone, StartTransport, StopTransport, Locate, LocateDone, SetSpeed };`
  https://github.com/Ardour/ardour/blob/master/libs/ardour/ardour/transport_fsm.h
- ✅ `enum LocateTransportDisposition { MustRoll, MustStop, RollIfAppropriate };` — **the
  seek request says what should happen when it lands**, so the FSM never guesses. Our
  `seek()` has no equivalent; "seek while playing" vs "seek while paused" is inferred.
- 📄 Varispeed is resampling at the I/O boundary, not a clock trick:
  `static bool can_varispeed() { return _resampler_latency > 0; }` — varispeed is
  *unavailable* unless you accept the SRC's latency. `libs/ardour/ardour/port.h`
- ✅ **The "no wall clock" export path is one bool.** `session_export.cc`:
  `if (realtime) { process_function = &Session::process_export_fw; } else { return _engine.freewheel(true); }`
  📄 JACK's own definition: *"When in 'freewheel' mode, JACK no longer waits for any
  external event to begin the start of the next process cycle. As a result, freewheel mode
  causes 'faster than realtime' execution of a JACK graph."*
  📄 Ardour manual: *"The realtime checkboxes allow to export audio as it is played, and
  not freewheeling… This can prevent odd behaviours from some plugins (reverbs, etc)."*
  https://manual.ardour.org/exporting/export-dialog/

**MIDI chase — the deepest prior art in either survey (and see §8.1).**

- ✅ `CONFIG_VARIABLE (bool, midi_chase, "midi-chase", true)`, labelled *"When locating,
  track sustained MIDI notes and play them when rolling"*. Per-track override
  `MidiTrack::set_chase_notes()`. Sibling: `midi_panic_when_looping` (default true).
- ✅ **The chase is a full scan from zero.** `DiskReader::midi_chase(samplepos_t spos)`
  walks the entire buffer `for (n = 0; n < rtmb->size(); ++n) { if (item.timestamp >= spos) break; _locate_tracker.track(buf); }`
  then re-strikes held notes at buffer offset 0. That is `reduce(prefix ≤ t)` at O(t),
  in C++, shipped. `libs/ardour/disk_reader.cc`
- ✅ **What is tracked**: `uint8_t _active_notes[128*16]` ref-counted, plus
  `program[16]; bender[16]; pressure[16]; poly_pressure[16][127]; control[16][127];` with
  `0x80`/`0x8000` as a **never-set sentinel** — the tracker distinguishes *unset* from
  *set to zero*. `libs/ardour/ardour/midi_state_tracker.h`
- ✅ `resolve_state()` is a per-controller **policy table**, not a blanket reset: replay the
  earlier value if one exists — *"(event found before tme) restore prior CC (notably bank
  select)"* — else reset only a whitelist (mod→0, volume→0x7f, pan→0x40, sustain,
  portamento, sostenuto, soft pedal, legato) with an explicit
  `default: /* do not reset other controls */ continue;`.
- ✅ **`resolve_diff(other, dst, time)` — *"This fills dst with the messages required to get
  the MIDI receiver's state (assumed to match ours) into the condition indicated by
  other"*.** A **minimal state diff between two snapshots**, not a full re-assert. This is
  the single most directly stealable thing in either survey (§7, honourable mentions).

**JACK transport is a two-phase commit for seek.** All quotes from
https://github.com/jackaudio/jack2/blob/develop/common/jack/transport.h

- 📄 `JackTransportStopped=0, JackTransportRolling=1, JackTransportLooping=2 /* ignored */,
  JackTransportStarting=3 /* Waiting for sync ready */, JackTransportNetStarting=4`.
- 📄 `jack_transport_locate`: *"The new position takes effect in two process cycles. If
  there are slow-sync clients and the transport is already rolling, it will enter the
  ::JackTransportStarting state and begin invoking their sync_callbacks until ready."*
- 📄 `jack_set_sync_callback`: *"Register (or unregister) as a slow-sync client, one that
  cannot respond immediately to transport position changes… **Clients that don't set a
  sync_callback are assumed to be ready immediately any time the transport wants to
  start.**"* — the barrier is **opt-in and free when unused**.
- 📄 `JackSyncCallback`: *"invoked just before process() in the same thread… **This
  realtime function must not wait.** The transport state will be: JackTransportStopped
  when a new position is requested; JackTransportStarting when the transport is waiting to
  start; **JackTransportRolling when the timeout has expired, and the position is now a
  moving target.** @return TRUE when ready to roll."* — the callback is told when it *lost
  the race*.
- 📄 `jack_set_sync_timeout`: *"prevents unresponsive slow-sync clients from completely
  halting the transport… **When the timeout expires, the transport starts rolling, even if
  some slow-sync clients are still unready.** The sync_callbacks of these clients continue
  being invoked, giving them a chance to catch up."* — **fail-open, then catch up.**
- ✅ Doc/source discrepancy: the header says 2 s; jack2 ships
  `fSyncTimeout = 10000000; /* 10 seconds default... in case of big netjack1 roundtrip */`.
- ✅ In `JackTransportEngine::CycleEnd`, `case JackTransportRolling: … if (fPendingPos) {
  fTransportState = JackTransportStarting; MakeAllStartingLocating(table); SyncTimeout(); }`
  — **a locate arriving mid-roll re-arms the barrier.**
- ✅ `jack_position_t` carries `jack_position_bits_t valid;` — a bitfield saying *which
  other fields are valid* (`JackPositionBBT`, `JackPositionTimecode`, `JackBBTFrameOffset`,
  `JackAudioVideoRatio`, `JackVideoFrameOffset`, `JackTickDouble`) plus a torn-read guard
  *"When (unique_1 == unique_2) the contents are consistent"* and `int32_t padding[5]` for
  future bits. A position that declares its own domains — the same idea as our per-kind
  position domains, in a 2002 C header.

### 1c. Ableton Link — a leaderless `(position, time, rate)` bijection with a drift slope

- 📄 *"With Link, any participant can propose a change to the session tempo at any time.
  **No single participant is responsible for maintaining the shared session tempo.**
  Rather, each participant chooses to adopt the last tempo value that they've seen
  proposed on the network."* https://ableton.github.io/link/
- 📄 *"A timeline is represented as a triple of `(beat, time, tempo)`, which defines a
  bijection between the sets of all beat and time values."* ← our vector, named.
- 📄 And Link does **not** share one timeline: *"Link-enabled apps each have their own
  independent timelines. The Link library maintains a temporal relationship between these
  independent timelines that provides the experience of playing in time without the
  timelines being identical."*
- ✅ **The shared clock is a two-stage affine map with a slope.**
  `struct GhostXForm { double slope; microseconds intercept; }`,
  `hostToGhost(t) = llround(slope*t) + intercept` maps each peer's local clock into a
  shared "ghost" clock — **slope handles drift, not just offset** — then
  `struct Timeline {tempo, beatOrigin, timeOrigin}` maps ghost time to beats. Ghost-clock
  measurement re-runs every 30 s.
  https://github.com/Ableton/link/blob/master/include/ableton/link/GhostXForm.hpp
  Our `{p0,t0,rate}` has no slope term; we re-anchor instead. Both work; theirs survives a
  clock that runs at the wrong rate rather than merely at the wrong offset.
- 📄 `beatAtTime(time, quantum)`: *"The magnitude of the resulting beat value is unique to
  this Link instance, but its phase with respect to the provided quantum is shared among
  all session peers."* `phaseAtTime` → *"in the interval [0, quantum)… unlike fmod, it
  handles negative beat values correctly."*
- 📄 **`requestBeatAtTime` vs `forceBeatAtTime` is our `sync()` vs `seek()` distinction,
  socially framed.** Request maps *"to the next time value greater than the given time
  with the same phase"*; force is *"DANGER… very anti-social behavior and should be
  avoided. One of the few legitimate uses of this method is to synchronize a Link session
  with an external clock source."* 📄
  https://github.com/Ableton/link/blob/master/include/ableton/Link.hpp
- 📄 **JOIN: the joiner adopts.** TEST-PLAN BEATTIME-2: *"When joining an existing Link
  session, an app should adjust to the existing session's tempo and phase, which will
  usually result in a beat time jump. Apps that are already in a session should never have
  any kind of beat time or audio discontinuity when a new participant joins."* But
  TEMPO-5: *"Enabling Link does not change app's tempo if there is no Link session to
  join."* Start/stop state is the documented exception — not adopted on join, only
  followed thereafter.
- ✅ **Conflict resolution, two levels**: within a session, adopt a peer's timeline iff its
  `beatOrigin` is larger (*"We use beat origin magnitude to prioritize sessions"*); between
  sessions, switch if the other's ghost time leads by `SESSION_EPS = 500000` µs, else fall
  back to `sessionId` order. `include/ableton/link/Sessions.hpp`
- ✅ **LEAVE is TTL expiry, not a message**: `ttl = 5` s, `ttlRatio = 20` → announce every
  250 ms, prune 5 s after last sight. Local edits win for
  `kLocalModGracePeriod = 1000ms` before network state can override.
- 📄 Latency guidance: *"the audio system's output latency should be added to system time
  values before passing them to Link methods"* — i.e. Link expects you to feed it
  `AudioContext.outputLatency` (§2.1), which we do not currently read.

### 1d. REAPER — offline render is a flag, not an engine

- 📄 *"Full-speed (default) for fastest rendering. Others include 1 x offline, online (play
  mix while rendering), online (idle) and offline x 1 (idle)."* — *Up and Running: A
  REAPER User Guide v7.79* p.412, https://dlz.reaper.fm/userguide/ReaperUserGuide779a.pdf
- 📄 The only determinism statement Cockos makes, p.413: *"Note: Online vs Offline
  rendering: some plug-ins might perform and sound differently if rendered offline."*
  ⚠️ **No bit-identical guarantee anywhere.** Compare Remotion's `/docs/flickering`, which
  states the opposite doctrine outright (first pass §6a).
- ✅ It is **one graph with a mode flag**: preference *"Inform plug-ins of offline rendering
  state"* — *"Some VSTs behave differently when rendering offline… When deselected,
  plugins always think they are online."* Plus *"Limit apply FX/render stems to realtime"*
  for plugins that break faster than real time.
- 📄 **Anticipative FX is a lookahead scheduler for DSP**: *"Use spare CPU to render FX
  ahead of time… Higher render-ahead times will use multiple processors more efficiently.
  Lower render-ahead times will lower response time for FX tweaks."*
  ✅ And it is **disabled exactly where the future is unknowable** — open MIDI editors,
  automation-write tracks, record-armed tracks all fall back to the realtime thread. That
  is the honest version of our committed-vs-pending split: speculation is switched off per
  lane when the lane's future can change.

### 1e. Interchange formats — AAF is the only one with provenance

| format | time model | provenance / uncertainty | browser writer 2026 |
|---|---|---|---|
| **OTIO** `.otio` | `RationalTime{double value, double rate}`; `TimeRange` half-open | **none** in schema; namespaced `metadata` dict is the sanctioned hook 📄 | ✅ npm `opentimelineio` 0.1.0 (2025-10) ⚠️ one release |
| **CMX3600 EDL** | 8-field fixed-column TC pairs; `:` non-drop vs `;` drop-frame; `FCM:` header 📄 | none | trivial to emit; npm `edl` 2.0.0 (2025-07) |
| **AAF** | mob chain | ✅ **the only real one — see below** | ❌ **none exists** (npm `aaf-js`/`aafjs`/`libaaf` all 404; `pyaaf2` read+write in Python, `LibAAF` read-only in C) |
| **OMF 2.1** (1997) | 📄 rational, and says why: *"can accurately represent the video edit rate of 29.97… as the numerator 2997 and denominator 100. This format avoids problems with round-off"* | none | dead (Apple Bento container) |
| **AES31-3 ADL** | ✅ **sample-accurate and self-describing**: TCF `HHiMMiSSiFFissss`, where *"The character used for each indicator signifies the frame count/time base, film framing, video field/time code type, and sample rate"* 📄 | none | plain ASCII, trivially emittable |
| **FCPXML** | 📄 *"a rational number of seconds with a 64-bit numerator and a 32-bit denominator… 1001/30000s"*; ⚠️ trap: *"if a time value is equal to a whole number of seconds, Final Cut Pro **may** reduce the fraction"* → parse both `5s` and `5/1s`. Stores frame **duration**, never rate — the reciprocal is exact. Current 1.14 (FCP 12.0) | none | emit as a string; no maintained lib |
| **MIDI SMF** | `division` bit 15 chooses PPQ **or** SMPTE — 📄 a file cannot be both musical and wall-clock | none | ✅ `midi-writer-js` 3.2.1 (2026-03) |
| **MIDI Clip File (SMF2)** | see §1f | none | 🔥 ✅ `jzz-midi-smf` 1.9.9 writes `.midi2` from scratch — the expected negative is **refuted** |
| **IIIF Presentation 3.0** | Canvas `duration`, `timeMode`, `Range` | ⚠️ 0 hits for confidence/provenance/uncertain/synthetic in the whole spec; extension registry has only navPlace / Text Granularity / Georeference | JSON — trivial |
| **EBUCore** | `MediaFragment` = *"a temporal or spatial segment of a resource"* | 🔥 ✅ **`ebucore:annotationConfidence` — *"To estimate the confidence in an Annotation."*** plus `ebucore:Provenance`/`hasProvenance` with domain `owl:Thing`. The only broadcast standard with a shipping confidence field. ⚠️ 0 hits for synthetic/AI-generated | RDF/XML |
| **PBCore** | `pbcorePart` with `startTime`/`endTime`/`timeAnnotation` 📄 | none | XML |
| **MISB ST 0601 KLV** | per-frame | ❌ **hypothesis refuted** — Tag 47 Generic Flag Data has no simulated/synthetic bit (bits are Laser Range / Auto-Track / IR Polarity / Icing / Slant Range / Image Invalid, two spare). Only real-vs-test signal is Tag 65 *"0 is pre-release, initial release, or test data."* MISB has published nothing on C2PA | ⚠️ hls.js can already carry it: `enableEmsgKLVMetadata`, `emsgKLVSchemaUri` default `urn:misb:KLV:bin:1910.1` 📄 |
| **IMF CPL** (ST 2067-3:2020) | — | ✅ 0 × "confidence", 0 × "provenance"; all 9 "synthetic" hits are *"canonical synthetic timecode"* | — |

**AAF is the outlier and it is a 2005 spec.** Two mechanisms, both worth reading:

1. 📄 **Derivation chain** (MS-01 §4.6): *"A Mob can reference another Mob to indicate the
   source or derivation of the essence… through their relationships between one another,
   they describe how one form of essence data was derived from another."* Terminated by a
   zero-valued SourceClip, and AS-01 §6.2 makes the epistemics explicit: *"This indicates
   that the exporting application **did not know** of any earlier sources."*
2. ✅ **`Identification` / `GenerationAUID` — per-object, tool-attributed provenance.**
   `Header.IdentificationList` is **required and ordered** — an append-only log of
   `{CompanyName, ProductName, ProductVersion, ProductID, Date, ToolkitVersion, Platform,
   GenerationAUID}`. §28.6: *"The InterchangeObject Generation property allows you to track
   whether another application has modified data in an AAF file… a weak reference to the
   Identification object created when an AAF file is created or modified."* **Every object
   can point at the editing session that last touched it.**
   Plus `RecordingDescriptor` (§15.3), for material with no physical source: *"A recording
   source is analogous to a tape source except that it does not represent a source that
   physically existed. It is used to provide a timecode reference to file source
   material."* — exactly the slot a live broadcast origin needs.
   https://static.amwa.tv/ms-01-aaf-object-spec.pdf ·
   https://static.amwa.tv/as-01-aaf-aaf-edit-protocol-spec.pdf
   ⚠️ Correction to a common claim: AAF was **never SMPTE-standardised** (MXF was), and its
   Operational Pattern registry has exactly one entry — interop is governed by application
   specs, not OPs.

### 1f. MIDI 2.0 — nothing new for transport; Property Exchange is a caps registry

- ✅ **MIDI Clip File (SMF2CLIP)**: delta timing is **in the stream**, not the header —
  *"Delta Clockstamp Ticks Per Quarter Note (DCTPQ)"* + *"Delta Clockstamp (DCS)"*, where
  *"The Delta Clockstamp message declares the time of all following messages which occur
  before the next Delta Clockstamp… events shall always be stored and transmitted in
  presentation order."* DCS is **20-bit** (1,048,575 ticks), DCTPQ 16-bit, one per file.
  ✅ Resolution trades against reach: at 120 BPM, 960 TPQ reaches 9 m 06 s before a forced
  re-anchor; 65,535 TPQ reaches **8.0 seconds**. Header is a bare 8-byte `SMF2CLIP` magic —
  **no chunk index, not seekable**; you parse from byte 8.
  https://amei.or.jp/midistandardcommittee/MIDI2.0/MIDI2.0-DOCS/M2-116-U_v1-0_MIDI_Clip_File_Specification.pdf
- 📄 Wall-clock escape hatch, documented: *"Some applications, such as industrial control…
  might set Tempo to 60 beats per minute. Then Number of Ticks Per Quarter Note is equal to
  the number of ticks per second… as low as 15.3μs."*
- ⚠️ **No frame-accurate locate, no absolute-time cue, no sample-accurate seek anywhere in
  MIDI 2.0.** System Common/Real Time are byte-for-byte MIDI 1.0 (MTC `0xF1`, SPP `0xF2`
  still 14-bit); MMC is opaque SysEx. The one new thing is multi-clock arbitration:
  📄 *"A Device selects which Timing Clock(s) it is using from Timing Clocks received on
  different Groups (or its internal clock(s))"* — up to 16 independent transport domains
  per endpoint. `Set Tempo` at 10 ns/quarter-note describes **rate**, never **position**.
- ✅ **MIDI-CI Property Exchange is a real capability-negotiation system** and it is
  designed the way ours should be. Handshake: Discovery (exchanging, among other things,
  each side's *"Receivable Maximum SysEx Message Size"*) → PE Capabilities inquiry →
  `ResourceList` (*"mandatory for all devices that support Property Exchange"*) →
  optional `DeviceInfo`. Payload is JSON with JSON Schema. **Chunking is driven by the
  peer's declared limit**, not a constant. Request IDs (0–127) exist explicitly *"to
  prevent a larger PE message which is split over many chunks from blocking smaller
  requests"*. Subscriptions push invalidation rather than polling.
  📄 And the design rule worth stealing verbatim: *"Property Exchange has a 'MIDI messages
  first' approach. If a method of changing a setting can be accomplished by using a common
  MIDI message… then the MIDI message method shall be used."* — **negotiation describes;
  it never sits on the hot path.**
  ⚠️ Correction: Protocol Negotiation is **deprecated** since MIDI-CI 1.2, replaced by UMP
  Endpoint mechanisms; the third pillar is now *Process Inquiry*.
  https://amei.or.jp/midistandardcommittee/MIDI2.0/MIDI2.0-DOCS/M2-103-UM_v1-1_Common_Rules_for_MIDI-CI_Property_Exchange.pdf
- 📄 Profiles separate capability from state — a Profile Inquiry reply carries **two** lists,
  *"Profiles that are Supported and Currently Enabled"* and *"Supported but Currently
  Disabled"*. Our `caps` has no enabled/disabled axis.

### 1g. Resolve / Premiere proxies — an alternate media reference with a global switch

- 📄 Resolve draws the distinction we need: *"Optimized Media is managed internally by
  DaVinci Resolve, cannot be exported, and is not user accessible. In contrast, Proxy Media
  creates fully portable and independent media."* Proxy Media gets a Media Pool column
  (*"Proxy Media Path: The location of where DaVinci Resolve is looking for the proxy
  file"*); Optimized Media is an identity-keyed render cache recovered by
  `Rediscover Optimized Media`, not by path.
- 📄 **Both coexist on one clip**, per the icon vocabulary: *"Purple PXY over a White
  Background: … both camera originals and proxy media for this clip exist, and that proxy
  media is being used"* vs *"White HQ over a Purple Background"* vs *"Purple PXY Only: …
  only proxy media is available; the camera original media is missing."* `Link/Unlink Proxy
  Media` are first-class, and *"Unlinking a proxy file does not delete it."*
  https://documents.blackmagicdesign.com/UserManuals/DaVinci_Resolve_20_Reference_Manual.pdf
- 📄 Proxy Generator is **path-convention-based, not project-recorded**: *"the proxy media
  is generated inside a subfolder named 'Proxy' at the same level in the file hierarchy as
  the original media file"*, and a foreign proxy must have *"identical timecode… the same
  file name… the same frame rate as the source file."*
- ⚠️ Premiere is the same shape (`Attach Proxies` / `Reconnect Full Resolution Media` /
  `Detach Proxies` on the master clip, matched on *"file names, file extensions, tape
  names, and timecode"*, with a global `Enable Proxies` preference). Verbatim unverified —
  helpx.adobe.com timed out on every fetch attempt.
- ⚠️ **The structural answer**: in both NLEs a proxy is an alternate media reference on one
  clip with a **global** active-key switch — i.e. OTIO's `media_references` +
  `active_media_reference_key`, except the key is app-global rather than per-clip.

---

## 2. Web-native primitives we are under-using

Full source citations in the sub-bullets of the first pass's successor notes; each row ends
with a verdict on whether it beats what we do now.

| primitive | what it actually gives | beats ours? |
|---|---|---|
| `AudioContext.getOutputTimestamp()` | 📄 `{contextTime, performanceTime}` — *"the time estimating the moment when the sample frame corresponding to the stored contextTime value was rendered… in the same units and origin as `performance.now()`"*. Spec editor padenot: *"performance.now() doesn't increase at the same rate as AudioContext.currentTime… Having both can be useful to understand the drift."* | **YES** — a least-squares fit over `(contextTime, performanceTime)` pairs is a real drift-corrected audio↔wall map. We anchor to a free-running `currentTime` with no anchor and no latency term. ⚠️ Firefox pairs are broken (WebAudio#2461); Safari's scale bug fixed only 2024-02 |
| `outputLatency` / `baseLatency` | 📄 outputLatency = *"the interval between the time the UA requests the host system to play a buffer and the time at which the first sample… is actually processed by the audio output device"*; *"useful to query this value frequently when accurate synchronization is required"*. ✅ Chrome **quantises it to 8 ms** without mic permission (`kOutputLatencyQuatizingFactor = 0.008`) | **YES, partially** — this is the term Ableton Link tells you to add (§1c). Cr102/Fx70/**Sa18.4** |
| `AudioContext.setSinkId()` | 📄 pause → release → acquire → `sinkchange` → running; **`currentTime` is never reset**. `{type:"none"}` renders with no device and *"currentTime will still advance"* | **PARTLY** — `{type:"none"}` is a useful headless-but-advancing clock. Chrome/Edge only |
| `OfflineAudioContext.suspend(t)`/`resume()` | 📄 *"Schedules a suspension of the time progression… generally useful when manipulating the audio graph synchronously"*, quantised to a render quantum | **PARTLY** — a real interleaving primitive we don't use. ⚠️ WebAudio#2662 (2026-01): *"As currently spec'd, the suspend() Promise is never resolved"* |
| **OfflineAudioContext determinism** | ✅ **No guarantee exists.** Zero hits for `determinis*`/`reproducib*`/`bit-exact` in the spec. It documents the opposite: *"small, and normally inaudible, differences in DSP architecture, resampling strategies and rounding trade-offs between differing implementations. The precise compiler flags used and also the CPU architecture (ARM vs. x86) contribute to this entropy"* | **NO** — do **not** build reproducibility claims on it. Also ⚠️ **not exposed in Workers**: `[Exposed=Window]` only; WebAudio#2423 open since 2016, Chrome's hoch says he plans to pick it up |
| `AudioWorkletGlobalScope.currentFrame` | 📄 *"The current frame of the block of audio being processed"* — exact per-quantum frame counting, ships today | **YES** for sample-exact hooks; better than `OfflineAudioContext` for determinism |
| `VideoDecoder.dequeue` event + `decodeQueueSize` | 📄 *"Fired at the VideoDecoder when the decodeQueueSize has decreased"*; Chrome's own note: *"eliminates the need for authors to setTimeout() poll"*. Cr106/Fx130/Sa16.4 | **YES** — replaces a poll loop outright |
| WebCodecs frame budget | 📄 *"Authors are encouraged to call close() on output VideoFrames immediately… failing to release them can cause decoding to stall"*. ⚠️ No single documented constant; ✅ Chromium `kMaxVideoFrames = 4`, pipeline depths 8/16; Chrome media eng: hardware *"can never exceed 16"* | **rule**: keep ≤4–5 alive |
| WebCodecs ordering | 📄 *"VideoDecoder requires that frames are output in the order they expect to be presented, commonly known as presentation order"* — the UA reorders | **YES** — removes a whole class of reordering logic |
| `configure({optimizeForLatency})` | 📄 *"minimize the number of EncodedVideoChunks that have to be decoded before a VideoFrame is output"* | **YES** for scrub |
| `flush()` | 📄 *"The underlying codec implementation MUST emit all outputs in response to a flush"*; only state effect is `[[key chunk required]] = true` — **the cost is a forced keyframe resync**, not CPU | clarifies a cost we mis-modelled |
| `MediaStreamTrackProcessor`/Generator | ⚠️ renamed `VideoTrackGenerator`, `[Exposed=DedicatedWorker]`, *"There is no WG consensus on whether or not it should be exposed on Window"*. Chrome ships the old name, Safari 18 the new one, Firefox neither | **NO** — too fragmented |
| **ManagedMediaSource** | 📄 *"the user agent can evict content through the memory cleanup algorithm from its sourceBuffers… **for any reason**"* + *"write scripts with the assumption that content is constantly and randomly being evicted"*. **Safari iOS 17.1 — the first MSE-class API on iPhone** | **YES for iOS.** The scrub extent must come from `buffered`/`bufferedchange`, never from what you appended |
| `SourceBuffer.mode="sequence"` + `timestampOffset` | 📄 *"Media segments will be treated as adjacent in time independent of the timestamps… allows a media segment to be placed at a specific position in the timeline without any knowledge of the timestamps in the media segment"* | **PARTLY** — a native timeline remapper we currently do in JS |
| rVFC field semantics | 📄 `presentationTime` = *"the time at which the user agent **submitted** the frame for composition"* (measured); `expectedDisplayTime` = *"the time at which the user agent **expects** the frame to be visible"* (**estimate**); `mediaTime` = *"The media presentation timestamp (PTS) in seconds"*; `processingDuration` optional, *"In some cases, user-agents might not be able to surface this information"*; `captureTime` for remote sources is *"best effort"* | already the first pass's steal #1 — this file adds only that `presentedFrames` detects skips a poll cannot see |
| **WebRTC `RTCEncodedFrameMetadata.captureTime`** | 📄 *"the capture time of this frame in the capture system's clock… **shifted to be relative to `Performance.timeOrigin`**"* + `senderCaptureTimeOffset`, riding the `abs-capture-time` RTP extension. Shipped **Chrome 135** | **PARTLY** — the one true sender-clock primitive on the web; Chrome-only |
| WebTransport | ✅ `incomingHighWaterMark` is **gone**, renamed `incomingMaxBufferedDatagrams`. 📄 Age-based drop is normative: *"If more than |duration| milliseconds have passed since |timestamp|, then dequeue"*. 📄 **No per-datagram timestamps exposed**; `getStats()` not implemented in Chrome | **NO** for timing — write your own send timestamp into the payload. Do use `incomingMaxAge` for a live lane |
| `scheduler.postTask` | 📄 `delay` is a floor only — *"delayed for **at least** delay milliseconds"*, no upper bound. Cr94/Fx142/Sa✗ | **NO** — gives ordering, never a deadline. Cannot replace a tick host |
| `navigator.scheduling.isInputPending()` | 📄 effectively deprecated — *"may incorrectly return false… may be a candidate for removal… superseded by features available on the Scheduler interface such as yield()"* | **NO** |
| 🔥 **Web Locks as a freeze exemption** | 📄 Chrome's Energy-Saver freezing opt-outs include pages that *"Hold a Web Lock or an IndexedDB connection that blocks operations outside the group"*. ✅ Source-level: `enum class CannotFreezeReason { … kHoldingWebLock, kHoldingIndexedDBLock, kHoldingBlockingIndexedDBLock … }` — **merely holding a Web Lock is its own standalone reason**, the "blocking" qualifier attaches only to IndexedDB. ✅ And Web Locks callbacks run on the **unpausable** queue even in a worker: `case TaskType::kWebLocks: return unpausable_task_queue_->CreateTaskRunner(type);` | **YES** — a ~3-line, source-confirmed answer to the Chrome 133 freeze risk the first pass flagged as a live threat (§3). ⚠️ Documented "on desktop"; unconfirmed on mobile; Chrome signals long-term intent to close this |
| 🔥 **`Atomics.wait` in a worker as the tick host** | 📄 spec-allowed on workers, banned on main (*"Only shared and dedicated worker agents allow the use of JavaScript `Atomics` APIs to potentially block"*). ✅ V8 converts to **nanoseconds** and waits on an OS condvar, not a browser timer queue: `double timeout_ns = rel_timeout_ms * …;  node->cond_.WaitFor(...)`. ✅ **Structurally out of reach of the throttler**: Blink freezing is `SetVoteToEnable(false)` over *task queues* — it prevents selecting new tasks and never suspends the OS thread, and a worker already inside one long task is not in a queue. ✅ Dedicated-worker timer throttling is off by default anyway (`kDedicatedWorkerThrottling` FEATURE_DISABLED_BY_DEFAULT) | **YES — the highest-value swap available.** ⚠️ needs `SharedArrayBuffer` ⇒ COOP/COEP; ⚠️ the "out of reach" argument is structural, not measured — it deserves a rig arm. 📄 And workers **are** frozen when the document is (*"Any dedicated worker agent whose… owning document is non-null and frozen must become blocked"*) → pair it with the Web Lock above |

**Three platform facts that change our design today**, none of which were in the first pass:

- ✅ **Windows has an 8 ms timer floor on battery.** `kMinTimerIntervalHighResMs = 1` on AC,
  **`kMinTimerIntervalLowResMs = 8`** on battery, else *"the default, typically 15.625"*.
  `base/time/time_win.cc`. Our 25 ms tick quantises to 8 ms grid on an unplugged laptop.
- ✅ **Safari's `performance.now()` is 1 ms.** WebKit `Performance.cpp`:
  `timePrecision { 1_ms }`, isolated `highTimePrecision() = 20µs`. Chrome is 100 µs
  non-isolated / 5 µs isolated, and the jitter is *deterministic per interval* so you
  cannot average it out. **COOP/COEP buys the fine clock and `SharedArrayBuffer` in one
  switch** — the same switch `Atomics.wait` needs.
- 📄 **Worker `performance.now()` has a different time origin** — *"In Worker and
  ServiceWorker contexts, this value represents the time when the worker is run."* You must
  exchange `timeOrigin` and correct. Worth auditing our worker tick host for.

Also noted: `SharedWorker` finally reached **Chrome Android 148**, but Chrome's own release
note warns *"SharedWorker instances might terminate unexpectedly, without notifying users
or web developers"* — so Strudel's `NeoCyclist` pattern (first pass §5f) needs a
re-election story before we copy it. `BroadcastChannel` delivery is on the DOM manipulation
task source with no specified latency. **Long Animation Frames** (`renderStart`,
`blockingDuration`, `scripts` attribution) is the best new instrument for the rig.

---

## 3. Multiplayer time — everyone syncs the event, nobody syncs the position

### 3a. Do CRDTs have an ordered event log with a playhead? Almost.

- ✅ **A Yjs snapshot *is* `reduce(prefix ≤ cut)`, but the cut is a version vector, not a
  time.** `snapshot = doc => createSnapshot(createDeleteSetFromStructStore(doc.store), getStateVector(doc.store))`
  — just `{ds, sv}`. `createDocFromSnapshot` folds the prefix: per client it walks
  `structs[0..findIndexSS(structs, clock-1)]` and applies into a **fresh Doc**. O(all ops
  before the cut), new allocation per seek.
  https://raw.githubusercontent.com/yjs/yjs/main/src/utils/Snapshot.js
  📄 Hard precondition, verbatim: `if (originDoc.gc) { throw new Error('Garbage-collection must be disabled in \`originDoc\`!') }`
  — *"we should not try to restore a GC-ed document, because some of the restored items
  might have their content deleted."* **Time travel costs you tombstones forever**, and
  ✅ Jahns measured the price: *"Each `Item` consumes… 88 bytes"*, 19.7 MB for a conference
  paper, 220 MB for a 10.5M-char doc.
  ⚠️ Snapshots are essentially undocumented — not in docs.yjs.dev, not in the README.
- ⚠️ **YATA order is relational, not numeric** — each insert is
  `o(id, origin, left, right, isDeleted, content)`, ties broken by creator id. **A
  `Y.Array` cannot natively express "this clip sits at t=12.4 s"**; you carry a separate
  sort key. That is the structural mismatch between CRDT lists and timelines.
- 📄 **Automerge separates op log from materialised state and gives a cheap view**:
  `view(doc, heads)` = *"an immutable view… a cheap reference-based copy that shares memory
  with the original document… very fast"*. But *"`getHistory()` is expensive for large
  documents as it reconstructs every state."* ⚠️ **The seek key is a hash set, not a time**
  — changes carry a `time` field but there is **no `as-of(t)` API**.
- 📄 **Loro is the closest structural match to a playhead.** `checkout(frontiers)` enters
  *detached* mode where *"the `DocState` is not synchronized with the latest version of the
  `OpLog`"*, and crucially *"Any `import` operations will be recorded in the `OpLog`
  without being applied to the `DocState`."* That is scrubbing while the live log keeps
  growing — `state_frontiers()` vs `oplog_frontiers()` is paused-playhead vs live-edge.
  https://docs.rs/loro/latest/loro/struct.LoroDoc.html
- 📄 **Diamond Types** ships the same split (OpLog = *"an append-only record of all document
  changes"*, Branch = *"a lightweight, in-memory snapshot representing the document state
  at a specific point in time"*), and ✅ is the fastest of the three on the automerge-perf
  trace (0.056 s / 1.1 MB vs Yjs 0.97 s / 3.3 MB vs Automerge 291 s / 880 MB).
  josephg names *"rewinding and replaying"* as the CRDT-only capability — and never applies
  it to media. https://josephg.com/blog/crdts-go-brrr/
- 📄 **Peritext is the published range anchor**: marks attach to *"two anchor points where
  the start or end of a formatting operation may attach — either before or after the
  character"*, with non-expanding marks for comments. https://www.inkandswitch.com/peritext/
- 📄 **Kleppmann names our exact open problem**: *"existing algorithms behave poorly when
  users concurrently move list elements to a new position"*, and *"we also discuss the open
  problem of moving ranges of elements."* **A timeline ripple edit is a concurrent range
  move.** https://martin.kleppmann.com/2020/04/27/papoc-list-move.html
- ❌ **Clean negative: no published CRDT work on temporal media.** crdt.tech/papers has
  text, JSON, 3D — no timeline, NLE or DAW. Ink & Switch's index is empty on audio/video;
  the only relevant sentence is aspirational: 📄 *"*Every medium*, not just text but also
  images, video, audio, or 3D models, should have rich tools to examine the history, review
  changes, and evaluate alternatives."* They wrote the licence and built nothing on it.
- ⚠️ **Where a shared playhead would go is the presence channel, and its cadence is wrong.**
  Yjs Awareness is a *"tiny state-based Awareness CRDT"*, deliberately not persisted;
  ✅ constants are `outdatedTimeout = 30000` ms, self-ping 15 s, sweep 3 s. Three-second
  granularity against a 1× playhead.

**Event-sourcing/streaming is the better-theorised half, and it maps cleanly:**

- 📄 *"a projection is nothing else than a left-fold over the sequence of events"* — the
  fold is named prior art, just untimed. ⚠️ Snapshot + subsequent events = keyframe + GOP.
- 📄 **Datomic is the closest thing to a seek API**: *"An `as-of` filter returns a database
  'as of' at a particular point in time, ignoring any transactions after that point"* —
  and it accepts a tx-id, a basis-t, **or a `java.util.Date`**, i.e. frame-number *and*
  timecode addressing, already solved. https://docs.datomic.com/reference/filters.html
- 📄 **XTDB gives the two axes a timeline needs**: *"XTDB tracks both the system time when
  data is inserted… and also the valid time periods that define exactly when a given row…
  is considered valid/effective in your application."* Valid time = playhead; system time =
  what the client had received when it rendered. That is the archival client's bitemporality
  in one sentence.
- 📄 **Akidau is the requested mapping.** *"Event time, which is the time at which events
  actually occurred"* vs *"Processing time, which is the time at which events are observed
  in the system"*; *"The black dashed line with a slope of one represents the ideal, where
  processing time and event time are exactly equal."* ⚠️ **Live playback is the slope-one
  line; seeking is leaving it deliberately; drift is being pushed off it.**
  A watermark is a seekable range: *"A watermark with a value of time X makes the
  statement: 'all input data with event times less than X have been observed.'"*
  https://www.oreilly.com/radar/the-world-beyond-batch-streaming-101/
- 📄 **Kafka Streams already ships the dual scheduler**: `PunctuationType.STREAM_TIME` vs
  `WALL_CLOCK_TIME`, where with stream-time *"When there is no new input data arriving,
  stream-time is not advanced and punctuate() is not called."* A transport for an archival
  log needs exactly this pair — a data-driven clock that stalls with the log, plus a wall
  clock that keeps the UI alive during the stall.

### 3b. Do A/V editors do multiplayer? Barely, and never the playhead.

- **Descript**: real concurrent editing + cursor presence, and the docs concede independent
  playheads — 📄 *"To see exactly what they're adjusting, make sure you're at the same
  playhead position—if you're at different timestamps, their edits may not be visible to
  you."* 📄 *"Descript doesn't support offline editing."* ⚠️ **No published architecture at
  all** — no blog, no CRDT/OT statement, no job post naming a model.
- ✅ **Ohm Studio (2012) is the forgotten prior art, and its engine is open source.** Flip:
  *"a data model library… real-time collaboration-oriented, transactional, portable and
  compact"*, *"At the core of Ohm Studio's unrivaled collaboration solution."* Model is
  **server-authoritative optimistic apply with rollback**, not CRDT — edits compile to
  *"a simple assembler"* transaction, the server does structural validation then
  client-supplied *"logical validation"*, and refusal *"rolls back the transaction"*.
  ⚠️ Tellingly, the published logical-validation example **is a timeline constraint**
  (`element._position + element._length` ≤ container length): the timeline is enforced by a
  validator, not modelled as a CRDT. Docs cover history/undo/branches and **never a
  transport**. https://github.com/ohmtech/flip-public
- **Audiotool NEXUS** (Jan 2026, the newest claim): ⚠️ public API is
  `nexus.start()/stop()`, `nexus.modify()`, `nexus.events.onCreate()`, `queryEntities`,
  `createOfflineDocument()` — **no transport, playhead, position, bpm or presence, and no
  published sync model.** A 2026 "multiplayer DAW" still ships document sync with no shared
  transport. https://developer.audiotool.com/js-package-documentation/
- **Soundtrap**: 📄 *"we can show real-time changes between collaborators without a 'sync'
  button"* — no architecture published, no shared-transport claim. **BandLab**: fork/revision
  async plus a Live Session with token-passed record control. **Splice Studio is dead**
  (📄 shut down 2023, *"this feature hasn't been a focus for us since 2017"*).
  **Soundation** claims the strongest presence — 📄 *"see your co-creators' cursors and every
  action as if they're sitting at the same computer"* — and says nothing about playback.
- **DaVinci Resolve** is the best-documented multi-user model in video and it is **locking**:
  📄 *"collaborative workflow uses a 'first come, first served' model… the first collaborator
  to select a bin… gets a 'lock'"*, argued for on purpose — 📄 *"each collaborator gets to
  decide when they want to update… in order to prevent a kaleidoscope of constant
  alterations… from being a distraction."*
  ★ **A shared playhead does exist, in Remote Grading**: 📄 *"Cue commands are also
  synchronized to ensure that both systems are always on the same frame in the Timeline.
  Starting or stopping playback on the colorist's DaVinci Resolve also starts and stops the
  remote client system"* — but one-way, and ✅ *"the playback speeds on the two DaVinci
  Resolve systems may differ. **The frame positions are only guaranteed to be synchronized
  when playback is stopped.**"* Scrub syncs; playback does not.
- ★ **Unreal Multi-User Editing + Sequencer is the only symmetric shared playhead in a
  shipping timeline editor.** 📄 *"When one user plays a Sequence, the same Sequence plays
  immediately for all users that have that same Sequence open. Only the user who began
  playback will be able to stop it."* ✅ Same admission: *"The Multi-User Editing system
  synchronizes playback **events**, but different computers may play back the animations at
  different frame rates. **Do not expect the results to be frame-accurate.**"* Merge model is
  asset locking. https://dev.epicgames.com/documentation/en-us/unreal-engine/multi-user-editing-overview-for-unreal-engine
- ⚠️ **Two independent implementations converge on "sync the event, not the position", and
  both admit it drifts.** That is the gap.
- **Figma**: 📄 anti-OT (*"OTs were unnecessarily complex for our problem space… a
  combinatorial explosion of possible states"*), anti-CRDT (*"Figma isn't using true CRDTs…
  There is some unavoidable performance and memory overhead"*), and what they actually do is
  *"similar to a last-writer-wins register in CRDT literature except we don't need a
  timestamp because the server can define the order of events."*
  ⚠️ **The multiplayer post contains zero temporal content.** Their only shared-position
  primitive is spatial (observation mode). ❌ And the clean negative: **Figma Motion (Jun
  2026) added a real timeline and shipped only time-addressed *comments*** — 📄 *"With
  time-based comments on the canvas, anyone can point to a specific moment in the
  animation"* — nothing on synced scrub or remote-playhead presence.
- ★ **Google Docs is a fold over an op log, in Google's own words**: 📄 *"We save your
  document as a revision log consisting of a list of these changes… **To display a document,
  we replay the revision log from the beginning.**"* and *"instead of computing the changes
  by comparing document versions, we now compute the versions by playing forward the history
  of changes."* ⚠️ But Docs has no playback time at all — the "timeline" is a list.
  https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs_22.html

### 3c. Comment-at-timecode — Frame.io has ranges; nobody's anchor survives a re-edit

- ✅ **Frame.io is the only mainstream tool with a published *range* field.** v2 `createComment`:
  `timestamp` — *"Timestamp for the comment, **in frames**, starting at 0"*; `duration` —
  *"Used to produce range-based comments, this is the duration measured in frames"*.
  v4 keeps `duration` and makes `timestamp` polymorphic (request `"00:00:02:12"`, response
  `123`, toggled by `timestamp_as_timecode`).
  https://developer.frame.io/api/reference/operation/createComment
- ⚠️ **Frames are presentation; storage is microseconds.** Frame.io staff: 📄 *"the front end
  player and backend have to independently calculate the frame position based on the DB
  `timestamp_microseconds` value"* — with documented off-by-one drift as the consequence.
  **Store rational/µs, derive frames once, at the edge.**
- 📄 Range UX makes the range a *transport* command: *"the specific points highlighted in the
  range will become the new playback window."*
- ❌ **Version survival: NO.** 📄 *"Frame.io does not carry over new comments within version
  stacks"*, and the sanctioned workaround is a blind copy/paste re-stamp.
- ❌ **Vimeo: clean negative.** ✅ Verified against `vimeo/openapi` `api.yaml` — the `comment`
  schema is `{created_on, metadata, resource_key, text, type, uri, user}`; grep for
  `timestamp|annotation` over the whole spec → **0 hits**. The product has timecoded comments;
  the API does not expose them.
- ✅ **Ziflow** has a native two-point range (`location.start_time` + `location.end_time`).
  ✅ **Filestage** models migration as first-class provenance —
  `copiedFrom = {copiedTime, copyType, originalCommentId, userId}` plus a
  Copy-Comments-Between-Versions endpoint with a `keepAnnotationsAndMarker` flag; ⚠️ the tell
  is that you turn it **off** when the new cut invalidates the anchor.
- 📄 **Descript anchors to WORDS, not time** — *"Comments let you attach notes to specific
  words in your transcript (and the audio or video beneath them), so feedback and reminders
  stay tied to the exact moment they're about."* ⚠️ The only system here where re-editing
  cannot orphan a comment, because the anchor rides the thing that moved.
- ★ **Ranges are standardised and unused.** 📄 W3C Media Fragments: *"Temporal clipping is
  denoted by the name `t`, and specified as an interval with a begin time and an end time"*,
  half-open — *"the begin time is considered part of the interval whereas the end time is…
  the first time point that is not part of the interval."* Web Annotation composes it:
  `{"type":"FragmentSelector","conformsTo":"http://www.w3.org/TR/media-frags/","value":"t=30,60"}`.
  For an archival horizon, a comment that serialises to this outlives the tool that made it;
  a Frame.io integer does not.
- ✅ **OTIO already models "a comment on a range"**: `Marker(name, marked_range, color,
  metadata, comment)` with 📄 *"The marked range is in the owning item's time coordinate
  system"* — so a marker on a *clip* **moves with the clip when the sequence is re-edited**.
  The only genuine re-edit-survival mechanism found anywhere.
- ★ **Design fork**: absolute-offset anchors (everyone) break on re-edit; container-relative
  anchors (OTIO markers, Descript words, Peritext marks) survive it.

### 3d. The audio world already solved the shared playhead

- ✅ **Syncplay is the design to copy and the only one with published numbers.** No leader;
  the server holds room position and pushes on a 1 s loop. Wire shape 📄
  `{"State":{"playstate":{"paused":false,"position":0.998,"setBy":"Bob","doSeek":false},
  "ping":{"yourLatency":0.0159,"senderLatency":0.0159,"latencyCalculation":…}}}`.
  ✅ RTT: `self._rtt = time.time() - timestamp`, EWMA weight `0.85`, forward delay
  `_avrRtt/2 + (_rtt - senderRtt)`; both sides age-compensate
  (`if not paused: position += messageAge`) and the client dead-reckons between updates.
  ✅ **Correction ladder**: ignore below **1.5 s**; rate-nudge `SLOWDOWN_RATE = 0.95` from
  1.5 s, released at **0.1 s**; hard seek only past **4 s** ahead / **5 s** behind.
  0.95× closes a 1.5 s error in ~30 s. https://syncplay.pl/about/protocol/
- ❌ Teleparty, Watch2Gether, Kast, Scener: no spec, no source, no numbers. 📄 Discord's
  Embedded App SDK has **no synced-playback primitive** — only participant lists.
  Hyperbeam sidesteps it by streaming one remote Chromium.
- ✅ **The precision ceiling for anyone doing this with events**: YouTube's IFrame API has
  **no time-update event at all** (you poll); Vimeo player.js `timeupdate` 📄 *"generally
  fires every **250ms**"*; the HTML spec floor is 📄 *"not to be fired faster than about
  **66Hz** or slower than **4Hz**"*. rAF-polling `currentTime` is the only way under it —
  which is what we do, and now `rVFC.mediaTime` is the better sensor.
- ★ **Multi-room audio uses a strictly better model: buffer ahead, stamp with a presentation
  time on a shared clock, correct by rate.** ✅ shairport-sync: nominal latency
  **88,200 frames = 2 s @44.1 kHz**; 📄 *"AirPlay sources set a latency of around 2.0 to 2.25
  seconds. AirPlay 2 can use shorter latencies, around half a second"*; classic AirPlay uses
  *"a variant of NTP"*, AirPlay 2 uses **PTP/IEEE 1588-2008** synchronising *"usually to
  within a fraction of a millisecond"*.
  ✅ And the correction bands: `drift_tolerance_in_seconds = 0.002` (*"88 frames, i.e. 2 ms"*),
  `resync_threshold_in_seconds = 0.050` — full flush only at **50 ms**, everything below it
  handled by frame stuffing or soxr resampling, *"typically tens to about 100 parts per
  million"*. https://github.com/mikebrady/shairport-sync
  📄 Sonos (patent, no blog): the group coordinator stamps each packet with a **"time-to-play"**
  and transmits ahead; clock offsets via SNTP, tracked in microseconds. US9313591B2.
  **Our ±20 ms dead band sits between shairport's 2 ms nudge floor and its 50 ms flush
  ceiling — which is a good place to be, and now has two independent numbers bracketing it.**
- 📄 **The cross-client anchor already exists in our stack.** HLS `EXT-X-PROGRAM-DATE-TIME`
  *"associates the first sample of a Media Segment with an absolute date and/or time… to
  millisecond accuracy"* and RFC 8216 §6.2.1 says it *"defines an informative mapping of the
  (wall-clock) date and time… which may be used as a basis for **seeking**."*
  ✅ dash.js `UTCTiming` defaults: max drift **100 ms**, resync 2 s–600 s, RTT-compensated.
- ★ **`reduce(prefix ≤ t)` driven by a playhead is shipped at scale, twice.** AWS IVS Player
  exposes `getSyncTime()` — ✅ *"a UTC time that represents a specific time during playback,
  at a granularity of **1 second**"* — and the reference chat-replay implementation is
  literally the fold: 📄 `const isVisible = chatMsgTs <= currentTimestamp;`.
  ✅ Twitch VOD comments carry `content_offset_seconds` as a **float, sub-second** (`0.278`),
  and the endpoint is queryable *by* it —
  `GET /v5/videos/{id}/comments?content_offset_seconds={offset}`. ⚠️ Private API. **A
  paginated op-log query keyed by playhead position is a solved, shipped pattern that has
  never been written up as one.**

---

## 4. Export and interchange — what we could emit, and what can carry provenance

Format-by-format writability and time models are in the §1e table. This section is about
**provenance**, which is where the interesting answer is.

### 4a. C2PA can express "these seconds were reconstructed". Exactly.

The first pass found `TemporalRange` as a type name and could not get field spellings. Here
they are, from spec 2.3 §18.2 and `c2pa-rs`:

- 📄 §18.2.1: *"a given assertion, such as an actions assertion, may only be relevant to a
  specific portion of an asset as opposed to the entire asset."*
- 📄 CDDL:
  `region-map = { "region": [1* $range-map], ? "name", ? "identifier", ? "type", ? "role" ; DEPRECATED, ? "description", ? "metadata" }`
  `range-map = { "type": $range-choice, ? "shape", ? "time", ? "frame", ? "text", ? "item" }`
  `$range-choice /= "spatial" / "temporal" / "frame" / "textual" / "identified"`
  `time-map = npt-time-map / wall-clock-time-map`
  `npt-time-map = { ? "type": "npt", ? "start": tstr, ? "end": tstr, ? "endInclusivity": "inclusive" / "exclusive" }`
- 📄 §18.2.2.3: *"Times are normally described using… 'Normal Play Time' (npt) as described
  in RFC 2326 (as recommended in W3C Media Fragments specification)."* … *"All start times
  are inclusive of that moment in time, and all end times are, by default, exclusive of it."*
  — **half-open, same as us, same as Media Fragments.**
- 📄 **Live streams are handled**: *"If the total asset duration is not available (such as
  for live streams), the time range extends forward or backward from the provided field, as
  appropriate, until the region is updated or the end of the asset is reached."*
  Changelog 2.3: *"Enhanced temporal range handling for live streams, including support for
  undefined end times."*
- 📄 **The spec's own example is our use case verbatim** — *"example of a range of a specific
  track of a video"*:
  `{"region":[{"type":"temporal","time":{"type":"npt","start":"0","end":"5.2"}},{"type":"identified","item":{"identifier":"track_id","value":"2"}}],"description":"enhanced some of the audio track"}`
- 🔥 **An action can carry it.** §18.15.4.6: *"The action may be specific to only a portion
  of an asset - such as a range of frames in a video… For v2, they are identified using a
  `changes` field, whose value is an array of region-map objects."* CDDL:
  `? "changes": [1* region-map], ; A list of the regions of interest of the resource that were changed. If not present, presumed to be undefined.`
  ✅ In Rust/TS: `changes?: RegionOfInterest[] | null` on `Action`; builder `Action::add_change()`.
  ✅ `Role` vocabulary includes `c2pa.edited` (*"This area has had edits applied to it"*),
  `c2pa.placed`, `c2pa.redacted`, `c2pa.deleted`, `c2pa.watermarked`.
- 🔥 **Wider than actions**: `$assertion-metadata-map` carries
  `? "regionOfInterest" : $region-map ; describes a region of the asset where this assertion is relevant`
  — **any** assertion can be time-scoped. And §18.16.13 is normative for ingredients:
  *"when only a portion of an ingredient is used in the creation or editing of an asset… the
  metadata field should contain a regionOfInterest field… which describes the relevant
  portions of the ingredient that were used."* That sentence is the archival-restoration case,
  written down by a standards body.
- 🔥 **The only confidence number in a shipping media standard**:
  `rating-map = { "value": int-range, ; "A value from 1 (worst) to 5 (best)" ? "code": $review-code, ? "explanation": tstr }`
  with `int-range = 1..5` and codes including `actions.possiblyMissing`,
  `ingredient.possiblyModified`. ✅ `reviewRatings` and `regionOfInterest` sit **in the same
  `$assertion-metadata-map`** → a 1–5 rating scoped to a time range, today.
- ✅ **A browser can actually write and sign this.** `@contentauth/c2pa-web` 0.14.3
  (2026-08-18, WASM over c2pa-rs) exposes `Builder` with `setIntent({create: <DigitalSourceType>})`
  / `'edit'` / `'update'`, `addIngredientFromBlob()`, and
  `sign: (signer, format, blob) => Promise<Uint8Array>`, where `Signer` is an **interface**
  so the key stays server-side. Alternative with no WASM: `@trustnxt/c2pa-ts` 0.14.0, pure
  TS, 📄 *"Creating manifests ✅"*, **MP4 ✅**, `c2pa.hash.bmff.v3` Merkle hashing over
  fragmented MP4 — the fMP4 path this project already lives on.
- ⚠️ Reference-SDK lag: `c2pa-rs` `TimeType` has only `Npt` — no `wallClock`, no
  `endInclusivity`. Emit wall-clock and it will not round-trip.
- 📄 IPTC `digitalSourceType` gives us the two verbs we need, verbatim:
  `algorithmicallyEnhanced` = *"Modification or correction by algorithm without changing the
  main content of the media, initiated or configured by a human, such as sharpening or
  applying noise reduction"* (**restoration**), and `compositeWithTrainedAlgorithmicMedia` =
  *"Augmentation, correction or enhancement using a Generative AI model, such as with
  inpainting or outpainting operations"* (**generative infill**). Also relevant for archival
  ingest: `negativeFilm`, `positiveFilm`, `print`, `computationalCapture`.
  ⚠️ **`minorHumanEdits` is retired** (→ `humanEdits`), as are `softwareImage` and `digitalArt`.
  https://cv.iptc.org/newscodes/digitalsourcetype/

### 4b. Nobody writes it. Three killer negatives.

- ✅ GitHub code search for `"type": "temporal"` + c2pa → **9 hits, all c2pa-rs and its
  forks**. The only fixture is `cli/tests/fixtures/ingredient_test.json` with
  `{"type":"temporal","time":{}}` — an **empty** time map, which per the SDK's own docs means
  the whole asset.
- ✅ **The official Verify UI cannot render a temporal region.** `contentauth/verify-site`'s
  only region code is `src/lib/selectors/autoDubInfo.ts`, which filters
  `region.type === 'identified'` for `'lips'`/`'transcript'`; `grep temporal` → 0 hits, no
  scrubber, no timecodes.
- ✅ **The conformance program never tests it.** `repo:c2pa-org/conformance-public temporal`
  → 0; `regionOfInterest` → 0. The official partially-AI-audio vector emits `c2pa.dubbed`
  with a `digitalSourceType` and **no `changes` at all**.
- ⚠️ Adobe Premiere: whole-asset on export (📄 *"include your preferences… to sign the
  **exported content**"*) — see §8.3 for what it *does* mark, which is more interesting.
- 🔥 **Project Origin / CBC-Radio-Canada draws the sharpest distinction**: 📄 *"The
  specification requires validators to calculate a hash value for **each fragment** and to
  compare it against a pre-calculated value stored in the manifest."* Per-fragment
  **integrity** under **one whole-asset claim**. Assertions stay whole-asset. The only
  per-segment player work found is a 2024 Adobe Research MMSys *demo*.
- 📄 SynthID watermarks *"an AI-generated image (or video segment)"* — per-frame *embedding*,
  never per-frame *metadata*; no timestamps, no C2PA in detector output. YouTube's "altered
  or synthetic" and "captured with a camera" labels are both whole-video and all-or-nothing
  (📄 the camera label requires *"no edits to sounds or visuals"*). TikTok and Meta label at
  post level. ✅ **JPEG Trust (ISO/IEC 21617-1): `temporal` appears zero times.**
- ➡️ **If we attach assertions to time ranges we are first, and nothing but our own client
  will render them.** That is a strong position and a real cost.

### 4c. Certainty vocabularies — TEI is the one to steal from

- ⚠️ **PROV-O: confirmed negative.** "confidence", "certainty", "probability", "uncertain"
  appear nowhere. And 📄 `prov:startedAtTime`/`prov:endedAtTime` have
  `rdfs:range xsd:dateTime` — **wall-clock time of the activity, not a media offset**. Using
  them for in-media position is a category error.
- ⚠️ **Web Annotation: no certainty vocabulary.** The 13 motivations are illocutionary, not
  epistemic; provenance is only `creator`/`generator`/`created`/`modified`, and 📄 `creator`
  explicitly admits *"a software agent"* — **so a model's guess and a human's assertion
  serialise identically.**
- ✅ **CRMinf** has genuine belief values: `I6 Belief Value` = *"any encoding of the value of
  the truth of an I2 Belief… in terms of discrete logic, modal logic, probability, fuzziness,
  or any other adequate representational system"*, minimum *"'TRUE'; 'FALSE'; 'UNKNOWN'"*.
  ⚠️ Nothing binds a belief to a media offset. **LIDO** has certainty only for actor
  attribution (*"attributed to, studio of, or style of"*), no degree, no time.
- 🔥 **TEI is the only standard with both certainty and media time.** 📄 `@cert` *"signifies
  the degree of certainty associated with the intervention or interpretation"*, datatype
  `teidata.probCert` = *"either as a numeric probability or as a coded certainty value"*
  (`high|medium|low|unknown`); `@resp` *"indicates the agency responsible"*. Both on the
  **global** class `att.global.responsibility`.
- 🔥 **The sleeper is `@locus`.** `<certainty>` has a **required** `@locus` ∈
  `name | start | end | location | value`, where `start` = *"uncertainty concerns whether the
  start of the element is correctly identified."* **Nothing else in either survey separates
  uncertainty about the *boundary* from uncertainty about the *identity*.** That is exactly
  "I'm confident this is the Kurenniemi segment, but I'm 0.6 on where it starts."
  https://tei-c.org/release/doc/tei-p5-doc/en/html/ref-certainty.html
- ✅ And it composes with time: `att.timed` gives `@start`/`@end` into a `<timeline>`, and its
  members include **`<media>`**, which also inherits `att.global.responsibility`. So
  `<media @url @start @end @cert @resp>` is schema-legal today. ⚠️ TEI shows no worked example
  — we would be first in practice, not off-spec.

### 4d. The live lane has its own carrier, and hls.js already surfaces it

- 🔥 📄 **`EXT-X-DATERANGE`** *"associates a Date Range (i.e., a range of time defined by a
  starting and ending date) with a set of attribute/value pairs"*, with `START-DATE`
  (REQUIRED), `END-DATE`, `DURATION`, `PLANNED-DURATION`, and `X-<client-attribute>`:
  📄 *"The 'X-' prefix defines a namespace reserved for client-defined attributes… Clients
  SHOULD use a reverse-DNS syntax."* RFC 8216 §4.3.2.7. **A spec-legal, time-ranged,
  extensible metadata slot in the playlist itself.**
- ✅ hls.js already wires it: config `enableDateRangeMetadataCues` (default `true`) —
  📄 *"whether or not to add, update, and remove cues from the metadata TextTrack for
  EXT-X-DATERANGE playlist tags."*
- ⚠️ WebVTT metadata tracks are legal but awkward as a rendition: 📄 HTML `kind="metadata"`
  = *"Tracks intended for use from script. Not displayed by the user agent"*, and WebVTT
  metadata cue text is *"any sequence of zero or more characters other than LF/CR"* — so
  single-line JSON is spec-legal. But 📄 RFC 8216 `EXT-X-MEDIA` `TYPE` *"valid strings are
  AUDIO, VIDEO, SUBTITLES, and CLOSED-CAPTIONS"* — **no METADATA type**, so it must be a
  sidecar attached via `addTextTrack`.
  ⚠️ Correction to the brief: `#xywh=` is **Media Fragments URI**, not a WebVTT feature.
- ❌ SRT has no IANA media type, no spec and no metadata mechanism. ⚠️ TTML2 `<metadata>`
  takes foreign-namespace content but npm `imsc` is a renderer, not a writer.

---

## 5. Shipped since 2024 that the first pass missed

- 🔥 **Mediabunny is now the substrate, and it deliberately stops at the timeline.**
  📄 *"a JavaScript library for reading, writing, and converting media files (like MP4 or
  WebM), directly in the browser"* — the feature list omits editing entirely. ✅ MPL-2.0,
  7,043★, created 2024-09-01, v1.55.3 on 2026-08-26, releasing ~2×/week.
  📄 **No transport, no clock.** Access is timestamp-random-access only:
  `VideoSampleSink.getSample(ts)` *"returns the last sample with a timestamp less than or
  equal to the search timestamp, or `null`"*; seek is `getKeyPacket(t)` then iterate forward.
  https://mediabunny.dev/guide/media-sinks
- 🔥 **Remotion surrendered its media stack to it.** 📄 *"we acknowledge Mediabunny is the
  more promising project"* … *"Instead of trying to compete, we have decided to team up."*
  ✅ `@remotion/media-parser` and `@remotion/webcodecs` **deprecated 2026-02-01**; the new
  `@remotion/media` `<Video>`/`<Audio>` are *"based on Mediabunny and WebCodecs"*, replacing
  `<OffthreadVideo>` (which shelled out to a headless-Chrome screenshot path), with fallback
  to `OffthreadVideo` for unsupported containers. https://www.remotion.dev/blog/mediabunny
  ⚠️ **A render-farm company concluded WebCodecs beat its own parser** — and its preview and
  render paths now converge on one decoder. That materially changes the first pass's §6a.
- **New OSS NLEs with real traction and real architecture claims:**
  - **walterlow/freecut** (2,106★, 2026-08). 📄 **"Frame-accurate playback through FreeCut's
    custom `Clock` and composition runtime"** — the closest published sibling to this project
    found anywhere. Also 📄 *"Fast scrub overlays, decoder prewarming, adaptive preview
    quality, and source warming"*; *"All visual effects and compositing paths are
    WebGPU-first"*; 📄 explicit parity claim: *"Pitch, EQ, fades, volume, and transition audio
    paths are preserved in preview and export."*
  - **open-ribbi/velocut** (450★). 📄 The most interesting architecture in the set: *"A
    canonical Rust engine (compiled to WASM) is mirrored by a TypeScript reference engine and
    kept in lock-step by **shared golden-vector tests**"* — a published answer to
    preview-vs-export divergence.
  - **Augani/openreel-video** (4,929★): 📄 *"Built with React, TypeScript, WebCodecs, and
    WebGPU"*, claims *"Frame-accurate scrubbing"*. ✅ **WebAV-Tech/WebAV** (2,087★) publishes a
    real benchmark: 1080p/10 min AVC text-overlay export, ~60 s vs native ffmpeg ~45 s on M1.
  - ⚠️ **BBC R&D VideoContext is dead** (1,353★, last push 2023-07-18).
- ⚠️ **Clean negative: there is no Premiere Pro on the web.** Only third-party VDI wrappers;
  Adobe's 2025 push was mobile. Its WASM investment is Photoshop/Lightroom/Acrobat.
  CapCut Web, Submagic, OpusClip, Captions.ai, HeyGen, Synthesia, Editframe: **zero published
  architecture** — no clock model, no seek strategy, no frame-accuracy claim.
- 🔥 **Correction to a constraint we were about to design around.** 📄 MDN, verbatim:
  *"GPUExternalTexture objects with an HTMLVideoElement source expire as soon as they are
  used (for example in a bind group)."* … *"GPUExternalTexture objects with a VideoFrame
  source expire **only when the VideoFrame is closed**, for example via a VideoFrame.close()
  call."* **The one-frame-validity rule is an `HTMLVideoElement` problem, not a WebCodecs
  problem** — decode to `VideoFrame` and the external texture lives across passes.
  https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/importExternalTexture
- 📄 WebGPU is effectively baseline in 2026: Safari 26 on macOS Tahoe/iOS/iPadOS/visionOS,
  Firefox 141 (Windows) / 145 (macOS Apple Silicon). ⚠️ `importExternalTexture` uniformity is
  not verified — Firefox tracked it separately (bugzilla 1827116).
- **MasterSelects** is the shipping WebGPU compositor: 📄 *"Video textures come in as
  `texture_external` with no CPU roundtrip"*; *"A ping-pong compositor stacks unlimited layers
  through 37 blend modes… inside a single 618-line WGSL shader"*; *"Export captures frames as
  `VideoFrame` straight from the GPU canvas, no staging buffers, no `readPixels`"*;
  *"3-tier caching (300 VRAM textures, per-video cache, 900-frame RAM preview)"*.
  ⚠️ **Publishes no clock model, no seek strategy, no fps numbers** — the architecture is
  entirely spatial. 📄 PixiJS v8's WebGPU renderer is feature-complete but *"the WebGL
  renderer is recommended for production."*
- ✅ **Best measured seek numbers anywhere, and they are new**: Mozilla bug 2049301,
  seek-to-first-frame via rVFC, 1280×720@60 H.264 2 s GOP, 15 iterations. Before: Firefox
  75.5 ms / Chrome 18.7 ms (direct MP4 ±10 s); Firefox 173.0 ms / Chrome 45.5 ms (YouTube
  AV1/MSE). After four patches in **Firefox 154**: MP4 → 21.5 ms, AV1/MSE → 47.0 ms; headline
  *"~89% reduction (~8.8× faster) median `seeked` latency from ~262 ms to ~30 ms"*. It also
  states the working target: **the frame under the scrubbing playhead must land in ~16 ms.**
  https://bugzilla.mozilla.org/show_bug.cgi?id=2049301
- ✅ **W3C has stopped trying.** `w3c/media-and-entertainment#4` "Frame accurate seeking of
  HTML5 MediaElement" is **still open**, 90 comments, opened 2018-06-11, last updated
  2024-05-28. The Media WG charter (2025-07) has WebCodecs CR ~Q4 2026, REC ~Q2 2027 —
  **no MediaTimeline, no frame-accurate-seek deliverable.** ⚠️ "WebCodecs v2" does not exist
  as a named thing.
- **RNBO (Cycling '74) is the most complete shipped web transport model found.** 📄 Each
  device is an `AudioWorkletNode`; `@rnbo/js` exposes `TempoEvent`, `TransportEvent`,
  `TimeSignatureEvent`, **`BeatTimeEvent`** — *"A BeatTimeEvent moves the transport to a new
  time, specified in a number of quarter notes from the transport's start"* — i.e. **a real
  seekable musical transport in the browser**, advancing on the audio render quantum.
  Musical time only; no media or wall-clock seek. https://rnbo.cycling74.com/learn/musical-time-events
- ⚠️ **timingsrc is now unmaintained by anyone institutional**: 📄 *"maintained by the W3C
  Multi-device Timing Community Group until early 2025 and is now maintained by individual
  authors."* No v4, no successor. ⚠️ No Ardour/Zrythm/LMMS/Audacity WASM port exists.
- **LiveKit Agent Observability (2026)** is the competitor-shaped product the earlier
  prior-art file predicted: 📄 a session timeline combining *"transcripts, traces, logs, audio
  clips, and the per-event metrics emitted by the LiveKit Agents SDK"*, scrubbable, with
  *"inline alerts highlight[ing] key events such as tool calls and agent handoffs so you can
  immediately jump to the moments that matter."* https://livekit.com/products/agent-observability
- **MoQ closed the gap the earlier file flagged.** draft-ietf-moq-transport is at -18 with 11
  interoperable vendor implementations demoed at NAB 2026, and 📄 *"A timeline track records
  the presentation timestamp of each Group, giving a VOD viewer the ability to seek to a
  specific time… great for DVR applications while being concise enough for VOD."*
  https://doc.moq.dev/draft/moq-use-cases — **the "DVR/seek semantics are unspecified"
  argument is expiring.**

---

## 6. The second comparison table

Same shape as the first pass's §10, for systems that file did not cover.

| system | clock master | scheduling | seek strategy | hidden tab / determinism |
|---|---|---|---|---|
| **ours (transport v0.4)** | `{p0,t0,rate}` vector, media masters via `sync()` | lookahead 25/100/150 ms, per-kind catch-up | `reduce(prefix ≤ t)` → `assertState()`, one-phase, synchronous | worker host 8.5 ms p95 ✅; **no freeze exemption held** |
| **Ableton Link** | ✅ **leaderless**; `GhostXForm{slope, intercept}` maps each host clock into shared ghost time, then `Timeline{tempo, beatOrigin, timeOrigin}` — a `(beat,time,tempo)` **bijection** | none — Link is a clock, apps schedule | `requestBeatAtTime` (phase-preserving, lands at next same-phase time) vs `forceBeatAtTime` (*"very anti-social"*) | n/a. Join adopts session tempo/phase; leave is **TTL expiry (5 s, announce 250 ms)**; local edits win for 1 s |
| **JACK transport** | server; `jack_position_t` with a `valid` bitfield declaring which domains are present | per process cycle | ✅ **two-phase**: locate → `JackTransportStarting` → poll every slow-sync client's `sync_callback` until all TRUE **or timeout (jack2: 10 s) then roll anyway**; a locate mid-roll re-arms the barrier | n/a; freewheel mode = no wall clock at all |
| **Ardour** | JACK/engine; varispeed by SRC (unavailable if `_resampler_latency == 0`) | explicit transport FSM; the locate request carries `MustRoll / MustStop / RollIfAppropriate` | ✅ **`midi_chase` (default ON)** — scan the whole buffer to `spos`, accumulate held notes + CC/PGM/bend state, re-strike at offset 0; `resolve_diff()` emits a **minimal diff** between two state snapshots | export is `_engine.freewheel(true)` — one bool, one graph |
| **REAPER** | audio device | **anticipative FX** = speculative render-ahead, disabled on record-armed / automation-write / open-MIDI-editor tracks | n/a | render is a **flag** (`full-speed offline` / `1× offline` / `online`), not an engine; 📄 *"some plug-ins might perform and sound differently if rendered offline"* — no determinism claim |
| **GStreamer** | pipeline clock | — | `gst_element_seek(rate, format, flags,…)`; flags are the **intent**: `ACCURATE` (*"this might be slower"*) vs `KEY_UNIT`, plus `SNAP_BEFORE/AFTER/NEAREST`, `SEGMENT`, `TRICKMODE`, `INSTANT_RATE_CHANGE`. 📄 `GST_QUERY_SEEKING` reports seekable + format + segment range **before** you try. Negative rates supported | n/a |
| **Media Foundation** | media session | — | 📄 `IMFRateSupport::IsRateSupported(fThin, requested, &actualRate)` — *"If the exact playback rate is not supported, the nearest supported rate is received in actualRate"*; `GetFastestRate`/`GetSlowestRate` per direction, with/without thinning | n/a |
| **AVFoundation** | `AVPlayer` | — | `seek(to:toleranceBefore:toleranceAfter:)` — `.zero` = exact, slower. Rate lattice published as flags: `canPlayFastForward`, `canPlaySlowForward` (0–1×), `canPlayReverse` (−1×), `canPlaySlowReverse`, `canPlayFastReverse` | n/a |
| **RNBO web** | ✅ **audio render quantum** — *"if the transport is running, the beat time will automatically advance each time you call the process function"* | `device.scheduleEvent()` | `BeatTimeEvent` — *"moves the transport to a new time, specified in a number of quarter notes from the transport's start"*. Musical time only | AudioWorklet |
| **Mediabunny** | ✅ **none — no clock, by design** | none | `getKeyPacket(t)` → iterate packets forward; `VideoSampleSink.getSample(ts)` returns *"the last sample with a timestamp less than or equal to"* | n/a. ⚠️ No documented decoder-reuse or frame-cache policy |
| **FreeCut** | 📄 *"custom `Clock` and composition runtime"* (mechanism unpublished) | — | 📄 *"Fast scrub overlays, decoder prewarming, adaptive preview quality, source warming"* | 📄 claims preview/export audio-path parity. ⚠️ **frame-accuracy claimed, never measured** |
| **MasterSelects** | ⚠️ **unpublished — the architecture is entirely spatial** | — | 3-tier cache: 300 VRAM textures / per-video / 900-frame RAM preview | — |
| **Syncplay** | ✅ **server room-position, pushed at 1 Hz**; clients dead-reckon between updates and age-compensate both directions | — | ✅ **ladder**: <1.5 s ignore → 1.5–4 s `playbackRate 0.95` (release at 0.1 s) → >4 s ahead / 5 s behind hard seek | n/a |
| **AirPlay 2 / shairport-sync** | ✅ **PTP (IEEE 1588)**, *"within a fraction of a millisecond"*; ~2 s buffer-ahead with presentation timestamps | schedule-ahead | ✅ nudge below **2 ms** by frame stuffing / soxr (tens–100 ppm); full flush only past **50 ms** | n/a |
| **Resolve Remote Grading** | colourist's machine | — | ✅ cue commands synced frame-exactly; **one-way** | ✅ 📄 *"frame positions are only guaranteed to be synchronized when playback is stopped"* |
| **Unreal Multi-User + Sequencer** | the user who pressed play | — | play/stop broadcast; only the initiator may stop | ✅ 📄 *"synchronizes playback **events**… Do not expect the results to be frame-accurate"* |
| **Yjs snapshot** | n/a | n/a | ✅ fold structs `[0..clock)` per client into a **fresh Doc**; O(prefix) + allocation; **requires `gc: false` forever** | deterministic given the same update set |
| **Automerge `view(heads)`** | n/a | n/a | 📄 *"a cheap reference-based copy that shares memory"*; but `getHistory()` *"is expensive… reconstructs every state"*. **No `as-of(t)`** | deterministic |
| **Loro `checkout(frontiers)`** | n/a | n/a | ✅ **detached mode** — *"Any `import` operations will be recorded in the `OpLog` without being applied to the `DocState`"* = scrub while the log grows | deterministic |
| **rrweb replayer** | rAF over a timestamped event log | — | ✅ rebuild from the last full snapshot, apply incrementals forward; issue #6 proposes *"cache the result of rebuilding every 50 snapshots, so the maximize synchronously snapshots rebuilding number is 50"* — **checkpointed prefix fold**, still open | deterministic |
| **Kafka Streams** | ✅ **two clocks**: `PunctuationType.STREAM_TIME` vs `WALL_CLOCK_TIME` — stream-time *"is not advanced"* when no data arrives | punctuators | n/a (watermark = seekable range) | deterministic per input order |
| **AWS IVS / Twitch VOD** | media `getSyncTime()` (UTC, **1 s granularity**) / `content_offset_seconds` (float, sub-second) | — | ✅ **query the log by playhead**: `GET /v5/videos/{id}/comments?content_offset_seconds={offset}`; reference impl is `chatMsgTs <= currentTimestamp` | n/a |
| **ETC Eos** | cue list | — | ✅ 📄 out-of-sequence recall: *"the entire contents of the cue (move instructions **and** tracked values) will be played back"* — a prefix fold **asserted** | n/a |
| **Cubase / Cakewalk** | — | — | ✅ 📄 Chase — *"transmitting a number of MIDI messages to your instruments each time that you move to a new position"*; Cakewalk's is named **Patch/Controller Searchback** | n/a |

---

## 7. Three more things to steal

Distinct from the first pass's rVFC-`mediaTime` / offline-render / proxy-scrub, which a
sibling is implementing.

### 1. **Make `seek()` two-phase — JACK's slow-sync barrier, with Ardour's disposition flag.**

Our `seek()` is synchronous: `reduce(prefix ≤ t)` runs, `assertState()` is called, the
transport is at `t`. Any adapter that needs *asynchronous* work to reach the asserted state
— a decoder warming to a keyframe, a nested deck seeking one level down, a fetch — has no
way to say "not ready". Today it either blocks the tick or lies.

JACK's design is the fix and it is thirty years old:
- **Opt-in.** 📄 *"Clients that don't set a sync_callback are assumed to be ready
  immediately"* — an adapter without `caps.slowSeek` costs nothing.
- **The callback must not wait.** 📄 *"This realtime function must not wait. @return TRUE
  when ready to roll."* Polled each cycle, not awaited.
- **Fail open, then catch up.** 📄 *"When the timeout expires, the transport starts rolling,
  even if some slow-sync clients are still unready. The sync_callbacks of these clients
  continue being invoked, giving them a chance to catch up."* This is `catchUp: 'reduce'`
  applied to the *arrival* rather than the *resume*.
- **A locate mid-roll re-arms the barrier** (✅ `JackTransportEngine::CycleEnd`) — the
  scrub case, handled.
- And carry Ardour's `LocateTransportDisposition { MustRoll, MustStop, RollIfAppropriate }`
  in the seek request, so "seek while playing" is stated rather than inferred.

This is the missing half of the seek contract, and it is the thing that will bite the moment
the archival client seeks into remote media (see also the 16 ms target and the 21.5–47 ms
Firefox 154 numbers in §5 — the barrier is what turns those into a policy instead of a race).

### 2. **Swap the worker `setTimeout` tick host for `Atomics.wait`, and hold a Web Lock.**

Two source-confirmed facts, both new:
- ✅ `Atomics.wait` in a dedicated worker is **not a task**. V8 converts the timeout to
  nanoseconds and waits on an OS condvar (`node->cond_.WaitFor(...)`), while Blink's
  freezing/pausing is `SetVoteToEnable(false)` **over task queues** — it prevents selecting
  new tasks and never suspends the thread. A worker already inside one long-running
  `Atomics.wait` loop is structurally out of the throttler's reach. It also gets sub-ms
  expressible timeouts, where our `setTimeout` rides Blink's sequence manager and — ✅ new
  — an **8 ms floor on Windows battery power** (`kMinTimerIntervalLowResMs = 8`).
- ✅ But 📄 *"Any dedicated worker agent whose… owning document is non-null and frozen must
  become blocked"* — so pair it with the freeze exemption. Chrome's opt-out list includes
  pages that *"Hold a Web Lock"*, and the source is unambiguous:
  `enum class CannotFreezeReason { … kHoldingWebLock, … }` is a **standalone** reason (the
  "blocking" qualifier attaches only to IndexedDB), and Web Locks callbacks run on the
  **unpausable** task queue even in a worker.

Cost: both need COOP/COEP for `SharedArrayBuffer` — which ✅ also buys us Safari's fine
`performance.now()` (1 ms → 20 µs) in the same switch. That is three of our measured
weaknesses closed by one header pair. ⚠️ The throttle-immunity argument is structural, not
measured — it deserves a rig arm alongside arm BG.

### 3. **Emit time-ranged provenance, on three carriers, with TEI's `@locus` in the model.**

The first pass found C2PA has `TemporalRange` and nobody wires it. This pass got the field
names, found that **an action can carry a region** (`Action.changes`), found that **any
assertion can** (`assertion-metadata-map.regionOfInterest`), found the **only confidence
number in a shipping media standard** (`reviewRatings`, 1–5, with `ingredient.possiblyModified`),
and found that **a browser can sign it** (`@contentauth/c2pa-web` `Builder.sign()`, or
`@trustnxt/c2pa-ts` in pure TS with `c2pa.hash.bmff.v3` over fragmented MP4 — our container).

Three carriers, because no single one reaches everywhere:
- **Delivered artefact** → C2PA: `Action{action: "c2pa.filtered", digitalSourceType:
  "…/algorithmicallyEnhanced" or "…/compositeWithTrainedAlgorithmicMedia", changes:
  [{region:[{type:"temporal", time:{type:"npt", start, end}}]}]}`. Half-open, same as ours.
- **Live lane** → `EXT-X-DATERANGE` with `X-` reverse-DNS attributes; hls.js already turns
  these into metadata TextTrack cues (`enableDateRangeMetadataCues`, default on).
- **Edit document** → OTIO's namespaced per-clip `metadata` dict, since OTIO's schema has
  nothing and 📄 explicitly sanctions namespaced extension.

And steal one **data-model** idea that no AV standard has: TEI's `@locus`, which separates
*uncertainty about the boundary* from *uncertainty about the identity*. Our `caps.tier` /
`method` / `evidence` / `deviates` currently conflate them.

**Honourable mentions.** Ardour's `resolve_diff()` — state chase as a **minimal diff between
two snapshots** rather than a full re-assert — is the cheapest possible upgrade to
`assertState()` and would make backward seek cheap. rrweb's proposed
checkpoint-every-50-snapshots is the bounded-cost tier for `reduce`. Ableton Link's
`GhostXForm` **slope** term handles a clock running at the wrong *rate*, which our re-anchor
does not. GStreamer's seek **flags** (`ACCURATE` vs `KEY_UNIT`, `SNAP_BEFORE/AFTER/NEAREST`)
would let `seek()` take an intent instead of only a time. `getOutputTimestamp()` regression
for a real audio↔wall drift map (arm E's open caveat). Syncplay's and shairport's correction
bands as external validation of our ±20 ms.

---

## 8. Adversarial: what refutes the first pass's "three things nobody does"

### 8.1 `reduce(prefix ≤ t)` + `assertState` — **substantially refuted as an idea; narrowly survives as a library contract**

The first pass claimed *"confidence: high"* that no surveyed system makes this a typed
library contract, and that *"the nearest published relative is event-sourcing's left fold,
which nobody has connected to a media transport."* Both halves are wrong.

**Prior art #1 — DAWs have shipped this since the 1990s, on by default, and named it.**
- 📄 Steinberg (Cubase/Nuendo): *"Chase is a function that makes sure your MIDI instruments
  sound as they should when you locate to a new position and start playback"* by
  *"transmitting a number of MIDI messages to your instruments each time that you move to a
  new position in the project"*; *"the Chase Events settings determine which event types are
  chased"* — **a per-kind chase policy, in a preferences dialog.**
  https://archive.steinberg.help/nuendo/v11/en/cubase_nuendo/topics/playback/playback_chase_c.html
- 📄 Cakewalk names it **Patch/Controller Searchback** (Options > Project > MIDI Out).
- ✅ Ardour implements it as a real prefix scan with a per-controller policy table and a
  never-set sentinel, plus `resolve_diff()` (§1b). **This is `reduce(prefix ≤ t)` →
  `assertState()`, in C++, with a better reducer than ours.**

**Prior art #2 — lighting consoles do it, and they use our word.**
- 📄 ETC Eos is a *tracking* console: *"Any changes in this new cue will also track forward
  into subsequent cues until a move instruction is encountered."* A cue's effective state is
  therefore **the fold of the cue-list prefix**.
- 📄 And out-of-sequence recall is the assert: *"Generally, when an out-of-sequence cue is
  executed, the entire contents of the cue (move instructions **and** tracked values) will be
  played back."* Their worked example is our test case — a channel manually set to 50 % is
  faded back to the tracked value on `[Go To Cue] 5`. The console's own flag for forcing this
  is called **Assert**.
  https://www.etcconnect.com/WebDocs/Controls/EosFamilyOnlineHelp/en/Content/13_Cue_Playback/[Go_To_Cue].htm

**Prior art #3 — the same fold, with a playhead, in the browser, today.**
- ✅ rrweb's replayer rebuilds from the last full snapshot and applies incrementals forward,
  with play/pause/seek/speed. Its issue #6 is our exact complexity argument: 📄 *"with 100
  snapshots… playing at the 99th snapshot's time offset [requires] rebuilding 99 snapshots
  synchronously which will block everything"*, fixed by *"cache the result of rebuilding
  every 50 snapshots."* The first pass listed rrweb under "pure trace" and never looked at
  its seek.
- ✅ AWS IVS ships the fold keyed by playhead (`chatMsgTs <= currentTimestamp`), and Twitch
  ships a **paginated op-log query keyed by playhead offset** (§3d).
- 📄 Event sourcing names the pattern (*"a projection is nothing else than a left-fold over
  the sequence of events"*) and names the optimisation (snapshot + replay-since). Datomic's
  `d/as-of` takes a **`java.util.Date`**.

**What actually survives, stated honestly:**
1. **Heterogeneity.** Chase is MIDI-only. Eos tracking is DMX-only. rrweb is DOM-only. IVS is
   chat-only. Nobody folds a *heterogeneous* log through *per-kind* reducers registered by a
   library.
2. **The proof.** Nobody publishes `reduce(≤t) ≡ play(0→t)` as a property test at 100 seeds,
   nor the sharpened continuous form `state(t) = f(prefix(≤t), successor(s))`.
3. **Composition through nesting** — chase does not compose through a nested transport with a
   rate lattice.
4. **Cost.** Ardour scans from zero; rrweb wants checkpoints and does not have them; Motion
   Canvas is O(t). Our per-kind O(1) reducers plus the `sampleAt` cursor is the best cost
   model in the comparison — but that is a *performance* claim, not a novelty claim.

**Rewrite the claim as: "a heterogeneous, per-kind, property-tested, nesting-composable
instance of a thirty-year-old idea that two industries shipped and the web forgot."** That is
still worth having built. It is not new.

### 8.2 The caps-driven adapter registry — **refuted for the mechanism, survives for the composition**

- 🔥 **`IMFRateSupport::IsRateSupported` is `request()` verbatim.** 📄 *"Call the
  IMFRateSupport::IsRateSupported method to retrieve the supported rate nearest to a
  requested playback rate. If the exact playback rate is not supported, the nearest supported
  rate is received in `actualRate`."* Plus `GetFastestRate`/`GetSlowestRate` per direction
  and per thinning mode — **a rate lattice with honest degradation, in Windows since 2005.**
  https://learn.microsoft.com/en-us/windows/win32/medfound/how-to-determine-supported-rates
- 🔥 **AVFoundation publishes the lattice as capability flags on the asset**:
  `canPlayFastForward`, `canPlaySlowForward` (0–1×), `canPlayReverse` (−1×),
  `canPlaySlowReverse`, `canPlayFastReverse` — plus
  `seek(to:toleranceBefore:toleranceAfter:)`, where `.zero` tolerance is an explicit
  accuracy-versus-cost contract.
- 🔥 **GStreamer is the fullest refutation** — and it literally calls them *caps*.
  `GST_QUERY_SEEKING` 📄 reports *"a boolean indicating if seeking is possible, the format
  for the seek operation, and segment_start and segment_end values defining the seekable
  range"* — capability **queried before use**, exactly our `registerAdapter` check moved to
  runtime. `gst_element_seek(rate, …)` takes the intent in flags: `ACCURATE`
  (📄 *"this might be slower"*) vs `KEY_UNIT`, `SNAP_BEFORE/AFTER/NEAREST`, `SEGMENT`,
  `TRICKMODE`, `INSTANT_RATE_CHANGE`, and 📄 *"Negative values means backwards playback."*
- 🔥 **LV2 is "unbacked claims caught at registration"**: a plugin declares
  `requiredFeature` vs `optionalFeature`, and a host **must not load** it if a required
  feature is unsupported.
- 📄 **`MediaCapabilities.decodingInfo()`** is the web's version and it reports degradation:
  `supported`, `smooth` (*"able to decode… at the indicated framerate without dropping
  frames"*), `powerEfficient` — 📄 the spec's stated purpose is to move *"beyond merely
  confirming technical support"*. We do not call it.
- ✅ **MIDI-CI Property Exchange** is a full negotiation protocol with a mandatory
  `ResourceList`, peer-declared chunk sizing, subscription-based invalidation, and a
  Profile reply that separates *supported-and-enabled* from *supported-but-disabled* (§1f) —
  an axis our `caps` lacks.

**What survives:** not "capabilities drive behaviour" — that is table stakes in native media
— but the **composition**: a `rates` lattice that composes *multiplicatively through
nesting* with log-nearest degradation **reported through the nest**, `catchUp` deriving the
freeze policy, `continuous`/`interpolate`/`neighbourhood` driving `sampleAt`, and
`followsTransport` producing `adapter.transport(state)`, all from one declaration checked at
registration. Nobody found has the nesting composition. **Downgrade the claim from
"confidence: high for the shape" to "the shape is standard practice; the composition through
nesting is ours."**

### 8.3 Evidence/provenance as a timeline axis — **refuted in the editor, survives at the door**

The first pass said *"confidence: high that no shipped audience-facing equivalent exists."*
Half of that is now wrong.

**Refutation — Adobe ships it, in the timeline UI.** Premiere's Generative Extend invents up
to 2 s of video / 10 s of audio *in the middle of a timeline*, and 📄 the generated span is
marked with an AI-generated marker on the clip highlighting the generated frames; the
sequence shows a Content Credentials stamp; original and generated are nested into one clip.
📄 Adobe's own framing: *"clips are marked with Content Credentials so viewers know where AI
was used."*
https://helpx.adobe.com/premiere/desktop/edit-projects/edit-with-generative-ai/generative-extend-overview.html

**Complication — the older, better prior art is in charting.** The reconstructed-versus-
instrumental convention (grey uncertainty band for the proxy reconstruction, solid line for
the instrumental record, one time axis) is a decades-old published norm in paleoclimate, and
a real methodological literature exists on how to read it (⚠️ with the standard caveat that
the bands are *pointwise*, not joint, confidence intervals). *"Evidence as an axis of a time
series"* is not new; **evidence as an axis of a media transport** is where the negative holds.

**What survives, and it is the sharper claim:**
- ⚠️ **The exported credential collapses.** Premiere's manifest is per-file / per-clip;
  nothing in Adobe's documentation states a time or frame range is written — despite
  `Action.changes` existing, and despite Adobe co-chairing C2PA. (⚠️ Worth confirming with
  `c2patool` against a real Generative Extend export before publishing as fact.)
- ✅ And the ecosystem cannot receive it anyway: **zero temporal ROI in the wild, the Verify
  UI has no scrubber, the conformance suite tests nothing** (§4b). The official
  partially-AI-audio conformance vector emits `c2pa.dubbed` with **no `changes` at all**.
- 📄 Everyone else is whole-file: SynthID watermarks *"an AI-generated image (or video
  segment)"* with no temporal metadata; YouTube's labels are per-video and its camera label
  is voided by *"any edits to sounds or visuals"*; TikTok and Meta label per post; JPEG Trust
  has zero occurrences of `temporal`. **Descript is the cleanest negative in either survey**:
  a product whose entire UI is a time-indexed transcript, which knows exactly which words it
  regenerated, and records that nowhere in the delivered file.

**Rewrite the claim as: "the marking exists inside one editor and dies at export; nobody
delivers time-ranged provenance to an audience, and the standard that could is untested and
unrendered."** That is a weaker novelty claim and a *stronger* reason to build it — the
problem is now demonstrably real in a shipping product, not hypothetical.

**One thing the first pass claimed that gets *stronger*, not weaker.** Drift as a
subscribable channel: nothing in this pass exposes per-fire scheduling error as an API
either. GStreamer has QoS messages, JACK has `xrun` callbacks — both are *fault* signals, not
a continuous measurement stream. Keep that one at moderate-to-high.

---

## 9. What would a serious competitor build?

They would start where we did not: on **Mediabunny plus WebCodecs plus a WebGPU compositor**
(the substrate is now settled — Remotion killed its own parser for it), and they would put
the whole engine behind **one clock they own**, exactly as FreeCut advertises and MasterSelects
declines to discuss. Then they would take the three things nobody in the browser has bothered
to do and that are all cheap: a **two-phase seek** with a readiness barrier and a fail-open
timeout (JACK, 1995); a **leaderless shared timeline** — `(position, time, rate)` with a drift
*slope*, quantised phase, TTL-based leave and polite-versus-rude re-anchor (Ableton Link,
2016) — corrected by **playback rate against a PTP-or-`EXT-X-PROGRAM-DATE-TIME` anchor** in
2 ms/50 ms bands rather than by seeking (AirPlay 2, Sonos, Syncplay), which would immediately
beat both shipping shared playheads in the industry, since Resolve and Unreal both sync the
*event* and both admit it drifts; and **time-ranged provenance that survives export**, since
C2PA's `Action.changes` + `regionOfInterest` + `reviewRatings` is finished, signable from the
browser today, and used by literally nobody. They would anchor comments **container-relative**
(OTIO markers, Peritext, Descript-on-words) rather than at absolute offsets, so annotation
survives a re-edit — the one thing every review tool in the market gets wrong and documents as
a known limitation. And they would publish a **measurement** of frame-accuracy against the
Firefox-154 numbers (21.5 ms MP4 / 47.0 ms MSE, 16 ms target), because three products claim
frame accuracy in the browser right now and not one has published a single number. The moat is
not the scheduler and it is not the compositor. It is the **seek contract plus the evidence
axis plus the numbers** — and all three are currently unoccupied.

---

## 10. Corrections to the first pass and to this brief

- ⚠️ **`GPUExternalTexture` one-frame validity is an `HTMLVideoElement` rule, not a WebCodecs
  rule.** 📄 *"GPUExternalTexture objects with a VideoFrame source expire only when the
  VideoFrame is closed."* A WebCodecs-fed WebGPU compositor can hold frames across passes.
- ⚠️ **`#xywh=` is Media Fragments URI, not a WebVTT cue setting.** WebVTT's settings are
  `vertical`, `line`, `position`, `size`, `align`, `region`.
- ⚠️ **`OfflineAudioContext` has no determinism guarantee** — the spec documents the opposite
  (*"differences in DSP architecture, resampling strategies and rounding trade-offs…
  compiler flags… ARM vs x86"*). The first pass's steal #2 (offline render) is still right,
  but "deterministic" must mean *our* determinism, not the platform's. It is also **not
  exposed in Workers** (`[Exposed=Window]`).
- ⚠️ **JACK's sync timeout: the header says 2 s, jack2 ships 10 s.**
- ⚠️ **MIDI 2.0's "three pillars" are out of date** — Protocol Negotiation is deprecated
  since MIDI-CI 1.2; the third is now Process Inquiry.
- ⚠️ **AAF was never SMPTE-standardised** (MXF was), and its Operational Pattern registry has
  one entry.
- ⚠️ **MISB ST 0601 has no synthetic/simulated flag** — Tag 47's bits are Laser Range /
  Auto-Track / IR Polarity / Icing / Slant Range / Image Invalid, with two spare.
- ⚠️ **`MediaStreamTrackGenerator` was renamed `VideoTrackGenerator`**, `[Exposed=DedicatedWorker]`,
  with 📄 *"no WG consensus on whether or not it should be exposed on Window"*; Chrome ships
  the old name, Safari 18 the new one, Firefox neither.
- ⚠️ **`navigator.scheduling.isInputPending()` is effectively deprecated** — MDN: *"may be a
  candidate for removal… superseded by… `yield()`."*
- ⚠️ **`WebTransport.incomingHighWaterMark` no longer exists** — renamed
  `incomingMaxBufferedDatagrams`.
- ⚠️ **IPTC `minorHumanEdits` is retired** (→ `humanEdits`); do not emit it.
- ⚠️ **The first pass filed rrweb under "pure trace" and never examined its seek.** It is a
  checkpointed prefix fold with a playhead — the closest browser relative to our contract.
- ⚠️ Unverified and flagged: Premiere's proxy verbs (helpx timed out on every attempt),
  Premiere's Generative Extend export granularity (needs a `c2patool` check), and the
  `Atomics.wait` throttle-immunity argument (structural, not measured).

---

## 11. Sources

Primary sources read directly (source code, spec text, or reference manual), 2026-08-28:
OTIO `rationalTime.h` / `timeRange.h` / `timeTransform.h` / `clip.h` + issues #190/#468/#807/#1742 ·
Ardour `transport_fsm.h` / `session_export.cc` / `disk_reader.cc` / `midi_state_tracker.{h,cc}` /
`rc_configuration_vars.inc.h` · jack2 `transport.h` / `types.h` / `JackTransportEngine.cpp` ·
Ableton Link `Link.hpp` / `GhostXForm.hpp` / `Timeline.hpp` / `Sessions.hpp` / `PeerGateway.hpp` /
TEST-PLAN.md · REAPER User Guide v7.79 · DaVinci Resolve 20 Reference Manual ·
AMWA MS-01 (AAF) + AS-01 · OMF 2.1 · AES31-3 (secondary) · FCPXML v1.8 DTD ·
MIDI M2-116-U / M2-104-UM / M2-103-UM / M2-101-UM · W3C Web Audio (incl. `#priv-sec`) ·
Chromium `audio_context.cc`, `time_win.cc`, `features.h`, `worker_scheduler_impl.cc`,
`cannot_freeze_reason.h`, `limits.h` · V8 `futex-emulation.cc` · WebKit `Performance.cpp` ·
W3C WebCodecs / Media Source / Media Capabilities · WICG video-rvfc · WHATWG HTML ·
GStreamer `gstevent.h` / `gstquery.h` / design/seeking · Microsoft Media Foundation rate-control docs ·
Yjs `Snapshot.js` · c2pa-rs `region_of_interest.rs` / `actions.rs` / `soft_binding.rs` +
`@contentauth/c2pa-types` · C2PA 2.3 spec §18 · IPTC digitalsourcetype CV · TEI P5
`att.global.responsibility` / `certainty` / `att.timed` · RFC 8216 · W3C Media Fragments /
Web Annotation · ETC Eos online help · Steinberg Nuendo 11 help · Syncplay protocol +
`constants.py`/`client.py`/`protocols.py` · shairport-sync README + `shairport-sync.conf` ·
Mediabunny docs · Remotion Mediabunny post · Mozilla bug 2049301 · Flip (Ohm Studio) docs ·
Unreal Multi-User Editing docs · Frame.io v2/v4 API refs · `vimeo/openapi` `api.yaml`.

Everything else is cited inline at point of use. Search and fetch transcripts are not
retained; every non-obvious claim above carries its URL.
