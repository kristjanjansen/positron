// timeline/osc.mjs — OSC 1.0/1.1 wire codec + the `osc` timeline kind.
// Plain ESM, browser+node, no deps. Companion to timeline/transport.mjs v0.6.
//
// TWO HALVES, and the split is deliberate:
//
//   PART A — THE CODEC. Pure bytes <-> plain objects. Knows nothing about the
//     transport, the deck, adapters, or `at`. It is the part that has to be
//     byte-exact against liblo/python-osc/osc.js, so it is the part with no
//     opinions. Testable standalone (proto/osc/interop.mjs feeds it real bytes
//     produced by real tools).
//
//   PART B — THE KIND. caps/reduce/assertState/actuate over the codec's
//     objects, and the bundle-atomicity machinery. Knows nothing about UDP,
//     WebSocket, or MoQ — a transport hands it decoded objects.
//
// -----------------------------------------------------------------------------
// WHAT OSC IS, for the purposes of a timeline, in three facts:
//
//   1. AN OSC MESSAGE HAS NO INTRINSIC VALUE SEMANTICS. `/synth/1/cutoff 800.0`
//      is a LEVEL — it holds until superseded, and a seek must restore it.
//      `/scene/next` is an EDGE — it happened, and replaying the prefix must not
//      re-fire it. `/mixer/ch3/mute 1` is a level whose type looks like an edge.
//      Nothing in the wire format distinguishes them. The ADDRESS is the only
//      discriminator, which is exactly what caps.series was built for (U5): the
//      lane is one KIND (`osc`) and many SIGNALS (one per address).
//
//   2. AN OSC TIME TAG IS AN NTP TIMESTAMP, not a duration and not our epoch.
//      64-bit fixed point, 32 bits of seconds since 1900-01-01T00:00:00Z and 32
//      bits of fraction (~233 ps LSB). Our `at` is transport-ms float. The
//      conversion is exact in one direction and lossy in the other; §TIMETAG
//      below states which, and rawTag keeps the original 8 bytes so a re-emit is
//      byte-identical to what arrived (the rawData rule).
//
//   3. A BUNDLE IS AN ATOMICITY CLAIM. "#bundle" + time tag + N elements, each
//      of which is a message OR another bundle. The spec's words are that the
//      contained messages "must be invoked immediately, in the order given" —
//      i.e. no other message may be interleaved between them, and (our reading,
//      argued in proto/osc/NOTES.md) a receiver that delivers three of five has
//      violated the sender's intent more thoroughly than one that delivers none.
//      This is the ONE thing our timeline had no vocabulary for: same-ms ties
//      order deterministically by seq, but nothing said "these five or nothing".
//
// -----------------------------------------------------------------------------

// =============================================================================
// PART A — THE WIRE CODEC
// =============================================================================
//
// OSC 1.0 (CNMAT 2002) and 1.1 (Freed & Schmeder, NIME 2009) differ in exactly
// one place that matters to an encoder: 1.1 REQUIRES T/F/N/I (and adds [] array
// grouping); 1.0 lists them as "optional non-standard". We ENCODE 1.0's four
// core types plus the optional ones, and we DECODE everything, because a decoder
// that rejects a tag a real tool emits is just a bug with a citation.
//
// The four atomic rules of the format, and they are the whole of it:
//   R1. Every "OSC-string" is null-terminated and then padded with 0-3 MORE
//       nulls to a multiple of 4. So "abc" is 4 bytes ("abc\0") and "abcd" is
//       EIGHT ("abcd\0\0\0\0") — the terminator is never optional, which is the
//       single most common third-party encoder bug and the one we assert on.
//   R2. Every "OSC-blob" is int32 byte-count, then the bytes, then 0-3 nulls to
//       a multiple of 4. The COUNT IS NOT PADDED — it is the true length.
//   R3. All integers are big-endian, two's complement. All floats are IEEE 754
//       big-endian. There is no little-endian OSC.
//   R4. The typetag string starts with ',' and is itself an OSC-string. A
//       message with no arguments has typetag "," (which pads to 4 bytes).
//       1.0 permits omitting the typetag entirely; we DECODE that (see
//       `allowUntyped`) and never emit it.

const TE = new TextEncoder();
const TD = new TextDecoder('utf-8', { fatal: false });

/** typetags whose payload occupies zero bytes on the wire — the value IS the
 *  tag. These are the ones 1.0 calls optional and 1.1 makes required. */
const NULLARY = {
  T: true,          // true
  F: false,         // false
  N: null,          // nil  (1.1 "N"; some 1.0 tools never emit it)
  I: 'impulse',     // 1.0 called this "Infinitum"/bang, 1.1 renamed it Impulse.
                    // Same byte. We surface it as the string 'impulse' so a
                    // JSON round-trip survives; see OSC_IMPULSE.
};
/** the sentinel value we use for 'I'. Exported so a client can compare by
 *  identity rather than by string, and so JSON.stringify keeps it legible. */
export const OSC_IMPULSE = 'impulse';

// ---------------------------------------------------------------------------
// Writer / reader over a growable byte buffer. Deliberately not a class: the
// hot path is `encodeMessage` in a loop and a monomorphic object literal beats
// a class here in every engine we care about.
// ---------------------------------------------------------------------------

function writer(initial = 128) {
  let buf = new Uint8Array(initial);
  let dv = new DataView(buf.buffer);
  let n = 0;
  function need(k) {
    if (n + k <= buf.length) return;
    let cap = buf.length || 8;
    while (cap < n + k) cap *= 2;
    const nb = new Uint8Array(cap);
    nb.set(buf.subarray(0, n));
    buf = nb; dv = new DataView(buf.buffer);
  }
  return {
    get length() { return n; },
    u8(v) { need(1); buf[n++] = v & 0xff; },
    i32(v) { need(4); dv.setInt32(n, v | 0, false); n += 4; },       // R3: big-endian
    u32(v) { need(4); dv.setUint32(n, v >>> 0, false); n += 4; },
    i64(v) { need(8); dv.setBigInt64(n, BigInt(v), false); n += 8; },
    f32(v) { need(4); dv.setFloat32(n, v, false); n += 4; },
    f64(v) { need(8); dv.setFloat64(n, v, false); n += 8; },
    bytes(b) { need(b.length); buf.set(b, n); n += b.length; },
    /** R1 — OSC-string: UTF-8, ONE mandatory null, then pad to a multiple of 4.
     *  Note the `+1`: a 4-byte string costs 8. Getting this wrong is the classic
     *  interop failure and it is asymmetric — an under-padded encoder produces
     *  bytes that many decoders happily read, so it only fails against a strict
     *  peer. We are the strict peer. */
    str(s) {
      const b = TE.encode(s);
      // pad in [1..4]: ALWAYS at least one null, and (len + pad) % 4 === 0.
      // The formula is `4 - (len % 4)`, NOT `4 - ((len+1) % 4)` — the latter is
      // off by one for every len ≡ 0 or 2 (mod 4) and, because a matching
      // reader makes the same mistake, it ROUND-TRIPS PERFECTLY against itself
      // and fails only against a real implementation. This exact bug was in
      // the first draft and was caught by the first `oscdump` run, not by any
      // amount of self-testing. It is the argument for Phase 2 in one line.
      const pad = 4 - (b.length % 4);
      need(b.length + pad);
      buf.set(b, n); n += b.length;
      for (let i = 0; i < pad; i++) buf[n++] = 0;
    },
    /** R2 — OSC-blob: int32 TRUE length, bytes, pad to 4. Padding is NOT counted
     *  in the length. A zero-length blob is a legal 4 bytes of `00000000`. */
    blob(b) {
      const u = toBytes(b);
      this.i32(u.length);
      need(u.length + 3);
      buf.set(u, n); n += u.length;
      const pad = (4 - (u.length % 4)) % 4;            // in [0..3] — blobs differ from strings
      for (let i = 0; i < pad; i++) buf[n++] = 0;
    },
    /** patch a previously reserved int32 (bundle element sizes) */
    patchI32(off, v) { dv.setInt32(off, v | 0, false); },
    reserveI32() { const off = n; this.i32(0); return off; },
    done() { return buf.slice(0, n); },
  };
}

