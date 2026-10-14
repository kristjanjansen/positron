# rig-pico

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `rig/pico/firmware/build.sh`

### firmware-build

Above `set -euo pipefail`, lines 2 to 12 before the cut.

~~~sh
# rig/pico/firmware/build.sh: build the router for both boards, inside Docker.
#
#   rig/pico/firmware/build.sh          pico (RP2040, the emulator) and pico2_w (RP2350, the desk)
#   rig/pico/firmware/build.sh pico     just one
#
# Writes build-<board>/router.uf2 beside this file. The CMake tree lives in the
# container's /tmp and is thrown away; only the .uf2 comes back, which is ARM
# code and never runs on this Mac.
#
# 🔴 NOTHING NATIVE RUNS ON THE MAC. The compiler, CMake and picotool are all in
# the image `positron-pico-sdk:2.2.0`, built from the Dockerfile here on first use.
~~~

## `rig/pico/firmware/wasm/build.sh`

### wasm-build

Above `set -euo pipefail`, lines 2 to 8 before the cut.

~~~sh
# rig/pico/firmware/wasm/build.sh: ../ui.c and its fonts as a WebAssembly
# module for /kit/, built inside the emscripten/emsdk image.
#
#   rig/pico/firmware/wasm/build.sh     writes demo/resources/pico/oled-ui.wasm
#
# STANDALONE_WASM with no entry point, so the module has NO imports and the
# page instantiates it with an empty object: no emscripten JavaScript glue.
~~~

## `rig/pico/firmware/wasm/test.mjs`

### wasm-test

Above `import { readFileSync } from 'node:fs';`, lines 1 to 10 before the cut.

~~~js
// rig/pico/firmware/wasm/test.mjs: is demo/resources/pico/oled-ui.wasm the
// same drawing code as the firmware? Two compilers, one ui.c: the key labels
// the emulated router puts on its screen are compared pixel for pixel with
// what the module draws from the same four words.
//
//   node rig/pico/firmware/wasm/test.mjs
//
// Needs ../build-pico/router.uf2 (../build.sh pico) and the module (./build.sh).
// ⚠️ A NEGATIVE CONTROL: the same comparison against a module drawing with OK
// lit must FAIL, or a comparison that passes proves nothing.
~~~

## `rig/pico/net/build.sh`

### net-build

Above `set -euo pipefail`, lines 2 to 12 before the cut.

~~~sh
# rig/pico/net/build.sh: build the Pico 2 W network node, inside Docker.
#
#   rig/pico/net/build.sh              wss:// to studio-1 (the default)
#   rig/pico/net/build.sh -DRELAY_TLS=0 -DRELAY_ROOM=pico-test-abc123
#
# Writes build-pico2_w/net.uf2, net.elf and net.map beside this file (all
# ignored by git). The map file is what the RAM estimate is read from.
# Wifi credentials come from pico/wifi_secrets.h, which is NOT committed; with
# no such file the UF2 still builds and links and joins nothing.
#
# 🔴 NOTHING NATIVE RUNS ON THE MAC. The compiler is in the image.
~~~

## `rig/pico/net/linux/build.sh`

### net-linux-build

Above `set -e`, lines 2 to 5 before the cut.

~~~sh
# rig/pico/net/linux/build.sh: runs INSIDE the positron-pico-net image, never on
# the Mac. Compiles mbedTLS (the SDK's submodule, our config) and the node into
# /out/<name>. test.mjs calls it; extra CFLAGS select a variant, e.g.
#   build.sh node-linux-in4k -DPOSITRON_TLS_IN=4096
~~~

## `rig/pico/net/test.mjs`

### pico-net-test

Above `import { spawn, spawnSync } from 'node:child_process';`, lines 1 to 23 before the cut.

