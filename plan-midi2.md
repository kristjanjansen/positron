# plan-midi2: MIDI 2.0, microtonality, and whether any of it reaches this project (2026-09-20)

Written because of two questions, in this order:

> *"investigate midi2, browser and our setup to test/similate it (via cf udp?) osc replacer?"*

> *"Does midi2 has hicrotonal/arythmic features (there also some midi1exte sion for exoression?)"*

The second one is answered first, because it is the one that was asked twice and
because it is the one with a real answer.

Companion to `plan-controller.md` (the 7-bit ceiling, and the SuperCollider voice
that escapes it), `plan-circuit-model12.md` §6.4 (Web MIDI and the one line that
blocks SysEx), `proto/osc/NOTES.md` (the codec, the atomicity argument and the
transport tables), `plan-ws.md` and `demo/shell/wire.mjs` (the envelope), and
`plan-nodes.md` (the tagging convention below).

Every claim is tagged **MEASURED** (a command was run here today and its output
is quoted), **DOCUMENTED** (a spec, vendor or project says so, with a URL and a
date), **ESTIMATED** (arithmetic on measured values, and the arithmetic is
shown), or **UNCONFIRMED** (nobody here has checked).

---

## 0. The short answer

**Yes to microtonal, with a sharp caveat. No to arrhythmic, with no caveat at
all. No to a browser, today, measured rather than read. No to Cloudflare UDP,
re-checked rather than repeated. And it is not an OSC replacement, it is an OSC
competitor that loses on the one axis this project has already built around.**

Five sentences, each expanded below:

1. **MIDI 2.0 has genuine microtonal machinery** and it is the best of the three
   things that exist: per-note pitch bend at 32 bits, per-note controllers, and
   a note-on that can carry a fractional pitch in the note message itself. But
   what the spec guarantees and what a device does are different questions, and
   the spec is deliberately a menu.
2. **The MIDI 1.0 extensions he half-remembered are real and he was right about
   both of them.** MPE for per-note expression, and the MIDI Tuning Standard for
   scales. MPE is the one that is actually implemented in the world.
3. **"Arrhythmic" is not a thing MIDI has in either version.** MIDI 2.0 adds
   jitter reduction timestamps, which are about a message arriving when the
   sender meant it to, not about time that is not a grid. Anything to do with
   non-metric time in this project is the timeline's job and already is.
4. 🔴 **No shipping browser exposes MIDI 2.0. MEASURED TODAY, both engines.**
   Chrome 153 has exactly eight MIDI globals and every one of them is MIDI 1.0;
   its permission table knows `midi` and `midiSysex` and refuses `midi2` and
   `ump` by name. Safari 26.6.2 has no Web MIDI at all, not even 1.0.
5. **The transport question has already been answered in this repo and the
   answer has not changed.** Our own WebSocket relay is the thing to beat, and
   a MIDI 2.0 stream over it is cheap in bytes and expensive in MESSAGES, which
   is the one budget that bites silently. "CF UDP" is a dead end for a reason
   that has nothing to do with Cloudflare: **a browser cannot open a UDP socket
   at all.**

🔴 **And the finding that decides the whole thing: there is nothing in this
project that could hear per-note pitch if we sent it.** The board's one
instrument is Yoshimi, reached by writing raw MIDI 1.0 bytes into `snd-virmidi`
(`rig/board/jacksynth.mjs:803`, MEASURED by reading it), and `note.on` on the
wire carries `{note, vel, channel}` as integers with no pitch field of any kind
(`rig/board/board.mjs:742`). The only voices here that could take a fractional
pitch are our own AudioWorklet and SuperCollider ones, **and those already take
floats**, so per-note pitch costs one field on an existing message and needs no
MIDI 2.0, no UMP and no new transport.

So the smallest experiment is not "implement UMP". It is **one float on
`note.on`, honoured by a voice that already takes floats**, which answers the
question MIDI 2.0 is being considered for at a cost of about a day. §7.

---

## 1. The microtonal question, answered first

### 1.1 There are three roads to a pitch that is not a semitone, and they are not alternatives

They do different things and a real microtonal setup usually wants two of them.

| | what it changes | granularity | what it is |
|---|---|---|---|
| **a tuning table** | what note number 60 MEANS | the whole scale, set once | MIDI Tuning Standard (MTS), or a synth's own scale file |
| **a bend** | where a sounding note SITS relative to its own pitch | per note, continuously | MPE on MIDI 1.0, per-note pitch bend on MIDI 2.0 |
| **a fractional note number** | what pitch a note STARTS at | per note, once, at the note on | MIDI 2.0's Pitch 7.9 note attribute. MIDI 1.0 has no equivalent |

⚠️ **The distinction that gets lost and matters here**: a tuning table is a
statement about a SCALE and a bend is a statement about a PERFORMANCE. Playing
in 19-tone equal temperament wants the first. Playing a glide, a vibrato that
is not the synth's own, or two voices drifting against each other wants the
second. MIDI 2.0 is the only one of the three that also offers the third, which
is "this note begins 31 cents flat and then behaves normally".

### 1.2 MIDI 2.0: what the spec has, and what a receiver may ignore

**DOCUMENTED**, from the Universal MIDI Packet and MIDI 2.0 Protocol
specification (MMA and AMEI; v1.0 2020, v1.1 2023). The relevant messages are
all MIDI 2.0 Channel Voice messages, which are message type 4 and 64 bits wide:

| message | what it carries | resolution |
|---|---|---|
| **Note On** with attribute type 3, "Pitch 7.9" | a 16-bit attribute where 7 bits are a note number and 9 bits are a fraction of a semitone | **1/512 semitone = 0.195 cents** |
| **Per-Note Pitch Bend** | 32-bit bend, applied to ONE sounding note | over the default +/-2 semitone range, about **9.3e-8 cents** a step |
| **Registered Per-Note Controller** | an 8-bit index and 32 bits of data, per note | 32 bits |
| **Assignable Per-Note Controller** | the same, in the manufacturer's own space | 32 bits |
| **Registered Controller** and **Assignable Controller** | what MIDI 1.0 calls RPN and NRPN, as ONE message with a bank, an index and 32 bits of data | 32 bits |
| **Control Change** | 32 bits instead of 7 | 32 bits |
| **Note On velocity** | 16 bits instead of 7 | 16 bits |
| **Per-Note Management** | a detach flag and a reset flag for a note's own controllers | n/a |

🔴 **What the spec GUARANTEES is much less than that list suggests, and this is
the caveat in §0.** MIDI 2.0 is built around negotiation rather than around a
mandatory feature set: two devices agree what they will speak using MIDI-CI
(§3.2), a device declares what it supports, and **a receiver may ignore any
message it does not implement**. There is no conformance level that says "a
MIDI 2.0 device does per-note pitch". A device can be entirely honest in
calling itself MIDI 2.0 while implementing 16-bit velocity and nothing else in
the table above.

⚠️ **So "MIDI 2.0 support" on a product page is not an answer to "can it do
per-note pitch".** It is the question restated. The thing to ask a device is
which of these messages it implements, and MIDI-CI exists precisely because
that question needed a machine-readable form.

### 1.3 Tuning in MIDI 2.0 is still MTS, carried inside UMP

