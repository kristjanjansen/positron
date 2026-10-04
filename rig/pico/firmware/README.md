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
| `pico` | RP2040 | `build-pico/router.uf2` | 53,760 bytes | 30,892 | 11,440 |
| `pico2_w` | RP2350 (Arm) | `build-pico2_w/router.uf2` | 51,200 bytes | 29,256 | 11,056 |

Measured 2026-10-04, `MinSizeRel`, with the screen kit and all six fonts in. `build-*/` is gitignored.

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

## The screen

128x64, drawn with the kit in `ui.c` and read at a glance:

```
 SCENE 2/2          OCTAVE UP     header: an inverted bar, scene and its name
           +12 CH2
 [DIN IN] ----------> [DIN OUT]   the link: two ports, the ops on the arrow
 o IN 3      DROP 1    o OUT 4    a dot per port, lit 150 ms after traffic
 PREV  |  NEXT  |  STOP  |  OK    one cell per button, K1 to K4
```

- **The dots** are a disc for 150 ms after a message in or out and a ring
  otherwise. `IN` counts whole messages and SysEx chunks, `OUT` everything
  sent including panic.
- **`DROP n`** appears between the counts only once something was dropped (an
  input that sent nothing and was not held, such as a note the transpose would
  push past 127), so it reads as an alert and not as furniture.
- **While the gate holds a Replace Patch** the link is replaced by an inverted
  banner `HOLD: REPLACE PATCH`, the line under it reads `TAP OK, HOLD NO`, and
  the K4 cell is filled and reads `OK/NO`. While K4 is down a meter fills
  toward the 1 s deny, with `NO` at its end; letting go before it is full is OK.
- **The footer says the action, not the key.** The module's buttons are
  printed `^ v # *`, and which of those is K1 is not known yet, so the cells
  name what each does in K1 to K4 order.

### The kit, `ui.h`

Immediate mode over the 1 KB buffer `ssd1306.c` sends a page at a time:
nothing is allocated and nothing is retained, a screen is `ui_clear()` and
the calls that describe it. `ui_pixel`, `ui_hline`, `ui_vline`, `ui_rect`,
`ui_fill` (on, off or invert), `ui_text`, `ui_text_c` (lit, dark or inverted),
`ui_text_big` (the current font at 2x), `ui_text_inv`, `ui_header`, `ui_box`,
`ui_arrow`, `ui_meter`, `ui_dot`, `ui_banner` (one or two lines), `ui_footer`
(four cells, any of them filled, a label too wide for its cell cut rather than
run into the rule), and a clip rectangle. Every size comes from the current
font, so the router screen lays itself out in any of them.

### The fonts

| name | cell | source | licence |
| --- | --- | --- | --- |
| `glcd5x7` **default** | 5x8, advance 6 | Adafruit GFX `glcdfont.c`, the classic font | BSD (Adafruit) |
| `misc5x7` | 5x7 | X11 misc-fixed `5x7.bdf`, xorg `font/misc-misc` | public domain |
| `spleen5x8` | 5x8 | Spleen 5x8 2.2.0, Frederic Cambus | BSD 2-Clause |
| `misc4x6` | 4x6 | X11 misc-fixed `4x6.bdf`, xorg `font/misc-misc` | public domain |
| `tomthumb` | 4x6 | Tom Thumb 3x5, as Adafruit GFX `Fonts/TomThumb.h` | BSD 3-Clause |
| `petme8x8` | 8x8 | MicroPython `extmod/font_petme128_8x8.h` | MIT |

Each `font_*.h` carries its URL, the commit it was fetched at, the sha256 of
the fetched file and the licence text. All six were rendered as the real
router screen, normal and held (`rig/pico/sim/router-font-*.png`).
**`glcd5x7` is the default because it reads best at the panel's real size**:
its capitals are 7 pixels (about 1.2 mm on a 0.96 inch panel, against 1.0 mm
for the 5x7 and 5x8 fonts and 0.85 mm for the 4x6 ones) and its letters are 5
wide, so N, M, W, 0 and O stay distinct where the 4 wide fonts close them up.
It still fits everything on one line; the ops move above the arrow. `misc5x7`
and `spleen5x8` are airier and nearly as good. `misc4x6` and `tomthumb` fit
easily and are hard to read at arm's length. `petme8x8` does not fit: the
header drops `SCENE`, the footer is cut to `PRE NEX STO`, the banner takes two
lines and the hint is left out.

The font is picked from a constant in flash, `FONT_PICK` in `main.c`: the
bytes `UIFONT` and then an index into `UI_FONTS` (`0xFF` is the default). A UF2
can be pointed at another font by patching that one byte, which is how the
emulator renders all six from one build. `UI_FONT_DEFAULT` in `ui.c` changes
the default.

| file | is |
| --- | --- |
| `main.c` | pins, the table, scenes, keys, screen, the UART rings |
| `midi_parse.c` | DIN bytes to messages: running status, real time anywhere, SysEx in chunks of 64 |
| `ssd1306.c` | the display: the micropython-lib init sequence, the frame buffer, one page sent per main loop pass |
| `ui.c`, `ui.h` | the drawing kit and the font table |
| `font_*.h`, `font8x8.h` | the six fonts, each with its source and licence |
| `CMakeLists.txt`, `Dockerfile`, `build.sh` | the build |

## The seam for USB MIDI host

Not built. `router_in(port, bytes, len)` in `main.c` takes one whole message
or SysEx chunk from any port, and `emit()` switches on the output port. A USB
host adapter (tinyusb, whose SDK submodule the image leaves out) decodes its
USB-MIDI event packets into whole messages, calls `router_in(PORT_USB_IN, ...)`,
and adds a `PORT_USB_OUT` case to `emit()`. It needs no byte parser.

## In the emulator

`rig/pico/sim/run-router.mjs` boots `build-pico/router.uf2` on rp2040js, feeds
MIDI into UART0 RX, reads UART0 TX, presses the keys, reads the screen back
against the fonts and saves `router-0.png` to `router-6.png`, then
`router-font-<name>.png` and `router-font-<name>-hold.png` once per font.
Exits 1 on any FAIL.

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