~~~js
// rig/pico/net/test.mjs: the Pico's network code, on Linux in Docker, against
// the real relay, checked from this Mac through demo/shell/wire.mjs and
// demo/shell/graph-registry.mjs.
//
//   node rig/pico/net/test.mjs            build, self test, then wss, ws, and wss with a 4 KB TLS record buffer
//   node rig/pico/net/test.mjs --no-build reuse the binaries already in the Docker volume
//
// 🔴 NOTHING NATIVE RUNS ON THE MAC. The C is compiled and run in the image
// `positron-pico-net:2.2.0`; the binaries live in the Docker volume
// `positron-pico-net-bin`, never in this checkout. Only node runs here.
//
// ⚠️ OUR RELAY ONLY, AND NEVER studio-1. Every run makes its own room,
// `pico-test-<6 hex>`, and every site is `pico-<6 hex>` drawn fresh, so nothing
// here is heard by a page, a board or a person.
//
// Each variant checks, and exits 1 on any FAIL:
//   1. the C node's graph.announce arrives, graphProblem() is '' and
//      createRegistry().ingest() takes it, with the three ports
//   2. graph.ask brings another announce
//   3. light.set to <site>:led:light is logged by the C side as LIGHT #ff8800 ...
//   4. 100 node.ping -> node.pong round trips, p50/p99/max, Mac to relay to container and back
//   5. the container's own 100 relay pings and 100 room echoes (test.probe)
//   6. a 20 KB message in the room, then one more node.ping: does the link survive
~~~

## `rig/pico/oled/breadboard.mjs`

### breadboard-header

Above `import { writeFileSync } from 'node:fs';`, lines 1 to 33 before the cut.

~~~js
// rig/pico/oled/breadboard.mjs - draw the Pico 2 WH, the OLED module and the
// hub power on an 830 hole breadboard, as breadboard.svg.
//
//   node rig/pico/oled/breadboard.mjs           # hub powered: breadboard.svg
//   node rig/pico/oled/breadboard.mjs mb102     # MB102 power module: breadboard-mb102.svg
//   node rig/pico/oled/breadboard.mjs 400       # 400 hole board, hub powered: breadboard-400.svg
//
// wiring.yml (WireViz) says WHICH pin goes to which; this says WHERE each wire
// goes on the board, hole by hole, so the board can be built by copying it.
// Pins are the Pico's physical numbers and the module's printed labels, the
// same as wiring.yml. Plain SVG, no dependency, nothing native (ThreatLocker).
//
// THE BOARD. MB-102, 63 columns, rows a to e above the centre gap and f to j
// below, a + and - rail along each long edge. Columns a-e are joined per
// column, f-j likewise, and each rail is one strip along the board.
// THE PICO straddles the gap at 0.7 inch, pins in row c and row h, USB to the
// left. With USB left, pins 1 to 20 run along the BOTTOM (pin 1 by the USB)
// and pins 40 to 21 along the TOP (pin 40 by the USB), so column n holds pin n
// in row h and pin 41-n in row c.
// THE OLED MODULE's 8 pin header sits in row f, columns 40 to 47, its body
// lying over the empty top half: GND VCC SCL SDA K4 K3 K2 K1, as printed.
// POWER, two ways. Default: a spare port of the powered hub through a USB-A
// plug to screw terminal adapter, 5 V into VBUS (pin 40) and ground to the
// rail. `mb102`: the breadboard power module on the right hand end, its top
// jumper on 5 V (the top rails feed VBUS) and its bottom jumper on 3.3 V (the
// bottom rails feed the OLED), so the Pico's own 3V3 out is wired to nothing.
// ⚠️ The module's layout is the common MB102's, INFERRED: the shop page gives
// only 6.5 to 12 V in, 3.3 V or 5 V out, 700 mA.
// `400`: the half size board, 30 columns, hub powered like the default. The
// Pico keeps columns 1 to 20, the OLED header moves to row f, columns 22 to
// 29, and the module (15 holes wide) overhangs the board's right hand end.
// Every wire still lands in rows g to j, never in a hole the module's own
// header pins use.
~~~

### breadboard-oled

Above `const OLED = ['GND', 'VCC', 'SCL', 'SDA', 'K4', 'K3', 'K2', 'K1'];`, lines 106 to 113 before the cut.

