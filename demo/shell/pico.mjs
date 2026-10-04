// demo/shell/pico.mjs: a Raspberry Pi Pico (RP2040) in the page, running a
// real UF2, with the 128x64 SSD1306 of rig/pico/oled/ wired to it, its four
// keys, and its MIDI UART.
//
// 🔴 IT IS rig/pico/sim/ PORTED, NOT REWRITTEN, AND THE PARTS THAT MOVED ARE
// THE PARTS NODE CANNOT GIVE A BROWSER. `pico.mjs` there reads the UF2 with
// `node:fs`, `ssd1306.mjs` encodes a PNG with `node:zlib`, and both lean on the
// `Simulator` wrapper, whose `execute()` runs a million instructions and then
// `setTimeout(0)`s itself forever. In a page that is a slice of 10 to 50 ms
// nobody chose, on the main thread, with no way to say *stop at this time*. So:
//   - the UF2 loader, the SSD1306 model and the screen reader are the same
//     code with the Node calls taken out;
//   - the run loop is this file's own, `run(untilNanos, deadline)`, which
//     stops at an emulated time OR a wall clock deadline, whichever is first,
//     so a page can hand it a frame's budget and stay responsive;
//   - `WiredI2CTarget` is NOT here. It modelled the pull ups for MicroPython's
//     bit banged `i2c.scan()`. The C router never scans and never bit bangs:
//     every byte to the display goes through the I2C peripheral.
//
// ⚠️ TIME IS THE EMULATOR'S CLOCK. A key held for 1 s is 1 s as the firmware
// counts it, however long that takes to emulate. Every instruction is costed at
// a flat 125 MHz, as rp2040js does, so nothing cycle exact is claimed.
//
// ⚠️ ONE CORE, NO FLASH WRITES, NO USB. rp2040js runs core 0 only and does not
// emulate flash erase or program; the router uses neither. The UART has no baud
// timing: a byte fed to RX is in the FIFO at once, and a byte written to TX
// arrives at `onTx` at once, so 31250 baud is set by the firmware and not
// exercised here.
import { RP2040, SimulationClock, I2CMode, ConsoleLogger, LogLevel } from './vendor/rp2040js.mjs';
import { bootromB1 } from './vendor/pico-bootrom.mjs';

export const W = 128, H = 64;
const FLASH_START = 0x10000000;
const UF2_MAGIC = [0x0a324655, 0x9e5d5157, 0x0ab16f30];
const CYCLE_NS = 1e9 / 125e6;          // what rp2040js's own Simulator charges

/**
 * K1..K4 on GP10..GP13, to ground, read through the pull up. The words are the
 * firmware's own footer (main.c `redraw`), and the glyphs are what the kit
 * draws on the buttons. K4 acts on RELEASE, and held for 1 s it denies instead.
 */
export const KEYS = [
  { k: 1, pin: 10, glyph: '^', does: 'PREV' },
  { k: 2, pin: 11, glyph: 'v', does: 'NEXT' },
  { k: 3, pin: 12, glyph: '#', does: 'STOP' },
  { k: 4, pin: 13, glyph: '*', does: 'OK' },
];
export const DENY_HOLD_MS = 1000;      // main.c DENY_HOLD_MS
export const DEBOUNCE_MS = 20;         // main.c DEBOUNCE_MS

/**
 * A Circuit `Replace Patch`: byte 6 is 01, which on a real Circuit writes a
 * patch slot in FLASH. The router holds it until K4. Here it is bytes in an
 * emulated UART and leaves nothing but the page.
 */
export const REPLACE_PATCH = [0xF0, 0x00, 0x20, 0x29, 0x01, 0x60, 0x01, 0x05,
  0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0xF7];

/** The font the firmware draws in when nobody patched it: ui.c `UI_FONT_DEFAULT`. */
export const DEFAULT_FONT = 'glcd5x7';

// ── the UF2 ─────────────────────────────────────────────────────────────────

/**
 * UF2 is 512 byte blocks: magic, flags, target address, payload size, payload
 * at offset 32. Returns the flash image the blocks describe, from 0x10000000.
 * @param {ArrayBuffer|Uint8Array} bytes
 * @returns {Uint8Array}
 */
