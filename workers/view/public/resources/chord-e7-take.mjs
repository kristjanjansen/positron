// EXPERIMENT 7. WITHIN TAKE ADAPTATION, THROUGH THE CODE THAT SHIPS.
//
//   node demo/resources/chord-e7-take.mjs
//
// 🔴 WHAT THIS IS FOR. `plans/plan-better-chords-2026-09-25.md` section 6.2
// measured the largest single gain in the whole document and nobody built it:
// adapting on the first N chords of a piece and predicting the rest is worth
// **+7.44 points of top 1 at N = 16**, where the entire step from a bigram to a
// trigram was 4.5 points and justified downloading two corpora.
//
// 🔴 AND THAT NUMBER WAS MEASURED ON FULL COUNTS, NOT ON THE TABLE THAT SHIPS.
// The same correction section 13 had to make for the temperature applies here:
// `demo/resources/chord-tables.json` keeps five rows a context, drops anything
// seen fewer than eight times and writes each probability as one character. A
// gain measured on the unpruned counts is a gain about a table nobody has. So
// every number below runs through `shipShape` and through `suggest.mjs`'s own
// `adaptRows`, `sampleRow` and `rowsFor`.
//
// 🔴 EXPANSION IS OFF, WHICH IS THE CONSERVATIVE READING AND THE ONE TO QUOTE.
// iRb writes a repeat as a repeat, and expanding it means the second half of a
// piece literally contains the first. The plan measured +10.1 with expansion on
// and +7.44 with it off, and said the difference is exactly the repetition the
// corpus adds rather than anything learned about a person.
//
// 🔴 THE SELF FEEDING ARM IS A NEGATIVE CONTROL AND NOT A VARIANT. `/nola/`
// carries a rule from a report reading *"you recorded a suggestion. why>"*, and
// a suggester that learns from its own output writes its own line and calls it
// yours. The arm named `SELF FED` below does exactly that on purpose, so the
// trap has a number instead of a warning.
//
// It contacts nobody. tmp/chord-corpora/ is already on this disk.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseIrb, parseBillboard, toSymbols } from './chord-corpus.mjs';
import { X, split, count, ranked, pct, f, shipShape } from './chord-exp-lib.mjs';
import { sampleRow, adaptRows, mkRandom, rowsFor as rowsForShip } from '../shell/suggest.mjs';

/* ── loading, with expansion OFF ──────────────────────────────────────────── */

function loadJazzFlat() {
  const dir = join(X, 'irb', 'iRb_v1-0');
  const out = [];
  for (const fn of readdirSync(dir).filter((n) => n.endsWith('.jazz'))) {
    const p = parseIrb(readFileSync(join(dir, fn), 'utf8'), { expand: false });
    if (p.tonic === null || p.chords.length < 8) continue;
    const s = toSymbols(p.chords, p.tonic);
    if (s.length >= 12) out.push({ id: fn, seqs: [s] });
  }
  return out;
}

function loadPopFlat() {
  const dir = join(X, 'McGill-Billboard');
  const out = [];
  for (const d of readdirSync(dir).filter((n) => /^\d+$/.test(n))) {
    const p = parseBillboard(readFileSync(join(dir, d, 'salami_chords.txt'), 'utf8'));
    const seqs = p.runs.map((r) => toSymbols(r, p.tonic)).filter((s) => s.length >= 12);
    if (seqs.length) out.push({ id: d, seqs });
  }
  return out;
}

const cycleLen = (p) => {
  const seen = new Map();
  for (let i = 1; i < p.length; i++) {
    const st = `${p[i - 1]}|${p[i]}`;
    if (seen.has(st)) return i - seen.get(st);
    seen.set(st, i);
  }
  return 0;
};

/* The shipped argmax, with a take mixed in or without one. */
const top1 = (ship, ctx, take, weight) => {
  const { rows } = rowsForShip(ship, ctx);
  const use = take ? adaptRows(rows, take, ctx, { weight }) : rows;
  return use.length ? use[0][0] : null;
};

