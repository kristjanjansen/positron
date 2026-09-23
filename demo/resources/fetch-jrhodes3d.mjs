// demo/resources/fetch-jrhodes3d.mjs. A real 1977 Rhodes for `/nola/`.
//
//   node demo/resources/fetch-jrhodes3d.mjs           # fetch what is missing, encode what is missing
//   node demo/resources/fetch-jrhodes3d.mjs --check   # print the state, touch nothing and nobody
//   node demo/resources/fetch-jrhodes3d.mjs --encode  # re-encode every output from tmp/, fetch nothing
//   node demo/resources/fetch-jrhodes3d.mjs --force   # re-encode even outputs that already exist
//
// 🔴 IT FETCHES 22,884,538 BYTES FROM SOMEBODY ELSE'S GITHUB EXACTLY ONCE, AND
// EVERY LATER RUN ASKS THAT HOST FOR NOTHING AT ALL. `CLAUDE.md`: *"super
// careful with external sources, better avoid"*. The 67 source files land in
// `tmp/jrhodes3d-mono/`, which is gitignored, so they are not in the repository
// and are not in the deploy. A run that DOES fetch waits a second between files
// and says how many it took. `demo/resources/fetch-fluidr3-piano.mjs` is the
// same shape and has the same rule at the top of it.
//
// ⚠️ NO HARNESS EVER RUNS THIS AND NO PAGE EVER FETCHES FROM THAT HOST. The
// outputs are committed. Deleting all of them and running this once rebuilds
// every one, which is the only thing that makes the encode arguable later.
//
// ── WHAT IT IS ──────────────────────────────────────────────────────────────
//
// Jeff Learman's jRhodes3d, MONO set: his own 1977 Rhodes Mark I Stage 73,
// recorded around 2006 directly from the harp connector, 15 notes, five
// velocity layers about 3 dB apart, 44.1 kHz 16 bit FLAC.
// `research/rhodes-packs-2026-09-23.md` surveyed every free Rhodes there is and
// found this to be the only real one worth building on.
//
// 🔴 THE MONO SET IS THE RECORDING AND THE TWO STEREO SETS ARE NOT. DOCUMENTED,
// his own README: *"The stereo effect is a mild pitch-shift doubling to create a
// stereo image"*. That is an effect a browser can apply for nothing, and buying
// it in the bytes costs 1.66 times the mono set. So this takes the mono.
//
// ── THE LICENCE, WHICH IS SETTLED AND IS NOT A JUDGEMENT CALL HERE ──────────
//
// CC BY-NC-SA 4.0. positron.studio is a personal, non-commercial research site,
// which is what the NC term permits. What the licence REQUIRES is attribution
// and share-alike, and both ship beside the files: `demo/nola/LICENSE-jrhodes3d`
// carries his name, the source repository, the canonical licence URL and the
// fact that these outputs are TRIMMED AND RE-ENCODED derivatives rather than his
// originals, under the same licence.
// ⚠️ THE UPSTREAM LICENCE FILE CONTRADICTS ITSELF and that is recorded rather
// than smoothed over: `sfzinstruments.github.io/pianos/` lists jRhodes3d as
// `CC-BY-NC-4.0`, the repository LICENSE summary line says `CC BY-NC`, and
// `research/rhodes-packs-2026-09-23.md` §2 and §3 have the whole of it. The
// upstream text is copied verbatim into the licence file so a reader can check
// rather than take this comment's word for it.
//
// ── WHAT THE ENCODE DOES, AND WHY EACH PART OF IT ───────────────────────────
//
// 🔴 THE TRIM WAS ASKED FOR AND IT MOVED NOTHING, BECAUSE THE ONSET IS AT
// SAMPLE ZERO ON ALL 65 FILES. `plans/plan-nola.md` §3.4 MEASURED pre-echo on
// this machine and found it lives in the few milliseconds BEFORE an attack, so
// the repair is to trim to just before the onset and fade in over 2 to 5 ms.
// MEASURED here on every source: there is nothing in front of the attack to
// throw away. The author already did it.
// ⚠️ AND THE FADE IN HAD TO COME OFF WITH IT RATHER THAN BEING LEFT IN AS A
// HARMLESS EXTRA. MEASURED on `A_062__D4_5`, which reaches 85 per cent of its
// peak inside the first millisecond: a 3 ms fade from sample 0 took the first
// millisecond from 0.5985 to 0.1932, which is **9.8 dB off the attack of the
// hardest note in the set**. The code fades in over whatever lead it kept, and
// on this set that is zero.
//
// 🔴 AAC IN m4a AT 96 kbps, MONO, 44.1 kHz. Two independent reasons, both in
// `plans/plan-nola.md` §3.4: AAC is about 18 dB better than Opus on pre-echo at
// the same bitrate, and it is the only container with no Safari question mark
// (`smplr`'s own source: *"Safari reports it can play OGG but decodeAudioData
// fails on many samples"*).
// ⚠️ AND NOBODY HAS RUN `decodeAudioData` ON ANY OF IT. That claim is still
// somebody else's production bug rather than a measurement from this desk.
//
// 🔴 A 4 SECOND CAP, WITH AN 8 ms FADE OUT SO A CUT NOTE DOES NOT CLICK. The
// research file's §5.1 prices all five layers at 2.86 MiB there, against 10.20
// MiB uncapped. ⚠️ A cap is the crude version of the level trim
// `plans/plan-nola.md` §3.5 argues for, and it is what is shipped here because
// it can be reasoned about from one number. The fade out is applied at the real
// end of every output, capped or not, because a naturally decayed tail costs
// nothing to fade and a truncated one clicks without it.
//
// 🔴 THERE ARE NO LOOP POINTS IN THIS SET AND THAT WAS CHECKED RATHER THAN
// ASSUMED. `research/rhodes-packs-2026-09-23.md` §3.1 measured a `smpl` chunk
// with one loop in every file of the CC0 WAV subset, and that subset comes from
// jRhodes3**c**, the LOOPED set. This is 3**d**. MEASURED on all 65 sources:
// the metadata blocks are STREAMINFO, SEEKTABLE, VORBIS_COMMENT and PADDING,
// there is no APPLICATION block carrying a foreign `riff` chunk, and the bytes
// `smpl` appear nowhere in any file. `loopOf()` re-checks it on every run and
// the answer is recorded per file.
// ⚠️ SO THE CAPABILITY LEFT ON THE TABLE IS THE CHOICE OF SET, NOT THE CAP.
// jRhodes3c is looped, is the same instrument, and is **5,970,448 bytes of
// source against this set's 22,884,538**. A looped note sustains for as long as
// a key is held out of about five seconds of audio, and `AudioBufferSourceNode`
// already has `loop`, `loopStart` and `loopEnd` in seconds. Nothing here
// implements looping, and this script would not be the place: it would be a
// different fetch of a different set.
//
// ── WHERE THE OUTPUTS GO, AND THIS IS A 404 THIS REPOSITORY HAS SHIPPED ─────
//
// 🔴 FLAT IN `demo/nola/`, NEVER IN `demo/nola/rhodes/`. `workers/view/build.mjs`'s
// `demoFiles()` enumerates ONE directory level under `demo/<slug>/` and filters
// to a set of web extensions. `.m4a` is in that set; a SUBDIRECTORY IS NOT
// WALKED. A pack under `demo/nola/rhodes/` would be declined by the deploy in
// silence and 404 in production, which is the `manifest.webmanifest` failure
// that build file already records twice.
// The names are `rhodes-<midi zero padded to 3>-<layer>.m4a`, which cannot
// collide with the 30 FluidR3 piano files named `<midi>.mp3`.

