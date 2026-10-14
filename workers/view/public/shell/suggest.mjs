// demo/shell/suggest.mjs: what might come next, out of a counted trigram table over
// (degree 0..11, class), with the diatonic rule as the last resort. No audio, no DOM.
// Slot A is the idiomatic chord, drawn; slot B is the specific one, drawn by PMI. Tests: suggest-test.mjs.
// why: lessons/kit-suggest.md#header

import { NOTE_LETTERS } from './name.mjs';
import { parseChord, roman } from './chords.mjs';

const pcOf = (n) => (((n % 12) + 12) % 12);

// ── the key, which is a fiat and is said out loud ──────────────────────────

/**
 * The seven degrees of each mode, used only to decide where the music is centred.
 * The minor also carries a major V and a diminished vii, so a minor ii V fits a key.
 * why: lessons/kit-suggest.md#degrees
 */
const DEGREES = {
  major: [[0, 'maj', 'I'], [2, 'min', 'ii'], [4, 'min', 'iii'], [5, 'maj', 'IV'],
    [7, 'maj', 'V'], [9, 'min', 'vi'], [11, 'dim', 'vii']],
  minor: [[0, 'min', 'i'], [2, 'dim', 'ii'], [3, 'maj', 'III'], [5, 'min', 'iv'],
    [7, 'min', 'v'], [7, 'maj', 'V'], [8, 'maj', 'VI'], [10, 'maj', 'VII'],
    [11, 'dim', 'vii']],
};

/**
 * A seventh is its triad for finding a key; a chord with no third returns null and is
 * skipped, so an augmented triad does not make every key fail.
 * why: lessons/kit-suggest.md#as-triad
 */
const asTriad = (q) => ({ maj: 'maj', maj7: 'maj', 7: 'maj', min: 'min', min7: 'min',
  dim: 'dim', min7b5: 'dim' }[q] ?? null);

/**
 * A chord's numeral in a key. chords.mjs roman measures against a major reference,
 * so it is used only for chords off the scale.
 * why: lessons/kit-suggest.md#numeral-in
 */
export const numeralIn = (root, quality, key) => {
  if (!key) return '';
  const triad = asTriad(quality);
  const row = DEGREES[key.mode].find(([step, q]) => pcOf(root - key.pc) === step && q === triad);
  return row ? row[2] : roman({ ok: true, root, quality }, key.pc);
};

/** Which keys every one of these chords could belong to. */
export function keysFitting(chords) {
  const want = (chords || []).map((c) => [c.root, asTriad(c.quality)])
    .filter(([, t]) => t !== null);
  const out = [];
  if (!want.length) return out;
  for (let pc = 0; pc < 12; pc++) {
    for (const mode of ['major', 'minor']) {
      const ok = want.every(([root, triad]) => DEGREES[mode]
        .some(([step, q]) => pcOf(root - pc) === step && q === triad));
      if (ok) out.push({ pc, mode });
    }
  }
  return out;
}

/**
 * One key decision for both tables. Falls back to the first fitting key (guessed),
 * and to the first chord's root when nothing fits.
 * why: lessons/kit-suggest.md#pick-key
 */
export function pickKey(chords) {
  const fits = keysFitting(chords);
  const first = chords[0]?.root ?? 0;
  if (!fits.length) return { key: null, tonic: first, fits, guessed: true };
  const onTonic = fits.find((k) => k.pc === first);
  const key = onTonic || fits[0];
  return { key, tonic: key.pc, fits, guessed: !onTonic };
}

// ── the diatonic rule, kept as the last resort ─────────────────────────────

/**
 * The 173 byte diatonic rule, now the last resort: 1.4 per cent top 1 on held-out jazz.
 * The minor half was never measured.
 * why: lessons/kit-suggest.md#plain
 */