function toBytes(b) {
  if (b instanceof Uint8Array) return b;
  if (b instanceof ArrayBuffer) return new Uint8Array(b);
  if (ArrayBuffer.isView(b)) return new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
  if (Array.isArray(b)) return Uint8Array.from(b);
  if (typeof b === 'string') return TE.encode(b);
  throw new TypeError(`blob argument must be bytes, got ${typeof b}`);
}

function reader(bytes, off = 0, end = bytes.length) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = off;
  const need = (k, what) => {
    if (p + k > end) throw new OscDecodeError(`truncated: need ${k} more bytes for ${what} at offset ${p} (limit ${end})`, p);
  };
  return {
    get pos() { return p; },
    set pos(v) { p = v; },
    get end() { return end; },
    get remaining() { return end - p; },
    i32(what = 'int32') { need(4, what); const v = dv.getInt32(p, false); p += 4; return v; },
    u32(what = 'uint32') { need(4, what); const v = dv.getUint32(p, false); p += 4; return v; },
    i64(what = 'int64') { need(8, what); const v = dv.getBigInt64(p, false); p += 8; return v; },
    f32(what = 'float32') { need(4, what); const v = dv.getFloat32(p, false); p += 4; return v; },
    f64(what = 'float64') { need(8, what); const v = dv.getFloat64(p, false); p += 8; return v; },
    raw(k, what = 'bytes') { need(k, what); const v = bytes.subarray(p, p + k); p += k; return v; },
    /** R1 read: scan to the first null, then skip the pad. STRICT about the
     *  terminator (an unterminated string running to the packet end is a
     *  malformed packet, not a string) but TOLERANT about the pad bytes'
     *  contents — the spec says nulls, some tools emit garbage, and rejecting
     *  that would be a purity that costs interop and buys nothing. */
    str(what = 'string') {
      let q = p;
      while (q < end && bytes[q] !== 0) q++;
      if (q >= end) throw new OscDecodeError(`unterminated OSC-string starting at ${p} (${what})`, p);
      const s = TD.decode(bytes.subarray(p, q));
      const len = q - p;
      const pad = 4 - (len % 4);                    // see writer.str — same law
      p = p + len + pad;
      if (p > end) throw new OscDecodeError(`OSC-string padding for ${what} runs past the packet end`, p);
      return s;
    },
    blob(what = 'blob') {
      const len = this.i32(`${what} length`);
      if (len < 0) throw new OscDecodeError(`negative blob length ${len} at ${p - 4}`, p - 4);
      const b = this.raw(len, what);
      p += (4 - (len % 4)) % 4;                     // R2 pad, not counted in len
      if (p > end) throw new OscDecodeError(`blob padding for ${what} runs past the packet end`, p);
      return b.slice();                             // detach: callers keep it
    },
  };
}

export class OscDecodeError extends Error {
  constructor(msg, offset) { super(msg); this.name = 'OscDecodeError'; this.offset = offset; }
}

// ---------------------------------------------------------------------------
// §TIMETAG — NTP <-> our epoch.
//
// An OSC time tag is 64 bits: the high 32 are seconds since the NTP epoch
// (1900-01-01T00:00:00Z), the low 32 are a binary fraction of a second. The
// LSB is 2^-32 s ≈ 232.83 ps.
//
// THE PRECISION ASYMMETRY, stated plainly, because it runs the wrong way from
// what people assume:
//
//   NTP -> ours   LOSSY.   Our `at` is a JS double of milliseconds. A double has
//                 53 bits of mantissa; ms-since-1970 in 2026 is ~1.79e12, needing
//                 41 bits, leaving 12 bits of sub-ms => ~244 ns resolution. The
//                 tag's 233 ps is thrown away: we lose ~10 bits, a factor of
//                 ~1000. So a decoded-then-re-encoded tag is NOT byte-identical
//                 unless you keep the original — which is why every decoded
//                 bundle carries `rawTag` (the 8 bytes, verbatim) alongside the
//                 derived `at`. Re-emit uses rawTag; arithmetic uses `at`.
//
//   ours -> NTP   EXACT, in the only sense that matters: every double-ms value
//                 maps to a unique 64-bit tag (we have far more tag bits than
//                 double bits), and round-tripping ours->NTP->ours is the
//                 identity to within one 2^-32 s rounding, i.e. below our own
//                 representable step. Proven by property test in interop.mjs.
//
// This is the same shape as the rawData rule elsewhere in the project: derive
// freely, but never destroy the received bytes, because the received bytes are
// the evidence and everything else is a re-expression of it.
//
// THE IMMEDIATE TAG. The 64-bit value 1 (0x0000000000000001) means "immediately"
// — NOT "one 2^-32 s past 1900". It is a sentinel, and it is the DEFAULT for a
// bundle that has no scheduling intent. We surface it as the JS value
// OSC_IMMEDIATE (=== 1n is deliberately NOT the API; use the helper) so that no
// caller can accidentally do arithmetic on it.
// ---------------------------------------------------------------------------

/** seconds between 1900-01-01 and 1970-01-01, including 17 leap days. */
export const NTP_EPOCH_OFFSET_SEC = 2208988800;
const TWO32 = 4294967296;

/** The `immediately` sentinel, as a distinguishable value. Not a number: a
 *  number would silently participate in arithmetic and produce a position in
 *  1900. Frozen so identity comparison is safe across module copies via .immediate. */
export const OSC_IMMEDIATE = Object.freeze({ osc: 'immediate', immediate: true });
export const isImmediate = (t) => t === OSC_IMMEDIATE || (t && t.immediate === true);

/** {seconds, fraction} (both uint32) -> epoch-ms float. */
export function ntpToEpochMs(seconds, fraction) {
  return (seconds - NTP_EPOCH_OFFSET_SEC) * 1000 + (fraction / TWO32) * 1000;
}
/** epoch-ms float -> {seconds, fraction} (both uint32).
 *  Rounds the fraction to nearest; carries into seconds on overflow (the
 *  ms = x.9999999996 case, which a naive floor-then-multiply gets wrong). */
export function epochMsToNtp(ms) {
  const total = ms / 1000 + NTP_EPOCH_OFFSET_SEC;
  let seconds = Math.floor(total);
  let fraction = Math.round((total - seconds) * TWO32);
  if (fraction >= TWO32) { fraction -= TWO32; seconds += 1; }
  if (seconds < 0 || seconds >= TWO32)
    throw new RangeError(`epochMsToNtp: ${ms} ms is outside the NTP era (1900-01-01 .. 2036-02-07); ` +
      `OSC time tags do not carry an era number, so this is a real limit of the format, not of us`);
  return { seconds, fraction };
}

/** the 8 raw bytes of a time tag -> {immediate, seconds, fraction, epochMs, raw} */
export function decodeTimeTag(raw8) {
  const b = toBytes(raw8);
  if (b.length !== 8) throw new OscDecodeError(`time tag must be 8 bytes, got ${b.length}`, 0);
  const dv = new DataView(b.buffer, b.byteOffset, 8);
  const seconds = dv.getUint32(0, false), fraction = dv.getUint32(4, false);
  if (seconds === 0 && fraction === 1)
    return { immediate: true, seconds, fraction, epochMs: null, raw: b.slice() };
  return { immediate: false, seconds, fraction, epochMs: ntpToEpochMs(seconds, fraction), raw: b.slice() };
}