import { mkdirSync, existsSync, readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(REPO, 'tmp', 'jrhodes3d-mono');   // gitignored, fetched once
const OUT = join(REPO, 'demo', 'nola');            // flat, deployed

const RAW = 'https://raw.githubusercontent.com/sfzinstruments/jlearman.jRhodes3d/master';

/**
 * 🔴 THE 15 NOTES ARE THE AUTHOR'S, NOT A CHOICE MADE HERE. He calls it
 * *"sampling every 4th white key"*. The gaps are 6, 5, 5, 5, 5, 4, 3, 3, 6, 5,
 * 5, 5, 5, 5 semitones, so nearest-neighbour plus `playbackRate` gives a WORST
 * shift of 3 semitones and a typical 2, against Salamander's worst of 1.
 * `research/rhodes-packs-2026-09-23.md` §5.3 has what that costs.
 */
const NOTES = [29, 35, 40, 45, 50, 55, 59, 62, 65, 71, 76, 81, 86, 91, 96];

/**
 * 🔴 FIVE LAYERS, AND THEY ARE NOT FIVE EVERYWHERE. MEASURED in the research
 * file and re-checked here against what actually downloads: layer 3 stops after
 * MIDI 71 and layer 1 after 76, so 65 files rather than 75. The author's
 * reason, from the README: *"Not all layers are full-keyboard width, as higher
 * notes don't change timbre as much."* Layers 2, 4 and 5 are the only three
 * present on all 15 notes, which is what a page has to build its velocity
 * mapping around.
 */
const LAYERS = [1, 2, 3, 4, 5];
const ABSENT = new Set(['81-1', '86-1', '91-1', '96-1',
                        '71-3', '76-3', '81-3', '86-3', '91-3', '96-3']);

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** `29` -> `F1`. The source names its files the same way, with the octave the
 *  same convention this repository's `demo/shell/midi-decode.mjs` uses. */
const nameOf = (n) => `${SHARPS[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;

const outName = (note, layer) => `rhodes-${String(note).padStart(3, '0')}-${layer}.m4a`;

// ── the encode, one place ───────────────────────────────────────────────────
const CAP = 4.0;          // seconds, the flat cap
const LEAD = 0.005;       // seconds kept in front of the onset, WHERE THERE ARE ANY
const FADE_IN = 0.003;    // seconds, inside the 2 to 5 ms plan-nola §3.4 asks for
const FADE_OUT = 0.008;   // seconds at the real end of every output
const BITRATE = '96k';
const RATE = 44100;

/**
 * 🔴 APPLE'S ENCODER, NOT ffmpeg's OWN, AND THE REASON IS A MEASURED +4.1 dB
 * OVERSHOOT. MEASURED 2026-09-23 on ten of these files, source peak against the
 * peak of the decoded output, both in float:
 *
 *   file           source    ffmpeg aac 96k        aac_at 96k
 *   A_062__D4_5    0.7036    1.1301  (+4.1 dB)     0.7047  (0.0 dB)
 *   A_029__F1_1    0.7931    1.0483  (+2.4 dB)     0.7949  (0.0 dB)
 *   A_029__F1_5    0.8549    1.0962  (+2.2 dB)     0.8543  (0.0 dB)
 *   A_065__F4_2    0.8114    0.9712  (+1.6 dB)     0.8068  (0.0 dB)
 *
 * Six of the ten went over with ffmpeg's native encoder and four went over by
 * more than a dB, and the overshoot sits 12 ms after the attack rather than at
 * it. `aac_at` tracked the source peak to within 0.1 dB on every one of the ten
 * for **1.05 per cent more bytes**. INFERRED cause: these files begin with a
 * full amplitude transient at SAMPLE ZERO, with no lead-in at all for the first
 * transform window to work with, which is the hardest thing a transform codec
 * can be handed.
 * ⚠️ `aac_at` IS AudioToolbox AND EXISTS ONLY ON macOS. A machine without it
 * still builds the pack with ffmpeg's own encoder; the run says so on the way
 * past and `PROVENANCE-rhodes.json` records which encoder made the bytes, the
 * same way `demo/grains/defs/PROVENANCE.json` records which machine compiled
 * the synth definitions.
 */
const ENCODER = (() => {
  try {
    const list = execFileSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' });
    if (/^\s*A\S*\s+aac_at\s/m.test(list)) return 'aac_at';
  } catch { /* fall through to the portable one */ }
  console.log('⚠️  aac_at is not in this ffmpeg. Falling back to the native aac encoder,');
  console.log('    which MEASURED up to +4.1 dB of peak overshoot on these attacks.');
  return 'aac';
})();

const check = process.argv.includes('--check');
const encodeOnly = process.argv.includes('--encode');
const force = process.argv.includes('--force');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-v', 'error', ...args], { maxBuffer: 1 << 28 });
const probe = (file) => JSON.parse(execFileSync('ffprobe', [
  '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file,
], { encoding: 'utf8', maxBuffer: 1 << 26 }));

/**
 * Decode a whole file to mono 16 bit PCM in memory and hand back an Int16Array.
 * ⚠️ IT IS A PIPE AND NOT A TEMPORARY FILE on purpose: the longest source here
 * is 25.0 s, which is 2.2 MB of PCM, and nothing has to be cleaned up after a
 * run that throws.
 */
function pcm(file) {
  // 🔴 FLOAT AND NOT 16 BIT, AND THE FIRST VERSION OF THIS WAS 16 BIT AND LIED.
  // An AAC decode can come back ABOVE full scale, which is fine in Web Audio and
  // is clamped to exactly 1.0 by an integer decode. Measuring the peak through
  // `s16le` reported `1` on twenty of these files and hid the real number.
  const buf = ff(['-i', file, '-map', '0:a:0', '-f', 'f32le', '-acodec', 'pcm_f32le',
                  '-ac', '1', '-ar', String(RATE), '-']);
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
}

/**
 * 🔴 THE ONSET IS FOUND AGAINST THE FILE'S OWN PEAK AND ITS OWN NOISE FLOOR,
 * NOT AGAINST A FIXED NUMBER. A direct pickup feed has hum and hiss in front of
 * the attack, and a fixed -40 dBFS gate would find the hiss on a loud file and
 * find nothing at all on `A_096__C7_2`, which is the quietest note in the set.
 * The gate is whichever is higher of 1 per cent of the file's peak and 8 times
 * the RMS of its first 20 ms, and a 1 ms moving maximum has to cross it.
 */
function analyse(samples) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) { const a = Math.abs(samples[i]); if (a > peak) peak = a; }
  const head = Math.min(samples.length, Math.round(0.020 * RATE));
  let sq = 0;
  for (let i = 0; i < head; i++) sq += samples[i] * samples[i];
  const floor = Math.sqrt(sq / Math.max(1, head));
  const gate = Math.max(peak * 0.01, floor * 8);
  const win = Math.round(0.001 * RATE);
  let onset = 0;
  for (let i = 0; i + win < samples.length; i += win) {
    let m = 0;
    for (let j = i; j < i + win; j++) { const a = Math.abs(samples[j]); if (a > m) m = a; }
    if (m >= gate) { onset = i; break; }
  }
  return { peak, floor, onsetSec: onset / RATE, seconds: samples.length / RATE };
}

/**
 * 🔴 THERE IS NO LOOP IN THIS SET AND IT WAS CHECKED RATHER THAN ASSUMED.
 * `research/rhodes-packs-2026-09-23.md` §3.1 MEASURED a `smpl` chunk with one
 * loop in every WAV of the CC0 subset, which comes from jRhodes3**c**, the
 * LOOPED set. This is 3**d**, which the author's own index row calls unlooped,
 * and the check agrees: the metadata blocks of every source file here are
 * STREAMINFO, SEEKTABLE, VORBIS_COMMENT and PADDING, with no APPLICATION block
 * carrying foreign `riff` chunks and no `smpl` bytes anywhere in the file.
 * ⚠️ SO NO LOOP CAPABILITY IS BEING LEFT ON THE TABLE BY CAPPING THIS SET. It
 * is being left on the table by choosing 3d over 3c, which is a different
 * decision and is the one worth revisiting: `AudioBufferSourceNode` has `loop`,
 * `loopStart` and `loopEnd` in seconds, and the looped set is 5,970,448 bytes
 * of source against this one's 22,884,538.
 */
function loopOf(file) {
  const d = readFileSync(file);
  if (d.subarray(0, 4).toString('latin1') !== 'fLaC') return { blocks: [], smpl: false };
  const NAMES = ['STREAMINFO', 'PADDING', 'APPLICATION', 'SEEKTABLE', 'VORBIS_COMMENT', 'CUESHEET', 'PICTURE'];
  const blocks = [];
  let p = 4;
  for (;;) {
    const h = d[p], last = h >> 7, t = h & 0x7f;
    const len = (d[p + 1] << 16) | (d[p + 2] << 8) | d[p + 3];
    blocks.push(NAMES[t] || String(t));
    p += 4 + len;
    if (last || p >= d.length) break;
  }
  return { blocks, smpl: d.includes('smpl') };
}

mkdirSync(SRC, { recursive: true });
mkdirSync(OUT, { recursive: true });

// ── 1. the source files, once ───────────────────────────────────────────────

const WANT = [];
for (const note of NOTES) {
  for (const layer of LAYERS) {
    if (ABSENT.has(`${note}-${layer}`)) continue;
    // ⚠️ THE SOURCE SPELLS ITS BLACK KEYS WITHOUT AN ACCIDENTAL AT ALL, because
    // it samples every 4th white key and there are none among the fifteen. The
    // `replace` is a guard rather than a translation, so that changing NOTES
    // does not silently build a URL that 404s. `fetch-fluidr3-piano.mjs` hit
    // the same class of trap the other way round and its note is worth reading.
    const src = `A_${String(note).padStart(3, '0')}__${nameOf(note).replace('#', '')}_${layer}.flac`;
    WANT.push({ note, layer, name: nameOf(note), src, path: `jRhodes3d-mono/${src}` });
  }
}
const EXTRA = [
  { src: 'LICENSE', path: 'LICENSE', why: 'the upstream licence, quoted in the one beside the samples' },
  { src: 'README.md', path: 'README.md', why: 'the author on his own instrument and his own EQ' },
  { src: 'jRhodes3d-mono.sfz', path: 'jRhodes3d-mono.sfz',
    why: 'the velocity split and the key map, which are the two things a page cannot guess' },
  { src: '_jRhodes3d-mono-flac.sfz', path: 'jRhodes3d-mono/_jRhodes3d-mono-flac.sfz',
    why: 'the variant beside the samples, kept because it states the licence a third way' },
];

let fetched = 0, had = 0, srcBytes = 0;

if (!encodeOnly) {
  for (const w of [...WANT, ...EXTRA]) {
    const dest = join(SRC, w.src);
    if (existsSync(dest)) { had++; srcBytes += statSync(dest).size; continue; }
    if (check) { console.log(`  MISSING SOURCE  ${w.path}`); continue; }
    if (fetched) await sleep(1000);   // once, a second apart, and never again
    const res = await fetch(`${RAW}/${w.path}`, { headers: { 'user-agent': 'positron.studio one-time vendor copy' } });
    if (!res.ok) throw new Error(`${RAW}/${w.path} answered ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // ⚠️ AN HTML 404 BODY IS A VALID FILE AND AN INVALID FLAC. Check the magic
    // rather than the status alone, exactly as the FluidR3 script checks for an
    // MPEG sync word.
    if (w.src.endsWith('.flac') && buf.subarray(0, 4).toString('latin1') !== 'fLaC') {
      throw new Error(`${RAW}/${w.path} answered ${buf.length} bytes that do not begin 'fLaC'`);
    }
    writeFileSync(dest, buf);
    srcBytes += buf.length;
    fetched++;
    console.log(`  fetched ${w.src.padEnd(30)} ${String(buf.length).padStart(8)} bytes`);
  }
  console.log(`\nsource: ${had} already here, ${fetched} fetched, ${srcBytes} bytes in tmp/jrhodes3d-mono/`);
}

