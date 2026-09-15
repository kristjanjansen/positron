// demo/shell/synthdef.mjs — a SuperCollider synth definition, as bytes, in
// both directions: written here, read back here, and upgraded from the old
// layout to the one a 2026 SuperCollider writes.
//
// WHY THIS EXISTS. `plan-visuals.md` §1.2 says a fragment shader is a
// DOCUMENT — "~2 KB of GLSL plus ~200 bytes of parameters reproduces it at any
// resolution" — and that generated GLSL is a defensible thing to send across a
// wire. The sound half of that argument had never been written down. A
// SuperCollider synth definition is the same shape of thing: a few kilobytes
// that completely describe an instrument, with no interpreter at the far end.
// `research/supercollider-browser-2026-09.md` §2.1 measured that wasm scsynth
// accepts one as RAW BYTES and plays it. This module is the bytes.
//
// 🔴 WHAT GRADES THIS FILE IS NOT THIS FILE. CLAUDE.md: "when you implement
// somebody else's format, only their implementation can grade you" —
// `timeline/csound.mjs` was 22/22 green for months with two real defects
// because its test compared it against the same formula it implements. The
// grader here is real scsynth, compiled to wasm, which either plays the bytes
// or does not. The reader below is deliberately a SEPARATE PASS over the same
// buffer rather than a mirror of the writer's variables, so a round trip is at
// least not vacuous — but a round trip is NOT the evidence. The engine is.
//
// ⚠️ VERSION 2, ALWAYS, AND THAT IS NOT COSMETIC. The `.scsyndef` files shipped
// with Sonic Pi are format version 1; sclang has written version 2 for years.
// The two differ in the WIDTH of nearly every count and index — 16 bits against
// 32 — so a reader written for one silently mis-parses the other from the first
// count onward. Testing against a v1 file would prove the wrong thing
// (research §7), which is why `toVersion2` is here and why `writeSynthDef`
// emits v2 only.
//
// THE LAYOUT, from the SuperCollider source's own `SynthDef` file format notes:
//
//   "SCgf"                     4 bytes
//   version                    int32   (1 or 2)
//   number of definitions      int16
//   per definition:
//     name                     pstring (one length byte, then that many chars)
//     constants                COUNT, then that many float32
//     parameter values         COUNT, then that many float32
//     parameter names          COUNT, then (pstring, INDEX) pairs
//     building blocks          COUNT, then that many:
//       class name             pstring
//       rate                   int8    0 once · 1 slow · 2 per sample · 3 on demand
//       inputs                 COUNT
//       outputs                COUNT
//       special index          int16   ALWAYS 16 bits, in both versions
//       inputs                 (SOURCE, INDEX) pairs; source -1 means a constant
//       outputs                one int8 rate each
//     variants                 int16 count, then (pstring, one float32 per parameter)
//
// In version 1 every field written COUNT, INDEX or SOURCE above is int16. In
// version 2 they are int32. `specialIndex` is int16 in both, and the definition
// count is int16 in both. That is the whole difference.

export const MAGIC = 'SCgf';

/**
 * THE LARGEST DEFINITION THAT CAN BE SENT OVER A SOCKET AND ARRIVE.
 *
 * Over this size wasm scsynth answers NOTHING AT ALL to `/d_recv` — no `/fail`,
 * no late reply, no thrown exception, no console line, no counter moving. A
 * silent refusal is the worst failure shape there is, because a definition that
 * was never received is indistinguishable from one that loaded and makes no
 * sound; both answer `/fail /s_new "SynthDef not found"`.
 *
 * ⚠️ IT IS NOT A UNIVERSAL CEILING AND THE COMMENT HERE USED TO SAY IT WAS.
 * "The ceiling both ends default to" was written before it had been measured.
 * Measured, the BOARD has no ceiling at all: sclang routes anything over 16,383
 * bytes to `/d_load`, which read a megabyte from disk in 44 ms — so every rung
 * of Pappus, FULL included, already loads there and always has. This binds a
 * BROWSER, which has no disk to load from.
 */
