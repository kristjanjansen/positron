// Shared loading for the chord experiments of 2026-09-25.
// It reuses demo/resources/chord-corpus.mjs verbatim and reproduces
// bench-chord-suggester.mjs's deterministic by-song split, so every number here
// is comparable with the ones already published in
// research/chord-suggester-benchmark-2026-09-23.md.
//
// It contacts nobody. tmp/chord-corpora/ is already on this disk.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseIrb, parseBillboard, toSymbols } from './chord-corpus.mjs';

export const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const X = join(REPO, 'tmp', 'chord-corpora', 'x');

export const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

export function loadJazz() {
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

export function loadPop() {
  const dir = join(X, 'McGill-Billboard');
  const out = [];
  for (const d of readdirSync(dir).filter((n) => /^\d+$/.test(n))) {
    const p = parseBillboard(readFileSync(join(dir, d, 'salami_chords.txt'), 'utf8'));
    const seqs = p.runs.map((r) => toSymbols(r, p.tonic)).filter((s) => s.length >= 4);
    if (seqs.length) out.push({ id: d, seqs });
  }
  return out;
}

export const split = (songs, frac = 0.2) => {
  const test = [], train = [];
  for (const s of songs) ((hash(s.id) % 1000) < frac * 1000 ? test : train).push(s);
  return { train, test };
};

export function count(songs) {
  const uni = new Map(), bi = new Map(), tri = new Map();
  const bump = (m, k, n) => { let d = m.get(k); if (!d) m.set(k, d = new Map()); d.set(n, (d.get(n) || 0) + 1); };
  let events = 0;
  for (const s of songs) for (const seq of s.seqs) {
    for (let i = 0; i < seq.length; i++) {
      events++;
      uni.set(seq[i].s, (uni.get(seq[i].s) || 0) + 1);
      if (i >= 1) bump(bi, seq[i - 1].s, seq[i].s);
      if (i >= 2) bump(tri, `${seq[i - 2].s}|${seq[i - 1].s}`, seq[i].s);
    }
  }
  return { uni, bi, tri, events, total: [...uni.values()].reduce((a, b) => a + b, 0) };
}

export const ranked = (m) => (m ? [...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)) : []);

/** Every (context, real next) in held-out songs. */
export function cases(songs) {
  const out = [];
  for (const s of songs) for (const seq of s.seqs) for (let i = 2; i < seq.length; i++) {
    out.push({ ctx: [seq[i - 2].s, seq[i - 1].s], next: seq[i].s });
  }
  return out;
}

/** Attestation counted on the held-out songs. */
export function attestation(songs) {
  const bi = new Map(), tri = new Map();
  const bump = (m, k, n) => { let d = m.get(k); if (!d) m.set(k, d = new Set()); d.add(n); };
  for (const s of songs) for (const seq of s.seqs) for (let i = 1; i < seq.length; i++) {
    bump(bi, seq[i - 1].s, seq[i].s);
    if (i >= 2) bump(tri, `${seq[i - 2].s}|${seq[i - 1].s}`, seq[i].s);
  }
  return { bi, tri };
}

/** The distribution the shipped suggester reads for a context, with its backoff. */
export function rowsFor(c, ctx, { triFloor = 8 } = {}) {
  const a = ctx[ctx.length - 2], b = ctx[ctx.length - 1];
  let d = (a !== undefined && b !== undefined) ? c.tri.get(`${a}|${b}`) : null;
  let tot = d ? [...d.values()].reduce((x, y) => x + y, 0) : 0;
  let how = 'tri';
  if (!d || tot < triFloor) {
    d = b !== undefined ? c.bi.get(b) : null;
    tot = d ? [...d.values()].reduce((x, y) => x + y, 0) : 0;
    how = 'bi';
  }
  if (!d) return { rows: [], tot: 0, how: 'uni' };
  return { rows: ranked(d), tot, how };
}

export const pct = (x, n) => (n ? (100 * x / n).toFixed(1) : '0.0');
export const f = (x, n = 2) => Number(x).toFixed(n);

/**
 * 🔴 THE TABLE IN THE SHAPE THAT SHIPS, WHICH IS NOT THE SHAPE THE PLAN
 * MEASURED, AND THE DIFFERENCE IS THE WHOLE REASON THIS EXISTS.
 * `plans/plan-better-chords-2026-09-25.md` sampled over every row a context had
 * with a count of three or more. `demo/resources/chord-tables.json` keeps the
 * **top three rows only**, drops any context seen fewer than eight times, and
 * writes each probability as **one character in 89 steps**. A sampler graded on
 * the first shape and shipped against the second is a number about a table
 * nobody has.
 *
 * The three constants are read off `build-chord-tables.mjs` and are the same
 * three: `MIN_CTX 8`, `MIN_ROW 3`, `KEEP 3`, quantised over `ALPHA.length - 1`.
 *
 * @returns {{id, bi: Map, tri: Map, uni: Map, spell: Map, temp}} the object
 *   `useTables` hands a page, so the shipped `suggest.mjs` can be pointed
 *   straight at it.
 */
export function shipShape(c, { id = 'x', temp = 1, minCtx = 8, minRow = 3, keep = 3,
  steps = 89 } = {}) {
  const q = (p) => Math.max(0, Math.min(steps, Math.round(p * steps))) / steps;
  const shrink = (m) => {
    const out = new Map();
    for (const [k, d] of m) {
      const tot = [...d.values()].reduce((a, b) => a + b, 0);
      if (tot < minCtx) continue;
      const rows = ranked(d).filter(([, n]) => n >= minRow).slice(0, keep)
        .map(([s, n]) => [s, q(n / tot)]);
      if (rows.length) out.set(k, rows);
    }
    return out;
  };
  const uni = new Map([...c.uni].map(([s, n]) => [s, q(n / c.total)]));
  return { id, bi: shrink(c.bi), tri: shrink(c.tri), uni, spell: new Map(), temp };
}
