// The sampler's piano as files on the card and one .sfz, by the browser's rules: nearest recording
// (ties down), level (v/127)^1.5, release fades. Program 0 is the Salamander, 2 FluidR3. Volume +6
// dB is arithmetic, unmeasured on the Pi. FLAC: ffmpeg drops MP3 priming once, not every key press.
// why: lessons/rig-board-io.md#sampler-header
import { existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync, renameSync, statSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

/** Where the station worker serves the sampler group's files from. */
export const SAMPLE_BASE = 'https://positron-station.kristjan-jansen.workers.dev/media/sampler/piano/';
/** On the board: beside the code, outside anything push.sh deletes (it deletes nothing). */
export const SAMPLE_DIR = process.env.BOARD_SAMPLES || '/opt/positron-board/samples/piano';
/** Thirty notes three apart, 21 to 108, the same list as demo/code/sampler.mjs. */
export const PIANO_NOTES = Object.freeze(Array.from({ length: 30 }, (_, i) => 21 + i * 3));
/** One hard note in the browser lands at 0.30 against a 0.097 file peak; see the header. */
export const PIANO_VOLUME_DB = 6;
/** Seconds from key up to silence. /nola/'s damper is a ramp of about this. */
export const PIANO_RELEASE_S = 0.3;
/** /nola/'s velocity curve, (v/127)^1.5, at the points SFZ interpolates between. */
export const VEL_POINTS = Object.freeze([1, 16, 32, 48, 64, 80, 96, 112, 127]);

/** The keys one recording owns: nearest wins, a tie goes to the lower recording. */
export function keyRanges(notes = PIANO_NOTES) {
  const sorted = [...notes].sort((a, b) => a - b);
  return sorted.map((n, i) => {
    const below = sorted[i - 1], above = sorted[i + 1];
    // A key k belongs to n when |k-n| < |k-below| (a tie with the one BELOW goes
    // below) and |k-n| <= |k-above| (a tie with the one ABOVE comes here).
    const lo = below == null ? Math.max(0, n - 1) : Math.floor((below + n) / 2) + 1;
    const hi = above == null ? Math.min(127, n + 1) : Math.floor((n + above) / 2);
    return { note: n, lo, hi };
  });
}

// The .sfz text; `ext` is the samples' extension, `dir` becomes `default_path`.
// why: lessons/rig-board-io.md#piano-sfz
export function pianoSfz({ notes = PIANO_NOTES, ext = 'flac', dir = '', volume = PIANO_VOLUME_DB,
                           release = PIANO_RELEASE_S } = {}) {
  const curve = VEL_POINTS.map((v) => `amp_velcurve_${v}=${Math.pow(v / 127, 1.5).toFixed(4)}`).join(' ');
  const lines = [
    '// written by rig/board/sampler.mjs: FluidR3_GM acoustic grand, thirty notes three apart',
    '<control>',
    ...(dir ? [`default_path=${dir.endsWith('/') ? dir : `${dir}/`}`] : []),
    '<global>',
    `volume=${volume} ampeg_release=${release} amp_veltrack=100 ${curve}`,
  ];
  for (const r of keyRanges(notes)) {
    lines.push(`<region> sample=${r.note}.${ext} lokey=${r.lo} hikey=${r.hi} pitch_keycenter=${r.note}`);
  }
  return `${lines.join('\n')}\n`;
}

/** Which of the thirty are on the card already, as `<note>.<ext>` with a size above zero. */
export function presentSamples(dir = SAMPLE_DIR, ext = 'flac', notes = PIANO_NOTES) {
  const have = new Set();
  try {
    for (const f of readdirSync(dir)) {
      const m = f.match(/^(\d+)\.([a-z0-9]+)$/);
      if (m && m[2] === ext && statSync(join(dir, f)).size > 0) have.add(+m[1]);
    }
  } catch { /* no directory yet is "none present" */ }
  return { have: notes.filter((n) => have.has(n)), missing: notes.filter((n) => !have.has(n)) };
}

// Put the piano on the card, idempotent: fetch only what is missing, one at a time (30 files, 732
// KB),
// write under a temp name and rename.
// why: lessons/rig-board-io.md#ensure-piano
export async function ensurePiano({ dir = SAMPLE_DIR, base = SAMPLE_BASE, onLog = () => {}, fetchImpl = fetch,
                                    convert = flacFromMp3 } = {}) {
  mkdirSync(dir, { recursive: true });
  const { missing } = presentSamples(dir);
  let fetched = 0;
  for (const n of missing) {
    const r = await fetchImpl(`${base}${n}.mp3`);
    if (!r.ok) throw new Error(`${base}${n}.mp3 answered ${r.status}`);
    const mp3 = Buffer.from(await r.arrayBuffer());
    const tmp = join(dir, `.${n}.mp3`);
    writeFileSync(tmp, mp3);
    convert(tmp, join(dir, `.${n}.flac`));
    rmSync(tmp, { force: true });
    renameSync(join(dir, `.${n}.flac`), join(dir, `${n}.flac`));
    fetched++;
  }
  if (fetched) onLog(`fetched ${fetched} of ${PIANO_NOTES.length} piano samples into ${dir}`);
  const sfzPath = join(dir, 'piano.sfz');
  const text = pianoSfz();
  const old = existsSync(sfzPath) ? readFileSync(sfzPath, 'utf8') : null;
  if (old !== text) writeFileSync(sfzPath, text);
  return { dir, sfz: sfzPath, fetched, wroteSfz: old !== text, ...presentSamples(dir) };
}

// The Rhodes (program 1, jRhodes3d, CC BY-NC-SA 4.0): 15 notes by 5 layers. The tables are copies
// of
// demo/code/sampler.mjs (node cannot import it as is); test.mjs grades them against it.
// why: lessons/rig-board-io.md#rhodes

export const RHODES_BASE = SAMPLE_BASE.replace(/piano\/$/, 'rhodes/');
export const RHODES_DIR = process.env.BOARD_RHODES || SAMPLE_DIR.replace(/piano\/?$/, 'rhodes');
export const RHODES_NOTES = Object.freeze([29, 35, 40, 45, 50, 55, 59, 62, 65, 71, 76, 81, 86, 91, 96]);
export const RHODES_ABSENT = Object.freeze(new Set(['81-1', '86-1', '91-1', '96-1',
  '71-3', '76-3', '81-3', '86-3', '91-3', '96-3']));
/** `rhodes-029-1`, the name the station worker serves and the card keeps. */
export const rhodesName = (note, layer) => `rhodes-${String(note).padStart(3, '0')}-${layer}`;
/** Every recording there is: 15 notes by 5 layers less the 10 holes, 65. */
export const RHODES_FILES = Object.freeze(RHODES_NOTES.flatMap((n) =>
  [1, 2, 3, 4, 5].filter((l) => !RHODES_ABSENT.has(`${n}-${l}`)).map((l) => rhodesName(n, l))));

// Put the Rhodes on the card like the piano: 65 files, 3.2 MB as AAC, converted to FLAC.
// why: lessons/rig-board-io.md#ensure-rhodes
export async function ensureRhodes({ dir = RHODES_DIR, base = RHODES_BASE, onLog = () => {}, fetchImpl = fetch,
                                     convert = flacFromMp3 } = {}) {
  mkdirSync(dir, { recursive: true });
  const have = new Set();
  try { for (const f of readdirSync(dir)) if (f.endsWith('.flac') && statSync(join(dir, f)).size > 0) have.add(f.slice(0, -5)); }
  catch { /* none yet */ }
  const missing = RHODES_FILES.filter((n) => !have.has(n));
  let fetched = 0;
  for (const n of missing) {
    const r = await fetchImpl(`${base}${n}.m4a`);
    if (!r.ok) throw new Error(`${base}${n}.m4a answered ${r.status}`);
    const tmp = join(dir, `.${n}.m4a`);
    writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
    convert(tmp, join(dir, `.${n}.flac`));
    rmSync(tmp, { force: true });
    renameSync(join(dir, `.${n}.flac`), join(dir, `${n}.flac`));
    fetched++;
  }
  if (fetched) onLog(`fetched ${fetched} of ${RHODES_FILES.length} Rhodes samples into ${dir}`);
  const licence = join(dir, 'LICENSE-jrhodes3d');
  if (!existsSync(licence)) {
    writeFileSync(licence, 'jRhodes3d by Jeff Learman, CC BY-NC-SA 4.0, https://github.com/sfzinstruments/jlearman.jRhodes3d\n'
      + 'These are positron\'s R2 copies (capped at 4 s, faded over 8 ms, AAC 96 kbps), converted to FLAC on this board.\n');
  }
  return { dir, fetched, missing: RHODES_FILES.filter((n) => !existsSync(join(dir, `${n}.flac`))) };
}

// The Salamander grand (program 0, CC BY 3.0): four of sixteen layers at thirty notes plus 88
// key-offs,
// mono 48 kHz FLAC made by fetch-salamander.mjs. Bands and names are graded against the browser's.
// why: lessons/rig-board-io.md#salamander

export const SALAMANDER_BASE = SAMPLE_BASE.replace(/piano\/$/, 'salamander/pi/');
export const SALAMANDER_DIR = process.env.BOARD_SALAMANDER || SAMPLE_DIR.replace(/piano\/?$/, 'salamander');
/** Salamander's layer for each band, softest first. */
export const SALAMANDER_LAYERS = Object.freeze([1, 6, 11, 16]);
/** The 88 keys with a key-off sample. */
export const RELEASE_KEYS = Object.freeze(Array.from({ length: 88 }, (_, i) => 21 + i));
const pad3 = (n) => String(n).padStart(3, '0');
/** `p060-v11`, the name the station worker serves and the card keeps. */
export const salamanderName = (note, layer) => `p${pad3(note)}-v${layer}`;
export const releaseName = (key) => `rel${pad3(key)}`;
/** Every file: 120 notes and 88 releases. */
export const SALAMANDER_FILES = Object.freeze([
  ...PIANO_NOTES.flatMap((n) => SALAMANDER_LAYERS.map((l) => salamanderName(n, l))),
  ...RELEASE_KEYS.map(releaseName),
]);

// Put the Salamander on the card: missing files only, one at a time, temp name then rename.
// why: lessons/rig-board-io.md#ensure-salamander
export async function ensureSalamander({ dir = SALAMANDER_DIR, base = SALAMANDER_BASE, onLog = () => {},
                                         fetchImpl = fetch } = {}) {
  mkdirSync(dir, { recursive: true });
  const have = new Set();
  try { for (const f of readdirSync(dir)) if (f.endsWith('.flac') && statSync(join(dir, f)).size > 0) have.add(f.slice(0, -5)); }
  catch { /* none yet */ }
  const missing = SALAMANDER_FILES.filter((n) => !have.has(n));
  let fetched = 0, bytes = 0;
  if (missing.length) onLog(`fetching ${missing.length} of ${SALAMANDER_FILES.length} Salamander samples into ${dir}, once`);
  for (const n of missing) {
    const r = await fetchImpl(`${base}${n}.flac`);
    if (!r.ok) throw new Error(`${base}${n}.flac answered ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const tmp = join(dir, `.${n}.flac`);
    writeFileSync(tmp, buf);
    renameSync(tmp, join(dir, `${n}.flac`));
    fetched++; bytes += buf.length;
  }
  if (fetched) onLog(`fetched ${fetched} Salamander samples, ${bytes} bytes, into ${dir}`);
  const licence = join(dir, 'LICENSE-salamander');
  if (!existsSync(licence)) {
    writeFileSync(licence, 'Salamander Grand Piano V3 by Alexander Holm, a Yamaha C5, CC BY 3.0, '
      + 'https://creativecommons.org/licenses/by/3.0/ , source https://github.com/sfzinstruments/SalamanderGrandPiano\n'
      + 'These are positron\'s R2 copies (trimmed, capped at 8 s, faded, mono 16 bit FLAC), not the author\'s originals.\n');
  }
  return { dir, fetched, bytes, missing: SALAMANDER_FILES.filter((n) => !existsSync(join(dir, `${n}.flac`))) };
}

/** ffmpeg, channels and rate kept: the conversion changes the container and drops the priming, nothing else. */
export function flacFromMp3(src, dst) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-c:a', 'flac', '-f', 'flac', dst]);
}

// `node rig/board/sampler.mjs` on the board fetches and writes, and prints what it did.
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureSalamander({ onLog: console.log })
    .then(async (r) => { console.log(JSON.stringify(r, null, 1)); console.log(JSON.stringify(await ensurePiano({ onLog: console.log }), null, 1)); })
    .catch((e) => { console.error(e.message); process.exit(1); });
}
