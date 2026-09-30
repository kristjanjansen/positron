// demo/shell/sclang-lite.mjs: a SMALL SUBSET of the SuperCollider language,
// compiled to a SynthDef in JavaScript, in the tab.
//
// 🔴 THIS IS NOT sclang AND MUST NEVER BE DESCRIBED AS IF IT WERE. sclang does
// not run in a browser: `research/supercollider-browser-2026-09.md` §1.3, PR
// #7440 open since 2026-04-01 and still mid-design. Compiling on the Raspberry
// Pi's sclang was refused, because sclang can shell out and a visitor's text
// would be running on the board. So this file reads one function literal of
// the kind a SynthDef is written as, and builds the bytes `synthdef.mjs`
// already knows how to write. Anything it does not know is an ERROR with a
// line and a column. It never guesses, and it never drops an argument it did
// not understand.
//
// 🔴 WHAT GRADES IT IS REAL scsynth, NOT THIS FILE. The rule `synthdef.mjs`
// carries in its header applies with more force here, because this file makes
// up the graph as well as the bytes: a round trip through `readSynthDef` proves
// the file is well formed and can never prove it computes the right thing. The
// page `/collide/` loads every compile with `/d_recv`, waits for `/done` in the
// engine's own voice and measures the output. `sclang-lite-test.mjs` grades the
// structure and the refusals without a browser.
//
// ── WHAT IS ACCEPTED ──────────────────────────────────────────────────────────
//
//   { |freq = 440, amp = 0.1, gate = 1|        arguments, number defaults only
//     var env = EnvGen.kr(Env.adsr(0.01, 0.3, 0.5, 1), gate, doneAction: 2);
//     var sig = Saw.ar(freq * [1, 1.01], mul: amp);
//     sig = RLPF.ar(sig, 1200, 0.3);          reassignment
//     sig * env                                 the last line is what is heard
//   }
//
// Arguments as `|a = 1, b|` or `arg a = 1, b;`. `var` lines before any
// statement, which is sclang's own rule. UGen calls with `.ar` or `.kr`,
// positional and keyword arguments (`mul:`), `mul` and `add` where the class
// has them. `+ - * /` and `!` (dup). Unary minus. `.neg .abs .squared
// .midicps .tanh .dup`. Number literals including `1e3`, `pi` and `2pi`.
// Array literals, and multichannel expansion through a call or an operator,
// wrapping the shorter side the way sclang does. `Mix(...)`, `Mix.new`,
// `Mix.ar`. `Env.adsr`, `Env.perc`, `Env.new` and `Env(...)`, with a curve that
// is a number or one of Env's own shape names written as a symbol (`\lin`).
// `//` and `/* */` comments, nested the way sclang nests them.
//
// 🔴 THE OPERATORS ARE LEFT TO RIGHT WITH NO PRECEDENCE, BECAUSE sclang's ARE.
// `1 + 2 * 3` is 9 in SuperCollider, not 7. A compiler that used ordinary
// maths precedence would compile every preset here correctly and then play
// something else for the first person who wrote `sig + noise * 0.1`, which is
// exactly the kind of green that grades nothing. The test file asserts 9.
//
// 🔴 THE LAST LINE IS WRAPPED IN `Out.ar(0, ...)`. One channel goes to both
// speakers; a two element array is left and right. More than two is refused,
// because bus 2 on this engine is its first HARDWARE INPUT, not a third
// speaker (`scsynth.mjs`, the input bus note). Writing `Out` yourself is
// refused rather than doubled.
//
// ── WHAT IS REFUSED, EVERY ONE WITH A LINE AND A COLUMN ───────────────────────
//
// Any class not in `UGENS`, `Env` or `Mix`. Any method not listed above. An
// unknown keyword (sclang only WARNS about that one; here a misspelled `mull:`
// is an error, because a warning nobody reads is how a sound silently loses
// its level). A positional argument after a keyword one. Strings, symbols
// anywhere but an Env curve, `~environment` variables, nested functions,
// `if`, `.play`, `SynthDef`, `Out`, `#[...]`, every operator but the five, a
// variable used before it has a value, a default that is not a number. An
// `.ar` filter or `Pan2` whose first input is not audio rate, which is
// sclang's own `checkSameRateAsFirstInput` and `checkNInputs(1)`. A last line
// that is a number or `.kr`, which `Out.ar` refuses in sclang too.
//
// ── WHERE THE NUMBERS COME FROM ───────────────────────────────────────────────
//
// 🔴 EVERY ARGUMENT NAME AND DEFAULT IN `UGENS` IS COPIED FROM SuperCollider's
// OWN CLASS FILES, `SCClassLibrary/Common/Audio/*.sc` on the `develop` branch
// at commit 1995490 (read 2026-09-30), and each row names its file. `Saw` and
// `Pulse` live in `FSinOsc.sc`, which is not where anybody would look, and is
// why the file is named rather than implied. The operator indices are the
// `enum`s at the top of `server/plugins/BinaryOpUGens.cpp` and
// `server/plugins/UnaryOpUGens.cpp`, and the Env array is `Env.sc`'s
// `prAsArray`: initial level, segment count, release node or -99, loop node
// or -99, then level, time, shape number and curve value per segment.
//
// ⚠️ TWO PLACES THIS DELIBERATELY BUILDS A DIFFERENT GRAPH FROM sclang, AND THE
// SOUND IS THE SAME. `madd` with both a multiplier and an offset becomes a `*`
// and a `+` rather than one `MulAdd`, and `Mix` sums with `+` rather than with
// `Sum3` and `Sum4`. Both are one block cheaper in sclang and identical in
// what they compute. sclang's degenerate-case folding (`x * 1` is `x`, `x * 0`
// is `0`, `0 - x` is `x.neg`) IS copied, from `BinaryOpUGen.new1`, so a graph
// here carries no block sclang would have removed.