/** anything a caller might hand us as a time tag -> 8 bytes.
 *  Accepts: OSC_IMMEDIATE | undefined/null (=> immediate) | a Date | a number
 *  (epoch ms) | {seconds, fraction} | 8 raw bytes (passed through VERBATIM,
 *  which is the rawTag re-emit path). */
export function encodeTimeTag(t) {
  if (t === undefined || t === null || isImmediate(t)) return Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 1);
  if (t instanceof Uint8Array && t.length === 8) return t.slice();       // rawTag verbatim
  const out = new Uint8Array(8);
  const dv = new DataView(out.buffer);
  let seconds, fraction;
  if (t instanceof Date) ({ seconds, fraction } = epochMsToNtp(t.getTime()));
  else if (typeof t === 'number') ({ seconds, fraction } = epochMsToNtp(t));
  else if (typeof t === 'object' && Number.isFinite(t.seconds)) { seconds = t.seconds; fraction = t.fraction || 0; }
  else throw new TypeError(`unencodable time tag ${JSON.stringify(t)}`);
  dv.setUint32(0, seconds >>> 0, false);
  dv.setUint32(4, fraction >>> 0, false);
  return out;
}

// ---------------------------------------------------------------------------
// ARGUMENT ENCODING. The type map, with the reason each tag is here.
//
//  CORE (OSC 1.0 required, every implementation supports):
//   i  int32                        R3 big-endian
//   f  float32                      R3 big-endian IEEE 754
//   s  OSC-string                   R1
//   b  OSC-blob                     R2
//
//  OPTIONAL-IN-1.0, REQUIRED-IN-1.1 (nullary — no payload bytes):
//   T  true      F  false      N  nil      I  impulse/bang/infinitum
//
//  OPTIONAL EVERYWHERE (we implement all of them; interop varies and the
//  interop matrix names exactly who supports what):
//   h  int64                        8 bytes. BigInt in, BigInt out — a double
//                                   cannot hold an int64 and silently rounding
//                                   one is a data-loss bug wearing a number.
//   t  OSC-timetag                  8 bytes, decoded through decodeTimeTag —
//                                   so a TIMETAG ARGUMENT and a BUNDLE's tag go
//                                   through exactly the same code, which is the
//                                   only way they can't drift apart.
//   d  float64                      8 bytes.
//   S  "symbol"/alternate string    Wire-identical to `s`. Exists so a language
//                                   with an interned-symbol type can round-trip
//                                   it. We keep it DISTINCT from `s` (a wrapper
//                                   object) because collapsing it loses the only
//                                   information the tag carries.
//   c  ASCII char                   FOUR bytes: the char in the LOW byte of a
//                                   big-endian int32. Emphatically NOT one byte.
//                                   The #1 `c` interop bug.
//   r  32-bit RGBA colour           4 bytes, R,G,B,A in that order.
//   m  4-byte MIDI message          port id, status, data1, data2 — in that
//                                   order, and note that `port id` comes FIRST,
//                                   which is not the order a MIDI cable uses.
//
//  DECODE-ONLY:
//   [ ]  1.1 array grouping. We DECODE nested arrays (a real, if rare, tag pair)
//        and we do NOT encode them, because a JS array argument is ambiguous
//        with our own blob-from-array convenience and guessing there is worse
//        than refusing. Stated in caps, not hidden.
// ---------------------------------------------------------------------------

/** wrapper types — the only way to say "this number is an f32 not an f64", or
 *  "this string is a symbol", without a parallel typetag array. A caller may
 *  ALSO pass an explicit typetag string to encodeMessage, which skips inference
 *  entirely; the wrappers exist so the common case needs no bookkeeping. */
export const osc = {
  int: (v) => ({ type: 'i', value: v | 0 }),
  float: (v) => ({ type: 'f', value: +v }),
  double: (v) => ({ type: 'd', value: +v }),
  string: (v) => ({ type: 's', value: String(v) }),
  symbol: (v) => ({ type: 'S', value: String(v) }),
  blob: (v) => ({ type: 'b', value: toBytes(v) }),
  big: (v) => ({ type: 'h', value: BigInt(v) }),
  char: (v) => ({ type: 'c', value: String(v).charAt(0) }),
  color: (r, g, b, a) => ({ type: 'r', value: [r, g, b, a] }),
  midi: (port, status, d1, d2) => ({ type: 'm', value: [port, status, d1, d2] }),
  timetag: (v) => ({ type: 't', value: v }),
  true: () => ({ type: 'T', value: true }),
  false: () => ({ type: 'F', value: false }),
  nil: () => ({ type: 'N', value: null }),
  impulse: () => ({ type: 'I', value: OSC_IMPULSE }),
};

/** INFERENCE, and its one deliberate sharp edge.
 *  A bare JS number infers to 'f' (float32) when it is not an exact int32, and
 *  to 'i' otherwise. That matches liblo's `oscsend` and Max/Pd expectations, and
 *  it is the source of the single most common cross-tool surprise: sending 1.0
 *  from JS produces `i 1`, not `f 1.0`. We do NOT silently paper over it —
 *  `inferTypes` is exported so a test can assert the mapping, and any caller who
 *  cares uses the wrappers. Documented > clever. */
export function inferType(v) {
  if (v === true) return 'T';
  if (v === false) return 'F';
  if (v === null) return 'N';
  if (v === OSC_IMPULSE) return 'I';
  if (typeof v === 'bigint') return 'h';
  if (typeof v === 'number') return Number.isInteger(v) && v >= -2147483648 && v <= 2147483647 ? 'i' : 'f';
  if (typeof v === 'string') return 's';
  if (v instanceof Uint8Array || v instanceof ArrayBuffer || ArrayBuffer.isView(v)) return 'b';
  if (v && typeof v === 'object' && typeof v.type === 'string') return v.type;   // wrapper
  if (Array.isArray(v)) return 'b';
  throw new TypeError(`cannot infer an OSC type for ${Object.prototype.toString.call(v)}`);
}
const unwrap = (v) => (v && typeof v === 'object' && typeof v.type === 'string' && 'value' in v ? v.value : v);

function writeArg(w, tag, value) {
  switch (tag) {
    case 'i': w.i32(value | 0); return;
    case 'f': w.f32(+value); return;
    case 'd': w.f64(+value); return;
    case 'h': w.i64(typeof value === 'bigint' ? value : BigInt(Math.trunc(Number(value)))); return;
    case 's': case 'S': w.str(String(value)); return;
    case 'b': w.blob(value); return;
    case 't': w.bytes(encodeTimeTag(value && value.raw ? value.raw : value)); return;
    case 'c': {
      // FOUR bytes, char in the low byte of a big-endian int32.
      const code = typeof value === 'number' ? value : String(value).charCodeAt(0) || 0;
      if (code > 0x7f) throw new RangeError(`OSC 'c' is an ASCII char; ${code} is not representable (use 's')`);
      w.i32(code); return;
    }
    case 'r': case 'm': {
      const a = Array.isArray(value) ? value : [0, 0, 0, 0];
      w.u8(a[0]); w.u8(a[1]); w.u8(a[2]); w.u8(a[3]); return;
    }
    case 'T': case 'F': case 'N': case 'I': return;      // nullary: the tag IS the value
    default: throw new TypeError(`unsupported OSC typetag '${tag}' for encoding`);
  }
}