**DOCUMENTED.** UMP did not gain a native tuning table message. What it gained
in v1.1 is **Flex Data**, which carries tempo, time signature, metronome, key
signature, chord name and text, and **not tuning**. Scales and tuning tables
still go over the MIDI Tuning Standard's SysEx, which UMP carries as SysEx7 or
SysEx8 packets.

⇒ **Anything that wants a scale in MIDI 2.0 needs MTS**, which means the MIDI
1.0 extension from 1992 is still the load-bearing part of a microtonal setup in
2026. That is worth saying plainly because it is counter-intuitive.

### 1.4 MPE, which is the one he half-remembered and was right about

**DOCUMENTED.** MIDI Polyphonic Expression, adopted by the MIDI Manufacturers
Association as **MPE 1.0** and published as part of the MIDI 1.0 family. It is
not a new protocol. It is a **convention about channel allocation**, written
down and then adopted, which is why it works on hardware built before it
existed.

How it works, because the mechanism is the whole thing:

- A **zone** has one **master channel** and a set of **member channels**. The
  Lower Zone's master is channel 1 and its members run upward from 2; the Upper
  Zone's master is channel 16 and its members run downward.
- **Every sounding note gets its own member channel.** So a per-channel pitch
  bend, which MIDI 1.0 has had since 1983, becomes a per-NOTE pitch bend.
- Three dimensions per note: **pitch bend** (the slide), **CC 74** (the timbre
  axis), and **channel pressure** (the press). Messages on the master channel
  apply to the whole zone.
- The default pitch bend range on a member channel is **+/-48 semitones**,
  which is unusually wide on purpose so a slide can cross octaves.

🔴 **Its limits are structural and they are the reason MIDI 2.0 exists.**

- **At most 15 notes at once in one zone**, because there are 15 member
  channels. Use both zones and each gets fewer.
- **Channel rotation means note stealing.** When the channels run out, a new
  note takes a channel that is still sounding, and whatever bend that channel
  carried now belongs to the wrong note.
- **The resolution is 14 bits over 96 semitones.** MEASURED arithmetic:
  9600 cents over 16,384 steps is **0.586 cents a step**. That is under the
  threshold for a melodic interval and it is NOT obviously under the threshold
  for beating between two sustained tones, which is what a drone piece is made
  of. The narrower the bend range a synth is set to, the finer the steps: at
  +/-2 semitones it is 0.024 cents.
- **A receiver has to be in MPE mode.** A synth that is not treats fifteen
  channels as fifteen parts, which is a different and very audible wrong thing.

⚠️ **And MPE is the one in this list that is actually implemented in the
world.** Every commercial expressive controller speaks it, most soft synths
accept it, and it needs nothing from the transport that MIDI 1.0 does not
already have. That is the whole argument for reaching for it first.

### 1.5 MTS, and why almost nothing implements it

**DOCUMENTED.** The MIDI Tuning Standard, adopted by the MMA in 1992 as an
extension to MIDI 1.0 and delivered as Universal System Exclusive. Two shapes
that matter:

- **Bulk Tuning Dump**, non real time: all 128 note numbers, each as three
  bytes, a semitone plus a **14-bit fraction**. MEASURED arithmetic: 100 cents
  over 16,384 steps is **0.0061 cents a step**, which is finer than anything
  anybody can hear by two orders of magnitude.
- **Single Note Tuning Change**, real time: retune individual notes while the
  instrument is playing. Later additions cover scale and octave tuning in one
  and two byte forms.

🔴 **The problem with MTS is not the spec, it is adoption.** It needs SysEx,
every manufacturer's implementation is optional, and a great many synths that
advertise microtonality do it through their own scale file format instead. The
microtonal community's actual answer is **MTS-ESP by ODDSound**, which is not
MIDI at all: it is a shared-memory protocol between plugins in one host, so a
master plugin retunes every client plugin live. That it exists, and that it is
what people use, is the clearest available statement about how far MTS got.

⚠️ **For this project MTS has a specific blocker that is already written
down.** `demo/shell/midi.mjs:57` and `demo/shell/hardware.mjs:115` both pass
`{sysex: false}`, and `plan-circuit-model12.md` §6.4 already records that every
SysEx path is therefore closed. **MTS is a SysEx feature**, so retuning
anything from a positron page needs the larger permission before it needs
anything else.

### 1.6 Standard, extension, or convention

Asked for explicitly, so answered explicitly.

| | what it is |
|---|---|
| **MIDI 1.0 channel pitch bend** | **the standard.** In the core specification since 1983, one bend per channel, 14 bits |
| **MPE** | **an adopted extension, and before that a convention.** It began as a way several manufacturers happened to allocate channels, and the MMA wrote it down and adopted it as MPE 1.0. Nothing in it is a new message |
| **"pitch bend per channel", pre-MPE** | **only a convention**, and it still is where it is used without the zone structure. It has no master channel, no declared bend range and no way to say "I am doing this" |
| **MTS** | **an adopted extension** to MIDI 1.0, 1992, delivered as Universal SysEx. A real MMA specification, optional to implement |
| **MTS-ESP** | **one vendor's protocol**, not MIDI, not adopted by anybody, and the de facto answer |
| **MIDI 2.0 per-note pitch and per-note controllers** | **the standard**, in the core MIDI 2.0 protocol. And optional to implement, which is the caveat in §1.2 |

### 1.7 The resolution table, arithmetic shown

MEASURED arithmetic, `cents = range_in_semitones * 100 / 2^bits`:

| | bits | over | cents a step |
|---|---:|---|---:|
| MIDI 1.0 channel pitch bend, default range | 14 | +/-2 semitones | **0.0244** |
| MPE member channel, default range | 14 | +/-48 semitones | **0.5859** |
| MIDI 2.0 per-note pitch bend, default range | 32 | +/-2 semitones | **9.3e-8** |
| MTS single note tuning | 14 | one semitone | **0.0061** |
| UMP Pitch 7.9 note attribute | 9 | one semitone | **0.1953** |
| a 7-bit CC over a ten-octave cutoff sweep | 7 | 12,000 cents | **93.8** |
| a 32-bit CC over the same sweep | 32 | 12,000 cents | **2.8e-6** |

⚠️ **Read the bottom two rows together, because they are the honest picture.**
The pitch rows are all fine. **0.586 cents is the worst of them and it is still
under what a listener will call out of tune.** The row that is not fine is the
7-bit controller, and that has nothing to do with pitch: it is `plan-controller`
§7's *"Seven bits, audibly"* and it is a timbre problem. So the resolution
argument for MIDI 2.0 is real and it is an argument about FILTERS, not about
tuning.

### 1.8 The part that decides it for this project

🔴 **There is nothing here that could hear any of it.** §5.5. The board writes
three MIDI 1.0 bytes into a MIDI 1.0 device, `note.on` carries integers, and
the only voices that take a float are ones we wrote, which do not need MIDI at
all. So the microtonal answer for positron is:

- **Today, with no new technology**: a float on `note.on`, honoured by
  `moog.mjs` or a SuperCollider voice. Unlimited resolution, no spec, no
  permission, no transport change.
- **If a hardware synth is ever the target**: MPE first, because it is MIDI 1.0
  and it already reaches everything, and because the loopback in §4.4 measured
  two of its three dimensions round-tripping through a browser today.
