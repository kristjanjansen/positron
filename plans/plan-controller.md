# plan-controller: a synth you play with your hands on two sliders

> ⚠️ **NOTHING IN THIS FILE IS BUILT.** No code was changed, no row was added to
> `demo/manifest.mjs`, nothing was deployed, nothing was committed, and nothing
> on the board was started, stopped or restarted. It is a proposal.
>
> ✅ **VERIFIED** marks something read out of this repo's own source, or asked of
> the live board and the live relay on **2026-09-16**. Every question put to the
> board was a READ: `audio.status`, `voices.list`, and a `GET` of the relay's
> `/stats`. **No `audio.start`, no `cc`, no `note.on`, no service action.**
>
> ⚖️ **JUDGEMENT** marks something reasoned from source or from published
> behaviour and not measured here. The single largest one is named in §2.4 and
> it is the first thing §8 builds a measurement for.

---

## 0 · The ask

> *"do reseach on 'controller perfomance' synth that shows off the cc slider
> controls, keyboard is not that important. can be yoshimi patch or smth where
> controllers play heavy role, moog-y stuff, huge fitler etc. need to show how
> we handle cc in pi. use infra similar to box demo but a separate pipeline --
> you tell me what is feasible. initially like 2 sliders only (filer /
> resonance?) to show off the pipeline. do plan and report it here in detail
> when ready"*

Read carefully, that is four separate requirements. The subject is **continuous
controllers, not notes**. The reference sound is a **big resonant filter you
sweep by hand**. The deliverable is a statement of **what is feasible on the
hardware we have**. And the first thing to build is **two sliders**.

---

## 1 · What is already there, and it is more than expected

### 1.1 ✅ The `cc` verb exists and reaches a real synth today

`rig/board/board.mjs:731` already has it, and the whole path is in place:

```
ctl message  ->  board.mjs handle()  ->  inst.cc(channel, ctrl, value)
             ->  jacksynth.mjs:1250  midi([0xb0 | ch, ctrl, value])
             ->  writeSync to /dev/snd/midiC<n>D0        (snd-virmidi)
             ->  ALSA sequencer, aconnect'ed to yoshimi  (jacksynth.mjs:1203)
             ->  Yoshimi
```

Three bytes, one syscall, no library. ✅ Verified by reading
`rig/board/jacksynth.mjs:1197-1250` and `rig/board/board.mjs:731-741`.

⚠️ **And nothing in this repo has ever graded it.** `rig/board/yoshimi-test.mjs`
grades the PATCH stepper by ear and carries a negative control; it never sends a
CC. The comment above the verb asserts that Yoshimi answers 74 and 71 "for
real". That assertion is untested here. §2.4 and §8 step 0 are about closing
that gap before anything else is built.

### 1.2 ✅ Yoshimi is on the board, with 878 reachable patches

Asked over the relay, 2026-09-16, `voices.list {"source":"yoshimi"}`:

```
count 878   banks 24   stale false   hidden 33
bankCC 32   rootCC 0   programChange true   root 10 (/usr/share/yoshimi/banks)
```

The banks that matter for a filter demo, with their real program numbers:

| bank | name | candidates |
|---|---|---|
| 95 | Synth | 6 `Analog Filter 1`, 7 `Analog Filter 2`, 36 `Resonance Synth` |
| 10 | Bass | 2 `Bass 3 _analog_`, 5 `Analogue Bass` |
| 65 | Pads | 7 `Resonance Pad1`, 8 `Resonance Pad2`, 2 `Analog Pad 1` |
| 50 | Misc | 64..69 `SuperSaw 1..6` |

✅ All read off the live board. `stale: false` means Yoshimi's own bank map
agrees with the files on disk, so a program change will land rather than
silently doing nothing.

### 1.3 ✅ The relay's caps are sixteen times what this repo says they are

This is the fact §4 turns on, and two places in the repo state it wrongly.

| | `workers/relay/src/index.js:77-83` | live `GET /room/studio-1/stats` |
|---|---|---|
| `MSG_PER_SEC` | 1000 | 1000 |
| `MSG_BURST` | 2000 | not exposed |
| `BYTES_PER_SEC` | 8,388,608 | 8,388,608 |
| `MAX_BYTES` | 1,024,000 | 1,024,000 |
| `MAX_SOCKETS` | 128 | 128 |
| `STRIKES` | 50 | not exposed |

✅ Both columns read today. The source and the deployed object agree, which
matters because a live Durable Object keeps its code across a deploy and
`/stats` is the only way to tell a landed edit from a sleeping room.

🔴 **Two records of these numbers are stale and one of them is executable.**

- `demo/shell/wire.mjs:35-40` exports `LIMITS` as `maxBytes 256 KiB`,
  `maxSockets 16`, `bytesPerSec 512 KiB`, `msgPerSec 60`, under a comment
  claiming it is read from the relay so it cannot disagree. It disagrees by
  **16.7x on message rate** and **8x on sockets**. A page that gated its send
  rate on `LIMITS.msgPerSec` would throttle itself to 6% of what it is allowed.
  Already reported in `plans/plan-radio-messages.md` and not fixed.
