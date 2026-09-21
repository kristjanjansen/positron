# plan-patchbay: a universal patch bay, scoped to MIDI and audio

> **The ask**, 2026-09-21, in full in `BACKLOG.md`: *"a system where you can
> freely map one signal to another"*, kept to **MIDI and audio for now** and
> designed so that video, 3D rendering, multi-presence and shader control can
> join later. Four questions were set: the **data model**, the **dispatching and
> routing logic**, how the **language** for describing a connection is
> abstracted, and a **small demo** built from what already exists. The demo was
> named in the ask: *MIDI keyboard → routing → Novation Circuit → audio capture
> → stream or record*.
>
> 🔴 **NOTHING HERE IS BUILT.** No page, no module, no row in `manifest.mjs`.
> It is a proposal, and it is written to be argued with.
>
> 🟢 **BUT ALMOST NOTHING IN IT IS NEW EITHER, AND THAT IS THE ARGUMENT.** Every
> transport this needs is already measured and running in this repository. What
> is missing is not a protocol. It is a **naming layer and a router**.

---

## 0. The headline, so nobody has to read eleven sections to get it

**Build a control plane, not a signal path.**

🔴 **THE SINGLE MOST IMPORTANT DECISION IS THAT THE PATCH BAY DOES NOT CARRY
AUDIO.** It carries MIDI, because MIDI is small and a note is a message. It
**negotiates** audio and then gets out of the way, because audio is 1536 kbit/s
a stereo pair and a router in the middle of it is a router that adds a buffer,
a copy and a failure mode to every stream on the desk.

A patch bay that moves everything is a mixer. A patch bay that moves control and
**declares** the rest is a directory with a dispatcher in it, and that is a
thing this repository can build in a week and grade with asserts.

**Three nouns: `Node`, `Port`, `Link`.** One verb: `connect`. One rule: a link
is refused unless both ports have DECLARED shapes that fit, with the reason
given in words.

---

## 1. What already exists, which decides most of the design

📁 **REPO. This is not a survey, it is the parts list.**

| piece | what it already does | measured |
|---|---|---|
| `demo/shell/wire.mjs` | one room, one socket, reconnect, sequence numbers, gap detection, binary passthrough | relay limits **1000 msg/s, 2000 burst, 128 sockets**; DO hop **1 to 2 ms p50**; a full room costs the sender about **8 ms p50** |
| `demo/shell/midi.mjs` | Web MIDI in and out in a page | ⚠️ asks `{ sysex: false }`, and **`port.open()`** is the bug that made four live instruments read as an empty room |
| `demo/shell/midi-decode.mjs` | bytes to a row, pure, plus `createNrpn()` | **47 asserts with no browser** |
| `demo/shell/board.mjs` | PCM over the relay: 12 byte frame header, worklet playout, cushion, counters | 48 kHz, 20 ms, mono, and **senders declare `audioChannels` AND `frameMs`** |
| `rig/m1/live-agent.mjs` | CoreMIDI out plus a Core Audio process tap on the Mac | Live captured at **-5.3 dBFS**, 0 dropped of 801 |
| `rig/board/` | the Pi: jackd, one instrument, capture | one room, one jackd, one capture |
| `demo/dump/` | every message a device sends, bytes beside a reading | the instrument that produced every number below |
| `/circuit/`, `/twelve/`, `/evo/` | three hardware panels that listen | 22, 27 and 16 page asserts |

🔴 **SO THE TRANSPORTS ARE DONE.** What nobody can do today is say *"the
keyboard plays the Circuit"* without writing a page that hard codes both ends.
Every one of those panels knows about exactly one instrument, by name, in its
own source. **That is the thing to remove.**

---

## 2. The data model

### 2.1 Four objects, and a fifth that is only a label

```js
Site   { id, label, kind: 'browser'|'node'|'board'|'mac', room, seenAt }
Node   { id, siteId, label, maker, kind: 'midi-port'|'audio-device'|'engine'|'file', caps }
Port   { id, nodeId, dir: 'in'|'out', medium: 'midi'|'audio'|'clock', shape, accepts }
Link   { id, fromPort, toPort, transforms: [...], enabled, stats }
Patch  { id, label, links: [...] }          // a named set of links. A "patch" is a save file.
```