// 🔴 65,488 — NOT 65,536, AND THE ROUND NUMBER WAS WRONG IN THE DANGEROUS
// DIRECTION. `64 * 1024` passed a 65,536-byte definition through `fitsCeiling`
// and into the silent refusal this constant exists to prevent: the guard said
// yes and the engine said nothing.
//
// MEASURED by bisection, `research/synthdef-size-limit-2026-09.md`:
//
//   browser (SuperSonic)        largest definition that loads  65,520
//   native scsynth over UDP     largest definition that loads  65,488
//   native scsynth over TCP     none found at 1,000,000
//   native /d_load from disk    none found at 1,000,000, 44 ms
//
// 🔴 AND IT BINDS THE MESSAGE, NOT THE DEFINITION — proved rather than argued:
// adding 12 bytes of completion message moved the definition edge from 65,520
// to 65,504, **exactly 16**, the wire cost. In both framings the largest
// MESSAGE that loads is 65,536. So the budget is on the message and the
// definition ceiling is whatever is left after framing.
//
// The number here is the NATIVE UDP figure, which is the smaller of the two, so
// anything that fits here fits in a browser too. ⚠️ Its origin is
// `SC_ComPort.cpp`'s `kTextBufSize = 65536` on the UDP port — and on native
// that buffer can never actually be reached, because an IPv4 UDP payload maxes
// at 65,507, 29 bytes below it.
export const SIZE_CEILING = 65488;

/** Does this definition fit the ceiling both ends honour? Reports the margin,
 *  because "how close" is the question anybody asks next. */
export const fitsCeiling = (bytes) => {
  const n = bytes.byteLength ?? bytes.length ?? 0;
  return { fits: n <= SIZE_CEILING, bytes: n, margin: SIZE_CEILING - n };
};

/** The four rates a building block can run at, named the way a page can print them. */
export const RATE = { once: 0, slow: 1, sample: 2, demand: 3 };
export const RATE_NAME = ['once', 'slow', 'per sample', 'on demand'];

/**
 * The arithmetic `BinaryOpUGen` does, by its special index.
 *
 * ⚠️ THIS TABLE IS THE ONE THING HERE THAT CANNOT BE CHECKED BY READING BYTES
 * BACK. A wrong number writes a perfectly well-formed file that computes the
 * wrong thing — plus where it should multiply — so the check that grades it is
 * audible, not structural: `patch` asserts that the loudness knob SCALES the
 * output, which only holds if 2 really is multiply.
 */
export const OP = { add: 0, sub: 1, mul: 2, div: 4 };
export const OP_NAME = { 0: '+', 1: '-', 2: '*', 4: '/' };

// ── writing ─────────────────────────────────────────────────────────────────

/**
 * A growable byte writer. Big-endian throughout, which is what the format is.
 */
