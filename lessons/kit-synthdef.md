# Kit lessons: synthdef.mjs

The long comments cut from `demo/shell/synthdef.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-synthdef.md#<anchor>`.

<a id="header"></a>

## synthdef.mjs, file header and the layout

demo/shell/synthdef.mjs — a SuperCollider synth definition, as bytes, in
both directions: written here, read back here, and upgraded from the old
layout to the one a 2026 SuperCollider writes.

WHY THIS EXISTS. `plans/plan-visuals.md` §1.2 says a fragment shader is a
DOCUMENT — "~2 KB of GLSL plus ~200 bytes of parameters reproduces it at any
resolution" — and that generated GLSL is a defensible thing to send across a
wire. The sound half of that argument had never been written down. A
SuperCollider synth definition is the same shape of thing: a few kilobytes
that completely describe an instrument, with no interpreter at the far end.
`research/supercollider-browser-2026-09.md` §2.1 measured that wasm scsynth
accepts one as RAW BYTES and plays it. This module is the bytes.

🔴 WHAT GRADES THIS FILE IS NOT THIS FILE. CLAUDE.md: "when you implement
somebody else's format, only their implementation can grade you" —
`timeline/csound.mjs` was 22/22 green for months with two real defects
because its test compared it against the same formula it implements. The
grader here is real scsynth, compiled to wasm, which either plays the bytes
or does not. The reader below is deliberately a SEPARATE PASS over the same
buffer rather than a mirror of the writer's variables, so a round trip is at
least not vacuous — but a round trip is NOT the evidence. The engine is.

⚠️ VERSION 2, ALWAYS, AND THAT IS NOT COSMETIC. The `.scsyndef` files shipped
with Sonic Pi are format version 1; sclang has written version 2 for years.
The two differ in the WIDTH of nearly every count and index — 16 bits against
32 — so a reader written for one silently mis-parses the other from the first
count onward. Testing against a v1 file would prove the wrong thing
(research §7), which is why `toVersion2` is here and why `writeSynthDef`
emits v2 only.

THE LAYOUT, from the SuperCollider source's own `SynthDef` file format notes:

  "SCgf"                     4 bytes
  version                    int32   (1 or 2)
  number of definitions      int16
  per definition:
    name                     pstring (one length byte, then that many chars)
    constants                COUNT, then that many float32
    parameter values         COUNT, then that many float32
    parameter names          COUNT, then (pstring, INDEX) pairs
    building blocks          COUNT, then that many:
      class name             pstring
      rate                   int8    0 once · 1 slow · 2 per sample · 3 on demand
      inputs                 COUNT
      outputs                COUNT
      special index          int16   ALWAYS 16 bits, in both versions
      inputs                 (SOURCE, INDEX) pairs; source -1 means a constant
      outputs                one int8 rate each
    variants                 int16 count, then (pstring, one float32 per parameter)

In version 1 every field written COUNT, INDEX or SOURCE above is int16. In
version 2 they are int32. `specialIndex` is int16 in both, and the definition
count is int16 in both. That is the whole difference.

<a id="size-ceiling"></a>

## synthdef.mjs, SIZE_CEILING

THE LARGEST DEFINITION THAT CAN BE SENT OVER A SOCKET AND ARRIVE.

Over this size wasm scsynth answers NOTHING AT ALL to `/d_recv` — no `/fail`,
no late reply, no thrown exception, no console line, no counter moving. A
silent refusal is the worst failure shape there is, because a definition that
was never received is indistinguishable from one that loaded and makes no
sound; both answer `/fail /s_new "SynthDef not found"`.

⚠️ IT IS NOT A UNIVERSAL CEILING AND THE COMMENT HERE USED TO SAY IT WAS.
"The ceiling both ends default to" was written before it had been measured.
Measured, the BOARD has no ceiling at all: sclang routes anything over 16,383
bytes to `/d_load`, which read a megabyte from disk in 44 ms — so every rung
of Pappus, FULL included, already loads there and always has. This binds a
BROWSER, which has no disk to load from.
🔴 65,488 — NOT 65,536, AND THE ROUND NUMBER WAS WRONG IN THE DANGEROUS
DIRECTION. `64 * 1024` passed a 65,536-byte definition through `fitsCeiling`
and into the silent refusal this constant exists to prevent: the guard said
yes and the engine said nothing.

