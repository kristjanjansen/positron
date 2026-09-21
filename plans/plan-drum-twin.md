# plan-drum-twin: one pattern, one set of samples, two renderers, compared

> **The ask, verbatim, 2026-09-21:** *"same idea as in shadrs / sc pathces:
> compare in browser and pi rendering, share assets to render (in drum pachnine
> wavs and patterns)"*, and then, when building started, *"i do not have pi
> here, so just plan"*.
>
> ⚖️ **MARKS, the same set `research/pi-drum-machines-2026-09-21.md` uses.**
> ✅ measured on this machine or on this board, and where. 📄 read from a file in
> this repository, with the line. 🌐 from a document outside it. ⚖️ my reading,
> not checked. 🔌 an experiment nobody has run.
>
> 🔴 **NOTHING WAS BUILT, DEPLOYED, INSTALLED, SSH'd TO OR COMMITTED.** No verb
> went to `studio-1`, no `push.sh`, no file in `rig/` or `demo/` touched. One
> new file, this one. Every number below is read out of the repository, measured
> on the pack sitting in the repository root, or marked as unchecked.

---

## 0. The answer in one paragraph

**Keep the instrument in the browser. Send the board the DECODED samples and a
PATTERN, let it run its own bar on scsynth's clock, and grade the two ends
against the number that was asked for rather than against each other.** The
comparison is three numbers deep at every point (asked, here, the engine's own
answer), it is compared per bar and never as a running total, and the board's
count comes from a `SendReply` inside the running synth rather than from the
board process saying it sent one. The thing this plan refuses to pretend is that
the two ends are in time: the board is 160 to 220 ms behind by construction and
its output is quantised to a 21.33 ms JACK block, so what is compared is the
STEADINESS of that offset and never its value.

---

## 0.1 🔴 A CORRECTION TO THE BRIEF THIS PLAN WAS WRITTEN FROM, MADE AT ITS SOURCE

The brief said a pack over the relay *"needs a chunk protocol that does not
exist"*, and `BACKLOG.md`'s sketch says the same. **That is wrong, and it is
wrong twice over in one file.** `rig/board/board.mjs` already ships binary in
framed chunks with the sequence number IN THE PAYLOAD, in two separate places,
each with its reasoning written down:

- 📄 **`sendFrame(unit, key)`, `rig/board/board.mjs:288`.** Eight bytes: a
  `uint32` counter and a `uint32` flag word whose low bit marks a keyframe. Its
  own comment: *"THE SEQUENCE NUMBER GOES IN THE PAYLOAD. A binary frame carries
  no envelope, so `wire.mjs`'s `seq` cannot ride along, and the relay's caps drop
  frames with no error at all, which is exactly what a counter exists to see."*
  ✅ **MEASURED: at 8 Mbit/s the relay lost 101 of 361 frames and NOTHING else on
  the path reported it.**
- 📄 **`sendPcm(int16)`, `rig/board/board.mjs:449`.** Twelve bytes: a `uint32`
  counter and a `double` of the board's own `performance.now()`. Its comment
  says both audio sources leave *"by the same 12-byte header and the same 20 ms
  framing as demo/carry, so the browser that plays this already exists and is
  deployed."*
- 📄 **And a receiver for the first one is already written and shipping**,
  `demo/mirror/index.html:1637` onward: it reads the header, counts gaps off the
  sequence, reports them, and waits for the flag bit before it starts.

So the plan below says **reuse this shape**. What is genuinely missing is much
smaller than the brief implied, and §2 prices only the three real gaps: a
discriminator, completeness, and pacing. The recommendation in §2.6 is
re-derived from scratch rather than inherited, because the argument that
`push.sh` is *"cheapest by far"* was reasoning from a protocol gap that is not
there.

---

## 1. The shared assets

### 1.1 What the asset actually is, measured today

✅ **MEASURED 2026-09-21 on `New Pack.circuitpack` in this repository root**, with
`ls`, `unzip -l`, `shasum` and arithmetic on the WAV byte counts:

| | |
|---|---|
| the pack on disk | **3,506,555 bytes** (3.34 MiB) |
| sha256 | `d52145ad95d3a30bf6f022b65492e7fbbfc74bcb1292b139411bf9e929139386` |
| files in it | **164**, **6,861,471 bytes** uncompressed |
| `.wav` entries | **64**, **5,126,526 bytes** uncompressed |
| PCM after 64 plain 44 byte headers | **5,123,710 bytes**, **2,561,855 frames** |
| at 48 kHz | **53.37 s** of audio across all 64 |

📄 `plans/plan-circuit-samples.md` §2 has the same corpus read a different way:
every sample 48 kHz, 16 bit, mono without exception, shortest 0.12 s, longest
2.00 s, median 0.75 s.

🔴 **AND ONE NUMBER IN `research/pi-drum-machines-2026-09-21.md` §3.1 IS WRONG
AND IS CORRECTED HERE.** That file says *"Sixty four buffers of 48 kHz mono is
5.1 MB of RAM"*. **5.13 MB is the DISK size of 16 bit WAVs.** scsynth holds a
buffer as **float32**, so the same audio in the server is **2,561,855 x 4 =
9.77 MiB**. ✅ Computed here from the byte counts above. ⚠️ The conclusion does
not move at all, because 10 MiB on a Pi 4 is nothing, but a RAM figure that is
half the truth is the kind of number that gets quoted into a decision later.

### 1.2 Which file is the source of truth

**The pack the reader drops on the page.** Not the one in this repository.

🔴 **AND THAT IS NOT A DETAIL, IT IS THE WHOLE SHAPE OF THE PAGE.** 📄 `/tom/` is
a drop page: `createDrop` with `accept: ['.circuitpack', '.zip']`, and
`demo/tom/index.html`'s own comment says *"IT IS `open`, NOT `upload`, AND
NOTHING LEAVES THE MACHINE"*. 📄 `workers/view/build.mjs:150` keeps
`New Pack.circuitpack` off the deploy allowlist for good, because it holds 32 of
somebody's sessions, and `/tom/` gates its convenience path on
`PACK_HERE` (a local origin) for the same reason. **A visitor's pack is the only
pack a deployed page will ever see.**

⚠️ **SO ANY DESIGN THAT PUTS THE ASSET ON THE BOARD AHEAD OF TIME ANSWERS THE
WRONG QUESTION.** `push.sh` can only ever ship the one pack that is in this
checkout. The instrument the owner asked for is *"share assets to render"*, and
the assets are whatever got dropped.

### 1.3 🔴 SEND THE DECODED PCM, NOT THE FILE

The obvious move is to ship the `.circuitpack` and let the board's scsynth
`Buffer.read` it. **Do not.** Three reasons, in order of weight:

1. 🔴 **IT PUTS A SECOND WAV DECODER INSIDE THE COMPARISON.** 📄
   `demo/shell/circuit-sample.mjs` walks the chunks rather than assuming a 44
   byte header, and its header says why in full: all 64 samples in this pack are
   `fmt ` then `data` and nothing else, *"so the audio starts at offset 44 in 64
   of 64 and a hard-coded 44 byte header would read this pack perfectly. It
   would also read a file carrying a `LIST` or a `fact` chunk as noise,
   silently."* The board would use libsndfile, which walks its own chunks, has
   its own view of a truncated `data` chunk, and resamples on its own terms.
   Two decoders reading one file is exactly the confound `PosSource.sc` was
   written to remove one level up: 📄 *"a spec that says `saw` means a 1/n table
   of sines in the browser and `Saw.ar` here, two different sounds wearing one
   name."*
2. 🔴 **IT PUTS A SECOND SORT ORDER IN.** 📄 `samplesIn` sorts by the last run of
   digits in a name, deliberately, because *"`sample_10.wav` sorts before
   `sample_2.wav` as text"*, and ✅ the owner's `index.json` names `Sample1` to
   `Sample64` against `sample_0.wav` to `sample_63.wav` in order, 64 of 64. A
   board listing a directory gets whatever the filesystem gives it. 📄 The module's
   own words: *"A page showing slot 10 where slot 2 lives would be wrong in a way
   nobody would spot by looking."*
