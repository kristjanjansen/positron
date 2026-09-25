// demo/resources/build-chord-tables.mjs. The table that ships, and nothing else.
//
//   node demo/resources/build-chord-tables.mjs           # count, pack, write, print the numbers
//   node demo/resources/build-chord-tables.mjs --check   # print the numbers, write nothing
//   node demo/resources/build-chord-tables.mjs --check --keep=5   # what another prune would cost
//
// 🔴 IT CONTACTS NOBODY. It reads the corpora
// `demo/resources/fetch-chord-corpora.mjs` cached once under `tmp/`, which is
// gitignored, and it writes ONE file: `demo/resources/chord-tables.json`, served
// at `/resources/chord-tables.json` the way `/tapes/` already reads
// `/resources/corpus.json`.
//
// 🔴 WHAT SHIPS IS A TABLE, NOT A CORPUS. 870 KB of other people's song data
// stays in `tmp/`. What crosses the wire is counts over a key-relative alphabet,
// which is a fact ABOUT the corpus rather than a copy of it.
//
// 🔴 AND THE LICENCE TRAVELS WITH IT. The iRb corpus is CC BY 4.0, and CC BY
// requires attribution on derivatives as well as on the work. A counted table is
// a derivative. `demo/resources/LICENSE-chord-tables` carries the attribution
// and is written by this script so it cannot drift from what was counted.
// McGill Billboard is CC0 and attaches no condition; its citation is carried
// anyway, because a table nobody can trace back is a table nobody can check.
//
// ── THE PACKING, AND WHY IT IS NOT JUST JSON ────────────────────────────────
//
// ⚠️ THE OBVIOUS JSON IS FIVE TIMES THE SIZE AND THE NUMBERS ARE PRINTED BOTH
// WAYS ON EVERY RUN, so the choice can be checked rather than taken on trust.
// `{"7dom|0maj":[["9dom",412],...]}` spends most of its bytes re-typing symbol
// names that are already in a 78 entry list. Packed, a symbol is ONE character,
// a probability is ONE character, and a record is a fixed width so there are no
// separators at all.

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseIrb, parseBillboard, toSymbols, say } from './chord-corpus.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const X = join(REPO, 'tmp', 'chord-corpora', 'x');
const OUT = join(HERE, 'chord-tables.json');
const LIC = join(HERE, 'LICENSE-chord-tables');
const CHECK = process.argv.includes('--check');

/**
 * 🔴 `--keep=N` IS FOR MEASURING WHAT ANOTHER PRUNE WOULD COST AND IT REFUSES TO
 * WRITE. `demo/resources/chord-e6-keep.mjs` sweeps the prune and needs the byte
 * count off THIS packer rather than off a second copy of it, and a flag that
 * could also write the table would mean the shipped file's shape was decided on
 * a command line somebody typed once. The shipped number is the constant below
 * and nothing else, so a table on this disk always matches the source.
 */
const argKeep = /^--keep=(\d+)$/.exec(process.argv.find((a) => a.startsWith('--keep=')) || '');
if (argKeep && !CHECK) {
  console.error('--keep= measures a prune and never writes one. Add --check, or edit KEEP.');
  process.exit(1);
}

if (!existsSync(X)) {
  console.error('tmp/chord-corpora/x is not here. Run demo/resources/fetch-chord-corpora.mjs first, then unpack it.');
  process.exit(1);
}

/* 🔴 KEEP `\\` AND `"` OUT OF THE ALPHABET. Both are legal in a JSON string and
   both cost a backslash to write, which would make one symbol twice the size of
   every other for no reason and would be invisible until somebody measured. */
