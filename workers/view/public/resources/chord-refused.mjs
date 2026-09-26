// demo/resources/chord-refused.mjs. What real charts write and `parseChord`
// refuses, counted rather than guessed.
//
//   node demo/resources/chord-refused.mjs
//   node demo/resources/chord-refused.mjs --all      every refused form, not the top 40
//
// Asked for 2026-09-26 after `/nola/` refused the typed line `Cmaj7 C2/E` with
// *"C2/E is not a chord, because 2 is not a chord quality"*, beside an Open
// Studio lesson playing exactly that chord with exactly that caption. The
// instruction with the report was the whole of why this file exists: **do not
// add one row and call it done, and do not guess at a second.**
//
// 🔴 IT CONTACTS NOBODY. Both corpora are already in gitignored
// `tmp/chord-corpora/`, put there once by `fetch-chord-corpora.mjs`, whose
// `--check` reports 0 requests. The standing rule about somebody else's server
// is the reason this reads a cache rather than a URL.
//
// 🔴 AND IT MEASURES THE QUALITY, NOT THE ROOT. Both corpora spell their roots
// in their own notation (Humdrum writes a flat `-`, Harte separates the quality
// with `:`), and a root spelling is a fact about the corpus rather than about
// this parser. So every quality is probed as `C#<quality>`: `C#` consumes the
// accidental slot, so a quality that begins with `b` is still read as a quality
// rather than as a flat. Probing with a bare `C` would have read `Cb9` as B
// flat with a 9 on it and reported a refusal that was this file's fault.
//
// ⚠️ THE FULL SYMBOL IS ALSO RUN, because a quality is not the whole of what a
// person types and the slash bass is the other half of the symbol that was
// asked about. The two answers are reported separately and they are different
// numbers for a reason that is notation rather than music: McGill Billboard
// writes its bass as a DEGREE (`C:maj/3`, `C:maj/b7`) where iRb and a person
// both write a NOTE (`C/E`), so every pop slash chord fails a test it was never
// spelled for. That is counted and named rather than folded into the total.
//
// ⚠️ AND THE COUNT IS OF WRITTEN TOKENS, NOT OF PLAYED ONES. `parseIrb` honours
// the `*>[A,N1,A,N2,B,A2]` expansion list and so counts a section once per
// playing, which is the right weighting for a transition table and the wrong
// one here: the question is what a person WRITES, so a chord written once is
// counted once.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRoot } from './chord-corpus.mjs';
import { parseChord, QUALITIES } from '../shell/chords.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const X = join(REPO, 'tmp', 'chord-corpora', 'x');

/* ⚠️ A SKIP NAMES WHAT GOES UNMEASURED RATHER THAN PASSING QUIETLY, which is
   the convention every other check in this repository already keeps. */
if (!existsSync(X)) {
  console.log('tmp/chord-corpora/x is not on this disk, so nothing was measured.');
  console.log('node demo/resources/fetch-chord-corpora.mjs   puts it there, once.');
  process.exit(0);
}

const bump = (m, k, n = 1) => m.set(k, (m.get(k) || 0) + n);

/* ── the two corpora, as written tokens ────────────────────────────────────── */

/**
 * One raw chord token into its parts, with no judgement about any of them.
 * @returns {{quality:string, bass:string|null, root:number}|null}
 */
function split(tok, flatChar) {
  const r = readRoot(tok, flatChar);
  if (!r) return null;
  let s = tok.slice(r.used);
  if (s.startsWith(':')) s = s.slice(1);          // Harte and iRb both use it
  const sl = s.indexOf('/');
  const bass = sl >= 0 ? s.slice(sl + 1) : null;
  if (sl >= 0) s = s.slice(0, sl);
  return { quality: s, bass, root: r.pc };
}