3. **It ships 32 sessions and 64 patches that a sampler does not need.** The pack
   is not only samples, and `New Pack.circuitpack` is somebody's only backup of
   an instrument with no factory reset. There is no reason for a copy of it to
   exist on a machine in another building.

**So what goes on the wire is what `readWave` already extracted**: for each of 64
rows, the `data` chunk verbatim as int16, plus its declared `frames`, `rate`,
`channels` and `bits`. 5,123,710 bytes rather than 3,506,555, which is **46 per
cent more on the wire**.

⚖️ **AND IT IS WORTH IT.** The 1.6 MB saved by sending the zip is the price of a
second decoder and a second sort order inside the one claim the page exists to
make. `PosSource` paid that bill the other way round and
`demo/grains/defs/PROVENANCE.json` exists entirely to keep the two ends' bytes
honest afterwards.

⚠️ **THE DECODER DOES NOT DISAPPEAR, IT BECOMES UNAMBIGUOUS.** The board writes
each row as a canonical 44 byte RIFF PCM file under
`/opt/positron-board/packs/<sha>/sample_N.wav` and lets scsynth `Buffer.read` it,
because ⚖️ filling 64 buffers through `/b_setn` over OSC is a message-size fight
nobody needs and `Buffer.read` is one line. The file scsynth reads is a file we
wrote, from PCM we shipped, with exactly two chunks in it. There is no chunk to
misparse and no rate to convert. **And it is graded rather than argued**, by
§4.1.

### 1.4 How both ends prove they read the SAME thing

🔴 **A HASH OF THE PACK AT BOTH ENDS IS THE OBVIOUS MOVE AND IT IS NOT ENOUGH.**
It is worth having and it is the first gate, because it is one number, it fails
fast, and it is the only thing that catches *the board is holding last week's
pack*. What it cannot see:

- a row swap, because a swap does not change the file
- a decoder disagreement, because both decoders read the same bytes and disagree
  about what they mean
- a buffer that was allocated and never filled
- a buffer scsynth resampled on the way in

📄 **AND THIS REPOSITORY HAS MADE THE UNDERLYING MISTAKE THREE TIMES IN A ROW
AND WRITTEN IT INTO CLAUDE.md**: a name was not evidence, then a four byte head
was not evidence, then *"A UNIQUE HASH IS NOT EVIDENCE OF CONTENT"*. A hash can
only ever say *these bytes are not different*, which is a smaller claim than
*both engines hold this audio*.

**So the identity check is per row and it is three layers:**

| layer | what it proves | how |
|---|---|---|
| **1. the pack** | both ends are talking about one file | sha256 of the pack bytes, computed in the tab, echoed by the board, compared |
| **2. the shape** | the engine allocated 64 buffers of the right length at the right rate | `/b_query` per bufnum, which answers `frames`, `channels`, `sampleRate` for a buffer that really exists |
| **3. the audio** | the engine holds the same SOUND, not the same filename | `/b_getn` of a handful of samples at offsets the PAGE chose, compared against `toMono`'s output at those same offsets |

🔴 **LAYER 3 IS THE ONE THAT MATTERS AND IT IS `source.set`'S LESSON EXACTLY.**
📄 `rig/board/board.mjs:1062`: *"`ok` MEANS THE ENGINE HAS IT, not that this
process sent it"*, and the handler waits for `/s_get` and **compares the values**
rather than trusting that they are present, because *"A node that exists holding
the def's DEFAULTS is a node that never received the spec, and it would sound
almost right."* A buffer that exists holding zeros is the same failure with a
different UGen in front of it.

**The probe offsets are chosen from the audio, not from the index.** 📄
`circuit-sample.mjs`'s `content()` already returns `peakAt`, `leadingZeros` and
`trailingZeros` per sample. Probe at `peakAt` and at seven points spread across
`leadingZeros .. frames - trailingZeros`. ⚠️ **NOT at fixed offsets like 0, 1000,
2000**: 📄 that module's own note says a file of nothing but zeros counts as all
leading and no trailing, and a probe that lands in the lead-in passes for silence.

**Tolerance: 2 LSB of 16 bit, which is 6.1e-5 in the -1..1 the page works in.**
Both ends are reading the same int16; the only arithmetic between them is
`/32768` on one side and scsynth's own int16-to-float on the other. ⚖️ Whether
scsynth divides by 32768 or by 32767 is the sort of thing that differs between
libraries, which is why the tolerance is two steps rather than zero. Anything
wider than that is not a tolerance, it is a different sample.

**Budget: 64 rows x 8 probes = 512 floats.** ⚠️ `/pgrain` batches at 250 ms with a
cap of 120 values for a reason (📄 `run-pappus.scd:200`), so the probe reply is
batched the same way: 64 replies of 8, or a few hundred bytes a message, arriving
over a second or two. **It is a check that runs on a press, not a poll.**

---

## 2. Getting the assets there

### 2.1 What exists, corrected

See §0.1. The chunker exists twice and a receiver exists once.

### 2.2 Gap one: the discriminator, and which direction it is about

📄 `demo/shell/board.mjs:244` (the KIT module, in the browser) is the file that
says *"every page here treats an incoming binary frame as PCM"*, and its
`onBinary` reads a 12 byte header and hands the rest to `pcm-playout`. 🔴 **THAT
IS A CLAIM ABOUT THE BOARD TO BROWSER DIRECTION.** It is the direction that is
crowded.

📄 **THE BROWSER TO BOARD DIRECTION IS NOT CROWDED, IT IS CLOSED.**
`rig/board/board.mjs:1388`:

```js
ws.onmessage = (e) => {
  lastHeard = Date.now();                     // ANY frame proves the socket lives
  if (typeof e.data !== 'string') return;     // audio is ours, outbound only
```

**Every inbound binary frame is dropped on the floor, by one line, today.** So
there is no incumbent convention to break going up, and there is nothing to
discriminate against: the first binary frame the board ever accepts can define
the shape.

⚠️ **AND `demo/shell/wire.mjs` ALREADY HAS THE SENDER.** `sendBinary(buf)` at
line 285, *"No envelope: bytes, unchanged, which is what the relay's contract
says it carries."* It is not exposed by `createBoard`, which is a one line
addition to the kit rather than a design.

**RECOMMENDATION: a separate room, `studio-1-pack`, and then the discriminator
question does not arise at all.** 📄 That is the precedent `<room>-video` already
sets in `rig/board/board.mjs:250`, and its second stated reason is precisely
this one: *"It also keeps the binary framing unambiguous: every page here treats
an incoming binary frame as PCM."*

⚠️ **THAT BLOCK'S FIRST REASON IS STALE AND SHOULD NOT BE QUOTED FORWARD.** It
says *"The relay allows 60 messages a second PER SOCKET"*. 📄
`workers/relay/src/index.js:81` says `MSG_PER_SEC = 1000`, with its own comment
*"was 60"*. `positron-streaming` records that this exact number was stale in four
places for months and that **every stale value was too small**, so anything
reading it refuses work the relay would take. The rate argument for a second room
is gone. **The framing argument is not, and it is the one that applies here.**

A second room also gets its own byte budget, because 📄 `BYTES_PER_SEC` is per
socket, so a pack transfer cannot starve the audio stream that is being compared
while it runs.

### 2.3 Gap two: completeness, and what to do about a hole

The sequence number gives ordering for free. A file transfer needs two more
things, and ✅ **the 101-of-361 measurement is the argument that neither is
hypothetical.**

**The header is `sendFrame`'s, unchanged in shape:**

```
uint32  seq          0 .. n-1, this transfer only
uint32  flags        bit 0 = last chunk        (sendFrame's bit 0 = keyframe)
...     payload
```

**Around it, three JSON verbs on the same room:**

- `pack.begin` from the page: `{ sha, bytes, chunks, chunkBytes, rows: [{i, name, frames, rate, bits, channels, offset}] }`.
  The row table travels first so the board can validate the byte total before it
  allocates anything.