function run(label, songs, temp, mix) {
  const { train, test } = split(songs);
  const c = count(train);
  const ship = shipShape(c, { id: label.toLowerCase(), keep: 5, temp });
  console.log(`\n${'='.repeat(88)}\n${label}, expansion off`);
  console.log(`  ${train.length} training songs and ${test.length} held out, `
    + `${ship.tri.size} trigram and ${ship.bi.size} bigram contexts in the shipped shape`);

  /* ── A. top 1, which is the plan's own measure ──────────────────────────── */
  console.log(`\n  A. ADAPT ON WHAT HAS BEEN PLAYED, THEN PREDICT THE REST`);
  /* 🔴 THREE ARMS, BECAUSE THE PLAN'S WORDS AND THE PAGE'S BEHAVIOUR ARE NOT THE
     SAME THING. The plan said *over the last sixteen to thirty two chords* and
     MEASURED the FIRST N of a piece, which is a different window, and what a page
     naturally does is neither: it accumulates everything since the take started.
     All three are here so the sentence can be checked against the number. */
  console.log(`     N  weight   world      first N   gain      last N   gain      all so far  gain`);
  for (const N of [8, 16, 32]) {
    for (const w of [0.1, 0.2, 0.25, 0.3, 0.5]) {
      let n = 0, hitF = 0, hitS = 0, hitA = 0, hit0 = 0;
      for (const s of test) for (const seq of s.seqs) {
        if (seq.length < N + 12) continue;
        const all = seq.map((e) => e.s);
        const primed = all.slice(0, N);
        for (let i = N + 2; i < all.length; i++) {
          const ctx = [all[i - 2], all[i - 1]];
          const window = all.slice(Math.max(0, i - N), i);
          const sofar = all.slice(0, i);
          n++;
          if (top1(ship, ctx, primed, w) === all[i]) hitF++;
          if (top1(ship, ctx, window, w) === all[i]) hitS++;
          if (top1(ship, ctx, sofar, w) === all[i]) hitA++;
          if (top1(ship, ctx, null, 0) === all[i]) hit0++;
        }
      }
      const g = (x) => ((x >= 0 ? '+' : '') + f(x, 2)).padStart(7);
      const F = 100 * hitF / n, S = 100 * hitS / n, A = 100 * hitA / n, Z = 100 * hit0 / n;
      console.log(`   ${String(N).padStart(3)}  ${f(w, 2).padStart(5)}${f(Z, 2).padStart(8)}%`
        + `${f(F, 2).padStart(10)}%${g(F - Z)}${f(S, 2).padStart(10)}%${g(S - Z)}`
        + `${f(A, 2).padStart(12)}%${g(A - Z)}   (${n})`);
    }
  }

  /* 🔴 THE SHIPPED DEFAULT, MEASURED AS ITS OWN ARM RATHER THAN INFERRED FROM
     THE THREE ABOVE. `mkTake` keeps the last 64 chords at weight 0.25, which is
     *everything so far* for any take shorter than 64 and a slow forget after
     that. Quoting the `all so far` column for a windowed take would be quoting an
     arm nobody runs. */
  {
    const W = 64, w = mix, N = 16;
    let n = 0, hit = 0, hit0 = 0;
    for (const s of test) for (const seq of s.seqs) {
      if (seq.length < N + 12) continue;
      const all = seq.map((e) => e.s);
      for (let i = N + 2; i < all.length; i++) {
        const ctx = [all[i - 2], all[i - 1]];
        n++;
        if (top1(ship, ctx, all.slice(Math.max(0, i - W), i), w) === all[i]) hit++;
        if (top1(ship, ctx, null, 0) === all[i]) hit0++;
      }
    }
    const A = 100 * hit / n, Z = 100 * hit0 / n;
    console.log(`\n     THE SHIPPED DEFAULT, window ${W} weight ${w}:  ${f(A, 2)}% against `
      + `${f(Z, 2)}% world only, ${(A - Z >= 0 ? '+' : '') + f(A - Z, 2)} points   (${n} contexts)`);
  }

  /* ── the negative control: SOMEBODY ELSE'S take, which must not help ────── */
  {
    const N = 16, w = 0.3;
    let n = 0, hitO = 0, hit0 = 0;
    const flat = [];
    for (const s of test) for (const seq of s.seqs) if (seq.length >= N + 12) flat.push(seq.map((e) => e.s));
    for (let k = 0; k < flat.length; k++) {
      const all = flat[k];
      const stranger = flat[(k + 1) % flat.length].slice(0, N);
      for (let i = N + 2; i < all.length; i++) {
        const ctx = [all[i - 2], all[i - 1]];
        n++;
        if (top1(ship, ctx, stranger, w) === all[i]) hitO++;
        if (top1(ship, ctx, null, 0) === all[i]) hit0++;
      }
    }
    console.log(`\n     NEGATIVE CONTROL: the first 16 chords of the NEXT song at weight 0.3   `
      + `${f(100 * hitO / n, 2)}% against ${f(100 * hit0 / n, 2)}% world only, `
      + `${(100 * hitO / n - 100 * hit0 / n >= 0 ? '+' : '') + f(100 * hitO / n - 100 * hit0 / n, 2)} points`);
  }

  /* ── B. the four measures, because top 1 rewards the dullness complained of ─ */
  const att = new Map();
  for (const s of test) for (const seq of s.seqs) for (let i = 1; i < seq.length; i++) {
    let d = att.get(seq[i - 1].s); if (!d) att.set(seq[i - 1].s, d = new Set()); d.add(seq[i].s);
  }
  const attested = (from, to) => att.get(from)?.has(to) || false;
  const topSym = ranked(c.uni)[0][0];

  const N = 16, W = 64;
  const walks = [];
  for (const s of test) for (const seq of s.seqs) {
    const all = seq.map((e) => e.s);
    for (let i = N + 2; i < all.length; i += 7) {
      walks.push({ ctx: [all[i - 2], all[i - 1]], take: all.slice(Math.max(0, i - W), i),
        short: all.slice(Math.max(0, i - N), i) });
    }
  }

  const grade = (name, w, { selfFed = false, stranger = false, short = false } = {}) => {
    let n = 0, cyc = 0, dist = 0, aOk = 0, aN = 0, sp = 0, spN = 0, gm = 0;
    const rnd = mkRandom(20260926);
    for (let k = 0; k < walks.length; k++) {
      const wk = walks[k];
      let cx = [...wk.ctx];
      /* 🔴 THE TAKE IS THE REAL CHORDS THAT CAME BEFORE, AND THE WALK'S OWN
         OUTPUT NEVER JOINS IT. That is both the rule and the only way this
         measurement means anything: a generator learning from itself is
         measuring its own echo. */
      let take = stranger ? walks[(k + 1) % walks.length].take : (short ? wk.short : wk.take);
      const p = [];
      for (let i = 0; i < 10; i++) {
        const { rows } = rowsForShip(ship, cx);
        const use = w > 0 ? adaptRows(rows, take, cx, { weight: w }) : rows;
        const nx = sampleRow(use, temp, rnd);
        if (!nx) break;
        p.push(nx);
        if (attested(cx[cx.length - 1], nx)) aOk++;
        aN++;
        sp += -Math.log2((c.uni.get(nx) || 1) / c.total); spN++;
        if (nx === topSym) gm++;
        cx = [cx[cx.length - 1], nx];
        if (selfFed) take = [...take.slice(1), nx];
      }
      if (p.length < 10) continue;
      n++;
      if (cycleLen(p) > 0) cyc++;
      dist += new Set(p).size;
    }
    console.log(`  ${name.padEnd(38)}${pct(cyc, n).padStart(6)}%${f(dist / n, 2).padStart(10)}`
      + `${pct(aOk, aN).padStart(10)}%${f(sp / spN, 2).padStart(11)}${pct(gm, spN).padStart(9)}%`);
  };

  console.log(`\n  B. THE FOUR MEASURES, ten step walks from ${walks.length} held-out positions, `
    + `take of the last ${W} real chords`);
  console.log(`  generator                             cycles  dist/10  attested  surprisal  ${topSym} rate`);
  grade('world only', 0);
  for (const w of [0.1, 0.2, 0.25, 0.3, 0.5]) grade(`adapted at weight ${f(w, 2)}`, w);
  grade(`THE SHIPPED DEFAULT, window ${W} mix ${mix}`, mix);
  grade(`the last ${N} only, at ${mix}`, mix, { short: true });
  grade(`NEG: somebody else's take at ${mix}`, mix, { stranger: true });
  grade('NEG: SELF FED, learns its own output', mix, { selfFed: true });

  let rn = 0, rcyc = 0, rdist = 0, rsurp = 0, rsurpN = 0, rgm = 0, rgmN = 0;
  for (const s of test) for (const seq of s.seqs) for (let i = 2; i + 10 <= seq.length; i += 10) {
    const p = seq.slice(i, i + 10).map((e) => e.s);
    rn++; if (cycleLen(p) > 0) rcyc++; rdist += new Set(p).size;
    for (const s2 of p) { rsurp += -Math.log2((c.uni.get(s2) || 1) / c.total); rsurpN++; }
  }
  for (const s of test) for (const seq of s.seqs) for (const e of seq) { if (e.s === topSym) rgm++; rgmN++; }
  console.log(`  ${'THE REAL SONGS'.padEnd(38)}${pct(rcyc, rn).padStart(6)}%${f(rdist / rn, 2).padStart(10)}`
    + `${'100.0'.padStart(10)}%${f(rsurp / rsurpN, 2).padStart(11)}${pct(rgm, rgmN).padStart(9)}%`);
}

/* The two dials are read off `build-chord-tables.mjs`, which is where they ship. */
run('JAZZ', loadJazzFlat(), 1.7, 0.25);
run('POP', loadPopFlat(), 0.8, 0.1);
