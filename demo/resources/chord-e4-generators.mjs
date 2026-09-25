// EXPERIMENT 4. Four ways of choosing, graded on the axes that matter for the
// complaint rather than on top-1 accuracy, which rewards the thing complained
// about. The real songs are the target, not the ceiling and not the floor.

import { loadJazz, loadPop, split, count, cases, rowsFor, ranked, pct, f, shipShape }
  from './chord-exp-lib.mjs';
/* 🔴 THE SHIPPED SAMPLER, IMPORTED RATHER THAN REPRODUCED. The four lines of a
   sampler are exactly the four lines somebody gets subtly wrong in a second
   copy, and a temperature measured here that is not the temperature the page
   draws with is a number about nothing. `rowsForShip` is `suggest.mjs`'s own
   lookup, backoff included. */
import { sampleRow, routeOver, mkRandom, rowsFor as rowsForShip }
  from '../shell/suggest.mjs';

const NAMES = { 0: 'I', 1: 'bII', 2: 'II', 3: 'bIII', 4: 'III', 5: 'IV', 6: 'bV', 7: 'V', 8: 'bVI', 9: 'VI', 10: 'bVII', 11: 'VII' };
const pretty = (s) => { const m = /^(\d+)(.+)$/.exec(s); return m ? `${NAMES[m[1]]}${m[2] === 'maj' ? '' : m[2]}` : s; };

const cycleLen = (p) => { const seen = new Map(); for (let i = 1; i < p.length; i++) { const st = `${p[i - 1]}|${p[i]}`; if (seen.has(st)) return i - seen.get(st); seen.set(st, i); } return 0; };

function mkRnd(seed) { let st = seed >>> 0; return () => { st = (Math.imul(st, 1103515245) + 12345) & 0x7fffffff; return st / 0x7fffffff; }; }

/* ── the choosers ─────────────────────────────────────────────────────────── */

const chooseA = (c, ctx) => { const { rows } = rowsFor(c, ctx); return rows.length ? rows[0][0] : null; };

function chooseB(c, ctx, { floor = 3, pool = 4 } = {}) {
  const { rows, tot } = rowsFor(c, ctx);
  if (!rows.length) return null;
  const A = rows[0][0];
  const scored = rows.slice(0, pool).filter(([s, n]) => s !== A && n >= floor)
    .map(([s, n]) => [s, Math.log2((n / tot) / ((c.uni.get(s) || 1) / c.total))])
    .sort((x, y) => y[1] - x[1]);
  return scored.length ? scored[0][0] : (rows[1] ? rows[1][0] : null);
}

/** Sample from the distribution, flattened by a temperature, with a count floor. */
function mkSample(T, floor = 3) {
  return (c, ctx, rnd) => {
    const { rows, tot } = rowsFor(c, ctx);
    const keep = rows.filter(([, n]) => n >= floor);
    const use = keep.length ? keep : rows;
    if (!use.length) return null;
    const w = use.map(([, n]) => Math.pow(n / tot, 1 / T));
    const sum = w.reduce((a, b) => a + b, 0);
    let r = rnd() * sum;
    for (let i = 0; i < use.length; i++) { r -= w[i]; if (r <= 0) return use[i][0]; }
    return use[use.length - 1][0];
  };
}

/**
 * A path that has to ARRIVE. Beam search over the trigram for the most likely
 * sequence of `steps` chords ending on `target`. This is the only chooser here
 * that knows where it is going, which is the whole of the third complaint.
 */
function pathTo(c, ctx0, target, steps, { beam = 24, floor = 2 } = {}) {
  let live = [{ ctx: [...ctx0], path: [], lp: 0 }];
  for (let d = 0; d < steps; d++) {
    const next = [];
    for (const st of live) {
      const { rows, tot } = rowsFor(c, st.ctx);
      for (const [s, n] of rows.slice(0, 8)) {
        if (n < floor) continue;
        if (d < steps - 1 && s === target) continue;      // arrive once, at the end
        if (d === steps - 1 && s !== target) continue;    // must land on it
        next.push({ ctx: [st.ctx[st.ctx.length - 1], s], path: [...st.path, s], lp: st.lp + Math.log2(n / tot) });
      }
    }
    if (!next.length) return null;
    next.sort((a, b) => b.lp - a.lp);
    live = next.slice(0, beam);
  }
  return live[0] || null;
}

