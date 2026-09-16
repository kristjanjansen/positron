# rig/box — the instrument, as a service

The box dials **out** to `ws.positron.studio` and does its job whether or not
anyone is watching. A browser, `curl` and a phone are all equally clients of it.
Nothing here listens on a port, so there is no inbound hole and it works from any
network that allows outbound TLS.

**No browser on the box.** Every permission failure of 2026-09 came from running
one unattended: a grant that expired with its CDP client, a GUI app with no GUI
session, a crash-recovery dialog nobody could click. This is a node process
reading two ordinary Linux tools.

## Written before the board arrived, and green

    node test.mjs         38/38 on macOS, 39/39 on arm64 Linux, no hardware
    node live-test.mjs    13/13 against a running box over the real relay
    node bench.mjs        what one instrument costs on this board

`aconnect -l` parses cleanly, so the naming and validation layers — which are
the whole product — are testable against a fixture. The `fake` backend stands in
for the port list only; `apply` on it changes nothing and says so.

## Try it now, with no Pi

Two terminals, both on a laptop:

```sh
node box.mjs --room box-prep --dry                     # the service
node ask.mjs --room box-prep ports.get                 # a client, anywhere
node ask.mjs --room box-prep patch.plan '{"v":1,"links":[{"from":"circuit","to":"microfreak"}]}'
```

Both legs go over the real relay. `--dry` plans and never applies.

## On the board

```sh
git clone <repo> ~/positron && cd ~/positron/rig/box && sudo ./setup.sh
journalctl -u positron-box -f
```

`setup.sh` installs node 24 (Trixie ships 20, where `WebSocket` is undefined —
a failure that reads as "the relay is down"), `alsa-utils`, and two kernel
modules that stand in for hardware you have not plugged in yet:

| module | stands in for |
|---|---|
| `snd-virmidi` | four virtual MIDI ports — the patchbay, with no instrument |
| `snd-aloop` | a loopback capture device — this is BlackHole, for Linux |

So **the Circuit is the last thing needed, not the first.**

## The box makes its own sound

`synth.mjs` imports `demo/shell/rhodes.mjs` — **imported, not ported.** That
module was written as pure per-sample arithmetic for exactly this move, so the
maths running in an AudioWorklet at `/carry/` and the maths running here cannot
drift into two instruments that merely sound similar.

    node ask.mjs --room studio-1 note.on '{}'      # or from a browser, or a phone

Notes arrive over the relay, sound leaves over the relay. **Nothing is plugged
in** — no instrument, no interface, no soundcard. On the board a real keyboard
patched in with `aconnect` plays it too, because the synth is just another
sequencer port and the patchbay needs no special case for it.

| voices | M2 Pro | Pi 4, estimated |
|---|---|---|
| 8 | 39.8x realtime | ~3-4x, about a third of one core |
| 16 | 20.2x realtime | ~1.7x, about half a core |

The Pi column is derived from the class of chip, **not measured**. `bench.mjs`
settles it in ten seconds on the board and its number replaces this table.

`live-test.mjs` checks the thing that is easy to get wrong: not "frames
arrived" but **"the frames contain sound"** — rms before a note against rms
after it, plus a decay. A live, unmuted stream of digital silence looks
identical to a working one from every angle except the samples, which is how
three readings went wrong in 2026-09.

## Multitimbral, and it runs anywhere

`fluid.mjs` drives FluidSynth: **16 channels, 16 instruments, one process.**

    node ask.mjs --room studio-1 audio.start   '{"source":"fluidsynth"}'
    node ask.mjs --room studio-1 voice.select  '{"channel":1,"voice":"pad"}'

The discovery that makes this simple: FluidSynth's `file` audio driver is
**realtime-paced**, so the soundcard becomes a pipe into this process. No
`/dev/snd`, no ALSA, no mixer, no `snd-aloop`, no audio server. Notes arrive on
its stdin, so no sequencer either.