const ALPHA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-.:;<=>?@[]^_`{|}~";
const PAD = ' ';                       // a row that is not there

/** Every song of one corpus as symbol sequences. */
function load(which) {
  const out = [];
  if (which === 'jazz') {
    const dir = join(X, 'irb', 'iRb_v1-0');
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.jazz'))) {
      const p = parseIrb(readFileSync(join(dir, f), 'utf8'));
      if (p.tonic === null) continue;
      const s = toSymbols(p.chords, p.tonic);
      if (s.length >= 4) out.push(s);
    }
  } else {
    const dir = join(X, 'McGill-Billboard');
    for (const d of readdirSync(dir).filter((n) => /^\d+$/.test(n))) {
      const p = parseBillboard(readFileSync(join(dir, d, 'salami_chords.txt'), 'utf8'));
      for (const r of p.runs) { const s = toSymbols(r, p.tonic); if (s.length >= 4) out.push(s); }
    }
  }
  return out;
}

function count(seqs) {
  const uni = new Map(), bi = new Map(), tri = new Map(), spell = new Map();
  const bump = (m, k, n) => { let d = m.get(k); if (!d) m.set(k, d = new Map()); d.set(n, (d.get(n) || 0) + 1); };
  for (const seq of seqs) for (let i = 0; i < seq.length; i++) {
    uni.set(seq[i].s, (uni.get(seq[i].s) || 0) + 1);
    let sp = spell.get(seq[i].s); if (!sp) spell.set(seq[i].s, sp = new Map());
    sp.set(seq[i].spell, (sp.get(seq[i].spell) || 0) + 1);
    if (i >= 1) bump(bi, seq[i - 1].s, seq[i].s);
    if (i >= 2) bump(tri, `${seq[i - 2].s}|${seq[i - 1].s}`, seq[i].s);
  }
  return { uni, bi, tri, spell, total: [...uni.values()].reduce((a, b) => a + b, 0) };
}

const ranked = (m) => [...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));

/**
 * 🔴 THE PRUNE, AND THE THREE NUMBERS IN IT WERE MEASURED RATHER THAN CHOSEN.
 * `demo/resources/bench-chord-suggester.mjs` graded the table at four settings on
 * held-out songs: unpruned reads 48.5 per cent top 1 and 120,662 bytes of JSON,
 * and `ctx>=8 row>=3 keep 3` reads **48.6 per cent and 25,252**. Pruning to a
 * fifth of the size costs nothing measurable, because everything it removes was
 * seen once or twice and was never going to be the top answer anyway.
 *
 * 🔴 `KEEP` WAS 3 UNTIL 2026-09-26 AND THE COMMENT BELOW ASKED FOR THIS
 * MEASUREMENT BY NAME. `demo/resources/chord-e6-keep.mjs` swept it at 3, 4, 5, 6
 * and 8, refitting the temperature at every step because the prune is itself a
 * temperature, and read the byte count off THIS packer rather than off a copy.
 * Held at the real songs' own cycle rate, which is the one comparison a scoring
 * rule cannot tilt:
 *
 *   jazz   KEEP 3  7.15 distinct in ten   KEEP 5  7.32   KEEP 8  7.41   real 7.42
 *   pop    KEEP 3  4.56                   KEEP 5  4.55   KEEP 8  4.51   real 4.65
 *
 * 🔴 SO THE VOCABULARY GAIN IS A JAZZ GAIN AND POP DOES NOT HAVE ONE. Raising
 * the prune closes 63 per cent of jazz's remaining gap and moves pop the wrong
 * way by a hundredth of a chord. That is worth knowing before anybody reads
 * *"the ceiling is the prune"* as a fact about tables in general.
 * 🔴 AND THE GAIN THAT PAID FOR THIS IS THE WAY HOME, NOT THE WALK. MEASURED
 * over 4,000 held-out jazz contexts: a four chord route to the tonic exists on
 * **92.7 per cent** of them at KEEP 3 and **98.5** at KEEP 5, over **307**
 * distinct routes against 150, with attestation 95.4 against 98.3. Seven contexts
 * in a hundred had no way home at all and now have one.
 * ⚠️ `MIN_ROW = 3` DOES NOT MOVE AND IS NOT WHAT CHANGED. A context with no
 * fourth row seen three times still keeps three rows: MEASURED, 32.6 per cent of
 * jazz contexts fill a fourth slot and 26.4 per cent a fifth, so most of them
 * never reach the new ceiling. Sampling with no floor costs 9.5 points of
 * attestation, which is the trade pure PMI was refused for.
 * ⚠️ AND 6 AND 8 WERE REFUSED RATHER THAN MISSED. They buy 0.02 and 0.09 more
 * distinct chords in ten for another 2,724 and 8,172 bytes, and take the route's
 * attestation to 95.2 and 94.4 against a floor of about 94.
 */
const MIN_CTX = 8, MIN_ROW = 3, KEEP = argKeep ? Number(argKeep[1]) : 5;

/**
 * 🔴 THE TEMPERATURE THE PAGE DRAWS WITH, ONE NUMBER PER STYLE, AND IT IS IN THE
 * TABLE BECAUSE IT IS A FACT ABOUT THE STYLE RATHER THAN ABOUT THE CODE.
 * `plans/plan-better-chords-2026-09-25.md` measured that taking the most likely
 * chord ten times in a row falls into a repeating cycle **99.1 per cent** of the
 * time on jazz and **99.8** on pop, against **52.7** and **89.0** for the real
 * songs, and that sampling instead reproduces the real statistics.
 *
 * 🔴 AND THESE TWO NUMBERS ARE NOT THE PLAN'S TWO NUMBERS, WHICH IS THE
 * INTERESTING RESULT RATHER THAN A DISAGREEMENT. The plan swept temperatures
 * over EVERY row a context had and landed on 1.0 for jazz and 0.5 to 0.8 for
 * pop. **This table keeps three rows**, which is already a sharpening, so the
 * same variety costs a much flatter dial. MEASURED 2026-09-25 by
 * `demo/resources/chord-e4-generators.mjs`, which builds this exact shape from
 * the training split and walks ten steps through `suggest.mjs`'s own sampler:
 *
 *   jazz  T 1.0  81.6% cycle  5.92 distinct   T 3.5  53.1%  7.13   real 52.7%  7.42
 *   pop   T 1.0  92.1% cycle  4.30 distinct   T 1.4  87.3%  4.67   real 89.0%  4.65
 *
 * 🔴 AND THEY MOVED AGAIN ON 2026-09-26 BECAUSE `KEEP` MOVED, WHICH IS THE SAME
 * FINDING ARRIVING A SECOND TIME. Five rows is a flatter thing to draw from than
 * three, so the same variety costs a much COLDER dial: jazz fell from 3.5 to 1.7
 * and pop from 1.4 to 0.8. MEASURED by `demo/resources/chord-e6-keep.mjs`, which
 * refits the temperature at every prune for exactly this reason:
 *
 *   jazz  KEEP 5 T 1.7  52.5% cycle  7.33 distinct  97.0% attested   real 52.7%  7.42
 *   pop   KEEP 5 T 0.8  89.1% cycle  4.55 distinct  98.2% attested   real 89.0%  4.65
 *
 * ⚠️ A NUMBER BELOW 1 IS NOT A MISTAKE AND THE SEARCH HAD TO BE TAUGHT THAT. Pop
 * at five rows needs SHARPENING, not flattening, and a sweep floored at 1.0
 * answered 1.00 for every pop prune while missing the cycle rate by sixteen
 * points.
 * ⚠️ ATTESTATION IS THE FLOOR AND IT IS NOWHERE NEAR IT: 97.0 per cent on jazz
 * and 98.2 on pop, against the 94 nothing ships below.
 */
const TEMP = { jazz: 1.7, pop: 0.8 };

/**
 * 🔴 HOW MUCH OF THE MIXTURE IS THE PLAYER'S OWN TAKE, ONE NUMBER PER STYLE, AND
 * IT IS IN THE TABLE FOR THE THIRD TIME FOR THE THIRD REASON. The temperature is
 * here because the corpora differ; so is this, and the difference is larger.
 * `plans/plan-better-chords-2026-09-25.md` section 6.2 measured 0.2 to 0.3 on
 * iRb and never looked at pop, so its range is a JAZZ range that reads as a
 * general one.
 *
 * MEASURED 2026-09-26 by `demo/resources/chord-e7-take.mjs`, with expansion off,
 * through this table's own shape and through `suggest.mjs`'s `adaptRows`:
 *
 *   jazz  w 0.25  +6.32 top 1   50.2% cycle  7.44 distinct  98.0% attested   real 52.0%  7.44
 *   pop   w 0.10  +5.09 top 1   86.7% cycle  4.67 distinct  98.4% attested   real 89.0%  4.65
 *   pop   w 0.25 would read +17.77 top 1 and 83.6% cycle with 4.89 distinct
 *
 * 🔴 SO POP'S HUGE TOP 1 GAIN IS THE PLAN'S OWN CAVEAT AT FULL VOLUME AND IS NOT
 * A REASON TO TURN THE DIAL UP. A Billboard run is a verse or a chorus, which is
 * a loop, so adapting to it predicts it almost for free and drives the generator
 * FURTHER from how real pop repeats itself rather than closer. **The four
 * measures are what refuse the bigger number**, which is the whole reason this
 * project does not score on top 1 alone.
 * ⚠️ AND A TABLE WRITTEN BEFORE THIS FIELD EXISTED READS AS 0.25, which is jazz's
 * measured value rather than a neutral one, stated here rather than hidden.
 */
const MIX = { jazz: 0.25, pop: 0.1 };

const styles = {};
for (const which of ['jazz', 'pop']) {
  const seqs = load(which);
  const c = count(seqs);
  styles[which] = { c, seqs: seqs.length, events: seqs.reduce((a, s) => a + s.length, 0) };
}

/* One id space across both styles, so the alphabet and the spellings are shared. */
const allSyms = new Set();
for (const s of Object.values(styles)) for (const k of s.c.uni.keys()) allSyms.add(k);
const SYMS = [...allSyms].sort();
const ID = new Map(SYMS.map((s, i) => [s, i]));
if (SYMS.length > ALPHA.length) throw new Error(`${SYMS.length} symbols but only ${ALPHA.length} alphabet characters`);
const ch = (s) => ALPHA[ID.get(s)];

/** A probability as one character. 0 to 1 over the alphabet's length, so about 1.1 per cent a step. */
const STEPS = ALPHA.length - 1;
const pch = (p) => ALPHA[Math.max(0, Math.min(STEPS, Math.round(p * STEPS)))];

/** Fixed width records, so there is nothing to split on. */
function pack(m, ctxChars) {
  let out = '';
  for (const [k, d] of m) {
    const tot = [...d.values()].reduce((a, b) => a + b, 0);
    if (tot < MIN_CTX) continue;
    const rows = ranked(d).filter(([, n]) => n >= MIN_ROW).slice(0, KEEP);
    if (!rows.length) continue;
    const key = ctxChars === 2 ? k.split('|').map(ch).join('') : ch(k);
    if (key.includes('undefined')) continue;
    let body = '';
    for (let i = 0; i < KEEP; i++) body += rows[i] ? ch(rows[i][0]) + pch(rows[i][1] / tot) : PAD + PAD;
    out += key + body;
  }
  return out;
}

/** The same thing as plain JSON, measured only so the packing can be justified. */
function plain(m) {
  const t = {};
  for (const [k, d] of m) {
    const tot = [...d.values()].reduce((a, b) => a + b, 0);
    if (tot < MIN_CTX) continue;
    const rows = ranked(d).filter(([, n]) => n >= MIN_ROW).slice(0, KEEP);
    if (rows.length) t[k] = rows.map(([s, n]) => [s, Math.round(1000 * n / tot)]);
  }
  return t;
}

const table = { v: 1, alpha: ALPHA, keep: KEEP, syms: SYMS };
/* ⚠️ THE SPELLING IS A SECOND FIELD AND IT IS WHAT MAKES THE ANSWER READ AS
   JAZZ. `7dom` is the function; the commonest surface spelling of it in iRb is
   what a player expects to see written on the chart. A page that answers `G7`
   where 1,966 standards wrote `G7b9` has thrown the style away while being
   functionally correct. */
for (const which of ['jazz', 'pop']) {
  const { c } = styles[which];
  table[which] = {
    temp: TEMP[which],
    mix: MIX[which],
    bi: pack(c.bi, 1),
    tri: pack(c.tri, 2),
    uni: SYMS.map((s) => pch((c.uni.get(s) || 0) / c.total)).join(''),
    spell: SYMS.map((s) => { const sp = c.spell.get(s); return sp ? ranked(sp)[0][0] : ''; }),
  };
}

const json = JSON.stringify(table);
console.log('='.repeat(72));
console.log('WHAT WAS COUNTED');
console.log('='.repeat(72));
for (const which of ['jazz', 'pop']) {
  const s = styles[which];
  console.log(`${which.padEnd(6)} ${s.seqs} sequences, ${s.events} harmonic events, ${s.c.uni.size} symbols, ${s.c.bi.size} bigram and ${s.c.tri.size} trigram contexts`);
  console.log(`       kept at ctx>=${MIN_CTX} row>=${MIN_ROW} keep ${KEEP}: ${table[which].bi.length / (1 + 2 * KEEP)} bigram, ${table[which].tri.length / (2 + 2 * KEEP)} trigram`);
  console.log(`       top eight: ${ranked(s.c.uni).slice(0, 8).map(([x, v]) => `${say(x)} ${(100 * v / s.c.total).toFixed(1)}%`).join('  ')}`);
}
console.log('\n' + '='.repeat(72));
console.log('WHAT IT COSTS A VISITOR');
console.log('='.repeat(72));
let plainBytes = 0;
for (const which of ['jazz', 'pop']) {
  const { c } = styles[which];
  plainBytes += Buffer.byteLength(JSON.stringify({ bi: plain(c.bi), tri: plain(c.tri) }));
}
console.log(`packed, both styles, one file        ${String(Buffer.byteLength(json)).padStart(8)} bytes`);
console.log(`the same tables as ordinary JSON     ${String(plainBytes).padStart(8)} bytes  (${(plainBytes / Buffer.byteLength(json)).toFixed(1)}x)`);
console.log(`the two corpora it was counted from  ${String(750084).padStart(8)} bytes, and they stay in tmp/`);
console.log(`/nola/'s recordings, already shipped ${String(3824981).padStart(8)} bytes across 95 files`);
console.log(`so the table is ${(100 * Buffer.byteLength(json) / 3824981).toFixed(2)} per cent of what that page already asks a visitor for.`);