import { graph, RATE, fitsCeiling, SIZE_CEILING } from './synthdef.mjs';

/** Where the defaults below were read, so a reader can go and check them. */
export const SOURCE = 'SCClassLibrary/Common/Audio, supercollider develop 1995490, read 2026-09-30';

const REQUIRED = Symbol('required');

/**
 * The UGens this subset knows, with their arguments IN sclang's ORDER and with
 * sclang's defaults. `madd` means the class ends in `.madd(mul, add)`, so
 * `mul` and `add` follow its own arguments. `first` is the rate rule the class
 * enforces on its first input: `same` is `Filter`'s
 * `checkSameRateAsFirstInput`, `audio` is `Pan2`'s `checkNInputs(1)`.
 */
export const UGENS = {
  SinOsc:     { file: 'Osc.sc',     args: [['freq', 440], ['phase', 0]], madd: true },
  Saw:        { file: 'FSinOsc.sc', args: [['freq', 440]], madd: true },
  Pulse:      { file: 'FSinOsc.sc', args: [['freq', 440], ['width', 0.5]], madd: true },
  LFSaw:      { file: 'Osc.sc',     args: [['freq', 440], ['iphase', 0]], madd: true },
  LFTri:      { file: 'Osc.sc',     args: [['freq', 440], ['iphase', 0]], madd: true },
  LFNoise1:   { file: 'Noise.sc',   args: [['freq', 500]], madd: true },
  WhiteNoise: { file: 'Noise.sc',   args: [], madd: true },
  LPF:        { file: 'Filter.sc',  args: [['in', 0], ['freq', 440]], madd: true, first: 'same' },
  HPF:        { file: 'Filter.sc',  args: [['in', 0], ['freq', 440]], madd: true, first: 'same' },
  RLPF:       { file: 'Filter.sc',  args: [['in', 0], ['freq', 440], ['rq', 1]], madd: true, first: 'same' },
  Pan2:       { file: 'Pan.sc',     args: [['in', REQUIRED], ['pos', 0], ['level', 1]], outputs: 2, first: 'audio' },
  EnvGen:     { file: 'EnvGen.sc',  args: [['envelope', REQUIRED], ['gate', 1], ['levelScale', 1],
                                             ['levelBias', 0], ['timeScale', 1], ['doneAction', 0]] },
};

/** `Env`'s class methods, from `Env.sc`, arguments and defaults verbatim. */
export const ENVS = {
  adsr: [['attackTime', 0.01], ['decayTime', 0.3], ['sustainLevel', 0.5], ['releaseTime', 1],
         ['peakLevel', 1], ['curve', -4], ['bias', 0]],
  perc: [['attackTime', 0.01], ['releaseTime', 1], ['level', 1], ['curve', -4]],
  new:  [['levels', [0, 1, 0]], ['times', [1, 1]], ['curve', 'lin'], ['releaseNode', null], ['loopNode', null]],
};

/** `Env.shapeNames`, from `Env.sc`'s `initClass`. A number is shape 5. */
export const SHAPES = { step: 0, lin: 1, linear: 1, exp: 2, exponential: 2, sin: 3, sine: 3,
  wel: 4, welch: 4, sqr: 6, squared: 6, cub: 7, cubed: 7, hold: 8 };

/** `BinaryOpUGens.cpp`: opAdd 0, opSub 1, opMul 2, opIDiv 3, opFDiv 4. */
export const BINARY = { '+': 0, '-': 1, '*': 2, '/': 4 };
/** `UnaryOpUGens.cpp`: opNeg 0, opAbs 5, opSquared 12, opMIDICPS 17, opTanH 36. */
export const UNARY = { neg: 0, abs: 5, squared: 12, midicps: 17, tanh: 36 };
const FOLD1 = {
  neg: (x) => -x, abs: Math.abs, squared: (x) => x * x,
  midicps: (x) => 440 * 2 ** ((x - 69) / 12), tanh: Math.tanh,
};

/**
 * 🔴 64 AUDIO WIRES ALIVE AT ONCE, AND OVER IT THE ENGINE SAYS NOTHING.
 * `research/scsynth-wasm-official-2026-09.md` §10 measured the default
 * `maxWireBufs` of 64: 64 oscillators alive at once loaded, 65 got no `/done`
 * and no `/fail`, and the engine stopped answering `/status`. A 2,886 byte
 * definition refused by an engine that takes 860,000. So it is counted here,
 * the way scsynth colours its buffers (release a block's inputs, then take
 * its outputs), and refused before it is sent.
 */