// ── 2. the encode ───────────────────────────────────────────────────────────

const rows = [];
let made = 0, kept = 0, outBytes = 0;

for (const w of WANT) {
  const from = join(SRC, w.src);
  const dest = join(OUT, outName(w.note, w.layer));
  if (!existsSync(from)) {
    if (check) { console.log(`  NO SOURCE  ${w.src}`); continue; }
    throw new Error(`${from} is not here. Run without --encode to fetch it.`);
  }
  if (check) {
    console.log(`  ${existsSync(dest) ? 'have' : 'MISSING'}  ${outName(w.note, w.layer)}`);
    continue;
  }

  const srcBuf = readFileSync(from);
  const a = analyse(pcm(from));
  const start = Math.max(0, a.onsetSec - LEAD);

  /**
   * 🔴 THE LENGTH IS ROUNDED DOWN TO A WHOLE AAC FRAME, WHICH IS WHAT MAKES
   * *"under the cap"* A FACT RATHER THAN AN ALMOST. An AAC frame is 1024
   * samples and an encoder emits whole ones, so a 4.000 s trim came back as
   * **4.017 s** on all 59 capped files, MEASURED: 176,400 samples of audio is
   * 172.27 frames and the encoder wrote 173. Aligning the trim to 172 frames,
   * 3.9938 s, makes the decoded length come back EXACTLY 176,128 samples.
   * ⚠️ IT COSTS AT MOST 23 ms OFF THE END OF A DECAYING TAIL, behind the 8 ms
   * fade out, and it buys a file whose reported duration needs no footnote.
   */
  const FRAME = 1024;
  const room = Math.min(CAP, a.seconds - start);
  const dur = (Math.floor(room * RATE / FRAME) * FRAME) / RATE;
  const end = start + dur;

  /**
   * 🔴 THE FADE IN IS ONLY AS LONG AS THE LEAD THERE ACTUALLY IS, AND ON THIS
   * SET THAT IS ZERO. MEASURED on all 65 sources: the onset is at sample 0 on
   * every one of them, because the author already trimmed to the attack. So
   * `plans/plan-nola.md` §3.4's *"trim a few ms before the onset"* repair has
   * been done upstream and there is no pre-echo region left to discard.
   * ⚠️ AND APPLYING THE FADE ANYWAY WOULD HAVE BEEN A DEFECT RATHER THAN A
   * NO-OP. MEASURED on `A_062__D4_5`, which reaches 85 per cent of its peak
   * inside the first millisecond: a 3 ms fade from sample 0 took the first
   * millisecond from **0.5985 to 0.1932, which is 9.8 dB off the attack**, and
   * the first 5 ms from 0.7036 to 0.6004. A fade is protection for a lead-in.
   * With no lead-in it is just an envelope over the hardest part of the note.
   */
  const lead = a.onsetSec - start;
  const fadeIn = Math.min(FADE_IN, lead);

  if (force || !existsSync(dest)) {
    const filter = [
      `atrim=start=${start.toFixed(6)}:end=${end.toFixed(6)}`,
      'asetpts=N/SR/TB',
      ...(fadeIn > 0 ? [`afade=t=in:st=0:d=${fadeIn.toFixed(6)}`] : []),
      // ⚠️ THE FADE OUT IS APPLIED WHETHER OR NOT THE CAP CUT ANYTHING. 59 of
      // the 65 are cut at 4 s and click without it; the other six end on a
      // decayed tail where 8 ms of ramp is inaudible and costs nothing. One
      // rule beats a conditional that has to be right about which file is which.
      `afade=t=out:st=${Math.max(0, dur - FADE_OUT).toFixed(6)}:d=${FADE_OUT}`,
    ].join(',');
    ff(['-y', '-i', from, '-map', '0:a:0', '-af', filter,
        '-c:a', ENCODER, '-b:a', BITRATE, '-ac', '1', '-ar', String(RATE),
        '-movflags', '+faststart', '-map_metadata', '-1', dest]);
    made++;
  } else {
    kept++;
  }

  // 🔴 EVERY OUTPUT IS PROBED AND DECODED BACK, ON EVERY RUN, INCLUDING THE
  // ONES THIS RUN DID NOT MAKE. An encode that went wrong is silent: the file
  // exists, the build copies it, and the page plays four seconds of nothing.
  // The peak here is the peak of the ENCODED audio, which is the number
  // `/nola/`'s `SAMPLE_PEAK` has to be set from.
  const p = probe(dest);
  const st = p.streams.find((s) => s.codec_type === 'audio');
  const outPcm = pcm(dest);
  let opeak = 0;
  for (let i = 0; i < outPcm.length; i++) { const v = Math.abs(outPcm[i]); if (v > opeak) opeak = v; }
  let sq = 0;
  const win = Math.min(outPcm.length, RATE);
  for (let i = 0; i < win; i++) sq += outPcm[i] * outPcm[i];
  const rms1s = Math.sqrt(sq / win);
  const bytes = statSync(dest).size;
  outBytes += bytes;
  const loop = loopOf(from);

  rows.push({
    note: w.note,
    name: w.name,
    layer: w.layer,
    file: outName(w.note, w.layer),
    bytes,
    seconds: Number(Number(p.format.duration).toFixed(3)),
    channels: st.channels,
    sampleRate: Number(st.sample_rate),
    bitrate: Number(st.bit_rate || p.format.bit_rate),
    peak: Number(opeak.toFixed(4)),
    // 🔴 RMS OVER THE FIRST SECOND, WHICH IS THE NUMBER THE PEAK HIDES. These
    // files are roughly peak normalised, so the peak says almost nothing about
    // how loud a layer is. See `levelWarning`.
    rms1s: Number(rms1s.toFixed(5)),
    sourceFile: w.src,
    sourceBytes: srcBuf.length,
    sourceSeconds: Number(a.seconds.toFixed(3)),
    sourcePeak: Number(a.peak.toFixed(4)),
    onsetSec: Number(a.onsetSec.toFixed(4)),
    trimmedAt: Number(start.toFixed(4)),
    fadeInSec: Number(fadeIn.toFixed(4)),
    capped: a.seconds - start > CAP,
    loop: loop.smpl ? 'a smpl chunk is present, READ IT' : null,
    sourceBlocks: loop.blocks.join(','),
    sha256: createHash('sha256').update(readFileSync(dest)).digest('hex'),
  });
}