🔴 **`Port` IS WHERE THE WHOLE DESIGN LIVES**, and `shape` and `accepts` are two
different fields on purpose.

- **`shape` is what the data IS.** For audio: `{ rate, channels, frameMs,
  format }`. For MIDI: `{ protocol: '1.0'|'ump', channels: [1..16] }`.
- **`accepts` is what the port will ALLOW THROUGH.** For MIDI:
  `['note', 'cc', 'bend', 'touch', 'program', 'clock', 'sysex']`, as a list the
  port opts into.

⚠️ **THEY ARE NOT THE SAME QUESTION AND CONFLATING THEM IS HOW A STUDIO GETS
DAMAGED.** 📁 The Circuit's input port is shaped for ordinary MIDI 1.0 on all
sixteen channels and must nevertheless **not accept `sysex`**, because
`plans/plan-circuit-editor.md` §1 shows that one byte inside a SysEx message
overwrites a patch on a device with no factory reset. A shape says *I can parse
this*. An `accepts` list says *I consent to this*.

### 2.2 Why `shape` is declared and never inferred

🔴 **MEASURED, AND THIS REPOSITORY HAS THE SCAR.** CLAUDE.md: *"960 int16s is a
valid 20 ms mono frame AND a valid 10 ms stereo one; guessing wrong plays an
octave down, which sounds like a broken instrument rather than a broken
header."* `board.mjs` already solves it the right way: senders declare
`audioChannels` and `frameMs`, and receivers **check one against the other**,
`samples / channels / rate === frameMs`.

**The patch bay generalises exactly that rule**: every port declares its shape,
and every link checks the pair at connect time rather than at play time.

### 2.3 Identity

🔴 **A NODE IS KEYED BY `id`, NEVER BY NAME**, which is CLAUDE.md's MIM corpus
lesson in a new place: *"a name is a thing a re-encode changes"*, and there it
silently re-credited somebody else's recording. Here the equivalent is a CoreMIDI
port called `Circuit` that becomes `Circuit 2` when it is replugged while a page
holds it.

⚖️ **An id is `site:node:port`**, built from the stablest thing each layer has:
the site's own persistent id, the device's USB vendor and product where it can
be read, and the port index within the device. **The human label is a separate
field and is allowed to change.**

⚠️ **AND A MIDI BINDING IS KEYED BY `(channel, controller)`, NEVER BY
CONTROLLER ALONE.** 📁 `plans/plan-device-layouts.md` §5.3 argues it and the
Circuit proves it: CC 80 is macro knob 1 on channel 1 **and** drum 4 pan on
channel 10, in one instrument.

### 2.4 The registry is eventually consistent and says so

Every site announces its nodes and ports into the relay room and heartbeats.
The bay's directory is the union of those announcements.

🔴 **EVERY ENTRY CARRIES `seenAt` AND THE UI PRINTS IT**, because CLAUDE.md
already records the failure: *"I cannot ssh to it is never the same as it is
down"*. A node that has not been heard from in 30 s is **stale**, which is a
third state and not the same as absent.

---

## 3. Dispatch and routing

### 3.1 Two planes, and only one of them is in the middle

```
                     ┌───────────────────────────────┐
  control  ─────────▶│  patch bay: registry, router  │◀──────── control
  (small, JSON)      │  it OWNS MIDI, it BROKERS audio│
                     └───────────────┬───────────────┘
                                     │ negotiates only
  audio ═══════════════════════════════════════════════════▶ point to point
```

- **MIDI travels through the bay.** A note is about 30 bytes of JSON on the
  relay. 🔴 A held chord and a glissando were budgeted in CLAUDE.md at **about
  16 and 8 messages a second**, against a relay measured at **1000 a second**.
  There is room by more than an order of magnitude.
- **Audio does not.** The bay hands both ends a shape and a transport and stands
  aside. 📁 `board.mjs`'s PCM frames over the relay are one such transport and
  are already running; WHEP and MoQ are two more, both measured in this
  repository, and a local Core Audio device is a fourth where both ends are the
  same machine.

