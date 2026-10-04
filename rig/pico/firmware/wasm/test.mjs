// rig/pico/firmware/wasm/test.mjs: is demo/resources/pico/oled-ui.wasm the
// same drawing code as the firmware? Two compilers, one ui.c: the key labels
// the emulated router puts on its screen are compared pixel for pixel with
// what the module draws from the same four words.
//
//   node rig/pico/firmware/wasm/test.mjs
//
// Needs ../build-pico/router.uf2 (../build.sh pico) and the module (./build.sh).
// ⚠️ A NEGATIVE CONTROL: the same comparison against a module drawing with OK
// lit must FAIL, or a comparison that passes proves nothing.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pico } from '../../sim/pico.mjs';
import { BOOTROM, fetchAll } from '../../sim/fetch.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const WASM = join(here, '../../../../demo/resources/pico/oled-ui.wasm');
const UF2 = join(here, '../build-pico/router.uf2');
let fails = 0;
const check = (step, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${detail ? `  (${detail})` : ''}`); if (!ok) fails++; };

const mod = await WebAssembly.compile(readFileSync(WASM));
check('the module imports nothing, so a page instantiates it with {}', WebAssembly.Module.imports(mod).length === 0,
  WebAssembly.Module.imports(mod).map((i) => `${i.module}.${i.name}`).join(' '));
const { exports: U } = await WebAssembly.instantiate(mod, {});
const mem = () => new Uint8Array(U.memory.buffer);
const put = (i, s) => { const a = U.str(i), b = new TextEncoder().encode(s); mem().set(b, a); mem()[a + b.length] = 0; };
const pixels = () => {   // page major bytes to 128x64 ones and zeros
  const f = mem().subarray(U.fb(), U.fb() + 1024), px = new Uint8Array(128 * 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) px[y * 128 + x] = (f[(y >> 3) * 128 + x] >> (y & 7)) & 1;
  return px;
};
const names = Array.from({ length: U.nfonts() }, (_, i) => { const a = U.font_name(i); let s = ''; for (let k = a; mem()[k]; k++) s += String.fromCharCode(mem()[k]); return s; });
check('six fonts, in UI_FONTS order', names.join(' ') === 'misc4x6 misc5x7 spleen5x8 tomthumb glcd5x7 petme8x8', names.join(' '));

// the board's own boot screen: the header, then the column under it
const drawKeys = (hot) => {
  U.begin(-1); put(0, 'SCENE 1/2'); put(1, 'THRU'); const hh = U.header();
  ['PREV', 'NEXT', 'STOP', 'OK'].forEach((t, i) => put(i, t)); const x = U.keys_right(hot, hh); return { x, px: pixels() };
};
const drawFoot = () => { U.begin(-1); ['PREV', 'NEXT', 'STOP', 'OK'].forEach((t, i) => put(i, t)); const y = U.footer(0); return { y, px: pixels() }; };

await fetchAll();
const { bootromB1 } = await import(`../../sim/firmware/${BOOTROM}`);
async function boot(right) {
  const pico = new Pico({ uf2: UF2, bootrom: bootromB1 });
  if (right) {
    const flash = Buffer.from(pico.mcu.flash.buffer, pico.mcu.flash.byteOffset, pico.mcu.flash.length);
    flash[flash.indexOf('UIFONT') + 7] = 1;
  }
  pico.boot();
  await pico.sleep(400);
  const px = pico.oled.pixels().slice();
  pico.stop();
  return px;
}
const diff = (a, b, x0, x1, y0, y1) => { let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) n += a[y * 128 + x] !== b[y * 128 + x]; return n; };

const board = await boot(true);
const k = drawKeys(0);
check(`key column: the module and the emulated firmware agree on every pixel right of x ${k.x}`, diff(board, k.px, k.x, 128, 0, 64) === 0, `${diff(board, k.px, k.x, 128, 0, 64)} differ`);
const lit = drawKeys(8);
check('negative control: the column with OK lit does NOT match the idle board', diff(board, lit.px, lit.x, 128, 0, 64) > 0, `${diff(board, lit.px, lit.x, 128, 0, 64)} differ`);
const bottom = await boot(false);
const f = drawFoot();
check(`footer: the module and the firmware agree on every pixel from row ${f.y}`, diff(bottom, f.px, 0, 128, f.y, 64) === 0, `${diff(bottom, f.px, 0, 128, f.y, 64)} differ`);
console.log(fails ? `${fails} FAIL` : 'all PASS');
process.exitCode = fails ? 1 : 0;
