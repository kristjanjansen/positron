// rig/pico/sim/run.mjs: boot MicroPython on an emulated Pico, put the OLED
// driver on it, run rig/pico/oled/main.py unchanged, press keys, save the screen.
//
//   npm install && node run.mjs    # shot-0.png, shot-1.png, shot-2.png beside this file
//
// The first run downloads the firmware and the bootrom into firmware/.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pico } from './pico.mjs';
import { FIRMWARE, BOOTROM, fetchAll } from './fetch.mjs';

const here = dirname(fileURLToPath(import.meta.url));
await fetchAll();
const { bootromB1 } = await import(`./firmware/${BOOTROM}`);
const pico = new Pico({ uf2: join(here, 'firmware', FIRMWARE), bootrom: bootromB1 });
const t0 = Date.now();
const log = (s) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s wall ${pico.ms.toFixed(0)}ms board] ${s}`);
const shot = (name) => {
  writeFileSync(join(here, name), pico.oled.png(4));
  log(`saved ${name} (frame ${pico.oled.frames})`);
};

try {
  await pico.boot();
  log('USB CDC connected');
  await pico.enterRaw();
  log('raw REPL');
  const banner = await pico.exec('import sys; print(sys.implementation._machine, sys.version)');
  log(`board: ${banner.out.trim()}`);

  // The driver goes on a filesystem, as `mip.install` would put it on a real
  // board, so `import ssd1306` in main.py works unchanged. The filesystem is in
  // RAM because the emulator does not program flash (see Pico.ramdisk).
  const free = await pico.ramdisk();
  log(`RAM filesystem mounted at /, ${free} bytes free`);
  const bytes = await pico.put('ssd1306.py', readFileSync(join(here, 'ssd1306.py'), 'utf8'));
  log(`ssd1306.py on the board, ${bytes} bytes`);

  const main = readFileSync(join(here, '..', 'oled', 'main.py'), 'utf8');
  const scanFrom = pico.serial.length;
  await pico.start(main);
  log('main.py running');
  const scanEnd = await pico.until('\n', { from: scanFrom + 2 });
  const scanLine = pico.serial.slice(scanFrom, scanEnd).replace(/^OK/, '').trim();
  console.log(`I2C scan: ${scanLine}`);

  // The driver's init draws one blank frame; the loop's first frame is the next.
  for (let n = 0; !pico.oled.pixels().some(Boolean); n++) {
    if (n > 20) throw new Error('20 frames and the screen is still dark');
    await pico.frame();
  }
  shot('shot-0.png');

  // K1 held for 200 ms of board time, shot taken while it is still down.
  await pico.hold(1, 200);
  await pico.frame();
  shot('shot-1.png');
  pico.release(1);
  await pico.sleep(100);

  // K3 the same way.
  await pico.hold(3, 200);
  await pico.frame();
  shot('shot-2.png');
  pico.release(3);

  console.log('done: open shot-0.png, shot-1.png, shot-2.png');
} catch (e) {
  console.error(e.message);
  console.error('--- serial ---\n' + pico.serial.slice(-2000));
  process.exitCode = 1;
} finally {
  pico.stop();
}
