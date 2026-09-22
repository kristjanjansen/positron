// demo/resources/fetch-fluidr3-piano.mjs. The thirty notes `/nola/` plays.
//
//   node demo/resources/fetch-fluidr3-piano.mjs          # fetch what is missing
//   node demo/resources/fetch-fluidr3-piano.mjs --check  # print, fetch nothing
//
// 🔴 IT REFUSES TO RE-FETCH WHAT IT ALREADY HAS, AND THAT IS THE WHOLE POINT OF
// IT BEING A SCRIPT RATHER THAN A SHELL LOOP. CLAUDE.md: *"super careful with
// external sources, better avoid"*. These files are somebody else's GitHub
// Pages, they are in the repository now, and a second run of this asks that
// host for nothing at all. A run that DOES fetch waits a second between files
// and says how many it took.
//
// ⚠️ NO HARNESS EVER RUNS THIS AND NO PAGE EVER FETCHES FROM THAT HOST. The
// plan (`plans/plan-nola.md` §6.1) argued the alternative and refused it: a
// harness that runs dozens of times a day pulling files off a stranger's CDN is
// exactly the shape the rule is about, README endorsement or not.
//
// ── WHY THIRTY AND NOT EIGHTY-EIGHT ─────────────────────────────────────────
//
// 🔴 THE PLAN SAID EIGHTY-EIGHT AND THIRTY IS BETTER, FOR THE REASON THE PLAN
// ITSELF GIVES. `plans/plan-nola.md` §6.1 proposed copying the whole chromatic
// set (1,971,564 bytes) as a phase zero that *"proves the machinery"*. A
// chromatic set proves LESS machinery: with a recording of every note there is
// no nearest-neighbour to choose, no `playbackRate` to set, and §6.4's assert
// that *"the pitch shift of every note on the keyboard is within one semitone"*
// is true by construction and measures nothing.
//
// So this takes exactly the thirty notes Salamander samples: A0 and every
// minor third up to C8, which §2.3 measured as already being the spacing the
// arithmetic asked for. Phase zero then rehearses the pitch shifting that phase
// one will ship. It also costs a third of the bytes.

import { mkdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(REPO, 'demo', 'nola');

// 🔴 MIT, AND IT IS THE SOUNDFONT'S LICENCE RATHER THAN THE CONVERTER'S.
// FluidR3_GM is Frank Wen's, released for redistribution; `midi-js-soundfonts`
// is Benjamin Gleitzman's conversion of it to one file per note. Both are named
// in `demo/nola/PROVENANCE.json`, which ships with the page.
const BASE = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3';

/**
 * 🔴 THE SOURCE NAMES ITS BLACK KEYS WITH FLATS, AND ASKING FOR A SHARP GETS A
 * 404. MEASURED 2026-09-22: `D%231.mp3` answers **404** and `Eb1.mp3` answers
 * **200, 25,585 bytes**, and the same is true of `Db`, `Gb`, `Ab` and `Bb`.
 * Fourteen of the thirty notes here are black keys, so a sharp table would have
 * fetched sixteen files and thrown on the third.
 * ⚠️ IT IS NOT THIS PROJECT'S OWN SPELLING. `demo/shell/midi-decode.mjs` and
 * `demo/shell/keyboard.mjs` both print sharps, and they are right to: a name on
 * screen is for a player. This table exists only to build a URL on somebody
 * else's host, which is why it is here and not in the kit.
 */
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
/** `21` -> `A0`, `27` -> `Eb1`, which is what the source calls its files. */
export const noteName = (n) => `${FLATS[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;

/**
 * 🔴 A0 TO C8 IN MINOR THIRDS IS EXACTLY THIRTY NOTES, AND THAT IS ARITHMETIC
 * RATHER THAN A CHOICE. 21 to 108 inclusive, step 3: `(108 - 21) / 3 + 1`.
 * Every note on an 88 key piano is then at most one semitone from a recording.
 */
export const SAMPLED = Array.from({ length: 30 }, (_, i) => 21 + i * 3);

/**
 * ⚠️ THE FILE ON DISK IS NAMED BY ITS MIDI NOTE NUMBER, NOT BY `A#0.mp3`.
 * Fourteen of the thirty carry a sharp, and `#` is a fragment separator in a
 * URL: `/nola/D#1.mp3` fetches `/nola/D` and the page gets an HTML 404 body
 * decoded as audio. The plan's §8 note to `encodeURIComponent` the name is a
 * repair somebody has to remember at every call site; a number needs no repair
 * at any of them. The original name is kept in `PROVENANCE.json`.
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
  // ⚠️ AN HTML 404 BODY IS A VALID FILE AND AN INVALID MP3. Check the frame
  // header rather than the status alone: `FF Ex` is an MPEG audio sync word,
  // `ID3` is a tag in front of one.
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
