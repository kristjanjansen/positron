// EXPERIMENT 5. "figure out my playing pattern ... move on with in my vibe".
// Two questions, both answerable off the cached corpus and neither of them
// answerable by reasoning.
//
//  A. Is a person's OWN harmonic habit a real, learnable thing, or noise?
//     iRb names a composer on every chart. 51 of them have 5 charts or more,
//     643 charts in all. Leave one chart out, and ask whether that composer's
//     OTHER charts predict it better than the world does.
//  B. How much playing is enough? Adapt on the first N chords of a piece and
//     predict the rest, sweeping N.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseIrb, toSymbols } from './chord-corpus.mjs';
import { X, ranked, pct, f } from './chord-exp-lib.mjs';

const dir = join(X, 'irb', 'iRb_v1-0');
const songs = [];
for (const fn of readdirSync(dir).filter((n) => n.endsWith('.jazz'))) {
  const text = readFileSync(join(dir, fn), 'utf8');
  const p = parseIrb(text);
  if (p.tonic === null || p.chords.length < 8) continue;
  const s = toSymbols(p.chords, p.tonic);
  if (s.length < 12) continue;
  const com = /^!!!COM:\s*(.+)$/m.exec(text)?.[1]?.trim() || null;
  songs.push({ id: fn, com, seq: s.map((e) => e.s) });
}
const byCom = new Map();
for (const s of songs) if (s.com) { let a = byCom.get(s.com); if (!a) byCom.set(s.com, a = []); a.push(s); }
console.log(`${songs.length} charts, ${byCom.size} named composers`);

/* ── counting that can be added to and taken away from ─────────────────────── */
function blank() { return { uni: new Map(), bi: new Map(), tri: new Map(), total: 0 }; }
function addSeq(c, seq, w = 1) {
  const bump = (m, k, n) => { let d = m.get(k); if (!d) m.set(k, d = new Map()); d.set(n, (d.get(n) || 0) + w); };
  for (let i = 0; i < seq.length; i++) {
    c.uni.set(seq[i], (c.uni.get(seq[i]) || 0) + w); c.total += w;
    if (i >= 1) bump(c.bi, seq[i - 1], seq[i]);
    if (i >= 2) bump(c.tri, `${seq[i - 2]}|${seq[i - 1]}`, seq[i]);
  }
}
const world = blank();
for (const s of songs) addSeq(world, s.seq);

/** P(next | ctx) with backoff, out of a counts object. */
function dist(c, a, b) {
  let d = (a !== undefined && b !== undefined) ? c.tri.get(`${a}|${b}`) : null;
  let tot = d ? [...d.values()].reduce((x, y) => x + y, 0) : 0;
  if (!d || tot < 4) { d = b !== undefined ? c.bi.get(b) : null; tot = d ? [...d.values()].reduce((x, y) => x + y, 0) : 0; }
  if (!d) return null;
  return { d, tot };
}

/** Argmax of a world model with a personal model mixed in at weight lambda. */
function pick(w, wSub, p, a, b, lambda) {
  const W = dist(w, a, b), P = p ? dist(p, a, b) : null;
  const sub = wSub ? dist(wSub, a, b) : null;
  const keys = new Set();
  if (W) for (const k of W.d.keys()) keys.add(k);
  if (P) for (const k of P.d.keys()) keys.add(k);
  if (!keys.size) return null;
  let bestK = null, bestV = -Infinity;
  for (const k of keys) {
    // leave-one-out: take this song's own contribution back out of the world
    let wn = W ? (W.d.get(k) || 0) : 0, wt = W ? W.tot : 0;
    if (sub) { wn -= (sub.d.get(k) || 0); wt -= sub.tot; }
    const pw = wt > 0 ? wn / wt : 0;
    const pp = P ? (P.d.get(k) || 0) / P.tot : 0;
    const v = (1 - lambda) * pw + lambda * pp;
    if (v > bestV) { bestV = v; bestK = k; }
  }
  return bestV > 0 ? bestK : null;
}

/* ── A. does a composer's own habit predict ───────────────────────────────── */
console.log(`\n${'='.repeat(78)}\nA. LEAVE ONE CHART OUT, and ask whether the same composer's other charts help`);
const MIN = 8;
const coms = [...byCom].filter(([, a]) => a.length >= MIN).sort((a, b) => b[1].length - a[1].length);
console.log(`   ${coms.length} composers with ${MIN} charts or more, ${coms.reduce((a, [, x]) => a + x.length, 0)} charts`);
console.log(`\n   lambda   top 1    against world-only`);
const base = {};
for (const lambda of [0, 0.1, 0.2, 0.3, 0.5, 0.7, 1.0]) {
  let n = 0, hit = 0;
  for (const [, charts] of coms) {
    for (const s of charts) {
      const self = blank(); addSeq(self, s.seq);
      const own = blank();
      for (const o of charts) if (o.id !== s.id) addSeq(own, o.seq);
      for (let i = 2; i < s.seq.length; i++) {
        const g = pick(world, self, own, s.seq[i - 2], s.seq[i - 1], lambda);
        n++;
        if (g === s.seq[i]) hit++;
      }
    }
  }
  if (lambda === 0) base.v = 100 * hit / n;
  const v = 100 * hit / n;
  console.log(`   ${String(lambda).padEnd(8)}${f(v, 2).padStart(6)}%  ${(v - base.v >= 0 ? '+' : '') + f(v - base.v, 2)} points   (${n} contexts)`);
}

/* ── the control: a WRONG composer's charts, which must not help ──────────── */
console.log(`\n   NEGATIVE CONTROL: the same amount of somebody ELSE's music, lambda 0.3`);
{
  let n = 0, hit = 0;
  for (let ci = 0; ci < coms.length; ci++) {
    const [, charts] = coms[ci];
    const [, other] = coms[(ci + 1) % coms.length];
    for (const s of charts) {
      const self = blank(); addSeq(self, s.seq);
      const wrong = blank();
      for (let k = 0; k < charts.length - 1 && k < other.length; k++) addSeq(wrong, other[k].seq);
      for (let i = 2; i < s.seq.length; i++) {
        const g = pick(world, self, wrong, s.seq[i - 2], s.seq[i - 1], 0.3);
        n++; if (g === s.seq[i]) hit++;
      }
    }
  }
  console.log(`   somebody else's charts at lambda 0.3   ${f(100 * hit / n, 2)}%  (${n} contexts)`);
}

/* ── B. how much playing is enough ────────────────────────────────────────── */
console.log(`\n${'='.repeat(78)}\nB. ADAPT ON THE FIRST N CHORDS OF A PIECE, then predict the rest of it`);
console.log(`   N      top 1 on the rest   world-only on the same contexts`);
for (const N of [8, 16, 32, 64, 128]) {
  let n = 0, hit = 0, hit0 = 0;
  for (const s of songs) {
    if (s.seq.length < N + 12) continue;
    const self = blank(); addSeq(self, s.seq);
    const seen = blank(); addSeq(seen, s.seq.slice(0, N));
    for (let i = N + 2; i < s.seq.length; i++) {
      const g = pick(world, self, seen, s.seq[i - 2], s.seq[i - 1], 0.3);
      const g0 = pick(world, self, null, s.seq[i - 2], s.seq[i - 1], 0);
      n++; if (g === s.seq[i]) hit++; if (g0 === s.seq[i]) hit0++;
    }
  }
  console.log(`   ${String(N).padEnd(7)}${f(100 * hit / n, 2).padStart(8)}%${f(100 * hit0 / n, 2).padStart(23)}%   (${n} contexts)`);
}
