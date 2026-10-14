# Kit lessons: pappus.mjs

The long comments cut from `demo/shell/pappus.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-pappus.md#<anchor>`.

<a id="header"></a>

## pappus.mjs, file header

demo/shell/pappus.mjs — the board's granulator, set up the way it expects.

`bootScsynth` (`/shell/scsynth.mjs`) brings SuperCollider up. This brings up
PAPPUS on top of it: the buffers the graph reads, the seventeen grain windows,
the gate buffers, and the synth itself.

🔴 WITHOUT THIS, A LOADED PAPPUS FIRES NOTHING AND MAKES NO SOUND, and says
nothing about why. MEASURED on `/archive/radio/` while it was being written:
engine up in 531 ms, definition taken in 22 ms, `/s_new` answered `/n_go` —
and then `0 grains reported in 2.5 s` with the meter at `0.0000`. Every
visible step succeeded. The graph reads its envelope windows and its gates
out of BUFFERS, and unallocated buffers are not an error to scsynth, they are
silence.

⚠️ IT WAS INSIDE `demo/grains/engine.mjs` AND WAS LIFTED, NOT COPIED. Two
pages now run this graph and a drift between two copies of the buffer plan
would be silent at both ends — which is the shape `checkCompiledDefs()`
exists to refuse for the definition itself.

<a id="ring-seconds"></a>

## pappus.mjs, RING_SECONDS

🔴 THE CAPTURE RING IS SIXTY SECONDS, AND A REPORTED GRAIN POSITION IS A
FRACTION OF ALL OF IT — never of the `mbuflen` seconds actually being read.
`Engine_Pappus.sc` computes `pos = (winlo + …) * loopfrac` where
`loopfrac = mbuflen*SR / BufFrames`, so at `mbuflen` 8 every mark this graph
reports lands in the left **13%** of an axis drawn as the ring.

A page drawing those marks on a picture of the LIVE WINDOW has to rescale by
`RING_SECONDS / mbuflen`. It is exported rather than written down twice
because both pages that draw grains need it and a disagreement between two
copies is silent — the picture stays plausible and is wrong by a constant,
which is the hardest kind to notice.

<a id="buffer-plan"></a>

## pappus.mjs, bufferPlan

Every buffer the graph expects, by number.

⚠️ ALLOCATED IN FULL EVEN WHEN A PAGE USES ONLY SOME. The numbers are the
graph's, not ours; allocating a subset means a page that later touches an
unallocated one gets silence rather than a complaint, which is the failure
this file was written to stop happening twice.

<a id="cos-window"></a>

## pappus.mjs, cosWindow

The seventeen grain windows, from the engine's own formula.

⚠️ REBUILT HERE, NOT COPIED FROM THE BOARD. `Engine_Pappus.sc` fills them
with `Env([0,1,0],[p,1-p],\sine)` discretised to 256, and this is that
formula. They are not the board's BYTES; if a sound comparison ever needs
them to be, `/b_getn` off the board's scsynth and diff (research §10.10).

<a id="alloc-buffers"></a>

## pappus.mjs, allocBuffers

Allocate and fill what the graph reads.

⚠️ `/done /b_allocPtr`, NOT `/done /b_alloc`. SuperSonic rewrites the command
into its own pointer-based one and answers in THAT name, so a matcher waiting
for the reply scsynth documents waits for ever — measured, and it read as a
wedged engine rather than as a renamed reply (research §10.8).

<a id="gates-open"></a>

## pappus.mjs, gates open

🔴 THE GATES, OPEN. A Pappus whose gate buffer is zeros is silent for ever
after and nothing says so — `note.panic` on the board has done exactly this
three times (HANDOFF: `msrc 1`, `src`/`lock`, `notes.gate`). State a page
depends on and never sets is state that will eventually be wrong.

<a id="start-pappus"></a>

## pappus.mjs, startPappusSynth

Start the granulator.

⚠️ `inbusl 2 inbusr 3` IS THE BOARD'S OWN WIRING, not a browser convenience:
two output channels come first, so busses 2 and 3 are the first hardware
INPUTS — which is where `bootScsynth`'s `input` node writes. The def's own
defaults are 0 and 1, so leaving them unset granulates the OUTPUT bus, a
feedback path that sounds like a broken instrument rather than a wiring
mistake.

<a id="set-param"></a>

## pappus.mjs, setParam

One setting on the granulator.

⚠️ AN ARRAY IS A DIFFERENT MESSAGE, AND GUESSING WHICH FROM THE ARITY IS HOW
A ONE-ELEMENT ARRAY BECOMES A SCALAR. `gates` and `probs` are eight-element
control arrays in this definition, and `/n_set` would write only the first,
leaving seven voices at whatever they held.

<a id="audible-defaults"></a>

## pappus.mjs, applyAudibleDefaults

🔴 THE SETTINGS THAT MAKE A PAPPUS AUDIBLE AT ALL. A synth started by
`startPappusSynth()` alone sits at `mix 0, gain 0, thru 0, dry 0` — ASKED OF
THE SERVER with `/s_get`, not inferred — so it granulates correctly and
outputs silence.

🔴 AND A GRAIN COUNT IS NOT EVIDENCE IT IS AUDIBLE. MEASURED: with the input
deliberately disconnected, the graph still fired 4–5 grains per window while
the output bus read exactly **0.00000**. "Grains are firing and reported" and
"sound is coming out" are different claims about different quantities, and
reading the first as progress toward the second cost a full debugging round
on `/archive/radio/`.

⚠️ `gates` IS THE ONE THAT DECIDES WHETHER THE INSTRUMENT EXISTS. The
engine's trigger is `trig * (gates[i] > 0.001) * coin * egate`, so all-zeros
is a granulator that never fires — while PASSTHROUGH STILL WORKS, so it goes
on answering every question and making no grains.

`live: true` points the granulator at its input bus (`src 2`, unlocked) —
the case where something outside scsynth is filling it. `false` is the held
buffer, which is what `/grains/` uses.
