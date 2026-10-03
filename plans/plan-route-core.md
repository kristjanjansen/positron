# plan-route-core: one routing core, small enough for a microcontroller

> Asked 2026-10-03, verbatim in `BACKLOG.md`: *"maybe not make that routing so
> be specific. So something which you can also use on smaller hardware.
> Microcontrollers with smaller cortex chips on them ... plan it as abstract as
> possible. And the wish thing, my voice control, is just one of the many of
> those. Possible input methods ... Try to separate what is universal and what
> is particular in particular hardware setup with different instruments, input
> methods, etc."* And, the same minute: *"Don't be so protective about the
> circuit. It does have a factory reset ... don't be so afraid of sysacks. It's
> just any other device with some precautions."*
>
> **NOTHING HERE IS BUILT OR MEASURED.** It is a design that stands on four
> earlier documents and says where it departs from each:
> `plans/plan-patchbay.md` (2026-09-21, the Node/Port/Link model),
> `plans/plan-hardware.md` §7b and §8 (2026-09-10, the ESP32 over our relay, the
> voice-patched patchbay in another city), `plans/plan-wish-dawless.md` (the Pi
> as hub) and its §12 (RaspiMIDIHub read in full).

## 1. The verdict

Split routing into a **core** that knows nothing about any instrument, any
input method or any computer, and **profiles and adapters** that know
everything about one of each.

The core is three things: a fixed-size event, a table of links, and a closed
list of transforms. It fits in a few kilobytes, uses no heap, no JSON and no
strings on the hot path, and runs the same way on a Cortex-M, a Pi and in a
browser. Everything particular (the Circuit's CC map and its one dangerous
SysEx byte, a USB host stack, a microphone, a language model, a footswitch)
plugs into it from outside.

The contract between the implementations is not the code. It is **a file of
test vectors**: a table, a stream of events in, the events that must come out.
The JavaScript reference and any C port pass the same file or they disagree.

### Half of it exists already: `demo/shell/bay.mjs`

Found by the inventory for `plans/plan-universal-routing.md` the same day:
**plan-patchbay's model and validator are BUILT**, as `demo/shell/bay.mjs` (899
lines, pure, graded by `demo/shell/bay-test.mjs`): `createBay` at `:668`, the
one-line text form at `:603`, links `{id, from, to, transforms, enabled, sent,
dropped}`, and refusals with a reason and a fix. `/wish/` and
`workers/wish/src/wish.mjs` import it. So **bay.mjs is this plan's L2 (registry
and validator) and the JavaScript reference to start from**; what is missing is
the L0 core underneath it, compiled to the binary table, and the test vectors.
⚠️ **Three vocabularies disagree and must be one first**: `bay.mjs:35`
`CLASSES` (`bend`, `touch`, no `transport`), `rig/board/alsa.mjs:16` `CARRY`
(`pitchbend`, `aftertouch`, `transport`) and the allowlist in
`rig/board/inputs.mjs` (`SYNTH_CC`, `midiVerdict`). The core's `kind` enum
(§3) is the place to settle it.

## 2. Universal and particular, side by side

| layer | universal (the core, same everywhere) | particular (one setup) |
| --- | --- | --- |
| event | `{ port, kind, ch, a, b, t }`, 8 to 12 bytes | what a note means on this synth |
| port | id, direction, medium, an `accepts` mask, a policy per kind | which USB device, which ALSA port, which UART |
| link | from, to, enabled, up to N transform ops | which knob goes to which parameter |
| transforms | a closed list of ops (section 4) | a curve someone drew for this keyboard |
| table | fixed arrays, applied as a diff | the routes for this gig |
| scene | a named table, recalled by an event | "song 3", the Circuit's session 7 |
| gate | allow, confirm or deny per message kind, at the destination | the Circuit's `Replace Patch` asks first |
| clock | one source per site, its own medium | the Circuit sends 122 bpm all the time |
| adapters | an interface: `read() -> event`, `write(event)` | USB MIDI host, DIN UART, BLE MIDI, WebMIDI, ALSA seq, the relay, a data channel |
| authoring | an interface: `propose(table delta) -> validated delta` | voice and a model, a matrix on a phone, learn by wiggling, text lines, a footswitch |
| profiles | a format: ports, kinds, ranges, names, policies | `circuit.profile`, `mk425c.profile`, `yoshimi.profile` |

The core never imports a profile, an adapter or an authoring method. They
register with it.

## 3. The event, the port, the link

```c
struct ev   { u8 port; u8 kind; u8 ch; u8 a; u16 b; u32 t; };   // 10 bytes
struct port { u8 id; u8 dir; u8 medium; u32 accepts; u8 policy[KINDS]; };
struct link { u8 from; u8 to; u8 on; u8 nops; u8 op[MAXOPS][5]; };
```

