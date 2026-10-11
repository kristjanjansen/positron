// rig/board/sampler.mjs: the piano the board's sampler plays, as files on the
// SD card and one .sfz that maps them. No engine is raised here; this is the
// half that is the same whichever SFZ player ends up running it.
//
// The recordings are the thirty /nola/ uses (demo/nola/PROVENANCE.json:
// FluidR3_GM's acoustic grand through midi-js-soundfonts, MIT), one every minor
// third from A0 (21) to C8 (108), served from R2 by the station worker. The
// browser pages (`demo/concepts/sampler/sampler.mjs`) play them by one rule and
// this file writes the same rule down as SFZ so the Pi and a browser agree:
//
//   - a key plays the NEAREST recording, a tie going to the lower one. Three
//     apart means every recording owns exactly itself and one key either side
//     (n-1, n, n+1) and no key is ever a tie, so the ranges tile 20..109 with
//     no gap and no overlap;
//   - level follows velocity as (v/127)^1.5, /nola/'s curve, written as
//     `amp_velcurve_N` points because SFZ's own default curve is a square;
//   - a released key fades rather than stops.
//
// ⚠️ THE GAIN AND THE RELEASE ARE NOT MEASURED ON THE PI YET. The files peak
// at 0.097 (measured on /nola/ 2026-09-22, all thirty decoded), the browser
// aims one hard note at 0.30, which is +9.8 dB, and the board's capture SUMS
// left and right (jacksynth.mjs), which for these files (stereo, 44.1 kHz,
// measured with ffprobe 2026-10-11) adds up to 6 dB back where the channels
// agree and less where they do not. So `volume` is +6 dB from arithmetic, and the first note through
// the relay is what settles it.
//
// ⚠️ FLAC, NOT THE MP3 AS FETCHED. An MP3 starts with the encoder's priming
// silence (about 25 ms at 44.1 kHz for LAME), and a player that does not read
// the LAME gapless header plays it, which is 25 ms added to every key press on
// an instrument whose whole subject is the time from key to sound. ffmpeg's
// decoder honours the header when there is one, so the conversion is where the
// priming can leave. MEASURED 2026-10-11 on 60: the mp3 and the FLAC decode to
// the same 3.128889 s and neither has a gap at -60 dB from the start, so
// whatever priming these files carry, ffmpeg already removed it, and FLAC keeps
// that result out of the player's hands.
import { existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync, renameSync, statSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

/** Where the station worker serves the sampler group's files from. */
export const SAMPLE_BASE = 'https://positron-station.kristjan-jansen.workers.dev/media/sampler/piano/';
/** On the board: beside the code, outside anything push.sh deletes (it deletes nothing). */
export const SAMPLE_DIR = process.env.BOARD_SAMPLES || '/opt/positron-board/samples/piano';
/** Thirty notes three apart, 21 to 108, the same list as demo/concepts/sampler/sampler.mjs. */
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

/**
 * The .sfz text. `ext` is the file extension the samples carry on the card,
 * `dir` is written as `default_path` so the file can sit anywhere.
 */
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

/**
 * Put the piano on the card. IDEMPOTENT: a file already there is not fetched
 * again, and the .sfz is rewritten only when its text would change. Each file
 * is written to a temporary name and renamed into place, so a run cut off half
 * way leaves no half file that `presentSamples` would count.
 *
 * Fetches only what is missing, one at a time: 30 files, 732 KB in total.
 */
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

/** ffmpeg, channels and rate kept: the conversion changes the container and drops the priming, nothing else. */
export function flacFromMp3(src, dst) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-c:a', 'flac', '-f', 'flac', dst]);
}

// `node rig/board/sampler.mjs` on the board fetches and writes, and prints what it did.
if (import.meta.url === `file://${process.argv[1]}`) {
  ensurePiano({ onLog: console.log }).then((r) => console.log(JSON.stringify(r, null, 1)))
    .catch((e) => { console.error(e.message); process.exit(1); });
}
