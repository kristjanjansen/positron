# plan-retire-yoshimi: archive Yoshimi and take it off the Raspberry Pi

Status (2026-10-14): done. Yoshimi is archived in archive/yoshimi/README.md and off the board, as the 2026-10-13 retirement note in HANDOFF.md records.

Written 2026-10-13. Asked: *"also make plan how to archive and discard yoshimi
from pi"*. PLAN ONLY: nothing in the repository was changed and nothing on the
Pi was changed. The VPN was off (`route -n get 8.8.8.8` said `en0`), so the
board was read over ssh (`<user>@<pi>`) and over the relay
(`studio-1`), read-only.

Tags: **MEASURED** (read off the Pi or the relay today, with the command),
**READ** (taken off code, with file:line), **INFERRED** (reasoned, not checked).

The possible replacement, Yoshimi in the browser, is being researched in
parallel in `research/yoshimi-wasm-2026-10-13.md` (not written yet when this
plan was). Nothing here depends on it. If it lands, the archived `/knobs/` and
`remote/000` pages are the pages to point at a browser Yoshimi, and the banks
archived in step 1 are the data it would load.

## 0. Verdict

Retire it in five steps, **pages first, board code second, Pi packages third**,
so no live page ever asks a board for an instrument it no longer has.

What decides it:

1. **Nothing on the Pi is the owner's own Yoshimi work.** MEASURED: the user
   bank root `~/.local/share/yoshimi/found/yoshimi/banks` holds 952 files and
   `/usr/share/yoshimi/banks` holds 952 files, and the two md5 lists are
   **identical** (zero lines of `diff`). The 19 files in
   `~/.local/share/yoshimi/presets` hash the same as the 19 stock ones. The
   recent files list is an empty `<HISTORY />`. So every bank is stock
   `yoshimi-data 2.3.3.3-1`, reinstallable from apt. What is ours is three
   small files in `~/.config/yoshimi` (52 KB): the bank map, the instance
   (`alsa_midi_type External`, no autoconnect) and the config.
2. **It is the biggest process on the board when it runs.** MEASURED at
   11:18 with AddSynth Morph loaded and no notes: `yoshimi -i -a -J -b=256`
   RSS **305,500 kB** (8 threads), against `board.mjs` 119 MB, `jackd` 74 MB,
   each capture `ffmpeg` 50 MB, the collide `scsynth` 34 MB. Total RAM 1847 MB.
   It was stopped at 11:21:32 by another client's `audio.stop` (the board's
   journal: `Interrupt received`, `Goodbye - Play again soon?`, not by this
   plan), and `free -m` "used" went from **646 MB to 363 MB, 283 MB freed**.
   CPU: `ps` lifetime average **3.1 %** over 849 s mostly idle. Not measured
   under notes.
3. **No unit, no autostart, no device of its own.** MEASURED: `grep -ril
   yoshimi` over `/etc/systemd`, `/lib/systemd/system`, `~/.config/systemd`,
   `~/.config/autostart`, `/etc/xdg/autostart`, `/etc/default`,
   `/etc/modules-load.d` and `/etc/modprobe.d` finds nothing, and
   `systemctl list-units --all` lists nothing named yoshimi. It is spawned on
   demand by `board.mjs` through `JACK_SYNTHS.yoshimi`
   (`rig/board/jacksynth.mjs:332-347`). It is a JACK client, so the audio
   interface is owned by `jackd` (`-C hw:CARD=Pro,DEV=0`), not by Yoshimi.
4. **Three things break if the board drops it before the pages do**: `/knobs/`
   (listed), `/concepts/remote/000/` (listed), and `/grains/` (unlisted but
   deployed, `SOURCE = 'yoshimi'` is a constant, `demo/grains/index.html:446`).
   Each would say *"yoshimi is not installed on this board"* in words rather
   than fail silently (READ, `board.mjs:575`), so the failure is graceful, but
   it is still a live page that stops working.

## 1. What Yoshimi does today

### 1.1 On the Pi (MEASURED 2026-10-13 11:18)