- `CLAUDE.md` still states `MSG_BURST` 120 plus `MSG_PER_SEC` 60 and quotes the
  298-in-three-seconds measurement. That measurement is correct and it belongs
  to the old values. The relay's own header says so.

Both should be corrected in the same change that builds this, because §4's
arithmetic is only legible if the numbers a reader looks up are the real ones.

### 1.4 ✅ The board answers, and nothing is playing on it

```
node rig/board/ask.mjs --room studio-1 audio.status
{ "type": "audio.started", "ok": false, "reason": "nothing playing",
  "fx": null, "fxBy": "web-b5hyyq", "fxAgoSec": 313, "fxHeld": false }
```

The room holds 2 sockets. ssh to `192.168.1.213:22` gets no route from this
machine, so the relay is the only channel available, and it is enough for every
read this plan needed except one: **there is no verb that reads a file off the
board**, which is why §2.4's question about Yoshimi's controller depths cannot
be answered by asking and has to be answered by listening.

### 1.5 ✅ The library for level-valued control already exists

`demo/shell/cc-adapter.mjs`, 582 lines, promoted from `proto/automation/`. Its
header states the whole design problem better than this plan could:

> The discrete kind is EDGE-valued: a note-on and a note-off are two halves of
> one object and losing either wedges the instrument. The continuous kind is
> LEVEL-valued: every CC message is a complete statement of a controller's
> value, last-writer-wins, and losing one is harmless the instant the next one
> arrives. But if it is the LAST one, the filter stays wrong forever.

It carries a measured capture discipline: **6408 raw samples gated down to 409
rows, 15.7 to 1, with the reconstruction staying inside 1.25% of each
controller's range**, plus a full-state keyframe every 500 ms. `makeCcCapture`
implements three rules that §4 adopts wholesale:

1. the LAST sample of a gesture is always emitted;
2. switches are never gated;
3. the gate is per CONTROLLER, not global.

⚠️ It is a CAPTURE gate, for writing rows into a timeline. There is no SEND
gate. That is the one small piece of kit this plan asks for, and it belongs in
that file rather than in a new one, because it is the same subject.

---

## 2 · Which synth

### 2.1 What is actually on the board

`rig/audit.mjs` is the declared inventory, and it is a runnable check rather
than a list. What it declares for `box`:

| | version declared | filter | live CC |
|---|---|---|---|
| **Yoshimi** | 2.3.3.3-1 | per-part analog / formant / state-variable, with resonance | yes, by convention |
| **FluidSynth** | 2.4.4 | one lowpass per voice, modest Q | yes, CC 71/74 |
| **hexter** (DX7) | installed | **none at all** | no filter to move |
| **SuperCollider** | 3.13 + sc3-plugins | anything you write | by OSC, not by MIDI |
| **Csound** | 6.18.1 | anything you write | by score or by MIDI |

🔴 **Nothing else is there.** amsynth, ZynAddSubFX, Surge XT and Dexed are not
declared in `rig/audit.mjs` and cannot be seen from the relay. Installing any of
them is a step a person has to approve, and **this plan needs none of them.**

### 2.2 The three that are ruled out, with the repo's own evidence

**hexter is out.** `board.mjs:733` says it in one clause: "hexter has no filter at
all". It takes CC 16/17/18/19/80/81 as operator coarse frequency, which is a
real live control and is not a filter.

**FluidSynth is out.** It is a sampler. Sweeping its filter makes a recording
duller. That is not the sound the ask describes.

🔴 **The built-in `moog` is out, and it is the interesting rejection**, because
it is the one thing here actually named after the target sound.
`rig/board/synth.mjs:147-153` says its controls take effect "on the NEXT note,
like a real patch knob". A control that cannot be swept while a note sounds is
the opposite of a controller performance. And `rig/board/README.md:150-158`
records a measurement: four cascaded one-poles give loop gain `k*g^4`, and `g^4`
collapses at low cutoff, **0.001 at fc 900 Hz and 0.011 at 2000**, so resonance
"moves the peak 6% across its entire range". The README leaves it broken on
purpose. It is a starting point for a port, not a filter.

### 2.3 🔴 The recommendation: Yoshimi now, SuperCollider as the second voice

**Yoshimi, because it needs no board change at all for the first version.** It
is installed, its 878 patches are readable, the MIDI path to it is wired, the
`cc` verb already reaches it, and it starts headless from the service today:

```
yoshimi -i -a -J -b=256          rig/board/jacksynth.mjs:146
```

`-i` no GUI, `-a` ALSA MIDI so virmidi can reach it, `-J` JACK audio, `-b=256`
a 256-sample period, which is 5.3 ms at 48 kHz. There is **no `--load`
argument and none is needed**: a patch is chosen the way every patch on this
board is chosen, by bank select on **CC 32** followed by a program change, which
`voice.select` already does. The bank CC is read out of Yoshimi's own config
rather than typed, because CC 0 moves the ROOT DIRECTORY and one wrong guess
about that cost an hour once (`rig/board/yoshimi.mjs:115-119`).

So loading the demo's patch is one message that already works:

```js
send({ type: 'voice.select', channel: 0, bank: 95, program: 6 });   // Analog Filter 1
```

