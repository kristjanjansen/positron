# plan-pi-oled: the Pico's OLED and four keys on the Pi, as a board node

> Asked 2026-10-12, verbatim in `BACKLOG.md` under `## Open` ("The Pico's OLED
> and four keys on the Pi"): *"can i connect pi to the sceren we planned for
> pico?"*, then *"yes backlog it and plan"*.
>
> **PLAN ONLY. NOTHING IS BUILT, NOTHING WAS RUN ON THE PI.** The Pi is not on
> the LAN today, so every fact about it below is READ from this repository, and
> the newest reading of it is 2026-10-11.
>
> Every claim carries one label:
>
> - **MEASURED**: measured on the named hardware, by this repository, in the
>   file named. Nothing in this plan was measured today.
> - **READ**: a file in this repository (path and line), or an external
>   document (link), read 2026-10-12. External pages were read through a
>   summarising fetch, so a number that gets built on deserves one look at the
>   raw page.
> - **INFERRED**: reasoning, arithmetic or general knowledge of the parts,
>   checked by nobody. Arithmetic says `(arithmetic)`.

## 0. Verdict

**Yes, and the session's wiring answer was right on the four display wires and
wrong on one key pin and on most of the software details.** The module is a
plain I2C device on the Pi's I2C1 header pins, which nothing on this board uses
(READ, below). The recommended build draws the screen with **the same
`oled-ui.wasm` the browser already runs**, inside the board's own node
process, and pushes the 1024 byte frame to the panel through a tiny C helper
that is the Linux twin of `rig/pico/firmware/ssd1306.c`. The keys come in as a
kernel input device through the stock `gpio-key` overlay, read by node as a
plain file. No native node module, no Python, no new language on the board.
In the patchbay it is one node, `pi-1:panel`, with `value-in` (what to show),
`value-out` (the keys) and `state-out` (what it is showing, so a page can draw
the same pixels).

### Corrections to the session's answer

| the session said | verdict | why |
| --- | --- | --- |
| VCC pin 1 (3.3 V), GND pin 6, SDA pin 3 (GPIO2), SCL pin 5 (GPIO3) | **right** | READ from [pinout.xyz I2C](https://pinout.xyz/pinout/i2c). Add: the module's own pin order is `GND VCC SCL SDA` (READ, `rig/pico/oled/wiring.yml:4`), so SCL comes BEFORE SDA on the module and after it on the Pi. Swapped SDA and SCL is the classic first fault (`rig/pico/oled/main.py:16` says so) |
| power from 3.3 V | **right, and it is a requirement, not a preference** | the shop says the module takes 3.3 to 5 V (READ, [Oomipood](https://www.oomipood.ee/product/oled_display_4_nuppu_096_128x64_33v_i2c_ssd1306)). If its I2C or key pull-ups go to VCC and VCC were 5 V, 5 V would reach Pi GPIOs, which are 3.3 V only (INFERRED, general knowledge of the BCM2711). Pin 1, never pin 2 or 4 |
| keys on GPIO 5, 6, 13, **19** | **change 19 to 26** | GPIO19 is PCM FS, physical pin 35, the I2S frame clock (READ, [pinout.xyz PCM](https://pinout.xyz/pinout/pcm)). It is free TODAY, because all audio on this board is USB (the Fast Track Pro, READ below), but an I2S DAC HAT, which `plans/plan-sampler-pi-pico.md` and `plans/plan-hardware.md` both keep open, would take it. GPIO26 (pin 37) has no audio role. So **K1 to K4 on GPIO 5, 6, 13, 26, physical pins 29, 31, 33, 37** |
| keys with pull-ups | **right, with a check first** | the Pi's internal pull-up is enough if the module switches a key to GND. Whether it does is INFERRED, never measured (section 1.3) |
| `dtparam=i2c_arm=on` | **right, and incomplete** | on Trixie it goes in `/boot/firmware/config.txt`, not `/boot/config.txt` (READ, [config.txt docs](https://www.raspberrypi.com/documentation/computers/config_txt.html)); add `dtparam=i2c_arm_baudrate=400000`, because the default is **100000** (READ, [overlays README](https://raw.githubusercontent.com/raspberrypi/firmware/master/boot/overlays/README)); load `i2c-dev` for `/dev/i2c-1` to exist; and it needs a reboot of a board that is in another building |
| `i2cdetect -y 1` shows `0x3c` | **right command, missing package, unproven address** | `i2cdetect` is in `i2c-tools`, which is not in `rig/board/packages.txt` (READ). 0x3C is not stated on the shop page (READ); it is the usual strap for these modules (INFERRED), and `i2cdetect` is the measurement that settles it. Some modules ship at 0x3D |
| keys via gpiod | **works, not the best route here** | `gpiod` is not in `packages.txt` (READ). The `gpio-key` overlay turns each key into a kernel input event with the pull-up and active low set in `config.txt`, and node reads `/dev/input/eventN` as a file. Nothing to install, debounce in the kernel (section 2.3) |
| compile `ui.c` on the Pi | **possible, but not the way to get the same pixels** | `ui.c` itself is plain C (READ, `rig/pico/firmware/ui.c:1-11`, no Pico SDK include) and the Pi has gcc (READ, `packages.txt`, `build-essential`, there for `rig/vis`). But `ssd1306.c` includes `hardware/i2c.h` from the Pico SDK (READ, `ssd1306.h:16`), and the screen's LAYOUT would have to be written in C a second time. Running the already-built `oled-ui.wasm` in node draws byte-identical frames to the browser by construction (section 2.1) |

## 1. Hardware

### 1.1 What the board is (all READ, the newest measured 2026-10-11)

| fact | value | source |
| --- | --- | --- |
| model | **Raspberry Pi 4 Model B Rev 1.5**, 4 cores, 1.8 GHz, 1,847 MB | MEASURED 2026-10-11, `plans/plan-sampler-pi-pico.md:91`; also `plans/plan-board-modulation.md:103` |
| OS | Debian 13 trixie, aarch64, apt from `archive.raspberrypi.com trixie` (so Raspberry Pi OS packages and overlays) | MEASURED 2026-10-11, `plan-sampler-pi-pico.md:92,97` |
| address | `positron@<pi>`, site `pi-1`, room `studio-1` | `HANDOFF.md` session 74; `demo/shell/graph-registry.mjs:40` (`BOARD_SITE = 'pi-1'`) |
| service | `positron-board.service`, `User=positron`, runs `/opt/positron-board/rig/board/board.mjs`, `NoNewPrivileges=true`, no other hardening | `rig/board/positron-board.service` |
| audio | **all USB**: Fast Track Pro 0763:2012 and the Circuit 1235:0079 behind a VIA hub, a Logitech C925e camera, all USB | MEASURED 2026-10-11, `plan-sampler-pi-pico.md:103` |
| JACK | `jackd -r -d alsa -C hw:CARD=Pro,DEV=0 -r 48000 -p 512 -n 3`, capture only, 10.7 ms a period | MEASURED 2026-10-11, `plan-sampler-pi-pico.md:98,105-108` |
| capture floor | about -80 dBFS on the Circuit through JACK | MEASURED, `HANDOFF.md` session 74 |
| HDMI | both disconnected, no X, EGL surfaceless on `/dev/dri/renderD128` | `research/pi-screens-estonia-2026-10-04.md:14-21` |
| process load | board.mjs 5.1 per cent of a core, scsynth 23.7 when the granulator runs | MEASURED, `plan-board-modulation.md` 0.3 |
| installed but unused | a Pi 5 kernel among others (Raspberry Pi OS ships both, it does not make this a Pi 5) | `HANDOFF.md` session 74; the inference in brackets is INFERRED |

**What the 40 pin header carries today: nothing this repository knows of.**
`grep -i 'gpio\|i2c\|dtoverlay\|dtparam\|config.txt\|HAT'` over `rig/board/`,
`rig/vis/` and `rig/board/setup.sh` finds no pin, no overlay and no HAT
(READ). Every audio and MIDI path is USB. ⚠️ That is an absence in the
repository, not a look at the board: a case fan on pins 4 and 6, a heatsink
case that covers the header, or a forgotten jumper would not appear in any file.
The temperature reading of 45.7 C (`plan-board-modulation.md` 0.3) does not
say either way. **Section 5, first item.**

### 1.2 Wiring table

| module pin (its printed order) | Pi physical pin | Pi signal | note |
| --- | --- | --- | --- |
| GND | 6 | ground | any ground pin works; 6 sits beside pins 1, 3, 5 |
| VCC | **1** | 3.3 V | never pin 2 or 4 (5 V), see 1.4 |
| SCL | 5 | GPIO3, I2C1 SCL | |
| SDA | 3 | GPIO2, I2C1 SDA | |
| K4 | 37 | GPIO26 | the module prints buttons in REVERSE (`wiring.yml:4`) |
| K3 | 33 | GPIO13 | |
| K2 | 31 | GPIO6 | |
| K1 | 29 | GPIO5 | |

Pins READ from [pinout.xyz](https://pinout.xyz/pinout/i2c). Module order READ
from `rig/pico/oled/wiring.yml:3-4`, which was itself read off the shop's
photo, and `wiring.yml:16` says which of `^ v # *` is which K "is not visible,
press each and read the count". Eight female to female jumpers; the module has
male pins (INFERRED from the photo-based wiring file, not checked).

Pins deliberately avoided (READ, pinout.xyz, and INFERRED for "would take"):
GPIO0 and 1 (I2C0, HAT EEPROM), GPIO 7 to 11 (SPI0), 14 and 15 (UART, the
serial console if enabled), **18 to 21 (PCM/I2S, any DAC HAT)**, 4 (1-wire
default). GPIO 5, 6, 13 and 26 have no role a HAT this project has discussed
would claim.

### 1.3 The module's keys: active low or high, and how to tell from the board

- **What the repository assumes**: pressed pulls the pin to ground, with the
  host's internal pull-ups (`wiring.yml:27`, `rig/pico/firmware/README.md`
  wiring table, `rig/pico/oled/main.py:21`). That came from the shop photo and
  convention, and **no key on this module has ever been measured** (INFERRED
  that it is right; the shop page says nothing about the buttons, READ).
- **How to tell, with the module in a hand and nothing powered** (INFERRED,
  ordinary bench practice):
  1. Look at the PCB. If one leg of each button runs to the GND pin's copper
     and the other to its K pin, it is active low. Small resistors marked `103`
     (10 kohm) between a K line and VCC are on-board pull-ups.
  2. Multimeter on continuity: K1 to GND beeps only while K1 is held means
     active low. K1 to VCC beeping while held means active high.
  3. Multimeter on resistance, unpowered: K1 to VCC reading about 10 kohm
     means an on-board pull-up; open means none, and the Pi's own pull-up does
     the job.
- **On the Pi, before any overlay**: `pinctrl get 5` reads level, function and
  pull (READ, [raspberrypi/utils pinctrl](https://github.com/raspberrypi/utils/tree/master/pinctrl);
  whether it is installed on this board is unknown). `pinctrl set 5 ip pn`
  (input, no pull): reading `hi` with the key up means the module pulls up.
  Then `pinctrl set 5 ip pu`, hold the key, read `lo`: active low confirmed.
- **If it turns out active high**, the overlay line flips:
  `active_low=0,gpio_pull=down` (READ, overlays README, `gpio-key` params).

### 1.4 Power

- The module on the 3.3 V rail. An SSD1306 module draws on the order of 10 to
  25 mA with a lot of pixels lit (INFERRED, typical module figures); the shop
  lists the plain 0.96" sibling at **0.08 W** (READ,
  `research/pi-screens-estonia-2026-10-04.md:104`), about 24 mA at 3.3 V
  (arithmetic). The Pi 4's 3.3 V header rail has comfortable margin for that
  (INFERRED).
- The shop says the module is "SSD1306 (compatible with SSD1315)" (READ). An
  SSD1315 takes the same command set for this purpose (INFERRED); the init
  sequence in `ssd1306.c` is the micropython-lib one (READ, `ssd1306.c:3-4`).
- Some of these modules feed VCC through an on-board 3.3 V regulator; at 3.3 V
  in, the panel then sits a few tenths of a volt lower. These modules are sold
  for 3.3 V boards and usually run there (INFERRED). If the panel is dim or
  flickers at 3.3 V, the fix is a stronger contrast setting, never pin 2.

### 1.5 Pull-ups on the bus

The Pi has **fixed 1.8 kohm pull-ups to 3.3 V on GPIO2 and GPIO3** (READ,
[pinout.xyz I2C](https://pinout.xyz/pinout/i2c)). The module very likely has
its own (often 4.7 or 10 kohm, INFERRED). In parallel that is about 1.4 to
1.6 kohm (arithmetic), fine for 400 kHz on 10 cm of wire (INFERRED). Nothing to
add. Keys: the Pi's internal pull-up (on the order of 50 kohm, INFERRED from
the BCM2711 family) is enough for a switch to ground on a short wire.

### 1.6 Pi 4 against Pi 5

| | Pi 4 (this board) | Pi 5 (the hardware plan's future box) |
| --- | --- | --- |
| header GPIO | the BCM2711 itself, `gpiochip0` | the RP1 south bridge over PCIe; header on `gpiochip0` since kernel 6.6.45, `gpiochip4` before, Raspberry Pi OS keeps a `gpiochip4` alias (READ, [Raspberry Pi forum](https://forums.raspberrypi.com/viewtopic.php?t=377766), [forum](https://forums.raspberrypi.com/viewtopic.php?t=364196)) |
| `i2c_arm`, `gpio-key` | same overlay names, same pins (READ, overlays README) | same |

Because the plan reaches the keys through the `gpio-key` overlay and the screen
through `/dev/i2c-1`, **no gpiochip number appears anywhere in the code**, and
the same lines work on both boards (INFERRED). A gpiod based reader would have
had to know the chip.

### 1.7 I2C speed

- Default 100 kHz, set to 400 kHz with `dtparam=i2c_arm_baudrate=400000`
  (READ, overlays README).
- A whole frame is about **23 ms at 400 kHz** and one 128 byte page about
  **3.5 ms** (READ, `rig/pico/firmware/ssd1306.h:4-7`, the firmware author's
  arithmetic); at 100 kHz about four times that, **about 92 ms** a frame
  (arithmetic: 1024 bytes x 9 bits / 100,000).
- So send only the pages that changed. A level meter on one text row changes
  one or two of the eight pages: **about 3.5 to 7 ms of bus a frame** at
  400 kHz (arithmetic).
- On a Pi 4 the I2C clock is derived from the core clock, which can move
  with frequency scaling (INFERRED, widely reported). For a display this only
  shifts speed, and it is worth one scope or one timed frame to know.

### 1.8 Conflicts with the board's audio

- **No pin conflict**: audio is USB only (READ, 1.1); I2C1 and GPIO 5, 6, 13,
  26 are not I2S.
- **CPU**: the kernel I2C driver is interrupt driven, a few hundred bytes a
  frame at 10 frames a second is negligible next to JACK's 10.7 ms periods
  (INFERRED). Drawing a frame with `ui.c` is microseconds of arithmetic
  (INFERRED); it happens on board.mjs's main thread, which also relays audio
  frames, so it is measured in step 5.
- **Noise**: the panel's charge pump switches on the 3.3 V rail; the audio
  interface is powered from the USB hub (READ, 1.1), so audible coupling is
  unlikely (INFERRED). The capture floor of about **-80 dBFS** (MEASURED,
  session 74) is the before figure; step 2 takes the after figure.
- **A reboot is a cost**: enabling I2C and the key overlays needs one. A power
  cycle of the Fast Track Pro once cured 8 bit samples (READ, `HANDOFF.md`
  session 74), so after the reboot check the capture before calling the step
  green.

## 2. Software

### 2.1 What drives the screen

| route | same pixels as the browser? | new on the board | verdict |
| --- | --- | --- | --- |
| **A. `oled-ui.wasm` in board.mjs, frames pushed by a small C helper `oledpush`** | **yes, the same binary** (`demo/resources/pico/oled-ui.wasm`, built from `ui.c` unchanged, no imports, READ `rig/pico/firmware/wasm/ui_wasm.c:1-11` and `build.sh`) | about 80 lines of C compiled on the Pi, as `rig/vis` already is (READ, `push.sh:55`) | **recommended** |
| B. `oled-ui.wasm` in node, frames to the kernel's `ssd1306` framebuffer overlay | yes for the drawing | nothing compiled; `dtoverlay=ssd1306,height=64` (default height is **32**, READ, overlays README) and node writes `/dev/fbN` | **fallback**. The kernel's init sequence and refresh are not the ones the firmware uses, the format is linear 1 bit rather than page major, and which driver binds on this kernel (fbdev `ssd1307fb` or DRM `ssd130x`) is unknown (INFERRED) |
| C. `ui.c` compiled natively, layout in C | only if the layout is written twice | a C program with a command protocol | rejected: two layouts drift, which is why the wasm build exists (`ui_wasm.c:1-4`) |
| D. a node I2C library (`i2c-bus`) | yes for the drawing | a native addon built by node-gyp, rebuilt on every node upgrade | rejected: the board already pays this for `node-datachannel` (`HANDOFF.md` session 75) and the C helper is smaller |
| E. Python with `luma.oled` | **no**, different fonts and drawing code | a Python stack | rejected |

**Route A in detail.**

- `oledpush.c` (new, `rig/board/panel/`): `ssd1306.c` with the Pico SDK swapped
  for Linux `i2c-dev` (`open("/dev/i2c-1")`, `ioctl(I2C_SLAVE, 0x3c)`,
  `write()`); the same init sequence (`ssd1306.c:3-4`), so the device is lit
  exactly as the Pico would light it. It reads 1024 byte frames on stdin, page
  major as `ui_wasm.c` makes them, compares with the last frame sent and
  writes only the pages that changed. On stdin EOF it blanks the panel, so a
  dead board does not leave a frozen screen that reads as alive. Built on the
  board by `push.sh` the way `rig/vis` is, never on the Mac (memory
  `managed-machine-ask-first`).
- The layout is a new shared module, `demo/shell/panel-screen.mjs`:
  `drawPanel(ui, state)` calls the wasm exports (`header`, `text`, `meter`,
  `dot`, `footer`, ...). The board imports it as it imports `rhodes.mjs`
  (`rig/board/README.md:55`, "imported, not ported"), and the browser imports
  the same file. **Same wasm, same layout code, same state: same 1024 bytes**,
  and the md5 of the frame is the proof (step 4).
- `setup.sh` already proves every import resolves from `/opt` (READ,
  `setup.sh:162`); `oled-ui.wasm` has to be copied there too, since it lives in
  `demo/resources/pico/`.

### 2.2 How the board feeds it

- board.mjs already holds the state (READ, its cases in `board.mjs:827-1627`):
  which instruments run (`audio.status`), the selected voice
  (`voices.list`, `voice.select`), levels (`ctl.meter`), the video state, JACK
  links, the relay connection. A new `rig/board/panel.mjs` gathers these into
  a `state` object, draws at most **10 frames a second** and only when the
  state changed, and writes the frame to `oledpush`'s stdin.
- `oledpush` is a child process, as ffmpeg and jackd are. A crash in it is a
  logged line and a respawn, never a dead board.
- **The panel is announced only when it answered**: at start the board asks
  `oledpush --probe`, which ACKs 0x3C or not. No panel, no node in the graph,
  one log line. A board without a screen must stay exactly as it is.

### 2.3 What reads the keys

- `config.txt`, one line per key (READ, overlays README, `gpio-key`: `gpio`,
  `active_low` default 1, `gpio_pull` default up, `keycode`, `label`):

  ```
  dtoverlay=gpio-key,gpio=5,keycode=256,label=K1
  dtoverlay=gpio-key,gpio=6,keycode=257,label=K2
  dtoverlay=gpio-key,gpio=13,keycode=258,label=K3
  dtoverlay=gpio-key,gpio=26,keycode=259,label=K4
  ```

  256 to 259 are `BTN_0` to `BTN_3` (INFERRED from `linux/input-event-codes.h`),
  chosen over keyboard codes so a headless console never reads a key press as
  typing or as a terminal switch (INFERRED).
- node opens the device by its stable name under `/dev/input/by-path/`
  (INFERRED name, read it on the board) and reads 24 byte `input_event`
  records (aarch64: 16 byte time, type, code, value; INFERRED). Debounce is the
  `gpio-keys` driver's (INFERRED, a few ms by default); press counts in step 3
  say whether it is enough.
- A hold is timed in node from the down and up events, as the firmware times
  K4 (1 s, READ, `rig/pico/firmware/README.md`, keys table).

### 2.4 Part of the board process, not a service of its own

One process has the state and the relay; a second service would need its own
socket to the room or an IPC to the board just to know what to draw (INFERRED).
Isolation comes from the child process: `oledpush` dying cannot stop audio.
The cost is that a board restart blanks the panel for the 2 s `RestartSec`
(READ, the unit file), which is honest.

### 2.5 Permissions and setup

- `/dev/i2c-1` belongs to group `i2c` and `/dev/input/event*` to group `input`
  on Raspberry Pi OS (INFERRED, its udev rules). `setup.sh` already does
  `usermod -aG audio` (READ, `setup.sh:84`); it gains `i2c` and `input`.
  Whether `positron` is already in them is unknown: `id positron` in step 0.
- A systemd service picks up new groups at its next start, with no re-login
  (INFERRED, systemd calls `initgroups` for `User=`). `alsa.mjs:110`'s
  "needs a re-login" is about an interactive shell.
- `NoNewPrivileges=true` (READ) is fine: nothing here needs privileges beyond
  the groups.
- `i2c-dev` goes into `/etc/modules-load.d/positron-board.conf`, which
  `setup.sh` already writes (READ, `setup.sh:72`).
- `packages.txt` gains `i2c-tools` (for `i2cdetect` only) with its why.
- `config.txt` is edited by hand, once, and the plan does NOT make `setup.sh`
  edit the boot partition: a script that rewrites boot config on a board in
  another building is the wrong default (INFERRED, judgement).

## 3. The patchbay

### 3.1 The node

Named per `.claude/skills/positron-concepts/SKILL.md` (port names
`<site>:<node>:<medium>-<dir>`, a node is a part of a site, `value` carries
text) and built the way `boardGraph()` builds every board node (READ,
`graph-registry.mjs:158-165`, `node(n, kind, label)` and `port(n, p, o)`).

| port | medium, dir | carries | default |
| --- | --- | --- | --- |
| `pi-1:panel:value-in` | value, in | what to show: `{ of: 'text', text }` shows a message banner for a few seconds; `{ of: 'tempo', bpm }` fills the tempo cell; `{ of: 'panel', page }` turns a page | nothing linked: the status page |
| `pi-1:panel:value-out` | value, out | the keys: `{ of: 'key', key: 1..4, down, held }` | goes nowhere unless linked |
| `pi-1:panel:state-out` | state, out | what the panel is showing: the `state` object `drawPanel` was given, plus the md5 of the frame it made | for the concept page to draw the same pixels |

- Node kind `device`, label `OLED` (as inputs are, `graph-registry.mjs`).
- **Why the keys are `value-out` and not `midi-out`**: a key is a choice, not
  a note, and the skill's rule is to name a port by what flows. A `midi-out`
  can be added later if the owner wants K1 and K2 to send program changes
  straight to the Circuit through the gate.
- **Why `state-out` and not `video-out`**: `/concepts/device/000/` draws its
  emulated Pico as `pico:video-out -> oled:video-in` (READ,
  `demo/concepts/device/000/index.html:113`), but on this board `video` means
  an H.264 stream by WHIP or the relay (READ, `graph-registry.mjs`, the gpu
  node). Sending the state rather than the 1 KB frame is cheaper and lets the
  page prove the pixels match by md5.
- **What it needs that the board does not have**: the board does not handle
  `bay.event` today (READ: no `bay.event` in `rig/board/*.mjs`). The value
  links need the board to receive a `bay.event` along a link it holds and to
  emit one from `panel:value-out`, which is the `bay-node.mjs` contract the
  pages already use. That is a shared change, done once by one agent (step 6).

### 3.2 What it shows by default (from what the board already knows)

```
 pi-1          studio-1  o        header: site, room, relay dot
 YOSHIMI  110/8 TREM LEAD         the running engine and its voice
 [|||||||||||       ]  -18 dB      capture level, the meter
 JACK 512x3  XRUN 0   45C         the graph's health
 PAGE | NEXT | STOP | OK          the keys, as the firmware's footer
```

- Every line is READ from a source the board has today, except the tempo,
  which the board does not have (READ: `tempo`/`bpm` do not occur in
  `board.mjs`); a tempo appears only when something links into `value-in`,
  such as the shared clock of `/concepts/clock/020/`.
- The Circuit's patch name is NOT polled: it comes from a SysEx dump request
  (READ, `HANDOFF.md` session 74), and asking an instrument every few seconds
  for a status line is the wrong trade. It shows when a page asked for it.
- Keys alone, with nothing linked: K1 turns the page (status, voice, network,
  last message), K2 next voice (`voice.select`), **K3 panic (`note.panic`,
  READ `board.mjs:881`), always local whatever is linked**, K4 OK, held 1 s
  NO, as the Pico router does (READ, firmware README).
- Font `glcd5x7`, the firmware's default, chosen for reading at arm's length
  (READ, firmware README, fonts table).

### 3.3 A concept page: `/concepts/device/010/` Pi panel

- `device` is an existing group with one page, `device/000` Pico router
  (READ, `demo/concepts/list.mjs:39,83`). 010 is the next number.
- The page: the browser OLED (`oledScreen()` from `demo/shell/oled-view.mjs`,
  pixel exact at a whole number scale), drawn by `panel-screen.mjs` from the
  state that arrives on `pi-1:panel:state-out -> web:oled:state-in`. A
  readout ON TOP (skill rule): device md5, page md5, `match`, frames, last key.
- Four on-screen keys as `web:panel-keys:value-out`, the same shape as the
  device's, so a link can be tried from the page without the device; a text
  box `web:text:value-out -> pi-1:panel:value-in` that puts a message on the
  real screen.
- Opens nothing on a visit. Join on a press. With no board in the room it
  draws the local status page from a fixed state and says the board is not in
  the room.
- One idea: **the pixels in the tab are the pixels on the device**, and the
  md5 cell is what says so.

## 4. Steps, smallest first, each one session, each measured

Every step on the Pi starts with the md5 check: compare
`md5sum /opt/positron-board/rig/board/*` with the repository (`push.sh`
prints it), because the Pi once ran code four hours old (READ, `HANDOFF.md`
session 75). Ask the relay first (`node rig/board/ask.mjs --room studio-1
audio.status`), since an unanswered ssh is not a down board (skill).

| # | step | needs | measured by | done when |
| --- | --- | --- | --- | --- |
| 0 | **Read the board, change nothing.** md5 check; `id positron`; `ls /dev/i2c* /dev/input`; `cat /boot/firmware/config.txt`; `pinctrl get 2,3,5,6,13,26`; `which pinctrl i2cdetect gpiomon`; and **a photograph of the header** | Pi on the LAN (ssh) and a person at it for the photo | the outputs pasted into this plan | the header is known free, groups and tools known |
| 1 | **The module on the bench, no Pi.** Is it bought? Look at the PCB, continuity K to GND held, resistance K to VCC; map `^ v # *` to K1 to K4 | the module, a multimeter, the owner | four polarities, four resistances | 1.3 settled |
| 2 | **The screen alive.** Pi off, four wires, `i2c_arm=on`, `i2c_arm_baudrate=400000`, `i2c-dev`, `i2c-tools`, reboot | a person at the Pi, then LAN | `i2cdetect -y 1` shows the address; JACK capture floor against -80 dBFS; board tests against **445/445** (READ, session 74) | address known, floor unchanged |
| 3 | **The keys.** Four wires, `pinctrl` reads first, then the four `gpio-key` lines, reboot | a person, then LAN | ten presses per key counted in node from `/dev/input`: 10 of 10, no doubles; a 1 s hold timed | 40 of 40 |
| 4 | **`oledpush` and the same pixels.** Write `oledpush.c` and `panel-screen.mjs`; a test draws one fixed state in node on the Pi and in Chrome on the Mac | LAN; push.sh builds on the Pi | **md5 of the two 1024 byte frames equal**; full frame time at 400 kHz against 23 ms; one page against 3.5 ms | md5 match, timings recorded |
| 5 | **The status page in board.mjs.** `panel.mjs`, probe, announce `pi-1:panel` only on ACK | LAN | board.mjs CPU against **5.1 per cent** (MEASURED baseline); frames a second; a board with the module unplugged is unchanged (graph and tests) | CPU within a point of baseline |
| 6 | **The links.** board receives and emits `bay.event` for `panel:value-in` and `value-out` (shared, one agent) | LAN or relay | a text from a tab appears on the device; a key reaches a tab; the bay refuses a link it should | both directions over the relay |
| 7 | **`/concepts/device/010/`.** The mirroring page | relay only (works from anywhere) | md5 cell reads `match` on the deployed page; `check-html.mjs` | deployed URL handed over |

Steps 0 to 3 need hands at the Pi and are cheap. Step 4 is the one that proves
the idea. Steps 5 to 7 are ordinary board and page work.

## 5. What cannot be settled from reading

1. **Whether the header is free.** The repository records nothing on it,
   which is not the same as nothing being there: a fan, a case, a HAT. One
   photograph.
2. **Whether the module is bought and where it is.** The shopping list in
   `HANDOFF.md` (around line 673) lists it at €10.50 for the Pico; nothing
   says it arrived.
3. **The key polarity and any on-board pull-ups** (1.3). Assumed active low
   everywhere in `rig/pico/`, never measured.
4. **The I2C address**: 0x3C assumed, not on the shop page.
5. **SSD1306 or SSD1315** on the actual board, and whether `ssd1306.c`'s init
   sequence lights it the same way (the shop says compatible).
6. **Whether the panel is bright and stable at 3.3 V** through whatever
   regulator the module carries.
7. **Where the Pi physically is.** CLAUDE.md says "a Raspberry Pi in another
   building", the handoffs reach it on `<pi>` on the desk's LAN. A
   status screen is worth most where someone stands next to it.
8. **Whether `pinctrl`, `gpiod` and `i2c-tools` are installed**, and whether
   `positron` is already in `i2c` and `input` (step 0).
9. **Which driver binds the kernel `ssd1306` overlay on this kernel**, which
   only matters if route B is ever needed.
10. **Whether 0.96" is readable from where the owner stands.** The 2.42"
    SSD1309 at €35.00 is the same protocol and 128x64 (READ,
    `research/pi-screens-estonia-2026-10-04.md:106,156-160`); the plan would
    carry over with one init difference (INFERRED).
11. **The I2C clock's dependence on the Pi 4's core clock** under frequency
    scaling: one timed frame says whether it matters.

## Cost

The module €10.50 (READ, shop, 52 at Peterburi tee and 2 at Järve today),
eight jumpers. On the board: one package (`i2c-tools`), two groups, one
module load, five lines of `config.txt`, one reboot. In the repository:
`oledpush.c` (about 80 lines, INFERRED), `panel.mjs`, `panel-screen.mjs`
(shared), the `bay.event` handling in the board (shared), one concept page.