export function parseUF2(bytes) {
  const file = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const parts = [];
  let end = 0;
  for (let off = 0; off + 512 <= file.length; off += 512) {
    const v = new DataView(file.buffer, file.byteOffset + off, 512);
    if (v.getUint32(0, true) !== UF2_MAGIC[0] || v.getUint32(4, true) !== UF2_MAGIC[1]
        || v.getUint32(508, true) !== UF2_MAGIC[2]) continue;
    const at = v.getUint32(12, true) - FLASH_START;
    const size = v.getUint32(16, true);
    if (at < 0 || size > 476) continue;
    parts.push([at, file.subarray(off + 32, off + 32 + size)]);
    end = Math.max(end, at + size);
  }
  if (!parts.length) throw new Error('not a UF2: no block carries the UF2 magic');
  const image = new Uint8Array(end).fill(0xff);   // erased flash reads 0xFF
  for (const [at, data] of parts) image.set(data, at);
  return image;
}

/**
 * 🔴 THE FONT IS ONE BYTE IN FLASH, AND THE PAGE SWITCHES IT BY PATCHING THAT
 * BYTE BEFORE BOOT. main.c keeps `FONT_PICK[8] = { 'U','I','F','O','N','T',
 * 0xFF, 0 }` in flash, volatile so the compiler reads it, and byte 6 is an
 * index into UI_FONTS (0xFF keeps the default). The same trick
 * rig/pico/sim/run-router.mjs uses to shoot every font.
 * ⚠️ IT REFUSES A MARKER FOUND TWICE OR NOT AT ALL, because patching the wrong
 * one of two would boot a firmware with a byte changed somewhere nobody chose.
 * @param {Uint8Array} image   from `parseUF2`, not modified
 * @param {number} index       into UI_FONTS, or 0xFF for the default
 * @returns {Uint8Array} a patched copy
 */
export function patchFont(image, index) {
  const at = findAscii(image, 'UIFONT');
  if (at < 0 || findAscii(image, 'UIFONT', at + 1) >= 0) {
    throw new Error('the FONT_PICK marker UIFONT is not in this image exactly once');
  }
  const out = image.slice();
  out[at + 6] = index;
  return out;
}

function findAscii(bytes, text, from = 0) {
  const want = [...text].map((c) => c.charCodeAt(0));
  outer: for (let i = from; i + want.length <= bytes.length; i++) {
    for (let j = 0; j < want.length; j++) if (bytes[i + j] !== want[j]) continue outer;
    return i;
  }
  return -1;
}

/**
 * 🔴 THE FONTS ARE READ OUT OF THE FIRMWARE ITSELF, NOT RETYPED FROM ui.c.
 * Each `ui_font` is `{ const char *name; const uint8_t *glyph; uint8_t w, h,
 * adv, top, cap; }` in flash, and `UI_FONTS[]` is an array of pointers to
 * them, in the order FONT_PICK indexes. So the list a page offers and the
 * glyphs its reader matches against are the bytes the board is running: a
 * font added to ui.c arrives here with the next UF2 and nothing to edit.
 * ⚠️ IT IS A SEARCH, AND IT SAYS WHAT IT FOUND. A struct is accepted only when
 * its name pointer lands on a short lower case string, its glyph pointer lands
 * in flash, and its five sizes are ones a 128x64 font can have; the array is
 * the longest run of consecutive pointers to accepted structs. `[]` means the
 * search failed, never that the firmware has no fonts.
 * @param {Uint8Array} image
 * @returns {Array<{name:string, index:number, w:number, h:number, adv:number,
 *                  top:number, cap:number, glyph:(code:number)=>number[]}>}
 */
