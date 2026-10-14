// Fetches the thirty FluidR3 piano notes /nola/ plays (A0 to C8 in minor thirds, so the
// pitch shifting is exercised), skipping files already present, a second between fetches.
// Run with no flag, or --check to fetch nothing. No page or harness fetches that host.
// See lessons/page-resources.md#resources-54

import { mkdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(REPO, 'demo', 'nola');

// MIT, the soundfont's licence (FluidR3_GM by Frank Wen, converted by Benjamin Gleitzman);
// both are named in demo/nola/PROVENANCE.json.
// See lessons/page-resources.md#resources-55
const BASE = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3';

/**
 * The source names black keys with flats: `D%231.mp3` is a 404, `Eb1.mp3` is 200.
 * This table only builds URLs on that host; the kit prints sharps.
 * See lessons/page-resources.md#resources-56
 */
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
/** `21` -> `A0`, `27` -> `Eb1`, which is what the source calls its files. */
export const noteName = (n) => `${FLATS[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;

/**
 * 21 to 108 step 3 is exactly thirty notes; every key is within a semitone of one.
 * See lessons/page-resources.md#resources-57
 */
export const SAMPLED = Array.from({ length: 30 }, (_, i) => 21 + i * 3);

/**
 * Files are named by MIDI number, not `A#0.mp3`: `#` is a URL fragment separator.
 * The original name is kept in PROVENANCE.json.
 * See lessons/page-resources.md#resources-58
 */
const fileOf = (n) => `${n}.mp3`;

const check = process.argv.includes('--check');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });

const rows = [];
let fetched = 0, had = 0, bytes = 0;

for (const n of SAMPLED) {
  const name = noteName(n);
  const dest = join(OUT, fileOf(n));
  const url = `${BASE}/${encodeURIComponent(name)}.mp3`;
  if (existsSync(dest)) {
    const buf = await import('node:fs').then((fs) => fs.readFileSync(dest));
    rows.push({ note: n, name, file: fileOf(n), bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') });
    bytes += statSync(dest).size;
    had++;
    continue;
  }
  if (check) { console.log(`  MISSING  ${fileOf(n)}  (${name})`); continue; }
  // One at a time, a second apart. 30 files is half a minute and it happens once.
  if (fetched) await sleep(1000);
  const res = await fetch(url, { headers: { 'user-agent': 'positron.studio one-time vendor copy' } });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // An HTML 404 body is not an MP3: check for an `FF Ex` sync word or an `ID3` tag.
  // See lessons/page-resources.md#resources-59
  const head = buf.subarray(0, 3);
  const mpeg = (head[0] === 0xff && (head[1] & 0xe0) === 0xe0)
            || (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33);
  if (!mpeg) throw new Error(`${url} answered ${buf.length} bytes that do not begin like an mp3`);
  writeFileSync(dest, buf);
  rows.push({ note: n, name, file: fileOf(n), bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') });
  bytes += buf.length;
  fetched++;
  console.log(`  ${fileOf(n).padEnd(8)} ${name.padEnd(4)} ${String(buf.length).padStart(7)} bytes`);
}

if (!check && rows.length === SAMPLED.length) {
  writeFileSync(join(OUT, 'PROVENANCE.json'), `${JSON.stringify({
    what: 'Acoustic grand piano, one recording every minor third from A0 to C8.',
    source: BASE,
    project: 'midi-js-soundfonts, Benjamin Gleitzman',
    soundfont: 'FluidR3_GM, Frank Wen',
    licence: 'MIT (the conversion); FluidR3_GM is released for redistribution. See the two projects above.',
    renamed: 'Files are named by MIDI note number here. `name` is what the source calls each one.',
    taken: new Date().toISOString().slice(0, 10),
    notes: rows,
  }, null, 2)}\n`);
}

console.log(`\n${rows.length} of ${SAMPLED.length} notes, ${had} already here, ${fetched} fetched, ${(bytes / 1024).toFixed(0)} KB`);
if (check) process.exit(rows.length === SAMPLED.length ? 0 : 1);