⚠️ **THE RELAY BITES SILENTLY AND THAT DECIDES THE MIDI BUDGET.** CLAUDE.md:
the token bucket *"is readable off the wire and exact, and the sender is told
NOTHING when it bites"*, and a gap counter cannot see it because the loss is a
tail rather than a hole. **So the bay counts what it sent and what arrived, at
both ends, and reports the difference.** That is the only instrument that works.

### 3.2 The router is a table, not a graph walk

At the centre is one map from a source port to its links. An arriving event does
three things and nothing else:

```js
for (const link of links.from(port)) {          // fan out is free
  if (!link.enabled) continue;
  const out = apply(link.transforms, event);    // pure, ordered, may drop
  if (out) deliver(link.toPort, out);
}
```

🔴 **FAN OUT IS THE DEFAULT AND FAN IN IS MERGE, AND NEITHER NEEDS A GRAPH
ALGORITHM.** One keyboard reaching three synths is three links. Two keyboards
reaching one synth is two links into one port and the destination sees
interleaved events, which is what a MIDI merger has always been.

⚠️ **A CYCLE IS THE ONE THING THE TABLE CANNOT SURVIVE**, and it is easy to
build by accident once two sites are involved: A out to B in, B out to A in, one
note echoing forever at relay speed. **Refuse a link that closes a cycle at
connect time**, by walking the existing table, and say which link would close
it. ⚖️ A depth counter on the event is the belt and braces, because a cycle can
also be closed through hardware that the bay cannot see, for example a MIDI
THRU on the back of a box.

### 3.3 Where a transform runs

Three choices, and the rule is **as near the source as possible**:

1. **At the source site**, before the wire. A transpose, a channel remap and a
   velocity curve all shrink or preserve the event, so doing them first costs
   the wire nothing.
2. **In the bay.** Anything needing to see more than one source, which is merge
   and arbitration.
3. **At the destination site.** Anything needing the destination's state, and
   anything the destination must be able to veto.

⚠️ **THE `accepts` CHECK IS ALWAYS AT THE DESTINATION AND IS NEVER MOVED**, for
the same reason a self-check is not gated on the harness: a guard that lives on
the other side of a wire is a guard that a different client can simply not run.

### 3.4 Clock is its own medium and is not an afterthought

🔴 **MEASURED: THE CIRCUIT TRANSMITS MIDI CLOCK CONTINUOUSLY, AT ABOUT 122 bpm,
WITH NOBODY TOUCHING IT**, 48.75 messages a second. Anything joining this rig
inherits a tempo whether it asked for one or not.

**So `clock` is a third medium beside `midi` and `audio`**, with exactly one
rule: a site has at most one clock source, chosen explicitly. A bay that let
clock ride the ordinary MIDI path would put 48 messages a second per link into
the relay budget and bury every note in `/dump/` within four seconds, which is
the measured reason that page counts clock rather than listing it.

---

## 4. The language, in three levels that are one object

🔴 **THE STRUCTURED FORM IS THE TRUTH AND THE OTHER TWO COMPILE INTO IT.**

**Level 1, the graph.** JSON, exactly the `Patch` in §2.1. This is what
executes, what is saved, what is diffed, and what an assert reads.

**Level 2, one line per link.** A terse text form that a person can type, a
diff can show and a model can emit:

```
evo:out            -> circuit:in/ch1   { transpose +12, velocity curve soft }
evo:out/cc[1]      -> circuit:in/ch16  { to cc 74 }          # mod wheel to the master filter
circuit:audio/out  -> capture:in       { channel 1 }
capture:out        -> record:wav       { }
```

The grammar is four things: a **source**, an **arrow**, a **destination**, and a
brace list of **transforms**. A selector after the port (`/ch1`, `/cc[1]`) is a
filter, and a filter is just a transform that can drop.

⚠️ **IT IS A PROJECTION, NOT A SECOND SOURCE OF TRUTH.** Every line round trips
to a link object and back. The moment the text can express something the graph
cannot, there are two models and they will disagree, which is this repository's
most repeated defect in its most expensive form.

**Level 3, free form.** *"make the keyboard play the Circuit an octave up and
record it"*. §5.

