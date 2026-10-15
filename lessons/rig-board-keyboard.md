# Rig lessons: the MK-425C into the Circuit, by the board

<a id="header"></a>

## `keyboard.mjs` header

Built 2026-10-15 on *"what we need for mk425 to circuit? can we make it happen in next devices page? on pi"* and *"where is mk to pi to circuit"*. The Evolution MK-425C and the Circuit are both plugged into the Pi (`/proc/asound/Keyboard` and `/proc/asound/Circuit`, card numbers moved between two looks that day: 6 then 7 for the keyboard), so the route never leaves the Pi.

- 🔴 **NOT AN ALSA SUBSCRIPTION.** `aconnect` from the keyboard into the Circuit cannot filter (alsa.mjs refuses a filtered carry), so SysEx from the keyboard would reach the Circuit unchecked, and MEASURED 2026-10-03: while a subscription into the Circuit exists, the Circuit's raw MIDI cannot be opened for write (EBUSY), which would lock out `/away/`, `/remote/circuit/` and the board's sequencer. So the board reads the keyboard itself and writes the Circuit through its input's gate, the path the sequencer uses.
- The link is `pi-1:mk-425c:midi-out -> pi-1:circuit:midi-in { channel N }`, N 1 or 2 (synth 1, synth 2), made in the board's own bay against its announced graph, so the port's consent applies before the gate: the MK-425C announces `emits: note, cc, bend, clock`; the Circuit's midi-in accepts `note, cc, program` and never `sysex`. Bend and aftertouch are dropped at the port and counted (`dropped`).
- What then reaches `midiVerdict` (inputs.mjs): notes on 1, 2 and 10; CC 123; the SYNTH_CC set on 1 and 2; program change 0 to 63 on 1 and 2. So the mod wheel (CC 1) is refused by the gate and counted (`refused`), and a program change from the keyboard DOES select a synth patch (RAM, not flash), because both the port and the gate allow it.
- SysEx, clock, start and stop from the keyboard never become a message: `createMidiParser` (midi-back.mjs) skips SysEx whole and real time anywhere, and `eventOfBytes` has no SysEx class. Counted as `sysex` and `realtime`.
- The MK-425C sends on channel 2 (its global channel) and its keys are notes 47 to 71 (`lessons/kit-instruments.md#evolution`). The link moves the channel; nobody asked for a transpose, so none is applied.

<a id="service"></a>

## `createKeyboardService`

Verbs `kbd.link { channel }`, `kbd.unlink`, `kbd.status`, each answered `kbd.state` (`held`, `channel`, `link`, `reading`, `present`, `why`, `counts`, `written` the last eight messages written, `lat`). No payload field is named like the wire envelope (`from`, `sent`, `seq`, `by`); the test formats every answer.

- The device is open only while the link is held. A board with no link holds nothing, so anything else that wants the keyboard can have it.
- The link is the board's state, not the tab's: closing the tab leaves it held. A board restart drops it (not persisted).
- Moving to the other synth, unlinking, and the keyboard going away each end every note the link started (`held` set), so nothing hangs on the Circuit.
- A replug: the reader ends (cat prints `No such device`), the held notes are ended, and every 2 s the service looks for `/proc/asound/Keyboard` and reopens. A reason is logged once, not every retry.
- With the keyboard missing from the graph, `kbd.link` lists the ALSA ports again (`refresh`) before refusing with the port's name.
- `lat`: per note on, the time from the chunk being read in node to the write returning, the last 512.

<a id="reader"></a>

## `rawMidiReader`

`cat /dev/snd/midiC<n>D0`, with the card number resolved from `/proc/asound/<card>` at every open. A blocking read in a child process hands a byte over as it arrives, with no poll interval (the macro listener in inputs.mjs polls every 20 ms, which would be up to 20 ms of added latency here), no libuv thread held in a blocked read, and an unplug ends the process, which is the replug signal. Killing it is the close.

MEASURED 2026-10-15 on the Pi (node 24, board service running, nobody playing): `cat` opens `/dev/snd/midiC7D0` (the keyboard) and blocks; one second gave no bytes, so this MK-425C sends no active sensing or clock while idle.

MEASURED the same evening on the Pi, a separate node process with the board's own `keyboard.mjs`, VirMIDI 0-1 to 0-0 by `aconnect` (no instrument touched, the subscription removed after), 400 notes: write to VirMIDI, through the kernel's sequencer, `cat`, the pipe, node, the bay and the link, to the Circuit writer call: p50 0.22 ms, p99 0.58, worst 2.97. Inside node alone (read to write): p50 0.05, p99 0.21, worst 1.54. Not measured: the MK-425C's own USB input, the Circuit's USB output and its time to sound, and the same inside the board process while SuperCollider renders.

<a id="one-writer"></a>

## One writer into the Circuit (`board.mjs` `circuitSend`)

The sequencer and the keyboard both call `circuitSend`, which is the Circuit input's `handle({ type: 'midi.send' })`, which writes each message with one `writeSync` of its whole bytes. Node runs one thing at a time, so two sources interleave by whole message and never split one, and each write carries its own status byte, so the Circuit never reads one source's data under the other's running status. `keyboard-test.mjs` runs both into one fake port and parses the byte stream back to exactly the writes.

<a id="board"></a>

## in `board.mjs`

One service per board. A note on forwarded puts a bead on every link of the patch last sent by `screen.patch` that runs from a `mk-425c` node to a `circuit` node (`panel.patchEvent`), so the Pi's screen shows the keys going through when `/devices/keys/` has drawn that patch. `kbd.beat()` rides on `board.hello` and `board.alive` as `kbd: { held, channel, reading, forwarded }`, and while the link forwards, `kbd.state` is sent to the room once a second.

<a id="test"></a>

## `keyboard-test.mjs`

38 asserts on a fake keyboard stream into the Circuit input's own gate (inputs.mjs over a fake raw port). Among them: the lowest key on channel 2 writes exactly `90 2F 64` on synth 1; a Replace Patch head from the keyboard split over three reads with clock inside writes nothing; a Device Inquiry from the keyboard writes nothing though the gate would allow it; bend dropped, mod wheel refused, program change above 63 refused; unlink, a channel move and an unplug each end the held note; the sequencer and the keyboard into one port, 393 writes, every one whole.

SABOTAGED 2026-10-15: a copy of `keyboard.mjs` that carries a chunk starting `F0` raw to the Circuit (what an ALSA subscription does) took 5 asserts red, the Device Inquiry one first. The Replace Patch assert stayed green under that sabotage because the gate refuses a Replace Patch too: two locks, and this test only proves the first when the second would let the message through.
