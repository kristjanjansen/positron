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
import { readFileSync } from 'node:fs';
import { Simulator, USBCDC, ConsoleLogger, LogLevel } from 'rp2040js';
import { SSD1306 } from './ssd1306.mjs';

const FLASH_START = 0x10000000;
const UF2_MAGIC = [0x0a324655, 0x9e5d5157, 0x0ab16f30];
export const KEYS = [10, 11, 12, 13]; // K1..K4

// UF2 is 512 byte blocks: magic, flags, target address, payload size, payload
// at offset 32. Decoded here so the only dependency is rp2040js itself.
function loadUF2(path, mcu) {
  const file = readFileSync(path);
  for (let off = 0; off + 512 <= file.length; off += 512) {
    const v = new DataView(file.buffer, file.byteOffset + off, 512);
    if (v.getUint32(0, true) !== UF2_MAGIC[0] || v.getUint32(4, true) !== UF2_MAGIC[1]) continue;
    const addr = v.getUint32(12, true);
    const size = v.getUint32(16, true);
    mcu.flash.set(file.subarray(off + 32, off + 32 + size), addr - FLASH_START);
  }
}

// The I2C bus as wires, for the one transfer MicroPython does NOT send through
// the I2C peripheral. ports/rp2/machine_i2c.c answers a zero length write by
// bit-banging the pins as SIO GPIO ("Workaround issue with hardware I2C not
// accepting zero-length writes"), and i2c.scan() is nothing but zero length
// writes. rp2040js has no wires between pins, and a pin reads back only what
// setInputValue last put there, so without this the scan reads [] while the
// hardware path to the same display works. This models the pull-ups (a line is
// high unless somebody drives it low) and a target that ACKs its address.
class WiredI2CTarget {
  constructor(mcu, sdaPin, sclPin, address, onByte = () => {}) {
    this.sda = mcu.gpio[sdaPin];
    this.scl = mcu.gpio[sclPin];
    this.address = address;
    this.onByte = onByte;
    this.holdSda = false; // the target pulling SDA low
    this.lastSda = 1;
    this.lastScl = 1;
    this.state = 'idle'; // idle, addr, data, ignore
    this.bit = 0;
    this.byte = 0;
    this.sda.addListener(() => this.update());
    this.scl.addListener(() => this.update());
    this.update();
  }

  // Open drain with a pull-up: low only while the SIO drives the pin low.
  static pulled(pin) {
    return pin.functionSelect === 5 && pin.outputEnable && !pin.outputValue ? 0 : 1;
  }

  update() {
    const scl = WiredI2CTarget.pulled(this.scl);
    let sda = WiredI2CTarget.pulled(this.sda) && !this.holdSda ? 1 : 0;
    if (scl && this.lastScl && sda !== this.lastSda) {
      if (!sda) { this.state = 'addr'; this.bit = 0; this.byte = 0; } // START
      else { this.state = 'idle'; this.holdSda = false; } // STOP
    } else if (scl && !this.lastScl && this.state !== 'idle' && this.state !== 'ignore') {
      if (this.bit < 8) this.byte = (this.byte << 1) | sda; // sample on rising SCL
      this.bit++; // 1..8 data clocks, 9 the ACK clock
    } else if (!scl && this.lastScl && this.state !== 'idle' && this.state !== 'ignore') {
      if (this.bit === 8) { // falling edge after bit 8: ACK or not
        const ack = this.state === 'addr'
          ? (this.byte >> 1) === this.address && !(this.byte & 1)
          : true;
        if (this.state === 'data') this.onByte(this.byte);
        this.holdSda = ack;
        if (this.state === 'addr' && !ack) this.state = 'ignore';
      } else if (this.bit === 9) { // falling edge after the ACK clock
        this.holdSda = false;
        this.state = 'data';
        this.bit = 0;
        this.byte = 0;
      }
    }
    sda = WiredI2CTarget.pulled(this.sda) && !this.holdSda ? 1 : 0;
    this.lastScl = scl;
    this.lastSda = sda;
    this.scl.setInputValue(!!scl);
    this.sda.setInputValue(!!sda);
  }
}

export class Pico {
  constructor({ uf2, bootrom }) {
    this.sim = new Simulator();
    this.mcu = this.sim.rp2040;
    this.mcu.loadBootrom(bootrom);
    this.mcu.logger = new ConsoleLogger(LogLevel.Error);
    loadUF2(uf2, this.mcu);

    this.oled = new SSD1306(this.mcu.i2c[0], 0x3c);
    this.wires = new WiredI2CTarget(this.mcu, 4, 5, 0x3c); // GP4 SDA, GP5 SCL
    for (const n of KEYS) this.mcu.gpio[n].setInputValue(true); // pulled up

    this.serial = ''; // everything the board has printed
    this.queue = []; // bytes waiting for room in the CDC FIFO
    this.waiters = [];
    this.cdc = new USBCDC(this.mcu.usbCtrl);
    this.connected = new Promise((r) => { this.cdc.onDeviceConnected = r; });
    this.cdc.onSerialData = (buf) => {
      this.serial += Buffer.from(buf).toString('latin1');
      this.#check();
    };
    // The CDC FIFO holds 512 bytes. Feed it between execution slices, which the
    // simulator yields with setTimeout(0), so a long paste is never dropped.
    this.pump = setInterval(() => {
      const fifo = this.cdc.txFIFO;
      while (this.queue.length && !fifo.full) this.cdc.sendSerialByte(this.queue.shift());
      this.#check();
    }, 0);
  }