| thing | value |
| --- | --- |
| packages | `yoshimi 2.3.3.3-1` (6,439 KB installed), `yoshimi-data` (5,434 KB), `yoshimi-doc` (5,337 KB) |
| libraries only Yoshimi uses | `libfltk1.3t64` (1,591 KB), `libfltk-images1.3t64` (119 KB), `libmxml1` (86 KB), all marked auto; `apt-cache rdepends --installed` names only `yoshimi` (and fltk-images for fltk). `apt-get -s purge yoshimi yoshimi-data yoshimi-doc` lists `libxft2` as newly unneeded as well |
| data | `/usr/share/yoshimi` 6.6 MB (banks 6.1 MB, 24 bank dirs, 952 files); `~/.local/share/yoshimi` 6.2 MB (a byte copy of the banks plus 19 stock presets); `~/.config/yoshimi` 52 KB |
| process | spawned by `board.mjs`, command line `yoshimi -i -a -J -b=256` (`jacksynth.mjs:330`) |
| JACK | `yoshimi:left` and `yoshimi:right`, both into `posboard:input_1` (`jack_lsp -c`) |
| ALSA MIDI | client 128 `yoshimi`, fed from `16:0` (VirMIDI 0-0) only (`aconnect -l`) |
| relay graph | `board.alive` on `studio-1` announces `pi-1:yoshimi` (engine) with `pi-1:yoshimi:midi-in` and `pi-1:yoshimi:audio-out`, and a second node `pi-1:midi-yoshimi` with `midi-in` and `midi-out`, which is the ALSA client read as a raw MIDI port. 27 node and port ids in all; 5 are Yoshimi's |
| SD card | `/` 29 G, 5.8 G used, 22 G free. Yoshimi's whole footprint is about 31 MB |

### 1.2 In the board code (READ)

- `rig/board/jacksynth.mjs:332-347` `JACK_SYNTHS.yoshimi`: needs, spawn,
  port match, `settle: 6000`, `alsaMatch`. It is the **only** entry, so
  `startJackSynth` (`:884`) exists for Yoshimi alone in practice.
- `rig/board/jacksynth.mjs:23` imports `ensureBoardInstance` and
  **`sourcesOf`** from `yoshimi.mjs`. ⚠️ `sourcesOf` is a general `aconnect -l`
  parser used by `strayMidiSources` (`:869-872`), so `yoshimi.mjs` cannot be
  archived until `sourcesOf` moves.
- `rig/board/jacksynth.mjs:935-944` strips Yoshimi's CLI prompt; `:977` the
  13 s warm-up ceiling; `:679` and `board.mjs:1829` list `yoshimi` among the
  orphans to sweep.
- `rig/board/yoshimi.mjs` (315 lines): reads the bank map, the patch stepper's
  list, `ensureBoardInstance` (rewrites the instance so Yoshimi takes MIDI only
  from virmidi and does not autoconnect).
- `rig/board/board.mjs`
  - `:27` imports `yoshimiPatches`, `YOSHIMI_DIR`; `:430-444` `yoshimiList`
    and `bankCC`.
  - `:863` `audio.start` with no `source` **defaults to `'yoshimi'`**.
  - `:879` `note.on` with nothing running **starts Yoshimi by itself**. Any
    stray note to `studio-1` raises a 300 MB synth.
  - `:911-921` `voices.list` for Yoshimi.
  - `:1681` the `jack` fact is `jackSynthAvailable('yoshimi') || an input on
    JACK`. Today the Circuit input is on JACK, so this stays true without
    Yoshimi, but the sampler (also on JACK, `scsampler.mjs:295`) is not in the
    expression. INFERRED: with no Circuit input configured the board would stop
    announcing its JACK ends while the sampler still uses them.
  - the Pappus insert (`fx.pappus`, `:1051-1062`) wraps whatever JACK
    instrument is running (`inst.jack`). Without Yoshimi there is no `inst`
    with `jack: true`, so `fx.pappus` answers *"nothing is playing for an
    insert to wrap"*. The sampler and collide servers are not `inst`.
- `rig/board/packages.txt:33-34` lists `yoshimi` and `yoshimi-data`;
  `rig/audit.mjs:44` reads that file, so the audit flags a missing Yoshimi
  until the rows go. `rig/board/setup.sh` installs from the same file.
- No yoshimi under `workers/`, `src/` or `research/tools/` (grep, zero hits).