- `pack.end` from the page: nothing but the id, so the board knows to stop waiting.
- `pack.status` from the board: `{ sha, have, want, missing: [seq...], ok }`.

**The board refuses to claim it holds a pack unless all three are true:** every
seq in `0 .. chunks-1` arrived exactly once, the assembled byte count equals
`bytes`, and the sha256 of the assembly equals `sha`. Anything else answers
`pack.status` with the missing list, and the page resends **only those seqs**.

⚠️ **A DUPLICATE IS NOT AN ERROR AND MUST NOT BE TREATED AS ONE**, because a
resend of a chunk that was merely late arrives twice. Last write wins on a seq
already held, and the count is of DISTINCT seqs.

⚠️ **AND THE SHA IS CHECKED AFTER ASSEMBLY, NOT PER CHUNK.** A per chunk hash
would cost another 32 bytes a chunk to catch a corruption the relay has never
been observed to produce: 📄 what it does is DROP, silently, and a drop is what
the sequence already catches.

### 2.4 Gap three: pacing, and the number that decides it

📄 **The relay's caps, read from `workers/relay/src/index.js:77-83`:**

| | |
|---|---|
| per message | `MAX_BYTES = 1000 * 1024` bytes |
| per socket, steady | `BYTES_PER_SEC = 8 MiB/s` |
| per socket, burst | `BYTE_BURST = 16 MiB` |
| messages | `MSG_PER_SEC = 1000`, `MSG_BURST = 2000` |
| sockets in a room | `MAX_SOCKETS = 128` |
| overruns before the socket is closed | `STRIKES = 50` |

**On those numbers, 5.12 MB is four or five messages and about 0.6 s.**

🔴 **AND THE ONLY LOSS MEASUREMENT THIS REPOSITORY HAS DISAGREES WITH THAT BY A
FACTOR OF EIGHT.** ✅ *"at 8 Mbit/s the relay lost 101 of 361 frames"*. 8 Mbit/s
is **1 MiB/s**, an eighth of the documented steady budget, and it still lost
**28 per cent**. ⚠️ **THE MEASUREMENT WINS.** A design that sends four 1 MiB
messages back to back because the cap allows it is a design that loses one of
them and finds out from a sha mismatch after a five second wait.

**So: 64 KiB chunks, paced, starting at 10 a second.**

| | |
|---|---|
| chunk | **65,536 bytes** |
| chunks for 5,123,710 bytes | **79** |
| at 10 a second | **640 KiB/s**, the pack in **7.9 s** |
| a resend round | 64 KiB, not 1 MiB |

⚖️ **640 KiB/s is below where the loss was measured and that is the only reason
for it.** ⚠️ **AND THE RATE IS A MEASUREMENT, NOT A CONSTANT.** The page sends at
a declared rate, `pack.status` says how many arrived, and the honest thing is to
report the delivered fraction in a readout cell and raise the rate on a clean
run. 🔌 **Nobody has ever measured the browser-to-board direction on this relay
at all**, so the first transfer is itself the experiment.

⚠️ **AND A GAP COUNTER CANNOT SEE EVERYTHING.** `positron-streaming`: a flood on
2026-09-17 delivered 2030 of 6000 and reported `lost 0`, because the loss was a
TAIL rather than a hole. Here the tail is covered, because `pack.begin` declared
`chunks` up front, so a transfer that stops at 60 of 79 is a missing list rather
than a satisfied receiver. **That is the whole reason the count travels ahead of
the data.**

### 2.5 What the board does with it, and when it throws it away

- **Keyed by sha, not by name.** 📄 `positron-verify`: *"KEY BY `id`, NEVER BY
  FILE NAME. A name is a thing a re-encode changes."* Two readers with the same
  pack send the same sha and the second transfer is answered
  `pack.status {ok: true, have: 79}` without a byte moving.
- **A cache of one, or two.** 5 MB of PCM plus 10 MiB of scsynth buffers per
  pack. Hold the current one and drop the previous on a new `pack.begin`.
- **It expires like the insert does.** 📄 `sweepInsert()` and `INSERT_HELD_MS`
  (15 s, 📄 `rig/board/board.mjs:141`, chosen as 3.75 of `/grains/`'s 4 s poll
  rather than picked) are the exact precedent, and its reasoning transfers word
  for word: there is no *a peer left* signal on this relay, `webSocketClose()` is
  empty, and a client that is still there keeps talking. A pattern that is
  running when the page closes must stop, and the buffers can outlive it because
  they cost nothing to hold.
- **It is announced on the heartbeat, not on a verb of its own.** 📄 `board.alive`
  already carries `fx`, `fxBy`, `fxAgoSec`, `fxHeld` for exactly this, and
  `sweepInsert`'s comment says why: *"a new message type would be a second
  authority on one fact."* So `pack` (the sha), `packBy`, `pattern` (the version)
  and `patternBy` ride the same beat.

### 2.6 🔴 SO IS THE RELAY NOW BETTER THAN `push.sh`? YES, AND IT IS NOT CLOSE

Re-derived rather than inherited, because the brief's *"cheapest by far"* was
reasoning from a gap that is not there.

| | `push.sh` | over the relay |
|---|---|---|
| **which pack** | 🔴 **only the one in this checkout.** A reader's dropped pack cannot reach the board by this route at all | whatever was dropped |
| **who can run it** | somebody on the board's LAN. 📄 `push.sh` scans `192.168.x.0/24` for port 22, and `positron-hardware` records that the board answers over the relay from any network while ssh needs the studio LAN | anybody with the page open, from anywhere |
| **does it need the pack in the tar** | 📄 no. The tar list is `rig/board rig/vis` plus the modules `rig/board/*.mjs` imports. **`New Pack.circuitpack` is not shipped and would have to be added**, and then every push carries 3.3 MB | nothing changes in `push.sh` |
| **cost to a listener** | 🔴 **`--restart` takes the sound away.** `systemctl restart`, then jackd, then the instrument's warmup ceiling (📄 6 s, 13 s for yoshimi), and Pappus is a cold compile that 📄 `/grains/` calls *"about forty seconds the first time"*. Up to a minute of silence for somebody in another building | **none.** No restart, no re-patch, no instrument switch |
| **what it costs** | one line in the tar list | a verb family, a store, and ~8 s of somebody's uplink per new pack |
| **is it gradable without the Pi** | no | yes, §7 |

🔴 **AND THE FIRST ROW ON ITS OWN SETTLES IT.** `/tom/` is a page whose entire
way in is a dropped file. A transport that can only ever carry the repository's
own pack does not implement the request.

**`--no-restart` keeps one job**: shipping the board CODE that answers the new
verbs. That is a deploy, not an asset transfer, and it is what `push.sh` is for.

---

## 3. The score on the wire

### 3.1 What a step event would cost, and why it is still the wrong shape

At 120 bpm, 📄 `/tom/`'s `STEP_MS = 125`, so 8 steps a second. Against
`MSG_PER_SEC = 1000` that is **0.8 per cent of the budget**. Bandwidth is not the
constraint and was never going to be.

🔴 **THE CONSTRAINT IS JITTER, AND THE ONLY MEASUREMENT THIS REPOSITORY HAS IS
BIG ENOUGH TO RUIN IT.** ✅ 2026-09-16, off this relay with a node client and no
browser in the way, 992 frames in 20 s: **nothing lost, mean gap exactly 20.0 ms,
p90 29.5, p99 43.5, worst single gap 83.6 ms** (📄 `demo/shell/board.mjs:336`).

⚠️ **THAT IS THE BOARD TO BROWSER DIRECTION AND IT IS BEING USED HERE AS A PROXY
FOR THE OTHER ONE.** ⚖️ My reading is that it is the right order of magnitude
because it is the same relay, the same Durable Object hop and the same two
networks, but it is a proxy and it is marked as one. 🔌 The browser to board
direction has never been measured.

**83.6 ms is two thirds of a step at 120 bpm.** A step-per-message clock would
make the board's pattern flam at random, and a listener would hear it as a badly
played drum machine rather than as a network. **Refused.**