function run(label, songs) {
  const { train, test } = split(songs);
  const c = count(train);
  const tc = cases(test);
  // attestation is counted on the held-out songs, so it is independent of the table
  const att = new Map();
  for (const s of test) for (const seq of s.seqs) for (let i = 1; i < seq.length; i++) {
    let d = att.get(seq[i - 1].s); if (!d) att.set(seq[i - 1].s, d = new Set()); d.add(seq[i].s);
  }
  const attested = (from, to) => att.get(from)?.has(to) || false;

  console.log(`\n${'='.repeat(78)}\n${label}`);
  console.log(`\n  generator                     cycles  distinct/10  attested  endings  surprisal`);

  const grade = (name, gen) => {
    let n = 0, cyc = 0, dist = 0, attOk = 0, attN = 0, surp = 0, surpN = 0;
    const endings = new Set();
    const rnd = mkRnd(20260925);
    for (const t of tc) {
      let ctx = [...t.ctx];
      const p = [];
      for (let i = 0; i < 10; i++) {
        const nx = gen(c, ctx, rnd);
        if (!nx) break;
        p.push(nx);
        if (attested(ctx[ctx.length - 1], nx)) attOk++;
        attN++;
        const u = (c.uni.get(nx) || 1) / c.total;
        surp += -Math.log2(u); surpN++;
        ctx = [ctx[ctx.length - 1], nx];
      }
      if (p.length < 10) continue;
      n++;
      if (cycleLen(p) > 0) cyc++;
      dist += new Set(p).size;
      endings.add(p.slice(-4).join(' '));
    }
    console.log(`  ${name.padEnd(28)}${pct(cyc, n).padStart(5)}%${f(dist / n, 2).padStart(11)}${pct(attOk, attN).padStart(9)}%${String(endings.size).padStart(9)}${f(surp / surpN, 2).padStart(10)}`);
  };

  grade('slot A, always', (c, ctx) => chooseA(c, ctx));
  grade('slot B, always', (c, ctx) => chooseB(c, ctx));
  grade('A then B, alternating', (() => { let k = 0; return (c, ctx) => (k++ % 2 ? chooseB(c, ctx) : chooseA(c, ctx)); })());
  for (const T of [0.5, 0.8, 1.0, 1.4]) grade(`sampled, temperature ${T}`, mkSample(T));

  // the control, measured the same way
  let rn = 0, rcyc = 0, rdist = 0, rsurp = 0, rsurpN = 0;
  const rend = new Set();
  for (const s of test) for (const seq of s.seqs) for (let i = 2; i + 10 <= seq.length; i += 10) {
    const p = seq.slice(i, i + 10).map((e) => e.s);
    rn++; if (cycleLen(p) > 0) rcyc++; rdist += new Set(p).size;
    rend.add(p.slice(-4).join(' '));
    for (const s2 of p) { rsurp += -Math.log2((c.uni.get(s2) || 1) / c.total); rsurpN++; }
  }
  console.log(`  ${'THE REAL SONGS'.padEnd(28)}${pct(rcyc, rn).padStart(5)}%${f(rdist / rn, 2).padStart(11)}${'100.0'.padStart(9)}%${String(rend.size).padStart(9)}${f(rsurp / rsurpN, 2).padStart(10)}`);
  console.log(`  (the control is ${rn} stretches, the generators ${tc.length} walks, so "endings" is not comparable in absolute terms)`);

  /* ── the arriving path ──────────────────────────────────────────────────── */
  const TARGETS = ['0maj', '0min'];
  let tried = 0, found = 0, attOk = 0, attN = 0;
  const paths = new Map();
  for (const t of tc.slice(0, 4000)) {
    const target = c.uni.get('0maj') >= c.uni.get('0min') ? TARGETS[0] : TARGETS[1];
    tried++;
    const r = pathTo(c, t.ctx, target, 4);
    if (!r) continue;
    found++;
    let ctx = [...t.ctx];
    for (const s of r.path) { if (attested(ctx[ctx.length - 1], s)) attOk++; attN++; ctx = [ctx[ctx.length - 1], s]; }
    paths.set(r.path.map(pretty).join(' '), (paths.get(r.path.map(pretty).join(' ')) || 0) + 1);
  }
  console.log(`\n-- a FOUR CHORD PATH THAT HAS TO ARRIVE ON THE TONIC, from ${tried} contexts`);
  console.log(`   a path exists and was found on ${pct(found, tried)}% of them`);
  console.log(`   its transitions are attested in held-out songs ${pct(attOk, attN)}% of the time`);
  console.log(`   ${paths.size} distinct four-chord routes, the commonest being:`);
  for (const [p, k] of ranked(paths).slice(0, 6)) console.log(`      ${pct(k, found).padStart(5)}%  ${p}`);

  /* ══ THE SHAPE THAT SHIPS, WHICH IS NOT THE SHAPE ABOVE ══════════════════ */
  const ship = shipShape(c, { id: label.toLowerCase() });
  console.log(`\n${'-'.repeat(78)}`);
  console.log(`THE SHIPPED TABLE'S SHAPE: top 3 rows a context, ctx>=8, row>=3, 89 steps`);
  console.log(`  ${ship.tri.size} trigram and ${ship.bi.size} bigram contexts survive, against `
    + `${c.tri.size} and ${c.bi.size} counted`);
  /* 🔴 THE GLOBAL MAX RATE IS THE PLAN'S THIRD MEASURE AND IT IS THE ONE THAT
     SAYS *cliche* IN A NUMBER. It is how often a generator answers with the
     single commonest chord in the whole corpus, whatever was played. */
  const topSym = ranked(c.uni)[0][0];
  console.log(`\n  generator                     cycles  distinct/10  attested  endings  surprisal  ${pretty(topSym)} rate`);

  const gradeShip = (name, gen) => {
    let n = 0, cyc = 0, dist = 0, aOk = 0, aN = 0, sp = 0, spN = 0, gm = 0;
    const ends = new Set();
    const rnd = mkRandom(20260925);
    for (const t of tc) {
      let cx = [...t.ctx];
      const p = [];
      for (let i = 0; i < 10; i++) {
        const nx = gen(cx, rnd);
        if (!nx) break;
        p.push(nx);
        if (attested(cx[cx.length - 1], nx)) aOk++;
        aN++;
        sp += -Math.log2((c.uni.get(nx) || 1) / c.total); spN++;
        if (nx === topSym) gm++;
        cx = [cx[cx.length - 1], nx];
      }
      if (p.length < 10) continue;
      n++;
      if (cycleLen(p) > 0) cyc++;
      dist += new Set(p).size;
      ends.add(p.slice(-4).join(' '));
    }
    console.log(`  ${name.padEnd(28)}${pct(cyc, n).padStart(5)}%${f(dist / n, 2).padStart(11)}${pct(aOk, aN).padStart(9)}%${String(ends.size).padStart(9)}${f(sp / spN, 2).padStart(10)}${pct(gm, spN).padStart(10)}%`);
    return { cyc: 100 * cyc / n, dist: dist / n, att: 100 * aOk / aN, surp: sp / spN, gm: 100 * gm / spN };
  };

  gradeShip('shipped, the argmax', (cx) => sampleRow(rowsForShip(ship, cx).rows, 0, null));
  const sweep = {};
  /* 🔴 THE SWEEP RUNS PAST 1.4 BECAUSE THE SHIPPED SHAPE NEEDS IT TO, WHICH IS
     THE FINDING RATHER THAN A SETTING. The plan swept 0.5 to 1.4 over every row
     a context had; three rows is a much narrower thing to draw from, so the same
     variety costs a much flatter dial, and a sweep that stopped at 1.4 would
     report its own last entry as the answer. `1e6` is uniform over the three and
     is the ceiling this shape has: nothing hotter can reach further. */
  for (const T of [1.0, 1.2, 1.4, 1.6, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6]) {
    sweep[T] = gradeShip(`shipped, sampled at ${T}`,
      (cx, rnd) => sampleRow(rowsForShip(ship, cx).rows, T, rnd));
  }
  let rgm = 0, rgmN = 0;
  for (const s2 of test) for (const seq of s2.seqs) for (const e of seq) { if (e.s === topSym) rgm++; rgmN++; }
  console.log(`  ${'THE REAL SONGS'.padEnd(28)}${pct(rcyc, rn).padStart(5)}%${f(rdist / rn, 2).padStart(11)}${'100.0'.padStart(9)}%${String(rend.size).padStart(9)}${f(rsurp / rsurpN, 2).padStart(10)}${pct(rgm, rgmN).padStart(10)}%`);
  /* The pick is the temperature whose cycle rate and vocabulary are closest to
     the real songs, scored on both at once so neither can be traded away. */
  const want = { cyc: 100 * rcyc / rn, dist: rdist / rn };
  let bestT = null, bestD = Infinity;
  for (const [T, g] of Object.entries(sweep)) {
    const dd = Math.abs(g.cyc - want.cyc) / 10 + Math.abs(g.dist - want.dist);
    if (dd < bestD && g.att >= 94) { bestD = dd; bestT = Number(T); }
  }
  console.log(`\n  CLOSEST TO THE REAL SONGS, with attestation at or above 94: temperature ${bestT}`);

  /* ── the arriving path, through the shipped search ──────────────────────── */
  const aim = c.uni.get('0maj') >= c.uni.get('0min') ? '0maj' : '0min';
  const gradePath = (name, T) => {
    let tr = 0, fd = 0, ok2 = 0, n2 = 0;
    const ps = new Map();
    const rnd = mkRandom(20260925);
    for (const t of tc.slice(0, 4000)) {
      tr++;
      const r = routeOver(ship, t.ctx, aim, 4, { temp: T, rnd: T > 0 ? rnd : null });
      if (!r) continue;
      fd++;
      let cx = [...t.ctx];
      for (const s of r.path) { if (attested(cx[cx.length - 1], s)) ok2++; n2++; cx = [cx[cx.length - 1], s]; }
      const k = r.path.map(pretty).join(' ');
      ps.set(k, (ps.get(k) || 0) + 1);
    }
    const six = ranked(ps).slice(0, 6);
    const iiVI = six.filter(([p]) => / IImin Vdom I$| IIhdim Vdom Imin$/.test(' ' + p))
      .reduce((a, [, k]) => a + k, 0);
    console.log(`  ${name.padEnd(34)}${pct(fd, tr).padStart(7)}%${pct(ok2, n2).padStart(10)}%`
      + `${String(ps.size).padStart(9)}${pct(iiVI, six.reduce((a, [, k]) => a + k, 0)).padStart(9)}%`);
    return six;
  };
  console.log(`\n-- THE SHIPPED FOUR CHORD ROUTE to ${pretty(aim)}, from ${Math.min(4000, tc.length)} contexts`);
  console.log(`  search                                 found  attested   routes  ii V I share of the top six`);
  gradePath('the best path, no sampling', 0);
  const sixA = gradePath(`sampled per step at ${bestT}`, bestT);
  const sixB = gradePath(`sampled per path at ${bestT}`, bestT / 4);
  console.log(`   the six commonest, sampled per step:`);
  for (const [p, k] of sixA) console.log(`      ${String(k).padStart(5)}  ${p}`);
  console.log(`   the six commonest, sampled per path:`);
  for (const [p, k] of sixB) console.log(`      ${String(k).padStart(5)}  ${p}`);
}

run('JAZZ', loadJazz());
run('POP', loadPop());