~~~js
// the OLED module ON the board: header in row f, columns 40..47, body lying
// flat over the centre gap, rows a to e and the top rails, which this build
// leaves empty in those columns. Its wires plug into g to j of the same
// columns, which the body does not cover, so none of them crosses the gap.
// ⚠️ AT ITS REAL SIZE, about 37 by 27 mm (15 by 11 holes, INFERRED from the
// shop photo, not measured). Screen on the far side, keys ^ v # * a column on
// the right. If the picture reads upside down from where you sit, the SSD1306
// flips in firmware; nothing about the wiring changes.
~~~

### breadboard-signals

Above `const SIGNALS = [`, lines 170 to 170 before the cut.

~~~js
// column OC + k holds the module's k-th header pin, GND VCC SCL SDA K4 K3 K2 K1
~~~

### breadboard-split

Above `...['T+', 'T-', 'B-', 'B+'].map((r) => [[r, 29], [r, 35], r.endsWith('+') ? (r[0`..., lines 185 to 185 before the cut.

~~~js
// ⚠️ only if the board's rails are split in the middle: bridge each one
~~~

## `rig/pico/oled/main.py`

### oled-main

Above `from machine import Pin, I2C`, lines 1 to 9 before the cut.

~~~python
# rig/pico/oled/main.py - the 4 button SSD1306 OLED on a Pico, proved.
#
# Wiring is wiring.svg beside this file: SDA GP4, SCL GP5, buttons GP10 to
# GP13 to ground, power from 3V3(OUT). Runs unchanged on a real Pico 2 W and in
# Wokwi (paste diagram.json and this file). It only proves the wiring: the
# screen says hello and shows which buttons are held.
#
# The driver: in Wokwi add ssd1306.py from micropython-lib to the project; on a
# real Pico W on wifi, `import mip; mip.install('ssd1306')` once from the REPL.
~~~

## `rig/pico/patch/build.sh`

### patch-build

Above `set -euo pipefail`, lines 2 to 11 before the cut.

~~~sh
# rig/pico/patch/build.sh: build the /archive/pico-router/ (once /concepts/070/) firmware for the plain RP2040 Pico,
# inside Docker, and copy the UF2 to where the page fetches it.
#
#   rig/pico/patch/build.sh
#
# Writes build-pico/patch.uf2 beside this file and demo/resources/pico/patch-pico.uf2.
# The image is the router's, `positron-pico-sdk:2.2.0`, built from
# rig/pico/firmware/Dockerfile on first use.
#
# 🔴 NOTHING NATIVE RUNS ON THE MAC. The compiler, CMake and picotool are all in the image.
~~~

## `rig/pico/patch/test.mjs`

### patch-test

Above `import { readFileSync } from 'node:fs';`, lines 1 to 5 before the cut.

~~~js
// rig/pico/patch/test.mjs: boot patch.uf2 on rp2040js, play notes into UART0
// RX, and check what comes out of UART0 TX and what the screen draws. Exits 1
// on any FAIL.
//
//   rig/pico/patch/build.sh && node rig/pico/patch/test.mjs [--show]
~~~

## `rig/pico/rings/build.sh`

### rings-build

Above `set -euo pipefail`, lines 2 to 11 before the cut.

~~~sh
# rig/pico/rings/build.sh: build the rings firmware for the plain RP2040 Pico,
# inside Docker, and copy the UF2 to where the page fetches it.
#
#   rig/pico/rings/build.sh
#
# Writes build-pico/rings.uf2 beside this file and demo/resources/pico/rings-pico.uf2.
# The image is the router's, `positron-pico-sdk:2.2.0`, built from
# rig/pico/firmware/Dockerfile on first use.
#
# 🔴 NOTHING NATIVE RUNS ON THE MAC. The compiler, CMake and picotool are all in the image.
~~~

## `rig/pico/rings/test.mjs`

### rings-test

Above `import { readFileSync } from 'node:fs';`, lines 1 to 4 before the cut.

