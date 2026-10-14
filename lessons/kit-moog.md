# Kit lessons: moog.mjs

The long comments cut from `demo/shell/moog.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-moog.md#<anchor>`.

<a id="header"></a>

## moog.mjs, file header

demo/shell/moog.mjs — a subtractive voice, as pure per-sample arithmetic.

Same rule as rhodes.mjs: no Web Audio nodes, so the same maths runs in a
browser, in node on the box, and in C on a microcontroller. But where the
Rhodes is a STRUCK sound a sampler can capture, this one cannot be sampled
usefully — measured 2026-09-10, driving FluidSynth's GM "Synth Bass 1"
across the whole CC 74 range moved the spectral centroid from 169 Hz to
154 Hz. Nothing happened. A sample freezes the filter, and on this
instrument the filter IS the gesture.

Architecture is the Minimoog's: oscillators -> resonant 4-pole lowpass, with
an envelope on the filter as well as on the amplitude.

<a id="blep"></a>

## moog.mjs, `blep`

polyBLEP: subtract a small correction either side of the wrap so the
discontinuity is band-limited. A naive saw aliases hard and reads as "cheap
and harsh" — which is the same complaint the first Rhodes attempt earned, and
it is cheaper to fix here than to explain.

<a id="ladder"></a>

## moog.mjs, the ladder

--- the ladder ------------------------------------------------------
Four one-pole sections with feedback from the last into the first. The
feedback is soft-clipped, which is where the drive and the fatness at
high resonance come from; a linear version thins out exactly when you
want it to bark.
