// proto/osc/corpus.mjs — THE SHARED INTEROP CORPUS.
// One list of cases, encoded/decoded by every tool in the matrix, so that
// "liblo and we disagree" is always about the same bytes. Each case declares
// what it is FOR, because a corpus whose cases nobody can justify is a corpus
// that gets quietly trimmed when it fails.
//
// `types` is always EXPLICIT — never inferred — so that a disagreement is never
// about our own type inference (which is documented separately as a known
// divergence, see the `infer-*` cases at the end).

export const CORPUS = [
  // ---- the spec's own example, the one number everybody agrees on ----------
  { id: 'spec-osc-example', address: '/oscillator/4/frequency', types: 'f', args: [440.0],
    why: 'the canonical CNMAT 1.0 spec example — 32 bytes, and if this is not byte-identical nothing else matters',
    expectHex: '2f6f7363696c6c61746f722f342f6672657175656e6379002c66000043dc0000' },

  // ---- R1: the padding cases, which is where encoders actually break -------
  { id: 'pad-addr-len1', address: '/a', types: '', args: [], why: 'address 2 bytes -> 4 (pad 2)' },
  { id: 'pad-addr-len3', address: '/abc', types: '', args: [], why: 'address 4 bytes, len%4==0 -> EIGHT bytes (pad 4). THE case the off-by-one bug got wrong.' },
  { id: 'pad-addr-len7', address: '/abcdefg', types: '', args: [], why: 'address 8 bytes -> 12' },
  { id: 'pad-noargs', address: '/nothing', types: '', args: [], why: 'typetag is bare "," and must still pad to 4 bytes' },
  { id: 'pad-str-empty', address: '/s', types: 's', args: [''], why: 'a zero-length OSC-string is 4 nulls, not 0 bytes' },
  { id: 'pad-str-3', address: '/s', types: 's', args: ['abc'], why: 'string len 3 -> 4' },
  { id: 'pad-str-4', address: '/s', types: 's', args: ['abcd'], why: 'string len 4 -> 8 — the same off-by-one trap on the ARG side' },
  { id: 'pad-str-5', address: '/s', types: 's', args: ['abcde'], why: 'string len 5 -> 8' },

  // ---- R3: integer and float edges ----------------------------------------
  { id: 'int-zero', address: '/i', types: 'i', args: [0], why: 'int32 0' },
  { id: 'int-neg1', address: '/i', types: 'i', args: [-1], why: "two's complement ffffffff" },
  { id: 'int-max', address: '/i', types: 'i', args: [2147483647], why: 'INT32_MAX' },
  { id: 'int-min', address: '/i', types: 'i', args: [-2147483648], why: 'INT32_MIN' },
  { id: 'float-zero', address: '/f', types: 'f', args: [0.0], why: 'float32 +0' },
  { id: 'float-neg', address: '/f', types: 'f', args: [-1.5], why: 'exactly representable negative' },
  { id: 'float-pi', address: '/f', types: 'f', args: [3.14159265358979], why: 'a double truncated to f32 — every tool must round the SAME way (nearest-even)' },
  { id: 'float-tiny', address: '/f', types: 'f', args: [1e-30], why: 'small normal f32' },

  // ---- the four core types together, the everyday message -----------------
  { id: 'core-ifsb', address: '/core/all', types: 'ifsb', args: [1000, 2.5, 'hello', [0xde, 0xad, 0xbe, 0xef]],
    why: 'the OSC 1.0 required set in one message' },
  { id: 'blob-empty', address: '/b', types: 'b', args: [[]], why: 'zero-length blob = int32 0, no bytes, no pad' },
  { id: 'blob-1', address: '/b', types: 'b', args: [[0x41]], why: 'blob len 1 -> 1 byte + 3 pad; the COUNT stays 1 (R2)' },
  { id: 'blob-3', address: '/b', types: 'b', args: [[1, 2, 3]], why: 'blob len 3 -> 1 pad byte' },
  { id: 'blob-4', address: '/b', types: 'b', args: [[1, 2, 3, 4]], why: 'blob len 4 -> ZERO pad. Blobs differ from strings here: no mandatory terminator.' },

  // ---- 1.1 / optional typetags, the interop frontier -----------------------
  { id: 'nullary-T', address: '/t', types: 'T', args: [true], why: '1.1 required, 1.0 optional; zero payload bytes' },
  { id: 'nullary-F', address: '/t', types: 'F', args: [false], why: 'ditto' },
  { id: 'nullary-N', address: '/t', types: 'N', args: [null], why: 'nil' },
  { id: 'nullary-I', address: '/t', types: 'I', args: ['impulse'], why: 'Impulse (1.1) / Infinitum (1.0) / bang — same byte, three names' },
  { id: 'nullary-TFNI', address: '/t/all', types: 'TFNI', args: [true, false, null, 'impulse'],
    why: 'four nullary tags in a row: the typetag string grows, the payload does not' },
  { id: 'ext-h', address: '/h', types: 'h', args: [1234567890123n], why: 'int64 — a double cannot hold this, so anyone returning a Number here has lost data' },
  { id: 'ext-h-neg', address: '/h', types: 'h', args: [-1n], why: 'int64 -1 = ffffffffffffffff' },
  { id: 'ext-d', address: '/d', types: 'd', args: [3.14159265358979], why: 'float64 — full double, unlike f' },
  { id: 'ext-S', address: '/S', types: 'S', args: ['sym'], why: 'symbol: WIRE-IDENTICAL to s, distinguished only by the tag' },
  { id: 'ext-c', address: '/c', types: 'c', args: ['A'], why: "char: FOUR bytes, 0x00000041 — not one byte. The #1 'c' interop bug." },
  { id: 'ext-r', address: '/r', types: 'r', args: [[255, 128, 64, 32]], why: 'RGBA, one byte each, in that order' },
  { id: 'ext-m', address: '/m', types: 'm', args: [[0, 0x90, 60, 100]], why: 'MIDI: PORT id first, then status/d1/d2 — not the cable order' },
  { id: 'ext-t', address: '/tt', types: 't', args: [{ seconds: 3959251200, fraction: 0x80000000 }],
    why: 'a TIMETAG ARGUMENT — same 8 bytes as a bundle tag, and it must go through the same code' },

  // ---- unicode / address shapes -------------------------------------------
  { id: 'utf8-arg', address: '/u', types: 's', args: ['häl£o'], why: 'UTF-8 arg: length is in BYTES, not codepoints, and the pad follows the byte length' },
  { id: 'deep-address', address: '/a/b/c/d/e/f/g/h', types: 'i', args: [7], why: 'a deep address, for length arithmetic' },
];

