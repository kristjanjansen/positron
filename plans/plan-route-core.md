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

⚠️ **TWO THINGS IN THIS SECTION DID NOT SURVIVE THE REFERENCE, 2026-10-03, see §12.**
`range` here scales a value, and in `bay.mjs` it is the note number filter this
table calls `split`; the reference kept bay's meaning and named the value op
`scale`. And the core is NOT a pure function of the event and the link: `toggle`
and `thin` keep state per link, and `thin` reads time.

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
⚠️ The reference refuses a cycle made of links and has no hop counter: what the
core writes never re-enters its own inputs, so a loop can only close through a
device, and nothing catches that yet (§12).

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
⚠️ **A POLICY PER KIND CANNOT SAY THE EXAMPLE IN THE TABLE ABOVE**, because the
Circuit's `Replace Patch` and `Replace Current Patch` are both `sysex` and only
byte 6 tells them apart. The reference adds a port's `rules`: byte prefixes
(any byte may be a wildcard), the first match beating the per kind policy, read
from a stream's first chunk only. The C struct needs a short rules list too.

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

**Chosen 2026-10-03: a Raspberry Pi Pico 2 W (RP2350 with wifi and Bluetooth),
€12.00 at Oomipood, in stock.** The W is needed, decided the same day: with a
powered USB hub on its only USB socket (Circuit, MK-425C and more behind it, no
DIN needed) the socket is a host, so wifi is the only way to send it a new
table without reflashing. The plain Pico 2 is €8.20. The Teensy 4.1 was suggested first and turned down as overkill. The
Pico 2's own USB socket is a host through a €4 OTG cable (TinyUSB host, one
device, or several behind a hub), DIN in and out are a 6N139 optocoupler (the
6N138 is not stocked) and two €1 sockets, and flashing is copying a `.uf2` to a
drive, which needs nothing native on the Mac. About €16 for the whole router.
The board must then be powered on VSYS, since its USB socket is busy being a
host. ⚠️ Read from documentation and a shop page, nothing measured on a board
here, and two USB instruments at once (a hub or a PIO second port) is still
unverified.
⚠️ **AND THIS LAPTOP CANNOT RUN WHAT IT COMPILES.** ThreatLocker kills any
native binary under the home directory (exit 137). MEASURED 2026-10-03: a C
program compiled and run inside a `gcc:14` container under OrbStack printed and
exited 0, so the C core is built and tested in Docker. Flashing a board needs a
native loader on the Mac, which may be killed; the M1 is the fallback.

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
| ~~Whether an ALSA sequencer client and our raw fd can share the Circuit's port on the Pi~~ | **SETTLED 2026-10-03, MEASURED on the Pi (Circuit as card 7, ALSA client 44):** with the raw device open for write, `aconnect 14:0 44:0` is refused with `Resource temporarily unavailable`, and a read subscription (`aseqdump -p 44:0`) still works. The other way round, with a subscription in place, opening `/dev/snd/midiC7D0` for write does not fail, it BLOCKS. So every route into a gated device on the Pi runs in userspace through the board, never as a kernel subscription, and `inputs.mjs`'s `midiOpen()` (a plain `openSync`) would hang the board if anything ever subscribed first. |
| A loop closed through a device (A to B by a link, B echoing to A by its own MIDI thru) | the hop counter §5 names needs a field the event does not carry yet |
| `thin` drops the last value of a fast sweep, so the destination ends short of the knob | a trailing send needs a timer tick the core does not have; decide whether the core gets a tick or the adapter flushes |
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

## 12. What building the JS reference settled, 2026-10-03

`demo/shell/route-core.mjs` and its vectors in `demo/shell/route-vectors/`,
graded by `route-core-test.mjs` and shown on `https://positron.studio/rout/`.
Steps 0, 1 and 2 of §11 are done. What the code had to decide that this plan
left open, each now fixed by a vector:

