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
| `live-test.mjs` | 13 checks against a running box, over the real relay |
| `bench.mjs` | replaces the estimated Pi column with a measurement |
| `setup.sh` | run once on the Pi |
| `positron-box.service` | `Restart=always`, `StartLimitIntervalSec=0` |
| `fixtures/aconnect-l.txt` | a rig that does not exist, so the rest can be checked |

The envelope is `demo/shell/wire.mjs`, **imported rather than copied** — the same
file the pages use, so a change to the shape cannot reach only one end.