- **MIDI 2.0**: only when there is a device on the desk that implements the
  per-note messages, and only after asking it which ones.

---

## 2. The arrhythmic question, answered plainly

### 2.1 MIDI has no model of time that is not a grid, in either version

**And MIDI 2.0 changes essentially nothing here.** Stated plainly because that
is what was asked for.

What MIDI carries is EVENTS. A note on happens when its bytes arrive. There is
no field on a note that says when it should happen, in either MIDI 1.0 or MIDI
2.0's channel voice messages. Timing is entirely a property of when the sender
chose to send.

What MIDI has ABOUT time is a small, old, metrical set:

- **MIDI Clock**: 24 pulses per quarter note, a bare tick with no number on it.
  It says "advance", not "we are at beat 12".
- **Song Position Pointer**: a position in sixteenth notes.
- **MIDI Time Code**: hours, minutes, seconds and frames, borrowed from SMPTE,
  which is wall clock rather than musical time.

🔴 **Every one of those is a metric grid.** There is nothing in MIDI that
expresses rubato, a fermata, a free passage, a cue, or "when the other player
gets there". A sequencer that plays rubato does so by deciding when to send
bytes; the protocol never knows.

### 2.2 JR Timestamps are jitter reduction, not rubato

**DOCUMENTED.** The one genuinely new timing mechanism in MIDI 2.0 is the
**Jitter Reduction** pair in UMP's Utility messages: **JR Clock**, which a
sender emits periodically so a receiver can track its clock, and **JR
Timestamp**, which stamps the messages that follow it.

- The value is 16 bits at **1/31250 of a second**, so **32 microseconds a
  tick**, and it wraps about every **2.1 seconds**.
- What it is FOR: a sender that knows a note was struck 4 ms ago can say so,
  and a receiver holding a small buffer can place it correctly instead of
  playing it when it happened to arrive. It converts jitter into a fixed small
  latency, which is the same trade OSC's time tags make and which
  `proto/osc/NOTES.md` §7 already describes in those words.

⚠️ **Three things it is not.**

1. **It is not a position.** It says "this is 400 microseconds after the last
   stamp", not "this is at bar 5 beat 2". The wrap at 2.1 seconds makes that
   explicit: it cannot address anything further away than that.
2. **It does not survive our transport.** A jitter reduction scheme needs the
   sender and the receiver to share a clock. `proto/osc/NOTES.md` §7.3 already
   measured the equivalent for OSC time tags: *"On a LAN they do (PTP/NTP to
   microseconds); across CF anycast they do not, and the tag degrades to a
   sequence hint."* The relay's round trip is 27 to 38 ms at p50, which is
   three orders of magnitude above a JR tick.
3. **It is not a rhythmic model.** A timestamp is a correction to WHEN a thing
   arrives. Rubato is a statement about what time IS, and no MIDI message has
   ever carried one.

⚠️ **And a browser cannot even measure at that scale.** MEASURED in §4.4: Web
MIDI's `timeStamp` inherits Chrome's coarsened clock at 100 microseconds
outside a cross-origin isolated page, which is three JR ticks. So the mechanism
is finer than the instrument available to observe it in a page.

**For completeness**: UMP v1.1 added **Delta Clockstamp** messages, which carry
ticks since the previous event against a declared ticks-per-quarter-note. Those
are for FILES, the MIDI Clip File and SMF2, not for a live stream, and they are
a grid too.

### 2.3 What already carries time here, and it is better

The timeline is this project's answer to the arrhythmic question and it has
been for five generations. A row is `{part, at, in, out, repeat}`, `at` is a
real position rather than a beat, `caps.series` keys a lane, `reduce(prefix <=
t)` answers what state holds at any position, and `proto/osc/NOTES.md` §2
records that an OSC level is a zero-order hold and that inventing a value
between two samples is a claim the sender never made.

⇒ **MIDI 2.0 offers this project nothing on time.** Any non-grid behaviour
positron wants already lives one layer above any MIDI, in a place that can
express it. That is the plain answer asked for, and dressing it up would be the
wrong service.

---

## 3. What MIDI 2.0 actually is

### 3.1 The Universal MIDI Packet

**DOCUMENTED.** UMP is a container, and it is the part of MIDI 2.0 that is
genuinely new engineering rather than a wider field. Every message is one to
four 32-bit words. The first four bits are a **message type** which fixes the
packet's length, and the next four are a **group**, so one UMP stream carries
**16 independent groups of 16 channels**, which is 256 channels where MIDI 1.0
had 16.

The message types that matter:

| type | width | what |
|---:|---|---|
| 0 | 32 bits | **Utility**, which is where JR Clock and JR Timestamp live |
| 1 | 32 bits | System real time and common |
| 2 | 32 bits | **MIDI 1.0 Channel Voice**, verbatim, so a UMP stream can carry old MIDI unchanged |
| 3 | 64 bits | Data, SysEx7 |
| 4 | 64 bits | **MIDI 2.0 Channel Voice**, which is §1.2's whole table |
| 5 | 128 bits | Data, SysEx8 and Mixed Data Set |
| 13 | 128 bits | **Flex Data** (v1.1): tempo, time signature, key signature, chord name, text |
| 15 | 128 bits | **UMP Stream** (v1.1): endpoint discovery and function block naming |

🔴 **Message type 2 is the most important row in that table and it is the least
discussed.** UMP carries MIDI 1.0 losslessly, so UMP is a transport question
and MIDI 2.0 is a protocol question, and **they can be adopted separately**. A
system can move to UMP for the 16 groups and the timestamps while every device
on it still speaks MIDI 1.0. That is what the operating systems have actually
done.

### 3.2 MIDI-CI, Profiles, Property Exchange

**DOCUMENTED.** MIDI Capability Inquiry is how two devices find out what they
can do, and it runs over **MIDI 1.0 Universal SysEx**, which is what makes it
adoptable: it works on a DIN cable. Three things sit on top of it.

- **Protocol Negotiation**: the handshake by which two devices agree to switch
  from MIDI 1.0 to the MIDI 2.0 protocol. Without it a MIDI 2.0 device speaks
  MIDI 1.0, which is why nothing breaks.
- **Profiles**: a named agreement about what the controllers mean. "This is a
  drawbar organ, so controller N is the second drawbar." It is the answer to
  the problem CLAUDE.md records in capitals about Yoshimi: **CC 76 and 77 are
  vibrato rate and depth in General MIDI and FM amplitude and resonance centre
  in the ZynAddSubFX family**, and nothing on the wire says which. A Profile is
  exactly the missing declaration.
- **Property Exchange**: **JSON carried over SysEx**, so a device can hand over
  its patch list, its parameter tree and its current state as data rather than
  as a PDF. This is the part that would replace a hand-written table like
  `plan-circuit-model12.md`'s.

⚠️ **UNCONFIRMED here, and it is the question that decides whether any of this
is real: how many shipping products implement a Profile.** The suspicion from
the outside is "very few", but nobody in this session has counted, and a
suspicion written down as a fact is the thing this repo keeps having to repair.

### 3.3 Resolution, tied to an audible consequence rather than asserted

This project has measurements on both sides of the resolution argument and they
disagree with each other, which is the useful part.

