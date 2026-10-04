// rig/pico/sim/run-router.mjs: the C router of rig/pico/firmware/ on an
// emulated Pico, driven over its MIDI UART and its four keys, graded step by
// step, with a screenshot after each.
//
//   ../firmware/build.sh pico      # builds ../firmware/build-pico/router.uf2 in Docker
//   node run-router.mjs            # router-0.png .. router-5.png beside this file
//
// MIDI goes in through UART0's RX FIFO (rp2040js `feedByte`) and comes out of
// UART0's data register (`onByte`), which is the pin pair GP1 and GP0 on the
// board. The emulated UART has no baud timing: a byte is in the FIFO the moment
// it is fed, so 31250 baud is set by the firmware and not exercised here.
//
// The screen is READ BACK AS TEXT through the display model, not trusted from
// the firmware: every lit pixel is matched against the same 8x8 font the
// firmware draws with, so "HELD 1: K4 ok" is a fact about the panel.
//
// Exits 1 on any FAIL.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pico } from './pico.mjs';
import { BOOTROM, fetchAll } from './fetch.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const UF2 = join(here, '..', 'firmware', 'build-pico', 'router.uf2');
if (!existsSync(UF2)) {
  console.error(`no ${UF2}: run ../firmware/build.sh pico first`);
  process.exit(2);
}
await fetchAll(); // the bootrom; the MicroPython image it also fetches is unused here
const { bootromB1 } = await import(`./firmware/${BOOTROM}`);
const pico = new Pico({ uf2: UF2, bootrom: bootromB1 });

// ── the font, from the header the firmware compiles, glyph bytes to a char ──
const FONT = new Map();
{
  const src = readFileSync(join(here, '..', 'firmware', 'font8x8.h'), 'utf8');
  const bytes = [...src.slice(src.indexOf('{')).matchAll(/0x([0-9a-f]{2})/gi)].map((m) => parseInt(m[1], 16));
  for (let c = 32; c < 128; c++) FONT.set(bytes.slice((c - 32) * 8, (c - 32) * 8 + 8).join(','), String.fromCharCode(c));
}
function screen() {
  const px = pico.oled.pixels();
  const lines = [];
  for (let l = 0; l < 8; l++) {
    let s = '';
    for (let c = 0; c < 16; c++) {
      const cols = [];
      for (let x = 0; x < 8; x++) {
        let b = 0;
        for (let y = 0; y < 8; y++) b |= px[(l * 8 + y) * 128 + c * 8 + x] << y;
        cols.push(b);
      }
      s += FONT.get(cols.join(',')) ?? '□';
    }
    lines.push(s.trimEnd());
  }
  return lines;
}

// ── MIDI in and out ──
const uart = pico.mcu.uart[0];
let tx = [];
uart.onByte = (b) => tx.push(b);
const rxQueue = [];
const feeder = setInterval(() => {
  while (rxQueue.length && !uart.rxFIFO.full) uart.feedByte(rxQueue.shift());
}, 0);
const hex = (a) => a.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
const bytes = (s) => s.trim().split(/\s+/).map((h) => parseInt(h, 16));
async function send(s) {
  rxQueue.push(...bytes(s));
  while (rxQueue.length) await pico.sleep(1);
  await pico.sleep(20); // the main loop parses, routes and drains
}
function take() { const t = tx; tx = []; return t; }

async function press(k, ms = 60) {
  await pico.hold(k, ms);
  pico.release(k);
  await pico.sleep(60); // past the 20 ms debounce on the way up too
}

