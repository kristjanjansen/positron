# archive/yoshimi: Yoshimi, off the Raspberry Pi and kept to come back as a pair

Retired 2026-10-13. Asked: *"discard yoshimi. with possiblity to do dual setup
in future (pi and browers, interlink). arhive demos using it"*. The plan is
`plans/plan-retire-yoshimi.md`; the browser side is
`research/yoshimi-wasm-2026-10-13.md`. Nothing here is loaded, imported or
deployed. Everything Yoshimi needs to come back is in this directory, in R2, or
in Debian.

## What was removed, and when

| what | where it went |
| --- | --- |
| packages `yoshimi`, `yoshimi-data`, `yoshimi-doc` and the four libraries only they used (`libfltk1.3t64`, `libfltk-images1.3t64`, `libmxml1`, `libxft2`) | purged by name on the Pi, 2026-10-13. `apt-get -s purge` listed exactly those seven first. `apt autoremove` was NOT run: it wants PipeWire and other libraries that are not Yoshimi's |
| `~/.config/yoshimi` (3 files) and `~/.local/share/yoshimi` (a byte copy of the stock banks, 19 stock presets) | removed on the Pi after the archive below was verified |
| `rig/board/yoshimi.mjs`, `yoshimi-test.mjs`, `cc-test.mjs`, `wobble-test.mjs`, `note-test.mjs`, `fixtures/yoshimi-*.xml` | here, by `git mv` |
| Yoshimi's `JACK_SYNTHS` entry and `YOSHIMI_ARGS` (`rig/board/jacksynth.mjs`) | `jacksynth-entry.mjs` here, verbatim plus `warmup: 13000` |
| Yoshimi's half of `rig/board/board.mjs` (bank map, `voices.listed`, the defaults) | `board-half.mjs` here |
| Yoshimi's checks in `rig/board/test.mjs` (43 of them) | `test-half.mjs` here, runnable: `node archive/yoshimi/test-half.mjs` reads 43/43 |
| `/knobs/`, `/grains/`, `/concepts/remote/000/` | `archive/demos/knobs-index.html`, `archive/demos/grains-index.html` with `grains-engine.mjs`, `archive/concepts/remote-000-index.html` and its note `archive/concepts/remote-000.md` |

**What stayed on purpose**: `snd-virmidi` (it keeps the patchbay testable with
nothing plugged in); `yoshimi` in the board's orphan sweep (`board.mjs`, the
list beside `fluidsynth`), so a leftover process from an old build is still
killed; the JACK fixtures in `rig/board/fixtures/jack-lsp-*.txt`, which record a
real graph with Yoshimi in it; and `demo/grains/defs/`, which `/radio/`,
`/videoradio/` and `/concepts/sampler/050/` load.

**What the board does now instead**: `audio.start` with no `source` is refused
in words (*"say which instrument to start ..."*), and a `note.on` to an idle
board is dropped with a reason. Both used to raise Yoshimi, 300 MB for 13 to
40 s. `board.alive` on `studio-1` announces no `pi-1:yoshimi` ids.

## The archive, and how it was checked

**In this directory**

- `config/`: the Pi's `~/.config/yoshimi`, copied with `scp` and hashed on both
  ends (identical):

  | file | sha256 |
  | --- | --- |
  | `yoshimi-0.instance` | `77734dee141b67c96d2f0e7710a3ed50dab96f611b8ab489424c7bd7a8044d71` |
  | `yoshimi.banks` | `535c6bd9d6585e176e5a7f93e4b2c9279ef5987212a080b39e7cf5c8b9cfff4d` |
  | `yoshimi.config` | `46c8c0747b9ee08796dcea0cd78940cd83fa7831ddba689df7ad5eb68f06d53d` |

  The instance is the one `ensureBoardInstance` produced: ALSA MIDI `External`,
  JACK auto connect off.
- `patches.json`: the bank map resolved off the Pi, from `config/yoshimi.banks`
  by `yoshimi.mjs` `yoshimiPatches()`, never touching the board. **24 banks,
  911 instruments, 878 reachable** with a plain program change, 33 above slot
  128. Every patch carries its bank, program, name and `.xiz` file name, so
  `Will_Godfrey_Companion` (bank 115) program 32 is `0033-AddSynth Morph.xiz`.
  This is the list both halves of a pair would walk.