⚠️ **It must be a FIFO, not `/dev/stdout`.** fluidsynth writes happily to a
shell pipe, but under `spawn` it cannot re-open the inherited descriptor —
`Failed to open audio file '/dev/stdout' for writing`, and `/dev/fd/1` fails
identically. A named pipe is opened by path by both ends and has none of that
ambiguity. Open the read end **`r+`**, never read-only: a read-only open of a
FIFO blocks until a writer attaches, and fluidsynth has not started yet.

Measured on an M2, startup subtracted out: **0.088 s of CPU per second of
audio** with 24 notes sounding across six parts — about 9% of one core.

`fluid-test.mjs` checks the claim that matters: the same note under two voices
must sound *different*. Piano `tail/peak 0.087`, flute `0.556` — a decay against
a sustain. A multitimbral test that never compares two voices is testing a
config file.

## It runs in a container, with no sound hardware at all

The whole suite passes inside arm64 Linux with no `/dev/snd`:

    docker run --platform linux/arm64 -v "$PWD:/repo:ro" -w /repo/rig/box \
      fsbox node box.mjs --room <room>          # then fluid-test.mjs from anywhere

13/13, streaming over the live relay. This corrects `plan-hardware` §8.6, which
ruled containers out for the whole box: true for the patchbay, **wrong for the
instrument.** Making sound needs no kernel. It means a cloud instrument with no
hardware is real, and that everything except real ports and real capture is
testable in CI.

## The two we wrote, and removed

`demo/shell/rhodes.mjs` (FM electric piano) and `demo/shell/moog.mjs`
(subtractive) were written to answer one question: **what can a box do with
nothing but arithmetic?** Both are gone from the instrument list. What they
found is worth more than either of them.

**They lost to things already packaged.** `hexter` plays the *actual DX7
factory cartridges* — ROM1A/1B/2A/2B, E.PIANO 1 included, shipped in Debian
main — which is the patch `rhodes.mjs` was imitating from memory. SuperCollider's
`MoogFF` is a correct ladder filter. Neither took an afternoon to write.