**Where 7 bits does NOT bite.** `PROGRESS.md:490` and
`plan-board-modulation.md:275`: the granular engine sets `lagt = 0.02` and runs
every control through `Lag.kr`, so **it smooths every stepped control change
over 20 ms on purpose** and the file's own line is *"It will not zipper."* A
32-bit controller into a 20 ms lag is 32 bits thrown away at the first node.

**Where it does.** `plan-controller.md` §7: *"128 steps across a wide cutoff
range on a resonant filter can zipper. Yoshimi has no 14-bit cutoff:
controllers 0 to 31 have LSB partners at n+32 and 74 is not one of them."*
`research/uuu-integration-2026-09.md` §3.2 puts the same thing in one line: *"a
filter sweep across 128 steps is audibly stepped"*.

⇒ **The honest statement is conditional.** 7 bits is inaudible where the
receiver smooths and audible where it does not, and which is which is a
property of the instrument rather than of the protocol. So "MIDI 2.0 gives more
resolution" is only an argument about an instrument that (a) does not smooth
and (b) implements 32-bit control change.

⚠️ **Nobody here has measured a Yoshimi filter sweep and called it stepped or
not, and the tool that would is already written and does something else.**
`rig/board/cc-test.mjs` holds a note, moves one controller and measures whether
the **spectral centroid** moved, with a negative control of the same note and
the controller unchanged. That answers *"does this controller reach the
sound"*, which was the load-bearing unknown it was built for. It does not sweep
and it does not look for discontinuities, so *"is 128 steps audible"* is
untouched. 🔴 **And measuring it costs a shared instrument in another
building**: the file's own warning says it starts audio, holds notes and should
be run when somebody says the board is free. ⚠️ Worse, the comparison arm is
not available on that instrument at all, because `plan-controller.md` §7
records that **Yoshimi has no 14-bit cutoff**, so a 7-bit sweep has nothing
finer to be compared against without building the SuperCollider voice first.

Until that is done, **the resolution argument for MIDI 2.0 in this project is
an argument about a defect nobody has heard.**

⚠️ **And 14 bits is already available and already implemented here.**
`demo/shell/cc-adapter.mjs` does 14-bit CC pairs and pitch bend, MEASURED at
16384/16384 exact both ways. **The step from 7 bits to 14 costs one extra
message and no new protocol**; the step from 14 to 32 costs everything in this
document. If stepping is the complaint, 14 bits is the fix that is one
afternoon away, and it is 128 times finer.

---

## 4. Browsers: measured today, not read off a table

This project has a rule that an error string cannot tell "API absent" from "API
blocked", and it once carried a claim that iOS lacked WebTransport that nobody
had checked with `typeof`. So the capability and the outcome are reported
separately here, and the probe was run twice: once with permission refused and
once with it granted over CDP, so a refusal can be told from an absence.

Probe: `midi-probe.mjs` and `midi-probe-safari.mjs`, in this session's
scratchpad, not in the repo.

### 4.1 Chrome 153.0.8010.53, headless, on a `127.0.0.1` secure context

**MEASURED 2026-09-20.**

| question | answer |
|---|---|
| `typeof navigator.requestMIDIAccess` | `function` |
| is it `[native code]`, on `Navigator.prototype` | yes, and yes |
| globals whose name mentions MIDI | `MIDIAccess`, `MIDIConnectionEvent`, `MIDIInput`, `MIDIInputMap`, `MIDIMessageEvent`, `MIDIOutput`, `MIDIOutputMap`, `MIDIPort`. **Eight, all MIDI 1.0** |
| globals whose name mentions `ump` or `universal` | **none** |
| `MIDIAccess.prototype` | `constructor`, `inputs`, `onstatechange`, `outputs`, `sysexEnabled`. **Five members** |
| `MIDIMessageEvent.prototype` | `constructor`, `data`. One field, a `Uint8Array` of MIDI 1.0 bytes |
| `MIDIOutput.prototype` | `constructor`, `send` |
| `WebTransport` / `navigator.usb` / `navigator.serial` / `navigator.hid` | `function` / `object` / `object` / `object` |

🔴 **The negative control is the permission table, and it is the sharpest single
result here.** `Browser.grantPermissions` over CDP accepts `midi` and
`midiSysex` and **refuses `midi2` and `ump` by name**:

```
midi2 -> {"code":-32602,"message":"Unknown permission type: midi2"}
ump   -> {"code":-32602,"message":"Unknown permission type: ump"}
```

A probe that only listed what exists could not tell "I looked in the wrong
place" from "it is not there". A browser refusing a name it does not know can.

⚠️ **And the binary was searched too, which is where the substring rule bit.**
MEASURED, `strings` over the 515 MB Chrome Framework: `UniversalMidiPacket` 0,
`UniversalMIDIPacket` 0, `MIDI2` 0, `Midi2` 0, `midi2` 0, `MIDICI` 0, against
`requestMIDIAccess` 2 and `MIDIAccess` 12. A bare search for `UMP` returns 48
hits and **every one is a false positive**: `QUIC_ZERO_RTT_RESUMPTION_...`,
`DOM_KEY_LOCATION_NUMPAD`, the `UMP4` FOURCC, and a Windows `UMCI` string.
`ump_` returns 130 and they are all `dump_`, `jump_`, `bump_`, `pump_`. That is
CLAUDE.md's own **never guard on `s.includes(<substring>)`** rule arriving
inside a search rather than inside a patch, and it would have produced a
confident wrong answer in either direction.

### 4.2 Safari 26.6.2, driven over `safaridriver` on the same page

**MEASURED 2026-09-20.** User agent `Version/26.6.2 Safari/605.1.15`.

| question | answer |
|---|---|
| `typeof navigator.requestMIDIAccess` | **`undefined`** |
| `'requestMIDIAccess' in Navigator.prototype` | **`false`** |
| globals mentioning MIDI | **none** |
| globals mentioning `ump` or `universal` | **none** |
| `navigator.usb`, `navigator.serial`, `navigator.hid` | **all `undefined`** |
| `WebTransport` | `function` |

So Safari has no Web MIDI 1.0, no Web MIDI 2.0, and **none of the three
userland escape hatches either**: no WebUSB, no WebSerial, no WebHID. On this
engine the only way a page can reach a MIDI device is through a program running
outside the browser. `demo/shell/midi.mjs`'s comment saying *"Safari has none at
all"* is still exactly right, and now it is measured on 26.6.2 rather than
remembered.

⚠️ The `WebTransport: function` line corroborates CLAUDE.md's Safari 26.4 note
from a second direction, and it is the only transport row where Safari is not
the worst option.

### 4.3 The permission, which moved and which this repo has not noticed

🔴 **MEASURED: on Chrome 153, `requestMIDIAccess({sysex: false})` is gated.**
Fresh profile, nothing granted:

```
navigator.permissions.query({name:'midi'})               -> "prompt"
navigator.permissions.query({name:'midi', sysex:true})   -> "prompt"
requestMIDIAccess({sysex:false})  -> NotAllowedError: Permission to use Web MIDI API was not granted.
requestMIDIAccess({sysex:true})   -> NotAllowedError: the same string
```

After `Browser.grantPermissions(['midi','midiSysex'])` both queries read
`granted`, both calls resolve, `sysexEnabled` follows the option, and one input
and one output appear.

