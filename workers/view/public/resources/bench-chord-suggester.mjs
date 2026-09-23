// demo/resources/bench-chord-suggester.mjs. Does a chord suggester know any jazz.
//
//   node demo/resources/bench-chord-suggester.mjs           # every section, to stdout
//   node demo/resources/bench-chord-suggester.mjs --devices # only the named device tests
//
// 🔴 IT CONTACTS NOBODY. It reads `tmp/chord-corpora/`, which
// `demo/resources/fetch-chord-corpora.mjs` filled once and which is gitignored.
// Run that first if this says the cache is empty.
//
// ── THE TRAP THIS BENCHMARK EXISTS TO NOT FALL INTO ─────────────────────────
//
// 🔴 A SUGGESTER SCORED ONLY ON *DID IT PREDICT THE CHORD THAT CAME NEXT* IS
// MAXIMISED BY ALWAYS OFFERING THE COMMONEST CONTINUATION, AND THE COMMONEST
// CONTINUATION IS THE DEFINITION OF A CLICHE. So top 1 accuracy and the
// instruction *"no cliches"* are directly opposed, and a benchmark reporting
// accuracy alone would drive the build in exactly the wrong direction while
// looking rigorous. Three families of number are reported and they are allowed
// to disagree:
//   PREDICTIVE  did the real next chord turn up in what was offered
//   IDIOMATIC   does anybody ever actually play this here, measured on songs
//               the table has never seen. A suggestion with zero support is
//               WRONG rather than adventurous, and this is the floor.
//   PREDICTABLE how much of the time is the suggester just naming the global
//               maximum, how many different things does it ever say, and how
//               surprising is what it says
//
// ⚠️ AND A NEGATIVE CONTROL IS THE HALF THAT PROVES THE INSTRUMENT. Two things
// in here are SUPPOSED to score badly: `random`, which draws from the
// vocabulary, and `cross`, which is the other style's table. A benchmark that
// scored those well would be a broken benchmark and nothing else it says would
// mean anything.
//
// ⚠️ NOTHING IS TRAINED AND TESTED ON THE SAME DATA. The split is by SONG and
// not by transition, because two transitions from one song are not independent,
// and it is deterministic so two runs grade the same thing.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseIrb, parseBillboard, toSymbols, say, CLASSES } from './chord-corpus.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const X = join(REPO, 'tmp', 'chord-corpora', 'x');
const ONLY_DEVICES = process.argv.includes('--devices');

if (!existsSync(X)) {
  console.error('tmp/chord-corpora/x is not here. Run demo/resources/fetch-chord-corpora.mjs, then unpack:');
  console.error('  cd tmp/chord-corpora && mkdir -p x && tar xzf billboard-salami-chords.tar.gz -C x \\');
  console.error('    && unzip -q -o irb.zip -d x && unzip -q -o x/shanahdt-*/iRb_v1-0.zip -d x/irb');
  process.exit(1);
}

/* ── Loading ───────────────────────────────────────────────────────────────── */

/** A stable 32 bit hash, so the train/test split is the same on every run. */
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

function loadJazz() {
  const dir = join(X, 'irb', 'iRb_v1-0');
  const out = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.jazz'))) {
    const p = parseIrb(readFileSync(join(dir, f), 'utf8'));
    if (p.tonic === null || p.chords.length < 4) continue;
    const s = toSymbols(p.chords, p.tonic);
    if (s.length >= 4) out.push({ id: f, seqs: [s] });
  }
  return out;
}

function loadPop() {
  const dir = join(X, 'McGill-Billboard');
  const out = [];
  for (const d of readdirSync(dir).filter((n) => /^\d+$/.test(n))) {
    const p = parseBillboard(readFileSync(join(dir, d, 'salami_chords.txt'), 'utf8'));
    const seqs = p.runs.map((r) => toSymbols(r, p.tonic)).filter((s) => s.length >= 4);
    if (seqs.length) out.push({ id: d, seqs });
  }
  return out;
}

/**
 * ⚠️ THE SPLIT IS BY SONG. Splitting by transition would put a song's bars on
 * both sides, and a table that has read half of `Autumn Leaves` predicting the
 * other half is not predicting anything.
 */
const split = (songs, frac = 0.2) => {
  const test = [], train = [];
  for (const s of songs) ((hash(s.id) % 1000) < frac * 1000 ? test : train).push(s);
  return { train, test };
};

/* ── Counting ──────────────────────────────────────────────────────────────── */

/** Bigram and trigram counts, plus the unigram, off a list of songs. */
function count(songs) {
  const uni = new Map(), bi = new Map(), tri = new Map();
  const bump = (m, k, n) => { let d = m.get(k); if (!d) m.set(k, d = new Map()); d.set(n, (d.get(n) || 0) + 1); };
  const spell = new Map();            // symbol -> spelling -> count
  let events = 0;
  for (const s of songs) for (const seq of s.seqs) {
    for (let i = 0; i < seq.length; i++) {
      events++;
      uni.set(seq[i].s, (uni.get(seq[i].s) || 0) + 1);
      let sp = spell.get(seq[i].s); if (!sp) spell.set(seq[i].s, sp = new Map());
      sp.set(seq[i].spell, (sp.get(seq[i].spell) || 0) + 1);
      if (i >= 1) bump(bi, seq[i - 1].s, seq[i].s);
      if (i >= 2) bump(tri, `${seq[i - 2].s}|${seq[i - 1].s}`, seq[i].s);
    }
  }
  return { uni, bi, tri, spell, events, total: [...uni.values()].reduce((a, b) => a + b, 0) };
}

