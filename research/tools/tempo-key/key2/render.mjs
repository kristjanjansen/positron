// Renders autoplay behaviours over a recording, offline, as WAV.
//   node render.mjs <name> <from s> <to s> <bpm>
// The key, its confidence and the half second chroma (`now`) come from the
// page's own KEY CORE run over the cached spectra, read every 0.5 s. The
// voice is a stand-in for the page's pad: two detuned saws through a one pole
// lowpass at 1.2 kHz, 0.5 s in and 1 s out. The level follows the confidence
// as the page does (silent at 0.05, full at 0.35, eased with 3 s).
import { readFileSync, writeFileSync } from 'node:fs';
import { loadCore, run } from './run.mjs';
const [name, A, B, BPM] = process.argv.slice(2);
const from = +A, to = +B, bpm = +BPM, SR = 44100, beat = 60 / bpm, bar = 4 * beat;
const T = (process.env.TK ?? '/tmp/tk') + '/';
const raw = readFileSync(T + name + '.f32'), x = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength >> 2);
const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
// readings every 0.5 s with the now chroma
const R = [];
run(loadCore(true), name, {}, (t, r, s) => R.push({ t, tonic: r.tonic, mode: r.mode, conf: r.confidence, now: Array.from(s.now) }));
const at = (t) => { let o = null; for (const r of R) { if (r.t > t) break; o = r; } return o; };
const N = Math.round((to - from) * SR);
function voiceSynth(events, gain) {
  // events: [{t0, t1, midi, v}] seconds from `from`; summed into a Float32Array
  const y = new Float32Array(N);
  for (const e of events) {
    const f = 440 * 2 ** ((e.midi - 69) / 12), s0 = Math.max(0, Math.round(e.t0 * SR)), s1 = Math.min(N, Math.round((e.t1 + 1) * SR));
    let p1 = 0, p2 = 0, lp = 0; const a = 1 - Math.exp(-2 * Math.PI * 1200 / SR);
    for (let i = s0; i < s1; i++) {
      const t = (i - s0) / SR, held = e.t1 - e.t0;
      const env = t < 0.5 ? t / 0.5 : t < held ? 1 : Math.max(0, 1 - (t - held) / 1);
      p1 = (p1 + f * 1.003 / SR) % 1; p2 = (p2 + f * 0.997 / SR) % 1;
      lp += a * ((p1 * 2 - 1) + (p2 * 2 - 1) - lp);
      y[i] += lp * env * e.v * gain;
    }
  }
  return y;
}
function level() {
  // the page's confidence to level, eased with 3 s, per sample block of 10 ms
  const L = new Float32Array(N); let lv = 0;
  for (let i = 0; i < N; i += 441) {
    const r = at(from + i / SR), c = r?.conf ?? 0, tg = Math.max(0, Math.min(1, (c - 0.05) / 0.3));
    lv += (tg - lv) * (1 - Math.exp(-0.01 / 3));
    for (let j = i; j < Math.min(N, i + 441); j++) L[j] = lv;
  }
  return L;
}
const pcs = (r) => SCALE[r.mode].map((d) => (r.tonic + d) % 12);
const near = (pc, around) => { let best = null; for (let m = around - 12; m <= around + 12; m++) if (((m % 12) + 12) % 12 === pc && (best == null || Math.abs(m - around) < Math.abs(best - around))) best = m; return best; };
const bars = []; for (let t = 0; t < to - from; t += bar) bars.push(t);
const beats = []; for (let t = 0; t < to - from; t += beat) beats.push(t);
const B_ = {};
// 0. the old loop: I vi IV V, 4 s each, root position, from the key's tonic
{ const ev = []; for (let t = 0; t < to - from; t += 4) { const r = at(from + t); if (!r) continue; const st = [0, 5, 3, 4][Math.round(t / 4) % 4], sc = SCALE[r.mode];
  for (const k of [st, st + 2, st + 4]) ev.push({ t0: t, t1: t + 4, midi: 48 + r.tonic + sc[k % 7] + 12 * Math.floor(k / 7), v: 0.25 }); } B_['0-old-loop'] = ev; }
// 1. drone: the tonic, with its fifth quieter, re-struck only when the key moves
{ const ev = []; let cur = null;
  for (let t = 0; t < to - from; t += 0.5) { const r = at(from + t); const id = r ? `${r.tonic} ${r.mode}` : null;
    if (id !== cur?.id) { if (cur) for (const e of cur.ev) e.t1 = t; cur = r ? { id, ev: [{ t0: t, t1: to - from, midi: 36 + r.tonic + (r.tonic > 5 ? 0 : 12), v: 0.45 }, { t0: t, t1: to - from, midi: 43 + r.tonic + (r.tonic > 5 ? 0 : 12), v: 0.2 }] } : null; if (cur) ev.push(...cur.ev); } }
  B_['1-drone'] = ev; }
// 2. the key's notes one at a time: a step-wise walk on the scale, a note every
// two beats, the step that lands on the most sounding pitch class wins
{ const ev = []; let deg = 0;
  for (let i = 0; i < beats.length; i += 2) { const t = beats[i], r = at(from + t); if (!r) continue; const sc = SCALE[r.mode];
    const opts = [-2, -1, 1, 2].map((d) => deg + d).filter((d) => d >= -3 && d <= 9);
    deg = opts.sort((p, q) => r.now[(r.tonic + sc[((q % 7) + 7) % 7]) % 12] - r.now[(r.tonic + sc[((p % 7) + 7) % 7]) % 12])[0];
    ev.push({ t0: t, t1: t + 2 * beat - 0.05, midi: 60 + r.tonic - (r.tonic > 5 ? 12 : 0) + sc[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7), v: 0.3 }); }
  B_['2-scale-walk'] = ev; }
