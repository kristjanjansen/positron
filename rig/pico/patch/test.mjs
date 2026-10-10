// rig/pico/patch/test.mjs: boot patch.uf2 on rp2040js, play notes into UART0
// RX, and check what comes out of UART0 TX and what the screen draws. Exits 1
// on any FAIL.
//
//   rig/pico/patch/build.sh && node rig/pico/patch/test.mjs [--show]
import { readFileSync } from 'node:fs';
import { createPico, parseUF2, readScreen, litCount, W, H } from '../../../demo/shell/pico.mjs';

const show = process.argv.includes('--show');
const image = parseUF2(readFileSync(new URL('./build-pico/patch.uf2', import.meta.url)));

// The font main.c draws in, read from its header rather than from the image.
const src = readFileSync(new URL('../firmware/font_glcd5x7.h', import.meta.url), 'utf8');
const table = [...src.slice(src.indexOf('{')).matchAll(/0x([0-9a-fA-F]{2})/g)].map((m) => parseInt(m[1], 16));
const F = { w: 5, adv: 6, top: 0, cap: 7, glyph: (c) => table.slice((c - 32) * 5, (c - 32) * 5 + 5) };

const tx = [];
const board = createPico({ image, onTx: (b) => tx.push(b) });
let fails = 0;
const ok = (c, s) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${s}`); if (!c) fails++; };
const hex = (a) => a.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
const ascii = (p) => { for (let y = 0; y < H; y++) { let l = ''; for (let x = 0; x < W; x++) l += p[y * W + x] ? '#' : '.'; console.log(l); } };
const run = (ms) => board.run(board.nanos + ms * 1e6);
const screen = () => readScreen(board.pixels(), F);
const take = () => tx.splice(0);
const tap = (k) => { board.key(k, true); run(60); board.key(k, false); run(60); };
// lit pixels in a box of the panel
const litIn = (p, x0, y0, x1, y1) => { let n = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) n += p[y * W + x]; return n; };

const t0 = performance.now();
run(300);
const s0 = screen();
for (const t of ['KEYS', 'PICO', 'SYNTH']) ok(s0.has(t, false), `at rest the box ${t} is drawn`);
ok(s0.has('as played'), 'at rest the route reads "as played"');
ok(!s0.has('THRU') && !s0.has('DIN'), 'no THRU and no DIN anywhere');
const keysAt = s0.at('KEYS'), picoAt = s0.at('PICO');
if (show) ascii(board.pixels());

// idle costs little: the core waits between frames
const i0 = board.instructions;
run(1000);
const idle = board.instructions - i0;
ok(idle < 2e6, `one idle second is ${idle.toLocaleString('en')} instructions`);

// as played: C4 goes out as C4
board.send([0x90, 60, 100]);
run(150);
const mid = board.pixels();
const wire0 = litIn(mid, keysAt.x + 30, 8, picoAt.x - 4, 26);
ok(wire0 > 18, `150 ms in, a pulse is on the KEYS to PICO wire (${wire0} px there)`);
ok(hex(take()) === '90 3C 64', 'as played: 90 3C 64 goes out as 90 3C 64');
if (show) ascii(mid);
run(400);
const s1 = screen();
ok(s1.find('C4').length === 2, `the note name C4 is drawn on both wires (${s1.find('C4').length})`);
if (show) ascii(board.pixels());
board.send([0x80, 60, 0]);
run(50);
ok(hex(take()) === '80 3C 00', 'as played: the note off goes out unchanged');
run(1500);
ok(!screen().has('C4'), 'the names are gone 1.5 s later');

// K2: octave up, C4 goes out as C5
tap(2);
run(100);
ok(screen().has('+12 octave up'), 'K2 changes the route to "+12 octave up"');
ok(hex(take()) === 'B0 7B 00', 'changing route sends CC 123 on the channel the old link played');
board.send([0x90, 60, 100]);
run(50);
ok(hex(take()) === '90 48 64', 'octave up: 90 3C 64 goes out as 90 48 64');
run(500);
const s2 = screen();
ok(s2.has('C4') && s2.has('C5'), 'C4 on the first wire and C5 on the second');
if (show) ascii(board.pixels());

// K1 while the note is held: the old link releases it
tap(1);
run(50);
const rel = hex(take());
ok(rel.startsWith('80 48') && rel.includes('B0 7B 00'), `changing route releases the held C5 (${rel})`);
ok(screen().has('as played'), 'K1 changes the route back to "as played"');
board.send([0x80, 60, 0]);
run(50);
ok(hex(take()) === '80 3C 00', 'the late note off goes out on the new route');

const wall = performance.now() - t0;
console.log(`${(board.nanos / 1e6).toFixed(0)} ms of board time in ${wall.toFixed(0)} ms of wall, ${board.instructions.toLocaleString('en')} instructions, ${litCount(board.pixels())} px lit`);
process.exit(fails ? 1 : 0);