if (check) {
  const have = readdirSync(OUT).filter((f) => f.startsWith('rhodes-') && f.endsWith('.m4a'));
  console.log(`\n${have.length} of ${WANT.length} outputs present`);
  process.exit(have.length === WANT.length ? 0 : 1);
}

// ── 3. what a reader and a machine each need beside the bytes ───────────────

/**
 * 🔴 THE VELOCITY SPLIT IS THE ONE THING A PAGE CANNOT GUESS, AND THE AUTHOR
 * SHIPPED IT. Parsed out of `_jRhodes3d-mono-flac.sfz` rather than transcribed,
 * so it cannot drift from the file it came from.
 * 🔴 AND THE LAYER NUMBERS RUN BACKWARDS FROM WHAT THE NAME SUGGESTS: `_5` IS
 * THE SOFTEST AND `_1` IS THE HARDEST. The first `<group>` in his file is
 * `lovel=1 xfout_lovel=25 xfout_hivel=60` and every region in it is a `_5`.
 * Anybody who reads `layer 5` as `hardest` builds a keyboard that gets quieter
 * the harder it is hit, and nothing about the file names says otherwise.
 * ⚠️ HE ALSO SHIPS THE FALLBACK FOR THE LAYERS THAT STOP. In the `_3` group the
 * regions above MIDI 71 name `_4` files, and in the `_1` group the regions
 * above 76 name `_2` files. So where a layer is absent the author reuses the
 * nearest one that exists, which is DOCUMENTED rather than a policy invented
 * here. `regions` below is what he actually wrote, file by file.
 */
