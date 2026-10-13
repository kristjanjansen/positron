// What autoplay on /concepts/radio/040/ would play over a recording, the old
// way and the new, offline, with no browser and no station.
//
//   node research/tools/tempo-key/autoplay-chords.mjs <in.f32> [--seq] [--json]
//
// <in.f32> is mono float32 at 44.1 kHz (ffmpeg -ac 1 -ar 44100 -f f32le), our
// R2 recordings decoded once. The key detector is the page's own KEY CORE
// block, lifted out of the HTML as our-key.mjs does, with the AnalyserNode
// re-implemented the same way (Blackman, 32768 points, every 0.1 s). The chord
// choice and the voicing are the page's own module, imported.
//
// The page is followed hop by hop: every 0.1 s the detector sends one event
// with the key reading (renewed every 0.5 s) and its half second chroma, both
// rounded as the page rounds them; autoplay eases that chroma over CHORD_TAU_S;
// a chord is played when autoplay starts, every 4 s after, and at once when the
// key changes. Autoplay is ticked at t = 0, before any key exists.
import { readFileSync, writeFileSync } from 'node:fs';
import { chooseChord, voiceLead, rootPosition, motion, romanOf, chromaEase } from '../../../demo/concepts/radio/040/autoplay.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => a.endsWith('.f32'));
const SEQ = args.includes('--seq'), JSON_OUT = args.includes('--json');
// --opts '{"repeatCost":0,"tau":1.5}' overrides chooseChord's constants (and
// the chroma window), for a sweep; with none, the page's own values run.
const OPTS = (() => { const i = args.indexOf('--opts'); return i >= 0 ? JSON.parse(args[i + 1]) : {}; })();
// --ref <file> is ref-chords.py's essentia chord track: each chord played is
// then graded against the chord essentia names most over the AUTO_S seconds
// it sounds for. Soft truth, not truth (nobody has labelled these recordings,
// and essentia knows only major and minor triads).
const REF = (() => { const i = args.indexOf('--ref'); return i >= 0 ? JSON.parse(readFileSync(args[i + 1], 'utf8')) : null; })();
const PAGE = new URL('../../../demo/concepts/radio/040/index.html', import.meta.url).pathname;
const html = readFileSync(PAGE, 'utf8');
const a = html.indexOf('// KEY CORE BEGIN'), b = html.indexOf('// KEY CORE END');
if (a < 0 || b < 0) throw new Error('KEY CORE not found in ' + PAGE);
const K = new Function(`${html.slice(a, b)}\nreturn { keyCreate, keyFrame, keyRead };`)();
// The page's own constants, read out of it so this cannot drift from them.
const num = (name) => { const m = new RegExp(`\\b${name}\\s*=\\s*([0-9.]+)`).exec(html); if (!m) throw new Error(`${name} not in page`); return +m[1]; };
const AUTO_S = num('AUTO_S'), CHORD_TAU_S = OPTS.tau ?? num('CHORD_TAU_S'), KB_BASE = num('KB_BASE');
const RANGE = { lo: num('PAD_LO'), hi: num('PAD_HI'), home: num('PAD_HOME') };
const OLD_STEPS = [0, 5, 3, 4];

const SR = 44100, N = 32768, HOP_S = 0.1, READ_S = 0.5;
const raw = readFileSync(file);
const x = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength >> 2);
const re = new Float64Array(N), im = new Float64Array(N), win = new Float64Array(N);
for (let i = 0; i < N; i++) win[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / N) + 0.08 * Math.cos(4 * Math.PI * i / N);
const rev = new Uint32Array(N);
for (let i = 0, bits = Math.log2(N); i < N; i++) { let r = 0; for (let j = 0; j < bits; j++) r |= ((i >> j) & 1) << (bits - 1 - j); rev[i] = r; }
const cosT = new Float64Array(N / 2), sinT = new Float64Array(N / 2);
for (let i = 0; i < N / 2; i++) { cosT[i] = Math.cos(2 * Math.PI * i / N); sinT[i] = -Math.sin(2 * Math.PI * i / N); }
function fft() {
  for (let i = 0; i < N; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let size = 2; size <= N; size <<= 1) {
    const half = size >> 1, step = N / size;
    for (let s = 0; s < N; s += size) for (let k = 0; k < half; k++) {
      const wr = cosT[k * step], wi = sinT[k * step], p = s + k, q = p + half;
      const tr = re[q] * wr - im[q] * wi, ti = re[q] * wi + im[q] * wr;
      re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti;
    }
  }
}