const ranked = (m) => (m ? [...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)) : []);

/* ── The suggesters ────────────────────────────────────────────────────────── */
/* Each takes a context (the symbols played so far) and returns an ORDERED list
   of candidate symbols. The first is what a one-slot page would show. */

/**
 * 🔴 THE 173 BYTE RULE FROM `research/chord-learning-2026-09-23.md`, VERBATIM.
 * Its whole alphabet is the seven diatonic triads of a major key, so it has no
 * row for a dominant seventh, a half diminished, a borrowed chord, a secondary
 * dominant or anything in a minor key. That is the point of grading it.
 */
const RULE173 = { I: ['vi', 'IV', 'V', 'ii', 'iii'], ii: ['V', 'vii', 'I', 'IV'], iii: ['vi', 'IV', 'ii'], IV: ['V', 'I', 'ii', 'vi'], V: ['I', 'vi', 'IV'], vi: ['IV', 'ii', 'V', 'I'], vii: ['I', 'iii'] };
/** The seven diatonic triads as symbols in this alphabet, both directions. */
const DIATONIC = { I: '0maj', ii: '2min', iii: '4min', IV: '5maj', V: '7maj', vi: '9min', vii: '11dim' };
const TO_NUMERAL = Object.fromEntries(Object.entries(DIATONIC).map(([k, v]) => [v, k]));
/** The lenient reading: a class folded to the nearest diatonic triad on its degree. */
const LENIENT = { maj: 'maj', min: 'min', dom: 'maj', hdim: 'dim', dim: 'dim', sus: 'maj', aug: 'maj' };
const lenientSym = (s) => { const m = /^(\d+)(.+)$/.exec(s); return m ? `${m[1]}${LENIENT[m[2]]}` : s; };

function rule173(ctx, { lenient = false } = {}) {
  const last = ctx[ctx.length - 1];
  if (last === undefined) return [];
  const num = TO_NUMERAL[lenient ? lenientSym(last) : last];
  if (num === undefined) return [];                      // 🔴 nothing at all
  return (RULE173[num] || []).map((n) => DIATONIC[n]);
}

/** Interpolated trigram. Backs off to bigram, then to the unigram. */
function makeNgram(c, { order = 3 } = {}) {
  const uniRank = ranked(c.uni).map(([s]) => s);
  return (ctx) => {
    const a = ctx[ctx.length - 2], b = ctx[ctx.length - 1];
    const seen = new Set(); const out = [];
    const add = (list) => { for (const [s] of list) if (!seen.has(s)) { seen.add(s); out.push(s); } };
    if (order >= 3 && a !== undefined && b !== undefined) add(ranked(c.tri.get(`${a}|${b}`)));
    if (b !== undefined) add(ranked(c.bi.get(b)));
    for (const s of uniRank) if (!seen.has(s)) { seen.add(s); out.push(s); }
    return out;
  };
}

/** The probability a model assigns, used for the cliche numbers and for PMI. */
function makeProb(c) {
  return (ctx, s) => {
    const a = ctx[ctx.length - 2], b = ctx[ctx.length - 1];
    let d = (a !== undefined && b !== undefined) ? c.tri.get(`${a}|${b}`) : null;
    if (!d || [...d.values()].reduce((x, y) => x + y, 0) < 4) d = b !== undefined ? c.bi.get(b) : null;
    if (!d) return (c.uni.get(s) || 0) / c.total;
    const tot = [...d.values()].reduce((x, y) => x + y, 0);
    return (d.get(s) || 0) / tot;
  };
}

/**
 * 🔴 THE TWO SLOT SUGGESTER, WHICH IS THE THING THE BRIEF ASKED TO HAVE
 * EVALUATED RATHER THAN ASSUMED. The original ask was already for a THIRD and a
 * FOURTH chord, which is two slots, so they are given two different jobs instead
 * of being a ranked pair of one job.
 *   SLOT A  the idiomatic continuation: argmax P(next | context).
 *   SLOT B  the one worth hearing: argmax POINTWISE MUTUAL INFORMATION among
 *           candidates the corpus actually attests at least `floor` times.
 * PMI is log P(next|context) minus log P(next), so it is high for a chord that
 * is SPECIFIC TO THIS CONTEXT and low for a chord that is common everywhere.
 * That is precisely the difference between an idiom and a cliche, and it is a
 * quantity rather than a taste.
 * ⚠️ THE FLOOR IS WHAT KEEPS SLOT B HONEST. Without a count floor, PMI is
 * maximised by whatever was seen once, which is noise wearing the costume of
 * daring.
 */