function sfz() {
  // ⚠️ THE CANONICAL FILE AND NOT THE ONE BESIDE THE SAMPLES. Both were fetched.
  // `_jRhodes3d-mono-flac.sfz` maps C1 to F7 and this one maps **A0 to C8**, all
  // 88 keys, which is the author's own answer to what to do above his highest
  // sample. It also writes `lovel` AND `hivel` on every group rather than
  // leaving them implied.
  const file = join(SRC, 'jRhodes3d-mono.sfz');
  if (!existsSync(file)) return null;
  const text = readFileSync(file, 'utf8');
  const kv = (s, k) => { const m = s.match(new RegExp(`\\b${k}=(\\S+)`)); return m ? m[1] : null; };
  const groups = [];
  let cur = null;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t.startsWith('//')) continue;
    if (t.startsWith('<group>')) {
      cur = {
        lovel: Number(kv(t, 'lovel') ?? 0) || null,
        hivel: Number(kv(t, 'hivel') ?? 0) || null,
        xfinLovel: Number(kv(t, 'xfin_lovel') ?? 0) || null,
        xfinHivel: Number(kv(t, 'xfin_hivel') ?? 0) || null,
        xfoutLovel: Number(kv(t, 'xfout_lovel') ?? 0) || null,
        xfoutHivel: Number(kv(t, 'xfout_hivel') ?? 0) || null,
        regions: [],
      };
      groups.push(cur);
    } else if (t.startsWith('<region>') && cur) {
      cur.regions.push({
        sample: kv(t, 'sample'),
        lokey: kv(t, 'lokey'),
        hikey: kv(t, 'hikey'),
        keycenter: kv(t, 'pitch_keycenter'),
        ampegRelease: Number(kv(t, 'ampeg_release')),
      });
    }
  }
  for (const g of groups) {
    const m = g.regions[0]?.sample?.match(/_(\d)\.flac$/);
    g.layer = m ? Number(m[1]) : null;
  }
  return {
    from: 'jRhodes3d-mono.sfz, parsed',
    // 🔴 NO `volume`, NO `amp_velcurve` AND NO `amp_veltrack` ON ANY GROUP OR
    // REGION, checked by exhaustion. The only level opcode in the file is the
    // master's +6 dB. So the recordings carry TIMBRE and the player is expected
    // to supply the LEVEL from velocity, which is what `/nola/`'s `velGain`
    // already does. See `levelWarning` in the top level of this record.
    levelOpcodes: /\b(amp_velcurve|amp_veltrack)/.test(text) ? 'present, READ THEM' : 'none anywhere',
    masterVolumeDb: Number(text.match(/^volume=(\S+)/m)?.[1] ?? 0),
    licenceLineInThatFile: text.match(/^\/\/ license:.*$/m)?.[0] ?? null,
    groups,
  };
}