### 3.2 The pattern as a spec, which is `source.set`'s shape

**One message on change:**

```
pattern.set {
  version: 7,                 monotonic, per page
  sha: "d52145ad...",         WHICH PACK this pattern is about
  steps: 16,
  bpm: 120,
  rows: [ { i: 3, bits: "8080" }, { i: 11, bits: "2222" } ],
  maxVoices: 16,
}
```

- **Only rows that have a sound and have a cell on.** 📄 `/tom/` already knows
  both: `hasSound(r)` and `onCount()`.
- **`bits` is the row's 16 steps as hex**, 4 characters. A full 64 row grid is
  64 x 4 characters of payload, a few hundred bytes. One message, always, with
  `MAX_BYTES` three orders of magnitude away.
- 🔴 **`sha` IS NOT OPTIONAL AND IT IS THE MOST IMPORTANT FIELD.** Without it a
  pattern arrives for a pack the board does not hold and the board plays row 3
  of last week's samples, which is `source.set`'s *"a node that exists holding
  the def's DEFAULTS"* wearing a sampler's clothes. The board refuses a
  `pattern.set` whose sha it does not hold, and says so.
- 🔴 **`version` IS THE SECOND MOST IMPORTANT.** The board echoes the version it
  is PLAYING on `board.alive`. Without it, a `pattern.set` lost at the relay
  leaves the board on the previous pattern and the only symptom is a hit count
  that differs, which reads as a timing fault. **It turns a silent divergence
  into a named one.**

⚠️ **DEBOUNCE THE SEND, DO NOT SEND PER CELL.** 📄 `/tom/`'s `paint()` fills cells
on `pointerover` while the button is down, so a drag across a row is a message a
frame. A 100 ms trailing debounce makes a fast drag 10 msg/s and a normal edit
one message.

### 3.3 The bar mark, which is the only per-beat traffic

`pattern.bar { version, bar, at }` once per bar. At 120 bpm that is **one message
every 2 s**, and it exists so the board can tell whether its own bar has walked
away from the browser's. It is not a trigger and the board does not wait for it:
a bar mark that arrives 80 ms late moves nothing, it is DATA for §4.3.

---

## 4. The clock

### 4.1 Who is master

**The browser, and the board follows.** Three reasons:

1. 🔴 **The hand that presses is there.** 📄 `research/pi-drum-machines-2026-09-21.md`
   §8.2: *"For playing, `/tom/` is not merely adequate, it is the better
   instrument on this rig, and the reason is structural rather than a matter of
   effort."*
2. **The board has no `timeline/` deck**, and writing one there is a second
   authority on a quantity this repository already owns. 📄 `plan-circuit-samples.md`
   §6 is already right that *"a drum machine that invents its own clock is a drum
   machine that cannot line up with anything else here"*.
3. ⚖️ **scsynth's own scheduler is better than a browser timer**, which is why
   the board runs its OWN bar rather than being triggered step by step. The
   browser owns the TEMPO and the PHASE; scsynth owns the sixteen subdivisions
   inside a bar.

### 4.2 What happens to the other end's drift

🔴 **THE TWO ENDS ARE NOT IN TIME AND CANNOT BE, AND THE DESIGN HAS TO SAY SO
RATHER THAN CHASE IT.** ⚖️ 160 to 220 ms, a sum of parts and not a measurement
(📄 research §2.1), of which two terms have never been measured at all: ffmpeg's
JACK capture buffer and the board's own handling time. ✅ Beside it, separately
measured 2026-09-14 (📄 PROGRESS.md): relay round trip 42 to 44 ms for two peers
on one Pi, 64 to 69 ms Mac to Pi.

**So the quantity that must be steady is the OFFSET, not zero.**

```
offset(bar n) = (the board's bar n start, by its own clock)
              - (the browser's bar n mark, by its own clock)
```

- **Its VALUE is meaningless** across two clocks with an unknown skew between
  them. Do not assert on it.
- **Its VARIANCE over N bars is the measurement.** A constant 210 ms is a PA
  system. A 210 ms that walks 40 ms a bar is a fault, and it is the fault that
  says one end is counting laps differently.
- 📄 This is §8.3's own framing arriving as arithmetic: *"The person pressing
  hears their own tab now. The room hears the board 200 ms later. The delay
  becomes a room delay instead of a play delay, which is the difference between
  a latency and a PA system."*

**Correction, when it is needed: nudge, never jump.** If the offset has walked
more than half a step, the board adjusts its next bar's length by a few
milliseconds rather than restarting the bar. ⚠️ A jump is audible as a dropped or
doubled beat and a nudge is not, and this is the same reasoning `PosSource`'s
`fadeTime` is built on: 📄 *"a spectrum crossfade is between two different sounds,
and 50 ms of that is a lurch."*

### 4.3 🔴 WHAT THE 21.33 ms JACK BLOCK DOES, WHICH IS THE FLOOR ON ALL OF IT

📄 `rig/board/jacksynth.mjs:631`: `jackd -r -d dummy -r 48000 -p 1024`.
**1024 frames at 48 kHz is 21.33 ms**, and 📄 `RATE = 48000, FRAME = 960` at
`jacksynth.mjs:19` makes the capture 20 ms frames on top of that.

Three consequences, and the third is the one that decides a threshold:

1. **The board's sound leaves on a 21.33 ms lattice.** At 120 bpm a step is
   125 ms, so a hit can be up to **17 per cent of a step** away from where it was
   asked for, with nothing wrong anywhere.
2. **No amount of clock work gets under it.** The offset in §4.2 cannot be
   steadier than one block at each end of the measurement.
3. 🔴 **SO THE COMPARISON'S TOLERANCE IS 2 x 21.33 = 42.7 ms AND A CHECK THAT
   CLAIMS TIGHTER IS MEASURING ITS OWN NOISE.** That is the single most
   load-bearing number in §5 and it is arithmetic on one line of one file rather
   than a threshold somebody tuned until the run went green.

⚖️ **AND IT IS THE STRONGEST ARGUMENT IN THIS DOCUMENT FOR `-p 256`**, which
📄 BACKLOG already prices at one line and *"about thirteen seconds of silence"*
for everybody in the room. 5.33 ms would make the comparison four times sharper.
**I REFUSE TO RECOMMEND DOING IT AS PART OF THIS WORK** (§8), because 42.7 ms is a
workable tolerance at 120 bpm and it is somebody else's room. It is named as the
one change that would sharpen everything here, to be made when nobody is
listening and for its own reasons.

⚠️ **ONE 1 ms ASYMMETRY, NAMED SO IT IS NOT REDISCOVERED.** 📄 `/tom/` schedules
every step at `i * STEP_MS + SCORE_EPS` with `SCORE_EPS = 1`, because
`timeline/transport.mjs` re-arms on `ev.at > st.p0` strictly, so an event at
exactly 0 is silent on every lap after the first. The board has no such
constraint and would use `i * STEP_MS`. **The two ends are therefore 1 ms apart
by construction**, which is 0.05 of a JACK block and 0.008 of a step. Negligible,
and it must be in the board's own comment or somebody will spend an afternoon on
it.

---

## 5. 🔴 THE COMPARISON, WHICH IS THE ONLY PART THAT MATTERS

### 5.1 The rule the whole section is built on

📄 `/grains/`, in its own assert, states the principle this repository arrived at:

> *"both panes are graded against the slider rather than against each other. Two
> ends compared only to each other agree when they share a fault; compared to the
> number asked for, they cannot."*

**So every comparison here is THREE numbers, never two: what was ASKED FOR, what
THIS PAGE did, and what the BOARD'S ENGINE answered.** A row of two numbers that
match is the shape of a bug that both ends inherited.

And the second rule, 📄 CLAUDE.md and `positron-verify` both:

> *"A count is only evidence on the far side of the boundary. `createMidiLane`'s
> `scheduled()` counted what the page QUEUED and read identically to delivery,
> while every note was being scheduled fifty six years out."*

### 5.2 Comparison one: the assets