export function fontsIn(image) {
  const u32 = (o) => (image[o] | (image[o + 1] << 8) | (image[o + 2] << 16) | (image[o + 3] << 24)) >>> 0;
  const inFlash = (p) => p >= FLASH_START && p < FLASH_START + image.length;
  const nameAt = (p) => {
    let s = '';
    for (let o = p - FLASH_START; o < image.length && s.length < 16; o++) {
      const c = image[o];
      if (c === 0) return s.length >= 3 ? s : null;
      if (!((c >= 0x61 && c <= 0x7a) || (c >= 0x30 && c <= 0x39))) return null;
      s += String.fromCharCode(c);
    }
    return null;
  };
  const structs = new Map();             // address -> font
  for (let o = 0; o + 16 <= image.length; o += 4) {
    const np = u32(o), gp = u32(o + 4);
    if (!inFlash(np) || !inFlash(gp)) continue;
    const [w, h, adv, top, cap] = image.subarray(o + 8, o + 13);
    if (!(w >= 3 && w <= 8 && h >= 5 && h <= 8 && adv >= w && adv <= 9 && top < h && cap >= 4 && cap <= h)) continue;
    const name = nameAt(np);
    if (!name) continue;
    const g = gp - FLASH_START;
    if (g + 95 * w > image.length) continue;
    const table = image.slice(g, g + 95 * w);
    structs.set(FLASH_START + o, {
      name, w, h, adv, top, cap,
      glyph: (code) => {
        const i = code >= 32 && code <= 126 ? code - 32 : 0;
        return [...table.subarray(i * w, i * w + w)];
      },
    });
  }
  let best = [];
  for (let o = 0; o + 4 <= image.length; o += 4) {
    const run = [];
    for (let p = o; p + 4 <= image.length && structs.has(u32(p)); p += 4) run.push(structs.get(u32(p)));
    if (run.length > best.length) best = run;
    if (run.length) o += (run.length - 1) * 4;
  }
  return best.length >= 2 ? best.map((f, index) => ({ ...f, index })) : [];
}

// ── the display ─────────────────────────────────────────────────────────────

// Commands that carry argument bytes, and how many.
const ARGS = {
  0x20: 1, 0x21: 2, 0x22: 2, 0x81: 1, 0x8d: 1, 0xa8: 1, 0xad: 1, 0xd3: 1,
  0xd5: 1, 0xd9: 1, 0xda: 1, 0xdb: 1, 0xa3: 2, 0x26: 6, 0x27: 6, 0x29: 5, 0x2a: 5,
};

/**
 * The SSD1306 on an rp2040js I2C bus: rig/pico/sim/ssd1306.mjs with the PNG
 * encoder left behind. The part of the datasheet a driver exercises: control
 * bytes with Co and D/C, 0x20 addressing mode (horizontal, vertical, page),
 * 0x21 and 0x22 ranges, page mode starts, on/off, inverse, entire on, segment
 * remap, COM scan direction, start line. Contrast, timing, charge pump and
 * scrolling are consumed with their arguments and otherwise ignored.
 */
export class Oled {
  constructor(i2c, address = 0x3c) {
    this.address = address;
    this.ram = new Uint8Array(W * 8);   // GDDRAM, 8 pages of 128 column bytes
    this.on = false; this.inverse = false; this.entireOn = false;
    this.segRemap = false; this.comReverse = false; this.startLine = 0;
    this.mode = 2;                       // page addressing is the reset default
    this.col = 0; this.colStart = 0; this.colEnd = 127;
    this.page = 0; this.pageStart = 0; this.pageEnd = 7;
    /** Transactions that wrote display data. One page write each on the router. */
    this.writes = 0;
    this.#attach(i2c);
  }

  #attach(i2c) {
    let mine = false, control = null, wrote = false;
    const cmd = [];
    i2c.onStart = () => i2c.completeStart();
    i2c.onConnect = (address, mode) => {
      mine = address === this.address && mode === I2CMode.Write;
      control = null;
      i2c.completeConnect(mine);         // a read from 0x3C is not modelled
    };
    i2c.onWriteByte = (value) => {
      if (!mine) return i2c.completeWrite(false);
      if (control === null) control = value;
      else {
        if (control & 0x40) { this.#data(value); wrote = true; } else this.#command(cmd, value);
        if (control & 0x80) control = null;   // Co=1: one byte, then a control byte
      }
      i2c.completeWrite(true);
    };
    i2c.onReadByte = () => i2c.completeRead(0xff);
    i2c.onStop = () => {
      i2c.completeStop();
      if (mine && wrote) { wrote = false; this.writes++; }
      mine = false;
    };
  }