⚠️ **Two places in the kit ask for MIDI and both pass `{sysex: false}`**:
`demo/shell/midi.mjs:57` and `demo/shell/hardware.mjs:115`. Both therefore meet
a permission prompt on Chrome today. `midi.mjs` handles it correctly by
accident: its `catch` logs *"MIDI was refused"* and the on-screen keys carry on.
`plan-circuit-model12.md` §6.4 already records that SysEx is the larger
permission and should be a deliberate decision. What it does not record, and
what is measured here, is that **the smaller permission is now a permission
too**, so "turning SysEx on costs a prompt" is no longer the trade. The prompt
is already being paid.

⚠️ **And `demo/shell/caps.mjs:41` probes `'requestMIDIAccess' in navigator`**,
which is a presence test that cannot tell present from present-but-gated. It is
saved by being **soft** (`midi: 'no MIDI here, but the on-screen keys still
work'`, and a soft capability never un-links a row), which is the right design
for exactly this reason. It is worth knowing that the probe answers a narrower
question than its name suggests.

### 4.4 What this machine actually has

**MEASURED**, read through Chrome with permission granted: one input and one
output, both `IAC Driver Bus 1`, `Apple Inc.`, state `connected`. A virtual
loopback bus and no hardware.

✅ **And the loop was actually run rather than assumed.** MEASURED 2026-09-20,
one page opening both ends of the IAC bus and sending four MIDI 1.0 messages:

```
sent 4, received 4, byte identical
  [144, 60, 100]   note on
  [224,  0,  96]   channel pitch bend, MSB 0x60
  [176, 74,  64]   CC 74, which is MPE's timbre dimension
  [128, 60,   0]   note off
first round trip 0.1 ms, sysexEnabled true
```

So **an MPE test rig needs no hardware on this machine**: the three MPE
dimensions are a channel pitch bend, CC 74 and channel pressure, and two of
those just round-tripped. That matters for §7 and it is the cheapest arm
available.

⚠️ **One thing the same run shows by accident, and it bears on §2.** All four
`timeStamp` values came back identical at a resolution of 0.1 ms, because
Chrome coarsens `performance.now` to 100 microseconds outside a cross-origin
isolated page and Web MIDI's `timeStamp` inherits that clock. **A browser
cannot measure MIDI jitter finer than about 100 microseconds** without
`Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` set, which no
page here sets. Any claim about MIDI timing measured in a positron page has
that floor under it. UNCONFIRMED whether isolating a page would take it to the
5 microsecond tier here; not tried.

⚠️ **UNCONFIRMED**: whether CoreMIDI on this machine exposes a UMP endpoint.
macOS has carried UMP in CoreMIDI since macOS 11, but there is no command line
tool that reports it and checking would mean compiling, which this laptop's
management policy makes a thing to ask about first. Not checked, and it does
not change any conclusion here, because no browser can reach it either way.

---

## 5. The transport question, measured against what we already run

### 5.1 The relay, which is the baseline and not "nothing"

Everything below is compared to `workers/relay/src/index.js` as deployed,
because comparing a proposal to nothing is how a proposal wins an argument it
should lose.

**Read from the source today, not remembered:**

| | value | where |
|---|---:|---|
| message roof | 1,024,000 bytes | `MAX_BYTES` |
| sockets per room | 128 | `MAX_SOCKETS` |
| bytes per second per socket | 8 MiB | `BYTES_PER_SEC` |
| **messages per second per socket** | **1,000** | `MSG_PER_SEC` |
| burst | 2,000 | `MSG_BURST` |
| overruns before the socket is closed | 50 | `STRIKES` |

**Measured previously and not re-run** (`plan-ws.md`, `demo/perf-wire.mjs`): the
Durable Object hop costs **+1.0 to +1.6 ms at p50** over the runtime's own
`ping`/`pong` autoresponse, the **round trip** is p50 27 to 38 ms depending on
the network, a full room costs the sender about **8 ms at p50** over an empty
one with zero loss, and fan-out to 15 receivers delivered 900 of 900.

🔴 **And the property that decides the design: the token bucket is SILENT when
it bites.** No error, no close, no backpressure. A gap counter cannot see it
either, because the loss is a tail rather than a hole: a flood delivered 2,030
of 6,000 and reported `lost 0`. This is already in CLAUDE.md and it is the
single most important fact for anything MIDI-shaped, because MIDI is the kind
of traffic that produces bursts nobody predicted.

### 5.2 What a UMP lane over the relay would cost

**MEASURED**, sizes produced by the repo's own `demo/shell/wire.mjs` `format()`
rather than typed by hand. UTF-8 bytes:

| what | bytes |
|---|---:|
| `note.on` as it is sent today | **118** |
| `note.off` | 109 |
| `ctl.set` with one pair | 114 |
| `ctl.set` with four pairs | 138 |
| one 64-bit UMP word as hex in the envelope | 105 |
| one 64-bit UMP word as base64 in the envelope | **101** |
| eight UMP words, base64, one message | 177 |
| thirty-two UMP words | 433 |
| one hundred and twenty-eight UMP words | 1,457 |

For comparison, the raw wire sizes: a MIDI 1.0 note on is **3 bytes**, a UMP
MIDI 1.0 Channel Voice word is **4**, a UMP MIDI 2.0 Channel Voice word is
**8**, and the same with a JR Timestamp word in front is **12**.

⇒ **The envelope costs about 110 bytes whatever it carries.** A note that is
three bytes of MIDI is 118 bytes on this relay, thirty-nine times its own size.
That sounds bad and is irrelevant, which is the point of measuring it: the byte
budget is 8 MiB/s and nothing MIDI-shaped can reach it.

🔴 **The budget that bites is the message count, and the naive port blows it.**
ESTIMATED from the measured limits, arithmetic shown:

| scenario | one UMP word per relay message | % of 1,000 msg/s | bytes/s | % of 8 MiB/s |
|---|---:|---:|---:|---:|
| 10 notes, per-note pitch bend at 100 Hz | 1,000 msg/s | **100.0 %** | 8,000 | 0.095 % |
| the same at 200 Hz | 2,000 msg/s | **200.0 %** | 16,000 | 0.19 % |
| 10 notes x 3 dimensions at 100 Hz (MPE-shaped) | 3,000 msg/s | **300.0 %** | 24,000 | 0.29 % |
| a glissando, 16 note ons a second | 16 msg/s | 1.6 % | 128 | 0.0015 % |
| four knobs at screen rate | 240 msg/s | 24.0 % | 1,920 | 0.023 % |

**One hand playing ten notes with per-note pitch at 100 Hz saturates the relay's
steady rate exactly**, and it does so while using one thousandth of the byte
budget. That is the shape of every MIDI 2.0 proposal: the resolution is free and
the RATE is not.

✅ **And the fix is already in this repo twice.** Batch into one frame per
drain, and the message counter stops moving:

| scenario | frames/s at a 5 ms drain | % of 1,000 msg/s | UMP words per frame |
|---|---:|---:|---:|
| 10 notes, per-note pitch at 100 Hz | 200 | **20.0 %** | 5.0 |
| the same at 200 Hz | 200 | **20.0 %** | 10.0 |
| MPE-shaped, 10 x 3 at 100 Hz | 200 | **20.0 %** | 15.0 |
| four knobs at screen rate | 200 | 20.0 % | 1.2 |