~~~js
// rig/pico/rings/test.mjs: boot rings.uf2 on rp2040js, play notes into UART0 RX,
// and check the screen has rings on it. Exits 1 on any FAIL.
//
//   rig/pico/rings/build.sh && node rig/pico/rings/test.mjs [--show]
~~~

## `rig/pico/sim/fetch.mjs`

### sim-fetch

Above `import { existsSync, mkdirSync, writeFileSync } from 'node:fs';`, lines 1 to 9 before the cut.

~~~js
// rig/pico/sim/fetch.mjs: download, once, the two binaries the emulator needs.
// Both land in firmware/, which is gitignored, so a clone fetches them first.
//
//   MicroPython for the plain Raspberry Pi Pico (RP2040), from micropython.org.
//   The RP2040 B1 bootrom, as rp2040js ships it in its demo/ directory (built
//   from github.com/raspberrypi/pico-bootrom, BSD-3-Clause). The npm package
//   does not include it, and the MicroPython image calls into it.
//
// Skips any file already present. `node fetch.mjs`, or let run.mjs do it.
~~~

## `rig/pico/sim/pico.mjs`

### pico-sim-header

Above `import { readFileSync } from 'node:fs';`, lines 1 to 10 before the cut.

~~~js
// rig/pico/sim/pico.mjs: an emulated Raspberry Pi Pico (RP2040) with the
// 4 button SSD1306 board of rig/pico/oled/ wired to it, scriptable.
//
//   SSD1306 on I2C0 at 0x3C (GP4 SDA, GP5 SCL on the real board; the emulator
//   routes I2C0 by peripheral, not by pin, so the pins are not checked here).
//   K1..K4 on GP10..GP13, to ground, read through the pull-up: released is high.
//
// Time is the emulator's own clock (clock.nanos), not the wall clock, so
// `hold(1, 200)` is 200 ms as the firmware sees it however long it takes to
// emulate.
~~~

### pico-sim-wired-i2c

Above `class WiredI2CTarget {`, lines 32 to 39 before the cut.

~~~js
// The I2C bus as wires, for the one transfer MicroPython does NOT send through
// the I2C peripheral. ports/rp2/machine_i2c.c answers a zero length write by
// bit-banging the pins as SIO GPIO ("Workaround issue with hardware I2C not
// accepting zero-length writes"), and i2c.scan() is nothing but zero length
// writes. rp2040js has no wires between pins, and a pin reads back only what
// setInputValue last put there, so without this the scan reads [] while the
// hardware path to the same display works. This models the pull-ups (a line is
// high unless somebody drives it low) and a target that ACKs its address.
~~~

### pico-sim-ramdisk

Above `async ramdisk(blocks = 64, size = 512) {`, lines 208 to 212 before the cut.

~~~js
// A filesystem the firmware can import from. MicroPython's own one lives in
// flash, and rp2040js does not emulate flash ERASE and PROGRAM (reads work,
// writes are lost): on the emulated board `os.listdir('/')` is [] and
// `os.VfsLfs2.mkfs(rp2.Flash())` fails with ENOSPC. So this mounts a littlefs
// on a RAM block device at '/' instead, which a real board never needs.
~~~

## `rig/pico/sim/run-router.mjs`

### run-router-header

Above `import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';`, lines 1 to 25 before the cut.