**SuperCollider as the second voice, later, and this is the honest answer to
"a separate pipeline".** `MoogFF` is core SuperCollider and this repo's own
README calls it "a correct ladder filter". A `SynthDef` with `MoogFF`, driven by
`/n_set` with `Lag.kr` on each control, gives four things Yoshimi cannot:

- an **absolute** cutoff in Hz rather than an offset from a patch's own setting;
- a **float**, so no 7-bit stepping;
- **smoothing declared in the graph**, so a coarse control rate is inaudible;
- a filter that is a ladder rather than a filter that resembles one.

It costs a second SynthDef in an sclang instance that is already running for the
granulator, and it is the right thing to reach for **only if §8 step 0 shows
that Yoshimi's 7 bits or its relative range actually bite**. Building it first
would be choosing the harder path on a guess.

### 2.4 ⚖️ The load-bearing unknown, stated plainly

CC 74 is Brightness and CC 71 is Timbre / Harmonic Intensity in the MIDI
specification, and in the ZynAddSubFX family they reach a Part's filter cutoff
and filter Q. In that family the controller is **relative**: 64 is neutral, the
value is an offset applied around whatever the patch's own filter is set to, and
how far it reaches depends on a per-part depth that defaults to the middle.

⚖️ **None of that is measured here and it has three consequences if it holds:**

1. a slider at the same position sounds different on two patches;
2. the page cannot honestly print a cutoff in Hz, only a controller value;
3. a patch whose filter is already wide open will not move at all, and the page
   will look broken while every counter on it reads perfectly correct.

That third one is the dangerous shape: a silent, correct-looking failure.
**It is why §8 step 0 is a measurement and not a page.**

---

## 3 · How a slider value reaches the synth, hop by hop

### 3.1 The whole path

```
finger on a slider
  |  pointermove, at most one per display frame
createSlider onInput          demo/shell/slider.mjs:160
  |  gated: one per controller per 20 ms, endpoint forced on release
ctl.set over a WebSocket      { type:'ctl.set', set:[[74,91],[71,40]] }
  |  ~110 bytes of JSON
Relay Durable Object          workers/relay/src/index.js, fan-out verbatim
  |  measured +0.8 to +1.6 ms at p50 over the runtime's own ping
board.mjs handle()              a fold into a map, no MIDI write yet
  |  a 5 ms drain timer writes at most one message per controller
inst.cc()  ->  virmidi        three bytes, writeSync
  |
ALSA sequencer  ->  Yoshimi   aconnect'ed at startJackSynth
  |  applied at the next synthesis buffer, 5.3 ms at -b=256
yoshimi:left + yoshimi:right  ->  posbox:input_1   (both channels, summed)
  |
ffmpeg -f jack  ->  s16le 48 kHz mono on stdout
  |  cut into 960-sample frames, 20 ms each
sendPcm()                     12-byte header: uint32 sequence, float64 board clock
  |  the same socket the control came in on
Relay  ->  Browser  ->  AudioWorklet pcm-playout
  |  100 ms cushion, adaptive to 250 ms
your ear
```

### 3.2 Where it differs from the note path, which is the question asked

The bytes are almost the same. Everything about the discipline is different.

| | a note | a control |
|---|---|---|
| shape | an EDGE. On and off are two halves of one object | a LEVEL. Each message is a complete statement |
| a lost message | a missed note, or a stuck one | harmless, **unless it is the last one** |
| rate | one per gesture | 100 to 400 per gesture from a hardware knob |
| coalescing | impossible. A skipped note-on is music | correct. Newest wins, by definition |
| catching up | replay | **reduce.** Restore the console, do not replay the gesture |
| the repair | note off, panic | a periodic full statement of every controller |
| an ack | cheap, because notes are rare | doubles the traffic, and is the wrong shape |

That table is not invented here. It is the argument in `cc-adapter.mjs`'s
header, and every row of it has a consequence in §4.

### 3.3 🔴 So what "a separate pipeline" should mean, and what it must not

**Separate at the control plane. Shared at the audio plane and at the socket.**

Separate, and these are the four changes:

1. **A new verb family `ctl.*` on the board**, so the note path is untouched and
   the two can be reasoned about independently. `/keys/` keeps working with no
   change, and the existing `cc` verb stays exactly as it is.
2. **A send gate in the browser**, with `cc-adapter.mjs`'s three rules.
3. **A coalescer on the board**: hold the newest value per controller, drain on
   a fixed tick, write at most one MIDI message per controller per drain.
4. **Counters at both ends, displayed.** CLAUDE.md's rule is that every stage
   which can discard data needs a counter a page actually shows. The coalescer
   discards by design, so it must count, and the count must reach a cell.

Not separate, and each of these has a reason:

- 🔴 **Not a second socket.** The relay's bucket is per socket, so a second one
  would isolate the control plane from the audio plane. The board already does
  exactly that for video, and `board.mjs:143-154` says why: at the OLD cap of
  60 msg/s, audio alone was 50 of them and 30 video frames took the total to 80.
  **At 1000 msg/s that argument no longer holds** (§4.3 has the arithmetic), and
  a second socket costs a second entry in a room that is reclaimed only when it
  is full. Name the condition under which it becomes right instead: a sustained
  control rate above about 300/s, or an audio stream above 50 frames/s.
