# Kit lessons: cc-adapter

The longer comments cut from `demo/shell/cc-adapter.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-cc-adapter.md#<anchor>`.

<a id="header"></a>

## `cc-adapter.mjs` module header

```text
demo/shell/cc-adapter.mjs — the `cc` KIND: continuous MIDI control as a
first-class timeline kind, beside the discrete `midi` kind.

🔴 PROMOTED FROM proto/automation/cc-core.js, UNCHANGED BELOW THIS HEADER.
It was finished and measured and had never been given a page: 6408 raw
samples gated down to 409 logged rows (15.7:1) with the reconstruction
staying inside 1.25% of each controller's range, and a keyframe every 500 ms
carrying a 4-byte digest so a receiver can see divergence rather than being
blind to it. `demo/memento/` is the page.

(was: proto/automation/cc-core.js.)

The discrete kind is EDGE-valued: a note-on and a note-off are two halves of
one object and losing either wedges the instrument (stuck note / ghost note).
The continuous kind is LEVEL-valued: every CC message is a complete statement
of a controller's value, last-writer-wins, and losing one is harmless the
instant the next one arrives — but if it is the LAST one, the filter stays
wrong forever. That asymmetry drives every design decision in this file:

  * catch-up is 'reduce', never 'burst': replaying 400 skipped filter-sweep
    messages to catch up is pure waste, the last value per controller is the
    whole truth (a note lane can never do this — a skipped note-on is music).
  * the reducer's state is a MAP KEYED BY CONTROLLER NUMBER, so seek is
    "restore the console", not "replay the gesture".
  * the stuck-state guard is a periodic FULL-STATE KEYFRAME, not RTP-MIDI's
    recovery journal — see the note above `ccDigest` for why level-valued
    state gets the strictly cheaper repair.

Wire form: the SAME 16-byte frame proto/jam/jam-core.js already sends, read
through a different lens. jam names bytes 1-2 `note`/`vel`; they are really
MIDI data1/data2, and a CC frame puts {controller, value} there while a
pitch-bend frame puts {lsb, msb}. One frame size, one parser, raw bytes
verbatim — a receiver that does not know the `cc` kind still forwards the
three MIDI bytes to a synth correctly (C7's unknown-kind round-trip).

Plain ESM, no deps, browser + node.
```

<a id="coarse"></a>

## `cc-adapter.mjs` COARSE

```text
MIDI 1.0 fine/coarse pairing: controllers 0-31 are MSBs whose LSB partner is
 n+32. So CC 33 is not a controller of its own — it is the low 7 bits of the
 mod wheel (CC 1). Folding both onto one key is what makes `reduce` restore a
 COHERENT 14-bit value instead of half of one.
```

<a id="enc14"></a>

## `cc-adapter.mjs` 14-bit encode and decode

```text
---------------------------------------------------------------------------
14-bit encode / decode. Raw bytes travel verbatim: a 14-bit CC really is TWO
MIDI messages on the wire (MSB then LSB, in that order — a receiver that sees
the LSB first applies it to the previous MSB), and enc14 returns both. Pitch
bend is ONE message carrying both halves, LSB in data1.
---------------------------------------------------------------------------
```

<a id="encodeframe"></a>

## `cc-adapter.mjs` encodeFrame

```text
---------------------------------------------------------------------------
The 16-byte frame, CC variant. Byte-identical layout to jam-core's note frame
(status | d1 | d2 | src | u32 seq | f64 tUs) so one relay carries both kinds
and byte 0 discriminates.
---------------------------------------------------------------------------
```

<a id="foldrows"></a>

## `cc-adapter.mjs` foldRows

```text
---------------------------------------------------------------------------
The reducer state: one entry per controller number.

Fold rule: `msb` and `lsb` are folded INDEPENDENTLY. Strict MIDI receivers
zero the LSB when an MSB arrives alone; we do not, because our encoder always
emits the pair back-to-back and independent folding is what makes
reduce(prefix) exactly reproduce play(0->t) for a 14-bit sweep. Declared in
caps as `msbZerosLsb: false` so a hardware bridge can opt into strict mode.
---------------------------------------------------------------------------
```

<a id="ccdigest"></a>

## `cc-adapter.mjs` ccDigest

```text
---------------------------------------------------------------------------
STUCK-STATE GUARD — periodic full-state keyframe, not a recovery journal.

RTP-MIDI (RFC 6295) attaches a recovery journal to every packet because NOTES
are edge-valued: no amount of "current state" can recreate an attack you
missed, so the journal must describe the undelivered EDGES. CC is different.
A controller's entire history compresses to one number, so the journal and
the keyframe are THE SAME OBJECT — and the keyframe is strictly cheaper: it
needs no per-receiver ack bookkeeping and no journal trimming, it is
idempotent, and it repairs a receiver that joined late as well as one that
dropped a packet. 128 controllers x 16 channels is a 2 KB worst case and a
realistic performance touches 3-6 of them.

So: every frame carries `seq` (gap detection, already in the frame), and the
sender emits a KEYFRAME (the whole live map + its digest) on a fixed cadence
and at every gesture end. A receiver compares its own digest to the sender's
and re-syncs from the keyframe on mismatch. The digest makes divergence
detectable in 4 bytes, so the keyframe cadence can stay lazy (500 ms) without
the receiver being blind between them.
---------------------------------------------------------------------------
```

<a id="makecccapture"></a>

## `cc-adapter.mjs` makeCcCapture