**In R2**, not in the repository, because it is 3.1 MB of stock GPL data:

    positron-station/archive/yoshimi/2026-10-13-yoshimi-state.tar.gz
    sha256 170a0917b235aeb3dd7922afcb5ccb3005839d9f26a00074304415ad599d969c
    3,083,584 bytes, 977 files (tar -tzf), ~/.config/yoshimi + ~/.local/share/yoshimi

The hash was the same streamed out of the Pi, on this disk, and read back out
of R2. ⚠️ **`archive/` IN THAT BUCKET IS NOT PUBLIC, AND THAT WAS MADE TRUE THE
SAME DAY.** The bucket has no r2.dev URL and no custom domain (both checked with
wrangler), and its only public route is the `positron-station` Worker's
`GET /media/<key>`, which served ANY key. `workers/station/worker.mjs` now
answers 404 for a key under `archive/` (deployed, version
`bf77706c-0621-42b7-b30f-ecf4a071a5a3`), checked four ways (plain, `%2F`,
a doubled slash, `%61rchive`), with a MIMproject picture still answering 206 as
the control. Read it back with:

```sh
cd workers/station   # no .env here, so machine OAuth is used
env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN wrangler r2 object get \
  positron-station/archive/yoshimi/2026-10-13-yoshimi-state.tar.gz --file yoshimi-state.tar.gz --remote
shasum -a 256 yoshimi-state.tar.gz
```

The banks themselves are `yoshimi-data 2.3.3.3-1` from Debian trixie: the user
root on the Pi was a byte copy of `/usr/share/yoshimi/banks` (952 files, md5
lists identical, measured in the plan), so nothing in them is the owner's own.

## Bringing Yoshimi back on the Pi

VPN off first (`route -n get 8.8.8.8 | grep interface` says `en0`); the Pi is
`positron@<pi>`.

1. **The packages.** `2.3.3.3-1` was the trixie candidate on 2026-10-13.

   ```sh
   ssh positron@<pi> 'apt-cache policy yoshimi | head -3'
   ssh positron@<pi> 'sudo apt-get install -y yoshimi=2.3.3.3-1 yoshimi-data=2.3.3.3-1'
   ```

   It pulls the four libraries back by itself. Add the two rows back to
   `rig/board/packages.txt` (the comment there says where they were).
2. **The state.** Either the config alone (Yoshimi rebuilds `found/` on its
   first run):

   ```sh
   ssh positron@<pi> 'mkdir -p ~/.config/yoshimi'
   scp archive/yoshimi/config/* positron@<pi>:.config/yoshimi/
   ```

   or the whole tarball out of R2, untarred into `~` (`tar -C ~ -xzf -`).
3. **The board code**, from this checkout:

   ```sh
   git mv archive/yoshimi/yoshimi.mjs rig/board/yoshimi.mjs
   git mv archive/yoshimi/yoshimi-test.mjs archive/yoshimi/cc-test.mjs \
          archive/yoshimi/wobble-test.mjs archive/yoshimi/note-test.mjs rig/board/
   git mv archive/yoshimi/fixtures/yoshimi-banks.xml archive/yoshimi/fixtures/yoshimi-instance.xml rig/board/fixtures/
   ```

   Then paste `YOSHIMI_ARGS` and the `yoshimi: {...}` entry from
   `jacksynth-entry.mjs` into `JACK_SYNTHS` in `rig/board/jacksynth.mjs`, with
   `import { ensureBoardInstance } from './yoshimi.mjs';`. Paste sections 1 and
   2 of `board-half.mjs` into `rig/board/board.mjs` with its two imports, and
   `bankCC` goes back to reading Yoshimi's. Do NOT put back section 3's
   defaults: the refusals stay. Paste `test-half.mjs`'s two sections back into `rig/board/test.mjs`
   and run it. `sourcesOf` stays in `rig/board/alsa.mjs`. Put
   `yoshimi: ['yoshimi:left', 'yoshimi:right'],` back into `JACK_ENDS` in
   `demo/shell/graph-registry.mjs` (the comment there marks the place), or the
   Pi announces Yoshimi's audio out with no JACK ends and the granulator cannot
   be linked to it.
   ⚠️ `cc-test.mjs` and the others import `./measure.mjs`, so they run only from
   `rig/board/`.