- 🔴 **Not a second audio stream.** `startAudio` replaces rather than refuses,
  and `board.mjs:417-419` records what happens when two sources stream at once:
  "100 msg/s against the relay's 60, measured 60 frames/s arriving and 5,495
  dropped". Two streams in one room also break every listener, because the
  playout keys on one sequence counter.
- 🔴 **Not a second room.** `demo/verify.mjs:500-511` is explicit: `room:
  'fixed'` means the name "is the ADDRESS OF A MACHINE", and "a private room
  does not give a second client its own Raspberry Pi: there is one JACK graph
  and one instrument, so board-bound demos still have to take turns". Renaming
  the room does not isolate a run, it points it at nothing.

---

## 4 · The rate problem

### 4.1 What the page sends, and the rule

**One message per controller per 20 ms**, which is 50 a second per controller,
plus three rules taken from `makeCcCapture`:

- **the endpoint is never gated.** The last value of a gesture goes out whatever
  the clock says. This is the one failure that matters for a level control, and
  `createSlider` hands it over for free: `onInput` fires on every move and
  `onChange` fires on pointer release and on every keyboard step. So `onInput`
  goes through the gate and `onChange` forces.
- **the gate is per controller.** Cutoff moving fast must never hold resonance
  back.
- **switches are never gated.** There are none in version one. The rule stays
  anyway, because the first pedal or mode button added would otherwise inherit a
  gate designed for sweeps.

**Why 20 ms and not something else.** It is the audio frame. One control message
per returned frame is a unit a person can hold in their head and a readout can
print, and it makes the two halves of the page commensurable. It gives 50 steps
a second, so a full 0 to 127 sweep in one second moves about 2.5 controller
units per step. It is not a number picked to stay under a cap: §4.3 shows the
cap is 20 times away.

**Two sliders moved together are ONE message.** `ctl.set` takes a batch:

```js
{ type: 'ctl.set', channel: 0, set: [[74, 91], [71, 40]] }
```

so the worst case for two hands is 50 msg/s, not 100.

**A full statement every 500 ms.** Every controller's current value goes out
whether it moved or not. It is 2 msg/s. It is the entire repair for the only
failure that matters, and it turns "the filter stays wrong forever" into "the
filter is wrong for at most half a second". `cc-adapter.mjs` uses the same
500 ms for the same reason.

### 4.2 What the board does with a backlog

`handle()` is called once per message as node reads the socket, so there is no
queue to grow. The backlog, if there is one, is in the kernel's receive buffer
and the relay has already done its work. So the board's rule is not about
draining a queue, it is about **never writing more MIDI than the synth can
use**:

```
ctl.set arrives  ->  pending.set(ctrl, value)          no MIDI write
every 5 ms       ->  for each pending: inst.cc(...)    at most one per controller
                     in += arrived, out += written, folded = in - out
```

Three properties follow, and each is worth having:

- an arrival burst of any size costs at most one MIDI write per controller per
  5 ms, so a badly behaved client cannot flood the ALSA sequencer;
- **the last value always wins**, which is the definition of a level control;
- **`folded` is a real number to print.** A stage that discards needs a counter,
  and a counter nobody displays is not a counter. This one has a cell.

The coalescer adds at most 5 ms of latency, which is smaller than the synth's
own 5.3 ms buffer, so it is free in practice.

⚠️ **No per-message ack.** The existing `cc` verb replies `cc.ack` to every
message. At 50/s that is 50 extra messages on the board's socket, each fanned
out to every socket in the room, to say something the next `ctl.meter` says
better. At the OLD caps it would have been fatal: 50 audio frames plus 50 acks
is 100 against 60, and the thing that would have been dropped is the audio.
Instead the board sends **one `ctl.meter` a second**:

```js
{ type: 'ctl.meter', in: 48, out: 46, folded: 2, ctrls: { 74: 91, 71: 40 } }
```

`ctrls` is the full statement in the other direction: what the board actually
holds. A page that reconnects re-syncs from it without asking.

### 4.3 The arithmetic, against the real bucket

One `ctl.set` on the wire, with the envelope `format()` adds:

```
{"id":"<32 chars>","type":"ctl.set","channel":0,"set":[[74,91],[71,40]],
 "from":"web-a1b2c3","at":1758000000000,"seq":417}
```

about **125 bytes** of UTF-8. The page's budget, per socket:

| | page sends | of the allowance |
|---|---|---|
| two sliders, both moving, 50 msg/s | 50 msg/s, 6.25 KB/s | **5.0%** of 1000 msg/s, **0.07%** of 8 MiB/s |
| pathological, ungated, 120 Hz screen | 120 msg/s, 15 KB/s | 12% of messages, 0.18% of bytes |
| the burst, `MSG_BURST` 2000 | a 2 s two-handed sweep is 100 messages | cannot bite |

The board's socket, which carries audio and control on one bucket:

| | board sends | of the allowance |
|---|---|---|
| audio, 50 frames of 1932 bytes | 50 msg/s, 96.6 KB/s | 5.0% of messages, **1.2%** of bytes |
| `ctl.meter` 1/s + `board.alive` 0.2/s | 1.2 msg/s | 0.1% |
| **total** | **51.2 msg/s, 96.7 KB/s** | **5.1% / 1.2%** |