/**
 * 🔴 THE ROUND TRIP, AND THE SABOTAGE THAT PROVES IT IS NOT DECORATION. A packed
 * table is unreadable by eye, so the only thing standing between a packing bug
 * and a page that suggests the wrong chord confidently is this check. It decodes
 * what was just packed and asks nine named jazz questions of it.
 * ⚠️ AND IT IS RUN A SECOND TIME AGAINST A TRUNCATED TABLE. A check that stayed
 * green under that would be measuring nothing, which is this repository's most
 * repeated finding about its own instruments.
 */
const REV = new Map([...ALPHA].map((c, i) => [c, i]));
function decode(st) {
  const bi = new Map(), tri = new Map();
  const rd = (packed, w, into) => {
    const rec = w + 2 * KEEP;
    for (let i = 0; i + rec <= packed.length; i += rec) {
      const key = [...packed.slice(i, i + w)].map((c) => SYMS[REV.get(c)]).join('|');
      const rows = [];
      for (let j = 0; j < KEEP; j++) {
        const c = packed[i + w + 2 * j];
        if (c === PAD) continue;
        rows.push([SYMS[REV.get(c)], REV.get(packed[i + w + 2 * j + 1]) / STEPS]);
      }
      into.set(key, rows);
    }
  };
  rd(st.bi, 1, bi); rd(st.tri, 2, tri);
  return { bi, tri };
}
const ASKS = [['Dm7 wants G7', ['2min'], '7dom'], ['Dm7 G7 wants Cmaj7', ['2min', '7dom'], '0maj'],
  ['Dm7b5 wants G7', ['2hdim'], '7dom'], ['Dm7b5 G7 wants Cm', ['2hdim', '7dom'], '0min'],
  ['A7 wants Dm7', ['9dom'], '2min'], ['Dm7 Db7 wants Cmaj7', ['2min', '1dom'], '0maj'],
  ['Fm7 wants Bb7', ['5min'], '10dom'], ['Cmaj7 A7 wants Dm7', ['0maj', '9dom'], '2min'],
  ['Cmaj7 C#dim7 wants Dm7', ['0maj', '1dim'], '2min']];
