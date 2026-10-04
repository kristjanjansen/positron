# rig/pico/firmware

A two port DIN MIDI router in C on the Pico SDK, with the routing core of
`rig/route-core/` at its centre, compiled from that folder and never copied.
It shows its state on the 4 button SSD1306 board of `rig/pico/oled/`.

## Build

```sh
rig/pico/firmware/build.sh            # both boards
rig/pico/firmware/build.sh pico       # just the RP2040 one, for the emulator
```

Everything runs in Docker, because this Mac kills native binaries. The first
run builds the image `positron-pico-sdk:2.2.0` from the `Dockerfile` here:
pico-sdk 2.2.0 and picotool 2.2.0, pinned by tag, and Debian's
`gcc-arm-none-eabi` (14.2.1 on 2026-10-04, not pinned). The CMake tree stays in
the container; only the UF2 comes back.

| board | chip | output | UF2 | text | bss |
| --- | --- | --- | --- | --- | --- |
| `pico` | RP2040 | `build-pico/router.uf2` | 43,520 bytes | 25,748 | 11,420 |
| `pico2_w` | RP2350 (Arm) | `build-pico2_w/router.uf2` | 40,448 bytes | 23,996 | 11,032 |

Measured 2026-10-04, `MinSizeRel`. `build-*/` is gitignored.

## Flash

Hold BOOTSEL on the Pico 2 W, plug it in, and drag
`build-pico2_w/router.uf2` onto the `RP2350` drive that appears. It reboots
into the router. The `pico` UF2 is for a plain RP2040 Pico and for the emulator.

## Wiring

| what | pin | note |
| --- | --- | --- |
| MIDI out | GP0 (UART0 TX) | 31250 baud, 8N1 |
| MIDI in | GP1 (UART0 RX) | through an optocoupler, never straight from the socket |
| OLED SDA | GP4 | I2C0, 400 kHz, address 0x3C |
| OLED SCL | GP5 | |
| K1..K4 | GP10..GP13 | to ground, internal pull-ups |

The OLED and keys are wired as `rig/pico/oled/wiring.png` shows.

**The DIN sockets need parts, and none of this was built or measured here.**
MIDI in is a current loop and must be isolated: a 6N139 optocoupler with a
220 ohm resistor and a 1N4148 reverse diode across its input on socket pins 4
and 5, and its output pulled up to 3V3 into GP1. MIDI out at 3.3 V is the
MIDI Association's 3.3 V circuit: socket pin 4 to 3V3 through 33 ohm, pin 5 to
GP0 through 10 ohm. Check both against the MIDI 1.0 electrical spec and the
6N139 datasheet before soldering.

## Keys

| key | does |
| --- | --- |
| K1 | previous scene |
| K2 | next scene |
| K3 | panic: CC 123 (all notes off) on all 16 channels, straight to MIDI out |
| K4 tap | confirm what the gate holds: it goes out whole |
| K4 held 1 s | deny it: it is dropped |

## What it does

Port 0 is DIN in, port 1 is DIN out. Two scenes are compiled in, each one link
from 0 to 1:

| scene | ops |
| --- | --- |
| 1 thru | `channel 1` |
| 2 octave up | `transpose 12`, `channel 2` |

Changing scene is a diff: the old link is unlinked, which makes the core send
a note off for every note it still holds and CC 123 on every channel it played
a note on, and then the new link is made.

Port 1 is a Novation Circuit. SysEx passes, except one that starts
`F0 00 20 29 01 60 01`, a Replace Patch that writes the Circuit's flash. That
one is held until K4, which is vector 09's rule. Unlike vector 09's profile,
clock is allowed.

The screen, 16 characters by 8 lines: `positron router`, the scene, the link,
its ops, the in, out and dropped counters, and `HELD n: K4 ok` while the gate
holds something. `in` counts whole messages and SysEx chunks, `out` everything
sent including panic, `drop` inputs that sent nothing and were not held.

| file | is |
| --- | --- |
| `main.c` | pins, the table, scenes, keys, screen, the UART rings |
| `midi_parse.c` | DIN bytes to messages: running status, real time anywhere, SysEx in chunks of 64 |
| `ssd1306.c` | the display: the micropython-lib init sequence, one page sent per main loop pass |
| `font8x8.h` | MicroPython's petme128 8x8 font, MIT, unchanged |
| `CMakeLists.txt`, `Dockerfile`, `build.sh` | the build |

## The seam for USB MIDI host

Not built. `router_in(port, bytes, len)` in `main.c` takes one whole message
or SysEx chunk from any port, and `emit()` switches on the output port. A USB
host adapter (tinyusb, whose SDK submodule the image leaves out) decodes its
USB-MIDI event packets into whole messages, calls `router_in(PORT_USB_IN, ...)`,
and adds a `PORT_USB_OUT` case to `emit()`. It needs no byte parser.

## In the emulator

`rig/pico/sim/run-router.mjs` boots `build-pico/router.uf2` on rp2040js, feeds
MIDI into UART0 RX, reads UART0 TX, presses the keys, reads the screen back as
text and saves `router-0.png` to `router-5.png`. Exits 1 on any FAIL.

```sh
rig/pico/firmware/build.sh pico && (cd rig/pico/sim && node run-router.mjs)
```

What the emulator does not cover:

- **The RP2350.** rp2040js is RP2040 only. The `pico2_w` UF2 is built from
  the same source and has never run anywhere yet.
- **USB host.** Not built.
- **Real DIN electrical.** The emulated UART has no baud timing and no wire:
  a byte is in the RX FIFO the moment it is fed, so 31250 baud, the
  optocoupler, a framing error and a real FIFO overrun are not exercised. The
  RX interrupt and the rings are, at emulator speed.
- **Key bounce.** The emulated keys switch cleanly; the 20 ms debounce is
  exercised only as a delay.
- **The SSD1306's electrical side**: contrast, charge pump and timing are
  consumed and ignored by the model.