Fifteen UMP words is **120 raw bytes**. One relay message holds **128,000** raw
64-bit words, or **95,988** base64 inside the envelope, so the frame is never
near the roof.

**5 ms is not a number invented here.** `rig/board/board.mjs:624` already uses
`DRAIN_MS = 5` for `ctl.set`, with the reasoning written beside it: coalesce, do
not queue, because a backlog of controller messages is a stack of statements
about where one knob is and all but the last are already wrong. And
`proto/osc/NOTES.md` §5 reached the same conclusion from the opposite direction:
**put a whole bundle in a single deliverable unit on every transport**, which
took MoQ's bundle integrity from 0 % to 100 % and its loss down by an order of
magnitude, because the ceiling there was a group RATE and not a byte rate.

⚠️ **But coalescing and batching are not the same operation and MIDI needs
both.** `ctl.set` folds, which is correct for a level: the last value is the
only one that stays true. A note on is an EDGE and must never be folded. A
per-note pitch bend is a LEVEL per note, so it folds per note id. A UMP frame
therefore has to carry a fold for some message types and a queue for others,
keyed the way `caps.series` keys an OSC address. That is the real design work
and it is not new: `demo/shell/cc-adapter.mjs` and the `osc` kind both already
have it.

### 5.3 The aggregate nobody caps

⚠️ **ESTIMATED, and it is the hole in the per-socket bucket.** The bucket is per
socket, so it says nothing about what the room costs. One inbound message is
sent to every socket including the sender, so with `n` sockets each sending `r`
frames a second the Durable Object does `n*r` inbound and `n*n*r` sends:

| room size | inbound msg/s | outbound sends/s |
|---:|---:|---:|
| 2 | 400 | 800 |
| 4 | 800 | 3,200 |
| 8 | 1,600 | 12,800 |
| 16 | 3,200 | 51,200 |
| 128 | 25,600 | **3,276,800** |

Each of those senders is inside its own budget at 20 %, and **nothing in the
relay refuses the aggregate**, because the bucket is per socket and there is no
second one above it.

🔴 **That makes the failure mode worse rather than better.** A per-socket bucket
that bites at least drops a message and counts it in `/stats`. An object that is
simply too busy drops nothing, refuses nothing and reports nothing: latency
rises, and there is no counter anywhere that distinguishes "the room is loaded"
from "the network is slow today". `plan-ws.md` measured **fan-out to 15
receivers at 20 msg/s delivering 900 of 900**, which is 300 inbound and 4,500
sends across the whole run, so the shape is known to work at that size and the
tables above are UNCONFIRMED beyond it. A four-person jam is ESTIMATED at 800
inbound and 3,200 sends a second. **Nobody has measured a room under MIDI-shaped
load at all**, and `demo/perf-wire.mjs` is the tool that would.

### 5.4 "CF UDP": checked properly, and the answer is still no

CLAUDE.md's measured line is *"a relay cannot live in a Container (no inbound
QUIC, dial-out only)"*. **It was re-checked today rather than repeated, and it
holds for QUIC and UDP. One neighbouring line has moved, and it is about TCP.**

**DOCUMENTED, read 2026-09-20:**