MEASURED by bisection, `research/synthdef-size-limit-2026-09.md`:

  browser (SuperSonic)        largest definition that loads  65,520
  native scsynth over UDP     largest definition that loads  65,488
  native scsynth over TCP     none found at 1,000,000
  native /d_load from disk    none found at 1,000,000, 44 ms

🔴 AND IT BINDS THE MESSAGE, NOT THE DEFINITION — proved rather than argued:
adding 12 bytes of completion message moved the definition edge from 65,520
to 65,504, **exactly 16**, the wire cost. In both framings the largest
MESSAGE that loads is 65,536. So the budget is on the message and the
definition ceiling is whatever is left after framing.

The number here is the NATIVE UDP figure, which is the smaller of the two, so
anything that fits here fits in a browser too. ⚠️ Its origin is
`SC_ComPort.cpp`'s `kTextBufSize = 65536` on the UDP port — and on native
that buffer can never actually be reached, because an IPv4 UDP payload maxes
at 65,507, 29 bytes below it.

<a id="op"></a>

## synthdef.mjs, OP

The arithmetic `BinaryOpUGen` does, by its special index.

⚠️ THIS TABLE IS THE ONE THING HERE THAT CANNOT BE CHECKED BY READING BYTES
BACK. A wrong number writes a perfectly well-formed file that computes the
wrong thing — plus where it should multiply — so the check that grades it is
audible, not structural: `patch` asserts that the loudness knob SCALES the
output, which only holds if 2 really is multiply.

<a id="params"></a>

## synthdef.mjs, graph, params

Declare every parameter at once and get a reference to each.

One `Control` block with one output per parameter, which is what sclang
emits for a plain `{ |freq = 440, amp = 0.15| … }`. Its special index is
where its first parameter sits in the value array — 0, since there is only
ever one of these.

<a id="control"></a>

## synthdef.mjs, graph, control

One more control of its own, which is what sclang's `NamedControl` makes
for `\name.kr(value)`: a `Control` block with one output whose special
index is its slot in the value array (`Control.init` in
`SCClassLibrary/Common/Audio/InOut.sc`, `specialIndex =
synthDef.controls.size`). With a lag it is a `LagControl` instead, whose
inputs are the lag times as constants (`LagControl.kr` in the same file):
sclang builds that for any lag that is a plain number, because
`NamedControl.new` sets `fixedLag` whenever `lags.rate == \scalar`.
Several of these in one graph is ordinary sclang output.

<a id="out"></a>

## synthdef.mjs, graph, out

The last block: where the sound goes.

`Out` has NO outputs, which is the one place the format's symmetry breaks
and the one a writer forgets. Channel 0 of the hardware, then one input per
channel of sound.

<a id="out-at"></a>

## synthdef.mjs, graph, outAt

The same, to an output bus other than 0. Added 2026-10-12 for
the `/drums/` concept pages' four drums, each on a stereo pair of its own so a
page can split the engine's output into one scope per drum. A bus past the
engine's output channels is an INPUT bus (scsynth numbers outputs first),
so the caller boots the engine with enough outputs for it.

<a id="magic"></a>

## synthdef.mjs, graph, bytes, the magic

⚠️ The magic is four RAW bytes, not a pstring — no length byte in front.

<a id="read-synthdef"></a>

## synthdef.mjs, readSynthDef

A separate pass over the same bytes, used by the page to READ OUT OF THE FILE
what it is about to send — the header, the version, the name, how many
building blocks — rather than reporting what the writer happened to have in a
variable. That distinction is the whole reason this is not one function with
a flag.

It reads BOTH versions, because the files a real SuperCollider shipped are
version 1 and reading them is the only check here that a file this repo did
not write parses correctly.

<a id="exact-byte"></a>

## synthdef.mjs, readSynthDef, consumed to the exact byte

🔴 CONSUMED TO THE EXACT BYTE, OR IT IS NOT UNDERSTOOD. A parser that stops
early and reports a plausible structure is the same class of failure as a
green suite with no coverage: every number it printed would look right.
research §2.1 made the same demand of its converter and said so.

<a id="to-version2"></a>

## synthdef.mjs, toVersion2

The old layout, widened to the current one.

Every count and index goes from 16 bits to 32; `specialIndex` and the
definition count stay 16. Nothing is reinterpreted, so a file that came out
of a real sclang in 2015 is the same graph afterwards — it is a re-encoding,
not a translation.
