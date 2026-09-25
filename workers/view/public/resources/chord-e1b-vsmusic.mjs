// EXPERIMENT 1b. The suggester against the music it was counted from.
// If the table is MORE concentrated than the corpus, "unimaginative" is not a
// tuning problem, it is what maximum likelihood does.

import { loadJazz, loadPop, split, count, cases, rowsFor, ranked, pct, f } from './chord-exp-lib.mjs';

const NAMES = { 0: 'I', 1: 'bII', 2: 'II', 3: 'bIII', 4: 'III', 5: 'IV', 6: 'bV', 7: 'V', 8: 'bVI', 9: 'VI', 10: 'bVII', 11: 'VII' };
const pretty = (s) => { const m = /^(\d+)(.+)$/.exec(s); return m ? `${NAMES[m[1]]}${m[2] === 'maj' ? '' : m[2]}` : s; };

const entropy = (m) => {
  const tot = [...m.values()].reduce((a, b) => a + b, 0);
  let h = 0;
  for (const n of m.values()) { const p = n / tot; if (p > 0) h -= p * Math.log2(p); }
  return h;
};
const topShare = (m, k) => {
  const tot = [...m.values()].reduce((a, b) => a + b, 0);
  return 100 * ranked(m).slice(0, k).reduce((a, [, n]) => a + n, 0) / tot;
};

function slots(c, ctx, { floor = 3, pool = 4 } = {}) {
  const { rows, tot } = rowsFor(c, ctx);
  if (!rows.length) return null;
  const A = rows[0][0];
  const scored = rows.slice(0, pool).filter(([s, n]) => s !== A && n >= floor)
    .map(([s, n]) => [s, Math.log2((n / tot) / ((c.uni.get(s) || 1) / c.total))])
    .sort((x, y) => y[1] - x[1]);
  return { A, B: scored.length ? scored[0][0] : (rows[1] ? rows[1][0] : null) };
}

function run(label, songs) {
  const { train, test } = split(songs);
  const c = count(train);
  const tc = cases(test);
  const real = new Map(), a = new Map(), b = new Map(), both = new Map();
  const missed = new Map();            // what the music did when slot A was wrong
  let n = 0, hitA = 0, hitEither = 0;
  for (const t of tc) {
    const s = slots(c, t.ctx);
    if (!s) continue;
    n++;
    real.set(t.next, (real.get(t.next) || 0) + 1);
    a.set(s.A, (a.get(s.A) || 0) + 1);
    both.set(s.A, (both.get(s.A) || 0) + 1);
    if (s.B) { b.set(s.B, (b.get(s.B) || 0) + 1); both.set(s.B, (both.get(s.B) || 0) + 1); }
    if (s.A === t.next) hitA++;
    if (s.A === t.next || s.B === t.next) hitEither++;
    else missed.set(t.next, (missed.get(t.next) || 0) + 1);
  }
  console.log(`\n${'='.repeat(78)}\n${label}, ${n} held-out contexts`);
  console.log(`\n              distinct  top-5 share  top-10 share  entropy`);
  const row = (name, m) => console.log(`  ${name.padEnd(12)}${String(m.size).padStart(6)}   ${f(topShare(m, 5), 1).padStart(8)}%   ${f(topShare(m, 10), 1).padStart(9)}%   ${f(entropy(m), 2).padStart(6)} bits`);
  row('the music', real);
  row('slot A', a);
  row('slot B', b);
  row('both slots', both);
  console.log(`\n  slot A names the real next chord on ${pct(hitA, n)}%, either slot on ${pct(hitEither, n)}%`);
  const rm = ranked(missed);
  const tot = [...missed.values()].reduce((x, y) => x + y, 0);
  console.log(`\n  when NEITHER slot had it (${pct(tot, n)}% of contexts), what the music actually played:`);
  console.log(`  ${rm.slice(0, 12).map(([s, k]) => `${pretty(s)} ${pct(k, tot)}%`).join(', ')}`);
  console.log(`  spread over ${missed.size} distinct chords, entropy ${f(entropy(missed), 2)} bits`);

  // how many of those misses are things the suggester NEVER says at all
  const saidEver = new Set([...both.keys()]);
  let neverSaid = 0;
  for (const [s, k] of missed) if (!saidEver.has(s)) neverSaid += k;
  console.log(`  of those, ${pct(neverSaid, tot)}% are chords the suggester never offers ANYWHERE in ${n} contexts`);
}

run('JAZZ', loadJazz());
run('POP', loadPop());