// Bundles. `tag` is either 'immediate' or {seconds, fraction}.
export const BUNDLE_CORPUS = [
  { id: 'bundle-immediate-2', tag: 'immediate',
    elements: [{ address: '/a', types: 'i', args: [1] }, { address: '/b', types: 'f', args: [2.0] }],
    why: 'the everyday bundle: #bundle\\0 + tag 1 + two size-prefixed messages' },
  { id: 'bundle-empty', tag: 'immediate', elements: [],
    why: 'an EMPTY bundle is legal and is exactly 16 bytes. Several tools refuse to build one.' },
  { id: 'bundle-one', tag: 'immediate', elements: [{ address: '/only', types: 's', args: ['x'] }],
    why: 'single-element bundle — semantically a message, structurally a bundle' },
  { id: 'bundle-timed', tag: { seconds: 3959251200, fraction: 0x80000000 },
    elements: [{ address: '/x', types: 'f', args: [0.5] }, { address: '/y', types: 'f', args: [0.25] }],
    why: 'a NON-immediate tag: 2025-06-01T00:00:00.5Z in NTP. This is the one our `at` comes from.' },
  { id: 'bundle-chord', tag: 'immediate',
    elements: [{ address: '/note', types: 'ii', args: [60, 100] }, { address: '/note', types: 'ii', args: [64, 100] }, { address: '/note', types: 'ii', args: [67, 100] }],
    why: 'A CHORD AS ONE BUNDLE — the exact shape the MoQ group-per-bundle hypothesis is about' },
  { id: 'bundle-nested', tag: 'immediate',
    elements: [{ address: '/outer', types: 'i', args: [1] },
               { bundle: true, tag: { seconds: 3959251200, fraction: 0 }, elements: [{ address: '/inner', types: 'i', args: [2] }] }],
    why: 'a NESTED bundle with its own (later) time tag — the case one-row-per-bundle cannot express' },
  { id: 'bundle-mixed-8', tag: 'immediate',
    elements: Array.from({ length: 8 }, (_, i) => ({ address: `/m/${i}`, types: 'if', args: [i, i / 8] })),
    why: '8 elements, the upper end of the transport arm bundle sizes' },
];
