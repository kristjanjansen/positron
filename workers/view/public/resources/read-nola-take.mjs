// Reads raw note timing off a /nola/ take: roll time, held versus passing chord gap, and
// whether LEARN_GATE (400 ms) sits in that gap. Reports distributions, not averages.
// Run: node demo/resources/read-nola-take.mjs ~/Downloads/nola-take-*.json
// See lessons/page-resources.md#resources-19

import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: node demo/resources/read-nola-take.mjs <take.json>');
  process.exit(1);
}
const doc = JSON.parse(readFileSync(path, 'utf8'));
const ev = doc.events || [];
if (!ev.length) { console.error('that take has no messages in it'); process.exit(1); }

const span = (ev[ev.length - 1].t - ev[0].t) / 1000;
console.log(`${ev.length} messages over ${span.toFixed(1)} s`);
console.log(`recorded ${doc.when}, instrument ${doc.instrument}, transpose ${doc.transpose}`);
console.log(`the page's guesses at the time: ${JSON.stringify(doc.gate)}\n`);

/* ── 1. how long a note is held ────────────────────────────────────────── */
const downAt = new Map();
const holds = [];
for (const e of ev) {
  if (e.on !== undefined) downAt.set(e.on, e.t);
  else if (e.off !== undefined && downAt.has(e.off)) {
    holds.push(e.t - downAt.get(e.off));
    downAt.delete(e.off);
  }
}
const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0;
};
console.log(`${holds.length} notes held, in ms:`);
for (const p of [0.05, 0.25, 0.5, 0.75, 0.95]) {
  console.log(`  ${(p * 100).toFixed(0).padStart(3)}th percentile  ${pct(holds, p)}`);
}

/* ── 2. how spread a chord is, which is what the settle window has to cover ── */
const ons = ev.filter((e) => e.on !== undefined);
const gaps = [];
for (let i = 1; i < ons.length; i++) gaps.push(ons[i].t - ons[i - 1].t);
/* A gap inside a chord is a small one and a gap between chords is a large one,
   and the SHAPE of this list is what says whether those are two populations at
   all. If there is no valley between them, no settle window separates them. */
console.log(`\ngaps between one note on and the next, in ms:`);
for (const p of [0.1, 0.25, 0.5, 0.75, 0.9, 0.98]) {
  console.log(`  ${(p * 100).toFixed(0).padStart(3)}th percentile  ${pct(gaps, p)}`);
}
const buckets = [0, 20, 40, 60, 80, 120, 200, 400, 800, 1600, 1e9];
console.log('  histogram:');
for (let i = 0; i < buckets.length - 1; i++) {
  const n = gaps.filter((g) => g >= buckets[i] && g < buckets[i + 1]).length;
  if (n) console.log(`    ${String(buckets[i]).padStart(5)} to `
    + `${String(buckets[i + 1] === 1e9 ? 'up' : buckets[i + 1]).padEnd(5)} ${'#'.repeat(Math.ceil(n / 2))} ${n}`);
}

/* ── 3. the gate, swept against this take ──────────────────────────────── */
/* What the page would have counted as an arrival at each candidate floor. A
   floor that admits everything and a floor that admits nothing are both useless,
   and the take says where between them anything changes. */
console.log(`\nwhat each floor would count as an arrival, out of ${holds.length} notes:`);
for (const gate of [0, 100, 200, 300, 400, 600, 800, 1200]) {
  const kept = holds.filter((h) => h >= gate).length;
  console.log(`  ${String(gate).padStart(4)} ms  ${String(kept).padStart(4)} kept  `
    + `${(100 * kept / holds.length).toFixed(0)}%`);
}

/* ── 4. is there a gap between held and passed at all ───────────────────── */
/* If a real take has no valley between passing and held chords, no gate value works.
   See lessons/page-resources.md#resources-20 */
const lo = pct(holds, 0.25), hi = pct(holds, 0.75);
const valley = [];
for (let ms = 50; ms <= 1500; ms += 50) {
  const n = holds.filter((h) => h >= ms && h < ms + 50).length;
  valley.push({ ms, n });
}
const peakN = Math.max(...valley.map((v) => v.n));
console.log(`\nhold time distribution, 50 ms buckets, tallest is ${peakN}:`);
for (const v of valley) {
  if (v.n) console.log(`  ${String(v.ms).padStart(4)}  ${'#'.repeat(Math.ceil(12 * v.n / peakN))} ${v.n}`);
}
console.log(`\nquartiles ${lo} and ${hi} ms, a spread of ${(hi / Math.max(1, lo)).toFixed(1)}x.`);
console.log(hi / Math.max(1, lo) > 4
  ? 'Two populations that far apart leave room for a floor between them.'
  : 'THAT IS NOT A FACTOR OF TEN. The research assumed one and said so, and a '
    + 'gate between two populations this close is a much harder choice.');