  #command(cmd, value) {
    cmd.push(value);
    if (cmd.length <= (ARGS[cmd[0]] ?? 0)) return;
    const [op, a, b] = cmd;
    cmd.length = 0;
    if (op === 0x20) this.mode = a & 3;
    else if (op === 0x21) { this.colStart = a & 127; this.colEnd = b & 127; this.col = this.colStart; }
    else if (op === 0x22) { this.pageStart = a & 7; this.pageEnd = b & 7; this.page = this.pageStart; }
    else if (op >= 0xb0 && op <= 0xb7) this.page = op & 7;
    else if (op <= 0x0f) this.col = (this.col & 0xf0) | op;
    else if (op >= 0x10 && op <= 0x1f) this.col = (this.col & 0x0f) | ((op & 0x0f) << 4);
    else if (op >= 0x40 && op <= 0x7f) this.startLine = op & 63;
    else if (op === 0xae || op === 0xaf) this.on = op === 0xaf;
    else if (op === 0xa6 || op === 0xa7) this.inverse = op === 0xa7;
    else if (op === 0xa4 || op === 0xa5) this.entireOn = op === 0xa5;
    else if (op === 0xa0 || op === 0xa1) this.segRemap = op === 0xa1;
    else if (op === 0xc0 || op === 0xc8) this.comReverse = op === 0xc8;
  }

  #data(value) {
    this.ram[this.page * W + this.col] = value;
    if (this.mode === 0) {               // horizontal: column first, then the next page
      if (this.col >= this.colEnd) {
        this.col = this.colStart;
        this.page = this.page >= this.pageEnd ? this.pageStart : this.page + 1;
      } else this.col++;
    } else if (this.mode === 1) {        // vertical: page first, then the next column
      if (this.page >= this.pageEnd) {
        this.page = this.pageStart;
        this.col = this.col >= this.colEnd ? this.colStart : this.col + 1;
      } else this.page++;
    } else this.col = (this.col + 1) & 127;
  }

  /**
   * The panel as the eye sees it, 128x64, 1 lit and 0 dark. The usual module
   * is wired so A1 + C8 (what every driver sends) reads upright.
   * @param {Uint8Array} [out] reused when given
   */
  pixels(out = new Uint8Array(W * H)) {
    if (!this.on) { out.fill(0); return out; }
    for (let y = 0; y < H; y++) {
      const line = ((this.comReverse ? y : 63 - y) + this.startLine) & 63;
      for (let x = 0; x < W; x++) {
        const col = this.segRemap ? x : 127 - x;
        let lit = (this.ram[(line >> 3) * W + col] >> (line & 7)) & 1;
        if (this.entireOn) lit = 1;
        if (this.inverse) lit ^= 1;
        out[y * W + x] = lit;
      }
    }
    return out;
  }
}

// ── the board ───────────────────────────────────────────────────────────────

/**
 * One emulated Pico running `image`. Nothing runs until `run()` is called:
 * this constructs a chip and loads two ROMs, which is cheap, and spends no
 * time emulating.
 * @param {object} o
 * @param {Uint8Array} o.image       a flash image from `parseUF2` (or `patchFont`)
 * @param {(b:number)=>void} [o.onTx] each byte UART0 sends, the DIN MIDI out
 */