// Phase 1, the detector: one event per hop, as the page sends it. Cached
// beside the input as <in>.events.json, because it is the slow half and does
// not depend on anything autoplay does.
const CACHE = `${file}.events.json`;
let events;
try { events = JSON.parse(readFileSync(CACHE, 'utf8')); if (events.page !== html.slice(a, b).length) events = null; } catch { events = null; }
if (!events) {
  const db = new Float32Array(N / 2);
  const s = K.keyCreate(SR, N);
  const hop = Math.round(HOP_S * SR);
  let sound = 0, nextRead = READ_S, last = null;
  const list = [];
  for (let end = hop; end <= x.length; end += hop) {
    for (let i = 0; i < N; i++) { const j = end - N + i; re[i] = j >= 0 ? x[j] * win[i] : 0; im[i] = 0; }
    fft();
    for (let k = 0; k < N / 2; k++) db[k] = 20 * Math.log10(Math.hypot(re[k], im[k]) / N);
    K.keyFrame(s, db, HOP_S);
    sound += HOP_S;
    if (sound >= nextRead - 1e-9) { nextRead += READ_S; last = K.keyRead(s); }
    list.push({ t: +(end / SR).toFixed(3), key: last?.key ?? null, tonic: last?.tonic ?? null, mode: last?.mode ?? null,
      confidence: last ? Math.round(last.confidence * 100) / 100 : null, chroma: [...s.now].map((v) => Math.round(v * 1000) / 1000) });
  }
  events = { page: html.slice(a, b).length, list };
  writeFileSync(CACHE, JSON.stringify(events));
}

// Phase 2, autoplay, receiving those events.
let reading = null, nextTick = 0;
const acc = new Array(12).fill(0);
const oldSeq = [], newSeq = [], KEYS = {};
let oldAt = 0, prevStep = null, prevNotes = null;
function play(t, why) {
  if (!reading) return;
  const { tonic, mode } = reading;
  const ostep = OLD_STEPS[oldAt++ % OLD_STEPS.length];
  KEYS[reading.key] = { tonic, mode };
  oldSeq.push({ t, key: reading.key, step: ostep, roman: romanOf(tonic, mode, ostep), notes: rootPosition(tonic, mode, ostep, KB_BASE) });
  const c = chooseChord(acc, reading, prevStep, OPTS);
  const v = voiceLead(prevNotes, c.pcs, RANGE);
  newSeq.push({ t, key: reading.key, step: c.step, roman: c.roman, how: c.how, why, notes: v.notes, held: v.held,
    rootPos: rootPosition(tonic, mode, c.step, KB_BASE), conf: reading.confidence });
  prevStep = c.step; prevNotes = v.notes;
}
for (const ev of events.list) {
  chromaEase(acc, ev.chroma, HOP_S, CHORD_TAU_S);
  const moved = ev.key && reading?.key !== ev.key;
  if (ev.key) reading = { key: ev.key, tonic: ev.tonic, mode: ev.mode, confidence: ev.confidence };
  if (moved) { oldAt = 0; prevStep = null; play(ev.t, 'key'); }
  if (ev.t >= nextTick - 1e-9) { nextTick += AUTO_S; play(ev.t, 'tick'); }
}