const PLAIN = {
  major: {
    I: ['vi', 'IV', 'V', 'ii', 'iii'],
    ii: ['V', 'vii', 'I', 'IV'],
    iii: ['vi', 'IV', 'ii'],
    IV: ['V', 'I', 'ii', 'vi'],
    V: ['I', 'vi', 'IV'],
    vi: ['IV', 'ii', 'V', 'I'],
    vii: ['I', 'iii'],
  },
  minor: {
    i: ['VI', 'iv', 'VII', 'III', 'v'],
    ii: ['v', 'VII', 'i', 'VI'],
    III: ['VI', 'VII', 'iv'],
    iv: ['v', 'VII', 'i', 'VI'],
    v: ['i', 'VI', 'iv'],
    /* The harmonic minor's own dominant, which goes where the natural one goes
       and rather harder. Added with the degree row above it, and as UNVERIFIED
       as the rest of this half. */
    V: ['i', 'VI', 'iv'],
    VI: ['VII', 'iv', 'III', 'i'],
    VII: ['III', 'i', 'VI'],
    vii: ['i', 'III'],
  },
};

const fromNumeral = (numeral, key) => {
  const row = DEGREES[key.mode].find(([, , n]) => n === numeral);
  if (!row) return null;
  const root = pcOf(key.pc + row[0]);
  return { numeral, root, quality: row[1], name: `${NOTE_LETTERS[root]}${row[1]}` };
};

// ── the counted table ──────────────────────────────────────────────────────

/**
 * The class a named chord belongs to. Every row agrees with classOf in
 * demo/resources/chord-corpus.mjs except 2 and add9, which suggest-test.mjs names.
 * 5 is read as major, unmeasured.
 * why: lessons/kit-suggest.md#class-of
 */
const CLASS_OF = { maj: 'maj', maj6: 'maj', maj7: 'maj', maj9: 'maj', maj11: 'maj',
  maj13: 'maj', 6: 'maj', add9: 'maj', 5: 'maj',
  min: 'min', min6: 'min', min7: 'min', min9: 'min', min11: 'min', min13: 'min',
  7: 'dom', 9: 'dom', 11: 'dom', 13: 'dom',
  dim: 'dim', dim7: 'dim', min7b5: 'hdim',
  sus2: 'sus', sus4: 'sus', 2: 'sus', aug: 'aug' };

/**
 * A table spelling is tried through parseChord so the label and the notes agree;
 * one that will not parse falls back to its class.
 * why: lessons/kit-suggest.md#spell-alias
 */
const SPELL_ALIAS = { '+': 'aug', 'aug(b7)': 'aug', 'aug(b7,9)': 'aug',
  h7: 'min7b5', hdim7: 'min7b5', o7: 'dim7', o: 'dim',
  '7sus': 'sus4', '9sus': 'sus4', 'sus4(b7)': 'sus4', 'sus4(b7,9)': 'sus4' };
const CLASS_SPELL = { maj: 'maj', min: 'min', dom: '7', dim: 'dim', hdim: 'min7b5',
  sus: 'sus4', aug: 'aug' };

/** The loaded tables, one entry per style, plus the `plain` rule which is
 *  always there and needs no download. */
export const STYLES = {};
let LOADED = null;

/**
 * Install the benchmarked tables fetched from /resources/chord-tables.json.
 * A function, not an import, because a visit opens nothing.
 * why: lessons/kit-suggest.md#use-tables
 */