// ── grading ──
let fails = 0;
function check(step, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${detail ? `\n      ${detail}` : ''}`);
  if (!ok) fails++;
}
async function shot(name) {
  await pico.sleep(80); // a redraw is due within 30 ms and takes 8 page writes
  writeFileSync(join(here, name), pico.oled.png(4));
  const s = screen();
  console.log(`      ${name}:\n${s.map((l) => `        |${l.padEnd(16)}|`).join('\n')}`);
  return s;
}

const REPLACE_PATCH = 'F0 00 20 29 01 60 01 05 10 20 30 40 50 60 70 F7';
const ALL_OFF = Array.from({ length: 16 }, (_, ch) => `${(0xb0 | ch).toString(16).toUpperCase()} 7B 00`).join(' ');

try {
  pico.boot(); // no USB on this firmware: the CDC never connects, nothing waits for it
  await pico.sleep(300);
  let s = await shot('router-0.png');
  check('boot: screen reads "positron router" and scene 1/2 thru', s[0] === 'positron router' && s[1] === '1/2 thru', `TX at boot: [${hex(take())}]`);

  await send('90 3C 64');
  await send('80 3C 00');
  let out = take();
  check('scene 1: note on and off C4 ch 1 pass unchanged', hex(out) === '90 3C 64 80 3C 00', `TX [${hex(out)}]`);
  s = await shot('router-1.png');
  check('scene 1: counters in 2 out 2 drop 0', s[4] === 'in   2' && s[5] === 'out  2' && s[6] === 'drop 0');

  await press(2);
  out = take();
  // The diff: unlinking scene 1 releases what it played. The note is already
  // off, so no note off, but channel 1 had a note on it, so CC 123 there.
  check('K2: scene 2, and the unlink sends CC 123 on ch 1 only', hex(out) === 'B0 7B 00', `TX [${hex(out)}]`);
  await send('90 3C 64');
  out = take();
  check('scene 2: 90 3C 64 comes out as 91 48 64', hex(out) === '91 48 64', `TX [${hex(out)}]`);
  s = await shot('router-2.png');
  check('scene 2: screen reads 2/2 octave up, tr +12 ch 2', s[1] === '2/2 octave up' && s[3] === 'tr +12 ch 2');

  await send(REPLACE_PATCH);
  out = take();
  check('Replace Patch SysEx (byte 6 = 01) is held: nothing on TX', out.length === 0, `TX [${hex(out)}]`);
  s = await shot('router-3.png');
  check('screen reads HELD 1: K4 ok', s[7] === 'HELD 1: K4 ok', `line 8 "${s[7]}"`);

  await press(4);
  out = take();
  check('K4 short: the held SysEx goes out whole', hex(out) === REPLACE_PATCH, `TX [${hex(out)}]`);
  s = await shot('router-4.png');
  check('screen: HELD line gone', s[7] === '', `line 8 "${s[7]}"`);

  await press(3);
  out = take();
  check('K3 panic: CC 123 on all 16 channels', hex(out) === ALL_OFF, `TX [${hex(out)}]`);
  s = await shot('router-5.png');

  // Two more than the brief asked for, each one line.
  await send('90 3C 64 3E 64');
  out = take();
  check('extra: running status 90 3C 64 3E 64 routes as two notes', hex(out) === '91 48 64 91 4A 64', `TX [${hex(out)}]`);
  await send('F0 00 20 29 01 60 00 05 F7');
  out = take();
  check('extra: Replace CURRENT Patch (byte 6 = 00) passes at once', hex(out) === 'F0 00 20 29 01 60 00 05 F7', `TX [${hex(out)}]`);
  await send(REPLACE_PATCH);
  await pico.hold(4, 1200);
  pico.release(4);
  await pico.sleep(60);
  out = take();
  s = screen();
  check('extra: K4 held 1.2 s denies, nothing on TX, HELD gone', out.length === 0 && s[7] === '', `TX [${hex(out)}] line 8 "${s[7]}"`);

  console.log(fails ? `${fails} FAIL` : 'all PASS');
  process.exitCode = fails ? 1 : 0;
} catch (e) {
  console.error(e.stack || e.message);
  process.exitCode = 1;
} finally {
  clearInterval(feeder);
  pico.stop();
}
