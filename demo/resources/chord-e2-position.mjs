// EXPERIMENT 2. "Not moving anywhere": is position in the form real signal, and
// is it being discarded?
//
// `demo/resources/chord-corpus.mjs` reads a jazz chord with
// `/^[0-9.]+(.*)$/` and keeps only group 1's TAIL, so the Humdrum recip
// duration that starts every line is dropped at the first regex. Sections are
// read for the expansion order and then flattened. This re-parses keeping both.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readRoot, classOf, sym } from './chord-corpus.mjs';
import { X, hash, ranked, pct, f } from './chord-exp-lib.mjs';

const NAMES = { 0: 'I', 1: 'bII', 2: 'II', 3: 'bIII', 4: 'III', 5: 'IV', 6: 'bV', 7: 'V', 8: 'bVI', 9: 'VI', 10: 'bVII', 11: 'VII' };
const pretty = (s) => { const m = /^(\d+)(.+)$/.exec(s); return m ? `${NAMES[m[1]]}${m[2] === 'maj' ? '' : m[2]}` : s; };

/** Humdrum recip into beats of the stated metre. `1` is a whole, `2.` a dotted half. */
function beats(recip, beatsPerBar) {
  const dots = (recip.match(/\./g) || []).length;
  const n = parseFloat(recip);
  if (!n) return null;
  let v = 4 / n;                      // in quarter notes
  let add = v;
  for (let i = 0; i < dots; i++) { add /= 2; v += add; }
  return v;
}

function irbChord(t) {
  let s = String(t).trim();
  if (!s || s === 'r' || s === '.') return null;
  const r = readRoot(s, '-');
  if (!r) return null;
  s = s.slice(r.used);
  if (s.startsWith(':')) s = s.slice(1);
  const slash = s.indexOf('/');
  if (slash >= 0) s = s.slice(0, slash);
  const cls = classOf(s);
  if (!cls) return null;
  return { pc: r.pc, cls };
}

/** iRb keeping duration, bar number and section. */
function parseFull(text) {
  const lines = text.split(/\r?\n/);
  let tonic = null, order = null, cur = null, bpb = 4;
  const sections = new Map();
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('!')) continue;
    if (line.startsWith('*')) {
      const key = /^\*([A-Ga-g][-#]*):$/.exec(line);
      if (key) { const r = readRoot(key[1], '-'); if (r) tonic = r.pc; continue; }
      const m = /^\*M(\d+)\/(\d+)$/.exec(line);
      if (m) { bpb = Number(m[1]) * (4 / Number(m[2])); continue; }
      const exp = /^\*>\[(.+)\]$/.exec(line);
      if (exp) { order = exp[1].split(',').map((s) => s.trim()); continue; }
      const sec = /^\*>(.+)$/.exec(line);
      if (sec) { cur = sec[1].trim(); if (!sections.has(cur)) sections.set(cur, []); continue; }
      continue;
    }
    if (line.startsWith('=')) continue;
    const tok = /^([0-9.]+)(.*)$/.exec(line);
    if (!tok) continue;
    const c = irbChord(tok[2]);
    if (!c) continue;
    const b = beats(tok[1], bpb);
    if (cur !== null) sections.get(cur).push({ ...c, beats: b });
  }
  if (tonic === null || !order || !sections.size) return null;
  // expand, tagging each event with its position inside its section
  const seq = [];
  for (const label of order) {
    const s = sections.get(label);
    if (!s) continue;
    let pos = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      const e = { ...c, section: label, i, left: s.length - 1 - i, bar: pos / bpb, bpb };
      pos += c.beats || bpb;
      seq.push(e);
    }
  }
  return { tonic, seq, bpb };
}

const songs = [];
const dir = join(X, 'irb', 'iRb_v1-0');
for (const fn of readdirSync(dir).filter((n) => n.endsWith('.jazz'))) {
  const p = parseFull(readFileSync(join(dir, fn), 'utf8'));
  if (!p || p.seq.length < 8) continue;
  // collapse immediate repeats the way toSymbols does, keeping the LAST event's position
  const out = [];
  for (const e of p.seq) {
    const s = sym((((e.pc - p.tonic) % 12) + 12) % 12, e.cls);
    if (out.length && out[out.length - 1].s === s) { out[out.length - 1].beats += (e.beats || 0); out[out.length - 1].left = e.left; continue; }
    out.push({ s, beats: e.beats || 0, section: e.section, left: e.left, bar: e.bar, bpb: e.bpb });
  }
  if (out.length >= 4) songs.push({ id: fn, seq: out });
}