export function useTables(json) {
  if (!json || json.v !== 1 || !json.syms || !json.alpha) {
    throw new Error('that is not a chord table of version 1');
  }
  const { alpha, keep, syms } = json;
  const rev = new Map([...alpha].map((c, i) => [c, i]));
  const STEPS = alpha.length - 1;
  const PAD = ' ';
  /* Fixed width records, so there is nothing to split on and nothing to get
     wrong about a separator appearing inside a value. */
  const read = (packed, width) => {
    const out = new Map();
    const rec = width + 2 * keep;
    for (let i = 0; i + rec <= packed.length; i += rec) {
      const key = [...packed.slice(i, i + width)].map((c) => syms[rev.get(c)]).join('|');
      const rows = [];
      for (let j = 0; j < keep; j++) {
        const c = packed[i + width + 2 * j];
        if (c === PAD) continue;
        rows.push([syms[rev.get(c)], rev.get(packed[i + width + 2 * j + 1]) / STEPS]);
      }
      out.set(key, rows);
    }
    return out;
  };
  const made = {};
  for (const id of Object.keys(json)) {
    const st = json[id];
    if (!st || typeof st !== 'object' || !st.bi || !st.tri) continue;
    // The unigram is read off the log column: the linear one rounds rare chords to zero
    // and slot B divided by it. Without the column a zero reads as half a step.
    // why: lessons/kit-suggest.md#unigram-log
    const ul = Number.isFinite(st.ul) && st.ul > 0 ? st.ul : 0;
    const uni = new Map(syms.map((s, i) => [s,
      (ul && typeof st.ulog === 'string' && st.ulog.length === syms.length)
        ? (rev.get(st.ulog[i]) >= STEPS ? 0 : 2 ** (-rev.get(st.ulog[i]) / ul))
        : Math.max(rev.get(st.uni[i]) / STEPS, 0.5 / STEPS)]));
    const spell = new Map(syms.map((s, i) => [s, st.spell[i] || '']));
    // The temperature travels with the style; a table without it reads 1, jazz's value.
    // why: lessons/kit-suggest.md#style-temp
    const temp = Number.isFinite(st.temp) && st.temp >= 0 ? st.temp : 1;
    // The take mix travels with the style too: jazz 0.25, pop 0.1. Missing reads 0.25.
    // why: lessons/kit-suggest.md#style-mix
    const mix = Number.isFinite(st.mix) && st.mix >= 0 && st.mix <= 1 ? st.mix : 0.25;
    made[id] = { id, bi: read(st.bi, 1), tri: read(st.tri, 2), uni, spell, temp, mix };
  }
  LOADED = made;
  for (const id of Object.keys(made)) STYLES[id] = made[id];
  return Object.keys(made);
}

/** Has a counted table been installed, as opposed to the rule. */
export const tablesIn = () => LOADED !== null;
/** Every style a page could offer, the rule last. */
export const styleNames = () => [...Object.keys(LOADED || {}), 'plain'];

const symbolOf = (root, quality, tonic) =>
  `${pcOf(root - tonic)}${CLASS_OF[quality] || 'maj'}`;

/**
 * A table symbol back into a chord this page can draw and play.
 * @returns {{root, quality, name, numeral}|null}
 */
function chordOfSymbol(sym, tonic, style, key) {
  const m = /^(\d+)(.+)$/.exec(sym);
  if (!m) return null;
  const root = pcOf(tonic + Number(m[1]));
  const cls = m[2];
  const want = style.spell?.get(sym) || '';
  const tries = [SPELL_ALIAS[want] ?? want, CLASS_SPELL[cls] || 'maj'];
  for (const q of tries) {
    if (!q) continue;
    const c = parseChord(`${NOTE_LETTERS[root]}${q}`);
    if (c.ok) {
      return { root, quality: c.quality, name: c.name,
        numeral: key ? numeralIn(root, c.quality, key) : '' };
    }
  }
  return null;
}

/**
 * Slot B is PMI over a pool of the top rows; no pool picks visibly wrong chords
 * (9.5 points of attestation lost). The count floor is already in the built table.
 * why: lessons/kit-suggest.md#pool
 */
const POOL = 4;

/**
 * Slot B is drawn, not the argmax, which only ever gave 2.00 distinct chords a context.
 * At 1 the weight is p/u exactly: 3.53 distinct for 0.2 points of attestation.
 * why: lessons/kit-suggest.md#b-temp
 */
const B_TEMP = 1;

/**
 * A seeded LCG, shared with demo/resources/chord-e4-generators.mjs so measured
 * numbers and offered chords come off one stream.
 * why: lessons/kit-suggest.md#mk-random
 */
export function mkRandom(seed = 1) {
  let st = (seed >>> 0) || 1;
  return () => {
    st = (Math.imul(st, 1103515245) + 12345) & 0x7fffffff;
    return st / 0x7fffffff;
  };
}

/**
 * The rows the table holds for a context, trigram backing off to bigram.
 * Exported so the measurements grade this lookup rather than a copy.
 * @returns {{rows: Array<[string, number]>, how: string}}
 * why: lessons/kit-suggest.md#rows-for
 */