function readArg(r, tag) {
  switch (tag) {
    case 'i': return r.i32();
    case 'f': return r.f32();
    case 'd': return r.f64();
    case 'h': return r.i64();
    case 's': return r.str();
    case 'S': return { type: 'S', value: r.str() };       // kept distinct from 's'
    case 'b': return r.blob();
    case 't': return decodeTimeTag(r.raw(8, 'timetag arg'));
    case 'c': { const v = r.i32('char'); return String.fromCharCode(v & 0x7fffffff); }
    case 'r': { const b = r.raw(4, 'rgba'); return { type: 'r', value: [b[0], b[1], b[2], b[3]] }; }
    case 'm': { const b = r.raw(4, 'midi'); return { type: 'm', value: [b[0], b[1], b[2], b[3]] }; }
    case 'T': return true;
    case 'F': return false;
    case 'N': return null;
    case 'I': return OSC_IMPULSE;
    default: throw new OscDecodeError(`unknown OSC typetag '${tag}' (0x${tag.charCodeAt(0).toString(16)}) at offset ${r.pos}`, r.pos);
  }
}

/** which tags consume zero payload bytes — needed by the 1.1 array reader. */
const isNullary = (t) => t === 'T' || t === 'F' || t === 'N' || t === 'I';

// ---------------------------------------------------------------------------
// MESSAGES
// ---------------------------------------------------------------------------

/** Encode {address, args} (or (address, args)) to bytes.
 *  `types` may be given explicitly ('ifs' — WITHOUT the leading comma) to skip
 *  inference entirely; that is the escape hatch for "I really do mean f32 1.0". */
export function encodeMessage(msgOrAddress, maybeArgs, opts = {}) {
  const m = typeof msgOrAddress === 'string'
    ? { address: msgOrAddress, args: maybeArgs || [] }
    : msgOrAddress;
  const address = m.address;
  if (typeof address !== 'string' || address[0] !== '/')
    throw new TypeError(`OSC address must start with '/', got ${JSON.stringify(address)}`);
  const args = m.args === undefined ? [] : (Array.isArray(m.args) ? m.args : [m.args]);
  const types = m.types || opts.types || args.map(inferType).join('');
  if (types.length !== args.length)
    throw new TypeError(`typetag string '${types}' has ${types.length} tags for ${args.length} args`);
  const w = writer(32 + address.length + args.length * 8);
  w.str(address);
  w.str(',' + types);                                    // R4
  for (let i = 0; i < args.length; i++) writeArg(w, types[i], unwrap(args[i]));
  return w.done();
}

/** Decode a message from `r`, whose window is exactly this message's extent.
 *  `allowUntyped` handles OSC 1.0's legacy "no typetag string" form: if the
 *  second OSC-string does not start with ',', the spec says treat the rest as
 *  ... nothing well-defined, so we return the address with zero args and set
 *  `untyped: true` rather than inventing arguments. Real senders that do this
 *  (very old Max externals) send no args anyway. */
function decodeMessageFrom(r, { allowUntyped = true } = {}) {
  const address = r.str('address');
  if (r.remaining === 0) return { address, types: '', args: [], untyped: true };
  const tt = r.str('typetag');
  if (tt[0] !== ',') {
    if (!allowUntyped) throw new OscDecodeError(`typetag string must start with ',', got ${JSON.stringify(tt)}`, r.pos);
    return { address, types: '', args: [], untyped: true };
  }
  const types = tt.slice(1);
  const args = [];
  // 1.1 array grouping: '[' opens, ']' closes. A stack keeps nesting honest.
  const stack = [args];
  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    if (t === '[') { const a = []; stack[stack.length - 1].push(a); stack.push(a); continue; }
    if (t === ']') {
      if (stack.length === 1) throw new OscDecodeError(`unbalanced ']' in typetag '${types}'`, r.pos);
      stack.pop(); continue;
    }
    stack[stack.length - 1].push(readArg(r, t));
  }
  if (stack.length !== 1) throw new OscDecodeError(`unclosed '[' in typetag '${types}'`, r.pos);
  const out = { address, types, args };
  if (types.includes('[')) out.arrays = true;
  return out;
}

// ---------------------------------------------------------------------------
// BUNDLES
//
// Layout: "#bundle\0" (8 bytes — note it is exactly 7 chars + 1 null, so it
// pads to 8 with no extra) | 8-byte time tag | then, repeated:
//   int32 element size | that many bytes (a message OR a nested bundle)
//
// The element size makes bundles self-delimiting, which is what lets a bundle
// contain a bundle, and what lets a STREAM transport (TCP/WebSocket/QUIC)
// frame packets at all — see PART C's framing note.
// ---------------------------------------------------------------------------

export const BUNDLE_TAG = '#bundle';
const BUNDLE_PREFIX = Uint8Array.of(0x23, 0x62, 0x75, 0x6e, 0x64, 0x6c, 0x65, 0x00);  // "#bundle\0"

/** Is this packet a bundle? The ONLY legal discriminator (spec: first byte '#'
 *  for a bundle, '/' for a message — an address may not begin with '#'). */
export function isBundle(bytes, off = 0) {
  const b = toBytes(bytes);
  if (b.length - off < 8) return false;
  for (let i = 0; i < 8; i++) if (b[off + i] !== BUNDLE_PREFIX[i]) return false;
  return true;
}

/** Encode {timetag, elements|packets} -> bytes. Elements may be messages,
 *  nested bundles, or already-encoded Uint8Arrays (pass-through, which is how a
 *  relay forwards a bundle it did not author without re-encoding it). */
export function encodeBundle(bundle) {
  const elements = bundle.elements || bundle.packets || [];
  const w = writer(64 + elements.length * 32);
  w.bytes(BUNDLE_PREFIX);
  w.bytes(encodeTimeTag(bundle.rawTag ? bundle.rawTag : bundle.timetag));
  for (const el of elements) {
    const sizeOff = w.reserveI32();
    const start = w.length;
    if (el instanceof Uint8Array) w.bytes(el);
    else w.bytes(encodePacket(el));
    w.patchI32(sizeOff, w.length - start);
  }
  return w.done();
}

/** message | bundle -> bytes, discriminating on shape. */
export function encodePacket(p) {
  if (p instanceof Uint8Array) return p;
  if (p && (p.elements || p.packets || p.timetag !== undefined || p.rawTag)) return encodeBundle(p);
  return encodeMessage(p);
}

/** bytes -> {address,...} | {timetag, elements, ...}. The one entry point.
 *  Every decoded bundle carries:
 *    timetag  {immediate, seconds, fraction, epochMs, raw}  — the parsed view
 *    rawTag   the 8 bytes VERBATIM                          — the rawData rule
 *    elements the decoded children, in wire order (order is semantic)
 */
export function decodePacket(bytes, off = 0, end, opts = {}) {
  const b = toBytes(bytes);
  const lim = end === undefined ? b.length : end;
  if (isBundle(b, off)) {
    const r = reader(b, off + 8, lim);
    const raw = r.raw(8, 'bundle timetag');
    const timetag = decodeTimeTag(raw);
    const elements = [];
    while (r.remaining > 0) {
      const size = r.i32('bundle element size');
      if (size < 0) throw new OscDecodeError(`negative bundle element size ${size}`, r.pos - 4);
      if (size % 4 !== 0) throw new OscDecodeError(`bundle element size ${size} is not a multiple of 4 (spec: every element is 4-byte aligned)`, r.pos - 4);
      if (r.pos + size > lim)
        throw new OscDecodeError(`bundle element claims ${size} bytes but only ${lim - r.pos} remain — TRUNCATED BUNDLE`, r.pos);
      elements.push(decodePacket(b, r.pos, r.pos + size, opts));    // nested bundles fall out here
      r.pos += size;
    }
    return { timetag, rawTag: raw, elements, bundle: true };
  }
  const r = reader(b, off, lim);
  return decodeMessageFrom(r, opts);
}

