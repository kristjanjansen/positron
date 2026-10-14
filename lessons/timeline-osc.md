# timeline-osc

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `timeline/osc.mjs`

### header

Above `// =============================================================================`, lines 1 to 43 before the cut.

~~~js
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
~~~

### codec

Above `const TE = new TextEncoder();`, lines 45 to 67 before the cut.

~~~js
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
~~~

### nullary

Above `const NULLARY = {`, lines 72 to 73 before the cut.

~~~js
/** typetags whose payload occupies zero bytes on the wire — the value IS the
 *  tag. These are the ones 1.0 calls optional and 1.1 makes required. */
~~~

### writer

Above `function writer(initial = 128) {`, lines 86 to 90 before the cut.

~~~js
// ---------------------------------------------------------------------------
// Writer / reader over a growable byte buffer. Deliberately not a class: the
// hot path is `encodeMessage` in a loop and a monomorphic object literal beats
// a class here in every engine we care about.
// ---------------------------------------------------------------------------
~~~

### str

Above `str(s) {`, lines 113 to 117 before the cut.

~~~js
/** R1 — OSC-string: UTF-8, ONE mandatory null, then pad to a multiple of 4.
 *  Note the `+1`: a 4-byte string costs 8. Getting this wrong is the classic
 *  interop failure and it is asymmetric — an under-padded encoder produces
 *  bytes that many decoders happily read, so it only fails against a strict
 *  peer. We are the strict peer. */
~~~

### pad

Above `const pad = 4 - (b.length % 4);`, lines 120 to 126 before the cut.

~~~js
// pad in [1..4]: ALWAYS at least one null, and (len + pad) % 4 === 0.
// The formula is `4 - (len % 4)`, NOT `4 - ((len+1) % 4)` — the latter is
// off by one for every len ≡ 0 or 2 (mod 4) and, because a matching
// reader makes the same mistake, it ROUND-TRIPS PERFECTLY against itself
// and fails only against a real implementation. This exact bug was in
// the first draft and was caught by the first `oscdump` run, not by any
// amount of self-testing. It is the argument for Phase 2 in one line.
~~~

### blob

Above `blob(b) {`, lines 132 to 133 before the cut.

~~~js
/** R2 — OSC-blob: int32 TRUE length, bytes, pad to 4. Padding is NOT counted
 *  in the length. A zero-length blob is a legal 4 bytes of `00000000`. */
~~~

### blob-pad

Trailing comment on line 139 before the cut.

~~~js
const pad = (4 - (u.length % 4)) % 4;            // in [0..3] — blobs differ from strings
~~~

### read-str

Above `str(what = 'string') {`, lines 175 to 179 before the cut.

~~~js
/** R1 read: scan to the first null, then skip the pad. STRICT about the
 *  terminator (an unterminated string running to the packet end is a
 *  malformed packet, not a string) but TOLERANT about the pad bytes'
 *  contents — the spec says nulls, some tools emit garbage, and rejecting
 *  that would be a purity that costs interop and buys nothing. */
~~~

### read-pad

Trailing comment on line 186 before the cut.

~~~js
const pad = 4 - (len % 4);                    // see writer.str — same law
~~~

### timetag

Above `/** seconds between 1900-01-01 and 1970-01-01, including 17 leap days. */`, lines 206 to 240 before the cut.

~~~js
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
~~~

### encode-tag

Above `export function encodeTimeTag(t) {`, lines 281 to 284 before the cut.

~~~js
/** anything a caller might hand us as a time tag -> 8 bytes.
 *  Accepts: OSC_IMMEDIATE | undefined/null (=> immediate) | a Date | a number
 *  (epoch ms) | {seconds, fraction} | 8 raw bytes (passed through VERBATIM,
 *  which is the rawTag re-emit path). */
~~~

### types

Above `/** wrapper types — the only way to say "this number is an f32 not an f64", or`, lines 300 to 340 before the cut.

~~~js
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
~~~

### wrappers

Above `export const osc = {`, lines 342 to 345 before the cut.

~~~js
/** wrapper types — the only way to say "this number is an f32 not an f64", or
 *  "this string is a symbol", without a parallel typetag array. A caller may
 *  ALSO pass an explicit typetag string to encodeMessage, which skips inference
 *  entirely; the wrappers exist so the common case needs no bookkeeping. */
~~~

### infer

Above `export function inferType(v) {`, lines 364 to 370 before the cut.

~~~js
/** INFERENCE, and its one deliberate sharp edge.
 *  A bare JS number infers to 'f' (float32) when it is not an exact int32, and
 *  to 'i' otherwise. That matches liblo's `oscsend` and Max/Pd expectations, and
 *  it is the source of the single most common cross-tool surprise: sending 1.0
 *  from JS produces `i 1`, not `f 1.0`. We do NOT silently paper over it —
 *  `inferTypes` is exported so a test can assert the mapping, and any caller who
 *  cares uses the wrappers. Documented > clever. */