export function rowsFor(style, ctx) {
  const [a, b] = [ctx[ctx.length - 2], ctx[ctx.length - 1]];
  let rows = (a !== undefined && b !== undefined) ? style.tri.get(`${a}|${b}`) : null;
  let how = 'three chords of yours against three of theirs';
  if (!rows || !rows.length) {
    rows = b !== undefined ? style.bi.get(b) : null;
    how = 'the one chord before it';
  }
  return { rows: rows || [], how };
}

/**
 * One row drawn with weight p^(1/T) over the kept rows.
 * temp 0 is the argmax on purpose: suggest-test.mjs uses it as the negative control.
 * why: lessons/kit-suggest.md#sample-row
 */
export function sampleRow(rows, temp, rnd) {
  if (!rows || !rows.length) return null;
  if (!(temp > 0) || typeof rnd !== 'function') return rows[0][0];
  const w = rows.map(([, p]) => Math.pow(Math.max(p, 1e-9), 1 / temp));
  const sum = w.reduce((a, b) => a + b, 0);
  let r = rnd() * sum;
  for (let i = 0; i < rows.length; i++) { r -= w[i]; if (r <= 0) return rows[i][0]; }
  return rows[rows.length - 1][0];
}

/**
 * A take adapts the table to what is being played now (+6.32 points top 1 on held-out jazz)
 * and forgets: nothing is stored. heard() counts only source 'played' and counts what it
 * refused, so a suggester never learns from its own suggestions. Window 64, not 16.
 * @param {{window?: number}} [o]  how many recent chords count.
 * @returns {{heard, chords, counted, refused, clear, window}}
 * why: lessons/kit-suggest.md#mk-take
 */
export function mkTake({ window = 64 } = {}) {
  const chords = [];
  let counted = 0, refused = 0;
  return {
    /**
     * One chord that was played, or one that was not. Returns whether it counted.
     * @param {{root:number, quality:string}} chord
     * @param {string} source  `'played'` and nothing else is counted.
     */
    heard(chord, source) {
      if (source !== 'played' || !chord || !Number.isFinite(chord.root)) { refused++; return false; }
      chords.push({ root: chord.root, quality: chord.quality });
      while (chords.length > window * 4) chords.shift();
      counted++;
      return true;
    },
    get chords() { return chords.slice(-window); },
    get counted() { return counted; },
    get refused() { return refused; },
    clear() { chords.length = 0; counted = 0; refused = 0; },
    window,
  };
}

/**
 * The table's rows with the take mixed in as (1 - w) * world + w * yours, backing off
 * like the table, then re-sorted so the mix decides both slots.
 * @param {Array<[string, number]>} rows  what the table holds
 * @param {string[]} take  the take's chords as table symbols, oldest first
 * @param {string[]} ctx  the context being asked about, as table symbols
 * why: lessons/kit-suggest.md#adapt-rows
 */
export function adaptRows(rows, take, ctx, { weight = 0.25, floor = 2 } = {}) {
  if (!take || take.length < 3 || !(weight > 0)) return rows;
  const a = ctx[ctx.length - 2], b = ctx[ctx.length - 1];
  let d = new Map(), tot = 0;
  if (a !== undefined && b !== undefined) {
    for (let i = 2; i < take.length; i++) {
      if (take[i - 2] === a && take[i - 1] === b) { d.set(take[i], (d.get(take[i]) || 0) + 1); tot++; }
    }
  }
  if (tot < floor) {
    d = new Map(); tot = 0;
    for (let i = 1; i < take.length; i++) {
      if (take[i - 1] === b) { d.set(take[i], (d.get(take[i]) || 0) + 1); tot++; }
    }
  }
  if (!tot) return rows;
  const out = new Map((rows || []).map(([s, p]) => [s, (1 - weight) * p]));
  for (const [s, n] of d) out.set(s, (out.get(s) || 0) + weight * n / tot);
  return [...out].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
}