function makeTwoSlot(c, { floor = 3, lambda = 1, pool = 4 } = {}) {
  return (ctx) => {
    const a = ctx[ctx.length - 2], b = ctx[ctx.length - 1];
    let d = (a !== undefined && b !== undefined) ? c.tri.get(`${a}|${b}`) : null;
    let tot = d ? [...d.values()].reduce((x, y) => x + y, 0) : 0;
    if (!d || tot < 8) { d = b !== undefined ? c.bi.get(b) : null; tot = d ? [...d.values()].reduce((x, y) => x + y, 0) : 0; }
    if (!d) return ranked(c.uni).map(([s]) => s);
    const rows = ranked(d);
    const A = rows[0][0];
    /* 🔴 `pool` IS THE SECOND RAIL AND IT IS NOT THE SAME AS THE FLOOR. A count
       floor says *somebody played this here*; it does not say *this is one of
       the reasonable things to play here*. With no pool, PMI reaches past a dozen
       ordinary answers for whatever is most SPECIFIC to the context, and on a
       thin context that is an augmented triad seen four times. Restricting the
       search to the N commonest continuations and then re-ranking those by PMI
       asks a different and better question: OF THE THINGS THAT BELONG HERE,
       WHICH ONE IS LEAST GENERIC. The sweep below is what set N. */
    const scored = rows.slice(0, pool === Infinity ? rows.length : pool)
      .filter(([s, n]) => s !== A && n >= floor)
      .map(([s, n]) => {
        const pmi = Math.log2((n / tot) / ((c.uni.get(s) || 1) / c.total));
        return [s, (1 - lambda) * Math.log2(n / tot) + lambda * pmi];
      })
      .sort((x, y) => y[1] - x[1]);
    const B = scored.length ? scored[0][0] : (rows[1] ? rows[1][0] : A);
    const rest = rows.map(([s]) => s).filter((s) => s !== A && s !== B);
    return [A, B, ...rest];
  };
}