| question | decided | why |
| --- | --- | --- |
| `range` | bay's note filter keeps the name, the value op is `scale` | `bay.mjs` and `/wish/`'s model already use `range` |
| policy granularity | per kind, plus byte prefix `rules` on the port | §6's own example needs byte 6 |
| purity | the core is a function of the event, the link and the link's state | `toggle` and `thin` keep state |
| rounding in `scale` | nearest, ties away from zero, integers only | so C does the same; vector 05 tells it apart from half up and from truncation |
| CC 123 on unlink | on every channel the link ever delivered a note on | the plan's "on its channels" reads two ways |
| release on unlink | note offs sorted by channel then note, then CC 123, skipping the gate | the safety message must reach a port that took the notes |
| `thin` | counts only cc, bend and touch, one budget per link | thinning a note off leaves a note stuck |
| SysEx | a chunk with no status byte continues the open stream; the gate's decision on the first chunk holds for the stream | the core never buffers a whole message |
| a first chunk shorter than a rule | judged on what it has, so it is held rather than slipping past | a head too short to read byte 6 must not pass |
| link order | outputs follow input order, then link creation order | part of the contract a C port has to match |

~~**Not yet in the reference:** `curve`, `vel curve` and a plain `note->cc`.~~
**All three landed 2026-10-04**, in both languages, as `curve`, `velcurve` and
`notecc` (§4's `curve n`, `vel curve n` and `note->cc`), with vectors 23 to 26.
JS 99/99 to 115/115, C 82/82 to 98/98. What they had to decide:

| question | decided | why |
| --- | --- | --- |
| what a curve is | 2 to 16 `[in, out]` points, each 0..127, inputs rising strictly; straight lines between them, rounded as `scale` rounds (nearest, ties away from zero, integers) | one rounding rule in the core, and integers so the C matches; vector 23 has a positive tie, 24 a negative one |
| outside the points | the end point's out, at both ends | a table drawn from 16 to 112 means "flat outside", not "keep the slope"; 23 grades the low end, 25 the top |
| which values `curve` reshapes | every cc, bend and touch, or one kind with `cls`, or one CC with `cc` | the same three kinds `thin` counts; `cls` other than cc with a `cc` is refused |
| a bend through a 0..127 table | in its own 14 bits, each point read as p * 128 except 127, which is 16383 | 64 lands on the bend's centre, 127 on its top, and an identity table is exact; plain p * 128 would never reach 16383 (vector 24) |
| a channel touch | its pressure is the SECOND byte (Dn has two), a poly touch's the third | vector 24 |
| `velcurve` on a note on | the curve, then clamped up to 1 | a table that reaches 0 must not turn a note on into a release (vector 25) |
| `notecc` | `{ note, cc, on?, off? }`: a press sends `on` (127 if left out, the velocity if `'vel'`), a release sends `off` (0 if left out), on the note's own channel; other notes pass; no state | 127 and 0 are `toggle`'s defaults; stateless is what tells it from `toggle` (vector 26) |
| a table in the C op encoding | ops stay 6 bytes; a table lives in a per core store of `ROUTE_MAX_CURVES` (8) slots of 16 points, copied in at link time, an equal table shared and counted, freed when its last op is unlinked; the op holds the slot | 32 bytes inline on every op is 8 KB at 64 links of 4 ops, the whole budget; the store costs 288 bytes. A link whose tables do not fit is refused `ROUTE_FULL`, checked last, and takes nothing |
| `'vel'` in C | `ROUTE_VEL`, a sentinel far below every range, packed as 0x80 | so `on: 128`, which the JS refuses, cannot be read as `'vel'` in C |

MEASURED the same day: `sizeof(route_core)` 6064 to 6352 bytes on x86_64 and
6052 to 6340 on a Cortex-M4, still under §3's 8 KB; the M4's `.text` 4264 to
5400 at -Os. Every new op was sabotaged in both languages and went red; two
sabotages went GREEN on the first run and were holes in the new vectors, both
repaired (`cls` ignored, and extrapolating below the first point), recorded in
`route-core-test.mjs`. ⚠️ Not settled: whether a profile wants more than 16
points or more than 8 distinct tables, and whether a 14 bit CC pair (MSB plus
LSB on CC n + 32) should be curved as one value. Today `curve` sees only the
7 bit CC it is given.
