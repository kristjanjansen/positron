# Kit lessons: source.mjs, source-test.mjs

The long comments cut from `demo/shell/source.mjs` and `demo/shell/source-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-source.md#<anchor>`.

<a id="header"></a>

## source.mjs, file header

demo/shell/source.mjs — ONE description of a sound, built in two places.

🔴 WHY THIS EXISTS. `grains` draws two granulators side by side — one in the
page, one on a Raspberry Pi — and they sound nothing alike. Every reason is
structural (plans/plan-twins.md), and the biggest by a distance is that they are
not chewing the same thing: the page granulates six sawtooth oscillators and
the board granulates whatever instrument happens to be running. A page that
puts two panes side by side is claiming they are comparable, and until the
material is the same that claim is false.

(The page's builder, `buildSource`, was deleted 2026-10-14: nothing called it
after `grains` was archived. It is in git history. The board's builder and
`partialsOf` remain.)

So: one spec, two builders, and a check at the INPUT rather than at the
output — measuring at the output measures the granulator too, and an A/B
where both arms share a defect returns "identical", which reads as fine.

─────────────────────────────────────────────────────────────────────────────
🔴 ADDITIVE, AND THAT IS THE WHOLE DESIGN DECISION.

The obvious spec is "a sawtooth at 110 Hz". It does not survive contact with
two engines. WebAudio's `OscillatorNode` with `type: 'sawtooth'` is
band-limited by a wavetable the spec does not pin down; SuperCollider's
`Saw.ar` is band-limited by a different method; a Csound `vco2` is a third.
All three are sawtooths and none of them is the SAME sawtooth — they differ
in harmonic rolloff, in how many partials survive near Nyquist, and in phase.
"The same input" would then be a hope, and the check written against it would
pass or fail on which engine happened to roll off sooner.

A SINE is the one waveform every synthesis engine produces identically. So a
shape here is a TABLE OF PARTIALS — sine amplitudes at integer multiples of a
fundamental — and `saw` is a name for a particular table rather than a
primitive. Both ends build the same sum of sines from the same numbers, the
difference between them is measurable partial by partial, and `partials`
becomes an honest brightness control instead of an implementation detail.

⚠️ It is also the only version where the input check can say anything. "Both
ends read 0.16 rms" is satisfied by two completely different sounds; "every
partial is within x dB of its twin, and there is nothing above partial N in
either" is not.

<a id="shapes"></a>

## source.mjs, SHAPES

The shapes, as amplitude tables. `n` is the partial number, 1-based.

⚠️ These are the IDEAL series, not an approximation of an oscillator. A saw
is 1/n over every partial and a square is 1/n over the odd ones — that is the
definition, and truncating it at `count` is exactly what band-limiting is.
Writing it down this way means the truncation is a number both ends share
rather than a property of somebody's wavetable.

<a id="partials-of"></a>

## source.mjs, partialsOf

The spec, expanded into every sine that has to be made: `[{hz, amp}]`.

PURE, and that is what makes it testable with no audio at all. The board's
builder and the page's builder both consume this list, so a disagreement
between them is a disagreement about SYNTHESIS rather than about arithmetic,
which is a much smaller thing to chase.

⚠️ NOTHING ABOVE NYQUIST. A partial past half the sample rate does not fold
over politely — it aliases down to a frequency that is in neither engine's
table, and the input check would then be comparing two different mistakes.
The list simply stops, and `partialsOf` reports how many it dropped.

<a id="source-message"></a>

## source.mjs, sourceMessage

The same spec as something the board can build, over the wire.

It sends the SPEC and not the partial list, because both ends run
`partialsOf` — which is the point. A wire carrying the expanded list would
make the page the authority on arithmetic the board is perfectly able to do,
and the two would silently diverge the first time one of them was updated.

<a id="compare-source"></a>

## source.mjs, compareSource

How far apart two measurements of the same spec are, partial by partial.

`measured` is `[{hz, amp}]` read off a real signal at each expected
frequency. Returns the worst and median difference in dB, and — the part
that matters — WHICH partial was worst, because "the input differs by 4 dB"
and "the input differs by 4 dB at partial 11 of 12" are different findings.

<a id="test-header"></a>

## source-test.mjs, file header

demo/shell/source-test.mjs — the shared source description, with no audio.

  node demo/shell/source-test.mjs

`partialsOf` is pure, which is the reason the design is what it is: the board
and the page both expand the same spec with the same function, so a
disagreement between the two ends is a disagreement about SYNTHESIS rather
than about arithmetic. That is only true if the arithmetic is checked here.

Three of these are NEGATIVE CONTROLS. A table that silently aliased, a level
that was not the level, or a `count` that changed nothing would all look
perfectly fine from the outside.

<a id="test-nyquist"></a>

## source-test.mjs, 3, nothing above Nyquist

3. 🔴 NEGATIVE CONTROL: nothing above Nyquist, ever. A partial past half the
   sample rate does not fold over politely — it aliases to a frequency in
   neither engine's table, and the input check would then be comparing two
   different mistakes rather than two renderings of one spec.

<a id="test-attributed"></a>

## source-test.mjs, 8, a difference is attributed

8. 🔴 THE ONE THE INPUT CHECK WILL LEAN ON: a difference is found, and it is
   ATTRIBUTED. "the input differs by 6 dB" and "it differs by 6 dB at partial
   6 of 6" are different findings, and only the second one is actionable.

<a id="test-missing-partial"></a>

## source-test.mjs, 9, a missing partial

9. NEGATIVE CONTROL: a partial that is not there at all must not read as a
   small error. A missing top partial is the exact failure two different
   band-limiting schemes produce, and averaging it away is how it would be
   missed.