~~~

### is-nullary

Above `const isNullary = (t) => t === 'T' || t === 'F' || t === 'N' || t === 'I';`, lines 431 to 431 before the cut.

~~~js
/** which tags consume zero payload bytes — needed by the 1.1 array reader. */
~~~

### encode-message

Above `export function encodeMessage(msgOrAddress, maybeArgs, opts = {}) {`, lines 438 to 440 before the cut.

~~~js
/** Encode {address, args} (or (address, args)) to bytes.
 *  `types` may be given explicitly ('ifs' — WITHOUT the leading comma) to skip
 *  inference entirely; that is the escape hatch for "I really do mean f32 1.0". */
~~~

### decode-message

Above `function decodeMessageFrom(r, { allowUntyped = true } = {}) {`, lines 459 to 464 before the cut.

~~~js
/** Decode a message from `r`, whose window is exactly this message's extent.
 *  `allowUntyped` handles OSC 1.0's legacy "no typetag string" form: if the
 *  second OSC-string does not start with ',', the spec says treat the rest as
 *  ... nothing well-defined, so we return the address with zero args and set
 *  `untyped: true` rather than inventing arguments. Real senders that do this
 *  (very old Max externals) send no args anyway. */
~~~

### bundles

Above `export const BUNDLE_TAG = '#bundle';`, lines 492 to 502 before the cut.

~~~js
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
~~~

### is-bundle

Above `export function isBundle(bytes, off = 0) {`, lines 507 to 508 before the cut.

~~~js
/** Is this packet a bundle? The ONLY legal discriminator (spec: first byte '#'
 *  for a bundle, '/' for a message — an address may not begin with '#'). */
~~~

### decode-packet

Above `export function decodePacket(bytes, off = 0, end, opts = {}) {`, lines 541 to 546 before the cut.

~~~js
/** bytes -> {address,...} | {timetag, elements, ...}. The one entry point.
 *  Every decoded bundle carries:
 *    timetag  {immediate, seconds, fraction, epochMs, raw}  — the parsed view
 *    rawTag   the 8 bytes VERBATIM                          — the rawData rule
 *    elements the decoded children, in wire order (order is semantic)
 */
~~~

### flatten

Above `export function flattenBundle(pkt, { path = [], parentTag = null, out = [], viol`..., lines 570 to 574 before the cut.

~~~js
/** Flatten a (possibly nested) bundle into [{message, timetag, rawTag, path}].
 *  `path` is the index chain from the root, so a nested element is addressable.
 *  A NESTED bundle's own time tag governs its children — the spec says a nested
 *  bundle's tag must be >= its parent's, and we RECORD violations rather than
 *  reject them (a real capture from a real tool is data, not an argument). */
~~~

### framing

Above `export function frameLength(packetBytes) {`, lines 590 to 602 before the cut.

~~~js
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
~~~

### unframe

Above `export function unframeLength(buf) {`, lines 610 to 612 before the cut.

~~~js
/** Pull as many complete length-framed packets out of `buf` as it holds.
 *  Returns {packets: Uint8Array[], rest: Uint8Array} — `rest` is the partial
 *  tail the caller must prepend to the next chunk. */
~~~

### policy

Above `/** THE DEFAULT HEURISTIC. Ordered; first match wins. Every rule is here because`, lines 628 to 653 before the cut.

~~~js
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
~~~

### heuristic

Above `export const DEFAULT_ADDRESS_POLICY = [`, lines 655 to 657 before the cut.

~~~js
/** THE DEFAULT HEURISTIC. Ordered; first match wins. Every rule is here because
 *  it matches something a real tool actually emits, and each carries the reason
 *  string that appears in the degradation report. */
~~~

### compile-policy

Above `export function compileAddressPolicy(spec) {`, lines 687 to 693 before the cut.

~~~js
/** Compile a client policy into a lookup. Accepts:
 *    {'/synth/1/cutoff': 'level', '/scene/*': 'edge'}
 *    [{match:'/synth/**\/cutoff', kind:'level'}, {re:/…/, kind:'edge'}]
 *  Glob syntax is OSC's own address-pattern syntax (`?`, `*`, `[a-z]`, `{a,b}`)
 *  extended with `**` for "any number of segments", because a policy over
 *  `/synth/<n>/cutoff` for all n is the normal case and `*` in OSC does not
 *  cross a `/`. */
~~~

### glob

Above `export function globToRegExp(glob) {`, lines 711 to 714 before the cut.

~~~js
/** OSC address-pattern glob -> RegExp. Implements the spec's `?`, `*`, `[…]`
 *  (with `!` negation and `a-z` ranges) and `{a,b}` alternation, plus our `**`.
 *  Note `*` matches within one segment only — that IS the OSC rule, and it is
 *  the reason `**` had to be added rather than "fixed". */
~~~

### bundle-decision

Above `/** Explode a decoded packet into timeline rows.`, lines 754 to 840 before the cut.