**The Rhodes was diagnosed rather than merely disliked.** The first listener's
verdict was "super metally and has no warmth", and the measurement agreed:
spectral centroid of a 220 Hz note, **251 Hz soft against 621 Hz hard**, a
2.48x range — a soft note at a centroid of 251 Hz on a 220 Hz fundamental *is*
a sine, which is exactly what "thin" means. The cause is that a real Rhodes'
only nonlinearity is the **electromagnetic pickup** (Falaize & Hélie,
*J. Sound Vib.* 390, 2017: "this transduction mechanism is the only one that is
responsible for the characteristic Rhodes piano tones"), and this model has
none. Adding it is seven flops and **zero state**:

    const u = L2 - q * SWING + OFF;      // q = summed tine displacement
    out = (-2 * q / (u * u)) * qdot * g; // Phi'(q) * qdot

Verified against the documented prediction: with the pickup dead centre the
fundamental and every odd harmonic vanish to **-315 dB** and the note jumps an
octave, exactly as Modartt's manual and the Rhodes service manual describe.
`qdot` must come analytically from the same phasor — differencing `q` adds a
+6 dB/octave tilt.

**The Moog's resonance was measurably broken**, and is left that way on purpose
rather than quietly patched. Four cascaded one-poles give loop gain `k*g^4`,
and `g^4` collapses at low cutoff: **0.001 at fc 900 Hz, 0.011 at 2000**.
Resonance moves the peak 6% across its entire range. A real ladder compensates
the feedback for cutoff (Stilson & Smith, Huovilainen). It is a starting point
for anyone porting one, not a working filter.

**What they are still for.** They are pure per-sample arithmetic with no audio
library, so the same maths runs in a browser AudioWorklet (`/carry/`), in node
on the box, and in C on a microcontroller. **No plugin ports there** — not
hexter, not Yoshimi, not a sampler. If the box ever becomes a chip rather than
a Pi, this is the only code in this directory that comes along. Measured on the
Pi 4's A72: 8 voices at **6.8x realtime, 15% of one core**.

Reachable by explicit name (`audio.start {"source":"moog"}`) so the numbers
above can be reproduced. Not listed, not offered, not the default.

## Using a different synth instead

Everything below is apt-installable on Pi OS and headless by design. Each one
appears as an **ALSA sequencer client**, so `aconnect` patches to it and the
patchbay above needs no special case:

| synth | headless invocation | what it gives |
|---|---|---|
| **FluidSynth** | `fluidsynth -a alsa -m alsa_seq -i x.sf2` | 128 General MIDI instruments from a SoundFont, very light |
| **Csound** | `csound -odac -+rtmidi=alsaseq -M 0 x.csd` | anything — and `timeline/csound.mjs` already compiles this project's scores to it |
| **SuperCollider** | `scsynth -u 57110` | serious realtime synthesis, designed to run with no GUI |
| **Yoshimi** / **ZynAddSubFX** | `yoshimi -i` / `zynaddsubfx -U` | big multi-part synths |
| **Pure Data** | `pd -nogui -alsa` | patchable DSP |
| **sfizz**, **Carla** | headless plugin hosts | SFZ, LV2, VST3 |

**How their audio gets into the stream**, with no soundcard: `snd-aloop` (which
`setup.sh` already loads) is BlackHole for Linux. The synth plays to
`hw:Loopback,0`, `arecord` reads `hw:Loopback,1`, and the box forwards it —
`audio.start` with `source: "capture"`.

### What was actually tested, on arm64, with no sound hardware

| | available | runs with no soundcard | how audio gets out |
|---|---|---|---|
| **FluidSynth** 2.4 | yes | **yes, alone** | realtime-paced `file` driver -> FIFO |
| **SuperCollider** 3.13 | yes | yes, with JACK | `jackd -d dummy` -> `scsynth` -> a capture client |
| **Csound** 6.18 | yes | **yes, but offline** | renders to a pipe at ~150x realtime |

**FluidSynth is the only one that needs no audio server** — one process, and
that is why it is the default here.

**SuperCollider** works: `scsynth` is linked against `libjack.so.0`, and on a
dummy JACK backend it reported *"SuperCollider 3 server ready"* and exposed
`SuperCollider:out_1..8` with no `/dev/snd` anywhere. Three processes instead of
one, and you author every sound.

**Csound is a different shape, and the difference is useful.** Writing to a pipe
it is byte-exact — 576,000 bytes for a 3 s stereo score, precisely right — but
it is **not paced**: 3 s of score rendered in 0.02 s of wall clock, about 150x
realtime. Its realtime mode wants a real device (`-odac -+rtaudio=alsa` fails
with no `/dev/snd`). Two consequences:

- as a **live** instrument it needs a loopback or JACK, like SuperCollider;
- as a **score renderer** it is excellent, and that is what this repo already
  uses it for. `timeline/csound.mjs` compiles scores; 150x realtime means a
  whole piece renders in a moment and streams from there. A pipe with a slow
  reader also back-pressures the writer, so node reading at 50 frames a second
  paces it for free — with no live input, which is exactly the score case.

(`ldd` settled SuperCollider but not Csound, which loads its audio backends as
plugins at runtime — the error only appears when the device is opened. Reading
the linkage is not always enough.)

## A patch is a value

    { "v": 1, "links": [ { "from": "circuit", "to": "microfreak", "carry": ["all"] } ] }

A wrong MIDI patch is **silent** — nothing errors, no light changes, notes just
do not arrive, and you are in another city. So every verb that changes the rig
has a plan twin that changes nothing, names resolve against the ports ALSA
actually reports, and ambiguity is reported rather than broken by picking the
first match.

### ⚠️ `carry` is refused, not approximated

An ALSA subscription is **unfiltered**: it carries every message class the source
emits, and there is no per-class option on the connection. `aconnect` has no
filter flag, and the sequencer's event filter is per *client*, governing what a
client receives — not what a subscription between two other ports carries.

So a document asking for a subset (`carry: ["note"]`) is **refused**. Connecting
everything instead would leak clock and transport into a rig, which is most of
what makes dawless setups painful and precisely what the document exists to
control. Refusing is loud; over-connecting is silent.

This narrows `plan-hardware.md` §8.4, which assumed `carry` was expressible.
Filtering needs a process in the middle that reads and re-emits — which also
makes the box the timing path, the thing §8.4 warns against. **Unverified on real
hardware**; first thing to check on the board.

## What arm64 Linux already answered

Docker on this M2 is native `linux/arm64`, so the software-only half is settled
without the board (`plan-hardware` §8.6):

- `aconnect`, `arecord`, `aseqdump`, `amidi` all exist for arm64 — the apt
  packages in `setup.sh` are right
- node 24 on arm64 has the built-in `WebSocket` the box depends on
- the whole suite runs there: **39/39**
- and the finding that changed the code: **`aconnect -l` exits 1 with empty
  stdout when the sequencer is unreachable.** That used to throw an opaque
  `execFileSync` dump. Now it is a reported fact carried over the relay with a
  hint, because zero ports must never be able to mean both "ALSA is broken" and
  "nothing is plugged in".

What a container cannot answer is anything involving the kernel: no `/dev/snd`,
and `snd-virmidi` / `snd-aloop` are not in its kernel to load.

## 🔴 Two pages, one board, and who holds the granulator (2026-09-14, rewritten 2026-09-16)

`/box/` used to send `fx.pappus {on:false}` on load. `/grains/` sends
`{on:true}`. **Whichever you opened last won, silently**, and the other page
went on drawing a picture that was no longer true. That is the worst shape of
failure there is, because nothing anywhere said so.

⚠️ **Both pages were right.** `/box/` has no controls for the insert, and one
left behind by a `grains` tab that CLOSED wraps whatever it plays and feeds its
own delay: measured 2026-09-12, a steady **-6.1 dBFS** subsonic drone while
`box.alive` reported `voices: 0`. And the granulator is the entire subject of
`/grains/`. So the repair is not to stop either of them.

**First half: the board says what it is doing, and who asked.** The box is the
only end that knows; the pages were guessing. `insertState()` rides on
`fx.pappus`, on `audio.started` and on the **five-second `box.alive`** —

    fx      'pappus' | null
    fxBy     the client id that last changed it
    fxAgoSec how long ago
    fxHeld   whether that client has been heard from recently

so a page learns about a change it did not make **without polling**. 🔴 **This
half is the one that matters.** A page that says *"another page took the
granulator out of the sound"* is correct and honest with no arbitration at all;
**arbitration that hides the conflict is worse than none**, because it turns a
visible problem into an invisible one.

### 🔴 The board cleans up after itself now (2026-09-16)

`/box/` has no granulator on it at all since 2026-09-16, not even the message:
`grep -c pappus rig/box/listen.html` answers **0**. So the guarantee moved onto
the board, where it should always have been. A guarantee that depended on
somebody opening a second page was never a guarantee, because nobody had to open
one.

**`sweepInsert()` in `box.mjs` runs on the five-second heartbeat and again at
the top of `startAudio()`.** If the insert is in and the client that asked for
it has not been heard from inside `INSERT_HELD_MS`, the insert comes out,
`fxOn`/`fxAsked`/`madeSource` are cleared, the board logs it, and a `box.alive`
goes out **immediately** rather than on the next beat. There is no new message
type: every page already reads that heartbeat, and a second authority on one
fact is how they disagree.

🔴 **A REAL SIGNAL WAS LOOKED FOR FIRST, AND THERE IS NONE.** Checked in the
code rather than assumed: `workers/relay/src/index.js` forwards every frame
**verbatim and never parses one**, so the Durable Object does not know any
client's `from`; its `webSocketClose()` is an **empty method** and announces
nothing; and `openWire` in `demo/shell/wire.mjs` sends no farewell on unload.
`GET /room/<name>/stats` does report a per-socket idle time, but that array is
**anonymous and sorted**, so it cannot say WHICH socket went away. Teaching the
relay to announce a departure means teaching it to read messages, which is the
one thing that file refuses to do.

🔴 **SO THE NUMBER IS CHECKED, NOT CHOSEN.** `/grains/` has one
`setInterval(…, 4000)` whose first line is `hello()`, which sends `params.state`
**unconditionally** whenever the socket is open. So a tab nobody is touching is
a message every 4 s, and with the insert in it also re-sends `grain.report` on
the same tick. **15 s is 3.75 of those polls**, so one or two lost to the
relay's own caps cost nothing, and a closed tab is exactly **zero**. A window of
4 or 5 s would be arithmetically enough and would drop the insert out from under
a live page the first time a poll went missing.

⚠️ **IT NEVER FIGHTS A LIVE PAGE.** A granulator nobody is talking to is still
one somebody is listening to. A `/grains/` tab that is open and quiet is
indistinguishable from one being played, and that is correct. The same applies
to an instrument change somebody else starts: a **stale** insert is dropped
before the new instrument comes up, a **live** one is carried over, and the
board says which in that call's own reply.

🔴 **NO LEASE, NOTHING TO RELEASE, NOTHING TO LEAK.** A lease nobody can clear
is how `studio-1` sat full for hours. The relay solves the same problem by
DATING each socket (`getWebSocketAutoResponseTimestamp`) and reclaiming idle
ones; this is that idea in a smaller costume, on the only evidence the box
actually has: **a client that is still there keeps talking**. A client id is
minted per CONNECTION, so a claim can never outlive the tab that made it.

**`fx.pappus {on:false, onlyIfIdle:true}` is still implemented and nothing in
this repo sends it any more.** It is kept because it is a correct thing for a
person or another program to ask, and because it reads the liveness verdict
**out loud**, as `ok:true, on:true, kept:true` with the holder and both ages,
which the sweep cannot do for a caller that wants an answer now.

⚠️ **`/box/` is `listen.html`, it is `built: false`, and `demo/verify.mjs`
cannot see it**: it publishes no `__demo` and has zero asserts. That is why the
guard lives on the BOARD and why there is a harness for it:
**`node rig/box/insert-test.mjs --room studio-1`**, with two connections (one
pretending to be `/grains/`, one pretending to be `/box/` and therefore SILENT)
because a single socket would pass vacuously. A client is never held off by its
own claim. What it proves, and the controls that make it mean something:

| # | what it asks |
|---|---|
| 1 | the insert goes in when a page asks, and the board names the holder |
| 2 | the five-second heartbeat carries it, so a page learns without asking |
| 3 | **negative control.** A page that is open and quiet KEEPS its insert past the 15 s window. A board that swept on a plain timer fails here |
| 4 | the box half sent **nothing**, so what held the insert was the grains half being alive |
| 5 | the grains connection CLOSES and the board takes the insert out **with nobody asking**, announced on `box.alive` |
| 6 | an instrument started afterwards comes up with **no insert on it** |
| 7 | **negative control.** A fresh page can still put it in, and a plain `{on:false}` is still obeyed |

🔴 **IT HAS NOT BEEN RUN.** Written 2026-09-16 and not executed: it touches a
shared instrument in another building and nobody had said the board was free.

🔴 **AND `/box/` NO LONGER DRAWS THE GRANULATOR EITHER, ON INSTRUCTION.**
*"there is no ui to control it"*, which was true: the page had a box for it in
its diagram, a `let insert` following the board's reports, and a log line on
every ordinary visit saying the granulator was NOT in the sound. The first pass
(2026-09-16) took the picture and the narration; the second took the last
message. `archive/box-pappus/` and `plan-box-pappus.md` have both.

## 🔴 ERR's 1965 archive left the board (2026-09-16)

`errSearch`, `errItem`, `errExcerpt`, `errStatus` and `loadBuffers` in
`pappus.mjs`, the `source.search` / `source.load` / `source.clear` verbs in
`box.mjs`, the `archive` entry in `JACK_SYNTHS`, and the idle stop that existed
to keep it from streaming to an empty room. Three reasons:

- **no page in `demo/` called any of them.** Grepped, not remembered: `/grains/`
  uses `source.set` with a spec it makes itself, and `/box/` never offered the
  archive as an instrument at all.
- **`/box/`'s description stopped claiming an archive source weeks ago**, so the
  code was live and undescribed, which is the state things rot in.
- **CLAUDE.md's standing rule**: every connection this repo opens to ERR appears
  in a public broadcaster's audience measurement. An unused path to their
  archive, from a machine nobody is watching, is exposure with no benefit. The
  `archive` source was the sharp end: `-stream_loop -1`, about 28 MB an hour,
  for as long as the board was up.

⚠️ **`source.set` AND THE WHOLE MADE-SOURCE PATH ARE UNTOUCHED**: `PosSource`,
`sourceArgs`, `sourceFeed`, `madeSource`. That is a sound BUILT on the board
from a spec `/grains/` sends, it touches nobody else's server, and it is the
whole point of that page.

⚠️ **Two things changed shape rather than going away.** A key press no longer
pitches a grain voice: it only ever did with material LOADED into the buffers,
which was the archive path. And `params.state` no longer answers `source`, which
was the loaded excerpt; `made` is the only material the board can be given now,
so the ambiguity between the two went with it.

`archive/box-pappus/pappus-err.js` and `archive/box-pappus/box-err.js` hold the
code verbatim, including the politeness this board had earned the hard way after
ERR blocked its address on 2026-09-11: a disk cache for a year that ended sixty
years ago, a floor between requests, and a backoff that stopped asking when ERR
said no. **Read those before writing anything like it again.** The tests that
graded them are in `git show 141d7f3^:rig/box/pappus-test.mjs`.

## What still needs the board

Named rather than faked, because a fake that passes is worse than a gap written
down:

- real MIDI ports, and whether `aconnect` jitter is acceptable against a cable
- real audio capture, and which `hw:N,M` the interface lands on
- **unattended boot and recovery from a power cut** — the requirement that
  drove this design, and the one nothing here can exercise
- whether `carry` can be filtered at all without interposing

## Files

| file | |
|---|---|
| `alsa.mjs` | parse `aconnect -l`, resolve names, plan, apply. Pure where it can be |
| `synth.mjs` | the built-in instrument, importing `demo/shell/rhodes.mjs` |
| `box.mjs` | the service: relay socket, request handlers, synth and capture |
| `ask.mjs` | a terminal client — the proof that the browser is not the interface |
| `test.mjs` | 38 checks, no hardware |
| `insert-test.mjs` | against a running box: that the granulator goes in, stays in while its page is alive, and comes out BY ITSELF when that page closes. Written 2026-09-16 and not yet run |
| `norns/writedefs.scd` | compiles `pappus-<rung>.scsyndef` and `possource.scsyndef` on the board, for `/grains/` to load in a browser |
| `live-test.mjs` | 13 checks against a running box, over the real relay |
| `bench.mjs` | replaces the estimated Pi column with a measurement |
| `setup.sh` | run once on the Pi |
| `positron-box.service` | `Restart=always`, `StartLimitIntervalSec=0` |
| `fixtures/aconnect-l.txt` | a rig that does not exist, so the rest can be checked |

The envelope is `demo/shell/wire.mjs`, **imported rather than copied** — the same
file the pages use, so a change to the shape cannot reach only one end.