class Bytes {
  constructor() { this.buf = new Uint8Array(1024); this.n = 0; }
  #room(k) {
    if (this.n + k <= this.buf.length) return;
    const next = new Uint8Array(Math.max(this.buf.length * 2, this.n + k));
    next.set(this.buf.subarray(0, this.n));
    this.buf = next;
  }
  u8(v) { this.#room(1); this.buf[this.n++] = v & 0xff; return this; }
  i8(v) { return this.u8(v < 0 ? v + 256 : v); }
  i16(v) { this.#room(2); new DataView(this.buf.buffer).setInt16(this.n, v); this.n += 2; return this; }
  i32(v) { this.#room(4); new DataView(this.buf.buffer).setInt32(this.n, v); this.n += 4; return this; }
  f32(v) { this.#room(4); new DataView(this.buf.buffer).setFloat32(this.n, v); this.n += 4; return this; }
  str(s) {
    // A pstring is a length BYTE, so 255 characters is the roof. Nothing here
    // comes close, but a silent truncation would produce a file that loads
    // under a different name than the one asked for, which is the worst kind
    // of not-quite-working.
    const a = new TextEncoder().encode(s);
    if (a.length > 255) throw new Error(`synthdef: "${s}" is ${a.length} bytes and a name may be 255`);
    this.u8(a.length);
    this.#room(a.length);
    this.buf.set(a, this.n);
    this.n += a.length;
    return this;
  }
  done() { return this.buf.slice(0, this.n); }
}

/**
 * Build one definition, then `.bytes()`.
 *
 * The graph is built in order and every input must already exist, which is the
 * format's own rule: a block's inputs name blocks BEFORE it. Nothing here
 * sorts, so a mis-ordered graph is a thrown error rather than a file that
 * loads and misbehaves.
 *
 *   const g = graph('bell');
 *   const [freq, amp] = g.params([['freq', 440], ['amp', 0.15]]);
 *   const tone = g.block('SinOsc', RATE.sample, [freq, g.value(0)], 1);
 *   g.out(g.block('BinaryOpUGen', RATE.sample, [tone, amp], 1, OP.mul));
 */
export function graph(name) {
  const constants = [];
  const paramNames = [];
  const paramValues = [];
  const blocks = [];
  let controlAt = -1;

  /** A constant, deduplicated — the format stores each distinct number once. */
  const value = (v) => {
    let i = constants.indexOf(v);
    if (i < 0) { i = constants.length; constants.push(v); }
    return { from: -1, out: i };
  };

  /**
   * Declare every parameter at once and get a reference to each.
   *
   * One `Control` block with one output per parameter, which is what sclang
   * emits for a plain `{ |freq = 440, amp = 0.15| … }`. Its special index is
   * where its first parameter sits in the value array — 0, since there is only
   * ever one of these.
   */
  function params(pairs) {
    if (controlAt >= 0) throw new Error('synthdef: params() is called once, with every parameter');
    for (const [k, v] of pairs) { paramNames.push(k); paramValues.push(v); }
    controlAt = blocks.length;
    blocks.push({
      name: 'Control', rate: RATE.slow, inputs: [],
      outputs: pairs.map(() => RATE.slow), special: 0,
    });
    return pairs.map((_, i) => ({ from: controlAt, out: i }));
  }

  /** One building block. Returns a reference to its first output. */
  function block(cls, rate, inputs, outCount = 1, special = 0) {
    for (const i of inputs) {
      if (i.from >= blocks.length) throw new Error(`synthdef: ${cls} reads a block that does not exist yet`);
    }
    const at = blocks.length;
    blocks.push({
      name: cls, rate, inputs: inputs.slice(),
      outputs: Array.from({ length: outCount }, () => rate), special,
    });
    return { from: at, out: 0 };
  }

  /**
   * The last block: where the sound goes.
   *
   * `Out` has NO outputs, which is the one place the format's symmetry breaks
   * and the one a writer forgets. Channel 0 of the hardware, then one input per
   * channel of sound.
   */
  function out(...channels) {
    return block('Out', RATE.sample, [value(0), ...channels], 0, 0);
  }

  function bytes() {
    // ⚠️ The magic is four RAW bytes, not a pstring — no length byte in front.
    const w = new Bytes();
    for (const c of MAGIC) w.u8(c.charCodeAt(0));
    w.i32(2);                                  // version
    w.i16(1);                                  // one definition in this file
    w.str(name);
    w.i32(constants.length);
    for (const c of constants) w.f32(c);
    w.i32(paramValues.length);
    for (const v of paramValues) w.f32(v);
    w.i32(paramNames.length);
    paramNames.forEach((k, i) => { w.str(k); w.i32(i); });
    w.i32(blocks.length);
    for (const u of blocks) {
      w.str(u.name);
      w.i8(u.rate);
      w.i32(u.inputs.length);
      w.i32(u.outputs.length);
      w.i16(u.special);
      for (const i of u.inputs) { w.i32(i.from); w.i32(i.out); }
      for (const r of u.outputs) w.i8(r);
    }
    w.i16(0);                                  // no variants
    return w.done();
  }

  return { name, value, params, block, out, bytes, count: () => blocks.length };
}

// ── reading ─────────────────────────────────────────────────────────────────

/**
 * A separate pass over the same bytes, used by the page to READ OUT OF THE FILE
 * what it is about to send — the header, the version, the name, how many
 * building blocks — rather than reporting what the writer happened to have in a
 * variable. That distinction is the whole reason this is not one function with
 * a flag.
 *
 * It reads BOTH versions, because the files a real SuperCollider shipped are
 * version 1 and reading them is the only check here that a file this repo did
 * not write parses correctly.
 */
export function readSynthDef(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 0;
  const need = (k) => { if (p + k > bytes.length) throw new Error(`synthdef: the file ends inside a field at byte ${p}`); };
  const u8 = () => { need(1); return bytes[p++]; };
  const i8 = () => { const v = u8(); return v > 127 ? v - 256 : v; };
  const i16 = () => { need(2); const v = dv.getInt16(p); p += 2; return v; };
  const i32 = () => { need(4); const v = dv.getInt32(p); p += 4; return v; };
  const f32 = () => { need(4); const v = dv.getFloat32(p); p += 4; return v; };
  const str = () => { const n = u8(); need(n); const s = new TextDecoder().decode(bytes.subarray(p, p + n)); p += n; return s; };

  const head = String.fromCharCode(u8(), u8(), u8(), u8());
  if (head !== MAGIC) throw new Error(`synthdef: this does not start with ${MAGIC}; it starts with ${JSON.stringify(head)}`);
  const version = i32();
  if (version !== 1 && version !== 2) throw new Error(`synthdef: version ${version} is not one this reads`);
  // The one line that is the whole version difference.
  const N = version === 2 ? i32 : i16;
  const count = i16();

  const defs = [];
  for (let d = 0; d < count; d++) {
    const name = str();
    const constants = []; for (let i = N(); i > 0; i--) constants.push(f32());
    const paramValues = []; for (let i = N(); i > 0; i--) paramValues.push(f32());
    const paramNames = [];
    for (let i = N(); i > 0; i--) { const k = str(); paramNames.push({ name: k, at: N() }); }
    const blocks = [];
    for (let i = N(); i > 0; i--) {
      const cls = str();
      const rate = i8();
      const nIn = N(), nOut = N();
      const special = i16();
      const inputs = [];
      for (let k = 0; k < nIn; k++) { const from = N(); inputs.push({ from, out: N() }); }
      const outputs = [];
      for (let k = 0; k < nOut; k++) outputs.push(i8());
      blocks.push({ name: cls, rate, inputs, outputs, special });
    }
    const variants = [];
    for (let i = i16(); i > 0; i--) {
      const vname = str();
      const values = paramValues.map(() => f32());
      variants.push({ name: vname, values });
    }
    defs.push({ name, constants, paramValues, paramNames, blocks, variants });
  }

  // 🔴 CONSUMED TO THE EXACT BYTE, OR IT IS NOT UNDERSTOOD. A parser that stops
  // early and reports a plausible structure is the same class of failure as a
  // green suite with no coverage: every number it printed would look right.
  // research §2.1 made the same demand of its converter and said so.
  if (p !== bytes.length) {
    throw new Error(`synthdef: read ${p} of ${bytes.length} bytes; the rest is not accounted for`);
  }
  return { head, version, defs, bytes: bytes.length };
}

/**
 * The old layout, widened to the current one.
 *
 * Every count and index goes from 16 bits to 32; `specialIndex` and the
 * definition count stay 16. Nothing is reinterpreted, so a file that came out
 * of a real sclang in 2015 is the same graph afterwards — it is a re-encoding,
 * not a translation.
 */
export function toVersion2(input) {
  const parsed = readSynthDef(input);
  if (parsed.version === 2) return { bytes: input instanceof Uint8Array ? input : new Uint8Array(input), converted: false, parsed };
  const w = new Bytes();
  for (const c of MAGIC) w.u8(c.charCodeAt(0));
  w.i32(2);
  w.i16(parsed.defs.length);
  for (const def of parsed.defs) {
    w.str(def.name);
    w.i32(def.constants.length);
    for (const c of def.constants) w.f32(c);
    w.i32(def.paramValues.length);
    for (const v of def.paramValues) w.f32(v);
    w.i32(def.paramNames.length);
    for (const { name, at } of def.paramNames) { w.str(name); w.i32(at); }
    w.i32(def.blocks.length);
    for (const u of def.blocks) {
      w.str(u.name);
      w.i8(u.rate);
      w.i32(u.inputs.length);
      w.i32(u.outputs.length);
      w.i16(u.special);
      for (const i of u.inputs) { w.i32(i.from); w.i32(i.out); }
      for (const r of u.outputs) w.i8(r);
    }
    w.i16(def.variants.length);
    for (const v of def.variants) { w.str(v.name); for (const x of v.values) w.f32(x); }
  }
  const bytes = w.done();
  return { bytes, converted: true, parsed: readSynthDef(bytes) };
}

/** Every distinct kind of building block in a definition, in the order met. */
export function kindsOf(def) {
  const seen = [];
  for (const b of def.blocks) if (!seen.includes(b.name)) seen.push(b.name);
  return seen;
}

/** The first bytes of a file, as hex, so a page can show the header itself. */
export function hexHead(bytes, n = 16) {
  return Array.from(bytes.slice(0, n), (b) => b.toString(16).padStart(2, '0')).join(' ');
}

export const sameBytes = (a, b) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};
