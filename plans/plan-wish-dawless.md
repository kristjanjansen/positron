# plan-wish-dawless: Wish without a laptop, the Pi as the hub

> Asked 2026-10-03: *"Giving the ideqa about wish and general mapp anything to
> anywhere how it would fit it into dawless setups. What is hun? Pi? What
> listens? A phone browser? Pi attached cheap mike? Camera interepting
> gestures? Random ideas"*, then *"Add plan etc"*.
> **NOTHING IN THIS PLAN IS MEASURED.** It is reasoning from what is already in
> the repository. §8 lists what would have to be run to turn each claim into a
> fact. Latency figures marked ESTIMATE are guesses and must not be quoted.

## 1. The verdict

Make the Pi the hub and the phone the ear and the screen. The model only ever
writes rows in a route table that the Pi holds. It is never on the path a note
travels. The first step is small: move the route table from the `/wish/` page
into `rig/board`, so that rows made on a phone keep working with the phone
locked and the internet gone.

## 2. Today's shape, and why it is not DAWless

`/wish/` (https://positron.studio/wish/) runs on a laptop:

- the browser does WebMIDI (`requestMIDIAccess` behind a press);
- `node demo/wish-local.mjs` holds the Cloudflare credential, because a browser
  cannot;
- a Workers AI model turns speech or text into a proposed connection;
- `demo/shell/bay.mjs` validates it (pure, graded by `demo/shell/bay-test.mjs`),
  a row appears, and `×` takes it down.

Take the laptop away and three jobs have no home: **holding the routes**,
**hearing the player**, and **showing what is connected**.

## 3. The split: slow brain, fast hands

| layer | speed | needs network | who does it |
| --- | --- | --- | --- |
| setup: say a wish, get a row | seconds | yes (model) | phone plus Workers AI |
| performance: notes, knobs, gestures, audio through rows | milliseconds | no | the Pi |

The reason is already measured in `demo/manifest.mjs` above the `wish` row: on
the day `/wish/` was built, the 70B returned a valid patch pointed at the
**wrong instrument**, and no validator can catch that. A model that only writes
rows a person can read costs one `×` when it is wrong. A model in the note path
would cost a wrong note on stage.

## 4. The hub: the Pi

`rig/board` on the Pi (a Pi 4 by `rig/board/README.md`) is most of a router
already:

- the Circuit is attached, and `rig/board/inputs.mjs` already gates which MIDI
  reaches it (the 52 synth CCs on ch 1 and 2 since session 59);
- `rig/board/rtc.mjs` gives a browser a direct data channel to it, board round
  trip **4 ms** on one network (MEASURED 2026-09-30, `plans/plan-away-webrtc.md`
  §9);
- `snd-virmidi` and `aconnect` are already on it (`rig/board/README.md`), which
  is a kernel patchbay.

What it would gain:

- **A route table it owns and persists.** A row is
  `{ from: port+message, to: port+message, range, curve }`. A plain one to one
  route could compile to `aconnect`; anything with a range or a curve runs in a
  small forwarding loop in Node. Rows survive a reboot and work with no network.
- **Scenes.** Named sets of rows, recalled by a footswitch or by a Circuit
  program change. Switching a Circuit session could switch the routes with it.
- **Precautions live at the hub, not at the page.** Every route ends in the
  Pi's gate. CORRECTED 2026-10-03: the Circuit DOES have a factory reset
  (Components restores the factory content), and the owner's sessions are
  backed up in `kristjanjansen/packs`, so SysEx is an ordinary message type with
  a precaution (a flash-writing `Replace Patch` asks first), not a wall.

## 5. What listens

| option | for | against |
| --- | --- | --- |
| **phone browser, hold to talk** | best mic present, a screen to read the proposed row, `getUserMedia` already works in `/wish/` | the phone has to come out |
| cheap USB mic on the Pi | no screen, hands free | the room is full of the player's own music, so speech competes with the mix; needs push to talk; nothing shows what it understood |
| wake word on the Pi | no button | false triggers from the music, always listening |

**Recommendation: the phone hears and shows, the Pi decides.** Talking only
while a button is held. The button can be on the phone, a footswitch the Pi
reads, or a spare Circuit pad, so hands stay on the instrument. The Pi answers
with one short confirmation (*"mod wheel to Circuit synth 1 filter"*) through a
small speaker or a phone notification, which stands in for the screen when the
phone is in a pocket.

## 6. Camera gestures

- **For continuous control, not for commands.** Hand height to cutoff, hand
  spread to reverb, two hands as an XY pad. ESTIMATE: camera plus hand tracking
  is 50 to 100 ms or more, fine for a sweep and late for a hit.
- **Run it on the phone.** MediaPipe Hands in a phone browser uses the phone's
  GPU. A Pi 4 would manage a few frames a second (ESTIMATE). It also keeps the
  Pi's camera out of it, which matters: the Pi camera is to be **off by default
  and enabled only by an env var** (BACKLOG, asked 2026-09-30, privacy).
- **A gesture is just another source.** *"left hand height to Circuit drum 2
  decay"* is a wish like any other, and it arrives at the Pi as a row.

## 7. Further ideas, unranked

- **The Pi listens to the music, not to the player.** The board already captures
  the Circuit's audio. An envelope follower on it is a source: *"kick loudness
  ducks the synth filter"* is sidechain compression without a compressor.
- **Instrument to instrument with no computer in the loop**: Evolution knobs to
  Circuit macros, Circuit pads to Yoshimi on the Pi.
- **Wish by demonstration.** Say *"this"*, wiggle a knob, *"should move that"*,
  wiggle the target. The Pi sees both messages and builds the row with no model.
  The most reliable mapping there is; the model only names it.
- **Undo with a foot.** Hold a footswitch two seconds and the last row goes. The
  same as `×`, with no screen.
- **Edits by voice**: *"only the top half"*, *"slower"*, *"inverted"* change a
  row's range or curve. A small edit is easier to get right than a whole routing.
- **Remote wishes.** `/away/` (https://positron.studio/away/) already reaches the
  Pi from another building over the direct path; somebody there could lay a row
  on this desk and the player would see it arrive.

## 8. What is not known, and what would settle it

| question | how to settle |
| --- | --- |
| Speech to row time on a phone, end to end | time `Hold to talk` release to row on `/wish/` from a phone, with Workers AI; `research/cf-models-speech-to-patch-2026-09-21.md` has the model survey but nothing was timed |
| Does a phone mic pick out a voice at playing volume | one test in the room with the Circuit playing |
| Added latency of a Node forwarding loop vs `aconnect` on the Pi 4 | `rig/board/bench.mjs`-style timestamps on a loopback through `snd-virmidi` |
| Hand tracking latency and frame rate on a phone browser | a throwaway page with MediaPipe Hands and a timestamped CC out |
| Whether the Pi is really a Pi 4 | `cat /proc/device-tree/model` on it (README says Pi 4) |

## 9. Steps, in order

1. **Route table on the board.** `rig/board/routes.mjs`: rows, persistence to a
   file, a forwarding loop, every output through the existing gate, changes
   applied as a diff, Circuit routes never in the kernel (§12). A test in
   `rig/board/test.mjs` style, no device.
2. **`/wish/` writes rows to the board** instead of holding them in the page,
   over the board's existing relay and direct paths. `×` deletes the row on the
   Pi. Rows outlive the page.
3. **Credential off the laptop.** `wish-local.mjs` becomes a route on an existing
   Worker the phone can call, so no laptop process is needed. Needs a decision on
   who may call it (a visit must still reach nothing, per CLAUDE.md).
4. **Push to talk from hardware.** A footswitch or a spare Circuit pad starts and
   stops capture on the phone through the board.
5. **Scenes**, recalled by program change.
6. Then pick from §7: wish by demonstration first, it needs no model.

## 10. Instrument to instrument: the cables

Asked 2026-10-03: *"How i strument to instrument? Cables?"*

USB cables, every instrument into the Pi, none into each other. The Pi is the
USB host and forwards between its own ports.

```
Evolution keyboard ──USB──┐
                          ├── Pi (route table, gate) ──USB──► Circuit
phone (wishes) ──wifi─────┘                        └─USB──► another synth
```

- **The Circuit is wired this way already.** Notes go to its own raw MIDI port
  over USB (`rig/board/inputs.mjs:314`), and its audio comes in through a
  separate USB audio card (`hw:CARD=Pro`, `inputs.mjs:103`).
- **The Evolution is a USB keyboard**; CoreMIDI names it `MK-425C USB MIDI
  Keyboard` (`demo/shell/midi.mjs:29`). It plugs into the laptop today and would
  plug into the Pi.
- **A route is the Pi reading one port and writing another**, rewritten on the
  way: an Evolution knob's CC on ch 1 becomes the Circuit's filter CC on the
  channel it listens to, through the existing gate.
- **A plain DIN cable between two synths works for notes with no Pi** but is
  fixed: the receiver only answers the CC numbers and channels it already
  listens for. The Pi in the middle is what remaps, scales, curves, switches
  scenes and takes wishes.
- Limits: a Pi 4 has four USB ports, so more instruments need a powered hub. A
  DIN-only instrument needs a USB-MIDI cable or a MIDI HAT (§11). MIDI only; the
  audio still goes to a mixer. Two USB MIDI devices forwarding through this Pi
  has never been measured (§8).

## 11. Prior art: hardware MIDI routers, and a Pi doing the same

READ 2026-10-03 from vendor pages, shops and GitHub. Prices are list prices seen
that day and move. Nothing here was used on this desk.

### The boxes

| box | USB host | DIN | mapping | how it is edited | price |
| --- | --- | --- | --- | --- | --- |
| **CME H4MIDI WC** | yes, up to 8 in 8 out through a hub | 2 in 2 out | router, filter, mapper, 4 presets | free HxMIDI Tools app, saved to the box | ~$70 |
| **Retrokits RK-006** | yes | 2 in, 10 out, outs switchable to gate/PWM | routing, clock, plays MIDI files from a stick | editor | ~$150 to 200 |
| **Blokas Midihub** | **no**, USB device only | 4 in 4 out | "pipes", a chain of MIDI effects | Midihub Editor | ~$219 |
| **BomeBox** | yes, plus Ethernet and wifi | 1 in 1 out | full MIDI Translator Pro rules | made on a computer, then runs standalone | ~$215 to 250 |
| **iConnectivity mioXM** | 4 ports | 4 in 4 out | routing, filters, RTP-MIDI over Ethernet | Auracle app | ~$300 |
| **Conductive Labs MRCC** | 4 ports | 5 in 10 out | routing matrix, filters, remaps on a front panel | the box itself, no computer | ~$439 to 499, quoted 1 to 3 ms added |

What they agree on, which is the useful part:

- **Every one keeps the routes in the box and runs with no computer.** That is
  §4's route table, and it is the market's verdict on where routes belong.
- **None of them takes a wish.** Routes are made in an editor app, on a front
  panel, or by MIDI learn. Nothing found names a connection from speech or text.
  That gap is `/wish/`'s whole reason to exist.
- **Midihub cannot host a USB keyboard**, which rules it out for a desk of USB
  instruments however good its effects are.
- **The cheap end is ~$70 (CME).** A Pi 4 plus a case and a power supply costs
  more than that. The Pi wins only if it does things a box cannot: wishes,
  audio-driven sources, a phone UI, `/away/`. It already does the last one.

**CME's code is not available** (asked 2026-10-03). The firmware and the
HxMIDI Tools editor are proprietary, with no repository. The one public account
of the protocol is PatchForge's black box write-up of the sibling **U6MIDI Pro
and U2MIDI Pro**: SysEx frames captured off the USB wire, frame, checksum,
router and filter maps, the mapper unfinished, no code repository linked and no
licence stated. Nothing covers the H4MIDI WC. So a CME box can be configured
only through its app or by reverse engineering, and a wish could not write to
it without that work.

### The Pi doing it

- **`aconnect` is the baseline.** ALSA's sequencer connects ports in the kernel;
  every Pi project below builds on it.
- **Blokas Patchbox OS** ships `amidiauto`, which connects USB devices
  automatically, and **`amidiminder`** (Blokas community), which remembers
  connections by name, reconnects a device that comes back, and reads rules
  from `/etc/amidiminder.rules`. That is a persisted route table with hotplug.
- **Blokas Pimidi**, a DIN MIDI HAT on I2C, quoted loopback **1.28 ms**, the
  answer for DIN-only instruments.
- **RaspiMIDIHub** (`wamdam/raspimidihub`, GPL-3.0, ~41 stars): **the closest
  thing to this plan that exists.** All-to-all routing with hotplug, plain routes
  in the kernel ("virtually zero"), mapped routes in userspace at a quoted
  1 to 3 ms, CC remapping with range and inversion, note to CC, channel remap,
  MIDI learn, drawable curves, and a **phone web app over the Pi's own wifi
  access point**, Python with no dependencies. No scenes. No voice.
- **MidiRouter** (`lzulauf/MidiRouter`, Python), device to device mappers with
  channel filters and remaps, Pi 3b/4/5.
- **PiMidiBox** (`geeksunny/PiMidiBox`), Node.js, a configurable USB MIDI host
  router. Same language as `rig/board`.
- **rpi-usb-host-midi-hub** (`gdsports`) auto-patches two USB devices from a udev
  rule plus a Python service and links Pis over ipMIDI; its README warns
  **against wifi** for the link (delay and packet loss).
- **Zynthian**, a Pi synth platform with MIDI routing in its web config and a
  MIDI filter rule language.

### What this changes in the plan

- **§4's split is confirmed by prior art, not just reasoning**: RaspiMIDIHub does
  exactly kernel routes for plain links and a userspace loop for mapped ones, and
  quotes 1 to 3 ms for the second. Still to be measured here (§8).
- **Read RaspiMIDIHub before writing `routes.mjs`.** Its row model (range,
  inversion, curve, note to CC, MIDI learn) is a tested vocabulary for what a
  wish should be allowed to produce. GPL-3.0, so read for ideas, do not copy code
  into this repository without deciding on that.
- **`amidiminder`'s rules file is the persistence format to beat**: by name,
  survives replugging and reordering. Ours must too.
- **What nobody has, and what positron would add**: a route made from speech, a
  route whose source is the music itself (§7), scenes tied to the Circuit's
  session, and the same table reachable from another building (`/away/`).

Sources: [CME H4MIDI WC](https://www.cme-pro.com/product/usb-host-midi-interface/),
[Retrokits RK-006](https://retrokits.com/rk006/),
[RK-006 review, Sound On Sound](https://www.soundonsound.com/reviews/retrokits-rk-006),
[Blokas Midihub](https://blokas.io/midihub/),
[Midihub at Perfect Circuit](https://www.perfectcircuit.com/blokas-midihub.html),
[BomeBox, Sonicstate](https://sonicstate.com/news/2016/09/27/whats-a-bomebox-and-why-would-i-need-it/),
[iConnectivity mioXM](https://www.sweetwater.com/store/detail/mioXM--iconnectivity-mioxm-usb-midi-interface),
[Conductive Labs MRCC](https://www.perfectcircuit.com/conductive-labs-mrcc.html),
[MRCC FAQ](https://conductivelabs.com/faq/),
[amidiminder](https://community.blokas.io/t/amidiminder-utility/2243),
[Patchbox OS as a USB MIDI host](https://community.blokas.io/t/raspi-as-a-usb-midi-host-on-patchbox-os/2795),
[Blokas Pimidi](https://blokas.io/pimidi/),
[RaspiMIDIHub](https://github.com/wamdam/raspimidihub),
[MidiRouter](https://github.com/lzulauf/MidiRouter),
[PiMidiBox](https://github.com/geeksunny/PiMidiBox),
[rpi-usb-host-midi-hub](https://github.com/gdsports/rpi-usb-host-midi-hub),
[Zynthian MIDI routing](https://discourse.zynthian.org/t/midi-routing/4708),
[HxMIDI Tools start guide](https://www.cme-pro.com/start-guide-for-uxmidi-tools-software-by-cme/),
[PatchForge, reverse engineering the CME U6MIDI Pro](https://patchforge.nl/blog/reverse-engineering-the-cme-u6midi-pro-part-1).

## 12. RaspiMIDIHub read in full: what to take, what to refuse

Asked 2026-10-03: *"Read the code and get ideas"*. READ at
`wamdam/raspimidihub` HEAD `3a66112` (2026-09-20), about 83,000 lines of
Python and JavaScript, cloned to a scratchpad and read by two agents, one on the
engine and one on the interface. **Nothing was run, nothing was copied** (GPL-3.0).
Paths below are inside that repository's `src/raspimidihub/` unless named.
Spot-checked by hand: the hotplug teardown, SysEx in the default filter, unknown
types passing, MIDI-CI on by default, no cycle detection in the Python, the
presets removal in `CHANGELOG.txt`, and the captive DNS line.

### How it works

- **Two paths per route.** A route with no filter and no mapping is one kernel
  `subscribe(src, dst)`. Anything else goes to a Python loop with its own pair of
  sequencer ports per route (`midi_engine.py:34`, `midi_filter.py:408`). Adding a
  mapping silently moves a route to the slow path.
- **A change is a diff.** `apply_edge_diff` (`midi_engine.py:1271`) keys routes by
  `(src_stable_id, src_port, dst_stable_id, dst_port)` and leaves each untouched,
  updates it in place, swaps, adds or removes it. Removing a route first sends
  note-offs for the notes it carried and CC 123 on its channels (`:1388`).
- **The row.** `{src_stable_id, src_port, dst_stable_id, dst_port,
  filter: {channel_mask, msg_types}, mappings: [...]}`. Mapping types are
  `note_to_cc`, `note_to_cc_toggle`, `note_to_note`, `cc_to_cc` (in and out
  range) and `channel_map`, each with `dst_channel` and `pass_through`; inverted
  means out min above out max; no curves (`midi_filter.py:45`).
  `validate_new_mapping` (`:194`) refuses a mapping that changes nothing and an
  exact duplicate.
- **Device identity** (`device_id.py`): `vid:pid` plus the USB serial, refusing
  placeholder serials (a Digitone II ships `000000000001`, `:76`); without a
  serial, the USB port path; a soft VID:PID match only when exactly one saved
  entry meets exactly one new device; identical units get `#N` and are never
  guessed between (`:559`, `:569`).
- **Persistence.** Read-only root, config on the boot partition written in a short
  rw window with `sync`; two gzip autosave slots alternating, the checksum tells a
  torn slot, the higher sequence wins (`config.py:45`). Rows for an absent device
  are kept, drawn dimmed, and re-applied when it returns (`:674`).
- **Interface.** REST plus one SSE stream with explicit subscriptions; a 100 event
  queue per client that drops the oldest. Learn: arm, take the next message, 30 s
  timeout, result over SSE (`api/plugins.py:43`, `api/__init__.py:93`).
- **Scene-like things** exist only for plugins: 8 pattern slots recalled by a
  trigger note and quantised to the bar (`slot_bank.py:250`), and controller
  "drop" snapshots fired now or at the next 1 to 16 bars with a fade, held
  0.5 s to capture (`controller_base.py`). **Routing presets were removed in
  3.1.0** (`CHANGELOG.txt`, 2026-05-11). Program change recalls nothing.
- **No internet**: its own wifi access point at `192.168.4.1`, every DNS name
  answered by the Pi (`wifi.py:280`), a captive landing page, and USB tethering.
- **Network MIDI** is AppleMIDI on the LAN only, journal ignored
  (`apple_midi.py:35`), no NAT traversal. Nothing reaches another building.

### Their latency numbers are not wire numbers

The quoted 1 to 3 ms times only their own Python call around `process_event`
(`midi_engine.py:1040`), and `perf_stats.py` says input to wire needs external
capture and is out of scope. Worth taking anyway: `isolcpus=2,3 nohz_full=2,3`,
the loop pinned to one core, `Nice=-5`, the input FIFO raised to the kernel's
2000 events with overflows counted (`alsa_seq.py:149`). No SCHED_FIFO.

### The traps, the Circuit's first

1. **A kernel route into the Circuit bypasses `rig/board/inputs.mjs` entirely.**
   Our gate writes raw bytes to the Circuit's rawmidi device; an ALSA
   subscription carries SysEx past it. **Hard rule for `routes.mjs`: a route whose
   destination is the Circuit always runs in userspace through the gate, never in
   the kernel.** Unknown: whether a sequencer client and our raw fd can hold that
   device at once. Measure before building.
2. **SysEx is open by default** (`sysex` in the default `msg_types`,
   `midi_filter.py:27`) and **unknown event types pass** (`:318`). Ours denies by
   default.
3. **A SysEx Sender plugin** streams any uploaded `.syx` with no check of byte 6.
   **MIDI-CI probing is on by default** (`config.py:180`) and sends Universal
   SysEx to every two-way device on connect. Port neither.
4. **Any hotplug tears down every route** and rebuilds after 0.5 s
   (`_scan_and_connect`). Plugging a pedal cuts held notes everywhere. Diff
   instead.
5. **Loop prevention is in the manual, not the Python.** Write cycle detection.
6. **Port numbers as identity** break if a firmware reorders ports.
7. **Their offline access point is plain http**, which is not a secure context,
   so a phone browser will not give it the microphone, and the phone has no
   internet for Workers AI. Voice cannot use that route. Keep
   https://positron.studio plus the data channel.
8. **Learn takes the first message that arrives.** On a Circuit sending clock and
   CCs that is wrong. Filter by source and require movement.
9. Phone faders over HTTP `PATCH` are too coarse for gestures; use the data
   channel.

### Ideas taken into this plan, ranked

1. **Diff, never rebuild** (`midi_engine.py:1271`), with note-offs and CC 123 on
   removal. It is what makes `×`, scene recall and hotplug safe. §9 step 1.
2. **Device identity rules** as `rig/board/devid.mjs`, with the same refusals and
   a test list modelled on `tests/test_device_id.py`. `inputs.mjs:320` finds the
   card by `/proc/asound/<id>`, which collides for two identical units.
3. **Their mapping types as the closed vocabulary a wish may produce**, plus a
   curve, plus their no-op and duplicate refusal, checked before `/wish/` shows a
   row.
4. **The board publishes what exists**: ports, stable ids and the allowed row
   vocabulary, and the wish prompt is built from that list, which attacks the
   wrong-instrument failure head on (after their self-describing `/api/routes.json`).
5. **Wish by demonstration** on a server-side learn (arm, take, time out, answer
   with an id), done twice for source and target, filtered by source and needing
   movement. §7, no model needed.
6. **Scenes fire at the next bar** of the Circuit's clock, optional fade; a
   footswitch tap fires, a 0.5 s hold captures or undoes (after their drops).
7. **Two checksummed autosave slots** for `routes.json`; rows for an absent device
   kept dimmed and re-applied.
8. **Measure the wire.** Nobody publishes it; §8 already asks.
9. **Publish only while watched** (`spectator.py`) for `/away/`'s state.

### What they lack and this plan has

Voice or any language input, audio as a source (no audio code at all), scenes
tied to the Circuit's sessions (their presets were removed and program change
triggers nothing), anything beyond one LAN, and a refusal gate on SysEx.

Nothing here touches somebody else's server, and nothing sends SysEx.