- **`kind`** is a small enum: note on, note off, cc, program, bend, pressure,
  clock, start, stop, sysex chunk, and a few for non-MIDI sources (a gesture
  value, an envelope level). A gesture and a knob are the same thing to the
  core: a channel, a number, a value.
- **`b` is 16 bits** so a 14-bit CC, a pitch bend and a MIDI 2.0 value fit
  without a second event; MIDI 1.0 uses the low 7.
- **SysEx travels as chunks** with a stream id, so the core never buffers a
  whole message. A gate that needs to read byte 6 reads it from the first chunk
  and decides for the stream.
- **Identity is `site:node:port`** (plan-patchbay §2.3) and is resolved to the
  small `u8 port` once, at the edge. The core only ever sees the number. The
  rules for resolving it come from RaspiMIDIHub (plan-wish-dawless §12): USB
  serial first, refusing placeholder serials, then the port path, then a soft
  vendor and product match only when exactly one saved entry meets exactly one
  new device.

**Budget, as arithmetic.** 64 links of 4 ops each is 64 x 24 bytes, about 1.5 KB.
32 ports is about 0.5 KB with policies. A held-note table for safe removal
(128 notes x 16 channels as bits per destination) is 256 bytes a destination.
Eight scenes as diffs, a few KB. **The whole core fits in under 8 KB of RAM**,
which is comfortable on an RP2040 (264 KB), an ESP32-S3 (512 KB), a Teensy 4.1
(1 MB) or an STM32F4, and invisible on a Pi.

## 4. The transforms are a closed list, so a model cannot invent one

Each op is 5 bytes, an opcode and up to four one-byte arguments, run in order; any op may
drop the event.

| op | does | from |
| --- | --- | --- |
| `pass kinds` | drop what is not in a kind mask | everyone |
| `chan in,out` | match a channel, rewrite it | RaspiMIDIHub `channel_map` |
| `cc a->b` | match a CC, rewrite its number | `cc_to_cc` |
| `range lo,hi,lo2,hi2` | scale a value; lo2 above hi2 inverts | `cc_to_cc` ranges |
| `curve n` | through a 16-point table from the profile | not in RaspiMIDIHub, ours |
| `note->cc cc,on,off` | a note becomes a CC, fixed or velocity | `note_to_cc` |
| `toggle` | a note flips a CC between two values | `note_to_cc_toggle` |
| `transpose s` | shift notes | everyone |
| `vel curve n` | velocity through a table | everyone |
| `split lo,hi` | only notes in a range | everyone |
| `thin hz` | at most so many events a second | ours: the relay drops silently above its cap |

What is deliberately NOT an op: anything with its own clock (an LFO, an
arpeggiator, a delay). Those are **nodes**, sources with an input, exactly as
RaspiMIDIHub makes its plugins appear as devices. The core stays a pure
function of the event and the link.

## 5. Dispatch

```c
for (l = first_from[ev.port]; l; l = next_from[l]) {    // fan out is free
  if (!l->on) continue;
  e = ev; if (!run_ops(l, &e)) continue;                  // may drop
  if (!gate(l->to, &e)) continue;                         // at the destination
  out(l->to, e);
}
```

Taken unchanged from plan-patchbay §3.2: a table, not a graph walk; fan out is
links, fan in is merge; a link that closes a cycle is refused when it is made,
and a hop counter on the event catches a cycle closed through hardware.

**Changes are diffs** (plan-wish-dawless §12): a new table is compared with the
live one; a link that stays is not touched, so clock and held notes keep
flowing; a link that goes first sends note offs for what it carried and CC 123
on its channels. Hotplug is a diff too, never a teardown.

## 6. Precautions are data, sized to the real risk

Corrected 2026-10-03: the Circuit has a factory reset (Components restores the
factory content), and the owner's sessions are backed up in
`kristjanjansen/packs`. So SysEx is an ordinary kind, and a port's policy says
what to do with each kind:

| policy | meaning | example |
| --- | --- | --- |
| `allow` | pass | notes and CCs to the Circuit |
| `confirm` | hold the stream until a person says yes, once per action | a Circuit `Replace Patch` (byte 6 is `01`, writes flash) |
| `deny` | drop and count | clock into the Circuit, which is its own master |

The policy lives in the **profile**, the check runs **at the destination**
(plan-patchbay §3.3, never moved), and the core only knows three words. A
`Replace Current Patch` (byte 6 `00`, RAM only) is `allow`. The default for a
port with no profile is `allow` for channel messages and `confirm` for SysEx,
which is a precaution, not a wall.

## 7. Where each layer runs

| layer | MCU | Pi | browser | cloud |
| --- | --- | --- | --- | --- |
| L0 core: event, ops, dispatch, gate | yes | yes | yes | no |
| L1 table, scenes, diff, persistence | yes, a binary table in flash | yes, a file | yes, for a page's own routes | stores tables |
| L2 registry, identity, validator (exists, stale, cycle, budget, accepts) | no, too much text | yes | yes | yes |
| L3 authoring: voice, model, matrix, learn | no | learn only | yes | the model |