~~~js
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
~~~

### packet-to-rows

Above `export function packetToRows(pkt, {`, lines 842 to 858 before the cut.

~~~js
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
~~~

### raw-tag

Above `...(tag ? { rawTag: tag.raw, immediate: tag.immediate } : {}),`, lines 897 to 899 before the cut.

~~~js
// §RAW — the received time tag, VERBATIM, on every row that came from a
// bundle. `at` is a lossy re-expression (see §TIMETAG); rawTag is the
// evidence, and re-emitting from it is byte-identical to what arrived.
~~~

### rows-to-packets

Above `export function rowsToPackets(rows, { mapTime = (pos) => pos } = {}) {`, lines 907 to 910 before the cut.

~~~js
/** The inverse: rows -> packets, regrouping by bundleId. Used by the recorder
 *  path (replay a stored lane back out to a real OSC receiver) and by the
 *  interop tests. Rows must be in (at, seq) order; rows of one bundle must be
 *  contiguous, which the scheduler guarantees because they share `at`. */
~~~

### adapter

Above `export function createOscAdapter({`, lines 934 to 950 before the cut.

~~~js
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
~~~

### drain

Above `function scheduleDrain() {`, lines 998 to 1004 before the cut.

~~~js
/** The burst boundary. The scheduler fires a whole scan's worth of events
 *  synchronously, so a microtask is exactly "after this burst" — earlier than
 *  any timer, later than every fire in the batch, and free when nothing is
 *  open. An unfinished group at that boundary can never be finished (its
 *  siblings had the same `at` and would already have fired), so it is
 *  abandoned there rather than lingering into the next scan where it could
 *  merge with unrelated rows. */
~~~

### series

Above `series: (payload) => payload && payload.address,`, lines 1016 to 1018 before the cut.

~~~js
// U5 — THE ADDRESS IS THE SERIES. This is the cap the whole kind turns on:
// one lane, one sub-lane per address, so bracket/sampleAt never straddle
// two different controls (the CC lane's modwheel-vs-cutoff defect).
~~~

### catch-up

Above `catchUp: 'reduce',`, lines 1020 to 1022 before the cut.

~~~js
// Catch-up folds rather than bursts: replaying 4000 fader messages after a
// scrub is the CC lesson, and the answer is the same one — last value per
// address, asserted once.
~~~

### not-continuous

Above `continuous: false,`, lines 1024 to 1030 before the cut.

~~~js
// NOT continuous. An OSC level is a ZERO-ORDER HOLD, not an interpolated
// ramp: `/synth/1/cutoff 800` means 800 until told otherwise, and inventing
// 812.5 between two samples is a claim the sender never made. Declaring
// caps.continuous here would make the library offer interpolation for a
// signal whose semantics forbid it. A client that genuinely wants smoothed
// OSC registers a SECOND, derived lane (E2 lane purity) and pays the tier-1
// provenance for it — which is the firewall working as designed.
~~~

### no-slip

Trailing comment on line 1040 before the cut.

~~~js
framing: ['datagram', 'length'],       // NOT slip — see §STREAM FRAMING
~~~

### actuate

Above `actuate(payload, rec, when) {`, lines 1044 to 1045 before the cut.

~~~js
/** One row. Level or edge, bundled or not — the bundle buffer is the only
 *  place the difference between "a message" and "part of a group" lives. */
~~~

### reduce

Above `reduce(payloads, pos, info) {`, lines 1062 to 1066 before the cut.

~~~js
/** reduce(prefix <= t): LAST VALUE PER ADDRESS for level addresses; the
 *  FIRED SET for edge addresses. Both are needed and they are different
 *  objects, because a seek must re-send the first and must NOT re-send the
 *  second — and a caller inspecting the state should be able to see which
 *  edges have gone by without that being an instruction to fire them. */
~~~

### assert-state

Above `assertState(state, info) {`, lines 1083 to 1090 before the cut.

~~~js
/** THE CC LESSON, applied: seek must RESTORE STATE, not merely resume.
 *  Re-send every level at its folded value; re-send NO edge, ever.
 *
 *  It goes out as ONE BUNDLE with an `immediate` tag, and that is not
 *  cosmetic: a state assertion is a set of values that must land together
 *  (a filter cutoff and its resonance restored half a scan apart is an
 *  audible artefact), which is precisely what a bundle is for. So the kind's
 *  own atomicity primitive is what implements its own seek correctness. */
~~~

### ingest

Above `export function createOscIngest(deck, { kind = 'osc', mapTime, idPrefix = 'osc',`..., lines 1113 to 1117 before the cut.

~~~js
// -----------------------------------------------------------------------------
// §BRIDGE — feed a live OSC stream into a deck.
// Not a transport; a shape adapter. Give it decoded packets and it schedules
// rows. `mapTime` moves epoch-ms into whatever position domain the deck uses.
// -----------------------------------------------------------------------------
~~~