/** iRb, the Humdrum `**jazz` spine. One token per written chord. */
function readJazz() {
  const dir = join(X, 'irb', 'iRb_v1-0');
  const out = [];
  const files = readdirSync(dir).filter((n) => n.endsWith('.jazz'));
  for (const f of files) {
    for (const raw of readFileSync(join(dir, f), 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      /* `!` is a comment, `*` an interpretation, `=` a barline. The data line is
         a duration and then the chord, which is `parseIrb`'s own rule. */
      if (!line || line[0] === '!' || line[0] === '*' || line[0] === '=') continue;
      const tok = /^[0-9.]+(.*)$/.exec(line);
      if (!tok) continue;
      const s = tok[1].trim();
      if (!s || s === 'r' || s === '.') continue;          // `r` is a rest
      out.push({ raw: s, ...(split(s, '-') || { quality: null }) });
    }
  }
  return { files: files.length, tokens: out };
}

/** McGill Billboard, the SALAMI chord text. */
function readPop() {
  const dir = join(X, 'McGill-Billboard');
  const out = [];
  const dirs = readdirSync(dir).filter((n) => /^\d+$/.test(n));
  for (const d of dirs) {
    for (const raw of readFileSync(join(dir, d, 'salami_chords.txt'), 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line[0] === '#') continue;
      const tab = line.indexOf('\t');
      const body = tab >= 0 ? line.slice(tab + 1) : line;
      if (/^(silence|end|Z)\b/.test(body)) continue;
      if (!body.includes('|')) continue;
      for (const bar of body.split('|').slice(1, -1)) {
        for (const t of bar.trim().split(/\s+/)) {
          if (!t || t === '.' || t === '*' || t === 'N' || t === 'X') continue;
          if (t.startsWith('&') || t.startsWith('(')) continue;   // `&pause`, `(4)`
          out.push({ raw: t, ...(split(t, 'b') || { quality: null }) });
        }
      }
    }
  }
  return { files: dirs.length, tokens: out };
}

/* ── the three kinds of refusal ────────────────────────────────────────────── */

/**
 * 🔴 THREE BUCKETS AND NOT TWO, AND THE THIRD ONE IS THE REASON THE LIST DOES
 * NOT INFLATE. The brief asked for two, a quality the table genuinely lacks
 * against a spelling of a quality it already has, and the corpora carry a third
 * that is neither: a CORPUS WRITING CONVENTION that nobody types into a text
 * box. `C:maj(9)` is Harte's way of writing `Cadd9`, `1` is Harte's way of
 * writing *the root and nothing else*, `6(F:min7)` is iRb parking an
 * alternative chord in brackets, and `min:maj7` is iRb's quality separator
 * turning up in the middle of a quality. Counting those as parser gaps would
 * say this parser refuses 14 per cent of pop when what it refuses is a file
 * format.
 * ⚠️ AND THE BUCKET IS A JUDGEMENT, SO IT IS WRITTEN DOWN HERE RATHER THAN
 * INFERRED. Everything not named below falls to the rules under it and the tail
 * is printed, so a form nobody classified is visible rather than absorbed.
 */
const SPELLING = {
  h7: 'min7b5', h: 'min7b5', hdim7: 'min7b5', o7: 'dim7', o: 'dim',
  '+': 'aug', '^': 'maj7', '^9': 'maj9',
};

const kindOf = (q) => {
  if (q in SPELLING) return 'spelling';
  /* Harte parentheses, iRb bracketed alternatives, iRb `;` and `*7+*`. */
  if (/[();*]/.test(q)) return 'notation';
  /* Harte's root-only shorthand, which is not a chord quality at all. */
  if (/^1$/.test(q)) return 'notation';
  /* iRb's quality separator inside a quality: `min:maj7`. */
  if (q.includes(':')) return 'notation';
  return 'missing';
};

/* ── run it ────────────────────────────────────────────────────────────────── */

const jazz = readJazz(), pop = readPop();
const all = [['jazz', jazz], ['pop', pop]];

/** Every distinct quality with its count, per corpus. */
const qCount = new Map();       // quality -> {jazz, pop}
for (const [name, c] of all) {
  for (const t of c.tokens) {
    if (t.quality === null) continue;
    let d = qCount.get(t.quality);
    if (!d) qCount.set(t.quality, d = { jazz: 0, pop: 0 });
    d[name]++;
  }
}

const okQuality = new Map();
for (const q of qCount.keys()) okQuality.set(q, parseChord(`C#${q}`).ok);

const tally = { jazz: { ok: 0, no: 0, noroot: 0 }, pop: { ok: 0, no: 0, noroot: 0 } };
for (const [name, c] of all) {
  for (const t of c.tokens) {
    if (t.quality === null) { tally[name].noroot++; continue; }
    okQuality.get(t.quality) ? tally[name].ok++ : tally[name].no++;
  }
}

console.log('\n== what the corpora write ==\n');
for (const [name, c] of all) {
  const t = tally[name];
  const n = c.tokens.length;
  console.log(`${name.padEnd(5)} ${String(c.files).padStart(5)} charts  ${String(n).padStart(7)} written chords  `
    + `${String(qCount.size).padStart(0)}`.replace(/.*/, '')
    + `quality parses ${(100 * t.ok / n).toFixed(2)}%  (${t.ok} of ${n}, ${t.no} refused, ${t.noroot} with no root letter)`);
}
{
  const n = jazz.tokens.length + pop.tokens.length;
  const ok = tally.jazz.ok + tally.pop.ok;
  console.log(`both  ${String(jazz.files + pop.files).padStart(5)} charts  ${String(n).padStart(7)} written chords  `
    + `quality parses ${(100 * ok / n).toFixed(2)}%  (${ok} of ${n})`);
  console.log(`      ${qCount.size} distinct qualities, of which ${[...okQuality.values()].filter(Boolean).length} parse`);
}

/* ── the full symbol, bass and all ─────────────────────────────────────────── */

/**
 * ⚠️ THE ROOT IS TRANSLATED AND THE QUALITY IS NOT. Humdrum's `-` for a flat is
 * the same note in another hand, so writing it as `b` tests the parser rather
 * than the file format. Nothing else about the token is touched.
 */
const full = { jazz: { ok: 0, no: 0, slash: 0, slashOk: 0 }, pop: { ok: 0, no: 0, slash: 0, slashOk: 0 } };
for (const [name, c] of all) {
  const flat = name === 'jazz' ? /-/g : /(?!)/g;
  for (const t of c.tokens) {
    if (t.quality === null) continue;
    const sym = t.raw.replace(/:/g, '').replace(flat, 'b');
    const r = parseChord(sym);
    full[name][r.ok ? 'ok' : 'no']++;
    if (t.bass !== null) { full[name].slash++; if (r.ok) full[name].slashOk++; }
  }
}
console.log('\n== the whole symbol, bass included ==\n');
for (const [name] of all) {
  const f = full[name], n = f.ok + f.no;
  console.log(`${name.padEnd(5)} whole symbol parses ${(100 * f.ok / n).toFixed(2)}%  (${f.ok} of ${n}), `
    + `of ${f.slash} slash chords ${f.slashOk} parse`);
}
console.log('⚠️  McGill Billboard writes its bass as a DEGREE (`/3`, `/b7`), not as a note,');
console.log('    so its slash chords fail on notation rather than on anything musical.');

/* ── the refusals, ranked ──────────────────────────────────────────────────── */

const refused = [...qCount].filter(([q]) => !okQuality.get(q))
  .map(([q, d]) => ({ q, ...d, n: d.jazz + d.pop, kind: kindOf(q) }))
  .sort((a, b) => b.n - a.n);

const bucket = { missing: 0, spelling: 0, notation: 0 };
for (const r of refused) bucket[r.kind] += r.n;

console.log('\n== what it refuses, ranked, and which kind of refusal it is ==\n');
const show = process.argv.includes('--all') ? refused : refused.slice(0, 40);
console.log('   total    jazz     pop  kind      quality');
for (const r of show) {
  console.log(`${String(r.n).padStart(8)}${String(r.jazz).padStart(8)}${String(r.pop).padStart(8)}  `
    + `${r.kind.padEnd(9)} ${JSON.stringify(r.q)}`
    + (r.kind === 'spelling' ? `  is ${SPELLING[r.q]}` : ''));
}
if (show.length < refused.length) {
  const rest = refused.slice(show.length);
  console.log(`   ... and ${rest.length} more forms, ${rest.reduce((s, r) => s + r.n, 0)} occurrences. --all prints them.`);
}

console.log('\n== the three buckets ==\n');
const tot = bucket.missing + bucket.spelling + bucket.notation;
for (const k of ['missing', 'spelling', 'notation']) {
  console.log(`${k.padEnd(9)} ${String(bucket[k]).padStart(6)} occurrences  ${(100 * bucket[k] / tot).toFixed(1)}% of refusals  `
    + `${refused.filter((r) => r.kind === k).length} distinct forms`);
}

/* ── the one that was asked about ──────────────────────────────────────────── */

console.log('\n== `2`, which is the chord that was asked about ==\n');
const two = qCount.get('2');
console.log(`written as a quality in these corpora: ${two ? two.jazz + two.pop : 0} times`);
const s2 = qCount.get('sus2'), a9 = qCount.get('add9'), m9 = qCount.get('maj(9)');
console.log(`its neighbours: sus2 ${s2 ? s2.jazz + s2.pop : 0}, add9 ${a9 ? a9.jazz + a9.pop : 0}, `
  + `Harte maj(9) ${m9 ? m9.jazz + m9.pop : 0}`);
console.log('🔴 SO THE CORPORA DO NOT JUSTIFY `2` AND CANNOT. Neither corpus uses that');
console.log('   spelling at all, and both predate the teaching the ask came from. What');
console.log('   justifies it is the lesson in the screenshot, and this file says so');
console.log('   rather than dressing a decision up as a measurement.');
console.log(`\nC2/E today: ${(() => { const c = parseChord('C2/E'); return c.ok ? c.notes.join(' ') : `refused, ${c.why}`; })()}`);
console.log(`QUALITIES holds ${QUALITIES.length} rows.`);
console.log('');
