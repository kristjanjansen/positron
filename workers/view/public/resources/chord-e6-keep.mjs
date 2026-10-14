// Experiment 6: sweep KEEP, refitting the temperature at every prune and scoring cycle rate
// and vocabulary together; MIN_ROW 3 stays. Bytes come from build-chord-tables.mjs --check
// --keep=N itself. Run: node demo/resources/chord-e6-keep.mjs. Reads tmp/chord-corpora/ only.
// See lessons/page-resources.md#resources-38

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { loadJazz, loadPop, split, count, cases, ranked, pct, f, shipShape, REPO }
  from './chord-exp-lib.mjs';
import { sampleRow, mkRandom, twoSlots, routeOver, rowsFor as rowsForShip }
  from '../shell/suggest.mjs';

const KEEPS = [3, 4, 5, 6, 8];
/* The grid runs to uniform at each KEEP and is fine, not round: a coarse grid made KEEP 5
   look worse than KEEP 3 because the fit fell between two points.
   See lessons/page-resources.md#resources-39 */
const TEMPS = [];
for (let T = 0.4; T <= 6.01; T += 0.1) TEMPS.push(Number(T.toFixed(2)));
for (const T of [7, 8, 10, 12, 16, 24, 1e6]) TEMPS.push(T);

const cycleLen = (p) => {
  const seen = new Map();
  for (let i = 1; i < p.length; i++) {
    const st = `${p[i - 1]}|${p[i]}`;
    if (seen.has(st)) return i - seen.get(st);
    seen.set(st, i);
  }
  return 0;
};

/** What `build-chord-tables.mjs` writes at this prune, off its own packer. */
function bytesAt(keep) {
  const out = execFileSync(process.execPath,
    [join(REPO, 'demo', 'resources', 'build-chord-tables.mjs'), '--check', `--keep=${keep}`],
    { encoding: 'utf8' });
  const m = /packed, both styles, one file\s+(\d+) bytes/.exec(out);
  if (!m) throw new Error('the builder did not print a byte count');
  if (!/decoded: 9 of 9/.test(out)) throw new Error(`the round trip failed at keep ${keep}`);
  return Number(m[1]);
}