`STRIKES` is 50 CONSECUTIVE overruns before a socket is closed with 1008, and a
single accepted message resets the count. At 5% of the allowance neither end
strikes once.

🔴 **And the same arithmetic at the OLD caps is why this rule exists.** At
`MSG_PER_SEC` 60 with `MSG_BURST` 120, a 10 s two-slider sweep at 100 msg/s
would have delivered 120 + 600 of 1000 and **dropped 280 with no error, no
close and no backpressure**. The relay's own measurement is exactly that shape:
298 delivered in three seconds at both 120 and 300 msg/s offered. That is the
half of this that used to be hard and no longer is.

### 4.4 What the page displays, so a person can see it

Three numbers, each measured on a different side of a boundary, which is
CLAUDE.md's rule about counting on the far side:

- **`sent`**, per second, counted in the page. What your hand produced.
- **`played`**, per second, from `ctl.meter.out`. What the board actually wrote
  to MIDI. Lower than `sent` exactly when the coalescer folded.
- **`lost`**, one cell for every way a message or a sample can vanish:
  `sent - echoed` from `openWire`'s own counters (the relay echoes verbatim to
  the sender, so the difference is the relay's drop count for this socket, with
  no cooperation from anybody), plus wire `gaps`, plus the playout's
  `underruns + trimEvents`.

`sent` beside `played` is the answer to "is what I hear what I did". They agree
when your hand is slower than the gate, and `played` sits below `sent` when it
is faster, which is the coalescer doing its job rather than a fault.

---

## 5 · Latency

### 5.1 What the numbers in this repo say

| leg | figure | source |
|---|---|---|
| runtime `ping` to `pong`, DO never woken | p50 26.0 / 36.4 / 37.5 ms across 3 runs | `plans/plan-ws.md`, `demo/perf-wire.mjs` |
| echo through the Durable Object | p50 27.0 / 38.0 / 38.3 ms | same |
| **the DO hop itself** | **+0.8 to +1.6 ms at p50** | same |
| a full 16-socket room costs the sender | +8 ms at p50 | same |
| FluidSynth on this board, press to ear | 74 ms on JACK, 84 ms on a pipe | `jacksynth.mjs:110` |
| Yoshimi's own period at `-b=256` | 5.3 ms at 48 kHz | `jacksynth.mjs:146` |
| capture framing | 20 ms | `FRAME 960 / RATE 48000` |
| playout cushion | 100 ms floor, adaptive to 250 | `listen.html:459` |

### 5.2 ⚖️ What to expect, and it is dominated by one term

Slider to heard, adding the legs up:

```
  page to relay to board        ~15 to 20 ms   (half a measured round trip)
  coalescer                     0 to 5 ms
  Yoshimi's next buffer         0 to 5.3 ms
  capture frame boundary        0 to 20 ms
  jackd period                  a few ms
  board to relay to page        ~15 to 20 ms
  playout cushion               100 ms
                                --------------
                                ~150 to 190 ms
```

🔴 **The cushion is more than half of it and it is a choice, not a physical
limit.** That is the honest headline. `/keys/`'s own paragraph says "about a
tenth of a second" and its `lag` cell includes the cushion, so the cell has
always read higher than the sentence.

⚖️ Every line above is reasoning, not a measurement, and the two that could be
wrong are the capture frame boundary (it is a uniform 0 to 20 ms only if the
control lands uniformly within a frame) and jackd's period, which nobody here
has read off the running service.

### 5.3 What would be measured to confirm it

🔴 **`/keys/`'s trick does not transfer**, and this is the trap. Its `lag` arms
on a key press after 8 frames below a peak of 0.02 and closes on the first frame
above it. A filter sweep happens **on top of a note that is already sounding**,
so there is no silence to arm in and no onset to close on. Copying that code
would produce a cell that never updates, or worse, one that updates off an
unrelated note.

The quantity in question for a cutoff sweep is **brightness**, and this repo
already has the instrument: `rig/board/measure.mjs` returns a spectral `centroid`
in Hz and `distance()` returns the gap in octaves.

**Measurement 1, slider to heard.** Hold one note. Send `ctl.set {74: 0}` from a
settled 127 and stamp `performance.now()`. Compute a running centroid over the
returned frames. Close when it crosses below the midpoint of the two settled
values. Report **median and max over many crossings**, never max alone, and
alternate the direction so a one-way bias cannot hide in it.

**Measurement 2, the network leg alone, for free.** `openWire.ping()` already
measures the runtime's ping and pong with the object never woken, and the page's
own echo of its own `ctl.set` measures the hop through the object. Both exist,
both cost nothing, and the difference between them is the object's cost.

🔴 **Measurement 3, the board's leg alone, and nobody has ever taken it.** The
board writes `performance.now()` into every audio frame at byte offset 4
(`board.mjs:382`), and `listen.html` deliberately never reads it. Differencing two
of the BOARD's OWN stamps needs no shared clock at all, so a harness that sends
a control and reads the stamp on the first frame whose centroid has moved gets
the board's contribution with the network subtracted out. That separates "the
internet was slow" from "the board was slow", which are otherwise the same
observation.

**Measurement 4, the cushion's price.** Drop the floor from 100 ms to 60 and
report `underruns + trimEvents` at both. The cushion is the biggest term in
§5.2 and the only one under our control, so it deserves a number rather than a
default.