/** Flatten a (possibly nested) bundle into [{message, timetag, rawTag, path}].
 *  `path` is the index chain from the root, so a nested element is addressable.
 *  A NESTED bundle's own time tag governs its children — the spec says a nested
 *  bundle's tag must be >= its parent's, and we RECORD violations rather than
 *  reject them (a real capture from a real tool is data, not an argument). */
export function flattenBundle(pkt, { path = [], parentTag = null, out = [], violations = [] } = {}) {
  if (!pkt.bundle) { out.push({ message: pkt, timetag: parentTag, path }); return { out, violations }; }
  const tag = pkt.timetag;
  if (parentTag && !parentTag.immediate && !tag.immediate && tag.epochMs < parentTag.epochMs)
    violations.push({ path, reason: `nested bundle time tag ${tag.epochMs} precedes its parent's ${parentTag.epochMs} (spec: "time tags of enclosed bundles must be >= the enclosing bundle's")` });
  pkt.elements.forEach((el, i) => flattenBundle(el, { path: [...path, i], parentTag: tag, out, violations }));
  return { out, violations };
}

/** Count the messages a packet contains (1 for a message; recursive for bundles).
 *  This is the number a bundle-integrity check compares against. */
export function messageCount(pkt) {
  return pkt.bundle ? pkt.elements.reduce((n, e) => n + messageCount(e), 0) : 1;
}

// ---------------------------------------------------------------------------
// STREAM FRAMING. UDP is a datagram transport: one packet per datagram, done.
// TCP / WebSocket-binary / a QUIC stream are BYTE STREAMS with no packet
// boundary, so OSC 1.0 over TCP prefixes each packet with an int32 length
// (the "packet length framing" every DAW that speaks OSC-over-TCP uses), and
// OSC 1.1 additionally standardises SLIP (RFC 1055) framing.
//
// We implement LENGTH framing and NOT SLIP, for one reason: WebSocket already
// gives us message boundaries, so on our actual transports the length prefix is
// only needed for a raw TCP bridge, and SLIP's escape-scan is a per-byte cost
// buying nothing we lack. If a client needs SLIP we will implement it; the
// omission is declared in caps (see PART B), not silent.
// ---------------------------------------------------------------------------

export function frameLength(packetBytes) {
  const w = writer(packetBytes.length + 4);
  w.i32(packetBytes.length);
  w.bytes(packetBytes);
  return w.done();
}
/** Pull as many complete length-framed packets out of `buf` as it holds.
 *  Returns {packets: Uint8Array[], rest: Uint8Array} — `rest` is the partial
 *  tail the caller must prepend to the next chunk. */
export function unframeLength(buf) {
  const b = toBytes(buf);
  const packets = [];
  let p = 0;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  while (p + 4 <= b.length) {
    const len = dv.getInt32(p, false);
    if (len < 0) throw new OscDecodeError(`negative framed length ${len}`, p);
    if (p + 4 + len > b.length) break;
    packets.push(b.slice(p + 4, p + 4 + len));
    p += 4 + len;
  }
  return { packets, rest: b.slice(p) };
}

// =============================================================================
// PART B — THE `osc` TIMELINE KIND
// =============================================================================
//
// -----------------------------------------------------------------------------
// §POLICY — level vs edge, and why the address decides.
//
// The CC kind (proto/automation) could answer "level or edge?" per CONTROLLER
// NUMBER because MIDI's 128 controllers are a closed, enumerated set with
// conventions. OSC has an open address space: `/synth/3/cutoff` and
// `/scene/next` are the same wire shape, and no registry says which is which.
//
// So the kind refuses to guess SILENTLY. Three layers, in priority order:
//   1. an explicit per-address / per-glob policy the client supplies;
//   2. the DEFAULT HEURISTIC below (pattern-matched, and every match is
//      REPORTED through deck.degradations, not applied invisibly);
//   3. `unknown` — treated as an edge (the conservative choice: an edge is not
//      re-asserted on seek, so a wrong guess makes us do TOO LITTLE, never
//      re-fire `/scene/next` five times during a scrub).
//
// The direction of that conservatism is the whole design. Guessing "level"
// wrongly means a seek RE-SENDS a one-shot trigger — audible, destructive, and
// exactly the class of bug the CC kind's SWITCHES step-series bug was. Guessing
// "edge" wrongly means a seek leaves a fader stale — visible, recoverable, and
// fixable by naming the address. Asymmetric costs, asymmetric default.
// -----------------------------------------------------------------------------

/** THE DEFAULT HEURISTIC. Ordered; first match wins. Every rule is here because
 *  it matches something a real tool actually emits, and each carries the reason
 *  string that appears in the degradation report. */
export const DEFAULT_ADDRESS_POLICY = [
  // Nullary-only messages are almost always triggers: `/scene/next` with no
  // args carries no state to hold, so "hold it" is not even meaningful.
  { test: (a, m) => m && m.args && m.args.length === 0, kind: 'edge',
    why: 'no arguments — there is no value to hold, so this can only be a trigger' },
  // Explicit verb-shaped leaves.
  { re: /\/(next|prev|previous|trigger|fire|bang|go|start|stop|play|pause|reset|clear|panic|kill|tap|hit|strike|shot|once|toggle)$/i,
    kind: 'edge', why: 'the final path segment is an imperative verb (a command, not a state)' },
  // Note-like: /note, /noteon, /midi/note …
  { re: /\/(note|noteon|noteoff|note_on|note_off|key|trig|trigger)(\/|$)/i, kind: 'edge',
    why: 'note/trigger-shaped address — an event that happened, not a value that holds' },
  // Level-shaped leaves: the continuous-control vocabulary.
  { re: /\/(cutoff|reso|resonance|gain|level|volume|vol|pan|freq|frequency|amp|amount|depth|rate|speed|mix|wet|dry|fader|slider|knob|xy|x|y|z|position|pos|value|val|param|cc|mod|bend|pressure|aftertouch|filter|attack|decay|sustain|release|threshold|ratio|feedback|delay|time|size|width|tilt|azimuth|elevation|distance)$/i,
    kind: 'level', why: 'the final path segment names a continuous parameter (a value that holds until superseded)' },
  // Mute/solo/select/enable: booleans that HOLD. The trap: `/ch/3/mute 1` looks
  // like a command and is a state. This rule exists specifically to catch it.
  { re: /\/(mute|solo|enable|enabled|active|on|off|arm|record|rec|select|selected|state|mode|preset|scene|bank|page|visible|show|hide|bypass|lock)$/i,
    kind: 'level', why: 'a latched boolean/enum — it names a STATE the receiver stays in, not a moment' },
  // TouchOSC / Lemur / Open Stage Control conventions.
  { re: /^\/(\d+\/)?(fader|rotary|xy|multifader|multixy|led|label|encoder)/i, kind: 'level',
    why: 'TouchOSC/Lemur control naming — a surface control reports its position, which is a level' },
  { re: /^\/(\d+\/)?(push|toggle|multipush|multitoggle)/i, kind: 'edge',
    why: 'TouchOSC push/toggle control — reports a press, which is a moment' },
  // A single numeric argument on a leaf that is not otherwise classified is
  // WEAK evidence of a level, so it is applied last and reported loudly.
  { test: (a, m) => m && m.args && m.args.length === 1 && typeof m.args[0] === 'number', kind: 'level',
    weak: true, why: 'one numeric argument and no other signal — WEAK inference; name this address explicitly if it is a trigger' },
];

/** Compile a client policy into a lookup. Accepts:
 *    {'/synth/1/cutoff': 'level', '/scene/*': 'edge'}
 *    [{match:'/synth/**\/cutoff', kind:'level'}, {re:/…/, kind:'edge'}]
 *  Glob syntax is OSC's own address-pattern syntax (`?`, `*`, `[a-z]`, `{a,b}`)
 *  extended with `**` for "any number of segments", because a policy over
 *  `/synth/<n>/cutoff` for all n is the normal case and `*` in OSC does not
 *  cross a `/`. */
