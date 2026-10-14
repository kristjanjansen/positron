// OSC 1.0/1.1 codec (part A: pure bytes, byte-exact against liblo, python-osc, osc.js) and the
// `osc` timeline kind (part B). The address alone says level or edge; a time tag is NTP, not our
// epoch; a bundle is an atomicity claim: all of its messages or none.
// why: lessons/timeline-osc.md#header

// Encode 1.0's core types plus the optional ones, decode everything. Strings are null-terminated
// and padded to 4 (a terminator always); blobs carry their true length then pad; big-endian only;
// the typetag starts with ',' (untyped 1.0 messages are decoded, never emitted).
// why: lessons/timeline-osc.md#codec

const TE = new TextEncoder();
const TD = new TextDecoder('utf-8', { fatal: false });

// Typetags with no payload bytes: the value is the tag (T, F, N, I).
// why: lessons/timeline-osc.md#nullary
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

// Writer and reader over a growable buffer, object literals for a monomorphic hot path.
// why: lessons/timeline-osc.md#writer

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
    // An OSC-string: UTF-8, one mandatory null, padded to 4, so a 4-byte string costs 8. We are
    // strict.
    // why: lessons/timeline-osc.md#str
    str(s) {
      const b = TE.encode(s);
      // pad = 4 - (len % 4), in [1..4]; `4 - ((len+1) % 4)` round-trips against itself and fails
      // real peers.
      // why: lessons/timeline-osc.md#pad
      const pad = 4 - (b.length % 4);
      need(b.length + pad);
      buf.set(b, n); n += b.length;
      for (let i = 0; i < pad; i++) buf[n++] = 0;
    },
    // int32 true length, bytes, pad to 4; a zero-length blob is 4 zero bytes.
    // why: lessons/timeline-osc.md#blob
    blob(b) {
      const u = toBytes(b);
      this.i32(u.length);
      need(u.length + 3);
      buf.set(u, n); n += u.length;
      const pad = (4 - (u.length % 4)) % 4;            // in [0..3]: blobs pad differently from strings; why: lessons/timeline-osc.md#blob-pad
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
    // Strict about the terminator, tolerant of non-null pad bytes.
    // why: lessons/timeline-osc.md#read-str
    str(what = 'string') {
      let q = p;
      while (q < end && bytes[q] !== 0) q++;
      if (q >= end) throw new OscDecodeError(`unterminated OSC-string starting at ${p} (${what})`, p);
      const s = TD.decode(bytes.subarray(p, q));
      const len = q - p;
      const pad = 4 - (len % 4);                    // same law as writer.str; why: lessons/timeline-osc.md#read-pad
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

// A time tag is NTP: 32 bits of seconds since 1900 and a 2^-32 s fraction. NTP to our ms is lossy
// (about 244 ns left), so decoded bundles keep `rawTag` for byte-identical re-emit; ours to NTP is
// exact. The value 1 means immediately: use OSC_IMMEDIATE, never arithmetic on it.
// why: lessons/timeline-osc.md#timetag

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

// Accepts OSC_IMMEDIATE, nullish (immediate), a Date, epoch ms, {seconds, fraction} or 8 raw bytes.
// why: lessons/timeline-osc.md#encode-tag
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

// Type map: i f s b core; T F N I nullary; h int64 as BigInt, t through decodeTimeTag, d, S kept
// distinct from s, c as 4 bytes (low byte), r RGBA, m (port id first). [ ] arrays decode only.
// why: lessons/timeline-osc.md#types

// Wrappers say f32 vs f64 or symbol vs string; an explicit typetag string skips inference.
// why: lessons/timeline-osc.md#wrappers
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

// A bare number is 'i' when an exact int32, else 'f', as liblo does, so 1.0 sends `i 1`.
// Use the wrappers when it matters.
// why: lessons/timeline-osc.md#infer
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

// which tags consume zero payload bytes (for the 1.1 array reader)
// why: lessons/timeline-osc.md#is-nullary
const isNullary = (t) => t === 'T' || t === 'F' || t === 'N' || t === 'I';

// ---------------------------------------------------------------------------
// MESSAGES
// ---------------------------------------------------------------------------

// Encode {address, args}; `types` ('ifs', no comma) skips inference.
// why: lessons/timeline-osc.md#encode-message
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

// Decode a message from `r`; an untyped 1.0 message returns its address, no args, `untyped: true`.
// why: lessons/timeline-osc.md#decode-message
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

// Bundle: "#bundle\0" (8 bytes), an 8-byte time tag, then [int32 size, element] repeated.
// Sizes make bundles self-delimiting and nestable.
// why: lessons/timeline-osc.md#bundles

export const BUNDLE_TAG = '#bundle';
const BUNDLE_PREFIX = Uint8Array.of(0x23, 0x62, 0x75, 0x6e, 0x64, 0x6c, 0x65, 0x00);  // "#bundle\0"

// '#' first for a bundle, '/' for a message: the only legal discriminator.
// why: lessons/timeline-osc.md#is-bundle
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

// bytes -> message or {timetag, rawTag (verbatim), elements (wire order)}.
// why: lessons/timeline-osc.md#decode-packet
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

// Flatten to [{message, timetag, rawTag, path}]; a nested tag governs its children, and a nested
// tag
// earlier than its parent is recorded, not rejected.
// why: lessons/timeline-osc.md#flatten
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

// Length framing (int32 prefix) for byte streams; no SLIP, since WebSocket gives boundaries.
// why: lessons/timeline-osc.md#framing

export function frameLength(packetBytes) {
  const w = writer(packetBytes.length + 4);
  w.i32(packetBytes.length);
  w.bytes(packetBytes);
  return w.done();
}
// Pull whole packets out of `buf`: {packets, rest}; prepend `rest` to the next chunk.
// why: lessons/timeline-osc.md#unframe
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

// Level or edge, decided by the address: a client policy, then the default heuristic (each match
// reported), then `unknown` treated as an edge, since a wrong edge only leaves a fader stale.
// why: lessons/timeline-osc.md#policy

// The default heuristic, ordered, first match wins; each rule names what a real tool emits.
// why: lessons/timeline-osc.md#heuristic
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

// Compile {address: kind} or [{match | re, kind}]. OSC glob syntax plus `**` across segments.
// why: lessons/timeline-osc.md#compile-policy
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

// OSC address glob to RegExp: ?, *, [..] with ! and ranges, {a,b}, plus `**`; `*` stays in one
// segment.
// why: lessons/timeline-osc.md#glob
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

// A bundle is N rows sharing bundleId and `at` (one row would merge series and provenance).
// Atomicity is enforced at actuation: the adapter stages rows and commits a whole group or abandons
// and reports it, never k of n (proto/osc/atomic-test.mjs).
// why: lessons/timeline-osc.md#bundle-decision

// A message is one row; a bundle N rows with {bundleId, bundleN, bundleI}. `at` from the innermost
// non-immediate tag (via mapTime), else receivedAt. Each nesting level gets its own bundleId.
// why: lessons/timeline-osc.md#packet-to-rows
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
      // The received tag verbatim on every bundled row, for byte-identical re-emit.
      // why: lessons/timeline-osc.md#raw-tag
      ...(tag ? { rawTag: tag.raw, immediate: tag.immediate } : {}),
      ...(bundleId ? { bundleId, bundleN, bundleI, bundlePath: path } : {}),
    };
    return { at: mapTime(atEpoch), kind, id: `${idPrefix}-${seq.n++}`, payload };
  }
}

