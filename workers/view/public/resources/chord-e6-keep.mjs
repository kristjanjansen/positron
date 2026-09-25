// EXPERIMENT 6. THE PRUNE IS ITSELF A TEMPERATURE, SO SWEEP IT.
//
//   node demo/resources/chord-e6-keep.mjs
//
// 🔴 WHY THIS EXISTS. `plans/plan-better-chords-2026-09-25.md` section 13 ended
// on a ceiling rather than on a dial: uniform over the three kept rows is 40.5
// per cent cycling and 7.53 distinct chords in ten, so no temperature reaches
// the real songs' 52.7 and 7.42 at once while only three rows are kept.
// `build-chord-tables.mjs:123` says the same thing in its own comment:
// *"Raising `KEEP` is the only thing that would move it"*. Nobody had measured
// what raising it buys.
//
// 🔴 AND THE DIAL HAS TO BE REFITTED AT EVERY PRUNE, WHICH IS THE LESSON THAT
// ALREADY COST ONE NUMBER. The plan swept a temperature over every row a context
// had and landed on 1.0 for jazz; the shipped shape keeps three rows, which is
// already a sharpening, and the same variety cost 3.5. So a KEEP sweep that held
// the temperature still would be measuring two changes at once and reporting one.
// Every KEEP here gets its own temperature sweep and its own best fit, scored on
// the cycle rate and the vocabulary at once so neither can be traded away.
//
// ⚠️ `MIN_ROW = 3` IS THE COUNT FLOOR AND IT DOES NOT MOVE. The plan measured
// that sampling with no floor costs 9.5 points of attestation for 1.8 bits of
// surprisal. Raising KEEP is not lowering the floor: a context with no fourth
// row seen three times does not gain one, it keeps three rows, and the column
// `rows/ctx` below says how often the extra slots are filled at all.
//
// 🔴 THE BYTES ARE MEASURED BY THE REAL PACKER, NOT BY A COPY OF IT. This file
// spawns `build-chord-tables.mjs --check --keep=N` and reads the byte count it
// prints. A second implementation of the packing would be the one thing in this
// experiment nobody could check.
//
// It contacts nobody. tmp/chord-corpora/ is already on this disk.

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { loadJazz, loadPop, split, count, cases, ranked, pct, f, shipShape, REPO }
  from './chord-exp-lib.mjs';
import { sampleRow, mkRandom, twoSlots, routeOver, rowsFor as rowsForShip }
  from '../shell/suggest.mjs';

const KEEPS = [3, 4, 5, 6, 8];
/* The grid runs to uniform-over-the-rows at each KEEP, because the ceiling moves
   with the prune and a sweep that stopped short would report its last entry as
   the answer. That is exactly how `chord-e4-generators.mjs` had to be extended.
   ⚠️ AND IT IS FINE RATHER THAN ROUND, WHICH WAS FOUND BY GETTING IT WRONG. A
   grid of 1, 1.5, 2, 2.5, 3, 3.5 made KEEP 5 look WORSE than KEEP 3, because the
   fit it wanted sat between two of its points. A coarse grid measures the grid. */
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
    /* 🔴 HOW OFTEN THE EXTRA SLOTS ARE ACTUALLY FILLED, WHICH IS THE HONEST HALF
       OF RAISING A CEILING. `MIN_ROW = 3` does not move, so a context with no
       fourth row seen three times keeps three rows however high KEEP goes, and
       these columns say how much of the raise is real. */
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
    /* 🔴 AND THE SECOND READING HOLDS ONE AXIS STILL, WHICH IS THE ONE THAT
       CANNOT BE ARGUED WITH. A joint fit trades a little cycle rate for a little
       vocabulary and back, so two KEEPs can swap places on the scoring rule
       rather than on the music. Pinning the cycle rate to the real songs' own
       and reading the vocabulary off there asks the prune one question: at the
       rate real music repeats itself, how many different chords does this shape
       have to offer. */
    const atRate = (() => {
      /* ⚠️ THE RANGE OPENS BELOW 1 AND THAT WAS A DEFECT BEFORE IT WAS A
         SETTING. A wider prune is a flatter draw at the same dial, so the
         temperature that matches a given cycle rate FALLS as KEEP rises, and a
         search floored at 1.0 answered `T 1.00` for every pop prune above three
         while missing the rate by up to sixteen points. */
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

  /* ══ WHAT A PLAYER ACTUALLY SEES, WHICH THE WALK ABOVE CANNOT REACH ═══════ */
  /* 🔴 THE WALK GRADES SLOT A AND `/nola/` DRAWS SLOT B. Slot B is the pointwise
     mutual information pick over the first `POOL` rows, and `POOL` is 4 while the
     shipped table keeps 3, so at KEEP 3 slot B is choosing between at most TWO
     candidates and the pool has never once been full. Every measure above can
     stand still while this one moves, and this one is the one on screen. */
  /* 🔴 AND SLOT B IS ITSELF AN ARGMAX, WHICH IS WHY THE COLUMN `distinct B`
     BELOW READS EXACTLY 2.00 AT EVERY PRUNE. B is the highest pointwise mutual
     information row that A did not take, so it is the PMI top unless A collided
     with the PMI top, in which case it is the PMI second. **Two values, for any
     width of table.** The plan's whole lesson was applied to slot A and never to
     slot B, and slot B is the one on screen. `bTemp` draws it the same way. */
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
      /* ⚠️ THE BEAM IS `keep**3 + 1`, WHICH IS A CEILING RATHER THAN A FILTER.
         A beam that pruned would be an argmax wearing a different name, and the
         shipped default of 64 starts pruning the moment KEEP passes 3. */
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