⚠️ **NO EM DASHES AND NO MIDDOTS IN ANY OF IT**, because level 2 is read by a
person and this project has a rule about both.

---

## 5. The intelligence layer, and the one thing it may never do

**The pipeline is: words → proposed patch → validated → CONFIRMED → applied.**

🔴 **A MODEL PROPOSES. IT DOES NOT CONNECT.** The output of interpretation is a
**level 2 text block**, which is shown to the person as text before anything
happens. This is not caution for its own sake: a system that rewires a studio
from a microphone is the *page that opens something on load* defect with a
larger blast radius, and this repository has paid for that one four times.

**What makes this tractable is that the model never guesses at identity.** It is
handed the registry, which is a list of real ports with real shapes, and its job
is to pick from it. A proposal naming a port that does not exist is rejected by
the validator, not by the model's own care.

⚖️ **THE VALIDATOR IS THE INTERESTING PART AND IT IS ORDINARY CODE.** For each
proposed link it answers, in words:

- does every named port exist, and is it stale
- do the mediums match, or is there a declared adapter between them
- do the shapes fit, and if not, exactly which field disagrees
- does the destination `accept` every class this link could deliver
- does it close a cycle
- what does it cost: messages a second against the relay's budget

🟢 **AND THE VALIDATOR IS USEFUL ON ITS OWN, WITH NO MODEL ANYWHERE.** That is
the test of whether this layer is real: if the natural language part were
deleted, the rest would still be the thing worth having.

---

## 6. Capability and consent

Every port publishes `accepts`. The bay refuses to build a link that could
deliver a class the destination has not opted into, **and it refuses at connect
time with the reason printed**, rather than dropping events later.

🔴 **THE PRECEDENT IS `/circuit/` AND IT IS THE RIGHT ONE.** 📁 That page's
`send()` has no path for a control change, a program change or SysEx, so a
record command **cannot be expressed**, and its check fires the guard on purpose
with four shapes that could touch a recording, **with a negative control beside
it** so a guard that refused everything could not pass by being inert.

**Defaults, from what is measured about each instrument:**

| port | accepts | why |
|---|---|---|
| Circuit in | `note`, `cc`, `bend`, `program` | 374 live parameters, none of which can write flash |
| Circuit in | **not** `sysex` | one byte inside a SysEx overwrites a patch, no factory reset |
| Circuit in | **not** `clock` | it is already the master and sends its own |
| MK-425C in | nothing | 📄 it has a MIDI OUT and no DIN IN, and no sound engine |
| board in | `note`, `cc` | one jackd, one room, one instrument in another building |

⚠️ **AND A DESTINATION IN ANOTHER BUILDING IS A DESTINATION SOMEBODY ELSE MAY BE
LISTENING TO.** CLAUDE.md records `/knobs/` refusing to start because somebody
had pressed a control that took the sound away from a person in another room.
A patch bay makes that one line of text away, so the board's ports need an owner
and a *who is using this* field before anything routes to them unattended.

---

## 7. The smallest complete demo, concretely

**`/bay/`**, and every piece of it is measured as of today.

```
MK-425C  ──USB MIDI──▶  browser  ──relay──▶  browser  ──USB MIDI──▶  Circuit
                                                                        │
                                                                    analogue L
                                                                        ▼
                                                              Fast Track Pro in 1
                                                                        │
                                                                   getUserMedia
                                                                        ▼
                                                            level meter, and a file
```

**What each hop already knows, with the number:**

| hop | measured today |
|---|---|
| MK-425C sends | global channel **2**, keys **47 to 71**, **every release is a note on at velocity 0**, knobs on six CCs |
| relay carries | **1 to 2 ms p50**, 1000 msg/s budget, silent when it bites |
| Circuit receives | synths on channels **1** and **2**, drums on **10** at notes 60, 62, 64, 65 |
| Fast Track Pro captures | channel **1**, 48 kHz, 16 bit, **peak -1.69 dBFS with both gains at maximum, zero clipped samples** |