---

## 6 · The page

### 6.1 Where it lives, and why not beside `/keys/`

**`demo/knob/index.html`, `built: true`, `room: 'fixed'`.**

`/keys/` is `built: false` with a `src:` because it belongs with the hardware,
and the price of that is written in CLAUDE.md: `demo/verify.mjs` cannot see it,
it publishes no asserts, and its diagram reports its own cuts to a log line
because no harness will ever read them. `/grains/` and `/able/` both reach real
hardware over the same relay and are both `built: true` with `room: 'fixed'`.
That is the precedent to follow, and it is what makes this page gradable.

Manifest row (LAYOUT rule 1: the build enumerates `demo/`, so there is nothing
else to add anywhere):

```js
{ name: 'knob', group: 'instruments', act: 4, created: '2026-09-…',
  built: true, settleMs: 20000, room: 'fixed',
  one: 'sweep a big filter on a Raspberry Pi in another building, and watch how many of your slider values got there',
  tags: ['WS', 'relay', 'MIDI CC', 'PCM', 'live board'] },
```

⚠️ The slug is the repo owner's call. `knob` is short, is a common noun, is not
taken, and says what the page is about. `sweep` is the alternative.

### 6.2 Controls, in order, and the order is load-bearing

CLAUDE.md: `settleMs` lands on **control 0 only**, and adding a page's first
control moves every other control's harness press. So the slow work goes first
and the count gets diffed after any change.

| # | control | what it does |
|---|---|---|
| 0 | **`Play`** | opens the AudioContext, asks `audio.status`, starts Yoshimi if nothing else is using the board, selects the patch, holds one note |
| 1 | **`Panic`** | `note.panic`, and returns both sliders to 64 |

Then, appended to `d.el` rather than to the control row, because the harness
cannot press a slider and because they are the subject rather than the furniture:

```js
createSliderGroup([cutoff, resonance], { pair: true })
```

```js
const cutoff = createSlider({
  label: 'cutoff', min: 0, max: 127, step: 1, value: 64,
  onInput:  (v) => gate.offer(74, v),
  onChange: (v) => gate.offer(74, v, { force: true }),   // the endpoint rule, free
});
```

`resonance` is the same on CC 71. Both start at 64, which is where a Yoshimi
controller is neutral.

🔴 **No keyboard.** The ask says so. One held note is what a filter needs, and a
repeating note would retrigger the patch's own filter envelope and fight the
slider, which would make the demo about the wrong thing.

### 6.3 The readout: six cells, all of which move

`mount()` throws on an odd count, and a cell that cannot change teaches a reader
to stop looking at the row.

| cell | unit | what it says | why it earns a place |
|---|---|---|---|
| `sent` | `/s` | control messages this page put on the wire | your hand, per second |
| `played` | `/s` | `ctl.meter.out`, MIDI messages the board wrote | what the board did with it |
| `rtt` | `ms` | `board.ping` to `board.pong` | the network alone |
| `lag` | `ms` | slider to heard, by the centroid crossing | the whole journey |
| `buffer` | `ms` | the playout cushion | the biggest single term in `lag` |
| `lost` | | relay drops + wire gaps + underruns + trims | whether anything vanished |

`rtt` and `buffer` together explain most of `lag`, which is the point of having
all three. ⚠️ `rtt` is already computed in `listen.html:760` from `board.pong` and
is displayed nowhere, so this costs nothing new.

### 6.4 The `what` paragraph

🔴 CLAUDE.md: **a page with a diagram has a one line `what`, and it is the
index's own line, verbatim.** A paragraph and a picture of the machinery are two
explanations of one thing, and the paragraph is the weaker of them. So:

> sweep a big filter on a Raspberry Pi in another building, and watch how many
> of your slider values got there

⚠️ If the page ever ships without the diagram, the three-sentence form applies
instead, and it would be:

> Two sliders here move a filter on a Raspberry Pi somewhere else, and what you
> hear is the sound that board is making, sent back twenty milliseconds at a
> time. The middle of each slider leaves the patch as its maker set it. `sent`
> is how many values your hand produced this second and `played` is how many the
> board used, so when they differ you are hearing the newest of several.

### 6.5 The diagram

`createDiagram(d.el, spec, { how: true, atEnd: true })`, no `title`, heading
from `HOW`. Three containers, seven boxes, six links.

```
Browser                    Cloudflare                  Raspberry Pi
  sliders    ------------>   controls    ----------->    virmidi
  cutoff, 71                 Relay object                MIDI port
                                                            |
  playout    <-----------    audio       <-----------   Yoshimi
  AudioWorklet               Relay object                878 patches
                                                            |
                                                         capture
                                                         48kHz mono
```

- `Browser` and `Cloudflare` take **`join: false`**: a slider does not feed the
  playout, and one relay object drawn twice by role has its direction in the
  arrows already. `/keys/` does exactly this and the flag was added after
  `notes out` and `sound back` were rejected as captions rather than names.
- `Raspberry Pi` takes the **default arrow** between its children, because
  `virmidi -> Yoshimi -> capture` is a real chain and inner boxes get arrowheads
  since 2026-09-16.