export const WIRE_CEILING = 64;

/** Most channels the last line may have. See the header. */
export const MAX_CHANNELS = 2;
/** The most copies `!` or `.dup` will make, which is a guard and not a claim about sclang. */
export const MAX_DUP = 16;

export class SclError extends Error {
  constructor(message, at) {
    super(message);
    this.line = at?.line ?? 0;
    this.col = at?.col ?? 0;
  }
}

// ── reading the text ──────────────────────────────────────────────────────────

const PUNCT = new Set(['{', '}', '(', ')', '[', ']', '|', ',', ';', '.', '=', ':']);
const OPCHARS = '+-*/<>=!%&@?^~|';

/**
 * Tokens with a line and a column each, 1 based, which is what a person
 * counts in an editor. A `-` straight after something that ends a value is
 * subtraction; anywhere else it is unary minus, which is how sclang reads it.
 */
export function lex(src) {
  const out = [];
  let i = 0, line = 1, col = 1;
  const at = () => ({ line, col });
  const step = (n = 1) => {
    for (let k = 0; k < n; k++) {
      if (src[i] === '\n') { line++; col = 1; } else col++;
      i++;
    }
  };
  const push = (t, v, pos) => out.push({ t, v, line: pos.line, col: pos.col });
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { step(); continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') step(); continue; }
    if (c === '/' && src[i + 1] === '*') {
      // sclang nests block comments, so `/* a /* b */ c */` is one comment.
      const start = at();
      let depth = 0;
      do {
        if (src[i] === '/' && src[i + 1] === '*') { depth++; step(2); continue; }
        if (src[i] === '*' && src[i + 1] === '/') { depth--; step(2); continue; }
        if (i >= src.length) throw new SclError('a /* comment is never closed', start);
        step();
      } while (depth > 0);
      continue;
    }
    const pos = at();
    if (/[0-9]/.test(c)) {
      const m = /^[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?/.exec(src.slice(i));
      let v = Number(m[0]);
      step(m[0].length);
      if (src.startsWith('pi', i) && !/[A-Za-z0-9_]/.test(src[i + 2] ?? '')) { v *= Math.PI; step(2); }
      else if (/[A-Za-z_]/.test(src[i] ?? '')) throw new SclError(`${m[0]}${src[i]} is not a number this reads`, pos);
      push('num', v, pos);
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))[0];
      step(m.length);
      if (src[i] === ':' && /[a-z]/.test(m[0])) { step(); push('key', m, pos); continue; }
      push(/[A-Z]/.test(m[0]) ? 'cls' : 'id', m, pos);
      continue;
    }
    if (c === '\\') {
      const m = /^\\([A-Za-z_][A-Za-z0-9_]*)/.exec(src.slice(i));
      if (!m) throw new SclError('a \\ has to start a symbol like \\lin', pos);
      step(m[0].length);
      push('sym', m[1], pos);
      continue;
    }
    if (c === '"') throw new SclError('strings are not in this subset', pos);
    if (c === "'") throw new SclError("'quoted' symbols are not in this subset, write \\lin instead", pos);
    if (c === '~') throw new SclError('~environment variables are not in this subset, use var', pos);
    if (c === '#') throw new SclError('#[literal arrays] are not in this subset, use [ ]', pos);
    if (c === '|' ) { step(); push('punc', '|', pos); continue; }
    if (c === '=' && src[i + 1] !== '=') { step(); push('punc', '=', pos); continue; }
    if (c === '-' || c === '+' || c === '*' || c === '/' || c === '!') {
      // A run of operator characters is one operator in sclang, so `**` and
      // `!=` are read whole and refused whole rather than as two things.
      let j = i;
      while (j < src.length && OPCHARS.includes(src[j]) && !(src[j] === '/' && (src[j + 1] === '/' || src[j + 1] === '*'))) j++;
      const op = src.slice(i, j);
      step(op.length);
      if (!['+', '-', '*', '/', '!'].includes(op)) throw new SclError(`the operator ${op} is not in this subset, only + - * / and !`, pos);
      push('op', op, pos);
      continue;
    }
    if (OPCHARS.includes(c)) {
      let j = i;
      while (j < src.length && OPCHARS.includes(src[j])) j++;
      throw new SclError(`the operator ${src.slice(i, j)} is not in this subset, only + - * / and !`, pos);
    }
    if (PUNCT.has(c)) { step(); push('punc', c, pos); continue; }
    throw new SclError(`${JSON.stringify(c)} is not something this reads`, pos);
  }
  out.push({ t: 'eof', v: null, line, col });
  return out;
}

// ── values while compiling ────────────────────────────────────────────────────
//
// A value is a number (known now, so arithmetic on it is done here, the way
// sclang does it in the language), a signal (a block's output, with a rate),
// an array of those, an envelope, or a symbol that is only ever an Env curve.

const num = (v) => ({ k: 'num', v });
const isNum = (x) => x.k === 'num';
const RATE_WORD = ['scalar', 'control', 'audio'];

/**
 * Compile one function literal to a SynthDef.
 *
 * @param {string} src
 * @param {{name?: string}} [o]
 * @returns {{ok: true, bytes: Uint8Array, name: string, params: {name: string, value: number}[],
 *   channels: number, blocks: number, wires: number, gate: boolean, gateUsed: boolean,
 *   freesItself: boolean, kinds: string[], warnings: string[]}
 *   | {ok: false, error: string, line: number, col: number, message: string}}
 */