| | |
|---|---|
| **asked** | 64 rows, sha `d52145ad...`, every row 48 kHz mono 16 bit |
| **here** | `bufs.size` decoded; per row `frames`, `rate` from `readWave`, and 8 probe samples from `toMono` |
| **the board's engine** | `/b_query` per bufnum for `frames`, `channels`, `sampleRate`; `/b_getn` at the page's offsets |
| **readout** | `rows 64/64`, `probe 512/512` |

**RED when** any row's `frames` differ, any rate is not 48000, any probe sample
differs by more than 6.1e-5, or a row is present at one end and absent at the
other.

⚠️ **NOT `packSha === packSha`.** That is one comparison of one number that both
ends copied from the same message.

### 5.3 Comparison two: the score

| | |
|---|---|
| **asked** | `onCount()` cells on, at bar `n`, at version `v` |
| **here** | 📄 `/tom/` already separates the two sides of this boundary: `actuated` counts scheduler calls, `voices` counts `BufferSource`s that really started. **`voices` is the one to compare**, because a step with no cell on it actuates and is silent |
| **the board's engine** | hits reported by `SendReply` from INSIDE the running synth, batched in sclang, carrying `(row, bar, step)` |
| **readout** | `bar 12`, `here 6`, `board 6` |

🔴 **THE BOARD'S COUNT COMES FROM `SendReply` AND NOT FROM NODE SAYING IT SENT AN
`/s_new`.** A count of messages the board process emitted is `scheduled()` with a
Raspberry Pi in it. 📄 `Engine_Pappus.sc`'s `report` control and
`run-pappus.scd`'s `~grainBuf` batching at 250 ms with `~grainCap = 120` are the
mechanism, already written, already proved, already carrying the honest
`~grainSeen` count beside the truncated list *"so the far end can tell few grains
from few messages"*.

🔴 **PER BAR, BY BAR INDEX, NEVER AS A RUNNING TOTAL.** Two running totals
converge on the right answer while being one lap apart, and 📄 research §8.3 names
that exact failure as the thing the comparison exists to catch: *"the check that
would catch the whole thing being silently one lap out."*

**RED when** `board hits(bar n) != page voices(bar n)`, or the board's reported
version is not the page's version, or the board reports hits for a bar the page
never marked.

### 5.4 Comparison three: the timing

| | |
|---|---|
| **asked** | a bar is `16 x 125 / rate` ms. At 120 bpm, 2000 ms |
| **here** | 📄 `worstLate`, which already exists and is already measured against the millisecond the SCORE asks for rather than against the previous step |
| **the board's engine** | the interval between consecutive bar starts, by scsynth's clock; and `offset(bar n)` from §4.2 |
| **readout** | `late 3.2 ms`, `bar 2001 ms`, `spread 18 ms` |

**RED when** the board's bar interval differs from the asked-for bar by more than
**21.33 ms** (one block), or the spread of `offset` over 8 bars exceeds
**42.7 ms** (one block at each end).

⚠️ **THE `late` CELL ASSERTS FINITE, NOT A BOUND, AND THAT STAYS.** 📄 `/tom/`'s
own comment: *"A threshold on a timer lane under a loaded headless Chrome is a
check that goes red for reasons that are nothing to do with this page."* The same
applies to a board on the other end of a relay. **The bound goes on the BOARD's
bar interval, which is scsynth's clock and is not subject to a headless Chrome.**

### 5.5 🔴 WHAT THIS COMPARISON COULD NOT DETECT

Required, and it is the most useful part of this section.

1. 🔴 **BOTH ENDS PLAYING THE WRONG SAMPLE, IDENTICALLY.** The board is fed the
   BROWSER's ordering, so a row-order bug in `samplesIn` propagates and is
   invisible to everything above. The only independent witness is `index.json`,
   and 📄 `circuit-sample.mjs` deliberately does not read it, for a measured
   reason: the two packs in `purchased/` list 128 samples in their index and
   *"neither zip holds a single `.wav`"*. **So the ordering claim rests on one
   implementation with no second opinion, and this comparison does not change
   that.** It is an argument for a separate one-off check against `index.json`,
   reported and never used as a decision.
2. 🔴 **NOTHING HERE PROVES THE BOARD MADE A SOUND.** `/b_getn` says what the
   BUFFER holds. `SendReply` says a synth started. Neither says anything left the
   JACK graph. 📄 This repository has the exact story: *"a steady -6.1 dBFS
   subsonic drone while `board.alive` reported `voices: 0`"*, and
   `demo/shell/board.mjs`'s own comment that *"104 frames of audio read green
   through a reported silence"*. **The only honest witness is level**, and
   `createBoard` already has it: `outLevel()` on the playout's own output, plus
   the arriving `peak` per frame. It has to be a cell AND an assert, and
   `positron-verify` records that a cell alone is not an assert.
3. **A pattern played backwards inside the bar.** Counting hits per bar cannot see
   order. Carrying the step index in `SendReply` lets the SET be compared, which
   catches a missing or extra step, **but not a bar that fired all sixteen steps
   in its first 10 ms.** The bar-interval check catches a bar of the wrong length
   and not a bar that is internally wrong.
   - 🔌 **WHAT WOULD SETTLE IT**: a cross-correlation between the tab's own render
     of the pattern and the PCM coming back from the board. That is the real
     measurement and it is a page of DSP. §8 refuses it explicitly.
4. **A dropped `pattern.set`**, except that §3.2's `version` echo turns it from
   invisible into named. Without the echo, this list would have it as undetectable.
5. **Anything under 21.33 ms.** By construction, §4.3.
6. **A second driver.** If another page is also sending `pattern.set`, the counts
   are two patterns' worth and read as chaos. 📄 `insertState()`'s `fxBy` and
   `fxHeld` are the precedent and the answer: `patternBy` on the heartbeat, and
   the badge says who.
7. **Silence in the buffers, if the probes land badly.** Mitigated by choosing
   offsets from `content().peakAt` (§1.4) and by asserting `peak > 0` at both
   ends, but it is a mitigation rather than a proof.

⚠️ **AND THE HOLES ABOVE ARE NOT FOUND BY READING, THEY ARE FOUND BY SABOTAGE.**
📄 `positron-verify`: a stand-in serving every recording at HALF its length read
38/38, and one serving SILENCE read 38/38 too. **Four instances of one pattern.**
The stand-in in §7 step 4 must be broken on purpose in at least four ways, each
named, each with the assert it is supposed to take red.

---

## 6. The sampler on the board

### 6.1 🔴 THE SYNTHDEF DOES NOT NEED sclang, AND THIS IS THE BIGGEST FINDING IN THE PLAN

📄 `demo/shell/synthdef.mjs` is 382 lines that **write a SuperCollider synth
definition as bytes, in the tab**. `graph(name)` takes any UGen class name,
`params()` emits the `Control` block, `block()` adds a building block with its
inputs and rate, `out()` closes it, `bytes()` emits a version 2 `.scsyndef`.
📄 `SIZE_CEILING = 65488`. 📄 `demo/shell/scsynth.mjs` boots real wasm scsynth in
the tab and loads a definition.

**So the drum SynthDef can be ONE artefact, built in one place, with no build
step and no Pi:**

```
graph('posdrum')  ->  bytes  ->  /d_recv into wasm scsynth in the tab
                          \ ->  pack.def over the relay -> /d_recv into the board's scsynth
```

🔴 **THAT IS STRICTLY BETTER THAN THE `PosSource` ARRANGEMENT AND IT IS WORTH
SAYING WHY IT IS AVAILABLE HERE AND WAS NOT THERE.** 📄
`demo/grains/defs/PROVENANCE.json` exists because Pappus is a 2,030 line
SuperCollider CLASS, compiled by sclang, and the only honest way to get its bytes
is to compile them on the board and hash the sources: *"a stale artefact is
otherwise silent in the worst direction: the browser would run an OLD graph while
the board runs a new one, and the page's whole claim is that they are the same."*
**A `PlayBuf` voice is small enough to hand-write, so that whole apparatus is
unnecessary and there is nothing to go stale.** One artefact, produced in the tab,
sent to both engines, byte identical because it is the same buffer.