function run(label, songs) {
  const { train, test } = split(songs);
  const c = count(train);
  const tc = cases(test);

  /* Attestation is counted on the held-out songs, so it is independent of the
     table being graded and cannot move when the prune does. */
  const att = new Map();
  for (const s of test) for (const seq of s.seqs) for (let i = 1; i < seq.length; i++) {
    let d = att.get(seq[i - 1].s); if (!d) att.set(seq[i - 1].s, d = new Set()); d.add(seq[i].s);
  }
  const attested = (from, to) => att.get(from)?.has(to) || false;

  /* ── the control, which is the target rather than the ceiling ───────────── */
  let rn = 0, rcyc = 0, rdist = 0, rsurp = 0, rsurpN = 0;
  for (const s of test) for (const seq of s.seqs) for (let i = 2; i + 10 <= seq.length; i += 10) {
    const p = seq.slice(i, i + 10).map((e) => e.s);
    rn++; if (cycleLen(p) > 0) rcyc++; rdist += new Set(p).size;
    for (const s2 of p) { rsurp += -Math.log2((c.uni.get(s2) || 1) / c.total); rsurpN++; }
  }
  const topSym = ranked(c.uni)[0][0];
  let rgm = 0, rgmN = 0;
  for (const s of test) for (const seq of s.seqs) for (const e of seq) { if (e.s === topSym) rgm++; rgmN++; }
  const want = { cyc: 100 * rcyc / rn, dist: rdist / rn };

  const grade = (ship, T) => {
    let n = 0, cyc = 0, dist = 0, aOk = 0, aN = 0, sp = 0, spN = 0, gm = 0;
    const rnd = mkRandom(20260925);
    for (const t of tc) {
      let cx = [...t.ctx];
      const p = [];
      for (let i = 0; i < 10; i++) {
        const nx = sampleRow(rowsForShip(ship, cx).rows, T, rnd);
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
    }
    return { cyc: 100 * cyc / n, dist: dist / n, att: 100 * aOk / aN,
      surp: sp / spN, gm: 100 * gm / spN, walks: n };
  };

  console.log(`\n${'='.repeat(94)}\n${label}: WHAT RAISING THE PRUNE BUYS`);
  console.log(`  ${tc.length} held-out contexts, ten step walks, `
    + `attestation counted on ${test.length} held-out songs`);
  console.log(`\n  KEEP  ctxs  rows/ctx   4+    5+    6+    bytes   best T  cycles  dist/10`
    + ` attested  surprisal  ${topSym} rate`);

  const rows = [];
  for (const keep of KEEPS) {
    const ship = shipShape(c, { id: label.toLowerCase(), keep });
    /* How often the extra slots are filled: MIN_ROW 3 holds, so a context may keep only three.
       See lessons/page-resources.md#resources-40 */
    let tot = 0, nctx = 0;
    const atLeast = { 4: 0, 5: 0, 6: 0 };
    for (const m of [ship.tri, ship.bi]) for (const r of m.values()) {
      tot += r.length; nctx++;
      for (const k of [4, 5, 6]) if (r.length >= k) atLeast[k]++;
    }
    let bestT = null, best = null, bestD = Infinity;
    const sweep = [];
    for (const T of TEMPS) {
      const g = grade(ship, T);
      sweep.push([T, g]);
      const dd = Math.abs(g.cyc - want.cyc) / 10 + Math.abs(g.dist - want.dist);
      if (dd < bestD && g.att >= 94) { bestD = dd; bestT = T; best = g; }
    }
    /* Second reading: pin the cycle rate to the real songs' and read the vocabulary there, so
       two KEEPs cannot swap places on the scoring rule.
       See lessons/page-resources.md#resources-41 */
    const atRate = (() => {
      /* The range opens below 1: a wider prune needs a lower temperature for the same cycle rate.
         See lessons/page-resources.md#resources-42 */
      let lo = 0.05, hi = 1e6, out = null;
      for (let i = 0; i < 22; i++) {
        const mid = Math.sqrt(lo * hi);
        const g = grade(ship, mid);
        out = { T: mid, ...g };
        if (g.cyc > want.cyc) lo = mid; else hi = mid;
      }
      return out;
    })();
    const bytes = bytesAt(keep);
    rows.push({ keep, bytes, bestT, best, sweep, nctx, tot, atLeast, atRate });
    console.log(`  ${String(keep).padStart(4)}${String(nctx).padStart(6)}`
      + `${f(tot / nctx, 2).padStart(10)}${pct(atLeast[4], nctx).padStart(6)}%`
      + `${pct(atLeast[5], nctx).padStart(5)}%${pct(atLeast[6], nctx).padStart(5)}%`
      + `${String(bytes).padStart(9)}${String(bestT === 1e6 ? 'flat' : bestT).padStart(9)}`
      + `${f(best.cyc, 1).padStart(8)}%${f(best.dist, 2).padStart(9)}`
      + `${f(best.att, 1).padStart(9)}%${f(best.surp, 2).padStart(11)}${f(best.gm, 1).padStart(10)}%`);
  }
  console.log(`  ${'REAL'.padStart(4)}${''.padStart(6)}${''.padStart(10)}${''.padStart(7)}`
    + `${''.padStart(6)}${''.padStart(6)}${''.padStart(9)}${''.padStart(9)}`
    + `${f(want.cyc, 1).padStart(8)}%${f(want.dist, 2).padStart(9)}`
    + `${'100.0'.padStart(9)}%${f(rsurp / rsurpN, 2).padStart(11)}${pct(rgm, rgmN).padStart(10)}%`);

  console.log(`\n  HELD AT THE REAL SONGS' OWN CYCLE RATE OF ${f(want.cyc, 1)} PER CENT, `
    + `what each prune can offer`);
  console.log(`  KEEP     T   cycles  dist/10  attested  surprisal  ${topSym} rate`);
  for (const r of rows) {
    const a = r.atRate;
    console.log(`  ${String(r.keep).padStart(4)}${f(a.T, 2).padStart(6)}`
      + `${f(a.cyc, 1).padStart(8)}%${f(a.dist, 2).padStart(9)}${f(a.att, 1).padStart(9)}%`
      + `${f(a.surp, 2).padStart(11)}${f(a.gm, 1).padStart(10)}%`);
  }
  console.log(`  ${'REAL'.padStart(4)}${''.padStart(6)}${f(want.cyc, 1).padStart(8)}%`
    + `${f(want.dist, 2).padStart(9)}${'100.0'.padStart(9)}%`
    + `${f(rsurp / rsurpN, 2).padStart(11)}${pct(rgm, rgmN).padStart(10)}%`);

  /* What a player sees, which the walk above cannot reach.
     See lessons/page-resources.md#resources-43 */
  /* The walk grades slot A; /nola/ draws slot B, the PMI pick over the first POOL (4) rows,
     so at KEEP 3 slot B chooses between at most two.
     See lessons/page-resources.md#resources-44 */
  /* Slot B is an argmax, so `distinct B` reads 2.00 at every prune; bTemp draws it instead.
     See lessons/page-resources.md#resources-45 */
  console.log(`\n  SLOT B, WHICH IS THE ONE THE PAGE DRAWS, over ${Math.min(2000, tc.length)} contexts`
    + ` and 40 draws each`);
  console.log(`  KEEP     T  bTemp   pool  B moves  distinct B  B is ${topSym}  B attested`);
  const slotB = (keep, T, bTemp) => {
    const ship = shipShape(c, { id: label.toLowerCase(), keep });
    const rnd = mkRandom(20260925);
    let nctx = 0, moved = 0, distinct = 0, gm = 0, gmN = 0, aOk = 0, aN = 0, pool = 0, poolN = 0;
    for (const t of tc.slice(0, 2000)) {
      const seen = new Set();
      for (let i = 0; i < 40; i++) {
        const got = twoSlots(ship, t.ctx, { temp: T, rnd, bTemp });
        if (!got || !got.B) continue;
        seen.add(got.B);
        gmN++; if (got.B === topSym) gm++;
        aN++; if (attested(t.ctx[t.ctx.length - 1], got.B)) aOk++;
        pool += Math.min(4, got.rows.length); poolN++;
      }
      if (!seen.size) continue;
      nctx++; distinct += seen.size; if (seen.size > 1) moved++;
    }
    console.log(`  ${String(keep).padStart(4)}${f(T, 2).padStart(6)}`
      + `${(bTemp ? f(bTemp, 1) : 'argmax').padStart(7)}`
      + `${f(pool / poolN, 2).padStart(7)}${pct(moved, nctx).padStart(8)}%`
      + `${f(distinct / nctx, 2).padStart(12)}${pct(gm, gmN).padStart(9)}%`
      + `${pct(aOk, aN).padStart(12)}%`);
  };
  for (const r of rows) slotB(r.keep, r.atRate.T, 0);
  console.log(`  -- the same prunes with slot B DRAWN rather than maximised`);
  for (const r of rows) for (const bT of [1, 2, 4]) slotB(r.keep, r.atRate.T, bT);

  /* ── the four chord way home, which widens with the prune too ───────────── */
  const aim = c.uni.get('0maj') >= c.uni.get('0min') ? '0maj' : '0min';
  console.log(`\n  THE FOUR CHORD WAY HOME to ${aim}, sampled per step, over `
    + `${Math.min(4000, tc.length)} contexts`);
  console.log(`  KEEP     T   found  attested   routes  ii V I share of the top six`);
  for (const r of rows) {
    const ship = shipShape(c, { id: label.toLowerCase(), keep: r.keep });
    const T = r.atRate.T;
    const rnd = mkRandom(20260925);
    let tr = 0, fd = 0, ok2 = 0, n2 = 0;
    const ps = new Map();
    for (const t of tc.slice(0, 4000)) {
      tr++;
      /* The beam is keep**3 + 1, a ceiling not a filter; the shipped 64 prunes past KEEP 3.
         See lessons/page-resources.md#resources-46 */
      const rt = routeOver(ship, t.ctx, aim, 4, { temp: T, rnd, beam: r.keep ** 3 + 1 });
      if (!rt) continue;
      fd++;
      let cx = [...t.ctx];
      for (const s of rt.path) { if (attested(cx[cx.length - 1], s)) ok2++; n2++; cx = [cx[cx.length - 1], s]; }
      const k = rt.path.join(' ');
      ps.set(k, (ps.get(k) || 0) + 1);
    }
    const six = ranked(ps).slice(0, 6);
    const iiVI = six.filter(([p]) => / 2min 7dom 0maj$| 2hdim 7dom 0min$/.test(' ' + p))
      .reduce((a, [, k]) => a + k, 0);
    console.log(`  ${String(r.keep).padStart(4)}${f(T, 2).padStart(6)}`
      + `${pct(fd, tr).padStart(7)}%${pct(ok2, n2).padStart(9)}%${String(ps.size).padStart(9)}`
      + `${pct(iiVI, six.reduce((a, [, k]) => a + k, 0) || 1).padStart(9)}%`);
  }

  /* ── the full sweep, so the best fit can be argued with ─────────────────── */
  for (const r of rows) {
    console.log(`\n  -- KEEP ${r.keep}, the sweep at every half step (best fit `
      + `${r.bestT === 1e6 ? 'flat' : r.bestT})`);
    for (const [T, g] of r.sweep) {
      const round = T === 1e6 || T >= 7 || Math.abs(T * 2 - Math.round(T * 2)) < 1e-9;
      const mark = T === r.bestT ? ' <-' : '';
      if (!round && !mark) continue;
      console.log(`     T ${String(T === 1e6 ? 'flat' : T).padEnd(6)}`
        + `${f(g.cyc, 1).padStart(7)}% cycles  ${f(g.dist, 2).padStart(5)} distinct  `
        + `${f(g.att, 1).padStart(5)}% attested  ${f(g.surp, 2)} bits`
        + `${g.att < 94 ? '  BELOW THE 94 FLOOR' : ''}${mark}`);
    }
  }
  return rows;
}

run('JAZZ', loadJazz());
run('POP', loadPop());