export function compileAddressPolicy(spec) {
  const rules = [];
  const push = (pattern, kind, why) => {
    if (!KINDS.includes(kind)) throw new Error(`address policy for '${pattern}': kind must be 'level' | 'edge', got ${JSON.stringify(kind)}`);
    rules.push({ pattern, kind, why: why || `declared by the client policy as ${kind}`, re: globToRegExp(pattern), explicit: true });
  };
  if (!spec) return rules;
  if (Array.isArray(spec)) {
    for (const r of spec) {
      if (r.re instanceof RegExp) rules.push({ pattern: String(r.re), kind: r.kind, why: r.why || 'client regexp policy', re: r.re, explicit: true });
      else push(r.match || r.address || r.pattern, r.kind, r.why);
    }
  } else for (const [pattern, kind] of Object.entries(spec)) push(pattern, typeof kind === 'string' ? kind : kind.kind, kind && kind.why);
  return rules;
}
const KINDS = ['level', 'edge'];

/** OSC address-pattern glob -> RegExp. Implements the spec's `?`, `*`, `[…]`
 *  (with `!` negation and `a-z` ranges) and `{a,b}` alternation, plus our `**`.
 *  Note `*` matches within one segment only — that IS the OSC rule, and it is
 *  the reason `**` had to be added rather than "fixed". */
export function globToRegExp(glob) {
  let out = '^';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') { out += '.*'; i++; }
      else out += '[^/]*';
    } else if (c === '?') out += '[^/]';
    else if (c === '[') {
      let j = i + 1, neg = false;
      if (glob[j] === '!') { neg = true; j++; }
      let body = '';
      for (; j < glob.length && glob[j] !== ']'; j++) body += glob[j] === '\\' ? '\\\\' : glob[j];
      out += `[${neg ? '^' : ''}${body.replace(/[\^]/g, '\\^')}]`;
      i = j;
    } else if (c === '{') {
      let j = i + 1, body = '';
      for (; j < glob.length && glob[j] !== '}'; j++) body += glob[j];
      out += `(?:${body.split(',').map(esc).join('|')})`;
      i = j;
    } else out += esc(c);
  }
  return new RegExp(out + '$');
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Decide level-vs-edge for an address, with the REASON. Never throws, never
 *  guesses in silence: `source` is 'client' | 'heuristic' | 'default', and
 *  `weak` marks an inference the caller should be shown. */
export function classifyAddress(address, message, clientRules = [], heuristic = DEFAULT_ADDRESS_POLICY) {
  for (const r of clientRules) if (r.re.test(address)) return { kind: r.kind, source: 'client', why: r.why, weak: false, pattern: r.pattern };
  if (heuristic) for (const r of heuristic) {
    const hit = r.re ? r.re.test(address) : (r.test && r.test(address, message));
    if (hit) return { kind: r.kind, source: 'heuristic', why: r.why, weak: !!r.weak, pattern: r.re ? String(r.re) : 'predicate' };
  }
  return { kind: 'edge', source: 'default', weak: true,
    why: 'no client rule and no heuristic matched — defaulting to EDGE, the conservative choice: a wrongly-edge address goes stale on seek (visible, recoverable), a wrongly-level one RE-FIRES a trigger on every scrub (audible, destructive)' };
}

// -----------------------------------------------------------------------------
// §BUNDLE — THE ATOMICITY DECISION.
//
// THE CHOICE: a bundle becomes **N ROWS sharing a `bundleId` and an identical
// `at`**, delivered to actuate() as a group with an explicit commit boundary.
// NOT one row whose payload is the bundle.
//
// THE ARGUMENT, against the four things the brief names:
//
//  SEEK.   A bundle is routinely HETEROGENEOUS: `{/synth/1/cutoff 800,
//          /scene/next}` is one level and one edge. Under one-row-per-bundle
//          the row has ONE address, so caps.series has one key for a payload
//          holding two signals — the exact defect U5 exists to prevent, and the
//          bracket/sampleAt reads become meaningless for a lane where a level's
//          history is buried inside opaque sibling payloads. Under N rows the
//          level's series is `/synth/1/cutoff`, its history is a clean sub-lane,
//          and reduce/assertState work per address without ever unpacking a
//          bundle. THIS IS THE DECIDING ARGUMENT: one-row-per-bundle makes the
//          library's own positional reads lie.
//
//  REDUCE. reduce(prefix <= t) is "last value per address". Under N rows that is
//          one linear pass over payloads that each have exactly one address.
//          Under one-row-per-bundle every fold must recursively flatten every
//          bundle in the prefix on every seek — O(total messages) work with a
//          nested-recursion constant, done at scrub rate. Worse, `at` would no
//          longer be the position of the message: a bundle at t containing a
//          nested bundle tagged t+50ms has children that are NOT at t, and a
//          single row cannot express two positions. N rows can: the nested tag
//          becomes the child rows' `at`, which is what the spec means.
//
//  EVIDENCE. Provenance and `when` are PER ROW (E1/U1). A restoration that
//          interpolates one address inside a bundle must be able to mark that
//          one message derived. One row per bundle forces the whole bundle to
//          share one provenance — so interpolating a single fader would relabel
//          a `/scene/next` in the same bundle as tier-1 restoration, which is a
//          false provenance claim, and the firewall exists precisely to make
//          those impossible. N rows keeps the two absences per message.
//
//  THE STORE. This is the case that looks like it argues the other way and does
//          not. Page the log and a 5-message bundle can straddle a boundary: a
//          client holding page k has messages 1-3 and not 4-5. One row per
//          bundle is atomic by construction there — the whole bundle is one row,
//          so you have it or you don't. That is a real advantage and we give it
//          up ON PURPOSE, because it only buys atomicity at the STORAGE layer
//          while costing it at the SEMANTIC layer: a paged client is still going
//          to seek, reduce, and interpolate, and those are where a bundle
//          actually has to hold together for a listener. We buy the storage-layer
//          property back explicitly and cheaply — see §COMMIT: every row carries
//          {bundleId, bundleN, bundleI}, so "do I have all of it?" is a count,
//          not a structural property, and a partial bundle is DETECTABLE rather
//          than merely impossible. Detectable is enough, and it composes with
//          the other three; impossible-but-opaque does not.
//
//          (Concretely: the store's page reader groups by bundleId at the
//          boundary and either withholds the fragment until the next page or
//          reports a `partial-bundle` degradation. Both are honest; silently
//          actuating 3 of 5 is not, and that is the only outcome ruled out.)
//
// SO: N rows, one bundleId, identical `at`, and ATOMICITY IS ENFORCED AT THE
// ACTUATION BOUNDARY rather than at the row boundary. That is where it belongs,
// because "these fire together" is a claim about firing.
//
// §COMMIT — HOW THE GROUP IS ENFORCED.
// The scheduler fires rows one at a time; it has no notion of a group and we are
// not permitted to add one to transport.mjs (and should not — a bundle is an OSC
// concept, not a transport concept). So the adapter BUFFERS:
//
//   actuate(payload) with payload.bundleId != null
//     -> stage the message; if the staged count for that bundleId reaches
//        payload.bundleN, COMMIT the group in one call to the sink;
//        otherwise hold.
//   a fire whose bundleId differs from the open group, or a non-bundle fire, or
//   the end of the scheduler's synchronous fire burst (a microtask boundary)
//     -> the open group is INCOMPLETE. It is ABANDONED, not partially emitted,
//        and reported.
//
// Because every row of a bundle carries the SAME `at`, the scheduler's own
// (at, seq) ordering delivers them consecutively and within one synchronous
// burst — so the common path stages N and commits, with no timer and no async.
// The abandon path exists for the cases that actually break it: a seek landing
// mid-bundle, a store page boundary, a `drop` catch-up policy discarding some
// rows, or a transport that lost a datagram. In every one of those the answer is
// the same and it is the point of the whole design: NOTHING IS EMITTED.
//
// Verified by proto/osc/atomic-test.mjs: after a seek, a catch-up, and a store
// miss, the sink observes only complete bundles — n of n or zero, never k of n.
// -----------------------------------------------------------------------------