- A declared link between two children of one container **takes no label**, so
  those two carry their meaning in their `note`.
- Both return links carry **`back: true`** and land on the BOX, not the
  container.
- No container takes a `note`. No label takes an article. Every `sub` writes its
  quantities short: `48kHz mono`, `878 patches`, `MIDI port`.

Arrow labels, which say what travels:

| from | to | label |
|---|---|---|
| `sliders` | `controls` | `CC 74, 71` |
| `controls` | `virmidi` | `CC 74, 71` |
| `capture` | `audio` | none, `back: true` |
| `audio` | `playout` | none, `back: true` |

Notes, two sentences each, naming the technology:

- **sliders**: "Two lanes you drag with a finger or step with an arrow key. Each
  one sends a MIDI controller value, which is a number from 0 to 127 with 64
  meaning no change."
- **virmidi**: "A kernel MIDI port the service writes three bytes to, routed to
  Yoshimi with `aconnect`. Only the newest value of each control is written, two
  hundred times a second, so a fast drag cannot outrun the synth."
- **Yoshimi**: "A software synthesiser with 878 patches, running with no screen
  and no window. Controller 74 opens and closes its filter and 71 sets how much
  the filter rings."
- **capture**: "Reads what the board is playing straight off the JACK graph and
  sends raw samples back. Nothing is encoded, so nothing has to be decoded at
  the other end."

Caption:

> Two sliders in a browser move a filter on a **Raspberry Pi** in another
> building. What comes back is the sound it is making, twenty milliseconds at a
> time.

Assert: `dg.cuts.length === 0` and the tie count, on the visitor path, because
both are free.

### 6.6 🔴 What the page must NOT do

- **Never start audio on load.** `/keys/` autostarts FluidSynth on
  `{ok:false, reason:'nothing playing'}` and that is fine for a page whose whole
  job is that instrument. This page would take the board away from `/keys/` and
  `/grains/` silently, which is the granulator fight in a new costume. Ask
  `audio.status` on load, say in words what is playing, and start on a press.
- **Never run a self-check for a visitor.** The gate's arithmetic and the
  diagram's cuts are free and run for everyone. Anything that opens the socket,
  starts an instrument, sends a control or makes a sound sits behind
  `?selfcheck=1`, and `demo/verify.mjs` appends that.
- **Never hand-roll the socket.** `listen.html` does, which is why it cannot
  tell a full room from a dead relay. `openWire` already diagnoses a 503 by
  fetching `/stats`, and it already carries the `sent` / `echoed` / `gaps`
  counters this page's readout needs.
- **Never print a cutoff in Hz** unless §8 step 0 shows the mapping is absolute.

---

## 7 · What could make this infeasible

Ordered by how likely each is to actually bite.

🔴 **1. Yoshimi's CC 74 and 71 may not move the chosen patch.** The single
load-bearing unknown (§2.4). Nothing here has measured it, and the failure is
silent: every counter reads correct and the sound does not change. **Mitigation:
measure it first, across a shortlist, before writing a page.** If no patch on
the board responds usefully, the answer is the SuperCollider voice, and the page
above does not change at all because the wire does not change.

⚠️ **2. Seven bits, audibly.** 128 steps across a wide cutoff range on a
resonant filter can zipper. Yoshimi has no 14-bit cutoff: controllers 0 to 31
have LSB partners at n+32 and 74 is not one of them. **Mitigation:** the synth's
own smoothing may cover it; if it does not, the SuperCollider voice takes a
float and a `Lag.kr`.

🔴 **3. One board, one JACK graph, one instrument.** `demo/verify.mjs` says it
in those words. Opening this page while somebody has `/keys/` open takes their
instrument. **Mitigation:** do not autostart, report what is running, and add
`audio.start {onlyIfIdle:true}` mirroring `fx.pappus`, which already refuses out
loud with the holder and both ages in the reply.

⚠️ **4. CPU on a Pi 4.** Unmeasured for Yoshimi. FluidSynth measured 0.088 s of
CPU per second of audio with 24 notes across six parts. Yoshimi's additive
engine with a big filter is heavier and scales with voices, and the granulator
may be running at the same time on the TINY rung. **Mitigation:** one held note
is the cheapest possible case, and `rig/board/bench.mjs` is the shape of the
answer. Do not add voices without measuring.

⚠️ **5. A wedged audio device.** `startJackSynth` waits 8 s for
`posbox:input_1` and carries on without it, so a wedged jackd presents as "the
synth registered no JACK port", three steps from the cause. Recovery is a
service restart, which no page can do. **Mitigation:** report
`audio.started {ok:false, reason}` verbatim in the log and stop, rather than
retrying, because a recovery action is not free.

✅ **6. The room being full is now a small risk.** `MAX_SOCKETS` is 128, up from
the 16 that sat full for hours on 2026-09-12, and the room holds 2 sockets
today. The reclaim still only runs on a full room, and a browser still cannot
read the 503. **Mitigation:** `openWire` already handles it.

⚠️ **7. The board is a Raspberry Pi on somebody's domestic internet.** It may
simply not be there. **Mitigation:** the page says "no board answered in this
room" in those words, within a named timeout, rather than showing a live-looking
slider that does nothing.