const dur = x.length / SR;
function stats(seq, notesOf) {
  const n = seq.length, first = seq[0]?.t ?? 0, mins = (dur - first) / 60;
  const id = (c) => `${c.key}/${c.step}`;
  let repeats = 0, motionSum = 0, cycle = 0;
  for (let i = 1; i < n; i++) {
    if (id(seq[i]) === id(seq[i - 1])) repeats++;
    motionSum += motion(notesOf(seq[i - 1]), notesOf(seq[i]));
  }
  for (let i = 4; i < n; i++) if (id(seq[i]) === id(seq[i - 4])) cycle++;
  // A two chord see-saw, I vi I vi: the chord two back is this one and the one
  // between is not.
  let seesaw = 0;
  for (let i = 2; i < n; i++) if (id(seq[i]) === id(seq[i - 2]) && id(seq[i]) !== id(seq[i - 1])) seesaw++;
  const perMin = [];
  for (let w = first; w + 60 <= dur; w += 60) perMin.push(new Set(seq.filter((c) => c.t >= w && c.t < w + 60).map(id)).size);
  return { chords: n, perMinute: +(n / mins).toFixed(1), distinctPerMinute: +(perMin.reduce((p, q) => p + q, 0) / perMin.length).toFixed(2),
    distinctAll: new Set(seq.map(id)).size, repeatRate: +(repeats / (n - 1)).toFixed(3), fourBack: +(cycle / (n - 4)).toFixed(3), seesaw: +(seesaw / (n - 2)).toFixed(3),
    motionPerChange: +(motionSum / (n - 1)).toFixed(2) };
}
const PCN = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function refAt(t0, t1) {
  const n = new Map();
  for (const [t, label] of REF.chords) if (t >= t0 && t < t1) n.set(label, (n.get(label) || 0) + 1);
  const top = [...n].sort((p, q) => q[1] - p[1])[0]?.[0];
  if (!top) return null;
  const m = /^([A-G][#b]?)(m?)$/.exec(top); if (!m) return null;
  const r = PCN[m[1]];
  return { label: top, pcs: [r, (r + (m[2] ? 3 : 4)) % 12, (r + 7) % 12] };
}
const pcsOf = (c) => [...new Set(c.notes.map((n) => n % 12))];
function grade(seq) {
  let exact = 0, shared = 0, n = 0;
  for (const c of seq) {
    const ref = refAt(c.t, c.t + AUTO_S);
    if (!ref) continue;
    const mine = pcsOf(c), common = mine.filter((p) => ref.pcs.includes(p)).length;
    n++; shared += common / 3;
    if (common === 3) exact++;
  }
  return { graded: n, exact: +(exact / n).toFixed(3), notesShared: +(shared / n).toFixed(3) };
}
const tonicOnly = newSeq.map((c) => ({ ...c, notes: rootPosition(...(() => { const k = oldSeq.find((o) => o.t === c.t); return [KEYS[k.key].tonic, KEYS[k.key].mode]; })(), 0, KB_BASE) }));
const out = {
  file, seconds: +dur.toFixed(1),
  ...(REF ? { vsEssentia: { old: grade(oldSeq), next: grade(newSeq), alwaysI: grade(tonicOnly) } } : {}),
  old: stats(oldSeq, (c) => c.notes),
  next: stats(newSeq, (c) => c.notes),
  nextRootPosition: stats(newSeq, (c) => c.rootPos).motionPerChange,
  walk: +(newSeq.filter((c) => c.how === 'walk').length / newSeq.length).toFixed(3),
  held: +(newSeq.slice(1).reduce((p, c) => p + c.held, 0) / (newSeq.length - 1)).toFixed(2),
  middle: +(newSeq.reduce((p, c) => p + c.notes[1], 0) / newSeq.length).toFixed(1),
  low: Math.min(...newSeq.map((c) => c.notes[0])), high: Math.max(...newSeq.map((c) => c.notes[2])),
  steps: Object.fromEntries([...newSeq.reduce((m, c) => m.set(c.roman, (m.get(c.roman) || 0) + 1), new Map())].sort((p, q) => q[1] - p[1])),
};
if (JSON_OUT) console.log(JSON.stringify({ ...out, oldSeq, newSeq }));
else {
  console.log(JSON.stringify(out, null, 1));
  if (SEQ) for (const c of newSeq) console.log(`${c.t.toFixed(1).padStart(6)}  ${c.key.padEnd(9)} ${c.roman.padEnd(5)} ${c.how.padEnd(5)} ${c.notes.join(' ')}  held ${c.held}`);
}
