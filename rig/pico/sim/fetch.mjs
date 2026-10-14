// node fetch.mjs: download MicroPython for the RP2040 and the B1 bootrom into firmware/, once.
// why: lessons/rig-pico.md#sim-fetch
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