### 1.3 Every place it is named, classified

`grep -ril yoshimi` over `demo/ rig/ workers/ src/ research/tools/ .claude/skills
CLAUDE.md HANDOFF.md BACKLOG.md LAYOUT.md plans/ archive/` (excluding the
generated `workers/view/public/`, 25 files, which follow on the next build):
**91 files**. Counts are occurrences.

**Live code path (the Pi and the pages that drive it)**

| file | n | what |
| --- | --- | --- |
| `rig/board/yoshimi.mjs` | 41 | the module |
| `rig/board/board.mjs` | 38 | defaults, auto-start, voices, bank CC, `jack` fact, sweep |
| `rig/board/jacksynth.mjs` | 35 | the spawn entry and the chain |
| `rig/board/packages.txt` | 3 | install list |
| `rig/board/setup.sh`, `rig/audit.mjs`, `rig/board/jack.mjs`, `rtc.mjs`, `inputs.mjs`, `scsampler.mjs`, `ask.mjs`, `beat.mjs` | 1 to 3 each | comments and examples only (`ask.mjs:10`, `jack.mjs:56,188,225` use `yoshimi:left` as the example port) |
| `demo/concepts/remote/000/index.html` | 11 | **the Yoshimi concept page**; `:60` ports, `:68` node, `:258-262` starts Yoshimi |
| `demo/knobs/index.html` | 40 | **the Yoshimi demo**; `:1137-1196` starts it, `:2087` asserts on it, `:2315-2359` diagram, `:2482` port |
| `demo/grains/index.html` | 5 | **depends on it**: `:446 const SOURCE = 'yoshimi'` |
| `demo/concepts/list.mjs` | 2 | `:33` the remote/000 card, `:145` the knobs card |
| `demo/manifest.mjs` | 1 | `:821` knobs row, `:766` grains row (unlisted), `:782` comment |
| `demo/shell/graph-registry.mjs` | 7 | `:94 JACK_ENDS.yoshimi`; comments `:37,80,156,190` |
| `demo/away/index.html` | 3 | `:608` uses `pi-1:yoshimi:midi-in` as "a port that is not mine" in an assert; works with any other port |
| `demo/concepts/remote/030/index.html` | 5 | `:352` names Yoshimi if it is playing beside the sampler; comments |
| `demo/kit/patchbay/index.html` | 2 | `:80` a "KNOBS DEMO" example link, `:107` a label |
| `demo/slides/index.html`, `demo/kit/slides/index.html` | 2 each | slide text: *"Yoshimi and the Circuit"*, *"sound back from Yoshimi"* |
| `demo/kit/chat/index.html` | 2 | sample chat lines |
| `demo/patchbay/index.html` | 1 | `:962` an in-page fixture with `yoshimi: true` |

**Harness and stand-in**

| file | n | needs the real Pi | what |
| --- | --- | --- | --- |
| `rig/board/test.mjs` | 97 | no | unit tests of `yoshimi.mjs` plus `sourcesOf` (`:690`) |
| `rig/board/yoshimi-test.mjs` | 12 | yes | patch change landing |
| `rig/board/cc-test.mjs`, `wobble-test.mjs`, `note-test.mjs` | 1 to 3 | yes | the CC map measurements behind `/knobs/` |
| `rig/board/jack-bay-live.mjs` | 13 | yes | asserts Yoshimi feeds the capture and the granulator (`:91-160`) |
| `rig/board/insert-test.mjs`, `pappus-live.mjs` | 4, 3 | yes | start Yoshimi so the insert has something to wrap |
| `rig/board/fixtures/yoshimi-banks.xml`, `yoshimi-instance.xml` | | no | real config captured from the Pi |
| `rig/board/fixtures/jack-lsp-*.txt` | 4 to 6 | no | real JACK graph captures used by `jack.mjs` tests; keep as they are, a fixture records what was there |
| `demo/fake-board.mjs` | 5 | no | the stand-in announces `instruments: { yoshimi: true }` (`:258`) and defaults to it (`:313,322`) |
| `demo/fake-board-test.mjs` | 2 | no | `:121-123` |
| `demo/shell/graph-registry-test.mjs` | 22 | no | uses `yoshimi` as the example engine (`:42-68`) |
| `demo/shell/presence-test.mjs` | 1 | no | comment |
| `demo/verify.mjs` | 0 | | `:231 BOARD_PAGES = ['away', 'knobs']`, the stand-in is started for knobs |