```text
---------------------------------------------------------------------------
CAPTURE DISCIPLINE (steal list §1: wall-clock throttle only, never frame
decimation; own-prior-art §6 — `frameCount % 10` dies on 120 Hz displays and
throttled tabs; and demo10's destructive sampler is why the raw lane is a
SEPARATE buffer and not a view of the decimated one).

A knob sweep emits 100-400 msg/s. We log at ~10 Hz and interpolate at replay.
Three rules the naive throttle gets wrong:
  1. the LAST sample of a gesture is always logged (`flush`) — drop it and
     every replay undershoots the endpoint the performer actually reached;
  2. switches (sustain, mode) are never throttled;
  3. throttle is per CONTROLLER KEY, and a 14-bit pair passes the gate as ONE
     decision so the MSB can never be logged without its LSB.
---------------------------------------------------------------------------
```

<a id="interpolation"></a>

## `cc-adapter.mjs` interpolation

```text
---------------------------------------------------------------------------
INTERPOLATION. The throttled log is a set of knots; replay draws the line.
Bracketing is PER SERIES (per controller key) — interpolating CC74 against
CC71 because they happen to be adjacent in time is the obvious bug, so
interpolate() refuses a mismatched pair instead of returning nonsense.
---------------------------------------------------------------------------
```

<a id="isinterpolablekey"></a>

## `cc-adapter.mjs` isInterpolableKey

```text
Not every series inside a continuous kind IS continuous. Sustain is a
 SWITCH: interpolating between pedal-down at 1.5 s and pedal-up at 3.0 s
 returns "half pressed" at 2.2 s, which is not a state the pedal has. Switch
 series are STEP series — held flat until the next knot, never ramped. Caught
 by smoke test, not by theory.
```

<a id="neighbourhood"></a>

## `cc-adapter.mjs` caps.neighbourhood

```text
The library hands reduce()/assertState() `info.nexts` = 1 +
caps.neighbourhood successors OF THE KIND. A multi-series kind has to
over-ask to be sure a successor of THIS controller is among them: with
S interleaved series you need ~S. 8 covers the demos; it is a guess,
which is precisely seam S1's cost.
```

<a id="reduce"></a>

## `cc-adapter.mjs` reduce

```text
reduce(prefix <= t) = THE LAST VALUE PER CONTROLLER NUMBER. This is the
 seek story in one line: jumping into the middle of a performance must
 restore cutoff, mod wheel, pitch bend and sustain.
```

<a id="cc-defaults"></a>

## `cc-adapter.mjs` CC_DEFAULTS

```text
---------------------------------------------------------------------------
The synthetic voice: a CC-controlled WebAudio instrument, so the demos need
no hardware and the harness can assert on parameter values. Mirrors what a
real synth does with these controllers.
---------------------------------------------------------------------------
```

<a id="send-gate-ms"></a>

## `cc-adapter.mjs` SEND_GATE_MS

```text
---------------------------------------------------------------------------
THE SEND GATE — what a hand on a slider is allowed to put on the wire.

🔴 A DIFFERENT PROBLEM FROM `makeCcCapture`, AND THE DIFFERENCE IS WHO IS
WAITING. That one thins a RECORDING: it may hold a sample back for 100 ms
because nothing downstream is listening yet, and the endpoint arrives at
`flush()`. This one feeds a synth in another building while a finger is
moving, so a held-back value is a filter that has not moved yet, and 100 ms
of that is audible.

The rules are the same three and they are this file's, not new:
  1. THE ENDPOINT IS NEVER GATED. The last value of a gesture is the one that
     stays true forever, so it always goes.
  2. THE GATE IS PER CONTROLLER. Two hands on two sliders must not thin each
     other; one controller's turn is not another's.
  3. SWITCHES ARE NEVER GATED. A dropped pedal is the CC analogue of a stuck
     note. `SWITCHES` above is the list.

What is new is the ARITHMETIC, and it is sized against the board rather than
against a feeling: the board cuts audio into 20 ms frames, so a controller
that changes twice inside one frame cannot be heard twice. One message per
controller per frame is therefore the most that can matter, and everything
above it is load nobody hears.

⚠️ EVERY DUE CONTROLLER TRAVELS IN ONE MESSAGE. Two sliders moving together
are `{ set: [[74, 91], [71, 40]] }`, not two messages: the relay's budget is
counted in MESSAGES, and a message carrying two pairs costs the same as one
carrying one.

🔴 AND A FULL STATEMENT EVERY `restateMs`, WHICH IS THE ONLY REPAIR A LEVEL
PLANE NEEDS. A lost note wedges an instrument and needs a journal; a lost
control is harmless the instant the next one arrives, and harmful forever
only if it was the last. Restating the whole console periodically fixes that
case without an ack, a sequence number or a retransmit queue.
---------------------------------------------------------------------------
```

<a id="thinned"></a>

## `cc-adapter.mjs` put: thinned

```text
🔴 A VALUE IS THINNED WHEN ANOTHER OVERTAKES IT, NOT WHEN A TICK FINDS
IT EARLY. This counted on the tick side, so it counted TICKS THAT FOUND
A VALUE NOT DUE rather than values nobody ever sent, and a page that
ticks more often than a hand moves counted the same held value again on
every tick. `/knobs/` pumps every 10 ms AND on every input, so its
`skipped` cell read high: a number about the page's own timer wearing
the label of a number about your hand. `offered` is now exactly `sent`
plus `thinned` plus whatever is still waiting, which is a conservation
the test can disagree with.
```
