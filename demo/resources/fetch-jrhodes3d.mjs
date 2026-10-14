// Fetches jRhodes3d MONO (22,884,538 bytes, CC BY-NC-SA 4.0, LICENSE in demo/nola/) once into
// tmp/jrhodes3d-mono/ and encodes AAC 96 kbps mono, capped near 4 s, flat into demo/nola/ as
// rhodes-<midi>-<layer>.m4a (the build walks one level). Flags: --check, --encode, --force.
// See lessons/page-resources.md#resources-106

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
 * The author's 15 notes, every 4th white key: worst shift 3 semitones, typical 2.
 * See lessons/page-resources.md#resources-107
 */
const NOTES = [29, 35, 40, 45, 50, 55, 59, 62, 65, 71, 76, 81, 86, 91, 96];

/**
 * Five layers, not on every note: layer 3 stops after MIDI 71 and layer 1 after 76, so 65
 * files; layers 2, 4 and 5 cover all 15.
 * See lessons/page-resources.md#resources-108
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
const LEAD = 0.005;       // seconds kept in front of the onset, where there are any. See lessons/page-resources.md#resources-109
const FADE_IN = 0.003;    // seconds, inside the 2 to 5 ms plan-nola §3.4 asks for
const FADE_OUT = 0.008;   // seconds at the real end of every output
const BITRATE = '96k';
const RATE = 44100;

/**
 * Apple's aac_at, not ffmpeg's aac, which overshot source peaks by up to +4.1 dB; aac_at
 * tracks within 0.1 dB for 1.05 per cent more bytes. macOS only; the fallback is recorded
 * in PROVENANCE-rhodes.json.
 * See lessons/page-resources.md#resources-110
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
 * Decode a whole file to mono 16 bit PCM through a pipe (at most 2.2 MB) into an Int16Array.
 * See lessons/page-resources.md#resources-111
 */
function pcm(file) {
  // Float, not s16le: an AAC decode can exceed full scale and an integer decode clamps it.
  // See lessons/page-resources.md#resources-112
  const buf = ff(['-i', file, '-map', '0:a:0', '-f', 'f32le', '-acodec', 'pcm_f32le',
                  '-ac', '1', '-ar', String(RATE), '-']);
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
}

/**
 * Onset gate: the higher of 1 per cent of the file's peak and 8 times the RMS of its first
 * 20 ms, crossed by a 1 ms moving maximum.
 * See lessons/page-resources.md#resources-113
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
 * Checks there is no loop: 3d has no `smpl` chunk or APPLICATION block. The looped set is
 * jRhodes3c (5,970,448 bytes of source).
 * See lessons/page-resources.md#resources-114
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
    // The source has no black keys; this `replace` guards a changed NOTES from building a 404 URL.
    // See lessons/page-resources.md#resources-115
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
    // An HTML 404 body is not a FLAC: check the magic, not only the status.
    // See lessons/page-resources.md#resources-116
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
   * The cap is rounded down to whole 1024 sample AAC frames (172 frames, 3.9938 s), so the
   * decoded length is exactly 176,128 samples.
   * See lessons/page-resources.md#resources-117
   */
  const FRAME = 1024;
  const room = Math.min(CAP, a.seconds - start);
  const dur = (Math.floor(room * RATE / FRAME) * FRAME) / RATE;
  const end = start + dur;

  /**
   * The fade in is only as long as the kept lead, which is zero on this set (onset at sample
   * 0); a 3 ms fade would take 9.8 dB off the attack of A_062__D4_5.
   * See lessons/page-resources.md#resources-118
   */
  const lead = a.onsetSec - start;
  const fadeIn = Math.min(FADE_IN, lead);

  if (force || !existsSync(dest)) {
    const filter = [
      `atrim=start=${start.toFixed(6)}:end=${end.toFixed(6)}`,
      'asetpts=N/SR/TB',
      ...(fadeIn > 0 ? [`afade=t=in:st=0:d=${fadeIn.toFixed(6)}`] : []),
      // The 8 ms fade out applies whether or not the cap cut anything.
      // See lessons/page-resources.md#resources-119
      `afade=t=out:st=${Math.max(0, dur - FADE_OUT).toFixed(6)}:d=${FADE_OUT}`,
    ].join(',');
    ff(['-y', '-i', from, '-map', '0:a:0', '-af', filter,
        '-c:a', ENCODER, '-b:a', BITRATE, '-ac', '1', '-ar', String(RATE),
        '-movflags', '+faststart', '-map_metadata', '-1', dest]);
    made++;
  } else {
    kept++;
  }

  // Every output is probed and decoded back each run; the encoded peak sets /nola/'s SAMPLE_PEAK.
  // See lessons/page-resources.md#resources-120
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
    // RMS over the first second: the files are roughly peak normalised. See `levelWarning`.
    // See lessons/page-resources.md#resources-121
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
 * The velocity split, parsed from _jRhodes3d-mono-flac.sfz. Layer `_5` is the softest and
 * `_1` the hardest; where a layer stops, the author's regions name the nearest that exists.
 * See lessons/page-resources.md#resources-122
 */
function sfz() {
  // The canonical sfz maps A0 to C8 and writes lovel and hivel on every group.
  // See lessons/page-resources.md#resources-123
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
    // No volume, amp_velcurve or amp_veltrack anywhere (only a master +6 dB): the player supplies
    // level from velocity, as /nola/'s velGain does.
    // See lessons/page-resources.md#resources-124
    levelOpcodes: /\b(amp_velcurve|amp_veltrack)/.test(text) ? 'present, READ THEM' : 'none anywhere',
    masterVolumeDb: Number(text.match(/^volume=(\S+)/m)?.[1] ?? 0),
    licenceLineInThatFile: text.match(/^\/\/ license:.*$/m)?.[0] ?? null,
    groups,
  };
}

/**
 * Level warning: peaks are near full scale, but within a note the hardest layer can be 9.6 dB
 * quieter in RMS than the softest, so level must come from velocity (velGain). Layer switches
 * step RMS by a median 1.5 dB, up to 4.4, so crossfade over `velocity.groups`.
 * See lessons/page-resources.md#resources-125
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