⚠️ **THE TRAP IS THE UGEN INPUT ORDER AND IT FAILS QUIETLY.** `graph()` has no
UGen database, so `PlayBuf`'s inputs (`numChannels` is a def-time argument, then
`bufnum, rate, trigger, startPos, loop, doneAction`) have to be got right by hand
off SuperCollider's own source. 📄 That file's own header already says who the
grader is: *"WHAT GRADES THIS FILE IS NOT THIS FILE... The grader here is real
scsynth, compiled to wasm, which either plays the bytes or does not."*
**So it is graded in the tab first, where it is free, and only then sent to the
board.**

⚠️ **AND THE BOARD WOULD BE EXECUTING A GRAPH A BROWSER SENT, OVER A TOKENLESS
RELAY.** Named rather than glossed. 📄 `params.set`'s own comment states this
board's standing posture: *"the relay is tokenless, so anyone in the room can send
it. The blast radius is one granulator's parameters on one board, strictly smaller
than `patch.apply` or `audio.start`, which have been open all along."* A SynthDef
is a larger blast radius than a parameter and a smaller one than `audio.start`,
and 📄 `SIZE_CEILING` plus `readSynthDef` mean the board can READ what it was sent
before it loads it. ⚖️ My reading is that it is acceptable on the same terms
everything else here is, and it is the one decision in this plan that deserves to
be put to the owner rather than assumed.

### 6.2 What it costs in buffers, RAM and UGens

**Buffers.** 64 for the pack. 📄 Counted in `Engine_Pappus.sc`: `buf`, `bufr`,
`buf2`, `buf2r`, `dbuf`, 17 `envbufs`, `patbuf`, `patbuf2`, so about **24
already**, plus `PosSource`'s **2** wavetables. 🌐 scsynth's `numBuffers` default
is 1024 and 📄 `run-pappus.scd` does not change it. **64 more is not near it.**

**RAM.** ✅ **9.77 MiB** for the whole pack as float32 (§1.1), not the 5.1 MB the
research quoted. On a Pi 4 that is nothing whichever variant it is.

**UGens.** A `PlayBuf` voice is roughly `PlayBuf.ar` + a `Line`/`EnvGen` for the
`doneAction` + `Out.ar`, plus a `SendReply.kr` and an `Impulse.kr` for the report.
⚖️ Call it 5 to 8. The def itself is a few hundred bytes against 📄 `PosSource`'s
4,508 and Pappus TINY's 64,733.

🔴 **THE DEF IS NOT THE RISK. THE NUMBER OF SIMULTANEOUS NODES IS.** 📄 `/tom/`'s
own comment: *"Sixty four rows can land on one step"*, which is why its master
gain is 0.5. Sixty four `PlayBuf` nodes at once is maybe 500 live UGens.

📄 **AND THE FAILURE MODE IS SILENCE, WHICH IS WHY THIS PARAGRAPH EXISTS.**
`PosSource.sc`'s header records it verbatim:

> `DEF bytes=46815 ugens=1151`
> `exception in GraphDef_Load: exceeded number of interconnect buffers.`
> `*** ERROR: SynthDef posSource not found`

1,151 UGens, **refused at `numWireBufs` 64 AND at 128**, with the only visible
symptom being silence. 📄 `run-pappus.scd:22` now asks for 128 *"as headroom
rather than as the repair"*.

⚖️ **MY READING: A DRUM MACHINE SITS FAR BELOW THAT, AND THE REASON IS
STRUCTURAL RATHER THAN A MATTER OF SIZE.** What exhausted the pool was
`Mix.fill` holding every partial live at once inside ONE synth, so the wire count
scaled with the table. Sixty four independent synths each writing `Out.ar` to one
bus do not hold each other's wires. 🔌 **UNMEASURED, and the failure mode is
silence with no error, so it is the first thing to check on the board and the
first thing a stand-in cannot tell you.**

**The cheap guard is a declared voice cap that REPORTS when it bites.**
`maxVoices` in `pattern.set`, and the board says on the heartbeat how many hits
it clipped. A divergence in the counts then has a named cause instead of being a
mystery, which is 📄 the whole argument of `demo/shell/board.mjs`'s playout
counters: *"Every stage that can discard data needs a counter a page actually
displays."*

### 6.3 Where it sits in the JACK graph

📄 `jacksynth.mjs` names the five ports once, and `posboard:input_1` is the end
of the chain: *"the frames a page HEARS are whatever is summed into
`posboard:input_1`."* Two places the drum machine could go:

**(i) A new `JACK_SYNTHS` entry: its own scsynth, its own JACK client, patched to
the capture.**
- ✅ Precedent exists and is proved safe: 📄 `writedefs.scd` runs *"A SECOND
  scsynth on its own UDP port, its own buffers and its own JACK client"* and says
  it *"does not touch the running service"*.
- 🔴 **But `startJackSynth` REPLACES.** 📄 `startAudio`'s comment: *"REPLACE, do
  not refuse. This used to return `{already:true}` when anything was running, so
  picking a second instrument left the first one ALSO streaming."* So raising the
  drum machine as an INSTRUMENT takes Yoshimi or Pappus away from whoever is
  listening, which is the *"it happened for real"* failure §8 is about.

**(ii) The drum def loaded into the scsynth `run-pappus.scd` already runs,
writing to `ctx.out_b`.**
- ✅ **No JACK re-patch at all**, which is the reason `PosSource` went this way:
  📄 *"IT WRITES TO PAPPUS'S OWN INPUT BUS, so there is no JACK re-patch of
  SuperCollider at all, and a re-patch is what made `fx.pappus` answer `ok` seven
  seconds before anything could be heard."*
- ✅ Reuses `/pappus/cmd`, the `~boxOut` reply address on 57321, the OSCdef
  pattern and the `/pgrain` batching, all of which are written and working.
- ⚠️ **AND IT COMES WITH A CONDITION THAT IS NOT OPTIONAL: Pappus has to be UP.**
  That scsynth only exists because `fx.pappus` raised it, and 📄 `/grains/` calls
  the cold compile *"about forty seconds the first time"*. The drum machine
  inherits that wait.
- ⚠️ **AND A ROUTING CHOICE THAT MUST HAVE A DEFAULT.** Writing to `out_b` puts
  the drums out dry; writing to `ctx.in_b[0].index` puts them THROUGH the
  granulator, which is an interesting instrument and a different one. **Default
  DRY**, with the wet route as a named parameter, because a granulated drum
  machine that nobody asked for is a comparison that cannot be read.

**RECOMMEND (ii).** It adds a synth to a server that is already up rather than an
instrument that replaces one, which is the difference between a fourth claimant
and no new claimant at all (§8).

---

## 7. What a person hears, and when

### 7.1 Before an interface: say it plainly

🔴 **NOTHING THE BOARD PLAYS IS AUDIBLE IN THE ROOM THE BOARD IS IN.** 📄
`jacksynth.mjs:631` starts `jackd -r -d dummy`. The dummy backend. The only
output is `ffmpeg -f jack -i posboard` at `jacksynth.mjs:719`, cut into 20 ms
frames and pushed down a WebSocket. 📄 The research's own sentence:
*"The Pi is not the thing making sound in any sense a person standing next to it
could hear. It is a renderer whose only output is a WebSocket."*

⚠️ 🌐 A Pi 4 does have a 3.5 mm jack and nothing in `rig/` ever routes to it; the
linuxaudio wiki calls it *"11 bits only"* and *"not really suited for real-time,
low-latency audio processing"*. **Treat it as absent.**

**So what the drum twin buys before a converter arrives, and it is three things
and not five:**

1. ✅ **Somebody else hears it.** Anyone with a page in `studio-1` hears the
   board's rendering. `/tom/` is audible in exactly one tab. 📄 The research calls
   this *"the only genuinely new capability on the list"* and that is right.