**Doc and history**: `.claude/skills/positron-hardware` (3, the CC map entry),
`positron-ui` (3), `positron-describe` (1), `HANDOFF.md` (10), `BACKLOG.md`
(22), `LAYOUT.md` (1), `rig/board/README.md` (16), 26 plans (largest
`plan-controller.md` 37, `plan-portable-board.md` 17, `plan-nodes-revisited.md`
17, `plan-sampler-pi-pico.md` 12), `archive/` (8 files), and comments in
`demo/shell/{midi-decode,slider,picker,bay-view}.mjs`, `shell.css:3791`,
`demo/{evo,nola}/index.html`, `demo/grains/engine.mjs:60`,
`demo/concepts/remote/{010,040}/index.html`. **These stay as they are**, the
same rule that keeps `radio1965` and `box` in `archive/`: a dated record says
what was there. Only sentences that claim Yoshimi runs NOW are corrected
(HANDOFF's Pi section `:139-140`, the README's `:83-104`, the hardware skill's
entry gets a dated line on top saying the board no longer has it).

## 2. What to archive

| what | where | how |
| --- | --- | --- |
| `~/.config/yoshimi/` (3 files, 52 KB) | repo, `archive/yoshimi/config/` | `scp`, then `sha256sum` both ends. Small, ours, and it is what `ensureBoardInstance` produced |
| the full state, `~/.config/yoshimi` + `~/.local/share/yoshimi` (about 6.3 MB) | R2, `positron-station/archive/yoshimi/2026-10-13-yoshimi-state.tar.gz` | one tarball, `sha256` recorded in `archive/yoshimi/README.md`. ⚠️ `positron-station` serves `GET /media` publicly (HANDOFF:154); check that the `archive/` prefix is not served before uploading. It is stock GPL data either way |
| the resolved patch list (911 instruments in 24 banks, 878 reachable, `yoshimi.mjs:39-45`) | repo, `archive/yoshimi/patches.json` | generated off the Pi from the archived `yoshimi.banks` with `BOARD_YOSHIMI_CONFIG=archive/yoshimi/config node -e "import('./rig/board/yoshimi.mjs')..."`, or one `voices.list` over the relay **before** step 3. It is what a browser Yoshimi would need to offer the same stepper |
| `rig/board/yoshimi.mjs`, its tests from `test.mjs`, `yoshimi-test.mjs`, `cc-test.mjs`, `wobble-test.mjs`, `note-test.mjs` | `archive/yoshimi/` with `git mv` | `sourcesOf` moves out first (step 2) |
| `/concepts/remote/000/` | `archive/concepts/remote-000.md` (a NOTES card on `/archive/`) **plus** the page file at `archive/concepts/remote-000-index.html` | not the still-served `demo/archive/<name>/` form used for clock and TV today: those still work, and this page cannot once the Pi has no Yoshimi. The concepts skill says no forwarding, so `/concepts/remote/000/` becomes a 404 |
| `/knobs/` | `archive/demos/knobs-index.html` plus a section in `archive/demos/README.md`, manifest row and `list.mjs:145` card removed | the form `/able/`, `/memento/` and `/blocks/` took. `unlisted: true` would keep a deployed page that cannot sound, which is worse than a 404 |
| the CC map knowledge (non-GM 71, 74 to 78; LFOs exist but no CC reaches them) | stays in `positron-hardware` and `midi-decode.mjs:39` | it is a fact about the instrument family, and a browser Yoshimi would need it |

Nothing about the stock banks needs a second copy: they are `yoshimi-data
2.3.3.3-1` from Debian trixie, and the R2 tarball holds them anyway.

## 3. What to discard on the Pi