export function createPico({ image, onTx = () => {} }) {
  const clock = new SimulationClock();
  const mcu = new RP2040(clock);
  mcu.logger = new ConsoleLogger(LogLevel.Error);
  mcu.loadBootrom(bootromB1);
  if (image.length > mcu.flash.length) throw new Error(`the image is ${image.length} bytes and flash is ${mcu.flash.length}`);
  mcu.flash.set(image, 0);
  const oled = new Oled(mcu.i2c[0], 0x3c);
  for (const { pin } of KEYS) mcu.gpio[pin].setInputValue(true);   // released reads high
  const uart = mcu.uart[0];
  const rx = [];
  let txCount = 0, rxCount = 0, instructions = 0;
  uart.onByte = (b) => { txCount++; onTx(b); };
  mcu.core.PC = FLASH_START;           // boot2 sits at the start of the image

  const feed = () => {
    while (rx.length && !uart.rxFIFO.full) { uart.feedByte(rx.shift()); rxCount++; }
  };

  const board = {
    mcu, oled, clock,
    /** emulated nanoseconds since power on */
    get nanos() { return clock.nanos; },
    get ms() { return clock.nanos / 1e6; },
    get instructions() { return instructions; },
    get txCount() { return txCount; },
    get rxCount() { return rxCount; },
    /** bytes waiting for room in UART0's 32 byte RX FIFO */
    get rxWaiting() { return rx.length; },

    /**
     * Emulate until the board's clock reaches `untilNanos` or the wall clock
     * reaches `deadline` (a `performance.now()` value), whichever is first.
     * Returns true when the board got there.
     * ⚠️ A CORE SITTING IN WFI IS NOT STEPPED, its clock jumps to the next
     * alarm, which is what makes an idle firmware cheap. The router never
     * sleeps (its main loop polls), so here every emulated cycle is paid for.
     */
    run(untilNanos, deadline = Infinity) {
      const core = mcu.core;
      while (clock.nanos < untilNanos) {
        if (rx.length) feed();
        for (let i = 0; i < 4000 && clock.nanos < untilNanos; i++) {
          if (core.waiting) {
            const next = clock.nanosToNextAlarm, left = untilNanos - clock.nanos;
            if (next > 0 && next <= left) { clock.tick(next); continue; }
            if (rx.length && !uart.rxFIFO.full) break;      // feed, which wakes it
            clock.tick(left);
            break;
          }
          clock.tick(core.executeInstruction() * CYCLE_NS);
          instructions++;
        }
        if (performance.now() >= deadline) return clock.nanos >= untilNanos;
      }
      return true;
    },

    /** Emulate `ms` more milliseconds of board time, yielding to the page between slices. */
    async sleep(ms, sliceMs = 12) {
      const until = clock.nanos + ms * 1e6;
      while (!board.run(until, performance.now() + sliceMs)) {
        await new Promise((r) => setTimeout(r, 0));
      }
    },

    /** Key k (1..4) down or up. Down connects the pin to ground. */
    key(k, down) {
      const spec = KEYS[k - 1];
      if (!spec) throw new Error(`there is no key ${k}; the board has K1 to K4`);
      mcu.gpio[spec.pin].setInputValue(!down);
    },

    /** Bytes into UART0 RX, the DIN MIDI in. They enter as the FIFO has room. */
    send(bytes) { for (const b of bytes) rx.push(b & 0xff); feed(); },

    /** The panel as 128x64 ones and zeros. */
    pixels(out) { return oled.pixels(out); },
  };
  return board;
}

// ── reading the screen ──────────────────────────────────────────────────────

/**
 * The screen read back against a font, exactly: rig/pico/sim/run-router.mjs's
 * reader. A phrase counts as on the panel only when every pixel of its cells
 * matches, lit on dark or dark on lit (the inverted header, the banner and a
 * filled footer cell are the second kind). Rows `top .. top+cap-1` of each cell
 * are compared, the band the capitals live in.
 * @param {Uint8Array} px  128x64 from `pixels()`
 * @param {object} F       a font from `fontsIn`
 */
export function readScreen(px, F) {
  const rows = F.top + F.cap;
  const mask = (1 << rows) - 1;
  const col = (x, y) => { let b = 0; for (let j = 0; j < rows; j++) b |= px[(y + j) * W + x] << j; return b; };
  const cols = (s) => {
    const out = [];
    for (const ch of s) {
      const g = F.glyph(ch.charCodeAt(0));
      for (let i = 0; i < F.adv; i++) out.push(i < F.w ? g[i] & mask : 0);
    }
    return out;
  };
  /** Every place `text` is drawn, as { x, y (top of its capitals), inv }. */
  function find(text) {
    const want = cols(text).slice(0, text.length * F.adv - 1), hits = [];   // no trailing gap
    for (let y = 0; y + rows <= H; y++) {
      for (let x = 0; x + want.length <= W; x++) {
        for (const inv of [false, true]) {
          let ok = true;
          for (let i = 0; i < want.length && ok; i++) ok = col(x + i, y) === (inv ? ~want[i] & mask : want[i]);
          if (ok) hits.push({ x, y: y + F.top, inv });
        }
      }
    }
    return hits;
  }
  const lit = (x, y) => px[y * W + x];
  /** How much of the header band is lit, 0..1. ui_header fills cap + 4 rows. */
  const headerLit = () => {
    let n = 0;
    for (let y = 0; y < F.cap + 4; y++) for (let x = 0; x < W; x++) n += lit(x, y);
    return n / (W * (F.cap + 4));
  };
  return {
    find,
    headerLit,
    has: (t, inv) => find(t).some((h) => inv === undefined || h.inv === inv),
    at: (t, inv) => find(t).find((h) => inv === undefined || h.inv === inv),
  };
}