export function compile(src, { name = 'collide' } = {}) {
  try {
    return compileOrThrow(String(src ?? ''), name);
  } catch (e) {
    if (!(e instanceof SclError)) throw e;
    return { ok: false, error: e.message, line: e.line, col: e.col,
             message: `line ${e.line}, column ${e.col}: ${e.message}` };
  }
}

function compileOrThrow(src, name) {
  const toks = lex(src);
  let p = 0;
  const peek = (k = 0) => toks[Math.min(p + k, toks.length - 1)];
  const next = () => toks[p++];
  const is = (t, v) => peek().t === t && (v === undefined || peek().v === v);
  const expect = (t, v, what) => {
    if (is(t, v)) return next();
    const got = peek();
    throw new SclError(`expected ${what ?? v ?? t} here, found ${got.t === 'eof' ? 'the end' : JSON.stringify(got.v)}`, got);
  };

  const g = graph(name);
  /** What the graph has in it, for the wire count and the report. */
  const blocks = [];
  const warnings = [];

  /** One block into the graph, and the same block into this file's own list. `meta` is what a report needs. */
  function add(cls, rate, inputs, outCount = 1, special = 0, meta = {}) {
    const ref = g.block(cls, rate, inputs, outCount, special);
    blocks.push({ cls, rate, inputs: inputs.map((x) => ({ ...x })), outs: outCount, special, ...meta });
    return ref;
  }
  const input = (x, at) => {
    if (x.k === 'num') return g.value(x.v);
    if (x.k === 'sig') return x.ref;
    throw new SclError(`${describe(x)} cannot go into a UGen input here`, at);
  };
  const rateOf = (x) => (x.k === 'sig' ? x.rate : 0);

  // ── arithmetic, with sclang's folding ──────────────────────────────────────

  function binop(op, a, b, at) {
    if (op === '!') return dup(a, b, at);
    if (a.k === 'arr' || b.k === 'arr') {
      const A = a.k === 'arr' ? a.items : [a], B = b.k === 'arr' ? b.items : [b];
      const n = Math.max(A.length, B.length);
      return { k: 'arr', items: Array.from({ length: n }, (_, i) => binop(op, A[i % A.length], B[i % B.length], at)) };
    }
    for (const x of [a, b]) {
      if (x.k !== 'num' && x.k !== 'sig') throw new SclError(`${describe(x)} cannot take part in ${op}`, at);
    }
    if (isNum(a) && isNum(b)) {
      if (op === '+') return num(a.v + b.v);
      if (op === '-') return num(a.v - b.v);
      if (op === '*') return num(a.v * b.v);
      return num(a.v / b.v);
    }
    // `BinaryOpUGen.new1`'s degenerate cases, in its order.
    const eq = (x, v) => isNum(x) && x.v === v;
    if (op === '*') {
      if (eq(a, 0) || eq(b, 0)) return num(0);
      if (eq(a, 1)) return b;
      if (eq(a, -1)) return unop('neg', b, at);
      if (eq(b, 1)) return a;
      if (eq(b, -1)) return unop('neg', a, at);
    } else if (op === '+') {
      if (eq(a, 0)) return b;
      if (eq(b, 0)) return a;
    } else if (op === '-') {
      if (eq(a, 0)) return unop('neg', b, at);
      if (eq(b, 0)) return a;
    } else if (op === '/') {
      if (eq(b, 1)) return a;
      if (eq(b, -1)) return unop('neg', a, at);
    }
    const rate = Math.max(rateOf(a), rateOf(b));
    return { k: 'sig', rate, ref: add('BinaryOpUGen', rate, [input(a, at), input(b, at)], 1, BINARY[op]) };
  }

  function unop(op, a, at) {
    if (a.k === 'arr') return { k: 'arr', items: a.items.map((x) => unop(op, x, at)) };
    if (isNum(a)) return num(FOLD1[op](a.v));
    if (a.k !== 'sig') throw new SclError(`${describe(a)} has no .${op}`, at);
    return { k: 'sig', rate: a.rate, ref: add('UnaryOpUGen', a.rate, [a.ref], 1, UNARY[op]) };
  }

  function dup(a, b, at) {
    if (!isNum(b) || !Number.isInteger(b.v) || b.v < 1 || b.v > MAX_DUP) {
      throw new SclError(`! and .dup take a whole number from 1 to ${MAX_DUP}`, at);
    }
    if (a.k === 'arr') throw new SclError('an array of arrays is not in this subset', at);
    return { k: 'arr', items: Array.from({ length: b.v }, () => a) };
  }

  function madd(x, mul, add_, at) {
    // `MulAdd.new1`'s degenerate cases, then two ordinary blocks. See the header.
    let y = binop('*', x, mul, at);
    y = binop('+', y, add_, at);
    return y;
  }

  // ── arguments to a call ─────────────────────────────────────────────────────

  /**
   * Bind what was written to the names a class declares. Positional first,
   * then keywords, and every keyword has to be a name the class knows.
   */
  function bind(spec, got, who, at) {
    const names = spec.map(([k]) => k);
    const out = new Map();
    let seenKey = false;
    got.forEach((a, i) => {
      if (a.key) {
        seenKey = true;
        if (!names.includes(a.key)) {
          throw new SclError(`${who} has no argument called ${a.key}; it takes ${names.join(', ') || 'none'}`, a.at);
        }
        if (out.has(a.key)) throw new SclError(`${a.key} is given twice to ${who}`, a.at);
        out.set(a.key, a.val);
        return;
      }
      if (seenKey) throw new SclError(`a positional argument after a keyword one, in ${who}`, a.at);
      if (i >= names.length) throw new SclError(`${who} takes ${names.length} arguments and this is argument ${i + 1}`, a.at);
      out.set(names[i], a.val);
    });
    return spec.map(([k, dflt]) => {
      if (out.has(k)) return out.get(k);
      if (dflt === REQUIRED) throw new SclError(`${who} needs its ${k} argument`, at);
      return fromDefault(dflt);
    });
  }
  const fromDefault = (d) => (d === null ? { k: 'nil' }
    : typeof d === 'string' ? { k: 'sym', v: d }
      : Array.isArray(d) ? { k: 'arr', items: d.map(num) } : num(d));

  // ── UGens ───────────────────────────────────────────────────────────────────

  function ugen(cls, method, got, at) {
    const spec = UGENS[cls];
    if (method !== 'ar' && method !== 'kr') {
      throw new SclError(`${cls}.${method} is not in this subset, only ${cls}.ar and ${cls}.kr`, at);
    }
    const argSpec = spec.madd ? [...spec.args, ['mul', 1], ['add', 0]] : spec.args;
    const vals = bind(argSpec, got, `${cls}.${method}`, at);
    const rate = method === 'ar' ? RATE.sample : RATE.slow;
    const own = vals.slice(0, spec.args.length);
    const [mul, addv] = spec.madd ? vals.slice(spec.args.length) : [num(1), num(0)];
    const made = expand(own, (items) => one(cls, spec, rate, items, at), at, cls === 'EnvGen');
    return spec.madd ? madd(made, mul, addv, at) : made;
  }

  /** sclang's multichannel expansion: an array anywhere makes one block per item. */
  function expand(vals, make, at, refuse) {
    const width = Math.max(1, ...vals.map((v) => (v.k === 'arr' ? v.items.length : 1)));
    if (width === 1) return make(vals);
    if (refuse) throw new SclError('an array into EnvGen is not in this subset', at);
    const items = Array.from({ length: width }, (_, i) => make(vals.map((v) => (v.k === 'arr' ? v.items[i % v.items.length] : v))));
    if (items.some((x) => x.k === 'arr')) throw new SclError('that makes an array of arrays, which is not in this subset; Mix it first', at);
    return { k: 'arr', items };
  }

  function one(cls, spec, rate, vals, at) {
    let ins, meta = {};
    if (cls === 'EnvGen') {
      const [env, ...rest] = vals;
      if (env.k !== 'env') throw new SclError('EnvGen needs an Env as its first argument', at);
      ins = [...rest, ...envArray(env, at)];
      // doneAction is the fifth input: gate, levelScale, levelBias, timeScale, doneAction.
      meta = { doneAction: isNum(rest[4]) ? rest[4].v : null };
    } else {
      ins = vals;
    }
    if (spec.first && ins.length) {
      const r0 = rateOf(ins[0]);
      if (spec.first === 'same' && r0 !== rate) {
        throw new SclError(`${cls}.${rate === RATE.sample ? 'ar' : 'kr'}: its first input is ${RATE_WORD[r0]} rate and has to be ${RATE_WORD[rate]} rate`, at);
      }
      if (spec.first === 'audio' && rate === RATE.sample && r0 !== RATE.sample) {
        throw new SclError(`${cls}.ar: its first input is ${RATE_WORD[r0]} rate and has to be audio rate`, at);
      }
    }
    const refs = ins.map((x) => input(x, at));
    const outs = spec.outputs ?? 1;
    const ref = add(cls, rate, refs, outs, 0, meta);
    if (outs === 1) return { k: 'sig', rate, ref };
    return { k: 'arr', items: Array.from({ length: outs }, (_, i) => ({ k: 'sig', rate, ref: { from: ref.from, out: i } })) };
  }

  // ── Env ─────────────────────────────────────────────────────────────────────

  function envCall(method, got, at) {
    if (!ENVS[method]) throw new SclError(`Env.${method} is not in this subset, only Env.adsr, Env.perc and Env.new`, at);
    const v = bind(ENVS[method], got, `Env.${method}`, at);
    if (method === 'adsr') {
      const [a, d, s, r, peak, curve, bias] = v;
      const levels = [num(0), peak, binop('*', peak, s, at), num(0)].map((x) => binop('+', x, bias, at));
      return makeEnv(levels, [a, d, r], curve, num(2), { k: 'nil' }, at);
    }
    if (method === 'perc') {
      const [a, r, level, curve] = v;
      return makeEnv([num(0), level, num(0)], [a, r], curve, { k: 'nil' }, { k: 'nil' }, at);
    }
    const [levels, times, curve, rel, loop] = v;
    if (levels.k !== 'arr' || levels.items.length < 2) throw new SclError('Env.new needs an array of at least two levels', at);
    const T = times.k === 'arr' ? times.items : [times];
    // `times.asArray.wrapExtend(levels.size - 1)`, from `Env.new`.
    const wrapped = Array.from({ length: levels.items.length - 1 }, (_, i) => T[i % T.length]);
    return makeEnv(levels.items, wrapped, curve, rel, loop, at);
  }

  function makeEnv(levels, times, curve, rel, loop, at) {
    for (const x of [...levels, ...times]) {
      if (x.k !== 'num' && x.k !== 'sig') throw new SclError(`${describe(x)} cannot be an Env level or time`, at);
    }
    const curves = curve.k === 'arr' ? curve.items : [curve];
    for (const c of curves) {
      if (c.k === 'sym' && !(c.v in SHAPES)) throw new SclError(`\\${c.v} is not one of Env's shapes: ${Object.keys(SHAPES).join(', ')}`, c.at ?? at);
      if (c.k !== 'sym' && c.k !== 'num' && c.k !== 'sig') throw new SclError(`${describe(c)} cannot be an Env curve`, at);
    }
    for (const [n, x] of [['releaseNode', rel], ['loopNode', loop]]) {
      if (x.k !== 'nil' && !(isNum(x) && Number.isInteger(x.v))) throw new SclError(`${n} has to be a whole number or left out`, at);
    }
    return { k: 'env', levels, times, curves, rel, loop };
  }

  /** `Env.sc`'s `prAsArray`, field for field. */
  function envArray(env, at) {
    const out = [env.levels[0], num(env.times.length),
      env.rel.k === 'nil' ? num(-99) : env.rel, env.loop.k === 'nil' ? num(-99) : env.loop];
    env.times.forEach((t, i) => {
      const c = env.curves[i % env.curves.length];
      out.push(env.levels[i + 1], t,
        c.k === 'sym' ? num(SHAPES[c.v]) : num(5),
        c.k === 'sym' ? num(0) : c);
    });
    for (const x of out) if (x.k === 'arr') throw new SclError('an array inside an Env is not in this subset', at);
    return out;
  }

  // ── Mix ─────────────────────────────────────────────────────────────────────

  function mix(method, got, at) {
    if (method !== 'new' && method !== 'ar') throw new SclError(`Mix.${method} is not in this subset, only Mix(...), Mix.new and Mix.ar`, at);
    if (got.length !== 1 || got[0].key) throw new SclError(`Mix.${method} takes one array`, at);
    const x = got[0].val;
    let sum = x.k === 'arr' ? x.items.reduce((s, y) => binop('+', s, y, at)) : x;
    if (method === 'ar') {
      if (isNum(sum)) throw new SclError('Mix.ar of numbers is not in this subset', at);
      // `Mix.ar`: a control rate result goes through `K2A.ar`, from `Mix.sc`.
      if (sum.k === 'sig' && sum.rate === RATE.slow) sum = { k: 'sig', rate: RATE.sample, ref: add('K2A', RATE.sample, [sum.ref]) };
    }
    return sum;
  }

  // ── the grammar ─────────────────────────────────────────────────────────────

  const scope = new Map();       // name -> value, or null while declared and unset

  function literal() {
    const at = peek();
    let sign = 1;
    if (is('op', '-')) { next(); sign = -1; }
    if (is('num')) return sign * next().v;
    if (is('id', 'pi')) { next(); return sign * Math.PI; }
    throw new SclError('a default here has to be a number', at);
  }

  function argList(close) {
    const params = [];
    for (;;) {
      const t = expect('id', undefined, 'an argument name');
      if (scope.has(t.v)) throw new SclError(`${t.v} is declared twice`, t);
      let v = 0;
      if (is('punc', '=')) { next(); v = literal(); }
      params.push({ name: t.v, value: v, at: t });
      scope.set(t.v, null);
      if (is('punc', ',')) { next(); continue; }
      expect('punc', close);
      return params;
    }
  }

  function callArgs() {
    const got = [];
    if (!is('punc', '(')) return got;
    next();
    if (is('punc', ')')) { next(); return got; }
    for (;;) {
      if (is('key')) { const k = next(); got.push({ key: k.v, val: expr(), at: k }); }
      else { const at = peek(); got.push({ val: expr(), at }); }
      if (is('punc', ',')) { next(); continue; }
      expect('punc', ')');
      return got;
    }
  }

  function classCall() {
    const t = next();
    let method = 'new';
    if (is('punc', '.')) { next(); method = expect('id', undefined, `a method on ${t.v}`).v; }
    else if (!is('punc', '(')) throw new SclError(`${t.v} on its own is not something this can play; write ${t.v}.ar(...)`, t);
    // ⚠️ THE CLASS AND THE METHOD ARE JUDGED BEFORE THE ARGUMENTS ARE READ, so
    // `Mix.fill(3, { ... })` is refused as `Mix.fill` rather than as the brace
    // inside it, which would name the symptom instead of the cause.
    if (t.v === 'Out') throw new SclError('leave Out out: the last line is what reaches the speakers', t);
    if (t.v === 'SynthDef') throw new SclError('write the function itself, this page makes the SynthDef', t);
    if (t.v === 'Env' && !ENVS[method]) throw new SclError(`Env.${method} is not in this subset, only Env.adsr, Env.perc and Env.new`, t);
    if (t.v === 'Mix' && method !== 'new' && method !== 'ar') throw new SclError(`Mix.${method} is not in this subset, only Mix(...), Mix.new and Mix.ar`, t);
    if (t.v !== 'Env' && t.v !== 'Mix') {
      if (!UGENS[t.v]) throw new SclError(`${t.v} is not in this subset, which knows ${Object.keys(UGENS).join(', ')}, Env and Mix`, t);
      if (method === 'new') throw new SclError(`${t.v}(...) needs a rate: ${t.v}.ar(...) or ${t.v}.kr(...)`, t);
      if (method !== 'ar' && method !== 'kr') throw new SclError(`${t.v}.${method} is not in this subset, only ${t.v}.ar and ${t.v}.kr`, t);
    }
    const got = callArgs();
    if (t.v === 'Env') return envCall(method, got, t);
    if (t.v === 'Mix') return mix(method, got, t);
    return ugen(t.v, method, got, t);
  }

  function primary() {
    const t = peek();
    if (t.t === 'num') { next(); return num(t.v); }
    if (t.t === 'sym') { next(); return { k: 'sym', v: t.v, at: t }; }
    if (t.t === 'cls') return classCall();
    if (t.t === 'id') {
      next();
      if (t.v === 'pi') return num(Math.PI);
      if (['var', 'arg'].includes(t.v)) throw new SclError(`${t.v} lines come first, before anything else in the function`, t);
      if (is('punc', '(')) throw new SclError(`${t.v}(...) is not in this subset`, t);
      if (!scope.has(t.v)) throw new SclError(`${t.v} is not declared; add it to the arguments or a var line`, t);
      const v = scope.get(t.v);
      if (v === null) throw new SclError(`${t.v} has no value here yet`, t);
      return v;
    }
    if (t.t === 'punc' && t.v === '(') { next(); const v = expr(); expect('punc', ')'); return v; }
    if (t.t === 'punc' && t.v === '[') {
      next();
      const items = [];
      if (!is('punc', ']')) {
        for (;;) {
          const at = peek();
          const v = expr();
          if (v.k === 'arr') throw new SclError('an array of arrays is not in this subset', at);
          items.push(v);
          if (is('punc', ',')) { next(); continue; }
          break;
        }
      }
      expect('punc', ']');
      if (!items.length) throw new SclError('an empty array has nothing to play', t);
      return { k: 'arr', items };
    }
    if (t.t === 'punc' && t.v === '{') throw new SclError('a function inside the function is not in this subset', t);
    throw new SclError(t.t === 'eof' ? 'the text ends in the middle of something' : `${JSON.stringify(t.v)} was not expected here`, t);
  }

  function postfix() {
    let v = primary();
    while (is('punc', '.')) {
      next();
      const m = expect('id', undefined, 'a method name');
      if (m.v in UNARY) { v = unop(m.v, v, m); continue; }
      if (m.v === 'dup') {
        const got = callArgs();
        if (got.length > 1 || got[0]?.key) throw new SclError('.dup takes one number', m);
        v = dup(v, got[0]?.val ?? num(2), m);
        continue;
      }
      if (m.v === 'play') throw new SclError('leave off .play, this page plays the function itself', m);
      throw new SclError(`.${m.v} is not in this subset; it knows .${[...Object.keys(UNARY), 'dup'].join(' .')}`, m);
    }
    return v;
  }

  function unary() {
    if (is('op', '-')) {
      const at = next();
      return unop('neg', unary(), at);
    }
    return postfix();
  }

  /** Left to right, no precedence. See the header. */
  function expr() {
    let v = unary();
    while (is('op')) {
      const op = next();
      v = binop(op.v, v, unary(), op);
    }
    return v;
  }

  function statement() {
    if (is('id') && peek(1).t === 'punc' && peek(1).v === '=') {
      const t = next(); next();
      if (!scope.has(t.v)) throw new SclError(`${t.v} is not declared; add it to a var line`, t);
      const v = expr();
      scope.set(t.v, v);
      return v;
    }
    return expr();
  }

  // ── the function ────────────────────────────────────────────────────────────

  const open = expect('punc', '{', 'the { that opens the function');
  let params = [];
  if (is('punc', '|')) { next(); params = argList('|'); }
  else if (is('id', 'arg')) { next(); params = argList(';'); }
  // One `Control` block, first in the graph, which is what `graph().params()`
  // writes and what sclang emits for plain arguments. None at all without any.
  if (params.length) {
    const controls = g.params(params.map((x) => [x.name, x.value]));
    blocks.push({ cls: 'Control', rate: RATE.slow, inputs: [], outs: params.length, special: 0 });
    params.forEach((x, i) => scope.set(x.name, { k: 'sig', rate: RATE.slow, ref: controls[i] }));
  }

  while (is('id', 'var')) {
    next();
    for (;;) {
      const t = expect('id', undefined, 'a variable name');
      if (scope.has(t.v)) throw new SclError(`${t.v} is declared twice`, t);
      scope.set(t.v, null);
      if (is('punc', '=')) { next(); scope.set(t.v, expr()); }
      if (is('punc', ',')) { next(); continue; }
      expect('punc', ';');
      break;
    }
  }

  let last = null, lastAt = peek();
  while (!is('punc', '}')) {
    if (is('eof')) throw new SclError('the function is never closed with }', open);
    lastAt = peek();
    last = statement();
    if (is('punc', ';')) { next(); continue; }
    if (is('eof')) throw new SclError('the function is never closed with }', open);
    if (!is('punc', '}')) throw new SclError(`expected ; or } here, found ${JSON.stringify(peek().v)}`, peek());
  }
  const close = next();
  if (is('punc', '.')) {
    const m = peek(1);
    throw new SclError(m.v === 'play' ? 'leave off .play, this page plays the function itself' : 'nothing may follow the function', m);
  }
  if (is('punc', ';')) next();
  if (!is('eof')) throw new SclError('nothing may follow the function', peek());
  if (!last) throw new SclError('the function is empty, so there is nothing to play', close);

  // ── the last line, into Out.ar(0, ...) ─────────────────────────────────────

  let chans = last.k === 'arr' ? last.items : [last];
  if (chans.length > MAX_CHANNELS) {
    throw new SclError(`the last line has ${chans.length} channels and this plays ${MAX_CHANNELS}; Mix or Pan2 it down`, lastAt);
  }
  for (const c of chans) {
    if (c.k === 'num') throw new SclError('the last line is a number, which is not a sound; it has to be .ar', lastAt);
    if (c.k !== 'sig') throw new SclError(`the last line is ${describe(c)}, which is not a sound`, lastAt);
    if (c.rate !== RATE.sample) throw new SclError(`the last line is ${RATE_WORD[c.rate]} rate and Out.ar needs audio rate, so make it .ar`, lastAt);
  }
  if (chans.length === 1) chans = [chans[0], chans[0]];
  g.out(...chans.map((c) => c.ref));
  blocks.push({ cls: 'Out', rate: RATE.sample, inputs: chans.map((c) => c.ref), outs: 0, special: 0 });

  const bytes = g.bytes();
  const fit = fitsCeiling(bytes);
  if (!fit.fits) throw new SclError(`that is ${fit.bytes} bytes and the engine takes ${SIZE_CEILING}`, lastAt);
  const wires = wirePeak(blocks);
  if (wires > WIRE_CEILING) {
    throw new SclError(`that keeps ${wires} audio signals alive at once and the engine has ${WIRE_CEILING}`, lastAt);
  }

  const gateAt = params.findIndex((x) => x.name === 'gate');
  const gateUsed = gateAt >= 0 && blocks.some((b) => b.inputs.some((i) => i.from === 0 && i.out === gateAt));
  // doneAction 2 is `Done.freeSelf`, from `EnvGen.sc`'s `Done` class.
  const freesItself = blocks.some((b) => b.cls === 'EnvGen' && b.doneAction === 2);
  if (!params.some((x) => x.name === 'freq')) warnings.push('there is no freq argument, so every key plays the same pitch');
  if (gateAt >= 0 && !gateUsed) warnings.push('gate is an argument and nothing reads it, so letting a key go changes nothing');
  if (!freesItself) warnings.push('no EnvGen has doneAction: 2, so a note has to be cut off when its key comes up');

  return {
    ok: true, bytes, name,
    params: params.map(({ name: n, value }) => ({ name: n, value })),
    channels: last.k === 'arr' ? last.items.length : 1,
    blocks: g.count(), wires,
    gate: gateAt >= 0, gateUsed, freesItself,
    kinds: [...new Set(blocks.map((b) => b.cls))],
    warnings,
  };
}