/** Explode a decoded packet into timeline rows.
 *  A MESSAGE -> one row. A BUNDLE -> N rows sharing {bundleId, bundleN, bundleI}
 *  and an `at` derived from the governing time tag.
 *
 *  `at` resolution, in priority order:
 *    1. a non-immediate time tag on the innermost enclosing bundle -> its epochMs
 *       (mapped through `mapTime` if the deck's position domain is not epoch-ms);
 *    2. an immediate tag -> `receivedAt` (when we got it — because "immediately"
 *       is a statement about the RECEIVER's clock, not the sender's);
 *    3. no bundle at all -> `receivedAt`.
 *
 *  NESTED BUNDLES flatten. The nested bundle's tag governs its own children, so
 *  children may land at a DIFFERENT `at` than their siblings — which is exactly
 *  what the spec means and exactly what one-row-per-bundle could not express.
 *  Each nesting level gets its OWN bundleId: atomicity is per innermost bundle,
 *  because that is the smallest set the sender said must fire together, and a
 *  parent whose children fire at different times was never an atomic set. */
export function packetToRows(pkt, {
  receivedAt = Date.now(),
  kind = 'osc',
  mapTime = (epochMs) => epochMs,
  idPrefix = 'osc',
  seq = { n: 0 },
} = {}) {
  const rows = [];
  const violations = [];
  walk(pkt, null, []);
  return { rows, violations };

  function walk(p, tag, path) {
    if (!p.bundle) {
      rows.push(rowFor(p, tag, path, null, 1, 0));
      return;
    }
    const t = p.timetag;
    if (tag && !tag.immediate && !t.immediate && t.epochMs < tag.epochMs)
      violations.push({ path, reason: `nested bundle tag precedes its parent's (spec violation, recorded not rejected)`, childMs: t.epochMs, parentMs: tag.epochMs });
    // Only the MESSAGES directly in this bundle form its atomic group; a nested
    // bundle is its own group (and may be at its own time).
    const direct = p.elements.map((e, i) => ({ e, i })).filter(({ e }) => !e.bundle);
    const bundleId = direct.length ? `${idPrefix}-b${seq.n++}` : null;
    const n = direct.length;
    let k = 0;
    p.elements.forEach((el, i) => {
      if (el.bundle) walk(el, t, [...path, i]);
      else rows.push(rowFor(el, t, [...path, i], bundleId, n, k++));
    });
  }

  function rowFor(msg, tag, path, bundleId, bundleN, bundleI) {
    const atEpoch = tag && !tag.immediate ? tag.epochMs : receivedAt;
    const payload = {
      address: msg.address,
      types: msg.types,
      args: msg.args,
      // §RAW — the received time tag, VERBATIM, on every row that came from a
      // bundle. `at` is a lossy re-expression (see §TIMETAG); rawTag is the
      // evidence, and re-emitting from it is byte-identical to what arrived.
      ...(tag ? { rawTag: tag.raw, immediate: tag.immediate } : {}),
      ...(bundleId ? { bundleId, bundleN, bundleI, bundlePath: path } : {}),
    };
    return { at: mapTime(atEpoch), kind, id: `${idPrefix}-${seq.n++}`, payload };
  }
}

/** The inverse: rows -> packets, regrouping by bundleId. Used by the recorder
 *  path (replay a stored lane back out to a real OSC receiver) and by the
 *  interop tests. Rows must be in (at, seq) order; rows of one bundle must be
 *  contiguous, which the scheduler guarantees because they share `at`. */
export function rowsToPackets(rows, { mapTime = (pos) => pos } = {}) {
  const out = [];
  let open = null;
  const flush = () => { if (open) { out.push(open.pkt); open = null; } };
  for (const r of rows) {
    const p = r.payload || r;
    const msg = { address: p.address, types: p.types, args: p.args };
    if (!p.bundleId) { flush(); out.push(msg); continue; }
    if (!open || open.id !== p.bundleId) {
      flush();
      open = { id: p.bundleId, n: p.bundleN, pkt: { bundle: true, rawTag: p.rawTag, timetag: p.rawTag ? undefined : mapTime(r.at), elements: [] } };
    }
    open.pkt.elements.push(msg);
    if (open.pkt.elements.length === open.n) flush();
  }
  flush();
  return out;
}

// -----------------------------------------------------------------------------
// THE ADAPTER.
// -----------------------------------------------------------------------------

/**
 * createOscAdapter({send, policy, ...}) -> an adapter for deck.registerAdapter('osc', …).
 *
 *   send(packet, info)   the SINK. Receives a decoded message OR a bundle
 *                        ({bundle:true, elements:[…]}) — never a partial one.
 *                        Encode it with encodePacket() and put it on a wire.
 *   policy               client address policy (see compileAddressPolicy).
 *   heuristic            override or disable (null) the default heuristic.
 *   onReport(r)          every classification that was inferred rather than
 *                        declared, and every abandoned bundle. THE REPORTING
 *                        SURFACE the brief asks for: "report the choice rather
 *                        than guessing silently".
 *   assertTag            the time tag to stamp on the re-asserted level bundle
 *                        (default: immediate — a state assertion is not a
 *                        scheduled event, it is a correction, and scheduling a
 *                        correction is how you get two of them).
 */
