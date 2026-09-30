# plan-away-webrtc: a direct path from the browser to the Pi for /away/

> Asked 2026-09-30: *"write webrtc path to plan"*, after *"can we bring roundtrip
> more down"*. **Nothing here is built.** The measurements marked MEASURED were
> taken on 2026-09-30 on this desk; everything else is marked as reasoning or as
> read, and §7 lists what would have to be run to turn each one into a fact.

## 1. The verdict

Build it. The relay costs about **72 ms of the 93 ms** it takes a key press to
come back as sound, and the same two machines are **4.1 ms apart** on the local
network. A WebRTC data channel between the browser and the Pi can use that
short path when it exists and a direct internet path most of the time when it
does not, with the relay kept for signalling and as the fallback.

The one real cost is that `rig/board` gets its **first npm dependency**,
`node-datachannel`, a native module. `rig/board/setup.sh:8` records that the
board installs Node 22+ precisely so it needs no npm package for WebSocket.
Adding one here is a decision, not a detail.

Expected result, reasoned and not measured: key press to sound arriving goes
from about **93 ms to about 20 ms** on the local network, and key press to
speakers from about **175 ms to about 50 ms**.

## 2. Where the 93 ms goes today (MEASURED 2026-09-30)

| step | time | how it was measured |
|---|---|---|
| browser to relay | ~18 ms | relay self-echo from the laptop, round trip p50 36.6 ms, halved |
| relay to Pi | ~18 ms | relay self-echo run on the Pi, round trip p50 35.5 ms, halved |
| MIDI to the Circuit, its synth, the Fast Track Pro's converter | a few ms | not separated; inside the total |
| `arecord` period | up to 10 ms | 480 frames at 48 kHz, read off `/proc/asound/Pro/pcm0c/sub0/hw_params` |
| filling a 20 ms frame | up to 20 ms | the frame size |
| Pi to relay to browser | ~36 ms | the same two legs |
| **press to arrival, end to end** | **78 to 99 ms, median ~93** | 6 notes from silence, onset found in the returning frames |
| playout cushion | 80 ms | `/away/`'s setting, raised by the playout itself if it runs dry |

**The relay legs are 4 x ~18 = ~72 ms. Everything else is ~21 ms.** The relay
is the target.

The floor, MEASURED: `ping` from the laptop to the Pi, 20 packets, **4.1 ms
average round trip**, 3.0 to 4.9.

## 3. What this repository already knows about data channels (READ, from its own measurements)

From `proto/jam/NOTES.md`, measured in August:

- **A direct data channel is about 1.0 ms one way** between two browsers on
  one machine, against about 37 ms through a Durable Object room. Through a TURN
  server in Docker it was 1.6 ms, so TURN software adds about half a millisecond.
- **Under 2% real UDP loss, ordered and reliable is the wrong choice for live
  sound.** Ordered reliable delivery lost nothing but stalled behind a lost
  packet with a **p95 of 417 ms and a p99 of 412 ms**, the SCTP retransmit
  timeout. **Unordered with `maxRetransmits: 0` lost 1.6 to 5% and held a p95 of
  2.5 to 5.3 ms with no tail.**
- **JSON costs nothing at MIDI sizes**: a JSON message against a binary one
  differed by -0.4 ms, which is noise.
- Cloudflare's Realtime SFU accepts data-channel-only sessions. It is **not**
  needed here and is not proposed: its measured p50 was 15 ms, worse than direct.

## 4. The Pi end works (MEASURED 2026-09-30, on the board)

- **`node-datachannel` 0.33.4 installs on the Pi in 4 s with no compiler**:
  a prebuilt linux arm64 binary, 1.1 MB. It wraps `libdatachannel`, which
  Debian does not package at all (`plans/plan-stage-live.md` found that while
  looking at OBS), so npm is the only route short of building it.