4. **Push and check**:

   ```sh
   node rig/board/test.mjs
   rig/board/push.sh <pi>
   ```

   `board.alive` on `studio-1` lists `pi-1:yoshimi`, `pi-1:yoshimi:midi-in` and
   `pi-1:yoshimi:audio-out` again; one `voices.list {"source":"yoshimi"}` answers
   24 banks and 878 patches; `node rig/audit.mjs board` is clean.
   ⚠️ `push.sh` ships the whole of `rig/board/` and every module it imports from
   `demo/shell/` out of the WORKING TREE, another agent's unfinished edits
   included.

5. **The pages**, if they come back as they were: `git mv` the three files
   named in the table above back to `demo/knobs/index.html`,
   `demo/grains/index.html` with `demo/grains/engine.mjs`, and
   `demo/concepts/remote/000/index.html`; put the `knobs` and `grains` rows back
   in `demo/manifest.mjs` and the two cards in `demo/concepts/list.mjs` (both
   files carry a comment where they stood); `knobs` goes back into
   `BOARD_PAGES` in `demo/verify.mjs`, and `demo/fake-board.mjs` announces
   `yoshimi` again.

## A pair: Yoshimi on the Pi and in the browser, linked

What the owner asked to keep possible. Not built; this is the route.

- **The browser half** is research route B
  (`research/yoshimi-wasm-2026-10-13.md` §5 and §6): rebuild Jari Kleimola's
  2019 Yoshimi 1.6 WebAssembly tree from source in the container `/muta/` used
  for Plaits, with a small C shim (init, render 128 frames, MIDI, load XML into
  a part). About 247 KB brotli; AddSynth Morph measured at 1.3 per cent of an
  M2 Pro core for 8 voices. Route C (Yoshimi 2.3.3.3, the Pi's own version) only
  if a side by side render says the two sound different.
- **The same patch on both sides**: one `.xiz` named by `patches.json`. The Pi
  selects it by bank and program (`voice.select {bank, program}`, bank on CC 32);
  the tab fetches the same file from our origin, gunzips it with
  `DecompressionStream('gzip')` and loads the XML into part 0. The files are in
  the R2 tarball under `.local/share/yoshimi/found/yoshimi/banks/<dir>/<file>`,
  or in `yoshimi-data`.
- **Notes to both, over the relay**, as `/concepts/remote/020/` (Collide on Pi)
  does for SuperCollider: one key goes to the local engine at once and to the
  board as `note.on` over the relay, the board's sound comes back down the same
  socket, and a crossfader (`web:xfade`, equal power) sits between the two with
  a lag cell for each side. For Yoshimi the board half is
  `audio.start {source: 'yoshimi'}` then `voice.select`; the page half is the
  wasm worklet. The controller map is the same on both, and it is NOT General
  MIDI: 74 cutoff, 71 resonance, 75 bandwidth, 76 FM amplitude
  (`positron-hardware`).
- **The pages to rebuild from**: `archive/concepts/remote-000-index.html` (keys,
  two knobs, scope and the key to sound readouts against the Pi) is the closest
  to remote/020's shape; `archive/demos/knobs-index.html` has the patch stepper
  over `voices.listed` and the full knob row.

## Not done on 2026-10-13

- `rig/board/insert-test.mjs`, `pappus-live.mjs` and `jack-bay-live.mjs` still
  raise Yoshimi and now stop at `unknown source`. Each says so in its header.
  The insert (`fx.pappus`) wraps only a JACK instrument, and nothing on the
  board is one now.
- Seven stale files are still in `/opt/positron-board/rig/board/` on the Pi
  (`yoshimi.mjs`, the four tests and the two `fixtures/yoshimi-*.xml`):
  `push.sh` unpacks and never deletes. Nothing imports them.
- HANDOFF.md, `rig/board/README.md` and the `positron-hardware` skill still
  describe Yoshimi as on the board (the plan's step 5).