/**
 * How many audio rate signals are alive at once, counted the way scsynth
 * colours its wire buffers: each block first gives back the inputs it was the
 * last reader of, then takes one buffer per audio rate output. An output
 * nobody reads is taken and given straight back, but it is counted at the
 * moment it exists.
 */
export function wirePeak(blocks) {
  const readers = new Map();
  for (const b of blocks) {
    for (const i of b.inputs) {
      if (i.from < 0) continue;
      const key = `${i.from}:${i.out}`;
      readers.set(key, (readers.get(key) ?? 0) + 1);
    }
  }
  let live = 0, peak = 0;
  const left = new Map(readers);
  blocks.forEach((b, j) => {
    for (const i of b.inputs) {
      if (i.from < 0 || blocks[i.from].rate !== RATE.sample) continue;
      const key = `${i.from}:${i.out}`;
      const n = left.get(key) - 1;
      left.set(key, n);
      if (n === 0) live--;
    }
    if (b.rate === RATE.sample) {
      for (let o = 0; o < b.outs; o++) {
        live++;
        peak = Math.max(peak, live);
        if (!readers.get(`${j}:${o}`)) live--;
      }
    }
  });
  return peak;
}

function describe(x) {
  return { num: `the number ${x.v}`, sig: 'a signal', arr: 'an array', env: 'an Env',
           sym: `the symbol \\${x.v}`, nil: 'nothing' }[x.k] ?? 'that';
}