**An MCU never parses text.** L2 compiles a table to the binary row format and
pushes it; the MCU validates only what it can cheaply (port ids exist, op codes
known, no cycle in its own table) and runs it. A table is the same bytes on
every implementation, so a Pi can hand its table to a microcontroller and the
microcontroller can carry on alone.

### The boards, from plan-hardware and to be re-checked

| board | as a router | USB host for a keyboard | network | note |
| --- | --- | --- | --- | --- |
| Raspberry Pi 4/5 | everything | yes | wifi, Ethernet | today's hub |
| Teensy 4.1 | L0 and L1 | **yes, a real host socket** | Ethernet | plan-hardware: best MIDI hardware here |
| RP2040 / RP2350 | L0 and L1 | via a PIO USB host, TO VERIFY | wifi on the Pico W | cheap, two cores |
| ESP32-S3 | L0 and L1 | **no** in ESP-IDF's stock USB stack (plan-hardware) | wifi; reaches our relay over a TLS WebSocket, measured path (§7b) | BLE MIDI, DIN by UART |
| Daisy Seed | as a node with a synth in it | no | none | hangs off a DIN cable |

The shape plan-hardware named in 2026-09 still holds and this plan makes it
cheap: **a Linux board for the transport and the authoring, a microcontroller
for the MIDI and the sound**, now running the same core and the same table.

## 8. Input methods are authoring adapters, and voice is one of them

Two different jobs share the word "input", and keeping them apart is the
whole trick:

- **A source** is routed: a key, a knob, a hand's height, the kick's loudness.
  It is a port.
- **An authoring method** makes or changes links. It never carries a note.

Some things are both (a footswitch can be a source on one link and the
"undo last link" command), and that is fine because the two roles are two
registrations.

| authoring method | what it produces | needs |
| --- | --- | --- |
| voice and a model (`/wish/`) | a table delta, shown before it applies | a phone, the network |
| typed lines (plan-patchbay level 2) | the same delta, from text | any keyboard |
| a matrix on a phone | one link at a time | a screen |
| learn by demonstration | wiggle a source, wiggle a target, one link | no model, no network |
| footswitch or spare pad | scene recall, undo, push to talk | nothing |
| a scene file | a whole table | nothing |
| a remote page (`/away/`) | a delta from another building | the relay or the direct path |

| source | kind of event | needs |
| --- | --- | --- |
| a MIDI device | every MIDI kind | an adapter |
| camera hand tracking | a value on a channel | a phone's GPU (plan-wish-dawless §6) |
| the music itself | an envelope level | the board's audio capture |
| a phone's tilt | a value | a browser |
| a timer, an LFO node | a value | a node |

Every authoring method writes the same thing, a validated table delta, so
adding the next one costs one adapter and nothing in the core.

## 9. Profiles: the particular, written down once

A profile is a small file per instrument, the only place its quirks live:
ports and their USB identity, named parameters (`filter` is CC 74 on channel 1),
ranges, a curve or two, the policy per kind, the clock role. Names are what the
model and a person use; the core sees only numbers. `demo/shell/circuit-cc.mjs`
(98 CCs read out of Novation's guide) and `demo/shell/instruments.mjs` are
already most of the Circuit's and the MK-425C's profiles.

## 10. What is not settled

| question | how to settle |
| --- | --- |
| A USB MIDI host on an RP2040 or RP2350 that holds two devices at once | build one, plug the Circuit and the MK-425C in |
| Whether an ALSA sequencer client and our raw fd can share the Circuit's port on the Pi | try it on the Pi |
| Wire latency of the core on each board | a loopback with a scope or a second clock; nobody publishes this (plan-wish-dawless §12) |
| One implementation compiled everywhere (C to wasm) vs a JS reference plus a C port sharing test vectors | decide after the JS reference exists; the vectors are needed either way |
| The binary table format and its versioning | write it with the first C port |

## 11. Steps

0. **One class vocabulary** for `bay.mjs`, `alsa.mjs` and `inputs.mjs`.
1. **Test vectors first**: a folder of `{ table, events in, events out }` cases,
   including the safe removal, cycle refusal, gate policies and every op.
2. **The JS reference core** passing them, under `bay.mjs` (which stays the
   validator), no dependencies, usable in Node and a browser.
3. **The Pi** runs it in `rig/board` behind the existing adapters
   (plan-wish-dawless §9 step 1, now on this core).
4. **Profiles** for the Circuit and the MK-425C, from the files that exist.
5. **Two authoring methods** on it: `/wish/` and learn by demonstration, to
   prove the interface takes more than one.
6. **A C port** on one microcontroller, graded by the same vectors.