// Rows back to packets, regrouped by bundleId; rows must be in (at, seq) order.
// why: lessons/timeline-osc.md#rows-to-packets
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

// createOscAdapter({ send, policy, heuristic, onReport, assertTag }): send gets whole messages or
// bundles only; onReport gets every inferred classification and abandoned bundle; assertTag
// defaults to immediate.
// why: lessons/timeline-osc.md#adapter
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
  // A microtask is the end of the scheduler's synchronous burst; an unfinished group there is
  // abandoned.
  // why: lessons/timeline-osc.md#drain
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
      // The address is the series, so reads never straddle two controls.
      // why: lessons/timeline-osc.md#series
      series: (payload) => payload && payload.address,
      // Catch-up folds to the last value per address, asserted once.
      // why: lessons/timeline-osc.md#catch-up
      catchUp: 'reduce',
      // Not continuous: an OSC level is a zero-order hold. Smoothing belongs in a derived, tiered
      // lane.
      // why: lessons/timeline-osc.md#not-continuous
      continuous: false,
      // Consequently no tier: we never invent a between-samples value, so we
      // never enter §5b's spectrum at all.
      assertOnSeek: true,
      // Declared omissions, so they are in caps() rather than in a paragraph
      // nobody reads:
      oscVersion: '1.0+1.1',
      encodes: 'ifsbhtdScrmTFNI',
      decodes: 'ifsbhtdScrmTFNI[]',
      framing: ['datagram', 'length'],       // not SLIP, see stream framing; why: lessons/timeline-osc.md#no-slip
      atomicGroups: 'bundleId',
    },

    // One row; the bundle buffer is the only place a group differs from a message.
    // why: lessons/timeline-osc.md#actuate
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

    // Last value per level address, and the set of fired edges (never re-sent).
    // why: lessons/timeline-osc.md#reduce
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

    // On seek re-send every level and no edge, as one immediate bundle so related values land
    // together.
    // why: lessons/timeline-osc.md#assert-state
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

// Feed decoded packets into a deck as rows; `mapTime` moves epoch ms into the deck's domain.
// why: lessons/timeline-osc.md#ingest

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
