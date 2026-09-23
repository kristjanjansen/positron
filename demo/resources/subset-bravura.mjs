// demo/resources/subset-bravura.mjs. Three accidentals out of a notation font.
//
//   cd /tmp && mkdir -p fontwork && cd fontwork
//   npm i subset-font
//   node /Users/.../positron/demo/resources/subset-bravura.mjs
//
// 🔴 WHY THIS EXISTS RATHER THAN A VENDORED FONT WITH NO RECIPE. The file it
// writes is a DERIVATIVE, and a binary in this repository with no way to remake
// it is a binary nobody can check or update. `demo/shell/vendor/` holds two
// other vendored things and both carry their provenance; this is the command
// that is that provenance.
//
// 🔴 AND THE NUMBER IS THE WHOLE ARGUMENT. Bravura Text is **457,872 bytes** as
// published. `/nola/`'s entire piano is 671,974, and every page that draws a
// keyboard would have paid that for three characters. Subset to `♭ ♮ ♯` it is
// **4,508 bytes, 0.98 per cent**, MEASURED both ways by this script, which
// prints them on every run.
//
// ⚠️ IT NEEDS `subset-font`, AND THAT IS NOT INSTALLED IN THIS REPOSITORY ON
// PURPOSE. It is a wasm HarfBuzz behind a small wrapper, it is needed once per
// font rather than once per build, and this is a managed laptop where a
// toolchain is a thing to ask about rather than add. Run it in a scratch
// directory with its own `node_modules`, which is what the lines at the top do.
//
// ⚠️ AND IT FETCHES FROM STEINBERG'S OWN REPOSITORY, ONCE. `CLAUDE.md`'s rule is
// to be careful with somebody else's server: this asks for one file, caches it
// beside itself, and never asks again.
//
// LICENCE: SIL Open Font License 1.1, Steinberg Media Technologies, with the
// reserved font name "Bravura". The OFL requires the licence to travel with the
// font and with any derivative, which is `demo/shell/vendor/LICENSE-bravura`.
// ⚠️ THE RESERVED NAME IS WHY THE CSS FAMILY IS `positron-accidentals` AND NOT
// `Bravura Text`: the OFL forbids a modified font keeping the reserved name,
// and a subset is a modification.

import subsetFont from 'subset-font';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const OUT = join(REPO, 'demo', 'shell', 'vendor', 'bravura-text-accidentals.woff2');
const LICENCE = join(REPO, 'demo', 'shell', 'vendor', 'LICENSE-bravura');
const CACHE = join(REPO, 'tmp', 'bravura');

const SRC = 'https://raw.githubusercontent.com/steinbergmedia/bravura/master/redist/woff/BravuraText.woff2';
const LIC = 'https://raw.githubusercontent.com/steinbergmedia/bravura/master/LICENSE.txt';

/** ♭ U+266D, ♮ U+266E, ♯ U+266F. Three characters, and the CSS says the same
 *  three as a `unicode-range`, so a glyph added here and not there would be
 *  downloaded and never used. */
const WANT = '♭♮♯';

const pull = async (url, to) => {
  if (existsSync(to)) return readFile(to);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(to, buf);
  console.log(`fetched ${url.split('/').pop()}, ${buf.length} bytes`);
  return buf;
};

await mkdir(CACHE, { recursive: true });
const src = await pull(SRC, join(CACHE, 'BravuraText.woff2'));
const lic = await pull(LIC, join(CACHE, 'OFL.txt'));

const out = await subsetFont(src, WANT, { targetFormat: 'woff2' });
await writeFile(OUT, out);
await writeFile(LICENCE, lic);

console.log(`Bravura Text ${src.length} bytes -> ${out.length} bytes for ${[...WANT].join(' ')}`
  + `, ${(100 * out.length / src.length).toFixed(2)} per cent`);
console.log(`wrote ${OUT}`);
console.log(`wrote ${LICENCE}`);
