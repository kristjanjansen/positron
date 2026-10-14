# Kit lessons: rhodes.mjs

The long comments cut from `demo/shell/rhodes.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rhodes.md#<anchor>`.

<a id="header"></a>

## rhodes.mjs, file header

demo/shell/rhodes.mjs — an FM electric piano, as pure per-sample arithmetic.

NO Web Audio nodes, on purpose. This is a function from time to a sample, so
the SAME math runs in a browser, in node, and in C on a microcontroller. A
voice built out of oscillator nodes would be a browser-only instrument and
would have to be rewritten to move, which is the thing that makes "port it to
the box" a rewrite rather than a copy.

The sound is the DX7 E.PIANO lineage rather than a sampled Rhodes: a Rhodes
tine is a struck bar, and what your ear takes for one is a fast, inharmonic
attack over a body that is nearly a sine. So:

  · a TINE operator at a high ratio, decaying in tens of milliseconds — the
    knock. This is what makes it read as an electric piano rather than an
    organ, and it is almost all of the identity.
  · a BODY operator at 1:1, decaying over a second — the woody swell.
  · a carrier that both of them phase-modulate.

Velocity moves the tine INDEX, not just the volume. That is the whole
expressive character of the instrument: played hard it barks, played soft it
is nearly a sine, and a synth that only changes loudness sounds like a volume
pedal on an organ.