  get nanos() { return this.sim.clock.nanos; }
  get ms() { return this.nanos / 1e6; }

  boot() {
    this.mcu.core.PC = FLASH_START;
    this.sim.execute();
    return this.connected;
  }

  stop() {
    clearInterval(this.pump);
    this.sim.stop();
  }

  write(data) {
    for (const b of Buffer.from(data, 'latin1')) this.queue.push(b);
  }

  // Resolves with the serial text once `text` has appeared after `from`.
  until(text, { from = 0, timeoutMs = 60000 } = {}) {
    return this.#wait(() => {
      const i = this.serial.indexOf(text, from);
      return i < 0 ? undefined : i + text.length;
    }, `serial text ${JSON.stringify(text)}`, timeoutMs);
  }

  // Resolves once the emulated clock has advanced `ms` milliseconds.
  sleep(ms) {
    const target = this.nanos + ms * 1e6;
    return this.#wait(() => (this.nanos >= target ? true : undefined), `${ms} ms of emulated time`, 600000);
  }

  // Resolves with the next completed frame on the display.
  frame(timeoutMs = 60000) {
    return Promise.race([
      this.oled.nextFrame(),
      new Promise((_, rej) => setTimeout(() => rej(new Error(`no frame in ${timeoutMs} ms wall time`)), timeoutMs).unref()),
    ]);
  }

  #wait(test, what, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${what}`)), timeoutMs);
      timer.unref();
      this.waiters.push({ test, resolve: (v) => { clearTimeout(timer); resolve(v); } });
      this.#check();
    });
  }

  #check() {
    this.waiters = this.waiters.filter((w) => {
      const v = w.test();
      if (v === undefined) return true;
      w.resolve(v);
      return false;
    });
  }

  // K1..K4. Pressed connects the pin to ground.
  key(k, down) { this.mcu.gpio[KEYS[k - 1]].setInputValue(!down); }
  async hold(k, ms) { this.key(k, true); await this.sleep(ms); }
  release(k) { this.key(k, false); }

  // MicroPython raw REPL: Ctrl-C to stop whatever runs, Ctrl-A to enter raw
  // mode, the source, Ctrl-D to run it. The board answers "OK", then the
  // program's output, then 0x04, then any traceback, then 0x04.
  async enterRaw() {
    const from = this.serial.length;
    this.write('\r\x03\x03\x01');
    await this.until('raw REPL; CTRL-B to exit\r\n>', { from });
  }

  // Run source to completion; returns { out, err }.
  async exec(src) {
    const from = this.serial.length;
    this.write(src.replace(/\r?\n/g, '\n'));
    this.write('\x04');
    const ok = await this.until('OK', { from });
    const end1 = await this.until('\x04', { from: ok });
    const end2 = await this.until('\x04', { from: end1 });
    await this.until('>', { from: end2 });
    return { out: this.serial.slice(ok, end1 - 1), err: this.serial.slice(end1, end2 - 1) };
  }

  // A filesystem the firmware can import from. MicroPython's own one lives in
  // flash, and rp2040js does not emulate flash ERASE and PROGRAM (reads work,
  // writes are lost): on the emulated board `os.listdir('/')` is [] and
  // `os.VfsLfs2.mkfs(rp2.Flash())` fails with ENOSPC. So this mounts a littlefs
  // on a RAM block device at '/' instead, which a real board never needs.
  async ramdisk(blocks = 64, size = 512) {
    const r = await this.exec(`import os
class RAMBlockDev:
    def __init__(self, n, size):
        self.size = size
        self.data = bytearray(n * size)
    def readblocks(self, block, buf, off=0):
        a = block * self.size + off
        buf[:] = self.data[a:a + len(buf)]
    def writeblocks(self, block, buf, off=None):
        a = block * self.size + (off or 0)
        self.data[a:a + len(buf)] = buf
    def ioctl(self, op, arg):
        if op == 4: return len(self.data) // self.size
        if op == 5: return self.size
        if op == 6: return 0
try:
    os.umount('/')
except OSError:
    pass
_ram = RAMBlockDev(${blocks}, ${size})
os.VfsLfs2.mkfs(_ram)
os.mount(_ram, '/')
print(os.statvfs('/')[0] * os.statvfs('/')[3])`);
    if (r.err) throw new Error(`RAM filesystem failed:\n${r.err}`);
    return Number(r.out.trim());
  }

  // Put a file on the board's filesystem.
  async put(name, text) {
    const r = await this.exec(
      `f = open(${JSON.stringify(name)}, 'w')\nf.write(${JSON.stringify(text)})\nf.close()\n` +
      `import os; print(os.stat(${JSON.stringify(name)})[6])`,
    );
    if (r.err) throw new Error(`writing ${name} failed:\n${r.err}`);
    return Number(r.out.trim());
  }

  // Start source running and return without waiting for it to end (a main
  // loop never ends). Resolves once the board has accepted it with "OK".
  async start(src) {
    const from = this.serial.length;
    this.write(src.replace(/\r?\n/g, '\n'));
    this.write('\x04');
    return this.until('OK', { from });
  }
}