/** How many pixels are lit. */
export const litCount = (px) => { let n = 0; for (let i = 0; i < px.length; i++) n += px[i]; return n; };

// ── MIDI out of the UART, as messages ───────────────────────────────────────

/**
 * Bytes off a UART, gathered into whole MIDI messages for a log. Running
 * status is followed, a SysEx is one message from F0 to F7, and a real time
 * byte is its own message wherever it lands. The router sends whole messages,
 * so this is mostly a counter of three; it is written for any byte stream.
 * @param {(bytes:number[])=>void} onMessage
 */
export function createMidiFramer(onMessage) {
  let msg = [], need = 0, status = 0;
  const len = (s) => {
    const hi = s & 0xf0;
    if (hi === 0xc0 || hi === 0xd0) return 2;
    if (hi >= 0x80 && hi <= 0xe0) return 3;
    if (s === 0xf1 || s === 0xf3) return 2;
    if (s === 0xf2) return 3;
    return 1;
  };
  return (b) => {
    if (b >= 0xf8) { onMessage([b]); return; }
    if (b === 0xf0) { msg = [b]; need = Infinity; status = 0; return; }
    if (b === 0xf7) { if (need === Infinity) { msg.push(b); onMessage(msg); } msg = []; need = 0; return; }
    if (need === Infinity) { msg.push(b); return; }
    if (b & 0x80) {
      status = b < 0xf0 ? b : 0;
      msg = [b]; need = len(b);
      if (need === 1) { onMessage(msg); msg = []; need = 0; }
      return;
    }
    if (!msg.length && status) { msg = [status]; need = len(status); }
    if (!msg.length) return;           // a data byte with nothing to belong to
    msg.push(b);
    if (msg.length >= need) { onMessage(msg); msg = []; need = 0; }
  };
}

// ── the board in a worker, for a page ───────────────────────────────────────

/**
 * One board in `pico-worker.mjs`, paced to real time. The page draws what
 * `onFrame` hands it and sends keys and bytes; it never emulates anything on
 * its own thread. See that file for why it is a worker and how a key's hold is
 * kept in board time.
 * ⚠️ NOTHING STARTS UNTIL `boot()`. Constructing this makes a worker and
 * nothing else, so a page can build its controls on load and pay for the
 * emulator only when somebody opens it.
 * @param {object} o
 * @param {(px:Uint8Array, nanos:number)=>void} [o.onFrame]  each new screen
 * @param {(bytes:number[])=>void} [o.onTx]     bytes off UART0, in order
 * @param {(s:object)=>void} [o.onStats]        speed, flatOut, mips, nanos, rx, tx
 * @param {(font:number|null)=>void} [o.onBoot]
 */
export function createPicoRunner({ onFrame, onTx, onStats, onBoot } = {}) {
  let worker = null;
  let frames = 0;
  const ensure = () => {
    if (worker) return worker;
    worker = new Worker(new URL('./pico-worker.mjs', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data: m }) => {
      if (m.type === 'frame') { frames++; onFrame?.(m.px, m.nanos); }
      else if (m.type === 'tx') onTx?.(m.bytes);
      else if (m.type === 'stats') onStats?.(m);
      else if (m.type === 'booted') onBoot?.(m.font);
    };
    worker.onerror = (e) => console.warn('pico worker:', e.message || e);
    return worker;
  };
  return {
    /** Load `image` and start it (or keep it paused with `run: false`). */
    boot(image, { font = null, run = true } = {}) { ensure().postMessage({ type: 'boot', image, font, run }); },
    run(on) { worker?.postMessage({ type: 'run', on: !!on }); },
    key(k, down, heldMs = 0) { worker?.postMessage({ type: 'key', k, down: !!down, heldMs }); },
    send(bytes) { worker?.postMessage({ type: 'send', bytes: [...bytes] }); },
    get started() { return !!worker; },
    get frames() { return frames; },
    close() { worker?.terminate(); worker = null; },
  };
}

export const hex = (bytes) => [...bytes].map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