/**
 * 🔴 THE THING THE PAGE WILL GET WRONG IF NOBODY TELLS IT, MEASURED RATHER THAN
 * ASSUMED. `plans/plan-nola.md` and `demo/nola/index.html` both carry the
 * FluidR3 finding that *"the recordings are 21 dB down and the page has to make
 * that up"*. THIS SET IS THE OPPOSITE: it sits at the top of the scale, median
 * peak 0.82 and 29 of 65 files within 1 dB of full scale.
 * 🔴 AND THE PEAK IS THE WRONG NUMBER HERE, WHICH IS THE PART THAT BITES. These
 * files are roughly peak normalised, so the five velocity layers of one note all
 * peak in the same 2 to 4 dB band while their RMS over the first second differs
 * by up to 10 dB IN THE WRONG DIRECTION: at MIDI 29 the HARDEST layer is 9.6 dB
 * QUIETER than the softest. A page that switches buffer on velocity and trusts
 * the file to be louder gets a keyboard that goes quiet when it is hit harder.
 * ✅ AND THE AUTHOR'S OWN SFZ SAYS THE SAME THING BY OMISSION, which is why this
 * is a reading of his design rather than a complaint about his files: there is
 * no `volume`, no `amp_velcurve` and no `amp_veltrack` on any group or region,
 * so the recordings carry TIMBRE and the player is expected to supply the LEVEL.
 * `demo/nola/index.html`'s `velGain` already does exactly that.
 * ⚠️ THE CROSSOVER STEP IS THE SECOND HALF OF IT. Switching layer at a velocity
 * boundary changes the RMS by a median of 1.5 dB and by as much as 4.4 dB, which
 * is why the author crossfades rather than switching. The ranges to crossfade
 * over are in `velocity.groups`.
 */
