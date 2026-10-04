// rig/pico/sim/fetch.mjs: download, once, the two binaries the emulator needs.
// Both land in firmware/, which is gitignored, so a clone fetches them first.
//
//   MicroPython for the plain Raspberry Pi Pico (RP2040), from micropython.org.
//   The RP2040 B1 bootrom, as rp2040js ships it in its demo/ directory (built
//   from github.com/raspberrypi/pico-bootrom, BSD-3-Clause). The npm package
//   does not include it, and the MicroPython image calls into it.
//
// Skips any file already present. `node fetch.mjs`, or let run.mjs do it.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const FIRMWARE = 'RPI_PICO-20260824-v1.29.0.uf2';
export const BOOTROM = 'bootrom-b1.mjs';
const files = [
  [FIRMWARE, `https://micropython.org/resources/firmware/${FIRMWARE}`],
  // The source is TypeScript in name only: one `export const` of a Uint32Array.
  [BOOTROM, 'https://raw.githubusercontent.com/wokwi/rp2040js/main/demo/bootrom.ts'],
];

export async function fetchAll() {
  mkdirSync(join(here, 'firmware'), { recursive: true });
  for (const [name, url] of files) {
    const path = join(here, 'firmware', name);
    if (existsSync(path)) continue;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(path, buf);
    console.log(`got ${name}, ${buf.length} bytes, from ${url}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await fetchAll();