~~~js
// rig/pico/sim/run-router.mjs: the C router of rig/pico/firmware/ on an
// emulated Pico, driven over its MIDI UART and its four keys, graded step by
// step, with a screenshot after each.
//
//   ../firmware/build.sh pico      # builds ../firmware/build-pico/router.uf2 in Docker
//   node run-router.mjs            # router-0.png .. router-6.png, router-font-*.png
//
// MIDI goes in through UART0's RX FIFO (rp2040js `feedByte`) and comes out of
// UART0's data register (`onByte`), which is the pin pair GP1 and GP0 on the
// board. The emulated UART has no baud timing: a byte is in the FIFO the moment
// it is fed, so 31250 baud is set by the firmware and not exercised here.
//
// The screen is READ BACK through the display model, not trusted from the
// firmware. The fonts are parsed out of the same ui.c and font headers the
// firmware compiles, and a phrase counts as on the panel only when every pixel
// of its character cells matches exactly, lit on dark or dark on lit (which is
// how the inverted header, banner and footer cell are told apart). The bars,
// dots, arrow and meter are checked as pixels too.
//
// Then once per compiled font: the same UF2 with ONE flash byte patched (the
// byte after "UIFONT" in main.c's FONT_PICK) boots in that font, and the real
// screen is shot in scene 2 and in the hold state, router-font-<name>.png and
// router-font-<name>-hold.png.
//
// Exits 1 on any FAIL.
~~~

### run-router-readable

Above `const READABLE = 'ABCDEFGHIJKLMNOPRSTUVWXYZQ0123456789+/:,';`, lines 92 to 95 before the cut.

~~~js
// Everything legible, as runs of characters, for the log. Only what this
// screen draws: capitals, digits and a little punctuation, so a lower case
// glyph whose top half equals some edge is not read. Where two glyphs share
// the cap band (O and a Q whose tail is below it) the first listed wins.
~~~

### run-router-one-line

Above `const said = HOLD_WORDS.find((t) => s.has(t, true));`, lines 321 to 321 before the cut.

~~~js
// ONE LINE, NEVER TWO: whichever wording fitted, and no second banner line.
~~~

### run-router-labels

Above `const ruleAt = (px) => { for (let x = 127; x > 64; x--) { let n = 0; for (let y `..., lines 330 to 338 before the cut.

~~~js
// ── the key labels down the right, every font ──
// The module's four buttons sit in a column beside the screen, so byte 7
// moves the labels there. Graded as pixels: one full height rule, the four
// labels in top to bottom order inside the column, nothing of the link or
// the header reaching past the rule, and K4's cell filled while held.
// ⚠️ A NEGATIVE CONTROL FIRST: the default boot must have NO such rule, or a
// check that finds one proves nothing about byte 7.
// The column's rule runs from under the header to the foot: every row from
// 16 down lit, which no box side, arrow or footer divider is.
~~~

## `rig/pico/sim/run.mjs`

### sim-run

Above `import { readFileSync, writeFileSync } from 'node:fs';`, lines 1 to 6 before the cut.

~~~js
// rig/pico/sim/run.mjs: boot MicroPython on an emulated Pico, put the OLED
// driver on it, run rig/pico/oled/main.py unchanged, press keys, save the screen.
//
//   npm install && node run.mjs    # shot-0.png, shot-1.png, shot-2.png beside this file
//
// The first run downloads the firmware and the bootrom into firmware/.
~~~

## `rig/pico/sim/ssd1306.mjs`

### ssd1306-model

Above `import { deflateSync } from 'node:zlib';`, lines 1 to 14 before the cut.

~~~js
// rig/pico/sim/ssd1306.mjs: an SSD1306 128x64 OLED on an rp2040js I2C bus, and
// a pure JavaScript PNG of what it shows.
//
// The model is the part of the datasheet the MicroPython micropython-lib driver
// exercises, plus the addressing modes a C driver might use:
//   control byte: bit 7 Co (one byte follows, then another control byte),
//                 bit 6 D/C (1 data, 0 command)
//   0x20 memory addressing mode (0 horizontal, 1 vertical, 2 page)
//   0x21 column range, 0x22 page range, 0xB0..0xB7 page start (page mode),
//   0x00..0x0F and 0x10..0x1F column start (page mode)
//   0xAE/0xAF display off/on, 0xA6/0xA7 normal/inverse, 0xA4/0xA5 entire on,
//   0xA0/0xA1 segment remap, 0xC0/0xC8 COM scan direction, 0x40..0x7F start line
// Everything else is consumed with its argument count and otherwise ignored
// (contrast, clock, precharge, charge pump, scrolling).
~~~