function levels(rows) {
  const db = (v) => Number((20 * Math.log10(v)).toFixed(2));
  const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
  const byLayer = {};
  for (const L of LAYERS) {
    const r = rows.filter((x) => x.layer === L);
    byLayer[`layer${L}`] = {
      files: r.length,
      peakMedian: med(r.map((x) => x.peak)),
      rms1sMedianDb: db(med(r.map((x) => x.rms1s))),
    };
  }
  const steps = [];
  for (const n of NOTES) {
    for (const [a, b] of [[1, 2], [2, 3], [3, 4], [4, 5]]) {
      const x = rows.find((r) => r.note === n && r.layer === a);
      const y = rows.find((r) => r.note === n && r.layer === b);
      if (x && y) steps.push(db(x.rms1s) - db(y.rms1s));
    }
  }
  steps.sort((x, y) => x - y);
  return {
    warning: 'These files are roughly PEAK NORMALISED. Peak says nothing about how loud a layer is, RMS runs the WRONG WAY against velocity, and the page must supply the level from velocity itself. The author\'s SFZ has no volume, amp_velcurve or amp_veltrack opcode anywhere, which is him saying the same thing.',
    byLayer,
    adjacentLayerStepDb: {
      what: 'RMS of the harder layer minus RMS of the next softer one, per note. Negative means the harder file is quieter.',
      min: Number(steps[0].toFixed(2)),
      median: Number(steps[steps.length >> 1].toFixed(2)),
      max: Number(steps[steps.length - 1].toFixed(2)),
      negative: steps.filter((x) => x < 0).length,
      of: steps.length,
    },
  };
}