| what | how | note |
| --- | --- | --- |
| a running instance | `audio.stop` over the relay | the board's own stop, not `pkill` |
| `yoshimi`, `yoshimi-data`, `yoshimi-doc` | `sudo apt-get purge` | |
| `libfltk1.3t64`, `libfltk-images1.3t64`, `libmxml1`, `libxft2` | `sudo apt-get purge` **by name** | ⚠️ **NOT `apt autoremove`**: MEASURED, autoremove already wants `libpipewire-0.3-0t64`, `libspa-0.2-modules`, `libebur128-1`, `libinstpatch-1.0-2`, `libwebrtc-audio-processing-1-3` and more, which are not Yoshimi's and are a separate decision. Run `apt-get -s purge` on the four first and read what else it would take |
| `~/.config/yoshimi`, `~/.local/share/yoshimi` | `rm -r` after the archive is verified | |
| the systemd unit, launcher, autostart | none exist (MEASURED, §0 item 3) | nothing to do, and the plan says so rather than inventing a step |
| JACK connections | none persistent: `yoshimi:left/right -> posboard:input_1` is made by `startJackSynth` each start | they vanish with the process |
| `snd-virmidi` | **keep** | INFERRED: Yoshimi is its only consumer on the board today (`16:0 -> 128:0`), but `/etc/modules-load.d` keeps it so the patchbay is testable with no instrument. Open question 5 |
| the board module and ports | step 2 code change, pushed | so `pi-1` stops announcing `pi-1:yoshimi` and `pi-1:midi-yoshimi` |

## 4. Order, and why page first

1. **Archive the state** (read-only on the Pi). Nothing changes, and it must
   exist before anything is removed.
2. **Pages and the repo's code, then deploy.** No live page asks for Yoshimi
   after this. The board still has it, so a stale tab still works.
3. **Board code, pushed to the Pi.** The board stops offering and announcing
   Yoshimi. Yoshimi is still installed, so a rollback is one push.
4. **Purge the packages and the state dirs.** Only after step 3 has run a day
   with nothing asking for it.
5. **Docs** (HANDOFF, README, skill, packages.txt already in step 3).

Board first would put a working, listed page (`/knobs/`, remote/000) on a
board that answers *"yoshimi is not installed"* for as long as the deploy
lags. Page first leaves only an unused binary on the Pi for a day.

⚠️ **Step 3 ships the whole `rig/board/` directory.** Another agent is
changing `rig/board/board.mjs` and adding `rig/board/camera.mjs` for the Pi
camera right now (`git status`: `M rig/board/board.mjs`, `?? rig/board/camera.mjs`).
`push.sh` would ship that half-done work. Step 3 waits until that work is
committed, or the push is coordinated with that agent.

## 5. Steps, with commands (TO BE RUN, NONE RUN)

### Step 1: archive (no change on the Pi)

```sh
# 1a. the patch list, while Yoshimi is still there (starts it if it is not running)
node rig/board/ask.mjs --room studio-1 voices.list '{"source":"yoshimi"}' > archive/yoshimi/patches.json

# 1b. the config, into the repo
mkdir -p archive/yoshimi/config
scp <user>@<pi>:'.config/yoshimi/*' archive/yoshimi/config/
ssh <user>@<pi> 'cd ~/.config/yoshimi && sha256sum *' > /tmp/pi.sha
(cd archive/yoshimi/config && sha256sum *) | diff - /tmp/pi.sha && echo config-ok

# 1c. the whole state, to R2
ssh <user>@<pi> 'tar -C ~ -czf - .config/yoshimi .local/share/yoshimi' > yoshimi-state.tar.gz
shasum -a 256 yoshimi-state.tar.gz                     # write into archive/yoshimi/README.md
tar -tzf yoshimi-state.tar.gz | wc -l                  # expect about 977 (974 + 3)
env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN npx wrangler r2 object put \
  positron-station/archive/yoshimi/2026-10-13-yoshimi-state.tar.gz --file yoshimi-state.tar.gz --remote
# read it back and compare the hash
env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN npx wrangler r2 object get \
  positron-station/archive/yoshimi/2026-10-13-yoshimi-state.tar.gz --file /tmp/back.tgz --remote
shasum -a 256 /tmp/back.tgz
```

Verify: the two sha256 values match; `patches.json` has `count` 911 (or the
reachable 878 as the stepper reports it) and 24 banks.

### Step 2: pages and repo code, then deploy

