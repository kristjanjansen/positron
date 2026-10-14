# Kit lessons: projector.mjs

The long comments cut from `demo/shell/projector.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-projector.md#<anchor>`.

<a id="header"></a>

## projector.mjs, file header

demo/shell/projector.mjs — a film projector, made rather than sampled.

  const p = createProjector(ctx);   // ctx: an AudioContext
  p.node.connect(panner);           // it hands you one output node
  p.start(); p.setGain(0.6); p.stop();

🔴 WHY THIS IS SYNTHESISED AND NOT A SAMPLE. The obvious move is to find a
projector loop with a permissive licence and vendor it. Three reasons not to:

 · **A licence read off a web page is not a licence anyone has verified.**
   Vendoring somebody's audio means asserting terms on their behalf, in a
   repo that already carries three vendored things and states each one's
   licence file by name. A sound we made has no such question in it.
 · **A loop is a LOOP.** A projector running for four minutes under a
   newsreel is the one place a seam gets heard, and the fix for a seam is
   always more sample, not better crossfading.
 · **It is about forty lines.** A projector is a very legible object in
   sound: a frame rate, a motor, and some noise. This repo writes its own
   test pattern and its own synths for the same reason.

WHAT A PROJECTOR ACTUALLY IS, which is what makes this short:

 · **the frame rate** — a claw pulls each frame down and a shutter closes
   over it, so the loudest thing is a CLATTER at the frame rate. 24 fps for
   sound film, 18 for silent-era 16 mm. It is the rhythm you recognise.
 · **the motor** — a hum at mains frequency and its harmonics. 50 Hz here,
   because this is Estonian film and Estonian mains.
 · **the transport** — sprockets and take-up, which is broadband noise with
   no pitch, quiet and continuous under the other two.

⚠️ AND THE JITTER IS THE POINT — it is per-voice now, in VOICES above. A clatter exactly every 41.67 ms sounds like
a synthesiser playing a hi-hat; a real mechanism is a few per cent out, every
frame, and that is most of what "analogue" means to an ear. The jitter here
is per-frame and small — enough to stop the ear locking on, not enough to
sound broken.

<a id="voices"></a>

## projector.mjs, VOICES

🔴 EIGHT MACHINES, ONE FRAME RATE. No two projectors in a building sound the
same — the claw, the shutter and the gate wear differently and the box they
are bolted into resonates somewhere of its own — so a floor of films that all
sound identical reads as one recording played eight times.

⚠️ WHAT VARIES IS TIMBRE, NEVER THE RATE, AND THAT IS A DELIBERATE LIMIT. The
frame rate is the one thing a projector sound MEANS: 24 is sound film, which
is what these 1965 newsreels are. Varying it would make some of them silent-era
16 mm, which is a claim about the material rather than about the machine — and
it would put the one assert worth having, that this runs at the film's rate,
out of reach for seven voices out of eight. Instead that check now sweeps all
eight, so a preset cannot quietly break the rhythm.

The spread is the resonance of the box: 1,500 Hz reads as a big cabinet at the
back of a hall, 2,900 as a small portable on a table. Q says how boxy.

<a id="wall"></a>

## projector.mjs, createProjector, the wall lowpass

🔴 THE WHOLE MACHINE IS BEHIND A WALL, AND THAT IS WHAT IT SOUNDS LIKE.
A projector is never in the room with you: it is in a booth, through glass,
behind you. Without this the clatter arrives with all its top end intact
and sits on top of the film instead of behind it — reported as wanting it
more muffled. One lowpass on the WHOLE output, after every voice, so the
eight machines stay eight machines and all of them are in the booth.
⚠️ It is on the output rather than on the clatter, because the bed's hiss
and the motor's upper partials are just as much in front as the clicks are.

<a id="motor"></a>

## projector.mjs, createProjector, the motor

── the motor ────────────────────────────────────────────────────────────
Two partials, the second slightly sharp of the octave. An exact octave
fuses into one tone and sounds like a test signal; a few cents out beats
slowly, which is what a machine with a belt on it does.

<a id="chain-order"></a>

## projector.mjs, createProjector, output order

⚠️ THE ORDER IS out -> shelf -> lowpass, and `node` is the LAST of them, so
a caller connecting `p.node` to a panner gets the muffled sound and cannot
accidentally bypass it.

<a id="clatter"></a>

## projector.mjs, createProjector, the clatter

── the clatter ──────────────────────────────────────────────────────────
One short filtered noise burst per frame, scheduled ahead on the AUDIO
clock rather than fired from a timer.

🔴 SCHEDULED, NOT TICKED. A `setInterval` at 41 ms would put every clatter
wherever the main thread happened to be — which on a page that is also
uploading video frames to a texture is nowhere in particular. The audio
clock does not care what the renderer is doing, and this repo has the rule
twice over: sound is allowed to be late, a timeline is not.

<a id="wobble"></a>

## projector.mjs, frame, per-frame wobble

a little movement in the timbre, frame to frame: a claw does not hit the
same way twice
⚠️ THE PER-FRAME WOBBLE IS A FRACTION OF THE VOICE, NOT A FIXED BAND. It
used to be `1900 + random * 900` — a spread wider than the gap between two
voices, so eight machines would have averaged out to one.

<a id="click"></a>

## projector.mjs, frame, the click envelope

⚠️ A CLICK, NOT A BLIP. ~7 ms of attack-less burst with a fast decay is
the mechanism; anything longer turns into a rattle and the frame rate
stops being audible as a rate.

<a id="set-gain"></a>

## projector.mjs, setGain

Set the level, with a SHORT ramp, and expect to be called every frame.

🔴 THE LONG RAMP USED TO LIVE HERE AND IT WAS THE BUG. A caller that
called this once per frame — which is the natural thing to do from a
render loop — cancelled the previous ramp and started a fresh 1.2 s one
sixty times a second, so the gain moved about a eightieth of the way and
then restarted. It crawled up, never arrived, and crawled down: reported
as "seems to lag and never stops", and that is exactly what it does.
⚠️ AND IT IS NO LONGER CALLED PER FRAME AT ALL. `floor` sets it ONCE
when a film starts and once when it stops, with the ramp length it
wants — so the fade finishes on the audio clock whether or not anything
is drawing. The version that eased a frame at a time froze its gain the
moment a tab was hidden and went on making a noise for ever.