⚠️ **8. A tab left open holds the instrument.** There is no idle stop for
Yoshimi; only the archive source has one. Open work, named rather than solved.

⚠️ **9. `demo/shell/wire.mjs`'s `LIMITS` is wrong and is code.** §1.3. Anything
that reads it for a rate decision will be wrong by 16.7x.

✅ **10. Nothing needs installing.** Every program this plan uses is already
declared in `rig/audit.mjs` and verified present on the board. That is the
strongest single feasibility answer here.

---

## 8 · Build order, smallest first

Each step is gradable on its own, and steps 0 to 2 need no page at all.

### Step 0 · Which patch, decided by measurement. No page, no page code.

`rig/board/cc-test.mjs`, in the shape of `yoshimi-test.mjs`. For each candidate
patch, hold note 40, send CC 74 at 0 / 32 / 64 / 96 / 127 with a settle between
each, capture, and report `measure().centroid`.

**Pass:** the centroid is monotonic in the controller value and spans at least
one octave. **Negative control, and it is not optional:** the same patch, same
note, controller unchanged, measured twice, must read SAME. A difference test
that cannot fail is not a test, and `yoshimi-test.mjs` already carries that
lesson. Repeat each condition and use `summarise()` and `separated()`, because
one take is not a measurement.

Also grades CC 71 the same way, on the `env` axis as well as `oct`.

⚠️ **This step starts audio on the board.** It needs a person to say nobody is
using it.

**Deliverable:** a table of patches and centroid spans, and a chosen default.

### Step 1 · The send gate, in node, no browser.

Add a send gate to `demo/shell/cc-adapter.mjs` (the file that already owns this
subject) with the three rules, and `demo/shell/cc-send-test.mjs` in the shape of
`looper-test.mjs`: pure arithmetic, negative controls, and **three deliberate
sabotages that must take it red**. The cases that matter: a fast sweep is thinned
to the gate's rate; the endpoint is always emitted; the gate is per controller;
a 500 ms restatement goes out with nothing moving.

**Grade:** `node demo/shell/cc-send-test.mjs`.

### Step 2 · The board's coalescer and meter.

`ctl.set` and `ctl.meter` in `board.mjs`. The existing `cc` verb is untouched, so
`/keys/` cannot regress.

**Grade:** `rig/board/ctl-test.mjs` against a running box, two connections.
Send 500 `ctl.set` in one second and assert `in === 500`, `out <= 200`,
`folded === in - out`, and **the last value sent is the last value written**.
Negative control: 5 messages 200 ms apart must give `folded === 0`.

⚠️ Deploy with `push.sh`. The service runs from `/opt/positron-board/`, not from
`~/positron/`, and `md5sum` is what proves a deploy landed.

### Step 3 · The page, controls and readout, no diagram.

`demo/knob/index.html`, the manifest row, `openWire`, two sliders, `Play`,
`Panic`, six cells.

**Grade:** `node demo/verify.mjs knob`, and **diff the per-demo assert count**
against the previous run after adding or moving any control.

### Step 4 · The diagram, and `cuts.length === 0`.

### Step 5 · The measurements.

`lag` by the centroid crossing (§5.3). The board's own frame stamp read for the
first time, to split the network from the board. The cushion at 100 and at 60,
with the underruns each costs. Median and max, never max alone.

### Step 6 · The SuperCollider voice, only if step 0 says it is needed.

A `MoogFF` SynthDef beside Pappus, `/n_set` with `Lag.kr`, reached by the same
`ctl.set` with a `dest` field. **The page does not change**, because the wire
does not change. That is the payoff of separating at the control plane.

### Step 7 · `audio.start {onlyIfIdle:true}`, mirroring `fx.pappus`.

Needs a person, because it changes how every existing page's start behaves.

---

## 9 · What a person has to approve before any of this runs

1. **Starting audio on the board**, for step 0 and every step after it. It takes
   the instrument from anyone else using it.
2. **Deploying to the board** with `push.sh`, for step 2.
3. **The slug**, `knob` or something else.
4. **Correcting `demo/shell/wire.mjs`'s `LIMITS`** and CLAUDE.md's 60 msg/s
   line, which this plan's arithmetic contradicts (§1.3).
5. **Adding a send gate to `demo/shell/cc-adapter.mjs`.** CLAUDE.md says to stop
   and ask rather than quietly build a fourth copy of something the kit almost
   has. This is the ask.

**Nothing here requires installing anything, on this machine or on the board.**

---

## 10 · Open questions, named so they are not forgotten

- **Is Yoshimi's CC 74 relative or absolute on this board, and how deep?** There
  is no verb that reads a file off the board, so this can only be answered by
  listening. Step 0.
- **What does jackd's period actually cost?** Nobody has read it off the running
  service, and it is a term in §5.2.
- **Should the cushion be smaller for a control demo than for a note demo?** A
  sweep tolerates lateness differently from a melody. Step 5 measures the price
  rather than guessing.
- **Is there an idle stop for a held instrument?** Only the archive source has
  one. A page left open on a second monitor holds Yoshimi indefinitely.
- **Does `/keys/` want the same two sliders?** It has no filter control at all
  today. If step 0 lands, adding them there is small, and the argument against is
  that `/keys/`'s subject is a keyboard.
