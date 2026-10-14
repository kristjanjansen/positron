# Kit lessons: pico.mjs

The long comments cut from `demo/shell/pico.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-pico.md#<anchor>`.

<a id="header"></a>

## pico.mjs, file header

demo/shell/pico.mjs: a Raspberry Pi Pico (RP2040) in the page, running a
real UF2, with the 128x64 SSD1306 of rig/pico/oled/ wired to it, its four
keys, and its MIDI UART.

🔴 IT IS rig/pico/sim/ PORTED, NOT REWRITTEN, AND THE PARTS THAT MOVED ARE
THE PARTS NODE CANNOT GIVE A BROWSER. `pico.mjs` there reads the UF2 with
`node:fs`, `ssd1306.mjs` encodes a PNG with `node:zlib`, and both lean on the
`Simulator` wrapper, whose `execute()` runs a million instructions and then
`setTimeout(0)`s itself forever. In a page that is a slice of 10 to 50 ms
nobody chose, on the main thread, with no way to say *stop at this time*. So:
  - the UF2 loader, the SSD1306 model and the screen reader are the same
    code with the Node calls taken out;
  - the run loop is this file's own, `run(untilNanos, deadline)`, which
    stops at an emulated time OR a wall clock deadline, whichever is first,
    so a page can hand it a frame's budget and stay responsive;
  - `WiredI2CTarget` is NOT here. It modelled the pull ups for MicroPython's
    bit banged `i2c.scan()`. The C router never scans and never bit bangs:
    every byte to the display goes through the I2C peripheral.

⚠️ TIME IS THE EMULATOR'S CLOCK. A key held for 1 s is 1 s as the firmware
counts it, however long that takes to emulate. Every instruction is costed at
a flat 125 MHz, as rp2040js does, so nothing cycle exact is claimed.

⚠️ ONE CORE, NO FLASH WRITES, NO USB. rp2040js runs core 0 only and does not
emulate flash erase or program; the router uses neither. The UART has no baud
timing: a byte fed to RX is in the FIFO at once, and a byte written to TX
arrives at `onTx` at once, so 31250 baud is set by the firmware and not
exercised here.

<a id="keys"></a>

## pico.mjs, `KEYS`

K1..K4 on GP10..GP13, to ground, read through the pull up. The words are the
firmware's own footer (main.c `redraw`), and the glyphs are what the kit
draws on the buttons. K4 acts on RELEASE, and held for 1 s it denies instead.

<a id="replace-patch"></a>

## pico.mjs, `REPLACE_PATCH`

A Circuit `Replace Patch`: byte 6 is 01, which on a real Circuit writes a
patch slot in FLASH. The router holds it until K4. Here it is bytes in an
emulated UART and leaves nothing but the page.

<a id="patch-font"></a>

## pico.mjs, `patchFont`

🔴 THE FONT IS ONE BYTE IN FLASH, AND THE PAGE SWITCHES IT BY PATCHING THAT
BYTE BEFORE BOOT. main.c keeps `FONT_PICK[8] = { 'U','I','F','O','N','T',
0xFF, 0 }` in flash, volatile so the compiler reads it, and byte 6 is an
index into UI_FONTS (0xFF keeps the default). The same trick
rig/pico/sim/run-router.mjs uses to shoot every font.
⚠️ IT REFUSES A MARKER FOUND TWICE OR NOT AT ALL, because patching the wrong
one of two would boot a firmware with a byte changed somewhere nobody chose.
@param {Uint8Array} image   from `parseUF2`, not modified
@param {number} index       into UI_FONTS, or 0xFF for the default
@returns {Uint8Array} a patched copy

<a id="patch-keys"></a>

## pico.mjs, `patchKeys`

🔴 WHERE THE KEY LABELS GO IS THE NEXT BYTE, BY THE SAME TRICK. Byte 7 after
UIFONT: 0 a row along the bottom (the default), 1 a column down the right,
which is where the four buttons sit on the 0.96 inch module.
@param {Uint8Array} image   from `parseUF2` or `patchFont`, not modified
@param {'bottom'|'right'} where
@returns {Uint8Array} a patched copy

<a id="fonts-in"></a>

## pico.mjs, `fontsIn`

🔴 THE FONTS ARE READ OUT OF THE FIRMWARE ITSELF, NOT RETYPED FROM ui.c.
Each `ui_font` is `{ const char *name; const uint8_t *glyph; uint8_t w, h,
adv, top, cap; }` in flash, and `UI_FONTS[]` is an array of pointers to
them, in the order FONT_PICK indexes. So the list a page offers and the
glyphs its reader matches against are the bytes the board is running: a
font added to ui.c arrives here with the next UF2 and nothing to edit.
⚠️ IT IS A SEARCH, AND IT SAYS WHAT IT FOUND. A struct is accepted only when
its name pointer lands on a short lower case string, its glyph pointer lands
in flash, and its five sizes are ones a 128x64 font can have; the array is
the longest run of consecutive pointers to accepted structs. `[]` means the
search failed, never that the firmware has no fonts.
@param {Uint8Array} image
@returns {Array<{name:string, index:number, w:number, h:number, adv:number,
                top:number, cap:number, glyph:(code:number)=>number[]}>}