2. ✅ **It survives the tab closing.** `Restart=always`, dials out on boot, and
   `sweepInsert()` already proves the board can hold and release state on its own
   heartbeat.
3. ✅ **The comparison itself**, which is valid on both sides of the hardware
   change and is the reason to build it now rather than after.

**And what it does NOT buy:**

4. 🔴 **An instrument in a room.** Adding a drum machine to a renderer with no
   converter **makes it a second source on a stream**, and calling it anything
   else is the sentence this project keeps paying for.
5. 🔴 **A doubling.** The board's stream is ⚖️ 160 to 220 ms behind, so playing
   the tab and the stream together is a **slapback**, not a fatter kick. **The
   page must not mix them by default.** One or the other, chosen, with the choice
   on screen. ⚠️ And when the board is being listened to, the tab's own
   `BufferSource` path is what should be off, because it is the one the person
   pressing can hear without any delay at all and it will mask the thing being
   measured.

**So the honest framing of the page before a converter: this is a CHECK, not a
PA.** The value is the numbers in §5. That has to be what `what` and `one` say,
in one sentence, per CLAUDE.md.

### 7.2 After an interface arrives

📄 BACKLOG already holds the plan: *"The change on the board is ONE LINE,
`rig/board/jacksynth.mjs:631`: `jackd -r -d dummy -r 48000 -p 1024` becomes
`-d alsa -d hw:N`."*

- The board makes sound in its own room, and the drum twin becomes a drum machine
  somebody can stand next to.
- 🔴 **`-p 1024` stops being free.** On a dummy driver 21.33 ms costs nothing and
  buys nothing; on a real converter it is the floor of every press and the first
  thing to bring down once xruns can happen at all.
- 🔌 **Press to sound becomes measurable for the first time**, which is the
  experiment BACKLOG already names: `/keys/`'s `lag` cell on a page, one press.
- ⚠️ 🔌 **What nobody has checked**: whether the Fast Track Pro enumerates cleanly
  on this kernel, at what rates, and whether it needs a `snd-usb-audio` quirk.
  Three commands settle it and none is guessing.

⚠️ **AND THE COMPARISON DOES NOT CHANGE AT ALL WHEN IT ARRIVES.** Every number in
§5 is about counts, buffers, bars and offsets, none of which knows whether there
is a converter. **That is the argument for building the comparison now.** The only
thing that moves is the tolerance in §4.3, which gets four times tighter.

---

## 8. The order of work, and what is testable without the board

🔴 **THE OWNER DOES NOT HAVE THE PI. SO STEP 1 MUST NOT NEED IT, AND NEITHER MAY
STEPS 2, 3 OR 4.** Only step 5 does, and by then there is something to send.

### Step 0. Decide the wire, in writing, before any code

The header (§2.3), the verb names, the `pattern.set` shape (§3.2), the probe
offsets (§1.4). ⚠️ 📄 CLAUDE.md: *"ANYTHING SHARED IS DONE ONCE, BY ONE AGENT,
BEFORE THE PAGE AGENTS START"*. This is that. No code.

### Step 1. `demo/shell/pack-wire.mjs`, pure, no socket, no board

`chunk(rows, { chunkBytes })` and `assemble(chunks, manifest)`.
✅ **Gradable on this machine today** with a node test and no browser:

- a full set in order
- a set with a hole, which must report the missing seqs and not claim ok
- a duplicate seq, which must not be an error
- an out-of-order arrival, which must assemble correctly
- a truncated last chunk, which must fail on the byte count before the sha
- a set whose sha does not match, which must fail even though every seq arrived

🔴 **THIS IS THE PIECE THE 101-of-361 MEASUREMENT DEMANDS AND IT IS THE CHEAPEST
THING IN THE PLAN.**

### Step 2. The drum SynthDef, in the tab, graded by the tab's own scsynth

§6.1. `graph('posdrum')` in `demo/shell/` or in the page, bytes out, `/d_recv`
into wasm scsynth via `demo/shell/scsynth.mjs`, `/s_new` on a buffer filled from
`toMono`, and listen.
✅ **Gradable here.** 📄 `readSynthDef` reads the bytes back as a separate pass,
so the page can print the UGen count and the size from the FILE rather than from
the writer's variables.
🔴 **DO NOT CLAIM THE TWO ENGINES RUN THE SAME DEFINITION YET.** The assert that
says so cannot exist until the same bytes have been into the board's scsynth.

### Step 3. The twin with no Pi in it at all

`/tom/` gains a second renderer: the SAME pattern driving wasm scsynth in the tab
through the drum def, beside the existing `BufferSource` path. Comparisons 1 to 3
run end to end with both ends inside one tab.
✅ **Fully gradable here**, and 🔴 **this is the step that catches most of the
bugs**, because it is the whole comparison with the network and the board taken
out of it.

### Step 4. `demo/fake-board.mjs`, and then break it on purpose

A node process that joins a relay room, answers `board.hello` and `board.alive`,
accepts `pack.begin`/chunks/`pack.end`, answers `pack.status`, accepts
`pattern.set`, and reports hits off a timer.

📄 **THE PRECEDENT IS `fake-station.mjs`, `fake-tapes.mjs` AND `fake-err.mjs`, AND
SO IS THE WARNING.** ✅ *"a stand-in serving every recording at HALF its corpus
length still reads 38/38, and one serving SILENCE reads 38/38 too"*, and `/now/`
and `/flipper/` were **fully green** against a stand-in with its refusal switched
off. **A stand-in makes a page runnable without making it graded.**

**So the sabotage list is part of the step, not a follow-up.** Each one names the
assert it must take red:

| sabotage | must take red |
|---|---|
| row 2 and row 10 swapped in the stand-in's store | the probe, §5.2 |
| every buffer filled with zeros | the probe AND the level assert, §5.5 item 2 |
| the stand-in ignores `pattern.set` and keeps the previous one | the version echo, §5.5 item 4 |
| one hit dropped per bar | the per-bar count, §5.3 |
| bars 10 per cent long | the bar interval, §5.4 |
| one chunk dropped in 79 | `pack.status`, step 1 |

**Anything that stays green was never being measured.**

### Step 5. The board, when the Pi is reachable

The verbs, the pack store, the `/d_recv` door in `run-pappus.scd`, the
`SendReply` batching. `push.sh --no-restart` first; a restart only when nobody is
listening (§9).

### Step 6. The one experiment §8.3 named

🔌 **Is the board's step timing, driven by messages rather than by its own clock,
steadier than 21.33 ms?** The research says this is the thing to measure before
building it. This plan has already answered it in the negative on the evidence
available (§3.1: p99 43.5 ms, worst 83.6 ms) and designed around it (§3.2, §4.1),
so **step 6 is the measurement that would falsify this plan's central choice**,
and it should be run as such rather than as a confirmation.

---

## 9. What it costs somebody else

1. 🔴 **`push.sh --restart` takes the sound away.** 📄 `systemctl restart`, then
   jackd, then the instrument's warmup ceiling (6 s, 13 s for yoshimi), and
   Pappus is a cold compile 📄 `/grains/` calls *"about forty seconds the first
   time"*. **Up to a minute of silence for somebody in another building**, and
   📄 `rig/board/README.md` records that it has happened for real: *"pressing an
   instrument button took the sound away from somebody in another building, mid
   note."*
   ✅ **§2.6 removes this from the asset path entirely.** It stays on the code
   path, where it belongs, and `--no-restart` covers most of it.
2. ✅ **The drum machine is NOT a fourth claimant, if §6.3's option (ii) is
   taken.** 📄 FluidSynth and hexter were removed from this board *"and the reason
   was the shared graph, not the code"*. Adding a synth to a server that is
   already up adds no claimant at all. Option (i) would add one.
3. ⚠️ **A second relay room costs a socket per page.** 128 in a room, and 📄
   `positron-streaming` records a full room as *"a silent outage, and a redeploy
   does NOT clear it"*, caused by orphaned harness Chromes. **Close the pack
   socket when the transfer is done**, rather than holding it for the session.