- `git mv demo/concepts/remote/000/index.html archive/concepts/remote-000-index.html`;
  write `archive/concepts/remote-000.md` (what it did: keys and two knobs, CC 74
  and 71, to Yoshimi on the Pi, AddSynth Morph bank 115 program 32, a scope from
  the Pi's PCM, the key to sound readouts); remove `list.mjs:33`; add a NOTES
  card in `demo/archive/index.html`. ⚠️ `list.mjs` is modified in the working
  tree by another agent today; edit it after that lands.
  Decide whether `remote/010` renumbers to `000` (open question 3); the default
  is **no**, the gap stays, as `synth/040` left one.
- `git mv demo/knobs/index.html archive/demos/knobs-index.html`; section in
  `archive/demos/README.md`; remove `manifest.mjs:821` row and `list.mjs:145`;
  `demo/verify.mjs:231` becomes `['away']`.
- `/grains/`: per open question 1. Default proposal: archive it the same way,
  because without a JACK instrument its insert has nothing to wrap.
- `demo/away/index.html:608`: `boardPort('yoshimi', 'midi-in')` becomes
  `boardPort('sampler', 'midi-in')`, still "a port that is not mine".
- `demo/fake-board.mjs:258,313,322` and `fake-board-test.mjs:121-123`: the
  stand-in's instrument becomes `synth`.
- `demo/kit/patchbay/index.html:80,107`, `demo/slides/index.html:59-62`,
  `demo/kit/slides/index.html:175,478`, `demo/kit/chat/index.html:42,50`:
  the words change to what the Pi plays now (sampler, Circuit, SuperCollider).
  Slide text is a `positron-slides` task.
- `demo/shell/graph-registry.mjs:94`: drop `JACK_ENDS.yoshimi`;
  `graph-registry-test.mjs`: the example engine becomes `sampler`.
- `remote/030:352`: leave; it names whatever is playing.

```sh
node demo/check-html.mjs demo/away/index.html demo/kit/patchbay/index.html demo/archive/index.html
node demo/shell/graph-registry-test.mjs
node demo/fake-board-test.mjs
node demo/verify.mjs away patchbay
cd workers/view && node build.mjs && cd ../.. && env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN node workers/view/deploy.mjs
```

Verify: quote the BUILD stamp; `curl -sI https://positron.studio/knobs/` and
`https://positron.studio/concepts/remote/000/` answer **404**;
`https://positron.studio/archive/` shows the Yoshimi note card;
`https://positron.studio/concepts/` has no Yoshimi card; `away` reads the same
assert count as before.

### Step 3: board code, pushed

- Move `sourcesOf` from `yoshimi.mjs` into `rig/board/jack.mjs` (or a new
  `alsa-seq.mjs`); fix `jacksynth.mjs:23` and `test.mjs:9,690`.
- `jacksynth.mjs`: delete `JACK_SYNTHS.yoshimi` and `YOSHIMI_ARGS`; leave
  `startJackSynth` and the empty `JACK_SYNTHS` in place (INFERRED cheapest
  rollback, and a future JACK synth is one entry). Remove the
  `yoshimi` warm-up special case at `:977`.
- `board.mjs`: remove `:27` import, `:430-444` (bankCC becomes 32),
  `:911-921` branch; `:863` `audio.start` with no source refuses in words
  (open question 4); `:879` `note.on` with nothing running drops the note with
  a reason, as the sampler branch at `:871-873` already does, instead of
  starting anything; `:1681` becomes
  `samplerAvailable() || [...inputs].some(via jack)`. **Keep** `yoshimi` in the
  orphan sweep at `:1829`, for the reason the comment there gives for
  `fluidsynth`: the first start onto a new build may still find an old one.
- `packages.txt:33-34`: remove both rows (with a comment line saying when and
  why, as the FluidSynth rows did).
- `git mv rig/board/yoshimi.mjs rig/board/yoshimi-test.mjs rig/board/cc-test.mjs rig/board/wobble-test.mjs rig/board/note-test.mjs archive/yoshimi/`;
  cut the yoshimi tests out of `test.mjs` into `archive/yoshimi/test-half.mjs`.
- `jack-bay-live.mjs`, `insert-test.mjs`, `pappus-live.mjs`: switch their
  instrument to the sampler (`audio.start {source:"sampler"}`) or to the
  Circuit input, or archive them with the insert (open question 1).

```sh
node rig/board/test.mjs
node rig/audit.mjs box                    # yoshimi no longer required
# ONLY after the camera agent's rig/board work is committed:
rig/board/push.sh <pi>
ssh <user>@<pi> md5sum /opt/positron-board/rig/board/{board,jacksynth}.mjs
```

Verify: the md5s match the checkout; `board.alive` on `studio-1` lists **no**
`pi-1:yoshimi*` and no `pi-1:midi-yoshimi` (the alive script used for this
plan, or `node rig/board/ask.mjs --room studio-1 listen 6` and read the
graph); `audio.status` still answers with the Circuit input `fed: true`;
`https://positron.studio/concepts/remote/010/`, `/030/` and `/020/` still
reach ready and sound, one press each with `?board=1`.

### Step 4: purge on the Pi (a day after step 3)

```sh
ssh <user>@<pi> 'free -m; df -h /; ps -eo rss,pcpu,args --sort=-rss | head -8' > before.txt
ssh <user>@<pi> 'pgrep -a yoshimi'          # must print nothing
ssh <user>@<pi> 'apt-get -s purge yoshimi yoshimi-data yoshimi-doc libfltk1.3t64 libfltk-images1.3t64 libmxml1 libxft2'
#   read that list. Anything beyond these seven: stop and ask.
ssh <user>@<pi> 'sudo apt-get purge -y yoshimi yoshimi-data yoshimi-doc libfltk1.3t64 libfltk-images1.3t64 libmxml1 libxft2'
ssh <user>@<pi> 'rm -r ~/.config/yoshimi ~/.local/share/yoshimi'
ssh <user>@<pi> 'sudo systemctl restart positron-board'
ssh <user>@<pi> 'free -m; df -h /; ps -eo rss,pcpu,args --sort=-rss | head -8' > after.txt
```

Verify: `command -v yoshimi` empty; `dpkg -l | grep -i yoshimi` empty; the
service is active and `board.alive` returns; `node rig/audit.mjs box` clean;
the before and after RAM in the report. ⚠️ The headline RAM win only shows
against a board where Yoshimi was RUNNING, which is the 646 to 363 MB measured
today, not against an idle board where it was already stopped. Idle to idle,
step 4 frees about 31 MB of SD and no RAM.

### Step 5: docs

HANDOFF's Pi section, `rig/board/README.md:83-104,165,183` (the instrument
table row stays, it is a list of options), the `positron-hardware` skill entry
gets a dated first line, LAYOUT's skill row keeps "Yoshimi" until the skill
stops naming it, BACKLOG line struck with the date. Plans are left alone.

