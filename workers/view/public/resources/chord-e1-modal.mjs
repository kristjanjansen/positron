// EXPERIMENT 1. Is "unimaginative" the objective working as designed?
// The brief: "Establish whether that is what is happening before proposing
// anything." Every number here is off the two cached corpora, held-out by song.

import { loadJazz, loadPop, split, count, cases, rowsFor, ranked, pct, f } from './chord-exp-lib.mjs';

const NAMES = { 0: 'I', 1: 'bII', 2: 'II', 3: 'bIII', 4: 'III', 5: 'IV', 6: 'bV', 7: 'V', 8: 'bVI', 9: 'VI', 10: 'bVII', 11: 'VII' };
const pretty = (s) => { const m = /^(\d+)(.+)$/.exec(s); return m ? `${NAMES[m[1]]}${m[2] === 'maj' ? '' : m[2]}` : s; };

function slots(c, ctx, { floor = 3, pool = 4 } = {}) {
  const { rows, tot } = rowsFor(c, ctx);
  if (!rows.length) return null;
  const A = rows[0][0];
  const scored = rows.slice(0, pool)
    .filter(([s, n]) => s !== A && n >= floor)
    .map(([s, n]) => [s, Math.log2((n / tot) / ((c.uni.get(s) || 1) / c.total))])
    .sort((x, y) => y[1] - x[1]);
  const B = scored.length ? scored[0][0] : (rows[1] ? rows[1][0] : null);
  return { A, B, rows, tot, choices: scored.length };
}

function run(label, songs) {
  const { train, test } = split(songs);
  const c = count(train);
  const tc = cases(test);
  console.log(`\n${'='.repeat(78)}\n${label}: ${songs.length} songs, ${train.length} train, ${test.length} held out, ${tc.length} contexts, vocabulary ${c.uni.size}`);

  // 1. how much probability mass sits on the top answer
  let massSum = 0, massN = 0, over50 = 0, over70 = 0;
  const aCount = new Map(), bCount = new Map();
  let choicesSum = 0, choices0 = 0, choices1 = 0, bIsSecond = 0, bNull = 0;
  const poolSizes = new Map();
  for (const t of tc) {
    const s = slots(c, t.ctx);
    if (!s) continue;
    massN++;
    const m = s.rows[0][1] / s.tot;
    massSum += m;
    if (m > 0.5) over50++;
    if (m > 0.7) over70++;
    aCount.set(s.A, (aCount.get(s.A) || 0) + 1);
    if (s.B) bCount.set(s.B, (bCount.get(s.B) || 0) + 1); else bNull++;
    choicesSum += s.choices;
    if (s.choices === 0) choices0++;
    if (s.choices === 1) choices1++;
    poolSizes.set(s.choices, (poolSizes.get(s.choices) || 0) + 1);
    if (s.B && s.rows[1] && s.B === s.rows[1][0]) bIsSecond++;
  }
  console.log(`\n-- the modal choice, on ${massN} contexts`);
  console.log(`   mean probability mass on the top answer      ${f(100 * massSum / massN, 1)}%`);
  console.log(`   contexts where the top answer holds over 50% ${pct(over50, massN)}%`);
  console.log(`   contexts where the top answer holds over 70% ${pct(over70, massN)}%`);

  const conc = (m, k) => {
    const r = ranked(m);
    const tot = [...m.values()].reduce((a, b) => a + b, 0);
    const top = r.slice(0, k).reduce((a, [, n]) => a + n, 0);
    return { types: m.size, share: 100 * top / tot, list: r.slice(0, k).map(([s, n]) => `${pretty(s)} ${pct(n, tot)}%`) };
  };
  const a5 = conc(aCount, 5), b5 = conc(bCount, 5);
  console.log(`\n-- what slot A ever says`);
  console.log(`   distinct answers ${a5.types}, and the top 5 are ${f(a5.share, 1)}% of everything it says`);
  console.log(`   ${a5.list.join(', ')}`);
  console.log(`   top 10 share ${f(conc(aCount, 10).share, 1)}%`);
  console.log(`\n-- what slot B ever says`);
  console.log(`   distinct answers ${b5.types}, and the top 5 are ${f(b5.share, 1)}% of everything it says`);
  console.log(`   ${b5.list.join(', ')}`);
  console.log(`   top 10 share ${f(conc(bCount, 10).share, 1)}%`);

  console.log(`\n-- how much choice slot B actually has (pool 4, floor 3)`);
  console.log(`   mean candidates to choose between   ${f(choicesSum / massN, 2)}`);
  console.log(`   contexts with NO candidate at all   ${pct(choices0, massN)}%  (slot B falls back to the second commonest)`);
  console.log(`   contexts with exactly ONE candidate ${pct(choices1, massN)}%  (no choice is being made)`);
  console.log(`   so a choice is made on              ${pct(massN - choices0 - choices1, massN)}% of contexts`);
  console.log(`   slot B is simply the second commonest on ${pct(bIsSecond, massN)}%`);

  // the shipped table keeps only 3 rows, so the pool can never exceed 3.
  let ship0 = 0, ship1 = 0, shipSum = 0;
  for (const t of tc) {
    const s = slots(c, t.ctx, { pool: 3 });
    if (!s) continue;
    shipSum += s.choices;
    if (s.choices === 0) ship0++;
    if (s.choices === 1) ship1++;
  }
  console.log(`\n-- the same, as SHIPPED (keep 3, so the pool is 3)`);
  console.log(`   mean candidates ${f(shipSum / massN, 2)}, none on ${pct(ship0, massN)}%, exactly one on ${pct(ship1, massN)}%`);
  console.log(`   a real choice is made on ${pct(massN - ship0 - ship1, massN)}% of contexts`);

  // 2. how much of the corpus is the cliche itself
  let ii5 = 0, iiV = 0, iiVI = 0, transitions = 0, trigrams = 0;
  for (const s of songs) for (const seq of s.seqs) {
    for (let i = 1; i < seq.length; i++) {
      transitions++;
      if (seq[i - 1].s === '2min' && seq[i].s === '7dom') iiV++;
      if (i >= 2) {
        trigrams++;
        if (seq[i - 2].s === '2min' && seq[i - 1].s === '7dom' && (seq[i].s === '0maj' || seq[i].s === '0min')) iiVI++;
      }
    }
    for (const e of seq) if (e.s === '2min') ii5++;
  }
  console.log(`\n-- how much of the corpus is the thing being complained about`);
  console.log(`   ii to V transitions       ${iiV} of ${transitions} (${pct(iiV, transitions)}%)`);
  console.log(`   ii V I trigrams           ${iiVI} of ${trigrams} (${pct(iiVI, trigrams)}%)`);

  // 3. the single commonest answers overall
  const top = ranked(c.uni).slice(0, 8);
  const tot = c.total;
  console.log(`\n-- the eight commonest chords in the corpus itself`);
  console.log(`   ${top.map(([s, n]) => `${pretty(s)} ${pct(n, tot)}%`).join(', ')}`);
  return { c, tc };
}

run('JAZZ (iRb)', loadJazz());
run('POP (McGill Billboard)', loadPop());