4. 🔴 **AND THE LARGEST AVOIDABLE COST IN THIS WHOLE PLAN IS ONE IMPORT.**
   📄 `/grains/` hand-rolls its socket with `openWire` directly and therefore does
   NOT carry `createBoard`'s `inSelfcheck: 'refuse'` guard, whose own comment is
   exactly this: *"a page-level guard protects the page that has one, which is
   never the page where the mistake gets made."* 📄 `verify.mjs` presses every
   button in `.pos-controls` on every page on every run.
   **A drum twin that hand-rolls its socket ships a 5 MB pack to a Raspberry Pi in
   another building on every suite run.** It must use `createBoard`, so
   `?selfcheck=1` refuses the send by default and `?board=1` is the escape hatch
   for somebody who has been asked to drive the real board.
5. ⚠️ **ADDING A CONTROL TO `/tom/` MOVES EVERY OTHER CONTROL'S HARNESS PRESS.**
   📄 `positron-verify`: adding one button to `/radio/` moved the looper's press
   from t+1 s to t+31 s and took an unrelated check red intermittently. 📄 `/tom/`
   declares `controls: []` **on purpose** and its comment says why. A board twin
   wants at least a connect control. **Diff the per-page assert count after, and
   account for every one that moved.** 📄 And `/wish/` is the standing warning:
   moving one control out of `.pos-controls` took 41 asserts to 2 **with the run
   still green**, third instance of that pattern.
6. **Somebody's uplink.** 5.12 MB per new pack, about 8 s at the paced rate.
   Trivial on a desk, not trivial on a phone.

---

## 10. What I refuse, and why

1. **Sending audio from the browser to the board.** The board has nothing to do
   with the tab's mix, and a second audio stream on a shared socket is the
   `startAudio` failure arriving from a new direction: 📄 *"two sources into one
   socket at 50 msg/s each, interleaved samples... it sounds like corruption and
   it is two instruments talking over each other."*
2. **A step-per-message clock as the sound path.** ✅ p99 43.5 ms and worst
   83.6 ms against a 125 ms step. §3.1.
3. **Lowering `-p 1024` as part of this work.** One line, four times sharper, and
   thirteen seconds of somebody else's silence. 42.7 ms is workable at 120 bpm.
   It is named in §4.3 as the change that would sharpen everything and it belongs
   to a session that is on the board for its own reasons.
4. **Shipping `New Pack.circuitpack` to the board.** It carries 32 sessions and 64
   patches a sampler does not need, and it is somebody's only backup. §1.3.
5. **A pack hash as the whole identity check.** It cannot see a row swap or a
   decoder disagreement, and 📄 CLAUDE.md has written down three times in a row
   that a hash is not evidence of content. §1.4.
6. **Counting `/s_new` sends on the board.** That is `scheduled()` with a
   Raspberry Pi in it. §5.3.
7. **Comparing running totals.** Per bar, by bar index, or the check agrees while
   being one lap out. §5.3.
8. **Adding a `clear` control to `/tom/`.** 📄 Its own comment is still right: the
   harness presses every button in `.pos-controls` in order, so a control that
   empties the pattern races the page's own reading checks.
9. **Building the cross-correlation between the board's returning PCM and the
   tab's render.** It is the only thing that would prove the board played the
   right pattern at the right TIMES (§5.5 item 3), and it is a page of DSP.
   **Named, not built, and the hole is written down rather than papered over.**
10. **Claiming the two engines run the same definition** until the same bytes have
    been into the board's scsynth and come back confirmed. §8 step 2.
11. **Mixing the board's stream with the tab's audio by default.** 200 ms is a
    slapback. §7.1 item 5.
12. **Publishing the pack.** 📄 `workers/view/build.mjs:150` keeps it off the
    allowlist for good and that does not change.
13. **Running any of this against the real board from a harness by default.** §9
    item 4.

---

## 11. What this could not settle

Named, because a plan written from reading says which of its readings are not
facts.

1. 🔌 **Whether the browser to board binary direction works on this relay at
   all.** Nothing has ever sent binary UP. 📄 The relay forwards every frame
   verbatim and never parses one, so ⚖️ it should, and 📄 the board drops it at
   `board.mjs:1388` today regardless. **Never measured.**
2. 🔌 **Whether 64 simultaneous `PlayBuf` nodes load on this board's scsynth at
   `numWireBufs` 128.** ⚖️ My reading in §6.2 is that they do, for a structural
   reason. **The failure mode is silence with no error**, which is the single most
   important sentence in this document to remember on the day it is tried.
3. 🔌 **Whether a hand-written `PlayBuf` graph out of `demo/shell/synthdef.mjs`
   loads and plays.** 📄 That file's own header says only real scsynth can grade
   it. Free to settle in the tab (§8 step 2) and it must be settled there first.
4. ⚖️ **`/b_getn`'s practical carrying capacity on this path.** 📄 `/pgrain`
   batches at 250 ms with a cap of 120 values for exactly this kind of reason.
   The 512 float budget in §1.4 is arithmetic, not a measurement.
5. ⚖️ **The jitter figure in §3.1 is the WRONG DIRECTION.** Board to browser, used
   as a proxy for browser to board.
6. ⚖️ **ffmpeg's own JACK capture buffer and the board's handling time.** Two
   unmeasured terms sitting inside every latency number in this plan and in the
   research it builds on.
7. 🔌 **Whether the board's bar interval is steadier than 21.33 ms.** §8 step 6.
8. 🔌 **`/tom/`'s `late` since the warm fix.** ✅ The 22.6 ms that produced the
   readout is a PRE-fix number and 📄 nobody has re-measured it. One visit settles
   it: open `/tom/`, run a pattern, read the cell.
9. 🔌 **The board's model.** ⚖️ Pi 4 from three traces, never read off
   `/proc/device-tree/model`. One free command.
10. ⚖️ **Whether the relay's 8 MiB/s per socket is real in practice.** ✅ 101 of
    361 lost at 1 MiB/s says something is wrong with taking it at face value, and
    that one measurement is all there is.
11. ⚖️ **Whether the owner is comfortable with the board loading a SynthDef a
    browser sent** (§6.1). This is a decision to put to a person, not an
    engineering unknown.

---

## 12. Where to open it, when there is something to open

Nothing here is built, so there is nothing to click yet. **When step 3 lands** the
twin is at `http://127.0.0.1:8890/tom/` behind `node demo/server.mjs`, with no
board and no relay needed. **When step 5 lands** the board half is at the same URL
with `?board=1` added, and it needs the board in `studio-1`, which means it is not
runnable from wherever the Pi is not.

---

## Sources

**Measured on this machine, 2026-09-21:** `New Pack.circuitpack` (size, sha256,
entry counts, WAV byte totals, frame and RAM arithmetic), `demo/manifest.mjs`
(58 demos; `tom` is `group: hardware`, `act: 4`, `built: true`).

**Read in this repository, 2026-09-21:** `demo/tom/index.html`,
`demo/shell/circuit-sample.mjs`, `demo/shell/board.mjs`, `demo/shell/wire.mjs`,
`demo/shell/scsynth.mjs`, `demo/shell/synthdef.mjs`,
`demo/shell/synthdef-audio.mjs`, `demo/grains/index.html`,
`demo/grains/defs/PROVENANCE.json`, `demo/mirror/index.html`,
`rig/board/board.mjs`, `rig/board/jacksynth.mjs`, `rig/board/pappus.mjs`,
`rig/board/push.sh`, `rig/board/norns/PosSource.sc`,
`rig/board/norns/CroneEngine.sc`, `rig/board/norns/run-pappus.scd`,
`rig/board/norns/writedefs.scd`, `rig/board/norns/TINY.md`,
`rig/board/norns/CHAIN.md`, `rig/board/norns/README.md`,
`workers/relay/src/index.js`, `workers/view/build.mjs`,
`research/pi-drum-machines-2026-09-21.md`, `plans/plan-circuit-samples.md`,
`BACKLOG.md`, `CLAUDE.md`, and the `positron-hardware`, `positron-streaming` and
`positron-verify` skills.