export function twoSlots(style, ctx, { temp = 1, rnd = null, bTemp = 0, take = null,
  weight = 0.25 } = {}) {
  const got = rowsFor(style, ctx);
  const how = got.how;
  const rows = take ? adaptRows(got.rows, take, ctx, { weight }) : got.rows;
  if (!rows.length) return null;
  const A = sampleRow(rows, temp, rnd);
  // A diminished chord is a step on the way, and PMI favours it as rare, so slot B's
  // pool leaves it out. Slot A, the walk and the way home keep it.
  // why: lessons/kit-suggest.md#passing
  const pool = rows.slice(0, POOL).filter(([s]) => s !== A && !PASSING.test(s))
    .map(([s, p]) => [s, Math.log2(p / (style.uni.get(s) || 1e-6))]);
  let B = null;
  if (!pool.length) B = null;
  else if (!(bTemp > 0) || typeof rnd !== 'function') {
    // The argmax, what bTemp: 0 means; suggest-test.mjs uses it as the negative control.
    // why: lessons/kit-suggest.md#b-argmax
    let best = -Infinity;
    for (const [s, score] of pool) if (score > best) { best = score; B = s; }
  } else {
    // 2^(pmi/T) is (p/u)^(1/T), so one dial means the same in both slots.
    // why: lessons/kit-suggest.md#b-draw
    const top = Math.max(...pool.map(([, sc]) => sc));
    const w = pool.map(([, sc]) => Math.pow(2, (sc - top) / bTemp));
    const sum = w.reduce((a, b) => a + b, 0);
    let r = rnd() * sum;
    B = pool[pool.length - 1][0];
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) { B = pool[i][0]; break; } }
  }
  return { A, B: B ?? (rows.find(([s]) => s !== A && !PASSING.test(s))?.[0] ?? null), how, rows };
}

/** A table symbol whose class is a passing chord, which slot B never offers. */
const PASSING = /^\d+dim$/;

/**
 * A beam search over the trigram for a run of steps chords ending on target, sampled per
 * step since a best path is as cliched as a best chord. beam 256 must stay above KEEP^3.
 * @returns {{path: string[], lp: number, tried: number}|null}
 * why: lessons/kit-suggest.md#route-over
 */
export function routeOver(style, ctx0, target, steps = 4,
  { temp = 1, rnd = null, beam = 256, take = null, weight = 0.25 } = {}) {
  if (!style || !target || steps < 1) return null;
  let live = [{ ctx: [...ctx0], path: [], lp: 0 }];
  for (let d = 0; d < steps; d++) {
    const next = [];
    for (const st of live) {
      // The take is mixed in at every step, as the context moves with the route.
      // why: lessons/kit-suggest.md#route-take
      const got = rowsFor(style, st.ctx);
      const rows = take ? adaptRows(got.rows, take, st.ctx, { weight }) : got.rows;
      for (const [s, p] of rows) {
        if (d < steps - 1 && s === target) continue;      // arrive once, at the end
        if (d === steps - 1 && s !== target) continue;    // and it must land on it
        next.push({ ctx: [st.ctx[st.ctx.length - 1], s], path: [...st.path, s],
          lp: st.lp + Math.log2(Math.max(p, 1e-9)) });
      }
    }
    if (!next.length) return null;
    next.sort((a, b) => b.lp - a.lp);
    live = next.slice(0, beam);
  }
  if (!live.length) return null;
  if (!(temp > 0) || typeof rnd !== 'function') return { ...live[0], tried: live.length };
  const top = live[0].lp;
  const w = live.map((st) => Math.pow(2, (st.lp - top) / steps / temp));
  const sum = w.reduce((a, b) => a + b, 0);
  let r = rnd() * sum;
  for (let i = 0; i < live.length; i++) { r -= w[i]; if (r <= 0) return { ...live[i], tried: live.length }; }
  return { ...live[live.length - 1], tried: live.length };
}

/**
 * What might come next: usual is the idiomatic continuation, other the one worth hearing.
 * temp overrides the style's own; temp: 0 is the argmax the checks use as a control.
 * @param {{chords: Array<{root:number, quality:string}>}} context
 * @param {{style?: string, temp?: number, rnd?: function}} [o]  a style name
 *   from `styleNames()`, or `plain`; a temperature, or the style's own; and a
 *   random source, so a caller that needs to repeat itself can.
 * @returns {{ok, style, source, key, keyName, tonic, guessed, from, picks, says}}
 * why: lessons/kit-suggest.md#suggest
 */