- **Workers have no UDP.** `cloudflare:sockets` exports one function,
  `connect()`, which is TCP and outbound only
  ([docs](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/),
  updated 2026-06-19). The platform's own protocol table has rows for HTTP,
  TCP, WebSockets, HTTP/3 and SMTP, and **no UDP row and no WebTransport row**
  ([docs](https://developers.cloudflare.com/workers/reference/protocols/),
  updated 2026-06-09).
- 🔴 **A WebTransport SERVER on Workers is not coming.** Tracking issue
  [workerd#6451](https://github.com/cloudflare/workerd/issues/6451). James
  Snell, Cloudflare, 2026-03-28: *"workers does not include a quic/http3
  implementation and the semantics of WebTransport do not fit naturally into
  the workers invocation model"*, and asked again on 2026-07-23: *"It's not
  currently on the priority list."*
- **A Container cannot be reached by anything but HTTP through a Worker**, in
  Cloudflare's own words: *"Because all Container requests are passed through a
  Worker, end-users cannot make non-HTTP TCP or UDP requests to a Container
  instance"*
  ([docs](https://developers.cloudflare.com/containers/platform-details/),
  updated 2026-08-28). Containers went GA on 2026-04-13.
- ⚠️ **And "dial-out only" understates how narrow the container is.** Outbound
  is *"only ports 80, 443, and DNS"*
  ([docs](https://developers.cloudflare.com/containers/guides/outbound-traffic/),
  2026-08-28), so a container cannot open a raw socket in either direction. The
  Worker-to-container API has `getTcpPort()` and **no UDP equivalent**.
- **Durable Objects gained no transport.** HTTP, WebSocket, hibernation
  (32,768 sockets per object), alarms, RPC, outbound TCP. No datagrams.
- **Spectrum does proxy raw UDP and it cannot point at a Worker.** Raw TCP and
  UDP are an **Enterprise paid add-on**, UDP applications require BYOIP,
  fragmented UDP is dropped at the edge, and the configuration docs say in so
  many words that Layer 7 features including Workers need the HTTP application
  type
  ([docs](https://developers.cloudflare.com/spectrum/protocols-per-plan/),
  2026-08-14). Pick UDP and you lose Workers; pick Workers and you lose UDP.
- **Tunnel's public hostname routing has a fixed service list and UDP is not on
  it.** `cloudflared` does carry UDP on the private network path, and only for
  an enrolled device running the Cloudflare One client.

⚠️ **Two things HAVE moved and neither is a reason to plan on them.**

1. **Inbound raw TCP to a Worker exists, in private beta since 2026-08-03**,
   via a new kind of Spectrum application that names a Worker and a new
   `connect(socket)` handler ([blog](https://blog.cloudflare.com/grpc-workers/)).
   It is behind a signup form and **has no public documentation**: the docs
   pull request was closed unmerged on 2026-09-05.
2. 🔴 **An inbound UDP handler was merged into the open source runtime three
   days ago.** [workerd#7130](https://github.com/cloudflare/workerd/pull/7130),
   merged 2026-09-17, shipped in `v1.20260918.1`. Datagrams are grouped into a
   flow by source address and delivered to the same `connect()` handler, and
   payloads are `Datagram` objects rather than `Uint8Array` **so one read is
   exactly one packet**. It is gated on the `workerd_experimental` flag, and
   there is **no announcement, no changelog entry, no docs page and no product
   behind it**. This is a thing to re-check in a couple of months, not a thing
   to build on.

**So "via cf udp?" is answered: no, not in a way a browser could use.** And
even if the runtime's UDP handler shipped tomorrow it would not help, because
**a browser cannot open a UDP socket at all** and never could. The only QUIC
that reaches a browser on this platform is Cloudflare's own MoQ relay running
Cloudflare's code.

✅ **MoQ itself is in better shape than it was**, for the record: the relay
network has been up since 2025-08-22 on every Cloudflare server, and since
2026-07-31 there is a provisioning API for isolated relays with a
publish-and-subscribe token and a subscribe-only one, free during the beta
([docs](https://developers.cloudflare.com/moq/)). Drafts 14 and 16, and
**FETCH is not supported on either**.

🔴 **And MoQ's measured behaviour here is the argument AGAINST it for MIDI.**
`proto/osc/NOTES.md` §5: one bundle per group is mandatory, taking integrity
from 0 % to 100 %, and even then the burst arm lost **47 %** at about 25 groups
a second, because a MoQ group is a QUIC uni-stream and the ceiling is a stream
RATE rather than a byte rate. **A keyboard is the burst arm.** That document's
own verdict is *"Fine for a slow control surface, not for a keyboard."*

And the remaining WebTransport facts, from CLAUDE.md rather than re-derived:
browser to relay to browser at **p50 about 20 ms**, no container and no Rust
build; Safari 26.4 connects in 140 ms and then deadlocks after about 16 MiB or
7,600 streams on [WebKit
319818](https://bugs.webkit.org/show_bug.cgi?id=319818), measured twice at 6 to
8 frames in 150 s, with a reconnect NOT working around it.

⚠️ **One option that was not on the original list and is worth naming**: the
Cloudflare Realtime SFU (formerly Calls) has documented **DataChannels**
carrying arbitrary application data, named, one publisher to many subscribers,
with `ordered`, `maxRetransmits` and `maxPacketLifeTime`
([docs](https://developers.cloudflare.com/realtime/sfu/datachannels/), updated
2026-08-13). `proto/osc/NOTES.md` §5 already measured the shape: an SFU
DataChannel carries one bundle as one SCTP message, so integrity is 100 % by
construction, at **16.2 ms p50**. That is **less than half the relay's round
trip** and it is the only measured option here that beats the WebSocket. It
costs a WebRTC negotiation, egress billing at $0.05/GB, and a second transport
in a repo that has one.

### 5.5 The board is the wall, and it is a MIDI 1.0 wall

**MEASURED by reading the code**, not by touching the hardware:

- `rig/board/jacksynth.mjs:803-807` writes `[0x90 | ch, note & 127, vel & 127]`
  into `snd-virmidi`'s raw device with an `openSync` and a `writeSync`. That is
  a MIDI 1.0 byte stream by construction. `snd-virmidi` is a MIDI 1.0 device;
  the kernel's UMP support lives in a different set of devices.
- `rig/board/board.mjs:742-756`: `note.on` carries `{note, vel, channel}` as
  integers. **There is no pitch field.** Every `note.on` also produces a
  `note.ack`, so one key press costs two messages in the room.
- The board's kernel is **6.18.34** (`rig/board/video.mjs:84`), which is new
  enough to have ALSA's UMP support. **That is necessary and nowhere near
  sufficient**, because the thing on the far end is Yoshimi, an ALSA MIDI 1.0
  sequencer client.
- ⚠️ **UNCONFIRMED**: whether Yoshimi implements MPE or the MIDI Tuning Standard
  at all. Not checked, and it should be checked before anything is built,
  because it is the difference between "microtonal on the board" and
  "microtonal on a voice we wrote".

✅ **The voices we wrote are the exception and they are the opportunity.**
`demo/shell/rhodes.mjs` and `moog.mjs` run the same arithmetic in an
AudioWorklet and in node on the Pi, and `plan-controller.md` §2.3 already
records that a SuperCollider `MoogFF` voice driven by `/n_set` gives **an
absolute cutoff in Hz, a float with no 7-bit stepping, and smoothing declared in
the graph**. A float frequency per note is one parameter on a voice that already
takes floats.

---

## 6. Is MIDI 2.0 an OSC replacement?

**No, and the reason is not about either format's features.** It is that this
project has already built the thing that would have to be thrown away.

`proto/osc/NOTES.md` is the record: a codec graded against four independent
implementations (liblo, osc.js, osc-min, python-osc) with a named list of where
each one disagrees, a bundle atomicity design proved by 32 assertions, a
level-versus-edge split that makes seek correct, and a transport comparison
across five arms. None of that is about OSC the wire format. **All of it is
about being a timeline kind**, and a MIDI 2.0 lane would have to re-earn every
line of it.

### 6.1 What OSC does that MIDI 2.0 does not

| | OSC | MIDI 2.0 |
|---|---|---|
| **address space** | open and arbitrary: `/synth/3/cutoff`, `/scene/next`, anything you invent | an enumerated set. Group, channel, controller index. You cannot name a thing that is not in the table |
| **argument types** | `i f s b h t d S c r m`, arrays, blobs. A string, a picture, a timetag | integers in fixed fields. SysEx 7 and 8 carry arbitrary bytes and are a different, slower lane |
| **atomicity** | bundles, with a proof in this repo that they survive the transport when one bundle is one deliverable unit | **no all-or-nothing grouping.** A JR Timestamp gives the messages after it a shared time, so simultaneity is expressible where the clocks agree, but nothing says "these five or none" and a receiver that gets four of them cannot know |
| **who speaks it** | every DAW, Max, Pd, SuperCollider, TouchDesigner, lighting desks, and `timeline/osc.mjs` | almost nothing, measured by adoption rather than by spec |
| **a float** | native, and this repo's `caps.continuous: false` is a deliberate choice about SEMANTICS rather than a limit | 32-bit fixed point. Fine, and it is not the same thing |

### 6.2 What MIDI 2.0 does that OSC does not

| | MIDI 2.0 | OSC |
|---|---|---|
| **a shared vocabulary** | note, velocity, per-note pitch, per-note controller mean the same on every device that implements them | nothing is shared. `/synth/3/cutoff` means what the receiver decides |
| **discovery** | MIDI-CI asks a device what it is and what it supports | none. OSC has no discovery and `proto/osc/NOTES.md` §8.1 records that query and reply are not expressible as timeline rows |
| **a reset** | `RESET_ALL_CONTROLLERS` exists, and the CC adapter's `assertState` depends on it | 🔴 **the sharpest thing the `osc` kind cannot do**: a level address never set has no state, there is no "put everything back", and a seek to t=0 leaves a receiver holding whatever the last scrub left |
| **hardware** | there is a path to a physical instrument | no analogue gear speaks OSC. It always needs a bridge |

🔴 **And the coalescing scheme this project runs interacts with MIDI 2.0's rate
directly, in a way that is worth stating before anybody proposes a swap.**
`ctl.set` folds by controller number and writes one value per controller per
5 ms drain. That is correct for 7-bit controllers, where 128 steps means a hand
on a slider produces far more messages than distinct values. **With a 32-bit
controller every message is a distinct value**, so folding is no longer
throwing away duplicates, it is throwing away resolution in time. The fold is
still right, because 200 writes a second is already far above what any ear
resolves, but the REASON changes and the readout that says `folded` stops
meaning "overtaken duplicates" and starts meaning "samples we chose not to
send". `plan-circuit-model12.md` §6.3 already found a second defect in the same
function: `ctl.pending` is keyed by controller number alone with one channel for
the whole board, which collides the moment two channels are addressed.

### 6.3 🔴 The sharpest cost, and it is in a file that already works

`demo/shell/cc-adapter.mjs` is the MIDI 1.0 timeline kind and it is finished:
14-bit CC pairs that fold to one key, pitch bend, `SWITCHES` excluded from
interpolation, `msbZerosLsb: false` declared as an interop honesty flag, a
throttle per controller key, and `assertState` sending `RESET_ALL_CONTROLLERS`
before it re-states anything, which is what makes a seek ABSOLUTE. Measured in
`PROGRESS.md`: 14-bit CC pair 16384/16384 exact, pitch bend 16384/16384 exact,
library fold identical to an independent node-side fold with error 0.

Its series identity is `cc:<ch>:<coarse>` and `pitch bend ch<n>`. **MIDI 2.0's
per-note controllers break that, and not superficially.**

- A per-note controller is keyed by group, channel AND note, so the series
  identity has to grow a note number.
- 🔴 **And that series DIES WHEN THE NOTE DOES.** `reduce(prefix <= t)` returns
  the last value per series and `assertState` re-sends it. Re-sending a per-note
  pitch bend for a note that stopped sounding two minutes ago is meaningless at
  best. Worse: two successive notes at the same pitch share a key, so the second
  one inherits the first one's bend on a seek.
- MIDI 2.0 has a Per-Note Management message with a detach flag for exactly this
  ambiguity, which is the spec admitting the problem rather than solving it for
  us. **A kind with transient series is a thing this library has never had**,
  and `proto/osc/NOTES.md` §8.2 already records the neighbouring hole: an
  address never set has no state, and there is no way to put everything back.

That is the real bill for MIDI 2.0 here, and it is not the codec. It is that
the one piece of machinery this project has that makes control traffic
**seekable** assumes every series is permanent.

**The honest summary**: MIDI 2.0 is a better MIDI. It is not a better OSC, and
it is not a worse one either. They answer different questions, and this project
has already answered the OSC one to 32 assertions.

---

## 7. What to do

### 7.1 The smallest experiment that settles the biggest unknown

After all of the above, the biggest unknown is **not** technical. Every
technical question has an answer: no browser, no Cloudflare UDP, a relay that
works if you batch, a board that cannot receive it. The unknown is:

> **Does a pitch that is not a semitone change what this project can make, or is
> it a spec fact with no consequence here?**

Nothing in this repo has ever produced a note that is not an integer, so nobody
knows. And the experiment that answers it costs **one float** and reaches no
new technology at all:

1. **Add `bend` to `note.on`**, a float in semitones, defaulting to 0. It is a
   payload field, so the envelope carries it verbatim; `ENVELOPE` in `wire.mjs`
   is `from`, `at`, `seq`, `by` and `bend` collides with none of them.
2. **Honour it in a voice that already takes a float.** `demo/shell/moog.mjs`
   or `rhodes.mjs` in the page, which needs no board, no relay and no network.
   That is the cheapest possible arm and it makes a sound today.
3. 🔴 **Grade it on a MEASURED frequency, never by ear, and carry a negative
   control.** This project has already been wrong in exactly this shape twice:
   a page that reported a boundary whatever it was shown passes "a boundary was
   found", and a vibrato tool that reported 19.15 Hz about every controller at
   every value had a saturated counter rather than a finding. So the check is
   an analyser reading the fundamental of a held note against the cents the
   page asked for, and it has two arms: a just intonation major third asserted
   at **386 cents rather than 400**, and the same note with the tuning switched
   off asserted back at 400. **Turning microtonality off must take the first
   assert red and leave the second green.** A check that stays green either way
   was never measuring the pitch.
   ⚠️ And grade the ANALYSER on a synthetic tone of known frequency first. A
   floor proves the instrument invents nothing; only a known signal proves it
   can see anything, which is the lesson `rig/board/wobble-test.mjs` was built
   out of.
4. **Only then ask whether the board can hear it**, which is where MPE and the
   MIDI Tuning Standard become real questions rather than spec reading.

⚠️ **What makes this the right experiment is what it leaves behind if MIDI 2.0
is never adopted**: a pitch field on the wire and a voice that honours it are
worth having on their own, and `plan-nodes.md` §2.2 already names that as the
test of a good feature request here.

### 7.2 The second experiment, and only if the first says yes

**A UMP lane on the existing relay, batched, with the batcher sabotaged to prove
it is graded.** One binary frame per 5 ms drain, the frame's shape declared in a
JSON message exactly as `demo/shell/board.mjs` already declares
`audioChannels` and `frameMs` for its 12-byte audio header. The measurement is
the relay's own message counter: batching should hold it at 200/s while the word
count rises, and **turning the batcher off should take it to 1,000/s and start
dropping silently**. If the check stays green with the batcher off, the check
was never measuring anything, which is the failure this project has now recorded
four times.

⚠️ **`sendBinary` carries no envelope**: no `from`, no `seq`, no `type`. A
binary frame cannot say what it is, which is why the shape has to be declared in
a JSON message beside it, and why the board's `board.hello` precedent matters
more than it looks.

### 7.3 What not to build

- **Do not build a MoQ or WebTransport MIDI lane.** The measurement already
  exists and says no for burst traffic. `proto/osc/NOTES.md` §5.
- **Do not add routing to the relay.** `plan-nodes.md` §2.2 already refused this
  for a different feature and the reasoning transfers: the relay's whole value
  is that it does not parse, which is why the hop costs 1 to 2 ms.
- **Do not put a UMP codec in the kit before anything can hear one.** A codec
  that is only tested against itself is the exact failure `proto/osc/NOTES.md`
  opens with: the OSC padding bug round-tripped perfectly and died on the first
  real packet.
- **Do not turn SysEx on as a side effect.** It is a strictly larger permission
  than notes and `plan-circuit-model12.md` §6.4 already says it should be a
  deliberate decision. What is new is that the smaller permission now prompts
  too (§4.3), so the argument has to be re-made rather than inherited.

---

## 8. What was not checked

Listed so nobody reads a silence as a finding.

- **Firefox.** Not installed on this machine. Nothing about it here is measured.
- **Chrome on a phone, and Chrome on the Pi.** `plan-hardware.md` §6 already
  carries an open question about whether Chromium on Arm Linux enumerates MIDI
  outputs at all, with field evidence of an empty outputs map. Still open.
- **Whether CoreMIDI on this Mac exposes a UMP endpoint.** No command line tool
  reports it and checking means compiling.
- **Whether Yoshimi implements MPE or the MIDI Tuning Standard.** This is the
  single most useful unchecked thing in this document, because it is the
  difference between microtonality on the board and microtonality only in a
  page.
- **Anything on the board itself.** Nothing was sent to the relay, nothing was
  asked of the Raspberry Pi, and no hardware was touched.
- **Headed Chrome.** The permission result is from a headless profile where the
  state read `prompt` rather than `denied`, which is the evidence that a real
  user would be asked. A headed run would show the prompt itself and was not
  done.

---

## 9. One repo note, found while reading and reported rather than fixed

⚠️ **CLAUDE.md says `rig/box/` and the directory is `rig/board/`.** The file
states in capitals that *"`rig/box/` DID NOT MOVE AND MUST NOT"* and names
`rig/box/box.mjs` and `rig/box/ask.mjs`. Commit `dc3efc3` is *"session 37: the
lingo is board, not box, and the board is migrated onto it"*, and
`rig/board/migrate-from-box.sh` is still sitting there as the receipt. Nothing
was changed here, because three other agents are working in this checkout.