/** NEGATIVE CONTROL. Uniform from the vocabulary. It must score near zero. */
function makeRandom(c, seed = 12345) {
  const vocab = [...c.uni.keys()];
  let st = seed;
  const rnd = () => { st = (st * 1103515245 + 12345) & 0x7fffffff; return st / 0x7fffffff; };
  return () => { const a = [...vocab]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
}

/* ── The measurements ──────────────────────────────────────────────────────── */

/** Every (context, real next) in the held-out songs. */
function cases(songs) {
  const out = [];
  for (const s of songs) for (const seq of s.seqs) for (let i = 2; i < seq.length; i++) {
    out.push({ ctx: [seq[i - 2].s, seq[i - 1].s], next: seq[i].s });
  }
  return out;
}

/** Attestation counted on the HELD-OUT songs, which is what makes it independent. */
function attestation(songs) {
  const bi = new Map(), tri = new Map();
  const bump = (m, k, n) => { let d = m.get(k); if (!d) m.set(k, d = new Set()); d.add(n); };
  for (const s of songs) for (const seq of s.seqs) for (let i = 1; i < seq.length; i++) {
    bump(bi, seq[i - 1].s, seq[i].s);
    if (i >= 2) bump(tri, `${seq[i - 2].s}|${seq[i - 1].s}`, seq[i].s);
  }
  return { bi, tri };
}

function grade(name, suggest, tc, att, globals) {
  let n = 0, silent = 0, t1 = 0, t2 = 0, t3 = 0, d1 = 0;
  let attB = 0, attT = 0, attTseen = 0, gmax = 0, surp = 0, offered = 0;
  const kinds = new Map();
  const degOf = (s) => /^(\d+)/.exec(s)?.[1];

  for (const c of tc) {
    n++;
    const sug = suggest(c.ctx);
    if (!sug.length) { silent++; continue; }
    const two = sug.slice(0, 2);
    if (sug[0] === c.next) t1++;
    if (two.includes(c.next)) t2++;
    if (sug.slice(0, 3).includes(c.next)) t3++;
    if (degOf(sug[0]) === degOf(c.next)) d1++;

    const key = c.ctx.join('|');
    for (const s of two) {
      offered++;
      if (att.bi.get(c.ctx[1])?.has(s)) attB++;
      const T = att.tri.get(key);
      if (T) { attTseen++; if (T.has(s)) attT++; }
      if (s === globals.top) gmax++;
      surp += -Math.log2(Math.max(globals.p(s), 1e-9));
      kinds.set(s, (kinds.get(s) || 0) + 1);
    }
  }
  const spoke = n - silent;
  const tot = [...kinds.values()].reduce((a, b) => a + b, 0) || 1;
  let H = 0; for (const v of kinds.values()) { const p = v / tot; H -= p * Math.log2(p); }
  return {
    name, n, silent, silentPct: 100 * silent / n,
    top1: 100 * t1 / n, top2: 100 * t2 / n, top3: 100 * t3 / n, deg1: 100 * d1 / n,
    top1spoke: spoke ? 100 * t1 / spoke : 0,
    attBi: offered ? 100 * attB / offered : 0,
    attTri: attTseen ? 100 * attT / attTseen : 0,
    globalMax: offered ? 100 * gmax / offered : 0,
    surprisal: offered ? surp / offered : 0,
    types: kinds.size, entropy: H,
  };
}

/* ── Run it ────────────────────────────────────────────────────────────────── */

const jazzSongs = loadJazz(), popSongs = loadPop();
const J = split(jazzSongs), P = split(popSongs);
const jc = count(J.train), pc = count(P.train);
const jt = cases(J.test), pt = cases(P.test);
const ja = attestation(J.test), pa = attestation(P.test);

const globalsFor = (c) => ({ top: ranked(c.uni)[0][0], p: (s) => (c.uni.get(s) || 0) / c.total });
const jg = globalsFor(jc), pg = globalsFor(pc);

const pad = (s, w) => String(s).padEnd(w);
const num = (v, w = 6, d = 1) => String(v.toFixed(d)).padStart(w);

if (!ONLY_DEVICES) {
  console.log('='.repeat(78));
  console.log('WHAT WAS READ');
  console.log('='.repeat(78));
  for (const [nm, songs, sp, c] of [['iRb jazz', jazzSongs, J, jc], ['McGill Billboard pop', popSongs, P, pc]]) {
    const seqs = songs.reduce((a, s) => a + s.seqs.length, 0);
    const ev = songs.reduce((a, s) => a + s.seqs.reduce((b, q) => b + q.length, 0), 0);
    console.log(`${pad(nm, 22)} ${songs.length} songs, ${seqs} sequences, ${ev} harmonic events after collapsing repeats`);
    console.log(`${pad('', 22)} train ${sp.train.length} songs / test ${sp.test.length} songs, ${c.uni.size} distinct symbols, ${c.bi.size} bigram contexts, ${c.tri.size} trigram contexts`);
  }
  console.log(`\ntest cases: jazz ${jt.length}, pop ${pt.length}`);

  /* ── What the 173 byte rule can even SAY, which is its ceiling ───────────── */
  console.log('\n' + '='.repeat(78));
  console.log('THE CEILING ON THE 173 BYTE RULE, BEFORE IT IS GRADED ON ANYTHING');
  console.log('='.repeat(78));
  console.log('It can only ever answer with one of seven diatonic triads, so the fraction of');
  console.log('real next-chords that are one of those seven IS its top 1 ceiling. Nothing about');
  console.log('re-ordering its lists can move this number.');
  for (const [nm, tc] of [['jazz', jt], ['pop', pt]]) {
    const inAlpha = tc.filter((c) => TO_NUMERAL[c.next] !== undefined).length;
    const ctxIn = tc.filter((c) => TO_NUMERAL[c.ctx[1]] !== undefined).length;
    console.log(`  ${pad(nm, 6)} next chord is one of the seven: ${(100 * inAlpha / tc.length).toFixed(1)}%   context chord is: ${(100 * ctxIn / tc.length).toFixed(1)}%`);
  }
  console.log('\nWHERE IT RETURNS NOTHING AT ALL, jazz, the ten commonest silent contexts:');
  const silentBy = new Map();
  for (const c of jt) if (TO_NUMERAL[c.ctx[1]] === undefined) silentBy.set(c.ctx[1], (silentBy.get(c.ctx[1]) || 0) + 1);
  console.log('  ' + ranked(silentBy).slice(0, 10).map(([s, n]) => `${say(s)} ${n}`).join('   '));
  console.log('  (the research already found one of these by hand: `Am then F` returns nothing,');
  console.log('   because the rule has no minor table. The corpus says the hole is far larger.)');

  console.log('\n' + '='.repeat(78));
  console.log('THE VOCABULARY EACH STYLE ACTUALLY USES, top 14 by share');
  console.log('='.repeat(78));
  for (const [nm, c] of [['jazz', jc], ['pop', pc]]) {
    const r = ranked(c.uni).slice(0, 14);
    console.log(`${pad(nm, 6)} ${r.map(([s, v]) => `${say(s)} ${(100 * v / c.total).toFixed(1)}`).join('   ')}`);
  }

  const build = (c, other) => ({
    'rule173 strict': (ctx) => rule173(ctx),
    'rule173 lenient': (ctx) => rule173(ctx, { lenient: true }),
    'constant two': () => ranked(c.uni).slice(0, 2).map(([s]) => s).concat(ranked(c.uni).map(([s]) => s)),
    bigram: makeNgram(c, { order: 2 }),
    trigram: makeNgram(c, { order: 3 }),
    'two slot (A idiomatic, B by PMI)': makeTwoSlot(c),   // pool 4, floor 3, lambda 1
    'NEG random from vocabulary': makeRandom(c),
    'NEG the other style table': makeNgram(other, { order: 3 }),
  });

  for (const [nm, c, other, tc, att, g] of [['JAZZ (iRb held-out songs)', jc, pc, jt, ja, jg],
    ['POP (Billboard held-out songs)', pc, jc, pt, pa, pg]]) {
    console.log('\n' + '='.repeat(78));
    console.log(`SCORED ON ${nm}`);
    console.log('='.repeat(78));
    console.log(`${pad('suggester', 34)}${pad('silent', 8)}${pad('top1', 7)}${pad('top2', 7)}${pad('top3', 7)}${pad('root1', 7)}${pad('attest', 8)}${pad('gmax', 7)}${pad('surpr', 7)}${pad('types', 6)}${pad('H', 6)}`);
    const suites = build(c, other);
    for (const [sn, fn] of Object.entries(suites)) {
      const r = grade(sn, fn, tc, att, g);
      console.log(`${pad(sn, 34)}${num(r.silentPct, 6)}  ${num(r.top1, 5)}  ${num(r.top2, 5)}  ${num(r.top3, 5)}  ${num(r.deg1, 5)}  ${num(r.attBi, 6)}  ${num(r.globalMax, 5)}  ${num(r.surprisal, 5, 2)}  ${pad(r.types, 6)}${num(r.entropy, 5, 2)}`);
    }
    console.log('  silent = offered nothing at all.  root1 = top 1 right about the ROOT, ignoring quality.');
    console.log('  attest = of the two chords offered, how many are played after this chord somewhere in the HELD-OUT songs.');
    console.log('  gmax = how often an offered chord is just the single commonest chord in the corpus.  surpr = mean bits.');
    console.log('  types = how many different chords it ever offered.  H = entropy of what it offers, bits.');
  }

  /* ── The two slots graded as two jobs, which is the thing being proposed ─── */
  console.log('\n' + '='.repeat(78));
  console.log('THE TWO SLOTS GRADED SEPARATELY, because they are two jobs and not a ranked pair');
  console.log('='.repeat(78));
  console.log(`${pad('corpus / slot', 26)}${pad('hit', 7)}${pad('attest', 8)}${pad('gmax', 7)}${pad('surpr', 7)}${pad('types', 7)}${pad('H', 6)}`);
  for (const [nm, c, tc, att, g] of [['jazz', jc, jt, ja, jg], ['pop', pc, pt, pa, pg]]) {
    const fn = makeTwoSlot(c);
    for (const slot of [0, 1]) {
      let hit = 0, atb = 0, gm = 0, sp = 0, n = 0; const kinds = new Map();
      for (const t of tc) {
        const s = fn(t.ctx)[slot]; if (s === undefined) continue;
        n++;
        if (s === t.next) hit++;
        if (att.bi.get(t.ctx[1])?.has(s)) atb++;
        if (s === g.top) gm++;
        sp += -Math.log2(Math.max(g.p(s), 1e-9));
        kinds.set(s, (kinds.get(s) || 0) + 1);
      }
      let H = 0; for (const v of kinds.values()) { const p = v / n; H -= p * Math.log2(p); }
      console.log(`${pad(`${nm} slot ${slot ? 'B, worth hearing' : 'A, idiomatic'}`, 26)}${num(100 * hit / n, 5)}  ${num(100 * atb / n, 6)}  ${num(100 * gm / n, 5)}  ${num(sp / n, 5, 2)}  ${pad(kinds.size, 7)}${num(H, 5, 2)}`);
    }
  }
  console.log('  hit = this slot alone named the real next chord. Slot B is NOT trying to, and a');
  console.log('  low number here is the design working rather than failing. What slot B must not');
  console.log('  do is drop its ATTEST, because a suggestion nobody ever plays here is wrong.');

  /* ── The cliche trade-off, swept rather than asserted ────────────────────── */
  console.log('\n' + '='.repeat(78));
  console.log('THE CLICHE TRADE-OFF, SLOT B ALONE, swept (jazz held-out)');
  console.log('='.repeat(78));
  console.log('This is the curve the whole benchmark exists to draw. Read left to right: as the');
  console.log('ranking moves from probability to PMI the suggestion gets more surprising and');
  console.log('LESS ATTESTED, and the question is where to stop. Slot A never moves.');
  console.log(`${pad('lambda', 8)}${pad('floor', 7)}${pad('pool', 7)}${pad('B hit', 7)}${pad('attest', 8)}${pad('gmax', 7)}${pad('surpr', 7)}${pad('types', 7)}${pad('H', 6)}`);
  const slotB = (opt) => {
    const fn = makeTwoSlot(jc, opt);
    let hit = 0, atb = 0, gm = 0, sp = 0, n = 0; const kinds = new Map();
    for (const t of jt) {
      const s = fn(t.ctx)[1]; if (s === undefined) continue;
      n++;
      if (s === t.next) hit++;
      if (ja.bi.get(t.ctx[1])?.has(s)) atb++;
      if (s === jg.top) gm++;
      sp += -Math.log2(Math.max(jg.p(s), 1e-9));
      kinds.set(s, (kinds.get(s) || 0) + 1);
    }
    let H = 0; for (const v of kinds.values()) { const p = v / n; H -= p * Math.log2(p); }
    return { hit: 100 * hit / n, att: 100 * atb / n, gm: 100 * gm / n, sp: sp / n, types: kinds.size, H };
  };
  for (const [floor, pool] of [[3, Infinity], [3, 6], [3, 4], [8, 6]]) {
    for (const lambda of [0, 0.5, 1]) {
      const r = slotB({ floor, lambda, pool });
      console.log(`${num(lambda, 6, 2)}  ${pad(floor, 7)}${pad(pool === Infinity ? 'all' : pool, 7)}${num(r.hit, 5)}  ${num(r.att, 6)}  ${num(r.gm, 5)}  ${num(r.sp, 5, 2)}  ${pad(r.types, 7)}${num(r.H, 5, 2)}`);
    }
  }

  /* ── Is the dial real ───────────────────────────────────────────────────── */
  console.log('\n' + '='.repeat(78));
  console.log('IS THE STYLE DIAL A CONTROL THAT DOES ANYTHING');
  console.log('='.repeat(78));
  const jsd = (p, q) => {
    const keys = new Set([...p.keys(), ...q.keys()]);
    const pt2 = [...p.values()].reduce((a, b) => a + b, 0), qt = [...q.values()].reduce((a, b) => a + b, 0);
    let d = 0;
    for (const k of keys) {
      const a = (p.get(k) || 0) / pt2, b = (q.get(k) || 0) / qt, m = (a + b) / 2;
      if (a > 0) d += 0.5 * a * Math.log2(a / m);
      if (b > 0) d += 0.5 * b * Math.log2(b / m);
    }
    return d;
  };
  for (const [lbl, jm, pm] of [['bigram contexts', jc.bi, pc.bi], ['trigram contexts', jc.tri, pc.tri]]) {
    const shared = [...jm.keys()].filter((k) => pm.has(k));
    let disagree = 0, weighted = 0, wtot = 0, n = 0;
    for (const k of shared) {
      const a = jm.get(k), b = pm.get(k);
      const na = [...a.values()].reduce((x, y) => x + y, 0), nb = [...b.values()].reduce((x, y) => x + y, 0);
      if (na < 10 || nb < 10) continue;
      n++;
      if (ranked(a)[0][0] !== ranked(b)[0][0]) disagree++;
      const w = Math.min(na, nb);
      weighted += w * jsd(a, b); wtot += w;
    }
    console.log(`${pad(lbl, 18)} ${shared.length} shared, ${n} with 10+ observations on both sides`);
    console.log(`${pad('', 18)} top 1 suggestion DIFFERS on ${disagree} of ${n} (${(100 * disagree / n).toFixed(1)} per cent)`);
    console.log(`${pad('', 18)} mean Jensen-Shannon divergence ${(weighted / wtot).toFixed(3)} bits (0 = identical tables, 1 = no overlap)`);
  }
  /* ⚠️ AND THE DIAL MOVES THE SPELLING AS WELL AS THE TABLE, WHICH IS A SECOND
     AND SEPARATE WAY IT IS VISIBLE. The function `0maj` is written `Cmaj7` by
     jazz players and `C` by pop players, and that difference is in the corpora
     rather than in anybody's taste. A page that changed its table and not its
     spelling would be half a dial. */
  {
    const both = [...jc.spell.keys()].filter((s) => pc.spell.has(s));
    let differ = 0; const ex = [];
    for (const s of both) {
      const a = ranked(jc.spell.get(s))[0][0], b = ranked(pc.spell.get(s))[0][0];
      if (a !== b) { differ++; if ((jc.uni.get(s) || 0) > 300) ex.push(`${say(s)} ${a}/${b}`); }
    }
    console.log(`spelling: ${differ} of ${both.length} symbols are WRITTEN differently by the two styles`);
    console.log(`  the common ones: ${ex.slice(0, 10).join('   ')}`);
  }
  const jv = new Set(jc.uni.keys()), pv = new Set(pc.uni.keys());
  const inter = [...jv].filter((s) => pv.has(s)).length;
  console.log(`vocabulary: jazz ${jv.size}, pop ${pv.size}, shared ${inter}, Jaccard ${(inter / (jv.size + pv.size - inter)).toFixed(3)}`);
  console.log(`unigram Jensen-Shannon divergence between the two styles: ${jsd(jc.uni, pc.uni).toFixed(3)} bits`);
}

/* ── The named device tests ────────────────────────────────────────────────── */

/**
 * 🔴 NAMED TESTS WITH EXPECTED ANSWERS ARE A STRONGER INSTRUMENT THAN AGGREGATE
 * ACCURACY, and they are the only thing here that can answer *"is this Open
 * Studio quality"*. An aggregate says a suggester is right 40 per cent of the
 * time and cannot say whether it has ever heard of a backdoor cadence.
 * Everything is written in C so it can be read, and it is converted to the
 * key-relative alphabet before it is looked up.
 */
const DEVICES = [
  ['ii-V', ['2min'], '7dom', 'Dm7 wants G7'],
  ['ii-V-I', ['2min', '7dom'], '0maj', 'Dm7 G7 wants Cmaj7'],
  ['minor ii, the half diminished', ['2hdim'], '7dom', 'Dm7b5 wants G7'],
  ['minor ii-V-i', ['2hdim', '7dom'], '0min', 'Dm7b5 G7alt wants Cm'],
  ['secondary dominant V7/ii', ['9dom'], '2min', 'A7 wants Dm7'],
  ['secondary dominant V7/V', ['2dom'], '7dom', 'D7 wants G7'],
  ['tritone sub resolving', ['2min', '1dom'], '0maj', 'Dm7 Db7 wants Cmaj7'],
  ['backdoor cadence', ['5min', '10dom'], '0maj', 'Fm7 Bb7 wants Cmaj7'],
  ['backdoor, first half', ['5min'], '10dom', 'Fm7 wants Bb7'],
  ['turnaround I-VI7-ii-V, step 1', ['0maj'], '9dom', 'Cmaj7 wants A7'],
  ['turnaround, step 2', ['0maj', '9dom'], '2min', 'Cmaj7 A7 wants Dm7'],
  ['turnaround, step 3', ['9dom', '2min'], '7dom', 'A7 Dm7 wants G7'],
  ['modal interchange iv', ['0maj'], '5min', 'Cmaj7 wants Fm7'],
  ['modal interchange bVII7', ['0maj'], '10dom', 'Cmaj7 wants Bb7'],
  ['chromatic passing diminished', ['0maj', '1dim'], '2min', 'Cmaj7 C#dim7 wants Dm7'],
  ['the tritone sub as the OFFER', ['2min'], '1dom', 'after Dm7, is Db7 ever offered'],
];

console.log('\n' + '='.repeat(78));
console.log('THE NAMED JAZZ DEVICES, each with the answer it is supposed to give');
console.log('='.repeat(78));
console.log(`${pad('device', 34)}${pad('expects', 9)}${pad('JAZZ rank', 11)}${pad('P', 8)}${pad('POP rank', 10)}${pad('P', 8)}`);
const rankIn = (c, ctx, want) => {
  const f = makeNgram(c, { order: 3 });
  const list = f(ctx);
  const i = list.indexOf(want);
  const a = ctx[ctx.length - 2], b = ctx[ctx.length - 1];
  let d = (a !== undefined && b !== undefined) ? c.tri.get(`${a}|${b}`) : null;
  if (!d) d = b !== undefined ? c.bi.get(b) : null;
  const tot = d ? [...d.values()].reduce((x, y) => x + y, 0) : 0;
  const n = d ? (d.get(want) || 0) : 0;
  return { rank: i < 0 ? null : i + 1, p: tot ? n / tot : 0, n, tot, top: d ? ranked(d).slice(0, 3).map(([s, v]) => `${say(s)}:${v}`) : [] };
};
let hits = 0, slotHits = 0;
const twoJ = makeTwoSlot(jc);
for (const [nm, ctx, want, note] of DEVICES) {
  const a = rankIn(jc, ctx, want), b = rankIn(pc, ctx, want);
  if (a.rank !== null && a.rank <= 2) hits++;
  const [A, B] = twoJ(ctx);
  if (A === want || B === want) slotHits++;
  console.log(`${pad(nm, 34)}${pad(say(want), 9)}${pad(a.rank === null ? 'never' : `#${a.rank}`, 11)}${num(100 * a.p, 6, 1)}%  ${pad(b.rank === null ? 'never' : `#${b.rank}`, 10)}${num(100 * b.p, 6, 1)}%`);
  console.log(`${pad('  ' + note, 34)}jazz top3: ${a.top.join(' ')}   |   pop top3: ${b.top.join(' ')}`);
  console.log(`${pad('', 34)}the two slot page would show: A ${say(A)}   B ${say(B)}${A === want || B === want ? '   <- the named answer' : ''}`);
}
console.log(`\nthe jazz table has the named answer in its top 2 for ${hits} of ${DEVICES.length} devices.`);
console.log(`the two slot suggester would PUT IT ON THE PAGE for ${slotHits} of ${DEVICES.length}.`);

/**
 * 🔴 AND THE OTHER DIRECTION, WHICH IS A DISCOVERY RATHER THAN A TEST. A named
 * test asks *does the table know where this chord goes*. This asks the table
 * *where does this chord actually live*, and it is the half that can correct the
 * person writing the tests. One of the expectations above was wrong and this is
 * how it was caught.
 */
console.log('\n' + '='.repeat(78));
console.log('WHERE EACH CHROMATIC DEVICE ACTUALLY LIVES, counted rather than assumed (jazz)');
console.log('='.repeat(78));
for (const [want, lbl] of [['1dom', 'bII7, the tritone sub'], ['10dom', 'bVII7, the backdoor dominant'],
  ['9dom', 'VI7, the turnaround dominant'], ['5min', 'iv, borrowed from the minor'],
  ['1dim', 'bII°, the chromatic passing diminished'], ['3maj', 'bIII, the flat mediant']]) {
  const into = [], from = [];
  for (const [k, d] of jc.tri) {
    const n = d.get(want) || 0; if (!n) continue;
    const tot = [...d.values()].reduce((x, y) => x + y, 0);
    if (tot >= 12) into.push([k, n, n / tot]);
  }
  into.sort((a, b) => b[2] - a[2]);
  const after = jc.bi.get(want);
  if (after) for (const [s, n] of ranked(after).slice(0, 4)) from.push(`${say(s)} ${(100 * n / [...after.values()].reduce((x, y) => x + y, 0)).toFixed(0)}%`);
  console.log(`${pad(lbl, 38)} ${((100 * (jc.uni.get(want) || 0)) / jc.total).toFixed(2)}% of all jazz chords`);
  console.log(`  best contexts to OFFER it: ${into.slice(0, 4).map(([k, , p]) => `${k.split('|').map(say).join(' ')} -> ${(100 * p).toFixed(0)}%`).join('   ') || '(none with 12+ observations)'}`);
  console.log(`  and it resolves to:        ${from.join('   ') || '(never seen)'}`);
}

/* ── What it costs ─────────────────────────────────────────────────────────── */
if (!ONLY_DEVICES) {
  console.log('\n' + '='.repeat(78));
  console.log('WHAT IT COSTS, and how much of it survives pruning');
  console.log('='.repeat(78));
  const table = (c, { minCtx = 4, minRow = 2, keep = 4 } = {}) => {
    const t = {};
    for (const [ctx, d] of [...c.tri, ...c.bi]) {
      const tot = [...d.values()].reduce((a, b) => a + b, 0);
      if (tot < minCtx) continue;
      const rows = ranked(d).filter(([, n]) => n >= minRow).slice(0, keep);
      if (!rows.length) continue;
      t[ctx] = rows.map(([s, n]) => [s, Math.round(1000 * n / tot)]);
    }
    return t;
  };
  console.log(`${pad('table', 30)}${pad('contexts', 10)}${pad('cells', 8)}${pad('bytes JSON', 12)}`);
  for (const [nm, c] of [['jazz, unpruned', jc], ['pop, unpruned', pc]]) {
    const t = table(c, { minCtx: 1, minRow: 1, keep: 99 });
    const cells = Object.values(t).reduce((a, r) => a + r.length, 0);
    console.log(`${pad(nm, 30)}${pad(Object.keys(t).length, 10)}${pad(cells, 8)}${pad(Buffer.byteLength(JSON.stringify(t)), 12)}`);
  }
  for (const opt of [{ minCtx: 4, minRow: 2, keep: 4 }, { minCtx: 8, minRow: 3, keep: 3 }, { minCtx: 16, minRow: 4, keep: 3 }]) {
    for (const [nm, c] of [['jazz', jc], ['pop', pc]]) {
      const t = table(c, opt);
      const cells = Object.values(t).reduce((a, r) => a + r.length, 0);
      const lbl = `${nm}, ctx>=${opt.minCtx} row>=${opt.minRow} keep ${opt.keep}`;
      console.log(`${pad(lbl, 30)}${pad(Object.keys(t).length, 10)}${pad(cells, 8)}${pad(Buffer.byteLength(JSON.stringify(t)), 12)}`);
    }
  }
  console.log('\nwhat pruning costs in accuracy, jazz held-out:');
  console.log(`${pad('table', 30)}${pad('top1', 8)}${pad('top2', 8)}${pad('silent', 8)}`);
  for (const opt of [{ minCtx: 1, minRow: 1, keep: 99 }, { minCtx: 4, minRow: 2, keep: 4 }, { minCtx: 8, minRow: 3, keep: 3 }, { minCtx: 16, minRow: 4, keep: 3 }]) {
    const t = table(jc, opt);
    const uniRank = ranked(jc.uni).map(([s]) => s);
    const fn = (ctx) => {
      const seen = new Set(), out = [];
      for (const k of [`${ctx[0]}|${ctx[1]}`, ctx[1]]) for (const [s] of (t[k] || [])) if (!seen.has(s)) { seen.add(s); out.push(s); }
      for (const s of uniRank) if (!seen.has(s)) { seen.add(s); out.push(s); }
      return out;
    };
    let t1 = 0, t2 = 0;
    for (const c of jt) { const g = fn(c.ctx); if (g[0] === c.next) t1++; if (g.slice(0, 2).includes(c.next)) t2++; }
    console.log(`${pad(`ctx>=${opt.minCtx} row>=${opt.minRow} keep ${opt.keep}`, 30)}${num(100 * t1 / jt.length, 6)}  ${num(100 * t2 / jt.length, 6)}  ${pad('0.0', 8)}`);
  }

  /**
   * 🔴 THE TIMING IS TAKEN ON THE SHAPE THAT WOULD SHIP, NOT ON THE BENCHMARK'S.
   * `makeNgram` re-sorts a Map and rebuilds the whole fallback list on every
   * call, because inside a benchmark that costs nothing and is easier to read.
   * A page would read a pre-sorted array out of a plain object. The prior
   * research already measured this exact gap on the recogniser and found a
   * factor of ninety, so timing the convenient version and calling it the cost
   * would be repeating a mistake this repository has already written down.
   */
  const shipped = table(jc, { minCtx: 8, minRow: 3, keep: 3 });
  const shippedFallback = ranked(jc.uni).slice(0, 3).map(([s]) => s);
  const lookup = (a, b) => shipped[`${a}|${b}`] || shipped[b] || shippedFallback;
  let sink = 0;
  for (let r = 0; r < 5; r++) for (const c of jt) sink += lookup(c.ctx[0], c.ctx[1]).length;
  const t0 = process.hrtime.bigint();
  for (let r = 0; r < 200; r++) for (const c of jt) sink += lookup(c.ctx[0], c.ctx[1]).length;
  const t1 = process.hrtime.bigint();
  console.log(`\nlookup, shipped shape: ${(Number(t1 - t0) / (200 * jt.length)).toFixed(1)} nanoseconds a suggestion over ${200 * jt.length} calls (sink ${sink})`);
  const t2 = process.hrtime.bigint();
  const fn = makeNgram(jc);
  for (let r = 0; r < 5; r++) for (const c of jt) sink += fn(c.ctx).length;
  const t3 = process.hrtime.bigint();
  console.log(`lookup, the benchmark's own re-sorting shape: ${(Number(t3 - t2) / (5 * jt.length)).toFixed(0)} nanoseconds, which is what NOT to ship`);
  const bytes = Buffer.byteLength(JSON.stringify(shipped));
  console.log(`shipped jazz table at ctx>=8 row>=3 keep 3: ${bytes} bytes of JSON`);
  console.log(`both styles together: about ${bytes + Buffer.byteLength(JSON.stringify(table(pc, { minCtx: 8, minRow: 3, keep: 3 })))} bytes`);
  console.log('for comparison, /nola/ already ships 3,824,981 bytes across 95 recordings.');
}
void CLASSES;
