// EXPERIMENT 3. "Not moving anywhere", taken literally.
// If you accept the suggestion and ask again, where do you end up?

import { loadJazz, loadPop, split, count, cases, rowsFor, ranked, pct, f } from './chord-exp-lib.mjs';

const NAMES = { 0: 'I', 1: 'bII', 2: 'II', 3: 'bIII', 4: 'III', 5: 'IV', 6: 'bV', 7: 'V', 8: 'bVI', 9: 'VI', 10: 'bVII', 11: 'VII' };
const pretty = (s) => { const m = /^(\d+)(.+)$/.exec(s); return m ? `${NAMES[m[1]]}${m[2] === 'maj' ? '' : m[2]}` : s; };

function slotA(c, ctx) {
  const { rows } = rowsFor(c, ctx);
  return rows.length ? rows[0][0] : null;
}
function slotB(c, ctx, { floor = 3, pool = 4 } = {}) {
  const { rows, tot } = rowsFor(c, ctx);
  if (!rows.length) return null;
  const A = rows[0][0];
  const scored = rows.slice(0, pool).filter(([s, n]) => s !== A && n >= floor)
    .map(([s, n]) => [s, Math.log2((n / tot) / ((c.uni.get(s) || 1) / c.total))])
    .sort((x, y) => y[1] - x[1]);
  return scored.length ? scored[0][0] : (rows[1] ? rows[1][0] : null);
}

function walk(c, ctx0, pick, steps = 10) {
  let ctx = [...ctx0];
  const path = [];
  for (let i = 0; i < steps; i++) {
    const nx = pick(c, ctx);
    if (!nx) break;
    path.push(nx);
    ctx = [ctx[ctx.length - 1], nx];
  }
  return path;
}

/** The length of the repeating tail, or 0 if it never repeats a state. */
function cycleLen(path) {
  const seen = new Map();
  for (let i = 1; i < path.length; i++) {
    const st = `${path[i - 1]}|${path[i]}`;
    if (seen.has(st)) return i - seen.get(st);
    seen.set(st, i);
  }
  return 0;
}

function run(label, songs) {
  const { train, test } = split(songs);
  const c = count(train);
  const tc = cases(test);
  console.log(`\n${'='.repeat(78)}\n${label}, walking 10 steps from each of ${tc.length} held-out contexts`);

  for (const [name, pick] of [['always take slot A', slotA], ['always take slot B', slotB]]) {
    const lens = new Map();
    let n = 0, cycled = 0, distinctSum = 0;
    const tails = new Map();
    for (const t of tc) {
      const p = walk(c, t.ctx, pick, 10);
      if (p.length < 10) continue;
      n++;
      const L = cycleLen(p);
      lens.set(L, (lens.get(L) || 0) + 1);
      if (L > 0) cycled++;
      distinctSum += new Set(p).size;
      const tail = p.slice(-4).map(pretty).join(' ');
      tails.set(tail, (tails.get(tail) || 0) + 1);
    }
    console.log(`\n-- ${name}, ${n} walks of 10`);
    console.log(`   walks that fall into a repeating cycle   ${pct(cycled, n)}%`);
    console.log(`   cycle length, where there is one         ${ranked(lens).filter(([L]) => L > 0).slice(0, 5).map(([L, k]) => `${L} chords ${pct(k, cycled)}%`).join(', ')}`);
    console.log(`   distinct chords in a walk of ten         ${f(distinctSum / n, 2)}`);
    const rt = ranked(tails);
    console.log(`   where the walks END UP, last four chords, over ${tails.size} distinct endings:`);
    for (const [t, k] of rt.slice(0, 5)) console.log(`      ${pct(k, n).padStart(5)}%  ${t}`);
  }

  // what a real song does over the same ten steps, as the control
  let rn = 0, rcyc = 0, rdist = 0;
  const rtails = new Map();
  for (const s of test) for (const seq of s.seqs) {
    for (let i = 2; i + 10 <= seq.length; i += 10) {
      const p = seq.slice(i, i + 10).map((e) => e.s);
      rn++;
      if (cycleLen(p) > 0) rcyc++;
      rdist += new Set(p).size;
      rtails.set(p.slice(-4).map(pretty).join(' '), 1);
    }
  }
  console.log(`\n-- CONTROL: what the real songs do over ten chords, ${rn} stretches`);
  console.log(`   stretches that contain a repeating cycle  ${pct(rcyc, rn)}%`);
  console.log(`   distinct chords in ten                    ${f(rdist / rn, 2)}`);
  console.log(`   distinct four-chord endings               ${rtails.size} in ${rn} stretches`);
}

run('JAZZ', loadJazz());
run('POP', loadPop());
