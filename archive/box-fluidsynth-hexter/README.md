# archive/box-fluidsynth-hexter: the other two instruments, removed 2026-09-16

| file | what it is |
|---|---|
| `fluid.mjs` | `rig/box/fluid.mjs` whole, deleted. The General MIDI name table, the default soundfont path, and the two checks that answered whether the board could play a sampled instrument at all |
| `board-half.js` | what left `rig/box/jacksynth.mjs` and `rig/box/box.mjs` |
| `page-half.js` | what left `rig/box/listen.html`, the page now deployed at `/keys/` |

🔴 **NONE OF THEM IS A MODULE AND NONE MAY BE IMPORTED.** Almost all of the page
half closes over names that exist only inside that page, and the board half is
three fragments from the middle of two files.

Removed on instruction: *"lets remove fluidynth and hexter code and move to
arvhice (in browser and in board). update board."*

## What they were

**FluidSynth**, as a JACK client, playing `FluidR3_GM.sf2`: 128 General MIDI
programs and a drum bank, 141 MB of samples, loaded whole because FluidSynth has
no mmap and no disk streaming anywhere in `fluid_defsfont.c` or
`fluid_samplecache.c`. It was the board's default source and the one `/keys/`
started when it found nothing playing.

**hexter**, a Yamaha DX7 under `jack-dssi-host`, with its four factory ROM
cartridges (ROM1A/1B/2A/2B) shipped in Debian main. 128 voices, six-operator FM,
program 10 being ROM1A voice 11, E.PIANO 1. It was loaded by sending DSSI OSC to
the plugin host after the instrument came up, which is the only thing `def.osc`
and `def.after` in `jacksynth.mjs` were ever for.

Four apt packages went with them and are named in `rig/audit.mjs` so a rebuilt
board does not quietly get them back: `fluidsynth`, `fluid-soundfont-gm`,
`dssi-host-jack`, `hexter`.

## Why they left

**There is ONE `jackd`, ONE ffmpeg capture and ONE relay room on that board.**
Whatever is up is what every listener on every page hears, so the instrument row
on `/keys/` was a control that took the sound away from somebody in another
building, mid note, with no way for them to know why.

It happened. `/knobs/` was found refusing to start because somebody had pressed
`sampled`, and that page cannot work at all without Yoshimi's filter: its whole
subject is CC 74 and CC 71 sweeping a cutoff and a resonance, and FluidSynth
answers neither. A stopgap on 2026-09-16 (commit `7bebe02`) locked the row to
yoshimi and disabled the other two with the reason on their face. This replaces
that stopgap by removing the thing rather than hiding it.

⚠️ **THIS IS NOT THE `caps.mjs` CASE, AND THAT IS WHY THE CONTROL WENT RATHER
THAN STAYING DISABLED.** That rule is about a feature that EXISTS and which this
browser cannot reach, where a vanishing control says the feature does not exist
and that is a false statement. Here it is a true one: the code is out of
`jacksynth.mjs`, the packages are out of `audit.mjs`, and a board asked for
either answers `unknown source`. A disabled button for something that is not
there is furniture.

⚠️ **And a choice of one is not a choice.** With hexter and the sampled
instrument gone there was no row left to draw, so `/keys/` has none.

## What this fixed on the way past

- **`/grains/` was asking for `fluidsynth` and waiting for `yoshimi`.** It set
  `wantSource = SOURCE` (which is `'yoshimi'`, with a comment four hundred lines
  up explaining why it has to be) and then sent `audio.start
  {source:'fluidsynth'}`. The reply never matched, so `wantSource` was never
  cleared and the mark it gates stayed armed for the rest of the visit. One
  constant now, used once.
- **The board's diagram on `/keys/` is a chain again.** Three alternatives had
  to be drawn as a bracketed SET, because an arrowhead between them would have
  claimed that `FluidR3 GM` feeds `hexter`. With one instrument every gap is a
  real step: `dg.ties` went 2 to 0.
- **`voice.select {voice:'<general midi name>'}` is gone from the board.** GM
  was FluidSynth's meaning for a program number and nobody else's; Yoshimi's
  index its current bank, which the board enumerates. A program NUMBER still
  works and is what every page sends.
- **`sf.list` / `sf.listed` are gone.** With nothing on the board that can read
  a soundfont, the reply was a list of files nobody can play.
- **The `feeder` mechanism in `jacksynth.mjs` is gone.** A def could name
  another def to raise first and patch into its own inputs. Exactly one def ever
  declared one, its feeder was hexter, and that def was itself already a
  tombstone.

## What would have to be true to bring them back

**The capture would have to stop being shared.** That is the whole of it. Either
a second JACK graph and a second ffmpeg writing into a second relay room, so two
instruments can be up at once and a page can choose without reaching into
somebody else's sound; or a way for a page to see who else is listening and ask
rather than take. Neither exists. Until one does, an instrument picker on this
board is a control whose correct behaviour is to refuse most presses.

If it is ever done, the apt list in `rig/audit.mjs` is where to start (the four
packages above, with the versions they were pinned at), then `JACK_SYNTHS` in
`rig/box/jacksynth.mjs`, then the row in `page-half.js`. ⚠️ **`sweepOrphans()` in
`rig/box/box.mjs` still names `fluidsynth` and `jack-dssi-host`** and that is
deliberate rather than a leftover: the sweep runs at startup, and the run it has
to survive is a service restarting onto a new build while an old build's
instrument still holds the JACK graph.

## Two measurements worth keeping, which are not about these instruments

**The container claim.** In a `debian:trixie` arm64 container with no `/dev/snd`
at all and `ulimit -r` 0, `jackd -r -d dummy` came up, a synth registered left
and right, the ffmpeg capture client attached, and three seconds of the graph
came back as 144,021 samples at peak 0.1096. Real audio, not silence. jackd's
dummy driver is pure software timing, so `rig/box` runs where there is no sound
hardware in existence. That is a fact about jackd and it survives this removal;
it is in `rig/box/box.mjs` where the pipe path's tombstone used to be.

**The pipe against JACK.** Measured on the board, same binary, same soundfont,
same note: the FIFO path cost 12.8% of 400 against JACK's 12.3%, and 84 ms to
the ear against 74 ms. JACK was the faster of the two. The efficiency argument
for a pipe was never a CPU argument.