export function createOscAdapter({
  send,
  policy = null,
  heuristic = DEFAULT_ADDRESS_POLICY,
  onReport = null,
  assertAsBundle = true,
  assertTag = OSC_IMMEDIATE,
  strictGroups = true,
} = {}) {
  if (typeof send !== 'function') throw new Error('createOscAdapter needs send(packet, info)');
  const rules = compileAddressPolicy(policy);
  const classCache = new Map();          // address -> classification (heuristics are pure)
  const reports = [];
  const stats = { messages: 0, bundlesCommitted: 0, bundlesAbandoned: 0, abandonedMessages: 0, asserts: 0, edgesSuppressed: 0 };
  let open = null;                       // {bundleId, n, staged:[], at}
  let drainScheduled = false;

  function report(r) {
    reports.push(r);
    if (reports.length > 256) reports.shift();
    onReport && onReport(r);
  }
  function classify(address, msg) {
    let c = classCache.get(address);
    if (c) return c;
    c = classifyAddress(address, msg, rules, heuristic);
    classCache.set(address, c);
    if (c.source !== 'client') report({ type: 'classification', address, ...c });
    return c;
  }

  // ---- §COMMIT: the atomic-group buffer ------------------------------------
  function abandon(why) {
    if (!open) return;
    stats.bundlesAbandoned++;
    stats.abandonedMessages += open.staged.length;
    report({ type: 'bundle-abandoned', bundleId: open.bundleId, have: open.staged.length, want: open.n, why,
      addresses: open.staged.map((m) => m.address) });
    open = null;
  }
  function commit(info) {
    if (!open) return;
    const pkt = { bundle: true, rawTag: open.rawTag, timetag: open.rawTag ? undefined : (open.immediate ? OSC_IMMEDIATE : open.at), elements: open.staged };
    const g = open; open = null;
    stats.bundlesCommitted++;
    send(pkt, { ...info, bundleId: g.bundleId, n: g.staged.length, atomic: true });
  }
  /** The burst boundary. The scheduler fires a whole scan's worth of events
   *  synchronously, so a microtask is exactly "after this burst" — earlier than
   *  any timer, later than every fire in the batch, and free when nothing is
   *  open. An unfinished group at that boundary can never be finished (its
   *  siblings had the same `at` and would already have fired), so it is
   *  abandoned there rather than lingering into the next scan where it could
   *  merge with unrelated rows. */
  function scheduleDrain() {
    if (drainScheduled || !strictGroups) return;
    drainScheduled = true;
    queueMicrotask(() => {
      drainScheduled = false;
      if (open) abandon('the scheduler\'s synchronous fire burst ended with the group incomplete — its siblings share `at` and would already have fired, so the missing messages are not coming (seek landed mid-bundle, a catch-up dropped rows, or the store page ended here)');
    });
  }

  return {
    caps: {
      // U5 — THE ADDRESS IS THE SERIES. This is the cap the whole kind turns on:
      // one lane, one sub-lane per address, so bracket/sampleAt never straddle
      // two different controls (the CC lane's modwheel-vs-cutoff defect).
      series: (payload) => payload && payload.address,
      // Catch-up folds rather than bursts: replaying 4000 fader messages after a
      // scrub is the CC lesson, and the answer is the same one — last value per
      // address, asserted once.
      catchUp: 'reduce',
      // NOT continuous. An OSC level is a ZERO-ORDER HOLD, not an interpolated
      // ramp: `/synth/1/cutoff 800` means 800 until told otherwise, and inventing
      // 812.5 between two samples is a claim the sender never made. Declaring
      // caps.continuous here would make the library offer interpolation for a
      // signal whose semantics forbid it. A client that genuinely wants smoothed
      // OSC registers a SECOND, derived lane (E2 lane purity) and pays the tier-1
      // provenance for it — which is the firewall working as designed.
      continuous: false,
      // Consequently no tier: we never invent a between-samples value, so we
      // never enter §5b's spectrum at all.
      assertOnSeek: true,
      // Declared omissions, so they are in caps() rather than in a paragraph
      // nobody reads:
      oscVersion: '1.0+1.1',
      encodes: 'ifsbhtdScrmTFNI',
      decodes: 'ifsbhtdScrmTFNI[]',
      framing: ['datagram', 'length'],       // NOT slip — see §STREAM FRAMING
      atomicGroups: 'bundleId',
    },

    /** One row. Level or edge, bundled or not — the bundle buffer is the only
     *  place the difference between "a message" and "part of a group" lives. */
    actuate(payload, rec, when) {
      stats.messages++;
      const msg = { address: payload.address, types: payload.types, args: payload.args };
      if (!payload.bundleId) {
        abandon('a non-bundled message fired while a group was open — the group can no longer be completed in order');
        send(msg, { rec, when, atomic: false });
        return;
      }
      if (open && open.bundleId !== payload.bundleId)
        abandon(`a different bundle (${payload.bundleId}) began before this one completed`);
      if (!open) open = { bundleId: payload.bundleId, n: payload.bundleN, staged: [], at: rec ? rec.at : null, rawTag: payload.rawTag, immediate: payload.immediate };
      open.staged.push(msg);
      if (open.staged.length >= open.n) commit({ rec, when });
      else scheduleDrain();
    },

    /** reduce(prefix <= t): LAST VALUE PER ADDRESS for level addresses; the
     *  FIRED SET for edge addresses. Both are needed and they are different
     *  objects, because a seek must re-send the first and must NOT re-send the
     *  second — and a caller inspecting the state should be able to see which
     *  edges have gone by without that being an instruction to fire them. */
    reduce(payloads, pos, info) {
      const levels = new Map();     // address -> {message, at, bundleId}
      const edges = new Map();      // address -> count
      let bundlesSeen = 0;
      const lastBundle = new Map();
      for (let i = 0; i < payloads.length; i++) {
        const p = payloads[i];
        if (!p || !p.address) continue;
        const c = classify(p.address, p);
        if (c.kind === 'level') levels.set(p.address, { address: p.address, types: p.types, args: p.args, bundleId: p.bundleId || null });
        else edges.set(p.address, (edges.get(p.address) || 0) + 1);
        if (p.bundleId && !lastBundle.has(p.bundleId)) { lastBundle.set(p.bundleId, true); bundlesSeen++; }
      }
      return { levels, edges, pos, bundlesSeen, addresses: levels.size + edges.size };
    },

    /** THE CC LESSON, applied: seek must RESTORE STATE, not merely resume.
     *  Re-send every level at its folded value; re-send NO edge, ever.
     *
     *  It goes out as ONE BUNDLE with an `immediate` tag, and that is not
     *  cosmetic: a state assertion is a set of values that must land together
     *  (a filter cutoff and its resonance restored half a scan apart is an
     *  audible artefact), which is precisely what a bundle is for. So the kind's
     *  own atomicity primitive is what implements its own seek correctness. */
    assertState(state, info) {
      if (!state || !state.levels || !state.levels.size) return;
      stats.asserts++;
      stats.edgesSuppressed += state.edges ? state.edges.size : 0;
      const elements = [...state.levels.values()].map((m) => ({ address: m.address, types: m.types, args: m.args }));
      const meta = { assert: true, reason: info && info.reason, pos: info && info.pos, n: elements.length,
                     suppressedEdges: state.edges ? [...state.edges.keys()] : [] };
      if (assertAsBundle) send({ bundle: true, timetag: assertTag, elements }, { ...meta, atomic: true });
      else for (const el of elements) send(el, { ...meta, atomic: false });
    },

    // ---- introspection --------------------------------------------------
    /** every inference and every abandoned group */
    reports: () => reports.slice(),
    stats: () => ({ ...stats, openGroup: open ? { bundleId: open.bundleId, have: open.staged.length, want: open.n } : null }),
    /** what this adapter decided about an address, and why */
    classify: (address, msg) => classify(address, msg),
    /** force the group boundary (a transport that knows a datagram ended) */
    flush(why = 'client flush') { if (open) { if (open.staged.length >= open.n) commit({}); else abandon(why); } },
  };
}

// -----------------------------------------------------------------------------
// §BRIDGE — feed a live OSC stream into a deck.
// Not a transport; a shape adapter. Give it decoded packets and it schedules
// rows. `mapTime` moves epoch-ms into whatever position domain the deck uses.
// -----------------------------------------------------------------------------

export function createOscIngest(deck, { kind = 'osc', mapTime, idPrefix = 'osc', onViolation = null } = {}) {
  const seq = { n: 0 };
  const map = mapTime || ((ms) => ms);
  let packets = 0, rows = 0, violations = 0;
  return {
    /** bytes | decoded packet -> scheduled rows. Returns the rows scheduled. */
    ingest(pktOrBytes, receivedAt = Date.now()) {
      const pkt = pktOrBytes instanceof Uint8Array ? decodePacket(pktOrBytes) : pktOrBytes;
      const r = packetToRows(pkt, { receivedAt, kind, mapTime: map, idPrefix, seq });
      packets++;
      for (const v of r.violations) { violations++; onViolation && onViolation(v); }
      for (const row of r.rows) { deck.schedule(row); rows++; }
      return r.rows;
    },
    stats: () => ({ packets, rows, violations }),
  };
}

export default {
  encodeMessage, decodePacket, encodeBundle, encodePacket, isBundle,
  encodeTimeTag, decodeTimeTag, ntpToEpochMs, epochMsToNtp,
  packetToRows, rowsToPackets, createOscAdapter, createOscIngest,
  classifyAddress, compileAddressPolicy, globToRegExp,
  frameLength, unframeLength, flattenBundle, messageCount,
  osc, OSC_IMMEDIATE, OSC_IMPULSE, NTP_EPOCH_OFFSET_SEC,
};