## 6. What frees up

| what | how much | tag |
| --- | --- | --- |
| RAM while it would have run | about 300 MB RSS (305,500 kB), 283 MB of "used" measured when it stopped | MEASURED |
| CPU | 3.1 % of one core average idle; under notes not measured | MEASURED (idle) |
| SD card | about 31 MB (17 MB packages + 2 MB libs + 12.8 MB data and copies) of 22 GB free | MEASURED |
| JACK load | one fewer client on a 512 x 3 period graph shared with the Circuit bridge, the sampler and collide; BACKLOG:73 records **9 to 17 Yoshimi xruns a minute while v3dpipe renders**, none without. That pressure goes | MEASURED (BACKLOG), effect INFERRED |
| device contention | none at the device: Yoshimi never opened the Fast Track Pro, `jackd` does. The contention was in the graph and the capture: a page starting Yoshimi replaced `/away/`'s capture until inputs split (HANDOFF:1454) | READ |
| a sharp edge | `note.on` to an idle board no longer raises a 300 MB synth for 13 to 40 s | READ |
| 13 s warm-up | no instrument on the board takes more than the sampler's start | READ |

## 7. Rollback

From any step:

1. Step 4 undone: `sudo apt-get install yoshimi yoshimi-data` (2.3.3.3-1 is
   still the trixie candidate, MEASURED `apt-cache policy`), then restore the
   config: `scp archive/yoshimi/config/* <user>@<pi>:.config/yoshimi/`
   (or untar the R2 tarball into `~`). Yoshimi rebuilds `found/` on first run.