console.log(`parsed ${songs.length} jazz songs keeping duration, section and position`);

// ── 1. is the harmonic rhythm varied at all ────────────────────────────────
const dur = new Map();
let tot = 0;
for (const s of songs) for (const e of s.seq) { dur.set(e.beats, (dur.get(e.beats) || 0) + 1); tot++; }
console.log(`\n-- how long a chord lasts, in quarter notes, over ${tot} events`);
console.log('   ' + ranked(dur).slice(0, 8).map(([b, n]) => `${b} beats ${pct(n, tot)}%`).join(', '));

// ── 2. does the next chord depend on where you are in the section ──────────
const train = songs.filter((s) => (hash(s.id) % 1000) >= 200);
const test = songs.filter((s) => (hash(s.id) % 1000) < 200);

const bump = (m, k, n) => { let d = m.get(k); if (!d) m.set(k, d = new Map()); d.set(n, (d.get(n) || 0) + 1); };
const plain = new Map(), withPos = new Map(), uni = new Map();
const bucket = (left) => (left === 0 ? 'end' : left === 1 ? 'pre' : 'mid');
for (const s of train) for (let i = 2; i < s.seq.length; i++) {
  const ctx = `${s.seq[i - 2].s}|${s.seq[i - 1].s}`;
  bump(plain, ctx, s.seq[i].s);
  bump(withPos, `${ctx}@${bucket(s.seq[i - 1].left)}`, s.seq[i].s);
  uni.set(s.seq[i].s, (uni.get(s.seq[i].s) || 0) + 1);
}

// the cadence question, stated as two distributions
const atEnd = new Map(), atMid = new Map();
for (const s of songs) for (let i = 1; i < s.seq.length; i++) {
  const m = s.seq[i - 1].left === 0 ? atEnd : atMid;
  m.set(s.seq[i].s, (m.get(s.seq[i].s) || 0) + 1);
}
const show = (name, m) => {
  const t = [...m.values()].reduce((a, b) => a + b, 0);
  console.log(`   ${name.padEnd(28)} ${ranked(m).slice(0, 6).map(([s, n]) => `${pretty(s)} ${pct(n, t)}%`).join(', ')}`);
};
console.log(`\n-- what follows a chord that ENDS a section, against one in the middle`);
show('after a section-final chord', atEnd);
show('after a mid-section chord', atMid);
const ent = (m) => { const t = [...m.values()].reduce((a, b) => a + b, 0); let h = 0; for (const n of m.values()) { const p = n / t; h -= p * Math.log2(p); } return h; };
console.log(`   entropy at a section end ${f(ent(atEnd), 2)} bits, mid-section ${f(ent(atMid), 2)} bits`);

// ── 3. does knowing it help predict ────────────────────────────────────────
const best = (m, k) => { const d = m.get(k); if (!d) return null; return ranked(d)[0][0]; };
let n = 0, hitPlain = 0, hitPos = 0, posCovered = 0;
for (const s of test) for (let i = 2; i < s.seq.length; i++) {
  const ctx = `${s.seq[i - 2].s}|${s.seq[i - 1].s}`;
  const want = s.seq[i].s;
  n++;
  const p = best(plain, ctx);
  if (p === want) hitPlain++;
  const q = best(withPos, `${ctx}@${bucket(s.seq[i - 1].left)}`);
  if (q !== null) posCovered++;
  const chosen = q !== null ? q : p;
  if (chosen === want) hitPos++;
}
console.log(`\n-- top 1 on ${n} held-out contexts`);
console.log(`   trigram, as shipped                    ${pct(hitPlain, n)}%`);
console.log(`   trigram told where it is in the section ${pct(hitPos, n)}%   (the position key covered ${pct(posCovered, n)}% of contexts)`);