- **Two peers in one process on the Pi, an unordered channel with no
  retransmits, 1,932 byte messages (today's frame size): 200 of 200 echoed,
  round trip p50 0.96 ms, p99 1.53 ms.** That is the library and the Pi's CPU,
  not a network; it says the Pi end adds about a millisecond.
- The probe was installed in `/tmp` and removed. Nothing was added to
  `/opt/positron-board`.

## 5. The design

### 5.1 Signalling goes through the room that already exists

The page and the board already share `studio-1-circuit`. Offer, answer and ICE
candidates travel there as three new message types, `rtc.offer`, `rtc.answer`,
`rtc.candidate`, each carrying a peer id so two browsers cannot answer each
other. No new worker, no new Durable Object. `workers/rtc` exists for
many-to-many video and is not needed.

### 5.2 Two channels per browser

| channel | settings | carries | why |
|---|---|---|---|
| `pcm` | `ordered: false`, `maxRetransmits: 0` | the audio frames, same 12-byte header | a late frame is useless; §3's loss numbers |
| `ctl` | `ordered: false`, reliable | `input.want`, `midi.send`, `midi.panic`, `audio.status` | a note off must arrive, but must not queue behind a lost note on |

⚠️ **UNORDERED MEANS A NOTE OFF CAN OVERTAKE ITS NOTE ON** on a fast tap, which
would leave a note stuck. Each `midi.send` carries a per-key sequence number and
the board drops a note on older than the last note off it saw for that key.
That rule is pure and gets a test with the reorder as its negative control.

The `ctl` messages go through the **same `handle()` as the relay path** in
`rig/board/inputs.mjs`, so `midiVerdict` (note on, note off and all-notes-off
on channels 1, 2 and 10 only) guards both paths from one place. A data channel
must not become a way around the gate.

### 5.3 10 ms frames on the direct path

A 20 ms frame is 1,932 bytes, which SCTP splits into two chunks at a ~1,200
byte payload. With `maxRetransmits: 0`, losing either chunk loses the frame.
**A 10 ms frame is 972 bytes and fits one chunk**, and it takes about 5 ms off
the average wait to fill a frame. That is 100 messages a second per listener,
which a data channel carries freely; the relay path stays at 20 ms because its
limits and its playout are tuned for that. The page kit already takes `frameMs`
(`demo/shell/board.mjs`), and the board already says its frame length in
`board.hello`, which the page checks against the frames that arrive.

### 5.4 The relay stays, as the fallback

`/away/` tries the direct path when Listen is pressed and falls back to the
relay if the channel is not open within 3 s. Both can be up at once during the
switch; the page plays from whichever it chose and ignores the other.
**The readout gains a `via` cell reading `direct`, `turn` or `relay`**, read
from the selected ICE candidate pair in `getStats()`, because a lag measured
over a relay is not comparable with one measured direct. To keep the count even
it pairs with a `round trip` cell, measured over whichever path is in use. The
readout becomes six cells.

### 5.5 TURN only when direct fails

`GET https://pub.positron.studio/ice` already returns short-lived Cloudflare
TURN servers (`BACKLOG.md`, 2026-09-30). The page fetches it **on the Listen
press, never on load**, and passes it to `RTCPeerConnection`. TURN is billed by
traffic and is used only when both direct candidates fail; the plan does not
price it, because nothing measured here says how often that happens.

### 5.6 Limits on the board

- **At most 4 direct peers.** Each one is its own upload from the Pi: at 10 ms
  frames about 780 kbit/s per listener. A fifth is told so and uses the relay.
- **A peer is closed after 60 s of silence on `ctl`**, the same lease rule as
  today, and its held notes are released (`midiPanic`).
- **The relay stream keeps running while anybody holds a lease**, because the
  board cannot see whether other listeners are on the relay. That is
  ~400 kbit/s up, as today.

## 6. Build order, each step measured before the next

1. **P0, the question everything rests on: does ICE connect between Chrome and
   `node-datachannel` on this network?** A throwaway page and a throwaway script
   on the Pi, no board changes. Record the selected candidate pair type and the
   round trip from `getStats()`. If Chrome's mDNS host candidates (`*.local`)
   cannot be resolved on the Pi, the connection should still form through a
   peer-reflexive candidate, because the Pi's own candidate is a plain IP; this
   is the step that says whether that is true.
2. **P1, the board**: `rig/board/rtc.mjs` beside `inputs.mjs`, signalling in
   the input room, the two channels, peer limit and idle close. `node-datachannel`
   installed by `setup.sh` and `push.sh`, pinned to a version. Tests in
   `rig/board/test.mjs` against a fake peer; the real library is exercised on
   the Pi only (next paragraph).
3. **P2, the page**: `/away/` tries direct on Listen, falls back to the relay,
   shows `via` and `round trip`. The `lag` cell is unchanged and is the grade.
4. **P3, 10 ms frames** on the direct path, measured against 20.
5. **P4, the cushion**: lowered from 80 ms only as far as the measured jitter
   on the direct path allows.

⚠️ **The laptop cannot run the native half.** This machine SIGKILLs locally
built binaries (a managed laptop), and a prebuilt darwin binary from npm is the
same kind of file. So the Node end is tested on the Pi, and the laptop only ever
runs Chrome. The harness cannot drive the direct path either, because
`createBoard` refuses every send under `?selfcheck=1` and an offer is a send.
The direct path is graded by the probe scripts and by `lag`, and the page's own
asserts cover the fallback logic with the board refusing.

## 7. What is not known, and what settles each

| unknown | why it matters | what settles it |
|---|---|---|
| Does ICE connect between Chrome and `node-datachannel` here? | the whole plan | P0, one page and one script |
| Does the Pi resolve Chrome's `*.local` host candidates? | decides whether the path is host-to-host or peer-reflexive | P0's selected candidate pair |
| What the path looks like when the Pi really is in another building | today the laptop and the Pi are on one network (4.1 ms) | run P0 from another network |
| How often direct fails and TURN is used | TURN is billed | a week of the `via` cell |
| Whether 10 ms frames hold up under loss | P3's gain | P3 with the same probe, before and after |
| The Circuit's own note-to-sound time | part of the ~21 ms not on the network | a cable from its MIDI out to its input, or a scope; not needed to proceed |

## 8. What was refused

- **An audio track (Opus over RTP) instead of PCM on a data channel.** It would
  cost an encoder on the Pi, and the browser's jitter buffer, which aims for
  smoothness over speed and cannot be told to hold less. The whole point here is
  latency, and the page already has a playout worklet whose cushion it controls.
- **Cloudflare's Realtime SFU as the data path.** Measured at 15 ms p50 in
  `proto/jam`, worse than direct, and it adds a hop on the one leg this plan
  exists to remove.
- **A plain WebSocket from the browser to the Pi on the local network.** An
  https page cannot open `ws://` to a private address, and it would only work on
  one network.
- **Ordered reliable delivery for the audio.** §3: a p95 of 417 ms under 2%
  loss.