<a id="oled"></a>

## pico.mjs, `Oled`

The SSD1306 on an rp2040js I2C bus: rig/pico/sim/ssd1306.mjs with the PNG
encoder left behind. The part of the datasheet a driver exercises: control
bytes with Co and D/C, 0x20 addressing mode (horizontal, vertical, page),
0x21 and 0x22 ranges, page mode starts, on/off, inverse, entire on, segment
remap, COM scan direction, start line. Contrast, timing, charge pump and
scrolling are consumed with their arguments and otherwise ignored.

<a id="run"></a>

## pico.mjs, `createPico`, `run`

Emulate until the board's clock reaches `untilNanos` or the wall clock
reaches `deadline` (a `performance.now()` value), whichever is first.
Returns true when the board got there.
⚠️ A CORE SITTING IN WFI IS NOT STEPPED, its clock jumps to the next
alarm, which is what makes an idle firmware cheap. The router never
sleeps (its main loop polls), so here every emulated cycle is paid for.

<a id="read-screen"></a>

## pico.mjs, `readScreen`

The screen read back against a font, exactly: rig/pico/sim/run-router.mjs's
reader. A phrase counts as on the panel only when every pixel of its cells
matches, lit on dark or dark on lit (the inverted header, the banner and a
filled footer cell are the second kind). Rows `top .. top+cap-1` of each cell
are compared, the band the capitals live in.
@param {Uint8Array} px  128x64 from `pixels()`
@param {object} F       a font from `fontsIn`

<a id="midi-framer"></a>

## pico.mjs, `createMidiFramer`

Bytes off a UART, gathered into whole MIDI messages for a log. Running
status is followed, a SysEx is one message from F0 to F7, and a real time
byte is its own message wherever it lands. The router sends whole messages,
so this is mostly a counter of three; it is written for any byte stream.
@param {(bytes:number[])=>void} onMessage

<a id="pico-runner"></a>

## pico.mjs, `createPicoRunner`

One board in `pico-worker.mjs`, paced to real time. The page draws what
`onFrame` hands it and sends keys and bytes; it never emulates anything on
its own thread. See that file for why it is a worker and how a key's hold is
kept in board time.
⚠️ NOTHING STARTS UNTIL `boot()`. Constructing this makes a worker and
nothing else, so a page can build its controls on load and pay for the
emulator only when somebody opens it.
@param {object} o
@param {(px:Uint8Array, nanos:number)=>void} [o.onFrame]  each new screen
@param {(bytes:number[])=>void} [o.onTx]     bytes off UART0, in order
@param {(s:object)=>void} [o.onStats]        speed, flatOut, mips, nanos, rx, tx
@param {(font:number|null)=>void} [o.onBoot]

<a id="oled-ui"></a>

## pico.mjs, `createOledUi`

🔴 THE FIRMWARE'S OWN DRAWING CODE, WITHOUT THE FIRMWARE. `rig/pico/firmware/
ui.c` compiled a second time, to WebAssembly (`rig/pico/firmware/wasm/`), so
a page can draw one part of the router's screen at a time: a header, a box,
the key labels. Not a JavaScript copy of ui.c, which would be a second
implementation drifting from the first. `rig/pico/firmware/wasm/test.mjs`
proves the two compilations agree pixel for pixel with the emulated board.
⚠️ THE MODULE IMPORTS NOTHING, so it is instantiated with `{}` and costs no
glue script. Fetch it when it is needed and not on a visit.
@param {ArrayBuffer|Uint8Array} bytes   `/resources/pico/oled-ui.wasm`
@returns {Promise<{fonts:string[], screen:(font:number, paint:(u:object)=>void)=>Uint8Array}>}
 `screen` clears a 128x64 panel in that font (-1 the default), hands
 `paint` the drawing calls, and returns the panel as ones and zeros.

<a id="pico-device"></a>

## pico.mjs, `createPicoDevice`

The emulated Pico as a device, as /synth/dots/ plays it: the rings firmware
(rig/pico/rings/main.c) fetched and booted on the first note or press, MIDI
events in on UART0 RX, every new 128x64 screen out through `onFrame`. Lifted
2026-10-14 from that page for /connect/ (plans/plan-connect-ui.md, the
convergence rule).
⚠️ NOTHING IS FETCHED UNTIL `start()` OR THE FIRST EVENT. Bytes that arrive
while it boots are kept and sent once it is up.
@param {object} [o]
@param {string} [o.uf2]                 the firmware image, our origin
@param {(px: Uint8Array) => void} [o.onFrame]
@param {(state: string) => void} [o.onState]   'loading', 'running' or 'failed'
@param {(line: string, kind?: string) => void} [o.log]