const askAll = (d) => ASKS.filter(([, ctx, want]) =>
  (d.tri.get(ctx.join('|')) || d.bi.get(ctx[ctx.length - 1]) || []).some(([s]) => s === want)).length;
const good = decode(table.jazz);
console.log('\n' + '='.repeat(72));
console.log('THE ROUND TRIP, decoded back out of the packing');
console.log('='.repeat(72));
for (const [lbl, ctx, want] of ASKS) {
  const rows = good.tri.get(ctx.join('|')) || good.bi.get(ctx[ctx.length - 1]) || [];
  const i = rows.findIndex(([s]) => s === want);
  console.log(`  ${lbl.padEnd(26)} ${rows.map(([s, p]) => `${say(s)} ${(100 * p).toFixed(0)}%`).join('  ').padEnd(34)} ${i < 0 ? 'MISSING' : `#${i + 1}`}`);
}
const ok = askAll(good);
const broken = askAll(decode({ bi: table.jazz.bi.slice(0, 1 + 2 * KEEP), tri: table.jazz.tri.slice(0, 2 + 2 * KEEP) }));
console.log(`decoded: ${ok} of ${ASKS.length}.  the same check against a table truncated to one record: ${broken} of ${ASKS.length}.`);
if (ok !== ASKS.length) { console.error('ROUND TRIP FAILED, nothing written.'); process.exit(1); }
if (broken !== 0) { console.error('THE SABOTAGE DID NOT GO RED, so this check is decoration. Nothing written.'); process.exit(1); }

if (CHECK) { console.log('\n--check, so nothing was written.'); process.exit(0); }

writeFileSync(OUT, json);
writeFileSync(LIC, `Chord transition tables in chord-tables.json, and where they came from.

These tables are COUNTS over a key-relative chord alphabet. They are derived
works. Neither corpus is redistributed here: both stay in tmp/, which is
gitignored, and are fetched once by demo/resources/fetch-chord-corpora.mjs.

Written by demo/resources/build-chord-tables.mjs on ${new Date().toISOString().slice(0, 10)}.
Pruned at ctx>=${MIN_CTX} row>=${MIN_ROW} keep ${KEEP}. Do not edit by hand: run the script.

-- The jazz table -----------------------------------------------------------

The iRealPro Corpus of Jazz Standards (the iRb corpus), version 1.0.
Daniel Shanahan and Yuri Broze.
https://doi.org/10.5281/zenodo.3546040

Licensed CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
CC BY requires attribution to travel with the work AND with derivatives of it,
which is why this file sits beside the table rather than in a commit message.
The table is a derivative: it carries counts taken from that corpus and no part
of the corpus itself.

Cited by its authors as:
  Broze, Y. and Shanahan, D. (2013). "Diachronic Changes in Jazz Harmony:
  A Cognitive Perspective." Music Perception 31(1), 32-45.

-- The pop table ------------------------------------------------------------

The McGill Billboard Project (Chord Analysis Dataset).
John Ashley Burgoyne, Jonathan Wild and Ichiro Fujinaga, DDMAL, McGill.
https://ddmal.ca/research/The_McGill_Billboard_Project_(Chord_Analysis_Dataset)/

Released CC0: the DDMAL has waived all copyright and related or neighbouring
rights. CC0 attaches no condition to anything derived from it. The citation the
DDMAL asks for is a scholarly norm rather than a licence condition, and it is
carried here because a table nobody can trace back is a table nobody can check:
  Burgoyne, J. A., Wild, J. and Fujinaga, I. (2011). "An Expert Ground Truth
  Set for Audio Chord Recognition and Music Analysis." ISMIR 2011, 633-638.

The URL everybody cites, ddmal.music.mcgill.ca, is dead and answers a 404.
The live host is ddmal.ca.
`);
console.log(`\nwrote ${OUT} (${Buffer.byteLength(json)} bytes)`);
console.log(`wrote ${LIC}`);
