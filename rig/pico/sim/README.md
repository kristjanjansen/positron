# rig/pico/sim

An emulated Raspberry Pi Pico running the 4 button SSD1306 board from
`rig/pico/oled/`, driven by a script: boot the firmware, press keys, save the
screen as a PNG. No board, no browser, no Wokwi account.

```sh
cd rig/pico/sim
npm install          # rp2040js 1.4.0, pure JavaScript, no native addon
node run.mjs         # writes shot-0.png, shot-1.png, shot-2.png here
```

The first run downloads `firmware/RPI_PICO-20260824-v1.29.0.uf2` (MicroPython
v1.29.0 for the RP2040 Pico, 680,960 bytes) and `firmware/bootrom-b1.mjs` (the
RP2040 B1 bootrom from the rp2040js repository). `firmware/` is gitignored;
`node fetch.mjs` fetches them on its own. A run takes about 2 s of wall time
for about 1 s of board time.

What `run.mjs` does: boots MicroPython, enters the raw REPL over the emulated
USB CDC, mounts a RAM filesystem, writes `ssd1306.py` to it, starts
`../oled/main.py` unchanged, prints the I2C scan line, and saves three frames:

| file | when | screen |
| --- | --- | --- |
| `shot-0.png` | first drawn frame | `positron`, `K1 K2 K3 K4`, all `.`, counts `0 0 0 0` |
| `shot-1.png` | K1 held 200 ms | K1 `x`, counts `1 0 0 0` |
| `shot-2.png` | K1 released, K3 held 200 ms | K3 `x`, counts `1 0 1 0` |

## Files

| file | is |
| --- | --- |
| `pico.mjs` | the board: UF2 loader, USB CDC serial, raw REPL, keys, the wired I2C target |
| `ssd1306.mjs` | the display model on I2C0 at 0x3C, and a pure JS PNG encoder (`node:zlib`) |
| `ssd1306.py` | the micropython-lib driver, unchanged, with its source URL and licence in a header |
| `run.mjs` | the scripted run above |
| `run-router.mjs` | the C router of `../firmware/`, graded over its MIDI UART |
| `fetch.mjs` | downloads the firmware and the bootrom |

## What is emulated, and what is not

- **RP2040, not RP2350.** rp2040js emulates the RP2040 only. The real board in
  `rig/pico/oled/` is a Pico 2 W (RP2350); this runs the plain Pico build of
  the same MicroPython. Nothing in `main.py` depends on the difference.
- **One core.** rp2040js runs core 0 only (Wokwi documents the same limit).
  MicroPython's REPL and `main.py` do not use core 1.
- **Time is the emulator's clock.** `hold(1, 200)` is 200 ms as the firmware
  sees it. Instruction timing is approximate (every instruction is costed at a
  flat 125 MHz), so a cycle-exact delay is not.
- **The SSD1306** models the command stream the MicroPython driver sends
  (control bytes with the Co and D/C bits, 0x20 addressing mode, 0x21 and 0x22
  ranges, horizontal, vertical and page addressing, on/off, inverse, remap,
  scan direction, start line). Contrast, timing, charge pump and scrolling are
  consumed and ignored. Reading from the display is not modelled.
- **Flash is not written.** rp2040js does not emulate flash erase and program,
  so MicroPython's own filesystem never formats (`os.listdir('/')` is `[]`,
  `mkfs` fails with ENOSPC). `Pico.ramdisk()` mounts a littlefs on a RAM block
  device instead, which a real board never needs.
- **`i2c.scan()` is bit-banged.** MicroPython on rp2 sends a zero length write
  over the pins as plain GPIO, not through the I2C peripheral, and rp2040js has
  no wires between pins. `WiredI2CTarget` in `pico.mjs` models the pull-ups on
  GP4 and GP5 and ACKs 0x3C, so the scan prints `['0x3c']`. Every other write
  goes through the I2C peripheral model.
- **Pins are not checked.** The emulator routes I2C0 by peripheral, so the
  SSD1306 answers whichever pins I2C0 is muxed to. The bit-banged scan is the
  one place GP4 and GP5 are named.
- **Buttons** are GP10 to GP13 held high by `setInputValue(true)` and pulled
  low while pressed, the same reading as a pull-up and a switch to ground.
  There is no bounce.

## The C firmware

`run-router.mjs` boots the C router of `../firmware/` (`build-pico/router.uf2`,
built in Docker by `../firmware/build.sh pico`) with no MicroPython and no raw
REPL. It feeds MIDI into UART0 RX with rp2040js `feedByte`, reads UART0 TX
through `onByte`, presses K1 to K4, reads the screen back against the fonts
the firmware compiles (a phrase counts only when every pixel of its cells
matches, lit on dark or dark on lit) and checks the bars, dots, arrow and meter
as pixels. It saves `router-0.png` to `router-6.png` in the default font, then
boots the same UF2 once per font with one flash byte patched and saves
`router-font-<name>.png` and `router-font-<name>-hold.png`. Every step
prints PASS or FAIL and the run exits 1 on any FAIL. `../firmware/README.md`
has the steps and what the emulator does not cover.
