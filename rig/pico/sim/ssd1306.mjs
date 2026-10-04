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
import { deflateSync } from 'node:zlib';
import { I2CMode } from 'rp2040js';

// Commands that carry argument bytes, and how many.
const ARGS = {
  0x20: 1, 0x21: 2, 0x22: 2, 0x81: 1, 0x8d: 1, 0xa8: 1, 0xad: 1, 0xd3: 1,
  0xd5: 1, 0xd9: 1, 0xda: 1, 0xdb: 1, 0xa3: 2, 0x26: 6, 0x27: 6, 0x29: 5, 0x2a: 5,
};

export class SSD1306 {
  constructor(i2c, address = 0x3c) {
    this.address = address;
    this.ram = new Uint8Array(128 * 8); // GDDRAM, 8 pages of 128 column bytes
    this.on = false;
    this.inverse = false;
    this.entireOn = false;
    this.segRemap = false;
    this.comReverse = false;
    this.startLine = 0;
    this.mode = 2; // page addressing is the reset default
    this.col = 0; this.colStart = 0; this.colEnd = 127;
    this.page = 0; this.pageStart = 0; this.pageEnd = 7;
    this.frames = 0; // completed data transactions, which is one show() each
    this.listeners = [];
    this.#attach(i2c);
  }

  // Resolves after the next transaction that wrote display data finishes.
  nextFrame() {
    return new Promise((resolve) => this.listeners.push(resolve));
  }

  #attach(i2c) {
    let mine = false;
    let control = null; // null: the next byte is a control byte
    // A command being collected with its arguments. It survives the end of a
    // transaction: micropython-lib sends every byte, arguments included, in its
    // own two byte write (0x80, byte), so 0x20 and its 0x00 arrive apart.
    const cmd = [];
    let wroteData = false;
    i2c.onStart = () => i2c.completeStart();
    i2c.onConnect = (address, mode) => {
      mine = address === this.address && mode === I2CMode.Write;
      control = null;
      // A read from 0x3C is not modelled: NACK it like an empty address.
      i2c.completeConnect(mine);
    };
    i2c.onWriteByte = (value) => {
      if (!mine) return i2c.completeWrite(false);
      if (control === null) {
        control = value;
      } else {
        const co = control & 0x80;
        if (control & 0x40) { this.#data(value); wroteData = true; }
        else this.#command(cmd, value);
        if (co) control = null; // Co=1: one byte, then a new control byte
      }
      i2c.completeWrite(true);
    };
    i2c.onReadByte = () => i2c.completeRead(0xff);
    i2c.onStop = () => {
      i2c.completeStop();
      if (mine && wroteData) {
        wroteData = false;
        this.frames++;
        const waiting = this.listeners;
        this.listeners = [];
        for (const resolve of waiting) resolve(this.frames);
      }
      mine = false;
    };
  }

  #command(cmd, value) {
    cmd.push(value);
    const need = ARGS[cmd[0]] ?? 0;
    if (cmd.length <= need) return;
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
    this.ram[this.page * 128 + this.col] = value;
    if (this.mode === 0) { // horizontal: column first, wrap to the next page
      if (this.col >= this.colEnd) {
        this.col = this.colStart;
        this.page = this.page >= this.pageEnd ? this.pageStart : this.page + 1;
      } else this.col++;
    } else if (this.mode === 1) { // vertical: page first, wrap to the next column
      if (this.page >= this.pageEnd) {
        this.page = this.pageStart;
        this.col = this.col >= this.colEnd ? this.colStart : this.col + 1;
      } else this.page++;
    } else { // page mode: the column advances and stays on its page
      this.col = (this.col + 1) & 127;
    }
  }

  // The panel as the eye sees it: 128x64, 1 lit, 0 dark. The usual module is
  // wired so that A1 + C8 (what every driver sends) reads upright, which is why
  // those two settings map RAM straight across.
  pixels() {
    const out = new Uint8Array(128 * 64);
    if (!this.on) return out;
    for (let y = 0; y < 64; y++) {
      const row = (this.comReverse ? y : 63 - y);
      const line = (row + this.startLine) & 63;
      for (let x = 0; x < 128; x++) {
        const col = this.segRemap ? x : 127 - x;
        let lit = (this.ram[(line >> 3) * 128 + col] >> (line & 7)) & 1;
        if (this.entireOn) lit = 1;
        if (this.inverse) lit ^= 1;
        out[y * 128 + x] = lit;
      }
    }
    return out;
  }

  // A PNG of the panel, scaled, lit pixels in the blue of the common module.
  png(scale = 4) {
    return encodePNG(this.pixels(), 128, 64, scale);
  }

  // The panel as text, one character per pixel, for a log or a test.
  ascii() {
    const p = this.pixels();
    let s = '';
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 128; x++) s += p[y * 128 + x] ? '#' : '.';
      s += '\n';
    }
    return s;
  }
}

const LIT = [0x4f, 0xc3, 0xff]; // the cyan-blue of a blue SSD1306
const DARK = [0x05, 0x07, 0x0c]; // an unlit panel is not quite black

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// 8 bit RGB, no alpha. A one pixel dark gap between scaled pixels would look
// more like the panel, and is left out so the image stays exact.
export function encodePNG(pixels, width, height, scale) {
  const W = width * scale, H = height * scale;
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let Y = 0; Y < H; Y++) {
    const rowStart = Y * (W * 3 + 1);
    raw[rowStart] = 0; // filter: none
    const y = Math.floor(Y / scale);
    for (let X = 0; X < W; X++) {
      const c = pixels[y * width + Math.floor(X / scale)] ? LIT : DARK;
      raw.set(c, rowStart + 1 + X * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