// 3. follower: the strongest in-key pitch class of the last half second, on
// each beat, held while it stays the strongest, in the octave nearest the last
{ const ev = []; let cur = null, last = 62;
  for (const t of beats) { const r = at(from + t); if (!r) continue; const ok = pcs(r); let pc = ok[0];
    for (const p of ok) if (r.now[p] > r.now[pc]) pc = p;
    if (cur && cur.pc === pc) { cur.e.t1 = t + beat; continue; }
    const m = near(pc, last); last = m; cur = { pc, e: { t0: t, t1: t + beat, midi: m, v: 0.32 } }; ev.push(cur.e); }
  B_['3-follower'] = ev; }
// 3b. the same follower deciding only on bar lines, over the last bar's chroma
{ const ev = []; let cur = null, last = 62;
  for (const t of bars) { const r = at(from + t); if (!r) continue; const ok = pcs(r);
    const acc = new Array(12).fill(0); for (const q of R) if (q.t > from + t - bar && q.t <= from + t) for (let i = 0; i < 12; i++) acc[i] += q.now[i];
    let pc = ok[0]; for (const p of ok) if (acc[p] > acc[pc]) pc = p;
    if (cur && cur.pc === pc) { cur.e.t1 = t + bar; continue; }
    const m = near(pc, last); last = m; cur = { pc, e: { t0: t, t1: t + bar, midi: m, v: 0.32 } }; ev.push(cur.e); }
  B_['3b-follower-bars'] = ev; }
// 4. chords chosen by the chroma, voice led, changed on bar lines: the
// diatonic triad whose notes the last bar sounded most (root 1, third 0.8,
// fifth 0.6), kept unless another wins by 10%, voiced nearest the last voicing
{ const ev = []; let held = null, voicing = [55, 60, 64];
  for (const t of bars) { const r = at(from + t); if (!r) continue; const sc = SCALE[r.mode];
    const acc = new Array(12).fill(0); for (const q of R) if (q.t > from + t - bar && q.t <= from + t) for (let i = 0; i < 12; i++) acc[i] += q.now[i];
    const tri = (st) => [st, st + 2, st + 4].map((k) => (r.tonic + sc[k % 7]) % 12);
    const sc_ = (st) => { const [a, b, c] = tri(st); return acc[a] + 0.8 * acc[b] + 0.6 * acc[c]; };
    let best = 0; for (let st = 1; st < 7; st++) if (sc_(st) > sc_(best)) best = st;
    const keep = held && held.key === `${r.tonic}${r.mode}` && sc_(held.st) * 1.1 >= sc_(best);
    const st = keep ? held.st : best;
    const notes = tri(st).map((pc, i) => near(pc, voicing[i])).sort((p, q) => p - q);
    voicing = notes; held = { st, key: `${r.tonic}${r.mode}` };
    for (const m of notes) ev.push({ t0: t, t1: t + bar - 0.05, midi: m, v: 0.22 });
    ev.push({ t0: t, t1: t + bar - 0.05, midi: near(tri(st)[0], 40), v: 0.3 }); }
  B_['4-chroma-chords'] = ev; }
const L = level(), radio = x.subarray(Math.round(from * SR), Math.round(from * SR) + N);
function wav(path, y) {
  const b = Buffer.alloc(44 + N * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + N * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(N * 2, 40);
  for (let i = 0; i < N; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(y[i] * 32767))), 44 + 2 * i);
  writeFileSync(path, b);
}
let rpk = 0; for (const v of radio) rpk = Math.max(rpk, Math.abs(v));
for (const [id, ev] of Object.entries(B_)) {
  const s = voiceSynth(ev, 0.12), y = new Float32Array(N);
  for (let i = 0; i < N; i++) y[i] = 0.5 * radio[i] / rpk + s[i] * L[i];
  wav((process.env.KD2 ?? '/tmp/kd2') + `/wav/${name}-${from}-${id}.wav`, y);
  // how many note starts a minute, and how many land outside what the radio sounds now
  // weak: a sounding note whose pitch class is in the bottom half of the
  // radio's last half second. clash: in the bottom third while a semitone
  // neighbour holds over 12% of it.
  let tot = 0, clash = 0, weak = 0, inChroma = 0;
  for (let t = 0; t < to - from; t += 0.1) {
    const r = at(from + t); if (!r) continue; const S = r.now.reduce((a, b) => a + b, 0) || 1;
    for (const e of ev) if (e.t0 <= t && t < e.t1) {
      const pc = ((e.midi % 12) + 12) % 12, sh = r.now[pc] / S, nb = Math.max(r.now[(pc + 1) % 12], r.now[(pc + 11) % 12]) / S;
      const rank = r.now.filter((v) => v > r.now[pc]).length; tot++; inChroma += sh; if (rank >= 6) weak++; if (rank >= 8 && nb > 0.12) clash++;
    }
  }
  const starts = new Set(ev.map((e) => e.t0.toFixed(2))).size;
  console.log(`| ${name} | ${id} | ${(starts / ((to - from) / 60)).toFixed(0)} | ${(100 * inChroma / tot).toFixed(1)}% | ${(100 * weak / tot).toFixed(0)}% | ${(100 * clash / tot).toFixed(0)}% |`);
}