if (rows.length === WANT.length) {
  const peaks = rows.map((r) => r.peak).sort((x, y) => x - y);
  writeFileSync(join(OUT, 'PROVENANCE-rhodes.json'), `${JSON.stringify({
    what: 'jRhodes3d, the mono set: a 1977 Rhodes Mark I Stage 73, 15 notes, five velocity layers, trimmed and re-encoded for a browser.',
    author: 'Jeff Learman',
    instrument: '1977 Rhodes Mark I Stage 73, his own, recorded around 2006 directly from the harp connector, with his own EQ on it.',
    source: 'https://github.com/sfzinstruments/jlearman.jRhodes3d, the jRhodes3d-mono directory',
    licence: 'CC BY-NC-SA 4.0, https://creativecommons.org/licenses/by-nc-sa/4.0/ . See LICENSE-jrhodes3d beside these files, which quotes all three of the upstream statements verbatim.',
    derivative: 'These are NOT the author\'s files. Each one is capped at 4 s, faded out over the last 8 ms and re-encoded from 44.1 kHz 16 bit FLAC to AAC in m4a at 96 kbps mono. Share-alike: they carry the same licence.',
    trim: 'MEASURED: the onset is at sample 0 on all 65 sources, so the trim to 5 ms before the onset moved nothing and no fade in was applied to any file. The author had already trimmed to the attack.',
    loops: 'MEASURED: none. This is the unlooped set, and no source file carries a smpl chunk or an APPLICATION block. The looped recording of the same instrument is jRhodes3c.',
    madeBy: 'demo/resources/fetch-jrhodes3d.mjs',
    ffmpeg: execFileSync('ffmpeg', ['-version'], { encoding: 'utf8' }).split('\n')[0],
    encode: {
      codec: ENCODER, bitrate: BITRATE, channels: 1, sampleRate: RATE,
      capSeconds: CAP, leadSeconds: LEAD, fadeInSeconds: FADE_IN, fadeOutSeconds: FADE_OUT,
    },
    notes: NOTES,
    layers: LAYERS,
    layerOrder: 'layer 1 is the HARDEST and layer 5 is the SOFTEST. See velocity.groups.',
    absent: [...ABSENT],
    velocity: sfz(),
    levels: levels(rows),
    totals: {
      files: rows.length,
      bytes: outBytes,
      sourceBytes: rows.reduce((s, r) => s + r.sourceBytes, 0),
      seconds: Number(rows.reduce((s, r) => s + r.seconds, 0).toFixed(2)),
      peakMin: peaks[0],
      peakMedian: peaks[peaks.length >> 1],
      peakMax: peaks[peaks.length - 1],
    },
    taken: new Date().toISOString().slice(0, 10),
    samples: rows,
  }, null, 2)}\n`);
}

const mib = (b) => `${(b / 1048576).toFixed(2)} MiB`;
console.log(`\n${rows.length} of ${WANT.length} outputs, ${kept} kept, ${made} encoded`);
console.log(`${outBytes} bytes, ${mib(outBytes)}, against ${mib(22884538)} of source FLAC`);
if (rows.length) {
  const peaks = rows.map((r) => r.peak).sort((x, y) => x - y);
  const db = (v) => (20 * Math.log10(v)).toFixed(1);
  console.log(`encoded peak: ${peaks[0]} to ${peaks[peaks.length - 1]} of full scale, `
    + `${db(peaks[0])} to ${db(peaks[peaks.length - 1])} dBFS, median ${peaks[peaks.length >> 1]}`);
  console.log(`capped at ${CAP} s: ${rows.filter((r) => r.capped).length} of ${rows.length}`);
}