export function suggest(context, { style = 'jazz', temp = null, rnd = null,
  take = null, mix = null, bTemp = null } = {}) {
  const chords = (context?.chords || []).filter((c) => c && Number.isFinite(c.root));
  const blank = { ok: false, style, source: 'none', key: null, keyName: '', tonic: 0,
    guessed: false, from: '', picks: [], says: '' };
  if (chords.length < 2) {
    return { ...blank, says: 'two chords are needed before anything can be suggested' };
  }
  const { key, tonic, guessed } = pickKey(chords);
  const keyName = key ? `${NOTE_LETTERS[key.pc]} ${key.mode}` : `${NOTE_LETTERS[tonic]}`;
  const where = guessed
    ? `taking ${keyName} as the key, which is a guess because no key fits with your first `
      + 'chord as its home'
    : `taking ${keyName} as the key, from the first chord you played`;

  const table = STYLES[style];
  if (table && table.tri) {
    const ctx = chords.map((c) => symbolOf(c.root, c.quality, tonic));
    const T = temp === null ? (table.temp ?? 1) : temp;
    // The take holds chords and is turned into symbols with this call's tonic, which a
    // third chord can change.
    // why: lessons/kit-suggest.md#take-tonic
    const mine = take ? take.chords.map((c) => symbolOf(c.root, c.quality, tonic)) : null;
    // temp: 0 is the argmax of both slots, or the call falls through to Math.random and the
    // checks flake. A fixed A with a drawn B passes both dials.
    // why: lessons/kit-suggest.md#temp-zero
    const bT = bTemp === null ? (T > 0 ? B_TEMP : 0) : bTemp;
    const got = twoSlots(table, ctx, { temp: T, rnd: rnd || Math.random, bTemp: bT,
      take: mine, weight: mix === null ? (table.mix ?? 0.25) : mix });
    const usual = got && chordOfSymbol(got.A, tonic, table, key);
    const other = got && got.B && chordOfSymbol(got.B, tonic, table, key);
    if (usual) {
      // The why text says drawn, because slot A is a draw rather than the argmax.
      // why: lessons/kit-suggest.md#wording
      const picks = [{ role: 'usual', ...usual,
        why: `one of the chords ${table.id} players go to from here, drawn rather than `
          + 'always the commonest' }];
      if (other && other.name !== usual.name) {
        picks.push({ role: 'other', ...other,
          why: 'the continuation most specific to this context rather than common everywhere' });
      }
      return { ok: true, style, source: 'corpus', key, keyName, tonic, guessed,
        from: chords[chords.length - 1].root === undefined ? '' : ctx[ctx.length - 1],
        picks,
        says: `${where}, and reading ${got.how}, the ${table.id} table draws `
          + `${picks[0].name}`
          + (picks[1] ? ` as one of the chords that follow and ${picks[1].name} as the one `
            + 'least common everywhere else' : '') };
    }
  }

  // The last resort, the diatonic rule. Unverified as better than the commonest chord.
  // why: lessons/kit-suggest.md#last-resort
  if (key) {
    const played = chords.map((c) => numeralIn(c.root, c.quality, key));
    const from = played[played.length - 1];
    const list = (PLAIN[key.mode] || {})[from] || [];
    const usual = list[0] ? fromNumeral(list[0], key) : null;
    const fresh = list.slice(1).find((n) => !played.includes(n));
    const other = fromNumeral(fresh || list[1] || '', key);
    if (usual) {
      const picks = [{ role: 'usual', ...usual, why: `what usually follows ${from}` }];
      if (other) {
        picks.push({ role: 'other', ...other,
          why: fresh ? 'a chord this line has not used yet' : `the next reading of ${from}` });
      }
      return { ok: true, style, source: 'plain', key, keyName, tonic, guessed, from, picks,
        says: `${where}, and with no counted table to read, after ${from} the plain rule `
          + `offers ${picks[0].name}`
          + (picks[1] ? ` and ${picks[1].name}` : '') };
    }
  }

  // Nothing fits or nothing has been seen: offer a fifth either side of the first chord,
  // and say so. Unverified as a good musical answer.
  // why: lessons/kit-suggest.md#boundary
  const first = chords[0];
  const q = asTriad(first.quality) || 'maj';
  const fifths = [7, 5].map((step) => {
    const root = pcOf(first.root + step);
    return { root, quality: q, name: `${NOTE_LETTERS[root]}${q}`, numeral: '' };
  });
  return { ...blank, ok: true, key, keyName, tonic, guessed, source: 'fifths',
    picks: [
      { role: 'usual', ...fifths[0], why: 'a fifth above the chord you started on' },
      { role: 'other', ...fifths[1], why: 'a fifth below it' },
    ],
    says: `nothing in the ${style} reading holds `
      + `${chords.map((c) => NOTE_LETTERS[c.root] + c.quality).join(' and ')}, so these are a `
      + 'fifth either side of the first chord rather than a reading of a key' };
}

