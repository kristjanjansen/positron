// Fetches Salamander Grand Piano V3 once (~185 MB) into tmp/salamander/ and encodes web m4a
// and Pi mono FLAC (layers v1 v6 v11 v16, CC BY 3.0). Flags: --check, --encode, --force.
// Outputs go to R2 by hand; no page fetches from GitHub. Plan: plans/plan-piano-samples.md.
// See lessons/page-resources.md#resources-6

import { mkdirSync, existsSync, readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROOT = join(REPO, 'tmp', 'salamander');
const SRC = join(ROOT, 'src');       // gitignored, fetched once
const WEB = join(ROOT, 'web');
const PI = join(ROOT, 'pi');

const REPO_SLUG = 'sfzinstruments/SalamanderGrandPiano';
const RAW = `https://raw.githubusercontent.com/${REPO_SLUG}/master`;
const TREE = `https://api.github.com/repos/${REPO_SLUG}/git/trees/master?recursive=1`;

/** Thirty notes three apart, 21 to 108: the sampler's own grid. */
const NOTES = Array.from({ length: 30 }, (_, i) => 21 + i * 3);
/** Salamander's layer number for each of the four bands. */
const LAYERS = [1, 6, 11, 16];
/** All 88 keys have a release sample. */
const KEYS = Array.from({ length: 88 }, (_, i) => 21 + i);

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** `60` -> `C4`, Salamander's own spelling, sharps included. */
const nameOf = (n) => `${SHARPS[n % 12]}${Math.floor(n / 12) - 1}`;
const pad = (n) => String(n).padStart(3, '0');
const noteOut = (note, layer, ext) => `p${pad(note)}-v${layer}.${ext}`;
const relOut = (key, ext) => `rel${pad(key)}.${ext}`;

// ── the encode, one place ───────────────────────────────────────────────────
const RATE = 48000;
const CAP = 8.0;            // seconds
const LEAD = 0.002;         // seconds kept in front of the onset
const FADE_IN = 0.002;      // seconds
const FADE_OUT_CAP = 1.5;   // seconds, on a note the cap cut
const FADE_OUT_END = 0.008; // seconds, on a note that ended by itself, and on releases
const ONSET_GATE = 0.01;    // of the file's peak
const BITRATE = '96k';
const FRAME = 1024;         // AAC frame, so a capped length decodes back exact

const ENCODER = (() => {
  try {
    const list = execFileSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' });
    if (/^\s*A\S*\s+aac_at\s/m.test(list)) return 'aac_at';
  } catch { /* fall through */ }
  console.log('aac_at is not in this ffmpeg. Falling back to the native aac encoder, which overshoots attacks.');
  return 'aac';
})();

const check = process.argv.includes('--check');
const encodeOnly = process.argv.includes('--encode');
const force = process.argv.includes('--force');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-v', 'error', ...args], { maxBuffer: 1 << 30 });
const probe = (file) => JSON.parse(execFileSync('ffprobe', [
  '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file,
], { encoding: 'utf8', maxBuffer: 1 << 26 }));

/** Decode to interleaved float at 48 kHz with `ch` channels. Float, so an AAC overshoot is seen, not clamped. */
function pcm(file, ch) {
  const buf = ff(['-i', file, '-map', '0:a:0', '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', String(ch), '-ar', String(RATE), '-']);
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
}

/** Peak over both channels, and the onset: the first 1 ms window whose max reaches 1 % of it. */
function analyse(file) {
  const s = pcm(file, 2);
  const frames = s.length / 2;
  let peak = 0;
  for (let i = 0; i < s.length; i++) { const a = Math.abs(s[i]); if (a > peak) peak = a; }
  const gate = peak * ONSET_GATE;
  const win = Math.round(0.001 * RATE);
  let onset = 0;
  outer: for (let f = 0; f < frames; f += win) {
    for (let j = f; j < Math.min(frames, f + win); j++) {
      if (Math.abs(s[2 * j]) >= gate || Math.abs(s[2 * j + 1]) >= gate) { onset = j; break outer; }
    }
  }
  return { peak, onsetSec: onset / RATE, seconds: frames / RATE };
}

/** Peak and first-second RMS of an output, decoded back. */
function measure(file, ch) {
  const s = pcm(file, ch);
  let peak = 0;
  for (let i = 0; i < s.length; i++) { const a = Math.abs(s[i]); if (a > peak) peak = a; }
  const n = Math.min(s.length, RATE * ch);
  let sq = 0;
  for (let i = 0; i < n; i++) sq += s[i] * s[i];
  return { peak: Number(peak.toFixed(4)), rms1s: Number(Math.sqrt(sq / Math.max(1, n)).toFixed(5)) };
}

/** SFZ offsets (samples at 48 kHz) per region for one layer, to cross-check the trim. */
function sfzOffsets(layer) {
  const f = join(SRC, `vel_${String(layer).padStart(2, '0')}.txt`);
  if (!existsSync(f)) return null;
  const out = {};
  for (const m of readFileSync(f, 'utf8').matchAll(/\$OFF(\d+)\s+(\d+)/g)) out[Number(m[1])] = Number(m[2]);
  return out;
}

mkdirSync(SRC, { recursive: true });
mkdirSync(WEB, { recursive: true });
mkdirSync(PI, { recursive: true });

// ── 1. the source files, once ───────────────────────────────────────────────

const WANT_NOTES = [];
for (const note of NOTES) for (const layer of LAYERS) {
  WANT_NOTES.push({ note, layer, src: `${nameOf(note)}v${layer}.flac` });
}
const WANT_RELS = KEYS.map((key) => ({ key, src: `rel${key - 20}.flac` }));
const EXTRA = [
  { src: 'LICENSE', path: 'LICENSE' },
  { src: 'README.md', path: 'README.md' },
  { src: 'Salamander Grand Piano V3.sfz', path: 'Salamander Grand Piano V3.sfz' },
  { src: 'notes.txt', path: 'Data/notes.txt' },
  { src: 'hammer.txt', path: 'Data/hammer.txt' },
  { src: 'tune_ret.txt', path: 'Data/tune_ret.txt' },
  ...LAYERS.map((l) => ({ src: `vel_${String(l).padStart(2, '0')}.txt`, path: `Data/vel_${String(l).padStart(2, '0')}.txt` })),
];
const ALL = [
  ...[...WANT_NOTES, ...WANT_RELS].map((w) => ({ src: w.src, path: `Samples/${w.src}` })),
  ...EXTRA,
];

let fetched = 0, had = 0, srcBytes = 0;

if (!encodeOnly) {
  const treeFile = join(SRC, 'tree.json');
  if (!existsSync(treeFile)) {
    if (check) console.log('  MISSING tree.json, the size listing');
    else {
      const res = await fetch(TREE, { headers: { 'user-agent': 'positron.studio one-time vendor copy' } });
      if (!res.ok) throw new Error(`${TREE} answered ${res.status}`);
      writeFileSync(treeFile, Buffer.from(await res.arrayBuffer()));
    }
  }
  const tree = existsSync(treeFile) ? JSON.parse(readFileSync(treeFile, 'utf8')) : { tree: [] };
  const size = new Map(tree.tree.map((x) => [x.path, x.size]));
  // Every wanted name must be in the listing. A `#` name requested raw asks for
  // `D` and 404s, so this is where a black key would be lost before it is asked for.
  const absent = ALL.filter((w) => !size.has(w.path));
  if (absent.length && tree.tree.length) throw new Error(`not in the tree listing: ${absent.map((w) => w.path).join(', ')}`);
  const todo = ALL.filter((w) => !existsSync(join(SRC, w.src)));
  const ask = todo.reduce((s, w) => s + (size.get(w.path) || 0), 0);
  console.log(`source: ${ALL.length - todo.length} of ${ALL.length} already in tmp/salamander/src/, `
    + `${todo.length} to fetch, ${ask} bytes (${(ask / 1048576).toFixed(1)} MiB) from raw.githubusercontent.com`);
  for (const w of ALL) {
    const dest = join(SRC, w.src);
    if (existsSync(dest)) { had++; srcBytes += statSync(dest).size; continue; }
    if (check) { console.log(`  MISSING SOURCE  ${w.path}`); continue; }
    if (fetched) await sleep(1000);   // once, a second apart, and never again
    const url = `${RAW}/${w.path.split('/').map(encodeURIComponent).join('/')}`;
    const res = await fetch(url, { headers: { 'user-agent': 'positron.studio one-time vendor copy' } });
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // An HTML 404 body or a Git LFS pointer is a valid file and an invalid FLAC.
    if (w.src.endsWith('.flac') && buf.subarray(0, 4).toString('latin1') !== 'fLaC') {
      throw new Error(`${url} answered ${buf.length} bytes that do not begin fLaC`);
    }
    if (size.has(w.path) && size.get(w.path) !== buf.length) {
      throw new Error(`${url} answered ${buf.length} bytes, the listing says ${size.get(w.path)}`);
    }
    writeFileSync(dest, buf);
    srcBytes += buf.length;
    fetched++;
    console.log(`  fetched ${w.src.padEnd(32)} ${String(buf.length).padStart(9)} bytes`);
  }
  console.log(`source: ${had} already here, ${fetched} fetched, ${srcBytes} bytes in tmp/salamander/src/`);
}

// ── 2. the encode ───────────────────────────────────────────────────────────

const notesRows = [];
const relRows = [];
let made = 0, kept = 0;

function encode(from, dests, filter) {
  const [web, pi] = dests;
  if (force || !existsSync(web)) {
    ff(['-y', '-i', from, '-map', '0:a:0', '-af', filter, '-c:a', ENCODER, '-b:a', BITRATE, '-ac', '2',
        '-ar', String(RATE), '-movflags', '+faststart', '-map_metadata', '-1', web]);
    made++;
  } else kept++;
  if (force || !existsSync(pi)) {
    ff(['-y', '-i', from, '-map', '0:a:0', '-af', filter, '-c:a', 'flac', '-sample_fmt', 's16', '-ac', '1',
        '-ar', String(RATE), '-map_metadata', '-1', pi]);
    made++;
  } else kept++;
}

const offsets = Object.fromEntries(LAYERS.map((l) => [l, sfzOffsets(l)]));

for (const w of WANT_NOTES) {
  const from = join(SRC, w.src);
  const web = join(WEB, noteOut(w.note, w.layer, 'm4a'));
  const pi = join(PI, noteOut(w.note, w.layer, 'flac'));
  if (check) { console.log(`  ${existsSync(from) ? 'src' : 'NO SRC'}  ${existsSync(web) ? 'web' : 'NO WEB'}  ${existsSync(pi) ? 'pi' : 'NO PI'}  ${w.src}`); continue; }
  if (!existsSync(from)) throw new Error(`${from} is not here. Run without --encode to fetch it.`);
  const a = analyse(from);
  const start = Math.max(0, a.onsetSec - LEAD);
  const room = Math.min(CAP, a.seconds - start);
  const capped = a.seconds - start > CAP;
  const dur = (Math.floor(room * RATE / FRAME) * FRAME) / RATE;
  const fadeIn = Math.min(FADE_IN, a.onsetSec - start);
  const fadeOut = capped ? FADE_OUT_CAP : FADE_OUT_END;
  const filter = [
    `atrim=start=${start.toFixed(6)}:end=${(start + dur).toFixed(6)}`,
    'asetpts=N/SR/TB',
    ...(fadeIn > 0 ? [`afade=t=in:st=0:d=${fadeIn.toFixed(6)}`] : []),
    `afade=t=out:st=${Math.max(0, dur - fadeOut).toFixed(6)}:d=${fadeOut}`,
  ].join(',');
  encode(from, [web, pi], filter);
  const region = NOTES.indexOf(w.note) + 1;
  const sfzOff = offsets[w.layer]?.[region] ?? null;
  const mw = measure(web, 2), mp = measure(pi, 1);
  notesRows.push({
    note: w.note, name: nameOf(w.note), layer: w.layer,
    web: noteOut(w.note, w.layer, 'm4a'), webBytes: statSync(web).size, webPeak: mw.peak, webRms1s: mw.rms1s,
    pi: noteOut(w.note, w.layer, 'flac'), piBytes: statSync(pi).size, piPeak: mp.peak, piRms1s: mp.rms1s,
    seconds: Number(Number(probe(web).format.duration).toFixed(3)),
    sourceFile: w.src, sourceBytes: statSync(from).size, sourceSeconds: Number(a.seconds.toFixed(3)),
    sourcePeak: Number(a.peak.toFixed(4)),
    onsetMs: Number((a.onsetSec * 1000).toFixed(2)), trimmedAtMs: Number((start * 1000).toFixed(2)),
    sfzOffsetMs: sfzOff == null ? null : Number((sfzOff / RATE * 1000).toFixed(2)),
    capped,
    sha256Web: createHash('sha256').update(readFileSync(web)).digest('hex'),
  });
}

for (const w of WANT_RELS) {
  const from = join(SRC, w.src);
  const web = join(WEB, relOut(w.key, 'm4a'));
  const pi = join(PI, relOut(w.key, 'flac'));
  if (check) { if (!existsSync(web) || !existsSync(pi)) console.log(`  MISSING OUTPUT  ${relOut(w.key, '*')}`); continue; }
  if (!existsSync(from)) throw new Error(`${from} is not here. Run without --encode to fetch it.`);
  const a = analyse(from);
  const dur = (Math.floor(a.seconds * RATE / FRAME) * FRAME) / RATE;
  const filter = [`atrim=start=0:end=${dur.toFixed(6)}`, 'asetpts=N/SR/TB',
    `afade=t=out:st=${Math.max(0, dur - FADE_OUT_END).toFixed(6)}:d=${FADE_OUT_END}`].join(',');
  encode(from, [web, pi], filter);
  const mw = measure(web, 2), mp = measure(pi, 1);
  relRows.push({
    key: w.key, web: relOut(w.key, 'm4a'), webBytes: statSync(web).size, webPeak: mw.peak,
    pi: relOut(w.key, 'flac'), piBytes: statSync(pi).size, piPeak: mp.peak,
    seconds: Number(a.seconds.toFixed(3)), sourceFile: w.src, sourceBytes: statSync(from).size,
  });
}

if (check) {
  const n = (d, ext) => readdirSync(d).filter((f) => f.endsWith(ext)).length;
  const want = WANT_NOTES.length + WANT_RELS.length;
  console.log(`\nweb ${n(WEB, '.m4a')} of ${want}, pi ${n(PI, '.flac')} of ${want}`);
  process.exit(n(WEB, '.m4a') === want && n(PI, '.flac') === want ? 0 : 1);
}

// ── 3. the licence and the record, in both folders ──────────────────────────

const LICENCE = `Salamander Grand Piano V3 by Alexander Holm, a Yamaha C5, licensed CC BY 3.0
(https://creativecommons.org/licenses/by/3.0/). Source:
https://github.com/sfzinstruments/SalamanderGrandPiano (retuned SFZ by
Markus Fiedler, mapping by kinwie). These files are trimmed, capped at 8 s,
faded, and re-encoded (AAC in web/, mono 16 bit FLAC in pi/); they are not the
author's originals.

The author's page (rytmenpinne.wordpress.com/sounds-and-such/salamander-grandpiano/)
says the set has been public domain since 4.3.2022. Attribution is given here
either way.

Four of the sixteen velocity layers (v1, v6, v11, v16) of the 30 notes, and
the 88 key-off release samples. Made by demo/resources/fetch-salamander.mjs in
https://github.com/kristjanjansen/positron.
`;

const sum = (rows, k) => rows.reduce((s, r) => s + r[k], 0);
const v16Web = notesRows.filter((r) => r.layer === 16).map((r) => r.webPeak);
const v16Pi = notesRows.filter((r) => r.layer === 16).map((r) => r.piPeak);
const byLayer = Object.fromEntries(LAYERS.map((l) => {
  const r = notesRows.filter((x) => x.layer === l);
  const peaks = r.map((x) => x.webPeak).sort((a, b) => a - b);
  return [`v${l}`, { files: r.length, webBytes: sum(r, 'webBytes'), piBytes: sum(r, 'piBytes'),
    webPeakMin: peaks[0], webPeakMedian: peaks[peaks.length >> 1], webPeakMax: peaks.at(-1) }];
}));
const onsetDiff = notesRows.filter((r) => r.sfzOffsetMs != null).map((r) => r.onsetMs - r.sfzOffsetMs).sort((a, b) => a - b);

const prov = {
  what: 'Salamander Grand Piano V3, four velocity layers of thirty notes and the 88 release samples, trimmed and re-encoded for the positron sampler.',
  author: 'Alexander Holm',
  instrument: 'Yamaha C5, two AKG C414 AB about 12 cm over the strings',
  source: 'https://github.com/sfzinstruments/SalamanderGrandPiano, Samples/, fetched from raw.githubusercontent.com',
  licence: 'CC BY 3.0, https://creativecommons.org/licenses/by/3.0/ . See LICENSE-salamander beside these files.',
  derivative: 'These are NOT the author\'s files: trimmed to 2 ms before the onset, faded in over 2 ms, capped at 8 s with a 1.5 s fade (or an 8 ms fade at the natural end), re-encoded.',
  madeBy: 'demo/resources/fetch-salamander.mjs',
  ffmpeg: execFileSync('ffmpeg', ['-version'], { encoding: 'utf8' }).split('\n')[0],
  encode: {
    web: { codec: ENCODER, bitrate: BITRATE, channels: 2, sampleRate: RATE, container: 'm4a' },
    pi: { codec: 'flac', sampleFormat: 's16', channels: 1, sampleRate: RATE },
    capSeconds: CAP, leadSeconds: LEAD, fadeInSeconds: FADE_IN, fadeOutCappedSeconds: FADE_OUT_CAP,
    fadeOutNaturalSeconds: FADE_OUT_END, onsetGate: `${ONSET_GATE * 100} % of the file's peak, either channel`,
    releases: 'not trimmed; Salamander plays them from sample 0',
  },
  bands: [
    { layer: 1, velocity: [1, 40] }, { layer: 6, velocity: [41, 72] },
    { layer: 11, velocity: [73, 104] }, { layer: 16, velocity: [105, 127] },
  ],
  release: { key: 'relN in the source is key 20 + N', volumeDb: -37, ampVeltrack: 82, rtDecayDbPerSec: 2,
    from: 'Data/hammer.txt' },
  notes: NOTES,
  peak: {
    what: 'The loudest v16 file, decoded back. The sampler normalises the whole set by ONE number (plan section 4.2).',
    web: Math.max(...v16Web), pi: Math.max(...v16Pi),
  },
  onsetAgainstSfzOffsetMs: onsetDiff.length ? {
    what: 'onset found here minus the SFZ offset for the same file, in ms. Negative means our onset is earlier.',
    min: Number(onsetDiff[0].toFixed(2)), median: Number(onsetDiff[onsetDiff.length >> 1].toFixed(2)),
    max: Number(onsetDiff.at(-1).toFixed(2)),
  } : null,
  byLayer,
  totals: {
    notes: notesRows.length, releases: relRows.length,
    webBytes: sum(notesRows, 'webBytes') + sum(relRows, 'webBytes'),
    webNoteBytes: sum(notesRows, 'webBytes'), webReleaseBytes: sum(relRows, 'webBytes'),
    piBytes: sum(notesRows, 'piBytes') + sum(relRows, 'piBytes'),
    piNoteBytes: sum(notesRows, 'piBytes'), piReleaseBytes: sum(relRows, 'piBytes'),
    noteSeconds: Number(notesRows.reduce((s, r) => s + r.seconds, 0).toFixed(2)),
    sourceBytes: sum(notesRows, 'sourceBytes') + sum(relRows, 'sourceBytes'),
    capped: notesRows.filter((r) => r.capped).length,
  },
  taken: new Date().toISOString().slice(0, 10),
  samples: notesRows,
  releases: relRows,
};

for (const d of [WEB, PI]) {
  writeFileSync(join(d, 'LICENSE-salamander'), LICENCE);
  writeFileSync(join(d, 'PROVENANCE-salamander.json'), `${JSON.stringify(prov, null, 2)}\n`);
}

const dirBytes = (d) => readdirSync(d).reduce((s, f) => s + statSync(join(d, f)).size, 0);
const first = notesRows.find((r) => r.note === 60 && r.layer === 11);
console.log(`\n${notesRows.length} notes and ${relRows.length} releases, ${made} files encoded, ${kept} kept`);
console.log(`web/ ${dirBytes(WEB)} bytes (notes ${prov.totals.webNoteBytes}, releases ${prov.totals.webReleaseBytes})`);
console.log(`pi/  ${dirBytes(PI)} bytes (notes ${prov.totals.piNoteBytes}, releases ${prov.totals.piReleaseBytes})`);
console.log(`first note at velocity 100, p060-v11: web ${first?.webBytes} bytes, pi ${first?.piBytes} bytes`);
console.log(`set peak (loudest v16): web ${prov.peak.web}, pi ${prov.peak.pi}`);
console.log(`capped at ${CAP} s: ${prov.totals.capped} of ${notesRows.length}`);
if (prov.onsetAgainstSfzOffsetMs) console.log(`onset minus SFZ offset, ms: ${JSON.stringify(prov.onsetAgainstSfzOffsetMs)}`);
