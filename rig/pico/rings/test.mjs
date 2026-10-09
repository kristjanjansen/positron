// rig/pico/rings/test.mjs: boot rings.uf2 on rp2040js, play notes into UART0 RX,
// and check the screen has rings on it. Exits 1 on any FAIL.
//
//   rig/pico/rings/build.sh && node rig/pico/rings/test.mjs [--show]
import { readFileSync } from 'node:fs';
import { createPico, parseUF2, litCount, W, H } from '../../../demo/shell/pico.mjs';

const show = process.argv.includes('--show');
const image = parseUF2(readFileSync(new URL('./build-pico/rings.uf2', import.meta.url)));
const board = createPico({ image });
let fails = 0;
const ok = (c, s) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${s}`); if (!c) fails++; };
const ascii = (p) => { for (let y = 0; y < H; y += 2) { let l = ''; for (let x = 0; x < W; x++) l += p[y * W + x] || p[(y + 1) * W + x] ? '#' : '.'; console.log(l); } };
const t0 = performance.now();
const run = (ms) => board.run(board.nanos + ms * 1e6);
// how far from the centre the lit pixels are, rounded, and how many at each radius
const radii = (p) => { const m = new Map(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[y * W + x]) { const r = Math.round(Math.hypot(x - 64, y - 32)); m.set(r, (m.get(r) || 0) + 1); } return m; };

run(300);
const idle = board.pixels();
ok(litCount(idle) <= 4, `at rest only the pen is lit (${litCount(idle)} px)`);

board.send([0x90, 48, 100, 0x90, 60, 100, 0x90, 67, 100]);   // C3, C4, G4 down
run(2000);
const held = board.pixels();
const rh = radii(held);
ok(litCount(held) > 40, `three notes held 2 s light ${litCount(held)} px`);
for (const r of [4, 19, 28]) ok((rh.get(r) || 0) >= 4, `ring of radius ${r} px has ink (${rh.get(r) || 0} px)`);
if (show) ascii(held);

board.send([0x80, 48, 0, 0x80, 60, 0, 0x80, 67, 0]);
run(1500);
const fading = litCount(board.pixels());
ok(fading > 0 && fading < litCount(held), `1.5 s after release they thin (${fading} px)`);
if (show) ascii(board.pixels());
run(2000);
ok(litCount(board.pixels()) <= 4, `3.5 s after release they are gone (${litCount(board.pixels())} px)`);

board.send([0xB0, 7, 20, 0x90, 64, 100]);    // volume down, one note
run(1500);
const quiet = litCount(board.pixels());
board.send([0xB0, 7, 127]);
run(40);
const loud = litCount(board.pixels());
ok(loud > quiet * 2, `CC 7 thins the arc: ${quiet} px at 20, ${loud} px at 127`);

const wall = performance.now() - t0;
console.log(`${(board.nanos / 1e6).toFixed(0)} ms of board time in ${wall.toFixed(0)} ms of wall, ${board.instructions.toLocaleString('en')} instructions`);
process.exit(fails ? 1 : 0);