/**
 * A four chord way home: a destination, so the line can arrive. The target defaults to
 * the tonic; a caller may pass a table symbol. Who picks the target is undecided.
 * @param {{chords: Array<{root:number, quality:string}>}} context
 * @param {{style?, steps?, target?, temp?, rnd?}} [o]
 * @returns {{ok, style, source, key, keyName, tonic, guessed, target, targetName,
 *   steps: Array<{root, quality, name, numeral}>, says}}
 * why: lessons/kit-suggest.md#route-to
 */
export function routeTo(context, { style = 'jazz', steps = 4, target = null,
  temp = null, rnd = null, take = null, mix = null } = {}) {
  const chords = (context?.chords || []).filter((c) => c && Number.isFinite(c.root));
  const blank = { ok: false, style, source: 'none', key: null, keyName: '', tonic: 0,
    guessed: false, target: '', targetName: '', steps: [], says: '' };
  if (chords.length < 2) {
    return { ...blank, says: 'two chords are needed before a way home can be worked out' };
  }
  const table = STYLES[style];
  if (!table || !table.tri) {
    return { ...blank,
      says: `there is no counted ${style} table here, and the diatonic rule knows where a `
        + 'chord goes next without knowing where a line is going' };
  }
  const { key, tonic, guessed } = pickKey(chords);
  const keyName = key ? `${NOTE_LETTERS[key.pc]} ${key.mode}` : `${NOTE_LETTERS[tonic]}`;
  // The tonic's class comes from the mode, not the first chord.
  // why: lessons/kit-suggest.md#tonic-class
  const aim = target || `0${key && key.mode === 'minor' ? 'min' : 'maj'}`;
  const ctx = chords.map((c) => symbolOf(c.root, c.quality, tonic));
  const T = temp === null ? (table.temp ?? 1) : temp;
  const mine = take ? take.chords.map((c) => symbolOf(c.root, c.quality, tonic)) : null;
  const got = routeOver(table, ctx, aim, steps, { temp: T, rnd: rnd || Math.random,
    take: mine, weight: mix === null ? (table.mix ?? 0.25) : mix });
  const home = chordOfSymbol(aim, tonic, table, key);
  if (!got) {
    return { ...blank, key, keyName, tonic, guessed, target: aim,
      targetName: home ? home.name : '',
      says: `nothing the ${table.id} table has counted gets from here to `
        + `${home ? home.name : keyName} in ${steps} chords` };
  }
  const out = got.path.map((s) => chordOfSymbol(s, tonic, table, key)).filter(Boolean);
  if (out.length !== got.path.length) {
    return { ...blank, key, keyName, tonic, guessed, target: aim,
      targetName: home ? home.name : '',
      says: 'a way home was found and one of its chords cannot be written down here' };
  }
  return { ok: true, style, source: 'corpus', key, keyName, tonic, guessed,
    target: aim, targetName: home ? home.name : out[out.length - 1].name, steps: out,
    says: `one of ${got.tried} ways the ${table.id} table knows from here home to `
      + `${home ? home.name : keyName} in ${steps} chords: `
      + `${out.map((c) => c.name).join(', ')}` };
}