🔴 **AND THE AUDIO CAPTURE IS NOT DECORATION, IT IS THE ONLY EVIDENCE THE FAR
END DID ANYTHING.** CLAUDE.md's oldest rule about lanes: *"a count is only
evidence on the far side of the boundary"*, and `createMidiLane`'s `scheduled()`
counted what the page queued while every note was being scheduled fifty six
years out. A patch bay that showed `sent 412` would be that bug with a bigger
diagram. **A level meter on the returning audio is the far side.**

**The three transforms worth shipping first**, because each is a different
class:

1. `transpose +12` rewrites a field. The MK-425C is measured a semitone flat,
   so `+1` is a real thing somebody will want on day one.
2. `channel 2 -> 1` rewrites the address. Without it the keyboard's global
   channel 2 plays the Circuit's **Synth 2**, which is correct and is not what
   anybody means by *play the Circuit*.
3. `cc 1 -> cc 74 on ch 16` crosses a channel and a controller at once, which
   is the smallest transform that proves the `(channel, controller)` key.

**The asserts that make it real**, none of which need a device:

- a link whose destination does not `accept` `sysex` is refused, **with the
  reason**, and the refusal is fired on purpose
- a cycle is refused and the offending link is named
- a shape mismatch is refused and **the field that disagrees is named**
- a note through `transpose +12` arrives 12 higher, and a note through an empty
  transform list arrives unchanged, **which is the negative control**
- the count at the destination equals the count at the source, over a run, and
  the two are read from **two different counters at two ends**

---

## 8. What to build first, in order

1. **`demo/shell/bay.mjs`: the model and the validator, pure, no transport.**
   Nodes, ports, links, transforms, compatibility, cycle detection. 🔴 Graded by
   `node demo/shell/bay-test.mjs` with no browser, the way `midi-decode.mjs`
   and `looper.mjs` already are, **with negative controls**, because a validator
   that accepted everything would pass a test that only tries valid patches.
2. **The level 2 parser and printer**, in the same module, with a round trip
   assert: text to graph to text is identical.
3. **`/bay/`: one page, one site.** Announce the browser's own MIDI ports into a
   relay room, show the registry as a table, let a link be made from two
   pickers, and run it. At this point one keyboard plays one synth on one
   machine and the whole thing is honest.
4. **A second site.** The same page in another tab or another building. Nothing
   changes in the model, which is the test of §2.
5. **Audio as a brokered link**, using `board.mjs`'s existing frame path, with
   the capture from `research/fasttrack-capture-2026-09-21.md` as the source.
6. **Free form**, last, and only after the validator is the thing the page is
   built around.

---

## 9. What this does not settle

- 🔌 **NOBODY HAS PLAYED THE CIRCUIT FROM A COMPUTER YET.** Every panel in this
  repository listens. `BACKLOG.md` has this open under its own line, and it is
  the one measurement the whole demo rests on: whether the synths answer notes
  on channels 1 and 2, and whether the drums answer 60, 62, 64 and 65.
- 🔌 **THE END TO END LATENCY OF KEY TO SOUND IS UNMEASURED.** The pieces are
  known and they do not add up on their own: Web MIDI in, a relay hop at 1 to
  2 ms, Web MIDI out, the Circuit's own voice start, and the interface's input
  latency at 74 frames. **The measurement that settles it is the capture**: play
  a key, record, and find the distance between the outgoing message's timestamp
  and the first sample above the floor. That is a real instrument and it needs
  no new hardware.
- ⚠️ **`midi.mjs` STILL ASKS `{ sysex: false }` AND STILL DOES NOT CALL
  `port.open()` IN EVERY CALLER.** Both are open lines in `BACKLOG.md`, both are
  shared kit changes, and the second one is the bug that made a desk of four
  live instruments read as an empty room.
- ⚖️ **MULTI PRESENCE IS DESIGNED FOR AND NOT DESIGNED.** Two people holding one
  patch bay is two writers on one graph, and nothing above says who wins. The
  relay's rooms give isolation; they do not give arbitration.
- **Video, 3D, shaders.** Out of scope by instruction. The shape that keeps them
  reachable is §2.1's `medium` field plus §3.1's rule that heavy media is
  brokered rather than carried: a shader is a `Port` whose medium is `program`
  and whose shape is a uniform list, and it needs nothing else from this model.