2. Step 3 undone: `git revert` the board commit and `push.sh`. The
   `JACK_SYNTHS.yoshimi` entry and `yoshimi.mjs` come back together.
3. Step 2 undone: `git mv` the two pages back, restore the manifest row and
   the two cards, rebuild and deploy. ⚠️ Both URLs return with no forwarding
   in between, which matches the no-forwarding rule.

Check after a rollback: `board.alive` lists `pi-1:yoshimi:audio-out` again and
one `voices.list` returns 24 banks.

## 8. Risks

- **The push in step 3 ships another agent's unfinished camera work.** Wait
  or coordinate.
- **`list.mjs` and `board.mjs` are dirty in the working tree today** (other
  agents). Edits land after theirs, commits are path limited.
- **`/grains/` silently loses its point.** It stays deployed and unlisted, it
  will load, and its insert will refuse with *"nothing is playing for an
  insert to wrap"*. A decision, not a side effect.
- **`apt autoremove` would take unrelated libraries** (PipeWire and others,
  MEASURED). Purge by name.
- **The `jack` graph fact** (`board.mjs:1681`) depends on the Circuit input
  being configured once Yoshimi is gone, unless it is fixed in step 3.
- **The live harnesses lose their instrument**: `jack-bay-live`, `insert-test`,
  `pappus-live` all raise Yoshimi first. Until they are switched they fail in
  step 3, which reads as a board fault.
- **`patches.json` in step 1a starts Yoshimi** if it is not running (the
  `voices.list` reads the file, but the request goes to a board that may
  auto-start on the default). Generating it off the Pi from the archived
  `yoshimi.banks` avoids touching the board at all.

## 9. Open questions for the owner

1. **`/grains/` too?** It is unlisted, and Yoshimi is the only thing its
   granulator insert can wrap today. Archive it, or retarget it at the sampler
   or the Circuit (a code change to the insert path: `fx.pappus` only wraps an
   `inst` with `jack: true`, and the sampler is not one).
2. **`/knobs/` goes with it?** HANDOFF:30 already asks *"knobs and away
   repeat remote/000 Yoshimi and remote/010 Circuit: mark them not needed?"*,
   unanswered. This plan assumes yes for knobs and leaves `/away/` alone.
3. **Does remote/010 Circuit move up to remote/000**, or does the gap stay?
4. **What should `audio.start` with no source, and `note.on` to an idle board,
   do now?** Proposed: refuse or drop in words. The alternative is the
   board's built-in `synth` (the moog pipe synth, still announced as
   `pi-1:synth`).
5. **Keep `snd-virmidi` loaded?** Yoshimi is its only user on the board today
   (INFERRED from `aconnect -l`); the module comment says it keeps the
   patchbay testable with nothing plugged in.
6. **Keep the patches?** Nothing on the Pi is the owner's own Yoshimi work
   (the user root is a byte copy of the stock banks, MEASURED). Is there a
   Yoshimi patch made elsewhere that should go into `archive/yoshimi/`?
7. **Anything only Yoshimi does?** READ from the code and the skill: 911
   AddSynth/SubSynth/PadSynth instruments with a bank stepper; held notes for
   the granulator to chew on; the measured non-GM CC map (71, 74, 75, 76, 77,
   78). The sampler plays two sample sets (piano, Rhodes) and the Circuit
   plays its own 64 patches. **A browser Yoshimi**
   (`research/yoshimi-wasm-2026-10-13.md`, in progress) would cover the
   instrument for a visitor, but not as a JACK source on the Pi, so it would
   not feed the Pi's granulator.
8. **R2 or repo for the 6.3 MB tarball?** Proposed R2, with only the 52 KB
   config and `patches.json` in the repo.

## 10. Cost

Step 1: ten minutes on the LAN. Step 2: one agent, two `git mv`, about ten
small edits, one targeted verify (`away`, `patchbay`) and a deploy. Step 3: one
agent, `rig/board/` only, `test.mjs` and the audit, a push coordinated with the
camera agent. Step 4: five minutes on the LAN. Step 5: docs, one pass.
