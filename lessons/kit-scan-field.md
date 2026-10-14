# Kit lessons: scan-field.mjs

The long comments cut from `demo/shell/scan-field.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-scan-field.md#<anchor>`.

<a id="header"></a>

## scan-field.mjs, file header and the data texture layout

demo/shell/scan-field.mjs: the picture /videoradio/ draws of its granulator,
as a module. Moved out of that page on 2026-10-13 so a second page can draw
the same picture (BACKLOG, *"copy the visualization from videoradio and add
it to shaders concept. add all parameters that adjust its visualization as
knobs + add patchbay"*): /shader/landscape/ imports it with every look
number on a knob. The shader text, the looks table and the WebGL chain were
moved VERBATIM, comments and all; nothing was rewritten on the way.

What it draws: grains reported across (where in the last eight seconds the
engine read) and up (how long the grain was), accumulated with a trail,
lit by six audio followers, then projected as a Rutt-Etra scan landscape of
stacked rows with hidden lines, a glow, a three-tap Paik feedback tunnel,
scanlines and a vignette. Everything that moves arrives in one 64 x 4 data
texture a page fills each frame (the layout is below); no body reads a clock.

TWO WAYS TO BUILD IT, ONE TEXT.
- Baked (`live: false`, the default): every look number is typed into the
  body as a constant, which is how /videoradio/ has always compiled it, and
  the generated GLSL is byte for byte the text that page carried inline.
- Live (`live: true`): the same body with each of those numbers read from
  one uniform array `uK[]`, in `PARAMS` order, so a page can turn any of
  them while the picture runs (`field.set(name, v)`). The row count becomes
  a loop bound with a ceiling of `MAX_ROWS`, mirror and waves become tests on
  their value. The four numbers in `EXTRA` (glow, scanline depth, vignette,
  feedback zoom) are typed literals in the baked body and live in `uK` too.

It reads `--hi` and `--dim2` off the page's stylesheet when it compiles,
so a page must have `shell.css` loaded first.
🔴 THE DATA TEXTURE'S LAYOUT IS FROZEN THE WAY `pattern.mjs`'s `ROW` IS
FROZEN, AND FOR THE SAME REASON: a shader compiled against layout 1 and fed
layout 2 does not fail, it draws a plausible wrong picture. So the version
lives IN the texture, at row 3 x 63, and the page asserts it against the
constant it compiled with.

64 x 4, RGBA8, UNSIGNED_BYTE, NEAREST, CLAMP_TO_EDGE, 1024 bytes, read with
`texelFetch` and never `texture()`: a fetch takes integer coordinates, needs
no filtering and cannot be off by half a texel, which is the entire class of
bug a data-in-a-texture design invites.

⚠️ RGBA8 RATHER THAN A FLOAT TEXTURE, and the quantisation costs nothing
real: one step of an 8-bit channel is 1/255 = 0.39% of a lane, against
`pappus-mod.mjs`'s dead-band of 0.5%. The modulator will not send a change
this texture cannot represent.

 row 0, x 0..63   the grain deposit, 64 buckets across the eight seconds
   R  grains that landed in this bucket since the last upload, capped
   G  their mean length, unmapped onto the engine's own 2 ms..4 s lane
   B  the voice that fired most here, x32
   A  grains REFUSED because R saturated. See the note on `bucket()`
 row 1, x 0..22   the parameters, in `MOD_DESTS` order, then probs 0..7
   R  the value now, as a fraction of its own lane
   G  the base, where the sound puts it. R minus G is the excursion
   B  255 if this destination is being modulated right now
 row 2, x 0..63   where the read head may be
   R  the scatter density at this bucket, 0 when it cannot be known
   G  255 inside the window this sound reads from
 row 3            scalars, one per x
   0..5  the six followers: rms low mid high tone flux
   6     the blend, radio at 0 and granulator at 1
   7     grains reported since the last upload
   8     grains refused since the last upload
   9     the morph, 0 at this sound and 255 at the next
   10    which sound is being left, 11 which is being gone to
   12    the loop: 0 none, 128 filling, 255 playing
   13    where in the lap the loop is
   14    which station
   15    how recently the station changed, 255 at the change
   16    the trail's per-frame survival, `exp(-dt / tau)`
   17    how many voices this sound opens, x32
   18    255 when the read point is knowable, 0 when it is not
   63    the layout version, R channel

<a id="lit-floor"></a>

## scan-field.mjs, LIT_FLOOR and WET_FLOOR

🔴 THE TWO FLOORS THE PICTURE PROMISES, AND THEY ARE CONSTANTS BECAUSE A
CHECK READS THEM.

`lit` is how bright a mark is drawn, from loudness; `WET_FLOOR` is the share
of the picture the grains get when the blend is all radio. Both have a floor
rather than reaching zero, for the same reason: a quiet passage and a
station-end blend are ordinary, and a page that plays itself must not go
black on either. Between them they fix the DIMMEST a saturated mark can be
drawn, which is the only number the flat-field check can honestly be
calibrated against.

⚠️ THEY WERE 0.25 AND 0.15 AND THAT MADE THE CHECK FLAKE ON A QUIET
PROGRAMME. MEASURED on Radio 1965, which plays improvisation recordings with
long quiet stretches: `the station reads 0.062 of 1` and the widest channel
spanned 42 of 255 against a threshold of 60, on a page with a hundred and
forty thousand lit pixels of grain in it. CLAUDE.md: a colour scale whose
normal reading is a warning has no warning left, and a threshold is
calibrated against what the mechanism promises rather than against an
absolute ideal.

⚠️ AND THEY ARE INTERPOLATED INTO THE BODY RATHER THAN TYPED THERE. A
threshold read from one constant and a shader written with another is a
check that grades the page against a number the page no longer uses.

<a id="looks"></a>

## scan-field.mjs, LOOKS

🔴 THE LOOKS, PICKABLE, BECAUSE WALKING ONE BACK BY HAND KEPT FAILING.

Four pictures were built in an hour and going back to any of them meant
lifting a span of shader out of a saved file. That failed TWICE in a row on
the same page: the span matched and the picture did not, because the
constants it depends on live OUTSIDE it. One of them was a row count, and
132 rows with an amplitude tuned for 46 merges every line into a blob.

So the differences between the looks are named and gathered here, in one
object, where a diff can see them. `?look=<name>` picks one; they are
compiled into the body, so there is no uniform and no branch per pixel and
the determinism check is untouched.

⚠️ A LOOK IS THE CONSTANTS, NOT THE CODE. Anything that changes the shape
of the picture rather than its numbers is still a new body and still needs
a copy in `looks/`. This is for the ones that differ by a row count and a
fold.
🔴 THE LOOKS ARE THE ARCHIVE, AND THE ARCHIVE IS THE WAY BACK.

`vista` is the working one. Everything else in this table is kept, not
maintained: it is what the picture looked like at a moment somebody liked
it, and it stays reachable at `?look=<name>` for ever.

🔴 THE PROTOCOL, WHICH EXISTS BECAUSE GOING BACK FAILED FOUR TIMES IN ONE
EVENING. Before changing `vista` in a way that changes how it LOOKS, copy
it to a new entry with a new name. A name is unique and permanent; `vista`
is a moving target. What went wrong every time was reconstructing a picture
from a diff or from a saved page, and both lost something: once a row
count that lived outside the block, once the corner sharpening, which had
been silently dropped and was the thing actually being looked for.

A name is a noun for what it looks like. Never a number and never a date:
somebody choosing between two of these is choosing between two pictures,
and `v3` says nothing about either.

⚠️ A LOOK IS THE CONSTANTS. Anything that changes the SHAPE of the picture
rather than its numbers needs a flag added here as well, or it cannot be
archived at all. That is why `facet`, `bucket`, `valley` and `mono` are in
this table next to the row count: each one was once a code change that a
constants-only archive could not hold.

They are in the order they were made. Six were built in an evening
and five of them existed only in a diff by the time anybody asked to see
one again. That is the whole reason this table has more in it than a row
count: a look is not always a constant, and the honest fix is to keep the
ones that are not as flags rather than to pretend they were.
They are in the order they were made.

<a id="look-plot"></a>

## scan-field.mjs, LOOKS.plot

2. "is this all?" — the grain buckets became the height, so the ridges
   got real shape, and a standby wave arrived.

<a id="look-swell"></a>

## scan-field.mjs, LOOKS.swell

5. waves rolling toward the eye at a walk, and bright enough to be a
   picture on their own rather than a trail with lines in it. MEASURED:
   the landscape pass alone was carrying a mean of 0.07 while the field
   and the present pass were healthy, so what looked like the picture
   fading was the trail decaying back to a terrain nobody could see.
   The halo, the gain and the low chroma are all that fix.

<a id="look-quartz"></a>

## scan-field.mjs, LOOKS.quartz

🔴 `quartz` IS `vista`, NUMBER FOR NUMBER, WITH ONE EXCEPTION.

The first attempt at this changed the contrast curve, which stopped the
fade and made a DIFFERENT picture: brighter, flatter, not the thing that
was asked to be kept. The ask was the same look that does not drift away,
so exactly one value moves and it is not one the eye reads directly.

`keep` is how much of the fed-back frame survives a lap. At 0.962 a trail
is down to a tenth in about sixty frames, and MEASURED on vista the
landscape underneath it carries a mean of 0.07 — so what a viewer watches
is the opening trail draining away to a terrain that is nearly invisible.
At 0.995 the same trail is still nine tenths there after a second and
decays over about half a minute, so the picture holds the state it opens
in instead of sliding out of it.
⚠️ IT CANNOT GO TO 1.0. The composite is `max(fresh, back * hold)`, which
is bounded and cannot run away, but with no loss at all it stops being a
trail and becomes a max accumulator: every bright pixel ever drawn stays
lit for ever and the frame fills in. 0.995 is a long memory, not an
infinite one.
⚠️ `xbreath: 0` IS THE SECOND AND LAST DIFFERENCE FROM `vista`. It was
   0.45 there, which opens and closes the perspective on the grain
   clock. That does not only move the x axis: a wider row samples the
   field somewhere else, so the HEIGHT it reads changes with it and the
   terrain heaves. Reported as moving up and down. `vista` keeps it.

<a id="travel-zero"></a>

## scan-field.mjs, LOOKS, travel 0 (first)

🔴 `travel: 0` IS WHY IT HOLDS STILL. Every other look advances
   the rows on `drift`, which walks each one to a new depth and
   therefore to a new height on screen: the whole terrain
   slides vertically, reported as moving up and down. With it
   at zero the rows sit at fixed depths and the only thing that
   moves is what the sound is doing to them, which is the point.
   `xbreath` stays: the x axis opening and closing was wanted.

<a id="travel-zero-again"></a>

## scan-field.mjs, LOOKS, travel 0 (second)

🔴 `travel: 0` IS WHY IT HOLDS STILL. Every other look advances
   the rows on `drift`, which walks each one to a new depth and
   therefore to a new height on screen: the whole terrain
   slides vertically, reported as moving up and down. With it
   at zero the rows sit at fixed depths and the only thing that
   moves is what the sound is doing to them, which is the point.
   `xbreath` stays: the x axis opening and closing was wanted.

<a id="monochrome"></a>

## scan-field.mjs, fieldShaders, colour

🔴 COLOUR IS SPOKEN FOR ON THIS MATERIAL AND IT WAS REFUSED TWICE.
`grain-scope.mjs` carries a dead branch that mapped spectral centroid to
hue; the argument was good and it was reverted, on instruction, twice, and
the rule left behind is that colour may only come back behind a flag the
PAGE sets by name. So the field is monochrome: one highlight and one dim,
read out of `shell.css` at compile time rather than typed here, because a
colour typed into a shader is a colour that will disagree with the theme.
The fast spectral axis drives SHARPNESS instead, which is the research's own
nodal-line row moved off the colour channel.

<a id="acc-fs"></a>

## scan-field.mjs, fieldShaders, ACC_FS

The accumulate pass: this frame's grains, on top of what is left of the
last frame.

⚠️ IT IS GREYSCALE AND THE COLOUR HAPPENS LATER. A trail that carried colour
would be re-tinting history every frame, so an old grain would slowly become
whatever the sound is doing now. The deposit is a quantity; what it looks
like is the present pass's business.

⚠️ AND THE BED IS NOT IN HERE. A window density added every frame into a
feedback tap saturates to white in about a second, because the steady state
of `x + decay*x + decay^2*x + ...` is `x/(1-decay)`. Only things that happen
ONCE belong in an accumulator.

<a id="present-fs"></a>

## scan-field.mjs, fieldShaders, PRESENT_FS

The present pass: the accumulated field, lit by what the instrument is
listening to, over the window it is reading from.

⚠️ THE BLEND SCALES THE GRAINS AND NOT THE BED, which is the same rule
`grain-scope`'s `grainAlpha` follows: the marks are drawn at the share of
the output they actually are, and the material underneath is being chewed
whatever the fader says. ⚠️ And the decay still runs at blend 0, in the
accumulate pass, so the field FADES rather than freezing.

<a id="out-fs"></a>

## scan-field.mjs, fieldShaders, OUT_FS

🔴 THE LAST PASS, AND EVERYTHING A PERSON ACTUALLY SEES IS DECIDED HERE:
the glow added back, the previous frame held under this one, the scanlines,
the glitch. It is one pass because each of those is cheap and because
splitting them would put four more full-size targets on a phone.

⚠️ IT TAKES NO CLOCK. Every number that moves arrives in the data texture,
which is what lets the same data twice draws the same bytes stay an exact
check rather than a tolerance. A body with uT in it could not be graded
that way at all.

<a id="create-scan-field"></a>

## scan-field.mjs, createScanField

🔴 THE WHOLE PICTURE, AND IT NEVER SAMPLES THE TARGET IT IS DRAWING TO.
OpenGL ES 3.0.6 §4.4.3 makes a feedback loop UNDEFINED BEHAVIOUR and WebGL
promotes it to a hard INVALID_OPERATION, so a body that reads its own
target works by accident on some machines and errors in a browser. Two
targets, swapped every frame, which is what ping-pong is for.
@param {WebGL2RenderingContext} g
@param {{present?: boolean, w?: number, h?: number}} [o]
 `present: false` builds the chain WITHOUT the final copy to the page's
 canvas. A headset session renders into the layer's framebuffer and takes
 `finalTex()` as a texture, so a copy to a 16x16 canvas nobody presents
 would be a wasted pass and a bound framebuffer the caller has to undo.

 `w`/`h` size the chain's own targets. 🔴 EVERY PASS ALREADY TAKES ITS
 SIZE AS A UNIFORM (`uRes`), so this costs nothing but the pixels: no
 shader body has `960` typed in it. The window keeps `FIELD_W x FIELD_H`
 because that is what the looks were tuned against and it is what a canvas
 this size can show.
 ⚠️ THE PIXEL-PERIOD TERMS MOVE WITH IT. The scanlines and the glitch are
 in `uRes` units, so a bigger field would give FINER scanlines rather than
 the same ones larger. Nothing asks for a second size today; this is here
 so the next thing that does is not surprised by it.

<a id="vao"></a>

## scan-field.mjs, createScanField, the vertex array

⚠️ ONE VERTEX ARRAY, BOUND ONCE. A vertex array object belongs to the
context that made it, and WebGL2 draws nothing at all without one bound.
🔴 AND IT IS KEPT AND RE-BOUND IN `step`, because this chain is no longer
the only thing drawing in its context. In a session `xr-panel.mjs` binds
its own quad's array every eye, so a chain that bound its own once at
construction would draw the panels' two triangles through its own shaders
from the second frame onward. Bound once was right while it was alone.

<a id="data-tex"></a>

## scan-field.mjs, createScanField, data texture filter

⚠️ A DATA TEXTURE IS NEAREST AND NOT FILTERABLE BY ACCIDENT. It is read
with texelFetch, which takes no sampler state at all, and the filter is
set anyway so that a body someone writes later with texture() fails
visibly rather than smearing two parameters together.

<a id="glow-quarter"></a>

## scan-field.mjs, createScanField, GLOW_W

⚠️ THE GLOW IS A QUARTER WIDTH ON PURPOSE. A nine-tap blur at full size
is sixteen times the sampling for a blur that would look narrower, not
wider: downsampling IS most of the softness.

<a id="test-targets"></a>

## scan-field.mjs, createScanField, test targets

⚠️ THE CHECKS GET THEIR OWN TARGETS. Rendering a probe into the visible
ping-pong puts a frame into the feedback tap and leaves a smear that lasts
as long as the trail does, which is a measurement changing the thing it
measures on a page where the trail IS the subject.

<a id="present-skip"></a>

## scan-field.mjs, step, the canvas copy

the canvas, last, so what a person sees is what the composite holds.
⚠️ SKIPPED IN A SESSION. See `present` on this function: there is no
canvas being shown, the headset takes `finalTex()` instead, and
binding the default framebuffer here would leave the layer's one
unbound for whatever draws next.

<a id="read-field"></a>

## scan-field.mjs, readField

🔴 THE ACCUMULATED FIELD ALONE, WHICH IS THE ONLY SURFACE HERE THAT
HOLDS NOTHING BUT GRAINS. What is on screen is the deposits plus the
window bed plus the lighting plus the blend, and the bed is drawn from
the page's own parameters whether a single grain has ever arrived or
not: a statistic over the whole picture can be entirely the bed, which
is blind rather than weak. This target has no bed, no colour and no
lighting in it. Every lit pixel is a grain the ENGINE reported.

<a id="test-render"></a>

## scan-field.mjs, testRender

🔴 THE SAME TWO PASSES OVER A KNOWN PREVIOUS FRAME, WHICH IS THE ONLY
WAY EITHER OF THE SEPARATING CHECKS CAN MEAN ANYTHING. Asking a
feedback picture whether two consecutive live frames are identical
answers no on a working page, because frame n+1 is a function of frame
n. What IS deterministic is ONE pass from a fixed input, so the probe
clears its own previous frame to black first and both checks compare
passes rather than frames.

<a id="test-final"></a>

## scan-field.mjs, testFinal

The WHOLE chain once over a known start, for a check about a number the
last pass reads (every look number is one). `testRender` stops at the
present pass, so a knob on the landscape cannot move it. This clears the
field and the previous output to black, runs all six passes into targets
of its own and reads the composite: the same bytes and the same numbers
draw the same pixels, and nothing touches the live ping-pong. Added
2026-10-13 for /shader/landscape/.
